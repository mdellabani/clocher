# Web Test Suite — Phase 1 Design

## Why

The codebase has zero tests. Two recent classes of bug bit hard and would have been caught by automation:

- **Silent data-layer failures** — RLS policies missing on `public.communes` UPDATE and on `public.posts` UPDATE/DELETE for moderators. Server actions returned `{ error: null }` because PostgREST silently filtered out the rows. Bugs only surfaced when the user manually tried the affected feature.
- **UI rendering bugs** — `useProfile` only fetched once at mount, so signing in after first page load left the navbar with `profile: null` and no admin tab. Hard to spot without an explicit assertion that "logged-in admin sees admin link."

Phase 1 invests in tests that catch these two classes specifically. Mobile tests, end-to-end browser tests, and broader business-logic coverage are deferred to later phases.

## Scope

In scope:

- Web app only (`apps/web`).
- Two test types:
  - **Integration** — server actions executed against local Supabase, asserting DB state.
  - **Component** — React Testing Library + jsdom for client components, with mocked Supabase / hooks / router.
- Required Vitest configs, test fixtures, package scripts, GitHub Actions workflow, and conventions documentation.

Out of scope (their own future specs):

- Mobile tests (`apps/mobile`).
- End-to-end browser tests (Playwright).
- Storage upload tests requiring binary fixtures.
- Performance / load tests.
- `packages/shared` unit tests beyond what naturally falls out of integration coverage.

## Architecture

Both test types run under Vitest. They share dependencies but use separate configs because they target different environments and have different runtime characteristics.

### Integration tests

- Path: `apps/web/tests/integration/**/*.test.ts`.
- Config: `apps/web/vitest.integration.config.ts`. Key options: `environment: "node"`, `pool: "forks"`, `poolOptions.forks.singleFork: true` (sequential execution to avoid contention on the shared local DB), `testTimeout: 15_000`.
- Connects to the local Supabase instance running on `:54321`. Tests use the anon-key client signed in as a seeded user (no service-role keys committed).
- Each `describe` block calls `resetData()` in `beforeEach` to TRUNCATE the test-relevant `public.*` tables and re-insert a minimal seed.
- Per-test pattern: `signIn → call server action → read back from DB via service-role client → assert`.
- The "read back" must use the service-role client to bypass RLS — otherwise we'd be testing that we can re-read what we just wrote, not that the write happened.

### Component tests

- Path: `apps/web/tests/components/**/*.test.tsx`.
- Config: existing `apps/web/vitest.config.ts` (already `environment: "jsdom"`).
- Mock strategy: `vi.mock` for `@/lib/supabase/client`, `@/hooks/use-profile`, and `next/navigation`. No HTTP mocks (MSW) at this stage — the components don't make HTTP calls themselves; they go through the supabase client we're already mocking.
- Each test asserts visible behavior via DOM queries (`screen.getByText`, `screen.queryByRole`), not implementation details (no spying on internal state).

### Shared fixture file

`apps/web/tests/integration/_fixtures.ts` exports:

- `serviceClient()` — service-role supabase client. Used for setup and assertions. Reads `SUPABASE_SERVICE_ROLE_KEY` from env (set in dev shell + CI; never committed).
- `signInAs(email: string, password = "demo1234")` — creates an anon-key client signed in as the given seeded user. Returns the supabase client and the auth user.
- `resetData()` — TRUNCATEs the standard set of tables (`posts`, `comments`, `rsvps`, `polls`, `poll_votes`, `poll_options`, `reports`, `audit_log`, `producers`, `page_sections`, `council_documents`) with `CASCADE`, then re-inserts a known minimal seed (one commune with one admin, one moderator, one resident). Does NOT touch `auth.users` — that survives across tests because creating users is slow and the seeded users don't change.
- `getCommune(id)` / `getProfile(id)` / `getPost(id)` — small typed helpers for assertions.

The seed used by `resetData()` is intentionally smaller than `supabase/seed.sql`. Tests should assert on rows they themselves created, not rely on demo data.

### Coverage targets — initial test files

**Integration (one file per server-action surface):**

| File | Asserts |
|------|---------|
| `tests/integration/theme-actions.test.ts` | `updateThemeAction` and `removeLogoAction` persist for admin, blocked for moderator and resident |
| `tests/integration/commune-actions.test.ts` | `commune-actions.ts` updates (contact info, opening hours, associations) persist for admin, blocked for non-admin |
| `tests/integration/invite-actions.test.ts` | `regenerateInviteCodeAction` persists for admin, blocked for non-admin; new code differs from old |
| `tests/integration/domain-actions.test.ts` | `setCustomDomainAction` persists for admin, blocked for non-admin |
| `tests/integration/feed-actions.test.ts` | `createPostAction` persists for approved roles; type=annonce blocked for resident; word-filter auto-hide fires; image rows linked to created posts |
| `tests/integration/moderation.test.ts` | `hidePostAction` and `deletePostAction` persist for both admin and moderator, blocked for resident |
| `tests/integration/homepage-actions.test.ts` | `page_sections` insert/update/delete persists for admin, blocked for non-admin |
| `tests/integration/council-actions.test.ts` | `council_documents` insert/delete persists for admin, blocked for non-admin |
| `tests/integration/profile-rls.test.ts` | self-read returns own row; cross-commune profile invisible; admin can read profiles in own commune only |

