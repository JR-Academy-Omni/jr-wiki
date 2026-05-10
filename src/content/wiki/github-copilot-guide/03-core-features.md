---
title: "核心功能深度解析：补全、Chat 与 Agent Mode"
wiki: "github-copilot-guide"
order: 3
description: "GitHub Copilot 代码补全原理、Chat 命令大全、Agent Mode 自主编程实战"
---

## 代码补全：不只是自动补全

GitHub Copilot 的代码补全（Ghost Text）是它最基础也最常用的功能。你写代码时，灰色的建议文字会实时出现——从补全一行到生成整个函数，取决于上下文。

![GitHub Copilot Agent Mode](https://images.ctfassets.net/8aevphvgewt8/36rqLbFzJsdRRFHNM4TXIU/afdb59a69ee38661aed3e66f73970ce2/github-copilot-agent-mode.png)

和传统 IDE 的自动补全不同，Copilot 的补全是**语义级**的：

```python
# 传统 IDE 补全：只能补方法名
user.get  →  user.getName()

# Copilot 补全：理解意图，生成逻辑
# 解析 CSV 文件，返回用户列表
def parse_users_from_csv(file_path):
    # Copilot 会生成完整实现 ↓
    import csv
    users = []
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            users.append({
                'name': row['name'],
                'email': row['email'],
                'age': int(row['age'])
            })
    return users
```

提高补全质量的技巧：

1. **写好注释再写代码**——Copilot 读注释理解意图，生成的代码更准
2. **保持相关文件打开**——Copilot 会把打开的 tab 作为上下文
3. **变量名要有意义**——`user_list` 比 `x` 能让 Copilot 给出更准确的建议
4. **禁用冲突插件**——同时装 Copilot + Tabnine + Codeium 会互相打架

## Copilot Chat 命令速查

Chat 面板不只是聊天，它有一套斜杠命令系统，每个命令对应一个专门的 Agent：

| 命令 | 作用 | 例子 |
|------|------|------|
| `/explain` | 解释选中代码 | 选中一段正则表达式 → `/explain` |
| `/fix` | 修复代码问题 | 选中报错代码 → `/fix` |
| `/tests` | 生成单元测试 | 选中函数 → `/tests` |
| `/doc` | 生成文档注释 | 选中类 → `/doc` |
| `/new` | 创建新项目脚手架 | `/new React + TypeScript 项目` |
| `/clear` | 清空当前对话 | 上下文混乱时用 |

上下文引用符号——在 Chat 里用 `@` 来指定上下文范围：

```
@workspace 整个项目结构怎么组织的？
@terminal 这个报错怎么修？
#file:src/utils/auth.ts 这个文件的认证逻辑对吗？
#selection 解释一下我选中的这段代码
```

`@workspace` 特别好用——它让 Copilot 扫描整个项目来回答问题，而不是只看当前文件。

## Agent Mode：自主编程

Agent Mode 是 2025 年 Copilot 最重要的更新。它不再是"你问一句它答一句"，而是让 Copilot 变成一个**自主执行任务的 Agent**——给它一个需求，它自己规划、跨文件修改、跑命令、修 bug，循环迭代直到任务完成。

### 怎么开启

1. 打开 Copilot Chat 面板（`Ctrl+Alt+I`）
2. 顶部模式下拉菜单，选 **Agent**（而不是 Ask 或 Edit）
3. 输入你的任务

### 实战示例

假设你有一个 React 项目，想加一个暗色主题功能。在 Agent Mode 里输入：

```
给这个 React 项目加一个暗色主题切换功能：
- 在 Header 组件加一个切换按钮
- 用 CSS variables 实现主题色
- 用 localStorage 记住用户选择
- 确保所有现有组件都适配
```

Agent 会做这些事：

1. **扫描项目**——找到所有相关的组件文件、CSS 文件、入口文件
2. **制定计划**——列出要修改的文件和步骤
3. **逐步执行**——创建 ThemeContext、修改 CSS、更新组件
4. **跑命令**——执行 `npm run build` 检查是否编译通过
5. **自我修复**——如果 build 报错，自动分析错误并修复
6. **展示结果**——所有改动以 diff 形式展示，等你确认

每一步终端命令都需要你手动确认才会执行，不用担心它偷偷跑了什么危险操作。

### Agent Mode 最佳实践

```markdown
✅ 好的指令：
"把 src/api/ 下所有的 axios 调用改成 fetch，保持错误处理逻辑不变，
改完跑一下 npm test 确认没问题"

❌ 差的指令：
"重构一下代码"（太模糊，Agent 不知道重构什么）
```

关键原则：**需求越明确，Agent 的输出越靠谱**。告诉它要改什么、改成什么样、怎么验证。

## Inline Chat 的高级用法

除了基本的"选中代码 → 按 `Ctrl+I` → 输入指令"，Inline Chat 还有一些高阶玩法：

```typescript
// 选中下面的函数，Ctrl+I 输入 "改成 TypeScript 严格类型"
function processOrder(order) {
  const total = order.items.reduce((sum, item) =>
    sum + item.price * item.quantity, 0);
  return { ...order, total, status: 'processed' };
}

// Copilot 会改成 ↓
interface OrderItem {
  price: number;
  quantity: number;
}

interface Order {
  items: OrderItem[];
  [key: string]: unknown;
}

function processOrder(order: Order): Order & { total: number; status: string } {
  const total = order.items.reduce((sum: number, item: OrderItem) =>
    sum + item.price * item.quantity, 0);
  return { ...order, total, status: 'processed' };
}
```

Inline Chat 的优势是**不中断你的编码流**——改动直接发生在代码所在位置，审完 diff 一键确认，接着写下一段。
