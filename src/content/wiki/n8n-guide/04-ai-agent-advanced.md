---
title: "n8n AI Agent 深度实战：Claude + 记忆 + 工具 + RAG 知识库"
wiki: "n8n-guide"
order: 4
description: "用 n8n 构建有记忆、会调工具、能查知识库的 Claude AI Agent——从单节点到 Human-in-the-Loop 完整实战"
---

第2章的案例四（Telegram 客服 Bot）只是入门。这章深入讲 n8n AI Agent 的完整架构：选对记忆类型、给 Agent 配工具、接入向量数据库做 RAG，以及加上人工审批让 AI 不乱来。

---

## AI Agent 的完整结构

n8n 的 AI Agent 节点基于 LangChain 构建，是一个**编排层**——它自己不做任何事，而是协调下面挂载的子节点：

```
AI Agent 节点
├── [Chat Model] 必填：提供语言能力（OpenAI / Claude / Gemini / Ollama）
├── [Memory]    可选：对话历史（没有就每次从零开始）
├── [Tool 1]    可选：让 AI 可以调用的"手"
├── [Tool 2]    可选：（可以挂多个工具）
└── [Tool N]    ...
```

每次用户发消息，Agent 的推理过程大致是：

1. 读取 System Prompt + 历史对话（Memory）
2. 思考：要不要调用工具？调哪个？传什么参数？
3. 调工具 → 看结果 → 继续思考（可能循环多次）
4. 输出最终答案

---

## 接入 Claude（推荐 Sonnet 4）

n8n 原生支持 Anthropic，直接搜 "Anthropic Chat Model" 节点。

### 配置步骤

1. **创建 Anthropic Credential**
   - 左侧菜单 → Credentials → Add → 搜 "Anthropic"
   - 填入 API Key（从 `console.anthropic.com` 获取）

2. **在 AI Agent 的 Chat Model 插槽点击 `+`，选 "Anthropic Chat Model"**

3. **节点参数**

   | 参数 | 推荐值 | 说明 |
   |------|--------|------|
   | Model | `claude-sonnet-4-5` | 高性价比首选 |
   | Max Tokens | 4096 | 回答长度上限 |
   | Temperature | 0.3 | 降低随机性，让客服回复更稳定 |

4. **Claude 特有优势：超长上下文 + XML prompt**

   Claude 支持 200K token 上下文，适合处理长文档场景。Prompt 用 XML 标签结构化效果最好：

   ```xml
   <role>你是 JR Academy 的课程顾问，专注澳洲 IT 就业辅导</role>
   
   <rules>
   - 只回答与 JR Academy 课程和澳洲 IT 行业相关的问题
   - 不透露内部定价政策，报价引导用户联系顾问
   - 遇到无法回答的问题说：我来帮你转接专业顾问
   - 所有回复控制在 150 字以内
   </rules>
   
   <context>
   {{ $json.companyBackground }}
   </context>
   ```

---

## Memory：选对记忆类型

不同场景选不同 Memory 节点，选错了要么浪费资源要么数据丢失。

### Window Buffer Memory（最常用）

保留最近 N 轮对话，按 Session Key 区分不同用户。

```
配置：
  Context Window Length: 10   （保留最近10轮，超出自动滚动丢弃）
  Session Key: {{ $("Telegram Trigger").item.json.message.chat.id }}
```

存储在 n8n 内存里，重启后丢失。适合：客服 Bot、轻量对话助手。

### Postgres Chat Memory（生产首选）

把对话历史存到 PostgreSQL，重启不丢、支持多实例横向扩展。

```
配置：
  Table Name: n8n_chat_histories  （首次使用会自动建表）
  Session ID: {{ $("Webhook").item.json.userId }}
  Context Window Length: 20
```

适合：有数据持久化需求的正式产品。

### Simple Vector Store Memory（语义检索）

把历史对话向量化，每次检索语义最相关的几条，而不是最近几条。适合历史很长但 token 预算有限的场景。

---

## 给 Agent 配工具

工具（Tool）是 Agent 的"手"——AI 自主决定何时调用、传什么参数。**工具描述写得好不好，直接决定 AI 能不能用对工具**。

### HTTP Request Tool：调任意外部 API

```
Tool Name: get_exchange_rate
Description: 查询两种货币之间的汇率。当用户问到汇率或货币转换时调用。
             输入参数：from（源货币代码，如 AUD）、to（目标货币，如 CNY）
Method: GET
URL: https://api.exchangerate-api.com/v4/latest/{{ $fromTool.from }}
```

### Code Tool：让 AI 执行自定义逻辑

```javascript
// Tool Name: calculate_course_fee
// Description: 根据课程名称和折扣码计算最终价格
const coursePrices = {
  "Full Stack": 8990,
  "Data Analytics": 6990,
  "AI Engineering": 9990
};

const discounts = { "JR2026": 0.1, "EARLY": 0.15 };

const price = coursePrices[input.course] || 0;
const discount = discounts[input.code] || 0;
const final = price * (1 - discount);

return { original: price, discount: `${discount * 100}%`, final };
```

### n8n Workflow Tool：调用子工作流

这是 2026 年最强大的工具——让一个 Agent 触发另一个独立的 workflow，实现**多 Agent 协作**：

