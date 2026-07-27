import { demoPlaces } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type Place } from "@/lib/types";

export async function getPlaces(): Promise<Place[]> {
  const client = createSupabaseServerClient();

  if (!client) return demoPlaces;

  try {
    const { data, error } = await client.from("places").select(`
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
        password,
        verified_at,
        verified_by
      ),
      photos (
        id,
        url,
        alt
      )
    `);

    if (error || !data?.length) return demoPlaces;

    return data.map((place) => ({
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
      wifiMessage: place.wifi_networks?.length ? undefined : "Wi-Fi information is currently under review.",
      amenities: {
        powerOutlets: Boolean(place.power_outlets),
        laptopFriendly: Boolean(place.laptop_friendly),
        quiet: Boolean(place.quiet),
        restrooms: Boolean(place.restrooms),
        outdoorSeating: Boolean(place.outdoor_seating),
        airConditioning: Boolean(place.air_conditioning),
        wheelchairAccessible: Boolean(place.wheelchair_accessible),
        foodAvailable: Boolean(place.food_available),
        coffeeAvailable: Boolean(place.coffee_available)
      },
      wifiNetworks: Array.isArray(place.wifi_networks)
        ? place.wifi_networks.map((network) => ({
            id: network.id,
            ssid: network.ssid,
            password: network.password ?? null,
            verifiedAt: network.verified_at,
            verifiedBy: network.verified_by
          }))
        : [],
      photos: Array.isArray(place.photos)
        ? place.photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            alt: photo.alt
          }))
        : []
    }));
  } catch {
    return demoPlaces;
  }
}
