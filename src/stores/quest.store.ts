import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import type { Quest, QuestType } from '@/types';

interface QuestState {
  quests: Quest[];
  seedInitialQuests: () => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  completeQuest: (id: string) => Promise<Quest | null>;
  getActiveByType: (type: QuestType) => Quest | null;
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

export const useQuestStore = create<QuestState>((set, get) => ({
  quests: [],

  seedInitialQuests: async () => {
    const existing = get().quests;
    if (existing.length > 0) return;
    const initial: Quest[] = [
      {
        id: 'daily-1',
        type: 'DAILY',
        title: 'First Blood',
        description: 'Log your first workout and hit your protein target today.',
        xpReward: 150,
        expiresAt: midnight(),
        completedAt: null,
        progress: 0,
      },
      {
        id: 'boss-1',
        type: 'BOSS',
        title: 'Beat Your Baseline',
        description: 'Lift more than your 30-day average on any major exercise.',
        xpReward: 500,
        expiresAt: nextMonday(),
        completedAt: null,
        progress: 0,
      },
    ];
    set({ quests: initial });
    await storageSet(STORAGE_KEYS.quests, initial);
  },

  updateProgress: async (id, progress) => {
    const updated = get().quests.map((q) =>
      q.id === id ? { ...q, progress: Math.min(1, progress) } : q
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
    get().quests.find((q) => q.type === type && !q.completedAt) ?? null,

  loadFromStorage: async () => {
    const quests = await storageGet<Quest[]>(STORAGE_KEYS.quests);
    if (quests) set({ quests });
  },
}));
