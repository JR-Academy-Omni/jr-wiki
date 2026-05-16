---
title: "Dify 自部署完整指南：Docker Compose + Nginx 反向代理 + HTTPS"
wiki: "dify-guide"
order: 7
description: "从一台空白 VPS 到生产可用的 Dify 实例：Docker Compose 部署八个服务、Nginx 反向代理配置、Certbot 申请 SSL 证书、.env 关键参数解读，附常见坑排查"
---

云端托管的 Dify 够用，但数据出境、API 限流、每月 token 配额这几件事总会在不合时宜的时候让你难受。自部署一套就没这些烦恼——代价是要自己管机器、管证书、管升级。这章把整条路走一遍，顺带把坑标出来。

![Dify self-hosting architecture overview](https://img.youtube.com/vi/ghqPZbI1mus/maxresdefault.jpg)

## 前置条件

**机器规格**：最低 2 vCPU / 4 GB RAM（跑完整栈 + 向量数据库），推荐 4 vCPU / 8 GB。磁盘留 40 GB 以上，向量数据会持续增长。

**软件依赖**：
- Docker Engine 24.0+
- Docker Compose v2（命令是 `docker compose`，不是旧版 `docker-compose`）
- 一个指向该服务器 IP 的域名 A 记录（申请 SSL 证书用）

**端口**：服务器防火墙放开 80、443、22。不要直接暴露 Dify 内部端口（5001、3000 等）到公网。

## 架构速览

Dify 的 `docker-compose.yaml` 默认起八个服务：

| 服务 | 作用 |
|------|------|
| `api` | Dify 后端 Python Flask，端口 5001 |
| `web` | Next.js 前端，端口 3000 |
| `worker` | Celery 异步任务（RAG 索引、回调） |
| `db` | PostgreSQL，应用元数据 |
| `redis` | 会话缓存 + 任务队列 |
| `weaviate` | 默认向量数据库 |
| `sandbox` | 代码执行沙箱（隔离环境运行用户代码） |
| `nginx` | 内置反向代理，把 `/api/` 路由到 `api`，其余路由到 `web` |

外层再加一个宿主机 Nginx 做 HTTPS 终端，证书放在宿主机上，内部流量走 HTTP。

## Step 1：拉代码，配 .env

```bash
git clone https://github.com/langgenius/dify.git
cd dify/docker
cp .env.example .env
```

`.env.example` 里有一百多个变量，大多数默认值可以直接用。必须改的几个：

```bash
# .env — 必改项

# 换成强随机字符串（openssl rand -hex 32 生成）
SECRET_KEY=your-random-secret-key-here

# 换成你的域名（后面配完 HTTPS 再改成 https://）
CONSOLE_URL=https://dify.example.com
APP_URL=https://dify.example.com

# 如果宿主机 80/443 已被占用，把内置 nginx 挪到别的端口
EXPOSE_NGINX_PORT=8080
EXPOSE_NGINX_SSL_PORT=8443
```

`SECRET_KEY` 不改的话用的是示例值，等于把签名密钥公开，任何人都能伪造 session。

### 选择向量数据库

默认是 Weaviate。如果你已经有 Qdrant 或 Milvus，在 `.env` 里改：

```bash
VECTOR_STORE=qdrant
QDRANT_URL=http://your-qdrant-host:6333
QDRANT_API_KEY=your-key
```

不改的话直接用内置 Weaviate 就行，零额外配置。

## Step 2：启动 Dify 容器栈

```bash
cd dify/docker
docker compose up -d
```

第一次启动会拉镜像，根据网速大概要 3-8 分钟。确认所有服务跑起来：

```bash
docker compose ps
```

期望输出每个服务都是 `Up`（`healthy` 更好）。如果 `api` 或 `worker` 反复重启，先看日志：

```bash
docker compose logs api --tail 50
docker compose logs worker --tail 50
```

最常见原因：`.env` 的 `SECRET_KEY` 没改，或者 PostgreSQL 还没完成初始化就被 `api` 连接了——后者等十秒再 `docker compose restart api` 一般能解决。

## Step 3：宿主机 Nginx 反向代理

内置 Nginx 监听 `8080`（或者你在 `.env` 里设的端口），宿主机 Nginx 在 `80/443` 做 TLS 终端，然后把流量转发进去。

先装 Nginx：

```bash
# Ubuntu/Debian
sudo apt install nginx -y
```

创建站点配置（先只配 HTTP，等会儿 Certbot 会自动改成 HTTPS）：

```nginx
# /etc/nginx/sites-available/dify
server {
    listen 80;
    server_name dify.example.com;

    # 大文件上传（知识库文档）
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（Dify 控制台用到）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300s;
        proxy_connect_timeout 10s;
    }
}
```

启用并测试：

```bash
sudo ln -s /etc/nginx/sites-available/dify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

此时用 `curl http://dify.example.com` 应该能拿到 Dify 前端的 HTML。

## Step 4：Certbot 申请 SSL 证书

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d dify.example.com
```

Certbot 会自动修改你的 Nginx 配置，加上 `ssl_certificate`、`ssl_certificate_key`，并把 80 端口重定向到 443。完成后验证：

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I https://dify.example.com
# 期望看到 HTTP/2 200
```

证书 90 天到期，Certbot 的 systemd timer 会自动续期，不需要手动操作。

### 最终 Nginx 配置长这样

Certbot 改完之后，配置大概是：

```nginx
server {
    listen 80;
    server_name dify.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dify.example.com;

    ssl_certificate     /etc/letsencrypt/live/dify.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dify.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300s;
    }
}
```

注意 `X-Forwarded-Proto https` 硬编码成 `https`，不用 `$scheme`——因为宿主机到容器那段是 HTTP，如果用 `$scheme` 传进去的是 `http`，Dify 生成的链接会变成 `http://` 开头，表单提交 CSRF 校验会报错。

## Step 5：Dify 首次初始化

打开浏览器访问 `https://dify.example.com`，进入管理员账号创建页面。填完邮箱和密码，登进控制台，去「设置 → 模型供应商」填你的 OpenAI / Anthropic / 本地 Ollama 的 API Key。

如果你用 Ollama 或 LiteLLM 这类本地模型，`BASE_URL` 要填宿主机内网 IP 而不是 `localhost`，容器里的 `localhost` 解析不到宿主机。Docker Compose 默认网络下，用 `host.docker.internal`（Mac/Windows）或宿主机内网 IP（Linux）。

## 升级 Dify

```bash
cd dify/docker
git pull
docker compose pull
docker compose down
docker compose up -d
```

数据卷（PostgreSQL、Weaviate、上传文件）挂在命名 volume 上，`down` 不会删数据。但升级前建议先备份 PostgreSQL：

```bash
docker compose exec db pg_dump -U postgres dify > dify-backup-$(date +%Y%m%d).sql
```

## 常见问题排查

**问：首页白屏，控制台报 502**
先看 `docker compose ps`，确认 `api` 和 `web` 都在跑。再检查宿主机 Nginx 的 `proxy_pass` 端口有没有对上 `.env` 里的 `EXPOSE_NGINX_PORT`。

**问：上传知识库文档报 413 Request Entity Too Large**
Nginx 默认限制 1MB。在宿主机 Nginx 配置里加 `client_max_body_size 100M;`（已在上面的示例里包含）。

**问：`certbot` 报 "Could not bind to IPv4 or IPv6"**
`certbot --nginx` 的 standalone 模式需要占用 80 端口，但你的 Nginx 已经在用。用 `--nginx` 插件就好（不是 `--standalone`），它会和 Nginx 协作，不需要停服。

**问：Dify 生成的链接是 http:// 不是 https://**
`.env` 里的 `CONSOLE_URL` 和 `APP_URL` 还没改成 `https://`。改完 `docker compose restart api` 生效。

**问：磁盘快满了**
向量数据、Docker 镜像层和日志是三大占用。清理未使用镜像：`docker image prune -f`。Weaviate 数据在 `volumes/weaviate`，没有简单缩容方法，规划时提前留够空间。

---

自部署的核心优势是数据完全在自己手里，模型调用也走自己的 API Key，适合有数据合规要求或者用量大的场景。跑起来之后日常维护很少，主要就是偶尔升级版本和看一眼磁盘使用率。
