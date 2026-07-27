import { type Place } from "@/lib/types";

export const demoPlaces: Place[] = [
  {
    id: "granville-roasters",
    slug: "granville-roasters",
    name: "Granville Roasters",
    category: "Coffee Shop",
    latitude: 49.2797,
    longitude: -123.1162,
    address: "1025 Granville St, Vancouver, BC",
    city: "Vancouver",
    website: "https://example.com/granville-roasters",
    phone: "(604) 555-0124",
    hasWifi: true,
    wifiFree: true,
    notes: "WiFi password is printed on the receipt. Ask at the counter after ordering.",
    hours: "7:00 AM - 7:00 PM",
    verifiedAt: "2026-07-18",
    verifiedBy: "Admin verified",
    source: "database",
    wifiNetworks: [
      {
        id: "wifi-1",
        ssid: "GranvilleRoasters",
        password: "brewandbrowse",
        verifiedAt: "2026-07-18",
        verifiedBy: "Admin verified"
      }
    ],
    amenities: {
      powerOutlets: true,
      laptopFriendly: true,
      quiet: true,
      restrooms: true,
      outdoorSeating: false,
      airConditioning: true,
      wheelchairAccessible: true,
      foodAvailable: true,
      coffeeAvailable: true
    },
    photos: [
      {
        id: "p1",
        url: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80",
        alt: "Coffee shop interior"
      }
    ]
  },
  {
    id: "kitsilano-study-house",
    slug: "kitsilano-study-house",
    name: "Kitsilano Study House",
    category: "Cafe",
    latitude: 49.2686,
    longitude: -123.1683,
    address: "2455 West 4th Ave, Vancouver, BC",
    city: "Vancouver",
    website: "https://example.com/kitsilano-study-house",
    phone: "(604) 555-0188",
    hasWifi: true,
    wifiFree: true,
    notes: "Order anything and staff will share the password at the till.",
    hours: "8:00 AM - 8:00 PM",
    verifiedAt: "2026-07-20",
    verifiedBy: "Admin verified",
    source: "database",
    wifiNetworks: [
      {
        id: "wifi-2",
        ssid: "KitsStudy",
        password: "studybythesea",
        verifiedAt: "2026-07-20",
        verifiedBy: "Admin verified"
      }
    ],
    amenities: {
      powerOutlets: true,
      laptopFriendly: true,
      quiet: true,
      restrooms: true,
      outdoorSeating: true,
      airConditioning: true,
      wheelchairAccessible: false,
      foodAvailable: true,
      coffeeAvailable: true
    },
    photos: []
  },
  {
    id: "mount-pleasant-library",
    slug: "mount-pleasant-library",
    name: "Mount Pleasant Library",
    category: "Library",
    latitude: 49.2647,
    longitude: -123.1013,
    address: "303 E 6th Ave, Vancouver, BC",
    city: "Vancouver",
    website: "https://example.com/mount-pleasant-library",
    phone: "(604) 555-0199",
    hasWifi: true,
    wifiFree: true,
    notes: "Open to the public. Library WiFi is fast and stable.",
    hours: "10:00 AM - 6:00 PM",
    verifiedAt: "2026-07-21",
    verifiedBy: "Admin verified",
    source: "database",
    wifiNetworks: [
      {
        id: "wifi-3",
        ssid: "VPL_Guest",
        password: null,
        verifiedAt: "2026-07-21",
        verifiedBy: "Admin verified"
      }
    ],
    amenities: {
      powerOutlets: true,
      laptopFriendly: true,
      quiet: true,
      restrooms: true,
      outdoorSeating: false,
      airConditioning: true,
      wheelchairAccessible: true,
      foodAvailable: false,
      coffeeAvailable: false
    },
    photos: []
  },
  {
    id: "burnaby-corner",
    slug: "burnaby-corner",
    name: "Burnaby Corner Cafe",
    category: "Cafe",
    latitude: 49.2488,
    longitude: -123.0046,
    address: "4090 Hastings St, Burnaby, BC",
    city: "Burnaby",
    website: "https://example.com/burnaby-corner",
    phone: "(604) 555-0144",
    hasWifi: true,
    wifiFree: false,
    notes: "WiFi is available with purchase. Password changes monthly.",
    hours: "7:30 AM - 6:30 PM",
    verifiedAt: "2026-07-15",
    verifiedBy: "Admin verified",
    source: "database",
    wifiNetworks: [
      {
        id: "wifi-4",
        ssid: "BurnabyCornerGuest",
        password: "latteandlink",
        verifiedAt: "2026-07-15",
        verifiedBy: "Admin verified"
      }
    ],
    amenities: {
      powerOutlets: true,
      laptopFriendly: true,
      quiet: false,
      restrooms: true,
      outdoorSeating: false,
      airConditioning: true,
      wheelchairAccessible: true,
      foodAvailable: true,
      coffeeAvailable: true
    },
    photos: []
  },
  {
    id: "richmond-harbor-brew",
    slug: "richmond-harbor-brew",
    name: "Richmond Harbor Brew",
    category: "Coffee Shop",
    latitude: 49.1666,
    longitude: -123.1368,
    address: "8880 River Rd, Richmond, BC",
    city: "Richmond",
    website: "https://example.com/richmond-harbor-brew",
    phone: "(604) 555-0177",
    hasWifi: true,
    wifiFree: true,
    notes: "Great near the water. Ask staff for the current password.",
    hours: "6:30 AM - 5:30 PM",
    verifiedAt: "2026-07-19",
    verifiedBy: "Admin verified",
    source: "database",
    wifiNetworks: [
      {
        id: "wifi-5",
        ssid: "HarborBrew",
        password: "seasidework",
        verifiedAt: "2026-07-19",
        verifiedBy: "Admin verified"
      }
    ],
    amenities: {
      powerOutlets: true,
      laptopFriendly: true,
      quiet: true,
      restrooms: true,
      outdoorSeating: true,
      airConditioning: true,
      wheelchairAccessible: true,
      foodAvailable: true,
      coffeeAvailable: true
    },
    photos: []
  },
  {
    id: "surrey-station-hub",
    slug: "surrey-station-hub",
    name: "Surrey Station Hub",
    category: "Coworking",
    latitude: 49.1913,
    longitude: -122.8461,
    address: "13450 104 Ave, Surrey, BC",
    city: "Surrey",
    website: "https://example.com/surrey-station-hub",
    phone: "(604) 555-0162",
    hasWifi: true,
    wifiFree: false,
    notes: "Day pass available. Ideal for longer work sessions.",
    hours: "8:00 AM - 8:00 PM",
    verifiedAt: "2026-07-17",
    verifiedBy: "Admin verified",
    source: "database",
    wifiNetworks: [
      {
        id: "wifi-6",
        ssid: "StationHubGuest",
        password: "workmode",
        verifiedAt: "2026-07-17",
        verifiedBy: "Admin verified"
      }
    ],
    amenities: {
      powerOutlets: true,
      laptopFriendly: true,
      quiet: true,
      restrooms: true,
      outdoorSeating: false,
      airConditioning: true,
      wheelchairAccessible: true,
      foodAvailable: true,
      coffeeAvailable: true
    },
    photos: []
  }
];
