#!/usr/bin/env bash
# Robust git push origin main with rebase + exponential backoff.
#
# Used by 4 daily content routines (ai-daily / uni-news / uni-events / it-daily)
# that race for the same branch. When push fails (non-fast-forward), it:
#   1. fetch origin
#   2. rebase -X theirs origin/main  (hub conflict → remote wins)
#   3. optionally run --rebuild CMD (re-generate hub against new tip)
#   4. optionally restage paths and amend
#   5. retry push with backoff 30s,60s,90s,...300s (capped) + random jitter
#
# Total wait budget: ~28 min over 10 attempts. Cron interval is 24h so this
# is plenty.
#
# Args:
#   --rebuild "CMD"   command string to run after rebase (e.g. "node scripts/rebuild-ai-news-hub.mjs")
#   --restage "PATHS" space-separated paths to `git add` after rebuild
#   --max-attempts N  default 10
#
# Exit codes:
#   0 push succeeded
#   1 push failed after all attempts (or rebase unrecoverable)
set -euo pipefail

REBUILD_CMD=""
RESTAGE_PATHS=""
MAX_ATTEMPTS=10

while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild) REBUILD_CMD="$2"; shift 2 ;;
    --restage) RESTAGE_PATHS="$2"; shift 2 ;;
    --max-attempts) MAX_ATTEMPTS="$2"; shift 2 ;;
    *) echo "❌ push-with-retry: unknown arg: $1" >&2; exit 2 ;;
  esac
done

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  if git push origin main 2>&1; then
    echo "✅ push 成功 (第 $i 次)"
    exit 0
  fi

  BASE=$((30 * i))
  [ $BASE -gt 300 ] && BASE=300
  JITTER=$((RANDOM % 16))
  TOTAL=$((BASE + JITTER))
  echo "⚠️ push #$i 失败 · ${TOTAL}s 后 fetch+rebase 重试 (base=${BASE} jitter=${JITTER})"
  sleep "$TOTAL"

  git fetch origin main
  if ! git rebase -X theirs origin/main; then
    echo "❌ rebase 不可恢复 · 放弃" >&2
    git rebase --abort 2>/dev/null || true
    exit 1
  fi

  if [ -n "$REBUILD_CMD" ]; then
    echo "▶ rebase 后重建：$REBUILD_CMD"
    eval "$REBUILD_CMD" || echo "⚠️ rebuild 出错（不致命，继续）"
  fi

  if [ -n "$RESTAGE_PATHS" ]; then
    # shellcheck disable=SC2086
    git add $RESTAGE_PATHS 2>/dev/null || true
    if ! git diff --cached --quiet; then
      git commit --amend --no-edit
    fi
  fi
done

echo "❌ ${MAX_ATTEMPTS} 次重试仍 push 不上 · 等下次 cron 兜底" >&2
exit 1
