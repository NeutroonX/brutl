import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrutlButton } from '@/components/ui/BrutlButton';
import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { buildUserProfile, useUserStore } from '@/stores/user.store';
import type { ActivityLevel, Gender, Goal, WeakArea } from '@/types';

const REACTIONS: Record<string, string> = {
  name: 'Name noted. Own it.',
  age: 'Age is just a number. Effort is everything.',
  weightKg: 'Noted. Let\'s fix that.',
  heightCm: 'Good. Now we have a baseline.',
  goal: 'That\'s the target. No excuses now.',
  weakArea: 'Your weakest link. We\'re going straight at it.',
};

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; sub: string }[] = [
  { value: 'SEDENTARY', label: 'Sedentary', sub: 'Desk job, no exercise' },
  { value: 'LIGHT', label: 'Light', sub: '1–3 days/week' },
  { value: 'MODERATE', label: 'Moderate', sub: '3–5 days/week' },
  { value: 'ACTIVE', label: 'Active', sub: '6–7 days/week' },
  { value: 'VERY_ACTIVE', label: 'Very Active', sub: 'Athlete / physical job' },
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
  { value: 'SLEEP', label: 'Sleep' },
  { value: 'MENTAL', label: 'Mental' },
  { value: 'CONSISTENCY', label: 'Consistency' },
  { value: 'FLEXIBILITY', label: 'Flexibility' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 120 },
  heading: { gap: BrutlSpacing.xs },
  field: { gap: BrutlSpacing.sm },
  label: { letterSpacing: 1 },
  input: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 16,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
  },
  reaction: {
    color: BrutlColors.accent,
    fontSize: 12,
    fontStyle: 'italic',
  },
  optionRow: { flexDirection: 'row', gap: BrutlSpacing.sm, flexWrap: 'wrap' },
  option: {
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },
  optionSelected: { backgroundColor: BrutlColors.accent, borderColor: BrutlColors.accent },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: BrutlSpacing.sm },
  activityCard: {
    width: '47.5%',
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm + 2,
    gap: 3,
  },
  activityCardSelected: {
    borderColor: BrutlColors.accent,
    backgroundColor: `${BrutlColors.accent}10`,
  },
  activityName: { fontSize: 14, color: BrutlColors.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },
  activitySub: { fontSize: 11, color: BrutlColors.textDisabled, lineHeight: 15 },
  ctaArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: BrutlSpacing.xl, backgroundColor: BrutlColors.bg },
});

