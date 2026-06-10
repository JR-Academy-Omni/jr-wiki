---
title: "n8n FAQ 与故障排查：常见报错、性能瓶颈与 Make 对比"
wiki: "n8n-guide"
order: 8
description: "n8n 最常见的十类报错及解法、大流量 workflow 的性能瓶颈定位与优化、n8n 与 Make.com 的定价和能力横向对比——少踩坑，选对工具"
---

入门阶段写几个 workflow 跑起来没问题，一旦进入生产、数据量上来、或者团队开始协作，就会撞上一堆让人头疼的报错和性能问题。这章专门回答那些"在文档里找不到、但跑真实项目必踩"的坑。

---

## 第一部分：常见报错速查

### 1. HTTP Request 节点 400 Bad Request

**症状**：节点红色报错，消息体里有 `"status": 400` 或 `"message": "Bad Request"`。

**根本原因**：发出去的请求不符合 API 服务器的格式要求。最常见的三种情况：

1. **Query parameter 格式错**：数组参数要写成 `ids[]=1&ids[]=2`，不能直接把 JSON 数组 `[1,2]` 放到 query string。
2. **Body 的 Content-Type 不对**：API 期望 `application/x-www-form-urlencoded`，但你发了 `application/json`（或反过来）。
3. **必填字段漏了**：用 "Specify Body" → JSON 时，少了 API 文档里标 required 的字段。

**排查步骤**：

```
1. 在 Execute 节点前加一个 Set 节点，把要发送的数据 console.log 出来看格式
2. 把相同参数粘到 Postman / curl 手动测一遍
3. 看 API 文档，对照必填字段、数据类型、嵌套层级
```

---

### 2. HTTP Request 节点 429 Too Many Requests

**症状**：执行到某个 HTTP Request 节点就失败，错误信息含 `429` 或 `rate limit`。

API 有调用速率限制，n8n 默认对每条记录都跑一次节点，数据量大时很容易触发。

**解法**：在 HTTP Request 节点之前插一个 **Wait** 节点（设 200–500ms），或者把数据先用 **Split In Batches** 切成小批，每批之间加 Wait。另一个更稳的做法是在 HTTP Request 节点开启 "Retry on Fail"，设 3 次重试 + 指数退避。

```json
// HTTP Request 节点 → Settings 标签页
"retryOnFail": true,
"maxTries": 3,
"waitBetweenTries": 1000
```

---

### 3. Code 节点 "All items must be an array of objects"

**症状**：Code 节点执行后报 `ERROR: All items must be an array of objects`。

n8n 的数据模型要求每个节点的输出必须是**对象数组**，每个对象包含一个 `json` 字段。直接 `return { name: "test" }` 是错的。

```javascript
// ❌ 错误写法
return { name: "test" };

// ✅ 正确写法
return [{ json: { name: "test" } }];

// ✅ 处理多条输入数据时
return $input.all().map(item => ({
  json: {
    ...item.json,
    processed: true
  }
}));
```

---

### 4. Code 节点 "import is not defined" / "require is not defined"

**症状**：Code 节点里写了 `import axios from 'axios'` 或 `const axios = require('axios')` 然后报错。

n8n 的 JavaScript 沙箱**不支持 `import`/`export`** 语法（ES Module），但支持 `require`——条件是这个包已经安装在 n8n 运行环境里。

```javascript
// ❌ 不支持
import axios from 'axios';

// ✅ 如果包已安装（自托管可装）
const axios = require('axios');

// ✅ 大多数情况：用内置的 $http 或 HTTP Request 节点代替
// 不需要额外依赖
```

如果需要用到特定 npm 包，自托管版可以通过环境变量 `NODE_FUNCTION_ALLOW_EXTERNAL=axios,lodash` 解锁，云版本目前不支持自定义包。

---

### 5. Webhook 没收到请求（Workflow 跑不起来）

这个报错不一定有明显的错误消息，表现是第三方平台显示发送成功，但 n8n 执行历史里什么都没有。

**排查清单**：

| 检查项 | 解法 |
|--------|------|
| Workflow 是 Active 状态吗？ | 打开右上角激活开关，Test URL 只在手动测试时有效 |
| 用的是 Production URL 还是 Test URL？ | 生产环境必须用 Production URL（两者不同） |
| n8n 实例能被外部访问吗？ | 本地开发用 ngrok；生产用域名 + 正确端口转发 |
| Cloudflare 或反向代理阻断了吗？ | 检查 Cloudflare WAF 规则，关闭对 webhook 路径的 Bot Protection |
| Signing secret 对上了吗？ | 第三方平台的 secret 和 n8n webhook 节点的 secret 必须一致 |

