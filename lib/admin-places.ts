import { z } from "zod";
import { type Place, type AdminPlaceFormValues, type AdminWifiNetworkInput } from "@/lib/types";

export const adminWifiNetworkSchema = z.object({
  id: z.string().optional(),
  ssid: z.string().min(1, "SSID is required"),
  password: z.string().nullable().optional(),
  networkType: z.string().default("primary"),
  isPrimary: z.boolean().default(false),
  accessType: z.enum(["free", "paid", "purchase_required", "customers_only", "unknown", "none"]).default("free"),
  instructions: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  verificationStatus: z.enum(["unverified", "pending", "verified", "rejected", "expired"]).default("unverified"),
  verificationNotes: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  downloadMbps: z.coerce.number().nullable().optional(),
  uploadMbps: z.coerce.number().nullable().optional(),
  latencyMs: z.coerce.number().nullable().optional(),
  jitterMs: z.coerce.number().nullable().optional(),
  speedTestedAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true)
});

export const adminPlaceFormSchema = z.object({
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  address: z.string().min(2, "Address is required"),
  city: z.string().min(2, "City is required"),
  website: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  hasWifi: z.coerce.boolean(),
  wifiFree: z.coerce.boolean(),
  notes: z.string().optional().or(z.literal("")),
  hours: z.string().optional().or(z.literal("")),
  verifiedAt: z.string().optional().or(z.literal("")),
  verifiedBy: z.string().optional().or(z.literal("")),
  isArchived: z.coerce.boolean().default(false),
  seatingCapacity: z.coerce.number().nullable().optional(),
  noiseLevel: z.enum(["quiet", "moderate", "lively"]).nullable().optional(),
  workNotes: z.string().optional().or(z.literal("")),
  // Amenities
  powerOutlets: z.coerce.boolean().default(false),
  laptopFriendly: z.coerce.boolean().default(false),
  quiet: z.coerce.boolean().default(false),
  restrooms: z.coerce.boolean().default(false),
  outdoorSeating: z.coerce.boolean().default(false),
  airConditioning: z.coerce.boolean().default(false),
  wheelchairAccessible: z.coerce.boolean().default(false),
  foodAvailable: z.coerce.boolean().default(false),
  coffeeAvailable: z.coerce.boolean().default(false),
  comfortableSeating: z.coerce.boolean().default(false),
  limitedSeating: z.coerce.boolean().default(false),
  largeTables: z.coerce.boolean().default(false),
  smallTables: z.coerce.boolean().default(false),
  drinksAvailable: z.coerce.boolean().default(false),
  quietEnvironment: z.coerce.boolean().default(false),
  moderateNoise: z.coerce.boolean().default(false),
  livelyEnvironment: z.coerce.boolean().default(false),
  wifiNetworks: z.array(adminWifiNetworkSchema).default([])
});

// Legacy single-network schema for backward compatibility with CSV imports
export const adminPlaceSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  address: z.string().min(2),
  city: z.string().min(2),
  website: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  hasWifi: z.coerce.boolean(),
  wifiFree: z.coerce.boolean(),
  notes: z.string().optional().or(z.literal("")),
  hours: z.string().optional().or(z.literal("")),
  verifiedAt: z.string().optional().or(z.literal("")),
  verifiedBy: z.string().optional().or(z.literal("")),
  powerOutlets: z.coerce.boolean(),
  laptopFriendly: z.coerce.boolean(),
  quiet: z.coerce.boolean(),
  restrooms: z.coerce.boolean(),
  outdoorSeating: z.coerce.boolean(),
  airConditioning: z.coerce.boolean(),
  wheelchairAccessible: z.coerce.boolean(),
  foodAvailable: z.coerce.boolean(),
  coffeeAvailable: z.coerce.boolean(),
  wifiSsid: z.string().optional().or(z.literal("")),
  wifiPassword: z.string().optional().or(z.literal(""))
});

export type AdminPlaceValues = z.infer<typeof adminPlaceSchema>;

