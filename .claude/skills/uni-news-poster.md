---
name: uni-news-poster
description: "3 校每日大学新闻 · 小红书 + 公众号素材。**新架构（2026-04-24 起）**：agent 只写 src/content/universities/{school}/news-{DATE}.md（新闻 md）+ src/data/uni-news/{school}/{DATE}.json（结构化数据），xhs-posters.html / mp-article.html / xhs-drafts.md / blog md 全由 `bun run build:uni-news` pipeline 渲染。设计目标：把 agent 单校产出从 ~100KB HTML 压到 < 20KB，规避 Stream idle timeout。"
argument-hint: "[YYYY-MM-DD 可选] [school slug 可选 · 不传则当天轮换 3 校]"
---

# /uni-news-poster — 数据驱动版（2026-04-24 重构）

## 🚨 为什么用新架构

**老架构**：agent 每校要手写 `xhs-posters.html`（60KB，5 图 carousel + copy 面板 + html2canvas）+ `mp-article.html`（40KB，全 inline style）+ `xhs-drafts.md` → **单校 ~100KB，3 校 ~300KB**，routine 执行 15-20 分钟，频繁撞 `Stream idle timeout`。

**新架构**：
- agent 只写 `src/content/universities/{school}/news-{DATE}.md`（上游新闻 md，8-12KB）+ `src/data/uni-news/{school}/{DATE}.json`（结构化数据，15KB）
- pipeline 渲染 `xhs-posters.html` + `mp-article.html` + `xhs-drafts.md` + 官网 `src/content/articles/uni-news-{school}-{DATE}.md`
- 单校 agent 产出 ~25KB，3 校 ~75KB，routine 预计 3-5 分钟

**禁止 agent 碰**：HTML / inline style / html2canvas / MP_INLINE_STYLES / xhs-shared.js —— 这些由 template + pipeline 处理。

## 🛠 执行步骤

### Step 0. 日期 + 选 3 校（AEST 强制）

```bash
DATE=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}
SCHOOL=$2   # 可空 → 自动选轮换 3 校（仅核心 6 校池）

if [ -z "$SCHOOL" ]; then
  # 🚨 自动选校只走「核心 6 校」池 —— 用户明确要求，UTS/UWA/ANU/RMIT 没有发布渠道，scheduled 永不跑这 4 校
  # 核心 6 校：uq / umelb / unsw / usyd / monash / adelaide
  # 选最久没更新的 3 校
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
else
  # 手动指定时不限制（10 校文件结构都在，运营手动跑 ANU/RMIT/UTS/UWA 仍然能跑）
  SCHOOLS=$SCHOOL
fi
```

**🚨 池子规则铁律**（2026-04-24 用户怒了之后立的）：

| 池子 | 学校 | scheduled | 手动 `/uni-news-poster $DATE $SCHOOL` |
|---|---|---|---|
| 核心 6 | UQ / UMelb / UNSW / USYD / Monash / Adelaide | ✅ 每天 3 校轮换 | ✅ |
| 边缘 4 | ANU / RMIT / UTS / UWA | ❌ **永远不跑** | ✅（运营手动） |

**Why**：用户的发布渠道（小红书 6 个学校账号 + 公众号 6 个）只覆盖核心 6 校。跑边缘 4 校 = 内容做出来没地方发 = 浪费 API + 浪费 token。

任何修改这个 skill 时，**禁止**：
- 把池子写成 10 校 / "全部学校"
- 在 schedule 路径里加 ANU/RMIT/UTS/UWA 选项
- 在自动逻辑里"轮换"/"周日跑边缘校" —— 这条规则之前在 memory 里是错的，2026-04-24 已纠正

### 🚨🚨🚨 Step 0.5. 反幻觉硬规则（2026-05-22 真翻车后立的铁律）

**事故回放**：2026-05-18 UQ 这条把 Science International Scholarship 写成"自动评估、10%-25% 学费减免按学术成绩分档"——**全是编的**。官方原文是"需要单独提交 personal statement，AUD $5,000 一次性减免（仅 1 学期）"。Agent 看到截止日期就开始按"UQ 其他奖学金的常见套路"猜申请方式和金额，**根本没打开 scholarships.uq.edu.au 那个 URL**。这种内容真发出去 = 误导学生申请 = 砸 JR Academy 的招牌。

**铁律**（违反一条直接 `exit 1`，**不准用"我推测/通常来说/一般而言"绕过**）：

