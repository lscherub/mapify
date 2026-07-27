export type AmenityFlags = {
  powerOutlets: boolean;
  laptopFriendly: boolean;
  quiet: boolean;
  restrooms: boolean;
  outdoorSeating: boolean;
  airConditioning: boolean;
  wheelchairAccessible: boolean;
  foodAvailable: boolean;
  coffeeAvailable: boolean;
};

export type WifiNetwork = {
  id: string;
  ssid: string;
  password: string | null;
  verifiedAt: string;
  verifiedBy: string;
};

export type Photo = {
  id: string;
  url: string;
  alt: string;
};

export type Place = {
  id: string;
  slug: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  website?: string;
  phone?: string;
  hasWifi: boolean;
  wifiFree: boolean;
  notes?: string;
  hours?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  distanceKm?: number;
  wifiNetworks: WifiNetwork[];
  amenities: AmenityFlags;
  photos: Photo[];
};

export type PlaceFilters = {
  hasWifi: boolean;
  passwordAvailable: boolean;
  freeWifi: boolean;
  favoritesOnly: boolean;
};

export type Suggestion = {
  id: string;
  title: string;
  subtitle: string;
  latitude?: number;
  longitude?: number;
  type: "place" | "address" | "city";
};
