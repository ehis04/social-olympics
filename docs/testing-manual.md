# Social Olympics — Testing Manual

This document describes the full test suite for the Social Olympics platform: what exists, how to run it, how it is structured, and how to add new tests.

---

## Table of Contents

1. [Test Architecture Overview](#1-test-architecture-overview)
2. [Running Tests](#2-running-tests)
3. [Test Environment Setup](#3-test-environment-setup)
4. [Test Coverage by Layer](#4-test-coverage-by-layer)
5. [Adding New Tests](#5-adding-new-tests)
6. [CI Pipeline](#6-ci-pipeline)

---

## 1. Test Architecture Overview

The test suite spans four layers:

### Unit Tests — Vitest (packages + web) and Jest (mobile)

Unit tests cover individual functions and components in isolation. The scoring package is the most critical unit-tested layer — every scoring rule and edge case must have a corresponding test.

- **Tool:** Vitest for `packages/*` and `apps/web`
- **Tool:** Jest for `apps/mobile`
- **Location:** `*.test.ts` / `*.test.tsx` files co-located with source, or in `__tests__/` directories

### Integration Tests — Vitest + Local Supabase

Integration tests run against a real local Supabase instance (Docker). They test database queries and mutations, RLS policies, and multi-step data flows.

- **Tool:** Vitest
- **Location:** `packages/supabase/tests/`
- **Requirement:** Local Supabase must be running (`supabase start`)

### E2E Tests — Playwright (web)

End-to-end tests simulate full user journeys in a real browser against a running Next.js server connected to local Supabase.

- **Tool:** Playwright
- **Location:** `apps/web/e2e/`
- **Config:** `apps/web/playwright.config.ts`

**Must run against a production build, not the dev server.** Running the full 18-spec suite against the Turbopack dev server crashes it after roughly 25 tests on WSL2 — memory use grows unbounded and the suite fails with `net::ERR_EMPTY_RESPONSE` / `net::ERR_CONNECTION_REFUSED`. Always build and serve before running E2E:

```bash
cd apps/web
pnpm build
pnpm start
```

`pnpm start` runs the compiled Node.js HTTP server with no Turbopack runtime compilation, and is stable for the full suite.

### Database Tests — pgTAP via Supabase CLI

Database-level tests written in SQL using pgTAP. They test RLS policies, triggers, and database functions directly.

- **Tool:** `supabase test db` (runs pgTAP)
- **Location:** `supabase/tests/`

---

## 2. Running Tests

### All tests (unit + integration)

```bash
pnpm turbo run test
```

Runs all Vitest and Jest test suites across the monorepo in parallel.

### Scoring package only

```bash
cd packages/scoring && pnpm test
```

### Supabase package integration tests

Requires local Supabase running first (see [Test Environment Setup](#3-test-environment-setup)).

```bash
cd packages/supabase && pnpm test
```

### Web unit tests

```bash
cd apps/web && pnpm test
```

### Playwright E2E tests

Requires local Supabase running. Build and serve a production build of the web app first — do not run E2E against `pnpm dev` (see [Test Architecture Overview](#1-test-architecture-overview) for why).

```bash
cd apps/web
pnpm build
pnpm start
```

In a separate terminal, with the E2E env vars loaded:

```bash
cd apps/web
set -a && source .env.e2e && set +a
npx playwright test
```

To run a single journey:

```bash
npx playwright test --grep "competition creation"
```

To run with the Playwright UI (interactive):

```bash
npx playwright test --ui
```

**If login fails with "Failed to fetch" against local Supabase:** this is a CSP issue, not an auth issue. The `connect-src` directive in `apps/web/next.config.mjs` must allow `http://127.0.0.1:54321` (and `ws://127.0.0.1:54321` for Realtime) whenever `NEXT_PUBLIC_SUPABASE_URL` points at a local address — regardless of `NODE_ENV`. A production build (`pnpm start`) sets `NODE_ENV=production`, so any CSP logic keyed off `NODE_ENV` rather than the actual Supabase URL will incorrectly lock out local Supabase. See [Known Issues and Workarounds](technical-manual.md#11-known-issues-and-workarounds) in the technical manual.

### Database tests

From the repo root with local Supabase running:

```bash
supabase test db
```

### Type checking and lint (not tests but run before merging)

```bash
pnpm turbo run typecheck
pnpm turbo run lint
```

---

## 3. Test Environment Setup

### Prerequisites

- Docker Desktop installed and running
- Node.js 20+
- pnpm 9+
- Supabase CLI (`npm install -g supabase`)

### Starting Local Supabase

```bash
supabase start
```

This starts PostgreSQL, Auth, Realtime and Storage locally via Docker. On first run it downloads the required images (~2 GB).

When running, Supabase outputs local credentials:

```
API URL:      http://localhost:54321
anon key:     eyJ...
service_role: eyJ...
Studio URL:   http://localhost:54323
```

Use these values in your `.env.local` files.

### E2E Environment Variables

Create `apps/web/.env.e2e` with the following:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service role key>
UPSTASH_REDIS_REST_URL=<your upstash url>
UPSTASH_REDIS_REST_TOKEN=<your upstash token>
ADMIN_PROFILE_IDS=<a test admin profile UUID>
```

### Supabase Integration Test Note

The `packages/supabase` integration tests require a live local Supabase instance. In CI environments where Docker is not available, these tests are skipped using `passWithNoTests: true`. The `tests/**` pattern is excluded from the CI test run via the Vitest config.

---

## 4. Test Coverage by Layer

### packages/scoring — 100% coverage target

Every scoring function and edge case is unit tested. Key areas:

- `getPointsForPlace` — all place values including participation (0.1) and DNF (0)
- `applyWeightMultiplier` — all weight tags and custom multiplier limits (0.1–3.0)
- `calculateBestOfN` — correct selection of best N results from M events
- `applyMVPBonus` / `applyWorstPerformerPenalty` — +1 and −1 adjustments
- `balanceTeams` — team assignment with strength tolerance check
- `tiebreaker sequence` — medal count, sealed nomination, raw margin
- `weightlifting bid format` — shared place assignment (dense ranking); logic for the planned bid screens
- Edge cases: ties at every level, DNF in required events, best-of-N with fewer than N results

### packages/supabase — integration tests for key flows

- `createCompetition` — inserts correctly, keyword filter fires
- `joinCompetition` — correct member row created with `competitor` role
- `submitResult` / `confirmResult` — `result_value_primary` and `confirmed_at` set correctly
- `getLeaderboard` — returns correctly ranked members
- `createGhostProfile` / `claimGhostProfile` — `claimed_by` and `claimed_at` set, `is_ghost` flipped
- RLS policies — anonymous users cannot read private competitions; members can only update their own results

### apps/web unit tests

- Utility functions: date formatters, time formatters, result value formatters
- Helper functions: invite code generation, score display logic
- Zod schema validation: registration form, competition creation form, result submission form

### apps/web E2E — 20 specs

All journeys run against a live local Supabase instance with seeded test data.

| Spec | Covers |
|---|---|
| 01 auth-guard | signed-out redirects and return paths |
| 02 competition-creation | the six-step create form |
| 03 join-competition | joining by invite code and link |
| 04 event-flow | start event, submit, confirm, leaderboard |
| 05 leaderboard | ranking, ties and realtime updates |
| 06 feed | feed items, reactions and comments |
| 07 profile | profile view, settings and avatar |
| 08 moderation | reports and the admin queue |
| 09 loading-and-resilience | loading states and error pages |
| 10 ghost-members | guest profiles and claiming |
| 11 disputes | raising and resolving disputes |
| 12 voting | MVP and worst performer votes |
| 13 teams | ratings, team balancing and team results |
| 14 chat | group chat and direct messages |
| 15 notifications | notification list and links |
| 16 settings | competition settings and events manager |
| 17 completion-podium | finalising and the podium |
| 18 access-control | permissions for hosts, members and others |
| 19 api-contracts | API status codes and response shapes |
| 20 seeded-history | profiles and history from seeded data |

### supabase/tests — database tests

- RLS: `competitions` table — private competitions only visible to members
- RLS: `results` table — only the owning competitor or host can insert
- RLS: `reports` table — any authenticated user can insert; only service role can update
- Trigger: `update_career_stats` — fires on result confirmation, updates `career_stats` row
- Trigger: `update_personal_bests` — fires on result confirmation, updates `personal_bests` row
- Function: `calculate_scores` — correct points calculation with weight multiplier applied

---

## 5. Adding New Tests

### Adding a unit test to packages/scoring

Create a file alongside the function you are testing:

```
packages/scoring/src/__tests__/myFunction.test.ts
```

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myFunction';

describe('myFunction', () => {
  it('returns expected value for standard input', () => {
    expect(myFunction(input)).toBe(expectedOutput);
  });
});
```

Run with: `cd packages/scoring && pnpm test`

### Adding an integration test to packages/supabase

Create a test file in `packages/supabase/tests/`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('myQuery', () => {
  it('returns the expected data', async () => {
    const { data, error } = await supabase.from('my_table').select('*');
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

Ensure local Supabase is running before executing.

### Adding an E2E test to apps/web/e2e

Create a new spec file:

```
apps/web/e2e/myJourney.spec.ts
```

```typescript
import { test, expect } from '@playwright/test';

test('my user journey', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
  await page.getByRole('textbox', { name: /^password$/i }).fill('password123');
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL('/dashboard');
});
```

**Note on password fields:** always use `page.getByRole('textbox', { name: /^password$/i })` not `getByLabel(/password/i)` — the label selector collides with the "Show password" toggle and causes a strict mode error.

**Note on unlinked form labels:** if a `<label>` has no `htmlFor`/`id` pairing or `aria-labelledby`, `getByLabel` will not find the associated input. Fall back to a heading assertion plus a positional locator (e.g. `locator('input[type="text"]').first()`) rather than assuming every label is correctly associated.

**Note on querying result sets seeded with pre-existing data:** never assert on a fixed array index (e.g. `result.data[0]`) when the underlying table may contain rows from other users or previous test runs. Use `.find()` to locate the specific record by a unique identifier instead.

Run with: `cd apps/web && pnpm build && pnpm start`, then in a separate terminal `npx playwright test`.

### Adding a database test to supabase/tests

Create a SQL file using pgTAP:

```sql
BEGIN;
SELECT plan(1);

SELECT ok(
  (SELECT count(*) FROM competitions WHERE is_public = false) = 0,
  'no public competitions visible to anon'
);

SELECT * FROM finish();
ROLLBACK;
```

Run with: `supabase test db` from the repo root.

---

## 6. CI Pipeline

### On every push and PR (any branch)

GitHub Actions (`.github/workflows/ci.yml`) runs:

```
pnpm turbo run typecheck
pnpm turbo run lint
pnpm turbo run test
pnpm --filter=./apps/web exec opennextjs-cloudflare build   # proves the Worker bundle builds
```

Unit tests run without Docker. Supabase integration tests are skipped (`passWithNoTests: true`).

The Playwright E2E suite and the pgTAP tests need a local Supabase with seeded data, so they are run locally before merging (see sections 3 and 4) rather than in CI.

### On merge to main

GitHub Actions:

1. Applies pending migrations to the production Supabase project (`supabase db push`)
2. Only if that succeeds, builds the web app with OpenNext and deploys it to Cloudflare Workers

See `DEPLOYMENT.md` for the required secrets.

### Fixing a Failing CI Check

**Typecheck fails:**
```bash
pnpm turbo run typecheck
```
Read the error output. If errors appear in files you have not changed, stale `.next/types` artifacts may be the cause:
```bash
rm -rf apps/web/.next
pnpm turbo run typecheck
```

**Lint fails:**
```bash
pnpm turbo run lint --fix
```
Auto-fixes most issues. Review remaining manual fixes in the output.

**Unit tests fail:**
```bash
pnpm turbo run test
```
Run the specific failing package to see detailed output:
```bash
cd packages/scoring && pnpm test
```

**E2E tests fail:**
```bash
cd apps/web
pnpm build && pnpm start &
npx playwright test --reporter=html
```
Opens an HTML report with screenshots and traces for each failed step. Check that local Supabase is running and `.env.e2e` is populated correctly. If failures show `net::ERR_CONNECTION_REFUSED` partway through the suite, confirm you are running against `pnpm start`, not `pnpm dev` — the dev server is not stable for the full suite (see [Test Architecture Overview](#1-test-architecture-overview)).

**Integration tests fail in CI:**
These are expected to be skipped in CI. If they are running and failing, check the Vitest config in `packages/supabase/vitest.config.ts` — the `CI=true` exclusion pattern must be in place.
