# v2 Commune Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete v2 — theme customization with accessibility, data cleanup, bulletin municipal, conseil municipal, mentions légales, updated admin panel and infos pratiques pages.

**Architecture:** Migration adds new structured columns to communes (contact, hours, associations, custom color) and a council_documents table. Palette derivation from a custom primary color lives in packages/shared. ThemeInjector and useTheme are updated to accept a custom color override. Three new public website pages. Admin panel gets four new management sections. All three infos pratiques pages are updated to read from structured columns instead of parsing unstructured strings.

**Tech Stack:** Next.js 15 (App Router), Expo (React Native), Supabase (Postgres, Storage), TypeScript, Tailwind CSS, shadcn/ui.

---

## File Structure

### Task 1: Migration & Data Cleanup
- Create: `supabase/migrations/006_v2_commune_website.sql`

### Task 2: Theme Customization
- Create: `packages/shared/src/utils/color.ts` — palette derivation + WCAG contrast
- Modify: `packages/shared/src/constants/themes.ts` — add `resolveTheme()` that handles custom color
- Modify: `packages/shared/src/index.ts` — export new utils
- Modify: `apps/web/src/components/theme-injector.tsx` — accept `customPrimaryColor` prop
- Modify: `apps/mobile/src/lib/theme-context.tsx` — accept `customPrimaryColor` in ThemeProvider
- Create: `apps/web/src/components/admin/theme-customizer.tsx` — admin theme + color + logo UI
- Create: `apps/web/src/app/admin/dashboard/theme-actions.ts` — server actions
- Modify: `apps/web/src/app/admin/dashboard/page.tsx` — add theme customizer section

### Task 3: Admin Panel — Commune Info, Associations, Conseil Municipal
- Create: `apps/web/src/components/admin/commune-info-form.tsx` — address, phone, email, hours
- Create: `apps/web/src/components/admin/associations-manager.tsx` — CRUD for associations JSONB
- Create: `apps/web/src/components/admin/council-documents.tsx` — upload + list documents
- Create: `apps/web/src/app/admin/dashboard/commune-actions.ts` — server actions for info + associations
- Create: `apps/web/src/app/admin/dashboard/council-actions.ts` — server actions for documents
- Modify: `apps/web/src/app/admin/dashboard/page.tsx` — add new sections

### Task 4: Infos Pratiques Update (all 3 surfaces)
- Modify: `apps/web/src/app/app/infos-pratiques/page.tsx` — read from structured columns
- Modify: `apps/web/src/app/[commune-slug]/infos-pratiques/page.tsx` — same
- Modify: `apps/mobile/src/app/(tabs)/infos-pratiques.tsx` — same

### Task 5: New Public Website Pages
- Create: `apps/web/src/app/[commune-slug]/bulletin/page.tsx`
- Create: `apps/web/src/app/[commune-slug]/conseil-municipal/page.tsx`
- Create: `apps/web/src/app/[commune-slug]/mentions-legales/page.tsx`
- Modify: `apps/web/src/app/[commune-slug]/layout.tsx` — update nav + footer

### Task 6: Update CLAUDE.md + Shared Types
- Modify: `packages/shared/src/types/commune.ts` — update CommuneWithDesign type
- Modify: `CLAUDE.md` — update status

---

## Task 1: Migration & Data Cleanup

**Files:**
- Create: `supabase/migrations/006_v2_commune_website.sql`

- [ ] **Step 1: Create migration file**

```sql
-- New columns on communes
ALTER TABLE communes ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';
ALTER TABLE communes ADD COLUMN IF NOT EXISTS custom_primary_color TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS associations JSONB DEFAULT '[]';

-- Drop unused column
ALTER TABLE communes DROP COLUMN IF EXISTS primary_color;

-- Council documents table
CREATE TABLE IF NOT EXISTS council_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID NOT NULL REFERENCES communes(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('deliberation', 'pv', 'compte_rendu')),
  document_date DATE NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_council_documents_commune_id ON council_documents(commune_id);

ALTER TABLE council_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view council documents"
  ON council_documents FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert council documents"
  ON council_documents FOR INSERT TO authenticated
  WITH CHECK (
    commune_id = auth_commune_id() AND is_commune_admin()
  );

CREATE POLICY "Admins can delete council documents"
  ON council_documents FOR DELETE TO authenticated
  USING (
    commune_id = auth_commune_id() AND is_commune_admin()
  );

-- Council documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('council-documents', 'council-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload council documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'council-documents');

CREATE POLICY "Anyone can view council documents files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'council-documents');

CREATE POLICY "Admins can delete council documents files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'council-documents');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/006_v2_commune_website.sql
git commit -m "feat(db): v2 migration — commune contact fields, council documents, drop primary_color"
```

---

## Task 2: Theme Customization

