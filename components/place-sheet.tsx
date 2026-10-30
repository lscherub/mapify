"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, ExternalLink, MapPinned, Navigation, Phone, PlusCircle, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FavoriteButton } from "@/components/favorite-button";
import { formatPhone, formatWebsite, formatDistance } from "@/lib/utils";
import { type Place } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  place: Place | null;
  open: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onAddWifiRequest?: (place: Place) => void;
};

const amenityLabels: Array<{ key: keyof Place["amenities"]; label: string }> = [
  { key: "powerOutlets", label: "Power outlets" },
  { key: "laptopFriendly", label: "Laptop friendly" },
  { key: "quiet", label: "Quiet" },
  { key: "restrooms", label: "Restrooms" },
  { key: "outdoorSeating", label: "Outdoor seating" },
  { key: "airConditioning", label: "Air conditioning" },
  { key: "wheelchairAccessible", label: "Wheelchair accessible" },
  { key: "foodAvailable", label: "Food available" },
  { key: "coffeeAvailable", label: "Coffee available" }
];

export function PlaceSheet({
  place,
  open,
  onClose,
  onToggleFavorite,
  isFavorite,
  onAddWifiRequest
}: Props) {
  const wifi = place?.wifiNetworks[0];
  const password = wifi?.password ?? null;
  const isVerified = Boolean(
    place?.hasWifi &&
    place?.wifiNetworks &&
    place.wifiNetworks.length > 0 &&
    place?.verifiedAt
  );

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied!");
    } catch {
      toast.error("Could not copy the password.");
    }
  };

  const handleDirections = () => {
    if (!place) return;
    const isApple =
      typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
    const url = isApple
      ? `https://maps.apple.com/?daddr=${place.latitude},${place.longitude}&q=${encodeURIComponent(place.name)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {open && place ? (
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className={cn(
            "glass-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[2rem] p-4 sm:max-h-[72dvh] lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:w-[390px] lg:rounded-[2rem] shadow-xl"
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3 lg:mb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Place details
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{place.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="accent">{place.category}</Badge>
                {isVerified ? (
                  place.wifiFree ? (
                    <Badge variant="success">Free Wi-Fi</Badge>
                  ) : (
                    <Badge variant="warning">Purchase required</Badge>
                  )
                ) : (
                  <Badge variant="default">Wi-Fi unverified</Badge>
                )}
                {typeof place.distanceKm === "number" && (
                  <Badge variant="default">{formatDistance(place.distanceKm)}</Badge>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close details"
              className="shrink-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-16 lg:pb-4 overscroll-contain">
            {/* Quick Actions & Location Info */}
            <div className="space-y-2.5 rounded-3xl bg-secondary/40 p-4">
              <div className="flex items-start gap-2 text-sm">
                <MapPinned className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-foreground/90">{place.address}</p>
              </div>

              {place.phone && (
                <div className="flex items-start gap-2 text-sm">
                  <Phone className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
                  <p>{formatPhone(place.phone)}</p>
                </div>
              )}

              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm transition hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="truncate">{formatWebsite(place.website)}</span>
                </a>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDirections}
                className="mt-2 w-full rounded-2xl gap-2 font-medium"
              >
                <Navigation className="h-4 w-4 text-blue-500" />
                Get Directions
              </Button>
            </div>

            {/* Wi-Fi Details Card */}
            <div className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl",
                      isVerified ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Wi-Fi Status
                    </p>
                    <h3 className="text-base font-semibold">
                      {isVerified ? "Verified Information" : "Information Coming Soon"}
                    </h3>
                  </div>
                </div>
                {isVerified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="default">Unverified</Badge>
                )}
              </div>

              {isVerified ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-secondary/50 p-3.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Network (SSID)</p>
                    <p className="mt-1 text-sm font-semibold">{wifi?.ssid ?? "Unknown"}</p>
                  </div>

                  <div className="rounded-2xl bg-secondary/50 p-3.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</p>
                    <p className="mt-1 break-all text-sm font-semibold">
                      {password ?? "No password required (open network)"}
                    </p>
                  </div>

                  {password && (
                    <Button
                      type="button"
                      onClick={handleCopy}
                      size="default"
                      className="w-full rounded-2xl gap-2 font-medium"
                    >
                      <Copy className="h-4 w-4" />
                      Copy password
                    </Button>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>Verified {place.verifiedAt ?? "recently"}</span>
                    <span>{place.verifiedBy ?? "Admin verified"}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Wi-Fi information for this location has not yet been verified. Help the community by contributing verified details.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (onAddWifiRequest) {
                        onAddWifiRequest(place);
                      } else {
                        toast.info("Wi-Fi submission workflow will be available in Phase 2!");
                      }
                    }}
                    className="w-full rounded-2xl gap-2 text-xs font-medium"
                  >
                    <PlusCircle className="h-4 w-4 text-emerald-500" />
                    Add Wi-Fi Information
                  </Button>
                </div>
              )}
            </div>

            {/* Notes if present */}
            {place.notes && (
              <div className="rounded-3xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Notes
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{place.notes}</p>
              </div>
            )}

            {/* Amenities Card */}
            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Amenities & Environment
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {amenityLabels.map((amenity) => {
                  const active = place.amenities[amenity.key];
                  return (
                    <Badge key={amenity.key} variant={active ? "success" : "default"}>
                      {amenity.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
              <span className="text-xs text-muted-foreground">
                {place.source === "database" ? "Verified directory" : "OpenStreetMap"}
              </span>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
