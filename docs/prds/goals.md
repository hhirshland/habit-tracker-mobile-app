# Goals

> Set a measurable target, connect it to your real data, and watch the progress bar fill up as you get closer every day.

---

## Part A: The Story

### Press Release

**Thrive Now Lets You Set Real Goals — and Actually Track Them**

**For people who want more than a to-do list — Thrive goals connect to your Apple Health data and show you exactly how far you've come and how far you have to go.**

You want to lose 15 pounds. Or run a faster 5K. Or lower your resting heart rate. You know the target, but the day-to-day grind makes it hard to see whether you're actually getting there. You check the scale, check your watch, check your app — and the numbers blur together. Progress feels invisible until suddenly it isn't, or until you give up because you couldn't tell it was happening.

Thrive Goals give you a clear line from where you are to where you want to be. Pick from goal templates like Target Weight, Daily Steps, Resting Heart Rate, Running PR, or create your own. For health metrics, Thrive pulls your latest data straight from Apple Health — no manual logging. You see your current value, your target, and a progress bar that fills in as you close the gap. Tap into any goal to see a chart of your actual data over time, a projected trajectory based on your trend, and an estimated completion date powered by real math, not wishful thinking.

> "I set a weight goal in January and kind of forgot about it. A few weeks later I opened Thrive, saw the progress bar at 40%, and realized — wait, this is actually working. That was the push I needed to keep going."
> — Jordan, Thrive user

Open Thrive, tap the + on your Progress tab, and set your first goal in under a minute.

### Marketing Angles

**App Store / changelog blurb:**
Set measurable goals for weight, steps, heart rate, running PRs, and more. Thrive connects to Apple Health to track your progress automatically — complete with charts, trend projections, and a progress bar that shows exactly how close you are.

**Push notification:**
You're closer than you think. Set a goal in Thrive and see your real progress.

**Social post:**
Saying "I want to lose weight" is easy. Watching the progress bar creep from 0% to 47% to 83%? That's what makes it real. Thrive Goals — set the target, connect your data, watch it happen.

---

## Part B: Product Definition

### Jobs to Be Done

- When I have a health or fitness target in mind, I want to set it as a concrete goal with a number, so I can measure progress instead of guessing.
- When I'm working toward a goal over weeks or months, I want to see a progress bar and current-vs-target snapshot, so I can tell at a glance whether I'm on track.
- When I want to understand my trajectory, I want to see a chart with my actual data and a projected trend line, so I can estimate when I'll reach my target.
- When my data already lives in Apple Health, I want my goal to pull from it automatically, so I don't have to log the same number twice.
- When I have a goal that isn't covered by a template, I want to create a custom goal with my own title and unit, so I can track anything that matters to me.

### Target Users

- **Health-focused trackers** — users actively working on weight loss, fitness improvement, or body composition who need a clear target and measurable progress.
- **Apple Health users** — iPhone users who already have health data flowing into HealthKit from their scale, Apple Watch, or fitness apps. Goals become effortless because the data is already there.
- **Long-horizon improvers** — users pursuing goals that take weeks or months (not days), who need sustained motivation and visibility into gradual change.
- **Runners and athletes** — users training toward a specific performance benchmark like a 5K PR or daily step count.

### Solution Overview

Goals live on the Progress tab alongside weekly recaps. Users create goals through a two-step flow: pick a template, then fill in the details.

**Templates:** Nine goal types cover the most common targets — weight, body fat %, BMI, lean body mass, running PR, daily steps, resting heart rate, weekly workouts, and custom. Each template pre-fills sensible defaults (title, unit, data source) so creation is fast.

**Data sources:** Goals connected to Apple Health (weight, body fat, BMI, lean body mass, steps, resting HR) pull data automatically. Manual goals (running PR, custom) let users log entries directly from the goal detail view.

**Progress view:** Each goal appears as a compact card showing an icon, progress bar, current value, arrow, and target value. Weight goals also display the selected loss rate (e.g., "1 lbs/week"). Tapping a card opens the detail modal.

**Detail modal:** The full goal view includes key stats (current value, target, percent complete), a chart plotting actual data points over time with a goal trajectory line and a projected trend with confidence band, insights about pace and estimated completion, and — for manual goals — a button to log a new entry. Users can also delete a goal from this view.

**Charts and projections:** The chart uses weighted linear regression with a 14-day half-life to compute the user's actual trend, then projects it forward to estimate a completion date. A confidence band shows the range of likely outcomes. The goal trajectory line shows the ideal straight-line path from start to target.

**Weekly recaps integration:** Goal progress is included in the AI-generated weekly recap. Before generation, Apple Health data for the week is synced into the `goal_entries` table so the edge function can reference it. Each goal appears in the recap with a title and narrative progress summary.

