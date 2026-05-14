---
title: "自定义工具进阶：BaseTool 类写法、结构化输入校验、缓存与异步"
wiki: "crewai-guide"
order: 6
description: "从 @tool 装饰器到 BaseTool 类：Pydantic 参数校验、运行时注入 API Key、结果缓存、async 工具、真实项目案例"
---

## 为什么要用 BaseTool 类而不是 @tool 装饰器

第三章介绍了用 `@tool` 装饰器快速定义工具，适合简单场景。但实际项目里你会遇到这些问题：

- 工具需要初始化时传入 API Key / 配置，而不是硬编码
- 输入参数有校验逻辑（比如 URL 格式、数值范围）
- 同一个 HTTP 接口不想每次都真的发请求——想缓存结果
- 工具本身是 IO 密集的，想用 `async` 提速

这些场景都需要 `BaseTool` 类写法。

## BaseTool 基本结构

```python
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Type

# 第一步：用 Pydantic 定义输入 Schema
class GithubIssueInput(BaseModel):
    repo: str = Field(description="仓库全名，格式 owner/repo，例如 crewAIInc/crewAI")
    state: str = Field(default="open", description="issue 状态：open / closed / all")
    limit: int = Field(default=10, ge=1, le=50, description="返回条数，1-50")

# 第二步：继承 BaseTool
class GithubIssuesTool(BaseTool):
    name: str = "Fetch GitHub Issues"
    description: str = "获取指定 GitHub 仓库的 issue 列表，用于了解用户反馈和已知问题"
    args_schema: Type[BaseModel] = GithubIssueInput

    # 运行时注入，不硬编码 Token
    github_token: str = ""

    def _run(self, repo: str, state: str = "open", limit: int = 10) -> str:
        import requests
        headers = {"Authorization": f"Bearer {self.github_token}"} if self.github_token else {}
        url = f"https://api.github.com/repos/{repo}/issues"
        params = {"state": state, "per_page": limit}

        resp = requests.get(url, headers=headers, params=params, timeout=10)
        if resp.status_code != 200:
            # 返回错误字符串，不 raise——让 Agent 自己决定如何处理
            return f"GitHub API 错误 {resp.status_code}: {resp.text[:200]}"

        issues = resp.json()
        if not issues:
            return f"{repo} 没有 {state} 状态的 issue"

        lines = [f"共找到 {len(issues)} 条 issue："]
        for i in issues:
            lines.append(f"- #{i['number']} {i['title']} | 👍{i.get('reactions',{}).get('+1',0)}")
        return "\n".join(lines)
```

关键点：
- `args_schema` 告诉框架如何解析和校验 Agent 传来的参数
- `ge=1, le=50` 让 Pydantic 自动拦截越界值，Agent 拿到的是校验过的输入
- 错误时 **返回字符串** 而不是抛异常，Agent 能看到错误信息并决定重试或换策略

## 运行时注入配置（不写死 API Key）

```python
import os

# 初始化时从环境变量读取
github_tool = GithubIssuesTool(github_token=os.environ["GITHUB_TOKEN"])

researcher = Agent(
    role="GitHub Analyst",
    goal="分析开源项目的用户反馈趋势",
    backstory="你专门研究开源社区动态",
    tools=[github_tool]  # 传已配置好的实例
)
```

这比 `@tool` 装饰器的全局变量干净得多——每个 Agent 可以用不同的 Token 或连接不同的账户。

## 结果缓存：同样的查询只打一次 API

对频繁调用但结果变化慢的工具（比如天气、汇率、配置查询），开启缓存能节省大量 token 和 API 费用：

```python
class ExchangeRateTool(BaseTool):
    name: str = "Get Exchange Rate"
    description: str = "查询实时汇率，支持 AUD/USD/CNY/SGD"
    cache_function: callable = lambda _args, _result: True  # 永远缓存

    def _run(self, from_currency: str, to_currency: str) -> str:
        import requests
        resp = requests.get(
            f"https://api.exchangerate.host/convert",
            params={"from": from_currency, "to": to_currency, "amount": 1},
            timeout=5
        )
        data = resp.json()
        rate = data.get("result", "N/A")
        return f"1 {from_currency} = {rate} {to_currency}"
```

`cache_function` 接收 `(args_dict, result)` 两个参数，返回 `True` 表示缓存这次结果。同一组参数第二次调用直接走缓存，不发 HTTP 请求。

更细粒度的控制——比如成功才缓存、失败不缓存：

```python
cache_function: callable = lambda _args, result: not result.startswith("错误")
```

