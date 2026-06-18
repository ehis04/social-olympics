# Deployment Guide

Social Olympics is deployed to **Cloudflare Pages** (web app) with **Supabase** as the backend. Deployments are fully automated via GitHub Actions on merge to `main`.

---

## Architecture

```
GitHub main branch
  → CI passes (typecheck + lint + test)
  → Deploy workflow builds Next.js app
  → Publishes to Cloudflare Pages
  → Production Migrations workflow runs Supabase db push
```

---

## Required GitHub Secrets

Add these in your repo under **Settings → Secrets and variables → Actions**:

### Supabase
| Secret | Where to find it |
|--------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → service_role key |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `STAGING_SUPABASE_PROJECT_REF` | Supabase dashboard URL: `supabase.com/dashboard/project/[ref]` |
| `STAGING_SUPABASE_DB_PASSWORD` | Set when you created the staging project |
| `PROD_SUPABASE_PROJECT_REF` | Production project ref |
| `PROD_SUPABASE_DB_PASSWORD` | Production DB password |

### Cloudflare
| Secret | Where to find it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token (use "Edit Cloudflare Pages" template) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar on any page |

### App
| Secret | Description |
|--------|-------------|
| `UPSTASH_REDIS_REST_URL` | Upstash console → your database → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → your database → REST Token |
| `ADMIN_PROFILE_IDS` | Comma-separated Supabase user UUIDs for admin access |

---

## First Deployment Setup

### 1. Create a Cloudflare Pages project

```bash
# Install wrangler globally if not already
npm install -g wrangler

# Login
wrangler login

# Create the project (run from apps/web)
cd apps/web
wrangler pages project create social-olympics
```

### 2. Create a production Supabase project

Go to [supabase.com](https://supabase.com) and create a new project for production (separate from your staging project). Note the project ref and DB password.

### 3. Add all secrets to GitHub

Add every secret from the table above to your GitHub repo.

### 4. Merge to main

```bash
git checkout main
git merge develop
git push origin main
```

The Deploy workflow triggers automatically. Monitor progress in the **Actions** tab.

---

## Branch → Environment Mapping

| Branch | Environment | Database |
|--------|-------------|----------|
| `develop` | Staging (auto-migrated) | Staging Supabase project |
| `main` | Production (auto-deployed) | Production Supabase project |
| `feature/*` | Local only | Local Supabase |

---

## Manual Deployment (if needed)

```bash
cd apps/web

# Build
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy .vercel/output/static --project-name=social-olympics
```

---

## Environment Variables (local development)

Copy `apps/web/env.local.example` to `apps/web/.env.local` and fill in your staging Supabase credentials:

```bash
cp apps/web/env.local.example apps/web/.env.local
```

Required vars:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
ADMIN_PROFILE_IDS=your-user-uuid
```

---

## Security Headers

The following headers are applied to all responses via `next.config.mjs`:

- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS with preload
- `Content-Security-Policy` — restricts resource origins
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, microphone, geolocation

---

## Rollback

To roll back to a previous deployment:

1. Go to Cloudflare dashboard → Pages → social-olympics → Deployments
2. Find the previous successful deployment
3. Click **Rollback to this deployment**

For database rollbacks, Supabase does not support automatic rollback — write a new migration to reverse the change.
