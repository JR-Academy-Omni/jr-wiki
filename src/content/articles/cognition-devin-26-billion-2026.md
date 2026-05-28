---
title: "Devin 写了自己 90% 的代码，然后融了 10 亿美元"
description: "2024年3月 SWE-Bench 得分 13% 被全网嘲笑，两年后 Devin 写掉 Cognition 90% 的代码、ARR 达 $492M、估值跳至 $26B。这是一家 AI 编程公司用自己的产品证明自己的故事。"
publishDate: 2026-05-28
tags:
  - ai-analysis
  - ai-news
  - cognition-ai
  - ai-coding
author: "JR Academy AI 编辑部"
keywords: "Cognition AI, Devin, AI软件工程师, SWE-Bench, AI编程工具, Windsurf收购, AI估值"
---

2024 年 3 月，Scott Wu 把 Devin 的演示视频发上 Twitter，SWE-Bench 测试分数是 13%。

程序员社区当天轮番上来拆台——"这不就是加了 GPT 的 bash 脚本""GitHub Copilot 早做到了""benchmark 是精心挑选的，真实项目跑不了"。

2026 年 5 月 27 日，Cognition 宣布完成超过 10 亿美元融资，估值 260 亿美元（$26B post-money）。领投方是 Lux Capital、General Catalyst、8VC。

同天公布的另一个数字比融资数字本身更有意思：Cognition 现在 90% 的代码，是 Devin 自己写的。

## 三个 IOI 金牌，一家被低估的公司

Cognition 成立于 2023 年 8 月，三位联合创始人——Scott Wu、Steven Hao、Walden Yan——全是国际信息学奥赛（IOI）金牌得主，Scott Wu 2014 年拿过全球第一名。

这个背景不是装饰。竞赛选手习惯在严格约束下找最优解，不爱做表演性 demo，就是死磕一个问题直到数字好看。这直接解释了 Cognition 后来的打法：方向定了之后，两年时间主要就在做一件事——把 SWE-Bench 从 13% 往上推。

公司最早不做 AI，而是搞加密货币。ChatGPT 出来之后，团队转向，方向定成「AI 软件工程师」。2024 年 1 月，Peter Thiel 的 Founders Fund 给了第一笔 2100 万美元，估值 3.5 亿。

三个月后，2024 年 4 月，Founders Fund 追加领投 1.75 亿美元，估值跳到 20 亿——公司成立才 8 个月，就成了独角兽。

到 2026 年 5 月，融资历程是这样的：

| 轮次 | 时间 | 估值 |
|------|------|------|
| 天使 | 2024 年 1 月 | $3.5 亿 |
| A 轮 | 2024 年 4 月 | $20 亿 |
| B 轮 | 2025 年 3 月 | $40 亿 |
| C 轮 | 2025 年 9 月 | $102 亿 |
| D 轮 | 2026 年 5 月 | $260 亿 |

从 $20 亿到 $260 亿，用了两年。

## 13% 到 90%，他们改了什么

SWE-Bench 是 AI 编程能力的基准测试之一，任务是让模型修复真实 GitHub repo 的 bug——读代码库、理解上下文、定位问题、写补丁、通过测试。

Devin 2024 年 3 月第一版出来的时候，13% 意味着每 10 个任务失败 7 个以上。说白了，它是一个还需要人全程盯着的 AI 助手，而不是能独立干活的工程师。

批评者没说错：那个版本确实存在很多局限。但他们低估的是：13% 是当时业界最高分，而 Cognition 选择了把这个方向死磕下去。

Devin 后来改的核心方向是：**让它具备「规划—执行—验证」的完整循环，而不只是「生成代码」**。

翻译成人话：以前的 AI 编程工具像一个只会打字的实习生——你说需求，它生成代码，但 debug、运行测试、看报错再改，都是你的事。Devin 要做的是全流程接管：拿到任务、拆解步骤、写代码、跑测试、看失败信息、再改，提 PR，循环直到通过。

2025 年 4 月，Devin 2.0 发布：内置 IDE，支持开出子 Devin 做子任务，起步价 20 美元/月。

到 2026 年，SWE-Bench 原版测试接近 90%，SWE-Bench Pro（更难的版本）在 80% 左右。

现在停下来看 90% 这个自写代码比例。这不是一句公关措辞。Cognition 的工程师每天用 Devin 来开发 Devin 本身——任何 Devin 生成了烂代码、规划跑偏了、循环卡死了，内部工程师第一批体感。能在这个条件下把年化营收推到 4.92 亿美元，意味着产品已经通过了最苛刻的内部压测。

## Cursor 的那堵墙，和 Cognition 的赌注

AI 编程赛道今天大致分两条路。

一条叫「AI 辅助」：GitHub Copilot、Cursor、早期的 Windsurf——工具帮你补全、推荐、生成片段，开发者全程主控。这条路的优点是：出错好追溯、审计清晰、对现有工程文化改造成本几乎为零。

