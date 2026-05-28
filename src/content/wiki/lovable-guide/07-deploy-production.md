---
title: "从 Lovable 到生产：自定义域名、SEO meta 和 Google Analytics"
wiki: "lovable-guide"
order: 7
description: "把 Lovable 应用从 yourapp.lovable.app 推上自己的域名，配好 SEO 元数据和 GA4 埋点——每一步都有可直接操作的指令和代码"
---

Lovable 默认给每个项目分配一个 `yourapp.lovable.app` 子域名，发开发原型够用，但上线产品不行——用户不信任 `lovable.app` 结尾的域名，SEO 权重也归不到你自己。这一章把三件事拆开讲：把域名换成你的、让搜索引擎读到正确的元数据、接 GA4 追踪用户行为。

---

## 1. 先发布，再接域名

自定义域名必须在项目发布后才能生效。

打开 Lovable 项目，右上角 → **Share** 按钮 → **Publish**。首次发布会生成 `yourapp.lovable.app` 的公开访问地址，后续每次发布只更新内容，域名不变。

> **Plan 限制**：自定义域名是付费功能，Free 计划只有 `lovable.app` 子域名。Starter 及以上方可绑定自己的域名。

---

## 2. 绑定自定义域名

### 2.1 在 Lovable 添加域名

项目页面 → **Settings** → **Domains** → **Add custom domain**，输入你的域名（如 `app.yourdomain.com` 或根域名 `yourdomain.com`），确认后 Lovable 会展示两条 DNS 记录：

| 类型 | 名称 | 值 |
|------|------|----|
| A | `@` 或指定主机名 | Lovable 提供的 IP 地址 |
| TXT | 验证用子域名 | Lovable 提供的验证字符串 |

具体的 IP 和验证字符串会在你的 Lovable dashboard 里实时显示，每个项目不同，以 dashboard 为准。

### 2.2 在域名注册商添加 DNS 记录

登录你的域名注册商（Cloudflare / Namecheap / GoDaddy / 阿里云解析等），找到对应域名的 DNS 管理，照着 Lovable dashboard 给出的值添加：

**A 记录（根域名）**

```
Type:  A
Name:  @
Value: <Lovable 提供的 IP>
TTL:   Auto 或 3600
```

**子域名（如 app.yourdomain.com）**

```
Type:  CNAME
Name:  app
Value: <Lovable 给出的 CNAME 目标>
TTL:   Auto
```

**TXT 验证记录**

```
Type:  TXT
Name:  <Lovable 指定的主机名>
Value: <Lovable 提供的验证字符串>
TTL:   Auto
```

> **Cloudflare 用户注意**：A 记录的 Proxy 状态（橙色云）会干扰 Lovable 的 SSL 证书签发，先设为 **DNS only**（灰色云），等证书签发完再按需开启。

### 2.3 等待 DNS 传播和 SSL 颁发

保存 DNS 记录后回到 Lovable dashboard，域名状态会显示验证进度。SSL 证书由 Let's Encrypt 自动签发，全程不需要手动操作。

- 通常：几分钟到 1 小时
- 最长：DNS TTL 较长时可能 72 小时

