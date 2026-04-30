# Pretou — Architecture Design Spec

**Date:** 2026-04-12
**Status:** Approved
**Supersedes:** `implementation-plan-v1.md` (tech stack decisions only — feature scope from `design.md` still applies)

## Decision Summary

Split the platform into two specialized frontend apps (Next.js web + Expo mobile) sharing a common TypeScript package and Supabase backend, managed as a monorepo. This replaces the original single-Next.js-PWA approach.

**Why the change:** The original plan relied on PWA for mobile. PWA has poor App Store discoverability, limited iOS support, and weak credibility with non-technical users (mairies, rural residents). A native app in the stores is critical for adoption. Expo provides native camera, GPS, and push notifications needed for v3+ features (signalements, carpooling).

**Why not a single codebase for both:** Expo's web output lacks SSR/SEO (required for commune website). Next.js + Capacitor requires static export (loses server components, API routes). The two surfaces genuinely serve different purposes — splitting is not duplication, it's specialization.

---

## 1. Overall Architecture

Monorepo with Turborepo + pnpm workspaces.

```
pretou/
├── apps/
│   ├── web/                 ← Next.js 15 (App Router, SSR, Tailwind, shadcn/ui)
│   └── mobile/              ← Expo (React Native, Expo Router)
├── packages/
│   └── shared/              ← TypeScript: types, Supabase queries, validation, constants
├── supabase/
│   ├── migrations/          ← SQL migrations (schema, RLS policies)
│   ├── functions/           ← Edge Functions (push notifications, etc.)
│   └── seed.sql
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Turborepo** orchestrates builds across packages — builds `shared` first, then `web` and `mobile` in parallel. Caches results so unchanged packages don't rebuild.

**pnpm workspaces** manages dependencies across the monorepo.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web app | Next.js 15 (App Router) | Commune website (SSR/SEO) + admin panel |
| Mobile app | Expo (React Native) | Resident app + field admin |
| Shared logic | TypeScript package | Types, queries, validation, constants |
| Database | Supabase (PostgreSQL) | Data, RLS, Realtime |
| Auth | Supabase Auth | Email/phone sign-up, session management |
| File storage | Supabase Storage | Photo uploads |
| Realtime | Supabase Realtime | Live feed updates |
| Server functions | Supabase Edge Functions | Push notification triggers |
| Geospatial | PostGIS (Supabase extension) | GPS for signalements, carpooling |
| Web styling | Tailwind CSS + shadcn/ui | UI components |
| Mobile navigation | Expo Router | File-based routing |
| Monorepo | Turborepo + pnpm | Build orchestration + dependency management |
| Web deployment | Vercel | Hosting + CDN |
| Mobile builds | EAS (Expo Application Services) | Cloud builds for iOS/Android |

---

## 3. Web App (Next.js)

Serves two audiences:

### Public commune website (no auth, SSR)
- Server-rendered pages for SEO
- Pages: Accueil (latest news), Evenements, Associations, Infos pratiques, Contact
- Bulletin municipal, deliberations, documents
- One opinionated template, branded with commune logo + colors
- Custom domain support (macommune.fr)
- RGAA accessibility compliant

### Admin panel (auth required, desktop-optimized)
- Moderation: approve/reject posts, manage residents
- Official announcements: compose and publish
- Room booking: calendar view, approve reservations (v3)
- Signalement dashboard: ticket board with status tracking (v3)
- User management: approve new residents, manage roles

### Routing structure

```
apps/web/src/app/
├── [commune-slug]/           ← Public website (SSR, no auth)
│   ├── page.tsx              ← Homepage / latest news
│   ├── evenements/
│   ├── associations/
│   ├── infos-pratiques/
│   └── documents/
├── app/                      ← Authenticated area (secondary — residents mostly use mobile)
│   ├── feed/                 ← Web fallback for residents without the native app
│   ├── posts/[id]/
│   └── settings/
├── admin/                    ← Mairie admin panel
│   ├── dashboard/
│   ├── moderation/
│   ├── signalements/
│   ├── reservations/
│   └── users/
└── auth/
    ├── login/
    └── signup/
```

---

## 4. Mobile App (Expo)

Daily driver for residents and mairie workers in the field.

### For residents
- Community feed (announcements, events, entraide, discussions)
- Post text + photos, comment, RSVP to events
- Push notifications (mandatory for official/safety, opt-in for community)
- Intercommunalite toggle (commune vs EPCI-wide feed)
- Later: signalement with camera + GPS, carpooling, group buying

### For mairie workers on the go
- Same feed + posting, can post as "official"
- Quick moderation actions (approve/reject posts and users)
- Signalement notifications with photo + location on map
- Room booking approvals
- 80-90% of desktop admin capabilities, adapted for phone

### Navigation structure

```
apps/mobile/src/app/
├── (tabs)/                   ← Bottom tab navigator
│   ├── feed/                 ← Community feed (home)
│   ├── events/               ← Upcoming events + RSVP
│   ├── create/               ← Quick post creation
│   ├── alerts/               ← Notifications center
│   └── profile/              ← Settings, commune switch
├── post/[id]/                ← Post detail + comments
├── admin/                    ← Admin screens (role-gated)
│   ├── moderation/
│   ├── signalements/
│   └── reservations/
└── auth/
    ├── login/
    └── signup/
