import { type Place, type PlaceFilters } from "@/lib/types";

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const r = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.atan2(
      Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
      Math.sqrt(1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon)
    );

  return r * c;
}

export function normalizeText(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Text match grading:
 * 0: Exact business name
 * 1: Business name starts with query
 * 2: All words in query match in business name
 * 3: Substring in business name
 * 4: Words match in address/city
 * 5: Substring in address/city
 * 6: Other/loose match
 */
export function computeMatchGrade(name: string, query: string, address = ""): number {
  const normName = normalizeText(name);
  const normQuery = normalizeText(query);
  const normAddress = normalizeText(address);

  if (!normQuery) return 5;
  if (normName === normQuery) return 0;
  if (normName.startsWith(normQuery)) return 1;

  const queryWords = normQuery.split(" ").filter(Boolean);
  if (queryWords.length > 1 && queryWords.every((w) => normName.includes(w))) {
    return 2;
  }
  if (normName.includes(normQuery)) return 3;
  if (queryWords.length > 0 && queryWords.every((w) => normAddress.includes(w))) {
    return 4;
  }
  if (normAddress.includes(normQuery)) return 5;
  return 6;
}

/**
 * Geographic distance tiering:
 * Tier 0: < 5km (immediate vicinity / neighborhood)
 * Tier 1: 5 - 18km (same city / municipal area)
 * Tier 2: 18 - 55km (metropolitan area / neighboring cities)
 * Tier 3: 55 - 300km (same region / province / state)
 * Tier 4: 300 - 2500km (same country / national)
 * Tier 5: >= 2500km (international)
 */
export function computeDistanceTier(distanceKm: number): number {
  if (distanceKm < 5) return 0;
  if (distanceKm < 18) return 1;
  if (distanceKm < 55) return 2;
  if (distanceKm < 300) return 3;
  if (distanceKm < 2500) return 4;
  return 5;
}

export function computeLocationScore(
  distanceKm: number,
  matchGrade: number,
  isDatabase = false
): number {
  const tier = computeDistanceTier(distanceKm);
  const dbBonus = isDatabase ? -50 : 0;
  return tier * 10000 + matchGrade * 1000 + distanceKm + dbBonus;
}

export function attachDistances(
  places: Place[],
  center: { latitude: number; longitude: number }
) {
  return places
    .map((place) => ({
      ...place,
      distanceKm: haversineKm(center, place)
    }))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

/**
 * Location-aware, nearest-first ranking for full place lists
 */
export function rankPlaces(
  places: Place[],
  query: string,
  focus: { latitude: number; longitude: number }
): Place[] {
  const trimmed = query.trim();

  return places
    .map((place) => {
      const distanceKm = haversineKm(focus, place);
      const matchGrade = computeMatchGrade(place.name, trimmed, place.address);
      const score = computeLocationScore(distanceKm, matchGrade, place.source === "database");
      return {
        ...place,
        distanceKm,
        _score: score
      };
    })
    .sort((a, b) => a._score - b._score)
    .map(({ _score, ...rest }) => rest);
}

export function filterPlaces(places: Place[], query: string, filters: PlaceFilters) {
  const normalizedQuery = query.trim().toLowerCase();

  return places.filter((place) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [place.name, place.category, place.address, place.city, place.notes, place.wifiNetworks[0]?.ssid]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));

    const matchesWifi = !filters.hasWifi || place.hasWifi;
    const matchesPassword = !filters.passwordAvailable || Boolean(place.wifiNetworks[0]?.password);
    const matchesFree = !filters.freeWifi || place.wifiFree;

    return matchesQuery && matchesWifi && matchesPassword && matchesFree;
  });
}

export function buildSuggestions(places: Place[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return places.slice(0, 6).map((place) => ({
      id: place.id,
      title: place.name,
      subtitle: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      type: "place" as const
    }));
  }

  const seen = new Set<string>();
  const suggestions = places.flatMap((place) => {
    const values = [
      {
        id: `place:${place.id}`,
        title: place.name,
        subtitle: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        type: "place" as const
      },
      {
        id: `address:${place.id}`,
        title: place.address,
        subtitle: place.city,
        latitude: place.latitude,
        longitude: place.longitude,
        type: "address" as const
      },
      {
        id: `city:${place.city}`,
        title: place.city,
        subtitle: `${place.category} spots`,
        type: "city" as const
      }
    ];

    return values.filter((item) => {
      const haystack = `${item.title} ${item.subtitle}`.toLowerCase();
      return haystack.includes(normalized);
    });
  });

  return suggestions.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 8);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
