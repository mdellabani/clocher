# Mon espace + Messages Realignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realign Messages, Feedback, and Mon espace across web and mobile so they share content and visual treatment, with Messages a first-class destination on both platforms.

**Architecture:** Pure-frontend refactor. Mobile pulls Messages out of Mon espace into a new Stack route reachable from a feed-header icon; the old chat-bubble feedback icon swaps to `MessageCircleQuestion`. Web removes the bottom-right feedback FAB and adds a matching icon button in the nav-bar top row, then redesigns Mon espace rows to mirror the mobile chip layout. Mes publications + Mes participations become the canonical Mon espace content on both platforms.

**Tech Stack:** Next.js 15 + Tailwind + React Query (web), Expo Router + React Native + StyleSheet (mobile), `lucide-react` / `lucide-react-native` for icons. `@pretou/shared` exports `POST_TYPE_COLORS`, `POST_TYPE_LABELS`, `getMyPosts`, `getMyRsvps`.

---

## File Structure

**Web — modified:**
- `apps/web/src/components/nav-bar.tsx` — add feedback icon button + dialog state.
- `apps/web/src/app/layout.tsx` — remove `<FeedbackFloat />`.
- `apps/web/src/app/app/mon-espace/espace-client.tsx` — redesign rows (colored chips, meta line, pin icon) + rich empty states.
- `apps/web/tests/components/nav-bar.test.tsx` — extend with feedback-icon assertions.

**Web — deleted:**
- `apps/web/src/components/feedback-float.tsx` (subsumed by nav-bar).

**Mobile — modified:**
- `apps/mobile/src/components/feed-header.tsx` — replace single icon with Messages + Feedback row, add unread red dot.
- `apps/mobile/src/components/my-posts-panel.tsx` — drop the inner FlatList + RefreshControl + useFocusEffect, expose a `<View>` list whose data load is owned by the parent.
- `apps/mobile/src/app/(tabs)/exchanges.tsx` — drop segmented tabs, render `<MyPostsPanel />` + `<MyRsvpsPanel />` stacked inside a parent ScrollView with RefreshControl + useFocusEffect.
- `apps/mobile/src/app/(tabs)/_layout.tsx` — remove `tabBarBadge` and `tabBarBadgeStyle` from the `exchanges` screen options. Keep `useUnreadCount` + `useRealtimeConversations` mounts so the cache stays warm for the feed-header dot.

**Mobile — created:**
- `apps/mobile/src/components/my-rsvps-panel.tsx` — mirrors `my-posts-panel.tsx` for RSVPs.
- `apps/mobile/src/app/messages/index.tsx` — Stack screen wrapping `<InboxPanel />`.

**No schema, RLS, or migration changes.**

---

## Task 1: Web nav-bar feedback icon (TDD)

**Files:**
- Modify: `apps/web/tests/components/nav-bar.test.tsx`
- Modify: `apps/web/src/components/nav-bar.tsx`

- [ ] **Step 1: Write the failing test**

Append two cases to the existing `describe("NavBar", …)` block in `apps/web/tests/components/nav-bar.test.tsx`:

```tsx
  it("renders the feedback icon button", () => {
    setProfile({});
    render(<NavBar />);
    expect(
      screen.getByRole("button", { name: /envoyer un retour/i }),
    ).toBeInTheDocument();
  });

  it("opens the feedback dialog when the icon is clicked", async () => {
    setProfile({});
    const user = userEvent.setup();
    render(<NavBar />);
    await user.click(screen.getByRole("button", { name: /envoyer un retour/i }));
    expect(screen.getByText("Votre retour")).toBeInTheDocument();
  });
```

Add the import at the top of the file (next to the existing imports):

```tsx
import userEvent from "@testing-library/user-event";
```

If `FeedbackForm` is not auto-mockable, mock it minimally near the other mocks:

```tsx
vi.mock("@/components/feedback-form", () => ({
  FeedbackForm: () => <div>feedback-form-stub</div>,
}));
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pretou/web test:components -- nav-bar`
Expected: FAIL — "Unable to find an accessible element with the role button and name `/envoyer un retour/i`".

