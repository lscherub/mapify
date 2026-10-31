export type ExplorerProfile = {
  id: string; // persistent anonymous UUID
  displayName: string;
  level: number;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  createdAt: string;
};

export type VenueCollectionItem = {
  placeId: string;
  placeName: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  discoveredAt: string; // ISO string
  hasWifi: boolean;
  wifiSubmitted?: boolean;
  wifiApproved?: boolean;
  notes?: string;
};

export type XpActionReason =
  | "collect_venue"
  | "new_category"
  | "submit_wifi"
  | "wifi_approved"
  | "complete_quest"
  | "explore_neighborhood"
  | "achievement_unlocked"
  | "streak_milestone";

export type XpTransaction = {
  id: string;
  amount: number;
  reason: XpActionReason;
  referenceId?: string; // placeId, questId, achievementId, submissionId
  description: string;
  createdAt: string;
};

export type AchievementCategory = "exploration" | "wifi" | "variety" | "streaks";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  iconName: string;
  target: number;
  current: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
};

export type DailyQuestType =
  | "visit_cafe"
  | "discover_venue"
  | "explore_neighborhood"
  | "visit_library"
  | "submit_wifi"
  | "discover_category";

export type DailyQuest = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  type: DailyQuestType;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  xpReward: number;
  completedAt?: string;
};

export type ExplorerSubmissionStatus = {
  submissionId: string;
  placeId?: string | null;
  placeName: string;
  ssid: string;
  status: "pending" | "in_review" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string | null;
  rewardClaimed: boolean;
};

export type ExplorerState = {
  profile: ExplorerProfile;
  collection: VenueCollectionItem[];
  xpTransactions: XpTransaction[];
  achievements: Achievement[];
  dailyQuests: DailyQuest[];
  activeDateKey: string; // YYYY-MM-DD
  wifiSubmissions: ExplorerSubmissionStatus[];
};

