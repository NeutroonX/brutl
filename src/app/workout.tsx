import { useEffect, useRef, useState } from 'react';
import {
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
} from '@/lib/workout-ai';
import { calcWorkoutXP } from '@/lib/xp';
import { useDungeonStore } from '@/stores/dungeon.store';
import { useRoutineStore } from '@/stores/routine.store';
import { useUserStore } from '@/stores/user.store';
import { useWorkoutStore } from '@/stores/workout.store';
import type { ExerciseSet } from '@/types';

const SCREEN_H = Dimensions.get('window').height;

// ─── AI Exercise Picker ───────────────────────────────────────────────────────

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
  const trimmed = query.trim();
  const results = trimmed ? searchExercises(trimmed, currentNames) : getSuggestedExercises(currentNames);
  const showCustom = trimmed.length > 1 && !results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  const grouped = results.reduce<Record<string, typeof results>>((acc, ex) => {
    (acc[ex.category] = acc[ex.category] ?? []).push(ex);
    return acc;
  }, {});

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
              placeholder="Search or type any exercise..."
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
            {/* Custom / unknown exercise */}
            {showCustom && (
              <TouchableOpacity
                style={[st.epExRow, { borderBottomColor: BrutlColors.accentDim }]}
                onPress={() => { onSelect(trimmed); onClose(); }}
              >
                <BrutlText style={[st.epExName, { color: BrutlColors.accent }]}>+ Add "{trimmed}"</BrutlText>
                <BrutlText style={[st.epAiBadgeTxt, { color: BrutlColors.textDisabled }]}>Custom</BrutlText>
              </TouchableOpacity>
            )}
            {Object.entries(grouped).map(([cat, items]) => (
              <View key={cat}>
                <BrutlText style={st.epCatLabel}>{cat.toUpperCase()}</BrutlText>
                {items.map((ex) => (
                  <TouchableOpacity
                    key={ex.name}
                    style={st.epExRow}
                    onPress={() => { onSelect(ex.name); onClose(); }}
                  >
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
          </ScrollView>
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
  const [expandedSplit, setExpandedSplit] = useState<string | null>(splits[0]?.id ?? null);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.epBackdrop}>
        <View style={[st.epSheet, { maxHeight: '80%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: BrutlSpacing.md }}>
            <BrutlText style={[st.epHint, { flex: 1, fontSize: 14, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.display, letterSpacing: 1 }]}>
              ROUTINES
            </BrutlText>
            <TouchableOpacity onPress={onClose}>
              <BrutlText style={st.epCloseBtn}>✕</BrutlText>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {splits.map((split) => (
              <View key={split.id} style={st.rSplit}>
                <TouchableOpacity
                  style={st.rSplitHeader}
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
                {expandedSplit === split.id && split.days.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={st.rDay}
                    onPress={() => {
                      onLoadDay(day.name, day.exercises.map((e) => ({ name: e.name, sets: e.targetSets, reps: e.targetReps, weight: e.targetWeightKg })));
                      onClose();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <BrutlText style={st.rDayName}>{day.name}</BrutlText>
                      <BrutlText style={st.rDayEx}>{day.exercises.map((e) => e.name).join(' · ')}</BrutlText>
                    </View>
                    <View style={st.rStartBtn}>
                      <BrutlText style={st.rStartTxt}>START</BrutlText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
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

  useEffect(() => {
    Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, []);

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

          {profile ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Hypertrophy */}
              <BrutlText style={st.sheetSection}>HYPERTROPHY</BrutlText>
              {[
                ['Rep Range', profile.hypertrophy.repRange],
                ['Sets', profile.hypertrophy.sets],
                ['RIR', profile.hypertrophy.rir],
                ['Tempo', profile.hypertrophy.tempo],
              ].map(([k, v]) => (
                <View key={k} style={st.kvRow}>
                  <BrutlText style={st.kvKey}>{k}</BrutlText>
                  <BrutlText style={st.kvVal}>{v}</BrutlText>
                </View>
              ))}

              {/* Form cues */}
              <BrutlText style={st.sheetSection}>FORM CUES</BrutlText>
              {profile.formCues.map((cue, i) => (
                <BrutlText key={i} style={st.formCue}>· {cue}</BrutlText>
              ))}

              {/* Recovery */}
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
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <BrutlText style={st.kvKey}>No AI profile for this exercise yet.</BrutlText>
            </View>
          )}

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
  const profile = useUserStore((s) => s.profile);
  const updateXP = useUserStore((s) => s.updateXP);
  const addLog = useWorkoutStore((s) => s.addLog);
  const getBaseline = useWorkoutStore((s) => s.getBaselineForExercise);
  const recentLogs = useWorkoutStore((s) => s.getRecentLogs)(30);
  const lastSession = recentLogs[0] ?? null;
  const multiplier = useDungeonStore((s) => s.getMultiplier)();
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
    const xp = Math.round(baseXP * multiplier);
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
      <XPToast amount={xpPending} onHide={clearXP} multiplier={multiplier} />

      {/* Fixed session header */}
      <View style={st.header}>
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
    fontSize: 24,
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
  rDay: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: BrutlSpacing.md, gap: 8 },
  rDayName: { fontSize: 12, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.display, letterSpacing: 0.3, marginBottom: 2 },
  rDayEx: { fontSize: 10, color: BrutlColors.textDisabled },
  rStartBtn: { backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  rStartTxt: { color: '#fff', fontSize: 9, fontFamily: BrutlFonts.display, letterSpacing: 1 },

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
