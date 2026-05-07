---
title: "Vercel AI SDK 是什么：TypeScript AI 开发的标准工具链"
wiki: "vercel-ai-sdk-guide"
order: 1
description: "Vercel AI SDK 核心定位、和 LangChain / OpenAI SDK 的对比、为什么它是 2026 年 TypeScript AI 应用的首选"
---

## Vercel AI SDK 一句话说清

Vercel AI SDK 是一个开源的 TypeScript 工具库，专门用来构建 AI 驱动的 Web 应用。它由 Next.js 的母公司 Vercel 维护，2023 年 6 月首次发布，目前 npm 周下载量超过 1200 万，GitHub star 超过 24k。

![Vercel AI SDK 官网](https://assets.vercel.com/image/upload/v1718914025/front/ai-sdk/ai-sdk-og.png)

它解决的核心问题很实际：你想在 Web 应用里加 AI 功能，但每家 LLM 厂商的 API 格式不一样，流式输出的处理方式也不同。AI SDK 提供了一层统一抽象——写一次代码，切换 OpenAI、Anthropic、Google Gemini 只需改一行 import。

## 核心架构

AI SDK 分三层，各管一件事：

```
┌─────────────────────────────────┐
│  @ai-sdk/react / vue / svelte  │  ← UI 层：useChat、useCompletion 等 Hook
├─────────────────────────────────┤
│          ai (core)              │  ← 核心：streamText、generateText、tool、Agent
├─────────────────────────────────┤
│  @ai-sdk/openai / anthropic / google  │  ← Provider 层：各厂商适配器
└─────────────────────────────────┘
```

- **Core 层**处理文本生成、流式传输、结构化输出、Tool Calling
- **UI 层**给前端框架提供开箱即用的 Hook，自动管理消息状态和流式渲染
- **Provider 层**把各家 API 差异抹平，遵循统一的 Language Model Specification

## 和其他方案的对比

| 维度 | Vercel AI SDK | LangChain.js | OpenAI SDK |
|------|--------------|-------------|-----------|
| 定位 | Web AI 应用全栈工具链 | 后端 RAG / 复杂链式编排 | OpenAI 官方客户端 |
| 多 Provider | 25+ 厂商统一接口 | 有，但 API 更重 | 只支持 OpenAI |
| 前端 Hook | 原生支持 React/Vue/Svelte | 不提供 | 不提供 |
| 流式输出 | 一等公民，默认流式 | 需要额外配置 | 支持但需手动处理 |
| 包体积 (gzip) | 中等 | 101 KB（最重） | 34 KB（最轻） |
| Edge Runtime | 原生兼容 | 不兼容（依赖 Node fs） | 需要 edge 变体 |
| 学习曲线 | 低，API 简洁 | 高，概念多 | 低，但功能有限 |

我个人的看法：如果你在做面向用户的 Web AI 产品（聊天、写作助手、代码生成等），AI SDK 是目前最顺手的选择。LangChain 更适合后端复杂的 RAG pipeline。两者不冲突，很多团队前端用 AI SDK、后端用 LangChain。

## 为什么选它

1. **不绑平台**：Apache 2.0 开源，可以部署到 Vercel、Netlify、Railway、自建 Node.js 服务器，甚至 Cloudflare Workers
2. **TypeScript 原生**：类型推导到 tool 参数级别，IDE 自动补全体验很好
3. **SDK 6 加了 Agent**：内置 `ToolLoopAgent`，支持多步推理 + 工具调用循环，不用自己写 while loop
4. **社区活跃**：5000+ releases，Vercel 官方团队持续维护，PR 合并速度快

下一章我们直接上手：从 `npm install` 到跑起来一个流式聊天，15 分钟搞定。
