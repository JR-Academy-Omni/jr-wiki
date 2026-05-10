---
title: "求职：从转行到拿 offer 的实操路径"
wiki: "ai-engineer"
order: 8
description: "AI Engineer 简历怎么写、项目做什么、面试准备什么、澳洲找工作哪里投——一份不空谈的求职 playbook"
---

## AI Engineer 求职市场的现实

2026 年的现实：

- **岗位数暴增**：澳洲 Seek 上"AI Engineer" 关键词岗位 2026 Q1 比 2024 Q1 涨了 4 倍
- **要求越来越高**：2024 年"会用 ChatGPT API"就能拿 offer，2026 年面试官问 RAG 架构、agent 设计、cost 优化、eval 体系
- **本地候选人少**：CS 毕业生大多直接奔 AI Engineer 方向，但有真实 production 经验的少
- **Visa sponsor 比传统 dev 友好**：因为本地供给少

意味着：**有真正项目作品 + 能讲清楚 trade-off 的候选人非常有竞争力**，无论你之前是 backend / frontend / data engineer 转过来的。

## 简历怎么写

### 致命误区

❌ "熟练使用 ChatGPT，能用 prompt 解决问题"  
❌ "了解 LangChain / LlamaIndex 等 AI 框架"  
❌ "对大语言模型有浓厚兴趣"

这些 HR 看了立刻丢——空话、套话、零信号。

### 高信号写法

把每个项目按 **STAR + 数字** 结构写：

```
✅ 设计并上线匠人内部知识库 RAG 系统（Claude Sonnet + pgvector + Cohere rerank）：
   - 把 1200 份内部文档接入向量检索，每天处理 800+ 查询
   - 用 hybrid search + reranker 把准确率从 71% (naive) 提到 92%
   - Prompt caching + Haiku routing 把月度成本从 $580 降到 $145
   - 完整 observability：用 Langfuse 追每个调用的 latency / cost / 准确率
```

- 数字：1200 份、800 query/天、71→92%、$580→$145
- 技术栈：Claude Sonnet / pgvector / Cohere rerank / Langfuse
- Tradeoff：accuracy ↑ + cost ↓ 同时优化（不只是"做出来"）

**HR / 工程经理一看就知道你做过 production**。

### 简历技能栏

按"我能立刻产出 vs 我了解概念" 分两栏：

```
Production-Ready：
  • LLM API: Anthropic SDK, OpenAI SDK
  • RAG: pgvector / MongoDB Atlas Vector Search
  • Embedding: OpenAI text-embedding-3, Voyage 
  • Tool Use / MCP: 写过 5+ MCP servers
  • Prompt Engineering: 版本管理 + eval-driven 改进
  • Observability: Langfuse, traces 配置
  • Production: rate limiting, PII redaction, prompt caching

Familiar：
  • Multi-Agent: CrewAI / LangGraph 写过 demo
  • Fine-tuning: 跑过 OpenAI fine-tune + 本地 Llama LoRA  
  • Vision: GPT-4V / Claude Vision 简单使用
```

诚实分两栏比所有都列在一起信号高。**面试官最讨厌候选人把"看过教程"和"做过项目"混为一谈**。

## 项目做什么

### 至少 3 个项目，按"复杂度递增" 顺序

#### 项目 1：RAG 应用（必做，所有 AI Engineer 入门项目）

**例子**：把某个垂直领域的 PDF / 网站爬下来，做一个可问答的助手。

**展示能力**：

- 切片 / embedding / vector DB 全链路
- Hybrid search + reranker
- 简单 frontend（Next.js / Streamlit）
- 部署（Vercel / Railway）

**亮点写法**：

> "为澳洲税法（2025 ATO 公开手册，~600 页）做的 RAG 助手。手动评估 50 个真实 query，命中率 88%。开源在 GitHub，500+ stars。"

为什么用税法不用"通用聊天机器人"？**领域越垂直越能体现你能读懂业务 + 能 eval 准确率**。

#### 项目 2：Agent + Tool Use（中级）

**例子**：让 LLM 帮你管理日常事务（日历 / 邮件 / 任务）。

