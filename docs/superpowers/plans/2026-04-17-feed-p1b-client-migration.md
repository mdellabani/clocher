# P1b — `/app/feed` Client-Side Data Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/app/feed` into a thin server shell + client-driven body. All feed reads (pinned posts, paginated posts, EPCI posts, EPCI communes, producer count, profile identity) move to React Query hooks with server-side prefetch + `HydrationBoundary`. After the first visit, returning to `/app/feed` uses the cached data — navigation becomes effectively instant, with a single Supabase round-trip for background refetch only when `staleTime` has elapsed.

**Architecture:** Server component (`page.tsx`) keeps the auth guard (required — cannot move to client), prefetches all reads into a `QueryClient`, ships the dehydrated state inside `<HydrationBoundary>`, and renders a `<FeedClient />` client component that consumes the cache via hooks. `useInfiniteQuery` replaces the current `useState`-based pagination in `FeedContent`; the existing `load-more-action.ts` server action becomes dead code and is deleted.

**Tech Stack:** Next.js 16 App Router, React 19, `@tanstack/react-query` ^5.62.0 (installed in P0), Vitest + Testing Library, Supabase JS v2.

**Spec reference:** `docs/superpowers/specs/2026-04-17-app-client-side-data-design.md` — sections "High-level architecture", "3 Query key conventions", "4 Client hook layer", "8 Identity caching", and phase P1 in "Phased rollout".

**Dependencies:** P0 (React Query foundation) and P1a (loading.tsx) must be merged first.

**Out of scope for P1b:** Realtime (`setQueryData` on `postgres_changes`) — P1c. Mutation invalidation refactor of `createPostAction` — P1c. Migration of other pages (`/app/mon-espace`, `/admin/*`) — later phases (P2–P5).

**User-visible outcome after merge:** First visit to `/app/feed` behaves identically to today in terms of content (because server prefetches everything). Subsequent navigations away-and-back to `/app/feed` are instant — React Query serves cached data, no server round-trip. Filter changes (`?types=...`, `?date=...`) still trigger a new fetch (different query key) but don't block the URL change.

---

## File structure

**Create (new files):**
- `apps/web/src/hooks/queries/use-profile.ts` — `useProfile(userId)` via `useQuery`. Consumes hydrated cache.
- `apps/web/src/hooks/queries/use-pinned-posts.ts` — `usePinnedPosts(communeId)` via `useQuery`.
- `apps/web/src/hooks/queries/use-posts.ts` — `usePosts(communeId, filters)` via `useInfiniteQuery`. 20 posts per page. Handles type + date filters.
- `apps/web/src/hooks/queries/use-epci-posts.ts` — `useEpciPosts(epciId, communeIds?)` via `useInfiniteQuery`. Same shape.
- `apps/web/src/hooks/queries/use-epci-communes.ts` — `useEpciCommunes(epciId)` via `useQuery`.
- `apps/web/src/hooks/queries/use-producer-count.ts` — `useProducerCount(communeId)` via `useQuery`.
- `apps/web/src/app/app/feed/feed-client.tsx` — new top-level client component that consumes all hooks + renders the full feed body.
- Test files mirroring each of the above under `apps/web/tests/hooks/` (except feed-client which gets a component test).

**Modify:**
- `packages/shared/src/queries/posts.ts` — extend `getPostsPaginated` to accept an optional `filters` arg. Add the same filter handling to `getEpciPosts`.
- `apps/web/src/app/app/feed/page.tsx` — refactor to thin server shell (auth + prefetch + HydrationBoundary + `<FeedClient />`).

**Delete:**
- `apps/web/src/app/app/feed/feed-content.tsx` — functionality absorbed into `feed-client.tsx` (specifically, the infinite-scroll intersection observer + list rendering).
- `apps/web/src/app/app/feed/load-more-action.ts` — replaced by `useInfiniteQuery`'s `queryFn` calling `getPostsPaginated` directly from the client.

**Do not touch in P1b:**
- `apps/web/src/app/app/feed/actions.ts` — `createPostAction` stays identical (including its `revalidatePath` call). Mutation invalidation is P1c's job.
- `loading.tsx` shipped in P1a — still valid, no changes needed.

---

## Task 1: Extend `getPostsPaginated` in shared to accept filters

**Files:**
- Modify: `packages/shared/src/queries/posts.ts`
- Create: `apps/web/tests/integration/shared-get-posts-paginated-filters.test.ts`

**Context:** The current `getPostsPaginated(client, communeId, cursor, limit)` doesn't accept type/date filters — the feed's server action `load-more-action.ts` reimplements filter logic inline. For the client hook to own pagination, filters must live in the shared query function.

