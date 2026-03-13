# OTA Update

Push an over-the-air update to iOS users via EAS Update.

Branch: {{branch:production,preview}}
Update message: {{input}}

## Steps

1. Run `eas update --branch {{branch}} --message "{{input}}" --platform ios` and wait for it to complete. Use `required_permissions: ["all"]` to avoid sandbox permission issues.
2. Report the update ID, branch, and runtime version from the output.
