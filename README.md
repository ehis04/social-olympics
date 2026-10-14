# Social Olympics

A web and mobile app for running your own Olympic-style competitions with friends, colleagues or any group.

A host creates a competition, picks events from a built-in library (or adds custom ones) and invites people with a link, code or QR code. Competitors submit results, the host confirms them, and a live leaderboard keeps score. When the last event is done the host finalises the competition, the podium is revealed, and a new season can start with one tap.

---

## Features

- **Event library**: 52 events across 16 categories (track, swimming, field, football, basketball, racket sports, weightlifting, cycling, golf and more), plus custom events
- **Scoring**: points table, event weightings, participation points, MVP and worst performer awards, best-of-N
- **Results**: friendly time, distance and weight entry, built-in stopwatch, photo or link evidence, host recording for in-person events, 24-hour dispute window
- **Team events**: peer-voted strength ratings, balanced team assignment and shared team results
- **Tiebreakers**: medal count, sealed event nomination and host resolution
- **Live leaderboard and podium**, with shared places for genuine ties
- **Seasons**: start the next season of a finished competition with the same events and members
- **Social**: activity feed, comments, reactions, group chat, direct messages, following, and in-app plus push notifications
- **Guest profiles**: add people who haven't signed up yet; their results move across when they claim the profile
- **Safety**: reporting, blocking, keyword filtering, moderation queue and creation suspensions
- **Privacy**: 16+ only, self-service account deletion, Privacy Policy (`/privacy`) and Terms of Use (`/terms`) pages

---

## Tech stack

| Area | Technology |
|---|---|
| Web | Next.js 16 (App Router), TanStack Query, Zustand, Tailwind CSS, React Hook Form + Zod |
| Mobile | Expo SDK 54, React Native, Expo Router, NativeWind |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) with business logic in Next.js API routes |
| Shared | Turborepo + pnpm workspaces, TypeScript packages for scoring, validation, types, constants and Supabase queries |
| Hosting | Cloudflare Workers via OpenNext (web), EAS Build and Submit (mobile), Upstash Redis (rate limiting) |
| Testing | Vitest, Playwright (web E2E), Supabase integration tests, pgTAP (database) |

## Repository layout

```
apps/
  web/        Next.js app: pages, API routes (the backend for web and mobile), E2E tests
  mobile/     Expo app for iOS and Android, calls the web API with a bearer token
packages/
  scoring/    Pure scoring, ranking and result-entry logic shared by web and mobile
  supabase/   Typed Supabase clients, queries and mutations
  types/      Generated database types and shared TypeScript types
  validations/ Zod schemas
  constants/  Shared constants
  config/     Shared ESLint and TypeScript config
supabase/
  migrations/ Database schema, RLS policies, functions and seed data
  tests/      pgTAP database tests
docs/         Manuals, setup and contribution guides
```

---

## Quick start

```bash
pnpm install
supabase start                         # local Supabase in Docker
cp .env.example apps/web/.env.local    # fill in the values printed by `supabase status`
pnpm --filter web dev                  # http://localhost:3000
pnpm --filter mobile dev               # Expo; scan the QR code with Expo Go
```

Full instructions: [docs/SETUP.md](docs/SETUP.md). Going live: [DEPLOYMENT.md](DEPLOYMENT.md).

## Documentation

| Document | For |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Local development |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploying Supabase, the web app and the mobile apps |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branching, commits and pull requests |
| [docs/user-manual.md](docs/user-manual.md) | Everyone using the app |
| [docs/host-manual.md](docs/host-manual.md) | Hosts running competitions |
| [docs/technical-manual.md](docs/technical-manual.md) | Architecture and operations |
| [docs/testing-manual.md](docs/testing-manual.md) | The test suites and how to run them |
| [docs/V2_IDEAS.txt](docs/V2_IDEAS.txt) | Ideas for after version 1 |

## Status

Version 1 is feature complete on web and mobile.
