# Deployment Guide

This guide covers two environments for the Rural Community Platform:

- **Demo** — seeded with Saint-Médard data, for product demos and testing
- **Production** — clean database, for real communes and users

Both environments use the same three services:

1. **Supabase Cloud** — Postgres database, auth, storage, edge functions
2. **Vercel** — Next.js web app (commune public website + admin panel)
3. **Expo EAS** — React Native mobile app (internal preview builds)

## Dual Environment Strategy

| | Demo | Production |
|---|---|---|
| Supabase project | `rural-community-demo` | `rural-community-prod` |
| Seeded data | Yes (Saint-Médard) | No (clean) |
| Vercel | Preview deployments | Production deployment |
| Purpose | Demos, screenshots, testing | Real communes, real users |
| Commune registration | Not needed (pre-seeded) | Via `/auth/register-commune` |

**Vercel environment variables:** Use Vercel's environment scoping — set demo Supabase keys for "Preview" and production keys for "Production". Both share the same codebase.

**Supabase setup:** Create two separate projects on Supabase Cloud. Link and push schema to both. Only run `seed.sql` on the demo project.

## Prerequisites

- Node.js 18+, pnpm installed
- Supabase CLI (`npx supabase --version` >= 1.100)
- Vercel CLI (`pnpm add -g vercel`)
- EAS CLI (`pnpm add -g eas-cli`)
- Accounts on [supabase.com](https://supabase.com), [vercel.com](https://vercel.com), [expo.dev](https://expo.dev)
- Docker (for local Supabase, already used in dev)

## Order of Operations

```
Supabase Cloud  ──>  Vercel  ──>  Expo EAS
  (URL + keys)    (needs keys)   (needs keys + web URL)
```

Supabase must be set up first — both Vercel and Expo depend on the project URL and API keys. Vercel must be deployed before Expo so the mobile app can reference the web URL.

---

## Step 1: Supabase Cloud

### 1.1 Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New Project**
2. Configure:
   - **Organization:** your personal org (or create one)
   - **Project name:** `rural-community-platform-test`
   - **Database password:** generate a strong password and store it securely
   - **Region:** `West EU (Paris)` — closest to target users in rural France
3. Wait for the project to finish provisioning (~2 minutes)

### 1.2 Collect credentials

From **Settings > API** in the Supabase dashboard, note down:

| Value | Where to find | Used by |
|---|---|---|
| `Project URL` | Settings > API > Project URL | Web, Mobile |
| `anon public` key | Settings > API > Project API keys | Web, Mobile |
| `service_role` key | Settings > API > Project API keys | Web (server-side only) |
| `Project ref` | Settings > General > Reference ID | Supabase CLI |

> **Security:** The `service_role` key bypasses RLS. Never expose it to the client or commit it to git.

### 1.3 Enable extensions

Go to **Database > Extensions** and enable:

- **postgis** — required for geo features (producer locations, map views)

### 1.4 Link and push the schema

```bash
# Link your local CLI to the remote project
npx supabase link --project-ref <your-project-ref>

# Push the consolidated migration to the remote database
npx supabase db push
```

This applies `supabase/migrations/001_initial_schema.sql` which creates all tables, RLS policies, functions, triggers, indexes, and storage buckets.

### 1.5 Deploy the edge function

```bash
npx supabase functions deploy push-notification
```

Set the required secrets for the push notification function:

```bash
npx supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-push-token>
```

### 1.6 Seed test data (optional)

To populate the test env with demo data (Saint-Medard commune):

```bash
# Connect to the remote database and run the seed
npx supabase db reset --linked
```

> **Warning:** `db reset` drops and recreates the database. Only use this on the test environment, never on production.

Alternatively, apply only the seed without resetting:

```bash
psql <your-supabase-connection-string> -f supabase/seed.sql
```

### 1.7 Configure auth

In the Supabase dashboard under **Authentication > URL Configuration**:

- **Site URL:** `https://<your-vercel-app>.vercel.app` (set after Vercel deploy)
- **Redirect URLs:** add `https://<your-vercel-app>.vercel.app/**`
- **Redirect URLs:** add `ma-commune://` (for mobile deep linking)

Under **Authentication > Providers**, ensure **Email** is enabled (it is by default).

---

## Step 2: Vercel (Web App)

### 2.1 Link the project

From the repository root:

```bash
vercel link
```

When prompted:
- **Set up and develop:** Yes
- **Which scope:** your personal account
- **Link to existing project:** No (create new)
- **Project name:** `rural-community-platform-test`
- **Directory:** `./` (root — Vercel uses the root `vercel.json` is in `apps/web/` but link from root)

Then configure the project in the Vercel dashboard:
- **Settings > General > Root Directory:** `apps/web`
- **Settings > General > Framework Preset:** Next.js (auto-detected)
- **Settings > General > Build Command:** (leave default, `vercel.json` overrides it)

### 2.2 Set environment variables

```bash
# Supabase connection
vercel env add NEXT_PUBLIC_SUPABASE_URL       # paste: https://xxx.supabase.co
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  # paste: eyJhbG...
vercel env add SUPABASE_SERVICE_ROLE_KEY      # paste: eyJhbG... (server-side only)

# Platform URLs
vercel env add NEXT_PUBLIC_SITE_URL           # paste: https://<your-app>.vercel.app
vercel env add PLATFORM_DOMAIN                # paste: <your-app>.vercel.app
vercel env add NEXT_PUBLIC_PLATFORM_DOMAIN    # paste: <your-app>.vercel.app
```

Each `vercel env add` will prompt for the value and which environments to apply it to. Select **Production**, **Preview**, and **Development** for all except `SUPABASE_SERVICE_ROLE_KEY` (select **Production** and **Preview** only — never Development to avoid leaking in client-side code).

### 2.3 Deploy

```bash
vercel --prod
```

Note the production URL (e.g., `https://rural-community-platform-test.vercel.app`).

### 2.4 Post-deploy: update Supabase auth

Go back to Supabase **Authentication > URL Configuration** and set:
- **Site URL:** `https://<your-vercel-url>`
- **Redirect URLs:** `https://<your-vercel-url>/**`

### 2.5 Verify

- Visit `https://<your-vercel-url>` — should load the homepage
- Visit `https://<your-vercel-url>/connexion` — should show the login page
- The middleware handles subdomain routing: `<commune-slug>.<your-vercel-url>` resolves to commune-specific pages. On Vercel preview URLs (`.vercel.app`), wildcard subdomains are not supported — use path-based routing or a custom domain for testing subdomain features.

### 2.6 Custom domain (optional, for subdomain testing)

To test subdomain routing (e.g., `saint-medard.app.example.fr`):

1. In Vercel **Settings > Domains**, add `app.example.fr` and `*.app.example.fr`
2. Configure DNS:
   - `app.example.fr` → CNAME to `cname.vercel-dns.com`
   - `*.app.example.fr` → CNAME to `cname.vercel-dns.com`
3. Update environment variables:
   ```bash
   vercel env add PLATFORM_DOMAIN              # app.example.fr
   vercel env add NEXT_PUBLIC_PLATFORM_DOMAIN   # app.example.fr
   ```
4. Redeploy: `vercel --prod`

---

## Step 3: Expo EAS (Mobile App)

### 3.1 Log in to EAS

```bash
cd apps/mobile
npx eas login
```

### 3.2 Configure the project

If not already linked to an Expo project:

```bash
npx eas init
```

This registers the project on expo.dev under your account.

### 3.3 Set environment variables

Create or update `apps/mobile/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
EXPO_PUBLIC_WEB_URL=https://<your-vercel-url>
```

> These are baked into the build at compile time (Expo convention for `EXPO_PUBLIC_*` vars).

### 3.4 Build preview APK / IPA

The `eas.json` already defines a `preview` profile with `"distribution": "internal"`:

```bash
# Both platforms
npx eas build --profile preview --platform all

# Or one at a time
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios
```

**Android:** produces an APK. Download link appears in terminal and on expo.dev.

**iOS:** requires an Apple Developer account ($99/year). EAS handles provisioning profiles for internal distribution. Team members need to register their device UDIDs (EAS prompts for this).

> **Tip for quick testing:** skip iOS and build Android-only first. The APK can be installed directly on any Android device or emulator.

### 3.5 Install and test

1. Open the EAS build URL on your phone (or from [expo.dev](https://expo.dev) > your project > Builds)
2. Install the APK (Android) or follow the TestFlight-like flow (iOS)
3. Log in with a test account seeded in the database

### 3.6 Push notifications setup

For push notifications to work in the test env:

1. Get an **Expo Push Token** from [expo.dev](https://expo.dev) > your project > Credentials
2. Set it as a Supabase secret (done in Step 1.5):
   ```bash
   npx supabase secrets set EXPO_ACCESS_TOKEN=<token>
   ```
3. The edge function `push-notification` fires on new `annonce` or `evenement` posts via database webhook

To configure the database webhook in Supabase dashboard:
- **Database > Webhooks > Create**
- Table: `posts`, Events: `INSERT`
- URL: `https://<project-ref>.supabase.co/functions/v1/push-notification`
- Headers: `Authorization: Bearer <service_role_key>`

---

## Step 4: Monitoring & Feedback

These modules require additional environment variables beyond the core platform.

### 4.1 Monitoring (PostHog)

| Variable | Value source | Where to set |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog → Project Settings → Project Token | Vercel + `apps/web/.env.local` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | Vercel + `apps/web/.env.local` |
| `EXPO_PUBLIC_POSTHOG_KEY` | Same token as above | EAS + `apps/mobile/.env.local` |
| `EXPO_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | EAS + `apps/mobile/.env.local` |
| `CRON_SECRET` | `openssl rand -hex 32` | Vercel + `apps/web/.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `npx supabase status` (local) / Dashboard (prod) | Vercel + `apps/web/.env.local` |

### 4.2 Feedback (GitHub Issues)

| Variable | Value source | Where to set |
|---|---|---|
| `GITHUB_APP_ID` | GitHub App settings page | Vercel + `apps/web/.env.local` |
| `GITHUB_APP_PRIVATE_KEY` | Base64-encoded `.pem` file | Vercel + `apps/web/.env.local` |
| `GITHUB_APP_INSTALLATION_ID` | URL after installing the app (`/installations/<id>`) | Vercel + `apps/web/.env.local` |
| `FEEDBACK_REPO` | e.g. `mdellabani/clocher` | Vercel + `apps/web/.env.local` |

### 4.3 Setup instructions

**PostHog:** Sign up at [posthog.com](https://posthog.com) (free tier: 1M events/month). Create a project, pick the EU region (users are in France). Grab the Project Token from Project Settings.

**GitHub App:** Create a GitHub App at GitHub → Settings → Developer settings → GitHub Apps. Set permissions: Issues (Read & Write). Install on your account (all repos or select repos). The app is reusable across projects — each project sets its own `FEEDBACK_REPO`.

---

## Environment Summary

After completing all steps, your test environment should look like:

| Service | URL | Purpose |
|---|---|---|
| Supabase | `https://xxx.supabase.co` | Database, auth, storage, edge functions |
| Supabase Studio | `https://supabase.com/dashboard/project/<ref>` | Database admin UI |
| Vercel | `https://<app>.vercel.app` | Commune website + admin panel |
| Expo Build | `https://expo.dev/projects/...` | Mobile app builds |

## CI/CD (future)

Currently deployments are manual. Future improvements:
- **Vercel:** auto-deploys on push to `master` once the GitHub repo is connected (Vercel dashboard > Git)
- **EAS:** add `eas build --profile preview --platform all --auto-submit` to a GitHub Action on tagged releases
- **Supabase:** `npx supabase db push` in CI on migration changes (use `SUPABASE_ACCESS_TOKEN` env var)

## Troubleshooting

| Issue | Solution |
|---|---|
| `db push` fails with permission error | Check that `supabase link` was run with the correct project ref |
| Vercel build fails on missing deps | Ensure root `package.json` has `turbo` in `devDependencies` and build command uses `pnpm turbo build --filter web` |
| Auth redirects to localhost | Update **Site URL** and **Redirect URLs** in Supabase auth settings |
| Mobile app can't connect to Supabase | Verify `EXPO_PUBLIC_SUPABASE_URL` is the cloud URL, not `localhost:54321` |
| Subdomain routing doesn't work on `.vercel.app` | Expected — Vercel preview URLs don't support wildcard subdomains. Use a custom domain. |
| Push notifications not firing | Check the database webhook is configured and the edge function is deployed |
| iOS build fails | Ensure Apple Developer account is set up and device UDIDs are registered in EAS |
