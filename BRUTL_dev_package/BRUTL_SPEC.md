# BRUTL — Master Product Specification
> Version 1.0 | Status: Ready for development
> AI-powered brutal gym + diet accountability app
> Platform: Android (primary), Wear OS / Samsung Galaxy Watch

---

## 1. Product Identity

**Name:** BRUTL
**Tagline:** No excuses. No mercy. Just results.
**Core premise:** The first fitness app with a real AI *character* — not a coach, not a buddy. An entity that roasts you based on your actual data, science, and the psychology of greatness achievers.

**AI Persona blend:**
- Terence Fletcher (Whiplash) — psychological pressure, surgical cruelty
- Kobe Bryant — obsession with mastery, data-backed expectations, no excuses
- Stanley Sugerman — believes in your potential, roasts because it cares
- Science adaptive — adjusts tone based on HRV, sleep, recovery, not just mood

**Visual Identity:**
- Background: pure black `#000000`
- Primary accent: red `#E24B4A`
- Text: white `#F0F0F0`, muted `#999999`
- Borders: `#1A1A1A` / `#2A2A2A`
- Typography: heavy display font (Bebas Neue or Druk) for headings, system sans for body
- No light mode. Ever.

---

## 2. Tech Stack

### Mobile App
- **Language:** Kotlin (Android)
- **UI:** Jetpack Compose
- **Architecture:** MVVM + Clean Architecture
- **Local DB:** Room (SQLite)
- **Backend:** Supabase (auth + postgres + storage)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Food DB:** Open Food Facts API (barcode + search)
- **Diet photo scan:** Claude Vision (base64 image → macro estimate)

### Wearable
- **Samsung Galaxy Watch:** Wear OS + Samsung Health SDK
- **Other Wear OS:** Android Health Connect API
- **Garmin:** Garmin Health API (Connect IQ)
- **Fitbit:** Fitbit Web API
- **Whoop:** Whoop API v1

### Watch Data Consumed
| Signal | Source | Used For |
|---|---|---|
| Heart rate (resting + live) | Health Connect | Roast trigger, XP calc |
| HRV | Health Connect / Whoop | Recovery score, roast intensity |
| Sleep score + duration | Health Connect | Recovery intelligence |
| Stress level | Samsung Health | Roast tone modifier |
| Steps + calories | Health Connect | Daily quest tracking |
| Workout auto-detect | Wear OS motion | Auto-log sets + reps |

---

## 3. Core Daily Loop

```
User opens app
  → Roast fires immediately (based on yesterday's data)
  → Home screen shows: rank, XP bar, watch vitals, active quests

User logs workout
  → Manual entry OR watch auto-log (motion sensor)
  → AI compares vs rolling 30-day baseline
  → If underperformed → roast fires
  → XP awarded based on volume × intensity

User logs diet
  → Manual text search OR barcode scan OR photo scan (Claude Vision)
  → Macros checked against daily targets
  → Off-plan meal → roast fires
  → Compliance XP awarded

End of day
  → Summary roast generated
  → Quest progress updated
  → Rank XP recalculated
  → Watch syncs recovery data for tomorrow's roast
```

---

## 4. Roast Engine

### Trigger Conditions
1. App open (every session, no exceptions)
2. Missed workout day (detected at end of scheduled day)
3. Off-plan meal logged (macro deviation > 15%)
4. Below-average lift (vs 30-day rolling average for that exercise)
5. Poor sleep/recovery (HRV drops >20%, sleep <6h)

### Claude API System Prompt (Roast Engine)
```
You are BRUTL — a brutally honest AI fitness accountability system.
Your personality is a blend of:
- Terence Fletcher: psychological precision, no sympathy for excuses
- Kobe Bryant: data-driven, obsessed with mastery, zero tolerance for mediocrity  
- Stanley Sugerman: secretly believes in the user's potential, but won't say it easily

Rules:
- Always roast based on ACTUAL DATA provided, never generic advice
- Reference specific numbers (HRV, sleep hours, missed days, weight lifted)
- Keep roasts under 3 sentences. Brutal. Specific. Unforgettable.
- After every roast, give one concrete correction (what to do instead)
- Adapt tone to recovery score: low recovery = acknowledge but still expect effort
- Never be generic. If the data is good, acknowledge it — briefly, then raise the bar.

Data format you receive:
{
  "sleep_hours": float,
  "hrv": int,
  "recovery_score": int (0-100),
  "missed_days": int,
  "last_workout": { "exercise": str, "weight": float, "baseline": float },
  "diet_compliance": float (0-1),
  "rank": str (E/D/C/B/A/S),
  "streak": int
}
```

---

## 5. Gamification System

