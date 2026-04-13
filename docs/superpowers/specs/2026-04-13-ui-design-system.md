# UI Design System — Spec

**Date:** 2026-04-13
**Status:** Approved
**Applies to:** Mobile app (Expo), Web admin panel (Next.js), Public commune website (Next.js)

## 1. Design Principles

1. **30-second publishing** — A secretary working 2 days/week must be able to post an announcement in under 30 seconds with zero training. One form, one button, done.

2. **Colors guide usage** — Post type badges (annonce=red, event=orange, entraide=green, discussion=brown) are fixed across all themes. Users learn the color language once. Commune themes color the chrome (header, nav, buttons), not the content signals.

3. **Same structure, different personality** — Layout, fonts, icons, and spacing are identical across all communes. Only the theme palette changes. A resident visiting a neighboring commune's app feels instantly at home.

## 2. Typography

**Font:** DM Sans (Google Fonts) across all platforms.

| Weight | Usage |
|---|---|
| 400 (Regular) | Body text, excerpts, meta info, descriptions |
| 500 (Medium) | Labels, buttons, nav items, form fields |
| 600 (Semi-bold) | Titles, headings, commune name, post titles, badge text |

No heavy/extra-bold weights. Keep everything airy and readable.

**Why DM Sans:** Modern geometric sans-serif, friendly without being childish, excellent readability at small sizes, free, supports French accents and special characters.

## 3. Icons

Two libraries, each for a specific purpose:

| Library | Style | Where used |
|---|---|---|
| Lucide | Line (outline) | Content: badges, comment counts, quick action chips, in-card elements, header motto icon |
| Phosphor Fill | Solid (filled) | Bottom navigation only: house, calendar, chat, bell, user |

**No emoji anywhere in the UI.** Emoji vary across devices and look unprofessional.

**Lucide icons used:**
- `megaphone` — annonce badge, annonces quick action
- `calendar` / `calendar-days` — événement badge, events
- `heart-handshake` — entraide badge
- `message-circle` — discussion badge, comment counts
- `pin` — pinned post label
- `star` — favoris quick action
- `leaf` — default motto icon
- `plus` — FAB icon
- `check` — active RSVP button

**Phosphor Fill icons used (bottom nav):**
- `ph-house` — Fil
- `ph-calendar-dots` — Événements
- `ph-chat-teardrop-dots` — Échanges
- `ph-bell-ringing` — Alertes
- `ph-user-circle` — Profil

## 4. Theme System

### 8 regional themes

Each commune picks one during onboarding. Can be changed anytime by an admin.

Each theme defines:
- **Header gradient** — 3 color stops (dark → mid → light), used in the app header
- **Primary color** — active nav tab, FAB button, links, active states
- **Background tint** — subtle warm/cool tint on page background (not pure white)
- **Muted color** — inactive nav, meta text, secondary elements (derived from primary at low opacity)

| Theme | Slug | Header gradient | Primary | Background | Region |
|---|---|---|---|---|---|
| Terre d'Oc | `terre_doc` | `#BF3328 → #D35230 → #E49035` | `#D35230` | `#FBF7F1` | Sud-Ouest |
| Provence | `provence` | `#6B3FA0 → #8B5DC8 → #A87DDC` | `#6B3FA0` | `#F8F4FB` | Sud-Est |
| Atlantique | `atlantique` | `#1A5276 → #217DAB → #2E9BC6` | `#1A5276` | `#F2F7F9` | Bretagne / Ouest |
| Alpin | `alpin` | `#1B5E3B → #28804E → #3AA66A` | `#1B5E3B` | `#F2F7F3` | Rhône-Alpes |
| Blé Doré | `ble_dore` | `#C8900A → #E2A80E → #F0C030` | `#C8900A` | `#FFFCF0` | Centre |
| Corse | `corse` | `#A03018 → #C04428 → #DA6030` | `#A03018` | `#FDF5EF` | Île de Beauté |
| Champagne | `champagne` | `#B83070 → #D44888 → #E868A4` | `#B83070` | `#FEF5F7` | Nord-Est |
| Ardoise | `ardoise` | `#2C4A6E → #3D6490 → #5080B0` | `#2C4A6E` | `#F0F4F8` | Normandie / Nord |

### Fixed across all themes

