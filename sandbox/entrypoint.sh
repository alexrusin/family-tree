#!/usr/bin/env bash
# Entrypoint for the ralph sandbox container. Prepares credentials, git identity,
# and Linux-native dependencies, then hands off to sandbox/scripts/ralph.sh.
#
# Arguments are forwarded verbatim to ralph.sh (i.e. the <issues-dir>).
set -euo pipefail

# Seed the login token into a container-local copy. We mount the host
# ~/.claude/.credentials.json read-only at /seed; copying it inward lets the CLI
# refresh an expiring OAuth token without ever writing back to the host file.
if [[ -f /seed/.credentials.json ]]; then
  mkdir -p "$HOME/.claude"
  cp /seed/.credentials.json "$HOME/.claude/.credentials.json"
  chmod 600 "$HOME/.claude/.credentials.json"
else
  echo "warning: /seed/.credentials.json not mounted — claude will not be authenticated" >&2
fi

# The mounted repo's .git has foreign ownership; trust it and give the agent a
# commit identity (overridable via GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL).
git config --global --add safe.directory /workspace
git config --global user.name "${GIT_AUTHOR_NAME:-Alex Rusin}"
git config --global user.email "${GIT_AUTHOR_EMAIL:-alexrusin_2000@yahoo.com}"

# Install Linux-native deps into the shadowed node_modules volume on first run.
# (Host node_modules are built for Windows and cannot run here.)
if [[ ! -x node_modules/.bin/vitest ]]; then
  echo ">>> installing dependencies (first run)…"
  npm ci
fi

# Best-effort: tests mock @prisma/client, so a generated client is non-critical.
npx prisma generate || true

# sandbox/scripts/ralph.sh is a tracked file; on a Windows host with
# core.autocrlf=true it is checked out with CRLF line endings, which bash rejects in
# this Linux container. Run a CR-stripped copy so the sandbox works regardless of
# host git settings.
script=$(mktemp)
tr -d '\r' < sandbox/scripts/ralph.sh > "$script"
exec bash "$script" "$@"
