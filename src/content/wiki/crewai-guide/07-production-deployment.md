---
title: "生产部署实战：FastAPI 包装、Docker 容器化、APScheduler 定时调度"
wiki: "crewai-guide"
order: 7
description: "把 CrewAI Crew 变成生产服务：FastAPI HTTP 接口、Docker 打包、APScheduler 定时运行、回调监控、故障恢复"
---

## 从脚本到服务：为什么需要 API 包装

`crew.kickoff()` 在命令行跑没问题，但生产环境里你需要：

- 从 Web 界面 / Slack Bot / n8n 触发 Crew
- 实时查看进度，而不是等终端输出
- 定时自动运行（每天早上生成日报）
- 跑失败了自动重试，有告警

这章一步步搭出这套系统。

## Step 1：FastAPI 包装

```python
# main.py
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from crewai import Crew, Agent, Task, Process
import uuid, time
from typing import Dict

app = FastAPI(title="CrewAI Service")

# 简单内存存储运行状态（生产用 Redis）
jobs: Dict[str, dict] = {}

class RunRequest(BaseModel):
    topic: str
    output_lang: str = "zh"

class JobStatus(BaseModel):
    job_id: str
    status: str        # pending / running / done / failed
    result: str = ""
    error: str = ""
    duration_seconds: float = 0

def build_crew(topic: str, output_lang: str) -> Crew:
    researcher = Agent(
        role="Research Specialist",
        goal=f"深入调研 {topic}，找到最新、最权威的信息",
        backstory="你是顶级科技记者，专门追踪最新技术动态",
        llm="claude-sonnet-4-6",
        max_iter=5
    )
    writer = Agent(
        role="Technical Writer",
        goal=f"用 {output_lang} 撰写清晰易懂的技术报告",
        backstory="你擅长把复杂技术翻译成人人能读懂的文字",
        llm="gpt-4o-mini"
    )
    research_task = Task(
        description=f"调研 {topic} 的最新动态、核心优势、主要挑战",
        expected_output="结构化调研报告，至少 10 个关键点",
        agent=researcher
    )
    write_task = Task(
        description="基于调研报告写一篇 800 字技术分析",
        expected_output="Markdown 格式文章，有小标题、代码示例、结论",
        agent=writer,
        context=[research_task]
    )
    return Crew(
        agents=[researcher, writer],
        tasks=[research_task, write_task],
        process=Process.sequential,
        verbose=False
    )

def run_crew_job(job_id: str, topic: str, output_lang: str):
    jobs[job_id]["status"] = "running"
    start = time.time()
    try:
        crew = build_crew(topic, output_lang)
        result = crew.kickoff(inputs={"topic": topic})
        jobs[job_id].update({
            "status": "done",
            "result": result.raw,
            "duration_seconds": round(time.time() - start, 1)
        })
    except Exception as e:
        jobs[job_id].update({
            "status": "failed",
            "error": str(e),
            "duration_seconds": round(time.time() - start, 1)
        })

@app.post("/run", response_model=JobStatus)
async def start_run(req: RunRequest, background: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "pending", "result": "", "error": "", "duration_seconds": 0}
    background.add_task(run_crew_job, job_id, req.topic, req.output_lang)
    return JobStatus(job_id=job_id, status="pending")

@app.get("/status/{job_id}", response_model=JobStatus)
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatus(job_id=job_id, **jobs[job_id])

@app.get("/health")
async def health():
    return {"ok": True}
```

启动：

```bash
pip install fastapi uvicorn
uvicorn main:app --host 0.0.0.0 --port 8080
```

触发一次运行：

```bash
# 提交任务
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d '{"topic": "CrewAI vs LangGraph 2026"}'
# → {"job_id": "a3f9c1b2", "status": "pending"}

# 轮询状态
curl http://localhost:8080/status/a3f9c1b2
# → {"job_id": "a3f9c1b2", "status": "done", "result": "...", "duration_seconds": 47.3}
```

## Step 2：Docker 容器化

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 依赖层单独缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

```text
# requirements.txt
crewai[tools]>=0.80.0
fastapi>=0.115.0
uvicorn>=0.32.0
aiohttp>=3.10.0
python-dotenv>=1.0.0
```

用 docker-compose 同时跑 API 服务 + Redis（存 long-term memory）：

