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
import { ScanConfirmSheet } from '@/components/ScanConfirmSheet';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { buildRoastPayload, streamRoast } from '@/lib/roast-engine';
import { calcMacroCompliance } from '@/lib/xp';
import { useDietStore } from '@/stores/diet.store';
import { useUserStore } from '@/stores/user.store';
import type { MealEntry } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 70;
const RING_STROKE = 5;
const RING_HALF = RING_SIZE / 2;

const MACRO_COLORS = {
  kcal:    BrutlColors.textPrimary,
  protein: BrutlColors.accent,
  carbs:   '#E2C44A',
  fat:     '#888888',
} as const;

const DEFAULT_QUICK_FOODS: MealEntry[] = [
  { name: 'Oats',           calories: 68,  proteinG: 2.4,  carbsG: 12.0, fatG: 1.4, servingG: 100 },
  { name: 'Eggs (2 whole)', calories: 140, proteinG: 12.0, carbsG: 0.8,  fatG: 9.8, servingG: 100 },
  { name: 'Rajma',          calories: 127, proteinG: 8.7,  carbsG: 22.8, fatG: 0.5, servingG: 100 },
  { name: 'Chana Dal',      calories: 164, proteinG: 8.9,  carbsG: 27.0, fatG: 2.6, servingG: 100 },
  { name: 'Brown Rice',     calories: 130, proteinG: 2.7,  carbsG: 27.5, fatG: 1.0, servingG: 100 },
  { name: 'Protein Powder', calories: 120, proteinG: 24.0, carbsG: 3.0,  fatG: 1.5, servingG: 30  },
];

