# Daily Habits Tracking

> A daily system that turns intentions into actions — track the habits that matter, see your consistency at a glance, and build the routines that make you the person you want to be.

---

## Part A: The Story

### Press Release

**Thrive Turns Your Daily Habits Into a System You Actually Stick With**

**For anyone who knows what they should do every day but struggles to make it automatic — Thrive gives you a daily habits tracker that's simple enough to use in 30 seconds and smart enough to keep you honest.**

You've tried habit trackers before. You set up twelve habits on a Monday, checked them off for a week, and quietly abandoned the app by Thursday of week two. The problem wasn't motivation — it was friction. Too many taps. No sense of progress. No reason to come back.

Thrive takes a different approach. Your daily view shows exactly what's on your plate today — habits scheduled for this day, sorted and ready to check off. A calendar strip with progress rings gives you instant visual feedback on how the week is shaping up. Streaks reward your consistency without punishing a bad day. And if a habit is linked to Apple Health, it completes itself when you hit your threshold — no manual check-in needed. When life gets in the way, swipe to snooze a habit for the day instead of breaking your streak. At the end of each week, your habits feed into an AI-powered weekly recap that surfaces patterns you'd never spot on your own.

> "I used to overthink my mornings. Now I open Thrive, see my five habits, and just start. Checking them off feels like winning before the day even gets hard."
> — Jake, Thrive user

Open Thrive, set up your habits, and start showing up as the version of yourself you're proud of.

### Marketing Angles

**App Store / changelog blurb:**
Track daily habits with zero friction. Set your frequency, check them off each day, and watch your streaks grow. Link habits to Apple Health for automatic completion. Your daily system for becoming who you want to be.

**Push notification:**
You've got habits waiting — tap to check in and keep your streak alive.

**Social post:**
The best version of you is built one day at a time. Thrive makes daily habits feel effortless — what are you tracking today?

---

## Part B: Product Definition

### Jobs to Be Done

- When I start my day, I want to see exactly which habits I need to do today, so I can focus on action instead of figuring out what's on my plate.
- When I complete a habit, I want to check it off with a single tap, so I get an immediate sense of progress without friction.
- When I'm having an off day, I want to snooze a habit instead of skipping it silently, so I maintain my system without guilt.
- When I look at my week, I want to see my consistency at a glance, so I can tell whether I'm building momentum or slipping.
- When I'm active and wearing my Apple Watch, I want my fitness habits to complete automatically, so tracking doesn't add work to my workout.
- When I've been consistent for days in a row, I want to see my streak grow, so I feel motivated to keep the chain going.

### Target Users

- **Aspirational self-improvers** — people who set intentions ("I want to read every day," "I want to meditate") and need a lightweight system to follow through.
- **Routine builders** — users who thrive with structure and want a clear list of what to do each day rather than an open-ended to-do list.
- **Health-conscious users** — people already tracking steps, workouts, or other metrics in Apple Health who want their habits connected to real data.
- **New and returning users** — the onboarding flow gets users from zero to tracking in under a minute, making the feature accessible to first-time habit trackers and people restarting after a break.

### Solution Overview

Daily habits tracking is the core loop of Thrive. The experience centers on the **Home tab**, which serves as the user's daily dashboard.

**Habit setup:** Users create habits with a name, optional description, and a frequency — either specific days of the week (e.g., Mon/Wed/Fri) or a target number of times per week (e.g., 5x/week). Optionally, habits can be linked to an Apple Health metric (steps, weight, resting heart rate, etc.) with a threshold for auto-completion.

**Daily view:** The Home screen opens to today's date with a horizontal calendar strip at the top. Each day shows a progress ring reflecting completion status. Below the strip, habits are organized into three groups:
1. **Incomplete** — habits scheduled for today that haven't been completed yet, shown first to drive action.
2. **Completed** — habits already checked off, collapsed below.
3. **Snoozed** — habits the user has deliberately deferred for the day.

Users tap a habit to mark it complete (or uncomplete). Swiping right on an incomplete habit snoozes it for the day. Tapping a snoozed habit unsnoozes it.

**Smart scheduling:** Habits with specific days only appear on those days. Frequency-based habits (e.g., 5x/week) appear as "required" when the remaining days in the week equal or are fewer than the completions still needed — ensuring users stay on pace without being nagged early in the week.

**Auto-completion:** When the app comes to the foreground and the user has Apple Health authorized, Thrive checks all habits with `auto_complete` enabled. If the linked health metric meets the threshold for today, the habit is automatically marked complete — no tap needed.

**Streaks:** A streak badge on the Home screen shows how many consecutive days the user has completed at least one habit. The badge distinguishes between "streak earned today" and "streak at risk" to create gentle urgency.

