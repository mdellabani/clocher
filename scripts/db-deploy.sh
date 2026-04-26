#!/usr/bin/env bash
#
# Reset a remote Supabase project to the current `001_initial_schema.sql`,
# deploy the messaging edge function, and wire the trigger GUCs.
#
# Use this only on environments that hold throwaway data. It DROPS the
# public schema. The 2026-04-26 messaging refactor rewrote the initial
# migration in place, so `supabase db push` cannot reconcile remote
# state — a destructive reset is the only path forward.
#
# Usage:
#   scripts/db-deploy.sh demo
#   scripts/db-deploy.sh production
#
# Reads its env from apps/web/.env.<env> (the file you already use for
# the Next.js app at runtime). Required keys per file:
#   NEXT_PUBLIC_SUPABASE_URL     project ref is parsed out of this
#   SUPABASE_SERVICE_ROLE_KEY    used for the trigger GUC
#   SUPABASE_DB_URL              psql connection string (project settings → Database)
# Plus once globally:
#   SUPABASE_ACCESS_TOKEN        cached by `supabase login`, or export it
#
# Flags:
#   --no-seed     skip seed.sql (default: seed only on demo)
#   --skip-reset  only redeploy the function + GUCs (no schema drop)
#   --yes         skip confirmation prompt (CI / scripted use)

set -euo pipefail

ENV_NAME="${1:-}"
shift || true

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
  demo)        DEFAULT_SEED=1 ;;
  production)  DEFAULT_SEED=0 ;;
  ""|-h|--help)
    sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  *)
    echo "Unknown environment: $ENV_NAME (expected: demo | production)" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/web/.env.$ENV_NAME"
SCHEMA_FILE="$REPO_ROOT/supabase/migrations/001_initial_schema.sql"
SEED_FILE="$REPO_ROOT/supabase/seed.sql"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE not found" >&2
  exit 2
fi
if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "$SCHEMA_FILE not found" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${NEXT_PUBLIC_SUPABASE_URL:?missing in $ENV_FILE}"
: "${SUPABASE_SERVICE_ROLE_KEY:?missing in $ENV_FILE}"
: "${SUPABASE_DB_URL:?missing in $ENV_FILE — add the Connection string (URI) from the project Database settings}"

# https://<ref>.supabase.co  →  <ref>
PROJECT_REF="$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#^https?://([^.]+)\..*#\1#')"
FUNCTIONS_URL="https://${PROJECT_REF}.functions.supabase.co"

if [[ $NO_SEED -eq 1 ]]; then SEED=0; else SEED=$DEFAULT_SEED; fi

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
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 "$@"
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
ALTER DATABASE postgres SET "app.settings.service_role_key" = '${SUPABASE_SERVICE_ROLE_KEY}';
SQL

echo "==> Done. New connections see the GUCs; reconnect any open psql sessions to pick them up."
