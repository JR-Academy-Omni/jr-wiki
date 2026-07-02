---
title: "自定义 Agent 与 Agent Focus：IDE 1.0 并行开发新范式"
wiki: "kiro-guide"
order: 6
description: "IDE 1.0 核心升级：自定义专项 Agent、Agent Focus 并行会话、能力权限系统、配置热更新"
---

## Kiro IDE 1.0 做了什么

Kiro 从单一 AI 编程助手进化成了可编排的多 Agent 工作台。IDE 1.0 带来三项改变工作方式的新特性：

- **自定义专项 Agent**：针对不同任务写不同 Agent，代码安全审查、测试生成、文档更新各司其职
- **Agent Focus 并行模式**：同时开多个独立 Agent 会话，A 在重构后端、B 在写测试、C 在更新 README，互不干扰
- **能力权限系统（Capability-based Permissions）**：明确声明每个 Agent 能读哪些文件、能跑哪些命令，防止 Agent 越权操作

---

## 自定义专项 Agent

### 为什么需要自定义 Agent

默认的 Kiro Agent 是全能型的——什么都会做，但没有专项记忆。每次问安全问题都要重新解释上下文，每次写测试都要重新说明规范。**自定义 Agent 把这些上下文固化进去**，团队里所有人都共享同一套"记忆"。

### 创建自定义 Agent

在 `.kiro/agents/` 目录下创建 Markdown 文件，文件名即 Agent 名：

```markdown
<!-- .kiro/agents/security-reviewer.md -->
---
name: "security-reviewer"
description: "代码安全审查专项 Agent，检查 OWASP Top 10 漏洞"
tools: [read, web]
---

你是一个专注于 Web 应用安全的 AI 审查员。每次对话：

1. 用 read 工具读取指定的代码文件
2. 检查以下安全漏洞（按优先级排序）：
   - SQL 注入（参数化查询？ORM 是否正确使用？）
   - XSS（输出是否转义？CSP 头是否配置？）
   - 不安全的依赖（package.json 里有没有已知 CVE 的包？）
   - 敏感信息硬编码（API key、数据库密码、私钥）
   - 越权访问（接口是否验证了用户权限？）
3. 对每个问题给出：风险等级（高/中/低）+ 具体代码行 + 修复方案

**你不修改任何文件**，只提供分析报告。如果需要查 CVE 数据库，用 web 工具。
```

四种 tool 标签：
| 标签 | 权限 |
|------|------|
| `read` | 读取项目文件 |
| `write` | 创建和修改文件 |
| `shell` | 执行终端命令 |
| `web` | 访问外部网页和 API |

保存文件后，Agent 立刻出现在聊天面板的 Agent 选择器里，无需重启 Kiro。

### 实战：三个高频自定义 Agent

**测试生成 Agent**（只需要读写，不需要网络）：

```markdown
<!-- .kiro/agents/test-writer.md -->
---
name: "test-writer"
description: "为新函数自动生成 Jest 单元测试"
tools: [read, write]
---

你是测试专家。收到函数路径后：
1. 读取源文件，理解函数签名和行为
2. 识别所有边界情况（空值、极大值、错误路径）
3. 在对应的 __tests__ 目录生成测试文件，覆盖率目标 80%+
4. 测试命名格式：describe('[函数名]') > it('应该[预期行为]')

测试框架：Jest + TypeScript。不要使用 any 类型。
```

**文档同步 Agent**（读写权限，保持 README 和代码同步）：

```markdown
<!-- .kiro/agents/doc-sync.md -->
---
name: "doc-sync"
description: "根据最新代码更新 README 和 API 文档"
tools: [read, write]
---

你负责保持文档和代码同步。每次调用时：
1. 读取 src/ 目录下最近修改的文件（从 git diff 上下文获取）
2. 对比 README.md 的功能列表和实际代码
3. 更新过时的描述、添加新功能说明、删除已移除的功能
4. 保持文档的中文风格一致，技术术语保留英文
```

