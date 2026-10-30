import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCsv, stringifyCsv } from "@/lib/csv";
import { haversineKm } from "@/lib/place-utils";
import {
  adminPlaceSchema,
  adminPlaceFormSchema,
  type AdminPlaceValues
} from "@/lib/admin-places";
import {
  type Place,
  type AdminPlaceFormValues,
  type AdminWifiNetworkInput,
  type DuplicateCheckMatch
} from "@/lib/types";

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

export type FetchAdminPlacesOptions = {
  status?: "all" | "verified" | "unverified" | "archived";
  query?: string;
};

export async function fetchAdminPlaces(options?: FetchAdminPlacesOptions): Promise<Place[]> {
  const client = createSupabaseAdminClient();
  if (!client) return [];

  let query = client.from("places").select(`
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
      password,
      network_type,
      is_primary,
      access_type,
      instructions,
      notes,
      verified_at,
      verified_by,
      is_active,
      created_at
    )
  `).order("created_at", { ascending: false });

  if (options?.status === "archived") {
    query = query.eq("is_archived", true);
  } else if (options?.status === "verified") {
    query = query.eq("is_archived", false).not("verified_at", "is", null);
  } else if (options?.status === "unverified") {
    query = query.eq("is_archived", false).is("verified_at", null);
  }

  const { data, error } = await query;

  if (error || !data) {
    // If migration columns don't exist yet, fallback to base query gracefully
    const fallback = await client.from("places").select(`
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
    `).order("created_at", { ascending: false });

    if (fallback.error || !fallback.data) return [];
    return fallback.data.map(mapRowToPlace);
  }

  let mapped = data.map(mapRowToPlace);

  if (options?.query) {
    const q = options.query.trim().toLowerCase();
    mapped = mapped.filter((place) =>
      [place.name, place.category, place.address, place.city, place.slug]
        .filter(Boolean)
        .some((val) => val.toLowerCase().includes(q))
    );
  }

  return mapped;
}

export async function checkDuplicatePlace(
  name: string,
  latitude: number,
  longitude: number,
  excludeId?: string
): Promise<{ exists: boolean; matches: DuplicateCheckMatch[] }> {
  const client = createSupabaseAdminClient();
  if (!client) return { exists: false, matches: [] };

  const { data: places } = await client
    .from("places")
    .select("id, name, address, latitude, longitude, is_archived");

  if (!places || places.length === 0) {
    return { exists: false, matches: [] };
  }

  const targetName = name.trim().toLowerCase();
  const matches: DuplicateCheckMatch[] = [];

  for (const place of places) {
    if (excludeId && place.id === excludeId) continue;

    const placeLat = Number(place.latitude);
    const placeLng = Number(place.longitude);
    const distanceKm = haversineKm({ latitude, longitude }, { latitude: placeLat, longitude: placeLng });
    const distanceMeters = Math.round(distanceKm * 1000);
    const existingName = (place.name || "").trim().toLowerCase();

    const isExactName = existingName === targetName;
    const isCloseDistance = distanceMeters <= 250;
    const isVeryCloseDistance = distanceMeters <= 40;
    const nameOverlap =
      targetName.length > 3 &&
      (existingName.includes(targetName) || targetName.includes(existingName));

    if (isExactName || (isCloseDistance && nameOverlap) || isVeryCloseDistance) {
      matches.push({
        id: place.id,
        name: place.name,
        address: place.address,
        distanceMeters,
        isArchived: Boolean(place.is_archived)
      });
    }
  }

  return {
    exists: matches.length > 0,
    matches: matches.sort((a, b) => a.distanceMeters - b.distanceMeters)
  };
}

