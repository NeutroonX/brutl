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
} as const;
