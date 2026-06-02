import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlText } from '@/components/ui/BrutlText';
import { Ionicons } from '@expo/vector-icons';
import { BrutlColors, BrutlSpacing, BrutlRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user.store';
import { useWatchStore } from '@/stores/watch.store';
import { storageRemove, STORAGE_KEYS } from '@/lib/storage';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.md,
    padding: BrutlSpacing.xl,
    paddingBottom: BrutlSpacing.md,
  },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: BrutlSpacing.xxxl },
  sectionLabel: { color: BrutlColors.accent, marginBottom: BrutlSpacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: BrutlSpacing.sm,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.md, flex: 1 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BrutlRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrutlColors.bgCard,
  },
  divider: { height: 1, backgroundColor: BrutlColors.border, marginVertical: BrutlSpacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dangerBtn: {
    borderWidth: 1,
    borderColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    padding: BrutlSpacing.md,
    alignItems: 'center',
  },
});

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  right,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon as any} size={18} color={BrutlColors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <BrutlText variant="body">{label}</BrutlText>
          {!!sublabel && <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>{sublabel}</BrutlText>}
        </View>
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={16} color={BrutlColors.textDisabled} />)}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

export default function SettingsScreen() {
  const profile = useUserStore((s) => s.profile);
  const { hasPermission, isAvailable, requestPermissions } = useWatchStore();
  const [requesting, setRequesting] = useState(false);

  async function handleGrantHealthConnect() {
    setRequesting(true);
    try {
      await requestPermissions();
    } finally {
      setRequesting(false);
    }
  }

  function handleResetOnboarding() {
    Alert.alert(
      'Reset App',
      'This will delete all your data and restart onboarding. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              storageRemove(STORAGE_KEYS.user),
              storageRemove(STORAGE_KEYS.hasOnboarded),
              storageRemove(STORAGE_KEYS.roastLog),
              storageRemove(STORAGE_KEYS.workoutLog),
              storageRemove(STORAGE_KEYS.dietLog),
              storageRemove(STORAGE_KEYS.quests),
              storageRemove(STORAGE_KEYS.watchVitals),
              storageRemove(STORAGE_KEYS.lastOpenDate),
            ]);
            router.replace('/onboarding/cold-open');
          },
        },
      ]
    );
  }

  const healthStatusColor = !isAvailable
    ? BrutlColors.textDisabled
    : hasPermission
    ? BrutlColors.success
    : BrutlColors.warning;

  const healthStatusLabel = !isAvailable
    ? 'Not available'
    : hasPermission
    ? 'Connected'
    : 'Permission needed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={BrutlColors.textPrimary} />
        </TouchableOpacity>
        <BrutlText variant="heading" style={{ fontSize: 24 }}>Settings</BrutlText>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Profile */}
        {!!profile && (
          <BrutlCard>
            <BrutlText variant="caption" style={styles.sectionLabel}>PROFILE</BrutlText>
            <SettingsRow icon="person-outline" label={profile.name} sublabel={`${profile.age} yrs · ${profile.weightKg}kg · ${profile.heightCm}cm`} />
            <View style={styles.divider} />
            <SettingsRow icon="flag-outline" label="Goal" sublabel={profile.goal.replace('_', ' ')} />
            <View style={styles.divider} />
            <SettingsRow icon="barbell-outline" label="Weak Area" sublabel={profile.weakArea} />
          </BrutlCard>
        )}

        {/* Health Connect */}
        <BrutlCard>
          <BrutlText variant="caption" style={styles.sectionLabel}>HEALTH DATA</BrutlText>
          <SettingsRow
            icon="heart-outline"
            label="Health Connect"
            sublabel={healthStatusLabel}
            right={<View style={[styles.statusDot, { backgroundColor: healthStatusColor }]} />}
          />
          {isAvailable && !hasPermission && (
            <>
              <View style={styles.divider} />
              <View style={{ paddingTop: BrutlSpacing.sm }}>
                <BrutlText variant="caption" style={{ color: BrutlColors.textMuted, marginBottom: BrutlSpacing.sm }}>
                  Grant access to heart rate, HRV, sleep, and steps from your Samsung watch or any Health Connect source.
                </BrutlText>
                <BrutlButton
                  label={requesting ? 'REQUESTING…' : 'GRANT HEALTH ACCESS'}
                  onPress={handleGrantHealthConnect}
                  disabled={requesting}
                  loading={requesting}
                />
              </View>
            </>
          )}
          {isAvailable && hasPermission && (
            <>
              <View style={styles.divider} />
              <SettingsRow icon="watch-outline" label="Samsung Watch" sublabel="Syncs via Health Connect automatically" />
              <View style={styles.divider} />
              <SettingsRow icon="sync-outline" label="HR · HRV · Sleep · Steps" sublabel="Read on every app open" />
            </>
          )}
          {!isAvailable && (
            <View style={{ paddingTop: BrutlSpacing.sm }}>
              <BrutlText variant="caption" style={{ color: BrutlColors.textDisabled }}>
                Install Health Connect from the Play Store to enable wearable data.
              </BrutlText>
            </View>
          )}
        </BrutlCard>

        {/* About */}
        <BrutlCard subtle>
          <BrutlText variant="caption" style={styles.sectionLabel}>ABOUT</BrutlText>
          <SettingsRow icon="trophy-outline" label="Rank System" sublabel="E → D → C → B → A → S" />
          <View style={styles.divider} />
          <SettingsRow icon="flame-outline" label="Streak" sublabel="Opens app daily to maintain" />
          <View style={styles.divider} />
          <SettingsRow icon="chatbubble-outline" label="Roast Engine" sublabel="Powered by NVIDIA Nemotron via OpenRouter" />
        </BrutlCard>

        {/* Danger Zone */}
        <View>
          <BrutlText variant="caption" style={[styles.sectionLabel, { marginBottom: BrutlSpacing.md }]}>DANGER ZONE</BrutlText>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleResetOnboarding} activeOpacity={0.7}>
            <BrutlText variant="body" style={{ color: BrutlColors.accent }}>RESET APP DATA</BrutlText>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
