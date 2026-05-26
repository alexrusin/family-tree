#!/usr/bin/env bash
# Ralph loop: drive `gh copilot -- -p` through a folder of issue specs, one issue per
# fresh context window. Stops on the first failure.
#
# Usage: bash scripts/ralph.sh <issues-dir>
#
# Env vars:
#   RALPH_MODEL           Model alias or full ID passed to `copilot --model`.
#                         Defaults to "gpt-5.3-codex". Set to empty to use Copilot's default.

set -euo pipefail

MODEL=${RALPH_MODEL-gpt-5.3-codex}

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
Only commit when both are green. Follow the repository instruction files,
especially \`.github/copilot-instructions.md\`. Work autonomously; if you hit
a blocker you cannot resolve, stop with a clear summary instead of committing
broken state.

--- ISSUE ---
$(cat "$issue")
EOF
)

  copilot_args=(-p "$prompt" --allow-all --no-ask-user --silent)
  if [[ -n "$MODEL" ]]; then
    copilot_args+=(--model "$MODEL")
  fi

  set +e
  gh copilot -- "${copilot_args[@]}" 2>&1 | tee "$log"
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
