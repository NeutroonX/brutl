import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { RankBadge } from '@/components/ui/RankBadge';
import { XPBar } from '@/components/ui/XPBar';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import { RANK_TITLES } from '@/lib/rank';
import { useQuestStore } from '@/stores/quest.store';
import { useRoastStore } from '@/stores/roast.store';
import { useUserStore } from '@/stores/user.store';

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
  const seedInitialQuests = useQuestStore((s) => s.seedInitialQuests);

  useEffect(() => {
    if (!profile) return;
    const payload = buildRoastPayload('APP_OPEN', profile.rank, profile.streakDays);
    streamRoast(payload);
    seedInitialQuests();
  }, []);

  async function handleBegin() {
    await setHasOnboarded(true);
    router.replace('/');
  }

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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

        {(currentRoast || isStreaming) && (
          <BrutlCard>
            <View style={styles.roastBox}>
              <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>
                FIRST ROAST
              </BrutlText>
              <BrutlText variant="body">
                {currentRoast}
                {isStreaming && <BrutlText style={styles.cursor}>|</BrutlText>}
              </BrutlText>
              {correctionText && !isStreaming && (
                <BrutlText variant="accent">→ {correctionText}</BrutlText>
              )}
            </View>
          </BrutlCard>
        )}

        <BrutlCard subtle>
          <BrutlText variant="caption" style={{ color: BrutlColors.accent, marginBottom: BrutlSpacing.xs }}>
            FIRST QUEST
          </BrutlText>
          <BrutlText variant="body">First Blood</BrutlText>
          <BrutlText variant="muted">Log your first workout and hit your protein target today.</BrutlText>
          <BrutlText variant="accent" style={{ marginTop: BrutlSpacing.xs }}>+150 XP</BrutlText>
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
