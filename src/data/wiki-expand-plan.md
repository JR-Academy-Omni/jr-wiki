# Wiki Expand Plan

> 这个文件是 Wiki Expand routine 的任务队列。每天 routine 读取此文件，做最上面第一个未划掉 `[ ]` 的任务，做完改成 `[x]`。
>
> **添加新任务**：追加到对应优先级末尾，格式严格按 `- [ ] {book-slug}/{file}.md — {action}: {描述}`。
> action 取 `expand` / `add-image` / `new-chapter` 三种之一。
>
> **划掉的历史任务保留**，方便回溯进度（不删）。

## 当前状态（2026-04-27 audit）

12 本书：bolt-new / claude-code / cursor / dify / gamma / lovable / n8n / n8n-workflow-automation / notebooklm / prompt-engineering / v0 / windsurf

---

## P0 · 薄章节扩字数（< 2000 字 → 2200+ 字）

- [x] claude-code-guide/01-getting-started.md — expand: 1727→2200+，补 macOS/Linux/Windows install 命令、第一个 prompt 实战示例、常用 keybinding 速查表
- [x] claude-code-guide/02-multi-file-editing.md — expand: 1870→2200+，补真实多文件 refactor case（rename 一个 React component 涉及 5 个文件）+ diff 对比
- [x] claude-code-guide/03-git-workflow.md — expand: 1837→2200+，补 PR 创建命令实战 + merge conflict 解决流程 + git worktree 配合用法
- [x] n8n-workflow-automation/01-what-is-n8n.md — expand: 1709→2200+，补 n8n vs Zapier vs Make 对比表（含价格 / API 上限）+ self-host vs cloud 决策树
- [x] v0-guide/02-getting-started.md — expand: 1543→2200+，补 v0.dev 注册流程截图描述、第一个 React 组件实战、与 Vercel 部署联动
- [x] v0-guide/03-core-features.md — expand: 1899→2200+，补 generative UI 实战 case（dashboard 从零生成）+ shadcn/ui 集成细节
- [x] windsurf-guide/03-core-features.md — expand: 1873→2200+，补 Cascade 真实多文件改动 case（重构一个 Express middleware）
- [x] windsurf-guide/04-advanced-tips.md — expand: 2038→2400+，补 .windsurfrules 案例（前端项目 / 后端项目）+ Cascade memory 用法
- [x] windsurf-guide/05-faq.md — expand: 1741→2200+，补 vs Cursor / vs Claude Code 选型对比表 + 价格说明
- [x] windsurf-guide/06-cascade-debugging.md — expand: 1983→2200+，补真实 bug fix 完整流程 + 高效调试 prompt 模板 3-5 个

## P1 · 缺图

- [x] lovable-guide/05-faq.md — add-image: 加 1 张截图（Lovable 价格页 / 项目 dashboard）

## P2 · 短书扩章（5 章 → 7 章）

### bolt-new-guide
- [x] bolt-new-guide/06-fullstack-deploy.md — new-chapter: bolt.new + Supabase + Vercel 全栈部署实战（注册 → 数据库 → 部署，2200+ 字 + 1 截图 + 完整代码块）
- [x] bolt-new-guide/07-team-collaboration.md — new-chapter: 团队协作工作流（GitHub 集成、code review、共享项目权限）

### cursor-guide
- [x] cursor-guide/06-mcp-servers.md — new-chapter: Cursor MCP 集成实战（GitHub MCP / Notion MCP / Postgres MCP 配置 + 真实 use case）
- [x] cursor-guide/07-rules-mdc-deep.md — new-chapter: .cursor/rules/*.mdc 文件深度解析（scope types / 触发规则 / 多 rule 冲突解决）

### dify-guide
- [x] dify-guide/06-rag-knowledge-base.md — new-chapter: Dify RAG 知识库实战（文档切片策略 / 向量检索调优 / re-ranking）
- [x] dify-guide/07-self-hosting.md — new-chapter: Dify 自部署完整指南（Docker Compose + Nginx 反向代理 + HTTPS 配置）

### gamma-guide
- [x] gamma-guide/06-template-customization.md — new-chapter: 模板深度定制（品牌色 / 字体 / 布局 / 母版编辑）
- [x] gamma-guide/07-export-workflows.md — new-chapter: 导出工作流（PDF 高质量 / PPT 兼容 PowerPoint / Notion 同步）

### lovable-guide
- [x] lovable-guide/06-supabase-integration.md — new-chapter: Lovable + Supabase 完整集成（auth / database / storage / realtime）
- [ ] lovable-guide/07-deploy-production.md — new-chapter: 从 Lovable 到生产（custom domain / SEO meta / Google Analytics 接入）

### notebooklm-guide
- [ ] notebooklm-guide/06-audio-overview-deep.md — new-chapter: Audio Overview 深度玩法（多语言切换 / 自定义视角 prompt / 个性化主持人风格）
- [ ] notebooklm-guide/07-research-workflow.md — new-chapter: 用 NotebookLM 做学术研究的完整工作流（论文管理 → 笔记 → 综述）

## P3 · n8n-guide 补全（3 章 → 5 章）

- [ ] n8n-guide/03-core-features.md — new-chapter: n8n 核心特性（不与 02-five-killer-workflows 重复，聚焦 trigger / node / expression 体系）
- [ ] n8n-guide/04-advanced-tips.md — new-chapter: 高阶技巧（sub-workflow / error workflow / credentials 管理）
- [ ] n8n-guide/05-faq.md — new-chapter: FAQ 与故障排查（常见报错 / 性能瓶颈 / 与 Make 对比）

## P4 · 长书扩章（8 章 → 10 章）

### claude-code-guide
- [ ] claude-code-guide/09-subagent-design.md — new-chapter: Subagent 设计模式（什么时候用 / prompt 结构 / 与主对话隔离的好处）
- [ ] claude-code-guide/10-skills-system.md — new-chapter: Skills 系统实战（自定义 skill 的完整流程 + 真实例子）

### v0-guide
- [ ] v0-guide/09-design-system-integration.md — new-chapter: 设计系统集成（Figma → v0 → 代码的完整 pipeline）
- [ ] v0-guide/10-multimodal-prompts.md — new-chapter: 多模态 prompt（截图还原 UI / 设计稿转代码的最佳实践）

### windsurf-guide
- [ ] windsurf-guide/09-windsurf-vs-cursor-deep.md — new-chapter: Windsurf vs Cursor 深度对比（场景驱动选型，含速度 / 价格 / Cascade vs Composer）
- [ ] windsurf-guide/10-team-rules-strategy.md — new-chapter: 团队 rules 策略（共享 .windsurfrules vs 个人 / 与 git 协作的最佳实践）

### n8n-workflow-automation
- [ ] n8n-workflow-automation/09-error-handling.md — new-chapter: 错误处理与重试策略（error workflow / dead letter queue / 监控告警）
- [ ] n8n-workflow-automation/10-cost-optimization.md — new-chapter: n8n cloud 成本优化（execution 配额 / self-host 决策点 / 高频 workflow 优化）

---

## 历史已完成（routine 自动追加 `[x]` 到这里 — 暂为空）
