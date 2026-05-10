---
title: "RAG 系统：让 LLM 知道你公司内部数据"
wiki: "ai-engineer"
order: 4
description: "Embedding / 向量库 / chunking / 检索 / hybrid search / reranking — 一个生产级 RAG 全栈拆解"
---

## RAG 解决的问题

LLM 训练数据有 cutoff，**它不知道你公司的代码库、客户工单、产品文档、合同条款**。要让它知道，有两条路：

1. **Fine-tuning**：把数据训进模型权重（贵、慢、改一次重训一次）
2. **RAG (Retrieval-Augmented Generation)**：每次提问时**先去外部存储找相关内容，把找到的塞进 prompt**

99% 场景选 RAG。理由：实时（数据改了立刻生效）、可控（哪条信息回答的可追溯）、便宜（不用 GPU 训练）、能权限隔离（用户 A 看不到用户 B 数据）。

## RAG 的最小流程

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│ User Q  │ ──1──▶  │ Embedding│ ──2──▶  │ Vector DB│
└─────────┘         └──────────┘         └──────────┘
                                              │ 3 (top-k)
                                              ▼
                  ┌────────────┐         ┌──────────┐
                  │ Final ans  │ ◀──5──  │   LLM    │ ◀──4── retrieved chunks + Q
                  └────────────┘         └──────────┘
```

1. 用户提问转成向量
2. 在向量库里搜相似度最高的 top-k 文档片段
3. 拼成 prompt（`基于以下资料回答：[chunks]\n用户问：[Q]`）
4. 喂给 LLM 生成最终答案
5. 返回给用户

听起来 5 步很简单。但每一步细节都能让你 RAG 翻车——下面挨个拆。

## Step 1：把文档切成 Chunks（最容易翻车的一步）

向量库存的不是整本文档，是**文档切片**（chunks）。切的好搜得准，切的烂答非所问。

### 三种切法

| 策略 | 怎么切 | 适合场景 | 翻车点 |
|------|--------|---------|-------|
| **固定大小** | 每 500 token 切一块 | 长一致风格的文档 | 切断句子 / 切断代码块 |
| **按结构（Markdown / HTML）** | 按 H1/H2/H3 切 | 结构化文档 | section 太长就废 |
| **递归切（langchain RecursiveCharacterTextSplitter）** | 先按章节，章节太大再按段落，再按句子 | 大部分场景默认 | 调参数烦 |

### 黄金参数（默认起手）

```python
chunk_size = 1000       # 每块约 1000 字符 ≈ 250 token
chunk_overlap = 200     # 相邻块重叠 200 字符（防切断关键信息）
```

**Overlap 必须有**。如果一个事实横跨切片边界，没 overlap 就两块都答不全。20% overlap 是经验值。

### 代码（递归切）

```typescript
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '。', '. ', ' ', ''] // 中英文混合
});

const docs = await splitter.createDocuments([fullText]);
// docs = [{ pageContent: "...", metadata: {} }, ...]
```

### 进阶：保留 metadata

每个 chunk 必须带 metadata：来源文件、页码、章节、updated_at、access_level。**这些之后会救命**：

```typescript
{
  pageContent: "Claude Sonnet 4.6 的 input 价格是 $3/M tokens...",
  metadata: {
    source: "anthropic-pricing.md",
    section: "Sonnet pricing",
    last_updated: "2026-04-01",
    access_level: "public"
  }
}
```

## Step 2：把 Chunk 转成向量（Embedding）

Embedding model 把一段文字映射成一个固定维度的向量（比如 1536 维），**语义相近的文字在向量空间里距离近**。

### 主流 embedding model（2026）

| Model | Dimensions | $/1M tokens | 备注 |
|-------|-----------|------------|------|
| OpenAI `text-embedding-3-large` | 3072 | $0.13 | 综合最强、最常用 |
| OpenAI `text-embedding-3-small` | 1536 | $0.02 | 性价比版 |
| Cohere `embed-multilingual-v3` | 1024 | $0.10 | 多语言好 |
| Voyage `voyage-3` | 1024 | $0.06 | Anthropic 推荐 |
| BGE-M3 (开源) | 1024 | 自部署 | 中文好、可私有化 |

**默认起手用 `text-embedding-3-small`**：便宜、够好、生态最熟。中文重的项目可以换 BGE-M3 或 Voyage-3。

```typescript
import OpenAI from 'openai';
const openai = new OpenAI();

