# Website Customization (Phase 1: Homepage) — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Scope:** Toggleable, reorderable sections for the commune website homepage. Phase 2 (custom pages) deferred.

## 1. Data Model

### New table: `page_sections`

```sql
CREATE TABLE page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID NOT NULL REFERENCES communes(id),
  page TEXT NOT NULL DEFAULT 'homepage',
  section_type TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(commune_id, page, section_type, id)
);
```

RLS: public read (anon + authenticated for website rendering), admin insert/update/delete for own commune.

### Section types

| Type | `content` JSONB schema | Auto-generated? | Multiple instances? |
|---|---|---|---|
| `hero` | `{ title: string, subtitle: string, images: string[] }` | No | No |
| `welcome` | `{ title: string, body: string, image?: string }` | No | No |
| `highlights` | `{ items: { title: string, description: string, link?: string, image?: string }[] }` | No | No |
| `news` | `{}` | Yes — latest 3-5 annonce posts | No |
| `events` | `{}` | Yes — next 3-5 upcoming events | No |
| `gallery` | `{ images: { url: string, caption?: string }[] }` | No | Yes |
| `links` | `{ items: { emoji: string, label: string, url: string }[] }` | No | No |
| `text` | `{ title?: string, body: string, image?: string }` | No | Yes |
| `services` | `{}` | Yes — reads commune contact/hours data | No |

### Images

Stored in Supabase Storage bucket `website-images` (public). Image paths stored in `content` JSONB. Same URL pattern as post images: `${SUPABASE_URL}/storage/v1/object/public/website-images/${path}`.

### Default sections

When a commune is created (or on first visit to the homepage editor), seed with:
1. `hero` (visible, order 0) — empty, admin fills
2. `news` (visible, order 1) — auto-generated
3. `events` (visible, order 2) — auto-generated
4. `services` (visible, order 3) — auto from commune data

### Phase 2 extensibility

The `page` column supports custom pages later (e.g. `tourisme`, `demarches`). Same table, same section types, different `page` value. No schema change needed.

## 2. Admin UI — Homepage Editor

### Location

New section in admin panel: "Éditeur de page d'accueil"

### Layout

Vertical list of section cards. Each card shows:
- Drag handle (left) — reorder by dragging
- Section title + type icon
- Visibility toggle (right) — eye icon on/off
- Expand/collapse — click to open inline editor

### Section editors (when expanded)

- `hero` — title input, subtitle input, image upload (1-5 images; multiple = carousel)
- `welcome` — title input, textarea for body, optional portrait image upload
- `highlights` — list of card items (title, description, optional link, optional image), add/remove items
- `gallery` — image grid with upload button, optional caption per image, drag to reorder images
- `links` — list of items (emoji, label, URL), add/remove items
- `text` — optional title input, textarea for body, optional image upload
- `news`, `events`, `services` — no editor (auto-generated), just the visibility toggle

### Adding sections

"+ Ajouter une section" button at bottom, dropdown of available types. `text` and `gallery` can be added multiple times. Other types are singletons — grayed out if already present.

### Saving

Each section saves independently (save button per section). No global "save all".

### No live preview

Admin visits the website in another tab to see changes. No WYSIWYG.

## 3. Homepage Rendering

### How it works

The commune website homepage (`apps/web/src/app/[commune-slug]/page.tsx`) becomes a section renderer:

1. Query `page_sections` where `commune_id` matches, `page = 'homepage'`, `visible = true`, ordered by `sort_order`
2. For each section, render the matching component
3. Auto-generated sections (`news`, `events`, `services`) fetch data at render time

### Fallback

If a commune has no rows in `page_sections`, the homepage falls back to the current behavior (post feed). Zero regression for existing communes.

### Section components

One component per section type in `apps/web/src/components/sections/`:
- `hero-section.tsx`
- `welcome-section.tsx`
- `highlights-section.tsx`
- `news-section.tsx`
- `events-section.tsx`
- `gallery-section.tsx`
- `links-section.tsx`
- `text-section.tsx`
- `services-section.tsx`

Each receives `content` JSONB as props. Pure presentation (except auto-generated sections which fetch their own data).

All components use the existing theme CSS variables for consistent branding.

## 4. Storage

New bucket: `website-images` (public).

RLS policies:
- Anyone can read (public website)
- Authenticated users can upload (admin checks at application level)
- Authenticated users can delete their commune's images

## Build Order

1. Migration — `page_sections` table + `website-images` bucket
2. Section components — render components for all 9 types
3. Homepage renderer — replace current homepage with section renderer + fallback
4. Admin section editors — individual editor forms per section type
5. Admin homepage editor — the full drag/reorder/toggle/expand UI
6. Default section seeding — populate sections for existing communes

## Deferred (Phase 2)

- Custom pages (`/tourisme`, `/demarches`, etc.) using the same section system
- Pro tier gating with `has_custom_pages` flag
- Page management UI (create/rename/delete pages, nav ordering)
- Pricing model decisions — to be determined after talking to mairies
