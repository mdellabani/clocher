# P1c — `/app/feed` Realtime + Mutation Invalidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Replace the current `router.refresh`-based feed freshness model with a Supabase Realtime → `queryClient.setQueryData` pattern so new/updated/deleted posts appear on the feed without any server round-trip. (2) Remove `revalidatePath("/app/feed")` from server actions and replace with client-side `queryClient.invalidateQueries` to align with the React Query cache model.

**Architecture:** New hook `useRealtimePosts(communeId)` subscribes to `postgres_changes` on the `posts` table filtered by `commune_id`. On INSERT it prepends the new row to the cached list via `setQueryData`, then issues a background `invalidateQueries` to refetch the full row with its joins (profiles, post_images, comment counts). UPDATE patches in place then invalidates. DELETE removes from cache. Mutations (`createPostAction`, etc.) continue to run server-side for auth + RLS + rate limiting; the client awaits the action, then invalidates the relevant query keys instead of relying on `revalidatePath`.

**Tech Stack:** Supabase JS v2 Realtime channels, `@tanstack/react-query` v5, Next.js server actions.

**Spec reference:** `docs/superpowers/specs/2026-04-17-app-client-side-data-design.md` — sections "5 Mutation pattern", "6 Realtime integration".

**Dependencies:** P0 (React Query foundation), P1a (loading.tsx), and P1b (client-side feed migration) must all be merged first. P1c depends on the hook layer and `feed-client.tsx` existing.

**Out of scope for P1c:** Optimistic updates (deferred to a later polish pass). Migration of `/app/posts/[id]` and admin routes (separate phases). Realtime for comments/rsvps/polls (separate hooks, later).

**User-visible outcomes after merge:**
- Another user's new post in your commune appears on your feed within ~1s, without you clicking anything.
- Admin-create-post flow: click Publier → new post appears on feed instantly (invalidate-and-refetch) instead of the ~400ms `revalidatePath` + SSR flash.
- Network tab shows zero full-page refreshes during normal feed activity.

---

## File structure

**Create:**
- `apps/web/src/hooks/use-realtime-posts.ts` — subscribes to `postgres_changes` and updates React Query cache.
- `apps/web/tests/hooks/use-realtime-posts.test.tsx` — component test that fires simulated payload events and asserts cache state.

**Modify:**
- `apps/web/src/app/app/feed/feed-client.tsx` — add `useRealtimePosts(profile.commune_id)` call.
- `apps/web/src/app/app/feed/actions.ts` — remove `revalidatePath("/app/feed")` on both the hidden-post path and the normal success path. Return the created post's id so the client can use it for optimistic/cache updates in the future.
- `apps/web/src/components/create-post-dialog.tsx` — after the action returns, call `queryClient.invalidateQueries` for the feed keys.
- `apps/web/src/app/app/posts/[id]/poll-actions.ts` — audit: drop `revalidatePath("/app/posts")` if present (client invalidates post-detail keys; but since P1c doesn't migrate post-detail yet, **leave these `revalidatePath` calls alone**; the spec deprecates them on a route-by-route basis as routes migrate).
- `apps/web/src/app/app/posts/[id]/report-action.ts`, `apps/web/src/app/app/posts/[id]/actions.ts` — same: leave untouched unless they revalidate `/app/feed` specifically (see Task 3 audit).

**Do not touch in P1c:**
- `apps/web/src/app/[commune-slug]/*` — public routes. Their `revalidatePath` usage in admin actions must stay (they're still SSR).
- `apps/web/src/app/admin/dashboard/*-actions.ts`, `apps/web/src/app/moderation/report-actions.ts` — admin and moderation routes are not migrated yet; their `revalidatePath` calls stay.

---

## Task 1: `useRealtimePosts` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/use-realtime-posts.ts`
- Create: `apps/web/tests/hooks/use-realtime-posts.test.tsx`

**Context:** The hook subscribes once per `communeId`. On INSERT/UPDATE/DELETE, it updates cache via `setQueryData` for both the paginated list (flat append/patch/remove inside the first page) and the pinned list if the event is on a pinned post. It then invalidates to refetch the full row with joins. Cleanup on unmount.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-realtime-posts.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { useRealtimePosts } from "@/hooks/use-realtime-posts";

type Listener = (payload: { eventType: string; new?: unknown; old?: unknown }) => void;
let capturedListener: Listener | null = null;
const removeChannel = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: (_evt: string, _filter: unknown, cb: Listener) => {
        capturedListener = cb;
        return { subscribe: () => ({ unsubscribe: vi.fn() }) };
      },
    }),
    removeChannel,
  }),
}));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const FILTERS = { types: [], dateFilter: "" as const };

