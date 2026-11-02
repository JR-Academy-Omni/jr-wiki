---
title: "Kiro Web 与 Crew：云端自主编码与多人协作"
wiki: "kiro-guide"
order: 7
description: "Kiro Web 云端自主模式、GitHub issue label 触发工作流、/kiro all 批量处理 PR 评论、Kiro Crew 0.9.0 多 Agent 团队、Slack/Teams 频道集成"
---

## Kiro Web：不打开 IDE 的编码方式

Kiro Web（app.kiro.dev）是 2026 年 5 月上线的浏览器端版本，让你在不打开本地 IDE 的情况下，让 AI 自主完成整个编码任务——包括写代码、协调多个仓库的改动、提交 PR。

**最典型的使用场景**：手机上收到一条 bug 报告，想在通勤时让 Kiro 先处理，到公司再 review。

Kiro Web 的核心工作流：

1. 连接 GitHub 仓库（或多个仓库）
2. 在 Chat 里描述任务，或直接 Assign 一个 GitHub issue
3. Kiro 进入 **Autonomous 模式**：先提问澄清歧义 → 制定计划 → 多 Agent 并行编码 → 自动跑测试 → 提 PR
4. 你 Review PR，和 review 普通 PR 一样

每次任务运行在**独立的云端沙箱**——临时环境，任务结束自动销毁。你控制沙箱的网络访问、MCP 工具权限和基础镜像。

---

## GitHub 集成：用 Label 和命令触发 Kiro

这是 Kiro Web 最省事的使用方式——不用打开 app.kiro.dev，直接在 GitHub 操作：

### 通过 Issue Label 分配任务

```
# 在 GitHub issue 上加 label
kiro

# 或者在 issue 评论里 @ 触发
/kiro 请修复这个 bug，重现步骤见 issue 描述
```

加了 `kiro` label 后，Kiro 自动读取 issue 描述、关联的代码上下文，开始工作，完成后提 PR 并在 issue 下评论进度。

### 批量处理 PR Review 评论

当 PR 堆了一堆 review comments，一条条改很费时间：

```
# 在 PR 评论区输入，处理所有 reviewer 的评论
/kiro all

# 只处理某条具体的 review thread
/kiro fix  （在那条 thread 下回复）
```

`/kiro all` 会读取 PR 所有未 resolve 的 review threads，逐一分析、修复、推送 commit，最后在 PR 里汇报哪些处理了、哪些需要你决策。遇到设计层面的大改动它会提方案但不会自己动手，等你确认。

---

## Steering 文件：团队编码规范的共享层

Kiro Web 和 IDE 共用同一套 Steering 机制，这是团队协作的关键——统一规范只需维护一个地方：

```
# 团队规范层级（优先级从高到低）
.kiro/steering/                 # 项目级（进 git，全团队共享）
~/.kiro/steering/               # 个人级（本地，不进 git）
```

一个典型的项目 Steering 文件：

```markdown
---
inclusion: always
---
# Project Conventions

## Stack
- Next.js 15 (App Router) + TypeScript strict mode
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL + Drizzle ORM（不用 Prisma）
- 测试：Vitest + Testing Library

## Code Style
- 组件用 functional component，不用 class component
- 状态管理用 Zustand（不引入 Redux）
- API 调用统一走 server actions，不写 API routes
- 错误处理用 Result<T, E> 模式

## PR 规范
- PR title 格式：feat/fix/refactor: 一句话描述
- 每个 PR 最多改 3 个文件（大改拆 PR）
- 必须有对应测试，coverage 不能下降
```

这个文件进 git 后，所有团队成员用 Kiro IDE、Kiro CLI、Kiro Web 时，AI 都会遵守同样的规范。新人加入不用看长篇文档，直接用 Kiro 写代码，约束自动生效。

---

## Kiro Crew 0.9.0：运行多个 Agent 的控制台

