"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Compass,
  Footprints,
  Loader2,
  Lock,
  MapPin,
  Sparkles,
  Wifi,
  X,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Place } from "@/lib/types";
import { type UserCoordinates } from "@/lib/location";
import { haversineKm } from "@/lib/place-utils";
import { type CheckInResult } from "@/lib/explorer/storage";

type Props = {
  place: Place | null;
  open: boolean;
  userLocation: UserCoordinates | null;
  isCollected: boolean;
  onClose: () => void;
  onCheckIn: (place: Place) => CheckInResult;
  onOpenWifiSubmission?: (place: Place) => void;
  onViewInCollection?: (placeId: string) => void;
};

export function CheckInModal({
  place,
  open,
  userLocation,
  isCollected,
  onClose,
  onCheckIn,
  onOpenWifiSubmission,
  onViewInCollection
}: Props) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);

  if (!open || !place) return null;

  // Calculate distance from user location
  let distanceMeters: number | null = null;
  if (userLocation) {
    const distKm = haversineKm(userLocation, {
      latitude: place.latitude,
      longitude: place.longitude
    });
    distanceMeters = Math.round(distKm * 1000);
  }

  const isWithinRange = distanceMeters !== null && distanceMeters <= 125; // 100m + 25m GPS tolerance

  const handleCollect = async () => {
    if (!userLocation) {
      toast.warning("GPS location is required to verify that you are at this venue.");
      return;
    }

    setIsVerifying(true);

    try {
      // Validate proximity through server API
      const res = await fetch("/api/explorer/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLat: userLocation.latitude,
          userLng: userLocation.longitude,
          venueLat: place.latitude,
          venueLng: place.longitude,
          venueId: place.id,
          venueName: place.name
        })
      });

      const data = await res.json();

      if (!data.authorized) {
        toast.warning(data.message || `You must be within 100m to check in (${data.distanceMeters || distanceMeters}m away).`);
        setIsVerifying(false);
        return;
      }

      // Execute collection in explorer engine
      const result = onCheckIn(place);
      if (result.success) {
        setCheckInResult(result);
        toast.success(`Venue Collected! +${result.totalXpEarned} XP`);
      } else {
        toast.info(result.message);
      }
    } catch {
      // Fallback client check if offline or network glitch
      if (isWithinRange) {
        const result = onCheckIn(place);
        if (result.success) {
          setCheckInResult(result);
          toast.success(`Venue Collected! +${result.totalXpEarned} XP`);
        }
      } else {
        toast.error("Could not verify check-in proximity. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setCheckInResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="relative w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-border/80 bg-gradient-to-b from-card via-card/95 to-background p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Decorative glowing background accent */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition z-20"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Success Check-In State */}
          {checkInResult ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-4 text-center space-y-4"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-500 ring-8 ring-emerald-500/10 shadow-lg">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>

              <div>
                <Badge variant="success" className="text-emerald-500 border-emerald-500/30 uppercase text-[11px] tracking-wider mb-2">
                  Discovery Logged
                </Badge>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{place.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{place.address}</p>
              </div>

              {/* XP Breakdown Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-left space-y-2">
                <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>Total XP Earned</span>
                  </div>
                  <span className="text-xl font-black">+{checkInResult.totalXpEarned} XP</span>
                </div>

                <div className="divide-y divide-border/40 text-xs">
                  {checkInResult.xpBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 text-muted-foreground">
                      <span>{item.description}</span>
                      <span className="font-semibold text-foreground">+{item.amount} XP</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level Up Notification if triggered */}
              {checkInResult.newLevel && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-center gap-3 text-left">
                  <Award className="h-7 w-7 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">Level Up! You reached Level {checkInResult.newLevel}</h4>
                    <p className="text-xs text-muted-foreground">Your Explorer rank and influence have increased!</p>
                  </div>
                </div>
              )}

              {/* Unlocked Achievements if triggered */}
              {checkInResult.unlockedAchievements.length > 0 && (
                <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-3.5 flex items-center gap-3 text-left">
                  <Award className="h-7 w-7 text-purple-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      Achievement Unlocked: {checkInResult.unlockedAchievements[0].title}!
                    </h4>
                    <p className="text-xs text-muted-foreground">+{checkInResult.unlockedAchievements[0].xpReward} XP reward granted.</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenWifiSubmission?.(place);
                  }}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 shadow-md shadow-blue-600/20"
                >
                  <Wifi className="h-4 w-4" />
                  Contribute Wi-Fi (+20 XP)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="w-full h-10 rounded-xl text-xs"
                >
                  Continue Exploring
                </Button>
              </div>
            </motion.div>
          ) : (
            /* Normal Check-In / Status Sheet */
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 shrink-0">
                  <Compass className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="text-[10px] uppercase font-semibold">
                      {place.category}
                    </Badge>
                    {isCollected && (
                      <Badge variant="success" className="text-[10px] uppercase font-semibold gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        In Collection
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground truncate">
                    {place.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                </div>
              </div>

              {/* Proximity Radar Pill */}
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isWithinRange
                        ? "bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20"
                        : "bg-amber-500 ring-4 ring-amber-500/20"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {distanceMeters !== null
                        ? `${distanceMeters} meters away`
                        : "Detecting distance via GPS..."}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isWithinRange
                        ? "Within check-in range (100m). Ready to collect!"
                        : "Move within 100 meters to collect this venue"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-bold text-blue-500">+25 XP</span>
                </div>
              </div>

              {/* Wi-Fi Info Status for this venue */}
              <div className="rounded-2xl border border-border/60 bg-card p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wifi className="h-4 w-4 text-blue-500" />
                  <span>Wi-Fi Status:</span>
                </div>
                <span className="font-semibold text-foreground">
                  {place.hasWifi ? "Available" : "Unverified / Missing"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {isCollected ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      disabled
                      className="w-full h-11 rounded-xl bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                      Already Collected
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        handleClose();
                        onOpenWifiSubmission?.(place);
                      }}
                      className="w-full h-10 rounded-xl text-xs gap-1.5"
                    >
                      <Wifi className="h-3.5 w-3.5 text-blue-500" />
                      Contribute / Update Wi-Fi Info
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={handleCollect}
                      disabled={isVerifying || !isWithinRange}
                      className={`w-full h-12 rounded-xl font-bold tracking-wide transition shadow-lg ${
                        isWithinRange
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25"
                          : "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                      }`}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying Coordinates...
                        </>
                      ) : isWithinRange ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Check In & Collect (+25 XP)
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Too far to check in ({distanceMeters ?? "..."}m)
                        </>
                      )}
                    </Button>

                    {!isWithinRange && (
                      <p className="text-[11px] text-center text-muted-foreground">
                        Get within 100 meters of {place.name} to check in and collect this location into your journal.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
