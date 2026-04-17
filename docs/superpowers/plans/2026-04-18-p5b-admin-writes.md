# P5b — Admin Writes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop all 32 `revalidatePath` calls across 7 admin action files. Replace each with surgical client-side `qc.invalidateQueries(...)` (so the admin's own dashboard cache refreshes) plus targeted `revalidateTag(\`commune:\${slug}\`)` for the four mutation paths that affect the public commune site (theme, commune metadata, council docs, homepage sections, custom domain).

**Architecture:** Same pattern P4 established. Server actions stop calling `revalidatePath` and (where applicable) call `revalidateTag`. The component that triggered the action calls `qc.invalidateQueries({ queryKey: ... })` after success — partial-prefix matches let one invalidate hit multiple cached variants of the same data.

**Tech Stack:** Next.js 16 App Router, `@tanstack/react-query` ^5.62.0, `next/cache` (`revalidateTag`).

**Spec reference:** `docs/superpowers/specs/2026-04-18-p5-admin-migration-design.md`

**Dependencies:** P5a merged (hooks + thin-shell pages + cached fetchers in place).

**Out of scope for P5b:** optimistic updates (P6), audit log realtime (rejected), `/[commune-slug]/*` migration to React Query.

**User-visible outcome:** Admin mutations feel ~5× faster (~80ms vs ~400ms today). Theme/contact/council/homepage/domain changes propagate to the public commune site within 1–2s for the next visitor (no more "I changed my color but the site looks the same" bug). The post-management tab now shows real paginated posts (which were empty after P5a).

---

## File structure

**Create:**
- `apps/web/src/hooks/queries/use-admin-posts.ts` + test (Task 1) — offset-paginated, distinct from the cursor-based `usePosts` used on /app/feed

**Modify:**
- `apps/web/src/app/admin/dashboard/actions.ts` — drop 6× `revalidatePath`
- `apps/web/src/app/admin/dashboard/commune-actions.ts` — drop 2×, add `revalidateTag`
- `apps/web/src/app/admin/dashboard/council-actions.ts` — drop 2×, add `revalidateTag`
- `apps/web/src/app/admin/dashboard/domain-actions.ts` — drop 3×, add `revalidateTag`
- `apps/web/src/app/admin/dashboard/invite-actions.ts` — drop 1×, no tag
- `apps/web/src/app/admin/dashboard/theme-actions.ts` — drop 3× (including the `revalidatePath("/", "layout")` blast), add `revalidateTag`
- `apps/web/src/app/admin/producer-actions.ts` — drop 2×, no tag
- `apps/web/src/app/admin/homepage/actions.ts` — drop 4×, add `revalidateTag`
- `apps/web/src/app/admin/dashboard/dashboard-client.tsx` — wire `useAdminPosts` into the post-management tab
- Each component that calls one of the above actions — add `qc.invalidateQueries` after success

**Do not touch:**
- The shared query helpers (P5a sealed those)
- Any hook implementations from P5a
- The unstable_cache fetcher (P5a sealed it)

---

## Task 1: `useAdminPosts` hook (offset-paginated)

The dashboard's post-management tab uses **offset pagination** (`page=2&perPage=25`) and supports the same filter shape as the feed (types, dateFilter). This is structurally different from `usePosts` (which is cursor-based / infinite), so it gets its own hook.

**Files:**
- Modify: `packages/shared/src/queries/posts.ts` — add `getAdminPostsPaginated(client, communeId, filters)`
- Modify: `packages/shared/src/queries/index.ts` — re-export
- Modify: `packages/shared/src/query-keys.ts` — add `posts.adminList`
- Create: `apps/web/src/hooks/queries/use-admin-posts.ts`
- Create: `apps/web/tests/hooks/use-admin-posts.test.tsx`

- [ ] **Step 1: Add shared query helper to `packages/shared/src/queries/posts.ts`**

Append:

