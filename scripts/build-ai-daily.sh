#!/usr/bin/env bash
set -euo pipefail

# Keep the optional YYYY-MM-DD / --force arguments on the pipeline command.
# Appending them to a package script containing `&&` previously sent them to
# check-generated and caused every historical edition to rebuild.
bun run build/pipelines/ai-daily.pipeline.ts "$@"
node scripts/check-generated.mjs
