---
title: "Anthropic 造出了最危险的AI黑客，然后只给大公司用"
description: "2026年4月，Anthropic 的 Mythos Preview 在10次尝试中6次独立完成32步企业内网入侵。OpenAI 嘲讽这是恐惧营销，22天后照抄了同一套限流机制。问题不在谁更虚伪，在于谁被排在门外。"
publishDate: 2026-05-16
tags:
  - ai-analysis
  - ai-news
  - anthropic
  - cybersecurity
author: "JR Academy AI 编辑部"
keywords: "Anthropic Mythos, AI网络安全, Project Glasswing, GPT-5.5-Cyber, OpenAI, AI黑客, 网络安全军备竞赛"
---

2026年4月8日，Anthropic 没有开发者大会，没有论文预印本，只在官网挂了一个访问申请表。表格问你是谁、管什么系统、打算怎么用。填完等审核。审核不过，什么都看不到。

这就是 Claude Mythos Preview 的发布方式——史上第一个被锁在申请表后面的 AI 模型，原因不是版权，不是商业授权，而是 Anthropic 自己说的："它的黑客能力太强，不能随便放出去。"

## 32步意味着什么

先把数字讲清楚，因为"AI能黑客"这种说法已经被过度使用到让人麻木了。

英国 AI 安全研究所（AISI）有一个测试环境叫"The Last Ones"，模拟的是一次完整的企业网络入侵：从最初的外部侦察，到找到突破口，到横向移动穿越内网，到提权，到最终完全接管目标系统。全程 32 个步骤，每一步都需要做决策、调整策略、响应防御机制。人类安全专家完成这个流程，平均耗时约 20 小时。

Claude Mythos Preview 的测试结果：**10 次尝试，成功 6 次**。

之前最好的大模型在同一个测试上是什么成绩？AISI 的措辞是：无法"有意义地推进这个攻击链"。Mythos 跨过的不是进步曲线上的一格，是一个之前不存在的能力门槛。

理解"32步自主入侵"是什么感觉，可以打个比方：把它想象成一个不需要睡觉、不需要工资、不需要请假、可以同时复制出一千份自己的渗透测试工程师。它没有情绪，不会犯"今天状态不好"的错误，也不会因为攻击链在第 19 步卡住而放弃——它会换角度重试。

Anthropic 在发布声明里说，Mythos 已经在"每一个主流操作系统和浏览器"里发现了数千个真实漏洞。这不是靶场演练，是对真实代码库的扫描结果。

## Project Glasswing：先给守卫发枪

Anthropic 的回应叫 Project Glasswing，逻辑很直接：在坏人获得同等能力之前，先让守卫用它把门锁好。

具体操作：Mythos 的访问权发给了 11 家核心机构——AWS、Apple、Broadcom、Cisco、CrowdStrike、Google、JPMorgan Chase、Linux Foundation、Microsoft、NVIDIA、Palo Alto Networks——外加 40 余家被认定为"关键软件基础设施维护者"的组织。

配套资源：**1 亿美元**使用额度 + **400 万美元**直接捐给开源安全组织。

这个逻辑本身没有问题。问题出在执行层面，以及一个非常精彩的对照实验。

## OpenAI 的 22 天

Anthropic 宣布限流 Mythos 之后，OpenAI 的公开回应是：这叫**"恐惧营销"**（fear-based marketing）。潜台词：我们不会搞这一套，真正负责任的做法是开放。

时间来到 2026 年 4 月 30 日，距 Mythos 发布整整 22 天。

Sam Altman 发布声明：OpenAI 开始向"关键网络防御者"（critical cyber defenders）推送 GPT-5.5-Cyber。申请方式？网站上有表格，填你的身份和用途，等审批。Altman 对这套机制的定性是："紧迫、协作、开放"。

结构一模一样。申请表，审批，限制访问。

真相是：在真正具备进攻性能力的 AI 模型面前，所有人的回答都是一样的。OpenAI 只是不愿意先承认。AISI 的独立测试结果显示，GPT-5.5 跟 Mythos 一样，"大幅超过了之前的自主网络攻击能力趋势"。OpenAI 知道自己需要限流，只是在等一个不让自己打脸的时机。

Altman 没有找到那个时机。他的嘲讽留在了公开记录里，GPT-5.5-Cyber 的发布页面也留在了公开记录里。

