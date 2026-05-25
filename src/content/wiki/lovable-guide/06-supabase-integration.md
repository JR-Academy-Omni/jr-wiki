---
title: "Lovable + Supabase 完整集成：auth / database / storage / realtime"
wiki: "lovable-guide"
order: 6
description: "从零连接 Supabase，覆盖用户认证、RLS 安全策略、文件上传、实时订阅四大模块——每个模块都有可直接复用的代码和 SQL"
---

Lovable 自带前端生成，但真实产品离不开后端：用户账号、持久化数据、文件存储、多端同步。Supabase 是目前和 Lovable 配合最顺的后端选择——两者都走"告诉 AI 你想要什么"的思路，官方也做了原生连接器。

这一章把四个核心模块拆开讲，每个模块给出真实可用的代码和配置，不绕弯子。

![Supabase 与 Lovable 集成架构：前端 ↔ Supabase API ↔ PostgreSQL + Auth + Storage + Realtime](https://supabase.com/images/blog/lw12/og.png)

## 第一步：连接 Supabase 项目

### 在 Supabase 创建项目，拿到凭证

登录 [supabase.com](https://supabase.com)，创建一个新项目（Organization → New project）。创建完成后进入：

**Settings → API**

你需要两个值：
- **Project URL**：格式是 `https://xxxxxxxxxxxx.supabase.co`
- **anon key**：公开匿名密钥，以 `eyJ...` 开头，很长

> 只复制 `anon`（public）key，绝对不要把 `service_role` key 粘到 Lovable。`service_role` 可以绕过所有 RLS 权限检查，泄露等于数据库裸奔。

### 在 Lovable 项目里接入

打开你的 Lovable 项目，找到右上角设置图标 → **Settings → Connectors → Supabase**，粘贴 Project URL 和 anon key，点 Save。出现绿色 "Connected" 状态即为成功。

连接后，Lovable 的 AI 会读取你的 Supabase 表结构和 RLS 规则——之后你说"帮我加一个 todos 表，每个用户只能看自己的数据"，AI 会直接生成 SQL migration 和前端查询代码，不用你手动来回切换。

---

## 模块一：用户认证（Auth）

### 开启邮箱登录

Supabase 默认开启了邮箱/密码认证。开发期间建议先关掉邮件确认，不然每次测试都要去邮箱点链接：

**Supabase Dashboard → Authentication → Providers → Email → 关闭 "Confirm email"**

然后告诉 Lovable：

```
添加用户登录/注册功能：
- 邮箱 + 密码登录
- 注册后自动跳转 /dashboard
- 登录状态持久化（刷新页面不掉登录）
- 右上角加退出按钮
```

Lovable 会生成完整的认证逻辑，包括 `supabase.auth.signUp()`、`signInWithPassword()`、`signOut()` 和 session 监听。

### 加 OAuth 登录（Google / GitHub）

在 Supabase Dashboard 里先启用 OAuth Provider（Authentication → Providers → 选对应平台），填入该平台的 Client ID 和 Secret。

然后在 Lovable 里：

```
登录页加 "使用 Google 登录" 按钮，
调用 supabase.auth.signInWithOAuth({ provider: 'google' })，
回调地址配置到 /auth/callback 路由
```

### 读取当前用户

Supabase SDK 的 session 通过 `supabase.auth.getSession()` 获取，或者监听变化：

```typescript
// 在 React 应用顶层监听 auth 状态
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setUser(session?.user ?? null)
    }
  )
  return () => subscription.unsubscribe()
}, [])
```

---

## 模块二：数据库 + Row Level Security

### 建表和基本查询

Lovable 可以直接帮你生成 SQL migration。告诉它你想要的表结构，它会在 Supabase SQL Editor 里执行：

```sql
-- Lovable 生成的 todos 表示例
CREATE TABLE todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

前端查询同样由 Lovable 生成，但了解基本写法很有必要：

```typescript
// 查询当前用户的所有 todos（RLS 会自动过滤）
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .order('created_at', { ascending: false })

// 插入新 todo
const { error } = await supabase
  .from('todos')
  .insert({ title: '买咖啡', user_id: user.id })

// 更新
const { error } = await supabase
  .from('todos')
  .update({ completed: true })
  .eq('id', todoId)
```

### Row Level Security（RLS）是什么，为什么必须开

默认情况下，Supabase 数据库对所有请求都开放——只要有 anon key，任何人都能读写你的表。这在开发时方便，但上线前必须关掉这扇门。

RLS（Row Level Security）是 PostgreSQL 的原生特性，作用是给每张表加一道"行级过滤器"：每条 SQL 执行时，Postgres 都会检查当前用户是否满足 Policy 定义的条件，不满足的行直接不可见，不是返回空而是根本不存在。

开启方式：

```sql
-- 开启 RLS（必须）
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的 todos
CREATE POLICY "用户只能查看自己的 todos"
ON todos FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 允许用户插入自己的数据（WITH CHECK 确保 user_id 只能是自己）
CREATE POLICY "用户只能插入自己的 todos"
ON todos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 允许用户修改自己的 todos
CREATE POLICY "用户只能更新自己的 todos"
ON todos FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 允许用户删除自己的 todos
CREATE POLICY "用户只能删除自己的 todos"
ON todos FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

`auth.uid()` 是 Supabase 提供的函数，返回当前请求的用户 ID。未登录时返回 `NULL`，`NULL = user_id` 永远是 false，所以匿名请求拿不到任何数据。

### Policy 类型速查

| 操作 | USING | WITH CHECK |
|------|-------|------------|
| SELECT | ✅ 必须 | ❌ 不用 |
| INSERT | ❌ 不用 | ✅ 必须 |
| UPDATE | ✅ 建议 | ✅ 建议 |
| DELETE | ✅ 必须 | ❌ 不用 |

`USING` 是"过滤已有行的条件"，`WITH CHECK` 是"验证写入新数据的条件"。

### 常见 403 报错排查

连接 Supabase 后出现 `403 Forbidden` 或 `new row violates row-level security policy`，基本是这几个原因：

1. **表开了 RLS 但没有 Policy** → 开启 RLS 等于给表加了一把没有钥匙的锁，必须显式创建 Policy 才能让用户进来
2. **Policy 里的字段名写错** → 比如 `author_id` 写成了 `user_id`，检查列名
3. **前端没传 auth token** → 确保 Supabase client 初始化时设置了 `auth.persistSession: true`，以及请求时 session 还有效

在 Supabase SQL Editor 里快速诊断：

```sql
-- 查看某张表的所有 Policy
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'todos';
```

---

## 模块三：文件存储（Storage）

### 创建 Bucket

在 Supabase Dashboard → Storage → Create a new bucket。

两种类型：
- **Public bucket**：文件可直接通过 URL 访问，适合公开图片（产品图、封面图）
- **Private bucket**：需要生成签名 URL 才能访问，适合用户私有文件（合同、隐私照片）

头像上传一般用 public bucket（`avatars`），用户上传的文档用 private bucket。

### 上传文件

```typescript
// 上传用户头像
async function uploadAvatar(file: File, userId: string) {
  const fileExt = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${fileExt}`

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,          // 覆盖已有文件
      contentType: file.type
    })

  if (error) throw error

  // 获取公开 URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return publicUrl
}
```

### 私有文件的临时访问

Private bucket 里的文件需要生成限时签名 URL：

```typescript
// 生成 60 秒有效的临时访问链接
const { data, error } = await supabase.storage
  .from('private-docs')
  .createSignedUrl('contracts/agreement.pdf', 60)

