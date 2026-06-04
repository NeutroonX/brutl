import { createMMKV } from 'react-native-mmkv';

export const mmkv = createMMKV({ id: 'brutl' });

export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const raw = mmkv.getString(key);
    if (raw === undefined) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  mmkv.set(key, JSON.stringify(value));
}

export async function storageRemove(key: string): Promise<void> {
  mmkv.remove(key);
}

export const STORAGE_KEYS = {
  user: 'brutl:user',
  roastLog: 'brutl:roast_log',
  workoutLog: 'brutl:workout_log',
  dietLog: 'brutl:diet_log',
  hasOnboarded: 'brutl:has_onboarded',
  watchVitals: 'brutl:watch_vitals',
  lastOpenDate: 'brutl:last_open_date',
  routines: 'brutl:routines',
  exerciseApiUsage: 'brutl:exercise_api_usage',
  dietFavourites: 'brutl:diet_favourites',
  avatarUri: 'brutl:avatar_uri',
  apiKeys: 'brutl:api_keys',
  water: 'brutl:water',
  medications: 'brutl:medications',
  medicationTaken: 'brutl:medication_taken',
  weightLog: 'brutl:weight_log',
  syncQueue: 'brutl:sync_queue',
  queryCache: 'brutl:query_cache',
} as const;
