---
name: uni-events
description: "6 校下周活动预告。**新架构（2026-04-24 起）**：周度频率（每周日跑一次，覆盖下周 Mon-Sun），agent 只写 src/data/uni-events/{下周一 DATE}.json，HTML 由 `bun run build:uni-events` pipeline 渲染。6 校固定：墨大 UMelb / UNSW / UQ / USYD / Adelaide / Monash。设计目标：活动发布频率低，每天跑空耗 API，改为周度预告更有价值。"
argument-hint: "[YYYY-MM-DD 可选 · 下周一的日期 · 默认本周日算出的下周一 AEST]"
---

# /uni-events — 6 校下周活动预告（2026-04-24 重构）

## 🚨 为什么改周度

- 校园活动发布频率**远低于每天**，每天跑 6 校搜索常常返回"本周无公开活动"或重复同一批事件
- 老版本 daily 跑下来 agent 写 ~80KB HTML，既耗 API 又没产出价值
- 改成**每周日跑一次**（AEST 周日 09:00 左右），产出**下周 Mon-Sun** 的活动预告
- 内容角度从"今天有什么"改成"下周要准备什么"，更符合运营节奏

## 🏗 架构

**agent 只写**：`src/data/uni-events/{下周一 DATE}.json`（~8-10 KB，按 `_schemas/uni-events.schema.json`）

**pipeline 产**（`bun run build:uni-events {下周一 DATE}`）:
- `src/static/uni-news-social/events/{下周一 DATE}.html`（6 校并排预告 + xhsDraft）
- `src/static/uni-news-social/events/{下周一 DATE}-covers.html`（6 张小红书封面）

**禁止 agent 碰**：HTML / CSS / html2canvas —— 全部 pipeline 处理。

## 🛠 执行步骤

### Step 0. 算下周一日期 + 去重（AEST 强制）

```bash
# 当前日期（AEST）
TODAY=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}

# 算下周一：TODAY 起最近的下周一
# 例：今天周日 04-26 → 下周一 04-27；今天周三 04-22 → 下周一 04-27
DATE=$(TZ='Australia/Sydney' node -e "
  const today = new Date('$TODAY');
  const dow = today.getDay();  // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToNextMon = (8 - dow) % 7 || 7;
  today.setDate(today.getDate() + daysToNextMon);
  console.log(today.toISOString().slice(0,10));
")

# 去重
if [ -f "src/data/uni-events/${DATE}.json" ] && [[ ! "$*" =~ --force ]]; then
  echo "✅ ${DATE}（下周一）JSON 已产，跳过"
  exit 0
fi
```

### Step 1. 6 校下周活动搜索（并发 6-12 次 WebSearch）

对 **UMelb / UNSW / UQ / USYD / Adelaide / Monash** 6 校，每校搜下周（DATE ~ DATE+6）的**硬活动**（讲座 / networking / market / live music / info session / exhibition）：

| 校 | 官方入口 |
|---|---|
| UMelb | `events.unimelb.edu.au/events`, `umsu.unimelb.edu.au/events` |
| UNSW | `arc.unsw.edu.au/roundhouse/whats-on`, `student.unsw.edu.au/events` |
| UQ | `uqu.com.au/events`, `life.uq.edu.au/events` |
| USYD | `whatson.sydney.edu.au`, `usu.edu.au/events` |
| Adelaide | `adelaide.edu.au/student/news/events`, `auu.org.au/events` |
| Monash | `monash.edu/news/events`, `monashclubs.org/Events/Weekly-Calendar` |

**筛选标准**：
- ✅ 日期在下周 `DATE ~ DATE+6` 内
- ✅ 对留学生友好（免费 / 公开 / 无 member 限制）
- ✅ 有明确时间 + 地点
- ❌ 不选：员工内部活动、博士答辩、收费 >AUD 30

