import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { STORAGE_KEYS, storageGet, storageSet } from '@/lib/storage';
import { calcMacroCompliance } from '@/lib/xp';
import { useDietStore } from '@/stores/diet.store';
import { useUserStore } from '@/stores/user.store';
import type { MealEntry } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MACRO_COLORS = {
  kcal:    '#E8E8E8',
  protein: BrutlColors.accent,
  carbs:   '#E2C44A',
  fat:     '#888888',
} as const;

type MealGroupKey = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'LATE NIGHT';
const GROUP_ORDER: MealGroupKey[] = ['MORNING', 'AFTERNOON', 'EVENING', 'LATE NIGHT'];

// ─── Food Search (Open Food Facts — no API key required) ──────────────────────

async function searchFoods(query: string): Promise<MealEntry[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=true&page_size=20&fields=product_name,nutriments,serving_size`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Brutl/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.products ?? [])
    .map((p: any): MealEntry => {
      const n = p.nutriments ?? {};
      return {
        name: p.product_name ?? 'Unknown',
        calories: Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
        proteinG: parseFloat((n['proteins_100g'] ?? 0).toFixed(1)),
        carbsG: parseFloat((n['carbohydrates_100g'] ?? 0).toFixed(1)),
        fatG: parseFloat((n['fat_100g'] ?? 0).toFixed(1)),
        servingG: 100,
      };
    })
    .filter((f: MealEntry) => f.name && f.calories > 0)
    .slice(0, 10);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function isFavourited(favs: MealEntry[], food: MealEntry) {
  return favs.some((f) => f.name.toLowerCase() === food.name.toLowerCase());
}

// ─── Manual Add Sheet ─────────────────────────────────────────────────────────

function ManualAddSheet({
  visible,
  onConfirm,
  onCancel,
  isFav,
  onToggleFav,
}: {
  visible: boolean;
  onConfirm: (food: MealEntry) => void;
  onCancel: () => void;
  isFav: (food: MealEntry) => boolean;
  onToggleFav: (food: MealEntry) => void;
}) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('100');

  function reset() {
    setName(''); setCalories(''); setProtein('');
    setCarbs(''); setFat(''); setServing('100');
  }

  function handleClose() { reset(); onCancel(); }

  function handleAdd() {
    if (!name.trim()) return;
    const food: MealEntry = {
      name: name.trim(),
      calories: parseFloat(calories) || 0,
      proteinG: parseFloat(protein) || 0,
      carbsG: parseFloat(carbs) || 0,
      fatG: parseFloat(fat) || 0,
      servingG: parseFloat(serving) || 100,
    };
    onConfirm(food);
    reset();
  }

  const canAdd = name.trim().length > 0;
  const preview: MealEntry = {
    name: name.trim() || 'My Food',
    calories: parseFloat(calories) || 0,
    proteinG: parseFloat(protein) || 0,
    carbsG: parseFloat(carbs) || 0,
    fatG: parseFloat(fat) || 0,
    servingG: parseFloat(serving) || 100,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={ma.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={ma.sheet}>
          <View style={ma.handle} />

          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <BrutlText style={ma.title}>ADD MANUALLY</BrutlText>
            <TouchableOpacity
              onPress={() => onToggleFav(preview)}
              style={ma.starBtn}
              disabled={!canAdd}
            >
              <Ionicons
                name={canAdd && isFav(preview) ? 'star' : 'star-outline'}
                size={20}
                color={canAdd && isFav(preview) ? '#F5C518' : BrutlColors.textDisabled}
              />
              <BrutlText style={{ fontSize: 9, color: BrutlColors.textDisabled, marginTop: 2 }}>
                {canAdd && isFav(preview) ? 'SAVED' : 'FAVOURITE'}
              </BrutlText>
            </TouchableOpacity>
          </View>

          {/* Name input */}
          <View style={ma.fieldGroup}>
            <BrutlText style={ma.fieldLabel}>FOOD NAME</BrutlText>
            <TextInput
              style={ma.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chicken breast, Dosa..."
              placeholderTextColor={BrutlColors.textDisabled}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Serving */}
          <View style={ma.fieldGroup}>
            <BrutlText style={ma.fieldLabel}>SERVING SIZE</BrutlText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.sm }}>
              <TouchableOpacity
                style={ma.stepBtn}
                onPress={() => setServing(String(Math.max(5, (parseFloat(serving) || 100) - 10)))}
              >
                <BrutlText style={ma.stepTxt}>−</BrutlText>
              </TouchableOpacity>
              <TextInput
                style={[ma.macroInput, { flex: 1, textAlign: 'center' }]}
                value={serving}
                onChangeText={setServing}
                keyboardType="number-pad"
              />
              <BrutlText style={ma.fieldLabel}>g</BrutlText>
              <TouchableOpacity
                style={ma.stepBtn}
                onPress={() => setServing(String((parseFloat(serving) || 100) + 10))}
              >
                <BrutlText style={ma.stepTxt}>+</BrutlText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Macro inputs — 2×2 grid */}
          <View style={{ gap: BrutlSpacing.sm }}>
            <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
              {[
                { label: 'CALORIES (kcal)', val: calories, set: setCalories },
                { label: 'PROTEIN (g)', val: protein, set: setProtein },
              ].map(({ label, val, set }) => (
                <View key={label} style={{ flex: 1, gap: 4 }}>
                  <BrutlText style={ma.fieldLabel}>{label}</BrutlText>
                  <TextInput
                    style={ma.macroInput}
                    value={val}
                    onChangeText={set}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={BrutlColors.textDisabled}
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
              {[
                { label: 'CARBS (g)', val: carbs, set: setCarbs },
                { label: 'FAT (g)', val: fat, set: setFat },
              ].map(({ label, val, set }) => (
                <View key={label} style={{ flex: 1, gap: 4 }}>
                  <BrutlText style={ma.fieldLabel}>{label}</BrutlText>
                  <TextInput
                    style={ma.macroInput}
                    value={val}
                    onChangeText={set}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={BrutlColors.textDisabled}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Preview macro boxes */}
          {canAdd && (
            <View style={ma.previewRow}>
              {[
                { label: 'KCAL', val: preview.calories, unit: '' },
                { label: 'PROTEIN', val: preview.proteinG, unit: 'g' },
                { label: 'CARBS', val: preview.carbsG, unit: 'g' },
                { label: 'FAT', val: preview.fatG, unit: 'g' },
              ].map((m) => (
                <View key={m.label} style={ma.previewBox}>
                  <BrutlText style={ma.previewVal}>{m.val}{m.unit}</BrutlText>
                  <BrutlText style={ma.previewLabel}>{m.label}</BrutlText>
                </View>
              ))}
            </View>
          )}

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: BrutlSpacing.sm }}>
            <TouchableOpacity style={[ma.btn, ma.cancelBtn]} onPress={handleClose}>
              <BrutlText style={ma.cancelTxt}>CANCEL</BrutlText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ma.btn, ma.addBtn, !canAdd && { opacity: 0.4 }]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <BrutlText style={ma.addTxt}>ADD TO LOG</BrutlText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ma = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: BrutlSpacing.xl, gap: BrutlSpacing.md,
    paddingBottom: 36,
    borderTopWidth: 1, borderColor: '#2A2A2A',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: BrutlColors.borderVisible,
    alignSelf: 'center', marginBottom: BrutlSpacing.xs,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22, letterSpacing: 1,
    color: BrutlColors.textPrimary,
  },
  starBtn: { alignItems: 'center', gap: 2 },
  fieldGroup: { gap: 5 },
  fieldLabel: { fontSize: 9, color: BrutlColors.textDisabled, letterSpacing: 1 },
  nameInput: {
    backgroundColor: BrutlColors.bg,
    borderRadius: BrutlRadius.sm, borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 15,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm + 2,
  },
  macroInput: {
    backgroundColor: BrutlColors.bg,
    borderRadius: BrutlRadius.sm, borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
    fontSize: 15,
    paddingHorizontal: BrutlSpacing.md,
    paddingVertical: BrutlSpacing.sm,
    textAlign: 'right',
  },
  stepBtn: {
    width: 38, height: 38, borderRadius: BrutlRadius.sm,
    backgroundColor: BrutlColors.bg,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTxt: { fontSize: 20, color: BrutlColors.accent, lineHeight: 22 },
  previewRow: { flexDirection: 'row', gap: BrutlSpacing.sm },
  previewBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: BrutlColors.bg,
    borderRadius: BrutlRadius.sm, borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    paddingVertical: BrutlSpacing.sm, gap: 2,
  },
  previewVal: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20, color: BrutlColors.textPrimary,
  },
  previewLabel: { fontSize: 9, color: BrutlColors.textMuted, letterSpacing: 0.5 },
  btn: {
    flex: 1, borderRadius: BrutlRadius.sm,
    paddingVertical: BrutlSpacing.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: { borderWidth: 1, borderColor: BrutlColors.borderVisible },
  cancelTxt: { fontSize: 13, color: BrutlColors.textMuted, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  addBtn: { backgroundColor: BrutlColors.accent, flex: 2 },
  addTxt: { fontSize: 14, color: '#fff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
});

// ─── MacroChip (Option E) ─────────────────────────────────────────────────────

function MacroChip({ label, value, target, unit, color }: {
  label: string; value: number; target: number; unit: string; color: string;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = pct >= 1;
  const activeColor = over ? BrutlColors.success : color;
  const pctInt = Math.round(pct * 100);

  return (
    <View style={mc.chip}>
      <BrutlText style={[mc.value, { color: value > 0 ? (over ? BrutlColors.success : BrutlColors.textPrimary) : BrutlColors.textDisabled }]}>
        {Math.round(value)}
      </BrutlText>
      <BrutlText style={mc.unit}>{unit}</BrutlText>
      <BrutlText style={[mc.pct, { color: pct > 0 ? activeColor : BrutlColors.textDisabled }]}>
        {target > 0 ? `${pctInt}%` : '—'}
      </BrutlText>
      <View style={mc.barTrack}>
        <View style={[mc.barFill, {
          width: `${Math.min(100, pctInt)}%` as any,
          backgroundColor: activeColor,
        }]} />
      </View>
      <BrutlText style={[mc.label, { color: pct > 0 ? activeColor : BrutlColors.textDisabled }]}>
        {label}
      </BrutlText>
    </View>
  );
}

const mc = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 2,
    overflow: 'hidden',
  },
  value: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  unit: {
    fontSize: 9,
    color: BrutlColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pct: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  barTrack: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: '#1A1A1A',
  },
  barFill: {
    height: 4,
  },
  label: {
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 1,
  },
});

// ─── Quick Add Tile ───────────────────────────────────────────────────────────

function QuickTile({
  food, onPress, onStar, starred,
}: {
  food: MealEntry; onPress: () => void; onStar: () => void; starred: boolean;
}) {
  return (
    <TouchableOpacity style={qt.tile} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <BrutlText style={qt.name} numberOfLines={1}>{food.name}</BrutlText>
        <TouchableOpacity onPress={onStar} hitSlop={8}>
          <Ionicons name={starred ? 'star' : 'star-outline'} size={12} color={starred ? '#F5C518' : BrutlColors.textDisabled} />
        </TouchableOpacity>
      </View>
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
    gap: 4,
  },
  name: { flex: 1, fontSize: 11, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.body },
  macros: { fontSize: 10, color: BrutlColors.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DietScreen() {
  const profile = useUserStore((s) => s.profile);
  const { addMeal, removeMeal, todayLog, logs } = useDietStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MealEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<MealEntry[]>([]);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [pendingScan, setPendingScan] = useState<ScannedFood | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load favourites from storage
  useEffect(() => {
    storageGet<MealEntry[]>(STORAGE_KEYS.dietFavourites).then((f) => {
      if (f) setFavourites(f);
    });
  }, []);

  // Search on query change
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setSearchError(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const r = await searchFoods(query);
        setResults(r);
      } catch (e: any) {
        setResults([]);
        setSearchError('Search failed. Check your connection.');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const toggleFavourite = useCallback(async (food: MealEntry) => {
    setFavourites((prev) => {
      const exists = isFavourited(prev, food);
      const next = exists
        ? prev.filter((f) => f.name.toLowerCase() !== food.name.toLowerCase())
        : [{ ...food, loggedAt: undefined }, ...prev];
      storageSet(STORAGE_KEYS.dietFavourites, next);
      return next;
    });
  }, []);

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
  const showSearch = query.trim().length > 0;

  const mealGroups = meals.reduce<Record<MealGroupKey, { meal: MealEntry; index: number }[]>>(
    (acc, meal, index) => {
      const g = getMealGroup(meal.loggedAt);
      (acc[g] = acc[g] ?? []).push({ meal, index });
      return acc;
    },
    {} as Record<MealGroupKey, { meal: MealEntry; index: number }[]>
  );

  const frequent = getFrequentFoods(logs);
  const hasFavourites = favourites.length > 0;
  const hasFrequent = frequent.length > 0;

  function renderTileGrid(foods: MealEntry[]) {
    const rows = [];
    for (let row = 0; row < Math.ceil(foods.length / 3); row++) {
      rows.push(
        <View key={row} style={st.tilesRow}>
          {foods.slice(row * 3, row * 3 + 3).map((food, idx) => (
            <QuickTile
              key={idx}
              food={food}
              starred={isFavourited(favourites, food)}
              onPress={() => setPendingScan(food)}
              onStar={() => toggleFavourite(food)}
            />
          ))}
          {foods.slice(row * 3, row * 3 + 3).length < 3 &&
            Array.from({ length: 3 - foods.slice(row * 3, row * 3 + 3).length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ flex: 1 }} />
            ))}
        </View>
      );
    }
    return rows;
  }

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BarcodeScanModal visible={showBarcode} onResult={handleScannedFood} onClose={() => setShowBarcode(false)} />
      <PhotoScanModal visible={showPhoto} onResult={handleScannedFood} onClose={() => setShowPhoto(false)} />
      <ScanConfirmSheet food={pendingScan} onConfirm={handleConfirmScan} onCancel={() => setPendingScan(null)} />
      <ManualAddSheet
        visible={showManual}
        onConfirm={async (food) => { setShowManual(false); await handleAdd(food); }}
        onCancel={() => setShowManual(false)}
        isFav={(food) => isFavourited(favourites, food)}
        onToggleFav={toggleFavourite}
      />

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
            <TouchableOpacity style={st.iconBtn} onPress={() => setShowManual(true)} hitSlop={8}>
              <Ionicons name="create-outline" size={20} color={BrutlColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={st.iconBtn} onPress={() => setShowBarcode(true)} hitSlop={8}>
              <Ionicons name="barcode-outline" size={22} color={BrutlColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={st.iconBtn} onPress={() => setShowPhoto(true)} hitSlop={8}>
              <Ionicons name="camera-outline" size={22} color={BrutlColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Macro Chips — Option E */}
        {targets && (
          <View style={st.chipsRow}>
            <MacroChip value={todayLog?.totalCalories ?? 0} target={targets.calories} unit="KCAL" label="CALORIES" color={MACRO_COLORS.kcal} />
            <MacroChip value={Math.round(todayLog?.totalProteinG ?? 0)} target={targets.proteinG} unit="G" label="PROTEIN" color={MACRO_COLORS.protein} />
            <MacroChip value={Math.round(todayLog?.totalCarbsG ?? 0)} target={targets.carbsG} unit="G" label="CARBS" color={MACRO_COLORS.carbs} />
            <MacroChip value={Math.round(todayLog?.totalFatG ?? 0)} target={targets.fatG} unit="G" label="FAT" color={MACRO_COLORS.fat} />
          </View>
        )}

        {/* Search */}
        <View style={st.section}>
          <BrutlText style={st.sectionLabel}>SEARCH FOOD</BrutlText>
          <View style={st.searchRow}>
            <TextInput
              style={st.input}
              value={query}
              onChangeText={setQuery}
              placeholder="chicken, oats, dosa..."
              placeholderTextColor={BrutlColors.textDisabled}
              returnKeyType="search"
            />
            {searching
              ? <ActivityIndicator color={BrutlColors.accent} size="small" style={{ marginRight: 4 }} />
              : <Ionicons name="search-outline" size={18} color={BrutlColors.textDisabled} style={{ marginRight: 4 }} />
            }
          </View>

          {/* Favourites section */}
          {!showSearch && hasFavourites && (
            <View style={st.tilesSection}>
              <View style={st.tilesSectionHeader}>
                <Ionicons name="star" size={10} color="#F5C518" />
                <BrutlText style={st.tilesSectionLabel}>FAVOURITES</BrutlText>
              </View>
              <View style={st.tilesOuter}>{renderTileGrid(favourites.slice(0, 6))}</View>
            </View>
          )}

          {/* Frequent section (only if no favourites) */}
          {!showSearch && !hasFavourites && hasFrequent && (
            <View style={st.tilesSection}>
              <BrutlText style={st.tilesSectionLabel}>FREQUENT</BrutlText>
              <View style={st.tilesOuter}>{renderTileGrid(frequent)}</View>
            </View>
          )}

          {/* No quick foods hint */}
          {!showSearch && !hasFavourites && !hasFrequent && (
            <BrutlText style={st.noResults}>Star foods below to pin them here.</BrutlText>
          )}

          {/* Search results */}
          {showSearch && results.length > 0 && (
            <BrutlCard>
              {results.map((r, idx) => (
                <View key={idx}>
                  <View style={st.resultRow}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => handleAdd(r)}>
                      <BrutlText style={st.resultName} numberOfLines={1}>{r.name}</BrutlText>
                      <BrutlText style={st.resultMacros}>
                        {r.calories} kcal · P {r.proteinG}g · C {r.carbsG}g · F {r.fatG}g
                      </BrutlText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleFavourite(r)} hitSlop={8} style={st.starBtn}>
                      <Ionicons
                        name={isFavourited(favourites, r) ? 'star' : 'star-outline'}
                        size={16}
                        color={isFavourited(favourites, r) ? '#F5C518' : BrutlColors.textDisabled}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={st.addChip} onPress={() => handleAdd(r)}>
                      <Ionicons name="add" size={14} color={BrutlColors.accent} />
                      <BrutlText style={st.addChipText}>ADD</BrutlText>
                    </TouchableOpacity>
                  </View>
                  {idx < results.length - 1 && <View style={st.divider} />}
                </View>
              ))}
            </BrutlCard>
          )}

          {showSearch && !searching && query.trim().length >= 2 && results.length === 0 && (
            <BrutlText style={st.noResults}>
              {searchError ?? 'No results. Try a different name or scan the barcode.'}
            </BrutlText>
          )}
        </View>

        {/* Empty state */}
        {!hasMeals && (
          <BrutlCard>
            <BrutlText style={st.emptyText}>
              0 meals logged. The day is already wasted if you haven't eaten by now.
            </BrutlText>
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
                        <TouchableOpacity onPress={() => toggleFavourite(meal)} hitSlop={8} style={st.starBtn}>
                          <Ionicons
                            name={isFavourited(favourites, meal) ? 'star' : 'star-outline'}
                            size={15}
                            color={isFavourited(favourites, meal) ? '#F5C518' : BrutlColors.textDisabled}
                          />
                        </TouchableOpacity>
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

  chipsRow: { flexDirection: 'row', gap: BrutlSpacing.xs },

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

  tilesSection: { gap: 6 },
  tilesSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tilesSectionLabel: { fontSize: 10, color: BrutlColors.textDisabled, letterSpacing: 1.2 },
  tilesOuter: { gap: BrutlSpacing.sm },
  tilesRow: { flexDirection: 'row', gap: BrutlSpacing.sm },

  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: BrutlSpacing.sm, gap: BrutlSpacing.sm,
  },
  resultName: { fontSize: 13, color: BrutlColors.textPrimary, fontFamily: BrutlFonts.body },
  resultMacros: { fontSize: 10, color: BrutlColors.textMuted },
  starBtn: { padding: 4 },
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
    fontSize: 14, color: BrutlColors.textMuted, lineHeight: 21,
  },

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
