# Social Olympics — Technical Manual

This is the developer reference for the Social Olympics codebase: setup, architecture, conventions, and operational procedures.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Package Dependency Graph](#4-package-dependency-graph)
5. [Environment Variables](#5-environment-variables)
6. [Database](#6-database)
7. [Authentication](#7-authentication)
8. [Deployment](#8-deployment)
9. [Adding a New Event to the Library](#9-adding-a-new-event-to-the-library)
10. [Branching and PR Process](#10-branching-and-pr-process)
11. [Known Issues and Workarounds](#11-known-issues-and-workarounds)

---

## 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (required for local Supabase)
- Supabase CLI (`npm install -g supabase`)

---

## 2. Local Development Setup

```bash
git clone https://github.com/your-org/social-olympics.git
cd social-olympics
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project values (see [Environment Variables](#5-environment-variables)).

Start local Supabase:

```bash
supabase start
```

This launches PostgreSQL, Auth, Realtime and Storage via Docker, and prints local API URL and keys. Use the printed local values in `.env.local` for local development.

Start the full monorepo dev workflow (web and mobile together):

```bash
pnpm dev
```

This runs `turbo run dev`, which executes the `dev` script defined in both `apps/web/package.json` and `apps/mobile/package.json` in parallel.

To run only one app:

```bash
pnpm --dir apps/web dev
pnpm --dir apps/mobile dev
```

Web app: [http://localhost:3000](http://localhost:3000)
Mobile app: follow the Expo CLI prompts (iOS simulator, Android emulator, or Expo Go on a physical device).

---

## 3. Monorepo Structure

```
social-olympics/
├── apps/
│   ├── web/          Next.js 16 App Router web application and the API used by both apps
│   └── mobile/       Expo React Native application
├── packages/
│   ├── types/         All TypeScript types, including generated Supabase types
│   ├── constants/      Shared constants (points scale, weights, event library, limits)
│   ├── validations/    Zod schemas for all forms and API payloads
│   ├── scoring/        Pure scoring engine — fully unit tested, no side effects
│   ├── supabase/       DB clients, queries, mutations, realtime subscriptions
│   └── config/         Shared ESLint, TypeScript, and Tailwind configs
├── supabase/
│   ├── migrations/     All SQL migration files (00001 to 00041 as of October 2026)
│   └── tests/           pgTAP tests for RLS, triggers, and functions
└── docs/                 All project documentation
```

### Path Aliases

- `@` — root of each app (`apps/web` or `apps/mobile`)
- `@repo/types`, `@repo/constants`, `@repo/validations`, `@repo/scoring`, `@repo/supabase`, `@repo/config`

---

## 4. Package Dependency Graph

```
@repo/config        (no internal deps)
@repo/types          (no internal deps)
@repo/constants       (no internal deps)
@repo/validations      → @repo/types, @repo/constants
@repo/scoring           → @repo/types, @repo/constants
@repo/supabase           → @repo/types, @repo/constants

apps/web    → @repo/types, @repo/constants, @repo/validations,
              @repo/scoring, @repo/supabase, @repo/config
apps/mobile → @repo/types, @repo/constants, @repo/validations,
              @repo/scoring, @repo/supabase, @repo/config
```

There are no circular dependencies. `@repo/scoring` is intentionally pure — it has no dependency on `@repo/supabase` so it can be unit tested without a database connection.

---

## 5. Environment Variables

### Web (`apps/web/.env.local`)

| Variable | Public | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only, never exposed to the client. Used for admin operations. |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST endpoint for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |
| `ADMIN_PROFILE_IDS` | No | Comma-separated list of profile UUIDs granted admin/moderation access |
| `EXPO_ACCESS_TOKEN` | No | Optional. Expo access token, only needed if enhanced push security is turned on for the Expo project |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Yes | Optional. Contact address shown on the Privacy and Terms pages (defaults to socialolympics.app@protonmail.com) |

### Mobile (`apps/mobile/.env`, and the EAS environment for builds)

| Variable | Public | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Same value as `NEXT_PUBLIC_SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same value as `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_API_BASE_URL` | Yes | Base URL for the web app's API routes (local: `http://localhost:3000`) |

Variables prefixed `NEXT_PUBLIC_` or `EXPO_PUBLIC_` are bundled into client code and are not secret. All others must never be committed or exposed client-side.

`.env.local` is gitignored. `.env.example` is committed and lists all required keys with placeholder values.

---

## 6. Database

### Migrations

Migrations live in `supabase/migrations/` and are numbered sequentially (`00001` through `00041` as of October 2026).

**Writing a migration:**

```bash
# Create the file manually following the naming convention
# NNNNN_description_in_snake_case.sql
```

**Testing locally:**

```bash
supabase db reset
```

This drops the local database, re-applies every migration in order, and runs the seed files.

**Pushing to staging:**

Migrations are applied to staging automatically by CI when a PR is merged to `develop`.

**Pushing to production:**

Migrations are applied to production by the Deploy workflow when `develop` is merged to `main`, before the new web build is deployed, so the code never runs against an older schema. See `DEPLOYMENT.md`.

### Schema

The migrations are the source of truth for the schema. The generated types in `packages/types/src/database/index.ts` give a readable overview of every table, view and function, covering users, competitions, events, results, scoring, voting, social features (follows, blocks, messages, feed) and platform administration (reports, suspensions).

### RLS (Row Level Security)

Every table has RLS enabled. The security model follows these principles:

- Anonymous users can read public competitions and public profile data only
- Authenticated users can read any data they are a member of (competition membership-scoped)
- Write access to `results` is restricted to the submitting competitor; updates to `confirmed_at` are restricted to host/co-host roles
- The `reports` table allows any authenticated user to insert but only the service role (platform admin) to update
- All admin-level operations route through the Supabase service role client, gated by the `ADMIN_PROFILE_IDS` env var check at the application layer

Policies are defined alongside each table in the migrations and covered by the pgTAP tests in `supabase/tests/`. Where a write needs checks RLS cannot express (for example a host recording results for others), the API route performs the permission check and then uses the service role client.

### Triggers

Key triggers, defined in `00019_triggers.sql`:

- `update_career_stats` — fires after a result's `confirmed_at` is set; recalculates the competitor's career stats row
- `update_personal_bests` — fires after a result's `confirmed_at` is set; compares against the existing personal best and updates if improved
- `generate_invite_code` — fires on competition insert if no invite code is supplied; generates an 8-character code

---

## 7. Authentication

### Web

Uses `@supabase/ssr` for cookie-based authentication. Session cookies are refreshed by the Next.js middleware (`apps/web/middleware.ts`), which also applies rate limits, the keyword filter, and redirects signed-out visitors to sign in. It deliberately keeps the `middleware.ts` name rather than Next.js 16's `proxy.ts`: proxy only runs on Node.js, which the Cloudflare Workers adapter cannot deploy. Server components and API routes call `getServerClient()`, which reads the session from cookies, or from a bearer token when the request comes from the mobile app.

### Mobile

Uses `@supabase/supabase-js` directly with `expo-secure-store` as the storage adapter (split into chunks to fit the secure store's size limit), so the session is stored in the device's secure keychain rather than `AsyncStorage`. Requests to the web app's API routes (`EXPO_PUBLIC_API_BASE_URL`) include the session token as a Bearer token in the `Authorization` header.

---

## 8. Deployment

### Web — Cloudflare Workers

The web app is built with OpenNext (`opennextjs-cloudflare build`) and deployed to **Cloudflare Workers** by the Deploy workflow on every push to `main`. Build-time variables come from GitHub secrets and runtime secrets are pushed to the Worker with `wrangler secret bulk`. Full first-time setup, secrets and rollback steps are in `DEPLOYMENT.md`.

### Mobile — EAS Build

Mobile builds are produced via EAS (Expo Application Services).

```bash
pnpm mobile:eas build --platform ios --profile production
pnpm mobile:eas build --platform android --profile production
```

- **iOS:** production builds are submitted to TestFlight via `eas submit --platform ios --profile production`
- **Android:** production builds produce an AAB (Android App Bundle), uploaded manually to Play Console or via `eas submit --platform android --profile production`

EAS project ID: `f8b71a58-11fb-4d91-90ff-b988696ad623`. Build profiles (`development`, `preview`, `production`) are defined in `eas.json` at the mobile app root.

### Staging

A separate Supabase project is used for staging. Migrations and the web app are deployed to staging from the `develop` branch on every merge.

---

## 9. Adding a New Event to the Library

1. Add a SQL `INSERT` for the event to a new migration file in `supabase/migrations/`
2. If the event belongs to a similarity group, add its slug to `SIMILARITY_GROUPS` in `packages/constants/src/events/similarity-groups.ts`
3. If a new category is needed, add the slug to `EVENT_CATEGORY_SLUGS` in `packages/constants/src/events/categories.ts` and add a corresponding migration insert
4. Regenerate TypeScript types:
   ```bash
   pnpm db:types
   ```
5. Test locally with `supabase db reset`
6. Commit the migration and the updated generated types together

---

## 10. Branching and PR Process

```
feature/xxx → develop   (PR, requires CI pass + 1 review)
hotfix/xxx  → main AND develop   (PR, requires CI pass + 1 review)
```

- Never commit directly to `develop` or `main`
- Conventional Commits enforced via commitlint (Husky `commit-msg` hook): `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`
- Commit messages are single line: `type: description`
- CI (typecheck, lint, unit tests, and on PRs to `develop` also E2E) must pass before merge

Full detail in `docs/CONTRIBUTING.md`.

---

## 11. Known Issues and Workarounds

### WSL2 Mobile Dev Networking — Resolved

A physical device on the home Wi-Fi network cannot reach the Metro bundler running inside WSL2's virtual network adapter, since `localhost` inside WSL2 is not the same address as the Windows host's LAN IP. Four resolution options were available, in order of reliability:

1. Run Expo from native Windows (Node + pnpm installed on Windows, not WSL)
2. WSL port forwarding via `netsh interface portproxy`
3. Use an Android emulator (avoids physical device networking entirely)
4. Use an EAS preview build (`eas build --profile preview`) installed directly on the device, bypassing Metro

**Resolved via Option 1.** Running the mobile app directly from the Windows host (not WSL2) means `localhost` and the LAN IP are the same address, so Expo Go and the Android emulator connect to Metro with no bridging required. This is the standing approach for mobile dev going forward — start Metro from a native Windows terminal, not from inside WSL2.

### Stale `.next/types` Phantom Errors

If `pnpm turbo run typecheck` reports errors in files that have not been changed, clear the stale Next.js type cache:

```bash
rm -rf apps/web/.next
pnpm turbo run typecheck
```

### Next.js 15 Async `searchParams`

In Next.js 15, page-level `searchParams` is a `Promise`, not a plain object. Reading it synchronously (`searchParams.code`) silently returns `undefined` instead of throwing, which makes the bug easy to miss — the page renders, but the value is always empty.

```typescript
// Wrong — silently returns undefined in Next.js 15
interface Props { searchParams: { code?: string }; }
export default function Page({ searchParams }: Props) {
  if (searchParams.code) { /* never true */ }
}

// Correct
interface Props { searchParams: Promise<{ code?: string }>; }
export default async function Page({ searchParams }: Props) {
  const { code } = await searchParams;
  if (code) { /* works */ }
}
```

Apply this to every page component that reads `searchParams`, not just ones that error — the failure mode is silent, not a type error, unless the prop type is correctly written as a `Promise` to begin with.

### CSP `connect-src` Must Detect Local Supabase by URL, Not `NODE_ENV`

`apps/web/next.config.mjs` builds the CSP `connect-src` directive to allow Supabase connections. Keying this off `NODE_ENV !== 'production'` is incorrect: a local production build (`pnpm build && pnpm start`, used for stable E2E runs — see the testing manual) sets `NODE_ENV=production` while still pointing at local Supabase. This locks out `http://127.0.0.1:54321` and causes "Failed to fetch" on every Supabase call, including login.

Detect local Supabase by inspecting the actual configured URL instead:

```javascript
const isLocalSupabase =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').includes('127.0.0.1') ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').includes('localhost');
const supabaseConnectSources = isLocalSupabase
  ? "https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 ws://127.0.0.1:54321"
  : 'https://*.supabase.co wss://*.supabase.co';
```

This correctly allows local Supabase connections regardless of `NODE_ENV`, and locks down to only `*.supabase.co` whenever the configured URL is a real (staging or production) project — including in a local production build pointed at a remote project.

### E2E Suite Requires a Production Build, Not the Dev Server

Running the full Playwright E2E suite against the Turbopack dev server is unstable on WSL2 — memory use grows unbounded and the dev server crashes (`net::ERR_EMPTY_RESPONSE`, `net::ERR_CONNECTION_REFUSED`) after roughly 25 individual tests. Always build and serve a production build before running the full suite:

```bash
cd apps/web
pnpm build
pnpm start
```

See the testing manual's [E2E Tests](testing-manual.md#e2e-tests--playwright-web) section for the full run procedure.

### Supabase Integration Tests Excluded from CI

`packages/supabase` integration tests require a live local Supabase Docker instance, which is not available in the CI runner. These tests are configured with `passWithNoTests: true` in the Vitest config and are skipped automatically in CI. Run them locally before merging changes that touch query/mutation logic.

### `getPersonalBests` Client-Side Sort Fallback

The `getPersonalBests` query does not guarantee database-level ordering across all result types (time ascending vs. score descending differs per event). The query result requires a client-side sort fallback to guarantee correct ordering — this is implemented in the calling hook, not the query itself. Do not assume the raw query result is pre-sorted.
