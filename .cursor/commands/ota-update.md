# OTA Update

Push an over-the-air update to users via EAS Update. Run `eas update` targeting the specified branch with the provided message.

Branch: {{branch:production,preview}}
Update message: {{input}}

## Steps

1. Run `eas update --branch {{branch}} --message "{{input}}"` and wait for it to complete.
2. Report the update ID, branch, and runtime version from the output.
