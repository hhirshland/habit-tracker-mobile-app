# Identity-First Habits

> Define who you want to be, then build the habits that make it real. Thrive now starts with identity -- because lasting change doesn't come from goals, it comes from becoming someone new.

---

## Part A: The Story

### Press Release

**Thrive Introduces Identity-First Habits: Stop Chasing Goals, Start Becoming your best self.**

**For anyone who's ever set a habit and quit three weeks later -- Thrive now helps you define your ideal self and build habits that actually stick because they're tied to who you are.**

We've all been there. You set a goal to run three times a week. It works for a while. Then life gets busy, motivation fades, and the goal quietly dies. The problem isn't discipline. The problem is that "run 3x/week" is a task, not a transformation. It has no roots.

Thrive's new Identity-First approach flips the script. Instead of starting with habits, you start with identity. Who do you want to be? "I am an Athlete." "I am a Reader." "I am a Mindful Person." These aren't affirmations -- they're commitments. Once you've declared your identity, Thrive helps you figure out what that person does every day and maps those actions to concrete habits. Then, day by day and week by week, Thrive shows you how well you're actually living as that person. Not just whether you checked a box, but whether you're becoming who you set out to be. Thrive helps keep you accountable to being your best self.

Identity outlasts any single goal. A goal has a finish line. An identity is a direction. Thrive's mission is to help you both define that person and, more importantly, become that person.

> "I used to track habits like a to-do list. Now I look at my phone and it says 'You lived as an Athlete 6 out of 7 days this week.' That hits different. I'm not checking boxes anymore -- I'm becoming someone."
> -- Jake, Thrive user

Open Thrive and start with the question that actually matters: Who do you want to be?

### Marketing Angles

**App Store / changelog blurb:**
Introducing Identity-First Habits. Define who you want to be with "I am" statements, and Thrive maps your habits to your identity. Track not just what you did, but who you're becoming. Your weekly recaps now celebrate identity wins and highlight where to focus next.

**Push notification:**
Who do you want to be? Define your identity and watch your habits come alive.

**Social post:**
Goals expire. Identity doesn't. Thrive now starts with one question: Who do you want to be? Your habits follow from there.

---

## Part B: Product Definition

### Jobs to Be Done

- When I'm starting a habit-building journey, I want to define who I aspire to be (not just what I want to do), so I can build habits that feel meaningful and stick long-term.
- When I review my week, I want to see how well I lived as each identity (not just a habit completion percentage), so I can celebrate growth and see where I need to focus.
- When I'm losing motivation, I want to be reminded of the person I committed to becoming, so I can reconnect with my deeper "why" rather than a surface-level goal.

### Target Users

- **New users during onboarding** -- Identity-first framing gives new users a more compelling and emotionally resonant starting point than "pick some habits."
- **Habit-setters who struggle with consistency** -- Users who have tried habit tracking before and dropped off. Identity gives them a "why" that survives bad weeks.
- **Self-improvement oriented users** -- Users who journal, set goals, and think about personal growth. Identity framing aligns with how they already think about change.
- **Existing Thrive users** -- Current users who want to add a layer of meaning to habits they already track.

### Solution Overview

The feature ships in two phases. Phase 1 tests the core emotional hypothesis: do users connect with identity-based habit framing? Phase 2 invests in scoring, trends, and management infrastructure once we know the framing resonates.

**1. Identity Definition (Onboarding -- Phase 1)**

The Identity step replaces the current Goals onboarding step. The existing goal categories (Health & Fitness, Productivity, Mindfulness, etc.) become the organizational structure for identity templates, so we get the same personalization signal without adding a step to the flow. Users define 1-5 identity statements using an "I am ___" format. Thrive presents curated templates organized by category, and users can also write their own. Each identity has an emoji for quick visual recognition. We gently nudge toward 2-3 identities during onboarding to keep things focused.

Curated identity templates (examples by category):

| Category | Identities | Suggested Habits |
| --- | --- | --- |
| Health & Fitness | I am an Athlete, I am a Healthy Eater | Workout, Run, Stretch, Cook at home, Meal prep |
| Mindfulness | I am a Mindful Person, I am at Peace | Meditate, Breathwork, Journal, Digital detox |
| Learning & Growth | I am a Lifelong Learner, I am a Reader | Read 30 min, Study, Practice a skill |
| Productivity | I am Disciplined, I am an Early Riser | Morning routine, Deep work block, Plan tomorrow |
| Relationships | I am a Good Partner, I am a Caring Friend | Quality time, Check in on a friend, Date night |
| Finance | I am Financially Free, I am Intentional with Money | Review budget, No-spend day, Track expenses |
| Creativity | I am a Creator, I am an Artist | Write, Draw, Build something, Practice instrument |

**2. Habit-Identity Mapping (Phase 1)**

