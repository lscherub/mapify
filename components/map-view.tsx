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
  center: { latitude: number; longitude: number };
  selectedPlaceId?: string;
  focusLocation?: { latitude: number; longitude: number } | null;
  onSelectPlace: (placeId: string) => void;
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
} as const;

export function MapView({ places, center, selectedPlaceId, focusLocation, onSelectPlace, onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const focusMarkerRef = useRef<maplibregl.Marker | null>(null);
  const geojsonRef = useRef<GeoJsonFeatureCollection>(buildGeoJson(places));

  const geojson = useMemo(() => buildGeoJson(places), [places]);

  useEffect(() => {
    geojsonRef.current = geojson;
  }, [geojson]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [center.longitude, center.latitude],
      zoom: DEFAULT_ZOOM,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "bottom-right");

    map.on("load", () => {
      map.addSource("places", {
        type: "geojson",
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#111827",
          "circle-opacity": 0.86,
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 24, 40, 30]
        }
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case", ["==", ["get", "wifiFree"], "true"], "#2563EB", "#111827"],
          "circle-radius": 10,
          "circle-stroke-width": 3,
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

      onMapReady?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
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
    if (!map) return;

    map.easeTo({
      center: [center.longitude, center.latitude]
    });
  }, [center.latitude, center.longitude]);

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
    if (!map) return;

    if (!focusLocation) {
      focusMarkerRef.current?.remove();
      focusMarkerRef.current = null;
      return;
    }

    const marker =
      focusMarkerRef.current ??
      new maplibregl.Marker({
        color: "#2563EB"
      });

    marker.setLngLat([focusLocation.longitude, focusLocation.latitude]).addTo(map);
    focusMarkerRef.current = marker;
  }, [focusLocation]);

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
        wifiFree: place.wifiFree ? "true" : "false"
      }
    }))
  };
}
