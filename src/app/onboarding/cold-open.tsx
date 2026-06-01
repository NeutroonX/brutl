import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrutlColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BrutlSpacing.xl,
  },
  textContainer: { alignItems: 'center', gap: BrutlSpacing.lg },
  line1: { textAlign: 'center', fontSize: 32 },
  line2: { textAlign: 'center', fontSize: 18 },
  ctaContainer: { position: 'absolute', bottom: BrutlSpacing.xxxl, left: BrutlSpacing.xl, right: BrutlSpacing.xl },
});

export default function ColdOpenScreen() {
  const line1Opacity = useRef(new Animated.Value(0)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const [ctaReady, setCtaReady] = useState(false);

  useEffect(() => {
    // Line 1 fades in at 500ms
    Animated.timing(line1Opacity, { toValue: 1, duration: 1200, delay: 500, useNativeDriver: true }).start(() => {
      // 3 second pause as per spec — no skip allowed
      setTimeout(() => {
        // Line 2 fades in
        Animated.timing(line2Opacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start(() => {
          setTimeout(() => {
            // CTA appears
            setCtaReady(true);
            Animated.timing(ctaOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
          }, 1200);
        });
      }, 3000);
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Animated.View style={{ opacity: line1Opacity }}>
          <BrutlText variant="display" style={styles.line1}>
            You've been lying to yourself.
          </BrutlText>
        </Animated.View>
        <Animated.View style={{ opacity: line2Opacity }}>
          <BrutlText variant="muted" style={styles.line2}>
            It stops today.
          </BrutlText>
        </Animated.View>
      </View>

      {ctaReady && (
        <Animated.View style={[styles.ctaContainer, { opacity: ctaOpacity }]}>
          <BrutlButton label="I'M READY" onPress={() => router.push('/onboarding/demo')} />
        </Animated.View>
      )}
    </View>
  );
}
