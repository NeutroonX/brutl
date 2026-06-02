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
import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { searchExercises, getSuggestedExercises } from '@/lib/workout-ai';
import { useRoutineStore } from '@/stores/routine.store';
import type { RoutineDay, RoutineExercise, Split } from '@/types';

// ─── Exercise Picker (reused from workout screen) ─────────────────────────────

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
            <TouchableOpacity onPress={onClose}>
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
                  <TouchableOpacity key={ex.name} style={ps.exRow} onPress={() => { onSelect(ex.name); onClose(); }}>
                    <View style={{ flex: 1 }}>
                      <BrutlText style={ps.exName}>{ex.name}</BrutlText>
                    </View>
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

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({
  split,
  day,
  onStart,
  onDelete,
  onAddExercise,
  onRemoveExercise,
}: {
  split: Split;
  day: RoutineDay;
  onStart: () => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onRemoveExercise: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={dc.card}>
      <TouchableOpacity style={dc.header} onPress={() => setExpanded((v) => !v)}>
        <View style={{ flex: 1 }}>
          <BrutlText style={dc.name}>{day.name}</BrutlText>
          <BrutlText style={dc.meta}>{day.exercises.length} exercises</BrutlText>
        </View>
        <TouchableOpacity style={dc.startBtn} onPress={onStart}>
          <BrutlText style={dc.startTxt}>START</BrutlText>
        </TouchableOpacity>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={BrutlColors.textDisabled}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={dc.body}>
          {day.exercises.map((ex, i) => (
            <View key={i} style={dc.exRow}>
              <BrutlText style={dc.exName}>{ex.name}</BrutlText>
              <BrutlText style={dc.exMeta}>{ex.targetSets}×{ex.targetReps}</BrutlText>
              <TouchableOpacity
                onPress={() => onRemoveExercise(ex.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={12} color={BrutlColors.textDisabled} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={dc.actions}>
            <TouchableOpacity style={dc.addExBtn} onPress={onAddExercise}>
              <Ionicons name="add" size={13} color={BrutlColors.accent} />
              <BrutlText style={dc.addExTxt}>Add exercise</BrutlText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete}>
              <BrutlText style={dc.deleteDay}>Delete day</BrutlText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Split Card ───────────────────────────────────────────────────────────────

function SplitCard({ split }: { split: Split }) {
  const addDay = useRoutineStore((s) => s.addDay);
  const deleteDay = useRoutineStore((s) => s.deleteDay);
  const deleteSplit = useRoutineStore((s) => s.deleteSplit);
  const addExercise = useRoutineStore((s) => s.addExercise);
  const removeExercise = useRoutineStore((s) => s.removeExercise);
  const setPendingDay = useRoutineStore((s) => s.setPendingDay);

  const [pickerTarget, setPickerTarget] = useState<{ dayId: string; names: string[] } | null>(null);
  const [addingDay, setAddingDay] = useState(false);
  const [dayName, setDayName] = useState('');

  const totalEx = split.days.reduce((s, d) => s + d.exercises.length, 0);

  function handleStart(day: RoutineDay) {
    setPendingDay(day);
    router.push('/workout');
  }

  function confirmDeleteSplit() {
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
    <View style={sc.card}>
      <View style={sc.header}>
        <View>
          <BrutlText style={sc.name}>{split.name}</BrutlText>
          <BrutlText style={sc.meta}>{split.days.length} days · {totalEx} exercises</BrutlText>
        </View>
        <TouchableOpacity onPress={confirmDeleteSplit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
          <Ionicons name="trash-outline" size={14} color={BrutlColors.textDisabled} />
        </TouchableOpacity>
      </View>

      {split.days.map((day) => (
        <DayCard
          key={day.id}
          split={split}
          day={day}
          onStart={() => handleStart(day)}
          onDelete={() => deleteDay(split.id, day.id)}
          onAddExercise={() => setPickerTarget({ dayId: day.id, names: day.exercises.map((e) => e.name) })}
          onRemoveExercise={(name) => removeExercise(split.id, day.id, name)}
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
          <TouchableOpacity onPress={() => { setAddingDay(false); setDayName(''); }}>
            <Ionicons name="close" size={16} color={BrutlColors.textDisabled} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={sc.addDayBtn} onPress={() => setAddingDay(true)}>
          <Ionicons name="add" size={13} color={BrutlColors.textDisabled} />
          <BrutlText style={sc.addDayTxt}>Add day</BrutlText>
        </TouchableOpacity>
      )}

      {pickerTarget && (
        <ExercisePicker
          currentNames={pickerTarget.names}
          onSelect={(name) => addExercise(split.id, pickerTarget.dayId, { name, targetSets: 3, targetReps: '8-12' })}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoutinesScreen() {
  const splits = useRoutineStore((s) => s.splits);
  const addSplit = useRoutineStore((s) => s.addSplit);
  const [newSplitName, setNewSplitName] = useState('');
  const [creating, setCreating] = useState(false);

  function handleCreate() {
    if (!newSplitName.trim()) return;
    addSplit(newSplitName.trim());
    setNewSplitName('');
    setCreating(false);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <BrutlText style={s.title}>ROUTINES</BrutlText>
        <TouchableOpacity onPress={() => setCreating(true)} style={s.newBtn}>
          <Ionicons name="add" size={14} color="#fff" />
          <BrutlText style={s.newBtnTxt}>NEW SPLIT</BrutlText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {splits.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="clipboard-outline" size={32} color={BrutlColors.textDisabled} />
            <BrutlText style={s.emptyTxt}>No splits yet. Create one above.</BrutlText>
          </View>
        )}
        {splits.map((split) => (
          <SplitCard key={split.id} split={split} />
        ))}
      </ScrollView>

      {/* New split modal */}
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
              <TouchableOpacity style={s.modalCancel} onPress={() => { setCreating(false); setNewSplitName(''); }}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BrutlSpacing.xl,
    paddingTop: BrutlSpacing.md,
    paddingBottom: BrutlSpacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: BrutlColors.border,
  },
  title: { fontFamily: BrutlFonts.display, fontSize: 24, color: BrutlColors.textPrimary, letterSpacing: 1 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrutlColors.accent,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: 6,
    borderRadius: BrutlRadius.sm,
  },
  newBtnTxt: { fontFamily: BrutlFonts.display, fontSize: 12, color: '#fff', letterSpacing: 1 },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', gap: BrutlSpacing.sm, paddingVertical: BrutlSpacing.xxl },
  emptyTxt: { color: BrutlColors.textDisabled, fontSize: 13, textAlign: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: BrutlSpacing.xl },
  modal: { backgroundColor: '#111', borderRadius: BrutlRadius.lg, padding: BrutlSpacing.xl, gap: BrutlSpacing.md },
  modalTitle: { fontFamily: BrutlFonts.display, fontSize: 20, color: BrutlColors.textPrimary, letterSpacing: 1 },
  modalInput: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontSize: 14,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
  },
  modalBtns: { flexDirection: 'row', gap: BrutlSpacing.sm },
  modalCancel: { flex: 1, padding: BrutlSpacing.sm, alignItems: 'center', borderWidth: 1, borderColor: BrutlColors.borderVisible, borderRadius: BrutlRadius.sm },
  modalCancelTxt: { color: BrutlColors.textMuted, fontSize: 13 },
  modalConfirm: { flex: 1, padding: BrutlSpacing.sm, alignItems: 'center', backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm },
  modalConfirmTxt: { color: '#fff', fontFamily: BrutlFonts.display, fontSize: 13, letterSpacing: 1 },
});

// Split card styles
const sc = StyleSheet.create({
  card: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.md,
    borderWidth: 1,
    borderColor: BrutlColors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BrutlSpacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: BrutlColors.border,
  },
  name: { fontFamily: BrutlFonts.display, fontSize: 18, color: BrutlColors.textPrimary, letterSpacing: 0.5 },
  meta: { fontSize: 10, color: BrutlColors.textDisabled, marginTop: 1 },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: BrutlSpacing.md },
  addDayTxt: { fontSize: 12, color: BrutlColors.textDisabled },
  addDayRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm, padding: BrutlSpacing.md },
  addDayInput: {
    flex: 1,
    backgroundColor: BrutlColors.bgCardSubtle,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontSize: 13,
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 6,
  },
  addDayConfirm: { backgroundColor: BrutlColors.accent, borderRadius: BrutlRadius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  addDayConfirmTxt: { color: '#fff', fontSize: 12, fontFamily: BrutlFonts.display },
});

// Day card styles
const dc = StyleSheet.create({
  card: {
    borderTopWidth: 0.5,
    borderTopColor: BrutlColors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: 10,
  },
  name: { fontSize: 13, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.display, letterSpacing: 0.3 },
  meta: { fontSize: 10, color: BrutlColors.textDisabled, marginTop: 1 },
  startBtn: {
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 'auto',
  },
  startTxt: { color: '#fff', fontSize: 10, fontFamily: BrutlFonts.display, letterSpacing: 1 },
  body: { paddingHorizontal: BrutlSpacing.md, paddingBottom: BrutlSpacing.sm },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  exName: { flex: 1, fontSize: 12, color: BrutlColors.textPrimary },
  exMeta: { fontSize: 10, color: BrutlColors.textDisabled },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: BrutlSpacing.sm },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExTxt: { fontSize: 12, color: BrutlColors.accent },
  deleteDay: { fontSize: 11, color: BrutlColors.textDisabled },
});

// Picker styles
const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    padding: BrutlSpacing.lg,
    paddingTop: BrutlSpacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.sm,
    backgroundColor: BrutlColors.bgCardSubtle,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 8,
    marginBottom: BrutlSpacing.sm,
  },
  searchInput: { flex: 1, color: BrutlColors.textPrimary, fontSize: 14 },
  closeBtn: { fontSize: 14, color: BrutlColors.textDisabled, paddingHorizontal: 4 },
  hint: { fontSize: 9, color: BrutlColors.textDisabled, letterSpacing: 1, marginBottom: BrutlSpacing.sm },
  catLabel: { fontSize: 9, color: BrutlColors.accent, letterSpacing: 1, marginTop: BrutlSpacing.md, marginBottom: 4 },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: BrutlColors.border,
  },
  exName: { fontSize: 14, color: BrutlColors.textPrimary },
  aiBadge: {
    backgroundColor: 'rgba(226,75,74,0.15)',
    borderWidth: 1,
    borderColor: BrutlColors.accent,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 8,
  },
  aiBadgeTxt: { fontSize: 8, color: BrutlColors.accent, fontFamily: BrutlFonts.display, letterSpacing: 0.5 },
});
