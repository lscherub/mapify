import { useEffect, useState, useCallback, useRef } from "react";
import {
  type ExplorerState,
  type ExplorerProfile,
  type VenueCollectionItem,
  type XpTransaction,
  type Achievement,
  type DailyQuest,
  type ExplorerSubmissionStatus,
  type XpActionReason
} from "./types";
import { calculateLevel } from "./levels";
import { INITIAL_ACHIEVEMENTS, evaluateAchievements } from "./achievements";
import { generateDailyQuests } from "./quests";

const STORAGE_KEY = "mapify:explorer:v1";

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "exp-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString(36);
}

function createDefaultState(): ExplorerState {
  const todayKey = getTodayKey();
  const profileId = generateUuid();

  return {
    profile: {
      id: profileId,
      displayName: "Wayfarer " + profileId.slice(0, 4).toUpperCase(),
      level: 1,
      xp: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      createdAt: new Date().toISOString()
    },
    collection: [],
    xpTransactions: [],
    achievements: INITIAL_ACHIEVEMENTS,
    dailyQuests: generateDailyQuests(todayKey),
    activeDateKey: todayKey,
    wifiSubmissions: []
  };
}

export function readExplorerState(): ExplorerState {
  if (typeof window === "undefined") {
    return createDefaultState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }

    const parsed = JSON.parse(raw) as ExplorerState;
    const todayKey = getTodayKey();

    // Reconcile achievements with initial catalog in case new achievements were added in code
    const existingMap = new Map((parsed.achievements || []).map((a) => [a.id, a]));
    const reconciledAchievements = INITIAL_ACHIEVEMENTS.map((initial) => {
      const existing = existingMap.get(initial.id);
      if (!existing) return initial;
      return {
        ...initial,
        current: existing.current ?? initial.current,
        isUnlocked: existing.isUnlocked ?? initial.isUnlocked,
        unlockedAt: existing.unlockedAt
      };
    });

    // Refresh daily quests if the date rolled over to a new day
    let dailyQuests = parsed.dailyQuests || [];
    if (parsed.activeDateKey !== todayKey || !dailyQuests.length) {
      dailyQuests = generateDailyQuests(todayKey);
    }

    // Ensure level is synchronized with total XP
    const levelInfo = calculateLevel(parsed.profile?.xp || 0);

    return {
      profile: {
        id: parsed.profile?.id || generateUuid(),
        displayName: parsed.profile?.displayName || "Explorer",
        level: levelInfo.level,
        xp: parsed.profile?.xp || 0,
        currentStreak: parsed.profile?.currentStreak || 0,
        longestStreak: parsed.profile?.longestStreak || 0,
        lastActiveDate: parsed.profile?.lastActiveDate || null,
        createdAt: parsed.profile?.createdAt || new Date().toISOString()
      },
      collection: parsed.collection || [],
      xpTransactions: parsed.xpTransactions || [],
      achievements: reconciledAchievements,
      dailyQuests,
      activeDateKey: todayKey,
      wifiSubmissions: parsed.wifiSubmissions || []
    };
  } catch {
    return createDefaultState();
  }
}

export function writeExplorerState(state: ExplorerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to persist explorer state:", err);
  }
}

export type CheckInResult = {
  success: boolean;
  message: string;
  totalXpEarned: number;
  xpBreakdown: Array<{ reason: XpActionReason; amount: number; description: string }>;
  newLevel?: number;
  unlockedAchievements: Achievement[];
  completedQuests: DailyQuest[];
};

