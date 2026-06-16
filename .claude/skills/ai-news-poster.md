---
name: ai-news-poster
description: "为每日 AI 头条生成 '1 张合集 + 5 张单图' 海报套装（1242×1660 竖版，Neo-Brutalism 设计，沿用 quest-posters / xhs-poster 色板）。输出到 src/static/ai-news-posters/{YYYY-MM-DD}/index.html，自动更新 ai-news-posters hub 页。Use when user wants to produce daily AI news posters for Xiaohongshu / 朋友圈 / 公众号封面, or run the scheduled AI 每日头条海报 pipeline."
argument-hint: "[YYYY-MM-DD 可选，默认今天]"
---

# /ai-news-poster — AI 每日头条海报生成器

把 jr-wiki `/ai-daily-news` 产出的 Top 5 新闻，转成一套可直接投放的海报素材：1 张合集大图 + 5 张单图。全部 1242×1660 竖版（小红书聚光 / 朋友圈主图标准），Neo-Brutalism 风格对齐整个 curriculum 矩阵。

## 🚨🚨🚨 硬性要求（无任何例外，schedule 也必须遵守）

**整张海报必须用 `_lib/poster-renderer.v1.js` 共享库渲染。** daily `index.html` 只是数据 + 一次 `PosterRenderer.renderAll()` 调用，**不要重写画法、不要抄画法、不要引 html2canvas**。

### 为什么——踩过的坑
html2canvas 1.4.1 对 `em` padding + 大字号（≥80px）+ `text-wrap: balance` 组合会**直接吞掉整行文字**，下载下来的 PNG 里标题那一行完全消失（2026-04-21 事故就是这个，用户手动找出来的）。还踩过字号溢出、字宽测不准、字体加载时序等问题。

Canvas 2D 的 `ctx.measureText()` 能精确预量字宽、`fitText()` 二分缩字号，完全不依赖 DOM 布局——这是"字放在固定框里"场景的唯一稳健方案。

### 架构：画法在库，daily 只填数据
```
src/static/ai-news-posters/
├── _lib/
│   └── poster-renderer.v1.js     ← 画法 / UI 脚手架 / 事件 / QR（长期稳定，不要随便改）
├── 2026-04-21/
│   └── index.html                ← 瘦壳：只有 NEWS / SUMMARY 数据 + renderAll()
├── 2026-04-22/
│   └── index.html                ← 同上，150 行以内
└── ...
```

**版本化**：库是 `poster-renderer.v1.js`，以后设计有突破性变化才做 `v2.js`，老页面的 `v1.js` 永不动。

### 📋 daily index.html 唯一正确模板（照抄即可）

```html
<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 每日头条海报 · {DATE}（Canvas 版）</title>
<meta name="description" content="{DATE} AI 日报 · 1 张合集 + 5 张单图海报，Canvas 2D 原生绘制，自带二维码扫码看原文。">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
<script src="../_lib/poster-renderer.v1.js"></script>
</head>
<body>
<script>
const SUMMARY = {
  slug: 'digest',
  frameLabel: 'P0 · 合集 <em>· Top 5 一图看完</em>',
  tags: ['合集封面', '适合首图', '今日 5 条一图扫完'],
  hook: [
    { text: '今天 ' },
    { text: '5 条', hl: true },   // hl=true 的 token 在合集大字上会带黄色荧光笔下划线
    { text: '\nAI 大新闻' },       // \n 显式换行
  ],
  sub: '一图看完 · 匠人 AI 日报',
  items: [
    { num: '01', numColor: '#ff5757', cat: '类别', t: '完整标题（用 fitText 自动缩字号）' },
    // ... 5 条
  ],
};

const NEWS = [
  {
    slug: '01-slug',                          // 文件名 slug（下载 PNG 用）
    frameLabel: 'P1 · 单图 <em>· 简短标题</em>',
    tags: ['类别', '关键词', '关键词'],
    idx: '01', catText: '安全监管', accent: '#ff5757',   // accent = 点 / 左色边 / b-key 颜色
    bg: { topRight: 'rgba(255,87,87,0.14)', top: '#fff7f5', mid: '#ffffff', bot: '#fff7ef' },
    title: [
      { text: '前半段，' },
      { text: '黄色高亮段', hl: true },       // em 效果：黄色背景 + 圆角
      { text: ' 后半段' },
    ],
    titleSize: 82,                            // 82 是默认；字多就 76、78
    oneline: [
      { text: '引言前半' },
      { text: '红色加粗段', bold: true },     // b 效果：红色 900 字重
      { text: '，引言后半' },
    ],
    bullets: [
      { k: '发生了什么', v: '1-2 句话说清楚事件本身。' },
      { k: '为什么重要', v: '说清楚这事为什么值得关注。' },
      { k: '对你的影响', v: '给读者具体可操作的建议。' },
    ],
    src: '📎 source1.com · source2.com',
  },
  // ... 5 条（accent / bg 参照下方"配色对照表"）
];

PosterRenderer.renderAll({ DATE: '{DATE}', SUMMARY, NEWS });
</script>
</body>
</html>
```

