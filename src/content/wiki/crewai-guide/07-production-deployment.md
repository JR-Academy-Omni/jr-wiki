---
title: "生产部署：FastAPI 包装、异步调度与 Checkpoint 断点续跑"
wiki: "crewai-guide"
order: 7
description: "把 Crew 封装成 HTTP API、用 kickoff_async 非阻塞调度、CheckpointConfig 实现断点续跑，以及 planning 模式和成本控制实践"
---

## 从脚本到服务：三步走

CrewAI Crew 从本地脚本跑通到真正上线，需要解决三个问题：

1. **调度**：Crew 可能跑几分钟甚至几十分钟，HTTP 请求不能一直等
2. **可靠性**：中途崩了重跑 = 浪费几美元 API 费
3. **成本控制**：Agent 无限制跑，账单会让你哭

下面逐个击破。

---

## 异步调度：kickoff_async vs akickoff

CrewAI 提供两种非阻塞执行方式：

| 方法 | 本质 | 适用场景 |
|------|------|---------|
| `kickoff_async()` | 把同步 kickoff 包进线程池 | 简单场景，兼容老代码 |
| `akickoff()` | 原生 asyncio，全链路 async | FastAPI 等 async 框架，性能更好 |

### 用 `akickoff()` + FastAPI 封装成 API

```python
import asyncio
import uuid
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import JSONResponse
from crewai import Agent, Task, Crew

app = FastAPI()

# 简单的内存状态存储（生产环境换成 Redis）
job_status: dict[str, dict] = {}

async def run_crew_job(job_id: str, topic: str):
    """后台跑 Crew，更新 job_status"""
    job_status[job_id] = {"status": "running", "result": None, "error": None}
    try:
        researcher = Agent(
            role="Research Analyst",
            goal=f"深入分析 {topic} 的最新动态",
            backstory="你是资深技术分析师",
            llm="gpt-4o-mini"
        )
        task = Task(
            description=f"调研 {topic}，输出 500 字摘要，包含关键数据点",
            expected_output="结构化摘要，Markdown 格式",
            agent=researcher
        )
        crew = Crew(agents=[researcher], tasks=[task], verbose=False)
        result = await crew.akickoff(inputs={"topic": topic})
        job_status[job_id] = {"status": "done", "result": result.raw, "error": None}
    except Exception as e:
        job_status[job_id] = {"status": "failed", "result": None, "error": str(e)}

@app.post("/crew/start")
async def start_crew(topic: str, background_tasks: BackgroundTasks):
    """触发 Crew，立即返回 job_id"""
    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_crew_job, job_id, topic)
    return {"job_id": job_id, "status": "accepted"}

@app.get("/crew/status/{job_id}")
async def get_status(job_id: str):
    """轮询 Crew 执行状态"""
    if job_id not in job_status:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    return job_status[job_id]
```

调用流程：

```bash
# 1. 触发任务
curl -X POST "http://localhost:8000/crew/start?topic=CrewAI+2026+新特性"
# → {"job_id": "abc-123", "status": "accepted"}

# 2. 轮询直到 done
curl "http://localhost:8000/crew/status/abc-123"
# → {"status": "running", ...}
# → {"status": "done", "result": "## CrewAI 2026 新特性 ..."}
```

### 并行跑多个 Crew（kickoff_for_each_async）

如果你需要同时处理一批任务（比如同时调研 10 个竞品），`kickoff_for_each_async` 比逐个跑快得多：

```python
import asyncio

products = ["ChatGPT", "Gemini", "Claude", "Llama", "Mistral"]

# 串行：大约 5 × 60s = 5 分钟
# 并行：大约 60s（取决于 API 并发限制）
results = await crew.kickoff_for_each_async(
    inputs=[{"product": p} for p in products]
)

for product, result in zip(products, results):
    print(f"\n=== {product} ===")
    print(result.raw[:200])
```

注意：并行跑会瞬间吃掉大量 API 配额，上线前先在小规模测试，避免触发限流。

---

## planning 模式：让 Crew 先想再做

对于复杂的多步骤任务，`planning=True` 会在正式执行前加一个规划阶段——Planner Agent 分析所有任务，生成分步执行策略，然后把这个策略注入每个 Agent 的上下文。

效果是 Agent 知道整体方向，减少前后矛盾和重复工作：

```python
crew = Crew(
    agents=[researcher, analyst, writer],
    tasks=[research_task, analysis_task, writing_task],
    planning=True,           # 开启规划模式
    planning_llm="gpt-4o",   # 规划用强模型（用于生成整体策略）
    process=Process.sequential,
    verbose=True
)
```

`planning_llm` 和 Agent 用的 LLM 可以不同——通常规划用强模型（GPT-4o / Claude Opus），具体执行用便宜模型（GPT-4o-mini / Claude Haiku），这样成本可控又保证规划质量。

**适合开启 planning 的场景：**
- 任务超过 4 步且相互依赖
- 任务描述模糊、需要 Agent 自己拆解
- 上下文超长，Agent 容易忘记整体目标

**不适合的场景：**
- 简单的单 Agent 任务（白白多花一次 LLM 调用）
- 每次输入都不同、规划结果复用率低的场景

---

## Checkpoint：断点续跑，不怕崩溃

