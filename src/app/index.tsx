import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { RankBadge } from '@/components/ui/RankBadge';
import { XPBar } from '@/components/ui/XPBar';
import { XPToast } from '@/components/ui/XPToast';
import { RankUpModal } from '@/components/RankUpModal';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import { RANK_TITLES, getXPInCurrentRank, getXPRangeForRank } from '@/lib/rank';
import { useDungeonStore } from '@/stores/dungeon.store';
import { useQuestStore } from '@/stores/quest.store';
import { useRoastStore } from '@/stores/roast.store';
import { useUserStore } from '@/stores/user.store';
import { useWatchStore } from '@/stores/watch.store';

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const pendingRankUp = useUserStore((s) => s.pendingRankUp);
  const clearPendingRankUp = useUserStore((s) => s.clearPendingRankUp);
  const checkAndUpdateStreak = useUserStore((s) => s.checkAndUpdateStreak);
  const { currentRoast, correctionText, isStreaming, log: roastLog } = useRoastStore();
  const refreshDailyQuests = useQuestStore((s) => s.refreshDailyQuests);
  const quests = useQuestStore((s) => s.quests);
  const activeQuests = quests.filter((q) => !q.completedAt && q.expiresAt > Date.now()).slice(0, 2);
  const { vitals, syncVitals, hasPermission, isAvailable } = useWatchStore();
  const dungeonRun = useDungeonStore((s) => s.run);
  const dungeonMultiplier = useDungeonStore((s) => s.getMultiplier)();

  const [streakXP, setStreakXP] = useState<number | null>(null);

  const multiplierActive = dungeonMultiplier > 1;
  const multiplierDaysLeft = dungeonRun?.xpMultiplierUntil
    ? Math.max(0, Math.ceil((dungeonRun.xpMultiplierUntil - Date.now()) / 86_400_000))
    : 0;

  useEffect(() => {
    if (!profile) return;
    checkAndUpdateStreak()
      .then((bonus: number) => { if (bonus > 0) setStreakXP(bonus); })
      .catch(() => {});
    refreshDailyQuests().catch(() => {});
    const init = async () => {
      try {
        if (isAvailable && hasPermission) await syncVitals();
      } catch { /* health connect unavailable */ }
      const { vitals: v } = useWatchStore.getState();
      const watchData = (v.hrv || v.sleepHours) ? {
        date: Date.now(), restingHR: v.restingHR ?? 0, hrv: v.hrv ?? 0,
        sleepHours: v.sleepHours ?? 0, recoveryScore: v.recoveryScore ?? 0,
        stressLevel: 0, steps: v.steps ?? 0, caloriesBurned: 0, source: 'WEAR_OS' as const,
      } : null;
      if (v.recoveryScore !== null && v.recoveryScore < 40) {
        streamRoast(buildRoastPayload('POOR_RECOVERY', profile.rank, profile.streakDays, watchData)).catch(() => {});
      } else {
        streamRoast(buildRoastPayload('APP_OPEN', profile.rank, profile.streakDays, watchData)).catch(() => {});
      }
    };
    init();
  }, []);

  if (!profile) return null;

  const xpInRank = getXPInCurrentRank(profile.xp, profile.rank);
  const xpRange = getXPRangeForRank(profile.rank);
  const latestRoast = currentRoast || roastLog[0]?.roastText || '';
  const latestCorrection = isStreaming ? '' : correctionText || roastLog[0]?.correctionText || '';

  return (
    <View style={styles.container}>
      {!!pendingRankUp && (
        <RankUpModal
          visible
          newRank={pendingRankUp}
          xpGained={profile.xp}
          onDismiss={clearPendingRankUp}
        />
      )}
      <XPToast amount={streakXP} onHide={() => setStreakXP(null)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Dungeon multiplier banner */}
        {multiplierActive && (
          <View style={styles.multiplierBanner}>
            <Ionicons name="shield" size={14} color="#4AE2C4" />
            <BrutlText variant="caption" style={{ color: '#4AE2C4', flex: 1 }}>
              DUNGEON COMPLETE — 1.5× XP ACTIVE · {multiplierDaysLeft}d remaining
            </BrutlText>
          </View>
        )}

        {/* Rank Strip */}
        <BrutlCard>
          <View style={styles.rankStrip}>
            <RankBadge rank={profile.rank} size="lg" />
            <View style={styles.rankInfo}>
              <BrutlText variant="display" style={{ fontSize: 28 }}>
                {profile.rank} — {RANK_TITLES[profile.rank]}
              </BrutlText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm }}>
                <BrutlText variant="caption">
                  {profile.streakDays > 0 ? `🔥 ${profile.streakDays} day streak` : '0 day streak'}
                </BrutlText>
                {profile.xp > 0 && (
                  <BrutlText variant="caption" style={{ color: BrutlColors.textDisabled }}>
                    · {profile.xp.toLocaleString()} XP
                  </BrutlText>
                )}
              </View>
              <XPBar current={xpInRank} max={xpRange} label="RANK XP" />
            </View>
            <TouchableOpacity onPress={() => router.push('/settings' as any)} hitSlop={12}>
              <Ionicons name="settings-outline" size={22} color={BrutlColors.textMuted} />
            </TouchableOpacity>
          </View>
        </BrutlCard>

        {/* Watch Vitals */}
        <BrutlCard subtle>
          <BrutlText variant="caption" style={styles.sectionLabel}>VITALS</BrutlText>
          <View style={styles.vitalsRow}>
            {[
              { label: 'HR',       value: vitals.restingHR  ?? '--', unit: 'bpm', color: vitals.restingHR  ? BrutlColors.textPrimary : BrutlColors.textDisabled },
              { label: 'HRV',      value: vitals.hrv        ?? '--', unit: 'ms',  color: vitals.hrv        ? BrutlColors.textPrimary : BrutlColors.textDisabled },
              { label: 'SLEEP',    value: vitals.sleepHours ?? '--', unit: 'h',   color: vitals.sleepHours ? (vitals.sleepHours >= 7 ? BrutlColors.success : BrutlColors.accent) : BrutlColors.textDisabled },
              { label: 'RECOVERY', value: vitals.recoveryScore ?? '--', unit: '%', color: vitals.recoveryScore ? (vitals.recoveryScore >= 70 ? BrutlColors.success : vitals.recoveryScore >= 40 ? BrutlColors.warning : BrutlColors.accent) : BrutlColors.textDisabled },
            ].map((v) => (
              <View key={v.label} style={styles.vitalBox}>
                <BrutlText style={[styles.vitalValue, { color: v.color }]}>{String(v.value)}</BrutlText>
                <BrutlText variant="caption">{v.unit}</BrutlText>
                <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>{v.label}</BrutlText>
              </View>
            ))}
          </View>
          {isAvailable && !hasPermission && (
            <BrutlText variant="caption" style={{ color: BrutlColors.accent, textAlign: 'center', marginTop: BrutlSpacing.xs }}>
              Connect health data in Settings
            </BrutlText>
          )}
        </BrutlCard>

        {/* Roast Card */}
        {!!latestRoast && (
          <BrutlCard>
            <View style={styles.roastBox}>
              <BrutlText variant="caption" style={styles.sectionLabel}>
                {isStreaming ? 'INCOMING ROAST' : "TODAY'S ROAST"}
              </BrutlText>
              <BrutlText variant="body">
                {latestRoast}
                {isStreaming && <BrutlText style={styles.cursor}>|</BrutlText>}
              </BrutlText>
              {!!latestCorrection && (
                <BrutlText variant="accent">→ {latestCorrection}</BrutlText>
              )}
            </View>
          </BrutlCard>
        )}

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <View style={{ gap: BrutlSpacing.sm }}>
            <BrutlText variant="caption" style={styles.sectionLabel}>ACTIVE QUESTS</BrutlText>
            {activeQuests.map((q) => (
              <BrutlCard key={q.id} subtle>
                <View style={styles.questItem}>
                  <View style={styles.questDot} />
                  <View style={styles.questInfo}>
                    <BrutlText variant="body">{q.title}</BrutlText>
                    <BrutlText variant="caption">{q.description}</BrutlText>
                    <View style={styles.questProgress}>
                      <View style={[styles.questProgressFill, { width: `${Math.round(q.progress * 100)}%` }]} />
                    </View>
                  </View>
                  <BrutlText variant="accent">+{q.xpReward}</BrutlText>
                </View>
              </BrutlCard>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: BrutlSpacing.xxxl },
  sectionLabel: { color: BrutlColors.accent, marginBottom: BrutlSpacing.sm },
  multiplierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm,
    backgroundColor: 'rgba(74,226,196,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,226,196,0.25)',
    borderRadius: 8, paddingHorizontal: BrutlSpacing.md, paddingVertical: BrutlSpacing.sm,
  },
  rankStrip: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  rankInfo: { flex: 1, gap: BrutlSpacing.xs },
  vitalsRow: { flexDirection: 'row', gap: BrutlSpacing.sm },
  vitalBox: { flex: 1, alignItems: 'center', gap: BrutlSpacing.xs },
  vitalValue: { fontSize: 22, fontFamily: 'BebasNeue_400Regular' },
  roastBox: { gap: BrutlSpacing.sm },
  cursor: { color: BrutlColors.accent, fontWeight: '700' },
  questItem: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  questDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BrutlColors.accent },
  questInfo: { flex: 1, gap: BrutlSpacing.xs },
  questProgress: { height: 3, backgroundColor: BrutlColors.border, borderRadius: 9999, overflow: 'hidden' },
  questProgressFill: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: BrutlColors.accent },
});
