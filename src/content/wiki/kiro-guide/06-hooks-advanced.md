---
title: "Agent Hooks 进阶：六类触发器与零人工干预的质量管道"
wiki: "kiro-guide"
order: 6
description: "超越文件事件：用 promptSubmit / preToolUse / postToolUse 三类 Agent 生命周期 Hook 打造安全扫描 + 测试强制 + 文档同步的自动化流水线"
---

## 两种 Hook 事件体系

第 3 章介绍的 `fileSaved`、`fileCreated`、`fileDeleted` 是**文件事件 Hook**——代码落盘时触发。随着 Kiro 1.0 发布，又引入了三类**Agent 生命周期 Hook**，在 AI 思考和行动的不同阶段介入：

![Kiro Agent Hooks 与进阶功能](https://img.youtube.com/vi/Y4fZPoo7FTs/maxresdefault.jpg)

| 触发类型 | 事件 | 典型用途 |
|----------|------|---------|
| `fileSaved` | 保存文件时 | 自动跑测试、更新 README |
| `fileCreated` | 新建文件时 | 插入文件头注释、注册路由 |
| `fileDeleted` | 删除文件时 | 清理引用、更新 index |
| `promptSubmit` | 用户提交 prompt 时 | 注入上下文、强制规范 |
| `preToolUse` | Agent 调用工具前 | 校验操作、拦截危险命令 |
| `postToolUse` | Agent 调用工具后 | 审计日志、结果验证 |

> **语法参考**：以下示例基于 Kiro 1.0 Hook v1 格式，详细字段以 [kiro.dev/docs/hooks/types/](https://kiro.dev/docs/hooks/types/) 为准。

---

## promptSubmit Hook：在 AI 开口前注入规范

每次你在 Chat 里发消息，`promptSubmit` 就先触发一次。它能读取你的 prompt（通过 `USER_PROMPT` 环境变量），在 AI 处理前做拦截或增强。

**场景：强制所有 Agent 操作都说明变更原因**

```json
// .kiro/hooks/require-rationale.kiro.hook
{
  "title": "要求变更说明",
  "description": "检测涉及删除或重构的 prompt，提醒 Agent 必须先说明原因",
  "when": {
    "type": "promptSubmit"
  },
  "instruction": "检查 USER_PROMPT 是否包含 '删除'、'重构'、'迁移' 等字眼。如果有，在回答开头先输出：'⚠️ 变更影响范围：[说明]，原因：[原因]，已确认无误'，再继续执行。"
}
```

**场景：自动附加项目上下文**

```json
// .kiro/hooks/context-injection.kiro.hook
{
  "title": "注入项目约束",
  "description": "每次 prompt 自动带上当前 sprint 目标和技术限制",
  "when": {
    "type": "promptSubmit"
  },
  "instruction": "在处理请求前，读取 .kiro/context/sprint.md，把当前 Sprint 目标和技术红线附加到你的思考背景中。这不需要告诉用户，静默执行。"
}
```

---

## preToolUse / postToolUse Hook：操作守卫

Agent 每次调用工具（写文件、执行命令、读 URL）都会先触发 `preToolUse`，完成后触发 `postToolUse`。

**实战：防止 Agent 直接改 production 配置**

```json
// .kiro/hooks/prod-guard.kiro.hook
{
  "title": "生产环境写保护",
  "description": "拦截对 production 配置文件的写操作",
  "when": {
    "type": "preToolUse"
  },
  "action": {
    "type": "shellCommand",
    "command": "if echo \"$TOOL_INPUT\" | grep -q 'production\\|prod\\.env\\|\\.prod\\.'; then echo 'BLOCKED: 不允许直接修改生产配置，请走 PR 流程'; exit 1; fi"
  }
}
```

**实战：postToolUse 审计日志**

```json
// .kiro/hooks/audit-log.kiro.hook
{
  "title": "操作审计日志",
  "description": "Agent 每次写文件后追加审计记录",
  "when": {
    "type": "postToolUse"
  },
  "action": {
    "type": "shellCommand",
    "command": "echo \"$(date -Iseconds) | $TOOL_NAME | $TOOL_INPUT\" >> .kiro/audit.log"
  }
}
```

---

## 实战：三层自动化质量管道

把文件 Hook 和 Agent 生命周期 Hook 组合，构成完整的防线：

```
用户发 prompt
    ↓ [promptSubmit] → 注入规范上下文
Agent 调用写文件工具
    ↓ [preToolUse]  → 检查目标文件是否受保护
写完文件落盘
    ↓ [fileSaved]   → 跑单元测试 + 安全扫描
    ↓ [postToolUse] → 写审计日志
```

**安全扫描 Hook（防止硬编码密钥）**

```json
// .kiro/hooks/secret-scanner.kiro.hook
{
  "title": "敏感信息扫描",
  "description": "文件保存时扫描硬编码密钥，发现立即报警",
  "when": {
    "type": "fileSaved",
    "patterns": ["src/**/*", "!src/**/*.test.*", "!*.md"]
  },
  "action": {
    "type": "shellCommand",
    "command": "grep -rn --include='*.ts' --include='*.js' --include='*.py' -E '(sk-|AKIA|ghp_|AIza)[A-Za-z0-9_]{20,}' $SAVED_FILE && echo '🚨 检测到疑似密钥，已阻止保存' && exit 1 || exit 0"
  }
}
```

**测试强制 Hook（新函数必须有测试）**

```json
// .kiro/hooks/test-enforcer.kiro.hook
{
  "title": "测试覆盖强制",
  "description": "保存源文件时，确认对应测试文件存在",
  "when": {
    "type": "fileSaved",
    "patterns": ["src/**/*.ts", "!src/**/*.test.ts", "!src/types/**"]
  },
  "instruction": "检查刚保存的文件，提取所有新增的 export function。对于每个新增函数，在对应的 .test.ts 文件里检查是否有 describe/it 覆盖。缺失的自动生成测试骨架，不要实现逻辑，只生成 it('should...', () => { /* TODO */ }) 占位。"
}
```

---

## Shell Command Hook 进阶

Agent Prompt Hook 依赖 AI 判断，Shell Command Hook 用于确定性操作——速度更快，结果可预测：

```json
// .kiro/hooks/format-on-save.kiro.hook
{
  "title": "保存时格式化",
  "description": "TypeScript 文件保存时跑 prettier + eslint --fix",
  "when": {
    "type": "fileSaved",
    "patterns": ["**/*.ts", "**/*.tsx"]
  },
  "action": {
    "type": "shellCommand",
    "command": "npx prettier --write $SAVED_FILE && npx eslint --fix $SAVED_FILE"
  }
}
```

Shell Hook 的 `$SAVED_FILE` 是当前保存文件的路径，`$TOOL_INPUT` 和 `$TOOL_NAME` 在 preToolUse/postToolUse 中可用。

---

## Hook 调试技巧

Hook 不触发时，按顺序排查：

```bash
# 1. 确认 hook 文件语法合法
cat .kiro/hooks/your-hook.kiro.hook | python3 -m json.tool

# 2. 检查 filePatterns 是否匹配你的文件
#    glob 用 micromatch 规则，! 前缀是排除
#    patterns: ["src/**/*.ts", "!src/**/*.test.ts"]

# 3. 查看 Kiro Output 面板 (View → Output → Kiro Hooks)
#    每次 hook 触发都有日志

# 4. 当前版本每次保存只触发最先匹配的一个 hook
#    如果多个 hook 匹配同一文件，只有第一个执行
```

把 hook 的 `description` 写清楚不只是注释——它显示在 Kiro UI 的 Hook 面板里，团队成员一眼看懂每个 Hook 的作用。