一个跑 20 分钟的 Crew，在第 18 分钟因为网络超时崩了——如果从头再来，既浪费时间又浪费钱。

CrewAI 1.9+ 的 `CheckpointConfig` 在每个 Task 完成后自动保存状态，崩了可以从上次的 Task 边界继续：

```python
from crewai import Crew, Process
from crewai.utilities.events.crewai_event_bus import CheckpointConfig
from crewai.utilities.storage.sqlite_storage import SqliteProvider

crew = Crew(
    agents=[researcher, analyst, writer],
    tasks=[research_task, analysis_task, writing_task],
    process=Process.sequential,
    checkpoint_config=CheckpointConfig(
        storage_provider=SqliteProvider(
            db_path="./.checkpoints.db"  # 存在项目目录下
        )
    ),
    verbose=True
)

# 第一次跑
result = crew.kickoff(inputs={"topic": "AI Agent 框架对比"})
```

如果第二个 Task（analysis_task）中途崩了，下次跑时 CrewAI 会自动检测到已有 research_task 的 checkpoint，直接从 analysis_task 开始。

**用 CLI 管理 Checkpoint：**

```bash
# 列出所有 checkpoint
crewai checkpoint list

# 查看某次运行的详情
crewai checkpoint inspect <checkpoint-id>

# 从指定 checkpoint 手动恢复
crewai checkpoint resume <checkpoint-id>

# 从指定 checkpoint fork 一个新运行（不覆盖原记录）
crewai checkpoint fork <checkpoint-id>
```

**什么时候用 JSON 文件存储，什么时候用 SQLite：**

| 存储方式 | 优势 | 适合场景 |
|---------|------|---------|
| JSON 文件（默认） | 可读、易备份 | 轻量脚本，checkpoint 数量少 |
| SQLite | 高频写入、事务安全 | 生产环境，长期跑、多任务并行 |

---

## 成本控制：防止 Agent 把账单跑飞

### 1. 限制单个 Agent 的最大重试次数

```python
researcher = Agent(
    role="Researcher",
    goal="...",
    backstory="...",
    max_iter=5,          # 最多尝试 5 次（默认 25，太高了）
    max_rpm=10           # 每分钟最多打 10 次 LLM API
)
```

`max_iter` 是最关键的成本控制参数。默认值 25 意味着一个 Agent 在一个 Task 上最多调用 LLM 25 次，对于用 GPT-4o 的话，一个复杂任务的成本可能超过 $1。改成 5-8 通常够用。

### 2. 任务级别限制 token 输出

```python
task = Task(
    description="...",
    expected_output="200 字摘要，不超过 300 字",  # 在 expected_output 里显式限制
    agent=researcher
)
```

### 3. 分级用模型：贵 + 便宜混合

```python
# 需要强推理的 Task 用强模型
research_agent = Agent(role="Researcher", llm="claude-opus-4-7", ...)

# 写作、格式化等简单 Task 用便宜模型
writer_agent = Agent(role="Writer", llm="gpt-4o-mini", ...)

# 本地 Ollama 做简单数据处理（零成本）
formatter_agent = Agent(role="Formatter", llm="ollama/llama3.1", ...)
```

### 4. 用 callbacks 监控 token 使用

```python
from crewai.utilities.events import crewai_event_bus, LLMCallStartedEvent, LLMCallCompletedEvent

total_tokens = {"count": 0}

@crewai_event_bus.on(LLMCallCompletedEvent)
def track_tokens(event):
    if hasattr(event, "response") and hasattr(event.response, "usage"):
        usage = event.response.usage
        total_tokens["count"] += usage.total_tokens
        if total_tokens["count"] > 100_000:
            print(f"⚠️ 警告：已消耗 {total_tokens['count']} tokens，注意成本！")

crew.kickoff(inputs={...})
print(f"总计消耗 token：{total_tokens['count']}")
```

---

## 生产部署 Checklist

跑到生产前过一遍：

- [ ] API Key 从环境变量读，不硬编码（`.env` + `python-dotenv`）
- [ ] `max_iter` 设置合理上限（5-10，不用默认 25）
- [ ] 长任务开启 `checkpoint_config`，用 SQLite 存储
- [ ] 复杂多步流程开启 `planning=True`，选用强模型做规划
- [ ] Crew 跑在 FastAPI BackgroundTasks 里，HTTP 接口异步返回
- [ ] 生产环境日志接入监控（Langfuse / AgentOps 都支持 CrewAI）
- [ ] 设置 `max_rpm` 防止触发 LLM 限流
- [ ] 并行 Crew 跑之前测试 API 配额上限

```python
# 生产环境完整配置示例
import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process
from crewai.utilities.storage.sqlite_storage import SqliteProvider
from crewai.utilities.events.crewai_event_bus import CheckpointConfig

load_dotenv()  # 从 .env 读取 OPENAI_API_KEY 等

crew = Crew(
    agents=[researcher, analyst, writer],
    tasks=[research_task, analysis_task, writing_task],
    process=Process.sequential,
    planning=True,
    planning_llm="gpt-4o",
    checkpoint_config=CheckpointConfig(
        storage_provider=SqliteProvider(db_path="./.checkpoints.db")
    ),
    verbose=os.getenv("DEBUG", "false").lower() == "true"  # 生产关 verbose
)
```
