---
title: "AI Engineer 是什么：和 ML Engineer 有什么不一样"
wiki: "ai-engineer"
order: 1
description: "AI Engineer 这个岗位是怎么来的、和 ML / Data Scientist / AI Researcher 的边界、澳洲 2026 年的真实薪资、技能栈速览"
---

## 一句话

**AI Engineer = 把已经训练好的大模型（Claude / GPT / Gemini / Llama）拼装成产品的工程师。**

不训练模型本身，不刷 Kaggle，不做学术 paper。每天的工作是：写 Prompt、设计 RAG、调 API、搭 Agent、上线、看 token 账单、被 PM 追问"幻觉怎么办"。

这个岗位 2023 年之前几乎不存在。OpenAI 把 GPT-3.5 API 开放后才独立成型，2025 年下半年开始进入主流招聘 JD，2026 年澳洲已经是 mid-level 岗位的标配题。

## 和其他 AI 相关岗位的边界

很多人面试 AI Engineer 时把岗位说成"我会一点 PyTorch"，HR 一看这是 ML Engineer 的话术，直接刷掉。下表是 2026 年澳洲 JD 里的真实分工：

| 岗位 | 核心产出 | 主要技能 | 谁招 |
|------|---------|---------|------|
| **AI Engineer** | LLM 应用产品（聊天助手、RAG、Agent） | Prompt / API / Vector DB / TypeScript or Python | 大部分公司，所有行业 |
| ML Engineer | 训练、部署传统 ML 模型 | PyTorch / sklearn / MLflow / SageMaker | 有数据团队的公司 |
| Data Scientist | 数据分析 + 假设验证 | SQL / Python / Pandas / 统计 | 有数据团队的公司 |
| AI Researcher | 模型架构、新算法 | CUDA / Transformers / 数学 / paper | OpenAI / Anthropic / Google DeepMind / 大厂 lab |

**最容易混淆的是 AI Engineer vs ML Engineer**：

- ML Engineer 关心"模型本身好不好"——loss 曲线、训练数据、超参、metrics
- AI Engineer 关心"模型套出来的产品好不好"——latency、cost、用户体验、幻觉控制、上下文管理

举个具体例子：一个客服机器人项目

- ML Engineer 路线：收集历史工单 → 标注 → 训一个分类模型决定问题类型 → 部署
- AI Engineer 路线：写一个 system prompt 让 Claude 扮演客服 → 接 vector DB 查公司知识库 → 接 ticket API 让它自己开工单 → 上线

后者代码量不到前者的 1/10，效果还可能更好。这就是为什么 AI Engineer 岗位 2024 年开始爆发——**ROI 完全不一样**。

## 澳洲 2026 年薪资行情

数据源：Seek 2026 Q1 / LinkedIn Salary Insights / Hays IT Salary Guide。所有数字都是 base salary，不含 super 和 RSU。

| 级别 | Sydney / Melbourne | Brisbane / Perth |
|------|-------------------|------------------|
| Junior (0-2 yrs) | $95K - $115K | $80K - $100K |
| Mid (2-5 yrs) | $130K - $165K | $115K - $140K |
| Senior (5+ yrs) | $170K - $220K | $150K - $185K |
| Staff / Lead | $230K - $300K+ | $200K - $260K |

几个 2026 年才出现的 pattern：

1. **AI-only 岗位明显比 full-stack 高一档**：同样 senior，纯 AI Engineer 比 senior full-stack 高 $20-40K。原因是供给少、需求暴涨。
2. **Big 4 银行 / 保险全部在招**：CBA、ANZ、NAB、Westpac、Macquarie 2025 下半年开始集中招 AI Engineer，主要做内部知识库 + 反欺诈 + 客服自动化。Bupa、Medibank、Suncorp 这些保险公司也跟上。
3. **Visa sponsor 友好度**：AI Engineer 岗位 sponsor 比例比传统 dev 高，因为本地候选人数量少。但要注意 ANZSCO code，目前 AI Engineer 没独立代码，多走 261313 (Software Engineer) 或 224114 (Statistician) 申请，每个公司操作不一样。

## AI Engineer 的技能栈（2026 版）

不是"全部都要懂"，而是"必须懂的核心 + 选学的扩展"。

### 必须懂的核心（4 个月内可以速成）

```
┌─────────────────────────────────────────┐
│  1. LLM API：OpenAI / Anthropic SDK    │  ← 第 2 章
├─────────────────────────────────────────┤
│  2. Prompt Engineering：System / CoT    │  ← 第 3 章
├─────────────────────────────────────────┤
│  3. RAG：embedding / chunking / 检索    │  ← 第 4 章
├─────────────────────────────────────────┤
│  4. Function Calling / Tool Use         │  ← 第 5 章
└─────────────────────────────────────────┘
```

这 4 个东西串起来就能做出 80% 的 AI 产品。注意**不在这个列表里的**：

- ❌ 不需要会 PyTorch、TensorFlow、训练代码
- ❌ 不需要懂 attention 数学推导（懂概念就够）
- ❌ 不需要会 CUDA、分布式训练
- ❌ 不需要刷 LeetCode hard（但 medium 还是要会，写 RAG 时 chunking / 向量距离都涉及算法）

### 选学的扩展（按业务方向）

| 方向 | 技能 |
|------|------|
| **B2B 工具（Cursor / Notion AI 这种）** | 流式 streaming / 多 turn / 上下文窗口管理 |
| **企业内部知识库** | 权限控制 / SSO / 数据脱敏 / 合规（澳洲 Privacy Act） |
| **AI Agent 产品** | Function calling / multi-agent orchestration / human-in-the-loop |
| **垂直行业（法律 / 医疗 / 金融）** | 领域 fine-tuning / 严格 evaluation / 幻觉零容忍 |
| **多模态（视觉 / 语音）** | Whisper / GPT-4V / ElevenLabs / 实时音视频流 |

## 这本指南的阅读路径

8 章按"由浅入深 + 实战导向"组织，建议**按顺序读**，因为后一章经常用前一章的概念：

1. **本章** - 是什么、行情、技能栈
2. **LLM 基础** - 模型对比、API 用法、pricing 算法
3. **Prompt Engineering** - 工程化的 prompt 不是聊天框里那种，要版本管理、要 A/B 测、要能被 unit test
4. **RAG 系统** - vector DB / 切片 / 检索 / reranking 全栈
5. **Agent + 工具** - function calling、MCP、多 Agent 协作
6. **微调 vs 评估** - 什么时候要 fine-tune、不 fine-tune 怎么 eval
7. **生产部署** - latency、cost、observability、限流
8. **求职** - 简历怎么写、项目怎么做、面试怎么过

每一章都会有具体代码 + 真实工具版本号 + 链接到匠人平台对应的 [Bootcamp](https://jiangren.com.au/bootcamp) 或 [Lab](https://jiangren.com.au/study-center?tab=learn)。

## 适合谁读

- ✅ **传统 backend / frontend 开发想转 AI Engineer**：本指南就是为你写的，跳过第 6-7 章先看 1-5 章可以快速建立全局
- ✅ **CS 学生 / 留学生准备求职 AI 岗**：重点看第 8 章求职 + 第 4-5 章把 RAG / Agent 做成项目
- ✅ **PM / 设计师想懂 AI Engineer 在干嘛**：1-3 章读完就够，4-7 章可选
- ⚠️ **想做 AI 研究员 / 训练大模型**：这本不适合你，你应该看 *Designing Machine Learning Systems* + arXiv

下一章我们正式进 LLM 工作原理和 API 用法。