```ts
export type AdminPostFilters = {
  types?: string[];
  dateFilter?: "today" | "week" | "month" | "";
  page: number;
  perPage: number;
};

export async function getAdminPostsPaginated(
  client: Client,
  communeId: string,
  filters: AdminPostFilters,
) {
  const { types = [], dateFilter = "", page, perPage } = filters;

  let dateSince: string | null = null;
  if (dateFilter === "today") {
    const d = new Date(); d.setHours(0, 0, 0, 0); dateSince = d.toISOString();
  } else if (dateFilter === "week") {
    const d = new Date(); d.setDate(d.getDate() - 7); dateSince = d.toISOString();
  } else if (dateFilter === "month") {
    const d = new Date(); d.setDate(d.getDate() - 30); dateSince = d.toISOString();
  }

  let countQuery = client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", communeId)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());
  if (types.length > 0) countQuery = countQuery.in("type", types);
  if (dateSince) countQuery = countQuery.gte("created_at", dateSince);
  const { count: totalCount } = await countQuery;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let postsQuery = client
    .from("posts")
    .select("id, title, type, is_pinned, created_at, profiles!author_id(display_name)")
    .eq("commune_id", communeId)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
    .range(from, to);
  if (types.length > 0) postsQuery = postsQuery.in("type", types);
  if (dateSince) postsQuery = postsQuery.gte("created_at", dateSince);
  const { data: posts } = await postsQuery;

  return { posts: posts ?? [], totalCount: totalCount ?? 0 };
}
```

- [ ] **Step 2: Re-export from `packages/shared/src/queries/index.ts`**

Update existing posts export:

```ts
export { getPosts, getPostById, createPost, deletePost, togglePinPost, getPostsByType, getPostsPaginated, getPinnedPosts, getEventsByCommune, getAdminPostsPaginated } from "./posts";
export type { PostListFilters, AdminPostFilters } from "./posts";
```

- [ ] **Step 3: Add query key to `packages/shared/src/query-keys.ts`**

Inside `posts:` object:

```ts
adminList: (communeId: string, filters: { types?: string[]; dateFilter?: string; page: number; perPage: number }) =>
  ["posts", "admin-list", communeId, filters] as const,
```

- [ ] **Step 4: Write the failing hook test**

```tsx
// apps/web/tests/hooks/use-admin-posts.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { useAdminPosts } from "@/hooks/queries/use-admin-posts";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useAdminPosts", () => {
  it("returns hydrated paginated posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const filters = { types: [], dateFilter: "" as const, page: 1, perPage: 10 };
    qc.setQueryData(queryKeys.posts.adminList("c-1", filters), {
      posts: [{ id: "p-1", title: "X", type: "annonce", is_pinned: false, created_at: "2026-04-18T00:00:00Z", profiles: { display_name: "A" } }],
      totalCount: 1,
    });
    const { result } = renderHook(() => useAdminPosts("c-1", filters), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.posts[0].id).toBe("p-1");
    expect(result.current.data?.totalCount).toBe(1);
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(
      () => useAdminPosts("", { page: 1, perPage: 10 }),
      { wrapper: wrap(qc) },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 5: Run test, verify FAIL**

```bash
pnpm --filter @rural-community-platform/web test use-admin-posts
```

- [ ] **Step 6: Implementation**

```ts
// apps/web/src/hooks/queries/use-admin-posts.ts
import { useQuery } from "@tanstack/react-query";
import { getAdminPostsPaginated, queryKeys, type AdminPostFilters } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useAdminPosts(communeId: string, filters: AdminPostFilters) {
  return useQuery({
    queryKey: queryKeys.posts.adminList(communeId, filters),
    queryFn: async () => {
      const supabase = createClient();
      return getAdminPostsPaginated(supabase, communeId, filters);
    },
    enabled: !!communeId,
  });
}
```

- [ ] **Step 7: Run test, verify PASS**

- [ ] **Step 8: Wire into `dashboard-client.tsx`**

Replace the placeholder `<PostManagement posts={[]} totalCount={0} ...>` from P5a Task 13 with:

```tsx
// near the other hooks in dashboard-client.tsx
const adminPostFilters = { types: selectedTypes, dateFilter: dateFilter as AdminPostFilters["dateFilter"], page, perPage };
const { data: adminPostsData } = useAdminPosts(communeId, adminPostFilters);

// in the postsContent JSX
<PostManagement
  posts={(adminPostsData?.posts ?? []) as Parameters<typeof PostManagement>[0]["posts"]}
  totalCount={adminPostsData?.totalCount ?? 0}
  page={page}
  perPage={perPage}
