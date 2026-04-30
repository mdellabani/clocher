# Mon espace + Messages realignment

**Date:** 2026-04-30
**Status:** Approved, pending implementation plan

## Context

Direct messaging shipped on 2026-04-26. Two side effects emerged once it was in users' hands:

1. The mobile feed header has a `MessageCircle` icon that opens the *feedback* form (bug/feature). With messaging now live, that icon strongly suggests "open my inbox" — users misread it.
2. Mon espace diverges across platforms. Mobile renders segmented tabs `Messages | Mes posts`; web renders stacked sections `Mes publications + Mes participations` with Messages as a separate top-nav page. The visual treatment also diverges — mobile has colored post-type chips, web has plain text.

This work realigns Messages, Feedback, and Mon espace across both platforms so that:

- The feedback entry point is no longer confusable with messaging on either platform.
- Mon espace is the *same screen* on both platforms in content and visual treatment.
- Messages is a first-class destination on both platforms (no longer buried two taps deep on mobile).

No backend, RLS, or migration changes.

## Decisions

| Question | Decision |
|---|---|
| Where does Messages live on mobile? | Pull out of Mon espace; new `/messages` route reachable from a feed-header icon. |
| What replaces the feed-header chat-bubble icon? | A real Messages icon (`MessageCircle`); the feedback icon stays in the header but uses a non-message glyph. |
| Which glyph for feedback? | `MessageCircleQuestion` (chat-bubble with `?`). Same on web and mobile. |
| Mon espace content on both platforms? | `Mes publications` + `Mes participations` (stacked sections), identical content on web and mobile. |
| Visual treatment for type chips on web? | Mirror mobile exactly — colored pill on the left, label in the post-type colour, 20%-opacity tinted background. |
| Web feedback placement? | Remove the bottom-right `FeedbackFloat`. Add a `MessageCircleQuestion` icon button to the nav-bar top row (next to the logout icon). |

## Architecture

### Mobile

```
Feed header (gradient strip)
  ├── Messages icon (MessageCircle)            ← NEW
  │     • routes to /messages
  │     • red dot overlay when unread > 0
  ├── Feedback icon (MessageCircleQuestion)    ← glyph swap
  │     • opens existing FeedbackSheet
  ├── Admin shortcut (ShieldCheck, if admin)   ← unchanged
  └── Avatar (initials)                        ← unchanged

Tab bar (bottom)
  Fil | Mon espace | Événements | Alertes | Infos
       └── badge wiring removed (badge moved to feed-header dot)

Mon espace (single scrollable screen)
  ├── Mes publications      (existing MyPostsPanel content, inlined)
  └── Mes participations    (new MyRsvpsPanel — mirrors web RSVP list)

/messages (new Stack route)
  └── InboxPanel             (existing component, unchanged)
```

### Web

```
Nav bar
  Top row:    Commune name | … | Avatar | MessageCircleQuestion ← NEW | LogOut
  Bottom row: Fil | Événements | Messages | Mon espace | Infos pratiques | (Admin)
                                ↑
                                InboxNavLink (existing, has unread badge)

Mon espace (espace-client.tsx)
  ├── Mes publications  (rows redesigned: type chip + title + meta)
  └── Mes participations (rows redesigned: type chip + title + event date/location)

App layout
  └── <FeedbackFloat /> removed
```

## Component-level changes

### Mobile

**`apps/mobile/src/components/feed-header.tsx`** — replace the single `MessageCircle` button with a row of two icons (Messages, Feedback) plus the existing admin/avatar buttons. The Messages button does `router.push("/messages")` and overlays a 8×8px red dot when `unreadCount > 0`. The feedback button opens the existing `FeedbackSheet` and uses the `MessageCircleQuestion` glyph.

The unread count comes from the existing `useUnreadCount` hook (added in the previous task). Realtime invalidation is already mounted at the tab layout root, so the dot updates live.

**`apps/mobile/src/app/(tabs)/exchanges.tsx`** — drop the segmented tab logic and the `Tab` type. Render `<MyPostsPanel />` and `<MyRsvpsPanel />` stacked inside a `<ScrollView>` with section headers. Both panels become flex-natural (no inner FlatList scroll containment) since they share a parent scroll.

**`apps/mobile/src/app/(tabs)/_layout.tsx`** — remove `tabBarBadge`/`tabBarBadgeStyle` from the `exchanges` screen options. Keep `useUnreadCount` and `useRealtimeConversations` mounted (they feed the feed-header dot).

**`apps/mobile/src/components/my-rsvps-panel.tsx`** — new component mirroring `MyPostsPanel`'s structure. Calls `getMyRsvps(supabase, userId)` from `@pretou/shared`. Each row: type chip (always `evenement` color since RSVPs are only for events), title, event date + location, status. Empty state with `📅` icon + "Aucune participation" + "Vos RSVP apparaîtront ici".

