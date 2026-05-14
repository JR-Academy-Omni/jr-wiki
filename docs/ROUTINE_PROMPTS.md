---
title: Routine Prompts (claude.ai/code/scheduled)
date: 2026-04-24
---

# Scheduled Routine Prompts

复制下面 5 段 prompt 到 https://claude.ai/code/scheduled，**每段对应一条 routine**。

## 🚨 为什么有这个文件

2026-04-23 / 04-24 连续 2 天 uni-news routine 静默挂掉，原因是 routine prompt 里写的还是老架构（agent 直接产 HTML），但 repo 里 skill 已经切到新架构（agent 产 JSON + pipeline 渲染）。**routine prompt 不会自动跟着 git commit 走**，必须手动同步。

为避免下次不一致，所有 routine prompt 都集中在这个文件里 —— 改 skill 的同时改这里，复制粘贴到后台即可。

---

## Routine 1 · AI Daily News（每天 09:00 AEST = 23:00 UTC）

**name**: `ai-daily-news`
**cron**: `0 23 * * *` (UTC) = 每天 09:00 AEST
**timeout**: 15 minutes

```
cd /workspace/jr-wiki

DATE=$(TZ='Australia/Sydney' date +%Y-%m-%d)
echo "▶ Running /ai-daily-news for $DATE (AEST)"

# 跑 skill：agent 写 JSON + blog md
/ai-daily-news $DATE

# 自检 + pipeline 渲染 HTML
[ -f src/data/ai-daily/${DATE}.json ] || { echo "❌ JSON 没产"; exit 1; }
[ -f src/content/articles/ai-daily-${DATE}.md ] || { echo "❌ blog md 没产"; exit 1; }
bun run build:ai-daily $DATE || { echo "❌ pipeline 失败"; exit 1; }
[ -f src/static/ai-news-posters/${DATE}/index.html ] || { echo "❌ poster HTML 没产"; exit 1; }
[ -f src/static/ai-news-posters/${DATE}/mp-article.html ] || { echo "❌ mp HTML 没产"; exit 1; }

# 重建 hub index（倒序所有日期卡片）
node scripts/rebuild-ai-news-hub.mjs || { echo "❌ hub 重建失败"; exit 1; }

# 提交本地变更
git add src/data/ai-daily/${DATE}.json \
        src/content/articles/ai-daily-${DATE}.md \
        src/static/ai-news-posters/${DATE}/ \
        src/static/ai-news-posters/index.html

git commit -m "content: AI 日报 ${DATE}" || { echo "✅ 无变更，跳过"; exit 0; }

# Push 带 rebase + 退避重试
# 跟 uni-news / it-daily 等并发 routine 竞争 main 分支，盲重试解不掉。
# 流程：push 失败 → fetch → rebase -X theirs（hub 冲突让 remote 赢）→ 重建 hub → amend → 再 push
# 退避：30s,60s,90s,120s,150s,180s,210s,240s,270s,300s（合计 ~28min）
for i in 1 2 3 4 5 6 7 8 9 10; do
  if git push origin main 2>&1; then
    echo "✅ push 成功 (第 $i 次)"
    exit 0
  fi

  BACKOFF=$((30 * i))
  [ $BACKOFF -gt 300 ] && BACKOFF=300
  echo "⚠️ push #$i 失败 · ${BACKOFF}s 后 rebase + 重建 hub 重试"
  sleep $BACKOFF

  git fetch origin main
  if ! git rebase -X theirs origin/main; then
    echo "❌ rebase 不可恢复 · 放弃"
    git rebase --abort 2>/dev/null
    exit 1
  fi

  # 基于最新 main 重建 hub —— 包含其他 routine 同期推的日期卡片
  node scripts/rebuild-ai-news-hub.mjs
  if ! git diff --quiet src/static/ai-news-posters/index.html; then
    git add src/static/ai-news-posters/index.html
    git commit --amend --no-edit
  fi
done

echo "❌ 10 次（~28min）重试仍 push 不上 · 等下次 cron / 健康检查兜底"
exit 1
```

---

## Routine 2 · Uni News（每天 08:00 AEST = 22:00 UTC，**核心 6 校**轮换 3 所）

**name**: `uni-news-3-schools`
**cron**: `0 22 * * *` (UTC) = 每天 08:00 AEST
**timeout**: 25 minutes

🚨 **池子规则铁律**（2026-04-24 立）：scheduled 只跑核心 6 校（UQ / UMelb / UNSW / USYD / Monash / Adelaide），**永不跑** ANU / RMIT / UTS / UWA —— 用户明确没有那 4 校的发布渠道，跑了就是浪费 API。

