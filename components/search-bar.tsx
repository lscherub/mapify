"use client";

import { Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Suggestion } from "@/lib/types";

type Props = {
  value: string;
  bias?: { latitude: number; longitude: number };
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: Suggestion) => void;
};

export function SearchBar({ value, bias, onChange, onSelectSuggestion }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: value });
        if (bias) {
          params.set("lat", String(bias.latitude));
          params.set("lng", String(bias.longitude));
        }

        const response = await fetch(`/api/suggest?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) return;
        const json = (await response.json()) as { suggestions: Suggestion[] };
        setSuggestions(json.suggestions);
      } catch {
        // Ignore network hiccups and keep the interface responsive.
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [bias, value]);

  const hasText = value.trim().length > 0;

  const filteredSuggestions = useMemo(() => suggestions.slice(0, 6), [suggestions]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 160)}
          placeholder="Search cafes, restaurants, libraries, neighborhoods..."
          className="h-12 rounded-full pl-11 pr-11 shadow-sm"
        />
        {hasText ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
        )}
      </div>

      {open && filteredSuggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-3xl border border-border bg-card/95 p-2 shadow-soft backdrop-blur-xl">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={() => onSelectSuggestion(suggestion)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-secondary/70",
                suggestion.type === "city" && "opacity-95"
              )}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {suggestion.type === "place" ? "P" : suggestion.type === "city" ? "C" : "A"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{suggestion.title}</div>
                <div className="truncate text-xs text-muted-foreground">{suggestion.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
