#!/usr/bin/env bash
# Ralph loop: drive `gh copilot -- -p` through a folder of issue specs, one issue per
# fresh context window. Stops on the first failure.
#
# Usage: bash scripts/ralph.sh <issues-dir>
#
# Env vars:
#   RALPH_MODEL           Model alias or full ID passed to `copilot --model`.
#                         Defaults to "claude-sonnet-4.6". Set to empty to use Copilot's default.

set -euo pipefail

# MODEL=${RALPH_MODEL-claude-sonnet-4.6}

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

repo_root=$(git rev-parse --show-toplevel)

for issue in "${issues[@]}"; do
  name=$(basename "$issue")
  log="$LOG_DIR/${name%.md}.log"
  : > "$log"
  before_head=$(git rev-parse HEAD)
  before_status=$(git status --porcelain=v1 --untracked-files=all)

  # Path relative to repo root for the prompt (avoids embedding absolute paths
  # and keeps the single-line prompt portable).
  issue_rel=${issue#"$repo_root"/}

  echo
  echo "==================================================================="
  echo ">>> $(date -Iseconds)  $name"
  echo "==================================================================="

  # IMPORTANT: keep the prompt on a single line. Passing multi-line strings
  # via `-p` through `gh copilot --` (or `copilot` directly) on Windows gets
  # truncated at the first newline — see issues/.ralph-logs/issue-01-*.log
  # where the model only received "The issue spec from" before the rest was
  # lost. Reference the spec by path and let the agent read it from disk.
  prompt="You are implementing one vertical-slice issue end-to-end. Read the spec at $issue_rel (relative to repo root), implement it, then run npm test and npm run lint. Only commit when both are green. Follow the repository instruction files, especially .github/copilot-instructions.md. Work autonomously; if you hit a blocker you cannot resolve, stop with a clear summary instead of committing broken state."

  copilot_args=(-p "$prompt" --allow-all --no-ask-user --silent)
  if [[ -n "$MODEL" ]]; then
    copilot_args+=(--model "$MODEL")
  fi

  set +e
  (cd "$repo_root" && gh copilot -- "${copilot_args[@]}") 2>&1 | tee "$log"
  status=${PIPESTATUS[0]}
  set -e

  if [[ $status -ne 0 ]]; then
    echo
    echo "!!! $name failed (exit $status). See $log" >&2
    exit "$status"
  fi

  after_head=$(git rev-parse HEAD)
  after_status=$(git status --porcelain=v1 --untracked-files=all)

  if [[ "$before_head" == "$after_head" && "$before_status" == "$after_status" ]]; then
    echo
    echo "!!! $name produced no repository changes; leaving it in place. See $log" >&2
    exit 1
  fi

  mv "$issue" "$DONE_DIR/"
  echo "<<< $name done — moved to $DONE_DIR/"
done

echo
echo "All issues processed."