const res = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: ['Claude Sonnet 4.6 的价格是...'],
});

const embedding = res.data[0].embedding; // [0.012, -0.045, ...] 1536 维
```

### 黄金规则：query 和 doc 用**同一个** model

把文档 embedding 用 model A，查询时 embedding 用 model B —— 距离计算完全没意义。听起来废话但生产环境常见 bug，特别是后期想换 embedding model 时**必须重新 embed 全部文档**。

## Step 3：存进向量库

| 向量库 | 主打 | 适合 |
|--------|------|------|
| **pgvector**（PostgreSQL 插件） | 不引入新 infra | 已经在用 Postgres 的项目，<10M chunks |
| **Pinecone** | 全托管、成熟 | 不想运维、预算够 |
| **Weaviate** | 自托管 + GraphQL | 中型团队、需要混合查询 |
| **Qdrant** | 速度快、Rust 写的 | 高 QPS、关心延迟 |
| **Chroma** | 嵌入式、文件存储 | 本地开发、demo |
| **MongoDB Atlas Vector Search** | MongoDB 原生 | 已经 mongo 的项目（如匠人学院 ）|

匠人内部 RAG 实际就用 **MongoDB Atlas Vector Search**——已经有 MongoDB 不想引入 Pinecone。pgvector 是另一个推荐，特别是 < 1M chunks。

### pgvector 例子

```sql
-- 建表
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE doc_chunks (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  source TEXT,
  section TEXT,
  access_level TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 建 HNSW 索引（百万级数据必备）
CREATE INDEX ON doc_chunks USING hnsw (embedding vector_cosine_ops);

-- 查询
SELECT content, source, 1 - (embedding <=> $1) AS similarity
FROM doc_chunks
WHERE access_level = 'public'    -- 权限过滤
ORDER BY embedding <=> $1         -- cosine distance
LIMIT 5;
```

`<=>` 是 pgvector 的 cosine distance 操作符。`1 - distance` 就是相似度（0-1）。

## Step 4：检索 + 融合（最影响效果的一步）

Naive RAG 就是"top-5 相似度最高的 chunks 塞 prompt"。但真实数据下这个简单方案准确率 60-70%，离生产可用还远。

### 提升准确率的三连击

#### a. Hybrid Search（向量 + 关键词）

向量搜偏语义，关键词搜（BM25）偏精确匹配。**两个一起用，融合 score**。

```
Query: "Claude API 限流是多少 RPM？"

向量搜：找到 "Anthropic 速率限制说明..." (语义匹配)
BM25 搜：找到 "Claude API rate limit RPM..." (词匹配)

融合后 top-5 比单独哪个都好。
```

实现：用 [Reciprocal Rank Fusion (RRF)](https://en.wikipedia.org/wiki/Reciprocal_rank_fusion) 算法，不用调参：

```python
def rrf_merge(vector_results, keyword_results, k=60):
    scores = {}
    for rank, doc in enumerate(vector_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (k + rank)
    for rank, doc in enumerate(keyword_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (k + rank)
    return sorted(scores.items(), key=lambda x: -x[1])
```

匠人简历 / 工单 RAG 用 hybrid 后准确率从 ~70% → ~88%，没换模型没换 embedding。

#### b. Reranking（用专门 model 把 top-50 重排成 top-5）

第一次检索用 embedding 召回 top-50（recall 优先），然后用 reranker 模型给这 50 个重新打分挑出真正相关的 top-5。

| Reranker | 价格 | 备注 |
|----------|------|------|
| Cohere `rerank-3` | $1/1K queries | 最常用 |
| Voyage `rerank-2` | $0.05/1M tokens | 性价比 |
| BGE-reranker-v2 (开源) | 自部署 | 中文好 |

```typescript
import { CohereClient } from 'cohere-ai';
const cohere = new CohereClient();

const reranked = await cohere.v2.rerank({
  model: 'rerank-3',
  query: userQuery,
  documents: top50Chunks.map(c => c.content),
  topN: 5
});
```

**Reranker 是 RAG 准确率的另一个 step function**。从 88% 再提到 ~94%。

#### c. Query Rewriting（用 LLM 改写 query 再搜）

用户问 "我能用 Claude 写论文吗？" → embedding 出来不一定匹配你库里的 "学术使用条款"。让 LLM 先改写：

```
原 query: 我能用 Claude 写论文吗？
改写后：
- Claude 学术写作政策
- Claude 论文使用条款
- 用 Claude 生成 academic 内容是否允许
```

3 个改写后的 query 各搜一次，结果合并。这一招对中文 RAG 提升尤其大（中文 embedding 比英文略弱）。

## Step 5：把检索结果塞 Prompt 喂 LLM

```
你是匠人学院的客服。基于以下资料回答用户问题。
如果资料里没有相关信息，**直接说"这个问题我没有资料"**，不要瞎编。

资料：
[chunk 1 — 来源: pricing-faq.md]
...

[chunk 2 — 来源: refund-policy.md]
...

用户问题：{user_query}
```

**两个生死线**：

1. **必须给"不知道时怎么办"的指令**。不写的话模型会硬编。
2. **必须带 source attribution**。chunk 头部加来源标识，让模型在答案里能引用 → 用户能验证。

匠人简历功能的真实 prompt 长这样（精简版）：

```
你是简历优化助手。基于以下匠人内部规范回答用户问题。

规范：
[chunk 1 — 来源：resume-format-guide.md]
...

[chunk 2 — 来源：australian-resume-best-practices.md]
...

用户简历摘要：
{resume_summary}

用户问题：
{user_query}

要求：
1. 答案必须基于上面规范，不要编造
2. 每个建议后用 [来源: filename] 标注
3. 如果规范里没说，回复"匠人规范暂无该项明确建议"
```

## 一个完整的 RAG 系统架构

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Documents    │─────▶│ Ingestion    │─────▶│ Vector DB +  │
│ (PDF/MD/Web) │      │ (split + embed)     │ Postgres BM25│
└──────────────┘      └──────────────┘      └──────┬───────┘
                                                    │
┌──────────────┐                                    │
│ User Query   │──┬─Vector ────┐    ┌─Reranker─┐   │
└──────────────┘  ├─BM25      ─┼───▶│ top-5    │◀──┘
                  └─Rewrite ───┘    └────┬─────┘
                                         │
                                  ┌──────▼──────┐
                                  │ LLM + Prompt│
                                  └──────┬──────┘
                                         │
                                  ┌──────▼──────┐
                                  │ Final Ans   │
                                  └─────────────┘
```

匠人内部知识库 RAG 就是这个架构，跑了一年多，每天 1000+ 查询，准确率稳定在 90%+。

## RAG 翻车清单（生产事故复盘）

| 症状 | 真因 | 修法 |
|------|------|------|
| 查询返回相似但答非所问 | chunk 太大或没 overlap | 调 chunk_size + overlap |
| 中文 query 召回质量差 | 用了英文 embedding model | 换 BGE-M3 或 Voyage |
| 经常返回旧信息 | metadata 没存 updated_at，没按时间排 | 加 metadata，retrieval 时按时间排 |
| 答案权威性不够 | 没 source attribution | prompt 里强制要求带 [来源: ...] |
| 用户 A 看到 B 数据 | 没在 retrieval 加 access_level filter | 必须按权限过滤 |
| 上下文窗口爆 | top-k 设太大 / chunks 太长 | 减 top-k 或开 reranker 后只取 5 |

## 本章小结

- RAG = embed → store → retrieve → augment prompt → generate，5 步缺一不可
- chunk 切法决定召回上限，hybrid search + reranker 决定准确率上限
- 必须存 metadata（source / access_level / updated_at）+ 强制 source attribution
- 默认起手：`text-embedding-3-small` + pgvector + recursive splitter（1000/200）+ Cohere rerank-3
- prompt 必须给"不知道时回复"的兜底指令

下一章进 Agent + Tool Use——**让 LLM 不只是回答，而是去执行动作**。
