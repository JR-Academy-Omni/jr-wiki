---
name: ai-daily-news
description: "追踪当天 AI 五大热点。**新架构（2026-04-24 起）**：agent 只写 src/data/ai-daily/{DATE}.json（~15KB）+ src/content/articles/ai-daily-{DATE}.md（blog 长文），HTML 海报 + 公众号页由 `bun run build:ai-daily` pipeline 渲染。设计目标：把 agent 产出从 300KB+ HTML 压到 < 25KB，规避 Stream idle timeout。"
argument-hint: "[YYYY-MM-DD 可选，默认今天 AEST]"
---

# /ai-daily-news — 数据驱动版（2026-04-24 重构）

## 🚨 为什么用新架构

**老架构**：agent 手写 228KB HTML（poster 库 + mp-article 全 inline style + html2canvas 代码）。routine 执行 10-20 分钟，经常撞 `Stream idle timeout`。

**新架构**：
- agent 只写 **一份 JSON**（~15KB）+ **一份 blog markdown**（~8KB）
- HTML 由 `bun run build:ai-daily {DATE}` pipeline 生成（读 JSON → 渲染模板 → 出 poster 薄壳 + mp-article 薄壳）
- routine 执行 3-5 分钟，基本不会 timeout

**禁止 agent 碰**：HTML / inline style / poster-renderer.js / mp-inline.js / MP_INLINE_STYLES —— 这些全部由 template + pipeline 处理。

## 🛠 执行步骤

### Step 0. 日期（AEST 强制）

```bash
DATE=${1:-$(TZ='Australia/Brisbane' date +%Y-%m-%d)}
# 去重
if [ -f "src/data/ai-daily/${DATE}.json" ]; then
  echo "✅ ${DATE} JSON 已产，跳过（--force 覆盖）"
  [[ ! "$*" =~ --force ]] && exit 0
fi
```

⚠️ 调度器跑在 UTC，**必须** TZ='Australia/Brisbane'。

### Step 1. 复用当天早间 AI 选题；仅在没有结果时搜索

先读取 `/Users/lightman/Documents/sites/jr-academy-ai/output/ai-news/{DATE}/` 和 automation memory。当天已有候选排名、入选事件或 `NO_STORY_CANDIDATE` 时，直接复用同一批候选，不得为了文章另开一轮搜索或评分。只有当天早间没有任何选题结果，且当前仍是 Australia/Brisbane 12:00 前，才执行下面的搜索。

搜索模式（8 轮 parallel WebSearch）：

```
1. "AI news today {date}"
2. "OpenAI OR Anthropic OR Google AI {date}"
3. "AI startup funding {date}"
4. "LLM model release {date}"
5. "AI regulation policy {date}"
6. "人工智能 今日新闻 {date}"
7. "AWS OR Azure OR GCP certification {date}"
8. "free IT course OR free AI course {date}"
```

优先源：TechCrunch / The Verge / Bloomberg / Reuters / 36氪 / 机器之心 / Hacker News / OpenAI Blog / Anthropic Blog。

### Step 2. 筛 3-5 条真正有变化的 AI 新闻

组合原则：影响力 + 新鲜度（当天或前一天）+ 实用性。去重（同一件事不同媒体算一条）。不为凑数加入课程促销、普通产品营销、传闻或只有公司自述而没有独立报道的内容。网站文章不要求视频素材通过，但必须有一手原文和独立可信报道。

### Step 3. 写 `src/data/ai-daily/{DATE}.json`（主产出 · 精简版）

**🚨 2026-04-27 精简（规避 CCR stream timeout）**：JSON 输出体积从 ~30KB 砍到 ~7KB。pipeline 已能自动从 `.md` 文件抓深度段、从 summary 派生 lead/quickview/cta。**agent 只写下面列出的 essential 字段**，**所有"省"的字段都禁止写**。

