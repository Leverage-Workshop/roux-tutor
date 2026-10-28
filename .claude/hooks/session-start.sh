#!/bin/bash
# Cloud sessions only: make Node 24 the default for every command Claude runs,
# then install dependencies.
#
# The cloud environment's setup script installs Node 24 at /opt/node24, but the
# container's default PATH lists /opt/node22/bin, and Claude's shell never reads
# ~/.bashrc. Lines written to $CLAUDE_ENV_FILE are loaded before each command.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

NODE24_BIN=/opt/node24/bin
if [ ! -x "$NODE24_BIN/node" ]; then
  echo "session-start: $NODE24_BIN/node not found; check the environment's setup script" >&2
  exit 1
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$NODE24_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi
export PATH="$NODE24_BIN:$PATH"

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
npm install --no-audit --no-fund
