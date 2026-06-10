---
title: "Claude Fable 5 发布：Anthropic 新顶配模型怎么用、和 Opus 4.8 怎么选"
description: "2026 年 6 月 9 日 Anthropic 发布 Claude Fable 5，Opus 之上的新一层旗舰。这篇讲清它的定价为什么翻倍到 $10/$50、1M 上下文、API 有哪三处 breaking change（thinking disabled 不支持 / 拒答 + fallback 机制）、Claude Code 怎么切、以及什么时候该用它而不是 Opus 4.8。"
publishDate: 2026-06-10
tags:
  - claude-fable-5
  - anthropic
  - claude-code
  - ai-coding
  - llm
author: "JR Academy"
keywords: "Claude Fable 5, claude-fable-5, Claude Fable 5 价格, Claude Fable 5 教程, Anthropic Fable 5, Claude Mythos 5, Fable 5 vs Opus 4.8, Claude Fable 5 API"
---

![Claude Fable 5 发布 Anthropic 新顶配模型](https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80)

## Claude Fable 5 是什么

Claude Fable 5（API 模型 ID `claude-fable-5`）是 Anthropic 在 2026 年 6 月 9 日上线的最新模型。官方原话是 "Anthropic's most capable widely released model, for the most demanding reasoning and long-horizon agentic work"——注意这里的定位：它不是 Opus 的小版本升级，而是**架在 Opus 之上的新一层**。模型家族现在是 Fable（最强公开）> Opus（旗舰）> Sonnet（主力）> Haiku（快），不是过去那种 Opus 当顶的结构。

