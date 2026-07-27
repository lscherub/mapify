import { buildSuggestions } from "@/lib/place-utils";
import { METRO_VANCOUVER_BOUNDS, VANCOUVER_CENTER } from "@/lib/constants";
import { type Place, type Suggestion } from "@/lib/types";

export async function getAutocompleteSuggestions(
  places: Place[],
  query: string,
  bias?: { latitude: number; longitude: number } | null
) {
  if (!query.trim()) {
    return buildSuggestions(places, query);
  }

  const provider = process.env.AUTOCOMPLETE_PROVIDER?.toLowerCase() ?? "opencage";

  if (provider === "opencage" && process.env.OPENCAGE_API_KEY) {
    try {
      return await fetchOpenCageSuggestions(query, bias ?? VANCOUVER_CENTER);
    } catch {
      return buildSuggestions(places, query);
    }
  }

  return buildSuggestions(places, query);
}

async function fetchOpenCageSuggestions(
  query: string,
  bias: { latitude: number; longitude: number }
): Promise<Suggestion[]> {
  const key = process.env.OPENCAGE_API_KEY;
  if (!key || !query.trim()) return [];

  const url = new URL("https://api.opencagedata.com/geocode/v1/json");
  url.searchParams.set("q", query);
  url.searchParams.set("key", key);
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycode", "ca");
  url.searchParams.set("pretty", "0");
  url.searchParams.set("no_annotations", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("proximity", `${bias.longitude},${bias.latitude}`);
  url.searchParams.set(
    "bounds",
    `${METRO_VANCOUVER_BOUNDS.westLng},${METRO_VANCOUVER_BOUNDS.southLat},${METRO_VANCOUVER_BOUNDS.eastLng},${METRO_VANCOUVER_BOUNDS.northLat}`
  );

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!response.ok) return [];

  const text = await response.text();
  if (!text.trim()) return [];

  const json = JSON.parse(text) as {
    results?: Array<{
      formatted: string;
      geometry?: { lat: number; lng: number };
      components?: { city?: string; town?: string; suburb?: string; county?: string };
    }>;
  };
  return (json.results ?? []).map(
    (result) => ({
      id: result.formatted,
      title: result.formatted,
      subtitle:
        result.components?.city ??
        result.components?.town ??
        result.components?.suburb ??
        result.components?.county ??
        "OpenCage result",
      latitude: result.geometry?.lat,
      longitude: result.geometry?.lng,
      type: "address" as const
    })
  );
}
