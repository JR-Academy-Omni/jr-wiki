---
title: "进阶玩法：Agent 循环、RAG 检索、Middleware 扩展"
wiki: "vercel-ai-sdk-guide"
order: 4
description: "Vercel AI SDK 6 的 Agent 能力、RAG 向量检索模式、Middleware 中间件机制，以及生产环境实战经验"
---

## Vercel AI SDK 进阶用法

掌握了基础的 streamText 和 Tool Calling 之后，这一章讲三个让你从 demo 走向生产的进阶能力。

## 一、Agent 循环：SDK 6 的 ToolLoopAgent

SDK 6 引入了 `ToolLoopAgent`——一个开箱即用的"推理 → 工具调用 → 再推理"循环。以前你得自己写 while loop 管理多步执行，现在 SDK 内置了：

```typescript
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const researchAgent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  instructions: '你是一个技术调研助手，会使用搜索和摘要工具来回答问题。',
  tools: {
    search: tool({
      description: '搜索技术文档',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        return await searchDocs(query);
      },
    }),
    summarize: tool({
      description: '总结长文本',
      parameters: z.object({ text: z.string() }),
      execute: async ({ text }) => {
        return text.slice(0, 500) + '...';
      },
    }),
  },
  stopWhen: stepCountIs(10),
});

const result = await researchAgent.generate({
  prompt: 'Next.js 15 的 Server Actions 有什么变化？',
});
```

![AI Agent 工作流程](https://www.truefoundry.com/blog/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2F21fyvlkz%2Fproduction%2Fbbf6daa1a2f3ca8f5e2cc54ce8e554d03f2e5ef1-1374x750.png&w=1200&q=75)

`ToolLoopAgent` 会反复执行"模型推理 → 选择工具 → 执行 → 把结果喂回模型"的循环，直到满足停止条件（步数上限、模型主动结束、或自定义条件）。

一个很有用的功能是 `needsApproval`——设为 `true` 或传入函数，Agent 在执行高风险工具前会暂停等你确认：

```typescript
tools: {
  deleteFile: tool({
    description: '删除文件',
    parameters: z.object({ path: z.string() }),
    execute: async ({ path }) => fs.unlink(path),
    needsApproval: true,
  }),
},
```

## 二、RAG：向量检索增强

RAG（Retrieval-Augmented Generation）是让 LLM 基于你自己的数据回答问题的标准模式。AI SDK 内置了 embedding 支持：

```typescript
import { embed, embedMany, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

// 建索引：把文档切块后批量生成向量
const chunks = ['Next.js 是 React 框架...', 'App Router 用法...', '...'];
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: chunks,
});
// 把 embeddings 存到 pgvector / Pinecone / Upstash Vector

// 查询：用户问题 → 向量 → 找最相关的文档块
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: '怎么用 Server Actions？',
});
const topChunks = findSimilar(embedding, storedEmbeddings, { topK: 5 });

// 把检索到的上下文注入 prompt
const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: `根据以下资料回答问题：\n${topChunks.join('\n')}\n\n问题：怎么用 Server Actions？`,
});
```

这个模式适合做内部知识库问答、文档搜索助手、客服机器人等场景。

## 三、Middleware：在模型调用前后插入逻辑

Middleware 让你在不改业务代码的情况下，给模型调用加上日志、缓存、安全过滤等功能：

```typescript
import { wrapLanguageModel } from 'ai';

const modelWithLogging = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: {
    transformParams: async ({ params }) => {
      console.log('发送给模型的 messages:', params.prompt);
      return params;
    },
    wrapGenerate: async ({ doGenerate }) => {
      const start = Date.now();
      const result = await doGenerate();
      console.log(`耗时 ${Date.now() - start}ms, tokens: ${result.usage}`);
      return result;
    },
  },
});
```

SDK 内置了几个实用的 middleware：
- `extractReasoningMiddleware`：提取模型的 `<think>` 思考过程（DeepSeek 等模型用得到）
- `defaultSettingsMiddleware`：给所有请求设默认参数
- `simulateStreamingMiddleware`：把非流式模型包装成流式

多个 middleware 可以链式组合，按注册顺序执行。

## 生产环境建议

1. **一定要设 `maxSteps`**：忘设的话 Tool Calling 调完就停，不会生成文本回答
2. **用流式，别用阻塞**：`streamText` 用户体验远好于 `generateText`，因为用户不用盯着空白等 3-5 秒
3. **pin 版本号**：AI SDK 迭代很快，lock 住 major version 避免意外 breaking change
4. **模型降级方案**：主模型挂了自动切到备用模型，比如 GPT-4o → Claude Sonnet → Gemini Flash