- [ ] **Step 1: Write the failing integration test** — follow existing `_fixtures.ts` pattern (resetData, signInAs, SEED_IDS)

Create `apps/web/tests/integration/shared-get-posts-paginated-filters.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, serviceClient, SEED_IDS, SEED_EMAILS, signInAs } from "./_fixtures";
import { getPostsPaginated } from "@rural-community-platform/shared";

describe("getPostsPaginated filters", () => {
  beforeEach(async () => {
    await resetData();
    const svc = serviceClient();
    // Insert two posts of different types using service client (bypasses RLS).
    await svc.from("posts").insert([
      { title: "__filter_annonce__", body: "x", type: "annonce", commune_id: SEED_IDS.commune, author_id: SEED_IDS.admin },
      { title: "__filter_entraide__", body: "x", type: "entraide", commune_id: SEED_IDS.commune, author_id: SEED_IDS.resident },
    ]);
  });

  it("returns only posts of the requested types when types filter is passed", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await getPostsPaginated(supabase, SEED_IDS.commune, null, 50, {
      types: ["annonce"],
    });
    expect(error).toBeNull();
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__filter_annonce__");
    expect(titles).not.toContain("__filter_entraide__");
  });

  it("returns all types when types filter is absent", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data } = await getPostsPaginated(supabase, SEED_IDS.commune, null, 50, {});
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__filter_annonce__");
    expect(titles).toContain("__filter_entraide__");
  });

  it("accepts a `today` dateFilter and still returns posts inserted during the test", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data } = await getPostsPaginated(supabase, SEED_IDS.commune, null, 50, {
      dateFilter: "today",
    });
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__filter_annonce__");
  });
});
```

Notes: uses the existing `_fixtures.ts` helpers (`resetData`, `signInAs`, `serviceClient`, `SEED_IDS`, `SEED_EMAILS`) so the test resets state between runs like every other integration test in the project. The test signs in as a resident to go through RLS, which is representative of real call sites.

- [ ] **Step 2: Run — expect FAIL (filter arg not supported)**

```bash
pnpm --filter @rural-community-platform/web test:integration -- shared-get-posts-paginated-filters
```

Expected: FAIL — TypeScript error on the 5th argument, or runtime failure because filter is ignored.

- [ ] **Step 3: Extend the shared query**

Edit `packages/shared/src/queries/posts.ts`. Replace the existing `getPostsPaginated` function with:

```ts
export type PostListFilters = {
  types?: string[];
  dateFilter?: "today" | "week" | "month" | "";
};

function applyDateFilter<Q extends { gte: (col: string, v: string) => Q }>(
  query: Q,
  dateFilter: PostListFilters["dateFilter"],
): Q {
  if (dateFilter === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return query.gte("created_at", d.toISOString());
  }
  if (dateFilter === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return query.gte("created_at", d.toISOString());
  }
  if (dateFilter === "month") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return query.gte("created_at", d.toISOString());
  }
  return query;
}

export async function getPostsPaginated(
  client: Client,
  communeId: string,
  cursor: string | null,
  limit = 20,
  filters: PostListFilters = {},
) {
  let query = client
    .from("posts")
    .select(
      "*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path), comments(count), rsvps(status)",
    )
    .eq("commune_id", communeId)
    .eq("is_hidden", false)
    .eq("is_pinned", false)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  if (filters.types && filters.types.length > 0) {
    query = query.in("type", filters.types);
  }
  query = applyDateFilter(query, filters.dateFilter);
  return query;
}
```

Also export `PostListFilters` from `packages/shared/src/queries/posts.ts` and re-export from `packages/shared/src/queries/index.ts` and the top-level barrel.

Edit `packages/shared/src/queries/index.ts`. Change the posts line to:

```ts
export { getPosts, getPostById, createPost, deletePost, togglePinPost, getPostsByType, getPostsPaginated, getPinnedPosts } from "./posts";
export type { PostListFilters } from "./posts";
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

```bash
pnpm --filter @rural-community-platform/web test:integration -- shared-get-posts-paginated-filters
```

- [ ] **Step 5: Ensure no regression in existing integration tests**

```bash
pnpm --filter @rural-community-platform/web test:integration
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/queries/posts.ts packages/shared/src/queries/index.ts \
        apps/web/tests/integration/shared-get-posts-paginated-filters.test.ts
