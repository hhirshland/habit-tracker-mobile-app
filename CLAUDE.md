# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

**Thrive** is a habit-tracking mobile app built with Expo (React Native) and Supabase. Users create habits with flexible scheduling (specific days or N-times-per-week), track daily completions, snooze habits, and view streaks. The app targets iOS, Android, and web.

## Tech Stack

- **Framework:** Expo SDK 54 / React Native 0.81 / React 19
- **Routing:** Expo Router 6 (file-based routing with typed routes)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Language:** TypeScript 5.9 (strict mode)
- **State management:** React Context (`AuthContext`) + component-level `useState`
- **Styling:** React Native `StyleSheet` with centralized theme tokens (`lib/theme.ts`)
- **Animations:** React Native Reanimated 4 + Gesture Handler 2
- **Build system:** EAS (Expo Application Services)

## Commands

```bash
npx expo start          # Start development server
npx expo start --ios    # Start on iOS simulator
npx expo start --android # Start on Android emulator
npx expo start --web    # Start web version
```

There is no linter, formatter, or test runner configured. `react-test-renderer` is installed but no tests exist yet.

## Project Structure

```
app/                        # Screens (Expo Router file-based routing)
  _layout.tsx               # Root layout: auth gating, font loading, splash screen
  +not-found.tsx
  (auth)/                   # Auth screens (unauthenticated users)
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
  (onboarding)/             # First-run onboarding
    _layout.tsx
    index.tsx               # Initial habit creation (min 1 required)
  (tabs)/                   # Main app (bottom tab navigation)
    _layout.tsx
    index.tsx               # "Today's Priorities" — daily habit view
    habits.tsx              # "My Habits" — CRUD management
    profile.tsx             # Profile settings, avatar upload
components/                 # Reusable UI components
  CalendarStrip.tsx         # Horizontal scrollable calendar with progress rings
  HabitForm.tsx             # Create/edit habit form (specific days or frequency mode)
  HabitItem.tsx             # Habit list item for My Habits view
  PriorityItemVariantA.tsx  # Daily habit card with complete/snooze actions
  __tests__/                # Empty — no tests yet
contexts/
  AuthContext.tsx            # Auth state, session management, profile fetching
lib/
  supabase.ts               # Supabase client singleton (uses AsyncStorage for sessions)
  habits.ts                 # All habit data operations (CRUD, completions, snoozes, streaks)
  types.ts                  # TypeScript interfaces: Profile, Habit, HabitCompletion, HabitSnooze
  theme.ts                  # Design tokens: colors, spacing, borderRadius, fontSize, shadows
supabase/
  schema.sql                # Full database schema with RLS policies and triggers
assets/                     # Images and fonts
constants/                  # Color constants
```

## Architecture & Patterns

### Navigation Flow

The root layout (`app/_layout.tsx`) checks auth state and routes accordingly:
1. No session -> `/(auth)/sign-in`
2. Session but `has_onboarded === false` -> `/(onboarding)`
3. Session and onboarded -> `/(tabs)`

### Data Layer

- All Supabase queries live in `lib/habits.ts` — screens call these functions, not Supabase directly
- Auth operations live in `contexts/AuthContext.tsx`
- The Supabase client is a singleton in `lib/supabase.ts`
- No query caching library (no React Query / TanStack Query)
- Data is fetched on screen mount and via pull-to-refresh

### State Management

- **Auth state:** `AuthContext` provides `session`, `user`, `profile`, `loading`, and auth methods (`signIn`, `signUp`, `signOut`, `refreshProfile`)
- **Screen data:** Local `useState` in each screen; no global data store beyond auth
- **No Redux/MobX/Zustand** — the app uses Context + hooks

### Component Conventions

- Components receive data + callbacks as props (presentation components)
- Parent screens handle data fetching and pass results down
- Styles are defined inline with `StyleSheet.create()` at the bottom of each file
- All imports use the `@/*` path alias (e.g., `import { theme } from '@/lib/theme'`)

### Habit Scheduling Logic

Two scheduling modes exist:
- **Specific days:** User picks which days of the week (stored as `specific_days: number[]`, 0=Sun through 6=Sat)
- **Frequency-based:** User sets times per week (`frequency_per_week: 1-7`), with `specific_days: null`

The `isHabitRequiredToday()` function in `lib/habits.ts` determines urgency:
- Specific-day habits: required if today is one of the selected days
- Frequency habits: required when remaining days in the week equals remaining completions needed

### Soft Deletes

Habits use soft deletion (`is_active: false`). All queries filter by `is_active = true`.

## Database Schema

Four tables with Row-Level Security (all scoped to `auth.uid() = user_id`):

| Table | Purpose | Key Constraints |
|---|---|---|
| `profiles` | User profile (auto-created via trigger on signup) | `user_id` unique, references `auth.users` |
| `habits` | Habit definitions | `frequency_per_week` CHECK 1-7, `specific_days` JSONB |
| `habit_completions` | Daily completion records | UNIQUE on `(habit_id, completed_date)` |
| `habit_snoozes` | Daily snooze records | UNIQUE on `(habit_id, snoozed_date)` |

Schema is in `supabase/schema.sql`. All tables have `created_at`/`updated_at` with auto-update triggers. Cascade deletes on user removal.

## Design System

The centralized theme in `lib/theme.ts` defines:

- **Primary color:** `#6C63FF` (purple)
- **Spacing scale:** xs(4), sm(8), md(16), lg(24), xl(32), xxl(48)
- **Border radius:** sm(8), md(12), lg(16), xl(24), full(9999)
- **Font sizes:** xs(12), sm(14), md(16), lg(18), xl(22), xxl(28), xxxl(34)
- **Shadows:** sm, md, lg presets for cross-platform elevation

Always use `theme.*` values instead of hardcoded numbers for spacing, colors, and typography.

## Environment Variables

Required in `.env` (see `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

These are prefixed with `EXPO_PUBLIC_` for client-side access. Production values are set in `eas.json`.

## Key Conventions

- **TypeScript strict mode** is enabled — do not use `any` types
- **Path aliases:** Use `@/` for imports from the project root (e.g., `@/lib/theme`, `@/contexts/AuthContext`)
- **Date format:** All dates are stored and passed as `YYYY-MM-DD` strings in the user's local timezone
- **Error handling:** Try/catch on all Supabase calls, errors shown via `Alert.alert()`
- **No testing framework configured** — `components/__tests__/` exists but is empty
- **Portrait-only** orientation (set in `app.json`)
- **New Architecture** is enabled (`newArchEnabled: true`)
- **Expo plugins:** `expo-router`, `expo-secure-store`

## Known Limitations & Planned Work

See `TODO.md` for the full list. Key items:

- **No automated tests** — test infrastructure needs to be set up
- **No analytics** — PostHog integration is planned
- **Streak calculation** counts consecutive calendar days with completions, but should count consecutive days where the user actively logged (not backfilled)
- **Planned features:** Progress tab (metrics visualization), Identity statements (tie habits to personal identity)
- **No offline support** — all operations require network connectivity
