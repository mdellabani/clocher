# P2 — Identity & Simple Reads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate three authed routes — `/app/mon-espace`, `/app/settings`, `/app/infos-pratiques` — to the thin-shell + React Query hydration pattern shipped in P1. Each gets a `loading.tsx` with a page-shaped skeleton, prefetched queries, and a client component that reads from the hydrated cache. Establishes `useCommune` as the canonical commune-reader used across the app.

**Architecture:** Same pattern as P1b — server page auth-guards + prefetches, then `<HydrationBoundary>` wraps a client component that consumes hooks. No realtime (these reads don't need it; commune info changes rarely and user-specific activity is triggered by the user's own actions). No mutations in scope except the existing `updateProfile` flow in settings, which stays unchanged but adds `invalidateQueries` on success.

**Tech Stack:** Next.js 16 App Router, React 19, `@tanstack/react-query` ^5.62.0, Vitest + Testing Library.

**Spec reference:** `docs/superpowers/specs/2026-04-17-app-client-side-data-design.md` — phase "P2 — Identity & simple reads". Builds on P0 (QueryProvider, makeQueryClient, prefetchAndDehydrate, Skeleton primitive) and P1b (useProfile, query-keys pattern).

**Dependencies:** P0, P1a, P1b, P1c merged.

**Out of scope for P2:** `/app/evenements` (P3), `/app/producteurs` (P3), `/app/posts/[id]` (P4), `/admin/*` (P5). ISR optimization for `infos-pratiques` (deferred; stays on thin-shell pattern for consistency). Optimistic updates on profile save (deferred to P6).

**User-visible outcome:** Navigating to any of these three routes after a first visit shows the cached content instantly — zero Supabase round-trip, zero Vercel function invocation if cache is fresh. First visit gets a page-shaped skeleton while the server prefetches, then content streams in. The mairie secretary's "Paramètres" and the resident's "Mon espace" become snappy.

---

## File structure

**Create:**
- `apps/web/src/hooks/queries/use-commune.ts` + test — full-row commune read via `getCommune`.
- `apps/web/src/hooks/queries/use-my-posts.ts` + test — user's own posts list.
- `apps/web/src/hooks/queries/use-my-comments.ts` + test — user's own comments.
- `apps/web/src/hooks/queries/use-my-rsvps.ts` + test — user's own event RSVPs.
- `apps/web/src/components/skeletons/list-skeleton.tsx` — reusable list-of-rows skeleton (used by mon-espace).
- `apps/web/src/components/skeletons/settings-skeleton.tsx` — card + form skeleton.
- `apps/web/src/components/skeletons/infos-pratiques-skeleton.tsx` — hero + sections skeleton.
- `apps/web/src/app/app/mon-espace/loading.tsx`
- `apps/web/src/app/app/mon-espace/espace-client.tsx` — new top-level client (absorbs espace-content.tsx responsibilities; renames to reflect its role).
- `apps/web/src/app/app/settings/loading.tsx`
- `apps/web/src/app/app/settings/settings-client.tsx` — new client component wrapping the identity card + existing SettingsForm.
- `apps/web/src/app/app/infos-pratiques/loading.tsx`
- `apps/web/src/app/app/infos-pratiques/infos-client.tsx` — new client component, absorbs the page's current render + parsing helpers.
- Component tests for each new client under `apps/web/tests/components/`.

**Modify:**
- `packages/shared/src/query-keys.ts` — add `me.{posts,comments,rsvps}(userId)` namespace.
- `packages/shared/src/queries/profiles.ts` — add `getMyPosts`, `getMyComments`, `getMyRsvps` helpers (platform-agnostic, used by both prefetch and hook).
- `packages/shared/src/queries/index.ts` — export the new helpers.
- `apps/web/src/app/app/mon-espace/page.tsx` — thin-shell refactor.
- `apps/web/src/app/app/settings/page.tsx` — thin-shell refactor.
- `apps/web/src/app/app/infos-pratiques/page.tsx` — thin-shell refactor.
- `apps/web/src/app/app/settings/settings-form.tsx` — add `queryClient.invalidateQueries` on successful save (for `queryKeys.profile(userId)`), keeping the existing mutation intact.

**Delete:**
- `apps/web/src/app/app/mon-espace/espace-content.tsx` — replaced by `espace-client.tsx` (renamed for clarity; the new file does the same job + reads via hooks instead of taking props).

**Do not touch:**
- `apps/web/src/app/app/settings/settings-form.tsx` mutation logic — only add an invalidate call at the end of the success branch.
- Any routes outside the three above. `/app/feed` stays as shipped in P1. Admin + events + post detail + producers stay SSR.

---

## Task 1: Extend query-keys with `me` namespace + shared query helpers (TDD)

