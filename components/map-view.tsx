"use client";

import maplibregl, {
  type Map as MapLibreMap,
  type MapGeoJSONFeature,
  type StyleSpecification
} from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_ZOOM } from "@/lib/constants";
import { type Place } from "@/lib/types";

type Props = {
  places: Place[];
  initialCenter: { latitude: number; longitude: number };
  selectedPlaceId?: string;
  userLocation?: { latitude: number; longitude: number; accuracy?: number } | null;
  recenterSignal: number;
  panTarget?: { center: { latitude: number; longitude: number }; zoom?: number } | null;
  onPanTargetHandled?: () => void;
  onSelectPlace: (placeId: string) => void;
  onViewportChange?: (viewport: {
    center: { latitude: number; longitude: number };
    bounds: { west: number; south: number; east: number; north: number };
  }) => void;
  onMapReady?: (map: MapLibreMap) => void;
  isExplorerMode?: boolean;
  collectedPlaceIds?: string[];
  questCategories?: string[];
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      placeId: string;
      name: string;
      category: string;
      hasWifi: string;
      wifiFree: string;
      isVerified: string;
      isSelected: string;
      source: string;
      isCollected?: string;
      isQuestTarget?: string;
    };
  }>;
};

const OSM_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm"
    }
  ]
};

export function MapView({
  places,
  initialCenter,
  selectedPlaceId,
  userLocation,
  recenterSignal,
  panTarget,
  onPanTargetHandled,
  onSelectPlace,
  onViewportChange,
  onMapReady,
  isExplorerMode = false,
  collectedPlaceIds = [],
  questCategories = []
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geojsonRef = useRef<GeoJsonFeatureCollection>(
    buildGeoJson(places, selectedPlaceId, collectedPlaceIds, questCategories)
  );
  const userLocationRef = useRef<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const isExplorerModeRef = useRef(isExplorerMode);
  const moveEndTimeoutRef = useRef<number | null>(null);
  const hasInitialCenteredUser = useRef<boolean>(false);

  const geojson = useMemo(
    () => buildGeoJson(places, selectedPlaceId, collectedPlaceIds, questCategories),
    [places, selectedPlaceId, collectedPlaceIds, questCategories]
  );

  useEffect(() => {
    isExplorerModeRef.current = isExplorerMode;
  }, [isExplorerMode]);

  useEffect(() => {
    geojsonRef.current = geojson;
  }, [geojson]);

  useEffect(() => {
    userLocationRef.current = userLocation ?? null;
  }, [userLocation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: DEFAULT_ZOOM,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("load", () => {
      // 1. Accuracy circle for user GPS
      map.addSource("user-accuracy", {
        type: "geojson",
        data: buildUserAccuracyGeoJson(userLocationRef.current)
      });

      map.addLayer({
        id: "user-accuracy-fill",
        type: "fill",
        source: "user-accuracy",
        paint: {
          "fill-color": "#3B82F6",
          "fill-opacity": 0.14
        }
      });

      map.addLayer({
        id: "user-accuracy-stroke",
        type: "line",
        source: "user-accuracy",
        paint: {
          "line-color": "#2563EB",
          "line-opacity": 0.35,
          "line-width": 1.5
        }
      });

      // 1b. Explorer 100m check-in radar range circle
      map.addSource("explorer-radar", {
        type: "geojson",
        data: buildExplorerRadarGeoJson(userLocationRef.current, isExplorerModeRef.current)
      });

      map.addLayer({
        id: "explorer-radar-fill",
        type: "fill",
        source: "explorer-radar",
        paint: {
          "fill-color": "#06B6D4",
          "fill-opacity": 0.08
        }
      });

      map.addLayer({
        id: "explorer-radar-stroke",
        type: "line",
        source: "explorer-radar",
        paint: {
          "line-color": "#0891B2",
          "line-opacity": 0.5,
          "line-width": 2,
          "line-dasharray": [3, 2]
        }
      });

      // 2. User location point indicator
      map.addSource("user-location", {
        type: "geojson",
        data: buildUserLocationGeoJson(userLocationRef.current)
      });

      map.addLayer({
        id: "user-location-glow",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-color": "#2563EB",
          "circle-opacity": 0.22,
          "circle-radius": 16
        }
      });

      map.addLayer({
        id: "user-location-dot",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-color": "#2563EB",
          "circle-radius": 7,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff"
        }
      });

      // 3. Places data source
      map.addSource("places", {
        type: "geojson",
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 44
      });

      // Clusters
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1E293B",
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 32]
        }
      });

      map.addLayer({
        id: "cluster-outline",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#ffffff",
          "circle-opacity": 0.18,
          "circle-radius": ["step", ["get", "point_count"], 24, 10, 30, 30, 38]
        }
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "places",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12
        },
        paint: {
          "text-color": "#ffffff"
        }
      });

      // Selected ring indicator
      map.addLayer({
        id: "unclustered-selected-ring",
        type: "circle",
        source: "places",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSelected"], "true"]],
        paint: {
          "circle-color": "transparent",
          "circle-radius": 16,
          "circle-stroke-width": 3.5,
          "circle-stroke-color": "#2563EB"
        }
      });

      // Collected venue golden glow
      map.addLayer({
        id: "unclustered-collected-glow",
        type: "circle",
        source: "places",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isCollected"], "true"]],
        paint: {
          "circle-color": "#F59E0B",
          "circle-opacity": 0.35,
          "circle-radius": 16
        }
      });

      // Special Quest target purple glow
      map.addLayer({
        id: "unclustered-quest-glow",
        type: "circle",
        source: "places",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isQuestTarget"], "true"]],
        paint: {
          "circle-color": "#8B5CF6",
          "circle-opacity": 0.38,
          "circle-radius": 16
        }
      });

      // Verified Wi-Fi ambient glow
      map.addLayer({
        id: "unclustered-verified-glow",
        type: "circle",
        source: "places",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isVerified"], "true"]],
        paint: {
          "circle-color": "#10B981",
          "circle-opacity": 0.28,
          "circle-radius": 15
        }
      });

      // Unclustered place markers:
      // Amber (#F59E0B) for collected venues
      // Purple (#8B5CF6) for quest targets
      // Emerald (#059669) for verified Wi-Fi
      // Blue (#2563EB) or Slate (#64748B) for unverified / missing Wi-Fi
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "isCollected"], "true"],
            "#F59E0B",
            ["==", ["get", "isQuestTarget"], "true"],
            "#8B5CF6",
            ["==", ["get", "isVerified"], "true"],
            "#059669",
            "#2563EB"
          ],
          "circle-radius": [
            "case",
            ["==", ["get", "isCollected"], "true"],
            10,
            ["==", ["get", "isQuestTarget"], "true"],
            11,
            9
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff"
        }
      });

      // Cluster clicks
      map.on("click", "clusters", (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource("places") as maplibregl.GeoJSONSource | undefined;
        if (!source || typeof clusterId !== "number") return;

        source.getClusterExpansionZoom(clusterId).then((expansionZoom) => {
          const geometry = feature?.geometry as
            | {
                type: "Point";
                coordinates: [number, number];
              }
            | undefined;
          const coordinates = geometry?.coordinates;
          if (!coordinates) return;

          map.easeTo({
            center: coordinates,
            zoom: expansionZoom
          });
        });
      });

      // Marker click: opens information card without forced flyTo
      map.on("click", "unclustered-point", (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const placeId = feature?.properties?.placeId as string | undefined;
        if (placeId) {
          onSelectPlace(placeId);
        }
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "unclustered-point", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
      });

      // Viewport change emitter (debounced on moveend)
      map.on("moveend", () => {
        if (moveEndTimeoutRef.current) {
          window.clearTimeout(moveEndTimeoutRef.current);
        }

        moveEndTimeoutRef.current = window.setTimeout(() => {
          const center = map.getCenter();
          const bounds = map.getBounds();
          onViewportChange?.({
            center: { latitude: center.lat, longitude: center.lng },
            bounds: {
              west: bounds.getWest(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              north: bounds.getNorth()
            }
          });
        }, 180);
      });

      onMapReady?.(map);
      onViewportChange?.(emitViewport(map));

      // If userLocation was already resolved before map loaded, center once
      if (userLocationRef.current && !hasInitialCenteredUser.current) {
        hasInitialCenteredUser.current = true;
        map.jumpTo({
          center: [userLocationRef.current.longitude, userLocationRef.current.latitude],
          zoom: DEFAULT_ZOOM
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      if (moveEndTimeoutRef.current) {
        window.clearTimeout(moveEndTimeoutRef.current);
      }
    };
  }, []);

  // Update places GeoJSON without affecting map camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("places") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojsonRef.current);
    }
  }, [geojson]);

  // Update user GPS location indicator without moving camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const location = userLocation ?? null;

    const pointSource = map.getSource("user-location") as maplibregl.GeoJSONSource | undefined;
    if (pointSource) {
      pointSource.setData(buildUserLocationGeoJson(location));
    }

    const accuracySource = map.getSource("user-accuracy") as maplibregl.GeoJSONSource | undefined;
    if (accuracySource) {
      accuracySource.setData(buildUserAccuracyGeoJson(location));
    }

    const radarSource = map.getSource("explorer-radar") as maplibregl.GeoJSONSource | undefined;
    if (radarSource) {
      radarSource.setData(buildExplorerRadarGeoJson(location, isExplorerMode));
    }

    // Auto-center on user GPS strictly ONCE during initial startup
    if (location && !hasInitialCenteredUser.current) {
      hasInitialCenteredUser.current = true;
      map.flyTo({
        center: [location.longitude, location.latitude],
        zoom: DEFAULT_ZOOM,
        speed: 1.2
      });
    }
  }, [userLocation]);

  // Explicit panTarget (e.g. from search selection or place list click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !panTarget) return;

    map.flyTo({
      center: [panTarget.center.longitude, panTarget.center.latitude],
      zoom: panTarget.zoom ?? Math.max(map.getZoom(), 15),
      speed: 1.3
    });

    onPanTargetHandled?.();
  }, [panTarget, onPanTargetHandled]);

  // Explicit My Location recenter button
  useEffect(() => {
    const map = mapRef.current;
    const location = userLocationRef.current;
    if (!map || !location || recenterSignal === 0) return;

    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: Math.max(map.getZoom(), 15),
      speed: 1.3
    });
  }, [recenterSignal]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function buildGeoJson(
  places: Place[],
  selectedPlaceId?: string,
  collectedPlaceIds: string[] = [],
  questCategories: string[] = []
): GeoJsonFeatureCollection {
  const collectedSet = new Set(collectedPlaceIds);
  const questCatLower = questCategories.map((c) => c.toLowerCase());

  return {
    type: "FeatureCollection",
    features: places.map((place) => {
      const isVerified =
        place.hasWifi &&
        Array.isArray(place.wifiNetworks) &&
        place.wifiNetworks.length > 0 &&
        Boolean(place.verifiedAt);

      const isCollected = collectedSet.has(place.id);
      const isQuestTarget =
        !isCollected &&
        questCatLower.some((qc) => (place.category || "").toLowerCase().includes(qc));

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [place.longitude, place.latitude]
        },
        properties: {
          placeId: place.id,
          name: place.name,
          category: place.category,
          hasWifi: place.hasWifi ? "true" : "false",
          wifiFree: place.wifiFree ? "true" : "false",
          isVerified: isVerified ? "true" : "false",
          isSelected: place.id === selectedPlaceId ? "true" : "false",
          source: place.source,
          isCollected: isCollected ? "true" : "false",
          isQuestTarget: isQuestTarget ? "true" : "false"
        }
      };
    })
  };
}

