---
title: "常见问题、定价与选型建议"
wiki: "aider-guide"
order: 5
description: "Aider 常见问题解答、API 费用对比、和 Cursor / Claude Code / Windsurf 的选型决策树"
---

## 常见问题

### Aider 改错了代码怎么办？

`/undo` 一键回滚。Aider 的每次改动都是一个独立的 git commit，`/undo` 就是 `git revert` 最近那条 AI commit。你的手动 commit 不会被动到。

![Aider 模型排行榜](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/assets/leaderboard.jpg)

```bash
# 撤销最近一次 AI 改动
> /undo

# 撤销后觉得不对，还能再回来
> /git reflog
> /git checkout <commit-hash> -- <file>

# 如果整轮对话都跑偏了
> /clear
> /git stash  # 暂存当前改动
```

### 可以用免费模型吗？

可以。几种免费方案：

1. **Ollama 本地模型**：完全免费，但效果取决于模型大小和你的硬件
2. **DeepSeek**：极其便宜（约 GPT-4o 的 1/50 价格），几乎等于免费
3. **Google Gemini**：有免费额度，用完再付费

```bash
# Ollama 本地模型（完全免费，需要本地 GPU）
ollama pull deepseek-coder-v2
aider --model ollama/deepseek-coder-v2

# DeepSeek API（极便宜）
aider --model deepseek --api-key deepseek=xxx
```

### 中文支持如何？

Aider 对中文支持良好：
- 可以用中文描述需求、中文写注释
- Commit message 可以用中文（AI 会跟随你的语言）
- 代码变量名建议用英文，中文变量名在某些编译器里有问题

用 DeepSeek 模型时中文理解特别好，毕竟是中国团队训练的。

### Aider 能处理多大的项目？

Repo Map 让 Aider 能有效处理大型项目。实测：
- **小项目（<50 文件）**：丝滑，Repo Map 能覆盖全部
- **中型项目（50-500 文件）**：良好，需要合理 `/add` 和 `/drop`
- **大型项目（500+ 文件）**：可用，但要增加 `map-tokens`，且要精准 `/add` 相关文件
- **Monorepo**：建议在子目录启动 Aider，缩小作用范围

```bash
# 大型项目启动建议
cd my-monorepo/packages/backend
aider --model sonnet --map-tokens 4096
```

### 和 Git 分支怎么配合？

Aider 在当前分支上操作。推荐的工作流：

```bash
# 开一个功能分支
git checkout -b feat/add-auth

# 在分支上启动 Aider
aider --model sonnet

# AI 的所有 commit 都在这个分支上
# 做完后正常 PR / merge
git push -u origin feat/add-auth
```

### 网络断了怎么办？

Aider 的对话历史保存在本地（`.aider.chat.history.md`）。断网只影响 API 调用，重连后继续聊就行。已经 commit 的代码改动不会丢。

### Windows 能用吗？

能用，但推荐 WSL2。原生 Windows 有时候 tree-sitter 编译会出问题。

```bash
# Windows 推荐方式
wsl --install
# 进入 WSL 后正常 pip install
pip install aider-chat
```

## 定价对比（2026 年）

Aider 本身免费，费用来自 API 调用。和订阅制工具的对比：

| 工具 | 月费模型 | 轻度用户月费 | 重度用户月费 | 模型自由度 |
|------|----------|-------------|-------------|-----------|
| **Aider** | 按 API 用量 | $50-100 | $300-600 | 100+ 模型随意切 |
| **Cursor** | 订阅制 | $0-20 | $60-200 | 内置几家 |
| **Claude Code** | 订阅制 | $20 | $100 | 只有 Claude |
| **Windsurf** | 订阅制 | $0-10 | $60 | 内置几家 |

关键区别：
- **Aider 轻度用户可能比订阅制贵**——因为 API 按量付费，偶尔用也有成本
- **Aider 重度用户反而可能更便宜**——订阅制工具有用量上限（Cursor 的 credit 用完要加钱），Aider 没有人为限制
- **Aider 可以随时切便宜模型降本**——今天赶项目用 Opus，明天写文档用 DeepSeek

## 选型决策树

```
你需要 AI 编程工具？
├── 完全不用终端 → Cursor 或 Windsurf
├── 用终端但只用 Claude → Claude Code
├── 用终端且想要：
│   ├── 多模型自由切换 → Aider ✅
│   ├── 费用完全透明可控 → Aider ✅
│   ├── 开源可定制 → Aider ✅
│   └── 最强 AI 推理能力 → Claude Code
└── 预算情况：
    ├── 月费 <$20 → Windsurf 免费版 或 DeepSeek + Aider
    ├── 月费 $20-60 → Cursor Pro 或 Claude Code
    └── 月费 >$100 → Aider + Opus（无上限）
```

## 社区与资源

- **GitHub**：`github.com/Aider-AI/aider`（44k+ stars，活跃维护）
- **官方文档**：`aider.chat/docs`（最权威的参考）
- **Discord**：官方 Discord 社区，提问响应快
- **Leaderboard**：`aider.chat/docs/leaderboards`（选模型必看）
- **配置参考**：`aider.chat/docs/config`（所有配置项文档）

```bash
# 升级到最新版
pip install --upgrade aider-chat

# 查看当前版本
aider --version

# 查看所有可用命令
aider --help
```

## 写在最后

Aider 的哲学是：**工具免费开源，模型你自己选，费用你自己控**。它不会像订阅制工具那样给你一个月度账单然后限制用量，而是把控制权完全交给你。

对于中国开发者来说，Aider + DeepSeek 是一个极具性价比的组合——工具免费、API 便宜、中文效果好。如果追求最强效果，Aider + Claude Opus 的 Architect Mode 是目前开源方案里的天花板。

不确定从哪开始？跑一遍第二章的 Flask TODO 项目，10 分钟就能感受到 Aider 的魅力。