**Files:**
- Modify: `packages/shared/src/query-keys.ts`
- Modify: `packages/shared/src/queries/profiles.ts`
- Modify: `packages/shared/src/queries/index.ts`
- Create: `apps/web/tests/query/me-keys.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/query/me-keys.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { queryKeys } from "@pretou/shared";

describe("queryKeys.me", () => {
  it("partitions per-user content keys", () => {
    expect(queryKeys.me.posts("u-1")).not.toEqual(queryKeys.me.posts("u-2"));
    expect(queryKeys.me.posts("u-1")).not.toEqual(queryKeys.me.comments("u-1"));
    expect(queryKeys.me.posts("u-1")).not.toEqual(queryKeys.me.rsvps("u-1"));
  });

  it("starts each me-key with 'me' + userId for hierarchical invalidation", () => {
    const posts = queryKeys.me.posts("u-1") as readonly unknown[];
    const comments = queryKeys.me.comments("u-1") as readonly unknown[];
    expect(posts[0]).toBe("me");
    expect(posts[1]).toBe("u-1");
    expect(comments[0]).toBe("me");
    expect(comments[1]).toBe("u-1");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @pretou/web test:components -- me-keys.test
```

- [ ] **Step 3: Extend the registry**

Edit `packages/shared/src/query-keys.ts`. Add a `me` block alongside existing keys (after `profile`, before `commune`):

```ts
  me: {
    posts: (userId: string) => ["me", userId, "posts"] as const,
    comments: (userId: string) => ["me", userId, "comments"] as const,
    rsvps: (userId: string) => ["me", userId, "rsvps"] as const,
  },
```

- [ ] **Step 4: Add shared query helpers**

Edit `packages/shared/src/queries/profiles.ts`. At the end of the file, add:

```ts
export async function getMyPosts(client: Client, userId: string) {
  return client
    .from("posts")
    .select("id, title, type, created_at, is_pinned, comments(count)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
}

export async function getMyComments(client: Client, userId: string) {
  return client
    .from("comments")
    .select("id, body, created_at, posts!post_id(id, title, type)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
}

export async function getMyRsvps(client: Client, userId: string) {
  return client
    .from("rsvps")
    .select("status, posts!post_id(id, title, type, event_date, event_location)")
    .eq("user_id", userId);
}
```

Note: `Client` is already imported at the top of `profiles.ts` as the `SupabaseClient<Database>` alias. Do not re-import it.

- [ ] **Step 5: Re-export from the queries barrel**

Edit `packages/shared/src/queries/index.ts`. Change the profiles line from:

```ts
export { getProfile, createProfile, updateProfile } from "./profiles";
```

to:

```ts
export { getProfile, createProfile, updateProfile, getMyPosts, getMyComments, getMyRsvps } from "./profiles";
```

- [ ] **Step 6: Run — expect PASS (2 tests)**

```bash
pnpm --filter @pretou/web test:components -- me-keys.test
```

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @pretou/web typecheck
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/query-keys.ts \
        packages/shared/src/queries/profiles.ts \
        packages/shared/src/queries/index.ts \
        apps/web/tests/query/me-keys.test.ts
