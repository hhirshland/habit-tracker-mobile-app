# Top 3 Todos

> A daily micro-planning ritual that cuts through task noise — pick three priorities each morning and carry that clarity through your day.

---

## Part A: The Story

### Press Release

**Thrive Introduces Top 3 Todos: Start Every Day Knowing Exactly What Matters**

**For anyone who ends the day wondering where the time went, Top 3 Todos brings focus to the first thing you see each morning.**

We've all had days where we're "busy" from sunrise to sunset but can't name a single meaningful thing we accomplished. The problem isn't laziness — it's a lack of intention. Traditional to-do apps make it worse: they encourage you to dump every thought into an infinite list, then leave you staring at 27 items wondering where to start.

Top 3 Todos flips the script. Each morning, Thrive asks you to name just three priorities for the day — no more. They sit at the top of your home screen, impossible to ignore. Tap a checkbox when you finish one. At the end of the day, you either knocked out your three or you didn't. That binary simplicity is the point: it forces you to decide what actually matters before the day decides for you.

> "I used to keep a running list of 15 things and feel guilty about the 12 I never touched. Now I pick three, and most days I finish all of them. It sounds small but it completely changed how my days feel."
> — Jordan, Thrive user

Open Thrive each morning. Set your three. Check them off as you go.

### Marketing Angles

**App Store / changelog blurb:**
New: Top 3 Todos. Each morning, pick the three things that matter most. They live front-and-center on your home screen so you stay focused all day. Simple, intentional, satisfying to check off.

**Push notification:**
What are your top 3 priorities today? Open Thrive and set them now.

**Social post:**
Most to-do lists set you up to fail. Thrive's Top 3 Todos asks one question each morning: what are the three things that actually matter today?

---

## Part B: Product Definition

### Jobs to Be Done

- When I start my day feeling scattered, I want to commit to a small number of priorities, so I can move through the day with clarity instead of anxiety.
- When I finish my workday, I want a simple record of what I accomplished, so I can feel a sense of closure rather than wondering where the time went.
- When I'm reviewing my week, I want to see how consistently I followed through on my daily priorities, so I can build the habit of intentional planning.

### Target Users

People who already track habits in Thrive and want a lightweight layer of daily task planning without switching to a separate productivity app. Particularly valuable for users who feel overwhelmed by long task lists or who struggle with the gap between "I know what I should do" and "I actually did it."

### Solution Overview

Top 3 Todos is an optional feature (toggled on in onboarding or profile settings) that adds three numbered todo slots to the top of the home screen. The flow is:

1. **Morning setup.** User opens Thrive and sees three empty slots labeled 1, 2, 3. Tapping a slot opens inline text entry. Hitting "next" on the keyboard advances to the next slot, making it fast to fill all three in one pass.
2. **Throughout the day.** Todos display as a card at the top of the home screen. Tapping the circular checkbox marks a todo complete (strikethrough + filled circle). Tapping the text of an incomplete todo lets you edit it. Long-pressing a todo offers a delete option with confirmation.
3. **Day completion.** The daily progress indicator on the home screen includes todos — "All Done" only appears when all habits *and* all three todos are completed.
4. **Weekly progress.** The progress tab shows a "Finish top 3 todos" row alongside habits, counting days where all three todos were set and completed.
5. **Evening voice call.** If the user has evening calls enabled, the VAPI assistant knows about uncompleted todos and can mark them complete during the conversation.
6. **Notifications.** An 8am push notification (Mon-Sat) reminds the user to set their Top 3 Todos for the day.

Each day is independent — todos don't carry over. This is intentional: it reinforces the daily decision of "what matters *today*."

### Acceptance Criteria

#### Must Have

- [ ] Users can enable/disable Top 3 Todos from profile settings and onboarding
- [ ] When enabled, three numbered todo slots appear at the top of the home screen
- [ ] Tapping an empty slot enters inline edit mode with autofocus
- [ ] Pressing return/next on the keyboard advances to the next slot (slots 1→2, 2→3); slot 3 uses "done" return key
- [ ] Saving a todo upserts a row in `daily_todos` with the correct `user_id`, `todo_date`, and `position`
- [ ] Tapping the checkbox toggles `is_completed` and updates the UI with strikethrough + filled circle
- [ ] Tapping text on an incomplete todo enters edit mode; completed todos are not editable
- [ ] Long-pressing a todo shows a delete confirmation alert
- [ ] Deleting a todo removes the row and restores the empty slot
- [ ] The home screen calendar strip reflects todo completion in day progress dots
- [ ] "All Done" state on the home screen requires all three todos completed (when feature is enabled)
- [ ] Progress tab shows a "Finish top 3 todos" stat counting days where all 3 are set and completed
- [ ] Todo text is capped at 100 characters

#### Nice to Have

- [ ] 8am Mon-Sat push notification reminding users to set their todos
- [ ] Evening VAPI call includes uncompleted todos in context and can mark them complete via `complete_todo` tool
- [ ] End-of-call report includes todo completion count

### Success Metrics

- **Adoption**: % of active users who enable Top 3 Todos
- **Daily engagement**: % of days where an enabled user sets at least one todo
- **Completion rate**: % of set todos that get checked off
- **Full completion days**: % of days where all 3 todos are completed (the "Finish top 3 todos" stat)
- **Retention lift**: whether users with Top 3 Todos enabled retain at higher rates than those without
- **Qualitative**: user feedback on whether daily planning feels lighter and more focused

### Open Questions

- Should unfinished todos carry over to the next day, or is the clean-slate approach better for the "daily intention" framing?
- Is 3 the right number, or should users be able to choose 1-5?
- Should todos be linkable to existing goals for cross-feature alignment?
- Would recurring/templated todos (e.g. "Review inbox" every weekday) add value or undermine the intentionality?

### Implementation Notes

- **Data layer**: `daily_todos` Supabase table with RLS by `user_id`. Unique constraint on `(user_id, todo_date, position)` with `position` constrained to 1-3. CRUD functions in `lib/dailyTodos.ts`.
- **Hooks**: `hooks/useDailyTodosQuery.ts` provides `useDailyTodos(date)`, `useDailyTodosForRange(start, end)`, and mutation hooks (`useUpsertDailyTodo`, `useToggleDailyTodo`, `useUpdateDailyTodoText`, `useDeleteDailyTodo`) with optimistic updates via TanStack Query.
- **UI**: `components/Top3TodosSection.tsx` renders the three-slot card. `components/DailyTodoItem.tsx` handles individual item states (empty, editing, display, completed). Both use `useThemeColors` for dark/light mode.
- **Home screen**: `app/(tabs)/index.tsx` conditionally renders the todos section when `top3_todos_enabled` is true. Day progress calculation includes todo completion.
- **Progress tab**: `app/(tabs)/progress.tsx` computes `top3TodoWeeklyStat` from the date range query and passes it to `HabitsThisWeek` as a synthetic habit row.
- **Settings**: `top3_todos_enabled` boolean in `UserSettings` (`lib/userSettings.ts`), toggled in `app/(tabs)/profile.tsx` and `app/(onboarding)/features.tsx`.
- **Notifications**: `lib/notifications.ts` schedules 8am Mon-Sat reminders when the feature is enabled.
- **Voice integration**: `supabase/functions/vapi-server/index.ts` exposes a `complete_todo` tool. `supabase/functions/schedule-evening-calls/index.ts` loads uncompleted todos into the call context.
- **Analytics**: events `TODO_CREATED`, `TODO_COMPLETED`, `TODO_UNCOMPLETED`, `TODO_DELETED`, `TOP3_TODOS_TOGGLED` defined in `lib/analytics.ts`.
