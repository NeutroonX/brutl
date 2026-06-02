import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { XPToast, useXPToast } from '@/components/ui/XPToast';
import { useDungeonStore } from '@/stores/dungeon.store';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import { calcWorkoutXP } from '@/lib/xp';
import { useUserStore } from '@/stores/user.store';
import { useWorkoutStore } from '@/stores/workout.store';
import type { ExerciseSet } from '@/types';

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull Up',
  'Row', 'Incline Bench', 'Leg Press', 'Bicep Curl', 'Tricep Pushdown',
];

interface SetEntry {
  sets: string;
  reps: string;
  weightKg: string;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 120 },
  sectionLabel: { color: BrutlColors.accent, marginBottom: BrutlSpacing.sm },
  input: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 15,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: BrutlSpacing.sm },
  chip: {
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.xs,
    borderRadius: BrutlRadius.full,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },
  exerciseRow: { gap: BrutlSpacing.sm },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  setRow: { flexDirection: 'row', gap: BrutlSpacing.sm },
  setInput: { flex: 1, textAlign: 'center' },
  setLabel: { textAlign: 'center', marginBottom: BrutlSpacing.xs },
  addSetBtn: {
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    borderRadius: BrutlRadius.sm,
    padding: BrutlSpacing.sm,
    alignItems: 'center',
  },
  ctaArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: BrutlSpacing.xl, backgroundColor: BrutlColors.bg },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm },
});

