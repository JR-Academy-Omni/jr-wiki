# Scheduled Content Platform — 重构 PRD

> **文档级别**：架构级（P0）
> **起草日期**：2026-04-23
> **作者**：Claude + Airbotix
> **状态**：Draft，待评审
> **影响范围**：jr-wiki 所有定时内容 pipeline（AI Daily / Uni News / Uni Events / Wiki Book / 未来新增）

---

## 1. 背景

jr-wiki 目前承载了 4 条主力定时内容 pipeline（2026-04 盘点）：

| Pipeline | 产出 | 频率 | 当前问题 |
|---|---|---|---|
| AI Daily News | 1 合集海报 + 5 单图海报 + mp-article + daily brief + 原创 blog | 每日 | index.html 228KB，agent 读模板要 228KB context |
| Uni News (6 校) | 每校 xhs-posters (5 图) + mp-article + xhs-drafts + news md | 每日 3 校 | 每校 3 文件 × 3 校 = 9 文件/天，冲 push 冲突 |
| Uni Events (6 校) | 合集 events.html + covers.html | 每日 | 6 校 activities 聚合到一个 HTML，不灵活 |
| Wiki Book | 5 章 markdown | 每周 | 无大问题，但没跟平台架构对齐 |

**用户后续还会不断加新 schedule**（Bootcamp 招生海报、Job 市场周报、SEO 报告、面试题库更新 …），当前架构扩展成本高、维护成本也高。

---

## 2. 问题陈述

### 2.1 架构层面

**A. 数据、模板、样式强耦合**
- 每日 HTML（228KB）里 95% 是样板 CSS + Canvas 渲染代码，5% 是当日真实数据
- 视觉调整要改 N 个历史 HTML；新增样式变体要整文件重写

**B. Agent context 爆炸**
- cron agent 复制"昨天的 HTML 作模板"→ 读 228KB context burn
- 4 个 skill 文件 + 模板 + 写入，单次 run 一度超 150K tokens，跑 60-120min

**C. Hub 手动维护**
- 每次 agent 都要 grep `<!-- NEWEST-ENTRIES-ABOVE -->` 注释找插入点
- hub/index.html 以后会长到几千行，browser 也崩

**D. 多 schedule push 撞车**
- 22:00 UTC Uni News → 23:03 UTC AI Daily，时间窗 60min 不够，两边 rebase 互扯
- 已把 AI Daily 移到 02:00 UTC 缓解，但根因是单次 run 太重

### 2.2 内容层面

**E. 文字溢出**
- Poster 固定 1242×1660，文字长一点就裁/溢出（Canvas 2D 方案部分缓解但没完全解）
- 标题 2 行放不下、bullet 超 3 行被吞

**F. Channel 混杂**
- XHS 小红书、微信公众号、网站博客、SEO 爬虫、运营后台 —— 每个 channel 对同一份内容的需求不同
- 现在是 agent 每次"重复产出"多个渠道的文件，逻辑散乱

### 2.3 扩展层面

**G. 新加 schedule 成本高**
- 当前加一条新 schedule = 新写 1 个 skill + 1 个 cron prompt + 从零复制一套 HTML 模板
- 耗时 3-5 天

**H. 分页 / 搜索 / 归档**
- 无分页 → hub 页以后卡死
- 无搜索 → 用户找不到历史内容
- 无归档 → 所有内容平铺在一起

---

## 3. 目标 / 非目标

### 3.1 目标

1. **Agent 每次写入 ≤ 10KB**（数据 + 薄壳 HTML），context 消耗降 90%
2. **新增 schedule < 1 天**（只需 1 份 data schema + 1 份 template + 1 行 pipeline 注册）
3. **视觉调整改一处生效全局**（除非某天显式 override）
4. **支持分页 / 按月归档 / 搜索**
5. **Flex-height 彻底解决文字溢出**（content 越长 canvas 越高，3 档比例档位兜底）
6. **多 channel 统一建模**：同一份 data 可输出 XHS / mp / blog / RSS 多种 channel
7. **老内容原样保留**（用户明确要求）
8. **Git 体积控制**：每月增长 < 1MB（当前 10MB）

### 3.2 非目标