**Files:**
- Create: `packages/shared/src/utils/color.ts`
- Modify: `packages/shared/src/constants/themes.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/components/theme-injector.tsx`
- Modify: `apps/mobile/src/lib/theme-context.tsx`
- Create: `apps/web/src/components/admin/theme-customizer.tsx`
- Create: `apps/web/src/app/admin/dashboard/theme-actions.ts`
- Modify: `apps/web/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create color utility**

Create `packages/shared/src/utils/color.ts`:

```typescript
// Convert hex to HSL
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Derive a full theme palette from a single primary hex color */
export function deriveThemeFromColor(hex: string): {
  primary: string;
  gradient: [string, string, string];
  background: string;
  muted: string;
  pinBg: string;
} {
  const [h, s, l] = hexToHsl(hex);
  return {
    primary: hex,
    gradient: [
      hslToHex(h, s, Math.max(l - 10, 10)),
      hex,
      hslToHex(h, s, Math.min(l + 15, 90)),
    ],
    background: hslToHex(h, Math.round(s * 0.3), 95),
    muted: hslToHex(h, Math.round(s * 0.5), 65),
    pinBg: hslToHex(h, Math.round(s * 0.3), 92),
  };
}

/**
 * Check WCAG AA contrast ratio of a color against white.
 * Returns the ratio (>= 4.5 passes AA for normal text).
 */
export function contrastRatioOnWhite(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // White luminance = 1.0
  return (1.05) / (luminance + 0.05);
}

/** Suggest a darker shade that passes WCAG AA (4.5:1) on white */
export function suggestAccessibleShade(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  for (let testL = l; testL >= 10; testL -= 5) {
    const candidate = hslToHex(h, s, testL);
    if (contrastRatioOnWhite(candidate) >= 4.5) return candidate;
  }
  return hslToHex(h, s, 20); // fallback to very dark
}

/** Validate hex color format */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}
```

- [ ] **Step 2: Update themes.ts with resolveTheme()**

Modify `packages/shared/src/constants/themes.ts`. Add at the end of the file, after the `getTheme` function:

```typescript
import { deriveThemeFromColor, isValidHexColor } from "../utils/color";

/**
 * Resolve the final theme config, applying custom primary color if set.
 * This is the function all surfaces should call instead of getTheme().
 */
export function resolveTheme(
  themeSlug: string | null | undefined,
  customPrimaryColor: string | null | undefined
): ThemeConfig {
  const base = getTheme(themeSlug);
  if (!customPrimaryColor || !isValidHexColor(customPrimaryColor)) return base;

  const derived = deriveThemeFromColor(customPrimaryColor);
  return {
    ...base,
    ...derived,
  };
}
```

- [ ] **Step 3: Export new utils from shared index**

Modify `packages/shared/src/index.ts` — add:

```typescript
export { deriveThemeFromColor, contrastRatioOnWhite, suggestAccessibleShade, isValidHexColor } from "./utils/color";
export { resolveTheme } from "./constants/themes";
```

Create `packages/shared/src/utils/index.ts`:

```typescript
export * from "./color";
```

- [ ] **Step 4: Update ThemeInjector to support custom color**

Replace `apps/web/src/components/theme-injector.tsx`:

```tsx
import { resolveTheme } from "@rural-community-platform/shared";

export function ThemeInjector({
  theme,
  customPrimaryColor,
}: {
  theme?: string | null;
  customPrimaryColor?: string | null;
}) {
  const t = resolveTheme(theme, customPrimaryColor);
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --theme-primary: ${t.primary};
        --theme-gradient-1: ${t.gradient[0]};
        --theme-gradient-2: ${t.gradient[1]};
        --theme-gradient-3: ${t.gradient[2]};
        --theme-background: ${t.background};
        --theme-muted: ${t.muted};
        --theme-pin-bg: ${t.pinBg};
        --primary: ${t.primary};
        --ring: ${t.primary};
      }
    `}} />
  );
}
```

Then update ALL ThemeInjector usages to pass `customPrimaryColor`. These files all call `<ThemeInjector theme={...} />`:
- `apps/web/src/app/[commune-slug]/layout.tsx` — change to `<ThemeInjector theme={commune.theme} customPrimaryColor={commune.custom_primary_color} />`
- `apps/web/src/app/admin/dashboard/page.tsx`
- `apps/web/src/app/app/feed/page.tsx`
- `apps/web/src/app/app/settings/page.tsx`
- `apps/web/src/app/app/mon-espace/page.tsx`
- `apps/web/src/app/app/evenements/page.tsx`
- `apps/web/src/app/app/producteurs/page.tsx`
- `apps/web/src/app/app/infos-pratiques/page.tsx`
- `apps/web/src/app/moderation/dashboard/page.tsx`
- `apps/web/src/app/[commune-slug]/infos-pratiques/page.tsx`

For the app pages that get theme from profile (e.g. `profile.communes?.theme`), also read `custom_primary_color`. The `getProfile` query already does `select("*, communes(...)")` so you need to add `custom_primary_color` to what's selected from communes.

- [ ] **Step 5: Update mobile ThemeProvider to support custom color**

Replace `apps/mobile/src/lib/theme-context.tsx`:

```tsx
import { createContext, useContext } from "react";
import { resolveTheme, type ThemeConfig } from "@rural-community-platform/shared";

const ThemeContext = createContext<ThemeConfig>(resolveTheme(null, null));

export function ThemeProvider({
  theme,
  customPrimaryColor,
  children,
}: {
  theme: string | null;
  customPrimaryColor?: string | null;
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={resolveTheme(theme, customPrimaryColor)}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeConfig {
  return useContext(ThemeContext);
}
```

Then find where ThemeProvider is used in the mobile app and pass `customPrimaryColor` from the profile's commune data.

