---
title: "团队协作：Spec 版本管理、Steering 共享与常见坑"
wiki: "kiro-guide"
order: 7
description: "用 Git 管理 Spec 文件实现团队对齐、Steering 规则的全局与项目级分层、AGENTS.md 标准、踩过的真实坑与解决方案"
---

## 为什么 Kiro 天然适合团队

一个月用下来，Kiro 和其他 AI IDE 最大的区别不是代码质量——而是**上下文对齐**。

Cursor 的 AI 对话是私人的，每个人各自在 Chat 里讲自己对需求的理解。Kiro 的 Spec 是 Markdown 文件，住在项目目录里，`git commit` 一推，全队拿到的是同一份 requirements.md / design.md / tasks.md。

---

## Spec 文件的团队工作流

### 文件结构

一个功能的 Spec 存放在 `.kiro/specs/{feature-name}/`：

```
.kiro/
└── specs/
    ├── user-auth/
    │   ├── requirements.md    # 用户故事 + 验收标准
    │   ├── design.md          # 技术架构决策 + 组件图
    │   └── tasks.md           # 分阶段任务列表（Kiro 执行用）
    └── payment-flow/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

**把 `.kiro/specs/` 提交到 Git**——这是关键。一旦进了 Git：

- PR Review 顺带 Review Spec，需求漏洞在写代码前就暴露
- 需求变更有 Git diff 记录，不再靠口头传达
- 新人进组读 Spec 文件，比读代码注释快 10 倍

### 实操流程

```
1. Alice 写新功能 Spec（Kiro 生成草稿，人工审核）
   ↓
2. git push → 发 PR，团队在 GitHub 评论里改 requirements.md
   ↓
3. PR merge → requirements "冻结"，Kiro 按 tasks.md 开始实现
   ↓
4. 实现中途需求变更 → 先改 Spec PR，再跑实现
```

这个"Spec 先行"的门控，是 Kiro 相比纯 chat 模式最大的工程价值。不是让 AI 更聪明，是让**变更有迹可循**。

---

## Steering 规则：团队编码规范的唯一真相

个人 `.kiro/steering/` 目录里放的规则只对自己生效。要让整个项目团队共享同一套规范，把 Steering 文件提交到项目仓库：

```
.kiro/
└── steering/
    ├── coding-standards.md    # 代码风格、命名规范
    ├── git-workflow.md        # 分支策略、commit message 格式
    ├── testing-policy.md      # 测试覆盖率要求、禁止的测试反模式
    └── architecture.md        # 禁止改动的模块、边界约束
```

示例 `coding-standards.md`：

```markdown
# Coding Standards

- 使用 pnpm，不用 npm 或 yarn
- TypeScript strict mode，禁止 `any`（用 `unknown` + 类型守卫替代）
- 组件文件使用 named export，禁止 default export
- CSS 用 Tailwind，不引入额外 CSS 框架
- 所有异步函数必须处理 error，不允许裸 `await` 无 try/catch
- 数据库迁移文件必须可回滚（有对应 down 方法）
```

示例 `git-workflow.md`：

```markdown
# Git Workflow

- 分支命名：feat/xxx、fix/xxx、chore/xxx
- commit message 格式：type(scope): description（中文描述）
- 禁止直接 push main，走 PR + 至少 1 人 review
- 提 PR 前必须跑 bun run lint && bun run test
- merge 策略：Squash merge，保持 main 线性历史
```

Kiro 每次 Session 启动时自动读取这些文件，相当于给 Agent 提前打好"规范 context"，不需要在每次对话里重复说"我们用 pnpm"。

---

## 全局 Steering（Kiro 0.5+）

Kiro 0.5 新增了**全局 Steering**，放在用户目录 `~/.kiro/steering/` 里：

```
~/.kiro/
└── steering/
    ├── personal-preferences.md    # 个人偏好（跨所有项目）
    └── AGENTS.md                   # 标准格式，兼容其他 AI 工具
```

全局 Steering 适合放**个人偏好**（不适合放团队规范，因为不在项目 Git 里）：

```markdown
# My Personal Steering

