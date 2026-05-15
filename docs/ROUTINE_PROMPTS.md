---
title: Routine Prompts (claude.ai/code/scheduled)
date: 2026-05-15
---

# Scheduled Routine Prompts

复制下面 5 段 prompt 到 https://claude.ai/code/scheduled，**每段对应一条 routine**。

## 🚨 为什么这个文件存在 + 为什么 prompt 现在只剩几行

2026-04-23 / 04-24 连续 2 天 uni-news routine 静默挂掉，原因是 routine prompt 里写的还是老架构（agent 直接产 HTML），但 repo 里 skill 已经切到新架构（agent 产 JSON + pipeline 渲染）。

2026-05-13~14 又挂：4 条 routine 并发抢 push，老 prompt 只盲重试 5 次（每次 sleep 10s），50s 内根本绕不过 race，每天 self-heal 兜底。

**2026-05-15 根本修复**：所有重 bash 逻辑（自检 / 渲染 / 提交 / push 重试）抽到 `scripts/routines/*.sh`，dashboard 那条 prompt 只剩"cd + skill + bash script"几行。

好处：
1. 改 push 重试逻辑 / 自检规则 / 兜底逻辑 → 只要 push repo，**下一轮 cron 自动生效**，不用再回 dashboard 粘贴
2. 本地能直接 `bash scripts/routines/ai-daily.sh 2026-05-15` 复现 routine 行为
3. dashboard 那段 prompt 短到不会再写错

⚠️ **只在 routine prompt 第一次落地 / 改 routine "外壳"（cd / skill 调用 / 脚本名）时才需要回 dashboard**。改脚本内部不需要。

---

## Routine 1 · AI Daily News（每天 09:00 AEST = 23:00 UTC）

**name**: `ai-daily-news`
**cron**: `0 23 * * *` (UTC) = 每天 09:00 AEST
**timeout**: 18 minutes（push 重试预算最多 28min，timeout 设宽松）

```
立即执行下面的步骤，不要反问、不要征求意见。

cd /workspace/jr-wiki
DATE=$(TZ='Australia/Sydney' date +%Y-%m-%d)
echo "▶ /ai-daily-news for $DATE (AEST)"

/ai-daily-news $DATE

bash scripts/routines/ai-daily.sh $DATE
```

---

## Routine 2 · Uni News（每天 08:00 AEST = 22:00 UTC，**核心 6 校**轮换 3 所）

**name**: `uni-news-3-schools`
**cron**: `0 22 * * *` (UTC) = 每天 08:00 AEST
**timeout**: 35 minutes

🚨 **池子规则铁律**（2026-04-24 立）：scheduled 只跑核心 6 校（UQ / UMelb / UNSW / USYD / Monash / Adelaide），**永不跑** ANU / RMIT / UTS / UWA。

```
立即执行下面的步骤，不要反问、不要征求意见。

cd /workspace/jr-wiki
DATE=$(TZ='Australia/Sydney' date +%Y-%m-%d)

# 核心 6 校挑最久没更新的 3 所
SCHOOLS=$(node scripts/pick-uni-schools.mjs --date $DATE --count 3)
echo "▶ 选中今天 3 校: $SCHOOLS"

# 对每所跑一次 skill（skill 自己跑 pipeline + hub）
for SCHOOL in $SCHOOLS; do
  echo "▶ 处理 $SCHOOL"
  /uni-news-poster $DATE $SCHOOL
done

bash scripts/routines/uni-news.sh "$DATE" "$SCHOOLS"
```

---

## Routine 3 · Uni Events（每周日 09:00 AEST = 23:00 UTC SAT，6 校下周预告）

**name**: `uni-events-weekly`
**cron**: `0 23 * * 6` (UTC SAT) = 周日 09:00 AEST
**timeout**: 18 minutes

⚠️ **2026-04-24 起从 daily 改为 weekly**。校园活动发布频率低，daily 跑大量空。改成周日跑一次产下周预告（DATE = 下周一）。

```
立即执行下面的步骤，不要反问、不要征求意见。

cd /workspace/jr-wiki

# 算下周一日期
DATE=$(TZ='Australia/Sydney' node -e "
  const today = new Date(); today.setHours(0,0,0,0);
  const dow = today.getDay();
  const daysToNextMon = (8 - dow) % 7 || 7;
  today.setDate(today.getDate() + daysToNextMon);
  console.log(today.toISOString().slice(0,10));
")
echo "▶ /uni-events for ${DATE}（下周一 · AEST）"

/uni-events $DATE

bash scripts/routines/uni-events.sh $DATE
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
**timeout**: 15 minutes

🚨 **2026-04-28 新建**：`articles/?filter=it-daily` chip 一直 0 内容（首页 channel.it 入口预留但没生产管线）。这条补上 IT 认证 / 课程聚合内容，slug 前缀 `it-daily-` 自动触发 articles index 分类。

错开 ai-daily 半小时（避免两条 routine 同时抢 git push）。

```
立即执行下面的步骤，不要反问、不要征求意见。

cd /workspace/jr-wiki
DATE=$(TZ='Australia/Sydney' date +%Y-%m-%d)
echo "▶ /it-daily-news for $DATE (AEST)"

/it-daily-news $DATE

bash scripts/routines/it-daily.sh $DATE
```

---

## 改 routine 的步骤

### 改"脚本内部"（自检 / 渲染 / 提交 / push 重试）

1. 编辑 `scripts/routines/{ai-daily,uni-news,uni-events,it-daily}.sh` 或 `scripts/routines/lib/push-with-retry.sh`
2. 本地跑一遍验证：`bash scripts/routines/ai-daily.sh $(date -j +%Y-%m-%d)`
3. `git push` → 下一轮 cron 自动用上新脚本（不用回 dashboard）

### 改 routine "外壳"（cron 时间 / skill 名 / 调用哪个 script）

1. 改 `.claude/skills/{ai-daily-news,uni-news-poster,uni-events,it-daily-news}.md` 任一文件 + 改这个文件对应的 prompt 段
2. `git push`
3. **打开** https://claude.ai/code/scheduled
4. 找到对应 routine → Edit → 把这个文件里的新 prompt **完整粘贴**进去
5. Save → Run Now 验证一次

### 一次性同步（**今天必做一次**）

`docs/ROUTINE_PROMPTS.md` 这版改完，老 prompt 还在 dashboard 跑着用 5 次盲重试。**5 条 routine 各需要一次性同步**：

| Routine name | Dashboard 操作 |
|---|---|
| `ai-daily-news` | Edit → 粘 Routine 1 段 → Save |
| `uni-news-3-schools` | Edit → 粘 Routine 2 段 → Save |
| `uni-events-weekly` | Edit → 粘 Routine 3 段 → Save |
| `schedule-healthcheck` | (可选 · 无重大变化) |
| `it-daily-news` | Edit → 粘 Routine 5 段 → Save |

同步完之后，每条 routine 跑一次 Run Now 验证没炸。从那以后修脚本只 `git push` 即可。