git commit -m "feat(shared): getPostsPaginated accepts types/dateFilter filters"
```

---

## Task 2: `useProfile` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-profile.ts`
- Create: `apps/web/tests/hooks/use-profile.test.tsx`
- Modify: `apps/web/vitest.config.ts` — extend include to pick up `tests/hooks/**/*.test.{ts,tsx}`.

**Context:** `useProfile(userId)` returns the user's profile (with joined `communes`) from the React Query cache. The server shell prefetches this into the hydration boundary, so the hook reads synchronously on first render after hydration.

- [ ] **Step 1: Extend vitest include**

Edit `apps/web/vitest.config.ts`. Replace the include line with:

```ts
include: [
  "tests/components/**/*.test.{ts,tsx}",
  "tests/query/**/*.test.ts",
  "tests/helpers/**/*.test.{ts,tsx}",
  "tests/hooks/**/*.test.{ts,tsx}",
],
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/tests/hooks/use-profile.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { useProfile } from "@/hooks/queries/use-profile";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error("should not be called when hydrated") }),
        }),
      }),
    }),
  }),
}));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useProfile", () => {
  it("returns hydrated profile data without calling Supabase", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const userId = "u-1";
    qc.setQueryData(queryKeys.profile(userId), {
      id: userId,
      commune_id: "c-1",
      role: "admin",
      status: "active",
      display_name: "Marie",
      communes: { id: "c-1", name: "Saint-Martin" },
    });

    const { result } = renderHook(() => useProfile(userId), { wrapper: wrap(qc) });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.id).toBe(userId);
    expect(result.current.data?.communes?.name).toBe("Saint-Martin");
  });

  it("is disabled when userId is empty (no fetch attempted)", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useProfile(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 3: Run — expect FAIL (module not found)**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-profile.test
```

- [ ] **Step 4: Implement the hook**

Create `apps/web/src/hooks/queries/use-profile.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getProfile, queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getProfile(supabase, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 5: Run — expect PASS (2 tests)**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-profile.test
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/queries/use-profile.ts \
        apps/web/tests/hooks/use-profile.test.tsx \
        apps/web/vitest.config.ts
git commit -m "feat(web): useProfile hook consuming hydrated React Query cache"
```

---

