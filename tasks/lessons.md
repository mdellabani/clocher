# Lessons

Mistakes made during development, captured so they don't repeat.

## 2026-04-17 — RLS write policies were never audited table-by-table

**What happened.** The initial schema (`001_initial_schema.sql`) was generated from a working local DB and reviewed at the *table-and-data* level, but **not** at the *RLS-policy completeness* level. Several admin-write operations (commune settings, moderator post hide/delete) had no matching `INSERT`/`UPDATE`/`DELETE` policy. Because PostgREST silently filters blocked rows (returns `error: null, data: null` with zero rows affected), the bugs only surfaced when the user noticed "I save the theme but nothing changes."

**Why it slipped.**
1. The schema was generated, then we focused on the data model and SELECT policies (which determine what users *see* — visible regression). UPDATE/DELETE blocking is invisible until someone tries to use the feature.
2. Server-action code looked correct (`supabase.from(X).update(Y).eq(...)`), the function returned `{ error: null }`, and the form said "saved" — three signals lying in the same direction.
3. We never wrote integration tests that assert "logged-in admin can update commune.theme."
4. The consolidated single-migration workflow encouraged "look at the whole file" reviews where the *absence* of a policy is hard to spot, vs. per-feature migrations where you'd add the policy alongside the code that needs it.

**How to prevent it next time.**
- **For every new write path in app code, the same PR/migration must add the matching RLS policy.** This is now in `CLAUDE.md` under "Writing RLS policies."
- After adding any `from(X).update/insert/delete` in a server action, test it end-to-end as a non-superuser role. Don't trust the absence of an `error` field.
- Optional follow-up: write a small SQL audit script that greps for `from\("([a-z_]+)"\)\.(update|insert|delete)` in `apps/web/src` and joins against `pg_policies` to flag tables that are written by the app but have no matching policy. Run in CI.

## 2026-04-17 — Convention: every write path needs an integration test

After the silent-RLS-failure incident, the test suite at
`apps/web/tests/integration/` enforces this with a one-shot assertion
per (action × role) combination. Adding a new server action now means
adding a matching test file modeled on `theme-actions.test.ts` — it
takes minutes and catches the silent-failure class before merge.

See `docs/superpowers/specs/2026-04-17-web-test-suite-phase1-design.md`.

## Template for future entries

```
## YYYY-MM-DD — <one-line title>

**What happened.** ...
**Why it slipped.** ...
**How to prevent it next time.** ...
```
