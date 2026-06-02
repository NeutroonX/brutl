import { useRef } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlText } from '@/components/ui/BrutlText';
import { XPToast, useXPToast } from '@/components/ui/XPToast';
import { BrutlColors, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { DUNGEON_DAYS, useDungeonStore } from '@/stores/dungeon.store';
import { useQuestStore } from '@/stores/quest.store';
import { useUserStore } from '@/stores/user.store';
import type { Quest, QuestType, UnlockedShadow } from '@/types';

// ─── Colors ────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<QuestType, string> = {
  DAILY:   BrutlColors.accent,
  BOSS:    '#E2C44A',
  DUNGEON: '#4AE2C4',
  SHADOW:  '#C44AE2',
};

const TYPE_ICONS: Record<QuestType, string> = {
  DAILY:   'flash',
  BOSS:    'skull',
  DUNGEON: 'shield',
  SHADOW:  'eye-off',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 120 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm, marginBottom: BrutlSpacing.sm,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: BrutlColors.border },

  // Quest card
  questCard: { gap: BrutlSpacing.md },
  questTop: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: BrutlSpacing.sm, paddingVertical: 3,
    borderRadius: BrutlRadius.full, borderWidth: 1,
  },
  questTitle: { flex: 1 },
  xpBadge: {
    backgroundColor: 'rgba(226,75,74,0.12)',
    borderRadius: BrutlRadius.full,
    paddingHorizontal: BrutlSpacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: BrutlColors.accent,
  },
  progressTrack: { height: 4, backgroundColor: BrutlColors.border, borderRadius: 9999, overflow: 'hidden' },
  progressFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 9999 },
  questMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  claimBtn: {
    borderRadius: BrutlRadius.sm, padding: BrutlSpacing.sm + 2, alignItems: 'center', marginTop: 2,
  },

  // Dungeon
  dungeonCard: {
    borderRadius: BrutlRadius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1a3a3a',
    backgroundColor: '#050f0f',
  },
  dungeonHeader: {
    padding: BrutlSpacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dungeonChain: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: BrutlSpacing.lg, paddingBottom: BrutlSpacing.md,
  },
  dungeonNode: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  dungeonConnector: { flex: 1, height: 2 },
  dungeonDayCard: {
    margin: BrutlSpacing.md, marginTop: 0,
    backgroundColor: 'rgba(74,226,196,0.06)',
    borderRadius: BrutlRadius.md, padding: BrutlSpacing.md,
    borderWidth: 1, borderColor: 'rgba(74,226,196,0.2)',
    gap: BrutlSpacing.sm,
  },
  dungeonFailed: {
    backgroundColor: 'rgba(226,75,74,0.06)',
    borderRadius: BrutlRadius.lg, padding: BrutlSpacing.lg,
    borderWidth: 1, borderColor: 'rgba(226,75,74,0.3)',
    gap: BrutlSpacing.sm, alignItems: 'center',
  },
  dungeonComplete: {
    backgroundColor: 'rgba(74,226,196,0.06)',
    borderRadius: BrutlRadius.lg, padding: BrutlSpacing.lg,
    borderWidth: 1, borderColor: 'rgba(74,226,196,0.3)',
    gap: BrutlSpacing.sm, alignItems: 'center',
  },

  // Shadow quest
  shadowCard: {
    borderRadius: BrutlRadius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(196,74,226,0.3)',
    backgroundColor: '#0a0510',
  },
  shadowInner: { padding: BrutlSpacing.lg, gap: BrutlSpacing.md },
  shadowHidden: { alignItems: 'center', gap: BrutlSpacing.sm, paddingVertical: BrutlSpacing.sm },

  // Completed
  completedOverlay: { opacity: 0.35 },
});

