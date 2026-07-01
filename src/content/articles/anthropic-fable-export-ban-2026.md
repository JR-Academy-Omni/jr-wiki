---
title: "发布三天，被政府关停：Fable 5 暴露出 AI 最危险的政治逻辑"
description: "2026年6月9日Anthropic发布了有史以来最强的模型；6月12日晚商务部长Lutnick的一封信把它关掉了。这不只是一次封禁，是第一次证明美国政府随时可以拔掉任何AI公司的插头——理由只需一个越狱漏洞。"
publishDate: 2026-07-01
tags:
  - ai-news
  - ai-analysis
  - anthropic
  - ai-governance
author: "JR Academy AI 编辑部"
keywords: "Anthropic Fable 5, Mythos 5, 出口管制, AI政策, AI监管, Claude Sonnet 5, 国家安全"
---

2026年6月9日，Anthropic把Claude Fable 5和Claude Mythos 5推向了市场。前者是它有史以来向普通用户开放的性能最高的模型，在代码基准SWE-Bench Pro上跑出80.3%，把GPT-5.5的58.6%远远甩在身后。后者更强，只给了一小撮经过审查的网络安全机构。

三天后的6月12日晚，商务部长Howard Lutnick亲自给Dario Amodei写了一封信，告诉他：把这两个模型全下了。

没有谈判，没有缓冲期，没有上诉程序。

## Mythos级：Anthropic为什么敢叫它史上最强

先搭清楚这两个模型是什么，以及它们为什么是一条分水岭。

Fable 5是Anthropic定义的"Mythos级"模型里第一个向公众开放的版本。"Mythos级"是内部划定的一个能力层——坐落在原来的Opus级之上，意味着更强、更危险也更难以完全驯服。Fable 5是这个层级里完成了安全审查、可以商用的版本；Mythos 5是同一个底层模型，卸掉了部分安全护栏，只发给有授权的网络安全机构和关键基础设施运营商。

数字说话。Fable 5 / Mythos 5在几个主要基准上的表现：

- **SWE-Bench Pro**（代码工程）：80.3%，Claude Opus 4.8是69.2%，GPT-5.5是58.6%，Gemini 3.1 Pro是54.2%
- **Terminal-Bench 2.1**（长线任务完成）：88.0%，GPT-5.5是83.4%，Gemini 3.1 Pro是70.7%
- **GDPval-AA**（综合知识能力）：1932，Opus 4.8是1890，GPT-5.5是1769

在SWE-Bench Pro上的80.3%意味着什么？翻译成人话就是：把100个真实工程师处理过的bug和功能需求丢给这个模型，它能独立解决80个。这个数字在一年前被认为是顶级人类工程师的水准。

有一个细节很少被报道：Fable 5本身内置了"静默降级"机制——当用户的提问触碰某些敏感边界，模型会悄悄切换到一个弱化版本来作答，用户完全不知情。Anthropic说这覆盖了不到5%的会话。

说白了，这是Anthropic自己安装的内嵌审查阀门。

审查还是不够。

## 一封信，三天

Lutnick信件的法律依据是美国商务部的出口行政条例（EAR）——原来用来管核材料、军用密码算法和导弹制导技术的法律工具。

政府给出的理由只有一条：已得知有人找到了绕开Fable 5安全护栏的方法。

指令措辞极宽：暂停向任何外国国籍人士提供Fable 5和Mythos 5的全部访问权限，不论这些人在哪个国家，也不论他们是不是Anthropic自己的员工。

Anthropic没有更多选择。在技术层面，你没办法在保留美国公民访问的同时精准过滤掉所有外国人——访问控制系统做不到那个粒度。只要合规，就只有一个做法：对所有人关闭。两个全球性能最强的商用AI模型，从Claude.ai的模型选择页面上消失了。

Anthropic的官方声明措辞审慎，但立场清晰：公司不同意这个决定。它直接说出了那句行业最不敢说的话——**如果这个标准被系统性执行，整个行业不可能再发布新的前沿模型**。

这是一个警告，也是一个数学问题。"存在越狱漏洞"对任何发布了足够体量用户的前沿模型来说，几乎是必然事件。GPT-5.5有，Gemini 3.5 Pro有，Opus 4.8有，以后每一个更强的模型都会有。如果越狱漏洞可以触发出口管制，等于给政府一把可以随时拔插头的钥匙，只需要等一份漏洞报告落到商务部桌上。

## Anthropic 的三连击

这是Anthropic三个月内第三次被政府动手。

4月，代号Project Glasswing的Mythos访问计划出现未经授权访问，Anthropic被动卷入一场安全调查。5月，五角大楼宣布AI供应商名单，OpenAI、SpaceX、谷歌、微软、AWS七家入选，Anthropic缺席——而65天前，Claude还是那套最高密级网络里唯一运行的AI。6月，发布三天的旗舰模型被出口管制令直接关停。

