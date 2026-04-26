#!/usr/bin/env bash
#
# Reset a remote Supabase project to the current `001_initial_schema.sql`,
# deploy the messaging edge function, and wire the trigger GUCs.
#
# Use this only on environments that hold throwaway data. It DROPS the
# public schema. The 2026-04-26 messaging refactor rewrote the initial
# migration in place, so `supabase db push` cannot reconcile remote state
# with local — a destructive reset is the only path forward.
#
# Usage:
#   scripts/db-deploy.sh demo
#   scripts/db-deploy.sh prod
#
# Reads its config from a repo-root .env.local (auto-sourced). See
# .env.local.example for the full template. Required keys:
#   SUPABASE_DB_URL_DEMO            postgres://... (project settings → Database)
#   SUPABASE_SERVICE_ROLE_KEY_DEMO
#   SUPABASE_DB_URL_PROD
#   SUPABASE_SERVICE_ROLE_KEY_PROD
#   SUPABASE_ACCESS_TOKEN           for `supabase link` / `functions deploy`
# .env.local values overwrite any pre-existing exports, so unset vars
# you want to override before running.
#
# Flags:
#   --no-seed     skip seed.sql (default: seed only on demo)
#   --skip-reset  skip schema drop+reapply (only redeploy function + GUCs)
#   --yes         skip confirmation prompt (CI / scripted use)

set -euo pipefail

ENV_NAME="${1:-}"
shift || true

# Auto-source repo-root .env.local so the user doesn't have to export
# every var by hand. (.env.local values overwrite existing exports.)
REPO_ROOT_FOR_ENV="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$REPO_ROOT_FOR_ENV/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT_FOR_ENV/.env.local"
  set +a
fi

NO_SEED=0
SKIP_RESET=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --no-seed) NO_SEED=1 ;;
    --skip-reset) SKIP_RESET=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    *) echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

case "$ENV_NAME" in
  demo)
    PROJECT_REF="vdfyugekbtanrlveihlm"
    DB_URL="${SUPABASE_DB_URL_DEMO:-}"
    SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY_DEMO:-}"
    DEFAULT_SEED=1
    ;;
  prod)
    PROJECT_REF="tsfmyrtmuravhzearntn"
    DB_URL="${SUPABASE_DB_URL_PROD:-}"
    SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY_PROD:-}"
    DEFAULT_SEED=0
    ;;
  ""|-h|--help)
    sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  *)
    echo "Unknown environment: $ENV_NAME (expected: demo | prod)" >&2
    exit 2
    ;;
esac

if [[ -z "$DB_URL" ]]; then
  echo "Missing SUPABASE_DB_URL_${ENV_NAME^^}" >&2
  exit 2
fi
if [[ -z "$SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY_${ENV_NAME^^}" >&2
  exit 2
fi
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN (needed for supabase link / functions deploy)" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_FILE="$REPO_ROOT/supabase/migrations/001_initial_schema.sql"
SEED_FILE="$REPO_ROOT/supabase/seed.sql"
FUNCTIONS_URL="https://${PROJECT_REF}.functions.supabase.co"
SEED=$NO_SEED
if [[ $NO_SEED -eq 0 ]]; then SEED=$DEFAULT_SEED; else SEED=0; fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

cat <<EOF
About to deploy to: $ENV_NAME (project ref: $PROJECT_REF)
  Reset schema:    $([[ $SKIP_RESET -eq 0 ]] && echo "YES (drops public schema)" || echo "no")
  Apply seed:      $([[ $SEED -eq 1 ]] && echo "yes" || echo "no")
  Deploy fn:       notify_new_message
  Set GUCs:        app.settings.functions_url, app.settings.service_role_key
EOF

if [[ $ASSUME_YES -ne 1 ]]; then
  read -r -p "Continue? Type the environment name to confirm: " confirm
  if [[ "$confirm" != "$ENV_NAME" ]]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

run_psql() {
  PGPASSWORD="" psql "$DB_URL" -v ON_ERROR_STOP=1 "$@"
}

if [[ $SKIP_RESET -eq 0 ]]; then
  echo "==> Dropping public schema and reapplying 001_initial_schema.sql"
  run_psql -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
  run_psql -f "$SCHEMA_FILE"

  if [[ $SEED -eq 1 && -f "$SEED_FILE" ]]; then
    echo "==> Applying seed.sql"
    run_psql -f "$SEED_FILE"
  fi
fi

echo "==> Linking Supabase project"
( cd "$REPO_ROOT" && npx --yes supabase link --project-ref "$PROJECT_REF" >/dev/null )

echo "==> Deploying edge function: notify_new_message"
( cd "$REPO_ROOT" && npx --yes supabase functions deploy notify_new_message --project-ref "$PROJECT_REF" --no-verify-jwt )

echo "==> Setting trigger GUCs (functions_url, service_role_key)"
run_psql <<SQL
ALTER DATABASE postgres SET "app.settings.functions_url" = '${FUNCTIONS_URL}';
ALTER DATABASE postgres SET "app.settings.service_role_key" = '${SERVICE_ROLE_KEY}';
SQL

echo "==> Done. New connections will see the GUCs; restart the project's Postgres if a worker holds a stale session."
