# Weekly Recaps v2

> Your weekly recap should feel like a coach sitting across from you — showing you who you were this week, what stood out, and the one thing to focus on next.

---

## Part A: The Story

### Press Release

**Thrive's Weekly Recaps Now Show You Who You Were This Week**

**For identity-driven habit builders — Thrive weekly recaps now lead with your identity, show your habits at a glance, and give you one clear focus for next week.**

You've been tracking habits for weeks. You know you ran 5 out of 7 days. But did you know you lived as an Athlete 86% of the time — up from 72% last week? Or that your Reader identity only got attention on 2 days? These aren't habit stats. They're a mirror.

Thrive's upgraded Weekly Recaps cut the noise. Instead of a wall of text, you get a visual snapshot of every habit, your identity scorecard front and center, and one specific suggestion for what to do differently next week. No generic tips. No information overload. Just the clarity you need to keep becoming the person you set out to be.

> "My recap showed me I lived as an Athlete 6 out of 7 days but my Mindful Person identity was at 30%. I didn't need three paragraphs to tell me that — I just needed to see the number. Now I meditate every morning."
> — Jake, Thrive user

Open Thrive this Sunday and see who you were this week.

### Marketing Angles

**App Store / changelog blurb:**
Weekly Recaps got sharper. See your identity scorecard, a visual habit breakdown, and one focused suggestion for next week. Less text, more insight.

**Push notification:**
Your weekly recap is ready — see who you were this week.

**Social post:**
Your habits tell a story about who you're becoming. Thrive's new Weekly Recaps show you that story — identity-first. Who were you this week?

---

## Part B: Product Definition

### Jobs to Be Done

- When I finish a week, I want to see how well I lived as each identity — not just a habit count — so I can stay connected to who I'm becoming.
- When I open my recap, I want to see my habits visually at a glance, so I can grasp the week in seconds without reading paragraphs of text.
- When I see how my week went, I want to know whether I'm trending up or down compared to last week, so I can tell if I'm building momentum or slipping.
- When I close my recap, I want one clear thing to focus on next week, so I leave with intent rather than just information.

### Target Users

- **Consistent trackers** (2+ weeks of data, 4+ active days/week) — enough history to surface meaningful patterns.
- **Identity-adopters** — users who have defined identity statements and want to see them reflected in their weekly rhythm.
- **Mid-journey users** — past the initial excitement, potentially at risk of dropping off. A sharper recap gives them a reason to stay engaged.

### Solution Overview

The v2 recap restructures from 6 text-heavy sections to 4 focused sections. Each section earns its place by either strengthening the identity thesis or driving next-week behavior. The existing coach-style tone is preserved, but the format shifts from "report you read" to "mirror you glance at."

#### Restructured Sections

**1. Your Week** (summary + identity scorecard)

Leads with the user's identity adherence — emoji, statement, percentage — so the first thing they see is who they were, not what they did. The AI narrative weaves identity progress into a 2-3 sentence summary. If the user has no identities, falls back to a habit-focused summary (backward-compatible with today's `week_summary`).

**2. Habits** (visual grid + callouts)

Replaces the prose-heavy habit review with a visual dot grid: one row per habit, 7 columns for the days of the week, filled/empty circles. Adherence percentage badge in the header. Below the grid, two optional short callouts: standout habit (trophy) and needs-attention habit (nudge). The visual lets users grasp the full week in seconds.

**3. Insights** (wins + growth area)

Merges the current reflection_themes and goal_progress sections into one focused section. Surfaces 1-2 wins worth celebrating (specific, enthusiastic) and one growth opportunity framed as forward momentum. Goal progress is mentioned inline only when a goal had meaningful movement during the week — not as a separate section. Gratitude highlight is dropped (warm but rarely actionable).

**4. Your Focus for Next Week** (one actionable suggestion)

Replaces the generic "looking ahead" encouragement with one concrete, specific suggestion tied to the user's data. Examples: "Your reading habit dropped every Wednesday and Thursday — try moving it to morning on those days" or "You've hit 90%+ on your Athlete identity 3 weeks running — consider adding a stretching habit to round it out." The suggestion references a specific habit or identity by name and cites the pattern that prompted it. When no meaningful suggestion exists, the section falls back to a brief motivational close (never empty, never forced).

#### Additional Changes

**5. Cross-week context** — The edge function fetches the previous week's overall adherence percentage (one additional query). The AI prompt includes it so the narrative can reference trajectory: "up from 65% last week" or "your 3rd week above 80%." Not a full trends engine — just enough context to give the recap direction.

**6. Pre-generation** — Recaps are generated server-side (scheduled trigger on Saturday night / Sunday early morning) rather than on-demand when the user opens the modal. The Sunday morning push notification can then truthfully say "Your recap is ready" and the modal opens instantly. The existing race-condition handling (`23505` unique constraint) ensures double-generation is safe.

**7. Render identity_review** — The current edge function already generates an `identity_review` section with per-identity adherence and a narrative. The UI currently does not render it. This is the quickest, highest-impact fix: display what we already compute.

#### What's Explicitly Out of Scope

- **Habit recommendations** — suggesting new habits based on journal themes or cross-habit correlations. Adds complexity and requires high AI confidence. Revisit after cross-week trends are solid.
- **Sharing** — recap highlight cards for social. Nice-to-have but doesn't strengthen the daily loop.
- **Sparkline charts in history cards** — the horizontal scroll history is the wrong surface for trend visualization. Cross-week context in the recap itself is more impactful.
- **Compact/expanded visual toggle** — premature optimization. Ship the grid, learn from usage.

### Acceptance Criteria

#### Must Have

