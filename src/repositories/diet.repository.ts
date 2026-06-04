import { z } from 'zod';

export const DietLogSchema = z.object({
  id: z.string(),
  date: z.number(),
  meals: z.array(
    z.object({
      name: z.string(),
      calories: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      servingG: z.number(),
      loggedAt: z.number().optional(),
    }),
  ),
  totalCalories: z.number(),
  totalProteinG: z.number(),
  totalCarbsG: z.number(),
  totalFatG: z.number(),
  complianceScore: z.number(),
  updated_at: z.number().optional(),
  synced_at: z.number().optional(),
});

export const dietKeys = {
  all: ['diet'] as const,
  logs: () => [...dietKeys.all, 'logs'] as const,
  today: () => [...dietKeys.all, 'today'] as const,
};

// Full implementation in Phase 1
