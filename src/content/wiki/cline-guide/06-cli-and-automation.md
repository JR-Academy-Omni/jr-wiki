---
title: "Cline CLI 与 CI/CD 自动化：在终端和流水线里运行 AI 代理"
wiki: "cline-guide"
order: 6
description: "用 Cline CLI 在终端、定时任务和 CI/CD 流水线里无头运行 AI 代理；MCP 命令行配置；GitHub Actions 集成实战"
---

VS Code 扩展是 Cline 最常见的用法，但 Cline 还有一个独立 CLI，可以在终端、定时任务、CI/CD 流水线里无头运行——完全不依赖编辑器。这一章讲透 CLI 的安装、核心用法和在 GitHub Actions 里跑 AI 代理的完整示例。

## 安装 Cline CLI

```bash
# 全局安装
npm i -g cline

# 验证安装
cline --version
```

安装后，`cline` 命令在任何目录都能用。

## 两种运行模式

### 交互模式（Interactive）

像聊天一样在终端和 AI 对话：

```bash
# 进入交互会话，默认用你在 cline.bot 配置的模型
cline

# 指定项目目录
cline --cwd /path/to/project
```

适合本地开发时不想开编辑器但需要 AI 帮忙的场景（比如在服务器上快速改配置）。

### 无头模式（Headless / 管道化）

把任务作为参数传入，Cline 执行后退出——用于脚本和自动化：

```bash
# 单次任务，执行完即退出
cline --message "检查所有 TypeScript 文件的类型错误并自动修复" --yes

# 从文件读取任务
cline --message "$(cat task.txt)" --yes

# 输出到文件（方便后续解析）
cline --message "生成本周代码变更摘要" --yes > summary.md
```

`--yes` 参数让 Cline 自动批准所有操作，无需交互确认——**只在受信任的 CI 环境里用**，本地开发建议手动审批。

## MCP 在 CLI 里的配置

CLI 下 MCP 配置文件存放在 `~/.cline/data/settings/cline_mcp_settings.json`（和 VS Code 扩展的配置是独立的）。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "type": "stdio"
    },
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "type": "streamableHttp",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    }
  }
}
```

> **注意**：远程 MCP 服务器要显式写 `"type": "streamableHttp"`，否则 Cline 会回退到旧的 SSE 传输协议。

用 CLI 管理 MCP 服务器：

```bash
# 列出已配置的 MCP 服务器
cline mcp

# 添加一个本地 STDIO 服务器
cline mcp add

# 查看 JSON 格式的配置
cline config mcp --json
```

## GitHub Actions 集成实战

下面是一个真实的 workflow：在每次 PR 时让 Cline 自动做代码审查并留 comment。

```yaml
# .github/workflows/cline-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  cline-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Cline CLI
        run: npm i -g cline

      - name: Get changed files
        id: changes
        run: |
          git diff --name-only origin/${{ github.base_ref }}...HEAD > changed_files.txt
          echo "files=$(cat changed_files.txt | tr '\n' ',')" >> $GITHUB_OUTPUT

      - name: Run Cline review
        env:
          CLINE_API_KEY: ${{ secrets.CLINE_API_KEY }}
        run: |
          cline --message "
          审查以下改动文件（已列在 changed_files.txt）：
          1. 找出潜在 bug 和安全漏洞
          2. 检查是否有不必要的重复代码
          3. 验证错误处理是否完整
          把审查结论写入 review_output.md，格式：每条问题 + 建议修复
          " --yes

      - name: Post review comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('review_output.md')) {
              const review = fs.readFileSync('review_output.md', 'utf8');
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## 🤖 Cline AI Review\n\n${review}`
              });
            }
```

## 定时任务：自动生成技术文档

用 cron 让 Cline 每周自动更新 changelog：

```bash
# crontab -e
# 每周一早上 9 点跑
0 9 * * 1 cd /workspace/my-project && cline --message "读取上周的 git commits，整理成面向用户的 changelog，追加到 CHANGELOG.md 末尾" --yes
```

## 常见坑

**坑 1：`--yes` 在本地误删文件**  
无头模式下 Cline 会自动批准所有终端命令，包括 `rm -rf`。本地开发**不要**加 `--yes`；CI 里要在 workflow 里限制文件权限（比如只给 read access 到生产配置目录）。

**坑 2：API key 没生效**  
CLI 的 key 和 VS Code 扩展的 key 是分开存储的。CLI 里通过环境变量 `CLINE_API_KEY` 或者 `cline login` 命令认证。

**坑 3：MCP 远程服务器连不上**  
默认不写 `type` 时 Cline CLI 用 SSE 协议，但很多现代 MCP 服务器已迁移到 Streamable HTTP。报连接错误时先确认 `cline_mcp_settings.json` 里有 `"type": "streamableHttp"`。

**坑 4：Context 超长导致质量下降**  
无头任务里很容易一次传入整个代码库。建议拆成多次小任务，每次只传相关文件，而不是 `--message "分析整个项目"`。

---

CLI 把 Cline 从"编辑器插件"升级成了"可编排的 AI 代理"，尤其适合团队统一自动化流程。下一章我们讲如何用 Kanban 同时运行多个 Cline 代理，以及怎么配置本地模型实现零成本编程。
