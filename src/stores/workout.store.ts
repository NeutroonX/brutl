import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import type { ExerciseSet, WorkoutLog } from '@/types';

interface WorkoutState {
  logs: WorkoutLog[];
  addLog: (exercises: ExerciseSet[], durationMinutes: number, xpEarned: number) => Promise<WorkoutLog>;
  getRecentLogs: (days: number) => WorkoutLog[];
  getBaselineForExercise: (exercise: string) => number;
  loadFromStorage: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  logs: [],

  addLog: async (exercises, durationMinutes, xpEarned) => {
    const entry: WorkoutLog = {
      id: Date.now().toString(),
      date: Date.now(),
      exercises,
      durationMinutes,
      xpEarned,
    };
    const updated = [entry, ...get().logs];
    set({ logs: updated });
    await storageSet(STORAGE_KEYS.workoutLog, updated);
    return entry;
  },

  getRecentLogs: (days) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return get().logs.filter((l) => l.date >= cutoff);
  },

  getBaselineForExercise: (exercise) => {
    const recent = get().getRecentLogs(30);
    const matches = recent.flatMap((l) =>
      l.exercises.filter((e) => e.exercise.toLowerCase() === exercise.toLowerCase())
    );
    if (matches.length === 0) return 0;
    const avgWeight = matches.reduce((sum, e) => sum + e.weightKg, 0) / matches.length;
    return avgWeight;
  },

  loadFromStorage: async () => {
    const logs = await storageGet<WorkoutLog[]>(STORAGE_KEYS.workoutLog);
    if (logs) set({ logs });
  },
}));
