import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { getDungeonMultiplier } from '@/lib/xp';
import { useUserStore } from '@/stores/user.store';
import type { DungeonRun } from '@/types';

const DAY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h per day

export interface DungeonDay {
  day: number;
  title: string;
  description: string;
  requiresProtein: boolean;
  minDurationMin: number;
}

export const DUNGEON_DAYS: DungeonDay[] = [
  { day: 1, title: 'First Strike',     description: 'Log any workout today. The dungeon begins.',                          requiresProtein: false, minDurationMin: 0 },
  { day: 2, title: 'Iron Protocol',    description: 'Workout + hit 80% of your protein target.',                           requiresProtein: true,  minDurationMin: 0 },
  { day: 3, title: 'No Mercy',         description: 'Log a workout. No rest days inside the dungeon.',                     requiresProtein: false, minDurationMin: 0 },
  { day: 4, title: 'The Grind',        description: 'Workout + hit your protein target. Both. Today.',                     requiresProtein: true,  minDurationMin: 0 },
  { day: 5, title: 'Pain Is Progress', description: 'Log a workout of 45 minutes or more.',                                requiresProtein: false, minDurationMin: 45 },
  { day: 6, title: 'The Gauntlet',     description: 'Workout + all macros. No shortcuts. Not this close to the end.',      requiresProtein: true,  minDurationMin: 0 },
  { day: 7, title: 'Final Boss',       description: '60+ minute workout. Hit your protein. This is what you came for.',   requiresProtein: true,  minDurationMin: 60 },
];

interface DungeonState {
  run: DungeonRun | null;
  startRun: () => Promise<void>;
  abandonRun: () => Promise<void>;
  onWorkoutLogged: (durationMin: number) => Promise<void>;
  onProteinUpdated: (proteinRatio: number) => Promise<void>;
  checkForExpiry: () => Promise<void>;
  getMultiplier: () => number;
  loadFromStorage: () => Promise<void>;
  _advanceDay: (run: DungeonRun) => Promise<void>;
}

async function saveRun(run: DungeonRun | null) {
  await storageSet(STORAGE_KEYS.dungeon, run);
}

function dayRequirementMet(run: DungeonRun): boolean {
  const daySpec = DUNGEON_DAYS[run.currentDay - 1];
  if (!daySpec) return false;
  const workoutOk = run.todayWorkoutDuration > 0 && run.todayWorkoutDuration >= daySpec.minDurationMin;
  const proteinOk = !daySpec.requiresProtein || run.todayProteinRatio >= 0.8;
  return workoutOk && proteinOk;
}

export const useDungeonStore = create<DungeonState>((set, get) => ({
  run: null,

  startRun: async () => {
    if (get().run?.status === 'ACTIVE') return;
    const run: DungeonRun = {
      id: Date.now().toString(),
      startedAt: Date.now(),
      currentDay: 1,
      dayStartedAt: Date.now(),
      daysCompleted: [],
      todayWorkoutDuration: 0,
      todayProteinRatio: 0,
      status: 'ACTIVE',
      xpMultiplierUntil: null,
    };
    set({ run });
    await saveRun(run);
  },

  abandonRun: async () => {
    const { run } = get();
    if (!run || run.status !== 'ACTIVE') return;
    const failed: DungeonRun = { ...run, status: 'FAILED' };
    set({ run: failed });
    await saveRun(failed);
    // Apply -200 XP penalty
    await useUserStore.getState().updateXP(-200).catch(() => {});
  },

  onWorkoutLogged: async (durationMin) => {
    const { run } = get();
    if (!run || run.status !== 'ACTIVE') return;

    const updated: DungeonRun = {
      ...run,
      todayWorkoutDuration: Math.max(run.todayWorkoutDuration, durationMin),
    };

    if (dayRequirementMet(updated)) {
      await get()._advanceDay(updated);
    } else {
      set({ run: updated });
      await saveRun(updated);
    }
  },

  onProteinUpdated: async (proteinRatio) => {
    const { run } = get();
    if (!run || run.status !== 'ACTIVE') return;

    const updated: DungeonRun = { ...run, todayProteinRatio: proteinRatio };

    if (dayRequirementMet(updated)) {
      await get()._advanceDay(updated);
    } else {
      set({ run: updated });
      await saveRun(updated);
    }
  },

  checkForExpiry: async () => {
    const { run } = get();
    if (!run || run.status !== 'ACTIVE') return;
    if (Date.now() - run.dayStartedAt > DAY_WINDOW_MS) {
      await get().abandonRun();
    }
  },

  getMultiplier: () => getDungeonMultiplier(get().run),

  loadFromStorage: async () => {
    const run = await storageGet<DungeonRun>(STORAGE_KEYS.dungeon);
    set({ run: run ?? null });
  },

  // internal — not exposed in interface but callable via getState()
  _advanceDay: async (run: DungeonRun) => {
    const newCompleted = [...run.daysCompleted, Date.now()];

    if (run.currentDay >= 7) {
      // Dungeon complete!
      const multiplierUntil = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const completed: DungeonRun = {
        ...run,
        daysCompleted: newCompleted,
        status: 'COMPLETED',
        xpMultiplierUntil: multiplierUntil,
      };
      set({ run: completed });
      await saveRun(completed);
      // Award +1000 XP bonus
      await useUserStore.getState().updateXP(1000).catch(() => {});
    } else {
      const advanced: DungeonRun = {
        ...run,
        currentDay: run.currentDay + 1,
        dayStartedAt: Date.now(),
        daysCompleted: newCompleted,
        todayWorkoutDuration: 0,
        todayProteinRatio: 0,
      };
      set({ run: advanced });
      await saveRun(advanced);
    }
  },
}));