**展示能力**：

- Multi-step tool use loop
- 错误处理 + retry
- Human-in-the-loop（高风险动作要确认）
- MCP server 写一个

**亮点写法**：

> "Personal AI assistant，接 Google Calendar / Gmail / Notion MCP，能跨系统协调（'下周二有时间和 X 见面吗，发邀请')。Multi-step loop 平均 5.3 步完成。开源 + demo 视频。"

#### 项目 3：生产级特性（高级，offer 杀手锏）

挑前两个项目其中一个，加上：

- 完整 observability（Langfuse trace + cost dashboard）
- Eval CI（每次改 prompt 自动跑 50 case golden set）
- Cost optimization（混合模型 router + caching）
- Safety (PII redaction + moderation)
- Rate limiting + auth

**亮点写法**：

> "把项目 1 升级成 production 系统：加 Langfuse trace 监控每次调用 latency/cost；CI 集成 eval（PR 改 prompt 自动跑 baseline）；混合模型 router 把月度 LLM 账单降 64%。文档 + 部署脚本完整，可一键复现。"

这种项目放简历上**直接面试通过率翻倍**。原因：HR 一看就知道你"在公司里做过 production"，不是只会跑 demo。

### 不要做的项目

- ❌ "克隆 ChatGPT" 类——零差异化，面试官见过 1000 个
- ❌ 完全 hardcoded prompts、没 eval、没 observability 的——做了也别写简历
- ❌ "用 Langchain 拼起来" 但没自己写过 prompt / 没调过 retrieval——面试一聊就穿帮

## 面试准备

### 技术面试常问题

**1. RAG 系统设计**

> "你给一个法律 SaaS 设计 RAG 系统，每天处理 5000 query，文档 50G。怎么设计？"

考察点：

- 切片策略（结合法律文档结构）
- vector DB 选型（5000 QPD 不算大，pgvector 够）
- 准确率怎么保证（hybrid + reranker）
- 权限隔离（不同律所看不同数据）
- Cost 估算

**2. 幻觉怎么处理**

> "用户报告 AI 回答错误事实，怎么排查？"

考察点：

- 检查 retrieval：召回的 chunks 里有没有正确信息？
- 检查 prompt：是否给了"不知道时回复 X"的兜底？
- 检查 model 选型：太小的模型在长 context 容易幻觉
- 加 source attribution + post-check

**3. Cost 优化案例**

> "你的 AI 月费 $5K，老板让降 50%，怎么搞？"

考察点：

- 先看账单分解（按 endpoint / model / user）
- 找最贵的 query 模式
- 选项：换 Haiku / 加 caching / batch API / 限制 max_tokens / mixed router
- 预期 trade-off（latency / quality 可能微降）

**4. Eval 体系**

> "你怎么知道 prompt 改完是变好了？"

考察点：

- Golden set + LLM-as-judge
- 多维度（accuracy / completeness / cost / latency）
- Regression test 在 CI 里
- A/B test on production 流量

**5. Production 故障**

> "凌晨 3 点告警，AI endpoint 时延突然飙到 30 秒，怎么排查？"

考察点：

- 看 trace 哪一步慢（embedding / vector search / LLM 自身？）
- 看上游：API rate limit？模型 provider 出问题？
- 看下游：vector DB 慢查询？
- 临时：限流保护剩余流量
- 长期：fallback 到备用模型

### Behavioral Interview

澳洲面试 50% 考 STAR (Situation Task Action Result)：

- "讲一次你做的最难的 AI 项目，遇到什么问题怎么解决"
- "你的项目里 trade-off 怎么做的"
- "你说服 PM 改方案的经历"

**核心**：每个故事必须有数字 + tradeoff + 你的具体动作（不是团队的）。

### LeetCode 还要不要刷

要。AI Engineer 岗位的 coding round 多数还是 LeetCode-style。重点：

- Top 100 medium 必须会
- 两道高频：相似度计算（cosine / dot product）+ 字符串处理（chunking 相关）
- 系统设计：RAG / chat 系统设计

## 哪里投

### 澳洲招 AI Engineer 的公司类型