export async function createAdminPlace(
  values: AdminPlaceFormValues | AdminPlaceValues
): Promise<Place> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  // Determine whether values is full form or legacy
  const isMultiNetwork = "wifiNetworks" in values && Array.isArray(values.wifiNetworks);

  let validatedForm: AdminPlaceFormValues;
  if (isMultiNetwork) {
    validatedForm = adminPlaceFormSchema.parse(values);
  } else {
    const legacy = adminPlaceSchema.parse(values);
    validatedForm = {
      ...legacy,
      isArchived: false,
      seatingCapacity: null,
      noiseLevel: null,
      workNotes: "",
      comfortableSeating: false,
      limitedSeating: false,
      largeTables: false,
      smallTables: false,
      drinksAvailable: false,
      quietEnvironment: false,
      moderateNoise: false,
      livelyEnvironment: false,
      wifiNetworks: legacy.wifiSsid
        ? [
            {
              ssid: legacy.wifiSsid,
              password: legacy.wifiPassword || null,
              networkType: "primary",
              isPrimary: true,
              accessType: legacy.wifiFree ? "free" : "purchase_required",
              instructions: "",
              notes: "",
              isActive: true,
              verifiedAt: legacy.verifiedAt || new Date().toISOString().slice(0, 10),
              verifiedBy: legacy.verifiedBy || "Admin verified"
            }
          ]
        : []
    };
  }

  // Insert place row
  const { data: place, error: placeError } = await client
    .from("places")
    .insert({
      slug: validatedForm.slug,
      name: validatedForm.name,
      category: validatedForm.category,
      latitude: validatedForm.latitude,
      longitude: validatedForm.longitude,
      address: validatedForm.address,
      city: validatedForm.city,
      website: validatedForm.website || null,
      phone: validatedForm.phone || null,
      has_wifi: validatedForm.hasWifi,
      wifi_free: validatedForm.wifiFree,
      notes: validatedForm.notes || null,
      hours: validatedForm.hours || null,
      verified_at: validatedForm.verifiedAt || null,
      verified_by: validatedForm.verifiedBy || null,
      is_archived: validatedForm.isArchived ?? false,
      seating_capacity: validatedForm.seatingCapacity ?? null,
      noise_level: validatedForm.noiseLevel ?? null,
      work_notes: validatedForm.workNotes || null,
      power_outlets: validatedForm.powerOutlets,
      laptop_friendly: validatedForm.laptopFriendly,
      quiet: validatedForm.quiet,
      restrooms: validatedForm.restrooms,
      outdoor_seating: validatedForm.outdoorSeating,
      air_conditioning: validatedForm.airConditioning,
      wheelchair_accessible: validatedForm.wheelchairAccessible,
      food_available: validatedForm.foodAvailable,
      coffee_available: validatedForm.coffeeAvailable,
      comfortable_seating: validatedForm.comfortableSeating,
      limited_seating: validatedForm.limitedSeating,
      large_tables: validatedForm.largeTables,
      small_tables: validatedForm.smallTables,
      drinks_available: validatedForm.drinksAvailable,
      quiet_environment: validatedForm.quietEnvironment,
      moderate_noise: validatedForm.moderateNoise,
      lively_environment: validatedForm.livelyEnvironment
    })
    .select()
    .single();

  if (placeError) throw new Error(placeError.message);

  // Sync multi-network records
  if (validatedForm.wifiNetworks && validatedForm.wifiNetworks.length > 0) {
    const networkRows = validatedForm.wifiNetworks.map((net, index) => ({
      place_id: place.id,
      ssid: net.ssid,
      password: net.password || null,
      network_type: net.networkType || (index === 0 ? "primary" : "guest"),
      is_primary: Boolean(net.isPrimary),
      access_type: net.accessType || (validatedForm.wifiFree ? "free" : "purchase_required"),
      instructions: net.instructions || null,
      notes: net.notes || null,
      is_active: net.isActive !== false,
      verified_at: net.verifiedAt || validatedForm.verifiedAt || new Date().toISOString().slice(0, 10),
      verified_by: net.verifiedBy || validatedForm.verifiedBy || "Admin verified"
    }));

    const { error: netError } = await client.from("wifi_networks").insert(networkRows);
    if (netError) {
      console.error("Failed to insert wifi_networks:", netError);
    }
  }

  return mapRowToPlace(place);
}

