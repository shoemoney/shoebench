#!/usr/bin/env bash
# PreToolUse hook for the overseer claude -p invocations in full-update.sh.
# Reads the tool input from stdin (JSON) and blocks (exit 2) any Bash
# command that tries to run the long-running benchmark steps. This is a
# belt-and-suspenders guardrail in case Claude tries to sneak through the
# --disallowedTools fence (e.g. via `bash -c "..."`).

input="$(cat)"

# Only inspect Bash tool calls.
tool="$(echo "$input" | sed -n 's/.*"tool_name":"\([^"]*\)".*/\1/p')"
[ "$tool" = "Bash" ] || exit 0

cmd="$(echo "$input" | sed -n 's/.*"command":"\(.*\)","description.*/\1/p')"
[ -n "$cmd" ] || exit 0

# Forbidden patterns. Catch direct calls and bash -c wrappers.
if echo "$cmd" | grep -qE '(bun run (vision|judge|export|all|deploy|quick|free)|run-vision-benchmark|run-judge-benchmark|export-results|git (push|commit|reset|checkout)|cache:wipe|rm .*\.db)'; then
  echo "Blocked by overseer guardrail: '$cmd' is not allowed during fix_error sessions." >&2
  exit 2
fi

exit 0
