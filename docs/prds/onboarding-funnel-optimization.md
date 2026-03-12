# Onboarding Funnel Optimization

> Restructure the onboarding flow to maximize trial starts, account creation, and setup completion — by putting the right things in front of users at the right time.

---

## Part A: The Story

### Press Release

**HEADLINE: Thrive Cuts Onboarding to Under 60 Seconds — and Conversion Jumps**

**SUBHEADING: A leaner, smarter onboarding flow gets users to their "aha moment" faster by asking less before the paywall and delivering more after.**

Most habit apps lose the majority of their potential users before they ever try the product. The culprit isn't the product itself — it's the gauntlet of screens standing between "download" and "use." Users are asked to define identities, answer personality quizzes, and set up habits before they've seen a single feature. By the time the paywall appears, the curious have already left.

Thrive's new onboarding flow flips the script. Instead of front-loading setup, it front-loads *desire*. A streamlined pre-paywall experience (3 screens, under 60 seconds) builds just enough investment to make the free trial feel earned — not demanded. The heavy, meaningful setup work (identity, habits, features) moves *after* the paywall, where commitment is high and drop-off tolerance is low. Social sign-in (Apple & Google) eliminates the single highest-friction step in the entire funnel.

> "I downloaded Thrive and was setting up my habits within a minute. I didn't even realize I'd started a trial until I was already hooked."
> — Sarah, Thrive user

The result: fewer screens before the ask, a more personalized paywall, frictionless account creation, and a post-paywall setup experience that feels like building *your* system rather than completing a form.

### Marketing Angles

**App Store / changelog blurb:**
Getting started with Thrive is now faster than ever. A streamlined onboarding experience gets you building habits in under a minute, with Apple and Google sign-in for effortless account creation.

**Push notification:**
We made getting started even easier — set up your habits in under 60 seconds.

**Social post:**
Most habit apps lose you before you even try them. We rebuilt Thrive's onboarding from the ground up — 3 screens to your free trial, social sign-in, and a setup experience that actually feels good. Your best self shouldn't require a 10-step form.

---

## Part B: Product Definition

### Strategic Analysis: The Current Funnel

The existing flow has **6 screens before the paywall** and **email/password as the only auth method**:

```
Welcome → Identity → Experience → Challenge → Plan → Paywall → (Sign-up) → Habits → Features
   1         2          3            4          5       6           7          8         9
```

**Key problems identified from the code audit:**

| Issue | Impact | Evidence |
|-------|--------|----------|
| 6 screens before paywall | Each screen costs ~10-20% of remaining users (industry data). At 6 screens, potentially only 30-50% reach the paywall. | `app/(onboarding)/_layout.tsx` screen order |
| Email/password only auth | Mobile apps see 2-3x higher sign-up completion with Apple/Google sign-in vs. email/password. Password requirements (uppercase + number + 8 chars) add further friction. | `app/(auth)/sign-up.tsx` — no social auth providers |
| Separate "Plan" and "Paywall" screens | Two screens to communicate one message ("here's what you get, start your trial"). Creates an extra tap that doesn't add value. | `app/(onboarding)/plan.tsx` + `paywall.tsx` are sequential |
| Identity setup is heavy pre-paywall | Category browsing, template selection, custom input with category picker — significant cognitive load before users have any commitment. | `app/(onboarding)/identity.tsx` — complex multi-section screen |
| Data loss for unauthenticated users | Sign-up screen passes `goals` (legacy param) instead of `identities`, so identity selections are lost for users who aren't authenticated at paywall time. | `app/(auth)/sign-up.tsx` line 31-34, 68-74 |
| No social proof anywhere | No ratings, user counts, testimonials, or trust signals in the entire flow. | All onboarding screens lack social proof |
| Progress bar shows 5/7 at paywall | Psychologically signals "you're not even done yet" right when asking for money. | `paywall.tsx` line 165 |

### Jobs to Be Done

- When I download a new habit app, I want to quickly understand if it's worth my time, so I can start a free trial with confidence that it'll work for me.
- When I've decided to try the app, I want to create an account with minimal effort, so I don't lose momentum between deciding and doing.
- When I've committed to the trial, I want to set up a system that feels personalized and complete, so I start day one feeling ready — not confused.
- When I'm in my first week, I want to feel early wins and clear progress, so I convert from trial to paid subscriber.

