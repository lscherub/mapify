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
      town?: string;
      village?: string;
      suburb?: string;
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
  const bias = bounds.bias ?? {
    latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2
  };

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

  if (bias) {
    const delta = 0.5; // ~50km viewbox preference
    url.searchParams.set(
      "viewbox",
      `${bias.longitude - delta},${bias.latitude - delta},${bias.longitude + delta},${bias.latitude + delta}`
    );
    url.searchParams.set("bounded", "0"); // Soft bias: prioritize nearby, but allow broader search
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "MapifyApp/1.0"
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
      const city =
        geocoding.city ??
        geocoding.town ??
        geocoding.village ??
        geocoding.suburb ??
        geocoding.state ??
        "";

      const place: Place = {
        id: `nominatim-${index}-${Math.round(latitude * 100000)}-${Math.round(longitude * 100000)}`,
        slug: `nominatim-${index}-${Math.round(latitude * 100000)}-${Math.round(longitude * 100000)}`,
        name: geocoding.name ?? geocoding.label,
        category: normalizeCategory(geocoding.category ?? geocoding.type),
        latitude,
        longitude,
        address: geocoding.label,
        city,
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
  url.searchParams.set("pretty", "0");
  url.searchParams.set("no_annotations", "1");
  url.searchParams.set("language", "en");

  if (bias) {
    url.searchParams.set("proximity", `${bias.latitude},${bias.longitude}`);
  }

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!response.ok) return [];

  const text = await response.text();
  if (!text.trim()) return [];

  const parsed = JSON.parse(text) as {
    results?: Array<{
      formatted: string;
      geometry?: { lat: number; lng: number };
      components?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        county?: string;
        state?: string;
      };
    }>;
  };

  return (parsed.results ?? []).map((result, index) => {
    const lat = result.geometry?.lat ?? (bias?.latitude ?? 0);
    const lng = result.geometry?.lng ?? (bias?.longitude ?? 0);
    const city =
      result.components?.city ??
      result.components?.town ??
      result.components?.village ??
      result.components?.suburb ??
      result.components?.county ??
      result.components?.state ??
      "";

    const place: Place = {
      id: `opencage-${index}-${result.formatted}`,
      slug: `opencage-${index}-${result.formatted}`,
      name: result.formatted,
      category: "Location",
      latitude: lat,
      longitude: lng,
      address: result.formatted,
      city,
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
  // Guard against overly large bounding boxes to avoid timeouts
  const latSpan = Math.abs(bounds.north - bounds.south);
  const lonSpan = Math.abs(bounds.east - bounds.west);
  if (latSpan > 0.8 || lonSpan > 0.8) {
    return [];
  }

  const query = `
[out:json][timeout:25];
(
  node["amenity"~"cafe|restaurant|fast_food|pub|bar|library|coworking_space|internet_cafe|community_centre|college|university"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["amenity"~"cafe|restaurant|fast_food|pub|bar|library|coworking_space|internet_cafe|community_centre|college|university"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  relation["amenity"~"cafe|restaurant|fast_food|pub|bar|library|coworking_space|internet_cafe|community_centre|college|university"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["shop"~"coffee|bakery|convenience"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["shop"~"coffee|bakery|convenience"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["tourism"~"hotel|hostel|guest_house"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out center tags;
`;

  try {
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
      .map((element) => {
        const coordinates = getCoordinates(element);
        if (!coordinates) return null;

        const tags = element.tags ?? {};
        const name = tags.name ?? tags.brand ?? `${humanize(tags.amenity ?? tags.shop ?? tags.tourism ?? "Place")}`;
        const category = normalizeCategory(tags.amenity ?? tags.shop ?? tags.tourism ?? tags.office ?? "Business");
        const address = buildAddress(tags) || tags["addr:full"] || "Address not listed";
        const city = tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:suburb"] ?? "";
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
          wifiMessage: "Wi-Fi information coming soon.",
          notes: tags.description ?? `Discovered ${category.toLowerCase()}.`,
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
  } catch {
    return [];
  }
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
  if (value.includes("restaurant") || value.includes("fast_food")) return "Restaurant";
  if (value.includes("library")) return "Library";
  if (value.includes("cowork") || value.includes("office")) return "Coworking";
  if (value.includes("college") || value.includes("university")) return "University";
  if (value.includes("community_centre")) return "Community Center";
  if (value.includes("hotel") || value.includes("hostel")) return "Hotel";
  if (value.includes("bar") || value.includes("pub")) return "Bar / Pub";
  if (value.includes("bakery")) return "Bakery";
  return humanize(raw ?? "Business");
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
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
