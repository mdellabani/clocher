# P3 — Events & Producers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate `/app/evenements` and `/app/producteurs` to the thin-shell + React Query pattern. Both are simple commune-scoped list pages (no pagination, no realtime needed, no complex filters). Producer creation flow (dialog) moves from `revalidatePath` to client-side `invalidateQueries`.

**Architecture:** Same pattern as P1b/P2. Server pages auth-guard + prefetch a single list query into `HydrationBoundary`. Client components consume hooks and render. The producer create dialog invalidates the producers query key after the server action returns.

**Tech Stack:** Next.js 16 App Router, React 19, `@tanstack/react-query` ^5.62.0.

**Spec reference:** `docs/superpowers/specs/2026-04-17-app-client-side-data-design.md` — phase P3.

**Dependencies:** P0, P1 (a/b/c), P2 merged.

**Out of scope for P3:** `/app/posts/[id]` (P4), `/admin/*` (P5), realtime for events/producers (deferred — low change frequency), any mutation beyond the single producer-create flow, mobile migration.

**User-visible outcome:** Both pages feel instant on return navigation. First visit shows a page-shaped skeleton. Producer creation flow: submit → close dialog → new producer shows in admin pending queue without hard refresh (they still need admin approval; after approval in `/admin/dashboard`, the `revalidatePath` there keeps working since admin isn't migrated yet).

---

## File structure

**Create:**
- `apps/web/src/hooks/queries/use-events.ts` + test.
- `apps/web/src/hooks/queries/use-producers.ts` + test.
- `apps/web/src/app/app/evenements/loading.tsx`
- `apps/web/src/app/app/evenements/events-client.tsx` — absorbs events-content.tsx, reads via `useEvents`.
- `apps/web/src/app/app/producteurs/loading.tsx`
- `apps/web/src/app/app/producteurs/producers-client.tsx` — wraps existing `ProducersContent` (which stays as-is) but reads producers via hook.
- Component tests for each client under `apps/web/tests/components/`.

**Modify:**
- `packages/shared/src/queries/posts.ts` — add `getEventsByCommune(client, communeId)` helper (narrow select for event listing).
- `packages/shared/src/queries/producers.ts` — add `getActiveProducersByCommune(client, communeId)` helper.
- `packages/shared/src/queries/index.ts` — re-export new helpers.
- `apps/web/src/app/app/evenements/page.tsx` — thin-shell refactor.
- `apps/web/src/app/app/producteurs/page.tsx` — thin-shell refactor.
- `apps/web/src/app/app/producteurs/actions.ts` — drop `revalidatePath("/app/producteurs")`.
- `apps/web/src/app/app/producteurs/create-producer-dialog.tsx` — add `useQueryClient().invalidateQueries(queryKeys.producers(communeId))` after successful action. Take `communeId` as prop.

**Delete:**
- `apps/web/src/app/app/evenements/events-content.tsx` — replaced by `events-client.tsx`.

**Do not touch in P3:**
- `producer-card.tsx`, `create-producer-dialog.tsx`'s form logic (only the success branch changes).
- `/admin/dashboard/page.tsx` — admin not migrated yet. If the pending-producers list there relies on `revalidatePath` from producer-create, it still works because the dashboard is still SSR.
- `ProducersContent` — renders the filtered producer list with search. Stays as-is; we just pass it the hook's data instead of props-from-server.

---

## Task 1: Shared query helpers (TDD with integration tests)

**Files:**
- Modify: `packages/shared/src/queries/posts.ts`
- Modify: `packages/shared/src/queries/producers.ts`
- Modify: `packages/shared/src/queries/index.ts`
- Create: `apps/web/tests/integration/shared-events-producers.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `apps/web/tests/integration/shared-events-producers.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, serviceClient, SEED_IDS, SEED_EMAILS, signInAs } from "./_fixtures";
import {
  getEventsByCommune,
  getActiveProducersByCommune,
} from "@pretou/shared";

