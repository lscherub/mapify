"use client";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, Menu, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search-bar";
import { FilterBar } from "@/components/filter-bar";
import { PlaceList } from "@/components/place-list";
import { PlaceSheet } from "@/components/place-sheet";
import { MapView } from "@/components/map-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFavorites } from "@/lib/favorites";
import { attachDistances, filterPlaces } from "@/lib/place-utils";
import { getBrowserLocation } from "@/lib/location";
import { type Place, type PlaceFilters, type Suggestion } from "@/lib/types";
import { VANCOUVER_CENTER } from "@/lib/constants";

type Props = {
  initialPlaces: Place[];
};

export function AppShell({ initialPlaces }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlaceFilters>({
    hasWifi: false,
    passwordAvailable: false,
    freeWifi: false,
    favoritesOnly: false
  });
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [focusLocation, setFocusLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [center, setCenter] = useState(VANCOUVER_CENTER);
  const [menuOpen, setMenuOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    void (async () => {
      const location = await getBrowserLocation();
      setCenter(location);
    })();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const filteredPlaces = useMemo(() => {
    const data = filterPlaces(initialPlaces, query, filters);
    const withDistances = attachDistances(data, center);
    if (filters.favoritesOnly) {
      return withDistances.filter((place) => favorites.includes(place.id));
    }
    return withDistances;
  }, [center, filters, favorites, initialPlaces, query]);

  useEffect(() => {
    if (filteredPlaces.length === 0) {
      setSelectedPlaceId(undefined);
      return;
    }

    const selectedExists = filteredPlaces.some((place) => place.id === selectedPlaceId);
    if (isDesktop && !selectedExists) {
      setSelectedPlaceId(filteredPlaces[0].id);
      return;
    }

    if (!isDesktop && selectedPlaceId && !selectedExists) {
      setSelectedPlaceId(undefined);
    }
  }, [filteredPlaces, isDesktop, selectedPlaceId]);

  const selectedPlace = isDesktop
    ? filteredPlaces.find((place) => place.id === selectedPlaceId) ?? filteredPlaces[0] ?? null
    : filteredPlaces.find((place) => place.id === selectedPlaceId) ?? null;

  const onSelectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.title);
    if (typeof suggestion.latitude === "number" && typeof suggestion.longitude === "number") {
      setCenter({ latitude: suggestion.latitude, longitude: suggestion.longitude });
      setFocusLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    }
    setSelectedPlaceId(undefined);
  };

  const nearbyPreview = useMemo(() => filteredPlaces.slice(0, 6), [filteredPlaces]);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.07),transparent_26%)]" />

      <section className="map-shell">
        <MapView
          places={filteredPlaces}
          center={center}
          selectedPlaceId={selectedPlace?.id}
          focusLocation={focusLocation}
          onSelectPlace={setSelectedPlaceId}
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute left-4 top-4 z-30 hidden w-[410px] lg:block">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-[2rem] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Mapify
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">Find WiFi that works.</h1>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Discover cafes, libraries, and coworking spots across Metro Vancouver with fast
                    WiFi, notes, and one-tap password copy.
                  </p>
                </div>
                <Badge variant="accent">Beta</Badge>
              </div>

              <div className="mt-5 space-y-3">
                <SearchBar
                  value={query}
                  bias={center}
                  onChange={setQuery}
                  onSelectSuggestion={onSelectSuggestion}
                />
                <FilterBar filters={filters} onChange={setFilters} favoritesCount={favorites.length} />
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const location = await getBrowserLocation();
                    setCenter(location);
                    setFocusLocation(null);
                  }}
                >
                  <LocateFixed className="h-4 w-4" />
                  Use my location
                </Button>
                <ThemeToggle />
                <Button type="button" variant="ghost" size="icon" onClick={() => setMenuOpen((value) => !value)}>
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {menuOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel mt-3 rounded-[2rem] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Nearby
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{filteredPlaces.length} places found</h2>
                  </div>
                  <Badge variant="default">
                    <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                    Demo data
                  </Badge>
                </div>
                <div className="mt-4 max-h-[calc(100dvh-420px)] overflow-y-auto pr-1">
                  <PlaceList
                    places={nearbyPreview}
                    selectedPlaceId={selectedPlace?.id}
                    favoriteIds={favorites}
                    onSelect={(place) => setSelectedPlaceId(place.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              </motion.div>
            ) : null}
          </div>

          <div className="pointer-events-auto absolute inset-x-4 top-4 z-30 lg:hidden">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-[1.75rem] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Mapify
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight">Find WiFi nearby.</h1>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button type="button" variant="outline" size="icon" onClick={() => setMenuOpen((value) => !value)}>
                    <Menu className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <SearchBar
                  value={query}
                  bias={center}
                  onChange={setQuery}
                  onSelectSuggestion={onSelectSuggestion}
                />
                <div className="overflow-x-auto pb-1">
                  <FilterBar filters={filters} onChange={setFilters} favoritesCount={favorites.length} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const location = await getBrowserLocation();
                    setCenter(location);
                    setFocusLocation(null);
                  }}
                >
                  <LocateFixed className="h-4 w-4" />
                  Locate me
                </Button>
                <Badge variant="default">{filteredPlaces.length} results</Badge>
              </div>
            </motion.div>
          </div>

          {menuOpen && !selectedPlaceId ? (
            <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-30 lg:hidden">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[1.75rem] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Nearby places
                  </p>
                  <Badge variant="accent">Tap a pin</Badge>
                </div>
                <div className="max-h-48 overflow-y-auto pr-1">
                  <PlaceList
                    places={nearbyPreview}
                    selectedPlaceId={selectedPlace?.id}
                    favoriteIds={favorites}
                    onSelect={(place) => setSelectedPlaceId(place.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              </motion.div>
            </div>
          ) : null}
        </div>

        <PlaceSheet
          place={selectedPlace}
          open={Boolean(selectedPlace && selectedPlaceId)}
          onClose={() => setSelectedPlaceId(undefined)}
          onToggleFavorite={() => {
            if (selectedPlace) toggleFavorite(selectedPlace.id);
          }}
          isFavorite={selectedPlace ? isFavorite(selectedPlace.id) : false}
        />
      </section>
    </main>
  );
}
