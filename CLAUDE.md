# CLAUDE.md — jr-wiki

JR Academy Headless 内容仓库。Markdown 存 GitHub，元数据存 MongoDB，后端从 GitHub 实时读 .md 渲染。官网前端零改动零部署。

---

## 🚨🚨🚨 反幻觉硬规则（2026-05-22 真翻车后立的 — 所有内容生成 skill 共用）

**事故**：2026-05-18 自动跑的 UQ 大学新闻日报把 Science International Scholarship 写成"自动评估、10%-25% 学费减免分档"——**全是 agent 按"UQ 其他奖学金常见套路"猜的**，官方原文是"需 personal statement 单独申请、AUD $5,000 一次性减免（只 1 学期）"。文章已经发到公众号，造成实质性的误导留学生申请。

**铁律**（适用于 jr-wiki 所有内容生成 skill：`/uni-news-poster` `/ai-daily-news` `/it-daily-news` `/ai-news-poster` `/weekly-tool-book` `/weekly-book-expand` `/weekly-interview-book` `/uni-events` `/graduate-jobs` 等）：

### 规则 1：事实细节必须有 sourceQuote 兜底

任何**事实陈述**——金额 / 学费 / 百分比 / 分档 / 截止日期 / GPA 门槛 / IELTS 分数 / 申请方式 / 材料清单 / 课程时长 / 资格要求 / 工具价格 / 模型上下文窗口 / 考试通过率——都必须满足：

1. **已用 WebFetch 真打开过官方 source URL**（学校：`*.edu.au` / `study.{校}.edu.au` / `scholarships.{校}.edu.au` / `handbook.{校}.edu.au`；AI 产品：官方 `docs.*` / `pricing` 页；认证：`aws.amazon.com/certification` / `learn.microsoft.com/credentials` 等）
2. **在产出的 JSON / md 里贴一个 `sourceQuote` 字段**，内容是**官方原句（首选英文原文）**
3. **没有原文证据的细节 = 删掉这句**——绝不允许"按常见模式 / 通常来说 / 一般而言"补全

### 规则 2：禁止从非官方源提取事实

小红书 / 知乎 / 留学中介公众号 / 中文留学媒体 / Twitter 用户 post / Reddit 帖子 / 第三方 review 站 —— **只能用来发现选题**，**不能当事实出处**。最终所有数字 / 政策 / 价格 / 申请流程**必须回到官方域名核对**。

### 规则 3：禁止把主观语气用在事实陈述上

xhsCopy / 文案 / 小红书 drafts 鼓励"小纠结 / 个人判断"——但**只能用在主观选择**（专业纠结 / 备考节奏 / 申几个 / 工具选哪个）上，**严禁**用在事实陈述（金额 / 资格 / 截止 / 材料）上。

| 是 | 来源必须是 | 允许的口吻 |
|---|---|---|
| 事实陈述（金额/百分比/资格/截止日/材料清单） | sourceQuote 原文 | 平铺直叙，**不准加"我猜/通常/一般来说"** |
| 主观选择（专业纠结、备考节奏） | 自己编 | 第一人称小纠结都行 |
| 行动建议（什么时候提交、怎么排进度） | 不需要 source | 可以自由发挥 |

写完每段问自己：**"这句话如果错了，会不会让学生申错奖学金 / 错过截止 / 多花钱？"** 是 → 必须 sourceQuote 兜底；否 → 自由发挥可以。

### 规则 4：每个 skill 的 Step N 自检 Bash 必须有 sourceQuote gate

任何写新的 schedule-driven content skill，最后那段 Bash 自检里**必须**有 sourceQuote 校验（`/uni-news-poster.md` Step 5 的「3.5 反幻觉 gate」是参考实现）。校验失败直接 `exit 1`，**不准用"补一个 placeholder source 应付"**绕过——校验目的是逼 agent 真的去 WebFetch 官网，不是让 agent 学会怎么糊弄校验。

### 规则 5：unknown 比 wrong 好 1 万倍

不知道 = 直接说"具体金额请到官网核对"+ 贴 URL。**比编一个看起来合理的数字好 1 万倍**。学员看到"需要核对"会去官网查；看到"AUD $5,000"会直接信，错的话直接坑。

---

## 🚨 SEO 政策（2026-04-23 运营决议）

**jr-wiki 的 GitHub Pages 链接（`jr-academy-omni.github.io/jr-wiki/*`）是纯运营内部工具，全站 `noindex, nofollow`。不做 SEO、不做 sitemap、不做 RSS。**

### 为什么不做

jr-wiki 的 GitHub Pages 服务的是 **运营工具页**，不是对外产品：
- `/ai-news-posters/{DATE}/index.html` — 海报下载工具（运营下载 PNG 发小红书）
- `/ai-news-posters/{DATE}/mp-article.html` — 公众号发稿页（运营复制富文本粘到微信编辑器）
- `/uni-news-social/{DATE}/{school}/xhs-posters.html` — 大学新闻海报下载
- `/uni-news-social/events/{DATE}.html` + `{DATE}-covers.html` — 校园活动预览
- `/_preview/` — 内容管理内部预览

