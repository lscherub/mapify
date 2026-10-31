"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Coffee,
  Compass,
  Flame,
  Footprints,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wifi
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type Achievement, type AchievementCategory } from "@/lib/explorer/types";

type Props = {
  achievements: Achievement[];
};

const ICON_MAP: Record<string, any> = {
  Compass,
  Coffee,
  BookOpen,
  MapPin,
  Footprints,
  Wifi,
  ShieldCheck,
  Flame,
  Sparkles
};

const TIER_STYLES = {
  bronze: {
    border: "border-amber-700/30",
    bg: "bg-amber-700/10",
    text: "text-amber-700 dark:text-amber-500",
    ring: "ring-amber-700/20"
  },
  silver: {
    border: "border-slate-400/40",
    bg: "bg-slate-400/10",
    text: "text-slate-500 dark:text-slate-300",
    ring: "ring-slate-400/20"
  },
  gold: {
    border: "border-amber-400/50",
    bg: "bg-amber-400/15",
    text: "text-amber-500 dark:text-amber-400",
    ring: "ring-amber-400/25"
  },
  platinum: {
    border: "border-cyan-400/50",
    bg: "bg-cyan-400/15",
    text: "text-cyan-500 dark:text-cyan-400",
    ring: "ring-cyan-400/25"
  }
};

export function AchievementsView({ achievements }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<AchievementCategory | "all">("all");

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;

  const filteredAchievements = achievements.filter((a) => {
    if (selectedFilter === "all") return true;
    return a.category === selectedFilter;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            <span>Badges & Achievements</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unlockedCount} of {totalCount} Badges Unlocked
          </p>
        </div>

        <Badge variant="default" className="text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
          {Math.round((unlockedCount / totalCount) * 100)}% Complete
        </Badge>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {(["all", "exploration", "wifi", "variety", "streaks"] as const).map((filter) => {
          const count =
            filter === "all"
              ? achievements.length
              : achievements.filter((a) => a.category === filter).length;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize transition ${
                selectedFilter === filter
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {filter} ({count})
            </button>
          );
        })}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[calc(100dvh-280px)] overflow-y-auto pr-1">
        {filteredAchievements.map((ach) => {
          const IconComponent = ICON_MAP[ach.iconName] || Award;
          const tierStyle = TIER_STYLES[ach.tier] || TIER_STYLES.bronze;
          const progressPercent = Math.min(100, Math.round((ach.current / ach.target) * 100));

          return (
            <motion.div
              key={ach.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border p-4 transition flex flex-col justify-between gap-3 ${
                ach.isUnlocked
                  ? "border-purple-500/30 bg-card shadow-sm"
                  : "border-border/60 bg-muted/20 opacity-80"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Badge Icon */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ring-4 ${
                    ach.isUnlocked
                      ? `${tierStyle.bg} ${tierStyle.text} ${tierStyle.ring} shadow-sm`
                      : "bg-muted text-muted-foreground ring-muted/20"
                  }`}
                >
                  {ach.isUnlocked ? (
                    <IconComponent className="h-6 w-6" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="text-sm font-bold tracking-tight text-foreground truncate">
                        {ach.title}
                      </h4>
                      {ach.isUnlocked && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-purple-500 shrink-0">
                      +{ach.xpReward} XP
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {ach.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Status */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1.5">
                  <span className="capitalize">{ach.tier} Tier</span>
                  <span>
                    {ach.isUnlocked ? (
                      <span className="text-emerald-500 font-bold">Completed</span>
                    ) : (
                      `${ach.current} / ${ach.target}`
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden border border-border/40">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ach.isUnlocked
                        ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                        : "bg-muted-foreground/40"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