## Task 3: `usePinnedPosts` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-pinned-posts.ts`
- Create: `apps/web/tests/hooks/use-pinned-posts.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-pinned-posts.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { usePinnedPosts } from "@/hooks/queries/use-pinned-posts";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              or: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePinnedPosts", () => {
  it("returns hydrated pinned posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.pinned("c-1"), [
      { id: "p1", title: "Annonce importante", is_pinned: true },
    ]);
    const { result } = renderHook(() => usePinnedPosts("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe("p1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePinnedPosts(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-pinned-posts.test
```

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-pinned-posts.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getPinnedPosts, queryKeys } from "@rural-community-platform/shared";
import type { Post } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function usePinnedPosts(communeId: string) {
  return useQuery<Post[]>({
    queryKey: queryKeys.posts.pinned(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPinnedPosts(supabase, communeId);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-pinned-posts.test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-pinned-posts.ts \
        apps/web/tests/hooks/use-pinned-posts.test.tsx
git commit -m "feat(web): usePinnedPosts hook"
```

---

## Task 4: `usePosts` hook with `useInfiniteQuery` (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-posts.ts`
- Create: `apps/web/tests/hooks/use-posts.test.tsx`

**Context:** This is the centerpiece — it replaces both `page.tsx`'s initial 20-post query AND `load-more-action.ts`'s subsequent-page loader. `useInfiniteQuery` appends pages, and the caller reads `data.pages.flat()` to get the full flat list.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-posts.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { usePosts } from "@/hooks/queries/use-posts";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePosts", () => {
  it("returns hydrated first page of posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.list("c-1", { types: [], dateFilter: "" }), {
      pages: [[{ id: "p1", title: "hello" }]],
      pageParams: [null],
    });
    const { result } = renderHook(() => usePosts("c-1", { types: [], dateFilter: "" }), {
      wrapper: wrap(qc),
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.pages.flat()).toHaveLength(1);
    expect(result.current.data?.pages.flat()[0].id).toBe("p1");
  });

  it("differentiates cache by filter", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.list("c-1", { types: [], dateFilter: "" }), {
      pages: [[{ id: "unfiltered" }]],
      pageParams: [null],
    });
    qc.setQueryData(queryKeys.posts.list("c-1", { types: ["annonce"], dateFilter: "" }), {
      pages: [[{ id: "filtered" }]],
      pageParams: [null],
    });

    const { result: r1 } = renderHook(
      () => usePosts("c-1", { types: [], dateFilter: "" }),
      { wrapper: wrap(qc) },
    );
    const { result: r2 } = renderHook(
      () => usePosts("c-1", { types: ["annonce"], dateFilter: "" }),
      { wrapper: wrap(qc) },
    );

    expect(r1.current.data?.pages.flat()[0].id).toBe("unfiltered");
    expect(r2.current.data?.pages.flat()[0].id).toBe("filtered");
  });

  it("is disabled when communeId is empty", () => {
    const qc = new QueryClient();
    const { result } = renderHook(
      () => usePosts("", { types: [], dateFilter: "" }),
      { wrapper: wrap(qc) },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-posts.test
```

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-posts.ts`:

```ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { getPostsPaginated, queryKeys } from "@rural-community-platform/shared";
import type { Post, PostListFilters } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

export function usePosts(communeId: string, filters: PostListFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.list(communeId, filters),
    queryFn: async ({ pageParam }) => {
      const supabase = createClient();
      const { data, error } = await getPostsPaginated(
        supabase,
        communeId,
        pageParam,
        PAGE_SIZE,
        filters,
      );
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-posts.test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-posts.ts \
        apps/web/tests/hooks/use-posts.test.tsx
git commit -m "feat(web): usePosts hook with useInfiniteQuery + filters"
```

---

## Task 5: `useEpciPosts` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-epci-posts.ts`
- Create: `apps/web/tests/hooks/use-epci-posts.test.tsx`

**Context:** EPCI scope shows posts from a federation of communes. No pinning in this scope; cursor pagination same shape as commune scope. Current shared query `getEpciPosts(client, epciId, communeIds?)` returns all posts without pagination — we add pagination here as part of the migration.

Since `getEpciPosts` currently isn't paginated, we'll use it as-is for now (returns all EPCI posts in one shot) but wrap it in `useInfiniteQuery` with `getNextPageParam: () => undefined` (single-page infinite query). When the user eventually needs pagination here (post-v1), the hook's shape stays; only the shared query changes. This keeps P1b focused on migration, not pagination refactor.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-epci-posts.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { useEpciPosts } from "@/hooks/queries/use-epci-posts";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useEpciPosts", () => {
  it("returns hydrated EPCI posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.epci("e-1"), {
      pages: [[{ id: "p1" }]],
      pageParams: [null],
    });
    const { result } = renderHook(() => useEpciPosts("e-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.pages.flat()).toHaveLength(1);
  });

  it("scopes cache by optional communeIds filter", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.epci("e-1"), { pages: [[{ id: "all" }]], pageParams: [null] });
    qc.setQueryData(queryKeys.posts.epci("e-1", ["c-1"]), { pages: [[{ id: "filtered" }]], pageParams: [null] });
    const { result: r1 } = renderHook(() => useEpciPosts("e-1"), { wrapper: wrap(qc) });
    const { result: r2 } = renderHook(() => useEpciPosts("e-1", ["c-1"]), { wrapper: wrap(qc) });
    expect(r1.current.data?.pages.flat()[0].id).toBe("all");
    expect(r2.current.data?.pages.flat()[0].id).toBe("filtered");
  });

  it("is disabled when epciId is empty", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useEpciPosts(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-epci-posts.test
```

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-epci-posts.ts`:

```ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { getEpciPosts, queryKeys } from "@rural-community-platform/shared";
import type { Post } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useEpciPosts(epciId: string, communeIds?: string[]) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.epci(epciId, communeIds),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getEpciPosts(supabase, epciId, communeIds);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: () => undefined, // single-page until EPCI query gets real pagination
    enabled: !!epciId,
  });
}
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-epci-posts.test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-epci-posts.ts \
        apps/web/tests/hooks/use-epci-posts.test.tsx
git commit -m "feat(web): useEpciPosts hook (single-page infinite for now)"
```

---

## Task 6: `useEpciCommunes` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-epci-communes.ts`
- Create: `apps/web/tests/hooks/use-epci-communes.test.tsx`

**Context:** Powers the commune-filter chip row when user is in EPCI scope. Wraps existing `getCommunesByEpci(client, epciId)`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-epci-communes.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEpciCommunes } from "@/hooks/queries/use-epci-communes";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useEpciCommunes", () => {
  it("returns hydrated communes", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(["epci-communes", "e-1"], [
      { id: "c-1", name: "Saint-Martin" },
      { id: "c-2", name: "Saint-Pierre" },
    ]);
    const { result } = renderHook(() => useEpciCommunes("e-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toHaveLength(2);
  });

  it("is disabled when epciId is null", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useEpciCommunes(null), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-epci-communes.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getCommunesByEpci } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useEpciCommunes(epciId: string | null) {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ["epci-communes", epciId],
    queryFn: async () => {
      if (!epciId) return [];
      const supabase = createClient();
      const { data, error } = await getCommunesByEpci(supabase, epciId);
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
    },
    enabled: !!epciId,
  });
}
```

Note: the query key here is a local literal (`["epci-communes", epciId]`) rather than added to the central registry. Rationale: this is a filter-UI concern, not core domain. If multiple consumers arise we can promote it to `queryKeys.epciCommunes(epciId)` — YAGNI for now.

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-epci-communes.ts \
        apps/web/tests/hooks/use-epci-communes.test.tsx
git commit -m "feat(web): useEpciCommunes hook for EPCI scope filter"
```