- [ ] **Step 6: Create admin theme customizer component**

Create `apps/web/src/components/admin/theme-customizer.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  THEMES,
  type ThemeSlug,
  contrastRatioOnWhite,
  suggestAccessibleShade,
  isValidHexColor,
} from "@rural-community-platform/shared";
import { updateThemeAction, uploadLogoAction } from "@/app/admin/dashboard/theme-actions";

interface ThemeCustomizerProps {
  currentTheme: string;
  currentCustomColor: string | null;
  currentLogoUrl: string | null;
}

export function ThemeCustomizer({ currentTheme, currentCustomColor, currentLogoUrl }: ThemeCustomizerProps) {
  const router = useRouter();
  const [theme, setTheme] = useState(currentTheme);
  const [customColor, setCustomColor] = useState(currentCustomColor ?? "");
  const [contrastWarning, setContrastWarning] = useState<string | null>(null);
  const [suggestedColor, setSuggestedColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  function handleColorChange(hex: string) {
    setCustomColor(hex);
    if (hex && isValidHexColor(hex)) {
      const ratio = contrastRatioOnWhite(hex);
      if (ratio < 4.5) {
        setContrastWarning("Cette couleur manque de contraste avec le texte blanc. Essayez une teinte plus foncée.");
        setSuggestedColor(suggestAccessibleShade(hex));
      } else {
        setContrastWarning(null);
        setSuggestedColor(null);
      }
    } else {
      setContrastWarning(null);
      setSuggestedColor(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    await updateThemeAction(theme, customColor || null);
    setSaving(false);
    router.refresh();
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.set("logo", file);
    await uploadLogoAction(formData);
    setUploadingLogo(false);
    router.refresh();
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Personnalisation
      </h2>

      {/* Theme picker */}
      <div className="mb-4">
        <label className="text-sm font-medium text-[var(--foreground)]">Thème de base</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(Object.entries(THEMES) as [ThemeSlug, typeof THEMES[ThemeSlug]][]).map(([slug, t]) => (
            <button
              key={slug}
              onClick={() => setTheme(slug)}
              className={`rounded-lg border-2 p-2 text-center text-xs font-medium transition-all ${
                theme === slug ? "border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/20" : "border-[#e8dfd0]"
              }`}
            >
              <div className="mx-auto mb-1 h-6 w-6 rounded-full" style={{ backgroundColor: t.primary }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom color */}
      <div className="mb-4">
        <label className="text-sm font-medium text-[var(--foreground)]">Couleur personnalisée (optionnel)</label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="color"
            value={customColor || "#000000"}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border border-[#e8dfd0]"
          />
          <input
            type="text"
            value={customColor}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#3B82F6"
            className="w-32 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm font-mono"
          />
          {customColor && (
            <button onClick={() => { setCustomColor(""); setContrastWarning(null); setSuggestedColor(null); }}
              className="text-xs text-[var(--muted-foreground)] underline">
              Réinitialiser
            </button>
          )}
        </div>
        {contrastWarning && (
          <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            <p>{contrastWarning}</p>
            {suggestedColor && (
              <button onClick={() => handleColorChange(suggestedColor)}
                className="mt-1 font-medium underline">
                Utiliser {suggestedColor}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Logo upload */}
      <div className="mb-4">
        <label className="text-sm font-medium text-[var(--foreground)]">Logo de la commune</label>
        <div className="mt-2 flex items-center gap-4">
          {currentLogoUrl && (
            <img src={currentLogoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain border border-[#e8dfd0]" />
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e8dfd0] px-3 py-2 text-sm hover:bg-[#fafaf9]">
            <Upload size={14} />
            {uploadingLogo ? "Envoi..." : "Changer le logo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
          </label>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "var(--theme-primary)" }}>
        {saving ? "Enregistrement..." : "Enregistrer le thème"}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Create theme server actions**

Create `apps/web/src/app/admin/dashboard/theme-actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateThemeAction(theme: string, customPrimaryColor: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Non autorisé" };

  const { error } = await supabase.from("communes")
    .update({ theme, custom_primary_color: customPrimaryColor })
    .eq("id", profile.commune_id);

  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function uploadLogoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Non autorisé" };

  const file = formData.get("logo") as File;
  if (!file || file.size === 0) return { error: "Aucun fichier" };

  const ext = file.name.split(".").pop() ?? "png";
  const path = `logos/${profile.commune_id}/logo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars").upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;

  const { error: updateError } = await supabase.from("communes")
    .update({ logo_url: logoUrl }).eq("id", profile.commune_id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}
```

- [ ] **Step 8: Add ThemeCustomizer to admin dashboard**

Modify `apps/web/src/app/admin/dashboard/page.tsx`:

Import: `import { ThemeCustomizer } from "@/components/admin/theme-customizer";`

The existing commune query (for invite_code) should also fetch `theme, custom_primary_color, logo_url`. Update the query and add the component after InviteCodeManager:

```tsx
      <ThemeCustomizer
        currentTheme={commune?.theme ?? "terre_doc"}
        currentCustomColor={commune?.custom_primary_color ?? null}
        currentLogoUrl={commune?.logo_url ?? null}
      />
```

- [ ] **Step 9: Update commune website layout header for logo**

Modify `apps/web/src/app/[commune-slug]/layout.tsx`: The header currently shows `blason_url`. Update to prefer `logo_url`, fallback to `blason_url`:

```tsx
            {(commune.logo_url || commune.blason_url) && (
              <img
                src={commune.logo_url || commune.blason_url!}
                alt={`Logo de ${commune.name}`}
                className="h-10 w-10 object-contain"
              />
            )}
```

- [ ] **Step 10: Commit**

```bash
git add packages/shared/src/utils/ packages/shared/src/constants/themes.ts packages/shared/src/index.ts apps/web/src/components/theme-injector.tsx apps/mobile/src/lib/theme-context.tsx apps/web/src/components/admin/theme-customizer.tsx apps/web/src/app/admin/dashboard/theme-actions.ts apps/web/src/app/admin/dashboard/page.tsx apps/web/src/app/\[commune-slug\]/layout.tsx
git commit -m "feat: theme customization with custom color, WCAG contrast check, logo upload"
```

**IMPORTANT: Propagate custom color to all pages.**

First, update `packages/shared/src/queries/profiles.ts` — the `getProfile` function's commune select:
```typescript
export async function getProfile(client: Client, userId: string) {
  return client.from("profiles").select("*, communes(name, slug, epci_id, theme, motto, custom_primary_color)").eq("id", userId).single();
}
```

Then add `customPrimaryColor={profile.communes?.custom_primary_color}` to every `<ThemeInjector>` call in these files:
- `apps/web/src/app/app/feed/page.tsx`
- `apps/web/src/app/app/settings/page.tsx`
- `apps/web/src/app/app/mon-espace/page.tsx`
- `apps/web/src/app/app/evenements/page.tsx`
- `apps/web/src/app/app/producteurs/page.tsx`
- `apps/web/src/app/app/infos-pratiques/page.tsx` (done in Task 4)
- `apps/web/src/app/admin/dashboard/page.tsx` (done in Step 8)
- `apps/web/src/app/moderation/dashboard/page.tsx`
- `apps/web/src/app/[commune-slug]/layout.tsx` (done in Task 5 Step 4)
- `apps/web/src/app/[commune-slug]/infos-pratiques/page.tsx` (done in Task 4)

For the mobile app, find where `ThemeProvider` is used and pass `customPrimaryColor` from profile commune data.

---

## Task 3: Admin Panel — Commune Info, Associations, Conseil Municipal

**Files:**
- Create: `apps/web/src/components/admin/commune-info-form.tsx`
- Create: `apps/web/src/components/admin/associations-manager.tsx`
- Create: `apps/web/src/components/admin/council-documents.tsx`
- Create: `apps/web/src/app/admin/dashboard/commune-actions.ts`
- Create: `apps/web/src/app/admin/dashboard/council-actions.ts`
- Modify: `apps/web/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create commune info form**

Create `apps/web/src/components/admin/commune-info-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCommuneInfoAction } from "@/app/admin/dashboard/commune-actions";

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

