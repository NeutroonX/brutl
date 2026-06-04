import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { mmkv, STORAGE_KEYS } from '@/lib/storage';

const mmkvAsyncAdapter = {
  getItem: async (key: string): Promise<string | null> =>
    mmkv.getString(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    mmkv.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    mmkv.remove(key);
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: mmkvAsyncAdapter,
  key: STORAGE_KEYS.queryCache,
  throttleTime: 1000,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});