硬指标（全部来自官方 [models overview](https://platform.claude.com/docs/en/about-claude/models/overview)）：

| 项目 | Claude Fable 5 | Claude Opus 4.8（对比） |
|------|----------------|------------------------|
| API 模型 ID | `claude-fable-5` | `claude-opus-4-8` |
| 上下文窗口 | 1M tokens | 1M tokens |
| 单次最大输出 | 128k tokens | 128k tokens |
| 输入价格 | **$10 / MTok** | $5 / MTok |
| 输出价格 | **$50 / MTok** | $25 / MTok |
| Extended thinking | ❌ 不支持 | ❌ 不支持 |
| Adaptive thinking | ✅ 永远开启 | ✅ |

上架渠道：Claude API、Claude Platform on AWS、Amazon Bedrock（`anthropic.claude-fable-5`）、Google Vertex AI（`claude-fable-5`）、Microsoft Foundry，6 月 9 日同步 GA。

## 跑分对比:Fable 5 到底比 Opus 强多少

下面是 Anthropic 官方发布的 benchmark。高亮列是 **Mythos 5 / Fable 5 合并列**,取两者较高值(二者差距在 1–3 个百分点内)：

| 维度（benchmark） | Mythos 5 / Fable 5 | Opus 4.8 | GPT-5.5 | Gemini 3.1 Pro |
|------|------|------|------|------|
| Agentic 编码 · SWE-Bench Pro | **80.3%** | 69.2% | 58.6% | 54.2% |
| 高难编码 · FrontierCode (Diamond, xhigh) | **29.3%** | 13.4% | 5.7% | — |
| 知识工作 · GDPval-AA | **1932** | 1890 | 1769 | 1314 |
| 知识工作（视觉）· GDP.pdf（no tools） | **29.8%** | 22.5% | 24.9% | 16.7% |
| 空间推理 · Blueprint-Bench 2 | **38.6%** | 14.5% | 36.2% | 26.5% |
| 工具调用 · AutomationBench | **17.4%** | 15.5% | 12.9% | 9.6% |
| 电脑操作 · OSWorld-Verified | 85.0% | 83.4% | 78.7% | 76.2% |
| 法律 · Legal Agent Benchmark | **13.3%** | 10.4% | 2.1% | 0.0% |
| 跨学科推理 · Humanity's Last Exam（no tools） | 59.0%* | 49.8% | 41.4% | 44.4% |
| 跨学科推理 · Humanity's Last Exam（with tools） | 64.5%* | 57.9% | 52.2% | 51.4% |
| 生物 · BioMysteryBench（hard） | 46.1%* | 40.0% | — | — |
| 生物 · BioMysteryBench（human solved） | 83.9%* | 80.4% | — | — |
| Agentic 编码 · Terminal-Bench 2.1 | 88.0%* | 82.7% | 83.4%（Codex CLI） | 70.7%（Gemini CLI） |
| 网络安全 · ExploitBench（Cap%） | 78.0%* | 40.0% | 34.0% | — |
| 健康 · HealthBench Professional | 66.0%* | 56.9% | 51.8% | — |

> **怎么读这张表**：带 `*` 的指标，Mythos 5 和 Fable 5 差距较大——因为对网络安全 / 生物类问题有 blocking 安全护栏，这些项 **Fable 5 经 fallback 后实际更接近 Opus 4.8 那一列**，不要当成 Fable 5 的成绩。没有 `*` 的才是 Fable 5 实打实的水平。详见官方 system card。

实际看点（以下都取无星号项，代表 Fable 5 本体）：

- **编程是最干净的赢面**：SWE-Bench Pro 拿 80.3%，Opus 4.8 是 69.2%，把 GPT-5.5（58.6%）和 Gemini 3.1 Pro（54.2%）甩开一截。
- **越难的编码题差距越大**：FrontierCode（Diamond）Fable 5 拿 29.3%，Opus 4.8 只有 13.4%，两倍多。
- **空间推理**：Blueprint-Bench 2 拿 38.6%，Opus 4.8 才 14.5%。
- 知识工作、工具调用、电脑操作也都比 Opus 4.8 高一截，但幅度没编码那么夸张。

一句话：Fable 5 的强主要强在**编码和长链路推理**，正好对得上它"长时程 agentic 任务"的定位。其余维度对 Opus 4.8 是稳定小胜，不是代差。

## 价格是这次最该先想清楚的事

Fable 5 的定价是 **$10 输入 / $50 输出**，正好是 Opus 4.8（$5/$25）的**两倍**。这意味着它不是"默认升级上去"的模型，而是"挑硬骨头用"的模型。

还有一个容易被忽略的成本点。官方明确写了：

> Claude Fable 5 和 Mythos 5 用的是 Opus 4.7 引入的新 tokenizer，相比 4.7 之前的模型，同样的文本会多产生大约 30% 的 token。

拆开看：

- 你如果是从 **Opus 4.8 / 4.7** 迁过来——它俩已经是同一套 tokenizer，token 数基本不变，差别只在单价翻倍。
- 你如果是从 **Opus 4.6 或更早**（含 GPT/Gemini 切过来按旧经验估算）——同一段 prompt 在 Fable 5 上 token 数会多约 30%，叠加单价翻倍，实际账单可能是原来的 2.5 倍以上。迁移前一定重新跑一遍 `client.messages.count_tokens()` 校准 budget。

一句话：把 Fable 5 当"专家会诊"，不是"全科门诊"。日常 CRUD、批量处理、客服问答继续用 Sonnet 4.6 / Opus 4.8，把 Fable 5 留给真正卡住的长链路 agentic 任务和最高难度推理。

## 注意：Claude.ai 订阅用户有个限时免费窗口

上面 $10/$50 是 **API 按 token 计费**，一直是这样、不受下面影响。但如果你用的是 Claude.ai 的订阅套餐（Pro / Max / Team / 按席位 Enterprise），这次有个限时安排：

- **即日起到 6 月 22 日**：Fable 5 在 Pro / Max / Team / 按席位 Enterprise 套餐里免费包含，不额外收费。
- **6 月 23 日起**：从这些套餐里移除，之后再用 Fable 5 需要消耗 usage credits。官方说如果容量允许，会延长这个免费窗口。
- **再往后**：等容量够了，Anthropic 计划把 Fable 5 恢复成订阅套餐的标配，并说会尽快。

一句话：想"白嫖" Fable 5 的订阅用户，**到 6/22 这两周是窗口期**，过了就要按 credits 付费。API 用户不受这个影响——你本来就是按 token 付钱。

## 对不同角色意味着什么

**全栈 / 后端开发者** — Fable 5 主打 "long-horizon agentic work"，就是那种跨几十个文件、连续几小时不掉线的改代码任务。如果你团队有"修一个大 bug 要跨一整天""一次重构动几百个文件"这种活，值得拿 Fable 5 单独跑一轮看值不值这个价。普通功能开发没必要。

**数据 / AI 工程师** — 关注两点：1M 上下文 + 128k 输出意味着可以一次性喂超大代码库或长文档；但 128k 输出**必须用 streaming** 调用，否则 SDK 会因为超时报错。

**做产品 / 接 API 的团队** — 这次最实际的新东西是**拒答 + fallback + 计费**这套机制（下面单讲），它直接影响你的接入代码要怎么写。

**正在学 AI 应用开发的同学** — 不用一上来就用最贵的。学习和练手用 Sonnet 4.6 完全够，理解清楚 adaptive thinking、effort、tool use 这些概念更重要，模型选哪个是工程权衡不是越贵越好。

## API 和命令：怎么调用 + 有哪些变化

> 下面这些 Messages API 行为是 Fable 5（和 Mythos 5）**专属**的，Opus / Sonnet / Haiku 不受影响。

### 基本调用

```python
from anthropic import Anthropic

client = Anthropic()

response = client.messages.create(
    model="claude-fable-5",
    max_tokens=8192,
    output_config={"effort": "high"},   # low | medium | high | xhigh | max
    messages=[{"role": "user", "content": "..."}],
)
```

### 变化 1：`thinking: {"type": "disabled"}` 不支持（这是 Fable 5 独有的新 breaking change）

Adaptive thinking 是 Fable 5 上**唯一**的思考模式，而且永远开着。官方原话：

> Adaptive thinking is the only thinking mode on Claude Fable 5 and Claude Mythos 5. It applies whenever the `thinking` parameter is unset, and `thinking: {"type": "disabled"}` is not supported.

注意这点和 Opus 4.8/4.7 不一样——Opus 上你可以显式传 `disabled`，Fable 5 上传了会直接 **400**。要"关思考"的写法是**根本不传 `thinking` 参数**，靠 `effort` 调深浅。

### 变化 2：raw thinking 默认不返回

Fable 5 永远不返回原始思维链。`thinking.display` 默认是 `"omitted"`（思考块的 `thinking` 字段为空）。如果你在 UI 里要给用户展示"思考进度"，显式设 `display: "summarized"` 拿可读摘要：

```python
thinking={"type": "adaptive", "display": "summarized"}
```

多轮对话里，思考块要**原样传回**（不要改），且只能在同一个模型上传回。

### 变化 3：这些老参数全部移除（传了就 400）

- `thinking: {type: "enabled", budget_tokens: N}` —— 用 adaptive thinking + effort 代替
- `temperature` / `top_p` / `top_k` —— 全部移除，靠 prompt 引导行为
- 最后一条 assistant 消息做 prefill —— 移除，改用 structured outputs（`output_config.format`）或系统提示控制输出格式

### 新机制：拒答（refusal）+ 回退（fallback）+ 计费

这是 Fable 5 接入时最该改代码的地方。Fable 5 带了 safety classifier，会拒绝某些请求：

- **拒答不是报错**：被拒时 Messages API 返回 `stop_reason: "refusal"`，HTTP 状态是 **200**（成功），响应里会告诉你是哪个 classifier 拦的。你的代码要处理这个 stop_reason，不要当异常崩。
- **自动回退**：被 Fable 5 拒的请求通常别的 Claude 模型能接。传 `fallbacks` 参数让 API 自动重试（beta），或用 SDK middleware 在客户端重试。
- **计费**：在产出任何 output 之前被拒的请求**不计费**；切到别的模型重试时，fallback credit 会退掉切换产生的 prompt-cache 成本。

另外 Fable 5 / Mythos 5 是 "Covered Models"，数据保留 30 天，不支持零数据保留（ZDR）。

### 已支持的功能（launch 时）

Effort、Task budgets（beta header `task-budgets-2026-03-13`）、memory tool、context editing 清理工具结果（beta header `context-management-2025-06-27`）、Compaction、Vision。

### Claude Code 里怎么切

Claude Code 切模型用 `/model` 命令：

```
/model claude-fable-5
```

切完直接用。需要注意 Fable 5 单价翻倍，长 session 的 token 账单会明显高于 Opus，跑大任务前心里有数。

## Fable 5 vs Opus 4.8 怎么选

| 场景 | 选谁 |
|------|------|
| 跨整个代码库的长链路重构、连续几小时的 agentic 任务 | Fable 5 |
| 最高难度的推理 / 一次性解决的硬题 | Fable 5 |
| 日常功能开发、代码 review、写测试 | Opus 4.8 |
| 高并发生产、批量处理、客服问答 | Sonnet 4.6 |
| 学习练手、demo、成本敏感 | Sonnet 4.6 / Haiku 4.5 |

判断标准很简单：这个任务"多花一倍的钱换更高成功率"划不划算？划算（任务长、出错代价高、人工兜底贵）→ Fable 5；不划算 → Opus 4.8 起步，需要再往上调。

## Claude Mythos 5 是什么（顺带）

发布会同时出了个孪生模型 `claude-mythos-5`：能力和 Fable 5 一样，但**去掉了 safety classifier**。它不公开卖，只通过 [Project Glasswing](https://anthropic.com/glasswing) 邀请制给批准的客户用，是 Claude Mythos Preview 的继任者。没有 Mythos 5 权限的团队，公开渠道能用的最强 Mythos 级模型就是 Fable 5。简单说：**Fable 5 = 能买到的最强，Mythos 5 = 暂时不卖。**

## 常见问题

### Claude Fable 5 比 Opus 4.8 贵多少

正好两倍。Fable 5 是 $10 输入 / $50 输出 per MTok，Opus 4.8 是 $5 / $25。所以 Fable 5 是"挑任务用"，不是"默认升上去"。

### 从 Opus 4.8 迁到 Fable 5 要改代码吗

主要改三处：把 `model` 换成 `claude-fable-5`；如果你之前显式传了 `thinking: {type: "disabled"}`，删掉这个参数（Fable 5 上传了会 400）；加上对 `stop_reason: "refusal"` 的处理 + 视情况配 `fallbacks`。`budget_tokens`/`temperature`/`top_p`/prefill 这些在 Opus 4.8 上已经不能用了，迁过来不用额外动。

### 1M 上下文是不是意味着 token 更便宜

不是。1M 是窗口大小，单价该多少还是多少。而且 Fable 5 用的是 Opus 4.7 的新 tokenizer，同样文本比 4.6 之前的模型多约 30% token。上下文大是"能塞更多"，不是"塞得更便宜"。

### 128k 输出怎么用

调用时必须开 streaming（`client.messages.stream(...)` + `.get_final_message()`），否则 SDK 会因为长输出超时直接报错。这一点和 Opus 4.8 一样。

### Fable 5 适合放进我的生产 API 吗

看任务。如果是高频、低难度的请求，放 Fable 5 是烧钱——用 Sonnet 4.6。如果是低频但每次都很硬、出错代价高的请求（复杂分析、长链路 agent），Fable 5 划算。不管放不放，记得处理 `refusal` stop_reason，因为它带 safety classifier 会拒答。

## JR Academy 相关资源

想系统学 AI 应用 / agentic 编程的话：

- [Claude Code 实战指南](/wiki/claude-code) — 从安装到 MCP 配置
- [Claude Opus 4.7 升级指南](/blog/claude-opus-4-7-upgrade-guide) — 上一代旗舰的迁移要点，和这篇对照看
- [AI 编程工具引爆 App Store](/blog/ai-coding-tools-app-store-boom-2026) — AI 工具怎么实际加速开发
- [Web 全栈课程](https://jiangren.com.au/campus) — 打好基础再用 AI 工具加速

Fable 5 真正的意义不是"又快又强了"，而是 Anthropic 第一次把"最强能力"和"旗舰主力"分成两层卖——你现在要多做一个判断：这个任务到底值不值最顶那一档的价。本文所有数字来自 Anthropic 官方 [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)，发布日 2026 年 6 月 9 日。
