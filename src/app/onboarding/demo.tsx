import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';

import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';

const FAKE_WEEK = [
  { day: 'Mon', workout: 'Skipped', diet: '62% compliance' },
  { day: 'Tue', workout: 'Half session, left early', diet: '41% compliance' },
  { day: 'Wed', workout: 'Rest day (unplanned)', diet: 'Burger + fries' },
  { day: 'Thu', workout: 'Bench: 60kg (baseline: 80kg)', diet: '55% compliance' },
  { day: 'Fri', workout: 'Skipped again', diet: 'Pizza. Twice.' },
];

const DEMO_ROAST =
  "Five days. Three skips. Bench down 25% from your own baseline. " +
  "You're not tired — you're comfortable. Comfortable people don't get results. " +
  "They get excuses with a nice gym bag.";

const DEMO_CORRECTION = 'Book your next 3 workouts now. Not tomorrow. Now.';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.md, paddingBottom: 120 },
  header: { gap: BrutlSpacing.sm, marginBottom: BrutlSpacing.sm },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: BrutlSpacing.xs },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BrutlColors.accent, marginRight: BrutlSpacing.sm },
  roastBox: { borderLeftWidth: 3, borderLeftColor: BrutlColors.accent, paddingLeft: BrutlSpacing.md, gap: BrutlSpacing.sm },
  cursor: { color: BrutlColors.accent, fontWeight: '700' },
  ctaArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: BrutlSpacing.xl, backgroundColor: BrutlColors.bg },
});

export default function DemoScreen() {
  const [roastText, setRoastText] = useState('');
  const [correctionVisible, setCorrectionVisible] = useState(false);
  const [ctaReady, setCtaReady] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }).start(() => {
      setTimeout(() => streamRoast(), 600);
    });
  }, []);

  async function streamRoast() {
    for (let i = 0; i < DEMO_ROAST.length; i++) {
      setRoastText(DEMO_ROAST.slice(0, i + 1));
      await delay(20);
    }
    setCorrectionVisible(true);
    await delay(800);
    setCtaReady(true);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <BrutlText variant="heading">This is Alex.</BrutlText>
          <BrutlText variant="muted">Alex had a rough week. Here's what BRUTL said.</BrutlText>
        </Animated.View>

        <BrutlCard>
          {FAKE_WEEK.map((row) => (
            <View key={row.day} style={styles.weekRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.redDot} />
                <BrutlText variant="body">{row.day}</BrutlText>
              </View>
              <View style={{ flex: 1, marginLeft: BrutlSpacing.md }}>
                <BrutlText variant="caption">{row.workout}</BrutlText>
                <BrutlText variant="caption" style={{ color: BrutlColors.accentDim }}>{row.diet}</BrutlText>
              </View>
            </View>
          ))}
        </BrutlCard>

        {roastText.length > 0 && (
          <BrutlCard>
            <View style={styles.roastBox}>
              <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>BRUTL SAYS</BrutlText>
              <BrutlText variant="body">
                {roastText}
                {!correctionVisible && <BrutlText style={styles.cursor}>|</BrutlText>}
              </BrutlText>
              {correctionVisible && (
                <BrutlText variant="accent">→ {DEMO_CORRECTION}</BrutlText>
              )}
            </View>
          </BrutlCard>
        )}

        <BrutlText variant="muted" style={{ textAlign: 'center', marginTop: BrutlSpacing.md }}>
          This is what BRUTL does. No filter.
        </BrutlText>
      </ScrollView>

      {ctaReady && (
        <View style={styles.ctaArea}>
          <BrutlButton label="DO IT TO ME" onPress={() => router.push('/onboarding/intake')} />
        </View>
      )}
    </View>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
