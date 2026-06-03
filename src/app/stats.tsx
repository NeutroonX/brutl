import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LineChart, type ChartPoint } from "@/components/stats/LineChart";
import { BrutlCard } from "@/components/ui/BrutlCard";
import { BrutlText } from "@/components/ui/BrutlText";
import { RANK_COLORS, RankBadge } from "@/components/ui/RankBadge";
import { BrutlColors, BrutlSpacing } from "@/constants/theme";
import {
  RANK_TITLES,
  getXPForNextRank,
  getXPInCurrentRank,
  getXPRangeForRank,
} from "@/lib/rank";
import { useDietStore } from "@/stores/diet.store";
import { useRoastStore } from "@/stores/roast.store";
import { useUserStore } from "@/stores/user.store";
import { useWatchStore } from "@/stores/watch.store";
import { useWeightStore } from "@/stores/weight.store";
import { useWorkoutStore } from "@/stores/workout.store";
import type {
  DietLog,
  MacroTargets,
  Rank,
  RoastEntry,
  UserProfile,
  WeightEntry,
  WorkoutLog,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const NEXT_RANK: Record<Rank, Rank | null> = {
  E: "D",
  D: "C",
  C: "B",
  B: "A",
  A: "S",
  S: null,
};

const MUSCLE_KEYWORDS: Record<string, string[]> = {
  Chest: ["bench", "chest", "pec", "push up", "pushup", "fly", "cable fly"],
  Back: [
    "row",
    "pull up",
    "pullup",
    "pull-up",
    "lat pulldown",
    "lat pull",
    "back",
    "deadlift",
    "chin up",
    "chin-up",
  ],
  Shoulders: [
    "shoulder",
    "ohp",
    "overhead press",
    "lateral raise",
    "front raise",
    "delt",
  ],
  Biceps: ["curl", "bicep", "hammer", "preacher"],
  Triceps: [
    "tricep",
    "extension",
    "pushdown",
    "skull crusher",
    "close grip",
    "dip",
  ],
  Quads: [
    "squat",
    "leg press",
    "quad",
    "leg extension",
    "lunge",
    "hack squat",
    "bulgarian",
  ],
  Hamstrings: [
    "romanian",
    "hamstring",
    "leg curl",
    "rdl",
    "stiff leg",
    "nordic",
  ],
  Glutes: ["hip thrust", "glute bridge", "kickback", "abduction"],
  Core: [
    "ab",
    "core",
    "plank",
    "crunch",
    "sit up",
    "situp",
    "sit-up",
    "russian twist",
  ],
};

const MUSCLE_TARGETS: Record<string, number> = {
  Chest: 16,
  Back: 16,
  Shoulders: 12,
  Biceps: 10,
  Triceps: 10,
  Quads: 16,
  Hamstrings: 12,
  Glutes: 12,
  Core: 8,
};

const MUSCLE_ORDER = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Core",
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const TRIGGER_LABELS: Record<string, string> = {
  APP_OPEN: "MORNING DISPATCH",
  MISSED_WORKOUT: "MISSED WORKOUT",
  OFF_PLAN: "DIET SLIP",
  WEAK_LIFT: "POST-WORKOUT",
  POOR_RECOVERY: "RECOVERY ALERT",
  WORKOUT_COMPLETE: "WORKOUT COMPLETE",
  MEAL_LOGGED: "MEAL LOGGED",
};

// ─── Data Helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function fmtShort(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function logVolume(log: WorkoutLog): number {
  return log.exercises.reduce((s, e) => s + e.sets * e.reps * e.weightKg, 0);
}

function computeDayCompliance(log: DietLog, targets: MacroTargets): number {
  if (!targets.calories) return 0;
  const cal = Math.min(1, log.totalCalories / targets.calories);
  const prot = Math.min(1, log.totalProteinG / targets.proteinG);
  return (cal + prot) / 2;
}

function weeklyVolumeData(logs: WorkoutLog[], numWeeks: number): ChartPoint[] {
  const monday = getMondayOfWeek(new Date());
  return Array.from({ length: numWeeks }, (_, i) => {
    const wStart = new Date(monday);
    wStart.setDate(wStart.getDate() - (numWeeks - 1 - i) * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);
    const vol = logs
      .filter((l) => l.date >= wStart.getTime() && l.date < wEnd.getTime())
      .reduce((sum, l) => sum + logVolume(l), 0);
    return {
      value: vol,
      label: wStart.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
    };
  });
}

function dailyVolumeData(logs: WorkoutLog[]): ChartPoint[] {
  const DLABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monday = getMondayOfWeek(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const k = dayKey(d.getTime());
    const vol = logs
      .filter((l) => dayKey(l.date) === k)
      .reduce((sum, l) => sum + logVolume(l), 0);
    return { value: vol, label: DLABELS[i] };
  });
}

interface HeatCell {
  date: number;
  compliance: number;
  calories: number;
  protein: number;
}
interface HeatRow {
  label: string;
  cells: HeatCell[];
}

function buildHeatmap(dietLogs: DietLog[], targets: MacroTargets): HeatRow[] {
  const monday = getMondayOfWeek(new Date());
  const byDay = new Map<string, DietLog>();
  for (const l of dietLogs) byDay.set(dayKey(l.date), l);
  const now = new Date();

  return Array.from({ length: 4 }, (_, row) => {
    const wStart = new Date(monday);
    wStart.setDate(wStart.getDate() - (3 - row) * 7);
    const cells: HeatCell[] = Array.from({ length: 7 }, (__, d) => {
      const day = new Date(wStart);
      day.setDate(day.getDate() + d);
      const log = byDay.get(dayKey(day.getTime()));
      const isFuture = day > now;
      return {
        date: day.getTime(),
        compliance: isFuture
          ? -2
          : log
            ? computeDayCompliance(log, targets)
            : -1,
        calories: log?.totalCalories ?? 0,
        protein: log?.totalProteinG ?? 0,
      };
    });
    return {
      label: wStart.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      cells,
    };
  });
}

