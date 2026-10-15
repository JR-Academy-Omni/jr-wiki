---
title: "CI/CD 集成：Headless 模式实战"
wiki: "kiro-guide"
order: 7
description: "Kiro CLI Headless 模式、GitHub Actions 自动 PR review、测试生成、构建排错"
---

## 为什么在 CI/CD 里跑 Kiro

本地用 Kiro 做功能开发，CI/CD 里用 Kiro 做质量把关——这是 2026 年很多团队的组合用法：

- **PR 自动代码 review**：每次 push，Kiro 扫安全问题、逻辑 bug、代码规范
- **自动生成/补全测试**：提交了新函数但没有对应测试？Kiro 帮你补
- **构建失败自动排查**：CI 挂了，把错误日志喂给 Kiro，直接给出修复建议
- **文档自动更新**：API 改了，自动更新 README 或 OpenAPI spec

这些都通过 Kiro CLI 的 **Headless 模式**实现——不需要交互式终端，完全自动化运行。

> Headless 模式需要 API Key，仅限 Pro、Pro+、Pro Max、Power 计划。如果你的账号由管理员管理，需要管理员先在 Kiro 后台开启 API Key 生成权限。

---

## 配置 API Key

```bash
# 1. 打开 app.kiro.dev → Settings → API Keys → Create new key
# 2. 复制 key，保存到 CI/CD 的 Secrets（不要明文写进代码）

# 本地测试时：
export KIRO_API_KEY="your-api-key-here"

# 然后跑一条 headless 命令验证：
kiro-cli chat --no-interactive "列出当前目录下有哪些文件"
```

GitHub Actions 里把 key 存到 **Repository Secrets**（Settings → Secrets and variables → Actions → New repository secret），命名为 `KIRO_API_KEY`。

---

## 核心 Flags

| Flag | 说明 | 场景 |
|------|------|------|
| `--no-interactive` | 无交互模式，必须带初始指令 | 所有 CI 场景 |
| `--v3` | 用 V3 引擎（推荐） | 默认加上 |
| `--trust-all-tools` | 自动批准所有工具调用 | 信任度高的私有 repo |
| `--trust-tools=<ids>` | 只批准指定工具 | 更安全的做法 |
| `--agent <name>` | 指定 Agent | 有自定义 Agent 配置时 |
| `--model <id>` | 指定模型 | 需要特定模型能力时 |
| `--effort <level>` | 推理深度（low/medium/high） | 权衡速度和质量 |
| `--output-format stream-json` | JSON Lines 输出 | 需要解析结果时 |
| `--require-mcp-startup` | 等 MCP 服务器就绪再执行 | 依赖 MCP 工具时 |
| `--sandbox` | 启用沙箱隔离（V3 2.31+） | 安全敏感的 CI 环境 |

安全建议：**在 V3 里用 `--trust-tools=read_file,grep_search` 这样的精确白名单**，比 `--trust-all-tools` 更安全。只授权任务需要的工具，不多给权限。

---

## GitHub Actions 实战案例

### 案例 1：PR 代码安全审查

每次 PR 推送自动扫安全问题：

```yaml
# .github/workflows/kiro-review.yml
name: Kiro Security Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 需要完整 git 历史做 diff

      - name: Install Kiro CLI
        run: curl -fsSL https://cli.kiro.dev/install | bash

      - name: Review PR for security issues
        env:
          KIRO_API_KEY: ${{ secrets.KIRO_API_KEY }}
        run: |
          kiro-cli chat --v3 --no-interactive \
            --trust-tools=read_file,grep_search,list_directory \
            "Review the changes in this PR for security vulnerabilities, \
             SQL injection, XSS, authentication issues, and secrets exposure. \
             List any findings with file name and line number."
```

### 案例 2：自动补全测试

检测到新函数没有测试时，自动生成测试文件：