- ❌ 不改动 2026-04-21 之前的老 HTML / md 内容
- ❌ 不换构建工具链（Astro / Bun 保持）
- ❌ 不改 MongoDB sync 机制（CI workflow 不动）
- ❌ 不重写 skills-data-manager 同步 pipeline
- ❌ 不上 CMS / Admin UI（留给 v2）
- ❌ 不纯 data-driven（HTML 骨架保留，允许某天定制）

---

## 4. 核心设计原则

### 4.1 分层：Data / Template / Output

```
┌─────────────────────────────────────────────────────────────┐
│  Channel Output Layer                                        │
│  static/{type}/{DATE}/index.html  (XHS poster 薄壳)          │
│  static/{type}/{DATE}/mp-article.html  (公众号长文)          │
│  content/articles/*.md  (博客 / Astro)                       │
│  rss.xml / sitemap.xml (SEO / 订阅)                          │
└─────────────────────────────────────────────────────────────┘
                           ↑ 按 channel 渲染
┌─────────────────────────────────────────────────────────────┐
│  Template Layer (templates/{channel}/{type}.html.ejs)        │
│  + Shared Runtime (_lib/*.css, _lib/*.js)                    │
└─────────────────────────────────────────────────────────────┘
                           ↑ 读数据套模板
┌─────────────────────────────────────────────────────────────┐
│  Data Layer (data/{type}/{DATE}.json)                        │
│  + Schema (data/_schemas/{type}.schema.json)                 │
└─────────────────────────────────────────────────────────────┘
                           ↑ Agent 只写这一层
```

### 4.2 Channel 一等公民

同一份 data 对应多个 channel：

| Channel | 目的 | 输出格式 | 入口 URL |
|---|---|---|---|
| **xhs-poster** | 小红书 5 图 carousel | `static/{type}/{DATE}/index.html` | `/ai-news-posters/2026-04-23/` |
| **mp-article** | 公众号长文（inline style） | `static/{type}/{DATE}/mp-article.html` | `.../mp-article.html` |
| **blog** | 网站博客（Astro SSG） | `content/articles/{slug}.md` + Astro 渲染 | `jracademy.ai/blog/...` |
| **rss** | 订阅推送 | `rss.xml` | `/feed.xml` |
| **sitemap** | Google 索引 | `sitemap.xml` | `/sitemap.xml` |
| **api** (v2) | 对 jr-academy 暴露原始数据 | JSON endpoint | `/api/...` |
| **dashboard** (v2) | 运营预览/审批 | jr-academy-admin | `/content-ops` |

Agent 写一份 JSON data，build 脚本自动扇出到需要的 channel。

### 4.3 Pipeline 解耦

每种 content type 一个独立 pipeline，互不影响：

```
build/pipelines/
├── ai-daily.pipeline.ts        # AI 日报
├── uni-news.pipeline.ts        # 大学新闻
├── uni-events.pipeline.ts      # 大学活动
├── wiki-book.pipeline.ts       # Wiki 电子书
└── _base.pipeline.ts            # 共享基类（data validation / template render）
```

新 schedule = 新 pipeline 文件 + 注册到 `build.ts`。

---

## 5. 目录结构（新版）

