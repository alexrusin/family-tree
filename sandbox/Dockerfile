# Sandbox image for running sandbox/scripts/ralph.sh (which calls
# `claude -p --dangerously-skip-permissions`) inside an isolated container.
#
# Debian-slim (not the app's Alpine) is used on purpose: the autonomous agent may
# invoke arbitrary tooling and build native deps, which is friendlier under glibc.
FROM node:24-bookworm-slim

# git: the agent commits its work. ca-certificates: TLS to the Claude API / npm.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# The Claude Code CLI.
RUN npm install -g @anthropic-ai/claude-code

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /workspace

# Pre-create the node_modules mountpoint owned by the non-root `node` user so the
# named volume layered here (see docker-compose.yaml) initializes node-owned and
# `npm ci` can write to it.
RUN mkdir -p /workspace/node_modules && chown node:node /workspace/node_modules

COPY entrypoint.sh /usr/local/bin/sandbox-entrypoint.sh
RUN chmod +x /usr/local/bin/sandbox-entrypoint.sh

USER node

ENTRYPOINT ["/usr/local/bin/sandbox-entrypoint.sh"]