**容忍度**：每校 1-4 条活动。真没活动 → `events: []` + xhsDraft 写"本周校园比较静音 + 推荐自学 / 长周末安排"等 context 型草稿。

### Step 2. 写 `src/data/uni-events/{下周一 DATE}.json`（**唯一产出**）

**严格按 `src/data/_schemas/uni-events.schema.json`**。参考示例：`src/data/uni-events/2026-04-22.json`。

关键字段：
- `date` = 下周一 YYYY-MM-DD
- `schools` **必须 6 项**，code 顺序 **固定**：`umelb → unsw → uq → usyd → adelaide → monash`
- 每校 `events` 0-4 条，`xhsDraft` 必填（即便 events 为空）
- `intro`: 一句话周汇总（≤60 字，带重点活动或节假日提示）

**🚨 JSON 字符串里禁止嵌入 ASCII 双引号 `"`**（会破坏 JSON 结构）。需要中文引号用 `「」`，ASCII 引号用 `\"`。

### Step 3. 敏感词扫描 xhsDraft.body（封号红线）

每校 xhsDraft.body 全部过一遍，禁止出现：
- 品牌 / 域名：`JR Academy` / `匠人学院` / `jracademy.ai` / 任何域名 / 二维码描述
- 引流：`加V` / `VX` / `薇信` / `关注公众号` / `私信领取`
- 绝对化：`最` / `第一` / `唯一` / `100%`
- 教育承诺：`包过` / `保录取` / `稳上`
- AI 味：`首先其次最后` / `值得注意的是` / `综上所述`

### Step 4. 跑 pipeline + 自检

```bash
F=src/data/uni-events/${DATE}.json

# 1. JSON schema
jq empty $F || exit 1
[ "$(jq '.schools | length' $F)" = "6" ] || exit 1
jq -r '.schools[].code' $F | paste -sd, - | grep -q "umelb,unsw,uq,usyd,adelaide,monash" || exit 1

# 2. 封号红线（body + tags 合并扫）
jq -r '.schools[].xhsDraft | (.body // "") + " " + ((.tags // []) | join(" "))' $F | \
  grep -qiE "JR Academy|匠人学院|jiangren\.com|关注公众号|抖音号|加V|VX|薇信|保过|包过" \
  && { echo "❌ 封号红线命中"; exit 1; } || true

# 3. pipeline 渲染
bun run build:uni-events ${DATE} || exit 1

# 4. HTML 产出
[ -f src/static/uni-news-social/events/${DATE}.html ] || exit 1
[ -f src/static/uni-news-social/events/${DATE}-covers.html ] || exit 1
```

## 📋 产出清单

```
src/data/uni-events/{下周一 DATE}.json  ← agent 写（~10KB）

Pipeline 产：
src/static/uni-news-social/events/{下周一 DATE}.html           ← 6 校并排预告
src/static/uni-news-social/events/{下周一 DATE}-covers.html    ← 6 张小红书封面
```

## 🎨 xhsDraft 人性化要求

每校 body 必须：
- 第一人称 + 具体时间（"下周三 04-29 下午 5 点" > "下周某天"）
- 段落长短参差
- emoji 克制（1-2 个）
- 有个人判断（"我觉得这场比上周那场更值得去因为 XX"）
- 结尾互动（"有想一起去的评论区扣 1"）
- 标题 ≤22 字含 emoji
- 长周末 / 公共假日提示（ANZAC Day / Easter 等）

## 🔗 参考

- **Schema**: `src/data/_schemas/uni-events.schema.json`
- **Pipeline**: `build/pipelines/uni-events.pipeline.ts`
- **Templates**: `src/templates/uni-events/events.template.html` + `covers.template.html`
- **Brand**: `src/data/uni-brand.v1.json`（6 校颜色，pipeline 按 code 取）
- **最新示例**: `src/data/uni-events/2026-04-22.json`
- **架构 PRD**: `docs/SCHEDULED_CONTENT_PLATFORM_PRD.md`