| Element | Color | Reason |
|---|---|---|
| Annonce badge | `#D35230` | Functional signal — always red |
| Événement badge | `#D4871C` | Functional signal — always orange |
| Entraide badge | `#508A40` | Functional signal — always green |
| Discussion badge | `#8B7355` | Functional signal — always brown |
| Card background | `#FFFFFF` | Content always on white for readability |
| Card border-radius | `14px` | Consistent rounding |
| Card shadow | `0 1px 6px rgba(160,130,90,0.06)` | Soft, warm shadow |

### Database changes

Add `theme` column to `communes` table:

```sql
ALTER TABLE communes ADD COLUMN theme TEXT NOT NULL DEFAULT 'terre_doc'
  CHECK (theme IN ('terre_doc', 'provence', 'atlantique', 'alpin', 'ble_dore', 'corse', 'champagne', 'ardoise'));
```

The app reads the theme slug and resolves the full palette from a config map in `packages/shared/src/constants/themes.ts`. No need to store individual colors in the database.

## 5. Mobile App Structure

### Bottom navigation (5 tabs)

| Tab | Label | Phosphor icon | Content |
|---|---|---|---|
| 1 | Fil | `ph-house` | Chronological feed. Pinned posts on top, then by date. Quick action filter chips as horizontal scroll. Section headers: "Aujourd'hui", "Cette semaine", etc. |
| 2 | Événements | `ph-calendar-dots` | Upcoming events list with date/location and inline RSVP buttons |
| 3 | Échanges | `ph-chat-teardrop-dots` | Posts I've interacted with: my posts, posts I commented on, posts I RSVP'd to. Badge shows unread count. |
| 4 | Alertes | `ph-bell-ringing` | Push notification history — official announcements, replies to my posts, RSVP updates |
| 5 | Profil | `ph-user-circle` | Name, commune, role. Admin section link (if admin). Settings. Logout. |

### Header (themed per commune)

- Gradient background using theme's 3-stop gradient
- Decorative circles (subtle, `rgba(255,255,255,0.06)` and `0.03`)
- Commune name — DM Sans 600, 21px, white
- Code postal + département — 12px, white at 65% opacity
- Customizable motto in frosted pill — `rgba(255,255,255,0.1)` background, italic, with Lucide icon
- Avatar initials — top-right, 36x36px, rounded-12px, frosted glass effect

### Quick action chips

Horizontal scrollable row below the header:
- Annonces (megaphone icon, red-tinted background)
- Entraide (heart-handshake icon, green-tinted)
- Événements (calendar icon, orange-tinted)
- Favoris (star icon, warm-tinted)

Each chip: white card, 12px border-radius, icon in a 28x28 colored rounded square + label.

### Post cards

- White background, 14px border-radius, soft shadow
- Pinned posts: 2.5px gradient accent bar at top
- Type badge: colored pill with Lucide icon + text (10px, 600 weight, 6px border-radius)
- "Épinglé" label: primary color text on tinted background
- Title: DM Sans 600, 14px
- Excerpt: 400 weight, 13px, 2-3 lines truncated
- Meta line: author · time · comment count (Lucide message-circle). 11px, muted color.
- Events: extra info box (`background: #FFF9F2`, border, calendar icon + date/location)
- Events: RSVP pill buttons. Active = theme primary color. Inactive = tinted background.

### Floating action button (FAB)

- Pill-shaped: `height: 42px, border-radius: 21px`
- Theme gradient background
- White text: Lucide `plus` icon + "Publier"
- Shadow: `0 4px 16px` with primary color at 30% opacity
- Position: bottom-right, above the bottom nav

## 6. Admin Panel (Web)

### Layout

Same nav bar as resident web app. Below that, the admin home screen.

### Admin home screen

**Top row: 3 summary cards**
- "Inscriptions en attente" — count + colored dot if > 0
- "Publications cette semaine" — count
- "Signalements ouverts" — count (shows 0 for v1, placeholder for v3)
- Cards are clickable, scroll to relevant section

**Middle: Mini calendar**
- Current month view
- Events displayed as colored dots on their dates
- Tapping a date shows that day's events in a popover/sidebar
- Read-only — no create/edit from calendar
- Foundation for v3 room booking calendar

**Below: Unified action list**
- Pending user approvals (Approuver / Refuser buttons inline)
- Recent posts (Épingler / Supprimer actions)
- Items labeled with type badges, sorted chronologically

### Publish button

Always visible, top-right of the admin page. Theme gradient background, white text, "+ Publier".

### Publish dialog

