"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, ExternalLink, MapPinned, Phone, X } from "lucide-react";
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

export function PlaceSheet({ place, open, onClose, onToggleFavorite, isFavorite }: Props) {
  const wifi = place?.wifiNetworks[0];
  const password = wifi?.password ?? null;
  const wifiMessage =
    place?.wifiMessage ??
    (place?.source === "osm"
      ? "Wi-Fi information is currently under review."
      : place?.hasWifi
        ? "Wi-Fi details are being verified."
        : "Wi-Fi information is currently under review.");

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied!");
    } catch {
      toast.error("Could not copy the password.");
    }
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
            "glass-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[2rem] p-4 sm:max-h-[72dvh] lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:w-[390px] lg:rounded-[2rem]"
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
                {place.wifiFree ? <Badge variant="success">Free WiFi</Badge> : <Badge variant="warning">Purchase required</Badge>}
                <Badge variant={place.source === "osm" ? "default" : "accent"}>
                  {place.source === "osm" ? "OpenStreetMap" : "Verified database"}
                </Badge>
                <Badge variant="default">{formatDistance(place.distanceKm)}</Badge>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 pb-16 lg:pb-4 overscroll-contain">
            <div className="space-y-2 rounded-3xl bg-secondary/40 p-4">
              <div className="flex items-start gap-2 text-sm">
                <MapPinned className="mt-0.5 h-4 w-4 text-blue-500" />
                <p>{place.address}</p>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Phone className="mt-0.5 h-4 w-4 text-blue-500" />
                <p>{formatPhone(place.phone)}</p>
              </div>
              <a
                href={place.website ?? "#"}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-center gap-2 text-sm transition hover:text-primary",
                  !place.website && "pointer-events-none opacity-60"
                )}
              >
                <ExternalLink className="h-4 w-4 text-blue-500" />
                {formatWebsite(place.website)}
              </a>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    WiFi
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Connect fast and keep working</h3>
                </div>
                {place.verifiedAt ? <Badge variant="success">Verified</Badge> : null}
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-secondary/50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Network</p>
                  <p className="mt-1 text-sm font-medium">{wifi?.ssid ?? "Not listed"}</p>
                </div>

                <div className="rounded-2xl bg-secondary/50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</p>
                  <p className="mt-1 break-all text-sm font-medium">
                    {password ?? wifiMessage}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleCopy}
                  disabled={!password}
                  size="lg"
                  className="w-full rounded-2xl"
                >
                  <Copy className="h-4 w-4" />
                  Copy password
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Last verified {place.verifiedAt ?? "not listed"}</span>
                  <span>{place.verifiedBy ?? "Community verified"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Notes
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/90">
                {place.notes ?? wifiMessage}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Amenities
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
              <div className="text-xs text-muted-foreground">
                Photos, hours, and speed tests can be added next.
              </div>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