/>
```

Add the import: `import { type AdminPostFilters } from "@rural-community-platform/shared";` and `import { useAdminPosts } from "@/hooks/queries/use-admin-posts";`

- [ ] **Step 9: Update `dashboard/page.tsx` to prefetch admin posts**

In the `Promise.all` block, add:

```ts
qc.prefetchQuery({
  queryKey: queryKeys.posts.adminList(communeId, { types: [], dateFilter: "", page: 1, perPage: 10 }),
  queryFn: async () => getAdminPostsPaginated(supabase, communeId, { types: [], dateFilter: "", page: 1, perPage: 10 }),
}),
```

(Prefetch only the default no-filter view. Other filter combinations get fetched on demand when the admin changes filters — fast enough since the server action returns in <80 ms.)

Add `getAdminPostsPaginated` to the shared imports.

- [ ] **Step 10: Typecheck + manual smoke**

```bash
pnpm --filter @rural-community-platform/web typecheck
pnpm --filter @rural-community-platform/web dev
```

Visit `/admin/dashboard` → "Publications" tab → see the paginated post list (was empty after P5a).

- [ ] **Step 11: Commit**

```bash
git add packages/shared/src/queries/posts.ts packages/shared/src/queries/index.ts packages/shared/src/query-keys.ts apps/web/src/hooks/queries/use-admin-posts.ts apps/web/tests/hooks/use-admin-posts.test.tsx apps/web/src/app/admin/dashboard/dashboard-client.tsx apps/web/src/app/admin/dashboard/page.tsx
git commit -m "feat(web): useAdminPosts hook (offset pagination) + wire into dashboard"
```

---

## Task 2: `dashboard/actions.ts` — post management

`actions.ts` has 6 `revalidatePath` calls across pin/unpin/hide/unhide/delete/etc. After this task, mutations call `qc.invalidateQueries({ queryKey: ["posts"] })` from the calling component (a partial-prefix match that hits all post-related cache entries: feed, pinned, admin list).

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/actions.ts`
- Modify: `apps/web/src/components/admin/post-management.tsx` (and any other component calling these actions)

- [ ] **Step 1: Read `actions.ts` and identify each exported action**

```bash
cat apps/web/src/app/admin/dashboard/actions.ts
```

Note the action names and signatures. Each one ends with `revalidatePath("/admin/dashboard")` followed by `return { error: null }`.

- [ ] **Step 2: Edit `actions.ts` — drop the import + every call**

Remove `import { revalidatePath } from "next/cache";` and every `revalidatePath("/admin/dashboard");` line. Leave the `return { error: null }` lines untouched.

- [ ] **Step 3: Update `post-management.tsx` (or wherever the actions are called from)**

Find the calls to actions like `togglePinPostAction`, `hidePostAction`, etc. After each `await actionFn()` whose result is success (`!result.error`), add:

```tsx
import { useQueryClient } from "@tanstack/react-query";
// at top of component
const qc = useQueryClient();

// after success branch of every action call
qc.invalidateQueries({ queryKey: ["posts"] });
```

Using `["posts"]` as the prefix invalidates `posts.list`, `posts.pinned`, `posts.adminList`, `posts.detail`, `posts.epci` — all cached post variants. This is the right granularity since pin/hide changes affect every list view.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

- [ ] **Step 5: Manual smoke**

In `/admin/dashboard` → "Publications" tab: pin a post → row updates within ~80ms. Then visit `/app/feed` in another tab → pinned post is at top.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/dashboard/actions.ts apps/web/src/components/admin/post-management.tsx
git commit -m "refactor(web): drop revalidatePath from dashboard actions; invalidate posts cache from client"
```

---

## Task 3: `commune-actions.ts` — contact/hours/associations + revalidateTag

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/commune-actions.ts`
- Modify: `apps/web/src/components/admin/commune-info-form.tsx`
- Modify: `apps/web/src/components/admin/associations-manager.tsx`

- [ ] **Step 1: Edit `commune-actions.ts`**

Replace `revalidatePath` with `revalidateTag`. The slug needed for the tag is fetched from the commune row (or passed as an arg from the client).

