#!/usr/bin/env bash
# ShoeBench autodeployer — pulls latest from origin/main, installs deps if
# package files changed, tags each successful deploy locally for rollback.
#
# Runs from cron every 5 min. No-op when origin/main is unchanged.
# Each deploy is appended to ~/shoebench/deploy-logs/deploy-TIMESTAMP.log.

set -uo pipefail

REPO="/home/shoemoney/shoebench"
LOG_DIR="$REPO/deploy-logs"
LOCK="$LOG_DIR/.deploy.lock"

mkdir -p "$LOG_DIR"
export PATH="$HOME/.bun/bin:$PATH"

# Single-instance lock (atomic mkdir).
if ! mkdir "$LOCK" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

cd "$REPO" || exit 1

# Quick check before opening a log file (most runs are no-ops).
git fetch --tags --quiet origin main || exit 1
BEFORE=$(git rev-parse HEAD)
TARGET=$(git rev-parse origin/main)
[ "$BEFORE" = "$TARGET" ] && exit 0

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG="$LOG_DIR/deploy-$TIMESTAMP.log"
exec >> "$LOG" 2>&1

echo "=== deploy $TIMESTAMP ==="
echo "before: $BEFORE"
echo "target: $TARGET"

# Refuse if working tree is dirty (someone made hot edits on the box).
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ABORT: working tree dirty"
  exit 1
fi

# Detect what changed so we know which builds to re-run.
BENCH_DEPS_CHANGED=0
VIZ_DEPS_CHANGED=0
VIZ_CHANGED=0
if ! git diff --quiet "$BEFORE" "$TARGET" -- bench/package.json bench/bun.lock; then
  BENCH_DEPS_CHANGED=1
fi
if ! git diff --quiet "$BEFORE" "$TARGET" -- visualizer/package.json visualizer/bun.lock visualizer/package-lock.json; then
  VIZ_DEPS_CHANGED=1
fi
if ! git diff --quiet "$BEFORE" "$TARGET" -- visualizer/; then
  VIZ_CHANGED=1
fi

if ! git pull --ff-only --quiet origin main; then
  echo "ABORT: ff-only pull failed"
  exit 1
fi

AFTER=$(git rev-parse HEAD)
echo "after:  $AFTER"

if [ "$BENCH_DEPS_CHANGED" = "1" ]; then
  echo "bench deps changed — bun install"
  (cd bench && bun install) || { echo "ABORT: bun install failed"; exit 1; }
fi

if [ "$VIZ_CHANGED" = "1" ]; then
  if [ "$VIZ_DEPS_CHANGED" = "1" ]; then
    echo "visualizer deps changed — bun install"
    (cd visualizer && bun install) || { echo "ABORT: visualizer bun install failed"; exit 1; }
  fi
  echo "visualizer files changed — rebuilding static export"
  (cd visualizer && bun run build) || { echo "ABORT: visualizer build failed"; exit 1; }
  # nginx serves visualizer/out/ directly; no reload needed for file changes.
fi

# Local-only deploy tag for easy rollback. Not pushed.
TAG="deploy-$TIMESTAMP"
git tag -f "$TAG" "$AFTER"

echo "OK: deployed $BEFORE -> $AFTER (tag $TAG)"
