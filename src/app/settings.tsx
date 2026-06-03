import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Modal, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlText } from '@/components/ui/BrutlText';
import { Ionicons } from '@expo/vector-icons';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { getCachedKeys, setApiKey, type ApiKeyName } from '@/lib/api-keys';
import { useUserStore } from '@/stores/user.store';
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

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: BrutlSpacing.xl, paddingBottom: BrutlSpacing.xxxl, gap: BrutlSpacing.xl },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.md,
    paddingHorizontal: BrutlSpacing.xl,
    paddingBottom: BrutlSpacing.xs,
  },
  headerTitle: { fontSize: 30, letterSpacing: 2 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: BrutlColors.textDisabled,
    marginBottom: BrutlSpacing.sm,
  },

  // Hero profile card
  heroCard: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.lg,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    overflow: 'hidden',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.md,
    padding: BrutlSpacing.md,
  },
  avatarWrap: { position: 'relative' },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: BrutlColors.accent,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BrutlColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BrutlColors.bgCard,
  },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { fontSize: 22, letterSpacing: 1 },
  heroStats: {
    color: BrutlColors.textMuted,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  goalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 3,
    borderRadius: BrutlRadius.full,
    backgroundColor: BrutlColors.accent + '22',
    borderWidth: 1,
    borderColor: BrutlColors.accent + '55',
    marginTop: 2,
  },
  goalBadgeText: { color: BrutlColors.accent, letterSpacing: 1, fontSize: 10 },

  heroDivider: { height: 1, backgroundColor: BrutlColors.border },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BrutlSpacing.sm,
    paddingVertical: BrutlSpacing.sm + 4,
  },

  // Generic card
  card: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.lg,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.md,
    paddingVertical: 14,
    paddingHorizontal: BrutlSpacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: BrutlRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1C',
  },
  iconBoxAccent: { backgroundColor: BrutlColors.accent + '1A' },
  rowContent: { flex: 1 },
  rowDivider: { height: 1, backgroundColor: BrutlColors.border, marginLeft: 70 },

  // Status pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BrutlRadius.full,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },

  // Service row
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.md,
    paddingVertical: 14,
    paddingHorizontal: BrutlSpacing.md,
  },
  serviceIcon: {
    width: 38, height: 38,
    borderRadius: BrutlRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1C',
  },
  serviceContent: { flex: 1 },
  serviceProvider: { color: BrutlColors.textDisabled, fontSize: 11, letterSpacing: 0.5 },

  // API key row
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.md,
    paddingVertical: 12,
    paddingHorizontal: BrutlSpacing.md,
  },
  keyMasked: {
    fontFamily: BrutlFonts.mono,
    fontSize: 12,
    color: BrutlColors.textMuted,
    letterSpacing: 0.5,
  },
  keyOverride: { color: BrutlColors.warning },
  editKeyBtn: {
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 4,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },

  // Danger
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BrutlSpacing.sm,
    borderWidth: 1,
    borderColor: BrutlColors.accent + '66',
    borderRadius: BrutlRadius.lg,
    padding: BrutlSpacing.md,
    backgroundColor: BrutlColors.accent + '0D',
  },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: BrutlColors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: BrutlColors.borderVisible,
    alignSelf: 'center',
    marginTop: BrutlSpacing.sm + 2,
    marginBottom: BrutlSpacing.sm,
  },
  modalScroll: { paddingHorizontal: BrutlSpacing.xl, paddingTop: BrutlSpacing.sm },
  modalFooter: {
    paddingHorizontal: BrutlSpacing.xl,
    paddingTop: BrutlSpacing.md,
    borderTopWidth: 1,
    borderTopColor: BrutlColors.border,
    backgroundColor: BrutlColors.bgCard,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: BrutlSpacing.md },
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

