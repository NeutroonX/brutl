import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { mmkv } from '@/lib/storage';

const SUPABASE_STORAGE_PREFIX = 'supabase:auth:';

const mmkvAuthAdapter: SupportedStorage = {
  getItem: (key) =>
    Promise.resolve(mmkv.getString(SUPABASE_STORAGE_PREFIX + key) ?? null),
  setItem: (key, value) => {
    mmkv.set(SUPABASE_STORAGE_PREFIX + key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    mmkv.remove(SUPABASE_STORAGE_PREFIX + key);
    return Promise.resolve();
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvAuthAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
