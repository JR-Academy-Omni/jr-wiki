---
title: "FAQ：定价、免费方案、常见坑、适不适合你"
wiki: "vercel-ai-sdk-guide"
order: 5
description: "Vercel AI SDK 常见问题解答：到底要不要花钱、免费 LLM Provider 推荐、踩坑记录、什么场景该用 / 不该用"
---

## Vercel AI SDK 常见问题

用了 Vercel AI SDK 之后你一定会遇到这些问题。这一章直接给答案。

## Q1：AI SDK 本身要钱吗？

不要。Vercel AI SDK 是 Apache 2.0 开源的，完全免费，不限调用次数。你要付费的是 LLM API 本身（OpenAI、Anthropic 的 token 费用）和你选择的部署平台。

关键区分：

```
Vercel AI SDK（免费开源）
     ↕ 调用
LLM API（按 token 收费，但有免费选项）
     ↕ 部署在
Vercel / Railway / 自建服务器（各有定价）
```

你完全可以用 AI SDK + 免费 LLM + 自建服务器，一分钱不花。

## Q2：有哪些免费的 LLM Provider？

![Google AI Studio 免费额度](https://ai.google.dev/static/images/homepage/build.png)

| Provider | 免费额度 | 推荐模型 | 适合场景 |
|----------|---------|---------|---------|
| Google Gemini | 每天 1500 次请求，1M context | gemini-2.5-flash | 开发测试首选，额度最大方 |
| Groq | 30 RPM，多个开源模型 | llama-3.3-70b | 速度极快，适合低延迟场景 |
| OpenRouter | 部分社区模型免费 | 看列表选 | 想试各种模型的人 |
| Ollama（本地） | 完全免费，无限制 | llama3, qwen2 | 隐私敏感、离线开发 |

我的建议：开发阶段用 Google Gemini（免费额度够用），生产环境按需求选 GPT-4o 或 Claude。Ollama 适合不想花钱又有 GPU 的同学。

## Q3：最常踩的坑有哪些？

**坑 1：Tool Calling 后没有文本回答**

忘记设 `maxSteps`。不设的话模型调完 tool 就结束了：

```typescript
// ❌ 调完 tool 就停了，没有文字回答
const result = streamText({ model, messages, tools });

// ✅ 允许多步执行，模型会根据 tool 结果生成回答
const result = streamText({ model, messages, tools, maxSteps: 5 });
```

**坑 2：Zod schema 太复杂导致 TypeScript 编译爆内存**

嵌套超过 3-4 层的 Zod schema 会让 TS 编译器内存暴涨。解法：拆成多个小 schema 分步调用。

**坑 3：Edge Runtime 里用了 Node.js API**

部署到 Vercel Edge Functions 时不能用 `fs`、`path` 等 Node.js 模块。如果你的 tool 需要文件操作，改用 Serverless Functions（去掉 `export const runtime = 'edge'`）。

**坑 4：流式响应超时**

Vercel Serverless 默认 10 秒超时（Hobby 计划）。AI 请求经常超这个时间。加上 `maxDuration`：

```typescript
export const maxDuration = 30; // Pro 计划最高 300 秒
```

## Q4：什么场景该用 AI SDK？什么场景不该？

**适合用的场景：**
- 需要流式聊天 UI 的 Web 应用
- 要支持多个 LLM Provider 的产品
- Next.js / React 技术栈的项目
- 需要 Tool Calling 或 Agent 能力

**不太适合的场景：**
- 只用单一 Provider 且不需要流式 UI → 直接用 OpenAI SDK 更轻量
- 重度 RAG / 文档处理 pipeline → LangChain 的抽象更完整
- Python 技术栈 → AI SDK 只支持 TypeScript/JavaScript

## Q5：不用 Vercel 部署可以吗？

完全可以。AI SDK 的核心是纯 TypeScript 库，跟 Vercel 平台没有绑定关系。你可以部署到：

```bash
# Express 服务器
import express from 'express';
import { streamText } from 'ai';

const app = express();
app.post('/api/chat', async (req, res) => {
  const result = streamText({ model: openai('gpt-4o'), messages: req.body.messages });
  result.pipeDataStreamToResponse(res);
});
app.listen(3000);
```

也支持 Fastify、Hono、Deno、Bun 等运行时。

## Q6：学习资源推荐

- **官方文档**：ai-sdk.dev（最权威，更新最快）
- **GitHub 示例**：vercel/ai 仓库的 examples 目录有 20+ 完整示例
- **Vercel 社区论坛**：community.vercel.com 的 AI SDK 板块
- **模板项目**：Vercel 官方的 Chat SDK 模板，clone 下来就能跑

开始动手吧。AI SDK 的学习曲线很平——花 15 分钟跑通第二章的例子，再花一个下午读完本书，你就能用它做出像样的 AI 产品了。
