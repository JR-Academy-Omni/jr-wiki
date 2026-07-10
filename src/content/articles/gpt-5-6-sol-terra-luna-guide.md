---
title: "GPT-5.6 全球放行：Sol / Terra / Luna 三档怎么选"
description: "GPT-5.6 于 7 月 9 日结束美政府审查全球开放。本文给出三档定价与场景映射、和 Claude Fable 5 的逐项基准对比（含 SWE-Bench Pro 争议）、Programmatic Tool Calling 与缓存断点的实际省钱算法。"
publishDate: 2026-07-10
tags:
  - gpt-5-6
  - openai
  - sol-terra-luna
  - model-selection
  - api-pricing
author: "JR Academy"
keywords: "GPT-5.6, Sol, Terra, Luna, OpenAI, API 定价, Programmatic Tool Calling, 模型选型"
---

![GPT-5.6 Sol Terra Luna 三档模型发布](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80)

2026 年 7 月 9 日上午 10 点（太平洋时间），OpenAI 把 GPT-5.6 系列——旗舰 **Sol**、均衡 **Terra**、轻量 **Luna**——同时推上 ChatGPT、Codex、ChatGPT Work 和 API，全球滚动开放 24 小时内完成。距离 6 月 26 日的"受信任合作伙伴限量预览"过去了整整两周。这两周不是 OpenAI 在憋大招，是美国政府要求先审后放。

我们的 AI 日报从 6 月 26 日预览那天就在追这条线，今天终于可以把完整的图景拼出来：价格、基准、新 API 能力，以及——说实话最有意思的——它输给 Claude 的那几项。

## 三档模型：名字花哨，分工其实很朴素

太阳、大地、月亮，命名比 GPT-4o / o3 / o4-mini 那套字母数字汤好记多了。分工也直白：

| 模型 | 输入 / 输出（每百万 token） | 定位 |
|------|---------------------------|------|
| `gpt-5.6-sol` | $5 / $30 | 最难的问题：复杂编码、安全研究 |
| `gpt-5.6-terra` | $2.50 / $15 | 大批量业务：客服、内部工具、文档分析 |
| `gpt-5.6-luna` | $1 / $6 | 高频轻活：摘要、起草、例行自动化 |

三档都是 100 万 token 上下文、128K 最大输出、知识截止 2026 年 2 月 16 日。API 端不裁挡任何账户，自助开通就能用全部三档；裸模型 ID `gpt-5.6` 默认路由到 Sol。

ChatGPT 端有分层：免费档只在 Codex / Work 里给 Terra；Plus 给 Sol（中等推理档）；Pro 和 Enterprise 才有完整的 Sol Pro 变体和 Ultra 模式。

对着 Sol 的 $5/$30 看一眼隔壁：Claude 家旗舰的定价一直更高，而 Terra 那档 $2.50/$15 明显是冲着"把企业批量任务从竞品那里撬过来"去的——Simon Willison 转述 OpenAI 的说法是 Terra 和 Luna 在部分任务上"以十六分之一的成本跑赢 Fable 5"。厂商自己说的话打个折听，但价格表是实打实的。

## 基准：赢在 agent，输在 SWE-Bench Pro

OpenAI 这次公布的基准表值得逐项看，因为它没有全赢——这反而让数据更可信。

**Sol 领先的**：Terminal-Bench 2.1 拿到 88.8%（Ultra 配置 91.9%），比 Claude Fable 5 的 83.4% 高出一截；Agents' Last Exam（55 个领域的长时程专业工作流评测）53.6 分，比 Fable 5 高 13.1 分；OSWorld 62.6%，computer use 类任务基本是 Sol 的主场。

**Claude 领先的**：SWE-Bench Pro 上 Fable 5 拿 80%，Sol 只有 64.6%，差距不小。GDPval 的 Elo 排名和 Intelligence Index 也还是 Claude 在前。

有意思的是 OpenAI 对 SWE-Bench Pro 的回应：他们发文说估计**约 30% 的题目本身是坏的**，暗示这个基准不值得较真。我没法独立验证这个说法，但一个厂商在自家发布日专门发文攻击一个自己输掉的基准，这个动作本身就说明分数戳到痛处了。

Simon Willison 上手一天后的评价比较克制："肯定非常能干（definitely very competent），但复杂编码任务上还没有超过 Fable。"这和基准表的形状是吻合的：agent 编排、终端操作是 GPT-5.6 的强项，深水区代码修复还是 Claude 的地盘。

