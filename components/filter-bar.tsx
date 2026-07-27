"use client";

import { Wifi, KeyRound, BadgeCheck, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type PlaceFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  filters: PlaceFilters;
  onChange: (next: PlaceFilters) => void;
  favoritesCount: number;
};

const filterItems: Array<{
  key: keyof PlaceFilters;
  label: string;
  icon: ReactNode;
}> = [
  { key: "hasWifi", label: "Has WiFi", icon: <Wifi className="h-4 w-4" /> },
  { key: "passwordAvailable", label: "Password Available", icon: <KeyRound className="h-4 w-4" /> },
  { key: "freeWifi", label: "Free WiFi", icon: <BadgeCheck className="h-4 w-4" /> },
  { key: "favoritesOnly", label: "Favorites", icon: <Heart className="h-4 w-4" /> }
];

export function FilterBar({ filters, onChange, favoritesCount }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {filterItems.map((item) => {
        const active = filters[item.key];
        return (
          <Button
            key={item.key}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ ...filters, [item.key]: !active })}
            className={cn("rounded-full", item.key === "favoritesOnly" && favoritesCount === 0 && "opacity-60")}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
              {item.key === "favoritesOnly" ? <Badge variant="default">{favoritesCount}</Badge> : null}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
