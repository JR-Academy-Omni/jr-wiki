---
title: "测试与调试：用 crewai test 量化 Crew 表现"
wiki: "crewai-guide"
order: 6
description: "crewai test CLI 评分机制、crew.train() 人工反馈训练、断点回放调试、DeepEval 集成——让多 Agent 系统从「能跑」变成「靠谱」"
---

## 为什么多 Agent 比单模型更难测

调试单个 LLM 调用，你只需要看输入输出。调试一个 Crew，你面对的是：

- 哪个 Agent 输出了错误信息？
- Task 描述不清还是 Agent backstory 有问题？
- 是这次 LLM 返回异常，还是每次都差？

CrewAI 提供了一套完整的测试工具链来回答这些问题。

## crewai test：一条命令得到量化评分

`crewai test` 是最快的质量基线工具。它会将你的 Crew 运行 N 次，然后用一个评审 LLM 给每个任务打分（1-10）。

```bash
# 跑 3 次，用 gpt-4o-mini 作为评审（便宜，够用）
crewai test -n 3 -m gpt-4o-mini
```

输出示例：

```
Task                  | Run 1 | Run 2 | Run 3 | Avg
─────────────────────────────────────────────────
search_task           |   7.5 |   8.0 |   7.0 | 7.5
compare_task          |   6.0 |   7.5 |   6.5 | 6.7
advise_task           |   8.5 |   9.0 | 🔴 Err | 7.8*
─────────────────────────────────────────────────
Crew Overall Score    |  7.3  |  8.2  |  6.8  | 7.4
Total Execution Time  |  142s | 128s  | 99s   |
```

重点看两个信号：
1. **方差大的任务**（Run 1 和 Run 3 差 2 分以上）→ 该任务描述不够稳健，Agent 理解不一致
2. **持续低分任务**（平均 < 6）→ 说明 expected_output 定义不清，或者 Agent backstory 不匹配

你也可以在代码里调用 `crew.test()`：

```python
from crewai import Crew, Process

crew = Crew(
    agents=[scout, analyst, strategist],
    tasks=[scan_task, compare_task, advise_task],
    process=Process.sequential
)

# n_iterations=3, openai_model_name 用便宜的
crew.test(n_iterations=3, openai_model_name="gpt-4o-mini")
```

## crewai train：用人工反馈训练 Agent

发现某个 Agent 输出总是方向跑偏？用 `crewai train` 收集人工评分，把这些评分作为示例喂给 Agent：

```bash
crewai train -n 5 -m gpt-4o-mini
```

运行期间，每次执行后系统会提示你对 Agent 输出评分（1-10）并提供文字反馈。训练结果保存在本地的 `trained_agents_data.pkl`，下次 `crew.kickoff()` 时自动加载。

```python
# 启动时自动应用训练数据（默认行为）
crew.kickoff(inputs={"product": "CrewAI"})

# 禁用训练数据（想用原始表现对比时）
crew.kickoff(inputs={"product": "CrewAI"}, reset_memory_before_execution=True)
```

> **何时该 train？** 至少跑 `test` 发现某个任务平均分 < 7，才值得开始训练。直接 train 而不先测基线，无法判断有没有提升。

## verbose 模式：按行追踪 Agent 思考链

生产前必过的关：开 `verbose=True` 看完整的 ReAct 循环。

```python
crew = Crew(
    agents=[scout, analyst, strategist],
    tasks=[scan_task, compare_task, advise_task],
    verbose=True          # 打印每个 Agent 的思考 + 行动 + 观察
)
```

输出每个步骤长这样：

```
[Scout] Thought: I need to search for competitors of CrewAI...
[Scout] Action: Search("CrewAI competitors 2026")
[Scout] Observation: Found LangGraph, AutoGen, Dify...
[Scout] Final Answer: Here are the top 5 competitors...
```

看到 Agent 陷入循环（同一个 Action 出现 3 次以上），立即检查：
- 工具是否真的返回了有用内容？
- `expected_output` 是否让 Agent 知道什么时候该停？

## crewai replay：回放失败的任务

长跑 Crew（10 个任务以上）跑到第 8 步挂了？不需要从头来：

```bash
# 列出上次运行的所有任务 ID
crewai log-tasks-outputs

# 从第 8 个任务（task_id 是 7，从 0 开始）重新跑
crewai replay -t 7
```

`replay` 会复用之前任务的输出作为上下文，只重跑你指定的任务及其后续。这在调试耗时 / 耗钱的 Crew 时省大量成本。

## DeepEval：自动化评估 + CI 集成

`crewai test` 是手动触发，要进 CI 流水线就需要 DeepEval：

```bash
pip install deepeval crewai
```

```python
from deepeval.integrations.crewai import DeepEvalCrewObserver
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric

# 注册观察器——一行代码，不改任何 Crew 逻辑
DeepEvalCrewObserver()

# 定义评估指标
metrics = [
    AnswerRelevancyMetric(threshold=0.7),
    FaithfulnessMetric(threshold=0.8)
]

# 正常 kickoff，DeepEval 自动捕获所有 span
result = crew.kickoff(inputs={"product": "CrewAI"})

# 查看评估报告
# deepeval test run 或登录 confident-ai.com 看可视化
```

CI 里加这一步，每次 PR 合并前自动验证 Crew 表现没有退步。

## 调试速查表

| 症状 | 先检查 | 解决方向 |
|------|--------|---------|
| Agent 输出与预期方向完全不同 | `backstory` 和 `goal` 是否清晰 | 重写 Agent 定义，加具体约束 |
| 每次结果差异很大 | `expected_output` 是否太模糊 | 在 expected_output 里加格式要求 |
| 工具调用失败 | 工具 API key / 网络是否正常 | 先单独测试工具，加 `max_retry_limit=3` |
| 任务 N+1 没有用到任务 N 的结果 | `context=[task_n]` 有没有加 | 显式声明任务依赖 |
| Crew 跑了 30 分钟没结果 | `max_iter` 是否太高 | 设 `max_iter=5`，用 replay 调试 |
