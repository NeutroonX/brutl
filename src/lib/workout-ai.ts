import type { WorkoutLog } from '@/types';

export interface MuscleActivation {
  name: string;
  activationPct: number;
  tier: 'primary' | 'secondary' | 'tertiary' | 'stabilizer';
}

export interface HypertrophyRec {
  repRange: string;
  sets: string;
  rir: string;
  tempo: string;
}

export interface ExerciseAIProfile {
  muscles: MuscleActivation[];
  formCues: string[];
  hypertrophy: HypertrophyRec;
}

const EXERCISE_DB: Record<string, ExerciseAIProfile> = {
  'Bench Press': {
    muscles: [
      { name: 'Chest', activationPct: 90, tier: 'primary' },
      { name: 'Front Delts', activationPct: 55, tier: 'secondary' },
      { name: 'Triceps', activationPct: 45, tier: 'tertiary' },
      { name: 'Serratus', activationPct: 20, tier: 'stabilizer' },
    ],
    formCues: [
      'Retract scapula and arch slightly before unracking',
      'Elbows 45–75° from torso — not flared to 90°',
      'Bar touches mid-chest, not the neck or stomach',
      'Drive both feet into the floor throughout',
      'Wrists stacked over elbows — no excessive extension',
    ],
    hypertrophy: { repRange: '6–12', sets: '3–5', rir: '1–3', tempo: '3-1-1' },
  },
  'Incline Bench': {
    muscles: [
      { name: 'Upper Chest', activationPct: 85, tier: 'primary' },
      { name: 'Front Delts', activationPct: 65, tier: 'secondary' },
      { name: 'Triceps', activationPct: 40, tier: 'tertiary' },
    ],
    formCues: [
      '30–45° angle — higher shifts load to shoulders',
      'Grip slightly wider than flat bench',
      'Full eccentric — control the bar down fully',
      'Keep chest proud, avoid letting delts dominate',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '3-0-1' },
  },
  'Squat': {
    muscles: [
      { name: 'Quads', activationPct: 88, tier: 'primary' },
      { name: 'Glutes', activationPct: 72, tier: 'secondary' },
      { name: 'Hamstrings', activationPct: 50, tier: 'tertiary' },
      { name: 'Core', activationPct: 40, tier: 'stabilizer' },
    ],
    formCues: [
      'Bar on upper traps, chest tall, eyes forward',
      'Break at hips and knees simultaneously',
      'Hip crease below knee — break parallel',
      'Knees track over toes — no valgus collapse',
      'Brace core hard on descent and ascent',
    ],
    hypertrophy: { repRange: '6–10', sets: '4–5', rir: '1–2', tempo: '3-1-1' },
  },
  'Deadlift': {
    muscles: [
      { name: 'Hamstrings', activationPct: 85, tier: 'primary' },
      { name: 'Glutes', activationPct: 80, tier: 'primary' },
      { name: 'Traps', activationPct: 60, tier: 'secondary' },
      { name: 'Lats', activationPct: 55, tier: 'secondary' },
      { name: 'Core', activationPct: 50, tier: 'tertiary' },
    ],
    formCues: [
      'Hinge at hips — push the floor away',
      'Bar stays directly over mid-foot throughout',
      'Lats tight: protect the armpit before pulling',
      'Hips and knees lock simultaneously at top',
      'No hyperextension — stand tall, not back',
    ],
    hypertrophy: { repRange: '4–8', sets: '3–4', rir: '1–2', tempo: '2-1-2' },
  },
  'Overhead Press': {
    muscles: [
      { name: 'Front Delts', activationPct: 88, tier: 'primary' },
      { name: 'Side Delts', activationPct: 60, tier: 'secondary' },
      { name: 'Triceps', activationPct: 55, tier: 'secondary' },
      { name: 'Upper Chest', activationPct: 35, tier: 'tertiary' },
      { name: 'Core', activationPct: 30, tier: 'stabilizer' },
    ],
    formCues: [
      'Grip just outside shoulders, bar in heel of palm',
      'Brace core — slight posterior pelvic tilt',
      'Press at slight angle: back then up over forehead',
      'No excessive lumbar arch — if you need it, drop weight',
      'Shrug at lockout to engage upper traps',
    ],
    hypertrophy: { repRange: '6–10', sets: '3–4', rir: '2–3', tempo: '2-0-1' },
  },
  'Pull Up': {
    muscles: [
      { name: 'Lats', activationPct: 90, tier: 'primary' },
      { name: 'Biceps', activationPct: 65, tier: 'secondary' },
      { name: 'Rear Delts', activationPct: 50, tier: 'tertiary' },
      { name: 'Rhomboids', activationPct: 45, tier: 'stabilizer' },
    ],
    formCues: [
      'Start from a dead hang — full scapular depression',
      'Drive elbows down and back — not behind torso',
      'Aim for chest to bar, not just chin over',
      'Controlled descent: 3 seconds down minimum',
      'No kipping — add weight elsewhere first',
    ],
    hypertrophy: { repRange: '6–12', sets: '3–4', rir: '1–2', tempo: '2-1-3' },
  },
  'Row': {
    muscles: [
      { name: 'Lats', activationPct: 80, tier: 'primary' },
      { name: 'Rhomboids', activationPct: 70, tier: 'secondary' },
      { name: 'Biceps', activationPct: 60, tier: 'secondary' },
      { name: 'Rear Delts', activationPct: 55, tier: 'tertiary' },
    ],
    formCues: [
      'Retract scapula first, then pull',
      'Lead with elbows — not hands',
      'Full stretch at the bottom of each rep',
      'Avoid torso rotation to add weight',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '2-1-2' },
  },
  'Leg Press': {
    muscles: [
      { name: 'Quads', activationPct: 85, tier: 'primary' },
      { name: 'Glutes', activationPct: 65, tier: 'secondary' },
      { name: 'Hamstrings', activationPct: 40, tier: 'tertiary' },
    ],
    formCues: [
      'Feet shoulder-width, mid-plate — not too high or low',
      'Never lock knees at the top',
      'Lower until 90°+ knee flexion for full range',
      'Heels planted — no rising onto toes',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '3-0-2' },
  },
  'Bicep Curl': {
    muscles: [
      { name: 'Biceps', activationPct: 90, tier: 'primary' },
      { name: 'Brachialis', activationPct: 65, tier: 'secondary' },
      { name: 'Front Delts', activationPct: 20, tier: 'stabilizer' },
    ],
    formCues: [
      'Elbows pinned to sides — do not let them drift forward',
      'Supinate at top: rotate wrist outward fully',
      'Slow eccentric — 3 seconds down minimum',
      'No swinging — isolate the bicep',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-1-3' },
  },
  'Tricep Pushdown': {
    muscles: [
      { name: 'Triceps', activationPct: 90, tier: 'primary' },
      { name: 'Lats', activationPct: 20, tier: 'stabilizer' },
    ],
    formCues: [
      'Elbows tucked at sides — stationary throughout',
      'Full lockout at bottom — hard squeeze',
      'Slight forward lean for better stretch at top',
      'Control the eccentric — resist the cable up',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-1-2' },
  },
};

export function getExerciseProfile(exercise: string): ExerciseAIProfile | null {
  const key = Object.keys(EXERCISE_DB).find(
    (k) => k.toLowerCase() === exercise.toLowerCase()
  );
  return key ? EXERCISE_DB[key] : null;
}

export function getTopMuscles(exercise: string, limit = 3): MuscleActivation[] {
  const profile = getExerciseProfile(exercise);
  if (!profile) return [];
  return profile.muscles
    .filter((m) => m.tier !== 'stabilizer')
    .sort((a, b) => b.activationPct - a.activationPct)
    .slice(0, limit);
}

const PUSH_KW = ['bench', 'press', 'fly', 'dip', 'pushdown', 'extension', 'lateral'];
const PULL_KW = ['pull', 'row', 'curl', 'pulldown', 'deadlift', 'shrug', 'face pull'];
const LEG_KW = ['squat', 'leg press', 'lunge', 'hip thrust', 'calf', 'leg curl', 'leg extension', 'rdl'];

export function detectSplitName(exerciseNames: string[]): string {
  const lower = exerciseNames.map((n) => n.toLowerCase());
  const push = lower.filter((n) => PUSH_KW.some((k) => n.includes(k))).length;
  const pull = lower.filter((n) => PULL_KW.some((k) => n.includes(k))).length;
  const legs = lower.filter((n) => LEG_KW.some((k) => n.includes(k))).length;
  if (legs >= 2) return 'LEG DAY';
  if (push >= 2 && push > pull) return 'PUSH DAY';
  if (pull >= 2 && pull > push) return 'PULL DAY';
  if (push >= 1 && pull >= 1) return 'UPPER BODY';
  if (exerciseNames.length > 0) return 'STRENGTH SESSION';
  return "TODAY'S WORKOUT";
}

export function getWeekNumber(createdAt?: number): number {
  if (!createdAt) return 1;
  return Math.max(1, Math.floor((Date.now() - createdAt) / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export function getMuscleRecoveryStatus(
  muscleName: string,
  recentLogs: WorkoutLog[]
): 'ready' | 'recovering' | 'fatigued' {
  const now = Date.now();
  const h24 = 86400000;
  const h48 = 172800000;
  for (const log of recentLogs) {
    const age = now - log.date;
    if (age > h48) continue;
    for (const ex of log.exercises) {
      const muscles = getTopMuscles(ex.exercise, 3);
      if (muscles.some((m) => m.name.toLowerCase() === muscleName.toLowerCase())) {
        return age < h24 ? 'fatigued' : 'recovering';
      }
    }
  }
  return 'ready';
}

export function getInlineRoastText(weight: number, baseline: number, exerciseName: string): string {
  const dropPct = Math.round(((baseline - weight) / baseline) * 100);
  if (dropPct >= 20) return `${dropPct}% below your average on ${exerciseName}. Fix it or own it.`;
  if (dropPct >= 10) return `Below your baseline. Fix your warm-up or fix your mindset.`;
  return `Slightly below average on ${exerciseName}. Don't let it slide.`;
}
