import { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform,
  StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';

import { BrutlButton } from './ui/BrutlButton';
import { BrutlText } from './ui/BrutlText';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import type { ScannedFood } from './BarcodeScanModal';

interface Props {
  food: ScannedFood | null;
  onConfirm: (food: ScannedFood) => void;
  onCancel: () => void;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: BrutlSpacing.xl,
    gap: BrutlSpacing.lg,
    paddingBottom: BrutlSpacing.xxxl,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: BrutlColors.borderVisible,
    alignSelf: 'center', marginBottom: BrutlSpacing.sm,
  },
  header: { gap: BrutlSpacing.xs },
  macroRow: { flexDirection: 'row', gap: BrutlSpacing.sm },
  macroBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: BrutlColors.bg,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    paddingVertical: BrutlSpacing.sm,
    gap: 2,
  },
  macroVal: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22, color: BrutlColors.textPrimary,
  },
  servingRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: BrutlSpacing.md,
  },
  servingInput: {
    flex: 1,
    backgroundColor: BrutlColors.bg,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 16,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
    textAlign: 'center',
  },
  stepBtn: {
    width: 40, height: 40, borderRadius: BrutlRadius.sm,
    backgroundColor: BrutlColors.bg,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    alignItems: 'center', justifyContent: 'center',
  },
  btnRow: { flexDirection: 'row', gap: BrutlSpacing.sm },
});

function scale(base: number, serving: number, defaultServing: number): number {
  if (defaultServing === 0) return base;
  return parseFloat(((base / defaultServing) * serving).toFixed(1));
}

export function ScanConfirmSheet({ food, onConfirm, onCancel }: Props) {
  const [servingG, setServingG] = useState(String(food?.servingG ?? 100));

  if (!food) return null;

  const serving = Math.max(1, parseFloat(servingG) || food.servingG);
  const base = food.servingG;

  const scaled = {
    calories: Math.round(scale(food.calories, serving, base)),
    proteinG: scale(food.proteinG, serving, base),
    carbsG: scale(food.carbsG, serving, base),
    fatG: scale(food.fatG, serving, base),
  };

  function step(delta: number) {
    const next = Math.max(5, (parseFloat(servingG) || base) + delta);
    setServingG(String(Math.round(next)));
  }

  function handleConfirm() {
    if (!food) return;
    onConfirm({ name: food.name, ...scaled, servingG: serving });
  }

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <BrutlText variant="heading" style={{ fontSize: 20 }} numberOfLines={2}>
              {food.name}
            </BrutlText>
            <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>
              Confirm serving size and macros before adding
            </BrutlText>
          </View>

          {/* Serving adjuster */}
          <View style={styles.servingRow}>
            <BrutlText variant="caption" style={{ color: BrutlColors.textMuted, width: 52 }}>SERVING</BrutlText>
            <TouchableOpacity style={styles.stepBtn} onPress={() => step(-10)}>
              <BrutlText variant="body" style={{ color: BrutlColors.accent, fontSize: 20 }}>−</BrutlText>
            </TouchableOpacity>
            <TextInput
              style={styles.servingInput}
              value={servingG}
              onChangeText={setServingG}
              keyboardType="number-pad"
              placeholderTextColor={BrutlColors.textDisabled}
            />
            <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>g</BrutlText>
            <TouchableOpacity style={styles.stepBtn} onPress={() => step(10)}>
              <BrutlText variant="body" style={{ color: BrutlColors.accent, fontSize: 20 }}>+</BrutlText>
            </TouchableOpacity>
          </View>

          {/* Macros */}
          <View style={styles.macroRow}>
            {[
              { label: 'KCAL',    val: scaled.calories,  unit: '' },
              { label: 'PROTEIN', val: scaled.proteinG,  unit: 'g' },
              { label: 'CARBS',   val: scaled.carbsG,    unit: 'g' },
              { label: 'FAT',     val: scaled.fatG,      unit: 'g' },
            ].map((m) => (
              <View key={m.label} style={styles.macroBox}>
                <BrutlText style={styles.macroVal}>{m.val}{m.unit}</BrutlText>
                <BrutlText variant="caption" style={{ color: BrutlColors.textMuted, fontSize: 10 }}>{m.label}</BrutlText>
              </View>
            ))}
          </View>

          <View style={styles.btnRow}>
            <BrutlButton label="CANCEL" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
            <BrutlButton label="ADD TO LOG" onPress={handleConfirm} style={{ flex: 2 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
