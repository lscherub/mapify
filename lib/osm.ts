import { METRO_VANCOUVER_BOUNDS, VANCOUVER_CENTER } from "@/lib/constants";
import { haversineKm } from "@/lib/place-utils";
import { type Place, type Suggestion } from "@/lib/types";

type GeoPoint = { latitude: number; longitude: number };

type NominatimFeature = {
  properties?: {
    geocoding?: {
      label?: string;
      name?: string;
      type?: string;
      category?: string;
      city?: string;
      state?: string;
      country?: string;
      housenumber?: string;
      street?: string;
      postcode?: string;
    };
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function searchOsmSuggestions(query: string, bias?: GeoPoint | null) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [nominatim, opencage] = await Promise.allSettled([
    fetchNominatimSuggestions(trimmed, bias),
    fetchOpenCageSuggestions(trimmed, bias)
  ]);

  return [...unwrapResults(nominatim), ...unwrapResults(opencage)];
}

export async function fetchNearbyOsmPlaces(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
  bias?: GeoPoint | null;
}) {
  const results = await fetchOverpassPlaces(bounds);
  const bias = bounds.bias ?? VANCOUVER_CENTER;

  return results
    .map((place) => ({
      ...place,
      distanceKm: haversineKm(bias, place)
    }))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

async function fetchNominatimSuggestions(query: string, bias?: GeoPoint | null): Promise<Suggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "geocodejson");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("countrycodes", "ca");

  const viewbox = bias ? buildViewbox(bias, 0.18) : toViewportBounds(METRO_VANCOUVER_BOUNDS);
  url.searchParams.set("viewbox", `${viewbox.west},${viewbox.south},${viewbox.east},${viewbox.north}`);
  url.searchParams.set("bounded", "0");

  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "en"
    },
    next: { revalidate: 300 }
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { features?: NominatimFeature[] };
  return (data.features ?? [])
    .map((feature, index) => {
      const coordinates = feature.geometry?.coordinates;
      const geocoding = feature.properties?.geocoding;
      if (!coordinates || !geocoding?.label) return null;

      const [longitude, latitude] = coordinates;
      const place: Place = {
        id: `nominatim-${index}-${Math.round(latitude * 100000)}-${Math.round(longitude * 100000)}`,
        slug: `nominatim-${index}-${Math.round(latitude * 100000)}-${Math.round(longitude * 100000)}`,
        name: geocoding.name ?? geocoding.label,
        category: normalizeCategory(geocoding.category ?? geocoding.type),
        latitude,
        longitude,
        address: geocoding.label,
        city: geocoding.city ?? geocoding.state ?? "Metro Vancouver",
        source: "osm",
        wifiFree: false,
        hasWifi: false,
        wifiMessage: "Wi-Fi information is currently under review.",
        notes: "Discovered from OpenStreetMap.",
        verifiedBy: "OSM result",
        wifiNetworks: [],
        amenities: emptyAmenities(),
        photos: [],
        osm: {
          osmId: index,
          osmType: "node",
          provider: "nominatim"
        }
      };

      const suggestion: Suggestion = {
        id: place.id,
        title: place.name,
        subtitle: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        type: "poi",
        source: "osm",
        place
      };

      return suggestion;
    })
    .filter(Boolean) as Suggestion[];
}

async function fetchOpenCageSuggestions(query: string, bias?: GeoPoint | null): Promise<Suggestion[]> {
  const key = process.env.OPENCAGE_API_KEY;
  if (!key) return [];

  const url = new URL("https://api.opencagedata.com/geocode/v1/json");
  url.searchParams.set("q", query);
  url.searchParams.set("key", key);
  url.searchParams.set("limit", "4");
  url.searchParams.set("countrycode", "ca");
  url.searchParams.set("pretty", "0");
  url.searchParams.set("no_annotations", "1");
  url.searchParams.set("language", "en");
  if (bias) {
    url.searchParams.set("proximity", `${bias.longitude},${bias.latitude}`);
  }

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!response.ok) return [];

  const text = await response.text();
  if (!text.trim()) return [];

  const parsed = JSON.parse(text) as {
    results?: Array<{
      formatted: string;
      geometry?: { lat: number; lng: number };
      components?: { city?: string; town?: string; suburb?: string; county?: string };
    }>;
  };

  return (parsed.results ?? []).map((result, index) => {
    const place: Place = {
      id: `opencage-${index}-${result.formatted}`,
      slug: `opencage-${index}-${result.formatted}`,
      name: result.formatted,
      category: "Location",
      latitude: result.geometry?.lat ?? VANCOUVER_CENTER.latitude,
      longitude: result.geometry?.lng ?? VANCOUVER_CENTER.longitude,
      address: result.formatted,
      city:
        result.components?.city ??
        result.components?.town ??
        result.components?.suburb ??
        result.components?.county ??
        "Metro Vancouver",
      source: "osm",
      wifiFree: false,
      hasWifi: false,
      wifiMessage: "Wi-Fi information is currently under review.",
      notes: "Suggested by OpenCage geocoding.",
      verifiedBy: "Geocoding result",
      wifiNetworks: [],
      amenities: emptyAmenities(),
      photos: [],
      osm: {
        osmId: index,
        osmType: "node",
        provider: "nominatim"
      }
    };

    return {
      id: place.id,
      title: place.name,
      subtitle: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      type: "address" as const,
      source: "osm" as const,
      place
    };
  });
}

