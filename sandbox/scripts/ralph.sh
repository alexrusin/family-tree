#!/usr/bin/env bash
# Ralph loop: drive `claude -p` through a folder of issue specs, one issue per
# fresh context window. Stops on the first failure.
#
# Usage: bash sandbox/scripts/ralph.sh <issues-dir>
# Intended to run inside the sandbox container — see sandbox/README.md.
#
# Env vars:
#   RALPH_MAX_BUDGET_USD  Per-issue spend cap passed to `claude --max-budget-usd`.
#                         Defaults to 5. Set to 0 or empty to disable the cap.
#   RALPH_MODEL           Model alias or full ID passed to `claude --model`.
#                         Defaults to "sonnet". Set to empty to use claude's default.

set -euo pipefail

MAX_BUDGET=${RALPH_MAX_BUDGET_USD-5}
MODEL=${RALPH_MODEL-sonnet}

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <issues-dir>" >&2
  exit 2
fi

ISSUES_DIR=$(realpath "$1")
if [[ ! -d "$ISSUES_DIR" ]]; then
  echo "error: '$1' is not a directory" >&2
  exit 2
fi

DONE_DIR="$ISSUES_DIR/done"
LOG_DIR="$ISSUES_DIR/.ralph-logs"
mkdir -p "$DONE_DIR" "$LOG_DIR"

shopt -s nullglob
issues=("$ISSUES_DIR"/*.md)
shopt -u nullglob

if [[ ${#issues[@]} -eq 0 ]]; then
  echo "nothing to do — no *.md files in $ISSUES_DIR"
  exit 0
fi

IFS=$'\n' issues=($(printf '%s\n' "${issues[@]}" | sort))
unset IFS

for issue in "${issues[@]}"; do
  name=$(basename "$issue")
  log="$LOG_DIR/${name%.md}.log"

  echo
  echo "==================================================================="
  echo ">>> $(date -Iseconds)  $name"
  echo "==================================================================="

  prompt=$(cat <<EOF
You are implementing one vertical-slice issue end-to-end. The issue spec
follows below. Read it, implement it, then run \`npm test\` and \`npm run lint\`.
Only commit when both are green. Follow CLAUDE.md for conventions. If you hit
a blocker you cannot resolve, stop with a clear summary instead of committing
broken state.

--- ISSUE ---
$(cat "$issue")
EOF
)

  claude_args=(-p --dangerously-skip-permissions)
  if [[ -n "$MODEL" ]]; then
    claude_args+=(--model "$MODEL")
  fi
  if [[ -n "$MAX_BUDGET" && "$MAX_BUDGET" != "0" ]]; then
    claude_args+=(--max-budget-usd "$MAX_BUDGET")
  fi

  set +e
  printf '%s' "$prompt" | claude "${claude_args[@]}" 2>&1 | tee "$log"
  status=${PIPESTATUS[1]}
  set -e

  if [[ $status -ne 0 ]]; then
    echo
    echo "!!! $name failed (exit $status). See $log" >&2
    exit "$status"
  fi

  mv "$issue" "$DONE_DIR/"
  echo "<<< $name done — moved to $DONE_DIR/"
done

echo
echo "All issues processed."