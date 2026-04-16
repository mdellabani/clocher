# Rural Community Platform

SaaS platform for small French communes. Community feed, official announcements, events, mairie admin panel, and public commune website.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Docker (for local Supabase)
- Expo Go on your phone (for mobile testing)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Supabase

```bash
npx supabase start
npx supabase db reset
```

This applies migrations and seeds the database with demo data.

### 3. Start both apps

```bash
pnpm dev
```

This runs Turborepo's `dev` task, starting the **web** and **mobile** apps in parallel.

- Web: **http://localhost:3000**
- Mobile: scan the QR code with Expo Go (phone must be on same WiFi)

To run just one:
```bash
pnpm --filter @rural-community-platform/web dev   # web only
cd apps/mobile && npx expo start --clear           # mobile only
```

### 4. Mobile env setup

Before running mobile for the first time, update `apps/mobile/.env.local` with your machine's local IP:
```
EXPO_PUBLIC_SUPABASE_URL=http://<YOUR_LOCAL_IP>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>
```

### 5. Supabase Studio

**http://localhost:54323** — browse tables, edit data, run SQL.

## Demo Accounts

All accounts use password **`demo1234`**. Each commune has its own theme, users, posts, and data.

### Saint-Médard (theme: terre_doc)

| Email | Role | Name |
|---|---|---|
| `secretaire@saintmedard64.fr` | Admin | Secrétariat Mairie |
| `moderateur@saintmedard64.fr` | Moderator | Sophie Dupin |
| `pierre.m@email.fr` | Resident | Pierre Moreau |
| `jeanne.l@email.fr` | Resident | Jeanne Larrieu |

### Arthez-de-Béarn (theme: alpin)

| Email | Role | Name |
|---|---|---|
| `mairie@arthez-de-bearn.fr` | Admin | Secrétariat Mairie |
| `marie.d@email.fr` | Resident | Marie Ducasse |
| `jean-paul.b@email.fr` | Resident | Jean-Paul Bordes |

### Morlanne (theme: atlantique)

| Email | Role | Name |
|---|---|---|
| `mairie@morlanne.fr` | Admin | Secrétariat Mairie |
| `claude.p@email.fr` | Resident | Claude Peyret |
| `martine.s@email.fr` | Resident | Martine Soubirous |

### Invite codes (for signup)

| Commune | Code |
|---|---|
| Saint-Médard | `stmed1` |
| Arthez-de-Béarn | `arthz1` |
| Morlanne | `morl01` |

`npx supabase db reset` always restores the same seed state — any manual changes are wiped.

## Key URLs (Web)

| Page | URL |
|---|---|
| Login | `/auth/login` |
| Signup | `/auth/signup` |
| Register a commune | `/auth/register-commune` |
| Super admin | `/super-admin` |
| Community feed | `/app/feed` |
| Admin panel | `/admin/dashboard` |
| Infos pratiques | `/app/infos-pratiques` |
| Public commune site | `/saint-medard-64`, `/arthez-de-bearn`, `/morlanne` |
| Public infos pratiques | `/saint-medard-64/infos-pratiques` |
| Public events | `/saint-medard-64/evenements` |

## Project Structure

```
apps/web/           Next.js 16 — commune website + admin panel
apps/mobile/        Expo SDK 54 — resident + field admin app
packages/shared/    TypeScript types, queries, validation, constants
supabase/           Postgres schema, RLS policies, Edge Functions, seed data
```

## Useful Commands

```bash
pnpm dev                                             # start web + mobile in parallel
pnpm --filter @rural-community-platform/web dev     # web dev server only
pnpm --filter @rural-community-platform/mobile start # expo dev server only
npx supabase start                                   # start local supabase
npx supabase stop                                    # stop local supabase
npx supabase db reset                                # reset DB + apply migrations + seed
npx supabase gen types typescript --local > packages/shared/src/types/database.ts  # regenerate types
```

## Deployment & Configuration

- Supabase auth settings (sessions never expire): see [`docs/supabase-auth-settings.md`](docs/supabase-auth-settings.md)
