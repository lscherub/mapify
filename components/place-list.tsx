"use client";

import { Heart, MapPin, Wifi } from "lucide-react";
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
  return (
    <div className="space-y-2">
      {places.map((place) => {
        const selected = place.id === selectedPlaceId;
        const favorite = favoriteIds.includes(place.id);

        return (
          <div
            key={place.id}
            className={cn(
              "group relative rounded-3xl border transition hover:-translate-y-0.5 hover:shadow-soft",
              selected ? "border-primary/30 bg-primary/5 shadow-soft" : "border-border bg-card hover:bg-secondary/30"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(place)}
              className="flex w-full items-start justify-between gap-3 px-4 py-4 pr-14 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{place.name}</h3>
                  {place.hasWifi ? <Wifi className="h-3.5 w-3.5 text-blue-500" /> : null}
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {place.address}
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
              className={cn("absolute right-3 top-3 shrink-0", favorite && "text-rose-500")}
            >
              <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
            </Button>

            <div className="px-4 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={place.wifiFree ? "success" : "warning"}>
                  {place.wifiFree ? "Free WiFi" : "Paid / gated"}
                </Badge>
                <Badge variant="default">{place.category}</Badge>
                <Badge variant={place.source === "osm" ? "accent" : "default"}>
                  {place.source === "osm" ? "OSM" : "DB"}
                </Badge>
                <Badge variant="accent">{formatDistance(place.distanceKm)}</Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