- [ ] **Step 3: Modify the nav-bar to add the feedback icon + dialog**

Replace the imports block at the top of `apps/web/src/components/nav-bar.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, MessageCircleQuestion, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { InboxNavLink } from "@/components/inbox-nav-link";
import { FeedbackForm } from "@/components/feedback-form";
```

Inside `NavBar()`, add a `feedbackOpen` state (after `const { profile, loading, isAdmin, isModerator } = useProfile();`):

```tsx
  const [feedbackOpen, setFeedbackOpen] = useState(false);
```

Insert a new icon button between the avatar `<Link>` and the `<button onClick={handleLogout}>`:

```tsx
          <button
            onClick={() => setFeedbackOpen(true)}
            className="text-white/60 transition-colors hover:text-white"
            aria-label="Envoyer un retour"
          >
            <MessageCircleQuestion className="h-4 w-4" />
          </button>
```

After the closing `</nav>`, before the component's final `);`, render the dialog:

```tsx
      {feedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setFeedbackOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Votre retour</h2>
              <button
                onClick={() => setFeedbackOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FeedbackForm onClose={() => setFeedbackOpen(false)} />
          </div>
        </div>
      )}
```

To return both the nav and the dialog from a single component, wrap the existing `return (<nav … />)` in a fragment:

```tsx
  return (
    <>
      <nav … existing markup … />
      {feedbackOpen && ( … dialog … )}
    </>
  );
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @pretou/web test:components -- nav-bar`
Expected: PASS, all NavBar tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/nav-bar.tsx apps/web/tests/components/nav-bar.test.tsx
git commit -m "feat(web): move feedback entry into nav-bar icon button"
```

---

## Task 2: Web — retire FeedbackFloat

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Delete: `apps/web/src/components/feedback-float.tsx`

- [ ] **Step 1: Remove the FeedbackFloat mount from the root layout**

In `apps/web/src/app/layout.tsx`, delete the import line:

```tsx
import { FeedbackFloat } from "@/components/feedback-float";
```

…and remove the `<FeedbackFloat />` render from the JSX tree.

- [ ] **Step 2: Delete the component file**

```bash
git rm apps/web/src/components/feedback-float.tsx
```

- [ ] **Step 3: Verify nothing else imports it**

Run: `grep -rn "feedback-float" apps/web/src apps/web/tests`
Expected: no matches.

- [ ] **Step 4: Run web component tests + typecheck**

Run: `pnpm --filter @pretou/web test:components && pnpm --filter @pretou/web exec tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "chore(web): remove floating feedback button (now in nav-bar)"
```

---

## Task 3: Web — Mon espace redesign

**Files:**
- Modify: `apps/web/src/app/app/mon-espace/espace-client.tsx`
- Verify: `apps/web/tests/components/espace-client.test.tsx` (no changes; existing assertions must keep passing)

- [ ] **Step 1: Read the existing test to understand contract**

Read `apps/web/tests/components/espace-client.test.tsx`. The contract the redesign must preserve:
- Renders the post title `"Ma publication"` (from cached `me.posts`).
- Renders something matching `/Fête du village/i` (from cached `me.rsvps`).
- When both caches are empty, at least one piece of text matching `/Aucun/i` is visible.

- [ ] **Step 2: Rewrite espace-client.tsx**

Replace the entire contents of `apps/web/src/app/app/mon-espace/espace-client.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { Pin } from "lucide-react";
import {
  POST_TYPE_COLORS,
  POST_TYPE_LABELS,
  type PostType,
} from "@pretou/shared";
import { useProfile } from "@/hooks/use-profile";
import { useMyPosts } from "@/hooks/queries/use-my-posts";
import { useMyRsvps } from "@/hooks/queries/use-my-rsvps";

type MyPost = {
  id: string;
  title: string;
  type: PostType;
  created_at: string;
  is_pinned: boolean;
};
type MyRsvpPost = {
  id: string;
  title: string;
  type: PostType;
  event_date: string | null;
  event_location: string | null;
};
type MyRsvp = {
  status: string;
  posts: MyRsvpPost | MyRsvpPost[] | null;
};

