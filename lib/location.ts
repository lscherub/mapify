export type UserCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type GeolocationStatus =
  | "prompt"
  | "locating"
  | "success"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export type GeolocationResult =
  | { status: "success"; coordinates: UserCoordinates }
  | { status: "denied"; error: string }
  | { status: "unavailable"; error: string }
  | { status: "timeout"; error: string }
  | { status: "unsupported"; error: string };

export async function getDetailedBrowserLocation(): Promise<GeolocationResult> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return { status: "unsupported", error: "Geolocation is not supported by your browser." };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          status: "success",
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        }),
      (err) => {
        if (err.code === 1) {
          resolve({
            status: "denied",
            error: "Location permission was denied. Please enable location access in your browser settings to discover nearby businesses."
          });
        } else if (err.code === 2) {
          resolve({
            status: "unavailable",
            error: "Location information is unavailable from your device or network."
          });
        } else if (err.code === 3) {
          resolve({
            status: "timeout",
            error: "Location request timed out. Please try again or search by name."
          });
        } else {
          resolve({
            status: "unavailable",
            error: err.message || "Failed to acquire location."
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 30000
      }
    );
  });
}

export async function getBrowserLocation(): Promise<UserCoordinates | null> {
  const result = await getDetailedBrowserLocation();
  if (result.status === "success") {
    return result.coordinates;
  }
  return null;
}

export function watchBrowserLocation(
  onUpdate: (location: UserCoordinates) => void,
  onError?: (error: GeolocationPositionError) => void
) {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return () => undefined;
  }

  const id = navigator.geolocation.watchPosition(
    (position) =>
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }),
    (error) => {
      onError?.(error);
      // Notice: Do NOT overwrite the user's location with a fallback on error!
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 15000
    }
  );

  return () => navigator.geolocation.clearWatch(id);
}
