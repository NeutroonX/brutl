import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { RANK_COLORS } from '@/components/ui/RankBadge';
import { XPBar } from '@/components/ui/XPBar';
import { XPToast } from '@/components/ui/XPToast';
import { RankUpModal } from '@/components/RankUpModal';
import { WeeklyXPChart } from '@/components/WeeklyXPChart';
import { StreakTauntCard } from '@/components/StreakTauntCard';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import { RANK_TITLES, getXPForNextRank, getXPInCurrentRank, getXPRangeForRank } from '@/lib/rank';
import { useDungeonStore } from '@/stores/dungeon.store';
import { useQuestStore } from '@/stores/quest.store';
import { useRoastStore } from '@/stores/roast.store';
import { useUserStore } from '@/stores/user.store';
import { useWatchStore } from '@/stores/watch.store';
import { useWorkoutStore } from '@/stores/workout.store';
import type { Rank } from '@/types';

const NEXT_RANK: Record<Rank, Rank | null> = {
  E: 'D', D: 'C', C: 'B', B: 'A', A: 'S', S: null,
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function VitalRing({ label, value, unit, color, icon }: {
  label: string; value: number | null; unit: string; color: string; icon: string;
}) {
  const hasData = value !== null;
  return (
    <View style={styles.vitalItem}>
      <View style={[styles.vitalRing, {
        borderColor: hasData ? color : BrutlColors.border,
        backgroundColor: hasData ? `${color}10` : 'transparent',
      }]}>
        {hasData ? (
          <>
            <BrutlText style={[styles.vitalVal, { color }]}>{value}</BrutlText>
            <BrutlText style={styles.vitalUnit}>{unit}</BrutlText>
          </>
        ) : (
          <Ionicons name={icon as any} size={18} color={BrutlColors.textDisabled} />
        )}
      </View>
      <BrutlText style={styles.vitalLabel}>{label}</BrutlText>
    </View>
  );
}

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const pendingRankUp = useUserStore((s) => s.pendingRankUp);
  const clearPendingRankUp = useUserStore((s) => s.clearPendingRankUp);
  const checkAndUpdateStreak = useUserStore((s) => s.checkAndUpdateStreak);
  const { currentRoast, correctionText, isStreaming, log: roastLog } = useRoastStore();
  const refreshDailyQuests = useQuestStore((s) => s.refreshDailyQuests);
  const quests = useQuestStore((s) => s.quests);
  const activeQuests = quests.filter((q) => !q.completedAt && q.expiresAt > Date.now()).slice(0, 3);
  const { vitals, syncVitals, hasPermission, isAvailable } = useWatchStore();
  const workoutLogs = useWorkoutStore((s) => s.logs);
  const dungeonRun = useDungeonStore((s) => s.run);
  const dungeonMultiplier = useDungeonStore((s) => s.getMultiplier)();
  const multiplierActive = dungeonMultiplier > 1;
  const multiplierDaysLeft = dungeonRun?.xpMultiplierUntil
    ? Math.max(0, Math.ceil((dungeonRun.xpMultiplierUntil - Date.now()) / 86_400_000))
    : 0;

  const [streakXP, setStreakXP] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    checkAndUpdateStreak()
      .then((bonus: number) => { if (bonus > 0) setStreakXP(bonus); })
      .catch(() => {});
    refreshDailyQuests().catch(() => {});
    const init = async () => {
      try {
        if (isAvailable && hasPermission) await syncVitals();
      } catch { }
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
  const nextRank = NEXT_RANK[profile.rank];
  const nextRankName = nextRank ? RANK_TITLES[nextRank] : null;
  const latestRoast = currentRoast || roastLog[0]?.roastText || '';
  const latestCorrection = isStreaming ? '' : correctionText || roastLog[0]?.correctionText || '';
  const noVitals = !vitals.restingHR && !vitals.hrv && !vitals.sleepHours && !vitals.recoveryScore;

  return (
    <View style={styles.container}>
      {!!pendingRankUp && (
        <RankUpModal visible newRank={pendingRankUp} xpGained={profile.xp} onDismiss={clearPendingRankUp} />
      )}
      <XPToast amount={streakXP} onHide={() => setStreakXP(null)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Greeting header */}
        <View style={styles.header}>
          <View>
            <BrutlText style={styles.greetingText}>{greeting()}, {profile.name.split(' ')[0]}</BrutlText>
            <BrutlText style={styles.dateText}>{todayLabel()} · Day {profile.streakDays > 0 ? profile.streakDays : 1}</BrutlText>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} hitSlop={12}>
            <Ionicons name="settings-outline" size={22} color={BrutlColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Dungeon multiplier */}
        {multiplierActive && (
          <View style={styles.multiplierBanner}>
            <Ionicons name="shield" size={13} color="#4AE2C4" />
            <BrutlText style={styles.multiplierText}>
              1.5× XP ACTIVE — {multiplierDaysLeft}d remaining
            </BrutlText>
          </View>
        )}

        {/* Hero Rank Card */}
        {(() => {
          const rankColor = RANK_COLORS[profile.rank];
          return (
            <View style={[styles.rankCard, {
              backgroundColor: BrutlColors.bgCard,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: BrutlColors.borderVisible,
              overflow: 'hidden',
            }]}>
              {/* Huge background rank letter */}
              <View style={{
                position: 'absolute', right: -12, top: -28,
                overflow: 'hidden',
              }} pointerEvents="none">
                <BrutlText style={{
                  fontFamily: 'BebasNeue_400Regular',
                  fontSize: 200, lineHeight: 200,
                  color: rankColor, opacity: 0.07,
                  letterSpacing: -4,
                }}>
                  {profile.rank}
                </BrutlText>
              </View>

              {/* Content */}
              <View style={{ padding: BrutlSpacing.lg, gap: BrutlSpacing.sm }}>
                {/* Top row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <BrutlText style={{ fontSize: 11, color: rankColor, letterSpacing: 2.5 }}>
                    RANK {profile.rank}
                  </BrutlText>
                  {profile.streakDays > 0 && (
                    <BrutlText style={{ fontSize: 12, color: BrutlColors.accent }}>
                      🔥 {profile.streakDays} day streak
                    </BrutlText>
                  )}
                </View>

                {/* Rank title */}
                <BrutlText style={{
                  fontFamily: 'BebasNeue_400Regular',
                  fontSize: 38, lineHeight: 40,
                  color: BrutlColors.textPrimary,
                  letterSpacing: 1,
                }}>
                  {RANK_TITLES[profile.rank]}
                </BrutlText>

                {/* XP bar */}
                <XPBar
                  current={xpInRank}
                  max={xpRange}
                  nextRankName={nextRankName ?? undefined}
                />

                {/* XP total */}
                <BrutlText style={{ fontSize: 11, color: BrutlColors.textDisabled }}>
                  {profile.xp.toLocaleString()} total XP
                </BrutlText>
              </View>
            </View>
          );
        })()}

        {/* Vitals */}
        <BrutlCard subtle>
          <View style={styles.vitalsSectionRow}>
            <BrutlText style={styles.sectionLabel}>VITALS</BrutlText>
            {isAvailable && !hasPermission && (
              <TouchableOpacity
                onPress={() => router.push('/settings' as any)}
                style={styles.connectPill}
              >
                <BrutlText style={styles.connectPillText}>Connect</BrutlText>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.vitalsRow}>
            <VitalRing label="HR"       value={vitals.restingHR}    unit="bpm" color={BrutlColors.accent}  icon="heart" />
            <VitalRing label="HRV"      value={vitals.hrv}          unit="ms"  color="#4A7BE2"              icon="pulse" />
            <VitalRing label="SLEEP"    value={vitals.sleepHours}   unit="h"   color={vitals.sleepHours ? (vitals.sleepHours >= 7 ? BrutlColors.success : BrutlColors.warning) : '#555'} icon="moon" />
            <VitalRing label="RECOVERY" value={vitals.recoveryScore} unit="%"  color={vitals.recoveryScore ? (vitals.recoveryScore >= 70 ? BrutlColors.success : vitals.recoveryScore >= 40 ? BrutlColors.warning : BrutlColors.accent) : '#555'} icon="battery-charging" />
          </View>
          {!isAvailable && (
            <BrutlText style={styles.vitalsNote}>Install Health Connect to enable wearable sync</BrutlText>
          )}
          {noVitals && isAvailable && hasPermission && (
            <BrutlText style={styles.vitalsNote}>Syncs automatically on app open</BrutlText>
          )}
        </BrutlCard>

        {/* Roast */}
        {!!latestRoast && (
          <BrutlCard>
            <View style={styles.roastBox}>
              <BrutlText style={styles.sectionLabel}>
                {isStreaming ? 'INCOMING ROAST' : "TODAY'S ROAST"}
              </BrutlText>
              <BrutlText variant="body">
                {latestRoast}
                {isStreaming && <BrutlText style={styles.cursor}>|</BrutlText>}
              </BrutlText>
              {!!latestCorrection && (
                <BrutlText variant="accent" style={{ marginTop: 4 }}>→ {latestCorrection}</BrutlText>
              )}
            </View>
          </BrutlCard>
        )}

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <View style={{ gap: BrutlSpacing.sm }}>
            <BrutlText style={styles.sectionLabel}>ACTIVE QUESTS</BrutlText>
            {activeQuests.map((q) => (
              <BrutlCard key={q.id} subtle>
                <View style={styles.questItem}>
                  <View style={[styles.questDot, { backgroundColor: q.type === 'BOSS' ? '#E2C44A' : BrutlColors.accent }]} />
                  <View style={styles.questInfo}>
                    <BrutlText variant="body">{q.title}</BrutlText>
                    <View style={styles.questProgressTrack}>
                      <View style={[styles.questProgressFill, { width: `${Math.round(q.progress * 100)}%` }]} />
                    </View>
                  </View>
                  <BrutlText variant="accent" style={{ fontSize: 13 }}>+{q.xpReward}</BrutlText>
                </View>
              </BrutlCard>
            ))}
          </View>
        )}

        {/* Weekly XP Chart */}
        <BrutlCard subtle>
          <WeeklyXPChart logs={workoutLogs} />
        </BrutlCard>

        {/* Streak Taunt — roast engine correction wired in */}
        <StreakTauntCard
          streakDays={profile.streakDays}
          correction={latestCorrection}
          isStreaming={isStreaming}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: BrutlSpacing.xxxl },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greetingText: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: BrutlColors.textPrimary, letterSpacing: 1 },
  dateText: { fontSize: 12, color: BrutlColors.textMuted, marginTop: 2 },

  multiplierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm,
    backgroundColor: 'rgba(74,226,196,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,226,196,0.25)',
    borderRadius: 8, paddingHorizontal: BrutlSpacing.md, paddingVertical: BrutlSpacing.sm,
  },
  multiplierText: { fontSize: 12, color: '#4AE2C4', flex: 1, letterSpacing: 0.5 },

  rankCard: { position: 'relative' },

  sectionLabel: { fontSize: 11, color: BrutlColors.accent, letterSpacing: 1.5, marginBottom: BrutlSpacing.sm },
  vitalsSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: BrutlSpacing.sm },
  connectPill: {
    backgroundColor: `${BrutlColors.accent}18`,
    borderRadius: 999, borderWidth: 1, borderColor: `${BrutlColors.accent}50`,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  connectPillText: { fontSize: 11, color: BrutlColors.accent },

  vitalsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: BrutlSpacing.sm },
  vitalItem: { flex: 1, alignItems: 'center', gap: 6 },
  vitalRing: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  vitalVal: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, lineHeight: 20 },
  vitalUnit: { fontSize: 9, color: BrutlColors.textMuted, marginTop: -2 },
  vitalLabel: { fontSize: 10, color: BrutlColors.textMuted, letterSpacing: 0.5 },
  vitalsNote: { fontSize: 11, color: BrutlColors.textDisabled, textAlign: 'center', marginTop: BrutlSpacing.sm },

  roastBox: { gap: BrutlSpacing.sm },
  cursor: { color: BrutlColors.accent, fontWeight: '700' },

  questItem: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  questDot: { width: 8, height: 8, borderRadius: 4 },
  questInfo: { flex: 1, gap: 6 },
  questProgressTrack: { height: 3, backgroundColor: BrutlColors.border, borderRadius: 9999, overflow: 'hidden' },
  questProgressFill: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: BrutlColors.accent },
});
