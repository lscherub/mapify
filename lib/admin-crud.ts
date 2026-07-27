import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCsv, stringifyCsv } from "@/lib/csv";
import { adminPlaceSchema, adminValuesToPlacePayload, type AdminPlaceValues } from "@/lib/admin-places";
import { type Place } from "@/lib/types";

const CSV_HEADERS = [
  "slug",
  "name",
  "category",
  "latitude",
  "longitude",
  "address",
  "city",
  "website",
  "phone",
  "hasWifi",
  "wifiFree",
  "notes",
  "hours",
  "verifiedAt",
  "verifiedBy",
  "powerOutlets",
  "laptopFriendly",
  "quiet",
  "restrooms",
  "outdoorSeating",
  "airConditioning",
  "wheelchairAccessible",
  "foodAvailable",
  "coffeeAvailable",
  "wifiSsid",
  "wifiPassword"
];

export async function fetchAdminPlaces() {
  const client = createSupabaseAdminClient();
  if (!client) return [];

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
    )
  `);

  if (error || !data) return [];
  return data.map(mapRowToPlace);
}

export async function createAdminPlace(values: AdminPlaceValues) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  const parsed = adminPlaceSchema.parse(values);
  const payload = adminValuesToPlacePayload(parsed);

  const { data: place, error: placeError } = await client
    .from("places")
    .insert({
      slug: payload.slug,
      name: payload.name,
      category: payload.category,
      latitude: payload.latitude,
      longitude: payload.longitude,
      address: payload.address,
      city: payload.city,
      website: payload.website,
      phone: payload.phone,
      has_wifi: payload.has_wifi,
      wifi_free: payload.wifi_free,
      notes: payload.notes,
      hours: payload.hours,
      verified_at: payload.verified_at,
      verified_by: payload.verified_by,
      power_outlets: payload.power_outlets,
      laptop_friendly: payload.laptop_friendly,
      quiet: payload.quiet,
      restrooms: payload.restrooms,
      outdoor_seating: payload.outdoor_seating,
      air_conditioning: payload.air_conditioning,
      wheelchair_accessible: payload.wheelchair_accessible,
      food_available: payload.food_available,
      coffee_available: payload.coffee_available
    })
    .select()
    .single();

  if (placeError) throw new Error(placeError.message);

  await syncWifiNetwork(client, place.id, parsed);
  return place;
}

export async function updateAdminPlace(id: string, values: AdminPlaceValues) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  const parsed = adminPlaceSchema.parse(values);
  const payload = adminValuesToPlacePayload(parsed, id);

  const { data: place, error: placeError } = await client
    .from("places")
    .update({
      slug: payload.slug,
      name: payload.name,
      category: payload.category,
      latitude: payload.latitude,
      longitude: payload.longitude,
      address: payload.address,
      city: payload.city,
      website: payload.website,
      phone: payload.phone,
      has_wifi: payload.has_wifi,
      wifi_free: payload.wifi_free,
      notes: payload.notes,
      hours: payload.hours,
      verified_at: payload.verified_at,
      verified_by: payload.verified_by,
      power_outlets: payload.power_outlets,
      laptop_friendly: payload.laptop_friendly,
      quiet: payload.quiet,
      restrooms: payload.restrooms,
      outdoor_seating: payload.outdoor_seating,
      air_conditioning: payload.air_conditioning,
      wheelchair_accessible: payload.wheelchair_accessible,
      food_available: payload.food_available,
      coffee_available: payload.coffee_available
    })
    .eq("id", id)
    .select()
    .single();

  if (placeError) throw new Error(placeError.message);

  await client.from("wifi_networks").delete().eq("place_id", id);
  await syncWifiNetwork(client, id, parsed);
  return place;
}

export async function deleteAdminPlace(id: string) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  const { error } = await client.from("places").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function exportPlacesToCsv(places: Place[]) {
  const rows = [
    CSV_HEADERS,
    ...places.map((place) => [
      place.slug,
      place.name,
      place.category,
      String(place.latitude),
      String(place.longitude),
      place.address,
      place.city,
      place.website ?? "",
      place.phone ?? "",
      String(place.hasWifi),
      String(place.wifiFree),
      place.notes ?? "",
      place.hours ?? "",
      place.verifiedAt ?? "",
      place.verifiedBy ?? "",
      String(place.amenities.powerOutlets),
      String(place.amenities.laptopFriendly),
      String(place.amenities.quiet),
      String(place.amenities.restrooms),
      String(place.amenities.outdoorSeating),
      String(place.amenities.airConditioning),
      String(place.amenities.wheelchairAccessible),
      String(place.amenities.foodAvailable),
      String(place.amenities.coffeeAvailable),
      place.wifiNetworks[0]?.ssid ?? "",
      place.wifiNetworks[0]?.password ?? ""
    ])
  ];

  return stringifyCsv(rows);
}

export function importPlacesFromCsv(text: string) {
  const rows = parseCsv(text);
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map((entry) => entry.trim());
  return dataRows.map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    return adminPlaceSchema.parse({
      slug: record.slug,
      name: record.name,
      category: record.category,
      latitude: record.latitude,
      longitude: record.longitude,
      address: record.address,
      city: record.city,
      website: record.website,
      phone: record.phone,
      hasWifi: record.hasWifi,
      wifiFree: record.wifiFree,
      notes: record.notes,
      hours: record.hours,
      verifiedAt: record.verifiedAt,
      verifiedBy: record.verifiedBy,
      powerOutlets: record.powerOutlets,
      laptopFriendly: record.laptopFriendly,
      quiet: record.quiet,
      restrooms: record.restrooms,
      outdoorSeating: record.outdoorSeating,
      airConditioning: record.airConditioning,
      wheelchairAccessible: record.wheelchairAccessible,
      foodAvailable: record.foodAvailable,
      coffeeAvailable: record.coffeeAvailable,
      wifiSsid: record.wifiSsid,
      wifiPassword: record.wifiPassword
    });
  });
}

function mapRowToPlace(row: Record<string, unknown>): Place {
  const wifi = Array.isArray(row.wifi_networks) ? (row.wifi_networks[0] as Record<string, unknown> | undefined) : undefined;
  const hasWifiNetwork = Array.isArray(row.wifi_networks) && row.wifi_networks.length > 0;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    category: String(row.category),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    address: String(row.address),
    city: String(row.city ?? ""),
    website: row.website ? String(row.website) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    hasWifi: Boolean(row.has_wifi),
    wifiFree: Boolean(row.wifi_free),
    notes: row.notes ? String(row.notes) : undefined,
    hours: row.hours ? String(row.hours) : undefined,
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    verifiedBy: row.verified_by ? String(row.verified_by) : undefined,
    source: "database",
    wifiMessage: hasWifiNetwork ? undefined : "Wi-Fi information is currently under review.",
    wifiNetworks: wifi
      ? [
          {
            id: String(wifi.id),
            ssid: String(wifi.ssid),
            password: wifi.password ? String(wifi.password) : null,
            verifiedAt: String(wifi.verified_at ?? ""),
            verifiedBy: String(wifi.verified_by ?? "")
          }
        ]
      : [],
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

async function syncWifiNetwork(client: ReturnType<typeof createSupabaseAdminClient>, placeId: string, values: AdminPlaceValues) {
  if (!client) throw new Error("Missing Supabase service role key");

  if (!values.wifiSsid && !values.wifiPassword) return;

  const { error } = await client.from("wifi_networks").insert({
    place_id: placeId,
    ssid: values.wifiSsid || "WiFi",
    password: values.wifiPassword || null,
    verified_at: values.verifiedAt || new Date().toISOString().slice(0, 10),
    verified_by: values.verifiedBy || "Admin verified"
  });

  if (error) throw new Error(error.message);
}
