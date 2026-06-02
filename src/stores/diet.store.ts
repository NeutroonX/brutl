import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { useQuestStore } from '@/stores/quest.store';
import { useUserStore } from '@/stores/user.store';
import type { DietLog, MealEntry } from '@/types';

interface DietState {
  logs: DietLog[];
  todayLog: DietLog | null;
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

    // Progress daily quest by 50% when protein target is >= 80% hit
    const profile = useUserStore.getState().profile;
    if (profile) {
      const target = profile.macroTargets.proteinG;
      const ratio = target > 0 ? macros.totalProteinG / target : 0;
      if (ratio >= 0.8) {
        await useQuestStore.getState().progressActiveQuest('DAILY', 0.5).catch(() => {});
      }
    }
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