### 5 张单图推荐配色（已在 2026-04-21 验证）
| 位置 | accent | bg.topRight | bg.top → bot |
|------|--------|-------------|--------------|
| P1 | `#ff5757` 红 | `rgba(255,87,87,0.14)` | `#fff7f5` → `#fff7ef` |
| P2 | `#7c3aed` 紫 | `rgba(124,58,237,0.16)` | `#faf7ff` → `#f7f4ff` |
| P3 | `#10b981` 绿 | `rgba(16,185,129,0.16)` | `#f2fff8` → `#effff6` |
| P4 | `#3b82f6` 蓝 | `rgba(59,130,246,0.16)` | `#f4f9ff` → `#eff5ff` |
| P5 | `#ff8a3d` 橙 | `rgba(255,138,61,0.16)` | `#fff7f1` → `#fff4eb` |

### 库里已经帮你做好的事（所以你不用再管）
- 1242×1660 黑框 + offset 阴影 + 右上角点阵装饰
- 标题 em 黄色高亮块（`layoutTokens` 按 token 换行 + `fillRect` 画背景）
- 一句话黄底 + 红色加粗
- 3 条 bullets（左色边 + b-key 大写 mono + b-val 正文）
- 底栏分隔线 + 左侧 src/brand 文字 + **右下角 168×168 二维码**（自动指向 `https://jiangren.com.au/blog/ai-daily-{DATE}`）
- 页面外壳（header / 全部下载按钮 / grid / lightbox / toast / 复制链接）
- `await document.fonts.ready` 之后才画
- 下载按钮 = `canvas.toDataURL('image/png')`

### 🚨 二维码（硬规）
- 每张海报右下角，168×168 像素，内容 = `https://jiangren.com.au/blog/ai-daily-{YYYY-MM-DD}`
- 6 张海报指向同一篇当天文章（不做 per-item anchor）
- 白底黑块、3px 黑描边、16px quiet zone
- **由库自动画**，你只需要保证 `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>` 加在库 `<script>` 之前

---

## 🔒 固定规格

| 项目 | 规格 |
|------|------|
| 尺寸 | **1242 × 1660**（3:4 竖版）锁死，不给备选 |
| 产出数量 | **1 合集（summary）+ 5 单图 = 6 张 / 天** |
| 下载 | 每张图下方「⬇ 下载 PNG」= `canvas.toDataURL('image/png')`（**严禁 html2canvas**） |
| 二维码 | 每张海报**右下角 ≥160×160**，内容固定 = `https://jiangren.com.au/blog/ai-daily-{YYYY-MM-DD}` |
| 输出目录 | `src/static/ai-news-posters/{YYYY-MM-DD}/index.html` |
| 汇总 hub | `src/static/ai-news-posters/index.html`（仿 `posters.html` 的卡片列表） |

## 🎨 设计语言（对齐 quest-posters.html）

### 色板（CSS 变量）
```css
--brand-red: #ff5757;    /* 强调 / highlight */
--brand-dark: #10162f;   /* 边框 + 文字主色 */
--brand-yellow: #ffce44; /* h2 em 下划线 / 合集番号 */
--brand-blue: #3b82f6;   /* 链接 / 次信息 */
--brand-green: #10b981;  /* 正面 / 新版 */
--bg-light: #f8f9fb;
--bg-cream: #fff1e7;
```

### Neo-Brutalism 要点
- 外层 `.poster` 留纯矩形 + padding（避免 html2canvas 圆角截图 bug）
- 内层 `.p-inner` 5px 黑边 + 36px 圆角 + offset shadow `6px 6px 0 var(--brand-dark)`
- 右上角点阵装饰（`radial-gradient` 1.5px dots, 28px spacing, opacity 0.1）
- h2 em 黄色下划线高亮

### 字体
- `Noto Sans SC` 900/700/500（主）
- `JetBrains Mono` 700（番号 / 日期 / category 标签）
- `Bricolage Grotesque` 900（合集大 hook）

### 字号铁律（1242 画布下的基准，手机端可读）

| 元素 | 画布字号 | 手机端 |
|------|---------|-------|
| 合集 hook（封面大字） | 140-160px | 42-48px |
| h2 新闻标题 | 92-100px | 28-30px |
| 一句话（高亮段） | 56-60px | 17-18px |
| 正文 / 列表 | 48px | 14px |
| 番号 / 标签 / 日期 | 36-44px | 11-14px |

**禁止正文低于 48px、h2 低于 92px。** 写完自查：手机上看不清 = 重做。

## 📐 两种海报的结构

### A. Summary 合集海报（1 张，放 Top 5 标题）

```
┌─────────────────────────────┐
│ AI 每日头条 · 2026-04-09    │  <- eyebrow（黑底白字小带）
│                             │
│  今天 5 条 AI 大新闻        │  <- h2 hook（100-140px）
│  一图看完                   │
│                             │
│  01  Anthropic 反超 OpenAI  │  <- 5 条编号列表，每条 60-72px
│  02  Claude Mythos 越狱     │     左侧大番号 + 新闻标题
│  03  3.5 GW TPU 扩容        │
│  04  Microsoft MAI 脱钩     │
│  05  Qwen 3.6 Plus 登顶     │
│                             │
│  🏷 jr-wiki/blog/ai-daily   │  <- 底栏 brand bar
│  📰 JR Academy AI 日报       │
└─────────────────────────────┘
```