interface CommuneInfoFormProps {
  address: string | null;
  phone: string | null;
  email: string | null;
  openingHours: Record<string, string>;
}

export function CommuneInfoForm({ address, phone, email, openingHours }: CommuneInfoFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    address: address ?? "",
    phone: phone ?? "",
    email: email ?? "",
    hours: { ...Object.fromEntries(DAYS.map((d) => [d, ""])), ...openingHours },
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    const hours = Object.fromEntries(
      Object.entries(form.hours).filter(([, v]) => v.trim())
    );
    const result = await updateCommuneInfoAction({
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      opening_hours: hours,
    });
    setSaving(false);
    setStatus(result.error ? "error" : "success");
    if (!result.error) router.refresh();
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Informations de la commune
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Adresse</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="1 Place de la Mairie, 12345 Commune"
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Téléphone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05 63 00 00 00"
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="mairie@commune.fr"
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--foreground)]">Horaires d'ouverture</label>
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 text-sm capitalize text-[var(--muted-foreground)]">{day}</span>
                <input type="text"
                  value={form.hours[day] ?? ""}
                  onChange={(e) => setForm({ ...form, hours: { ...form.hours, [day]: e.target.value } })}
                  placeholder="Fermé"
                  className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
              </div>
            ))}
          </div>
        </div>
        {status === "success" && <p className="text-sm text-green-600">Informations mises à jour.</p>}
        {status === "error" && <p className="text-sm text-red-600">Erreur lors de la sauvegarde.</p>}
        <button type="submit" disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create associations manager**

