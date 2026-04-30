# P4 — Post Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate `/app/posts/[id]` to the thin-shell + React Query pattern. This is the most interactive page in `/app/*` — it hosts comments, RSVPs, polls, delete, and reports. Every mutation currently hits `revalidatePath`, which round-trips the full page (auth + profile + post + comments + rsvps + poll = 6 queries) just to refresh one section. After P4, each mutation updates exactly the cache entry it touches, with optional realtime for comments so multiple viewers see updates without refetch.

**Architecture:** Same thin-shell pattern as P1b/P2/P3. Server `page.tsx` auth-guards + prefetches four queries (`posts.detail`, `comments`, `rsvps`, `poll`) into `HydrationBoundary`, then renders `PostDetailClient`. The client consumes four hooks, owns all interactive children, and invalidates precisely the affected keys after each server action. `useRealtimeComments` subscribes to `postgres_changes` on `comments` filtered by `post_id` and patches the `comments` cache entry in place.

**Tech Stack:** Next.js 16 App Router, React 19, `@tanstack/react-query` ^5.62.0, Supabase Realtime.

**Spec reference:** `docs/superpowers/specs/2026-04-17-app-client-side-data-design.md` — phase P4.

**Dependencies:** P0, P1 (a/b/c), P2, P3 merged.

**Out of scope for P4:** `/admin/*` (P5), optimistic updates for RSVP/poll (P6), mobile migration, changes to comment schema, changes to the poll voting algorithm, changes to report categories, threaded replies.