```yaml
# docker-compose.yml
services:
  crewai-api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SERPER_API_KEY=${SERPER_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f crewai-api
```

![CrewAI Docker 部署架构](https://img.youtube.com/vi/UV81LAb_x1A/maxresdefault.jpg)

## Step 3：APScheduler 定时调度

不需要 Celery 也能做定时任务——APScheduler 嵌进 FastAPI 进程里就够了：

```python
# scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging, os, httpx
from datetime import datetime
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

AEST = ZoneInfo("Australia/Sydney")

async def daily_report_job():
    """每天 AEST 09:00 自动生成 AI 日报"""
    today = datetime.now(AEST).strftime("%Y-%m-%d")
    logger.info(f"[Scheduler] 开始生成 {today} AI 日报")

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            "http://localhost:8080/run",
            json={"topic": f"AI 行业 {today} 最新动态", "output_lang": "zh"}
        )
        job_id = resp.json()["job_id"]
        logger.info(f"[Scheduler] 任务已提交 job_id={job_id}")

def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=AEST)

    # 每天 AEST 09:00 生成日报
    scheduler.add_job(
        daily_report_job,
        CronTrigger(hour=9, minute=0, timezone=AEST),
        id="daily_ai_report",
        replace_existing=True,
        misfire_grace_time=300  # 错过后 5 分钟内还能补跑
    )
    return scheduler
```

在 FastAPI 启动时挂载 scheduler：

```python
# main.py 添加
from contextlib import asynccontextmanager
from scheduler import create_scheduler

scheduler = create_scheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="CrewAI Service", lifespan=lifespan)
```

查看已注册的定时任务：

```bash
curl http://localhost:8080/health
# 可以在这里扩展，返回 scheduler.get_jobs() 的状态
```

## Step 4：回调监控

CrewAI 提供 step callback，每个 Agent 动作执行后触发：

```python
import json
from datetime import datetime

def on_step(step_output):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": getattr(step_output, 'agent', 'unknown'),
        "tool": getattr(step_output, 'tool', None),
        "tokens": getattr(step_output, 'token_usage', {}),
    }
    # 发到 Slack / 写日志文件 / 推 Prometheus
    print(f"[STEP] {json.dumps(log_entry, ensure_ascii=False)}")

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    step_callback=on_step,   # 每步执行后回调
    verbose=False
)
```

发 Slack 告警（任务失败时）：

```python
import httpx, os

async def send_slack_alert(message: str):
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        return
    async with httpx.AsyncClient() as client:
        await client.post(webhook, json={"text": f"🚨 CrewAI Alert: {message}"})

# 在 run_crew_job 的 except 块里调用
except Exception as e:
    jobs[job_id]["status"] = "failed"
    import asyncio
    asyncio.create_task(send_slack_alert(f"Job {job_id} 失败: {str(e)[:200]}"))
```

## 常见生产踩坑

**坑1：任务超时没有兜底**

Agent 陷入循环可能跑几十分钟。给每个 Crew 加超时：

```python
import asyncio

async def run_with_timeout(crew, inputs, timeout=180):
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(crew.kickoff, inputs=inputs),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        return "任务超时（>3分钟），请检查 Agent 配置或缩小任务范围"
```

**坑2：环境变量在 Docker 里丢失**

不要在代码里 `os.getenv("KEY")` 然后在 Dockerfile 里 `ENV KEY=value`——这样 key 会进镜像层被泄露。正确做法是用 `.env` 文件配合 docker compose 的 `env_file`：

```yaml
services:
  crewai-api:
    env_file:
      - .env   # 不进 git，只在服务器上放
```

**坑3：定时任务时区错误**

调度器在 UTC 时区的服务器上跑，直接写 `hour=9` 其实是 UTC 09:00，对应 AEST 19:00 或 20:00。永远显式指定时区：

```python
CronTrigger(hour=9, minute=0, timezone="Australia/Sydney")
```

## 生产部署检查清单

```
□ FastAPI /health 接口返回 200
□ Docker HEALTHCHECK 配置
□ 所有 API Key 通过环境变量注入，不进代码
□ Agent 设置了 max_iter，防止无限循环
□ 定时任务时区明确写 Australia/Sydney
□ 失败有 Slack / 邮件告警
□ 日志有 job_id 便于追踪
□ docker compose restart: unless-stopped 保证重启恢复
```