export default function WorkoutScreen() {
  const profile = useUserStore((s) => s.profile);
  const updateXP = useUserStore((s) => s.updateXP);
  const addLog = useWorkoutStore((s) => s.addLog);
  const getBaseline = useWorkoutStore((s) => s.getBaselineForExercise);
  const recentLogs = useWorkoutStore((s) => s.getRecentLogs)(7);
  const multiplier = useDungeonStore((s) => s.getMultiplier)();
  const { pending: xpPending, showXP, clearXP } = useXPToast();

  const [exercise, setExercise] = useState('');
  const [exercises, setExercises] = useState<{ name: string; sets: SetEntry[] }[]>([]);
  const [duration, setDuration] = useState('45');
  const [saving, setSaving] = useState(false);

  function addExercise(name: string) {
    if (!name.trim()) return;
    setExercises((prev) => [...prev, { name, sets: [{ sets: '3', reps: '10', weightKg: '60' }] }]);
    setExercise('');
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, { sets: '3', reps: '10', weightKg: ex.sets[ex.sets.length - 1]?.weightKg ?? '60' }] } : ex
      )
    );
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, value: string) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)) }
          : ex
      )
    );
  }

  async function handleSubmit() {
    if (exercises.length === 0 || !profile) return;
    setSaving(true);

    const parsed: ExerciseSet[] = exercises.flatMap((ex) =>
      ex.sets.map((s) => ({
        exercise: ex.name,
        sets: parseInt(s.sets) || 1,
        reps: parseInt(s.reps) || 1,
        weightKg: parseFloat(s.weightKg) || 0,
      }))
    );

    const baseXP = calcWorkoutXP(parsed, parseInt(duration) || 45);
    const xp = Math.round(baseXP * multiplier);
    await addLog(parsed, parseInt(duration) || 45, xp);
    await updateXP(xp);
    showXP(xp);

    // Check if any exercise is below baseline — fire roast if so
    for (const ex of exercises) {
      const topSet = ex.sets[0];
      const baseline = getBaseline(ex.name);
      if (baseline > 0 && parseFloat(topSet.weightKg) < baseline * 0.9) {
        streamRoast(
          buildRoastPayload('WEAK_LIFT', profile.rank, profile.streakDays, null, {
            id: Date.now().toString(),
            date: Date.now(),
            exercises: parsed,
            durationMinutes: parseInt(duration) || 45,
            xpEarned: xp,
          })
        );
        break;
      }
    }

    setSaving(false);
    setExercises([]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <XPToast amount={xpPending} onHide={clearXP} multiplier={multiplier} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrutlText variant="heading">Log Workout</BrutlText>

        {/* Last session / empty state */}
        {exercises.length === 0 && recentLogs.length > 0 && (
          <BrutlCard subtle>
            <BrutlText variant="caption" style={styles.sectionLabel}>LAST SESSION</BrutlText>
            <View style={{ gap: BrutlSpacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <BrutlText variant="caption">{new Date(recentLogs[0].date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</BrutlText>
                <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>+{recentLogs[0].xpEarned} XP · {recentLogs[0].durationMinutes}min</BrutlText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {[...new Set(recentLogs[0].exercises.map(e => e.exercise))].map((name) => (
                  <TouchableOpacity key={name} onPress={() => addExercise(name)}
                    style={{ backgroundColor: BrutlColors.bgCard, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: BrutlColors.borderVisible }}>
                    <BrutlText variant="caption" style={{ fontSize: 11 }}>+ {name}</BrutlText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </BrutlCard>
        )}
        {exercises.length === 0 && recentLogs.length === 0 && (
          <BrutlCard subtle>
            <View style={{ alignItems: 'center', gap: BrutlSpacing.sm, paddingVertical: BrutlSpacing.md }}>
              <Ionicons name="barbell-outline" size={32} color={BrutlColors.textDisabled} />
              <BrutlText variant="muted" style={{ textAlign: 'center' }}>
                No sessions yet. Pick an exercise below and start your first workout.
              </BrutlText>
            </View>
          </BrutlCard>
        )}

        {/* Duration */}
        <View>
          <BrutlText variant="caption" style={styles.sectionLabel}>DURATION (MIN)</BrutlText>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholderTextColor={BrutlColors.textDisabled}
          />
        </View>

        {/* Exercise Picker */}
        <View>
          <BrutlText variant="caption" style={styles.sectionLabel}>ADD EXERCISE</BrutlText>
          <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={exercise}
              onChangeText={setExercise}
              placeholder="Exercise name"
              placeholderTextColor={BrutlColors.textDisabled}
              onSubmitEditing={() => addExercise(exercise)}
            />
            <TouchableOpacity
              style={[styles.addSetBtn, { paddingHorizontal: BrutlSpacing.md }]}
              onPress={() => addExercise(exercise)}
            >
              <BrutlText variant="accent">ADD</BrutlText>
            </TouchableOpacity>
          </View>
          <View style={[styles.chipRow, { marginTop: BrutlSpacing.sm }]}>
            {COMMON_EXERCISES.map((e) => (
              <TouchableOpacity key={e} style={styles.chip} onPress={() => addExercise(e)}>
                <BrutlText variant="caption">{e}</BrutlText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exercise List */}
        {exercises.map((ex, exIdx) => (
          <BrutlCard key={exIdx}>
            <View style={styles.exerciseRow}>
              <View style={styles.exerciseHeader}>
                <BrutlText variant="body">{ex.name}</BrutlText>
                <TouchableOpacity onPress={() => removeExercise(exIdx)}>
                  <BrutlText variant="accent">Remove</BrutlText>
                </TouchableOpacity>
              </View>

              {/* Column headers */}
              <View style={styles.setRow}>
                {(['sets', 'reps', 'weightKg'] as const).map((f) => (
                  <BrutlText key={f} variant="caption" style={[styles.setLabel, { flex: 1 }]}>
                    {f === 'weightKg' ? 'KG' : f.toUpperCase()}
                  </BrutlText>
                ))}
              </View>

              {ex.sets.map((s, setIdx) => (
                <View key={setIdx} style={styles.setRow}>
                  {(['sets', 'reps', 'weightKg'] as const).map((f) => (
                    <TextInput
                      key={f}
                      style={[styles.input, styles.setInput]}
                      value={s[f]}
                      onChangeText={(v) => updateSet(exIdx, setIdx, f, v)}
                      keyboardType="decimal-pad"
                    />
                  ))}
                </View>
              ))}

              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
                <BrutlText variant="muted">+ Add Set</BrutlText>
              </TouchableOpacity>
            </View>
          </BrutlCard>
        ))}
      </ScrollView>

      <View style={styles.ctaArea}>
        <BrutlButton
          label="LOG WORKOUT"
          onPress={handleSubmit}
          disabled={exercises.length === 0 || saving}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
