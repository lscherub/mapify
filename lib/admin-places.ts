import { z } from "zod";
import { type Place } from "@/lib/types";

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
