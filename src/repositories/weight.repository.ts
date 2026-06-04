import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import { isConnected } from '@/lib/netInfo';
import { useSyncStore } from '@/stores/sync.store';
import type { WeightEntry } from '@/types';

const WeightEntrySchema = z.object({
  id: z.string(),
  date: z.number(),
  weightKg: z.number(),
  updated_at: z.number().optional(),
  synced_at: z.number().optional(),
});

const WeightEntriesSchema = z.array(WeightEntrySchema);

export const weightKeys = {
  all: ['weight'] as const,
  entries: () => [...weightKeys.all, 'entries'] as const,
};

async function fetchWeightEntries(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('id, date, weightKg:weight_kg, updated_at, synced_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365);

  if (error) throw new Error(error.message);
  return WeightEntriesSchema.parse(data);
}

export function useWeightEntries(userId: string | undefined) {
  return useQuery({
    queryKey: weightKeys.entries(),
    queryFn: () => fetchWeightEntries(userId!),
    enabled: !!userId,
  });
}

interface AddWeightParams {
  userId: string;
  weightKg: number;
}

function todayStart(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function useAddWeightEntry() {
  const queryClient = useQueryClient();
  const enqueue = useSyncStore((s) => s.enqueue);

  return useMutation({
    mutationFn: async ({ userId, weightKg }: AddWeightParams): Promise<WeightEntry> => {
      const now = Date.now();
      const dayStart = todayStart();
      const entry: WeightEntry = {
        id: `weight:${userId}:${dayStart}`,
        date: dayStart,
        weightKg,
        updated_at: now,
      };

      const online = await isConnected();

      if (online) {
        const { error } = await supabase
          .from('weight_entries')
          .upsert(
            { id: entry.id, date: entry.date, weight_kg: weightKg, user_id: userId, updated_at: now },
            { onConflict: 'id' },
          );

        if (error) throw new Error(error.message);
        return { ...entry, synced_at: Date.now() };
      }

      enqueue({
        domain: 'weight',
        op: 'upsert',
        table: 'weight_entries',
        payload: { id: entry.id, date: entry.date, weight_kg: weightKg, user_id: userId, updated_at: now },
        updated_at: now,
      });

      return entry;
    },

    onMutate: async ({ userId, weightKg }) => {
      await queryClient.cancelQueries({ queryKey: weightKeys.entries() });
      const previous = queryClient.getQueryData<WeightEntry[]>(weightKeys.entries());
      const dayStart = todayStart();

      queryClient.setQueryData<WeightEntry[]>(weightKeys.entries(), (old = []) => {
        const withoutToday = old.filter((e) => e.date !== dayStart);
        const optimistic: WeightEntry = {
          id: `weight:${userId}:${dayStart}`,
          date: dayStart,
          weightKg,
          updated_at: Date.now(),
        };
        return [optimistic, ...withoutToday].sort((a, b) => b.date - a.date);
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(weightKeys.entries(), context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: weightKeys.entries() });
    },
  });
}
