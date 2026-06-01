import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import type { Goal, MacroTargets, Rank, UserProfile, WeakArea } from '@/types';

interface UserState {
  profile: UserProfile | null;
  hasOnboarded: boolean;
  setProfile: (profile: UserProfile) => Promise<void>;
  updateXP: (delta: number) => Promise<void>;
  updateStreak: (days: number) => Promise<void>;
  setRank: (rank: Rank) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  setHasOnboarded: (value: boolean) => Promise<void>;
}

function calcMacroTargets(weightKg: number, goal: Goal): MacroTargets {
  const protein = Math.round(weightKg * 2.2);
  if (goal === 'FAT_LOSS') {
    const calories = Math.round(weightKg * 26);
    return { calories, proteinG: protein, carbsG: Math.round((calories * 0.3) / 4), fatG: Math.round((calories * 0.25) / 9) };
  }
  if (goal === 'MUSCLE_GAIN') {
    const calories = Math.round(weightKg * 35);
    return { calories, proteinG: protein, carbsG: Math.round((calories * 0.45) / 4), fatG: Math.round((calories * 0.25) / 9) };
  }
  const calories = Math.round(weightKg * 30);
  return { calories, proteinG: protein, carbsG: Math.round((calories * 0.4) / 4), fatG: Math.round((calories * 0.25) / 9) };
}

export function buildUserProfile(data: {
  name: string;
  age: number;
  weightKg: number;
  heightCm: number;
  goal: Goal;
  weakArea: WeakArea;
}): UserProfile {
  return {
    id: Date.now().toString(),
    ...data,
    rank: 'E',
    xp: 0,
    streakDays: 0,
    macroTargets: calcMacroTargets(data.weightKg, data.goal),
    createdAt: Date.now(),
  };
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  hasOnboarded: false,

  setProfile: async (profile) => {
    set({ profile });
    await storageSet(STORAGE_KEYS.user, profile);
  },

  updateXP: async (delta) => {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, xp: Math.max(0, profile.xp + delta) };
    set({ profile: updated });
    await storageSet(STORAGE_KEYS.user, updated);
  },

  updateStreak: async (days) => {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, streakDays: days };
    set({ profile: updated });
    await storageSet(STORAGE_KEYS.user, updated);
  },

  setRank: async (rank) => {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, rank };
    set({ profile: updated });
    await storageSet(STORAGE_KEYS.user, updated);
  },

  loadFromStorage: async () => {
    const profile = await storageGet<UserProfile>(STORAGE_KEYS.user);
    const hasOnboarded = (await storageGet<boolean>(STORAGE_KEYS.hasOnboarded)) ?? false;
    set({ profile: profile ?? null, hasOnboarded });
  },

  setHasOnboarded: async (value) => {
    set({ hasOnboarded: value });
    await storageSet(STORAGE_KEYS.hasOnboarded, value);
  },
}));
