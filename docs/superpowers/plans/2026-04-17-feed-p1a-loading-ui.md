# P1a — `/app/feed` Loading UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the "URL freezes before it changes" symptom when users navigate to `/app/feed` by adding a route-level `loading.tsx` with a skeleton that matches the feed layout. No data-fetching changes; no architectural changes. Pure UX win.

**Architecture:** Next.js App Router `loading.tsx` renders automatically during the server-render transition of the corresponding `page.tsx`. The skeleton composes the `Skeleton` primitive (shipped in P0) into page-shaped placeholders (header row, scope toggle, filters bar, post-card stubs). Survives all future phases — `loading.tsx` still shows on cold navigation to the route (before the client bundle and hydrated cache are ready).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, Vitest + Testing Library.

**Spec reference:** `docs/superpowers/specs/2026-04-17-app-client-side-data-design.md` — section "7. `loading.tsx` files".

**Out of scope for P1a:** Data-fetching changes, hooks, React Query consumption, realtime, mutation invalidation, thin-shell refactor. All handled in P1b and P1c.

**User-visible outcome after merge:** Clicking any nav link toward `/app/feed` makes the URL change instantly; the page area shows a pulsing skeleton matching the final layout until the server response arrives. No more frozen tabs.

---

## File structure

**Create:**
- `apps/web/src/components/skeletons/post-card-skeleton.tsx` — one placeholder card, mirrors `PostCard` proportions (avatar + title + body lines + image slot).
- `apps/web/src/components/skeletons/feed-skeleton.tsx` — full page skeleton: title row, scope toggle, filters bar, 3× `PostCardSkeleton`.
- `apps/web/src/app/app/feed/loading.tsx` — Next App Router loading file; just renders `<FeedSkeleton />`.
- `apps/web/tests/components/post-card-skeleton.test.tsx` — snapshot-ish test that card skeleton renders 4-ish `Skeleton` descendants with expected shape classes.
- `apps/web/tests/components/feed-skeleton.test.tsx` — renders 3 post card skeletons and the layout scaffolding.

**Do not touch:**
- `apps/web/src/app/app/feed/page.tsx`, `feed-content.tsx`, `actions.ts`, `load-more-action.ts`. All stay as-is until P1b.

---

## Task 1: `PostCardSkeleton` component (TDD)

**Files:**
- Create: `apps/web/src/components/skeletons/post-card-skeleton.tsx`
- Create: `apps/web/tests/components/post-card-skeleton.test.tsx`

**Rationale for the shape:** mirrors the real `PostCard`'s visible layout — header row (avatar + two lines of metadata), title, two body lines. Keeping the skeleton's vertical rhythm close to the real card prevents layout shift when the data lands.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/components/post-card-skeleton.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostCardSkeleton } from "@/components/skeletons/post-card-skeleton";

