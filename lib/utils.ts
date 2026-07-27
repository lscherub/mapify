import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(km?: number) {
  if (typeof km !== "number" || Number.isNaN(km)) return "Nearby";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatPhone(phone?: string) {
  if (!phone) return "Not listed";
  return phone;
}

export function formatWebsite(website?: string) {
  if (!website) return "Not listed";
  return website.replace(/^https?:\/\//, "");
}
