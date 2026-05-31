---
title: "Anthropic 的两张脸：Opus 4.8 给大众，Mythos 只留给苹果和谷歌"
description: "2026年5月28日，Anthropic发布Opus 4.8（Fast Mode降价3倍），同一周旗下另一个不对外开放的AI Mythos已找到23,019个漏洞——包括能伪造银行证书的CVE-2026-5194。这是AI行业第一次主动维持两级能力分层。"
publishDate: 2026-05-31
tags:
  - ai-news
  - ai-analysis
  - anthropic
  - claude
  - ai-security
author: "JR Academy AI 编辑部"
keywords: "Claude Opus 4.8, Anthropic Mythos, Project Glasswing, wolfSSL漏洞, AI安全, Dynamic Workflows, AI能力分层"
---

2026 年 5 月 26 日，Anthropic 的研究员 Nicholas Carlini 用公司内部 AI 模型在 wolfSSL 里找到了一个漏洞，并演示了如何用这个漏洞伪造银行网站的 HTTPS 证书。wolfSSL 是一个开源 TLS 密码库，运行在约 50 亿台 IoT 设备、汽车车机和工业控制系统里。这个漏洞被编号为 CVE-2026-5194，CVSS 评分 9.1。

两天后，Anthropic 向所有人发布了 Claude Opus 4.8。

这两件事放在一起，才能看清楚 Anthropic 现在在干什么。

---

## Opus 4.8：一次精准的价格动作

先说 Opus 4.8 本身。它是一次进步，但不算震动性的跃升。

SWE-bench Pro 从 64.3 升到 69.2，SWE-bench Verified 从 87.6% 升到 88.6%，GPQA Diamond 93.6%，多项基准领先 GPT-5.5。定价没动：标准模式 $5 每百万输入 token、$25 每百万输出 token，和 Opus 4.7 完全一样。

真正有意思的是 Fast Mode。Opus 4.7 的 Fast Mode 是 $30/$150，Opus 4.8 降到了 $10/$50——便宜了三倍，速度是标准模式的 2.5 倍。

翻译成人话：Anthropic 把"AI 干活"的成本往下推了一个量级。

此前，用 Opus Fast Mode 跑一个中等规模的 agentic 任务，每次可能消耗十几万 output token，折算下来 $20 上下。一个团队每天跑几百个任务，月成本轻松破 $5 万。现在同样的任务，月成本跌到 $1.5-2 万。这个区间，不少中型技术团队能咬牙跑进 ROI。

这次还带来了 Dynamic Workflows：Claude Code 可以把一个大任务拆成执行计划，派出数百个并行子 agent 同时工作，各自执行、验证，再汇报给主进程。按 Anthropic 的说法，理论上能从启动到 merge 完成横跨数十万行代码的迁移工作。目前是 Enterprise、Team、Max 用户的 research preview。

Anthropic 在 Opus 4.7 发布仅 41 天后推出了 4.8。

这个节奏值得注意。2024 年的时候，Claude 系列大版本之间通常相隔半年以上。现在 41 天就来一个新版本，而且功能完整、定价精准——这不像是迭代驱动的，更像是有人在看对手的发布日历。

---

## Mythos：那个你用不到的 AI

再说 Mythos。

Mythos 是 Anthropic 从今年 4 月开始分发给约 50 家合作伙伴的内部模型。合作方名单包括：AWS、Apple、Broadcom、Cisco、CrowdStrike、Google、JPMorgan Chase、Linux Foundation、Microsoft、NVIDIA、Palo Alto Networks。Project Glasswing 是这个计划的名字——表面上是一个"保护关键软件基础设施"的防御性项目。

5 月 26 日，Anthropic 发布了 Project Glasswing 的第一份进度报告。数字相当惊人：

扫描了超过 1,000 个开源项目，发现 23,019 个安全问题，其中 6,202 个被标记为高危或严重级别。Anthropic 联合 6 家独立安全公司核验了其中 1,752 个，真实阳性率超过 90%。

那么 wolfSSL 和 CVE-2026-5194 是怎么回事？

CVSS 9.1 意味着什么，解释一下：CVSS 是通用漏洞评分系统，满分 10。9.1 对应的是：远程可利用（不需要物理接触设备）、攻击复杂度低、不需要任何权限或认证、一旦成功就能获取高权限。换个说法，任何人只要拿到 exploit 代码，对着任何一台运行旧版 wolfSSL 的设备，就能发起攻击。50 亿台设备里，包括大量未能及时更新固件的汽车、工控机和工厂设备。

