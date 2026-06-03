import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import type { WeightEntry } from '@/types';

interface WeightState {
  entries: WeightEntry[];
  addEntry: (weightKg: number) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

function startOfDay(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],

  addEntry: async (weightKg) => {
    const today = startOfDay();
    const filtered = get().entries.filter((e) => e.date !== today);
    const entry: WeightEntry = { id: Date.now().toString(), date: today, weightKg };
    const updated = [entry, ...filtered].sort((a, b) => b.date - a.date);
    set({ entries: updated });
    await storageSet(STORAGE_KEYS.weightLog, updated);
  },

  loadFromStorage: async () => {
    const entries = await storageGet<WeightEntry[]>(STORAGE_KEYS.weightLog);
    if (entries) set({ entries });
  },
}));