describe("getEventsByCommune", () => {
  beforeEach(async () => {
    await resetData();
    const svc = serviceClient();
    await svc.from("posts").insert([
      { title: "__evt_future__", body: "x", type: "evenement", event_date: new Date(Date.now() + 7 * 86400_000).toISOString(), commune_id: SEED_IDS.commune, author_id: SEED_IDS.admin },
      { title: "__evt_past__", body: "x", type: "evenement", event_date: new Date(Date.now() - 7 * 86400_000).toISOString(), commune_id: SEED_IDS.commune, author_id: SEED_IDS.admin },
      { title: "__discussion__", body: "x", type: "discussion", commune_id: SEED_IDS.commune, author_id: SEED_IDS.resident },
    ]);
  });

  it("returns only posts with type evenement for the commune", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await getEventsByCommune(supabase, SEED_IDS.commune);
    expect(error).toBeNull();
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__evt_future__");
    expect(titles).toContain("__evt_past__");
    expect(titles).not.toContain("__discussion__");
  });
});

describe("getActiveProducersByCommune", () => {
  beforeEach(async () => {
    await resetData();
    const svc = serviceClient();
    await svc.from("producers").insert([
      { name: "__prod_active__", description: "x", categories: ["maraicher"], commune_id: SEED_IDS.commune, created_by: SEED_IDS.admin, status: "active" },
      { name: "__prod_pending__", description: "x", categories: ["maraicher"], commune_id: SEED_IDS.commune, created_by: SEED_IDS.resident, status: "pending" },
    ]);
  });

  it("returns only active producers for the commune", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await getActiveProducersByCommune(supabase, SEED_IDS.commune);
    expect(error).toBeNull();
    const names = (data ?? []).map((p) => p.name);
    expect(names).toContain("__prod_active__");
    expect(names).not.toContain("__prod_pending__");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @pretou/web test:integration -- shared-events-producers
```

- [ ] **Step 3: Add helpers**

Edit `packages/shared/src/queries/posts.ts`. Append at the end:

```ts
export async function getEventsByCommune(client: Client, communeId: string) {
  return client
    .from("posts")
    .select("id, title, body, type, event_date, event_location, created_at, profiles!author_id(display_name), rsvps(status)")
    .eq("commune_id", communeId)
    .eq("type", "evenement")
    .order("event_date", { ascending: true, nullsFirst: false });
}
```

Edit `packages/shared/src/queries/producers.ts`. Append at the end:

```ts
export async function getActiveProducersByCommune(client: Client, communeId: string) {
  return client
    .from("producers")
    .select("*, communes(name), profiles!created_by(display_name)")
    .eq("status", "active")
    .eq("commune_id", communeId)
    .order("name", { ascending: true });
}
```

Edit `packages/shared/src/queries/index.ts`. Update the posts re-export line to include the new helper:

```ts
export { getPosts, getPostById, createPost, deletePost, togglePinPost, getPostsByType, getPostsPaginated, getPinnedPosts, getEventsByCommune } from "./posts";
```

And the producers re-export line:

```ts
export { getProducers, getPendingProducers, createProducer, approveProducer, rejectProducer, deleteProducer, getActiveProducersByCommune } from "./producers";
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

```bash
pnpm --filter @pretou/web test:integration -- shared-events-producers
```

- [ ] **Step 5: Full integration suite stays green**

```bash
pnpm --filter @pretou/web test:integration
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/queries/posts.ts \
        packages/shared/src/queries/producers.ts \
        packages/shared/src/queries/index.ts \
        apps/web/tests/integration/shared-events-producers.test.ts
git commit -m "feat(shared): getEventsByCommune + getActiveProducersByCommune helpers"
```

---

## Task 2: `useEvents` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-events.ts`
- Create: `apps/web/tests/hooks/use-events.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-events.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useEvents } from "@/hooks/queries/use-events";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useEvents", () => {
  it("returns hydrated events without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.events("c-1"), [
      { id: "e-1", title: "Fête du village", type: "evenement" },
    ]);
    const { result } = renderHook(() => useEvents("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("e-1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useEvents(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-events.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getEventsByCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useEvents(communeId: string) {
  return useQuery({
    queryKey: queryKeys.events(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getEventsByCommune(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-events.ts \
        apps/web/tests/hooks/use-events.test.tsx
git commit -m "feat(web): useEvents hook"
```

---

## Task 3: `useProducers` hook (TDD)

**Files:**
- Create: `apps/web/src/hooks/queries/use-producers.ts`
- Create: `apps/web/tests/hooks/use-producers.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/hooks/use-producers.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useProducers } from "@/hooks/queries/use-producers";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useProducers", () => {
  it("returns hydrated producers without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.producers("c-1"), [
      { id: "p-1", name: "Ferme des tilleuls", status: "active" },
    ]);
    const { result } = renderHook(() => useProducers("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].name).toBe("Ferme des tilleuls");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useProducers(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Create `apps/web/src/hooks/queries/use-producers.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getActiveProducersByCommune, queryKeys } from "@pretou/shared";
import type { Producer } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useProducers(communeId: string) {
  return useQuery<Producer[]>({
    queryKey: queryKeys.producers(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getActiveProducersByCommune(supabase, communeId);
      if (error) throw error;
      return (data ?? []) as Producer[];
    },
    staleTime: 1000 * 60 * 15, // producers change rarely
    enabled: !!communeId,
  });
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/queries/use-producers.ts \
        apps/web/tests/hooks/use-producers.test.tsx
git commit -m "feat(web): useProducers hook with 15min staleTime"
```

---

## Task 4: Migrate `/app/evenements`

**Files:**
- Create: `apps/web/src/app/app/evenements/loading.tsx`
- Create: `apps/web/src/app/app/evenements/events-client.tsx`
- Modify: `apps/web/src/app/app/evenements/page.tsx`
- Delete: `apps/web/src/app/app/evenements/events-content.tsx`
- Create: `apps/web/tests/components/events-client.test.tsx`

### 4.1 — loading.tsx

- [ ] **Step 1: Create loading file**

Create `apps/web/src/app/app/evenements/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/skeletons/list-skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 w-full" />
      <ListSkeleton rows={4} />
    </div>
  );
}
```

### 4.2 — events-client.tsx (absorbs events-content)

First read the existing `events-content.tsx` to preserve its rendering logic:

```bash
cat apps/web/src/app/app/evenements/events-content.tsx
```

- [ ] **Step 2: Write component test**

Create `apps/web/tests/components/events-client.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@pretou/shared";
import { EventsClient } from "@/app/app/evenements/events-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/components/event-calendar", () => ({
  EventCalendar: () => <div data-testid="event-calendar" />,
}));

