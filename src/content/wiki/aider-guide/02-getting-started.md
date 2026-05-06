---
title: "安装配置：10 分钟跑起来你的第一个 Aider 项目"
wiki: "aider-guide"
order: 2
description: "Aider 安装方式、API Key 配置、连接 Claude / GPT / DeepSeek / 本地模型、第一个实战项目"
---

## 安装 Aider

Aider 是 Python 包，要求 Python 3.10-3.12。推荐用官方安装器，一行命令搞定：

![Aider 浏览器模式界面](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/assets/browser.jpg)

```bash
# 方式一：官方安装器（推荐，自动处理依赖）
python -m pip install aider-install && aider-install

# 方式二：pipx（隔离环境，不污染系统 Python）
pipx install aider-chat

# 方式三：Homebrew（macOS，可能落后上游 1-2 周）
brew install aider

# 方式四：pip 直接装
pip install aider-chat
```

验证安装：

```bash
aider --version
# aider v0.86.2
```

## 配置 API Key

Aider 本身免费，但需要你自己的 LLM API key。支持三种配置方式：

### 方式一：环境变量（推荐）

```bash
# 在 .bashrc / .zshrc 里加：
export ANTHROPIC_API_KEY=sk-ant-xxx     # Claude
export OPENAI_API_KEY=sk-xxx            # GPT
export DEEPSEEK_API_KEY=xxx             # DeepSeek
export GEMINI_API_KEY=xxx               # Gemini
```

### 方式二：命令行参数

```bash
aider --api-key anthropic=sk-ant-xxx
aider --api-key openai=sk-xxx
```

### 方式三：配置文件

在项目根目录或 `~` 下创建 `.aider.conf.yml`：

```yaml
# .aider.conf.yml
anthropic-api-key: sk-ant-xxx
model: sonnet
auto-commits: true
dark-mode: true
```

## 连接不同模型

Aider 支持 100+ 模型，这里列几个最常用的：

```bash
# Claude Sonnet（性价比之王，日常首选）
aider --model sonnet

# Claude Opus（最强推理，复杂任务用）
aider --model opus

# GPT-4o
aider --model gpt-4o

# DeepSeek（便宜，中文好）
aider --model deepseek

# Google Gemini（超长上下文 200k）
aider --model gemini/gemini-2.5-pro

# 本地模型（Ollama）
aider --model ollama/deepseek-coder-v2
```

切模型就是换个参数，不用改任何代码或配置。这是 Aider 最大的灵活性优势。

## 第一个项目实战

来，10 分钟做一个 Flask TODO API：

```bash
# 1. 创建项目目录
mkdir my-todo-api && cd my-todo-api
git init

# 2. 启动 Aider（用 Claude Sonnet）
aider --model sonnet
```

进入 Aider 后，直接用自然语言描述需求：

```
> 用 Flask 创建一个 TODO API，要有增删改查四个接口，
  数据存内存就行。加上基本的错误处理和 JSON 响应。
```

Aider 会自动：
1. 创建 `app.py`，写好完整的 Flask 应用
2. 创建 `requirements.txt`，列出依赖
3. 自动 `git add` + `git commit`，commit message 是 AI 生成的语义化描述

你可以继续聊：

```
> 加个 /health 健康检查接口，再写几个 pytest 测试用例

> /run pip install -r requirements.txt
> /run python app.py
> /test pytest
```

每一步改动都自动 commit，改错了随时 `/undo`。

## 浏览器模式

不想在终端里看代码？Aider 还有浏览器模式：

```bash
aider --browser --model sonnet
```

会自动打开 `http://localhost:8501`，在浏览器里有个更友好的聊天界面，左边文件树，右边对话框。功能和终端模式完全一样，只是 UI 更直观。

## 项目级配置

在项目根目录放 `.aider.conf.yml`，团队成员 clone 下来就能用统一配置：

```yaml
# .aider.conf.yml — 项目级配置示例
model: sonnet
weak-model: haiku
auto-commits: true
dark-mode: true
lint-cmd: "ruff check"
test-cmd: "pytest -x"
map-tokens: 2048
```

关键配置说明：

| 配置项 | 作用 | 推荐值 |
|--------|------|--------|
| `model` | 主模型 | `sonnet`（性价比）或 `opus`（复杂任务） |
| `weak-model` | 轻量任务模型（commit msg、摘要） | `haiku`（最便宜） |
| `auto-commits` | 是否自动提交 | `true` |
| `map-tokens` | Repo Map token 预算 | `2048`（中大型项目） |
| `lint-cmd` | lint 命令 | 按项目配 |
| `test-cmd` | 测试命令 | 按项目配 |

配置文件搜索顺序：`~/.aider.conf.yml` → 项目 git 根目录 → 当前目录。后面的覆盖前面的，所以项目配置优先级最高。
