#!/usr/bin/env bash
# Finalize step for Uni News routine (核心 6 校挑 3 所).
#
# Pre-condition: /uni-news-poster $DATE $SCHOOL slash command 已在 dashboard prompt
# 里对每所选中校跑过一次。本脚本兜底校验+补跑+commit+push。
#
# Usage:
#   bash scripts/routines/uni-news.sh YYYY-MM-DD "school1 school2 school3"
set -euo pipefail

DATE=${1:?"DATE required (YYYY-MM-DD)"}
SCHOOLS=${2:?"SCHOOLS required (space-separated)"}
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Finalize 大学新闻 ${DATE} (schools: ${SCHOOLS})"

# 防御性断言：池子永远不应该选出 ANU/RMIT/UTS/UWA
for s in $SCHOOLS; do
  case "$s" in
    anu|rmit|uts|uwa) echo "❌ BUG: 池子选出禁用学校 $s"; exit 1 ;;
  esac
done

# 兜底校验：skill 即使返回 0 也再查一遍 4 产物齐全 + 缺则自动补跑 pipeline
for SCHOOL in $SCHOOLS; do
  OUT="src/static/uni-news-social/${DATE}/${SCHOOL}"
  MISSING=0
  for f in xhs-posters.html mp-article.html xhs-drafts.md; do
    [ -f "${OUT}/${f}" ] || { echo "⚠️ skill 没产 ${OUT}/${f} · 兜底跑 pipeline"; MISSING=1; }
  done
  [ -f "src/content/articles/uni-news-${SCHOOL}-${DATE}.md" ] \
    || { echo "⚠️ 缺 blog md ${SCHOOL} · 兜底跑 pipeline"; MISSING=1; }

  if [ $MISSING -eq 1 ]; then
    bun run build:uni-news "$DATE" "$SCHOOL" \
      || { echo "❌ 兜底 pipeline 也失败 ${SCHOOL}"; exit 1; }
    for f in xhs-posters.html mp-article.html xhs-drafts.md; do
      [ -f "${OUT}/${f}" ] || { echo "❌ 兜底后仍缺 ${OUT}/${f}"; exit 1; }
    done
    [ -f "src/content/articles/uni-news-${SCHOOL}-${DATE}.md" ] \
      || { echo "❌ 兜底后仍缺 blog md ${SCHOOL}"; exit 1; }
    echo "✅ 兜底 pipeline 救回 ${SCHOOL}"
  fi
done

# rebuild hub（幂等）
node scripts/rebuild-uni-hub.mjs || { echo "❌ rebuild-uni-hub 失败"; exit 1; }

# Stage + commit
git add src/content/universities/*/news-${DATE}.md \
        src/data/uni-news/ \
        "src/static/uni-news-social/${DATE}/" \
        src/static/uni-news-social/index.html \
        src/static/uni-news-social/schools/ \
        src/content/articles/uni-news-*-${DATE}.md 2>/dev/null || true

if git diff --cached --quiet; then
  echo "✅ 无变更"
  exit 0
fi

SCHOOLS_TAG=$(echo "$SCHOOLS" | tr ' ' '/')
git commit -m "content: 大学新闻日报 ${DATE} — ${SCHOOLS_TAG}"

# Push with retry（rebuild = 重跑 build 重建 hub）
exec bash "${HERE}/lib/push-with-retry.sh" \
  --rebuild "node scripts/rebuild-uni-hub.mjs" \
  --restage "src/static/uni-news-social/index.html src/static/uni-news-social/schools/"