```
cd /workspace/jr-wiki

DATE=$(TZ='Australia/Sydney' date +%Y-%m-%d)
echo "▶ Running /uni-news-poster for $DATE (AEST) — 核心 6 校挑 3 所"

# 选 3 校：只在核心 6 校池里挑最久没更新的 3 所
SCHOOLS=$(node -e "
  const fs = require('fs'); const path = require('path');
  const CORE_SIX = ['uq','umelb','unsw','usyd','monash','adelaide'];
  const latest = CORE_SIX.map(s => {
    const dir = 'src/content/universities/' + s;
    if (!fs.existsSync(dir)) return [s, ''];
    const mds = fs.readdirSync(dir).filter(f => f.startsWith('news-'));
    const dates = mds.map(f => f.match(/news-(\d{4}-\d{2}-\d{2})\.md/)?.[1]).filter(Boolean).sort();
    return [s, dates[dates.length-1] || ''];
  });
  latest.sort((a,b) => a[1].localeCompare(b[1]));
  console.log(latest.slice(0,3).map(x=>x[0]).join(' '));
")
echo "▶ 选中今天 3 校 (来自核心 6): $SCHOOLS"

# 防御性断言：池子永远不应该选出 ANU/RMIT/UTS/UWA
for s in $SCHOOLS; do
  case "$s" in
    anu|rmit|uts|uwa) echo "❌ BUG: 池子选出禁用学校 $s，立刻退出"; exit 1 ;;
  esac
done

# 跑 skill 3 次（每校一次）·skill 自己跑 Step 5（pipeline）+ Step 6（hub）
# 2026-05-05 起 skill 里 Step 5/6 已强制 imperative（不跑会 exit 1）
for SCHOOL in $SCHOOLS; do
  echo "▶ 处理 $SCHOOL"
  /uni-news-poster $DATE $SCHOOL || { echo "❌ skill 失败 $SCHOOL"; exit 1; }
done

# 🚨 routine bash 兜底校验（skill 即使返回 0 也再查一遍 4 产物齐全）
# 5 月连续 4 天（05-01/02/03/05）skill 跑完 md+json 就 silent return，导致缺 render 阶段
# 这里发现缺产物就**自动补跑 pipeline + rebuild hub**，不再靠 self-heal
for SCHOOL in $SCHOOLS; do
  OUT=src/static/uni-news-social/${DATE}/${SCHOOL}
  MISSING=0
  for f in xhs-posters.html mp-article.html xhs-drafts.md; do
    [ -f $OUT/$f ] || { echo "⚠️ skill 没产 $OUT/$f · 兜底跑 pipeline"; MISSING=1; }
  done
  [ -f src/content/articles/uni-news-${SCHOOL}-${DATE}.md ] || { echo "⚠️ 缺 blog md $SCHOOL · 兜底跑 pipeline"; MISSING=1; }

  if [ $MISSING -eq 1 ]; then
    bun run build:uni-news $DATE $SCHOOL || { echo "❌ 兜底 pipeline 也失败 $SCHOOL"; exit 1; }
    # 重新校验
    for f in xhs-posters.html mp-article.html xhs-drafts.md; do
      [ -f $OUT/$f ] || { echo "❌ 兜底后仍缺 $OUT/$f"; exit 1; }
    done
    [ -f src/content/articles/uni-news-${SCHOOL}-${DATE}.md ] || { echo "❌ 兜底后仍缺 blog md $SCHOOL"; exit 1; }
    echo "✅ 兜底 pipeline 救回 $SCHOOL"
  fi
done

# rebuild hub（兜底 · skill 应该已跑过，但万一漏了再跑一次幂等的）
node scripts/rebuild-uni-hub.mjs || { echo "❌ rebuild-uni-hub 失败"; exit 1; }

# Commit + push（3 次重试）
git add src/content/universities/*/news-${DATE}.md \
        src/data/uni-news/ \
        src/static/uni-news-social/${DATE}/ \
        src/static/uni-news-social/index.html \
        src/static/uni-news-social/schools/ \
        src/content/articles/uni-news-*-${DATE}.md

git commit -m "content: 大学新闻日报 ${DATE} — $(echo $SCHOOLS | tr ' ' '/')" || { echo "✅ 无变更"; exit 0; }

# Push 带 rebase + 退避重试（防 ai-daily / uni-events / it-daily 并发 push 顶下去）
for i in 1 2 3 4 5 6 7 8 9 10; do
  if git push origin main 2>&1; then
    echo "✅ push 成功 (第 $i 次)"
    exit 0
  fi

  BACKOFF=$((30 * i)); [ $BACKOFF -gt 300 ] && BACKOFF=300
  echo "⚠️ push #$i 失败 · ${BACKOFF}s 后 rebase + 重跑 pipeline 重试"
  sleep $BACKOFF

  git fetch origin main
  if ! git rebase -X theirs origin/main; then
    echo "❌ rebase 不可恢复"; git rebase --abort 2>/dev/null; exit 1
  fi

  # 重跑 pipeline 基于最新 main 重建 hub
  bun run build:uni-news $DATE 2>/dev/null || true
  git add src/static/uni-news-social/index.html src/static/uni-news-social/schools/ 2>/dev/null
  if ! git diff --cached --quiet; then
    git commit --amend --no-edit
  fi
done

echo "❌ 10 次重试仍 push 不上 · 等下次 cron 兜底"
exit 1
```

