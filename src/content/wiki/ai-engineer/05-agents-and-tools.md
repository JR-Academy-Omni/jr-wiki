---
title: "Agent + Tool Use：让 LLM 不只回答，而是去执行"
wiki: "ai-engineer"
order: 5
description: "Function calling / Tool use / ReAct / Multi-agent / MCP — 从单步工具到多 Agent 协作的完整地图"
---

## 从"回答"到"执行"

前 4 章的 LLM 都只在"出文字"。但生产里 70% 的 AI 产品最终要让模型**去做事**：查数据库、调 API、发邮件、改文件、操作浏览器。

这一章讲 Agent + Tool Use 的完整体系。

## Tool Use / Function Calling 是什么

LLM 不能直接写 SQL 查数据库（也不该）。但它可以**告诉你它想查什么**，你执行后把结果返回，它再继续生成。这个机制叫 **Tool Use**（Anthropic 叫法）或 **Function Calling**（OpenAI 叫法）。

### 一次 tool call 的完整流程

```
User: "我们公司 2025 年总营收多少？"
              │
              ▼
LLM 看完 question + 看你给它的 tool 列表，决定调用：
  query_database(sql="SELECT SUM(amount) FROM orders WHERE year=2025")
              │
              ▼
你的代码执行 SQL，拿到 result = 1250000
              │
              ▼
你把 result 塞回 LLM 作为 tool_result
              │
              ▼
LLM: "公司 2025 年总营收是 $1,250,000"
```

LLM **不直接执行 SQL**，它只生成"想调用 X 工具+这些参数"的指令。执行权在你手里——这是安全边界。

### 代码示范（Anthropic SDK）

```typescript
const tools: Anthropic.Tool[] = [{
  name: 'query_database',
  description: '执行 SQL 查询订单数据库。只允许 SELECT。',
  input_schema: {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'A SELECT-only SQL query' }
    },
    required: ['sql']
  }
}];

let response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  tools,
  messages: [{ role: 'user', content: '我们 2025 年总营收？' }]
});

// 模型决定调工具
if (response.stop_reason === 'tool_use') {
  const toolBlock = response.content.find(b => b.type === 'tool_use');
  const sql = toolBlock.input.sql;
  
  // 你的代码执行（注意做安全检查）
  const result = await db.query(sql);
  
  // 把结果塞回模型继续
  const finalResp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools,
    messages: [
      { role: 'user', content: '我们 2025 年总营收？' },
      { role: 'assistant', content: response.content },
      { role: 'user', content: [{
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result)
      }]}
    ]
  });
  
  console.log(finalResp.content[0].text);
}
```

⚠️ 核心安全教训：**永远在执行 tool 前做白名单 + 参数验证**。模型可能被 prompt injection 诱导生成恶意 SQL（`DROP TABLE users`）。生产代码必须：

1. 工具列表写死，不要让用户动态注入
2. SQL 工具改成"调用预定义存储过程"，不是任意 SELECT
3. 高风险动作（删数据、转账、发邮件）必须 human-in-the-loop 确认

## Single-step vs Multi-step Agent

### Single-step（一来一回）

上面例子就是 single-step：模型决定调一个工具 → 执行 → 拿结果 → 给最终答。简单，可控，**90% 业务场景够用**。

### Multi-step（Agent loop）

模型可能调 5 个工具才能回答一个问题。比如：

```
User: "下周一的 AI 会议室还能定吗？要 10 人会议室"

Agent loop:
  1. call check_calendar_availability(date='2026-05-17')
     → 返回 5 个空闲时段
  2. call list_meeting_rooms(capacity_min=10)
     → 返回 3 个 10 人 + 房间
  3. call cross_check(timeslots, rooms)
     → 返回 "Room A 14:00-15:00 可定"
  4. call book_room(room='A', start='2026-05-17 14:00', end='15:00')
     → 返回 booking_id=xyz
  5. 生成最终回复："已预定 Room A 14:00-15:00，编号 xyz"
```

5 次 tool call 在一个对话 session 里完成，叫 **agent loop**。代码层面就是 while loop，直到 `stop_reason !== 'tool_use'`。

```typescript
async function runAgent(query: string) {
  const messages = [{ role: 'user', content: query }];
  let response = await client.messages.create({ /* ... */, tools, messages });
  
  while (response.stop_reason === 'tool_use') {
    messages.push({ role: 'assistant', content: response.content });
    
    const toolBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = await Promise.all(toolBlocks.map(async (tb) => {
      const result = await executeTools(tb.name, tb.input); // 你的执行函数
      return { type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) };
    }));
    
    messages.push({ role: 'user', content: toolResults });
    response = await client.messages.create({ /* ... */, tools, messages });
  }
  
  return response.content[0].text;
}
```

## ReAct Pattern：Agent 的祖师爷

ReAct (Reasoning + Acting) 是 2022 年 Google 论文提出的 agent 框架，现在被几乎所有 agent 库借鉴。

核心思想：让模型每步都先**思考 (Thought)**，再**行动 (Action)**，再**观察结果 (Observation)**：

```
Thought: 我需要先查空闲时段
Action: check_calendar_availability(date='2026-05-17')
Observation: 5 个时段...

Thought: 我现在需要找 10 人会议室
Action: list_meeting_rooms(capacity_min=10)
Observation: 3 个房间...

Thought: 现在 cross-check
...
```

2026 年的 reasoning models（GPT-5 reasoning mode、Claude with extended thinking）内部已经在做这个，你不用手写 ReAct prompt。但**理解这个 pattern 让你能 debug agent**：当 agent 卡住时，让它输出 thought trace 你能看到它"哪里想错了"。

## 多 Agent 协作

