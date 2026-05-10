---
title: "牛小匠 Uni Mate：澳洲大学课业 AI 助手"
wiki: "jr-academy-guide"
order: 5
description: "针对澳洲大学课程的 AI 答疑工具——按学校 × 课程代码 × 周次定制，教方法不给答案，符合学术诚信"
---

## 谁需要牛小匠

**在澳洲读 IT / 商科 / 工程相关的中国留学生**。

具体场景：

- UQ 学生半夜赶 CSSE2002 Java 大作业卡住
- UNSW 学生 COMP3231 OS 实验跑不通
- USYD 学生 INFO2222 Web Security workshop 看不懂
- Monash 学生 FIT1045 Python intro 期末复习
- UniMelb 学生 COMP10001 不会写 list comprehension

通用 ChatGPT 对这些场景**两个核心问题**：

1. **不知道你学校的具体课程**——COMP3231 在 UNSW 是 OS，在 USYD 可能完全不同
2. **直接给答案违反学术诚信**——你抄它的代码大概率被 Turnitin / MOSS 抓到

牛小匠的设计就是解决这两个问题。

## 入口

| 端 | 入口 |
|---|------|
| **Web 工具** | [`/tools/unimate-ai`](https://jiangren.com.au/tools/unimate-ai) |
| **Chrome 插件 (alpha)** | "UniMate AI Tutor"，T2 学期内测中 |
| **未来**：iOS App（roadmap） | — |

## 核心原理：按学校 × 课程 × 周 × 工具的 context

牛小匠后端有 4 个维度的 context 注入：

```
┌────────────────────────────────────────┐
│  当用户问问题时，牛小匠知道：          │
│                                        │
│  University: UQ                        │
│  Course: CSSE1001 Java Programming     │
│  Week: Week 7 — Inheritance            │
│  Tool: Eclipse / IntelliJ              │
└────────────────────────────────────────┘
            ↓
   用 Claude Sonnet + 这 4 个 context
   生成 "教方法不给答案" 的回复
```

举个对比：

**❌ 通用 ChatGPT** 的回答方式（COMP3231 OS lab Q1）：

> "好的，这是答案：[直接贴 50 行 C 代码]"

**✅ 牛小匠** 的回答方式：

> "好的，你在 UNSW COMP3231 lab 1 第 1 题，主要考察 fork() 系统调用。
> 
> 思考线索：
> 1. fork() 在父子进程返回值有什么区别？
> 2. 子进程拷贝父进程哪些资源？
> 3. 你的代码现在错在哪一步——printf 顺序还是 wait() 时机？
> 
> 自己想想，跑一下小 demo 验证。如果还卡住具体哪一步，告诉我你已经写到哪了。"

这个 "教方法不给答案" 的设计是匠人和悉尼大学某个学院 / UQ 部分课程辅导员讨论过的，**符合澳洲大学 academic integrity policy**——AI 工具用来理解概念可以，直接代写违规。

## 支持的大学（2026 T1 数据）

| Region | University | 主推课 |
|--------|-----------|--------|
| **NSW** | UNSW / USYD / UTS / Macquarie / Newcastle / Wollongong | COMP / INFO / CITS / FIT |
| **VIC** | UniMelb / Monash / RMIT / La Trobe / Deakin / Swinburne | COMP / FIT / SIT / IFB |
| **QLD** | UQ / QUT / Griffith | CSSE / IFB / 7XXX |
| **SA** | Adelaide / Flinders / UniSA | COMP SCI / 7XXX / INFS |
| **WA** | UWA / Curtin / ECU | CITS / COMP / ICT |

每个学校的 IT / CS 课程都有覆盖。商科 / 工程类正在逐步加。具体某门课**有没有数据**：在牛小匠工具里搜课程代码，搜得到就 OK。

## 每月 AI 答疑额度

| 会员档 | 额度 |
|--------|------|
| 免费 | 每月 2 次 |
| BASIC | 每月 5 次 |
| PLUS | 每月 50 次 |
| PREMIUM | 无限 |

**预测器 / AI 率检测器** 每月还有 2 次额外免费配额（用完按 ¥5-20/次付费）。这是匠人 T2 学期的特殊功能，针对中国留学生在澳被 GPT 抓 AI 写作罚分的痛点。

## Chrome 插件 (alpha)

[UniMate Tutor Chrome 插件](https://chrome.google.com/webstore/) 2026 T2 学期内测。装上后：

打开 Canvas / Microsoft 365 / Google Docs / Coursera / GitHub 任意页面，插件能识别：

- 你在哪个学校（按 `*.uq.edu.au` / `myunsw.edu.au` 等域名）
- 你在哪门课（从 page URL 抽课程代码）
- 你在哪一周（从 Canvas 模块名 / 文件名）
- 你用什么工具（Excel / Word / Eclipse / VSCode）

直接弹出 "我可以帮你看这个 Excel function 怎么用 / 这段 Java code 哪里错"，不需要 copy-paste。

⚠️ T2 alpha 阶段免费随便用，正式上线后按会员档限额度。

## 不做什么

牛小匠**不做**：

❌ **直接代写作业**（违反学术诚信，也违反我们 ToS）
❌ **跨用户洞察**（不会告诉你"班里 80% 同学 lab 1 错在 X"，也不能用来 cheating detection）
❌ **替你交作业**（拒绝任何 "帮我提交" 类请求）
❌ **绕过学校 paywall**（不下载学校付费教材 / 文章）
❌ **国家政治 / 个人攻击 / 其他无关话题**

我们做的就是：**陪你学懂这门课，自己做出作业**。

## 长期路线（2026 T2）

匠人 [UniMate AI Strategic Review](https://github.com/JR-Academy-AI/jr-academy-ai/blob/main/docs/prd/unimate/) 文档里展开了 8 周路线。简单版：

- **W1-2**：Chrome 插件 alpha
- **W3-4**：覆盖三大工具教学（Excel / Git / Word）
- **W5-6**：AI 率预测器 + 4 大学落地页
- **W7-8**：T2 新生节 + 学期通行证 ($99)

T2 KPI：付费转化≥5%、$99 销售≥100、插件 D30≥30%。**这是匠人 2026 年最重要的产品方向之一**。

## 客服

- **课程数据缺**（"我学校 / 我课没数据"）：[`/contact-sales`](https://jiangren.com.au/contact-sales) 提交
- **答疑质量问题**（"它说的不对"）：在工具里点回答下方 "👎 反馈"
- **学术诚信 grey area**（"这个能问吗"）：直接问，模型会判断；判断不清楚邮箱 hello@jiangren.com.au

下一章讲 Bootcamp + 三档主课系统。
