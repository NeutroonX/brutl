import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { getRankFromXP } from '@/lib/rank';
import { calcStreakBonus } from '@/lib/xp';
import type { Goal, MacroTargets, Rank, UserProfile, WeakArea } from '@/types';

interface UserState {
  profile: UserProfile | null;
  hasOnboarded: boolean;
  pendingRankUp: Rank | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  updateXP: (delta: number) => Promise<void>;
  updateStreak: (days: number) => Promise<void>;
  checkAndUpdateStreak: () => Promise<void>;
  setRank: (rank: Rank) => Promise<void>;
  clearPendingRankUp: () => void;
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

function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function yesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  hasOnboarded: false,
  pendingRankUp: null,

  setProfile: async (profile) => {
    set({ profile });
    await storageSet(STORAGE_KEYS.user, profile);
  },

  updateXP: async (delta) => {
    const { profile } = get();
    if (!profile) return;
    const newXP = Math.max(0, profile.xp + delta);
    const newRank = getRankFromXP(newXP);
    const rankChanged = newRank !== profile.rank;
    const updated = { ...profile, xp: newXP, rank: newRank };
    set({
      profile: updated,
      pendingRankUp: rankChanged ? newRank : get().pendingRankUp,
    });
    await storageSet(STORAGE_KEYS.user, updated);
  },

  updateStreak: async (days) => {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, streakDays: days };
    set({ profile: updated });
    await storageSet(STORAGE_KEYS.user, updated);
  },

  checkAndUpdateStreak: async () => {
    const { profile } = get();
    if (!profile) return;
    const today = todayDateKey();
    const yesterday = yesterdayDateKey();
    const lastOpen = await storageGet<string>(STORAGE_KEYS.lastOpenDate);

    await storageSet(STORAGE_KEYS.lastOpenDate, today);

    if (lastOpen === today) return; // already opened today

    if (lastOpen === yesterday) {
      // consecutive day — increment streak
      const newStreak = profile.streakDays + 1;
      const bonus = calcStreakBonus(newStreak);
      const newXP = Math.max(0, profile.xp + bonus);
      const newRank = getRankFromXP(newXP);
      const rankChanged = newRank !== profile.rank;
      const updated = { ...profile, streakDays: newStreak, xp: newXP, rank: newRank };
      set({
        profile: updated,
        pendingRankUp: rankChanged ? newRank : get().pendingRankUp,
      });
      await storageSet(STORAGE_KEYS.user, updated);
    } else if (lastOpen !== null && lastOpen !== today) {
      // missed a day — reset streak to 1
      const updated = { ...profile, streakDays: 1 };
      set({ profile: updated });
      await storageSet(STORAGE_KEYS.user, updated);
    } else {
      // first ever open — set streak to 1
      const updated = { ...profile, streakDays: 1 };
      set({ profile: updated });
      await storageSet(STORAGE_KEYS.user, updated);
    }
  },

  setRank: async (rank) => {
    const { profile } = get();
    if (!profile) return;
    const updated = { ...profile, rank };
    set({ profile: updated });
    await storageSet(STORAGE_KEYS.user, updated);
  },

  clearPendingRankUp: () => set({ pendingRankUp: null }),

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
