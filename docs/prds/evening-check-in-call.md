# Evening Check-In Call

> A nightly voice call from Thrive that walks you through your journal, priorities, and habits — so you stay consistent without ever opening the app.

---

## Part A: The Story

### Press Release

**Thrive Calls You Every Night So You Never Miss a Day Again**

**For habit trackers who want accountability that actually works, Thrive's Evening Check-In replaces willpower with a phone call.**

Most people download a habit tracker with the best intentions. They're diligent for a week, maybe two. Then one busy evening they forget to log, the streak breaks, and the app slowly drifts to a back screen. The problem was never motivation — it was friction. Nobody wants to open an app, tap through screens, and type reflections at the end of a long day.

Thrive's Evening Check-In Call flips the script. At your chosen time each evening, your phone rings. A warm, conversational AI walks you through three things: what went well today, how your priorities went, and which habits you completed. The whole thing takes three to five minutes. When you hang up, your journal is written, your habits are logged, and your todos are updated — all without touching a screen.

> "I've tried every habit tracker out there. Thrive is the first one that calls *me*. It's like having a friend who checks in every night — except it actually remembers what I'm working on."
> — Sarah, Thrive user

Enable Evening Check-In from your Profile, add your phone number, pick a time, and Thrive takes care of the rest. You can also call in anytime you're ready, or tap "Call Me Now" if you don't want to wait.

### Marketing Angles

**App Store / changelog blurb:**
Introducing Evening Check-In Call — Thrive calls you every night to walk through your journal, priorities, and habits in a quick 3-5 minute conversation. Your data logs automatically. No screens, no typing, no missed days.

**Push notification:**
Your evening check-in is ready. Pick up when Thrive calls tonight — or tap here to call in now.

**Social post:**
What if your habit tracker called you instead of the other way around? Thrive's Evening Check-In is a nightly phone call that keeps you accountable in 3 minutes flat.

---

## Part B: Product Definition

### Jobs to Be Done

- When I'm exhausted at the end of the day and don't feel like opening an app, I want my habit tracker to come to me, so I can stay consistent without any effort.
- When I want to reflect on my day but struggle to journal by typing, I want to talk through my thoughts out loud, so I can capture meaningful reflections naturally.
- When I keep forgetting to log my habits, I want an external accountability mechanism that shows up whether I feel like it or not, so I can maintain my streaks and actually see my progress.
- When I finish the call and open the app the next morning, I want to see everything already logged, so I can trust the system and focus on my day ahead.

### Target Users

- **Consistency-seekers**: Users who want to track habits daily but struggle with the friction of manual logging — especially in the evening when energy is low.
- **Voice-over-typing journalers**: Users who find it easier to talk through reflections than write them. The call turns journaling from a chore into a conversation.
- **Accountability-driven users**: People who respond well to external structure — the phone ringing creates a moment they can't easily ignore or postpone.
- **Busy professionals**: Users with packed schedules who value a system that fits into their routine without requiring screen time.

### Solution Overview

The Evening Check-In Call is a voice AI feature that calls users at a scheduled time each evening (or lets them call in) for a guided 3-5 minute conversation. The call covers three sections in order:

1. **Daily Journal** — The AI asks about the user's win, tension, and gratitude for the day. After gathering all three, it saves a concise journal entry.
2. **Top 3 Priorities** — The AI reviews the user's remaining daily todos and asks which ones were completed. Completed items are marked done in real time.
3. **Habit Check-In** — The AI goes through each uncompleted habit for the day. Users can confirm completion, snooze a habit for the day, or simply acknowledge they didn't do it.

The call is conversational and warm — it paraphrases rather than repeating, respects requests to skip sections, and wraps up with brief encouragement. All data is written to the database during the call via tool-calling, so the app reflects the updates immediately.

**Two modes of access:**
- **Outbound (scheduled)**: A background job runs every 15 minutes, finds users whose local time matches their configured call time, and places the call via VAPI.
- **Outbound (on-demand)**: "Call Me Now" button on the Profile screen triggers an immediate call.
- **Inbound**: Users can call the Thrive phone number directly. The system looks up the caller by phone number and dynamically builds the conversation context.

**User settings** (Profile screen):
- Evening Check-In toggle (on/off)
- Phone number (E.164, with formatting)
- Call time (5:00 PM – 11:30 PM in 30-minute increments, default 8:00 PM)
- Timezone (auto-detected, manually adjustable)

### Acceptance Criteria

#### Must Have

