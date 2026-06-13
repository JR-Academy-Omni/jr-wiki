---
title: "苹果的 AI 重组：用 $10 亿请来 Google，把 OpenAI 变成下拉菜单"
description: "2026 年 6 月 8 日 WWDC，苹果宣布 Gemini 接管 Siri 核心推理，$10 亿美元年费、1.2 万亿参数定制模型。iOS 27 Extensions 同步开放，ChatGPT、Claude、Grok 降为用户自选项。OpenAI 从独家盟友变成候选之一，据报正在考虑起诉苹果违约。"
publishDate: 2026-06-13
tags:
  - ai-news
  - ai-analysis
  - apple
  - openai
  - google
author: "JR Academy AI 编辑部"
keywords: "Apple WWDC 2026, Siri AI Gemini, iOS 27 Extensions, OpenAI苹果纠纷, Claude iPhone, AI分发平台"
---

2026 年 6 月 8 日上午 10 点，Tim Cook 走上 WWDC 舞台，宣布了一件让人停下来想的事：Siri，苹果二十年的门面产品，现在跑在 Google 的模型上。

合同价格：每年 10 亿美元。

模型规模：1.2 万亿参数，是苹果当时云端自研模型的 8 倍。

同一天，iOS 27 的 Extensions 框架正式亮相——用户可以在设置里把 Claude、Grok、ChatGPT、Gemini 设为默认 AI 助手，覆盖 Siri、Writing Tools、Image Playground 全部入口。

OpenAI 两年前跟苹果签了一份被双方描述为"类比 Google Safari 搜索合作"的协议。那份 Safari 合同，Google 每年给苹果超 200 亿美元。

但现在，OpenAI 坐进了苹果 AI 下拉菜单，和竞争对手并排陈列。据 9to5Mac 等多家媒体 5 月 14 日报道，OpenAI 正在考虑向苹果发送违约通知。

---

## 一、OpenAI 先说了不

这个故事的起点，比 6 月 8 日早了将近九个月。

2025 年秋天，苹果找到 OpenAI 谈一件具体的事：能不能做下一代 Siri 的底层推理引擎——不是 ChatGPT 对话插件，而是整个 Siri 的大脑。这和 iOS 18 已有的那种"ChatGPT 嵌入"完全不同：苹果要的是把模型权重交出来，放进苹果的基础设施里跑，由苹果控制推理链路。

OpenAI 说不。

原因是战略转向：OpenAI 内部已经在押注自研硬件，不想变成另一家科技巨头的供应商。Sam Altman 的逻辑大概是这样的——你做 iPhone 里的 Siri，你就是苹果的零件；你做自己的设备，你才是苹果的竞争者。

这个判断对不对另说。但结果是苹果转头找 Google。

---

## 二、Google 拿到了什么

2026 年 1 月 12 日，CNBC 率先报道合同细节：苹果将向 Google 支付约每年 10 亿美元，授权使用一个专门为苹果定制的 Gemini 模型。

但这里有一个容易被忽视的苹果条款：**隐私架构**是苹果谈判的硬骨头。

整套系统分三层：简单任务在设备端跑苹果自研模型，中等复杂度走苹果自己的 Private Cloud Compute，只有最重的推理才路由到 Google Cloud。合同明确规定：查询无状态处理，不留存，Google 不得用苹果用户数据训练任何未来模型。

说白了：Google 进了 iPhone，但进的是一个密封的房间。苹果用 10 亿美元买来了 Google 最强的推理能力，但 Google 拿不走任何用户数据。

这是苹果一贯的打法。2022 年 App Tracking Transparency 对广告商做的事，2026 年它对 AI 供应商做了同样的事：利用商业关系，死守数据主权。你可以在我的地盘上赚钱，但用户是我的，数据是我的。

这个条款的代价，Google 完全明白。但 10 亿美元换来 10 亿台 iPhone 的 Siri 入口，这笔账在商业上仍然说得通。

---

## 三、iOS 27 Extensions：App Store 时刻重演

WWDC 2026 的第二个变量，关注度比 Gemini 合同低，但结构意义可能更深。

iOS 27 推出了 Extensions 框架，允许第三方 AI 接入苹果核心系统功能。安装对应 App 之后，用户在设置的"Apple Intelligence & Siri"里拨动一个开关，就能把整个 AI 层换成 Claude、Grok、ChatGPT、或 Gemini。苹果第一批测试合作伙伴是 Claude 和 Gemini，ChatGPT 延续 iOS 18 的已有集成。

这在结构上和 2008 年的 App Store 非常相似。

iPhone 最初没有第三方应用，乔布斯对 App Store 是抗拒的。然后 App Store 开了，iPhone 变成了一个平台，苹果变成了收租方。今天，App Store 每年为苹果带来约 800 亿美元的服务业务营收。

Extensions 的逻辑相同：苹果不押注某个 AI 赢家，它成为 AI 接触 10 亿设备用户的唯一合法通道，按照 App Store 惯例从订阅收入里收取分成。Claude 要做 iOS 上的默认 AI 助手，就得过苹果这一关。

对 Anthropic 来说，这是一次定价合理的分发机会。Claude Code 在 B2B 企业市场站稳了脚跟，但 C 端用户量远不及 ChatGPT。iOS 27 的 Extensions 如果跑通，理论上 iPhone 的 Siri 按钮可以直接变成 Claude 的入口——1 亿 iPhone 用户，苹果帮你触达。