Create `apps/web/src/components/admin/associations-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { updateAssociationsAction } from "@/app/admin/dashboard/commune-actions";

interface Association {
  name: string;
  description?: string;
  contact?: string;
  schedule?: string;
}

interface AssociationsManagerProps {
  associations: Association[];
}

export function AssociationsManager({ associations: initial }: AssociationsManagerProps) {
  const router = useRouter();
  const [associations, setAssociations] = useState<Association[]>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function addAssociation() {
    setAssociations([...associations, { name: "" }]);
  }

  function removeAssociation(index: number) {
    setAssociations(associations.filter((_, i) => i !== index));
  }

  function updateField(index: number, field: keyof Association, value: string) {
    const updated = [...associations];
    updated[index] = { ...updated[index], [field]: value };
    setAssociations(updated);
  }

  async function handleSave() {
    const filtered = associations.filter((a) => a.name.trim());
    setSaving(true);
    setStatus("idle");
    const result = await updateAssociationsAction(filtered);
    setSaving(false);
    setStatus(result.error ? "error" : "success");
    if (!result.error) { setAssociations(filtered); router.refresh(); }
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Associations
      </h2>
      <div className="space-y-3">
        {associations.map((assoc, idx) => (
          <div key={idx} className="rounded-lg border border-[#e8dfd0] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input type="text" value={assoc.name} placeholder="Nom de l'association"
                onChange={(e) => updateField(idx, "name", e.target.value)}
                className="flex-1 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm font-medium" />
              <button onClick={() => removeAssociation(idx)} className="rounded p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
            <input type="text" value={assoc.description ?? ""} placeholder="Description (optionnel)"
              onChange={(e) => updateField(idx, "description", e.target.value)}
              className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={assoc.contact ?? ""} placeholder="Contact"
                onChange={(e) => updateField(idx, "contact", e.target.value)}
                className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
              <input type="text" value={assoc.schedule ?? ""} placeholder="Horaires"
                onChange={(e) => updateField(idx, "schedule", e.target.value)}
                className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addAssociation}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--theme-primary)" }}>
        <Plus size={14} /> Ajouter une association
      </button>
      <div className="mt-4">
        {status === "success" && <p className="mb-2 text-sm text-green-600">Associations mises à jour.</p>}
        {status === "error" && <p className="mb-2 text-sm text-red-600">Erreur lors de la sauvegarde.</p>}
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create council documents component**

Create `apps/web/src/components/admin/council-documents.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileText, Upload } from "lucide-react";
import { uploadCouncilDocumentAction, deleteCouncilDocumentAction } from "@/app/admin/dashboard/council-actions";

const CATEGORY_LABELS: Record<string, string> = {
  deliberation: "Délibération",
  pv: "Procès-verbal",
  compte_rendu: "Compte-rendu",
};

interface CouncilDocument {
  id: string;
  title: string;
  category: string;
  document_date: string;
  storage_path: string;
}

interface CouncilDocumentsProps {
  documents: CouncilDocument[];
}

