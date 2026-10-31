"use client";

import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Footprints,
  Sparkles,
  Target,
  Wifi,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type DailyQuest } from "@/lib/explorer/types";

type Props = {
  dailyQuests: DailyQuest[];
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  onSwitchToMap: () => void;
};

export function QuestsView({
  dailyQuests,
  currentStreak,
  longestStreak,
  lastActiveDate,
  onSwitchToMap
}: Props) {
  const completedCount = dailyQuests.filter((q) => q.isCompleted).length;
  const todayKey = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            <span>Daily Quests & Streaks</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{todayKey} · Resets every midnight</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSwitchToMap}
          className="rounded-full text-xs gap-1.5 h-8 shrink-0"
        >
          <Compass className="h-3.5 w-3.5 text-blue-500" />
          Radar Map
        </Button>
      </div>

      {/* Streak Showcase Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl" />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 ring-4 ring-amber-500/10 shadow-sm shrink-0">
              <Flame className="h-8 w-8 fill-amber-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {currentStreak} Day{currentStreak === 1 ? "" : "s"}
                </span>
                <Badge variant="warning" className="text-[10px] uppercase font-bold py-0 px-2">
                  Active Streak
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Best Record: <span className="font-semibold text-foreground">{longestStreak} days</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Keep it burning!</p>
            <p className="text-[11px] text-muted-foreground max-w-[180px]">
              Complete a check-in or quest each day to increase your streak.
            </p>
          </div>
        </div>
      </div>

      {/* Daily Quests List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
            Today's Challenges ({completedCount}/{dailyQuests.length} Completed)
          </span>
          <span className="text-[11px] font-bold text-emerald-500">
            +{dailyQuests.length * 30} Max XP Today
          </span>
        </div>

        <div className="space-y-2.5">
          {dailyQuests.map((quest) => {
            const percent = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4 transition ${
                  quest.isCompleted
                    ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                    : "border-border/70 bg-card hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        quest.isCompleted
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {quest.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Target className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold tracking-tight text-foreground truncate">
                          {quest.title}
                        </h4>
                        {quest.isCompleted && (
                          <Badge variant="success" className="text-[9px] uppercase font-bold py-0 px-1.5">
                            Done
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{quest.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold ${
                        quest.isCompleted ? "text-emerald-500" : "text-blue-500"
                      }`}
                    >
                      +{quest.xpReward} XP
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-muted/80 overflow-hidden border border-border/40">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        quest.isCompleted
                          ? "bg-emerald-500"
                          : "bg-gradient-to-r from-blue-500 to-indigo-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                    {quest.currentCount} / {quest.targetCount}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

