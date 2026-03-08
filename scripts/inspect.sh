#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Safety: never print secrets
set +x

echo "=== Cosmic Insight ==="
echo "Run started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Dry run: ${DRY_RUN:-false}"

# Validate required secrets are present
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ERROR: ANTHROPIC_API_KEY is not set"
  exit 1
fi

if [[ "${DRY_RUN:-false}" != "true" ]] && [[ -z "${YOYO_GH_TOKEN:-}" ]]; then
  echo "ERROR: YOYO_GH_TOKEN is not set (required for non-dry-run)"
  exit 1
fi

# Set GH token for gh CLI
if [[ -n "${YOYO_GH_TOKEN:-}" ]]; then
  export GH_TOKEN="${YOYO_GH_TOKEN}"
fi

cd "$ROOT"

# Kill switch: create a PAUSED file in repo root to immediately halt all runs
if [[ -f "$ROOT/PAUSED" ]]; then
  echo "PAUSED file detected — run halted. Remove PAUSED to resume."
  exit 0
fi

# Run the TypeScript analysis
pnpm inspect

echo "=== Run complete ==="

# Commit state changes (skip in dry run or if nothing changed)
if [[ "${DRY_RUN:-false}" != "true" ]]; then
  git add STATE.json JOURNAL.md PRIORITIES.md
  if git diff --cached --quiet; then
    echo "No state changes to commit"
  else
    git config user.name "Cosmic Insight"
    git config user.email "cosmic-insight@noreply.github.com"
    git commit -m "chore: update state after run $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    git push
  fi
fi
