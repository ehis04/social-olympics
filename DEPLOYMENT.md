# Deployment Guide

Social Olympics runs on three services:

| Part | Where it runs | How it gets there |
|---|---|---|
| Database, sign-in, file storage | Supabase | `supabase db push` (migrations in `supabase/migrations`) |
| Website and API (used by web **and** mobile) | Cloudflare Workers, built with OpenNext | `.github/workflows/deploy.yml` on push to `main` |
| iOS and Android apps | Expo EAS Build, then App Store / Google Play | `eas build` and `eas submit` from `apps/mobile` |

Upstash Redis (rate limiting) and Expo's push service are used by the Worker.

---

## 1. Supabase

### 1.1 Choose the production project

Supabase currently has one project, **social-olympics-staging** (`vfzmixoaljxjadcqufyw`, Frankfurt), and it is **paused**.

- Free-plan projects pause after a week without activity. A paused project can be restored from the dashboard for **90 days**; after that only a backup download is offered.
- Either restore it (Dashboard → project → *Restore project*) or create a new project for production in **eu-central-1**, which matches the region named in the Privacy Policy.
- The **Supabase Keep-Alive** workflow (section 3) makes one small database request a day, so the project stays awake on the free plan. A paid plan also avoids pausing and adds daily backups. On the free plan, take your own backup now and then with `supabase db dump`.

Note the **project ref** and **database password**.

### 1.2 Apply the database

```bash
supabase login
supabase link --project-ref <project-ref>
supabase migration list          # shows which migrations the project already has
supabase db push                 # applies everything up to 00041
```

The migrations create every table, policy, function, the event library, the default points table and both storage buckets (`avatars`, `result-evidence`). No manual SQL is needed.

### 1.3 Authentication settings (Dashboard → Authentication)

| Setting | Value |
|---|---|
| Site URL | `https://<your web domain>` |
| Redirect URLs | `https://<your web domain>/api/auth/callback`, `https://<your web domain>/**` |
| Email confirmations | On |
| Minimum password length | 8 (matches the sign-up form) |

**Email sending.** Supabase's built-in email only sends a few messages an hour, and only to your own team's addresses, so real sign-ups will not get confirmation or password-reset emails without your own provider. Turn on custom SMTP under *Authentication → Emails → SMTP settings*:

| Option | Needs | Settings |
|---|---|---|
| Gmail (free, no domain) | A dedicated Gmail account with 2-Step Verification and an **app password** | Host `smtp.gmail.com`, port `587`, username and sender = the Gmail address, password = the app password |
| Proton Mail | A **paid** Proton plan **and your own domain**; `@proton.me` / `@protonmail.com` addresses cannot send through SMTP | Host `smtp.protonmail.ch`, port `587`, username and sender = the domain address, password = an SMTP token (Proton Settings → IMAP/SMTP) |
| Resend, Postmark, Amazon SES | Your own domain | From the provider's SMTP page |

You can switch providers at any time; no code changes are needed. After saving, test with a password reset for your own account.

### 1.4 Keys you will need

From *Project Settings → API*: the **Project URL**, the **anon (public) key** and the **service_role key** (secret, server only).

---

## 2. Cloudflare Workers (website and API)

1. Create a Cloudflare account. Under *Workers & Pages* choose a `workers.dev` subdomain, or add your own domain later.
2. Create an API token with the **Edit Cloudflare Workers** template. Note your **Account ID**.
3. The Worker is named `social-olympics` (`apps/web/wrangler.toml`), so the first URL will be `https://social-olympics.<subdomain>.workers.dev`. To use your own domain, add it under the Worker's *Settings → Domains & Routes*.

The middleware file is deliberately `apps/web/middleware.ts`, not Next.js 16's `proxy.ts`. Proxy only runs on Node.js, which the Cloudflare adapter cannot deploy. CI builds the Worker bundle on every push, so this cannot break unnoticed.

### Manual deploy (first time, or without GitHub Actions)

```bash
cd apps/web
npx wrangler login
# Server-only values, stored as Worker secrets (repeat for each)
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
npx wrangler secret put ADMIN_PROFILE_IDS
# Public values are compiled in at build time
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... pnpm exec opennextjs-cloudflare build
pnpm exec opennextjs-cloudflare deploy
```

To try the production bundle locally first: `pnpm build:cf && npx wrangler dev --env-file .env.local`.

### Rollback

Cloudflare dashboard → Workers → social-olympics → *Deployments* → choose an earlier version → *Rollback*, or `npx wrangler rollback`. Database migrations are not rolled back automatically. Write a new migration to undo a schema change.

---

## 3. GitHub Actions

| Workflow | Runs on | Does |
|---|---|---|
| `ci.yml` | every push and pull request | typecheck, lint, unit tests, and a Cloudflare Worker build |
| `supabase-migrations.yml` | push to `develop` touching migrations | pushes migrations to the staging project (only needed if you run a separate staging project) |
| `supabase-keep-alive.yml` | daily, or run manually | one small read from the production database so a free project is never paused; uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `deploy.yml` | push to `main` (or run manually) | pushes migrations to production, **then** builds and deploys the Worker |

