# Daily Journal

> A simple, structured daily reflection built into your habit tracking routine — one win, one tension, one gratitude — that turns routine check-ins into a record of personal growth.

---

## Part A: The Story

### Press Release

**Thrive Adds Daily Journaling — Reflect on Your Day in Under 60 Seconds**

**For habit builders who want to track more than checkboxes — Thrive now includes a lightweight daily journal that captures what matters without the blank-page problem.**

You finished your habits for the day. You know *what* you did — but do you remember *how it felt*? Most habit trackers stop at completion. They don't help you notice the win that made your day, the friction that slowed you down, or the small thing you're grateful for. That context fades fast. A week later, you can't tell Tuesday from Thursday.

Thrive's Daily Journal gives you three focused prompts — one win, one point of tension, one gratitude — right alongside your daily habits. No blank page, no pressure to write a novel. Just three honest sentences that take less than a minute. Your entries are saved, browsable in your Progress history, and feed directly into your AI-generated weekly recaps, giving Thrive the context to surface real reflection themes — not just habit stats.

> "I started journaling every night after I check off my habits. It takes me maybe 30 seconds, and when my weekly recap mentions something I wrote on Tuesday, it actually feels personal."
> — Sam, Thrive user

Enable the Daily Journal in your profile or during onboarding, and start reflecting tonight.

### Marketing Angles

**App Store / changelog blurb:**
New: Daily Journal. Three quick prompts — your win, your tension, your gratitude — right on your Home screen. Your entries feed into weekly recaps so your reflections actually go somewhere. Enable it in your profile.

**Push notification:**
Don't forget your journal entry today — one win, one tension, one gratitude. Takes 30 seconds.

**Social post:**
The best journal habit isn't a blank page — it's three honest sentences. Thrive's Daily Journal: one win, one tension, one gratitude. Every day. What's yours today?

---

## Part B: Product Definition

### Jobs to Be Done

- When I finish my daily habits, I want to capture a quick reflection on my day, so I can build self-awareness without it feeling like a chore.
- When I look back at my week, I want to see what I wrote about each day, so I can remember how I felt — not just what I checked off.
- When I receive my weekly recap, I want it to reference my actual reflections, so the insights feel personal and grounded in my experience.

### Target Users

- **Active habit trackers** who are already checking in daily and want to add a lightweight reflection layer on top of their routine.
- **Users who tried journaling before but quit** because a blank page felt too open-ended — the structured prompts lower the barrier.
- **Users who value the weekly recap** and want it to feel more personal by giving the AI real reflection data to work with.

### Solution Overview

The Daily Journal is an optional feature (toggled on/off in Profile and during onboarding) that adds a structured reflection entry to each day. The experience is designed to be fast, frictionless, and integrated into the existing daily flow rather than being a separate destination.

**Entry flow:**
1. On the Home tab, a "Daily Journal" card appears below the habit list when the feature is enabled.
2. The card shows either "Journal entry" (incomplete) or "Journal completed" (all three fields filled) with a completion indicator.
3. Tapping the card opens a page-sheet modal with three prompted text fields:
   - **One Win** ("What went well today?") — placeholder: "I accomplished..."
   - **One Point of Tension** ("What challenged you today?") — placeholder: "I struggled with..."
   - **One Gratitude** ("What are you grateful for?") — placeholder: "I'm grateful for..."
4. Each field supports multiline text up to 500 characters.
5. The Save button is enabled once all three fields are non-empty. Saving upserts the entry (create or update).
6. Unsaved drafts persist in memory across date navigation, so switching days and coming back doesn't lose work.

**History:**
- The Progress tab shows a "Journal" section with expandable entry cards for the last 90 days (7 initially visible, load 14 more at a time).
- Each card shows the date and a one-line preview of the win. Expanding reveals all three prompts.

**Integrations:**
- Journal completion is reflected in the Home calendar strip's daily progress.
- The AI evening call (via VAPI) can save a journal entry through the `save_journal` tool, capturing win/tension/gratitude from the conversation.
- Journal entries are passed to the weekly recap edge function and surface as `reflection_themes` in the AI-generated recap.
- Journal completion counts toward "qualifying weeks" for weekly recap eligibility alongside habits and goals.
- Habit reminder notifications mention the journal when enabled ("Don't forget your journal entry").

