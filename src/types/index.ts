export type Goal = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMP';
export type WeakArea = 'UPPER' | 'LOWER' | 'CARDIO' | 'DIET' | 'SLEEP' | 'MENTAL' | 'CONSISTENCY' | 'FLEXIBILITY';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type RoastTrigger = 'APP_OPEN' | 'MISSED_WORKOUT' | 'OFF_PLAN' | 'WEAK_LIFT' | 'POOR_RECOVERY';
export type QuestType = 'DAILY' | 'BOSS' | 'DUNGEON' | 'SHADOW';
export type WatchSource = 'SAMSUNG' | 'WEAR_OS' | 'GARMIN' | 'FITBIT' | 'WHOOP' | 'NONE';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  weightKg: number;
  heightCm: number;
  goal: Goal;
  weakArea: WeakArea;
  rank: Rank;
  xp: number;
  streakDays: number;
  macroTargets: MacroTargets;
  createdAt: number;
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface ExerciseSet {
  exercise: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface WorkoutLog {
  id: string;
  date: number;
  exercises: ExerciseSet[];
  durationMinutes: number;
  xpEarned: number;
}

export interface MealEntry {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
}

export interface DietLog {
  id: string;
  date: number;
  meals: MealEntry[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  complianceScore: number;
}

export interface RoastEntry {
  id: string;
  timestamp: number;
  triggerType: RoastTrigger;
  roastText: string;
  correctionText: string;
}

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  xpReward: number;
  expiresAt: number;
  completedAt: number | null;
  progress: number;
}

export interface DungeonRun {
  id: string;
  startedAt: number;
  currentDay: number;       // 1–7
  dayStartedAt: number;     // timestamp when current day became active
  daysCompleted: number[];  // completion timestamps, index 0–6
  todayWorkoutDuration: number;
  todayProteinRatio: number;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  xpMultiplierUntil: number | null;
}

export interface UnlockedShadow {
  id: string;
  triggerId: string;
  title: string;
  description: string;
  xpReward: number;
  unlockedAt: number;
  claimed: boolean;
  revealed: boolean;
}

export interface WatchData {
  date: number;
  restingHR: number;
  hrv: number;
  sleepHours: number;
  recoveryScore: number;
  stressLevel: number;
  steps: number;
  caloriesBurned: number;
  source: WatchSource;
}
