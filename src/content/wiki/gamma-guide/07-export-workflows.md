---
title: "Gamma 导出工作流：PDF 高质量、PPT 兼容 PowerPoint、Notion 嵌入"
wiki: "gamma-guide"
order: 7
description: "系统梳理 Gamma 三条导出路径：PDF 保真导出（打印/邮件分发）、PPTX 转 PowerPoint（含字体/渐变兼容问题及绕过方法）、Notion 嵌入同步（/embed 命令 + Zapier 自动化）"
---

做完一份 Gamma 演示，接下来要面对的问题往往是：老板用 PowerPoint、客户要 PDF 邮件、内部 wiki 在 Notion。Gamma 的分享链接解决了在线展示问题，但这三条离线 / 跨平台路径各有各的踩坑点。这一章系统梳理。

![Gamma 导出到 PDF 和 PowerPoint 的工作流](https://img.youtube.com/vi/Qy6LZBnMxOE/maxresdefault.jpg)

---

## 统一入口：Share → Export

Gamma 的所有导出操作从同一个地方进入：

1. 打开任意 Gamma 文档
2. 右上角点 **Share** 按钮
3. 在弹出的面板里选 **Export** 标签页

你会看到三个选项：**PDF**、**PowerPoint**、**PNG**（单张卡片导出，后面不细展开）。

另一条路：右上角三个点（`⋯`）→ **Export**，和上面是同一个入口，只是快捷方式不同。

---

## 路径一：PDF 导出（高保真 → 打印 / 邮件）

PDF 是 Gamma 三种导出格式里**视觉还原度最高的**。每张 Gamma 卡片被渲染成独立 PDF 页，设计样式（渐变、圆角、阴影、品牌色）几乎 1:1 保留。

### 操作步骤

```
Share → Export → PDF → 点击 Download
```

等 Gamma 后台渲染完（通常 5-15 秒，卡片多的话可能更久），浏览器直接下载 `.pdf` 文件。

### 页面方向与比例

Gamma 默认按照文档的 **Card Size** 设置渲染 PDF 尺寸：

| Card Size 设置 | PDF 输出 |
|---------------|---------|
| Presentation（16:9） | 横版，每页一张幻灯片 |
| Document（Letter / A4） | 竖版，长文档流式排版 |
| Free-form | 按内容高度截取，可能每页比例不一致 |

如果需要标准 A4 打印，建议在导出前进入 **⋯ → Page Setup → Card Size → Document**，选 A4 或 Letter，再导出 PDF。**Scale content to fit** 这个选项勾上后，内容会等比缩放到所选纸张尺寸，不会截断。

### 交互元素的处理

PDF 是静态文件，以下 Gamma 元素在 PDF 里**不会渲染**或降级处理：

- 嵌入的视频（YouTube / Loom）→ 变成静态占位图
- 交互式图表 → 变成截图
- 代码高亮 → 文本保留，但高亮色可能偏移
- 展开/折叠块 → 只展示默认展开状态

**实用结论**：如果你的 Gamma 文档里大量用了视频和交互，PDF 质量会打折。解决办法是把关键视频截图 + 贴二维码到 Gamma 里，PDF 导出时保留静态截图，扫码再看视频。

### 免费版 vs 付费版水印

| 套餐 | PDF 水印 |
|------|---------|
| Free | 每页底部有 "Made with Gamma" 标注 |
| Plus / Pro | 无水印 |

水印出现在页面底部，对外正式材料需要付费套餐。

### 什么时候用 PDF

- 发邮件给客户（PDF 比分享链接更"正式"）
- 打印实体材料
- 归档版本（固定某个时间点的内容，不会随后续编辑变化）
- 需要离线使用

---

## 路径二：PowerPoint 导出（兼容 PPTX → 给 Office 用户）

### 操作步骤

```
Share → Export → PowerPoint → 点击 Download
```

Gamma 把当前文档转成 `.pptx` 文件。下载后可以直接用 Microsoft PowerPoint、Google Slides、WPS 等打开。

### 转换机制（为什么会失真）

Gamma 本质上是 **web-first 工具**，每张卡片在底层是 HTML/CSS 渲染的结构化内容块。导出 PPTX 时，Gamma 把每个 HTML 卡片"翻译"成 PowerPoint 的 XML Slide 格式——两套格式设计逻辑差异很大，翻译过程中必然有损耗。

具体会丢失或降级的内容：

```
Gamma 原生特性            →  PowerPoint 里的状态
────────────────────────────────────────────────────
Web 字体（80+ 种）         →  Calibri / Arial 替换（系统字体兜底）
渐变标题色                 →  变成单色或渐变方向错位
入场动画 / 滚动视差        →  全部移除（静态 slide）
嵌入视频 / iframe         →  变成空白占位
交互图表                  →  静态截图
CSS 圆角 / 阴影           →  部分保留，复杂效果丢失
```

这不是 Gamma 的 bug，是两套格式的架构差异决定的。

### 导出前的优化清单

如果最终需要一份质量可接受的 PPTX，在写 Gamma 时就需要做取舍：

**能保留的**：
- 纯文本、标题、列表
- 插入的图片（非 CSS 背景图）
- 表格（结构保留，样式可能偏移）
- 品牌 Logo（如果放在内容区而非 CSS 背景）

**尽量避开的**（如果目标是给别人发 PPTX）：
- 渐变色标题 → 改成纯色
- 依赖 web 字体的设计 → 改用 Arial / Helvetica 等系统字体
- 视频嵌入 → 换成截图 + 外链二维码
- 复杂动画 → 不加

**一个实用技巧**：导出前先在 Gamma 的主题编辑器里把字体改成 **Inter**（PowerPoint 大多数平台有对应的近似字体），可以减少字体替换的视觉冲击。

### 导出后的 PowerPoint 修复

拿到 PPTX 后，用 PowerPoint 打开通常需要做以下调整：

```
1. 全选 → 重新应用主题颜色（如果颜色偏了）
2. 检查每张幻灯片的字体，手动替换异常字体
3. 重新插入视频文件（Gamma 里的视频链接会失效）
4. 调整布局偏移（尤其是多栏布局，可能位置错位）
```

调整量取决于原始 Gamma 用了多少 web-specific 特性。结构简单的 Gamma 导出 PPTX 质量相当不错；设计复杂的建议用 PDF 替代。

### 受众控制（付费功能）

Plus / Pro 套餐可以控制**分享链接的受众是否能下载**：

```
Share → 分享链接设置 → Allow downloads → 开关 PDF / PPTX
```

如果你希望客户只能在线看、不能下载编辑，把 PPTX 下载关掉（PDF 可以保留，因为 PDF 不容易被改稿）。

---

## 路径三：Notion 嵌入（让 Gamma 活在 Notion wiki 里）

Gamma 和 Notion 没有官方原生双向同步，但有两种常用的集成方式。

### 方式 A：Gamma 嵌入 Notion（最快，1 分钟搞定）

Notion 支持嵌入任意公开链接。Gamma 的分享链接可以直接嵌入，访客在 Notion 页面里就能**滚动浏览 Gamma 演示，不需要跳转**。

步骤：

```
1. 在 Gamma 里点 Share → 生成分享链接（设为 Anyone with link can view）
2. 复制分享链接
3. 打开 Notion 页面，输入 /embed
4. 粘贴 Gamma 分享链接 → 点 Embed link
5. 拖动右下角调整嵌入区域的高度
```

嵌入后的效果：Notion 页面里出现一个 iframe，加载 Gamma 的完整交互界面。点击翻页、滚动、展开折叠块都可以在 Notion 里直接操作。

**限制**：

- Gamma 文档必须设置为"公开分享"，私有文档无法嵌入（嵌入框会显示空白或登录提示）
- Notion 移动端 App 对 iframe 嵌入支持有限，手机上可能需要点击"Open in browser"查看完整交互
- 如果 Gamma 文档更新了内容，嵌入的 Notion 页面自动反映最新版（因为是实时链接，不是截图）

### 方式 B：Notion 内容 → Gamma（导入建稿）

如果你在 Notion 里已经有现成的文档大纲，可以导入到 Gamma：

```
Gamma → 新建文档 → Import → 粘贴 Notion 页面内容（或上传导出的 .md 文件）
```

Gamma 会识别 Notion 的标题层级（H1/H2/H3），把内容拆成对应的卡片——一个 H1 段落对应一张卡片。然后你在 Gamma 里美化设计，再嵌回 Notion 完成展示层。

这个流程适合"内容在 Notion 管理，展示用 Gamma"的团队：

```
Notion（写稿 / 管内容） → 导入 Gamma（设计） → 嵌入回 Notion（展示）
```

### 方式 C：Zapier 自动化同步（进阶）

如果需要定期把 Notion 数据库的新条目自动转成 Gamma 演示，可以用 Zapier：

```
触发器: Notion → Database Item Created（Notion 数据库新增条目）
动作:   Gamma → Create Presentation（用模板 + Notion 字段内容生成演示）
```

这条路适合团队有标准化报告模板的场景，比如每周把销售数据从 Notion 同步成 Gamma 周报——不需要手动导入，Zapier 自动跑。

Zapier 的 Gamma 动作目前支持：
- 从文本生成演示
- 在现有演示里追加卡片

---

## 三条路径横向对比

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 发邮件给客户 | PDF 导出 | 高保真，正式感强，离线可用 |
| 发给需要编辑的同事 | PPTX 导出 | 对方用 PowerPoint 工作流 |
| 公司 wiki / 内部文档 | Notion 嵌入 | 内容实时同步，无需重复导出 |
| 打印实体手册 | PDF 导出 | 精确控制页面比例，印刷质量好 |
| 纯展示不需要下载 | Gamma 分享链接 | 链接分享是 Gamma 最强的形态 |
| 跨平台存档 | PDF | 格式稳定，不依赖 Gamma 服务 |

---

## 常见问题

**Q：导出 PPTX 之后版式全乱了，怎么办？**

版式乱主要原因是原始 Gamma 用了多栏布局（two-column 或 sidebar）。PowerPoint 对多栏 HTML 的映射不稳定。解法：在 Gamma 里把多栏布局改成单栏，导出后再在 PowerPoint 里手动排成两列。或者直接用 PDF，PDF 对多栏的还原更好。

**Q：PDF 里的字体模糊？**

Gamma 导出 PDF 使用屏幕分辨率渲染，通常是 96dpi。用于高精度印刷（比如展会喷绘）时可能不够，建议：Card Size 选大尺寸（A3 / 16:9 大尺寸），导出后 PDF 分辨率会按比例提升。或者改用专业设计工具（Figma、AI）做印刷物料。

**Q：嵌入 Notion 的 Gamma 展示不出来，只有白框？**

检查 Gamma 分享链接的权限设置。进入 Gamma → Share → Link Sharing，确认是 **Anyone with the link** 而不是 **Team only** 或 **Private**。私有链接在 Notion 嵌入框里无法加载。

**Q：能不能设置 PDF 只有一部分卡片？**

目前 Gamma 的导出只支持全文档导出，没有"只导出第 3-6 张"的功能。变通方法：复制一份文档，删掉不需要的卡片，再导出。或者用 PDF 编辑工具（Acrobat / PDF Expert）事后截取页面。

**Q：付费版 vs 免费版，导出的区别只有水印吗？**

主要差异：

```
免费版：
  ✅ PDF 可以导出（带 Gamma 水印）
  ✅ PPTX 可以导出（带 Gamma 水印）
  ❌ 不能控制受众的下载权限

Plus / Pro：
  ✅ 无水印
  ✅ 可以控制每条分享链接的下载权限（PDF / PPTX 分别开关）
  ✅ 自定义字体（影响 PPTX 导出时的字体还原度）
```
