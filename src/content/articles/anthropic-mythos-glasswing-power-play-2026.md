---
title: "Anthropic 把网络武器锁进了保险柜，然后保险柜被人撬开了"
description: "2026年4月，Anthropic把网络安全模型Mythos锁给11家精选机构，命名为Project Glasswing。不到一个月，一个未授权团体拿到了访问权。这不只是一次安全事故，而是AI访问控制权力结构的第一次真实测试。"
publishDate: 2026-05-10
tags:
  - ai-news
  - ai-analysis
  - anthropic
  - cybersecurity
author: "JR Academy AI 编辑部"
keywords: "Anthropic Mythos, Project Glasswing, AI网络安全, 零日漏洞, AI访问控制, 网络安全权力"
---

2026年4月21日，彭博社发出一则报道：一个身份不明的团体，已经悄悄访问了Anthropic的Mythos模型——那个被Anthropic形容为"在网络安全领域远超所有竞争对手"、因此只敢发给11家精选机构的模型。

Anthropic表示正在调查。

距Mythos向合作机构开放，不到一个月。

## 一把被锁起来的工具

故事从2026年4月初说起。Anthropic宣布了一件在硅谷相当罕见的事：他们造出了一个太危险、不能公开发布的模型。

这个模型叫Mythos Preview，专注于代码安全漏洞的自动化发现。Anthropic的声明措辞非常具体：Mythos Preview已经在**每一个主流操作系统和每一个主流浏览器**里发现了漏洞——数量达到数以千计，类型是高危（high-severity），其中包括零日漏洞（zero-day）。

什么是零日漏洞？就是那种软件厂商自己都不知道存在的漏洞——在漏洞被发现后、补丁被推送前的窗口期，攻击者完全可以进来，而防御方什么都不知道。窗口期越长，损失越大。

换言之：你现在用的Windows、macOS、Chrome或Safari，里面有Mythos找到、但厂商还没修的洞。

Anthropic CEO达里奥·阿莫代伊（Dario Amodei）对此直接警告：这种能力将导致"勒索软件攻击学校、医院、乃至银行的金融损失出现大幅增加"。

面对这样的工具，可能的处理方式有三种：一，秘而不宣，悄悄给合作伙伴修；二，公开发布，让整个安全社区用来防御；三，锁起来，只发给自己选的人。Anthropic选了第三种。

他们把Mythos Preview封进了一个叫Project Glasswing的访问计划，向全球11家机构提供受限访问。

## Glasswing的名单，耐人寻味

Project Glasswing的合作伙伴名单被Anthropic直接挂在官网：

Amazon Web Services、Apple、Broadcom、Cisco、CrowdStrike、Google、JPMorgan Chase、Linux基金会、微软、英伟达（NVIDIA）、Palo Alto Networks。

加上Anthropic自己，共12家机构，构成了这把全球最强网络安全工具的钥匙持有者俱乐部。

乍一看是逻辑：这是美国最重要的科技和金融基础设施运营方，让他们先拿到漏洞信息、先打补丁，天经地义。再看一遍就会发现，这份名单和Anthropic的商业关系图谱几乎完全重合：

亚马逊是Anthropic的最大云计算供应商，也是重要投资方；谷歌在五年内承诺向Anthropic支付约2000亿美元的算力协议（TPU和云服务）；苹果是Claude API的主要企业客户；英伟达供应GPU；微软虽然是OpenAI的主要靠山，但拉进Glasswing有政治意义——让"负责任AI"阵营看起来更广；JPMorgan Chase是金融行业的合规门面。

说白了：谁能用Mythos，跟谁和Anthropic关系好，高度相关。

这不是指控。商业公司用资源换盟友，天经地义。但它揭示了一件重要的事：Glasswing这类"安全限制"不是纯粹的技术判断，同时也是商业判断。Anthropic单方面拥有"谁有资格访问最强网络安全工具"的决策权，而这个权力，目前没有任何外部审查机制。

这是一种全新形态的护城河（moat）——不是靠算法更好，而是靠你来说了算。

Anthropic为此还承诺向Glasswing合作方提供最高1亿美元的使用额度，以及400万美元捐款给开源安全组织。钱花出去了，权力也拿到了。

## 被锁住的武器，自己被人撬开了

然后到了4月21日。

彭博社和TechCrunch同时报道：一个未经授权的团体已经获取了Mythos的访问权限。CBS新闻随后确认：Anthropic正在调查"可能的泄露"。截至报道时，事件细节仍然模糊——是内部泄露？某家合作机构的供应链问题？API层的漏洞？没有答案。

这里有个让人不舒服的结构性反差：

Anthropic花了大量精力解释为什么Mythos太危险、不能公开。然后在发布后不到一个月，它就到了"不该拿到它的人"手上。

受控访问（controlled access）在这个年代比人们想象的更难实现。一个模型的权限，一旦给了11家机构，就不再只在11家机构手里。每一家机构都有自己的供应商、承包商、内部研究合作方。链条一长，每个节点都是潜在的泄露口。

这个悖论不是Anthropic特有的——2017年，美国国家安全局（NSA）开发的网络武器EternalBlue被一个叫影子经纪人（Shadow Brokers）的神秘组织泄露，随后被改造成勒索软件WannaCry，感染了全球超过20万台计算机。NSA的安全体系显然比11家商业公司的联合保密更严密，结果还是没守住。

