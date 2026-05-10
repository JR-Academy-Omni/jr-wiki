---
title: "LLM 基础：你必须懂的工作原理 + 主流模型对比 + API 用法"
wiki: "ai-engineer"
order: 2
description: "Token 怎么预测、Claude/GPT/Gemini 怎么选、context window 怎么算、API streaming 怎么写、token 账单怎么估"
---

## LLM 一句话工作原理

LLM 就是一个**超大号的"下一个词预测器"**。

输入一段文字（比如 "The capital of Australia is "），它会算出每个可能的下一个词的概率（"Canberra" 0.85, "Sydney" 0.08, "Melbourne" 0.03, ...），然后按这个概率分布**采样**出一个词。

把这个词接在原文末尾，重新算下一个词。循环到出 stop token 为止。整个"对话"就是几百次到几万次 next-token prediction 串起来的结果。

听起来像一个非常笨的机制，但训练数据足够大、模型参数足够多（Claude Opus 大概 ~1.5T 参数，GPT-5 ~1.8T，Gemini Ultra 类似量级）之后，"预测下一个词"突然涌现出推理、代码、创作能力。这就是大语言模型的全部秘密。

**作为 AI Engineer 你必须记住的几个含义**：

1. **它没有"知识"，只有"模式"**：它不"知道"今天日期、今天股价、你公司内部数据。要让它知道，必须把信息塞进 prompt 里（这就是 RAG，第 4 章）。
2. **温度 (temperature) 控制采样随机性**：temp=0 总是选最高概率词（确定性强），temp=1 按原分布采样（创造性强）。AI Engineer 大部分场景用 0.0-0.3。
3. **它不可靠**：next-token 采样本质有随机性，且训练数据有偏差，**幻觉是 feature 不是 bug**。要靠工程手段（RAG / 工具 / 二次校验 / eval）兜住。

## 主流模型 2026 年怎么选

不要再纠结"Claude vs GPT 哪个聪明"——2026 年的现实是 Top-3 模型在大部分日常任务上 90%+ 重叠，差异在**特定能力 + 价格 + 生态**。

### Claude（Anthropic）

| 模型 | 主打 | 何时用 |
|------|------|--------|
| **Opus 4.7 (1M context)** | 最强综合能力、超长 context、写作和代码细节最佳 | 长文档分析、code review、复杂 reasoning，能多花钱别省 |
| **Sonnet 4.6** | 性价比最高的中端模型，速度 / 质量 balance | 大部分生产场景默认就用这个 |
| **Haiku 4.5** | 快、便宜，适合 batch / 简单任务 | 分类、提取、简单生成、需要 throughput 的场景 |

**Anthropic 独家**：

- **Prompt Caching**：缓存 5 分钟，命中部分 token 价格降 90%。RAG 场景必开。
- **Tool Use** 接口最干净，function calling 出错率比 OpenAI 低
- **Computer Use** beta：让 Claude 真的去操作鼠标键盘截图。生产风险大但 demo 效果惊艳

### OpenAI

| 模型 | 主打 | 何时用 |
|------|------|--------|
| **GPT-5** | 综合最强、reasoning 模式开 think 后逻辑题碾压 | 数学 / 编程竞赛题、严格 reasoning 场景 |
| **GPT-5 mini** | 性价比款，对标 Claude Sonnet | 大部分日常 |
| **o4** | 专门为 reasoning 优化，慢但深 | 长链推理、研究分析 |

**OpenAI 独家**：

- **生态最熟**：所有 SaaS 都接它，文档 / SDK / 教程最全
- **Realtime API**：实时音频流式对话最强（语音助手类产品几乎垄断）
- **Image generation (gpt-image)**：要在产品里嵌生图就用它

### Gemini（Google）

| 模型 | 主打 | 何时用 |
|------|------|--------|
| **Gemini 2.5 Pro** | 真正可用的 2M context、多模态最强 | 视频分析、超长 PDF、跨多文件代码 |
| **Gemini 2.5 Flash** | 便宜+快 | 高 QPS 后台任务 |

**Gemini 独家**：

- **2M context**：唯一能塞下整本书 + 几十张图的模型
- **Native 多模态**：视频 / 音频 / 图像 / 文本同时输入
- **Google Search 内嵌**：开 grounding 模式后能查实时网页（其他厂要自己接 search）

### 选型决策树

```
要做什么？
├── 客服聊天 / 通用 RAG
│   └── Claude Sonnet 4.6（性价比 + tool use 干净）
├── 复杂代码 / Code review
│   └── Claude Opus 4.7（一小时能省 5 小时人工）
├── 数学 / 严格 reasoning
│   └── GPT-5 with reasoning mode
├── 长视频 / 跨多文件分析
│   └── Gemini 2.5 Pro（2M context 没人能比）
├── 实时语音对话产品
│   └── OpenAI Realtime API
└── 高 QPS 简单任务（分类、提取）
    └── Haiku 4.5 / Gemini Flash 二选一
```

**多模型混合**也很常见。比如生产 RAG 应用：embedding 用 OpenAI（生态成熟），主 LLM 用 Claude Sonnet（tool use 干净），eval 用 GPT-5（最严格）。

## Context Window 是什么、怎么算

Context window = 模型一次能"看"的最多 token 数。**超出就会被截断**，截断哪里取决于你的实现，常见 bug 来源。