单个 agent 处理跨领域复杂任务效果差。把任务拆给**多个专业 agent** 协作效果显著好。

### 场景例子

匠人内部一个产品文档生成 agent：

```
                    ┌──────────────┐
                    │ Coordinator  │
                    │   Agent      │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ Research │      │ Writer   │      │ Reviewer │
  │ Agent    │      │ Agent    │      │ Agent    │
  └──────────┘      └──────────┘      └──────────┘
   找资料           写初稿            审 + 改
```

- **Coordinator** 拆任务，分配给下游
- **Research** 搜资料 + 调 RAG
- **Writer** 用资料写初稿
- **Reviewer** 检查事实 + 改格式

每个 agent 用最适合的模型——Research 用 Haiku（便宜快），Writer 用 Sonnet（质量），Reviewer 用 Opus（严格）。**总成本 < 让 Opus 一个人干**，质量 ≥。

### 多 Agent 框架

| 框架 | 主打 | 何时用 |
|------|------|--------|
| **LangGraph** | 状态机式、可视化 | 复杂流程、需要 checkpoint |
| **CrewAI** | role-based、最易上手 | role 分工明确、demo 多 |
| **AutoGen (Microsoft)** | conversation-based | 多 agent 互相讨论 |
| **OpenAI Swarm** | 极简、官方出 | OpenAI 生态 |

**新手起步推荐 CrewAI**：上手最快，代码最清。匠人 [Vibe Coding Lab](https://jiangren.com.au/learn/vibe-coding-lab) 有 CrewAI 实战教程。

```python
from crewai import Agent, Task, Crew

researcher = Agent(role="researcher", goal="...", llm="gpt-5-mini")
writer = Agent(role="writer", goal="...", llm="claude-sonnet-4-6")

research_task = Task(description="...", agent=researcher)
write_task = Task(description="...", agent=writer)

crew = Crew(agents=[researcher, writer], tasks=[research_task, write_task])
result = crew.kickoff()
```

## MCP (Model Context Protocol)

Anthropic 2024 年底推的协议，2025 年成为事实标准。**让 tool 的定义和实现解耦**——以前每个 client（Claude Desktop / Cursor / 自己应用）都要重写一遍 tool 适配，MCP 让 server 写一次，所有兼容 client 都能用。

### MCP 架构

```
┌──────────────┐         MCP protocol          ┌──────────────┐
│ MCP Client   │ ◀──────────────────────▶      │ MCP Server   │
│ (Claude /    │   list_tools / call_tool       │ (你写的)     │
│  Cursor / 你)│                                │              │
└──────────────┘                                └──────┬───────┘
                                                       │
                                                       ▼
                                                  Database / API /
                                                  Filesystem / etc.
```

### 简单例子（Python MCP server）

```python
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("my-tools")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [Tool(
        name="get_weather",
        description="Get current weather for a city",
        inputSchema={
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"]
        }
    )]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_weather":
        # 真实实现
        weather = await fetch_weather(arguments["city"])
        return [TextContent(type="text", text=str(weather))]
```

写完后 Claude Desktop / Cursor / 任何 MCP 兼容 client 通过配置文件就能用上你的 tool，不需要改 client 代码。

### 现成 MCP servers（直接用，不用自己写）

- **filesystem** - 文件读写
- **postgres** - SQL 查询  
- **github** - issue / PR / commit
- **slack** - 发消息 / 查频道
- **playwright** - 浏览器自动化
- **fetch** - HTTP 请求

匠人内部 Claude Code 工作流就大量用 MCP——`/Users/lightman/.claude/...` 已经接了 chrome-devtools / context7 / Notion / Canva / Gmail / fs / playwright 等十几个 server。

## 生产 Agent 必须解决的 5 个问题

### ① Loop 长度限制

Agent 可能无限循环（卡在 thought-action-observation 出不来）。必须设最大步数：

```typescript
const MAX_STEPS = 10;
let step = 0;
while (response.stop_reason === 'tool_use' && step < MAX_STEPS) {
  // ...
  step++;
}
if (step === MAX_STEPS) throw new Error('Agent exceeded max steps');
```

### ② Token 爆炸

每步把上一步 result 塞回 history，几步下来 history 上万 token。要么截断 history，要么把老结果 summarize。

### ③ 错误处理

工具调用失败了怎么办？两个选项：

- **告诉模型让它重试或换工具**：把错误信息塞回 tool_result，模型自己决定
- **直接 fail fast**：抛错给用户

90% 场景选第一个，但要限制重试次数防止死循环。

### ④ Human-in-the-loop

高风险动作（转账、删数据、发邮件给客户）必须人工确认：

```typescript
if (toolName === 'send_email_to_customer') {
  // 不直接执行，写到任务队列等人工审批
  await taskQueue.create({
    type: 'pending_approval',
    tool: toolName,
    args: toolInput,
    user_id: ctx.userId
  });
  return { status: 'pending_human_approval' };
}
```

### ⑤ Observability

每次 tool call 必须打日志，**至少包括**：query / tool_name / tool_args / tool_result / step_index / latency / cost。出问题时能 trace 到底哪步走偏。

第 7 章有完整 observability 方案。

## 本章小结

- Tool Use 是 LLM 从"回答"升级到"执行"的桥梁，安全边界在你的执行代码
- Single-step 90% 场景够用，复杂任务上 multi-step agent loop
- 多 agent 协作可以混用模型档次省钱 + 质量同时优化
- MCP 是 2025 年事实标准，能用 MCP server 别自己造轮子
- 生产 agent 必须解决：步数上限 / token 控制 / 错误处理 / human-in-the-loop / observability

下一章讲 fine-tuning vs RAG 决策 + eval 体系——**怎么知道你的 AI 产品到底好不好**。