---

## Task 7: `useProducerCount` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-producer-count.ts`
- Create: `apps/web/tests/hooks/use-producer-count.test.tsx`

**Context:** Powers the producers banner above the feed. Today it's a head-count query from `page.tsx`. We move it to a client hook with a longer `staleTime` (producer list changes rarely).

- [ ] **Step 1: Write failing test**

Create `apps/web/tests/hooks/use-producer-count.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProducerCount } from "@/hooks/queries/use-producer-count";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useProducerCount", () => {
  it("returns hydrated count", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(["producer-count", "c-1"], 7);
    const { result } = renderHook(() => useProducerCount("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toBe(7);
  });

  it("is disabled without communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useProducerCount(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-producer-count.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useProducerCount(communeId: string) {
  return useQuery<number>({
    queryKey: ["producer-count", communeId],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("producers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("commune_id", communeId);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 30, // 30 min — producers rarely change
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-producer-count.ts \
        apps/web/tests/hooks/use-producer-count.test.tsx
git commit -m "feat(web): useProducerCount hook with long staleTime"
```

---

## Task 8: `feed-client.tsx` — full client component (TDD-lite)

**Files:**
- Create: `apps/web/src/app/app/feed/feed-client.tsx`
- Create: `apps/web/tests/components/feed-client.test.tsx`

**Context:** This absorbs the entirety of the old `feed-content.tsx` (infinite scroll + list) plus the JSX currently in `page.tsx` after the auth guard (header row, scope toggle, filters, producer banner). Reads profile + posts via hooks. The server shell in Task 10 will render only `<HydrationBoundary state={...}><FeedClient userId={user.id} /></HydrationBoundary>` plus `ThemeInjector`.

This is the largest single file in P1b. Plan to write it, test it against hydrated cache, then wire it in Task 10.

- [ ] **Step 1: Write the component test** (verifies cache consumption + key branches)

Create `apps/web/tests/components/feed-client.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@rural-community-platform/shared";
import { FeedClient } from "@/app/app/feed/feed-client";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/app/feed",
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

describe("FeedClient", () => {
  it("renders pinned posts before regular posts from hydrated cache (commune scope)", () => {
    renderWithQuery(<FeedClient userId="u-1" />, {
      cache: [
        {
          key: queryKeys.profile("u-1"),
          data: {
            id: "u-1",
            commune_id: "c-1",
            role: "admin",
            status: "active",
            display_name: "Marie",
            communes: { id: "c-1", name: "Saint-Martin", epci_id: null },
          },
        },
        {
          key: queryKeys.posts.pinned("c-1"),
          data: [{ id: "pin-1", title: "Pinned!", body: "x", type: "annonce", created_at: "2026-04-17T00:00:00Z", profiles: {}, post_images: [], comments: [{ count: 0 }], rsvps: [] }],
        },
        {
          key: queryKeys.posts.list("c-1", { types: [], dateFilter: "" }),
          data: {
            pages: [[
              { id: "p-1", title: "Regular", body: "x", type: "discussion", created_at: "2026-04-16T00:00:00Z", profiles: {}, post_images: [], comments: [{ count: 0 }], rsvps: [] },
            ]],
            pageParams: [null],
          },
        },
        { key: ["producer-count", "c-1"], data: 3 },
      ],
    });
    expect(screen.getByText("Pinned!")).toBeInTheDocument();
    expect(screen.getByText("Regular")).toBeInTheDocument();
    // Pinned appears first in document order.
    const order = screen.getAllByRole("article").map((a) => a.textContent ?? "");
    expect(order[0]).toContain("Pinned!");
  });

  it("renders empty state when no posts are in cache", () => {
    renderWithQuery(<FeedClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: { id: "u-1", commune_id: "c-1", role: "resident", status: "active", display_name: "", communes: { id: "c-1", name: "x", epci_id: null } } },
        { key: queryKeys.posts.pinned("c-1"), data: [] },
        { key: queryKeys.posts.list("c-1", { types: [], dateFilter: "" }), data: { pages: [[]], pageParams: [null] } },
        { key: ["producer-count", "c-1"], data: 0 },
      ],
    });
    expect(screen.getByText(/Aucune publication/i)).toBeInTheDocument();
  });
});
```

