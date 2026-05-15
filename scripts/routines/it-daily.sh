#!/usr/bin/env bash
# Finalize step for IT Daily News routine.
#
# Pre-condition: /it-daily-news $DATE slash command 已跑过，产出 1 篇 markdown
# (无 JSON、无 pipeline、无海报)。本脚本：frontmatter 自检 + 链接数自检 + push.
#
# Usage:
#   bash scripts/routines/it-daily.sh [YYYY-MM-DD]
set -euo pipefail

DATE=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}
HERE="$(cd "$(dirname "$0")" && pwd)"

FILE="src/content/articles/it-daily-${DATE}.md"
echo "▶ Finalize IT 日报 ${DATE}"

[ -f "$FILE" ] || { echo "❌ md 没产 $FILE"; exit 1; }

for k in title description publishDate tags; do
  grep -qE "^${k}:" "$FILE" || { echo "❌ 缺 frontmatter ${k}"; exit 1; }
done

grep -qE "^\s*-\s+(it-daily|it-certs)" "$FILE" \
  || { echo "❌ tags 缺 it-daily/it-certs"; exit 1; }

COUNT=$(grep -cE "^## [0-9]+\." "$FILE" || true)
LINKS=$(grep -cE "\[.+\]\(http" "$FILE" || true)
[ "$COUNT" -ge 3 ] || { echo "❌ 只有 $COUNT 条新闻"; exit 1; }
[ "$LINKS" -ge "$COUNT" ] || { echo "❌ 链接数 $LINKS < 新闻数 $COUNT"; exit 1; }
echo "✅ 自检通过：$COUNT 条新闻 / $LINKS 个来源"

git add "$FILE"
if git diff --cached --quiet; then
  echo "✅ 无变更"
  exit 0
fi

git commit -m "content: IT 认证日报 ${DATE}"

# it-daily 只 commit 1 个 md，hub 无关，不需 --rebuild
exec bash "${HERE}/lib/push-with-retry.sh"
