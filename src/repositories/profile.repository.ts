import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  weightKg: z.number(),
  heightCm: z.number(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
  goal: z.enum(['FAT_LOSS', 'MUSCLE_GAIN', 'RECOMP']),
  weakArea: z.array(
    z.enum(['UPPER', 'LOWER', 'CARDIO', 'DIET', 'SLEEP', 'MENTAL', 'CONSISTENCY', 'FLEXIBILITY']),
  ),
  rank: z.enum(['E', 'D', 'C', 'B', 'A', 'S']),
  xp: z.number(),
  streakDays: z.number(),
  lastActiveDate: z.number().nullable(),
  macroTargets: z.object({
    calories: z.number(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
  goalWeightKg: z.number().optional(),
  createdAt: z.number(),
  updated_at: z.number().optional(),
  synced_at: z.number().optional(),
});

export const profileKeys = {
  all: ['profile'] as const,
  me: (userId: string) => [...profileKeys.all, userId] as const,
};

// Full implementation in Phase 1
