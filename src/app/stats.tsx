import { ScrollView, StyleSheet, View } from 'react-native';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { RankBadge } from '@/components/ui/RankBadge';
import { XPBar } from '@/components/ui/XPBar';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import { RANK_TITLES, RANK_XP_THRESHOLDS, getXPInCurrentRank, getXPRangeForRank } from '@/lib/rank';
import { useRoastStore } from '@/stores/roast.store';
import { useUserStore } from '@/stores/user.store';
import { useWorkoutStore } from '@/stores/workout.store';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: BrutlSpacing.xxxl },
  sectionLabel: { color: BrutlColors.accent, marginBottom: BrutlSpacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: BrutlSpacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  rankInfo: { flex: 1, gap: BrutlSpacing.xs },
  roastItem: { paddingVertical: BrutlSpacing.sm, gap: BrutlSpacing.xs, borderBottomWidth: 1, borderBottomColor: BrutlColors.border },
});

export default function StatsScreen() {
  const profile = useUserStore((s) => s.profile);
  const workoutLogs = useWorkoutStore((s) => s.logs);
  const roastLog = useRoastStore((s) => s.log);

  if (!profile) return null;

  const xpInRank = getXPInCurrentRank(profile.xp, profile.rank);
  const xpRange = getXPRangeForRank(profile.rank);
  const totalWorkouts = workoutLogs.length;
  const totalXP = profile.xp;
  const last5Roasts = roastLog.slice(0, 5);

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
              <XPBar current={xpInRank} max={xpRange} label={`To next rank`} />
            </View>
          </View>
        </BrutlCard>

        {/* General Stats */}
        <BrutlCard>
          <BrutlText variant="caption" style={styles.sectionLabel}>OVERVIEW</BrutlText>
          {[
            { label: 'Total XP', value: totalXP.toLocaleString() },
            { label: 'Total Workouts', value: totalWorkouts.toString() },
            { label: 'Current Streak', value: `${profile.streakDays} days` },
            { label: 'Rank', value: `${profile.rank} — ${RANK_TITLES[profile.rank]}` },
            { label: 'Goal', value: profile.goal.replace('_', ' ') },
          ].map((s) => (
            <View key={s.label} style={styles.statRow}>
              <BrutlText variant="muted">{s.label}</BrutlText>
              <BrutlText variant="body">{s.value}</BrutlText>
            </View>
          ))}
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
                    {r.triggerType.replace('_', ' ')} · {new Date(r.timestamp).toLocaleDateString()}
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
