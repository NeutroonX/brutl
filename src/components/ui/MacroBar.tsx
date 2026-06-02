import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BrutlColors, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { BrutlText } from './BrutlText';

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  value: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, lineHeight: 28 },
  target: { fontSize: 11, color: BrutlColors.textDisabled },
  track: {
    height: 4,
    backgroundColor: BrutlColors.border,
    borderRadius: BrutlRadius.full,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    borderRadius: BrutlRadius.full,
  },
  label: { fontSize: 10, letterSpacing: 1 },
});

export function MacroBar({ label, value, target, unit, color }: MacroBarProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const overTarget = pct >= 1;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: pct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <BrutlText style={[styles.value, { color: overTarget ? color : BrutlColors.textPrimary }]}>
          {value}<BrutlText style={{ fontSize: 13, color: BrutlColors.textMuted }}>{unit}</BrutlText>
        </BrutlText>
        <BrutlText style={styles.target}>/ {target}{unit}</BrutlText>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: overTarget ? color : `${color}90` }]} />
      </View>
      <BrutlText style={[styles.label, { color: overTarget ? color : BrutlColors.textMuted }]}>{label}</BrutlText>
    </View>
  );
}
