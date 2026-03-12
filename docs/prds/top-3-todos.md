# Daily Intentions

> A morning ritual for living on purpose — choose the three things that matter most today, then follow through. The morning counterpart to the evening journal.

---

## Part A: The Story

### Press Release

**Thrive Introduces Daily Intentions: Begin Every Day with Purpose**

**For anyone who ends the day wondering where the time went, Daily Intentions turns each morning into a moment of clarity.**

We've all had days where we're "busy" from sunrise to sunset but can't name a single meaningful thing we accomplished. The problem isn't laziness — it's a lack of intention. Traditional to-do apps make it worse: they encourage you to dump every thought into an infinite list, then leave you staring at 27 items wondering where to start.

Daily Intentions flips the script. Each morning, Thrive asks one simple question: *What are the 3 things that matter most today?* They sit at the top of your home screen, impossible to ignore. Tap a checkbox when you finish one. At the end of the day, you either followed through or you didn't. That binary simplicity is the point: it forces you to decide what actually matters before the day decides for you.

Together with the evening journal, Daily Intentions completes a daily loop of intentional living — set your direction in the morning, reflect on your day at night. Over time, the pattern of choosing and following through builds a deep sense of agency. You start to see yourself as someone who lives deliberately. That's identity change in action.

> "I used to keep a running list of 15 things and feel guilty about the 12 I never touched. Now I set three intentions each morning, and most days I finish all of them. It sounds small but it completely changed how my days feel — I actually trust myself to follow through."
> — Jordan, Thrive user

Open Thrive each morning. Set your intentions. Follow through. Reflect tonight.

### Marketing Angles

**App Store / changelog blurb:**
New: Daily Intentions. Each morning, choose the three things that matter most. They live front-and-center on your home screen — a daily practice of living with purpose.

**Push notification:**
What are the 3 things that matter most today? Open Thrive and set your intentions.

**Social post:**
Most to-do lists set you up to fail. Thrive's Daily Intentions asks one question each morning: what are the three things that actually matter today? Set your direction. Follow through. Reflect tonight.

---

## Part B: Product Definition

### Jobs to Be Done

- When I start my day feeling scattered, I want to commit to a small number of intentions, so I can move through the day with clarity instead of anxiety.
- When I finish my workday, I want a simple record of what I followed through on, so I can feel a sense of closure rather than wondering where the time went.
- When I'm reviewing my week, I want to see how consistently I followed through on my daily intentions, so I can build the habit of living intentionally.
- When I reflect in my evening journal, I want to connect my wins and tensions back to the intentions I set that morning, so I can see the full arc of my day.

### Target Users

People who already track habits in Thrive and want a lightweight daily intention-setting practice without switching to a separate productivity app. Particularly valuable for users who feel overwhelmed by long task lists or who struggle with the gap between "I know what I should do" and "I actually did it."

### How It Fits the Identity Thesis

Daily Intentions is not a task manager — it's an identity practice. Each morning, by choosing what matters, you are answering the question: *What would the person I'm becoming do today?* And each evening, when you reflect on what happened, you close the loop. Over time, the pattern of intention → action → reflection builds genuine self-trust and a felt sense of identity change. This positions Daily Intentions as a core pillar of the Thrive experience alongside habits and the evening journal, not a bolted-on productivity feature.

### Solution Overview

Daily Intentions is an optional feature (toggled on in onboarding or profile settings) that adds three numbered intention slots to the top of the home screen. The flow is:

1. **Morning setup.** User opens Thrive and sees three empty slots labeled 1, 2, 3 with the placeholder "Set an intention..." Tapping a slot opens inline text entry. Hitting "next" on the keyboard advances to the next slot, making it fast to fill all three in one pass.
2. **Throughout the day.** Intentions display as a card at the top of the home screen. Tapping the circular checkbox marks an intention complete (strikethrough + filled circle). Tapping the text of an incomplete intention lets you edit it. Long-pressing an intention offers a remove option with confirmation ("Remove Intention").
3. **Day completion.** The daily progress indicator on the home screen includes intentions — "All Done" only appears when all habits *and* all three intentions are completed.
4. **Weekly progress.** The progress tab shows a "Complete daily intentions" row alongside habits, counting days where all three intentions were set and completed.
5. **Evening voice call.** If the user has evening calls enabled, the VAPI assistant knows about uncompleted intentions and asks about each one during the conversation.
6. **Notifications.** An 8am push notification (Mon-Sat): "Set today's intentions — What are the 3 things that matter most today?"

Each day is independent — intentions don't carry over. This is intentional: it reinforces the daily decision of *what matters today* and mirrors the fresh-slate nature of the evening journal.

### Acceptance Criteria

#### Must Have

