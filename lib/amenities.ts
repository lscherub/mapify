import { type AmenityFlags } from "@/lib/types";

export type AmenityDefinition = {
  key: string;
  label: string;
  category: "work" | "comfort" | "facility" | "food_drink" | "wifi";
  description?: string;
};

export const INITIAL_AMENITIES: AmenityDefinition[] = [
  // Work & Productivity
  { key: "powerOutlets", label: "Power outlets", category: "work" },
  { key: "laptopFriendly", label: "Laptop-friendly", category: "work" },
  { key: "quietEnvironment", label: "Quiet environment", category: "work" },
  { key: "moderateNoise", label: "Moderate noise", category: "work" },
  { key: "livelyEnvironment", label: "Lively environment", category: "work" },

  // Seating & Comfort
  { key: "comfortableSeating", label: "Comfortable seating", category: "comfort" },
  { key: "limitedSeating", label: "Limited seating", category: "comfort" },
  { key: "largeTables", label: "Large tables", category: "comfort" },
  { key: "smallTables", label: "Small tables", category: "comfort" },
  { key: "airConditioning", label: "Air conditioning", category: "comfort" },
  { key: "outdoorSeating", label: "Outdoor seating", category: "comfort" },

  // Wi-Fi Access
  { key: "freeWifi", label: "Free Wi-Fi", category: "wifi" },
  { key: "paidWifi", label: "Paid Wi-Fi", category: "wifi" },

  // Facilities & Accessibility
  { key: "restrooms", label: "Restrooms", category: "facility" },
  { key: "wheelchairAccessible", label: "Wheelchair accessible", category: "facility" },

  // Food & Drinks
  { key: "foodAvailable", label: "Food available", category: "food_drink" },
  { key: "drinksAvailable", label: "Drinks available", category: "food_drink" }
];

export const NOISE_LEVEL_OPTIONS = [
  { value: "quiet", label: "Quiet", description: "Minimal conversation, library-like atmosphere" },
  { value: "moderate", label: "Moderate", description: "Pleasant background chatter & music" },
  { value: "lively", label: "Lively", description: "Bustling, vibrant cafe or social space" }
] as const;

export function createDefaultAmenities(): AmenityFlags {
  return {
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
    freeWifi: false,
    paidWifi: false
  };
}