另一条叫「AI 自主」：Devin——你描述任务，AI 去做，它自己查文档、写代码、跑测试、提 PR。你 review 的是结果，不是每一行的过程。

这两条路的差距，有点像 GPS 导航和全自动驾驶的差距。Cursor 让你开车开得更快，Devin 要让你不需要开。

Cognition 押的是第二条路，代价是：**可靠性始终是核心挑战**。2026 年 5 月融资发布的同一天，有媒体标题写的是「获得 260 亿估值，同时面临可靠性质疑」。

这个质疑是真实的。自主 agent 做的任务越复杂，出错路径就越多。Devin 在 Goldman Sachs 写的代码如果出问题，影响范围远超 Copilot 给程序员补了一个错误的函数。

Cognition 接受这个代价，然后用企业客户的真实数据把可靠性往上推。Goldman Sachs、Citi、梅赛德斯、美国陆军、美国海军——这五家客户不是在试用，是在跑生产环境任务。他们在那里，说明 Devin 的可靠性已经过了某个门槛，至少在特定类型的任务上。

我的判断是：Cognition 现在玩的不是「我比 Cursor 好用」的游戏，而是「我在开辟一个完全不同的市场」。Cursor 的客户是工程师，工程师用 Cursor 写自己的代码。Devin 的客户是需要写软件但不想养工程师团队的公司——而这个市场，比「给程序员用的补全工具」大得多。

## Windsurf 那一步棋

2025 年 7 月，Cognition 宣布收购 Windsurf。

在这之前，Windsurf 先是被 OpenAI 盯上，然后 Google 拿走了 Windsurf 的模型 IP 授权，之后 Cognition 买下了剩下的公司本体。Windsurf 带来的是：8200 万美元 ARR、350 家以上企业客户、数十万日活用户。

这步棋的逻辑直接：Devin 是一个后台自主 agent，Windsurf 是开发者前台的 IDE。做自主 agent 的公司收了最热门的 IDE 之一，意味着同时覆盖了「自主完成任务」和「帮开发者写代码」两个模式，两条路都不舍弃，也不让竞争对手把 IDE 这个入口锁死。

有个趋势在这里值得点出来：2025 年到 2026 年，AI 编程的战场从「谁的补全更聪明」，迁移到「谁控制了开发者的工作流」。IDE 是工作流的核心，Cursor 以此建立了护城河，Cognition 通过 Windsurf 收购，买到了这道入场券。

合并后，Windsurf 的 $82M ARR 叠加 Devin 自身的增长，到 2026 年 5 月，总年化营收跑率达到 $492M，企业端用量较年初增长超过 10 倍。

## 升华：自食其力，是最硬的 PMF

AI 公司通常用 benchmark 证明产品，用客户案例说自己好用。

Cognition 多了一种证明方式：Devin 写 Devin。

当一家公司的产品好到公司主要靠它运转的时候，产品与市场的契合（PMF）就不再需要外部验证了——产品已经自我验证了。任何工程师看到「这家公司 90% 的代码是自己的 AI 写的」，都会意识到这不是实验室演示，是真的在生产环境中跑。

这也解释了为什么 Goldman Sachs 和美军愿意进来。这两类客户都不爱豪赌：金融机构有技术尽调团队，军方有安全审核流程。他们能进去，说明 Devin 在特定类型的任务上，已经通过了他们的门槛。

从 $350M 到 $260 亿，Cognition 的路径是：押对方向 → 死磕 benchmark → 自己的产品先吃自己 → 拿下挑剔的大客户 → 再拿更多钱。没有弯弯绕，就是在一个方向上的两年复利。

它在写自己了。

## 数据来源

- Bloomberg（2026-05-27）：Cognition AI raises $1B at $26B value — 搜索摘要引用
- TechCrunch（2026-05-27）：AI coding startup Cognition raises $1B at $25B pre-money valuation — 搜索摘要引用
- The Decoder：AI coding agent Devin maker Cognition more than doubles its valuation to $26 billion in under nine months — 搜索摘要引用
- The Next Web（2026-05-27）：Cognition just raised $1 billion at a $26 billion valuation, and 90% of its own code is written by its AI — 搜索摘要引用
- AI Daily Post（2026-05-27）：Cognition, creator of AI coder Devin, raises USD 1B and hits USD 26B valuation — 搜索摘要引用
- Lenny's Newsletter — Inside Devin: Scott Wu interview — 搜索摘要引用（Scott Wu IOI 背景 + Devin 路线）
- Cognition Wikipedia — 搜索摘要引用（公司成立时间、联合创始人背景、融资历程）
- VentureBeat：Cognition follows Windsurf acquisition with $400M fundraise — 搜索摘要引用（Windsurf ARR $82M）
- TechCrunch（2025-07-14）：Cognition, maker of the AI coding agent Devin, acquires Windsurf — 搜索摘要引用
- Whalesbook（2026-05-27）：Cognition AI Valued at $26B After $1B Funding Amid Reliability Fears — 搜索摘要引用（可靠性质疑背景）