Add these under *Settings → Secrets and variables → Actions*:

| Secret | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `PROD_SUPABASE_PROJECT_REF`, `PROD_SUPABASE_DB_PASSWORD` | production project |
| `STAGING_SUPABASE_PROJECT_REF`, `STAGING_SUPABASE_DB_PASSWORD` | staging project (only if you keep one) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production project URL and anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | production service_role key |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | from section 2 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash console → database → REST API |
| `ADMIN_PROFILE_IDS` | your own profile ID (after you sign up), comma-separated for more admins |
| `EXPO_ACCESS_TOKEN` | optional: only if *enhanced push security* is on for the Expo project |
| `NEXT_PUBLIC_CONTACT_EMAIL` | optional: address shown on the Privacy and Terms pages |

Without Upstash the app falls back to an in-memory limiter per Worker instance, which is much weaker, so set it up before launch (the free tier is enough). If Upstash is unreachable, requests are let through rather than failing.

---

## 4. Mobile apps (Expo EAS)

The app talks to the deployed website for everything except sign-in, so deploy the website first.

### 4.1 Build settings

Builds do **not** read `apps/mobile/.env` (it is not uploaded). Set the values per environment on expo.dev, or with the CLI:

```bash
cd apps/mobile
npx eas login
for ENV in preview production; do
  npx eas env:create --environment $ENV --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
  npx eas env:create --environment $ENV --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility plaintext
  npx eas env:create --environment $ENV --name EXPO_PUBLIC_API_BASE_URL --value https://<your web domain> --visibility plaintext
done
```

`eas.json` profiles: `development` (internal simulator/APK build), `preview` (installable APK / ad-hoc iOS for testers), `production` (store builds, version numbers managed by EAS and increased automatically).

For local development with Expo Go, set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env` to your computer's network address, for example `http://192.168.1.20:3000`. The current value points at an old `pages.dev` address.

### 4.2 Push notifications

- **iOS:** EAS creates the push key automatically the first time you build with your Apple Developer account.
- **Android:** create a Firebase project, add an Android app with package `com.socialolympics.app`, create a service account key (*Project settings → Service accounts*), and upload it with `npx eas credentials` → Android → *Google Service Account* → *FCM V1*. Without this, Android devices register but never receive pushes.
- Pushes are not delivered to Expo Go on Android. Test them with a `preview` build.

### 4.3 Build and submit

```bash
npx eas build --profile preview --platform all        # testers
npx eas build --profile production --platform all     # store builds
npx eas submit --platform ios
npx eas submit --platform android
```

Before submitting, replace the placeholders in `eas.json` → `submit.production` (Apple ID, App Store Connect app ID, team ID). Download a Google Play service account key to `apps/mobile/google-play-service-account.json`. This file is git-ignored; never commit it. Android submissions go to the **internal** testing track first. The very first Android upload must be done by hand in Play Console.

### 4.4 Store listing requirements

| Requirement | Where it is met |
|---|---|
| Privacy policy URL | `https://<your web domain>/privacy` |
| Account deletion in the app | Profile → Settings → Delete account |
| Account deletion web link (Google Play) | `https://<your web domain>/profile/settings` (sign in, then *Delete account*) |
| Report and block for user content | Report on profiles, competitions, messages and feed posts; Block on profiles |
| Age rating | Users must be 16+ (enforced at sign-up) |
| Data safety / privacy labels | Use the data list in the Privacy Policy: email, name, date of birth, photos, user content, device push token |
| Review account | Create a demo login with a competition in progress for Apple and Google reviewers |

Apple charges $99 a year for a developer account; Google Play charges a one-off $25.

---

## 5. Go-live checklist

1. Supabase project restored or created, `supabase db push` done, auth URLs and SMTP set.
2. GitHub secrets added; push to `main` (or run *Deploy* manually) and wait for both jobs to pass.
3. Open the site: register a new account, confirm the email, upload a profile photo, create a competition, join it from a second account, run an event.
4. Add your profile ID to `ADMIN_PROFILE_IDS` and redeploy so you can use the moderation queue.
5. Set the EAS environment variables, build a `preview` app, and check sign-in, joining with a code and push notifications on a real phone.
6. Review the Privacy Policy and Terms (they are written for this app but should be checked by you or an adviser) and set `NEXT_PUBLIC_CONTACT_EMAIL` to an inbox you read.
7. Build `production`, submit to the stores.

## Branches and environments

| Branch | Environment | Database |
|---|---|---|
| `feature/*` | local only | local Supabase (`supabase start`) |
| `develop` | staging migrations | staging Supabase project |
| `main` | production | production Supabase project and Worker |

## Security headers

`apps/web/next.config.mjs` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, a `Content-Security-Policy` that only allows connections to Supabase (`*.supabase.co`) and Upstash, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` that turns off camera, microphone and location for the website. The website's photo picker uses the device's own camera app, so it still works.
