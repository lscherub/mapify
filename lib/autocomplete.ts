import { DEFAULT_FALLBACK_CENTER } from "@/lib/constants";
import {
  buildSuggestions,
  computeLocationScore,
  computeMatchGrade,
  haversineKm
} from "@/lib/place-utils";
import { searchOsmSuggestions } from "@/lib/osm";
import { type Place, type Suggestion } from "@/lib/types";

export async function getAutocompleteSuggestions(
  places: Place[],
  query: string,
  bias?: { latitude: number; longitude: number } | null
) {
  const trimmed = query.trim();
  const focus =
    bias ??
    (places[0]
      ? { latitude: places[0].latitude, longitude: places[0].longitude }
      : DEFAULT_FALLBACK_CENTER);

  // Match local database places
  const localRaw = buildSuggestions(places, trimmed);
  const localSuggestions: Array<Suggestion & { place?: Place }> = localRaw.map((suggestion) => {
    const rawId = suggestion.id.includes(":") ? suggestion.id.split(":")[1] : suggestion.id;
    const place = places.find((p) => p.id === rawId || p.id === suggestion.id);
    return {
      ...suggestion,
      source: "database" as const,
      place
    };
  });

  if (!trimmed) {
    return rankSuggestions(localSuggestions, trimmed, focus).slice(0, 8);
  }

  // Fetch external suggestions (Nominatim with location-aware viewbox retrieval)
  const osmSuggestions = await searchOsmSuggestions(trimmed, focus);
  const merged = [...localSuggestions, ...osmSuggestions];

  return dedupeSuggestions(rankSuggestions(merged, trimmed, focus)).slice(0, 8);
}

function rankSuggestions(
  suggestions: Array<Suggestion & { place?: Place }>,
  query: string,
  focus: { latitude: number; longitude: number }
) {
  const q = query.trim();

  return [...suggestions]
    .map((suggestion) => {
      const place = suggestion.place;
      const coords =
        place && typeof place.latitude === "number" && typeof place.longitude === "number"
          ? { latitude: place.latitude, longitude: place.longitude }
          : typeof suggestion.latitude === "number" && typeof suggestion.longitude === "number"
            ? { latitude: suggestion.latitude, longitude: suggestion.longitude }
            : null;

      const distanceKm = coords ? haversineKm(focus, coords) : 5000;
      const matchGrade = computeMatchGrade(suggestion.title, q, suggestion.subtitle);
      const isDatabase = suggestion.source === "database";
      const score = computeLocationScore(distanceKm, matchGrade, isDatabase);

      return {
        suggestion,
        score
      };
    })
    .sort((a, b) => a.score - b.score)
    .map(({ suggestion }) => suggestion);
}

function dedupeSuggestions(suggestions: Array<Suggestion & { place?: Place }>) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.title.toLowerCase().trim()}::${(suggestion.subtitle || "")
      .toLowerCase()
      .trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