Radically simple:
- Type selector: 4 pill buttons (not a dropdown) — visual, one tap
- Title field (plain text input)
- Body field (plain textarea — no markdown, no formatting toolbar, no rich text)
- If type = événement: date picker + location field appear
- "Publier" button
- No image upload in admin v1
- No save as draft
- No preview
- Post once → appears on mobile feed (realtime), commune website (SSR), push notification (if annonce)

## 7. Public Commune Website

### Personality

More institutional than the mobile app. Same theme colors but applied conservatively — thin accent bar at top, white header, colored text and links. Typography-driven, lots of white space.

### Customization per commune (set once during onboarding)

| Field | Database column | Type |
|---|---|---|
| Hero image | `hero_image_url` | Storage URL — photo of the village |
| Commune description | `description` | Text — 2-3 sentences about the commune |
| Coat of arms | `blason_url` | Storage URL — commune blason/logo |
| Infos pratiques | `infos_pratiques` | JSONB — structured text (see below) |

### Database changes

```sql
ALTER TABLE communes ADD COLUMN hero_image_url TEXT;
ALTER TABLE communes ADD COLUMN description TEXT;
ALTER TABLE communes ADD COLUMN blason_url TEXT;
ALTER TABLE communes ADD COLUMN infos_pratiques JSONB DEFAULT '{}';
```

### Infos pratiques structure

```json
{
  "horaires": "Lundi et jeudi, 9h-12h et 14h-17h",
  "contact": "Tél: 05 59 XX XX XX\nEmail: mairie@saint-medard.fr\nAdresse: Place de la Mairie, 64370 Saint-Médard",
  "services": "Médecin : Dr. Dupont, 05 59 XX XX XX\nBoulangerie : Chez Marie, ouverte mar-sam\nPoste : Relais au tabac-presse",
  "associations": "Club de pétanque — Contact Jean-Pierre\nAssociation des parents d'élèves — Réunion 1er mardi du mois",
  "liens": "EPCI : https://cc-pays-de-test.fr\nÉcole : https://ecole-saint-medard.fr\nDéchets : https://dechets-pays-de-test.fr"
}
```

Admin edits this through a simple form with labeled text areas. No formatting, no categories, no search. Plain text that renders on the website. Replaced by structured directories in v3-v4.

### Pages

**Header:**
- Thin gradient bar at very top (theme gradient, ~4px)
- White header background
- Commune name (large, DM Sans 600) + blason if available
- Département underneath
- Motto
- Nav links: Accueil, Événements, Infos pratiques

**Accueil (homepage):**
- Hero image (full-width banner, if uploaded)
- Commune description below hero
- "Dernières annonces" — latest official announcements, full cards
- "Prochains événements" — next 5 upcoming events with date/location
- Subtle app download banner at bottom: "Téléchargez l'application pour participer à la vie de votre commune"

**Événements:**
- Calendar month view (read-only)
- Upcoming events as cards with full details
- Past events below, dimmed

**Infos pratiques:**
- Sections rendered from the JSONB field
- Each key becomes a section heading: "Horaires de la mairie", "Contact", "Services de proximité", "Associations", "Liens utiles"
- Plain text rendered with line breaks preserved

**Footer:**
- "Mairie de [commune name] — Site officiel"
- Legal mentions (auto-generated, RGAA compliance note)

### What the website does NOT show
- No community posts (entraide, discussion) — those are resident-only
- No comments
- No RSVP from the website
- No login / auth
- No admin features

### SEO
- Server-rendered (Next.js SSR)
- `generateMetadata` with commune name as title
- Each commune has its own slug URL
- Proper og:title, og:description per page

### Responsive
- Works on mobile browsers but is not the app
- Subtle banner on mobile viewport: "Téléchargez l'application" with app store links

## 8. New Database Columns Summary

All changes to the `communes` table:

```sql
ALTER TABLE communes ADD COLUMN theme TEXT NOT NULL DEFAULT 'terre_doc'
  CHECK (theme IN ('terre_doc', 'provence', 'atlantique', 'alpin', 'ble_dore', 'corse', 'champagne', 'ardoise'));
ALTER TABLE communes ADD COLUMN motto TEXT;
ALTER TABLE communes ADD COLUMN hero_image_url TEXT;
ALTER TABLE communes ADD COLUMN description TEXT;
ALTER TABLE communes ADD COLUMN blason_url TEXT;
ALTER TABLE communes ADD COLUMN infos_pratiques JSONB DEFAULT '{}';
```

The existing `primary_color` column becomes redundant (replaced by `theme`). Keep it for now for backwards compatibility but the app should derive colors from the theme config, not from `primary_color`.
