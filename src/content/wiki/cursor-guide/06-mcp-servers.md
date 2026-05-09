---
title: "Cursor MCP 集成实战"
wiki: "cursor-guide"
order: 6
description: "GitHub MCP / Notion MCP / Postgres MCP 配置详解，Agent Mode 中的真实使用场景，让 Cursor Agent 直接操作你的代码仓库、文档库和数据库"
---

MCP（Model Context Protocol）是 Anthropic 提出的一个开放协议，定义了 AI 如何与外部工具和数据源通信。Cursor 从 0.43 版本起内置 MCP 支持，现在你可以把 GitHub、Notion、Postgres 这些工具直接接进 Agent Mode，让 AI 不只是"建议"——而是真的帮你执行操作。

截至 2026 年初，社区已有超过 5000 个 MCP 服务端，覆盖数据库、文档、监控、支付等几乎所有常见工具。

![Cursor MCP 配置教程](https://img.youtube.com/vi/RkPU7eCG_FM/maxresdefault.jpg)

---

## MCP 是怎么工作的

每个 MCP 服务端对外暴露一批"工具"（tool），Agent 在对话时可以调用这些工具。比如：

- Postgres MCP 暴露 `query_database` 工具
- GitHub MCP 暴露 `create_issue`、`list_pull_requests`、`get_file_contents` 等工具
- Notion MCP 暴露 `search_pages`、`create_page`、`update_block` 等工具

Agent 接到你的指令后，会自动判断要调哪些工具，构造请求，拿到结果，继续推理——全程不需要你手动切 tab。

**注意**：MCP 工具只在 **Agent Mode** 下可用，普通 Ask / Chat 模式里不触发。

---

## 配置文件位置

Cursor 的 MCP 配置写在 JSON 文件里，有两个层级：

| 配置文件 | 作用范围 |
|---------|---------|
| `.cursor/mcp.json`（项目根目录） | 只对当前项目生效，可以提交进 git（注意不要 hardcode 密钥） |
| `~/.cursor/mcp.json`（用户主目录） | 全局生效，所有项目共用 |

基本格式：

```json
{
  "mcpServers": {
    "服务名": {
      "command": "运行命令",
      "args": ["参数列表"],
      "env": {
        "环境变量名": "值"
      }
    }
  }
}
```

密钥不要 hardcode，用 `${env:变量名}` 从系统环境变量读取：

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

配置完后，打开 **Cursor Settings → Tools & MCP**，能看到每个服务端的状态指示灯。绿色表示正常，红色说明启动失败——通常是命令不存在或 token 无效。

---

## GitHub MCP：让 Agent 直接操作仓库

### 安装配置

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

`GITHUB_TOKEN` 用 Personal Access Token（PAT）。权限按需给：

- 只读代码审查：勾选 `repo:read`
- 需要创建 Issue / PR：勾选 `repo`（读写）
- 不需要 Actions：不要勾 `workflow`

在终端里先 export：

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

或者加进 `~/.zshrc` / `~/.bashrc` 让每次启动自动生效。

### 实际场景

**场景 1：调查一个陌生仓库**

打开 Cursor，新建 Composer，输入：

```
用 github MCP 读一下 facebook/react 仓库最近 10 个 open PR，
找出哪些涉及 concurrent rendering，给我一个简短摘要
```

Agent 会调 `list_pull_requests` + `get_pull_request`，直接返回结果，不用你开浏览器。

**场景 2：修完 bug 顺手开 Issue**

你刚修了一个线上 bug，想把问题记录成 Issue 以便追踪：

```
在 my-org/my-repo 创建一个 Issue，标题是"Fix: 登录页 token 刷新竞态条件"，
描述用中文，把刚才我们对话里找到的根因和修复方案写进去
```

Agent 调 `create_issue`，自动填好 body——你不用离开 IDE。

**场景 3：Code Review 辅助**

```
读一下 my-org/my-repo 的 PR #142，找出潜在的安全问题
```

Agent 拉 PR diff，分析代码，直接给你 review 意见。

---

## Notion MCP：把文档接进工作流

Notion 官方在 2025 年发布了 `@notionhq/notion-mcp-server`，配置方式：

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer ${env:NOTION_TOKEN}\", \"Notion-Version\": \"2022-06-28\"}"
      }
    }
  }
}
```

`NOTION_TOKEN` 从 Notion 开发者页面创建 Integration 拿到（Internal Integration Token）。创建后在 Notion 页面右上角「连接」里授权给这个 Integration，它才能读写那个页面。

如果想用社区版（更轻量）：

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@suekou/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "${env:NOTION_TOKEN}"
      }
    }
  }
}
```

### 实际场景

