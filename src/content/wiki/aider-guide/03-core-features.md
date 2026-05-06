---
title: "核心功能：四大模式、Repo Map 和 Git 集成"
wiki: "aider-guide"
order: 3
description: "Aider 四大聊天模式详解、40+ 内置命令、Repo Map 工作原理、Git 自动提交与回滚、多文件编辑"
---

## 四大聊天模式

Aider 有四种聊天模式，每种模式决定了 AI 的行为方式。这是 Aider 最核心的设计。

![Aider Repo Map 概念](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/assets/robot-ast.png)

### Code 模式（默认）

```bash
aider --model sonnet
# 进入后默认就是 code 模式
```

AI 直接编辑你的文件。你说"把这个函数改成异步的"，AI 生成 SEARCH/REPLACE 块，Aider 应用到文件里，自动 commit。这是最常用的模式。

```
> 把 getUserById 改成 async，用 await 替换回调
```

### Ask 模式

```bash
# 在对话中切换
> /ask 这段代码的时间复杂度是多少？有没有更好的写法？
```

只讨论，不改文件。适合代码审查、理解逻辑、讨论方案。AI 能看到你添加的所有文件和 Repo Map，但不会动任何代码。

实战用法：先 `/ask` 讨论方案，确认思路后切回 `/code` 执行。

### Architect 模式（杀手锏）

```bash
aider --architect --model opus --editor-model sonnet
```

这是 Aider 的独家功能。两个模型协作：

1. **Architect 模型**（如 Opus）：负责思考方案，输出高层描述"应该怎么改"
2. **Editor 模型**（如 Sonnet）：负责把方案翻译成具体的代码编辑

为什么这么设计？强模型擅长推理但贵，弱模型擅长格式化输出但便宜。Architect 模式让强模型只负责"想"，便宜模型负责"写"，效果好还省钱。

```
> 重构整个认证模块，把 session-based 改成 JWT，
  要支持 refresh token 和黑名单机制
```

Architect 模型会先输出一份详细的重构计划，Editor 模型再逐文件生成代码改动。对于跨多文件的大改动特别有效。

### Help 模式

```bash
> /help 怎么配置 lint 自动修复？
```

问 Aider 本身的使用问题。不涉及你的代码。

## 文件管理

Aider 需要知道你在"聊"哪些文件：

```bash
# 添加文件到对话（AI 可以读+写）
> /add src/auth.py src/models/user.py

# 只读添加（AI 能看但不能改，适合参考文件）
> /read-only src/config.py

# 从对话中移除
> /drop src/auth.py

# 查看当前对话中的文件
> /ls
```

关键概念：**只有 `/add` 的文件 AI 才能编辑**。但 Repo Map 让 AI 能"看到"整个项目的结构，所以它知道去引用哪些文件、调用哪些函数。

```bash
# 用通配符批量添加
> /add src/components/*.tsx
> /add tests/

# 添加 URL 内容作为上下文
> /web https://docs.python.org/3/library/asyncio.html
```

## Repo Map 工作原理

Repo Map 是 Aider 的核心创新。每轮对话，Aider 会发三样东西给模型：

```
┌─────────────────────────────────────────────────┐
│  1. /add 的文件完整内容                            │
│  2. Repo Map（其余文件的类/函数/类型签名摘要）        │
│  3. 对话历史                                      │
└─────────────────────────────────────────────────┘
```

Repo Map 用 tree-sitter 解析所有代码文件的 AST，提取出：
- 类名和方法签名
- 函数名和参数
- 类型定义和导出
- 模块间的引用关系

这样 AI 不需要看完所有代码，只看"地图"就知道项目里有什么、在哪里、怎么调用。效果类似于一个高级开发者快速浏览了整个项目的目录和接口文档。

控制 Repo Map 大小：

```yaml
# .aider.conf.yml
map-tokens: 2048    # 默认值，中型项目够用
map-tokens: 4096    # 大型项目，给更多上下文
map-tokens: 0       # 关闭 Repo Map（省 token 但效果变差）
```

## Git 集成

Git 是 Aider 的安全网。每次 AI 改代码，Aider 都会：

1. 应用代码改动到文件
2. 自动 `git add` 改动的文件
3. 生成语义化 commit message
4. 自动 `git commit`

```bash
# 查看最近的 AI commit
> /git log --oneline -5
# a1b2c3d feat: add JWT authentication middleware
# d4e5f6a refactor: extract token validation to utils
# g7h8i9j fix: handle expired refresh token edge case

# 撤销最近一次 AI 改动
> /undo

# 查看当前 diff
> /diff
```

这意味着你可以放心让 AI 大胆改——改坏了 `/undo` 就回来了，比 `Ctrl+Z` 靠谱得多。

你也可以关掉自动提交，手动控制节奏：

```bash
aider --no-auto-commits --model sonnet
# AI 改完代码不自动 commit，你自己决定什么时候提交
> /commit  # 手动提交当前改动
```

## 常用命令速查

Aider 内置 40+ 命令，这些是最常用的：

| 命令 | 作用 | 使用频率 |
|------|------|----------|
| `/add <file>` | 添加文件到对话 | ⭐⭐⭐ |
| `/drop <file>` | 移除文件 | ⭐⭐⭐ |
| `/ask <问题>` | 只问不改 | ⭐⭐⭐ |
| `/code` | 切回代码编辑模式 | ⭐⭐ |
| `/architect` | 切到 Architect 模式 | ⭐⭐ |
| `/undo` | 撤销最近一次 AI commit | ⭐⭐⭐ |
| `/diff` | 查看当前改动 | ⭐⭐ |
| `/run <cmd>` | 执行 shell 命令 | ⭐⭐⭐ |
| `/test <cmd>` | 跑测试，失败自动让 AI 修 | ⭐⭐ |
| `/lint` | 跑 linter，有问题自动修 | ⭐⭐ |
| `/read-only <file>` | 只读添加参考文件 | ⭐⭐ |
| `/web <url>` | 抓网页内容作为上下文 | ⭐ |
| `/clear` | 清空对话历史 | ⭐ |
| `/tokens` | 查看当前 token 用量 | ⭐ |
| `/model <name>` | 运行时切换模型 | ⭐ |

`/test` 特别强大：它跑测试，如果失败，自动把错误信息喂给 AI 让它修。你可以循环 `/test` 直到全绿。