**必写 essential**：
- `date` = "{DATE}"
- `summary.hook`: textToken[]
- `summary.sub`: 字符串
- `summary.items`: **3-7 项**（不必凑 5）`[{num,cat,numColor,t}]`
- `news`: **3-7 项**（不必凑 5），每项：
  - `slug` (^\d{2}-[a-z0-9-]+$)
  - `idx` (^\d{2}$)
  - `catText` (≤10字)
  - `accent` (^#[0-9a-fA-F]{6}$)
  - `bg`: {top, mid, bot, topRight}
  - `title`: textToken[]
  - `oneline`: textToken[]
  - `bullets`: 3 项 `{k,v}` (k 推荐"发生了什么/为什么重要/对你的影响"但不强制 enum，v 短一点 ≤80 字 — 海报字号舒服)
  - `src`: 字符串 例 "📎 a.com · b.com"
  - `sourceEvidence`: 至少 2 项，必须同时包含：
    - 一项 `type: "primary"`，保存 `publisher`、原始 `url`、这段证据支撑的 `claim`、逐字 `quote`
    - 一项 `type: "independent"`，保存独立媒体的 `publisher`、`url`、`claim`、逐字 `quote`
- `mp.title`: 公众号标题（不带日期，不带 "AI 日报" 前缀）

**禁写（pipeline 自动派生 / .md 抓）**：
- ❌ `news[].mp.*`（paragraphs/h2/sourceHtml 全部 pipeline 从 .md 抓 / 从 title/src 派生）
- ❌ `news[].sources`（由 `sourceEvidence` 取代）
- ❌ `news[].tags` / `news[].frameLabel`（装饰字段不用）
- ❌ `mp.lead`（auto-derive）
- ❌ `mp.newsBodies`（pipeline 从 .md 抓）
- ❌ `mp.quickview`（auto-derive）
- ❌ `mp.cta`（默认值已 OK）
- ❌ `articleUrl` / `schemaVersion` / `theme`（pipeline 默认值）

**🚨 JSON 字符串里禁止嵌入 ASCII 双引号 `"`** — 用 `「」` 或 `\"` 转义。

参考样例：`src/data/ai-daily/2026-04-25.json`（仍是老格式但够用作 schema 参考）。

### Step 4. 写 `src/content/articles/ai-daily-{DATE}.md`（/blog/ 长文）

frontmatter + 3-5 条新闻各 350-600 字正文。只写 `sourceEvidence` 能支撑的事实；数字、日期、型号、价格、可用地区和排名缺逐字证据就删。每条末尾列一手来源与独立报道，并明确尚未确定的边界。格式参考 `src/content/articles/ai-daily-2026-04-23.md`。

### Step 5. 跑 pipeline + 自检

```bash
# 1. JSON 与证据验证
jq empty src/data/ai-daily/${DATE}.json || exit 1
[ "$(jq '.news | length' src/data/ai-daily/${DATE}.json)" -ge "3" ] || exit 1
jq -e '(.summary.items | length) == (.news | length)' src/data/ai-daily/${DATE}.json >/dev/null || exit 1
jq -e 'all(.news[]; ([.sourceEvidence[]? | select(.type == "primary" and (.quote | length > 0))] | length) >= 1 and ([.sourceEvidence[]? | select(.type == "independent" and (.quote | length > 0))] | length) >= 1)' src/data/ai-daily/${DATE}.json >/dev/null || exit 1

# 2. pipeline 渲染 HTML
bun run build:ai-daily ${DATE} || exit 1

# 3. 确认 HTML 产出
[ -f src/static/ai-news-posters/${DATE}/index.html ] || exit 1
[ -f src/static/ai-news-posters/${DATE}/mp-article.html ] || exit 1
```

任一自检不过 → `exit 1`，routine 不 commit。

## 🎯 内容规则（Anti-AI + 深度）

**🚨 标题铁律（2026-04-27 用户明确）**：
- ❌ 禁止 `AI 日报 2026-04-27：xxx` —— 不要带"AI 日报"前缀，不要带日期
- ❌ 禁止 `2026-04-27 AI 日报：xxx`
- ✅ 直接用 5 条新闻关键词拼，例：`GPT-5.5 上线 / Nvidia 5T 市值 / Google TPU v8 拆训推 / 腾讯阿里抢 DeepSeek / 白宫覆盖各州 AI 法`
- 适用：md frontmatter `title:` 字段 + JSON `mp.title` 字段 都不带日期前缀
- 理由：日期已在 URL（`/blog/ai-daily-2026-04-27`）+ publishDate 字段，标题再写一遍冗余且毁 SEO

**禁词**：值得注意的是、总的来说、此外、综上所述、不可否认、至关重要、旨在、使得/使其、进行了、作为一个、与此同时

**替换**：
- "此外" → "还有个事"、直接换段
- "使得" → "让"
- "具有重要意义" → 说具体为什么重要
- "进行了优化" → "优化了"

**加人味**：长短句交替 / 偶尔短句单独成段 / 具体数据代替"大量""显著" / 第一人称判断

**每条新闻深度**（至少 2 项）：技术拆解 / 行业影响 / 实操建议 / 历史对比 / 争议风险

## 📋 产出清单

```
src/data/ai-daily/{DATE}.json                     ← agent 产（15KB 左右）
src/content/articles/ai-daily-{DATE}.md           ← agent 产（8KB 左右）

Pipeline 产：
src/static/ai-news-posters/{DATE}/index.html      ← 海报库薄壳
src/static/ai-news-posters/{DATE}/mp-article.html ← 公众号发稿页
```

## 🔗 参考

- **Schema**: `src/data/_schemas/ai-daily.schema.json`
- **Pipeline**: `build/pipelines/ai-daily.pipeline.ts`
- **Templates**: `src/templates/xhs-poster/ai-daily.template.html`, `src/templates/mp-article/ai-daily.template.html`
- **最新示例**: `src/data/ai-daily/2026-04-23.json`
- **架构 PRD**: `docs/SCHEDULED_CONTENT_PLATFORM_PRD.md`