## 谁在门外等

现在说这件事真正的代价。

Project Glasswing 的 11 家核心成员，全部是美国公司或总部在美的机构（JPMorgan 是唯一的金融机构）。CNBC 的报道明确写道：大多数央行和政府机构不在初始访问范围内。

澳大利亚联储？等。新加坡金管局？等。印度储备银行？等。

这些机构管的是整个国家的金融基础设施，但拿不到 Mythos。

我的判断是：这个等待窗口有多长，这些机构的暴露风险就有多高。原因很简单：Mythos 级别的能力不会永远只停留在 Anthropic 和 OpenAI 手里。模型能力的扩散速度，历来比访问控制快。OpenAI 仅仅滞后了 22 天就发布了能力相当的模型。训练同类模型的团队不止这两家。

这套限流机制客观上造成的结果是：最有钱、跟顶级 AI 公司关系最近的机构，优先获得防御工具；其他所有人在排队。Glasswing 保护的，恰恰是最不需要被保护的那批人。AWS、Google、Microsoft 各有数百人规模的安全团队，它们站在队伍最前面。中等规模的政府机构、非西方国家的金融监管机构、没钱养红队的关键基础设施运营商，在后面等。

## 防御能力的产权

这里有一个更大的结构性问题浮现出来。

"负责任的 AI 发布"这个框架，在过去两年里主要处理的是文本生成问题：模型可能生成有害内容，所以要有内容过滤、要有使用条款、要有举报机制。麻烦但可以管理——因为有害文本是内容问题，规模化难。

Mythos 改变了这个计算。它写出的不是文本，是可以运行的 exploit 代码。一旦扩散，不需要人类中间环节就能规模化成攻击行动。所以 Anthropic 和 OpenAI 都正确地判断：不能随便放。

但"谁可以防御自己的系统"变成了一道资质题。这是防御性能力的一次重新分配，分配的依据不是谁更需要保护，而是谁跟 AI 公司的关系足够近。

这个模式一旦确立，它就会在下一代、下下一代模型上复刻。每一次模型能力跃升，都是一次准入资质的重新分配。今天在名单上的机构保持领先；不在名单上的继续等待，同时暴露在越来越强的攻击工具下。

准入资质，成了防御的门槛。

## 数据来源

- [Claude Mythos Preview – Anthropic Safety Research](https://red.anthropic.com/2026/mythos-preview/)
- [Claude Mythos Solves 32-Step AISI Hack In 6 Of 10 Attempts – Yellow.com](https://yellow.com/news/mythos-doubles-aisi-cyber-score)
- [Project Glasswing: Securing critical software for the AI era – Anthropic](https://www.anthropic.com/glasswing)
- [After dissing Anthropic for limiting Mythos, OpenAI restricts access to Cyber, too – TechCrunch](https://techcrunch.com/2026/04/30/after-dissing-anthropic-for-limiting-mythos-openai-restricts-access-to-cyber-too/)
- [OpenAI rolls out new GPT-5.5-Cyber to vetted cybersecurity teams – CNBC](https://www.cnbc.com/2026/05/07/openai-rolls-out-new-gpt-5point5-cyber-to-vetted-cybersecurity-teams.html)
- [Anthropic's Mythos set off a cybersecurity 'hysteria.' Experts say the threat was already here – CNBC](https://www.cnbc.com/2026/05/08/anthropic-mythos-ai-cybersecurity-banks.html)
- [Too Dangerous to Deploy: Anthropic's Mythos and What Comes Next – Just Security](https://www.justsecurity.org/138011/too-dangerous-anthropic-mythos/)
- [TAI #200: Anthropic's Mythos Capability Step Change and Gated Release – Towards AI](https://newsletter.towardsai.net/p/tai-200-anthropics-mythos-capability)
- [Claude Mythos turns years of security research into 20-hour AI exploits – TechRadar](https://www.techradar.com/pro/claude-mythos-turns-years-of-security-research-into-20-hour-ai-exploits)
- [OpenAI to roll out GPT 5.5 Cyber with restricted access: Sam Altman – BusinessToday](https://www.businesstoday.in/technology/story/openai-to-roll-out-gpt-55-cyber-with-restricted-access-sam-altman-528193-2026-04-30)
