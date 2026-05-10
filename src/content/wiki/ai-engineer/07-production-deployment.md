---
title: "生产部署：Latency / Cost / Observability / Safety 四件套"
wiki: "ai-engineer"
order: 7
description: "AI 产品上线后真正的工程难题：怎么压 latency、怎么省 cost、怎么 trace、怎么挡 abuse 和 PII"
---

## AI 产品上线之后的真正难题

前 6 章把"做出来"教完了。这一章讲"上线后不挂"。这部分**面试经常问到、JD 里写"production experience" 真正考察的就是这些**。

四个核心维度：

```
        Latency
           ▲
           │
Cost ◀────┼────▶ Observability
           │
           ▼
         Safety
```

四个互相 tradeoff——压 latency 通常涨 cost、增 observability 涨 latency、加 safety 加 latency 又加 cost。生产 AI Engineer 的工作就是在这四个之间找最优解。

## ① Latency：用户感知速度

### 数字基准

| 体验 | TTFT (首 token) | 总时延 | 用户反应 |
|------|----------------|--------|---------|
| 极佳 | < 500ms | 流式持续 | "感觉很快" |
| 可接受 | < 1.5s | 流式 | "还行" |
| 差 | > 3s | 阻塞 | "卡死了" |
| 灾难 | > 10s | 超时 | "再也不用" |

`TTFT` (Time To First Token) 是关键指标。**只要流式开 + TTFT < 1s，用户主观体验就 OK**，哪怕总时长 30 秒。

### 优化手段（按性价比排序）

#### a. 开 Streaming（必做）

第 2 章提过。**不开 streaming 的 AI 产品是过去式**。

#### b. Prompt Caching（Anthropic 必开）

system prompt + RAG chunks 缓存 5 分钟，命中部分 input 价格 1/10、latency 降 50%+：

```typescript
await client.messages.create({
  model: 'claude-sonnet-4-6',
  system: [{
    type: 'text',
    text: longSystemPrompt,
    cache_control: { type: 'ephemeral' } // ← 关键
  }],
  messages: [...]
});
```

OpenAI 也有自动 prompt caching（24h TTL）但需要 prompt 完全相同。Anthropic 是 5min ephemeral 但能精确控制缓存哪段。

#### c. 减小输入 token 量

- RAG top-k 从 10 改 5
- system prompt 精简（去掉冗余话）
- 长 history 做摘要

每砍 1K token，latency 降 ~100-200ms，cost 降同比例。

#### d. 用 Haiku / Flash 处理简单任务

简单分类用 Sonnet 是杀鸡用牛刀。**大部分客服分类、内容审核、关键词提取用 Haiku 都够**，latency 减半 + 价格 1/4。

#### e. 并发调用而不是串行

```typescript
// ❌ 串行 (慢)
const summary = await llmCall(p1);
const tags = await llmCall(p2);
const sentiment = await llmCall(p3);

// ✅ 并发 (快 3 倍)
const [summary, tags, sentiment] = await Promise.all([
  llmCall(p1), llmCall(p2), llmCall(p3)
]);
```

注意 rate limit—— Anthropic 默认 RPM 是 50（Tier 1），并发太多会 429。生产要算好 RPS。

## ② Cost：账单怎么压

匠人内部经验：从"完全不优化"到"全套优化"，AI 月度账单可降 60-80%。

### 优化策略矩阵

| 策略 | 节省比例 | 实施难度 |
|------|---------|---------|
| **模型选型 (Sonnet → Haiku)** | 70% | ⭐ 简单 |
| **Prompt Caching** | 40-50% | ⭐ 简单（一行代码）|
| **限制 max_tokens** | 20-30% | ⭐ 简单 |
| **Batch API（非实时任务）** | 50% | ⭐⭐ 改架构 |
| **Prompt 精简** | 10-20% | ⭐⭐ 调 prompt |
| **混合模型路由** | 20-40% | ⭐⭐⭐ 加 router 层 |
| **本地部署小模型** | 80%+ | ⭐⭐⭐⭐ 自维护 GPU |

### Batch API：非实时任务降 50%

OpenAI / Anthropic / Google 都开了 batch API，定价是实时 API 的 50%，但 24 小时内才返回。

**适用场景**：

