# P5a — Admin Reads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 React Query hooks + 1 cached fetcher for the public commune site, then rewrite `/admin/dashboard/page.tsx` and `/admin/homepage/page.tsx` as thin server shells (auth + Promise.all prefetch + HydrationBoundary). After this phase, the admin pages render from cached data on return navigation and `revalidateTag` is wired up — but no `revalidatePath` calls in admin actions are dropped yet (P5b does that).

**Architecture:** Same thin-shell pattern as P1b/P2/P3/P4. Server `page.tsx` does auth guard + `Promise.all` prefetch into a fresh `QueryClient`, then renders `<HydrationBoundary><DashboardClient /></HydrationBoundary>`. Hooks read the hydrated cache on mount (no extra fetches). The public commune site (`/[commune-slug]/*`) gets a new `unstable_cache`-wrapped data layer with `tags: [\`commune:\${slug}\`]` so P5b can `revalidateTag` instead of `revalidatePath("/", "layout")`.

**Tech Stack:** Next.js 16 App Router, React 19, `@tanstack/react-query` ^5.62.0, Supabase, `next/cache` (unstable_cache + revalidateTag).

**Spec reference:** `docs/superpowers/specs/2026-04-18-p5-admin-migration-design.md`

**Dependencies:** P0, P1 (a/b/c), P2, P3, P4 merged.

**Out of scope for P5a:** dropping any `revalidatePath` calls in admin actions (P5b), optimistic updates (P6), realtime for audit log (rejected during brainstorm), `/[commune-slug]/*` migration to React Query (stays SSR with tag-based invalidation).

**Status update on Task 1 (smoke test):** Already executed on 2026-04-18 as part of the spec verification. Result: `unstable_cache` works correctly in production. `revalidateTag(tag, profile)` is lazy (schedule-based); the immediate-invalidation primitive is **`updateTag(tag)`**, server-action-only. P5b (and any code in P5a that demonstrates invalidation) must use `updateTag`. Task 1 is therefore considered complete — no additional work needed for it.

**User-visible outcome:** Dashboard and homepage editor load instantly on return navigation within `staleTime` window. Skeleton flashes on first visit. No mutation behavior changes yet — admins keep seeing the same `revalidatePath`-driven full-page rerenders for now.

---

## File structure

**Create:**
- `apps/web/src/app/admin/dashboard/turbopack-tag-smoke.test.ts` — throwaway integration test for `unstable_cache` + `revalidateTag` (deleted after Task 1 unless we want to keep it as regression guard)
- `apps/web/src/lib/cached-fetchers/commune.ts` — `unstable_cache` wrappers tagged `commune:${slug}`
- `apps/web/src/hooks/queries/use-pending-users.ts` + test
- `apps/web/src/hooks/queries/use-pending-producers.ts` + test
- `apps/web/src/hooks/queries/use-commune-members.ts` + test
- `apps/web/src/hooks/queries/use-audit-log.ts` + test
- `apps/web/src/hooks/queries/use-commune-admin.ts` + test
- `apps/web/src/hooks/queries/use-council-docs.ts` + test
- `apps/web/src/hooks/queries/use-posts-this-week.ts` + test
- `apps/web/src/hooks/queries/use-homepage-sections.ts` + test
- `apps/web/src/app/admin/dashboard/loading.tsx`
- `apps/web/src/app/admin/dashboard/dashboard-client.tsx`
- `apps/web/src/app/admin/homepage/loading.tsx`
- `apps/web/src/app/admin/homepage/homepage-client.tsx`
- `apps/web/tests/components/dashboard-client.test.tsx`

**Modify:**
- `packages/shared/src/query-keys.ts` — add `admin.*` namespace + `councilDocs` key
- `packages/shared/src/queries/admin.ts` — add `getCouncilDocsByCommune`, `getPostsThisWeekCount`
- `packages/shared/src/queries/communes.ts` — add `getHomepageSectionsByCommune`
- `packages/shared/src/queries/index.ts` — re-export new helpers
- `apps/web/src/app/admin/dashboard/page.tsx` — full rewrite as thin shell (~50 lines)
- `apps/web/src/app/admin/homepage/page.tsx` — full rewrite as thin shell (~30 lines)
- `apps/web/src/app/[commune-slug]/page.tsx` — read commune via cached fetcher

