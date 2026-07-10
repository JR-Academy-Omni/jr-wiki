---
description: 每周日产出未来 90 天「营销日历」给 admin —— 合并 (1) 人工维护的营销节点 + 打法卡 (2) AU/SG/MY/US/GB 公共假日（滚动窗口）
---

# /weekly-holidays — 未来 90 天营销日历（营销节点打法卡 + 公共假日）

**目的**：提前三个月看到对教育/AI 学习品牌真正重要的**营销节点**（六一/520/618/毕业季/双11/开学季…，很多根本不是公共假日）+ 5 国公共假日，每个营销节点带一张**营销打法卡**（受众/切角/发什么/挂产品/文案钩/渠道/避坑），运营直接照着做。

**两类数据源**：
1. **营销节点**（重点）：`src/data/weekly-holidays/marketing-nodes-{year}.json` —— **人工维护的 SoT**，每个节点带 `playbook` 打法卡。这是页面真正有价值的部分。
2. **公共假日**（背景）：AU/SG/MY/US/GB 5 国全部走人工维护的年度静态表（`_{country}-holidays-{year}.json`，数据源仍是 Nager.Date，但由人类会话每年手动刷新，routine 运行时不再现场调 API），只配一句话 `marketingNote`。

**使用场景**：今天六一 → 怎么做营销？两周后毕业季 → 招生冲刺怎么打？月底 618 → membership 年卡怎么转化？

**不产海报、不发公众号、不进 hub**。纯内部数据 → admin 页面读取。

## 使用

```
/weekly-holidays              # 默认：rangeStart = AEST 今天，rangeEnd = today + 90
/weekly-holidays 2026-04-23   # 手动指定 rangeStart
```

## 产出

```
src/data/weekly-holidays/
├── marketing-nodes-{year}.json    # 🔑 营销节点 + 打法卡 SoT（人工维护，全年一份）
├── _{au,sg,my,us,gb}-holidays-{year}.json  # 5 国公共假日年度静态表（人工/年度刷新，routine 只读不抓取）
├── {rangeStart}.json              # 90 天窗口快照 (e.g. 2026-05-31.json)
└── latest.json                    # 永远是最新一次运行的产出（admin 读这个）
```

> 改营销节点 / 加新节点 / 改打法卡 → **只改 `marketing-nodes-{year}.json`**，skill 自动合并落窗口的节点。不要把打法卡写进 skill 或 latest.json。

## 执行步骤

### Step 0: 确定窗口（AEST 时区强制）

```bash
# schedule 跑在 UTC → 必须用 AEST 取日期，否则误差一天
RANGE_START=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}
RANGE_END=$(python3 -c "
from datetime import date, timedelta
print((date.fromisoformat('$RANGE_START') + timedelta(days=90)).isoformat())
")
echo "Window: $RANGE_START → $RANGE_END (91 days inclusive)"
```

### Step 1: 5 国公共假日全部从静态年度文件读（🚨 2026-07-10 起不再实时调 Nager.Date API）

**架构变更原因**：2026-07-03 起本 routine 跑的 cloud sandbox 对 `date.nager.at` 的直连出网被挡（403），连续 4 周（07-03/04/05/06）全部触发，routine 只能靠"沿用旧数据 + 按法定假日固定规则自己推算"硬撑——这不可持续，一旦某国某年出现非固定规则的调休/新增假日就会漏掉。

**修复**：AU/SG/US/GB 4 国改成跟 MY 一样，走**人工/年度静态表**，不再指望 routine 运行时能连到 Nager.Date。5 国现在待遇完全一致：

```bash
YEAR_START=$(echo "$RANGE_START" | cut -d- -f1)
YEAR_END=$(echo "$RANGE_END" | cut -d- -f1)
YEARS="$YEAR_START"
[ "$YEAR_START" != "$YEAR_END" ] && YEARS="$YEAR_START $YEAR_END"

for Y in $YEARS; do
  for C in au sg my us gb; do
    FILE="src/data/weekly-holidays/_${C}-holidays-$Y.json"
    if [ ! -f "$FILE" ]; then
      echo "❌ 缺少 $FILE — 年度 ${C^^} 节日表没维护"
      echo "   停下来问用户要 $Y 年 ${C^^} 公共假日（或让我按官方来源研究生成），不要现场硬调 Nager.Date（大概率 403）"
      exit 1
    fi
  done
done
```

