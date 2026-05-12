#!/usr/bin/env bash
# Cron-friendly ShoeBench full update.
#
# Runs each step directly with explicit exit-code checks AND completion
# proof (a file mtime that must advance). On failure, spawns `claude -p`
# scoped to that one step so it can read the actual error from the log,
# apply a targeted fix, and let the wrapper retry. Only commits + pushes
# if every step produced its expected artifact.
#
# Cron example: 0 3 * * * /Users/shoemoney/Projects/shoebench/full-update.sh
# Logs: bench/logs/full-update-YYYYMMDD-HHMMSS.log

set -uo pipefail   # not -e: we manage failures explicitly per-step.

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

export PATH="$HOME/.bun/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if [ -f "$REPO/.env" ]; then
  set -a; . "$REPO/.env"; set +a
fi

LOG_DIR="$REPO/bench/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/full-update-$(date +%Y%m%d-%H%M%S).log"

# Single-instance lock (atomic mkdir, portable across mac+linux).
LOCK="$LOG_DIR/.full-update.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Another full-update is already running, exiting." | tee -a "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
mtime() { stat -f %m "$1" 2>/dev/null || echo 0; }
latest_mtime_in() { find "$1" -type f -name "$2" -print0 2>/dev/null | xargs -0 stat -f %m 2>/dev/null | sort -nr | head -1; }

# Build a transient settings file for the overseer claude -p calls so they
# get a PreToolUse hook that hard-blocks vision:all / judge / export / git.
OVERSEER_SETTINGS="$LOG_DIR/.overseer-settings.json"
cat > "$OVERSEER_SETTINGS" <<JSON
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "$REPO/bench/scripts/overseer-block.sh", "timeout": 3 }
        ]
      }
    ]
  }
}
JSON

# fix_error <error_message> <verify_bash_expr> [max_attempts=5]
#
# Loops calling `claude -p` to fix the issue, re-running the verify
# expression after each attempt. Returns 0 the moment verify passes,
# non-zero if it never does within max_attempts.
#
# Verify is a bash expression evaluated with `eval`; exit 0 = fixed.
# Examples:
#   fix_error "tsc failed" "cd $REPO/bench && bun run typecheck"
#   fix_error "no judge file" "[ \"\$(latest_mtime_in $JDIR '*.json')\" -gt $TS ]"
fix_error() {
  local err_msg="$1" verify="$2" max="${3:-5}"

  if eval "$verify" >/dev/null 2>&1; then
    log "fix_error: already passing, no work needed"
    return 0
  fi

  local prompt_template
  prompt_template="Please fix this error. Do not exit until the expected result is achievable.

ERROR / FAILED STEP:
%s

EXPECTED RESULT (the wrapper will re-check this after you exit):
%s

Authorized fixes (under bench/ or visualizer/ only):
 - TypeScript / runtime errors → edit the offending file.
 - Bad model in vision-constants.ts → add to EXCLUDED_MODELS in
   bench/scripts/update-vision-models.ts (it's regenerated, don't hand-edit).
 - Persistent permanent error on one model → INSERT it into excluded_models
   in bench/cache/vision-cache.db.
 - Missing dep → bun install in the right directory.

Do NOT: run vision:all, judge, export, commit, push, wipe cache, or delete
results JSONs. Do NOT touch .env or anything outside bench/ + visualizer/.
The wrapper handles retries — your job is to remove the cause.

If you cannot fix it safely, print a one-line diagnosis and exit non-zero."

  local i
  for i in $(seq 1 "$max"); do
    log "fix_error attempt $i/$max"
    local prompt
    prompt="$(printf "$prompt_template" "$err_msg" "$verify")"

    # Layered guardrails:
    #  1. --disallowedTools refuses the named bash patterns at the SDK layer.
    #  2. --settings injects a PreToolUse hook that re-checks every Bash
    #     command (catches `bash -c "..."` workarounds).
    #  3. The prompt text reinforces the same boundaries (soft layer).
    claude -p "$prompt" \
      --dangerously-skip-permissions \
      --settings "$OVERSEER_SETTINGS" \
      --disallowedTools \
        "Bash(bun run vision:*)" \
        "Bash(bun run vision)" \
        "Bash(bun run judge)" \
        "Bash(bun run export)" \
        "Bash(bun run all)" \
        "Bash(bun run deploy)" \
        "Bash(bun run quick)" \
        "Bash(bun run free)" \
        "Bash(bun run cache:wipe)" \
        "Bash(git push:*)" \
        "Bash(git commit:*)" \
        >> "$LOG_FILE" 2>&1 || true

    if eval "$verify" >/dev/null 2>&1; then
      log "fix_error: verified fixed on attempt $i"
      return 0
    fi
    log "fix_error: still failing after attempt $i, retrying"
  done

  log "fix_error: gave up after $max attempts"
  return 1
}