## API 侧的真正新东西：Programmatic Tool Calling

这次发布里对开发者最实质的更新不是分数，是 Responses API 里的 **Programmatic Tool Calling**：模型不再一次一个地发 tool call JSON，而是直接生成一段 JavaScript，在一个**无网络访问的隔离 V8 运行时**里编排多个工具调用——循环、条件、并行都写在代码里。

省的是真金白银。MarkTechPost 引用的客户数据是 token 消耗降 38%–63.5%；OpenAI 自己的说法是编码基准上 Sol"用不到一半的输出 token 和不到一半的时间"跑完同样的活。如果你的 agent 每天要跑几千次"查数据 → 过滤 → 再查 → 汇总"这种链路，值得这周就去改造。

缓存也变了，这条容易被忽略但对账单影响很直接：

- 支持**显式 cache breakpoint**（此前只有自动检测），缓存至少存活 30 分钟
- 代价是从 GPT-5.6 起**缓存写入要收 1.25 倍**未缓存输入价，读取维持 90% 折扣

翻译成人话：以前缓存写入免费、命中打折，现在写入先多付 25%。长 system prompt + 高命中率的场景依然血赚，但"每次请求都换 prompt 前缀"的写法会比以前更亏。上线前拿自己的流量模式算一遍，别直接沿用旧的缓存策略。

另外两个小但实用的：推理档位加了 `max`（原来到 `xhigh` 封顶）；Ultra 模式默认**四个 agent 并行**跑分解后的子任务，用 token 换墙钟时间——只开放给 Pro / Enterprise 和 Codex 付费档，本质是个"花钱买快"的开关。

## 为什么被政府压了两周

6 月 26 日预览时只给了大约 20 家合作伙伴，官方解释是美国政府要求对更广泛发布做审查。VentureBeat 当时的标题直接点了原因：per US Gov。

审什么？公开信息指向网络安全能力：GPT-5.6 在 ExploitBench 上拿到 73.5%，上一代是 47.9%——漏洞利用能力接近翻倍，这种跳变触发分阶段发布协议并不意外。上线后的产品里也留着痕迹：生成过程中会出现几秒的停顿，分类器在中途审查输出。用 API 做流式输出的注意下，这个停顿会影响你的超时和心跳逻辑。

顺带一提，GA 当天没有独立第三方审计报告发布。政府审完了，但审了什么、结论是什么，外界只有"放行"这一个事实。

## 怎么选：一个偷懒但够用的决策表

写给正在用 API 干活的人：

- **在跑 agent / 终端自动化 / computer use** → 换 Sol，这是它基准上最能打的领域，配合 Programmatic Tool Calling 把工具链路改成代码编排
- **大批量分类、客服、文档处理** → Terra，$2.50/$15 的价位配 1M 上下文，这一档目前没有明显更便宜的同级对手
- **摘要、草稿、轻量自动化** → Luna，$1/$6 和上一代小模型持平
- **深水区代码修复、大型 codebase 重构** → 先别急着全换，SWE-Bench Pro 的 15 个点差距和 Simon Willison 的上手感受都指向同一个结论：这类活 Claude 还是更稳
- **已有 GPT-5.5 缓存策略的** → 重算缓存账，写入 1.25 倍不是小数

我们自己的判断：这次发布最被低估的是 Terra。旗舰对比抢头条，但真正走量的是 $2.50 档——企业批量任务的性价比之战才刚开始，DeepSeek V4 官版下周就来，还带着峰时定价。这一段我们会继续在每日 AI 日报里跟。

---

**Sources**：[Simon Willison: The new GPT-5.6 family](https://simonwillison.net/2026/Jul/9/gpt-5-6/) · [MarkTechPost: GPT-5.6 Programmatic Tool Calling](https://www.marktechpost.com/2026/07/09/openai-releases-gpt-5-6-a-three-tier-model-family-with-programmatic-tool-calling/) · [DigitalApplied: GPT-5.6 GA](https://www.digitalapplied.com/blog/gpt-5-6-sol-terra-luna-public-ga) · [VentureBeat: limited preview per US Gov](https://venturebeat.com/technology/openai-unveils-gpt-5-6-sol-terra-and-luna-models-but-only-accessible-to-limited-preview-partners-for-now-per-us-gov)