**通过版本控制共享**：把 `.kiro/agents/` 目录提交到 Git，团队所有成员自动获得同一套专项 Agent。这是 Kiro 团队协作的核心机制之一。

---

## Agent Focus 并行模式

### 传统单会话的瓶颈

之前用 Kiro 做大型功能时，会有一个隐性瓶颈：一个 Agent 会话同时只能干一件事。你在等它重构 `AuthService` 时，测试文件、README、API 文档全在等着。

Agent Focus 解决的就是这个问题。

### 如何打开 Agent Focus

点击 Kiro 窗口右上角的 **"Agent Focus"** 按钮。切回普通 IDE 模式就点同一位置的 **"IDE"** 按钮——两种模式间随时切换，不会丢失进度。

```
┌──────────────────────────────────────────┐
│  Kiro IDE                    [Agent Focus]│  ← 点击切换
├──────────────────────────────────────────┤
│                                          │
│  Agent Focus 视图                         │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │Session A │  │Session B │  │Session C││
│  │重构后端  │  │写单元测试│  │更新文档 ││
│  │进行中... │  │等待中... │  │完成 ✓  ││
│  └──────────┘  └──────────┘  └─────────┘│
└──────────────────────────────────────────┘
```

### 并行会话的实战用法

**场景：交付一个新功能**

不用 Agent Focus 的串行方式：
1. 让 Agent 实现功能 → 等 3 分钟
2. 让 Agent 写测试 → 等 2 分钟
3. 让 Agent 更新文档 → 等 1 分钟
4. 合计：6 分钟+，期间你只能等

用 Agent Focus 的并行方式：
- Session A（用 `test-writer`）：写测试，基于已有的 spec tasks.md 预判代码结构
- Session B（用 `doc-sync`）：更新文档
- Session C（主 Agent）：实现功能
- 合计：约 3 分钟，节省一半时间

> **注意**：Agent Focus 在 IDE 1.0 仍是实验性（experimental）功能，多个会话同时写同一文件时需要手动解冲突。建议给每个会话划分不同的文件范围。

---

## 能力权限系统

IDE 1.0 引入了精细化的权限模型，明确限定 Agent 每次操作的边界：

- 每次**文件读取**、**命令执行**、**MCP 调用**都会被权限规则评估
- 超出声明权限的操作会被拦截，并提示你是否临时授权
- 权限记录在 Agent 配置里，可以代码审查（不再是隐性的"Agent 能做任何事"）

这个系统的最大价值在于团队场景：新成员看到 `.kiro/agents/security-reviewer.md` 里 `tools: [read, web]`，立刻就知道这个 Agent 不会修改任何文件——代码审查时放心合并。

---

## 配置热更新（Hot-reload）

IDE 1.0 前，修改 Agent 配置或 MCP 配置需要重启 Kiro 会话，之前的聊天记录也会丢失。

现在，**修改 `.kiro/agents/` 或 MCP 配置文件后直接保存，变更即时生效**，不需要重启，不丢失上下文。

实践建议：把 Agent 的 system prompt 调优过程当成正常代码迭代——改一行、测试效果、再改——而不是每次都重开会话从头来。

---

## 配合使用：自定义 Agent × Hooks × Spec

最高效的工作流是把三者结合起来：

```
Spec tasks.md 生成任务列表
    ↓
主 Agent 实现功能（write 权限）
    ↓ 文件保存触发 Hook
test-writer Agent 自动生成测试（Agent Hooks 调用）
    ↓ 测试文件保存触发 Hook
doc-sync Agent 更新文档（Agent Hooks 调用）
```

在 `.kiro/hooks/post-feature.kiro.hook` 里：

```json
{
  "title": "功能完成后自动补充测试和文档",
  "when": {
    "type": "fileSaved",
    "patterns": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"]
  },
  "instruction": "调用 test-writer agent 为修改的文件生成/更新单元测试，然后调用 doc-sync agent 同步 README 变更。"
}
```

这套组合让"写代码"这件事从单人操作变成了小团队协作——只是这个团队里大部分成员是 AI。