Each habit can optionally link to one identity statement. The picker asks "which identity does this most represent?" rather than "which identity does this belong to" -- this framing avoids the awkwardness of habits that could serve multiple identities (e.g., "Morning Run" could be Athlete or Early Riser) while keeping the data model simple. We can explore many-to-many in a future iteration if users ask for it.

During onboarding, after the user picks identities, the habit-creation step suggests habits tailored to their chosen identities (grouped by identity). In the main app, the habit creation/edit form includes an identity picker.

On the home screen, habits display a subtle identity badge (emoji) so the user sees the connection between their daily actions and their identity at a glance.

**3. Weekly Recap Integration (Phase 1)**

The weekly recap AI prompt gains identity context. Recaps now include:

- **Identity scorecard**: "This week, you lived as an Athlete 86% of the time and as a Reader 43% of the time."
- **Identity wins**: Celebrating identities where the user showed up consistently.
- **Identity gaps**: Gently calling out identities that need attention, with specific suggestions ("Your Reader identity only had 3 out of 7 days this week. Try moving your reading habit to morning when your consistency is highest.").

The recap is the primary place users encounter their identity scores in Phase 1. This is intentional -- weekly reflection is the right cadence for identity-level feedback. Daily scoring can create anxiety; weekly gives perspective.

**4. Existing-User Onboarding (Phase 1)**

Existing users who have already onboarded see a "Define Your Identity" card on the home screen (above habits) that links to a lightweight identity-definition flow. This card persists until dismissed or until the user creates at least one identity. The flow reuses the same template picker from onboarding and offers to tag existing habits to identities. Users can also access this from a "My Identity" row on the Profile tab.

**5. Identity Actualization Tracking (Phase 2)**

For each identity, Thrive computes an "actualization score" -- the percentage of mapped habits the user completed in a given period. This surfaces in several places:

- **Home screen**: A compact identity summary card above the habit list showing today's progress toward each identity (e.g., progress rings or a simple "2 of 3" count per identity).
- **Progress tab**: Identity actualization cards showing weekly/monthly trends. Each identity gets a visual showing how consistently the user has lived as that person over time.
- **Identity detail view**: Tap an identity to see its mapped habits, current score, and trend direction.

Scoring rules (to be finalized based on Phase 1 learnings):
- Only days where at least one mapped habit is scheduled count toward the identity's score. Off-days don't penalize.
- Snoozed habits count as incomplete for scoring purposes (snoozing is not living the identity).
- Identities with only 1 mapped habit are scored but shown as a simple "done / not done" rather than a percentage, to avoid the 0%/100% binary feel.
- Weekly scores use the average of daily scores across scheduled days.

**6. Identity Management and Evolution (Phase 2)**

Full identity management from the Profile tab: add, edit, archive, and reorder statements. Archiving an identity preserves its history and habit links -- the user can see how far they came. When a user archives an identity, Thrive acknowledges the milestone ("You've grown past this -- here's how far you came as a Reader") rather than treating it as a cold delete. Habit links to archived identities become unlinked, prompting the user to optionally reassign those habits.

**7. Celebration and Reinforcement (Phase 2)**

- Animated celebration when all habits for an identity are completed in a day ("You fully lived as an Athlete today").
- Evening call voice agent can reference identity context ("You lived as a Reader 5 out of 7 days -- nice work").
- Weekly recap suggests new habits to strengthen under-served identities.
- Identity statements can be shared as a visual card (social sharing).

### Acceptance Criteria

#### Phase 1: Test the Emotional Hypothesis

- [ ] New `identity_statements` table exists with columns: `id`, `user_id`, `statement`, `emoji`, `sort_order`, `is_active`, `created_at`, `updated_at`, with RLS policies matching the existing `habits` pattern
- [ ] `habits` table has a new nullable `identity_statement_id` column with a foreign key to `identity_statements`
- [ ] All database changes are additive (new table, new nullable column) -- no existing columns are dropped, renamed, or made non-nullable. Older app versions that don't know about identity continue to work without errors.
- [ ] The `generate-weekly-recap` edge function gracefully handles users with zero identity statements -- the recap generates identically to today when no identities exist
- [ ] The `WeeklyRecapContent` type's new `identity_review` field is optional; older clients that don't know about it ignore it without breaking
- [ ] Onboarding Identity step replaces the current Goals step (same position in flow, no net new step) where users can select from curated templates and/or write custom "I am ___" statements
- [ ] Curated identity templates are organized by category, each with an emoji and 2-4 suggested habits
- [ ] Users can write custom identity statements during onboarding (freeform "I am ___" input)
- [ ] Users must select at least 1 identity statement to proceed through onboarding
- [ ] Onboarding habits step suggests habits grouped by the user's chosen identities, in addition to freeform habit creation
- [ ] Habit creation/edit form (both onboarding and main app) includes an optional identity picker showing the user's active identity statements
- [ ] Each habit on the home screen displays its linked identity emoji as a subtle badge
- [ ] Weekly recap prompt includes identity context; recap output includes an identity scorecard, wins, and gaps
- [ ] Existing users see a "Define Your Identity" card on the home screen that links to a lightweight identity-definition flow; card dismisses once at least one identity is created
- [ ] Profile tab includes a "My Identity" row for accessing identity setup (new users and existing users)
- [ ] `IdentityStatement` TypeScript interface exists in `lib/types.ts`
- [ ] CRUD functions for identity statements exist in a `lib/identityStatements.ts` module
- [ ] Onboarding completion rate does not decrease compared to the current flow

