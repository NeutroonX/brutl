import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import type { RoastEntry, RoastTrigger } from '@/types';

interface RoastState {
  log: RoastEntry[];
  currentRoast: string;
  correctionText: string;
  isStreaming: boolean;
  appendStreamChunk: (chunk: string) => void;
  startStream: () => void;
  finishStream: (correction: string, triggerType: RoastTrigger) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useRoastStore = create<RoastState>((set, get) => ({
  log: [],
  currentRoast: '',
  correctionText: '',
  isStreaming: false,

  startStream: () => set({ currentRoast: '', correctionText: '', isStreaming: true }),

  appendStreamChunk: (chunk) =>
    set((s) => ({ currentRoast: s.currentRoast + chunk })),

  finishStream: async (correction, triggerType) => {
    const { currentRoast, log } = get();
    const entry: RoastEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      triggerType,
      roastText: currentRoast,
      correctionText: correction,
    };
    const updated = [entry, ...log].slice(0, 100);
    set({ log: updated, correctionText: correction, isStreaming: false });
    await storageSet(STORAGE_KEYS.roastLog, updated);
  },

  loadFromStorage: async () => {
    const log = await storageGet<RoastEntry[]>(STORAGE_KEYS.roastLog);
    if (log) set({ log });
  },
}));
