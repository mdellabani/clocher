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
# Requirement: `supabase login` already done (personal access token gives the
# CLI everything it needs — no DB passwords required).
#
# Backups land in ./db-backups/<env>-<timestamp>.sql (gitignored).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Project refs (visible in dashboard URLs — not secret).
SUPABASE_DEMO_REF="${SUPABASE_DEMO_REF:-vdfyugekbtanrlveihlm}"
SUPABASE_PROD_REF="${SUPABASE_PROD_REF:-tsfmyrtmuravhzearntn}"

BACKUP_DIR="$ROOT/db-backups"
mkdir -p "$BACKUP_DIR"

# ---------- helpers ----------

err()  { printf '\033[0;31m✗\033[0m %s\n' "$*" >&2; }
log()  { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m⚠\033[0m %s\n' "$*"; }

confirm() {
  local prompt="$1"
  read -rp "$prompt [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

link_project() {
  local env="$1" ref="$2"
  log "linking to $env (project-ref: $ref)"
  npx supabase link --project-ref "$ref" >/dev/null
}

# ---------- per-env handlers ----------

deploy_demo() {
  log "DEMO: reset schema + reapply seed"
  link_project demo "$SUPABASE_DEMO_REF"

  if ! confirm "About to RESET the demo database (all data lost, seed reapplied). Continue?"; then
    warn "demo skipped"
    return
  fi

  npx supabase db reset --linked
  ok "demo schema reset + seed applied"
}

deploy_prod() {
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local backup="$BACKUP_DIR/prod-${stamp}.sql"

  log "PROD: backup -> reset schema -> restore"
  link_project prod "$SUPABASE_PROD_REF"

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
  npx supabase db query --linked <"$backup"
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