function heatColor(c: number): string {
  if (c < 0) return BrutlColors.bgCardSubtle;
  if (c < 0.6) return "#2A0000";
  if (c < 0.8) return "#6B1C1C";
  if (c < 0.95) return "#A32D2D";
  return BrutlColors.accent;
}

interface LiftPoint extends ChartPoint {
  reps: number;
  weightKg: number;
}

function liftProgressionData(
  logs: WorkoutLog[],
  exercise: string,
): LiftPoint[] {
  const ex = exercise.toLowerCase();
  let prWeight = 0;
  return [...logs]
    .sort((a, b) => a.date - b.date)
    .filter((l) => l.exercises.some((e) => e.exercise.toLowerCase() === ex))
    .map((session) => {
      const sets = session.exercises.filter(
        (e) => e.exercise.toLowerCase() === ex,
      );
      const top = sets.reduce((m, s) => (s.weightKg > m.weightKg ? s : m));
      const isPR = top.weightKg > prWeight;
      if (isPR) prWeight = top.weightKg;
      return {
        value: top.weightKg,
        label: fmtShort(session.date),
        isPR,
        reps: top.reps,
        weightKg: top.weightKg,
      };
    });
}

function topExercises(logs: WorkoutLog[]): string[] {
  const counts = new Map<string, number>();
  for (const l of logs)
    for (const e of l.exercises)
      counts.set(e.exercise, (counts.get(e.exercise) ?? 0) + 1);
  const byFreq = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([n]) => n);
  const defaults = ["Bench Press", "Squat", "Deadlift", "OHP"];
  for (const d of defaults)
    if (!byFreq.some((n) => n.toLowerCase() === d.toLowerCase()))
      byFreq.push(d);
  return byFreq.slice(0, 10);
}

function getMuscles(name: string): string[] {
  const lower = name.toLowerCase();
  return Object.entries(MUSCLE_KEYWORDS)
    .filter(([, kws]) => kws.some((kw) => lower.includes(kw)))
    .map(([m]) => m);
}

function setsPerMuscle(logs: WorkoutLog[]): Record<string, number> {
  const weekStart = getMondayOfWeek(new Date()).getTime();
  const counts: Record<string, number> = {};
  for (const l of logs.filter((l) => l.date >= weekStart))
    for (const e of l.exercises)
      for (const m of getMuscles(e.exercise))
        counts[m] = (counts[m] ?? 0) + e.sets;
  return counts;
}

interface PREntry {
  exercise: string;
  weightKg: number;
  reps: number;
  date: number;
  isNew: boolean;
}

function computePRs(logs: WorkoutLog[]): PREntry[] {
  const prMap = new Map<
    string,
    { weightKg: number; reps: number; date: number }
  >();
  for (const l of [...logs].sort((a, b) => a.date - b.date))
    for (const e of l.exercises) {
      const cur = prMap.get(e.exercise);
      if (!cur || e.weightKg > cur.weightKg)
        prMap.set(e.exercise, {
          weightKg: e.weightKg,
          reps: e.reps,
          date: l.date,
        });
    }
  const weekAgo = Date.now() - 7 * 86_400_000;
  return [...prMap.entries()]
    .map(([ex, p]) => ({ exercise: ex, ...p, isNew: p.date >= weekAgo }))
    .sort((a, b) => b.date - a.date);
}

type DayState = 0 | 1 | 2;

