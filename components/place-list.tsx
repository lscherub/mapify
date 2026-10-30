"use client";

import { CheckCircle2, Heart, MapPin, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/utils";
import { type Place } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  places: Place[];
  selectedPlaceId?: string;
  favoriteIds: string[];
  onSelect: (place: Place) => void;
  onToggleFavorite: (id: string) => void;
};

export function PlaceList({ places, selectedPlaceId, favoriteIds, onSelect, onToggleFavorite }: Props) {
  if (places.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        No places match the active filters or search.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {places.map((place) => {
        const selected = place.id === selectedPlaceId;
        const favorite = favoriteIds.includes(place.id);
        const isVerified =
          place.hasWifi &&
          Array.isArray(place.wifiNetworks) &&
          place.wifiNetworks.length > 0 &&
          Boolean(place.verifiedAt);

        return (
          <div
            key={place.id}
            className={cn(
              "group relative rounded-3xl border transition hover:-translate-y-0.5 hover:shadow-soft",
              selected ? "border-primary/40 bg-primary/5 shadow-soft ring-1 ring-primary/20" : "border-border bg-card hover:bg-secondary/30"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(place)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3.5 pr-14 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{place.name}</h3>
                  {isVerified ? (
                    <div className="flex items-center gap-0.5 text-emerald-500" title="Verified Wi-Fi">
                      <Wifi className="h-3.5 w-3.5" />
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                  ) : place.hasWifi ? (
                    <Wifi className="h-3.5 w-3.5 text-blue-500" />
                  ) : null}
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{place.address}</span>
                </p>
              </div>
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={favorite ? "Remove favorite" : "Add favorite"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(place.id);
              }}
              className={cn("absolute right-3 top-3 shrink-0 rounded-full", favorite && "text-rose-500")}
            >
              <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
            </Button>

            <div className="px-4 pb-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {isVerified ? (
                  <Badge variant="success" className="text-[10px] py-0">Verified Wi-Fi</Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] py-0">Wi-Fi unverified</Badge>
                )}
                <Badge variant="accent" className="text-[10px] py-0">{place.category}</Badge>
                {typeof place.distanceKm === "number" && (
                  <Badge variant="default" className="text-[10px] py-0">{formatDistance(place.distanceKm)}</Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
