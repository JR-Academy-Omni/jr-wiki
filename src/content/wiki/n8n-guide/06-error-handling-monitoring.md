---
title: "n8n 错误处理与生产监控：工作流永不静默失败"
wiki: "n8n-guide"
order: 6
description: "Error Workflow 标准配置、节点级错误控制、重试与指数退避、Slack 告警模板、集中式监控——让你的生产工作流在出错时发声而不是消失"
---

生产环境里工作流失败是必然的——API 会超时、Webhook 会送错 payload、AI 偶尔会返回无法解析的格式。问题不在于"失败发生了"，而在于**你是发现了它，还是它悄悄消失了**。

n8n 默认行为：工作流失败 → 执行状态标红 → 没有任何通知。如果没人每天盯着执行历史看，你可能三天后才知道自动日报已经停了。

这章把正确的错误处理姿势从头到尾说清楚。

---

## 核心工具：Error Workflow + Error Trigger

n8n 的错误处理分两层：

1. **节点级**：单个节点失败时怎么办（继续 / 停止 / 重试）
2. **工作流级**：整个工作流失败时触发另一个专门的 Error Workflow 发告警

大多数人只配了节点级，漏掉了工作流级——这是最容易静默失败的根源。

---

## 第一步：建立集中式 Error Workflow

**创建一个专门处理错误通知的工作流**（不要把错误处理塞到每个业务工作流里）：

```
Error Trigger
    ↓
Code（格式化错误信息）
    ↓
Slack（发告警 + 直接跳转链接）
    ↓
Google Sheets（记录错误日志，留历史记录）
```

### Error Trigger 节点

新建工作流，第一个节点选 **"Error Trigger"**。这个节点不需要任何配置——它在关联的工作流失败时自动触发，并把错误信息注入 `$json`。

**Error Trigger 提供的数据结构**：

```javascript
// $json 的内容
{
  "execution": {
    "id": "1234",                          // 直接跳到失败执行的 ID
    "url": "https://你的n8n/workflow/5/executions/1234",
    "retryOf": null,
    "error": {
      "message": "Request failed with status 429",
      "stack": "Error: Request failed..."
    },
    "lastNodeExecuted": "HTTP Request"    // 哪个节点挂了
  },
  "workflow": {
    "id": "5",
    "name": "每日 AI 日报"
  }
}
```

### Code 节点：格式化告警内容

```javascript
const executionId = $json.execution.id;
const workflowName = $json.workflow.name;
const errorMessage = $json.execution.error.message;
const lastNode = $json.execution.lastNodeExecuted;
const executionUrl = $json.execution.url;

const now = new Date().toLocaleString('zh-CN', { timeZone: 'Australia/Sydney' });

return [{
  json: {
    title: `🔴 工作流失败：${workflowName}`,
    body: [
      `*时间*：${now}`,
      `*工作流*：${workflowName}`,
      `*失败节点*：${lastNode}`,
      `*错误信息*：${errorMessage}`,
      `*执行 ID*：${executionId}`,
      `*查看详情*：${executionUrl}`
    ].join('\n'),
    executionUrl
  }
}];
```

### Slack 节点

```
Resource: Message
Operation: Post
Channel: #n8n-alerts
Text: {{ $json.body }}
Unfurl Links: false
```

收到的 Slack 消息带直达链接，点击就跳到失败执行的详情页，不用翻执行历史找。

---

## 第二步：给每个生产工作流挂上 Error Workflow

建好集中 Error Workflow 后，需要在每个生产工作流里指定它：

1. 打开需要监控的工作流
2. 点右上角的 **⚙️ Settings（工作流设置）**
3. 找到 **Error Workflow** 下拉框
4. 选择你刚建的集中 Error Workflow
5. 保存

**这一步最容易被忘掉**。建议养成习惯：每个新工作流上线前，把 Error Workflow 挂上是发布检查清单的最后一条。

---

## 第三步：节点级错误控制

每个节点右键 → **Settings**，可以配置该节点失败时的行为：

### Continue on Error

```
用途：非关键步骤失败也不影响后续节点
典型场景：
  - 发通知（通知发失败，主流程不应中断）
  - 数据记录（写日志失败，不影响核心业务）
  - 可选的数据富化（API 调用返回空，继续用默认值）
```

### Retry on Fail

```
Max Tries: 3（重试次数）
Wait Between Tries: 5000（毫秒，推荐至少 3000）

用途：网络抖动、API 限频等临时故障
典型场景：
  - HTTP Request 调外部 API
  - AI 模型调用（偶发超时）
  - Webhook 发送（网络不稳定）
```

**注意**：Retry on Fail 的等待是固定间隔，不是指数退避。对于严格限频的 API，固定间隔可能一直在触发限额，见下面的手动实现。

---

## 进阶：指数退避重试