function consistencyGrid(
  workoutLogs: WorkoutLog[],
  dietLogs: DietLog[],
): DayState[][] {
  const monday = getMondayOfWeek(new Date());
  const wDays = new Set(workoutLogs.map((l) => dayKey(l.date)));
  const dDays = new Set(dietLogs.map((l) => dayKey(l.date)));
  const now = new Date();
  return Array.from({ length: 12 }, (_, week) => {
    const wStart = new Date(monday);
    wStart.setDate(wStart.getDate() - (11 - week) * 7);
    return Array.from({ length: 7 }, (__, day) => {
      const d = new Date(wStart);
      d.setDate(d.getDate() + day);
      if (d > now) return 0 as DayState;
      const k = dayKey(d.getTime());
      return (
        wDays.has(k) && dDays.has(k) ? 2 : wDays.has(k) || dDays.has(k) ? 1 : 0
      ) as DayState;
    });
  });
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SL({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <BrutlText style={s.sectionLabel}>{label}</BrutlText>
      {right}
    </View>
  );
}

// ─── Section 1: Rank & XP Identity Card ──────────────────────────────────────

function RankXPCard({ profile }: { profile: UserProfile }) {
  const rank = profile.rank;
  const rankColor = RANK_COLORS[rank];
  const xpInRank = getXPInCurrentRank(profile.xp, rank);
  const xpRange = getXPRangeForRank(rank);
  const nextRank = NEXT_RANK[rank];
  const pct = xpRange > 0 ? Math.min(1, xpInRank / xpRange) : 0;

  return (
    <View style={[s.rankCard, { borderColor: `${rankColor}35` }]}>
      <View style={[s.rankCardWash, { backgroundColor: `${rankColor}08` }]} />
      <BrutlText style={[s.rankGhost, { color: rankColor }]}>{rank}</BrutlText>

      <View style={s.rankCardInner}>
        <View style={s.rankLeft}>
          <RankBadge rank={rank} size="lg" />
          <BrutlText style={[s.rankTitle, { color: rankColor }]}>
            {RANK_TITLES[rank]}
          </BrutlText>
        </View>
        <View style={s.rankRight}>
          <BrutlText style={s.rankXPNum}>
            {profile.xp.toLocaleString()}
          </BrutlText>
          <BrutlText style={s.rankXPLabel}>total XP</BrutlText>
          {profile.streakDays > 0 ? (
            <BrutlText style={s.rankStreak}>
              🔥 {profile.streakDays}{" "}
              {profile.streakDays === 1 ? "day" : "days"} streak
            </BrutlText>
          ) : (
            <BrutlText
              style={[s.rankStreak, { color: BrutlColors.textDisabled }]}
            >
              No streak yet.
            </BrutlText>
          )}
        </View>
      </View>

      <View style={{ gap: 5, marginTop: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <BrutlText style={s.xpBarLabel}>
            {rank} · {RANK_TITLES[rank]}
          </BrutlText>
          {nextRank ? (
            <BrutlText style={s.xpBarLabel}>
              {(getXPForNextRank(rank) - profile.xp).toLocaleString()} XP to{" "}
              {RANK_TITLES[nextRank]}
            </BrutlText>
          ) : (
            <BrutlText style={[s.xpBarLabel, { color: rankColor }]}>
              MAX RANK
            </BrutlText>
          )}
        </View>
        <View style={s.xpTrack}>
          <View
            style={[s.xpFill, { width: `${(pct * 100).toFixed(1)}%` as any }]}
          />
        </View>
        {profile.xp === 0 && (
          <BrutlText style={s.emptyNote}>
            0 XP. You literally just got here. The bar has nowhere to go but up.
          </BrutlText>
        )}
      </View>
    </View>
  );
}

// ─── Section 2: Overview Grid ─────────────────────────────────────────────────

function OverviewGrid({
  profile,
  workoutLogs,
  dietLogs,
  watchConnected,
}: {
  profile: UserProfile;
  workoutLogs: WorkoutLog[];
  dietLogs: DietLog[];
  watchConnected: boolean;
}) {
  const totalWorkouts = workoutLogs.length;
  const totalVolume = workoutLogs.reduce((s, l) => s + logVolume(l), 0);
  const weekStart = getMondayOfWeek(new Date()).getTime();
  const weekDiet = dietLogs.filter((l) => l.date >= weekStart);
  const weekCompliance =
    weekDiet.length > 0
      ? Math.round(
          (weekDiet.reduce(
            (s, l) => s + computeDayCompliance(l, profile.macroTargets),
            0,
          ) /
            weekDiet.length) *
            100,
        )
      : 0;
  const compColor =
    weekCompliance >= 80
      ? BrutlColors.success
      : weekCompliance >= 60
        ? BrutlColors.warning
        : weekCompliance > 0
          ? BrutlColors.accent
          : BrutlColors.textDisabled;

  const volDisplay =
    totalVolume >= 1_000_000
      ? `${(totalVolume / 1_000_000).toFixed(1)}M`
      : totalVolume >= 1_000
        ? `${Math.round(totalVolume / 1_000)}k`
        : Math.round(totalVolume).toString();

  const tiles = [
    {
      value: totalWorkouts.toString(),
      label: totalWorkouts === 1 ? "session" : "sessions",
      color: BrutlColors.textPrimary,
    },
    {
      value: profile.streakDays.toString(),
      label: profile.streakDays === 1 ? "day streak" : "days streak",
      color: BrutlColors.accent,
    },
    { value: volDisplay, label: "kg moved", color: BrutlColors.textPrimary },
    {
      value: weekCompliance > 0 ? `${weekCompliance}%` : "—",
      label: "this week",
      color: compColor,
    },
  ];

  const goalLabel = (profile.goal ?? "—").replace("_", " ");
  const weakLabel =
    profile.weakArea.map((w) => w.replace(/_/g, " ")).join(", ") || "—";

  return (
    <BrutlCard>
      <SL label="OVERVIEW" />
      <View style={s.tileGrid}>
        {tiles.map((t, i) => (
          <View key={i} style={s.tile}>
            <BrutlText style={[s.tileValue, { color: t.color }]}>
              {t.value}
            </BrutlText>
            <BrutlText style={s.tileLabel}>{t.label}</BrutlText>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 14, gap: 7 }}>
        {(
          [
            { k: "Goal", v: goalLabel.toUpperCase() },
            { k: "Weak Area", v: weakLabel.toUpperCase() },
            { k: "Member Since", v: fmtDate(profile.createdAt) },
            watchConnected
              ? { k: "Watch Connected", v: "Health Connect", dot: true }
              : null,
          ] as const
        )
          .filter(Boolean)
          .map((row) => (
            <View key={(row as any).k} style={s.kvRow}>
              <BrutlText style={s.kvKey}>{(row as any).k}</BrutlText>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                {(row as any).dot && <View style={s.greenDot} />}
                <BrutlText style={s.kvVal}>{(row as any).v}</BrutlText>
              </View>
            </View>
          ))}
      </View>
    </BrutlCard>
  );
}

// ─── Section 3: Volume Trend ──────────────────────────────────────────────────

function VolumeTrend({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const [range, setRange] = useState<"1W" | "4W" | "3M">("4W");

  const data =
    range === "1W"
      ? dailyVolumeData(workoutLogs)
      : range === "4W"
        ? weeklyVolumeData(workoutLogs, 4)
        : weeklyVolumeData(workoutLogs, 12);

  const lastVal = data[data.length - 1]?.value ?? 0;
  const prevVal = data[data.length - 2]?.value ?? 0;
  const pctChange = prevVal > 0 ? ((lastVal - prevVal) / prevVal) * 100 : null;
  const up = (pctChange ?? 0) >= 0;
  const hasData = data.some((d) => d.value > 0);

  return (
    <BrutlCard>
      <SL
        label="VOLUME TREND"
        right={
          <View style={{ flexDirection: "row", gap: 4 }}>
            {(["1W", "4W", "3M"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRange(r)}
                style={[s.rangePill, range === r && s.rangePillActive]}
              >
                <BrutlText
                  style={[
                    s.rangePillText,
                    range === r && s.rangePillTextActive,
                  ]}
                >
                  {r}
                </BrutlText>
              </TouchableOpacity>
            ))}
          </View>
        }
      />
      <LineChart
        data={data}
        height={130}
        lineColor={BrutlColors.accent}
        dotSize={6}
        emptyText="No workout data yet. The chart is embarrassed on your behalf."
      />
      {hasData && (
        <View style={s.annotRow}>
          <BrutlText style={s.annotLeft}>
            {range === "1W" ? "This week" : "Latest"}:{" "}
            {Math.round(lastVal).toLocaleString()} kg
          </BrutlText>
          {pctChange !== null && prevVal > 0 && (
            <BrutlText
              style={[
                s.annotRight,
                { color: up ? BrutlColors.success : BrutlColors.accent },
              ]}
            >
              {up ? "▲" : "▼"} {Math.abs(pctChange).toFixed(0)}% vs prior
            </BrutlText>
          )}
        </View>
      )}
    </BrutlCard>
  );
}

// ─── Section 4: Macro Compliance Heatmap ─────────────────────────────────────

function MacroHeatmap({
  dietLogs,
  targets,
}: {
  dietLogs: DietLog[];
  targets: MacroTargets;
}) {
  const rows = buildHeatmap(dietLogs, targets);
  const [tooltip, setTooltip] = useState<HeatCell | null>(null);

  return (
    <BrutlCard>
      <SL label="MACRO COMPLIANCE" />
      <View style={s.hmDayHeader}>
        <View style={{ width: 38 }} />
        {DAY_LABELS.map((d, i) => (
          <BrutlText key={i} style={s.hmDayLabel}>
            {d}
          </BrutlText>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.hmRow}>
          <BrutlText style={s.hmWeekLabel}>{row.label}</BrutlText>
          {row.cells.map((cell, ci) => (
            <TouchableOpacity
              key={ci}
              onPress={() =>
                setTooltip(tooltip?.date === cell.date ? null : cell)
              }
              activeOpacity={0.75}
            >
              <View
                style={[
                  s.hmCell,
                  { backgroundColor: heatColor(cell.compliance) },
                  tooltip?.date === cell.date && s.hmCellSelected,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      ))}
      {tooltip !== null && tooltip.compliance >= 0 && (
        <View style={s.hmTooltip}>
          <BrutlText style={{ fontSize: 11, color: BrutlColors.textPrimary }}>
            {fmtShort(tooltip.date)}
            {tooltip.calories > 0
              ? ` · ${tooltip.calories} kcal · Protein ${Math.round(tooltip.protein)}g · ${Math.round(tooltip.compliance * 100)}%`
              : " · No data logged"}
          </BrutlText>
        </View>
      )}
      <View style={s.hmLegend}>
        {(
          [
            { color: BrutlColors.bgCardSubtle, label: "No data" },
            { color: "#2A0000", label: "Missed" },
            { color: "#6B1C1C", label: "Partial" },
            { color: "#A32D2D", label: "Hit" },
            { color: BrutlColors.accent, label: "Perfect" },
          ] as const
        ).map((l) => (
          <View key={l.label} style={s.hmLegendItem}>
            <View style={[s.hmLegendDot, { backgroundColor: l.color }]} />
            <BrutlText style={s.hmLegendText}>{l.label}</BrutlText>
          </View>
        ))}
      </View>
      {dietLogs.length === 0 && (
        <BrutlText style={[s.emptyNote, { marginTop: 10 }]}>
          Log your first meal to start filling this in. Right now it just looks
          like a void.
        </BrutlText>
      )}
    </BrutlCard>
  );
}

// ─── Section 5: Body Weight Tracker ──────────────────────────────────────────

function BodyWeightSection({
  entries,
  addEntry,
  goalWeightKg,
}: {
  entries: WeightEntry[];
  addEntry: (kg: number) => Promise<void>;
  goalWeightKg?: number;
}) {
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState("");

  const todayK = dayKey(Date.now());
  const loggedToday = entries.find((e) => dayKey(e.date) === todayK);

  const chartData: ChartPoint[] = [...entries]
    .reverse()
    .slice(0, 56)
    .map((e) => ({
      value: e.weightKg,
      label: fmtShort(e.date),
    }));

  const current = entries[0]?.weightKg;
  const oldest = entries[entries.length - 1]?.weightKg;
  const change =
    current != null && oldest != null && entries.length > 1
      ? current - oldest
      : null;

  const confirm = async () => {
    const kg = parseFloat(input);
    if (!isNaN(kg) && kg > 20 && kg < 300) {
      await addEntry(kg);
      setShowInput(false);
      setInput("");
    }
  };

  return (
    <BrutlCard>
      <SL label="BODY WEIGHT" />
      {entries.length < 2 ? (
        <BrutlText style={s.emptyNote}>
          You haven't logged your weight yet. Avoiding the number doesn't change
          it.
        </BrutlText>
      ) : (
        <>
          <LineChart
            data={chartData}
            height={120}
            lineColor={BrutlColors.textPrimary}
            dotSize={5}
            yPad={1}
          />
          <View style={s.annotRow}>
            <BrutlText style={s.annotLeft}>
              Current: {current?.toFixed(1)} kg
            </BrutlText>
            {change !== null && (
              <BrutlText
                style={[
                  s.annotRight,
                  {
                    color:
                      change <= 0 ? BrutlColors.success : BrutlColors.warning,
                  },
                ]}
              >
                {change <= 0 ? "▼" : "▲"} {Math.abs(change).toFixed(1)} kg total
              </BrutlText>
            )}
          </View>
          <View style={s.weightStatRow}>
            {[
              { label: "Starting", value: `${oldest?.toFixed(1)} kg` },
              { label: "Current", value: `${current?.toFixed(1)} kg` },
              {
                label: "Change",
                value:
                  change !== null
                    ? `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`
                    : "—",
              },
              { label: "Goal", value: goalWeightKg ? `${goalWeightKg} kg` : "—" },
            ].map((col) => (
              <View key={col.label} style={s.weightStatCol}>
                <BrutlText style={s.weightStatLabel}>{col.label}</BrutlText>
                <BrutlText style={s.weightStatVal}>{col.value}</BrutlText>
              </View>
            ))}
          </View>
        </>
      )}
      <View style={{ marginTop: 12 }}>
        {loggedToday ? (
          <BrutlText style={{ fontSize: 11, color: BrutlColors.textMuted }}>
            Already logged today: {loggedToday.weightKg.toFixed(1)} kg
          </BrutlText>
        ) : showInput ? (
          <View style={s.weightInputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={BrutlColors.textDisabled}
              style={s.weightInput}
              returnKeyType="done"
              onSubmitEditing={confirm}
              autoFocus
            />
            <BrutlText style={{ color: BrutlColors.textMuted, fontSize: 13 }}>
              kg
            </BrutlText>
            <TouchableOpacity onPress={confirm}>
              <BrutlText style={{ color: BrutlColors.accent, fontSize: 13 }}>
                Confirm
              </BrutlText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowInput(false);
                setInput("");
              }}
            >
              <BrutlText style={{ color: BrutlColors.textMuted, fontSize: 13 }}>
                Cancel
              </BrutlText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowInput(true)}>
            <BrutlText style={{ fontSize: 12, color: BrutlColors.textMuted }}>
              Log today's weight →
            </BrutlText>
          </TouchableOpacity>
        )}
      </View>
    </BrutlCard>
  );
}

// ─── Section 6: Lift Progression ─────────────────────────────────────────────

function LiftProgression({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const exercises = topExercises(workoutLogs);
  const [selected, setSelected] = useState(exercises[0] ?? "Bench Press");

  const data = liftProgressionData(workoutLogs, selected);
  const latest = data[data.length - 1];
  const allTimePR = data.reduce<LiftPoint | null>(
    (m, p) => (m == null || p.weightKg > m.weightKg ? p : m),
    null,
  );

  return (
    <BrutlCard>
      <SL label="LIFT PROGRESSION" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          {exercises.map((ex) => (
            <TouchableOpacity
              key={ex}
              onPress={() => setSelected(ex)}
              style={[s.exPill, selected === ex && s.exPillActive]}
            >
              <BrutlText
                style={[s.exPillText, selected === ex && s.exPillTextActive]}
              >
                {ex}
              </BrutlText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <LineChart
        data={data}
        height={130}
        lineColor={BrutlColors.accent}
        dotSize={5}
        emptyText={`You haven't logged ${selected} yet. Convenient.`}
      />
      {data.length > 0 && (
        <View style={{ gap: 3, marginTop: 10 }}>
          {latest && (
            <BrutlText style={s.annotLeft}>
              Current best: {latest.weightKg} kg × {latest.reps}
            </BrutlText>
          )}
          {allTimePR && (
            <BrutlText style={s.annotLeft}>
              All-time PR: {allTimePR.weightKg} kg × {allTimePR.reps} ·{" "}
              {allTimePR.label}
            </BrutlText>
          )}
        </View>
      )}
    </BrutlCard>
  );
}

// ─── Section 7: Weekly Muscle Volume ─────────────────────────────────────────

function MuscleVolume({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const sets = setsPerMuscle(workoutLogs);
  const weekStart = getMondayOfWeek(new Date());
  const weekSessions = workoutLogs.filter(
    (l) => l.date >= weekStart.getTime(),
  ).length;

  return (
    <BrutlCard>
      <SL label="WEEKLY MUSCLE VOLUME" />
      <View style={{ gap: 10 }}>
        {MUSCLE_ORDER.map((muscle) => {
          const n = sets[muscle] ?? 0;
          const target = MUSCLE_TARGETS[muscle];
          const ratio = n / target;
          const fillColor =
            ratio <= 0
              ? BrutlColors.borderVisible
              : ratio < 0.31
                ? "#2A0000"
                : ratio < 0.71
                  ? BrutlColors.warning
                  : ratio < 1.0
                    ? BrutlColors.accent
                    : "#97C459";
          return (
            <View key={muscle} style={s.muscleRow}>
              <BrutlText style={s.muscleName}>{muscle}</BrutlText>
              <View style={[s.muscleTrack, ratio > 1.5 && s.muscleTrackWarn]}>
                <View
                  style={[
                    s.muscleFill,
                    {
                      width: `${Math.min(100, ratio * 100).toFixed(1)}%` as any,
                      backgroundColor: fillColor,
                    },
                  ]}
                />
              </View>
              <BrutlText style={s.muscleSets}>
                {n}/{target}
              </BrutlText>
            </View>
          );
        })}
      </View>
      <BrutlText
        style={[
          s.annotLeft,
          { marginTop: 10, color: BrutlColors.textDisabled },
        ]}
      >
        Week of {fmtShort(weekStart.getTime())} · {weekSessions}{" "}
        {weekSessions === 1 ? "session" : "sessions"} logged
      </BrutlText>
    </BrutlCard>
  );
}

// ─── Section 8: Recovery Trends ───────────────────────────────────────────────

function RecoverySection({
  vitals,
  isAvailable,
  hasPermission,
}: {
  vitals: {
    hrv: number | null;
    sleepHours: number | null;
    restingHR: number | null;
    recoveryScore: number | null;
  };
  isAvailable: boolean;
  hasPermission: boolean;
}) {
  if (!isAvailable || !hasPermission) return null;
  const { hrv, sleepHours, restingHR, recoveryScore } = vitals;
  if (!hrv && !sleepHours && !restingHR && !recoveryScore) return null;

  const insight =
    sleepHours != null && sleepHours < 6 && hrv != null && hrv < 40
      ? "Your HRV dropped and sleep is under 6h. Your body is asking for a deload. Your AI disagrees. Lift anyway."
      : sleepHours != null && sleepHours < 6
        ? `Sleep is at ${sleepHours}h. Below 7h impairs muscle protein synthesis. Prioritise sleep.`
        : hrv != null && hrv < 40
          ? `HRV is at ${hrv}ms — below optimal. Nervous system is under stress. Lift, but don't test maxes.`
          : restingHR != null && restingHR > 70
            ? `Resting HR is elevated at ${restingHR}bpm. Monitor recovery before a heavy session.`
            : "Recovery looks stable. No obvious red flags in today's data.";

  const rows = [
    {
      label: "HRV",
      value: hrv,
      unit: "ms",
      icon: "pulse" as const,
      good: (v: number) => v >= 50,
    },
    {
      label: "Sleep",
      value: sleepHours,
      unit: "h",
      icon: "moon" as const,
      good: (v: number) => v >= 7,
    },
    {
      label: "Resting HR",
      value: restingHR,
      unit: "bpm",
      icon: "heart" as const,
      good: (v: number) => v < 65,
    },
    {
      label: "Recovery",
      value: recoveryScore,
      unit: "%",
      icon: "battery-charging" as const,
      good: (v: number) => v >= 70,
    },
  ].filter((r) => r.value != null);

  return (
    <BrutlCard>
      <SL label="RECOVERY TRENDS" />
      <View style={{ gap: 10 }}>
        {rows.map((row) => {
          const good = row.value != null && row.good(row.value);
          const color = good ? BrutlColors.success : BrutlColors.warning;
          return (
            <View key={row.label} style={s.recoveryRow}>
              <Ionicons name={row.icon} size={14} color={color} />
              <BrutlText style={s.recoveryLabel}>{row.label}</BrutlText>
              <BrutlText style={[s.recoveryValue, { color }]}>
                {row.value}
                {row.unit}
              </BrutlText>
            </View>
          );
        })}
      </View>
      <BrutlText style={s.recoveryInsight}>{insight}</BrutlText>
    </BrutlCard>
  );
}

// ─── Section 9: Personal Records ─────────────────────────────────────────────

function PersonalRecords({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const [showAll, setShowAll] = useState(false);
  const prs = computePRs(workoutLogs);
  const visible = showAll ? prs : prs.slice(0, 8);

  return (
    <BrutlCard>
      <SL label="PERSONAL RECORDS" />
      {prs.length === 0 ? (
        <BrutlText style={s.emptyNote}>
          No PRs yet. You haven't lifted anything. That sentence wrote itself.
        </BrutlText>
      ) : (
        <>
          {visible.map((pr, i) => (
            <View
              key={pr.exercise}
              style={[s.prRow, i < visible.length - 1 && s.prRowBorder]}
            >
              <View style={s.prAccent} />
              <BrutlText style={[s.prExercise, { flex: 1 }]}>
                {pr.exercise}
              </BrutlText>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <BrutlText style={s.prWeight}>
                    {pr.weightKg} kg × {pr.reps}
                  </BrutlText>
                  {pr.isNew && (
                    <View style={s.newBadge}>
                      <BrutlText style={s.newBadgeText}>NEW</BrutlText>
                    </View>
                  )}
                </View>
                <BrutlText style={s.prDate}>{fmtShort(pr.date)}</BrutlText>
              </View>
            </View>
          ))}
          {prs.length > 8 && (
            <TouchableOpacity
              onPress={() => setShowAll((v) => !v)}
              style={{ marginTop: 10 }}
            >
              <BrutlText style={{ fontSize: 12, color: BrutlColors.accent }}>
                {showAll ? "Show less" : `View all ${prs.length} →`}
              </BrutlText>
            </TouchableOpacity>
          )}
        </>
      )}
    </BrutlCard>
  );
}

// ─── Section 10: Recent Roasts ────────────────────────────────────────────────

function RecentRoasts({ roastLog }: { roastLog: RoastEntry[] }) {
  const last5 = roastLog.slice(0, 5);

  return (
    <BrutlCard>
      <SL label="RECENT ROASTS" />
      {last5.length === 0 ? (
        <BrutlText style={s.emptyNote}>
          No roasts yet. Give us something to work with.
        </BrutlText>
      ) : (
        last5.map((r, i) => {
          const isDupe = i > 0 && last5[i - 1].roastText === r.roastText;
          if (isDupe) return null;
          return (
            <View
              key={r.id}
              style={[s.roastItem, i < last5.length - 1 && s.roastItemBorder]}
            >
              <BrutlText style={s.roastTrigger}>
                {TRIGGER_LABELS[r.triggerType] ?? r.triggerType} ·{" "}
                {fmtShort(r.timestamp)}
              </BrutlText>
              <BrutlText style={s.roastBody}>{r.roastText}</BrutlText>
              {!!r.correctionText && (
                <BrutlText style={s.roastCorrection}>
                  → {r.correctionText}
                </BrutlText>
              )}
            </View>
          );
        })
      )}
    </BrutlCard>
  );
}

// ─── Section 11: Streak & Consistency ────────────────────────────────────────

function ConsistencySection({
  workoutLogs,
  dietLogs,
  streakDays,
}: {
  workoutLogs: WorkoutLog[];
  dietLogs: DietLog[];
  streakDays: number;
}) {
  const grid = consistencyGrid(workoutLogs, dietLogs);
  const allDays = new Set([
    ...workoutLogs.map((l) => dayKey(l.date)),
    ...dietLogs.map((l) => dayKey(l.date)),
  ]);
  const totalActiveDays = allDays.size;

  const cellColor = (state: DayState) =>
    state === 2
      ? BrutlColors.accent
      : state === 1
        ? "#2A0000"
        : BrutlColors.bgCardSubtle;

  return (
    <BrutlCard>
      <SL label="CONSISTENCY" />
      <View style={s.streakRow}>
        <View style={s.streakStat}>
          <BrutlText style={[s.streakNum, { color: BrutlColors.accent }]}>
            {streakDays}
          </BrutlText>
          <BrutlText style={s.streakLabel}>
            {streakDays === 1 ? "day streak" : "days streak"}
          </BrutlText>
        </View>
        <View style={s.streakStat}>
          <BrutlText style={s.streakNum}>{workoutLogs.length}</BrutlText>
          <BrutlText style={s.streakLabel}>
            {workoutLogs.length === 1 ? "workout" : "workouts"}
          </BrutlText>
        </View>
        <View style={s.streakStat}>
          <BrutlText style={s.streakNum}>{totalActiveDays}</BrutlText>
          <BrutlText style={s.streakLabel}>active days</BrutlText>
        </View>
      </View>
      <View style={{ marginTop: 14, gap: 3 }}>
        {grid.map((week, wi) => (
          <View key={wi} style={{ flexDirection: "row", gap: 3 }}>
            {week.map((state, di) => (
              <View
                key={di}
                style={[
                  s.conCell,
                  { flex: 1, backgroundColor: cellColor(state) },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={s.conLegend}>
        {(
          [
            { color: BrutlColors.bgCardSubtle, label: "Rest" },
            { color: "#2A0000", label: "Partial" },
            { color: BrutlColors.accent, label: "Full day" },
          ] as const
        ).map((l) => (
          <View key={l.label} style={s.hmLegendItem}>
            <View style={[s.hmLegendDot, { backgroundColor: l.color }]} />
            <BrutlText style={s.hmLegendText}>{l.label}</BrutlText>
          </View>
        ))}
      </View>
    </BrutlCard>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const profile = useUserStore((s) => s.profile);
  const workoutLogs = useWorkoutStore((s) => s.logs);
  const dietLogs = useDietStore((s) => s.logs);
  const roastLog = useRoastStore((s) => s.log);
  const { vitals, isAvailable, hasPermission } = useWatchStore();
  const { entries: weightEntries, addEntry: addWeightEntry } = useWeightStore();
  const insets = useSafeAreaInsets();

  if (!profile) return null;

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + BrutlSpacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BrutlText style={s.screenTitle}>Stats</BrutlText>

        <RankXPCard profile={profile} />

        <OverviewGrid
          profile={profile}
          workoutLogs={workoutLogs}
          dietLogs={dietLogs}
          watchConnected={isAvailable && hasPermission}
        />

        <VolumeTrend workoutLogs={workoutLogs} />

        <MacroHeatmap dietLogs={dietLogs} targets={profile.macroTargets} />

        <BodyWeightSection entries={weightEntries} addEntry={addWeightEntry} goalWeightKg={profile.goalWeightKg} />

        <LiftProgression workoutLogs={workoutLogs} />

        <MuscleVolume workoutLogs={workoutLogs} />

        <RecoverySection
          vitals={vitals}
          isAvailable={isAvailable}
          hasPermission={hasPermission}
        />

        <PersonalRecords workoutLogs={workoutLogs} />

        <RecentRoasts roastLog={roastLog} />

        <ConsistencySection
          workoutLogs={workoutLogs}
          dietLogs={dietLogs}
          streakDays={profile.streakDays}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrutlColors.bg },
  scroll: { flex: 1 },
  content: { padding: BrutlSpacing.xl, gap: BrutlSpacing.lg },

  screenTitle: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 32,
    lineHeight: 25,
    color: BrutlColors.textPrimary,
    letterSpacing: 1,
  },

  sectionLabel: {
    fontSize: 10,
    color: BrutlColors.accent,
    letterSpacing: 2,
    fontWeight: "600",
  },

  // ── Rank card ──
  rankCard: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    padding: BrutlSpacing.md,
    overflow: "hidden",
  },
  rankCardWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  rankGhost: {
    position: "absolute",
    right: -8,
    top: -24,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 180,
    lineHeight: 180,
    opacity: 0.07,
    letterSpacing: -4,
  },
  rankCardInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  rankLeft: { alignItems: "center", gap: 6, width: 80 },
  rankRight: { flex: 1, alignItems: "flex-end", gap: 3 },
  rankTitle: { fontSize: 10, letterSpacing: 1.5, textAlign: "center" },
  rankXPNum: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 34,
    color: BrutlColors.accent,
    lineHeight: 36,
  },
  rankXPLabel: { fontSize: 10, color: BrutlColors.textMuted },
  rankStreak: { fontSize: 12, color: BrutlColors.accent },
  xpBarLabel: { fontSize: 9, color: BrutlColors.textDisabled },
  xpTrack: {
    height: 4,
    backgroundColor: BrutlColors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  xpFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: BrutlColors.accent,
    borderRadius: 2,
  },

  // ── Overview ──
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: BrutlColors.bgCardSubtle,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 3,
    borderWidth: 0.5,
    borderColor: BrutlColors.border,
  },
  tileValue: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 30,
    lineHeight: 32,
  },
  tileLabel: { fontSize: 10, color: BrutlColors.textMuted, letterSpacing: 0.5 },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kvKey: { fontSize: 11, color: BrutlColors.textDisabled },
  kvVal: { fontSize: 11, color: BrutlColors.textPrimary, letterSpacing: 0.5 },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrutlColors.success,
  },

  // ── Volume / annotations ──
  rangePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },
  rangePillActive: {
    backgroundColor: BrutlColors.accent,
    borderColor: BrutlColors.accent,
  },
  rangePillText: { fontSize: 10, color: BrutlColors.textMuted },
  rangePillTextActive: { color: "#000", fontWeight: "700" },
  annotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  annotLeft: { fontSize: 11, color: BrutlColors.textMuted },
  annotRight: { fontSize: 11 },

  // ── Heatmap ──
  hmDayHeader: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  hmDayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
    color: BrutlColors.textDisabled,
  },
  hmRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  hmWeekLabel: { width: 38, fontSize: 9, color: BrutlColors.textDisabled },
  hmCell: { width: 28, height: 28, borderRadius: 4, marginHorizontal: 1.5 },
  hmCellSelected: { borderWidth: 1.5, borderColor: BrutlColors.textPrimary },
  hmTooltip: {
    marginTop: 8,
    padding: 8,
    backgroundColor: BrutlColors.bgCardSubtle,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: BrutlColors.borderVisible,
  },
  hmLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  hmLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  hmLegendDot: { width: 10, height: 10, borderRadius: 3 },
  hmLegendText: { fontSize: 9, color: BrutlColors.textDisabled },

  // ── Body weight ──
  weightStatRow: { flexDirection: "row", marginTop: 12 },
  weightStatCol: { flex: 1, alignItems: "center", gap: 2 },
  weightStatLabel: { fontSize: 9, color: BrutlColors.textDisabled },
  weightStatVal: {
    fontSize: 13,
    color: BrutlColors.textPrimary,
    fontWeight: "600",
  },
  weightInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  weightInput: {
    flex: 1,
    color: BrutlColors.textPrimary,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrutlColors.accent,
    paddingVertical: 4,
  },

  // ── Exercise pills ──
  exPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
    backgroundColor: BrutlColors.bgCardSubtle,
  },
  exPillActive: {
    backgroundColor: BrutlColors.accent,
    borderColor: BrutlColors.accent,
  },
  exPillText: { fontSize: 11, color: BrutlColors.textDisabled },
  exPillTextActive: { color: "#000", fontWeight: "700" },

  // ── Muscle volume ──
  muscleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  muscleName: { fontSize: 11, color: BrutlColors.textMuted, width: 82 },
  muscleTrack: {
    flex: 1,
    height: 8,
    backgroundColor: BrutlColors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  muscleTrackWarn: { borderWidth: 1, borderColor: BrutlColors.warning },
  muscleFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  muscleSets: {
    fontSize: 10,
    color: BrutlColors.textDisabled,
    width: 36,
    textAlign: "right",
  },

  // ── Recovery ──
  recoveryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  recoveryLabel: { flex: 1, fontSize: 12, color: BrutlColors.textMuted },
  recoveryValue: { fontSize: 14, fontWeight: "600" },
  recoveryInsight: {
    fontSize: 11,
    color: "#888888",
    fontStyle: "italic",
    lineHeight: 17,
    marginTop: 12,
  },

  // ── PRs ──
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  prRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: BrutlColors.border,
  },
  prAccent: {
    width: 2,
    height: 28,
    backgroundColor: BrutlColors.accent,
    borderRadius: 1,
  },
  prExercise: { fontSize: 13, color: BrutlColors.textPrimary },
  prWeight: { fontSize: 13, color: BrutlColors.textPrimary, fontWeight: "600" },
  prDate: { fontSize: 9, color: BrutlColors.textDisabled },
  newBadge: {
    backgroundColor: BrutlColors.accent,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: {
    fontSize: 8,
    color: "#000",
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── Roasts ──
  roastItem: { paddingVertical: 10, gap: 5 },
  roastItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: BrutlColors.border,
  },
  roastTrigger: {
    fontSize: 10,
    color: BrutlColors.accent,
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  roastBody: { fontSize: 13, color: BrutlColors.textPrimary, lineHeight: 20 },
  roastCorrection: {
    fontSize: 12,
    color: BrutlColors.textDisabled,
    lineHeight: 18,
  },

  // ── Consistency ──
  streakRow: { flexDirection: "row", justifyContent: "space-between" },
  streakStat: { flex: 1, alignItems: "center", gap: 3 },
  streakNum: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
    color: BrutlColors.textPrimary,
    lineHeight: 30,
  },
  streakLabel: {
    fontSize: 9,
    color: BrutlColors.textDisabled,
    letterSpacing: 0.5,
  },
  conCell: { height: 12, borderRadius: 2 },
  conLegend: { flexDirection: "row", gap: 12, marginTop: 10 },

  // ── Shared ──
  emptyNote: {
    fontSize: 11,
    color: BrutlColors.textDisabled,
    fontStyle: "italic",
    lineHeight: 17,
  },
});