### B. 单图海报（5 张，每条一张）

```
┌─────────────────────────────┐
│ 01 / 05    2026-04-09       │  <- 番号 + 日期（顶栏）
│ ● 模型发布                   │  <- category dot 标签
│                             │
│  Anthropic 营收年化          │  <- h2 新闻标题（92-100px）
│  破 300 亿，反超 OpenAI      │
│                             │
│ ┌─────────────────────────┐ │
│ │ 一句话：Anthropic 15 个 │ │  <- 黄底高亮引文块
│ │ 月翻 30 倍，训练烧的钱  │ │     56-60px
│ │ 只有 OpenAI 的 1/4     │ │
│ └─────────────────────────┘ │
│                             │
│  · 发生了什么                │  <- 3 条要点（48px）
│    Anthropic 从 10 亿...     │
│  · 为什么重要                │
│    商业结构 80% 来自企业...  │
│  · 对你的影响                │
│    Claude API 配额会...      │
│                             │
│  📎 来源 tradingkey.com      │  <- 底栏 source + brand
│  📰 JR Academy AI 日报       │
└─────────────────────────────┘
```

### 必须有的元素（每张都必须）
- **日期 bar**（顶栏 `YYYY-MM-DD`）
- **番号**（单图显示 `01 / 05`，合集显示 `DIGEST`）
- **brand bar 底栏**（`📰 JR Academy AI 日报 · jiangren.com.au/blog`）

不要放二维码 / 联系方式 / 绝对化用语（和 xhs-poster 聚光合规一致）。

## 📥 内容数据源

### 优先级
1. **首选**：同日 jr-wiki 已存在的 `ai-daily-{date}.md`
   - 路径：`jr-wiki/src/content/articles/ai-daily-{YYYY-MM-DD}.md`
   - 从 frontmatter `description` 提取 5 条 headline
   - 从每个 `## N. 标题` section 提取：标题、一句话、前 2 段正文、来源链接
2. **次选**：当天跑一次 `/ai-daily-news`（在 jr-wiki 目录）获取 md
3. **兜底**：WebSearch 现找 Top 5

### 字段映射

海报上的每条新闻需要这几个字段：
```yaml
index: 1              # 01-05 番号
category: 模型 / 融资 / 监管 / 工具 / 人事  # 单图顶栏标签
title: "新闻标题（h2，≤ 22 字）"
oneLine: "一句话（高亮块，30 字以内）"
bullets:
  - key: 发生了什么, value: "…（40 字以内）"
  - key: 为什么重要, value: "…"
  - key: 对你的影响, value: "…"
source:
  name: "媒体名"
  url: "原文链接"
```

category 推荐词：模型发布 / 营收融资 / 算力硬件 / 安全监管 / 开源工具 / 人事变动 / 产品更新 / 行业政策

## 🛠 执行步骤

### Step 1. 确认日期 + 拉原始新闻

```bash
# ⚠️ 必须用 Australia/Sydney 时区取日期
# Claude Code 调度器通常跑在 UTC / 美国时区，直接 date +%Y-%m-%d 会拿到昨天的日期
# → schedule 会误判"今天已生成"直接退出，当天内容漏产
DATE=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}
```

读 `jr-wiki/src/content/articles/ai-daily-{DATE}.md`。读不到 → 报错提示先跑 `/ai-daily-news`。

### Step 2. 提取 5 条新闻

从 md 里 parse：
- frontmatter.title → 合集 hook 的副标题来源
- frontmatter.description → 5 条一句话 summary
- 正文每个 `## N.` block → 单条完整字段

### Step 3. 生成输出文件（单 HTML 承载 6 张）

路径：`src/static/ai-news-posters/{DATE}/index.html`

一个 HTML 文件塞下所有 6 张海报：
- 顶部：页面标题 + 预览缩放（`transform: scale(0.38)`）
- 依次 6 个 `.poster-frame`（summary + 5 单图），每张自带下载按钮
- 左侧固定缩略图导航（可选，6 个不多不需要）
- 底部：复用 xhs-poster 的 html2canvas 下载脚本

> 参考实现模板：见下文「HTML 骨架」章节，直接复制改数据。

### Step 4. 更新 hub 页

`src/static/ai-news-posters/index.html` 是所有日期的汇总入口（仿 `curriculum/posters.html` 的卡片列表）。每次新生成一天，就在 hub 页顶部插一张新卡片：

```html
<a class="day-card" href="./2026-04-09/">
  <div class="day-cover" style="background: linear-gradient(135deg, #10162f 0%, #ff5757 100%);">
    <div class="d-date">2026-04-09</div>
    <div class="d-hook">Anthropic 反超 OpenAI</div>
  </div>
  <div class="day-body">
    <div class="d-tag">AI 日报</div>
    <div class="d-list">
      <div>01 · Anthropic 营收破 300 亿</div>
      <div>02 · Claude Mythos 沙箱越狱</div>
      <div>03 · 3.5 GW TPU 扩容</div>
      <div>04 · Microsoft MAI 脱钩</div>
      <div>05 · Qwen 3.6 Plus 登顶</div>
    </div>
    <div class="d-meta">6 张 · 1242×1660 · 点击进入下载</div>
  </div>
</a>
```