- [ ] Identity review renders in the recap detail UI: per-identity emoji + statement + adherence percentage, with AI-generated narrative
- [ ] Identity review is the first section in the recap (above habits) when the user has identity statements; omitted gracefully when they don't
- [ ] Recap detail view displays a visual habit adherence grid (dot row per habit, 7 days) replacing the narrative-only habit review
- [ ] Visual grid renders correctly for users with 1-15 active habits
- [ ] Adherence percentage badge remains in the Habits section header
- [ ] Standout habit and needs-attention callouts appear below the grid (short, one line each)
- [ ] Reflection themes and goal progress are merged into a single "Insights" section with 1-2 wins and 1 growth opportunity
- [ ] Goal progress appears inline in Insights only when a goal had meaningful movement; otherwise omitted (not empty/placeholder)
- [ ] "Your Focus for Next Week" section contains one specific, actionable suggestion referencing a habit or identity by name
- [ ] Focus suggestion cites the data pattern that prompted it
- [ ] When no meaningful suggestion exists, the section falls back to a brief motivational close
- [ ] The AI prompt includes the previous week's overall adherence percentage for cross-week context
- [ ] AI narrative references trajectory when prior-week data is available ("up from X% last week")
- [ ] First-week recaps (no prior data) work cleanly without trajectory references
- [ ] `WeeklyRecapContent` type is updated with new optional fields; existing recaps without new fields render gracefully
- [ ] Existing recap content backward-compatible: older recaps with the v1 schema still display correctly

#### Nice to Have

- [ ] Recaps are pre-generated server-side (scheduled Saturday night / Sunday morning) so the modal opens instantly
- [ ] Sunday push notification only fires after the recap is successfully pre-generated
- [ ] Streak detection: "This is your Nth consecutive week above X% adherence" surfaced in the summary or focus section
- [ ] Visual grid supports tap on a habit row to highlight that habit's callout (subtle interaction, not a new screen)
- [ ] History cards in the horizontal scroll show a 1-line summary preview alongside the date and adherence %

### Success Metrics

**Quantitative:**
- Recap view rate increases (% of users who open their recap each week)
- Time-to-first-scroll decreases (users grasp the recap faster due to visual format)
- Focus suggestion follow-through: % of users whose next-week behavior changes in the direction suggested (e.g., adherence on the called-out habit improves)
- Identity review engagement: do users with identity-mapped habits view recaps at a higher rate?

**Qualitative:**
- Users describe their week in identity terms ("I was 80% Athlete this week") rather than task terms
- Users reference the focus suggestion when explaining behavior changes

### Decisions Made

- **6 sections → 4.** Week Summary and Identity Review merge into "Your Week." Reflection Themes, Goal Progress merge into "Insights." Looking Ahead becomes "Your Focus for Next Week" with one actionable suggestion instead of generic encouragement. Gratitude highlight is dropped.
- **Visual grid over charts.** Dot rows (habit × day) are the simplest visual that conveys completion patterns at a glance. No sparklines or bar charts needed for v2.
- **Cross-week context, not a trends section.** Instead of a dedicated Trends section with its own UI, we pass last week's adherence to the prompt and let the AI weave trajectory into the narrative naturally.
- **Pre-generation is nice-to-have, not blocking.** The on-demand flow works and is already live. Pre-generation improves UX but requires infrastructure (cron trigger). Ship the content restructure first.
- **Habit recommendations are out of scope.** They add complexity, require high AI confidence, and aren't necessary for the core recap to be valuable.
- **One suggestion, not 1-3.** A single focused suggestion is more actionable than a list. If we nail one, we can explore more later.

### Open Questions

- What's the right visual density for the habit dot grid on smaller screens? If a user has 12+ habits, the grid may need a compact mode or scroll within the section.
- Should the focus suggestion eventually be tappable (e.g., "tap to adjust this habit's schedule")? For v2 it's text-only, but this could be a natural extension.
- For pre-generation: should we use a Supabase cron (pg_cron), an external scheduler, or a client-triggered background job on the first Sunday app open?

### Implementation Notes

- **Edge function** (`supabase/functions/generate-weekly-recap/index.ts`): Update the prompt and response schema. Add one query to fetch the prior week's recap (or just its `overall_adherence_pct`) for cross-week context. The prompt instructions should specify the 4-section structure: Your Week (with identity), Habits (structured data for the visual grid — the client renders it, not the AI), Insights (merged reflections + goals), Focus (one suggestion). The AI returns structured JSON; the visual grid is rendered client-side from `habit_review` data, not from AI prose.
- **Types** (`lib/types.ts`): Extend `WeeklyRecapContent` with optional fields: `insights` (merged section), `focus_suggestion` (string), `prior_week_adherence_pct` (number | null). New fields are optional for backward compatibility. The existing `reflection_themes`, `goal_progress`, and `looking_ahead` fields remain on the type but may be absent on new recaps.
- **Recap detail UI** (`components/WeeklyRecapDetail.tsx`): Render identity_review (already on the type, just not displayed). Add `HabitAdherenceGrid` component for the visual dot rows. Restructure the section order: Identity/Your Week → Habits (grid) → Insights → Focus. Handle both v1 and v2 recap schemas gracefully.
- **Habit adherence data for the grid**: The edge function already computes per-habit completion data (`habitSummaries` with `completed_dates`). Include this structured data in the recap content so the client can render the grid without re-fetching. New field: `habit_adherence` array with `{ name, target_days, completed_days, completed_dates }` per habit.
- **Pre-generation (nice-to-have)**: A Supabase cron job or external trigger that calls the edge function for all qualifying users on Saturday night. The existing `already_existed` check prevents double-generation if the user opens the modal before the cron runs.
- **Analytics**: Existing `recap_viewed`, `recap_generated`, `recap_generation_failed` events are sufficient. Consider adding `focus_suggestion` as a property on `recap_viewed` to measure which suggestions correlate with behavior change.
