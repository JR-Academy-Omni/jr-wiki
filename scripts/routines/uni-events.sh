#!/usr/bin/env bash
# Finalize step for Uni Events routine (周日产下周一日期的 events).
#
# Pre-condition: /uni-events $DATE slash command 已在 prompt 里跑过，产出
# src/data/uni-events/$DATE.json。
#
# Usage:
#   bash scripts/routines/uni-events.sh YYYY-MM-DD   # date = 下周一
set -euo pipefail

DATE=${1:?"DATE required (YYYY-MM-DD, 下周一)"}
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Finalize 大学下周活动 ${DATE}"

# 自检 skill 产物
[ -f "src/data/uni-events/${DATE}.json" ] || { echo "❌ JSON 没产"; exit 1; }

# pipeline
bun run build:uni-events "$DATE" || { echo "❌ build:uni-events 失败"; exit 1; }
[ -f "src/static/uni-news-social/events/${DATE}.html" ] || { echo "❌ events HTML 没产"; exit 1; }
[ -f "src/static/uni-news-social/events/${DATE}-covers.html" ] || { echo "❌ covers HTML 没产"; exit 1; }

# Stage + commit
git add "src/data/uni-events/${DATE}.json" \
        "src/static/uni-news-social/events/${DATE}.html" \
        "src/static/uni-news-social/events/${DATE}-covers.html" \
        src/static/uni-news-social/events/index.html

if git diff --cached --quiet; then
  echo "✅ 无变更"
  exit 0
fi

git commit -m "content: 6 校下周活动预告 ${DATE} (周度版)"

exec bash "${HERE}/lib/push-with-retry.sh" \
  --rebuild "bun run build:uni-events ${DATE}" \
  --restage "src/static/uni-news-social/events/index.html"