**Reminders:** A daily push notification at 8 PM reminds users to check in on their habits if they haven't already.

**Management:** The My Habits tab lets users view all active habits, create new ones, edit existing ones, and delete (soft-deactivate) habits they no longer want.

**Onboarding:** New users set up their first habits during onboarding with a streamlined flow — name, description, frequency, and specific days. Health metric linking is available post-onboarding in the full habit form.

### Acceptance Criteria

#### Must Have

- [ ] Home screen displays habits for the selected date, grouped into incomplete, completed, and snoozed sections
- [ ] Calendar strip shows the current week with progress rings per day; tapping a day changes the selected date
- [ ] Tapping an incomplete habit marks it as completed; tapping a completed habit marks it as incomplete
- [ ] Swiping right on an incomplete habit snoozes it for the selected date
- [ ] Tapping a snoozed habit unsnoozes it and returns it to the incomplete section
- [ ] Habits with specific days only appear on their scheduled days
- [ ] Frequency-based habits show as required when remaining week days ≤ remaining completions needed
- [ ] Streak badge displays consecutive days with at least one completion, with earned/at-risk state
- [ ] Habit creation supports name, description, frequency per week, and specific day selection
- [ ] Habit editing allows changing name, description, frequency, specific days, and health metric linking
- [ ] Habit deletion soft-deactivates the habit (sets `is_active = false`) and removes it from daily view
- [ ] Auto-completion triggers on app foreground for habits linked to Apple Health metrics that meet their threshold
- [ ] Daily push notification fires at 8 PM as a check-in reminder
- [ ] Onboarding flow allows creating initial habits before reaching the main app

#### Nice to Have

- [ ] Custom habit ordering (drag-and-drop or manual priority)
- [ ] Categories or time-of-day grouping (Morning, Afternoon, Evening)
- [ ] Per-habit streaks showing consecutive completions for individual habits
- [ ] Per-habit custom reminder times instead of a single global reminder
- [ ] Habit archiving as a distinct state from deletion
- [ ] Health metric linking available during onboarding (not just post-onboarding)

### Success Metrics

**Quantitative:**
- Daily active usage — % of users who open the Home tab and interact with habits each day
- Habit completion rate — average daily completions as a % of scheduled habits
- Streak length distribution — median and P90 streak lengths across the user base
- Retention at 2 weeks — % of users still completing habits 14 days after creating their first habit
- Auto-completion adoption — % of users with at least one auto-complete habit enabled

**Qualitative:**
- Users describe habits as "easy to track" and "part of my routine" in feedback
- Users report feeling more consistent and proud of their daily progress
- The daily check-in feels like a positive ritual, not a chore

### Open Questions

- Should habit ordering be a fast-follow or is `created_at` order sufficient for the current user base?
- Is one global 8 PM reminder adequate, or do users need per-habit reminder times to be effective?
- Would time-of-day grouping (Morning/Evening) meaningfully reduce friction for users with 7+ habits?
- Should the streak model reward "all habits completed" days differently from "at least one habit" days?
- How should the app handle users who create 15+ habits — is there a UX ceiling where the daily list becomes overwhelming?

### Implementation Notes

- **Home screen**: `app/(tabs)/index.tsx` — renders the daily view with `CalendarStrip`, habit sections (incomplete/completed/snoozed), Top 3 Todos, and Daily Journal.
- **Habit components**: `components/PriorityItem.tsx` (daily tracking row with checkbox, weekly dots, swipe-to-snooze), `components/HabitItem.tsx` (management card in My Habits tab), `components/HabitForm.tsx` (create/edit form).
- **Hooks**: `hooks/useHabitsQuery.ts` — provides `useHabits`, `useCompletionsForDate`, `useCompletionsForWeek`, `useStreak`, `useToggleCompletion`, `useSnoozeHabit`, `useCreateHabit`, `useUpdateHabit`, `useDeleteHabit`, and related queries.
- **Data layer**: Supabase tables `habits` (with `frequency_per_week`, `specific_days` jsonb, `metric_type`, `metric_threshold`, `auto_complete`), `habit_completions` (unique on `habit_id, completed_date`), `habit_snoozes` (unique on `habit_id, snoozed_date`).
- **Health integration**: `lib/health.ts` — reads Apple Health metrics; `lib/habits.ts` contains `checkAutoCompletions()` which runs on app foreground.
- **Notifications**: `lib/notifications.ts` — schedules the 8 PM daily reminder.
- **Scheduling logic**: `lib/habits.ts` — `getScheduledHabitsForDate()` determines which habits are required/optional on a given date.
- **Analytics**: Events tracked include `habit_created`, `habit_completed`, `habit_uncompleted`, `habit_snoozed`, `habit_unsnoozed`, `habit_updated`, `habit_deleted`, and `onboarding_habit_added`.