// ─── Quest Card ─────────────────────────────────────────────────────────────
function QuestCard({ quest, onClaim }: { quest: Quest; onClaim: (id: string) => void }) {
  const color = TYPE_COLORS[quest.type];
  const icon = TYPE_ICONS[quest.type];
  const completed = !!quest.completedAt;
  const claimable = !completed && quest.progress >= 1;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handleClaim() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start(() => onClaim(quest.id));
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, completed && styles.completedOverlay]}>
      <BrutlCard style={{ borderColor: completed ? BrutlColors.border : `${color}30` }}>
        <View style={styles.questCard}>
          <View style={styles.questTop}>
            <View style={[styles.typePill, { borderColor: `${color}50`, backgroundColor: `${color}10` }]}>
              <Ionicons name={icon as any} size={11} color={color} />
              <BrutlText variant="caption" style={{ color, fontSize: 10, letterSpacing: 1 }}>
                {quest.type === 'BOSS' ? 'BOSS FIGHT' : quest.type}
              </BrutlText>
            </View>
            {completed
              ? <View style={{ backgroundColor: BrutlColors.borderVisible, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <BrutlText variant="caption">DONE ✓</BrutlText>
                </View>
              : <View style={styles.xpBadge}>
                  <BrutlText variant="caption" style={{ color: BrutlColors.accent }}>+{quest.xpReward} XP</BrutlText>
                </View>
            }
          </View>

          <View style={styles.questTitle}>
            <BrutlText variant="heading" style={{ fontSize: 18, color: completed ? BrutlColors.textMuted : BrutlColors.textPrimary }}>
              {quest.title}
            </BrutlText>
            <BrutlText variant="muted" style={{ marginTop: 2 }}>{quest.description}</BrutlText>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(quest.progress * 100)}%`, backgroundColor: color }]} />
          </View>

          <View style={styles.questMeta}>
            <BrutlText variant="caption" style={{ color: claimable ? color : BrutlColors.textMuted }}>
              {claimable ? '✓ Ready to claim' : `${Math.round(quest.progress * 100)}% complete`}
            </BrutlText>
            <BrutlText variant="caption">{timeUntil(quest.expiresAt)}</BrutlText>
          </View>

          {claimable && (
            <TouchableOpacity
              style={[styles.claimBtn, { backgroundColor: color }]}
              onPress={handleClaim}
              activeOpacity={0.8}
            >
              <BrutlText variant="body" style={{ color: '#000', fontWeight: '700', letterSpacing: 1 }}>
                CLAIM +{quest.xpReward} XP
              </BrutlText>
            </TouchableOpacity>
          )}
        </View>
      </BrutlCard>
    </Animated.View>
  );
}

// ─── Dungeon Section ────────────────────────────────────────────────────────
function DungeonSection() {
  const run = useDungeonStore((s) => s.run);
  const startRun = useDungeonStore((s) => s.startRun);
  const abandonRun = useDungeonStore((s) => s.abandonRun);

  if (!run || run.status === 'FAILED') {
    return (
      <View>
        <SectionHeader color="#4AE2C4" label="DUNGEON RUN" icon="shield" />
        {run?.status === 'FAILED' ? (
          <View style={styles.dungeonFailed}>
            <Ionicons name="skull" size={32} color={BrutlColors.accent} />
            <BrutlText variant="display" style={{ fontSize: 22, color: BrutlColors.accent }}>RUN FAILED</BrutlText>
            <BrutlText variant="muted" style={{ textAlign: 'center' }}>
              You missed a day. −200 XP applied. The dungeon doesn't forgive.
            </BrutlText>
            <BrutlButton label="TRY AGAIN" onPress={startRun} style={{ marginTop: BrutlSpacing.sm }} />
          </View>
        ) : (
          <View style={styles.dungeonCard}>
            <View style={styles.dungeonHeader}>
              <View style={{ gap: 4, flex: 1 }}>
                <BrutlText variant="display" style={{ fontSize: 20, color: '#4AE2C4' }}>7-DAY DUNGEON RUN</BrutlText>
                <BrutlText variant="muted" style={{ fontSize: 12 }}>
                  Complete 7 escalating challenges. Quit = −200 XP. Finish = +1,000 XP + 1.5× XP for 14 days.
                </BrutlText>
              </View>
              <Ionicons name="shield" size={32} color="#4AE2C4" style={{ opacity: 0.5 }} />
            </View>

            <View style={{ paddingHorizontal: BrutlSpacing.lg, paddingBottom: BrutlSpacing.md, gap: BrutlSpacing.sm }}>
              {DUNGEON_DAYS.map((d) => (
                <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#1a3a3a', alignItems: 'center', justifyContent: 'center' }}>
                    <BrutlText variant="caption" style={{ color: '#4AE2C4', fontSize: 10 }}>{d.day}</BrutlText>
                  </View>
                  <BrutlText variant="caption" style={{ flex: 1, color: BrutlColors.textDisabled }}>{d.title}</BrutlText>
                </View>
              ))}
            </View>

            <View style={{ padding: BrutlSpacing.md, paddingTop: 0 }}>
              <BrutlButton label="ENTER THE DUNGEON" onPress={startRun} />
            </View>
          </View>
        )}
      </View>
    );
  }

  if (run.status === 'COMPLETED') {
    const daysUntilExpiry = run.xpMultiplierUntil
      ? Math.max(0, Math.ceil((run.xpMultiplierUntil - Date.now()) / 86_400_000))
      : 0;
    return (
      <View>
        <SectionHeader color="#4AE2C4" label="DUNGEON RUN" icon="shield" />
        <View style={styles.dungeonComplete}>
          <Ionicons name="trophy" size={40} color="#4AE2C4" />
          <BrutlText variant="display" style={{ fontSize: 28, color: '#4AE2C4' }}>DUNGEON CLEARED</BrutlText>
          <BrutlText variant="muted" style={{ textAlign: 'center' }}>
            All 7 days completed. +1,000 XP awarded.
          </BrutlText>
          {daysUntilExpiry > 0 && (
            <View style={{ backgroundColor: 'rgba(74,226,196,0.1)', borderRadius: BrutlRadius.sm, padding: BrutlSpacing.sm, borderWidth: 1, borderColor: 'rgba(74,226,196,0.3)' }}>
              <BrutlText variant="caption" style={{ color: '#4AE2C4', textAlign: 'center' }}>
                1.5× XP MULTIPLIER — {daysUntilExpiry} days remaining
              </BrutlText>
            </View>
          )}
          <BrutlButton label="START NEW RUN" onPress={startRun} style={{ marginTop: BrutlSpacing.sm }} />
        </View>
      </View>
    );
  }

  // Active run
  const currentDaySpec = DUNGEON_DAYS[run.currentDay - 1];
  const timeLeft = run.dayStartedAt + 24 * 60 * 60 * 1000 - Date.now();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / 3_600_000));
  const minsLeft = Math.max(0, Math.floor((timeLeft % 3_600_000) / 60_000));
  const isUrgent = timeLeft < 3 * 60 * 60 * 1000;

  return (
    <View>
      <SectionHeader color="#4AE2C4" label="DUNGEON RUN" icon="shield" />
      <View style={styles.dungeonCard}>
        <View style={styles.dungeonHeader}>
          <View>
            <BrutlText variant="display" style={{ fontSize: 16, color: '#4AE2C4', letterSpacing: 2 }}>
              DAY {run.currentDay} OF 7
            </BrutlText>
            <BrutlText variant="muted" style={{ fontSize: 11 }}>
              {isUrgent ? '⚠ ' : ''}{hoursLeft}h {minsLeft}m remaining
              {isUrgent ? ' — URGENT' : ''}
            </BrutlText>
          </View>
          <TouchableOpacity
            onPress={abandonRun}
            style={{ padding: BrutlSpacing.sm }}
            hitSlop={8}
          >
            <BrutlText variant="caption" style={{ color: BrutlColors.accentDim }}>QUIT</BrutlText>
          </TouchableOpacity>
        </View>

        {/* Day chain */}
        <View style={styles.dungeonChain}>
          {DUNGEON_DAYS.map((d, i) => {
            const done = i < run.daysCompleted.length;
            const current = i === run.currentDay - 1;
            const nodeColor = done ? '#4AE2C4' : current ? '#4AE2C4' : '#1a3a3a';
            const connColor = done ? '#4AE2C4' : '#1a3a3a';
            return (
              <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', flex: i < 6 ? 1 : undefined }}>
                <View style={[styles.dungeonNode, {
                  borderColor: nodeColor,
                  backgroundColor: done ? '#4AE2C4' : current ? 'rgba(74,226,196,0.1)' : 'transparent',
                }]}>
                  {done
                    ? <Ionicons name="checkmark" size={14} color="#000" />
                    : <BrutlText style={{ fontSize: 11, color: current ? '#4AE2C4' : '#1a3a3a', fontWeight: '700' }}>{d.day}</BrutlText>
                  }
                </View>
                {i < 6 && <View style={[styles.dungeonConnector, { backgroundColor: connColor }]} />}
              </View>
            );
          })}
        </View>

        {/* Current day challenge */}
        <View style={styles.dungeonDayCard}>
          <BrutlText variant="caption" style={{ color: '#4AE2C4', letterSpacing: 2 }}>TODAY'S CHALLENGE</BrutlText>
          <BrutlText variant="heading" style={{ fontSize: 18 }}>{currentDaySpec.title}</BrutlText>
          <BrutlText variant="muted">{currentDaySpec.description}</BrutlText>
          <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm, marginTop: 4 }}>
            <ProgressChip
              label="WORKOUT"
              done={run.todayWorkoutDuration > 0}
              extra={currentDaySpec.minDurationMin > 0 ? `${currentDaySpec.minDurationMin}+ min` : undefined}
            />
            {currentDaySpec.requiresProtein && (
              <ProgressChip
                label="PROTEIN"
                done={run.todayProteinRatio >= 0.8}
                extra="80% target"
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function ProgressChip({ label, done, extra }: { label: string; done: boolean; extra?: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: BrutlRadius.full,
      backgroundColor: done ? 'rgba(74,226,196,0.15)' : 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: done ? 'rgba(74,226,196,0.4)' : BrutlColors.borderVisible,
    }}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={done ? '#4AE2C4' : BrutlColors.textDisabled} />
      <BrutlText variant="caption" style={{ color: done ? '#4AE2C4' : BrutlColors.textMuted, fontSize: 11 }}>
        {label}{extra ? ` · ${extra}` : ''}
      </BrutlText>
    </View>
  );
}

// ─── Shadow Quest Section ───────────────────────────────────────────────────
function ShadowQuestCard({ shadow, onReveal, onClaim }: {
  shadow: UnlockedShadow;
  onReveal: (id: string) => void;
  onClaim: (id: string) => void;
}) {
  const claimed = shadow.claimed;

  if (!shadow.revealed) {
    return (
      <TouchableOpacity onPress={() => onReveal(shadow.id)} activeOpacity={0.7}>
        <View style={styles.shadowCard}>
          <View style={[styles.shadowInner, styles.shadowHidden]}>
            <BrutlText style={{ fontSize: 28, letterSpacing: 8, color: '#C44AE2' }}>???</BrutlText>
            <BrutlText variant="caption" style={{ color: '#C44AE2', letterSpacing: 2 }}>SHADOW QUEST UNLOCKED</BrutlText>
            <BrutlText variant="muted" style={{ fontSize: 11, textAlign: 'center' }}>
              Tap to reveal
            </BrutlText>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.shadowCard, claimed && styles.completedOverlay]}>
      <View style={styles.shadowInner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={[styles.typePill, { borderColor: 'rgba(196,74,226,0.4)', backgroundColor: 'rgba(196,74,226,0.08)' }]}>
            <Ionicons name="eye-off" size={11} color="#C44AE2" />
            <BrutlText variant="caption" style={{ color: '#C44AE2', fontSize: 10, letterSpacing: 1 }}>SHADOW QUEST</BrutlText>
          </View>
          {claimed
            ? <View style={{ backgroundColor: BrutlColors.borderVisible, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                <BrutlText variant="caption">CLAIMED ✓</BrutlText>
              </View>
            : <View style={{ borderRadius: BrutlRadius.full, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(196,74,226,0.1)', borderWidth: 1, borderColor: 'rgba(196,74,226,0.4)' }}>
                <BrutlText variant="caption" style={{ color: '#C44AE2' }}>+{shadow.xpReward} XP</BrutlText>
              </View>
          }
        </View>
        <BrutlText variant="heading" style={{ fontSize: 18 }}>{shadow.title}</BrutlText>
        <BrutlText variant="muted">{shadow.description}</BrutlText>
        {!claimed && (
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: '#C44AE2' }]}
            onPress={() => onClaim(shadow.id)}
            activeOpacity={0.8}
          >
            <BrutlText variant="body" style={{ color: '#fff', fontWeight: '700', letterSpacing: 1 }}>
              CLAIM +{shadow.xpReward} XP
            </BrutlText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ label, color, icon }: { label: string; color: string; icon: string }) {
  return (
    <View style={[styles.sectionHeader, { marginBottom: BrutlSpacing.md }]}>
      <Ionicons name={icon as any} size={12} color={color} />
      <BrutlText variant="caption" style={{ color, letterSpacing: 2, fontSize: 11 }}>{label}</BrutlText>
      <View style={[styles.sectionLine, { backgroundColor: `${color}20` }]} />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function QuestsScreen() {
  const quests = useQuestStore((s) => s.quests);
  const shadows = useQuestStore((s) => s.shadows);
  const completeQuest = useQuestStore((s) => s.completeQuest);
  const revealShadow = useQuestStore((s) => s.revealShadow);
  const claimShadow = useQuestStore((s) => s.claimShadow);
  const updateXP = useUserStore((s) => s.updateXP);
  const { pending: xpPending, showXP, clearXP } = useXPToast();

  const now = Date.now();
  const activeQuests = quests.filter((q) => !q.completedAt && q.expiresAt > now);
  const completedQuests = quests.filter((q) => !!q.completedAt);
  const unclaimedShadows = shadows.filter((s) => !s.claimed);
  const claimedShadows = shadows.filter((s) => s.claimed);

  async function handleClaim(id: string) {
    const quest = await completeQuest(id);
    if (quest) {
      await updateXP(quest.xpReward);
      showXP(quest.xpReward);
    }
  }

  async function handleClaimShadow(id: string) {
    const xp = await claimShadow(id);
    if (xp > 0) {
      await updateXP(xp);
      showXP(xp);
    }
  }

  return (
    <View style={styles.container}>
      <XPToast amount={xpPending} onHide={clearXP} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrutlText variant="heading">Quest Board</BrutlText>

        {/* Dungeon Run */}
        <DungeonSection />

        {/* Shadow Quests */}
        {unclaimedShadows.length > 0 && (
          <View>
            <SectionHeader color="#C44AE2" label="SHADOW QUESTS" icon="eye-off" />
            <View style={{ gap: BrutlSpacing.md }}>
              {unclaimedShadows.map((s) => (
                <ShadowQuestCard
                  key={s.id}
                  shadow={s}
                  onReveal={revealShadow}
                  onClaim={handleClaimShadow}
                />
              ))}
            </View>
          </View>
        )}

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <View>
            <SectionHeader color={BrutlColors.accent} label="ACTIVE" icon="flash" />
            <View style={{ gap: BrutlSpacing.md }}>
              {activeQuests.map((q) => (
                <QuestCard key={q.id} quest={q} onClaim={handleClaim} />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {activeQuests.length === 0 && unclaimedShadows.length === 0 && completedQuests.length === 0 && (
          <BrutlCard subtle>
            <BrutlText variant="muted" style={{ textAlign: 'center' }}>
              No quests yet. Complete onboarding to unlock your first quest.
            </BrutlText>
          </BrutlCard>
        )}

        {/* Completed */}
        {(completedQuests.length > 0 || claimedShadows.length > 0) && (
          <View>
            <SectionHeader color={BrutlColors.textDisabled} label="COMPLETED" icon="checkmark-circle" />
            <View style={{ gap: BrutlSpacing.md }}>
              {completedQuests.map((q) => (
                <QuestCard key={q.id} quest={q} onClaim={() => {}} />
              ))}
              {claimedShadows.map((s) => (
                <ShadowQuestCard key={s.id} shadow={s} onReveal={() => {}} onClaim={() => {}} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
