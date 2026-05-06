---
title: "Aider 是什么：终端里的 AI 结对编程搭档"
wiki: "aider-guide"
order: 1
description: "Aider 核心能力、Repo Map 原理、和 Cursor / Claude Code 的区别、为什么它是开源 AI 编程的最佳选择"
---

## Aider 一句话介绍

Aider 是一个开源的终端 AI 结对编程工具，由 Paul Gauthier 创建，GitHub 44k+ stars，Apache 2.0 协议。它的核心理念很简单：**在终端里跟 AI 聊天，AI 直接改你的代码，每次改动自动 git commit**。

![Aider 终端界面](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/assets/screenshot.png)

和其他 AI 编程工具不同，Aider 不绑定任何一家模型厂商。你可以接 Claude、GPT、Gemini、DeepSeek、甚至本地跑的 Ollama 模型——换个 API key 就行，模型随便切。这意味着你永远有选择权，不被任何平台锁定。

## 核心架构

Aider 的工作方式可以用三层来理解：

```
┌──────────────────────────────────┐
│         Chat Interface           │  ← 终端对话 / 浏览器 UI
├──────────────────────────────────┤
│     Repo Map (tree-sitter AST)   │  ← 代码库全局地图
├──────────────────────────────────┤
│      Git Integration Layer       │  ← 自动 commit / diff / undo
└──────────────────────────────────┘
```

- **Chat Interface**：你在终端（或浏览器模式）跟 AI 对话，描述需求或 bug，AI 直接生成代码改动
- **Repo Map**：Aider 用 tree-sitter 解析整个代码库的 AST，生成一份精简的"地图"——包含所有文件的类名、函数签名、类型定义。这份地图每轮对话都会发给模型，让 AI 知道项目全貌，不只看你手动添加的文件
- **Git Layer**：每次 AI 改代码，Aider 自动生成一条语义化的 commit message 并提交。改错了？`/undo` 一键回滚。所有改动都有 git 历史可追溯

## 和 Cursor、Claude Code 的区别

2026 年 AI 编程工具三大流派：GUI IDE（Cursor/Windsurf）、终端 Agent（Claude Code）、终端结对编程（Aider）。

| 特性 | Aider | Cursor | Claude Code |
|------|-------|--------|-------------|
| 本质 | 开源终端工具 | VS Code fork IDE | Anthropic 官方终端 Agent |
| 模型支持 | 100+ 模型随便切 | 内置几家主流 | 只用 Claude |
| 费用 | 免费 + 自付 API | $0-200/月订阅制 | $20-100/月订阅 |
| Git 集成 | 自动 commit，每步可回滚 | Checkpoint 快照 | 自动 commit |
| 独家能力 | Architect 双模型、Repo Map | Background Agent、Tab 补全 | Extended Thinking |
| Token 效率 | 高（diff 格式省 4x token） | 中等 | 较高 |
| 上手门槛 | 需要终端经验 | 零门槛 GUI | 需要终端经验 |

实际选型建议：

- **日常写业务代码**：Cursor 体验最丝滑，GUI + Tab 补全 + 插件生态无敌
- **大型重构和复杂推理**：Claude Code 的 Extended Thinking 碾压
- **想省钱 + 想自由切模型**：Aider 是唯一选择——工具免费，API 费用透明可控
- **最佳组合**：Cursor 写代码 + Aider 做 review 和重构，两者互补

```bash
# 三者定位速查
# GUI 党 + 预算充足     → Cursor
# 终端党 + Claude 深度用户 → Claude Code
# 终端党 + 多模型 + 省钱   → Aider
# 高阶玩法：Cursor + Aider 双开
```

## 谁适合用 Aider

- **终端重度用户**：tmux / zsh / Vim 党，不想离开终端就能让 AI 改代码
- **预算敏感的开发者**：工具本身免费，API 费用按需付，月均 $50-200 就能高强度使用
- **多模型玩家**：今天用 Claude Sonnet 写代码，明天用 DeepSeek 省钱，后天试 Gemini 的长上下文——一个工具全搞定
- **开源贡献者**：Aider 本身就是开源的，社区活跃，PR 欢迎，你可以自己加功能
- **CI/CD 集成需求**：终端工具天然适合脚本化，可以嵌入自动化流程

不太适合：完全不用终端的人（建议先看我们的 [Cursor 指南](/wiki/cursor-guide)）；只用一家模型且预算不是问题的人（Claude Code 更省心）。