**场景 1：读文档写代码**

团队把 API 设计文档放在 Notion：

```
读 Notion 页面「用户服务 API v2 设计」，
根据里面的接口定义帮我生成 TypeScript 类型声明
```

Agent 调 `retrieve_page`，拿到 Notion 内容，直接生成类型文件。

**场景 2：Bug 修完更新文档**

```
刚修了用户登录流程的一个 bug，找到 Notion 里「登录服务已知问题」这个页面，
把今天修的问题追加进去（日期 2026-05-10，问题描述：token 刷新竞态，修复方式：加锁）
```

Agent 调 `search`（找页面）→ `append_block_children`（追加内容），文档更新到位。

**场景 3：把 Sprint 任务转成代码骨架**

```
读 Notion 数据库「2026 Q2 Sprint」里本周分配给我的任务，
帮我在 src/features/ 下生成对应的文件骨架
```

---

## Postgres MCP：自然语言查数据库

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${env:DATABASE_URL}"
      }
    }
  }
}
```

`DATABASE_URL` 格式：`postgresql://user:password@host:5432/dbname`

生产数据库建一个**只读用户**专门给 MCP 用，不要用 owner 账号：

```sql
-- 创建只读角色
CREATE USER cursor_mcp WITH PASSWORD 'xxxxx';
GRANT CONNECT ON DATABASE myapp TO cursor_mcp;
GRANT USAGE ON SCHEMA public TO cursor_mcp;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cursor_mcp;
-- 对未来新建的表也生效
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cursor_mcp;
```

### 实际场景

**场景 1：调试时查线上数据**

你在排查一个用户反馈的订单问题：

```
在 postgres 里查一下 user_id = 12345 最近 7 天的订单记录，
看看 status 和 payment_status 有没有不一致的情况
```

Agent 调 `query`，直接出结果，不用开 Postico / DBeaver / psql。

**场景 2：理解陌生数据库**

接手老项目，不熟悉 schema：

```
列出 postgres 里所有表，重点说明 users、orders、payments 这三张表的字段和关联关系
```

Agent 调 `list_tables` + `describe_table`，3 秒给你一份关系图谱。

**场景 3：写迁移脚本**

```
users 表目前没有 email_verified 字段，
帮我写一个 migration SQL，加这个字段并把现有所有 is_active=true 的用户设为已验证
```

Agent 查了表结构再生成 SQL，不会出现字段名写错的低级错误。

---

## 多个 MCP 服务端同时配置

实际工作中往往会同时接多个服务端：

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@suekou/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "${env:NOTION_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${env:DATABASE_URL}"
      }
    }
  }
}
```

这份配置放在 `~/.cursor/mcp.json`（全局），所有项目共用，只在特定项目需要覆盖时才写 `.cursor/mcp.json`。

---

## 安全注意事项

**最小权限原则**：每个 MCP 服务端的凭证只给它真正需要的权限。GitHub token 只需要 read 就不要给 write。

**工具审批模式**：在 Cursor Settings → Agent 里可以开启"Ask before tool use"——每次 Agent 准备调用 MCP 工具时会先弹框让你确认，防止误操作。生产环境推荐打开。

**不要提交密钥**：`.cursor/mcp.json` 里用 `${env:VAR_NAME}` 引用环境变量，密钥通过 `.env.local` 或系统环境变量注入，`.env.local` 加进 `.gitignore`。

---

## 常见问题排查

**MCP 服务端显示红色 / 离线**

99% 是 `npx` 找不到包或者 node 版本不对。先手动跑一下：

```bash
npx -y @modelcontextprotocol/server-github
```

看报什么错。常见原因：npm registry 超时（换源），node < 18（升级）。

**Agent 说"我没有那个工具"**

确认你在 Agent Mode（不是 Ask 模式）。然后看 Cursor Settings → Tools & MCP 里那个服务端是不是绿色在线。

**Postgres 连接超时**

检查 `DATABASE_URL` 里的 host 是否可从本机直接连（生产 RDS 一般要配 VPN 或 bastion）。本地开发用 `localhost` 就行。

---

## 下一步扩展

接完这三个之后，工程师们常见的进阶配置：

- **Playwright MCP**：让 Agent 直接操控浏览器，做 E2E 测试、爬数据、自动填表单
- **Slack MCP**：在 Cursor 里直接查频道消息、发通知
- **Stripe MCP**：Agent 查订阅状态、退款记录，不用开 Dashboard
- **File System MCP**：Agent 在本机指定目录里读写文件，适合批量处理脚本

MCP 目录站 [cursor.directory](https://cursor.directory/plugins) 能搜到大部分社区维护的服务端，按需安装。