```
jr-wiki/
├── src/
│   ├── data/                              # 🆕 数据层（Agent 写入点）
│   │   ├── ai-daily/
│   │   │   ├── 2026-04-23.json            # 当日 5 条新闻的纯数据
│   │   │   └── _index.json                # 所有日期自动索引
│   │   ├── uni-news/
│   │   │   └── {school}/
│   │   │       └── 2026-04-23.json
│   │   ├── uni-events/
│   │   │   └── 2026-04-23.json
│   │   └── _schemas/                       # JSON Schema 校验
│   │       ├── ai-daily.schema.json
│   │       ├── uni-news.schema.json
│   │       └── uni-events.schema.json
│   │
│   ├── content/                            # 长文 markdown（Astro 原生，不动）
│   │   ├── articles/
│   │   ├── wiki/
│   │   └── universities/
│   │
│   ├── templates/                          # 🆕 模板层
│   │   ├── xhs-poster/
│   │   │   ├── ai-daily.html.ejs           # 30 行骨架
│   │   │   ├── uni-news.html.ejs
│   │   │   ├── uni-events.html.ejs
│   │   │   └── _base.ejs                   # 公共 <head> / scripts
│   │   ├── mp-article/
│   │   │   ├── ai-daily.html.ejs
│   │   │   └── uni-news.html.ejs
│   │   └── hub/
│   │       ├── landing.html.ejs            # 最新 10 条
│   │       ├── archive-month.html.ejs      # 按月分页
│   │       └── archive-year.html.ejs       # 按年索引
│   │
│   └── static/
│       ├── _lib/                           # 🔁 扩展共享 runtime
│       │   ├── poster.v2.css               # Neo-Brutalism 样式
│       │   ├── poster-renderer.v2.js       # Canvas + flex-height
│       │   ├── mp-inline.v1.js             # 公众号 inline 注入
│       │   ├── page-controls.v1.js         # 下载按钮/缩略导航
│       │   └── hub-search.v1.js            # hub 前端搜索
│       ├── ai-news-posters/                # 🔁 渐进迁移
│       │   ├── _template/                   # 薄壳模板参考
│       │   ├── 2026-04-23/                  # 新架构：30-50 行骨架
│       │   │   ├── index.html
│       │   │   └── mp-article.html
│       │   ├── 2026-04-18/                  # 老架构（不动）
│       │   └── archive/                     # 🆕 自动生成的分页
│       ├── uni-news-social/                # 同上
│       └── uni-news-social/events/         # 同上
│
├── build/                                  # 🆕 构建 pipeline
│   ├── pipelines/
│   │   ├── ai-daily.pipeline.ts
│   │   ├── uni-news.pipeline.ts
│   │   ├── uni-events.pipeline.ts
│   │   └── _base.pipeline.ts
│   ├── hub-builder.ts                      # 扫目录生成分页 hub
│   ├── sitemap.ts                          # 生成 sitemap.xml
│   ├── rss.ts                              # 生成 rss.xml
│   └── validate-data.ts                    # JSON Schema 校验
│
├── docs/
│   ├── SCHEDULED_CONTENT_PLATFORM_PRD.md   # 本文档
│   └── UNI_NEWS_AUTOMATION_PRD.md          # 旧 PRD
│
└── build.ts                                # 🔁 扩展现有 build 入口
```

---

## 6. 数据层设计

### 6.1 JSON Schema 示例（`data/_schemas/ai-daily.schema.json`）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AI Daily News Data",
  "type": "object",
  "required": ["date", "summary", "news"],
  "properties": {
    "date": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
    "summary": {
      "type": "object",
      "required": ["hook", "items"],
      "properties": {
        "hook": { "type": "array" },
        "items": {
          "type": "array",
          "minItems": 5, "maxItems": 5,
          "items": {
            "type": "object",
            "required": ["num", "cat", "title"],
            "properties": {
              "num": { "type": "string" },
              "cat": { "type": "string" },
              "title": { "type": "string", "maxLength": 40 }
            }
          }
        }
      }
    },
    "news": {
      "type": "array",
      "minItems": 5, "maxItems": 5,
      "items": { "$ref": "#/definitions/newsItem" }
    }
  },
  "definitions": {
    "newsItem": {
      "type": "object",
      "required": ["slug", "category", "title", "oneline", "bullets", "sources"],
      "properties": {
        "slug": { "type": "string" },
        "category": { "enum": ["安全监管", "营收融资", "模型发布", "产品更新", "开源生态"] },
        "title": { "type": "array" },
        "oneline": { "type": "array" },
        "bullets": { "type": "array", "minItems": 3, "maxItems": 3 },
        "sources": { "type": "array", "minItems": 1 },
        "theme": { "enum": ["neobrut", "editorial", "minimalist"], "default": "neobrut" }
      }
    }
  }
}
```

### 6.2 Data 示例（`data/ai-daily/2026-04-23.json`）

```json
{
  "date": "2026-04-23",
  "theme": "neobrut",
  "summary": {
    "hook": [
      { "text": "今天 " },
      { "text": "5 条", "hl": true },
      { "text": "\nAI 大新闻" }
    ],
    "items": [
      { "num": "01", "cat": "模型发布", "numColor": "#ff5757", "title": "..." }
    ]
  },
  "news": [
    {
      "slug": "01-xxx",
      "category": "模型发布",
      "title": [{ "text": "..." }, { "text": "...", "hl": true }],
      "oneline": [{ "text": "..." }, { "text": "...", "bold": true }],
      "bullets": [
        { "k": "发生了什么", "v": "..." },
        { "k": "为什么重要", "v": "..." },
        { "k": "对你的影响", "v": "..." }
      ],
      "sources": ["techcrunch.com", "arstechnica.com"]
    }
  ]
}
```

### 6.3 Data 入口对比

| Agent 写入量 | 当前 | 新架构 |
|---|---|---|
| AI Daily 1 天 | 228KB index.html + 40KB mp-article + 20KB 更新 hub + 6KB md = **294KB** | 3KB JSON + 2KB 骨架 HTML + 6KB md = **11KB** |
| Uni News 3 校 1 天 | 3 × (36KB + 24KB + 8KB + 4KB) = **216KB** | 3 × (2KB JSON + 2KB 骨架 + 4KB md) = **24KB** |
| Uni Events 1 天 | 40KB events.html + 32KB covers = **72KB** | 2KB JSON + 2KB 骨架 = **4KB** |

**单日总量**：~580KB → **~40KB**（降 93%）

---

## 7. 模板层设计

### 7.1 薄壳 HTML 模板（`templates/xhs-poster/ai-daily.html.ejs`）

```html
<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AI 每日头条海报 · <%= data.date %></title>
  <meta name="description" content="<%= data.date %> AI 日报">
  <link rel="stylesheet" href="../../_lib/poster.v2.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
  <script src="../../_lib/poster-renderer.v2.js"></script>
