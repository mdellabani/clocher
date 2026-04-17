# `/app/*` Client-Side Data Architecture — Design

**Date:** 2026-04-17
**Status:** Draft — pending review
**Scope:** Web app, logged-in `/app/*` and `/admin/*` routes only

## Context

Navigating between pages inside the logged-in web app (`/app/feed`, `/app/evenements`, `/admin/*`, etc.) feels sluggish. The URL takes 300–800ms to change after a click, then the whole page appears at once. Users perceive this as the app "freezing" before each navigation.

Root causes identified in the current `/app/*` routes (all server components):

1. **No `loading.tsx` files** — Next.js cannot render transitional UI; the old page stays on screen until the new server render completes.
2. **Sequential database queries** — each page awaits 3–5 Supabase calls in series (`getUser` → `getProfile` → `getCommunes` → posts → pinned). At ~30–50ms per round-trip, this is a 150–250ms floor per navigation.
3. **Redundant identity fetches** — every page re-fetches `auth.getUser` + `getProfile` + commune, even though this data is stable for the whole session.
4. **Every navigation is a Vercel function invocation** — consumes free-tier quota (100k/month on Vercel Hobby) and pays cold-start cost when the function is idle.

Mobile (`apps/mobile`) already uses `@tanstack/react-query` with `staleTime: 5 min` as its default and does not suffer from these issues. Web is the outlier.

## Goals

- Navigation between `/app/*` routes feels **instant** after first load (≤50ms perceived, no network trip).
- First load to `/app/*` still ships with real content (no skeleton-then-content flash).
- Reduce Supabase query count per session by ≥60%.
- Reduce Vercel function invocations on `/app/*` navigation by ≥70%.
- Align web data-fetching pattern with mobile (already on React Query).
- No changes to public routes (`/`, `/[commune-slug]/*`, landing, onboarding).

## Non-goals

- Vercel ↔ Supabase region co-location (deferred; unconfirmed as a cause).
- Image optimization / CDN strategy (separate concern).
- Public commune website migration (stays SSR for SEO).
- Mobile app changes (already aligned).
- Offline support (out of scope; React Query supports it but we don't need it now).

## Architecture decisions

Three decisions locked in during brainstorming:

1. **SSR boundary:** thin server shell per route. Each `/app/*` page stays a server component whose only job is auth check, server-side prefetch of the primary query, and `<HydrationBoundary>` passing the dehydrated cache to a client component. First visit still ships real content inside the HTML; no double fetch thanks to hydration + `staleTime`.
2. **Mutation invalidation:** invalidate-and-refetch via `queryClient.invalidateQueries(...)` from the client after a server action returns. Optimistic updates deferred — may be adopted later for specific high-frequency actions (RSVP toggle, poll vote) as a polish pass.
3. **Realtime:** upgrade from today's `router.refresh()` pattern to `queryClient.setQueryData(...)` on Supabase Realtime events. Feed updates reflect without any server round-trip.

## High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Server (Next.js App Router, Vercel)                         │
│                                                              │
│   /app/feed/page.tsx  (server component — thin shell)        │
│   ├── auth check (Supabase SSR client)                       │
│   ├── redirect if no session / no profile                    │
│   ├── const qc = new QueryClient()                           │
│   ├── await qc.prefetchQuery(['posts', communeId], ...)      │
│   ├── await qc.prefetchQuery(['profile', userId], ...)       │
│   └── return <HydrationBoundary state={dehydrate(qc)}>       │
│          <FeedClient />                                       │
│        </HydrationBoundary>                                   │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Client (browser)                                            │
│                                                              │
│   App-wide <QueryClientProvider>  (in layout.tsx)            │
│   <HydrationBoundary> hydrates server-dehydrated cache       │
│                                                              │
│   FeedClient.tsx  ('use client')                             │
│   ├── useQuery(['posts', communeId])  → cache hit, 0 fetches │
│   ├── useQuery(['profile', userId])   → cache hit, 0 fetches │
│   └── useRealtimePosts(communeId)     → setQueryData on evt  │
│                                                              │
│   Navigate to /app/evenements:                               │
│   ├── router transition (client-side)                        │
│   ├── loading.tsx renders while route code loads             │
│   ├── EventsClient mounts, useQuery(['events', communeId])   │
│   └── if cached + fresh: instant; else: fetch + render       │
└──────────────────────────────────────────────────────────────┘
```

## Detailed design

### 1. Query client setup

Add `apps/web/src/lib/query/client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,   // 5 min — matches mobile
        gcTime: 1000 * 60 * 30,      // 30 min in-memory retention
        retry: 2,
        refetchOnWindowFocus: false, // rely on Realtime for freshness
      },
    },
  });
}
```

Add `apps/web/src/components/providers/query-provider.tsx`:

```tsx
"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/query/client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Wrap `apps/web/src/app/app/layout.tsx` (and `/admin` layout) in `<QueryProvider>`. **Do not** put it at the root layout — public routes don't need it, and scoping reduces bundle size on landing pages.