### Acceptance Criteria

#### Must Have

- [ ] Users can create a goal by selecting one of 9 templates (weight, body fat, BMI, lean body mass, running PR, steps, resting HR, weekly workouts, custom)
- [ ] Goal creation form pre-fills title, unit, and current value (from Apple Health where applicable)
- [ ] Weight goals include a rate selector (0.5, 1, 1.5, or 2 lbs/week)
- [ ] Running PR goals include a distance selector (1 Mile, 3 Miles, 5K, 10K, Half Marathon, Marathon)
- [ ] Custom goals accept a user-defined title and unit
- [ ] Start date supports presets (today, 1 week ago, 1 month ago, 3 months ago) and custom date entry
- [ ] Each goal displays as a card with icon, progress bar, percentage, current value, and target value
- [ ] Progress percentage is computed correctly from start value, current value, and target value
- [ ] Tapping a goal card opens a detail modal with stats, chart, and insights
- [ ] Goal chart plots actual data points, goal trajectory line, and projected trend with confidence band
- [ ] Projection uses weighted linear regression with recent data weighted more heavily
- [ ] Apple Health goals automatically reflect the latest HealthKit data as the current value
- [ ] Manual goals (running PR, custom) allow users to log entries from the detail modal
- [ ] Users can delete a goal from the detail modal (soft delete via `is_active: false`)
- [ ] Goal progress is included in AI-generated weekly recaps

#### Nice to Have

- [ ] Running PR times display in mm:ss format rather than raw decimal minutes
- [ ] Step counts display in compact format (e.g., "8.5k" instead of "8500")
- [ ] Large values (100+) display as rounded integers for cleaner cards
- [ ] Goal cards show the rate subtitle when a rate is configured

### Success Metrics

**Quantitative:**
- Goal adoption rate — % of active users who create at least one goal
- Goals per user — average number of active goals among goal users
- Goal detail view rate — how often users tap into goal details (signal of engagement with progress tracking)
- Manual entry frequency — how often users with manual goals log new values (proxy for sustained engagement)
- Goal retention — % of goals still active after 30 and 60 days (not deleted)

**Qualitative:**
- Users report that seeing the progress bar motivates them to keep going
- Users find the projected completion date credible and useful
- Apple Health integration feels seamless — users don't think about where the data comes from

### Open Questions

- What is the right default behavior when Apple Health returns no data for a metric (e.g., user has no body fat readings)? Currently shows "—" as the current value.
- How should the chart behave when there are very few data points (1-2)? Projection confidence is low but the chart still renders.
- Should there be a target date field in addition to the rate for weight goals, or is the projected completion date sufficient?
- Is the 14-day half-life for weighted regression the right decay constant for all goal types, or should faster-moving metrics (steps) use a shorter window?

### Implementation Notes

- **Database:** `goals` and `goal_entries` tables (`supabase/migrations/002_add_goals.sql`) with RLS policies scoped to `auth.uid()`. Goals are soft-deleted (`is_active: false`). Goal entries are unique on `(goal_id, recorded_date)` to prevent duplicate daily values.
- **Lib:** `lib/goals.ts` handles CRUD operations (`createGoal`, `deleteGoal`, `logGoalEntry`, `getGoalHistoryData`, `getGoalCurrentValue`) and health data sync (`syncHealthGoalEntries`). `lib/goalMath.ts` contains the projection engine — weighted linear regression, trajectory computation, and progress percentage calculation.
- **Hooks:** `hooks/useGoalsQuery.ts` provides React Query hooks for fetching goals and entries, creating goals, deleting goals, and logging entries.
- **Components:** `components/AddGoalSheet.tsx` (two-step creation flow), `components/GoalCard.tsx` (compact progress card), `components/GoalDetailModal.tsx` (full stats, chart, and actions), `components/GoalChart.tsx` (SVG chart with trajectory, projection, and confidence band).
- **Screens:** Goals section lives on `app/(tabs)/progress.tsx`. Onboarding has a separate category-based goal selection screen (`app/(onboarding)/goals.tsx`) that collects aspirational categories, not numeric goals.
- **Health integration:** Apple Health data flows via `lib/health.ts` into `getGoalCurrentValue` for real-time display. `syncHealthGoalEntries` upserts HealthKit data into `goal_entries` for a date range, enabling the weekly recap edge function to reference goal data it can't fetch from HealthKit directly.
- **Edge function:** `supabase/functions/generate-weekly-recap/index.ts` queries `goals` and `goal_entries` to include `goal_progress` in the AI-generated recap content.
- **Analytics:** Events in `lib/analytics.ts` — `goal_created`, `goal_deleted`, `goal_entry_added`, and `onboarding_goal_selected`.
