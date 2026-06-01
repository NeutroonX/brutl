# BRUTL — Claude Code Project Context

## What this project is
BRUTL is an Android fitness app that brutally roasts users based on their actual workout, diet, and smartwatch data. It uses the Claude API as its roast engine and Solo Leveling-style gamification (ranks, quests, XP).

## Read first
Before touching any code, read `BRUTL_SPEC.md` in full. It contains:
- Complete product spec and AI persona
- All data models (Kotlin)
- Tech stack decisions
- Build phase order
- Claude API system prompt for the roast engine

## How to work on this project

### Starting P1 (MVP)
1. Scaffold Android project with Jetpack Compose + MVVM
2. Set up Room database with models from spec Section 9
3. Implement RoastEngine.kt (Claude API, system prompt from Section 4)
4. Build dark theme tokens (Section 1 colors)
5. Build onboarding flow exactly as spec Section 6 describes
6. Build home screen (rank strip, XP bar, watch vitals, quest list)

### Claude API usage
- Model: `claude-sonnet-4-20250514`
- Always stream roast responses (feels more alive)
- System prompt lives in `RoastEngine.kt` as a constant
- Never expose the API key in client code — proxy through Supabase Edge Function

### Key constraints
- No light mode
- No skip button on onboarding screen 1
- Rank up = full-screen animation moment
- Watch integration uses Health Connect as the unified layer

## File structure
See BRUTL_SPEC.md Section 10 for full project structure.

## Current phase
P1 — MVP. Start here.