function firstOrSame<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)}sem`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "2-digit",
  });
}

function TypeChip({ type }: { type: PostType }) {
  const color = POST_TYPE_COLORS[type];
  return (
    <span
      className="shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: `${color}33`, color }}
    >
      {POST_TYPE_LABELS[type]}
    </span>
  );
}

export function EspaceClient() {
  const { profile } = useProfile();
  const userId = profile?.id ?? "";
  const myPostsQuery = useMyPosts(userId);
  const myRsvpsQuery = useMyRsvps(userId);

  if (!profile) return null;

  const posts = (myPostsQuery.data ?? []) as MyPost[];
  const rsvps = (myRsvpsQuery.data ?? []) as MyRsvp[];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Mes publications
        </h2>
        {posts.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Aucune publication"
            subtitle="Vous n'avez encore rien publié."
          />
        ) : (
          <ul className="divide-y divide-[#f0e0d0] overflow-hidden rounded-xl border border-[#f0e0d0] bg-white">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/app/posts/${p.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-[#f5dbc8]/40"
                >
                  <TypeChip type={p.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {p.is_pinned && (
                        <Pin className="h-3 w-3 shrink-0 text-[var(--theme-primary)]" />
                      )}
                      <span className="truncate text-[14px] font-medium text-[#2a1a14]">
                        {p.title}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#7a5e4d]">
                      {formatRelative(p.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Mes participations
        </h2>
        {rsvps.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Aucune participation"
            subtitle="Vos RSVP apparaîtront ici."
          />
        ) : (
          <ul className="divide-y divide-[#f0e0d0] overflow-hidden rounded-xl border border-[#f0e0d0] bg-white">
            {rsvps.map((r, i) => {
              const post = firstOrSame(r.posts);
              if (!post) {
                return (
                  <li key={i} className="px-4 py-3 text-sm text-[#7a5e4d]">
                    Événement supprimé
                  </li>
                );
              }
              return (
                <li key={i}>
                  <Link
                    href={`/app/posts/${post.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-[#f5dbc8]/40"
                  >
                    <TypeChip type={post.type} />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[#2a1a14]">
                        {post.title}
                      </span>
                      {post.event_date && (
                        <p className="mt-1 text-xs text-[#7a5e4d]">
                          {new Date(post.event_date).toLocaleString("fr-FR")}
                        </p>
                      )}
                      {post.event_location && (
                        <p className="text-xs text-[#7a5e4d]">
                          {post.event_location}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#f0e0d0] bg-white py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5dbc8] text-2xl">
        {icon}
      </div>
      <p className="text-base font-semibold text-[#2a1a14]">{title}</p>
      <p className="max-w-xs text-sm text-[#7a5e4d]">{subtitle}</p>
    </div>
  );
}
```

- [ ] **Step 3: Run espace-client tests + typecheck**

Run: `pnpm --filter @pretou/web test:components -- espace-client && pnpm --filter @pretou/web exec tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 4: Smoke test in browser (manual)**

Run `pnpm --filter @pretou/web dev`, navigate to `/app/mon-espace`. Confirm: each row has a colored type chip, post titles + relative dates render, RSVPs show event date + location, empty states show the icon + title + subtitle card.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app/mon-espace/espace-client.tsx
git commit -m "feat(web): mon espace mirrors mobile row design"
```

---

## Task 4: Mobile — `/messages` Stack route

**Files:**
- Create: `apps/mobile/src/app/messages/index.tsx`

- [ ] **Step 1: Create the route file**

Write `apps/mobile/src/app/messages/index.tsx` with:

```tsx
import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme-context";
import { InboxPanel } from "@/components/inbox-panel";

export default function MessagesScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{ title: "Messages", headerBackTitle: "Retour" }}
      />
      <InboxPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
```

- [ ] **Step 2: Register the route in the root Stack**

In `apps/mobile/src/app/_layout.tsx`, add a Stack.Screen entry alongside the existing ones (e.g., right after the `post/[id]` line):

```tsx
            <Stack.Screen name="messages/index" options={{ title: "Messages" }} />
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Reload Expo. Run `router.push("/messages")` from a temporary dev hook (or wait for Task 6 to wire the icon). For this task, just confirm the typecheck passes; visual confirmation lands with Task 6.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/app/messages/index.tsx apps/mobile/src/app/_layout.tsx
git commit -m "feat(mobile): add /messages stack route hosting the inbox panel"
```

---

## Task 5: Mobile — MyRsvpsPanel

**Files:**
- Create: `apps/mobile/src/components/my-rsvps-panel.tsx`

- [ ] **Step 1: Write the new panel**

Write `apps/mobile/src/components/my-rsvps-panel.tsx`:

```tsx
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import {
  POST_TYPE_COLORS,
  POST_TYPE_LABELS,
  type PostType,
} from "@pretou/shared";
import { useTheme } from "@/lib/theme-context";

type RsvpPost = {
  id: string;
  title: string;
  type: PostType;
  event_date: string | null;
  event_location: string | null;
};
type Rsvp = {
  status: string;
  posts: RsvpPost | RsvpPost[] | null;
};

function firstOrSame<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function formatEventDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MyRsvpsPanel({ rows }: { rows: Rsvp[] }) {
  const router = useRouter();
  const theme = useTheme();

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.pinBg }]}>
          <Text style={styles.emptyIconText}>📅</Text>
        </View>
        <Text style={styles.emptyTitle}>Aucune participation</Text>
        <Text style={[styles.emptySub, { color: theme.muted }]}>
          Vos RSVP apparaîtront ici.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {rows.map((r, i) => {
        const post = firstOrSame(r.posts);
        if (!post) {
          return (
            <View key={i} style={styles.deletedRow}>
              <Text style={[styles.muted, { color: theme.muted }]}>
                Événement supprimé
              </Text>
            </View>
          );
        }
        const eventDate = formatEventDate(post.event_date);
        return (
          <TouchableOpacity
            key={i}
            style={styles.row}
            onPress={() => router.push(`/post/${post.id}`)}
            activeOpacity={0.6}
          >
            <View
              style={[
                styles.typeChip,
                { backgroundColor: POST_TYPE_COLORS[post.type] + "20" },
              ]}
            >
              <Text
                style={[styles.typeText, { color: POST_TYPE_COLORS[post.type] }]}
              >
                {POST_TYPE_LABELS[post.type]}
              </Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={2}>
                {post.title}
              </Text>
              {eventDate && (
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {eventDate}
                </Text>
              )}
              {post.event_location && (
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {post.event_location}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0e0d0",
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  typeText: { fontFamily: "DMSans_600SemiBold", fontSize: 11 },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#2a1a14",
    lineHeight: 18,
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  deletedRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  muted: { fontFamily: "DMSans_400Regular", fontSize: 14 },

  empty: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: { fontSize: 24 },
  emptyTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#2a1a14",
  },
  emptySub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/my-rsvps-panel.tsx
git commit -m "feat(mobile): MyRsvpsPanel mirrors MyPostsPanel layout"
```

---

## Task 6: Mobile — Mon espace restructure

**Files:**
- Modify: `apps/mobile/src/components/my-posts-panel.tsx`
- Modify: `apps/mobile/src/app/(tabs)/exchanges.tsx`

- [ ] **Step 1: Refactor MyPostsPanel to be data-only (parent owns scroll + load)**

Replace the contents of `apps/mobile/src/components/my-posts-panel.tsx` with:

```tsx
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Pin } from "lucide-react-native";
import {
  POST_TYPE_COLORS,
  POST_TYPE_LABELS,
  type PostType,
} from "@pretou/shared";
import { useTheme } from "@/lib/theme-context";

type Row = {
  id: string;
  title: string;
  type: PostType;
  created_at: string;
  is_pinned: boolean;
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)}sem`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "2-digit",
  });
}

export function MyPostsPanel({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const theme = useTheme();

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.pinBg }]}>
          <Text style={styles.emptyIconText}>📝</Text>
        </View>
        <Text style={styles.emptyTitle}>Aucune publication</Text>
        <Text style={[styles.emptySub, { color: theme.muted }]}>
          Vous n'avez encore rien publié.{"\n"}Touchez « Publier » pour commencer.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {rows.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.row}
          onPress={() => router.push(`/post/${item.id}`)}
          activeOpacity={0.6}
        >
          <View
            style={[
              styles.typeChip,
              { backgroundColor: POST_TYPE_COLORS[item.type] + "20" },
            ]}
          >
            <Text
              style={[styles.typeText, { color: POST_TYPE_COLORS[item.type] }]}
            >
              {POST_TYPE_LABELS[item.type]}
            </Text>
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              {item.is_pinned && (
                <Pin
                  size={12}
                  color={theme.primary}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {formatRelative(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0e0d0",
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  typeText: { fontFamily: "DMSans_600SemiBold", fontSize: 11 },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#2a1a14",
    lineHeight: 18,
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 4,
  },

  empty: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: { fontSize: 24 },
  emptyTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#2a1a14",
  },
  emptySub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
```

Note: removed `getMyPosts`, `useEffect`, `useFocusEffect`, `FlatList`, `RefreshControl`, and `useAuth` imports/usages — the parent now owns load state.

- [ ] **Step 2: Replace exchanges.tsx with the stacked-sections layout**

Replace the contents of `apps/mobile/src/app/(tabs)/exchanges.tsx` with:

```tsx
import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getMyPosts, getMyRsvps, type PostType } from "@pretou/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { MyPostsPanel } from "@/components/my-posts-panel";
import { MyRsvpsPanel } from "@/components/my-rsvps-panel";

type PostRow = {
  id: string;
  title: string;
  type: PostType;
  created_at: string;
  is_pinned: boolean;
};
type RsvpRow = {
  status: string;
  posts:
    | {
        id: string;
        title: string;
        type: PostType;
        event_date: string | null;
        event_location: string | null;
      }
    | null;
};

export default function MonEspaceScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = profile?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [postsRes, rsvpsRes] = await Promise.all([
      getMyPosts(supabase, userId),
      getMyRsvps(supabase, userId),
    ]);
    setPosts((postsRes.data ?? []) as PostRow[]);
    setRsvps((rsvpsRes.data ?? []) as RsvpRow[]);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.muted, { color: theme.muted }]}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.sectionTitle}>Mes publications</Text>
      <MyPostsPanel rows={posts} />

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        Mes participations
      </Text>
      <MyRsvpsPanel rows={rsvps} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  muted: { fontFamily: "DMSans_400Regular", fontSize: 14 },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#2a1a14",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitleSpaced: { paddingTop: 24 },
});
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Reload Expo. Open Mon espace. Confirm:
- The segmented tabs are gone.
- "Mes publications" section header followed by post rows (or empty state) appears.
- "Mes participations" section header followed by RSVP rows (or empty state) appears.
- Pull-to-refresh reloads both sections.
- Tapping a post row navigates to `/post/[id]`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/my-posts-panel.tsx apps/mobile/src/app/\(tabs\)/exchanges.tsx
git commit -m "feat(mobile): mon espace = stacked publications + participations"
```

---

## Task 7: Mobile — feed-header icons

**Files:**
- Modify: `apps/mobile/src/components/feed-header.tsx`

- [ ] **Step 1: Replace the feed-header content**

Replace the contents of `apps/mobile/src/components/feed-header.tsx` with:

```tsx
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  MessageCircle,
  MessageCircleQuestion,
} from "lucide-react-native";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { FeedbackSheet } from "@/components/feedback-sheet";

export function FeedHeader() {
  const theme = useTheme();
  const { profile, session, isAdmin } = useAuth();
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);
  const { data: unread } = useUnreadCount(!!session?.user?.id);
  const hasUnread = (unread ?? 0) > 0;

  const communeName = profile?.communes?.name ?? "Ma Commune";
  const codePostal = profile?.communes?.code_postal;
  const motto = profile?.communes?.motto;
  const initials = profile?.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <>
      <LinearGradient
        colors={theme.gradient as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={[styles.circle, styles.circleTopRight]} />
        <View style={[styles.circle, styles.circleBottomLeft]} />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.textArea}>
              <Text style={styles.communeName}>{communeName}</Text>
              {codePostal && (
                <Text style={styles.subtitle}>
                  {codePostal} · {theme.region}
                </Text>
              )}
            </View>
            <View style={styles.rightIcons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/messages")}
                activeOpacity={0.8}
                accessibilityLabel="Messages"
              >
                <MessageCircle size={17} color="#FFFFFF" />
                {hasUnread && (
                  <View
                    style={[styles.dot, { backgroundColor: theme.primary }]}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowFeedback(true)}
                activeOpacity={0.8}
                accessibilityLabel="Envoyer un retour"
              >
                <MessageCircleQuestion size={17} color="#FFFFFF" />
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.push("/admin/moderation")}
                  activeOpacity={0.8}
                >
                  <ShieldCheck size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.avatar}
                onPress={() => router.push("/profile")}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {motto && (
            <View style={styles.mottoPill}>
              <Text style={styles.mottoText}>{motto}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <FeedbackSheet visible={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  content: { zIndex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textArea: { flex: 1, marginRight: 12 },
  communeName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 21,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  mottoPill: {
    marginTop: 14,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  mottoText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontStyle: "italic",
  },
  circle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  circleTopRight: { width: 120, height: 120, top: -30, right: -20 },
  circleBottomLeft: { width: 80, height: 80, bottom: -20, left: -10 },
});
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Reload Expo. From Fil:
- Two icon buttons appear in the header (chat bubble = Messages, chat bubble with `?` = Feedback).
- Tapping the first icon navigates to `/messages` and shows the inbox list.
- Tapping the second icon opens the feedback sheet.
- Send a message from another account: a small red dot appears on the Messages icon while sitting on Fil.
- Open the conversation: dot disappears.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/feed-header.tsx
git commit -m "feat(mobile): feed-header gets messages + feedback icons"
```

---

## Task 8: Mobile — remove tabBarBadge

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Drop the badge attributes**

In `apps/mobile/src/app/(tabs)/_layout.tsx`, remove the `tabBarBadge` and `tabBarBadgeStyle` lines from the `exchanges` `<Tabs.Screen>` options. Also remove the `badge` const and the `unread` destructure:

```tsx
export default function TabLayout() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id;
  useRealtimeConversations(userId);
  useUnreadCount(!!userId);

  return (
    <Tabs
      …
    >
      …
      <Tabs.Screen
        name="exchanges"
        options={{
          title: "Mon espace",
          tabBarLabel: "Mon espace",
          tabBarIcon: ({ color, size }) => (
            <SquaresFour size={size} color={color} weight="fill" />
          ),
        }}
      />
      …
    </Tabs>
  );
}
```

The `useUnreadCount` and `useRealtimeConversations` hook calls stay so the cache is populated and live-updated for the feed-header dot.

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Reload Expo. Confirm the Mon espace tab no longer shows a numeric badge in the bottom bar (the unread indicator is now solely the red dot on the feed-header Messages icon).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/\(tabs\)/_layout.tsx
git commit -m "chore(mobile): drop mon espace tab badge (replaced by header dot)"
```

---

## Task 9: Final verification

- [ ] **Step 1: Web checks**

```bash
pnpm --filter @pretou/web test:components
pnpm --filter @pretou/web exec tsc --noEmit
```
Expected: PASS.

- [ ] **Step 2: Mobile typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Manual two-user smoke (per docs/testing-notifications.md)**

With two accounts:
- A sends a DM to B about a post.
- On B's mobile (Fil tab): a red dot appears on the Messages header icon (not on the Mon espace tab).
- B taps the icon → lands in Messages list → opens the thread → red dot clears.
- B navigates to Mon espace: stacked Mes publications + Mes participations sections render with colored type chips and pull-to-refresh works.
- On B's web: nav-bar has a `?` icon top-right that opens the feedback dialog; bottom-right floating button is gone; `/app/mon-espace` shows colored type chips and rich empty states.

- [ ] **Step 4: Update CLAUDE.md note (if needed)**

If anything in the architecture or test commands diverges from CLAUDE.md, add a one-line note in the appropriate section.

- [ ] **Step 5: No commit needed for this task — verification only.**
