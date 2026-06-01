import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';

import { BrutlButton } from './ui/BrutlButton';
import { BrutlText } from './ui/BrutlText';
import { RankBadge, RANK_COLORS } from './ui/RankBadge';
import { RANK_TITLES } from '@/lib/rank';
import type { Rank } from '@/types';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';

interface RankUpModalProps {
  visible: boolean;
  newRank: Rank;
  onDismiss: () => void;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: BrutlSpacing.xl, paddingHorizontal: BrutlSpacing.xl },
  glowRing: {
    borderRadius: 999,
    padding: BrutlSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center', fontSize: 48 },
  subtitle: { textAlign: 'center', fontSize: 22 },
  rankTitle: { textAlign: 'center' },
  xpLine: { textAlign: 'center' },
  btn: { width: 240 },
});

export function RankUpModal({ visible, newRank, onDismiss }: RankUpModalProps) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.2);
    opacity.setValue(0);
    glowOpacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.1, useNativeDriver: true, tension: 60, friction: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.2, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [visible]);

  const rankColor = RANK_COLORS[newRank];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.content, { opacity }]}>
          <BrutlText variant="caption" style={{ color: BrutlColors.textMuted, letterSpacing: 4 }}>
            RANK UP
          </BrutlText>

          <Animated.View style={{ transform: [{ scale }] }}>
            <Animated.View
              style={[
                styles.glowRing,
                StyleSheet.absoluteFill,
                { backgroundColor: rankColor, opacity: glowOpacity, borderRadius: 999 },
              ]}
            />
            <RankBadge rank={newRank} size="lg" />
          </Animated.View>

          <View style={{ alignItems: 'center', gap: BrutlSpacing.sm }}>
            <BrutlText variant="display" style={[styles.title, { color: rankColor }]}>
              {newRank}
            </BrutlText>
            <BrutlText variant="heading" style={styles.subtitle}>
              {RANK_TITLES[newRank]}
            </BrutlText>
            <BrutlText variant="muted" style={styles.rankTitle}>
              You earned this. Don't waste it.
            </BrutlText>
          </View>

          <BrutlButton label="ACCEPT" onPress={onDismiss} style={styles.btn} />
        </Animated.View>
      </View>
    </Modal>
  );
}