Mythos 不只是发现了这个漏洞——它构建了一个有效的 exploit，演示了如何用假证书通过 TLS 握手，做出一个浏览器无法识别的假银行网站。这个漏洞已在 wolfSSL 5.9.1 版本里被修复。

说白了，Mythos 干的不是"找 bug"这件事，而是"找 bug 并写出武器化代码"这件事。

---

## 合作伙伴名单背后的逻辑

Anthropic 对外的解释是：Mythos 能力太强，需要开发出更完善的护栏才能公开。这个说法不是假的。一个能自主构建 CVSS 9.1 级 exploit 的 AI，如果被恶意行为者拿到，后果是真实的。

但合作伙伴名单说明的不只是安全考量。AWS、Apple、Google、Microsoft——这四家同时也是全球最大的 AI 基础设施采购方，以及 Anthropic 在企业合同上最需要搞定的对象。他们不是因为安全能力最强而进入这个名单的；他们进入这个名单，是因为 Anthropic 最需要这些关系。

我的判断是：Project Glasswing 的两个逻辑同时成立，而且互相强化。第一，让能力最强的防御方优先拿到最强的工具，本身是有价值的；第二，借助这个项目让全球最大的科技买家先看到 Anthropic 最强的技术，是一步精准的 B2B 棋。安全理由是真实的，商业理由也是真实的。把这两件事混在一起，Anthropic 做了一个自洽的策略。

代价在于：护栏什么时候"够强"，判断权在 Anthropic 自己手里。没有外部机构在核验这个标准。Anthropic 说"尚未准备好"，公众只能接受这个说法。

---

## 这是 AI 行业的一个新结构

2026 年 5 月这一周，Anthropic 完成了一件之前没有公司明确做过的事：维持两种不同安全级别的 AI 产品，一个公开销售，另一个只在封闭合作伙伴圈里运转，并用一个实际的漏洞案例解释了为什么这样分层是必要的。

这个结构不是 Anthropic 一家公司的选择，而是 AI 能力扩展到某个门槛后的必然结果。当一个模型强大到可以自主构建高危漏洞的 exploit，它和之前任何一个"AI 工具"都不在同一个法律、伦理和商业框架里。你不能把它当 API 卖给任何有信用卡的人——不是因为你不想，而是因为没有任何成熟的产品框架能覆盖这种风险。

OpenAI 和 Google 面对的是同样的问题，只是还没有把它说出口。Anthropic 是第一个把这个分层公开化、有文件、有案例的公司。

护栏何时能好，Anthropic 自己也不知道。

---

## 数据来源

- Anthropic Project Glasswing 进度报告（经 Help Net Security 及多家媒体报道）：[https://www.helpnetsecurity.com/2026/05/26/anthropic-project-glasswing-update/](https://www.helpnetsecurity.com/2026/05/26/anthropic-project-glasswing-update/)
- wolfSSL CVE-2026-5194 详情：[https://purple-ops.io/blog/wolfssl-vulnerability-cve-2026-critical](https://purple-ops.io/blog/wolfssl-vulnerability-cve-2026-critical)
- Claude Opus 4.8 发布公告（The Decoder）：[https://the-decoder.com/anthropic-ships-claude-opus-4-8-as-a-modest-but-tangible-improvement-that-tops-gpt-5-5-in-most-benchmarks/](https://the-decoder.com/anthropic-ships-claude-opus-4-8-as-a-modest-but-tangible-improvement-that-tops-gpt-5-5-in-most-benchmarks/)
- Opus 4.8 定价与基准分（TechCrunch）：[https://techcrunch.com/2026/05/28/anthropic-releases-opus-4-8-with-new-dynamic-workflow-tool/](https://techcrunch.com/2026/05/28/anthropic-releases-opus-4-8-with-new-dynamic-workflow-tool/)
- Opus 4.8 基准详情（VentureBeat）：[https://venturebeat.com/technology/anthropics-claude-opus-4-8-is-here-with-3x-cheaper-fast-mode-and-near-mythos-level-alignment](https://venturebeat.com/technology/anthropics-claude-opus-4-8-is-here-with-3x-cheaper-fast-mode-and-near-mythos-level-alignment)
- Project Glasswing 合作伙伴及 Mythos 能力（Engadget）：[https://www.engadget.com/2180028/anthropic-claude-mythos-preview-project-glasswing-update/](https://www.engadget.com/2180028/anthropic-claude-mythos-preview-project-glasswing-update/)
- VulnCheck CVE 追踪：[https://www.vulncheck.com/blog/anthropic-glasswing-cves](https://www.vulncheck.com/blog/anthropic-glasswing-cves)
