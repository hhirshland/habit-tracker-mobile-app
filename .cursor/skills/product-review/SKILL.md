---
name: product-review
description: Structured product audit using the addition-by-subtraction lens. Evaluates every feature against Thrive's identity-first north star and proposes removals, consolidations, or repositioning. Use when the user asks to review the product, audit features, simplify the app, apply addition by subtraction, or asks what should be removed.
---

# Product Review

Run a structured audit of Thrive's product surface, evaluating each feature against the identity-first north star. The goal is to make the product better by being intentional about what stays, what goes, and what gets repositioned.

## When to Use

- User asks to "review the product," "audit features," "simplify," or "what should we remove"
- User mentions "addition by subtraction"
- Quarterly product health check
- Before a major new feature — audit what exists first

## Workflow

### Step 1: Gather Context

Read these files to understand the current product surface:

- `docs/prds/identity-first-habits.md` — product vision and identity thesis
- `docs/feature-positioning.md` — current feature map with roles and internal/external names
- `.cursor/rules/product-philosophy.mdc` — north star and decision-making lens

Then explore the codebase to build a complete picture:

- `app/(tabs)/` — main app screens and tab structure
- `app/(onboarding)/` — onboarding flow
- `lib/types.ts` — data model (what entities exist)
- `lib/userSettings.ts` — feature toggles
- `supabase/functions/` — backend capabilities

### Step 2: Evaluate Each Feature

For every major feature or surface, answer:

1. **Identity alignment** — Does this help the user become the person they want to be?
2. **Loop position** — Does it strengthen the morning/daytime/evening loop?
3. **Overlap** — Does it duplicate or compete with another feature?
4. **Complexity cost** — How much cognitive load does it add for the user?
5. **Usage signal** — If analytics data is available, is this feature actually used?

### Step 3: Categorize Recommendations

Sort each feature into one of four buckets:

- **Keep** — Clearly aligned, well-positioned, earning its place
- **Reposition** — Good idea, wrong framing. Change the copy, placement, or mental model without removing functionality
- **Consolidate** — Two features doing overlapping jobs. Merge into one stronger surface
- **Remove** — Not aligned with the thesis, adds complexity without proportional value

### Step 4: Present and Discuss

Present recommendations grouped by category. For each:

- State what you recommend and why (1-2 sentences)
- Reference the specific evaluation criteria that drove the decision
- Acknowledge tradeoffs honestly

Explicitly invite pushback. The user knows their product better than you do — your job is to provide a structured lens, not dictate decisions. Be ready to change your mind when the user offers context you didn't have.

### Step 5: Iterate

Incorporate user feedback. Common patterns:

- User disagrees with a removal → explore whether repositioning achieves the same goal
- User agrees but wants to keep for now → note it as a "watch" item with a revisit date
- User has usage data you didn't → update the recommendation

### Step 6: Build Execution Plan

For accepted recommendations, produce a concrete plan:

- Group changes into numbered workstreams that can be executed independently
- For each workstream: list specific files to change, what changes, and why
- Flag backward compatibility considerations (see `.cursor/rules/backward-compatibility.mdc`)
- Identify which PRDs need updating

### Step 7: Execute and Update Docs

As changes are implemented:

- Update affected PRDs in `docs/prds/` to reflect new positioning
- Update `docs/feature-positioning.md` with any changes to feature roles or names
- Follow `.cursor/rules/naming-conventions.mdc` if rebranding features

## Tips

- Start broad, then go deep. Don't get lost in implementation details during evaluation.
- The best recommendation is often "reposition" not "remove" — a feature framed wrong isn't the same as a feature that shouldn't exist.
- Pay attention to the user's emotional reaction. Strong pushback often means you're missing context about why a feature matters to their users.
- Keep the conversation collaborative. Use phrases like "I'd push back here" and "thoughts?" rather than declarative statements.
