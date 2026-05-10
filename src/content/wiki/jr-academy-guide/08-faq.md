---
title: "FAQ：常见问题 + 故障排查 + 客服联系"
wiki: "jr-academy-guide"
order: 8
description: "前 7 章没覆盖的零碎问题汇总：登录登不上、视频卡顿、Bootcamp 进度丢、考证匠 App 找不到、客服联系方式"
---

## 账号 / 登录

### Q: 微信扫码登录后跳到一个空白页

A: 微信内嵌浏览器有时缓存问题。三步排查：

1. 关掉所有微信小程序窗口，重新扫码
2. 用外部 Safari / Chrome 直接访问 `jiangren.com.au` 用邮箱登录
3. 还是不行 → 邮箱 hello@jiangren.com.au + 截图

### Q: 我换手机了，怎么把账号迁过去

A: 账号在邮箱不在设备。新设备直接用邮箱 + 密码登录就行。学习进度、错题本、Bootcamp 都自动同步。

### Q: 邮箱忘了 / 密码忘了

A: [`/login`](https://jiangren.com.au/login) → "忘记密码" 输入邮箱发重置链接。如果邮箱也忘了：邮箱 hello@jiangren.com.au + 你最后一次登录的近似时间 + 大概在哪个城市，客服会按 KYC 流程帮找。

### Q: 同时登录上限是多少

A: Web 1 个 + 移动 2 台 + 小程序 1 个 + Chrome 插件多个。详见上一章。

## 学习内容

### Q: 视频加载慢 / 卡顿

A:

1. 检查网速（视频要 ≥ 2Mbps）
2. 清浏览器缓存
3. 切换 CDN：URL 加 `?cdn=cn` 走中国 CDN（默认 AU）

视频通过 [JR Video System](https://github.com/JR-Academy-AI/jr-academy-videos) 独立 repo 维护，2026 H2 切换到 R2 + ElevenLabs 配音的下一代 pipeline，质量会再提升。

### Q: 我学到一半 Bootcamp 进度没了

A: 99% 是浏览器缓存问题。换设备登录看下进度在不在，在就是缓存。**进度在我们 server 不在浏览器**，不会真丢。如果换设备也没了，邮箱 hello@jiangren.com.au + 课程名 + 大概的最后进度。

### Q: 学习章节里的 Lab 跑不起来

A: Lab 分两种：

- **Frontend / Python / LLM Lab**：在浏览器里跑，要稳定网速，不要开 VPN（可能干扰 WebContainer）
- **AWS Lab / Azure Lab**：要消耗你自己的 AWS / Azure 账号配额（匠人 Lab 不给云资源），跟着教程开 sandbox 账号最保险

详见对应 lab 顶部的 "Setup" 部分。

### Q: 找不到我之前看过的某篇 wiki / blog

A: 顶部搜索框搜关键词。如果搜不到 → 那篇内容可能：

- 被 archive 了（极少见）
- 你记错 URL
- 或者是英文版，你在中文站

也可以直接 [`/sitemap.xml`](https://jiangren.com.au/sitemap.xml) 看全站 URL 列表。

## 工具产品

### Q: 考证匠 App 在 App Store 搜不到

A: 2026-05 状态：iOS 在审核中，Android 等账号开通。**先用 Web + 微信小程序**，App 上架后我们会站内通知所有会员。

### Q: 求职匠 Chrome 插件装不上 / 没图标

A:

1. 必须用 Chrome / Edge（不支持 Safari / Firefox）
2. 装完后右上角拼图图标 → "钉住" 求职匠
3. 装完不会弹首页，要到 [`/tools/job-hunter`](https://jiangren.com.au/tools/job-hunter) 第一次配置 profile

### Q: 牛小匠回答说"不能直接给答案"，但我赶 deadline 急用

A: 这是 by design，不是 bug。学术诚信红线我们守得很硬。两个建议：

1. **跟 Tutor 多 turn 聊**：把你的具体卡点告诉它，它会给思考线索
2. **真的赶时间**：去找学校的 academic support / tutor 服务（每个澳洲大学都有免费 tutor 资源）

牛小匠不替代你思考。

### Q: 牛小匠没我学校 / 我课的数据

A: [`/contact-sales`](https://jiangren.com.au/contact-sales) 提交学校 + 课程代码，**通常 2-4 周加进去**。匠人 IT 辅导员团队按用户呼声排期。

## Bootcamp / 课程

### Q: Bootcamp 三档买错了能换吗

A: 14 天内 + 没用过下一档独有功能可换。比如自学买完想升教学：补差价 14 天内可换。**升级容易，降级走退订流程**（退掉再买）。

### Q: 我错过了 cohort 开课

A: 后补两个选项：

1. **回看录播**：cohort live session 都录，错过当周可看回放，但失去群里实时互动
2. **转下一期**：每个 bootcamp 限 1 次免费转期，[`/account/purchases`](https://jiangren.com.au/account/purchases) 申请

### Q: Bootcamp 完了能拿什么证书

A:

- **匠人项目证书**（PDF 可下载，Linkedin 可挂），证明你完成了项目
- **不是国际认可的学历证书**（匠人不是大学）
- 如果你需要国际认可，去考 AWS / Azure / GCP 等官方 cert（用考证匠刷题）

## 支付 / 账单

### Q: 信用卡扣款失败但订阅没自动暂停

A: 我们会重试 3 次（间隔 1/3/7 天）。3 次都失败才暂停。**期间你能正常用**。如果你想立刻换支付方式，去 `/account/billing`。

### Q: 我用一个 BASIC 账号，能不能给家人也用

A: 技术上可以但违反 ToS（同时登录上限、内容授权按 seat 计）。**强烈不推荐**：被风控会暂停账号，影响你自己使用。家庭多人用建议各自买 BASIC（$8 × N 也不贵）。

### Q: 公司报销发票要 ABN

A: `/account/profile` 填 ABN，下次扣款发票自动带。已经扣过的发票补 ABN：邮箱 hello@jiangren.com.au + 订单号。

### Q: 退订申请提交了但没回复

A: 一般 3-5 工作日。**周末 / 澳洲公假**会延长。超过 7 工作日没回，再发一遍邮件标题加 "FOLLOW-UP"。

## 客服联系方式总表

| 渠道 | 用途 | 响应时间 |
|------|------|---------|
| **邮箱 hello@jiangren.com.au** | 一切非紧急问题 | 24-48h |
| **顶部 Live Chat** | 工作时间（10am-6pm AEST 周一至周五）实时 | 实时 |
| **微信公众号 / 客服微信** | 中国大陆用户，工作时间 | 实时 |
| **App 内反馈** | App / 小程序 bug | 24-48h |
| **题目报错按钮** | 题库错误 | 7 天内 review |
| **`/contact-sales`** | 企业 / 团购 / 课程定制 | 1-3 工作日 |

**紧急情况**（账号被盗、严重金额异常）邮件标题写 "URGENT" 会优先处理。

## 反馈渠道（让产品更好）

匠人产品迭代很快，欢迎提反馈：

- **新功能建议**：邮件 product@jiangren.com.au
- **内容建议**（想要某门课 / 某个 cert / 某个工具教程）：[`/contact-sales`](https://jiangren.com.au/contact-sales)
- **bug 报告**：邮箱 + 截图 + 复现步骤

公开 issue tracker 还没开放（roadmap 里），暂时走邮箱。

## 找朋友 / 内推 / 学员社区

- **微信学员群**：进 PLUS / PREMIUM 后会发群邀请
- **Bootcamp 同学群**：买 cohort 后开课前发群邀请
- **GitHub 学员组织**：[github.com/JR-Academy-AI](https://github.com/JR-Academy-AI) 有公开 repo（jr-wiki / jr-academy-videos 等），欢迎 star + 提 PR

## 还有问题？

把你的问题发到 hello@jiangren.com.au。这本指南会按真实问答持续更新。**如果你看完整本指南还有疑问，那这个疑问大概率属于"应该被加到 FAQ 里"的——邮件告诉我们一声**。

---

恭喜读完整本《匠人学院使用指南》。下一步建议：

1. 注册账号（免费）→ 试用 7 天 BASIC 全权益
2. 选你最关心的工具（考证匠 / 求职匠 / 牛小匠）深度用一周
3. 决定要不要订 BASIC ($8/月) 或者直接 PLUS

期待在学员社区遇见你。