git commit -m "feat(shared): queryKeys.me + getMyPosts/Comments/Rsvps helpers"
```

---

## Task 2: `useCommune` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-commune.ts`
- Create: `apps/web/tests/hooks/use-commune.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-commune.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useCommune } from "@/hooks/queries/use-commune";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCommune", () => {
  it("returns hydrated commune data without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.commune("c-1"), {
      id: "c-1",
      name: "Saint-Martin",
      phone: "0102030405",
      address: "1 rue de la mairie",
    });
    const { result } = renderHook(() => useCommune("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.name).toBe("Saint-Martin");
    expect(result.current.data?.phone).toBe("0102030405");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useCommune(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @pretou/web test:components -- use-commune.test
```

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-commune.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useCommune(communeId: string) {
  return useQuery({
    queryKey: queryKeys.commune(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCommune(supabase, communeId);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 min — commune info changes rarely
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

```bash
pnpm --filter @pretou/web test:components -- use-commune.test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-commune.ts \
        apps/web/tests/hooks/use-commune.test.tsx
git commit -m "feat(web): useCommune hook with 30min staleTime"
```

---

## Task 3: `useMyPosts`, `useMyComments`, `useMyRsvps` hooks (TDD, batched)

**Files:**
- Create: `apps/web/src/hooks/queries/use-my-posts.ts`
- Create: `apps/web/src/hooks/queries/use-my-comments.ts`
- Create: `apps/web/src/hooks/queries/use-my-rsvps.ts`
- Create: `apps/web/tests/hooks/use-my-content.test.tsx` (one file covering all three — they share structure)

- [ ] **Step 1: Write one failing test file covering all three**

Create `apps/web/tests/hooks/use-my-content.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useMyPosts } from "@/hooks/queries/use-my-posts";
import { useMyComments } from "@/hooks/queries/use-my-comments";
import { useMyRsvps } from "@/hooks/queries/use-my-rsvps";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useMyPosts", () => {
  it("returns hydrated posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.me.posts("u-1"), [{ id: "p-1", title: "Hello" }]);
    const { result } = renderHook(() => useMyPosts("u-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("p-1");
  });
  it("is disabled on empty userId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useMyPosts(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useMyComments", () => {
  it("returns hydrated comments without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.me.comments("u-1"), [{ id: "c-1", body: "Hi" }]);
    const { result } = renderHook(() => useMyComments("u-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("c-1");
  });
  it("is disabled on empty userId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useMyComments(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useMyRsvps", () => {
  it("returns hydrated rsvps without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.me.rsvps("u-1"), [{ status: "going", posts: { id: "p-1", title: "Fête" } }]);
    const { result } = renderHook(() => useMyRsvps("u-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].status).toBe("going");
  });
  it("is disabled on empty userId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useMyRsvps(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect 3 FAIL (module not found for each)**

```bash
pnpm --filter @pretou/web test:components -- use-my-content.test
```

- [ ] **Step 3: Implement `useMyPosts`**

Create `apps/web/src/hooks/queries/use-my-posts.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getMyPosts, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useMyPosts(userId: string) {
  return useQuery({
    queryKey: queryKeys.me.posts(userId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getMyPosts(supabase, userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 4: Implement `useMyComments`**

Create `apps/web/src/hooks/queries/use-my-comments.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getMyComments, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useMyComments(userId: string) {
  return useQuery({
    queryKey: queryKeys.me.comments(userId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getMyComments(supabase, userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 5: Implement `useMyRsvps`**

Create `apps/web/src/hooks/queries/use-my-rsvps.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getMyRsvps, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useMyRsvps(userId: string) {
  return useQuery({
    queryKey: queryKeys.me.rsvps(userId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getMyRsvps(supabase, userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 6: Run — expect PASS (6 tests)**

```bash
pnpm --filter @pretou/web test:components -- use-my-content.test
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/hooks/queries/use-my-posts.ts \
        apps/web/src/hooks/queries/use-my-comments.ts \
        apps/web/src/hooks/queries/use-my-rsvps.ts \
        apps/web/tests/hooks/use-my-content.test.tsx
git commit -m "feat(web): useMyPosts/Comments/Rsvps hooks"
```

---

## Task 4: Reusable `ListSkeleton` primitive (TDD)

**Files:**
- Create: `apps/web/src/components/skeletons/list-skeleton.tsx`
- Create: `apps/web/tests/components/list-skeleton.test.tsx`

Used by mon-espace and settings. Renders N placeholder list rows.

- [ ] **Step 1: Failing test**

Create `apps/web/tests/components/list-skeleton.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListSkeleton } from "@/components/skeletons/list-skeleton";

describe("ListSkeleton", () => {
  it("renders the requested number of placeholder rows", () => {
    const { container } = render(<ListSkeleton rows={5} />);
    const rows = container.querySelectorAll("[data-testid='list-skeleton-row']");
    expect(rows).toHaveLength(5);
  });

  it("defaults to 3 rows when rows prop is omitted", () => {
    const { container } = render(<ListSkeleton />);
    const rows = container.querySelectorAll("[data-testid='list-skeleton-row']");
    expect(rows).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Create `apps/web/src/components/skeletons/list-skeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          data-testid="list-skeleton-row"
          className="flex items-center gap-3 rounded-xl border bg-white p-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/skeletons/list-skeleton.tsx \
        apps/web/tests/components/list-skeleton.test.tsx
git commit -m "feat(web): ListSkeleton primitive for row-based placeholders"
```

---

## Task 5: `/app/mon-espace` thin-shell migration

**Files:**
- Create: `apps/web/src/app/app/mon-espace/loading.tsx`
- Create: `apps/web/src/app/app/mon-espace/espace-client.tsx`
- Modify: `apps/web/src/app/app/mon-espace/page.tsx`
- Delete: `apps/web/src/app/app/mon-espace/espace-content.tsx`
- Create: `apps/web/tests/components/espace-client.test.tsx`

### 5.1 — loading.tsx + skeleton for mon-espace

- [ ] **Step 1: Create the loading file**

Create `apps/web/src/app/app/mon-espace/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/skeletons/list-skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <ListSkeleton rows={3} />
        <Skeleton className="h-6 w-32" />
        <ListSkeleton rows={2} />
        <Skeleton className="h-6 w-32" />
        <ListSkeleton rows={2} />
      </div>
    </div>
  );
}
```

### 5.2 — Write failing component test

- [ ] **Step 2: Test**

Create `apps/web/tests/components/espace-client.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@pretou/shared";
import { EspaceClient } from "@/app/app/mon-espace/espace-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const profileFixture = {
  id: "u-1",
  commune_id: "c-1",
  role: "resident",
  status: "active",
  display_name: "Marie",
  communes: { id: "c-1", name: "Saint-Martin" },
};

describe("EspaceClient", () => {
  it("renders counts from hydrated cache for each section", () => {
    renderWithQuery(<EspaceClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profileFixture },
        { key: queryKeys.me.posts("u-1"), data: [
          { id: "p-1", title: "Ma publication", type: "discussion", created_at: "2026-04-17T00:00:00Z", is_pinned: false, comments: [{ count: 2 }] },
        ]},
        { key: queryKeys.me.comments("u-1"), data: [
          { id: "c-1", body: "Mon commentaire", created_at: "2026-04-17T00:00:00Z", posts: { id: "p-2", title: "Autre post", type: "discussion" } },
        ]},
        { key: queryKeys.me.rsvps("u-1"), data: [
          { status: "going", posts: { id: "p-3", title: "Fête du village", type: "evenement", event_date: "2026-05-01T18:00:00Z", event_location: "Place de la mairie" } },
        ]},
      ],
    });
    expect(screen.getByText("Ma publication")).toBeInTheDocument();
    expect(screen.getByText(/Mon commentaire/i)).toBeInTheDocument();
    expect(screen.getByText(/Fête du village/i)).toBeInTheDocument();
  });

  it("shows an empty state in each section when cache is empty", () => {
    renderWithQuery(<EspaceClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profileFixture },
        { key: queryKeys.me.posts("u-1"), data: [] },
        { key: queryKeys.me.comments("u-1"), data: [] },
        { key: queryKeys.me.rsvps("u-1"), data: [] },
      ],
    });
    // Test expects at least one empty-state message on the page.
    expect(screen.getAllByText(/Aucun/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run — expect FAIL (module not found)**

```bash
pnpm --filter @pretou/web test:components -- espace-client.test
```

### 5.3 — Implement `espace-client.tsx`

- [ ] **Step 4: Create the client component**

Create `apps/web/src/app/app/mon-espace/espace-client.tsx`. Copy the rendering portions of the existing `espace-content.tsx` (3 sections: my posts, my comments, my rsvps) but replace the prop-taking pattern with hook reads. Concretely:

```tsx
"use client";

import Link from "next/link";
import { useProfile } from "@/hooks/queries/use-profile";
import { useMyPosts } from "@/hooks/queries/use-my-posts";
import { useMyComments } from "@/hooks/queries/use-my-comments";
import { useMyRsvps } from "@/hooks/queries/use-my-rsvps";

type MyPost = { id: string; title: string; type: string; created_at: string; is_pinned: boolean; comments?: { count: number }[] };
type MyComment = { id: string; body: string; created_at: string; posts: { id: string; title: string; type: string } | { id: string; title: string; type: string }[] | null };
type MyRsvp = { status: string; posts: { id: string; title: string; type: string; event_date: string | null; event_location: string | null } | { id: string; title: string; type: string; event_date: string | null; event_location: string | null }[] | null };

function firstOrSame<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function EspaceClient({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const myPostsQuery = useMyPosts(userId);
  const myCommentsQuery = useMyComments(userId);
  const myRsvpsQuery = useMyRsvps(userId);

  if (!profile) return null;

  const posts = (myPostsQuery.data ?? []) as MyPost[];
  const comments = (myCommentsQuery.data ?? []) as MyComment[];
  const rsvps = (myRsvpsQuery.data ?? []) as MyRsvp[];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Mes publications
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Aucune publication pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => {
              const commentCount = p.comments?.[0]?.count ?? 0;
              return (
                <li key={p.id} className="rounded-xl border bg-white p-4">
                  <Link href={`/app/posts/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {commentCount} commentaire{commentCount > 1 ? "s" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Mes commentaires
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Aucun commentaire pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => {
              const post = firstOrSame(c.posts);
              return (
                <li key={c.id} className="rounded-xl border bg-white p-4">
                  <p className="text-sm text-[var(--foreground)]">{c.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    sur{" "}
                    {post?.id ? (
                      <Link href={`/app/posts/${post.id}`} className="underline">
                        {post.title}
                      </Link>
                    ) : (
                      <span>Publication supprimée</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Mes participations
        </h2>
        {rsvps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Aucune participation enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {rsvps.map((r, i) => {
              const post = firstOrSame(r.posts);
              return (
                <li key={i} className="rounded-xl border bg-white p-4">
                  {post?.id ? (
                    <Link href={`/app/posts/${post.id}`} className="font-medium hover:underline">
                      {post.title}
                    </Link>
                  ) : (
                    <span className="font-medium">Événement supprimé</span>
                  )}
                  {post?.event_date && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(post.event_date).toLocaleString("fr-FR")}
                    </p>
                  )}
                  {post?.event_location && (
                    <p className="text-xs text-[var(--muted-foreground)]">{post.event_location}</p>
                  )}
                  <p className="text-xs text-[var(--muted-foreground)]">Statut : {r.status}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Run — expect PASS (2 tests)**

```bash
pnpm --filter @pretou/web test:components -- espace-client.test
```

### 5.4 — Refactor `page.tsx` to thin shell

- [ ] **Step 6: Replace `apps/web/src/app/app/mon-espace/page.tsx`**

Replace entire contents with:

```tsx
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getMyPosts,
  getMyComments,
  getMyRsvps,
  queryKeys,
} from "@pretou/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { EspaceClient } from "./espace-client";

export default async function MonEspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);

    await qc.prefetchQuery({
      queryKey: queryKeys.me.posts(user.id),
      queryFn: async () => {
        const { data } = await getMyPosts(supabase, user.id);
        return data ?? [];
      },
    });
    await qc.prefetchQuery({
      queryKey: queryKeys.me.comments(user.id),
      queryFn: async () => {
        const { data } = await getMyComments(supabase, user.id);
        return data ?? [];
      },
    });
    await qc.prefetchQuery({
      queryKey: queryKeys.me.rsvps(user.id),
      queryFn: async () => {
        const { data } = await getMyRsvps(supabase, user.id);
        return data ?? [];
      },
    });
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <ThemeInjector
        theme={profile.communes?.theme}
        customPrimaryColor={profile.communes?.custom_primary_color}
      />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Mon espace</h1>
      <div className="mt-4">
        <EspaceClient userId={user.id} />
      </div>
    </HydrationBoundary>
  );
}
```

- [ ] **Step 7: Delete `espace-content.tsx`**

```bash
git rm apps/web/src/app/app/mon-espace/espace-content.tsx
```

Verify nothing else imports it:

```bash
grep -rln "espace-content\|EspaceContent" apps/web/src/ apps/web/tests/
```

Expected: no results.

- [ ] **Step 8: Typecheck + tests**

```bash
pnpm --filter @pretou/web typecheck
pnpm --filter @pretou/web test:components
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/app/mon-espace/loading.tsx \
        apps/web/src/app/app/mon-espace/espace-client.tsx \
        apps/web/src/app/app/mon-espace/page.tsx \
        apps/web/tests/components/espace-client.test.tsx
git commit -m "feat(web): migrate /app/mon-espace to thin shell + React Query"
```

---

## Task 6: `/app/settings` thin-shell migration

**Files:**
- Create: `apps/web/src/components/skeletons/settings-skeleton.tsx`
- Create: `apps/web/src/app/app/settings/loading.tsx`
- Create: `apps/web/src/app/app/settings/settings-client.tsx`
- Create: `apps/web/tests/components/settings-client.test.tsx`
- Modify: `apps/web/src/app/app/settings/page.tsx`
- Modify: `apps/web/src/app/app/settings/settings-form.tsx` — add `invalidateQueries` on save.

### 6.1 — Settings skeleton

- [ ] **Step 1: Create settings skeleton**

Create `apps/web/src/components/skeletons/settings-skeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create loading.tsx**

Create `apps/web/src/app/app/settings/loading.tsx`:

```tsx
import { SettingsSkeleton } from "@/components/skeletons/settings-skeleton";

export default function Loading() {
  return <SettingsSkeleton />;
}
```

### 6.2 — Client component

- [ ] **Step 3: Write test**

Create `apps/web/tests/components/settings-client.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@pretou/shared";
import { SettingsClient } from "@/app/app/settings/settings-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

describe("SettingsClient", () => {
  it("displays email, commune name, role, and user info from cache", () => {
    renderWithQuery(<SettingsClient userId="u-1" userEmail="marie@example.fr" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: {
          id: "u-1",
          commune_id: "c-1",
          role: "admin",
          status: "active",
          display_name: "Marie",
          avatar_url: null,
        }},
        { key: queryKeys.commune("c-1"), data: { id: "c-1", name: "Saint-Martin" } },
      ],
    });
    expect(screen.getByText("marie@example.fr")).toBeInTheDocument();
    expect(screen.getByText("Saint-Martin")).toBeInTheDocument();
    expect(screen.getByText("Administrateur")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run — expect FAIL**

- [ ] **Step 5: Implement `settings-client.tsx`**

Create `apps/web/src/app/app/settings/settings-client.tsx`:

```tsx
"use client";

import { useProfile } from "@/hooks/queries/use-profile";
import { useCommune } from "@/hooks/queries/use-commune";
import { SettingsForm } from "./settings-form";

export function SettingsClient({ userId, userEmail }: { userId: string; userEmail: string }) {
  const { data: profile } = useProfile(userId);
  const { data: commune } = useCommune(profile?.commune_id ?? "");

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Paramètres du compte
      </h1>

      <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
        <h2
          className="mb-4 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--theme-primary)" }}
        >
          Informations du compte
        </h2>
        <dl className="space-y-3">
          <div className="flex items-center gap-3">
            <dt className="w-32 text-sm text-[var(--muted-foreground)]">E-mail</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">{userEmail}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-32 text-sm text-[var(--muted-foreground)]">Commune</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">{commune?.name ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-32 text-sm text-[var(--muted-foreground)]">Rôle</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">
              {profile.role === "admin" ? "Administrateur" : "Résident"}
            </dd>
          </div>
        </dl>
      </div>

      <SettingsForm
        userId={profile.id}
        initialDisplayName={profile.display_name ?? ""}
        initialAvatarUrl={profile.avatar_url}
      />
    </div>
  );
}
```

- [ ] **Step 6: Run — expect PASS**

### 6.3 — Wire `invalidateQueries` into SettingsForm

- [ ] **Step 7: Read current SettingsForm save handler**

Open `apps/web/src/app/app/settings/settings-form.tsx`. Locate the function that handles the save (likely named `handleSubmit` or `onSubmit`). Find the success branch (after the shared `updateProfile` call or the Supabase update resolves with no error).

- [ ] **Step 8: Add the invalidation**

At the top of the file, add the imports (if not already present):

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
```

Inside the component body, add:

```tsx
const qc = useQueryClient();
```

In the success branch (after the update succeeds and before any `router.refresh()` or state reset), add:

```tsx
await qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
```

If `router.refresh()` is called anywhere in this file, remove it — invalidation handles the data refresh.

- [ ] **Step 9: Typecheck + tests**

```bash
pnpm --filter @pretou/web typecheck
pnpm --filter @pretou/web test:components
```

If `SettingsForm` has its own component test, update it to wrap renders in `QueryClientProvider` (use the existing `renderWithQuery` helper) or mock `useQueryClient`.

### 6.4 — Thin-shell `page.tsx`

- [ ] **Step 10: Replace `apps/web/src/app/app/settings/page.tsx`**

```tsx
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getCommune,
  queryKeys,
} from "@pretou/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await qc.prefetchQuery({
      queryKey: queryKeys.commune(profile.commune_id),
      queryFn: async () => {
        const { data } = await getCommune(supabase, profile.commune_id);
        return data;
      },
    });
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <ThemeInjector
        theme={profile.communes?.theme}
        customPrimaryColor={profile.communes?.custom_primary_color}
      />
      <SettingsClient userId={user.id} userEmail={user.email ?? ""} />
    </HydrationBoundary>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components/skeletons/settings-skeleton.tsx \
        apps/web/src/app/app/settings/loading.tsx \
        apps/web/src/app/app/settings/settings-client.tsx \
        apps/web/src/app/app/settings/page.tsx \
        apps/web/src/app/app/settings/settings-form.tsx \
        apps/web/tests/components/settings-client.test.tsx
git commit -m "feat(web): migrate /app/settings to thin shell + React Query"
```

---

## Task 7: `/app/infos-pratiques` thin-shell migration

**Files:**
- Create: `apps/web/src/components/skeletons/infos-pratiques-skeleton.tsx`
- Create: `apps/web/src/app/app/infos-pratiques/loading.tsx`
- Create: `apps/web/src/app/app/infos-pratiques/infos-client.tsx`
- Create: `apps/web/tests/components/infos-client.test.tsx`
- Modify: `apps/web/src/app/app/infos-pratiques/page.tsx`

### 7.1 — Skeleton + loading.tsx

- [ ] **Step 1: Skeleton**

Create `apps/web/src/components/skeletons/infos-pratiques-skeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function InfosPratiquesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
```

- [ ] **Step 2: loading.tsx**

Create `apps/web/src/app/app/infos-pratiques/loading.tsx`:

```tsx
import { InfosPratiquesSkeleton } from "@/components/skeletons/infos-pratiques-skeleton";

export default function Loading() {
  return <InfosPratiquesSkeleton />;
}
```

### 7.2 — Client component

- [ ] **Step 3: Write test**

Create `apps/web/tests/components/infos-client.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@pretou/shared";
import { InfosClient } from "@/app/app/infos-pratiques/infos-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

describe("InfosClient", () => {
  it("renders the mairie contact + hours from cached commune", () => {
    renderWithQuery(<InfosClient communeId="c-1" />, {
      cache: [
        { key: queryKeys.commune("c-1"), data: {
          id: "c-1",
          name: "Saint-Martin",
          phone: "0123456789",
          email: "mairie@saint-martin.fr",
          address: "1 place de la mairie",
          opening_hours: { lundi: "9h-12h" },
          associations: [],
          infos_pratiques: {},
        } },
      ],
    });
    expect(screen.getByText(/Saint-Martin/i)).toBeInTheDocument();
    expect(screen.getByText(/0123456789/)).toBeInTheDocument();
    expect(screen.getByText(/mairie@saint-martin.fr/i)).toBeInTheDocument();
  });

  it("renders empty state when commune has no practical info", () => {
    renderWithQuery(<InfosClient communeId="c-1" />, {
      cache: [
        { key: queryKeys.commune("c-1"), data: {
          id: "c-1",
          name: "Saint-Martin",
          phone: null,
          email: null,
          address: null,
          opening_hours: {},
          associations: [],
          infos_pratiques: {},
        } },
      ],
    });
    expect(screen.getByText(/Aucune information pratique/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run — expect FAIL**

- [ ] **Step 5: Implement `infos-client.tsx`**

Create `apps/web/src/app/app/infos-pratiques/infos-client.tsx` as the client-component version of the existing server page. Copy the existing file's parsing helpers (`parseServices`, `parseLinks`) + all its JSX into the new file, swap the server-side commune fetch for `useCommune(communeId)`, and add `"use client";` at the top:

```tsx
"use client";

import { Phone, Mail, MapPin, Clock, ExternalLink } from "lucide-react";
import { useCommune } from "@/hooks/queries/use-commune";

interface InfosPratiques {
  horaires?: string;
  contact?: string;
  services?: string;
  associations?: string;
  commerces?: Array<{ nom: string; horaires?: string; tel?: string; emoji?: string }>;
  liens?: string;
}

interface Service {
  name: string;
  location?: string;
  phone: string;
}

interface Commerce {
  nom: string;
  horaires?: string;
  tel?: string;
  emoji?: string;
}

interface Lien {
  label: string;
  url: string;
}

function parseServices(servicesStr?: string): Service[] {
  if (!servicesStr) return [];
  const lines = servicesStr.split("\n").filter((l) => l.trim());
  const regex = /^(.+?)(?:\s*\((.+?)\))?\s*:\s*(.+)$/;
  return lines
    .map((line) => {
      const match = line.match(regex);
      if (!match) return null;
      return { name: match[1].trim(), location: match[2]?.trim(), phone: match[3].trim() };
    })
    .filter((s): s is Service => s !== null);
}

function parseLinks(linksStr?: string): Lien[] {
  if (!linksStr) return [];
  const lines = linksStr.split("\n").filter((l) => l.trim());
  return lines
    .map((line) => {
      const match = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (!match) return null;
      const url = match[2].trim();
      if (url.match(/^https?:\/\//)) return { label: match[1].trim(), url };
      return null;
    })
    .filter((l): l is Lien => l !== null);
}

export function InfosClient({ communeId }: { communeId: string }) {
  const { data: commune } = useCommune(communeId);
  if (!commune) return null;

  const infos = ((commune.infos_pratiques as InfosPratiques) ?? {});
  const contact = {
    tel: commune.phone ?? undefined,
    email: commune.email ?? undefined,
    adresse: commune.address ?? undefined,
  };
  const openingHours = (commune.opening_hours ?? {}) as Record<string, string>;
  const hours = Object.entries(openingHours)
    .filter(([, v]) => v.trim())
    .map(([day, time]) => `${day.charAt(0).toUpperCase() + day.slice(1)} : ${time}`);
  const associations = ((commune.associations ?? []) as Array<{ name: string; description?: string; contact?: string; schedule?: string }>);
  const services = parseServices(infos.services);
  const commerces = infos.commerces ?? [];
  const links = parseLinks(infos.liens);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Infos pratiques — {commune.name}
      </h1>

      {(hours.length > 0 || contact.tel || contact.email || contact.adresse) && (
        <div
          className="rounded-[14px] border border-[#f0e8da] p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]"
          style={{
            background: `linear-gradient(135deg, var(--theme-gradient-1) 0%, var(--theme-gradient-2) 50%, var(--theme-gradient-3) 100%)`,
          }}
        >
          <div className="flex flex-col gap-6 text-white sm:flex-row sm:justify-between">
            {hours.length > 0 && (
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  <h2 className="text-lg font-semibold">🏛️ {commune.name}</h2>
                </div>
                <div className="space-y-1 text-sm">
                  {hours.map((hour, idx) => (<div key={idx}>{hour}</div>))}
                </div>
              </div>
            )}
            {(contact.tel || contact.email || contact.adresse) && (
              <div className="flex-1 space-y-3 text-sm">
                {contact.tel && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <a href={`tel:${contact.tel.replace(/\s/g, "")}`} className="underline hover:opacity-80">{contact.tel}</a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <a href={`mailto:${contact.email}`} className="underline hover:opacity-80">{contact.email}</a>
                  </div>
                )}
                {contact.adresse && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{contact.adresse}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>📍 Services de proximité</h2>
          <div className="space-y-3">
            {services.map((service, idx) => (
              <div key={idx} className="rounded-lg p-3" style={{ backgroundColor: "var(--theme-background)" }}>
                <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--foreground)]">{service.name}</div>
                    {service.location && <div className="text-sm text-[var(--muted-foreground)]">{service.location}</div>}
                  </div>
                  <a href={`tel:${service.phone.replace(/\s/g, "")}`} className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--theme-primary)" }}>{service.phone}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {associations.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>🤝 Associations</h2>
          <div className="space-y-3">
            {associations.map((assoc, idx) => (
              <div key={idx} className="rounded-lg p-3" style={{ backgroundColor: "var(--theme-background)" }}>
                <div className="font-semibold text-[var(--foreground)]">{assoc.name}</div>
                {assoc.description && <p className="text-sm text-[var(--muted-foreground)]">{assoc.description}</p>}
                {assoc.contact && <p className="text-xs text-[var(--muted-foreground)]">Contact : {assoc.contact}</p>}
                {assoc.schedule && <p className="text-xs text-[var(--muted-foreground)]">Horaires : {assoc.schedule}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {commerces.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>🏪 Commerces & services</h2>
          <div className="space-y-3">
            {commerces.map((commerce, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: "var(--theme-background)" }}>
                {commerce.emoji && (<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-lg">{commerce.emoji}</div>)}
                <div className="flex-1">
                  <div className="font-semibold text-[var(--foreground)]">{commerce.nom}</div>
                  {commerce.horaires && <div className="text-sm text-[var(--muted-foreground)]">{commerce.horaires}</div>}
                  {commerce.tel && (<a href={`tel:${commerce.tel.replace(/\s/g, "")}`} className="text-sm font-medium" style={{ color: "var(--theme-primary)" }}>{commerce.tel}</a>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>🔗 Liens utiles</h2>
          <div className="space-y-2">
            {links.map((link, idx) => (
              <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg p-3 text-sm transition-colors" style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-primary)" }}>
                <span className="flex-1 font-medium hover:underline">{link.label}</span>
                <ExternalLink size={16} className="flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {hours.length === 0 && services.length === 0 && associations.length === 0 && commerces.length === 0 && links.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Aucune information pratique disponible pour le moment.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run — expect PASS**

### 7.3 — Thin-shell `page.tsx`

- [ ] **Step 7: Replace `apps/web/src/app/app/infos-pratiques/page.tsx`**

```tsx
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getCommune,
  queryKeys,
} from "@pretou/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { InfosClient } from "./infos-client";

export default async function AppInfosPratiquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    await qc.prefetchQuery({
      queryKey: queryKeys.commune(profile.commune_id),
      queryFn: async () => {
        const { data } = await getCommune(supabase, profile.commune_id);
        return data;
      },
    });
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <ThemeInjector
        theme={profile.communes?.theme}
        customPrimaryColor={profile.communes?.custom_primary_color}
      />
      <InfosClient communeId={profile.commune_id} />
    </HydrationBoundary>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/skeletons/infos-pratiques-skeleton.tsx \
        apps/web/src/app/app/infos-pratiques/loading.tsx \
        apps/web/src/app/app/infos-pratiques/infos-client.tsx \
        apps/web/src/app/app/infos-pratiques/page.tsx \
        apps/web/tests/components/infos-client.test.tsx
git commit -m "feat(web): migrate /app/infos-pratiques to thin shell + React Query"
```

---

## Task 8: Full verification + manual smoke

**Files:** none modified.

- [ ] **Step 1: Full component + integration suites**

```bash
pnpm --filter @pretou/web test:components
pnpm --filter @pretou/web test:integration
```

Expected: all green. Component count approximately 67 (prior) + ~15 new = 82.

- [ ] **Step 2: Typecheck + build**

```bash
pnpm --filter @pretou/web typecheck
pnpm --filter @pretou/web build
```

- [ ] **Step 3: Manual smoke**

```bash
pnpm --filter @pretou/web dev
```

For each route, navigate away and back while watching the Network tab:

1. `/app/mon-espace` — first visit shows skeleton then content; second visit (after coming from another route) shows cached content instantly with zero Supabase calls until cache goes stale.
2. `/app/settings` — same pattern. Saving the form should NOT trigger a hard-refresh; instead the displayed name/avatar should update because of the `invalidateQueries` call.
3. `/app/infos-pratiques` — same pattern. Content identical to current page.

Console: no hydration warnings.

- [ ] **Step 4: No commit needed (verification only)**

---

## Done when

- All 8 tasks committed (expected ~7 commits: 1 per task except the verification task).
- Component tests ~82 passing; integration tests unchanged.
- Manual smoke confirms instant cached nav on all three routes and settings save still works end-to-end.
- No hydration-mismatch warnings.

## Notes for P3 (next plan)

P3 migrates `/app/evenements` and `/app/producteurs`. Both are commune-scoped list pages, similar shape to `/app/feed` but simpler (no EPCI scope, no realtime needed for producers, simple pagination or none). Expected effort: ~6-8 tasks in a single plan. The hook layer and skeleton primitives from P2 are reused directly.
