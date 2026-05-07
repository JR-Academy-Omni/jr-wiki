---
title: "bolt.new + Supabase + Vercel 全栈部署实战"
wiki: "bolt-new-guide"
order: 6
description: "从 Supabase 建库到 Vercel 部署上线：bolt.new 全栈项目从零到生产的完整流程，覆盖注册、建表、连接、导出、部署和环境变量配置"
---

这一章把三个工具串起来，讲实际操作：在 bolt.new 里用 AI 搭好应用逻辑，数据存 Supabase，最后部署到 Vercel。每一步都有具体命令或截图，不会停在"然后你就部署好了"这种废话上。

![bolt.new + Supabase 全栈集成教程](https://img.youtube.com/vi/YkO3IvXdXak/maxresdefault.jpg)

## 三个工具分别负责什么

先把角色说清楚，不然配置环境变量的时候会一头雾水：

- **bolt.new**：AI 代码生成 + 浏览器内运行环境。你写 prompt，它生成 React/Vue 前端 + Node/Express 后端代码，你可以在浏览器里直接看到效果
- **Supabase**：托管的 PostgreSQL 数据库 + 认证服务 + 实时订阅。你不需要自己架数据库服务器，Supabase 给你一个 API key 就能查询
- **Vercel**：静态/服务端应用托管。连接 GitHub 仓库，每次 push 自动部署，免费计划够用

三者关系：bolt.new 生成代码 → 代码里用 Supabase SDK 读写数据 → 代码推到 GitHub → Vercel 从 GitHub 拉代码部署

---

## Step 1：Supabase 注册和建项目

打开 [supabase.com](https://supabase.com)，用 GitHub 登录最方便（后面 Vercel 也用 GitHub，统一账号省事）。

登录后点 **New Project**，填三个字段：

| 字段 | 怎么填 |
|------|--------|
| Organization | 默认是你的个人账号 |
| Project name | 随便，比如 `my-app-db` |
| Database Password | 自己生成一个强密码，**立刻存到密码管理器**，后面连接字符串要用 |
| Region | 选 Southeast Asia（Singapore）或 Australia，延迟低 |

点 **Create new project**，等 1-2 分钟初始化完成。

---

## Step 2：拿 API URL 和 anon key

项目初始化好之后，左侧导航 → **Project Settings** → **API**，找到两个东西：

1. **Project URL**：格式是 `https://xxxxxxxxxxxx.supabase.co`
2. **anon public key**：一长串 JWT

这两个值就是你的应用连接 Supabase 的凭证。`anon` key 可以放到前端代码里，它受到 Supabase 的 Row Level Security（RLS）保护。**千万不要把 `service_role` key 放前端**，那个有完全控制权。

同一页面往下滚还能看到连接字符串，格式：

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

这个字符串只在后端服务器环境里用（Vercel serverless function 里的环境变量），不往前端暴露。

---

## Step 3：建数据库表

以一个简单的任务管理应用为例，需要一张 `todos` 表。

在 Supabase 控制台，左侧 → **Table Editor** → **New Table**，或者直接用 **SQL Editor** 执行：

```sql
-- 建表
create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- 开启 RLS（Row Level Security），否则任何人都能查到所有数据
alter table todos enable row level security;

-- 每个用户只能看/改自己的 todo
create policy "Users can CRUD own todos" on todos
  for all using (auth.uid() = user_id);
```

在 SQL Editor 里粘贴上面的 SQL，点 **Run**，表就建好了。

> 注意：RLS 是 Supabase 的安全核心。没有 `create policy` 的话，即使你用 `anon` key，查询也会返回空结果（新版 Supabase 对没有 policy 的表默认拒绝所有访问）。

---

## Step 4：在 bolt.new 里接入 Supabase

打开 bolt.new，新建一个项目，或者继续你已有的项目。

**方法 A：bolt.new 官方 Supabase 集成（推荐）**

bolt.new 现在有内置的 Supabase 连接功能。在项目界面左侧找到 **Integrations**（或者 **Connect Supabase** 按钮），会引导你授权 Supabase 账号，然后选择刚才建的项目。连接成功后，bolt.new 会自动把 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 注入到项目的环境变量里。

**方法 B：手动在 prompt 里告诉 AI**

如果找不到集成入口，就在 prompt 里直接给 AI：

```
请帮我接入 Supabase。项目 URL 是 https://xxxxxxxxxxxx.supabase.co，
anon key 是 eyJhbGciOiJI...（你的 key）

用 @supabase/supabase-js 这个库，在 src/lib/supabase.ts 里初始化 client，
用 import.meta.env.VITE_SUPABASE_URL 和 import.meta.env.VITE_SUPABASE_ANON_KEY
这两个环境变量（不要把 key 硬编码进代码）。
```

AI 会生成类似这样的初始化文件：

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

然后在 bolt.new 的项目设置里找到 `.env` 文件，把这两个变量填进去：

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 5：验证数据库连接

告诉 AI 写一个最简单的测试：点按钮插一条 todo，然后查出来显示在页面上。

```
帮我在首页加一个简单的功能：
1. 一个输入框 + 添加按钮，点添加后往 todos 表里插入一条记录
2. 页面加载时从 todos 表查出所有记录显示成列表
3. 每条记录旁边有个复选框，勾选后更新 completed 字段

先不用做用户认证，user_id 先用 null（测试用）。
```

如果能在 bolt.new 的预览窗口里看到数据能读写，说明 Supabase 连接正常。

验证完之后在 Supabase 控制台 → **Table Editor** → `todos` 表，也能直接看到插入的数据。

---

## Step 6：导出代码到 GitHub

在 bolt.new 里，项目右上角找 **GitHub** 按钮（或者 **Export** / **Push to GitHub**），授权后选择：

- 推到新建仓库：bolt.new 帮你创建一个私有 repo
- 推到已有仓库：选你自己建的空仓库

推上去之后，你的代码就在 GitHub 上了。这一步是部署到 Vercel 的前提。

如果 bolt.new 没有直接 Push to GitHub 的功能（有些版本没有），用 **Download** 把代码下载到本地，然后手动 push：

```bash
# 在本地解压后的项目目录里
git init
git add .
git commit -m "initial commit from bolt.new"
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

---

## Step 7：在 Vercel 部署

打开 [vercel.com](https://vercel.com)，用 GitHub 登录。

点 **New Project** → 选刚才推上去的 GitHub 仓库 → **Import**。

Vercel 会自动检测到这是一个 Vite 项目，配置基本不用改：

| 字段 | 值 |
|------|-----|
| Framework Preset | Vite（自动检测） |
| Build Command | `npm run build` 或 `vite build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

**关键步骤：配置环境变量**

在 **Environment Variables** 区块，把 Supabase 的两个变量加上去：

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJ...` |

这里不填的话，部署出来的页面打开是空白或报错——构建时 `import.meta.env.VITE_*` 会是 `undefined`。

点 **Deploy**，等 1-2 分钟，Vercel 给你一个 `xxx.vercel.app` 的 URL，打开就是你的应用。

---

## Step 8：设置 Supabase 认证允许域

部署上线后，如果你的应用用了 Supabase Auth（邮箱登录、OAuth 等），还需要在 Supabase 控制台里把 Vercel 域名加到白名单。

Supabase 控制台 → **Authentication** → **URL Configuration**：

- **Site URL**：填你的 Vercel 域名，例如 `https://my-app.vercel.app`
- **Redirect URLs**：加上 `https://my-app.vercel.app/**`

不加的话，OAuth 回调会报 `redirect_uri_mismatch` 错误。

---

## 常见问题

**问：Vercel 部署成功但页面空白**

九成是环境变量没填，或者填了之后没重新部署。在 Vercel 控制台 → **Settings** → **Environment Variables** 确认变量存在，然后 **Redeploy**（触发一次重新构建）。

**问：本地能读写 Supabase，部署后 403 报错**

检查 RLS policy。如果你的 policy 里有 `auth.uid()` 判断，但测试时没有登录用户，查询就会被拒绝。要么先去掉认证要求，要么确保前端在查询前已完成登录。

也有可能是 `service_role` key 和 `anon` key 混用了——`service_role` key 绕过 RLS，本地测试能读，但把它放到前端代码里是安全问题。

**问：bolt.new 里改了代码，怎么同步到 Vercel**

如果用了 bolt.new → GitHub 集成，在 bolt.new 里点 **Push to GitHub**，Vercel 监听到 GitHub push 事件后会自动触发新一次部署（通常 1-2 分钟内完成）。

如果是手动 download 到本地再 push 的，就每次改完在本地 `git push`。

**问：Supabase 免费计划的限制是什么**

2026 年的免费计划：数据库 500MB、带宽 5GB/月、API 请求 50 万次/月、Auth 用户数无上限。小项目和 MVP 够用，流量上来了再升级 Pro（$25/月）。免费项目超过 1 周不活跃会被暂停（会收到邮件提醒），恢复只需要登录控制台点一下 **Restore**。

---

## 整个流程小结

从注册到上线，顺序是：

1. Supabase 建项目，拿 URL + anon key
2. 在 SQL Editor 里建表 + 开 RLS + 写 policy
3. bolt.new 里连接 Supabase（官方集成或手动写环境变量）
4. 在 bolt.new 预览里验证读写正常
5. Push 代码到 GitHub
6. Vercel 导入 GitHub 仓库，填环境变量，部署
7. Supabase Authentication → URL Configuration 加 Vercel 域名

整个流程没有服务器要维护，没有 Docker，没有 nginx 配置。Supabase 帮你管数据库，Vercel 帮你管服务器，你只需要关注业务逻辑。
