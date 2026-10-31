import { type DailyQuest, type DailyQuestType } from "./types";

const QUEST_TEMPLATES: Array<{
  type: DailyQuestType;
  title: string;
  description: string;
  targetCount: number;
  xpReward: number;
}> = [
  {
    type: "discover_venue",
    title: "Daily Scout",
    description: "Check in and collect 1 new venue today.",
    targetCount: 1,
    xpReward: 30
  },
  {
    type: "visit_cafe",
    title: "Café Hop",
    description: "Check in at a coffee shop or café.",
    targetCount: 1,
    xpReward: 30
  },
  {
    type: "explore_neighborhood",
    title: "Neighborhood Wanderer",
    description: "Discover a venue in a new neighborhood or city.",
    targetCount: 1,
    xpReward: 30
  },
  {
    type: "submit_wifi",
    title: "Signal Contributor",
    description: "Submit Wi-Fi details for a venue in your collection.",
    targetCount: 1,
    xpReward: 30
  },
  {
    type: "discover_category",
    title: "New Horizons",
    description: "Collect a venue in a category you haven't visited today.",
    targetCount: 1,
    xpReward: 30
  }
];

// Simple deterministic hash based on date string so every user gets consistent quests for a given day
function hashDate(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateDailyQuests(dateKey: string): DailyQuest[] {
  const seed = hashDate(dateKey);
  const selectedTemplates: typeof QUEST_TEMPLATES = [];
  const indices = new Set<number>();

  // Always include "Daily Scout" (discover 1 venue) as the primary quest
  selectedTemplates.push(QUEST_TEMPLATES[0]);
  indices.add(0);

  // Pick 2 more unique quests based on the day's seed
  for (let step = 1; selectedTemplates.length < 3 && step < 10; step++) {
    const candidateIdx = (seed + step * 3) % QUEST_TEMPLATES.length;
    if (!indices.has(candidateIdx)) {
      indices.add(candidateIdx);
      selectedTemplates.push(QUEST_TEMPLATES[candidateIdx]);
    }
  }

  return selectedTemplates.map((template, idx) => ({
    id: `quest_${dateKey}_${idx}_${template.type}`,
    dateKey,
    type: template.type,
    title: template.title,
    description: template.description,
    targetCount: template.targetCount,
    currentCount: 0,
    isCompleted: false,
    xpReward: template.xpReward
  }));
}