export async function updateAdminPlace(
  id: string,
  values: AdminPlaceFormValues | AdminPlaceValues
): Promise<Place> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  const isMultiNetwork = "wifiNetworks" in values && Array.isArray(values.wifiNetworks);

  let validatedForm: AdminPlaceFormValues;
  if (isMultiNetwork) {
    validatedForm = adminPlaceFormSchema.parse(values);
  } else {
    const legacy = adminPlaceSchema.parse(values);
    validatedForm = {
      ...legacy,
      isArchived: false,
      seatingCapacity: null,
      noiseLevel: null,
      workNotes: "",
      comfortableSeating: false,
      limitedSeating: false,
      largeTables: false,
      smallTables: false,
      drinksAvailable: false,
      quietEnvironment: false,
      moderateNoise: false,
      livelyEnvironment: false,
      wifiNetworks: legacy.wifiSsid
        ? [
            {
              ssid: legacy.wifiSsid,
              password: legacy.wifiPassword || null,
              networkType: "primary",
              isPrimary: true,
              accessType: legacy.wifiFree ? "free" : "purchase_required",
              instructions: "",
              notes: "",
              isActive: true,
              verifiedAt: legacy.verifiedAt || new Date().toISOString().slice(0, 10),
              verifiedBy: legacy.verifiedBy || "Admin verified"
            }
          ]
        : []
    };
  }

  // Update place row
  const { data: place, error: placeError } = await client
    .from("places")
    .update({
      slug: validatedForm.slug,
      name: validatedForm.name,
      category: validatedForm.category,
      latitude: validatedForm.latitude,
      longitude: validatedForm.longitude,
      address: validatedForm.address,
      city: validatedForm.city,
      website: validatedForm.website || null,
      phone: validatedForm.phone || null,
      has_wifi: validatedForm.hasWifi,
      wifi_free: validatedForm.wifiFree,
      notes: validatedForm.notes || null,
      hours: validatedForm.hours || null,
      verified_at: validatedForm.verifiedAt || null,
      verified_by: validatedForm.verifiedBy || null,
      is_archived: validatedForm.isArchived ?? false,
      seating_capacity: validatedForm.seatingCapacity ?? null,
      noise_level: validatedForm.noiseLevel ?? null,
      work_notes: validatedForm.workNotes || null,
      power_outlets: validatedForm.powerOutlets,
      laptop_friendly: validatedForm.laptopFriendly,
      quiet: validatedForm.quiet,
      restrooms: validatedForm.restrooms,
      outdoor_seating: validatedForm.outdoorSeating,
      air_conditioning: validatedForm.airConditioning,
      wheelchair_accessible: validatedForm.wheelchairAccessible,
      food_available: validatedForm.foodAvailable,
      coffee_available: validatedForm.coffeeAvailable,
      comfortable_seating: validatedForm.comfortableSeating,
      limited_seating: validatedForm.limitedSeating,
      large_tables: validatedForm.largeTables,
      small_tables: validatedForm.smallTables,
      drinks_available: validatedForm.drinksAvailable,
      quiet_environment: validatedForm.quietEnvironment,
      moderate_noise: validatedForm.moderateNoise,
      lively_environment: validatedForm.livelyEnvironment
    })
    .eq("id", id)
    .select()
    .single();

  if (placeError) throw new Error(placeError.message);

  // Reconcile Wi-Fi networks safely
  // Fetch existing network IDs for this place
  const { data: existingNets } = await client
    .from("wifi_networks")
    .select("id")
    .eq("place_id", id);

  const existingIds = new Set((existingNets || []).map((n) => n.id));
  const currentNetworkIds = new Set(
    validatedForm.wifiNetworks.map((n) => n.id).filter(Boolean) as string[]
  );

  // Delete networks that were explicitly removed by the admin
  for (const existingId of existingIds) {
    if (!currentNetworkIds.has(existingId)) {
      await client.from("wifi_networks").delete().eq("id", existingId);
    }
  }

  // Upsert current networks
  for (const [index, net] of validatedForm.wifiNetworks.entries()) {
    const netPayload = {
      place_id: id,
      ssid: net.ssid,
      password: net.password || null,
      network_type: net.networkType || (index === 0 ? "primary" : "guest"),
      is_primary: Boolean(net.isPrimary),
      access_type: net.accessType || (validatedForm.wifiFree ? "free" : "purchase_required"),
      instructions: net.instructions || null,
      notes: net.notes || null,
      is_active: net.isActive !== false,
      verified_at: net.verifiedAt || validatedForm.verifiedAt || new Date().toISOString().slice(0, 10),
      verified_by: net.verifiedBy || validatedForm.verifiedBy || "Admin verified"
    };

    if (net.id && existingIds.has(net.id)) {
      await client.from("wifi_networks").update(netPayload).eq("id", net.id);
    } else {
      await client.from("wifi_networks").insert(netPayload);
    }
  }

  return mapRowToPlace(place);
}

