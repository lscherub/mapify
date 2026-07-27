import { getPlaces } from "@/lib/data";
import { getAutocompleteSuggestions } from "@/lib/autocomplete";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const latParam = url.searchParams.get("lat");
    const lngParam = url.searchParams.get("lng");
    const latitude = latParam === null ? Number.NaN : Number(latParam);
    const longitude = lngParam === null ? Number.NaN : Number(lngParam);
    const places = await getPlaces();
    const hasBias = Number.isFinite(latitude) && Number.isFinite(longitude);
    const suggestions = await getAutocompleteSuggestions(
      places,
      query,
      hasBias ? { latitude, longitude } : null
    );

    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