```

### Native modules
- `expo-notifications` — native push notifications
- `expo-camera` — signalement photo capture
- `expo-location` — GPS for signalements, carpooling
- `expo-image-picker` — photo attachments on posts
- `expo-secure-store` — secure token storage

### What mobile does NOT do
- No commune public website (web app's job)
- No heavy data tables or complex admin views (desktop)
- No document management (desktop admin)

---

## 5. Shared Package

```
packages/shared/src/
├── types/
│   ├── database.ts           ← Generated from Supabase (supabase gen types)
│   ├── post.ts               ← Post, PostType, CreatePostInput
│   ├── commune.ts            ← Commune, EPCI
│   ├── profile.ts            ← Profile, Role
│   └── index.ts
├── queries/
│   ├── posts.ts              ← getPosts(), createPost(), deletePost()
│   ├── communes.ts           ← getCommune(), getCommuneBySlug()
│   ├── profiles.ts           ← getProfile(), updateProfile()
│   └── admin.ts              ← getPendingUsers(), approveUser()
├── validation/
│   ├── post.schema.ts        ← Zod schemas
│   └── profile.schema.ts
├── constants/
│   ├── post-types.ts         ← Labels, colors, icons per post type
│   └── roles.ts              ← Role definitions and permissions
└── index.ts
```

**Query functions are platform-agnostic.** They accept a Supabase client as a parameter. Each app creates its client differently (Next.js uses cookies, Expo uses secure store), but queries don't care:

```typescript
// packages/shared/src/queries/posts.ts
export async function getPosts(client: SupabaseClient, communeId: string) {
  return client
    .from('posts')
    .select('*, profiles(display_name, avatar_url)')
    .eq('commune_id', communeId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
}
```

**What shared does NOT contain:** UI components. Next.js uses `<div>` + Tailwind + shadcn/ui. Expo uses `<View>` + StyleSheet. The UI primitives are too different to share, and the screens serve different purposes anyway.

---

## 6. Data Flow

Example: "Mairie admin posts an announcement"

```
1. Admin taps "Publier" (mobile) or clicks "Publier" (web)
         |
2. Both apps call: createPost() from packages/shared
         |
3. createPost() calls supabase.from('posts').insert(...)
         |
4. Supabase does three things simultaneously:
    |-- a. Writes to Postgres (RLS checks commune_id + role)
    |-- b. Broadcasts via Realtime (feed updates live)
    |-- c. Triggers Edge Function -> sends push notifications
         |
5. Results:
    |-- Mobile: push notification -> tap -> opens post in Expo app
    |-- Web feed: Realtime subscription updates feed instantly
    |-- Commune website: next page load shows announcement (SSR)
```

One write, three outputs.

---

## 7. Multi-tenancy & Security

Every table with commune-specific data has a `commune_id` column. Supabase RLS enforces isolation at the database level — not in app code.

### Key RLS rules

| Rule | Enforcement |
|---|---|
| Residents see their commune's posts | `posts.commune_id = user's commune_id` |
| EPCI-visible posts expand to siblings | Only posts with `epci_visible = true` |
| Only admins post as official | `post_type = 'annonce'` requires `role = 'admin'` |
| Only admins moderate | Delete/pin checks `role = 'admin'` AND same `commune_id` |
| New residents need approval | `status = 'pending'` until admin approves |
| EPCI admins: read-only across communes | SELECT across member communes, no INSERT/UPDATE/DELETE |

### Auth flow

1. User signs up (email or phone)
2. Selects commune (or uses invite link with commune pre-filled)
3. Profile created: `status = 'pending'`, `role = 'resident'`
4. Mairie admin approves or rejects
5. On approval: `status = 'active'`, user can post/comment
6. Mairie can promote user to `admin` role

Identical on both web and mobile — both call `supabase.auth.signUp()`, same RLS applies.

### EPCI data model

```
epci (id, name)
  └── communes (id, name, slug, epci_id)
       └── posts (id, commune_id, epci_visible)
```

Intercommunalite toggle changes query from `commune_id = mine` to `commune_id IN (my EPCI communes) AND epci_visible = true`.

---

## 8. Build Order (MVP = v1)

Only v1 features from `design.md`. Architecture supports v2-v6 but we don't build them yet.

### Phase 1 — Foundation (both apps)
1. Monorepo setup (Turborepo, pnpm, shared package)
2. Supabase schema (communes, profiles, posts, comments, RSVPs) + RLS
3. Auth flow (sign up, login, commune selection, pending approval)

### Phase 2 — Web app
4. Public commune website (SSR, `[commune-slug]` routes, announcements, events)
5. Auth pages (login, signup, pending approval)
6. Resident feed (posts, comments, RSVP)
7. Admin panel (moderation, user management, post as official, pin)

### Phase 3 — Mobile app
8. Auth screens (login, signup, commune selection)
9. Feed with tabs (all posts, events, entraide)
10. Post creation with photo attachments
11. Comments + RSVP
12. Admin quick actions (approve users, moderate posts)
13. Push notifications (native via expo-notifications + Supabase Edge Function)

### Phase 4 — Polish & launch
14. Intercommunalite toggle (both apps)
15. PWA basics on web (fallback for users who skip the native app)
16. Deploy: Vercel (web), EAS (mobile), Supabase cloud

### What's NOT in MVP
- Commune website pages beyond accueil/events (v2)
- Room booking, signalements, association directory (v3)
- Service listings (v4)
- Group buying, carpooling (v5-v6)

### Build order rationale
Web first (Phase 2) because the commune website convinces the mairie to pay. Mobile (Phase 3) because that's what engages residents. Foundation (Phase 1) supports both from day one.