Roughly 60-90 individual test cases across these files. Each follows the same shape so writing #5 after #1 is mechanical.

**Component (one file per significant component):**

| File | Asserts |
|------|---------|
| `tests/components/nav-bar.test.tsx` | admin link visible only for `isAdmin: true`; moderator link visible only for `isModerator && !isAdmin`; loading skeleton renders during initial load; commune name displayed when profile loaded |
| `tests/components/post-card.test.tsx` | renders without image (no thumbnail slot); renders with image (96×96 thumbnail visible); pinned styling applied for `is_pinned: true`; expiry text rendered for `service` posts |
| `tests/components/theme-customizer.test.tsx` | "Aperçu non sauvegardé" pill hidden initially, appears after picker change, hidden again after save; preview override `<style>` mounts only when picker is dirty; remove-logo button visible only when `currentLogoUrl` provided |
| `tests/components/feed-filters.test.tsx` | type/date/commune selections update active state; clear-all resets filters |

### Package scripts

In `apps/web/package.json`:

```json
{
  "scripts": {
    "test": "pnpm test:components && pnpm test:integration",
    "test:components": "vitest run --config vitest.config.ts tests/components",
    "test:integration": "vitest run --config vitest.integration.config.ts tests/integration",
    "test:watch": "vitest --config vitest.config.ts tests/components"
  }
}
```

Watch mode targets components only because integration tests need a fresh Supabase between runs and aren't ergonomic in watch.

### CI

New file `.github/workflows/test.yml`:

- Triggers: pull_request, push to master.
- Two parallel jobs:
  - **components** — checkout → `pnpm install` → `pnpm --filter @rural-community-platform/web test:components`. Should finish in well under a minute.
  - **integration** — checkout → `pnpm install` → `supabase start` (using `supabase/setup-cli` action) → `pnpm --filter @rural-community-platform/web test:integration` → `supabase stop`. Slower but parallelized with components.
- Both jobs cache `~/.pnpm-store` and `node_modules`.

The existing `triage.yml` workflow is untouched.

### Environment variables

Tests require:

- `NEXT_PUBLIC_SUPABASE_URL` — pointed at local supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key from local supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key from local supabase, used by `serviceClient()` in fixtures.

In dev: developers set these in `apps/web/.env.local` (already true for the first two; service-role key needs to be added).
In CI: read from the output of `supabase start` and exported to the integration job's environment.

The CI job reads the service-role key from `supabase status -o env` output rather than a committed secret.

### File structure

```
apps/web/
  vitest.config.ts                      # existing — components only
  vitest.integration.config.ts          # new — integration only
  tests/
    components/
      nav-bar.test.tsx
      post-card.test.tsx
      theme-customizer.test.tsx
      feed-filters.test.tsx
    integration/
      _fixtures.ts                      # signInAs, resetData, serviceClient
      theme-actions.test.ts
      commune-actions.test.ts
      invite-actions.test.ts
      domain-actions.test.ts
      feed-actions.test.ts
      moderation.test.ts
      homepage-actions.test.ts
      council-actions.test.ts
      profile-rls.test.ts
```

Tests live in a top-level `tests/` directory rather than colocated with source. Reasoning: integration tests aren't tied to a single source file, and keeping them out of `src/` simplifies the bundler config (no need to exclude tests from production builds).

## Conventions documentation

Update `CLAUDE.md` under "Key Conventions":

- "Run `pnpm test:components` before committing UI changes."
- "Run `pnpm test:integration` before merging anything that touches DB schema, RLS, or server actions."
- "Every new server-action write path must come with at least one integration test asserting (a) it persists for the intended role and (b) it is blocked for an unauthorized role."

Update `tasks/lessons.md` with a new entry referencing this spec — the rule is the lesson learned from the silent-RLS-failure incident, codified into a process gate.

## Verification

After implementation, the suite is "complete for phase 1" if:

- `pnpm test:components` passes locally and exercises every file listed in the component table.
- `pnpm test:integration` passes locally with `npx supabase start` running.
- Every server-action file in `apps/web/src/app/**/*-actions.ts` has at least one corresponding integration test.
- CI runs both jobs on PRs and blocks merge on failure.
- Adding a new server action without a matching test would feel out-of-place because the convention is documented.
