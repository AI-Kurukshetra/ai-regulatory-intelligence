#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PHASE="${1:-}"

run_bin() {
  local binary="$1"
  shift

  if [ -x "./node_modules/.bin/$binary" ]; then
    "./node_modules/.bin/$binary" "$@"
    return
  fi

  if command -v "$binary" >/dev/null 2>&1; then
    "$binary" "$@"
    return
  fi

  npx "$binary" "$@"
}

require_file() {
  local path="$1"
  if [ ! -f "$path" ]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

run_quality_checks() {
  run_bin vitest run
  run_bin tsc --noEmit
  run_bin next lint
  run_bin next build
}

phase_1() {
  require_file "scripts/verify-rls.mjs"
  run_quality_checks
  node scripts/verify-rls.mjs
  echo "Phase 1 gate passed."
}

phase_2() {
  require_file "app/api/v1/transactions/route.ts"
  require_file "app/api/v1/transactions/[id]/route.ts"
  require_file "app/api/internal/jobs/process/route.ts"
  require_file "lib/rules/engine.ts"
  require_file "lib/jobs/score-transactions.ts"
  require_file "lib/jobs/screen-sanctions.ts"
  require_file "components/alerts/live-alert-feed.tsx"
  require_file "supabase/migrations/20260314160000_phase2_rules_and_job_claim.sql"
  run_quality_checks
  echo "Phase 2 gate passed."
}

case "$PHASE" in
  phase-1)
    phase_1
    ;;
  phase-2)
    phase_2
    ;;
  *)
    echo "Usage: bash scripts/phase-gate.sh <phase-1|phase-2>" >&2
    exit 1
    ;;
esac
