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
import type { Goal, WeakArea } from '@/types';

const REACTIONS: Record<string, string> = {
  name: 'Name noted. Own it.',
  age: 'Age is just a number. Effort is everything.',
  weightKg: 'Noted. Let\'s fix that.',
  heightCm: 'Good. Now we have a baseline.',
  goal: 'That\'s the target. No excuses now.',
  weakArea: 'Your weakest link. We\'re going straight at it.',
};

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
  ctaArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: BrutlSpacing.xl, backgroundColor: BrutlColors.bg },
});

export default function IntakeScreen() {
  const setProfile = useUserStore((s) => s.setProfile);
  const [form, setForm] = useState({ name: '', age: '', weightKg: '', heightCm: '' });
  const [goal, setGoal] = useState<Goal | null>(null);
  const [weakArea, setWeakArea] = useState<WeakArea | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});

  function handleBlur(field: string) {
    const val = form[field as keyof typeof form];
    if (val.trim()) {
      setReactions((r) => ({ ...r, [field]: REACTIONS[field] }));
    }
  }

  function isValid() {
    return form.name && form.age && form.weightKg && form.heightCm && goal && weakArea;
  }

  async function handleContinue() {
    if (!isValid()) return;
    const profile = buildUserProfile({
      name: form.name.trim(),
      age: parseInt(form.age),
      weightKg: parseFloat(form.weightKg),
      heightCm: parseInt(form.heightCm),
      goal: goal!,
      weakArea: weakArea!,
    });
    await setProfile(profile);
    router.push('/onboarding/first-roast');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                style={[styles.option, weakArea === w.value && styles.optionSelected]}
                onPress={() => { setWeakArea(w.value); setReactions((r) => ({ ...r, weakArea: REACTIONS.weakArea })); }}
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
