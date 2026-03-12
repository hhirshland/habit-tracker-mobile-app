# Feature Positioning Map

> A living reference that maps each major feature to its role in Thrive's identity-first thesis. Update this whenever a feature is added, removed, repositioned, or rebranded.

## The Daily Loop

Thrive's experience is built around a daily cycle of intentionality:

**Morning** (set direction) → **Daytime** (take action) → **Evening** (reflect and close the loop)

Features that don't strengthen one of these moments or the connections between them should be scrutinized.

## Feature Map

| Feature | Role in Identity Thesis | Loop Position | Internal Key(s) | User-Facing Name | PRD |
|---|---|---|---|---|---|
| Daily Intentions | Morning intention-setting ritual; builds self-trust through daily follow-through | Morning | `top3_todos_enabled`, `daily_todos` table, `Top3TodosSection.tsx` | "Daily Intentions" | `docs/prds/top-3-todos.md` |
| Habits | Core identity-aligned actions; the primary vehicle for becoming who you want to be | Daytime | `habits` table, `useHabitsQuery` | "My Habits" | `docs/prds/daily-habits-tracking.md` |
| Journal | Evening reflection; captures wins, tensions, and gratitude to close the daily loop | Evening | `journal_enabled`, `daily_journal_entries` table | "Journal" | `docs/prds/daily-journal.md` |
| Evening Check-In Call | AI-guided reflection + accountability; walks through journal, intentions, and habits | Evening | `evening_call_enabled`, `vapi-server` edge function | "Evening Check-In" | `docs/prds/evening-check-in-call.md` |
| Identity Statements | The foundation — who the user is becoming; habits and intentions flow from this | Always | `identity_statements` table, `useIdentityQuery` | "My Identity" | `docs/prds/identity-first-habits.md` |
| Goals | Short-term motivation targets; secondary to identity but provides tangible milestones | Ongoing | `goals` table, `goal_entries` table | "Goals" | `docs/prds/goals.md` |
| Weekly Recap | Evidence of identity change over time; AI-generated summary of the week | Weekly | `weekly_recaps` table, `generate-weekly-recap` edge function | "Weekly Recap" | `docs/prds/weekly-recaps-v2.md` |
| Health Metrics | Objective data from Apple Health supporting identity claims (e.g., "I am an athlete") | Ongoing | Apple Health integration, `metricsConfig.ts` | "Metrics" | — |
| Daily Reminders | Push notifications for morning intentions (8am) and evening habits (8pm) | Morning + Evening | `notifications.ts` | "Daily Reminders" | `docs/prds/daily-reminders.md` |

## Removed / Deprecated

| Feature | What Happened | When |
|---|---|---|
| Archetypes / Personalize Screen | Removed from onboarding; was adding a step without clear identity value | March 2026 |
| My Habits Tab | Consolidated into Profile; reduced tab bar to 3 tabs (Home, Progress, Profile) | March 2026 |
| Recent Workouts (Progress) | Removed from Progress tab; was noise not tied to identity actions | March 2026 |
| `steps` goal type | Removed from goal creation; overlapped with health metrics display | March 2026 |
| `weekly_workouts` goal type | Removed from goal creation; overlapped with health metrics display | March 2026 |

## How to Update This Document

- **Adding a feature:** Add a row to the Feature Map with all columns filled
- **Removing a feature:** Move the row to Removed / Deprecated with a brief explanation
- **Rebranding:** Update the "User-Facing Name" column; keep "Internal Key(s)" unchanged
- **Repositioning:** Update the "Role in Identity Thesis" and "Loop Position" columns
