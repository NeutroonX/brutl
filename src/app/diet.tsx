import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BrutlCard } from '@/components/ui/BrutlCard';
import { BrutlText } from '@/components/ui/BrutlText';
import { BarcodeScanModal, type ScannedFood } from '@/components/BarcodeScanModal';
import { PhotoScanModal } from '@/components/PhotoScanModal';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import { calcMacroCompliance } from '@/lib/xp';
import { useDietStore } from '@/stores/diet.store';
import { useUserStore } from '@/stores/user.store';
import type { MealEntry } from '@/types';

interface FoodResult {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
}

async function searchOpenFoodFacts(query: string): Promise<FoodResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments)
      .slice(0, 8)
      .map((p: any) => ({
        name: p.product_name || 'Unknown',
        calories: Math.round(p.nutriments['energy-kcal_100g'] ?? p.nutriments['energy-kcal'] ?? 0),
        proteinG: parseFloat((p.nutriments['proteins_100g'] ?? 0).toFixed(1)),
        carbsG: parseFloat((p.nutriments['carbohydrates_100g'] ?? 0).toFixed(1)),
        fatG: parseFloat((p.nutriments['fat_100g'] ?? 0).toFixed(1)),
        servingG: 100,
      }));
  } catch {
    return [];
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: BrutlSpacing.xxxl },
  sectionLabel: { color: BrutlColors.accent, marginBottom: BrutlSpacing.sm },
  searchRow: { flexDirection: 'row', gap: BrutlSpacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 15,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
  },
  scanBtn: {
    width: 38, height: 38, borderRadius: BrutlRadius.sm,
    backgroundColor: BrutlColors.bgCard, borderWidth: 1,
    borderColor: BrutlColors.borderVisible, alignItems: 'center', justifyContent: 'center',
  },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: BrutlSpacing.sm },
  macroRow: { flexDirection: 'row', gap: BrutlSpacing.md },
  macroBox: { alignItems: 'center', flex: 1 },
  macroValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: BrutlColors.textPrimary },
  todayMealItem: { gap: BrutlSpacing.xs, paddingVertical: BrutlSpacing.sm },
  divider: { height: 1, backgroundColor: BrutlColors.border, marginVertical: BrutlSpacing.xs },
});

export default function DietScreen() {
  const profile = useUserStore((s) => s.profile);
  const addMeal = useDietStore((s) => s.addMeal);
  const todayLog = useDietStore((s) => s.todayLog);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchOpenFoodFacts(query);
      setResults(r);
      setSearching(false);
    }, 500);
  }, [query]);

  async function handleScannedFood(food: ScannedFood) {
    setShowBarcode(false);
    setShowPhoto(false);
    await handleAdd(food);
  }

  async function handleAdd(food: FoodResult) {
    if (!profile) return;
    const meal: MealEntry = { ...food };
    await addMeal(meal);
    setQuery('');
    setResults([]);

    // Check macro compliance after adding
    const target = profile.macroTargets.proteinG;
    const current = (todayLog?.totalProteinG ?? 0) + food.proteinG;
    const compliance = calcMacroCompliance(current, target);
    if (compliance < 0.85) {
      streamRoast(buildRoastPayload('OFF_PLAN', profile.rank, profile.streakDays, null, null, compliance));
    }
  }

  const targets = profile?.macroTargets;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BarcodeScanModal visible={showBarcode} onResult={handleScannedFood} onClose={() => setShowBarcode(false)} />
      <PhotoScanModal visible={showPhoto} onResult={handleScannedFood} onClose={() => setShowPhoto(false)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrutlText variant="heading">Diet Log</BrutlText>
          <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => setShowBarcode(true)}
              hitSlop={8}
            >
              <Ionicons name="barcode-outline" size={20} color={BrutlColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => setShowPhoto(true)}
              hitSlop={8}
            >
              <Ionicons name="camera-outline" size={20} color={BrutlColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Macros Summary */}
        {targets && (
          <BrutlCard>
            <BrutlText variant="caption" style={styles.sectionLabel}>TODAY'S MACROS</BrutlText>
            <View style={styles.macroRow}>
              {[
                { label: 'KCAL', val: todayLog?.totalCalories ?? 0, target: targets.calories },
                { label: 'PROTEIN', val: Math.round(todayLog?.totalProteinG ?? 0), target: targets.proteinG },
                { label: 'CARBS', val: Math.round(todayLog?.totalCarbsG ?? 0), target: targets.carbsG },
                { label: 'FAT', val: Math.round(todayLog?.totalFatG ?? 0), target: targets.fatG },
              ].map((m) => (
                <View key={m.label} style={styles.macroBox}>
                  <BrutlText style={styles.macroValue}>{m.val}</BrutlText>
                  <BrutlText variant="caption">/ {m.target}</BrutlText>
                  <BrutlText variant="caption" style={{ color: BrutlColors.textMuted }}>{m.label}</BrutlText>
                </View>
              ))}
            </View>
          </BrutlCard>
        )}

        {/* Search */}
        <View>
          <BrutlText variant="caption" style={styles.sectionLabel}>SEARCH FOOD</BrutlText>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="chicken breast, oats, rice..."
              placeholderTextColor={BrutlColors.textDisabled}
            />
            {searching && <ActivityIndicator color={BrutlColors.accent} />}
          </View>
        </View>

        {/* Search Results */}
        {results.length > 0 && (
          <BrutlCard>
            {results.map((r, idx) => (
              <View key={idx}>
                <TouchableOpacity style={styles.resultItem} onPress={() => handleAdd(r)}>
                  <View style={{ flex: 1 }}>
                    <BrutlText variant="body">{r.name}</BrutlText>
                    <BrutlText variant="caption">
                      {r.calories} kcal · P: {r.proteinG}g · C: {r.carbsG}g · F: {r.fatG}g
                    </BrutlText>
                  </View>
                  <BrutlText variant="accent">+ ADD</BrutlText>
                </TouchableOpacity>
                {idx < results.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </BrutlCard>
        )}

        {/* Today's Meals */}
        {todayLog && todayLog.meals.length > 0 && (
          <View>
            <BrutlText variant="caption" style={styles.sectionLabel}>LOGGED TODAY</BrutlText>
            <BrutlCard>
              {todayLog.meals.map((m, idx) => (
                <View key={idx}>
                  <View style={styles.todayMealItem}>
                    <BrutlText variant="body">{m.name}</BrutlText>
                    <BrutlText variant="caption">
                      {m.calories} kcal · P: {m.proteinG}g · C: {m.carbsG}g · F: {m.fatG}g
                    </BrutlText>
                  </View>
                  {idx < todayLog.meals.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </BrutlCard>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