export default function IntakeScreen() {
  const setProfile = useUserStore((s) => s.setProfile);
  const [form, setForm] = useState({ name: '', age: '', weightKg: '', heightCm: '' });
  const [gender, setGender] = useState<Gender | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [reactions, setReactions] = useState<Record<string, string>>({});

  function handleBlur(field: string) {
    const val = form[field as keyof typeof form];
    if (val.trim()) {
      setReactions((r) => ({ ...r, [field]: REACTIONS[field] }));
    }
  }

  function toggleWeakArea(w: WeakArea) {
    setWeakAreas((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    );
    setReactions((r) => ({ ...r, weakArea: REACTIONS.weakArea }));
  }

  function isValid() {
    return form.name && form.age && form.weightKg && form.heightCm && gender && activityLevel && goal && weakAreas.length > 0;
  }

  async function handleContinue() {
    if (!isValid()) return;
    const profile = buildUserProfile({
      name: form.name.trim(),
      age: parseInt(form.age),
      weightKg: parseFloat(form.weightKg),
      heightCm: parseInt(form.heightCm),
      gender: gender!,
      activityLevel: activityLevel!,
      goal: goal!,
      weakArea: weakAreas,
    });
    await setProfile(profile);
    router.push('/onboarding/macro-review' as any);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <BrutlText variant="heading">The Stats.</BrutlText>
          <BrutlText variant="muted">Fast. Brutal. No fluff.</BrutlText>
        </View>

        {(['name', 'age', 'weightKg', 'heightCm'] as const).map((field) => (
          <View key={field} style={styles.field}>
            <BrutlText variant="caption" style={styles.label}>
              {fieldLabel(field)}
            </BrutlText>
            <TextInput
              style={styles.input}
              value={form[field]}
              onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
              onBlur={() => handleBlur(field)}
              keyboardType={field === 'name' ? 'default' : 'decimal-pad'}
              placeholderTextColor={BrutlColors.textDisabled}
              placeholder={fieldPlaceholder(field)}
            />
            {!!reactions[field] && <BrutlText style={styles.reaction}>{reactions[field]}</BrutlText>}
          </View>
        ))}

        <View style={styles.field}>
          <BrutlText variant="caption" style={styles.label}>GENDER</BrutlText>
          <View style={styles.optionRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.option, gender === g.value && styles.optionSelected]}
                onPress={() => { setGender(g.value); setReactions((r) => ({ ...r, gender: 'Noted.' })); }}
              >
                <BrutlText variant="body">{g.label}</BrutlText>
              </TouchableOpacity>
            ))}
          </View>
          {!!reactions.gender && <BrutlText style={styles.reaction}>{reactions.gender}</BrutlText>}
        </View>

        <View style={styles.field}>
          <BrutlText variant="caption" style={styles.label}>ACTIVITY LEVEL</BrutlText>
          <View style={styles.activityGrid}>
            {ACTIVITY_LEVELS.map((a) => {
              const selected = activityLevel === a.value;
              return (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.activityCard, selected && styles.activityCardSelected]}
                  onPress={() => { setActivityLevel(a.value); setReactions((r) => ({ ...r, activity: 'Multiplier locked.' })); }}
                  activeOpacity={0.75}
                >
                  <BrutlText style={[styles.activityName, selected && { color: BrutlColors.accent }]}>{a.label}</BrutlText>
                  <BrutlText style={styles.activitySub}>{a.sub}</BrutlText>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!reactions.activity && <BrutlText style={styles.reaction}>{reactions.activity}</BrutlText>}
        </View>

        <View style={styles.field}>
          <BrutlText variant="caption" style={styles.label}>GOAL</BrutlText>
          <View style={styles.optionRow}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.option, goal === g.value && styles.optionSelected]}
                onPress={() => { setGoal(g.value); setReactions((r) => ({ ...r, goal: REACTIONS.goal })); }}
              >
                <BrutlText variant="body">{g.label}</BrutlText>
              </TouchableOpacity>
            ))}
          </View>
          {!!reactions.goal && <BrutlText style={styles.reaction}>{reactions.goal}</BrutlText>}
        </View>

        <View style={styles.field}>
          <BrutlText variant="caption" style={styles.label}>WEAKEST AREA</BrutlText>
          <View style={styles.optionRow}>
            {WEAK_AREAS.map((w) => (
              <TouchableOpacity
                key={w.value}
                style={[styles.option, weakAreas.includes(w.value) && styles.optionSelected]}
                onPress={() => toggleWeakArea(w.value)}
              >
                <BrutlText variant="body">{w.label}</BrutlText>
              </TouchableOpacity>
            ))}
          </View>
          {!!reactions.weakArea && <BrutlText style={styles.reaction}>{reactions.weakArea}</BrutlText>}
        </View>
      </ScrollView>

      <View style={styles.ctaArea}>
        <BrutlButton label="THAT'S ME" onPress={handleContinue} disabled={!isValid()} />
      </View>
    </KeyboardAvoidingView>
  );
}

function fieldLabel(f: string): string {
  return { name: 'NAME', age: 'AGE', weightKg: 'WEIGHT (KG)', heightCm: 'HEIGHT (CM)' }[f] ?? f.toUpperCase();
}

function fieldPlaceholder(f: string): string {
  return { name: 'Your name', age: '25', weightKg: '80', heightCm: '175' }[f] ?? '';
}