const profile = {
  id: "u-1",
  commune_id: "c-1",
  role: "resident",
  status: "active",
  display_name: "Marie",
  communes: { id: "c-1", name: "Saint-Martin" },
};

describe("EventsClient", () => {
  it("renders events from hydrated cache", () => {
    renderWithQuery(<EventsClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profile },
        {
          key: queryKeys.events("c-1"),
          data: [
            {
              id: "e-1",
              title: "Fête du village",
              body: "Venez nombreux !",
              type: "evenement",
              event_date: "2026-05-01T18:00:00Z",
              event_location: "Place de la mairie",
              created_at: "2026-04-17T00:00:00Z",
              profiles: { display_name: "Marie" },
              rsvps: [],
            },
          ],
        },
      ],
    });
    expect(screen.getByText(/Fête du village/i)).toBeInTheDocument();
  });

  it("shows empty state when no events", () => {
    renderWithQuery(<EventsClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profile },
        { key: queryKeys.events("c-1"), data: [] },
      ],
    });
    expect(screen.getByText(/Aucun/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — expect FAIL (module not found)**

- [ ] **Step 4: Create `events-client.tsx`**

Copy the entire rendering logic of the current `events-content.tsx` into the new file. Swap props-from-parent for hook reads. The existing file is 177 lines. Keep the same rendering (EventCalendar, upcoming/past split, RSVP counts) but pull events from `useEvents(profile.commune_id)` instead of a prop.

Create `apps/web/src/app/app/evenements/events-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, MessageCircle } from "lucide-react";
import { EventCalendar } from "@/components/event-calendar";
import { useProfile } from "@/hooks/queries/use-profile";
import { useEvents } from "@/hooks/queries/use-events";

interface EventPost {
  id: string;
  title: string;
  body: string | null;
  type: string;
  event_date: string | null;
  event_location: string | null;
  created_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
  rsvps: { status: string }[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function firstOrSame<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function EventsClient({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const { data: raw } = useEvents(profile?.commune_id ?? "");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  if (!profile) return null;

  const events = ((raw ?? []) as EventPost[]).map((e) => ({
    ...e,
    profiles: firstOrSame(e.profiles),
  }));

  const now = new Date();
  const upcoming = events.filter((e) => e.event_date && new Date(e.event_date) >= now);
  const past = events.filter((e) => e.event_date && new Date(e.event_date) < now);

  const visible = selectedDate
    ? events.filter((e) => {
        if (!e.event_date) return false;
        const d = new Date(e.event_date);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      })
    : upcoming;

  return (
    <div className="space-y-6">
      <EventCalendar
        events={events.map((e) => ({ id: e.id, event_date: e.event_date }))}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          {selectedDate
            ? `Événements du ${selectedDate.toLocaleDateString("fr-FR")}`
            : "Prochains événements"}
        </h2>
        {visible.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Aucun événement à afficher.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((e) => {
              const goingCount = e.rsvps.filter((r) => r.status === "going").length;
              return (
                <li key={e.id}>
                  <Link
                    href={`/app/posts/${e.id}`}
                    className="block rounded-xl border bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <h3 className="font-semibold text-[var(--foreground)]">{e.title}</h3>
                    {e.event_date && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <CalendarDays size={14} /> {formatDate(e.event_date)}
                      </p>
                    )}
                    {e.event_location && (
                      <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <MapPin size={14} /> {e.event_location}
                      </p>
                    )}
                    {goingCount > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <MessageCircle size={14} /> {goingCount} participant{goingCount > 1 ? "s" : ""}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!selectedDate && past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
            Événements passés
          </h2>
          <ul className="space-y-2">
            {past.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/app/posts/${e.id}`}
                  className="block rounded-xl border bg-white p-3 opacity-75 transition-shadow hover:opacity-100 hover:shadow-md"
                >
                  <h3 className="font-medium text-[var(--foreground)]">{e.title}</h3>
                  {e.event_date && (
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(e.event_date)}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run — expect PASS (2 tests)**

```bash
pnpm --filter @pretou/web test:components -- events-client
```

### 4.3 — Thin-shell page.tsx

- [ ] **Step 6: Replace `apps/web/src/app/app/evenements/page.tsx`**

```tsx
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getEventsByCommune,
  queryKeys,
} from "@pretou/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { EventsClient } from "./events-client";

export default async function EvenementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await qc.prefetchQuery({
      queryKey: queryKeys.events(profile.commune_id),
      queryFn: async () => {
        const { data } = await getEventsByCommune(supabase, profile.commune_id);
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
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Événements</h1>
      <div className="mt-4">
        <EventsClient userId={user.id} />
      </div>
    </HydrationBoundary>
  );
}
```

### 4.4 — Delete events-content.tsx

- [ ] **Step 7: Verify no imports remain then delete**

```bash
grep -rln "events-content\|EventsContent" apps/web/src/ apps/web/tests/
```

Expected: no results.

```bash
git rm apps/web/src/app/app/evenements/events-content.tsx
```

- [ ] **Step 8: Typecheck + tests**

```bash
pnpm --filter @pretou/web typecheck
pnpm --filter @pretou/web test:components
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/app/evenements/loading.tsx \
        apps/web/src/app/app/evenements/events-client.tsx \
        apps/web/src/app/app/evenements/page.tsx \
        apps/web/tests/components/events-client.test.tsx
git commit -m "feat(web): migrate /app/evenements to thin shell + React Query"
```

---

## Task 5: Migrate `/app/producteurs`

**Files:**
- Create: `apps/web/src/app/app/producteurs/loading.tsx`
- Create: `apps/web/src/app/app/producteurs/producers-client.tsx`
- Modify: `apps/web/src/app/app/producteurs/page.tsx`
- Modify: `apps/web/src/app/app/producteurs/actions.ts` — drop `revalidatePath`.
- Modify: `apps/web/src/app/app/producteurs/create-producer-dialog.tsx` — invalidate after success.
- Create: `apps/web/tests/components/producers-client.test.tsx`

### 5.1 — loading.tsx

- [ ] **Step 1: Create loading file**

Create `apps/web/src/app/app/producteurs/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/skeletons/list-skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-10 w-full" />
      <ListSkeleton rows={4} />
    </div>
  );
}
```

### 5.2 — producers-client.tsx (wraps existing ProducersContent)

`ProducersContent` already does the search/filter UI. We keep it unchanged; the new `producers-client` reads the list via hook and passes it to `ProducersContent`.

- [ ] **Step 2: Write component test**

Create `apps/web/tests/components/producers-client.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@pretou/shared";
import { ProducersClient } from "@/app/app/producteurs/producers-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const profile = {
  id: "u-1",
  commune_id: "c-1",
  role: "resident",
  status: "active",
  display_name: "Marie",
  communes: { id: "c-1", name: "Saint-Martin" },
};

describe("ProducersClient", () => {
  it("renders producer list from hydrated cache", () => {
    renderWithQuery(<ProducersClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profile },
        {
          key: queryKeys.producers("c-1"),
          data: [
            {
              id: "p-1",
              name: "Ferme des tilleuls",
              description: "Maraîchage bio",
              categories: ["maraicher"],
              status: "active",
              commune_id: "c-1",
              created_by: "u-1",
            },
          ],
        },
      ],
    });
    expect(screen.getByText(/Ferme des tilleuls/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Implement `producers-client.tsx`**

Create `apps/web/src/app/app/producteurs/producers-client.tsx`:

```tsx
"use client";

import type { Producer } from "@pretou/shared";
import { useProfile } from "@/hooks/queries/use-profile";
import { useProducers } from "@/hooks/queries/use-producers";
import { ProducersContent } from "./producers-content";

export function ProducersClient({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const { data: producers } = useProducers(profile?.commune_id ?? "");

  if (!profile) return null;

  return <ProducersContent producers={(producers ?? []) as Producer[]} />;
}
```

Note: this assumes `ProducersContent` already owns the "Create producer" dialog internally. If it doesn't, and the dialog lives in the page, move the dialog into `ProducersContent` or the client here — check the existing file first.

- [ ] **Step 5: Run — expect PASS**

```bash
pnpm --filter @pretou/web test:components -- producers-client
```

### 5.3 — Drop revalidatePath + wire invalidation

- [ ] **Step 6: Edit `actions.ts`**

Open `apps/web/src/app/app/producteurs/actions.ts`. Remove the line `revalidatePath("/app/producteurs");` and the now-unused `import { revalidatePath } from "next/cache";` at the top.

The final file should not contain any `revalidatePath` call or import.

- [ ] **Step 7: Edit `create-producer-dialog.tsx`**

Open `apps/web/src/app/app/producteurs/create-producer-dialog.tsx`. Needed changes:

1. Imports (add):
   ```tsx
   import { useQueryClient } from "@tanstack/react-query";
   import { queryKeys } from "@pretou/shared";
   ```
   Remove `useRouter` import if present and unused after the change.

2. Props — add `communeId: string` to the props interface.

3. Inside the component body, add:
   ```tsx
   const qc = useQueryClient();
   ```
   Remove `const router = useRouter();` if present.

4. In the submit handler's success branch, replace any `router.refresh()` with:
   ```tsx
   await qc.invalidateQueries({ queryKey: queryKeys.producers(communeId) });
   ```

5. Update all callers of `<CreateProducerDialog ... />` to pass `communeId={profile.commune_id}` — there's one in `producers-content.tsx` (if rendered there) or the parent client. Find call sites:
   ```bash
   grep -rn "CreateProducerDialog" apps/web/src/
   ```

### 5.4 — Thin-shell page.tsx

- [ ] **Step 8: Replace `apps/web/src/app/app/producteurs/page.tsx`**

```tsx
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getActiveProducersByCommune,
  queryKeys,
} from "@pretou/shared";
import type { Producer } from "@pretou/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { ProducersClient } from "./producers-client";

export default async function ProducteursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await qc.prefetchQuery({
      queryKey: queryKeys.producers(profile.commune_id),
      queryFn: async () => {
        const { data } = await getActiveProducersByCommune(supabase, profile.commune_id);
        return (data ?? []) as Producer[];
      },
    });
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <ThemeInjector
        theme={profile.communes?.theme}
        customPrimaryColor={profile.communes?.custom_primary_color}
      />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Producteurs locaux</h1>
      <div className="mt-4">
        <ProducersClient userId={user.id} />
      </div>
    </HydrationBoundary>
  );
}
```

- [ ] **Step 9: Typecheck + tests + integration suite**

```bash
pnpm --filter @pretou/web typecheck
pnpm --filter @pretou/web test:components
pnpm --filter @pretou/web test:integration
```

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/app/producteurs/ \
        apps/web/tests/components/producers-client.test.tsx
git commit -m "feat(web): migrate /app/producteurs to thin shell + React Query"
```