这不是历史的重演，但结构是一样的：精心控制的进攻性工具，总有从"受控渠道"溢出的那一天。

## 专家的冷水：你们慌的不是威胁，是新面孔

2026年5月8日，CNBC发表了一篇让整场"Mythos恐慌"降温的报道。

多位网络安全专家表示——Mythos发现的那些漏洞，用现有的公开模型，配合"聪明的编排方式（clever orchestration）"，同样可以找到。

这句话的意思是：Mythos没有创造出一种全新的威胁。它只是把找漏洞这件事做得更快、更系统。漏洞一直就在那里，只是以前没有一个工具能批量、全面、自动地把它们找出来。

Dario Amodei说Mythos会造成"大量新增的安全突破口"——但真相是：突破口一直存在，Mythos让它们变得更容易被批量发现和利用。

这里有一个时间轴上的核心矛盾：AI发现漏洞的速度，开始超过人类修复漏洞的速度。Chrome的安全团队大约每月推送一次安全更新；但如果Mythos这类工具能持续、系统性地找出大量零日漏洞，更新节奏就永远跟不上发现节奏。"窗口期"被系统性地拉长——那是攻击者的黄金时间。

Anthropic的逻辑是：让Glasswing成员先拿到漏洞情报，先打补丁，再公开。让好人跑在坏人前面。

但这个逻辑有一个无法回避的前提：好人的范围是Anthropic定义的。

Rest of World的报道指出，这套访问不对称性形成了一种结构性的安全鸿沟：在Glasswing名单里的机构，比名单之外的更早修漏洞；被保护的时间窗口更长。不在名单里的——澳大利亚的银行、东南亚的电信运营商、非盟国的关键基础设施——暴露时间更长，因为那些漏洞在他们处还没被修。

OpenAI的应对印证了这个竞争信号：Sam Altman很快宣布推出GPT-5.5-Cyber，同样只发给经审查的网络安全团队。

两家公司都在用"安全限制"建壕沟，都在向同一批机构销售同一种"被保护"的感觉。当防御和进攻都来自同一家公司，当谁能用、谁不能用由同一家公司说了算，这个生意的边界就不是产品功能了——是权力。

## 当访问控制成为地缘政治筹码

Mythos事件的底层逻辑，不是"AI太危险了"。

我的判断是：它揭示了一个更深的结构——**AI安全限制，正在成为一种事实上的地缘政治工具，而这个工具目前握在私营公司手里**。

历史上有武器出口管制，有《瓦森纳协定》，有《核不扩散条约》——这些都是国家主权层面的控制机制，经过了几十年的多边谈判，即便执行不完美，至少有国际法的外壳和多边监督的程序。

但Glasswing这套访问管制，第一版是Anthropic写的、Anthropic执行的、Anthropic选合作方的。没有UN决议，没有多边条约，没有民主选举的监督机构。

这不是Anthropic的原罪。这是技术速度和治理速度的结构性错位——当一项技术的突破速度超过了任何国际机构的反应速度，制度真空期就由写出这个技术的公司来临时填充。

而Mythos未授权访问事件已经说明：连这种临时填充，也很脆弱。

锁住谁、放进谁，这件事本身已经很值钱了。

---

**Anthropic锁住了Mythos，但Mythos早就出了那扇门。**

## 数据来源

- [Anthropic's Mythos set off a cybersecurity 'hysteria.' Experts say the threat was already here — CNBC, 2026-05-08](https://www.cnbc.com/2026/05/08/anthropic-mythos-ai-cybersecurity-banks.html)
- [Unauthorized group has gained access to Anthropic's exclusive cyber tool Mythos, report claims — TechCrunch, 2026-04-21](https://techcrunch.com/2026/04/21/unauthorized-group-has-gained-access-to-anthropics-exclusive-cyber-tool-mythos-report-claims/)
- [Anthropic's Mythos AI Model Is Being Accessed by Unauthorized Users — Bloomberg, 2026-04-21](https://www.bloomberg.com/news/articles/2026-04-21/anthropic-s-mythos-model-is-being-accessed-by-unauthorized-users)
- [Project Glasswing: Securing critical software for the AI era — Anthropic Official](https://www.anthropic.com/glasswing)
- [Anthropic's Claude Mythos exposed a terrifying new cybersecurity reality — Tech Startups, 2026-05-08](https://techstartups.com/2026/05/08/anthropics-claude-mythos-exposed-a-terrifying-new-cybersecurity-reality-ai-can-now-find-vulnerabilities-faster-than-humans-can-fix-them/)
- [Anthropic investigating possible breach of its Mythos AI model — CBS News](https://www.cbsnews.com/news/anthropic-investigates-mythos-ai-breach/)
- [Anthropic's Mythos and the global cybersecurity gap — Rest of World](https://restofworld.org/2026/ai-cybersecurity-anthropic-mythos/)
- [Anthropic's Claude Mythos Preview Changes Cyber Calculus — Foreign Policy, 2026-04-20](https://foreignpolicy.com/2026/04/20/claude-mythos-preview-anthropic-project-glasswing-cybersecurity-ai-hacking-danger/)