## Async 工具：IO 密集任务的正确姿势

当你的 Crew 用 `kickoff_async()` 跑多个并发任务时，同步工具会阻塞事件循环。定义 `_arun` 来解决：

```python
import aiohttp

class AsyncWebScraperTool(BaseTool):
    name: str = "Async Web Scraper"
    description: str = "异步抓取网页内容，适合批量抓取"

    def _run(self, url: str) -> str:
        # 同步版本作为 fallback
        import requests
        resp = requests.get(url, timeout=10)
        return resp.text[:3000]

    async def _arun(self, url: str) -> str:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                text = await resp.text()
                return text[:3000]
```

框架检测到 `_arun` 时，异步执行时自动走 async 路径，sync 时走 `_run`。

## 实战案例：Notion 数据库读写工具

这是一个完整的生产级工具，实际项目里用来让 Agent 直接操作 Notion 知识库：

```python
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Type, Optional
import requests, os

class NotionQueryInput(BaseModel):
    database_id: str = Field(description="Notion 数据库 ID，32 位字母数字")
    filter_status: Optional[str] = Field(None, description="按 Status 属性筛选，如 In Progress")
    limit: int = Field(default=20, ge=1, le=100)

class NotionDatabaseTool(BaseTool):
    name: str = "Query Notion Database"
    description: str = "查询 Notion 数据库中的条目，支持按状态筛选，用于任务管理和知识检索"
    args_schema: Type[BaseModel] = NotionQueryInput
    notion_token: str = ""

    def _run(
        self,
        database_id: str,
        filter_status: Optional[str] = None,
        limit: int = 20
    ) -> str:
        headers = {
            "Authorization": f"Bearer {self.notion_token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        }
        body = {"page_size": limit}
        if filter_status:
            body["filter"] = {
                "property": "Status",
                "status": {"equals": filter_status}
            }

        resp = requests.post(
            f"https://api.notion.com/v1/databases/{database_id}/query",
            headers=headers,
            json=body,
            timeout=10
        )
        if resp.status_code != 200:
            return f"Notion API 错误: {resp.status_code} — {resp.json().get('message', '')}"

        results = resp.json().get("results", [])
        if not results:
            return "数据库为空或没有匹配条目"

        items = []
        for page in results:
            props = page.get("properties", {})
            title_prop = next(
                (v for v in props.values() if v.get("type") == "title"),
                None
            )
            title = ""
            if title_prop and title_prop.get("title"):
                title = title_prop["title"][0].get("plain_text", "")
            items.append(f"- {title} (ID: {page['id'][:8]}...)")

        return f"找到 {len(results)} 条记录：\n" + "\n".join(items)

# 使用方法
notion_tool = NotionDatabaseTool(notion_token=os.environ["NOTION_TOKEN"])
```

![CrewAI 自定义工具架构](https://img.youtube.com/vi/rcmMK-zkxrQ/maxresdefault.jpg)

## 测试自定义工具

工具单独测试比放进 Crew 里调试快得多：

```python
# tests/test_github_tool.py
import pytest
from unittest.mock import patch, MagicMock
from tools.github_tool import GithubIssuesTool

def test_fetch_issues_success():
    tool = GithubIssuesTool(github_token="test-token")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [
        {"number": 1, "title": "Bug: agent loops forever", "reactions": {"+1": 5}},
        {"number": 2, "title": "Feature: add async support", "reactions": {"+1": 12}},
    ]

    with patch("requests.get", return_value=mock_response):
        result = tool._run(repo="crewAIInc/crewAI", state="open", limit=10)

    assert "共找到 2 条 issue" in result
    assert "#1" in result

def test_fetch_issues_api_error():
    tool = GithubIssuesTool(github_token="bad-token")

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Unauthorized"

    with patch("requests.get", return_value=mock_response):
        result = tool._run(repo="crewAIInc/crewAI")

    # 错误要返回字符串，不能 raise
    assert "GitHub API 错误 401" in result
```

工具测试好了，Agent 就能安全使用。不要等 Crew 跑到一半才发现工具有 bug——那时 debug 成本是现在的 10 倍。

## 小结：选哪种写法

| 场景 | 推荐写法 |
|------|---------|
| 简单、无状态、几行逻辑 | `@tool` 装饰器 |
| 需要初始化参数（API Key、配置） | `BaseTool` 类 |
| 输入需要校验（格式、范围） | `BaseTool` + `args_schema` |
| IO 密集、想用 async | `BaseTool` + `_arun` |
| 结果变化慢、想省 API 费 | `BaseTool` + `cache_function` |