</head>
<body>
  <div id="poster-stage"></div>
  <script>
    PosterRenderer.renderAll(<%- JSON.stringify(data) %>);
  </script>
</body>
</html>
```

渲染出来：**30-40 行**，~3KB。不管 news 内容多长，模板不变；data 变化由 JSON 决定。

### 7.2 模板版本化

- `templates/xhs-poster/ai-daily.html.ejs` — v1 默认
- `templates/xhs-poster/ai-daily.editorial.html.ejs` — 编辑部风格
- `templates/xhs-poster/ai-daily.minimalist.html.ejs` — 极简风格

某天想换风格：data JSON 里加 `"theme": "editorial"`，pipeline 自动选对应模板。

### 7.3 共享 runtime 扩展

**`_lib/poster-renderer.v2.js`** 相对 v1 增强：

```js
PosterRenderer.renderAll({
  DATE: '2026-04-23',
  FLEX_HEIGHT: true,               // 🆕 自动选高度档位
  HEIGHT_TIERS: [1660, 1980, 2310], // 🆕 3 档竖版比例
  OVERFLOW_FALLBACK: 'shrink',     // 🆕 'shrink' | 'ellipsis' | 'split'
  THEME: 'neobrut',                 // 🆕 样式主题
  SUMMARY: {...},
  NEWS: [...],
});
```

---

## 8. Flex-Height 设计（解决文字溢出）

### 8.1 两遍渲染

```
Phase 1: Measure
  ├─ 对每个 poster 模拟布局（不实际 draw）
  ├─ 累加 title / oneline / bullets 的高度
  └─ 得到 requiredHeight

Phase 2: Select Canvas Tier
  ├─ requiredHeight ≤ 1660 → 用 1660（1:1.33，主流）
  ├─ 1660 < ≤ 1980 → 用 1980（1:1.6）
  ├─ 1980 < ≤ 2310 → 用 2310（1:1.86）
  └─ > 2310 → 触发 OVERFLOW_FALLBACK

Phase 3: Render
  └─ canvas.height = 选中档位，正式 draw
