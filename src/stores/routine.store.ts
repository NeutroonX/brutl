import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import type { RoutineDay, RoutineExercise, Split } from '@/types';

const DEFAULT_SPLITS: Split[] = [
  {
    id: 'ppl',
    name: 'PPL',
    createdAt: 0,
    days: [
      {
        id: 'ppl-push',
        name: 'Push A',
        exercises: [
          { name: 'Bench Press',       targetSets: 4, targetReps: '6-10',  targetWeightKg: 80 },
          { name: 'Incline Bench',      targetSets: 3, targetReps: '8-12',  targetWeightKg: 60 },
          { name: 'Overhead Press',     targetSets: 3, targetReps: '8-12',  targetWeightKg: 50 },
          { name: 'Lateral Raise',      targetSets: 4, targetReps: '12-15' },
          { name: 'Tricep Pushdown',    targetSets: 3, targetReps: '10-15' },
        ],
      },
      {
        id: 'ppl-pull',
        name: 'Pull A',
        exercises: [
          { name: 'Deadlift',       targetSets: 3, targetReps: '4-6',  targetWeightKg: 120 },
          { name: 'Pull Up',        targetSets: 4, targetReps: '6-10' },
          { name: 'Row',            targetSets: 4, targetReps: '8-12',  targetWeightKg: 70 },
          { name: 'Face Pull',      targetSets: 3, targetReps: '12-15' },
          { name: 'Bicep Curl',     targetSets: 3, targetReps: '10-15' },
        ],
      },
      {
        id: 'ppl-legs',
        name: 'Legs A',
        exercises: [
          { name: 'Squat',              targetSets: 4, targetReps: '6-10',  targetWeightKg: 100 },
          { name: 'Romanian Deadlift',   targetSets: 3, targetReps: '8-12',  targetWeightKg: 80 },
          { name: 'Leg Press',          targetSets: 3, targetReps: '10-15' },
          { name: 'Leg Curl',           targetSets: 3, targetReps: '10-15' },
          { name: 'Calf Raise',         targetSets: 4, targetReps: '12-20' },
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    createdAt: 0,
    days: [
      {
        id: 'ul-upper',
        name: 'Upper A',
        exercises: [
          { name: 'Bench Press',    targetSets: 4, targetReps: '6-8',  targetWeightKg: 80 },
          { name: 'Row',            targetSets: 4, targetReps: '6-8',  targetWeightKg: 70 },
          { name: 'Overhead Press', targetSets: 3, targetReps: '8-12', targetWeightKg: 50 },
          { name: 'Pull Up',        targetSets: 3, targetReps: '8-12' },
          { name: 'Lateral Raise',  targetSets: 3, targetReps: '12-15' },
          { name: 'Bicep Curl',     targetSets: 3, targetReps: '10-15' },
        ],
      },
      {
        id: 'ul-lower',
        name: 'Lower A',
        exercises: [
          { name: 'Squat',             targetSets: 4, targetReps: '6-8',  targetWeightKg: 100 },
          { name: 'Romanian Deadlift',  targetSets: 3, targetReps: '8-10', targetWeightKg: 80 },
          { name: 'Leg Press',         targetSets: 3, targetReps: '10-12' },
          { name: 'Leg Curl',          targetSets: 3, targetReps: '10-12' },
          { name: 'Hip Thrust',        targetSets: 3, targetReps: '10-15' },
          { name: 'Calf Raise',        targetSets: 4, targetReps: '15-20' },
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    createdAt: 0,
    days: [
      {
        id: 'fb-a',
        name: 'Full Body A',
        exercises: [
          { name: 'Squat',             targetSets: 3, targetReps: '6-8',   targetWeightKg: 100 },
          { name: 'Bench Press',       targetSets: 3, targetReps: '6-8',   targetWeightKg: 80 },
          { name: 'Row',               targetSets: 3, targetReps: '6-8',   targetWeightKg: 70 },
          { name: 'Overhead Press',    targetSets: 3, targetReps: '8-10',  targetWeightKg: 50 },
          { name: 'Romanian Deadlift', targetSets: 2, targetReps: '10-12', targetWeightKg: 80 },
        ],
      },
      {
        id: 'fb-b',
        name: 'Full Body B',
        exercises: [
          { name: 'Deadlift',      targetSets: 3, targetReps: '4-6',   targetWeightKg: 120 },
          { name: 'Pull Up',       targetSets: 3, targetReps: '6-10' },
          { name: 'Incline Bench', targetSets: 3, targetReps: '8-12',  targetWeightKg: 60 },
          { name: 'Hip Thrust',    targetSets: 3, targetReps: '10-12' },
          { name: 'Bicep Curl',    targetSets: 2, targetReps: '10-12' },
        ],
      },
    ],
  },
];

interface PersistedRoutines {
  splits: Split[];
  activeSplitId: string | null;
  lastStarted: Record<string, number>;
}

interface RoutineState {
  splits: Split[];
  pendingDay: RoutineDay | null;
  activeSplitId: string | null;
  lastStarted: Record<string, number>; // dayId → timestamp

  loadFromStorage: () => Promise<void>;
  addSplit: (name: string) => Promise<Split>;
  deleteSplit: (splitId: string) => Promise<void>;
  addDay: (splitId: string, name: string) => Promise<void>;
  deleteDay: (splitId: string, dayId: string) => Promise<void>;
  addExercise: (splitId: string, dayId: string, ex: RoutineExercise) => Promise<void>;
  removeExercise: (splitId: string, dayId: string, exName: string) => Promise<void>;
  updateExercise: (splitId: string, dayId: string, exName: string, updates: Partial<RoutineExercise>) => Promise<void>;
  setPendingDay: (day: RoutineDay | null) => void;
  setActiveSplit: (splitId: string | null) => Promise<void>;
}

function snapshot(get: () => RoutineState): PersistedRoutines {
  const { splits, activeSplitId, lastStarted } = get();
  return { splits, activeSplitId, lastStarted };
}

async function save(get: () => RoutineState) {
  await storageSet(STORAGE_KEYS.routines, snapshot(get));
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  splits: [],
  pendingDay: null,
  activeSplitId: null,
  lastStarted: {},

  loadFromStorage: async () => {
    const raw = await storageGet<Split[] | PersistedRoutines>(STORAGE_KEYS.routines);
    if (!raw) {
      const data: PersistedRoutines = { splits: DEFAULT_SPLITS, activeSplitId: null, lastStarted: {} };
      set(data);
      await storageSet(STORAGE_KEYS.routines, data);
      return;
    }
    // Migrate old plain-array format
    if (Array.isArray(raw)) {
      const data: PersistedRoutines = {
        splits: raw.length > 0 ? raw : DEFAULT_SPLITS,
        activeSplitId: null,
        lastStarted: {},
      };
      set(data);
      await storageSet(STORAGE_KEYS.routines, data);
      return;
    }
    set({
      splits: raw.splits.length > 0 ? raw.splits : DEFAULT_SPLITS,
      activeSplitId: raw.activeSplitId ?? null,
      lastStarted: raw.lastStarted ?? {},
    });
  },

  addSplit: async (name) => {
    const split: Split = { id: `split_${Date.now()}`, name, days: [], createdAt: Date.now() };
    set({ splits: [...get().splits, split] });
    await save(get);
    return split;
  },

  deleteSplit: async (splitId) => {
    const activeSplitId = get().activeSplitId === splitId ? null : get().activeSplitId;
    set({ splits: get().splits.filter((s) => s.id !== splitId), activeSplitId });
    await save(get);
  },

  addDay: async (splitId, name) => {
    const day: RoutineDay = { id: `day_${Date.now()}`, name, exercises: [] };
    set({ splits: get().splits.map((s) => s.id !== splitId ? s : { ...s, days: [...s.days, day] }) });
    await save(get);
  },

  deleteDay: async (splitId, dayId) => {
    set({
      splits: get().splits.map((s) =>
        s.id !== splitId ? s : { ...s, days: s.days.filter((d) => d.id !== dayId) }
      ),
    });
    await save(get);
  },

  addExercise: async (splitId, dayId, ex) => {
    set({
      splits: get().splits.map((s) =>
        s.id !== splitId ? s : {
          ...s,
          days: s.days.map((d) =>
            d.id !== dayId ? d : { ...d, exercises: [...d.exercises, ex] }
          ),
        }
      ),
    });
    await save(get);
  },

  removeExercise: async (splitId, dayId, exName) => {
    set({
      splits: get().splits.map((s) =>
        s.id !== splitId ? s : {
          ...s,
          days: s.days.map((d) =>
            d.id !== dayId ? d : { ...d, exercises: d.exercises.filter((e) => e.name !== exName) }
          ),
        }
      ),
    });
    await save(get);
  },

  updateExercise: async (splitId, dayId, exName, updates) => {
    set({
      splits: get().splits.map((s) =>
        s.id !== splitId ? s : {
          ...s,
          days: s.days.map((d) =>
            d.id !== dayId ? d : {
              ...d,
              exercises: d.exercises.map((e) => e.name !== exName ? e : { ...e, ...updates }),
            }
          ),
        }
      ),
    });
    await save(get);
  },

  setPendingDay: (day) => {
    if (day) {
      const lastStarted = { ...get().lastStarted, [day.id]: Date.now() };
      set({ pendingDay: day, lastStarted });
      save(get);
    } else {
      set({ pendingDay: null });
    }
  },

  setActiveSplit: async (splitId) => {
    set({ activeSplitId: splitId });
    await save(get);
  },
}));
