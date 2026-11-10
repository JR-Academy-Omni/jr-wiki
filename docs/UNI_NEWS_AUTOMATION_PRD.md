# 大学新闻自动化 Pipeline PRD

Owner: 未指定
Status: Draft
Created: 2026-04-19
Related: `PRD.md`（jr-wiki 架构）、`.claude/skills/ai-news-poster.md`（AI 新闻已跑通的参考）

---

## 背景

`src/content/universities/{school}/news-{YYYY-MM-DD}.md` 每天 ~12:00 AEST 被自动产出 3 所学校的新闻日报（10 校滚动：adelaide / anu / monash / rmit / umelb / unsw / uq / usyd / uts / uwa）。内容质量已经不错：每校 3 条，带 Unsplash 配图 + source 链接 + 人话点评。

但对比 AI 新闻 pipeline，大学新闻线缺三样关键产出，导致内容只能躺在 repo 里没传播力：

1. **前端没渲染** — `src/content/config.ts` 没定义 `universities` collection，sync 也不写 DB，官网根本访问不到
2. **没公众号发稿页** — 没有 `mp-article.html`，运营得手动排版 2-3 小时/校
3. **小红书没配图** — 小红书是图片驱动平台，纯文案没 reach
4. **小红书文案零敏感词检查** — jr-academy-ai 上那个老 trigger 产出的 4 校草稿直接扔给运营，绝对化用语、引流词、教育类"包过"等常踩雷

> **scope 说明**：这条线**不做**独立海报库（对比 AI 新闻）。大学新闻主战场是小红书 + 公众号，独立 poster gallery 页没流量。小红书需要的图作为"封面图"跟 xhs 草稿一起打包，不作为单独产出。

## 目标

**P0（Phase 1 MVP，先跑通 UQ 单校）**
- `/uni-news-poster` skill：输入日期 + 学校 slug，产出 **1 份公众号发稿页 + 1 份小红书草稿（含 1-2 张小红书封面图）**
- 公众号发稿页复用 AI 新闻的 `MP_INLINE_STYLES` + `applyInlineStyles()` 方案（粘到 mp.weixin.qq.com 保留全部视觉），整篇按**当前学校的 brand color** 做 section 底色 / 标签 / 分割线
- 小红书封面图规格 1242×1660，**每校不同背景特色**（brand color 底 + 点阵/斜纹装饰 + hook 文字），html2canvas 导出 PNG
- 小红书文案内嵌敏感词扫描（不依赖 claude.ai 的 xhs-review skill，schedule 跑时没外部 skill context）

**P1（Phase 2 全量 3 校/天）**
- `/uni-news-poster` 接受"当天 auto"模式 → 读 `src/content/universities/*/news-{today}.md` 自动扫出 3 校循环产出
- 每校品牌色区分（UQ 紫、UMelb 深蓝、UNSW 黄、USYD 红、Monash 蓝、ANU 金、Adelaide 深红、RMIT 红黑、UTS 橙、UWA 深蓝），不只是颜色不同，装饰纹样也区分（点阵 / 斜纹 / 网格 / 波浪）

**P2（Phase 3 前端接入）**
- `config.ts` 加 `universities` collection，manifest 透出
- `sync-to-db.ts` 把 uni news 写进 posts 集合 `source: "jr-wiki"`, `tags: ["uni-news", "{school}"]`
- 官网走 `/blog/{school}-news-{date}` 直接渲染（后端 API 不用改，`source=jr-wiki` 已有从 GitHub 读 md 的逻辑）
- 或者新建 `/universities/{school}` 专页聚合（需前端开发，独立 PRD）

## 非目标

- **不做独立海报库** — 大学新闻不发朋友圈 / 没有 "poster gallery" 页，小红书封面图作为 xhs 草稿的附属产出，不单列
- **不发朋友圈** — 两个出口：小红书 + 公众号。朋友圈由运营看心情挑图，不在 pipeline 里产出
- **不重写 uni news 日报的生成 pipeline** — 那个每天 12 点跑的 job 另一个 PRD 做，本 PRD 只负责给现有的 md 加"公众号 + 小红书"两件套
- **不做官网新前端页** — Phase 3 只走现有 `/blog/` 路径，不新设计 `/universities/{school}` 聚合页（独立 PRD）
- **不做微信 / 小红书的自动 publish** — 两家都没官方 post API，保持"素材导出给运营一键复制"模式
- **不做英文站** — Phase 1-3 只做中文

## 用户

- **运营**：每天中午新闻 md 出来后，跑 `/uni-news-poster 2026-04-19 uq` → 拿到一套素材 → 分别发小红书（图 + 文）、公众号（一键复制粘贴）
- **内容质检**：粘贴前必看一眼敏感词扫描结果，踩雷的直接在 skill 给的替换建议里挑
- **schedule（Phase 2 之后）**：每天 12:30 AEST 自动跑，产出推到 GitHub Pages