describe("PostCardSkeleton", () => {
  it("renders a card-shaped outer container", () => {
    const { container } = render(<PostCardSkeleton />);
    const outer = container.firstChild as HTMLElement;
    expect(outer).not.toBeNull();
    expect(outer.className).toContain("rounded-xl");
    expect(outer.className).toContain("border");
  });

  it("contains a round avatar placeholder plus at least three text bars", () => {
    const { container } = render(<PostCardSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(4);
    // At least one of the pulsing elements is a circle (avatar).
    const hasCircle = Array.from(pulses).some((el) =>
      (el as HTMLElement).className.includes("rounded-full"),
    );
    expect(hasCircle).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
pnpm --filter @pretou/web test:components -- post-card-skeleton.test
```

Expected: FAIL with "module not found" for `@/components/skeletons/post-card-skeleton`.

- [ ] **Step 3: Implement the component**

Create `apps/web/src/components/skeletons/post-card-skeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function PostCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border bg-[var(--card)] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

- [ ] **Step 4: Run the test — expect PASS (2 tests)**

```bash
pnpm --filter @pretou/web test:components -- post-card-skeleton.test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/skeletons/post-card-skeleton.tsx \
        apps/web/tests/components/post-card-skeleton.test.tsx
git commit -m "feat(web): PostCardSkeleton matching real post card shape"
```

---

## Task 2: `FeedSkeleton` component (TDD)

**Files:**
- Create: `apps/web/src/components/skeletons/feed-skeleton.tsx`
- Create: `apps/web/tests/components/feed-skeleton.test.tsx`

**Rationale:** mirrors the real `FeedPage`'s top-level structure: title + create-button row → scope toggle → filters bar → 3 post-card placeholders. Three cards is enough to fill above-the-fold without looking empty.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/components/feed-skeleton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedSkeleton } from "@/components/skeletons/feed-skeleton";

describe("FeedSkeleton", () => {
  it("renders exactly three post-card skeletons", () => {
    const { container } = render(<FeedSkeleton />);
    const cards = container.querySelectorAll("[data-testid='post-card-skeleton']");
    expect(cards.length).toBe(3);
  });

  it("renders a header row with a title placeholder and a button placeholder", () => {
    const { container } = render(<FeedSkeleton />);
    const headerRow = container.querySelector("[data-testid='feed-skeleton-header']");
    expect(headerRow).not.toBeNull();
    expect((headerRow as HTMLElement).className).toContain("flex");
    // Two direct-child placeholders in the header row.
    expect(headerRow!.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(2);
  });

  it("renders a scope-toggle placeholder row and a filters-bar placeholder", () => {
    render(<FeedSkeleton />);
    expect(screen.getByTestId("feed-skeleton-scope")).toBeInTheDocument();
    expect(screen.getByTestId("feed-skeleton-filters")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
pnpm --filter @pretou/web test:components -- feed-skeleton.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Update PostCardSkeleton to carry a testid (so FeedSkeleton tests can count them)**

Edit `apps/web/src/components/skeletons/post-card-skeleton.tsx`. Change the outer `<div>` to:

```tsx
<div data-testid="post-card-skeleton" className="space-y-3 rounded-xl border bg-[var(--card)] p-4">
```

Re-run the PostCardSkeleton test to confirm it still passes:

```bash
pnpm --filter @pretou/web test:components -- post-card-skeleton.test
```

Expected: still 2 passing.

- [ ] **Step 4: Implement FeedSkeleton**

Create `apps/web/src/components/skeletons/feed-skeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { PostCardSkeleton } from "@/components/skeletons/post-card-skeleton";

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      <div data-testid="feed-skeleton-header" className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div data-testid="feed-skeleton-scope" className="flex gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>

      <Skeleton data-testid="feed-skeleton-filters" className="h-10 w-full" />

      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test — expect PASS (3 tests)**

```bash
pnpm --filter @pretou/web test:components -- feed-skeleton.test
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/skeletons/feed-skeleton.tsx \
        apps/web/src/components/skeletons/post-card-skeleton.tsx \
        apps/web/tests/components/feed-skeleton.test.tsx
git commit -m "feat(web): FeedSkeleton matching /app/feed layout"
```

---

## Task 3: `loading.tsx` for `/app/feed`

**Files:**
- Create: `apps/web/src/app/app/feed/loading.tsx`

Next.js App Router convention: when a `loading.tsx` file exists in a route segment, it renders automatically while the corresponding `page.tsx` is suspended (i.e. during server render of the new navigation).

- [ ] **Step 1: Create the file**

Create `apps/web/src/app/app/feed/loading.tsx`:

```tsx
import { FeedSkeleton } from "@/components/skeletons/feed-skeleton";

export default function Loading() {
  return <FeedSkeleton />;
}
```

That's the whole file. No logic, no auth check (Next runs loading.tsx inside the existing layout tree, so the layout's auth guard has already redirected if necessary).

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @pretou/web typecheck
```

Expected: exit 0.

- [ ] **Step 3: Build**

```bash
pnpm --filter @pretou/web build
```

Expected: `✓ Compiled successfully`. The route list should now show `/app/feed` as before (loading.tsx doesn't change the route).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/feed/loading.tsx
git commit -m "feat(web): add loading.tsx for /app/feed (instant skeleton on nav)"
```

---

## Task 4: Full verification + manual smoke

**Files:** none modified.

- [ ] **Step 1: Full component suite**

```bash
pnpm --filter @pretou/web test:components
```

Expected: all green. Pre-existing 39 + 5 new = 44 tests.

- [ ] **Step 2: Integration suite**

Ensure local Supabase is running (`npx supabase status`); if stopped, run `npx supabase start`. Then:

```bash
pnpm --filter @pretou/web test:integration
```

Expected: all green (36 tests).

- [ ] **Step 3: Typecheck + build (sanity re-run)**

```bash
pnpm --filter @pretou/web typecheck && \
pnpm --filter @pretou/web build
```

Expected: both exit 0.

- [ ] **Step 4: Manual smoke — the whole point of this phase**

```bash
pnpm --filter @pretou/web dev
```

In the browser:

1. Log in to `/app/feed`.
2. Click the nav bar link to `/app/infos-pratiques`, then click back to `/app/feed`.
3. **Observe:** the URL should change to `/app/feed` instantly; the skeleton (3 pulsing cards + header placeholders) should appear immediately; the real content should swap in when the server response arrives.
4. Also test: a slow-network simulation (Chrome DevTools → Network → "Slow 3G"). The skeleton should be visible for longer; it should never render as a blank page.
5. Test: hard refresh on `/app/feed`. Initial render should show the real page (loading.tsx is for *transitions*, not cold loads — the initial HTML is `page.tsx`'s output).

Close dev server.

- [ ] **Step 5: No commit needed (verification only)**

---

## Done when

- All 4 tasks committed (3 commits + 1 verification pass).
- Component suite passes (44 tests).
- Manual smoke confirms URL changes instantly and skeleton appears.
- No regression in existing tests.

## Notes for P1b

P1b will refactor `page.tsx` into a thin server shell and move feed rendering to a client component consuming `useQuery`. At that point, `loading.tsx` starts mattering more: the first cold navigation shows the skeleton during code-split + hydration. Subsequent navigations with cached data skip the skeleton entirely because React Query returns cached data synchronously. So this `loading.tsx` is not throwaway — it fills the exact gap that cached nav can't cover (cold loads / hard refreshes).
