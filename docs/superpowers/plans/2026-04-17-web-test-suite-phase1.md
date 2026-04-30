# Web Test Suite — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a two-tier Vitest test suite (component + integration) for `apps/web` covering RLS-sensitive server actions and the most rendering-sensitive client components, plus CI wiring.

**Architecture:** Two Vitest configs. Component tests run in jsdom with mocked Supabase/router/hooks. Integration tests run in Node against the local Supabase Docker stack (sequential, single fork) using a small fixtures module that signs in as seeded users and truncates+reseeds between describe blocks.

**Tech Stack:** Vitest 4, React Testing Library 16, jsdom, `@supabase/supabase-js` (already a dep via `@supabase/ssr`), GitHub Actions, `supabase` CLI.

**Spec:** `docs/superpowers/specs/2026-04-17-web-test-suite-phase1-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `apps/web/vitest.config.ts` | Components-only config | Modify (limit scope to `tests/components`) |
| `apps/web/vitest.integration.config.ts` | Integration config | Create |
| `apps/web/tests/setup.ts` | Component test setup (jest-dom matchers) | Create |
| `apps/web/tests/integration/_fixtures.ts` | `signInAs`, `resetData`, `serviceClient`, getters | Create |
| `apps/web/tests/integration/_seed.sql` | Minimal SQL seed used by `resetData` | Create |
| `apps/web/tests/components/*.test.tsx` | Component tests | Create (4 files) |
| `apps/web/tests/integration/*.test.ts` | Integration tests | Create (9 files) |
| `apps/web/package.json` | Test scripts | Modify |
| `apps/web/.env.local.example` | Document `SUPABASE_SERVICE_ROLE_KEY` | Create or modify |
| `.github/workflows/test.yml` | CI workflow | Create |
| `CLAUDE.md` | Conventions update | Modify |
| `tasks/lessons.md` | Lesson entry referencing new convention | Modify |

---

## Task 1: Test infrastructure — configs, setup, fixtures

**Files:**
- Modify: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.integration.config.ts`
- Create: `apps/web/tests/setup.ts`
- Create: `apps/web/tests/integration/_fixtures.ts`
- Create: `apps/web/tests/integration/_seed.sql`
- Create or modify: `apps/web/.env.local.example`

- [ ] **Step 1: Update components Vitest config**

Replace `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/components/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Create the jest-dom matchers setup file**

Create `apps/web/tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Create integration Vitest config**

Create `apps/web/vitest.integration.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 15_000,
    hookTimeout: 15_000,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Create the integration seed SQL**

Create `apps/web/tests/integration/_seed.sql`:

```sql
-- Minimal deterministic seed for integration tests. Run after TRUNCATE.
-- Auth users are NOT seeded here — they survive across tests because
-- creating users via supabase auth admin is slow. Use the matching
-- emails/passwords from supabase/seed.sql.

INSERT INTO communes (id, name, slug, code_postal, theme, motto, invite_code)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Saint-Médard',
  'saint-medard-64',
  '64370',
  'terre_doc',
  'Entre mer et montagne, au cœur du Béarn',
  'stmed1'
);

INSERT INTO profiles (id, commune_id, display_name, role, status)
VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'Secrétariat Mairie', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010', 'Sophie Dupin', 'moderator', 'active'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'Pierre Moreau', 'resident', 'active');
```

The IDs match `supabase/seed.sql`. Auth users with these IDs are created by the demo seed and survive `db reset` only if the test runner does a full reset before the suite (CI does this; locally the developer runs `npx supabase db reset` once after pulling).

- [ ] **Step 5: Create the integration fixtures module**

Create `apps/web/tests/integration/_fixtures.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY missing in test env");
if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing in test env");

const SEED_SQL = readFileSync(resolve(__dirname, "_seed.sql"), "utf8");

const TABLES_TO_TRUNCATE = [
  "audit_log",
  "reports",
  "poll_votes",
  "poll_options",
  "polls",
  "post_images",
  "rsvps",
  "comments",
  "posts",
  "page_sections",
  "council_documents",
  "producers",
  "profiles",
  "communes",
];

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signInAs(email: string, password = "demo1234") {
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`signInAs(${email}) failed: ${error?.message}`);
  return { supabase, user: data.user };
}

export async function resetData() {
  const svc = serviceClient();
  // TRUNCATE … CASCADE wipes dependent rows in one shot.
  const truncate = `TRUNCATE ${TABLES_TO_TRUNCATE.map((t) => `"public"."${t}"`).join(", ")} CASCADE;`;
  const { error: tErr } = await svc.rpc("exec_sql", { sql: truncate }).single().maybeSingle()
    .then(() => ({ error: null as null | Error }))
    .catch((e) => ({ error: e as Error }));
  // Fall back to direct SQL via the postgres-meta endpoint if no exec_sql RPC.
  // Most local supabase setups don't have one — use the `query` RPC pattern.
  if (tErr) {
    // Use raw SQL via the supabase-js query helper as a fallback.
    // (We only reach here on first-run setups without exec_sql.)
    throw new Error("resetData requires an exec_sql RPC; create one — see Step 6.");
  }
  const { error: sErr } = await svc.rpc("exec_sql", { sql: SEED_SQL });
  if (sErr) throw new Error(`Seed failed: ${sErr.message}`);
}

export async function getCommune(id: string) {
  const { data } = await serviceClient().from("communes").select("*").eq("id", id).single();
  return data;
}

export async function getProfile(id: string) {
  const { data } = await serviceClient().from("profiles").select("*").eq("id", id).single();
  return data;
}

export async function getPost(id: string) {
  const { data } = await serviceClient().from("posts").select("*").eq("id", id).single();
  return data;
}

export const SEED_IDS = {
  commune: "00000000-0000-0000-0000-000000000010",
  admin: "00000000-0000-0000-0000-000000000100",
  moderator: "00000000-0000-0000-0000-000000000103",
  resident: "00000000-0000-0000-0000-000000000101",
} as const;

export const SEED_EMAILS = {
  admin: "secretaire@saintmedard64.fr",
  moderator: "moderateur@saintmedard64.fr",
  resident: "pierre.m@email.fr",
} as const;
```

- [ ] **Step 6: Add the `exec_sql` helper as a new migration**

The fixtures need a way to execute arbitrary SQL via the service-role RPC. Supabase doesn't ship one by default. Add it as a new migration so the helper exists in every environment.

Create `supabase/migrations/20260417000200_exec_sql_helper.sql`:

```sql
-- Used by integration tests to TRUNCATE/seed between describe blocks.
-- SECURITY DEFINER + service-role-only execution permission means it
-- can't be abused by app users (anon/authenticated have no EXECUTE).
CREATE OR REPLACE FUNCTION "public"."exec_sql"(sql text) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION "public"."exec_sql"(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."exec_sql"(text) TO service_role;
```

Apply it locally:

```bash
npx supabase db reset
```

Expected: both new migrations apply cleanly.

- [ ] **Step 7: Document the service-role env var**

Create or append to `apps/web/.env.local.example`:

```
# For tests only — service-role key from `npx supabase status`.
# NEVER commit a real value; this file is only for documenting the variable name.
SUPABASE_SERVICE_ROLE_KEY=
```

If `apps/web/.env.local` exists, the developer must add this line manually with the value from `npx supabase status -o env | grep SERVICE_ROLE_KEY`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/vitest.integration.config.ts \
  apps/web/tests/setup.ts apps/web/tests/integration/_fixtures.ts \
  apps/web/tests/integration/_seed.sql apps/web/.env.local.example \
  supabase/migrations/20260417000200_exec_sql_helper.sql
git commit -m "test: integration + component test infrastructure"
```

---

## Task 2: First component test — NavBar

**Files:**
- Create: `apps/web/tests/components/nav-bar.test.tsx`

This task establishes the component-test pattern. Subsequent component tests follow the same structure.

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/components/nav-bar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavBar } from "@/components/nav-bar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app/feed",
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const mockProfile = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => mockProfile.value,
}));

function setProfile(state: {
  loading?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
  communeName?: string;
  displayName?: string;
}) {
  mockProfile.value = {
    loading: state.loading ?? false,
    isAdmin: state.isAdmin ?? false,
    isModerator: state.isModerator ?? false,
    profile: state.loading
      ? null
      : {
          display_name: state.displayName ?? "Test User",
          communes: { name: state.communeName ?? "Saint-Médard", code_postal: "64370", motto: null },
        },
  };
}

describe("NavBar", () => {
  it("renders skeleton while loading", () => {
    setProfile({ loading: true });
    const { container } = render(<NavBar />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows commune name once loaded", () => {
    setProfile({ communeName: "Morlanne" });
    render(<NavBar />);
    expect(screen.getByText("Morlanne")).toBeInTheDocument();
  });

  it("hides Admin link for residents", () => {
    setProfile({ isAdmin: false, isModerator: false });
    render(<NavBar />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Modération")).not.toBeInTheDocument();
  });

  it("shows Admin link for admin", () => {
    setProfile({ isAdmin: true });
    render(<NavBar />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows Modération link for moderator (not admin)", () => {
    setProfile({ isAdmin: false, isModerator: true });
    render(<NavBar />);
    expect(screen.getByText("Modération")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("prefers Admin over Modération when user is both", () => {
    setProfile({ isAdmin: true, isModerator: true });
    render(<NavBar />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.queryByText("Modération")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter @pretou/web test:components
```

Expected: 6 tests pass.

If `pnpm test:components` doesn't exist yet, run directly:

```bash
cd apps/web && npx vitest run --config vitest.config.ts tests/components
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/components/nav-bar.test.tsx
git commit -m "test(components): NavBar role-based link visibility"
```

---

## Task 3: Component test — PostCard

**Files:**
- Create: `apps/web/tests/components/post-card.test.tsx`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/components/post-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostCard } from "@/components/post-card";
import type { Post } from "@pretou/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/components/report-dialog", () => ({
  ReportDialog: () => <button>Signaler</button>,
}));

const basePost: Post = {
  id: "p1",
  commune_id: "c1",
  author_id: "u1",
  title: "Hello",
  body: "World",
  type: "discussion",
  is_pinned: false,
  is_hidden: false,
  event_date: null,
  event_location: null,
  expires_at: null,
  epci_visible: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profiles: { display_name: "Pierre" },
  communes: { name: "Saint-Médard" },
  comments: [{ count: 0 }],
  rsvps: [],
  post_images: [],
} as unknown as Post;

describe("PostCard", () => {
  it("renders without thumbnail when no image", () => {
    render(<PostCard post={basePost} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "" })).not.toBeInTheDocument();
  });

  it("renders thumbnail when post has an image", () => {
    const withImage = {
      ...basePost,
      post_images: [{ storage_path: "posts/abc/1.png" }],
    } as unknown as Post;
    render(<PostCard post={withImage} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("posts/abc/1.png"));
  });

  it("applies pinned styling when post is pinned", () => {
    const pinned = { ...basePost, is_pinned: true } as unknown as Post;
    const { container } = render(<PostCard post={pinned} />);
    expect(screen.getByText("Épinglé")).toBeInTheDocument();
    const card = container.querySelector("[style*='var(--theme-primary)']");
    expect(card).not.toBeNull();
  });

  it("renders expiry text for service posts", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const service = { ...basePost, type: "service", expires_at: future } as unknown as Post;
    render(<PostCard post={service} />);
    expect(screen.getByText(/Expire dans 3j/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter @pretou/web test:components
```

Expected: 4 PostCard tests pass (plus the 6 NavBar tests from Task 2 = 10 total).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/components/post-card.test.tsx
git commit -m "test(components): PostCard with/without image and pinned/service variants"
```

---

## Task 4: Component test — ThemeCustomizer

**Files:**
- Create: `apps/web/tests/components/theme-customizer.test.tsx`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/components/theme-customizer.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeCustomizer } from "@/components/admin/theme-customizer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const updateThemeAction = vi.fn().mockResolvedValue({ error: null });
const uploadLogoAction = vi.fn().mockResolvedValue({ error: null });
const removeLogoAction = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/app/admin/dashboard/theme-actions", () => ({
  updateThemeAction: (...a: unknown[]) => updateThemeAction(...a),
  uploadLogoAction: (...a: unknown[]) => uploadLogoAction(...a),
  removeLogoAction: () => removeLogoAction(),
}));

describe("ThemeCustomizer", () => {
  it("hides 'Aperçu non sauvegardé' pill on mount", () => {
    render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    expect(screen.queryByText("Aperçu non sauvegardé")).not.toBeInTheDocument();
  });

  it("shows pill after picking a different theme", () => {
    render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    // Click any swatch other than the current one — find by surrounding button text.
    const swatches = screen.getAllByRole("button").filter((el) => el.textContent && el.textContent.length > 0);
    const otherSwatch = swatches.find((b) => !b.className.includes("ring-2"));
    if (!otherSwatch) throw new Error("expected at least one non-current swatch");
    fireEvent.click(otherSwatch);
    expect(screen.getByText("Aperçu non sauvegardé")).toBeInTheDocument();
  });

  it("renders preview override <style> only when picker is dirty", () => {
    const { container } = render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    expect(container.querySelectorAll("style").length).toBe(0);
    const swatches = screen.getAllByRole("button");
    const other = swatches.find((b) => !b.className.includes("ring-2") && b.textContent);
    if (!other) throw new Error("no other swatch");
    fireEvent.click(other);
    expect(container.querySelectorAll("style").length).toBe(1);
  });

  it("hides remove-logo button when no logo present", () => {
    render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
  });

  it("shows remove-logo button when a logo URL is provided", () => {
    render(
      <ThemeCustomizer
        currentTheme="terre_doc"
        currentCustomColor={null}
        currentLogoUrl="https://example.com/logo.png"
      />,
    );
    expect(screen.getByText("Supprimer")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter @pretou/web test:components
```

Expected: 5 ThemeCustomizer tests pass (15 total component tests).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/components/theme-customizer.test.tsx
git commit -m "test(components): ThemeCustomizer dirty-state pill, preview override, remove-logo button"
```

---

## Task 5: Component test — FeedFilters

**Files:**
- Create: `apps/web/tests/components/feed-filters.test.tsx`

FeedFilters reads URL state via `useSearchParams`, displays a filter button with an active-count badge, opens a panel with type/date chips, and pushes URL changes through `router.push`.

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/components/feed-filters.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedFilters } from "@/components/feed-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/app/feed",
  useSearchParams: () => new URLSearchParams(""),
}));

describe("FeedFilters", () => {
  it("does not show an active-count badge with no filters", () => {
    render(<FeedFilters types={[]} date="" />);
    // Filter button text doesn't include a count.
    expect(screen.queryByText(/[1-9]/)).not.toBeInTheDocument();
  });

  it("shows active-count badge equal to types + date + communes selected", () => {
    render(<FeedFilters types={["annonce", "evenement"]} date="week" selectedCommunes={["c1"]} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("opens the panel when the filter button is clicked", () => {
    render(<FeedFilters types={[]} date="" />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
  });

  it("pushes a URL containing the toggled type when a type chip is clicked", () => {
    push.mockClear();
    render(<FeedFilters types={[]} date="" />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Annonce"));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toContain("types=annonce");
  });

  it("pushes a URL with the chosen date filter", () => {
    push.mockClear();
    render(<FeedFilters types={[]} date="" />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Semaine"));
    expect(push.mock.calls[0][0]).toContain("date=week");
  });
});
```

If the actual `POST_TYPE_LABELS` import doesn't include "Annonce" with that exact spelling, run `cat packages/shared/src/constants/post-types.ts` and adjust the literal string in the test.

- [ ] **Step 2: Run the test**

```bash
pnpm --filter @pretou/web test:components
```

Expected: 5 FeedFilters tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/components/feed-filters.test.tsx
git commit -m "test(components): FeedFilters active-count + chip toggling"
```

---

## Task 6: First integration test — theme-actions

**Files:**
- Create: `apps/web/tests/integration/theme-actions.test.ts`

This task establishes the integration-test pattern. Subsequent integration tasks follow the same structure: import fixtures, `beforeEach(resetData)`, `signInAs`, call the action via the signed-in client, read back via `serviceClient`, assert.

Note: server actions (the `"use server"` files in `apps/web/src/app/**`) read `cookies()` from `next/headers` and are not directly importable from a test runner. Integration tests therefore exercise the **same SQL the action would run** via the signed-in supabase client — same RLS context, same outcome.

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/theme-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  resetData,
  signInAs,
  getCommune,
  SEED_IDS,
  SEED_EMAILS,
} from "./_fixtures";

describe("communes update — theme-actions equivalent", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin updates own commune theme + custom color", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { error } = await supabase
      .from("communes")
      .update({ theme: "alpin", custom_primary_color: "#3B82F6" })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.theme).toBe("alpin");
    expect(after?.custom_primary_color).toBe("#3B82F6");
  });

  it("admin clears logo_url to null", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    // Seed it first via service.
    const before = await getCommune(SEED_IDS.commune);
    expect(before).toBeTruthy();
    const { error } = await supabase
      .from("communes")
      .update({ logo_url: null })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.logo_url).toBeNull();
  });

  it("moderator update is silently blocked (no rows affected)", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase
      .from("communes")
      .update({ theme: "alpin" })
      .eq("id", SEED_IDS.commune);
    // PostgREST returns no error — RLS just filters out the row.
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.theme).toBe("terre_doc"); // unchanged
  });

  it("resident update is silently blocked", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    await supabase
      .from("communes")
      .update({ theme: "alpin" })
      .eq("id", SEED_IDS.commune);
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.theme).toBe("terre_doc");
  });
});
```

- [ ] **Step 2: Ensure local Supabase is running**

```bash
npx supabase status
```

If it says not running, start it: `npx supabase start`. Then ensure migrations are applied: `npx supabase db reset`.

- [ ] **Step 3: Export the service-role key into your shell**

```bash
export $(npx supabase status -o env | grep SERVICE_ROLE_KEY)
export $(npx supabase status -o env | grep ANON_KEY)
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
```

(Or rely on `apps/web/.env.local` which Vitest loads automatically — confirm it has all three variables before running.)

- [ ] **Step 4: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/theme-actions.test.ts
```

Expected: 4 tests pass.

If the seeded admin's email/password combination doesn't match what's in `supabase/seed.sql`, `signInAs` throws. Update `SEED_EMAILS` in `_fixtures.ts` to the actual seed values.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/integration/theme-actions.test.ts
git commit -m "test(integration): commune update RLS — admin allowed, moderator/resident blocked"
```

---

## Task 7: Integration test — invite-actions

**Files:**
- Create: `apps/web/tests/integration/invite-actions.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/invite-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, getCommune, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("invite_code regeneration RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can rotate invite_code", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const before = await getCommune(SEED_IDS.commune);
    const newCode = "TEST01";
    const { error } = await supabase
      .from("communes")
      .update({ invite_code: newCode })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.invite_code).toBe(newCode);
    expect(after?.invite_code).not.toBe(before?.invite_code);
  });

  it("moderator cannot rotate invite_code", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const before = await getCommune(SEED_IDS.commune);
    await supabase
      .from("communes")
      .update({ invite_code: "MODHACK" })
      .eq("id", SEED_IDS.commune);
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.invite_code).toBe(before?.invite_code);
  });

  it("resident cannot rotate invite_code", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const before = await getCommune(SEED_IDS.commune);
    await supabase
      .from("communes")
      .update({ invite_code: "RESHACK" })
      .eq("id", SEED_IDS.commune);
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.invite_code).toBe(before?.invite_code);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/invite-actions.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/invite-actions.test.ts
git commit -m "test(integration): invite_code rotation RLS"
```

---

## Task 8: Integration test — commune-actions (contact info, opening hours, associations)

**Files:**
- Create: `apps/web/tests/integration/commune-actions.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/commune-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, getCommune, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("commune info update RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin updates contact info", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { error } = await supabase
      .from("communes")
      .update({ address: "1 Rue Test", phone: "0501020304", email: "test@example.fr" })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.address).toBe("1 Rue Test");
    expect(after?.phone).toBe("0501020304");
    expect(after?.email).toBe("test@example.fr");
  });

  it("admin updates opening_hours JSON", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const hours = { lundi: "9h-12h", mardi: "fermé" };
    const { error } = await supabase
      .from("communes")
      .update({ opening_hours: hours })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.opening_hours).toEqual(hours);
  });

  it("admin updates associations array", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const associations = [{ name: "Club photo", description: "Sortie mensuelle" }];
    const { error } = await supabase
      .from("communes")
      .update({ associations })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.associations).toEqual(associations);
  });

  it("moderator cannot update contact info", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const before = await getCommune(SEED_IDS.commune);
    await supabase
      .from("communes")
      .update({ address: "moderator hack" })
      .eq("id", SEED_IDS.commune);
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.address).toBe(before?.address);
  });

  it("resident cannot update opening_hours", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const before = await getCommune(SEED_IDS.commune);
    await supabase
      .from("communes")
      .update({ opening_hours: { lundi: "hack" } })
      .eq("id", SEED_IDS.commune);
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.opening_hours).toEqual(before?.opening_hours);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/commune-actions.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/commune-actions.test.ts
git commit -m "test(integration): commune contact/opening_hours/associations RLS"
```

---

## Task 9: Integration test — domain-actions

**Files:**
- Create: `apps/web/tests/integration/domain-actions.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/domain-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, getCommune, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("custom_domain update RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin sets and clears custom_domain", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const set = await supabase
      .from("communes")
      .update({ custom_domain: "saintmedard.fr" })
      .eq("id", SEED_IDS.commune);
    expect(set.error).toBeNull();
    expect((await getCommune(SEED_IDS.commune))?.custom_domain).toBe("saintmedard.fr");

    const clear = await supabase
      .from("communes")
      .update({ custom_domain: null, domain_verified: false })
      .eq("id", SEED_IDS.commune);
    expect(clear.error).toBeNull();
    expect((await getCommune(SEED_IDS.commune))?.custom_domain).toBeNull();
  });

  it("moderator cannot set custom_domain", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    await supabase
      .from("communes")
      .update({ custom_domain: "evil.fr" })
      .eq("id", SEED_IDS.commune);
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.custom_domain).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/domain-actions.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/domain-actions.test.ts
git commit -m "test(integration): custom_domain set/clear RLS"
```

---

## Task 10: Integration test — feed-actions (post creation)

**Files:**
- Create: `apps/web/tests/integration/feed-actions.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/feed-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("posts insert RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can create an annonce", async () => {
    const { supabase, user } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        commune_id: SEED_IDS.commune,
        author_id: user.id,
        title: "Avis officiel",
        body: "Coupure d'eau demain",
        type: "annonce",
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.title).toBe("Avis officiel");
  });

  it("moderator cannot create an annonce", async () => {
    const { supabase, user } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase.from("posts").insert({
      commune_id: SEED_IDS.commune,
      author_id: user.id,
      title: "Faux avis",
      body: "Test",
      type: "annonce",
    });
    expect(error).not.toBeNull();
  });

  it("resident cannot create an annonce", async () => {
    const { supabase, user } = await signInAs(SEED_EMAILS.resident);
    const { error } = await supabase.from("posts").insert({
      commune_id: SEED_IDS.commune,
      author_id: user.id,
      title: "Faux avis",
      body: "Test",
      type: "annonce",
    });
    expect(error).not.toBeNull();
  });

  it("resident can create a discussion", async () => {
    const { supabase, user } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        commune_id: SEED_IDS.commune,
        author_id: user.id,
        title: "Question",
        body: "Quelqu'un sait quand passe le marché ?",
        type: "discussion",
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.type).toBe("discussion");
  });

  it("moderator can create a discussion", async () => {
    const { supabase, user } = await signInAs(SEED_EMAILS.moderator);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        commune_id: SEED_IDS.commune,
        author_id: user.id,
        title: "Modération note",
        body: "Discussion test",
        type: "discussion",
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.type).toBe("discussion");
  });

  it("post_images attach to authored post", async () => {
    const { supabase, user } = await signInAs(SEED_EMAILS.resident);
    const { data: post } = await supabase
      .from("posts")
      .insert({
        commune_id: SEED_IDS.commune,
        author_id: user.id,
        title: "Photo",
        body: "Voici",
        type: "discussion",
      })
      .select()
      .single();
    expect(post).toBeTruthy();
    const { error } = await supabase
      .from("post_images")
      .insert({ post_id: post!.id, storage_path: "posts/test/img.png" });
    expect(error).toBeNull();
    const { data: images } = await serviceClient()
      .from("post_images")
      .select("*")
      .eq("post_id", post!.id);
    expect(images).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/feed-actions.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/feed-actions.test.ts
git commit -m "test(integration): posts insert RLS by role + post_images linkage"
```

---

## Task 11: Integration test — moderation (hide/delete posts)

**Files:**
- Create: `apps/web/tests/integration/moderation.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/moderation.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, getPost, SEED_IDS, SEED_EMAILS } from "./_fixtures";

async function seedPost() {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("posts")
    .insert({
      commune_id: SEED_IDS.commune,
      author_id: SEED_IDS.resident,
      title: "À modérer",
      body: "Contenu",
      type: "discussion",
    })
    .select()
    .single();
  if (error) throw error;
  return data!.id as string;
}

describe("posts moderation RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can hide a post", async () => {
    const postId = await seedPost();
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { error } = await supabase
      .from("posts")
      .update({ is_hidden: true })
      .eq("id", postId);
    expect(error).toBeNull();
    expect((await getPost(postId))?.is_hidden).toBe(true);
  });

  it("moderator can hide a post", async () => {
    const postId = await seedPost();
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase
      .from("posts")
      .update({ is_hidden: true })
      .eq("id", postId);
    expect(error).toBeNull();
    expect((await getPost(postId))?.is_hidden).toBe(true);
  });

  it("resident cannot hide another's post", async () => {
    const postId = await seedPost();
    // The resident IS the author of seedPost above, so they're allowed
    // by the "Authors can update own posts" policy. Switch author.
    await serviceClient().from("posts").update({ author_id: SEED_IDS.admin }).eq("id", postId);
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    await supabase.from("posts").update({ is_hidden: true }).eq("id", postId);
    expect((await getPost(postId))?.is_hidden).toBe(false);
  });

  it("admin can delete a post", async () => {
    const postId = await seedPost();
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    await supabase.from("posts").delete().eq("id", postId);
    expect(await getPost(postId)).toBeNull();
  });

  it("moderator can delete a post", async () => {
    const postId = await seedPost();
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    await supabase.from("posts").delete().eq("id", postId);
    expect(await getPost(postId)).toBeNull();
  });

  it("resident cannot delete a non-authored post", async () => {
    const postId = await seedPost();
    await serviceClient().from("posts").update({ author_id: SEED_IDS.admin }).eq("id", postId);
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    await supabase.from("posts").delete().eq("id", postId);
    expect(await getPost(postId)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/moderation.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/moderation.test.ts
git commit -m "test(integration): post moderation hide/delete RLS for admin/moderator/resident"
```

---

## Task 12: Integration test — homepage-actions (page_sections)

**Files:**
- Create: `apps/web/tests/integration/homepage-actions.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/homepage-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("page_sections RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can insert, update, delete a page section", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data: inserted, error: iErr } = await supabase
      .from("page_sections")
      .insert({
        commune_id: SEED_IDS.commune,
        type: "hero",
        position: 0,
        is_visible: true,
        content: { title: "Bienvenue" },
      })
      .select()
      .single();
    expect(iErr).toBeNull();
    expect(inserted).toBeTruthy();

    const { error: uErr } = await supabase
      .from("page_sections")
      .update({ content: { title: "Bonjour" } })
      .eq("id", inserted!.id);
    expect(uErr).toBeNull();

    const { error: dErr } = await supabase
      .from("page_sections")
      .delete()
      .eq("id", inserted!.id);
    expect(dErr).toBeNull();
  });

  it("moderator cannot insert a page section", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase.from("page_sections").insert({
      commune_id: SEED_IDS.commune,
      type: "hero",
      position: 0,
      is_visible: true,
      content: {},
    });
    expect(error).not.toBeNull();
  });

  it("resident cannot delete a page section", async () => {
    const svc = serviceClient();
    const { data } = await svc
      .from("page_sections")
      .insert({
        commune_id: SEED_IDS.commune,
        type: "hero",
        position: 0,
        is_visible: true,
        content: {},
      })
      .select()
      .single();
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    await supabase.from("page_sections").delete().eq("id", data!.id);
    const { data: stillThere } = await svc
      .from("page_sections")
      .select("*")
      .eq("id", data!.id)
      .single();
    expect(stillThere).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/homepage-actions.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/homepage-actions.test.ts
git commit -m "test(integration): page_sections CRUD RLS"
```

---

## Task 13: Integration test — council-actions

**Files:**
- Create: `apps/web/tests/integration/council-actions.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/council-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("council_documents RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can insert and delete a council document", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await supabase
      .from("council_documents")
      .insert({
        commune_id: SEED_IDS.commune,
        title: "PV du conseil",
        meeting_date: "2026-04-01",
        storage_path: "councils/test.pdf",
      })
      .select()
      .single();
    expect(error).toBeNull();
    const { error: dErr } = await supabase.from("council_documents").delete().eq("id", data!.id);
    expect(dErr).toBeNull();
  });

  it("moderator cannot insert a council document", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase.from("council_documents").insert({
      commune_id: SEED_IDS.commune,
      title: "Hack",
      meeting_date: "2026-04-01",
      storage_path: "x.pdf",
    });
    expect(error).not.toBeNull();
  });

  it("resident cannot delete a council document", async () => {
    const svc = serviceClient();
    const { data } = await svc
      .from("council_documents")
      .insert({
        commune_id: SEED_IDS.commune,
        title: "PV",
        meeting_date: "2026-04-01",
        storage_path: "y.pdf",
      })
      .select()
      .single();
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    await supabase.from("council_documents").delete().eq("id", data!.id);
    const { data: still } = await svc
      .from("council_documents")
      .select("*")
      .eq("id", data!.id)
      .single();
    expect(still).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/council-actions.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/council-actions.test.ts
git commit -m "test(integration): council_documents insert/delete RLS"
```

---

## Task 14: Integration test — profile RLS (the original silent-failure bug)

**Files:**
- Create: `apps/web/tests/integration/profile-rls.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/tests/integration/profile-rls.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("profiles SELECT RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can read own profile (regression: missing tab bug)", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", SEED_IDS.admin)
      .single();
    expect(error).toBeNull();
    expect(data?.role).toBe("admin");
  });

  it("resident can read own profile", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", SEED_IDS.resident)
      .single();
    expect(error).toBeNull();
    expect(data?.role).toBe("resident");
  });

  it("user can read other profiles in own commune", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", SEED_IDS.admin)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(SEED_IDS.admin);
  });

  it("user cannot read profiles in another commune", async () => {
    const svc = serviceClient();
    // Create a second commune + a profile in it.
    await svc.from("communes").insert({
      id: "00000000-0000-0000-0000-000000000099",
      name: "Other",
      slug: "other",
      code_postal: "12345",
      theme: "terre_doc",
      invite_code: "OTHER1",
    });
    await svc.from("profiles").insert({
      id: "00000000-0000-0000-0000-000000000999",
      commune_id: "00000000-0000-0000-0000-000000000099",
      display_name: "Stranger",
      role: "resident",
      status: "active",
    });
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000999")
      .maybeSingle();
    expect(data).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd apps/web && npx vitest run --config vitest.integration.config.ts tests/integration/profile-rls.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/integration/profile-rls.test.ts
git commit -m "test(integration): profile SELECT RLS — own + same-commune + cross-commune isolation"
```

---

## Task 15: Package scripts + run the full suite

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Update scripts**

In `apps/web/package.json`, replace the existing `"test"`, `"test:watch"` entries (and add the new ones) with:

```json
"test": "pnpm test:components && pnpm test:integration",
"test:components": "vitest run --config vitest.config.ts",
"test:integration": "vitest run --config vitest.integration.config.ts",
"test:watch": "vitest --config vitest.config.ts"
```

- [ ] **Step 2: Run the full suite**

```bash
pnpm --filter @pretou/web test
```

Expected: every component test passes, every integration test passes. Total runtime ~30-60s on a warm machine.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json
git commit -m "chore(web): split test scripts into components / integration / watch"
```

---

## Task 16: GitHub Actions CI

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/test.yml`:

```yaml
name: test

on:
  push:
    branches: [master]
  pull_request:

jobs:
  components:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @pretou/web test:components

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: pnpm install --frozen-lockfile
      - name: Start Supabase
        run: supabase start
      - name: Export Supabase env
        run: |
          eval "$(supabase status -o env)"
          {
            echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL"
            echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
            echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
          } >> "$GITHUB_ENV"
      - run: pnpm --filter @pretou/web test:integration
      - name: Stop Supabase
        if: always()
        run: supabase stop
```

- [ ] **Step 2: Validate the YAML locally if you have `actionlint` installed**

```bash
which actionlint && actionlint .github/workflows/test.yml || echo "actionlint not installed — skipping"
```

If installed, expect no output (no errors). If not, the syntax will be checked when GitHub runs the workflow.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add components + integration test workflow"
```

---

## Task 17: Conventions documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `tasks/lessons.md`

- [ ] **Step 1: Add convention bullets to CLAUDE.md**

In `CLAUDE.md` under `## Key Conventions`, append three bullets:

```markdown
- **Run `pnpm --filter @pretou/web test:components` before committing UI changes.** Catches NavBar/PostCard/ThemeCustomizer regressions in <5s.
- **Run `pnpm --filter @pretou/web test:integration` before merging anything that touches DB schema, RLS, or server actions.** Requires `npx supabase start` running locally.
- **Every new server-action write path needs an integration test** asserting (a) it persists for the intended role and (b) it's silently blocked for an unauthorized role. RLS denies by default and PostgREST swallows the failure — the test is the only thing that catches it.
```

- [ ] **Step 2: Add a lessons entry**

Append to `tasks/lessons.md`:

```markdown
## 2026-04-17 — Convention: every write path needs an integration test

After the silent-RLS-failure incident, the test suite at
`apps/web/tests/integration/` enforces this with a one-shot assertion
per (action × role) combination. Adding a new server action now means
adding a matching test file modeled on `theme-actions.test.ts` — it
takes minutes and catches the silent-failure class before merge.

See `docs/superpowers/specs/2026-04-17-web-test-suite-phase1-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md tasks/lessons.md
git commit -m "docs: codify the 'every write path needs a test' convention"
```

---

## Final Verification Pass

- [ ] **Step 1: Run the full suite locally**

```bash
npx supabase start
pnpm --filter @pretou/web test
```

Expected: all component + integration tests pass. Note total runtime.

- [ ] **Step 2: Confirm CI workflow appears in the repo**

```bash
ls -la .github/workflows/test.yml
```

When you push, the workflow runs on PR and on master.

- [ ] **Step 3: Sanity-check that adding a new failing assertion fails the suite**

Edit one test (e.g. flip an `expect(...).toBe(true)` to `false`), run the suite, confirm it fails, then revert.

- [ ] **Step 4: Update CLAUDE.md project status**

In `CLAUDE.md` under `## Current Status`, append:

```markdown
- **Test suite phase 1 complete (2026-04-17)**: integration tests for every server-action write path × role + component tests for NavBar/PostCard/ThemeCustomizer/FeedFilters; CI runs on PR.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark test suite phase 1 complete in CLAUDE.md status"
```
