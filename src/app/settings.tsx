import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Modal, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';

import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlText } from '@/components/ui/BrutlText';
import { Ionicons } from '@expo/vector-icons';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { useUserStore, buildUserProfile, calcMacroTargets } from '@/stores/user.store';
import { useWatchStore } from '@/stores/watch.store';
import { storageRemove, STORAGE_KEYS } from '@/lib/storage';
import type { ActivityLevel, Gender, Goal, WeakArea } from '@/types';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'SEDENTARY',   label: 'Sedentary' },
  { value: 'LIGHT',       label: 'Light' },
  { value: 'MODERATE',    label: 'Moderate' },
  { value: 'ACTIVE',      label: 'Active' },
  { value: 'VERY_ACTIVE', label: 'Very Active' },
];

const GOALS: { value: Goal; label: string }[] = [
  { value: 'FAT_LOSS', label: 'Fat Loss' },
  { value: 'MUSCLE_GAIN', label: 'Muscle Gain' },
  { value: 'RECOMP', label: 'Both' },
];

const WEAK_AREAS: { value: WeakArea; label: string }[] = [
  { value: 'UPPER', label: 'Upper Body' },
  { value: 'LOWER', label: 'Lower Body' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'DIET', label: 'Diet' },
];

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
    width: 36, height: 36,
    borderRadius: BrutlRadius.sm,
    alignItems: 'center', justifyContent: 'center',
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
  // Edit profile modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: BrutlColors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: BrutlSpacing.xl,
    gap: BrutlSpacing.md,
    paddingBottom: BrutlSpacing.xxxl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: BrutlSpacing.sm },
  input: {
    backgroundColor: BrutlColors.bg,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 15,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
  },
  fieldLabel: { color: BrutlColors.textMuted, marginBottom: 4, fontSize: 11, letterSpacing: 1 },
  optionRow: { flexDirection: 'row', gap: BrutlSpacing.sm, flexWrap: 'wrap' },
  option: {
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },
  optionSelected: { backgroundColor: BrutlColors.accent, borderColor: BrutlColors.accent },
});

