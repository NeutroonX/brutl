import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BrutlText } from './ui/BrutlText';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';

interface Props {
  streakDays: number;
  correction: string;
  isStreaming: boolean;
}

interface TauntConfig {
  headline: string;
  sub: string;
  nextMilestone: { days: number; xp: number } | null;
}

function getTaunt(streak: number): TauntConfig {
  if (streak <= 0) return {
    headline: 'DAY ZERO.',
    sub: 'Everyone starts here. Most quit here. Open the app tomorrow.',
    nextMilestone: { days: 7, xp: 250 },
  };
  if (streak === 1) return {
    headline: 'DAY ONE',
    sub: 'You showed up. That\'s the lowest bar. Clear it again tomorrow.',
    nextMilestone: { days: 7, xp: 250 },
  };
  if (streak <= 3) return {
    headline: `${streak} DAYS IN.`,
    sub: 'Don\'t be the person who quits before it gets hard.',
    nextMilestone: { days: 7, xp: 250 },
  };
  if (streak <= 6) return {
    headline: `${streak} DAYS.`,
    sub: 'Almost a week. Most people quit by now. You haven\'t.',
    nextMilestone: { days: 7, xp: 250 },
  };
  if (streak === 7) return {
    headline: '7 DAYS.',
    sub: 'A week straight. This is where habits are actually born.',
    nextMilestone: { days: 30, xp: 500 },
  };
  if (streak <= 13) return {
    headline: `${streak} DAYS.`,
    sub: 'You\'re building something real. Don\'t let one bad day erase this.',
    nextMilestone: { days: 30, xp: 500 },
  };
  if (streak <= 29) return {
    headline: `${streak} DAYS.`,
    sub: 'Two weeks of consistency beats two months of motivation.',
    nextMilestone: { days: 30, xp: 500 },
  };
  if (streak === 30) return {
    headline: '30 DAYS.',
    sub: 'This is who you are now. The question is: who are you becoming?',
    nextMilestone: { days: 90, xp: 1500 },
  };
  if (streak <= 89) return {
    headline: `${streak} DAYS.`,
    sub: 'Most people don\'t even know anyone who\'s done this. You\'re becoming that person.',
    nextMilestone: { days: 90, xp: 1500 },
  };
  return {
    headline: `${streak} DAYS.`,
    sub: 'You\'ve earned the right to call yourself consistent. Now raise the bar.',
    nextMilestone: null,
  };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    overflow: 'hidden',
  },
  accentBar: {
    height: 2,
    backgroundColor: BrutlColors.accent,
    marginBottom: 0,
  },
  content: {
    padding: BrutlSpacing.lg,
    gap: BrutlSpacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headline: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: BrutlColors.textPrimary,
    lineHeight: 34,
    letterSpacing: 1,
  },
  sub: {
    fontSize: 13,
    color: BrutlColors.textMuted,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: BrutlColors.border,
  },
  correctionBlock: {
    gap: BrutlSpacing.xs,
  },
  correctionLabel: {
    fontSize: 10,
    color: BrutlColors.accent,
    letterSpacing: 2,
  },
  correctionText: {
    fontSize: 14,
    color: BrutlColors.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  cursor: {
    color: BrutlColors.accent,
    fontWeight: '700',
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.sm,
    backgroundColor: `${BrutlColors.accent}0D`,
    borderRadius: 8,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
    borderWidth: 1,
    borderColor: `${BrutlColors.accent}25`,
  },
  milestoneText: {
    fontSize: 12,
    color: BrutlColors.textMuted,
    flex: 1,
  },
  milestoneXP: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: BrutlColors.accent,
    letterSpacing: 1,
  },
});

export function StreakTauntCard({ streakDays, correction, isStreaming }: Props) {
  const taunt = getTaunt(streakDays);
  const daysToNext = taunt.nextMilestone
    ? taunt.nextMilestone.days - streakDays
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.content}>

        {/* Headline */}
        <View style={styles.topRow}>
          <BrutlText style={styles.headline}>{taunt.headline}</BrutlText>
          {streakDays > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <BrutlText style={{ fontSize: 18 }}>🔥</BrutlText>
              <BrutlText style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: BrutlColors.accent, lineHeight: 26 }}>
                {streakDays}
              </BrutlText>
            </View>
          )}
        </View>

        <BrutlText style={styles.sub}>{taunt.sub}</BrutlText>

        {/* Roast engine correction */}
        {(!!correction || isStreaming) && (
          <>
            <View style={styles.divider} />
            <View style={styles.correctionBlock}>
              <BrutlText style={styles.correctionLabel}>BRUTL'S ORDER</BrutlText>
              <BrutlText style={styles.correctionText}>
                → {correction || ''}
                {isStreaming && <BrutlText style={styles.cursor}>|</BrutlText>}
              </BrutlText>
            </View>
          </>
        )}

        {/* Next milestone */}
        {taunt.nextMilestone && daysToNext !== null && daysToNext > 0 && (
          <View style={styles.milestone}>
            <Ionicons name="trophy-outline" size={14} color={BrutlColors.accent} />
            <BrutlText style={styles.milestoneText}>
              {daysToNext} day{daysToNext !== 1 ? 's' : ''} to {taunt.nextMilestone.days}-day milestone
            </BrutlText>
            <BrutlText style={styles.milestoneXP}>+{taunt.nextMilestone.xp} XP</BrutlText>
          </View>
        )}

      </View>
    </View>
  );
}
