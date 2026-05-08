---
title: "Continue 是什么：开源 AI 编程助手的自由之选"
wiki: "continue-guide"
order: 1
description: "理解 Continue 的核心定位、与 Cursor/Copilot 的本质区别，以及为什么开发者需要一个真正开放的 AI 编码工具"
---

Continue 是一个开源的 AI 编程助手，装在 VS Code 或 JetBrains 里，给你 Chat、Autocomplete、Edit、Agent 四种模式——关键是，你可以自由选择背后的 AI 模型，从 Claude 到 GPT-4 到本地跑的 Ollama，完全由你决定。

![Continue VS Code 界面](https://img.youtube.com/vi/XADG-qsFafg/maxresdefault.jpg)

## 为什么 Continue 值得关注

GitHub 上 33,000+ Stars，VS Code 安装量超过 250 万，Apache 2.0 开源协议。这几个数字说明了一件事：开发者社区对"不被锁定在某个供应商"的 AI 编码工具有巨大需求。

Continue 的核心理念是**模型无关**（model-agnostic）。Cursor 很好用，但你用的是它内置的模型配额；GitHub Copilot 很方便，但你必须用 GitHub 的服务。Continue 不一样——它是一个"接口层"，你自己选模型、选供应商，甚至可以完全离线运行。

## 四大核心模式

| 模式 | 快捷键 | 干什么 |
|------|--------|--------|
| **Chat** | `Ctrl+L` | 在侧边栏和 AI 对话，问问题、生成代码 |
| **Autocomplete** | `Tab` | 输入时自动补全代码建议 |
| **Edit** | `Ctrl+I` | 选中代码后用自然语言指令修改 |
| **Agent** | Chat 里切换 | 自主执行多步任务：读文件、改代码、跑命令 |

一个 `config.yaml` 就能把四种模式分别绑定到不同的模型上——Chat 用 Claude Sonnet，Autocomplete 用本地的 Qwen 2.5 Coder，Edit 用 GPT-4o，各司其职：

```yaml
models:
  - name: Claude Sonnet
    provider: anthropic
    model: claude-sonnet-4-6
    apiKey: sk-ant-xxx
    roles:
      - chat
      - agent

  - name: Qwen 2.5 Coder
    provider: ollama
    model: qwen2.5-coder:7b
    roles:
      - autocomplete
```

## 与 Cursor 和 GitHub Copilot 的对比

| 维度 | Continue | Cursor | GitHub Copilot |
|------|----------|--------|----------------|
| **开源** | Apache 2.0 完全开源 | 闭源 | 闭源 |
| **定价** | 核心免费，只付 API 费 | $20/月 Pro | $10/月 Individual |
| **模型选择** | 任意模型，包括本地 | 内置 + BYOK | 内置 + 部分 BYOK |
| **IDE 支持** | VS Code + JetBrains | Cursor IDE（VS Code fork） | VS Code + JetBrains + 更多 |
| **离线使用** | 搭配 Ollama 完全离线 | 不支持 | 不支持 |
| **数据隐私** | 代码不出本地（本地模型） | 代码发送到云端 | 代码发送到云端 |
| **Agent 模式** | 有，支持 MCP 工具 | 有，Composer | 有，Copilot Agent |

**我的看法**：如果你在意隐私（比如做企业内部项目、处理敏感代码），或者你的团队有特定的模型偏好（比如只能用 DeepSeek），Continue 是目前唯一靠谱的选择。Cursor 的体验确实更丝滑，但你要为此放弃 IDE 的灵活性。

## 谁适合用 Continue

**特别适合：**
- 在意代码隐私、需要离线开发的团队
- 想用最新的 Claude / GPT 模型但不想付 IDE 月费的开发者
- JetBrains 用户（IntelliJ、PyCharm、WebStorm 全支持）
- 喜欢折腾配置、追求极致自定义的技术人

**可能不适合：**
- 零配置开箱即用型用户（Cursor 或 Copilot 更省心）
- 不愿意管理 API Key 或部署本地模型的人
