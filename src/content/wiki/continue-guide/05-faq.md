---
title: "Continue 常见问题 FAQ：避坑指南与选型建议"
wiki: "continue-guide"
order: 5
description: "Continue 使用中最常见的问题和解决方案：模型配置、性能优化、定价计算、以及与其他 AI 编码工具的选型建议"
---

Continue 是一个配置灵活度极高的工具，灵活的代价就是你会遇到各种各样的问题。这一章把最常见的坑整理出来。

![Continue FAQ 与选型](https://img.youtube.com/vi/3Ocrc-WX4iQ/maxresdefault.jpg)

## 关于安装和配置

**Q：安装了 Continue 但 Chat 没有任何响应？**

A：99% 是模型没配置对。排查步骤：

1. `Ctrl+Shift+P` → `Continue: View Logs` 查看错误日志
2. 检查 `config.yaml` 里的 apiKey 是否正确（Anthropic 的 key 以 `sk-ant-` 开头，OpenAI 的以 `sk-` 开头）
3. 如果用 Ollama，确认 Ollama 服务在跑（终端输入 `ollama list` 看看）
4. 检查网络是否能访问 API 端点（公司 VPN 有时会挡掉 API 请求）

---

**Q：config.yaml 改了但没生效？**

A：正常情况下保存就会热重载。如果没生效：

```bash
# 检查配置文件位置是否正确
ls ~/.continue/config.yaml          # 全局配置
ls .continue/config.yaml            # 项目配置（优先级更高）
```

项目级 `.continue/config.yaml` 会覆盖全局配置。如果两边都有，项目级优先。实在不行，`Ctrl+Shift+P` → `Developer: Reload Window` 重启整个窗口。

---

**Q：老版本用的 config.json，怎么迁移到 config.yaml？**

A：Continue 会自动弹出迁移提示。如果没弹出，手动操作：`Ctrl+Shift+P` → `Continue: Migrate Config`。YAML 格式是目前的标准，新功能只在 YAML 里支持。

## 关于性能

**Q：Autocomplete 补全很慢，有延迟感？**

A：云端模型做 Autocomplete 天然有网络延迟（200-500ms），体验会明显不如 Copilot。解决方案就一个：**用本地模型做 Autocomplete**。

推荐本地模型（按硬件选）：

| 你的硬件 | 推荐模型 | 响应速度 |
|----------|----------|----------|
| 16GB+ 显存 GPU | `qwen2.5-coder:14b` | 极快 |
| 8GB 显存 GPU | `qwen2.5-coder:7b` | 很快 |
| 仅 CPU（16GB RAM） | `starcoder2:3b` | 可用 |

---

**Q：Agent 模式执行任务时经常"跑偏"，做了不相关的修改？**

A：Agent 的上下文窗口有限，任务太大它就会迷失方向。几个应对策略：

1. 把大任务拆成小步骤，一步一步来
2. 在 `.continue/rules/` 里加约束："修改代码前先说明你的计划，等我确认后再执行"
3. 用更强的模型做 Agent（Claude Opus 比 Sonnet 的规划能力强很多）

## 关于定价

**Q：Continue 到底要花多少钱？**

A：Continue 本身完全免费。你的花费取决于模型选择：

| 方案 | 月成本估算（个人开发者） |
|------|-------------------------|
| 纯本地 Ollama | $0（只有电费） |
| Claude Sonnet API | $5-30（取决于用量） |
| Claude Opus API | $20-100 |
| GPT-4o API | $10-50 |
| Continue Hub 付费（团队功能） | $10/人/月 |

和 Cursor Pro $20/月 固定费用比，如果你用量不大（每天几十次对话），API 按量付费其实更划算。如果你是重度用户（每天几百次对话），Cursor 的固定月费反而更省。

---

**Q：Continue Hub 付费版有什么？免费版够用吗？**

A：免费版覆盖了个人开发的所有核心功能。Hub 付费版（$10/人/月）主要面向团队：共享 Assistant、团队分析仪表盘、SSO、高级 MCP 工具。个人用户完全不需要付费。

## 选型建议

**Q：我该用 Continue 还是 Cursor？**

A：看你的优先级：

- **追求最佳开箱体验** → Cursor。它的 UI 打磨、模型调优、codebase 索引都做得更好
- **追求自由度和隐私** → Continue。模型自选、完全开源、可离线
- **预算敏感** → Continue。核心功能零成本，按需付 API 费
- **JetBrains 用户** → Continue。Cursor 只有自己的 IDE

---

**Q：我该用 Continue 还是 GitHub Copilot？**

A：Copilot 的优势是 GitHub 深度集成——PR 摘要、代码审查、issue 关联。如果你的团队重度依赖 GitHub 工作流，Copilot 的集成价值很高。但如果你主要用 AI 来写代码和补全，Continue 的模型灵活性和零成本优势就更明显了。

---

**Q：Continue 会不会被 Cursor 或 Copilot 淘汰？**

A：短期看不太可能。开源 AI 编码工具的生态在快速壮大（Cline、Aider、OpenHands 都是类似方向），Continue 在这个赛道里份额领先，而且它瞄准的企业私有化部署市场是 Cursor 和 Copilot 吃不到的。再说，开源项目死掉的概率比商业公司倒闭的概率低得多。
