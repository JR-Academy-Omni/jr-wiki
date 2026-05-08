---
title: "Continue 核心功能详解：四大模式让 AI 融入编码流程"
wiki: "continue-guide"
order: 3
description: "深入拆解 Continue 的 Chat、Autocomplete、Edit、Agent 四大模式，以及 Context Provider 和 MCP 工具集成"
---

Continue 不是一个只会"聊天"的 AI 工具。它把 AI 能力拆成了四种不同的交互模式，每种模式针对不同的开发场景。用对了模式，效率差距非常大。

![Continue 核心功能实战](https://img.youtube.com/vi/13ab5dyOasI/maxresdefault.jpg)

## Chat 模式：你的编程对话伙伴

按 `Ctrl+L` 打开侧边栏 Chat。它不只是一个问答框——你可以直接引用项目里的文件、代码片段、甚至终端输出作为上下文。

**Context Provider 是 Chat 的灵魂**。在输入框里打 `@`，就能调用各种上下文：

| 上下文 | 用法 | 场景 |
|--------|------|------|
| `@file` | 引用项目里的任意文件 | "参考 @utils.ts 给我写一个类似的 helper" |
| `@terminal` | 引用终端最近的输出 | "看看 @terminal 里的报错，帮我分析原因" |
| `@url` | 抓取一个网页的内容 | "参考 @https://docs.xxx.com/api 写个请求" |
| `@problems` | 引用 IDE 里的 Problems 面板 | "修复 @problems 里所有的 TypeScript 错误" |
| `@git-diff` | 引用当前的 git diff | "给这个 @git-diff 写一段 commit message" |

**一个实际的工作流**：你在做 code review，看到一段不太理解的逻辑。选中那段代码，按 `Ctrl+L`，代码自动带入 Chat，然后问"这段代码的时间复杂度是多少？有没有更优的写法？"——比切到浏览器去查高效得多。

## Autocomplete 模式：无感知的代码补全

Continue 的 Tab Autocomplete 和 GitHub Copilot 的体验几乎一样：你打字的时候，灰色的补全建议会自动出现，按 `Tab` 接受。

但 Continue 的优势在于模型可选。你可以用云端的 Claude 做补全（质量高但有延迟），也可以用本地的小模型（比如 Qwen 2.5 Coder 3B）做补全（几乎零延迟）。我个人的最佳实践是用本地模型做 Autocomplete，用云端大模型做 Chat 和 Agent。

在 `config.yaml` 里针对 autocomplete 的精细调参：

```yaml
models:
  - name: Starcoder Local
    provider: ollama
    model: starcoder2:3b
    roles:
      - autocomplete
    defaultCompletionOptions:
      temperature: 0.2
      maxTokens: 256
```

温度（temperature）建议设低一点（0.1-0.3），补全代码要的是确定性，不是创意。

## Edit 模式：精准的代码手术刀

选中一段代码，按 `Ctrl+I`，输入自然语言指令，Continue 会直接在编辑器里 inline 修改那段代码。这是我用得最多的功能——比 Chat 更快，因为不需要来回复制粘贴。

典型用法：

- 选中一个函数 → `Ctrl+I` → "加上 try-catch 错误处理"
- 选中一段 CSS → `Ctrl+I` → "改成 dark mode 配色"
- 选中一个类 → `Ctrl+I` → "把所有方法改成 async"

Edit 模式会直接在文件里显示 diff，你可以 Accept 或 Reject 每一处修改。

## Agent 模式：让 AI 自己干活

Agent 模式是 Continue 2025-2026 年的重点方向。在 Chat 面板里切换到 Agent 模式，AI 就从"回答问题"变成了"执行任务"——它可以：

1. 读取和搜索项目文件
2. 修改多个文件的代码
3. 在终端里执行命令
4. 使用 MCP 工具连接外部服务

Agent 会自己制定计划、逐步执行，遇到需要权限的操作会先问你。

**MCP 工具集成**是 Agent 模式的扩展接口。MCP（Model Context Protocol）让 AI 可以调用外部工具——数据库查询、浏览器操作、API 调用等。配置一个 MCP 服务器：

```yaml
mcpServers:
  - name: github
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_TOKEN: ghp_xxxxxxxxxxxx
```

配好之后，Agent 就能直接操作你的 GitHub 仓库——搜索 issue、读 PR、提交代码，不需要你切到浏览器。

## 实战技巧：组合使用四种模式

处理一个 bug 的高效流程：

1. **Chat** 模式 + `@terminal`：把报错信息丢给 AI，让它分析根因
2. AI 指出是 `src/api/handler.ts` 第 47 行的问题
3. **Edit** 模式：选中那段代码，`Ctrl+I`，让 AI 直接修
4. **Autocomplete**：修好之后继续写相关的单元测试，Tab 补全加速
5. **Agent** 模式：让 AI 跑一遍测试、检查有没有其他地方有类似问题

四种模式不是割裂的，而是一个连贯的工作流。理解每种模式的适用场景，是高效使用 Continue 的关键。