- [ ] When a user enables Evening Check-In with a valid phone number and call time, they receive an outbound call within the 15-minute scheduling window of their chosen time
- [ ] The call walks through journal → priorities → habits in order, using only the user's actual data (no fabricated habit names or todo items)
- [ ] `save_journal` tool call writes win, tension, and gratitude to `daily_journal_entries` with upsert on `(user_id, journal_date)`
- [ ] `complete_habit` tool call inserts into `habit_completions`; duplicate completions are handled gracefully (23505 constraint)
- [ ] `complete_todo` tool call sets `is_completed = true` on the matching `daily_todos` row
- [ ] `snooze_habit` tool call inserts into `habit_snoozes` for today; duplicates handled gracefully
- [ ] At most one scheduled outbound call per user per day (checked against `evening_call_log`)
- [ ] Inbound calls look up the user by `phone_number` in `profiles` and return a dynamically built assistant with the user's current data
- [ ] Unrecognized inbound callers receive a fallback message directing them to register their number in the app
- [ ] End-of-call webhook updates `evening_call_log` with status (`completed`, `missed`, `failed`), duration, and counts of journal/habits/todos saved
- [ ] "Call Me Now" in Profile triggers an immediate outbound call authenticated via the user's JWT
- [ ] Call time options range from 5:00 PM to 11:30 PM in 30-minute steps
- [ ] The call respects `specific_days` on habits — only habits scheduled for today's day-of-week are included

#### Nice to Have

- [ ] Call duration target of 3-5 minutes (enforced via `maxDurationSeconds: 600` hard cap)
- [ ] Analytics events fire for call placed, completed, missed, and failed — plus source-tagged events for journal/habit/todo actions during the call
- [ ] Profile UI shows a loading state during "Call Me Now" and disables the button while a call is in progress

### Success Metrics

**Quantitative:**
- **Daily call completion rate**: % of scheduled calls that reach `completed` status (target: >60%)
- **Habit logging via call**: % of users with evening calls enabled who log ≥1 habit per call (target: >70%)
- **Journal completion uplift**: % increase in daily journal entries for users with calls enabled vs. disabled
- **Retention impact**: 30-day retention for call-enabled users vs. non-call users
- **Missed call rate**: % of calls with `missed` status — indicator of call time optimization

**Qualitative:**
- Users report the call feels natural and conversational, not robotic
- Users feel more accountable and consistent with their habits
- Users describe the feature as a key reason they stick with Thrive

### Open Questions

- Should there be a retry mechanism for missed calls (e.g., try again 30 minutes later)?
- Should users receive a push notification before the call as a heads-up, or does that defeat the purpose of the call being the reminder?
- How should the experience evolve for users who consistently complete all habits before the call? (Shorter call? Different conversation focus?)
- Is there a need for call transcript storage for users who want to review what they said?
- Should the inbound call number be surfaced more prominently (e.g., saved to contacts, shown on the home screen)?

### Implementation Notes

**Client:**
- Profile screen (`app/(tabs)/profile.tsx`): Toggle, phone input, call time picker, timezone, "Call Me Now" button. Settings saved via `updateEveningCallPreferences` in `lib/eveningCalls.ts`.
- Onboarding (`app/(onboarding)/features.tsx`): Phone number and evening call toggle during initial setup.
- Helper utilities in `lib/eveningCalls.ts`: phone normalization/formatting, call time options, `triggerEveningCall` (invokes the edge function).

**Edge Functions:**
- `supabase/functions/schedule-evening-calls/index.ts`: Handles both batch scheduling (called by pg_cron every 15 min with service role key) and on-demand "Call Me Now" (called with user JWT). Fetches user's uncompleted habits/todos, builds the system prompt, and calls the VAPI API.
- `supabase/functions/vapi-server/index.ts`: Webhook receiver for VAPI. Handles three message types: `tool-calls` (save_journal, complete_habit, complete_todo, snooze_habit), `end-of-call-report` (updates call log with final status and counts), and `assistant-request` (builds dynamic assistant for inbound calls).

**Voice Stack:**
- VAPI for call orchestration
- Claude Sonnet 4 (Anthropic) for the conversation model
- ElevenLabs for text-to-speech (voice ID: `pVnrL6sighQX7hVz89cp`)
- Deepgram Nova-3 for speech-to-text

**Database:**
- `profiles` table: `phone_number`, `evening_call_enabled`, `evening_call_time` (time, default 20:00), `timezone` (text, default America/New_York)
- `evening_call_log` table: `user_id`, `call_date`, `vapi_call_id`, `status`, `direction`, `duration_seconds`, `journal_saved`, `habits_completed`, `todos_completed`
- Migration: `supabase/migrations/009_add_evening_calls.sql`
- Indexes: unique on `phone_number` (for inbound lookup), partial on `evening_call_enabled` (for batch scheduling), unique on `vapi_call_id`

**Analytics events:**
- Client: `evening_call_enabled`, `evening_call_disabled`, `evening_call_triggered`
- Server: `evening_call_placed` (with trigger: scheduled/on_demand), `evening_call_completed`, `evening_call_missed`, `evening_call_failed`, plus source-tagged `journal_submitted`, `habit_completed`, `todo_completed`, `habit_snoozed` (all with `source: "evening_call"`)
