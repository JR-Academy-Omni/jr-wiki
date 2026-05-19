---
title: "17天四发：中国AI实验室用开源编程模型打响定价战"
description: "2026年4月，Z.ai、MiniMax、Moonshot、DeepSeek在17天内接连发布四个开源编程大模型，全部触及西方顶级闭源模型的基准天花板，但推理成本只有Claude Opus 4.7的几十分之一。这不是技术比赛，是一场有国家资本兜底的成本结构战。"
publishDate: 2026-05-19
tags:
  - ai-analysis
  - ai-news
  - deepseek
  - open-source-ai
author: "JR Academy AI 编辑部"
keywords: "DeepSeek V4, Kimi K2.6, GLM-5.1, MiniMax M2.7, AI编程模型, 开源大模型, SWE-Bench, AI定价战"
---

2026年4月7日，Z.ai把754亿参数的 GLM-5.1 扔上了 GitHub，MIT 许可证，SWE-Bench Pro 跑出58.4%。17天之后的4月24日，DeepSeek V4 Pro带着1.6万亿参数落地。中间还挤进来 MiniMax M2.7 和 Moonshot 的 Kimi K2.6。四家公司，四个大模型，全部开源，全部瞄准软件工程任务，全部定价在 Claude Opus 4.7 的零头以内。

这不是巧合。

## 舞台：一个赌注超过三万亿美元的赛道

先说清楚 SWE-Bench 测的是什么。它把真实的 GitHub issue——程序员在线改 bug 的任务——抽出来让 AI 跑，看能解决多少。SWE-Bench Verified 的高分意味着 AI 能接近 GitHub 上最强人类贡献者的水平；SWE-Bench Pro 更难，专门刁难代码库理解和多步推理。

换句话说，它测的不是 AI 能不能背诗——它测的是 AI 能不能让你少雇一个工程师。

全球软件工程师薪资市场体量超过3万亿美元。把编程模型的推理成本从每百万 token $5 打到 $0.14，就是在说：雇一个 AI 完成代码审查的成本，从"买一台 MacBook Pro"变成"买一个无线鼠标"。

这就是为什么这17天值得认真分析。

## 四发：模型、数字、架构

**GLM-5.1（Z.ai，4月7日）**

Z.ai 前身是清华大学 KEG 实验室孵化的智谱 AI。GLM-5.1 是它的旗舰开源模型：754亿参数，Mixture-of-Experts 架构，200K 上下文。SWE-Bench Pro 58.4%，Terminal-Bench 2.0 63.5%，AIME 2026 数学题集 95.3%。

关键是 MIT 许可证。企业可以下载全量权重本地部署，不受商业限制，也不向任何第三方 API 泄露源代码。这一点对处理敏感代码库的金融和医疗客户有决定性意义。

**MiniMax M2.7（MiniMax，4月中旬）**

最激进的架构设计。230亿总参数，但每次推理只激活约100亿参数。SWE-Bench Pro 56.22%，Terminal Bench 2.0 57.0%。定价 $0.30/百万输入 token。MiniMax 还宣称 M2.7 具备"自我进化"能力，模型上线后持续从交互中更新自身——这个功能目前没有被独立机构验证过。

**Kimi K2.6（Moonshot AI，4月20日）**

这轮里成绩最高的一个。1万亿总参数，每个 token 激活320亿参数，256K 上下文，MIT 许可证。SWE-Bench Pro 58.6%，SWE-Bench Verified 80.2%，在所有公开评测中是目前开源模型的最高分。对比数字：GPT-5.4 在 SWE-Bench Pro 上是57.7%，Claude Opus 4.6 是53.4%，Gemini 3.1 Pro 是54.2%。

Kimi K2.6 以低于 Claude Opus 4.7 十二分之一的价格，在编程基准上跑赢了 GPT-5.4。

**DeepSeek V4（DeepSeek，4月24日）**

两个版本：V4-Pro（1.6万亿总参数，490亿激活，支持100万 token 上下文）和 V4-Flash（2840亿总参数，130亿激活）。DeepSeek 为 V4 引入了 Compressed Sparse Attention 架构：在满上下文推理时，FLOP 消耗只有上一代 V3.2 的27%，KV 缓存内存只需10%。这是被迫出的招——出口管制卡住了 A100/H100，逼得 DeepSeek 只能在算法层面省计算量。

上线定价：V4-Flash 每百万输入 token $0.14，深度缓存命中价格低至 $0.004。

## 价格差：这不是优化，是降维

数字摆出来看一眼。

Claude Opus 4.7：$5/百万输入，$25/百万输出。Anthropic 今年还换了一个新 tokenizer，相同文本产出的 token 数量增加最多35%——也就是说实际账单可能比标价再高三分之一。

对照组：
- Kimi K2.6：$0.60/百万输入——是 Opus 4.7 的12%
- MiniMax M2.7：$0.30/百万输入——是 Opus 4.7 的6%
- DeepSeek V4-Flash：$0.14/百万输入——是 Opus 4.7 的2.8%

这不是某一家企业靠效率优化出来的价差。这是系统性的、跨越四家独立公司的、在同一时间段内集体呈现的价差。背后必然有结构性原因。