对 OpenAI 来说，这个结果非常讽刺。2024 年那份合同本该让 ChatGPT 深度嵌入 Siri；实际执行下来，ChatGPT 变成了菜单里的一个候选项，旁边还坐着 Claude 和 Grok。

---

## 四、OpenAI 的违约逻辑

把时间拨回 2024 年。

苹果当时向 OpenAI 描述这个机会，类比的是谷歌与苹果之间的 Safari 搜索合作——Google 为了保住 Safari 默认搜索引擎位置，每年给苹果超 200 亿美元。OpenAI 被暗示，ChatGPT 在 Siri 里的位置，可能价值同等量级。

OpenAI 的预期是：ChatGPT 深度内嵌、苹果主动推广、用户订阅量爆发。

实际的 iOS 18 体验是：ChatGPT 功能藏在几层菜单之后，需要用户明确说"用 ChatGPT"才触发，苹果几乎没做任何营销宣传。一位 OpenAI 内部人士对媒体说，苹果让他们"先信任，先跳进去，之后会好的"——结果没有好。

2026 年 5 月，OpenAI 开始探索法律选项，包括向苹果发送正式违约通知。这不一定走向真正的诉讼——违约通知更多是一个谈判筹码，逼苹果重新协商或赔偿。但无论结果如何，一件事已经很清楚：OpenAI 在苹果这盘棋里没拿到它预期的位置。

这里有一个 trade-off 值得想清楚：**OpenAI 现在说苹果违约，但它当时拒绝了"给 Siri 做引擎"这个机会**。如果 OpenAI 接了那个合同，今天 Siri 的核心就是 ChatGPT，Gemini 找不到入场券。OpenAI 为了保住硬件战略的完整性，主动放弃了最深的 iOS 入口，然后抱怨浅层集成不够深——这个逻辑有点说不通。

---

## 五、苹果的真实战略

说清楚苹果在这件事里的真实位置。

苹果不是一家 AI 公司，它是一家设备公司。设备公司的核心资产不是模型权重，是用户关系。苹果有超过 10 亿台活跃设备，覆盖消费能力最强的那批用户。这是任何 AI 实验室都没法自建的分发网络。

所以苹果的策略从来不是"赢得 AI 军备竞赛"，而是"让 AI 军备竞赛的每个参赛者都必须经过我"。

Gemini 的 10 亿美元年费是公允的市场价格：Google 付了 10 亿，拿到了 10 亿台设备的 Siri 调用量，还带着苹果的隐私护盾——对 B2B 和 C 端用户来说，"苹果隐私保障的 Gemini"比"直接用 Google Gemini"更有说服力。

Extensions 框架的开放是另一层：它让苹果从"AI 合作对象"升格成"AI 分发中枢"。Claude、ChatGPT、Grok 现在互相竞争 iOS 27 上的位置，竞争的代价是向苹果交过路费。

这不是苹果赢了 AI。这是苹果把 AI 收编进了它的生态。

---

## 六、分发才是 AI 最贵的资产

最后说说这件事背后的那个规律。

AI 模型的能力差距正在收窄。Claude、GPT-5.5、Gemini 3.x 在 2026 年的评测分数差距极小，普通用户已经很难分辨。当能力趋于同质，决定胜负的变量只剩两个：价格，和分发。

苹果手里拿的是分发。

Android 用户可以用 Google Gemini，Web 用户可以用 ChatGPT.com，但每一个 iPhone 用户的 AI 入口，默认是苹果决定的。"默认"这两个字的价值，有 Google 为 Safari 每年付 200 亿美元作为参考。

OpenAI 两年前以为自己拿到了这个位置，没拿到。Google 今年为这个位置付了 10 亿美元年费。Anthropic 通过 Extensions 拿到了竞争机会，但要从苹果的菜单里脱颖而出，还需要用户主动选择。

AI 这个赛道，真正稀缺的从来不是参数量，是分发。

苹果只花了一年，就把这件事搞清楚了。

---

## 数据来源

- [Apple picks Google's Gemini to run AI-powered Siri (CNBC, January 12, 2026)](https://www.cnbc.com/2026/01/12/apple-google-ai-siri-gemini.html)
- [WWDC 2026: Siri AI Runs on Google's $1B Gemini Deal (Tech Insider)](https://tech-insider.org/wwdc-2026-siri-ai-gemini-deal/)
- [Apple iOS 27 Extensions: Claude, ChatGPT, and Gemini Can Replace Siri (AI Weekly)](https://aiweekly.co/node/2611)
- [OpenAI preparing legal action against Apple over Siri partnership (9to5Mac, May 14, 2026)](https://9to5mac.com/2026/05/14/openai-preparing-legal-action-against-apple-over-siri-partnership-report/)
- [Apple will pay billions for Gemini after OpenAI declined (9to5Mac, January 2026)](https://9to5mac.com/2026/01/15/apple-will-pay-billions-for-gemini-openai-decided-against-siri-deal-ft/)
- [Apple rebuilds Siri on Google Gemini and Nvidia Blackwell GPUs (MLQ.ai)](https://mlq.ai/news/apple-rebuilds-siri-on-google-gemini-models-and-nvidia-blackwell-gpus-in-landmark-wwdc-partnership/)
- [OpenAI and Apple announce partnership (OpenAI.com, 2024)](https://openai.com/index/openai-and-apple-announce-partnership/)
- [Apple's OpenAI Deal Hits Legal Turbulence (TechRepublic)](https://www.techrepublic.com/article/news-apple-openai-ai-partnership-strain/)
