---
title: "生产上线：FastAPI 封装 + Docker 容器化 + 断点续跑"
wiki: "crewai-guide"
order: 7
description: "把 CrewAI Crew 包进 FastAPI、用 Docker Compose 一键部署、用 restore_from_state_id 实现断点续跑——从本地脚本到生产级服务的完整路径"
---

## 从脚本到服务

本地 `crew.kickoff()` 是同步阻塞的，跑完才返回。真实业务里你需要：

1. **HTTP 触发**：让后端系统、定时任务、前端按钮能调用 Crew
2. **异步执行**：Crew 跑 2 分钟，API 不能阻塞 2 分钟
3. **任务状态追踪**：用户需要知道"还在跑"还是"已完成"
4. **失败恢复**：网络抖动或 LLM 超时不应该让整个流程重来

这一章把这四件事都解决掉。

## 用 FastAPI 封装 Crew

项目结构：

```
my_crew/
├── crew.py           # Crew 定义
├── api.py            # FastAPI 应用
├── Dockerfile
└── docker-compose.yml
```

**crew.py**（复用第三章的竞品分析 Crew）：

```python
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool

def build_crew() -> Crew:
    search = SerperDevTool()

    scout = Agent(
        role="Market Scout",
        goal="找到 {product} 的所有竞品及最新动态",
        backstory="你专门追踪 SaaS 市场动态",
        tools=[search],
        max_iter=5
    )
    analyst = Agent(
        role="Competitive Analyst",
        goal="对比 {product} 和竞品的功能、定价",
        backstory="你擅长结构化分析",
        tools=[search],
        max_iter=5
    )

    scan_task = Task(
        description="搜索 {product} 主要竞品，每个收集官网、功能、定价",
        expected_output="竞品清单表格，至少 5 个竞品",
        agent=scout
    )
    compare_task = Task(
        description="对比 {product} 和每个竞品的优劣势",
        expected_output="详细对比矩阵",
        agent=analyst,
        context=[scan_task]
    )

    return Crew(
        agents=[scout, analyst],
        tasks=[scan_task, compare_task],
        process=Process.sequential
    )
```

**api.py**：

```python
import asyncio
import uuid
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

app = FastAPI()

# 内存 job 状态（生产换 Redis）
jobs: dict[str, dict] = {}

class KickoffRequest(BaseModel):
    product: str

@app.post("/kickoff")
async def kickoff(req: KickoffRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "running", "result": None}

    async def run():
        try:
            crew = build_crew()
            # kickoff_async() 不阻塞事件循环
            result = await crew.kickoff_async(inputs={"product": req.product})
            jobs[job_id] = {"status": "done", "result": result.raw}
        except Exception as e:
            jobs[job_id] = {"status": "error", "error": str(e)}

    background_tasks.add_task(run)
    return {"job_id": job_id}

@app.get("/status/{job_id}")
def status(job_id: str):
    return jobs.get(job_id, {"status": "not_found"})

@app.get("/health")
def health():
    return {"status": "ok"}
```

前端轮询 `/status/{job_id}` 直到 `status == "done"`，再拿 `result`。

## 同时跑多个 Crew：kickoff_for_each_async

如果你的场景是"给 10 个产品各跑一次竞品分析"，用 `kickoff_for_each_async`：

```python
from crewai import Crew

products = ["CrewAI", "LangGraph", "AutoGen", "Dify", "Coze"]
inputs_list = [{"product": p} for p in products]

crew = build_crew()
# 并发跑，自动管理事件循环
results = await crew.kickoff_for_each_async(inputs=inputs_list)

for product, result in zip(products, results):
    print(f"{product}: {result.raw[:200]}")
```

串行跑 5 个可能需要 10 分钟，并发只需要 2-3 分钟（取决于 LLM 限速）。

## 断点续跑：restore_from_state_id（CrewAI 1.14.5+）

Flow 跑到一半因为网络超时崩了？不用从头来。Flow 支持持久化 State，用 `restore_from_state_id` 从某个快照分叉：

