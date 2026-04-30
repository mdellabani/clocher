# P5c — AuthContext for Session Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the per-navigation server round-trip on authed routes by moving profile from server-side fetch + React Query into a proper session Context.

**Architecture:** `page.tsx` files become one-liner passthroughs. Middleware owns session gating. A `ProfileProvider` Context (already exists, just repurposed) loads profile once at session start. `AdminGuard` handles role-based redirects client-side. All data prefetch is dropped — client queries fire on mount, cache persists across nav.

**Tech Stack:** Next.js 16 App Router, React 19, React Context, Supabase Auth, @tanstack/react-query (unchanged for data).

---

## Reality vs. spec

The spec was written as if we needed to create an `AuthProvider` from scratch. After auditing the code:

- `apps/web/src/hooks/use-profile.tsx` **already** exports a Context-based `ProfileProvider` + `useProfile()` hook. It loads profile on mount, subscribes to `supabase.auth.onAuthStateChange`, and is already wrapped at the **root** `apps/web/src/app/layout.tsx` via `ProfileProviderWrapper`.
- `apps/web/src/hooks/queries/use-profile.ts` exports a **React Query** version of `useProfile(userId)` that is the one clients currently consume.
- `useProfile()` is therefore ambiguous — two hooks with the same name, different shapes (`{ profile }` vs `{ data: profile }`).

**Implication:** we don't build a provider; we wire the existing Context provider deeper and delete the React Query duplicate. The spec's conceptual goals hold; only naming and mechanics differ.

## File map

### Create

- `apps/web/src/components/admin-guard.tsx` — client role redirect wrapper

### Modify

- `apps/web/src/middleware.ts` — add authed-route gating for `/app/*` and `/admin/*`
- `apps/web/src/app/app/layout.tsx` — guard for "no profile" / "pending" redirects
- `apps/web/src/app/admin/layout.tsx` — wrap in `<AdminGuard>`
- `apps/web/src/app/app/feed/page.tsx` — shrink to thin shell
- `apps/web/src/app/app/feed/feed-client.tsx` — switch to Context `useProfile`, drop `userId` prop
- `apps/web/src/app/app/evenements/page.tsx` — shrink
- `apps/web/src/app/app/evenements/events-client.tsx` — switch to Context
- `apps/web/src/app/app/producteurs/page.tsx` — shrink
- `apps/web/src/app/app/producteurs/producers-client.tsx` — switch to Context
- `apps/web/src/app/app/posts/[id]/page.tsx` — shrink
- `apps/web/src/app/app/posts/[id]/post-detail-client.tsx` — switch to Context
- `apps/web/src/app/app/mon-espace/page.tsx` — shrink
- `apps/web/src/app/app/mon-espace/espace-client.tsx` — switch to Context
- `apps/web/src/app/app/settings/page.tsx` — shrink
- `apps/web/src/app/app/settings/settings-client.tsx` — switch to Context
- `apps/web/src/app/app/infos-pratiques/page.tsx` — shrink (audit for profile usage)
- `apps/web/src/app/admin/dashboard/page.tsx` — shrink, wrap in AdminGuard
- `apps/web/src/app/admin/dashboard/dashboard-client.tsx` — receives no props; derives `communeId` from Context
- `apps/web/src/app/admin/homepage/page.tsx` — shrink, wrap in AdminGuard
- `apps/web/src/app/admin/homepage/homepage-client.tsx` — derives `communeId` from Context

### Delete

- `apps/web/src/hooks/queries/use-profile.ts` — the React Query version; no longer needed

---

## Task 1: Extend middleware to gate authed routes

**Files:**
- Modify: `apps/web/src/middleware.ts`

- [ ] **Step 1: Identify insertion point**

Read `apps/web/src/middleware.ts`. Find the section that handles platform host pass-through (around line 60 in existing code) — right after `isPlatformHost` check and before `AUTH_PAGES_REQUIRING_ANON` loop.

- [ ] **Step 2: Add authed-route redirect logic**

Inside the `if (isPlatformHost(hostname))` block, add a block **after** the existing `AUTH_PAGES_REQUIRING_ANON` handler. The final middleware shape under platform host should be:

