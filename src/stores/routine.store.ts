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
          { name: 'Squat',          targetSets: 3, targetReps: '6-8',  targetWeightKg: 100 },
          { name: 'Bench Press',    targetSets: 3, targetReps: '6-8',  targetWeightKg: 80 },
          { name: 'Row',            targetSets: 3, targetReps: '6-8',  targetWeightKg: 70 },
          { name: 'Overhead Press', targetSets: 3, targetReps: '8-10', targetWeightKg: 50 },
          { name: 'Romanian Deadlift', targetSets: 2, targetReps: '10-12', targetWeightKg: 80 },
        ],
      },
      {
        id: 'fb-b',
        name: 'Full Body B',
        exercises: [
          { name: 'Deadlift',       targetSets: 3, targetReps: '4-6',  targetWeightKg: 120 },
          { name: 'Pull Up',        targetSets: 3, targetReps: '6-10' },
          { name: 'Incline Bench',  targetSets: 3, targetReps: '8-12', targetWeightKg: 60 },
          { name: 'Hip Thrust',     targetSets: 3, targetReps: '10-12' },
          { name: 'Bicep Curl',     targetSets: 2, targetReps: '10-12' },
        ],
      },
    ],
  },
];

interface RoutineState {
  splits: Split[];
  pendingDay: RoutineDay | null;

  loadFromStorage: () => Promise<void>;
  addSplit: (name: string) => Promise<Split>;
  deleteSplit: (splitId: string) => Promise<void>;
  addDay: (splitId: string, name: string) => Promise<void>;
  deleteDay: (splitId: string, dayId: string) => Promise<void>;
  addExercise: (splitId: string, dayId: string, ex: RoutineExercise) => Promise<void>;
  removeExercise: (splitId: string, dayId: string, exName: string) => Promise<void>;
  updateExercise: (splitId: string, dayId: string, exName: string, updates: Partial<RoutineExercise>) => Promise<void>;
  setPendingDay: (day: RoutineDay | null) => void;
}

async function persist(splits: Split[]) {
  await storageSet(STORAGE_KEYS.routines, splits);
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  splits: [],
  pendingDay: null,

  loadFromStorage: async () => {
    const stored = await storageGet<Split[]>(STORAGE_KEYS.routines);
    // Merge: keep user splits, keep defaults that user hasn't deleted
    if (!stored) {
      set({ splits: DEFAULT_SPLITS });
      await persist(DEFAULT_SPLITS);
      return;
    }
    // If user already has data: use it (they may have deleted defaults intentionally)
    set({ splits: stored.length > 0 ? stored : DEFAULT_SPLITS });
  },

  addSplit: async (name) => {
    const split: Split = {
      id: `split_${Date.now()}`,
      name,
      days: [],
      createdAt: Date.now(),
    };
    const updated = [...get().splits, split];
    set({ splits: updated });
    await persist(updated);
    return split;
  },

  deleteSplit: async (splitId) => {
    const updated = get().splits.filter((s) => s.id !== splitId);
    set({ splits: updated });
    await persist(updated);
  },

  addDay: async (splitId, name) => {
    const day: RoutineDay = {
      id: `day_${Date.now()}`,
      name,
      exercises: [],
    };
    const updated = get().splits.map((s) =>
      s.id !== splitId ? s : { ...s, days: [...s.days, day] }
    );
    set({ splits: updated });
    await persist(updated);
  },

  deleteDay: async (splitId, dayId) => {
    const updated = get().splits.map((s) =>
      s.id !== splitId ? s : { ...s, days: s.days.filter((d) => d.id !== dayId) }
    );
    set({ splits: updated });
    await persist(updated);
  },

  addExercise: async (splitId, dayId, ex) => {
    const updated = get().splits.map((s) =>
      s.id !== splitId ? s : {
        ...s,
        days: s.days.map((d) =>
          d.id !== dayId ? d : { ...d, exercises: [...d.exercises, ex] }
        ),
      }
    );
    set({ splits: updated });
    await persist(updated);
  },

  removeExercise: async (splitId, dayId, exName) => {
    const updated = get().splits.map((s) =>
      s.id !== splitId ? s : {
        ...s,
        days: s.days.map((d) =>
          d.id !== dayId ? d : { ...d, exercises: d.exercises.filter((e) => e.name !== exName) }
        ),
      }
    );
    set({ splits: updated });
    await persist(updated);
  },

  updateExercise: async (splitId, dayId, exName, updates) => {
    const updated = get().splits.map((s) =>
      s.id !== splitId ? s : {
        ...s,
        days: s.days.map((d) =>
          d.id !== dayId ? d : {
            ...d,
            exercises: d.exercises.map((e) =>
              e.name !== exName ? e : { ...e, ...updates }
            ),
          }
        ),
      }
    );
    set({ splits: updated });
    await persist(updated);
  },

  setPendingDay: (day) => set({ pendingDay: day }),
}));