Hub 页骨架同 `posters.html` 视觉（`#fff1e7` 底 / 3px 黑边 / `6px 6px 0 #000` offset shadow）。

### Step 5. 首次启用必做（仅首次）

1. **注册到 `curriculum/posters.html`**（CLAUDE.md 强制规则 2）
   - 在顶部"工具/资产集合"section 插入入口卡片指向 `./ai-news-posters/`
2. **更新 `.github/workflows/deploy.yml`**（CLAUDE.md 强制规则 1）
   - 在 Assemble 步骤加：
     ```yaml
     if [ -d ai-news-posters ]; then
       cp -r ai-news-posters _site/ai-news-posters
     fi
     ```

### Step 6. 输出说明

```
✅ AI 新闻海报 {DATE} 生成完成

目录: src/static/ai-news-posters/{DATE}/
├─ index.html            6 张海报（1 合集 + 5 单图）
预览: cd curriculum && python3 -m http.server 8090
     → http://localhost:8090/ai-news-posters/{DATE}/
Hub: http://localhost:8090/ai-news-posters/

导出:
- 每张海报下方点「⬇ 下载 PNG」，固定 1374×1792 带边框 + 投影
- 合集图适合：朋友圈、公众号文章头图、小红书单发
- 单图 5 张适合：小红书 carousel、社群每日 push
```

## 📝 HTML 骨架（直接改数据用）

所有结构、CSS、html2canvas 下载脚本见：
**`src/static/ai-news-posters/2026-04-09/index.html`**（demo 参考实现，直接拷贝改新闻数据）

关键 section：
- `:root` CSS 变量（brand color + 字号基准）
- `.poster-frame` / `.poster-scaler` / `.poster` / `.p-inner` 三层结构
- `.summary` class（合集样式） vs `.single` class（单图样式）
- `.dl-btn` + 底部 `<script>` 下载逻辑（从 xhs-poster 复制）

## 🚫 绝对禁止

1. **锁死 poster 高度为固定 1660** —— 必须 `height: auto`，内容自然撑开。锁高度会导致 overflow 截断、下载和预览不一致
2. 改 ratio 宽度（1242 写死，高度由内容决定）
3. 少于 6 张（1 合集 + 5 单图必须齐）
4. 营销套话（"在当今快速发展的 AI 时代" 立刻删）
5. 编造新闻 / 模糊来源（每条必须有真实 source url）
6. 正文 < 48px / h2 < 92px（手机看不清）
7. 没有日期 bar + 番号 + brand 底栏（三件套缺一不可）
8. 没有 html2canvas 下载按钮（每张必须能导出）
9. 首次启用忘记改 `posters.html` + `deploy.yml`（线上 404）

## 🚨 html2canvas 1.4.1 踩坑记录（血泪，每次必读）

### 坑 1: `box-shadow: Xpx Xpx 0 #dark` + inline 文字 → 文字被吞

**症状**: `.p-oneline` 带 offset 投影 + 包含 `<b>` inline 文字时，导出 PNG 里整块 oneline 只剩 `<b>` 文字漂浮，中间大段正文消失。

**原因**: html2canvas 1.4.1 对 offset box-shadow 的渲染路径有 bug，投影被错误地叠加在 inline 文字上。

**修法**: 用 `.p-oneline-wrap`（父 wrapper + `::before` 伪元素画一块 offset 深色矩形）替代 `box-shadow`。JS 在 load 时自动把 `.p-oneline` 包进 wrap：

```js
document.querySelectorAll('.p-oneline').forEach(el => {
  if (el.parentElement?.classList.contains('p-oneline-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'p-oneline-wrap';
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);
});
```

```css
.p-oneline-wrap { position: relative; z-index: 2; }
.p-oneline-wrap::before {
  content: ''; position: absolute;
  left: 10px; top: 10px; width: 100%; height: 100%;
  background: #10162f; border-radius: 28px; z-index: 0;
}
.p-oneline { position: relative; z-index: 1; /* 在 wrap 内排于 ::before 之上 */ }
```

**同类元素也必须改**: 任何 offset box-shadow 在包含 inline 文字的块上都要改这种 wrapper 模式，或干脆去掉投影用加粗黑边替代。

### 坑 2: `getComputedStyle(el).background` 丢 linear-gradient

**症状**: 尝试读 `.poster-scaler` 的 background 复制给 `.poster-export-stage`，stage 渲染成完全透明 → 下方 shadow block 整个透过来盖住 poster。

**原因**: `background` shorthand 的 computed value 形如 `"none 0% 0% / auto repeat scroll padding-box border-box rgba(0, 0, 0, 0)"` —— 把 linear-gradient 拆到了 `backgroundImage` 里，shorthand 丢了。

**修法**: 不要用 `scalerStyles.background` 复制，直接写死纯色 `#ffffff`（或 `backgroundImage` + `backgroundColor` 分开读）。

### 坑 3: 固定 1660 高度 + `overflow:hidden` → 下载和预览不一致

**症状**: 预览看起来正常（transform scale），下载出来内容被截断或挤压。

