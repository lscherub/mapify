"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onToggle: () => void;
};

export function FavoriteButton({ active, onToggle }: Props) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onToggle}
      className={cn("rounded-full", active && "bg-rose-500 hover:bg-rose-500")}
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} />
      <span>{active ? "Saved" : "Save"}</span>
    </Button>
  );
}