---

### 6. OAuth2 Token "Invalid credentials" / 401

**症状**：workflow 运行了一段时间突然开始 401 报错，之前好好的。

OAuth2 access token 会过期（通常 1 小时），n8n 会自动用 refresh token 续期——但 refresh token 本身也有过期时间（Google 是 7 天未用就失效，Slack 是 90 天）。

**解法**：

```
1. 进 Credentials 页面，找到对应的 OAuth 凭证
2. 点 "Reconnect" 重新走一遍授权流程
3. 如果是 Google Workspace，确认 n8n 的 OAuth App 在 Google Cloud Console 里是 "Published" 状态而不是 "Testing"（Testing 状态的 refresh token 只有 7 天）
```

---

### 7. Expression 报错 "Cannot read properties of undefined"

**症状**：节点里写了 `{{ $json.user.email }}` 类型的表达式，某些数据跑到这里就炸。

原因是上游某条记录里 `user` 字段不存在（null 或 undefined），直接取 `.email` 就报错了。

```javascript
// ❌ 脆弱写法
{{ $json.user.email }}

// ✅ 安全写法：Optional chaining
{{ $json.user?.email }}

// ✅ 带默认值
{{ $json.user?.email ?? 'no-email@example.com' }}

// ✅ 在 Code 节点里批量处理时
return $input.all().map(item => ({
  json: {
    email: item.json?.user?.email ?? null
  }
}));
```

---

### 8. "Execution was stopped because it exceeded the timeout"

**症状**：长时间运行的 workflow（比如批量处理、调用慢 API）突然中断，报 timeout。

云版 n8n 默认执行超时是 **60 分钟**（Enterprise 可调）；自托管版可通过环境变量 `EXECUTIONS_TIMEOUT` 修改（单位毫秒，默认 3600000）。

如果是数据量导致的慢，参考下一部分的性能优化。如果是 API 调用慢，先确认 API 本身的响应时间，考虑异步处理模式（触发 API job → 轮询状态）。

---

## 第二部分：性能瓶颈定位与优化

### 瓶颈一：大数据集打爆内存

n8n 默认把一个 workflow 执行的**所有数据加载进内存**。当你要处理几千条、几万条数据时，内存会撑满，要么执行极慢，要么直接 OOM 崩溃。

**标准解法：SplitInBatches**

```
HTTP Request（拉全量）→ Split In Batches（每批 100 条）→ 处理逻辑 → Merge
```

`Split In Batches` 节点会把大数组切成小批循环处理，每批结束后释放内存。批次大小根据单条数据体积调：API 返回的简单 JSON 可以 200 条一批，附带大文本或 embedding 的可以降到 10–20 条。

### 瓶颈二：顺序串行 API 调用

100 条数据，每条都独立调一次 API，n8n 默认**串行**执行——第 1 条完了才发第 2 条请求，100 次 × 500ms = 50 秒。

**解法**：在 HTTP Request 节点里开启 **"Execute Once for All Items"** 或配合批量 API 端点（如 Notion 的 `batch-write`、HubSpot 的 `batch/create`）。如果 API 只支持单条，可以用 Code 节点包一个 `Promise.allSettled` 并发发请求：

```javascript
const items = $input.all();
const results = await Promise.allSettled(
  items.map(item =>
    $http.request({
      method: 'POST',
      url: 'https://api.example.com/items',
      body: item.json
    })
  )
);
return results.map((r, i) => ({
  json: { 
    input: items[i].json,
    success: r.status === 'fulfilled',
    result: r.value ?? r.reason
  }
}));
```

注意：并发要控制，通常不超过 API 的并发限制，否则又触发 429。

### 瓶颈三：Schedule 触发器频率太高

每分钟触发一次的 workflow 在没有任务时也会完整执行一遍，耗 execution 配额（云版）也占资源（自托管）。

**优化思路**：
1. 在 workflow 最开头加一个 **IF 节点**，检查"今天真的有需要处理的数据吗"，没有直接走 No 分支 Stop
2. 考虑改用 Webhook 触发（事件驱动），而不是定时轮询
3. 自托管高并发场景，开启 **Queue Mode**（Redis 作为队列），把执行和编排分开

