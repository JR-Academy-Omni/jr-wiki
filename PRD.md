# jr-wiki PRD — Headless 内容仓库

## 问题

JR Academy 需要一个让非技术员工通过 AI 工具轻松创建学习内容的系统，内容自动出现在官网，不需要改官网前端代码，不需要部署官网前端。

## 方案

jr-wiki 是一个 **Headless 内容仓库**：
- 内容以 Markdown 文件存储在 GitHub 仓库
- sync 脚本把元数据写入 MongoDB
- 后端 API 实时从 GitHub 读取 .md 正文，转 HTML 返回
- 官网前端零改动零部署

---

## 架构图

```
员工/AI 写 Markdown → push to GitHub
                         ↓
                 bun run sync (读 manifest.json)
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
  posts 集合       wikis 集合      testimonials 集合
  (articles)    (books+chapters)    (stories)
        ↓                ↓                ↓
  /blog/xxx        /wiki/xxx          首页故事区
```

每个集合只存**元数据 + contentUrl**（指向 GitHub 源文件路径），正文不进 DB。

后端 API 被调用时：查 DB → 拿到 contentUrl → fetch GitHub raw .md → 去 frontmatter → markdown→HTML → 返回前端。

---

## 三种内容的完整数据流

### 1. 文章 (articles) → /blog/xxx

**数据保存（sync 写入 MongoDB posts 集合）：**

```json
{
  "slug": "cursor-tips",
  "title": "Cursor IDE 5 个实用技巧",
  "source": "jr-wiki",
  "state": "published",
  "contentUrl": "src/content/articles/cursor-tips.md",
  "publishedDate": "2026-03-20",
  "meta": { "title": "...", "description": "...", "keywords": "..." },
  "content": { "brief": "Tab 补全、Cmd+K 编辑..." }
}
```

`content.extended` 为空，正文不存 DB。

**数据传输（用户访问 /blog/cursor-tips）：**

```
前端请求 GET /posts/slug/cursor-tips
         ↓
后端查 posts 集合，发现 source=jr-wiki 且有 contentUrl
         ↓
fetch https://raw.githubusercontent.com/JR-Academy-Omni/jr-wiki/main/src/content/articles/cursor-tips.md
（带 GITHUB_TOKEN header，dev 时直接读本地文件 ../jr-wiki/src/content/articles/cursor-tips.md）
         ↓
去掉 frontmatter → markdown 转 HTML
         ↓
返回 { title, slug, content: "<h2>1. Tab 补全不只是补全</h2><p>..." }
```

前端正常渲染，和数据库里的其他文章完全一样。

### 2. 电子书 (books) → /wiki/xxx

**数据保存（sync 写入 MongoDB wikis 集合）：**

```json
{
  "slug": "prompt-engineering",
  "title": "Prompt Engineering 实战指南",
  "source": "jr-wiki",
  "state": "published",
  "type": "study",
  "tags": ["prompt", "ai", "chatgpt"],
  "meta": { "title": "...", "description": "...", "keywords": "..." },
  "chapters": [
    {
      "slug": "01-what-is-prompt",
      "title": "什么是 Prompt",
      "order": 1,
      "contentUrl": "src/content/wiki/prompt-engineering/01-what-is-prompt.md"
    },
    {
      "slug": "02-basic-techniques",
      "title": "基础技巧：让 AI 输出可控",
      "order": 2,
      "contentUrl": "src/content/wiki/prompt-engineering/02-basic-techniques.md"
    },
    {
      "slug": "03-advanced-patterns",
      "title": "高级模式：System Prompt 和 Prompt Chain",
      "order": 3,
      "contentUrl": "src/content/wiki/prompt-engineering/03-advanced-patterns.md"
    }
  ]
}
```

每本书存一条 wiki 记录，chapters 数组包含所有章节的元数据和 contentUrl。

**数据传输（用户访问 /wiki/prompt-engineering）：**

```
前端请求 GET /wikis/slug/prompt-engineering
         ↓
后端查 wikis 集合，发现 source=jr-wiki 且有 chapters
         ↓
取 chapters[0]（或 URL 里指定的章节）的 contentUrl
         ↓
fetch GitHub raw .md → 去 frontmatter → markdown 转 HTML
         ↓
组装成前端 WikiDetailPage 期望的格式返回：
```

```json
{
  "wikiDetail": {
    "slug": "prompt-engineering",
    "title": "Prompt Engineering 实战指南",
    "categories": [{
      "slug": "chapters",
      "name": "Prompt Engineering ���战指南",
      "notionPages": [
        { "slug": "01-what-is-prompt", "title": "什么是 Prompt", "notionPageId": "01-what-is-prompt", "permission": "guest" },
        { "slug": "02-basic-techniques", "title": "基础技巧：让 AI 输出可��", "notionPageId": "02-basic-techniques", "permission": "guest" },
        { "slug": "03-advanced-patterns", "title": "高级模式", "notionPageId": "03-advanced-patterns", "permission": "guest" }
      ]
    }]
  },
  "currentNotion": {
    "slug": "01-what-is-prompt",
    "title": "什么是 Prompt",
    "notionPageId": "01-what-is-prompt",
    "permission": "guest",
    "meta": { "title": "什么是 Prompt — Prompt Engineering 实战指南", "description": "...", "keywords": "..." },
    "contentSnapshot": "<h2>Prompt = 你给 AI 的指令</h2><p>Prompt 就是你输入给大语言模型...</p>",
    "isLiveMode": false
  }
}
```

