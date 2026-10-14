# Setup Guide

## Prerequisites

- Node.js 26+ (see the root package.json engines)
- pnpm 9+
- Docker (for Supabase local development)

## Clone the Repository

```bash
git clone https://github.com/your-org/social-olympics.git
cd social-olympics
```

## Install Dependencies

```bash
pnpm install
```

## Environment Setup

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in the required values (Next.js loads environment files from the web app directory):

- `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project Settings → API (keep secret)
- `EXPO_PUBLIC_SUPABASE_URL` — same as `NEXT_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL` — local: `http://localhost:3000`
- `UPSTASH_REDIS_REST_URL` — from upstash.com
- `UPSTASH_REDIS_REST_TOKEN` — from upstash.com

## Running Supabase Locally

```bash
supabase start
```

This starts a local Supabase instance using Docker. The CLI will output local URLs and keys — these replace the cloud values in your `.env.local` for local development.

## Running the Web App

```bash
# From repo root
pnpm --filter web dev

# Or from the web app directly
cd apps/web && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Local web development uses Webpack to avoid the Turbopack client-manifest failures
observed with Next.js 16.2.9. To explicitly try Turbopack, run
`pnpm --filter web dev:turbo`. Both bundlers use the repository as their workspace
root rather than inheriting lockfiles from parent directories.

After changing bundlers, stop the existing web server and clear the generated
development cache once before restarting:

```bash
rm -rf apps/web/.next/dev
pnpm --filter web dev
```

If a local database reset invalidates an existing login, the next request clears
the expired session cookies and returns you to login. Sign in again.

## Running the Mobile App

```bash
# From repo root
pnpm dev

# Or from the mobile app directly
cd apps/mobile && pnpm dev
```

Follow the Expo CLI prompts to open on iOS simulator, Android emulator, or physical device via Expo Go.

The app reads `apps/mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=http://<your-computer-ip>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from `supabase status`>
EXPO_PUBLIC_API_BASE_URL=http://<your-computer-ip>:3000
```

Use your computer's network address rather than `localhost`, because the phone is a separate device; the web app must be running for the mobile app to work. On WSL2, run Expo from a Windows terminal (see the technical manual). Push notifications need a development or preview build; they are not delivered to Expo Go on Android.

## Running Tests

```bash
# Unit and integration tests
pnpm test

# E2E tests (web)
pnpm test:e2e
```

## Resetting the Local Database

```bash
supabase db reset
```

This re-runs all migrations against the local Docker instance. It deletes all local data, including demo accounts and competitions, so only use it when you want a clean database.