**原因**: 56px 字号正文 + 3 bullets + title 常常自然高度就超过 1660。锁死高度 + overflow hidden 会截断，预览因 sub-pixel rounding 看起来"勉强"能塞下，导出时同样数据在 1:1 渲染就露馅。

**修法**: 全面放弃固定高度。
- `.poster { width: 1242px; height: auto; }`
- `.p-inner` 去掉 `height: 100%` 和 flex，纯 block
- `.p-brand { margin-top: 48px; }` 不再靠 `margin-top: auto`
- 下载脚本测 `clone.offsetHeight` 后算 `totalH` 传给 html2canvas

### 坑 4: `z-index: -1` 的 ::before 在 `z-index: 1` 父元素内渲染到前面

**症状**: 尝试用 `.s-item::before { z-index: -1 }` 做 offset shadow，结果 ::before 反而覆盖在 .s-item 的白色背景上面。

**原因**: 父元素 `z-index: 1`（正值）创建了 stacking context，子 ::before `z-index: -1` 仅在父的 context 内为 -1 —— 仍然 **高于**父自己的 background 层。

**修法**: 要么不给父元素 `z-index`（保持 auto），要么用 wrapper 方案（参考坑 1 的 `.p-oneline-wrap`）。

## ✅ 验证流程（每次生成完必跑）

```bash
cd curriculum && python3 -m http.server 8090
# 浏览器打开 http://localhost:8090/ai-news-posters/{date}/
```

1. 点每张「⬇ 下载 PNG」
2. **把下载的 PNG 和页面预览并排对比** —— 所有文字、颜色、投影、高亮必须 pixel-level 一致
3. 不一致的地方立刻回头查 box-shadow / linear-gradient / 固定高度 / z-index 这 4 个坑
4. 合规检查：无二维码 / 无绝对化用语 / 无联系方式

## 📰 公众号文章版（同目录独立页 mp-article.html + CI 预渲染 PNG）

海报页和公众号文章**拆成两个独立 HTML + 6 张真实 PNG**：

| 文件 | 作用 | 产出方式 |
|------|------|----------|
| `index.html` | 海报库：6 张大海报 + 下载按钮 + 📤 推送小红书按钮 | 手写（skill 主产出） |
| `mp-article.html` | 公众号发稿页：左手机预览文章 + 右操作面板 + 📤 推送公众号按钮 | 手写（skill 主产出） |
| `xhs-caption.json` | 小红书短文案（标题 ≤20 字 / 正文 ≤1000 字 / tags 数组 / headlines 元数据） | 手写（skill 主产出，见下文 schema） |
| `poster-0.png` … `poster-5.png` | 真实 PNG 文件，1242×1660 | **CI 自动** —— `scripts/render-ai-news-posters.mjs` 用 puppeteer-core + `page.screenshot` 把 6 个 `.poster` 元素从 `dist/ai-news-posters/{date}/index.html` 拍照产出到同目录 |

**为什么 PNG 必须是真实文件**：公众号编辑器粘贴 HTML 时，`<img src="data:image/png;base64,...">` 会被丢弃；`<img src="https://...poster-0.png">` 会被自动抓取 re-host 到它自己 CDN → 实现真正的"一次 Ctrl+V 完成发稿"。

### 🚨 硬性要求：每天新建 mp-article.html 时，复制函数必须把 class 样式展开成 inline style

> **适用范围**：这节要求对**每一天**跑 `/ai-news-poster` 新产出的 `ai-news-posters/{YYYY-MM-DD}/mp-article.html` 都生效——不是一次性改老文件，是每天新建文件必带的能力。以下限制 + 校验清单每次都要过。

**2026-04-18 实测（已验证粘贴到 mp.weixin.qq.com 能保留背景色/颜色/边框）**

公众号编辑器（mp.weixin.qq.com）在粘贴 HTML 时会：

1. **剥掉 `<style>` 标签** — 所有 class-based CSS 规则全部失效
2. **剥掉 class 属性的视觉效果** — 保留 class 字符串但不应用任何样式
3. **不解析 CSS 变量** — `var(--brand-red)` 直接按文字处理
4. **剥掉 `background:` shorthand** — **必须改用 `background-color:`**
5. **不认短 hex** — `#000` 不灵，要 `#000000`
6. **丢弃 `rgba()` 的 alpha** — 必须改成纯 hex（如 `rgba(255,255,255,0.7)` → `#d1d5db`）
7. **裸 `<div>` 的 background 有时失效** — 需要额外包一层 `<section>`
8. **`<span style="display:inline-block;background-color:...">` 比 `<div>` 稳** — 小标签（如 `.mp-hook`）要用 span，不要 div

所以 `mp-article.html` 的 `mpCopyHtml()` 必须在序列化之前跑 `applyInlineStyles(article)`，做四件事：

1. 按 class 名查 `MP_INLINE_STYLES` 表把样式写回 `style=""`
2. 处理嵌套选择器：`.mp-meta .author` `.mp-oneline strong` `.mp-source a` `.mp-quickview h3/ul/li` `.mp-cta .big/.sub` + 正文 `<p>` + `<code>`
3. **把 `.mp-lead / .mp-oneline / .mp-quickview / .mp-cta` 外面再包一层 `<section style="background-color:...;padding:...">`**（双保险）
4. **把 `.mp-hook` 从 `<div>` 换成 `<span style="display:inline-block;background-color:...">`**

