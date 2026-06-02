import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { RankBadge } from '@/components/ui/RankBadge';
import { XPBar } from '@/components/ui/XPBar';
import { BrutlColors, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { RANK_TITLES, RANK_XP_THRESHOLDS, getXPInCurrentRank, getXPRangeForRank } from '@/lib/rank';
import { useDietStore } from '@/stores/diet.store';
import { useRoastStore } from '@/stores/roast.store';
import { useUserStore } from '@/stores/user.store';
import { useWorkoutStore } from '@/stores/workout.store';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: BrutlSpacing.xxxl },
  sectionLabel: { color: BrutlColors.accent, marginBottom: BrutlSpacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: BrutlSpacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  rankInfo: { flex: 1, gap: BrutlSpacing.xs },
  roastItem: { paddingVertical: BrutlSpacing.sm, gap: BrutlSpacing.xs, borderBottomWidth: 1, borderBottomColor: BrutlColors.border },
  // Calendar
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: BrutlSpacing.sm },
  weekDays: { flexDirection: 'row', marginBottom: 4 },
  weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: BrutlColors.textDisabled },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  calDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calDayNum: { fontSize: 11 },
  legend: { flexDirection: 'row', gap: BrutlSpacing.md, marginTop: BrutlSpacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  // Logs
  logItem: { paddingVertical: BrutlSpacing.sm, gap: 4, borderBottomWidth: 1, borderBottomColor: BrutlColors.border },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  exerciseChip: {
    backgroundColor: BrutlColors.bgCard, borderRadius: BrutlRadius.sm,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: BrutlSpacing.xs,
  },
});

