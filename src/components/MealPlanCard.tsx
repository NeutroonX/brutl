import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';
import { invalidateMealPlan, useMealPlan } from '@/repositories/diet-phase.repository';
import type { DietPhase, MealSuggestion } from '@/types/diet-phase';
import { BrutlText } from './ui/BrutlText';

const TIME_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const TIME_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch:     'partly-sunny-outline',
  dinner:    'moon-outline',
  snack:     'cafe-outline',
};

function MacroPill({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={p.pill}>
      <BrutlText style={p.val}>{Math.round(value)}{unit}</BrutlText>
      <BrutlText style={p.lbl}>{label}</BrutlText>
    </View>
  );
}

const p = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: BrutlColors.bg,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 44,
  },
  val: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: BrutlColors.textPrimary,
  },
  lbl: {
    fontSize: 8,
    color: BrutlColors.textDisabled,
    letterSpacing: 0.8,
  },
});

function MealRow({ meal }: { meal: MealSuggestion }) {
  const icon = (TIME_ICONS[meal.timeOfDay] ?? 'restaurant-outline') as keyof typeof Ionicons.glyphMap;
  return (
    <View style={m.row}>
      <View style={m.iconWrap}>
        <Ionicons name={icon} size={14} color={BrutlColors.textDisabled} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <BrutlText style={m.name} numberOfLines={1}>{meal.name}</BrutlText>
        <BrutlText style={m.meta}>
          {meal.calories} kcal · P {meal.proteinG}g · C {meal.carbsG}g · F {meal.fatG}g · {meal.prepMinutes}min
        </BrutlText>
        {meal.ingredients.length > 0 && (
          <BrutlText style={m.ingredients} numberOfLines={1}>
            {meal.ingredients.slice(0, 4).join(', ')}
            {meal.ingredients.length > 4 ? ' …' : ''}
          </BrutlText>
        )}
      </View>
    </View>
  );
}

const m = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: BrutlSpacing.sm,
    paddingVertical: BrutlSpacing.sm,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  name: {
    fontSize: 13,
    color: BrutlColors.textPrimary,
    fontFamily: BrutlFonts.body,
  },
  meta: {
    fontSize: 10,
    color: BrutlColors.textMuted,
  },
  ingredients: {
    fontSize: 9,
    color: BrutlColors.textDisabled,
  },
});

export function MealPlanCard({ phase, userId }: { phase: DietPhase; userId: string }) {
  const { data, isLoading, isError } = useMealPlan(userId, phase);
  const queryClient = useQueryClient();

  const sortedMeals = data
    ? [...data.meals].sort(
        (a, b) =>
          TIME_ORDER.indexOf(a.timeOfDay as typeof TIME_ORDER[number]) -
          TIME_ORDER.indexOf(b.timeOfDay as typeof TIME_ORDER[number]),
      )
    : [];

  return (
    <View style={c.card}>
      <View style={c.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="restaurant-outline" size={13} color={BrutlColors.accent} />
          <BrutlText style={c.title}>AI MEAL PLAN</BrutlText>
          {data && (
            <View style={c.dayTypeBadge}>
              <BrutlText style={c.dayTypeText}>{data.dayType}</BrutlText>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => invalidateMealPlan(userId, queryClient)}
          hitSlop={10}
          disabled={isLoading}
          accessibilityLabel="Refresh meal plan"
          accessibilityRole="button"
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={isLoading ? BrutlColors.textDisabled : BrutlColors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={c.skeleton}>
          {[60, 80, 55, 70].map((w, i) => (
            <View key={i} style={[c.skeletonRow, { width: `${w}%` as any }]} />
          ))}
        </View>
      )}

      {isError && !isLoading && (
        <BrutlText style={c.errorText}>
          Couldn't load meal plan. Tap refresh to try again.
        </BrutlText>
      )}

      {data && (
        <>
          <View style={c.macroRow}>
            <MacroPill label="KCAL"    value={data.totalCalories} unit="" />
            <MacroPill label="PROTEIN" value={data.totalProteinG} unit="g" />
            <MacroPill label="CARBS"   value={data.totalCarbsG}   unit="g" />
            <MacroPill label="FAT"     value={data.totalFatG}     unit="g" />
          </View>

          <View style={c.mealList}>
            {sortedMeals.map((meal, idx) => (
              <View key={meal.timeOfDay + meal.name}>
                <MealRow meal={meal} />
                {idx < sortedMeals.length - 1 && <View style={c.divider} />}
              </View>
            ))}
          </View>

          <BrutlText style={c.coachNote}>"{data.coachNote}"</BrutlText>
        </>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  card: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.md,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    padding: BrutlSpacing.md,
    gap: BrutlSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 11,
    color: BrutlColors.accent,
    letterSpacing: 1.5,
  },
  dayTypeBadge: {
    backgroundColor: `${BrutlColors.accent}22`,
    borderRadius: BrutlRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${BrutlColors.accent}44`,
  },
  dayTypeText: {
    fontSize: 9,
    color: BrutlColors.accent,
    letterSpacing: 1,
  },
  macroRow: {
    flexDirection: 'row',
    gap: BrutlSpacing.xs,
  },
  mealList: {},
  divider: {
    height: 1,
    backgroundColor: BrutlColors.border,
  },
  coachNote: {
    fontSize: 11,
    color: BrutlColors.textMuted,
    fontFamily: BrutlFonts.body,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: BrutlSpacing.xs,
  },
  skeleton: {
    gap: BrutlSpacing.sm,
    paddingVertical: BrutlSpacing.sm,
  },
  skeletonRow: {
    height: 12,
    backgroundColor: BrutlColors.border,
    borderRadius: BrutlRadius.sm,
  },
  errorText: {
    fontSize: 12,
    color: BrutlColors.textDisabled,
    textAlign: 'center',
    paddingVertical: BrutlSpacing.sm,
  },
});
