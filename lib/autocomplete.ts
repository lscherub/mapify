import { DEFAULT_FALLBACK_CENTER } from "@/lib/constants";
import { buildSuggestions, haversineKm } from "@/lib/place-utils";
import { searchOsmSuggestions } from "@/lib/osm";
import { type Place, type Suggestion } from "@/lib/types";

export async function getAutocompleteSuggestions(
  places: Place[],
  query: string,
  bias?: { latitude: number; longitude: number } | null
) {
  const trimmed = query.trim();
  const focus = bias ?? (places[0] ? { latitude: places[0].latitude, longitude: places[0].longitude } : DEFAULT_FALLBACK_CENTER);

  // Match local database places
  const localRaw = buildSuggestions(places, trimmed);
  const localSuggestions: Array<Suggestion & { place?: Place }> = localRaw.map((suggestion) => {
    // extract original place ID from suggestion.id (e.g. "place:uuid", "address:uuid")
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

  // Fetch external suggestions (Nominatim global search)
  const osmSuggestions = await searchOsmSuggestions(trimmed, focus);
  const merged = [...localSuggestions, ...osmSuggestions];

  return dedupeSuggestions(rankSuggestions(merged, trimmed, focus)).slice(0, 8);
}

function rankSuggestions(
  suggestions: Array<Suggestion & { place?: Place }>,
  query: string,
  focus: { latitude: number; longitude: number }
) {
  const q = query.trim().toLowerCase();

  return [...suggestions].sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aSub = (a.subtitle || "").toLowerCase();
    const bSub = (b.subtitle || "").toLowerCase();

    // 1. Text Relevance Match Score
    const aTextScore = computeTextMatchScore(aTitle, aSub, q);
    const bTextScore = computeTextMatchScore(bTitle, bSub, q);

    if (aTextScore !== bTextScore) {
      return bTextScore - aTextScore; // higher score wins
    }

    // 2. Verified Database Priority (when text relevance is equal)
    const aDb = a.source === "database" ? 1 : 0;
    const bDb = b.source === "database" ? 1 : 0;
    if (aDb !== bDb) {
      return bDb - aDb;
    }

    // 3. Distance Proximity
    const aDist = a.place?.latitude && a.place?.longitude ? haversineKm(focus, a.place) : 5000;
    const bDist = b.place?.latitude && b.place?.longitude ? haversineKm(focus, b.place) : 5000;
    return aDist - bDist;
  });
}

function computeTextMatchScore(title: string, subtitle: string, query: string): number {
  if (!query) return 0;
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 50;
  if (subtitle.startsWith(query)) return 30;
  if (subtitle.includes(query)) return 15;
  return 0;
}

function dedupeSuggestions(suggestions: Array<Suggestion & { place?: Place }>) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.title.toLowerCase()}::${(suggestion.subtitle || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
