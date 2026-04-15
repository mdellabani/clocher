# Custom Domain Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable commune websites to be served via subdomains (`saint-martin.app.example.fr`) and custom domains (`www.saint-martin.fr`) with admin self-service DNS verification.

**Architecture:** Next.js middleware resolves the hostname (subdomain or custom domain) to a commune slug and rewrites the request. A new admin UI lets admins enter a custom domain and verify DNS via a public API. Migration adds `custom_domain` and `domain_verified` columns to communes.

**Tech Stack:** Next.js 15 middleware, Supabase (Postgres), Google Public DNS API for verification.

---

## File Structure

### Task 1: Migration
- Create: `supabase/migrations/007_custom_domains.sql`

### Task 2: Shared Query + Middleware
- Modify: `packages/shared/src/queries/communes.ts` — add `getCommuneByDomain`
- Create: `apps/web/middleware.ts` — domain resolution middleware

### Task 3: Admin Domain Manager UI
- Create: `apps/web/src/components/admin/domain-manager.tsx`
- Create: `apps/web/src/app/admin/dashboard/domain-actions.ts`
- Modify: `apps/web/src/app/admin/dashboard/page.tsx`

### Task 4: Update CLAUDE.md
- Modify: `CLAUDE.md`

---

## Task 1: Migration

**Files:**
- Create: `supabase/migrations/007_custom_domains.sql`

- [ ] **Step 1: Create migration**

```sql
ALTER TABLE communes ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;

CREATE INDEX idx_communes_custom_domain ON communes(custom_domain) WHERE custom_domain IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/007_custom_domains.sql
git commit -m "feat(db): add custom_domain and domain_verified columns to communes"
```

---

## Task 2: Shared Query + Middleware

**Files:**
- Modify: `packages/shared/src/queries/communes.ts`
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Add getCommuneByDomain query**

Add to `packages/shared/src/queries/communes.ts`:

```typescript
export async function getCommuneByDomain(client: Client, domain: string) {
  return client
    .from("communes")
    .select("id, slug, custom_domain, domain_verified")
    .eq("custom_domain", domain)
    .eq("domain_verified", true)
    .single();
}
```

Also add to `packages/shared/src/queries/index.ts` exports if not already exported (check the file).

- [ ] **Step 2: Create middleware**

Create `apps/web/middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "localhost:3000";

// Hostnames that should pass through without domain resolution
function isPlatformHost(hostname: string): boolean {
  // localhost / dev
  if (hostname === "localhost" || hostname.startsWith("localhost:")) return true;
  // Exact platform domain (e.g. app.example.fr)
  if (hostname === PLATFORM_DOMAIN) return true;
  // Vercel preview URLs
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}

function extractSubdomain(hostname: string): string | null {
  // hostname = "saint-martin.app.example.fr"
  // PLATFORM_DOMAIN = "app.example.fr"
  if (!hostname.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const sub = hostname.slice(0, -(PLATFORM_DOMAIN.length + 1));
  // Ignore "www" subdomain
  if (sub === "www") return null;
  // Only single-level subdomains
  if (sub.includes(".")) return null;
  return sub;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // 1. Platform host — pass through
  if (isPlatformHost(hostname)) {
    return NextResponse.next();
  }

  // 2. Subdomain — rewrite to /[commune-slug]/...
  const subdomain = extractSubdomain(hostname);
  if (subdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 3. Custom domain — look up in database
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Middleware can't set cookies directly, but we need the interface
        },
      },
    }
  );

  const { data: commune } = await supabase
    .from("communes")
    .select("slug")
    .eq("custom_domain", hostname)
    .eq("domain_verified", true)
    .single();

  if (commune) {
    const url = request.nextUrl.clone();
    url.pathname = `/${commune.slug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 4. No match
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
```

- [ ] **Step 3: Add PLATFORM_DOMAIN to environment**

Add to `apps/web/.env.local` (or `.env`):

```
PLATFORM_DOMAIN=localhost:3000
```

Add to `apps/web/.env.example` if it exists, or document in CLAUDE.md.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/queries/communes.ts apps/web/middleware.ts
git commit -m "feat: domain resolution middleware for subdomains and custom domains"
```

---

## Task 3: Admin Domain Manager UI

**Files:**
- Create: `apps/web/src/components/admin/domain-manager.tsx`
- Create: `apps/web/src/app/admin/dashboard/domain-actions.ts`
- Modify: `apps/web/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create server actions**

Create `apps/web/src/app/admin/dashboard/domain-actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "localhost:3000";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { supabase, communeId: profile.commune_id };
}

