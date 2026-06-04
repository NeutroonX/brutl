import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '@/lib/supabase';
import { isConnected } from '@/lib/netInfo';
import { mmkv, STORAGE_KEYS } from '@/lib/storage';

export type MutationDomain = 'weight' | 'workout' | 'diet' | 'profile';
export type MutationOp = 'upsert' | 'delete';

export interface QueuedMutation {
  id: string;
  domain: MutationDomain;
  op: MutationOp;
  table: string;
  payload: Record<string, unknown>;
  updated_at: number;
  attempts: number;
  createdAt: number;
}

interface SyncState {
  queue: QueuedMutation[];
  isDraining: boolean;
  lastDrainAt: number | null;
  lastError: string | null;

  enqueue: (mutation: Omit<QueuedMutation, 'id' | 'attempts' | 'createdAt'>) => void;
  dequeue: (id: string) => void;
  drainQueue: () => Promise<void>;
  hydrate: () => void;
}

function persistQueue(queue: QueuedMutation[]): void {
  mmkv.set(STORAGE_KEYS.syncQueue, JSON.stringify(queue));
}

function readPersistedQueue(): QueuedMutation[] {
  try {
    const raw = mmkv.getString(STORAGE_KEYS.syncQueue);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  queue: [],
  isDraining: false,
  lastDrainAt: null,
  lastError: null,

  hydrate: () => {
    set({ queue: readPersistedQueue() });
  },

  enqueue: (mutation) => {
    const entry: QueuedMutation = {
      ...mutation,
      id: `${mutation.domain}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      attempts: 0,
      createdAt: Date.now(),
    };
    const queue = [...get().queue, entry];
    set({ queue });
    persistQueue(queue);
  },

  dequeue: (id) => {
    const queue = get().queue.filter((m) => m.id !== id);
    set({ queue });
    persistQueue(queue);
  },

  drainQueue: async () => {
    if (get().isDraining) return;
    const online = await isConnected();
    if (!online) return;

    set({ isDraining: true, lastError: null });

    try {
      const pending = [...get().queue];

      for (const mutation of pending) {
        try {
          const { op, table, payload } = mutation;

          if (op === 'upsert') {
            const { error } = await supabase
              .from(table)
              .upsert(payload, { onConflict: 'id' });

            if (error) {
              const isConflict = error.code === '23505' || error.message.includes('conflict');
              const updated: QueuedMutation = { ...mutation, attempts: mutation.attempts + 1 };

              if (isConflict || updated.attempts > 5) {
                get().dequeue(mutation.id);
              } else {
                const queue = get().queue.map((m) => (m.id === mutation.id ? updated : m));
                set({ queue });
                persistQueue(queue);
              }
              continue;
            }
          }

          if (op === 'delete') {
            const { error } = await supabase
              .from(table)
              .delete()
              .eq('id', payload['id']);

            if (error) {
              const updated: QueuedMutation = { ...mutation, attempts: mutation.attempts + 1 };
              if (updated.attempts > 5) {
                get().dequeue(mutation.id);
              } else {
                const queue = get().queue.map((m) => (m.id === mutation.id ? updated : m));
                set({ queue });
                persistQueue(queue);
              }
              continue;
            }
          }

          get().dequeue(mutation.id);
        } catch {
          const updated: QueuedMutation = { ...mutation, attempts: mutation.attempts + 1 };
          if (updated.attempts > 5) {
            get().dequeue(mutation.id);
          } else {
            const queue = get().queue.map((m) => (m.id === mutation.id ? updated : m));
            set({ queue });
            persistQueue(queue);
          }
        }
      }

      set({ lastDrainAt: Date.now() });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : 'unknown drain error' });
    } finally {
      set({ isDraining: false });
    }
  },
}));

const SYNC_TASK = 'brutl-sync-queue';
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export function registerSyncListeners(): void {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      useSyncStore.getState().drainQueue();
    }
  });
}

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    await useSyncStore.getState().drainQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK);
  if (isRegistered) return;
  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 60 * 15,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