**新建 mp-article.html 时必须整段从 `src/static/ai-news-posters/2026-04-18/mp-article.html` 照搬 `MP_INLINE_STYLES` + `applyInlineStyles()` + `mpCopyHtml()` 三段**（第 411–498 行），只改日期、标题、正文数据。**不要自作主张精简或重写、不要把 `background-color` 还原成 `background` 简写**——漏了任何一条，粘贴到公众号就退化成黑白纯文本。

校验清单（mp-article.html 生成完、push 前必须 ✅）：
- [ ] `MP_INLINE_STYLES` 至少覆盖 12 个 class：`mp-title / mp-meta / mp-lead / mp-hook / mp-h2 / mp-img / mp-alt-img / mp-oneline / mp-source / mp-divider / mp-quickview / mp-cta`
- [ ] 全程用 `background-color:` 不用 `background:` 简写
- [ ] 全程用 6 位 hex（`#000000` 不是 `#000`）、不用 `rgba()`、不用 `var(--*)`
- [ ] `applyInlineStyles()` 里有 4 步：class 注入 / 嵌套选择器 / 彩块 section 外包 / mp-hook 转 span
- [ ] `mpCopyHtml()` 里拼 html 前调用了 `applyInlineStyles(article)`
- [ ] 复制后的 log 面板显示 `NN 处 background-color · NN 处 hex color`，数字不为 0
- [ ] 本地打开 html → 点 📋 复制 → 贴到 Notion 或 Gmail 草稿，能看到深色 hook 胶囊 / 红色左边框 / 黄色 oneline / 深色 CTA 块

若以上 ✅ 全过，粘贴到 mp.weixin.qq.com 图文编辑器（非 Safari，用 Chrome）即可保留全部视觉。

mp-article.html 生成时替换：
- `<title>`、`.mp-title`、`.mp-meta` 里的日期
- `.mp-lead`（引言，从 md 首段抄）
- 5 个 section：`.mp-hook`（分类）+ `.mp-h2`（标题）+ `<img class="mp-img" src="./poster-N.png" data-poster="poster-N" data-file="mp-0N-semantic.png">`（**真实 PNG 图片**，CI 会生成对应文件）+ `.mp-alt-img`（md 里的 Unsplash 图 URL）+ `.mp-oneline` + 3 段正文 + `.mp-source`
- `.mp-quickview` + `.mp-cta`
- `MP_POSTER_SLUGS` 映射：6 个 poster-id 对应的 `{ n, label, file }`（`file` 是下载时保存的文件名，如 `mp-02-opus47.png`；`src` 始终是 `./poster-N.png` 不变）

**字数目标**: 3000-4000 字（引言 + 5 条各 2-3 段 + 速览 + CTA）。低于 2500 退回重写。

**index.html 里必须有一条**: `.utility-bar` 的副文案末尾加 `想要公众号长文版 → <a href="./mp-article">📰 mp-article</a>` 链接。

## 📤 Chrome 插件推送钩子（MP_XHS_PUBLISHER_EXTENSION）

> 背景：`docs/MP_XHS_PUBLISHER_EXTENSION_PRD.md` 定义了一个 Chrome 插件，把本 skill 的产物一键填入公众号草稿 / 小红书草稿。Phase 0 的任务就是让本 skill 的产物自带插件约定的"推送按钮 + payload"——插件装没装都不影响页面本身功能；装了就能用。

### xhs-caption.json schema（每天必产）

```json
{
  "date": "2026-04-19",
  "shortTitle": "今日 AI 5 条大新闻｜一图看完",
  "shortBody": "小红书口语化的 ≤1000 字正文，分段 + emoji + 结尾引导关注。",
  "tags": ["AI每日新闻", "AIGC", "AI资讯", "Claude", "OpenAI"],
  "headlines": [
    { "index": 1, "category": "模型发布", "title": "Claude Opus 4.7 编码登顶" },
    { "index": 2, "category": "行业报告", "title": "Stanford AI Index 中美差距 2.7%" }
  ]
}
```

约束：
- `shortTitle` **≤20 字**（小红书硬限）
- `shortBody` **≤1000 字**（小红书硬限），**和 mp-article.html 的长文不一样**：口语化、短段、带 1-2 个 emoji、结尾写"关注 JR Academy 每天看"
- `tags` 固定 3 个（`AI每日新闻`/`AIGC`/`AI资讯`）+ 2 个按当天内容选（模型名/公司名）
- `headlines` 给插件做 UI 预览用，5 条 index + category + title 即可

### mp-article.html 必须新增「📤 推送公众号」按钮

在 `.topbar .acts` 的按钮行，紧跟现有「复制 MD」按钮后面加一个：

```html
<button class="btn" id="btn-push-mp" title="推送到 Chrome 插件，在公众号编辑页一键导入">📤 推送公众号</button>
```

JS 端新增 `pushMpToExtension()` 函数（放在 `mpCopyHtml` 同一 script 块）：

