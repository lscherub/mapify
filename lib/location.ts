import { VANCOUVER_CENTER } from "@/lib/constants";

export async function getBrowserLocation(): Promise<{ latitude: number; longitude: number }> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return VANCOUVER_CENTER;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }),
      () => resolve(VANCOUVER_CENTER),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  });
}
