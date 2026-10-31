export type LevelInfo = {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
};

// Base cumulative XP thresholds to reach each level
const LEVEL_THRESHOLDS: Array<{ level: number; xp: number; title: string }> = [
  { level: 1, xp: 0, title: "Novice Scout" },
  { level: 2, xp: 100, title: "Junior Explorer" },
  { level: 3, xp: 250, title: "Urban Scout" },
  { level: 4, xp: 450, title: "Wi-Fi Pathfinder" },
  { level: 5, xp: 700, title: "Neighborhood Voyager" },
  { level: 6, xp: 1000, title: "City Wayfarer" },
  { level: 7, xp: 1400, title: "Senior Cartographer" },
  { level: 8, xp: 1900, title: "Master Pathfinder" },
  { level: 9, xp: 2500, title: "Grand Explorer" },
  { level: 10, xp: 3200, title: "Legendary Cartographer" }
];

export function calculateLevel(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));

  let currentLevel = 1;
  let currentTitle = LEVEL_THRESHOLDS[0].title;
  let currentLevelXp = 0;
  let nextLevelXp = LEVEL_THRESHOLDS[1].xp;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVEL_THRESHOLDS[i].xp) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      currentTitle = LEVEL_THRESHOLDS[i].title;
      currentLevelXp = LEVEL_THRESHOLDS[i].xp;

      if (i < LEVEL_THRESHOLDS.length - 1) {
        nextLevelXp = LEVEL_THRESHOLDS[i + 1].xp;
      } else {
        // Levels beyond max scale dynamically by 800 XP per level
        const extraLevels = Math.floor((safeXp - currentLevelXp) / 800);
        currentLevel += extraLevels;
        currentLevelXp += extraLevels * 800;
        nextLevelXp = currentLevelXp + 800;
      }
      break;
    }
  }

  const xpInCurrentLevel = safeXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100))
  );

  return {
    level: currentLevel,
    title: currentTitle,
    currentLevelXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent
  };
}

