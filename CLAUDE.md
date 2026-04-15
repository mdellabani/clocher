# Rural Community Platform

SaaS platform for small French communes (<2,000 inhabitants). Combines community interaction, official municipal communication, and mairie back-office tools in one product. Targets rural France where adoption depends on App Store presence and simplicity.

## Architecture

Monorepo with two frontend apps sharing a common backend and TypeScript package.

```
apps/web/       — Next.js 15 (App Router) — commune public website (SSR/SEO) + desktop admin panel
apps/mobile/    — Expo (React Native) — resident app + field admin for mairie workers
packages/shared — TypeScript types, Supabase queries (platform-agnostic), Zod validation, constants
supabase/       — Postgres schema, RLS policies, Edge Functions, migrations
```

Full architecture spec: `docs/superpowers/specs/2026-04-12-architecture-design.md`
Feature scope and business context: `design.md`

## Tech Stack

| Layer | Tech |
|---|---|
| Web | Next.js 15, App Router, Tailwind CSS, shadcn/ui |
| Mobile | Expo, Expo Router, React Native |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Geo | PostGIS (Supabase extension) |
| Shared | TypeScript, Zod |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Vercel (web), EAS (mobile), Supabase Cloud |

## Build / Dev Commands

```bash
pnpm install                                        # install all dependencies
npx supabase start                                   # start local Supabase (Docker)
npx supabase db reset                                # apply migrations + seed (idempotent)
pnpm --filter @rural-community-platform/web dev      # web app → http://localhost:3000
cd apps/mobile && npx expo start --clear             # mobile app (Expo Go)
npx supabase stop                                    # stop local Supabase
```

## Key Conventions

- **Multi-tenancy:** every tenant-scoped table has `commune_id`. Security enforced via Supabase RLS, not app code.
- **Shared queries:** data-fetching functions live in `packages/shared`, accept a Supabase client param. No platform-specific code in shared.
- **No UI sharing:** web uses `<div>` + Tailwind, mobile uses `<View>` + StyleSheet. The screens serve different purposes — don't force shared components.
- **One write, multiple outputs:** admin posts once -> appears on mobile feed (Realtime), commune website (SSR), and triggers push notification (Edge Function).
- **French context:** UI labels, error messages, and content are in French. Code (variable names, comments) stays in English.
- **Roles:** `resident < moderator < admin`. Use `is_commune_moderator()` for moderation RLS, `is_commune_admin()` for admin-only.
- **Post types:** `annonce` (admin only), `evenement`, `entraide`, `discussion`, `service` (7-day auto-expiry).
- **Feed pagination:** cursor-based (`created_at`), 20 posts/page, pinned posts loaded separately.
- **Moderation:** posts have `is_hidden` column. Reports auto-hide at 3 flags. Word filter auto-hides on match. All actions logged in `audit_log`.
- **Migrations:** Pre-launch, we use a single consolidated migration (`001_initial_schema.sql`). When the schema changes, update the single migration and run `npx supabase db reset`. After launch (when production has real data), freeze the schema and start using incremental migrations.

## Database Schema

Single consolidated migration in `supabase/migrations/`:
- `001_initial_schema.sql` — full schema: communes (with contact fields, custom_primary_color, custom_domain, associations, opening_hours), profiles, posts, comments, rsvps, polls, producers, reports, audit_log, word_filters, push_tokens, post_images, council_documents, page_sections, storage buckets (post-images, avatars, council-documents, website-images), all RLS policies, functions, triggers, and indexes

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-side only, never exposed to client
PLATFORM_DOMAIN=app.example.fr           # main platform domain for subdomain routing
NEXT_PUBLIC_PLATFORM_DOMAIN=app.example.fr  # same, exposed to client for display
```

## Current Status

- **v1 complete**: auth (with password reset, invite codes), feed (paginated with images), post detail, events (calendar), mon espace, infos pratiques, admin panel, public commune site, image upload with resize (posts + avatars), push notifications (Expo, annonce + evenement), moderation
- **v2 complete**: commune website (bulletin municipal, conseil municipal, mentions légales), theme customization (custom colors with WCAG check, logo upload), structured contact data, associations management, admin panel, data cleanup, custom domain support, homepage customization (9 section types, toggleable, reorderable)
- **Remaining**: custom pages (Phase 2 of website customization), AI council document summaries
- **Not started**: v3 (mairie tools), v4 (services directory), v5 (group buying), v6 (carpooling)

## Design Specs & Plans

- `docs/superpowers/specs/2026-04-12-architecture-design.md` — original architecture
- `docs/superpowers/specs/2026-04-14-features-v2-design.md` — service posts, producers, polls, infos pratiques
- `docs/superpowers/specs/2026-04-14-moderation-pagination-design.md` — reporting, moderation, word filter, pagination
