import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { buildUnlockedShadow, checkShadowTriggers, type ShadowCheckContext } from '@/lib/shadow-quests';
import type { Quest, QuestType, UnlockedShadow } from '@/types';

interface QuestState {
  quests: Quest[];
  shadows: UnlockedShadow[];
  seedInitialQuests: () => Promise<void>;
  refreshDailyQuests: () => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  progressActiveQuest: (type: QuestType, amount: number) => Promise<void>;
  completeQuest: (id: string) => Promise<Quest | null>;
  getActiveByType: (type: QuestType) => Quest | null;
  checkShadowTriggers: (ctx: ShadowCheckContext) => Promise<UnlockedShadow[]>;
  revealShadow: (id: string) => Promise<void>;
  claimShadow: (id: string) => Promise<number>;
  loadFromStorage: () => Promise<void>;
}

function midnight(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function nextMonday(): number {
  const d = new Date();
  const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

const DAILY_QUEST_POOL: Omit<Quest, 'id' | 'expiresAt' | 'completedAt' | 'progress'>[] = [
  { type: 'DAILY', title: 'First Blood',      description: 'Log a workout today. Any session counts — showing up is the first rep.',               xpReward: 100 },
  { type: 'DAILY', title: 'Protein Protocol', description: "Hit 80% of your daily protein target. Muscle doesn't grow on intent.",                 xpReward: 120 },
  { type: 'DAILY', title: 'Iron Discipline',  description: 'Log a workout lasting at least 30 minutes. No half-sessions.',                         xpReward: 130 },
  { type: 'DAILY', title: 'Full Plate',        description: 'Log at least 3 separate meals today. Consistency over perfection.',                   xpReward: 110 },
  { type: 'DAILY', title: 'Early Riser',       description: 'Log a workout before noon. The best sessions happen before excuses do.',              xpReward: 150 },
  { type: 'DAILY', title: 'Clean Fuel',        description: 'Stay within 100 kcal of your daily calorie target. Precision is a skill.',            xpReward: 140 },
  { type: 'DAILY', title: 'No Days Off',       description: "Log any activity today — even a walk. Momentum doesn't care about size.",             xpReward: 90  },
  { type: 'DAILY', title: 'The Extra Rep',     description: 'Log a workout with at least 4 exercises. Volume is the language of growth.',          xpReward: 160 },
  { type: 'DAILY', title: 'Macro Lock',        description: 'Hit all three macro targets within 10% today. Precision separates ranks.',             xpReward: 175 },
  { type: 'DAILY', title: 'Double Down',       description: 'Log both a workout and at least 3 meals on the same day. Full commitment.',           xpReward: 200 },
];

const BOSS_QUEST_POOL: Omit<Quest, 'id' | 'expiresAt' | 'completedAt' | 'progress'>[] = [
  { type: 'BOSS', title: 'The Iron Pact',        description: 'Log 4 workouts this week. Consistency is the only contract that matters.',         xpReward: 600 },
  { type: 'BOSS', title: 'Protein Domination',   description: 'Hit your protein target 5 out of 7 days this week. Your muscles are waiting.',     xpReward: 500 },
  { type: 'BOSS', title: 'Unbroken',             description: 'Log a workout every day for 5 consecutive days. No gaps. No mercy.',               xpReward: 750 },
  { type: 'BOSS', title: 'Volume King',           description: 'Log a single session with at least 5 exercises. Quantity fuels quality.',         xpReward: 450 },
  { type: 'BOSS', title: 'The Long Game',         description: 'Log a workout lasting over 60 minutes this week. Endurance is earned.',           xpReward: 500 },
  { type: 'BOSS', title: 'Macro Perfect Week',   description: 'Hit your calorie target within 200 kcal for 5 days this week.',                    xpReward: 650 },
  { type: 'BOSS', title: 'Rank Pressure',        description: 'Complete 3 daily quests this week without missing a single one.',                  xpReward: 700 },
  { type: 'BOSS', title: 'The Accumulator',      description: 'Log at least 12 total sets across any workouts this week.',                        xpReward: 550 },
];

function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],
  shadows: [],

  seedInitialQuests: async () => {
    const existing = get().quests;
    if (existing.length > 0) return;
    const template = DAILY_QUEST_POOL[0];
    const bossTemplate = BOSS_QUEST_POOL[0];
    const initial: Quest[] = [
      { id: `daily-${Date.now()}`, ...template, expiresAt: midnight(), completedAt: null, progress: 0 },
      { id: `boss-${Date.now()}`, ...bossTemplate, expiresAt: nextMonday(), completedAt: null, progress: 0 },
    ];
    set({ quests: initial });
    await storageSet(STORAGE_KEYS.quests, initial);
  },

  refreshDailyQuests: async () => {
    const now = Date.now();
    const quests = get().quests;

    // Remove expired incomplete daily quests
    const pruned = quests.filter(
      (q) => !(q.type === 'DAILY' && !q.completedAt && q.expiresAt < now)
    );

    const hasActiveDaily = pruned.some((q) => q.type === 'DAILY' && !q.completedAt && q.expiresAt > now);
    const hasActiveBoss = pruned.some((q) => q.type === 'BOSS' && !q.completedAt && q.expiresAt > now);

    const additions: Quest[] = [];

    if (!hasActiveDaily) {
      const template = pickRandom(DAILY_QUEST_POOL);
      additions.push({
        id: `daily-${Date.now()}`,
        ...template,
        expiresAt: midnight(),
        completedAt: null,
        progress: 0,
      });
    }

    if (!hasActiveBoss) {
      const template = pickRandom(BOSS_QUEST_POOL);
      additions.push({
        id: `boss-${Date.now() + 1}`,
        ...template,
        expiresAt: nextMonday(),
        completedAt: null,
        progress: 0,
      });
    }

    if (additions.length > 0 || pruned.length !== quests.length) {
      const updated = [...pruned, ...additions];
      set({ quests: updated });
      await storageSet(STORAGE_KEYS.quests, updated);
    }
  },

  updateProgress: async (id, progress) => {
    const updated = get().quests.map((q) =>
      q.id === id ? { ...q, progress: Math.min(1, progress) } : q
    );
    set({ quests: updated });
    await storageSet(STORAGE_KEYS.quests, updated);
  },

  progressActiveQuest: async (type, amount) => {
    const active = get().getActiveByType(type);
    if (!active || active.completedAt) return;
    const newProgress = Math.min(1, active.progress + amount);
    if (newProgress === active.progress) return;
    const updated = get().quests.map((q) =>
      q.id === active.id ? { ...q, progress: newProgress } : q
    );
    set({ quests: updated });
    await storageSet(STORAGE_KEYS.quests, updated);
  },

  completeQuest: async (id) => {
    const quest = get().quests.find((q) => q.id === id);
    if (!quest || quest.completedAt) return null;
    const updated = get().quests.map((q) =>
      q.id === id ? { ...q, completedAt: Date.now(), progress: 1 } : q
    );
    set({ quests: updated });
    await storageSet(STORAGE_KEYS.quests, updated);
    return { ...quest, completedAt: Date.now(), progress: 1 };
  },

  getActiveByType: (type) =>
    get().quests.find((q) => q.type === type && !q.completedAt && q.expiresAt > Date.now()) ?? null,

  checkShadowTriggers: async (ctx) => {
    const alreadyUnlocked = get().shadows.map((s) => s.triggerId);
    const fired = checkShadowTriggers(ctx, alreadyUnlocked);
    if (fired.length === 0) return [];
    const newShadows = fired.map(buildUnlockedShadow);
    const updated = [...get().shadows, ...newShadows];
    set({ shadows: updated });
    await storageSet(STORAGE_KEYS.shadows, updated);
    return newShadows;
  },

  revealShadow: async (id) => {
    const updated = get().shadows.map((s) => s.id === id ? { ...s, revealed: true } : s);
    set({ shadows: updated });
    await storageSet(STORAGE_KEYS.shadows, updated);
  },

  claimShadow: async (id) => {
    const shadow = get().shadows.find((s) => s.id === id);
    if (!shadow || shadow.claimed) return 0;
    const updated = get().shadows.map((s) => s.id === id ? { ...s, claimed: true } : s);
    set({ shadows: updated });
    await storageSet(STORAGE_KEYS.shadows, updated);
    return shadow.xpReward;
  },

  loadFromStorage: async () => {
    const quests = await storageGet<Quest[]>(STORAGE_KEYS.quests);
    const shadows = await storageGet<UnlockedShadow[]>(STORAGE_KEYS.shadows);
    if (quests) set({ quests });
    if (shadows) set({ shadows });
  },
}));