This test requires `PostCard` to render each post with `role="article"`. Verify that's already the case in `apps/web/src/components/post-card.tsx`; if not, adjust the test to use `data-testid="post-card"` and modify `PostCard` to add that testid (one-line change, keep in this task).

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @rural-community-platform/web test:components -- feed-client.test
```

- [ ] **Step 3: Implement `feed-client.tsx`**

Create `apps/web/src/app/app/feed/feed-client.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Post } from "@rural-community-platform/shared";
import { PostCard } from "@/components/post-card";
import { FeedFilters } from "@/components/feed-filters";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { useProfile } from "@/hooks/queries/use-profile";
import { usePinnedPosts } from "@/hooks/queries/use-pinned-posts";
import { usePosts } from "@/hooks/queries/use-posts";
import { useEpciPosts } from "@/hooks/queries/use-epci-posts";
import { useEpciCommunes } from "@/hooks/queries/use-epci-communes";
import { useProducerCount } from "@/hooks/queries/use-producer-count";

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function FeedClient({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const params = useSearchParams();
  const scope = params.get("scope") === "epci" ? "epci" : "commune";
  const selectedTypes = parseCsv(params.get("types"));
  const dateFilter = params.get("date") ?? "";
  const selectedCommuneIds = parseCsv(params.get("communes"));

  // Hooks always called; gate via `enabled` inside each.
  const communeId = profile?.commune_id ?? "";
  const epciId = profile?.communes?.epci_id ?? null;

  const pinned = usePinnedPosts(scope === "commune" ? communeId : "");
  const communePosts = usePosts(scope === "commune" ? communeId : "", {
    types: selectedTypes,
    dateFilter: (dateFilter || "") as PostListFilters["dateFilter"],
  });
  const epciPosts = useEpciPosts(
    scope === "epci" && epciId ? epciId : "",
    selectedCommuneIds.length > 0 ? selectedCommuneIds : undefined,
  );
  const epciCommunes = useEpciCommunes(scope === "epci" ? epciId : null);
  const producerCount = useProducerCount(communeId);

  const infiniteQuery = scope === "commune" ? communePosts : epciPosts;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!profile) return null; // Cache hydration guarantees this is synchronously set.

  const pinnedList: Post[] = (pinned.data ?? []) as Post[];
  const regular: Post[] = (infiniteQuery.data?.pages.flat() ?? []) as Post[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Fil de la commune</h1>
        <CreatePostDialog isAdmin={profile.role === "admin"} />
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          href="/app/feed"
          className={scope === "commune"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Ma commune
        </Link>
        <Link
          href="/app/feed?scope=epci"
          className={scope === "epci"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Intercommunalité
        </Link>
      </div>

      <FeedFilters
        types={selectedTypes}
        date={dateFilter}
        communes={scope === "epci" ? (epciCommunes.data ?? []) : undefined}
        selectedCommunes={selectedCommuneIds}
      />

      {(producerCount.data ?? 0) > 0 && (
        <Link
          href="/app/producteurs"
          className="flex items-center justify-between rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3.5 transition-shadow hover:shadow-md"
        >
          <div>
            <p className="text-sm font-bold text-green-800">🌿 Producteurs locaux</p>
            <p className="text-xs text-green-600">
              {producerCount.data} producteur{producerCount.data !== 1 ? "s" : ""} · Circuit court
            </p>
          </div>
          <span className="text-lg text-green-700">→</span>
        </Link>
      )}

      <div className="space-y-4">
        {pinnedList.map((post) => <PostCard key={post.id} post={post} />)}
        {regular.map((post) => <PostCard key={post.id} post={post} />)}
        {infiniteQuery.hasNextPage && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {infiniteQuery.isFetchingNextPage && (
              <p className="text-sm text-[var(--muted-foreground)]">Chargement...</p>
            )}
          </div>
        )}
        {!infiniteQuery.hasNextPage && regular.length > 0 && (
          <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
            Aucune publication plus ancienne.
          </p>
        )}
        {pinnedList.length === 0 && regular.length === 0 && (
          <p className="py-8 text-center text-[var(--muted-foreground)]">
            Aucune publication pour cette sélection.
          </p>
        )}
      </div>
    </div>
  );
}
```

Note the import: `PostListFilters` from `@rural-community-platform/shared`. Add at the top with other imports:

```tsx
import type { PostListFilters } from "@rural-community-platform/shared";
```

- [ ] **Step 4: Run — expect PASS (2 tests) or investigate failures**

```bash
pnpm --filter @rural-community-platform/web test:components -- feed-client.test
```

If `PostCard` doesn't use `role="article"`, the test's `getAllByRole("article")` will fail. Fix by either:
- Adding `role="article"` to `PostCard`'s outer element (one-line change in `apps/web/src/components/post-card.tsx`), or
- Changing the test to use `screen.getAllByTestId("post-card")` and adding `data-testid="post-card"` to `PostCard`.

Prefer the `role="article"` approach — semantic HTML, no test-only prop.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/feed/feed-client.tsx \
        apps/web/tests/components/feed-client.test.tsx \
        apps/web/src/components/post-card.tsx   # only if you added role="article"
git commit -m "feat(web): feed-client consumes hydrated React Query cache"
```

---

## Task 9: Thin-shell `page.tsx` refactor

**Files:**
- Modify: `apps/web/src/app/app/feed/page.tsx`

- [ ] **Step 1: Replace the entire file**

Replace `apps/web/src/app/app/feed/page.tsx` with:

```tsx
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  getProfile,
  getPinnedPosts,
  getPostsPaginated,
  getEpciPosts,
  getCommunesByEpci,
  queryKeys,
} from "@rural-community-platform/shared";
import type { Post, PostListFilters } from "@rural-community-platform/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { FeedClient } from "./feed-client";

const PAGE_SIZE = 20;

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; date?: string; types?: string; communes?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "epci" ? "epci" : "commune";
  const filters: PostListFilters = {
    types: parseCsv(params.types),
    dateFilter: (params.date ?? "") as PostListFilters["dateFilter"],
  };
  const selectedCommuneIds = parseCsv(params.communes);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) {
    if (isSuperAdmin(user.email)) redirect("/super-admin");
    redirect("/auth/signup");
  }
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    // Identity (stable for the session)
    qc.setQueryData(queryKeys.profile(user.id), profile);

    // Producer count (rare change)
    await qc.prefetchQuery({
      queryKey: ["producer-count", profile.commune_id],
      queryFn: async () => {
        const { count } = await supabase
          .from("producers")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("commune_id", profile.commune_id);
        return count ?? 0;
      },
    });

    if (scope === "epci" && profile.communes?.epci_id) {
      // EPCI scope prefetch
      await qc.prefetchQuery({
        queryKey: ["epci-communes", profile.communes.epci_id],
        queryFn: async () => {
          const { data } = await getCommunesByEpci(supabase, profile.communes!.epci_id!);
          return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
        },
      });
      await qc.prefetchInfiniteQuery({
        queryKey: queryKeys.posts.epci(
          profile.communes.epci_id,
          selectedCommuneIds.length > 0 ? selectedCommuneIds : undefined,
        ),
        queryFn: async () => {
          const { data } = await getEpciPosts(
            supabase,
            profile.communes!.epci_id!,
            selectedCommuneIds.length > 0 ? selectedCommuneIds : undefined,
          );
          return (data ?? []) as Post[];
        },
        initialPageParam: null as string | null,
      });
    } else {
      // Commune scope prefetch
      await qc.prefetchQuery({
        queryKey: queryKeys.posts.pinned(profile.commune_id),
        queryFn: async () => {
          const { data } = await getPinnedPosts(supabase, profile.commune_id);
          return (data ?? []) as Post[];
        },
      });
      await qc.prefetchInfiniteQuery({
        queryKey: queryKeys.posts.list(profile.commune_id, filters),
        queryFn: async () => {
          const { data } = await getPostsPaginated(
            supabase,
            profile.commune_id,
            null,
            PAGE_SIZE,
            filters,
          );
          return (data ?? []) as Post[];
        },
        initialPageParam: null as string | null,
      });
    }
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <ThemeInjector
        theme={profile.communes?.theme}
        customPrimaryColor={profile.communes?.custom_primary_color}
      />
      <FeedClient userId={user.id} />
    </HydrationBoundary>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

Expected: exit 0. If TypeScript flags that `qc.prefetchInfiniteQuery` is missing a `getNextPageParam`, add `getNextPageParam: () => undefined` to the prefetch options (server only prefetches the first page).

- [ ] **Step 3: Component suite still green**

```bash
pnpm --filter @rural-community-platform/web test:components
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/feed/page.tsx
git commit -m "refactor(web): /app/feed page becomes thin server shell + HydrationBoundary"
```

---

## Task 10: Delete `feed-content.tsx` and `load-more-action.ts`

**Files:**
- Delete: `apps/web/src/app/app/feed/feed-content.tsx`
- Delete: `apps/web/src/app/app/feed/load-more-action.ts`

- [ ] **Step 1: Verify nothing else imports them**

```bash
pnpm --filter @rural-community-platform/web --silent exec grep -rln "feed-content\|load-more-action\|loadMorePosts\|FeedContent" apps/web/src/ apps/web/tests/
```

Expected: no results (apart from the files themselves).

- [ ] **Step 2: Delete**

```bash
git rm apps/web/src/app/app/feed/feed-content.tsx \
       apps/web/src/app/app/feed/load-more-action.ts
```

- [ ] **Step 3: Typecheck + component tests**

```bash
pnpm --filter @rural-community-platform/web typecheck
pnpm --filter @rural-community-platform/web test:components
```

Expected: both green.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(web): remove feed-content + load-more-action (replaced by hooks)"
```

---

## Task 11: Full verification + manual smoke

**Files:** none modified.

- [ ] **Step 1: Component suite**

```bash
pnpm --filter @rural-community-platform/web test:components
```

Expected: prior 44 + ~12 new from this plan = ~56 tests, all green.

- [ ] **Step 2: Integration suite**

Ensure local Supabase is running.

```bash
pnpm --filter @rural-community-platform/web test:integration
```

Expected: prior 36 + 3 new filter tests from Task 1 = 39 tests, all green.

- [ ] **Step 3: Typecheck + build**

```bash
pnpm --filter @rural-community-platform/web typecheck && \
pnpm --filter @rural-community-platform/web build
```

Expected: both exit 0.

- [ ] **Step 4: Manual smoke — critical**

```bash
pnpm --filter @rural-community-platform/web dev
```

In the browser, log in as a resident and an admin in separate sessions. Test all of:

1. `/app/feed` (commune scope): pinned + paginated posts render. Scroll to bottom → infinite loader triggers → next page appears.
2. `/app/feed?types=annonce`: filter narrows to annonces only. Filter chip UI reflects selection.
3. `/app/feed?date=week`: date filter works. Combined `?types=annonce&date=week` also works.
4. `/app/feed?scope=epci`: EPCI scope shows posts from multiple communes with commune labels. Commune-filter chips work.
5. Navigate Feed → Events → Feed: second visit should feel instant (cached data from hydration).
6. Create a post via `CreatePostDialog`: the new post appears after a brief delay (current behavior via `revalidatePath` + server-side refresh — P1c will make it instant).
7. Open DevTools Network tab: on the second visit to `/app/feed`, you should see **zero** requests to Supabase (cached from hydration + staleTime 5 min).

Close dev server.

- [ ] **Step 5: Browser console check — no hydration warnings**

Repeat the Feed navigation with DevTools → Console open. Watch for "hydration mismatch" warnings. Common causes if any appear:
- Server serialized `undefined` somewhere. Fix: set to `null` in the prefetch.
- Query key shape mismatch between server prefetch and client hook. Audit `queryKeys.posts.list(communeId, filters)` — filters must be identical in both places (same empty-string default for `dateFilter`, same empty array for `types`).

If there are warnings, fix inline before the next step. They will NOT appear in automated tests but WILL leak to production.

- [ ] **Step 6: No commit needed (verification only)**

---

## Done when

- All 11 tasks committed.
- `pnpm --filter @rural-community-platform/web test` passes (components + integration).
- Manual smoke confirms feed works in both scopes, filters work, pagination works, second-visit navigation is instant with zero Supabase network calls.
- No hydration mismatch warnings in browser console.

## Notes for P1c

P1c will:
1. Add `use-realtime-posts.ts` hook that subscribes to `postgres_changes` on the `posts` table (filtered by `commune_id`) and updates cache via `setQueryData`.
2. Wire the hook into `feed-client.tsx` right after the `useProfile` line.
3. Refactor `createPostAction` + `CreatePostDialog` to drop `revalidatePath("/app/feed")` and replace with `queryClient.invalidateQueries({ queryKey: queryKeys.posts.list(communeId) })` on the client side.
4. Do the same for poll, report, and post-detail actions that currently call `revalidatePath` on feed-related paths.
