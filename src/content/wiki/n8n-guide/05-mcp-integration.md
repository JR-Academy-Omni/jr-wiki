---
title: "n8n MCP 实战：让 Claude / Cursor 直接调用你的工作流"
wiki: "n8n-guide"
order: 5
description: "n8n 双向 MCP 集成：把工作流暴露成 MCP 工具给 AI 调用，同时在工作流内用 MCP Client 接入外部 AI 服务——完整配置 + 生产踩坑"
---

n8n 在 MCP（Model Context Protocol）上同时支持两个方向：

- **MCP 服务端**：用 MCP Server Trigger 节点把你的 n8n 工作流暴露成工具，让 Claude Desktop、Claude Code、Cursor 直接调用
- **MCP 客户端**：在 AI Agent 里挂 MCP Client Tool 节点，连接外部 MCP 服务器（GitHub、Slack、数据库等）获取更多工具能力

这两个方向可以同时启用——你的 n8n 变成了一个 AI 工具集线器。

---

## 方向一：把 n8n 工作流变成 Claude 的工具

### 核心概念

**MCP Server Trigger** 是 n8n 的特殊触发节点，它不等 HTTP 请求或定时器，而是暴露一个持久连接端点（SSE 或 Streamable HTTP），让 MCP 客户端连进来，列出可用工具并主动调用。

每个挂在 MCP Server Trigger 后面的节点就是一个"工具"——Claude 能看到工具名、描述、参数，然后自主决定什么时候调用。

### Step 1：在 n8n 里建 MCP Server 工作流

**基本结构**：

```
MCP Server Trigger
    ├── [Tool 1] Custom n8n Workflow Tool（调用另一个工作流）
    ├── [Tool 2] HTTP Request Tool（直接调外部 API）
    └── [Tool 3] Code Tool（自定义逻辑）
```

新建工作流，搜索节点 **"MCP Server Trigger"**（在 Core Nodes → Trigger 下）：

```
节点配置：
  Authentication: Bearer Token
  （系统自动生成 token，记下来）
```

激活工作流后，节点面板会显示两个 URL：
- **Test URL**：工作流未激活时也可用，开发调试用
- **Production URL**：格式 `https://你的域名/mcp/工作流ID`，必须激活工作流才生效

> Cloud 用户的 Production URL 格式：`https://<子域名>.app.n8n.cloud/mcp/<uuid>`

### Step 2：给工作流挂工具

以"查询课程信息"为例：

**方案 A — Custom n8n Workflow Tool**（推荐，可复用已有工作流）：

```
Tool Name: get_course_info
Description: 查询 JR Academy 课程详情、开课时间和价格。
             当用户问课程相关问题时调用。
             参数：course_name（课程名称，如 Full Stack / Data Analytics）
Workflow: 选择已有的「课程查询 workflow」
```

**方案 B — Code Tool**（快速原型）：

```javascript
// Tool Name: list_available_courses
// Description: 列出所有可用课程名称和简介
const courses = [
  { name: "Full Stack", duration: "6个月", mode: "兼职" },
  { name: "Data Analytics", duration: "4个月", mode: "兼职" },
  { name: "AI Engineering", duration: "5个月", mode: "兼职" }
];
return courses;
```

**关键：工具描述写好了，Claude 才会用对工具**。描述要说清楚"什么情况下调用"和"参数含义"，不然 AI 要么不调、要么传错参数。

### Step 3：在 Claude Desktop 里连接

编辑 Claude Desktop 配置文件（Mac：`~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "n8n-workflows": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "https://你的n8n域名/mcp/你的工作流ID",
        "--header",
        "Authorization: Bearer 你的bearer-token"
      ]
    }
  }
}
```

> `supergateway` 是一个轻量代理，把 n8n 的 SSE 流转成 Claude Desktop 期望的 stdio 接口。

重启 Claude Desktop，在对话里输入"你有哪些工具？"——Claude 会列出所有从 n8n 暴露的工具。

### Step 4：在 Claude Code 里连接