- [ ] Users can enable/disable Daily Intentions from profile settings and onboarding
- [ ] When enabled, three numbered intention slots appear at the top of the home screen
- [ ] Tapping an empty slot enters inline edit mode with autofocus and "Set an intention..." placeholder
- [ ] Pressing return/next on the keyboard advances to the next slot (slots 1→2, 2→3); slot 3 uses "done" return key
- [ ] Saving an intention upserts a row in `daily_todos` with the correct `user_id`, `todo_date`, and `position`
- [ ] Tapping the checkbox toggles `is_completed` and updates the UI with strikethrough + filled circle
- [ ] Tapping text on an incomplete intention enters edit mode; completed intentions are not editable
- [ ] Long-pressing an intention shows a "Remove Intention" confirmation alert
- [ ] Deleting an intention removes the row and restores the empty slot
- [ ] The home screen calendar strip reflects intention completion in day progress dots
- [ ] "All Done" state on the home screen requires all three intentions completed (when feature is enabled)
- [ ] Progress tab shows a "Complete daily intentions" stat counting days where all 3 are set and completed
- [ ] Intention text is capped at 100 characters

#### Nice to Have

- [ ] 8am Mon-Sat push notification: "Set today's intentions" / "What are the 3 things that matter most today?"
- [ ] Evening VAPI call includes uncompleted intentions in context and can mark them complete via `complete_todo` tool
- [ ] End-of-call report includes intention completion count

### Success Metrics

- **Adoption**: % of active users who enable Daily Intentions
- **Daily engagement**: % of days where an enabled user sets at least one intention
- **Completion rate**: % of set intentions that get checked off
- **Full completion days**: % of days where all 3 intentions are completed
- **Loop closure**: % of users with both Daily Intentions and evening journal enabled (measures adoption of the full morning↔evening loop)
- **Retention lift**: whether users with Daily Intentions enabled retain at higher rates than those without
- **Qualitative**: user feedback on whether daily intention-setting feels purposeful and builds self-trust

### Open Questions

- Is 3 the right number, or should users be able to choose 1-5?
- Should intentions be linkable to identity statements for explicit alignment (e.g. "Run 3 miles" tagged to "I am a runner")?
- Would recurring/templated intentions (e.g. "Review inbox" every weekday) add value or undermine the intentionality?

### Implementation Notes

- **Internal naming**: Database table, settings key, query keys, hooks, analytics events, and component filenames retain their original `todo` naming (`daily_todos`, `top3_todos_enabled`, `TODO_CREATED`, `Top3TodosSection.tsx`, etc.) for backward compatibility. Only user-facing strings use "Daily Intentions."
- **Data layer**: `daily_todos` Supabase table with RLS by `user_id`. Unique constraint on `(user_id, todo_date, position)` with `position` constrained to 1-3. CRUD functions in `lib/dailyTodos.ts`.
- **Hooks**: `hooks/useDailyTodosQuery.ts` provides `useDailyTodos(date)`, `useDailyTodosForRange(start, end)`, and mutation hooks (`useUpsertDailyTodo`, `useToggleDailyTodo`, `useUpdateDailyTodoText`, `useDeleteDailyTodo`) with optimistic updates via TanStack Query.
- **UI**: `components/Top3TodosSection.tsx` renders the three-slot card with the heading "Daily Intentions." `components/DailyTodoItem.tsx` handles individual item states (empty, editing, display, completed) with the placeholder "Set an intention..." and edit prompt "What matters today?" Both use `useThemeColors` for dark/light mode.
- **Home screen**: `app/(tabs)/index.tsx` conditionally renders the intentions section when `top3_todos_enabled` is true. Day progress calculation includes intention completion.
- **Progress tab**: `app/(tabs)/progress.tsx` computes `top3TodoWeeklyStat` from the date range query and passes it to `HabitsThisWeek` as a synthetic habit row named "Complete daily intentions."
- **Settings**: `top3_todos_enabled` boolean in `UserSettings` (`lib/userSettings.ts`), toggled in `app/(tabs)/profile.tsx` (labeled "Daily Intentions" / "Start each day with purpose") and `app/(onboarding)/features.tsx` (labeled "Daily Intentions").
- **Notifications**: `lib/notifications.ts` schedules 8am Mon-Sat reminders: "Set today's intentions" / "What are the 3 things that matter most today?"
- **Voice integration**: `supabase/functions/vapi-server/index.ts` exposes a `complete_todo` tool. `supabase/functions/schedule-evening-calls/index.ts` loads uncompleted intentions into the call context under "Daily Intentions."
- **Analytics**: events `TODO_CREATED`, `TODO_COMPLETED`, `TODO_UNCOMPLETED`, `TODO_DELETED`, `TOP3_TODOS_TOGGLED` defined in `lib/analytics.ts`.
