---
name: review-edge-function-logs
description: Fetch and analyze Supabase Edge Function logs to diagnose errors, timeouts, and unexpected behavior. Use when the user asks to check edge function logs, debug a edge function, investigate a server-side error, or troubleshoot webhook/API issues.
---

# Review Edge Function Logs

## Project context

- **Supabase project ID**: `ptoivasmkjvivymerjmn`
- **MCP server**: `plugin-supabase-supabase`
- **Local function source**: `supabase/functions/<function-slug>/index.ts`

## Workflow

### Step 1: Fetch edge function logs

Use the Supabase MCP `get_logs` tool:

```
CallMcpTool:
  server: plugin-supabase-supabase
  toolName: get_logs
  arguments:
    project_id: ptoivasmkjvivymerjmn
    service: edge-function
```

This returns logs from the last 24 hours across all edge functions.

### Step 2: Triage the logs

Scan the returned logs and categorize entries:

1. **Errors** (non-2xx status codes, unhandled exceptions, stack traces)
2. **Warnings** (slow responses >5s, retry patterns, partial failures)
3. **Normal** (2xx responses, expected behavior)

Focus on errors first. For each error, note:
- Which function produced it (check the function name / path in the log)
- The timestamp and frequency (one-off vs recurring)
- The error message and any stack trace
- The HTTP status code returned

### Step 3: Read function source code for context

If an error points to a specific function, read its deployed source and local source:

**Deployed source** (what's actually running):

```
CallMcpTool:
  server: plugin-supabase-supabase
  toolName: get_edge_function
  arguments:
    project_id: ptoivasmkjvivymerjmn
    function_slug: <function-name>
```

**Local source** (what's in the repo):

Read `supabase/functions/<function-name>/index.ts`

Compare deployed vs local if there's a mismatch suspicion.

### Step 4: List all functions (if needed)

To see all deployed functions:

```
CallMcpTool:
  server: plugin-supabase-supabase
  toolName: list_edge_functions
  arguments:
    project_id: ptoivasmkjvivymerjmn
```

### Step 5: Present findings

Summarize results using this structure:

```
## Edge Function Log Review

**Time range**: Last 24 hours
**Total errors**: X
**Functions affected**: list

### Errors

#### [function-name] — short description
- **Count**: how many times
- **Status**: HTTP status code
- **Error**: error message
- **Likely cause**: brief analysis
- **Suggested fix**: what to change

### Warnings (if any)

#### [function-name] — short description
- Details...

### Healthy functions
- list of functions with no issues
```

## Known edge functions

| Slug | Purpose |
|------|---------|
| `generate-weekly-recap` | Generates weekly recap summaries |
| `revenuecat-webhook` | Handles RevenueCat subscription webhooks |
| `redeem-discount-code` | Processes discount code redemptions |
| `vapi-server` | VAPI voice AI server integration |
| `schedule-evening-calls` | Schedules evening call reminders |

## Tips

- If logs are empty, the function may not have been invoked recently — check if it's triggered by a cron, webhook, or client call.
- Edge function logs only cover the last 24 hours. For older issues, ask the user about when the problem occurred.
- For database-related errors inside edge functions, also pull Postgres logs (`service: "postgres"`) for correlated failures.
- For auth-related errors, also pull auth logs (`service: "auth"`).
