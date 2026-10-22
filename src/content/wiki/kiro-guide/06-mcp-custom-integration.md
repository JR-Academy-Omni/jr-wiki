---
title: "MCP 深度配置：项目级 vs 用户级，远程服务器与自定义集成"
wiki: "kiro-guide"
order: 6
description: "完整的 MCP 配置指南：mcp.json 格式、项目级与用户级分层、远程 MCP（Kiro 0.5+）、环境变量注入、常见报错排查"
---

## MCP 的两层配置体系

第三章介绍了 Powers——MCP + Steering + Hooks 的打包组合。但如果你需要接入一个还没有 Power 的内部工具，或者需要精细控制 MCP 的权限和范围，就得直接写配置文件。

Kiro 把 MCP 配置分成两层：

| 层级 | 存放位置 | 适用场景 |
|------|---------|---------|
| **项目级**（workspace） | `.kiro/settings/mcp.json` | 项目专属工具、数据库连接、团队共享配置（提交到 Git） |
| **用户级**（user） | 全局用户目录 | 通用工具（GitHub、Slack、浏览器自动化）跨项目复用 |

打开方式：Command Palette → `Kiro: Open workspace MCP config (JSON)` 或 `Kiro: Open user MCP config (JSON)`。

保存后服务器自动重连，无需重启 IDE。

---

## mcp.json 基础格式

```json
{
  "mcpServers": {
    "my-tool": {
      "command": "npx",
      "args": ["-y", "@my-org/my-mcp-server"],
      "disabled": false
    },
    "db-query": {
      "command": "uvx",
      "args": ["db-query-mcp"],
      "env": {
        "DATABASE_URL": "${DB_URL}"
      },
      "disabled": false
    }
  }
}
```

关键字段：

- `command`：可执行文件，`npx` 跑 npm 包，`uvx` 跑 Python 包，`docker` 跑容器
- `args`：命令参数数组
- `env`：注入环境变量，支持 `${VAR_NAME}` 引用 shell 环境变量
- `disabled`：`true` 暂时禁用但保留配置

---

## 实战示例 1：接入 GitHub MCP

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

配置后 Kiro 可以直接在对话里操作 GitHub：

```
创建一个 issue 描述 auth 模块的 bug，
标签加 bug 和 priority:high，分配给 @alice
```

不用切到浏览器，Kiro 调 GitHub MCP 直接搞定。

---

## 实战示例 2：Postgres 数据库查询

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"]
    }
  }
}
```

这个放项目级配置（`.kiro/settings/mcp.json`），每个项目连自己的数据库。敏感的 `DATABASE_URL` 通过环境变量传入，**不要硬写进 JSON 文件再提交到 Git**。

---

## 远程 MCP（Kiro 0.5+ Streamable HTTP）

Kiro 0.5 起支持远程 MCP，不需要在本地装任何东西：

```json
{
  "mcpServers": {
    "remote-analytics": {
      "transport": "streamable-http",
      "url": "https://mcp.your-company.com/analytics",
      "headers": {
        "Authorization": "Bearer ${ANALYTICS_API_KEY}"
      }
    }
  }
}
```

远程 MCP 的典型用途：
- 公司内部 API（不方便装本地包）
- SaaS 工具的官方 MCP 端点（Stripe、Twilio 等）
- 多人共享同一个工具实例（避免每人本地配置）

---

## Agent 级配置：限定 MCP 范围

如果你创建了自定义 Agent（比如一个专门做代码审查的 Agent），可以在 Agent 配置文件里指定它只用特定的 MCP：

```yaml
# .kiro/agents/code-reviewer.yaml
name: Code Reviewer
mcpServers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
includeMcpJson: false   # 不继承 workspace/user 级配置，只用上面定义的
```

`includeMcpJson: false` 是隔离原则——该 Agent 只能访问你明确授权的工具，防止"权限蔓延"。

---

## 常见报错排查

### 服务器一直显示"连接中"

99% 是 JSON 格式错误。保存前用 `JSON.parse` 或在线工具验证一遍。

### JSON Schema 兼容报错

Kiro MCP 不支持 `oneOf` / `anyOf` / `allOf` 复合 schema。如果你写了自定义 MCP Server，把工具的参数 schema 改成简单的 `type: object` 平铺结构：

```typescript
// ❌ Kiro 不兼容
inputSchema: {
  oneOf: [
    { type: 'string' },
    { type: 'number' }
  ]
}

// ✅ 改成这样
inputSchema: {
  type: 'object',
  properties: {
    value: { type: 'string', description: '传字符串或数字的字符串形式' }
  },
  required: ['value']
}
```

### 环境变量没生效

确保 `${VAR_NAME}` 里的变量在启动 Kiro 之前已经 `export`。Kiro 读取的是 IDE 启动时的 shell 环境，而不是 `.env` 文件（`.env` 文件需要手动 `source`，或者用 `.kiro/settings/` 里的环境变量配置）。

---

## 选型建议

| 需求 | 推荐方式 |
|------|---------|
| 快速接入有官方 Power 的工具（Supabase、Stripe 等） | `@powers install` 直接装 |
| 公司内部工具 / 没有 Power | 手写 `mcp.json` |
| 多项目复用的通用工具（GitHub、Jira） | 用户级配置 |
| 项目专属数据库连接 | 项目级配置，`.gitignore` 掉含密钥的部分 |
| 企业统一管控 MCP 白名单 | 管理员配置 Registry allow-list |

下一章讲如何通过 Steering 规则和 Spec 文件实现**团队协作**——让整个团队用同一套编码规范和设计决策，不依赖口耳相传。
