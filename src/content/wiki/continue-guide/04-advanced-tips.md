---
title: "Continue 高级玩法：Rules、Hub 与团队协作"
wiki: "continue-guide"
order: 4
description: "用 Rules 定义团队编码规范，通过 Continue Hub 共享配置，以及在 CI/CD 中集成 AI 代码审查"
---

Continue 装上、配好模型之后，大多数人就停在了"日常用 Chat 和 Autocomplete"的阶段。但 Continue 真正拉开差距的地方在于它的规则系统、Hub 生态和 CI 集成。

![Continue 高级配置](https://img.youtube.com/vi/dtfuFeXJ_p8/maxresdefault.jpg)

## Rules：让 AI 遵守你的编码规范

团队里每个人 prompt 风格不同，AI 生成的代码风格也参差不齐。Rules 解决这个问题——你定义一套规则，Continue 在生成所有代码时都会遵守。

在项目根目录创建 `.continue/rules/` 文件夹，里面放 Markdown 文件：

```markdown
<!-- .continue/rules/coding-standards.md -->
---
name: Team Coding Standards
---

## TypeScript 规范
- 所有函数必须有明确的返回类型声明
- 用 interface 而不是 type 定义对象形状
- 错误处理用自定义 Error class，不要裸抛 string
- import 顺序：第三方库 → 内部模块 → 类型 → 样式

## 命名规范
- 组件：PascalCase（UserProfile.tsx）
- Hook：camelCase，use 前缀（useAuth.ts）
- 工具函数：camelCase（formatDate.ts）
- 常量：UPPER_SNAKE_CASE

## 禁止项
- 不用 any 类型
- 不用 console.log（用项目内的 logger）
- 不用 moment.js（用 date-fns）
```

保存后，无论你用 Chat、Edit 还是 Agent，AI 都会自动参考这些规则。团队所有人共享同一份 `.continue/rules/`，commit 到 Git 里，保证 AI 生成的代码风格统一。

## Continue Hub：配置的应用商店

Continue Hub（hub.continue.dev）是一个共享生态——你可以一键安装别人发布的 Assistant（预配置好的模型 + Rules + 工具组合）。

Hub 上的东西分三类：

- **Assistants**：打包好的完整配置，比如 "Python Data Science Assistant"（带 pandas 规则 + Jupyter MCP 工具）
- **Rules**：独立的规则包，比如 "React Best Practices 2026"
- **MCP Servers**：预配置的工具服务器，比如数据库查询、浏览器自动化

使用 Hub Assistant 非常简单——登录 Hub，点 Add，它就自动同步到你的 IDE 里，出现在 Chat 面板的 Assistant 下拉菜单中。

## CI/CD 中的 AI 代码审查

Continue 2026 年的重要方向是把 AI 能力从 IDE 延伸到 CI 管道。通过 Continue CLI 和 `.continue/checks/` 目录，你可以定义 AI 驱动的代码检查规则，在每个 PR 上自动运行。

```markdown
<!-- .continue/checks/security-review.md -->
---
name: Security Review
model: claude-sonnet-4-6
---

检查本次 PR 的代码变更是否存在以下安全问题：
1. SQL 注入风险（拼接字符串查询）
2. XSS 风险（未转义的用户输入渲染到 HTML）
3. 敏感信息泄露（硬编码的 API Key、密码、Token）
4. 不安全的依赖版本

对每个发现的问题，给出具体的文件和行号，以及修复建议。
```

这些 check 在 PR 上跑完后，会像普通 CI 检查一样显示 ✅ 或 ❌，还会自动在 PR 上留下带有修复 diff 的 review comment。

## 多模型混搭策略

Continue 最强的地方就是模型自由。一个经过实战验证的混搭方案：

```yaml
models:
  # 日常对话和复杂推理——用最强的模型
  - name: Claude Opus
    provider: anthropic
    model: claude-opus-4-6
    apiKey: ${ANTHROPIC_API_KEY}
    roles: [agent]

  # 快速编辑和一般对话——性价比之选
  - name: Claude Sonnet
    provider: anthropic
    model: claude-sonnet-4-6
    apiKey: ${ANTHROPIC_API_KEY}
    roles: [chat, edit]

  # 代码补全——本地模型零成本零延迟
  - name: Qwen Coder
    provider: ollama
    model: qwen2.5-coder:7b
    roles: [autocomplete]
    defaultCompletionOptions:
      temperature: 0.1
```

这个配置的逻辑是：Agent 任务复杂度高、给它最好的模型；Chat 和 Edit 是高频操作、用中端模型控制成本；Autocomplete 对延迟最敏感、用本地模型。

## 企业级私有化部署

如果你的公司不允许代码出内网，Continue 支持完全私有化：

1. 用 Ollama、vLLM 或 LM Studio 在内网服务器上部署模型
2. 所有 Continue 配置指向内网地址
3. 代码、prompt、响应全部在内网流转，零数据泄露

这是 Cursor 和 Copilot 做不到的事——它们的核心功能依赖云端服务，而 Continue 从架构上就支持完全断网运行。
