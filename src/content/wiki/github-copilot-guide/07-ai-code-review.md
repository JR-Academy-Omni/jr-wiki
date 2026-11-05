---
title: "Copilot AI Code Review：30 秒让 AI 帮你审 PR，三档深度随需切换"
wiki: "github-copilot-guide"
order: 7
description: "GitHub Copilot 的代码审查功能让 AI 在 30 秒内审完 PR，输出 High/Medium/Low 分级评论 + 一键应用的改动建议——本章教你完整用起来"
---

## 为什么需要 AI Code Review

Code review 是开发流程里最容易拖进度的环节：等 reviewer 有空、跨时区、review 质量参差。GitHub Copilot 的代码审查功能直接在 PR 里把 AI 变成你的第一道 reviewer——30 秒内出结果，问题按严重度分级，能改的直接给 diff，你点一下就应用。

它不替代人工 review，而是帮你在请人看之前先过一遍，把低级问题、安全漏洞、风格不一致提前消掉。

## 请 Copilot 审你的 PR

最简单的用法——在 GitHub.com PR 页面：

1. 打开你的 Pull Request
2. 右侧 **Reviewers** 区域，找到 **Copilot** 那行
3. 点 **Request**
4. 等 30 秒左右，Copilot 的评论就出现了

也可以用 CLI：

```bash
# 创建 PR 时直接指定 Copilot 为 reviewer
gh pr create --reviewer @copilot

# 给已有的 PR 加 Copilot
gh pr edit 42 --add-reviewer @copilot
```

Copilot 默认提交 **Comment** 类型的 review（不是 Approve/Request Changes），所以不会影响你仓库里"需要 N 个人 Approve 才能 merge"的保护规则。

## 三档审查深度

根据 GitHub 官方文档，Copilot code review 有三个 effort 档，各有对应的平均成本：

| 档位 | 检查深度 | 平均每次费用（官方数据） |
|------|---------|----------------------|
| **Lite** | 明显问题：bug、安全漏洞、风格不一致 | ~$0.25 |
| **Balanced** | 复杂逻辑、安全敏感代码、跨服务变更 | ~$1.50 |
| **Max** | 最深度，多个高推理模型协同审查 | ~$10 |

> 官方原文："Higher effort levels use more AI credits. The page gives average costs of about $0.25 (Lite), $1.50 (Balanced), and $10 (Max) per review."（来源：GitHub 官方 Copilot code review 文档）

日常的 feature PR 用 **Balanced** 足够；改安全相关模块、做大规模重构时开 **Max**。

## 读懂 Copilot 的 Review 评论

Copilot 的每条评论都有严重度标签：

```
🔴 High   — 应该立即修复（安全漏洞、会 crash 的 bug）
🟡 Medium — 建议修复（潜在 bug、性能问题）
🔵 Low    — 可选修复（风格、可读性）
```

示例——假设你提交了这段 Python：

```python
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)
```

Copilot 的 High 评论：

```
🔴 High: SQL 注入风险
直接将 user_id 拼接进 SQL 字符串会导致 SQL 注入。
建议使用参数化查询：

- query = f"SELECT * FROM users WHERE id = {user_id}"
- return db.execute(query)
+ query = "SELECT * FROM users WHERE id = ?"
+ return db.execute(query, (user_id,))
```

这个 diff 是可以**一键应用**的——点 Copilot 评论里的 **Apply suggestion** 按钮，改动直接进入 PR 的 commit。

## 自动触发 Review

每次 push 后都手动请 Copilot 太麻烦，可以在仓库里配置自动触发。

在 GitHub 仓库 Settings → Code and automation → **Copilot** → Code review，开启 **Automatically request a review on new pull requests**。

这样每次开新 PR，Copilot 自动开审，不需要人工触发。

## 用 Custom Instructions 引导 Review

Copilot code review 也读你在第 4 章配置过的 `.github/copilot-instructions.md`，外加两个额外文件：

- **`AGENTS.md`**（项目根目录）：通用 Agent 行为规范，Copilot review 也会遵守
- **`.github/instructions/*.instructions.md`**：路径级指令，只在改动涉及对应路径时生效

实战配置示例——针对 API 层的 review 指令：

```markdown
<!-- .github/instructions/api.instructions.md -->
---
applyTo: "src/api/**"
---

## Code Review Focus for API Layer
- 所有 endpoint 必须有 input validation（Pydantic 或 Joi）
- 检查是否有缺失的 rate limiting 注解
- SQL 查询必须用参数化，不接受字符串拼接
- 返回 4xx/5xx 时必须有统一的 error response 格式
```

加了这个文件后，Copilot 在审查 `src/api/` 路径下的改动时，会额外检查这些条件——相当于把你们团队的 review checklist 自动化了。

## 在 IDE 里 Review

不只是 GitHub.com，VS Code 和 JetBrains 里也能发起 Copilot review：

**VS Code**：在 Source Control 面板，找到 Copilot Code Review 入口，点 **Review Changes**，Copilot 在侧边面板里列出所有问题，可以逐条跳转到对应代码行。

**JetBrains**（需要 Copilot 插件）：右键 diff 面板 → Request Copilot Review。

**Visual Studio**：需要 Visual Studio 17.14 或更高版本。

IDE 里的 review 特别适合在 commit 之前先过一遍自己的改动——比等推上去请 GitHub 上的 reviewer 快得多。

## 实战工作流建议

把 Copilot review 嵌进你的日常流程：

```
1. 本地写完代码
2. 在 IDE 里先用 Copilot Review 过一遍（提交前的自检）
   → 发现明显问题直接修掉
3. push + 开 PR（配置了自动触发，Copilot 自动开始 review）
4. 看 Copilot 的评论
   → High: 立刻修
   → Medium: 判断是否修（大多数建议修）
   → Low: 团队规范允许就跳过
5. 应用 Copilot 建议里的 diff（一键点 Apply）
6. 再请人工 reviewer
```

这个流程下，人工 reviewer 拿到的 PR 已经没有低级问题，可以专注在架构决策和业务逻辑上——review 效率能提高 3-5 倍。
