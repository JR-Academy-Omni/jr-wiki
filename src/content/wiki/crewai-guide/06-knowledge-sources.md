---
title: "Knowledge 知识库：让 Agent 读懂你的私有文档"
wiki: "crewai-guide"
order: 6
description: "用 CrewAI Knowledge 给 Agent 挂载私有文档、PDF、网页内容，告别幻觉，实现真正的企业内部问答"
---

## 为什么需要 Knowledge

LLM 只知道训练数据截止日前的公开内容——它不认识你公司的内部政策、产品手册、合同模板、历史决策文档。

CrewAI Knowledge 功能在 v0.70+ 引入，本质是**内置 RAG（Retrieval-Augmented Generation）**：你把文档喂给 Knowledge Source，它自动分块、向量化、存入本地向量数据库（默认 ChromaDB），Agent 执行任务时会自动检索相关段落注入上下文，不用再手动粘贴文档内容。

相比自己搭 LangChain RAG 链路：

| | CrewAI Knowledge | 自己搭 RAG |
|---|---|---|
| 配置量 | 3 行代码 | 20-50 行 |
| 多 Agent 共享 | 自动，Crew 级别挂载 | 需手动传 retriever |
| Agent 个人知识库 | Agent 级别单独挂载 | 需多套 retriever |
| 适合场景 | 快速原型 + 中小规模 | 大规模生产，需精细控制 |

---

## 四种 Knowledge Source

### 1. StringKnowledgeSource — 直接用字符串

最简单，适合把少量结构化信息喂给 Agent（产品规格、公司简介、配置参数）：

```python
from crewai.knowledge.source.string_knowledge_source import StringKnowledgeSource

# 产品规格书
product_spec = StringKnowledgeSource(
    content="""
    产品名称：JR AI 助手
    最大上下文：128K tokens
    支持语言：中文、英文、日文
    定价：免费版 100 条/天，Pro 版 ¥99/月
    部署方式：SaaS 云端，不支持私有化
    """,
    metadata={"source": "product_spec_v2", "version": "2.1"}
)
```

`metadata` 是可选的，加上后 Agent 可以知道引用的是哪个版本的文档——出了 Bug 排查时很有用。

### 2. PDFKnowledgeSource — 读取 PDF 文件

把 PDF 放进 `knowledge/` 目录（CrewAI 项目默认的知识库目录），然后：

```python
from crewai.knowledge.source.pdf_knowledge_source import PDFKnowledgeSource

# 支持同时挂多个 PDF
hr_policy = PDFKnowledgeSource(
    file_paths=[
        "hr_policy_2026.pdf",
        "employee_handbook.pdf"
    ],
    chunk_size=1000,    # 每段 ~1000 tokens（默认 4000，文档细碎时调小）
    chunk_overlap=200   # 段与段之间的重叠（防止信息被切断）
)
```

文件路径相对于 `knowledge/` 目录。如果你的项目结构不同，也可以传绝对路径。

### 3. TextFileKnowledgeSource — 读取纯文本文件

```python
from crewai.knowledge.source.text_file_knowledge_source import TextFileKnowledgeSource

docs = TextFileKnowledgeSource(
    file_paths=["changelog.txt", "api_reference.md"],
    chunk_size=800
)
```

Markdown、TXT、日志文件都支持。

### 4. 自定义 Knowledge Source

继承 `BaseKnowledgeSource`，实现 `load_content()` 方法，可以接入数据库、API、Confluence 等任意来源：

```python
from crewai.knowledge.source.base_knowledge_source import BaseKnowledgeSource
from typing import Dict, Any
import httpx

class ConfluenceKnowledgeSource(BaseKnowledgeSource):
    space_key: str
    
    def load_content(self) -> Dict[str, Any]:
        # 从 Confluence API 拉取页面内容
        resp = httpx.get(
            f"https://your-domain.atlassian.net/wiki/rest/api/content",
            params={"spaceKey": self.space_key, "type": "page"},
            auth=("user@example.com", "YOUR_API_TOKEN")
        )
        pages = resp.json()["results"]
        return {page["title"]: page["body"]["storage"]["value"] for page in pages}
    
    def add(self) -> None:
        content = self.load_content()
        for title, body in content.items():
            self._save_documents([body])
```

---

## 挂载方式：Crew 级别 vs Agent 级别

### Crew 级别（所有 Agent 共享）