三次不是偶然，是一个结构性信号：当一个AI公司的模型足够强大，技术领先会直接转化为政治风险。

Anthropic在这场博弈里几乎没有传统意义上的政治筹码。它没有OpenAI那种和微软、政府深度绑定的关系网，也没有SpaceX那种"美国战略资产"的身份保护膜。Anthropic的核心价值主张是"构建最安全、最有能力的AI"——偏偏这个价值主张，让它成为监管机构打示范牌时最合适的靶子：打你，显得有道理，因为你自己说安全第一。

这是Anthropic的trade-off：用"负责任AI"的旗帜拿到了顶级技术声誉，帮它融了几百亿，招到了业界最好的研究员，也在企业客户中建立了信任——但同样这面旗帜，让它在安全圈里格外显眼，比OpenAI、谷歌都更容易成为政策执行的风暴中心。赢了声誉，输了政治保护壳。

## Sonnet 5：主动降格

6月30日，Fable 5下线整整18天后，Anthropic发布了Claude Sonnet 5。

定价：$2/百万输入token，$10/百万输出token（有效期至2026年8月31日）。面向Free和Pro用户，成为Claude的默认模型。性能定位是"接近Opus 4.8但不超过"。

Axios的标题直接点出了这次发布的政治信号：**"Anthropic's Sonnet 5 offers less cybersecurity risk than Mythos, Fable"**。

Anthropic在声明里特别强调了两件事：Sonnet 5"刻意没有接受网络安全任务的专项训练"，其执行危险网络行动的能力"远低于Opus系列"。这两句话是发给商务部听的，不是发给用户听的。

从Fable 5到Sonnet 5，Anthropic完成了一次战略性降档：用一个能力明确低于最强版本的模型来维持业务运转，把旗舰级能力搁置在一个等待政策明确的灰色地带。

说得更直接：Anthropic开始学会了一件事——不要让自己的模型强到让政府坐不住。

## 这件事说明什么

AI能力已经进入传统军事和情报机构的威胁感知框架。

出口管制这个工具，最早用来管核材料，后来管高端密码算法，再后来管GPU出口，现在管到了语言模型的代码生成能力。这不是技术政策的调整，是美国政府对"什么是战略技术"这个问题的重新定义：AI不再只是生产力工具，它已经被视为可能重写力量对比的基础设施。

Anthropic、OpenAI、谷歌在内的每一家前沿AI公司，从此不得不接受一个新的现实：模型的能力上限，不完全由技术决定，也由政治容忍度决定。

透明度悖论在这里变得特别尖锐。Anthropic一直是AI安全领域最愿意公开能力测试结果、最愿意主动给政府做安全汇报的公司——而这种透明度反过来给监管机构提供了更多动手的信息。越老实公布自己的能力边界，越容易被拿来当管制的依据。

G7正在讨论一个"可信伙伴框架"，设想允许经过审查的盟国和机构在受控条件下访问高能力模型。这是一条可能的出路。但这个框架还在草案阶段，法律文本没有，实施时间表没有，谁算"可信伙伴"也没有定论。

在那之前，Anthropic只能拿Sonnet 5撑着，等一个窗口重新打开。

能力强到被政府关停，是一种特殊的成功。

## 数据来源

- Anthropic Fable 5/Mythos 5 基准数据：[Claude Fable 5 Benchmark Breakdown – Digital Applied](https://www.digitalapplied.com/blog/claude-fable-5-mythos-5-release-benchmarks-2026) / [VentureBeat 发布报道](https://venturebeat.com/technology/anthropic-brings-mythos-to-the-masses-with-claude-fable-5-its-most-powerful-generally-available-model-ever)
- 政府封禁指令：[CNBC – Anthropic disables access to Fable 5 and Mythos 5](https://www.cnbc.com/2026/06/12/anthropic-disables-access-to-fable-5-and-mythos-5-to-comply-with-government-directive.html) / [Time – Anthropic Pulls Its Most Powerful AI Models](https://time.com/article/2026/06/13/anthropic-fable-mythos-ban-US-security/) / [CNN Business](https://www.cnn.com/2026/06/13/business/anthropic-mythos-model-national-security)
- Claude Sonnet 5发布：[Axios – Sonnet 5 offers less cybersecurity risk](https://www.axios.com/2026/06/30/anthropic-sonnet-5-agents-mythos-fable)
- AI市场格局背景：[AIToolsRecap – June 28 2026 news](https://aitoolsrecap.com/Blog/ai-news-june-28-2026) / [CNBC – Microsoft and Google take on Anthropic and OpenAI in AI coding models](https://www.cnbc.com/2026/06/01/microsoft-and-google-take-on-anthropic-and-openai-in-ai-coding-models.html)
