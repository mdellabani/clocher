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
- **Super-admin:** platform-level admin (hardcoded email in `apps/web/src/app/super-admin/actions.ts`). Approves commune registrations at `/super-admin`.
- **Commune onboarding:** mairie secretary registers at `/auth/register-commune` → pending until super-admin approves → becomes commune admin.
- **Database types:** generated from local Supabase via `npx supabase gen types typescript --local`. Stored in `packages/shared/src/types/database.ts`. Regenerate after schema changes.
- **Post types:** `annonce` (admin only), `evenement`, `entraide`, `discussion`, `service` (7-day auto-expiry).
- **Feed pagination:** cursor-based (`created_at`), 20 posts/page, pinned posts loaded separately.
- **Moderation:** posts have `is_hidden` column. Reports auto-hide at 3 flags. Word filter auto-hides on match. All actions logged in `audit_log`.
- **Migrations:** Add a new timestamped file in `supabase/migrations/` for every schema change (e.g. `20260417000000_add_xyz.sql`). Never edit an existing migration file post-deploy — add a new one that supersedes it.
  - **Locally:** `npx supabase db reset` to drop + reapply all migrations + seed.
  - **Deploy to remote:**
    ```
    npx supabase link --project-ref <demo-or-prod-ref>
    npx supabase db push
    ```
    Applies only new migration files. No data loss.
- **Writing RLS policies:** every table that admins/users write to needs explicit `INSERT`/`UPDATE`/`DELETE` policies — RLS denies by default, and Supabase clients silently filter blocked rows (zero rows affected, no error). When adding a write path in app code, also add the matching policy in the same migration.
- **Run `pnpm --filter @rural-community-platform/web test:components` before committing UI changes.** Catches NavBar/PostCard/ThemeCustomizer regressions in <5s.
- **Run `pnpm --filter @rural-community-platform/web test:integration` before merging anything that touches DB schema, RLS, or server actions.** Requires `npx supabase start` running locally.
- **Every new server-action write path needs an integration test** asserting (a) it persists for the intended role and (b) it's silently blocked for an unauthorized role. RLS denies by default and PostgREST swallows the failure — the test is the only thing that catches it.

## Database Schema

Migrations in `supabase/migrations/`:
- `001_initial_schema.sql` — full initial schema: communes (with contact fields, custom_primary_color, custom_domain, associations, opening_hours), profiles, posts, comments, rsvps, polls, producers, reports, audit_log, word_filters, push_tokens, post_images, council_documents, page_sections, storage buckets (post-images, avatars, council-documents, website-images), all RLS policies, functions, triggers, and indexes
- `20260417000000_admin_can_update_own_commune.sql` — RLS UPDATE policy on `public.communes` so admins can save theme/logo/contact/opening_hours/associations/custom_domain
- `20260417000100_moderators_can_moderate_posts.sql` — RLS UPDATE/DELETE on `public.posts` for moderators so the moderation UI hide/unhide/delete actually affects rows
- All future schema changes go in their own timestamped file — never edit `001_initial_schema.sql` again post-launch.

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
- **Ops complete**: PostHog monitoring (web + mobile), feedback via GitHub Issues API, deployment guide (Supabase/Vercel/EAS), quota-check cron, dual environments (demo + prod)
- **UX complete**: unified feed filtering (type/date/commune), mobile admin hub (4 sections), EPCI feed with commune labels, show password toggle, filter bottom sheet (mobile)
- **Onboarding complete**: commune registration (`/auth/register-commune`) with super-admin approval (`/super-admin`), generated database types
- **Public surface complete**: web landing page at `/` (hero, features, how-it-works, communes grid, footer), mobile welcome screen as default for signed-out users
- **Bugfix wave 2026-04-16**: self-read RLS policy for profiles (fixes admin tab missing post-approval), `search_path` hardening on SECURITY DEFINER functions, theme changes apply across pages without reload, homogeneous post-card thumbnail slot, silent token refresh in middleware (sessions never expire silently), mobile PostHog wiring fix
- **Remaining**: custom pages (Phase 2 of website customization), AI council document summaries
- **Not started**: v3 (mairie tools), v4 (services directory), v5 (group buying), v6 (carpooling)

## Design Specs & Plans

- `docs/superpowers/specs/2026-04-12-architecture-design.md` — original architecture
- `docs/superpowers/specs/2026-04-14-features-v2-design.md` — service posts, producers, polls, infos pratiques
- `docs/superpowers/specs/2026-04-14-moderation-pagination-design.md` — reporting, moderation, word filter, pagination
- `docs/superpowers/specs/2026-04-16-bugfixes-design.md` — landing pages + admin/theme/image/session bugfixes (April 2026)
