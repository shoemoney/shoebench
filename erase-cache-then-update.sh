#!/usr/bin/env bash
# DANGER: wipe the SQLite vision cache and re-run every model × shoe
# combination from scratch. The last full run cost ~$140; expect similar.
set -euo pipefail

cat <<'EOF'

⚠️  WARNING: This will DELETE the vision cache and re-run every model
   from scratch against all 89 shoes.

   - Last full run cost ~$140 in API charges.
   - Excluded-model history will also be cleared, so previously-broken
     models will be re-attempted (and may waste calls before being
     re-excluded).
   - Successful past results are preserved in bench/results/vision/*.json
     and can be re-imported with `cache:backfill` if you change your mind.

EOF

read -r -p "Type 'WIPE' to confirm: " confirm
if [ "$confirm" != "WIPE" ]; then
  echo "Aborted."
  exit 1
fi

cd "$(dirname "$0")/bench"

echo "==> Wiping cache…"
bun run cache:wipe

echo "==> Updating vision model list from OpenRouter…"
bun run update-models

echo "==> Running vision benchmark (full, no cache)…"
bun run vision:all

echo "==> Running judge…"
bun run judge

echo "==> Exporting results to visualizer…"
bun run export

echo "Done."
