import { VANCOUVER_CENTER } from "@/lib/constants";
import { buildSuggestions, haversineKm } from "@/lib/place-utils";
import { searchOsmSuggestions } from "@/lib/osm";
import { type Place, type Suggestion } from "@/lib/types";

export async function getAutocompleteSuggestions(
  places: Place[],
  query: string,
  bias?: { latitude: number; longitude: number } | null
) {
  const trimmed = query.trim();
  const focus = bias ?? VANCOUVER_CENTER;

  const localSuggestions = buildSuggestions(places, trimmed).map((suggestion) => ({
    ...suggestion,
    source: "database" as const,
    place: places.find((place) => place.id === suggestion.id)
  }));

  if (!trimmed) {
    return rankSuggestions(localSuggestions, focus).slice(0, 8);
  }

  const [osmSuggestions] = await Promise.all([searchOsmSuggestions(trimmed, focus)]);
  const merged = [...localSuggestions, ...osmSuggestions];

  return dedupeSuggestions(rankSuggestions(merged, focus)).slice(0, 8);
}

function rankSuggestions(
  suggestions: Array<Suggestion & { place?: Place }>,
  focus: { latitude: number; longitude: number }
) {
  return [...suggestions].sort((a, b) => {
    const aScore = scoreSuggestion(a, focus);
    const bScore = scoreSuggestion(b, focus);
    return aScore - bScore;
  });
}

function scoreSuggestion(
  suggestion: Suggestion & { place?: Place },
  focus: { latitude: number; longitude: number }
) {
  const place = suggestion.place;
  if (!place || typeof place.latitude !== "number" || typeof place.longitude !== "number") {
    return 1000;
  }

  const distance = haversineKm(focus, place);
  const queryBoost = suggestion.source === "database" ? -0.15 : 0;
  return distance + queryBoost;
}

function dedupeSuggestions(suggestions: Array<Suggestion & { place?: Place }>) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.title.toLowerCase()}::${suggestion.subtitle.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