export async function setCustomDomainAction(domain: string): Promise<{ error: string | null }> {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  // Normalize: lowercase, trim, remove trailing dot
  const normalized = domain.toLowerCase().trim().replace(/\.$/, "");
  if (!normalized || normalized.includes(" ")) return { error: "Domaine invalide" };

  const { error } = await ctx.supabase
    .from("communes")
    .update({ custom_domain: normalized, domain_verified: false })
    .eq("id", ctx.communeId);

  if (error) {
    if (error.code === "23505") return { error: "Ce domaine est déjà utilisé par une autre commune" };
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function verifyDomainAction(): Promise<{ verified: boolean; error: string | null }> {
  const ctx = await getAdminContext();
  if (!ctx) return { verified: false, error: "Non autorisé" };

  const { data: commune } = await ctx.supabase
    .from("communes")
    .select("custom_domain")
    .eq("id", ctx.communeId)
    .single();

  if (!commune?.custom_domain) return { verified: false, error: "Aucun domaine configuré" };

  // Check DNS via Google Public DNS API
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(commune.custom_domain)}&type=CNAME`
    );
    const data = await res.json();

    // Check if any CNAME answer points to our platform
    const targetDomain = `communes.${PLATFORM_DOMAIN}`;
    const hasCname = data.Answer?.some(
      (record: { type: number; data: string }) =>
        record.type === 5 && record.data.replace(/\.$/, "").toLowerCase() === targetDomain
    );

    if (hasCname) {
      await ctx.supabase
        .from("communes")
        .update({ domain_verified: true })
        .eq("id", ctx.communeId);

      revalidatePath("/admin/dashboard");
      return { verified: true, error: null };
    }

    return { verified: false, error: null };
  } catch {
    return { verified: false, error: "Impossible de vérifier le DNS" };
  }
}

export async function removeDomainAction(): Promise<{ error: string | null }> {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  const { error } = await ctx.supabase
    .from("communes")
    .update({ custom_domain: null, domain_verified: false })
    .eq("id", ctx.communeId);

  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}
```

- [ ] **Step 2: Create domain manager component**

Create `apps/web/src/components/admin/domain-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import {
  setCustomDomainAction,
  verifyDomainAction,
  removeDomainAction,
} from "@/app/admin/dashboard/domain-actions";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "localhost:3000";

interface DomainManagerProps {
  slug: string;
  customDomain: string | null;
  domainVerified: boolean;
}

export function DomainManager({ slug, customDomain, domainVerified }: DomainManagerProps) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  async function handleSetDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setSaving(true);
    setError(null);
    const result = await setCustomDomainAction(domain.trim());
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setDomain("");
      router.refresh();
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    setError(null);
    const result = await verifyDomainAction();
    setVerifying(false);
    if (result.error) {
      setError(result.error);
    } else if (result.verified) {
      setVerifyResult("success");
      router.refresh();
    } else {
      setVerifyResult("not_found");
    }
  }

  async function handleRemove() {
    if (!confirm("Supprimer le domaine personnalisé ?")) return;
    setRemoving(true);
    await removeDomainAction();
    setRemoving(false);
    router.refresh();
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Nom de domaine
      </h2>

      {/* Current subdomain */}
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">
        Votre site communal est accessible à{" "}
        <a href={`https://${slug}.${PLATFORM_DOMAIN}`} target="_blank" rel="noopener noreferrer"
          className="font-mono font-medium underline" style={{ color: "var(--theme-primary)" }}>
          {slug}.{PLATFORM_DOMAIN}
        </a>
      </p>

      {/* State: no custom domain */}
      {!customDomain && (
        <form onSubmit={handleSetDomain} className="space-y-3">
          <label className="text-sm font-medium text-[var(--foreground)]">
            Ajouter un domaine personnalisé
          </label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3">
              <Globe size={14} className="text-[var(--muted-foreground)]" />
              <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                placeholder="www.saint-martin.fr"
                className="flex-1 bg-transparent py-2 text-sm outline-none" />
            </div>
            <button type="submit" disabled={saving || !domain.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--theme-primary)" }}>
              {saving ? "..." : "Ajouter"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {/* State: domain set, not verified */}
      {customDomain && !domainVerified && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-amber-700">{customDomain}</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
              En attente de vérification
            </span>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-medium text-amber-800">Configuration DNS requise</p>
            <p className="mb-3 text-amber-700">
              Connectez-vous à votre fournisseur de domaine (OVH, Gandi, Ionos...) et ajoutez un enregistrement CNAME :
            </p>
            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-amber-100">
                    <th className="px-3 py-2 text-left font-semibold text-amber-800">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800">Hôte</th>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-mono text-amber-700">CNAME</td>
                    <td className="px-3 py-2 font-mono text-amber-700">
                      {customDomain.startsWith("www.") ? "www" : "@"}
                    </td>
                    <td className="px-3 py-2 font-mono text-amber-700">communes.{PLATFORM_DOMAIN}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-amber-600">
              La propagation DNS peut prendre jusqu'à 24 heures.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleVerify} disabled={verifying}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--theme-primary)" }}>
              {verifying ? "Vérification..." : "Vérifier la configuration DNS"}
            </button>
            <button onClick={handleRemove} disabled={removing}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={13} /> Supprimer
            </button>
          </div>

          {verifyResult === "not_found" && (
            <p className="text-sm text-amber-600">
              DNS non détecté. Vérifiez votre configuration et réessayez dans quelques minutes.
            </p>
          )}
          {verifyResult === "success" && (
            <p className="text-sm text-green-600">Domaine vérifié avec succès !</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* State: domain verified */}
      {customDomain && domainVerified && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium underline" style={{ color: "var(--theme-primary)" }}>
              {customDomain}
            </a>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
              Domaine actif
            </span>
          </div>
          <button onClick={handleRemove} disabled={removing}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
            <Trash2 size={13} /> {removing ? "..." : "Supprimer le domaine"}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add DomainManager to admin dashboard**

Modify `apps/web/src/app/admin/dashboard/page.tsx`:

Import:
```tsx
import { DomainManager } from "@/components/admin/domain-manager";
```

Update the commune query to also fetch `custom_domain, domain_verified, slug`:
```tsx
  const { data: commune } = await supabase
    .from("communes")
    .select("slug, invite_code, theme, custom_primary_color, logo_url, address, phone, email, opening_hours, associations, custom_domain, domain_verified")
    .eq("id", profile.commune_id)
    .single();
```

Add the component in JSX, after InviteCodeManager and before ThemeCustomizer:
```tsx
      <DomainManager
        slug={commune?.slug ?? ""}
        customDomain={commune?.custom_domain ?? null}
        domainVerified={commune?.domain_verified ?? false}
      />
```

- [ ] **Step 4: Add NEXT_PUBLIC_PLATFORM_DOMAIN env var**

The DomainManager component uses `process.env.NEXT_PUBLIC_PLATFORM_DOMAIN` for display. Add to `.env.local`:
```
NEXT_PUBLIC_PLATFORM_DOMAIN=localhost:3000
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/domain-manager.tsx apps/web/src/app/admin/dashboard/domain-actions.ts apps/web/src/app/admin/dashboard/page.tsx
git commit -m "feat: admin domain management with DNS verification"
```

---

## Task 4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update status and env vars**

Update Current Status:
```markdown
- **v2 complete**: commune website (bulletin municipal, conseil municipal, mentions légales), theme customization (custom colors with WCAG check, logo upload), structured contact data, associations management, admin panel, custom domain support (subdomains + custom domains with DNS verification)
```

Add to Environment Variables:
```
PLATFORM_DOMAIN=app.example.fr       # main platform domain for subdomain routing
NEXT_PUBLIC_PLATFORM_DOMAIN=app.example.fr  # same, exposed to client for display
```

Update Remaining:
```markdown
- **Remaining**: AI council document summaries
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update status — custom domain support complete"
```
