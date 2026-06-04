export type Goal = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMP';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type WeakArea = 'UPPER' | 'LOWER' | 'CARDIO' | 'DIET' | 'SLEEP' | 'MENTAL' | 'CONSISTENCY' | 'FLEXIBILITY';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type RoastTrigger = 'APP_OPEN' | 'MISSED_WORKOUT' | 'OFF_PLAN' | 'WEAK_LIFT' | 'POOR_RECOVERY' | 'WORKOUT_COMPLETE' | 'MEAL_LOGGED';

export type WatchSource = 'SAMSUNG' | 'WEAR_OS' | 'GARMIN' | 'FITBIT' | 'WHOOP' | 'NONE';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  weakArea: WeakArea[];
  rank: Rank;
  xp: number;
  streakDays: number;
  lastActiveDate: number | null;
  macroTargets: MacroTargets;
  goalWeightKg?: number;
  createdAt: number;
  updated_at?: number;
  synced_at?: number;
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
  updated_at?: number;
  synced_at?: number;
}

export interface MealEntry {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
  loggedAt?: number;
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
  updated_at?: number;
  synced_at?: number;
}

export interface RoastEntry {
  id: string;
  timestamp: number;
  triggerType: RoastTrigger;
  roastText: string;
  correctionText: string;
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

export interface RoutineExercise {
  name: string;
  targetSets: number;
  targetReps: string; // e.g. "8-12" or "5"
  targetWeightKg?: number;
}

export interface RoutineDay {
  id: string;
  name: string; // e.g. "Push A"
  exercises: RoutineExercise[];
}

export interface Split {
  id: string;
  name: string; // e.g. "PPL"
  days: RoutineDay[];
  createdAt: number;
}

export interface WeightEntry {
  id: string;
  date: number;
  weightKg: number;
  updated_at?: number;
  synced_at?: number;
}
