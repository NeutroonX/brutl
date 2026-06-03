import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  searchExerciseDB,
  getExerciseByName,
  getExerciseFromCache,
  searchFromCache,
  getRemainingRequests,
  type ExerciseDBEntry,
} from '@/lib/exercise-db-api';
import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlText } from '@/components/ui/BrutlText';
import { XPToast, useXPToast } from '@/components/ui/XPToast';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import {
  detectSplitName,
  getExerciseProfile,
  getMuscleRecoveryStatus,
  getInlineRoastText,
  getTopMuscles,
  getWeekNumber,
  searchExercises,
  getSuggestedExercises,
  cacheExerciseProfile,
} from '@/lib/workout-ai';
import { calcWorkoutXP } from '@/lib/xp';
import { useRoutineStore } from '@/stores/routine.store';
import { useUserStore } from '@/stores/user.store';
import { useWorkoutStore } from '@/stores/workout.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExerciseSet } from '@/types';

const SCREEN_H = Dimensions.get('window').height;

// ─── AI Exercise Picker ───────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

function difficultyColor(d: string) {
  if (d === 'beginner') return BrutlColors.success;
  if (d === 'intermediate') return BrutlColors.warning;
  return BrutlColors.accent;
}

function ExercisePicker({
  currentNames,
  onSelect,
  onClose,
}: {
  currentNames: string[];
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [aiResult, setAiResult] = useState<{ name: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [dbResults, setDbResults] = useState<ExerciseDBEntry[]>([]);
  const [dbSearching, setDbSearching] = useState(false);
  const [dailyLeft, setDailyLeft] = useState<number | null>(null);
  const aiDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const localResults = trimmed ? searchExercises(trimmed, currentNames) : getSuggestedExercises(currentNames);
  const noLocalMatch = trimmed.length >= 3 && !localResults.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  useEffect(() => {
    getRemainingRequests().then((r) => setDailyLeft(r.daily));
  }, []);

  // AI lookup for exercises not in local list
  useEffect(() => {
    if (aiDebounce.current) clearTimeout(aiDebounce.current);
    if (!noLocalMatch) { setAiResult(null); setAiLoading(false); return; }
    setAiLoading(true);
    setAiResult(null);
    aiDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/exercise-ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
          body: JSON.stringify({ exercise: trimmed }),
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile?.muscles) { cacheExerciseProfile(trimmed, profile); setAiResult({ name: trimmed }); }
        }
      } catch {}
      setAiLoading(false);
    }, 500);
    return () => { if (aiDebounce.current) clearTimeout(aiDebounce.current); };
  }, [trimmed, noLocalMatch]);

  // ExerciseDB search — check in-memory cache first, API only if needed
  useEffect(() => {
    if (dbDebounce.current) clearTimeout(dbDebounce.current);
    if (trimmed.length < 3) { setDbResults([]); return; }

    const cached = searchFromCache(trimmed);
    if (cached.length > 0) { setDbResults(cached); return; }

    setDbSearching(true);
    dbDebounce.current = setTimeout(async () => {
      const results = await searchExerciseDB(trimmed);
      setDbResults(results);
      setDbSearching(false);
      getRemainingRequests().then((r) => setDailyLeft(r.daily));
    }, 700);
    return () => { if (dbDebounce.current) clearTimeout(dbDebounce.current); };
  }, [trimmed]);

  const grouped = localResults.reduce<Record<string, typeof localResults>>((acc, ex) => {
    (acc[ex.category] = acc[ex.category] ?? []).push(ex);
    return acc;
  }, {});

  const filteredDb = dbResults.filter(
    (r) => !localResults.some((l) => l.name.toLowerCase() === r.name.toLowerCase())
      && !currentNames.some((n) => n.toLowerCase() === r.name.toLowerCase())
  );

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.epBackdrop}>
        <View style={st.epSheet}>
          <View style={st.epSearchRow}>
            <Ionicons name="search" size={16} color={BrutlColors.textDisabled} />
            <TextInput
              style={st.epSearchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises or database..."
              placeholderTextColor={BrutlColors.textDisabled}
              autoFocus
            />
            <TouchableOpacity onPress={onClose}>
              <BrutlText style={st.epCloseBtn}>✕</BrutlText>
            </TouchableOpacity>
          </View>

          {!trimmed && (
            <BrutlText style={st.epHint}>
              {currentNames.length > 0 ? 'SUGGESTED FOR YOUR SPLIT' : 'ALL EXERCISES'}
            </BrutlText>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* AI result for unknown exercises */}
            {aiLoading && noLocalMatch && (
              <View style={[st.epExRow, { opacity: 0.6 }]}>
                <BrutlText style={st.epExName}>Looking up "{trimmed}" via AI…</BrutlText>
              </View>
            )}
            {aiResult && (
              <TouchableOpacity style={st.epExRow} onPress={() => { onSelect(aiResult.name); onClose(); }}>
                <BrutlText style={[st.epExName, { flex: 1 }]}>{aiResult.name}</BrutlText>
                <View style={[st.epAiBadge, { backgroundColor: 'rgba(226,75,74,0.25)' }]}>
                  <BrutlText style={st.epAiBadgeTxt}>AI ✦</BrutlText>
                </View>
              </TouchableOpacity>
            )}
            {noLocalMatch && !aiLoading && !aiResult && trimmed.length >= 2 && (
              <TouchableOpacity style={st.epExRow} onPress={() => { onSelect(trimmed); onClose(); }}>
                <BrutlText style={[st.epExName, { color: BrutlColors.accent }]}>+ Add "{trimmed}" as custom</BrutlText>
              </TouchableOpacity>
            )}

            {/* Local exercise list */}
            {Object.entries(grouped).map(([cat, items]) => (
              <View key={cat}>
                <BrutlText style={st.epCatLabel}>{cat.toUpperCase()}</BrutlText>
                {items.map((ex) => (
                  <TouchableOpacity key={ex.name} style={st.epExRow} onPress={() => { onSelect(ex.name); onClose(); }}>
                    <BrutlText style={st.epExName}>{ex.name}</BrutlText>
                    {ex.hasProfile && (
                      <View style={st.epAiBadge}>
                        <BrutlText style={st.epAiBadgeTxt}>AI</BrutlText>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* ExerciseDB results */}
            {trimmed.length >= 3 && (filteredDb.length > 0 || dbSearching) && (
              <View>
                <BrutlText style={st.epCatLabel}>FROM DATABASE</BrutlText>
                {dbSearching && (
                  <View style={[st.epExRow, { opacity: 0.5 }]}>
                    <BrutlText style={st.epExName}>Searching database…</BrutlText>
                  </View>
                )}
                {filteredDb.map((ex) => (
                  <TouchableOpacity key={ex.id} style={st.epExRow} onPress={() => { onSelect(ex.name); onClose(); }}>
                    <View style={{ flex: 1 }}>
                      <BrutlText style={st.epExName}>{ex.name}</BrutlText>
                      <BrutlText style={{ fontSize: 10, color: BrutlColors.textDisabled, marginTop: 1 }}>
                        {ex.bodyPart} · {ex.equipment}
                      </BrutlText>
                    </View>
                    <View style={[st.epAiBadge, {
                      borderColor: difficultyColor(ex.difficulty),
                      backgroundColor: `${difficultyColor(ex.difficulty)}18`,
                    }]}>
                      <BrutlText style={[st.epAiBadgeTxt, { color: difficultyColor(ex.difficulty) }]}>
                        {ex.difficulty.toUpperCase()}
                      </BrutlText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {dailyLeft !== null && (
            <BrutlText style={{
              fontSize: 9, textAlign: 'center', paddingTop: 6,
              color: dailyLeft <= 5 ? BrutlColors.accent : BrutlColors.textDisabled,
            }}>
              {dailyLeft} database lookups remaining today
            </BrutlText>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Routines Sheet ───────────────────────────────────────────────────────────

function RoutinesSheet({
  onLoadDay,
  onClose,
}: {
  onLoadDay: (dayName: string, exercises: { name: string; sets: number; reps: string; weight?: number }[]) => void;
  onClose: () => void;
}) {
  const splits = useRoutineStore((s) => s.splits);
  const updateExercise = useRoutineStore((s) => s.updateExercise);
  const removeExercise = useRoutineStore((s) => s.removeExercise);
  const addExercise = useRoutineStore((s) => s.addExercise);
  const addSplitFn = useRoutineStore((s) => s.addSplit);
  const deleteSplitFn = useRoutineStore((s) => s.deleteSplit);
  const addDayFn = useRoutineStore((s) => s.addDay);

  const [expandedSplit, setExpandedSplit] = useState<string | null>(splits[0]?.id ?? null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [exPicker, setExPicker] = useState<{ splitId: string; dayId: string; existing: string[] } | null>(null);
  const [newSplitName, setNewSplitName] = useState('');
  const [addingNewDay, setAddingNewDay] = useState<string | null>(null); // splitId
  const [newDayName, setNewDayName] = useState('');

  function confirmDelete(splitId: string, name: string) {
    Alert.alert('Delete Split', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSplitFn(splitId) },
    ]);
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.epBackdrop}>
        <View style={[st.epSheet, { maxHeight: '88%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: BrutlSpacing.sm }}>
            <BrutlText style={{ flex: 1, fontFamily: BrutlFonts.display, fontSize: 16, color: BrutlColors.textPrimary, letterSpacing: 1 }}>
              ROUTINES
            </BrutlText>
            <TouchableOpacity onPress={onClose}>
              <BrutlText style={st.epCloseBtn}>✕</BrutlText>
            </TouchableOpacity>
          </View>

          {/* New split input */}
          <View style={st.rNewSplitRow}>
            <TextInput
              style={[st.rEditInput, { flex: 1, textAlign: 'left', paddingHorizontal: 8, width: 'auto' }]}
              value={newSplitName}
              onChangeText={setNewSplitName}
              placeholder="New split name (e.g. Bro Split)"
              placeholderTextColor={BrutlColors.textDisabled}
              onSubmitEditing={() => {
                if (!newSplitName.trim()) return;
                addSplitFn(newSplitName.trim()).then((s) => setExpandedSplit(s.id));
                setNewSplitName('');
              }}
            />
            <TouchableOpacity
              style={st.rCreateBtn}
              onPress={() => {
                if (!newSplitName.trim()) return;
                addSplitFn(newSplitName.trim()).then((s) => setExpandedSplit(s.id));
                setNewSplitName('');
              }}
            >
              <BrutlText style={st.rCreateBtnTxt}>CREATE</BrutlText>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {splits.map((split) => (
              <View key={split.id} style={st.rSplit}>
                <View style={st.rSplitHeader}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => setExpandedSplit(expandedSplit === split.id ? null : split.id)}
                  >
                    <BrutlText style={st.rSplitName}>{split.name}</BrutlText>
                    <BrutlText style={st.rSplitMeta}>{split.days.length} days</BrutlText>
                    <Ionicons
                      name={expandedSplit === split.id ? 'chevron-up' : 'chevron-down'}
                      size={13}
                      color={BrutlColors.textDisabled}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(split.id, split.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 0 }}
                  >
                    <Ionicons name="trash-outline" size={14} color={BrutlColors.textDisabled} />
                  </TouchableOpacity>
                </View>

                {expandedSplit === split.id && split.days.map((day) => (
                  <View key={day.id} style={st.rDayBlock}>
                    {/* Day header row */}
                    <View style={st.rDayHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <BrutlText style={st.rDayName}>{day.name}</BrutlText>
                        {editingDay !== day.id && (
                          <BrutlText style={st.rDayEx} numberOfLines={1}>
                            {day.exercises.map((e) => e.name).join(' · ')}
                          </BrutlText>
                        )}
                      </View>
                      <TouchableOpacity
                        style={st.rEditBtn}
                        onPress={() => setEditingDay(editingDay === day.id ? null : day.id)}
                      >
                        <Ionicons
                          name={editingDay === day.id ? 'checkmark' : 'create-outline'}
                          size={12}
                          color={editingDay === day.id ? BrutlColors.success : BrutlColors.textDisabled}
                        />
                      </TouchableOpacity>
                      {editingDay !== day.id && (
                        <TouchableOpacity
                          style={st.rStartBtn}
                          onPress={() => {
                            onLoadDay(day.name, day.exercises.map((e) => ({ name: e.name, sets: e.targetSets, reps: e.targetReps, weight: e.targetWeightKg })));
                            onClose();
                          }}
                        >
                          <BrutlText style={st.rStartTxt}>START</BrutlText>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Edit mode: exercise list with inline editing */}
                    {editingDay === day.id && (
                      <View style={st.rEditBody}>
                        {/* Column labels */}
                        <View style={st.rEditColRow}>
                          <BrutlText style={[st.rEditColLabel, { flex: 1 }]}>EXERCISE</BrutlText>
                          <BrutlText style={[st.rEditColLabel, { width: 36 }]}>SETS</BrutlText>
                          <BrutlText style={[st.rEditColLabel, { width: 60 }]}>REPS</BrutlText>
                          <BrutlText style={[st.rEditColLabel, { width: 50 }]}>KG</BrutlText>
                          <View style={{ width: 20 }} />
                        </View>
                        {day.exercises.map((ex) => (
                          <View key={ex.name} style={st.rEditRow}>
                            <BrutlText style={[st.rDayName, { flex: 1, fontSize: 11 }]} numberOfLines={1}>{ex.name}</BrutlText>
                            <TextInput
                              style={st.rEditInput}
                              value={String(ex.targetSets)}
                              onChangeText={(v) => updateExercise(split.id, day.id, ex.name, { targetSets: parseInt(v) || 1 })}
                              keyboardType="number-pad"
                              selectTextOnFocus
                            />
                            <TextInput
                              style={[st.rEditInput, { width: 60 }]}
                              value={ex.targetReps}
                              onChangeText={(v) => updateExercise(split.id, day.id, ex.name, { targetReps: v })}
                              selectTextOnFocus
                            />
                            <TextInput
                              style={[st.rEditInput, { width: 50 }]}
                              value={ex.targetWeightKg ? String(ex.targetWeightKg) : ''}
                              onChangeText={(v) => updateExercise(split.id, day.id, ex.name, { targetWeightKg: parseFloat(v) || undefined })}
                              keyboardType="decimal-pad"
                              placeholder="—"
                              placeholderTextColor={BrutlColors.textDisabled}
                              selectTextOnFocus
                            />
                            <TouchableOpacity
                              onPress={() => removeExercise(split.id, day.id, ex.name)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close" size={13} color={BrutlColors.textDisabled} />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <TouchableOpacity
                          style={st.rAddExBtn}
                          onPress={() => setExPicker({ splitId: split.id, dayId: day.id, existing: day.exercises.map((e) => e.name) })}
                        >
                          <Ionicons name="add" size={12} color={BrutlColors.accent} />
                          <BrutlText style={{ fontSize: 11, color: BrutlColors.accent }}>Add exercise</BrutlText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}

                {/* Add day row (shown when split is expanded) */}
                {expandedSplit === split.id && (
                  addingNewDay === split.id ? (
                    <View style={st.rNewDayRow}>
                      <TextInput
                        style={[st.rEditInput, { flex: 1, textAlign: 'left', paddingHorizontal: 8, width: 'auto' }]}
                        value={newDayName}
                        onChangeText={setNewDayName}
                        placeholder="Day name (e.g. Chest Day)"
                        placeholderTextColor={BrutlColors.textDisabled}
                        autoFocus
                        onSubmitEditing={() => {
                          if (!newDayName.trim()) return;
                          addDayFn(split.id, newDayName.trim());
                          setNewDayName(''); setAddingNewDay(null);
                        }}
                      />
                      <TouchableOpacity style={st.rCreateBtn} onPress={() => {
                        if (!newDayName.trim()) return;
                        addDayFn(split.id, newDayName.trim());
                        setNewDayName(''); setAddingNewDay(null);
                      }}>
                        <BrutlText style={st.rCreateBtnTxt}>ADD</BrutlText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setAddingNewDay(null); setNewDayName(''); }}>
                        <Ionicons name="close" size={14} color={BrutlColors.textDisabled} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={st.rAddDayBtn} onPress={() => setAddingNewDay(split.id)}>
                      <Ionicons name="add" size={12} color={BrutlColors.textDisabled} />
                      <BrutlText style={{ fontSize: 11, color: BrutlColors.textDisabled }}>Add day</BrutlText>
                    </TouchableOpacity>
                  )
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Exercise picker for adding to routine */}
      {exPicker && (
        <ExercisePicker
          currentNames={exPicker.existing}
          onSelect={(name) => addExercise(exPicker.splitId, exPicker.dayId, { name, targetSets: 3, targetReps: '8-12' })}
          onClose={() => setExPicker(null)}
        />
      )}
    </Modal>
  );
}

interface LiveSet {
  weightKg: string;
  reps: string;
  done: boolean;
  rpe?: number;
}

interface LiveExercise {
  name: string;
  sets: LiveSet[];
  prBeaten: boolean;
  roastText: string | null;
  notes: string;
}

interface SummaryData {
  xp: number;
  volume: number;
  prevVolume: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function logVolume(log: { exercises: ExerciseSet[] }) {
  return log.exercises.reduce((s, e) => s + e.sets * e.reps * e.weightKg, 0);
}

function sessionVolume(exercises: LiveExercise[]) {
  return exercises.reduce((total, ex) =>
    total + ex.sets.filter((s) => s.done).reduce((s, set) =>
      s + (parseFloat(set.weightKg) || 0) * (parseInt(set.reps) || 0), 0), 0);
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({
  value, onChange, step = 1, min = 0,
}: { value: string; onChange: (v: string) => void; step?: number; min?: number }) {
  function inc() { onChange(String(Math.round((parseFloat(value) + step) * 4) / 4)); }
  function dec() { const next = Math.max(min, parseFloat(value) - step); onChange(String(Math.round(next * 4) / 4)); }
  return (
    <View style={st.stepper}>
      <TouchableOpacity onPress={dec} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }} style={st.stepBtn}>
        <BrutlText style={st.stepBtnTxt}>−</BrutlText>
      </TouchableOpacity>
      <TextInput
        style={st.stepInput}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
      <TouchableOpacity onPress={inc} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }} style={st.stepBtn}>
        <BrutlText style={st.stepBtnTxt}>+</BrutlText>
      </TouchableOpacity>
    </View>
  );
}

// ─── MuscleBar ───────────────────────────────────────────────────────────────

function MuscleBar({ name, pct, tier }: { name: string; pct: number; tier: string }) {
  const color = tier === 'primary' ? BrutlColors.accent
    : tier === 'secondary' ? BrutlColors.warning
    : BrutlColors.textDisabled;
  return (
    <View style={st.muscleRow}>
      <BrutlText style={st.muscleLabel}>{name}</BrutlText>
      <View style={st.barTrack}>
        <View style={[st.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <BrutlText style={st.musclePct}>{pct}%</BrutlText>
    </View>
  );
}

// ─── SetRow ──────────────────────────────────────────────────────────────────

function SetRow({
  num, set, isNext,
  onUpdate, onDone, onLongPress,
}: {
  num: number;
  set: LiveSet;
  isNext: boolean;
  onUpdate: (field: 'weightKg' | 'reps', val: string) => void;
  onDone: () => void;
  onLongPress: () => void;
}) {
  return (
    <View style={[st.setRow, set.done && st.setRowDone]}>
      <BrutlText style={st.setNum}>S{num}</BrutlText>
      <Stepper value={set.weightKg} onChange={(v) => onUpdate('weightKg', v)} step={2.5} />
      <BrutlText style={st.setX}>kg ×</BrutlText>
      <Stepper value={set.reps} onChange={(v) => onUpdate('reps', v)} step={1} min={1} />
      <TouchableOpacity
        onPress={onDone}
        onLongPress={onLongPress}
        style={[st.doneBtn, set.done ? st.doneBtnDone : (isNext ? st.doneBtnNext : st.doneBtnPending)]}
      >
        <BrutlText style={[st.doneBtnTxt, { color: set.done ? BrutlColors.success : isNext ? BrutlColors.accent : BrutlColors.textDisabled }]}>
          {set.done ? '✓' : '→'}
        </BrutlText>
      </TouchableOpacity>
      {set.rpe !== undefined && (
        <BrutlText style={st.rpeTag}>RPE {set.rpe}</BrutlText>
      )}
    </View>
  );
}

// ─── RPE Picker ──────────────────────────────────────────────────────────────

function RPEPicker({ onSelect, onClose }: { onSelect: (rpe: number) => void; onClose: () => void }) {
  return (
    <View style={st.rpePicker}>
      <BrutlText style={st.rpePickerLabel}>RPE</BrutlText>
      <View style={st.rpeChips}>
        {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => (
          <TouchableOpacity key={v} style={st.rpeChip} onPress={() => onSelect(v)}>
            <BrutlText style={st.rpeChipTxt}>{v}</BrutlText>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[st.rpeChip, { borderColor: BrutlColors.textDisabled }]} onPress={onClose}>
          <BrutlText style={[st.rpeChipTxt, { color: BrutlColors.textDisabled }]}>✕</BrutlText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({
  ex, exIdx, baseline,
  onSetUpdate, onSetDone, onAddSet, onRemove,
  onOpenInfo, onLongPressName,
  onSetRPE, onDismissRoast,
  showNotes, onNotesChange,
  rpeTarget, onSetRPETarget,
}: {
  ex: LiveExercise;
  exIdx: number;
  baseline: number;
  onSetUpdate: (si: number, f: 'weightKg' | 'reps', v: string) => void;
  onSetDone: (si: number) => void;
  onAddSet: () => void;
  onRemove: () => void;
  onOpenInfo: () => void;
  onLongPressName: () => void;
  onSetRPE: (si: number, rpe: number) => void;
  onDismissRoast: () => void;
  showNotes: boolean;
  onNotesChange: (text: string) => void;
  rpeTarget: number | null;
  onSetRPETarget: (si: number | null) => void;
}) {
  const firstUndoneIdx = ex.sets.findIndex((s) => !s.done);
  const muscles = getTopMuscles(ex.name, 3);

  return (
    <View style={[st.card, ex.prBeaten && st.cardPR]}>
      {/* Header */}
      <View style={st.cardHeader}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={onOpenInfo} onLongPress={onLongPressName}>
            <BrutlText style={st.exName}>{ex.name}</BrutlText>
          </TouchableOpacity>
          {muscles.length > 0 && (
            <BrutlText style={st.exMeta}>
              {muscles.map((m) => m.name).join(' · ')}
            </BrutlText>
          )}
        </View>
        <View style={st.cardHeaderRight}>
          {baseline > 0 && (
            <BrutlText style={st.prLabel}>PR: {baseline}kg</BrutlText>
          )}
          {ex.prBeaten && (
            <View style={st.prBadge}>
              <BrutlText style={st.prBadgeTxt}>+1 PR</BrutlText>
            </View>
          )}
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
            <Ionicons name="close" size={16} color={BrutlColors.textDisabled} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes inline */}
      {showNotes && (
        <TextInput
          style={st.notesInput}
          value={ex.notes}
          onChangeText={onNotesChange}
          placeholder="Notes..."
          placeholderTextColor={BrutlColors.textDisabled}
          multiline
        />
      )}

      {/* Inline roast */}
      {ex.roastText && (
        <TouchableOpacity style={st.inlineRoast} onPress={onDismissRoast}>
          <BrutlText style={st.inlineRoastTxt}>{ex.roastText}</BrutlText>
        </TouchableOpacity>
      )}

      {/* Set rows */}
      <View style={st.setList}>
        {ex.sets.map((s, si) => (
          <View key={si}>
            <SetRow
              num={si + 1}
              set={s}
              isNext={si === firstUndoneIdx}
              onUpdate={(f, v) => onSetUpdate(si, f, v)}
              onDone={() => onSetDone(si)}
              onLongPress={() => s.done ? onSetRPETarget(si) : undefined}
            />
            {rpeTarget === si && (
              <RPEPicker
                onSelect={(rpe) => { onSetRPE(si, rpe); onSetRPETarget(null); }}
                onClose={() => onSetRPETarget(null)}
              />
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={st.addSetBtn} onPress={onAddSet}>
        <BrutlText style={st.addSetTxt}>+ Add set</BrutlText>
      </TouchableOpacity>

      {/* Muscle activation */}
      {muscles.length > 0 && (
        <View style={st.muscleSection}>
          <BrutlText style={st.muscleSectionLabel}>MUSCLE ACTIVATION</BrutlText>
          {muscles.map((m) => (
            <MuscleBar key={m.name} name={m.name} pct={m.activationPct} tier={m.tier} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── InfoSheet ───────────────────────────────────────────────────────────────

function InfoSheet({
  exercise,
  recentLogs,
  onClose,
}: {
  exercise: string;
  recentLogs: ReturnType<typeof useWorkoutStore.getState>['logs'];
  onClose: () => void;
}) {
  const slideY = useRef(new Animated.Value(SCREEN_H * 0.7)).current;
  const profile = getExerciseProfile(exercise);
  const muscles = getTopMuscles(exercise, 4);
  const [dbEntry, setDbEntry] = useState<ExerciseDBEntry | null>(() => getExerciseFromCache(exercise));
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, []);

  async function loadFromDB() {
    setDbLoading(true);
    setDbError(null);
    const entry = await getExerciseByName(exercise);
    if (entry) {
      setDbEntry(entry);
    } else {
      setDbError('Not found in database. Check Metro logs for API error details.');
    }
    setDbLoading(false);
  }

  function close() {
    Animated.timing(slideY, { toValue: SCREEN_H * 0.7, duration: 220, useNativeDriver: true }).start(onClose);
  }

  return (
    <Modal transparent animationType="none" onRequestClose={close}>
      <View style={st.sheetBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
        <Animated.View style={[st.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={st.sheetHandle} />
          <BrutlText style={st.sheetTitle}>{exercise}</BrutlText>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

            {/* ── Database section ───────────────────────────────── */}
            {dbEntry ? (
              <>
                {/* Badges row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: BrutlSpacing.md }}>
                  {[
                    { label: dbEntry.difficulty.toUpperCase(), color: difficultyColor(dbEntry.difficulty) },
                    { label: dbEntry.bodyPart.toUpperCase(), color: BrutlColors.textMuted },
                    { label: dbEntry.equipment.toUpperCase(), color: BrutlColors.textMuted },
                  ].map(({ label, color }) => (
                    <View key={label} style={[st.epAiBadge, { borderColor: color, backgroundColor: `${color}18`, paddingHorizontal: 8, paddingVertical: 3 }]}>
                      <BrutlText style={[st.epAiBadgeTxt, { color, fontSize: 9 }]}>{label}</BrutlText>
                    </View>
                  ))}
                </View>

                {/* Description */}
                {!!dbEntry.description && (
                  <BrutlText style={{ fontSize: 12, color: BrutlColors.textMuted, lineHeight: 18, marginBottom: BrutlSpacing.md }}>
                    {dbEntry.description}
                  </BrutlText>
                )}

                {/* Muscles */}
                <BrutlText style={st.sheetSection}>MUSCLES</BrutlText>
                <View style={st.kvRow}>
                  <BrutlText style={st.kvKey}>Primary</BrutlText>
                  <BrutlText style={[st.kvVal, { color: BrutlColors.accent }]}>{dbEntry.target}</BrutlText>
                </View>
                {dbEntry.secondaryMuscles.map((m) => (
                  <View key={m} style={st.kvRow}>
                    <BrutlText style={st.kvKey}>Secondary</BrutlText>
                    <BrutlText style={st.kvVal}>{m}</BrutlText>
                  </View>
                ))}

                {/* Step-by-step instructions */}
                <BrutlText style={st.sheetSection}>INSTRUCTIONS</BrutlText>
                {dbEntry.instructions.map((step, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                    <BrutlText style={{ fontSize: 10, color: BrutlColors.accent, width: 16 }}>{i + 1}.</BrutlText>
                    <BrutlText style={[st.formCue, { flex: 1, paddingVertical: 0 }]}>{step}</BrutlText>
                  </View>
                ))}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[st.sheetClose, { marginBottom: BrutlSpacing.sm, borderColor: BrutlColors.accent }]}
                  onPress={loadFromDB}
                  disabled={dbLoading}
                >
                  <BrutlText style={{ fontSize: 12, color: BrutlColors.accent, fontFamily: BrutlFonts.display, letterSpacing: 1 }}>
                    {dbLoading ? 'LOADING…' : 'LOAD FROM DATABASE (1 REQUEST)'}
                  </BrutlText>
                </TouchableOpacity>
                {dbError && (
                  <BrutlText style={{ fontSize: 11, color: '#FF4444', marginBottom: BrutlSpacing.md, textAlign: 'center' }}>
                    {dbError}
                  </BrutlText>
                )}
              </>
            )}

            {/* ── AI section ─────────────────────────────────────── */}
            {profile && (
              <>
                <BrutlText style={st.sheetSection}>HYPERTROPHY</BrutlText>
                {([
                  ['Rep Range', profile.hypertrophy.repRange],
                  ['Sets', profile.hypertrophy.sets],
                  ['RIR', profile.hypertrophy.rir],
                  ['Tempo', profile.hypertrophy.tempo],
                ] as [string, string][]).map(([k, v]) => (
                  <View key={k} style={st.kvRow}>
                    <BrutlText style={st.kvKey}>{k}</BrutlText>
                    <BrutlText style={st.kvVal}>{v}</BrutlText>
                  </View>
                ))}

                {!dbEntry && (
                  <>
                    <BrutlText style={st.sheetSection}>FORM CUES</BrutlText>
                    {profile.formCues.map((cue, i) => (
                      <BrutlText key={i} style={st.formCue}>· {cue}</BrutlText>
                    ))}
                  </>
                )}

                {muscles.length > 0 && (
                  <>
                    <BrutlText style={st.sheetSection}>ACTIVATION</BrutlText>
                    {muscles.map((m) => (
                      <MuscleBar key={m.name} name={m.name} pct={m.activationPct} tier={m.tier} />
                    ))}
                  </>
                )}
              </>
            )}

            {/* ── Recovery ───────────────────────────────────────── */}
            {muscles.length > 0 && (
              <>
                <BrutlText style={st.sheetSection}>MUSCLE RECOVERY</BrutlText>
                {muscles.map((m) => {
                  const status = getMuscleRecoveryStatus(m.name, recentLogs);
                  const color = status === 'ready' ? BrutlColors.success
                    : status === 'recovering' ? BrutlColors.warning
                    : BrutlColors.accent;
                  return (
                    <View key={m.name} style={st.kvRow}>
                      <BrutlText style={st.kvKey}>{m.name}</BrutlText>
                      <BrutlText style={[st.kvVal, { color }]}>{status.toUpperCase()}</BrutlText>
                    </View>
                  );
                })}
              </>
            )}

            {!dbEntry && !profile && (
              <View style={{ alignItems: 'center', paddingVertical: BrutlSpacing.xl }}>
                <BrutlText style={st.kvKey}>Load from database or search to get exercise info.</BrutlText>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={st.sheetClose} onPress={close}>
            <BrutlText style={st.sheetCloseTxt}>CLOSE</BrutlText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── SummarySheet ────────────────────────────────────────────────────────────

function SummarySheet({ data, onClose }: { data: SummaryData | null; onClose: () => void }) {
  if (!data) return null;
  const diff = data.prevVolume > 0 ? Math.round(((data.volume - data.prevVolume) / data.prevVolume) * 100) : null;
  const ahead = diff !== null && diff >= 0;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.summaryBackdrop}>
        <View style={st.summarySheet}>
          <BrutlText style={st.summaryTitle}>SESSION DONE</BrutlText>

          <View style={st.summaryRow}>
            <BrutlText style={st.summaryKey}>XP EARNED</BrutlText>
            <BrutlText style={[st.summaryVal, { color: BrutlColors.accent }]}>+{data.xp}</BrutlText>
          </View>
          <View style={st.summaryRow}>
            <BrutlText style={st.summaryKey}>TOTAL VOLUME</BrutlText>
            <BrutlText style={st.summaryVal}>{Math.round(data.volume)}kg</BrutlText>
          </View>
          {diff !== null && (
            <View style={st.summaryRow}>
              <BrutlText style={st.summaryKey}>VS LAST SESSION</BrutlText>
              <BrutlText style={[st.summaryVal, { color: ahead ? BrutlColors.success : BrutlColors.accent }]}>
                {ahead ? '▲' : '▼'} {Math.abs(diff)}%
              </BrutlText>
            </View>
          )}

          <TouchableOpacity style={st.summaryBtn} onPress={onClose}>
            <BrutlText style={st.summaryBtnTxt}>DONE</BrutlText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);
  const updateXP = useUserStore((s) => s.updateXP);
  const addLog = useWorkoutStore((s) => s.addLog);
  const getBaseline = useWorkoutStore((s) => s.getBaselineForExercise);
  const recentLogs = useWorkoutStore((s) => s.getRecentLogs)(30);
  const lastSession = recentLogs[0] ?? null;
  const { pending: xpPending, showXP, clearXP } = useXPToast();

  const pendingDay = useRoutineStore((s) => s.pendingDay);
  const clearPending = useRoutineStore((s) => s.setPendingDay);

  const [exercises, setExercises] = useState<LiveExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showRoutines, setShowRoutines] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [restSecs, setRestSecs] = useState<number | null>(null);
  const [infoSheet, setInfoSheet] = useState<string | null>(null);
  const [notesExIdx, setNotesExIdx] = useState<number | null>(null);
  const [rpeTargets, setRpeTargets] = useState<Record<number, number | null>>({});
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [saving, setSaving] = useState(false);

  // Load from routine if one was started from the routines screen
  useEffect(() => {
    if (!pendingDay) return;
    const lastSession = recentLogs[0];
    const loaded: LiveExercise[] = pendingDay.exercises.map((re) => {
      const lastEx = lastSession?.exercises.find(
        (e) => e.exercise.toLowerCase() === re.name.toLowerCase()
      );
      return {
        name: re.name,
        sets: Array.from({ length: re.targetSets }, () => ({
          weightKg: lastEx ? String(lastEx.weightKg) : (re.targetWeightKg ? String(re.targetWeightKg) : '60'),
          reps: lastEx ? String(lastEx.reps) : re.targetReps.split('-')[0],
          done: false,
        })),
        prBeaten: false,
        roastText: null,
        notes: '',
      };
    });
    setExercises(loaded);
    clearPending(null);
  }, [pendingDay]);

  // Session timer
  useEffect(() => {
    const id = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Rest timer countdown
  useEffect(() => {
    if (restSecs === null) return;
    if (restSecs <= 0) {
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      setRestSecs(null);
      return;
    }
    const id = setTimeout(() => setRestSecs((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [restSecs]);

  const splitName = detectSplitName(exercises.map((e) => e.name));
  const week = getWeekNumber(profile?.createdAt);
  const curVolume = sessionVolume(exercises);
  const prevVolume = lastSession ? logVolume(lastSession) : 0;
  const beatStatus = prevVolume === 0 ? null : curVolume >= prevVolume ? 'beating' : 'behind';
  const sessionXP = exercises.reduce((total, ex) =>
    total + ex.sets.filter((s) => s.done).reduce((s, set) =>
      s + Math.max(1, Math.round((parseFloat(set.weightKg) || 0) * (parseInt(set.reps) || 0) / 100)), 0), 0);

  function handleLoadDay(dayName: string, exList: { name: string; sets: number; reps: string; weight?: number }[]) {
    const lastSession = recentLogs[0];
    const loaded: LiveExercise[] = exList.map((re) => {
      const lastEx = lastSession?.exercises.find((e) => e.exercise.toLowerCase() === re.name.toLowerCase());
      return {
        name: re.name,
        sets: Array.from({ length: re.sets }, () => ({
          weightKg: lastEx ? String(lastEx.weightKg) : (re.weight ? String(re.weight) : '60'),
          reps: lastEx ? String(lastEx.reps) : re.reps.split('-')[0],
          done: false,
        })),
        prBeaten: false,
        roastText: null,
        notes: '',
      };
    });
    setExercises(loaded);
  }

  function addExercise(name: string) {
    if (!name.trim()) return;
    // Pre-fill from last session if available
    const lastEx = lastSession?.exercises.find((e) => e.exercise.toLowerCase() === name.toLowerCase());
    const defaultWeight = lastEx ? String(lastEx.weightKg) : '60';
    const defaultReps = lastEx ? String(lastEx.reps) : '10';
    setExercises((prev) => [
      ...prev,
      { name, sets: [{ weightKg: defaultWeight, reps: defaultReps, done: false }], prBeaten: false, roastText: null, notes: '' },
    ]);
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { weightKg: last?.weightKg ?? '60', reps: last?.reps ?? '10', done: false }] };
      })
    );
  }

  function updateSet(exIdx: number, si: number, field: 'weightKg' | 'reps', val: string) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => j !== si ? s : { ...s, [field]: val }) }
      )
    );
  }

  function markSetDone(exIdx: number, si: number) {
    const ex = exercises[exIdx];
    const set = ex.sets[si];
    if (set.done) {
      // Toggle back to undone
      setExercises((prev) =>
        prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, done: false }) })
      );
      return;
    }

    const weight = parseFloat(set.weightKg) || 0;
    const baseline = getBaseline(ex.name);
    const isPR = baseline > 0 && weight > baseline;
    const isWeak = baseline > 0 && weight < baseline * 0.9 && !ex.roastText;
    const roastText = isWeak ? getInlineRoastText(weight, baseline, ex.name) : ex.roastText;

    setExercises((prev) =>
      prev.map((e, i) =>
        i !== exIdx ? e : {
          ...e,
          sets: e.sets.map((s, j) => j !== si ? s : { ...s, done: true }),
          prBeaten: e.prBeaten || isPR,
          roastText,
        }
      )
    );

    setRestSecs(90);
    if (isPR) showXP(20);
  }

  function setRPE(exIdx: number, si: number, rpe: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i !== exIdx ? e : { ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, rpe }) }
      )
    );
  }

  function dismissRoast(exIdx: number) {
    setExercises((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, roastText: null }));
  }

  function updateNotes(exIdx: number, text: string) {
    setExercises((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, notes: text }));
  }

  async function handleFinish() {
    if (exercises.length === 0 || !profile) return;
    setSaving(true);

    const doneSets = exercises.flatMap((ex) =>
      ex.sets.filter((s) => s.done).map((s): ExerciseSet => ({
        exercise: ex.name,
        sets: 1,
        reps: parseInt(s.reps) || 1,
        weightKg: parseFloat(s.weightKg) || 0,
      }))
    );
    if (doneSets.length === 0) { setSaving(false); return; }

    const durationMins = Math.max(1, Math.round(elapsedSecs / 60));
    const baseXP = calcWorkoutXP(doneSets, durationMins);
    const xp = baseXP;
    await addLog(doneSets, durationMins, xp);
    await updateXP(xp);
    showXP(xp);
    setSummary({ xp, volume: curVolume, prevVolume });

    // Fire roast if any exercise was weak
    for (const ex of exercises) {
      const topDoneSet = ex.sets.find((s) => s.done);
      const baseline = getBaseline(ex.name);
      if (topDoneSet && baseline > 0 && parseFloat(topDoneSet.weightKg) < baseline * 0.9) {
        streamRoast(
          buildRoastPayload('WEAK_LIFT', profile.rank, profile.streakDays, null, {
            id: Date.now().toString(),
            date: Date.now(),
            exercises: doneSets,
            durationMinutes: durationMins,
            xpEarned: xp,
          })
        );
        break;
      }
    }

    setSaving(false);
  }

  function closeSummary() {
    setSummary(null);
    setExercises([]);
    setElapsedSecs(0);
    setRestSecs(null);
  }

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <XPToast amount={xpPending} onHide={clearXP} />

      {/* Fixed session header */}
      <View style={[st.header, { paddingTop: insets.top + BrutlSpacing.sm }]}>
        <View>
          <BrutlText style={st.headerSplit}>{splitName}</BrutlText>
          <BrutlText style={st.headerSub}>Strength & Size · Week {week}</BrutlText>
        </View>
        <TouchableOpacity style={st.routinesBtn} onPress={() => setShowRoutines(true)}>
          <Ionicons name="copy-outline" size={13} color={BrutlColors.textMuted} />
          <BrutlText style={st.routinesBtnTxt}>ROUTINES</BrutlText>
        </TouchableOpacity>
        <View style={st.headerRight}>
          <BrutlText style={st.headerTimer}>{formatTime(elapsedSecs)}</BrutlText>
          <BrutlText style={st.headerVolume}>{Math.round(curVolume)}kg total</BrutlText>
          {sessionXP > 0 && <BrutlText style={st.headerXP}>+{sessionXP} XP</BrutlText>}
        </View>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Previous session banner */}
        {lastSession && (
          <View style={st.prevBanner}>
            <View>
              <BrutlText style={st.prevLabel}>LAST SESSION</BrutlText>
              <BrutlText style={st.prevStats}>
                {new Date(lastSession.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}{Math.round(prevVolume)}kg
              </BrutlText>
            </View>
            {beatStatus && (
              <BrutlText style={[st.beatLabel, { color: beatStatus === 'beating' ? BrutlColors.success : BrutlColors.accent }]}>
                {beatStatus === 'beating' ? '▲ Beating it' : '▲ Beat it'}
              </BrutlText>
            )}
          </View>
        )}

        {/* Add exercise */}
        <View>
          <BrutlText style={st.sectionLabel}>ADD EXERCISE</BrutlText>
          <TouchableOpacity style={st.pickerTrigger} onPress={() => setShowPicker(true)}>
            <Ionicons name="search" size={15} color={BrutlColors.textDisabled} />
            <BrutlText style={st.pickerPlaceholder}>Search 80+ exercises with AI suggestions...</BrutlText>
          </TouchableOpacity>
        </View>

        {/* Exercise cards */}
        {exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={`${ex.name}-${exIdx}`}
            ex={ex}
            exIdx={exIdx}
            baseline={getBaseline(ex.name)}
            onSetUpdate={(si, f, v) => updateSet(exIdx, si, f, v)}
            onSetDone={(si) => markSetDone(exIdx, si)}
            onAddSet={() => addSet(exIdx)}
            onRemove={() => removeExercise(exIdx)}
            onOpenInfo={() => setInfoSheet(ex.name)}
            onLongPressName={() => setNotesExIdx(notesExIdx === exIdx ? null : exIdx)}
            onSetRPE={(si, rpe) => setRPE(exIdx, si, rpe)}
            onDismissRoast={() => dismissRoast(exIdx)}
            showNotes={notesExIdx === exIdx}
            onNotesChange={(text) => updateNotes(exIdx, text)}
            rpeTarget={rpeTargets[exIdx] ?? null}
            onSetRPETarget={(si) => setRpeTargets((prev) => ({ ...prev, [exIdx]: si }))}
          />
        ))}

        {exercises.length === 0 && (
          <View style={st.emptyState}>
            <Ionicons name="barbell-outline" size={32} color={BrutlColors.textDisabled} />
            <BrutlText style={st.emptyTxt}>Tap an exercise above to start your session.</BrutlText>
          </View>
        )}
      </ScrollView>

      {/* Rest timer strip */}
      {restSecs !== null && (
        <View style={st.restStrip}>
          <BrutlText style={st.restLabel}>Rest timer</BrutlText>
          <View style={st.restRight}>
            <BrutlText style={st.restCountdown}>{formatTime(restSecs)}</BrutlText>
            <TouchableOpacity onPress={() => setRestSecs(null)} style={st.restSkip}>
              <BrutlText style={st.restSkipTxt}>Skip</BrutlText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRestSecs(90)} style={st.restSkip}>
              <BrutlText style={st.restSkipTxt}>Reset</BrutlText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CTA */}
      <View style={st.ctaArea}>
        <BrutlButton
          label="FINISH WORKOUT"
          onPress={handleFinish}
          disabled={exercises.length === 0 || saving}
          loading={saving}
        />
      </View>

      {/* Routines sheet */}
      {showRoutines && (
        <RoutinesSheet
          onLoadDay={handleLoadDay}
          onClose={() => setShowRoutines(false)}
        />
      )}

      {/* Exercise picker */}
      {showPicker && (
        <ExercisePicker
          currentNames={exercises.map((e) => e.name)}
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Info sheet */}
      {infoSheet && (
        <InfoSheet
          exercise={infoSheet}
          recentLogs={recentLogs}
          onClose={() => setInfoSheet(null)}
        />
      )}

      {/* Summary sheet */}
      <SummarySheet data={summary} onClose={closeSummary} />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: BrutlSpacing.xl,
    paddingTop: BrutlSpacing.md,
    paddingBottom: BrutlSpacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: BrutlColors.border,
  },
  headerSplit: {
    fontFamily: BrutlFonts.display,
    fontSize: 28,
    color: BrutlColors.textPrimary,
    letterSpacing: 1,
  },
  headerSub: { fontSize: 10, color: '#555555', marginTop: 1 },
  routinesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BrutlRadius.sm, borderWidth: 1, borderColor: BrutlColors.border },
  routinesBtnTxt: { fontSize: 9, color: BrutlColors.textMuted, fontFamily: BrutlFonts.display, letterSpacing: 1 },
  headerRight: { alignItems: 'flex-end', gap: 2 },
  headerTimer: { fontSize: 14, color: BrutlColors.accent, fontFamily: BrutlFonts.mono },
  headerVolume: { fontSize: 10, color: BrutlColors.textMuted },
  headerXP: { fontSize: 10, color: BrutlColors.accent },

  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 160 },

  sectionLabel: { fontSize: 10, color: BrutlColors.accent, letterSpacing: 1, marginBottom: BrutlSpacing.sm },

  // Previous session banner
  prevBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: BrutlRadius.md,
    padding: BrutlSpacing.md,
  },
  prevLabel: { fontSize: 9, color: '#555555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  prevStats: { fontSize: 11, color: '#888888' },
  beatLabel: { fontSize: 11, fontFamily: BrutlFonts.display, letterSpacing: 0.5 },

  // Add exercise picker trigger
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.sm,
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm + 2,
  },
  pickerPlaceholder: { fontSize: 13, color: BrutlColors.textDisabled, flex: 1 },

  // Exercise card
  card: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.md,
    borderWidth: 1,
    borderColor: BrutlColors.border,
    borderLeftWidth: 3,
    borderLeftColor: BrutlColors.border,
    padding: BrutlSpacing.md,
    gap: BrutlSpacing.sm,
  },
  cardPR: { borderLeftColor: BrutlColors.accent },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: BrutlSpacing.sm },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm },
  exName: { fontSize: 15, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.display, letterSpacing: 0.5 },
  exMeta: { fontSize: 10, color: '#555555', marginTop: 2 },
  prLabel: { fontSize: 9, color: BrutlColors.textDisabled },
  prBadge: { backgroundColor: BrutlColors.accent, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  prBadgeTxt: { fontSize: 9, color: '#fff', fontFamily: BrutlFonts.display, letterSpacing: 0.5 },

  notesInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textMuted,
    fontSize: 12,
    padding: BrutlSpacing.sm,
    minHeight: 50,
  },

  inlineRoast: {
    backgroundColor: 'rgba(226,75,74,0.08)',
    borderLeftWidth: 2,
    borderLeftColor: BrutlColors.accent,
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 5,
    borderRadius: 2,
  },
  inlineRoastTxt: { fontSize: 11, color: BrutlColors.accent },

  setList: { gap: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setRowDone: { opacity: 0.45 },
  setNum: { fontSize: 10, color: '#555555', width: 20 },
  setX: { fontSize: 11, color: '#333333', marginHorizontal: 2 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: BrutlRadius.sm },
  stepBtn: { paddingHorizontal: 8, paddingVertical: 5 },
  stepBtnTxt: { fontSize: 14, color: BrutlColors.textMuted, lineHeight: 16 },
  stepInput: {
    color: BrutlColors.textPrimary,
    fontSize: 11,
    textAlign: 'center',
    minWidth: 36,
    paddingVertical: 5,
    fontFamily: BrutlFonts.mono,
  },

  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  doneBtnPending: { borderColor: '#2A2A2A' },
  doneBtnNext: { borderColor: BrutlColors.accent, backgroundColor: 'rgba(226,75,74,0.08)' },
  doneBtnDone: { borderColor: BrutlColors.success, backgroundColor: 'rgba(74,226,75,0.08)' },
  doneBtnTxt: { fontSize: 14 },

  rpeTag: { fontSize: 9, color: BrutlColors.textDisabled, marginLeft: 4 },

  rpePicker: { paddingTop: 4, paddingLeft: 26 },
  rpePickerLabel: { fontSize: 9, color: BrutlColors.textDisabled, marginBottom: 4 },
  rpeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  rpeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.accent,
  },
  rpeChipTxt: { fontSize: 10, color: BrutlColors.accent },

  addSetBtn: { paddingVertical: 6, alignItems: 'center' },
  addSetTxt: { fontSize: 11, color: BrutlColors.textDisabled },

  muscleSection: { borderTopWidth: 0.5, borderTopColor: BrutlColors.border, paddingTop: BrutlSpacing.sm, gap: 5 },
  muscleSectionLabel: { fontSize: 9, color: '#555555', letterSpacing: 1, marginBottom: 2 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muscleLabel: { fontSize: 10, color: '#888888', width: 100 },
  barTrack: { flex: 1, height: 3, backgroundColor: '#1A1A1A', borderRadius: 2 },
  barFill: { height: 3, borderRadius: 2 },
  musclePct: { fontSize: 9, color: '#555555', width: 30, textAlign: 'right' },

  // Empty state
  emptyState: { alignItems: 'center', gap: BrutlSpacing.sm, paddingVertical: BrutlSpacing.xl },
  emptyTxt: { textAlign: 'center', color: BrutlColors.textDisabled, fontSize: 13 },

  // Rest strip
  restStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#110000',
    borderTopWidth: 0.5,
    borderTopColor: '#2A0000',
    paddingHorizontal: BrutlSpacing.xl,
    paddingVertical: 10,
  },
  restLabel: { fontSize: 11, color: BrutlColors.textDisabled },
  restRight: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  restCountdown: { fontSize: 14, color: BrutlColors.accent, fontFamily: BrutlFonts.mono },
  restSkip: { paddingHorizontal: 6, paddingVertical: 3 },
  restSkipTxt: { fontSize: 10, color: BrutlColors.textDisabled },

  ctaArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: BrutlSpacing.xl,
    backgroundColor: BrutlColors.bg,
    borderTopWidth: 0.5,
    borderTopColor: BrutlColors.border,
  },

  // Info sheet
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    height: SCREEN_H * 0.7,
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: BrutlSpacing.xl,
    paddingTop: BrutlSpacing.md,
  },
  sheetHandle: { width: 36, height: 3, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: BrutlSpacing.md },
  sheetTitle: { fontFamily: BrutlFonts.display, fontSize: 22, color: BrutlColors.textPrimary, letterSpacing: 1, marginBottom: BrutlSpacing.md },
  sheetSection: { fontSize: 9, color: BrutlColors.accent, letterSpacing: 1, marginTop: BrutlSpacing.md, marginBottom: BrutlSpacing.sm },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border },
  kvKey: { fontSize: 11, color: BrutlColors.textMuted },
  kvVal: { fontSize: 11, color: BrutlColors.textPrimary },
  formCue: { fontSize: 11, color: '#888888', paddingVertical: 3, lineHeight: 17 },
  sheetClose: {
    marginTop: BrutlSpacing.md,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    borderRadius: BrutlRadius.sm,
    padding: BrutlSpacing.sm,
    alignItems: 'center',
  },
  sheetCloseTxt: { fontSize: 12, color: BrutlColors.textMuted, fontFamily: BrutlFonts.display, letterSpacing: 1 },

  // Routines sheet
  rSplit: { borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border },
  rSplitHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6 },
  rSplitName: { flex: 1, fontFamily: BrutlFonts.display, fontSize: 15, color: BrutlColors.textPrimary, letterSpacing: 0.5 },
  rSplitMeta: { fontSize: 10, color: BrutlColors.textDisabled },
  rDayBlock: { borderTopWidth: 0.5, borderTopColor: BrutlColors.border },
  rDayHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: BrutlSpacing.md, paddingRight: BrutlSpacing.sm, gap: 6 },
  rDayName: { fontSize: 12, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.display, letterSpacing: 0.3, marginBottom: 1 },
  rDayEx: { fontSize: 10, color: BrutlColors.textDisabled },
  rEditBtn: { padding: 6, borderRadius: BrutlRadius.sm, borderWidth: 1, borderColor: BrutlColors.border },
  rStartBtn: { backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  rStartTxt: { color: '#fff', fontSize: 9, fontFamily: BrutlFonts.display, letterSpacing: 1 },
  rEditBody: { paddingHorizontal: BrutlSpacing.md, paddingBottom: BrutlSpacing.sm },
  rEditColRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rEditColLabel: { fontSize: 8, color: BrutlColors.textDisabled, letterSpacing: 0.5, width: 36, textAlign: 'center' },
  rEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  rEditInput: {
    width: 36,
    backgroundColor: BrutlColors.bgCardSubtle,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontSize: 11,
    paddingVertical: 4,
    textAlign: 'center',
    fontFamily: BrutlFonts.mono,
  },
  rAddExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  rNewSplitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: BrutlSpacing.sm },
  rCreateBtn: { backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  rCreateBtnTxt: { color: '#fff', fontSize: 10, fontFamily: BrutlFonts.display, letterSpacing: 1 },
  rAddDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: BrutlSpacing.md, paddingVertical: 8 },
  rNewDayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: BrutlSpacing.md, paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: BrutlColors.border },

  // Exercise picker (ep namespace used inline)
  epBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  epSheet: { backgroundColor: '#111', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%', padding: BrutlSpacing.lg, paddingTop: BrutlSpacing.md },
  epSearchRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm, backgroundColor: BrutlColors.bgCardSubtle, borderRadius: BrutlRadius.sm, borderWidth: 1, borderColor: BrutlColors.borderVisible, paddingHorizontal: BrutlSpacing.sm, paddingVertical: 8, marginBottom: BrutlSpacing.sm },
  epSearchInput: { flex: 1, color: BrutlColors.textPrimary, fontSize: 14 },
  epCloseBtn: { fontSize: 14, color: BrutlColors.textDisabled, paddingHorizontal: 4 },
  epHint: { fontSize: 9, color: BrutlColors.textDisabled, letterSpacing: 1, marginBottom: BrutlSpacing.sm },
  epCatLabel: { fontSize: 9, color: BrutlColors.accent, letterSpacing: 1, marginTop: BrutlSpacing.md, marginBottom: 4 },
  epExRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border },
  epExName: { flex: 1, fontSize: 14, color: BrutlColors.textPrimary },
  epAiBadge: { backgroundColor: 'rgba(226,75,74,0.15)', borderWidth: 1, borderColor: BrutlColors.accent, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 8 },
  epAiBadgeTxt: { fontSize: 8, color: BrutlColors.accent, fontFamily: BrutlFonts.display, letterSpacing: 0.5 },

  // Summary sheet
  summaryBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  summarySheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: BrutlSpacing.xl,
    gap: BrutlSpacing.md,
  },
  summaryTitle: { fontFamily: BrutlFonts.display, fontSize: 28, color: BrutlColors.textPrimary, letterSpacing: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { fontSize: 11, color: BrutlColors.textMuted, letterSpacing: 0.5 },
  summaryVal: { fontSize: 18, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.display, letterSpacing: 1 },
  summaryBtn: {
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    padding: BrutlSpacing.md,
    alignItems: 'center',
    marginTop: BrutlSpacing.sm,
  },
  summaryBtnTxt: { color: '#fff', fontFamily: BrutlFonts.display, fontSize: 16, letterSpacing: 2 },
});