function seedInfinite(qc: QueryClient, communeId: string, posts: { id: string }[]) {
  qc.setQueryData(queryKeys.posts.list(communeId, FILTERS), {
    pages: [posts],
    pageParams: [null],
  });
}

describe("useRealtimePosts", () => {
  it("prepends INSERT payload to the cached first page", () => {
    capturedListener = null;
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    seedInfinite(qc, "c-1", [{ id: "p-old" }]);

    renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });
    expect(capturedListener).not.toBeNull();

    act(() => {
      capturedListener!({ eventType: "INSERT", new: { id: "p-new", is_pinned: false } });
    });

    const cached = qc.getQueryData(queryKeys.posts.list("c-1", FILTERS)) as {
      pages: { id: string }[][];
    };
    expect(cached.pages[0][0].id).toBe("p-new");
    expect(cached.pages[0][1].id).toBe("p-old");
  });

  it("patches UPDATE payload in place", () => {
    capturedListener = null;
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    seedInfinite(qc, "c-1", [{ id: "p-1", body: "old" } as unknown as { id: string }]);
    renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });

    act(() => {
      capturedListener!({ eventType: "UPDATE", new: { id: "p-1", body: "new", is_pinned: false } });
    });

    const cached = qc.getQueryData(queryKeys.posts.list("c-1", FILTERS)) as {
      pages: { id: string; body?: string }[][];
    };
    expect(cached.pages[0][0].body).toBe("new");
  });

  it("removes DELETE payload from cache", () => {
    capturedListener = null;
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    seedInfinite(qc, "c-1", [{ id: "p-1" }, { id: "p-2" }]);
    renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });

    act(() => {
      capturedListener!({ eventType: "DELETE", old: { id: "p-1" } });
    });

    const cached = qc.getQueryData(queryKeys.posts.list("c-1", FILTERS)) as {
      pages: { id: string }[][];
    };
    expect(cached.pages[0]).toHaveLength(1);
    expect(cached.pages[0][0].id).toBe("p-2");
  });

  it("calls removeChannel on unmount", () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });
    removeChannel.mockClear();
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });

  it("does nothing when communeId is empty", () => {
    capturedListener = null;
    const qc = new QueryClient();
    renderHook(() => useRealtimePosts("", FILTERS), { wrapper: wrap(qc) });
    expect(capturedListener).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-realtime-posts.test
```

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/hooks/use-realtime-posts.ts`:

```ts
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Post, PostListFilters } from "@rural-community-platform/shared";
import { queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

type InfinitePostsData = { pages: Post[][]; pageParams: (string | null)[] };

function prependToFirstPage(
  data: InfinitePostsData | undefined,
  post: Post,
): InfinitePostsData {
  const firstPage = data?.pages[0] ?? [];
  const rest = data?.pages.slice(1) ?? [];
  return {
    pages: [[post, ...firstPage], ...rest],
    pageParams: data?.pageParams ?? [null],
  };
}

function patchInPlace(
  data: InfinitePostsData | undefined,
  post: Post,
): InfinitePostsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.map((p) => (p.id === post.id ? { ...p, ...post } : p)),
    ),
  };
}

function removeFromPages(
  data: InfinitePostsData | undefined,
  postId: string,
): InfinitePostsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => page.filter((p) => p.id !== postId)),
  };
}

export function useRealtimePosts(communeId: string, filters: PostListFilters) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!communeId) return;
    const supabase = createClient();
    const key = queryKeys.posts.list(communeId, filters);
    const pinnedKey = queryKeys.posts.pinned(communeId);

    const channel = supabase
      .channel(`posts:${communeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `commune_id=eq.${communeId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const inserted = payload.new as Post;
            if (!inserted.is_hidden) {
              if (inserted.is_pinned) {
                qc.setQueryData<Post[]>(pinnedKey, (old = []) => [inserted, ...old]);
              } else {
                qc.setQueryData<InfinitePostsData>(key, (old) => prependToFirstPage(old, inserted));
              }
              qc.invalidateQueries({ queryKey: key });
              qc.invalidateQueries({ queryKey: pinnedKey });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Post;
            qc.setQueryData<InfinitePostsData>(key, (old) => patchInPlace(old, updated));
            qc.setQueryData<Post[]>(pinnedKey, (old = []) =>
              old.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
            );
            qc.invalidateQueries({ queryKey: key });
            qc.invalidateQueries({ queryKey: pinnedKey });
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            qc.setQueryData<InfinitePostsData>(key, (old) => removeFromPages(old, deleted.id));
            qc.setQueryData<Post[]>(pinnedKey, (old = []) => old.filter((p) => p.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communeId, qc, filters]);
}
```

- [ ] **Step 4: Run — expect PASS (5 tests)**

```bash
pnpm --filter @rural-community-platform/web test:components -- use-realtime-posts.test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-realtime-posts.ts \
        apps/web/tests/hooks/use-realtime-posts.test.tsx
git commit -m "feat(web): useRealtimePosts hook — setQueryData + invalidate on postgres_changes"
```

---

## Task 2: Wire `useRealtimePosts` into `feed-client.tsx`

**Files:**
- Modify: `apps/web/src/app/app/feed/feed-client.tsx`

- [ ] **Step 1: Add the import + hook call**

At the top of `feed-client.tsx`, add:

```tsx
import { useRealtimePosts } from "@/hooks/use-realtime-posts";
```

Inside the `FeedClient` function body, right after the existing hook calls (after `useProducerCount`), add:

```tsx
useRealtimePosts(scope === "commune" ? communeId : "", {
  types: selectedTypes,
  dateFilter: (dateFilter || "") as PostListFilters["dateFilter"],
});
```

Note: realtime only runs in commune scope. EPCI scope realtime is out of scope for P1c (would need multi-commune channel).

- [ ] **Step 2: Extend the existing feed-client test**

Open `apps/web/tests/components/feed-client.test.tsx` and add one test asserting that rendering `FeedClient` does not throw when realtime is wired (the mock from Task 1 returns a subscribe-able stub; import and reuse the same mock path). This is a smoke test — realtime behavior is already covered by `use-realtime-posts.test`.

Add to the top of the test file if not already present:

```tsx
vi.mock("@/hooks/use-realtime-posts", () => ({
  useRealtimePosts: vi.fn(),
}));
```

Add test:

```tsx
it("calls useRealtimePosts with the profile's commune id in commune scope", () => {
  const { useRealtimePosts } = require("@/hooks/use-realtime-posts");
  renderWithQuery(<FeedClient userId="u-1" />, {
    cache: [
      { key: queryKeys.profile("u-1"), data: { id: "u-1", commune_id: "c-42", role: "resident", status: "active", display_name: "", communes: { id: "c-42", name: "x", epci_id: null } } },
      { key: queryKeys.posts.pinned("c-42"), data: [] },
      { key: queryKeys.posts.list("c-42", { types: [], dateFilter: "" }), data: { pages: [[]], pageParams: [null] } },
      { key: ["producer-count", "c-42"], data: 0 },
    ],
  });
  expect(useRealtimePosts).toHaveBeenCalledWith("c-42", expect.objectContaining({ types: [], dateFilter: "" }));
});
```

- [ ] **Step 3: Run feed-client tests**

```bash
pnpm --filter @rural-community-platform/web test:components -- feed-client.test
```

Expected: all green (previous tests + 1 new).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/feed/feed-client.tsx \
        apps/web/tests/components/feed-client.test.tsx
git commit -m "feat(web): wire realtime posts hook into feed-client"
```

---

## Task 3: Audit & drop feed-specific `revalidatePath` calls

**Files:** grep first, then edit what's found.

- [ ] **Step 1: Audit**

```bash
grep -rn "revalidatePath" apps/web/src/app/app/feed/ apps/web/src/app/app/posts/ apps/web/src/components/create-post-dialog.tsx
```

Expected hits (from our earlier survey):
- `apps/web/src/app/app/feed/actions.ts:140` — `revalidatePath("/app/feed");` (hidden-post path)
- `apps/web/src/app/app/feed/actions.ts:184` — `revalidatePath("/app/feed");` (success path)

Post-related (`/app/posts/[id]/...`) revalidate paths are NOT feed paths — leave them alone (post-detail route is not migrated yet).

- [ ] **Step 2: Remove the two feed-only calls**

Edit `apps/web/src/app/app/feed/actions.ts`. Delete line 140 (`revalidatePath("/app/feed");`) in the hidden-post branch. Delete line 184 (`revalidatePath("/app/feed");`) at the end of the success path. Also remove the now-unused import `import { revalidatePath } from "next/cache";` at the top of the file.

After this change, the file should no longer reference `revalidatePath` anywhere.

- [ ] **Step 3: Add the post id to the return shape** so the client can consume it for future cache-patch optimizations

Change both success returns:

```ts
// hidden path
return { error: null, warning: "Votre publication est en cours de vérification.", postId: post.id };

// normal success path
return { error: null, warning: undefined, postId: post.id };
```

Also update the early-return error cases to include `postId: null` in the shape — or declare a discriminated union return type at the top of the file. Prefer the latter:

```ts
type CreatePostResult =
  | { error: string; warning?: undefined; postId?: undefined }
  | { error: null; warning?: string; postId: string };
```

And annotate `createPostAction` return type accordingly.

- [ ] **Step 4: Run integration tests to confirm the action still works end-to-end**

```bash
pnpm --filter @rural-community-platform/web test:integration
```

Expected: all green. If any test asserts the shape of the returned object, update it to the new shape.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/feed/actions.ts
git commit -m "refactor(web): drop revalidatePath from createPostAction; return postId"
```

---

## Task 4: Wire `invalidateQueries` in `CreatePostDialog`

**Files:**
- Modify: `apps/web/src/components/create-post-dialog.tsx`

**Context:** After `createPostAction` resolves successfully, tell React Query to refetch the feed keys. Realtime would also eventually catch it, but we don't want to depend on realtime latency for the user's own action.

- [ ] **Step 1: Add imports**

At the top of `create-post-dialog.tsx`, add:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
```

- [ ] **Step 2: Get the query client + the user's commune**

Inside the component body:

```tsx
const qc = useQueryClient();
```

The dialog needs `communeId` to invalidate the right key. Two options: (a) pass it as a prop from `feed-client`, or (b) read from the profile cache. Prefer (a) — explicit contract.

Modify the component's prop type to include `communeId: string`:

```tsx
interface CreatePostDialogProps {
  isAdmin: boolean;
  communeId: string;
}
```

And update all call sites of `<CreatePostDialog isAdmin={...} />` to pass `communeId={profile.commune_id}`. The one location is `feed-client.tsx` (line rendering `<CreatePostDialog isAdmin={profile.role === "admin"} />`). Update to:

```tsx
<CreatePostDialog isAdmin={profile.role === "admin"} communeId={profile.commune_id} />
```

- [ ] **Step 3: Invalidate after a successful action**

In the submit handler (wherever `createPostAction` is awaited), after the success branch:

```tsx
const result = await createPostAction(formData);
if (result.error) {
  // existing error handling
} else {
  await qc.invalidateQueries({ queryKey: ["posts", communeId] }); // partial match → list + pinned + detail for this commune
  // existing success handling (close dialog, show toast, etc.)
}
```

The partial-match query key `["posts", communeId]` invalidates any key starting with those two entries, including `queryKeys.posts.list(communeId, anyFilters)` and `queryKeys.posts.pinned(communeId)`. This is the reason the query-key registry was designed hierarchically in P0.

- [ ] **Step 4: Update any existing component tests for `CreatePostDialog`** to pass the new `communeId` prop.

```bash
grep -rln "CreatePostDialog" apps/web/tests/
```

Update each to include `communeId="c-1"` (or similar).

- [ ] **Step 5: Run component tests**

```bash
pnpm --filter @rural-community-platform/web test:components
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/create-post-dialog.tsx \
        apps/web/src/app/app/feed/feed-client.tsx \
        apps/web/tests/components/*.test.tsx
git commit -m "feat(web): CreatePostDialog invalidates feed keys after action"
```

---

## Task 5: Full verification + manual smoke

**Files:** none modified.

- [ ] **Step 1: Component suite**

```bash
pnpm --filter @rural-community-platform/web test:components
```

Expected: prior ~56 + 5 new realtime tests + 1 new feed-client test = ~62 tests, all green.

- [ ] **Step 2: Integration suite**

```bash
pnpm --filter @rural-community-platform/web test:integration
```

Expected: all green (schema untouched; only app-layer changes).

- [ ] **Step 3: Typecheck + build**

```bash
pnpm --filter @rural-community-platform/web typecheck && \
pnpm --filter @rural-community-platform/web build
```

- [ ] **Step 4: Manual smoke — two-browser test**

```bash
pnpm --filter @rural-community-platform/web dev
```

In two browser windows (or two profiles), log in as two users in the same commune. Window A is viewing `/app/feed`.

1. **Realtime INSERT:** Window B creates a new post via the dialog. In Window A, the new post should appear at the top of the feed within ~1–2s, without Window A refreshing.
2. **Realtime UPDATE:** Window B pins a post (if admin) or edits comment counts by commenting. Window A's feed reflects the change within a few seconds.
3. **Realtime DELETE:** Window B deletes a post (if allowed). Window A's feed removes it.
4. **Self-create:** Window A creates a post. The dialog closes; the new post appears on Window A's feed **before** the realtime event fires — because the client's own `invalidateQueries` refetches immediately. Confirm there's no duplicate rendering.
5. **Network tab:** during normal idle, there should be no polling. Realtime is a WebSocket connection; check `wss://...supabase.co/realtime/...` is open and no REST `/rest/v1/posts` calls fire except on explicit action.

- [ ] **Step 5: Console check — no hydration or realtime errors**

Watch for:
- "supabase realtime: channel error" — usually means the Realtime replication isn't enabled for the table. Fix by running the Realtime-enable SQL locally: `ALTER PUBLICATION supabase_realtime ADD TABLE posts;` (or verifying it's already in the publication).
- "[React Query] devtools: QueryClient not found" — means `QueryProvider` isn't in the tree on some route. Should not occur since P0 wraps `/app` layout.

- [ ] **Step 6: No commit needed**

---

## Done when

- All 5 tasks committed.
- Component + integration suites green.
- Two-browser smoke confirms realtime INSERT/UPDATE/DELETE flow.
- Self-create flow: dialog → invalidate → post appears instantly on same window.
- Zero polling; realtime WebSocket observed in network tab.

## Notes for future work

- **Realtime for EPCI scope:** would need a single channel subscribed to all communes in the user's EPCI. Deferred — EPCI posting is low-volume and acceptable to rely on manual refresh for now.
- **Realtime for comments/rsvps/polls:** follow the same pattern, hook per domain. Wire into the post-detail page when that page is migrated.
- **Optimistic updates for RSVP / poll vote:** high-frequency clicks where invalidate-and-refetch has perceptible latency. Polish pass.
- **Realtime presence:** Supabase `presence` channels can show "X online now" on the feed. Out of scope.
- **Connection limit:** free-tier Supabase caps concurrent Realtime connections at 200. Monitor in the dashboard as user base grows; above 150 concurrent, plan a multiplexing strategy (single channel per commune instead of per user).