export function useExplorer() {
  const [state, setState] = useState<ExplorerState>(createDefaultState());
  const [isLoaded, setIsLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loaded = readExplorerState();
    setState(loaded);
    setIsLoaded(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setState(readExplorerState());
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveAndSetState = useCallback((updater: (prev: ExplorerState) => ExplorerState) => {
    setState((prev) => {
      const next = updater(prev);
      writeExplorerState(next);
      return next;
    });
  }, []);

  // Check whether a venue is already collected
  const isCollected = useCallback(
    (placeId: string) => {
      return state.collection.some((item) => item.placeId === placeId);
    },
    [state.collection]
  );

  // Update streak upon meaningful exploration activity
  const updateStreakInternal = (profile: ExplorerProfile): ExplorerProfile => {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    if (profile.lastActiveDate === today) {
      // Already active today; do not increment again
      return profile;
    }

    let nextStreak = 1;
    if (profile.lastActiveDate === yesterday) {
      nextStreak = profile.currentStreak + 1;
    }

    const nextLongest = Math.max(profile.longestStreak, nextStreak);

    return {
      ...profile,
      currentStreak: nextStreak,
      longestStreak: nextLongest,
      lastActiveDate: today
    };
  };

  // Perform venue check-in and collection
  const collectVenue = useCallback(
    (venue: {
      id: string;
      name: string;
      category: string;
      address: string;
      city: string;
      latitude: number;
      longitude: number;
      hasWifi: boolean;
    }): CheckInResult => {
      const currentState = stateRef.current;

      // 1. Prevent duplicate collection
      if (currentState.collection.some((item) => item.placeId === venue.id)) {
        return {
          success: false,
          message: "You have already collected this venue in your Explorer journal!",
          totalXpEarned: 0,
          xpBreakdown: [],
          unlockedAchievements: [],
          completedQuests: []
        };
      }

      const today = getTodayKey();
      const existingCategories = new Set(currentState.collection.map((i) => i.category.toLowerCase()));
      const isNewCategory = !existingCategories.has(venue.category.toLowerCase());

      const existingCities = new Set(
        currentState.collection.map((i) => (i.city || "").toLowerCase()).filter(Boolean)
      );
      const isNewNeighborhood = Boolean(venue.city && !existingCities.has(venue.city.toLowerCase()));

      const xpBreakdown: Array<{ reason: XpActionReason; amount: number; description: string }> = [
        { reason: "collect_venue", amount: 25, description: `Collected ${venue.name}` }
      ];

      if (isNewCategory) {
        xpBreakdown.push({
          reason: "new_category",
          amount: 15,
          description: `Discovered new category: ${venue.category}`
        });
      }

      if (isNewNeighborhood) {
        xpBreakdown.push({
          reason: "explore_neighborhood",
          amount: 40,
          description: `Explored new neighborhood: ${venue.city}`
        });
      }

      let totalXpEarned = xpBreakdown.reduce((sum, item) => sum + item.amount, 0);

      // Create new collection item
      const newItem: VenueCollectionItem = {
        placeId: venue.id,
        placeName: venue.name,
        category: venue.category,
        address: venue.address,
        city: venue.city,
        latitude: venue.latitude,
        longitude: venue.longitude,
        discoveredAt: new Date().toISOString(),
        hasWifi: venue.hasWifi
      };

      const nextCollection = [newItem, ...currentState.collection];

      // Update Daily Quests
      const completedQuests: DailyQuest[] = [];
      const updatedQuests = currentState.dailyQuests.map((quest) => {
        if (quest.isCompleted) return quest;

        let shouldAdvance = false;
        if (quest.type === "discover_venue") shouldAdvance = true;
        if (quest.type === "visit_cafe") {
          const cat = venue.category.toLowerCase();
          if (cat.includes("coffee") || cat.includes("cafe") || cat.includes("café") || cat.includes("roaster")) {
            shouldAdvance = true;
          }
        }
        if (quest.type === "explore_neighborhood" && isNewNeighborhood) shouldAdvance = true;
        if (quest.type === "discover_category" && isNewCategory) shouldAdvance = true;

        if (shouldAdvance) {
          const nextCount = quest.currentCount + 1;
          const isDone = nextCount >= quest.targetCount;
          if (isDone) {
            const completedQ: DailyQuest = {
              ...quest,
              currentCount: quest.targetCount,
              isCompleted: true,
              completedAt: new Date().toISOString()
            };
            completedQuests.push(completedQ);
            xpBreakdown.push({
              reason: "complete_quest",
              amount: quest.xpReward,
              description: `Completed quest: ${quest.title}`
            });
            totalXpEarned += quest.xpReward;
            return completedQ;
          }
          return { ...quest, currentCount: nextCount };
        }
        return quest;
      });

      // Update Streak
      const nextProfileWithStreak = updateStreakInternal(currentState.profile);

      // Evaluate Achievements
      const { updatedAchievements, newlyUnlocked } = evaluateAchievements(
        currentState.achievements,
        nextCollection,
        currentState.wifiSubmissions,
        nextProfileWithStreak.currentStreak
      );

      // Add XP from unlocked achievements
      for (const ach of newlyUnlocked) {
        xpBreakdown.push({
          reason: "achievement_unlocked",
          amount: ach.xpReward,
          description: `Unlocked achievement: ${ach.title}`
        });
        totalXpEarned += ach.xpReward;
      }

      // Record XP Transactions
      const nowIso = new Date().toISOString();
      const newTransactions: XpTransaction[] = xpBreakdown.map((item) => ({
        id: generateUuid(),
        amount: item.amount,
        reason: item.reason,
        referenceId: venue.id,
        description: item.description,
        createdAt: nowIso
      }));

      const finalXp = currentState.profile.xp + totalXpEarned;
      const prevLevel = currentState.profile.level;
      const nextLevelInfo = calculateLevel(finalXp);

      const nextState: ExplorerState = {
        ...currentState,
        profile: {
          ...nextProfileWithStreak,
          xp: finalXp,
          level: nextLevelInfo.level
        },
        collection: nextCollection,
        xpTransactions: [...newTransactions, ...currentState.xpTransactions],
        achievements: updatedAchievements,
        dailyQuests: updatedQuests,
        activeDateKey: today
      };

      writeExplorerState(nextState);
      setState(nextState);

      return {
        success: true,
        message: `Successfully collected ${venue.name}!`,
        totalXpEarned,
        xpBreakdown,
        newLevel: nextLevelInfo.level > prevLevel ? nextLevelInfo.level : undefined,
        unlockedAchievements: newlyUnlocked,
        completedQuests
      };
    },
    []
  );

  // Record a Wi-Fi submission from Explorer
  const recordWifiSubmission = useCallback(
    (submission: {
      submissionId: string;
      placeId?: string | null;
      placeName: string;
      ssid: string;
    }) => {
      saveAndSetState((currentState) => {
        // Prevent duplicate XP for the same submission ID
        const exists = currentState.wifiSubmissions.some((s) => s.submissionId === submission.submissionId);
        if (exists) return currentState;

        const xpAmount = 20; // 20 XP for submitting Wi-Fi
        const xpTransaction: XpTransaction = {
          id: generateUuid(),
          amount: xpAmount,
          reason: "submit_wifi",
          referenceId: submission.submissionId,
          description: `Submitted Wi-Fi for ${submission.placeName}`,
          createdAt: new Date().toISOString()
        };

        const newSubmission: ExplorerSubmissionStatus = {
          submissionId: submission.submissionId,
          placeId: submission.placeId,
          placeName: submission.placeName,
          ssid: submission.ssid,
          status: "pending",
          submittedAt: new Date().toISOString(),
          rewardClaimed: false
        };

        const nextSubmissions = [newSubmission, ...currentState.wifiSubmissions];
        const nextProfileWithStreak = updateStreakInternal(currentState.profile);

        // Update daily quest for Wi-Fi submission
        const updatedQuests = currentState.dailyQuests.map((quest) => {
          if (quest.isCompleted || quest.type !== "submit_wifi") return quest;
          const nextCount = quest.currentCount + 1;
          const isDone = nextCount >= quest.targetCount;
          return {
            ...quest,
            currentCount: Math.min(quest.targetCount, nextCount),
            isCompleted: isDone,
            completedAt: isDone ? new Date().toISOString() : undefined
          };
        });

        // Evaluate Achievements
        const { updatedAchievements } = evaluateAchievements(
          currentState.achievements,
          currentState.collection,
          nextSubmissions,
          nextProfileWithStreak.currentStreak
        );

        const finalXp = currentState.profile.xp + xpAmount;
        const nextLevelInfo = calculateLevel(finalXp);

        // Also mark wifiSubmitted in collection if venue is collected
        const nextCollection = currentState.collection.map((item) => {
          if (submission.placeId && item.placeId === submission.placeId) {
            return { ...item, wifiSubmitted: true };
          }
          return item;
        });

        return {
          ...currentState,
          profile: {
            ...nextProfileWithStreak,
            xp: finalXp,
            level: nextLevelInfo.level
          },
          collection: nextCollection,
          wifiSubmissions: nextSubmissions,
          dailyQuests: updatedQuests,
          achievements: updatedAchievements,
          xpTransactions: [xpTransaction, ...currentState.xpTransactions]
        };
      });
    },
    [saveAndSetState]
  );

  // Claim approval rewards when an admin verifies/approves a submission
  const claimApprovedReward = useCallback(
    (submissionId: string) => {
      let rewardEarned = 0;

      saveAndSetState((currentState) => {
        const subIndex = currentState.wifiSubmissions.findIndex((s) => s.submissionId === submissionId);
        if (subIndex === -1) return currentState;

        const sub = currentState.wifiSubmissions[subIndex];
        if (sub.status !== "approved" || sub.rewardClaimed) {
          return currentState;
        }

        const xpAmount = 50; // 50 XP for admin approval
        rewardEarned = xpAmount;

        const xpTransaction: XpTransaction = {
          id: generateUuid(),
          amount: xpAmount,
          reason: "wifi_approved",
          referenceId: submissionId,
          description: `Wi-Fi submission approved for ${sub.placeName}`,
          createdAt: new Date().toISOString()
        };

        const updatedSub: ExplorerSubmissionStatus = {
          ...sub,
          rewardClaimed: true
        };

        const nextSubmissions = [...currentState.wifiSubmissions];
        nextSubmissions[subIndex] = updatedSub;

        // Also mark wifiApproved in collection if exists
        const nextCollection = currentState.collection.map((item) => {
          if (sub.placeId && item.placeId === sub.placeId) {
            return { ...item, wifiApproved: true };
          }
          return item;
        });

        const nextProfileWithStreak = updateStreakInternal(currentState.profile);

        const { updatedAchievements } = evaluateAchievements(
          currentState.achievements,
          nextCollection,
          nextSubmissions,
          nextProfileWithStreak.currentStreak
        );

        const finalXp = currentState.profile.xp + xpAmount;
        const nextLevelInfo = calculateLevel(finalXp);

        return {
          ...currentState,
          profile: {
            ...nextProfileWithStreak,
            xp: finalXp,
            level: nextLevelInfo.level
          },
          collection: nextCollection,
          wifiSubmissions: nextSubmissions,
          achievements: updatedAchievements,
          xpTransactions: [xpTransaction, ...currentState.xpTransactions]
        };
      });

      return rewardEarned;
    },
    [saveAndSetState]
  );

  // Update personal notes on a collected venue
  const updateCollectionNotes = useCallback(
    (placeId: string, notes: string) => {
      saveAndSetState((currentState) => ({
        ...currentState,
        collection: currentState.collection.map((item) =>
          item.placeId === placeId ? { ...item, notes } : item
        )
      }));
    },
    [saveAndSetState]
  );

  return {
    state,
    isLoaded,
    levelInfo: calculateLevel(state.profile.xp),
    isCollected,
    collectVenue,
    recordWifiSubmission,
    claimApprovedReward,
    updateCollectionNotes
  };
}