export function CouncilDocuments({ documents }: CouncilDocumentsProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    await uploadCouncilDocumentAction(formData);
    setUploading(false);
    e.currentTarget.reset();
    router.refresh();
  }

  async function handleDelete(id: string, storagePath: string) {
    if (!confirm("Supprimer ce document ?")) return;
    setDeleting(id);
    await deleteCouncilDocumentAction(id, storagePath);
    setDeleting(null);
    router.refresh();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Conseil municipal
      </h2>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="mb-4 space-y-3 rounded-lg border border-[#e8dfd0] p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="title" required placeholder="Titre du document"
            className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <select name="category" required
            className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm">
            <option value="deliberation">Délibération</option>
            <option value="pv">Procès-verbal</option>
            <option value="compte_rendu">Compte-rendu</option>
          </select>
          <input name="document_date" type="date" required
            className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <input name="file" type="file" accept=".pdf" required className="text-sm" />
          <button type="submit" disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--theme-primary)" }}>
            <Upload size={14} />
            {uploading ? "Envoi..." : "Ajouter"}
          </button>
        </div>
      </form>

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Aucun document publié.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg bg-[#fafaf9] px-3 py-2">
              <div className="flex items-center gap-3">
                <FileText size={16} style={{ color: "var(--theme-primary)" }} />
                <div>
                  <a href={`${supabaseUrl}/storage/v1/object/public/council-documents/${doc.storage_path}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline" style={{ color: "var(--theme-primary)" }}>
                    {doc.title}
                  </a>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {CATEGORY_LABELS[doc.category]} — {new Date(doc.document_date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(doc.id, doc.storage_path)}
                disabled={deleting === doc.id}
                className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create commune server actions**

Create `apps/web/src/app/admin/dashboard/commune-actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getAdminProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { supabase, profile };
}

export async function updateCommuneInfoAction(data: {
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: Record<string, string>;
}) {
  const ctx = await getAdminProfile();
  if (!ctx) return { error: "Non autorisé" };
  const { error } = await ctx.supabase.from("communes")
    .update(data).eq("id", ctx.profile.commune_id);
  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function updateAssociationsAction(associations: Array<{
  name: string;
  description?: string;
  contact?: string;
  schedule?: string;
}>) {
  const ctx = await getAdminProfile();
  if (!ctx) return { error: "Non autorisé" };
  const { error } = await ctx.supabase.from("communes")
    .update({ associations }).eq("id", ctx.profile.commune_id);
  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}
```

- [ ] **Step 5: Create council server actions**

Create `apps/web/src/app/admin/dashboard/council-actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadCouncilDocumentAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Non autorisé" };

  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const documentDate = formData.get("document_date") as string;

  if (!file || !title || !category || !documentDate) return { error: "Champs manquants" };

  const path = `${profile.commune_id}/${Date.now()}_${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("council-documents").upload(path, arrayBuffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("council_documents").insert({
    commune_id: profile.commune_id,
    title,
    category,
    document_date: documentDate,
    storage_path: path,
  });
  if (insertError) return { error: insertError.message };

  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function deleteCouncilDocumentAction(id: string, storagePath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase.storage.from("council-documents").remove([storagePath]);
  const { error } = await supabase.from("council_documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/dashboard");
  return { error: null };
}
```

- [ ] **Step 6: Add new sections to admin dashboard**

Modify `apps/web/src/app/admin/dashboard/page.tsx`:

Add imports:
```tsx
import { CommuneInfoForm } from "@/components/admin/commune-info-form";
import { AssociationsManager } from "@/components/admin/associations-manager";
import { CouncilDocuments } from "@/components/admin/council-documents";
```

Update the commune query to fetch all new fields:
```tsx
  const { data: commune } = await supabase
    .from("communes")
    .select("invite_code, theme, custom_primary_color, logo_url, address, phone, email, opening_hours, associations")
    .eq("id", profile.commune_id)
    .single();
```

Fetch council documents:
```tsx
  const { data: councilDocs } = await supabase
    .from("council_documents")
    .select("id, title, category, document_date, storage_path")
    .eq("commune_id", profile.commune_id)
    .order("document_date", { ascending: false });
```

Add components in JSX (after ThemeCustomizer, before PendingUsers):
```tsx
      <CommuneInfoForm
        address={commune?.address ?? null}
        phone={commune?.phone ?? null}
        email={commune?.email ?? null}
        openingHours={(commune?.opening_hours as Record<string, string>) ?? {}}
      />
      <AssociationsManager associations={(commune?.associations as any[]) ?? []} />
      <CouncilDocuments documents={(councilDocs ?? []) as any[]} />
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/commune-info-form.tsx apps/web/src/components/admin/associations-manager.tsx apps/web/src/components/admin/council-documents.tsx apps/web/src/app/admin/dashboard/commune-actions.ts apps/web/src/app/admin/dashboard/council-actions.ts apps/web/src/app/admin/dashboard/page.tsx
git commit -m "feat(admin): commune info, associations, and council documents management"
```

---

## Task 4: Infos Pratiques Update (all 3 surfaces)

**Files:**
- Modify: `apps/web/src/app/app/infos-pratiques/page.tsx`
- Modify: `apps/web/src/app/[commune-slug]/infos-pratiques/page.tsx`
- Modify: `apps/mobile/src/app/(tabs)/infos-pratiques.tsx`

- [ ] **Step 1: Update web app infos pratiques**

Modify `apps/web/src/app/app/infos-pratiques/page.tsx`:

1. Update the query to include new columns:
```tsx
  const { data: commune } = await supabase
    .from("communes")
    .select("name, theme, custom_primary_color, address, phone, email, opening_hours, associations, infos_pratiques")
    .eq("id", profile.commune_id)
    .single();
```

2. Update ThemeInjector: `<ThemeInjector theme={commune?.theme} customPrimaryColor={commune?.custom_primary_color} />`

3. Replace contact/hours/associations parsing. Instead of:
```tsx
  const contact = parseContact(infos.contact);
  const associations = parseAssociations(infos.associations);
  const hours = parseHours(infos.horaires);
```
Use:
```tsx
  const contact = {
    tel: commune?.phone ?? undefined,
    email: commune?.email ?? undefined,
    adresse: commune?.address ?? undefined,
  };
  const openingHours = (commune?.opening_hours ?? {}) as Record<string, string>;
  const hours = Object.entries(openingHours)
    .filter(([, v]) => v.trim())
    .map(([day, time]) => `${day.charAt(0).toUpperCase() + day.slice(1)} : ${time}`);
  const associations = ((commune?.associations ?? []) as Array<{ name: string; description?: string; contact?: string; schedule?: string }>);
```

4. Keep `services`, `commerces`, `liens` parsing from `infos_pratiques` unchanged.

5. Remove `parseContact`, `parseAssociations`, `parseHours` functions — they're no longer used.

6. Update the associations section to show more detail (contact, schedule) since we now have structured data:
```tsx
      {associations.length > 0 && (
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
            🤝 Associations
          </h2>
          <div className="space-y-3">
            {associations.map((assoc, idx) => (
              <div key={idx} className="rounded-lg p-3" style={{ backgroundColor: "var(--theme-background)" }}>
                <div className="font-semibold text-[var(--foreground)]">{assoc.name}</div>
                {assoc.description && <p className="text-sm text-[var(--muted-foreground)]">{assoc.description}</p>}
                {assoc.contact && <p className="text-xs text-[var(--muted-foreground)]">Contact : {assoc.contact}</p>}
                {assoc.schedule && <p className="text-xs text-[var(--muted-foreground)]">Horaires : {assoc.schedule}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 2: Update public website infos pratiques**

Modify `apps/web/src/app/[commune-slug]/infos-pratiques/page.tsx` with the same changes as Step 1. The page uses `getCommuneBySlug` which returns all columns. Apply identical changes:
- Read contact from `commune.phone`, `commune.email`, `commune.address`
- Read hours from `commune.opening_hours`
- Read associations from `commune.associations`
- Remove old parse functions
- Update associations display

- [ ] **Step 3: Update mobile infos pratiques**

Modify `apps/mobile/src/app/(tabs)/infos-pratiques.tsx`:

1. Update the query:
```tsx
    const { data } = await supabase
      .from("communes")
      .select("name, address, phone, email, opening_hours, associations, infos_pratiques")
      .eq("id", profile.commune_id)
      .single();
```

2. Replace parsing logic with direct column reads (same pattern as web).

3. Remove `parseContact`, `parseAssociations`, `parseHours` functions.

4. Update associations section to show structured data.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/app/infos-pratiques/page.tsx apps/web/src/app/\[commune-slug\]/infos-pratiques/page.tsx apps/mobile/src/app/\(tabs\)/infos-pratiques.tsx
git commit -m "refactor: infos pratiques reads from structured columns, remove string parsing"
```

---

## Task 5: New Public Website Pages

**Files:**
- Create: `apps/web/src/app/[commune-slug]/bulletin/page.tsx`
- Create: `apps/web/src/app/[commune-slug]/conseil-municipal/page.tsx`
- Create: `apps/web/src/app/[commune-slug]/mentions-legales/page.tsx`
- Modify: `apps/web/src/app/[commune-slug]/layout.tsx`

- [ ] **Step 1: Create bulletin page**

Create `apps/web/src/app/[commune-slug]/bulletin/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";

type Props = { params: Promise<{ "commune-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);
  return { title: commune ? `Bulletin municipal — ${commune.name}` : "Bulletin municipal" };
}

function getWeekLabel(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `Semaine du ${fmt(start)} au ${fmt(end)}`;
}

export default async function BulletinPage({ params }: Props) {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);
  if (!commune) notFound();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: annonces } = await supabase
    .from("posts")
    .select("id, title, body, created_at, profiles!author_id(display_name)")
    .eq("commune_id", commune.id)
    .eq("type", "annonce")
    .eq("is_hidden", false)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  // Group by week
  const weeks = new Map<string, typeof annonces>();
  for (const post of annonces ?? []) {
    const label = getWeekLabel(new Date(post.created_at));
    if (!weeks.has(label)) weeks.set(label, []);
    weeks.get(label)!.push(post);
  }

  return (
    <div className="space-y-8 print:space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--theme-primary)" }}>
          Bulletin municipal
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">{commune.name} — 30 derniers jours</p>
      </div>

      {weeks.size === 0 ? (
        <p className="py-8 text-center text-[var(--muted-foreground)]">Aucune annonce récente.</p>
      ) : (
        Array.from(weeks.entries()).map(([weekLabel, posts]) => (
          <section key={weekLabel}>
            <h2 className="mb-3 border-b border-[#f0e8da] pb-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--theme-primary)" }}>
              {weekLabel}
            </h2>
            <div className="space-y-4">
              {posts!.map((post) => (
                <article key={post.id} className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_1px_4px_rgba(140,120,80,0.06)]">
                  <h3 className="font-semibold text-[var(--foreground)]">{post.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)] whitespace-pre-line">{post.body}</p>
                  <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                    {(post.profiles as any)?.display_name ?? "Administration"} —{" "}
                    {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, footer, nav { display: none !important; }
          .print\\:space-y-6 > * + * { margin-top: 1.5rem; }
          body { font-size: 12pt; }
        }
      `}} />
    </div>
  );
}
```

- [ ] **Step 2: Create conseil municipal page**

Create `apps/web/src/app/[commune-slug]/conseil-municipal/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";
import { FileText } from "lucide-react";