Claude Code 使用项目级 `.claude/settings.json` 或全局 `~/.claude/settings.json`：

```json
{
  "mcpServers": {
    "n8n": {
      "type": "sse",
      "url": "https://你的n8n域名/mcp/你的工作流ID",
      "headers": {
        "Authorization": "Bearer 你的bearer-token"
      }
    }
  }
}
```

配置好后，在 Claude Code 会话里可以直接调用 n8n 工作流——比如让 Claude Code 把代码部署结果推送到 Slack、或查询线上数据库做调试分析，全部通过自然语言触发。

---

## 方向二：在 n8n 工作流内调外部 MCP 服务器

除了对外暴露工具，n8n AI Agent 自身也能作为 MCP 客户端，调用外部 MCP 服务器的工具。

### 配置 MCP Client Tool 节点

在 AI Agent 的 Tool 插槽点击 `+`，选 **"MCP Client Tool"**：

```
Transport: SSE（或 Streamable HTTP）
URL: https://mcp服务器地址/sse
Headers: Authorization: Bearer <token>（如果需要认证）
```

连好后，AI Agent 会自动发现该 MCP 服务器提供的所有工具，无需手动配置每个工具——工具列表由 MCP 服务器动态返回。

**实际场景**：让 n8n AI Agent 访问 GitHub MCP、Slack MCP、Notion MCP，实现跨平台的 AI 自动化，而不需要在 n8n 里配置每个平台的 Credential。

---

## 生产部署注意：Nginx 的 SSE 缓冲问题

MCP 协议基于 SSE（Server-Sent Events），SSE 是长连接，数据边产生边推送。Nginx 默认会把响应体缓冲到内存再一起发，这会导致 Claude 收不到流式数据，连接卡死。

**必须在 Nginx 里对 `/mcp/` 路径关闭缓冲**：

```nginx
location /mcp/ {
    proxy_pass http://127.0.0.1:5678;
    proxy_http_version 1.1;
    proxy_set_header Connection "";     # Keep-Alive，不升级到 WebSocket
    
    # 关键：关闭缓冲
    proxy_buffering off;
    proxy_cache off;
    
    # 关闭 gzip 压缩（压缩也会缓冲）
    gzip off;
    
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 3600s;           # SSE 长连接，超时设长
}
```

Cloudflare Tunnel 用户：在 Cloudflare 后台对 `/mcp/*` 路径开启 **Disable Response Buffering** 规则。

---

## 一个完整的实战例子

假设你是运营，想让 Claude 直接帮你管理内容发布：

**n8n MCP Server 暴露 3 个工具**：

```
Tool 1: check_pending_content
  描述：列出所有草稿状态的内容，包含标题、作者、创建时间
  实现：HTTP Request → 内容管理 API

Tool 2: publish_content
  描述：把指定内容从草稿发布到线上。需要 content_id 参数。
  实现：HTTP Request Tool（启用 Human Approval——发布前让人确认）

Tool 3: get_publish_stats
  描述：获取最近7天的发布数量、阅读量、互动数据
  实现：Code Tool（从数据库查询并格式化）
```

配好后，在 Claude Desktop 里说：

> "帮我看看有哪些内容等待发布，把阅读量预期最高的两篇发出去。"

Claude 会先调 `check_pending_content` 看列表，分析后调 `publish_content`（触发人工审批），等你确认后执行，最后用 `get_publish_stats` 确认发布成功。

整个过程不需要打开 n8n 界面，也不需要登录内容管理后台。

---

## 两个方向的对比

| | n8n 作 MCP 服务端 | n8n 作 MCP 客户端 |
|---|---|---|
| **目的** | 让 Claude / Cursor 调用 n8n 工作流 | 让 n8n Agent 使用外部 MCP 工具 |
| **关键节点** | MCP Server Trigger | MCP Client Tool |
| **适合场景** | 运营工具化、AI 操控业务流程 | Agent 需要跨平台工具集成 |
| **认证方式** | Bearer Token（n8n 生成） | 按各 MCP 服务器要求 |
