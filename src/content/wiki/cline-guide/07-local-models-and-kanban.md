---
title: "本地模型 + Kanban：Ollama 离线编程与多代理并行实战"
wiki: "cline-guide"
order: 7
description: "用 Ollama / LM Studio 在本地跑模型实现零成本 AI 编程；Cline Kanban 多代理并行执行任务；ClinePass 托管订阅方案对比"
---

Cline 的一个核心优势是完全开放模型选择——你可以用 API 托管模型，也可以在本机跑完全离线的模型。这一章讲两件事：怎么配置本地模型实现零 API 成本编程，以及怎么用 Cline Kanban 同时跑多个 AI 代理提高效率。

## 本地模型：三种方案

Cline 官方支持三个本地推理运行时：**Ollama**、**LM Studio** 和 **Atomic Chat**。装好其中一个，启动本地服务器，在 Cline Settings 里选对应 provider 即可。

### Ollama（推荐，最灵活）

```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 拉一个适合编程的模型（约 4-8GB）
ollama pull qwen2.5-coder:7b

# 也可以拉更大的模型
ollama pull deepseek-coder-v2:16b

# 启动服务（默认已后台运行）
# 确认服务在跑
curl http://localhost:11434/api/tags
```

在 **Cline Settings → Provider** 里选 `Ollama`，Base URL 填 `http://localhost:11434`，然后从下拉选你拉好的模型。

### LM Studio（适合不想用命令行的用户）

1. 下载安装 [LM Studio](https://lmstudio.ai)
2. 在 Discover 页搜索模型并下载（比如 `Qwen2.5-Coder-7B-Instruct`）
3. 切到 **Developer** 标签，点 Start Server
4. Cline Settings 选 `LM Studio`，Base URL `http://localhost:1234`

### Atomic Chat

Base URL 默认是 `http://127.0.0.1:1337/v1`，注意要先在 Atomic Chat 里加载模型，它才会出现在 Cline 的模型列表里。

## 硬件配置参考

| 机器 RAM | 推荐模型规模 | 适合任务 |
|---------|-----------|--------|
| 16–32 GB | 7B–13B 量化版（Q4/Q5） | 单文件修改、简单 bug fix |
| 32–64 GB | 14B–32B | 多文件重构、功能开发 |
| 64 GB+ | 70B+ 或无量化版 | 大型代码库分析、架构设计 |

以上数据来自 Cline 官方文档推荐区间。

**Use Compact Prompt**：本地模型 context window 通常比云端小，建议在 `Cline Settings → Features` 里开启 **Use Compact Prompt**，把每次发送的 token 量减少约 40%，速度和稳定性都会更好。

## 本地模型的正确使用姿势

**任务要拆细。** 7B 模型的 context 窗口通常只有 8k–16k tokens。把"重构整个 auth 模块"拆成"先看现有代码 → 再改 login 函数 → 再改 token 验证"，每步新开一个 task，质量会高很多。

```bash
# 给本地模型的好 prompt 结构
你只看 src/auth/login.ts 这一个文件。
任务：把 JWT verify 的错误处理改成抛出具名错误而不是返回 null。
不要修改其他文件。
改完后告诉我改了哪几行。
```

## ClinePass：懒得管 API key 的方案

如果不想自己配 API key、不想担心账单，可以订阅 **ClinePass**（$9.99/月），使用 Cline 托管的开源编码模型，价格比直接调 API 低 2–5 倍（官网声明）。适合已经知道自己常用 Cline 但不想管账单细节的用户。

| 方案 | 适合谁 |
|------|--------|
| BYO Key（自带 API key） | 想用 Claude / GPT-4o 等旗舰模型，自己控制成本 |
| ClinePass（$9.99/月） | 日常编程用开源模型，省心省钱 |
| 本地 Ollama/LM Studio | 离线环境、隐私敏感项目、或者零成本实验 |

## Cline Kanban：多代理并行

**Kanban** 是 Cline 官方出的多代理编排工具，在浏览器里用看板界面管理多个并行 Cline 代理。

```bash
# 启动 Kanban（无需安装，npx 直接跑）
npx kanban
```

启动后在浏览器打开 Kanban 界面，每张卡片对应一个独立的 Cline 代理任务：

**典型并行场景：**

```
┌─────────────────────────────────────────────────────┐
│                   Cline Kanban                       │
├──────────────┬──────────────┬────────────────────────┤
│   In Queue   │  In Progress │        Done            │
├──────────────┼──────────────┼────────────────────────┤
│ 写单测：     │ 重构：       │ ✅ 更新 README         │
│ payment.ts   │ user-service │ ✅ 修复 auth bug       │
│              │              │                        │
│ 写单测：     │ 生成文档：   │                        │
│ cart.ts      │ API endpoints│                        │
└──────────────┴──────────────┴────────────────────────┘
```

每个任务在自己的 **git worktree** 里执行，互不干扰，完成后自动 commit。

**Kanban 的三个核心功能：**

1. **per-card worktrees**：每张任务卡自动创建独立 worktree，同时修改不同模块不会冲突
2. **dependency chains**：可以设置"任务 B 要等任务 A 完成后才开始"，适合有依赖的开发流程
3. **auto-commit**：每个任务完成后自动 commit，保持历史清晰

## 多代理实战：同时写测试 + 重构

假设你有一个 Express API 项目需要加测试并重构 service 层：

```bash
# 启动 Kanban
npx kanban

# 在 Kanban 界面创建两张卡：

# 卡 1：写测试
# 任务：给 src/services/user.service.ts 写 Jest 单测，
#       覆盖 createUser / findById / updateProfile 三个方法，
#       mock 掉 DB 调用，测试文件放 src/__tests__/

# 卡 2：重构（依赖卡 1 完成后才跑，避免冲突）
# 任务：把 src/services/user.service.ts 里的 raw SQL 换成
#       TypeORM Repository 模式，不改接口签名
```

两个任务在不同 worktree 里运行，互不影响。测试写完后，重构那个代理可以看到测试文件作为验证基准。

## 常见坑

**坑 1：本地模型切换后模型列表是空的**  
Atomic Chat 要先在 UI 里加载模型，它才会暴露给 Cline。Ollama 要先 `ollama pull` 拉模型，LM Studio 要先在 Discover 页下载并加载。

**坑 2：Kanban worktree 冲突**  
如果两个任务都修改同一个文件（比如都改 `index.ts`），merge 时会冲突。建议在 Kanban 里给有文件重叠的任务加 dependency，让它们串行跑。

**坑 3：本地模型忘开服务器**  
Ollama 安装后一般自动后台运行，但重启电脑后需要确认：`curl http://localhost:11434/api/tags` 能返回则正常，否则 `ollama serve &` 手动启动。

**坑 4：Compact Prompt 没开，本地模型卡死**  
本地模型超过 context 限制后通常直接报错而不是像云端模型那样优雅截断。**先开 Compact Prompt，再上手复杂任务。**

---

至此，Cline 的完整能力图谱就清晰了：VS Code 扩展做日常编程，CLI 接入自动化流水线，Kanban 编排并行代理，本地模型保护隐私或控制成本——根据场景自由组合。
