# TODO

## Features
- [X] Progress tab -- track your progress over time including habit completion rates, as well as progress in other relevant metrics (like weight, fitness PRs, etc).  Goal is to visualize and track how the habits drive results that matter to you
- [X] Goals -- create goals that you want to achieve.  For example, goal weights (and how fast you want to get there), goal PRs like a 3 mile run time, or max benchpress, etc.
- [ ] Identity statements -- add in identity statements, and tie habits to identity statements.  This should help users stick with their habits.
- [X] Integrate with apple health data
- [X] Reminders
- [ ] Weekly reviews (& notification)
- [X] Logo



## Bugs
- [ ] 

## Improvements
- [X] Add step in onboarding for turning on/off features (daily prios & journal)
- [X] Fast loading -- TanStack React Query added for stale-while-revalidate caching across all tabs
- [X] Make the streak relate to how many days in a row you have logged a habit (triggered the event) not how many days have a habit filled out.  This should be similar, but basically if you backlog a bunch of habits that shouldn't increase your streak.
- [X] Add event tracking with Posthog.  Create a rule to define how to implement event tracking.
- [X] Dark mode
- [X] cl/ci automations to allow for auto builds.  When I push / commit to github, automatically make a build for the new beta so I can test.

## Ideas
- [ ] shortcuts for doing things like pushing to github, eas / app store
- [ ] learn how to do OTA updates
- [ ] Integrate with whoop data?
- [ ] Journal feature (with AI)
- [ ] AI habit recommendations 
- [ ] Turn on paid subscriptions
- [ ] Google / Apple / Passkey Auth