### 2. Server-side prefetch helper

Add `apps/web/src/lib/query/prefetch.ts`:

```ts
import { QueryClient, dehydrate } from "@tanstack/react-query";

export async function prefetchAndDehydrate<T>(
  prefetchFn: (qc: QueryClient) => Promise<T>
) {
  const qc = new QueryClient();
  await prefetchFn(qc);
  return dehydrate(qc);
}
```

Used in page.tsx like:

```tsx
const state = await prefetchAndDehydrate(async (qc) => {
  await qc.prefetchQuery({
    queryKey: ["posts", profile.commune_id],
    queryFn: async () => {
      const { data } = await getPosts(supabase, profile.commune_id);
      return data ?? [];
    },
  });
});
return (
  <HydrationBoundary state={state}>
    <FeedClient />
  </HydrationBoundary>
);
```

### 3. Query key conventions

All query keys live in `packages/shared/src/query-keys.ts` so web and mobile share them verbatim. Hierarchical structure enables partial invalidation:

```ts
export const queryKeys = {
  posts: {
    list: (communeId: string, filters?: PostFilters) =>
      ["posts", communeId, filters ?? {}] as const,
    detail: (postId: string) => ["posts", "detail", postId] as const,
    pinned: (communeId: string) => ["posts", "pinned", communeId] as const,
    epci: (epciId: string, communeIds?: string[]) =>
      ["posts", "epci", epciId, communeIds ?? []] as const,
  },
  profile: (userId: string) => ["profile", userId] as const,
  commune: (communeId: string) => ["commune", communeId] as const,
  events: (communeId: string) => ["events", communeId] as const,
  comments: (postId: string) => ["comments", postId] as const,
  rsvps: (postId: string) => ["rsvps", postId] as const,
  poll: (postId: string) => ["poll", postId] as const,
  producers: (communeId: string) => ["producers", communeId] as const,
  audit: (communeId: string) => ["audit", communeId] as const,
  reports: { pending: (communeId: string) => ["reports", "pending", communeId] as const },
};
```

Invalidation pattern after mutation:

```ts
// client code after a server action returns
await queryClient.invalidateQueries({ queryKey: ["posts", communeId] });
// partial: everything under "posts" for this commune, any filter combo
```

### 4. Client hook layer

Each shared query gets a thin `useXxx` wrapper in `apps/web/src/hooks/queries/`:

```ts
// apps/web/src/hooks/queries/use-posts.ts
import { useQuery } from "@tanstack/react-query";
import { getPosts, queryKeys } from "@rural-community-platform/shared";
import { createBrowserClient } from "@/lib/supabase/client";

export function usePosts(communeId: string) {
  const supabase = createBrowserClient();
  return useQuery({
    queryKey: queryKeys.posts.list(communeId),
    queryFn: async () => {
      const { data, error } = await getPosts(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
  });
}
```

**Why a wrapper layer?** It keeps the call-site clean (no Supabase client plumbing, no error unwrapping in components) and isolates the `shared` package from React dependencies. The existing `packages/shared/src/queries/*` functions stay unchanged — they remain platform-agnostic and are consumed by both `useQuery` (web/mobile) and server components (first-load prefetch).

