---
title: "求职匠 Job Hunter：简历 + JD 匹配 + AI 面试"
wiki: "jr-academy-guide"
order: 4
description: "Web 工具 + Chrome 插件全套求职装备：简历优化、JD 自动匹配评分、AI 面试模拟、真实面试题库"
---

## 核心组合

求职匠不是单一工具，是 **Web 工具 + Chrome 插件 + 题库** 三件套：

| 部分 | 入口 | 解决什么 |
|------|------|---------|
| **Web 工具** | [`/tools/job-hunter`](https://jiangren.com.au/tools/job-hunter) | 简历优化、AI 面试模拟、JD 匹配评分 |
| **Chrome 插件** | Chrome Web Store / 工具页下载 | 自动填表 + Seek/LinkedIn JD 匹配 |
| **真实面试题库** | [`/job-interview`](https://jiangren.com.au/job-interview) | 各公司真实面经 + 系统设计 + 题目 |

## ① Web 工具

### 简历优化

上传 PDF 或粘贴文本：

1. AI 解析简历（提取技能、经历、教育）
2. 给评分 + 改进建议（结构、关键词、ATS 友好度）
3. 一键改写（按目标岗位 JD 重写描述）
4. 导出 PDF（Aussie 简历模板）

**ATS（Applicant Tracking System）** 是大公司过简历的算法。匠人简历模板都过 ATS-friendly 测试——不放图片 / 不用 fancy 排版 / 关键词覆盖到位。

### AI 面试模拟

PLUS / PREMIUM 会员独有。流程：

```
选岗位（Software Engineer / Data Analyst / PM / 等）
  ↓
选公司（CBA / Atlassian / Google / 通用）
  ↓
选轮次（Recruiter / Tech Screen / Onsite / Behavioral）
  ↓
LLM 扮演面试官 30 分钟对话
  ↓
完整 transcript + 评分（多维度）+ 改进建议
```

模拟面试用 Claude Sonnet 跑，背后接 [真实面试题库](https://jiangren.com.au/job-interview/process) 的题，所以问题都是真实公司问过的，不是 LLM 编的。

### JD 匹配评分

粘贴一个 JD + 你的简历：

- 整体匹配度（0-100）
- 关键技能 hit / miss
- 哪些经验需要重点强调
- 缺失的关键词（暗示要不要补 cert / project）

匠人内部数据：JD 匹配度 < 60 投了基本无回音，70+ 才有面试，85+ 才接近 strong。**用这个工具决定要不要投** 比盲投省力。

## ② Chrome 插件 (求职匠 Job Hunter)

Chrome Web Store 搜 "Job Hunter JR Academy"。**核心三个功能**：

### a. Seek / LinkedIn JD 一键匹配

打开 Seek / LinkedIn 任意 job 页，插件按钮 → 弹窗显示：

- 你的简历对这个 JD 的匹配度
- 缺失关键词
- "投不投" 智能建议

避免用户手动 copy-paste JD 到 Web 工具。

### b. 自动填表

很多公司投递页要重复填同样信息（姓名 / 电话 / 教育 / 经验）。插件保存你的 profile，下次进 Workday / Greenhouse / Lever 等系统自动填。**节省 5-10 分钟/次**。

### c. 投递记录

自动记录你投了哪些公司、岗位、时间、状态。导出 Excel 给你自己查。

## ③ 真实面试题库

[`/job-interview`](https://jiangren.com.au/job-interview) 是匠人最大的免费内容板块之一：

| 子频道 | 内容 | URL |
|--------|------|-----|
| **Process** | 公司面试流程详细记录（轮次、题目、tips） | `/job-interview/process/{slug}` |
| **Question** | 单题深度解析（含 STAR 答法） | `/job-interview/question/{id}` |
| **Experience** | 真实面经（用户提交，匠人审核） | `/job-interview/{key}` |
| **System Design Handbook** | 系统设计面试手册 | `/job-interview/system-design-handbook` |
| **Mock Interview** | 真人陪练（PREMIUM 含 4 小时/月） | `/job-interview/mock-interview` |

覆盖公司：CBA / ANZ / Westpac / NAB / Macquarie / Atlassian / Canva / SafetyCulture / Google / Amazon / Microsoft / Meta / TikTok / Bytedance / 各大 consulting / 银行 / 保险 / SaaS。

500+ 公司 process，几千道题，全部免费。**会员价值在于 AI 面试模拟 + 简历改写工具**，不是题库本身。

## 投递策略建议（澳洲场景）

匠人内部 Career Coaching 团队总结的实操打法：

### 不要做的

❌ **海投 1000 家**：90% 没回音，浪费时间。优先 70+ JD 匹配度的
❌ **只投 LinkedIn / Seek**：错过 Referral 渠道，且大公司很多岗位先内推后挂网
❌ **用同一份简历投所有**：每个 JD 关键词不同，简历至少调 3-5 处

### 要做的

✅ **每天投 5-10 家精准岗位**（匹配度 70+）
✅ **同步用 Chrome 插件记录投递状态**，2 周后没回音的发 follow-up
✅ **准备 STAR 故事库 5-10 个**：覆盖 leadership / failure / conflict / impact 几大维度，面试时随时调
✅ **每周做 2-3 场 AI Mock Interview**，比硬看题目复习管用

## 关于"包就业"承诺

匠人不卖"包就业 / 入职保证 / 100% offer"承诺。求职是个人能力 + 市场行情 + 时机的复合结果，没人能担保。

我们提供的是**可量化的服务**：

- 简历过 ATS 测试
- 面试模拟 transcript
- 投递记录和 follow-up 节奏
- 1:1 mentor 真人 review（PREMIUM）

offer 是你自己拿的。我们让"拿"这件事更高效。

## 客服

- **求职策略咨询**（PREMIUM）：mentor 1:1 时长按月分配，[`/account/mentor`](https://jiangren.com.au/account/mentor) 预约
- **简历审稿** issue：邮箱 hello@jiangren.com.au + 附简历 PDF
- **插件 bug**：插件设置面板有反馈按钮

下一章讲牛小匠 Uni Mate——给澳洲在校大学生的 AI 课业助手。
