import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { BrutlText } from './ui/BrutlText';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import type { WorkoutLog } from '@/types';

interface Props {
  logs: WorkoutLog[];
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const CHART_H = 72;
const MIN_BAR = 4;

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function AnimatedBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: height,
      duration: 600,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [height]);

  return (
    <Animated.View style={{
      width: 18,
      height: anim,
      backgroundColor: color,
      borderRadius: 4,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    }} />
  );
}

const styles = StyleSheet.create({
  container: { gap: BrutlSpacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 0 },
  dayCol: { flex: 1, alignItems: 'center', gap: 6 },
  xpLabel: { fontSize: 9, letterSpacing: 0.3 },
  dayLabel: { fontSize: 9, letterSpacing: 0.5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});

export function WeeklyXPChart({ logs }: Props) {
  const monday = getMondayOfWeek(new Date());
  const todayKey = dayKey(Date.now());

  // Build 7 days of XP data
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const k = dayKey(d.getTime());
    const xp = logs
      .filter((l) => dayKey(l.date) === k)
      .reduce((sum, l) => sum + l.xpEarned, 0);
    return { key: k, label: DAY_LABELS[i], xp, isToday: k === todayKey };
  });

  const maxXP = Math.max(...days.map((d) => d.xp), 1);
  const weekTotal = days.reduce((s, d) => s + d.xp, 0);
  const activeDays = days.filter((d) => d.xp > 0).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BrutlText style={{ fontSize: 11, color: BrutlColors.accent, letterSpacing: 1.5 }}>THIS WEEK</BrutlText>
        <BrutlText style={{ fontSize: 11, color: BrutlColors.textMuted }}>
          {activeDays}/7 active days
        </BrutlText>
      </View>

      <View style={styles.chart}>
        {days.map((day, i) => {
          const barH = day.xp > 0
            ? Math.max(MIN_BAR, Math.round((day.xp / maxXP) * (CHART_H - 20)))
            : MIN_BAR;
          const barColor = day.isToday
            ? BrutlColors.accent
            : day.xp > 0
            ? `${BrutlColors.accent}55`
            : BrutlColors.borderVisible;

          return (
            <View key={day.key} style={styles.dayCol}>
              {day.xp > 0 && (
                <BrutlText style={[styles.xpLabel, { color: day.isToday ? BrutlColors.accent : BrutlColors.textDisabled }]}>
                  {day.xp}
                </BrutlText>
              )}
              <AnimatedBar height={barH} color={barColor} delay={i * 60} />
              <BrutlText style={[styles.dayLabel, {
                color: day.isToday ? BrutlColors.textPrimary : BrutlColors.textDisabled,
                fontWeight: day.isToday ? '700' : '400',
              }]}>
                {day.label}
              </BrutlText>
            </View>
          );
        })}
      </View>

      <View style={styles.totalRow}>
        <BrutlText style={{ fontSize: 11, color: BrutlColors.textDisabled }}>
          Total this week
        </BrutlText>
        <BrutlText style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 16, color: weekTotal > 0 ? BrutlColors.textPrimary : BrutlColors.textDisabled }}>
          {weekTotal.toLocaleString()} XP
        </BrutlText>
      </View>
    </View>
  );
}
