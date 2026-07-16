---
title: "团队协作实战：让 .kiro/ 目录成为团队共享资产"
wiki: "kiro-guide"
order: 8
description: "Spec 纳入 Git 版本管理、共享 Steering 规范、企业 SSO 配置、Kiro Web 与 GitLab 支持（2026年6月更新）"
---

## 为什么团队用 Kiro 比单人用更有价值

单人用 Kiro 的最大收益是「不忘需求」——spec 文件取代了脑子里的隐性设计。

团队用 Kiro 的最大收益是「消灭口头协议」——所有决定写进 `.kiro/` 目录，提交进 Git，评审走 PR，新人 Day 1 读完 `.kiro/specs/` 就知道为什么这个功能长这样。

这一章讲怎么把这个价值真正落地。

---

## 第一步：决定 .kiro/ 里哪些进 Git

`.kiro/` 目录并不是全部都该提交。推荐的 `.gitignore` 策略：

```
# .gitignore

# 提交：团队共享资产
# .kiro/specs/         → 功能规格（需求、设计、任务）
# .kiro/steering/      → 项目编码规范
# .kiro/hooks/         → 自动化钩子
# .kiro/agent.json     → Knowledge Base 配置

# 不提交：本地状态
.kiro/settings.json    # 个人 IDE 偏好（主题、快捷键）
.kiro/.cache/          # 模型输出缓存
```

最简单的记法：**定义团队行为的文件进 Git，记录个人状态的文件不进**。

---

## Spec 的 Git 工作流

Spec 文件是真正的技术文档——对它的改动和改代码一样重要，走同样的 PR 流程。

### 一个功能的标准流程

```bash
# 1. 开功能分支
git checkout -b feature/user-auth

# 2. 让 Kiro 生成 spec
#    Chat: "帮我创建用户邮箱登录 + Google OAuth 的 spec"
#    Kiro 生成：.kiro/specs/user-auth/requirements.md
#              .kiro/specs/user-auth/design.md
#              .kiro/specs/user-auth/tasks.md

# 3. 提交 spec（不含实现代码）
git add .kiro/specs/user-auth/
git commit -m "spec: 用户认证模块 requirements + design"

# 4. 开 PR，让 Tech Lead 评审 spec
#    评审通过 → 合并 → 开始实现

# 5. 实现完成 → 再次提交
git add src/ .kiro/specs/user-auth/tasks.md
git commit -m "feat: 用户认证模块实现"
```

这个流程的关键好处：**需求分歧在 spec 阶段暴露，而不是 code review 阶段**。在 requirements.md 上争论「要不要支持手机号登录」比在代码里改便宜得多。

### Spec PR 的评审要点

Spec 的评审和代码评审焦点不同：

| 代码 PR 看什么 | Spec PR 看什么 |
|--------------|--------------|
| 实现是否正确 | 需求是否完整 |
| 性能和安全 | 边界情况是否覆盖 |
| 代码风格 | 技术选型是否合理 |
| 测试覆盖率 | 任务拆分粒度是否合理 |

重点看 EARS 格式的每条需求：**触发条件（WHEN）是否清晰？系统行为（SHALL）是否可测试？异常情况（IF）是否处理了？**

---

## 共享 Steering：统一全团队的代码风格

Steering 文件是团队「行为宪法」——不用在每次 Code Review 里重复「我们用 Result 模式不用 try-catch」，写进 Steering，让 Kiro 自己记住。

### 推荐的 Steering 文件结构

```
.kiro/steering/
├── tech-stack.md        # 技术栈声明（inclusion: always）
├── code-style.md        # 命名、格式规范（inclusion: always）
├── api-conventions.md   # API 设计规范（inclusion: fileMatch: "src/api/**"）
├── testing.md           # 测试规范（inclusion: fileMatch: "**/*.test.*"）
└── security.md          # 安全规范（inclusion: always）
```

### 实际 Steering 文件示例

```markdown
---
inclusion: always
---
# 代码规范 · 核心原则

## 技术栈
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL + Drizzle ORM（禁用 Prisma）
- 状态管理：Zustand（禁用 Redux）

## 错误处理
统一用 Result 模式，不用 try-catch：
type Result<T> = { ok: true; data: T } | { ok: false; error: string }
Server Actions 必须返回 Result，不抛异常

## 命名规范
- 变量/函数：camelCase
- 组件/类型：PascalCase
- 常量：UPPER_SNAKE_CASE
- 数据库字段：snake_case

## 禁止事项
- 禁止 any 类型（用 unknown + 类型收窄）
- 禁止直接 console.log（用 logger 工具函数）
```

