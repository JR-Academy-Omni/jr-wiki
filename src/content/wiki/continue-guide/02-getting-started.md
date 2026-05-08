---
title: "Continue 安装与配置：10 分钟跑起你的第一个 AI 助手"
wiki: "continue-guide"
order: 2
description: "从安装 Continue 扩展到配置第一个 AI 模型，包括云端 API 和本地 Ollama 两种方案的完整流程"
---

Continue 的安装本身只需要 30 秒，但选对模型、调好配置才是真正影响体验的地方。这一章手把手带你从零开始，把 Continue 跑起来。

![Continue 安装与设置](https://img.youtube.com/vi/C1g4_YQJEg8/maxresdefault.jpg)

## 第一步：安装扩展

**VS Code：**

1. 打开 Extensions 面板（`Ctrl+Shift+X`）
2. 搜索 `Continue`
3. 找到 Continue.continue（发布者是 Continue），点 Install
4. 安装完成后右侧会出现 Continue 侧边栏图标

**JetBrains（IntelliJ / PyCharm / WebStorm）：**

1. `File → Settings → Plugins → Marketplace`
2. 搜索 `Continue`
3. 点 Install，重启 IDE

装好之后，Continue 会引导你登录 Continue Hub 或者直接跳过进入本地配置。

## 第二步：选择你的模型方案

Continue 支持两种模式，你可以按需选择，也可以混合使用。

### 方案 A：云端 API（推荐新手）

最快的上手方式——用 Anthropic、OpenAI 或其他云服务的 API Key。

打开配置文件（VS Code 里按 `Ctrl+Shift+P` 输入 `Continue: Open Config`），编辑 `config.yaml`：

```yaml
models:
  - name: Claude Sonnet 4
    provider: anthropic
    model: claude-sonnet-4-6
    apiKey: sk-ant-api03-xxxxxxxxxxxx
    roles:
      - chat
      - edit
      - agent

  - name: GPT-4o
    provider: openai
    model: gpt-4o
    apiKey: sk-xxxxxxxxxxxx
    roles:
      - chat
```

保存即生效，不需要重启 IDE。Chat 面板顶部的模型下拉菜单里就能看到你配置的模型了。

### 方案 B：本地模型（Ollama，完全免费 + 离线）

如果你不想把代码发到云端，或者单纯想省钱，Ollama + Continue 是完美组合。

先装 Ollama（macOS / Linux / Windows 全平台支持）：

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# 拉一个编程专用模型
ollama pull qwen2.5-coder:7b

# 验证模型跑起来了
ollama list
```

然后在 `config.yaml` 里加上：

```yaml
models:
  - name: Qwen 2.5 Coder
    provider: ollama
    model: qwen2.5-coder:7b
    roles:
      - chat
      - edit
      - autocomplete
```

本地模型的响应速度取决于你的硬件。8GB 显存的 GPU 跑 7B 模型体验不错；如果只有 CPU，建议用 3B 或更小的模型做 Autocomplete。

## 第三步：验证安装

装好模型后，做三个快速测试：

1. **Chat 测试**：按 `Ctrl+L` 打开 Chat，输入"用 Python 写一个快排"，确认有响应
2. **Edit 测试**：选中一段代码，按 `Ctrl+I`，输入"加上错误处理"，确认代码被修改
3. **Autocomplete 测试**：开一个新文件开始写代码，看看是否有 inline 补全建议（按 `Tab` 接受）

如果 Chat 没反应，大概率是 API Key 有问题或者 Ollama 没启动。按 `Ctrl+Shift+P` 搜索 `Continue: View Logs` 查看日志排查。

## 配置文件结构速查

`config.yaml` 位于 `~/.continue/` 目录下（全局配置），或者项目根目录的 `.continue/` 里（项目级配置覆盖全局）。核心结构：

```yaml
# 模型配置
models:
  - name: 显示名称
    provider: anthropic | openai | ollama | gemini | ...
    model: 模型 ID
    apiKey: 你的 Key（本地模型不需要）
    roles: [chat, edit, autocomplete, agent]

# 上下文提供器
context:
  - provider: file       # @file 引用文件
  - provider: terminal   # @terminal 引用终端输出
  - provider: url        # @url 抓取网页

# MCP 工具服务器（Agent 模式用）
mcpServers:
  - name: filesystem
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
```

**小贴士**：`config.yaml` 支持热重载——改完保存就生效，不用重启。如果之前用的是老版 `config.json`，Continue 会自动提示你迁移到 YAML 格式。
