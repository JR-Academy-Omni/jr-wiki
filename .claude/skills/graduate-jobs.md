---
name: graduate-jobs
description: "每天抓 5 个 AU/CN 校招机会，写入 src/data/scraped-jobs/{DATE}.json，由 GitHub Actions 同步到官网 /ai-jobs 的 auto-scraped feed。只接受 Graduate / Internship / Summer Internship / 校招 / 应届生岗位。"
argument-hint: "[YYYY-MM-DD 可选，默认今天 AEST]"
---

# /graduate-jobs — 5 个校招机会

## 目标

每天产出 5 个真实、可申请、适合 JR Academy 学员的校招机会。文件路径固定：

```
src/data/scraped-jobs/{DATE}.json
```

push 到 `main` 后，`.github/workflows/scraped-jobs-sync.yml` 会跑 `scripts/sync-scraped-jobs.ts`，POST 到后端 `/admin-cms/jobs/scraped-jobs/bulk`，官网 `/ai-jobs` 自动展示。

## Step 0. 日期

```bash
DATE=${1:-$(TZ='Australia/Sydney' date +%Y-%m-%d)}
FILE="src/data/scraped-jobs/${DATE}.json"

if [ -f "$FILE" ] && [[ ! "$*" =~ --force ]]; then
  echo "✅ $FILE 已存在，跳过；如需覆盖，加 --force"
  exit 0
fi

mkdir -p src/data/scraped-jobs
```

必须用 `Australia/Sydney`。调度器在 UTC，直接 `date` 会错一天。

## Step 1. 搜索范围

默认配比：AU 3 条 + CN 2 条。找不到足够 CN 时，用 AU 补足；总数必须等于 5。

AU 优先源：
- 官方 early careers / students pages
- GradConnection
- Prosple
- Seek specific job pages

CN 优先源：
- 官方校园招聘页
- 牛客校招
- 应届生求职网
- BOSS 直聘 / 拉勾的具体岗位页

禁止源：
- LinkedIn（login wall）
- 微信公众号（链接不稳定）
- 搜索结果页、聚合列表页、无具体岗位详情页
- recruiter spam：Robert Half / Hays / Talent International / Randstad / Adecco / Manpower / Recruitment Agency

## Step 2. 接受标准

只收这些校招类型：
- Graduate Program / Graduate Role / Graduate Engineer
- Internship / Summer Internship / Vacation Program
- Cadetship / Traineeship
- 校招 / 应届生 / 管培生 / 暑期实习 / 提前批
- Junior / Associate 只有在 JD 明确写 0-1 年、new graduate、应届生时才可收

直接拒绝：
- Senior / Lead / Principal / Staff / Manager
- 3+ years / 5+ years / mid-level
- 泛软件岗但没有 AI/Data/Product/BA 方向
- applyUrl 包含 `linkedin.com`
- 没有明确公司名或没有具体 apply URL

## Step 3. 分类规则

每个岗位必须带：

```json
"market": "AU",
"category": "AI Engineer",
"level": "Graduate"
```

`market` 只能是 `AU` 或 `CN`。

`category` 只能用这 7 个值：

```text
AI Engineer
ML Engineer
MLOps / AI Infra
AI Product / PM
Business Analyst
Data Scientist
Data Engineer
```

`level` 必须是 `Graduate`。同步后后端会映射成官网筛选用的 `Graduate-Program`。

分类优先级：
1. title 含 AI Engineer / GenAI / LLM / AI Application → `AI Engineer`
2. title 含 Machine Learning / ML / Applied Scientist / AI Research → `ML Engineer`
3. title 含 MLOps / AI Platform / AI Infra / RAG / Vector DB → `MLOps / AI Infra`
4. title 含 AI Product Manager / AI Product Owner / GenAI Product → `AI Product / PM`
5. title 含 Business Analyst / Product Analyst / Data Business Analyst → `Business Analyst`
6. title 含 Data Scientist / Decision Scientist / Quantitative Researcher → `Data Scientist`
7. title 含 Data Engineer / Analytics Engineer / Data Platform → `Data Engineer`

## Step 4. JSON 格式

```json
{
  "date": "2026-05-10",
  "generatedAt": "2026-05-10T07:30:00+10:00",
  "jobScope": "graduate",
  "sources": [
    "GradConnection",
    "Prosple",
    "official company careers",
    "牛客",
    "应届生求职网"
  ],
  "jobs": [
    {
      "title": "2027 Graduate Data Engineer",
      "company": "Example Bank",
      "location": "Sydney, NSW",
      "market": "AU",
      "category": "Data Engineer",
      "level": "Graduate",
      "postedAt": "2026-05-10",
      "applyUrl": "https://example.com/careers/graduate-data-engineer",
      "snippet": "Graduate Data Engineer program for final-year students and recent graduates, with rotations across data platforms and analytics teams.",
      "description": "Source-backed JD summary. Include program type, eligibility, work rights or graduation-year requirement when available, responsibilities, tools/skills, location, closing date if shown, and assessment process if shown."
    }
  ]
}
```

字段要求：
- `jobs.length === 5`
- `applyUrl` 必须是具体岗位或具体校招项目页，不要搜索页
- `description` 至少 220 字符，用来源页信息总结，不要写空话
- 不知道截止日期就不要编；可在 `description` 写“source page does not list a deadline”
- `postedAt` 只有来源明确给日期时才填；不确定就省略

## Step 5. 自检

```bash
DATE="$DATE" FILE="$FILE" node - <<'NODE'
const fs = require('fs');
const file = process.env.FILE;
const allowedMarkets = new Set(['AU', 'CN']);
const allowedCategories = new Set([
  'AI Engineer',
  'ML Engineer',
  'MLOps / AI Infra',
  'AI Product / PM',
  'Business Analyst',
  'Data Scientist',
  'Data Engineer'
]);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.date !== process.env.DATE) throw new Error(`date mismatch: ${data.date}`);
if (!Array.isArray(data.jobs) || data.jobs.length !== 5) {
  throw new Error(`jobs must contain exactly 5 items, got ${data.jobs && data.jobs.length}`);
}
for (const [i, job] of data.jobs.entries()) {
  for (const key of ['title', 'company', 'location', 'market', 'category', 'level', 'applyUrl', 'snippet', 'description']) {
    if (!job[key]) throw new Error(`job[${i}] missing ${key}`);
  }
  if (!allowedMarkets.has(job.market)) throw new Error(`job[${i}] invalid market ${job.market}`);
  if (!allowedCategories.has(job.category)) throw new Error(`job[${i}] invalid category ${job.category}`);
  if (job.level !== 'Graduate') throw new Error(`job[${i}] level must be Graduate`);
  if (job.applyUrl.includes('linkedin.com')) throw new Error(`job[${i}] LinkedIn URL forbidden`);
  if (!/^https?:\/\//.test(job.applyUrl)) throw new Error(`job[${i}] applyUrl must be absolute URL`);
  if (String(job.description).length < 220) throw new Error(`job[${i}] description too short`);
}
console.log(`✅ ${file} 校招岗位自检通过: 5 jobs`);
NODE
```

## 输出

只写一个 JSON 文件：

```
src/data/scraped-jobs/{DATE}.json
```

不要写 markdown、HTML、海报。官网展示由后端 `/jobs/feed?source=auto-scraped` 和前端 `/ai-jobs` 负责。
