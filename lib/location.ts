export type UserCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export async function getBrowserLocation(): Promise<UserCoordinates | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  });
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
