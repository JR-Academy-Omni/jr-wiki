---
title: "账户、支付、续订、多币种"
wiki: "jr-academy-guide"
order: 7
description: "怎么开会员、支付方式、续订机制、退订流程、6 种货币自动切换、发票、跨设备同步"
---

## 账户管理一张图

```
[`/account`](https://jiangren.com.au/account) — 学员中心总入口
   ├── /profile        基本信息
   ├── /billing        会员订阅 + 历史账单
   ├── /purchases      Bootcamp / cert 一次性购买
   ├── /preferences    通知、邮件、语言
   ├── /security       密码、2FA、登录历史
   └── /referral       邀请好友送时长
```

## 支付方式

匠人支持的 6 种支付通道：

| 方式 | 适用 | 货币 |
|------|------|------|
| **信用卡 / 借记卡** | 全球，主流 Visa / MC / Amex | 全部支持 |
| **Apple Pay** | iOS / macOS | 全部支持 |
| **Google Pay** | Android / Web | 全部支持 |
| **WeChat Pay 微信支付** | 中国大陆 + 境外微信 | CNY |
| **Alipay 支付宝** | 中国大陆 | CNY |
| **PayPal** | 全球 | USD / GBP |

**App 内购**走 Apple App Store / Google Play 自己通道（StoreKit IAP），价格可能比 Web 略高（因为平台抽成）。**移动端用户建议在 Web 完成订阅**，App 仅用于使用。

## 多币种自动切换

匠人按 IP 自动检测国家显示对应货币：

| 国家 | 货币 | BASIC 月费 |
|------|------|-----------|
| 🇦🇺 Australia | AUD | $8 |
| 🇺🇸 USA / Puerto Rico / Guam | USD | $5.99 |
| 🇨🇳 China + 🇹🇼 Taiwan + 🇭🇰 HK | CNY | ¥39 |
| 🇸🇬 Singapore | SGD | S$8 |
| 🇲🇾 Malaysia | MYR | RM 25 |
| 🇬🇧 United Kingdom | GBP | £4.99 |

其他国家默认 AUD。

### 强制切换货币

如果检测到货币不对（VPN 用户常见），可以：

1. URL 加 query 参数：`?currency=USD` （会写 cookie 30 天）
2. 或者 [`/account/preferences`](https://jiangren.com.au/account/preferences) 手动选

⚠️ **微信内嵌浏览器** 跳过自动检测（路由 IP 不准），默认 AUD，可以手动切。

## 续订机制

| 周期 | 默认 | 续订 |
|------|------|------|
| 月度订阅 | 自动续 | 每月在购买日自动扣 |
| 年度订阅 | 自动续 | 每年在购买日自动扣，**到期前 7 天邮件提醒** |
| Bootcamp 一次性 | — | 不自动续 |

[`/account/billing`](https://jiangren.com.au/account/billing) 可以一键关闭自动续订。关闭后服务继续到当前周期结束。

## 取消 / 退订流程

### 取消订阅（关闭自动续）

- 路径：`/account/billing` → "管理订阅" → "取消自动续订"
- 立即生效：是
- 已扣金额退还：否（服务继续到周期结束止）

### 退订（要钱回来）

按 [Refund Policy](https://jiangren.com.au/refund-policy) 处理。简单版：

| 服务类型 | 退订规则 |
|---------|---------|
| 月度会员 | 14 天内 + 没用关键功能可全额退 |
| 年度会员 | 14 天内全额退 |
| Bootcamp 自学版 | 14 天内 + 完成进度 < 30% 可退 |
| Bootcamp 教学版 | 14 天内 + 没参加 live session 可退 |
| Bootcamp 陪跑版 | 14 天内 + 没用 mentor 时长可退 |
| 已完成的 Cohort | 不退 |

退订邮箱 hello@jiangren.com.au + 订单号 + 退订原因。一般 3-5 工作日处理。

## 发票 / Invoice / Receipt

每次扣款后系统自动发邮件，含 PDF 发票：

- **澳洲用户**：含 GST（10%）注明，可入账报销
- **国际用户**：含国际付款 receipt，可用于公司报销

历史发票随时在 `/account/billing` 下载。**澳洲企业用户**可以填 ABN 让发票出现在 GST 表里。

## 跨设备同步

一个账号可同时登录：

- 1 个 Web 浏览器
- 2 台移动设备（iOS + Android 或两台 iOS）
- 1 个微信小程序
- 多个 Chrome 插件

进度（学到第几章、错题本、收藏、Bootcamp 完成度）**全平台自动同步**。

⚠️ **同时登录限制**：超过 4 台并发登录会被踢最早的一台。这是为了防止账号共享 + 滥用。

## 邀请好友 / Referral

[`/account/referral`](https://jiangren.com.au/account/referral) 拿到你的邀请码：

- 你邀请的人首次付费 → 你的会员延 30 天
- TA 用你的邀请码注册 → TA 自己也送 14 天免费 Trial

没有上限，邀请越多送得越多。**禁止滥用**：自己注册多账号刷邀请会被风控，发现后清零。

## 安全 / Privacy

- **密码**：bcrypt 哈希，不可逆
- **2FA**：[`/account/security`](https://jiangren.com.au/account/security) 可开
- **登录历史**：能看每次登录时间 / IP / 设备，异常可一键登出全部
- **数据导出**：按 GDPR / 澳洲 Privacy Act，[`/account/data-export`](https://jiangren.com.au/account/data-export) 可申请导出你的全部数据（24-48h 邮件给 ZIP）
- **删除账号**：[`/account/delete`](https://jiangren.com.au/account/delete)，删后 30 天内可恢复，过 30 天物理删

## 账单遇到问题

| 问题 | 解决 |
|------|------|
| 扣款失败，订阅暂停 | 更新支付方式 → 自动恢复 |
| 重复扣款 | 邮箱提供两次扣款时间 + 金额，3 工作日内退多扣的 |
| 不认识的扣款 | 看 `/account/billing` 历史；不是你的 → 可能账号被盗，立刻改密码 + 联系客服 |
| 货币不对 | 加 `?currency=AUD` query 或 `/account/preferences` 切 |
| 发票要 GST 信息 | `/account/profile` 填 ABN，下次发票自动带 |

## 客服

- **支付 / 账单 / 退订**：邮箱 hello@jiangren.com.au + 订单号（必填）
- **账号被盗 / 异常登录**：紧急联系，标题写 "URGENT"
- **企业 / 团购方案**：[`/contact-sales`](https://jiangren.com.au/contact-sales)

下一章是 FAQ 兜底，不在前面章节的零碎问题都汇总在那。
