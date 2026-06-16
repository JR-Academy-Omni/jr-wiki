---
title: "Subagent 设计模式：什么时候用、怎么写、如何隔离"
wiki: "claude-code-guide"
order: 9
description: "Subagent 的核心价值是上下文隔离——把大量探索结果关在独立窗口里，主对话只看最终摘要。本章覆盖：何时委托、frontmatter 结构、Prompt 怎么写、worktree 隔离"
---

## 为什么要用 Subagent

主对话的上下文窗口是有限资源。你让 Claude 扫 200 个文件找一个 bug，那 200 个文件的内容全部堆进同一个窗口——后续每次对话都要携带这些噪音，成本涨、精度降。

Subagent 的价值就一条：**把副任务的中间过程关在一个独立窗口里，主对话只收一份摘要**。

官方文档对触发时机的描述很直接：

> Use one when a side task would flood your main conversation with search results, logs, or file contents you won't reference again.

![Subagent 上下文隔离示意](https://code.claude.com/images/og-image.png)

三个具体场景：

1. **探索型任务**：搜代码、读文件、查日志。结果量大但最终只需要一句结论。
2. **并行独立任务**：写测试、格式化代码、更新文档——互不依赖，同时跑省时间。
3. **工具受限场景**：只需要 Read/Grep/Glob，不允许 Write/Edit——把能力限死，防止越权。

## Subagent 文件格式

Subagent 定义在 Markdown 文件里，放 `.claude/agents/`（项目级）或 `~/.claude/agents/`（用户级），YAML frontmatter 是配置，正文是系统 Prompt。

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices. Use after any code change.
tools: Read, Glob, Grep
model: sonnet
---

You are a senior code reviewer. Analyze the code for:
- Security vulnerabilities (injection, auth bypass, data exposure)
- Performance bottlenecks
- Readability and naming issues

For each issue: show the file + line, the problem, and a concrete fix.
```

`name` 是唯一标识，`description` 是 Claude 决定「要不要委托」的依据——这两个字段是必填项，其余都可选。

### 完整 frontmatter 字段

| 字段 | 说明 |
|------|------|
| `name` | 必填，小写字母加连字符，全局唯一 |
| `description` | 必填，Claude 用这段文字判断何时委托 |
| `tools` | 允许的工具列表，省略则继承主对话所有工具 |
| `disallowedTools` | 明确禁用的工具（从继承列表里剔除） |
| `model` | `haiku` / `sonnet` / `opus` / `fable` / 完整 model ID / `inherit` |
| `permissionMode` | `default` / `acceptEdits` / `auto` / `dontAsk` / `bypassPermissions` / `plan` |
| `maxTurns` | 最多跑几轮，防止失控 |
| `isolation` | `worktree`：给 subagent 一份独立 git worktree |
| `memory` | `user` / `project` / `local`：跨 session 保留学习内容 |
| `background` | `true`：默认后台运行 |
| `color` | UI 里的颜色标识（`red` / `blue` / `green` 等） |

## 内置 Subagent

Claude Code 自带三个常用 subagent，不需要任何配置就能用：

**Explore** — 只读探索，用 Haiku 跑，速度快、成本低。Claude 需要搜代码但不需要修改时自动委托。调用时可以指定深度：`quick`（单次精准查找）、`medium`（适度探索）、`very thorough`（全面扫描多个位置）。

**Plan** — Plan 模式下的研究 agent。你在 plan 模式里提任务，Claude 把代码库调研丢给 Plan subagent，主对话保持只读等待结果。

**General-purpose** — 全能型，继承主对话所有工具，用于需要「探索 + 修改 + 多步骤」的复杂任务。

另外还有 `claude-code-guide`（你问 Claude Code 功能时 Claude 自动用）和 `statusline-setup`（跑 `/statusline` 时自动用）。

## 怎么写 Subagent 的 Prompt

Subagent 的正文（Markdown body）就是它的系统 Prompt。它**只**收到这段 Prompt 加上基本环境信息（工作目录等），**不**继承主对话的 Claude Code 系统 Prompt。

这意味着主对话里的 CLAUDE.md 规则、用户设置、历史上下文，subagent 都不知道——除非你明确写进 Prompt 里。

几条实用原则：

**1. description 比 prompt 更重要**

Claude 是根据 `description` 决定委托还是自己做，根据 `prompt`（正文）决定怎么做。description 写得模糊，Claude 就不会用它。要写成「当 X 发生时用我」的形式：

```markdown
description: >
  Scans any Python file for common security issues: SQL injection,
  hardcoded secrets, unsafe deserialization. Use proactively after
  any change to .py files.
```

**2. 告诉它输出什么格式**

Subagent 的输出是主对话唯一能看到的东西。格式不定，主对话很难用结果做后续判断。

```markdown
Return results as a JSON array:
[{"file": "...", "line": N, "issue": "...", "severity": "high|medium|low"}]
If no issues found, return [].
```

**3. 把约束写死**

Subagent 没有主对话的语境，它不知道「不要改生产配置」这种隐性规则。需要限制的就明确写：

```markdown
NEVER modify files. NEVER run commands that have side effects.
Only read and analyze.
```

**4. 给复杂任务加 maxTurns**

没有 `maxTurns` 的 subagent 可能在遇到意外情况时无限循环。探索型任务通常 `maxTurns: 10` 够用；复杂实现任务可以到 30-50。

## 上下文隔离的好处

主对话上下文和 subagent 上下文是**完全独立的两个窗口**。subagent 做的所有中间工作——tool calls、中间推理、部分结果——全部留在它自己的窗口里。主对话只收一条最终消息。

这个设计有几个实际收益：

**成本控制**：搜索 100 个文件的 token 消耗，算在 subagent 里。主对话窗口没有膨胀，后续对话的每次推理成本不变。

**结果质量**：主对话上下文越干净，Claude 越不容易被历史噪音干扰。让 subagent 处理探索，主对话专注决策。

**模型优化**：用 `model: haiku` 的 Explore subagent 做文件搜索，用 `model: opus` 的主对话做架构决策——根据任务选最合适的模型，而不是一刀切。

```bash
# 示意：主对话里 Claude 如何自动委托 Explore
用户: 帮我找所有用了 deprecated axios.get 的地方
Claude: → 委托给 Explore subagent（快速，只读）
        Explore: 扫描 47 个 .ts 文件... 找到 12 处
        主对话收到: "找到 12 处，分布在 src/api/ 下的..."
```

## Worktree 隔离

`isolation: worktree` 给 subagent 一份独立的 git worktree——它读写的是一份代码副本，不会污染主工作目录。

```markdown
---
name: refactor-agent
description: Refactors code safely in isolation. Use when changes are experimental.
isolation: worktree
tools: Read, Write, Edit, Bash
model: sonnet
---

Perform the requested refactoring. Run tests after each change.
If tests fail, revert and try a different approach.
```

适合这个模式的场景：
- 实验性重构，不确定方向对不对
- 批量格式化或代码迁移（影响范围大，想先看结果再决定要不要合并）
- 并行处理多个独立功能，各自在独立分支上

Worktree 清理规则：subagent 没有做任何变更时自动删除；有变更时保留，等你决定合并还是丢弃。

## 实战：几个常见的自定义 Subagent

### 只读代码审查

```markdown
---
name: security-reviewer
description: >
  Reviews code for security vulnerabilities. Use after any change
  to authentication, API routes, database queries, or file I/O.
tools: Read, Grep, Glob
model: sonnet
color: red
---

You are a security engineer reviewing code for vulnerabilities.
Focus on: SQL/NoSQL injection, XSS, CSRF, insecure deserialization,
hardcoded secrets, path traversal, broken access control.

For each issue found:
1. File path and line number
2. Vulnerability type (OWASP category)
3. Why it's dangerous
4. Concrete fix with code snippet

If no issues, reply: "No security issues found."
```

### 测试生成器

```markdown
---
name: test-writer
description: Generates unit tests for a given module or function.
tools: Read, Glob, Write, Bash
model: sonnet
maxTurns: 20
---

You write unit tests. When given a file or function:
1. Read the source code
2. Identify edge cases and failure modes
3. Write tests using the project's existing test framework
4. Run the tests and fix failures before returning

Place test files alongside the source (foo.ts → foo.test.ts).
Return a summary: how many tests, pass rate, any known gaps.
```

### 批量文档更新（worktree 隔离）

```markdown
---
name: doc-updater
description: Updates JSDoc/docstring comments across a module. Safe to run on large changes.
tools: Read, Edit, Glob
model: haiku
isolation: worktree
maxTurns: 50
color: blue
---

Update all JSDoc comments in the specified files to accurately reflect
the current implementation. Do not change any logic, only comments.
Flag any functions with no tests as "⚠ untested" in their docstring.
```

## 用 CLI flag 临时定义 Subagent

不想写文件？可以在启动 Claude Code 时直接用 `--agents` 传 JSON，只对当前 session 生效：

```bash
claude --agents '{
  "db-migration-checker": {
    "description": "Validates database migrations for safety before applying.",
    "prompt": "Check the migration file for: backwards-incompatible changes, missing rollback, locks on large tables. Return a risk assessment.",
    "tools": ["Read"],
    "model": "sonnet"
  }
}'
```

适合 CI pipeline 或一次性任务，不需要持久化配置。

## 禁用特定 Subagent

不想让 Claude 自动委托给某个内置 subagent？在 settings.json 里 deny 它：

```json
{
  "permissions": {
    "deny": ["Agent(explore)", "Agent(plan)"]
  }
}
```

要完全禁止 subagent 委托，直接 deny `Agent` 工具本身。

## 小结

| 场景 | 推荐做法 |
|------|---------|
| 搜代码、读日志、探索文件 | 用内置 Explore subagent（自动触发） |
| 多个独立任务并行 | 让 Claude 同时启动多个 subagent |
| 只读审查，不允许修改 | `tools: Read, Grep, Glob`，不加 Write/Edit |
| 实验性修改不想污染工作目录 | `isolation: worktree` |
| 控制成本，探索用便宜模型 | `model: haiku` for Explore，`model: opus` for 决策 |
| 防止 subagent 失控 | 加 `maxTurns: N` |
| 跨 session 积累经验 | `memory: project` 或 `memory: user` |

Subagent 不是越多越好——每多一层委托就多一次上下文切换和摘要损耗。判断标准很简单：**这个任务的中间过程，主对话以后还需要看吗？** 不需要 → 扔给 subagent。需要 → 留在主对话。