export function generateSlug(name: string, city?: string): string {
  const base = `${name} ${city || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "venue"}-${Math.random().toString(36).substring(2, 7)}`;
}

export function emptyAdminFormValues(): AdminPlaceFormValues {
  return {
    slug: "",
    name: "",
    category: "Cafe",
    latitude: 49.2827,
    longitude: -123.1207,
    address: "",
    city: "Vancouver",
    website: "",
    phone: "",
    hasWifi: false,
    wifiFree: false,
    notes: "",
    hours: "",
    verifiedAt: "",
    verifiedBy: "Admin verified",
    isArchived: false,
    seatingCapacity: null,
    noiseLevel: null,
    workNotes: "",
    powerOutlets: false,
    laptopFriendly: false,
    quiet: false,
    restrooms: false,
    outdoorSeating: false,
    airConditioning: false,
    wheelchairAccessible: false,
    foodAvailable: false,
    coffeeAvailable: false,
    comfortableSeating: false,
    limitedSeating: false,
    largeTables: false,
    smallTables: false,
    drinksAvailable: false,
    quietEnvironment: false,
    moderateNoise: false,
    livelyEnvironment: false,
    wifiNetworks: []
  };
}

export function emptyWifiNetworkInput(): AdminWifiNetworkInput {
  return {
    ssid: "",
    password: "",
    networkType: "primary",
    isPrimary: true,
    accessType: "free",
    instructions: "",
    notes: "",
    verificationStatus: "unverified",
    verificationNotes: "",
    verifiedAt: "",
    verifiedBy: "Admin verified",
    downloadMbps: null,
    uploadMbps: null,
    latencyMs: null,
    jitterMs: null,
    speedTestedAt: null,
    isActive: true
  };
}

export function emptyAdminValues(): AdminPlaceValues {
  return {
    slug: "",
    name: "",
    category: "Cafe",
    latitude: 49.2827,
    longitude: -123.1207,
    address: "",
    city: "Vancouver",
    website: "",
    phone: "",
    hasWifi: true,
    wifiFree: true,
    notes: "",
    hours: "",
    verifiedAt: "",
    verifiedBy: "Admin verified",
    powerOutlets: true,
    laptopFriendly: true,
    quiet: false,
    restrooms: true,
    outdoorSeating: false,
    airConditioning: true,
    wheelchairAccessible: true,
    foodAvailable: true,
    coffeeAvailable: true,
    wifiSsid: "",
    wifiPassword: ""
  };
}

