import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { searchOsmSuggestions, fetchNearbyDiscoveredVenues } from "@/lib/osm";
import { checkDuplicatePlace } from "@/lib/admin-crud";
import { haversineKm } from "@/lib/place-utils";
import { type DiscoveredBusiness } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius");
  const query = searchParams.get("query")?.trim();

  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;
  const radius = radiusStr ? parseInt(radiusStr, 10) : 1000;

  try {
    let discovered: DiscoveredBusiness[] = [];

    if (query) {
      // Query-based discovery (Nominatim with location bias)
      const bias = lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null;
      const suggestions = await searchOsmSuggestions(query, bias);

      for (const item of suggestions) {
        if (!item.latitude || !item.longitude) continue;

        const distanceMeters =
          bias !== null
            ? Math.round(haversineKm(bias, { latitude: item.latitude, longitude: item.longitude }) * 1000)
            : undefined;

        const place = item.place;
        const name = place?.name || item.title;
        const category = place?.category || "Business";
        const address = place?.address || item.subtitle || "Address not listed";
        const city = place?.city || "";

        discovered.push({
          name,
          category,
          address,
          city,
          latitude: item.latitude,
          longitude: item.longitude,
          distanceMeters,
          phone: place?.phone,
          website: place?.website,
          hours: place?.hours,
          source: "nominatim",
          isAlreadyInMapify: false
        });
      }
    } else if (lat !== null && lng !== null) {
      // Coordinate-based nearby discovery using resilient Nominatim category queries & fallback
      const nearbyPlaces = await fetchNearbyDiscoveredVenues({
        latitude: lat,
        longitude: lng,
        radiusMeters: radius
      });

      for (const place of nearbyPlaces) {
        const distanceMeters = place.distanceKm ? Math.round(place.distanceKm * 1000) : undefined;

        discovered.push({
          name: place.name,
          category: place.category,
          address: place.address,
          city: place.city,
          latitude: place.latitude,
          longitude: place.longitude,
          distanceMeters,
          phone: place.phone,
          website: place.website,
          hours: place.hours,
          source: "nominatim",
          isAlreadyInMapify: false
        });
      }
    }

    // Sort closest first before duplicate checking
    discovered.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

    // Check against existing Mapify database to flag duplicates and existing venues
    const enriched: DiscoveredBusiness[] = await Promise.all(
      discovered.slice(0, 30).map(async (business) => {
        const dupCheck = await checkDuplicatePlace(
          business.name,
          business.latitude,
          business.longitude
        );

        if (dupCheck.exists && dupCheck.matches.length > 0) {
          return {
            ...business,
            isAlreadyInMapify: true,
            existingPlaceId: dupCheck.matches[0].id
          };
        }
        return business;
      })
    );

    return NextResponse.json({
      places: enriched
    });
  } catch (error) {
    console.error("Discovery failed:", error);
    return NextResponse.json(
      { error: "Unable to discover nearby businesses. Please check query or location." },
      { status: 500 }
    );
  }
}