```

### 8.2 OVERFLOW_FALLBACK 策略

| 策略 | 行为 | 适用 |
|---|---|---|
| `shrink` | 字号整体降一级（96 → 84 → 72），再 measure | 默认 |
| `ellipsis` | bullets 最后一条截断加 ... | 追求一致高度 |
| `split` | 超长内容拆成下一张 poster | 极端情况 |

### 8.3 小红书展示兼容

3 档比例档位都是小红书竖版允许范围（验证过 1:1.33 / 1:1.6 / 1:1.86 都不会被 APP 强裁）。超过 1:1.86 小红书会压缩，所以 2310 是硬上限。

---

## 9. Hub 分页设计

### 9.1 层级

```
/ai-news-posters/index.html               ← 最新 10 条 + 快速入口
/ai-news-posters/archive/                 ← 按年目录
/ai-news-posters/archive/2026.html        ← 2026 年所有月份
/ai-news-posters/archive/2026-04.html     ← 2026-04 所有天（分页 10 条/页）
/ai-news-posters/archive/2026-04-p2.html  ← 第 2 页
```

### 9.2 自动生成

`build/hub-builder.ts` 扫 `static/{type}/YYYY-MM-DD/`：
- 按年月聚合
- 生成分页 HTML
- 每日 cron 后自动更新（build step）

**Agent 完全不碰 hub**。写完 data 就 push，CI 触发 build 自动重建分页。

### 9.3 前端搜索（v1.5 可选）

`_lib/hub-search.v1.js` 支持客户端搜索：
- 从 `data/{type}/_index.json` 加载全量索引
- 关键词 / 分类 / 日期范围过滤
- 不依赖后端

---

## 10. SEO & Channel 输出

### 10.1 Sitemap

`build/sitemap.ts` 扫所有 data + content：
- 每条生成 URL
- `<lastmod>` 自动从 data JSON 的 date 推算
- 提交到 Google Search Console

### 10.2 RSS

`build/rss.ts`：
- AI Daily → `/feed/ai-daily.xml`
- Uni News → `/feed/uni-news.xml`
- 合集 → `/feed.xml`

### 10.3 公众号 mp-article

沿用现有机制（`_lib/mp-inline.v1.js`），但抽成共享：
- 所有 inline styles 在 `_lib/mp-inline.v1.js` 的 `MP_INLINE_STYLES` 常量
- `applyInlineStyles(article)` 函数公用
- 每日 mp-article.html 只放 2-3 行 `<script>` 引用

### 10.4 Blog / Astro

- `content/articles/ai-daily-2026-04-23.md` 保持不变
- pipeline 同时产出 markdown（喂 Astro）+ JSON（喂 poster）
- markdown 里嵌一张海报缩略图 + 链接到 `/ai-news-posters/2026-04-23/`

---

## 11. 新增 Schedule 的标准流程

> 目标：< 1 天从零加一条新 schedule

### 步骤

1. **定义 data schema**（30 min）
   - `src/data/_schemas/{new-type}.schema.json`

2. **建 data 目录**（5 min）
   - `src/data/{new-type}/`

3. **写模板**（2h）
   - `src/templates/xhs-poster/{new-type}.html.ejs`
   - 或 `src/templates/mp-article/{new-type}.html.ejs`

4. **写 pipeline**（1h）
   - `build/pipelines/{new-type}.pipeline.ts`
   - 继承 `_base.pipeline.ts`，只需覆盖数据处理逻辑

5. **注册到 build.ts**（5 min）
   - 1 行 import + 1 行 register

6. **写 cron prompt**（1h）
   - prompt 只说："写 `src/data/{new-type}/{DATE}.json`，符合 schema，然后 push"
   - 不再要求 agent 写 HTML / 更新 hub

7. **测试 + 部署**（2h）
   - 本地 build 验证
   - 改 cron routine 上线

**合计**：约 6-7h，一天内干完。

### 未来规划的新 schedule（脑暴）

| schedule | 频率 | 产出 | 预估工时 |
|---|---|---|---|
| Bootcamp 招生海报 | 每周 | XHS 单图 + 公众号 | 7h |
| Job 市场周报 | 每周 | XHS 5 图 + blog | 7h |
| 面试题库增量 | 每日 | content md + search index | 5h |
| SEO 审计报告 | 每周 | admin dashboard 数据 | 5h |
| 开源项目观察 | 每日 | XHS 单图 + RSS | 6h |
| AI 工具评测 | 每周 | 深度 blog + 海报 | 8h |

---

## 12. Scale 分析

### 12.1 当前 vs 目标

| 维度 | 当前 | 1 年后预估（当前架构） | 1 年后（新架构） |
|---|---|---|---|
| Schedule 数量 | 4 | 10+ | 10+ |
| 日均新增文件 | 15 | 50 | 50 |
| 年累积文件 | ~5000 | ~18000 | ~18000 |
| 单日 Agent 写入量 | 580KB | 1.5MB | **40KB** |
| 单次 Agent context 消耗 | 150K tokens | 250K tokens | **20K tokens** |
| 单日 Git diff 体积 | 500KB | 1.2MB | **30KB** |
| Repo 总大小 | 200KB static | 3-4MB static | **~1MB static** |
| Hub index.html 行数 | 50 | 500 | **< 50（分页）** |
| Build 时间 | 5s | 30s+ | **< 10s（增量）** |
| Push 冲突频率 | 每周 2-3 次 | 每周 10+ 次 | **几乎无** |

### 12.2 Agent Context 预算

```
新架构单次 run 预算：
  ├─ 1 份 skill 文件                         5K
  ├─ 1 份 data schema                        1K
  ├─ 1 份模板参考（薄壳）                    2K
  ├─ WebSearch / WebFetch 结果               10K
  ├─ 写 data JSON                            2K
  ├─ git status / log                        1K
  └─ 总计                                    ~21K tokens ✓
