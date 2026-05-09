---
title: "进阶玩法：Coding Agent、自定义指令与 MCP"
wiki: "github-copilot-guide"
order: 4
description: "GitHub Copilot Coding Agent 自动修 Issue、自定义项目指令、MCP 扩展、Vision 多模态、CLI 终端用法"
---

## Coding Agent：从 Issue 到 PR 全自动

GitHub Copilot 最炸裂的功能是 **Coding Agent**——一个跑在云端的自主 Agent。你只需要把一个 GitHub Issue 分配给 Copilot，它会自己 clone 代码、读需求、写实现、跑测试、开 PR。全程不需要你碰一行代码。

![GitHub Copilot CLI](https://images.ctfassets.net/8aevphvgewt8/2Zamxo7a7F9K9jsTAl2EGA/bce1f04a40536e89ef543cb311f2968b/github-copilot-cli.png)

### 工作流程

```
GitHub Issue → 分配给 @copilot → 自动创建 copilot/* 分支
     → 读代码 + 理解需求 → 写实现 → 跑测试 → 自动修 bug
     → 安全扫描（CodeQL + secrets + 依赖检查） → 开 Draft PR
     → 你 Review → Merge
```

### 怎么用

1. 打开一个 GitHub Issue
2. 在 Assignees 里选择 **Copilot**（或在评论里 `@copilot` 并描述任务）
3. Copilot 自动创建 `copilot/issue-xxx` 分支
4. 在 PR 页面可以实时看到进度
5. 完成后变成 Draft PR，等你 Review

### 适合什么任务

```markdown
✅ 适合：
- Bug fix（Issue 里有复现步骤 + 报错信息）
- 加简单功能（边界清晰、不涉及架构变更）
- 写测试、写文档
- 依赖升级、代码迁移

❌ 不适合：
- 大规模架构重构
- 涉及多个仓库的改动
- 需要设计决策的开放性任务
```

Coding Agent 2025 年 9 月 GA，每次会话只消耗 **1 个 premium request**。免费版用户也能用（在 50 条/月额度内）。

## 自定义指令（Custom Instructions）

每个团队的代码规范不同。与其每次在 Chat 里重复"用 TypeScript strict mode"、"用 pytest 写测试"，不如写一份项目级指令文件，让 Copilot 自动遵守。

### 项目级指令

在仓库根目录创建 `.github/copilot-instructions.md`：

```markdown
# Project Copilot Instructions

## 语言和框架
- 前端使用 TypeScript strict mode + React 18
- 后端使用 Python 3.12 + FastAPI
- 测试用 pytest + React Testing Library

## 代码风格
- 函数命名：camelCase（前端）、snake_case（后端）
- 组件命名：PascalCase
- 所有 API 响应用统一格式：{ data, error, message }

## 禁止
- 不要用 any 类型
- 不要用 console.log 做错误处理
- 不要在组件里直接调 API，走 hooks
```

保存后，Copilot 在这个仓库里的所有建议都会自动遵守这些规则。团队成员 clone 这个仓库就能共享同一套 AI 编程规范。

### 模块级指令

在 `.github/instructions/` 目录下创建针对特定路径的指令：

```markdown
<!-- .github/instructions/api.instructions.md -->
---
applyTo: "src/api/**"
---
所有 API handler 必须包含：
1. 输入验证（用 Pydantic BaseModel）
2. 统一错误处理（raise HTTPException）
3. 请求日志（用 structlog）
```

这样 Copilot 在编辑 `src/api/` 下的文件时会自动应用这些额外规则。

## MCP 集成

MCP（Model Context Protocol）让 Copilot 能连接外部工具和数据源，扩展它的能力边界。

### VS Code 配置

在项目根目录创建 `.vscode/mcp.json`：

```json
{
  "servers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/mydb"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

配好后，Copilot 的 Agent Mode 就能直接查你的数据库表结构、读 GitHub Issue 列表——而不是凭空猜。这个文件可以提交到 Git，团队成员拉下来就能共享同样的 MCP 配置。

## Vision 多模态

2025 年 3 月起，Copilot Chat 支持**图片输入**——你可以把 UI 设计稿、报错截图、架构图直接丢给它。

支持的格式：JPEG、PNG、GIF、WEBP。

### 实用场景

**设计稿转代码**——把 Figma 导出的截图拖进 Chat：

```
[拖入 login-page-design.png]
把这个登录页面用 React + Tailwind CSS 实现，
要响应式，手机端表单全宽
```

Copilot 会根据截图生成对应的组件代码，还能在侧边预览面板里直接看效果。

**报错截图分析**——手机上看到的报错截取出来直接扔给 Copilot：

```
[拖入 error-screenshot.png]
这个报错怎么修？
```

比手动抄报错信息再粘贴到 Chat 里快多了。

## CLI 终端用法

GitHub Copilot 也有 CLI 版本，适合终端党。

```bash
# 安装 GitHub CLI（如果还没有）
brew install gh

# 安装 Copilot CLI 扩展
gh extension install github/gh-copilot

# 用自然语言生成 shell 命令
gh copilot suggest "找出当前目录下超过 100MB 的文件"
# → 输出: find . -type f -size +100M -exec ls -lh {} \;

# 解释一个看不懂的命令
gh copilot explain "awk '{print $2}' access.log | sort | uniq -c | sort -rn | head -20"
# → 输出: 这个命令从 access.log 中提取第二列，统计每个值出现的次数，
#         按降序排列，显示前 20 个最频繁的条目
```

对于 DevOps 和运维场景特别好用——不用记那些复杂的 `awk`、`sed`、`find` 参数了。
