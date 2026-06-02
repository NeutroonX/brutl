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

export interface ExerciseSearchResult {
  name: string;
  category: string;
  hasProfile: boolean;
}

// ─── Comprehensive Exercise Database ─────────────────────────────────────────

const EXERCISE_DB: Record<string, ExerciseAIProfile> = {
  'Bench Press': {
    muscles: [
      { name: 'Pec (Sternal)',      activationPct: 88, tier: 'primary' },
      { name: 'Pec (Clavicular)',   activationPct: 62, tier: 'secondary' },
      { name: 'Triceps (Long)',     activationPct: 50, tier: 'secondary' },
      { name: 'Triceps (Lateral)', activationPct: 42, tier: 'tertiary' },
      { name: 'Ant. Delt',         activationPct: 35, tier: 'tertiary' },
      { name: 'Serratus Ant.',     activationPct: 20, tier: 'stabilizer' },
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
      { name: 'Pec (Clavicular)',   activationPct: 85, tier: 'primary' },
      { name: 'Pec Minor',          activationPct: 65, tier: 'secondary' },
      { name: 'Ant. Delt',          activationPct: 62, tier: 'secondary' },
      { name: 'Triceps (Long)',     activationPct: 42, tier: 'tertiary' },
      { name: 'Triceps (Lateral)', activationPct: 38, tier: 'tertiary' },
    ],
    formCues: [
      '30–45° angle — higher shifts load to shoulders',
      'Grip slightly wider than flat bench',
      'Full eccentric — control the bar down fully',
      'Keep chest proud, avoid letting delts dominate',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '3-0-1' },
  },
  'Decline Bench': {
    muscles: [
      { name: 'Pec (Sternal)',     activationPct: 92, tier: 'primary' },
      { name: 'Pec (Lower)',       activationPct: 80, tier: 'primary' },
      { name: 'Triceps (Long)',    activationPct: 50, tier: 'secondary' },
      { name: 'Triceps (Lateral)', activationPct: 42, tier: 'tertiary' },
      { name: 'Ant. Delt',        activationPct: 20, tier: 'tertiary' },
    ],
    formCues: [
      'Hook feet securely — decline ≈ 15–30°',
      'Slightly narrower grip than flat bench',
      'Bar touches lower chest / xiphoid process',
      'Keep shoulder blades retracted throughout',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '3-1-1' },
  },
  'Close Grip Bench': {
    muscles: [
      { name: 'Triceps (Long)',    activationPct: 88, tier: 'primary' },
      { name: 'Triceps (Lateral)', activationPct: 82, tier: 'primary' },
      { name: 'Triceps (Medial)', activationPct: 75, tier: 'primary' },
      { name: 'Pec (Sternal)',    activationPct: 55, tier: 'secondary' },
      { name: 'Ant. Delt',        activationPct: 40, tier: 'tertiary' },
    ],
    formCues: [
      'Hands shoulder-width — not too narrow (wrist stress)',
      'Elbows track close to torso throughout',
      'Lower to mid-chest, not the neck',
      'Full lockout at the top — squeeze triceps',
    ],
    hypertrophy: { repRange: '6–10', sets: '3–4', rir: '1–2', tempo: '3-1-1' },
  },
  'Dumbbell Fly': {
    muscles: [
      { name: 'Pec (Sternal)',    activationPct: 85, tier: 'primary' },
      { name: 'Pec (Clavicular)', activationPct: 65, tier: 'secondary' },
      { name: 'Ant. Delt',        activationPct: 45, tier: 'tertiary' },
      { name: 'Biceps (Long)',    activationPct: 20, tier: 'stabilizer' },
    ],
    formCues: [
      'Slight elbow bend — maintain throughout',
      'Lower to chest height, no further (shoulder safety)',
      'Think: hugging a barrel — arc, not straight down',
      'Squeeze pecs hard at the top of the rep',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '3-0-1' },
  },
  'Squat': {
    muscles: [
      { name: 'Quad (Rectus)',    activationPct: 85, tier: 'primary' },
      { name: 'Quad (Lateral)',   activationPct: 82, tier: 'primary' },
      { name: 'Quad (VMO)',       activationPct: 78, tier: 'primary' },
      { name: 'Glute Max',        activationPct: 72, tier: 'secondary' },
      { name: 'Ham (BF Long)',    activationPct: 50, tier: 'tertiary' },
      { name: 'Semitendinosus',   activationPct: 45, tier: 'tertiary' },
      { name: 'Spinal Erectors',  activationPct: 40, tier: 'stabilizer' },
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
  'Front Squat': {
    muscles: [
      { name: 'Quad (Rectus)',   activationPct: 90, tier: 'primary' },
      { name: 'Quad (VMO)',      activationPct: 85, tier: 'primary' },
      { name: 'Quad (Lateral)',  activationPct: 80, tier: 'primary' },
      { name: 'Glute Max',       activationPct: 60, tier: 'secondary' },
      { name: 'Spinal Erectors', activationPct: 55, tier: 'tertiary' },
      { name: 'Core',            activationPct: 50, tier: 'tertiary' },
    ],
    formCues: [
      'Clean grip or cross-arm — elbows parallel to floor',
      'Torso stays upright — more so than back squat',
      'Elbows dictate depth — if they drop, you fail',
      'Heels slightly elevated if ankle mobility is limited',
    ],
    hypertrophy: { repRange: '6–10', sets: '3–4', rir: '1–2', tempo: '3-1-1' },
  },
  'Bulgarian Split Squat': {
    muscles: [
      { name: 'Quad (Rectus)',   activationPct: 88, tier: 'primary' },
      { name: 'Quad (VMO)',      activationPct: 82, tier: 'primary' },
      { name: 'Glute Max',       activationPct: 78, tier: 'primary' },
      { name: 'Glute Med',       activationPct: 55, tier: 'secondary' },
      { name: 'Ham (BF Long)',   activationPct: 50, tier: 'tertiary' },
      { name: 'Hip Flexors',     activationPct: 45, tier: 'tertiary' },
    ],
    formCues: [
      'Rear foot elevated — just laces on the bench',
      'Front foot far enough forward: shin vertical at bottom',
      'Knee tracks over middle toe — no lateral drift',
      'Torso upright for quad focus, forward lean for glutes',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '1–2', tempo: '3-1-1' },
  },
  'Deadlift': {
    muscles: [
      { name: 'Ham (BF Long)',   activationPct: 85, tier: 'primary' },
      { name: 'Glute Max',       activationPct: 82, tier: 'primary' },
      { name: 'Semitendinosus',  activationPct: 60, tier: 'secondary' },
      { name: 'Upper Traps',     activationPct: 58, tier: 'secondary' },
      { name: 'Lats',            activationPct: 55, tier: 'secondary' },
      { name: 'Spinal Erectors', activationPct: 50, tier: 'tertiary' },
      { name: 'Quad (Rectus)',   activationPct: 35, tier: 'tertiary' },
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
  'Romanian Deadlift': {
    muscles: [
      { name: 'Ham (BF Long)',   activationPct: 88, tier: 'primary' },
      { name: 'Semitendinosus',  activationPct: 75, tier: 'primary' },
      { name: 'Semimembranosus', activationPct: 70, tier: 'primary' },
      { name: 'Glute Max',       activationPct: 72, tier: 'secondary' },
      { name: 'Spinal Erectors', activationPct: 45, tier: 'tertiary' },
      { name: 'Upper Traps',     activationPct: 30, tier: 'stabilizer' },
    ],
    formCues: [
      'Hinge — push hips back, keep bar close to legs',
      'Knees have slight soft bend — do not fully lock',
      'Lower until hamstring tension, not past it',
      'Chest up, neutral spine throughout',
      'Drive through heels to stand — squeeze glutes at top',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '3-1-1' },
  },
  'Hip Thrust': {
    muscles: [
      { name: 'Glute Max',       activationPct: 92, tier: 'primary' },
      { name: 'Glute Med',       activationPct: 60, tier: 'secondary' },
      { name: 'Ham (BF Long)',   activationPct: 55, tier: 'secondary' },
      { name: 'Semitendinosus',  activationPct: 45, tier: 'tertiary' },
      { name: 'Quad (Rectus)',   activationPct: 25, tier: 'tertiary' },
    ],
    formCues: [
      'Bench at mid-scapula — shoulder blades on edge',
      'Feet hip-width, knees at 90° at the top',
      'Drive through heels, not toes',
      'Posterior pelvic tilt at top — squeeze hard for 1s',
      'Chin tucked — avoid hyperextending the neck',
    ],
    hypertrophy: { repRange: '8–15', sets: '3–4', rir: '1–2', tempo: '2-1-2' },
  },
  'Overhead Press': {
    muscles: [
      { name: 'Ant. Delt',        activationPct: 88, tier: 'primary' },
      { name: 'Lat. Delt',        activationPct: 62, tier: 'secondary' },
      { name: 'Triceps (Long)',   activationPct: 58, tier: 'secondary' },
      { name: 'Triceps (Lateral)', activationPct: 45, tier: 'tertiary' },
      { name: 'Pec (Clavicular)', activationPct: 35, tier: 'tertiary' },
      { name: 'Upper Traps',      activationPct: 30, tier: 'stabilizer' },
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
  'Lateral Raise': {
    muscles: [
      { name: 'Lat. Delt',     activationPct: 88, tier: 'primary' },
      { name: 'Ant. Delt',     activationPct: 45, tier: 'secondary' },
      { name: 'Upper Traps',   activationPct: 40, tier: 'secondary' },
      { name: 'Supraspinatus', activationPct: 35, tier: 'tertiary' },
    ],
    formCues: [
      'Slight forward lean (~10°) for better lat. delt loading',
      'Lead with elbows — not wrists',
      'Raise to just above shoulder height, no more',
      'Slow eccentric: 3–4 seconds down',
      'Slight internal rotation: pinky slightly higher than thumb',
    ],
    hypertrophy: { repRange: '12–20', sets: '3–5', rir: '2–3', tempo: '2-0-3' },
  },
  'Pull Up': {
    muscles: [
      { name: 'Lats',          activationPct: 90, tier: 'primary' },
      { name: 'Biceps (Long)', activationPct: 65, tier: 'secondary' },
      { name: 'Teres Major',   activationPct: 58, tier: 'secondary' },
      { name: 'Post. Delt',    activationPct: 50, tier: 'tertiary' },
      { name: 'Rhomboids',     activationPct: 45, tier: 'tertiary' },
      { name: 'Mid Traps',     activationPct: 35, tier: 'stabilizer' },
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
  'Chin Up': {
    muscles: [
      { name: 'Biceps (Short)', activationPct: 80, tier: 'primary' },
      { name: 'Biceps (Long)',  activationPct: 78, tier: 'primary' },
      { name: 'Lats',           activationPct: 82, tier: 'primary' },
      { name: 'Teres Major',    activationPct: 55, tier: 'secondary' },
      { name: 'Post. Delt',     activationPct: 40, tier: 'tertiary' },
    ],
    formCues: [
      'Supinated grip (palms facing you) — shoulder-width',
      'Pull elbows to hips, not behind you',
      'Full dead hang between reps for full range',
      "Chin clears bar — don't tilt neck",
    ],
    hypertrophy: { repRange: '6–12', sets: '3–4', rir: '1–2', tempo: '2-1-3' },
  },
  'Row': {
    muscles: [
      { name: 'Lats',           activationPct: 80, tier: 'primary' },
      { name: 'Rhomboids',      activationPct: 70, tier: 'secondary' },
      { name: 'Biceps (Short)', activationPct: 58, tier: 'secondary' },
      { name: 'Post. Delt',     activationPct: 55, tier: 'tertiary' },
      { name: 'Mid Traps',      activationPct: 50, tier: 'tertiary' },
      { name: 'Lower Traps',    activationPct: 30, tier: 'stabilizer' },
    ],
    formCues: [
      'Retract scapula first, then pull',
      'Lead with elbows — not hands',
      'Full stretch at the bottom of each rep',
      'Avoid torso rotation to add weight',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '2-1-2' },
  },
  'Lat Pulldown': {
    muscles: [
      { name: 'Lats',          activationPct: 88, tier: 'primary' },
      { name: 'Teres Major',   activationPct: 60, tier: 'secondary' },
      { name: 'Biceps (Long)', activationPct: 55, tier: 'secondary' },
      { name: 'Rhomboids',     activationPct: 45, tier: 'tertiary' },
      { name: 'Post. Delt',    activationPct: 40, tier: 'tertiary' },
    ],
    formCues: [
      'Slight backward lean (15–20°) — keep it consistent',
      'Pull bar to upper chest, not behind neck',
      'Lead with elbows, keep them pointing down',
      'Full stretch at top — let scapula rise slightly',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '2-1-2' },
  },
  'Face Pull': {
    muscles: [
      { name: 'Post. Delt',     activationPct: 85, tier: 'primary' },
      { name: 'Rhomboids',      activationPct: 65, tier: 'secondary' },
      { name: 'Mid Traps',      activationPct: 60, tier: 'secondary' },
      { name: 'Infraspinatus',  activationPct: 55, tier: 'secondary' },
      { name: 'Teres Minor',    activationPct: 50, tier: 'tertiary' },
    ],
    formCues: [
      'Cable at head height — pull to nose/face level',
      'Elbows stay high — parallel to floor throughout',
      'External rotation at the end: hands go wide and back',
      'Slow and controlled — feel the posterior capsule',
    ],
    hypertrophy: { repRange: '12–20', sets: '3–4', rir: '2–3', tempo: '2-1-2' },
  },
  'Leg Press': {
    muscles: [
      { name: 'Quad (Rectus)',  activationPct: 85, tier: 'primary' },
      { name: 'Quad (Lateral)', activationPct: 82, tier: 'primary' },
      { name: 'Quad (VMO)',     activationPct: 78, tier: 'primary' },
      { name: 'Glute Max',      activationPct: 65, tier: 'secondary' },
      { name: 'Ham (BF Short)', activationPct: 40, tier: 'tertiary' },
    ],
    formCues: [
      'Feet shoulder-width, mid-plate — not too high or low',
      'Never lock knees at the top',
      'Lower until 90°+ knee flexion for full range',
      'Heels planted — no rising onto toes',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '3-0-2' },
  },
  'Leg Curl': {
    muscles: [
      { name: 'Ham (BF Long)',   activationPct: 82, tier: 'primary' },
      { name: 'Ham (BF Short)',  activationPct: 78, tier: 'primary' },
      { name: 'Semitendinosus',  activationPct: 72, tier: 'primary' },
      { name: 'Semimembranosus', activationPct: 68, tier: 'primary' },
      { name: 'Gastrocnemius',   activationPct: 35, tier: 'secondary' },
    ],
    formCues: [
      'Hips flat on pad — no lifting off the bench',
      'Curl until hamstrings fully shortened',
      'Slow eccentric — 3–4 seconds down',
      'Avoid dorsiflexion — point toes slightly for gastrocnemius deactivation',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-1-3' },
  },
  'Leg Extension': {
    muscles: [
      { name: 'Quad (Rectus)',  activationPct: 90, tier: 'primary' },
      { name: 'Quad (VMO)',     activationPct: 85, tier: 'primary' },
      { name: 'Quad (Lateral)', activationPct: 80, tier: 'primary' },
    ],
    formCues: [
      'Seat adjusted so knee aligns with machine pivot',
      'Full lockout at top — hold 1s for VMO activation',
      'Slow eccentric — 3 seconds minimum',
      'Toes neutral or slightly inward for medial quad bias',
    ],
    hypertrophy: { repRange: '12–15', sets: '3–4', rir: '2–3', tempo: '2-1-3' },
  },
  'Calf Raise': {
    muscles: [
      { name: 'Gastrocnemius (Medial)',  activationPct: 88, tier: 'primary' },
      { name: 'Gastrocnemius (Lateral)', activationPct: 80, tier: 'primary' },
      { name: 'Soleus',                  activationPct: 55, tier: 'secondary' },
    ],
    formCues: [
      'Full range: stretch at bottom, full plantar flexion at top',
      'Pause at the top — squeeze hard for 1s',
      'Slow eccentric — calves are heavily recruited eccentrically',
      'Straight leg = gastrocnemius dominance',
    ],
    hypertrophy: { repRange: '10–20', sets: '4–5', rir: '1–2', tempo: '2-1-3' },
  },
  'Bicep Curl': {
    muscles: [
      { name: 'Biceps (Long)',   activationPct: 88, tier: 'primary' },
      { name: 'Biceps (Short)',  activationPct: 80, tier: 'primary' },
      { name: 'Brachialis',      activationPct: 65, tier: 'secondary' },
      { name: 'Brachioradialis', activationPct: 30, tier: 'tertiary' },
    ],
    formCues: [
      'Elbows pinned to sides — do not let them drift forward',
      'Supinate at top: rotate wrist outward fully',
      'Slow eccentric — 3 seconds down minimum',
      'No swinging — isolate the bicep',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-1-3' },
  },
  'Hammer Curl': {
    muscles: [
      { name: 'Brachialis',      activationPct: 85, tier: 'primary' },
      { name: 'Brachioradialis', activationPct: 80, tier: 'primary' },
      { name: 'Biceps (Long)',   activationPct: 65, tier: 'secondary' },
      { name: 'Biceps (Short)',  activationPct: 50, tier: 'secondary' },
    ],
    formCues: [
      'Neutral grip throughout — no supination',
      'Elbows stay fixed at sides',
      'Full range: wrist to shoulder at top',
      'Alternating or simultaneous — both valid',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-1-2' },
  },
  'Preacher Curl': {
    muscles: [
      { name: 'Biceps (Short)', activationPct: 90, tier: 'primary' },
      { name: 'Biceps (Long)',  activationPct: 72, tier: 'secondary' },
      { name: 'Brachialis',     activationPct: 60, tier: 'secondary' },
    ],
    formCues: [
      'Upper arm fixed firmly on pad — no movement',
      'Lower slowly to near full extension — do not hyperextend',
      'Supinate at top for peak bicep contraction',
      'Avoid jerking the weight up from the bottom',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '2–3', tempo: '3-1-2' },
  },
  'Concentration Curl': {
    muscles: [
      { name: 'Biceps (Short)', activationPct: 92, tier: 'primary' },
      { name: 'Biceps (Long)',  activationPct: 68, tier: 'secondary' },
      { name: 'Brachialis',     activationPct: 50, tier: 'tertiary' },
    ],
    formCues: [
      'Elbow braced against inner thigh — fully locked',
      'Supinate at top — peak contraction',
      'Full stretch at bottom — do not cut range',
      'Slow eccentric: 3 seconds minimum',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-1-3' },
  },
  'Tricep Pushdown': {
    muscles: [
      { name: 'Triceps (Lateral)', activationPct: 90, tier: 'primary' },
      { name: 'Triceps (Medial)',  activationPct: 85, tier: 'primary' },
      { name: 'Triceps (Long)',    activationPct: 65, tier: 'secondary' },
      { name: 'Lats',              activationPct: 20, tier: 'stabilizer' },
    ],
    formCues: [
      'Elbows tucked at sides — stationary throughout',
      'Full lockout at bottom — hard squeeze',
      'Slight forward lean for better stretch at top',
      'Control the eccentric — resist the cable up',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-1-2' },
  },
  'Skull Crusher': {
    muscles: [
      { name: 'Triceps (Long)',    activationPct: 85, tier: 'primary' },
      { name: 'Triceps (Medial)',  activationPct: 78, tier: 'primary' },
      { name: 'Triceps (Lateral)', activationPct: 72, tier: 'primary' },
      { name: 'Ant. Delt',         activationPct: 20, tier: 'stabilizer' },
    ],
    formCues: [
      'Upper arms vertical and fixed — only forearms move',
      'Lower to forehead (EZ bar) or just above/behind head (dumbbell)',
      'Behind-head variation maximizes long head stretch',
      'Slow descent — elbow joints under significant load',
    ],
    hypertrophy: { repRange: '8–12', sets: '3–4', rir: '1–2', tempo: '3-1-1' },
  },
  'Overhead Tricep Extension': {
    muscles: [
      { name: 'Triceps (Long)',    activationPct: 90, tier: 'primary' },
      { name: 'Triceps (Medial)',  activationPct: 65, tier: 'secondary' },
      { name: 'Triceps (Lateral)', activationPct: 55, tier: 'secondary' },
    ],
    formCues: [
      'Arms vertical — elbows close to ears throughout',
      'Full stretch at bottom: overhead position maximizes long head',
      'Do not let elbows flare wide',
      'Slow eccentric under control — long head under maximum tension',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '3-1-1' },
  },
  'Shrug': {
    muscles: [
      { name: 'Upper Traps',    activationPct: 92, tier: 'primary' },
      { name: 'Mid Traps',      activationPct: 55, tier: 'secondary' },
      { name: 'Levator Scap.', activationPct: 45, tier: 'tertiary' },
      { name: 'Rhomboids',      activationPct: 30, tier: 'stabilizer' },
    ],
    formCues: [
      'Straight shrug — no rolling (no proven benefit, increases injury risk)',
      'Full elevation: ear to shoulder',
      'Hold at top 1–2s for peak contraction',
      'Slow eccentric to maximize time under tension',
    ],
    hypertrophy: { repRange: '10–15', sets: '3–4', rir: '2–3', tempo: '2-2-2' },
  },
  'Ab Rollout': {
    muscles: [
      { name: 'Rectus Abdominis', activationPct: 88, tier: 'primary' },
      { name: 'Obliques',         activationPct: 65, tier: 'secondary' },
      { name: 'Lats',             activationPct: 55, tier: 'secondary' },
      { name: 'Hip Flexors',      activationPct: 45, tier: 'tertiary' },
    ],
    formCues: [
      'Posterior pelvic tilt before rolling out',
      'Extend only as far as you can maintain a flat lower back',
      'Pull back by contracting abs — not with the arms',
      'Start from knees, progress to standing',
    ],
    hypertrophy: { repRange: '8–15', sets: '3–4', rir: '1–2', tempo: '3-0-2' },
  },
};

// ─── All Exercises List (for search) ─────────────────────────────────────────

export const ALL_EXERCISES: { name: string; category: string }[] = [
  // Chest
  { name: 'Bench Press',              category: 'Chest' },
  { name: 'Incline Bench',            category: 'Chest' },
  { name: 'Decline Bench',            category: 'Chest' },
  { name: 'Close Grip Bench',         category: 'Chest' },
  { name: 'Dumbbell Fly',             category: 'Chest' },
  { name: 'Cable Fly',                category: 'Chest' },
  { name: 'Incline Dumbbell Press',   category: 'Chest' },
  { name: 'Pec Deck',                 category: 'Chest' },
  { name: 'Push Up',                  category: 'Chest' },
  { name: 'Chest Dip',                category: 'Chest' },
  { name: 'Landmine Press',           category: 'Chest' },

  // Back
  { name: 'Deadlift',                 category: 'Back' },
  { name: 'Pull Up',                  category: 'Back' },
  { name: 'Chin Up',                  category: 'Back' },
  { name: 'Row',                      category: 'Back' },
  { name: 'Dumbbell Row',             category: 'Back' },
  { name: 'Cable Row',                category: 'Back' },
  { name: 'T-Bar Row',                category: 'Back' },
  { name: 'Lat Pulldown',             category: 'Back' },
  { name: 'Face Pull',                category: 'Back' },
  { name: 'Rack Pull',                category: 'Back' },
  { name: 'Shrug',                    category: 'Back' },
  { name: 'Good Morning',             category: 'Back' },
  { name: 'Straight Arm Pulldown',    category: 'Back' },

  // Shoulders
  { name: 'Overhead Press',           category: 'Shoulders' },
  { name: 'Dumbbell Shoulder Press',  category: 'Shoulders' },
  { name: 'Lateral Raise',            category: 'Shoulders' },
  { name: 'Front Raise',              category: 'Shoulders' },
  { name: 'Rear Delt Fly',            category: 'Shoulders' },
  { name: 'Arnold Press',             category: 'Shoulders' },
  { name: 'Cable Lateral Raise',      category: 'Shoulders' },
  { name: 'Upright Row',              category: 'Shoulders' },
  { name: 'Behind Neck Press',        category: 'Shoulders' },

  // Biceps
  { name: 'Bicep Curl',               category: 'Biceps' },
  { name: 'Hammer Curl',              category: 'Biceps' },
  { name: 'Preacher Curl',            category: 'Biceps' },
  { name: 'Cable Curl',               category: 'Biceps' },
  { name: 'Concentration Curl',       category: 'Biceps' },
  { name: 'Incline Curl',             category: 'Biceps' },
  { name: 'Spider Curl',              category: 'Biceps' },
  { name: 'Reverse Curl',             category: 'Biceps' },
  { name: 'Zottman Curl',             category: 'Biceps' },

  // Triceps
  { name: 'Tricep Pushdown',          category: 'Triceps' },
  { name: 'Skull Crusher',            category: 'Triceps' },
  { name: 'Overhead Tricep Extension', category: 'Triceps' },
  { name: 'Tricep Dip',               category: 'Triceps' },
  { name: 'Cable Overhead Extension', category: 'Triceps' },
  { name: 'Kickback',                 category: 'Triceps' },
  { name: 'JM Press',                 category: 'Triceps' },

  // Legs
  { name: 'Squat',                    category: 'Legs' },
  { name: 'Front Squat',              category: 'Legs' },
  { name: 'Hack Squat',               category: 'Legs' },
  { name: 'Leg Press',                category: 'Legs' },
  { name: 'Leg Extension',            category: 'Legs' },
  { name: 'Leg Curl',                 category: 'Legs' },
  { name: 'Romanian Deadlift',        category: 'Legs' },
  { name: 'Bulgarian Split Squat',    category: 'Legs' },
  { name: 'Lunge',                    category: 'Legs' },
  { name: 'Step Up',                  category: 'Legs' },
  { name: 'Calf Raise',               category: 'Legs' },
  { name: 'Seated Calf Raise',        category: 'Legs' },
  { name: 'Nordic Curl',              category: 'Legs' },
  { name: 'Sumo Squat',               category: 'Legs' },

  // Glutes
  { name: 'Hip Thrust',               category: 'Glutes' },
  { name: 'Glute Bridge',             category: 'Glutes' },
  { name: 'Cable Kickback',           category: 'Glutes' },
  { name: 'Sumo Deadlift',            category: 'Glutes' },
  { name: 'Abductor Machine',         category: 'Glutes' },

  // Core
  { name: 'Plank',                    category: 'Core' },
  { name: 'Ab Rollout',               category: 'Core' },
  { name: 'Hanging Leg Raise',        category: 'Core' },
  { name: 'Cable Crunch',             category: 'Core' },
  { name: 'Side Plank',               category: 'Core' },
  { name: 'Russian Twist',            category: 'Core' },
  { name: 'Pallof Press',             category: 'Core' },
  { name: 'Dead Bug',                 category: 'Core' },
  { name: 'Copenhagen Plank',         category: 'Core' },

  // Cardio
  { name: 'Treadmill',                category: 'Cardio' },
  { name: 'Rowing Machine',           category: 'Cardio' },
  { name: 'Assault Bike',             category: 'Cardio' },
  { name: 'Jump Rope',                category: 'Cardio' },
  { name: 'Stair Climber',            category: 'Cardio' },
];

// ─── Public API ───────────────────────────────────────────────────────────────

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

export function searchExercises(
  query: string,
  currentNames: string[] = []
): ExerciseSearchResult[] {
  const q = query.toLowerCase().trim();
  const available = ALL_EXERCISES.filter(
    (e) => !currentNames.some((n) => n.toLowerCase() === e.name.toLowerCase())
  );
  const filtered = q
    ? available.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      )
    : available;
  return filtered.map((e) => ({
    name: e.name,
    category: e.category,
    hasProfile: !!getExerciseProfile(e.name),
  }));
}

export function getSuggestedExercises(currentNames: string[]): ExerciseSearchResult[] {
  if (currentNames.length === 0) return searchExercises('');
  // Find dominant category of already-added exercises
  const cats = currentNames
    .map((n) => ALL_EXERCISES.find((e) => e.name.toLowerCase() === n.toLowerCase())?.category)
    .filter(Boolean) as string[];
  const freq: Record<string, number> = {};
  cats.forEach((c) => { freq[c] = (freq[c] ?? 0) + 1; });
  const dominant = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
  const results = searchExercises('', currentNames);
  if (!dominant) return results;
  return [
    ...results.filter((e) => e.category === dominant),
    ...results.filter((e) => e.category !== dominant),
  ];
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