1. **任何"金额/学费/百分比/分档/天数/GPA 门槛/IELTS 分数/申请方式/材料清单/课程时长/资格要求"**——这些**事实性细节**必须满足：
   - 已在官方 source URL（`{校}.edu.au` / `scholarships.{校}.edu.au` / `study.{校}.edu.au` / `handbook.{校}.edu.au` / 等官方域名）上**用 WebFetch 真打开过**
   - 在 JSON 的 `news[i].sourceQuote` 字段里**贴出官方原句（首选英文原文）**作为证据
   - 没有原文证据的细节 = **删掉这句**，不允许"按常见模式猜"
2. **禁止从校外信息源（小红书 / 知乎 / 留学中介公众号 / 中文留学媒体）提取事实细节**。这些只能用来"发现选题"，**不能当 source quote**。最终事实必须回到学校官方域名核对。
3. **xhsCopy / drafts 里的"小纠结/个人判断/我也在犹豫"**只能用在"我在纠结申 A 还是 B" / "备考节奏怎么排" 这种**主观学习选择**上，**严禁**用在"申请方式/金额/资格/截止细节"等**事实陈述**上。具体说：
   - ✅ 允许："我猜大家最关心的是 GPA 能拿到哪档"——这是**问问题**
   - ❌ 禁止："减免范围是 10%-25% 学费，按学术成绩分档"——这是**断言**，必须 sourceQuote 兜底
   - ❌ 禁止："不需要单独申请，系统自动评估"——同上
4. **`description` / `lead` / `h2Sub` 这些摘要字段**禁止出现没在 `bullets` 里有 sourceQuote 支撑的事实陈述。摘要只能复述已有证据的内容，不能"补充"新事实。

### Step 1. 为每校搜 2-3 轮真实新闻（并发）

重点搜每校官方新闻源 + 中文留学媒体的当周报道：
- `news.uq.edu.au` / `about.uq.edu.au/news` / `uq.edu.au/news-events`（UQ）
- `news.unimelb.edu.au`（UMelb）
- `newsroom.unsw.edu.au`（UNSW）
- `sydney.edu.au/news-opinion`（USYD）
- `monash.edu/news`（Monash）
- `anu.edu.au/news`（ANU）
- `adelaide.edu.au/newsroom`（Adelaide）
- `rmit.edu.au/news`（RMIT）
- `uts.edu.au/news`（UTS）
- `uwa.edu.au/news`（UWA）

筛选标准（选 3 条 / 校）：
- ✅ 发布日期在 `{DATE}` 前 7 天内
- ✅ 对中国留学生有直接影响：奖学金 / 招生 / 签证 / 学费 / 课程 / 科研合作 / 校园动态
- ✅ 有真实 source URL（news.uq.edu.au/... 这种）
- ❌ 不要：董事会人事 / 员工 PhD 成就 / 小范围内部通知

### Step 2. 写 `src/content/universities/{school}/news-{DATE}.md`（上游）

frontmatter:
```yaml
---
title: "{学校中文名} {MM月DD日} {一句话三条新闻概括，含学校英文名和关键词}"
description: "..."
publishDate: {YYYY-MM-DD}
tags: [uni-news, {school}]
university: "{school}"
universityName: "{英文名}"
universityNameCn: "{中文名}"
---
```

每条新闻 `## N. 标题` + 配图（Unsplash 或原文 og:image）+ 2-3 段正文 + `> Source: [名](url)`。参考：`src/content/universities/uq/news-2026-04-22.md`。

### Step 3. 写 `src/data/uni-news/{school}/{DATE}.json`（**主产出**）

**严格按 `src/data/_schemas/uni-news.schema.json`**。参考示例：`src/data/uni-news/uq/2026-04-22.json`。

关键字段：
- `school` 必须是 10 校枚举之一（pipeline 据此从 `uni-brand.v1.json` 取 brand color）
- `summary / news / quickview / xhsCopy` **全部必填**
- `news` 2-4 条
- `news[i].sourceQuote` **奖学金/招生/学费/课程/签证类新闻必填**（贴官方原句，**首选英文原文**）；只要 `news[i].category` 命中 `奖学金 / 招生 / 学费 / 课程 / 签证 / 学位` 任一关键词，没填 sourceQuote = Step 5 自检直接 `exit 1`
- `quickview.items` 2-4 条
- `xhsCopy.p1~p5` **5 张 copy 全都要**（title + body + tags）
- **`mp.title` 禁止加 `｜{校名}日报` 后缀**（2026-04-22 运营决议）
- `drafts.sensitivityScan` 至少写一行"未检出"作为证据

**🚨 JSON 字符串里禁止嵌入 ASCII 双引号 `"`**（会破坏 JSON 结构）。要用中文引号写 `「」` / `『』`；需要 ASCII 引号用 `\"` 显式转义。

