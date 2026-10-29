---
title: "Kiro Workflows：多 Agent 任务编排与自动化流水线"
wiki: "kiro-guide"
order: 6
description: "Kiro Workflows 完整解析：Recipe 配置格式、step/repeat/parallel/watch 节点类型、/workflow-run 命令、Memory 跨会话上下文、真实 PR 自动修复案例"
---

## Workflows 是什么：让多个 Agent 协同工作

Agent Hooks 解决"文件保存 → 单次 AI 操作"的问题，而 Workflows 解决的是**多步骤、多 Agent 协作完成复杂任务**的问题。

官方定义：Workflows 是一个 Agent 团队在后台执行的计划。每个步骤运行在**独立的 Agent 会话**里，拥有全新的上下文——这意味着 Reviewer Agent 不会继承 Coder Agent 的推理偏见，能给出更客观的审查。

![Kiro Workflows 多步骤编排](https://img.youtube.com/vi/rvyPNfV0JAE/maxresdefault.jpg)

**Workflows vs. Hooks 核心区别**

| 维度 | Agent Hooks | Workflows |
|------|------------|---------|
| 触发方式 | 文件事件（保存/创建/删除） | 手动 `/workflow-run`，或自动触发 |
| 步骤数量 | 单次 AI 操作 | 最多 50 个步骤 |
| Agent 隔离 | 同一会话 | 每步独立会话 |
| 结果传递 | 无 | artifacts / captured output |
| 典型场景 | 保存时自动更新测试 | Code review + 自动修复 + 验证 |

---

## Recipe 文件格式

Workflow 配置称为 **Recipe**，存放在 `.kiro/workflows/` 目录（个人跨项目的 Recipe 放 `~/.kiro/workflows/`），文件后缀支持 `.workflow.json`、`.workflow.yaml`、`.workflow.yml`。

一个典型的 PR 自动审查 + 修复 Recipe（YAML 格式）：

```yaml
# .kiro/workflows/pr-review-and-fix.workflow.yaml
name: pr-review-and-fix
description: 审查 PR 改动，发现问题后自动修复，再跑测试验证
inputs:
  branch: string          # 目标分支名
  scope: string           # 审查重点，如 "security and performance"
modelId: auto             # 继承父会话模型；可指定具体模型如 claude-sonnet-5-5

steps:
  - type: step
    id: review
    agent: wf-reviewer
    prompt: >-
      审查分支 {{branch}} 上的改动，重点关注 {{scope}}。
      列出发现的问题，输出到 .kiro/workflow-output/review.md，
      每条问题格式：文件路径、行号、问题描述、严重级别（critical/major/minor）。
    artifacts:
      findings: .kiro/workflow-output/review.md

  - type: repeat
    id: fix-loop
    maxIterations: 3
    onMaxIterations: pause          # 超过 3 轮未收敛就暂停等待人工介入
    stopCondition:
      fileCheck:
        path: .kiro/workflow-output/status.json
        jsonPath: $.allFixed
        value: true
    steps:
      - type: step
        id: fix
        agent: wf-coder
        prompt: >-
          读取 {{artifacts.findings}} 中 critical 和 major 级别的问题，
          逐一修复，每修完一条在 .kiro/workflow-output/status.json 中记录进度。
          所有问题修完后设置 {"allFixed": true}。

      - type: step
        id: verify
        agent: wf-tester
        prompt: >-
          运行受影响模块的单元测试：npm test -- --testPathPattern={{branch}}。
          如果有失败，更新 {{artifacts.findings}} 并将 status.json 里 allFixed 设回 false。
```

启动这个 Workflow：

```
# Chat 输入框
/workflow-run
# 选择 pr-review-and-fix
# 填写 branch: feature/auth-refactor
# 填写 scope: security and performance
```

Workflow 运行时，进度显示在 Chat 面板上方的 **Workflows 面板**，可以随时暂停、查看每步的输出、或手动 Resume。

---

## 五种节点类型速查

```
step      → 单个 Agent 执行一次任务
sequence  → 子节点顺序执行（默认行为，用于明确分组）
repeat    → 循环直到 stopCondition 满足或达到 maxIterations
parallel  → 多个分支并发执行，joinPolicy 控制聚合策略
watch     → 轮询外部系统（GitHub PR / 自定义命令），无变化时零模型消耗
```

**parallel 实战：三维度同时审查**

```yaml
- type: parallel
  id: multi-review
  joinPolicy: allSettled          # 等所有分支完成再汇总
  branches:
    - type: step
      id: security-review
      agent: wf-security
      prompt: "检查 {{branch}} 的改动是否有安全漏洞（SQL 注入 / XSS / 未授权访问）"
    - type: step
      id: perf-review
      agent: wf-perf
      prompt: "检查 {{branch}} 的改动是否有性能回退（N+1 查询 / 大对象序列化 / 无缓存热路径）"
    - type: step
      id: test-review
      agent: wf-test
      prompt: "检查 {{branch}} 的改动是否有对应测试覆盖，缺少的测试列出清单"
```

三个 Agent 并发运行，互不影响，比串行节省约 60% 时间。

**watch 实战：等 CI 跑完再继续**

```yaml
- type: watch
  id: wait-ci
  handler: github-pr
  config:
    prRef: "{{branch}}"
    pollIntervalSec: 60
  idleTimeoutSec: 1800            # 30 分钟没动静就超时
```

Watch 节点在 CI 跑完前**不消耗任何模型 token**，只有检测到 PR 状态变化时才唤醒后续步骤。

---

## Memory：跨会话的"项目记忆"

Kiro 1.4.0 引入的 **Memory** 功能解决了一个痛点：每次打开新 Chat，AI 又忘了你上次跟它说好的规范。

Memory 会记住：
- 你们讨论确定的技术选型（"这个项目用 Zustand 不用 Redux"）
- AI 提了但你否决的方向（"已经试过用 tRPC，不适合"）
- 项目特有的命名约定和架构决策

开启方式：Activity Bar → Memories 图标，或 Settings 搜索 `Kiro Agent: Memory`。默认关闭（1.4.10 起），建议主项目打开，临时项目关闭。

```json
// .vscode/settings.json（项目级）
{
  "kiroAgent.memory": "on",
  "kiroAgent.workflows.enabled": true
}
```

Memory 和 Steering 的区别：Steering 是你主动写好的规范文件，Memory 是 AI 在对话中**自动积累**的上下文。两者互补——Steering 管团队层面的约定，Memory 管你个人与 AI 的持续对话状态。

---

## 上线前必做：validate_workflow

Recipe 写完先别急着跑，在 Chat 里让 Kiro 验证：

```
在 Chat 里输入：
请运行 validate_workflow 检查 .kiro/workflows/pr-review-and-fix.workflow.yaml
```

Kiro 会检查：Schema 合法性、节点 ID 唯一性、节点数量（上限 50）、`stopCondition` 语法、`fileCheck` 路径格式。检查通过后再 `/workflow-run`，避免跑到一半才发现配置错误。

---

## 最佳实践小结

- **节点 ID 要有意义**：`fix-loop`、`security-review` 比 `step1`、`step2` 更容易在面板里定位问题
- **artifacts 显式声明**：步骤间传递文件用 `artifacts` 而不是硬编码路径，路径改了只需改 Recipe
- **repeat 设 maxIterations + pause**：生产代码不要设 `continue`，出乎意料的循环可能悄悄改坏代码
- **parallel 审查要独立**：并行的步骤不能互相依赖，各自读原始文件输出各自的结论
- **Memory 默认 Off**：不确定 AI 记住的是否正确时，用 "Use only" 模式（只读不写）