**User-visible outcome:** Opening a post from the feed is instant (uses the cached post from the feed's infinite list when available, otherwise shows a skeleton). Commenting feels immediate — form clears, new comment appears without a full-page reload. RSVP toggling updates the button state and count without a white flash. Poll voting updates the bar without refetching the post, author, or comments. Deleting a post navigates away to `/app/feed` and the feed no longer shows the deleted row (realtime from P1c already handles the cache invalidation). Multiple viewers of the same post see new comments within a second without refreshing.

---

## File structure

**Create:**
- `apps/web/src/hooks/queries/use-post-detail.ts` + test
- `apps/web/src/hooks/queries/use-comments.ts` + test
- `apps/web/src/hooks/queries/use-rsvps.ts` + test
- `apps/web/src/hooks/queries/use-poll.ts` + test
- `apps/web/src/hooks/use-realtime-comments.ts` + test
- `apps/web/src/app/app/posts/[id]/loading.tsx`
- `apps/web/src/app/app/posts/[id]/post-detail-client.tsx` — consumes hooks, renders header/body/images/event block/rsvp/poll/comments
- `apps/web/tests/components/post-detail-client.test.tsx`

**Modify:**
- `apps/web/src/app/app/posts/[id]/page.tsx` — thin-shell refactor (auth-guard + prefetch + HydrationBoundary only)
- `apps/web/src/app/app/posts/[id]/actions.ts` — drop every `revalidatePath(`/app/posts/${postId}`)`; keep `redirect("/app/feed")` in `deletePostAction`
- `apps/web/src/app/app/posts/[id]/poll-actions.ts` — drop `revalidatePath("/app/posts")` from both actions
- `apps/web/src/app/app/posts/[id]/report-action.ts` — drop `revalidatePath("/app/feed")` (feed already uses invalidate + realtime; the revalidate does nothing useful)
- `apps/web/src/components/comment-section.tsx` — drop prop `comments`, consume `useComments(postId)` instead; call `qc.invalidateQueries({ queryKey: queryKeys.comments(postId) })` after add/delete
- `apps/web/src/components/rsvp-buttons.tsx` — drop props `currentStatus`/`counts`, consume `useRsvps(postId)` + derive both; invalidate `queryKeys.rsvps(postId)` after set/remove
- `apps/web/src/components/poll-display.tsx` — drop prop `poll`, consume `usePoll(postId)`; invalidate `queryKeys.poll(postId)` after vote/remove
- `apps/web/src/components/delete-post-button.tsx` — take `communeId` prop; after `deletePostAction` succeeds (server action itself redirects, but we still want the feed cache cleared); call `qc.invalidateQueries({ queryKey: ["posts", communeId] })` + pinned key before the server redirect runs. Since `deletePostAction` uses `redirect()`, the client code after the `await` won't run — so instead we let feed realtime handle the cache cleanup (DELETE event already wired in P1c). No client change needed beyond keeping the existing button.
- `apps/web/src/components/report-dialog.tsx` — no cache change (reports don't affect any cached query that the reporter sees). Drop the `revalidatePath` side in the action and do nothing on the client.

**Delete:** nothing.

**Do not touch in P4:**
- `/admin/*` — P5.
- Post card on the feed — it already uses infinite query cache; clicking a post into `/app/posts/[id]` benefits from the feed cache via `initialData` wiring inside `usePostDetail` (see Task 1).

---

## Query key usage in P4

All keys already declared in `packages/shared/src/query-keys.ts`:

| Hook            | Key                                  |
| --------------- | ------------------------------------ |
| usePostDetail   | `queryKeys.posts.detail(postId)`     |
| useComments     | `queryKeys.comments(postId)`         |
| useRsvps        | `queryKeys.rsvps(postId)`            |
| usePoll         | `queryKeys.poll(postId)`             |

No additions to the registry.

---

## Task 1: `usePostDetail` hook

**Files:**
- Create: `apps/web/src/hooks/queries/use-post-detail.ts`
- Create: `apps/web/tests/hooks/use-post-detail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-post-detail.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { usePostDetail } from "@/hooks/queries/use-post-detail";

const singleMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: singleMock }),
      }),
    }),
  }),
}));

describe("usePostDetail", () => {
  beforeEach(() => singleMock.mockReset());

  it("reads from cache when posts.detail is seeded", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.detail("p1"), { id: "p1", title: "X" });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePostDetail("p1"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ id: "p1", title: "X" }));
    expect(singleMock).not.toHaveBeenCalled();
  });

  it("fetches when cache is empty", async () => {
    singleMock.mockResolvedValue({ data: { id: "p2", title: "Fresh" }, error: null });
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePostDetail("p2"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ id: "p2", title: "Fresh" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pretou/web test use-post-detail`
Expected: FAIL with module not found on `@/hooks/queries/use-post-detail`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/hooks/queries/use-post-detail.ts
import { useQuery } from "@tanstack/react-query";
import { getPostById, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePostDetail(postId: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPostById(supabase, postId);
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pretou/web test use-post-detail`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-post-detail.ts apps/web/tests/hooks/use-post-detail.test.tsx
git commit -m "feat(web): usePostDetail hook"
```

---

## Task 2: `useComments` hook

**Files:**
- Create: `apps/web/src/hooks/queries/use-comments.ts`
- Create: `apps/web/tests/hooks/use-comments.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-comments.test.tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useComments } from "@/hooks/queries/use-comments";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  }),
}));

describe("useComments", () => {
  it("reads from cache when seeded", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const seeded = [{ id: "c1", body: "hi" }];
    qc.setQueryData(queryKeys.comments("p1"), seeded);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useComments("p1"), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(seeded));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pretou/web test use-comments`
Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/hooks/queries/use-comments.ts
import { useQuery } from "@tanstack/react-query";
import { getComments, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getComments(supabase, postId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!postId,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pretou/web test use-comments`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-comments.ts apps/web/tests/hooks/use-comments.test.tsx
git commit -m "feat(web): useComments hook"
```

---

## Task 3: `useRsvps` hook

`getRsvps` returns all rows, so the hook normalizes them into `{ counts: {going, maybe, not_going}, myStatus: RsvpStatus | null }` once, given the current user id.

**Files:**
- Create: `apps/web/src/hooks/queries/use-rsvps.ts`
- Create: `apps/web/tests/hooks/use-rsvps.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-rsvps.test.tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useRsvps } from "@/hooks/queries/use-rsvps";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
  }),
}));

describe("useRsvps", () => {
  it("derives counts + myStatus from cached rows", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.rsvps("p1"), [
      { user_id: "me", status: "going" },
      { user_id: "other1", status: "going" },
      { user_id: "other2", status: "maybe" },
    ]);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRsvps("p1", "me"), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.counts).toEqual({ going: 2, maybe: 1, not_going: 0 });
      expect(result.current.data?.myStatus).toBe("going");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pretou/web test use-rsvps`
Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/hooks/queries/use-rsvps.ts
import { useQuery } from "@tanstack/react-query";
import { getRsvps, queryKeys } from "@pretou/shared";
import type { RsvpStatus } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

type RsvpRow = { user_id: string; status: RsvpStatus };
type Derived = {
  counts: { going: number; maybe: number; not_going: number };
  myStatus: RsvpStatus | null;
  rows: RsvpRow[];
};

export function useRsvps(postId: string, userId: string) {
  return useQuery<RsvpRow[], Error, Derived>({
    queryKey: queryKeys.rsvps(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getRsvps(supabase, postId);
      if (error) throw error;
      return (data ?? []) as RsvpRow[];
    },
    enabled: !!postId && !!userId,
    select: (rows) => ({
      rows,
      counts: {
        going: rows.filter((r) => r.status === "going").length,
        maybe: rows.filter((r) => r.status === "maybe").length,
        not_going: rows.filter((r) => r.status === "not_going").length,
      },
      myStatus: (rows.find((r) => r.user_id === userId)?.status ?? null) as RsvpStatus | null,
    }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pretou/web test use-rsvps`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-rsvps.ts apps/web/tests/hooks/use-rsvps.test.tsx
git commit -m "feat(web): useRsvps hook with derived counts + myStatus"
```

---

## Task 4: `usePoll` hook

**Files:**
- Create: `apps/web/src/hooks/queries/use-poll.ts`
- Create: `apps/web/tests/hooks/use-poll.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-poll.test.tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { usePoll } from "@/hooks/queries/use-poll";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    }),
  }),
}));

describe("usePoll", () => {
  it("returns null when no poll exists and cache is empty", async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePoll("p1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("reads cached poll", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const poll = { id: "poll1", question: "?", poll_type: "vote", allow_multiple: false, poll_options: [] };
    qc.setQueryData(queryKeys.poll("p1"), poll);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePoll("p1"), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(poll));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pretou/web test use-poll`
Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/hooks/queries/use-poll.ts
import { useQuery } from "@tanstack/react-query";
import { getPollByPostId, queryKeys } from "@pretou/shared";
import type { Poll } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePoll(postId: string) {
  return useQuery<Poll | null>({
    queryKey: queryKeys.poll(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPollByPostId(supabase, postId);
      if (error) throw error;
      return (data ?? null) as Poll | null;
    },
    enabled: !!postId,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pretou/web test use-poll`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-poll.ts apps/web/tests/hooks/use-poll.test.tsx
git commit -m "feat(web): usePoll hook"
```

---

## Task 5: `useRealtimeComments` hook

Mirrors `useRealtimePosts` (P1c): INSERT prepends, UPDATE patches, DELETE removes — all via `setQueryData` on `queryKeys.comments(postId)`.

**Files:**
- Create: `apps/web/src/hooks/use-realtime-comments.ts`
- Create: `apps/web/tests/hooks/use-realtime-comments.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-realtime-comments.test.tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useRealtimeComments } from "@/hooks/use-realtime-comments";

type Handler = (payload: { eventType: string; new?: unknown; old?: unknown }) => void;
let capturedHandler: Handler | null = null;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: (_event: string, _filter: unknown, h: Handler) => {
        capturedHandler = h;
        return { subscribe: () => ({}) };
      },
    }),
    removeChannel: () => undefined,
  }),
}));

describe("useRealtimeComments", () => {
  it("prepends on INSERT", () => {
    capturedHandler = null;
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.comments("p1"), [{ id: "c0", body: "old" }]);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    renderHook(() => useRealtimeComments("p1"), { wrapper });
    act(() => {
      capturedHandler?.({ eventType: "INSERT", new: { id: "c1", body: "new" } });
    });
    expect(qc.getQueryData(queryKeys.comments("p1"))).toEqual([
      { id: "c1", body: "new" },
      { id: "c0", body: "old" },
    ]);
  });

  it("removes on DELETE", () => {
    capturedHandler = null;
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.comments("p1"), [{ id: "c0" }, { id: "c1" }]);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    renderHook(() => useRealtimeComments("p1"), { wrapper });
    act(() => {
      capturedHandler?.({ eventType: "DELETE", old: { id: "c0" } });
    });
    expect(qc.getQueryData(queryKeys.comments("p1"))).toEqual([{ id: "c1" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pretou/web test use-realtime-comments`
Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/hooks/use-realtime-comments.ts
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

type Comment = { id: string; [k: string]: unknown };

export function useRealtimeComments(postId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!postId) return;
    const supabase = createClient();
    const key = queryKeys.comments(postId);

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const c = payload.new as Comment;
            qc.setQueryData<Comment[]>(key, (old = []) => [c, ...old]);
            qc.invalidateQueries({ queryKey: key });
          } else if (payload.eventType === "UPDATE") {
            const c = payload.new as Comment;
            qc.setQueryData<Comment[]>(key, (old = []) =>
              old.map((x) => (x.id === c.id ? { ...x, ...c } : x)),
            );
          } else if (payload.eventType === "DELETE") {
            const c = payload.old as { id: string };
            qc.setQueryData<Comment[]>(key, (old = []) => old.filter((x) => x.id !== c.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, qc]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pretou/web test use-realtime-comments`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-realtime-comments.ts apps/web/tests/hooks/use-realtime-comments.test.tsx
git commit -m "feat(web): useRealtimeComments for /app/posts/[id]"
```

---

## Task 6: Loading skeleton

Matches the post-detail layout (card with header, body, optional event block, comment list of 3 placeholders).

**Files:**
- Create: `apps/web/src/app/app/posts/[id]/loading.tsx`

- [ ] **Step 1: Write the file**

```tsx
// apps/web/src/app/app/posts/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-pulse">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-5 w-20 rounded bg-gray-200" />
        <div className="h-7 w-3/4 rounded bg-gray-200" />
        <div className="flex gap-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-gray-200" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/app/posts/[id]/loading.tsx
git commit -m "feat(web): post-detail loading skeleton"
```

---

## Task 7: Drop `revalidatePath` from post-detail actions

Strips `revalidatePath` from the three action files. The client invalidation added in the next tasks takes over.

**Files:**
- Modify: `apps/web/src/app/app/posts/[id]/actions.ts`
- Modify: `apps/web/src/app/app/posts/[id]/poll-actions.ts`
- Modify: `apps/web/src/app/app/posts/[id]/report-action.ts`

- [ ] **Step 1: Edit `actions.ts`**

Drop the `revalidatePath` import and every call to it. Keep `redirect("/app/feed")` in `deletePostAction`. Expected final:

```ts
// apps/web/src/app/app/posts/[id]/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createComment,
  deleteComment,
  deletePost,
  setRsvp,
  removeRsvp,
  createCommentSchema,
} from "@pretou/shared";
import type { RsvpStatus } from "@pretou/shared";
import { redirect } from "next/navigation";

export async function addCommentAction(postId: string, body: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const parsed = createCommentSchema.safeParse({ body });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { error } = await createComment(supabase, postId, user.id, parsed.data.body);
  if (error) return { error: "Erreur lors de l'ajout du commentaire" };
  return { error: null };
}

export async function deleteCommentAction(commentId: string, _postId: string) {
  const supabase = await createClient();
  const { error } = await deleteComment(supabase, commentId);
  if (error) return { error: "Erreur lors de la suppression" };
  return { error: null };
}

export async function setRsvpAction(postId: string, status: "going" | "maybe" | "not_going") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await setRsvp(supabase, postId, user.id, status as RsvpStatus);
  if (error) return { error: "Erreur lors de l'enregistrement" };
  return { error: null };
}

export async function deletePostAction(postId: string) {
  const supabase = await createClient();
  const { error } = await deletePost(supabase, postId);
  if (error) return { error: "Erreur lors de la suppression" };
  redirect("/app/feed");
}

export async function removeRsvpAction(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await removeRsvp(supabase, postId, user.id);
  if (error) return { error: "Erreur" };
  return { error: null };
}
```

- [ ] **Step 2: Edit `poll-actions.ts`**

Drop the `revalidatePath` import and both calls. Result:

```ts
// apps/web/src/app/app/posts/[id]/poll-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function voteAction(optionId: string, pollId: string, allowMultiple: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!allowMultiple) {
    const { data: options } = await supabase
      .from("poll_options")
      .select("id")
      .eq("poll_id", pollId);

    if (options && options.length > 0) {
      await supabase
        .from("poll_votes")
        .delete()
        .in("poll_option_id", options.map((o) => o.id))
        .eq("user_id", user.id);
    }
  }

  const { error } = await supabase
    .from("poll_votes")
    .upsert({ poll_option_id: optionId, user_id: user.id });
  if (error) return { error: "Erreur lors du vote" };
  return { error: null };
}

export async function removeVoteAction(optionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await supabase
    .from("poll_votes")
    .delete()
    .eq("poll_option_id", optionId)
    .eq("user_id", user.id);
  if (error) return { error: "Erreur lors du suppression du vote" };
  return { error: null };
}
```

- [ ] **Step 3: Edit `report-action.ts`**

Drop the `revalidatePath` import and the call. No other changes.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/posts/[id]/actions.ts apps/web/src/app/app/posts/[id]/poll-actions.ts apps/web/src/app/app/posts/[id]/report-action.ts
git commit -m "refactor(web): drop revalidatePath from post-detail actions"
```

---

## Task 8: `CommentSection` consumes `useComments` + invalidates on mutation

Removes the `comments` prop; the component becomes self-sufficient given `postId`, `currentUserId`, `isAdmin`.

**Files:**
- Modify: `apps/web/src/components/comment-section.tsx`
- Create: `apps/web/tests/components/comment-section.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/components/comment-section.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { CommentSection } from "@/components/comment-section";

const addCommentMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/app/app/posts/[id]/actions", () => ({
  addCommentAction: (...args: unknown[]) => addCommentMock(...args),
  deleteCommentAction: vi.fn().mockResolvedValue({ error: null }),
}));

describe("CommentSection", () => {
  it("renders from cache and invalidates after submit", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.comments("p1"), [
      { id: "c1", body: "first", created_at: new Date().toISOString(), author_id: "a", profiles: { display_name: "A", avatar_url: null } },
    ]);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    render(
      <QueryClientProvider client={qc}>
        <CommentSection postId="p1" currentUserId="me" isAdmin={false} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("first")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/commentaire/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /commenter/i }));

    await waitFor(() => {
      expect(addCommentMock).toHaveBeenCalledWith("p1", "hello");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.comments("p1") });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pretou/web test comment-section`
Expected: FAIL — component still takes `comments` prop.

- [ ] **Step 3: Rewrite the component**

```tsx
// apps/web/src/components/comment-section.tsx
"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  addCommentAction,
  deleteCommentAction,
} from "@/app/app/posts/[id]/actions";
import { useComments } from "@/hooks/queries/use-comments";

interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function CommentSection({ postId, currentUserId, isAdmin }: CommentSectionProps) {
  const qc = useQueryClient();
  const { data: comments = [] } = useComments(postId);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(postId, body);
      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
        qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      }
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const result = await deleteCommentAction(commentId, postId);
      if (!result.error) {
        qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Commentaires ({comments.length})
      </h2>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun commentaire pour le moment.
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {comment.profiles?.display_name ?? "Utilisateur"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.body}</p>
                  </div>
                  {(comment.author_id === currentUserId || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(comment.id)}
                      disabled={isPending}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Écrire un commentaire..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          disabled={isPending}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending || body.trim().length === 0}>
          {isPending ? "Envoi..." : "Commenter"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pretou/web test comment-section`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/comment-section.tsx apps/web/tests/components/comment-section.test.tsx
git commit -m "refactor(web): CommentSection uses useComments + invalidate"
```

---

## Task 9: `RsvpButtons` consumes `useRsvps` + invalidates on mutation

Removes the `currentStatus` and `counts` props. Takes `userId` instead.

**Files:**
- Modify: `apps/web/src/components/rsvp-buttons.tsx`

- [ ] **Step 1: Rewrite the component**

```tsx
// apps/web/src/components/rsvp-buttons.tsx
"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { Button } from "@/components/ui/button";
import { setRsvpAction, removeRsvpAction } from "@/app/app/posts/[id]/actions";
import type { RsvpStatus } from "@pretou/shared";
import { useRsvps } from "@/hooks/queries/use-rsvps";

interface RsvpButtonsProps {
  postId: string;
  userId: string;
}

const OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: "going", label: "J'y vais" },
  { status: "maybe", label: "Peut-être" },
  { status: "not_going", label: "Pas dispo" },
];

export function RsvpButtons({ postId, userId }: RsvpButtonsProps) {
  const qc = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const { data } = useRsvps(postId, userId);
  const counts = data?.counts ?? { going: 0, maybe: 0, not_going: 0 };
  const currentStatus = data?.myStatus ?? null;

  function handleClick(status: RsvpStatus) {
    startTransition(async () => {
      const result =
        currentStatus === status
          ? await removeRsvpAction(postId)
          : await setRsvpAction(postId, status);
      if (!result.error) {
        qc.invalidateQueries({ queryKey: queryKeys.rsvps(postId) });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map(({ status, label }) => {
        const isActive = currentStatus === status;
        const count = counts[status];
        return (
          <Button
            key={status}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleClick(status)}
            disabled={isPending}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-xs font-medium">
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: fails with callers passing removed props — they are fixed in Task 12 when the page rewires.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/rsvp-buttons.tsx
git commit -m "refactor(web): RsvpButtons uses useRsvps + invalidate"
```

---

## Task 10: `PollDisplay` consumes `usePoll` + invalidates on mutation

Removes the `poll` prop. Takes `postId` + `userId` only. Returns `null` while loading or when no poll exists.

**Files:**
- Modify: `apps/web/src/components/poll-display.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the top of the file and update every call to `voteAction`/`removeVoteAction` to invalidate the cache. Keep the visual logic identical. Final prop shape: `{ postId: string; userId: string }`.

```tsx
// apps/web/src/components/poll-display.tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { voteAction, removeVoteAction } from "@/app/app/posts/[id]/poll-actions";
import { usePoll } from "@/hooks/queries/use-poll";

interface PollDisplayProps {
  postId: string;
  userId: string;
}

export function PollDisplay({ postId, userId }: PollDisplayProps) {
  const qc = useQueryClient();
  const { data: poll } = usePoll(postId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!poll) return null;

  const userVotes = new Set(
    poll.poll_options.flatMap((opt) =>
      (opt.poll_votes ?? [])
        .filter((v) => v.user_id === userId)
        .map(() => opt.id),
    ),
  );

  const handleVote = async (optionId: string) => {
    setIsLoading(true);
    setError(null);

    const isAlreadyVoted = userVotes.has(optionId);
    let result: { error: string | null } = { error: null };
    if (isAlreadyVoted && poll.allow_multiple) {
      result = await removeVoteAction(optionId);
    } else if (!isAlreadyVoted) {
      result = await voteAction(optionId, poll.id, poll.allow_multiple);
    }

    if (result.error) {
      setError(result.error);
    } else {
      qc.invalidateQueries({ queryKey: queryKeys.poll(postId) });
    }
    setIsLoading(false);
  };

  if (poll.poll_type === "participation") {
    return (
      <div className="space-y-3 rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
        <p className="text-sm font-medium">{poll.question}</p>
        <div className="grid grid-cols-3 gap-2">
          {poll.poll_options.map((option) => {
            const voteCount = option.poll_votes?.length ?? 0;
            const isSelected = userVotes.has(option.id);
            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={isLoading}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border border-blue-500 bg-blue-50 text-blue-900"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                <span className="line-clamp-2 text-center">{option.label}</span>
                {voteCount > 0 && (
                  <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    {voteCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const totalVotes = poll.poll_options.reduce(
    (sum, opt) => sum + (opt.poll_votes?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-3 rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <p className="text-sm font-medium">{poll.question}</p>
      <div className="space-y-3">
        {poll.poll_options.map((option) => {
          const voteCount = option.poll_votes?.length ?? 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = userVotes.has(option.id);
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isLoading}
              className="group w-full text-left"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    {isSelected && <span className="text-lg">✓</span>}
                  </div>
                  <div className="text-xs font-medium text-gray-600">
                    <span>{percentage > 0 ? percentage.toFixed(0) : 0}%</span>
                    <span className="ml-2">({voteCount})</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isSelected ? "bg-blue-500" : "bg-gray-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/poll-display.tsx
git commit -m "refactor(web): PollDisplay uses usePoll + invalidate"
```

---

## Task 11: Thin-shell `page.tsx` + `post-detail-client.tsx`

Splits the current 156-line server component into a tiny server shell + a client component that owns all interactive children. Prefetches four queries and seeds the profile.

**Files:**
- Modify: `apps/web/src/app/app/posts/[id]/page.tsx`
- Create: `apps/web/src/app/app/posts/[id]/post-detail-client.tsx`
- Create: `apps/web/tests/components/post-detail-client.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/components/post-detail-client.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { PostDetailClient } from "@/app/app/posts/[id]/post-detail-client";

vi.mock("@/hooks/use-realtime-comments", () => ({ useRealtimeComments: () => undefined }));
vi.mock("@/components/rsvp-buttons", () => ({ RsvpButtons: () => <div>RSVP</div> }));
vi.mock("@/components/poll-display", () => ({ PollDisplay: () => <div>POLL</div> }));
vi.mock("@/components/comment-section", () => ({ CommentSection: () => <div>COMMENTS</div> }));
vi.mock("@/components/delete-post-button", () => ({ DeletePostButton: () => <div>DELETE</div> }));

describe("PostDetailClient", () => {
  it("renders post from cache", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.detail("p1"), {
      id: "p1",
      title: "Hello",
      body: "Body text",
      type: "discussion",
      created_at: new Date().toISOString(),
      author_id: "a1",
      is_pinned: false,
      profiles: { display_name: "Alice", avatar_url: null },
      post_images: [],
    });
    render(
      <QueryClientProvider client={qc}>
        <PostDetailClient postId="p1" userId="me" userRole="resident" />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
    expect(screen.getByText("COMMENTS")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pretou/web test post-detail-client`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `post-detail-client.tsx`**

```tsx
// apps/web/src/app/app/posts/[id]/post-detail-client.tsx
"use client";

import { notFound } from "next/navigation";
import type { PostType } from "@pretou/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PostTypeBadge } from "@/components/post-type-badge";
import { CommentSection } from "@/components/comment-section";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { DeletePostButton } from "@/components/delete-post-button";
import { PollDisplay } from "@/components/poll-display";
import { usePostDetail } from "@/hooks/queries/use-post-detail";
import { useRealtimeComments } from "@/hooks/use-realtime-comments";

interface PostDetailClientProps {
  postId: string;
  userId: string;
  userRole: string;
}

export function PostDetailClient({ postId, userId, userRole }: PostDetailClientProps) {
  const { data: post, isLoading } = usePostDetail(postId);
  useRealtimeComments(postId);

  if (isLoading && !post) return null;
  if (!post) {
    notFound();
  }

  const isEvent = post.type === "evenement";
  const canDelete = post.author_id === userId || userRole === "admin";
  const images = (post.post_images ?? []) as { id: string; storage_path: string }[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-2">
            <PostTypeBadge type={post.type as PostType} />
            {post.is_pinned && (
              <span className="text-xs font-medium text-amber-600">Épinglé</span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{post.profiles?.display_name ?? "Anonyme"}</span>
              <span>
                {new Date(post.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {canDelete && <DeletePostButton postId={postId} />}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>

          {images.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {images.map((img) => (
                <img
                  key={img.id}
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${img.storage_path}`}
                  alt=""
                  className="rounded-md object-cover w-full max-h-64"
                />
              ))}
            </div>
          )}

          {isEvent && (
            <div className="rounded-md border p-3 space-y-1 text-sm">
              {post.event_date && (
                <div className="flex gap-2">
                  <span className="font-medium text-muted-foreground">Date :</span>
                  <span>
                    {new Date(post.event_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {post.event_location && (
                <div className="flex gap-2">
                  <span className="font-medium text-muted-foreground">Lieu :</span>
                  <span>{post.event_location}</span>
                </div>
              )}
            </div>
          )}

          {isEvent && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Votre disponibilité :</p>
              <RsvpButtons postId={postId} userId={userId} />
            </div>
          )}

          <PollDisplay postId={postId} userId={userId} />
        </CardContent>
      </Card>

      <CommentSection
        postId={postId}
        currentUserId={userId}
        isAdmin={userRole === "admin"}
      />
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `page.tsx` as a thin shell**

```tsx
// apps/web/src/app/app/posts/[id]/page.tsx
import { redirect } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  getPostById,
  getComments,
  getRsvps,
  getProfile,
  getPollByPostId,
  queryKeys,
} from "@pretou/shared";
import { createClient } from "@/lib/supabase/server";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { PostDetailClient } from "./post-detail-client";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await Promise.all([
      qc.prefetchQuery({
        queryKey: queryKeys.posts.detail(id),
        queryFn: async () => {
          const { data } = await getPostById(supabase, id);
          return data;
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.comments(id),
        queryFn: async () => {
          const { data } = await getComments(supabase, id);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.rsvps(id),
        queryFn: async () => {
          const { data } = await getRsvps(supabase, id);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.poll(id),
        queryFn: async () => {
          const { data } = await getPollByPostId(supabase, id);
          return data ?? null;
        },
      }),
    ]);
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <PostDetailClient postId={id} userId={user.id} userRole={profile.role} />
    </HydrationBoundary>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @pretou/web test post-detail-client`
Expected: 1 passing.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/app/posts/[id]/page.tsx apps/web/src/app/app/posts/[id]/post-detail-client.tsx apps/web/tests/components/post-detail-client.test.tsx
git commit -m "feat(web): migrate /app/posts/[id] to thin shell + React Query"
```

---

## Task 12: Manual smoke test

- [ ] **Step 1: Start local stack**

```bash
npx supabase start
pnpm --filter @pretou/web dev
```

- [ ] **Step 2: Walk through the checklist in a browser**

- Open a post from the feed → page-shaped skeleton flashes briefly, then content fills in.
- Add a comment → form clears, new comment appears without full-page reload.
- Open the same post in a second tab → comment added in the first tab appears in the second within ~1s (realtime).
- Click an RSVP button on an event post → button state and count update without white flash.
- Vote in a poll → bar fills and `%` updates. Switch choice → old bar clears.
- Delete your own post (or as admin) → redirect to `/app/feed`, deleted row is gone (feed realtime).
- Open DevTools Network → confirm only the specific `rest/v1/...` row you mutated refetches; no `prefetch` waterfall for author/profile/post.
- Confirm `nav_timing` event in PostHog has `supabaseFetchCount` ≤ 4 on first load and 0 on return nav within `staleTime`.

- [ ] **Step 3: Report results back to the user**

If any step fails, open an issue or a follow-up task; do not mark P4 complete.
