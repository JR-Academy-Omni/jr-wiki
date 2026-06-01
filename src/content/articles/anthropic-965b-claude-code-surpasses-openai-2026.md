---
title: "Anthropic 超越 OpenAI：Claude Code 打赢了这场估值战"
description: "2026年5月28日，Anthropic 以 $965B 估值超越 OpenAI 的 $852B，成为全球最高估值 AI 初创公司。驱动这一反转的核心是 Claude Code——一个把代码助手做成 $47B 收入引擎的赌注。这篇文章拆解这场反转背后的商业逻辑，和它藏着的代价。"
publishDate: 2026-06-01
tags:
  - ai-analysis
  - ai-news
  - anthropic
  - claude-code
  - openai
author: "JR Academy AI 编辑部"
keywords: "Anthropic估值, Claude Code收入, OpenAI vs Anthropic, AI独角兽IPO, AI编程助手, Series H融资"
---

2026 年 5 月 28 日，Anthropic 宣布完成 $65 billion Series H 融资，估值 $965 billion，第一次超越 OpenAI 的 $852 billion，成为全球最高估值的 AI 初创公司。Dario Amodei 没有在发布会上说任何戏剧性的话。他不需要说。

数字已经说完了。

---

## 背景：一场本该是学术边缘的故事

时间拉回 2020 年 12 月。Dario Amodei，当时 OpenAI 的 VP of Research，带着妹妹 Daniela 和另外十二名研究员，集体出走。外界的解读是方向分歧：OpenAI 接受了微软 $1 billion 的投资，从非营利转型为"盈利上限"结构，原本那批理想主义创始人开始坐不住了。

2021 年 1 月，Anthropic 成立，融资 $124 million。创始宣言简洁："研究如何让 AI 做到 helpful, harmless, honest。"2022 年，他们发表 Constitutional AI 论文——不是靠人工内容审核训练模型，而是让模型用一套写好的"宪法原则"进行自我评估和迭代。这个方法论后来成了业内标准。

但在 2022 年，Anthropic 的估值不到 OpenAI 的五分之一。没有人认为这是一场能赢的比赛。

然后 Claude Code 出现了。

---

## 核心分析一：Claude Code 是如何把 AI 做成了基础设施

Claude Code 的第一版研究预览在 2025 年 2 月上线，5 月正式 GA。这不是一个"代码补全"工具——它运行在终端里，能写代码、跑测试、修 bug、提交 commit，几乎是一个完整的初级工程师闭环。

数字说话：

- **2025 年 11 月**，Claude Code 达到 **$1 billion ARR**。从 GA 到十亿，用了 6 个月。同样的里程碑，ChatGPT 用了 11 个月，Slack 用了 4 年多。
- **2026 年 2 月**，ARR 涨到 **$2.5 billion**。
- **2026 年 5 月**，Anthropic 整体年化收入运营率达到 **$47 billion**，从年初的 $30 billion 跳了将近六成。

翻译成人话：Claude Code 的收入，每 3 个月翻一倍多。

为什么是代码？说白了，代码是最容易验证的 AI 输出。

写营销文案，你很难判断哪句更好。写代码不一样——跑测试就行。通过了，Claude Code 赢；报错了，你有明确反馈，改到过。这个即时反馈循环让工程师愿意把它写进工作流程。而一旦写进工作流，使用就变成习惯，习惯就变成依赖。

降维解读：Claude Code 就像一个不会抱怨、不需要股票期权、不请病假的初级工程师，随时接受任务，永不离职，能力随着基础模型的每次升级自动提升。

Netflix 用了，Spotify 用了，KPMG 用了，L'Oréal 用了，Salesforce 用了。这些企业不是"尝鲜用户"，而是把 Claude Code 写进了工程流程——进了流程，就很难出来。企业收入目前占 Claude Code 总收入的一半以上。

---

## 核心分析二：B2B 护城河为什么比 B2C 深

OpenAI 的优势在 B2C：ChatGPT 月活超过 1 亿，品牌认知无人能及。但消费者是最没有粘性的用户群。今天用 ChatGPT，明天试 Gemini，后天发现某个中国开源模型免费，就直接换了。B2C 用户的切换成本几乎为零。

Anthropic 选择了 B2B，切换成本完全不同。

一个工程团队把 Claude Code 集成进 CI/CD 流水线，意味着：换掉它需要重写脚本、更新文档、重新培训工程师、说服 VP 批预算，还要承担迁移期间的生产力损失。没有人愿意干这件事，除非替代品好到无法拒绝。

这就是为什么 Series H 的投资方——Altimeter Capital、Dragoneer、Greenoaks、Sequoia Capital——愿意在 $965 billion 的估值下押注。其中还包括 Amazon 承诺的 $5 billion 跟投，作为此前超大科技公司总计 $15 billion 承诺投资的一部分。

