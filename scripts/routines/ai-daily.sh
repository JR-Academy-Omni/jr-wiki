#!/usr/bin/env bash
# Finalize step for AI Daily News routine.
#
# Pre-condition: /ai-daily-news $DATE slash command已经在 dashboard prompt 里跑过，
# 产出 src/data/ai-daily/$DATE.json + src/content/articles/ai-daily-$DATE.md。
#
# 本脚本：自检 → 渲染 HTML → 重建 hub → commit → push with retry。
#
# Usage:
#   bash scripts/routines/ai-daily.sh [YYYY-MM-DD]
#   缺省日期 = 今天 (AEST)。
set -euo pipefail

DATE=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Finalize AI 日报 ${DATE}"

# 1. 自检 skill 产物
[ -f "src/data/ai-daily/${DATE}.json" ] || { echo "❌ JSON 没产: src/data/ai-daily/${DATE}.json"; exit 1; }
[ -f "src/content/articles/ai-daily-${DATE}.md" ] || { echo "❌ blog md 没产: src/content/articles/ai-daily-${DATE}.md"; exit 1; }

# 2. pipeline 渲染 HTML
bun run build:ai-daily "$DATE" || { echo "❌ build:ai-daily 失败"; exit 1; }
[ -f "src/static/ai-news-posters/${DATE}/index.html" ] || { echo "❌ poster HTML 没产"; exit 1; }
[ -f "src/static/ai-news-posters/${DATE}/mp-article.html" ] || { echo "❌ mp HTML 没产"; exit 1; }

# 3. 重建 hub
node scripts/rebuild-ai-news-hub.mjs || { echo "❌ rebuild-ai-news-hub 失败"; exit 1; }

# 4. Stage + commit
git add "src/data/ai-daily/${DATE}.json" \
        "src/content/articles/ai-daily-${DATE}.md" \
        "src/static/ai-news-posters/${DATE}/" \
        src/static/ai-news-posters/index.html

if git diff --cached --quiet; then
  echo "✅ 无变更，跳过 commit/push"
  exit 0
fi

git commit -m "content: AI 日报 ${DATE}"

# 5. Push with rebase + 退避重试
exec bash "${HERE}/lib/push-with-retry.sh" \
  --rebuild "node scripts/rebuild-ai-news-hub.mjs" \
  --restage "src/static/ai-news-posters/index.html"
