import { router } from 'expo-router';
import { useState } from 'react';
import {
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
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { calcMacroTargets, useUserStore } from '@/stores/user.store';
import { useQuestStore } from '@/stores/quest.store';
import type { MacroTargets } from '@/types';

const ACTIVITY_LABELS: Record<string, string> = {
  SEDENTARY: 'Sedentary ×1.2',
  LIGHT: 'Light ×1.375',
  MODERATE: 'Moderate ×1.55',
  ACTIVE: 'Active ×1.725',
  VERY_ACTIVE: 'Very Active ×1.9',
};

const GOAL_LABELS: Record<string, string> = {
  FAT_LOSS: 'Fat Loss (−500 kcal deficit)',
  MUSCLE_GAIN: 'Muscle Gain (+250 kcal surplus)',
  RECOMP: 'Recomp (maintenance)',
};

function MacroEditCard({
  label, value, unit, color, onEdit,
}: {
  label: string; value: number; unit: string; color: string; onEdit: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  function commit() {
    const n = parseInt(text);
    if (!isNaN(n) && n > 0) onEdit(n);
    else setText(String(value));
    setEditing(false);
  }

  return (
    <TouchableOpacity
      style={[st.macroCard, { borderColor: `${color}30` }]}
      onPress={() => { setEditing(true); setText(String(value)); }}
      activeOpacity={0.75}
    >
      <BrutlText style={[st.macroLabel, { color }]}>{label}</BrutlText>
      {editing ? (
        <TextInput
          style={[st.macroInput, { color }]}
          value={text}
          onChangeText={setText}
          keyboardType="number-pad"
          autoFocus
          onBlur={commit}
          onSubmitEditing={commit}
          selectTextOnFocus
        />
      ) : (
        <BrutlText style={[st.macroValue, { color }]}>{value}</BrutlText>
      )}
      <BrutlText style={st.macroUnit}>{unit}</BrutlText>
      {!editing && (
        <View style={st.editBadge}>
          <Ionicons name="pencil" size={9} color={BrutlColors.textDisabled} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MacroReviewScreen() {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const seedInitialQuests = useQuestStore((s) => s.seedInitialQuests);

  if (!profile) return null;

  const calculated = calcMacroTargets(
    profile.weightKg, profile.heightCm, profile.age,
    profile.gender, profile.activityLevel, profile.goal,
  );

  const [macros, setMacros] = useState<MacroTargets>(profile.macroTargets ?? calculated);
  const [saving, setSaving] = useState(false);

  function patch(field: keyof MacroTargets, value: number) {
    setMacros((m) => ({ ...m, [field]: value }));
  }

  const tdee =
    profile.goal === 'FAT_LOSS'    ? calculated.calories + 500 :
    profile.goal === 'MUSCLE_GAIN' ? calculated.calories - 250 :
    calculated.calories;

  async function handleLock() {
    setSaving(true);
    await setProfile({ ...profile, macroTargets: macros });
    await seedInitialQuests();
    router.push('/onboarding/first-roast' as any);
  }

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.heading}>
          <BrutlText style={st.title}>Your Targets.</BrutlText>
          <BrutlText variant="muted">Calculated from your stats. Tap any value to adjust.</BrutlText>
        </View>

        <BrutlCard subtle>
          <View style={st.methodRow}>
            <Ionicons name="flask-outline" size={13} color={BrutlColors.accent} />
            <BrutlText variant="caption" style={{ color: BrutlColors.accent, letterSpacing: 1.5 }}>MIFFLIN-ST JEOR · TDEE METHOD</BrutlText>
          </View>
          <BrutlText variant="muted" style={{ fontSize: 12 }}>
            {'TDEE: '}<BrutlText style={{ color: BrutlColors.textPrimary }}>{tdee.toLocaleString()} kcal</BrutlText>
            {'   '}{ACTIVITY_LABELS[profile.activityLevel]}
          </BrutlText>
          <BrutlText variant="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {GOAL_LABELS[profile.goal]}
          </BrutlText>
          <TouchableOpacity onPress={() => setMacros(calculated)} style={st.resetBtn}>
            <Ionicons name="refresh-outline" size={12} color={BrutlColors.textMuted} />
            <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>Reset to calculated</BrutlText>
          </TouchableOpacity>
        </BrutlCard>

        <View style={st.grid}>
          <MacroEditCard label="CALORIES" value={macros.calories} unit="kcal" color={BrutlColors.accent}  onEdit={(v) => patch('calories', v)} />
          <MacroEditCard label="PROTEIN"  value={macros.proteinG} unit="g"    color="#4A9BE2"             onEdit={(v) => patch('proteinG', v)} />
          <MacroEditCard label="CARBS"    value={macros.carbsG}   unit="g"    color="#E2C44A"             onEdit={(v) => patch('carbsG', v)} />
          <MacroEditCard label="FAT"      value={macros.fatG}     unit="g"    color="#4AE2A0"             onEdit={(v) => patch('fatG', v)} />
        </View>

        {/* Macro split visualizer */}
        {(() => {
          const total = macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9 || 1;
          const slices = [
            { label: 'P', cal: macros.proteinG * 4, color: '#4A9BE2' },
            { label: 'C', cal: macros.carbsG * 4,   color: '#E2C44A' },
            { label: 'F', cal: macros.fatG * 9,      color: '#4AE2A0' },
          ];
          return (
            <View style={st.splitRow}>
              {slices.map((s) => {
                const pct = Math.round((s.cal / total) * 100);
                return (
                  <View key={s.label} style={[st.splitItem, { flex: pct || 1 }]}>
                    <View style={[st.splitBar, { backgroundColor: s.color }]} />
                    <BrutlText style={[st.splitPct, { color: s.color }]}>{pct}%</BrutlText>
                  </View>
                );
              })}
            </View>
          );
        })()}
      </ScrollView>

      <View style={st.cta}>
        <BrutlButton label={saving ? 'LOCKING IN…' : 'LOCK IT IN'} onPress={handleLock} disabled={saving} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 120 },
  heading: { gap: BrutlSpacing.xs },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: BrutlColors.textPrimary, letterSpacing: 1 },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm, marginBottom: BrutlSpacing.sm },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: BrutlSpacing.md, alignSelf: 'flex-start',
    paddingHorizontal: BrutlSpacing.sm, paddingVertical: 4,
    borderRadius: BrutlRadius.sm, borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: BrutlSpacing.sm },
  macroCard: {
    width: '47.5%',
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.md,
    borderWidth: 1,
    padding: BrutlSpacing.md,
    gap: 4,
    position: 'relative',
  },
  macroLabel: { fontSize: 10, letterSpacing: 1.5 },
  macroValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 38, lineHeight: 42 },
  macroInput: {
    fontFamily: BrutlFonts.body,
    fontSize: 32,
    lineHeight: 38,
    borderBottomWidth: 1,
    borderBottomColor: BrutlColors.accent,
    paddingVertical: 0,
    minWidth: 80,
    color: BrutlColors.textPrimary,
  },
  macroUnit: { fontSize: 11, color: BrutlColors.textMuted },
  editBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: BrutlColors.borderVisible,
    borderRadius: 4, padding: 3,
  },

  splitRow: { flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  splitItem: { gap: 4, minWidth: 1 },
  splitBar: { height: 6, borderRadius: 3 },
  splitPct: { fontSize: 10, letterSpacing: 0.5, textAlign: 'center' },

  cta: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: BrutlSpacing.xl, backgroundColor: BrutlColors.bg },
});
