# Weekly Recaps v2

> Turn your weekly recap from a summary you read into an insight engine that helps you see patterns, get smarter about your habits, and take clear next steps.

---

## Part A: The Story

### Press Release

**Thrive's Weekly Recaps Now Show You What You Can't See Yourself**

**For habit builders who want more than a pat on the back -- Thrive weekly recaps now surface cross-week trends, visual breakdowns, and personalized next-step suggestions.**

You've been tracking habits for weeks. You know you completed 6 of 7 days for "Morning Run" this week. But did you know your consistency on morning habits has climbed 15% over the last month? Or that every week you journal at least 3 times, your overall habit adherence jumps by 20%? These are the patterns hiding in your data -- patterns you'd never spot on your own.

Thrive's upgraded Weekly Recaps go beyond the summary. Now, when you open your recap, you'll see visual habit adherence breakdowns at a glance, how this week compares to your recent trend, and concrete suggestions for what to try next week based on what's actually working. When the data suggests it, Thrive will gently surface a new habit recommendation -- not a generic tip, but something connected to your real patterns and what you've been writing about in your journal.

> "I opened my recap and saw that I'd been nailing my evening routine every week I also meditated. I never connected those two. Now I meditate every morning and my evenings basically run themselves."
> -- Maya, Thrive user

Open Thrive this Sunday and see what your habits have been trying to tell you.

### Marketing Angles

**App Store / changelog blurb:**
Weekly Recaps got a major upgrade. See visual habit breakdowns, cross-week trends, and personalized suggestions for next week. Your habits have patterns -- now you can see them.

**Push notification:**
Your weekly recap is ready -- this time with trends and tips just for you.

**Social post:**
Your habits know things about you that you don't. Thrive's new Weekly Recaps show you the patterns hiding in your data. What will yours reveal?

---

## Part B: Product Definition

### Jobs to Be Done

- When I finish a week of tracking, I want to see how my habits performed visually, so I can quickly grasp the week without reading a wall of text.
- When I look at my weekly recap, I want to see how this week compares to recent weeks, so I can tell whether I'm trending up, plateauing, or slipping.
- When I see patterns in my data, I want specific suggestions for what to do next week, so I can act on insights instead of just noting them.
- When my journal entries and habit data reveal an opportunity, I want to be gently suggested a new habit that fits, so I can grow without feeling overwhelmed.

### Target Users

- **Consistent trackers** (2+ weeks of data, 4+ active days/week) -- these users have enough history to surface meaningful trends.
- **Self-improvement oriented** -- users who journal, set goals, and care about understanding themselves, not just checking boxes.
- **Mid-journey users** -- past the initial excitement, potentially at risk of dropping off. Richer recaps give them a reason to stay engaged.

### Solution Overview

The enhanced weekly recap keeps the existing coach-style narrative and adds three new layers:

1. **Visual habit adherence** -- A clear, at-a-glance visual showing each habit's completion for the week (e.g., a grid/dot matrix or bar chart). Replaces the need to parse adherence percentages from text.

2. **Cross-week trends** -- Compare this week to the prior 2-4 weeks. Surface streaks (consecutive weeks of high adherence), improving/declining patterns, and notable correlations between habits. Presented as a short "Trends" section with supporting visuals.

3. **Actionable next-week suggestions** -- 1-3 specific, personalized suggestions based on the week's data. Examples: "Your reading habit dropped mid-week -- try moving it earlier in the day" or "You've hit 90%+ on Morning Run 3 weeks straight -- consider increasing your distance goal."

4. **Gentle habit recommendations** -- When patterns clearly support it, suggest a new habit. Can be triggered by quantitative data (e.g., "Every week you journal 3+ times, your adherence is 25% higher") or qualitative signals from journal entries (e.g., a user repeatedly writes about wanting to sleep better, stress, or energy -- suggest a relevant habit like a wind-down routine or morning walk). Never forced; easy to dismiss or ignore.

**User flow:** The entry point remains the same -- animated banner on the Progress tab, tapping into the recap detail modal. The detail view now includes visual sections alongside the narrative text. Suggestions appear at the end, after the reflection/looking-ahead content, with a clear "try this next week" framing.

### Acceptance Criteria

#### Must Have

