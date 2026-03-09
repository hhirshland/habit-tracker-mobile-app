# Daily Reminders

> Timely, consistent nudges that weave Thrive into your daily rhythm — so your habits, todos, and reflections never slip through the cracks.

---

## Part A: The Story

### Press Release

**Thrive Now Reminds You at the Moments That Matter**

**For habit trackers who want a gentle, reliable rhythm — Thrive sends daily reminders so your habits and priorities stay top of mind without any effort.**

You downloaded a habit tracker because you wanted to change. But life gets loud. By 9pm you realize you forgot to log anything. Your streak breaks, your motivation dips, and the app quietly fades into a folder you never open. The problem was never your commitment — it was that nothing reminded you at the right time.

Thrive's Daily Reminders fix that with three well-timed nudges. Every morning (Mon–Sat), you get a prompt to set your Top 3 priorities for the day. Every evening, a check-in reminder asks you to log your habits — and if you journal, it reminds you of that too. On Sunday mornings, you're told your weekly recap is ready. Together, these three moments turn Thrive from an app you use into a rhythm you rely on.

> "I used to open the app randomly and feel behind. Now I get a little nudge at 8pm, check off my habits in two minutes, and feel like I actually have my life together. It's the simplest feature but it changed everything."
> — Jordan, Thrive user

Toggle Daily Reminders on from your Profile and let Thrive keep your rhythm going.

### Marketing Angles

**App Store / changelog blurb:**
Daily Reminders keep you on track without thinking about it. Get a morning nudge to set your Top 3 priorities, an evening check-in for your habits, and a Sunday recap notification. Simple, consistent, effective.

**Push notification:**
Your habits are waiting — turn on Daily Reminders so you never miss a day.

**Social post:**
The best habit tracker is the one you actually open. Thrive's daily reminders make it automatic. How many streaks have you lost to forgetting?

---

## Part B: Product Definition

### Jobs to Be Done

- When I'm starting my day, I want to be reminded to set my priorities, so I can stay intentional about what matters most today.
- When my evening rolls around and I haven't opened the app, I want a nudge to check in on my habits, so I can log them before the day slips away.
- When my weekly recap is ready, I want to know about it, so I can reflect on how my week went while it's still fresh.

### Target Users

- **New users** who haven't yet built the muscle memory to open Thrive daily — reminders bridge the gap between intention and habit.
- **Streak-conscious users** who care about maintaining their tracking consistency and want a safety net against forgetting.
- **Routine-oriented users** who value structure and want Thrive to feel like a built-in part of their morning and evening flow.

### Solution Overview

Daily Reminders is a local-notification system with a single on/off master toggle. When enabled, Thrive schedules three recurring notifications:

1. **Morning priorities (Mon–Sat, 8:00 AM):** "Set your Top 3 todos" — prompts users to plan their day. Only scheduled when Top 3 Todos is enabled in settings.
2. **Evening habit check-in (Daily, 8:00 PM):** "Time to check off your daily habits" — the core daily nudge. If the user has Daily Journal enabled, the body also mentions journaling.
3. **Weekly recap (Sunday, 8:00 AM):** "Your weekly recap is ready" — lets users know their recap is available to view.

**User flow:** From the Profile screen, the user sees a "Daily Reminders" card with a toggle switch. Toggling on requests notification permissions (if not already granted), then schedules all applicable notifications. Toggling off cancels all scheduled notifications. The reminders re-schedule automatically on every app launch.

When a user taps a notification, the app opens. Tapping the weekly recap notification navigates directly to the Progress tab. Habit and todo reminders open the app to its default state.

### Acceptance Criteria

#### Must Have

- [ ] Profile screen displays a "Daily Reminders" card with a toggle switch, bell icon, and subtitle describing the schedule ("8am Top 3 todos and 8pm habits check-in")
- [ ] Toggling on requests notification permissions from the OS if not already granted
- [ ] When enabled, a daily notification is scheduled at 8:00 PM with title "Daily habits check-in" and body "Time to check off your daily habits."
- [ ] When enabled and Top 3 Todos is active, a Mon–Sat notification is scheduled at 8:00 AM with title "Set your Top 3 todos"
- [ ] When enabled, a Sunday notification is scheduled at 8:00 AM with title "Your weekly recap is ready"
- [ ] If Daily Journal is enabled, the 8pm habit reminder body includes "and write in your journal"
- [ ] Toggling off cancels all scheduled notifications
- [ ] Notifications re-schedule on every app launch (ensuring they survive app updates and device restarts)
- [ ] Tapping the weekly recap notification navigates the user to the Progress tab
- [ ] Tapping habit or todo notifications opens the app to its default state
- [ ] Android notifications use a dedicated "Daily Reminders" channel
- [ ] Notification enabled/disabled state persists across app restarts via AsyncStorage
- [ ] `notifications_toggled` analytics event fires with `enabled: boolean` when the user toggles the setting
- [ ] `notification_opened` analytics event fires with `reminder_id` when a user taps any notification

#### Nice to Have

*None — this PRD documents the current shipped feature.*

### Success Metrics

**Quantitative:**
- Reminder opt-in rate — % of active users who have Daily Reminders enabled
- Notification open rate — % of delivered notifications that result in an app open (`notification_opened` events / estimated notifications delivered)
- Daily active usage on reminder-enabled users vs. non-enabled — do reminders correlate with higher daily engagement?
- Streak preservation — do users with reminders enabled maintain longer streaks?

**Qualitative:**
- Users describe Thrive as "part of my routine" or "part of my day" in feedback
- Low opt-out rate after initially enabling — users don't find the reminders annoying

### Open Questions

- Notification delivery is local-only; if the user doesn't open the app for an extended period, scheduled notifications may not fire reliably on some Android OEMs with aggressive battery optimization. No server-side fallback exists.
- Changes to Top 3 Todos or Daily Journal settings don't immediately update scheduled notification content — updates only take effect on next app launch or next toggle of the master reminder switch.
- All times are hardcoded (8 AM / 8 PM). No data yet on whether these times are optimal for the user base.

### Implementation Notes

- **Notification scheduling** (`lib/notifications.ts`): Core module that handles `scheduleNotificationAsync` with `DAILY` and `WEEKLY` triggers from `expo-notifications`. Exports `rescheduleNotifications()` (cancels all then re-schedules based on current settings) and `cancelAllScheduledNotifications()`. Defines reminder IDs: `habit-reminder`, `todo-reminder`, `WEEKLY_RECAP_REMINDER_ID`.
- **Settings hook** (`hooks/useNotificationsSetting.ts`): Reads `@notifications_enabled` from AsyncStorage, exposes `enabled` state and `toggle()`. Toggle handles permission requests, scheduling/canceling, persistence, and analytics.
- **Profile UI** (`app/(tabs)/profile.tsx`): Renders the Daily Reminders card with a `Switch` component bound to the notifications hook.
- **App launch rescheduling** (`app/_layout.tsx`): Calls `rescheduleNotifications()` after auth hydration to keep schedules current.
- **Notification tap handling** (`app/_layout.tsx`): `addNotificationResponseReceivedListener` routes weekly recap taps to `/(tabs)/progress`; other taps fire analytics only.
- **User settings** (`lib/userSettings.ts`, `contexts/UserSettingsContext.tsx`): `top3_todos_enabled` and `journal_enabled` influence which notifications are scheduled and their content. Stored in AsyncStorage under `@user_settings` and synced to `profiles.settings` JSONB in Supabase.
- **No Supabase tables** for reminders — everything is local via `expo-notifications` and AsyncStorage.
- **Android channel**: `daily-reminders` channel created at scheduling time.