---

## Routine 3 · Uni Events（每周日 09:00 AEST = 23:00 UTC SAT，6 校下周预告）

**name**: `uni-events-weekly`
**cron**: `0 23 * * 6` (UTC SAT) = 周日 09:00 AEST
**timeout**: 15 minutes

⚠️ **2026-04-24 起从 daily 改为 weekly**。校园活动发布频率低，daily 跑大量空。改成周日跑一次产下周预告（DATE = 下周一）。

```
cd /workspace/jr-wiki

# 当前（周日）→ 算下周一日期
TODAY=$(TZ='Australia/Sydney' date +%Y-%m-%d)
DATE=$(TZ='Australia/Sydney' node -e "
  const today = new Date('$TODAY');
  const dow = today.getDay();
  const daysToNextMon = (8 - dow) % 7 || 7;
  today.setDate(today.getDate() + daysToNextMon);
  console.log(today.toISOString().slice(0,10));
")
echo "▶ Running /uni-events for ${DATE}（下周一 · AEST）"

# 跑 skill：agent 只写 JSON
/uni-events $DATE

# 自检
[ -f src/data/uni-events/${DATE}.json ] || { echo "❌ JSON 没产"; exit 1; }

bun run build:uni-events $DATE || { echo "❌ pipeline 失败"; exit 1; }
[ -f src/static/uni-news-social/events/${DATE}.html ] || { echo "❌ events HTML 没产"; exit 1; }
[ -f src/static/uni-news-social/events/${DATE}-covers.html ] || { echo "❌ covers HTML 没产"; exit 1; }

git add src/data/uni-events/${DATE}.json \
        src/static/uni-news-social/events/${DATE}.html \
        src/static/uni-news-social/events/${DATE}-covers.html \
        src/static/uni-news-social/events/index.html

git commit -m "content: 6 校下周活动预告 ${DATE} (周度版)" || { echo "✅ 无变更"; exit 0; }

# Push 带 rebase + 退避重试
for i in 1 2 3 4 5 6 7 8 9 10; do
  if git push origin main 2>&1; then
    echo "✅ push 成功 (第 $i 次)"
    exit 0
  fi

  BACKOFF=$((30 * i)); [ $BACKOFF -gt 300 ] && BACKOFF=300
  echo "⚠️ push #$i 失败 · ${BACKOFF}s 后 rebase + 重跑 pipeline 重试"
  sleep $BACKOFF

  git fetch origin main
  if ! git rebase -X theirs origin/main; then
    echo "❌ rebase 不可恢复"; git rebase --abort 2>/dev/null; exit 1
  fi

  bun run build:uni-events $DATE 2>/dev/null || true
  git add src/static/uni-news-social/events/index.html 2>/dev/null
  if ! git diff --cached --quiet; then
    git commit --amend --no-edit
  fi
done

echo "❌ 10 次重试仍 push 不上 · 等下次 cron 兜底"
exit 1
```

---

## Routine 4 · Daily Schedule Healthcheck（每天 11:00 AEST = 01:00 UTC）

**name**: `schedule-healthcheck`
**cron**: `0 1 * * *` (UTC) = 每天 11:00 AEST
**timeout**: 5 minutes

每天扫一次：今天的 ai-daily / uni-news 是不是按时产出。挂了立刻在 routine 日志里看到 ❌，避免下次再静默连挂 2 天才发现。