---

## Task 6: Full verification + manual smoke

**Files:** none modified.

- [ ] **Step 1: Full component + integration + typecheck + build**

```bash
pnpm --filter @pretou/web test:components
pnpm --filter @pretou/web test:integration
pnpm --filter @pretou/web typecheck
pnpm --filter @pretou/web build
```

- [ ] **Step 2: Manual smoke**

```bash
pnpm --filter @pretou/web dev
```

- Navigate Feed → Événements → back → Événements. Second visit should feel instant.
- Check calendar highlights events. Click a date — events for that date appear. Click another nav, come back — state resets to default (by design, page didn't store selected date in URL).
- Navigate to `/app/producteurs`. List renders. Second visit instant.
- If you have admin access, open the "Create producer" dialog, fill + submit. Dialog closes. The new producer is pending (won't appear in list until admin approves in `/admin/dashboard`). Confirm no hard-refresh happens; console is clean.

- [ ] **Step 3: No commit needed**

---

## Done when

- All 6 tasks committed.
- Tests green: ~88 component + 41 integration (+2 from Task 1's integration test).
- Manual smoke confirms both routes cache on re-visit and producer creation flow works.

## Notes for P4 (next)

P4 migrates `/app/posts/[id]` — the post detail page. It's the most complex route left:
- Reads: post detail + comments + poll + RSVP counts + the post's reports (for admin).
- Mutations: comment create/delete, RSVP set/remove, poll vote, report, pin toggle, delete.
- Requires `usePost(postId)`, `useComments(postId)`, `usePoll(postId)`, `useRsvps(postId)` hooks (query keys already in registry).
- Many small mutations — most already exist as server actions with their own `revalidatePath("/app/posts/...")` calls. P4 removes those and adds `invalidateQueries` to each caller.
- Realtime for comments is a natural fit (like feed's realtime for posts). Probably included in P4.

P5 is the last `/app/*`-adjacent migration — `/admin/*`. Biggest volume of small lists + mutations. Likely splits into P5a (dashboard) and P5b (moderation).
