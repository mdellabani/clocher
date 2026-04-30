# P0 — React Query Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the React Query infrastructure on web (provider, helpers, query-key registry, test utilities, base skeleton) so subsequent phases (P1 Feed → P5 Admin) can migrate pages one at a time without redoing plumbing.

**Architecture:** React Query `^5.62.0` (matches mobile). `QueryClientProvider` scoped to `/app/*` and `/admin/*` layouts only — public pages stay lean. Query-key registry lives in `packages/shared` so web and mobile cannot drift. Server prefetch helper produces a dehydrated state to pass into a `<HydrationBoundary>` from each future `page.tsx`. **P0 ships zero behavioral change** — no page is migrated in this phase; only the wiring is added.

**Tech Stack:** Next.js 16 App Router, React 19, `@tanstack/react-query` ^5.62.0, Vitest + Testing Library (`@testing-library/react`), pnpm workspaces, Turborepo.

**Spec reference:** `docs/superpowers/specs/2026-04-17-app-client-side-data-design.md` — sections "Detailed design / 1 Query client setup", "2 Server-side prefetch helper", "3 Query key conventions".

**Out of scope for P0:** page migrations, hook layer (`usePosts`, `useProfile`, etc.), realtime upgrade, server-action invalidation changes, loading.tsx files. All added in later phases.

---

## File structure

**Create:**
- `packages/shared/src/query-keys.ts` — hierarchical query-key registry (platform-agnostic).
- `apps/web/src/lib/query/client.ts` — `makeQueryClient()` factory with project defaults.
- `apps/web/src/lib/query/prefetch.ts` — `prefetchAndDehydrate()` helper for server components.
- `apps/web/src/components/providers/query-provider.tsx` — client-side `<QueryClientProvider>` wrapper.
- `apps/web/src/components/ui/skeleton.tsx` — base skeleton primitive (Tailwind).
- `apps/web/tests/components/query-provider.test.tsx` — smoke test: provider exposes a client to children.
- `apps/web/tests/query/client.test.ts` — unit test: `makeQueryClient()` defaults.
- `apps/web/tests/query/prefetch.test.ts` — unit test: `prefetchAndDehydrate()` round-trips.
- `apps/web/tests/query/keys.test.ts` — unit test: query-key registry is stable and hierarchical.
- `apps/web/tests/helpers/render-with-query.tsx` — shared test utility for future component tests that need a `QueryClientProvider`.

**Modify:**
- `apps/web/package.json` — add `@tanstack/react-query` dependency.
- `packages/shared/src/index.ts` — export `queryKeys` from `./query-keys`.
- `apps/web/src/app/app/layout.tsx` — wrap children in `<QueryProvider>`.
- `apps/web/src/app/admin/layout.tsx` — wrap children in `<QueryProvider>`.
- `apps/web/vitest.config.ts` — extend `include` glob to pick up `tests/query/**/*.test.ts`.

**Do not touch in P0:**
- `apps/web/src/app/app/feed/**` — migrated in P1.
- `apps/web/src/app/app/*/actions.ts` — `revalidatePath` calls stay until their page is migrated.
- `packages/shared/src/queries/*` — unchanged; consumed by both server prefetch and future `useQuery` hooks as-is.

---

## Task 1: Add React Query dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install React Query matching mobile's version**

Run from repo root:

```bash
pnpm add --filter @pretou/web @tanstack/react-query@^5.62.0
```

- [ ] **Step 2: Verify install**

Run:

```bash
grep '"@tanstack/react-query"' apps/web/package.json
```

Expected output: `"@tanstack/react-query": "^5.62.0",`

- [ ] **Step 3: Typecheck the web workspace**

Run:

```bash
pnpm --filter @pretou/web typecheck
```

Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add @tanstack/react-query ^5.62.0 to match mobile"
```

---

## Task 2: Query-key registry in shared package (TDD)

**Files:**
- Create: `packages/shared/src/query-keys.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/web/tests/query/keys.test.ts`
- Modify: `apps/web/vitest.config.ts` (extend `include`)

- [ ] **Step 1: Extend vitest include so new test dir is picked up**

Edit `apps/web/vitest.config.ts`. Change the `include` line from:

```ts
include: ["tests/components/**/*.test.{ts,tsx}"],
```

to:

```ts
include: ["tests/components/**/*.test.{ts,tsx}", "tests/query/**/*.test.ts", "tests/helpers/**/*.test.{ts,tsx}"],
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/tests/query/keys.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { queryKeys } from "@pretou/shared";

