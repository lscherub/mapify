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

export function watchBrowserLocation(
  onUpdate: (location: { latitude: number; longitude: number }) => void,
  onFallback?: (location: { latitude: number; longitude: number }) => void
) {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    onFallback?.(VANCOUVER_CENTER);
    return () => undefined;
  }

  const id = navigator.geolocation.watchPosition(
    (position) =>
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }),
    () => {
      onFallback?.(VANCOUVER_CENTER);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 12000
    }
  );

  return () => navigator.geolocation.clearWatch(id);
}
