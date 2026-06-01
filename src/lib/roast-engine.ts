import { useRoastStore } from '@/stores/roast.store';
import type { Rank, RoastTrigger, WatchData, WorkoutLog } from '@/types';

export interface RoastPayload {
  triggerType: RoastTrigger;
  sleepHours?: number;
  hrv?: number;
  recoveryScore?: number;
  missedDays?: number;
  lastWorkout?: { exercise: string; weight: number; baseline: number };
  dietCompliance?: number;
  rank: Rank;
  streak: number;
}

export function buildRoastPayload(
  trigger: RoastTrigger,
  rank: Rank,
  streak: number,
  watchData?: WatchData | null,
  lastWorkout?: WorkoutLog | null,
  dietCompliance?: number,
  missedDays?: number
): RoastPayload {
  const payload: RoastPayload = { triggerType: trigger, rank, streak };
  if (watchData) {
    payload.sleepHours = watchData.sleepHours;
    payload.hrv = watchData.hrv;
    payload.recoveryScore = watchData.recoveryScore;
  }
  if (missedDays !== undefined) payload.missedDays = missedDays;
  if (dietCompliance !== undefined) payload.dietCompliance = dietCompliance;
  if (lastWorkout) {
    const topSet = lastWorkout.exercises[0];
    if (topSet) {
      payload.lastWorkout = {
        exercise: topSet.exercise,
        weight: topSet.weightKg,
        baseline: 0,
      };
    }
  }
  return payload;
}

// Streams the roast from Supabase edge function and updates roast store in real-time
export async function streamRoast(payload: RoastPayload): Promise<void> {
  const store = useRoastStore.getState();
  store.startStream();

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fallback mock roast for development without Supabase configured
    await mockRoast(payload);
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/roast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      await mockRoast(payload);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let correction = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              store.appendStreamChunk(parsed.delta?.text ?? '');
            } else if (parsed.type === 'correction') {
              correction = parsed.text ?? '';
            }
          } catch {
            // non-JSON SSE line, skip
          }
        }
      }
    }

    await store.finishStream(correction, payload.triggerType);
  } catch {
    await mockRoast(payload);
  }
}

// Development fallback — remove or disable once Supabase edge function is deployed
async function mockRoast(payload: RoastPayload): Promise<void> {
  const store = useRoastStore.getState();
  const roasts: Record<RoastTrigger, string> = {
    APP_OPEN: `Rank ${payload.rank}. ${payload.streak} days. You opened the app — congratulations on the bare minimum.`,
    MISSED_WORKOUT: `${payload.missedDays ?? 1} missed day${(payload.missedDays ?? 1) > 1 ? 's' : ''}. Champions don't take unplanned rest days. They take planned ones.`,
    OFF_PLAN: `${Math.round((1 - (payload.dietCompliance ?? 1)) * 100)}% off your macros. Your body doesn't care about your excuses.`,
    WEAK_LIFT: `Below your average on ${payload.lastWorkout?.exercise ?? 'that lift'}. Progress doesn't care how tired you are.`,
    POOR_RECOVERY: `HRV at ${payload.hrv ?? '?'}, sleep at ${payload.sleepHours ?? '?'}h. Even depleted, you can do the work — just smarter.`,
  };
  const corrections: Record<RoastTrigger, string> = {
    APP_OPEN: 'Log a workout today. No half-reps.',
    MISSED_WORKOUT: 'Get back on schedule tomorrow. No excuses.',
    OFF_PLAN: 'Prep your meals tonight. One decision eliminates a hundred failures.',
    WEAK_LIFT: 'Add 2.5kg next session. Small increments compound.',
    POOR_RECOVERY: 'Sleep 8h tonight. No screens after 10pm.',
  };

  const text = roasts[payload.triggerType];
  const correction = corrections[payload.triggerType];

  // Simulate streaming character by character
  for (const char of text) {
    store.appendStreamChunk(char);
    await delay(18);
  }
  await store.finishStream(correction, payload.triggerType);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
