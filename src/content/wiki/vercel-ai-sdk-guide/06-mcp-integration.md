---
title: "MCP 服务器集成：让 AI 连接任意外部工具"
wiki: "vercel-ai-sdk-guide"
order: 6
description: "用 Vercel AI SDK 的 @ai-sdk/mcp 接入 Model Context Protocol 服务器，实现工具自动发现、类型安全调用、多服务器 Agent 编排"
---

## 什么是 MCP，为什么你需要它

Model Context Protocol（MCP）是 Anthropic 在 2024 年底发布的开放标准，定义了 AI 模型和外部工具/数据源之间的通信协议。简单说：你把任意服务包装成一个 MCP Server，AI SDK 就能自动发现并调用里面的工具，不需要你手写每个 `tool()` 定义。

MCP 生态现在已经很大：文件系统、GitHub、数据库、Slack、Notion、浏览器自动化……有数百个现成的 MCP Server 可以直接用。

AI SDK 6 通过 `@ai-sdk/mcp` 包提供了完整的 MCP 客户端支持（稳定版，非 experimental）。

## 安装

```bash
npm install @ai-sdk/mcp
```

## 连接 MCP 服务器

MCP 支持三种传输方式，根据场景选：

### HTTP（生产环境首选）

```typescript
import { createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://your-mcp-server.com/mcp',
    headers: {
      Authorization: 'Bearer your-api-key',
    },
  },
});
```

HTTP 使用 Streamable HTTP 协议（2025-03-26 版起 SSE 已废弃），支持 OAuth 认证。

### Stdio（本地 MCP Server，开发调试用）

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const mcpClient = await createMCPClient({
  transport: new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  }),
});
```

这个例子启动了官方的文件系统 MCP Server，允许 AI 读写 `/tmp` 目录下的文件。

## 获取工具：两种模式

### 自动发现（快速上手）

```typescript
// 自动列出服务器所有工具，无需手写 schema
const tools = await mcpClient.tools();

const { text } = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: '列出 /tmp 目录下的文件',
  maxSteps: 3,
});
```

自动发现没有 TypeScript 类型推导，工具参数是 `Record<string, unknown>`。

### 类型安全定义（推荐生产使用）

```typescript
import { z } from 'zod';

const tools = await mcpClient.tools({
  schemas: {
    'read_file': {
      inputSchema: z.object({
        path: z.string().describe('文件路径'),
      }),
    },
    'write_file': {
      inputSchema: z.object({
        path: z.string().describe('目标文件路径'),
        content: z.string().describe('文件内容'),
      }),
    },
    'list_directory': {
      inputSchema: z.object({
        path: z.string().describe('目录路径'),
      }),
    },
  },
});
```

这样工具参数有完整的 TypeScript 类型，IDE 能自动补全，也能混入你自己定义的 `tool()`。

## 实战案例：GitHub + 文件系统双 MCP Agent

一个 Agent 同时接入两个 MCP Server，可以查 GitHub PR 然后把摘要写到本地文件：

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function prSummaryAgent(prUrl: string, outputPath: string) {
  const githubClient = await createMCPClient({
    transport: new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN! },
    }),
  });

  const fsClient = await createMCPClient({
    transport: new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', './output'],
    }),
  });

  try {
    const githubTools = await githubClient.tools();
    const fsTools = await fsClient.tools();

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      tools: { ...githubTools, ...fsTools },
      maxSteps: 10,
      prompt: `
        1. 读取 PR ${prUrl} 的详情（标题、描述、改动的文件）
        2. 用中文写一份 300 字的 PR 摘要，重点说明改动目的和影响
        3. 把摘要写入 ${outputPath}
      `,
    });

    return text;
  } finally {
    await Promise.all([githubClient.close(), fsClient.close()]);
  }
}
```

关键点：多个 MCP 客户端的 tools 用展开运算符合并，传给同一个 `generateText`。Agent 会自己判断该调哪个 server 的工具。

## 读取 MCP 资源

MCP 不只有 tools，还有 resources——服务器暴露的数据（文件内容、数据库记录、API 响应等）：

```typescript
// 列出可用资源
const resources = await mcpClient.listResources();
console.log(resources.resources.map(r => r.uri));
// ["file:///tmp/config.json", "file:///tmp/data.csv", ...]

// 读取具体资源
const resource = await mcpClient.readResource({
  uri: 'file:///tmp/config.json',
});
console.log(resource.contents[0].text); // JSON 配置内容
```

## 生命周期管理

MCP 客户端是有状态的连接，用完必须关闭：

```typescript
// streamText：在 onEnd 回调里关
const result = streamText({
  model: openai('gpt-4o'),
  tools,
  prompt: '...',
  onEnd: async () => {
    await mcpClient.close();
  },
});

// generateText：用 try/finally 保证关闭
let client: Awaited<ReturnType<typeof createMCPClient>> | undefined;
try {
  client = await createMCPClient({ /* ... */ });
  const tools = await client.tools();
  const result = await generateText({ model, tools, prompt });
  return result.text;
} finally {
  await client?.close();
}
```

忘关会导致进程挂起（特别是 stdio 模式，子进程不会自动退出）。

## 常见 MCP Server 推荐

| MCP Server | 能力 | 安装 |
|-----------|------|------|
| `@modelcontextprotocol/server-filesystem` | 本地文件读写 | `npx -y` 即可 |
| `@modelcontextprotocol/server-github` | PR/Issue/代码查询 | 需要 GitHub Token |
| `@modelcontextprotocol/server-postgres` | PostgreSQL 查询 | 需要连接字符串 |
| `@modelcontextprotocol/server-puppeteer` | 浏览器自动化 | 需要本地 Chrome |
| `@openai/mcp-server-openai` | OpenAI API 工具 | 需要 OpenAI Key |

完整列表见 [MCP 官方 Server 目录](https://github.com/modelcontextprotocol/servers)。

下一章讲测试和可观测性：怎么给 AI 功能写可靠的单元测试，怎么在生产环境监控每次模型调用。
