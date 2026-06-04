---
title: "n8n 核心体系：Trigger、Node、Expression 全解"
wiki: "n8n-guide"
order: 3
description: "n8n 的 trigger 分类（Webhook / Schedule / App poll）、节点体系（core / action / cluster / community）、数据结构（item/json/binary）、Expression 语法（$json / $input / $workflow / $vars / $now）——不讲案例讲原理"
---

第一章讲了 n8n 是什么，第二章直接上了五个实战案例。但很多人在改别人的 workflow 时会卡住：这个节点从哪里来数据？为什么 `$json.name` 能用，`$json.email` 却是 undefined？Schedule Trigger 的 cron 怎么写？

这章不讲案例，讲底层：n8n 的三个核心体系——**触发器（Trigger）体系**、**节点（Node）体系**和**表达式（Expression）体系**。搞清楚这三件事，所有 workflow 的逻辑都能读懂。

![n8n 工作流编辑器界面](https://raw.githubusercontent.com/n8n-io/n8n-docs/main/docs/_images/editor-ui/editor_ui.png)

---

## Trigger 体系：工作流的启动信号

n8n 里每个 workflow 都必须以一个 Trigger 节点开头——没有 Trigger，workflow 就只能手动点"Test workflow"运行，无法自动化。Trigger 决定了**什么时候、因为什么事情**工作流被唤醒。

n8n 的 Trigger 分三大类：

### 1. Webhook Trigger：来一个请求，跑一次

Webhook 节点本质上是 n8n 在监听一个 HTTP 端点。外部系统（Stripe、GitHub、你自己的业务后端）在事件发生时向这个 URL 发一个 HTTP 请求，n8n 立刻收到并启动 workflow。

支持的 HTTP 方法：GET / POST / PUT / PATCH / DELETE / HEAD。大多数场景用 POST 就够了。

Webhook Trigger 有一个特别有用的功能：配合 **Respond to Webhook** 节点，可以把 workflow 的最终输出直接作为 HTTP 响应返回给调用方——等于用 n8n 搭了一个轻量级 API 接口，不需要另外维护服务器代码。

```
POST https://{your-n8n}/webhook/{unique-path}
    ↓
Webhook Trigger（接收 payload，启动 workflow）
    ↓
... 若干处理节点 ...
    ↓
Respond to Webhook（返回 HTTP 响应给调用方）
```

**常见坑**：Webhook URL 分两个版本——Test URL 和 Production URL。Test URL 只在你点"Listen for test event"时短暂监听，走的是临时通道；Production URL 才是 workflow 激活后持续可用的地址。不少人把 Test URL 配进 Stripe 的 webhook 设置，结果生产环境根本收不到事件。

### 2. Schedule Trigger：定时驱动，类 Cron

Schedule Trigger 负责"每隔多久跑一次"。内置了六种人类可读的时间颗粒度：

| 选项 | 配置项 |
|------|--------|
| 每 N 秒 | 设置秒间隔 |
| 每 N 分钟 | 设置分钟间隔 |
| 每 N 小时 | 设置小时间隔 + 触发在几分钟时 |
| 每 N 天 | 设置天间隔 + 触发时间（小时:分钟） |
| 每 N 周 | 设置周间隔 + 星期几 + 触发时间 |
| 每 N 月 | 设置月间隔 + 日期 + 触发时间 |

GUI 选项覆盖不了的用 **Custom (Cron)**，格式是标准 5 字段 cron：

```
┌────────── minute (0-59)
│ ┌──────── hour (0-23)
│ │ ┌────── day of month (1-31)
│ │ │ ┌──── month (1-12)
│ │ │ │ ┌── day of week (0-7, 0 和 7 都是周日)
│ │ │ │ │
0 9 * * 1-5   # 工作日每天 09:00
30 8 * * 1    # 每周一 08:30
*/15 * * * *  # 每 15 分钟
0 0 1 * *     # 每月 1 日凌晨
```

**注意时区**：Schedule Trigger 使用的是 workflow 设置里配的时区，默认跟 n8n 实例的系统时区走。如果你的 n8n 部署在 UTC 机器上但业务在澳洲，一定要在 workflow 设置里把时区改成 `Australia/Sydney`，不然"每天早上 9 点"会在凌晨 1 点跑。

### 3. App/Service Trigger：轮询驱动

第三类是各种集成服务的 Trigger 节点，如 Gmail Trigger、Airtable Trigger、Google Sheets Trigger 等。它们本质上是**轮询**：n8n 按设定的频率去查"有没有新数据"，有就触发 workflow。

与 Webhook 的本质区别：Webhook 是**外部推送**（push），服务主动告知 n8n；App Trigger 是**主动拉取**（pull），n8n 定期去查。轮询有延迟（最低 1 分钟），Webhook 几乎实时。

如果你连接的服务支持 Webhook（比如 GitHub、Stripe），优先用 Webhook Trigger；轮询留给那些没有 Webhook 能力的服务（很多老系统或内部系统）。

---

## Node 体系：工作流的功能单元

n8n 里的节点不只是"处理数据的方块"，不同类型有不同的角色定位。

### 节点大分类

```
节点
├── Trigger 节点        # 启动 workflow，提供初始数据
├── Action/App 节点     # 连接外部服务（Gmail 发邮件、Notion 建页面……）
├── Core 节点           # 内置逻辑工具，不依赖外部服务
│   ├── 触发类         # Schedule Trigger、Webhook……
│   └── 逻辑类         # IF、Switch、Merge、Split In Batches……
└── Cluster 节点        # 由 Root 节点 + Sub-node 组合的节点组
    └── 典型：AI Agent  # Agent（root） + Memory + Tool + Embeddings
```

**Core 节点**是日常用得最多的工具箱：
- **IF / Switch**：按条件路由数据到不同分支
- **Merge**：把多条分支的数据合并成一个流
- **HTTP Request**：发任意 HTTP 请求，类似 curl
- **Code**：写 JavaScript（或 Python）直接处理数据
- **Set**：修改、添加、删除 item 里的字段
- **Split In Batches**：把大批量数据切成小块逐批处理
- **Wait**：暂停 workflow 等待一段时间或等外部回调

**Cluster 节点**（也叫 Sub-node 架构）是 n8n AI 功能的核心组织方式。AI Agent 节点本身是 Root，它下面挂载的 Memory、Tool、Embeddings、Retriever 等都是 Sub-nodes，彼此通过内部协议通信，不走普通的节点连线。

**Community 节点**是社区开发者发布的第三方节点，通过 npm 安装（自托管实例需要开启 `N8N_COMMUNITY_PACKAGES_ENABLED=true`）。

### 节点的运行模式

大多数 Action 节点默认对**每一个 item 单独运行一次**。如果 workflow 前一步产出了 100 个 item，下游节点会跑 100 次，每次处理一个 item。

你可以在节点设置里切换 **Execute Once**——只跑一次，用 `$input.first()` 或 `$input.all()` 手动控制数据范围。这在"发一封汇总邮件"这类场景必须打开，否则会发 100 封邮件。

---

## 数据结构：n8n 的 Item 模型

n8n 里所有在节点之间传递的数据都遵循同一个格式：**item 数组**。每个 item 是一个对象，至少有一个 `json` key：

```json
[
  {
    "json": {
      "name": "张三",
      "email": "zhangsan@example.com",
      "score": 92
    }
  },
  {
    "json": {
      "name": "李四",
      "email": "lisi@example.com",
      "score": 78
    }
  }
]
```

item 除了 `json`，还可以有：
- `binary`：文件数据（图片、PDF、CSV……），存在 workflow 的二进制层，不走 JSON
- `pairedItem`：追踪这个 item 来自上游哪个 item（数据溯源，Code 节点自定义逻辑时需要手动维护）
- `error`：当节点出错时附带的错误信息

理解 item 结构的关键点：**节点处理的粒度是单个 item，不是整个数组**。你在节点里写的配置会对数组里的每一个 item 执行一次——除非你手动切换成 Execute Once。

---

## Expression 体系：在参数里读取运行时数据

表达式是 n8n 里最重要的能力之一，也是最容易被用对、用错的地方。

### 基本语法

所有表达式放在 `{{ }}` 里，内部是 JavaScript 表达式（不是语句，不能写 `if`/`for`，但可以用三元表达式）：

```
{{ $json.name }}
{{ $json.price * 1.1 }}
{{ $json.tags.includes("urgent") ? "HIGH" : "NORMAL" }}
{{ new Date($json.createdAt).toISOString() }}
```

### 核心内置变量

**`$json`** — 最常用。当前被处理的 item 的 JSON 数据。等价于 `$input.item.json`。

```
{{ $json.email }}
{{ $json.address.city }}
{{ $json.items[0].price }}
```

**`$input`** — 精确控制读取哪个 item，在 Code 节点和需要跨 item 操作时特别有用：

```javascript
// 始终读第一个 item，不管当前在处理第几个
$input.first().json.header

// 读最后一个
$input.last().json.total

// 读全部（返回数组，可以 .map/.filter）
$input.all().map(item => item.json.name)
```

**`$node`** — 读取其他节点的输出。比如在第五步读第一步的结果：

```
{{ $node["HTTP Request"].json.statusCode }}
{{ $('Webhook').item.json.body.userId }}
```

注意：`$node["节点名"]` 和 `$('节点名')` 两种写法等价，推荐用 `$()` 更简洁。

**`$workflow`** — 当前 workflow 的元数据：

```
{{ $workflow.id }}    // workflow ID
{{ $workflow.name }}  // workflow 名称
{{ $workflow.active }} // 是否激活（布尔值）
```

**`$vars`** — workflow 级别的变量（在 Variables 面板里定义，所有节点共享）：

```
{{ $vars.slackChannel }}
{{ $vars.notionDatabaseId }}
```

和硬编码相比，用 `$vars` 的好处是一处改处处生效，不用翻遍所有节点。

**`$now`** / **`$today`** — 当前时间，使用 workflow 时区：

```
{{ $now.toISO() }}                    // 2026-06-05T09:30:00.000+10:00
{{ $today.toFormat("yyyy-MM-dd") }}   // 2026-06-05
{{ $now.minus({ days: 7 }).toISO() }} // 一周前
```

`$now` 返回的是 Luxon 的 DateTime 对象，支持 Luxon 全部 API（加减时间、格式化、时区转换等）。

**`$env`** — 读 n8n 实例的环境变量（自托管时在 `.env` 或 docker-compose 里配的 `N8N_*` 变量之外的自定义变量）：

```
{{ $env.OPENAI_API_KEY }}
{{ $env.MY_CUSTOM_VAR }}
```

生产环境注意：不要把密钥直接写进节点参数，用 Credentials 管理；`$env` 适合读非敏感的配置参数。

**`$runIndex`** / **`$itemIndex`** — 当前是第几次运行 / 处理第几个 item（从 0 开始）：

```
{{ $itemIndex + 1 }}  // 给 item 编序号（1-based）
{{ $runIndex }}       // 当前节点第几次执行（多次 retry 会增加）
```

### 常见 Expression 错误排查

**`undefined` 而不是报错**：n8n 里如果 `$json.someField` 不存在，默认返回 `undefined`（不是报错），但发给下游节点后可能导致字段缺失。可以用 `??` 提供默认值：

```
{{ $json.description ?? "无描述" }}
{{ $json.count ?? 0 }}
```

**类型问题**：所有从 Webhook 或 HTTP 节点进来的数字字段，如果原始格式是字符串，`$json.price * 1.1` 会自动尝试转换，但字符串拼接时要注意：

```
{{ Number($json.price) * 1.1 }}  // 显式转数字，更安全
```

**引用不同节点时节点名必须完全一致**（包括大小写和空格）：

```
{{ $('HTTP Request 1').item.json.data }}   // 正确
{{ $('http request 1').item.json.data }}   // 错误：大小写不对
```

---

## 三个体系的协作

把三个体系连起来看一个典型 workflow：

```
[Schedule Trigger: 每天 09:00 AEST]
         ↓
[HTTP Request: 拉取昨日订单 API]
  参数 URL: {{ $vars.apiBaseUrl }}/orders?date={{ $today.minus({days:1}).toFormat('yyyy-MM-dd') }}
         ↓
[IF: 是否有新订单？]
  条件: {{ $json.total }} > 0
  ├── True ↓
  │   [Slack: 发汇总通知]
  │   消息: "昨日新增 {{ $json.total }} 笔订单，金额 {{ $json.amount }} 元"
  └── False ↓
      [什么都不做]
```

这个 workflow 里：
- **Schedule Trigger** 负责定时启动
- **HTTP Request** 是 Action 节点，调外部 API
- **IF** 是 Core 节点，做条件判断
- **`$vars.apiBaseUrl`** 避免了把 URL 硬编码进节点
- **`$today.minus({days:1})`** 用 Luxon API 动态计算昨天的日期
- **`$json.total`** 读上游节点传过来的 item 数据

三个体系缺一不可。Trigger 决定什么时候跑，Node 决定做什么，Expression 决定怎么用数据。
