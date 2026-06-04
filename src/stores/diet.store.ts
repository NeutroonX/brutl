import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { calcMacroCompliance } from '@/lib/xp';
import { useUserStore } from '@/stores/user.store';
import type { DietLog, MacroTargets, MealEntry } from '@/types';

interface DietState {
  logs: DietLog[];
  todayLog: DietLog | null;
  proteinStreakDays: number;
  addMeal: (meal: MealEntry, effectiveTargets?: MacroTargets) => Promise<void>;
  removeMeal: (mealIndex: number) => Promise<void>;
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

  addMeal: async (meal, effectiveTargets?) => {
    const today = todayKey();
    const { logs } = get();
    const profile = useUserStore.getState().profile;
    const existing = logs.find((l) => l.date === today);
    const stamped: MealEntry = { ...meal, loggedAt: Date.now() };
    const meals = existing ? [...existing.meals, stamped] : [stamped];
    const macros = sumMacros(meals);

    const target = effectiveTargets ?? profile?.macroTargets;
    const complianceScore = target
      ? calcMacroCompliance(macros.totalProteinG, target.proteinG)
      : 0;

    const updated: DietLog = {
      id: existing?.id ?? Date.now().toString(),
      date: today,
      meals,
      ...macros,
      complianceScore,
    };
    const updatedLogs = existing
      ? logs.map((l) => (l.date === today ? updated : l))
      : [updated, ...logs];
    set({ logs: updatedLogs, todayLog: updated });
    await storageSet(STORAGE_KEYS.dietLog, updatedLogs);

    if (!profile) return;

    const targetProtein = target?.proteinG ?? 0;
    const proteinRatio = targetProtein > 0 ? macros.totalProteinG / targetProtein : 0;

    if (proteinRatio >= 1.0) {
      const yesterday = todayKey() - 24 * 60 * 60 * 1000;
      const hitYesterday = logs.some((l) => l.date === yesterday && l.totalProteinG >= targetProtein);
      set({ proteinStreakDays: hitYesterday ? get().proteinStreakDays + 1 : 1 });
    }
  },

  removeMeal: async (mealIndex: number) => {
    const today = todayKey();
    const { logs } = get();
    const existing = logs.find((l) => l.date === today);
    if (!existing) return;
    const meals = existing.meals.filter((_, i) => i !== mealIndex);
    const macros = sumMacros(meals);
    const updatedLogs = meals.length === 0
      ? logs.filter((l) => l.date !== today)
      : logs.map((l) => l.date === today ? { ...existing, meals, ...macros } : l);
    set({ logs: updatedLogs, todayLog: meals.length === 0 ? null : { ...existing, meals, ...macros } });
    await storageSet(STORAGE_KEYS.dietLog, updatedLogs);
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