- 代码注释用中文
- 生成测试时同时生成对应的 mock factory
- 解释架构决策时列出 2-3 个被否定的方案和原因
- 提交信息用中文，格式：类型(范围): 描述
```

### AGENTS.md 兼容

Kiro 0.5 开始支持 [AGENTS.md 标准](https://agentprotocol.ai/)——同一个文件可以被 Claude Code、Kiro、Jules 等多个 AI 工具读取，不用在每个工具里重复配置规则：

```markdown
# AGENTS.md

## Coding Standards
- Language: TypeScript strict
- Package manager: pnpm
- Test framework: Vitest

## Commit Messages
Format: type(scope): description in Chinese

## Off-limits
- Never modify /vendor directory
- Ask before deleting any file over 100 lines
```

把 `AGENTS.md` 放到项目根目录，Kiro 自动读取。

---

## 踩过的真实坑（+ 解决方案）

### 坑 1：Kiro 重新实现了已有代码

**现象**：让 Kiro 加一个工具函数，它没找到项目里已有的 `utils/format.ts`，自己写了一个功能重复的。

**根因**：上下文窗口没覆盖到那个文件。

**解决方案**：
1. 在 Steering 里加一行 `# Key utilities: see src/utils/ for existing helpers`
2. 对话开头手动 `@file src/utils/format.ts` 引入上下文
3. 让 Kiro 先搜索再实现：`先用 grep 确认项目里有没有类似功能，然后决定复用还是新建`

### 坑 2：CSS 改动在构建时才发现冲突

**现象**：Kiro 在 `Button.tsx` 里加了 `!important` 的 inline style 覆盖了全局样式，本地看没问题，CI build 后其他页面样式乱了。

**解决方案**：在 Steering 里加约束：

```markdown
## CSS Rules
- 禁止使用 `!important`
- 禁止内联 style（除非是动态计算值）
- 样式改动后必须跑 bun run build 确认全局无冲突
```

### 坑 3：Spec 太大，Kiro 实现中途跑偏

**现象**：requirements.md 写了 20 条验收标准，Kiro 执行到第 8 条开始"创意发挥"，加了原本没有的功能。

**解决方案**：Spec 拆粒度。一个 tasks.md 的单个 task 不超过 3 个文件改动。大功能拆成多轮 Spec：

```markdown
## tasks.md

### Phase 1: Core CRUD
- [ ] 创建 User model（只含 id/email/name，不含 role）
- [ ] 实现 GET /users 和 POST /users
- [ ] 写单元测试

### Phase 2: Auth（Phase 1 完成后再开）
- [ ] 加 JWT 中间件
- [ ] 实现 login / logout
```

每个 Phase 单独跑，Phase 1 验收通过再启动 Phase 2。

### 坑 4：频繁 git commit 才能用好 Kiro

**经验**：Kiro 执行多步 task 时界面上的 diff 很细碎，不容易看全貌。养成习惯：**每个 Phase 跑完就 git commit**，然后 `git diff HEAD~1` 看整体改动。

发现问题时 Kiro 的 **Checkpoint** 功能可以回滚对话 + 代码到任意保存点，比 git reset 更方便——它同时还原了对话上下文。

---

## 最佳实践总结

```
项目 Git 里管理：
  .kiro/specs/          → 功能 Spec（需求 + 设计 + 任务）
  .kiro/steering/       → 团队编码规范
  AGENTS.md             → 跨工具通用规则

本地/不提交：
  ~/.kiro/steering/     → 个人偏好
  .kiro/settings/mcp.json（含密钥的部分 → .gitignore）

工作节奏：
  Spec 审查（PR 阶段）→ Phase 拆分（≤3 文件/task）
  → 每 Phase 完成后 git commit → 下一 Phase
```

Kiro 的核心价值不是"AI 替你写代码"，而是**让团队在同一份 Spec 上协作，AI 负责执行**。Spec 是团队共识的载体，Steering 是团队规范的载体——两者都进 Git，AI 就不会是一个人的私有助手，而是团队的共享工程师。