```
Tool Name: search_knowledge_base
Description: 在 JR Academy 知识库中搜索课程、师资、就业数据等信息。
             当用户问具体课程内容、师资背景、就业率时调用。
Workflow: 选择 "知识库搜索 workflow"（独立 workflow，内部做 RAG）
```

---

## RAG 知识库：让 Agent 知道你的业务

RAG（Retrieval-Augmented Generation）= 先从知识库检索相关段落，再让 AI 基于这些内容回答，避免 AI 胡编乱造。

### 知识库搭建（一次性）

```
[Document Loader]（读 PDF/网页/Notion 等）
    ↓
[Text Splitter]（切成 500-1000 字的块）
    ↓
[Embeddings]（向量化，用 OpenAI text-embedding-3-small 或 Anthropic）
    ↓
[Vector Store]（存到 Qdrant / Supabase PGVector / Pinecone）
```

n8n 原生支持的向量数据库：Qdrant、Pinecone、Supabase（pgvector）、Weaviate、MongoDB Atlas、Postgres PGVector。

### 实战：用 Qdrant 搭 JR Academy 课程知识库

**Step 1**：建立索引 workflow（手动跑一次）

```
Manual Trigger
    ↓
Read Binary Files（读取课程 PDF 文件夹）
    ↓
PDF Loader
    ↓
Recursive Character Text Splitter
  chunk_size: 800
  chunk_overlap: 100
    ↓
OpenAI Embeddings（text-embedding-3-small）
    ↓
Qdrant Vector Store（Operation: Insert, Collection: jr_academy_kb）
```

**Step 2**：查询 workflow（每次用户提问时调用）

```
Workflow Trigger（被主 Agent 调用）
    ↓
Qdrant Vector Store（Operation: Retrieve, Top K: 5）
    ↓
[连接到 AI Agent 的 Tool 插槽或直接返回结果]
```

**Step 3**：在主 AI Agent 的 System Prompt 里告诉它怎么用：

```xml
<tools_guidance>
当用户问到课程详情、价格参考、师资、就业数据时，
先调用 search_knowledge_base 工具获取准确信息，
基于返回的内容回答，不要凭空编造数据。
</tools_guidance>
```

---

## Human-in-the-Loop：关键操作前人工审批

AI 不是永远可信的。对于高风险操作（发邮件、修改数据库、转账），在 n8n 里加一个人工审批节点，让 Agent "暂停等人确认"。

### 配置方法

在需要审批的 Tool 节点里开启 **"Require human approval"**：

```
[AI Agent]
    └── [Tool: Send Promotional Email]
            ✅ Require Human Approval: ON
```

触发时，workflow 暂停并向指定渠道（Email/Slack/Telegram）发送审批请求：

```
🔔 AI 请求执行操作：
工具：发送促销邮件
收件人：zhangsan@example.com
内容摘要：Python 课程限时 8 折...

[✅ 批准] [❌ 拒绝]
```

点击按钮后 workflow 继续执行或放弃该工具调用。

**哪些操作应该加审批**：
- 发送邮件 / 短信 / Slack 消息
- 修改、删除数据库记录
- 调用付费 API（防止 AI 循环调用导致账单暴涨）
- 触发对外 Webhook（发送到第三方系统）

---

## 完整实战：多工具 Claude 客服 Agent

把上面所有内容组合成一个能实际上线的 Agent：

```
Chat Trigger（网站聊天窗口）
    ↓
AI Agent
  ├── [LLM] Anthropic Claude Sonnet 4
  ├── [Memory] Postgres Chat Memory（持久化，按用户 ID 隔离）
  ├── [Tool] search_knowledge_base（RAG，查课程知识库）
  ├── [Tool] get_course_schedule（HTTP Request，查开课日期 API）
  └── [Tool] create_inquiry（HTTP Request + 审批，创建 CRM 线索）
    ↓
Respond to Chat
```

**System Prompt**（完整版）：

```xml
<role>
你是 JR Academy 的 AI 课程顾问 "小 JR"。
JR Academy 是澳洲专业 IT 职业培训机构，专注帮助华人移民进入 IT 行业。
</role>

<capabilities>
- 回答课程内容、学习方式、时长、适合人群
- 查询开课时间（调用 get_course_schedule）
- 查询详细课程信息（调用 search_knowledge_base）
- 收集用户意向，创建顾问跟进线索（调用 create_inquiry）
</capabilities>

<boundaries>
- 不承诺具体就业薪资
- 不透露内部折扣政策，引导用户联系顾问
- 不回答与 IT 培训无关的问题
</boundaries>

<style>
亲切自然，像朋友聊天而非正式客服。回复控制在 200 字以内。
适当用 emoji 增加亲和感，但不要过度。
</style>
```

这个 Agent 上线后可以处理 80% 以上的初步咨询，只有真正需要深入沟通的用户才转给人工顾问。

---

## 性能与成本控制

| 优化点 | 做法 |
|--------|------|
| 降低 LLM 成本 | 分类问题先用 Haiku 判断，复杂问题才升级用 Sonnet |
| 减少 RAG 检索次数 | 在 System Prompt 里指定何时才需要检索，避免每句话都查 |
| Memory 控制 Token | Window Buffer Length 设 10-15，超长对话用 Summary Memory 压缩 |
| 工具调用超时 | 所有 HTTP Request Tool 设置超时（建议 30s），超时后告诉用户重试 |
| 监控异常 | 配置 Error Workflow，AI Agent 出错立即推 Slack 告警 |
