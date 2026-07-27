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
  }).slice(0, 6);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
