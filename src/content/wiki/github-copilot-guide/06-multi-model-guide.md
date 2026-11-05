---
title: "多模型选型实战：29 个模型怎么选，Auto 还是手动指定？"
wiki: "github-copilot-guide"
order: 6
description: "GitHub Copilot 2026 年已支持 29 个 AI 模型，含 GPT-6、Claude Fable、Gemini 4、Grok、Kimi——本章教你根据任务类型秒选最合适的模型"
---

## 为什么现在有 29 个模型

GitHub Copilot 刚发布时，底层只有 OpenAI 的 Codex。2024 年 10 月开始陆续引入 Anthropic、Google 等厂商的模型，到 2026 年官方模型列表已经扩展到 29 个，覆盖 OpenAI GPT-5/6 系列、Anthropic Claude 全家、Google Gemini、xAI Grok、月之暗面 Kimi、阿里 Qwen、微软 MAI-Code。

这么多选择，不是为了让你纠结——而是因为不同任务有最合适的"专家"。

## 模型速查表（按任务分类）

以下信息来自 GitHub 官方 [AI 模型对比文档](https://docs.github.com/en/copilot/reference/ai-models/model-comparison)：

| 任务场景 | 推荐模型 | 理由 |
|---------|---------|------|
| 日常编码、问问题 | **GPT-6 Sol** / **Claude Sonnet 5.5** | 平衡速度与质量，everyday 首选 |
| 长任务、大型项目 Agent | **Claude Fable 5.1** | 深度代码库研究 + 并行工具调用 + 自动验证测试 |
| 快速补全、简单问答 | **GPT-6 Luna** / **Claude Haiku 5.5** | 低成本快速响应 |
| 复杂 bug 调试、推理 | **Claude Opus 5.5** / **GPT-6.1 Sol** | 多步骤推理，适合找难以复现的 bug |
| 长上下文大代码库 | **Kimi K3** | 擅长多步骤 Agent 任务和超长上下文 |
| 有图片/截图输入 | **Claude Sonnet 4.6** / **GPT-5.6 Luna** | 原生支持图片输入 |
| 自主纠错，全自动 | **GPT-6 Astra** | 持续规划 + 自我验证，适合"扔给它跑完"的任务 |
| 通用 Agent 任务 | **GPT-5.3-Codex** | 功能、测试、重构、代码审查全能型 |

另外两个特殊选项：

- **Auto**：Copilot 根据你的问题自动选模型，适合"懒人"日常用
- **Copilot Fusion**：你选难度级别，Copilot 同时选模型 + 执行策略，适合复杂 Agent 任务

## 怎么切换模型

### VS Code

1. 打开 Copilot Chat 面板（`Ctrl+Alt+I`）
2. 对话框底部找到**当前模型名称下拉框**，点击
3. 从列表里选你要用的模型

```
┌─────────────────────────────────────────────┐
│  Copilot Chat                                │
│                                              │
│  ...                                         │
│                                              │
│  > [Claude Sonnet 5.5 ▼]  Send              │
└─────────────────────────────────────────────┘
```

注意：切换 Chat 模型不影响代码**补全**（Ghost Text），补全有自己独立的模型设置。

### JetBrains

1. 点击状态栏右下角的 Copilot 图标
2. 选择 **Open GitHub Copilot Chat**
3. 右下角有模型下拉菜单

JetBrains 对推理模型还有额外选项：可以设置 **thinking effort**（低/中/高），控制模型"思考"时间，高 effort 更准但更慢。

### 团队成员没法切换？

组织账号的 Copilot Business 用户需要管理员开放权限。管理员在 GitHub Organization Settings → Copilot → Policies 里启用 **"Allow members to change AI models"** 即可。

## 实战：同一问题用 3 个模型对比

**场景**：你有一个递归函数，在数据量大时内存溢出，需要优化。

```python
def find_all_paths(graph, start, end, path=[]):
    path = path + [start]
    if start == end:
        return [path]
    if start not in graph:
        return []
    paths = []
    for node in graph[start]:
        if node not in path:
            new_paths = find_all_paths(graph, node, end, path)
            paths.extend(new_paths)
    return paths
```

**用 Claude Haiku 5.5 问**（快，适合先摸清问题）：

```
这个递归函数会内存溢出，快速分析一下原因？
```

→ 10 秒内给出：`path = path + [start]` 每次创建新列表，路径多时内存爆炸，建议用迭代 + 生成器。

**用 Claude Opus 5.5 问**（深度推理）：

```
#selection 分析这段代码的性能瓶颈，给出迭代版本和内存复杂度对比分析
```

→ 给出完整迭代实现 + 空间复杂度分析 + BFS/DFS 对比，适合写进文档。

**用 Claude Fable 5.1 做 Agent 任务**：

```
这个项目里所有调用了 find_all_paths 的地方都换成你写的迭代版，
改完跑一下 pytest 确认没有回归
```

→ 自动扫描调用点、批量替换、验证测试——这是 Haiku/Opus 单次问答做不到的。

## 什么时候用 Auto

简单规则：

- **不确定选哪个** → 用 Auto，省心
- **知道任务类型** → 手动选，准确且不浪费 credits
- **跑长任务 Agent** → 手动选 Fable 5.1 或 GPT-6 Astra，Auto 偶尔会选轻量模型导致任务失败

## Credits 消耗提示

不同模型消耗 AI credits 的速率不同，官方文档的原话是：

> "Different models consume AI credits at different rates based on their token pricing."

具体费率见 GitHub 的 [Models and pricing](https://github.com/features/copilot/plans) 页面。经验规则：

- Luna 系列（快速/轻量）< Terra / Sol 系列 < Opus / Fable 等重型推理模型
- 免费用户的 50 条/月额度和 Pro 的 unlimited 策略只计 premium request 次数，不单独算 credits——具体看你当前的计划
- 拿不准就选 **Auto**，让 Copilot 帮你平衡效果和成本