### Rank Ladder (Solo Leveling style)
| Rank | Title | XP Required | Unlock Condition |
|---|---|---|---|
| E | Couch Corpse | 0 | Default |
| D | Warm Body | 500 | 7-day streak + 4/7 macro days |
| C | Iron Recruit | 2,000 | 30-day streak + first boss kill + 70% diet |
| B | Steel Hunter | 6,000 | 3 dungeon completions + 5 PRs + HRV improving |
| A | Shadow Athlete | 15,000 | 90-day streak + elite recovery + 10 boss kills |
| S | Iron Animal | 40,000 | 180-day streak + top 1% metrics |

### XP Sources
| Action | XP |
|---|---|
| Complete workout | 50–200 (scales with volume) |
| Hit daily macro targets | 100 |
| Daily quest complete | 150 |
| Boss fight win | 500 |
| Dungeon day complete | 200 |
| Dungeon full completion | 1,000 bonus |
| Good sleep (7h+ + HRV healthy) | 50 |
| Streak milestone (7/30/90 days) | 250 / 500 / 1,500 |

### Quest Types
**Daily Quest** — resets at midnight
- Example: "Complete today's push workout + hit protein target"
- Reward: +150 XP
- Miss it: roast fires at 11pm + streak warning

**Boss Fight** — weekly, resets Monday
- Beat your 30-day PR on a major lift
- Reward: +500 XP + rank progress
- Fail: special AI "message"

**Dungeon Run** — 7-day escalating challenge
- Each day harder than the last
- Day 1: 20 min zone 2 cardio
- Day 7: 60 min zone 3+ + hit all macros
- Complete all 7: XP multiplier for 14 days
- Quit mid-run: rank XP penalty (-200)

**Shadow Quest** — hidden, unlocks unexpectedly
- Trigger: log 5am workout, 14-day diet streak, etc.
- No hints. Just rewards when triggered.

---

## 6. Onboarding Flow

```
Screen 1: Cold open
  → Black screen, single line fades in:
    "You've been lying to yourself."
  → 3 second pause. No skip.
  → Subtext fades: "It stops today."
  → CTA: "I'm ready"

Screen 2: Brutality demo
  → Shows a fake user's terrible week
  → AI roasts the fake user in real-time (streamed)
  → Text: "This is what BRUTL does. No filter."
  → CTA: "Do it to me"

Screen 3: Stats intake (fast, brutal)
  → Name, age, weight, height
  → Goal: Fat loss / Muscle gain / Both
  → Weakest area: Upper / Lower / Cardio / Diet
  → Each entry: one-line AI reaction appears instantly
    (e.g., entering weight → "Noted. Let's fix that.")

Screen 4: First real roast
  → Based on intake only, AI delivers first roast
  → Rank assigned: E — Couch Corpse
  → First daily quest issued
  → Watch connection prompt
```

---

## 7. Watch App Spec

### Wear OS Companion App
**Watch face displays:**
- Current time
- Recovery score (color coded: green/amber/red)
- Resting HR
- HRV
- Current rank
- Active dungeon progress (if in run)
- Latest roast snippet (scrollable)

**During workout (auto-detected or manually started):**
- Live HR zone
- Session duration
- Current set XP earned
- Rest timer
- Auto-log prompt: "Set done? Log it" (tap to confirm)

**Roast notifications:**
- Buzz pattern: 3 short pulses (branded haptic)
- Roast text on screen
- Quick action: "Log workout now ↗"

**Samsung Health SDK Integration:**
- `HealthTrackingService` for real-time HR + HRV
- `SamsungHealthDataStore` for historical sleep + recovery
- `ExerciseTracker` for auto-workout detection

---

## 8. Diet Logging

### Three Input Methods
1. **Text search** — Open Food Facts API, debounced search
2. **Barcode scan** — CameraX + ML Kit barcode → Open Food Facts lookup
3. **Photo scan** — CameraX capture → base64 → Claude Vision API
   - Prompt: "Estimate the macros in this meal: calories, protein (g), carbs (g), fat (g). Return JSON only."
   - Response parsed: `{ calories, protein, carbs, fat }`

### Macro Targets
- Set during onboarding based on goal + stats
- Recalculated weekly based on body weight updates
- Deviation >15% from protein target → roast fires

---

## 9. Data Models

### User
```kotlin
data class User(
  val id: String,
  val name: String,
  val age: Int,
  val weightKg: Float,
  val heightCm: Int,
  val goal: Goal, // FAT_LOSS, MUSCLE_GAIN, RECOMP
  val rank: Rank, // E, D, C, B, A, S
  val xp: Int,
  val streakDays: Int,
  val createdAt: Long
)
```

### WorkoutLog
```kotlin
data class WorkoutLog(
  val id: String,
  val userId: String,
  val date: Long,
  val exercises: List<ExerciseSet>,
  val durationMinutes: Int,
  val watchSynced: Boolean,
  val xpEarned: Int
)

data class ExerciseSet(
  val exercise: String,
  val sets: Int,
  val reps: Int,
  val weightKg: Float
)
```

