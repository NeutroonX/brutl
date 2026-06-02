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
  xpGained?: number;
  onDismiss: () => void;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', gap: BrutlSpacing.xl, paddingHorizontal: BrutlSpacing.xl },
  badgeWrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 160, height: 160,
    borderRadius: 80,
  },
  label: { letterSpacing: 4, textAlign: 'center' },
  rankLetter: { textAlign: 'center', fontSize: 72, lineHeight: 80 },
  rankTitle: { textAlign: 'center', fontSize: 24 },
  tagline: { textAlign: 'center', color: BrutlColors.textMuted },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  btn: { width: 240 },
});

export function RankUpModal({ visible, newRank, xpGained, onDismiss }: RankUpModalProps) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.2);
    opacity.setValue(0);
    glowOpacity.setValue(0);
    xpOpacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, tension: 60, friction: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.timing(xpOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.15, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [visible]);

  const rankColor = RANK_COLORS[newRank];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.content, { opacity }]}>

          <BrutlText variant="caption" style={[styles.label, { color: BrutlColors.textMuted }]}>
            RANK UP
          </BrutlText>

          <View style={styles.badgeWrap}>
            <Animated.View style={[styles.glow, { backgroundColor: rankColor, opacity: glowOpacity }]} />
            <Animated.View style={{ transform: [{ scale }] }}>
              <RankBadge rank={newRank} size="lg" />
            </Animated.View>
          </View>

          <View style={{ alignItems: 'center', gap: BrutlSpacing.sm }}>
            <BrutlText variant="display" style={[styles.rankLetter, { color: rankColor }]}>
              {newRank}
            </BrutlText>
            <BrutlText variant="heading" style={[styles.rankTitle, { color: BrutlColors.textPrimary }]}>
              {RANK_TITLES[newRank]}
            </BrutlText>
            <BrutlText variant="muted" style={styles.tagline}>
              You earned this. Don't waste it.
            </BrutlText>
          </View>

          {!!xpGained && xpGained > 0 && (
            <Animated.View style={{ opacity: xpOpacity }}>
              <View style={[styles.xpPill, { borderColor: `${rankColor}50`, backgroundColor: `${rankColor}10` }]}>
                <BrutlText style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: rankColor, letterSpacing: 2 }}>
                  +{xpGained.toLocaleString()} XP
                </BrutlText>
              </View>
            </Animated.View>
          )}

          <BrutlButton label="ACCEPT" onPress={onDismiss} style={styles.btn} />
        </Animated.View>
      </View>
    </Modal>
  );
}
