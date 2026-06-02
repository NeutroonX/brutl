import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { useQuestStore } from '@/stores/quest.store';
import { useDungeonStore } from '@/stores/dungeon.store';
import { useUserStore } from '@/stores/user.store';
import type { DietLog, MealEntry } from '@/types';

interface DietState {
  logs: DietLog[];
  todayLog: DietLog | null;
  proteinStreakDays: number;
  addMeal: (meal: MealEntry) => Promise<void>;
  getTodayCompliance: () => number;
  loadFromStorage: () => Promise<void>;
}

function todayKey(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sumMacros(meals: MealEntry[]) {
  return meals.reduce(
    (acc, m) => ({
      totalCalories: acc.totalCalories + m.calories,
      totalProteinG: acc.totalProteinG + m.proteinG,
      totalCarbsG: acc.totalCarbsG + m.carbsG,
      totalFatG: acc.totalFatG + m.fatG,
    }),
    { totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0 }
  );
}

export const useDietStore = create<DietState>((set, get) => ({
  logs: [],
  todayLog: null,
  proteinStreakDays: 0,

  addMeal: async (meal) => {
    const today = todayKey();
    const { logs } = get();
    const existing = logs.find((l) => l.date === today);
    const meals = existing ? [...existing.meals, meal] : [meal];
    const macros = sumMacros(meals);
    const updated: DietLog = {
      id: existing?.id ?? Date.now().toString(),
      date: today,
      meals,
      ...macros,
      complianceScore: 0,
    };
    const updatedLogs = existing
      ? logs.map((l) => (l.date === today ? updated : l))
      : [updated, ...logs];
    set({ logs: updatedLogs, todayLog: updated });
    await storageSet(STORAGE_KEYS.dietLog, updatedLogs);

    // Check protein ratio against target
    const profile = useUserStore.getState().profile;
    if (!profile) return;

    const target = profile.macroTargets.proteinG;
    const proteinRatio = target > 0 ? macros.totalProteinG / target : 0;

    // Progress daily quest when hitting 80% protein
    if (proteinRatio >= 0.8) {
      await useQuestStore.getState().progressActiveQuest('DAILY', 0.5).catch(() => {});
    }

    // Dungeon protein update
    await useDungeonStore.getState().onProteinUpdated(proteinRatio).catch(() => {});

    // Track protein streak (consecutive days hitting target)
    let proteinStreak = get().proteinStreakDays;
    if (proteinRatio >= 1.0) {
      const yesterday = todayKey() - 24 * 60 * 60 * 1000;
      const hitYesterday = logs.some((l) => l.date === yesterday && l.totalProteinG >= target);
      proteinStreak = hitYesterday ? proteinStreak + 1 : 1;
      set({ proteinStreakDays: proteinStreak });
    }

    // Shadow quest triggers
    await useQuestStore.getState().checkShadowTriggers({
      proteinStreakDays: proteinStreak,
    }).catch(() => {});
  },

  getTodayCompliance: () => {
    return get().todayLog?.complianceScore ?? 0;
  },

  loadFromStorage: async () => {
    const logs = await storageGet<DietLog[]>(STORAGE_KEYS.dietLog);
    if (!logs) return;
    const today = todayKey();
    const todayLog = logs.find((l) => l.date === today) ?? null;
    set({ logs, todayLog });
  },
}));
