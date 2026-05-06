---
title: "Lovable 常见问题 FAQ：踩坑避坑指南"
wiki: "lovable-guide"
order: 5
description: "Lovable 使用中最常见的问题和解决方案：生成代码出错、Supabase 连接、部署失败、定价疑问等"
---

使用 Lovable 的过程中会遇到各种问题，这里汇总了最常见的疑问和解决方案。

## 关于生成质量

**Q：AI 生成的代码不是我想要的，怎么办？**

A：最常见的原因是 prompt 不够具体。尝试以下策略：

1. **更具体地描述**：不说"美化一下界面"，改成"把背景色改成 #F8F9FA，标题字体改成 24px 加粗，卡片加 1px #E5E7EB 边框和 8px 圆角"
2. **分解需求**：一次只改一个地方
3. **提供参考**：说"参考 Stripe Dashboard 的风格"或粘贴一个 UI 截图
4. **使用 Select 模式**：直接点击预览里的元素，让 AI 定位到具体组件

---

**Q：AI 修改了我不想改的地方，怎么恢复？**

A：立刻使用版本回滚：

1. 右上角点击时钟图标（History）
2. 找到修改前的版本
3. 点击 Restore

预防方法：在 prompt 里明确说 "**只修改 [具体组件名]，不要改其他任何文件**"

---

**Q：生成的代码有 TypeScript 错误，但 AI 说修好了还是报错？**

A：这是 Lovable 的已知问题。解决步骤：

1. 把完整的错误信息（包括文件名和行号）粘贴到对话框，让 AI 重新修复
2. 如果多次失败，切换到 Code 视图，把出错的文件内容复制出来，加上错误信息，重新描述让 AI 修
3. 实在不行，clone 到本地用 VS Code/Cursor 手动修

---

**Q：我想用 Lovable 生成后端 API，可以吗？**

A：Lovable 主要生成前端代码（React），"后端"逻辑通过 Supabase 实现：
- 数据库操作：Supabase 的 JavaScript SDK
- 服务端逻辑：Supabase Edge Functions（基于 Deno）
- 文件存储：Supabase Storage

如果你需要独立的后端 API（Node.js/Python/Go），Lovable 不是最佳选择，建议用 Cursor 或直接手写。

## 关于 Supabase 集成

**Q：连接 Supabase 后，数据库操作报 403 权限错误？**

A：99% 是 Row Level Security (RLS) 配置问题：

1. 检查表是否开启了 RLS：Supabase Dashboard → Table Editor → 对应表 → 查看 RLS 状态
2. 如果开启了 RLS，确保有对应的 Policy
3. 快速调试方法：临时在 Supabase SQL Editor 运行：
```sql
-- 查看某个表的 Policy
SELECT * FROM pg_policies WHERE tablename = 'your_table_name';
```

---

**Q：Supabase 免费计划有什么限制？**

A：Supabase 免费计划（2026 年）：

| 限制 | 额度 |
|------|------|
| 数据库容量 | 500 MB |
| 文件存储 | 1 GB |
| 月活跃用户 | 50,000 |
| Edge Functions 调用 | 500,000 次/月 |
| **暂停条件** | 连续 7 天无活动自动暂停 |

对于早期验证项目完全够用，正式上线后建议升级到 Pro（$25/月）。

---

**Q：怎么在 Lovable 里调用外部 API（比如天气 API、支付 API）？**

A：直接描述：

```
集成 OpenWeatherMap API：
- API key: [你的key，注意：不要把真实 key 写在对话里，
  让 AI 用环境变量，然后你在 Supabase 或部署设置里配置]
- 添加一个天气卡片组件，根据用户地理位置显示当前天气
```

涉及敏感 API key，正确做法是：
1. 让 AI 生成使用 `import.meta.env.VITE_API_KEY` 读取环境变量的代码
2. 把 key 配置在 Lovable 项目设置的 Environment Variables 里

## 关于定价和限制

**Q：Lovable 免费计划够用吗？**

A：免费计划适合：学习、个人项目、验证想法。限制是每月 5 个项目（注意：是项目数量，不是消息数量）。

付费计划（Pro $25/月）增加：
- 无限项目
- 自定义域名
- 更高的 AI 生成速度
- 优先客服

![Lovable 价格方案一览（Free · Pro · Business）](https://i.ytimg.com/vi/Pk84MnCSQQc/hqdefault.jpg)

---

**Q：Lovable 生成的代码，我拿去商用有版权问题吗？**

A：根据 Lovable 的服务条款，用户完全拥有生成代码的所有权，可以商用、分发、修改。Lovable 不对生成内容主张任何版权。

## 关于工作流最佳实践

**Q：Lovable 和 Cursor 怎么配合使用？**

A：推荐工作流：

```
1. 在 Lovable 快速生成初版（1-2小时）
2. 连接 GitHub，clone 到本地
3. 用 Cursor 做精细修改：
   - 复杂业务逻辑
   - 性能优化
   - 集成测试
4. push 后回 Lovable 继续迭代 UI
```

两个工具各有优势：Lovable 快（新功能对话即可），Cursor 精（精细代码控制）。

---

**Q：Lovable 适合团队协作吗？**

A：目前（2026年）Lovable 的协作功能相对基础：

- 可以把项目分享给团队成员查看
- 多人同时编辑同一项目可能导致冲突
- 推荐做法：一个 Lovable 项目对应一个 GitHub repo，团队通过 GitHub 协作，Lovable 作为"快速修改 UI"的工具

---

**Q：我的项目越来越大，AI 开始出现奇怪的修改，怎么办？**

A：这是 Lovable（以及所有 AI 编辑器）的通病：上下文窗口限制导致大项目理解能力下降。解决方案：

1. **保持项目规模合理**：一个 Lovable 项目不要超过 50 个文件
2. **使用精确指令**：指定具体文件名和组件名，不让 AI 猜
3. **定期整理代码**：在本地用 Cursor 重构，保持代码清洁后再回 Lovable
4. **拆分项目**：把复杂系统拆成多个独立的小项目