function ActivityCalendar({ workoutDays, dietDays }: { workoutDays: Set<string>; dietDays: Set<string> }) {
  const [offset, setOffset] = useState(0); // months back from today

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const todayKey = dayKey(Date.now());

  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => setOffset(o => o + 1)} hitSlop={8}>
          <BrutlText variant="body" style={{ color: BrutlColors.accent, fontSize: 20 }}>‹</BrutlText>
        </TouchableOpacity>
        <BrutlText variant="caption" style={{ color: BrutlColors.textPrimary, letterSpacing: 1 }}>{monthName.toUpperCase()}</BrutlText>
        <TouchableOpacity onPress={() => setOffset(o => Math.max(0, o - 1))} hitSlop={8} style={{ opacity: offset === 0 ? 0.3 : 1 }}>
          <BrutlText variant="body" style={{ color: BrutlColors.accent, fontSize: 20 }}>›</BrutlText>
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {DAYS.map((d, i) => <BrutlText key={i} style={styles.weekDayLabel}>{d}</BrutlText>)}
      </View>

      <View style={styles.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={styles.calDay} />;
          const k = dayKey(new Date(year, month, day).getTime());
          const hasWorkout = workoutDays.has(k);
          const hasDiet = dietDays.has(k);
          const isToday = k === todayKey;
          const bgColor = hasWorkout && hasDiet ? BrutlColors.success
            : hasWorkout ? BrutlColors.accent
            : hasDiet ? '#4A8AE2'
            : 'transparent';
          return (
            <View key={i} style={styles.calDay}>
              <View style={[styles.calDot, {
                backgroundColor: bgColor,
                borderWidth: isToday ? 1 : 0,
                borderColor: BrutlColors.textMuted,
              }]}>
                <BrutlText style={[styles.calDayNum, {
                  color: (hasWorkout || hasDiet) ? '#000' : isToday ? BrutlColors.textPrimary : BrutlColors.textDisabled,
                  fontWeight: isToday ? '700' : '400',
                }]}>{day}</BrutlText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BrutlColors.accent }]} />
          <BrutlText variant="caption">Workout</BrutlText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4A8AE2' }]} />
          <BrutlText variant="caption">Diet logged</BrutlText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BrutlColors.success }]} />
          <BrutlText variant="caption">Both</BrutlText>
        </View>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const profile = useUserStore((s) => s.profile);
  const workoutLogs = useWorkoutStore((s) => s.logs);
  const dietLogs = useDietStore((s) => s.logs);
  const roastLog = useRoastStore((s) => s.log);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(false);
  const [showDietHistory, setShowDietHistory] = useState(false);

  if (!profile) return null;

  const xpInRank = getXPInCurrentRank(profile.xp, profile.rank);
  const xpRange = getXPRangeForRank(profile.rank);
  const totalWorkouts = workoutLogs.length;
  const last5Roasts = roastLog.slice(0, 5);
  const recentWorkouts = workoutLogs.slice(0, 15);
  const recentDiet = [...dietLogs].sort((a, b) => b.date - a.date).slice(0, 15);

  const workoutDays = new Set(workoutLogs.map((l) => dayKey(l.date)));
  const dietDays = new Set(dietLogs.map((l) => dayKey(l.date)));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrutlText variant="heading">Stats</BrutlText>

        {/* Rank Overview */}
        <BrutlCard>
          <View style={styles.rankRow}>
            <RankBadge rank={profile.rank} size="lg" />
            <View style={styles.rankInfo}>
              <BrutlText variant="display" style={{ fontSize: 24 }}>{RANK_TITLES[profile.rank]}</BrutlText>
              <BrutlText variant="caption">{profile.xp.toLocaleString()} total XP</BrutlText>
              <XPBar current={xpInRank} max={xpRange} label="To next rank" />
            </View>
          </View>
        </BrutlCard>

        {/* General Stats */}
        <BrutlCard>
          <BrutlText variant="caption" style={styles.sectionLabel}>OVERVIEW</BrutlText>
          {[
            { label: 'Total XP',        value: totalXP(profile.xp) },
            { label: 'Total Workouts',  value: totalWorkouts.toString() },
            { label: 'Current Streak',  value: `${profile.streakDays} days` },
            { label: 'Rank',            value: `${profile.rank} — ${RANK_TITLES[profile.rank]}` },
            { label: 'Goal',            value: profile.goal.replace('_', ' ') },
            { label: 'Weak Area',       value: profile.weakArea.replace('_', ' ') },
          ].map((s) => (
            <View key={s.label} style={styles.statRow}>
              <BrutlText variant="muted">{s.label}</BrutlText>
              <BrutlText variant="body">{s.value}</BrutlText>
            </View>
          ))}
        </BrutlCard>

        {/* Activity Calendar */}
        <BrutlCard>
          <BrutlText variant="caption" style={styles.sectionLabel}>ACTIVITY</BrutlText>
          <ActivityCalendar workoutDays={workoutDays} dietDays={dietDays} />
        </BrutlCard>

        {/* Workout History */}
        <BrutlCard>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowWorkoutHistory(v => !v)}>
            <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>WORKOUT HISTORY</BrutlText>
            <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>{showWorkoutHistory ? '▲' : '▼'} {totalWorkouts} sessions</BrutlText>
          </TouchableOpacity>
          {showWorkoutHistory && recentWorkouts.length > 0 && recentWorkouts.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <BrutlText variant="caption" style={{ color: BrutlColors.textPrimary }}>{fmt(log.date)}</BrutlText>
                <View style={{ flexDirection: 'row', gap: BrutlSpacing.md }}>
                  <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>{log.durationMinutes} min</BrutlText>
                  <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>+{log.xpEarned} XP</BrutlText>
                </View>
              </View>
              <View style={styles.exerciseRow}>
                {[...new Set(log.exercises.map(e => e.exercise))].map((name) => (
                  <View key={name} style={styles.exerciseChip}>
                    <BrutlText variant="caption" style={{ fontSize: 11 }}>{name}</BrutlText>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {showWorkoutHistory && recentWorkouts.length === 0 && (
            <BrutlText variant="muted" style={{ paddingVertical: BrutlSpacing.sm }}>No workouts logged yet.</BrutlText>
          )}
        </BrutlCard>

        {/* Diet History */}
        <BrutlCard>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowDietHistory(v => !v)}>
            <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>DIET HISTORY</BrutlText>
            <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>{showDietHistory ? '▲' : '▼'} {dietLogs.length} days logged</BrutlText>
          </TouchableOpacity>
          {showDietHistory && recentDiet.length > 0 && recentDiet.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <BrutlText variant="caption" style={{ color: BrutlColors.textPrimary }}>{fmtShort(log.date)}</BrutlText>
                <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>{log.totalCalories} kcal</BrutlText>
              </View>
              <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>
                P: {Math.round(log.totalProteinG)}g · C: {Math.round(log.totalCarbsG)}g · F: {Math.round(log.totalFatG)}g · {log.meals.length} meals
              </BrutlText>
            </View>
          ))}
          {showDietHistory && recentDiet.length === 0 && (
            <BrutlText variant="muted" style={{ paddingVertical: BrutlSpacing.sm }}>No meals logged yet.</BrutlText>
          )}
        </BrutlCard>

        {/* Rank Ladder */}
        <BrutlCard subtle>
          <BrutlText variant="caption" style={styles.sectionLabel}>RANK LADDER</BrutlText>
          {(['E', 'D', 'C', 'B', 'A', 'S'] as const).map((r) => (
            <View key={r} style={[styles.statRow, { opacity: profile.xp >= RANK_XP_THRESHOLDS[r] ? 1 : 0.4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm }}>
                <RankBadge rank={r} size="sm" />
                <BrutlText variant="body">{RANK_TITLES[r]}</BrutlText>
              </View>
              <BrutlText variant="caption">{RANK_XP_THRESHOLDS[r].toLocaleString()} XP</BrutlText>
            </View>
          ))}
        </BrutlCard>

        {/* Recent Roasts */}
        {last5Roasts.length > 0 && (
          <View>
            <BrutlText variant="caption" style={styles.sectionLabel}>RECENT ROASTS</BrutlText>
            <BrutlCard>
              {last5Roasts.map((r) => (
                <View key={r.id} style={styles.roastItem}>
                  <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>
                    {r.triggerType.replace(/_/g, ' ')} · {fmtShort(r.timestamp)}
                  </BrutlText>
                  <BrutlText variant="muted" numberOfLines={2}>{r.roastText}</BrutlText>
                </View>
              ))}
            </BrutlCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function totalXP(xp: number) { return xp.toLocaleString(); }
