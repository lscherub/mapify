"use client";

import { Award, Compass, Flame, Layers, MapPin, Sparkles, Target, Trophy, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type LevelInfo } from "@/lib/explorer/levels";

export type ExplorerTab = "map" | "collection" | "quests" | "achievements" | "dashboard";

type Props = {
  activeTab: ExplorerTab;
  onSelectTab: (tab: ExplorerTab) => void;
  onExitExplorer: () => void;
  levelInfo: LevelInfo;
  currentStreak: number;
  collectionCount: number;
  activeQuestsCount: number;
  unlockedAchievementsCount: number;
};

export function ExplorerHeader({
  activeTab,
  onSelectTab,
  onExitExplorer,
  levelInfo,
  currentStreak,
  collectionCount,
  activeQuestsCount,
  unlockedAchievementsCount
}: Props) {
  return (
    <header className="glass-panel rounded-[2rem] p-3 shadow-xl border border-blue-500/20 bg-card/90 backdrop-blur-md">
      {/* Top row: Brand + Mode Switcher + Level/Streak Badges */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Mapify Explorer Logo + Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
            <Compass className="h-5 w-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-foreground">Explorer</span>
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-[9px] py-0 px-1.5 font-bold uppercase tracking-wider text-white border-none shadow-xs">
                Game Mode
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">
              Real-World Wi-Fi Adventure
            </p>
          </div>
        </div>

        {/* Center: Level & XP Bar (Desktop / Tablet) */}
        <div className="hidden md:flex flex-col items-center min-w-[170px] max-w-[220px]">
          <div className="flex items-center justify-between w-full text-[11px] font-semibold">
            <span className="text-blue-500 font-bold">Lv. {levelInfo.level} {levelInfo.title}</span>
            <span className="text-muted-foreground">{levelInfo.xpInCurrentLevel}/{levelInfo.xpNeededForNextLevel} XP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden mt-1 border border-border/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Streak & Switch to Normal Mapify */}
        <div className="flex items-center gap-1.5">
          {/* Streak Badge */}
          <div
            title={`Exploration Streak: ${currentStreak} days`}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0"
          >
            <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span>{currentStreak}d</span>
          </div>

          {/* Level Pill on Mobile */}
          <div className="md:hidden flex items-center gap-1 rounded-full px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-bold shrink-0">
            <span>Lv.{levelInfo.level}</span>
          </div>

          {/* Switch back to regular Mapify */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExitExplorer}
            className="h-8 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            Back to Map
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="mt-3 grid grid-cols-5 gap-1 border-t border-border/50 pt-2.5">
        <button
          type="button"
          onClick={() => onSelectTab("map")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "map"
              ? "bg-blue-600 text-white shadow-sm font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span className="text-[11px]">Radar</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("collection")}
          className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "collection"
              ? "bg-blue-600 text-white shadow-sm font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span className="text-[11px]">Collection</span>
          {collectionCount > 0 && (
            <span
              className={`text-[9px] rounded-full px-1 py-0 font-bold ${
                activeTab === "collection" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {collectionCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("quests")}
          className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "quests"
              ? "bg-blue-600 text-white shadow-sm font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Target className="h-4 w-4" />
          <span className="text-[11px]">Quests</span>
          {activeQuestsCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 absolute top-1 right-2" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("achievements")}
          className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "achievements"
              ? "bg-blue-600 text-white shadow-sm font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Award className="h-4 w-4" />
          <span className="text-[11px]">Badges</span>
          {unlockedAchievementsCount > 0 && (
            <span
              className={`text-[9px] rounded-full px-1 py-0 font-bold ${
                activeTab === "achievements" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {unlockedAchievementsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("dashboard")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition ${
            activeTab === "dashboard"
              ? "bg-blue-600 text-white shadow-sm font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          <span className="text-[11px]">Dashboard</span>
        </button>
      </div>
    </header>
  );
}

