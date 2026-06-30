# Social Olympics

A cross-platform application for creating and competing in custom Olympic-style competitions with friends, colleagues, or any group.

A host creates a competition, selects events from a built-in library, and invites members. Competitors submit results, the host confirms them, and a live leaderboard tracks standings in real time. At the end of the competition, a virtual podium is generated and winners are crowned.

---

## Features

- **52-event library** across 16 categories — track, swimming, field, football, basketball, racket sports, volleyball, weightlifting, cycling, rock climbing, golf, and more
- **Structured scoring engine** — points scale, event weight multipliers, best-of-N scoring, MVP and worst performer bonuses
- **Team competitions** — peer-voted strength ratings with automated, balanced team assignment
- **Weightlifting bid format** — Olympic-style bidding rounds with shared-place tiebreaking
- **Tiebreaker system** — medal count comparison, sealed event nomination, host resolution
- **Live leaderboard** — real-time updates via Supabase Realtime, no page refresh required
- **Social layer** — activity feed, group chat, direct messages, reactions, comments
- **Podium reveal** — final rankings with shareable results
- **Ghost profiles** — add competitors who haven't signed up yet; results transfer automatically when they claim their profile
- **GDPR compliant** — registered in Ireland, 16+ only, right to deletion
- **Moderation** — report queue with keyword filtering on competition creation

---

## Tech Stack

**Web:** Next.js 14 (App Router), Supabase, TanStack Query, Zustand, Tailwind CSS, React Hook Form + Zod

**Mobile:** React Native + Expo, NativeWind, Expo Router

**Shared:** Turborepo monorepo, pnpm workspaces, TypeScript throughout

**Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions), Upstash Redis (rate limiting)

**Testing:** Vitest, Jest, Playwright (web E2E), pgTAP (database)

**Infrastructure:** Cloudflare Pages (web hosting), EAS (mobile builds), GitHub Actions (CI/CD)

---

## Quick Start

```bash
git clone https://github.com/your-org/social-olympics.git
cd social-olympics
pnpm install
cp .env.example .env.local   # then fill in your Supabase project values
supabase start                # starts local Supabase via Docker
pnpm dev                        # starts web and mobile dev servers together
```

Web app: [http://localhost:3000](http://localhost:3000)
Mobile app: follow the Expo CLI prompts

Full setup instructions: [`docs/SETUP.md`](docs/SETUP.md)

---

## Documentation

| Document | Audience |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Local dev quickstart |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Branching, commits, PR process |
| [`docs/manuals/user-manual.md`](docs/manuals/user-manual.md) | End users — how to use the app |
| [`docs/manuals/host-manual.md`](docs/manuals/host-manual.md) | Hosts — competition management |
| [`docs/manuals/testing-manual.md`](docs/manuals/testing-manual.md) | Developers — full test suite reference |
| [`docs/manuals/technical-manual.md`](docs/manuals/technical-manual.md) | Developers — architecture and operations |
| [`docs/decisions/`](docs/decisions) | Architecture Decision Records |
| [`docs/V2_IDEAS.txt`](docs/V2_IDEAS.txt) | Post-v1 ideas, prioritised |

---

## Project Status

**v1.0** — feature complete for web and mobile.
