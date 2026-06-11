---
title: "测试与可观测性：生产级 AI 应用的必修课"
wiki: "vercel-ai-sdk-guide"
order: 7
description: "用 MockLanguageModelV4 写确定性单元测试，用 OpenTelemetry + Langfuse 监控生产环境每次模型调用的成本与延迟"
---

## 为什么 AI 应用需要特殊的测试策略

普通代码的单元测试逻辑很清晰：给定输入，断言输出。但 AI 应用面对三个麻烦：

1. **非确定性**：同样的 prompt 每次输出不一样
2. **慢**：调一次 GPT-4o 要 2-5 秒
3. **贵**：CI 跑 100 次测试可能花几美元 token 费用

Vercel AI SDK 内置了 mock 工具解决这三个问题——让测试快、便宜、可重复。

## 测试工具安装

```bash
# ai/test 是 ai 包的子路径，不需要额外安装
# 确保 ai 版本 >= 6.0
npm install ai
```

## 用 MockLanguageModelV4 测试 generateText

`MockLanguageModelV4` 让你控制模型的输出，不发任何真实 API 请求：

```typescript
import { generateText } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

// 测试：验证函数能正确处理 AI 返回的内容
it('summarize() 应该返回摘要文本', async () => {
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: '这是一段自动生成的摘要内容。' }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 50, noCache: 50, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  });

  const { text } = await generateText({
    model,
    prompt: '请总结这篇文章：...',
  });

  expect(text).toBe('这是一段自动生成的摘要内容。');
});
```

`doGenerate` 完全控制返回内容，测试执行时间从 3 秒降到几毫秒。

## 用 simulateReadableStream 测试流式输出

流式响应需要模拟分块传输，`simulateReadableStream` 帮你构造：

```typescript
import { streamText, simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

it('streamText 应该逐块输出文本', async () => {
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 0, // 测试时不需要延迟
        chunks: [
          { type: 'text-start', id: 'text-1' },
          { type: 'text-delta', id: 'text-1', delta: '你好' },
          { type: 'text-delta', id: 'text-1', delta: '，世界！' },
          { type: 'text-end', id: 'text-1' },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: undefined },
            logprobs: undefined,
            usage: {
              inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 5, text: 5, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });

  const result = streamText({ model, prompt: '打招呼' });
  const text = await result.text;

  expect(text).toBe('你好，世界！');
});
```

## 测试结构化输出

```typescript
import { generateText, Output } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

const RecipeSchema = z.object({
  name: z.string(),
  cookTime: z.number(),
  ingredients: z.array(z.string()),
});

it('结构化输出应该正确解析 JSON', async () => {
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{
        type: 'text',
        text: JSON.stringify({
          name: '番茄炒蛋',
          cookTime: 10,
          ingredients: ['番茄', '鸡蛋', '盐'],
        }),
      }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 30, noCache: 30, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 40, text: 40, reasoning: undefined },
      },
      warnings: [],
    }),
  });

  const { output } = await generateText({
    model,
    output: Output.object({ schema: RecipeSchema }),
    prompt: '给我一个番茄炒蛋的食谱',
  });

  expect(output.name).toBe('番茄炒蛋');
  expect(output.cookTime).toBe(10);
  expect(output.ingredients).toHaveLength(3);
});
```

## 可观测性：用 OpenTelemetry 监控生产环境

测试保证代码正确，可观测性保证生产环境不出意外。AI SDK 内置了 OpenTelemetry 支持，接入 Langfuse、LangSmith 等平台只需几行代码。

### 基础配置

```bash
npm install @ai-sdk/otel @opentelemetry/sdk-node
```

在应用入口（`instrumentation.ts` for Next.js，或 `index.ts`）注册：

```typescript
import { registerTelemetry } from 'ai';
import { OpenTelemetry } from '@ai-sdk/otel';

// Next.js：放在 instrumentation.ts 的 register() 函数里
export async function register() {
  registerTelemetry(new OpenTelemetry());
}
```

### 给每次 AI 调用打上标签

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: '...',
  telemetry: {
    functionId: 'user-onboarding-summary', // 标识这是哪个功能的调用
  },
});

// streamText 同样支持
const stream = streamText({
  model: openai('gpt-4o'),
  messages,
  telemetry: {
    functionId: 'chat-session',
  },
});
```

`functionId` 会出现在 Langfuse / LangSmith 的每条 trace 里，让你按功能筛选、比较不同版本的 prompt 效果。

### 接入 Langfuse（推荐）

Langfuse 是目前最流行的 LLM 可观测性平台，有免费自托管版：

```bash
npm install langfuse-vercel
```

```typescript
import { registerTelemetry } from 'ai';
import { OpenTelemetry } from '@ai-sdk/otel';
import { LangfuseExporter } from 'langfuse-vercel';

registerTelemetry(
  new OpenTelemetry({
    exporter: new LangfuseExporter({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: 'https://cloud.langfuse.com',
    }),
  })
);
```

配置好之后，每次 `generateText` / `streamText` 调用会自动上报：
- 完整的 messages（输入/输出）
- Token 用量和成本估算
- 延迟（到第一个 token、总时长）
- 工具调用详情
- 错误信息

在 Langfuse 控制台就能看到每个用户、每个功能的 AI 调用明细，排查问题很方便。

### 自定义 Telemetry（轻量版，无需 OpenTelemetry）

如果你只想简单打日志，不想装 OTel，可以实现 `Telemetry` 接口：

```typescript
import type { Telemetry } from 'ai';
import { registerTelemetry } from 'ai';

class ConsoleLogger implements Telemetry {
  async onStart(event: any) {
    console.log(`[AI] 开始调用: ${event.modelId}`);
  }

  async onStepEnd(event: any) {
    const { inputTokens, outputTokens } = event.usage;
    console.log(`[AI] 第 ${event.stepNumber} 步完成: in=${inputTokens.total} out=${outputTokens.total}`);
  }

  async onEnd(event: any) {
    const totalTokens = event.usage.inputTokens.total + event.usage.outputTokens.total;
    console.log(`[AI] 调用结束，总 tokens: ${totalTokens}`);
  }
}

registerTelemetry(new ConsoleLogger());
```

## 实际项目建议

**测试分层：**

```
单元测试（MockLanguageModelV4）
  → 验证业务逻辑：prompt 构造正确吗？返回值处理正确吗？
  → 运行时间：毫秒级，CI 全量跑

集成测试（真实 API，但用便宜模型）
  → 验证 prompt 能引导模型给出正确格式的回答
  → 每个核心 prompt 跑一次，用 Gemini Flash 省钱

生产监控（Langfuse / OpenTelemetry）
  → 追踪实际成本、延迟、错误率
  → 发现 prompt 退化（同一个输入，某次之后质量变差）
```

**关键指标要盯：**
- P95 首 token 延迟（用户体感响应速度）
- 每次调用平均 token 数（成本控制）
- 工具调用失败率（Agent 健壮性）
- `finish_reason` 分布（`length` 太多 = context 不够）

把这两章（MCP 集成 + 测试可观测性）加进你的项目，AI 功能才算真正生产就绪。
