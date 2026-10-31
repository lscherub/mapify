"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Compass, LocateFixed, Menu, Navigation, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search-bar";
import { FilterBar } from "@/components/filter-bar";
import { PlaceList } from "@/components/place-list";
import { PlaceSheet } from "@/components/place-sheet";
import { MapView } from "@/components/map-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { WifiSubmissionDialog } from "@/components/wifi-submission-dialog";
import { ExplorerView } from "@/components/explorer/explorer-view";
import { useExplorer } from "@/lib/explorer/storage";
import { useFavorites } from "@/lib/favorites";
import { filterPlaces, rankPlaces } from "@/lib/place-utils";
import { getBrowserLocation, watchBrowserLocation, type UserCoordinates } from "@/lib/location";
import { DEFAULT_FALLBACK_CENTER } from "@/lib/constants";
import { type Place, type PlaceFilters, type Suggestion } from "@/lib/types";

type Props = {
  initialPlaces: Place[];
};

type Viewport = {
  center: { latitude: number; longitude: number };
  bounds: { west: number; south: number; east: number; north: number };
};

export function AppShell({ initialPlaces }: Props) {
  const [mode, setMode] = useState<"discover" | "explorer">("discover");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlaceFilters>({
    hasWifi: false,
    passwordAvailable: false,
    freeWifi: false,
    favoritesOnly: false
  });
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [viewingProfilePlaceId, setViewingProfilePlaceId] = useState<string | null>(null);
  const [submissionPlace, setSubmissionPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const { state: explorerState, recordWifiSubmission } = useExplorer();

  const collectedPlaceIds = useMemo(() => {
    return explorerState.collection.map((item) => item.placeId);
  }, [explorerState.collection]);

  const questCategories = useMemo(() => {
    const cats: string[] = [];
    explorerState.dailyQuests.forEach((q) => {
      if (!q.isCompleted) {
        if (q.type === "visit_cafe") cats.push("coffee", "cafe", "roaster");
        if (q.type === "visit_library") cats.push("library", "study");
      }
    });
    return cats;
  }, [explorerState.dailyQuests]);

  // Initial center prioritizes existing database places, then default fallback
  const fallbackCenter = useMemo(() => {
    if (initialPlaces.length > 0) {
      return { latitude: initialPlaces[0].latitude, longitude: initialPlaces[0].longitude };
    }
    return DEFAULT_FALLBACK_CENTER;
  }, [initialPlaces]);

  // Active geographic reference for search ranking (prioritizes GPS initially, then map center when user pans)
  const [geoReference, setGeoReference] = useState<{ latitude: number; longitude: number }>(fallbackCenter);

  const [viewport, setViewport] = useState<Viewport>({
    center: fallbackCenter,
    bounds: {
      west: fallbackCenter.longitude - 0.08,
      south: fallbackCenter.latitude - 0.08,
      east: fallbackCenter.longitude + 0.08,
      north: fallbackCenter.latitude + 0.08
    }
  });

  const [osmPlaces, setOsmPlaces] = useState<Place[]>([]);
  const [menuOpen, setMenuOpen] = useState(true);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [panTarget, setPanTarget] = useState<{
    center: { latitude: number; longitude: number };
    zoom?: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"requesting" | "granted" | "denied">("requesting");

  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const osmFetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial GPS positioning
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const location = await getBrowserLocation();
        if (!active) return;

        if (location) {
          setUserLocation(location);
          setGeoReference({ latitude: location.latitude, longitude: location.longitude });
          setLocationStatus("granted");
        } else {
          setLocationStatus("denied");
        }
      } catch {
        if (active) setLocationStatus("denied");
      }
    })();

    const stopWatching = watchBrowserLocation(
      (location) => {
        if (!active) return;
        setUserLocation(location);
        setLocationStatus("granted");
      },
      () => {
        // GPS watch errors must never force the map to Vancouver or reset the position
        if (active && !userLocation) {
          setLocationStatus("denied");
        }
      }
    );

    return () => {
      active = false;
      stopWatching();
    };
  }, []);

  // Fetch nearby OpenStreetMap businesses when viewport changes (debounced by 400ms)
  useEffect(() => {
    if (osmFetchTimerRef.current) {
      clearTimeout(osmFetchTimerRef.current);
    }

    osmFetchTimerRef.current = setTimeout(() => {
      const controller = new AbortController();

      void (async () => {
        try {
          const params = new URLSearchParams({
            bbox: `${viewport.bounds.west},${viewport.bounds.south},${viewport.bounds.east},${viewport.bounds.north}`,
            lat: String(viewport.center.latitude),
            lng: String(viewport.center.longitude)
          });

          const response = await fetch(`/api/osm/nearby?${params.toString()}`, {
            signal: controller.signal
          });
          if (!response.ok) return;

          const json = (await response.json()) as { places?: Place[] };
          if (Array.isArray(json.places)) {
            setOsmPlaces((prev) => dedupePlaces([...prev, ...(json.places ?? [])]));
          }
        } catch {
          // Keep existing places if network hiccups
        }
      })();
    }, 400);

    return () => {
      if (osmFetchTimerRef.current) {
        clearTimeout(osmFetchTimerRef.current);
      }
    };
  }, [viewport.bounds.east, viewport.bounds.north, viewport.bounds.south, viewport.bounds.west, viewport.center.latitude, viewport.center.longitude]);

  // Combine database places and discovered OSM places
  const allPlaces = useMemo(() => dedupePlaces([...initialPlaces, ...osmPlaces]), [initialPlaces, osmPlaces]);

  // Location-aware, nearest-first ranking for place results using active geographic reference
  const filteredPlaces = useMemo(() => {
    const data = filterPlaces(allPlaces, query, filters);
    const ranked = rankPlaces(data, query, geoReference);

    if (filters.favoritesOnly) {
      return ranked.filter((place) => favorites.includes(place.id));
    }

    return ranked;
  }, [allPlaces, favorites, filters, query, geoReference]);

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return allPlaces.find((place) => place.id === selectedPlaceId) ?? null;
  }, [allPlaces, selectedPlaceId]);

  // Handle selecting a place from search suggestion
  const onSelectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.title);

    if (suggestion.place) {
      upsertPlace(setOsmPlaces, suggestion.place);
      setSelectedPlaceId(suggestion.place.id);
      setGeoReference({
        latitude: suggestion.place.latitude,
        longitude: suggestion.place.longitude
      });
      setPanTarget({
        center: {
          latitude: suggestion.place.latitude,
          longitude: suggestion.place.longitude
        },
        zoom: 15
      });
      return;
    }

    if (typeof suggestion.latitude === "number" && typeof suggestion.longitude === "number") {
      setGeoReference({
        latitude: suggestion.latitude,
        longitude: suggestion.longitude
      });
      setPanTarget({
        center: { latitude: suggestion.latitude, longitude: suggestion.longitude },
        zoom: 15
      });
      setSelectedPlaceId(undefined);
    }
  };

  // Handle selecting a place from list
  const handleSelectFromList = (place: Place) => {
    setSelectedPlaceId(place.id);
    setGeoReference({
      latitude: place.latitude,
      longitude: place.longitude
    });
    setPanTarget({
      center: { latitude: place.latitude, longitude: place.longitude },
      zoom: 15
    });
  };

  const nearbyPreview = useMemo(() => filteredPlaces.slice(0, 10), [filteredPlaces]);

  // Floating My Location click handler
  const locateMe = async () => {
    setIsLocating(true);
    try {
      const location = userLocation ?? (await getBrowserLocation());
      if (location) {
        setUserLocation(location);
        setGeoReference({ latitude: location.latitude, longitude: location.longitude });
        setLocationStatus("granted");
        setPanTarget({
          center: { latitude: location.latitude, longitude: location.longitude },
          zoom: 15
        });
        setRecenterSignal((value) => value + 1);
      }
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden select-none">
      <section className="map-shell">
        <MapView
          places={filteredPlaces}
          initialCenter={fallbackCenter}
          selectedPlaceId={selectedPlace?.id}
          userLocation={userLocation}
          recenterSignal={recenterSignal}
          panTarget={panTarget}
          onPanTargetHandled={() => setPanTarget(null)}
          onSelectPlace={(id) => setSelectedPlaceId(id)}
          onViewportChange={(nextViewport) => {
            setViewport(nextViewport);
            // When user manually moves the map, update the active geographic reference
            setGeoReference(nextViewport.center);
          }}
          isExplorerMode={mode === "explorer"}
          collectedPlaceIds={collectedPlaceIds}
          questCategories={questCategories}
        />

        {/* Floating "My Location" Button */}
        <div className="pointer-events-auto absolute right-4 bottom-28 z-30 lg:bottom-12">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={locateMe}
            disabled={isLocating}
            aria-label="Center map on my location"
            className="h-11 w-11 rounded-full shadow-lg border border-border/60 bg-card/90 backdrop-blur-md hover:bg-card transition"
          >
            <LocateFixed
              className={`h-5 w-5 ${
                locationStatus === "granted" ? "text-blue-500" : "text-muted-foreground"
              } ${isLocating ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Desktop UI: Search, Filters, Place Discovery, or Explorer View */}
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute left-4 top-4 z-30 hidden w-[420px] lg:block">
            {/* Mode Switcher Pill */}
            <div className="glass-panel mb-3 rounded-2xl p-1 shadow-lg border border-border/70 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode("discover")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  mode === "discover"
                    ? "bg-card text-foreground shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span>Discover</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("explorer")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                  mode === "explorer"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-amber-400" />
                <span>Explorer</span>
                <span className="text-[9px] bg-white/20 rounded-full px-1.5 py-0 font-black">
                  GAME
                </span>
              </button>
            </div>

            {mode === "explorer" ? (
              <ExplorerView
                allPlaces={allPlaces}
                userLocation={userLocation}
                selectedPlace={selectedPlace}
                onSelectPlace={(id) => setSelectedPlaceId(id)}
                onExitExplorer={() => setMode("discover")}
                onOpenPlaceProfile={(placeId) => {
                  setViewingProfilePlaceId(placeId);
                }}
                onOpenWifiSubmission={(place) => {
                  setSubmissionPlace(place);
                }}
              />
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-[2rem] p-5 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        <span>Mapify</span>
                      </div>
                      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Discover Wi-Fi spots</h1>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                        Find cafes, libraries, and coworking spaces with verified Wi-Fi and work amenities.
                      </p>
                    </div>
                    <Badge
                      variant={locationStatus === "granted" ? "success" : "default"}
                      className="text-[10px] uppercase font-semibold shrink-0"
                    >
                      {locationStatus === "granted" ? "Live GPS" : "Exploration"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <SearchBar
                      value={query}
                      bias={geoReference}
                      onChange={setQuery}
                      onSelectSuggestion={onSelectSuggestion}
                    />
                    <FilterBar filters={filters} onChange={setFilters} favoritesCount={favorites.length} />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={locateMe}
                        className="rounded-full text-xs gap-1.5 h-8"
                      >
                        <LocateFixed className="h-3.5 w-3.5 text-blue-500" />
                        My Location
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMenuOpen((value) => !value)}
                      className="rounded-full text-xs text-muted-foreground h-8"
                    >
                      {menuOpen ? "Hide Places" : "Show Places"}
                    </Button>
                  </div>
                </motion.div>

                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel mt-3 rounded-[2rem] p-5 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Nearby Places ({filteredPlaces.length})
                      </p>
                      <span className="text-[11px] text-muted-foreground">Nearest to active area</span>
                    </div>
                    <div className="mt-3 max-h-[calc(100dvh-440px)] overflow-y-auto pr-1">
                      <PlaceList
                        places={nearbyPreview}
                        selectedPlaceId={selectedPlace?.id}
                        favoriteIds={favorites}
                        onSelect={handleSelectFromList}
                        onToggleFavorite={toggleFavorite}
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Mobile UI */}
          <div className="pointer-events-auto absolute inset-x-4 top-4 z-30 lg:hidden">
            {mode === "explorer" ? (
              <ExplorerView
                allPlaces={allPlaces}
                userLocation={userLocation}
                selectedPlace={selectedPlace}
                onSelectPlace={(id) => setSelectedPlaceId(id)}
                onExitExplorer={() => setMode("discover")}
                onOpenPlaceProfile={(placeId) => {
                  setViewingProfilePlaceId(placeId);
                }}
                onOpenWifiSubmission={(place) => {
                  setSubmissionPlace(place);
                }}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[1.75rem] p-3.5 shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold tracking-tight truncate">Mapify</span>
                    <button
                      type="button"
                      onClick={() => setMode("explorer")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                    >
                      <Compass className="h-3 w-3 text-amber-400" />
                      <span>Explorer</span>
                    </button>
                    <Badge
                      variant={locationStatus === "granted" ? "success" : "default"}
                      className="text-[9px] py-0 px-1.5"
                    >
                      {locationStatus === "granted" ? "GPS" : "Explore"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ThemeToggle />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setMenuOpen((value) => !value)}
                      className="h-8 w-8 rounded-full"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <SearchBar
                    value={query}
                    bias={geoReference}
                    onChange={setQuery}
                    onSelectSuggestion={onSelectSuggestion}
                  />
                  <div className="overflow-x-auto pb-1 no-scrollbar">
                    <FilterBar filters={filters} onChange={setFilters} favoritesCount={favorites.length} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Mobile Bottom Place List Drawer when in discover mode and no place is selected */}
          {mode === "discover" && menuOpen && !selectedPlaceId && (
            <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-20 lg:hidden">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[1.75rem] p-4 shadow-xl"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Nearby ({filteredPlaces.length})
                  </p>
                  <span className="text-[10px] text-muted-foreground">Nearest first</span>
                </div>
                <div className="max-h-44 overflow-y-auto pr-1">
                  <PlaceList
                    places={nearbyPreview}
                    selectedPlaceId={selectedPlace?.id}
                    favoriteIds={favorites}
                    onSelect={handleSelectFromList}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Selected Place Detail Sheet / Drawer (for Discover mode or when opened from Explorer collection) */}
        {(() => {
          const profilePlace = viewingProfilePlaceId
            ? allPlaces.find((p) => p.id === viewingProfilePlaceId) ?? null
            : null;
          const activePlace = mode === "discover" ? selectedPlace : profilePlace;
          const isOpen = Boolean(
            (mode === "discover" && selectedPlace && selectedPlaceId) ||
            (mode === "explorer" && profilePlace && viewingProfilePlaceId)
          );

          return (
            <PlaceSheet
              place={activePlace}
              open={isOpen}
              userLocation={userLocation}
              onClose={() => {
                setSelectedPlaceId(undefined);
                setViewingProfilePlaceId(null);
              }}
              onToggleFavorite={() => {
                if (activePlace) toggleFavorite(activePlace.id);
              }}
              isFavorite={activePlace ? isFavorite(activePlace.id) : false}
              onLocationUpdate={(loc) => {
                setUserLocation(loc);
                setGeoReference({ latitude: loc.latitude, longitude: loc.longitude });
                setLocationStatus("granted");
              }}
              onWifiSubmitted={(info) => {
                if (activePlace && info) {
                  recordWifiSubmission({
                    submissionId: info.submissionId || crypto.randomUUID(),
                    placeId: activePlace.id,
                    placeName: activePlace.name,
                    ssid: info.ssid
                  });
                }
              }}
            />
          );
        })()}

        {/* Global Wi-Fi Submission Modal triggered from Explorer */}
        <WifiSubmissionDialog
          place={submissionPlace}
          open={Boolean(submissionPlace)}
          onClose={() => setSubmissionPlace(null)}
          onSuccess={(info) => {
            if (submissionPlace && info) {
              recordWifiSubmission({
                submissionId: info.submissionId || crypto.randomUUID(),
                placeId: submissionPlace.id,
                placeName: submissionPlace.name,
                ssid: info.ssid
              });
            }
          }}
        />
      </section>
    </main>
  );
}

function dedupePlaces(places: Place[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
}

function upsertPlace(setPlaces: Dispatch<SetStateAction<Place[]>>, place: Place) {
  setPlaces((current) => {
    const exists = current.some((entry) => entry.id === place.id);
    if (exists) {
      return current.map((entry) => (entry.id === place.id ? place : entry));
    }
    return [...current, place];
  });
}
