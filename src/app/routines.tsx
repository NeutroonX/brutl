import { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutlText } from '@/components/ui/BrutlText';
import { GymCameraModal } from '@/components/GymCameraModal';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { searchExercises, getSuggestedExercises } from '@/lib/workout-ai';
import { useRoutineStore } from '@/stores/routine.store';
import type { RoutineDay, RoutineExercise, Split } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function nextDay(split: Split, lastStarted: Record<string, number>): RoutineDay | null {
  if (!split.days.length) return null;
  const mostRecent = split.days.reduce<RoutineDay | null>((best, d) => {
    const t = lastStarted[d.id] ?? 0;
    return !best || t > (lastStarted[best.id] ?? 0) ? d : best;
  }, null);
  if (!mostRecent || !lastStarted[mostRecent.id]) return split.days[0];
  const idx = split.days.findIndex((d) => d.id === mostRecent.id);
  return split.days[(idx + 1) % split.days.length];
}

// ─── Exercise Picker ──────────────────────────────────────────────────────────

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
  const results = query.trim()
    ? searchExercises(query, currentNames)
    : getSuggestedExercises(currentNames);

  const grouped = results.reduce<Record<string, typeof results>>((acc, ex) => {
    (acc[ex.category] = acc[ex.category] ?? []).push(ex);
    return acc;
  }, {});

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={ps.backdrop}>
        <View style={ps.sheet}>
          <View style={ps.searchRow}>
            <Ionicons name="search" size={16} color={BrutlColors.textDisabled} />
            <TextInput
              style={ps.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises..."
              placeholderTextColor={BrutlColors.textDisabled}
              autoFocus
            />
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <BrutlText style={ps.closeBtn}>✕</BrutlText>
            </TouchableOpacity>
          </View>
          {!query.trim() && (
            <BrutlText style={ps.hint}>
              {currentNames.length > 0 ? 'SUGGESTED FOR THIS DAY' : 'ALL EXERCISES'}
            </BrutlText>
          )}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {Object.entries(grouped).map(([cat, items]) => (
              <View key={cat}>
                <BrutlText style={ps.catLabel}>{cat.toUpperCase()}</BrutlText>
                {items.map((ex) => (
                  <TouchableOpacity
                    key={ex.name}
                    style={ps.exRow}
                    onPress={() => { onSelect(ex.name); onClose(); }}
                  >
                    <BrutlText style={ps.exName}>{ex.name}</BrutlText>
                    {ex.hasProfile && (
                      <View style={ps.aiBadge}>
                        <BrutlText style={ps.aiBadgeTxt}>AI</BrutlText>
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

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  splitId,
  dayId,
  ex,
}: {
  splitId: string;
  dayId: string;
  ex: RoutineExercise;
}) {
  const updateExercise = useRoutineStore((s) => s.updateExercise);
  const removeExercise = useRoutineStore((s) => s.removeExercise);
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(ex.targetSets.toString());
  const [reps, setReps] = useState(ex.targetReps);
  const [weight, setWeight] = useState(ex.targetWeightKg?.toString() ?? '');

  function confirmEdit() {
    const n = parseInt(sets, 10);
    updateExercise(splitId, dayId, ex.name, {
      targetSets: isNaN(n) ? ex.targetSets : Math.max(1, n),
      targetReps: reps.trim() || ex.targetReps,
      targetWeightKg: weight ? parseFloat(weight) : undefined,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <View style={er.editRow}>
        <BrutlText style={er.editName} numberOfLines={1}>{ex.name}</BrutlText>
        <View style={er.editInputs}>
          <View style={er.inputGroup}>
            <TextInput
              style={er.input}
              value={sets}
              onChangeText={setSets}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
            />
            <BrutlText style={er.inputLabel}>sets</BrutlText>
          </View>
          <View style={er.inputGroup}>
            <TextInput
              style={[er.input, { width: 52 }]}
              value={reps}
              onChangeText={setReps}
              maxLength={8}
              selectTextOnFocus
            />
            <BrutlText style={er.inputLabel}>reps</BrutlText>
          </View>
          <View style={er.inputGroup}>
            <TextInput
              style={er.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              maxLength={5}
              placeholder="—"
              placeholderTextColor={BrutlColors.textDisabled}
              selectTextOnFocus
            />
            <BrutlText style={er.inputLabel}>kg</BrutlText>
          </View>
        </View>
        <TouchableOpacity onPress={confirmEdit} hitSlop={8}>
          <Ionicons name="checkmark" size={18} color={BrutlColors.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditing(false)} hitSlop={8}>
          <Ionicons name="close" size={16} color={BrutlColors.textDisabled} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={er.row}>
      <BrutlText style={er.name} numberOfLines={1}>{ex.name}</BrutlText>
      <BrutlText style={er.meta}>
        {ex.targetSets}×{ex.targetReps}{ex.targetWeightKg ? `  ${ex.targetWeightKg}kg` : ''}
      </BrutlText>
      <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
        <Ionicons name="pencil-outline" size={13} color={BrutlColors.textDisabled} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => removeExercise(splitId, dayId, ex.name)} hitSlop={8}>
        <Ionicons name="close" size={13} color={BrutlColors.textDisabled} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({
  split,
  day,
  lastStarted,
  defaultExpanded,
}: {
  split: Split;
  day: RoutineDay;
  lastStarted: Record<string, number>;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const addExercise = useRoutineStore((s) => s.addExercise);
  const deleteDay = useRoutineStore((s) => s.deleteDay);
  const setPendingDay = useRoutineStore((s) => s.setPendingDay);

  const lastTs = lastStarted[day.id];

  function handleStart() {
    setPendingDay(day);
    router.push('/workout');
  }

  function handleDelete() {
    Alert.alert('Delete Day', `Delete "${day.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDay(split.id, day.id) },
    ]);
  }

  return (
    <View style={dc.card}>
      <TouchableOpacity style={dc.header} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={12}
          color={BrutlColors.textDisabled}
          style={{ marginRight: 6 }}
        />
        <View style={{ flex: 1 }}>
          <BrutlText style={dc.name}>{day.name}</BrutlText>
          <BrutlText style={dc.meta}>
            {day.exercises.length} {day.exercises.length === 1 ? 'exercise' : 'exercises'}
            {lastTs ? `  ·  Last: ${fmtDate(lastTs)}` : '  ·  Never done'}
          </BrutlText>
        </View>
        <TouchableOpacity style={dc.startBtn} onPress={handleStart}>
          <BrutlText style={dc.startTxt}>START</BrutlText>
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded && (
        <View style={dc.body}>
          {day.exercises.length === 0 ? (
            <BrutlText style={dc.emptyEx}>No exercises yet.</BrutlText>
          ) : (
            day.exercises.map((ex) => (
              <ExerciseRow key={ex.name} splitId={split.id} dayId={day.id} ex={ex} />
            ))
          )}
          <View style={dc.actions}>
            <TouchableOpacity style={dc.addExBtn} onPress={() => setPickerOpen(true)}>
              <Ionicons name="add" size={13} color={BrutlColors.accent} />
              <BrutlText style={dc.addExTxt}>Add exercise</BrutlText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <BrutlText style={dc.deleteDay}>Delete day</BrutlText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {pickerOpen && (
        <ExercisePicker
          currentNames={day.exercises.map((e) => e.name)}
          onSelect={(name) => addExercise(split.id, day.id, { name, targetSets: 3, targetReps: '8-12' })}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </View>
  );
}

// ─── Split Card ───────────────────────────────────────────────────────────────

function SplitCard({
  split,
  isActive,
  lastStarted,
}: {
  split: Split;
  isActive: boolean;
  lastStarted: Record<string, number>;
}) {
  const deleteSplit = useRoutineStore((s) => s.deleteSplit);
  const addDay = useRoutineStore((s) => s.addDay);
  const setActiveSplit = useRoutineStore((s) => s.setActiveSplit);
  const [addingDay, setAddingDay] = useState(false);
  const [dayName, setDayName] = useState('');

  const totalEx = split.days.reduce((sum, d) => sum + d.exercises.length, 0);
  const suggested = isActive ? nextDay(split, lastStarted) : null;

  function handleDelete() {
    Alert.alert('Delete Split', `Delete "${split.name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSplit(split.id) },
    ]);
  }

  function handleAddDay() {
    if (!dayName.trim()) return;
    addDay(split.id, dayName.trim());
    setDayName('');
    setAddingDay(false);
  }

  return (
    <View style={[sc.card, isActive && sc.cardActive]}>
      <View style={sc.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BrutlText style={sc.name}>{split.name}</BrutlText>
            {isActive && (
              <View style={sc.activePill}>
                <BrutlText style={sc.activePillTxt}>ACTIVE</BrutlText>
              </View>
            )}
          </View>
          <BrutlText style={sc.meta}>
            {split.days.length} {split.days.length === 1 ? 'day' : 'days'} · {totalEx} exercises
          </BrutlText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {isActive ? (
            <TouchableOpacity onPress={() => setActiveSplit(null)}>
              <BrutlText style={[sc.setActiveTxt, { color: BrutlColors.textDisabled }]}>Deactivate</BrutlText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setActiveSplit(split.id)}>
              <BrutlText style={sc.setActiveTxt}>Set active</BrutlText>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
            <Ionicons name="trash-outline" size={14} color={BrutlColors.textDisabled} />
          </TouchableOpacity>
        </View>
      </View>

      {isActive && suggested && (
        <View style={sc.nextUp}>
          <BrutlText style={sc.nextUpLabel}>NEXT UP</BrutlText>
          <BrutlText style={sc.nextUpDay}>{suggested.name}</BrutlText>
        </View>
      )}

      {split.days.map((day) => (
        <DayCard
          key={day.id}
          split={split}
          day={day}
          lastStarted={lastStarted}
          defaultExpanded={isActive && suggested?.id === day.id}
        />
      ))}

      {addingDay ? (
        <View style={sc.addDayRow}>
          <TextInput
            style={sc.addDayInput}
            value={dayName}
            onChangeText={setDayName}
            placeholder="Day name (e.g. Push A)"
            placeholderTextColor={BrutlColors.textDisabled}
            autoFocus
            onSubmitEditing={handleAddDay}
          />
          <TouchableOpacity onPress={handleAddDay} style={sc.addDayConfirm}>
            <BrutlText style={sc.addDayConfirmTxt}>Add</BrutlText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setAddingDay(false); setDayName(''); }} hitSlop={8}>
            <Ionicons name="close" size={16} color={BrutlColors.textDisabled} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={sc.addDayBtn} onPress={() => setAddingDay(true)}>
          <Ionicons name="add" size={13} color={BrutlColors.textDisabled} />
          <BrutlText style={sc.addDayTxt}>Add day</BrutlText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoutinesScreen() {
  const splits = useRoutineStore((s) => s.splits);
  const activeSplitId = useRoutineStore((s) => s.activeSplitId);
  const lastStarted = useRoutineStore((s) => s.lastStarted);
  const addSplit = useRoutineStore((s) => s.addSplit);
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = useState(false);
  const [newSplitName, setNewSplitName] = useState('');
  const [showGymCamera, setShowGymCamera] = useState(false);

  // Active split first
  const sorted = [...splits].sort((a, b) =>
    a.id === activeSplitId ? -1 : b.id === activeSplitId ? 1 : 0
  );

  function handleCreate() {
    if (!newSplitName.trim()) return;
    addSplit(newSplitName.trim());
    setNewSplitName('');
    setCreating(false);
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + BrutlSpacing.sm }]}>
        <BrutlText style={s.title}>Routines</BrutlText>
        <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
          <TouchableOpacity onPress={() => setShowGymCamera(true)} style={s.cameraBtn}>
            <Ionicons name="camera" size={18} color={BrutlColors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCreating(true)} style={s.newBtn}>
            <Ionicons name="add" size={14} color="#fff" />
            <BrutlText style={s.newBtnTxt}>NEW SPLIT</BrutlText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + BrutlSpacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {splits.length === 0 ? (
          <View style={s.empty}>
            <BrutlText style={s.emptyTitle}>No splits yet.</BrutlText>
            <BrutlText style={s.emptyBody}>
              Create one above. PPL, Upper/Lower, 5/3/1 — whatever you commit to, you won't follow anyway.
            </BrutlText>
          </View>
        ) : (
          sorted.map((split) => (
            <SplitCard
              key={split.id}
              split={split}
              isActive={split.id === activeSplitId}
              lastStarted={lastStarted}
            />
          ))
        )}

        {/* Gym Shot */}
        <TouchableOpacity style={s.gymShotCard} onPress={() => setShowGymCamera(true)} activeOpacity={0.75}>
          <View style={s.gymShotLeft}>
            <View style={s.gymShotIconBox}>
              <Ionicons name="camera" size={22} color={BrutlColors.accent} />
            </View>
            <View style={s.gymShotText}>
              <BrutlText style={s.gymShotTitle}>GYM SHOT</BrutlText>
              <BrutlText style={s.gymShotSub}>CAPTURE YOUR PROGRESS</BrutlText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={BrutlColors.textDisabled} />
        </TouchableOpacity>
      </ScrollView>

      <GymCameraModal visible={showGymCamera} onClose={() => setShowGymCamera(false)} />

      <Modal transparent animationType="fade" visible={creating} onRequestClose={() => setCreating(false)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <BrutlText style={s.modalTitle}>NEW SPLIT</BrutlText>
            <TextInput
              style={s.modalInput}
              value={newSplitName}
              onChangeText={setNewSplitName}
              placeholder="e.g. PHUL, Bro Split, 5/3/1"
              placeholderTextColor={BrutlColors.textDisabled}
              autoFocus
              onSubmitEditing={handleCreate}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setCreating(false); setNewSplitName(''); }}
              >
                <BrutlText style={s.modalCancelTxt}>Cancel</BrutlText>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={handleCreate}>
                <BrutlText style={s.modalConfirmTxt}>CREATE</BrutlText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: BrutlSpacing.xl, paddingBottom: BrutlSpacing.md,
    borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border,
  },
  title: { fontFamily: BrutlFonts.display, fontSize: 28, color: BrutlColors.textPrimary, letterSpacing: 1 },
  cameraBtn: {
    width: 36, height: 36, borderRadius: BrutlRadius.sm,
    borderWidth: 1, borderColor: `${BrutlColors.accent}50`,
    backgroundColor: `${BrutlColors.accent}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BrutlColors.accent, paddingHorizontal: BrutlSpacing.md, paddingVertical: 7,
    borderRadius: BrutlRadius.sm,
  },
  newBtnTxt: { fontFamily: BrutlFonts.display, fontSize: 11, color: '#fff', letterSpacing: 1 },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg },

  gymShotCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: BrutlColors.bgCard, borderRadius: BrutlRadius.md,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    padding: BrutlSpacing.md,
  },
  gymShotLeft: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  gymShotIconBox: {
    width: 44, height: 44, borderRadius: BrutlRadius.sm,
    backgroundColor: `${BrutlColors.accent}18`,
    borderWidth: 1, borderColor: `${BrutlColors.accent}40`,
    alignItems: 'center', justifyContent: 'center',
  },
  gymShotText: { gap: 2 },
  gymShotTitle: { fontFamily: BrutlFonts.display, fontSize: 18, color: BrutlColors.textPrimary, letterSpacing: 1 },
  gymShotSub: { fontSize: 10, color: BrutlColors.textDisabled, letterSpacing: 1.2 },

  empty: { paddingVertical: BrutlSpacing.xxl, alignItems: 'center', gap: BrutlSpacing.sm },
  emptyTitle: { fontFamily: BrutlFonts.display, fontSize: 20, color: BrutlColors.textMuted, letterSpacing: 0.5 },
  emptyBody: { fontSize: 13, color: BrutlColors.textDisabled, textAlign: 'center', lineHeight: 19, paddingHorizontal: BrutlSpacing.lg },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: BrutlSpacing.xl },
  modal: {
    backgroundColor: BrutlColors.bgCard, borderRadius: BrutlRadius.lg,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    padding: BrutlSpacing.xl, gap: BrutlSpacing.md,
  },
  modalTitle: { fontFamily: BrutlFonts.display, fontSize: 20, color: BrutlColors.textPrimary, letterSpacing: 1 },
  modalInput: {
    backgroundColor: BrutlColors.bgCardSubtle, borderRadius: BrutlRadius.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary, fontSize: 14,
    paddingHorizontal: BrutlSpacing.md, paddingVertical: BrutlSpacing.sm,
  },
  modalBtns: { flexDirection: 'row', gap: BrutlSpacing.sm },
  modalCancel: { flex: 1, padding: BrutlSpacing.sm, alignItems: 'center', borderWidth: 1, borderColor: BrutlColors.borderVisible, borderRadius: BrutlRadius.sm },
  modalCancelTxt: { color: BrutlColors.textMuted, fontSize: 13 },
  modalConfirm: { flex: 1, padding: BrutlSpacing.sm, alignItems: 'center', backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm },
  modalConfirmTxt: { fontFamily: BrutlFonts.display, fontSize: 13, color: '#fff', letterSpacing: 1 },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: BrutlColors.bgCard, borderRadius: BrutlRadius.md,
    borderWidth: 1, borderColor: BrutlColors.border, overflow: 'hidden',
  },
  cardActive: { borderColor: `${BrutlColors.accent}50` },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: BrutlSpacing.md,
    borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border,
  },
  name: { fontFamily: BrutlFonts.display, fontSize: 18, color: BrutlColors.textPrimary, letterSpacing: 0.5 },
  meta: { fontSize: 10, color: BrutlColors.textDisabled },
  activePill: {
    backgroundColor: `${BrutlColors.accent}20`, borderWidth: 1, borderColor: BrutlColors.accent,
    borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1,
  },
  activePillTxt: { fontSize: 8, color: BrutlColors.accent, fontFamily: BrutlFonts.display, letterSpacing: 1 },
  setActiveTxt: { fontSize: 11, color: BrutlColors.accent },
  nextUp: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: BrutlSpacing.md, paddingVertical: 8,
    backgroundColor: `${BrutlColors.accent}08`,
    borderBottomWidth: 0.5, borderBottomColor: `${BrutlColors.accent}30`,
  },
  nextUpLabel: { fontSize: 9, color: BrutlColors.accent, letterSpacing: 1.5, fontFamily: BrutlFonts.display },
  nextUpDay: { fontSize: 12, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.display, letterSpacing: 0.3 },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: BrutlSpacing.md },
  addDayTxt: { fontSize: 12, color: BrutlColors.textDisabled },
  addDayRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm, padding: BrutlSpacing.md },
  addDayInput: {
    flex: 1, backgroundColor: BrutlColors.bgCardSubtle, borderRadius: BrutlRadius.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary, fontSize: 13,
    paddingHorizontal: BrutlSpacing.sm, paddingVertical: 6,
  },
  addDayConfirm: { backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  addDayConfirmTxt: { color: '#fff', fontSize: 12, fontFamily: BrutlFonts.display },
});

const dc = StyleSheet.create({
  card: { borderTopWidth: 0.5, borderTopColor: BrutlColors.border },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: BrutlSpacing.md, paddingVertical: 11,
  },
  name: { fontFamily: BrutlFonts.display, fontSize: 14, color: BrutlColors.textPrimary, letterSpacing: 0.3 },
  meta: { fontSize: 10, color: BrutlColors.textDisabled, marginTop: 1 },
  startBtn: {
    backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm,
    paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8,
  },
  startTxt: { fontFamily: BrutlFonts.display, fontSize: 10, color: '#fff', letterSpacing: 1 },
  body: { paddingHorizontal: BrutlSpacing.md, paddingBottom: BrutlSpacing.sm },
  emptyEx: { fontSize: 11, color: BrutlColors.textDisabled, fontStyle: 'italic', paddingVertical: 8 },
  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: BrutlSpacing.sm, paddingTop: BrutlSpacing.sm,
    borderTopWidth: 0.5, borderTopColor: BrutlColors.border,
  },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExTxt: { fontSize: 12, color: BrutlColors.accent },
  deleteDay: { fontSize: 11, color: BrutlColors.textDisabled },
});

const er = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8,
    borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border,
  },
  name: { flex: 1, fontSize: 12, color: BrutlColors.textPrimary },
  meta: { fontSize: 10, color: BrutlColors.textDisabled },
  editRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8,
    borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border,
    backgroundColor: `${BrutlColors.accent}08`, paddingHorizontal: 4, borderRadius: 4,
  },
  editName: { flex: 1, fontSize: 11, color: BrutlColors.textPrimary },
  editInputs: { flexDirection: 'row', gap: 6 },
  inputGroup: { alignItems: 'center', gap: 1 },
  input: {
    backgroundColor: BrutlColors.bgCardSubtle, borderRadius: 4,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary, fontSize: 12,
    paddingHorizontal: 6, paddingVertical: 3, width: 36, textAlign: 'center',
  },
  inputLabel: { fontSize: 8, color: BrutlColors.textDisabled },
});

const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BrutlColors.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '85%', padding: BrutlSpacing.lg, paddingTop: BrutlSpacing.md,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm,
    backgroundColor: BrutlColors.bgCardSubtle, borderRadius: BrutlRadius.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    paddingHorizontal: BrutlSpacing.sm, paddingVertical: 8, marginBottom: BrutlSpacing.sm,
  },
  searchInput: { flex: 1, color: BrutlColors.textPrimary, fontSize: 14 },
  closeBtn: { fontSize: 14, color: BrutlColors.textDisabled, paddingHorizontal: 4 },
  hint: { fontSize: 9, color: BrutlColors.textDisabled, letterSpacing: 1, marginBottom: BrutlSpacing.sm },
  catLabel: { fontSize: 9, color: BrutlColors.accent, letterSpacing: 1, marginTop: BrutlSpacing.md, marginBottom: 4 },
  exRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: BrutlColors.border,
  },
  exName: { flex: 1, fontSize: 14, color: BrutlColors.textPrimary },
  aiBadge: {
    backgroundColor: `${BrutlColors.accent}18`, borderWidth: 1, borderColor: BrutlColors.accent,
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 8,
  },
  aiBadgeTxt: { fontSize: 8, color: BrutlColors.accent, fontFamily: BrutlFonts.display, letterSpacing: 0.5 },
});