```python
from crewai import Agent, Task, Crew, Process

policy_source = PDFKnowledgeSource(file_paths=["company_policy.pdf"])
product_source = StringKnowledgeSource(content="产品规格...")

hr_agent = Agent(
    role="HR Specialist",
    goal="回答员工的人事政策问题",
    backstory="你是公司 HR，熟悉所有规章制度",
    verbose=True
)

product_agent = Agent(
    role="Product Advisor",
    goal="回答客户的产品问题",
    backstory="你是产品专家，熟悉所有产品规格和定价",
    verbose=True
)

crew = Crew(
    agents=[hr_agent, product_agent],
    tasks=[...],
    knowledge_sources=[policy_source, product_source],  # 全员共享
    verbose=True
)
```

### Agent 级别（某个 Agent 专属知识库）

当不同 Agent 需要读不同的私密文档时（比如财务 Agent 才能访问报表），在 Agent 上单独挂：

```python
from crewai.knowledge.source.pdf_knowledge_source import PDFKnowledgeSource

# 只有 CFO Agent 能看到财务报表
financial_report = PDFKnowledgeSource(file_paths=["q1_financial_report.pdf"])

cfo_agent = Agent(
    role="CFO Analyst",
    goal="分析财务数据，发现风险点",
    backstory="你是 CFO 顾问，专职财务分析",
    knowledge_sources=[financial_report]  # Agent 专属
)

general_agent = Agent(
    role="General Analyst",
    goal="整理市场信息",
    backstory="你负责外部市场分析"
    # 没有挂财务知识库
)
```

---

## 完整示例：HR 政策问答 Crew

这是一个实际跑通过的场景——员工提问 → Agent 查阅政策文档 → 给出准确回答：

```python
from crewai import Agent, Task, Crew
from crewai.knowledge.source.pdf_knowledge_source import PDFKnowledgeSource
from crewai.knowledge.source.string_knowledge_source import StringKnowledgeSource

# 挂载知识库
policy_pdf = PDFKnowledgeSource(
    file_paths=["hr_policy_2026.pdf"],
    chunk_size=1000,
    chunk_overlap=150
)

faq_source = StringKnowledgeSource(
    content="""
    Q: 年假多少天？A: 入职 1 年以内 5 天，1-3 年 10 天，3 年以上 15 天。
    Q: 报销流程？A: 提交费用单 → 直属上司审批 → 财务部门 3 个工作日内到账。
    Q: 远程工作政策？A: 每周最多 3 天 WFH，需提前 1 天申请，试用期不适用。
    """,
    metadata={"source": "hr_faq_v3"}
)

# 配置 Agent
hr_specialist = Agent(
    role="HR Policy Specialist",
    goal="准确回答员工关于公司政策的问题，始终引用政策原文",
    backstory="""你是公司 HR 专员，对公司所有规章制度了如指掌。
    回答问题时必须引用具体政策条款，不能凭感觉猜测。""",
    verbose=True
)

# 配置 Task
answer_task = Task(
    description="员工问题：{question}\n\n请查阅公司政策文档，给出准确回答并引用相关政策条款。",
    expected_output="清晰的政策解答，包含：1) 直接回答 2) 相关政策原文引用 3) 如有例外情况请注明",
    agent=hr_specialist
)

# 组成 Crew
hr_crew = Crew(
    agents=[hr_specialist],
    tasks=[answer_task],
    knowledge_sources=[policy_pdf, faq_source],
    verbose=True
)

# 跑起来
result = hr_crew.kickoff(inputs={"question": "我入职刚好 3 年，年假还有几天可以用？"})
print(result.raw)
```

Agent 会自动在向量数据库里检索"年假"相关段落，把政策原文注入上下文后再回答——不是靠 LLM 凭记忆猜，是真的读了你的文档。

---

## 注意事项和踩坑

### 1. 向量化需要 Embedding API

默认使用 OpenAI `text-embedding-3-small`，需要设置 `OPENAI_API_KEY`。用其他模型：

```python
crew = Crew(
    agents=[...],
    tasks=[...],
    knowledge_sources=[...],
    embedder={
        "provider": "openai",
        "config": {"model": "text-embedding-3-small"}
    }
)
```

用本地 Ollama embedding（零费用）：

```python
embedder={
    "provider": "ollama",
    "config": {"model": "nomic-embed-text"}
}
```

### 2. 向量库缓存

第一次跑时会花时间向量化文档（大 PDF 可能要几分钟），之后会缓存在 `.crew_knowledge/` 目录里，再次跑秒启动。**文档更新后记得删缓存**重新向量化。

### 3. chunk_size 调优

文档类型不同，chunk 大小建议不同：

| 文档类型 | 推荐 chunk_size | 原因 |
|---------|----------------|------|
| 合同/法律文档 | 500-800 | 条款独立，小块检索精度更高 |
| 技术文档/API 文档 | 1000-1500 | 需要上下文连贯 |
| 长报告/白皮书 | 2000-4000 | 段落结构完整 |
