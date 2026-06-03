import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { buildRoastPayload, shouldFireAppOpenRoast, streamRoast } from '@/lib/roast-engine';
import { RANK_TITLES, getXPForNextRank, getXPInCurrentRank, getXPRangeForRank } from '@/lib/rank';
import { useRoastStore } from '@/stores/roast.store';
import { useUserStore } from '@/stores/user.store';
import { useWatchStore } from '@/stores/watch.store';
import { useWorkoutStore } from '@/stores/workout.store';
import type { Rank } from '@/types';

const TRIGGER_LABELS: Record<string, string> = {
  APP_OPEN: 'MORNING DISPATCH',
  MISSED_WORKOUT: 'MISSED WORKOUT',
  OFF_PLAN: 'DIET SLIP',
  WEAK_LIFT: 'POST-WORKOUT',
  POOR_RECOVERY: 'RECOVERY ALERT',
  WORKOUT_COMPLETE: 'WORKOUT COMPLETE',
  MEAL_LOGGED: 'MEAL LOGGED',
};

function BlinkCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return <Animated.Text style={{ opacity, color: BrutlColors.accent, fontWeight: '700' }}>|</Animated.Text>;
}

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
  const avatarUri = useUserStore((s) => s.avatarUri);
  const setAvatarUri = useUserStore((s) => s.setAvatarUri);
  const checkAndUpdateStreak = useUserStore((s) => s.checkAndUpdateStreak);
  const { currentRoast, correctionText, isStreaming, log: roastLog, lastRoastTrigger } = useRoastStore();
  const { vitals, syncVitals, hasPermission, isAvailable } = useWatchStore();
  const workoutLogs = useWorkoutStore((s) => s.logs);

  const [streakXP, setStreakXP] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    checkAndUpdateStreak()
      .then((bonus: number) => { if (bonus > 0) setStreakXP(bonus); })
      .catch(() => {});
    const init = async () => {
      try {
        if (isAvailable && hasPermission) await syncVitals();
      } catch { }
      const { vitals: v } = useWatchStore.getState();
      const hasVitals = !!(v.hrv || v.sleepHours || v.recoveryScore);
      const hasHistory = workoutLogs.length > 0;
      if (!hasVitals && !hasHistory) return; // show static placeholder, no API call
      if (!shouldFireAppOpenRoast()) return; // roasted within last 6h, show cached roast
      const watchData = hasVitals ? {
        date: Date.now(), restingHR: v.restingHR ?? 0, hrv: v.hrv ?? 0,
        sleepHours: v.sleepHours ?? 0, recoveryScore: v.recoveryScore ?? 0,
        stressLevel: 0, steps: v.steps ?? 0, caloriesBurned: 0, source: 'WEAR_OS' as const,
      } : null;
      const missedDays = workoutLogs.length > 0
        ? Math.floor((Date.now() - workoutLogs[0].date) / 86_400_000)
        : 0;
      if (v.recoveryScore !== null && v.recoveryScore < 40) {
        streamRoast(buildRoastPayload('POOR_RECOVERY', profile.rank, profile.streakDays, watchData)).catch(() => {});
      } else if (missedDays >= 2) {
        streamRoast(buildRoastPayload('MISSED_WORKOUT', profile.rank, profile.streakDays, watchData, null, undefined, missedDays)).catch(() => {});
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
  const hasNoData = noVitals && workoutLogs.length === 0;
  const activeTrigger = isStreaming ? 'INCOMING' : (lastRoastTrigger ? (TRIGGER_LABELS[lastRoastTrigger] ?? 'BRUTL DISPATCH') : null);

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
          <TouchableOpacity
            onPress={() => {
              Alert.alert('', '', [
                { text: 'Change Photo', onPress: async () => {
                  try {
                    const ImagePicker = await import('expo-image-picker');
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]?.uri) {
                      setAvatarUri(result.assets[0].uri);
                    }
                  } catch {
                    Alert.alert('Rebuild required', 'Run a new dev build to enable photo picking.');
                  }
                }},
                { text: 'Settings', onPress: () => router.push('/settings' as any) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            hitSlop={8}
          >
            <Image
              source={avatarUri ? { uri: avatarUri } : require('@/assets/images/pfp.jpg')}
              style={styles.avatar}
              contentFit="cover"
            />
          </TouchableOpacity>
        </View>


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

        {/* Roast / Placeholder */}
        {hasNoData ? (
          <BrutlCard>
            <View style={styles.roastBox}>
              <View style={styles.roastHeader}>
                <Ionicons name="flash" size={11} color={BrutlColors.accent} />
                <BrutlText style={styles.sectionLabel}>BRUTL DISPATCH</BrutlText>
              </View>
              <BrutlText style={styles.roastBody}>
                "The system is watching. Log your first workout — data is the only language BRUTL speaks."
              </BrutlText>
              <View style={styles.roastDivider} />
              <View style={styles.correctionRow}>
                <View style={styles.correctionDot} />
                <BrutlText style={styles.correctionLabel}>Start tracking to unlock daily roasts.</BrutlText>
              </View>
            </View>
          </BrutlCard>
        ) : (isStreaming || !!latestRoast) ? (
          <BrutlCard>
            <View style={styles.roastBox}>
              <View style={styles.roastHeader}>
                <Ionicons name="flash" size={11} color={BrutlColors.accent} />
                <BrutlText style={styles.sectionLabel}>{activeTrigger ?? 'BRUTL DISPATCH'}</BrutlText>
                {isStreaming && (
                  <View style={styles.liveDot} />
                )}
              </View>
              <BrutlText style={styles.roastBody}>
                {latestRoast}{isStreaming && <BlinkCursor />}
              </BrutlText>
              {!!latestCorrection && (
                <>
                  <View style={styles.roastDivider} />
                  <View style={styles.correctionRow}>
                    <View style={styles.correctionDot} />
                    <BrutlText style={styles.correctionLabel}>{latestCorrection}</BrutlText>
                  </View>
                </>
              )}
            </View>
          </BrutlCard>
        ) : null}


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
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: BrutlColors.borderVisible },
  greetingText: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: BrutlColors.textPrimary, letterSpacing: 1 },
  dateText: { fontSize: 12, color: BrutlColors.textMuted, marginTop: 2 },

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

  roastBox: { gap: 10 },
  roastHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roastBody: { fontSize: 14, color: BrutlColors.textPrimary, lineHeight: 21, letterSpacing: 0.1 },
  roastDivider: { height: 1, backgroundColor: `${BrutlColors.accent}25`, marginVertical: 2 },
  correctionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  correctionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BrutlColors.accent, marginTop: 5 },
  correctionLabel: { flex: 1, fontSize: 13, color: BrutlColors.accent, lineHeight: 19 },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: BrutlColors.accent,
    marginLeft: 'auto',
    opacity: 0.9,
  },

});