### Target Users

- **New downloads**: Users who just installed from the App Store. They're curious but uncommitted — attention span is 30-60 seconds before they decide to stay or delete.
- **Returning lapsed users**: Users who downloaded before but didn't complete onboarding. They need an even faster path back.
- **Social-auth-expecting users**: Mobile-native users (especially iOS) who expect Apple Sign In and will abandon if forced into email/password.

### Solution Overview: The Three-Phase Funnel

The core strategic principle: **minimize friction before commitment, maximize value after commitment.**

```
PHASE A: DESIRE (pre-paywall)          PHASE B: COMMITMENT (post-paywall)     PHASE C: ACTIVATION (first week)
┌─────────────────────────┐            ┌──────────────────────────┐           ┌──────────────────────────┐
│ 1. Welcome + Social     │            │ 4. Sign-Up               │           │ • Guided first check-in  │
│    Proof                │──3 screens─│    (Apple/Google/Email)   │──setup──▶ │ • Day 3 nudge            │
│ 2. Quick Personalization│  < 60 sec  │ 5. Identity Setup (full) │  ~3 min   │ • Day 5 trial reminder   │
│ 3. Paywall (with plan   │            │ 6. Habits                │           │ • Day 7 recap            │
│    summary baked in)    │            │ 7. Features (optional)   │           └──────────────────────────┘
└─────────────────────────┘            └──────────────────────────┘
```

#### Phase A: Desire (Pre-Paywall) — 3 Screens

**Screen 1: Welcome (redesigned)**
- Thrive logo + headline
- 3 punchy value props with icons (keep existing)
- **Add**: social proof strip — "Join 10,000+ people building better habits" or App Store rating badge
- **Add**: subtle app preview (a small mockup/screenshot showing the home screen with habits checked off)
- CTA: "Get Started" → Screen 2

