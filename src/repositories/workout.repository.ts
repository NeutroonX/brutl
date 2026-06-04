import { z } from 'zod';

export const WorkoutLogSchema = z.object({
  id: z.string(),
  date: z.number(),
  exercises: z.array(
    z.object({
      exercise: z.string(),
      sets: z.number(),
      reps: z.number(),
      weightKg: z.number(),
    }),
  ),
  durationMinutes: z.number(),
  xpEarned: z.number(),
  updated_at: z.number().optional(),
  synced_at: z.number().optional(),
});

export const workoutKeys = {
  all: ['workout'] as const,
  logs: () => [...workoutKeys.all, 'logs'] as const,
  recent: (days: number) => [...workoutKeys.all, 'recent', days] as const,
};

// Full implementation in Phase 1
