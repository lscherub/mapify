"use client";

import maplibregl, { type Map as MapLibreMap, type MapGeoJSONFeature, type StyleSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_ZOOM } from "@/lib/constants";
import { type Place } from "@/lib/types";

type Props = {
  places: Place[];
  initialCenter: { latitude: number; longitude: number };
  selectedPlaceId?: string;
  userLocation?: { latitude: number; longitude: number } | null;
  recenterSignal: number;
  onSelectPlace: (placeId: string) => void;
  onViewportChange?: (viewport: {
    center: { latitude: number; longitude: number };
    bounds: { west: number; south: number; east: number; north: number };
  }) => void;
  onMapReady?: (map: MapLibreMap) => void;
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
      wifiFree: string;
      source: string;
    };
  }>;
};

const OSM_STYLE: StyleSpecification = {
  version: 8,
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
  onSelectPlace,
  onViewportChange,
  onMapReady
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geojsonRef = useRef<GeoJsonFeatureCollection>(buildGeoJson(places));
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const moveEndTimeoutRef = useRef<number | null>(null);

  const geojson = useMemo(() => buildGeoJson(places), [places]);

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
      map.addSource("places", {
        type: "geojson",
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 44
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#111827",
          "circle-opacity": 0.82,
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
          "circle-opacity": 0.14,
          "circle-radius": ["step", ["get", "point_count"], 24, 10, 30, 30, 38]
        }
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case", ["==", ["get", "source"], "osm"], "#0F766E", "#2563EB"],
          "circle-radius": 10,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff"
        }
      });

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
          "circle-opacity": 0.18,
          "circle-radius": 18
        }
      });

      map.addLayer({
        id: "user-location-dot",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-color": "#2563EB",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });

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

      map.on("click", "unclustered-point", (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const placeId = feature?.properties?.placeId as string | undefined;
        if (placeId) onSelectPlace(placeId);
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
        }, 100);
      });

      onMapReady?.(map);
      onViewportChange?.(emitViewport(map));
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("places") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojsonRef.current);
    }
  }, [geojson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    const source = map.getSource("user-location") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildUserLocationGeoJson(userLocation));
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlaceId) return;

    const place = places.find((entry) => entry.id === selectedPlaceId);
    if (!place) return;

    map.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(map.getZoom(), 14),
      speed: 1.2
    });
  }, [places, selectedPlaceId]);

  useEffect(() => {
    const map = mapRef.current;
    const location = userLocationRef.current;
    if (!map || !location) return;

    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: Math.max(map.getZoom(), DEFAULT_ZOOM),
      speed: 1.2
    });
  }, [recenterSignal]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function buildGeoJson(places: Place[]): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [place.longitude, place.latitude]
      },
      properties: {
        placeId: place.id,
        name: place.name,
        category: place.category,
        wifiFree: place.wifiFree ? "true" : "false",
        source: place.source
      }
    }))
  };
}

function buildUserLocationGeoJson(location: { latitude: number; longitude: number } | null) {
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