function Row({
  icon, label, sublabel, onPress, right, accentIcon = false,
}: {
  icon: string; label: string; sublabel?: string;
  onPress?: () => void; right?: React.ReactNode; accentIcon?: boolean;
}) {
  const inner = (
    <View style={st.row}>
      <View style={[st.iconBox, accentIcon && st.iconBoxAccent]}>
        <Ionicons name={icon as any} size={19} color={accentIcon ? BrutlColors.accent : BrutlColors.textMuted} />
      </View>
      <View style={st.rowContent}>
        <BrutlText variant="body">{label}</BrutlText>
        {!!sublabel && <BrutlText variant="caption">{sublabel}</BrutlText>}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={15} color={BrutlColors.textDisabled} style={{ marginRight: 4 }} />)}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.65}>{inner}</TouchableOpacity>;
  return inner;
}

function RowDivider() {
  return <View style={st.rowDivider} />;
}

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const [name, setName] = useState(profile?.name ?? '');
  const [weightKg, setWeightKg] = useState(String(profile?.weightKg ?? ''));
  const [heightCm, setHeightCm] = useState(String(profile?.heightCm ?? ''));
  const [goalWeightKg, setGoalWeightKg] = useState(String(profile?.goalWeightKg ?? ''));
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
    const parsedGoalWeight = parseFloat(goalWeightKg);
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
      goalWeightKg: !isNaN(parsedGoalWeight) && parsedGoalWeight > 0 ? parsedGoalWeight : undefined,
    });
    setSaving(false);
    onClose();
  }

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.modalSheet}>
          <View style={st.modalHandle} />
          <ScrollView style={st.modalScroll} contentContainerStyle={{ gap: BrutlSpacing.md, paddingBottom: BrutlSpacing.md }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.modalHeader}>
            <BrutlText variant="heading" style={{ fontSize: 20 }}>Edit Profile</BrutlText>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={BrutlColors.textMuted} />
            </TouchableOpacity>
          </View>

          <View>
            <BrutlText style={st.fieldLabel}>NAME</BrutlText>
            <TextInput style={st.input} value={name} onChangeText={setName} placeholderTextColor={BrutlColors.textDisabled} placeholder="Your name" />
          </View>

          <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
            <View style={{ flex: 1 }}>
              <BrutlText style={st.fieldLabel}>WEIGHT (KG)</BrutlText>
              <TextInput style={st.input} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholderTextColor={BrutlColors.textDisabled} />
            </View>
            <View style={{ flex: 1 }}>
              <BrutlText style={st.fieldLabel}>HEIGHT (CM)</BrutlText>
              <TextInput style={st.input} value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" placeholderTextColor={BrutlColors.textDisabled} />
            </View>
            <View style={{ flex: 1 }}>
              <BrutlText style={st.fieldLabel}>GOAL WEIGHT (KG)</BrutlText>
              <TextInput style={st.input} value={goalWeightKg} onChangeText={setGoalWeightKg} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={BrutlColors.textDisabled} />
            </View>
          </View>

          <View>
            <BrutlText style={st.fieldLabel}>GENDER</BrutlText>
            <View style={st.optionRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity key={g.value} style={[st.option, gender === g.value && st.optionSelected]} onPress={() => setGender(g.value)}>
                  <BrutlText variant="caption">{g.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={st.fieldLabel}>ACTIVITY LEVEL</BrutlText>
            <View style={st.optionRow}>
              {ACTIVITY_LEVELS.map((a) => (
                <TouchableOpacity key={a.value} style={[st.option, activityLevel === a.value && st.optionSelected]} onPress={() => setActivityLevel(a.value)}>
                  <BrutlText variant="caption">{a.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={st.fieldLabel}>GOAL</BrutlText>
            <View style={st.optionRow}>
              {GOALS.map((g) => (
                <TouchableOpacity key={g.value} style={[st.option, goal === g.value && st.optionSelected]} onPress={() => setGoal(g.value)}>
                  <BrutlText variant="caption">{g.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={st.fieldLabel}>WEAKEST AREA</BrutlText>
            <View style={st.optionRow}>
              {WEAK_AREAS.map((w) => (
                <TouchableOpacity
                  key={w.value}
                  style={[st.option, weakAreas.includes(w.value) && st.optionSelected]}
                  onPress={() => setWeakAreas((prev) => prev.includes(w.value) ? prev.filter((x) => x !== w.value) : [...prev, w.value])}
                >
                  <BrutlText variant="caption">{w.label}</BrutlText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <BrutlText style={st.fieldLabel}>MACRO TARGETS</BrutlText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: BrutlSpacing.sm }}>
              {[
                { key: 'calories', label: 'KCAL',    value: macros.calories },
                { key: 'proteinG', label: 'PROTEIN', value: macros.proteinG },
                { key: 'carbsG',   label: 'CARBS',   value: macros.carbsG },
                { key: 'fatG',     label: 'FAT',     value: macros.fatG },
              ].map((m) => (
                <View key={m.key} style={{ width: '47%' }}>
                  <BrutlText style={[st.fieldLabel, { marginBottom: 4 }]}>{m.label}</BrutlText>
                  <TextInput
                    style={st.input}
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

          </ScrollView>
          <View style={[st.modalFooter, { paddingBottom: insets.bottom + BrutlSpacing.md }]}>
            <BrutlButton label={saving ? 'SAVING…' : 'SAVE CHANGES'} onPress={handleSave} disabled={saving || !name.trim()} loading={saving} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const SERVICES = [
  { icon: 'chatbubble-outline',  name: 'Roast Engine',  provider: 'Owl Alpha · Minila',          sublabel: 'Personalised AI roasts' },
  { icon: 'scan-outline',        name: 'Vision Engine', provider: 'Supabase Edge Functions',      sublabel: 'Photo-based meal recognition' },
  { icon: 'barbell-outline',     name: 'Exercise DB',   provider: 'RapidAPI · ExerciseDB',        sublabel: 'Exercise data & instructions' },
  { icon: 'leaf-outline',        name: 'Diet API',      provider: 'Open Food Facts',              sublabel: 'Food search & barcode lookup' },
];

type EditKeyState = { name: ApiKeyName; label: string; envDefault: string } | null;

function EditKeyModal({
  state, onClose,
}: { state: EditKeyState; onClose: (saved: boolean) => void }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  // sync input when the key changes
  if (state && value === '' && getCachedKeys()[state.name]) {
    setValue(getCachedKeys()[state.name]!);
  }

  async function handleSave() {
    if (!state) return;
    setSaving(true);
    await setApiKey(state.name, value);
    setSaving(false);
    onClose(true);
  }

  async function handleClear() {
    if (!state) return;
    await setApiKey(state.name, '');
    setValue('');
    onClose(true);
  }

  return (
    <Modal visible={!!state} transparent animationType="slide" statusBarTranslucent onRequestClose={() => onClose(false)}>
      <KeyboardAvoidingView style={st.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.modalSheet}>
          <View style={st.modalHandle} />
          <View style={{ paddingHorizontal: BrutlSpacing.xl, paddingTop: BrutlSpacing.sm, paddingBottom: BrutlSpacing.md }}>
            <View style={st.modalHeader}>
              <View style={{ gap: 2 }}>
                <BrutlText variant="heading" style={{ fontSize: 18 }}>API Key</BrutlText>
                <BrutlText variant="caption">{state?.label}</BrutlText>
              </View>
              <TouchableOpacity onPress={() => onClose(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={BrutlColors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[st.input, { fontFamily: BrutlFonts.mono, fontSize: 12, letterSpacing: 0.5 }]}
              value={value}
              onChangeText={setValue}
              placeholder={state?.envDefault ? state.envDefault.slice(0, 12) + '…' : 'Enter key'}
              placeholderTextColor={BrutlColors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              multiline
            />
            <BrutlText variant="caption" style={{ color: BrutlColors.textDisabled, marginTop: BrutlSpacing.sm }}>
              Leave empty to use the default key from the build environment.
            </BrutlText>
          </View>
          <View style={[st.modalFooter, { paddingBottom: insets.bottom + BrutlSpacing.md, flexDirection: 'row', gap: BrutlSpacing.sm }]}>
            <BrutlButton
              label="CLEAR"
              variant="outline"
              onPress={handleClear}
              style={{ flex: 1 }}
            />
            <BrutlButton
              label={saving ? 'SAVING…' : 'SAVE'}
              onPress={handleSave}
              disabled={saving}
              loading={saving}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const profile = useUserStore((s) => s.profile);
  const avatarUri = useUserStore((s) => s.avatarUri);
  const setAvatarUri = useUserStore((s) => s.setAvatarUri);
  const { hasPermission, isAvailable, requestPermissions } = useWatchStore();
  const [requesting, setRequesting] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editKey, setEditKey] = useState<EditKeyState>(null);
  const [keyVersion, setKeyVersion] = useState(0);
  const insets = useSafeAreaInsets();
  const cachedKeys = getCachedKeys();

  async function handleChangePhoto() {
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
  }

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
            await Promise.all(Object.values(STORAGE_KEYS).map((k) => storageRemove(k)));
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
    ? 'NOT AVAILABLE'
    : hasPermission ? 'CONNECTED' : 'NEEDS PERMISSION';

  return (
    <View style={st.container}>
      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />
      <EditKeyModal state={editKey} onClose={(saved) => { if (saved) setKeyVersion((v) => v + 1); setEditKey(null); }} />

      <View style={[st.header, { paddingTop: insets.top - 4 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={BrutlColors.textPrimary} />
        </TouchableOpacity>
        <BrutlText variant="heading" style={st.headerTitle}>Settings</BrutlText>
      </View>

      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* Profile Hero */}
        {!!profile && (
          <View>
            <BrutlText variant="caption" style={st.sectionLabel}>PROFILE</BrutlText>
            <View style={st.heroCard}>
              <View style={st.heroBody}>
                <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.8} style={st.avatarWrap}>
                  <Image
                    source={avatarUri ? { uri: avatarUri } : require('@/assets/images/pfp.jpg')}
                    style={st.heroAvatar}
                    contentFit="cover"
                  />
                  <View style={st.cameraOverlay}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={st.heroInfo}>
                  <BrutlText variant="heading" style={st.heroName}>{profile.name}</BrutlText>
                  <BrutlText variant="caption" style={st.heroStats}>
                    {profile.age} YRS · {profile.weightKg}KG · {profile.heightCm}CM
                  </BrutlText>
                  <View style={st.goalBadge}>
                    <BrutlText style={st.goalBadgeText}>
                      {profile.goal.replace('_', ' ')}
                    </BrutlText>
                  </View>
                </View>
              </View>
              <View style={st.heroDivider} />
              <TouchableOpacity style={st.editBtn} onPress={() => setEditVisible(true)} activeOpacity={0.65}>
                <Ionicons name="create-outline" size={15} color={BrutlColors.accent} />
                <BrutlText variant="caption" style={{ color: BrutlColors.accent, letterSpacing: 1.5 }}>EDIT PROFILE</BrutlText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Health Data */}
        <View>
          <BrutlText variant="caption" style={st.sectionLabel}>HEALTH DATA</BrutlText>
          <View style={st.card}>
            <Row
              icon="heart-outline"
              label="Health Connect"
              sublabel="HR · HRV · Sleep · Steps"
              right={
                <View style={[st.pill, { backgroundColor: healthStatusColor + '1A' }]}>
                  <View style={[st.pillDot, { backgroundColor: healthStatusColor }]} />
                  <BrutlText variant="caption" style={{ color: healthStatusColor, letterSpacing: 0.5 }}>
                    {healthStatusLabel}
                  </BrutlText>
                </View>
              }
            />
            {isAvailable && !hasPermission && (
              <>
                <RowDivider />
                <View style={{ padding: BrutlSpacing.md, paddingTop: BrutlSpacing.sm, gap: BrutlSpacing.sm }}>
                  <BrutlButton
                    label={requesting ? 'REQUESTING…' : 'GRANT ACCESS'}
                    onPress={handleGrantHealthConnect}
                    disabled={requesting}
                    loading={requesting}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Services */}
        <View>
          <BrutlText variant="caption" style={st.sectionLabel}>SERVICES</BrutlText>
          <View style={[st.card, { backgroundColor: BrutlColors.bgCardSubtle }]}>
            {SERVICES.map((svc, i) => (
              <View key={svc.name}>
                {i > 0 && <RowDivider />}
                <View style={st.serviceRow}>
                  <View style={st.serviceIcon}>
                    <Ionicons name={svc.icon as any} size={19} color={BrutlColors.textMuted} />
                  </View>
                  <View style={st.serviceContent}>
                    <BrutlText variant="body">{svc.name}</BrutlText>
                    <BrutlText variant="caption" style={st.serviceProvider}>{svc.provider}</BrutlText>
                    <BrutlText variant="caption" style={{ color: BrutlColors.textMuted, marginTop: 1 }}>{svc.sublabel}</BrutlText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* API Keys */}
        <View>
          <BrutlText variant="caption" style={st.sectionLabel}>API KEYS</BrutlText>
          <View style={st.card}>
            {([
              {
                name: 'RAPID_API_KEY' as ApiKeyName,
                label: 'RapidAPI — Exercise DB',
                icon: 'key-outline',
                envDefault: process.env.EXPO_PUBLIC_RAPID_API_KEY ?? '',
              },
              {
                name: 'USDA_API_KEY' as ApiKeyName,
                label: 'USDA — Food Database',
                icon: 'leaf-outline',
                envDefault: process.env.EXPO_PUBLIC_USDA_API_KEY ?? '',
              },
              {
                name: 'SUPABASE_ANON_KEY' as ApiKeyName,
                label: 'Supabase — AI Engines',
                icon: 'server-outline',
                envDefault: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
              },
            ] as const).map((item, i) => {
              const override = cachedKeys[item.name];
              const display = override ?? item.envDefault;
              const masked = display ? display.slice(0, 10) + '••••••••' : '(not set)';
              return (
                <View key={item.name}>
                  {i > 0 && <RowDivider />}
                  <View style={st.keyRow}>
                    <View style={st.iconBox}>
                      <Ionicons name={item.icon as any} size={19} color={BrutlColors.textMuted} />
                    </View>
                    <View style={st.rowContent}>
                      <BrutlText variant="body" style={{ fontSize: 13 }}>{item.label}</BrutlText>
                      <BrutlText style={[st.keyMasked, override && st.keyOverride]}>
                        {masked}{override ? '  ·  custom' : ''}
                      </BrutlText>
                    </View>
                    <TouchableOpacity
                      style={st.editKeyBtn}
                      onPress={() => setEditKey({ name: item.name, label: item.label, envDefault: item.envDefault })}
                      hitSlop={8}
                    >
                      <BrutlText variant="caption" style={{ color: BrutlColors.accent, letterSpacing: 1 }}>EDIT</BrutlText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* App */}
        <View>
          <BrutlText variant="caption" style={st.sectionLabel}>APP</BrutlText>
          <View style={[st.card, { backgroundColor: BrutlColors.bgCardSubtle }]}>
            <Row icon="medal-outline" label="Rank System" sublabel="E · D · C · B · A · S" />
            <RowDivider />
            <Row icon="time-outline" label="Streak Bonus" sublabel="7d · 30d · 90d" />
          </View>
        </View>

        {/* Danger Zone */}
        <View>
          <BrutlText variant="caption" style={st.sectionLabel}>DANGER ZONE</BrutlText>
          <TouchableOpacity style={st.dangerBtn} onPress={handleResetOnboarding} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color={BrutlColors.accent} />
            <BrutlText variant="caption" style={{ color: BrutlColors.accent, letterSpacing: 2 }}>RESET APP DATA</BrutlText>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
