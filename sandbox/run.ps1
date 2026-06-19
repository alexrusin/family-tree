# Run sandbox/scripts/ralph.sh inside the sandbox container (PowerShell).
# Git bash / Linux / macOS users: use run.sh instead.
#
# Usage:
#   ./sandbox/run.ps1 <issues-dir>
#
# <issues-dir> is relative to the repo root (the container's working dir is
# /workspace, which is the mounted repo). The first run builds the image.
#
# Example:
#   ./sandbox/run.ps1 issues
$ErrorActionPreference = "Stop"

$composeFile = Join-Path $PSScriptRoot "docker-compose.yaml"
# --build keeps the image in sync with the Dockerfile/entrypoint (near-instant when
# nothing changed, since layers are cached).
docker compose -f $composeFile run --rm --build ralph @args
exit $LASTEXITCODE