### DietLog
```kotlin
data class DietLog(
  val id: String,
  val userId: String,
  val date: Long,
  val meals: List<MealEntry>,
  val totalCalories: Int,
  val totalProtein: Float,
  val totalCarbs: Float,
  val totalFat: Float,
  val complianceScore: Float // 0.0–1.0
)
```

### RoastLog
```kotlin
data class RoastLog(
  val id: String,
  val userId: String,
  val timestamp: Long,
  val triggerType: RoastTrigger, // APP_OPEN, MISSED_WORKOUT, OFF_PLAN, WEAK_LIFT, POOR_RECOVERY
  val roastText: String,
  val correctionText: String,
  val dataSnapshot: String // JSON of the data that triggered it
)
```

### Quest
```kotlin
data class Quest(
  val id: String,
  val type: QuestType, // DAILY, BOSS, DUNGEON, SHADOW
  val title: String,
  val description: String,
  val xpReward: Int,
  val expiresAt: Long,
  val completedAt: Long?,
  val progress: Float // 0.0–1.0
)
```

### WatchData
```kotlin
data class WatchData(
  val userId: String,
  val date: Long,
  val restingHR: Int,
  val hrv: Int,
  val sleepHours: Float,
  val recoveryScore: Int, // 0–100
  val stressLevel: Int,   // 0–100
  val steps: Int,
  val caloriesBurned: Int,
  val source: WatchSource // SAMSUNG, WEAR_OS, GARMIN, FITBIT, WHOOP
)
```

---

## 10. Project Structure

```
brutl-android/
├── app/
│   ├── src/main/
│   │   ├── java/com/brutl/app/
│   │   │   ├── data/
│   │   │   │   ├── local/          # Room DAOs + entities
│   │   │   │   ├── remote/         # Supabase, Claude API, Open Food Facts
│   │   │   │   ├── watch/          # Health Connect, Samsung SDK adapters
│   │   │   │   └── repository/     # Data layer
│   │   │   ├── domain/
│   │   │   │   ├── model/          # Data models (User, WorkoutLog, etc.)
│   │   │   │   ├── usecase/        # Business logic
│   │   │   │   └── repository/     # Interfaces
│   │   │   ├── ui/
│   │   │   │   ├── theme/          # BRUTL dark theme tokens
│   │   │   │   ├── home/           # Home screen
│   │   │   │   ├── workout/        # Workout logging
│   │   │   │   ├── diet/           # Diet logging + scan
│   │   │   │   ├── quests/         # Quest board
│   │   │   │   ├── stats/          # Progress charts
│   │   │   │   └── onboarding/     # Cold open → demo → intake
│   │   │   └── ai/
│   │   │       ├── RoastEngine.kt  # Claude API integration
│   │   │       └── MealScanner.kt  # Claude Vision integration
│   │   └── res/
├── wear/                           # Wear OS companion app
│   ├── src/main/java/com/brutl/wear/
│   │   ├── watchface/
│   │   ├── workout/
│   │   └── notification/
├── build.gradle.kts
└── settings.gradle.kts
```

---

## 11. Build Phases

| Phase | Scope | Target |
|---|---|---|
| P1 — MVP | Roast engine + manual logging + onboarding + rank/XP | 6 weeks |
| P2 — Watch | Health Connect + Samsung SDK + Wear OS app + roast buzzes | 4 weeks |
| P3 — Gamification | Quest system (daily/boss/dungeon/shadow) + XP animations | 3 weeks |
| P4 — Diet AI | Barcode scan + photo scan + macro intelligence | 3 weeks |
| P5 — Launch | Freemium split + Google Play billing + polish + launch | 4 weeks |

---

## 12. Monetization

**Free tier:**
- Manual workout + diet logging
- Basic streak tracking
- E–D rank only
- 1 roast per day

**BRUTL Pro (₹299/month or ₹2,499/year):**
- Unlimited AI roasts
- Full rank system (C → S)
- All quest types
- Watch integration
- Diet photo scan
- Progress charts + body stats
- Recovery intelligence

---

## 13. Claude Code Instructions

When working on this project:

1. Always use `claude-sonnet-4-20250514` for the roast engine
2. The roast system prompt is in Section 4 — do not soften it
3. UI colors are hardcoded (not dynamic theme) — black bg, red accent, white text
4. Watch data integration priority: Samsung Health > Health Connect > third-party APIs
5. All XP calculations must be server-side (Supabase Edge Functions) to prevent tampering
6. Roast logs must be stored locally (Room) AND synced to Supabase
7. The onboarding cold open (Section 6) must not have a skip button on Screen 1
8. Diet photo scan returns JSON — always validate before parsing
9. Quest expiry is enforced at midnight local time via WorkManager
10. Rank up animations are critical UX moments — invest time here