## 为什么这种价格能成立？

说白了，中国 AI 实验室的成本函数和西方公司不一样。

Anthropic 的 $5/百万 token 里包含什么？年薪$300K 到 $700K 的美国 AI 安全研究员，旧金山的写字楼，监管合规，Constitutional AI 和 RLHF 的长期研究投入——这些都是直接烧钱、没有短期商业回报的方向。Anthropic 需要靠 API 收入支撑整条研究线。

DeepSeek 和 Kimi 的成本函数呢？人力成本更低，被出口管制倒逼出了更省计算量的架构，不需要在旧金山租地，背后有国家级资本注入且不要求短期盈利。

翻译成人话：Anthropic 在用 API 收入交叉补贴安全研究，DeepSeek 在用国家资本支撑价格战。这是两套不同的激励结构在同一个市场里碰撞。

成本函数更低的那一方，可以无限期维持低价——直到对手活不下去，或者游戏规则发生改变。

但这里有明确的 trade-off。

中国四个模型的"便宜"是有代价的。开源只开了权重，训练数据、微调配方、对齐流程全部是黑盒。你可以下载 Kimi K2.6 的权重本地跑，但你不知道它的安全评测是否可信，也无法独立复现它的能力。GLM-5.1 的200K 上下文在百万行代码库面前还是不够用。DeepSeek V4 的100万 token 上下文在理论上够用，但激进的 KV 缓存压缩对超长距离依赖的影响目前还没有被系统评测过。

对于处理敏感代码的企业客户，"MIT 许可证"不等于"可以信任"。

## 西方的应对

Anthropic 没有正面回应这轮价格竞争，但行动已经说明立场：今年推出的批量处理 API，叠加缓存最高可把 Opus 4.7 的有效成本压缩到约5%，也就是进入 $0.25/百万 token 的区间。差距从12倍收窄到了近乎持平——但前提是你的使用场景高度适合批量处理和缓存命中。

OpenAI 的策略是速度而非价格。5月5日发布的 GPT-5.5 Instant 主打降低幻觉率（比前代降低52.5%）和推理速度，没有跟进价格战。

这个判断背后的逻辑是：他们认为企业最终会为"可审计的供应链"溢价付费。美国政府已经开始推动 AI 供应链审查，主要针对数据主权和模型可追溯能力。如果监管层面强制要求使用可审计的 AI 服务，中国模型的价格优势就会被合规成本部分抵消。

这个赌注不是没有根据，但在相应监管法规落地之前，它只是一个假设。

## 基础设施战的终局逻辑

四家中国 AI 实验室17天的集体行动，表面上是性能竞赛，本质上是在争夺全球开发者的 API 账单流向。更深一层看，这是一场对"谁来定义 AI 编程基础设施标准"的争夺。

这是一个经典的基础设施竞争剧本：先打价格换流量，再用流量换技术锁定，最后用锁定换定价权。MIT 许可证让模型迁移的门槛趋近于零，但工程依赖和使用习惯让实际迁移成本指数级上升。当全球一半的编程 agent 工作流嵌入了 DeepSeek 或 Kimi 的 API，再谈"切换"就不只是改一行 API key 的问题了。

西方闭源模型需要在"信任溢价"被价格压垮之前找到新的护城河。否则有一天会发现：自己的客户不是被竞争对手抢走的，而是在算成本的时候，慢慢地、安静地、自己换掉了供应商。

钱不说谎。

## 数据来源

- [China's DeepSeek unveils latest models — Al Jazeera, 2026-04-24](https://www.aljazeera.com/economy/2026/4/24/chinas-deepseek-unveils-latest-model-a-year-after-upending-global-tech)
- [DeepSeek V4 Preview Release — DeepSeek API Docs](https://api-docs.deepseek.com/news/news260424)
- [DeepSeek V4 — Simon Willison, 2026-04-24](https://simonwillison.net/2026/Apr/24/deepseek-v4/)
- [Kimi K2.6: 1T MoE model, SWE-Bench Pro 58.6% — Reeboot, 2026](https://reeboot.fr/en/blog/kimi-k26/)
- [MiniMax M2.7: A Self-Evolving Agent Model — MarkTechPost, 2026-04-12](https://www.marktechpost.com/2026/04/12/minimax-just-open-sourced-minimax-m2-7-a-self-evolving-agent-model-that-scores-56-22-on-swe-pro-and-57-0-on-terminal-bench-2/)
- [GLM-5.1: #1 Open Source AI Model Review — BuildFastWithAI, 2026](https://www.buildfastwithai.com/blogs/glm-5-1-open-source-review-2026)
- [Claude Opus 4.7 Pricing 2026 — Finout](https://www.finout.io/blog/claude-opus-4.7-pricing-the-real-cost-story-behind-the-unchanged-price-tag)
- [Three Weeks, Four Chinese Coding Models — Medium (Can Demir), 2026-05](https://medium.com/@candemir13/three-weeks-four-chinese-coding-models-whats-actually-real-and-what-s-overstated-4cb58199e83d)
