"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExplorerHeader, type ExplorerTab } from "./explorer-header";
import { CollectionView } from "./collection-view";
import { QuestsView } from "./quests-view";
import { AchievementsView } from "./achievements-view";
import { DashboardView } from "./dashboard-view";
import { CheckInModal } from "./check-in-modal";
import { useExplorer } from "@/lib/explorer/storage";
import { type Place } from "@/lib/types";
import { type UserCoordinates } from "@/lib/location";

type Props = {
  allPlaces: Place[];
  userLocation: UserCoordinates | null;
  selectedPlace: Place | null;
  discoveredCount?: number;
  onSelectPlace: (placeId: string | undefined) => void;
  onExitExplorer: () => void;
  onOpenPlaceProfile: (placeId: string) => void;
  onOpenWifiSubmission: (place: Place) => void;
  onCanonicalPlaceCreated?: (place: Place) => void;
};

export function ExplorerView({
  allPlaces,
  userLocation,
  selectedPlace,
  discoveredCount,
  onSelectPlace,
  onExitExplorer,
  onOpenPlaceProfile,
  onOpenWifiSubmission,
  onCanonicalPlaceCreated
}: Props) {
  const {
    state,
    levelInfo,
    isCollected,
    collectVenue,
    claimApprovedReward,
    updateCollectionNotes
  } = useExplorer();

  const [activeTab, setActiveTab] = useState<ExplorerTab>("map");
  const [isSyncing, setIsSyncing] = useState(false);

  // Poll or sync pending Wi-Fi submissions with server review status
  const syncSubmissions = async () => {
    const pending = state.wifiSubmissions.filter((s) => s.status === "pending" || !s.rewardClaimed);
    if (!pending.length) return;

    setIsSyncing(true);
    try {
      const res = await fetch("/api/explorer/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionIds: pending.map((p) => p.submissionId)
        })
      });

      const data = await res.json();
      if (Array.isArray(data.submissions)) {
        let newApprovals = 0;
        for (const sub of data.submissions) {
          if (sub.status === "approved") {
            const xp = claimApprovedReward(sub.id);
            if (xp > 0) newApprovals++;
          }
        }

        if (newApprovals > 0) {
          toast.success(`${newApprovals} Wi-Fi contribution(s) approved by admin! +${newApprovals * 50} XP awarded!`);
        }
      }
    } catch {
      // Graceful silence on sync error
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync submission statuses once when opening explorer
  useEffect(() => {
    void syncSubmissions();
  }, []);

  const unlockedAchievementsCount = useMemo(() => {
    return state.achievements.filter((a) => a.isUnlocked).length;
  }, [state.achievements]);

  const activeQuestsCount = useMemo(() => {
    return state.dailyQuests.filter((q) => !q.isCompleted).length;
  }, [state.dailyQuests]);

  return (
    <>
      {/* Top Header Card */}
      <ExplorerHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExitExplorer={onExitExplorer}
        levelInfo={levelInfo}
        currentStreak={state.profile.currentStreak}
        collectionCount={state.collection.length}
        activeQuestsCount={activeQuestsCount}
        unlockedAchievementsCount={unlockedAchievementsCount}
        discoveredCount={discoveredCount}
      />

      {/* Main Tab Content Drawer / Container */}
      {activeTab !== "map" && (
        <div className="glass-panel mt-3 rounded-[2rem] p-5 shadow-2xl border border-border/80 max-h-[calc(100dvh-180px)] overflow-hidden">
          {activeTab === "collection" && (
            <CollectionView
              collection={state.collection}
              allPlaces={allPlaces}
              submissions={state.wifiSubmissions}
              onOpenPlaceProfile={onOpenPlaceProfile}
              onOpenWifiSubmission={onOpenWifiSubmission}
              onUpdateNotes={updateCollectionNotes}
              onSwitchToMap={() => setActiveTab("map")}
            />
          )}

          {activeTab === "quests" && (
            <QuestsView
              dailyQuests={state.dailyQuests}
              currentStreak={state.profile.currentStreak}
              longestStreak={state.profile.longestStreak}
              lastActiveDate={state.profile.lastActiveDate}
              onSwitchToMap={() => setActiveTab("map")}
            />
          )}

          {activeTab === "achievements" && (
            <AchievementsView achievements={state.achievements} />
          )}

          {activeTab === "dashboard" && (
            <DashboardView
              profile={state.profile}
              levelInfo={levelInfo}
              collection={state.collection}
              dailyQuests={state.dailyQuests}
              achievements={state.achievements}
              submissions={state.wifiSubmissions}
              xpTransactions={state.xpTransactions}
              onSelectTab={(tab) => setActiveTab(tab)}
              onSyncSubmissions={syncSubmissions}
              isSyncing={isSyncing}
            />
          )}
        </div>
      )}

      {/* Interactive Check-In Modal when a place is selected on the map in Explorer Mode */}
      <CheckInModal
        place={selectedPlace}
        open={Boolean(selectedPlace && activeTab === "map")}
        userLocation={userLocation}
        isCollected={selectedPlace ? isCollected(selectedPlace.id) : false}
        explorerId={state.profile.id}
        onClose={() => onSelectPlace(undefined)}
        onCheckIn={(place) => collectVenue(place)}
        onOpenWifiSubmission={onOpenWifiSubmission}
        onViewInCollection={() => setActiveTab("collection")}
        onCanonicalPlaceCreated={onCanonicalPlaceCreated}
      />
    </>
  );
}

