# Native Build + TestFlight

Trigger a full native iOS build and TestFlight submission via the GitHub Actions workflow. Use this when you've made native changes (new native deps, SDK bumps, app.json config changes).

Build notes: {{input}}

## Steps

1. Ensure all changes are committed and pushed to `main`. If there are uncommitted changes, warn the user and stop.
2. Run `gh workflow run build-submit.yml --ref main -f notes="{{input}}"` with `required_permissions: ["all"]` to trigger the workflow.
3. Run `gh run list --workflow=build-submit.yml --limit 1` to get the run URL and report it to the user so they can monitor progress.
