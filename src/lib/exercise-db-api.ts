import { Alert } from 'react-native';
import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';

const RAPID_API_KEY = process.env.EXPO_PUBLIC_RAPID_API_KEY ?? '';
const BASE_URL = 'https://exercisedb.p.rapidapi.com';

const DAILY_LIMIT = 35;
const DAILY_WARN = 30;
const SESSION_LIMIT = 20;
const SESSION_WARN = 17;

export interface ExerciseDBEntry {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  description: string;
  difficulty: string;
  category: string;
}

interface ApiUsage {
  dateKey: string;
  dailyCount: number;
}

// ─── In-memory cache (session-scoped) ────────────────────────────────────────

let sessionCount = 0;
let dailyWarnShown = false;
let sessionWarnShown = false;
const queryCache = new Map<string, ExerciseDBEntry[]>();
const nameToEntry = new Map<string, ExerciseDBEntry>();

// ─── Rate limiting ────────────────────────────────────────────────────────────

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

async function getUsage(): Promise<ApiUsage> {
  const stored = await storageGet<ApiUsage>(STORAGE_KEYS.exerciseApiUsage);
  if (!stored || stored.dateKey !== todayKey()) {
    return { dateKey: todayKey(), dailyCount: 0 };
  }
  return stored;
}

async function canRequest(): Promise<boolean> {
  if (sessionCount >= SESSION_LIMIT) {
    Alert.alert(
      'Session Limit Reached',
      `You've used all ${SESSION_LIMIT} exercise database lookups this session. Restart the app to make more.`
    );
    return false;
  }

  const usage = await getUsage();
  if (usage.dailyCount >= DAILY_LIMIT) {
    Alert.alert(
      'Daily Limit Reached',
      `All ${DAILY_LIMIT} exercise database requests are used for today. Try again tomorrow.`
    );
    return false;
  }

  sessionCount++;
  const newUsage: ApiUsage = { dateKey: todayKey(), dailyCount: usage.dailyCount + 1 };
  await storageSet(STORAGE_KEYS.exerciseApiUsage, newUsage);

  if (!sessionWarnShown && sessionCount >= SESSION_WARN) {
    sessionWarnShown = true;
    Alert.alert('Almost at Session Limit', `Only ${SESSION_LIMIT - sessionCount} exercise lookups left this session.`);
  }
  if (!dailyWarnShown && newUsage.dailyCount >= DAILY_WARN) {
    dailyWarnShown = true;
    Alert.alert('Approaching Daily Limit', `Only ${DAILY_LIMIT - newUsage.dailyCount} exercise database requests left today.`);
  }

  return true;
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T | null> {
  const allowed = await canRequest();
  if (!allowed) return null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
        'x-rapidapi-key': RAPID_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`[ExerciseDB] ${res.status} ${res.statusText} — ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[ExerciseDB] fetch error:`, e);
    return null;
  }
}

function cacheEntries(entries: ExerciseDBEntry[]) {
  for (const e of entries) nameToEntry.set(e.name.toLowerCase(), e);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchExerciseDB(query: string): Promise<ExerciseDBEntry[]> {
  const key = query.toLowerCase().trim();
  if (queryCache.has(key)) return queryCache.get(key)!;

  const results = await apiFetch<ExerciseDBEntry[]>(
    `/exercises/name/${encodeURIComponent(key)}?limit=20`
  );
  if (!results) return [];

  cacheEntries(results);
  queryCache.set(key, results);
  return results;
}

export async function getExerciseByName(name: string): Promise<ExerciseDBEntry | null> {
  const lower = name.toLowerCase();
  if (nameToEntry.has(lower)) return nameToEntry.get(lower)!;

  const results = await searchExerciseDB(name);
  return results.find((e) => e.name.toLowerCase() === lower) ?? results[0] ?? null;
}

export function getExerciseFromCache(name: string): ExerciseDBEntry | null {
  return nameToEntry.get(name.toLowerCase()) ?? null;
}

export function searchFromCache(query: string): ExerciseDBEntry[] {
  const q = query.toLowerCase().trim();
  if (queryCache.has(q)) return queryCache.get(q)!;
  return [...nameToEntry.values()].filter((e) => e.name.toLowerCase().includes(q));
}

export async function getRemainingRequests(): Promise<{ daily: number; session: number }> {
  const usage = await getUsage();
  return {
    daily: Math.max(0, DAILY_LIMIT - usage.dailyCount),
    session: Math.max(0, SESSION_LIMIT - sessionCount),
  };
}