### Step 4. 敏感词扫描（写内容时同步过这 7 类）

| 类别 | 禁词示例 | 替换 |
|---|---|---|
| 绝对化 | 最 / 第一 / 唯一 / 100% / 首个 | "我觉得" / "体感不错" |
| 教育承诺 | 包过 / 保录取 / 稳上 / 必中 | 直接删，改"我怎么准备的" |
| 引流 | 加V / VX / 薇信 / 私信领取 / 关注公众号 | "评论区扣 1" |
| **封号红线** | **JR Academy / 匠人学院 / jiangren.com / 任何域名 / 二维码** | 封面 + xhsCopy 里**绝对**不准出现（mp-article 的 CTA 里允许"关注 JR Academy 公众号"，那是公众号发稿页合法引流） |
| AI 味 | 首先...其次 / 值得注意的是 / 综上所述 / 此外 / 作为一个 | "先说 XX" / "还有个事" / 删 |
| 医疗化妆品 | 治疗 / 速效 / 纯天然 | 大学新闻不碰 |
| 政治金融 | 保本 / 稳赚 / 年化 / 荐股 | 大学新闻不碰 |

### Step 5. 🚨 立即执行下面的 Bash — 不要跳过、不要总结、不要"我打算..."

> **2026-05-05 立的强制规则**：5 月连续 4 天（05-01/02/03/05）routine 跑完 Step 4（写 md+json）就退出，没跑 Step 5/6 → blog md / 海报 / mp / xhs-drafts 全缺，要 self-heal commit 救。根因：agent 把 markdown 代码块当"参考资料"。
>
> **铁律**：写完 md+json 后**立即** `Bash` 执行下面整段；任何 `exit 1` 直接报错退出，不要尝试"修复"或"换个写法"。Step 5 跑完之前**禁止**给用户写总结。

```bash
set -e

for s in $SCHOOLS; do
  echo "▶ Step 5 · $s · 自检 + pipeline 渲染"
  F=src/data/uni-news/$s/${DATE}.json

  # 1. JSON schema 验证
  jq empty $F || { echo "❌ JSON 解析失败 $F"; exit 1; }
  N=$(jq '.news | length' $F); [ $N -ge 2 ] && [ $N -le 4 ] || { echo "❌ news 数量 $N 不在 2-4"; exit 1; }
  for p in p1 p2 p3 p4 p5; do
    jq -e ".xhsCopy.$p.title and .xhsCopy.$p.body and .xhsCopy.$p.tags" $F >/dev/null || { echo "❌ xhsCopy.$p 缺字段"; exit 1; }
  done

  # 2. 封号红线扫描（xhsCopy + drafts 正文，跳过 sensitivityScan 表和 mp.cta）
  jq -r '[.xhsCopy[].body, .xhsCopy[].tags, .drafts.sections[].body] | join(" ")' $F | \
    grep -qiE "JR Academy|匠人学院|jiangren\.com|关注公众号|抖音号|加V|VX|薇信|保过|包过|保录取" \
    && { echo "❌ 封号红线命中 · $s"; exit 1; } || true

  # 3. mp.title 禁 ｜{校}日报 后缀
  jq -r '.mp.title // ""' $F | grep -qE '｜.*日报|\| .*日报' && { echo "❌ mp.title 违规"; exit 1; } || true

  # 3.5. 反幻觉 gate · 奖学金/招生/学费/课程/签证/学位类必须有 sourceQuote
  #     违反硬规则的常见话术：自动评估 / 无需单独申请 / 自动参评 / 按 GPA 分档 / 10%-25% 学费减免（无 sourceQuote）
  jq -r '.news[] | select(.category | test("奖学金|招生|学费|课程|签证|学位")) | "\(.category)|\(.sourceQuote // "")|\(.sourceUrl // "")"' $F | \
  while IFS='|' read -r cat quote url; do
    [ -n "$quote" ] || { echo "❌ news.category=$cat 缺 sourceQuote · agent 没读官方原文就编细节"; exit 1; }
    [ -n "$url" ] && [[ "$url" == *".edu.au"* ]] || { echo "❌ news.category=$cat 的 sourceUrl 不是 *.edu.au 官方域名: $url"; exit 1; }
  done

  # 3.6. 反幻觉 gate · description / lead / h2Sub 不准出现"必命中 sourceQuote 的事实词" 但 sourceQuote 没出现
  for fact_kw in "自动评估" "自动参评" "无需单独申请" "无需单独填表"; do
    if jq -r '.. | .description? // .lead? // .h2Sub? // empty | strings' $F 2>/dev/null | grep -qF "$fact_kw"; then
      jq -e --arg kw "$fact_kw" '[.news[].sourceQuote // ""] | join(" ") | contains($kw) or test("automatically assess|no separate application|automatically considered"; "i")' $F >/dev/null \
        || { echo "❌ 摘要里出现「$fact_kw」但 sourceQuote 没有官方原文兜底 · 这种事实陈述必须有原文证据"; exit 1; }
    fi
  done

  # 4. pipeline 渲染（必跑 · 不跑 = 缺海报/mp/blog md）
  bun run build:uni-news ${DATE} $s || { echo "❌ pipeline 失败 $s"; exit 1; }

  # 5. 4 个产物齐全（缺一个就是 Step 5 没真跑通）
  OUT=src/static/uni-news-social/${DATE}/$s
  for f in $OUT/xhs-posters.html $OUT/mp-article.html $OUT/xhs-drafts.md src/content/articles/uni-news-$s-${DATE}.md; do
    [ -f $f ] || { echo "❌ 缺产物 $f · pipeline 没跑"; exit 1; }
  done
  echo "✅ Step 5 · $s · 4 产物齐"
done

# 6. rebuild hub（必跑 · 不跑 = hub 永远停在最后一次手工编辑日期）
echo "▶ Step 6 · rebuild uni-news hub"
node scripts/rebuild-uni-hub.mjs || { echo "❌ rebuild-uni-hub 失败"; exit 1; }
echo "✅ Step 6 · hub 重建完成"
```

