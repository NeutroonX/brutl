import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { useSetDietPhase } from '@/repositories/diet-phase.repository';
import { calcMacroTargets } from '@/stores/user.store';
import type { UserProfile } from '@/types';
import type { DietPhase, DietPhaseKind, MacroCyclePattern } from '@/types/diet-phase';
import { BrutlText } from './ui/BrutlText';

const PHASE_OPTIONS: { kind: DietPhaseKind; label: string; desc: string; color: string }[] = [
  { kind: 'BULK',     label: 'BULK',     desc: 'Caloric surplus — build muscle fast',    color: BrutlColors.success },
  { kind: 'CUT',      label: 'CUT',      desc: 'Caloric deficit — shed fat, keep gains',  color: BrutlColors.accent },
  { kind: 'MAINTAIN', label: 'MAINTAIN', desc: 'TDEE — recomposition and recovery',       color: BrutlColors.warning },
];

const CYCLE_OPTIONS: { label: string; pattern: MacroCyclePattern }[] = [
  { label: '3-DAY  H / H / L',                 pattern: { days: ['HIGH', 'HIGH', 'LOW'] } },
  { label: '5-DAY  H / M / H / M / L',         pattern: { days: ['HIGH', 'MODERATE', 'HIGH', 'MODERATE', 'LOW'] } },
  { label: '7-DAY  H / M / H / L / M / H / L', pattern: { days: ['HIGH', 'MODERATE', 'HIGH', 'LOW', 'MODERATE', 'HIGH', 'LOW'] } },
  { label: 'FLAT — MODERATE EVERY DAY',        pattern: { days: ['MODERATE'] } },
];

function findCycleLabel(phase: DietPhase | null): string {
  if (!phase) return CYCLE_OPTIONS[0].label;
  const match = CYCLE_OPTIONS.find(
    (c) => JSON.stringify(c.pattern.days) === JSON.stringify(phase.cyclePattern.days),
  );
  return match?.label ?? CYCLE_OPTIONS[0].label;
}

export function PhaseEditorSheet({
  visible,
  currentPhase,
  profile,
  onClose,
}: {
  visible: boolean;
  currentPhase: DietPhase | null;
  profile: UserProfile | null;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const [selectedPhase, setSelectedPhase] = useState<DietPhaseKind>(currentPhase?.phase ?? 'MAINTAIN');
  const [selectedCycleLabel, setSelectedCycleLabel] = useState(() => findCycleLabel(currentPhase));

  const { mutate, isPending } = useSetDietPhase();

  function handleSave() {
    if (!profile) return;

    const goalMap = { BULK: 'MUSCLE_GAIN', CUT: 'FAT_LOSS', MAINTAIN: 'RECOMP' } as const;
    const macroTargets = calcMacroTargets(
      profile.weightKg,
      profile.heightCm,
      profile.age,
      profile.gender,
      profile.activityLevel,
      goalMap[selectedPhase],
    );

    const cyclePattern = CYCLE_OPTIONS.find((c) => c.label === selectedCycleLabel)?.pattern
      ?? CYCLE_OPTIONS[0].pattern;

    mutate(
      {
        userId: profile.id,
        phase: selectedPhase,
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        macroTargets,
        cyclePattern,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.handle} />

          <View style={s.titleRow}>
            <BrutlText style={s.title}>SET DIET PHASE</BrutlText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close phase editor"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={BrutlColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.55 }}>
            <BrutlText style={s.sectionLabel}>PHASE</BrutlText>
            <View style={s.optionGroup}>
              {PHASE_OPTIONS.map(({ kind, label, desc, color }) => {
                const active = selectedPhase === kind;
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[s.option, active && { borderColor: color }]}
                    onPress={() => setSelectedPhase(kind)}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[s.optionDot, { backgroundColor: active ? color : BrutlColors.border }]} />
                    <View style={{ flex: 1 }}>
                      <BrutlText style={[s.optionLabel, active && { color }]}>{label}</BrutlText>
                      <BrutlText style={s.optionDesc}>{desc}</BrutlText>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color={color} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <BrutlText style={[s.sectionLabel, { marginTop: BrutlSpacing.md }]}>MACRO CYCLING</BrutlText>
            <View style={s.optionGroup}>
              {CYCLE_OPTIONS.map(({ label }) => {
                const active = selectedCycleLabel === label;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[s.option, active && { borderColor: BrutlColors.accent }]}
                    onPress={() => setSelectedCycleLabel(label)}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <BrutlText style={[s.optionLabel, active && { color: BrutlColors.accent }]}>{label}</BrutlText>
                    {active && <Ionicons name="checkmark-circle" size={18} color={BrutlColors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <BrutlText style={s.hint}>
              HIGH = +30% carbs / −10% fat. LOW = −45% carbs / +15% fat. Protein never changes.
            </BrutlText>
          </ScrollView>

          <TouchableOpacity
            style={[s.saveBtn, isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isPending || !profile}
            accessibilityRole="button"
            accessibilityLabel="Save diet phase"
          >
            {isPending
              ? <ActivityIndicator color={BrutlColors.textPrimary} size="small" />
              : <BrutlText style={s.saveTxt}>SAVE PHASE</BrutlText>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BrutlColors.bgCard,
    borderTopLeftRadius: BrutlRadius.xl,
    borderTopRightRadius: BrutlRadius.xl,
    padding: BrutlSpacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : BrutlSpacing.xl,
    gap: BrutlSpacing.md,
    borderTopWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: BrutlColors.borderVisible,
    alignSelf: 'center',
    marginBottom: BrutlSpacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    letterSpacing: 1,
    color: BrutlColors.textPrimary,
  },
  sectionLabel: {
    fontSize: 10,
    color: BrutlColors.textDisabled,
    letterSpacing: 1.5,
    marginBottom: BrutlSpacing.sm,
  },
  optionGroup: { gap: BrutlSpacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.sm,
    backgroundColor: BrutlColors.bg,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    borderRadius: BrutlRadius.md,
    padding: BrutlSpacing.md,
  },
  optionDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  optionLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: BrutlColors.textPrimary,
    letterSpacing: 1,
  },
  optionDesc: {
    fontSize: 11,
    color: BrutlColors.textMuted,
    fontFamily: BrutlFonts.body,
    marginTop: 2,
  },
  hint: {
    fontSize: 11,
    color: BrutlColors.textDisabled,
    fontFamily: BrutlFonts.body,
    marginTop: BrutlSpacing.sm,
    marginBottom: BrutlSpacing.xs,
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.md,
    paddingVertical: BrutlSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTxt: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: BrutlColors.textPrimary,
    letterSpacing: 1,
  },
});
