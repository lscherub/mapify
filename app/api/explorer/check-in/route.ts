import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { haversineKm } from "@/lib/place-utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type Place } from "@/lib/types";

// Max check-in distance: 100 meters (with slight 25m GPS tolerance buffer for mobile accuracy = 125m)
const MAX_CHECKIN_DISTANCE_METERS = 125;

const checkInSchema = z.object({
  userLat: z.number().min(-90).max(90),
  userLng: z.number().min(-180).max(180),
  venueLat: z.number().min(-90).max(90),
  venueLng: z.number().min(-180).max(180),
  venueId: z.string().min(1),
  venueName: z.string().min(1),
  venueCategory: z.string().optional().nullable(),
  venueAddress: z.string().optional().nullable(),
  venueCity: z.string().optional().nullable(),
  venueWebsite: z.string().optional().nullable(),
  venuePhone: z.string().optional().nullable(),
  explorerId: z.string().optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid check-in parameters", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      userLat,
      userLng,
      venueLat,
      venueLng,
      venueId,
      venueName,
      venueCategory,
      venueAddress,
      venueCity,
      venueWebsite,
      venuePhone,
      explorerId
    } = parsed.data;

    // 1. Proximity Verification
    const distanceKm = haversineKm(
      { latitude: userLat, longitude: userLng },
      { latitude: venueLat, longitude: venueLng }
    );
    const distanceMeters = Math.round(distanceKm * 1000);

    if (distanceMeters > MAX_CHECKIN_DISTANCE_METERS) {
      return NextResponse.json({
        authorized: false,
        distanceMeters,
        maxDistanceMeters: 100,
        message: `You are ${distanceMeters}m away from ${venueName}. Please move within 100m to check in and collect it!`
      });
    }

    const client = createSupabaseAdminClient();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(venueId);

    let canonicalPlace: Place | null = null;
    let isNewCanonicalPlace = false;

    if (client) {
      // 2. Check if place already exists in canonical database
      if (isUUID) {
        const { data: existing } = await client
          .from("places")
          .select("*")
          .eq("id", venueId)
          .maybeSingle();

        if (existing) {
          canonicalPlace = formatDbPlace(existing);
        }
      }

      // If not found by direct ID, search for existing place by coordinate proximity <= 45m and name match
      if (!canonicalPlace) {
        const targetName = venueName.trim().toLowerCase();
        const delta = 0.005; // ~500m bounding box query
        const { data: nearbyPlaces } = await client
          .from("places")
          .select("*")
          .gte("latitude", venueLat - delta)
          .lte("latitude", venueLat + delta)
          .gte("longitude", venueLng - delta)
          .lte("longitude", venueLng + delta);

        if (Array.isArray(nearbyPlaces)) {
          for (const row of nearbyPlaces) {
            const dist = haversineKm(
              { latitude: venueLat, longitude: venueLng },
              { latitude: Number(row.latitude), longitude: Number(row.longitude) }
            );
            if (dist * 1000 <= 45) {
              const rowName = (row.name || "").trim().toLowerCase();
              if (
                rowName === targetName ||
                (targetName.length > 3 && (rowName.includes(targetName) || targetName.includes(rowName)))
              ) {
                canonicalPlace = formatDbPlace(row);
                break;
              }
            }
          }
        }
      }

      // 3. If external POI is not yet in canonical database, create canonical venue in public.places
      if (!canonicalPlace) {
        const baseSlug =
          venueName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 35) || "spot";
        const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

        const { data: newRow, error: insertError } = await client
          .from("places")
          .insert({
            slug: uniqueSlug,
            name: venueName,
            category: venueCategory || "Cafe",
            latitude: venueLat,
            longitude: venueLng,
            address: venueAddress || "Address not listed",
            city: venueCity || "",
            website: venueWebsite || null,
            phone: venuePhone || null,
            has_wifi: false,
            wifi_free: false,
            notes: "Discovered and collected via Mapify Explorer.",
            verified_by: "Explorer Discovery"
          })
          .select()
          .single();

        if (!insertError && newRow) {
          canonicalPlace = formatDbPlace(newRow);
          isNewCanonicalPlace = true;
        }
      }

      // 4. Record collection in Supabase explorer_collections if explorerId provided
      if (canonicalPlace && explorerId) {
        try {
          await client.from("explorer_collections").insert({
            explorer_id: explorerId,
            place_id: canonicalPlace.id,
            place_name: canonicalPlace.name,
            category: canonicalPlace.category,
            address: canonicalPlace.address,
            city: canonicalPlace.city,
            latitude: canonicalPlace.latitude,
            longitude: canonicalPlace.longitude,
            notes: "Discovered via Explorer check-in."
          });
        } catch {
          // Ignore unique constraint collision or if tables not yet populated
        }
      }
    }

    // Fallback if running offline / without Supabase: generate clean place representation
    if (!canonicalPlace) {
      canonicalPlace = {
        id: isUUID ? venueId : `place-${Math.random().toString(36).slice(2, 10)}`,
        slug: `place-${Math.random().toString(36).slice(2, 10)}`,
        name: venueName,
        category: venueCategory || "Cafe",
        latitude: venueLat,
        longitude: venueLng,
        address: venueAddress || "Address not listed",
        city: venueCity || "",
        website: venueWebsite || undefined,
        phone: venuePhone || undefined,
        source: "database",
        hasWifi: false,
        wifiFree: false,
        wifiNetworks: [],
        amenities: {
          powerOutlets: false,
          laptopFriendly: false,
          quiet: false,
          restrooms: false,
          outdoorSeating: false,
          airConditioning: false,
          wheelchairAccessible: false,
          foodAvailable: false,
          coffeeAvailable: false
        },
        photos: []
      };
    }

    return NextResponse.json({
      authorized: true,
      distanceMeters,
      maxDistanceMeters: 100,
      canonicalPlace,
      canonicalPlaceId: canonicalPlace.id,
      isNewCanonicalPlace,
      message: `Proximity verified! Collected ${venueName}.`
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify check-in proximity" },
      { status: 500 }
    );
  }
}

function formatDbPlace(row: any): Place {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    address: row.address,
    city: row.city,
    website: row.website || undefined,
    phone: row.phone || undefined,
    hasWifi: Boolean(row.has_wifi),
    wifiFree: Boolean(row.wifi_free),
    notes: row.notes || undefined,
    hours: row.hours || undefined,
    verifiedAt: row.verified_at || undefined,
    verifiedBy: row.verified_by || undefined,
    source: "database",
    wifiNetworks: [],
    amenities: {
      powerOutlets: Boolean(row.power_outlets),
      laptopFriendly: Boolean(row.laptop_friendly),
      quiet: Boolean(row.quiet),
      restrooms: Boolean(row.restrooms),
      outdoorSeating: Boolean(row.outdoor_seating),
      airConditioning: Boolean(row.air_conditioning),
      wheelchairAccessible: Boolean(row.wheelchair_accessible),
      foodAvailable: Boolean(row.food_available),
      coffeeAvailable: Boolean(row.coffee_available)
    },
    photos: []
  };
}
