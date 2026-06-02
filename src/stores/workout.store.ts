import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { useQuestStore } from '@/stores/quest.store';
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

    // Progress daily quest by 50% for logging a workout
    const questStore = useQuestStore.getState();
    await questStore.progressActiveQuest('DAILY', 0.5).catch(() => {});

    // Complete boss quest if any exercise beats its baseline
    const bossQuest = questStore.getActiveByType('BOSS');
    if (bossQuest) {
      for (const ex of exercises) {
        const baseline = get().getBaselineForExercise(ex.exercise);
        if (baseline > 0 && ex.weightKg > baseline) {
          await questStore.progressActiveQuest('BOSS', 1).catch(() => {});
          break;
        }
      }
    }

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
    return matches.reduce((sum, e) => sum + e.weightKg, 0) / matches.length;
  },

  loadFromStorage: async () => {
    const logs = await storageGet<WorkoutLog[]>(STORAGE_KEYS.workoutLog);
    if (logs) set({ logs });
  },
}));