- [ ] Recap detail view displays a visual habit adherence breakdown (each habit's daily completion for the week) alongside the existing narrative
- [ ] Visual adherence renders correctly for users with 1-15 active habits
- [ ] Recap includes a "Trends" section comparing this week's overall adherence to the previous 2-4 weeks
- [ ] Trends section identifies and highlights streaks (3+ consecutive weeks above 80% adherence for any habit)
- [ ] Recap includes 1-3 actionable next-week suggestions personalized to the user's data
- [ ] Suggestions reference specific habits by name and cite the pattern that prompted them
- [ ] Suggestions are absent (not empty/placeholder) when data doesn't support any meaningful recommendation
- [ ] The AI prompt and response schema are updated to include structured fields for trends, suggestions, and optional habit recommendation
- [ ] Existing recap content (summary, habit review, goal progress, reflections, looking ahead) is preserved

#### Nice to Have

- [ ] Habit recommendation surfaces when a clear cross-habit correlation exists (e.g., journaling correlates with higher adherence)
- [ ] Habit recommendation can be triggered by recurring themes in journal entries (e.g., mentions of sleep, stress, energy, focus) in addition to cross-habit correlation data
- [ ] Journal-sourced recommendations cite the theme detected (e.g., "You've mentioned sleep quality in 3 of your last 4 journal entries...")
- [ ] Habit recommendation includes a one-tap "Add this habit" action
- [ ] Visual adherence supports a compact and expanded view (tap to toggle)
- [ ] Trends section includes a simple spark-line or mini chart for overall adherence over time
- [ ] Users can share a recap highlight card (image) to social / messages

### Success Metrics

**Quantitative:**
- Recap view rate increases (% of users who open their recap each week)
- Time spent in recap detail increases (users engage with visuals and suggestions, not just skim)
- Suggestion follow-through rate -- % of users who take an action suggested in the recap (measured by next-week behavior change)
- Habit recommendation acceptance rate -- % of suggested habits that get added

**Qualitative:**
- Users report feeling more aware of their patterns (survey/feedback)
- Users reference recaps when explaining behavior changes ("I noticed in my recap that...")

### Open Questions

- What visual format for habit adherence works best in a scrollable modal? Dot grid (day x habit), horizontal bars, or something else? May need design variants.
- How many weeks of cross-week comparison is useful before it becomes noisy? 4 weeks? 8?
- Should trend data be computed server-side (in the edge function) or client-side from existing data? Server-side is simpler for the AI to reference but adds query complexity.
- How do we handle the first 1-2 weeks when there's no prior data for trend comparison? Graceful absence, or a "building your trend" placeholder?
- Should habit recommendations be generated by the AI (as part of the recap prompt) or by a separate rules-based system?
- How specific should journal-based recommendations get? Surface-level theme detection ("you mention stress a lot") vs. deeper inference ("your stress mentions correlate with weeks you skip your evening routine")?

### Implementation Notes

- **Edge function** (`supabase/functions/generate-weekly-recap/index.ts`): The prompt and response schema need updating. Currently returns `WeeklyRecapContent` with `week_summary`, `habit_review`, `goal_progress`, `reflection_themes`, `looking_ahead`. New fields needed: `trend_comparison` (structured), `suggestions` (array), `habit_recommendation` (optional). The data fetch step already pulls habits, completions, goals, goal entries, and journal entries -- it would also need to pull prior weeks' completions for trend calculation.
- **Types** (`lib/types.ts`): Extend `WeeklyRecapContent` with new fields. Needs to be backward-compatible with existing recaps that lack these fields.
- **Recap detail UI** (`components/WeeklyRecapDetail.tsx`): Add visual adherence component, trends section, and suggestions section. The modal is already scrollable. New components needed for the visual grid/chart.
- **Hooks** (`hooks/useWeeklyRecapsQuery.ts`): May need to pass additional context (prior week data) to the generation mutation, or the edge function fetches it independently.
- **Journal-based recommendations**: The edge function already passes journal entries to the AI prompt. The prompt update should instruct Claude to look for recurring themes in journal content (sleep, stress, energy, focus, motivation, etc.) and use them as signal for habit recommendations alongside quantitative patterns. No new data fetching needed -- just prompt engineering.
- **Analytics**: New events for suggestion impressions and follow-through. Existing `recap_viewed` and `recap_generated` events remain.