**真正对外的公开内容**（对应的 markdown 正文）走 **jiangren.com.au**：
- `jiangren.com.au/blog/{slug}` ← posts 集合（由 Next.js 主站做 SEO）
- `jiangren.com.au/wiki/{slug}` ← wikis 集合（由主站做 SEO）

换言之：**SEO 归 jiangren.com.au Next.js 主站负责，GitHub Pages 链接不参与索引。**

### 如何兑现

1. **`dist/robots.txt`**（由 `build.ts` 生成）: `User-agent: *\nDisallow: /`
2. **`public/robots.txt`**: 同样 `Disallow: /`（保底）
3. **所有静态 HTML** 必须带 `<meta name="robots" content="noindex, nofollow">`（模板已默认带；新 HTML 必须延续）
4. **禁止**在 jr-wiki 里加 sitemap.xml / RSS / JSON-LD / OpenGraph（那些留给 jiangren.com.au）
5. **禁止**把 GitHub Pages 链接放进对外对用户可见的页面（只在运营工具 / 内部 dashboard 里引用）

### 新功能检查清单

加新静态 HTML 前必须过：
- [ ] 模板/输出 `<head>` 里有 `<meta name="robots" content="noindex, nofollow">`
- [ ] 没有加任何 SEO schema（FAQPage / Article / BreadcrumbList 等 JSON-LD）
- [ ] 没有加 canonical link 指向对外 URL
- [ ] 没有引入 sitemap 或 feed.xml

---

## 架构

```
jr-wiki (GitHub) → bun run sync → MongoDB (元数据 + contentUrl)
                                       ↓
用户访问官网 → 后端查 DB → fetch GitHub raw .md → HTML → 返回前端
```

### 三种内容的去向

| 内容 | DB 集合 | 官网 URL | 正文来源 |
|------|---------|---------|---------|
| 文章 articles | posts (source: jr-wiki) | /blog/{slug} | 后端从 GitHub 读 .md |
| 电子书 books | wikis (source: jr-wiki, 带 chapters) | /wiki/{slug} | 后端从 GitHub 读 .md，伪装成 Notion 格式 |
| 学员故事 stories | testimonials (source: jr-wiki) | 首页 | DB 里的 description |
| 帮助 help | 不进 DB | — | — |

### DB 只存元数据，正文从 GitHub 实时读

- posts 集合: `{ slug, title, source: "jr-wiki", contentUrl: "src/content/articles/xxx.md" }`
- wikis 集合: `{ slug, title, source: "jr-wiki", chapters: [{slug, title, order, contentUrl}] }`
- testimonials 集合: `{ slug, name, source: "jr-wiki", description }`

### 后端读 .md 的逻辑

- Dev: 直接读本地文件 `path.resolve(cwd, '..', 'jr-wiki', contentUrl)`
- Prod: `fetch https://raw.githubusercontent.com/JR-Academy-Omni/jr-wiki/main/{contentUrl}` + GITHUB_TOKEN

### wiki 特殊处理

wiki API (`getWikiDetailBySlug`) 检测到 `source=jr-wiki` 时，把 chapters 伪装成前端期望的 Notion 格式：
- `chapters` → `categories[0].notionPages`（侧边栏章节列表）
- markdown HTML → `currentNotion.contentSnapshot`（正文内容）

前端 WikiDetailPage 不知道内容来自 jr-wiki，正常渲染。

---

## 给运营同事的快速指南

直接用中文告诉 Claude 你想做什么：

| 命令 | 作用 |
|------|------|
| `/add-article 标题` | 新建文章 → /blog/ |
| `/add-book 书名` | 新建电子书 → /wiki/ |
| `/add-chapter 书名 章节标题` | 给电子书加章节 |
| `/edit-chapter 书名 第N章 修改说明` | 修改章节内容 |
| `/add-story 学员名 故事` | 新建学员故事 → 首页 |
| `/publish` | 推送到线上 |
| `/ai-daily-news` | 搜索今天 AI 热点生成日报 |
| `/it-daily-news` | 搜索 IT 认证 / 课程动态生成日报（slug 前缀 `it-daily-` 触发 articles 页 it-daily 分类） |
| `/ai-news-poster` | 当天 5 条新闻生成 6 张海报 + 公众号文章（index.html 海报库 + mp-article.html 发稿页） |
| `/uni-news-poster [date] [school]` | 大学新闻 · 公众号 + 小红书素材：mp-article.html（按校 brand color）+ xhs-drafts.md（内嵌敏感词扫描）+ xhs-covers.html（每校不同背景特色的小红书封面图）。**不产独立海报库，不发朋友圈**。详见 `docs/UNI_NEWS_AUTOMATION_PRD.md` |
| `/ai-content-pipeline` | 完整管道：日报 + 原创文章 |
| `/weekly-holidays` | 抓未来 90 天 AU/SG/MY/US/GB 节假日 → `src/data/weekly-holidays/latest.json`（admin 营销日历读取，纯内部工具不进 hub） |