# run_step <name> <command> <proof-glob-dir> <proof-glob-pattern> [skip_proof_after_first_attempt]
# Proof: succeeds only if a file matching the glob has mtime > step_start.
run_step() {
  local name="$1" cmd="$2" proof_dir="$3" proof_glob="$4"
  local start_ts before_latest after_latest
  start_ts="$(date +%s)"
  before_latest="$(latest_mtime_in "$proof_dir" "$proof_glob" || echo 0)"
  before_latest="${before_latest:-0}"

  for attempt in 1 2 3; do
    log "RUN [$name] attempt $attempt: $cmd"
    if bash -c "$cmd" >> "$LOG_FILE" 2>&1; then
      after_latest="$(latest_mtime_in "$proof_dir" "$proof_glob" || echo 0)"
      after_latest="${after_latest:-0}"
      if [ "$after_latest" -gt "$before_latest" ]; then
        log "OK   [$name] proof file refreshed in $proof_dir"
        return 0
      else
        log "WARN [$name] exit 0 but no fresh file matching '$proof_glob' in $proof_dir"
      fi
    else
      log "FAIL [$name] non-zero exit on attempt $attempt"
    fi

    if [ "$attempt" -lt 3 ]; then
      local err_tail
      err_tail="$(tail -120 "$LOG_FILE")"
      # The verify expression is "the proof file got refreshed" — but only
      # the wrapper (re-running $cmd) can make that true. So we pass a
      # cheaper verify that fix_error CAN check standalone: that whatever
      # static state Claude touched is at least syntactically valid.
      # Loose verify is fine; the real proof is the next attempt loop.
      fix_error "Step '$name' failed running: $cmd

Recent log:
$err_tail" \
        "true" \
        1 || { log "ABORT [$name] fix_error could not fix"; return 1; }
    fi
  done

  log "ABORT [$name] failed after 3 attempts"
  return 1
}

log "Starting full-update at $REPO"

# 1. Refresh model list. Proof: vision-constants.ts mtime advances.
run_step "update-models" \
  "cd '$REPO/bench' && bun run update-models" \
  "$REPO/bench" \
  "vision-constants.ts" \
  || exit 1

# 2. Run benchmark. Proof: a new vision-results-*.json file appears.
run_step "vision:all" \
  "cd '$REPO/bench' && bun run vision:all" \
  "$REPO/bench/results/vision" \
  "vision-results-*.json" \
  || exit 1

# 3. Judge run. Proof: a new judge results file.
run_step "judge" \
  "cd '$REPO/bench' && bun run judge" \
  "$REPO/bench/results/judge" \
  "*.json" \
  || exit 1

# 4. Export to visualizer. Proof: visualizer/data/shoebench-results.json mtime advances.
run_step "export" \
  "cd '$REPO/bench' && bun run export" \
  "$REPO/visualizer/data" \
  "shoebench-results.json" \
  || exit 1

# 5. Commit + push, only after every step proved completion.
log "All steps proven complete — committing"

cd "$REPO"
git add bench/vision-constants.ts visualizer/data 2>>"$LOG_FILE" || true

if git diff --cached --quiet; then
  log "no changes to commit"
else
  if git commit -m "chore: automated full-update $(date +%Y-%m-%d)" >>"$LOG_FILE" 2>&1; then
    log "commit OK — pushing"
    if git push >>"$LOG_FILE" 2>&1; then
      log "push OK"
    else
      log "push failed"
      exit 1
    fi
  else
    log "commit failed"
    exit 1
  fi
fi

log "full-update complete"