if (data) {
  window.open(data.signedUrl)
}
```

### Storage 的 RLS

Storage 同样支持 RLS Policy，通过 SQL 配置。例如，只允许用户访问自己的文件夹：

```sql
-- 允许已登录用户上传到自己的文件夹
CREATE POLICY "用户可以上传到自己的文件夹"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允许公开读取 avatars bucket
CREATE POLICY "avatars 公开可读"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

告诉 Lovable "头像上传到 Supabase Storage 的 avatars bucket，文件路径用 userId/avatar.png，上传后更新 profiles 表的 avatar_url 字段"，它会生成完整的组件代码，包括文件选择、上传进度、错误处理。

---

## 模块四：实时订阅（Realtime）

Supabase Realtime 基于 WebSocket，监听数据库表的变更并实时推送到前端。典型场景：聊天室、协作文档、实时仪表盘、通知系统。

### 监听表变更

```typescript
// 监听 messages 表的新增消息
const channel = supabase
  .channel('messages-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    },
    (payload) => {
      console.log('新消息:', payload.new)
      setMessages(prev => [...prev, payload.new])
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('实时监听已就绪')
    }
  })

// 组件卸载时清理
return () => {
  supabase.removeChannel(channel)
}
```

支持三种事件类型：
- `INSERT` — 新增行
- `UPDATE` — 行被修改
- `DELETE` — 行被删除
- `*` — 以上三种全监听

也可以加过滤条件，只监听特定行的变更：

```typescript
// 只监听当前用户的通知
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'notifications',
  filter: `user_id=eq.${userId}`
}, callback)
```

### Realtime 的前置条件

1. **Supabase Dashboard → Replication → 开启对应表的 Realtime**（默认关闭）
2. 表必须开启 RLS，且有对应的 SELECT Policy——Realtime 推送也受 RLS 过滤

### 用 Lovable 接入 Realtime

```
在 messages 页面添加实时消息功能：
- 监听 messages 表的 INSERT 事件
- 有新消息时立即追加到列表底部，不刷新整页
- 组件卸载时取消订阅
```

Lovable 会生成对应的 `useEffect` 钩子和 channel 清理逻辑。

---

## 完整流程：从零搭一个 Todo 应用

把以上四个模块组合起来，按顺序跑通一个完整应用：

```
第1步：
  在 Supabase 创建 todos 表，开启 RLS，加四条 CRUD Policy

第2步：
  在 Lovable 连接 Supabase，告诉 AI 表结构

第3步：
  添加邮箱登录/注册页面，登录后跳转 /todos

第4步：
  /todos 页面：查询当前用户的 todos，支持新增/完成/删除

第5步：
  监听 todos 表 INSERT 事件，多个标签页同时打开时实时同步

第6步：
  加一个头像上传，传到 Supabase Storage avatars bucket
```

每一步都是一条 Lovable prompt，独立可验证，出了问题精准回滚。

---

## 上线前必查清单

| 检查项 | 说明 |
|--------|------|
| RLS 已开启 | 每张表都要 `ALTER TABLE xxx ENABLE ROW LEVEL SECURITY` |
| 所有表都有 Policy | 开了 RLS 但没有 Policy = 无法访问任何数据 |
| anon key 没有泄露为 service_role | 看 Lovable 项目里配置的 key 以 `eyJ...` 开头且比 service_role 短 |
| Storage bucket 权限配对 | public bucket 不要放敏感文件；private bucket 记得建 Policy |
| Realtime 只在需要时开 | 不需要实时更新的表不要开 Replication，减少资源消耗 |
| Email Confirm 重新开启 | 开发时关掉的 "Confirm email" 上线前要打开 |
