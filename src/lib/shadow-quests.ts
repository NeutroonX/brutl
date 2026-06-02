import type { UnlockedShadow } from '@/types';

interface ShadowDefinition {
  triggerId: string;
  title: string;
  description: string;
  xpReward: number;
}

export const SHADOW_DEFINITIONS: ShadowDefinition[] = [
  {
    triggerId: 'early_riser',
    title: 'Early Riser',
    description: 'You logged a workout before 6am. Most people were still asleep. You weren\'t.',
    xpReward: 300,
  },
  {
    triggerId: 'night_owl',
    title: 'Night Owl',
    description: 'Workout logged after 10pm. Unusual. Effective. Noted.',
    xpReward: 200,
  },
  {
    triggerId: 'iron_week',
    title: 'Iron Week',
    description: '5 workouts in 7 days. That\'s not a habit, that\'s an identity.',
    xpReward: 500,
  },
  {
    triggerId: 'pr_hunter',
    title: 'PR Hunter',
    description: 'You beat your baseline on 3 different exercises. The bar is yours to raise.',
    xpReward: 350,
  },
  {
    triggerId: 'protein_streak',
    title: 'Consistency King',
    description: 'Hit your protein target 7 days in a row. Your body is paying attention.',
    xpReward: 400,
  },
  {
    triggerId: 'ghost_mode',
    title: 'Ghost Mode',
    description: '14 consecutive days of opening BRUTL. You don\'t skip. Ever.',
    xpReward: 250,
  },
  {
    triggerId: 'double_session',
    title: 'Double Down',
    description: 'You logged two workouts in one day. Questionable. Respected.',
    xpReward: 400,
  },
];

export interface ShadowCheckContext {
  workoutHour?: number;          // hour of day (0–23) when workout was logged
  workoutsThisWeek?: number;     // total workouts logged in last 7 days
  prCount?: number;              // exercises beaten above baseline lifetime
  proteinStreakDays?: number;    // consecutive days hitting protein
  appOpenStreakDays?: number;    // consecutive days app was opened
  workoutsToday?: number;        // workouts logged today
}

export function checkShadowTriggers(
  context: ShadowCheckContext,
  alreadyUnlocked: string[]
): ShadowDefinition[] {
  const fired: ShadowDefinition[] = [];

  for (const def of SHADOW_DEFINITIONS) {
    if (alreadyUnlocked.includes(def.triggerId)) continue;

    let triggered = false;

    switch (def.triggerId) {
      case 'early_riser':
        triggered = (context.workoutHour ?? 99) < 6;
        break;
      case 'night_owl':
        triggered = (context.workoutHour ?? 0) >= 22;
        break;
      case 'iron_week':
        triggered = (context.workoutsThisWeek ?? 0) >= 5;
        break;
      case 'pr_hunter':
        triggered = (context.prCount ?? 0) >= 3;
        break;
      case 'protein_streak':
        triggered = (context.proteinStreakDays ?? 0) >= 7;
        break;
      case 'ghost_mode':
        triggered = (context.appOpenStreakDays ?? 0) >= 14;
        break;
      case 'double_session':
        triggered = (context.workoutsToday ?? 0) >= 2;
        break;
    }

    if (triggered) fired.push(def);
  }

  return fired;
}

export function buildUnlockedShadow(def: ShadowDefinition): UnlockedShadow {
  return {
    id: `shadow-${def.triggerId}-${Date.now()}`,
    triggerId: def.triggerId,
    title: def.title,
    description: def.description,
    xpReward: def.xpReward,
    unlockedAt: Date.now(),
    claimed: false,
    revealed: false,
  };
}
