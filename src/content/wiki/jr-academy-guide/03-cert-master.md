---
title: "考证匠 Cert Master：题库 + AI Tutor + 多端"
wiki: "jr-academy-guide"
order: 3
description: "AWS / Azure / GCP / CKA 等 IT 认证一站式刷题，Web + iOS App + 微信小程序 + Chrome 插件四端打通"
---

## 一句话

**全英文 IT 认证用中文母语刷出来**——考证匠把 AWS / Azure / GCP / CKA / CKAD 等 30+ 国际认证的官方题库 + 中文翻译 + AI 解析 + 错题回顾捆成一个工具。

考证匠是匠人最大的 traffic 来源，也是最完整的多端产品矩阵——Web / iOS App / 微信小程序 / Chrome 浏览器插件四端打通，账号通用、进度同步。

## Web 入口（首选）

[`/tools/cert-master`](https://jiangren.com.au/tools/cert-master) 列出所有支持的认证。点进去任意一个进认证详情页：

```
┌──────────────────────────────────────┐
│  AWS Solutions Architect Associate   │
│  ⭐ 4.8 · 8000+ 题 · ¥免费试 30 题   │
├──────────────────────────────────────┤
│ • 学习章节 (free)                     │
│ • 题库刷题 (会员)                     │
│ • Mock Exam 模考 (会员)               │
│ • 错题本 / 收藏 (会员)                │
│ • 学习数据 / 学习日历                  │
└──────────────────────────────────────┘
```

完整 URL pattern：

| 页面 | URL |
|------|-----|
| 认证列表 | `/certifications` |
| 认证详情 | `/certifications/exam/{slug}` |
| 学习章节列表 | `/certifications/exam/{slug}/learn` |
| 章节详情（含视频/图文/quiz） | `/certifications/exam/{slug}/learn/{chapter}` |
| 题库刷题 | `/certifications/exam/{slug}/practice` |
| Mock Exam | `/certifications/exam/{slug}/mock-exam` |

题库每题有：

- 中文题干（机翻 + 人工校对）
- 4-5 个选项（含中文翻译）
- AI 解析（为什么对、为什么错）
- 用户讨论区
- 收藏 / 标记 / 错题加入错题本

## iOS / Android App（考证匠 Cert Master）

App Store / Google Play 搜「考证匠」（包名 `com.jracademy.certmaster`）。

| 功能 | App | Web |
|------|-----|-----|
| 题库刷题 | ✅ | ✅ |
| 错题本 | ✅ | ✅ |
| Mock Exam | ✅ | ✅ |
| AI Tutor 截屏分析 | ✅ | — |
| 离线模式（飞机上刷题） | ✅ | — |
| 学习数据 | ✅ | ✅ |
| 视频章节 | ⚠️ 部分支持 | ✅ |

App 版定位：**通勤 + 离线 + 移动场景**。学完一章在地铁里刷 30 题、错题二刷在咖啡店等。

⚠️ **2026 上线进度**：iOS 在 App Store 上架审核中（StoreKit IAP 走 Apple 通道）；Android 等 Google Play Console 账号开通。如果 App Store 暂时搜不到，先用 Web + 小程序。

## 微信小程序

会员开通后扫小程序码进入。功能聚焦移动刷题，账号绑定主站。**与 App 区别**：

- 小程序无需安装、扫码即用
- 国内用户更方便（App Store 中国区上架进度比国际区慢）
- 但功能精简版，AI Tutor 截屏分析等高级功能在 App 上

## Chrome 插件：考证匠 AI Tutor

Chrome Web Store 搜「JR Academy AI Tutor」或从 [`/tools/cert-master`](https://jiangren.com.au/tools/cert-master) 跳下载。

**核心场景**：

你在 Pearson VUE 模考网站 / Whizlabs / ExamTopics 等第三方平台做题，遇到不会的题：

1. 点插件按钮 → 自动截屏当前题目
2. 插件把截屏发给后端 AI（Claude Sonnet）
3. 几秒后弹窗显示中文解析 + 正确答案 + 知识点链接

不用切换浏览器 tab 不用复制粘贴题干。

⚠️ **学术诚信注意**：Pearson VUE 等正式考试不允许装任何插件 + 不许联网。考证匠 AI Tutor 只用于**模考练习阶段**学习用，正式考试时**必须卸载或禁用**。我们在插件 README + 用户协议里明确写了。

## 学习节奏建议

考证匠用户的常见学习路径：

```
Week 1-2: 看完 Learn 章节（每个 cert 一般 8-15 章）+ 章末 quiz
            ↓
Week 3-4: 题库刷一遍（800-2000 题，按 domain 刷）
            ↓
Week 5: 错题本二刷
            ↓
Week 6: Mock Exam 跑 3-5 套，错题继续二刷
            ↓
正式考试
```

整体节奏 6-8 周拿下一个 Associate-level cert，Pro / Specialty 级别更长。匠人 [Practice Lab](https://jiangren.com.au/learn/aws-lab) 配套实操（AWS / Azure 真实云环境跑 lab），强烈建议刷题 + lab 同步推进。

## 支持的认证（2026-05 数据）

| Provider | 认证 | 题库 |
|----------|------|------|
| **AWS** | Cloud Practitioner / SAA / SAP / DVA / SOA / DEA / MLE / AI Practitioner / Security Specialty | 各 800-2000 题 |
| **Azure** | AZ-900 / AZ-104 / AZ-204 / AZ-305 / AZ-400 / AZ-500 / AZ-700 / AI-102 / AI-900 / DP-100 | 各 600-1500 题 |
| **GCP** | ACE / PCA / PCD / PMLE / PCDE / PSE / PCSE | 各 500-1000 题 |
| **CNCF** | CKA / CKAD / CKS | 各 400-800 题 + 实操题 |
| **CompTIA** | A+ / Security+ / Network+ | 各 800-1500 题 |
| **Oracle / Salesforce** | 多个 | 各档 |

新认证持续添加。具体看 [`/certifications`](https://jiangren.com.au/certifications) 完整列表。

## 题目从哪来

题库由匠人内部 IT 辅导员团队 + 社区贡献维护：

- **官方 sample questions** 100% 收录
- **第三方公开题库**（ExamTopics 等）整理 + 中文翻译
- **匠人原创题** 按 cert blueprint 出题（特别是 GCP / Azure 没成熟第三方题库的）
- **AI 解析** 用 Claude Sonnet 生成，配合人工 review

题目和解析每月更新，发现错误可以在题目页直接报错（点 "🚩 报错" 按钮）。

## 不在考证匠覆盖的认证

❌ **PMP / ITIL** 等管理类认证 — 不在 IT 技术 cert 范围
❌ **Cisco CCNA / CCNP** — 暂未覆盖（2026 H2 路线图考虑加入）
❌ **澳洲本地考试**（IELTS / NAATI 等）— 这是匠人的另一个系统 SigmaQ 在做

## 客服 / 题目报错

- **题目错误**：题目页底部 "🚩 报错"
- **账号 / 支付问题**：邮箱 hello@jiangren.com.au
- **App 闪退 / Bug**：App 内 "设置 → 反馈"，会进 Sentry 日志
- **想要新认证**：给 [`/contact-sales`](https://jiangren.com.au/contact-sales) 提需求，按用户呼声排期

下一章讲求职匠 Job Hunter——简历 + JD 匹配 + AI 面试。
