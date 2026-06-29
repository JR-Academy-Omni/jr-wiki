---
title: "团队 Spec 工程化：把 AI 开发规范变成共享资产"
wiki: "kiro-guide"
order: 7
description: "多人项目里用 Spec-Driven 协作的完整工作流：Spec PR、团队 Steering 治理、共享 Hooks 库、Sprint 规划集成、新成员入职加速"
---

## 从个人工具到团队协作的挑战

Kiro 作为个人工具效果已经很好，但把它带进团队时会遇到几个问题：

- **每个人的 Steering 规则不同**：A 写的代码风格是 camelCase，B 的全是 snake_case
- **Spec 文件散落在各人本地**：PM 说"加个登录"，三个工程师生成了三份不兼容的 design.md
- **Hook 不共享**：你的安全扫描 Hook 只在你机器上跑，队友提交的代码没人管
- **AI 越权操作没有审计**：回头根本查不到哪个 Agent 改了哪段代码

![Kiro Spec-Driven Development](https://img.youtube.com/vi/4qcWgPb-8Fk/maxresdefault.jpg)

解决方案：**把 `.kiro/` 目录当团队基础设施来治理，和 ESLint config、CI pipeline 一样认真对待。**

---

## 团队核心约定：`.kiro/` 目录结构

```
.kiro/
├── steering/          # 团队代码规范（全员共享）
│   ├── tech-stack.md  # 技术栈声明（inclusion: always）
│   ├── api-design.md  # API 设计规范（inclusion: always）
│   └── testing.md     # 测试规范（fileMatch: "**/*.test.*"）
├── hooks/             # 自动化 Hook（全员共享）
│   ├── secret-scanner.kiro.hook
│   ├── format-on-save.kiro.hook
│   └── test-enforcer.kiro.hook
├── specs/             # 功能 Spec（按功能分目录）
│   ├── user-auth/
│   ├── payment-flow/
│   └── dashboard/
└── context/           # 项目背景文件（供 Hook 注入）
    └── sprint.md
```

**`.kiro/steering/` 和 `.kiro/hooks/` 必须提交到 Git 主干**，任何人 `git pull` 后立刻获得团队全套规范。`specs/` 用 feature branch 管理（见下文）。

---

## Spec PR：先审规格，再写代码

传统流程是代码写完才做 Code Review，问题在于此时改设计成本极高。**Spec PR** 把这步提前：

```bash
# 1. 从主干开新功能分支
git checkout -b feature/payment-subscription main

# 2. 在 Kiro 里创建 Spec（或手写）
mkdir .kiro/specs/payment-subscription
# 生成 requirements.md、design.md、tasks.md

# 3. 只提交 Spec 文件，暂不提交代码
git add .kiro/specs/payment-subscription/
git commit -m "spec: 订阅支付功能规格草案"
git push origin feature/payment-subscription

# 4. 开 Draft PR，标题加 [Spec Review] 前缀
# PR body 粘贴 requirements.md 关键内容，让 PM 和后端都能看
```

Spec PR 的好处：
- PM 可以直接在 GitHub 评论 requirements.md 的每一行
- 技术 Lead 在 design.md 里加注释："这里 Redis 换成 DynamoDB 更合适"
- 所有讨论都留在 PR 历史里，六个月后还能查当初为什么这么设计
- Spec 通过审查后，转成正式 PR 开始实现——方向已经对齐，代码 Review 快很多

---

## 团队 Steering 治理

Steering 文件是团队的"活文档"，需要版本控制和所有权：

```markdown
<!-- .kiro/steering/tech-stack.md -->
---
inclusion: always
---
# 项目技术栈（2026-Q2）

## 核心框架
- Next.js 15 (App Router)，禁用 Pages Router
- TypeScript 5.x，strict 模式，禁用 any
- Drizzle ORM + PostgreSQL（禁止直接写 SQL）

## 禁止引入
- moment.js → 用 date-fns 或 Intl API
- lodash → 用原生 ES2024 或 es-toolkit
- class-based React → 只用 functional + hooks

## 命名规范
- 组件：PascalCase（UserProfile.tsx）
- Hook：use 前缀（useAuthStatus.ts）
- 工具函数：camelCase，不允许缩写（getUserById，不是 getUsrById）

更新这个文件需要 Tech Lead review。最近更新：2026-06-01 @zhang_wei
```

**分层原则**：
- `inclusion: always` → 核心技术决策，任何对话都要知道
- `fileMatch` → 只在相关上下文加载（测试规范只在写测试时生效）
- 禁止把个人偏好塞进共享 Steering（你爱用分号，不代表团队要强制）

---

## Spec 复用：常见功能模板库

很多功能在不同项目里高度相似。把验证过的 Spec 模板存起来：

```
.kiro/templates/
├── crud-resource/         # 标准 CRUD 资源
│   ├── requirements.md    # WHEN/SHALL 格式，有 5 条基础 CRUD 需求
│   └── design.md          # REST API 设计模板
├── user-auth/             # 认证模块
│   ├── requirements.md    # 注册/登录/刷新 token/忘记密码
│   └── design.md          # JWT + refresh token 标准方案
└── file-upload/           # 文件上传
    ├── requirements.md    # 大小限制/类型校验/进度反馈
    └── design.md          # S3 + presigned URL 方案
```

用模板创建新 Spec：

```bash
# 新建"订单管理"功能，从 CRUD 模板复制
cp -r .kiro/templates/crud-resource .kiro/specs/order-management

# 打开 requirements.md，把 [Resource] 占位符替换成 Order
# 修改业务逻辑特有的需求（加状态机、加支付集成等）

# Kiro 会读这些 spec 文件，和通用模板比，知道哪些是已经决定的，哪些需要补充
```

---

## 用 Spec 加速新成员入职

新人第一周最大的问题：不知道"为什么这么设计"。Spec 文件天然是回答这个问题的文档：

```bash
# 新成员入职脚本
echo "欢迎！先看这三个目录："
echo "1. .kiro/steering/  — 我们的编码规范，你写的代码必须符合"
echo "2. .kiro/specs/     — 每个功能的需求 + 设计 + 任务拆分"
echo "3. .kiro/hooks/     — 保存代码时自动跑的检查，不要绕过"
```

在 Kiro Chat 里，新人可以问：

```
"@.kiro/specs/user-auth/design.md 为什么选 refresh token 而不是直接用长期 token？"
```

AI 会读 design.md，结合注释解释当时的决策背景。这比问"谁写这段代码"然后去 Slack 打扰人高效多了。

---

## Sprint 规划集成

每个 Sprint 开始时，更新一个 context 文件，让所有 Hook 和 Chat 都感知当前目标：

```markdown
<!-- .kiro/context/sprint.md -->
# Sprint 2026-S26 目标（截止 2026-07-04）

## 本 Sprint 重点
1. 完成订阅支付功能（story-2341）
2. 修复移动端登录问题（bug-1892、bug-1905）
3. 性能优化：首页 LCP < 2.5s

## 本 Sprint 禁止
- 不引入新的第三方库（锁定 lock.json）
- 不改数据库 schema（下个 Sprint 统一做迁移）

## 技术债务提醒
- UserService 有 TODO: 2026-04-12 标记的旧代码，下次碰到顺手清

更新者：@sprint_master / 2026-06-28
```

配合 `promptSubmit` Hook，Agent 每次对话前都读这个文件，知道当前不该动哪些东西。

---

## 实践检查清单

加入新团队或开新项目时，按这个顺序建立团队 Kiro 基础设施：

```bash
# Week 1: 基础
✅ .kiro/steering/tech-stack.md（技术栈声明，inclusion: always）
✅ .kiro/hooks/secret-scanner.kiro.hook（安全底线）
✅ .kiro/hooks/format-on-save.kiro.hook（风格一致性）

# Week 2: 规范化
✅ .kiro/steering/api-design.md（API 设计规范）
✅ .kiro/steering/testing.md（测试规范，fileMatch）
✅ .kiro/hooks/test-enforcer.kiro.hook（测试强制）
✅ 在 PR 模板里加 Spec Review checklist

# Week 3+: 优化
✅ .kiro/templates/ 积累可复用 Spec 模板
✅ .kiro/context/sprint.md 每 Sprint 更新
✅ 建立 "Spec PR 先于 Code PR" 的团队约定
```

工具只有变成习惯才有价值。把上面的 checklist 写进团队 onboarding 文档，新人第一天就和你们用同一套 AI 编程规范。