| 模型 | Context window | 1 token ≈ |
|------|---------------|----------|
| Claude Opus 4.7 (1M) | 1,000,000 | 0.7 中文 / 0.25 英文单词 |
| GPT-5 | 400,000 | 同上 |
| Gemini 2.5 Pro | 2,000,000 | 同上 |
| Llama 3.3 (开源) | 128,000 | 同上 |

**实操要点**：

1. **不是 context 越大越好**：Claude / GPT / Gemini 都被实测验证 "lost in the middle" 问题——context 太长时模型会忽略中间部分。生产里超过 50K token 的输入要做摘要 / 切片
2. **token 估算**：英文 1 word ≈ 1.3 tokens；中文 1 char ≈ 1.5 tokens；代码 1 line ≈ 10-30 tokens（越多符号越多 token）
3. **Output 也算 context**：Claude 的 1M 是 input + output 共享，不是 input 1M + output 1M

## API 用法：5 分钟跑通

以 Anthropic SDK + TypeScript 为例（Claude / GPT / Gemini SDK 风格几乎一样）。

```bash
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY=sk-ant-...
```

### 单轮调用

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: '用一句话解释 RAG 是什么' }
  ]
});

console.log(response.content[0].text);
```

### 多轮对话（要自己维护历史）

```typescript
const history: Anthropic.MessageParam[] = [];

async function chat(userMsg: string) {
  history.push({ role: 'user', content: userMsg });
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: history
  });
  const assistantMsg = res.content[0].type === 'text' ? res.content[0].text : '';
  history.push({ role: 'assistant', content: assistantMsg });
  return assistantMsg;
}

await chat('我在墨尔本'); // "好的，我了解了，您在墨尔本"
await chat('附近有什么大学？'); // 这次它知道"附近"= 墨尔本附近
```

⚠️ **常见踩坑**：很多人 production 里把 history 无限累积，一周后一次请求 50K token 全是历史，token 账单暴涨 + lost-in-middle。要么限制 history 长度（保留最近 N 轮），要么每 N 轮做摘要塞回去。

### Streaming（用户体验关键）

```typescript
const stream = await client.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '写一篇 500 字关于 RAG 的介绍' }]
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

不开 streaming 的话用户要等 5-10 秒看到第一个字，这在产品里几乎是 dealbreaker。**任何用户能看到结果的场景必开 streaming**。

### System Prompt（角色 / 行为约束）

```typescript
await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: '你是匠人学院的客服助手。只回答关于课程、报名、支付的问题。其他话题礼貌拒绝。',
  messages: [{ role: 'user', content: '今天 AI 股票涨了吗？' }]
});
// → "抱歉，我只回答匠人学院相关问题。如果想了解课程..."
```

System prompt 是把"模型默认人格"扭转的地方，**比 user message 里写"请扮演..."强 10 倍**，这是新手最常见错误。

## Token 账单怎么估

2026 年 Anthropic / OpenAI / Google 价格已经三年降了 5-10 倍，但生产场景仍然能给小公司打几千刀 / 月账单。

| 模型 | Input ($/1M tokens) | Output ($/1M tokens) | Cached input |
|------|---------------------|---------------------|--------------|
| Claude Opus 4.7 | $15 | $75 | $1.50 |
| Claude Sonnet 4.6 | $3 | $15 | $0.30 |
| Claude Haiku 4.5 | $0.80 | $4 | $0.08 |
| GPT-5 | $5 | $30 | $0.50 |
| GPT-5 mini | $0.50 | $4 | $0.05 |
| Gemini 2.5 Pro | $2.50 | $15 | - |
| Gemini 2.5 Flash | $0.20 | $1.50 | - |

### 一个真实估算例子

匠人内部知识库 RAG，每天 1000 次查询：

- **每次平均**：4K input (system + retrieved chunks + user) + 500 output
- **不开 caching**：1000 × (4000 × $3 + 500 × $15) / 1M = $19.5/天 ≈ $585/月
- **开 caching**（system + chunks 命中）：1000 × (3500 × $0.30 + 500 × $3 + 500 × $15) / 1M = $11/天 ≈ $330/月

**caching 一开省 44% 是常态**。RAG 场景的 system prompt + retrieved chunks 都很容易缓存命中。

### 省钱黄金三招

1. **能 Haiku / Flash 就别用 Opus / GPT-5**：90% 任务 Haiku 能干，留 10% 复杂的给 Opus
2. **Prompt Caching 必开**：上面表里 cached 价格基本都是原价 1/10
3. **Output 严格限长**：max_tokens 设 500，不让模型啰嗦。Output token 比 input 贵 5 倍

第 7 章会讲生产环境完整的成本控制策略。

## 本章小结

- LLM = 巨大的下一个 token 预测器，没"知识"只有"模式"，幻觉是结构性问题不是 bug
- 2026 年选型重点不是"哪个最强"，是"针对任务+预算选哪个"，必要时多模型混合
- API 三件套：单轮 / 多轮 / streaming + system prompt 控制角色
- token 账单按 input × $/1M tokens 估，caching + 选小模型 + 限 output 是省钱三件套

下一章进 Prompt Engineering——**写得好的 prompt 比换一个更强的模型省钱效果还好**。