跨年（12 月底运行）时 `$YEARS` 会有两个年份，合并两个文件。

**年度表格式**（5 国统一，`_{country}-holidays-{year}.json`）：

```json
{
  "country": "AU",
  "year": 2026,
  "source": "https://date.nager.at/api/v3/PublicHolidays/2026/AU",
  "note": "...",
  "holidays": [
    { "date": "2026-01-01", "name": "New Year's Day", "localName": "New Year's Day", "type": "Public" }
  ]
}
```

⚠️ MY 每年很多伊斯兰/印度教节日日期浮动，**绝不能用去年的日期**，年初查 [publicholidays.com.my](https://publicholidays.com.my/) 手工更新。AU/SG/US/GB 相对固定（法定规则可推算），但仍建议每年初用一次**人类主导会话**（不是这个 sandbox 受限的 routine）重新 `curl`/`WebFetch` Nager.Date 刷新对应年度文件，尤其是年底要补下一年数据时。

### Step 2: 读取 + 合并 5 国静态数据

```python
import json
holidays = []
for y in years:
    for c in ["AU", "SG", "MY", "US", "GB"]:
        with open(f"src/data/weekly-holidays/_{c.lower()}-holidays-{y}.json") as f:
            holidays += json.load(f)["holidays"]
```

### Step 3: 过滤到 90 天窗口 + AI 增强

对每条 5 国静态数据：
1. 过滤：`RANGE_START <= date <= RANGE_END`
2. AI 生成 `nameZh`（中文译名，用学员熟知的名字）
3. AI 生成 `marketingNote`（1 句话，≤40 字，给运营看的营销提示）

**marketingNote 写作规则**（写 30+ 条时最容易变模板，严格把关）：

- ✅ 具体：说清楚这个节"学员在不在线、什么内容适合发、哪个人群共鸣"
- ❌ 禁：写"节日快乐"、"记得安排内容"、"适合营销"、"做好准备"这种废话
- ❌ 禁：对小众州/地区假日（比如 US-MO Truman Day、AU-NT May Day）瞎编"适合推北领地学员" —— 诚实写"基数很小可忽略"
- 句式参考：
  - "US Memorial Day · 美股休市 + 暑期实习季开端，推美本求职内容"
  - "Hari Raya · 马来穆斯林学员线下活动多，避开重推广，改发社群互动"
  - "Anzac Day · 澳洲纪念日严肃氛围，避免促销色调，发学员创业致敬故事"

### Step 3.5: 合并营销节点（重点新增 · schema v3）

读 `src/data/weekly-holidays/marketing-nodes-{year}.json`，把 `date` 落在 `[RANGE_START, RANGE_END]` 窗口内的节点合并进 `holidays[]`，**整张 `playbook` 原样带过来**，`type` 设为 `"marketing-node"`：

```bash
for Y in $YEARS; do
  NODE_FILE="src/data/weekly-holidays/marketing-nodes-$Y.json"
  if [ ! -f "$NODE_FILE" ]; then
    echo "⚠️ 缺 $NODE_FILE — 营销节点日历没维护，请补该年度文件（参考 marketing-nodes-2026.json）"
  fi
done
```

- 节点 `seasonal:true`（毕业季/618/开学季/双11 等时段）→ 用其 `date` 锚点判断是否在窗口；命中就带 `window` 字段一起输出。
- 营销节点的 `playbook` 是创作型文案，**允许自由发挥**（反幻觉硬规则只管事实陈述：金额/资格/截止日要 sourceQuote，打法卡不涉及）。
- **不要在 skill 里重新编打法卡** —— 一律从 `marketing-nodes-{year}.json` 读，那是 SoT。新增/改节点去改那个文件。

### Step 4: 写 JSON 文件（schema v3.0）

公共假日 `type:"public-holiday"` + 一句话 `marketingNote`；营销节点 `type:"marketing-node"` + 整张 `playbook`。`countries` 增加 `GLOBAL`/`CN` 两个 meta 供营销节点打 tag。

```json
{
  "schemaVersion": "3.0",
  "rangeStart": "2026-05-31",
  "rangeEnd": "2026-08-29",
  "rangeDays": 91,
  "generatedAt": "2026-06-01T09:00:00+10:00",
  "countries": [
    { "code": "GLOBAL", "label": "全球华人", "flag": "🌏" },
    { "code": "CN", "label": "中国", "flag": "🇨🇳" },
    { "code": "AU", "label": "澳洲", "flag": "🇦🇺" },
    { "code": "SG", "label": "新加坡", "flag": "🇸🇬" },
    { "code": "MY", "label": "马来西亚", "flag": "🇲🇾" },
    { "code": "US", "label": "美国", "flag": "🇺🇸" },
    { "code": "GB", "label": "英国", "flag": "🇬🇧" }
  ],
  "holidays": [
    {
      "date": "2026-06-01",
      "country": "GLOBAL",
      "name": "六一儿童节",
      "nameZh": "六一儿童节",
      "type": "marketing-node",
      "emoji": "🎈",
      "tier": "A",
      "seasonal": false,
      "playbook": {
        "audience": "30+ 职场人 / 家长 / 想重启学习的成年人",
        "angle": "『成年人的六一』—— 持续学习才是大人的游乐场",
        "contentIdeas": ["小红书：30+ 程序员的六一，我送自己一门 AI 课"],
        "productHook": "考证匠 / membership『$8 一杯咖啡当儿童节礼物』",
        "copyHooks": ["今天不止小朋友放假，大朋友也该被治愈一下"],
        "channels": ["小红书", "公众号", "学习群"],
        "avoid": "❌ 不蹭鸡娃/不卖焦虑/不硬推转化"
      }
    },
    {
      "date": "2026-05-01",
      "country": "MY",
      "name": "Labour Day",
      "localName": "Hari Pekerja",
      "nameZh": "劳动节",
      "type": "public-holiday",
      "marketingNote": "马来学员连假出游居多 · 避免强推转化，改发社群话题"
    }
  ]
}
```

排序由 admin 页面负责（按 `date` 升序，同一天营销节点排公共假日前）。skill 输出顺序不强制。

### Step 5: 同时覆盖 latest.json

```bash
cp "src/data/weekly-holidays/$RANGE_START.json" "src/data/weekly-holidays/latest.json"
```

admin 页面只 fetch `latest.json`，永远看到最新一次的 90 天窗口。

### Step 6: 报告

```
🗓️ 未来 90 天节假日 ({RANGE_START} → {RANGE_END})

🇦🇺 AU: {n} 条
🇸🇬 SG: {n} 条
🇲🇾 MY: {n} 条
🇺🇸 US: {n} 条
🇬🇧 GB: {n} 条
合计: {total} 条

文件:
  src/data/weekly-holidays/{RANGE_START}.json
  src/data/weekly-holidays/latest.json (已覆盖)

admin 查看: /weekly-holidays
下一步: /publish
```

## 覆盖策略（v2 重要变化）

**可以覆盖**已有 `{rangeStart}.json` —— 因为滚动窗口每周都会重跑，同一天触发允许刷新。
**latest.json 每次都覆盖** —— 保证 admin 永远看最新数据。

v1 的"不覆盖历史"规则不再适用 —— 90 天窗口天然每周滚动前进，同一个 rangeStart 通常不会重复出现两次。

## 空窗口情况

90 天 5 国全空是极罕见场景（只有某些历史上的极短月份），真发生就 holidays: []，admin 页显示"未来 90 天 5 国都没有公共假日 · 罕见平静月"。

## 调度

`/schedule` 已挂：每周日 09:00 AEST 跑一次，写入"从当天起 90 天"的窗口。

## 不做什么

- ❌ 不生成海报、小红书、MP 文章
- ❌ 不写 markdown 到 articles/
- ❌ 不进 jiangren.com.au（纯 admin 内部工具）
- ❌ 不抓小众到可忽略的地方性假日单独做投放建议（比如 US-MO Truman Day 只有密苏里州政府放假） —— 诚实说"可忽略"，别硬编营销话术