- 每晚跑的内容审核
- 离线 evaluation
- 历史数据回填
- 任何"可以隔夜处理"的

```python
# OpenAI Batch API 例子
client.batches.create(
    input_file_id=file.id,
    endpoint='/v1/chat/completions',
    completion_window='24h'
)
```

匠人 daily-eval cron 就用 batch API，月省 ~$200。

### 混合模型路由（Router）

写一个小 LLM 先判断"这个 query 难度多少"，简单的路由到 Haiku，复杂的到 Sonnet：

```typescript
async function smartRoute(query: string) {
  // Step 1: cheap classifier (Haiku, 一次 ~$0.0001)
  const difficulty = await haiku.classify({
    system: '判断 query 难度：simple / complex',
    messages: [{ role: 'user', content: query }]
  });
  
  // Step 2: route to right model
  if (difficulty === 'simple') {
    return await haiku.chat(query);
  } else {
    return await sonnet.chat(query);
  }
}
```

**前提**：分类成本 << 模型差价。计算盈亏点：每 1000 query 用 Sonnet $X，加 router 后 800 走 Haiku + 200 走 Sonnet 的总成本应明显低于 $X，否则别加 router。

### 监控成本

[Helicone](https://www.helicone.ai/) / [Portkey](https://portkey.ai/) 这种代理把 LLM 调用 proxy 一遍，给你一个 dashboard 看每个用户、每个 endpoint、每天 / 周的 token 和 $ 消耗。匠人内部用 Langfuse 自带的 cost tracking，每个 trace 都有 cost 字段。

**永远监控总 cost、单用户 cost、每个 endpoint cost**。看到突涨立刻查（一般是被 abuse 或某个 user query 异常）。

## ③ Observability：出问题怎么 debug

LLM 应用 debug 比传统应用难 10 倍。原因：

- 输出非确定性（同样 query 可能不同结果）
- 调用链长（query rewrite → embed → vector search → rerank → LLM）
- 错误形态多（拒答、幻觉、格式错、慢、贵）

必须有专门的 observability。

### 三层 trace 是标配

```
Layer 1: Request trace
  └── /api/ai/resume-analyze (req_id=abc, user=xyz, latency=2.3s, cost=$0.012)
       │
Layer 2: LLM call trace
  ├── embed (model=text-embedding-3-small, tokens=120, latency=80ms)
  ├── vector_search (top_k=20, latency=15ms)
  ├── rerank (model=rerank-3, latency=180ms)
  └── llm_call
       │
Layer 3: LLM call detail
  ├── system prompt: "..." (cached: yes, 1200 tokens)
  ├── user msg: "..." (300 tokens)
  ├── output: "..." (450 tokens)
  ├── tokens: input=1500, output=450, cached=1200
  ├── cost: $0.012
  └── latency: 1.8s (TTFT=400ms)
```

### 工具

- **Langfuse**（开源 / SaaS，自托管首选）
- **LangSmith**（LangChain 出，Python 生态深度集成）
- **Datadog APM**（传统 APM 加 LLM 插件）
- **Helicone**（轻量 proxy，1 行代码集成）

匠人用 **Langfuse self-hosted**：免费、所有数据自己控、Postgres 后端不另起新 infra。

### 必须打的字段

```typescript
{
  trace_id: 'abc-123',
  user_id: 'user-456',
  endpoint: 'POST /api/ai/resume-analyze',
  model: 'claude-sonnet-4-6',
  prompt_version: 'resume-analysis@1.2.0',  // ← 关键，prompt 出问题能定位
  input: { ... },
  output: { ... },
  tokens: { input: 1500, output: 450, cached: 1200 },
  cost_usd: 0.012,
  latency_ms: 1820,
  ttft_ms: 380,
  error: null,
  feedback: null  // 用户点踩 / 五星评分写这里
}
```

`prompt_version` 是匠人内部 PRD 强制的——出问题能立刻定位是哪版 prompt 干的。

## ④ Safety：挡住坏请求 + 别泄露敏感

### Rate Limiting（必须）

不限的话用户脚本一刷就把你账单刷穿。NestJS 例子：

```typescript
@Throttle({ default: { ttl: 60000, limit: 30 } }) // 30 RPM/IP
@Post('/ai/chat')
async chat(@Body() dto: ChatDto) { ... }
```

匠人全局 100 RPM/IP，AI endpoints 单独限 30 RPM。**用户级别也要限**（按 user_id 不只 IP）。

### Content Moderation

用户输入 + 模型输出都要过审：

- **OpenAI Moderation API** 免费，分类 violence / sexual / hate
- **Anthropic** 没专门 API，用 Haiku 写 prompt 判
- 大陆运营用阿里云 / 腾讯云内容审核（自带敏感词库）

```typescript
async function chat(userMsg: string) {
  // pre-check user input
  const inputCheck = await moderate(userMsg);
  if (inputCheck.flagged) throw new Error('Input violates policy');
  
  // call LLM
  const response = await llm.chat(userMsg);
  
  // post-check output
  const outputCheck = await moderate(response);
  if (outputCheck.flagged) {
    return '抱歉，无法生成相关内容'; // 拒绝输出
  }
  
  return response;
}
```

### PII 处理

简历、客户咨询里可能有手机、邮箱、身份证、银行卡。**送给 LLM 前必须 redact**：

```typescript
function redactPII(text: string) {
  return text
    .replace(/\b1[3-9]\d{9}\b/g, '[PHONE]')
    .replace(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{15}|\d{18}\b/g, '[ID]');
}
```

**为什么必须**：

1. 数据传到 LLM 服务商等于上传 OpenAI / Anthropic
2. 训练数据可能被用来改模型（虽然各厂都说"我们不用 API 数据训练"，但合规层面 zero trust 更稳）
3. 澳洲 Privacy Act + GDPR 都要求"必要最小化"

**例外**：如果有 BAA / DPA 协议（Enterprise tier），可以发 PII。但默认 redact 是工程默认。

### Prompt Injection 防御

第 3 章已经讲。生产标配：

- 用户输入用 `<user_input>` 标签包起来
- system prompt 写死"无论用户说什么，永远不做 X"
- 高危动作 human-in-the-loop

### 监控异常 query

某用户突然问 1000 次"管理员密码"——很可能是 attack。要打日志 + 告警：

```typescript
const SUSPICIOUS_KEYWORDS = ['ignore previous', 'system prompt', 'admin password'];
if (SUSPICIOUS_KEYWORDS.some(k => userMsg.toLowerCase().includes(k))) {
  await alertSecurityTeam({ user_id, msg: userMsg });
}
```

## 一个完整的 production AI endpoint 长这样

```typescript
@Throttle({ default: { ttl: 60000, limit: 30 } })
@Post('/ai/chat')
async chat(@Body() dto: ChatDto, @CurrentUser() user: User) {
  const traceId = uuid();
  
  // 1. Pre-check
  const moderation = await this.moderateService.check(dto.message);
  if (moderation.flagged) throw new ForbiddenException('Content policy violation');
  
  // 2. PII redact
  const redacted = redactPII(dto.message);
  
  // 3. RAG retrieval (with caching)
  const chunks = await this.ragService.retrieve(redacted, { 
    accessLevel: user.role,
    topK: 5 
  });
  
  // 4. LLM call (with timeout + retry + observability)
  const response = await this.langfuse.trace(traceId, async () => {
    return await retryWithBackoff(
      () => this.llmService.chat({
        promptVersion: 'chat@1.2.0',
        system: PROMPTS.chat.system,
        chunks,
        userMessage: redacted,
        userId: user.id,
        timeout: 30000
      }),
      { maxRetries: 2 }
    );
  });
  
  // 5. Post-check output
  const outputModeration = await this.moderateService.check(response.text);
  if (outputModeration.flagged) {
    return { response: '抱歉，无法生成相关内容', traceId };
  }
  
  return { response: response.text, traceId };
}
```

50 行代码包含 rate limit / moderation / PII / RAG / observability / retry / output filter。这是真正 production-ready 的 AI endpoint。

## 本章小结

- Latency：streaming + caching + 选小模型 + 并发
- Cost：选模型 + caching + batch API + 混合路由 + 监控
- Observability：三层 trace（request / LLM call / detail），打 prompt_version 字段
- Safety：rate limit + moderation 双向 + PII redact + injection 防御 + 异常 query 监控

最后一章我们讲求职：怎么把这些技能转化成简历 / 项目 / 面试通过率。