**`apps/mobile/src/app/messages/index.tsx`** — new Stack screen (`title: "Messages"`) that renders `<InboxPanel />`. The existing `[convId].tsx` route is unchanged (still pushed onto the stack from `InboxPanel`'s row tap).

**Adjustments to existing panels.** `MyPostsPanel` currently uses its own `FlatList` with `RefreshControl`. When stacked inside the new Mon espace ScrollView, the inner FlatList becomes nested-scroll-problematic. Both panels should switch to non-scrolling layouts (render rows in a `View` with `map`), and `RefreshControl` moves up to the parent ScrollView in `exchanges.tsx`. `useFocusEffect` for refresh-on-focus stays intact (now in the parent screen, calling both panels' load functions).

### Web

**`apps/web/src/app/app/mon-espace/espace-client.tsx`** — rewrite both list rows to mirror mobile:

- Each row: a colored chip on the left (using `POST_TYPE_COLORS[type]` + `POST_TYPE_LABELS[type]` from `@pretou/shared`, identical to mobile), background tinted at 20% opacity (`{POST_TYPE_COLORS[type]}33` Tailwind-arbitrary).
- Title in `font-medium`, single-line truncate.
- Below the title: a muted meta line — relative date for publications (`Aujourd'hui` / `Hier` / `Il y a Xj` / locale date), event date + location for participations.
- `Pin` icon (lucide-react) before the title when `is_pinned`.

Empty states get the rich-card treatment matching mobile — round icon (`📝` for publications, `📅` for participations), bold title, muted subtext.

**`apps/web/src/components/nav-bar.tsx`** — add a `MessageCircleQuestion` icon button between the avatar `Link` and the `LogOut` button. Click toggles a feedback dialog (reusing `FeedbackForm`). Dialog markup matches the existing dialog in `FeedbackFloat` (modal overlay, card, header, close button).

**`apps/web/src/app/layout.tsx`** — remove the `<FeedbackFloat />` mount.

**`apps/web/src/components/feedback-float.tsx`** — delete. The dialog markup migrates into nav-bar (or extracted to a small `FeedbackDialog` component if it makes nav-bar too large; decide during implementation).

### Shared package

No new exports needed. `POST_TYPE_COLORS`, `POST_TYPE_LABELS`, `getMyPosts`, `getMyRsvps` already exported.

## Visual specs

### Mobile feed-header icon row

```
┌────────────────────────────────────────────────────┐
│ Commune name                  [💬] [❓] [🛡] [JD]   │  ← right cluster
│ 75200 · Île-de-France                               │
└────────────────────────────────────────────────────┘
                                  ↑   ↑
                          MessageCircle  MessageCircleQuestion
                          + red dot       (no dot)
                          if unread > 0
```

Each icon: 34×34px circular `rgba(255,255,255,0.2)` background, white glyph. The red dot is 8×8px, top-right corner, `theme.primary` background, 1.5px white border, `position: 'absolute'`.

### Mon espace row (both platforms)

```
┌──────────────────────────────────────────────┐
│ ┌──────────┐                                 │
│ │ Annonce  │  📌 Marché de Noël              │
│ └──────────┘     Hier                        │
└──────────────────────────────────────────────┘
   ↑ chip            ↑ title with optional pin
   bg: type-color    bottom: relative date
   text: type-color
```

Chip dimensions: padding `4px 10px`, `borderRadius: 12px`, font-size 11px, semibold. Background uses 20% alpha of the type colour (`POST_TYPE_COLORS[type] + "33"` for hex, or `${color}33` interpolation).

### Web nav-bar top row

```
┌────────────────────────────────────────────────────────┐
│ Commune name       …       (JD)   ❓    ⏻              │
│ Motto                       avatar  feedback  logout    │
└────────────────────────────────────────────────────────┘
```

Feedback button mirrors the existing `LogOut` icon button: `text-white/60 hover:text-white`, 4×4 lucide icon, `aria-label="Envoyer un retour"`.

## Testing

- `pnpm --filter @pretou/web test:components` — must stay green. Add a smoke test that the nav-bar renders the feedback icon and clicking it opens the dialog.
- `pnpm --filter @pretou/web exec tsc --noEmit` — must stay green.
- Mobile: typecheck (`npx tsc --noEmit` from `apps/mobile`) must pass; manually verify on device that:
  - The feed-header Messages icon shows the red dot when a new message arrives while on the feed.
  - The dot disappears after opening the conversation.
  - Mon espace shows posts + RSVPs stacked, both with colored chips.
  - The new `/messages` route is reachable and looks identical to the previous in-Mon-espace tab.

## Migration considerations

None. No schema, RLS, or runtime-config changes. The visual + structural changes are pure-frontend.

## Out of scope

- Real-time updates for `Mes participations` (RSVPs change rarely; refresh-on-focus is enough).
- Drag-to-reorder, sort/filter controls inside Mon espace.
- A dedicated Profile screen — the avatar still routes to `/profile` on mobile / `/app/settings` on web, unchanged.
- The shared `feedback-config` package and `/api/feedback` route — kept as-is.
