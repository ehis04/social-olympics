# Setup Guide

## Prerequisites

- Node.js 20+
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
cp .env.example .env.local
```

Edit `.env.local` and fill in the required values:

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
pnpm dev

# Or from the web app directly
cd apps/web && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running the Mobile App

```bash
# From repo root
pnpm dev

# Or from the mobile app directly
cd apps/mobile && pnpm dev
```

Follow the Expo CLI prompts to open on iOS simulator, Android emulator, or physical device via Expo Go.

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

This re-runs all migrations and the seed file against the local Docker instance.