export async function archiveAdminPlace(id: string): Promise<void> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  const { error } = await client
    .from("places")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function unarchiveAdminPlace(id: string): Promise<void> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  const { error } = await client
    .from("places")
    .update({ is_archived: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteAdminPlace(id: string, permanent = false): Promise<void> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Missing Supabase service role key");

  if (!permanent) {
    // Default safe soft delete
    return archiveAdminPlace(id);
  }

  // Permanent destructive delete
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
  const wifiRows = Array.isArray(row.wifi_networks)
    ? (row.wifi_networks as Array<Record<string, unknown>>)
    : [];

  const wifiNetworks = wifiRows.map((wifi) => ({
    id: String(wifi.id),
    ssid: String(wifi.ssid),
    password: wifi.password ? String(wifi.password) : null,
    networkType: wifi.network_type ? String(wifi.network_type) : "primary",
    isPrimary: Boolean(wifi.is_primary),
    accessType: (wifi.access_type as any) ?? "free",
    instructions: wifi.instructions ? String(wifi.instructions) : null,
    notes: wifi.notes ? String(wifi.notes) : null,
    verifiedAt: wifi.verified_at ? String(wifi.verified_at) : undefined,
    verifiedBy: wifi.verified_by ? String(wifi.verified_by) : undefined,
    isActive: wifi.is_active !== false,
    createdAt: wifi.created_at ? String(wifi.created_at) : undefined
  }));

  const hasWifiNetwork = wifiNetworks.filter((n) => n.isActive).length > 0;

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
    isArchived: Boolean(row.is_archived),
    seatingCapacity: row.seating_capacity ? Number(row.seating_capacity) : null,
    noiseLevel: (row.noise_level as any) ?? null,
    workNotes: row.work_notes ? String(row.work_notes) : undefined,
    wifiNetworks,
    amenities: {
      powerOutlets: Boolean(row.power_outlets),
      laptopFriendly: Boolean(row.laptop_friendly),
      quiet: Boolean(row.quiet || row.quiet_environment),
      restrooms: Boolean(row.restrooms),
      outdoorSeating: Boolean(row.outdoor_seating),
      airConditioning: Boolean(row.air_conditioning),
      wheelchairAccessible: Boolean(row.wheelchair_accessible),
      foodAvailable: Boolean(row.food_available),
      coffeeAvailable: Boolean(row.coffee_available || row.drinks_available),
      comfortableSeating: Boolean(row.comfortable_seating),
      limitedSeating: Boolean(row.limited_seating),
      largeTables: Boolean(row.large_tables),
      smallTables: Boolean(row.small_tables),
      drinksAvailable: Boolean(row.drinks_available || row.coffee_available),
      quietEnvironment: Boolean(row.quiet_environment || row.quiet),
      moderateNoise: Boolean(row.moderate_noise),
      livelyEnvironment: Boolean(row.lively_environment),
      freeWifi: Boolean(row.wifi_free),
      paidWifi: Boolean(row.has_wifi && !row.wifi_free)
    },
    photos: []
  };
}
