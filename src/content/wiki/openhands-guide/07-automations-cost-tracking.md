---
title: "Automations 与成本追踪：让 Agent 定期自动跑"
wiki: "openhands-guide"
order: 7
description: "OpenHands Automations：定时（cron）+ 事件驱动（webhook）自动触发 Agent，Activity Log 查看每次对话的真实 LLM 费用"
---

## 从"用的时候才开"到"自动跑"

OpenHands 默认是交互式工具——你打开浏览器，输任务，等结果。但很多场景不需要人在旁边：

- 每天早上扫描新 Issue，自动打标签分类
- 每次 PR 被 Review 后，检查是否有漏写测试
- 每周一生成代码健康度报告
- 每晚对暂存代码跑安全扫描

这就是 **Automations** 的用途：把一次性任务变成定期运行的工作流，你不在电脑旁也能跑。

## 创建定时自动化（Cron 触发）

在 OpenHands Cloud（[app.openhands.dev](https://app.openhands.dev)），进入 **Automations** → **New Automation**。

**示例：每天早上自动整理新 Issue**

```
名称：Daily Issue Triage
触发：定时（Cron）
Cron 表达式：0 9 * * 1-5      # 工作日 09:00 UTC
任务描述：
  扫描这个 GitHub repo 里所有 state=open 且没有 label 的 Issue，
  根据标题和描述内容给每个 Issue 打上对应标签：
  - bug：描述中有报错信息或"不正常""失败""报错"
  - feature：描述中有"希望""支持""增加"等
  - docs：涉及文档、注释、说明
  只打标签，不关闭 Issue，不回复评论。
  
模型：claude-haiku-4-5        # 例行任务用便宜模型
Max iterations：30
```

保存后，Automations 面板会显示下次触发时间和历史运行记录。

## 事件驱动触发（Webhook）

除定时外，还可以响应 GitHub 事件。进入 Automation 设置 → Trigger → **Webhook**，复制生成的 Webhook URL，然后在 GitHub 仓库的 Settings → Webhooks 里注册：

```
Payload URL：https://api.openhands.dev/webhooks/automation/{your-id}
Content type：application/json
触发事件：Pull requests（选 review_requested）
```

**示例：PR Review 请求后自动检查测试覆盖**

```
触发：Webhook（PR review_requested 事件）
任务描述：
  检查这个 PR 的 diff 里改动的函数，确认每个改动的函数
  都有对应的单元测试。
  
  如果发现有函数改动但没有对应测试更新，
  在 PR 评论里列出缺少测试的函数名（格式：文件名:函数名），
  并说明测试应该覆盖的场景。
  
  如果所有改动都有对应测试，不需要发评论。
  
模型：claude-sonnet-4         # 代码审查需要更强的推理
Max iterations：20
```

这个 Automation 每次有人发起 Review 请求时自动触发，不需要人工运行。

## Activity Log：每次跑了多少钱，一目了然

**v1.11（2026 年 8 月）**加了一个长期缺失的功能：**Activity Log 里直接显示每次对话的 LLM 费用**。

进入 Activity Log 页面，每行记录包含：

```
日期时间          | 任务名               | 状态 | 模型              | Token用量 | 费用
2026-08-13 09:00 | Daily Issue Triage   | ✅   | claude-haiku-4-5  | 42K       | $0.04
2026-08-12 09:01 | Daily Issue Triage   | ✅   | claude-haiku-4-5  | 38K       | $0.04
2026-08-11 15:30 | 手动任务             | ✅   | claude-sonnet-4   | 156K      | $0.62
2026-08-11 14:02 | PR Review Checker    | ❌超时| claude-sonnet-4  | 89K       | $0.36
```

右上角点 **Export CSV** 可以导出，放进 Excel 做月度成本分析。

## 成本控制：按任务等级选模型

最有效的省钱策略：**不同任务用不同等级的模型**。

```toml
# config.toml — 多模型配置
[llm]
# 主任务：复杂推理、代码架构分析
model = "anthropic/claude-sonnet-4-20250514"
api_key = "sk-ant-xxx"

[llm.routine]
# 例行任务：Issue 分类、格式检查、文档生成
model = "anthropic/claude-haiku-4-5-20251001"
api_key = "sk-ant-xxx"

[llm.local]
# 敏感代码：本地运行，API 费用为零
model = "openai/qwen3-coder:30b"
api_key = "dummy"
base_url = "http://host.docker.internal:11434/v1"
```

**参考成本估算：**

| 使用场景 | 推荐模型 | 每次任务 | 月成本估算 |
|---------|---------|---------|-----------|
| 复杂功能开发（每天 5 次） | Sonnet 4 | $0.30-0.80 | $45-120 |
| Issue 分类自动化（每天 1 次） | Haiku 4.5 | $0.03-0.08 | $1-3 |
| PR 测试检查（每天 10 次 PR） | Haiku 4.5 | $0.05-0.15 | $15-45 |
| 本地模型（全部） | Qwen3-Coder 30B | $0 | 只算电费 |

## Activity Log 异常排查

Activity Log 里找 token 用量异常高的记录（单次超过 200K token），通常来自以下原因：

**原因 1：任务描述太模糊，Agent 反复尝试**

```
# 差：
openhands -t "修一下那个 bug"

# 好：
openhands -t "修复 src/auth.ts 第 42 行的空指针异常，
复现步骤：调用 login() 时 user 对象没有 email 字段时抛错。
修复方案：加 optional chaining，user?.email"
```

**原因 2：没有设置迭代上限**

```toml
# config.toml — 必加，尤其是 Automation 场景
[core]
max_iterations = 50      # 50 步还没搞定，就停下来

[condenser]
type = "llm"
max_size = 80            # 超过 80 条事件，用便宜模型压缩历史
```

**原因 3：大文件被完整塞进上下文**

OpenHands 读大文件（>1000 行）时会全量传入上下文。如果你的项目有超大文件，在任务描述里明确告诉它只看哪些部分：

```
只看 src/api/routes.ts 里 /auth/* 相关的路由，不用读整个文件
```

## Automations 的适用场景与局限

**最适合自动化的任务：**
- 有明确判断标准的检查（测试覆盖、lint 错误、依赖更新）
- 格式化和分类工作（Issue 标签、PR 描述补全）
- 定期报告生成（代码统计、dependency audit）
- 重复性的、规则清晰的代码改动（批量 API 版本升级）

**不适合自动化的任务：**
- 需要理解业务背景的功能开发（Agent 没有你的产品知识）
- 涉及多团队协调的改动
- 任何会直接 merge 到 main 的操作（Automation 产出应该是 Draft PR，人工 Review 后再 merge）

**一个安全原则：Automation 只产 PR，不 merge。** 让 Agent 负责"写建议"，人负责"做决策"。