```ts
// apps/web/src/app/admin/dashboard/commune-actions.ts
"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
// ... existing imports

export async function updateCommuneInfoAction(/* existing args */) {
  const supabase = await createClient();
  // ... existing auth + update logic ...

  // Fetch slug for the tag (or pass as arg from client to avoid the round-trip)
  const { data: commune } = await supabase
    .from("communes").select("slug").eq("id", communeId).single();
  if (commune?.slug) revalidateTag(`commune:${commune.slug}`);

  return { error: null };
}

export async function updateAssociationsAction(/* existing args */) {
  // same pattern
}
```

(If the actions already receive `slug` as an arg, use that and skip the extra fetch.)

- [ ] **Step 2: Update `commune-info-form.tsx` to invalidate**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

const qc = useQueryClient();

// after success
qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
```

The component needs `communeId` as a prop. If it doesn't already have it, add it (parent passes from `dashboard-client.tsx`).

- [ ] **Step 3: Same for `associations-manager.tsx`**

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

- [ ] **Step 5: Manual smoke**

Save new contact info on `/admin/dashboard` → admin reflects in <100ms. Open `/saint-medard-64` (public site) → new info shows on next page load (within 1–2s).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/dashboard/commune-actions.ts apps/web/src/components/admin/commune-info-form.tsx apps/web/src/components/admin/associations-manager.tsx
git commit -m "refactor(web): commune-actions use revalidateTag(commune:slug); client invalidates"
```

---

## Task 4: `council-actions.ts` — uploads/deletes + revalidateTag

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/council-actions.ts`
- Modify: `apps/web/src/components/admin/council-documents.tsx`

- [ ] **Step 1: Edit `council-actions.ts`**

Same pattern as Task 3:

```ts
import { revalidateTag } from "next/cache";

// inside uploadCouncilDocumentAction, after successful insert:
const { data: commune } = await supabase
  .from("communes").select("slug").eq("id", profile.commune_id).single();
if (commune?.slug) revalidateTag(`commune:${commune.slug}`);
return { error: null };
```

Same for `deleteCouncilDocumentAction`. Drop the `revalidatePath("/admin/dashboard")` lines and the `import { revalidatePath } from "next/cache";`.

- [ ] **Step 2: Update `council-documents.tsx` to invalidate**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

const qc = useQueryClient();

// after each successful upload/delete
qc.invalidateQueries({ queryKey: queryKeys.councilDocs(communeId) });
```

Component needs `communeId` prop — pass from `dashboard-client.tsx`.

- [ ] **Step 3: Typecheck + manual smoke**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

Upload a document → list updates in admin. Visit public commune site → document shows.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/dashboard/council-actions.ts apps/web/src/components/admin/council-documents.tsx
git commit -m "refactor(web): council-actions use revalidateTag(commune:slug); client invalidates"
```

---

## Task 5: `domain-actions.ts` — set/verify/remove custom domain + revalidateTag

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/domain-actions.ts`
- Modify: `apps/web/src/components/admin/domain-manager.tsx`

- [ ] **Step 1: Edit `domain-actions.ts`**

```ts
import { revalidateTag } from "next/cache";

// after each successful mutation in set/verify/remove:
revalidateTag(`commune:${slug}`); // slug comes from the action's own logic — it usually has it already
return { error: null };
```

Drop `revalidatePath` import + 3 calls.

- [ ] **Step 2: Update `domain-manager.tsx` to invalidate**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

const qc = useQueryClient();
// after each successful action call:
qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
```

- [ ] **Step 3: Typecheck + manual smoke**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

Set a custom domain → admin reflects. Domain manager shows verified state correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/dashboard/domain-actions.ts apps/web/src/components/admin/domain-manager.tsx
git commit -m "refactor(web): domain-actions use revalidateTag; client invalidates"
```

---

## Task 6: `invite-actions.ts` — regenerate invite code (no public-site impact)

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/invite-actions.ts`
- Modify: `apps/web/src/components/admin/invite-code-manager.tsx`

- [ ] **Step 1: Edit `invite-actions.ts`**

```ts
// Drop revalidatePath import and the 1 call. No revalidateTag — invite codes are admin-only data, not visible on the public site.
```

- [ ] **Step 2: Update `invite-code-manager.tsx`**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

const qc = useQueryClient();
// after success
qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
```

The component is rendered twice in `dashboard-client.tsx` (in Dashboard tab and Commune tab). Both instances need `communeId` prop.

- [ ] **Step 3: Typecheck + manual smoke**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