#### Phase 2: Actualization and Depth (ship after Phase 1 learnings)

- [ ] Home screen shows a compact identity summary card above habits (today's per-identity progress)
- [ ] Progress tab includes an identity actualization section showing each identity's weekly completion percentage with trend over 4-8 weeks
- [ ] Identity detail view (tap an identity to see mapped habits, score, and trend)
- [ ] Full identity management: add, edit, archive, reorder from Profile tab
- [ ] Archiving an identity preserves history and shows a milestone acknowledgement
- [ ] Animated celebration when all habits for an identity are completed in a day
- [ ] Weekly recap suggests new habits to strengthen under-served identities
- [ ] Evening call voice agent references identity context
- [ ] Identity statements can be shared as a visual card

### Success Metrics

#### Phase 1 (core hypothesis validation)

**Primary metric -- does identity framing improve habit behavior?**
- Habit completion rate: users with identity-mapped habits vs. unmapped habits. This is the most important signal. If identity-mapped habits don't see meaningfully higher completion rates, the framing isn't working and Phase 2 needs rethinking.

**Secondary metrics:**
- Onboarding completion rate: must not decrease vs. current flow (identity step replaces Goals, so the funnel length is unchanged)
- Habits mapped to identities: % of habits with an identity link (target: >60% within 2 weeks of onboarding)
- Existing-user identity adoption: % of existing users who define at least one identity within 2 weeks of the feature launch
- Recap engagement: time spent in recap detail view (identity scorecard should increase engagement)

**Qualitative:**
- Users describe their habits in identity terms ("my Athlete habits") rather than task terms
- Users report feeling more motivated by the identity framing vs. generic habit tracking

#### Phase 2 (depth and engagement)

- Identity actualization score trend: average weekly scores should trend upward over a user's first month
- Progress tab engagement: are users checking their identity scores regularly?
- Identity evolution: are users adding/archiving identities over time (signal of an evolving relationship with the feature)?
- Celebration engagement: do identity-completion celebrations drive same-day or next-day return?

### Decisions Made

These were open questions during drafting that have been resolved:

- **Identity replaces Goals in onboarding.** The current Goals step selects broad categories (Health, Productivity, etc.). Those categories become the organizational structure for identity templates. This gives us the same personalization signal without adding a step to the flow.
- **Identity-to-habit mapping is one-to-one.** Each habit links to at most one identity. The picker asks "which identity does this most represent?" to set the right expectation. This keeps scoring simple and the data model clean. If users consistently ask for many-to-many, we can revisit in a future iteration.
- **Actualization scoring is Phase 2.** Daily scoring on the home screen can create anxiety. Phase 1 uses the weekly recap as the primary identity-feedback surface, which is the right cadence for reflection. Phase 2 introduces daily and progress-tab scoring once we know users connect with the framing.
- **1-5 identity statements, nudge toward 2-3.** Too few feels limiting; too many dilutes focus.

### Open Questions

- How should the onboarding Plan screen ("Your Plan is Ready") adapt to show identity statements instead of goal categories? It currently shows "Your Focus Areas" as tags -- identity statements with emojis could replace these directly, or the screen could be reframed around "The person you're becoming."
- For existing-user onboarding, should the "Define Your Identity" home screen card also offer to auto-suggest identities based on the user's existing habits? (e.g., if they track "Run" and "Workout," suggest "I am an Athlete")
- What's the right empty state for the weekly recap identity scorecard when a user has identities but no habits mapped to any of them?
- Should the identity picker in the habit form be required or optional? Making it required increases mapping rates but adds friction. Recommendation: optional but prominent, with a nudge if the user skips it.

### Implementation Notes

#### Backward Compatibility (applies to all phases)

This feature must not break older app versions or users who haven't adopted identities yet. Concretely:

- **Database migrations are additive only.** New tables and new nullable columns. No dropping, renaming, or adding NOT NULL constraints to existing columns. The `identity_statement_id` column on `habits` is nullable with no default -- older clients that insert habits without it continue to work.
- **Edge functions handle the zero-identity case.** The `generate-weekly-recap` function must check whether the user has any identity statements before including identity context in the AI prompt. If none exist, the recap generates identically to today's behavior. The same applies to any future edge function that reads identity data.
- **Response schemas are backward-compatible.** New fields on `WeeklyRecapContent` (e.g., `identity_review`) are optional. Older clients that parse the recap response simply ignore unknown fields. New clients must gracefully handle recaps generated before the feature existed (where `identity_review` is absent).
- **No existing API contracts change.** Habit CRUD endpoints continue to work without `identity_statement_id`. The field is accepted but not required.

#### Phase 1

**Database:**

- New migration `supabase/migrations/011_add_identity_statements.sql` creates the `identity_statements` table and adds `identity_statement_id` as a nullable FK to `habits`. RLS policies follow the `auth.uid() = user_id` pattern from `supabase/schema.sql`.
- Identity templates are a static client-side constant (not a database table), similar to how `GOAL_OPTIONS` works in `app/(onboarding)/goals.tsx`.

**Types and data layer:**

- `lib/types.ts`: Add `IdentityStatement` interface (`id`, `user_id`, `statement`, `emoji`, `sort_order`, `is_active`, `created_at`, `updated_at`).
- New `lib/identityStatements.ts`: CRUD functions following the patterns in `lib/habits.ts` and `lib/goals.ts`.
- `Habit` interface gets optional `identity_statement_id: string | null`.
- New React Query hooks in `hooks/useIdentityQuery.ts`.

**Onboarding:**

- `app/(onboarding)/goals.tsx` is replaced by a new `app/(onboarding)/identity.tsx` screen. The design is similar (card grid) but features identity statements with emojis, organized by category. The same categories from `GOAL_OPTIONS` become the template organizer.
- `app/(onboarding)/_layout.tsx`: Replace `goals` with `identity` in the stack. `OnboardingProgress` total stays at 7.
- `app/(onboarding)/habits.tsx`: Receives selected identities via params; groups suggested habits by identity; each suggested habit auto-links to its identity.
- `app/(onboarding)/plan.tsx`: Update "Your Focus Areas" to show identity statements with emojis instead of goal category tags. Optionally reframe as "The Person You're Becoming."

**Home screen (`app/(tabs)/index.tsx`):**

- `PriorityItem` component (or its wrapper) displays the identity emoji badge next to each habit name.
- New `DefineIdentityCard` component for existing users who haven't set up identities. Appears above the habit list, dismissible, links to the identity flow.

**Habit form (`components/HabitForm.tsx`):**

- Add an identity picker (dropdown or bottom sheet) showing the user's active identity statements. Pre-selects when creating from an identity context (e.g., onboarding habit suggestions).

**Weekly recaps (`supabase/functions/generate-weekly-recap/index.ts`):**

- Fetch user's identity statements and habit-identity mappings alongside existing data.
- Compute per-identity completion rates for the week.
- Augment the AI prompt with identity context: which identities the user has, which habits map to each, and the per-identity completion rates.
- Extend `WeeklyRecapContent` in `lib/types.ts` with an optional `identity_review` field (backward-compatible with existing recaps that lack it).

**Profile tab (`app/(tabs)/profile.tsx`):**

- Add "My Identity" row that navigates to the identity setup flow.

**Analytics (`lib/analytics.ts`):**

- Proposed new events (pending approval per analytics governance):
  - `identity_created` -- `statement`, `emoji`, `is_template`, `source` (onboarding | settings | existing_user_card)
  - `identity_updated` -- `identity_id`, `fields_changed`
  - `identity_deleted` -- `identity_id`
  - `identity_onboarding_completed` -- `identity_count`, `template_count`, `custom_count`
  - `habit_identity_linked` -- `habit_id`, `identity_id`, `source`
  - `habit_identity_unlinked` -- `habit_id`, `identity_id`

#### Phase 2

**Progress tab (`app/(tabs)/progress.tsx`):**

- New `IdentityActualization` component section alongside existing Goals and Health Metrics sections. Shows each identity with a completion percentage bar for the current week and a sparkline trend over 4-8 weeks.

**Identity detail view:**

- New screen or modal accessible from the Progress tab or Profile. Shows an identity's mapped habits, current actualization score, and weekly trend chart.

**Identity management:**

- Full CRUD screen accessible from Profile tab: add, edit, archive, reorder. Archive flow includes milestone acknowledgement and habit-reassignment prompt.

**Home screen (`app/(tabs)/index.tsx`):**

- Identity summary card above the habit list showing per-identity progress for today (progress rings or "2 of 3" counts).

**Celebrations:**

- Animated identity-completion celebration triggered when the last habit for an identity is completed on a given day.

**Evening calls (`supabase/functions/vapi-server/index.ts`):**

- Include identity context in the voice agent's end-of-day summary.

