---
title: "快速上手：15 分钟搭一个 AI 聊天应用"
wiki: "vercel-ai-sdk-guide"
order: 2
description: "从零开始用 Vercel AI SDK + Next.js 搭建流式聊天，支持一键切换 OpenAI / Claude / Gemini"
---

## 用 Vercel AI SDK 搭第一个项目

这一章带你从零开始，用 Next.js App Router + AI SDK 搭一个能流式输出的聊天应用。完成后你会理解 AI SDK 的核心用法。

![Next.js AI Chat 示例](https://vercel.com/_next/image?url=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Fv1718914025%2Ffront%2Fai-sdk%2Fai-sdk-og.png&w=1200&q=75)

## 第一步：初始化项目 + 安装依赖

```bash
npx create-next-app@latest my-ai-chat --typescript --app --tailwind
cd my-ai-chat

# 核心包 + React Hook + Provider
npm install ai @ai-sdk/react @ai-sdk/openai
```

`ai` 是核心库，`@ai-sdk/react` 提供 `useChat` 等 Hook，`@ai-sdk/openai` 是 OpenAI 的适配器。你也可以装 `@ai-sdk/anthropic` 或 `@ai-sdk/google` 来用 Claude 或 Gemini。

## 第二步：配置 API Key

在项目根目录创建 `.env.local`：

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

Provider 包会自动读取对应的环境变量，不需要手动传入。

## 第三步：写后端 API Route

创建 `app/api/chat/route.ts`：

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

就这几行。`streamText` 调用模型生成流式文本，`toDataStreamResponse` 把流转成前端能消费的 Response。

## 第四步：写前端聊天页面

编辑 `app/page.tsx`：

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="flex flex-col w-full max-w-md mx-auto py-24">
      {messages.map((m) => (
        <div key={m.id} className="mb-4 whitespace-pre-wrap">
          <strong>{m.role === 'user' ? '你：' : 'AI：'}</strong>
          {m.parts?.map((part, i) =>
            part.type === 'text' ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      ))}
      <form onSubmit={handleSubmit} className="fixed bottom-0 w-full max-w-md p-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          className="w-full border rounded p-2"
        />
      </form>
    </div>
  );
}
```

`useChat()` 默认请求 `/api/chat`，自动管理消息列表、输入框状态和流式渲染。你不需要手动处理 SSE 或 fetch stream——Hook 全包了。

## 第五步：跑起来

```bash
npm run dev
```

打开 `http://localhost:3000`，输入消息，你会看到 AI 的回答像打字一样逐字流出来。

## 一行代码切换模型

想试 Claude？装 Anthropic Provider，改一行：

```typescript
// route.ts 改这两行就行
import { anthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  messages,
});
```

Google Gemini 也一样，而且 Gemini 有免费额度（每天 1500 次请求），很适合开发测试：

```typescript
import { google } from '@ai-sdk/google';
const result = streamText({
  model: google('gemini-2.5-flash-preview-04-17'),
  messages,
});
```

前端代码一个字都不用改。这就是统一 Provider 接口的好处——后端换模型，前端无感知。

## 本地模型也行

用 Ollama 跑本地模型，完全免费：

```bash
# 先装 Ollama 并拉模型
ollama pull llama3

# 装社区 Provider
npm install ollama-ai-provider
```

```typescript
import { createOllama } from 'ollama-ai-provider';
const ollama = createOllama({ baseURL: 'http://localhost:11434/api' });

const result = streamText({
  model: ollama('llama3'),
  messages,
});
```

下一章我们深入 AI SDK 的三大核心能力：结构化输出、Tool Calling、流式 UI。
