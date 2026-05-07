---
title: "三大核心能力：结构化输出、Tool Calling、流式 UI"
wiki: "vercel-ai-sdk-guide"
order: 3
description: "Vercel AI SDK 最实用的三个功能深入讲解：让 LLM 返回 JSON、调用外部函数、实时流式渲染"
---

## Vercel AI SDK 的核心功能

上一章跑通了基础聊天。这一章深入 AI SDK 最有价值的三个能力，它们是构建真实 AI 产品的基础。

## 一、结构化输出：让 LLM 返回干净的 JSON

做产品时你经常需要 LLM 返回结构化数据（而不是自由文本）。Vercel AI SDK 用 Zod schema 定义输出格式，LLM 会严格遵守：

```typescript
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.object({
    schema: z.object({
      name: z.string().describe('菜名'),
      ingredients: z.array(z.object({
        name: z.string(),
        amount: z.string(),
      })),
      cookTime: z.number().describe('烹饪时间（分钟）'),
    }),
  }),
  prompt: '给我一个番茄炒蛋的食谱',
});

console.log(output.name);        // "番茄炒蛋"
console.log(output.cookTime);    // 10
console.log(output.ingredients); // [{name: "番茄", amount: "2个"}, ...]
```

![Structured Output 流程](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*Ug1bRPOhL-TehKSbm3YaqQ.png)

注意 SDK 6 里推荐用 `generateText` + `Output.object`，老版本的 `generateObject` 已经标记 deprecated。`.describe()` 会把字段说明传给模型，提高输出准确率。

返回值是完全类型安全的——TypeScript 会根据 Zod schema 自动推导 `output` 的类型，IDE 能直接点出 `.name`、`.cookTime`。

## 二、Tool Calling：让 LLM 调用你的函数

LLM 自己不能查数据库、不能调 API。但 Tool Calling 让 LLM "描述想做什么"，SDK 自动执行对应函数，把结果喂回给模型：

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: '悉尼现在天气怎么样？',
  tools: {
    getWeather: tool({
      description: '查询指定城市的实时天气',
      parameters: z.object({
        city: z.string().describe('城市名'),
      }),
      execute: async ({ city }) => {
        const res = await fetch(`https://api.weather.example/v1?q=${city}`);
        return res.json();
      },
    }),
  },
  maxSteps: 3,
});
```

工作流程：
1. LLM 分析 prompt，决定要调用 `getWeather`，生成参数 `{city: "Sydney"}`
2. SDK 用 Zod 验证参数，执行 `execute` 函数
3. 函数结果自动回传给 LLM
4. LLM 根据结果生成最终回答

`maxSteps` 很关键——它允许模型进行多轮工具调用。不设的话模型调完工具就停了，不会生成文本回答。

你可以注册多个 tool，模型会自己判断该调哪个、该不该调。这就是 AI Agent 的基础。

## 三、流式 UI：打字机效果 + 实时更新

AI SDK 的流式能力不只是"文字一个个蹦出来"，它支持流式结构化数据和流式 UI 组件：

```typescript
// 后端：流式返回结构化对象
import { streamText, Output } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    output: Output.object({
      schema: z.object({
        answer: z.string(),
        sources: z.array(z.string()),
      }),
    }),
  });
  return result.toUIMessageStreamResponse();
}
```

```tsx
// 前端：实时渲染流式内容
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          {m.parts?.map((part, i) => {
            if (part.type === 'text') return <p key={i}>{part.text}</p>;
            if (part.type === 'reasoning') return <details key={i}><summary>思考过程</summary>{part.text}</details>;
            return null;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

SDK 6 的消息格式用 `parts` 数组，每个 part 有自己的 type（text、reasoning、tool-invocation 等），前端可以分别渲染不同的 UI 组件。

这三个能力组合起来，就能构建出真正有用的 AI 产品。下一章我们进入 Agent 模式和生产级技巧。
