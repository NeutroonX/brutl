import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { BrutlColors, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { BrutlText } from './BrutlText';

interface XPBarProps {
  current: number;
  max: number;
  label?: string;
}

const styles = StyleSheet.create({
  container: { gap: BrutlSpacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: 6,
    backgroundColor: BrutlColors.border,
    borderRadius: BrutlRadius.full,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.full,
  },
});

export function XPBar({ current, max, label }: XPBarProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const pct = max > 0 ? Math.min(1, current / max) : 0;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct, progress]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.row}>
          <BrutlText variant="caption">{label}</BrutlText>
          <BrutlText variant="caption">
            {current} / {max} XP
          </BrutlText>
        </View>
      )}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}
