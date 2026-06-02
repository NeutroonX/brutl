import { create } from 'zustand';

import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { useQuestStore } from '@/stores/quest.store';
import { useDungeonStore } from '@/stores/dungeon.store';
import type { ExerciseSet, WorkoutLog } from '@/types';

interface WorkoutState {
  logs: WorkoutLog[];
  prCount: number; // lifetime exercises beaten above baseline
  addLog: (exercises: ExerciseSet[], durationMinutes: number, xpEarned: number) => Promise<WorkoutLog>;
  getRecentLogs: (days: number) => WorkoutLog[];
  getBaselineForExercise: (exercise: string) => number;
  loadFromStorage: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  logs: [],
  prCount: 0,

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

    // Quest progress — 50% for logging a workout
    const questStore = useQuestStore.getState();
    await questStore.progressActiveQuest('DAILY', 0.5).catch(() => {});

    // Boss quest — check if any exercise beats baseline
    let newPRs = 0;
    for (const ex of exercises) {
      const baseline = get().getBaselineForExercise(ex.exercise);
      if (baseline > 0 && ex.weightKg > baseline) {
        newPRs++;
        await questStore.progressActiveQuest('BOSS', 1).catch(() => {});
        break;
      }
    }

    // Update PR count
    const newPRCount = get().prCount + newPRs;
    if (newPRs > 0) set({ prCount: newPRCount });

    // Dungeon progress
    await useDungeonStore.getState().onWorkoutLogged(durationMinutes).catch(() => {});

    // Shadow quest triggers
    const hour = new Date().getHours();
    const logsToday = get().getRecentLogs(1).filter(
      (l) => new Date(l.date).toDateString() === new Date().toDateString()
    ).length;
    const workoutsThisWeek = get().getRecentLogs(7).length;

    await questStore.checkShadowTriggers({
      workoutHour: hour,
      workoutsThisWeek,
      prCount: newPRCount,
      workoutsToday: logsToday,
    }).catch(() => {});

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
