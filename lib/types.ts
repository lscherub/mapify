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
  comfortableSeating?: boolean;
  limitedSeating?: boolean;
  largeTables?: boolean;
  smallTables?: boolean;
  drinksAvailable?: boolean;
  quietEnvironment?: boolean;
  moderateNoise?: boolean;
  livelyEnvironment?: boolean;
  freeWifi?: boolean;
  paidWifi?: boolean;
  [key: string]: boolean | undefined;
};

export type WifiAccessType = "free" | "paid" | "purchase_required" | "customers_only" | "unknown" | "none";
export type WifiNetworkType = "primary" | "guest" | "staff" | "customer" | "other" | string;

export type WifiNetwork = {
  id: string;
  ssid: string;
  password?: string | null;
  networkType?: WifiNetworkType;
  isPrimary?: boolean;
  accessType?: WifiAccessType;
  instructions?: string | null;
  notes?: string | null;
  verifiedAt?: string;
  verifiedBy?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  isArchived?: boolean;
  seatingCapacity?: number | null;
  noiseLevel?: "quiet" | "moderate" | "lively" | null;
  workNotes?: string | null;
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

export type AdminWifiNetworkInput = {
  id?: string;
  ssid: string;
  password?: string | null;
  networkType: string;
  isPrimary: boolean;
  accessType: WifiAccessType;
  instructions?: string | null;
  notes?: string | null;
  isActive: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
};

export type AdminPlaceFormValues = {
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
  isArchived?: boolean;
  seatingCapacity?: number | null;
  noiseLevel?: "quiet" | "moderate" | "lively" | null;
  workNotes?: string;
  // Amenities
  powerOutlets: boolean;
  laptopFriendly: boolean;
  quiet: boolean;
  restrooms: boolean;
  outdoorSeating: boolean;
  airConditioning: boolean;
  wheelchairAccessible: boolean;
  foodAvailable: boolean;
  coffeeAvailable: boolean;
  comfortableSeating: boolean;
  limitedSeating: boolean;
  largeTables: boolean;
  smallTables: boolean;
  drinksAvailable: boolean;
  quietEnvironment: boolean;
  moderateNoise: boolean;
  livelyEnvironment: boolean;
  // Networks
  wifiNetworks: AdminWifiNetworkInput[];
};

export type DuplicateCheckMatch = {
  id: string;
  name: string;
  address: string;
  distanceMeters: number;
  isArchived?: boolean;
};

export type DiscoveredBusiness = {
  name: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  phone?: string;
  website?: string;
  hours?: string;
  source: "overpass" | "nominatim";
  isAlreadyInMapify: boolean;
  existingPlaceId?: string;
};