Regenerate the invite code → new code displays in <100ms.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/dashboard/invite-actions.ts apps/web/src/components/admin/invite-code-manager.tsx
git commit -m "refactor(web): invite-actions drop revalidatePath; client invalidates commune"
```

---

## Task 7: `theme-actions.ts` — replace the `revalidatePath("/", "layout")` blast

The most consequential single change in P5b. Today this nukes the entire app's page cache. After P5b it just invalidates the affected commune.

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/theme-actions.ts`
- Modify: `apps/web/src/components/admin/theme-customizer.tsx`

- [ ] **Step 1: Edit `theme-actions.ts`**

```ts
import { revalidateTag } from "next/cache";

// after each successful theme/color/logo update:
revalidateTag(`commune:${slug}`);
return { error: null };
```

Drop the 3× `revalidatePath("/", "layout")` calls + the import.

- [ ] **Step 2: Update `theme-customizer.tsx`**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

const qc = useQueryClient();
// after each successful action
qc.invalidateQueries({ queryKey: queryKeys.commune(communeId) });
```

The component receives the new commune snapshot via the cache after invalidation. The CSS theme variables get re-injected via `<ThemeInjector>` on the next render of `dashboard-client.tsx` (it reads commune from the same cache).

- [ ] **Step 3: Typecheck + manual smoke**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

Change theme color in `/admin/dashboard` → admin pages update colors instantly. Open public commune site in a separate tab → new color appears on next request.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/dashboard/theme-actions.ts apps/web/src/components/admin/theme-customizer.tsx
git commit -m "refactor(web): theme-actions use revalidateTag(commune:slug); drop the layout-blast revalidatePath"
```

---

## Task 8: `producer-actions.ts` — approve/reject (no public-site impact)

**Files:**
- Modify: `apps/web/src/app/admin/producer-actions.ts`
- Modify: `apps/web/src/components/admin/pending-producers.tsx`

- [ ] **Step 1: Edit `producer-actions.ts`**

Drop import + 2× `revalidatePath` calls.

- [ ] **Step 2: Update `pending-producers.tsx`**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

const qc = useQueryClient();
// after each successful approve/reject
qc.invalidateQueries({ queryKey: queryKeys.admin.pendingProducers(communeId) });
qc.invalidateQueries({ queryKey: queryKeys.producers(communeId) });
```

The first invalidation removes the row from the pending list; the second refreshes the active producers list (consumed by `/app/producteurs`).

- [ ] **Step 3: Typecheck + manual smoke**

Approve a pending producer → row vanishes in ~80ms. Visit `/app/producteurs` → producer appears.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/producer-actions.ts apps/web/src/components/admin/pending-producers.tsx
git commit -m "refactor(web): producer-actions drop revalidatePath; client invalidates pending + producers"
```

---

## Task 9: `homepage/actions.ts` — section CRUD + revalidateTag

**Files:**
- Modify: `apps/web/src/app/admin/homepage/actions.ts`
- Modify: `apps/web/src/app/admin/homepage/homepage-editor.tsx`

- [ ] **Step 1: Edit `homepage/actions.ts`**

```ts
import { revalidateTag } from "next/cache";

// after each successful CRUD action (create/update/delete/reorder):
const { data: commune } = await supabase
  .from("communes").select("slug").eq("id", profile.commune_id).single();
if (commune?.slug) revalidateTag(`commune:${commune.slug}`);
return { error: null };
```

Drop the 4× `revalidatePath("/admin/homepage")` calls + the import.

- [ ] **Step 2: Update `homepage-editor.tsx`**

The editor calls actions on every section save / reorder / delete. After each, invalidate:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

// inside the editor (it'll need communeId — pass from homepage-client.tsx)
const qc = useQueryClient();
// after each successful action
qc.invalidateQueries({ queryKey: queryKeys.admin.homepageSections(communeId) });
```

`homepage-client.tsx` will need to pass `communeId` to `<HomepageEditor>`.

- [ ] **Step 3: Typecheck + manual smoke**

```bash
pnpm --filter @rural-community-platform/web typecheck
```

Edit a section → save → editor reflects in <100ms. Open public commune site → section change appears.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/homepage/actions.ts apps/web/src/app/admin/homepage/homepage-editor.tsx apps/web/src/app/admin/homepage/homepage-client.tsx
git commit -m "refactor(web): homepage-actions use revalidateTag; editor invalidates sections cache"
```

