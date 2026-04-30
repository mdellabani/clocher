# Website Customization (Phase 1: Homepage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable commune admins to customize their public website homepage with toggleable, reorderable sections (hero carousel, welcome text, highlights, gallery, links, auto-generated news/events/services).

**Architecture:** A `page_sections` table stores ordered, typed content blocks per commune. The homepage reads sections and renders them via dedicated components. A new admin page provides the section editor with drag-to-reorder, toggle visibility, and inline content editing. Fallback to current homepage if no sections exist.

**Tech Stack:** Next.js 15 (App Router, Server Components + Client Components), Supabase (Postgres, Storage), TypeScript, Tailwind CSS.

---

## File Structure

### Task 1: Migration + Storage
- Create: `supabase/migrations/008_page_sections.sql`

### Task 2: Section Render Components
- Create: `apps/web/src/components/sections/hero-section.tsx`
- Create: `apps/web/src/components/sections/welcome-section.tsx`
- Create: `apps/web/src/components/sections/highlights-section.tsx`
- Create: `apps/web/src/components/sections/news-section.tsx`
- Create: `apps/web/src/components/sections/events-section.tsx`
- Create: `apps/web/src/components/sections/gallery-section.tsx`
- Create: `apps/web/src/components/sections/links-section.tsx`
- Create: `apps/web/src/components/sections/text-section.tsx`
- Create: `apps/web/src/components/sections/services-section.tsx`
- Create: `apps/web/src/components/sections/section-renderer.tsx` — maps type to component

### Task 3: Homepage Renderer
- Modify: `apps/web/src/app/[commune-slug]/page.tsx` — query sections, render or fallback

### Task 4: Admin Section Editors
- Create: `apps/web/src/components/admin/section-editors/hero-editor.tsx`
- Create: `apps/web/src/components/admin/section-editors/welcome-editor.tsx`
- Create: `apps/web/src/components/admin/section-editors/highlights-editor.tsx`
- Create: `apps/web/src/components/admin/section-editors/gallery-editor.tsx`
- Create: `apps/web/src/components/admin/section-editors/links-editor.tsx`
- Create: `apps/web/src/components/admin/section-editors/text-editor.tsx`
- Create: `apps/web/src/components/admin/section-editors/section-editor.tsx` — maps type to editor

### Task 5: Admin Homepage Editor Page
- Create: `apps/web/src/app/admin/homepage/page.tsx`
- Create: `apps/web/src/app/admin/homepage/actions.ts`
- Modify: `apps/web/src/app/admin/dashboard/page.tsx` — add link to homepage editor

### Task 6: Update CLAUDE.md

---

## Task 1: Migration + Storage

**Files:**
- Create: `supabase/migrations/008_page_sections.sql`

- [ ] **Step 1: Create migration**

```sql
-- Page sections table
CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID NOT NULL REFERENCES communes(id),
  page TEXT NOT NULL DEFAULT 'homepage',
  section_type TEXT NOT NULL CHECK (section_type IN (
    'hero', 'welcome', 'highlights', 'news', 'events',
    'gallery', 'links', 'text', 'services'
  )),
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_sections_commune_page ON page_sections(commune_id, page, sort_order);

ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

-- Public read for website rendering
CREATE POLICY "Anyone can view page sections"
  ON page_sections FOR SELECT TO anon, authenticated
  USING (true);

-- Admin CRUD
CREATE POLICY "Admins can insert page sections"
  ON page_sections FOR INSERT TO authenticated
  WITH CHECK (commune_id = auth_commune_id() AND is_commune_admin());

CREATE POLICY "Admins can update page sections"
  ON page_sections FOR UPDATE TO authenticated
  USING (commune_id = auth_commune_id() AND is_commune_admin());

CREATE POLICY "Admins can delete page sections"
  ON page_sections FOR DELETE TO authenticated
  USING (commune_id = auth_commune_id() AND is_commune_admin());

-- Website images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-images', 'website-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload website images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'website-images');

CREATE POLICY "Anyone can view website images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-images');

CREATE POLICY "Authenticated users can delete website images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'website-images');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/008_page_sections.sql
git commit -m "feat(db): page_sections table + website-images storage bucket"
```

---

## Task 2: Section Render Components

**Files:**
- Create: 9 section components + 1 renderer in `apps/web/src/components/sections/`

- [ ] **Step 1: Create hero section**

Create `apps/web/src/components/sections/hero-section.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

interface HeroContent {
  title?: string;
  subtitle?: string;
  images?: string[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/website-images/${path}`;
}