describe("queryKeys", () => {
  it("produces hierarchical post list keys partitioned by commune", () => {
    const a = queryKeys.posts.list("commune-1");
    const b = queryKeys.posts.list("commune-2");
    expect(a[0]).toBe("posts");
    expect(a[1]).toBe("commune-1");
    expect(b[1]).toBe("commune-2");
  });

  it("distinguishes list vs detail vs pinned for the same commune", () => {
    const list = queryKeys.posts.list("c");
    const pinned = queryKeys.posts.pinned("c");
    const detail = queryKeys.posts.detail("post-1");
    expect(list).not.toEqual(pinned);
    expect(list).not.toEqual(detail);
    expect(pinned).not.toEqual(detail);
  });

  it("includes filter object in the list key so invalidation can be scoped", () => {
    const unfiltered = queryKeys.posts.list("c");
    const filtered = queryKeys.posts.list("c", { types: ["annonce"] });
    expect(unfiltered).not.toEqual(filtered);
  });

  it("partitions profile keys by user id", () => {
    expect(queryKeys.profile("user-1")).not.toEqual(queryKeys.profile("user-2"));
    expect(queryKeys.profile("user-1")[0]).toBe("profile");
  });

  it("returns a tuple-like readonly array", () => {
    const key = queryKeys.commune("c-1");
    expect(Array.isArray(key)).toBe(true);
    expect(key).toEqual(["commune", "c-1"]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
pnpm --filter @pretou/web test:components -- keys.test
```

Expected: FAIL — `queryKeys` is not exported from `@pretou/shared`.

- [ ] **Step 4: Implement the registry**

Create `packages/shared/src/query-keys.ts`:

```ts
export type PostFilters = {
  types?: string[];
  date?: string;
  communeIds?: string[];
  scope?: "commune" | "epci";
};

export const queryKeys = {
  posts: {
    list: (communeId: string, filters?: PostFilters) =>
      ["posts", communeId, filters ?? {}] as const,
    pinned: (communeId: string) => ["posts", "pinned", communeId] as const,
    detail: (postId: string) => ["posts", "detail", postId] as const,
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
  reports: {
    pending: (communeId: string) => ["reports", "pending", communeId] as const,
  },
} as const;
```

- [ ] **Step 5: Export from the shared barrel**

Edit `packages/shared/src/index.ts`. Add a new line after the existing exports:

```ts
export { queryKeys } from "./query-keys";
export type { PostFilters } from "./query-keys";
```

- [ ] **Step 6: Run the test to verify it passes**

Run:

```bash
pnpm --filter @pretou/web test:components -- keys.test
```

Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/query-keys.ts packages/shared/src/index.ts \
        apps/web/tests/query/keys.test.ts apps/web/vitest.config.ts
git commit -m "feat(shared): query-key registry for React Query callers"
```

---

## Task 3: `makeQueryClient` factory (TDD)

**Files:**
- Create: `apps/web/src/lib/query/client.ts`
- Create: `apps/web/tests/query/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/query/client.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeQueryClient } from "@/lib/query/client";

describe("makeQueryClient", () => {
  it("applies a 5-minute staleTime default", () => {
    const qc = makeQueryClient();
    const defaults = qc.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(1000 * 60 * 5);
  });

  it("applies a 30-minute gcTime default", () => {
    const qc = makeQueryClient();
    const defaults = qc.getDefaultOptions().queries;
    expect(defaults?.gcTime).toBe(1000 * 60 * 30);
  });

  it("retries twice on failure", () => {
    const qc = makeQueryClient();
    expect(qc.getDefaultOptions().queries?.retry).toBe(2);
  });

  it("does not refetch on window focus (we rely on Realtime for freshness)", () => {
    const qc = makeQueryClient();
    expect(qc.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it("returns a new instance each call", () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @pretou/web test:components -- client.test
```

Expected: FAIL — module `@/lib/query/client` not found.

- [ ] **Step 3: Implement the factory**

Create `apps/web/src/lib/query/client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --filter @pretou/web test:components -- client.test
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/query/client.ts apps/web/tests/query/client.test.ts
git commit -m "feat(web): makeQueryClient factory with project-wide defaults"
```

---

## Task 4: `prefetchAndDehydrate` helper (TDD)

**Files:**
- Create: `apps/web/src/lib/query/prefetch.ts`
- Create: `apps/web/tests/query/prefetch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/query/prefetch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";

describe("prefetchAndDehydrate", () => {
  it("returns a dehydrated state containing the prefetched query data", async () => {
    const state = await prefetchAndDehydrate(async (qc) => {
      await qc.prefetchQuery({
        queryKey: ["hello"],
        queryFn: async () => ({ greeting: "bonjour" }),
      });
    });

    // Dehydrated state shape: { queries: [...], mutations: [...] }
    expect(state).toHaveProperty("queries");
    expect(Array.isArray(state.queries)).toBe(true);
    const entry = state.queries.find((q) => JSON.stringify(q.queryKey) === JSON.stringify(["hello"]));
    expect(entry).toBeDefined();
    expect(entry?.state.data).toEqual({ greeting: "bonjour" });
  });

  it("awaits the caller's prefetch callback before dehydrating", async () => {
    let prefetchFinished = false;
    const state = await prefetchAndDehydrate(async (qc) => {
      await qc.prefetchQuery({
        queryKey: ["delayed"],
        queryFn: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return 42;
        },
      });
      prefetchFinished = true;
    });
    expect(prefetchFinished).toBe(true);
    const entry = state.queries.find((q) => JSON.stringify(q.queryKey) === JSON.stringify(["delayed"]));
    expect(entry?.state.data).toBe(42);
  });

  it("produces a cache-free state when no prefetch is performed", async () => {
    const state = await prefetchAndDehydrate(async () => {
      /* no-op */
    });
    expect(state.queries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @pretou/web test:components -- prefetch.test
```

Expected: FAIL — module `@/lib/query/prefetch` not found.

- [ ] **Step 3: Implement the helper**

Create `apps/web/src/lib/query/prefetch.ts`:

```ts
import { QueryClient, dehydrate, type DehydratedState } from "@tanstack/react-query";

export async function prefetchAndDehydrate(
  prefetchFn: (qc: QueryClient) => Promise<void>,
): Promise<DehydratedState> {
  const qc = new QueryClient();
  await prefetchFn(qc);
  return dehydrate(qc);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --filter @pretou/web test:components -- prefetch.test
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/query/prefetch.ts apps/web/tests/query/prefetch.test.ts
git commit -m "feat(web): prefetchAndDehydrate helper for server-side prefetch"
```

---

## Task 5: `QueryProvider` client component (TDD)

**Files:**
- Create: `apps/web/src/components/providers/query-provider.tsx`
- Create: `apps/web/tests/components/query-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/components/query-provider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/query-provider";

function Consumer() {
  const client = useQueryClient();
  return <div data-testid="stale">{String(client.getDefaultOptions().queries?.staleTime)}</div>;
}

describe("QueryProvider", () => {
  it("exposes a QueryClient to its children", () => {
    render(
      <QueryProvider>
        <Consumer />
      </QueryProvider>,
    );
    // makeQueryClient default is 5 minutes in ms.
    expect(screen.getByTestId("stale").textContent).toBe(String(1000 * 60 * 5));
  });

  it("renders children", () => {
    render(
      <QueryProvider>
        <span>child-content</span>
      </QueryProvider>,
    );
    expect(screen.getByText("child-content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @pretou/web test:components -- query-provider.test
```

Expected: FAIL — module `@/components/providers/query-provider` not found.

- [ ] **Step 3: Implement the provider**

Create `apps/web/src/components/providers/query-provider.tsx`:

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/query/client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures a stable client across re-renders; a new one is created
  // per mount so React 19 concurrent rendering doesn't accidentally share
  // state between simultaneous render attempts.
  const [client] = useState(() => makeQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --filter @pretou/web test:components -- query-provider.test
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/providers/query-provider.tsx \
        apps/web/tests/components/query-provider.test.tsx
git commit -m "feat(web): QueryProvider client wrapper scoped to authed layouts"
```

---

## Task 6: `renderWithQuery` test helper

**Files:**
- Create: `apps/web/tests/helpers/render-with-query.tsx`
- Create: `apps/web/tests/helpers/render-with-query.test.tsx`

This helper will be used by every component test in P1–P5 that renders a component reading from React Query. Build it once, here.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/helpers/render-with-query.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { renderWithQuery } from "./render-with-query";

function PostsBadge() {
  const { data } = useQuery<string[]>({
    queryKey: ["posts", "c1"],
    queryFn: async () => ["should-not-run"],
  });
  return <div>{(data ?? []).join(",")}</div>;
}

describe("renderWithQuery", () => {
  it("pre-seeds the cache so useQuery reads data synchronously without fetching", () => {
    renderWithQuery(<PostsBadge />, {
      cache: [{ key: ["posts", "c1"], data: ["hello", "world"] }],
    });
    expect(screen.getByText("hello,world")).toBeInTheDocument();
  });

  it("renders without any seeded data when cache is omitted", () => {
    renderWithQuery(<div data-testid="plain">ok</div>);
    expect(screen.getByTestId("plain")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @pretou/web test:components -- render-with-query.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `apps/web/tests/helpers/render-with-query.tsx`:

```tsx
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

type SeededQuery = { key: readonly unknown[]; data: unknown };

export type RenderWithQueryOptions = RenderOptions & {
  cache?: SeededQuery[];
};

export function renderWithQuery(ui: ReactElement, options: RenderWithQueryOptions = {}) {
  const { cache = [], ...renderOptions } = options;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  for (const { key, data } of cache) {
    client.setQueryData(key, data);
  }
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>, renderOptions);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --filter @pretou/web test:components -- render-with-query.test
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/helpers/render-with-query.tsx \
        apps/web/tests/helpers/render-with-query.test.tsx
git commit -m "test(web): renderWithQuery helper for cache-seeded component tests"
```

---

## Task 7: Base `Skeleton` primitive

**Files:**
- Create: `apps/web/src/components/ui/skeleton.tsx`
- Create: `apps/web/tests/components/skeleton.test.tsx`

Each migration phase (P1–P5) composes its own page-specific skeletons from this primitive. Ship the base here so each phase can import it.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/components/skeleton.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a div with the pulsing class", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div).not.toBeNull();
    expect(div.className).toContain("animate-pulse");
  });

  it("merges consumer className over defaults", () => {
    const { container } = render(<Skeleton className="h-10 w-40" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("h-10");
    expect(div.className).toContain("w-40");
    expect(div.className).toContain("animate-pulse");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @pretou/web test:components -- skeleton.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the primitive**

Create `apps/web/src/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}
```

The `cn` helper is already exported from `apps/web/src/lib/utils.ts` (verified during plan-writing — it uses `clsx` + `tailwind-merge` in the standard shadcn way), so the import above works with no extra setup.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --filter @pretou/web test:components -- skeleton.test
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/skeleton.tsx \
        apps/web/tests/components/skeleton.test.tsx
git commit -m "feat(web): Skeleton primitive for loading states"
```

---

## Task 8: Wrap `/app` layout in QueryProvider

**Files:**
- Modify: `apps/web/src/app/app/layout.tsx`

Current file (reference):

```tsx
import { NavBar } from "@/components/nav-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--theme-background)]">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 1: Modify the layout**

Replace the entire contents of `apps/web/src/app/app/layout.tsx` with:

```tsx
import { NavBar } from "@/components/nav-bar";
import { QueryProvider } from "@/components/providers/query-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-[var(--theme-background)]">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </QueryProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm --filter @pretou/web typecheck
```

Expected: exits 0.

- [ ] **Step 3: Smoke-run component tests (ensure NavBar tests still pass inside a wrapped tree)**

Run:

```bash
pnpm --filter @pretou/web test:components
```

Expected: all green. None of the existing tests render `AppLayout` directly, so wrapping should be inert.

- [ ] **Step 4: Start dev server and navigate `/app/feed` manually**

Run:

```bash
pnpm --filter @pretou/web dev
```

Open `http://localhost:3000/app/feed`. Log in. Confirm: page renders exactly as before, no console errors, no hydration warnings. Close dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/layout.tsx
git commit -m "feat(web): wrap /app layout in QueryProvider (no behavioral change)"
```

---

## Task 9: Wrap `/admin` layout in QueryProvider

**Files:**
- Modify: `apps/web/src/app/admin/layout.tsx`

Current file (reference):

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@pretou/shared";
import { NavBar } from "@/components/nav-bar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");
  return (
    <div className="min-h-screen bg-[var(--theme-background)]">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 1: Modify the layout**

Replace the entire contents of `apps/web/src/app/admin/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@pretou/shared";
import { NavBar } from "@/components/nav-bar";
import { QueryProvider } from "@/components/providers/query-provider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");
  return (
    <QueryProvider>
      <div className="min-h-screen bg-[var(--theme-background)]">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </QueryProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm --filter @pretou/web typecheck
```

Expected: exits 0.

- [ ] **Step 3: Start dev server and navigate `/admin/dashboard` manually**

Run:

```bash
pnpm --filter @pretou/web dev
```

Open `http://localhost:3000/admin/dashboard` while logged in as an admin. Confirm: page renders exactly as before, no console errors, no hydration warnings. Close dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/layout.tsx
git commit -m "feat(web): wrap /admin layout in QueryProvider (no behavioral change)"
```

---

## Task 10: Full verification pass

**Files:** none modified.

- [ ] **Step 1: Full web test suite (component)**

Run:

```bash
pnpm --filter @pretou/web test:components
```

Expected: all green. Counts include the five new tests from Tasks 2–7 (keys, client, prefetch, provider, helper, skeleton).

- [ ] **Step 2: Full web typecheck**

Run:

```bash
pnpm --filter @pretou/web typecheck
```

Expected: exits 0.

- [ ] **Step 3: Full web build**

Run:

```bash
pnpm --filter @pretou/web build
```

Expected: exits 0, no new warnings other than pre-existing ones.

- [ ] **Step 4: Integration suite (smoke — nothing changed but verify nothing broke)**

Ensure local Supabase is running:

```bash
npx supabase start
```

Then:

```bash
pnpm --filter @pretou/web test:integration
```

Expected: all green.

- [ ] **Step 5: Final manual smoke test**

Run:

```bash
pnpm --filter @pretou/web dev
```

Visit, in this order, confirming each page loads with no console errors:

1. `http://localhost:3000/` — landing page (no QueryProvider; should be completely unchanged).
2. `http://localhost:3000/app/feed` — has QueryProvider now; should look & behave identical to before.
3. `http://localhost:3000/admin/dashboard` — has QueryProvider now; identical behavior.

Close dev server.

- [ ] **Step 6: Update CLAUDE.md with a one-liner about the new pattern**

Edit `CLAUDE.md`. Under "Key Conventions", append:

```markdown
- **Client-side data (authed routes):** `/app/*` and `/admin/*` are wrapped in `QueryProvider` (React Query). Shared query keys live in `packages/shared/src/query-keys.ts`; use `prefetchAndDehydrate()` from `apps/web/src/lib/query/prefetch.ts` in server components to hydrate the client cache. Public routes (`/`, `/[commune-slug]/*`) stay pure SSR.
```

- [ ] **Step 7: Commit docs**

```bash
git add CLAUDE.md
git commit -m "docs: note React Query pattern for authed routes"
```

---

## Done when

- All ten tasks committed.
- `pnpm --filter @pretou/web test` (runs components + integration) passes.
- Manual smoke of `/`, `/app/feed`, `/admin/dashboard` shows no regression.
- No page has been migrated — P0 is purely scaffolding. Migrations begin in P1.

## Notes for P1 (next plan)

- P1 migrates `/app/feed` end-to-end using the primitives from this plan. The plan will:
  - Rename `apps/web/src/app/app/feed/page.tsx` concerns into a thin server shell + a `feed-client.tsx` (`'use client'`).
  - Replace the sequential queries with `prefetchAndDehydrate` + `usePosts` / `useProfile` hooks.
  - Add `apps/web/src/app/app/feed/loading.tsx`.
  - Introduce `use-realtime-posts.ts` hook and delete the `router.refresh()` path in the feed.
  - Remove `revalidatePath("/app/feed")` calls in `actions.ts`; replace with client-side `queryClient.invalidateQueries`.
- Do **not** start P1 until this plan is merged and verified in production or a preview deploy.