```js
async function pushMpToExtension() {
  const article = document.getElementById('mp-article').cloneNode(true);
  const base = new URL('.', location.href).href;
  article.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && src.startsWith('./')) img.src = new URL(src, base).href;
  });
  article.querySelectorAll('.mp-caption, .mp-alt-caption').forEach(n => n.remove());
  applyInlineStyles(article);
  const bodyHtml = '<section style="max-width:677px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Noto Sans SC\',sans-serif;font-size:15px;line-height:1.85;color:#222">' + article.innerHTML + '</section>';

  // 封面图：poster-0.png → base64（压缩到 JPEG 85% 控制 payload 体积）
  const coverResp = await fetch(new URL('./poster-0.png', base).href);
  const coverBlob = await coverResp.blob();
  const coverImageBase64 = await new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(coverBlob);
  });

  const DATE = document.getElementById('mp-article').querySelector('.mp-meta span:nth-of-type(3)')?.textContent?.trim() || '';
  const TITLE = document.getElementById('mp-article').querySelector('.mp-title')?.textContent?.trim() || '';
  const SUMMARY = (document.getElementById('mp-article').querySelector('.mp-lead')?.textContent?.trim() || '').slice(0, 120);

  const payload = {
    source: 'ai-news-poster',
    date: DATE,
    title: TITLE,
    summary: SUMMARY,
    wechat: {
      author: 'JR Academy AI 日报',
      bodyHtml,
      coverImageBase64,
    },
  };

  window.postMessage({ type: 'JR_PUBLISH_PAYLOAD', version: 1, target: 'wechat', payload }, '*');
  setStatus('📤 已推送到 Chrome 插件，切到 mp.weixin.qq.com → 新建图文 → 点顶栏「📥 导入」', 'done');
  log('📤 推送 payload ' + Math.round(JSON.stringify(payload).length / 1024) + ' KB，等插件接收');
}

// 事件绑定（和 btnCopyHtml 等其它按钮放一起）
document.getElementById('btn-push-mp').addEventListener('click', pushMpToExtension);
```

**注意**：插件**没装**时，`postMessage` 只是在页面自己的 window 里发一条消息没人听，不会报错——按钮行为安全，不影响现有复制/下载流程。

### posters/index.html 必须新增「📤 推送小红书」按钮

在 `.utility-bar .utility-actions` 的按钮组加一个：

```html
<button class="utility-btn secondary" id="push-xhs" type="button" title="推送到 Chrome 插件，在小红书创作页一键导入 6 图 + 文案">📤 推送小红书</button>
```

JS（放在现有下载脚本同一块）：

```js
async function pushXhsToExtension() {
  const btn = document.getElementById('push-xhs');
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '准备中...';

  try {
    // 1. 读 xhs-caption.json
    const captionResp = await fetch('./xhs-caption.json');
    if (!captionResp.ok) throw new Error('xhs-caption.json 缺失（skill 应生成）');
    const caption = await captionResp.json();

    // 2. 6 张海报 → base64（顺序：合集 + 5 单图）
    const images = [];
    for (let i = 0; i < 6; i++) {
      btn.textContent = `传图 ${i + 1}/6`;
      const resp = await fetch(`./poster-${i}.png`);
      const blob = await resp.blob();
      const b64 = await new Promise(resolve => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(blob);
      });
      images.push(b64);
    }

    const payload = {
      source: 'ai-news-poster',
      date: caption.date,
      title: caption.shortTitle,
      summary: caption.shortBody.slice(0, 120),
      xiaohongshu: {
        shortTitle: caption.shortTitle,
        shortBody: caption.shortBody,
        images,
        tags: caption.tags || [],
      },
    };

    window.postMessage({ type: 'JR_PUBLISH_PAYLOAD', version: 1, target: 'xiaohongshu', payload }, '*');
    btn.textContent = '✅ 已推送';
    setTimeout(() => { btn.textContent = oldText; btn.disabled = false; }, 2000);
  } catch (e) {
    btn.textContent = '❌ ' + e.message;
    setTimeout(() => { btn.textContent = oldText; btn.disabled = false; }, 3000);
  }
}

document.getElementById('push-xhs').addEventListener('click', pushXhsToExtension);
```

### schedule 自检补充

产出后 `/publish` 前，除了原有的 mp-article.html 自检，**还要**确认：

```bash
DIR=src/static/ai-news-posters/{DATE}
test -f $DIR/xhs-caption.json                            || echo "❌ 缺 xhs-caption.json"
grep -q "btn-push-mp" $DIR/mp-article.html               || echo "❌ mp-article.html 缺推送公众号按钮"
grep -q "push-xhs" $DIR/index.html                       || echo "❌ index.html 缺推送小红书按钮"
grep -q "JR_PUBLISH_PAYLOAD" $DIR/mp-article.html        || echo "❌ mp-article.html 缺 postMessage 信封"
grep -q "JR_PUBLISH_PAYLOAD" $DIR/index.html             || echo "❌ index.html 缺 postMessage 信封"
# xhs-caption.json 基本形状
node -e "const c=require('./$DIR/xhs-caption.json'); if(!c.shortTitle||c.shortTitle.length>20) throw Error('shortTitle 缺失或超 20 字'); if(!c.shortBody||c.shortBody.length>1000) throw Error('shortBody 缺失或超 1000 字'); if(!Array.isArray(c.tags)||c.tags.length<3) throw Error('tags 至少 3 个');"
```

