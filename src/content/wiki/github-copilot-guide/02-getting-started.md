---
title: "快速上手：注册免费版 + 第一次 AI 编程"
wiki: "github-copilot-guide"
order: 2
description: "GitHub Copilot Free 注册、VS Code / JetBrains 安装、第一次代码补全和 Chat 体验"
---

## 注册 GitHub Copilot Free

GitHub Copilot 的免费版不需要信用卡，不需要 AWS 账号，只要一个 GitHub 账号就行。

![GitHub Copilot 快速上手](https://img.youtube.com/vi/Fi3AJZZregI/maxresdefault.jpg)

步骤很简单：

1. 打开 [github.com](https://github.com) 并登录（没账号就注册一个，30 秒的事）
2. 进入 Settings → Copilot
3. 选择 **Copilot Free** 计划
4. 同意服务条款，完成

免费版的额度：

| 功能 | 每月额度 |
|------|--------|
| 代码补全（Ghost Text） | 2,000 次 |
| Chat 消息（含 Agent Mode） | 50 条 |
| 支持的 IDE | VS Code, JetBrains, Visual Studio, Neovim, Xcode |

对于学生党和轻度使用者来说，这个额度完全够用。如果用完了，$10/月的 Pro 版补全无限、Chat 额度大幅提升。

## VS Code 安装（推荐）

VS Code 是 Copilot 体验最好的 IDE，所有新功能都是 VS Code 先上。

```bash
# 确认 VS Code 版本 >= 1.85.0
code --version
```

安装步骤：

1. 打开 VS Code
2. 左侧 Extensions 栏搜索 **"GitHub Copilot"**（发布者：GitHub）
3. 点 Install——这会同时安装 Copilot 和 Copilot Chat 两个扩展
4. 安装完成后，左下角出现 Copilot 图标
5. 点击图标 → Sign in to GitHub → 浏览器弹出授权页面 → 确认
6. 回到 VS Code，状态栏显示 Copilot 图标 ✓

验证安装成功——新建一个 `test.py` 文件，输入：

```python
# 计算斐波那契数列第 n 项
def fibonacci(n):
```

按下 Enter，你会看到灰色的 Ghost Text 自动出现了完整的函数实现。按 **Tab** 接受，按 **Esc** 拒绝。

## JetBrains 安装

IntelliJ IDEA、PyCharm、WebStorm、GoLand 等全家桶都支持。

1. 打开 IDE → Settings → Plugins → Marketplace
2. 搜索 **"GitHub Copilot"**
3. Install → 重启 IDE
4. 右下角出现 Copilot 图标 → 点击登录 GitHub
5. 授权完成后即可使用

最低版本要求：**2024.3** 及以上。如果你的 JetBrains IDE 版本太旧，先升级。

## 第一次使用：三个核心操作

### 1. 代码补全（Ghost Text）

打开任何代码文件，正常写代码。Copilot 会在你输入时自动弹出灰色建议：

```javascript
// 创建一个 Express 服务器，监听 3000 端口
const express = require('express');
const app = express();

// Copilot 会自动建议下面的代码 ↓
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

快捷键速记：

| 操作 | Mac | Windows/Linux |
|------|-----|---------------|
| 接受建议 | `Tab` | `Tab` |
| 拒绝建议 | `Esc` | `Esc` |
| 逐词接受 | `⌘ →` | `Ctrl →` |
| 下一个建议 | `⌥ ]` | `Alt ]` |
| 上一个建议 | `⌥ [` | `Alt [` |

### 2. Copilot Chat

按 `Ctrl+Alt+I`（Windows/Linux）或 `⌃⌘I`（Mac）打开 Chat 面板。你可以直接用自然语言问问题：

- "这段代码是做什么的？"
- "帮我写一个连接 PostgreSQL 的函数"
- "这个报错怎么修？" + 粘贴错误信息

Chat 能看到你当前打开的文件，所以它的回答是有上下文的。

### 3. Inline Chat

选中一段代码，按 `Ctrl+I`（Windows/Linux）或 `⌘I`（Mac），会在代码上方弹出一个小输入框。输入指令，比如：

- "加上错误处理"
- "改成 async/await 写法"
- "优化性能"

修改会以 diff 形式展示（绿色新增、红色删除），按 Enter 接受，Esc 拒绝。这是最高效的代码修改方式——不用切换到聊天窗口，直接在代码上改。

## 第一个实战：用 Chat 搭个小项目

试试在 Chat 里输入：

```
帮我用 Node.js + Express 创建一个简单的 TODO API，
要有增删改查四个接口，数据存在内存里就行
```

Copilot 会生成完整的代码。复制到文件里，跑一下：

```bash
npm init -y && npm install express
node app.js
```

从注册到跑起来第一个项目，整个过程不超过 10 分钟。