### Acceptance Criteria

#### Must Have

- [ ] Journal card appears on Home tab when `journal_enabled` is true in user settings, and is hidden when false
- [ ] Tapping the card opens a page-sheet modal with three prompted fields: Win, Tension, Gratitude
- [ ] Each field supports multiline input with a 500-character limit
- [ ] Save button is disabled until all three fields are non-empty
- [ ] Saving creates a new entry or updates the existing entry for that date (upsert on `user_id + journal_date`)
- [ ] After saving, the Home card shows "Journal completed" with a checkmark indicator and strikethrough title
- [ ] Completed journal entries are visible on the Progress tab as expandable cards sorted by date descending
- [ ] Journal history shows the last 90 days, initially displaying 7 entries with "Show more" pagination
- [ ] Journal entries feed into the weekly recap AI prompt and contribute to `reflection_themes`
- [ ] Journal can be toggled on/off in Profile settings and during onboarding
- [ ] `journal_submitted` analytics event fires on save, including `is_edit` and `date` properties

#### Nice to Have

- [ ] Evening call AI can save journal entries via the `save_journal` tool with `source: "evening_call"` tracking
- [ ] Journal completion is reflected in the calendar strip progress on Home
- [ ] Unsaved drafts persist in memory when navigating between dates within the same session
- [ ] Delete mutation is implemented (available in code but not exposed in UI)

### Success Metrics

**Quantitative:**
- Journal adoption rate — % of users with `journal_enabled` who write at least one entry per week
- Journal completion rate — % of days with journal entries among active journal users
- Entries per user per week — how consistently users journal
- Impact on weekly recap engagement — do users who journal open/engage with recaps more?

**Qualitative:**
- Users report that the three-prompt format feels quick and achievable vs. open-ended journaling
- Weekly recaps feel more personal and relevant for users who journal regularly

### Open Questions

- Should there be a dedicated journal streak or streak indicator separate from habits?
- Is 500 characters per field the right limit, or do users want more space?
- Should the delete entry capability be surfaced in the UI?
- Would users benefit from the ability to add entries for past dates (backfilling)?
- Should there be additional or rotating prompt options beyond win/tension/gratitude?

### Implementation Notes

- **Supabase table**: `daily_journal_entries` with columns `id`, `user_id`, `journal_date`, `win`, `tension`, `gratitude`, `created_at`, `updated_at`. Unique constraint on `(user_id, journal_date)`. RLS restricts access to own rows. Migration in `supabase/migrations/004_add_daily_journal.sql`.
- **TypeScript type**: `DailyJournalEntry` in `lib/types.ts`.
- **Data layer**: `lib/dailyJournal.ts` — `getJournalForDate`, `getJournalForDateRange`, `upsertJournalEntry`, `deleteJournalEntry`.
- **React Query hooks**: `hooks/useDailyJournalQuery.ts` — `useDailyJournal(date)`, `useDailyJournalForRange(start, end)`, `useUpsertJournalEntry()`, `useDeleteJournalEntry()`. Optimistic updates on upsert with rollback on error. 30-second stale time.
- **Components**: `components/DailyJournalSection.tsx` (Home card + entry modal), `components/JournalHistorySection.tsx` (Progress tab history).
- **Settings**: `journal_enabled` boolean in `UserSettings` (`lib/userSettings.ts`), toggled in `app/(tabs)/profile.tsx` and `app/(onboarding)/features.tsx`.
- **Edge functions**: `supabase/functions/vapi-server/index.ts` (evening call journal save), `supabase/functions/generate-weekly-recap/index.ts` (fetches entries for recap prompt), `supabase/functions/schedule-evening-calls/index.ts` (includes journal in call prompt).
- **Analytics**: `JOURNAL_SUBMITTED` and `JOURNAL_TOGGLED` events in `lib/analytics.ts`.
- **Query keys**: `queryKeys.dailyJournal.forDate(date)`, `queryKeys.dailyJournal.forRange(start, end)` in `lib/queryClient.ts`.