```
cd /workspace/jr-wiki

DATE=$(TZ='Australia/Sydney' date +%Y-%m-%d)
echo "▶ Healthcheck for $DATE (AEST)"

bun run scripts/daily-schedule-healthcheck.ts $DATE
EXIT=$?

if [ $EXIT -ne 0 ]; then
  echo ""
  echo "❌❌ 今天有 routine 挂了。修复路径："
  echo "  1. 看上面的 healthcheck 输出，判断哪条 routine 没产"
  echo "  2. 本地 cd jr-wiki && /uni-news-poster $DATE 或 /ai-daily-news $DATE 手动补"
  echo "  3. 跑完 git push"
  echo "  4. 检查 https://claude.ai/code/scheduled 那条 routine 的最近 3 次运行日志"
  exit 1
fi

echo "✅ 今天所有 routine 都产了"
```

---

## Routine 5 · IT Daily News（每天 09:30 AEST = 23:30 UTC）

**name**: `it-daily-news`
**cron**: `30 23 * * *` (UTC) = 每天 09:30 AEST
**timeout**: 12 minutes

🚨 **2026-04-28 新建**：`articles/?filter=it-daily` chip 一直 0 内容（首页 channel.it 入口预留但没生产管线）。这条补上 IT 认证 / 课程聚合内容，slug 前缀 `it-daily-` 自动触发 articles index 分类。

错开 ai-daily 半小时（避免两条 routine 同时抢 git push）。

```
立即执行下面的 bash 脚本，不要反问、不要征求意见。第一个 tool call 必须是 Bash。
跑完所有步骤后再总结，中间任何一步 exit 1 都直接报错退出，不要尝试"修复"。

cd /workspace/jr-wiki

DATE=$(TZ='Australia/Sydney' date +%Y-%m-%d)
echo "▶ Step 1: Running /it-daily-news for $DATE (AEST)"

# 跑 skill：agent 写 1 篇 markdown（无 JSON、无 pipeline、无海报）
/it-daily-news $DATE

echo "▶ Step 2: Verifying output"
FILE="src/content/articles/it-daily-${DATE}.md"
[ -f "$FILE" ] || { echo "❌ md 没产 $FILE"; exit 1; }

# frontmatter 必填
for k in title description publishDate tags; do
  grep -qE "^${k}:" "$FILE" || { echo "❌ 缺 frontmatter $k"; exit 1; }
done

# tags 含 it-daily 或 it-certs（触发 articles 分类）
grep -qE "^\s*-\s+(it-daily|it-certs)" "$FILE" || { echo "❌ tags 缺 it-daily/it-certs"; exit 1; }

# 至少 3 条新闻 + 链接数 ≥ 新闻数
COUNT=$(grep -cE "^## [0-9]+\." "$FILE")
LINKS=$(grep -cE "\[.+\]\(http" "$FILE")
[ "$COUNT" -ge 3 ] || { echo "❌ 只有 $COUNT 条新闻"; exit 1; }
[ "$LINKS" -ge "$COUNT" ] || { echo "❌ 链接数 $LINKS < 新闻数 $COUNT"; exit 1; }
echo "✅ 自检通过：$COUNT 条新闻 / $LINKS 个来源"

echo "▶ Step 3: Commit + push"
git add "$FILE"
git commit -m "content: IT 认证日报 ${DATE}" || { echo "✅ 无变更，跳过"; exit 0; }

# Push 带 rebase + 退避重试（it-daily 只 commit 1 个 md，无 hub，pure rebase 够）
for i in 1 2 3 4 5 6 7 8 9 10; do
  if git push origin main 2>&1; then
    echo "✅ push 成功 (第 $i 次)"
    exit 0
  fi

  BACKOFF=$((30 * i)); [ $BACKOFF -gt 300 ] && BACKOFF=300
  echo "⚠️ push #$i 失败 · ${BACKOFF}s 后 rebase 重试"
  sleep $BACKOFF

  git fetch origin main
  if ! git rebase origin/main; then
    echo "❌ rebase 冲突 (it-daily md 罕见冲突)"; git rebase --abort 2>/dev/null; exit 1
  fi
done

echo "❌ 10 次重试仍 push 不上 · 等下次 cron 兜底"
exit 1
```

---

## 改 routine 的步骤

1. 改 `.claude/skills/{ai-daily-news,uni-news-poster,uni-events,it-daily-news}.md` 任一文件
2. 改这个 `docs/ROUTINE_PROMPTS.md`（同步更新对应的 routine prompt）
3. `git push`
4. **打开** https://claude.ai/code/scheduled
5. 找到对应 routine，点 Edit，把这个文件里的新 prompt **完整粘贴**进去
6. Save → Run Now 验证一次

不做第 5 步 → routine 还是用老 prompt 跑 → skill 和 prompt 不对齐 → 静默挂掉。