```yaml
# .github/workflows/kiro-tests.yml
name: Kiro Test Generation

on:
  pull_request:
    paths:
      - 'src/**/*.ts'
      - '!src/**/*.test.ts'

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Kiro CLI
        run: curl -fsSL https://cli.kiro.dev/install | bash

      - name: Generate missing tests
        env:
          KIRO_API_KEY: ${{ secrets.KIRO_API_KEY }}
        run: |
          kiro-cli chat --v3 --no-interactive --trust-all-tools \
            "Check all changed .ts files (excluding .test.ts) for functions \
             that lack test coverage. For each untested function, create or \
             update the corresponding .test.ts file with unit tests using Vitest."

      - name: Commit generated tests
        run: |
          git config user.email "kiro-bot@company.com"
          git config user.name "Kiro Bot"
          git add src/**/*.test.ts
          git diff --staged --quiet || git commit -m "test: auto-generate missing unit tests"
          git push
```

### 案例 3：构建失败自动排查

CI 失败后，把错误日志喂给 Kiro 分析：

```yaml
# .github/workflows/kiro-debug.yml
name: Kiro Build Debug

on:
  workflow_run:
    workflows: ["Build"]
    types: [completed]

jobs:
  debug:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get build logs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh run view ${{ github.event.workflow_run.id }} --log-failed > build-error.log 2>&1 || true

      - name: Install Kiro CLI
        run: curl -fsSL https://cli.kiro.dev/install | bash

      - name: Analyze failure
        env:
          KIRO_API_KEY: ${{ secrets.KIRO_API_KEY }}
        run: |
          {
            printf '%s\n\n' "Analyze this build failure and suggest a fix:"
            cat build-error.log
          } | kiro-cli chat --v3 --no-interactive --trust-tools=read_file,grep_search

      - name: Create issue with analysis
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # 可以把 Kiro 的输出写入 issue
          echo "Build failure analysis triggered"
```

---

## 结构化输出：解析 Kiro 的结果

需要在脚本里处理 Kiro 的输出时，用 `--output-format stream-json`：

```bash
kiro-cli chat --v3 --no-interactive \
  --output-format stream-json \
  --trust-tools=read_file,grep_search \
  "找出所有没有 error handling 的 async 函数，以 JSON 格式输出，每项包含 file 和 line 字段" \
  | grep '"type":"assistant"' \
  | jq '.content'
```

JSON Lines 格式下，每行是一个事件，`type` 字段区分是 assistant 消息、工具调用还是结束标记。可以写脚本解析结果，做判断或下一步处理。

---

## 用 `permissions.yaml` 管理工具权限

频繁用 headless 模式时，不想每次都写 `--trust-tools=...`？把权限配置写进 `permissions.yaml`：

```yaml
# .kiro/permissions.yaml
policies:
  - name: ci-review
    description: "CI 代码 review 用，只读权限"
    tools:
      allowed:
        - read_file
        - grep_search
        - list_directory
      denied:
        - write_file
        - delete_file
        - execute_command
```

然后在 headless 命令里引用这个 policy，比手写 tool ID 更可维护，也更容易 review 权限变更。

---

## 最佳实践总结

```bash
# 1. API Key 永远存到 CI Secrets，不能明文
export KIRO_API_KEY=${{ secrets.KIRO_API_KEY }}

# 2. V3 引擎 + 精确白名单（生产环境）
kiro-cli chat --v3 --no-interactive --trust-tools=read_file,grep_search "..."

# 3. 依赖 MCP 工具时加 --require-mcp-startup
kiro-cli chat --v3 --no-interactive --require-mcp-startup --trust-all-tools "..."

# 4. 定期轮换 API Key（在 Kiro portal 里 revoke 旧的 + 生成新的）

# 5. 指令写清楚，避免歧义
# 差：  "检查代码"
# 好：  "检查 src/ 下所有 .ts 文件里的 SQL 拼接，找出潜在注入点，输出文件名和行号"
```

CI 里跑 Kiro 和本地用 IDE 用 Kiro 是互补的——本地 IDE 做创作和功能开发，CI 做自动化质量把关。团队规模越大，CI 里的 Kiro 价值越明显：review 意见更统一，不依赖人工随机抽查。
