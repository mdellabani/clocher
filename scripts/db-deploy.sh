#!/usr/bin/env bash
#
# Reset a remote Supabase project to the current `001_initial_schema.sql`
# and redeploy the messaging edge function. Pure supabase CLI, no psql,
# no extra env vars beyond what apps/web/.env.<env> already has.
#
# Use this only on environments holding throwaway data — the messaging
# refactor rewrote 001_initial_schema.sql in place, so a destructive
# reset is the only path forward (`db push` cannot reconcile).
#
# Usage:
#   scripts/db-deploy.sh demo
#   scripts/db-deploy.sh production
#
# Reads NEXT_PUBLIC_SUPABASE_URL from apps/web/.env.<env> and derives
# the project ref from it. `npx supabase login` once globally caches
# the access token; `link` will prompt for the DB password and cache
# it under supabase/.temp/.
#
# Flags:
#   --no-seed     skip seed.sql (default: seed only on demo)
#   --yes         skip confirmation prompt (CI / scripted use)

set -euo pipefail

ENV_NAME="${1:-}"
shift || true

NO_SEED=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --no-seed) NO_SEED=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    *) echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

case "$ENV_NAME" in
  demo)        DEFAULT_SEED=1 ;;
  production)  DEFAULT_SEED=0 ;;
  ""|-h|--help)
    sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  *)
    echo "Unknown environment: $ENV_NAME (expected: demo | production)" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/web/.env.$ENV_NAME"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE not found" >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${NEXT_PUBLIC_SUPABASE_URL:?missing in $ENV_FILE}"
PROJECT_REF="$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#^https?://([^.]+)\..*#\1#')"

SEED_FLAG=""
if [[ $NO_SEED -eq 1 || $DEFAULT_SEED -eq 0 ]]; then
  SEED_FLAG="--no-seed"
fi

cat <<EOF
About to deploy to: $ENV_NAME (project ref: $PROJECT_REF)
  supabase link        --project-ref $PROJECT_REF
  supabase db reset    --linked $SEED_FLAG  (DROPS public schema)
  supabase functions deploy notify_new_message
EOF

if [[ $ASSUME_YES -ne 1 ]]; then
  read -r -p "Continue? Type the environment name to confirm: " confirm
  if [[ "$confirm" != "$ENV_NAME" ]]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

cd "$REPO_ROOT"

echo "==> Linking Supabase project"
npx --yes supabase link --project-ref "$PROJECT_REF" >/dev/null

echo "==> Resetting linked database from migrations"
# shellcheck disable=SC2086
npx --yes supabase db reset --linked --yes $SEED_FLAG

echo "==> Deploying edge function: notify_new_message"
npx --yes supabase functions deploy notify_new_message --project-ref "$PROJECT_REF" --no-verify-jwt

echo "==> Setting trigger GUCs via Management API"
FUNCTIONS_URL="https://${PROJECT_REF}.functions.supabase.co"
GUC_SQL="ALTER DATABASE postgres SET \"app.settings.functions_url\" = '${FUNCTIONS_URL}'; ALTER DATABASE postgres SET \"app.settings.service_role_key\" = '${SUPABASE_SERVICE_ROLE_KEY}';"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  cat <<EOF
SUPABASE_ACCESS_TOKEN not set — skipping GUC step.
Either export it (https://supabase.com/dashboard/account/tokens) and rerun,
or paste this once in Studio → SQL editor:

$GUC_SQL
EOF
else
  http_code=$(curl -sS -o /tmp/db-deploy-resp.json -w "%{http_code}" \
    -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(printf '{"query": %s}' "$(printf '%s' "$GUC_SQL" | jq -Rs .)")")
  if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
    echo "Management API returned $http_code:" >&2
    cat /tmp/db-deploy-resp.json >&2
    echo >&2
    exit 1
  fi
  echo "GUCs set (functions_url + service_role_key)."
fi

echo
echo "==> Deploy complete for $ENV_NAME."