### 5. Mutation pattern

Server actions remain the write path (unchanged). The client calls them, then invalidates:

```tsx
// apps/web/src/components/create-post-dialog.tsx (client)
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { createPostAction } from "@/app/app/feed/actions";

const qc = useQueryClient();

async function handleSubmit(input: CreatePostInput) {
  const result = await createPostAction(input);
  if (result.ok) {
    await qc.invalidateQueries({ queryKey: queryKeys.posts.list(communeId) });
    await qc.invalidateQueries({ queryKey: queryKeys.posts.pinned(communeId) });
  }
}
```

**Remove `revalidatePath` calls** in server actions that target `/app/*` paths — they become no-ops under this model (nothing renders server-side post-mutation; client cache invalidation is what matters). Keep `revalidatePath` calls that target public routes (`/[commune-slug]/...`) because those stay SSR.

### 6. Realtime integration

Add `apps/web/src/hooks/use-realtime-posts.ts`:

```ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { createBrowserClient } from "@/lib/supabase/client";

export function useRealtimePosts(communeId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!communeId) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`posts:${communeId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "posts",
        filter: `commune_id=eq.${communeId}`,
      }, (payload) => {
        const key = queryKeys.posts.list(communeId);
        if (payload.eventType === "INSERT") {
          qc.setQueryData(key, (old: Post[] = []) => [payload.new as Post, ...old]);
        } else if (payload.eventType === "UPDATE") {
          qc.setQueryData(key, (old: Post[] = []) =>
            old.map((p) => (p.id === payload.new.id ? (payload.new as Post) : p))
          );
        } else if (payload.eventType === "DELETE") {
          qc.setQueryData(key, (old: Post[] = []) =>
            old.filter((p) => p.id !== payload.old.id)
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [communeId, qc]);
}
```

**Drift safeguard:** Realtime payloads don't include joins (profiles, post_images, comment counts). Option for v1: after applying the Realtime patch, call `invalidateQueries` to refetch the full row with joins. Keeps the UX fast (cached state shown instantly with the new row) while guaranteeing correctness.

### 7. `loading.tsx` files

Add one `loading.tsx` per `/app/*` route leaf (feed, events, infos-pratiques, mon-espace, settings, posts/[id], producteurs) and per `/admin/*` leaf. Each renders the same skeleton shape as the actual page to avoid layout shift.

Shared skeleton primitives in `apps/web/src/components/skeletons/` (reusing Tailwind + shadcn patterns).

### 8. Identity caching

The server-side `auth.getUser()` call is unavoidable (needed for SSR auth guard). But the `getProfile` lookup moves client-side:

- Server shell: prefetch `queryKeys.profile(userId)` alongside the page's primary query.
- Client: all components read profile via `useProfile()` — hits the hydrated cache. Invalidated only when profile is updated.
- Role checks (admin/moderator) derive from the cached profile; no separate fetch.

## Phased rollout

Each phase is independently mergeable and testable. Do not mix phases in one PR.

| Phase | Scope | Expected outcome |
|---|---|---|
| **P0 — Foundation** | `QueryProvider`, `makeQueryClient`, `prefetchAndDehydrate`, `query-keys.ts`, hook layer scaffolding, skeletons. Zero behavioral change. | All scaffolding in place. Ship. |
| **P1 — Feed** | Migrate `/app/feed` to shell + client pattern. Add Realtime hook. Remove `revalidatePath("/app/feed")` in relevant actions. | Feed feels instant on re-navigation. Realtime updates without page refresh. |
| **P2 — Identity & simple reads** | Migrate `/app/mon-espace`, `/app/settings`, `/app/infos-pratiques`. Introduce `useProfile` / `useCommune` hooks consumed app-wide. | Identity cached once per session; simple pages instant. |
| **P3 — Events & producers** | Migrate `/app/evenements`, `/app/producteurs`. | Straightforward reads migrated. |
| **P4 — Post detail** | Migrate `/app/posts/[id]`. Includes comments, RSVPs, polls — tests nested query patterns. | Post detail navigation instant; comment/RSVP mutations invalidate properly. |
| **P5 — Admin** | Migrate `/admin/*` (dashboard, moderation, domain, theme, members). Many small lists + many mutations — biggest payoff for daily admin use. | Admin panel feels native. |
| **P6 — Polish** | Optimistic updates for RSVP toggle + poll vote. Audit remaining `revalidatePath` calls. | Highest-frequency actions feel instant. |

Total estimated effort: 4–6 working days, ideally over 2 weeks with one phase shipped at a time so regressions are caught early.

## Testing

### What changes vs. today's test strategy

- **Component tests** (`pnpm test:components`): add tests that render client components inside `<QueryClientProvider>` with pre-seeded cache via `queryClient.setQueryData`. Assert render-from-cache path (no network). Helper: `renderWithQuery(ui, { initialData })`.
- **Integration tests** (`pnpm test:integration`): server actions still tested unchanged (they're the write path). Add assertions that the mutation invalidates the correct keys — test the hook layer, not the server action, for that.
- **Realtime**: stub the Supabase channel and drive payloads manually in a component test; assert `queryClient.getQueryData` reflects the expected row.
- **No new e2e tooling**; Playwright can come later if needed.

Per project convention (CLAUDE.md): every new server-action write path still needs an integration test asserting RLS permits the intended role and silently blocks unauthorized roles. That rule is unchanged.

## Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hydration mismatch (server HTML ≠ first client render) | Medium | Visible flash / React warnings | Keep server prefetch and client `queryFn` in lock-step (same args, same query key). Add a utility test that renders a page server-side then hydrates and asserts no refetch fires. |
| Double invalidation (server's `revalidatePath` + client's `invalidateQueries` both fire) | Low | Wasted query | Audit: remove `revalidatePath` for `/app/*` paths in P1; keep for `/[commune-slug]/*` paths (still SSR). |
| Realtime payload lacks joins (profiles, images) → stale card | Medium | Brief visual inconsistency | Invalidate (refetch) after `setQueryData` on INSERT. Accept one extra query per new post (rare event; still net win vs `router.refresh`). |
| Client bundle size grows (React Query ~13KB gz + hooks) | Low | Tiny TTI regression on first load | Scope QueryProvider to `/app` and `/admin` layouts only; landing/public pages stay lean. |
| Free-tier Supabase Realtime concurrent connections limit (200 on Hobby) | Low today, grows with users | Subscription failures at scale | Monitor; plan per-commune channel multiplexing when > 150 concurrent users. Out of scope for v1. |
| Developer unfamiliarity with React Query on web | Medium | Slow rollout | Web aligns with mobile's existing pattern; single `makeQueryClient`, single query-keys file — low cognitive load once P0 is in. |

## Open questions

- **Do we migrate `/app/admin/*` super-admin views** (commune approval queue)? Listed under `/super-admin`, not `/admin` — out of `/app/*` scope. Treat as public/infrequent; leave SSR for now.
- **Does the public commune website** (`/[commune-slug]/*`) ever need client-side hydration? If the bulletin or conseil-municipal pages start needing interactivity (e.g. live poll), we revisit. Not in this spec.
- **Service worker / PWA?** React Query's persistence plugin could give true offline reads. Deferred — not a goal today.

## Success criteria

Measurable:

- Time-to-interactive on intra-`/app/*` navigation drops from ~500–800ms to ≤100ms (measured via PostHog performance events).
- Supabase query count per logged-in session drops ≥60% (measured via Supabase dashboard over a week of real usage).
- Vercel function invocations on `/app/*` routes drop ≥70% (measured via Vercel analytics).
- Feed updates from Realtime appear on screen in ≤200ms (vs today's ~500ms+ via `router.refresh`).

Qualitative:

- The mairie secretary says "ça répond tout de suite" when navigating between admin and feed.
- No hydration warnings in browser console.
- No test regressions.