export function placeToAdminFormValues(place: Place): AdminPlaceFormValues {
  return {
    slug: place.slug,
    name: place.name,
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
    city: place.city,
    website: place.website ?? "",
    phone: place.phone ?? "",
    hasWifi: place.hasWifi,
    wifiFree: place.wifiFree,
    notes: place.notes ?? "",
    hours: place.hours ?? "",
    verifiedAt: place.verifiedAt ?? "",
    verifiedBy: place.verifiedBy ?? "",
    isArchived: Boolean(place.isArchived),
    seatingCapacity: place.seatingCapacity ?? null,
    noiseLevel: place.noiseLevel ?? null,
    workNotes: place.workNotes ?? "",
    powerOutlets: Boolean(place.amenities.powerOutlets),
    laptopFriendly: Boolean(place.amenities.laptopFriendly),
    quiet: Boolean(place.amenities.quiet || place.amenities.quietEnvironment),
    restrooms: Boolean(place.amenities.restrooms),
    outdoorSeating: Boolean(place.amenities.outdoorSeating),
    airConditioning: Boolean(place.amenities.airConditioning),
    wheelchairAccessible: Boolean(place.amenities.wheelchairAccessible),
    foodAvailable: Boolean(place.amenities.foodAvailable),
    coffeeAvailable: Boolean(place.amenities.coffeeAvailable || place.amenities.drinksAvailable),
    comfortableSeating: Boolean(place.amenities.comfortableSeating),
    limitedSeating: Boolean(place.amenities.limitedSeating),
    largeTables: Boolean(place.amenities.largeTables),
    smallTables: Boolean(place.amenities.smallTables),
    drinksAvailable: Boolean(place.amenities.drinksAvailable || place.amenities.coffeeAvailable),
    quietEnvironment: Boolean(place.amenities.quietEnvironment || place.amenities.quiet),
    moderateNoise: Boolean(place.amenities.moderateNoise),
    livelyEnvironment: Boolean(place.amenities.livelyEnvironment),
    wifiNetworks: place.wifiNetworks.map((net, index) => ({
      id: net.id,
      ssid: net.ssid,
      password: net.password ?? "",
      networkType: net.networkType ?? (index === 0 ? "primary" : "guest"),
      isPrimary: Boolean(net.isPrimary ?? (index === 0)),
      accessType: net.accessType ?? (place.wifiFree ? "free" : "purchase_required"),
      instructions: net.instructions ?? "",
      notes: net.notes ?? "",
      verificationStatus: net.verificationStatus ?? (net.verifiedAt ? "verified" : "unverified"),
      verificationNotes: net.verificationNotes ?? "",
      verifiedAt: net.verifiedAt ?? place.verifiedAt ?? "",
      verifiedBy: net.verifiedBy ?? place.verifiedBy ?? "Admin verified",
      downloadMbps: net.downloadMbps ?? null,
      uploadMbps: net.uploadMbps ?? null,
      latencyMs: net.latencyMs ?? null,
      jitterMs: net.jitterMs ?? null,
      speedTestedAt: net.speedTestedAt ?? null,
      isActive: net.isActive !== false
    }))
  };
}

export function placeToAdminValues(place: Place): AdminPlaceValues {
  return {
    slug: place.slug,
    name: place.name,
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
    city: place.city,
    website: place.website ?? "",
    phone: place.phone ?? "",
    hasWifi: place.hasWifi,
    wifiFree: place.wifiFree,
    notes: place.notes ?? "",
    hours: place.hours ?? "",
    verifiedAt: place.verifiedAt ?? "",
    verifiedBy: place.verifiedBy ?? "",
    powerOutlets: place.amenities.powerOutlets,
    laptopFriendly: place.amenities.laptopFriendly,
    quiet: place.amenities.quiet,
    restrooms: place.amenities.restrooms,
    outdoorSeating: place.amenities.outdoorSeating,
    airConditioning: place.amenities.airConditioning,
    wheelchairAccessible: place.amenities.wheelchairAccessible,
    foodAvailable: place.amenities.foodAvailable,
    coffeeAvailable: place.amenities.coffeeAvailable,
    wifiSsid: place.wifiNetworks[0]?.ssid ?? "",
    wifiPassword: place.wifiNetworks[0]?.password ?? ""
  };
}

export function adminValuesToPlacePayload(values: AdminPlaceValues, existingId?: string) {
  return {
    id: existingId,
    slug: values.slug,
    name: values.name,
    category: values.category,
    latitude: values.latitude,
    longitude: values.longitude,
    address: values.address,
    city: values.city,
    website: values.website || null,
    phone: values.phone || null,
    has_wifi: values.hasWifi,
    wifi_free: values.wifiFree,
    notes: values.notes || null,
    hours: values.hours || null,
    verified_at: values.verifiedAt || null,
    verified_by: values.verifiedBy || null,
    power_outlets: values.powerOutlets,
    laptop_friendly: values.laptopFriendly,
    quiet: values.quiet,
    restrooms: values.restrooms,
    outdoor_seating: values.outdoorSeating,
    air_conditioning: values.airConditioning,
    wheelchair_accessible: values.wheelchairAccessible,
    food_available: values.foodAvailable,
    coffee_available: values.coffeeAvailable,
    wifi_ssid: values.wifiSsid || null,
    wifi_password: values.wifiPassword || null
  };
}