type Props = { params: Promise<{ "commune-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);
  return { title: commune ? `Conseil municipal — ${commune.name}` : "Conseil municipal" };
}

const CATEGORY_LABELS: Record<string, string> = {
  deliberation: "Délibérations",
  pv: "Procès-verbaux",
  compte_rendu: "Comptes-rendus",
};

const CATEGORIES = ["deliberation", "pv", "compte_rendu"] as const;

export default async function ConseilMunicipalPage({ params }: Props) {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);
  if (!commune) notFound();

  const { data: documents } = await supabase
    .from("council_documents")
    .select("id, title, category, document_date, storage_path")
    .eq("commune_id", commune.id)
    .order("document_date", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const grouped = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, (documents ?? []).filter((d) => d.category === cat)])
  );

  const hasAny = (documents ?? []).length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--theme-primary)" }}>
        Conseil municipal
      </h1>

      {!hasAny ? (
        <p className="py-8 text-center text-[var(--muted-foreground)]">Aucun document publié.</p>
      ) : (
        CATEGORIES.map((cat) => {
          const docs = grouped[cat];
          if (docs.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-3 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <a key={doc.id}
                    href={`${supabaseUrl}/storage/v1/object/public/council-documents/${doc.storage_path}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(140,120,80,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(140,120,80,0.12)]">
                    <FileText size={20} style={{ color: "var(--theme-primary)" }} />
                    <div className="flex-1">
                      <p className="font-medium text-[var(--foreground)]">{doc.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(doc.document_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create mentions légales page**

Create `apps/web/src/app/[commune-slug]/mentions-legales/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";

type Props = { params: Promise<{ "commune-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);
  return { title: commune ? `Mentions légales — ${commune.name}` : "Mentions légales" };
}

export default async function MentionsLegalesPage({ params }: Props) {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);
  if (!commune) notFound();

  return (
    <div className="prose prose-sm max-w-none">
      <h1 style={{ color: "var(--theme-primary)" }}>Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        Commune de <strong>{commune.name}</strong>
        {commune.address && <><br />{commune.address}</>}
        {commune.phone && <><br />Téléphone : {commune.phone}</>}
        {commune.email && <><br />Email : {commune.email}</>}
      </p>
      <p>Directeur de la publication : Commune de {commune.name}</p>

      <h2>Hébergement</h2>
      <p>
        Ce site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        <br />Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
      </p>

      <h2>Protection des données personnelles</h2>
      <p>
        Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés,
        les données personnelles collectées sur ce site (nom, email, commune) sont traitées dans le seul but
        de fournir les services de la plateforme communautaire.
      </p>
      <p>
        Les données sont stockées de manière sécurisée par Supabase Inc. (hébergement UE).
        Aucune donnée n'est transmise à des tiers à des fins commerciales.
      </p>
      <p>
        Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
        Pour exercer ces droits, contactez la mairie à l'adresse indiquée ci-dessus
        {commune.email && <> ou par email à <a href={`mailto:${commune.email}`}>{commune.email}</a></>}.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu de ce site (textes, images, logos) est la propriété de la commune de {commune.name}
        ou de ses contributeurs. Toute reproduction est interdite sans autorisation préalable.
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement de l'authentification.
        Aucun cookie publicitaire ou de traçage n'est utilisé.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Update commune website layout — nav + footer**

Modify `apps/web/src/app/[commune-slug]/layout.tsx`:

Update the nav to include new pages and add responsive hamburger menu:

Replace the `<nav>` section with:

```tsx
          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <Link href={`/${slug}`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Accueil
            </Link>
            <Link href={`/${slug}/evenements`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Événements
            </Link>
            <Link href={`/${slug}/infos-pratiques`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Infos pratiques
            </Link>
            <Link href={`/${slug}/bulletin`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Bulletin
            </Link>
            <Link href={`/${slug}/conseil-municipal`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Conseil municipal
            </Link>
          </nav>
```

Update ThemeInjector: `<ThemeInjector theme={commune.theme} customPrimaryColor={commune.custom_primary_color} />`

Update footer to add mentions légales link:

```tsx
      <footer className="mt-auto border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
          <p>
            Commune de{" "}
            <span className="font-medium text-[var(--foreground)]">{commune.name}</span>
            {commune.code_postal && <span> — {commune.code_postal}</span>}
          </p>
          <p className="mt-1">
            <Link href={`/${slug}/mentions-legales`} className="underline hover:text-[var(--foreground)]">
              Mentions légales
            </Link>
            {" · "}Plateforme communautaire rurale
          </p>
        </div>
      </footer>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\[commune-slug\]/bulletin/page.tsx apps/web/src/app/\[commune-slug\]/conseil-municipal/page.tsx apps/web/src/app/\[commune-slug\]/mentions-legales/page.tsx apps/web/src/app/\[commune-slug\]/layout.tsx
git commit -m "feat: bulletin municipal, conseil municipal, mentions légales pages + nav update"
```

---

## Task 6: Update Shared Types + CLAUDE.md

**Files:**
- Modify: `packages/shared/src/types/commune.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CommuneWithDesign type**

Modify `packages/shared/src/types/commune.ts`:

```typescript
import type { Database } from "./database";
import type { ThemeSlug } from "../constants/themes";

export type Commune = Database["public"]["Tables"]["communes"]["Row"];
export type EPCI = Database["public"]["Tables"]["epci"]["Row"];

export interface Association {
  name: string;
  description?: string;
  contact?: string;
  schedule?: string;
}

export type CommuneWithDesign = Commune & {
  theme: ThemeSlug;
  motto: string | null;
  hero_image_url: string | null;
  description: string | null;
  blason_url: string | null;
  infos_pratiques: Record<string, unknown>;
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: Record<string, string>;
  custom_primary_color: string | null;
  associations: Association[];
};
```

- [ ] **Step 2: Update CLAUDE.md**

Update current status:

```markdown
## Current Status

- **v1 complete**: auth (with password reset, invite codes), feed (paginated with images), post detail, events (calendar), mon espace, infos pratiques, admin panel, public commune site, image upload with resize (posts + avatars), push notifications (Expo, annonce + evenement), moderation
- **v2 complete**: commune website (bulletin municipal, conseil municipal, mentions légales), theme customization (custom colors with WCAG check, logo upload), structured contact data, associations management, admin panel (commune info, associations, council docs, theme), data cleanup (removed unstructured parsing)
- **Remaining**: custom domain support (macommune.fr), AI council document summaries
- **Not started**: v3 (mairie tools), v4 (services directory), v5 (group buying), v6 (carpooling)
```

Update database schema section:
```markdown
## Database Schema

Migrations in `supabase/migrations/`:
- `001_initial_schema.sql` — full schema: communes, profiles, posts, comments, rsvps, polls, producers, reports, audit_log, word_filters, push_tokens, post_images, storage buckets (post-images, avatars), all RLS policies, functions, triggers, and indexes
- `006_v2_commune_website.sql` — commune contact fields, custom_primary_color, associations JSONB, council_documents table, council-documents storage bucket
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/commune.ts CLAUDE.md
git commit -m "docs: update types and status — v2 complete"
```
