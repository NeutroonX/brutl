import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { RankBadge } from '@/components/ui/RankBadge';
import { XPBar } from '@/components/ui/XPBar';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import { RANK_TITLES } from '@/lib/rank';
import { useRoastStore } from '@/stores/roast.store';
import { useUserStore } from '@/stores/user.store';
import type { Rank } from '@/types';

const RANK_ROASTS: Record<Rank, string> = {
  E: "Zero macros tracked. Zero effort logged. The couch is impressed — nobody else is.",
  D: "Barely showing up counts, technically. Keep that energy and you might graduate from tragic to mediocre.",
  C: "Middle of the pack. Not terrible enough to laugh at, not good enough to respect. Fix that.",
  B: "Almost dangerous. You've got the base — now stop coasting and actually push.",
  A: "You know what you're doing. Now stop knowing and start dominating.",
  S: "Elite tier. Clean data, locked diet, zero excuses. Don't go soft on us now.",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 120 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md },
  rankInfo: { flex: 1, gap: BrutlSpacing.xs },
  roastBox: { borderLeftWidth: 3, borderLeftColor: BrutlColors.accent, paddingLeft: BrutlSpacing.md, gap: BrutlSpacing.sm },
  cursor: { color: BrutlColors.accent, fontWeight: '700' },
  ctaArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: BrutlSpacing.xl, backgroundColor: BrutlColors.bg },
});

export default function FirstRoastScreen() {
  const profile = useUserStore((s) => s.profile);
  const setHasOnboarded = useUserStore((s) => s.setHasOnboarded);
  const { currentRoast, correctionText, isStreaming } = useRoastStore();
  const didStream = useRef(false);

  useEffect(() => {
    if (!profile || didStream.current) return;
    didStream.current = true;
    const payload = buildRoastPayload('APP_OPEN', profile.rank, profile.streakDays);
    streamRoast(payload).catch(() => {});
  }, [profile]);

  async function handleBegin() {
    await setHasOnboarded(true);
    router.replace('/');
  }

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrutlText variant="heading">Your Rank.</BrutlText>

        <BrutlCard>
          <View style={styles.rankRow}>
            <RankBadge rank={profile.rank} size="lg" />
            <View style={styles.rankInfo}>
              <BrutlText variant="display" style={{ fontSize: 36 }}>{profile.rank}</BrutlText>
              <BrutlText variant="muted">{RANK_TITLES[profile.rank]}</BrutlText>
              <XPBar current={profile.xp} max={500} label="XP to next rank" />
            </View>
          </View>
        </BrutlCard>

        <BrutlCard>
          <View style={styles.roastBox}>
            <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>
              FIRST ROAST
            </BrutlText>
            <BrutlText variant="body">
              {currentRoast || RANK_ROASTS[profile.rank]}
              {isStreaming && <BrutlText style={styles.cursor}>|</BrutlText>}
            </BrutlText>
            {!!correctionText && !isStreaming && (
              <BrutlText variant="accent">→ {correctionText}</BrutlText>
            )}
          </View>
        </BrutlCard>

      </ScrollView>

      <View style={styles.ctaArea}>
        <BrutlButton
          label="BEGIN"
          onPress={handleBegin}
          disabled={isStreaming}
        />
      </View>
    </View>
  );
}
