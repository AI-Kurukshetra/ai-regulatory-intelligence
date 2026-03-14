#!/usr/bin/env bash

set -euo pipefail

phase="${1:-}"

usage() {
  cat <<'EOF'
Usage:
  phase-gate.sh phase-1

Supported phases:
  phase-1   Run reusable Foundation checks for this repository
EOF
}

run_cmd() {
  echo ""
  echo "▶ $1"
  eval "$1"
}

case "$phase" in
  phase-1|foundation)
    run_cmd "npm run typecheck"
    run_cmd "npm run lint"
    run_cmd "npm run test"
    run_cmd "npm run build"
    run_cmd "npm run verify:rls"
    echo ""
    echo "Phase 1 reusable gate passed."
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unsupported phase: $phase" >&2
    echo "See references/phase-gates.md for later-phase checks." >&2
    exit 1
    ;;
esac