type MealGroupKey = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'LATE NIGHT';
const GROUP_ORDER: MealGroupKey[] = ['MORNING', 'AFTERNOON', 'EVENING', 'LATE NIGHT'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GEMINI_KEY = 'REDACTED_GEMINI_KEY';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`;

async function searchFoodWithGemini(query: string): Promise<MealEntry[]> {
  try {
    const prompt = `For the food query "${query}", return a JSON array of up to 8 matching foods with accurate nutritional data per 100g serving. Include common variations (raw, cooked, different preparations). For Indian dishes use standard recipes.

Return ONLY a valid JSON array, no markdown, no explanation:
[{"name":"specific food name","calories":number,"proteinG":number,"carbsG":number,"fatG":number,"servingG":100}]`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.1 },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]) as MealEntry[];
  } catch {
    return [];
  }
}

function getMealGroup(loggedAt?: number): MealGroupKey {
  if (!loggedAt) return 'MORNING';
  const h = new Date(loggedAt).getHours();
  if (h >= 5 && h < 12) return 'MORNING';
  if (h >= 12 && h < 17) return 'AFTERNOON';
  if (h >= 17 && h < 22) return 'EVENING';
  return 'LATE NIGHT';
}

function getFrequentFoods(logs: ReturnType<typeof useDietStore.getState>['logs']): MealEntry[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = logs.filter((l) => l.date >= cutoff).flatMap((l) => l.meals);
  const freq = new Map<string, { food: MealEntry; count: number }>();
  for (const m of recent) {
    const key = m.name.toLowerCase();
    if (freq.has(key)) freq.get(key)!.count++;
    else freq.set(key, { food: m, count: 1 });
  }
  return [...freq.values()].sort((a, b) => b.count - a.count).slice(0, 6).map((v) => v.food);
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({
  value, target, unit, label, color,
}: {
  value: number; target: number; unit: string; label: string; color: string;
}) {
  const pct = Math.min(1, Math.max(0, target > 0 ? value / target : 0));
  const angle = pct * 360;
  const overTarget = pct >= 1;
  const ringColor = overTarget ? BrutlColors.success : color;

  const rightDeg = Math.min(angle, 180) - 180;
  const leftDeg = Math.max(angle - 180, 0) - 180;
  const leftVisible = angle > 180;

  return (
    <View style={rs.col}>
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        {/* Track */}
        <View style={[rs.circle, { borderColor: BrutlColors.border }]} />

        {/* Right half */}
        <View style={rs.clipRight}>
          <View style={[rs.circle, {
            position: 'absolute', left: -RING_HALF,
            borderColor: ringColor,
            transform: [{ rotate: `${rightDeg}deg` }],
          }]} />
        </View>

        {/* Left half */}
        <View style={rs.clipLeft}>
          <View style={[rs.circle, {
            position: 'absolute', left: 0,
            borderColor: leftVisible ? ringColor : 'transparent',
            transform: [{ rotate: `${leftDeg}deg` }],
          }]} />
        </View>

        {/* Center */}
        <View style={rs.center}>
          <BrutlText style={[rs.val, { color: overTarget ? BrutlColors.success : BrutlColors.textPrimary }]}>
            {Math.round(value)}
          </BrutlText>
          <BrutlText style={rs.tgt}>/{target}{unit}</BrutlText>
        </View>
      </View>

      <BrutlText style={[rs.lbl, {
        color: pct > 0 ? (overTarget ? BrutlColors.success : color) : BrutlColors.textDisabled,
      }]}>
        {label}
      </BrutlText>
    </View>
  );
}

const rs = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 7 },
  circle: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_HALF, borderWidth: RING_STROKE,
  },
  clipRight: {
    position: 'absolute', left: RING_HALF,
    width: RING_HALF, height: RING_SIZE, overflow: 'hidden',
  },
  clipLeft: {
    position: 'absolute', left: 0,
    width: RING_HALF, height: RING_SIZE, overflow: 'hidden',
  },
  center: {
    position: 'absolute',
    top: RING_STROKE + 2, left: RING_STROKE + 2,
    right: RING_STROKE + 2, bottom: RING_STROKE + 2,
    alignItems: 'center', justifyContent: 'center',
  },
  val: { fontFamily: 'BebasNeue_400Regular', fontSize: 16, lineHeight: 18 },
  tgt: { fontSize: 8, color: BrutlColors.textMuted, lineHeight: 10 },
  lbl: { fontSize: 9, letterSpacing: 1.2 },
});

// ─── Quick Add Tile ───────────────────────────────────────────────────────────

function QuickTile({ food, onPress }: { food: MealEntry; onPress: () => void }) {
  return (
    <TouchableOpacity style={qt.tile} onPress={onPress} activeOpacity={0.7}>
      <BrutlText style={qt.name} numberOfLines={1}>{food.name}</BrutlText>
      <BrutlText style={qt.macros}>{food.proteinG}g P · {food.calories} kcal</BrutlText>
    </TouchableOpacity>
  );
}

const qt = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 10,
    gap: 3,
  },
  name: { fontSize: 12, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.body },
  macros: { fontSize: 10, color: BrutlColors.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DietScreen() {
  const profile = useUserStore((s) => s.profile);
  const { addMeal, removeMeal, todayLog, logs } = useDietStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MealEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [pendingScan, setPendingScan] = useState<ScannedFood | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchFoodWithGemini(query);
      setResults(r);
      setSearching(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleScannedFood(food: ScannedFood) {
    setShowBarcode(false);
    setShowPhoto(false);
    setPendingScan(food);
  }

  async function handleAdd(food: MealEntry) {
    if (!profile) return;
    await addMeal(food);
    setQuery('');
    setResults([]);
    const target = profile.macroTargets.proteinG;
    const current = (todayLog?.totalProteinG ?? 0) + food.proteinG;
    const compliance = calcMacroCompliance(current, target);
    if (compliance < 0.85) {
      streamRoast(buildRoastPayload('OFF_PLAN', profile.rank, profile.streakDays, null, null, compliance));
    }
  }

  async function handleConfirmScan(food: ScannedFood) {
    setPendingScan(null);
    await handleAdd(food);
  }

  const targets = profile?.macroTargets;
  const meals = todayLog?.meals ?? [];
  const hasMeals = meals.length > 0;

  const mealGroups = meals.reduce<Record<MealGroupKey, { meal: MealEntry; index: number }[]>>(
    (acc, meal, index) => {
      const g = getMealGroup(meal.loggedAt);
      (acc[g] = acc[g] ?? []).push({ meal, index });
      return acc;
    },
    {} as Record<MealGroupKey, { meal: MealEntry; index: number }[]>
  );

  const frequent = getFrequentFoods(logs);
  const quickFoods = frequent.length >= 4 ? frequent.slice(0, 6) : DEFAULT_QUICK_FOODS;
  const showQuick = !query.trim();

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BarcodeScanModal visible={showBarcode} onResult={handleScannedFood} onClose={() => setShowBarcode(false)} />
      <PhotoScanModal visible={showPhoto} onResult={handleScannedFood} onClose={() => setShowPhoto(false)} />
      <ScanConfirmSheet food={pendingScan} onConfirm={handleConfirmScan} onCancel={() => setPendingScan(null)} />

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={st.header}>
          <BrutlText style={st.title}>DIET LOG</BrutlText>
          <View style={st.headerIcons}>
            <TouchableOpacity style={st.iconBtn} onPress={() => setShowBarcode(true)} hitSlop={8}>
              <Ionicons name="barcode-outline" size={22} color={BrutlColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={st.iconBtn} onPress={() => setShowPhoto(true)} hitSlop={8}>
              <Ionicons name="camera-outline" size={22} color={BrutlColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Macro Rings */}
        {targets && (
          <BrutlCard>
            <View style={st.ringsRow}>
              <ProgressRing
                value={todayLog?.totalCalories ?? 0}
                target={targets.calories}
                unit="" label="KCAL"
                color={MACRO_COLORS.kcal}
              />
              <ProgressRing
                value={Math.round(todayLog?.totalProteinG ?? 0)}
                target={targets.proteinG}
                unit="g" label="PROTEIN"
                color={MACRO_COLORS.protein}
              />
              <ProgressRing
                value={Math.round(todayLog?.totalCarbsG ?? 0)}
                target={targets.carbsG}
                unit="g" label="CARBS"
                color={MACRO_COLORS.carbs}
              />
              <ProgressRing
                value={Math.round(todayLog?.totalFatG ?? 0)}
                target={targets.fatG}
                unit="g" label="FAT"
                color={MACRO_COLORS.fat}
              />
            </View>
          </BrutlCard>
        )}

        {/* Search */}
        <View style={st.section}>
          <BrutlText style={st.sectionLabel}>SEARCH FOOD</BrutlText>

          <View style={st.searchRow}>
            <TextInput
              style={st.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Search any food with AI..."
              placeholderTextColor={BrutlColors.textDisabled}
              returnKeyType="search"
            />
            {searching
              ? <ActivityIndicator color={BrutlColors.accent} size="small" style={{ marginRight: 4 }} />
              : <Ionicons name="search-outline" size={18} color={BrutlColors.textDisabled} style={{ marginRight: 4 }} />
            }
          </View>

          {/* Quick add tiles — 3 per row, 2 rows */}
          {showQuick && (
            <View style={st.tilesOuter}>
              {[0, 1].map((row) => (
                <View key={row} style={st.tilesRow}>
                  {quickFoods.slice(row * 3, row * 3 + 3).map((food, idx) => (
                    <QuickTile key={idx} food={food} onPress={() => setPendingScan(food)} />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Search results */}
          {!showQuick && results.length > 0 && (
            <BrutlCard>
              {results.map((r, idx) => (
                <View key={idx}>
                  <TouchableOpacity style={st.resultRow} onPress={() => handleAdd(r)}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <BrutlText style={st.resultName} numberOfLines={1}>{r.name}</BrutlText>
                      <BrutlText style={st.resultMacros}>
                        {r.calories} kcal · P {r.proteinG}g · C {r.carbsG}g · F {r.fatG}g
                      </BrutlText>
                    </View>
                    <View style={st.addChip}>
                      <Ionicons name="add" size={14} color={BrutlColors.accent} />
                      <BrutlText style={st.addChipText}>ADD</BrutlText>
                    </View>
                  </TouchableOpacity>
                  {idx < results.length - 1 && <View style={st.divider} />}
                </View>
              ))}
            </BrutlCard>
          )}

          {/* No results */}
          {!showQuick && !searching && query.trim().length >= 2 && results.length === 0 && (
            <BrutlText style={st.noResults}>
              No results. Try a different name or scan the barcode.
            </BrutlText>
          )}
        </View>

        {/* Empty state */}
        {!hasMeals && (
          <BrutlCard>
            <BrutlText style={st.emptyText}>
              0 meals logged. The day is already wasted if you haven't eaten by now.
            </BrutlText>
            <TouchableOpacity style={st.emptyCta}>
              <BrutlText style={st.emptyCtaText}>Log first meal →</BrutlText>
            </TouchableOpacity>
          </BrutlCard>
        )}

        {/* Logged meals grouped by time */}
        {hasMeals && (
          <View style={st.section}>
            <BrutlText style={st.sectionLabel}>LOGGED TODAY</BrutlText>
            {GROUP_ORDER.filter((g) => (mealGroups[g]?.length ?? 0) > 0).map((group) => (
              <View key={group} style={st.mealGroup}>
                <BrutlText style={st.groupLabel}>{group}</BrutlText>
                <BrutlCard>
                  {mealGroups[group].map(({ meal, index }, i) => (
                    <View key={index}>
                      <View style={st.mealRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <BrutlText style={st.mealName} numberOfLines={1}>{meal.name}</BrutlText>
                          <BrutlText style={st.mealMacros}>
                            {meal.calories} kcal · P {meal.proteinG}g · C {meal.carbsG}g · F {meal.fatG}g
                          </BrutlText>
                        </View>
                        <TouchableOpacity onPress={() => removeMeal(index)} hitSlop={10} style={st.deleteBtn}>
                          <Ionicons name="close-circle-outline" size={18} color={BrutlColors.textDisabled} />
                        </TouchableOpacity>
                      </View>
                      {i < mealGroups[group].length - 1 && <View style={st.divider} />}
                    </View>
                  ))}
                </BrutlCard>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24, letterSpacing: 1,
    color: BrutlColors.textPrimary,
  },
  headerIcons: { flexDirection: 'row', gap: BrutlSpacing.sm },
  iconBtn: {
    width: 38, height: 38, borderRadius: BrutlRadius.sm,
    backgroundColor: BrutlColors.bgCard, borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    alignItems: 'center', justifyContent: 'center',
  },

  ringsRow: { flexDirection: 'row', gap: BrutlSpacing.xs },

  section: { gap: BrutlSpacing.sm },
  sectionLabel: { fontSize: 11, color: BrutlColors.accent, letterSpacing: 1.5 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm, borderWidth: 1, borderColor: BrutlColors.borderVisible,
    paddingHorizontal: BrutlSpacing.md,
  },
  input: {
    flex: 1,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 15,
    paddingVertical: BrutlSpacing.sm + 2,
  },

  tilesOuter: { gap: BrutlSpacing.sm },
  tilesRow: { flexDirection: 'row', gap: BrutlSpacing.sm },

  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: BrutlSpacing.sm, gap: BrutlSpacing.sm,
  },
  resultName: { fontSize: 14, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.body },
  resultMacros: { fontSize: 11, color: BrutlColors.textMuted },
  addChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BrutlRadius.full,
    backgroundColor: `${BrutlColors.accent}18`,
    borderWidth: 1, borderColor: `${BrutlColors.accent}40`,
  },
  addChipText: { fontSize: 11, color: BrutlColors.accent, fontWeight: '700' },
  divider: { height: 1, backgroundColor: BrutlColors.border },
  noResults: {
    fontSize: 12, color: BrutlColors.textDisabled,
    textAlign: 'center', paddingVertical: BrutlSpacing.md,
  },

  emptyText: {
    fontSize: 14, color: BrutlColors.textMuted,
    lineHeight: 21, marginBottom: BrutlSpacing.md,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: BrutlSpacing.md, paddingVertical: BrutlSpacing.sm,
    borderWidth: 1, borderColor: BrutlColors.accent, borderRadius: BrutlRadius.sm,
  },
  emptyCtaText: { fontSize: 13, color: BrutlColors.accent },

  mealGroup: { gap: BrutlSpacing.xs },
  groupLabel: {
    fontSize: 10, color: BrutlColors.textDisabled,
    letterSpacing: 1.5, paddingLeft: 2,
  },
  mealRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: BrutlSpacing.sm, gap: BrutlSpacing.sm,
  },
  mealName: { fontSize: 14, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.body },
  mealMacros: { fontSize: 11, color: BrutlColors.textMuted },
  deleteBtn: { padding: 2 },
});