Kiro Crew 是 2026 年 10 月发布的功能，面向需要同时管理**多个 Kiro 实例**（Crewmate）的场景——比如同时跑前端重构、后端优化、文档更新三个 Agent。

**Crew 0.9.0 的关键更新**（来源：kiro.dev/changelog）：
- **Crewmate 档案**：每个 Crewmate 有独立的状态卡片，一眼看到当前任务进度
- **per-Crewmate 预览仪表盘**：直接在 Crew 界面预览每个 Agent 正在编辑的文件
- **Remote Crews**：把 Crewmate 运行在远端，本机只当控制台，不占本地资源
- **消息频道集成**：Slack、Telegram、Microsoft Teams 频道可以直接发消息给 Crew，Agent 实时回复

### Slack / Teams 集成示例

接入 Teams 频道后，团队可以直接在会话窗口分配任务：

```
# Teams / Slack 频道里
@kiro-crew 帮我把 auth-service 的所有 console.log 替换成 logger.info，
并确认没有 log 了密码或 token

# Kiro Crew 自动回复：
✅ 任务已接收，分配给 Crewmate #2
📦 扫描到 47 处 console.log，其中 3 处涉及敏感字段
🔧 修复完成，PR #284 已创建：[查看 PR]
```

这种模式适合"不想换工具"的团队——不需要所有人都打开 Kiro IDE，在已有的工作流工具里就能指挥 AI。

---

## Web vs IDE vs CLI：怎么选

| 场景 | 推荐工具 |
|------|---------|
| 日常主力开发 | IDE（本地，Spec 工作流最完整） |
| CI/CD 管道自动化 | CLI headless 模式 |
| 不开电脑处理 issue / PR | Kiro Web（手机 / 浏览器） |
| 多仓库联动改动 | Kiro Web（原生多 repo 支持） |
| 团队并行跑多个 Agent | Crew（统一管理多个 Crewmate） |
| Spec 规划阶段 | IDE（Spec UI 在 Web 还在开发中） |

注：Kiro Web 的 Spec 支持正在开发中（2026 年 10 月官方博客提到"正在来的路上"），目前 Web 端以 Chat-driven 模式为主，Spec-driven 工作流还是在 IDE 里最完整。

---

## 2026 年 10 月可用的模型

Kiro 当前支持的主力模型（来源：kiro.dev/changelog，2026-10-21 & 10-23）：

| 模型 | 状态 | 特点 |
|------|------|------|
| Claude Sonnet 5.5 | 正式可用 | 主力推荐，平衡速度与质量 |
| Claude Haiku 5.5 | 实验性 | 1M token 上下文，适合高频批量任务 |
| Claude Fable 5.1 | 正式可用 | 更强的推理，复杂重构首选 |
| GPT-5.6 Terra / Luna | 正式可用 | OpenAI 系列，多模型对比用 |
| GPT-5.6 Sol | 实验性 | 最新 OpenAI 模型 |
| Kimi K3 | 实验性（US 区域） | 1M token 上下文，2.4x credit 倍率 |

注：Claude Sonnet 4 已于 2026-10-14 在 Kiro 中停用，请升级到 Sonnet 5.5。

在 Workflow Recipe 里可以按步骤指定模型——计划步骤用 Fable 5.1 做深度推理，执行步骤用 Haiku 5.5 跑高频操作，省 credit 的同时保证质量：

```yaml
steps:
  - type: step
    id: plan
    modelId: claude-fable-5-1    # 复杂规划用推理更强的模型
    agent: wf-planner
    prompt: "分析 {{task}} 的最佳实现方案，输出详细设计文档"

  - type: repeat
    id: implement
    maxIterations: 5
    onMaxIterations: pause
    steps:
      - type: step
        id: code
        modelId: claude-haiku-5-5  # 执行阶段用快速模型降低 credit 消耗
        agent: wf-coder
        prompt: "按照设计文档逐步实现功能"
```
