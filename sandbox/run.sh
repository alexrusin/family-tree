#!/usr/bin/env bash
# Run sandbox/scripts/ralph.sh inside the sandbox container (git bash / Linux / macOS).
#
# Usage:
#   ./sandbox/run.sh <issues-dir>
#
# <issues-dir> is relative to the repo root (the container's working dir is
# /workspace, which is the mounted repo). The first run builds the image.
#
# Example:
#   ./sandbox/run.sh issues
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# --build keeps the image in sync with the Dockerfile/entrypoint (near-instant when
# nothing changed, since layers are cached).
exec docker compose -f "$script_dir/docker-compose.yaml" run --rm --build ralph "$@"