**关键**：后端把 chapters 伪装成 `categories[0].notionPages`，把 markdown HTML 放进 `currentNotion.contentSnapshot`。前端 WikiDetailPage 以为是 Notion 内容，正常渲染侧边栏 + 章节导航 + 正文。

**切换章节**：前端点击侧边栏 → 请求 `GET /wikis/slug/prompt-engineering?notionPageId=02-basic-techniques` → 后端读对应章节的 .md → 返回新的 contentSnapshot。

### 3. 学员故事 (stories) → 首页 testimonials

**数据保存（sync 写入 MongoDB testimonials 集合）：**

```json
{
  "slug": "alice-accounting-to-frontend",
  "name": "从会计到前端工程师：Alice 的 3 个月转行之路",
  "source": "jr-wiki",
  "description": "Alice 从零基础到拿到 offer...",
  "title": "Alice",
  "jobFunction": "Frontend Developer",
  "company": "Canva",
  "recommended": true
}
```

故事的正文直接存在 description 里（短文本），不需要从 GitHub 读。

### 4. 帮助中心 (help) — 不进 DB

帮助文档只存在 GitHub 仓库里，不同步到数据库，不在官网展示。

---

## 操作流程

### 修改已有内容（不需要 sync）

```
改 .md 文件 → push → 后端下次请求自动从 GitHub 读到新内容
```

### 新增内容（需要 sync）

```
创建新 .md 文件 → push → ADMIN_TOKEN=xxx bun run sync → 元数据写入 DB
```

### 删除内容

```
删除 .md 文件 → push → Admin CMS 里将对应记录改为 archived
```

---

## 后端改动清单 (jr-academy)

| 文件 | 改动 |
|------|------|
| `common/constants/post.ts` | `EPostSource` 加 `JR_WIKI = 'jr-wiki'` |
| `models/post.schema.ts` | 加 `contentUrl: string` |
| `models/wiki.schema.ts` | 加 `source: string` + `chapters: [{slug, title, order, contentUrl}]` |
| `models/testimonial.schema.ts` | 加 `source: string` |
| `modules/post/post.service.ts` | `getPostBySlug`: source=jr-wiki 时从 contentUrl 读 .md → HTML 返回 |
| `modules/wiki/wiki.service.ts` | `getWikiDetailBySlug`: source=jr-wiki 时从 chapters 读 .md，组装 Notion 格式返回 |
| `modules/admin-cms/admin-posts` | `POST /sync/jr-wiki` upsert API |
| `modules/admin-cms/admin-wikis` | `POST /sync/jr-wiki` upsert API（带 chapters） |
| `modules/admin-cms/admin-testimonials` | `POST /sync/jr-wiki` upsert API |

### 环境变量

| 变量 | 说明 |
|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token (vault)，用于从 private repo 读取 .md 文件。Dev 时不需要（直接读本地文件） |

### 读取 .md 的逻辑（post.service.ts 和 wiki.service.ts 共用）

```
Dev:  直接读本地文件 path.resolve(cwd, '..', 'jr-wiki', contentUrl)
Prod: fetch https://raw.githubusercontent.com/JR-Academy-Omni/jr-wiki/main/{contentUrl}
      header: Authorization: token {GITHUB_TOKEN}
```

读到原始 markdown 后：去掉 frontmatter（`---\n...\n---`）→ markdown 转 HTML → 返回。

---

## 前端改动

**无。** 官网前端代码零改动，零部署。

---

## 自动化内容管道

3 个 Claude Code 远程定时任务自动生成内容：

| 任务 | 频率 | 产出 | 去向 |
|------|------|------|------|
| AI 日报 + 原创文章 | 每天 9am | 1 日报 + 1-2 原创 | posts → /blog/ |
| AI 工具电子书 | 每周一 9am | 1 本书 3-5 章 | wikis → /wiki/ |
| 电子书扩章 | 每周四 9am | 1-2 新章节 | wikis → /wiki/ |

管道执行后自动 push 到 GitHub。定时任务执行完后需要手动或 CI 跑 `bun run sync`。

---

## Sync 脚本 (sync-to-db.ts)

读取 `dist/manifest.json`，调用后端 admin-cms API：

```
articles → POST /admin-cms/posts/sync/jr-wiki      { articles: [...] }
books    → POST /admin-cms/wikis/sync/jr-wiki       { wikis: [{..., chapters: [...]}] }
stories  → POST /admin-cms/testimonials/sync/jr-wiki { stories: [...] }
```

所有 API 按 `slug + source=jr-wiki` upsert，重复跑不会创建重复记录。

```bash
# 本地
ADMIN_TOKEN=xxx bun run sync

# 生产
ADMIN_TOKEN=xxx API_URL=https://api.jiangren.com.au bun run sync
```