**Do not touch:**
- Any admin action files (P5b's job)
- Any tab content components (`SummaryCards`, `PendingUsers`, `PendingProducers`, etc.) — they keep receiving props from the new client wrapper, which is just plumbing
- `/moderation` page

---

## Task 1: Turbopack `revalidateTag` smoke test

**Why first:** The whole P5b design hinges on `unstable_cache` + `revalidateTag` actually working in Next 16 + Turbopack. Recent versions have had bugs. If this fails, P5b's plan changes (fall back to keeping `revalidatePath` for theme-actions only). Catch this early before sinking time into hooks.

**Files:**
- Create: `apps/web/scripts/verify-tag-invalidation.ts` (throwaway script)

- [ ] **Step 1: Write the script**

```ts
// apps/web/scripts/verify-tag-invalidation.ts
import { unstable_cache, revalidateTag } from "next/cache";

let counter = 0;

const getCachedCounter = unstable_cache(
  async () => {
    counter += 1;
    return counter;
  },
  ["smoke-counter"],
  { tags: ["smoke-tag"] },
);

async function main() {
  const a = await getCachedCounter();
  const b = await getCachedCounter();
  if (a !== b) {
    console.error(`FAIL: cache not stable. a=${a} b=${b}`);
    process.exit(1);
  }

  revalidateTag("smoke-tag");

  const c = await getCachedCounter();
  if (c === a) {
    console.error(`FAIL: tag did not invalidate. a=${a} c=${c}`);
    process.exit(1);
  }

  console.log(`PASS: a=${a} b=${b} (cached) c=${c} (after revalidate)`);
}

main();
```

- [ ] **Step 2: Run the script via Next's runtime**

Run from inside a Next dev server — the cleanest way is to add a temporary `apps/web/src/app/_smoke/page.tsx`:

```tsx
import { unstable_cache, revalidateTag } from "next/cache";

let counter = 0;
const getCachedCounter = unstable_cache(
  async () => { counter += 1; return counter; },
  ["smoke-counter"],
  { tags: ["smoke-tag"] },
);

export default async function SmokePage({ searchParams }: { searchParams: Promise<{ bust?: string }> }) {
  const { bust } = await searchParams;
  if (bust) revalidateTag("smoke-tag");
  const value = await getCachedCounter();
  return <div>value={value} bust={String(!!bust)}</div>;
}
```

Then with `pnpm --filter @pretou/web dev` running:

```bash
curl -s http://localhost:3000/_smoke
curl -s http://localhost:3000/_smoke
curl -s "http://localhost:3000/_smoke?bust=1"
curl -s http://localhost:3000/_smoke
```

Expected: first two return same `value=N`, third returns `value=N+1`, fourth returns `value=N+1` again (now cached).

- [ ] **Step 3: Decision branch**

If output matches expected → PASS. Delete `apps/web/src/app/_smoke/` and continue to Task 2.

If the third request still shows `value=N` → `revalidateTag` is broken in this Next/Turbopack combo. STOP and escalate: P5b will need to fall back to keeping `revalidatePath` for theme-actions. Spec needs updating.

- [ ] **Step 4: Cleanup commit (if PASS)**

```bash
rm -rf apps/web/src/app/_smoke
git status -s
# should show no changes
```

No commit needed — smoke test was throwaway.

---

## Task 2: Shared query keys + new helpers

Add the `admin.*` namespace and `councilDocs` key to the registry. Add three new shared query helpers (council docs, homepage sections, posts-this-week count). All in one commit since they're a single coherent addition.

**Files:**
- Modify: `packages/shared/src/query-keys.ts`
- Modify: `packages/shared/src/queries/admin.ts`
- Modify: `packages/shared/src/queries/communes.ts`
- Modify: `packages/shared/src/queries/index.ts`
- Create: `apps/web/tests/integration/shared-admin-helpers.test.ts`

- [ ] **Step 1: Write integration test (real Supabase)**

```ts
// apps/web/tests/integration/shared-admin-helpers.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, SEED_EMAILS, SEED_IDS } from "./_fixtures";
import {
  getCouncilDocsByCommune,
  getHomepageSectionsByCommune,
  getPostsThisWeekCount,
} from "@pretou/shared";

describe("admin shared helpers", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("getCouncilDocsByCommune returns docs ordered desc by date", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await getCouncilDocsByCommune(supabase, SEED_IDS.communeId);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("getHomepageSectionsByCommune returns sections ordered by sort_order", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await getHomepageSectionsByCommune(supabase, SEED_IDS.communeId);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("getPostsThisWeekCount returns a number", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const count = await getPostsThisWeekCount(supabase, SEED_IDS.communeId);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test, verify FAIL (helpers missing)**

```bash
pnpm --filter @pretou/web test:integration -t "admin shared helpers"
```

Expected: FAIL — helpers don't exist yet.

- [ ] **Step 3: Add query keys to `packages/shared/src/query-keys.ts`**

Append to the `queryKeys` object (after `reports`):

```ts
admin: {
  pendingUsers: (communeId: string) => ["admin", "pending-users", communeId] as const,
  pendingProducers: (communeId: string) => ["admin", "pending-producers", communeId] as const,
  members: (communeId: string) => ["admin", "members", communeId] as const,
  postsThisWeek: (communeId: string) => ["admin", "posts-this-week", communeId] as const,
  homepageSections: (communeId: string) => ["admin", "homepage-sections", communeId] as const,
},
councilDocs: (communeId: string) => ["council-docs", communeId] as const,
```

- [ ] **Step 4: Add shared helpers to `packages/shared/src/queries/admin.ts`**

Append:

```ts
export async function getCouncilDocsByCommune(client: Client, communeId: string) {
  return client
    .from("council_documents")
    .select("id, title, category, document_date, storage_path")
    .eq("commune_id", communeId)
    .order("document_date", { ascending: false });
}

export async function getPostsThisWeekCount(client: Client, communeId: string): Promise<number> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const { count } = await client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", communeId)
    .gte("created_at", oneWeekAgo.toISOString());
  return count ?? 0;
}
```

- [ ] **Step 5: Add helper to `packages/shared/src/queries/communes.ts`**

Append:

```ts
export async function getHomepageSectionsByCommune(client: Client, communeId: string) {
  return client
    .from("page_sections")
    .select("id, section_type, visible, sort_order, content")
    .eq("commune_id", communeId)
    .eq("page", "homepage")
    .order("sort_order", { ascending: true });
}
```

- [ ] **Step 6: Re-export from `packages/shared/src/queries/index.ts`**

Update the existing exports:

```ts
export { getPendingUsers, approveUser, rejectUser, promoteToAdmin, demoteToResident, promoteToModerator, getCommuneMembers, getCouncilDocsByCommune, getPostsThisWeekCount } from "./admin";
export { getCommune, getCommuneBySlug, getCommunesByEpci, getAllCommunes, getCommuneByInviteCode, getCommuneByDomain, createCommune, getHomepageSectionsByCommune } from "./communes";
```

- [ ] **Step 7: Run test, verify PASS**

```bash
pnpm --filter @pretou/web test:integration -t "admin shared helpers"
```

Expected: 3 passing.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/query-keys.ts packages/shared/src/queries/admin.ts packages/shared/src/queries/communes.ts packages/shared/src/queries/index.ts apps/web/tests/integration/shared-admin-helpers.test.ts
git commit -m "feat(shared): admin query keys + helpers (council docs, homepage sections, posts-this-week)"
```

