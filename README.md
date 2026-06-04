# BRUTL

BRUTL is a mobile-first fitness accountability app built with Expo, React Native, Supabase, and local-first storage.

The app tracks training, food, weight, recovery, streaks, XP, and rank progression. It also uses AI-powered Supabase Edge Functions for roasts, meal scanning, exercise search, and coaching plans. The product tone is intentionally direct: BRUTL turns user data into blunt feedback and concrete next actions.

## Table of Contents

- [What BRUTL Does](#what-brutl-does)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Technical Architecture](#technical-architecture)
- [Data Flow](#data-flow)
- [Supabase Edge Functions](#supabase-edge-functions)
- [Local Storage and Offline Sync](#local-storage-and-offline-sync)
- [Health Connect](#health-connect)
- [Design System](#design-system)
- [Scripts](#scripts)
- [Builds](#builds)
- [Development Notes](#development-notes)

## What BRUTL Does

BRUTL is organized around five core user workflows:

1. Home
   - Shows rank, XP, streak, recovery vitals, and the latest BRUTL roast.
   - Triggers app-open feedback using workout history, recovery data, and streak state.

2. Workout
   - Logs exercises, sets, reps, weight, duration, and session XP.
   - Provides local exercise intelligence, muscle activation data, form cues, and recovery context.
   - Supports routines and progressive training flow.

3. Diet
   - Logs meals manually, through search, barcode/photo scan flows, and saved favorites.
   - Tracks calories, protein, carbs, fat, water, macro compliance, and diet XP.

4. Stats
   - Shows training volume, diet compliance, rank progress, PRs, muscle work, weight trends, and consistency.

5. Settings
   - Manages profile data, macro targets, avatar, API key overrides, Health Connect permissions, and onboarding reset.

## Tech Stack

| Area | Technology |
| --- | --- |
| App framework | Expo SDK 56 |
| UI runtime | React Native 0.85, React 19 |
| Routing | Expo Router |
| Language | TypeScript |
| State | Zustand |
| Local storage | react-native-mmkv |
| Server state | TanStack Query with persisted cache |
| Backend | Supabase |
| Serverless AI | Supabase Edge Functions |
| Validation | Zod |
| Native health data | react-native-health-connect |
| Camera/photos | expo-camera, expo-image-picker |
| Build service | EAS |

This project uses the Expo SDK 56 versioned API surface. For Expo changes, use the versioned docs: https://docs.expo.dev/versions/v56.0.0/

## Requirements

- Node.js compatible with the project toolchain.
- npm.
- Expo CLI through the local `expo` package.
- Android Studio or a physical Android device for native testing.
- EAS CLI for cloud builds.
- Supabase project for production backend behavior.

Expo SDK 56 targets React Native 0.85 and React 19.2. The Expo versioned docs list Node 22.13.x as the SDK 56 minimum, while this repo's EAS profiles currently pin Node 20.18.0. Keep that difference in mind when updating dependencies or EAS build images.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill in the values described in [Environment Variables](#environment-variables).

## Environment Variables

The app reads public client configuration through Expo public variables and server-only secrets inside Supabase Edge Functions.

### App Variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | App and client libraries | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App and client libraries | Supabase anonymous key |
| `EXPO_PUBLIC_RAPID_API_KEY` | Food/exercise integrations | Public default API key value |
| `EXPO_PUBLIC_USDA_API_KEY` | Food integrations | Public default API key value |

The settings screen can also store local API key overrides in MMKV.

### Edge Function Secrets

| Secret | Used by | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | `roast`, `coach-periodize` | Generates roasts and coaching plans |
| `GEMINI_API_KEY` | `meal-scan` | Estimates macros from meal photos |

Set Edge Function secrets in Supabase, not in client-side Expo public variables.

## Running the App

Start the Expo development server:

```bash
npm run start
```

Run Android:

```bash
npm run android
```

Run iOS:

```bash
npm run ios
```

Run web:

```bash
npm run web
```

Lint:

```bash
npm run lint
```

Because the app uses native modules such as MMKV and Health Connect, a development build is the correct target for full-device behavior. Expo Go will not represent every native feature.

## Project Structure

```text
.
|-- app.json                    # Expo app config, plugins, permissions, assets
|-- eas.json                    # EAS build profiles
|-- package.json                # Scripts and dependencies
|-- assets/                     # App icons, splash art, logos, tab icons
|-- scripts/                    # Utility scripts
|-- src/
|   |-- app/                    # Expo Router screens and layouts
|   |   |-- _layout.tsx         # App bootstrap, hydration, auth, providers
|   |   |-- index.tsx           # Home dashboard
|   |   |-- workout.tsx         # Workout logger
|   |   |-- diet.tsx            # Diet and macro tracker
|   |   |-- stats.tsx           # Analytics and progress
|   |   |-- routines.tsx        # Training routines
|   |   |-- settings.tsx        # Profile, keys, permissions
|   |   `-- onboarding/         # First-run onboarding flow
|   |-- components/             # Shared UI, sheets, modals, charts
|   |-- constants/              # Theme tokens
|   |-- hooks/                  # Theme and platform hooks
|   |-- lib/                    # Platform services and domain engines
|   |-- repositories/           # Server-state schemas and query helpers
|   |-- stores/                 # Zustand stores
|   `-- types/                  # Shared TypeScript domain types
`-- supabase/
    `-- functions/              # Supabase Edge Functions
```

## Architecture

BRUTL uses a local-first mobile architecture.

```text
User
  |
  v
Expo Router screens
  |
  v
Zustand stores + TanStack Query
  |
  +--> MMKV local persistence
  |
  +--> Supabase client
          |
          +--> Postgres tables
          +--> Anonymous auth
          +--> Edge Functions
                  |
                  +--> OpenRouter
                  +--> Gemini
                  +--> external exercise/food services
```

### App Shell

`src/app/_layout.tsx` is the app bootstrap point. It:

- Loads the Bebas Neue display font.
- Creates or restores an anonymous Supabase session.
- Hydrates all local stores from MMKV.
- Hydrates the offline sync queue.
- Registers foreground and background sync listeners.
- Redirects users into onboarding when needed.
- Wraps the app in `PersistQueryClientProvider` and the dark Expo Router theme.

### Routing

The project uses Expo Router with typed routes enabled in `app.json`.

Main screens live in `src/app/`:

- `/` -> Home dashboard.
- `/workout` -> live workout logging.
- `/diet` -> meal, macro, and water tracking.
- `/stats` -> progress analytics.
- `/routines` -> split and routine management.
- `/settings` -> profile, integrations, and local settings.
- `/onboarding/*` -> first-run profile and macro setup.

### State Layers

BRUTL separates state by responsibility:

| Layer | Files | Responsibility |
| --- | --- | --- |
| Zustand stores | `src/stores/*` | App domain state and local persistence |
| React Query | `src/lib/queryClient.ts`, `src/repositories/*` | Server cache, queries, mutations, optimistic updates |
| MMKV | `src/lib/storage.ts` | Fast local durable storage |
| Supabase client | `src/lib/supabase.ts` | Auth, database access, Edge Function calls |
| Domain helpers | `src/lib/*` | XP, rank, coach, roast, health, exercise intelligence |

### Domain Model

Shared domain types are defined in `src/types/index.ts`.

Core entities:

- `UserProfile`: user identity, rank, XP, streak, goal, macro targets, weak areas.
- `WorkoutLog`: workout date, exercises, duration, earned XP.
- `DietLog`: meals, macro totals, calories, compliance score.
- `RoastEntry`: generated feedback and correction.
- `WatchData`: recovery, HRV, sleep, steps, stress, calories.
- `Split`, `RoutineDay`, `RoutineExercise`: training plan structure.
- `WeightEntry`: weight history.

Zod schemas in `src/repositories/*` and `src/lib/*` validate data moving between the app and external services.

## Technical Architecture

This section explains how the internal pieces fit together at implementation level.

### Runtime Bootstrap

`src/app/_layout.tsx` is intentionally thin, but it owns the critical runtime order:

1. Configure native status bar.
2. Hydrate the persisted sync queue.
3. Ensure Supabase anonymous auth exists.
4. Load all MMKV-backed domain stores.
5. Migrate any legacy local profile ID to the Supabase auth user UUID.
6. Register foreground and background sync.
7. Render the tab shell only after fonts and app state are ready.

That order matters because screens expect a hydrated profile, auth session, and local cache before rendering domain workflows.

### Module Responsibilities

| Module | Responsibility | Notes |
| --- | --- | --- |
| `src/app/*` | Screen composition and user interaction | Screens should coordinate stores and components, not own reusable business rules |
| `src/components/*` | Reusable UI, charts, modals, scan sheets | UI components should receive data and callbacks from screens |
| `src/components/ui/*` | BRUTL design primitives | Buttons, cards, text, bars, badges, and toast primitives |
| `src/stores/*` | Local app state and MMKV persistence | Zustand stores own offline-first domain state |
| `src/repositories/*` | Query schemas and server-state helpers | React Query layer for Supabase-backed data |
| `src/lib/storage.ts` | MMKV wrapper and key registry | All durable local keys should be declared here |
| `src/lib/supabase.ts` | Supabase client and auth storage adapter | Auth tokens are persisted in MMKV |
| `src/lib/queryClient.ts` | React Query defaults and persisted cache | Query cache persists into MMKV |
| `src/lib/roast-engine.ts` | Roast payload building and SSE parsing | Falls back to mock roasts when Supabase config is missing |
| `src/lib/xp.ts` | XP and compliance formulas | Workout, diet, streak, and macro compliance rules |
| `src/lib/rank.ts` | Rank thresholds and rank helpers | Converts XP into rank and progress ranges |
| `src/lib/health-connect.ts` | Android Health Connect adapter | Reads HR, HRV, sleep, and steps |
| `supabase/functions/*` | Server-side AI and integration logic | Keeps provider secrets out of the mobile app |

### Store Ownership

Each store owns one domain slice and persists through `src/lib/storage.ts`.

| Store | Storage key | Owns | Important behavior |
| --- | --- | --- | --- |
| `user.store.ts` | `brutl:user`, `brutl:has_onboarded`, `brutl:avatar_uri` | Profile, onboarding, avatar, XP, rank, streak | Calculates macro targets, updates rank on XP changes, awards streak bonus |
| `workout.store.ts` | `brutl:workout_log` | Workout history | Adds latest logs first, computes recent logs and exercise baseline |
| `diet.store.ts` | `brutl:diet_log` | Meal logs and today's diet state | Recalculates totals and protein compliance on every meal change |
| `routine.store.ts` | `brutl:routines` | Splits, days, exercises, active split, pending day | Seeds default PPL, Upper/Lower, and Full Body splits; migrates old array format |
| `roast.store.ts` | `brutl:roast_log` | Roast history and active stream | Keeps the latest 100 roasts, appends streaming chunks in real time |
| `watch.store.ts` | `brutl:watch_vitals` | Health Connect vitals and sync metadata | Stores the latest vitals snapshot and availability state |
| `weight.store.ts` | `brutl:weight_log` | Local weight history | Keeps one entry per day in date-descending order |
| `sync.store.ts` | `brutl:sync_queue` | Offline mutation queue | Drains queued Supabase writes on foreground/background sync |

### Persistence Strategy

BRUTL uses two persistence paths:

1. Domain persistence through MMKV-backed Zustand stores.
2. Server-state persistence through TanStack Query's async storage persister.

Domain stores are the source of truth for the main app experience. React Query is used where the data has a clear server backing, such as weight entries. This avoids blocking the primary UX on network availability.

### Auth and Identity

Supabase auth is anonymous by default.

The app creates an anonymous session during bootstrap when no session exists. The Supabase auth storage adapter writes tokens into MMKV under the `supabase:auth:` prefix. After auth is ready, `_layout.tsx` checks the local profile ID and migrates it to the Supabase auth UUID when needed. That keeps local profile data compatible with Supabase row-level security and foreign keys.

### XP, Rank, and Progression

The gamification system is deterministic and local.

| Rule | Implementation |
| --- | --- |
| Workout XP | `calcWorkoutXP(exercises, durationMinutes)` uses session volume and duration intensity |
| Diet XP | `calcDietXP(complianceScore)` rewards macro compliance |
| Streak bonus | `calcStreakBonus(streakDays)` awards milestone bonuses at 7, 30, and 90 days |
| Macro compliance | `calcMacroCompliance(totalProteinG, targetProteinG)` currently focuses on protein target completion |
| Rank | `getRankFromXP(xp)` maps total XP to rank thresholds |

Rank thresholds:

| Rank | Title | XP threshold |
| --- | --- | --- |
| `E` | Couch Corpse | 0 |
| `D` | Warm Body | 500 |
| `C` | Iron Recruit | 2000 |
| `B` | Steel Hunter | 6000 |
| `A` | Shadow Athlete | 15000 |
| `S` | Iron Animal | 40000 |

### Macro Target Calculation

`user.store.ts` calculates targets during onboarding and profile edits.

The formula uses:

- Mifflin-St Jeor BMR.
- Activity multipliers for sedentary through very active users.
- Goal adjustment:
  - Fat loss: TDEE minus 500 calories.
  - Muscle gain: TDEE plus 250 calories.
  - Recomp: maintenance calories.
- Protein target:
  - Fat loss: 2.2 g/kg.
  - Muscle gain: 1.8 g/kg.
  - Recomp: 2.0 g/kg.
- Fat target: max of 0.9 g/kg or 20% of calories.
- Carbs fill the remaining calories.

### Server-State and Query Cache

`src/lib/queryClient.ts` configures React Query with:

- 5 minute `staleTime`.
- 24 hour garbage collection.
- 2 query retries.
- Exponential retry delay capped at 30 seconds.
- No mutation retries by default.
- Persisted query cache in MMKV under `brutl:query_cache`.

This keeps server-derived data available across app restarts while still allowing domain stores to stay fast and local.

### Offline Mutation Queue

`sync.store.ts` stores queued mutations as structured records:

```ts
interface QueuedMutation {
  id: string;
  domain: 'weight' | 'workout' | 'diet' | 'profile';
  op: 'upsert' | 'delete';
  table: string;
  payload: Record<string, unknown>;
  updated_at: number;
  attempts: number;
  createdAt: number;
}
```

Drain behavior:

- If another drain is already running, the new drain exits.
- If the device is offline, the drain exits.
- `upsert` uses Supabase `.upsert(payload, { onConflict: 'id' })`.
- `delete` uses Supabase `.delete().eq('id', payload.id)`.
- Each failure increments `attempts`.
- Conflicts and mutations with more than 5 failed attempts are removed from the queue.
- Successful mutations are dequeued immediately.

The queue drains when:

- The app returns to foreground.
- The background fetch task `brutl-sync-queue` runs.

### AI and External Service Boundary

The app never calls provider AI APIs directly for privileged operations. It calls Supabase Edge Functions, and those functions call providers.

```text
Mobile app
  -> Supabase Edge Function
      -> validates request with Zod
      -> reads server-side secret
      -> calls AI/provider API
      -> validates or normalizes output
      -> returns JSON or SSE to app
```

This gives the app a stable contract and keeps private keys out of the client bundle.

### Roast Streaming Contract

The `roast` Edge Function returns Server-Sent Events.

Stream event shapes consumed by `src/lib/roast-engine.ts`:

```ts
{ type: 'content_block_delta', delta: { text: string } }
{ type: 'correction', text: string }
```

Client behavior:

- `startStream()` clears the current roast and marks streaming active.
- Each `content_block_delta` appends text into the current roast.
- The final `correction` is saved separately.
- `finishStream()` persists the completed roast to the latest 100 roast entries.
- If the network request fails, local mock roast generation keeps the UI functional.

### Exercise Intelligence

Workout intelligence has two layers:

1. Local exercise profiles in `src/lib/workout-ai.ts`.
   - Muscle activation percentages.
   - Primary/secondary/stabilizer tiering.
   - Form cues.
   - Hypertrophy recommendations.

2. Remote exercise search through `src/lib/exercise-db-api.ts`.
   - Session and daily request limits.
   - In-memory query cache.
   - Name-to-entry cache.
   - Supabase proxy function boundary.

This lets common exercise UX stay instant while still supporting broader lookup when needed.

### Native Configuration

Native configuration is centralized in `app.json`.

Important settings:

| Config | Value |
| --- | --- |
| Scheme | `brutl` |
| UI style | Dark |
| Android package | `com.brutl.app` |
| Orientation | Portrait |
| Web output | Static |
| Typed routes | Enabled |
| React Compiler experiment | Enabled |
| Android min SDK | 26 through `expo-build-properties` |

Configured plugins:

- `expo-router`
- `expo-dev-client`
- `expo-camera`
- `expo-splash-screen`
- `react-native-health-connect`
- `expo-image-picker`
- `expo-build-properties`

## Data Flow

### Startup Flow

```text
Open app
  -> _layout.tsx runs
  -> Supabase anonymous auth session is created/restored
  -> MMKV-backed stores hydrate
  -> React Query cache hydrates
  -> sync queue hydrates
  -> onboarding redirect runs if profile is incomplete
  -> main tabs render
```

### Workout Flow

```text
User logs sets
  -> workout screen builds WorkoutLog
  -> XP is calculated from volume and duration
  -> workout store persists log to MMKV
  -> user store updates XP/rank/streak
  -> optional roast trigger uses latest workout data
```

### Diet Flow

```text
User logs meal
  -> meal is added manually, from search, scan, or favorite
  -> diet store updates today's DietLog
  -> macro totals and protein compliance recalculate
  -> diet XP is calculated
  -> meal roast can be triggered from compliance data
```

### Weight Sync Flow

```text
User adds weight entry
  -> React Query performs optimistic update
  -> if online, Supabase upsert runs immediately
  -> if offline, mutation is queued in sync.store
  -> background/foreground sync drains the queue later
```

## Supabase Edge Functions

Supabase functions live in `supabase/functions`.

| Function | Purpose |
| --- | --- |
| `roast` | Streams BRUTL feedback through Server-Sent Events using OpenRouter |
| `coach-periodize` | Generates a four-week progressive overload plan from workout logs |
| `meal-scan` | Uses Gemini vision to estimate macros from a meal photo |
| `exercise-ai` | Resolves or suggests exercise names/details |
| `exercise-db` | Proxies exercise database search/details |
| `meal-plan` | Generates meal planning output |

The app calls these functions through `EXPO_PUBLIC_SUPABASE_URL/functions/v1/<function-name>`.

Important implementation details:

- Edge Functions validate input with Zod.
- AI functions keep provider keys server-side.
- `roast` streams chunks back to the app and separates the final correction.
- Client code falls back to local/mock roast behavior when Supabase is not configured.

## Local Storage and Offline Sync

BRUTL stores important app state in MMKV under namespaced keys from `src/lib/storage.ts`.

Examples:

- `brutl:user`
- `brutl:workout_log`
- `brutl:diet_log`
- `brutl:watch_vitals`
- `brutl:routines`
- `brutl:weight_log`
- `brutl:sync_queue`
- `brutl:query_cache`

The sync queue is managed by `src/stores/sync.store.ts`.

It supports:

- Offline mutation enqueueing.
- Foreground drain when the app becomes active.
- Background drain through `expo-background-fetch` and `expo-task-manager`.
- Retry tracking.
- Automatic drop after repeated failures.

This keeps the app usable without a perfect network connection.

## Health Connect

Android Health Connect integration is handled in `src/lib/health-connect.ts` and `src/stores/watch.store.ts`.

The app requests read access for:

- Heart rate.
- Heart rate variability.
- Sleep sessions.
- Steps.

BRUTL derives a recovery score from HRV and sleep data. These vitals can influence app-open roasts and dashboard recovery status.

## Design System

The app uses a dark, high-contrast design system defined in `src/constants/theme.ts` and wrapped by UI primitives in `src/components/ui`.

Core UI primitives:

- `BrutlCard`
- `BrutlButton`
- `BrutlText`
- `MacroBar`
- `XPBar`
- `RankBadge`
- `XPToast`

The product style is direct, compact, and data-heavy. Screens should prioritize fast scanning, clear metrics, and strong action affordances.

## Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start Expo dev server |
| `npm run android` | Build/run Android locally |
| `npm run ios` | Build/run iOS locally |
| `npm run web` | Start Expo web |
| `npm run lint` | Run Expo lint |
| `npm run reset-project` | Run project reset helper |

## Builds

EAS config lives in `eas.json`.

Profiles:

- `development`: internal development client.
- `preview`: internal preview build.
- `production`: production build with auto-increment.

Android package name:

```text
com.brutl.app
```

Configured native permissions include:

- Camera.
- Record audio.
- Health Connect heart rate, HRV, sleep, and steps.

## Development Notes

- Read the Expo SDK 56 docs before changing Expo APIs or native config.
- Prefer typed domain models from `src/types/index.ts`.
- Validate external data with Zod before trusting it.
- Keep server secrets in Supabase Edge Function secrets.
- Do not put provider secrets in `EXPO_PUBLIC_*` variables.
- Keep the app local-first: update local state immediately, then sync.
- Use the existing stores and UI primitives before adding new architecture.
- Test native features in a development build, not Expo Go.