**Screen 2: Quick Personalization (new, replaces Identity + Experience + Challenge)**
- Single screen with one question: "What best describes you?"
- 3-4 large, tappable archetype cards (e.g., "Getting Healthy", "Building Focus", "Finding Balance", "Leveling Up")
- Each card has an icon, title, and 1-line description
- Tapping one highlights it and enables "Continue"
- **Purpose**: Creates psychological investment (they've told us something about themselves) without the cognitive load of the full identity/experience/challenge flow
- This selection seeds the paywall messaging and post-paywall identity suggestions

**Screen 3: Paywall (redesigned, absorbs the "Plan" screen)**
- Headline references their selection: "Your [archetype] plan is ready"
- Trial timeline (keep existing — it's good)
- Plan options (keep existing)
- **Add**: 1-2 lines of personalized context based on archetype selection
- **Add**: social proof — "4.8★ from 2,000+ reviews" or similar
- **Remove**: separate progress bar (the paywall should feel like a destination, not step 5 of 7)
- CTA: "Start Free Trial"

#### Phase B: Commitment (Post-Paywall) — 3-4 Screens

Users who reach this phase have started their trial. Drop-off tolerance is much higher — these users *want* to set up.

**Screen 4: Account Creation**
- **Apple Sign In** button (primary, top)
- **Google Sign In** button (secondary)
- **Email/password** option (tertiary, collapsed or "Other options")
- Post-purchase context: "Your trial is active! Create an account to keep your progress safe."
- No progress bar — this should feel quick, not like a step

**Screen 5: Identity Setup (existing screen, now post-paywall)**
- The full identity selection experience we just built (templates, custom input, category picker)
- This is where the heavy, valuable personalization happens
- Pre-paywall archetype selection pre-seeds suggested categories (e.g., "Getting Healthy" opens with Health & Fitness templates expanded)
- Progress: "Step 1 of 3"

**Screen 6: Habits (existing screen)**
- Suggested habits based on identity selections
- Add your own via HabitForm with identity linking
- Progress: "Step 2 of 3"

**Screen 7: Features (existing screen, simplified)**
- Top 3, Journal, Evening Call toggles
- Progress: "Step 3 of 3"
- CTA: "Let's Go!" → Main app

#### Phase C: Activation (First Week) — Background

These are not new screens but behavioral nudges during the trial period:

- **First session**: After onboarding completes, the home screen shows a brief "welcome" state highlighting today's habits and encouraging the first check-in
- **Day 3**: If engagement is low, a push notification nudges: "You're 3 days into your journey as [identity]. Check in today?"
- **Day 5**: Trial reminder (existing) — but now personalized with identity context
- **Day 7**: Weekly recap lands, reinforcing the value they've gotten

### Acceptance Criteria

#### Must Have (Phase 1 — Quick Wins)

- [ ] Paywall screen absorbs the "Your Plan is Ready" content — plan.tsx is removed as a separate step, its key elements (identity tags, personalized tip, feature summary) are incorporated into the paywall screen above the plan selection
- [ ] Welcome screen includes at least one social proof element (user count, rating, or testimonial)
- [ ] Sign-up screen correctly passes `identities` (not `goals`) to the habits screen for unauthenticated users, preserving identity selections through the full flow
- [ ] Paywall removes the progress bar indicator (or changes it to not show "5 of 7") so it feels like a destination rather than an intermediate step
- [ ] Analytics events are added for each funnel step transition, including: `onboarding_step_viewed` (with step name), `onboarding_step_completed` (with step name + duration), and `onboarding_abandoned` (with last step seen)

#### Must Have (Phase 2 — Flow Restructure)

- [ ] Pre-paywall flow is exactly 3 screens: Welcome → Quick Personalization → Paywall
- [ ] Quick Personalization screen presents 3-4 archetype cards; selection is stored in onboarding params and used to personalize the paywall headline
- [ ] Identity, Experience, and Challenge screens are removed from pre-paywall flow
- [ ] Full Identity Setup screen moves to post-paywall (between sign-up and habits)
- [ ] Archetype selection pre-seeds which identity category is shown first/expanded on the Identity Setup screen
- [ ] Post-paywall progress bar shows "Step N of 3" (Identity → Habits → Features)
- [ ] All onboarding data (archetype, identities, habits) flows correctly through the full funnel without data loss

#### Must Have (Phase 3 — Social Auth)

- [ ] Apple Sign In is implemented as the primary sign-up option on the account creation screen
- [ ] Google Sign In is implemented as a secondary option
- [ ] Email/password sign-up is preserved as a tertiary option (accessible via "Sign up with email" link)
- [ ] Social auth correctly creates a Supabase user and profile
- [ ] Post-purchase sign-up flow (where user has already subscribed) works with all three auth methods
- [ ] Existing email/password sign-in screen also offers Apple/Google options

#### Nice to Have

- [ ] Paywall headline dynamically references the user's archetype selection ("Your fitness plan is ready" vs. "Your focus plan is ready")
- [ ] Welcome screen shows a brief animated preview of the app experience
- [ ] "Quick Personalization" screen uses subtle entrance animations on the archetype cards
- [ ] Post-onboarding "welcome state" on the home screen highlights the user's first habit and encourages a check-in
- [ ] Day 3 and Day 5 push notifications reference the user's identity statements for personalization
- [ ] A/B test framework for paywall copy and layout variations

### Success Metrics

**Primary (conversion):**
- **Trial start rate**: % of users who reach the paywall and start a trial. Target: 40%+ (from estimated ~25-30% baseline based on screen count)
- **Account creation rate**: % of trial starters who create an account. Target: 85%+ with social auth (from estimated ~60% with email-only)
- **Setup completion rate**: % of account creators who complete identity + habits setup. Target: 80%+

**Secondary (quality):**
- **Time to trial start**: Median seconds from app open to paywall CTA tap. Target: < 60 seconds
- **Day 7 retention**: % of trial starters who open the app on day 7. Target: 40%+
- **Trial-to-paid conversion**: % of trial starters who become paid subscribers. Target: 15%+ (industry benchmark for habit apps)

**Leading indicators:**
- Onboarding step completion rates (step-over-step)
- Quick Personalization archetype distribution (are users engaging or just tapping through?)
- Identity setup depth post-paywall (more identities = more investment = higher retention)

### Open Questions

- **Social proof content**: What specific numbers or ratings can we use? If Thrive is early-stage, "Join thousands building better habits" may be safer than a specific number. Need to decide on copy.
- **Archetype definitions**: The 3-4 archetype cards for Quick Personalization need careful product design. They must feel meaningful (not generic) while mapping cleanly to identity categories. Candidate archetypes: "Getting Healthy" (health/fitness), "Sharpening My Mind" (learning/productivity), "Finding Balance" (mindfulness/relationships), "Reinventing Myself" (broad/creative).
- **Apple Developer setup**: Apple Sign In requires App ID configuration, entitlements, and a Service ID for Supabase. Google Sign In requires OAuth consent screen setup. These have lead time.
- **RevenueCat and social auth**: Need to verify that RevenueCat purchase receipts can be associated with users who sign up via Apple/Google auth *after* purchasing (the current flow allows anonymous purchases before account creation).
- **Existing user migration**: If the flow restructure changes param naming or screen order, existing users mid-onboarding (who have the app backgrounded) could hit navigation errors. Need a graceful fallback.
- **A/B testing infrastructure**: To properly optimize the funnel, we should be able to test paywall variants. Is PostHog feature flags sufficient, or do we need additional tooling?

### Implementation Notes

**Phase 1 — Quick Wins (estimated: 1-2 days)**

These are changes to existing screens with no flow restructure:

- **Merge plan into paywall**: Move the key content from `app/(onboarding)/plan.tsx` (identity tags, personalized tip, feature list) into `app/(onboarding)/paywall.tsx`. Remove `plan` from the stack in `app/(onboarding)/_layout.tsx`. Update `app/(onboarding)/challenge.tsx` to navigate directly to `paywall` instead of `plan`.
- **Fix data loss bug**: In `app/(auth)/sign-up.tsx`, change `useLocalSearchParams` to accept `identities` instead of `goals`, and pass `identities` (not `goals`) when navigating to `/(onboarding)/habits`. This is a direct find-and-replace.
- **Add social proof to welcome**: Add a small text element or badge to `app/(onboarding)/index.tsx`.
- **Paywall progress bar**: Remove `<OnboardingProgress>` from `paywall.tsx`, or update step numbers to reflect the merged flow.
- **Funnel analytics**: Add step-level tracking events in each onboarding screen (leverage existing `captureEvent` and `EVENTS` from `lib/analytics.ts`).

**Phase 2 — Flow Restructure (estimated: 3-5 days)**

- **New Quick Personalization screen**: Create `app/(onboarding)/personalize.tsx` with 3-4 archetype cards. This replaces `identity.tsx`, `experience.tsx`, and `challenge.tsx` in the pre-paywall flow.
- **Layout update**: `app/(onboarding)/_layout.tsx` screen order becomes: `index → personalize → paywall → sign-up → identity → habits → features`. Note: sign-up moves into the onboarding group rather than `(auth)`.
- **Identity screen seeding**: Pass the archetype selection to the identity screen. Use it to pre-expand the matching category in `IDENTITY_CATEGORIES` from `lib/identityTemplates.ts`.
- **Paywall personalization**: Accept the archetype param and use it in the headline copy.
- **Auth routing update**: `lib/authRouting.ts` needs to handle the new flow where sign-up is a step within onboarding rather than a separate group. The `has_onboarded` flag still marks completion, but the intermediate state (subscribed but not signed up) needs careful routing.

**Phase 3 — Social Auth (estimated: 3-5 days)**

- **Apple Sign In**: Use `expo-apple-authentication` for the native flow. Configure Supabase Auth with Apple provider. Requires Apple Developer portal setup (App ID capabilities, Service ID, key).
- **Google Sign In**: Use `@react-native-google-signin/google-signin` or `expo-auth-session`. Configure Supabase Auth with Google provider. Requires Google Cloud Console OAuth setup.
- **Auth context update**: `contexts/AuthContext.tsx` needs new `signInWithApple()` and `signInWithGoogle()` methods alongside existing `signUp()` and `signIn()`.
- **Sign-up screen redesign**: `app/(auth)/sign-up.tsx` becomes a screen with social buttons prominently displayed and email/password as a secondary option.
- **RevenueCat user association**: After social auth creates a Supabase user, ensure the RevenueCat anonymous user ID is associated with the new authenticated user via `Purchases.logIn()`.

**Backward Compatibility**

- No database changes required for Phase 1 or 2.
- Phase 3 (social auth) adds new auth providers to Supabase Auth config but doesn't modify existing tables — existing email/password users are unaffected.
- Auth routing changes must handle edge cases: users on older app versions who have `has_onboarded = false` should still be directed to *some* valid onboarding flow, even if the screen names have changed.
- All new analytics events are additive — no existing events are renamed or removed.
