import { fetchNearbyOsmPlaces } from "@/lib/osm";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bbox = url.searchParams.get("bbox");
    const latParam = url.searchParams.get("lat");
    const lngParam = url.searchParams.get("lng");

    if (!bbox) {
      return Response.json({ places: [] });
    }

    const [west, south, east, north] = bbox.split(",").map(Number);
    const bias =
      latParam && lngParam
        ? {
            latitude: Number(latParam),
            longitude: Number(lngParam)
          }
        : undefined;

    const places = await fetchNearbyOsmPlaces({
      west,
      south,
      east,
      north,
      bias
    });

    return Response.json({ places });
  } catch {
    return Response.json({ places: [] });
  }
}
