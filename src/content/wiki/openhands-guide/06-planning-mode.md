---
title: "Planning Mode 实战：先规划，再执行"
wiki: "openhands-guide"
order: 6
description: "OpenHands 2026 新功能：Plan Mode + Code Mode 双模式工作流，用 PLAN.md 把模糊需求变成可审核的执行计划，避免 AI 走错方向"
---

## 为什么需要"先规划"

把一个模糊的需求直接丢给 OpenHands——比如"重构用户认证模块"——它会立刻开始动文件，等你发现方向不对时，可能已经改了十几个文件。

Planning Mode 解决的就是这个问题。**2026 年 3 月（v1.6.0）**，OpenHands 引入了独立的 Planning Agent，把工作流拆成两步：

```
Plan Mode → 生成 PLAN.md → 你审核确认 → Code Mode → 按计划执行
```

类比真实团队协作：相当于你先写 Design Doc，Review 通过后再开始开发，而不是边写边猜。

## 如何开启

在 OpenHands Web GUI 右上角有模式切换：**Plan ↔ Code**。

默认是 Code Mode（直接执行）。切换到 Plan Mode 后：

1. 输入你的任务描述
2. Planning Agent 读取项目代码库（只读，不修改任何文件）
3. 如果任务描述有模糊点，它会先**提问澄清**
4. 生成 `PLAN.md` 保存在工作区
5. 你确认计划后，切回 Code Mode 按计划执行

> Plan Mode 目前支持 Cloud 版和 Docker v1.7+ 的 GUI，CLI 暂不支持。

## PLAN.md 的结构

以"给注册流程加邮箱验证"为例，Planning Agent 生成的计划大致如下：

```markdown
# 计划：用户注册邮箱验证

## 目标
用户注册后收到验证邮件，24 小时内点击链接完成验证，否则账号禁用。

## 当前状态
- `src/auth/register.ts`：已有注册逻辑，无邮箱验证步骤
- `src/models/User.ts`：缺少 `emailVerified`、`verificationToken` 字段
- 已有 SendGrid 依赖（`package.json`）

## 变更计划

### 步骤 1：数据库迁移
修改 `prisma/schema.prisma`，User 表新增三个字段：
- `emailVerified Boolean @default(false)`
- `verificationToken String?`
- `tokenExpiry DateTime?`

### 步骤 2：邮件服务
新建 `src/services/email.ts`，封装 `sendVerificationEmail(to, token)` 函数

### 步骤 3：注册流程
修改 `src/auth/register.ts`：
1. 注册后生成随机 token
2. 存入 DB，设 24h 过期
3. 调邮件服务发验证链接

新增 `GET /auth/verify?token=xxx` endpoint

### 步骤 4：测试
- 单元测试：token 生成逻辑、邮件服务 mock
- 集成测试：完整注册 → 验证流程

## 不改的部分
- 登录流程
- 密码重置
- 第三方 OAuth 登录
- 前端 UI（仅后端逻辑改动）
```

这份计划让你能在代码动之前就判断：它要改的文件对不对？有没有漏掉什么？有没有边界情况没考虑到？

## 什么情况用 Plan Mode，什么情况直接 Code

| 适合 Plan Mode | 直接 Code Mode 更快 |
|----------------|---------------------|
| 改动跨 5 个以上文件 | 小改动（加一个函数、改一行配置） |
| 涉及数据库迁移 | 你自己知道要改什么 |
| 你对代码库不熟 | 明确的 bug 修复（有清晰的复现步骤） |
| 有架构决策需要确认 | 写单元测试 |
| 需求本身模糊、有分支选择 | 生成样板代码 |

**经验法则：如果你自己都不确定要改哪些文件，先 Plan。**

## 写出好的 Plan 提示

Planning Agent 的输出质量完全取决于你的输入。同样的任务，描述方式不同，计划质量差异很大。

**差的提示：**
```
重构认证系统
```

Planning Agent 面对这种描述只能猜，计划会很泛泛。

**好的提示：**
```
我要把用户认证从 JWT 换成 server-side session + Redis。

现状：
- 用 jsonwebtoken 生成 JWT，存在客户端 localStorage
- /api/auth/login、/api/auth/logout、/api/auth/refresh 三个接口

目标：
- 换成 express-session + Redis，session 存服务端
- 保持这三个接口的请求/响应格式不变（前端不改）
- 加 session 过期时间 24h

不动的部分：
- Google/GitHub OAuth 登录逻辑
- 密码加密方式
- 用户数据模型

先分析改动范围，写出 PLAN.md，确认后我们再开始改代码。
```

**有效提示包含：当前状态 + 目标状态 + 明确的边界（不改什么）。**

## 审核计划，拒绝"听话但走错路的 AI"

PLAN.md 生成后，重点检查这几项：

```markdown
审核 checklist：
✅ 改动文件列表是否完整、有没有漏的
✅ 步骤顺序是否合理（比如先迁移 DB 再改业务逻辑）
✅ "不改的部分"有没有正确识别边界
✅ 测试策略是否覆盖主要场景
❌ 有没有过度设计（计划一个简单功能却要引入新框架）
❌ 有没有不必要的破坏性改动
```

发现问题？直接在 Plan Mode 里说出修改意见，Planning Agent 会更新计划。满意后再切 Code Mode。

这个 Review 环节是 Planning Mode 最核心的价值——**人做架构判断，AI 做执行**，而不是把决策也甩给 AI。

## 已知限制

- 计划生成后只能整体重新生成，不支持局部编辑
- 超大型 monorepo（50+ 个目录）分析阶段可能需要 2-3 分钟
- 如果任务本身需要运行代码才能判断方案（比如性能优化），Plan Mode 帮助有限——这类任务更适合直接 Code Mode + 实验驱动
