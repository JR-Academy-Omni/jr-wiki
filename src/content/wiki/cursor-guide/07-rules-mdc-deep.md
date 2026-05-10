---
title: ".cursor/rules/*.mdc 深度解析"
wiki: "cursor-guide"
order: 7
description: ".mdc 文件的四种触发类型（alwaysApply / Auto Attached / Agent Requested / Manual）、glob 模式详解、多 rule 并发时的优先级冲突处理——从结构到实战的完整指南"
---

`.cursorrules` 是 Cursor 早期的规则方案：一个文件，写啥都往里扔，每次对话都全量注入上下文。规则多了之后这个方案开始露出问题——token 消耗直接拉满，不相关的规则也在占位，Agent 的注意力被稀释。

从 0.45 版本起，Cursor 正式推出 `.cursor/rules/` 目录 + `.mdc` 文件的新方案，核心改变是**按需注入**：一条规则只有在真正需要的时候才出现在上下文里。

![Cursor MDC Rules 教程](https://img.youtube.com/vi/ABozvKmctkc/maxresdefault.jpg)

---

## .mdc 文件的基本格式

`.mdc` 全称 Markdown with Cursor metadata，本质是在普通 Markdown 文件头部加一段 YAML frontmatter，告诉 Cursor 这条规则什么时候应该注入：

```yaml
---
description: 这条规则的用途，给 Agent 看的说明
globs:
  - src/**/*.tsx
  - src/**/*.ts
alwaysApply: false
---

（以下是规则正文，普通 Markdown）

## TypeScript 代码规范

- 所有组件用 function 声明，不用箭头函数
- Props 类型用 interface，不用 type alias
- 禁止 any，用 unknown + 类型收窄
```

frontmatter 里有三个字段控制触发行为：

| 字段 | 类型 | 作用 |
|------|------|------|
| `description` | string | 规则的用途描述，Agent Requested 模式下 AI 靠这个决定要不要加载 |
| `globs` | string[] | 文件 glob 模式，Auto Attached 模式下匹配文件自动触发 |
| `alwaysApply` | boolean | 为 true 时规则永远注入，不管对话内容是什么 |

---

## 四种触发类型

### 1. Always Apply — 全局生效

```yaml
---
alwaysApply: true
---
```

只要 `alwaysApply: true`，这条规则在**每一次**对话里都会被注入，不管你在讨论 TypeScript 还是 SQL 还是在问天气。适合放全局性约定：

- 项目技术栈（"本项目用 Next.js 14 App Router，不用 Pages Router"）
- 代码风格底线（"禁止 console.log 提交到 main"）
- 安全红线（"所有用户输入必须经过 zod 校验"）

**注意**：`alwaysApply: true` 时，`globs` 字段会被完全忽略——规则无条件注入，不需要文件匹配。

每条 Always Apply 规则都消耗固定 token。保守上限：总 Always Apply 规则不超过 **2000 token**（约 1500 中文字）。超了就开始影响 Agent 的有效推理空间。

---

### 2. Auto Attached — 文件触发

```yaml
---
globs:
  - "**/*.test.ts"
  - "**/*.spec.ts"
alwaysApply: false
---
```

当对话里引用的文件（`@file`、Composer 里打开的文件、Agent 读到的文件）匹配 `globs` 里的 pattern 时，规则自动注入。

这是最常用的模式，因为它做到了精准匹配：写测试时只注入测试规范，改 React 组件时只注入组件规范，互不干扰。

典型配置：

```yaml
---
globs:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
alwaysApply: false
---

## React 组件规范

- 组件文件名用 PascalCase（UserCard.tsx，不是 user-card.tsx）
- 每个组件文件只 export 一个组件
- 客户端组件顶部必须有 "use client"
- 样式用 Tailwind，不要 inline style 除非动态值
```

`globs` 字段支持数组，多个 pattern 之间是**或**的关系，只要有一个匹配就触发。

---

### 3. Agent Requested — AI 自主决定

```yaml
---
description: "数据库 schema 设计规范，当需要设计或修改数据库表结构时使用"
alwaysApply: false
---
```

没有 `globs`，没有 `alwaysApply: true`，只有 `description`——这种情况下，Cursor Agent 会把 description 读一遍，**自行判断**当前对话是否需要这条规则。

这个模式适合：
- 专项规范（数据库 schema 规则、API 设计规范）
- 不和特定文件类型绑定，但只在特定场景下需要的规则

Agent Requested 的准确性高度依赖 description 的质量。写得模糊（"代码规范"）AI 可能漏拉；写得具体（"当需要写 Prisma schema 或 SQL migration 时加载此规则"）成功率显著提高。

---

### 4. Manual — 手动召唤

```yaml
---
alwaysApply: false
---
```

三个字段全空（或只有规则正文没有 frontmatter），这条规则只能通过 `@rule-name` 手动引用：

```
@performance-checklist 帮我看看这段代码有没有性能问题
```

适合那些"偶尔需要但不想常驻"的规则：
- 发版前的代码审查清单
- 特定架构迁移指南
- 临时的代码风格统一要求

---

## Glob 模式详解

glob 是一种路径匹配语法，Cursor 遵循标准 glob 规范：

| 模式 | 含义 | 例子 |
|------|------|------|
| `*` | 匹配单层目录内的任意字符（不含 `/`） | `src/*.ts` 匹配 `src/index.ts`，不匹配 `src/utils/helper.ts` |
| `**` | 匹配任意深度的目录 | `src/**/*.ts` 匹配 `src/utils/helper.ts` |
| `{a,b}` | 匹配多个可选项 | `src/**/*.{ts,tsx}` |
| `!pattern` | 排除 | `!**/*.test.ts` |

实际工程中几个常见写法：

```yaml
globs:
  # 所有 TypeScript 文件（含 TSX）
  - "src/**/*.{ts,tsx}"

  # 只匹配测试文件
  - "**/*.{test,spec}.{ts,js}"

  # API 路由（Next.js App Router）
  - "src/app/api/**/route.ts"

  # 配置文件
  - "*.config.{ts,js,mjs}"
  - ".env*"
```

一个容易踩的坑：`src/*.tsx` 和 `src/**/*.tsx` 的区别。前者**只匹配** `src/` 直属的文件，后者匹配所有子目录。大多数场景都应该用 `**`。

---

## 多 rule 并发：优先级与冲突处理

当一次对话里同时触发了多条规则，它们的内容会合并注入。问题来了：两条规则说的话互相矛盾怎么办？

### 优先级层级

Cursor 有三层规则来源，按优先级从高到低：

```
Team Rules（团队规则）
    ↓ 若有冲突，上层覆盖下层
Project Rules（.cursor/rules/*.mdc）
    ↓
User Rules（全局用户设置）
    ↓
Legacy（.cursorrules）
```

同层级的多个 `.mdc` 文件之间，Cursor **不保证**哪一条优先。如果两条 Project Rules 互相矛盾（一条说"用 default export"，另一条说"禁止 default export"），Agent 会产生不一致的输出——有时遵循这条，有时遵循那条。

### 解决冲突的实际做法

**拆分关注点，避免 glob 重叠**

把不同关注点的规则分开，让它们不会在同一个文件上同时触发：

```
.cursor/rules/
├── react-components.mdc    # globs: src/components/**/*.tsx
├── api-routes.mdc          # globs: src/app/api/**/*.ts
├── database.mdc            # globs: prisma/**/*.prisma, **/migrations/**
└── global-security.mdc    # alwaysApply: true（安全底线，全局）
```

这样打开 `src/components/UserCard.tsx` 只触发 `react-components.mdc`，不会和 `api-routes.mdc` 撞。

**优先级明确化：关键约束写进 Always Apply**

如果有一条规则是你不希望被任何其他规则覆盖的底线，把它单独抽出来做成 Always Apply 并置顶：

```yaml
---
alwaysApply: true
---

## 安全底线（所有代码必须遵守，不受其他规则覆盖）

- 禁止在代码里 hardcode 任何密钥、token、密码
- 所有 SQL 必须用参数化查询，禁止字符串拼接
- 用户输入必须在边界处 validate，不信任任何来源
```

**定期审查重复规则**

随着项目演进，.mdc 文件容易越积越多，老规则和新规则形成冲突。建议每季度 grep 一下：

```bash
# 找所有 .mdc 文件里包含 "export" 相关规则
grep -r "export" .cursor/rules/ --include="*.mdc" -l

# 列出所有 alwaysApply: true 的规则（最高成本）
grep -rl "alwaysApply: true" .cursor/rules/
```

---

## 目录组织最佳实践

Cursor 会递归读取 `.cursor/rules/` 下所有 `.mdc` 文件，子目录纯粹是给人看的，不影响规则加载：

```
.cursor/rules/
├── core/
│   ├── security.mdc        # alwaysApply: true — 安全红线
│   └── git-commits.mdc     # alwaysApply: true — commit message 格式
├── frontend/
│   ├── react.mdc           # globs: **/*.tsx
│   ├── styling.mdc         # globs: **/*.{css,scss,tailwind}
│   └── testing.mdc         # globs: **/*.{test,spec}.{ts,tsx}
├── backend/
│   ├── api-design.mdc      # description: API 设计时
│   └── database.mdc        # globs: prisma/**
└── ops/
    └── deployment.mdc      # manual — 手动 @deployment 召唤
```

几个经验规则：

- 单个 `.mdc` 文件保持在 **500 行以内**。太长的规则文件 AI 读到后面会开始走神
- 所有 Always Apply 规则加起来 **不超过 2000 token**，约 1500 中文字或 500 行英文
- 每条规则只做一件事。"前端规范.mdc" 是个反面例子，拆成 react.mdc + styling.mdc + testing.mdc 会准确很多
- `description` 字段要具体——"当需要写 xxx 时加载" 比 "xxx 规范" 的触发成功率高

---

## 从 .cursorrules 迁移

如果你的项目有一个胖 `.cursorrules` 文件，迁移到 `.mdc` 的方式：

1. 按关注点把内容切段（代码风格 / 测试规范 / 安全要求 / API 设计……）
2. 每段创建一个 `.mdc` 文件，判断它适合哪种触发类型
3. 全局底线 → `alwaysApply: true`；和文件类型挂钩的 → `globs`；专项规范 → `description`
4. 迁移完后保留 `.cursorrules` 一段时间做并行对照，确认没有规则丢失

如果 `.cursorrules` 和 `.mdc` 规则同时存在，当两者冲突时 `.mdc` 优先，`.cursorrules` 内容会被静默覆盖。

---

## 快速参考

```yaml
# 全局生效
---
alwaysApply: true
---

# 文件匹配触发
---
globs: ["src/**/*.tsx", "src/**/*.ts"]
alwaysApply: false
---

# AI 按需决定
---
description: "当需要设计数据库 schema 或写 migration 时使用"
alwaysApply: false
---

# 手动 @rule-name 召唤
---
alwaysApply: false
---
```

四种模式对应四种场景，选对了比堆规则数量更有效。