async function fetchOverpassPlaces(bounds: { west: number; south: number; east: number; north: number }) {
  const query = `
[out:json][timeout:25];
(
  node["amenity"~"cafe|restaurant|fast_food|pub|bar|library|coworking_space|internet_cafe"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["amenity"~"cafe|restaurant|fast_food|pub|bar|library|coworking_space|internet_cafe"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["amenity"~"cafe|restaurant|fast_food|pub|bar|library|coworking_space|internet_cafe"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["shop"~"coffee|bakery|convenience|supermarket"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["shop"~"coffee|bakery|convenience|supermarket"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["shop"~"coffee|bakery|convenience|supermarket"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
)
out center tags;
`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain"
    },
    body: query,
    next: { revalidate: 120 }
  } as RequestInit & { next?: { revalidate: number } });

  if (!response.ok) return [];

  const data = (await response.json()) as { elements?: OverpassElement[] };
  return (data.elements ?? [])
    .map((element, index) => {
      const coordinates = getCoordinates(element);
      if (!coordinates) return null;

      const tags = element.tags ?? {};
      const name = tags.name ?? tags["brand"] ?? `${humanize(tags.amenity ?? tags.shop ?? "Place")}`;
      const category = normalizeCategory(tags.amenity ?? tags.shop ?? tags.office ?? "Business");
      const address = buildAddress(tags) || tags["addr:full"] || "Address not listed";
      const city = tags["addr:city"] ?? "Metro Vancouver";
      const phone = tags["contact:phone"] ?? tags.phone ?? undefined;
      const website = tags["contact:website"] ?? tags.website ?? tags.url ?? undefined;
      const hours = tags.opening_hours ?? undefined;

      const place: Place = {
        id: `osm-${element.type}-${element.id}`,
        slug: `osm-${element.type}-${element.id}`,
        name,
        category,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        address,
        city,
        website,
        phone,
        source: "osm",
        hasWifi: false,
        wifiFree: false,
        wifiMessage: "Wi-Fi information is currently under review.",
        notes: tags.description ?? `OpenStreetMap ${category.toLowerCase()} result.`,
        hours,
        verifiedBy: "OpenStreetMap",
        wifiNetworks: [],
        amenities: emptyAmenities(),
        photos: [],
        osm: {
          osmId: element.id,
          osmType: element.type,
          provider: "overpass",
          tags
        }
      };

      return place;
    })
    .filter(Boolean) as Place[];
}

function getCoordinates(element: OverpassElement) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (element.center) {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }

  return null;
}

function buildAddress(tags: Record<string, string>) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:state"]
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "";
}

function normalizeCategory(raw?: string) {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("cafe") || value.includes("coffee")) return "Cafe";
  if (value.includes("restaurant")) return "Restaurant";
  if (value.includes("library")) return "Library";
  if (value.includes("cowork") || value.includes("office")) return "Coworking";
  if (value.includes("bar") || value.includes("pub")) return "Cafe";
  if (value.includes("bakery")) return "Bakery";
  return humanize(raw ?? "Business");
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function buildViewbox(center: GeoPoint, delta: number) {
  return {
    west: center.longitude - delta,
    south: center.latitude - delta,
    east: center.longitude + delta,
    north: center.latitude + delta
  };
}

function toViewportBounds(bounds: typeof METRO_VANCOUVER_BOUNDS) {
  return {
    west: bounds.westLng,
    south: bounds.southLat,
    east: bounds.eastLng,
    north: bounds.northLat
  };
}

function emptyAmenities() {
  return {
    powerOutlets: false,
    laptopFriendly: false,
    quiet: false,
    restrooms: false,
    outdoorSeating: false,
    airConditioning: false,
    wheelchairAccessible: false,
    foodAvailable: false,
    coffeeAvailable: false
  };
}

function unwrapResults<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : [];
}
