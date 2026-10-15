---
title: "团队协作与 GitHub 深度集成"
wiki: "kiro-guide"
order: 6
description: "Kiro Web GitHub App、Issue 触发 Agent 自动开发、PR review 闭环、定时自动化任务"
---

## Kiro Web：从 Issue 到 PR 全自动

从 Kiro 2.0 开始，除了本地 IDE，还有 Kiro Web（`app.kiro.dev`）——把 Kiro Agent 直接接入 GitHub，无需打开 IDE，在浏览器里分配开发任务、Agent 自动建分支、写代码、开 PR。

![Kiro Web GitHub 集成](https://img.youtube.com/vi/8m6w6JDoQbk/maxresdefault.jpg)

核心逻辑：**你描述要做什么 → Agent 在隔离沙箱里完成 → 开 PR → 你 review → 合并**。Kiro 永远不会自动合并，代码最终决策权在人这里。

> Kiro Web 需要 Pro、Pro+、Pro Max 或 Power 计划，且目前仅在 AWS us-east-1 区域可用。

---

## 安装 Kiro Agent GitHub App

团队只需要安装一次，不用每人都操作：

1. 打开 `app.kiro.dev`，登录账号
2. 进入 **Settings → Integrations → GitHub**，点 **Connect GitHub**
3. 跳转 GitHub，选择要授权的组织或个人账号，选择哪些 repo 可以被 Kiro 访问
4. 每个团队成员登录 Kiro Web 后，在 Settings 里连接自己的 GitHub 账号

权限说明：Kiro Agent App 需要以下权限才能工作：

| 权限类型 | 级别 | 用途 |
|---------|------|------|
| Contents | 读写 | 克隆 repo、推分支 |
| Issues | 读写 | 读 Issue 内容、监听 label |
| Pull requests | 读写 | 开 PR、读 review 评论 |
| Actions / Checks | 读写 | 读 CI 结果、处理失败 |
| Workflows | 读写 | 触发 GitHub Actions |
| Metadata | 只读（必须）| 仓库基本信息 |

**Branch protection 照样遵守**——Agent 不会直接推到受保护的主分支，只会开 PR 走 review 流程。

---

## 三种分配任务的方式

### 方式 1：给 Issue 打 `kiro` 标签

最轻量的触发方式。找到你想让 Kiro 处理的 GitHub Issue，加上 `kiro` 标签，Agent 立刻开始工作：

```
GitHub Issue → Labels → Add "kiro" → Kiro 开始处理
```

Issue 的标题和描述就是 Agent 的任务说明。如果描述不够清楚，Agent 可能问你澄清问题（会以 Issue 评论形式出现）。

### 方式 2：Issue 评论里 `/kiro`

已有 Issue 但还没到要全力处理的阶段？在 Issue 评论里单独一行写 `/kiro`，附带你的补充说明：

```
/kiro 只处理后端 API 部分，前端先不动
```

注意：`/kirocrew`、`/kiroassign` 这些变体**不会触发**，必须是精确的 `/kiro`。

### 方式 3：从 Kiro Web 直接建任务

在 `app.kiro.dev` 里直接创建任务，选择 repo 和描述，Agent 开始工作——不需要先在 GitHub 创建 Issue。

---

## Agent 的工作流程

分配任务后，Agent 在隔离沙箱里执行，不影响你的本地环境：

```
分配任务
    ↓
Agent 克隆 repo 到隔离沙箱
    ↓
从默认分支创建 feature 分支
    ↓
按需读文件、改代码、跑测试
    ↓
push 分支 + 开 PR（co-author: 你 + Kiro Agent）
    ↓
等你 review
```

PR 描述会包含：做了什么、技术思路、遇到的 trade-off。**Kiro 永远不会自动 merge**——你 review 之后手动 merge。

同一个 Issue 被多个团队成员同时分配给 Kiro？每人各自在独立沙箱跑，各自开一个 PR。团队最好提前协调，避免重复工作。

---

## PR Review 闭环：让 Agent 处理 review 意见

PR 开出来后，review 意见可以直接让 Agent 处理：

```bash
# 在 PR 评论里
/kiro all     # 处理所有 reviewer 的所有评论
/kiro fix     # 只处理当前这个评论线程
```

有一条细节值得注意：**GitHub Actions 的 CI 反馈（自动化测试、安全扫描、lint）会被自动处理**——只要你给了任何一条反馈（比如点了 `/kiro fix`），Agent 会同时把 CI 报错一并修掉，不用你再单独说一遍。

想排除某条评论不让 Agent 处理？在 `/kiro all` 之前删掉那条评论，或者先回复一下它，Agent 就不会处理了。

---

## 定时自动化任务

Kiro Web 支持定时跑 Agent——在 `app.kiro.dev` 的 Automations 里配置 cron，定时执行重复性任务并自动开 PR：

```
示例定时任务：
- 每周一早上自动扫描依赖更新，开 PR
- 每天凌晨跑代码质量检查，新 issue 汇总
- 每月自动更新 CHANGELOG
```

这部分是 Kiro Web 的 Autonomous 模式——适合"不需要实时决策"的周期性维护工作。具体 cron 语法在 `app.kiro.dev` 的 Automations 设置页配置。

---

## 团队协作最佳实践

### Steering 文件团队共享

把团队编码规范放进 `.kiro/steering/` 目录提交到 repo，每个人（和 Kiro Agent）都自动遵守：

```markdown
---
inclusion: always
---
# 团队规范

## 技术栈
- 框架：Next.js 15 App Router
- 数据库：PostgreSQL + Drizzle ORM
- 测试：Vitest + Testing Library

## 代码规范
- 所有 API 用 server actions，不用 API routes
- 错误处理用 Result 模式
- 组件按功能放 features/，不按类型放 components/

## PR 规范
- 每个 PR 只解决一件事
- 改数据库 schema 必须加迁移文件
- 新 feature 必须有对应测试
```

只要 Steering 文件存在，无论是本地 IDE 里的 Kiro 还是 Web 上的 Autonomous Agent，都会读取这些规范。这样 AI 产出的代码风格和人写的保持一致。

### 用 Issue 模板引导 Kiro

GitHub 的 Issue 模板加上 Kiro 特别有用：

```markdown
<!-- .github/ISSUE_TEMPLATE/kiro-task.md -->
---
name: Kiro 开发任务
about: 分配给 Kiro Agent 执行的开发任务
labels: kiro
---

## 功能描述
（清楚描述要做什么）

## 验收标准
- [ ] 
- [ ] 

## 技术要求
（如有特定实现要求，在这里写）

## 不在范围内
（明确哪些不用做）
```

加上 `labels: kiro`，Issue 一创建就自动触发 Agent。验收标准越清楚，Agent 产出越接近预期。