```markdown
---
inclusion: fileMatch
fileMatch: "src/api/**/*.ts"
---
# API 设计规范

## 响应格式
所有 API 返回统一结构：
{ "data": ..., "error": null } 或 { "data": null, "error": "message" }

## 路由命名（RESTful）
- GET  /api/users          列表
- GET  /api/users/:id      单个
- POST /api/users          创建
- PUT  /api/users/:id      全量更新

禁止在 URL 里用动词（/api/getUser ❌，/api/users/:id ✅）
```

Steering 文件的四种加载模式（在 YAML frontmatter 里设置）：

| 模式 | 配置 | 适用 |
|------|------|------|
| always | `inclusion: always` | 核心规范，每次对话都带 |
| fileMatch | `inclusion: fileMatch` + `fileMatch: "glob"` | 专项规范，只在对应文件时加载 |
| auto | `inclusion: auto` | Kiro 自判断是否相关时加载 |
| manual | `inclusion: manual` | 手动用 `#文件名` 引用才加载 |

### 新成员 Onboarding 技巧

新人入职第一天，让他读 `.kiro/steering/`——比读 Wiki 或 Confluence 快得多，而且是最新的（因为 Steering 随代码更新）。

---

## 分层 Steering：全局 vs 项目

Steering 有两个生效范围，工作方式类似 `.gitconfig` 全局配置和项目 `.editorconfig`：

```bash
# 全局 Steering（跨所有项目）
~/.kiro/steering/
├── personal-style.md    # 你个人偏好的代码风格
└── common-tools.md      # 你常用的工具规范

# 项目 Steering（仅本项目，优先级更高）
.kiro/steering/
├── tech-stack.md        # 本项目技术栈
└── api-conventions.md   # 本项目 API 规范
```

当全局和项目 Steering 有冲突时，**项目 Steering 优先**。

团队最佳实践：全局 `~/.kiro/steering/` 放个人偏好（不进 Git），项目 `.kiro/steering/` 放团队共同规范（进 Git）。

---

## 企业认证：Okta / Entra ID 集成（2026 新功能）

2026 年 Kiro 新增了对企业 IdP 的支持，除原有的 AWS IAM Identity Center 外，支持 **Okta** 和 **Microsoft Entra ID** 直接 SSO 登录。

```
以前流程：
  开发者 → 创建 AWS 账号 → IT 配置 IAM Identity Center → 等 2-3 天 → 能用 Kiro

现在（Okta 方案）：
  IT → Okta 里配置 Kiro SAML 应用 → 开发者用公司邮箱 SSO 直接登录
```

Team Plan 包含：
- 集中化账单（管理员统一管理所有席位）
- SSO（AWS IAM Identity Center / Okta / Entra ID 三选一）
- 用量分析（谁用了多少 credits）
- 企业安全控制

---

## Kiro Web + GitLab 支持（2026 年 6 月更新）

Kiro 2026 年 6 月在 AWS Summit New York 宣布：**Kiro Web 完整支持 Spec 工作流**，并新增 GitLab 集成。

### 三种 Kiro 入口的使用场景

| 场景 | 推荐 | 原因 |
|------|------|------|
| 功能开发（写大量代码） | Kiro IDE | 本地 LSP + 文件系统访问 |
| 只改 spec / 讨论需求 | Kiro Web | 无需装 IDE，浏览器打开即用 |
| 产品经理参与需求评审 | Kiro Web | PM 不需要安装开发工具 |
| CI/CD 管道自动任务 | Kiro CLI | headless 模式，无需 GUI |

### GitLab 集成的意义

GitHub 用户一直是 Kiro 主要群体。GitLab 上线后，使用 GitLab 的企业（金融、政府、需要私有部署的公司）也能用上 Spec 工作流。

具体能做什么：
- 读取 GitLab 仓库文件作为上下文
- 把 Spec 文件提交回 GitLab
- 从 GitLab Issue 直接生成 Spec
- Merge Request 里触发 Kiro 代码分析

---

## 处理 Spec 冲突

两个人同时修改同一个 spec 文件时，Git merge conflict 在 markdown 里比在代码里难处理。

**推荐方式**：每人负责不同 spec 文件，而不是多人同时编辑同一个 spec。

```
# 推荐分工：
开发者 A → .kiro/specs/user-auth/      # 认证模块
开发者 B → .kiro/specs/user-profile/   # 个人资料模块
开发者 C → .kiro/specs/notifications/  # 通知模块
```

如果真的发生冲突，可以让 Kiro 帮合并：

```
"帮我合并这两段 requirements.md 的冲突内容，
保留 <<<< 里对错误处理的描述，但用 ==== 里对数据格式的定义"
```

---

## 一句话总结

`.kiro/specs/` 和 `.kiro/steering/` 进 Git → Spec 走 PR 评审 → 新人读 Steering 替代 Wiki → 企业团队用 Okta SSO 统一管理。这套流程把 Kiro 从「一个人的 AI IDE」升级成了「团队的规格引擎」。