## 🔗 相关 skill

- `/ai-daily-news`（jr-wiki 目录下）— 先跑这个生成 md，再跑本 skill
- `/xhs-poster` — 课程类小红书海报（结构类似，文案策略不同）

## 自动化 schedule 建议

在 `https://claude.ai/code/scheduled` 串联每日 3 步：
```
每天 9:00 AEST  cd jr-wiki && /ai-daily-news        # 产日报 md
每天 9:10 AEST  cd jr-wiki && /ai-news-poster       # 产 index.html + mp-article.html 双页
每天 9:15 AEST  cd jr-wiki && /publish              # push + 部署
```

### 🚨 schedule 跑 `/ai-news-poster` 的硬性要求：mp-article.html 必须带完整 inline style CSS

**为什么在 schedule 里再提一次**：定时任务每天自动跑、没人盯着。一旦某天生成的 mp-article.html 漏了 `MP_INLINE_STYLES` 或 `applyInlineStyles()`，运营早上 Ctrl+V 到公众号草稿 → 整篇文章直接变黑白纯文本（红色左边框、黄色 oneline、深蓝 CTA 全丢）→ 当天推文报废。

schedule 每次跑这个 skill，产出 mp-article.html 都必须满足：

1. **`MP_INLINE_STYLES` 常量完整** — 覆盖 `mp-title / mp-meta / mp-lead / mp-hook / mp-h2 / mp-img / mp-alt-img / mp-oneline / mp-source / mp-divider / mp-quickview / mp-cta` 至少 12 条；新增 `.mp-*` class 必须同步新增映射
2. **`applyInlineStyles(root)` 函数完整** — 含嵌套选择器（`.mp-meta .author / .mp-oneline strong / .mp-source a / .mp-quickview h3/ul/li / .mp-cta .big/.sub`）+ `<p>` + `<code>` 注入
3. **`mpCopyHtml()` 拼 html 字符串前必须调 `applyInlineStyles(article)`**
4. **所有颜色/背景/边框值必须是具体 hex**，禁止 `var(--*)`（公众号不解析 CSS 变量）
5. **外层 `<section>` wrapper 自带 inline style**（`max-width / font-family / font-size / line-height / color` 直写在 `style=""`）

**schedule 完成自检（产出后、`/publish` 前必跑）**：
```bash
DATE={YYYY-MM-DD}
DIR=src/static/ai-news-posters/$DATE
MP=$DIR/mp-article.html
IDX=$DIR/index.html
LIB=src/static/ai-news-posters/_lib/poster-renderer.v1.js

# -------- mp-article.html（inline style） --------
grep -q "const MP_INLINE_STYLES" $MP       || echo "❌ 缺 MP_INLINE_STYLES"
grep -q "function applyInlineStyles" $MP   || echo "❌ 缺 applyInlineStyles"
grep -q "applyInlineStyles(article)" $MP   || echo "❌ mpCopyHtml 没调 applyInlineStyles"
! grep -q "var(--" $MP                     || echo "⚠️ 还有 var(--*)，公众号不认"

# -------- index.html（瘦壳：必须走共享库）--------
! grep -q "html2canvas" $IDX                        || echo "❌ index.html 还在引 html2canvas，必须去掉"
grep -q "_lib/poster-renderer.v1.js" $IDX           || echo "❌ index.html 没引 _lib/poster-renderer.v1.js（画法必须走 lib）"
grep -q "qrcode-generator" $IDX                     || echo "❌ index.html 没引 qrcode-generator，QR 画不出来"
grep -q "PosterRenderer.renderAll" $IDX             || echo "❌ index.html 没调 PosterRenderer.renderAll"
grep -q "DATE: '$DATE'" $IDX                        || echo "❌ index.html 的 DATE 参数不是 $DATE"
LINES=$(wc -l < $IDX)
[ "$LINES" -le 250 ]                                || echo "⚠️ index.html 超过 250 行（瘦壳应该 ~150 行），可能又在重写画法"

# -------- 库本身必须存在 + 仍然是 Canvas 2D --------
[ -f "$LIB" ]                                       || echo "❌ 缺 $LIB"
grep -q "document.fonts.ready" $LIB                 || echo "❌ $LIB 没等字体就绪"
grep -q "toDataURL" $LIB                            || echo "❌ $LIB 下载不是 toDataURL"
! grep -q "html2canvas" $LIB                        || echo "❌ $LIB 混入 html2canvas，必须拿掉"
```

**任何一条不通过都禁止进入 `/publish`**：
- mp-article 类失败 → 修 mp-article.html
- index.html 不走 lib / 超 250 行 → **重写成"数据 + renderAll() 一行"瘦壳**，不允许在 daily html 里塞画法代码
- lib 被改坏 → `git checkout $LIB` 回滚（画法稳定，不随便动）

产出当天由 GitHub Actions 自动部署到 `https://jr-academy-omni.github.io/jr-wiki/ai-news-posters/{YYYY-MM-DD}/`：
- `index.html` — 海报库（小红书 / 朋友圈 / 公众号素材）
- `mp-article.html` — 公众号发稿页（等渲染进度 100% 后复制/下载，复制出来的富文本必须带全部 inline style）
