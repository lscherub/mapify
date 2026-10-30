"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Lock,
  MapPinned,
  Navigation,
  Phone,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Unlock,
  Wifi,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FavoriteButton } from "@/components/favorite-button";
import { WifiSubmissionDialog } from "@/components/wifi-submission-dialog";
import { formatPhone, formatWebsite, formatDistance } from "@/lib/utils";
import { getBrowserLocation, type UserCoordinates } from "@/lib/location";
import { type Place, type WifiCredentialResult, type WifiNetwork } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  place: Place | null;
  open: boolean;
  userLocation: UserCoordinates | null;
  onClose: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onLocationUpdate?: (location: UserCoordinates) => void;
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
  userLocation,
  onClose,
  onToggleFavorite,
  isFavorite,
  onLocationUpdate
}: Props) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | undefined>();
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [isVerifyingProximity, setIsVerifyingProximity] = useState(false);
  const [proximityError, setProximityError] = useState<{
    distanceMeters?: number;
    message: string;
  } | null>(null);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Reset password state when place changes
  useEffect(() => {
    setRevealedPassword(null);
    setProximityError(null);
    setSelectedNetworkId(place?.wifiNetworks[0]?.id);
    setMobileExpanded(false);
  }, [place?.id]);

  if (!open || !place) return null;

  const isMapifyDb = place.source === "database";
  const networks: WifiNetwork[] = place.wifiNetworks || [];
  const activeNetwork = networks.find((n) => n.id === selectedNetworkId) || networks[0];
  const isVerified = Boolean(
    isMapifyDb &&
    place.hasWifi &&
    networks.length > 0 &&
    place.verifiedAt
  );

  const handleRevealPassword = async () => {
    setIsVerifyingProximity(true);
    setProximityError(null);

    try {
      let loc = userLocation;
      if (!loc) {
        loc = await getBrowserLocation();
        if (loc && onLocationUpdate) {
          onLocationUpdate(loc);
        }
      }

      if (!loc) {
        setProximityError({
          message: "Location permission is required to verify that you are within 500m of this location."
        });
        toast.error("Location permission required to reveal password.");
        return;
      }

      const params = new URLSearchParams({
        lat: String(loc.latitude),
        lng: String(loc.longitude)
      });
      if (activeNetwork?.id) {
        params.set("networkId", activeNetwork.id);
      }

      const res = await fetch(`/api/places/${place.id}/wifi-credentials?${params.toString()}`);
      const data = (await res.json()) as WifiCredentialResult;

      if (!data.authorized) {
        setProximityError({
          distanceMeters: data.distanceMeters,
          message: data.message
        });
        toast.warning(data.message);
        return;
      }

      setRevealedPassword(data.password || "No password required (open network)");
      toast.success("Wi-Fi credentials unlocked!");
    } catch {
      toast.error("Could not verify proximity. Please try again.");
    } finally {
      setIsVerifyingProximity(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!revealedPassword) return;
    try {
      await navigator.clipboard.writeText(revealedPassword);
      toast.success("Password copied to clipboard!");
    } catch {
      toast.error("Could not copy password.");
    }
  };

  const handleDirections = () => {
    const isApple =
      typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
    const url = isApple
      ? `https://maps.apple.com/?daddr=${place.latitude},${place.longitude}&q=${encodeURIComponent(place.name)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <AnimatePresence>
        <motion.aside
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "glass-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex flex-col overflow-hidden rounded-t-[2.2rem] p-4 shadow-2xl border-t border-border/80",
            // Mobile sizing: default compact height, expandable
            mobileExpanded ? "max-h-[85dvh]" : "max-h-[52dvh] sm:max-h-[60dvh]",
            // Desktop sizing: floating side panel
            "lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:w-[410px] lg:max-h-none lg:rounded-[2.2rem] lg:border"
          )}
        >
          {/* Mobile Drag/Expand Handle */}
          <div className="flex items-center justify-between pb-1 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileExpanded((prev) => !prev)}
              className="mx-auto flex h-4 w-12 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label={mobileExpanded ? "Collapse sheet" : "Expand sheet"}
            >
              {mobileExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-3 top-3 h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Place Title & Header */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={isMapifyDb ? "success" : "default"}
                  className="text-[10px] py-0 px-2 font-semibold"
                >
                  {isMapifyDb ? "Mapify Directory" : "OpenStreetMap"}
                </Badge>
                {typeof place.distanceKm === "number" && (
                  <Badge variant="default" className="text-[10px] py-0 px-2 font-medium">
                    {formatDistance(place.distanceKm)}
                  </Badge>
                )}
              </div>
              <h2 className="mt-1.5 truncate text-xl font-bold tracking-tight lg:text-2xl">
                {place.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{place.category}</p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close details"
              className="hidden lg:flex shrink-0 rounded-full h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-14 lg:pb-3 overscroll-contain">
            {/* Address & Quick Actions */}
            <div className="space-y-2 rounded-2xl bg-secondary/40 p-3.5 text-xs text-foreground/90">
              <div className="flex items-start gap-2">
                <MapPinned className="mt-0.5 h-3.5 w-3.5 text-blue-500 shrink-0" />
                <p className="leading-relaxed">{place.address}</p>
              </div>

              {place.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <p>{formatPhone(place.phone)}</p>
                </div>
              )}

              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline truncate"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{formatWebsite(place.website)}</span>
                </a>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDirections}
                className="mt-2 w-full rounded-xl gap-2 font-medium h-9 text-xs"
              >
                <Navigation className="h-3.5 w-3.5 text-blue-500" />
                Directions (Google / Apple Maps)
              </Button>
            </div>

            {/* Wi-Fi Details Card */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl",
                      isVerified
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Wi-Fi Information</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {isVerified
                        ? "Verified Credentials Available"
                        : isMapifyDb
                          ? "Wi-Fi Details Under Review"
                          : "Not Yet in Mapify Directory"}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={isVerified ? "success" : "default"}
                  className="text-[10px] py-0 px-2 shrink-0"
                >
                  {isVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              {/* Case 1: Verified Mapify Place with Wi-Fi */}
              {isVerified && activeNetwork ? (
                <div className="mt-3.5 space-y-3">
                  {/* Network Selector if multiple networks exist */}
                  {networks.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Network ({networks.length} available)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {networks.map((net) => (
                          <button
                            key={net.id}
                            type="button"
                            onClick={() => {
                              setSelectedNetworkId(net.id);
                              setRevealedPassword(null);
                              setProximityError(null);
                            }}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                              net.id === activeNetwork.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                            )}
                          >
                            {net.ssid}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Network SSID Box */}
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Network (SSID)
                    </span>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{activeNetwork.ssid}</p>
                  </div>

                  {/* Password & Proximity Protection Box */}
                  <div className="rounded-xl bg-secondary/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Wi-Fi Password
                      </span>
                      {revealedPassword ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                          <Unlock className="h-3 w-3" /> Unlocked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <Lock className="h-3 w-3" /> Requires Proximity (500m)
                        </span>
                      )}
                    </div>

                    {revealedPassword ? (
                      <div className="space-y-2 pt-1">
                        <div className="rounded-lg bg-background p-2.5 font-mono text-sm font-bold tracking-wide select-all break-all border border-border/80">
                          {revealedPassword}
                        </div>
                        <Button
                          type="button"
                          onClick={handleCopyPassword}
                          className="w-full rounded-xl gap-2 h-9 text-xs font-medium"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Password
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleRevealPassword}
                          disabled={isVerifyingProximity}
                          className="w-full rounded-xl gap-2 h-9 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                        >
                          {isVerifyingProximity ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Verifying Distance...
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Reveal Password
                            </>
                          )}
                        </Button>

                        {proximityError && (
                          <div className="rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p>{proximityError.message}</p>
                              {proximityError.distanceMeters && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Current distance: {proximityError.distanceMeters}m (Threshold: 500m)
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verification Info */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
                    <span>Verified: {activeNetwork.verifiedAt || place.verifiedAt || "Recently"}</span>
                    <span>{activeNetwork.verifiedBy || place.verifiedBy || "Mapify Admin"}</span>
                  </div>

                  {/* Suggest a correction */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubmissionOpen(true)}
                    className="w-full rounded-xl text-xs text-muted-foreground hover:text-foreground h-8"
                  >
                    Report a correction or update
                  </Button>
                </div>
              ) : (
                /* Case 2: Unverified Mapify spot OR External OpenStreetMap Place */
                <div className="mt-3.5 space-y-3">
                  <div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground space-y-1.5">
                    <p className="font-medium text-foreground">
                      {isMapifyDb
                        ? "Wi-Fi details are not yet verified for this business."
                        : "This location was discovered via OpenStreetMap and is not yet in Mapify."}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Know the Wi-Fi credentials? Contribute details so remote workers and visitors can connect.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setSubmissionOpen(true)}
                    className="w-full rounded-xl gap-2 text-xs font-semibold h-10 shadow-sm"
                  >
                    <PlusCircle className="h-4 w-4 text-emerald-400" />
                    Contribute Wi-Fi Information
                  </Button>
                </div>
              )}
            </div>

            {/* Notes if available */}
            {place.notes && (
              <div className="rounded-2xl border border-border bg-card p-3.5 text-xs">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Notes
                </span>
                <p className="mt-1 text-foreground/90 leading-relaxed">{place.notes}</p>
              </div>
            )}

            {/* Amenities Section */}
            <div className="rounded-2xl border border-border bg-card p-3.5">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                Amenities & Environment
              </span>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {amenityLabels.map((amenity) => {
                  const active = place.amenities[amenity.key];
                  return (
                    <Badge
                      key={amenity.key}
                      variant={active ? "success" : "default"}
                      className="text-[10px] py-0 px-2"
                    >
                      {amenity.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Bottom Bar: Favorite Button & Metadata */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
              <span className="text-[11px] text-muted-foreground truncate">
                {isMapifyDb ? "Mapify Verified Spot" : "External Discovery"}
              </span>
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Wi-Fi Contribution Modal */}
      <WifiSubmissionDialog
        place={place}
        open={submissionOpen}
        onClose={() => setSubmissionOpen(false)}
        onSuccess={() => {
          toast.info("Thank you! An administrator will review your contribution.");
        }}
      />
    </>
  );
}
