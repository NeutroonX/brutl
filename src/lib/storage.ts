import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function storageRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const STORAGE_KEYS = {
  user: 'brutl:user',
  roastLog: 'brutl:roast_log',
  workoutLog: 'brutl:workout_log',
  dietLog: 'brutl:diet_log',
  quests: 'brutl:quests',
  hasOnboarded: 'brutl:has_onboarded',
  watchVitals: 'brutl:watch_vitals',
  lastOpenDate: 'brutl:last_open_date',
  dungeon: 'brutl:dungeon',
  shadows: 'brutl:shadows',
  routines: 'brutl:routines',
} as const;
