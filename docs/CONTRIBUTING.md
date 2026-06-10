# Contributing Guide

## Branching Strategy

- `main` — production only. Protected. No direct commits.
- `develop` — integration branch. Protected. No direct commits.
- `feature/xxx` — all new work. Branch FROM `develop`, PR TO `develop`.
- `hotfix/xxx` — critical fixes only. Branch FROM `main`, PR TO `main` AND `develop`.

**Never commit directly to `develop` or `main`.**

## Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

Format: `type: description`

Allowed types:
- `feat` — new feature
- `fix` — bug fix
- `chore` — tooling, config, dependencies
- `docs` — documentation only
- `refactor` — code change, no new feature or bug fix
- `test` — adding or updating tests
- `style` — formatting, no logic change
- `ci` — CI/CD changes

Examples:
```
feat: add competition creation form step 2
fix: correct age validation edge case on leap year birthday
chore: upgrade zod to 3.23.0
docs: add ADR for scoring package isolation
test: add unit tests for getPointsForPlace
```

Commitlint enforces this format via the Husky commit-msg hook.

## Pull Request Process

1. Ensure your branch is up to date with `develop`
2. Run `pnpm typecheck` and `pnpm lint` locally — both must pass
3. Ensure all tests pass: `pnpm test`
4. Open a PR from your `feature/xxx` branch to `develop`
5. Fill in the PR template
6. CI must pass before merge
7. At least one review is required before merging

## Adding a New Event to the Library

1. Add the event slug to `SIMILARITY_GROUPS` in `packages/constants/src/events/similarity-groups.ts`
2. Add a seed entry to `supabase/seed/events.sql`
3. If a new category is needed, add the slug to `EVENT_CATEGORY_SLUGS` in `packages/constants/src/events/categories.ts` and add a seed entry to `supabase/seed/event_categories.sql`
4. Test locally with `supabase db reset`

## Adding a New Migration

Naming convention: `NNNNN_description_in_snake_case.sql` (e.g. `00021_add_kudos_table.sql`)

1. Create the file in `supabase/migrations/`
2. Test locally: `supabase db reset`
3. Verify RLS policies are included
4. Deploy to staging via the `develop` branch CI
5. Verify on staging before merging to `main`

## New Ideas

Any idea that is not currently in scope for v1 goes into `V2_IDEAS.txt` at the repo root.
Do not add features to v1 scope during development. The scope is fixed.
