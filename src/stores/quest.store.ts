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
  {
    type: 'DAILY',
    title: 'First Blood',
    description: 'Log a workout and hit your protein target today.',
    xpReward: 150,
  },
  {
    type: 'DAILY',
    title: 'Sweat Tax',
    description: 'Log any workout session today.',
    xpReward: 100,
  },
  {
    type: 'DAILY',
    title: 'Protein Protocol',
    description: 'Hit 80% of your daily protein target.',
    xpReward: 120,
  },
  {
    type: 'DAILY',
    title: 'Iron Discipline',
    description: 'Log a workout over 30 minutes.',
    xpReward: 130,
  },
  {
    type: 'DAILY',
    title: 'Clean Plate',
    description: 'Log at least 3 meals today.',
    xpReward: 110,
  },
  {
    type: 'DAILY',
    title: 'No Excuses',
    description: 'Log a workout before 9pm.',
    xpReward: 140,
  },
];

const BOSS_QUEST_POOL: Omit<Quest, 'id' | 'expiresAt' | 'completedAt' | 'progress'>[] = [
  {
    type: 'BOSS',
    title: 'Beat Your Baseline',
    description: 'Lift more than your 30-day average on any major exercise.',
    xpReward: 500,
  },
  {
    type: 'BOSS',
    title: 'The Grind',
    description: 'Log 4 workouts this week.',
    xpReward: 600,
  },
  {
    type: 'BOSS',
    title: 'Macro Master',
    description: 'Hit your protein target 5 days this week.',
    xpReward: 450,
  },
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
