---
title: "SpaceX 600 亿收购 Cursor：用火箭股票买 AI 野心"
description: "2026年6月16日，SpaceX以600亿美元全股票收购Cursor，距IPO仅四天。史上最大创业并购背后，是xAI 11位联创全部出走、马斯克用刚印出来的股票重建AI野心的真实逻辑。"
publishDate: 2026-07-07
tags:
  - ai-news
  - ai-analysis
  - spacex
  - cursor
  - ai-coding
author: "JR Academy AI 编辑部"
keywords: "SpaceX收购Cursor, Anysphere, xAI, Grok, AI编程工具, 创业并购, 马斯克AI战略"
---

2026 年 6 月 12 日，SpaceX 在纳斯达克上市，发行价 $135，当天收盘 $192.46。四天后的 6 月 16 日，SpaceX 动用那批刚刚上市的股票，以 600 亿美元买下了 Cursor。

这是人类历史上最大的一笔创业公司并购案，金额超过了此前所有纪录。被买下的，是一家 AI 代码编辑器公司。

埋单的，是一家造火箭的公司。

## 为什么是火箭公司

你可能已经记不清 xAI 了。

2023 年，马斯克带着 11 个联创成立了 xAI，定位是对标 OpenAI 的 AI 研究实验室。Grok 是 xAI 的旗舰模型，Colossus 是 xAI 投资建设的超算集群，规模一度号称全球最大 GPU 训练设施之一。

然后，所有 11 个联创陆续离职了。

时间线是这样的：2026 年 2 月 10 日，推理团队负责人 Tony Wu 宣布离职；不到 24 小时，主管研究和安全的联创 Jimmy Ba 紧跟着辞职。到 3 月 28 日，最后留下的两位联创 Manuel Kroiss 和 Ross Nordeen 相继离开，xAI 的 11 位原始联创全部出走，另有逾 80 名 AI 研究员随之离去。

马斯克对这段历史的解释是：xAI"第一次没建对，现在正在从基础重建"。

这不是辩解，是承认。

SpaceX 在 2026 年初完成了对 xAI 的并购整合。但整合带来了文化冲突——xAI 的研究文化与 SpaceX 的里程碑式工程文化格格不入，联创们一个接一个离开。等到 3 月底最后一个联创走光的时候，SpaceX 的 AI 板块，等于是一栋空了的楼。

## 这笔钱从哪里来

说清楚：SpaceX 支付的 600 亿美元不是现金，是股票。

6 月 12 日 IPO 之后，SpaceX 手里有了一样关键的东西：可在市场上流通的上市股票。到 6 月 16 日宣布收购时，SpaceX 总市值已突破 2.7 万亿美元。600 亿美元的 Cursor 股票，不到 SpaceX 总市值的 2.3%。

这不是正常的企业并购逻辑——那通常需要现金或长期积累的自由现金流。这是另一套逻辑：**用刚刚印出来的货币买资产**。SpaceX 上市，本质上是把未来收益折现成今天可以流通的股票；而 Anysphere 的联创团队拿到的，是一张数额写着 600 亿、但内容是 SpaceX 股票的支票。

更早的线索是：2026 年 4 月 21 日，SpaceX 与 Anysphere 签下了一份期权合同，约定 SpaceX 有权以约定条件收购 Cursor，如选择不行权需支付约 100 亿美元的违约金。也就是说，在 SpaceX 还没上市的时候，这笔交易就已经约定好了。

Cursor 的 VC 们估计惋惜不已。就在这笔交易宣布前，Cursor 正在推进一轮由 a16z、Thrive Capital 和英伟达领投的 20 亿美元融资，预期估值 500 亿美元。SpaceX 最终出价 600 亿，比那个 VC 轮溢价了 20%。这 100 亿的溢价，是马斯克为了不让 Cursor 独立上市或被竞争对手截胡，支付的时间成本。

## SpaceX 到底买的是什么

从产品上看，Cursor 是目前世界上最受开发者欢迎的 AI 编程工具之一。

但 SpaceX 要的不是"产品"，要的是三样东西。

**第一，数据。** Cursor 拥有大量真实开发者工作流数据——开发者如何描述需求、如何在代码库里导航、如何迭代修 bug、如何引导 AI 多轮对话。这些数据是对话模型训练集里最稀缺的类型：真实任务、真实反馈、多步推理过程。

SpaceX 在宣布收购当天的官方 X 帖子写道："过去数月，SpaceXAI 已经在与 Cursor 联合训练一个模型，将在 Cursor 和 Grok Build 中发布。"

这话翻译成结构语言是：SpaceX 在签期权之后就开始用 Cursor 的数据训练 Grok，而这个安排是对外保密的，直到收购宣布才公开。Grok V9-Medium，参数量 1.5 万亿（是此前 v8-small 约 5000 亿参数的 3 倍），核心训练数据里包含了大量 Cursor 真实开发者工作流会话。6 月 24 日，Cursor 团队在 Colossus 超算上独立完成了一个 1.5 万亿参数前沿模型的从零训练——这是一个代码编辑工具公司第一次独立训练出前沿规模的基础模型。

**第二，算力。** Cursor 此前依赖 Anthropic、OpenAI、Google 等外部 API 提供模型能力。并入 SpaceX 之后，Cursor 直接获得 Colossus 超算集群的访问权。这对 Cursor 意味着：定价自主权、延迟降低、以及不再受制于任何竞争对手的 API 使用条款。

