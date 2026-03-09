---
name: create-prd
description: Guides through creating a Product Requirements Document with narrative/marketing framing, jobs to be done, and acceptance criteria. Use when the user asks to create a PRD, product requirement, feature spec, product doc, or write up a feature idea.
---

# Create PRD

Create polished PRD documents that combine compelling product narrative with clear, actionable requirements. PRDs live in `docs/prds/<feature-slug>.md`.

## Workflow

### Step 1: Gather the feature idea

If the user provided a feature idea (directly or via `/create-prd`), use it as the starting point. If the conversation already contains context about the feature, infer from that.

If neither is available, ask:

> What feature or product idea would you like to write a PRD for? Give me a sentence or two and I'll help shape it.

### Step 2: Sharpen the idea with questions

Before drafting, ask 2-3 focused questions to pressure-test the idea. Pick from these based on what's missing:

- **Job to be done**: "What's the core job a user is hiring this feature to do?"
- **Magic moment**: "What's the single moment where the user thinks 'this is great'?"
- **Current alternative**: "How do users solve this today without the feature?"
- **Success signal**: "If this ships and works perfectly, what changes for the user?"
- **Scope gut-check**: "Is this a standalone feature, an enhancement to something existing, or a new surface/screen?"

Use `AskQuestion` when available. Ask at most 3 questions at a time. If the user has already answered these through prior context, skip ahead.

### Step 3: Draft the PRD

Generate the full PRD using the template below. Fill in every section with real content based on what you've learned. Do not leave placeholder text.

**Tone guidance:**

- **Press Release**: Write like a real product announcement. Genuine excitement, not corporate fluff. The reader should feel "I want that."
- **Jobs to Be Done**: Use the canonical format precisely.
- **Acceptance Criteria**: Each item should be testable. A developer should be able to read one and know exactly when it passes or fails.
- **Implementation Notes**: Reference actual areas of the Thrive codebase when relevant (screens, hooks, Supabase tables, edge functions).

### Step 4: Present and iterate

Show the full draft to the user. Ask:

> How does this feel? Anything to add, cut, or rephrase?

Revise as many times as the user wants before saving.

### Step 5: Save the PRD locally

1. Create the `docs/prds/` directory if it doesn't exist (`mkdir -p docs/prds`).
2. Derive a slug from the feature name (lowercase, hyphens, no special chars). Example: "Weekly Streak Rewards" becomes `weekly-streak-rewards`.
3. Write the final PRD to `docs/prds/<feature-slug>.md`.

### Step 6: Add to Notion

After saving locally, add the PRD to the **Thrive PRDs** Notion database.

- **MCP server**: `plugin-notion-workspace-notion`
- **Database data source ID**: `31d1fd87-133d-802b-bcb8-000badce12e6`

1. **Create the page.** Use `notion-create-pages` with the known data source ID. Set `Name` (title property) to the feature name and include the full PRD body as the page content in Notion Markdown format.

```
CallMcpTool:
  server: plugin-notion-workspace-notion
  toolName: notion-create-pages
  arguments:
    parent:
      data_source_id: "31d1fd87-133d-802b-bcb8-000badce12e6"
    pages:
      - properties:
          Name: "<Feature Name>"
        content: "<Full PRD body in Notion Markdown>"
```

If the database schema has changed (new properties added), fetch it first to see the current schema:

```
CallMcpTool:
  server: plugin-notion-workspace-notion
  toolName: notion-fetch
  arguments:
    id: "31d1fd87-133d-8065-b04d-ccd45f3fd994"
```

If the Notion MCP is not connected or authentication fails, skip this step and let the user know they need to authorize the Notion integration in Cursor settings (Tools & MCP) first.

---

## PRD Template

The template has two halves:
- **Part A (The Story)** validates that the feature is exciting and valuable.
- **Part B (Product Definition)** specifies what to build.

```markdown
# [Feature Name]

> [One-line elevator pitch — what it is and why anyone should care]

---

## Part A: The Story

### Press Release

**[HEADLINE]: [Compelling announcement headline]**

**[SUBHEADING]: [Who this is for and the key benefit, one sentence]**

[Problem paragraph — describe the frustration or gap that exists today. Make the reader nod along.]

[Solution paragraph — describe what the feature does and why it's meaningfully better. Be specific about the experience, not the implementation.]

> "[Customer quote — a fictional but realistic quote from a user who loves this feature.]"
> — [Name], Thrive user

[Call to action — how users access the feature or what they should do next.]

### Marketing Angles

**App Store / changelog blurb:**
[2-3 sentences suitable for release notes or an App Store "What's New" entry.]

**Push notification:**
[Single sentence to re-engage users, with a clear hook.]

**Social post:**
[One punchy sentence + a hook or question to drive engagement.]

---

## Part B: Product Definition

### Jobs to Be Done

- When [situation], I want to [motivation], so I can [outcome].
- When [situation], I want to [motivation], so I can [outcome].

### Target Users

[Who benefits most from this feature? Describe relevant user segments, behaviors, or personas.]

### Solution Overview

[What the feature does at a high level. Key capabilities and the core user experience — describe the flow a user goes through, not the code.]

### Acceptance Criteria

#### Must Have

- [ ] [Testable criterion — a developer can verify this passes or fails]
- [ ] [Testable criterion]
- [ ] [Testable criterion]

#### Nice to Have

- [ ] [Testable criterion]
- [ ] [Testable criterion]

### Success Metrics

[How we'll know this worked. Include both quantitative signals (adoption rate, retention, engagement) and qualitative signals (user feedback, sentiment). Be specific about what "good" looks like.]

### Open Questions

- [Unresolved decision, risk, or assumption to validate]
- [Anything that could change the scope or approach]

### Implementation Notes

[Rough technical considerations for handoff to implementation planning. Reference relevant parts of the codebase — screens, components, hooks, Supabase tables, edge functions, etc. Flag dependencies or risks. This section is a bridge to the engineering plan, not a substitute for it.]
```

---

## Tips

- If the feature idea is vague, the sharpening questions in Step 2 are the most important part. Don't rush past them.
- The press release should be the hardest section to write. If it's easy, the idea probably isn't clear enough yet.
- Keep acceptance criteria to 5-10 must-haves. If there are more, the scope is likely too big — suggest splitting into phases.
- Reference existing Thrive patterns (habits, goals, health metrics, weekly recaps) when they're relevant to the feature.
- PRDs are living documents. After saving, the user can ask to update a PRD and you should edit the existing file.
