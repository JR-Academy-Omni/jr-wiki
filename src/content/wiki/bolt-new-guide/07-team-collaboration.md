---
title: "bolt.new 团队协作工作流：GitHub 集成、Code Review 与项目权限"
wiki: "bolt-new-guide"
order: 7
description: "多人同时用 bolt.new 开发时如何分工不打架：feature branch 策略、PR code review 流程、GitHub Actions CI 配置和团队权限管理"
---

多人用 bolt.new 协作，第一个坑就是 auto-commit。bolt.new 每隔 30 秒会自动把你的改动提交到当前分支。如果你和队友都在同一个分支上工作，你的提交就会覆盖他的，或者触发频繁的拉取冲突。这章把团队工作流从头捋一遍。

![GitHub and Bolt.new: Syncing Your Code](https://img.youtube.com/vi/FbSNUjFYDXs/maxresdefault.jpg)

## bolt.new 的 GitHub 同步机制

了解这几个行为，后面的工作流才好理解：

- **Auto-commit**：每次 AI 生成的改动不破坏项目时，bolt.new 会自动提交到当前分支。不是你点"保存"，是 bolt 自己判断什么时候该提交
- **双向同步**：bolt.new 每 30 秒检查一次 GitHub，把外部提交拉进来。你在本地用 VS Code 改了代码推上 GitHub，bolt.new 会自动拉取
- **合并只能在 GitHub 里做**：bolt.new 里没有 Merge PR 按钮，分支合并必须去 GitHub 操作

这个机制设计的初衷是单人快速迭代。两个人在同一个分支上同时用 bolt.new 的话，30 秒一次的 auto-commit 会交替覆盖彼此的工作——bolt A 提交，bolt B 检测到更新拉取，然后 bolt B 的改动提交，bolt A 再拉取……不是说不能用，但频繁的 rebase 噪音会让 commit 历史变得很难看。

---

## 初始设置：连接 GitHub 仓库

先把项目和 GitHub 仓库绑定。如果项目已经在 bolt.new 里，界面左上角找 **GitHub** 图标，点击后会引导你授权。

有两种连接方式：

**方式 A：从 bolt.new 推到新仓库**

在 bolt.new 里点 GitHub 图标 → **Push to GitHub** → 填仓库名 → 选 Private 或 Public → 创建并推送。

**方式 B：导入已有仓库**

如果代码已经在 GitHub 上，在 bolt.new 首页选 **Import from GitHub** → 输入仓库 URL → bolt 会把代码拉进来并开始同步。

---

## 团队工作流：feature branch 策略

解决多人协作冲突的核心是：**每个人在独立的 feature branch 上工作，只有 main（或 develop）是受保护的**。

### 保护 main 分支

在 GitHub 仓库 → **Settings** → **Branches** → **Add branch protection rule**，填 `main`，勾选：

- ✅ Require a pull request before merging
- ✅ Require approvals（1 人审批就够，小团队可以设为 1）
- ✅ Require status checks to pass（接了 CI 之后再开）
- ✅ Do not allow bypassing the above settings（admin 也要走 PR，不然规则形同虚设）

保护好 main 之后，任何人（包括 bolt.new 的 auto-commit）都不能直接 push 到 main。

### 每个功能新建一个分支

在 bolt.new 里找 **Git** 面板切换分支，或者在本地建好推上去让 bolt 识别：

```bash
git checkout -b feat/user-auth
git push -u origin feat/user-auth
```

在 bolt.new 里切换到这个分支，开始让 AI 写功能。bolt 的 auto-commit 只会往 `feat/user-auth` 上提交，不碰 main。

---

## Code Review：在 GitHub 里做

bolt.new 里没有 code review 界面，所有审查在 GitHub 的 Pull Request 里完成。

### 开 PR

功能做得差不多了，在 GitHub 上开 PR：`feat/user-auth` → `main`。

**PR description 建议模板：**

```markdown
## 做了什么
用 Supabase Auth 实现邮箱注册/登录

## 怎么测
1. 本地 `npm run dev`
2. 点注册，填邮箱密码
3. 检查 Supabase 控制台 auth.users 表有新记录
4. 退出后重新登录能正常进入

## 截图
（如果有 UI 改动贴截图）
```

### Reviewer 看什么

AI 生成的代码质量参差不齐，review 时重点关注：

**安全**
- 环境变量是不是硬编码进了代码（`SUPABASE_URL = "https://..."` 直接写死是事故）
- RLS policy 有没有漏洞（`using (true)` 意味着任何人都能读，常见 AI 生成的坑）
- 用户输入有没有做验证（AI 经常跳过 input sanitization）

**类型安全**
- TypeScript 类型有没有偷懒用 `any`
- API 返回值有没有正确处理 null / undefined

**代码逻辑**
- 状态管理有没有竞争条件（比如两个并发请求同时修改同一个状态）
- 错误处理有没有静默吞掉（`catch (e) {}` 什么都不做是 AI 的坏习惯）

### Review 评论的处置

Reviewer 留了评论后，把内容贴给 bolt.new 的 AI 处理：

```
[把 review 评论内容粘贴进 bolt 的 chat]

请根据这条 review 意见修改代码。
改好之后不要改其他东西。
```

bolt 改完会自动提交到 feature branch，GitHub 的 PR 会实时更新，reviewer 可以直接 resolve thread。

---

## GitHub Actions CI：给 PR 加自动检查

每次 PR 跑一遍 lint 和类型检查，比人眼 review 更可靠。

在仓库里新建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

推上 GitHub 后，每次开 PR，Actions 会自动跑这三步。在 branch protection rule 里把 `check` 这个 job 加到 **Required status checks**，就能确保 CI 不通过时 PR 无法合并——哪怕是 repo owner。

CI 对 AI 生成的代码特别有价值：bolt 写的代码有时候类型对不上，或者 import 了不存在的路径，build 报错但 preview 里看起来正常。CI 在这时能帮你拦住。

---

## 项目权限管理

### Teams 计划的权限层级

bolt.new 的 Teams 计划（$27/月/人，按年计费）提供集中计费和细粒度的访问控制：

| 角色 | 权限 |
|------|------|
| Owner | 计费、添加/删除成员、删除项目 |
| Admin | 管理项目访问、部署设置 |
| Member | 开发和查看被分配的项目 |
| Viewer | 只读，可以 fork 不能改 |

小团队（3-5 人）通常只用 Owner + Member 两个角色就够了。

### GitHub 组织级 App 安装

如果你的 GitHub 仓库在组织下（比如 `github.com/my-company/my-app`），在 GitHub → **Settings** → **Integrations** → **GitHub Apps** 里找 bolt.new，选择安装到组织，然后指定哪些仓库对 bolt 可见。

这样做的好处：只有被显式授权的仓库才能在 bolt.new 里访问，不会把全公司所有代码都暴露给 bolt 的 AI。

### 仓库访问最小化

当你在 bolt.new 里授权 GitHub 时，尽量选 **Only select repositories**，而不是 **All repositories**。只把 bolt 需要读写的仓库加进来。这条规则对所有第三方 GitHub App 都适用，不只是 bolt。

---

## 实际团队分工模式

以一个 3 人小团队（产品 + 前端 + 后端）为例：

**产品**（不写代码）
- 用 bolt.new 做原型，把 UI 想法做成可点击的 demo
- 把 demo 导出到专门的 `design-poc` 分支，开 PR 给开发看
- PR 不合并，只用来展示设计意图

**前端**
- 从 `main` 拉 `feat/xxx-ui` 分支，在 bolt.new 里让 AI 把产品的 design-poc 实现成真正的组件
- 完成后开 PR，让后端 review 接口调用部分

**后端**
- 在本地（VS Code 或 Cursor）写 API，push 到 `feat/xxx-api` 分支
- bolt.new 会自动拉取更新，前端开发可以立刻在 bolt 的预览里看到 API 变化

这个分工的关键：**bolt.new 做的改动走 feature branch + PR，后端也同样，main 永远是可部署的状态**。

---

## 常见问题

**问：bolt.new 的 auto-commit 把 commit 历史搞乱了，怎么清理**

开 PR 之后合并时选 **Squash and merge**，把 feature branch 上所有 bolt 的 auto-commit 压成一个干净的 commit 进 main。main 的历史就是一条线，每个 commit 对应一个完整功能。

**问：两个人同时在一个 feature branch 上工作怎么办**

不建议这样做。如果功能大到需要两个人同时开发，把它拆成两个子功能分别开 branch，最后合并。实在没法拆，至少约定一个人用 bolt.new，另一个人用本地 IDE，避免两个 bolt.new 实例同时 auto-commit 到同一个分支。

**问：bolt.new 连接 GitHub 组织账号时报错**

在 GitHub → **Settings** → **Applications** → **Authorized OAuth Apps** 里找 bolt.new，点 **Revoke** 再重新授权，授权时明确选择组织。如果组织管理员没有审批 Third-party access，要让管理员先在组织的 Settings 里开启 **Third-party access** 权限。

**问：CI 里 build 失败但 bolt.new 的 preview 显示正常**

bolt.new 的 preview 用的是开发模式（vite dev server），类型错误和某些 import 问题在开发模式下不会报错。CI 跑的是 `vite build`，用生产模式，会抛出开发模式忽略的错误。碰到这种情况，把 CI 的报错信息贴给 bolt.new 的 AI：

```
CI build 失败，报错如下：
[贴报错信息]

请修复这个 build 错误，不要改其他代码。
```