当 API 返回 429（Too Many Requests）时，固定间隔重试会持续触发限额。正确做法是指数退避：第 1 次等 2s，第 2 次等 4s，第 3 次等 8s……

用 Code 节点手动实现：

```javascript
// 放在 HTTP Request 节点后，捕获 429 并等待重试
const response = $("HTTP Request").item.json;

// 如果成功，直接透传
if (!$("HTTP Request").item.error) {
  return $input.item;
}

const attempt = $json.__attempt || 1;
const maxAttempts = 4;

if (attempt > maxAttempts) {
  throw new Error(`API 调用失败，已重试 ${maxAttempts} 次：${$json.error}`);
}

// 指数退避等待
const waitMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s
await new Promise(resolve => setTimeout(resolve, waitMs));

return [{
  json: {
    ...$json,
    __attempt: attempt + 1
  }
}];
```

配合 n8n 的 "Loop Over Items" 节点，可以把这段逻辑做成真正的重试循环。

---

## 常见错误模式与处理策略

| 错误类型 | 典型表现 | 推荐处理 |
|---------|---------|---------|
| 网络超时 | `ECONNRESET` / `socket hang up` | Retry on Fail（3 次，间隔 5s） |
| API 限频 | `429 Too Many Requests` | 指数退避重试 + 减少并发 |
| 认证失效 | `401 Unauthorized` | 停止工作流 + 立即告警（手动续期凭证） |
| 数据格式错误 | `JSON.parse failed` | Continue + 记录原始 payload 到 Sheets 方便排查 |
| AI 返回格式错误 | 解析 JSON 失败 | 重试 1 次 + 告警（AI 偶发格式问题） |
| 下游服务 500 | `Internal Server Error` | 等 30s 重试，3 次后告警 |

---

## 集中式错误日志

告警容易漏（Slack 消息太多被划走）。在 Error Workflow 里同时写一份持久日志：

**Google Sheets 节点**（接在 Slack 节点后）：

```
Operation: Append or Update Row
Spreadsheet: n8n 错误日志（运营同学可直接查看）
Sheet: Sheet1
Columns:
  timestamp:    {{ new Date().toISOString() }}
  workflow:     {{ $("Code").item.json.title }}
  error:        {{ $json.execution.error.message }}
  last_node:    {{ $json.execution.lastNodeExecuted }}
  execution_id: {{ $json.execution.id }}
  execution_url: {{ $json.execution.url }}
```

这样就有了可以按时间过滤的错误历史。发现某个工作流一周报错了 20 次，说明该接口需要专项排查，而不是每次人肉重跑。

---

## 生产监控建议

### 执行历史清理策略

执行日志会持续增长占磁盘，但删太激进又不方便排查：

```env
# .env 里设置
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=336    # 14天（小时数 = 14*24）
EXECUTIONS_DATA_PRUNE_MAX_COUNT=10000  # 每个工作流最多保留1万条
```

失败的执行记录会被单独标记，可以在 Settings 里单独设置保留时间更长。

### 关键工作流的"心跳"监控

对于定时工作流（每天发日报、每周更新数据），光有错误告警不够——如果工作流直接没触发，就不会有错误，你也不会知道。

**心跳模式**：在工作流最后加一个 HTTP Request，每次成功执行时 ping 一个外部监控服务（如 healthchecks.io 免费版）：

```
最后一个业务节点
    ↓
HTTP Request（心跳）
  Method: GET
  URL: https://hc-ping.com/你的检查ID
```

healthchecks.io 如果超过预定时间（如 26 小时）没收到 ping，就会发邮件告警。即使 n8n 整个挂了，心跳超时也能发现。

### 慢工作流告警

在工作流开始节点记录时间戳，结束时比较：

```javascript
// 开始节点（Code）
return [{ json: { startTime: Date.now() } }];

// 结束节点（Code）
const duration = Date.now() - $("Start").item.json.startTime;
const durationMin = (duration / 60000).toFixed(1);

if (duration > 5 * 60 * 1000) {  // 超过5分钟告警
  // 触发 Slack 告警节点
  return [{ json: { slow: true, durationMin, threshold: 5 } }];
}
return [{ json: { slow: false, durationMin } }];
```

---

## 检查清单：工作流上线前必过

```
□ 设置了 Error Workflow（Workflow Settings → Error Workflow）
□ 关键 HTTP 节点开了 Retry on Fail（3次，5000ms间隔）
□ 不可逆操作（发邮件/改数据）加了 Human Approval 或 Continue on Error 配合日志
□ 生产 URL / Credential 都已切换（不是用的测试 key）
□ 执行历史清理已配置（防磁盘撑满）
□ 如果是定时工作流：心跳监控已配置
```

漏掉任何一条，在生产环境出问题只是时间问题。