```ts
if (isPlatformHost(hostname)) {
  // Existing: signed-in users hitting /auth/login etc. get redirected away
  if (AUTH_PAGES_REQUIRING_ANON.some((p) => pathname.startsWith(p))) {
    const user = await getSessionUser(request);
    if (user) {
      const target = SUPER_ADMIN_EMAILS.includes(user.email ?? "")
        ? "/super-admin"
        : "/app/feed";
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = target;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // New: unsigned users trying to access authed routes get redirected to login
  const AUTHED_PREFIXES = ["/app/", "/admin/"];
  if (AUTHED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const user = await getSessionUser(request);
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      redirectUrl.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Manual smoke**

Start dev server: `pnpm --filter @pretou/web dev`

- In a private window (no session), visit `http://localhost:3000/app/feed`. Expected: redirect to `/auth/login?next=%2Fapp%2Ffeed`.
- Log in. Expected: land on `/app/feed`.
- Log out. Visit `/admin/dashboard`. Expected: redirect to `/auth/login?next=%2Fadmin%2Fdashboard`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(web): middleware gates /app/* and /admin/* for unauthed users"
```

---

## Task 2: Create AdminGuard component

**Files:**
- Create: `apps/web/src/components/admin-guard.tsx`

- [ ] **Step 1: Write AdminGuard**

Create `apps/web/src/components/admin-guard.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) router.replace("/app/feed");
  }, [loading, isAdmin, router]);

  if (loading || !profile || !isAdmin) return null;
  return <>{children}</>;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin-guard.tsx
git commit -m "feat(web): AdminGuard component for client-side role redirect"
```

---

## Task 3: Enhance ProfileProvider to handle profile-missing and pending redirects

**Files:**
- Modify: `apps/web/src/hooks/use-profile.tsx`

**Context:** Currently `page.tsx` files do these redirects server-side:
- If session valid but no profile row: `redirect("/auth/signup")` (or `/super-admin` for super-admin emails)
- If `profile.status === "pending"`: `redirect("/auth/pending")`

With page.tsx shrunk to a passthrough, the provider must carry those redirects.

- [ ] **Step 1: Add redirect side-effects to ProfileProvider**

Update `apps/web/src/hooks/use-profile.tsx` — add a `useRouter` + a `useEffect` that runs after `load()` completes:

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SUPER_ADMIN_EMAILS } from "@/lib/super-admin";
import type { Profile } from "@pretou/shared";

type ProfileWithCommune = Profile & {
  communes: {
    name: string;
    slug: string;
    epci_id: string | null;
    code_postal: string | null;
    theme: string;
    motto: string | null;
  };
};

type ProfileState = {
  profile: ProfileWithCommune | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
};

const ProfileContext = createContext<ProfileState>({
  profile: null,
  loading: true,
  isAdmin: false,
  isModerator: false,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileWithCommune | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setUserEmail(null);
        setLoading(false);
        return;
      }
      setUserEmail(user.email ?? null);
      const { data, error } = await supabase
        .from("profiles")
        .select("*, communes(name, slug, epci_id, code_postal, theme, motto)")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("[useProfile] failed to load profile:", error);
      }
      setProfile(data as ProfileWithCommune | null);
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        load();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirect side-effects for authed routes
  useEffect(() => {
    if (loading) return;
    if (!pathname) return;
    const inAuthedTree = pathname.startsWith("/app/") || pathname.startsWith("/admin/");
    if (!inAuthedTree) return;

    // No user email (signed out): middleware will redirect on next nav
    if (!userEmail) return;

    // Signed in but no profile row
    if (!profile) {
      if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        router.replace("/super-admin");
      } else {
        router.replace("/auth/signup");
      }
      return;
    }

    // Profile exists but status is pending
    if (profile.status === "pending") {
      router.replace("/auth/pending");
    }
  }, [loading, profile, userEmail, pathname, router]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        isModerator: profile?.role === "moderator" || profile?.role === "admin",
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-profile.tsx
git commit -m "feat(web): ProfileProvider handles no-profile/pending redirects client-side"
```

---

## Task 4: Switch FeedClient to Context useProfile and drop userId prop

**Files:**
- Modify: `apps/web/src/app/app/feed/feed-client.tsx`

- [ ] **Step 1: Update imports and signature**

Change the top of `apps/web/src/app/app/feed/feed-client.tsx`:

```tsx
// OLD:
// import { useProfile } from "@/hooks/queries/use-profile";
// export function FeedClient({ userId }: { userId: string }) {
//   const { data: profile } = useProfile(userId);

// NEW:
import { useProfile } from "@/hooks/use-profile";

export function FeedClient() {
  const { profile } = useProfile();
```

Everything else in the component stays the same — `profile?.commune_id` and `profile?.communes?.epci_id` work identically because the Context provider loads the same shape.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: errors only from `feed/page.tsx` (will be fixed in Task 5).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/app/feed/feed-client.tsx
git commit -m "refactor(web): FeedClient reads profile from Context"
```

---

## Task 5: Shrink feed/page.tsx to passthrough

**Files:**
- Modify: `apps/web/src/app/app/feed/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire contents of `apps/web/src/app/app/feed/page.tsx` with:

```tsx
import { FeedClient } from "./feed-client";

export default function FeedPage() {
  return <FeedClient />;
}
```

Gone: `auth.getUser`, `getProfile`, role-based redirects, `prefetchAndDehydrate`, `HydrationBoundary`, `ThemeInjector`. Middleware + Context handle everything.

- [ ] **Step 2: Move ThemeInjector into FeedClient (if not already elsewhere)**

Check whether `ThemeInjector` is rendered elsewhere in the authed tree. If not, add it inside `FeedClient` near the top:

```tsx
import { ThemeInjector } from "@/components/theme-injector";
// ...inside FeedClient, before the first div:
<ThemeInjector
  theme={profile?.communes?.theme}
  customPrimaryColor={(profile as { custom_primary_color?: string | null })?.custom_primary_color}
/>
```

**Note:** If `ThemeInjector` is already rendered from a layout, skip this step. Check `apps/web/src/app/app/layout.tsx` and `apps/web/src/components/nav-bar.tsx` before adding.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors from feed.

- [ ] **Step 4: Manual smoke**

Dev server running. Navigate to `/app/feed`. Expected: feed loads (initial skeleton ~150ms, then posts appear).

Navigate away to another authed page and back. Expected: **no skeleton flash on return**.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/feed/page.tsx apps/web/src/app/app/feed/feed-client.tsx
git commit -m "refactor(web): /app/feed uses thin-shell + Context profile"
```

---

## Task 6: Shrink /app/evenements to thin-shell

**Files:**
- Modify: `apps/web/src/app/app/evenements/events-client.tsx`
- Modify: `apps/web/src/app/app/evenements/page.tsx`

- [ ] **Step 1: Update events-client.tsx**

Top of file:

```tsx
// OLD:
// import { useProfile } from "@/hooks/queries/use-profile";
// export function EventsClient({ userId }: { userId: string }) {
//   const { data: profile } = useProfile(userId);

// NEW:
import { useProfile } from "@/hooks/use-profile";

export function EventsClient() {
  const { profile } = useProfile();
```

- [ ] **Step 2: Rewrite page.tsx**

Replace `apps/web/src/app/app/evenements/page.tsx` with:

```tsx
import { EventsClient } from "./events-client";

export default function EvenementsPage() {
  return <EventsClient />;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors from evenements.

- [ ] **Step 4: Manual smoke**

Navigate to `/app/evenements`. Expected: calendar loads.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/evenements/
git commit -m "refactor(web): /app/evenements uses thin-shell + Context profile"
```

---

## Task 7: Shrink /app/producteurs to thin-shell

**Files:**
- Modify: `apps/web/src/app/app/producteurs/producers-client.tsx`
- Modify: `apps/web/src/app/app/producteurs/page.tsx`

- [ ] **Step 1: Update producers-client.tsx**

Top of file:

```tsx
// OLD:
// import { useProfile } from "@/hooks/queries/use-profile";
// export function ProducersClient({ userId }: { userId: string }) {
//   const { data: profile } = useProfile(userId);

// NEW:
import { useProfile } from "@/hooks/use-profile";

export function ProducersClient() {
  const { profile } = useProfile();
```

- [ ] **Step 2: Rewrite page.tsx**

Replace `apps/web/src/app/app/producteurs/page.tsx` with:

```tsx
import { ProducersClient } from "./producers-client";

export default function ProducteursPage() {
  return <ProducersClient />;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/producteurs/
git commit -m "refactor(web): /app/producteurs uses thin-shell + Context profile"
```

---

## Task 8: Shrink /app/posts/[id] to thin-shell

**Files:**
- Modify: `apps/web/src/app/app/posts/[id]/post-detail-client.tsx`
- Modify: `apps/web/src/app/app/posts/[id]/page.tsx`

- [ ] **Step 1: Update post-detail-client.tsx**

Check if the client currently receives `userId` prop and calls `useProfile(userId)`. If so, swap imports:

```tsx
// OLD:
// import { useProfile } from "@/hooks/queries/use-profile";
// export function PostDetailClient({ postId, userId }: { postId: string; userId: string }) {
//   const { data: profile } = useProfile(userId);

// NEW:
import { useProfile } from "@/hooks/use-profile";

export function PostDetailClient({ postId }: { postId: string }) {
  const { profile } = useProfile();
```

(Keep `postId` — that's from URL, still needed.)

- [ ] **Step 2: Rewrite page.tsx**

Replace `apps/web/src/app/app/posts/[id]/page.tsx` with:

```tsx
import { PostDetailClient } from "./post-detail-client";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostDetailClient postId={id} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/posts/
git commit -m "refactor(web): /app/posts/[id] uses thin-shell + Context profile"
```

---

## Task 9: Shrink /app/mon-espace to thin-shell

**Files:**
- Modify: `apps/web/src/app/app/mon-espace/espace-client.tsx`
- Modify: `apps/web/src/app/app/mon-espace/page.tsx`

- [ ] **Step 1: Update espace-client.tsx**

Top of file:

```tsx
// OLD:
// import { useProfile } from "@/hooks/queries/use-profile";
// export function EspaceClient({ userId }: { userId: string }) {
//   const { data: profile } = useProfile(userId);

// NEW:
import { useProfile } from "@/hooks/use-profile";

export function EspaceClient() {
  const { profile } = useProfile();
```

- [ ] **Step 2: Rewrite page.tsx**

Replace `apps/web/src/app/app/mon-espace/page.tsx` with:

```tsx
import { EspaceClient } from "./espace-client";

export default function MonEspacePage() {
  return <EspaceClient />;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/mon-espace/
git commit -m "refactor(web): /app/mon-espace uses thin-shell + Context profile"
```

---

## Task 10: Shrink /app/settings to thin-shell

**Files:**
- Modify: `apps/web/src/app/app/settings/settings-client.tsx`
- Modify: `apps/web/src/app/app/settings/page.tsx`

- [ ] **Step 1: Update settings-client.tsx**

Top of file:

```tsx
// OLD:
// import { useProfile } from "@/hooks/queries/use-profile";
// export function SettingsClient({ userId }: { userId: string }) {
//   const { data: profile } = useProfile(userId);

// NEW:
import { useProfile } from "@/hooks/use-profile";

export function SettingsClient() {
  const { profile } = useProfile();
```

- [ ] **Step 2: Rewrite page.tsx**

Replace `apps/web/src/app/app/settings/page.tsx` with:

```tsx
import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  return <SettingsClient />;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/settings/
git commit -m "refactor(web): /app/settings uses thin-shell + Context profile"
```

---

## Task 11: Shrink /app/infos-pratiques to thin-shell

**Files:**
- Modify: `apps/web/src/app/app/infos-pratiques/page.tsx`
- Modify: any client component it renders (audit first)

- [ ] **Step 1: Audit current page**

Read `apps/web/src/app/app/infos-pratiques/page.tsx` and any client component it delegates to. Note: this route may or may not consume `useProfile(userId)` — if it only needs commune info derivable from the path, no change needed to the client.

- [ ] **Step 2: If client consumes useProfile(userId)**

Apply the same pattern as Task 4:
- Swap import to `@/hooks/use-profile`
- Drop `userId` prop

- [ ] **Step 3: Rewrite page.tsx to thin-shell**

Replace the file's body with:

```tsx
import { InfosPratiquesClient } from "./infos-pratiques-client"; // or whatever the client is named

export default function InfosPratiquesPage() {
  return <InfosPratiquesClient />;
}
```

Preserve the `async` signature and `params`/`searchParams` destructuring if the page uses them.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/infos-pratiques/
git commit -m "refactor(web): /app/infos-pratiques uses thin-shell + Context profile"
```

---

## Task 12: Wrap /admin layout in AdminGuard

**Files:**
- Modify: `apps/web/src/app/admin/layout.tsx`

- [ ] **Step 1: Add AdminGuard wrapping**

Replace `apps/web/src/app/admin/layout.tsx` with:

```tsx
import { NavBar } from "@/components/nav-bar";
import { QueryProvider } from "@/components/providers/query-provider";
import { AdminGuard } from "@/components/admin-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-[var(--theme-background)]">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <AdminGuard>{children}</AdminGuard>
        </main>
      </div>
    </QueryProvider>
  );
}
```

The server-side auth + role redirect that used to live in `page.tsx` files is now:
- Auth: handled by middleware (Task 1)
- Role: handled by `AdminGuard` (Task 2)
- No-profile / pending: handled by `ProfileProvider` (Task 3)

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/layout.tsx
git commit -m "refactor(web): /admin/layout uses AdminGuard instead of server role check"
```

---

## Task 13: Shrink /admin/dashboard to thin-shell

**Files:**
- Modify: `apps/web/src/app/admin/dashboard/dashboard-client.tsx`
- Modify: `apps/web/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard-client.tsx**

`DashboardClient` currently takes `communeId` as a prop. After this task, it reads from `useProfile()`:

```tsx
// OLD:
// export function DashboardClient({ communeId }: { communeId: string }) {

// NEW:
"use client";
import { useProfile } from "@/hooks/use-profile";

export function DashboardClient() {
  const { profile } = useProfile();
  const communeId = profile?.commune_id ?? "";
  if (!communeId) return null;  // AdminGuard + ProfileProvider already handled loading states
  // ... rest of component unchanged
}
```

- [ ] **Step 2: Rewrite page.tsx**

Replace `apps/web/src/app/admin/dashboard/page.tsx` with:

```tsx
import { DashboardClient } from "./dashboard-client";

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
```

Gone: auth, profile fetch, role redirect, 8-way prefetch, HydrationBoundary. Middleware + AdminGuard + AuthProvider handle all of that.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Manual smoke**

Navigate to `/admin/dashboard` as admin. Expected: dashboard loads. Navigate back to `/app/feed` and then to `/admin/dashboard` — no skeleton flash on the return nav.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/admin/dashboard/
git commit -m "refactor(web): /admin/dashboard uses thin-shell + Context profile"
```

---

## Task 14: Shrink /admin/homepage to thin-shell

**Files:**
- Modify: `apps/web/src/app/admin/homepage/homepage-client.tsx`
- Modify: `apps/web/src/app/admin/homepage/page.tsx`

- [ ] **Step 1: Update homepage-client.tsx**

Apply the same pattern as Task 13:

```tsx
"use client";
import { useProfile } from "@/hooks/use-profile";

export function HomepageClient() {
  const { profile } = useProfile();
  const communeId = profile?.commune_id ?? "";
  if (!communeId) return null;
  // ... rest of component unchanged
}
```

- [ ] **Step 2: Rewrite page.tsx**

Replace `apps/web/src/app/admin/homepage/page.tsx` with:

```tsx
import { HomepageClient } from "./homepage-client";

export default function AdminHomepagePage() {
  return <HomepageClient />;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/homepage/
git commit -m "refactor(web): /admin/homepage uses thin-shell + Context profile"
```

---

## Task 15: Delete React Query useProfile hook

**Files:**
- Delete: `apps/web/src/hooks/queries/use-profile.ts`

- [ ] **Step 1: Confirm no remaining importers**

Run: `grep -rn "hooks/queries/use-profile" apps/web/src`
Expected: no hits (all clients switched in Tasks 4–14).

If any hits remain, stop and fix the caller before deleting.

- [ ] **Step 2: Delete the file**

```bash
rm apps/web/src/hooks/queries/use-profile.ts
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @pretou/web typecheck`
Expected: no errors.

- [ ] **Step 4: Run component tests**

Run: `pnpm --filter @pretou/web test:components`
Expected: all tests pass. If any fail with mocks referencing the deleted hook, update the mock to return `{ profile }` shape (Context) instead of `{ data: profile }` (React Query).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(web): remove React Query useProfile hook (replaced by Context)"
```

---

## Task 16: Final sweep — grep for server-side getProfile + dead imports

**Files:**
- All of `apps/web/src`

- [ ] **Step 1: Grep for remaining server getProfile calls in pages**

Run: `grep -rn "getProfile(supabase" apps/web/src/app`
Expected: no hits inside any `page.tsx` or `layout.tsx`.

Any surviving `getProfile` call in a page/layout is a leftover — follow the task pattern to remove.

- [ ] **Step 2: Grep for dead HydrationBoundary + prefetchAndDehydrate in touched pages**

Run: `grep -rln "HydrationBoundary\|prefetchAndDehydrate" apps/web/src/app/app apps/web/src/app/admin`
Expected: **no hits**. P5c removes all server-side prefetch from authed pages to achieve instant nav.

If any hits remain, read the file and remove the prefetch block. Data queries will fire on the client and cache per React Query defaults.

- [ ] **Step 3: Grep for unused imports**

Run typecheck with `--noUnusedParameters` and `--noUnusedLocals` flags if not already set. Alternatively, rely on ESLint if configured:

`pnpm --filter @pretou/web lint`

Fix any unused imports revealed (e.g., `HydrationBoundary`, `prefetchAndDehydrate`, `getProfile` in files where they're no longer used).

- [ ] **Step 4: Full test run**

Run: `pnpm --filter @pretou/web test:components`
Expected: all 128+ tests pass.

- [ ] **Step 5: Commit any sweep changes**

```bash
git add -A
git commit -m "chore(web): clean up dead imports after P5c migration"
```

If nothing changed, skip the commit.

---

## Task 17: Manual smoke test

- [ ] **Step 1: Cold-start dev server**

```bash
pnpm --filter @pretou/web dev
```

- [ ] **Step 2: Unauthed gating check**

In a private window:
- `http://localhost:3000/app/feed` → expect redirect to `/auth/login?next=%2Fapp%2Ffeed`
- `http://localhost:3000/admin/dashboard` → expect redirect to `/auth/login?next=%2Fadmin%2Fdashboard`

- [ ] **Step 3: Resident nav flash check**

Log in as a résident (not admin). Navigate:
- `/app/feed` (first load: skeleton ~150ms, then posts)
- `/app/evenements` (first load: skeleton, then calendar)
- `/app/feed` (return nav: **no skeleton, instant**)
- `/app/evenements` (return nav: **no skeleton, instant**)

- [ ] **Step 4: Admin nav flash check**

Log in as admin. Navigate:
- `/admin/dashboard` (first load: skeleton, then dashboard)
- `/app/feed` (first load: skeleton, then feed)
- `/admin/dashboard` (return: **no skeleton, instant**)
- `/admin/homepage` (first load: skeleton, then editor)

- [ ] **Step 5: Role guard check**

Log in as résident. Manually visit `/admin/dashboard`. Expect: brief moment (non-admin may see NavBar flash), then redirect to `/app/feed`.

- [ ] **Step 6: Profile redirect cases**

- Create a fresh signup whose profile row has `status = "pending"`. Visit `/app/feed` → expect redirect to `/auth/pending`.
- Verify super-admin (email in `SUPER_ADMIN_EMAILS`) with no profile row gets redirected to `/super-admin` on authed visit.

- [ ] **Step 7: Logout flow**

Click sign out from NavBar. Expected: redirect to `/`. Manually visit `/app/feed` → expect redirect to login.

- [ ] **Step 8: Success-criteria measurement**

Open devtools Network tab. Warm nav between two authed pages. Verify:
- No `page.tsx` RSC payload takes >50ms
- No new `/profiles` Supabase request is fired on warm nav

---

## Success criteria

1. `grep -r "getProfile" apps/web/src/app` returns no hits in page/layout files
2. `grep -r "from \"@/hooks/queries/use-profile\"" apps/web/src` returns no hits
3. Hard refresh on `/app/feed` → first full paint ≤ 250ms
4. Warm nav between authed routes → no skeleton, content visible within ~50ms
5. Middleware correctly redirects unauthed users from `/app/*` and `/admin/*`
6. `AdminGuard` correctly redirects non-admins from `/admin/*` to `/app/feed`
7. Component tests pass after mock shape updates (`{ data: profile }` → `{ profile }`)
8. All 17 tasks committed
