# Ralph sandbox

Runs [`scripts/ralph.sh`](scripts/ralph.sh) — which drives
`claude -p --dangerously-skip-permissions` over a folder of issue specs — inside a
Docker container instead of directly on your machine.

## Why

`--dangerously-skip-permissions` lets the agent act without approval prompts. On the
host that means it can touch **any** file you can. In the container the only writable
host surface is **this repo**, so the blast radius is confined to the project.

## Usage

```bash
# git bash / Linux / macOS — <issues-dir> is relative to the repo root.
./sandbox/run.sh issues
```

```powershell
# PowerShell
./sandbox/run.ps1 issues
```

The first run builds the image and runs `npm ci` into a Linux-native `node_modules`
volume (your host `node_modules` is left untouched). Subsequent runs reuse both.

ralph.sh processes each `*.md` in the issues dir, moves finished ones into
`<issues-dir>/done/`, and writes logs to `<issues-dir>/.ralph-logs/`. Because the repo
is bind-mounted, all commits, moved files, and logs appear on the host.

### Tunables

Passed straight through to `ralph.sh` (set them in your shell before running):

| Env var                | Default | Meaning                                  |
| ---------------------- | ------- | ---------------------------------------- |
| `RALPH_MODEL`          | `sonnet`| Model passed to `claude --model`.        |
| `RALPH_MAX_BUDGET_USD` | `5`     | Per-issue spend cap. `0`/empty disables. |
| `GIT_AUTHOR_NAME`      | Alex Rusin | Commit author name.                   |
| `GIT_AUTHOR_EMAIL`     | (Alex's email) | Commit author email.             |

## Authentication

Your existing login is reused by mounting **only** `~/.claude/.credentials.json`
(read-only). The entrypoint copies it to the container's own `~/.claude` so an expiring
OAuth token can refresh inside the container without writing back to the host. Nothing
else from `~/.claude` (settings, history, memory, skills) is exposed.

If the token has expired, refresh it by running `claude` once on the host, then re-run.

## Safety model

- **Filesystem:** confined to the mounted repo (`/workspace`) plus the read-only
  credential file. The rest of the host is unreachable.
- **User:** runs as the non-root `node` user inside the container.
- **Network:** open outbound (the Claude API needs it). Note the residual caveat — with
  network open and the repo's `.git` mounted, the agent *could* `git push`. ralph.sh
  never pushes, and the prompt tells the agent only to commit, but this is not
  technically blocked. Lock down egress if you need that guarantee.

## Smoke test

```powershell
docker compose -f sandbox/docker-compose.yaml run --rm --entrypoint bash ralph -lc "claude --version && git --version && node --version"
```
