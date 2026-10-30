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
  [key: string]: boolean;
};

export type WifiAccessType = "free" | "paid" | "purchase_required" | "customers_only" | "unknown" | "none";

export type WifiNetwork = {
  id: string;
  ssid: string;
  password?: string | null;
  accessType?: WifiAccessType;
  instructions?: string;
  verifiedAt: string;
  verifiedBy: string;
  isActive?: boolean;
};

export type Photo = {
  id: string;
  url: string;
  alt: string;
};

export type LocationSource = "database" | "osm";

export type OsmMetadata = {
  osmId: number;
  osmType: "node" | "way" | "relation";
  provider: "nominatim" | "overpass";
  tags?: Record<string, string>;
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
  source: LocationSource;
  wifiMessage?: string;
  osm?: OsmMetadata;
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
  type: "place" | "address" | "city" | "poi";
  source?: LocationSource;
  place?: Place;
};

export type WifiSubmission = {
  id?: string;
  placeId?: string;
  placeName: string;
  placeAddress?: string;
  latitude?: number;
  longitude?: number;
  ssid: string;
  password?: string;
  accessType: WifiAccessType;
  instructions?: string;
  notes?: string;
  status?: "pending" | "in_review" | "approved" | "rejected";
  createdAt?: string;
};

export type WifiCredentialResult =
  | {
      authorized: true;
      ssid: string;
      password: string | null;
      instructions?: string | null;
      accessType?: string;
    }
  | {
      authorized: false;
      reason: "missing_location" | "outside_proximity" | "not_found" | "no_password" | "rate_limited";
      distanceMeters?: number;
      maxDistanceMeters?: number;
      message: string;
    };
