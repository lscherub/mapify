import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { searchOsmSuggestions, fetchNearbyOsmPlaces } from "@/lib/osm";
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
  const query = searchParams.get("query")?.trim();

  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;

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
      // Coordinate-based nearby discovery (Overpass API within ~800m)
      const latDelta = 0.007; // ~770m
      const lonDelta = 0.010; // ~700m-800m depending on latitude

      const bounds = {
        south: lat - latDelta,
        north: lat + latDelta,
        west: lng - lonDelta,
        east: lng + lonDelta,
        bias: { latitude: lat, longitude: lng }
      };

      const nearbyPlaces = await fetchNearbyOsmPlaces(bounds);

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
          source: "overpass",
          isAlreadyInMapify: false
        });
      }
    }

    // Check against existing Mapify database to flag duplicates and existing venues
    const enriched: DiscoveredBusiness[] = await Promise.all(
      discovered.slice(0, 25).map(async (business) => {
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

