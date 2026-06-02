import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BrutlColors, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { BrutlText } from './BrutlText';

interface XPBarProps {
  current: number;
  max: number;
  label?: string;
  showNumbers?: boolean;
}

const styles = StyleSheet.create({
  container: { gap: BrutlSpacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: 8,
    backgroundColor: BrutlColors.border,
    borderRadius: BrutlRadius.full,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.full,
  },
  glowFill: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    borderRadius: BrutlRadius.full,
    backgroundColor: 'rgba(226,75,74,0.4)',
  },
});

export function XPBar({ current, max, label, showNumbers = true }: XPBarProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pct = max > 0 ? Math.min(1, current / max) : 0;
  const isNearRankUp = pct >= 0.85;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: pct,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // Glow pulse when close to rank-up
  useEffect(() => {
    if (!isNearRankUp) {
      glowAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isNearRankUp]);

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const glowWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '115%'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

  return (
    <View style={styles.container}>
      {(label || showNumbers) && (
        <View style={styles.row}>
          {label && <BrutlText variant="caption">{label}</BrutlText>}
          {showNumbers && (
            <BrutlText variant="caption" style={isNearRankUp ? { color: BrutlColors.accent } : {}}>
              {current.toLocaleString()} / {max.toLocaleString()} XP
              {isNearRankUp ? ' ⚡' : ''}
            </BrutlText>
          )}
        </View>
      )}
      <View style={styles.track}>
        {isNearRankUp && (
          <Animated.View style={[styles.glowFill, { width: glowWidth, opacity: glowOpacity }]} />
        )}
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
      </View>
    </View>
  );
}