```

对比现在 150K+ tokens，降 86%。Opus 4.6 定价下，单次成本从 ~$3 → $0.5。

### 12.3 Build 增量化

```typescript
// build.ts 伪代码
const changedFiles = await gitDiffSince('HEAD~1');
const changedDataFiles = changedFiles.filter(f => f.startsWith('src/data/'));

for (const dataFile of changedDataFiles) {
  const pipeline = resolvePipeline(dataFile);
  await pipeline.run(dataFile);
}

// hub 只在 data 变动时重建
if (changedDataFiles.length > 0) {
  await hubBuilder.run();
}
```

每次只处理变动的 data，hub 只在必要时重建。即使 1 万份 data，build 也只 < 10s。

---

## 13. 迁移计划（非破坏，可分 session）

### Phase 0 — 准备（0.5 day）
- [ ] 本 PRD 评审通过
- [ ] 备份 `_lib/poster-renderer.v1.js` 和 2026-04-21/index.html 作样本
- [ ] 确认不动的老内容边界

### Phase 1 — 地基（1 day）
- [ ] 建 `src/data/` + `src/data/_schemas/`
- [ ] 建 `src/templates/xhs-poster/` + `src/templates/mp-article/` + `src/templates/hub/`
- [ ] 建 `build/pipelines/` + `build/hub-builder.ts`
- [ ] 扩展 `_lib/poster-renderer.v2.js`（基于 v1 + flex-height）
- [ ] 抽 `_lib/poster.v2.css`
- [ ] 抽 `_lib/mp-inline.v1.js`

### Phase 2 — 先迁 AI Daily（0.5 day）
- [ ] 写 `data/_schemas/ai-daily.schema.json`
- [ ] 写 `templates/xhs-poster/ai-daily.html.ejs`
- [ ] 写 `templates/mp-article/ai-daily.html.ejs`
- [ ] 写 `build/pipelines/ai-daily.pipeline.ts`
- [ ] 手动生成一份 data JSON + 跑通 build，视觉 diff 老 HTML 确认等价
- [ ] 改 AI Daily cron prompt 切到新格式
- [ ] 跑 2-3 天验证

### Phase 3 — Uni News（0.5 day）
- 同 Phase 2 步骤

### Phase 4 — Uni Events（0.5 day）
- 同 Phase 2 步骤

### Phase 5 — Hub 分页（0.5 day）
- [ ] 实现 `build/hub-builder.ts`
- [ ] 建 hub 分页模板
- [ ] 迁移老 `uni-news-social/index.html` 到新分页入口（老内容保留，只是前端加链接）

### Phase 6 — SEO（0.5 day）
- [ ] `build/sitemap.ts`
- [ ] `build/rss.ts`
- [ ] 老 URL 做 301 到新 URL（不破坏 Google 索引）

### Phase 7 — 加 schedule 的下一个（future）
- 验证新架构：用新流程加第一个新 schedule（建议 Bootcamp 招生海报）

### 总工时估算
- **核心重构（Phase 1-6）**：~4 天
- 分 4-5 个 session，每次 1 天

---

## 14. 风险 & 缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Canvas flex-height 在小红书 APP 显示异常 | 中 | 高 | 限制 3 档比例档位，都在小红书允许范围内；先在测试账号验证 |
| 模板 EJS 复杂度过高 | 低 | 中 | 保持模板薄，逻辑全在 pipeline.ts 里 |
| 老 URL 被 Google 索引，迁移后 404 | 中 | 高 | 301 重定向，老 HTML 原样保留不 break |
| 公众号 mp-inline 抽 shared 后粘贴丢格式 | 中 | 中 | 保持 `applyInlineStyles` 在 runtime 执行，内嵌 inline 和老版本完全一致 |
| build 增量化实现复杂 | 低 | 低 | v1 先全量 build，观察慢了再优化 |
| Agent 没正确填 JSON schema | 高 | 中 | `build/validate-data.ts` 失败则 reject commit，逼 agent 重试 |
| 迁移期老/新 pipeline 共存 hub 混乱 | 中 | 中 | hub-builder 支持读两种源（data JSON + 老 HTML 目录），统一呈现 |

---

## 15. 开放问题

1. **Data JSON 是否 git 追踪？**
   - Pro: 可审查历史、agent 失败可回滚
   - Con: 每日累积，但每份只 2-3KB，1 万份也只 30MB
   - **建议**：追踪

2. **templates 是否走 EJS？**
   - Alternative: Astro component、纯 JS template string、Handlebars
   - **建议**：EJS（轻量 + 前端不需要）

3. **老 uni-news-social 的 4 校/6 校混乱要不要在迁移时统一？**
   - 现状：events 要 6 校，news 随日期池轮换
   - **建议**：新架构按 school 独立 data，完全解耦

4. **jr-academy-admin 要不要加运营 dashboard？**
   - 场景：运营要预览今天的海报、审批后再推送
   - **建议**：v2 做，v1 先跑通 pipeline

5. **Data schema 演进怎么办？**
   - 当 schema v1 → v2 时老 data 兼容性
   - **建议**：schema 里加 `"$schemaVersion": "1.0"`，pipeline 按版本分发

6. **是否引入 content queue / scheduling DB？**
   - 场景：运营要提前 7 天排版内容，到点发布
   - **建议**：v2 考虑，当前定时 + git push 足够

---

## 16. 成功指标

**3 周内**：
- [ ] AI Daily / Uni News / Uni Events 全部跑在新架构
- [ ] 连续 7 天无 push 冲突失败
- [ ] 单次 agent run context < 30K tokens
- [ ] Git 月增长 < 1MB

**3 个月内**：
- [ ] 新增至少 2 个新 schedule 跑在新架构
- [ ] hub 分页可用，覆盖全部内容
- [ ] Google 索引老 URL 无 404
- [ ] 每月 agent 成本下降 60%+

**6 个月内**：
- [ ] 支持 10+ schedule 并行
- [ ] 引入运营 dashboard（v2）
- [ ] 全量 data 可被 jr-academy 主站 API 消费

---

## 17. 决策 log

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-04-23 | HTML 骨架保留，不走纯 data-driven | 用户要求保留单日定制能力 |
| 2026-04-23 | 老内容不迁移 | 用户明确要求；老 URL 301 兜底 |
| 2026-04-23 | Channel 作为一等公民建模 | 未来会加更多 channel（Twitter / LinkedIn / YouTube） |
| 2026-04-23 | Pipeline 解耦 + 独立注册 | 新 schedule 成本降到 1 天 |
| 2026-04-23 | Flex-height 3 档比例 | 小红书 APP 兼容 + 文字溢出彻底解决 |

---

## 附录 A：2026-04-21/index.html 现状（参考样本）

现有薄壳版本（165 行、~4KB）已接通 `_lib/poster-renderer.v1.js`，**它就是本架构的原型**。

本 PRD 的"新架构"本质上是把这个 2026-04-21 的做法：
1. 抽 template 成 `templates/xhs-poster/ai-daily.html.ejs`
2. 把 SUMMARY + NEWS 从 inline JS 提取到 `data/ai-daily/{DATE}.json`
3. 全 pipeline 化、channel 化、可扩展化

**所以 Phase 1 不是从零开始，而是把 2026-04-21 的模式标准化、普及化**。

## 附录 B：cron prompt 改造前后对比

**改造前**（AI Daily 节选）：
```
Step 5 — Generate posters + mp-article (both required):
1. Create index.html — 1 合集 + 5 single posters (copy structure from 2026-04-18/index.html)
2. Create mp-article.html — COPY src/static/.../2026-04-18/mp-article.html AS-IS
3. Update hub index.html — insert new date card at top
4. Every poster must include html2canvas download button...
...(2000 字)
```

**改造后**：
```
Step 5 — Write data:
1. Create src/data/ai-daily/{DATE}.json following src/data/_schemas/ai-daily.schema.json
2. Run `bun run build:ai-daily` locally to generate output HTML
3. If build passes → git push. If fails → fix JSON until schema validates.
```

prompt 体积：2500 字 → 400 字。Agent 负担大幅降低。