## 方案

### Phase 1 技术设计（本 PRD 唯一要做的）

#### 1.1 目录约定

目录名不再叫 `uni-news-posters`（避免"海报"误导），改叫 `uni-news-social`：

```
src/static/uni-news-social/
├── index.html                    # Hub 页（Phase 2 再做，按日期 × 学校聚合入口）
└── {YYYY-MM-DD}/
    └── {school}/                 # 每校独立子目录
        ├── mp-article.html       # 公众号发稿页（全 inline style，按校 brand color）
        ├── xhs-drafts.md         # 小红书 1-2 篇草稿 + 敏感词扫描报告
        └── xhs-covers.html       # 小红书封面图 1-2 张（1242×1660，html2canvas 下载 PNG）
```

**不产出** `index.html`（独立海报库页） / 单条新闻海报。小红书封面图在 `xhs-covers.html` 一页里打包，运营点下载导出。

#### 1.2 每校品牌色对照表（写死在 skill 里）

| School slug | 主色 | 强调色 | 备注 |
|---|---|---|---|
| uq | `#51247a` | `#ffce44` | 紫底金字 |
| umelb | `#094183` | `#ffce44` | 深蓝底 |
| unsw | `#ffd100` | `#10162f` | 金底黑字（反转） |
| usyd | `#e64626` | `#ffffff` | 红底白字 |
| monash | `#006dae` | `#ffce44` | 蓝底 |
| anu | `#c7a85c` | `#10162f` | 香槟金底 |
| adelaide | `#002f5f` | `#ff5757` | 深藏青底 |
| rmit | `#e60028` | `#000000` | 红底黑字 |
| uts | `#0f4c81` | `#ff5757` | 蓝底 |
| uwa | `#27348b` | `#ffce44` | 深蓝底 |

**封面视觉风格不同于 AI 新闻**：AI 新闻走 Neo-Brutalism（粗黑边 + offset shadow + 歪斜贴纸），受众是技术 geek。大学新闻受众是留学生，封面改走**现代杂志 / 渐变卡片风**（Playfair Display 衬线 + 线性渐变紫底 + 金色径向光晕 + 半透明玻璃卡片 + 细线分隔），精致、有层次、有设计感，不要硬糙风。具体规格见 `.claude/skills/uni-news-poster.md` 「小红书封面风格」章节。

**每校背景差异化**（渐变方案，Phase 2 加强识别度）：

| School | 底色渐变 | 光晕色 | 说明 |
|---|---|---|---|
| uq | 深紫 → 中紫 → 浅紫 | 金色径向 | v1 参考实现 |
| umelb | 深蓝 → UMelb 蓝 → 浅蓝 | 金色径向 | |
| unsw | 深黑 → 反转（金黄底 + 黑字） | 黑色径向 | 金底特殊处理 |
| usyd | 深红 → USYD 红 → 橙红 | 金色径向 | |
| monash | 深海蓝 → Monash 蓝 → 天蓝 | 白色径向 | |
| anu | 深棕 → ANU 香槟金 → 浅香槟 | 黑色径向 | 金底特殊处理 |
| adelaide | 深藏青 → 藏青 → 钴蓝 | 红色径向 | |
| rmit | 黑 → RMIT 红 → 亮红 | 黑色径向 | |
| uts | 深蓝 → UTS 蓝 → 浅蓝 | 橙红径向 | |
| uwa | 深蓝 → UWA 深蓝 → 浅蓝 | 金色径向 | |

#### 1.3 小红书封面图数量与结构

小红书是 carousel 驱动，**每篇草稿配 1 张主封面图**（1242×1660）。如果当天做 2 篇草稿就 2 张封面。

封面结构（简化版，不塞 3 bullets、不塞 source，只做吸睛）：

```
┌─────────────────────────────┐
│ {学校 logo 色块 + 中文名}    │  <- eyebrow 小带（brand 底）
│                             │
│  🎓 奖学金 20% 减免          │  <- hook 大字（100-120px）
│  我差点漏了这个！            │     模仿小红书高点击标题风
│                             │
│  📍 UQ · 2026-04-14          │  <- meta（brand.accent 色）
│                             │
│  ·  High Achievers 20%      │  <- 3 条短 bullet
│  ·  9000 澳元/年            │     不超过 8 字
│  ·  自动评估 · 无需申请     │
│                             │
│  👉 详情见评论区             │  <- CTA 引导（不得含 VX/链接）
│                             │
│  📰 JR Academy 澳洲留学      │  <- 底栏 brand bar
└─────────────────────────────┘
```

category 推荐词（同 AI 新闻）：奖学金 / 招生政策 / 科研合作 / 项目开放 / 校园动态 / 签证移民 / 学费调整 / 课程更新

