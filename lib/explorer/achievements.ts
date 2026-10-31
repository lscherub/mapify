import { type Achievement, type VenueCollectionItem, type ExplorerSubmissionStatus } from "./types";

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_discovery",
    title: "First Discovery",
    description: "Collect your very first venue in Mapify Explorer.",
    category: "exploration",
    iconName: "Compass",
    target: 1,
    current: 0,
    isUnlocked: false,
    xpReward: 50,
    tier: "bronze"
  },
  {
    id: "coffee_hunter",
    title: "Coffee Hunter",
    description: "Visit and collect 10 unique coffee shops or cafés.",
    category: "variety",
    iconName: "Coffee",
    target: 10,
    current: 0,
    isUnlocked: false,
    xpReward: 100,
    tier: "silver"
  },
  {
    id: "bookworm",
    title: "Bookworm",
    description: "Visit and collect 5 libraries or study spaces.",
    category: "variety",
    iconName: "BookOpen",
    target: 5,
    current: 0,
    isUnlocked: false,
    xpReward: 100,
    tier: "silver"
  },
  {
    id: "urban_explorer",
    title: "Urban Explorer",
    description: "Collect 25 unique venues in your Explorer collection.",
    category: "exploration",
    iconName: "MapPin",
    target: 25,
    current: 0,
    isUnlocked: false,
    xpReward: 250,
    tier: "gold"
  },
  {
    id: "neighborhood_nomad",
    title: "Neighborhood Nomad",
    description: "Discover venues in 5 different neighborhoods or cities.",
    category: "exploration",
    iconName: "Footprints",
    target: 5,
    current: 0,
    isUnlocked: false,
    xpReward: 200,
    tier: "gold"
  },
  {
    id: "wifi_scout",
    title: "Wi-Fi Scout",
    description: "Contribute Wi-Fi information for any collected venue.",
    category: "wifi",
    iconName: "Wifi",
    target: 1,
    current: 0,
    isUnlocked: false,
    xpReward: 50,
    tier: "bronze"
  },
  {
    id: "wifi_pioneer",
    title: "Wi-Fi Pioneer",
    description: "Have 10 Wi-Fi submissions verified and approved by admins.",
    category: "wifi",
    iconName: "ShieldCheck",
    target: 10,
    current: 0,
    isUnlocked: false,
    xpReward: 500,
    tier: "platinum"
  },
  {
    id: "streak_master",
    title: "Streak Master",
    description: "Maintain a 7-day consecutive exploration streak.",
    category: "streaks",
    iconName: "Flame",
    target: 7,
    current: 0,
    isUnlocked: false,
    xpReward: 150,
    tier: "gold"
  },
  {
    id: "category_collector",
    title: "Category Collector",
    description: "Collect venues from 5 distinct venue categories.",
    category: "variety",
    iconName: "Sparkles",
    target: 5,
    current: 0,
    isUnlocked: false,
    xpReward: 100,
    tier: "silver"
  }
];

export function evaluateAchievements(
  currentAchievements: Achievement[],
  collection: VenueCollectionItem[],
  submissions: ExplorerSubmissionStatus[],
  streak: number
): { updatedAchievements: Achievement[]; newlyUnlocked: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];

  const totalCollected = collection.length;
  const cafesCount = collection.filter((item) => {
    const cat = item.category.toLowerCase();
    return cat.includes("coffee") || cat.includes("cafe") || cat.includes("café") || cat.includes("roaster");
  }).length;

  const libraryCount = collection.filter((item) => {
    const cat = item.category.toLowerCase();
    return cat.includes("library") || cat.includes("study") || cat.includes("book") || cat.includes("reading");
  }).length;

  const uniqueCitiesOrNeighborhoods = new Set(
    collection.map((item) => {
      // derive neighborhood/city identifier
      const addressParts = (item.address || "").split(",").map((s) => s.trim());
      return item.city || addressParts[addressParts.length - 2] || "local";
    })
  ).size;

  const uniqueCategories = new Set(collection.map((item) => item.category.toLowerCase())).size;

  const totalSubmitted = submissions.length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;

  const updatedAchievements = currentAchievements.map((ach) => {
    if (ach.isUnlocked) return ach;

    let currentVal = ach.current;

    switch (ach.id) {
      case "first_discovery":
        currentVal = totalCollected;
        break;
      case "coffee_hunter":
        currentVal = cafesCount;
        break;
      case "bookworm":
        currentVal = libraryCount;
        break;
      case "urban_explorer":
        currentVal = totalCollected;
        break;
      case "neighborhood_nomad":
        currentVal = uniqueCitiesOrNeighborhoods;
        break;
      case "wifi_scout":
        currentVal = totalSubmitted;
        break;
      case "wifi_pioneer":
        currentVal = approvedCount;
        break;
      case "streak_master":
        currentVal = streak;
        break;
      case "category_collector":
        currentVal = uniqueCategories;
        break;
      default:
        break;
    }

    const isNowUnlocked = currentVal >= ach.target;

    if (isNowUnlocked && !ach.isUnlocked) {
      const unlockedAch: Achievement = {
        ...ach,
        current: Math.min(ach.target, currentVal),
        isUnlocked: true,
        unlockedAt: new Date().toISOString()
      };
      newlyUnlocked.push(unlockedAch);
      return unlockedAch;
    }

    return {
      ...ach,
      current: Math.min(ach.target, currentVal)
    };
  });

  return { updatedAchievements, newlyUnlocked };
}

