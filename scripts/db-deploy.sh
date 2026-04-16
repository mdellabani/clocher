#!/usr/bin/env bash
# db-deploy.sh — apply the local schema (migrations) to a remote Supabase project.
#
# Usage:
#   ./scripts/db-deploy.sh                # both: demo first, then prod (with prompt)
#   ./scripts/db-deploy.sh demo           # demo only
#   ./scripts/db-deploy.sh prod           # prod only
#
# Behavior per environment:
#   demo: reset schema + reapply seed.sql (data is throwaway)
#   prod: dump public.* + storage.objects -> reset schema -> restore the dump
#
# Requirements:
#   - supabase CLI logged in (`supabase login`)
#   - env vars set:
#       SUPABASE_DEMO_REF   project ref of the demo project
#       SUPABASE_PROD_REF   project ref of the prod project
#       SUPABASE_DB_PASSWORD_DEMO   db password for demo (used by `supabase link`)
#       SUPABASE_DB_PASSWORD_PROD   db password for prod
#
# Backups land in ./db-backups/<env>-<timestamp>.sql (gitignored).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="$ROOT/db-backups"
mkdir -p "$BACKUP_DIR"

# ---------- helpers ----------

err()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; }
log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*"; }

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    err "missing env var: $name"
    exit 1
  fi
}

confirm() {
  local prompt="$1"
  read -rp "$prompt [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

link_project() {
  local env="$1" ref="$2" password="$3"
  log "linking to $env (project-ref: $ref)"
  SUPABASE_DB_PASSWORD="$password" npx supabase link --project-ref "$ref" >/dev/null
}

# ---------- per-env handlers ----------

deploy_demo() {
  require_env SUPABASE_DEMO_REF
  require_env SUPABASE_DB_PASSWORD_DEMO

  log "DEMO: reset schema + reapply seed"
  link_project demo "$SUPABASE_DEMO_REF" "$SUPABASE_DB_PASSWORD_DEMO"

  if ! confirm "About to RESET the demo database (all data lost, seed reapplied). Continue?"; then
    warn "demo skipped"
    return
  fi

  npx supabase db reset --linked
  ok "demo schema reset + seed applied"
}

deploy_prod() {
  require_env SUPABASE_PROD_REF
  require_env SUPABASE_DB_PASSWORD_PROD

  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local backup="$BACKUP_DIR/prod-${stamp}.sql"

  log "PROD: backup -> reset schema -> restore"
  link_project prod "$SUPABASE_PROD_REF" "$SUPABASE_DB_PASSWORD_PROD"

  log "dumping public + storage.objects to $backup"
  npx supabase db dump --linked --data-only \
    --schema public --schema storage \
    -f "$backup"
  ok "backup written ($(wc -c <"$backup") bytes)"

  warn "next step DROPS all tables in public schema on PROD."
  warn "backup is at: $backup"
  if ! confirm "Reset PROD schema now?"; then
    warn "prod skipped — backup retained at $backup"
    return
  fi

  npx supabase db reset --linked --no-seed
  ok "prod schema reset"

  log "restoring data from $backup"
  npx supabase db psql --linked -f "$backup"
  ok "prod data restored"

  log "backup retained at $backup (delete manually once verified)"
}

# ---------- main ----------

target="${1:-both}"

case "$target" in
  demo)
    deploy_demo
    ;;
  prod)
    deploy_prod
    ;;
  both|"")
    deploy_demo
    echo
    if confirm "Demo done. Proceed with PROD?"; then
      deploy_prod
    else
      warn "prod skipped"
    fi
    ;;
  *)
    err "unknown target: $target (expected: demo, prod, or no arg)"
    exit 1
    ;;
esac

ok "done"