可以用 [dnschecker.org](https://dnschecker.org) 查全球 DNS 传播情况，看 A 记录是否已经指向 Lovable 的 IP。

### 2.4 验证生效

浏览器访问你的域名，看到项目内容 + 地址栏显示 🔒 HTTPS，则绑定成功。

---

## 3. SEO 元数据配置

### 3.1 Lovable 的内置 SEO 工具

2026 年 5 月 13 日，Lovable 发布了 **Discoverability** 功能，集成了 SEO 审查、SSR/预渲染、Semrush 对接。对新项目来说：

- **2026-05-13 之后创建的项目**：默认使用 TanStack Start + SSR，每次请求返回完整 HTML，对搜索引擎和社交预览 bot 完全可见。
- **此前的 React + Vite 项目**：对 Google、Bing、社交预览 bot（Twitter、Facebook）、AI 引擎（ChatGPT、Perplexity）等验证过的爬虫启用按需预渲染。

两种情况下，SEO 元数据的配置方式一致。

### 3.2 基础元数据：标题、描述、Favicon

项目页面 → **Settings** → **SEO** （或 **Share** 面板 → **SEO**）：

| 字段 | 对应 HTML | 作用 |
|------|-----------|------|
| Page title | `<title>` | 浏览器标签 + Google 搜索结果标题 |
| Meta description | `<meta name="description">` | 搜索结果摘要（建议 120-160 字符）|
| Favicon | `<link rel="icon">` | 浏览器标签图标，默认是 Lovable Logo |
| Share image / OG image | `<meta property="og:image">` | 社交分享时的预览图 |

修改后立即保存，Lovable 自动更新 `index.html` 里的对应 `<meta>` 标签。如果用 Lovable 的 AI 聊天改，直接说：

```
把 meta description 改成"…你的描述…"，并把 OG image 换成 https://…/og.png
```

Lovable 会定位到 `index.html` 或 `vite.config.ts` 的对应位置修改。

### 3.3 Open Graph 完整写法（手动编辑 index.html）

如果需要精确控制，打开 Lovable 的 **Dev Mode**，找到项目根目录下的 `index.html`，在 `<head>` 里加入：

```html
<!-- 基础 SEO -->
<title>你的应用名 | 品牌名</title>
<meta name="description" content="120 字以内，说清楚这个应用是干什么的" />

<!-- Open Graph（Facebook、LinkedIn、微信） -->
<meta property="og:type" content="website" />
<meta property="og:title" content="你的应用名 | 品牌名" />
<meta property="og:description" content="120 字以内的描述" />
<meta property="og:image" content="https://yourdomain.com/og-image.png" />
<meta property="og:url" content="https://yourdomain.com" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="你的应用名 | 品牌名" />
<meta name="twitter:description" content="120 字以内的描述" />
<meta name="twitter:image" content="https://yourdomain.com/og-image.png" />
```

**OG image 规格建议**：1200×630px，PNG 或 JPG，文件大小 < 1MB。可以用 Figma / Canva 做，导出后放到 Lovable 项目的 `public/` 目录下（Dev Mode 里拖进去），URL 就是 `https://yourdomain.com/og-image.png`。

### 3.4 接入 Google Search Console

让 Google 知道你的域名存在，加速首次索引：

1. 打开 [search.google.com/search-console](https://search.google.com/search-console)，添加 **Domain property**（填裸域名，不加 `https://`）
2. Google 会要求在 DNS 添加 TXT 验证记录，格式：

```
Type:  TXT
Name:  @
Value: google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. 在域名注册商添加后点 **Verify**，通常几分钟内验证通过
4. 验证成功后，到 **URL Inspection** 里输入你的首页 URL，点 **Request Indexing**——告诉 Google 可以爬了

Search Console 也能看到哪些关键词带来了流量，以及哪些页面有抓取错误，接上去之后定期看一下。

---

## 4. Google Analytics GA4 埋点

### 4.1 获取 GA4 Measurement ID

1. 登录 [analytics.google.com](https://analytics.google.com)，创建账号 → 属性（Property）
2. 数据流（Data Streams）→ 添加网站 → 填你的域名
3. 创建完成后，进入该数据流，看到 **Measurement ID**，格式是 `G-XXXXXXXXXX`

### 4.2 在 index.html 里加载 GA4

在 Dev Mode 打开 `index.html`，把下面两段脚本插到 `<head>` 结尾处，`<title>` 之后都行：

```html
<!-- Google Analytics GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

把 `G-XXXXXXXXXX` 替换成你在 GA4 拿到的 Measurement ID。

> **为什么放 `<head>` 而不是 `<body>`？** GA4 脚本需要在 React 渲染之前完成加载，否则初始页面访问会被漏掉。

### 4.3 SPA 路由追踪（关键！）

Lovable 生成的应用是 React SPA，默认 GA4 只记录第一次页面加载，用户在应用内跳转不会触发新的 `page_view`。要追踪路由变化，在你的主组件（通常是 `src/App.tsx`）里加一个 hook：

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
    });
  }, [location]);
}
```

然后在 `App` 组件的函数体里调用：

```tsx
function App() {
  usePageTracking(); // 每次路由变化触发 page_view

  return (
    <Routes>
      {/* 你的路由 */}
    </Routes>
  );
}
```

如果用 Lovable 的 AI 来加，直接说：

```
在 App.tsx 里加一个 usePageTracking hook，在每次路由变化时调用 window.gtag('event', 'page_view', ...)，追踪 GA4 SPA 路由。
```

Lovable 会自动处理 TypeScript 类型声明（`window.gtag`）和导入。

### 4.4 验证埋点是否生效

1. 打开 Google Analytics → **Reports** → **Realtime** → **Users in last 30 minutes**
2. 在另一个标签页打开你的应用，来回点几个页面
3. Realtime 报表里出现用户活动，并且每次路由跳转都有新的 `page_view` 事件，说明埋点正常

也可以在浏览器 DevTools → Network 里过滤 `google-analytics` 或 `gtag`，看到有 `collect` 请求发出去即为正常。

---

## 5. 上线前检查清单

| 项目 | 检查方法 |
|------|---------|
| 域名 HTTPS 正常 | 浏览器地址栏显示 🔒，访问 HTTP 自动跳转 HTTPS |
| 自定义域名内容正确 | 打开域名，内容与 Lovable 项目一致 |
| 页面 `<title>` 和 description | 浏览器查看源代码，搜索 `<title>` 和 `description` |
| OG 图片预览 | 用 [opengraph.xyz](https://www.opengraph.xyz) 粘贴你的 URL 看预览效果 |
| Google Search Console 验证 | 状态显示 "Domain verified" |
| GA4 实时数据 | Realtime 报表看到自己的访问记录 |
| SPA 路由追踪 | 手动点 3-4 个页面，Realtime 出现对应 `page_view` 事件 |

---

## 6. 常见问题

**域名连接后显示空白页或 ERR_SSL_PROTOCOL_ERROR**

SSL 证书还没签发完，等 10-30 分钟。如果用了 Cloudflare 且 Proxy 是开的，先关掉 Proxy（灰色云）再等证书，签发后再决定是否开 Proxy。

**Google 搜索不到我的网站**

新域名被 Google 索引通常需要几天到几周。先到 Search Console 手动 Request Indexing，再检查 `robots.txt` 里没有 `Disallow: /` 把自己屏蔽掉。

**GA4 实时报表看不到数据**

首先排查是否装了 uBlock 或 AdGuard——广告拦截器会屏蔽 `googletagmanager.com` 请求。用隐身窗口（不带扩展）测试。其次确认 `G-XXXXXXXXXX` 里的 ID 和 GA4 属性里的 Measurement ID 一致，字母 O 和数字 0 很容易搞混。

**OG 图片在微信里不显示**

微信的图片爬虫对 CORS 和 Content-Type 有要求，图片必须放在自己的域名（不能是跨域的图床），且 Content-Type 必须是 `image/png` 或 `image/jpeg`。把 OG 图放到 Lovable 项目 `public/` 目录，用你的自定义域名 URL 引用。
