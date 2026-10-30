import { haversineKm } from "@/lib/place-utils";
import { type Place, type Suggestion } from "@/lib/types";

type GeoPoint = { latitude: number; longitude: number };

type NominatimV2Result = {
  place_id: number;
  osm_id: number;
  osm_type: "node" | "way" | "relation";
  lat: string;
  lon: string;
  category: string;
  type: string;
  name?: string;
  display_name: string;
  address?: {
    amenity?: string;
    shop?: string;
    tourism?: string;
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
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

// In-memory cache for search queries (5-minute TTL)
const searchCache = new Map<string, { timestamp: number; data: Suggestion[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function searchOsmSuggestions(query: string, bias?: GeoPoint | null): Promise<Suggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed.toLowerCase()}::${
    bias ? `${bias.latitude.toFixed(2)},${bias.longitude.toFixed(2)}` : "global"
  }`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const [nominatim, opencage] = await Promise.allSettled([
    fetchNominatimSuggestions(trimmed, bias),
    fetchOpenCageSuggestions(trimmed, bias)
  ]);

  const results = [...unwrapResults(nominatim), ...unwrapResults(opencage)];
  searchCache.set(cacheKey, { timestamp: Date.now(), data: results });
  return results;
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

export async function fetchNearbyDiscoveredVenues({
  latitude,
  longitude,
  radiusMeters = 1000
}: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}): Promise<Place[]> {
  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos((latitude * Math.PI) / 180));

  const bounds = {
    south: latitude - latDelta,
    north: latitude + latDelta,
    west: longitude - lonDelta,
    east: longitude + lonDelta
  };

  const viewbox = `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`;

  const categories = [
    { key: "amenity", value: "cafe" },
    { key: "amenity", value: "restaurant" },
    { key: "amenity", value: "fast_food" },
    { key: "amenity", value: "library" },
    { key: "amenity", value: "coworking_space" },
    { key: "shop", value: "bakery" },
    { key: "shop", value: "coffee" }
  ];

  const baseHeaders = {
    "Accept-Language": "en",
    "User-Agent": "Mapify-Admin/1.0 (https://mapify-blush.vercel.app)"
  };

  const nominatimPromises = categories.map(async ({ key, value }) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set(key, value);
    url.searchParams.set("viewbox", viewbox);
    url.searchParams.set("bounded", "1");
    url.searchParams.set("limit", "15");
    url.searchParams.set("addressdetails", "1");

    try {
      const res = await fetch(url.toString(), {
        headers: baseHeaders,
        signal: AbortSignal.timeout(4500)
      });
      if (!res.ok) return [];
      return (await res.json()) as NominatimV2Result[];
    } catch {
      return [];
    }
  });

  const overpassPromise = fetchOverpassPlaces(bounds).catch(() => []);

  const [nomResults, overpassResults] = await Promise.all([
    Promise.allSettled(nominatimPromises),
    overpassPromise
  ]);

  const placesMap = new Map<string, Place>();

  for (const settled of nomResults) {
    if (settled.status === "fulfilled" && Array.isArray(settled.value)) {
      for (const item of settled.value) {
        if (!item.name || !item.lat || !item.lon) continue;
        const placeLat = parseFloat(item.lat);
        const placeLng = parseFloat(item.lon);
        if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) continue;

        const distKm = haversineKm({ latitude, longitude }, { latitude: placeLat, longitude: placeLng });
        const key = `${item.name.toLowerCase()}::${placeLat.toFixed(4)},${placeLng.toFixed(4)}`;

        if (!placesMap.has(key)) {
          const category = normalizeCategory(item.type || item.category || "Business");
          const address = item.display_name
            ? item.display_name.split(",").slice(0, 3).join(",")
            : "Address not listed";
          const city =
            item.address?.city ??
            item.address?.town ??
            item.address?.village ??
            item.address?.suburb ??
            "";

          placesMap.set(key, {
            id: `osm-${item.osm_type || "node"}-${item.osm_id}`,
            slug: `osm-${item.osm_id}-${Math.round(placeLat * 10000)}`,
            name: item.name,
            category,
            latitude: placeLat,
            longitude: placeLng,
            address,
            city,
            source: "osm",
            hasWifi: false,
            wifiFree: false,
            distanceKm: distKm,
            wifiNetworks: [],
            amenities: emptyAmenities(),
            photos: []
          });
        }
      }
    }
  }

  if (Array.isArray(overpassResults)) {
    for (const p of overpassResults) {
      const key = `${p.name.toLowerCase()}::${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
      if (!placesMap.has(key)) {
        placesMap.set(key, {
          ...p,
          distanceKm: haversineKm({ latitude, longitude }, p)
        });
      }
    }
  }

  return Array.from(placesMap.values()).sort(
    (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
  );
}

async function fetchNominatimSuggestions(query: string, bias?: GeoPoint | null): Promise<Suggestion[]> {
  const baseHeaders = {
    "Accept-Language": "en",
    "User-Agent": "Mapify-Discovery-App/1.0 (https://mapify-blush.vercel.app)"
  };

  // Helper to query Nominatim
  const queryNominatim = async (withViewbox: boolean): Promise<NominatimV2Result[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "15");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("extratags", "1");

    if (withViewbox && bias) {
      const delta = 0.75; // ~75km radius covering city & metro region
      url.searchParams.set(
        "viewbox",
        `${bias.longitude - delta},${bias.latitude - delta},${bias.longitude + delta},${bias.latitude + delta}`
      );
      url.searchParams.set("bounded", "0"); // Soft bias: prioritize local matches without excluding global
    }

    try {
      const response = await fetch(url.toString(), {
        headers: baseHeaders,
        next: { revalidate: 300 }
      });
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json) ? (json as NominatimV2Result[]) : [];
    } catch {
      return [];
    }
  };

  // Two-stage search strategy:
  // Stage 1: Location-biased search around active geographic reference
  let rawResults = await queryNominatim(Boolean(bias));

  // Stage 2: If Stage 1 produced fewer than 3 results and query has 3+ chars,
  // query broader/global results and combine without duplicates
  if (bias && rawResults.length < 3 && query.length >= 3) {
    const globalResults = await queryNominatim(false);
    const seenOsmIds = new Set(rawResults.map((r) => `${r.osm_type}:${r.osm_id}`));
    for (const item of globalResults) {
      const key = `${item.osm_type}:${item.osm_id}`;
      if (!seenOsmIds.has(key)) {
        seenOsmIds.add(key);
        rawResults.push(item);
      }
    }
  }

  // Convert Nominatim raw results to Suggestion format
  return rawResults
    .map((item, index) => {
      const latitude = parseFloat(item.lat);
      const longitude = parseFloat(item.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      const name =
        item.name ||
        item.address?.amenity ||
        item.address?.shop ||
        item.address?.tourism ||
        item.display_name.split(",")[0] ||
        "Place";

      const city =
        item.address?.city ??
        item.address?.town ??
        item.address?.village ??
        item.address?.suburb ??
        item.address?.state ??
        item.address?.country ??
        "";

      const category = normalizeCategory(item.type || item.category || "Business");

      const place: Place = {
        id: `osm-${item.osm_type || "node"}-${item.osm_id || index}-${Math.round(latitude * 10000)}`,
        slug: `osm-${item.osm_id || index}-${Math.round(latitude * 10000)}`,
        name,
        category,
        latitude,
        longitude,
        address: item.display_name,
        city,
        source: "osm",
        hasWifi: false,
        wifiFree: false,
        wifiMessage: "Wi-Fi information has not yet been added to Mapify.",
        notes: `Discovered from OpenStreetMap (${category.toLowerCase()}).`,
        verifiedBy: "OpenStreetMap",
        wifiNetworks: [],
        amenities: emptyAmenities(),
        photos: [],
        osm: {
          osmId: item.osm_id || index,
          osmType: item.osm_type || "node",
          provider: "nominatim"
        }
      };

      const suggestion: Suggestion = {
        id: place.id,
        title: place.name,
        subtitle: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        type: item.category === "place" ? "city" : "place",
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

  try {
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
        hasWifi: false,
        wifiFree: false,
        wifiMessage: "Wi-Fi information has not yet been added to Mapify.",
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
  } catch {
    return [];
  }
}

async function fetchOverpassPlaces(bounds: { west: number; south: number; east: number; north: number }) {
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
  node["shop"~"coffee|bakery|convenience|supermarket"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["shop"~"coffee|bakery|convenience|supermarket"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
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
          wifiMessage: "Wi-Fi information has not yet been added to Mapify.",
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
  if (value.includes("supermarket") || value.includes("grocery")) return "Supermarket";
  if (value.includes("restaurant") || value.includes("fast_food")) return "Restaurant";
  if (value.includes("library")) return "Library";
  if (value.includes("cowork") || value.includes("office")) return "Coworking";
  if (value.includes("college") || value.includes("university")) return "University";
  if (value.includes("community_centre") || value.includes("community")) return "Community Center";
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