```bash
# 自托管开启 Queue Mode 的环境变量
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=localhost
QUEUE_BULL_REDIS_PORT=6379
```

Queue Mode 下，main 进程只负责接收触发、调度任务，worker 进程负责实际执行节点——可以横向扩多个 worker，互不干扰。

### 快速诊断工具

自托管版本可以开 debug 日志定位慢节点：

```bash
# .env 里加
N8N_LOG_LEVEL=debug
```

每个节点的执行时间会打进日志。找到最慢的那个节点，重点优化它——通常 80% 的执行时间集中在 20% 的节点上（往往是慢 API 调用）。

---

## 第三部分：n8n vs Make 选型对比

### 定价模型：执行次数 vs 操作次数

这是两个工具最根本的差异，直接决定你在什么规模下的成本。

**Make 的操作计费**：每个模块（节点）运行一次算一个 operation。一个 10 节点的 workflow 跑一次 = 10 operations。数据量大时，一条记录触发的循环每跑一圈也算 operations。

**n8n 的执行计费**：不管 workflow 有多少节点，跑一次算一次 execution。20 节点的 workflow 和 2 节点的 workflow 消耗的配额一样。

| | n8n Cloud（2026） | Make.com（2026） |
|---|---|---|
| 入门价格 | Starter €24/月（2,500 次执行） | Core $9/月（1,000 次操作） |
| 中级价格 | Pro €60/月（10,000 次执行） | Pro $16/月（10,000 次操作） |
| 团队价格 | Business €800/月（40,000 次执行 + SSO） | Teams $29/月（20,000 次操作） |
| 自托管 | 免费（Community Edition，无限执行） | 不支持 |
| 失败执行计费 | 不计入配额 | 计入 operations |
| 用户数量 | 所有计划无限用户 | 按计划限制 |

**实际成本换算**：假设你有个 15 节点的 workflow，每天跑 100 次。Make 每天消耗 1,500 operations（15×100），月度 45,000 operations，需要 Teams 以上计划（$29/月）。n8n 每天消耗 100 executions，月度 3,000 executions，Starter 计划（€24/月）够用。**节点多时 n8n 更便宜。**

### 核心能力差异

| 维度 | n8n | Make |
|------|-----|------|
| 集成数量 | 400+ | 1,500+ |
| 自定义代码 | 支持（JavaScript / Python） | 极其有限 |
| AI Agent 支持 | 深度原生（LangChain / Claude / 向量库） | 基础支持 |
| 可视化 | 中等（canvas 布局） | 优（更直观的流程图风格） |
| 自托管 | 支持（社区版免费） | 不支持 |
| 调试体验 | 执行历史完整，可逐节点检查数据 | 较弱 |
| 学习曲线 | 中高（有代码门槛） | 低（完全无代码） |
| 版本控制 | Git 集成（Business+） | 无 |

### 怎么选

**选 n8n 的场景**：

- 工作流逻辑复杂，有分支、循环、条件判断
- 需要用 JavaScript/Python 写自定义处理逻辑
- 要跑 AI Agent、集成向量数据库、接 LLM
- 有数据合规要求（必须自托管，数据不出内网）
- 团队有开发能力，想用 Git 管理 workflow 版本

**选 Make 的场景**：

- 主要用途是连接 SaaS 工具，触发 → 同步 → 通知这类简单流程
- 团队成员无开发背景，需要完全可视化操作
- 需要接的第三方服务在 n8n 里没有原生节点（Make 的集成更全）
- 流程简单、每月 execution 数少，对成本敏感

一句话定位：**Make 是运营工具，n8n 是工程师工具。** 如果你在帮开发团队做自动化或者要构建 AI 应用，n8n 的上限高很多；如果是市场/销售团队的简单任务自动化，Make 的上手体验更好。

---

## 最后：遇到 bug 最高效的调试路径

无论什么报错，先走这条路径，80% 的问题可以自己解决：

```
1. 进 Executions 页面 → 找到失败的那次执行
2. 点进去，找到红色失败的节点
3. 看该节点的 Input 数据（上游传来的是什么）
4. 看 Error 信息（n8n 通常会显示 API 原始错误）
5. 打开该节点的 API 文档（节点 → Info → 文档链接）
6. 对照文档里 required 字段和数据格式
```

如果社区里找不到答案，n8n 的 [Community Forum](https://community.n8n.io/) 活跃度很高，搜报错信息大概率能找到同款问题。自托管用户遇到的问题尤其多人踩过，帖子质量比 Stack Overflow 高。
