import { create } from 'zustand';

import { initHealthConnect, isHealthConnectAvailable, readVitals, requestHealthPermissions, type VitalsSnapshot } from '@/lib/health-connect';
import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';

interface WatchState {
  vitals: VitalsSnapshot;
  hasPermission: boolean;
  isAvailable: boolean;
  lastSyncAt: number | null;
  isSyncing: boolean;
  requestPermissions: () => Promise<boolean>;
  syncVitals: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

const NULL_VITALS: VitalsSnapshot = {
  restingHR: null,
  hrv: null,
  sleepHours: null,
  steps: null,
  recoveryScore: null,
};

export const useWatchStore = create<WatchState>((set, get) => ({
  vitals: NULL_VITALS,
  hasPermission: false,
  isAvailable: false,
  lastSyncAt: null,
  isSyncing: false,

  requestPermissions: async () => {
    const available = await isHealthConnectAvailable();
    if (!available) { set({ isAvailable: false }); return false; }

    await initHealthConnect();
    const granted = await requestHealthPermissions();
    set({ isAvailable: true, hasPermission: granted });
    return granted;
  },

  syncVitals: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      const vitals = await readVitals();
      const lastSyncAt = Date.now();
      set({ vitals, lastSyncAt });
      await storageSet(STORAGE_KEYS.watchVitals, { vitals, lastSyncAt });
    } finally {
      set({ isSyncing: false });
    }
  },

  loadFromStorage: async () => {
    try {
      const saved = await storageGet<{ vitals: VitalsSnapshot; lastSyncAt: number }>(STORAGE_KEYS.watchVitals);
      if (saved) set({ vitals: saved.vitals, lastSyncAt: saved.lastSyncAt });
    } catch { /* storage unavailable */ }

    try {
      const available = await isHealthConnectAvailable();
      set({ isAvailable: available });
    } catch { /* health connect unavailable */ }
  },
}));