#### 1.4 公众号文章（mp-article.html）

硬性复用 `src/static/ai-news-posters/2026-04-18/mp-article.html` 第 411–498 行的 `MP_INLINE_STYLES` + `applyInlineStyles()` + `mpCopyHtml()` 三段，一个字不改，只换数据。

校验清单（skill 末尾列出，每次产出自检）：
- [ ] `MP_INLINE_STYLES` 至少 12 个 class 覆盖
- [ ] 全程 `background-color:` 不用 `background:` 简写
- [ ] 6 位 hex 不用 `rgba()` 不用 `var(--*)`
- [ ] `mpCopyHtml()` 拼 html 前调了 `applyInlineStyles(article)`

字数目标 2500-3500 字（引言 + 3 条各 2-3 段 + 文末 JR Academy 升学 CTA）。

#### 1.5 小红书草稿（xhs-drafts.md）+ 封面站外引流红线

每校产出 1-2 篇 600-800 字的草稿，同时内嵌**敏感词扫描报告** + **人性化改写版**。

🚨 **封面图和文案都严禁出现以下内容**（小红书封号风险）：
- "JR Academy" / "匠人学院" / 任何公司品牌名
- 网址（jracademy.ai / 任何 .com/.au/.cn 域名）
- 微信号 / 二维码 / "关注公众号" / "扫码领取"
- 任何外部平台引流（公众号名 / 抖音号 / B 站）

**为什么单列**：小红书系统对站外引流检测很严，即便是"看起来无害的品牌名"也会被降权限流。封面底栏**只**允许放分类 tag 或日期，文案结尾只允许"评论区聊"类内部互动。

这条规则和 AI 新闻 / 公众号完全不同 —— 公众号可以保留"关注 JR Academy"、网站链接。

**内嵌规则**（skill 里直接 copy，不依赖外部 xhs-review skill）：

1. **教育类绝对化/保证性表述**：包过、不过退款、保录取、最好、第一、唯一、100%、顶级、绝对 → 换成"我觉得"、"体感不错"、"性价比挺高"
2. **医疗/健康**：治疗、治愈、排毒、速效 → 本场景大概率用不到，看到就删
3. **引流/营销**：微信号、VX、加V、私信领取、关注公众号、点击链接、免费领、0元购 → 删掉或换成"评论区聊"、"有兴趣扣个1"
4. **AI 味典型词**：首先...其次...最后、值得注意的是、总的来说、综上所述、此外、与此同时、不仅如此、作为一个、旨在、使得 → 逐条替换成口语
5. **教育场景专属**：中介挂羊头、保送、内部渠道、确定录、必中 → 删
6. **政治敏感**：涉港澳台不当、领导人使用、历史虚无 → 不碰这类题材

每篇草稿下方追加一个 markdown 小表格：

```
| 序号 | 原文 | 风险等级 | 替换建议 |
|---|---|---|---|
```

没检出写"未检出敏感词"。

**文风要求**（对齐 `xhs-review` 但更适配留学生场景）：
- 第一人称"学姐/学长亲测"
- 段落长短参差，段首不套公式
- emoji 克制（1-2 段插一个，不要每句都挂）
- 标题 ≤20 字（含 emoji 算字数），口语化、数字化、对比化
- 标签 5-8 个，含学校英文名 + 澳洲留学 + 活动相关

#### 1.6 数据源读取

输入：skill 参数 `DATE` + `SCHOOL`（如 `2026-04-19 uq`）。

1. 读 `src/content/universities/{school}/news-{DATE}.md`
2. parse frontmatter（`universityName` / `universityNameCn` / `tags`）
3. parse 正文每个 `## N.` section → `{ index, title, oneLine (md 首段首句), bullets (md 后两段拆 3 点), source }`
4. 读不到报错提示"先确认 md 存在 / 先跑 uni news 生成 job"

category 字段 md 里没有 → skill 里按关键词判定（"奖学金"/"Scholarship" → 奖学金；"科研"/"research" → 科研合作 等）。

#### 1.7 下载导出

每张海报 + 公众号页复用 AI 新闻的 html2canvas 1.4.1 下载脚本（**必须避开 4 个已知坑**，skill 里列清单）：
1. box-shadow + inline 文字 → 用 wrapper + ::before 替代
2. `getComputedStyle(el).background` 丢 linear-gradient → 写死纯色
3. 固定高度 + overflow:hidden → 全面放弃固定高度
4. `z-index: -1` ::before 渲染到前面 → 父元素不给 z-index

### Phase 2 技术设计（后做）

- `/uni-news-poster` 不带参数 = 自动模式：`find src/content/universities/*/news-{today}.md` → 三校 loop 调 Phase 1 的单校逻辑
- Hub 页 `src/static/uni-news-posters/index.html`：仿 `ai-news-posters/index.html`，按日期 × 学校双维卡片
- schedule trigger（新建）：每天 12:30 AEST 跑 `/uni-news-poster` 再 `/publish`