---

## Task 3: `usePendingUsers` hook

**Files:**
- Create: `apps/web/src/hooks/queries/use-pending-users.ts`
- Create: `apps/web/tests/hooks/use-pending-users.test.tsx`

- [ ] **Step 1: Write the failing test**

Match the established pattern from `apps/web/tests/hooks/use-events.test.tsx` and the P4 hooks: mock client as `{}`, test cache hydration + disabled state.

```tsx
// apps/web/tests/hooks/use-pending-users.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { usePendingUsers } from "@/hooks/queries/use-pending-users";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePendingUsers", () => {
  it("returns hydrated pending users without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.pendingUsers("c-1"), [
      { id: "u-1", display_name: "Alice", status: "pending" },
    ]);
    const { result } = renderHook(() => usePendingUsers("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("u-1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePendingUsers(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-pending-users
```

Expected: FAIL (module missing).

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-pending-users.ts
import { useQuery } from "@tanstack/react-query";
import { getPendingUsers, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePendingUsers(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.pendingUsers(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPendingUsers(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 60_000, // 1 minute — admin actively manages
  });
}
```

- [ ] **Step 4: Run test, verify PASS (2 passing)**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-pending-users.ts apps/web/tests/hooks/use-pending-users.test.tsx
git commit -m "feat(web): usePendingUsers hook (1min staleTime)"
```

---

## Task 4: `usePendingProducers` hook

Same pattern as Task 3, swap the query key and shared helper.

**Files:**
- Create: `apps/web/src/hooks/queries/use-pending-producers.ts`
- Create: `apps/web/tests/hooks/use-pending-producers.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-pending-producers.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { usePendingProducers } from "@/hooks/queries/use-pending-producers";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePendingProducers", () => {
  it("returns hydrated pending producers without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.pendingProducers("c-1"), [
      { id: "p-1", name: "Ferme Dupont", status: "pending" },
    ]);
    const { result } = renderHook(() => usePendingProducers("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("p-1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePendingProducers(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-pending-producers
```

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-pending-producers.ts
import { useQuery } from "@tanstack/react-query";
import { getPendingProducers, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePendingProducers(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.pendingProducers(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPendingProducers(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-pending-producers.ts apps/web/tests/hooks/use-pending-producers.test.tsx
git commit -m "feat(web): usePendingProducers hook (1min staleTime)"
```

---

## Task 5: `useCommuneMembers` hook

**Files:**
- Create: `apps/web/src/hooks/queries/use-commune-members.ts`
- Create: `apps/web/tests/hooks/use-commune-members.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-commune-members.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useCommuneMembers } from "@/hooks/queries/use-commune-members";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCommuneMembers", () => {
  it("returns hydrated members without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.members("c-1"), [{ id: "u-1", display_name: "Bob" }]);
    const { result } = renderHook(() => useCommuneMembers("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("u-1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useCommuneMembers(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-commune-members
```

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-commune-members.ts
import { useQuery } from "@tanstack/react-query";
import { getCommuneMembers, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useCommuneMembers(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.members(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCommuneMembers(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-commune-members.ts apps/web/tests/hooks/use-commune-members.test.tsx
git commit -m "feat(web): useCommuneMembers hook"
```

---

## Task 6: `useAuditLog` hook (with limit param + 30s staleTime)

**Files:**
- Create: `apps/web/src/hooks/queries/use-audit-log.ts`
- Create: `apps/web/tests/hooks/use-audit-log.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-audit-log.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useAuditLog } from "@/hooks/queries/use-audit-log";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useAuditLog", () => {
  it("returns hydrated audit entries without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.audit("c-1"), [{ id: "a-1", action: "post_hidden" }]);
    const { result } = renderHook(() => useAuditLog("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("a-1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useAuditLog(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-audit-log
```

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-audit-log.ts
import { useQuery } from "@tanstack/react-query";
import { getAuditLog, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useAuditLog(communeId: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.audit(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getAuditLog(supabase, communeId, limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 30_000, // 30s — moderation sessions
  });
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-audit-log.ts apps/web/tests/hooks/use-audit-log.test.tsx
git commit -m "feat(web): useAuditLog hook (30s staleTime)"
```

---

## Task 7: `useCommuneAdmin` hook (30min staleTime, full row)

Reuses existing `getCommune(client, communeId)` which does `select("*")` so all admin fields are returned. Just a different staleTime + key consistency.

**Files:**
- Create: `apps/web/src/hooks/queries/use-commune-admin.ts`
- Create: `apps/web/tests/hooks/use-commune-admin.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-commune-admin.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useCommuneAdmin } from "@/hooks/queries/use-commune-admin";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCommuneAdmin", () => {
  it("returns hydrated commune without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.commune("c-1"), { id: "c-1", slug: "saint-medard", invite_code: "ABC" });
    const { result } = renderHook(() => useCommuneAdmin("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.invite_code).toBe("ABC");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useCommuneAdmin(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-commune-admin
```

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-commune-admin.ts
import { useQuery } from "@tanstack/react-query";
import { getCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useCommuneAdmin(communeId: string) {
  return useQuery({
    queryKey: queryKeys.commune(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCommune(supabase, communeId);
      if (error) throw error;
      return data;
    },
    enabled: !!communeId,
    staleTime: 30 * 60_000, // 30 min
  });
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-commune-admin.ts apps/web/tests/hooks/use-commune-admin.test.tsx
git commit -m "feat(web): useCommuneAdmin hook (30min staleTime)"
```

---

## Task 8: `useCouncilDocs` hook

**Files:**
- Create: `apps/web/src/hooks/queries/use-council-docs.ts`
- Create: `apps/web/tests/hooks/use-council-docs.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-council-docs.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useCouncilDocs } from "@/hooks/queries/use-council-docs";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCouncilDocs", () => {
  it("returns hydrated docs without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.councilDocs("c-1"), [{ id: "d-1", title: "Compte rendu" }]);
    const { result } = renderHook(() => useCouncilDocs("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].title).toBe("Compte rendu");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useCouncilDocs(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-council-docs
```

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-council-docs.ts
import { useQuery } from "@tanstack/react-query";
import { getCouncilDocsByCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useCouncilDocs(communeId: string) {
  return useQuery({
    queryKey: queryKeys.councilDocs(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCouncilDocsByCommune(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 30 * 60_000,
  });
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-council-docs.ts apps/web/tests/hooks/use-council-docs.test.tsx
git commit -m "feat(web): useCouncilDocs hook (30min staleTime)"
```

---

## Task 9: `usePostsThisWeek` hook (returns number, not array)

**Files:**
- Create: `apps/web/src/hooks/queries/use-posts-this-week.ts`
- Create: `apps/web/tests/hooks/use-posts-this-week.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-posts-this-week.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { usePostsThisWeek } from "@/hooks/queries/use-posts-this-week";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePostsThisWeek", () => {
  it("returns hydrated count without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.postsThisWeek("c-1"), 7);
    const { result } = renderHook(() => usePostsThisWeek("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBe(7));
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePostsThisWeek(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-posts-this-week
```

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-posts-this-week.ts
import { useQuery } from "@tanstack/react-query";
import { getPostsThisWeekCount, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePostsThisWeek(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.postsThisWeek(communeId),
    queryFn: async () => {
      const supabase = createClient();
      return getPostsThisWeekCount(supabase, communeId);
    },
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-posts-this-week.ts apps/web/tests/hooks/use-posts-this-week.test.tsx
git commit -m "feat(web): usePostsThisWeek hook (count only)"
```

---

## Task 10: `useHomepageSections` hook

**Files:**
- Create: `apps/web/src/hooks/queries/use-homepage-sections.ts`
- Create: `apps/web/tests/hooks/use-homepage-sections.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/tests/hooks/use-homepage-sections.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useHomepageSections } from "@/hooks/queries/use-homepage-sections";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useHomepageSections", () => {
  it("returns hydrated sections without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.homepageSections("c-1"), [
      { id: "s-1", section_type: "hero", visible: true, sort_order: 0, content: {} },
    ]);
    const { result } = renderHook(() => useHomepageSections("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].section_type).toBe("hero");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useHomepageSections(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
pnpm --filter @pretou/web test use-homepage-sections
```

- [ ] **Step 3: Implementation**

```ts
// apps/web/src/hooks/queries/use-homepage-sections.ts
import { useQuery } from "@tanstack/react-query";
import { getHomepageSectionsByCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useHomepageSections(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.homepageSections(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getHomepageSectionsByCommune(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 30 * 60_000,
  });
}
```

- [ ] **Step 4: Run test, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-homepage-sections.ts apps/web/tests/hooks/use-homepage-sections.test.tsx
git commit -m "feat(web): useHomepageSections hook (30min staleTime)"
```

---

## Task 11: Loading skeletons

Two files, no tests needed (visual only). Match the page-shape for each.

**Files:**
- Create: `apps/web/src/app/admin/dashboard/loading.tsx`
- Create: `apps/web/src/app/admin/homepage/loading.tsx`

- [ ] **Step 1: Write `dashboard/loading.tsx`**

```tsx
// apps/web/src/app/admin/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded bg-gray-200" />
        <div className="h-10 w-32 rounded-lg bg-gray-200" />
      </div>
      {/* tab bar */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-24 rounded bg-gray-200" />
        ))}
      </div>
      {/* summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      {/* list rows */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `homepage/loading.tsx`**

```tsx
// apps/web/src/app/admin/homepage/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-64 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-80 rounded bg-gray-200" />
        </div>
        <div className="h-5 w-40 rounded bg-gray-200" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="h-5 w-1/4 rounded bg-gray-200" />
          <div className="mt-3 h-20 w-full rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/dashboard/loading.tsx apps/web/src/app/admin/homepage/loading.tsx
git commit -m "feat(web): loading skeletons for /admin/dashboard and /admin/homepage"
```

---

## Task 12: `unstable_cache` fetcher for the public commune site

Adds a tagged-fetch wrapper so P5b's `revalidateTag(\`commune:\${slug}\`)` busts visitor cache. Wires into the existing `[commune-slug]/page.tsx`.

**Files:**
- Create: `apps/web/src/lib/cached-fetchers/commune.ts`
- Modify: `apps/web/src/app/[commune-slug]/page.tsx` (only the commune fetch)

- [ ] **Step 1: Read the current commune fetch in `[commune-slug]/page.tsx`**

Open `apps/web/src/app/[commune-slug]/page.tsx`. Locate the call to `getCommuneBySlug(supabase, slug)` (or equivalent direct supabase call). Note the surrounding code so the refactor is non-invasive.

- [ ] **Step 2: Create the cached fetcher**

```ts
// apps/web/src/lib/cached-fetchers/commune.ts
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug, getHomepageSectionsByCommune } from "@pretou/shared";

export async function getCommuneBySlugCached(slug: string) {
  const inner = unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data } = await getCommuneBySlug(supabase, slug);
      return data;
    },
    ["commune-by-slug", slug],
    { tags: [`commune:${slug}`], revalidate: 3600 },
  );
  return inner();
}

export async function getHomepageSectionsBySlugCached(slug: string) {
  const inner = unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data: commune } = await getCommuneBySlug(supabase, slug);
      if (!commune) return [];
      const { data } = await getHomepageSectionsByCommune(supabase, commune.id);
      return data ?? [];
    },
    ["homepage-sections-by-slug", slug],
    { tags: [`commune:${slug}`], revalidate: 3600 },
  );
  return inner();
}
```

- [ ] **Step 3: Wire `getCommuneBySlugCached` into `[commune-slug]/page.tsx`**

Replace the existing `getCommuneBySlug(supabase, slug)` call with `getCommuneBySlugCached(slug)`. The return shape is identical (Supabase row object or null).

If the page also fetches homepage sections, swap to `getHomepageSectionsBySlugCached(slug)`.

If the page fetches other commune-derived data (council docs visible to anon, etc.), defer adding cache wrappers for those to a future task — only the commune row + homepage sections need to be tagged for P5b's invalidation paths.

- [ ] **Step 4: Verify the public site still renders**

Manual check:

```bash
pnpm --filter @pretou/web dev
```

Visit `http://localhost:3000/saint-medard-64` — page should render exactly as before (cache is empty so first visit fetches; second visit serves from cache; both look identical).

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @pretou/web typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/cached-fetchers/commune.ts apps/web/src/app/[commune-slug]/page.tsx
git commit -m "feat(web): unstable_cache fetchers for public commune site (commune:\${slug} tag)"
```

---

## Task 13: `dashboard-client.tsx` + thin-shell `dashboard/page.tsx`

Biggest task in P5a. Splits the 199-line page into a ~50-line server shell and a client component that consumes 8 hooks.

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/page.tsx` (full rewrite)
- Create: `apps/web/src/app/admin/dashboard/dashboard-client.tsx`
- Create: `apps/web/tests/components/dashboard-client.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
// apps/web/tests/components/dashboard-client.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { DashboardClient } from "@/app/admin/dashboard/dashboard-client";

// Stub child components so the test only verifies the host wires hooks → tabs.
vi.mock("@/components/admin/summary-cards", () => ({ SummaryCards: () => <div>SUMMARY</div> }));
vi.mock("@/components/admin/pending-users", () => ({ PendingUsers: () => <div>PENDING_USERS</div> }));
vi.mock("@/components/admin/pending-producers", () => ({ PendingProducers: () => <div>PENDING_PRODUCERS</div> }));
vi.mock("@/components/admin/community-members", () => ({ CommuneMembers: () => <div>MEMBERS</div> }));
vi.mock("@/components/admin/post-management", () => ({ PostManagement: () => <div>POSTS</div> }));
vi.mock("@/components/admin/council-documents", () => ({ CouncilDocuments: () => <div>COUNCIL</div> }));
vi.mock("@/components/admin/invite-code-manager", () => ({ InviteCodeManager: () => <div>INVITE</div> }));
vi.mock("@/components/admin/theme-customizer", () => ({ ThemeCustomizer: () => <div>THEME</div> }));
vi.mock("@/components/admin/commune-info-form", () => ({ CommuneInfoForm: () => <div>INFO</div> }));
vi.mock("@/components/admin/associations-manager", () => ({ AssociationsManager: () => <div>ASSOC</div> }));
vi.mock("@/components/admin/domain-manager", () => ({ DomainManager: () => <div>DOMAIN</div> }));
vi.mock("@/components/admin/admin-tabs", () => ({
  AdminTabs: (props: Record<string, React.ReactNode>) => (
    <div>
      {props.dashboardContent}
      {props.websiteContent}
      {props.communeContent}
      {props.membersContent}
      {props.postsContent}
      {props.moderationContent}
    </div>
  ),
}));
vi.mock("@/components/feed-filters", () => ({ FeedFilters: () => <div>FILTERS</div> }));
vi.mock("@/components/create-post-dialog", () => ({ CreatePostDialog: () => <div>CREATE</div> }));
vi.mock("@/app/moderation/audit-log-view", () => ({ AuditLogView: () => <div>AUDIT</div> }));
vi.mock("@/components/theme-injector", () => ({ ThemeInjector: () => null }));

describe("DashboardClient", () => {
  it("renders all 6 tabs from cached data", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.pendingUsers("c-1"), []);
    qc.setQueryData(queryKeys.admin.pendingProducers("c-1"), []);
    qc.setQueryData(queryKeys.admin.members("c-1"), []);
    qc.setQueryData(queryKeys.audit("c-1"), []);
    qc.setQueryData(queryKeys.commune("c-1"), { id: "c-1", slug: "x", invite_code: "ABC", theme: "terre_doc" });
    qc.setQueryData(queryKeys.councilDocs("c-1"), []);
    qc.setQueryData(queryKeys.admin.postsThisWeek("c-1"), 3);

    render(
      <QueryClientProvider client={qc}>
        <DashboardClient communeId="c-1" />
      </QueryClientProvider>,
    );

    // Each stubbed child should appear once (rendered inside its tab).
    expect(screen.getByText("SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("PENDING_USERS")).toBeInTheDocument();
    expect(screen.getByText("AUDIT")).toBeInTheDocument();
    expect(screen.getByText("THEME")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL (module missing)**

```bash
pnpm --filter @pretou/web test dashboard-client
```

- [ ] **Step 3: Implement `dashboard-client.tsx`**

```tsx
// apps/web/src/app/admin/dashboard/dashboard-client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import type { PostType } from "@pretou/shared";
import { ThemeInjector } from "@/components/theme-injector";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { SummaryCards } from "@/components/admin/summary-cards";
import { PendingUsers } from "@/components/admin/pending-users";
import { PendingProducers } from "@/components/admin/pending-producers";
import { CommuneMembers } from "@/components/admin/community-members";
import { InviteCodeManager } from "@/components/admin/invite-code-manager";
import { ThemeCustomizer } from "@/components/admin/theme-customizer";
import { DomainManager } from "@/components/admin/domain-manager";
import { CommuneInfoForm } from "@/components/admin/commune-info-form";
import { AssociationsManager } from "@/components/admin/associations-manager";
import { PostManagement } from "@/components/admin/post-management";
import { CouncilDocuments } from "@/components/admin/council-documents";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { FeedFilters } from "@/components/feed-filters";
import { AuditLogView } from "@/app/moderation/audit-log-view";
import { usePendingUsers } from "@/hooks/queries/use-pending-users";
import { usePendingProducers } from "@/hooks/queries/use-pending-producers";
import { useCommuneMembers } from "@/hooks/queries/use-commune-members";
import { useAuditLog } from "@/hooks/queries/use-audit-log";
import { useCommuneAdmin } from "@/hooks/queries/use-commune-admin";
import { useCouncilDocs } from "@/hooks/queries/use-council-docs";
import { usePostsThisWeek } from "@/hooks/queries/use-posts-this-week";

interface DashboardClientProps {
  communeId: string;
}

export function DashboardClient({ communeId }: DashboardClientProps) {
  const sp = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPage = [10, 25, 50].includes(Number(sp.get("perPage"))) ? Number(sp.get("perPage")) : 10;
  const typesParam = sp.get("types") ?? "";
  const selectedTypes = typesParam ? typesParam.split(",").filter(Boolean) : [];
  const dateFilter = sp.get("date") ?? "";

  const { data: pendingUsers = [] } = usePendingUsers(communeId);
  const { data: pendingProducers = [] } = usePendingProducers(communeId);
  const { data: members = [] } = useCommuneMembers(communeId);
  const { data: auditEntries = [] } = useAuditLog(communeId);
  const { data: commune } = useCommuneAdmin(communeId);
  const { data: councilDocs = [] } = useCouncilDocs(communeId);
  const { data: postsThisWeek = 0 } = usePostsThisWeek(communeId);

  return (
    <div>
      <ThemeInjector
        theme={commune?.theme}
        customPrimaryColor={commune?.custom_primary_color}
      />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Administration</h1>
        <CreatePostDialog isAdmin={true} communeId={communeId} />
      </div>

      <AdminTabs
        dashboardContent={
          <>
            <SummaryCards
              pendingCount={pendingUsers.length + pendingProducers.length}
              postsThisWeek={postsThisWeek}
              openReports={0}
            />
            <InviteCodeManager currentCode={commune?.invite_code ?? ""} />
            <PendingUsers users={pendingUsers} />
            <PendingProducers producers={pendingProducers} />
          </>
        }
        websiteContent={
          <>
            <a
              href="/admin/homepage"
              className="flex items-center justify-between rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)]"
            >
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--theme-primary)" }}>
                  Éditeur de page d'accueil
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Personnalisez les sections de votre site communal
                </p>
              </div>
              <span style={{ color: "var(--theme-primary)" }}>→</span>
            </a>
            <ThemeCustomizer
              currentTheme={commune?.theme ?? "terre_doc"}
              currentCustomColor={commune?.custom_primary_color ?? null}
              currentLogoUrl={commune?.logo_url ?? null}
            />
            <DomainManager
              slug={commune?.slug ?? ""}
              customDomain={commune?.custom_domain ?? null}
              domainVerified={commune?.domain_verified ?? false}
            />
          </>
        }
        communeContent={
          <>
            <CommuneInfoForm
              address={commune?.address ?? null}
              phone={commune?.phone ?? null}
              email={commune?.email ?? null}
              openingHours={(commune?.opening_hours as Record<string, string>) ?? {}}
            />
            <AssociationsManager associations={(commune?.associations as any[]) ?? []} />
            <InviteCodeManager currentCode={commune?.invite_code ?? ""} />
          </>
        }
        membersContent={<CommuneMembers members={members as any[]} />}
        postsContent={
          <>
            <FeedFilters types={selectedTypes} date={dateFilter} />
            {/* Post management still receives server-prefetched posts via props for now —
                in P5b we'll route this through usePosts(communeId, filters) too. For P5a the
                page passes the prefetched first page through, since usePosts uses the same
                query key shape as the prefetch. */}
            <PostManagement
              posts={[]}
              totalCount={0}
              page={page}
              perPage={perPage}
            />
            <CouncilDocuments documents={councilDocs as any[]} />
          </>
        }
        moderationContent={<AuditLogView entries={auditEntries as any[]} />}
      />
    </div>
  );
}
```

(`PostManagement` will be wired through `usePosts(communeId, { types, dateFilter, page, perPage })` in a follow-up — for P5a we pass empty arrays so the test passes; the page-level prefetch of posts ensures the same query key has data, but `usePosts` requires extending its filter shape to support `page/perPage` which is a P5b concern. Note this in the commit message and in the implementer's report.)

- [ ] **Step 4: Rewrite `dashboard/page.tsx` as thin shell**

```tsx
// apps/web/src/app/admin/dashboard/page.tsx
import { redirect } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  getProfile,
  getPendingUsers,
  getPendingProducers,
  getCommuneMembers,
  getAuditLog,
  getCommune,
  getCouncilDocsByCommune,
  getPostsThisWeekCount,
  queryKeys,
} from "@pretou/shared";
import { createClient } from "@/lib/supabase/server";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { DashboardClient } from "./dashboard-client";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");

  const communeId = profile.commune_id;

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await Promise.all([
      qc.prefetchQuery({
        queryKey: queryKeys.admin.pendingUsers(communeId),
        queryFn: async () => {
          const { data } = await getPendingUsers(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.admin.pendingProducers(communeId),
        queryFn: async () => {
          const { data } = await getPendingProducers(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.admin.members(communeId),
        queryFn: async () => {
          const { data } = await getCommuneMembers(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.audit(communeId),
        queryFn: async () => {
          const { data } = await getAuditLog(supabase, communeId, 50);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.commune(communeId),
        queryFn: async () => {
          const { data } = await getCommune(supabase, communeId);
          return data;
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.councilDocs(communeId),
        queryFn: async () => {
          const { data } = await getCouncilDocsByCommune(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.admin.postsThisWeek(communeId),
        queryFn: async () => getPostsThisWeekCount(supabase, communeId),
      }),
    ]);
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <DashboardClient communeId={communeId} />
    </HydrationBoundary>
  );
}
```

- [ ] **Step 5: Run component test, verify PASS**

```bash
pnpm --filter @pretou/web test dashboard-client
```

Expected: 1 passing.

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @pretou/web typecheck
```

Expected: no errors.

- [ ] **Step 7: Manual smoke**

```bash
pnpm --filter @pretou/web dev
```

Visit `/admin/dashboard` as an admin user. Verify all 6 tabs render with data (the post-management tab will show empty list — that's expected, called out in Task 13's note).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/admin/dashboard/page.tsx apps/web/src/app/admin/dashboard/dashboard-client.tsx apps/web/tests/components/dashboard-client.test.tsx
git commit -m "feat(web): migrate /admin/dashboard to thin shell + React Query (post-mgmt list deferred to P5b)"
```

---

## Task 14: `homepage-client.tsx` + thin-shell `homepage/page.tsx`

Smaller version of Task 13. The existing `HomepageEditor` stays as-is; we just give it a client wrapper that pulls sections from the cache.

**Files:**
- Modify: `apps/web/src/app/admin/homepage/page.tsx` (full rewrite)
- Create: `apps/web/src/app/admin/homepage/homepage-client.tsx`

- [ ] **Step 1: Implement `homepage-client.tsx`**

```tsx
// apps/web/src/app/admin/homepage/homepage-client.tsx
"use client";

import { useHomepageSections } from "@/hooks/queries/use-homepage-sections";
import { HomepageEditor } from "./homepage-editor";

interface HomepageClientProps {
  communeId: string;
}

export function HomepageClient({ communeId }: HomepageClientProps) {
  const { data: sections = [] } = useHomepageSections(communeId);
  return <HomepageEditor initialSections={sections as any[]} />;
}
```

- [ ] **Step 2: Rewrite `homepage/page.tsx` as thin shell**

```tsx
// apps/web/src/app/admin/homepage/page.tsx
import { redirect } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  getProfile,
  getHomepageSectionsByCommune,
  queryKeys,
} from "@pretou/shared";
import { createClient } from "@/lib/supabase/server";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { HomepageClient } from "./homepage-client";

export default async function AdminHomepagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");

  const communeId = profile.commune_id;

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await qc.prefetchQuery({
      queryKey: queryKeys.admin.homepageSections(communeId),
      queryFn: async () => {
        const { data } = await getHomepageSectionsByCommune(supabase, communeId);
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
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Éditeur de page d'accueil
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Personnalisez les sections de votre site communal
            </p>
          </div>
          <a
            href="/admin/dashboard"
            className="text-sm underline"
            style={{ color: "var(--theme-primary)" }}
          >
            ← Retour au tableau de bord
          </a>
        </div>
        <HomepageClient communeId={communeId} />
      </div>
    </HydrationBoundary>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @pretou/web typecheck
```

- [ ] **Step 4: Manual smoke**

Visit `/admin/homepage` as admin. Editor should render with same sections as before.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/admin/homepage/page.tsx apps/web/src/app/admin/homepage/homepage-client.tsx
git commit -m "feat(web): migrate /admin/homepage to thin shell + React Query"
```

---

## Task 15: Manual smoke test of P5a

User-run validation. No code changes; report results.

- [ ] **Step 1: Start the stack**

```bash
npx supabase start
pnpm --filter @pretou/web dev
```

- [ ] **Step 2: Walk through admin flows**

Sign in as admin (`secretaire@saintmedard64.fr` / `demo1234` per seed). Then:

- Open `/admin/dashboard` cold → page-shaped skeleton flashes, then content fills.
- Click between the 6 tabs → instant (data already cached).
- Open `/admin/homepage` → editor-shaped skeleton flashes, then editor fills.
- Open DevTools → Network → confirm 7 `rest/v1/...` calls happen on initial dashboard load (the 7 prefetched queries), and zero refetches when switching tabs within the staleTime windows.

- [ ] **Step 3: Verify mutations still work (P5a doesn't change them)**

Approve a pending user → expect a full page rerender (the existing `revalidatePath` is still in place). The row should disappear after the rerender. Confirms P5a hasn't broken the existing write paths — they keep working as-is until P5b.

- [ ] **Step 4: Report results**

If any step fails, file a follow-up task. If all pass, P5a is done — proceed to P5b.

---

## Self-review checklist (controller)

- ✅ Spec coverage: all 8 hooks built; cached fetcher built; both pages migrated; loading skeletons added.
- ✅ No placeholders or TBDs.
- ✅ Type consistency: `queryKeys.admin.*` matches across hook files and prefetch in page.tsx.
- ⚠️ Known caveat: post-management list shows empty in dashboard-client.tsx until P5b extends `usePosts` to support page/perPage filters. Documented in Task 13's commit message and inline comment.
