import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { getRankFromXP } from '@/lib/rank';
import { calcStreakBonus } from '@/lib/xp';
import type { ActivityLevel, Gender, Goal, MacroTargets, Rank, UserProfile, WeakArea } from '@/types';

// Mifflin-St Jeor BMR → TDEE → goal-adjusted macro targets
// Research basis: Mifflin MQ et al. (1990), ACSM protein guidelines (1.6–2.2g/kg)
export function calcMacroTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activity: ActivityLevel,
  goal: Goal,
): MacroTargets {
  // BMR (Mifflin-St Jeor)
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = gender === 'MALE' ? base + 5 : gender === 'FEMALE' ? base - 161 : base - 78;

  // TDEE
  const activityMultipliers: Record<ActivityLevel, number> = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9,
  };
  const tdee = Math.round(bmr * activityMultipliers[activity]);

  // Calorie target
  const calories =
    goal === 'FAT_LOSS'    ? tdee - 500  :  // ~0.5 kg/week deficit
    goal === 'MUSCLE_GAIN' ? tdee + 250  :  // lean bulk surplus
    tdee;                                    // recomp = maintenance

  // Protein: 2.2g/kg fat loss (preserve muscle), 1.8g/kg bulk, 2.0g/kg recomp
  const proteinG =
    goal === 'FAT_LOSS'    ? Math.round(weightKg * 2.2) :
    goal === 'MUSCLE_GAIN' ? Math.round(weightKg * 1.8) :
    Math.round(weightKg * 2.0);

  // Fat: 0.9g/kg, min 20% of calories
  const fatG = Math.max(Math.round(weightKg * 0.9), Math.round((calories * 0.2) / 9));

  // Carbs: fill remainder
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { calories, proteinG, carbsG, fatG };
}

interface UserState {
  profile: UserProfile | null;
  hasOnboarded: boolean;
  pendingRankUp: Rank | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  updateXP: (delta: number) => Promise<void>;
  updateStreak: (days: number) => Promise<void>;
  checkAndUpdateStreak: () => Promise<number>;
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
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  weakArea: WeakArea[];
}): UserProfile {
  return {
    id: Date.now().toString(),
    ...data,
    rank: 'E',
    xp: 0,
    streakDays: 0,
    lastActiveDate: null,
    macroTargets: calcMacroTargets(data.weightKg, data.heightCm, data.age, data.gender, data.activityLevel, data.goal),
    createdAt: Date.now(),
  };
}

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function todayDateKey(): string {
  return dateKey(Date.now());
}

function yesterdayDateKey(): string {
  return dateKey(Date.now() - 86_400_000);
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

  checkAndUpdateStreak: async (): Promise<number> => {
    const { profile } = get();
    if (!profile) return 0;
    const today = todayDateKey();
    const yesterday = yesterdayDateKey();
    const lastOpen = profile.lastActiveDate ? dateKey(profile.lastActiveDate) : null;

    if (lastOpen === today) return 0; // already opened today

    const now = Date.now();

    if (lastOpen === yesterday) {
      const newStreak = profile.streakDays + 1;
      const bonus = calcStreakBonus(newStreak);
      const newXP = Math.max(0, profile.xp + bonus);
      const newRank = getRankFromXP(newXP);
      const rankChanged = newRank !== profile.rank;
      const updated = { ...profile, streakDays: newStreak, xp: newXP, rank: newRank, lastActiveDate: now };
      set({
        profile: updated,
        pendingRankUp: rankChanged ? newRank : get().pendingRankUp,
      });
      await storageSet(STORAGE_KEYS.user, updated);
      return bonus;
    } else {
      // first open ever, or streak broken
      const updated = { ...profile, streakDays: lastOpen === null ? 1 : 1, lastActiveDate: now };
      set({ profile: updated });
      await storageSet(STORAGE_KEYS.user, updated);
    }
    return 0;
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