**Step 5/6 跑完前禁止**：写 markdown 总结 / 改任何无关文件 / 给用户讲 "我已经..." 的话术。**只能跑 bash**。

## 📋 产出清单（每校）

```
src/content/universities/{school}/news-{DATE}.md       ← agent 写（8-12KB · 上游新闻 md）
src/data/uni-news/{school}/{DATE}.json                 ← agent 写（15KB · 结构化数据）

Pipeline 产：
src/static/uni-news-social/{DATE}/{school}/xhs-posters.html  ← 小红书 5 图 carousel
src/static/uni-news-social/{DATE}/{school}/mp-article.html   ← 公众号发稿页（inline style）
src/static/uni-news-social/{DATE}/{school}/xhs-drafts.md     ← 小红书草稿
src/content/articles/uni-news-{school}-{DATE}.md             ← 官网 /blog/ markdown
```

+ hub: `scripts/rebuild-uni-hub.mjs` 自动重建 `src/static/uni-news-social/{index.html, schools/*.html}`

## 🎨 人性化要求（xhsCopy.body + drafts.sections[].body）

1. 第一人称 + 具体时间线（"上周 04-18 官网发的" > "近期"）
2. 段落长短参差（1-2 句短段 + 4-5 句长段交替）
3. emoji 克制（1-2 段插 1 个，不要每句都挂）
4. 有小纠结 / 个人判断（"我也在犹豫申 A 还是 B"）—— **只能用在自己的学习选择上**（选什么专业 / 备考节奏 / 申几个学校），**严禁**用在事实陈述（"减免范围 10%-25%"/"自动评估资格"）上。事实必须 = sourceQuote 原文复述
5. 结尾互动句（"有同样在申请的姐妹扣 1"）
6. 标题 ≤22 字（含 emoji 算字数）

### 🚨 事实 vs 感受切分
xhsCopy / drafts 写之前心里把每句话归类：

| 这句话是 | 来源必须是 | 允许的口吻 |
|---|---|---|
| 事实陈述（金额/百分比/资格/截止日/材料清单） | `news[i].sourceQuote` 原文 | 平铺直叙，**不准加"我猜/通常/一般来说"** |
| 主观选择（专业纠结、备考节奏） | 自己编 | 第一人称小纠结都行 |
| 行动建议（什么时候提交、怎么排进度） | 不需要 source | 可以自由发挥 |

写完每段问自己：**"这句话如果错了，会不会让学生申错奖学金 / 错过截止 / 多花钱？"** 是 → 必须 sourceQuote 兜底；否 → 自由发挥可以。

## 🔗 参考

- **Schema**: `src/data/_schemas/uni-news.schema.json`
- **Pipeline**: `build/pipelines/uni-news.pipeline.ts`
- **Templates**: `src/templates/mp-article/uni-news.template.html` + `src/templates/xhs-drafts/uni-news.template.md`
- **Brand**: `src/data/uni-brand.v1.json`（10 校颜色 + 名称）
- **最新示例**: `src/data/uni-news/uq/2026-04-22.json`
- **架构 PRD**: `docs/SCHEDULED_CONTENT_PLATFORM_PRD.md`
