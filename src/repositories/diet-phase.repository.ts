import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { getEffectiveMacros, getTodayCycleDayType } from '@/lib/macro-cycling';
import { mmkv, STORAGE_KEYS } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { DietPhase, MealPlanResponse } from '@/types/diet-phase';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const dietPhaseKeys = {
  all: ['dietPhase'] as const,
  active: (userId: string) => [...dietPhaseKeys.all, 'active', userId] as const,
  mealPlan: (userId: string, date: string) =>
    [...dietPhaseKeys.all, 'mealPlan', userId, date] as const,
};

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const MacroTargetsSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});

const CyclePatternSchema = z.object({
  days: z.array(z.enum(['HIGH', 'MODERATE', 'LOW'])).min(1).max(7),
});

// Validates the raw snake_case Supabase row; coerces bigint timestamps to numbers.
const DbDietPhaseRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  phase: z.enum(['BULK', 'CUT', 'MAINTAIN']),
  start_date: z.string(),
  end_date: z.string().nullable(),
  macro_targets: MacroTargetsSchema,
  cycle_pattern: CyclePatternSchema,
  created_at: z.coerce.number(),
  updated_at: z.coerce.number(),
});

export const DietPhaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  phase: z.enum(['BULK', 'CUT', 'MAINTAIN']),
  startDate: z.string(),
  endDate: z.string().nullable(),
  macroTargets: MacroTargetsSchema,
  cyclePattern: CyclePatternSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  syncedAt: z.number().optional(),
});

const MealSuggestionSchema = z.object({
  name: z.string(),
  timeOfDay: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  ingredients: z.array(z.string()),
  prepMinutes: z.number(),
});

export const MealPlanResponseSchema = z.object({
  dayType: z.enum(['HIGH', 'MODERATE', 'LOW']),
  totalCalories: z.number(),
  totalProteinG: z.number(),
  totalCarbsG: z.number(),
  totalFatG: z.number(),
  meals: z.array(MealSuggestionSchema).min(2).max(6),
  coachNote: z.string(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToDietPhase(raw: unknown): DietPhase {
  const row = DbDietPhaseRowSchema.parse(raw);
  return {
    id: row.id,
    userId: row.user_id,
    phase: row.phase,
    startDate: row.start_date,
    endDate: row.end_date,
    macroTargets: row.macro_targets,
    cyclePattern: row.cycle_pattern,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dietPhaseToRow(phase: Omit<DietPhase, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt'>) {
  return {
    user_id: phase.userId,
    phase: phase.phase,
    start_date: phase.startDate,
    end_date: phase.endDate ?? null,
    macro_targets: phase.macroTargets,
    cycle_pattern: phase.cyclePattern,
  };
}

function readCachedPhase(): DietPhase | undefined {
  try {
    const raw = mmkv.getString(STORAGE_KEYS.dietPhase);
    if (!raw) return undefined;
    const parsed = DietPhaseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedPhase(phase: DietPhase) {
  mmkv.set(STORAGE_KEYS.dietPhase, JSON.stringify(phase));
}

function readCachedMealPlan(today: string): MealPlanResponse | undefined {
  try {
    const raw = mmkv.getString(STORAGE_KEYS.mealPlan);
    if (!raw) return undefined;
    const obj = JSON.parse(raw) as { date: string; data: unknown };
    if (obj.date !== today) return undefined;
    const parsed = MealPlanResponseSchema.safeParse(obj.data);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedMealPlan(today: string, plan: MealPlanResponse) {
  mmkv.set(STORAGE_KEYS.mealPlan, JSON.stringify({ date: today, data: plan }));
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDietPhase(userId: string | undefined) {
  return useQuery({
    queryKey: dietPhaseKeys.active(userId ?? ''),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    initialData: () => readCachedPhase(),
    queryFn: async (): Promise<DietPhase | null> => {
      const { data, error } = await supabase
        .from('diet_phases')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') return null; // no rows
      if (error) throw error;

      const phase = rowToDietPhase(data);
      writeCachedPhase(phase);
      return phase;
    },
  });
}

export function useSetDietPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      phase: Omit<DietPhase, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt'>,
    ): Promise<DietPhase> => {
      const { data, error } = await supabase
        .from('diet_phases')
        .insert(dietPhaseToRow(phase))
        .select()
        .single();

      if (error) throw error;
      return rowToDietPhase(data);
    },

    onMutate: async (newPhase) => {
      const queryKey = dietPhaseKeys.active(newPhase.userId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<DietPhase | null>(queryKey);

      const optimistic: DietPhase = {
        ...newPhase,
        id: 'optimistic',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      queryClient.setQueryData(queryKey, optimistic);
      writeCachedPhase(optimistic);

      return { previous, queryKey };
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      queryClient.setQueryData(context.queryKey, context.previous ?? null);
      if (context.previous) {
        writeCachedPhase(context.previous);
      } else {
        mmkv.remove(STORAGE_KEYS.dietPhase);
      }
    },

    onSuccess: (saved, vars) => {
      const queryKey = dietPhaseKeys.active(vars.userId);
      writeCachedPhase(saved);
      queryClient.setQueryData(queryKey, saved);
    },
  });
}

export function useMealPlan(userId: string | undefined, phase: DietPhase | null | undefined) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: dietPhaseKeys.mealPlan(userId ?? '', today),
    enabled: !!userId && !!phase,
    staleTime: 1000 * 60 * 60 * 4,
    initialData: () => readCachedMealPlan(today),
    queryFn: async (): Promise<MealPlanResponse> => {
      const effectiveMacros = getEffectiveMacros(phase!);
      const dayType = getTodayCycleDayType(phase!);

      const { data, error } = await supabase.functions.invoke('meal-plan', {
        body: { phase: phase!.phase, dayType, macroTargets: effectiveMacros },
      });

      if (error) throw error;

      const validated = MealPlanResponseSchema.safeParse(data);
      if (!validated.success) throw new Error('Invalid meal plan from edge function');

      writeCachedMealPlan(today, validated.data);
      return validated.data;
    },
  });
}

export function invalidateMealPlan(userId: string, qc: ReturnType<typeof useQueryClient>) {
  const today = new Date().toISOString().split('T')[0];
  mmkv.remove(STORAGE_KEYS.mealPlan);
  qc.invalidateQueries({ queryKey: dietPhaseKeys.mealPlan(userId, today) });
}
