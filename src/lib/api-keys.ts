import { storageGet, storageSet, STORAGE_KEYS } from './storage';

export type ApiKeyName = 'RAPID_API_KEY' | 'USDA_API_KEY' | 'SUPABASE_ANON_KEY';

type KeyMap = Partial<Record<ApiKeyName, string>>;

let cache: KeyMap = {};

export async function loadApiKeys(): Promise<void> {
  const stored = await storageGet<KeyMap>(STORAGE_KEYS.apiKeys);
  cache = stored ?? {};
}

export function getApiKey(name: ApiKeyName, envDefault: string): string {
  return cache[name] || envDefault;
}

export async function setApiKey(name: ApiKeyName, value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed) {
    cache[name] = trimmed;
  } else {
    delete cache[name];
  }
  await storageSet(STORAGE_KEYS.apiKeys, cache);
}

export function getCachedKeys(): KeyMap {
  return { ...cache };
}
