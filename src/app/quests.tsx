import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import { useQuestStore } from '@/stores/quest.store';
import { useUserStore } from '@/stores/user.store';
import type { Quest, QuestType } from '@/types';

const TYPE_LABELS: Record<QuestType, string> = {
  DAILY: 'DAILY',
  BOSS: 'BOSS FIGHT',
  DUNGEON: 'DUNGEON RUN',
  SHADOW: '??? SHADOW QUEST',
};

const TYPE_COLORS: Record<QuestType, string> = {
  DAILY: BrutlColors.accent,
  BOSS: '#E2C44A',
  DUNGEON: '#4AE24B',
  SHADOW: '#C44AE2',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: BrutlSpacing.xxxl },
  sectionLabel: { marginBottom: BrutlSpacing.sm },
  questCard: { gap: BrutlSpacing.md },
  questHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questTitle: { fontSize: 20 },
  progressTrack: { height: 4, backgroundColor: BrutlColors.border, borderRadius: 9999, overflow: 'hidden' },
  progressFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 9999 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completedOverlay: { opacity: 0.4 },
  completedBadge: {
    backgroundColor: BrutlColors.borderVisible,
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d left`;
  return `${h}h ${m}m left`;
}

function QuestCard({ quest, onComplete }: { quest: Quest; onComplete: (id: string) => void }) {
  const color = TYPE_COLORS[quest.type];
  const completed = !!quest.completedAt;

  return (
    <BrutlCard style={completed ? styles.completedOverlay : undefined}>
      <View style={styles.questCard}>
        <View style={styles.questHeader}>
          <BrutlText variant="caption" style={{ color }}>
            {TYPE_LABELS[quest.type]}
          </BrutlText>
          <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm, alignItems: 'center' }}>
            {completed && (
              <View style={styles.completedBadge}>
                <BrutlText variant="caption">DONE</BrutlText>
              </View>
            )}
            <BrutlText variant="accent">+{quest.xpReward} XP</BrutlText>
          </View>
        </View>

        <BrutlText variant="heading" style={styles.questTitle}>{quest.title}</BrutlText>
        <BrutlText variant="muted">{quest.description}</BrutlText>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(quest.progress * 100)}%`, backgroundColor: color }]} />
        </View>

        <View style={styles.timerRow}>
          <BrutlText variant="caption">{Math.round(quest.progress * 100)}% complete</BrutlText>
          <BrutlText variant="caption">{timeUntil(quest.expiresAt)}</BrutlText>
        </View>

        {!completed && quest.progress >= 1 && (
          <TouchableOpacity
            onPress={() => onComplete(quest.id)}
            style={{ backgroundColor: color, padding: BrutlSpacing.sm, borderRadius: 4, alignItems: 'center' }}
          >
            <BrutlText variant="body" style={{ color: '#000', fontWeight: '700' }}>CLAIM REWARD</BrutlText>
          </TouchableOpacity>
        )}
      </View>
    </BrutlCard>
  );
}

export default function QuestsScreen() {
  const quests = useQuestStore((s) => s.quests);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const updateXP = useUserStore((s) => s.updateXP);

  async function handleComplete(id: string) {
    const quest = await completeQuest(id);
    if (quest) await updateXP(quest.xpReward);
  }

  const activeQuests = quests.filter((q) => !q.completedAt);
  const completedQuests = quests.filter((q) => q.completedAt);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrutlText variant="heading">Quest Board</BrutlText>

        {activeQuests.length === 0 && completedQuests.length === 0 && (
          <BrutlText variant="muted">No quests yet. Complete onboarding to unlock your first quest.</BrutlText>
        )}

        {activeQuests.length > 0 && (
          <View style={{ gap: BrutlSpacing.md }}>
            <BrutlText variant="caption" style={[styles.sectionLabel, { color: BrutlColors.accent }]}>
              ACTIVE
            </BrutlText>
            {activeQuests.map((q) => (
              <QuestCard key={q.id} quest={q} onComplete={handleComplete} />
            ))}
          </View>
        )}

        {completedQuests.length > 0 && (
          <View style={{ gap: BrutlSpacing.md }}>
            <BrutlText variant="caption" style={[styles.sectionLabel, { color: BrutlColors.textMuted }]}>
              COMPLETED
            </BrutlText>
            {completedQuests.map((q) => (
              <QuestCard key={q.id} quest={q} onComplete={handleComplete} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