function buildExplorerRadarGeoJson(
  location: { latitude: number; longitude: number } | null,
  enabled: boolean
) {
  if (!enabled || !location) {
    return {
      type: "FeatureCollection" as const,
      features: []
    };
  }

  // Generate 36-point polygon for the 100m check-in radar range circle
  const points = 36;
  const km = 0.1; // 100 meters
  const distanceX = km / (111.32 * Math.cos((location.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;
  const coordinates: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coordinates.push([location.longitude + x, location.latitude + y]);
  }
  coordinates.push(coordinates[0]);

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [coordinates]
        },
        properties: {}
      }
    ]
  };
}

function buildUserLocationGeoJson(
  location: { latitude: number; longitude: number; accuracy?: number } | null
) {
  return {
    type: "FeatureCollection" as const,
    features: location
      ? [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [location.longitude, location.latitude] as [number, number]
            },
            properties: {}
          }
        ]
      : []
  };
}

function buildUserAccuracyGeoJson(
  location: { latitude: number; longitude: number; accuracy?: number } | null
) {
  if (!location || !location.accuracy || location.accuracy <= 0) {
    return {
      type: "FeatureCollection" as const,
      features: []
    };
  }

  // Generate 36-point polygon for the accuracy circle in meters
  const points = 36;
  const km = location.accuracy / 1000;
  const distanceX = km / (111.32 * Math.cos((location.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;
  const coordinates: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coordinates.push([location.longitude + x, location.latitude + y]);
  }
  coordinates.push(coordinates[0]);

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [coordinates]
        },
        properties: {}
      }
    ]
  };
}

function emitViewport(map: MapLibreMap) {
  const center = map.getCenter();
  const bounds = map.getBounds();
  return {
    center: { latitude: center.lat, longitude: center.lng },
    bounds: {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth()
    }
  };
}