### Phase 3 前端接入（后做）

- `config.ts` 新增：
  ```ts
  const universities = defineCollection({
    loader: glob({ pattern: '*/news-*.md', base: './src/content/universities' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      publishDate: z.coerce.date(),
      university: z.string(),
      universityName: z.string(),
      universityNameCn: z.string(),
      tags: z.array(z.string()).default([]),
    }),
  });
  ```
- `build.ts` manifest 多一段 `universities: [{ slug: "{school}-news-{date}", contentUrl, ... }]`
- `sync-to-db.ts` 把 uni news 写进 posts（`source: "jr-wiki"` 复用从 GitHub 读 md 的后端逻辑，官网前端零改）
- 官网访问路径：`/blog/{school}-news-{date}`（Phase 3 如果要做专属 `/universities/{school}` 聚合页，独立 PRD）

## 小红书敏感词规则的存放位置

**不依赖 `~/.claude/skills/xhs-review`。** 原因：

- schedule 跑 `/uni-news-poster` 的 remote 环境不会加载用户级 claude.ai skill
- 规则漂移风险：xhs-review 升级后大学新闻 pipeline 不知道
- 教育/留学场景有独有敏感词（包过、保录取、中介）xhs-review 没覆盖

所以 `.claude/skills/uni-news-poster.md` 里**内嵌完整敏感词清单 + 人性化改写规则**，作为 pipeline 的一部分跟着 jr-wiki 版本走。

如果 `xhs-review` 有通用部分升级了，手动同步到本 skill（在本 skill 头部 frontmatter 加 `sync-source: xhs-review@1.0` 标注版本，方便 diff）。

## Metrics

### Phase 1 验收（本周）
- 手动跑 `/uni-news-poster 2026-04-19 uq` 能在 `src/static/uni-news-social/2026-04-19/uq/` 产出 `mp-article.html` + `xhs-drafts.md` + `xhs-covers.html`
- `xhs-covers.html` 每张封面点「⬇ 下载 PNG」导出 1374×1792，pixel-level 和预览一致，底色是 UQ 紫
- `mp-article.html` 在 Chrome 里点 📋 复制 → 粘到 Gmail/公众号草稿能看到深色 hook 胶囊 / UQ 紫色 section 底 / 黄色 oneline
- `xhs-drafts.md` 的扫描表格能抓出至少"最好"、"包过"、"加V"这类触发词
- 小红书字数 600-800，标题 ≤20 字（含 emoji）

### Phase 2 成功指标（3 个月）
- 每天 3 校自动产出 ≥ 90% 成功率
- 运营当日发文时间从 ~90min（手排 3 校）降到 ≤ 15min（review + publish）

### 会让我们暂停的负面信号
- 敏感词扫描漏掉小红书封号 → 当月封号 ≥ 1 次 → 敏感词库紧急补
- 公众号粘贴后样式仍丢 → 回到 AI 新闻同款硬性校验 + 自检 grep

## 风险

- **品牌色侵权**：10 校官方 brand color 直接用，理论上商业使用需授权。当前海报 for marketing to prospective students 勉强算"信息性展示"，但如果被学校公关盯上要撤。**缓解**：Phase 1 先跑 UQ 看反应，有问题再改"平台色 + 学校名文字色块"的中性方案
- **md 内容质量**：当前 uni news md 是 AI 生成，偶尔引用链接 404 或 source 过时。**缓解**：Phase 2 加 WebFetch 校验，link 挂了的新闻跳过不做海报
- **schedule 超时**：1 校 = mp-article.html + xhs-drafts.md + xhs-covers.html（1-2 张封面）≈ 3 个文件。3 校一轮 ~9 文件，estimate 6-10 分钟。比原方案（含 4 张海报）快一倍，单个 trigger 跑得开
- **敏感词版本漂移**：xhs-review 升级没同步本 skill。**缓解**：skill 头部标 `sync-source` 版本号，季度 audit

## 时间线

| 里程碑 | 负责 | 预期时间 |
|---|---|---|
| PRD + `/uni-news-poster` skill MVP（UQ 单校） | Claude + 运营 review | 本周 |
| Phase 1 跑通 3 所学校 demo | 运营 | 下周 |
| Phase 2 schedule 每日自动 | Claude | 2 周内 |
| Phase 3 `config.ts` 接入 + sync | 开发 | schedule 稳定后 1 周 |

## 后续 PRD

- `UNI_NEWS_FRONTEND_PAGE_PRD.md` — 如果做 `/universities/{school}` 聚合专页
- `UNI_NEWS_MULTI_LANG_PRD.md` — 英文站大学新闻
