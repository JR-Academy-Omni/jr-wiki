---
title: "进阶技巧：Architect Mode、成本优化和实战工作流"
wiki: "aider-guide"
order: 4
description: "Aider Architect 双模型策略、模型选型与 Benchmark、Token 成本优化、配置文件高级用法、五大实战工作流"
---

## Architect Mode 深度解析

Architect Mode 是 Aider 的杀手级功能——两个模型协作，一个负责思考，一个负责编码。

![Aider Architect Mode 基准测试](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/assets/architect.jpg)

### 最佳模型搭配

```bash
# 搭配一：性价比之王
aider --architect --model sonnet --editor-model sonnet

# 搭配二：复杂任务最强
aider --architect --model opus --editor-model sonnet

# 搭配三：省钱方案
aider --architect --model sonnet --editor-model haiku

# 搭配四：DeepSeek 极致省钱
aider --architect --model deepseek --editor-model deepseek
```

Architect 模型不需要遵守严格的编辑格式，它只输出自然语言方案描述。Editor 模型负责把方案翻译成 SEARCH/REPLACE 块。这样 Architect 模型可以发挥最大的推理能力，不受格式约束。

### 什么时候用 Architect

- 跨 5+ 文件的重构 → 用 Architect
- 改一个函数的 bug → 普通 Code 模式够了
- 设计新功能的架构 → 先 `/ask` 讨论，再 Architect 执行
- 迁移框架（React Class → Hooks、Express → Fastify）→ 必须 Architect

## 模型选型与 Benchmark

Aider 维护了一个公开的 LLM Leaderboard（`aider.chat/docs/leaderboards`），用 Exercism 编程练习测试各模型的代码编辑能力。

### 2026 年模型推荐

```bash
# 按场景选模型：

# 日常开发（高性价比）
aider --model sonnet
# Claude Sonnet：benchmark 得分高，速度快，价格合理

# 复杂推理和大型重构
aider --model opus
# Claude Opus：最强推理能力，贵但值

# 预算紧张
aider --model deepseek
# DeepSeek：便宜到离谱，中文理解力强，适合简单任务

# 超长上下文（大文件、长对话）
aider --model gemini/gemini-2.5-pro
# Gemini：200k context window，处理大文件不截断
```

### 三模型槽位系统

Aider 有三个模型槽位，各司其职：

| 槽位 | 用途 | 推荐配置 |
|------|------|----------|
| `--model` | 主模型，负责核心编码 | `sonnet` 或 `opus` |
| `--weak-model` | 轻量任务（commit msg、对话摘要） | `haiku`（最便宜） |
| `--editor-model` | Architect 模式的代码生成 | `sonnet` |

```yaml
# .aider.conf.yml — 推荐三模型配置
model: sonnet
weak-model: haiku
editor-model: sonnet
```

这样主要推理用 Sonnet，琐碎任务用 Haiku 省钱，Architect 编辑也用 Sonnet 保证质量。

## Token 成本优化

Aider 的一大优势是费用完全透明——你看得到每轮对话花了多少 token。

### 查看用量

```bash
# 对话中随时查看
> /tokens
# Tokens: 12,345 sent, 2,456 received
# Cost: $0.08 this session
```

### 省钱技巧

**1. 用 diff 编辑格式**

Aider 支持两种编辑格式：
- `whole`：把整个文件内容发给模型（简单但费 token）
- `diff`：只发改动部分（省 4x token）

```bash
aider --edit-format diff --model sonnet
```

大多数现代模型都能稳定处理 diff 格式。

**2. 控制 Repo Map 大小**

```yaml
# 小项目（<50 文件）
map-tokens: 1024

# 中型项目（50-200 文件）
map-tokens: 2048

# 大型项目（200+ 文件）— 需要更多上下文
map-tokens: 4096
```

**3. 及时 `/drop` 不需要的文件**

```bash
# 改完 auth 模块了，准备改 payment
> /drop src/auth/*.py
> /add src/payment/*.py
```

对话中的文件越少，每轮发送的 token 越少。

**4. `/clear` 重置长对话**

对话超过 20 轮后，历史消息会消耗大量 token。如果话题已经转移，`/clear` 清空重来。

**5. 合理用 weak-model**

```yaml
weak-model: haiku  # commit message 和摘要用最便宜的模型
```

### 月费估算

| 使用强度 | 日均花费 | 月均花费 | 典型配置 |
|----------|----------|----------|----------|
| 轻度（1-2 小时） | $2-5 | $50-100 | Sonnet + Haiku |
| 中度（3-5 小时） | $5-15 | $150-300 | Sonnet + Haiku |
| 重度（全天） | $15-40 | $300-600 | Opus + Sonnet |
| 极致省钱 | $0.5-2 | $15-50 | DeepSeek |

## 五大实战工作流

### 工作流一：Bug 修复

```bash
aider --model sonnet
> /add src/utils/parser.py
> /test pytest tests/test_parser.py
# 测试失败，Aider 自动把错误日志喂给 AI
# AI 分析错误原因，修复代码，自动 commit
> /test pytest tests/test_parser.py
# 全绿 ✅
```

### 工作流二：代码审查

```bash
aider --model opus
> /add src/api/endpoints.py
> /ask 审查这段代码：安全性、性能、可读性。
  列出所有问题并按严重程度排序。
# AI 给出详细审查报告
> 按你的建议修复所有 High 级别问题
# AI 自动修复并 commit
```

### 工作流三：添加测试

```bash
aider --model sonnet
> /add src/services/payment.py
> /read-only src/models/order.py
> 给 payment.py 写完整的单元测试：
  覆盖正常流程、边界条件、异常处理。
  用 pytest + mock，mock 外部 API 调用。
```

### 工作流四：框架迁移

```bash
aider --architect --model opus --editor-model sonnet
> /add src/components/*.jsx
> 把所有 Class Component 迁移到 Functional Component + Hooks。
  保持所有功能不变，一个文件一个文件来。
```

### 工作流五：文档生成

```bash
aider --model sonnet
> /add src/api/**/*.py
> /ask 分析所有 API 端点，列出路径、方法、参数和返回值
# 拿到分析结果后
> 基于这个分析，生成一份 OpenAPI 3.0 规范的 YAML 文件
```

## Watch 模式：和 IDE 联动

Aider 可以和任何编辑器配合：

```bash
aider --watch --model sonnet
```

在 VS Code 或 Vim 里写代码时，加一行 `# aider: 把这个改成异步` 注释，保存文件，Aider 会自动检测到并执行。你甚至不需要切到终端窗口。
