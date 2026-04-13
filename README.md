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

### 3. Start the web app

```bash
pnpm --filter @rural-community-platform/web dev
```

Open **http://localhost:3000**

### 4. Start the mobile app

Update `apps/mobile/.env.local` with your machine's local IP:
```
EXPO_PUBLIC_SUPABASE_URL=http://<YOUR_LOCAL_IP>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>
```

Then:
```bash
cd apps/mobile && npx expo start --clear
```

Scan the QR code with Expo Go (phone must be on same WiFi).

### 5. Supabase Studio

**http://localhost:54323** — browse tables, edit data, run SQL.

## Demo Accounts

| Email | Password | Role | Name |
|---|---|---|---|
| `secretaire@saintmedard64.fr` | `demo1234` | Admin | Secrétariat Mairie |
| `pierre.m@email.fr` | `demo1234` | Resident | Pierre Moreau |
| `jeanne.l@email.fr` | `demo1234` | Resident | Jeanne Larrieu |

All accounts belong to the commune **Saint-Médard (64370)**.

## Key URLs (Web)

| Page | URL |
|---|---|
| Login | `/auth/login` |
| Signup | `/auth/signup` |
| Community feed | `/app/feed` |
| Admin panel | `/admin/dashboard` |
| Infos pratiques | `/app/infos-pratiques` |
| Public commune site | `/saint-medard-64` |
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
pnpm --filter @rural-community-platform/web dev     # web dev server
pnpm --filter @rural-community-platform/mobile start # expo dev server
npx supabase start                                   # start local supabase
npx supabase stop                                    # stop local supabase
npx supabase db reset                                # reset DB + apply migrations + seed
npx supabase gen types typescript --local > packages/shared/src/types/database.ts  # regenerate types
```
