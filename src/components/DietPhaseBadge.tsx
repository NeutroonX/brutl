import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BrutlColors, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import type { CycleDayType, DietPhaseKind } from '@/types/diet-phase';
import { BrutlText } from './ui/BrutlText';

const PHASE_LABELS: Record<DietPhaseKind, string> = {
  BULK: 'BULK',
  CUT: 'CUT',
  MAINTAIN: 'MAINTAIN',
};

const DAY_TYPE_LABELS: Record<CycleDayType, string> = {
  HIGH: 'HIGH CARB DAY',
  MODERATE: 'MODERATE DAY',
  LOW: 'LOW CARB DAY',
};

const PHASE_COLORS: Record<DietPhaseKind, string> = {
  BULK:     BrutlColors.success,
  CUT:      BrutlColors.accent,
  MAINTAIN: BrutlColors.warning,
};

export function DietPhaseBadge({
  phase,
  dayType,
  onPress,
}: {
  phase: DietPhaseKind;
  dayType: CycleDayType | null;
  onPress: () => void;
}) {
  const color = PHASE_COLORS[phase];

  return (
    <TouchableOpacity
      style={[s.pill, { borderColor: `${color}55` }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Current phase: ${PHASE_LABELS[phase]}${dayType ? `, ${DAY_TYPE_LABELS[dayType]}` : ''}. Tap to edit.`}
    >
      <View style={[s.dot, { backgroundColor: color }]} />
      <BrutlText style={[s.phase, { color }]}>{PHASE_LABELS[phase]}</BrutlText>
      {dayType && (
        <>
          <BrutlText style={s.sep}>·</BrutlText>
          <BrutlText style={s.dayType}>{DAY_TYPE_LABELS[dayType]}</BrutlText>
        </>
      )}
      <Ionicons name="chevron-forward" size={10} color={BrutlColors.textDisabled} style={s.arrow} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BrutlRadius.full,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: 5,
    backgroundColor: BrutlColors.bgCard,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phase: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 13,
    letterSpacing: 1,
  },
  sep: {
    fontSize: 11,
    color: BrutlColors.textDisabled,
  },
  dayType: {
    fontSize: 10,
    color: BrutlColors.textMuted,
    letterSpacing: 0.8,
  },
  arrow: {
    marginLeft: 2,
  },
});