**第三，人才。** xAI 的 11 个联创走光了，80 多名研究员也走了。Anysphere 的联创团队——深度专注于 AI 辅助编程体验的工程师——在整合之后，相当于给 SpaceX 的 AI 部门注入了目前全球最懂 AI 编程工具体验设计的骨干力量。

一旦交易在 Q3 2026 完成，SpaceX 将同时持有：超算（Colossus）、前沿模型（Grok）、AI 编程工具（Cursor）、以及这个工具产生的真实用户训练数据。这个组合，在全球没有第二家公司同时具备。

## 谁是这笔交易的输家

从竞争格局来说，输家不只是那些没有拿到 Cursor 股权的外部 VC。

首先是 Cursor 的现有用户，数以百万计的开发者。他们选择 Cursor 的理由之一，是它支持灵活切换背后的 AI 模型——Claude、GPT-4o 或 Gemini，开发者可以按任务自由选择。随着 Grok V9-Medium 逐步整合进 Cursor，这种模型中立性会系统性地收窄。一个工具的内核，在被收购之后很少会保持中立。

其次是 Anthropic 和 OpenAI。Cursor 是两家公司 API 消耗的重要来源。收购完成之后，这部分 API 调用量将从外部迁移到 SpaceX 内部，直接影响两家公司的营收。对 Anthropic 来说，这个损失尤其敏感——Anthropic Q2 2026 年化营收刚刚突破 100 亿美元，主要靠企业端 API；失去 Cursor 这样级别的用户，是结构性的缺口而不是边缘误差。

最后，失去的是一种结构上的多元。收购之前，AI 编程工具赛道最头部的两个产品——Cursor 和 GitHub Copilot——分别由独立公司和微软运营，竞争而生态各异。现在 Cursor 并入了马斯克的版图，这个赛道从"双头竞争"变成了"Musk vs Microsoft"。两家都是高度垂直整合的生态，开发者的平台选择，从此比任何时候都更难做到真正中立。

## 这场收购说明什么

马斯克的 AI 路径，从来不走直线。

xAI 的方式是从零搭研究院——失败了。Colossus 的方式是用算力换模型优势——做成了，但人才跑光了。SpaceX 收购 Cursor 的方式是：用上市的货币资本，买下一个已经在市场上验证的产品 + 数据飞轮。

说白了，这场收购的底层逻辑是：SpaceX IPO 是工具，不是目的。

真正的目的是：在 AI 编程赛道建立一个不可动摇的闭环——Cursor 的使用行为数据训练 Grok，Grok 的能力提升让 Cursor 更好用，Cursor 更好用吸引更多开发者，更多开发者产生更多训练数据。这个飞轮，竞争对手要打破的唯一方法是提前买一个类似规模的编程工具入口——但那个入口，现在已经不在了。

Anysphere 的联创团队，身价据报道翻番，各自套现了一大张 SpaceX 股票。他们不是这个故事里的受害者，是另一端的获益者。

但代码编辑器，从此不再是独立软件，是 AI 军备竞赛的棋子。

---

马斯克用火箭股票，买回了自己的 AI 未来。

## 数据来源

- [SpaceX to acquire Cursor for $60B in stock, days after blockbuster IPO — TechCrunch](https://techcrunch.com/2026/06/16/spacex-to-acquire-cursor-for-60b-in-stock-days-after-blockbuster-ipo/)
- [SpaceX Buys Cursor In Largest Startup Acquisition Ever At $60 Billion — Forbes](https://www.forbes.com/sites/sandycarter/2026/06/16/spacex-buys-cursor-in-largest-startup-acquisition-ever-at-60-billion/)
- [SpaceX to acquire the AI coding startup Cursor for $60 billion — CNBC](https://www.cnbc.com/2026/06/16/spacex-spcx-cursor-acquisition-ipo.html)
- [Elon's super currency: SpaceX' surging stock paid for the $60 billion Cursor acquisition — Fortune](https://fortune.com/2026/06/16/elon-musk-spacex-ipo-ai-coding-startup-cursor-acquisition/)
- [SpaceX Cursor acquisition doubles cofounders' net worths — Quartz](https://qz.com/spacex-acquiring-cursor-anysphere-60-billion-stock-deal-061726)
- [Elon Musk's last co-founder reportedly leaves xAI — TechCrunch](https://techcrunch.com/2026/03/28/elon-musks-last-co-founder-reportedly-leaves-xai/)
- [Elon Musk's xAI loses co-founder Tony Wu in latest senior departure — CNBC](https://www.cnbc.com/2026/02/10/elon-musk-xai-co-founder-tony-wu.html)
- [Cursor Trains First Frontier Model From Scratch on Colossus: 1.5 Trillion Parameters — TechTimes](https://www.techtimes.com/articles/318974/20260624/cursor-trains-first-frontier-model-scratch-colossus-15-trillion-parameters.htm)
- [Grok V9-Medium Arrives as SpaceX Seals Cursor — TechTimes](https://www.techtimes.com/articles/318495/20260616/grok-v9-medium-arrives-spacex-seals-cursor-developers-face-model-choice-risk.htm)
- [SpaceX on X (official announcement)](https://x.com/SpaceX/status/2066873915717136548)
