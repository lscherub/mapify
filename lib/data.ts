import { demoPlaces } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type Place } from "@/lib/types";

// Public places query: omits wifi passwords to prevent sensitive credentials from leaking in HTML or bundles
export async function getPlaces(): Promise<Place[]> {
  const client = await createSupabaseServerClient();

  if (!client) {
    return sanitizePlaces(demoPlaces);
  }

  try {
    const { data, error } = await client
      .from("places")
      .select(`
        id,
        slug,
        name,
        category,
        latitude,
        longitude,
        address,
        city,
        website,
        phone,
        has_wifi,
        wifi_free,
        notes,
        hours,
        verified_at,
        verified_by,
        is_archived,
        seating_capacity,
        noise_level,
        work_notes,
        power_outlets,
        laptop_friendly,
        quiet,
        restrooms,
        outdoor_seating,
        air_conditioning,
        wheelchair_accessible,
        food_available,
        coffee_available,
        comfortable_seating,
        limited_seating,
        large_tables,
        small_tables,
        drinks_available,
        quiet_environment,
        moderate_noise,
        lively_environment,
        wifi_networks (
          id,
          ssid,
          network_type,
          is_primary,
          access_type,
          instructions,
          is_active,
          verified_at,
          verified_by
        ),
        photos (
          id,
          url,
          alt
        )
      `)
      .or("is_archived.is.null,is_archived.eq.false");

    if (error || !data?.length) {
      // Fallback query if migration columns are not yet in the remote database
      const fallback = await client
        .from("places")
        .select(`
          id,
          slug,
          name,
          category,
          latitude,
          longitude,
          address,
          city,
          website,
          phone,
          has_wifi,
          wifi_free,
          notes,
          hours,
          verified_at,
          verified_by,
          power_outlets,
          laptop_friendly,
          quiet,
          restrooms,
          outdoor_seating,
          air_conditioning,
          wheelchair_accessible,
          food_available,
          coffee_available,
          wifi_networks (
            id,
            ssid,
            verified_at,
            verified_by
          ),
          photos (
            id,
            url,
            alt
          )
        `);

      if (fallback.error || !fallback.data?.length) {
        return sanitizePlaces(demoPlaces);
      }
      return mapRawPlaces(fallback.data);
    }

    return mapRawPlaces(data);
  } catch {
    return sanitizePlaces(demoPlaces);
  }
}

function mapRawPlaces(data: Array<Record<string, any>>): Place[] {
  return data.map((place) => {
    const rawNetworks = Array.isArray(place.wifi_networks)
      ? place.wifi_networks.filter((n: any) => n.is_active !== false)
      : [];

    const wifiNetworks = rawNetworks.map((network: any, idx: number) => ({
      id: network.id,
      ssid: network.ssid,
      password: null, // Always null on public load
      networkType: network.network_type || (idx === 0 ? "primary" : "guest"),
      isPrimary: Boolean(network.is_primary ?? (idx === 0)),
      accessType: network.access_type || (place.wifi_free ? "free" : "purchase_required"),
      instructions: network.instructions || undefined,
      verifiedAt: network.verified_at,
      verifiedBy: network.verified_by,
      isActive: true
    }));

    return {
      id: place.id,
      slug: place.slug,
      name: place.name,
      category: place.category,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      address: place.address,
      city: place.city ?? "",
      website: place.website ?? undefined,
      phone: place.phone ?? undefined,
      hasWifi: Boolean(place.has_wifi),
      wifiFree: Boolean(place.wifi_free),
      notes: place.notes ?? undefined,
      hours: place.hours ?? undefined,
      verifiedAt: place.verified_at ?? undefined,
      verifiedBy: place.verified_by ?? undefined,
      source: "database",
      wifiMessage: wifiNetworks.length ? undefined : "Wi-Fi information is currently under review.",
      isArchived: Boolean(place.is_archived),
      seatingCapacity: place.seating_capacity ? Number(place.seating_capacity) : null,
      noiseLevel: place.noise_level ?? null,
      workNotes: place.work_notes ?? undefined,
      amenities: {
        powerOutlets: Boolean(place.power_outlets),
        laptopFriendly: Boolean(place.laptop_friendly),
        quiet: Boolean(place.quiet || place.quiet_environment),
        restrooms: Boolean(place.restrooms),
        outdoorSeating: Boolean(place.outdoor_seating),
        airConditioning: Boolean(place.air_conditioning),
        wheelchairAccessible: Boolean(place.wheelchair_accessible),
        foodAvailable: Boolean(place.food_available),
        coffeeAvailable: Boolean(place.coffee_available || place.drinks_available),
        comfortableSeating: Boolean(place.comfortable_seating),
        limitedSeating: Boolean(place.limited_seating),
        largeTables: Boolean(place.large_tables),
        smallTables: Boolean(place.small_tables),
        drinksAvailable: Boolean(place.drinks_available || place.coffee_available),
        quietEnvironment: Boolean(place.quiet_environment || place.quiet),
        moderateNoise: Boolean(place.moderate_noise),
        livelyEnvironment: Boolean(place.lively_environment),
        freeWifi: Boolean(place.wifi_free),
        paidWifi: Boolean(place.has_wifi && !place.wifi_free)
      },
      wifiNetworks,
      photos: Array.isArray(place.photos)
        ? place.photos.map((photo: any) => ({
            id: photo.id,
            url: photo.url,
            alt: photo.alt
          }))
        : []
    };
  });
}

function sanitizePlaces(places: Place[]): Place[] {
  return places
    .filter((place) => !place.isArchived)
    .map((place) => ({
      ...place,
      wifiNetworks: place.wifiNetworks.map((network) => ({
        ...network,
        password: null
      }))
    }));
}
