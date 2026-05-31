---
title: "Audio Overview 深度玩法：多语言 / 自定义 Prompt / 互动模式"
wiki: "notebooklm-guide"
order: 6
description: "NotebookLM Audio Overview 进阶指南：80+ 语言输出切换、自定义 prompt 框架、4 种播客格式选择、Interactive Mode 实战，彻底榨干这个功能"
---

大多数人用 Audio Overview 的方式是：上传文档、点生成、听完。这只是最基础的用法。这章讲的是如何通过语言设置、自定义 prompt、格式选择和互动模式，让 Audio Overview 产出你真正需要的内容。

![NotebookLM Audio Overview interactive mode](https://img.youtube.com/vi/tWtY9mPjTXs/maxresdefault.jpg)

## 多语言输出：80+ 语言都能出播客

2025 年初 Google 把 Audio Overview 的语言支持扩展到了 80+ 种语言。设置方法有两种：

**方法 1：Google 账号语言偏好**
NotebookLM 会读取你 Google 账号的语言设置作为默认输出语言。如果你的账号语言是中文，生成的 Audio Overview 默认就是中文播客。

**方法 2：生成面板里直接选**
点击 Audio Overview 的生成按钮后，会弹出设置面板，里面有「Language」下拉菜单，可以临时切换。不改账号设置也可以用这个临时覆盖。

```
切换语言的实用场景：

英文资料 → 中文播客：适合把英文论文 / 技术文档变成中文收听材料
中文资料 → 英文播客：适合练英文听力，顺带复习中文内容
混合资料 → 指定语言输出：NotebookLM 会自动跨语言整合信息
```

**重要限制**：Interactive Mode（互动模式）目前只支持英文。如果你想用互动功能实时插入问题，语言必须选英文。这是两个功能独立的，其他语言的普通播客生成完全正常。

## 4 种播客格式

生成面板里可以选 4 种格式，适合不同场景：

| 格式 | 特点 | 适合场景 |
|------|------|---------|
| **Deep Dive** | 两主播深度对话，互问互答 | 吃透一个复杂主题 |
| **Brief** | 精简版概览，控制在几分钟内 | 快速了解，不需要深入 |
| **Critique** | 专家评审视角，挑缺陷 | 审读论文、方案、报告 |
| **Debate** | 两主播持对立观点辩论 | 探讨有争议的话题 |

默认是 Deep Dive。如果你上传的是一篇论文想听批评性点评，选 Critique 比 Deep Dive 更直接。如果只是想快速知道一份文档讲了什么，Brief 省时间。

## 自定义 Prompt：最容易被忽略的功能

生成面板里有一个输入框，标注的是 **"What should the AI hosts focus on in this episode?"**——绝大多数人直接跳过它。

这个 prompt 框能做的事：

### 限定话题范围

```
Focus only on the technical implementation details, 
skip the background introduction. 
Assume the listeners are senior engineers.
```

效果：主播直接跳过前置知识，深入讲实现细节。适合你已经了解背景，只需要技术深度的场景。

### 指定受众和讲解深度

```
Explain the concepts as if talking to a first-year CS student 
who knows Python but has never studied machine learning. 
Use analogies for every technical term introduced.
```

效果：主播会主动类比解释，降低专业壁垒。适合把技术文档变成入门讲解。

### 设定讨论框架

```
Structure the discussion as an expert interview:
- Host A is the domain expert who introduces concepts
- Host B is a skeptical journalist who challenges assumptions  
- End with 3 concrete takeaways the audience can apply today
```

效果：对话结构更清晰，结尾有可操作建议。比默认的随机对话要聚焦得多。

### 强调特定角度

```
Focus the discussion on contradictions and gaps between the different 
sources. One host should actively challenge the other's interpretations. 
Highlight any methodological differences between the studies mentioned.
```

效果：适合你上传了多份观点不同的资料，想让 AI 帮你梳理分歧。

### 完整 prompt 模板

把这几个要素组合起来效果最好：

```
[受众定位] + [结构要求] + [话题重点] + [结尾格式]

示例：
"Target audience: senior product managers with no engineering background.
Start with the business impact, then explain the technical constraints.
Focus specifically on the cost/performance tradeoffs mentioned in the sources.
End with 2-3 questions the audience should ask their engineering teams."
```

**语言提示**：prompt 本身用中文或英文写都行，NotebookLM 会理解。但如果你发现指令没有被准确执行，试试改成英文重新生成——Gemini 对英文指令的理解更可靠。

## Interactive Mode：实时打断主播提问

Interactive Mode 是 2024 年底发布的功能，目前还在逐步开放阶段（Plus 用户有优先访问权）。

**开启方式**：
1. 生成 Audio Overview 时，在格式选择里选 **Interactive**
2. 播放后，左下角出现 **Join** 按钮
3. 点击 Join，等主播发出问题邀请
4. 对着麦克风说出你的问题

**怎么用**：
- 主播讲到你没听懂的概念 → 按 Join，说"能解释一下刚才那个词吗？"
- 想深入某个点 → "刚才说的第二个方法，能展开讲吗？"
- 验证理解 → "我理解的是这样……对吗？"

主播会根据你上传的资料给出针对性回答，然后继续原来的讨论。

```
Interactive Mode 的几个实际限制：
1. 仅英文支持，中文语言下无法使用
2. 你的语音不会被存储（隐私保护）
3. 只有 Deep Dive 格式支持，Brief/Critique/Debate 不支持
4. 问题必须能在你上传的资料里找到依据，超出范围主播会说明
```

**实际体验**：Interactive Mode 适合"主动学习"的场景——边听边思考，遇到问题立刻问。如果只是通勤听，用普通的 Deep Dive 加自定义 prompt 就够了。

## 几个进阶组合技

### 同一文档生成多版本

同一份资料，分别用 Deep Dive + 无 prompt 和 Critique + 专业视角 prompt 各生成一次。两个版本听下来，对同一份资料的理解会比只听一遍深得多。

### 播客准备工作流

上传一份要在会议上讲的 PDF，用这个 prompt：

```
"Anticipate the 5 hardest questions the audience might ask about this content. 
For each question, have one host ask it and the other answer it thoroughly."
```

听完之后你对可能被追问的问题就有准备了。

### 多来源交叉验证

上传几篇观点相左的技术文章，用 Debate 格式 + 以下 prompt：

```
"Each host should represent one school of thought from the sources. 
Cite specific passages when making arguments. 
Don't reach a forced consensus at the end."
```

比自己逐篇读再对比省力很多。

### 语言学习用途

把英文教材加进笔记本，Output Language 选中文生成播客，听 AI 用中文讲解英文资料内容。反过来也行——中文资料 + 英文输出，当精听材料用。

## 生成质量的几个影响因素

实际用下来，Audio Overview 质量受这些因素影响比较明显：

**来源质量**：PDF 扫描件（图片格式）、截图 → 效果差。清晰文字 PDF、Google Doc、网页 URL → 效果好。

**来源数量**：1-5 份来源通常比 20+ 份质量更好。来源太多时主播讲得宽但浅，来源精准时讲得有深度。

**Prompt 精确度**：模糊 prompt 比没有 prompt 好不了多少。越具体（受众、结构、话题范围、结尾格式）效果越明显。

**格式匹配**：论文/报告 → Critique 效果比 Deep Dive 好；有争议的话题 → Debate 比 Brief 信息量大。

最快的反馈循环是：生成一个，听两分钟看方向对不对，如果不对调整 prompt 重新生成，重新生成只需要几分钟。不用一次等到最完美的 prompt，迭代调整比反复纠结快得多。