---

## Task 10: Pending users approval flow

`pending-users.tsx` already calls `approveUser`/`rejectUser` (from `dashboard/actions.ts` already cleaned in Task 2 — confirm). Add the missing invalidation.

**Files:**
- Modify: `apps/web/src/components/admin/pending-users.tsx`

- [ ] **Step 1: Add invalidation after approve/reject success**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";

const qc = useQueryClient();
// after each successful action
qc.invalidateQueries({ queryKey: queryKeys.admin.pendingUsers(communeId) });
qc.invalidateQueries({ queryKey: queryKeys.admin.members(communeId) });
```

The approval moves a row from "pending" to "members" — both lists invalidate.

- [ ] **Step 2: Typecheck + manual smoke**

Approve a pending user → row vanishes in ~80ms; member list updates.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/pending-users.tsx
git commit -m "refactor(web): pending-users approve/reject invalidates pending + members caches"
```

---

## Task 11: Final sweep — grep for stragglers

Catch any `revalidatePath` we missed across `apps/web/src/app/admin/`. Should return zero matches.

- [ ] **Step 1: Grep**

```bash
grep -rn "revalidatePath" apps/web/src/app/admin/
```

Expected: **no output**.

If anything shows up, edit that file inline (drop the import + call), commit with `refactor(web): drop straggler revalidatePath in <file>`.

- [ ] **Step 2: Run full test suite**

```bash
pnpm --filter @rural-community-platform/web typecheck
pnpm --filter @rural-community-platform/web test:components
```

Both should be green.

- [ ] **Step 3: Commit if any straggler fixes**

If clean already, no commit needed.

---

## Task 12: Manual smoke test of P5b

User-run end-to-end validation.

- [ ] **Step 1: Start the stack**

```bash
npx supabase start
pnpm --filter @rural-community-platform/web dev
```

- [ ] **Step 2: Walk through each mutation path**

Sign in as admin (`secretaire@saintmedard64.fr` / `demo1234`).

For each of these, time the perceived latency (clock starts when you click, stops when the row updates):

1. Pin/unpin a post in Dashboard → Publications tab.
2. Hide/unhide a post.
3. Approve a pending user (need to seed a pending one first via signup).
4. Approve a pending producer.
5. Save a new contact email in Commune tab.
6. Add an association.
7. Upload a council document.
8. Set the theme color to a different value.
9. Regenerate invite code.
10. Set/remove custom domain.
11. Edit a homepage section, save.

Expect each to feel ~80–200ms (vs the previous 400ms+). No full-page rerenders.

- [ ] **Step 3: Verify public-site invalidation works**

Open the public commune site at `/saint-medard-64` in a private window. Note the current theme color and contact info.

In your admin tab: change the theme color, save. Wait 2 seconds. Refresh the private window. New color should appear.

If the public site still shows the old color after 5 seconds, file a bug — the `revalidateTag` isn't firing. Likely a Turbopack regression; cross-reference Task 1 of P5a (the smoke test).

- [ ] **Step 4: Verify no stragglers**

```bash
grep -rn "revalidatePath" apps/web/src/app/admin/ packages/shared/src/
```

Expected: zero matches in admin paths. (Other places like `auth/signup/page.tsx` may legitimately use it — only admin/* should be empty.)

- [ ] **Step 5: Report**

If any step fails: open a follow-up task. If all pass: P5b is done. Update `CLAUDE.md` "Current Status" and the P-phase note. Then P5 (a+b) is complete.

---

## Self-review checklist (controller)

- ✅ Spec coverage: all 8 action files refactored; 32 `revalidatePath` calls removed; `revalidateTag` added to the 5 action files that affect the public site (commune, council, domain, theme, homepage).
- ✅ Type consistency: query key invocations use the same `queryKeys.admin.*` and `queryKeys.commune` helpers from P5a.
- ✅ No placeholders.
- ⚠️ Tasks 3–9 each say "Component needs `communeId` as a prop. If it doesn't already have it, add it." Implementer should verify each component's current prop shape before assuming. The prop drilling from `dashboard-client.tsx` is straightforward but easy to miss for one of the 8.