| 类型 | 例子 | 特点 |
|------|------|------|
| **Big 4 银行 / 保险** | CBA, ANZ, NAB, Westpac, Macquarie, Bupa, Medibank | sponsor 友好、流程慢但稳 |
| **本土 SaaS** | Atlassian, Canva, SafetyCulture, Octopus Deploy | 技术 bar 高、面试严 |
| **海外 AI 独角兽澳洲分** | OpenAI, Anthropic, Cohere | 极少岗位但顶薪 |
| **咨询** | Deloitte, PwC, EY, KPMG (Digital practices) | 项目多样、acceleration 快 |
| **AI startup** | Leonardo.ai, Relevance AI 等 | 学得快、风险也高 |

### 找岗位渠道

1. **LinkedIn** - 关注 "AI Engineer" 关键词，开 "actively looking"
2. **Seek** - 澳洲本地一号求职平台
3. **AngelList / Wellfound** - startup
4. **公司直投**：去公司官网 careers，绕过中介
5. **Referral**：最有效的渠道。匠人 Bootcamp 学员有内推网络

### 简历要不要本地化

要。澳洲简历惯例：

- 1-2 页（不超过 2 页）
- 不放照片、不放年龄、性别、Visa status（可以 visa status 单独问询时再说）
- 用 Aussie spelling（"colour" 不是 "color"，但代码不用改）

详细见匠人 [简历优化工具](https://jiangren.com.au/tools/job-hunter)。

## 链匠人学院的产品矩阵

> 匠人不卖"包就业"承诺。我们提供学习材料、Bootcamp、面试准备工具，帮你做事；offer 是你自己拿的。

针对 AI Engineer 求职的相关产品：

### 学习材料（自学免费 / 部分会员）

- [Learn / AI Engineer 方向](https://jiangren.com.au/learn/ai-engineer) - 章节式 + 代码 + 习题
- [LLM Engineer Lab](https://jiangren.com.au/learn/llm-engineer-handbook) - 8 章交互式 lab，含本地 fine-tune
- [Prompt Master Lab](https://jiangren.com.au/learn/prompt-master) - Prompt Engineering 实战
- [Vibe Coding Lab](https://jiangren.com.au/learn/vibe-coding-lab) - Cursor / Claude Code / 各 AI IDE 实战

### Bootcamp（live cohort）

- [AI Engineer Bootcamp](https://jiangren.com.au/program-course/ai-engineer-bootcamp) - 4 周 cohort，含 RAG / Agent / 部署项目
- [AI Engineer (RAG)](https://jiangren.com.au/program-course/ai-engineer-rag) - 自学版，专注 RAG

### 求职工具

- [求职匠 Job Hunter](https://jiangren.com.au/tools/job-hunter) - 简历优化 + JD 匹配 + AI 面试模拟
- [面试问题库](https://jiangren.com.au/job-interview/process) - 各公司真实面经

### 认证

- [AWS AI Practitioner / ML Engineer](https://jiangren.com.au/certifications) - 给你简历加客观信号

## 写在最后

AI Engineer 是 2026 年最热的岗位之一，但也是要求最快变化的。**今天精通的工具半年后可能被替代**。

不变的是：

- 写好 prompt 的能力
- 设计 RAG / agent 架构的能力
- 做 eval 的能力
- 控制 cost 和 latency 的能力
- 防住 abuse 和 PII 的能力

这本指南覆盖了这些**会用 5-10 年的核心能力**。具体工具（哪个 vector DB、哪个 framework）会变，原理不变。

**下一步建议**：

1. 跑通本指南所有代码示例（约 1 周）
2. 做项目 1（RAG 应用，约 2 周）
3. 做项目 2（Agent，约 2 周）
4. 升级成项目 3（生产级，约 2 周）
5. 简历 + 投 50 家（持续）

7-8 周后你应该有 3 个 GitHub 项目 + 一份能看的简历 + 对面试基本框架熟悉。

剩下的就是**坚持投简历 + 不停 iterate**。澳洲 AI Engineer 求职现在是机会窗口期，进来了就稳。

祝你拿到下一份 offer。
