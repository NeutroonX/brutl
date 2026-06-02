import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BrutlColors } from '@/constants/theme';
import { BrutlText } from './BrutlText';

interface XPToastProps {
  amount: number | null;
  onHide: () => void;
  multiplier?: number;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(226,75,74,0.15)',
    borderWidth: 1,
    borderColor: BrutlColors.accent,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  xpText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: BrutlColors.accent,
    letterSpacing: 2,
  },
  multiplierBadge: {
    backgroundColor: BrutlColors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  multiplierText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
});

export function XPToast({ amount, onHide, multiplier = 1 }: XPToastProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!amount) return;
    setVisible(true);
    translateY.setValue(0);
    opacity.setValue(0);
    scale.setValue(0.4);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -50, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setVisible(false);
      onHide();
    });
  }, [amount]);

  if (!visible || !amount) return null;

  const displayAmount = multiplier > 1 ? Math.round(amount * multiplier) : amount;

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <Animated.View style={{ transform: [{ translateY }, { scale }], opacity }}>
        <View style={styles.pill}>
          <BrutlText style={styles.xpText}>+{displayAmount} XP</BrutlText>
          {multiplier > 1 && (
            <View style={styles.multiplierBadge}>
              <BrutlText style={styles.multiplierText}>{multiplier}×</BrutlText>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export function useXPToast() {
  const [pending, setPending] = useState<number | null>(null);
  function showXP(amount: number) { setPending(amount); }
  function clearXP() { setPending(null); }
  return { pending, showXP, clearXP };
}