$965 billion 不是对一个模型的赌注，是对一个已经嵌入企业基础设施的系统的估值。本质是个普通护城河故事，只是发生在 AI 行业，所以数字特别大。

---

## 核心分析三：这场胜利藏着的代价

但 trade-off 必须讲清楚，不然这不是分析，是软文。

**代价一：成本曲线正在被从背后追。**

2026 年 5 月，四家中国实验室几乎同步发布开源编码模型：Z.ai 的 GLM-5.1、MiniMax M2.7、Moonshot 的 Kimi K2.6、DeepSeek V4。这四个模型在 SWE-Bench 等主流代码基准上的能力基本追平了 Claude Opus 4.7，而推理成本不到 Claude 的三分之一。

如果这条成本曲线继续往下走，企业客户终有一天会拿起计算器。Spotify 的 CTO 未必关心"哪家 AI 更有道德"，他关心的是每百万 tokens 多花了多少钱。

**代价二：IPO 压力会重新定义"安全"的边界。**

Anthropic 的整个品牌建立在一个区隔上：我们比 OpenAI 更负责任、更安全。这个定位在 VC 融资期间是资产——企业客户愿意为"出了问题有章可循的 AI"支付溢价。

但上市之后，季度收入压力、股东回报压力、分析师预期管理，会让每一个关于"安全优先"的决策都多出一个成本维度。OpenAI 2019 年也经历过这个十字路口，选择了商业化，然后就有了今天的 $852 billion 估值——但也有了那批理想主义创始人的集体出走。

Anthropic 现在到了同一个岔路口。

**代价三：Mythos 这个问题，没人愿意正面回答。**

2026 年 5 月 28 日，与 Series H 同天发布的，还有 Claude Opus 4.8，以及一个叫 **Claude Mythos Preview** 的模型——专为网络安全设计，只对"精选的少数公司"开放，Anthropic 称其具备"高级网络安全能力"。

2022 年 Constitutional AI 论文的 16 条原则里，有一条是"Avoid actions that could harm many people"（避免可能伤害许多人的行动）。

"高级网络安全能力"是防御性的，还是进攻性的？两者之间的界线，在一个正在谈 IPO、正在争政府合同的公司手里，会不会变得模糊？

这个问题现在没有答案，但值得记住。

---

## 升华：原则作为品牌锚，有承重极限

Anthropic 超越 OpenAI，表面是估值数字的比拼，背后是一个更古老的商业逻辑：**有时候，坚守某种原则作为品牌锚，比烧钱买用户更便宜。**

Anthropic 的"安全"定位，让它在企业市场拿到了信任溢价。Claude Code 的企业渗透率不是单靠营销做到的，是信任在变现。五年前那篇 Constitutional AI 论文，最终转化成了企业采购清单上的一个理由："我们选 Anthropic，因为他们出了问题有规可循。"

这条路走通了。

但所有的品牌锚都有承重极限。Dario Amodei 当年离开 OpenAI，也许正是因为他在 Sam Altman 的决策里看到了那个极限被逼近的样子。

现在是 2026 年，$65 billion 的融资路演结束，IPO 的钟已经在倒计时。

那个"helpful, harmless, honest"的宪法，下一轮拷问的主角，是 Anthropic 自己。

---

他们从 OpenAI 出走是为了避免这一天，还是为了准备好这一天——现在已经说不清楚了。

---

## 数据来源

- [Anthropic Series H 官方公告 — anthropic.com/news/series-h](https://www.anthropic.com/news/series-h)
- [Anthropic tops OpenAI as most valuable AI startup, nears $1 trillion valuation — CNBC (2026-05-28)](https://www.cnbc.com/2026/05/28/anthropic-open-ai-startup-value.html)
- [Anthropic raises $65 billion, nears $1T valuation ahead of IPO — TechCrunch (2026-05-28)](https://techcrunch.com/2026/05/28/anthropic-raises-65-billion-nears-1t-valuation-ahead-of-ipo/)
- [Anthropic's run-rate revenue hits $47 billion — Simon Willison's Weblog (2026-05-29)](https://simonwillison.net/2026/May/29/anthropic/)
- [Anthropic acquires Bun as Claude Code reaches $1B milestone — anthropic.com](https://www.anthropic.com/news/anthropic-acquires-bun-as-claude-code-reaches-usd1b-milestone)
- [New AI Models May 2026: The Frontier Took a Breath — WhatLLM.org](https://whatllm.org/blog/new-ai-models-may-2026)
- [Anthropic Nears $1T Valuation, Leapfrogs OpenAI — Crunchbase News](https://news.crunchbase.com/ai/anthropic-nears-1t-valuation-65b-seriesh/)
- [Can OpenAI and Anthropic IPOs Live Up to Expectations? — Bloomberg (2026-05-28)](https://www.bloomberg.com/news/articles/2026-05-28/can-openai-and-anthropic-ipos-live-up-to-expectations)