```python
from crewai.flow.flow import Flow, listen, start, persist
from pydantic import BaseModel

class PipelineState(BaseModel):
    topic: str = ""
    research: str = ""
    article: str = ""

class ContentPipeline(Flow[PipelineState]):
    @start()
    @persist   # 每步执行后自动保存 state
    def pick_topic(self):
        self.state.topic = "CrewAI 2026 生产部署"

    @listen(pick_topic)
    @persist
    def do_research(self, topic):
        result = research_crew.kickoff(inputs={"topic": topic})
        self.state.research = result.raw

    @listen(do_research)
    @persist
    def write_article(self):
        result = writing_crew.kickoff(inputs={
            "topic": self.state.topic,
            "research": self.state.research
        })
        self.state.article = result.raw

pipeline = ContentPipeline()

# 正常跑，拿到 state_id
result = await pipeline.kickoff_async()
state_id = pipeline.state_id   # 保存下来

# 崩了？从某个已保存的快照恢复，分配新 state_id
recovery_pipeline = ContentPipeline()
result = await recovery_pipeline.kickoff_async(
    restore_from_state_id=state_id  # 从该快照加载 state 继续跑
)
```

`@persist` 装饰每个步骤，保证每步完成后 state 都写入 SQLite（默认）。`restore_from_state_id` 加载快照后用新 state_id 写后续结果，原始历史不丢。

> **注意**：`restore_from_state_id` 和 `from_checkpoint` 不能同时用，二选一。

## Docker 容器化

**Dockerfile**：

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml**（含 Redis 用于生产级 job 状态存储）：

```yaml
services:
  crew-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SERPER_API_KEY=${SERPER_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
```

```bash
# 启动
docker compose up -d

# 测试
curl -X POST http://localhost:8000/kickoff \
  -H "Content-Type: application/json" \
  -d '{"product": "CrewAI"}'

# 查状态
curl http://localhost:8000/status/{job_id}
```

## 成本控制：生产环境不能放任烧钱

一个 3-Agent Crew 单次约 $0.10–0.30，定时任务每天跑 100 次就是 $10–30/天。几个硬性规则：

```python
agent = Agent(
    role="...",
    goal="...",
    backstory="...",
    max_iter=5,          # 禁止无限循环
    max_rpm=10,          # 每分钟最多 10 次 LLM 调用（防突发）
)

crew = Crew(
    agents=[...],
    tasks=[...],
    max_rpm=30,          # Crew 级别限速
)
```

**模型路由策略**（成本降 60% 的实操）：

| 任务类型 | 推荐模型 | 原因 |
|---------|---------|------|
| 网页搜索 + 信息提取 | `gpt-4o-mini` / `claude-haiku-4-5-20251001` | 够用，比 GPT-4o 便宜 10x |
| 复杂推理 / 决策 | `claude-sonnet-4-6` / `gpt-4o` | 准确性更重要 |
| 最终输出生成 | `claude-sonnet-4-6` | 文字质量有要求 |
| 本地隐私数据 | `ollama/llama3.1` | 零 API 费用 |

## 部署后必做：开监控

生产 Crew 挂了你不知道，等于白部署。最省力的方式是接 **Langfuse**（开源，可自托管）：

```bash
pip install langfuse
```

```python
import os
os.environ["LANGFUSE_SECRET_KEY"] = "sk-..."
os.environ["LANGFUSE_PUBLIC_KEY"] = "pk-..."
os.environ["LANGFUSE_HOST"] = "https://cloud.langfuse.com"  # 或自托管地址

# Langfuse 自动 patch CrewAI，无需改任何代码
import langfuse
langfuse.configure()

# 正常 kickoff，所有 LLM 调用自动上报
result = crew.kickoff(inputs={"product": "CrewAI"})
```

Langfuse Dashboard 可以看到每次 Crew 运行的：token 消耗、延迟分布、每个 Agent 的调用链、失败率。发现某天成本突增，直接 drill down 到具体的 Agent 调用。
