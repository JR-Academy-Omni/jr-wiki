---
title: "n8n 自托管部署完全指南：从零到生产环境"
wiki: "n8n-guide"
order: 3
description: "Docker Compose + PostgreSQL 标准配置、Nginx HTTPS、Cloudflare Tunnel、备份策略、常见踩坑——一篇搞定生产级自托管"
---

自托管的最大价值是：数据不出你的服务器，执行次数无上限，成本随量封顶。但 60% 的人在上线前 30 天就因为配置失误或缺少备份而遭遇故障。这章把正确姿势一次说清。

![n8n 自托管架构](https://raw.githubusercontent.com/n8n-io/n8n-docs/main/docs/_images/hosting/n8n-server-diagram.png)

---

## 选服务器：先别省钱

| 场景 | RAM | CPU | 存储 |
|------|-----|-----|------|
| 测试 / 个人项目 | 2 GB | 1 vCPU | 20 GB SSD |
| 小团队生产（<50 workflow） | 4 GB | 2 vCPU | 40 GB SSD |
| 中型团队（50–200 workflow） | 8 GB | 4 vCPU | 80 GB SSD |

存储必须用 **SSD**——n8n 每次执行都会写日志，HDD 的随机写入速度会让 workflow 队列积压。RAM 不够会让 Node.js 进程在执行高并发 workflow 时直接 crash。

推荐供应商：Hetzner（性价比最高，欧洲数据中心）、DigitalOcean（文档友好）、Vultr（中国大陆网络相对快）。

---

## 标准部署方案：Docker Compose + PostgreSQL

这是官方推荐的生产配置。SQLite 仅适合本地测试，生产环境必须换 PostgreSQL。

### 目录结构

```
/opt/n8n/
├── docker-compose.yml
├── .env
└── local-files/        # workflow 读写本地文件的共享目录
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"    # 只绑定本机，不直接暴露到公网
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: ${POSTGRES_DB}
      DB_POSTGRESDB_USER: ${POSTGRES_USER}
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      N8N_HOST: ${N8N_HOST}
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      WEBHOOK_URL: https://${N8N_HOST}/
      GENERIC_TIMEZONE: Australia/Sydney
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: 168         # 保留7天执行历史（小时）
    volumes:
      - n8n_data:/home/node/.n8n
      - ./local-files:/files
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  n8n_data:
```

> **关键细节**：`ports` 写 `127.0.0.1:5678:5678` 而非 `5678:5678`，这样 n8n 只监听本机回环，不直接暴露在公网——只有 Nginx 反向代理才能访问它。

### .env 文件

```env
POSTGRES_USER=n8n
POSTGRES_PASSWORD=换成强随机密码_至少20位
POSTGRES_DB=n8n

N8N_ENCRYPTION_KEY=换成随机字符串_至少32位_丢失则凭证全废
N8N_HOST=n8n.your-domain.com
```

启动：

```bash
cd /opt/n8n
docker compose up -d

# 查看日志确认启动成功
docker compose logs n8n --tail=50 -f
```

---

## HTTPS 方案一：Nginx + Let's Encrypt

适合有固定公网 IP 的 VPS，80/443 端口可以对外开放。

### 安装 Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx

# 申请证书（替换域名）
certbot --nginx -d n8n.your-domain.com
```

### Nginx 配置 `/etc/nginx/sites-available/n8n`

```nginx
server {
    listen 80;
    server_name n8n.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name n8n.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/n8n.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.your-domain.com/privkey.pem;

    # WebSocket 支持（n8n 实时推送需要）
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;     # webhook 长轮询需要较大超时
        client_max_body_size 50M;    # 允许上传文件
    }
}
```

```bash
ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## HTTPS 方案二：Cloudflare Tunnel（推荐，零开端口）

不需要固定 IP，不需要开放防火墙端口，安全性更好。适合家庭宽带或有 NAT 的环境。

### 步骤

1. 在 Cloudflare 后台创建 Tunnel，下载 `cloudflared` 凭证文件（JSON）
2. 在 `docker-compose.yml` 里加一个 `cloudflared` 服务：

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - n8n
```

3. 在 `.env` 里加 `CLOUDFLARE_TUNNEL_TOKEN=你的token`
4. 在 Cloudflare 后台把 Tunnel 路由到 `http://n8n:5678`（容器内部网络名）

完成后公网用 `https://n8n.your-domain.com` 访问，流量全程走 Cloudflare Edge，服务器无需开任何入站端口。

---

## 备份：最容易被忽视，最不能出错

```bash
# 备份脚本 /opt/n8n/backup.sh
#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/n8n/backups

mkdir -p "$BACKUP_DIR"

# 备份 PostgreSQL
docker exec n8n-postgres-1 \
  pg_dump -U n8n n8n | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 备份 .n8n 目录（包含凭证加密数据）
docker run --rm \
  -v n8n_n8n_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/n8n_data_$DATE.tar.gz" /data

# 只保留最近 7 天
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "备份完成: $DATE"
```

加入 crontab（每天凌晨3点执行）：

```bash
chmod +x /opt/n8n/backup.sh
crontab -e
# 加入：
# 0 3 * * * /opt/n8n/backup.sh >> /var/log/n8n-backup.log 2>&1
```

**备份同时要异地存储**：用 `rclone` 把备份文件同步到对象存储（如 Cloudflare R2、AWS S3、阿里云 OSS）。

---

## 版本升级：不要每次都升 latest

```bash
# 1. 先查看当前版本
docker exec n8n-n8n-1 n8n --version

# 2. 升级前备份
/opt/n8n/backup.sh

# 3. 拉新镜像并重启
docker compose pull n8n
docker compose up -d n8n

# 4. 查看日志确认正常
docker compose logs n8n --tail=20 -f
```

建议策略：锁定小版本（如 `image: docker.n8n.io/n8nio/n8n:1.85`），每月人工评估一次是否升级，安全补丁版本立即跟进。

---

## 最常见的 7 个踩坑

| 坑 | 症状 | 解法 |
|----|------|------|
| `N8N_ENCRYPTION_KEY` 没设或丢了 | 凭证全部无法解密，需要重新配所有 API Key | 首次启动前设好，妥善保存到密码管理器 |
| SQLite 用于生产 | 并发执行时数据丢失 | 换 PostgreSQL |
| 5678 端口直接暴露公网 | 不需要登录就能访问 n8n | 用 Nginx/Cloudflare Tunnel 做反向代理 |
| 忘记配置 `WEBHOOK_URL` | Webhook 节点生成错误的回调地址 | 设 `WEBHOOK_URL=https://你的域名/` |
| 服务器时区错误 | Cron 触发器时间不准 | 设 `GENERIC_TIMEZONE=Asia/Shanghai`（或对应时区）|
| 磁盘被执行日志撑满 | n8n 突然停止运行 | 开启 `EXECUTIONS_DATA_PRUNE=true` |
| 没有备份 | 服务器故障后数据全丢 | 按上面的备份脚本每天自动备份 |

---

## 成本速算

自托管的盈亏点大约在 **每月 20,000 次执行**：

- Hetzner CX22（4GB/2vCPU）：约 €4/月
- n8n Cloud Pro（10,000次执行）：€60/月
- n8n Cloud Business（40,000次执行）：€800/月

执行量大的团队用自托管节省的费用，一年可以买下好几台服务器。