function SettingsRow({
  icon, label, sublabel, onPress, right,
}: {
  icon: string; label: string; sublabel?: string;
  onPress?: () => void; right?: React.ReactNode;
}) {
  const inner = (
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
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>;
  return inner;
}

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const [name, setName] = useState(profile?.name ?? '');
  const [weightKg, setWeightKg] = useState(String(profile?.weightKg ?? ''));
  const [heightCm, setHeightCm] = useState(String(profile?.heightCm ?? ''));
  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'MALE');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel ?? 'MODERATE');
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'FAT_LOSS');
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>(
    Array.isArray(profile?.weakArea) ? profile.weakArea : profile?.weakArea ? [profile.weakArea as WeakArea] : ['DIET']
  );
  const [macros, setMacros] = useState({ ...profile?.macroTargets ?? { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 } });
  const [saving, setSaving] = useState(false);

  function patchMacro(field: string, raw: string) {
    const n = parseInt(raw);
    if (!isNaN(n) && n >= 0) setMacros((m) => ({ ...m, [field]: n }));
  }

  async function handleSave() {
    if (!profile || !name.trim()) return;
    setSaving(true);
    const newWeightKg = parseFloat(weightKg) || profile.weightKg;
    const newHeightCm = parseInt(heightCm) || profile.heightCm;
    await setProfile({
      ...profile,
      name: name.trim(),
      weightKg: newWeightKg,
      heightCm: newHeightCm,
      gender,
      activityLevel,
      goal,
      weakArea: weakAreas,
      macroTargets: macros,
    });
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <BrutlText variant="heading" style={{ fontSize: 20 }}>Edit Profile</BrutlText>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={BrutlColors.textMuted} />
            </TouchableOpacity>
          </View>

          <View>
            <BrutlText style={styles.fieldLabel}>NAME</BrutlText>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={BrutlColors.textDisabled} placeholder="Your name" />
          </View>

          <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
            <View style={{ flex: 1 }}>
              <BrutlText style={styles.fieldLabel}>WEIGHT (KG)</BrutlText>
              <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholderTextColor={BrutlColors.textDisabled} />
            </View>
            <View style={{ flex: 1 }}>
              <BrutlText style={styles.fieldLabel}>HEIGHT (CM)</BrutlText>
              <TextInput style={styles.input} value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" placeholderTextColor={BrutlColors.textDisabled} />
            </View>
          </View>

          <View>
            <BrutlText style={styles.fieldLabel}>GENDER</BrutlText>
            <View style={styles.optionRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity key={g.value} style={[styles.option, gender === g.value && styles.optionSelected]} onPress={() => setGender(g.value)}>
                  <BrutlText variant="caption">{g.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={styles.fieldLabel}>ACTIVITY LEVEL</BrutlText>
            <View style={styles.optionRow}>
              {ACTIVITY_LEVELS.map((a) => (
                <TouchableOpacity key={a.value} style={[styles.option, activityLevel === a.value && styles.optionSelected]} onPress={() => setActivityLevel(a.value)}>
                  <BrutlText variant="caption">{a.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={styles.fieldLabel}>GOAL</BrutlText>
            <View style={styles.optionRow}>
              {GOALS.map((g) => (
                <TouchableOpacity key={g.value} style={[styles.option, goal === g.value && styles.optionSelected]} onPress={() => setGoal(g.value)}>
                  <BrutlText variant="caption">{g.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={styles.fieldLabel}>WEAKEST AREA</BrutlText>
            <View style={styles.optionRow}>
              {WEAK_AREAS.map((w) => (
                <TouchableOpacity
                  key={w.value}
                  style={[styles.option, weakAreas.includes(w.value) && styles.optionSelected]}
                  onPress={() => setWeakAreas((prev) => prev.includes(w.value) ? prev.filter((x) => x !== w.value) : [...prev, w.value])}
                >
                  <BrutlText variant="caption">{w.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={styles.fieldLabel}>MACRO TARGETS</BrutlText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: BrutlSpacing.sm }}>
              {[
                { key: 'calories', label: 'KCAL',    value: macros.calories },
                { key: 'proteinG', label: 'PROTEIN', value: macros.proteinG },
                { key: 'carbsG',   label: 'CARBS',   value: macros.carbsG },
                { key: 'fatG',     label: 'FAT',     value: macros.fatG },
              ].map((m) => (
                <View key={m.key} style={{ width: '47%' }}>
                  <BrutlText style={[styles.fieldLabel, { marginBottom: 4 }]}>{m.label}</BrutlText>
                  <TextInput
                    style={styles.input}
                    value={String(m.value)}
                    onChangeText={(v) => patchMacro(m.key, v)}
                    keyboardType="number-pad"
                    placeholderTextColor={BrutlColors.textDisabled}
                    selectTextOnFocus
                  />
                </View>
              ))}
            </View>
          </View>

          <BrutlButton label={saving ? 'SAVING…' : 'SAVE CHANGES'} onPress={handleSave} disabled={saving || !name.trim()} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const profile = useUserStore((s) => s.profile);
  const { hasPermission, isAvailable, requestPermissions } = useWatchStore();
  const [requesting, setRequesting] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

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
            await Promise.all(
              Object.values(STORAGE_KEYS).map((k) => storageRemove(k))
            );
            router.replace('/onboarding/cold-open' as any);
          },
        },
      ]
    );
  }

  const healthStatusColor = !isAvailable
    ? BrutlColors.textDisabled
    : hasPermission ? BrutlColors.success : BrutlColors.warning;

  const healthStatusLabel = !isAvailable
    ? 'Not available'
    : hasPermission ? 'Connected' : 'Permission needed';

  return (
    <View style={styles.container}>
      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={BrutlColors.textPrimary} />
        </TouchableOpacity>
        <BrutlText variant="heading" style={{ fontSize: 24 }}>Settings</BrutlText>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        {!!profile && (
          <BrutlCard>
            <BrutlText variant="caption" style={styles.sectionLabel}>PROFILE</BrutlText>
            <SettingsRow
              icon="person-outline"
              label={profile.name}
              sublabel={`${profile.age} yrs · ${profile.weightKg}kg · ${profile.heightCm}cm`}
              onPress={() => setEditVisible(true)}
              right={<BrutlText variant="caption" style={{ color: BrutlColors.accent }}>Edit</BrutlText>}
            />
            <View style={styles.divider} />
            <SettingsRow icon="flag-outline" label="Goal" sublabel={profile.goal.replace('_', ' ')} />
            <View style={styles.divider} />
            <SettingsRow icon="barbell-outline" label="Weak Area" sublabel={(Array.isArray(profile.weakArea) ? profile.weakArea : [profile.weakArea]).map((w) => w.replace(/_/g, ' ')).join(', ')} />
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
                  Grant access to heart rate, HRV, sleep, and steps from Samsung Health or any Health Connect source.
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
          <SettingsRow icon="flame-outline" label="Streak Bonus" sublabel="+250 XP at 7 days · +500 at 30 · +1500 at 90" />
          <View style={styles.divider} />
          <SettingsRow icon="chatbubble-outline" label="Roast Engine" sublabel="NVIDIA Nemotron via OpenRouter" />
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