export function HeroSection({ content }: { content: HeroContent }) {
  const images = content.images ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0 && !content.title) return null;

  return (
    <section className="relative overflow-hidden rounded-[14px]" style={{ minHeight: "320px" }}>
      {images.length > 0 && (
        <div className="absolute inset-0">
          {images.map((img, i) => (
            <img
              key={img}
              src={getImageUrl(img)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
              style={{ opacity: i === currentIndex ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
        </div>
      )}
      {!images.length && (
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))"
        }} />
      )}
      <div className="relative flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center text-white">
        {content.title && (
          <h1 className="text-3xl font-bold drop-shadow-lg sm:text-4xl">{content.title}</h1>
        )}
        {content.subtitle && (
          <p className="mt-3 text-lg opacity-90 drop-shadow">{content.subtitle}</p>
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`h-2 w-2 rounded-full transition-all ${i === currentIndex ? "bg-white w-4" : "bg-white/50"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Create welcome section**

Create `apps/web/src/components/sections/welcome-section.tsx`:

```tsx
interface WelcomeContent {
  title?: string;
  body?: string;
  image?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function WelcomeSection({ content }: { content: WelcomeContent }) {
  if (!content.body) return null;

  return (
    <section className="rounded-[14px] border border-[#f0e8da] bg-white p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <div className={`flex gap-6 ${content.image ? "flex-col sm:flex-row" : ""}`}>
        {content.image && (
          <img
            src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${content.image}`}
            alt=""
            className="h-32 w-32 shrink-0 rounded-xl object-cover"
          />
        )}
        <div>
          {content.title && (
            <h2 className="mb-3 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
              {content.title}
            </h2>
          )}
          <p className="text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-line">
            {content.body}
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create highlights section**

Create `apps/web/src/components/sections/highlights-section.tsx`:

```tsx
import Link from "next/link";

interface HighlightItem {
  title: string;
  description: string;
  link?: string;
  image?: string;
}

interface HighlightsContent {
  items?: HighlightItem[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function HighlightsSection({ content }: { content: HighlightsContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        À la une
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const Card = (
            <div className="rounded-[14px] border border-[#f0e8da] bg-white overflow-hidden shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)]">
              {item.image && (
                <img
                  src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${item.image}`}
                  alt="" className="h-36 w-full object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">{item.description}</p>
              </div>
            </div>
          );
          if (item.link) {
            return <Link key={i} href={item.link} className="block">{Card}</Link>;
          }
          return <div key={i}>{Card}</div>;
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create news section (auto-generated)**

Create `apps/web/src/components/sections/news-section.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";

export async function NewsSection({ communeId }: { communeId: string }) {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, body, created_at")
    .eq("commune_id", communeId)
    .eq("type", "annonce")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!posts || posts.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Dernières actualités
      </h2>
      <div className="space-y-3">
        {posts.map((post) => (
          <article key={post.id}
            className="rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(140,120,80,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-[var(--foreground)]">{post.title}</h3>
              <time className="shrink-0 text-xs text-[var(--muted-foreground)]">
                {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </time>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{post.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create events section (auto-generated)**

Create `apps/web/src/components/sections/events-section.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";

export async function EventsSection({ communeId }: { communeId: string }) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: events } = await supabase
    .from("posts")
    .select("id, title, body, event_date, event_location")
    .eq("commune_id", communeId)
    .eq("type", "evenement")
    .eq("is_hidden", false)
    .gte("event_date", now)
    .order("event_date", { ascending: true })
    .limit(5);

  if (!events || events.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Prochains événements
      </h2>
      <div className="space-y-3">
        {events.map((event) => (
          <article key={event.id}
            className="rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(140,120,80,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-[var(--foreground)]">{event.title}</h3>
              {event.event_date && (
                <time className="shrink-0 text-xs font-medium" style={{ color: "var(--theme-primary)" }}>
                  {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </time>
              )}
            </div>
            {event.event_location && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{event.event_location}</p>
            )}
            {event.body && (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{event.body}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create gallery section**

Create `apps/web/src/components/sections/gallery-section.tsx`:

```tsx
"use client";

import { useState } from "react";

interface GalleryImage {
  url: string;
  caption?: string;
}

interface GalleryContent {
  images?: GalleryImage[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function GallerySection({ content }: { content: GalleryContent }) {
  const images = content.images ?? [];
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Galerie photos
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button key={i} onClick={() => setLightbox(i)}
            className="group relative overflow-hidden rounded-lg aspect-square">
            <img
              src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${img.url}?width=300&height=300&resize=cover`}
              alt={img.caption ?? ""}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white">{img.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>
      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}>
          <img
            src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${images[lightbox].url}`}
            alt={images[lightbox].caption ?? ""}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white/30">
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Create links section**

Create `apps/web/src/components/sections/links-section.tsx`:

```tsx
interface LinkItem {
  emoji: string;
  label: string;
  url: string;
}

interface LinksContent {
  items?: LinkItem[];
}

export function LinksSection({ content }: { content: LinksContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Liens rapides
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <a key={i} href={item.url} target={item.url.startsWith("http") ? "_blank" : undefined}
            rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
            className="flex items-center gap-3 rounded-[14px] border border-[#f0e8da] bg-white px-4 py-3 shadow-[0_1px_4px_rgba(140,120,80,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(140,120,80,0.12)]">
            <span className="text-xl">{item.emoji}</span>
            <span className="text-sm font-medium" style={{ color: "var(--theme-primary)" }}>{item.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Create text section**

Create `apps/web/src/components/sections/text-section.tsx`:

```tsx
interface TextContent {
  title?: string;
  body?: string;
  image?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function TextSection({ content }: { content: TextContent }) {
  if (!content.body) return null;

  return (
    <section className="rounded-[14px] border border-[#f0e8da] bg-white p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      {content.title && (
        <h2 className="mb-3 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
          {content.title}
        </h2>
      )}
      <div className={content.image ? "flex flex-col gap-4 sm:flex-row" : ""}>
        <p className="flex-1 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-line">
          {content.body}
        </p>
        {content.image && (
          <img
            src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${content.image}`}
            alt="" className="h-48 w-full rounded-lg object-cover sm:w-64 shrink-0"
          />
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 9: Create services section (auto-generated)**

Create `apps/web/src/components/sections/services-section.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export async function ServicesSection({ communeId }: { communeId: string }) {
  const supabase = await createClient();
  const { data: commune } = await supabase
    .from("communes")
    .select("name, phone, email, address, opening_hours")
    .eq("id", communeId)
    .single();

  if (!commune) return null;

  const hasContact = commune.phone || commune.email || commune.address;
  const hours = Object.entries((commune.opening_hours ?? {}) as Record<string, string>)
    .filter(([, v]) => v.trim());

  if (!hasContact && hours.length === 0) return null;

  return (
    <section className="rounded-[14px] p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]" style={{
      background: "linear-gradient(135deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))"
    }}>
      <div className="flex flex-col gap-6 text-white sm:flex-row sm:justify-between">
        {hours.length > 0 && (
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={18} />
              <h2 className="text-lg font-semibold">{commune.name}</h2>
            </div>
            <div className="space-y-1 text-sm">
              {hours.map(([day, time]) => (
                <div key={day}>{day.charAt(0).toUpperCase() + day.slice(1)} : {time}</div>
              ))}
            </div>
          </div>
        )}
        {hasContact && (
          <div className="flex-1 space-y-3 text-sm">
            {commune.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <a href={`tel:${commune.phone.replace(/\s/g, "")}`} className="underline hover:opacity-80">
                  {commune.phone}
                </a>
              </div>
            )}
            {commune.email && (
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <a href={`mailto:${commune.email}`} className="underline hover:opacity-80">
                  {commune.email}
                </a>
              </div>
            )}
            {commune.address && (
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{commune.address}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 10: Create section renderer**

Create `apps/web/src/components/sections/section-renderer.tsx`:

```tsx
import { HeroSection } from "./hero-section";
import { WelcomeSection } from "./welcome-section";
import { HighlightsSection } from "./highlights-section";
import { NewsSection } from "./news-section";
import { EventsSection } from "./events-section";
import { GallerySection } from "./gallery-section";
import { LinksSection } from "./links-section";
import { TextSection } from "./text-section";
import { ServicesSection } from "./services-section";

interface PageSection {
  id: string;
  section_type: string;
  content: Record<string, unknown>;
}

export function SectionRenderer({
  section,
  communeId,
}: {
  section: PageSection;
  communeId: string;
}) {
  switch (section.section_type) {
    case "hero":
      return <HeroSection content={section.content as any} />;
    case "welcome":
      return <WelcomeSection content={section.content as any} />;
    case "highlights":
      return <HighlightsSection content={section.content as any} />;
    case "news":
      return <NewsSection communeId={communeId} />;
    case "events":
      return <EventsSection communeId={communeId} />;
    case "gallery":
      return <GallerySection content={section.content as any} />;
    case "links":
      return <LinksSection content={section.content as any} />;
    case "text":
      return <TextSection content={section.content as any} />;
    case "services":
      return <ServicesSection communeId={communeId} />;
    default:
      return null;
  }
}
```

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components/sections/
git commit -m "feat: section render components for homepage customization (9 types + renderer)"
```

---

## Task 3: Homepage Renderer

**Files:**
- Modify: `apps/web/src/app/[commune-slug]/page.tsx`

- [ ] **Step 1: Update homepage to use sections with fallback**

Replace `apps/web/src/app/[commune-slug]/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@pretou/shared";
import { SectionRenderer } from "@/components/sections/section-renderer";

type Props = {
  params: Promise<{ "commune-slug": string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);
  return {
    title: commune ? `${commune.name} — Commune` : "Commune",
  };
}

export default async function CommuneHomePage({ params }: Props) {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);

  if (!commune) notFound();

  // Fetch page sections
  const { data: sections } = await supabase
    .from("page_sections")
    .select("id, section_type, content")
    .eq("commune_id", commune.id)
    .eq("page", "homepage")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  // If sections exist, render them
  if (sections && sections.length > 0) {
    return (
      <div className="space-y-8">
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            communeId={commune.id}
          />
        ))}
      </div>
    );
  }

  // Fallback: current homepage (announcements + events)
  const now = new Date().toISOString();
  const [{ data: announcements }, { data: events }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, body, created_at")
      .eq("commune_id", commune.id)
      .eq("type", "annonce")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("posts")
      .select("id, title, body, event_date, event_location")
      .eq("commune_id", commune.id)
      .eq("type", "evenement")
      .gte("event_date", now)
      .order("event_date", { ascending: true })
      .limit(5),
  ]);

  return (
    <div className="space-y-10">
      {commune.hero_image_url && (
        <img src={commune.hero_image_url} alt={commune.name}
          className="max-h-80 w-full rounded-xl object-cover" />
      )}
      {commune.description && (
        <p className="text-[var(--foreground)] leading-relaxed">{commune.description}</p>
      )}
      {events && events.length > 0 && (
        <section>
          <h2 className="mb-4 border-b-2 pb-2 text-xl font-semibold"
            style={{ borderColor: "var(--theme-primary)", color: "var(--foreground)" }}>
            Prochains événements
          </h2>
          <div className="space-y-4">
            {events.map((event) => (
              <article key={event.id} className="rounded-[14px] bg-white p-5 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{event.title}</h3>
                  {event.event_date && (
                    <time className="shrink-0 text-sm text-[var(--muted-foreground)]">
                      {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </time>
                  )}
                </div>
                {event.event_location && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{event.event_location}</p>}
                {event.body && <p className="mt-2 line-clamp-3 text-sm text-[var(--foreground)]/80">{event.body}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-4 border-b-2 pb-2 text-xl font-semibold"
          style={{ borderColor: "var(--theme-primary)", color: "var(--foreground)" }}>
          Dernières annonces
        </h2>
        {announcements && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((post) => (
              <article key={post.id} className="rounded-[14px] bg-white p-5 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{post.title}</h3>
                  <time className="shrink-0 text-sm text-[var(--muted-foreground)]">
                    {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--foreground)]/80">{post.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">Aucune annonce pour le moment.</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\[commune-slug\]/page.tsx
git commit -m "feat: homepage renders sections with fallback to current layout"
```

---

## Task 4: Admin Section Editors

**Files:**
- Create: 6 editor components + 1 mapper in `apps/web/src/components/admin/section-editors/`

- [ ] **Step 1: Create hero editor**

Create `apps/web/src/components/admin/section-editors/hero-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface HeroContent {
  title?: string;
  subtitle?: string;
  images?: string[];
}

interface HeroEditorProps {
  content: HeroContent;
  onSave: (content: HeroContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function HeroEditor({ content, onSave, onUploadImage }: HeroEditorProps) {
  const [title, setTitle] = useState(content.title ?? "");
  const [subtitle, setSubtitle] = useState(content.subtitle ?? "");
  const [images, setImages] = useState<string[]>(content.images ?? []);
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await onUploadImage(file);
    if (path && images.length < 5) {
      setImages([...images, path]);
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ title, subtitle, images });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (ex: Saint-Martin-de-Villereglan)"
        className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sous-titre (ex: Bienvenue dans notre commune)"
        className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <div>
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Images ({images.length}/5) — plusieurs images = carrousel automatique
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative h-20 w-28 overflow-hidden rounded-lg border border-[#e8dfd0]">
              <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/website-images/${img}`}
                alt="" className="h-full w-full object-cover" />
              <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"><Trash2 size={10} /></button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="flex h-20 w-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#e8dfd0] text-xs text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]">
              + Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create welcome editor**

Create `apps/web/src/components/admin/section-editors/welcome-editor.tsx`:

```tsx
"use client";

import { useState } from "react";

interface WelcomeContent {
  title?: string;
  body?: string;
  image?: string;
}

interface WelcomeEditorProps {
  content: WelcomeContent;
  onSave: (content: WelcomeContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function WelcomeEditor({ content, onSave, onUploadImage }: WelcomeEditorProps) {
  const [title, setTitle] = useState(content.title ?? "");
  const [body, setBody] = useState(content.body ?? "");
  const [image, setImage] = useState(content.image ?? "");
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await onUploadImage(file);
    if (path) setImage(path);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ title, body, image: image || undefined });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (ex: Mot du maire)"
        className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Texte de bienvenue..."
        rows={4} className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        {image && (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
            <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/website-images/${image}`}
              alt="" className="h-full w-full object-cover" />
            <button onClick={() => setImage("")}
              className="absolute right-0 top-0 rounded-full bg-red-500 p-0.5 text-white text-xs">✕</button>
          </div>
        )}
        <label className="cursor-pointer text-xs font-medium underline" style={{ color: "var(--theme-primary)" }}>
          {image ? "Changer la photo" : "Ajouter une photo (optionnel)"}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create highlights editor**

Create `apps/web/src/components/admin/section-editors/highlights-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface HighlightItem { title: string; description: string; link?: string; image?: string; }
interface HighlightsContent { items?: HighlightItem[]; }

interface HighlightsEditorProps {
  content: HighlightsContent;
  onSave: (content: HighlightsContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function HighlightsEditor({ content, onSave, onUploadImage }: HighlightsEditorProps) {
  const [items, setItems] = useState<HighlightItem[]>(content.items ?? []);
  const [saving, setSaving] = useState(false);

  function updateItem(index: number, field: keyof HighlightItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleImageUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await onUploadImage(file);
    if (path) updateItem(index, "image", path);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ items: items.filter((item) => item.title.trim()) });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-[#e8dfd0] p-3 space-y-2">
          <div className="flex gap-2">
            <input type="text" value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)}
              placeholder="Titre" className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            <button onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
          </div>
          <input type="text" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
            placeholder="Description" className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <input type="text" value={item.link ?? ""} onChange={(e) => updateItem(i, "link", e.target.value)}
              placeholder="Lien (optionnel)" className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            <label className="cursor-pointer rounded-lg border border-[#e8dfd0] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[#fafaf9]">
              📷 {item.image ? "✓" : "+"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(i, e)} />
            </label>
          </div>
        </div>
      ))}
      {items.length < 4 && (
        <button onClick={() => setItems([...items, { title: "", description: "" }])}
          className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--theme-primary)" }}>
          <Plus size={14} /> Ajouter un élément
        </button>
      )}
      <div>
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create gallery editor**

Create `apps/web/src/components/admin/section-editors/gallery-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface GalleryImage { url: string; caption?: string; }
interface GalleryContent { images?: GalleryImage[]; }

interface GalleryEditorProps {
  content: GalleryContent;
  onSave: (content: GalleryContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function GalleryEditor({ content, onSave, onUploadImage }: GalleryEditorProps) {
  const [images, setImages] = useState<GalleryImage[]>(content.images ?? []);
  const [saving, setSaving] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (images.length >= 12) break;
      const path = await onUploadImage(file);
      if (path) {
        setImages((prev) => [...prev, { url: path }]);
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ images });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-[var(--muted-foreground)]">Photos ({images.length}/12)</label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-[#e8dfd0]">
            <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/website-images/${img.url}`}
              alt="" className="h-full w-full object-cover" />
            <button onClick={() => setImages(images.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"><Trash2 size={10} /></button>
            <input type="text" value={img.caption ?? ""} placeholder="Légende"
              onChange={(e) => { const u = [...images]; u[i] = { ...u[i], caption: e.target.value }; setImages(u); }}
              className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-xs text-white placeholder:text-white/60 outline-none" />
          </div>
        ))}
        {images.length < 12 && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#e8dfd0] text-sm text-[var(--muted-foreground)] hover:border-[var(--theme-primary)]">
            + Photos
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create links editor**

Create `apps/web/src/components/admin/section-editors/links-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

interface LinkItem { emoji: string; label: string; url: string; }
interface LinksContent { items?: LinkItem[]; }

interface LinksEditorProps {
  content: LinksContent;
  onSave: (content: LinksContent) => Promise<void>;
}

export function LinksEditor({ content, onSave }: LinksEditorProps) {
  const [items, setItems] = useState<LinkItem[]>(content.items ?? []);
  const [saving, setSaving] = useState(false);

  function updateItem(index: number, field: keyof LinkItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ items: items.filter((item) => item.label.trim()) });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" value={item.emoji} onChange={(e) => updateItem(i, "emoji", e.target.value)}
            placeholder="📋" className="w-12 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-2 py-1.5 text-center text-sm" />
          <input type="text" value={item.label} onChange={(e) => updateItem(i, "label", e.target.value)}
            placeholder="Label" className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <input type="text" value={item.url} onChange={(e) => updateItem(i, "url", e.target.value)}
            placeholder="https://..." className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <button onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
        </div>
      ))}
      {items.length < 6 && (
        <button onClick={() => setItems([...items, { emoji: "🔗", label: "", url: "" }])}
          className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--theme-primary)" }}>
          <Plus size={14} /> Ajouter un lien
        </button>
      )}
      <div>
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create text editor**

Create `apps/web/src/components/admin/section-editors/text-editor.tsx`:

```tsx
"use client";

import { useState } from "react";

interface TextContent { title?: string; body?: string; image?: string; }

interface TextEditorProps {
  content: TextContent;
  onSave: (content: TextContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function TextEditor({ content, onSave, onUploadImage }: TextEditorProps) {
  const [title, setTitle] = useState(content.title ?? "");
  const [body, setBody] = useState(content.body ?? "");
  const [image, setImage] = useState(content.image ?? "");
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await onUploadImage(file);
    if (path) setImage(path);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ title: title || undefined, body, image: image || undefined });
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (optionnel)"
        className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Contenu..."
        rows={4} className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        {image && (
          <div className="relative h-16 w-24 overflow-hidden rounded-lg border">
            <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/website-images/${image}`}
              alt="" className="h-full w-full object-cover" />
            <button onClick={() => setImage("")} className="absolute right-0 top-0 rounded-full bg-red-500 p-0.5 text-white text-xs">✕</button>
          </div>
        )}
        <label className="cursor-pointer text-xs font-medium underline" style={{ color: "var(--theme-primary)" }}>
          {image ? "Changer" : "Ajouter une image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Create section editor mapper**

Create `apps/web/src/components/admin/section-editors/section-editor.tsx`:

```tsx
import { HeroEditor } from "./hero-editor";
import { WelcomeEditor } from "./welcome-editor";
import { HighlightsEditor } from "./highlights-editor";
import { GalleryEditor } from "./gallery-editor";
import { LinksEditor } from "./links-editor";
import { TextEditor } from "./text-editor";

interface SectionEditorProps {
  sectionType: string;
  content: Record<string, unknown>;
  onSave: (content: Record<string, unknown>) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function SectionEditor({ sectionType, content, onSave, onUploadImage }: SectionEditorProps) {
  switch (sectionType) {
    case "hero":
      return <HeroEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "welcome":
      return <WelcomeEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "highlights":
      return <HighlightsEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "gallery":
      return <GalleryEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "links":
      return <LinksEditor content={content as any} onSave={onSave as any} />;
    case "text":
      return <TextEditor content={content as any} onSave={onSave as any} onUploadImage={onUploadImage} />;
    case "news":
    case "events":
    case "services":
      return <p className="text-xs text-[var(--muted-foreground)] italic">Section auto-générée — aucune modification nécessaire.</p>;
    default:
      return null;
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/admin/section-editors/
git commit -m "feat: admin section editors for homepage customization (6 types + mapper)"
```

---

## Task 5: Admin Homepage Editor Page

**Files:**
- Create: `apps/web/src/app/admin/homepage/page.tsx`
- Create: `apps/web/src/app/admin/homepage/actions.ts`
- Modify: `apps/web/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create server actions**

Create `apps/web/src/app/admin/homepage/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role, communes(slug)").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { supabase, communeId: profile.commune_id, slug: (profile.communes as any)?.slug };
}

export async function getSectionsAction() {
  const ctx = await getAdminContext();
  if (!ctx) return { sections: [], error: "Non autorisé" };

  const { data } = await ctx.supabase
    .from("page_sections")
    .select("id, section_type, visible, sort_order, content")
    .eq("commune_id", ctx.communeId)
    .eq("page", "homepage")
    .order("sort_order", { ascending: true });

  return { sections: data ?? [], error: null };
}

export async function updateSectionAction(id: string, data: {
  visible?: boolean;
  sort_order?: number;
  content?: Record<string, unknown>;
}) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  const { error } = await ctx.supabase
    .from("page_sections")
    .update(data)
    .eq("id", id)
    .eq("commune_id", ctx.communeId);

  if (error) return { error: error.message };
  if (ctx.slug) revalidatePath(`/${ctx.slug}`);
  return { error: null };
}

export async function addSectionAction(sectionType: string, sortOrder: number) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé", id: null };

  const { data, error } = await ctx.supabase
    .from("page_sections")
    .insert({
      commune_id: ctx.communeId,
      page: "homepage",
      section_type: sectionType,
      sort_order: sortOrder,
      visible: true,
      content: {},
    })
    .select("id")
    .single();

  if (error) return { error: error.message, id: null };
  if (ctx.slug) revalidatePath(`/${ctx.slug}`);
  return { error: null, id: data.id };
}

export async function deleteSectionAction(id: string) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  const { error } = await ctx.supabase
    .from("page_sections")
    .delete()
    .eq("id", id)
    .eq("commune_id", ctx.communeId);

  if (error) return { error: error.message };
  if (ctx.slug) revalidatePath(`/${ctx.slug}`);
  return { error: null };
}

export async function reorderSectionsAction(orderedIds: string[]) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  for (let i = 0; i < orderedIds.length; i++) {
    await ctx.supabase
      .from("page_sections")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("commune_id", ctx.communeId);
  }

  if (ctx.slug) revalidatePath(`/${ctx.slug}`);
  return { error: null };
}

export async function uploadSectionImageAction(formData: FormData): Promise<string | null> {
  const ctx = await getAdminContext();
  if (!ctx) return null;

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return null;

  const ext = file.name.split(".").pop() ?? "webp";
  const path = `${ctx.communeId}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await ctx.supabase.storage
    .from("website-images")
    .upload(path, arrayBuffer, { contentType: file.type });

  return error ? null : path;
}

export async function seedDefaultSectionsAction() {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  // Check if sections already exist
  const { count } = await ctx.supabase
    .from("page_sections")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", ctx.communeId)
    .eq("page", "homepage");

  if ((count ?? 0) > 0) return { error: null }; // Already seeded

  const defaults = [
    { section_type: "hero", sort_order: 0, content: {} },
    { section_type: "news", sort_order: 1, content: {} },
    { section_type: "events", sort_order: 2, content: {} },
    { section_type: "services", sort_order: 3, content: {} },
  ];

  for (const section of defaults) {
    await ctx.supabase.from("page_sections").insert({
      commune_id: ctx.communeId,
      page: "homepage",
      ...section,
    });
  }

  return { error: null };
}
```

- [ ] **Step 2: Create homepage editor page**

Create `apps/web/src/app/admin/homepage/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@pretou/shared";
import { ThemeInjector } from "@/components/theme-injector";
import { HomepageEditor } from "./homepage-editor";

export default async function AdminHomepagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");

  const { data: sections } = await supabase
    .from("page_sections")
    .select("id, section_type, visible, sort_order, content")
    .eq("commune_id", profile.commune_id)
    .eq("page", "homepage")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <ThemeInjector theme={profile.communes?.theme} customPrimaryColor={profile.communes?.custom_primary_color} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Éditeur de page d'accueil</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Personnalisez les sections de votre site communal</p>
        </div>
        <a href="/admin/dashboard" className="text-sm underline" style={{ color: "var(--theme-primary)" }}>
          ← Retour au tableau de bord
        </a>
      </div>
      <HomepageEditor initialSections={(sections ?? []) as any[]} />
    </div>
  );
}
```

- [ ] **Step 3: Create homepage editor client component**

Create `apps/web/src/app/admin/homepage/homepage-editor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronUp, GripVertical, Trash2, Plus } from "lucide-react";
import { SectionEditor } from "@/components/admin/section-editors/section-editor";
import {
  updateSectionAction,
  addSectionAction,
  deleteSectionAction,
  reorderSectionsAction,
  uploadSectionImageAction,
  seedDefaultSectionsAction,
} from "./actions";

const SECTION_LABELS: Record<string, { icon: string; label: string }> = {
  hero: { icon: "🖼️", label: "Héro / Bannière" },
  welcome: { icon: "👋", label: "Mot du maire" },
  highlights: { icon: "⭐", label: "À la une" },
  news: { icon: "📰", label: "Dernières actualités" },
  events: { icon: "📅", label: "Prochains événements" },
  gallery: { icon: "📸", label: "Galerie photos" },
  links: { icon: "🔗", label: "Liens rapides" },
  text: { icon: "📝", label: "Texte libre" },
  services: { icon: "🏛️", label: "Infos mairie" },
};

const SINGLETON_TYPES = ["hero", "welcome", "highlights", "news", "events", "links", "services"];

interface Section {
  id: string;
  section_type: string;
  visible: boolean;
  sort_order: number;
  content: Record<string, unknown>;
}

export function HomepageEditor({ initialSections }: { initialSections: Section[] }) {
  const [sections, setSections] = useState(initialSections);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function handleSeedDefaults() {
    setSeeding(true);
    await seedDefaultSectionsAction();
    window.location.reload();
  }

  async function handleToggleVisibility(id: string, currentVisible: boolean) {
    await updateSectionAction(id, { visible: !currentVisible });
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, visible: !currentVisible } : s));
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
    await reorderSectionsAction(newSections.map((s) => s.id));
  }

  async function handleMoveDown(index: number) {
    if (index >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
    await reorderSectionsAction(newSections.map((s) => s.id));
  }

  async function handleSaveContent(id: string, content: Record<string, unknown>) {
    await updateSectionAction(id, { content });
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, content } : s));
  }

  async function handleUploadImage(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.set("file", file);
    return uploadSectionImageAction(formData);
  }

  async function handleAddSection(type: string) {
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.sort_order), -1);
    const result = await addSectionAction(type, maxOrder + 1);
    if (result.id) {
      setSections([...sections, {
        id: result.id,
        section_type: type,
        visible: true,
        sort_order: maxOrder + 1,
        content: {},
      }]);
      setExpandedId(result.id);
    }
  }

  async function handleDeleteSection(id: string) {
    if (!confirm("Supprimer cette section ?")) return;
    await deleteSectionAction(id);
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  const usedSingletonTypes = sections.map((s) => s.section_type).filter((t) => SINGLETON_TYPES.includes(t));
  const availableTypes = Object.keys(SECTION_LABELS).filter(
    (t) => !SINGLETON_TYPES.includes(t) || !usedSingletonTypes.includes(t)
  );

  if (sections.length === 0) {
    return (
      <div className="rounded-[14px] border border-[#f0e8da] bg-white p-8 text-center shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
        <p className="text-[var(--muted-foreground)]">Aucune section configurée.</p>
        <button onClick={handleSeedDefaults} disabled={seeding}
          className="mt-4 rounded-lg px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {seeding ? "Création..." : "Créer les sections par défaut"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const info = SECTION_LABELS[section.section_type] ?? { icon: "❓", label: section.section_type };
        const isExpanded = expandedId === section.id;
        const isAutoGenerated = ["news", "events", "services"].includes(section.section_type);

        return (
          <div key={section.id}
            className={`rounded-[14px] border bg-white shadow-[0_1px_4px_rgba(140,120,80,0.06)] transition-all ${
              section.visible ? "border-[#f0e8da]" : "border-gray-200 opacity-60"
            }`}>
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => handleMoveUp(index)} disabled={index === 0}
                  className="rounded p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => handleMoveDown(index)} disabled={index === sections.length - 1}
                  className="rounded p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20">
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Title */}
              <button onClick={() => setExpandedId(isExpanded ? null : section.id)}
                className="flex flex-1 items-center gap-2 text-left">
                <span className="text-lg">{info.icon}</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{info.label}</span>
                {isAutoGenerated && (
                  <span className="rounded bg-[var(--theme-pin-bg)] px-1.5 py-0.5 text-[10px] font-medium" style={{ color: "var(--theme-primary)" }}>
                    Auto
                  </span>
                )}
              </button>

              {/* Visibility toggle */}
              <button onClick={() => handleToggleVisibility(section.id, section.visible)}
                className="rounded p-1.5 hover:bg-[#fafaf9]"
                title={section.visible ? "Masquer" : "Afficher"}>
                {section.visible
                  ? <Eye size={16} style={{ color: "var(--theme-primary)" }} />
                  : <EyeOff size={16} className="text-gray-400" />}
              </button>

              {/* Delete */}
              <button onClick={() => handleDeleteSection(section.id)}
                className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="border-t border-[#f0e8da] px-4 py-4">
                <SectionEditor
                  sectionType={section.section_type}
                  content={section.content}
                  onSave={(content) => handleSaveContent(section.id, content)}
                  onUploadImage={handleUploadImage}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Add section */}
      {availableTypes.length > 0 && (
        <div className="flex items-center gap-2">
          <select id="add-section-type" className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm">
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {SECTION_LABELS[type]?.icon} {SECTION_LABELS[type]?.label}
              </option>
            ))}
          </select>
          <button onClick={() => {
            const select = document.getElementById("add-section-type") as HTMLSelectElement;
            if (select) handleAddSection(select.value);
          }}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--theme-primary)" }}>
            <Plus size={14} /> Ajouter
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add link to homepage editor from admin dashboard**

Modify `apps/web/src/app/admin/dashboard/page.tsx`. Add a link card before the existing sections. After the `<div className="flex items-center justify-between">` header section, add:

```tsx
      {/* Homepage editor link */}
      <a href="/admin/homepage"
        className="flex items-center justify-between rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)]">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--theme-primary)" }}>
            🖼️ Éditeur de page d'accueil
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Personnalisez les sections de votre site communal
          </p>
        </div>
        <span style={{ color: "var(--theme-primary)" }}>→</span>
      </a>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/admin/homepage/ apps/web/src/app/admin/dashboard/page.tsx
git commit -m "feat: admin homepage editor with section management, reorder, toggle, seed defaults"
```

---

## Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update status**

Update Current Status to add website customization:

```markdown
- **v2 complete**: commune website (bulletin municipal, conseil municipal, mentions légales), theme customization (custom colors with WCAG check, logo upload), structured contact data, associations management, admin panel, data cleanup, custom domain support, homepage customization (9 section types, toggleable, reorderable)
```

Update Database Schema to add migration:

```markdown
- `008_page_sections.sql` — page_sections table for website customization, website-images storage bucket
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update status — homepage customization complete"
```