### 改内容 vs 新增内容

- 改 / 新增内容: 改完 → `/publish` → CI 自动 sync MongoDB（~30 秒生效）
- 本地手动 sync（绕 CI 或排查用）: `ADMIN_TOKEN=xxx bun run sync`

---

## 内容类型

| 类型 | 位置 | 必填 frontmatter |
|------|------|-----------------|
| 文章 | `src/content/articles/` | title, description, publishDate, tags |
| 电子书 | `src/content/wiki/{book}/` | `_meta.yaml` + 每章: title, wiki, order |
| 帮助 | `src/content/help/` | title, description, category |
| 学员故事 | `src/content/stories/` | title, description, name, role, publishDate |

## 命令

```bash
bun run build         # 构建 manifest.json（先跑 check-slugs gate）
bun run dev           # 本地预览 http://localhost:4321
bun run sync          # 构建 + 同步元数据到 MongoDB（需要 ADMIN_TOKEN）
bun run check-slugs   # 验证已发布 slug 没被改名/删除
bun run lock-slugs    # 注册新增 slug 到 slug-registry.json
```

## 🚨 Slug 稳定性 gate（保 SEO）

`slug-registry.json` 锁住所有已发布 slug（books/chapters/articles/stories 共 152+）。`build` 和 `sync` 自动跑 `check-slugs`，发现已发布 slug 消失就**直接失败**。

### 为什么

一篇 wiki / blog 一旦上线，URL 就被 Google 索引、被外链引用。改文件名 = 改 slug = 改 URL = **404 + SEO 排名跌**。jr-wiki 里 slug 就是文件名（folder 名 for books），所以**重命名等价于删除老 URL**。

### 实操

| 操作 | 该怎么做 |
|------|---------|
| 改 frontmatter `title`（标题） | ✅ 随便改，slug 不动，URL 不变 |
| 改 markdown 正文 | ✅ 随便改 |
| 改 frontmatter `description`/`tags` | ✅ 随便改 |
| 新增文件 | 写完 → `bun run lock-slugs` 注册新 slug |
| 改文件名（已发布 slug）| ❌ 默认禁止，违反 `feedback_url_stability` |
| 真要改文件名 | 先在 jiangren.com.au 主站加 301 redirect → 部署上线验证 → 才能 rename + `bun run lock-slugs` |
| 删除已发布文件 | ❌ 同上，要 redirect 兜底再删 |

### check-slugs 报错怎么办

报错信息：`❌ N registered slug(s) MISSING — file rename or delete detected.`

排查顺序：
1. 是不是手滑改名了？→ git checkout 还原
2. 真的要改？→ 先在 web-zh 加 redirect，部署验证，再 `bun run lock-slugs`
3. 是 git 历史回退导致？→ 同步把 registry 也回退到对应 commit

## 自动化定时任务

| 任务 | 频率 | 产出 |
|------|------|------|
| AI 日报 + 原创 + 海报 + 公众号稿 | 每天 9:00–9:15 AEST 串跑 | 日报 → /blog/；海报库 → `.../ai-news-posters/{date}/index.html`；公众号发稿页 → `.../ai-news-posters/{date}/mp-article.html` |
| AI 工具电子书 | 每周一 | 新书 3-5 章 → /wiki/ |
| 电子书扩章 | 每周四 | 现有书加 1-2 章 → /wiki/ |
| 每周节假日调查（营销日历）| 每周日 09:00 AEST | 5 国 JSON → `src/data/weekly-holidays/latest.json`（admin `/weekly-holidays` 页面读取） |

管理: https://claude.ai/code/scheduled

### 🚨 schedule 的日期必须用 AEST（Australia/Sydney）

调度器跑在 UTC / 美国时区，直接 `date +%Y-%m-%d` 会拿到比澳洲慢一天的日期 → 管道看到"昨天的文件"就当"今天已跑"直接退出，当天内容漏产（血泪：2026-04-19 就因为这个没产出）。

所有 skill 里取日期必须写：
```bash
DATE=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}
```

`ai-daily-news.md` / `ai-news-poster.md` / `ai-content-pipeline.md` 都已强制。新增 skill 只要涉及日期都照办。

### 🚨 schedule 跑 `/ai-news-poster` 的强制要求

`mp-article.html` 必须带**完整 inline style CSS**（公众号编辑器会剥光 `<style>` 和 class，只认 `style=""`）。定时任务没人盯，漏一次当天推文就变黑白纯文本。

每次产出必须满足：`MP_INLINE_STYLES` 映射全 + `applyInlineStyles()` 完整 + `mpCopyHtml()` 调用了它 + 所有颜色用 hex 不用 `var(--*)`。详见 `.claude/skills/ai-news-poster.md`「schedule 跑 /ai-news-poster 的硬性要求」章节，照搬 `2026-04-18/mp-article.html` 的第 411–498 行逻辑即可。
