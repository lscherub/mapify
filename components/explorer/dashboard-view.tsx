"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Layers,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  User,
  Wifi,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ExplorerProfile, type VenueCollectionItem, type DailyQuest, type Achievement, type ExplorerSubmissionStatus, type XpTransaction } from "@/lib/explorer/types";
import { type LevelInfo } from "@/lib/explorer/levels";

type Props = {
  profile: ExplorerProfile;
  levelInfo: LevelInfo;
  collection: VenueCollectionItem[];
  dailyQuests: DailyQuest[];
  achievements: Achievement[];
  submissions: ExplorerSubmissionStatus[];
  xpTransactions: XpTransaction[];
  onSelectTab: (tab: "map" | "collection" | "quests" | "achievements") => void;
  onSyncSubmissions?: () => void;
  isSyncing?: boolean;
};

export function DashboardView({
  profile,
  levelInfo,
  collection,
  dailyQuests,
  achievements,
  submissions,
  xpTransactions,
  onSelectTab,
  onSyncSubmissions,
  isSyncing
}: Props) {
  const uniqueCategories = useMemo(() => {
    return new Set(collection.map((c) => c.category.toLowerCase())).size;
  }, [collection]);

  const pendingSubmissions = useMemo(() => {
    return submissions.filter((s) => s.status === "pending" || s.status === "in_review");
  }, [submissions]);

  const approvedSubmissions = useMemo(() => {
    return submissions.filter((s) => s.status === "approved");
  }, [submissions]);

  const recentDiscoveries = useMemo(() => {
    return collection.slice(0, 5);
  }, [collection]);

  const unlockedAchievementsCount = achievements.filter((a) => a.isUnlocked).length;
  const completedQuestsCount = dailyQuests.filter((q) => q.isCompleted).length;

  return (
    <div className="space-y-4 max-h-[calc(100dvh-230px)] overflow-y-auto pr-1 pb-6">
      {/* Level & Rank Hero Banner */}
      <div className="relative overflow-hidden rounded-[2rem] border border-blue-500/30 bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-transparent p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                Explorer Profile
              </span>
              <Badge variant="default" className="text-[10px] uppercase font-bold py-0 px-2 bg-blue-500/20 text-blue-500 border border-blue-500/30">
                Level {levelInfo.level}
              </Badge>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground mt-1">
              {levelInfo.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total XP Accumulated: <span className="font-bold text-foreground">{profile.xp} XP</span>
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30 shrink-0">
            <Compass className="h-6 w-6" />
          </div>
        </div>

        {/* Level XP Progress */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Progress to Level {levelInfo.level + 1}</span>
            <span className="text-blue-500 font-bold">
              {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNextLevel} XP ({levelInfo.progressPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted/80 overflow-hidden border border-border/40">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Venues Collected */}
        <div
          onClick={() => onSelectTab("collection")}
          className="cursor-pointer rounded-2xl border border-border/70 bg-card p-3.5 hover:border-blue-500/40 transition group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Collected</span>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1.5">{collection.length}</p>
          <span className="text-[10px] text-muted-foreground group-hover:text-blue-500 font-semibold">
            View Journal →
          </span>
        </div>

        {/* Unique Categories */}
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Categories</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1.5">{uniqueCategories}</p>
          <span className="text-[10px] text-muted-foreground">Distinct types</span>
        </div>

        {/* Exploration Streak */}
        <div
          onClick={() => onSelectTab("quests")}
          className="cursor-pointer rounded-2xl border border-border/70 bg-card p-3.5 hover:border-amber-500/40 transition group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Streak</span>
            <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1.5">{profile.currentStreak}d</p>
          <span className="text-[10px] text-muted-foreground group-hover:text-amber-500 font-semibold">
            Best: {profile.longestStreak} days
          </span>
        </div>

        {/* Badges Unlocked */}
        <div
          onClick={() => onSelectTab("achievements")}
          className="cursor-pointer rounded-2xl border border-border/70 bg-card p-3.5 hover:border-purple-500/40 transition group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Badges</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1.5">
            {unlockedAchievementsCount}/{achievements.length}
          </p>
          <span className="text-[10px] text-muted-foreground group-hover:text-purple-500 font-semibold">
            Show Badges →
          </span>
        </div>
      </div>

      {/* Wi-Fi Contributions Showcase */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Wifi className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Wi-Fi Contributions</h3>
              <p className="text-[11px] text-muted-foreground">Submissions sent for admin verification</p>
            </div>
          </div>

          {onSyncSubmissions && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSyncSubmissions}
              disabled={isSyncing}
              className="h-8 rounded-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              Check Approvals
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between">
            <div>
              <span className="text-muted-foreground text-[11px] font-medium">Approved (+50 XP)</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {approvedSubmissions.length}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center justify-between">
            <div>
              <span className="text-muted-foreground text-[11px] font-medium">Pending Review</span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {pendingSubmissions.length}
              </p>
            </div>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Active Daily Quests Preview */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Target className="h-4 w-4 text-emerald-500" />
            <span>Today's Quests</span>
            <Badge variant="default" className="text-[10px] py-0 px-1.5 font-bold">
              {completedQuestsCount}/{dailyQuests.length}
            </Badge>
          </h3>
          <button
            type="button"
            onClick={() => onSelectTab("quests")}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600"
          >
            View all →
          </button>
        </div>

        <div className="space-y-1.5">
          {dailyQuests.map((quest) => (
            <div
              key={quest.id}
              className="flex items-center justify-between py-1 text-xs border-b border-border/40 last:border-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`h-2 w-2 rounded-full ${
                    quest.isCompleted ? "bg-emerald-500" : "bg-muted-foreground/40"
                  }`}
                />
                <span className={`truncate ${quest.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {quest.title}
                </span>
              </div>
              <span className="font-semibold text-muted-foreground shrink-0 text-[11px]">
                {quest.isCompleted ? "+30 XP" : `${quest.currentCount}/${quest.targetCount}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Discoveries */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Recent Discoveries</span>
          </h3>
          {collection.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectTab("collection")}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600"
            >
              Full collection ({collection.length}) →
            </button>
          )}
        </div>

        {recentDiscoveries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            No discoveries yet. Explore your neighborhood to collect spots!
          </p>
        ) : (
          <div className="divide-y divide-border/40 text-xs">
            {recentDiscoveries.map((item) => (
              <div key={item.placeId} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{item.placeName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.category} · {item.city || "Local"}</p>
                </div>
                <Badge variant="default" className="text-[9px] uppercase font-bold shrink-0">
                  Collected
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent XP Activity Log */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-blue-500" />
          <span>Reward Activity Log</span>
        </h3>

        {xpTransactions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            No XP transactions recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-border/40 text-xs max-h-48 overflow-y-auto pr-1">
            {xpTransactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{tx.description}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className="font-bold text-emerald-500 shrink-0">+{tx.amount} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

