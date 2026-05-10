---
title: "微调 vs 评估：怎么知道你的 AI 产品到底好不好"
wiki: "ai-engineer"
order: 6
description: "Fine-tune 什么时候真的需要 + 怎么搭 LLM eval 体系（LLM-as-a-judge / golden set / regression test）"
---

## "AI 工程师不是炼丹师"

很多人以为做 AI 工程师就是 fine-tune 模型。**99% 场景你不需要 fine-tune**。

理由：

- Fine-tune 一次几千刀（OpenAI / Anthropic 都开了 fine-tune API，但贵）
- 改数据要重训
- 不容易回滚
- 把推理成本拉高（用 fine-tuned 模型 token price > 通用模型）
- 大概率被一个新版本基础模型反超（GPT-4 fine-tune 投入很大的项目，GPT-5 一出全废）

**先用 RAG + Prompt Engineering 把效果做到 80%，剩下 20% 真的需要再考虑 fine-tune。** 而 80% 通常已经够用。

## 什么时候真的需要 Fine-tuning

只有满足以下**任一**才考虑：

### ① 风格 / 格式要求极严

法律文书、医疗报告、品牌一致的客服回复——必须每次都用某种特定格式 + 行话。Prompt 里写"请用 XX 格式"模型只能学个大概，fine-tune 才能稳定。

### ② 调用 latency 要 < 200ms

聊天产品要"打字一样的速度"出回复。Sonnet 已经几百毫秒，要更快只有：

1. 用 Haiku（但能力降一档）
2. Fine-tune Haiku 让它在你的特定任务上表现接近 Sonnet
3. 自己部署小开源模型（Llama 3.3 8B fine-tune）

### ③ 强 domain knowledge 必须 baked-in

医学影像描述、法律条款解析、特定行业 jargon——这些不在通用训练数据里，RAG 又没办法 "教会" 模型术语。**这种场景 fine-tune 真的有用**。

### ④ Privacy 不能调云端 API

客户数据不能出公司。本地部署 Llama / Qwen，再 fine-tune 适配业务。澳洲很多保险 / 医疗客户走这条路。

### Fine-tune 不解决的问题（别幻想）

- ❌ "模型不知道我公司新闻" → 用 RAG，fine-tune 不解决实时性
- ❌ "幻觉太多" → fine-tune 反而可能加剧（数据有 bias 时）
- ❌ "回答不准" → 通常是 prompt / RAG 检索的问题，不是模型能力问题

## Fine-tune 实操

如果你确定要做：

### Step 1：准备数据

至少 100 条标注数据起步（OpenAI 推荐 50-100，匠人实践 200+ 才稳定）。每条 JSONL 格式：

```jsonl
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"理想回复"}]}
```

**数据质量 >>> 数据数量**。100 条精挑细选 > 5000 条噪声大的。

### Step 2：起 fine-tune job

```python
import openai
client = openai.OpenAI()

file = client.files.create(file=open('train.jsonl', 'rb'), purpose='fine-tune')

job = client.fine_tuning.jobs.create(
    training_file=file.id,
    model='gpt-5-mini',
    hyperparameters={'n_epochs': 3}
)

# 等几小时～几天
print(job.fine_tuned_model)  # ft:gpt-5-mini:my-org::abc123
```

### Step 3：用 fine-tuned model

```python
client.chat.completions.create(
    model='ft:gpt-5-mini:my-org::abc123',
    messages=[...]
)
```

价格通常是 base model 的 2-3 倍（GPT-5 mini fine-tune ≈ $1.5/1M input vs 原 $0.5）。

### 开源路径（本地 fine-tune）

如果数据敏感不能上云，用 Hugging Face / Unsloth 在本地 fine-tune Llama 3.3 8B 或 Qwen 2.5 7B：

- **GPU 需求**：单张 A100 80G 可以跑 Llama 3.3 8B QLoRA
- **训练时间**：5K 样本约 4-8 小时
- **推理部署**：vLLM 起服务，单机 4×H100 跑 Llama 70B QLoRA fine-tuned

匠人 [LLM Lab](https://jiangren.com.au/learn/llm-engineer-handbook) 有完整本地 fine-tune 教程。

## Eval 体系：AI 产品的"测试"

不写测试的代码不能 ship，**不做 eval 的 AI 产品也不能 ship**。但很多团队 ship 了再说——后果就是 prompt 改了一次性能从 90% 掉到 70% 没人发现，用户投诉才知道。

### 为什么 LLM 需要专门的 eval

传统 unit test：input 给定 → output 必须严格相等。

LLM 的 output 是自然语言，**没有单一正确答案**：
- "马尔代夫在哪？" → "印度洋上" / "南亚地区印度洋" / "印度西南方的群岛国家" 都对
- 不能用 `assert output === "印度洋上"`

需要更柔性的判断方法。

### 三档 eval 方法

#### Tier 1：Golden Set + 关键词检查（最便宜）

50-100 个手工挑的 case，每个有"必须包含的关键词" + "禁止出现的关键词"：

```python
{
  "input": "马尔代夫在哪？",
  "must_contain": ["印度洋"],
  "must_not_contain": ["大西洋", "太平洋"]
}
```

跑完检查每个 case 命中率。**这种 eval 适合事实性任务**（QA / 提取 / 分类）。

#### Tier 2：LLM-as-a-Judge（最实用）

用一个**更强的 LLM** 给被测模型的输出打分。Anthropic / OpenAI 自己 paper 都用这个方法。

```python
judge_prompt = """
你是一个公正的评估员。下面是用户问题、参考答案、被测答案。

问题：{question}
参考答案：{reference}
被测答案：{actual}

请按以下维度打 1-5 分：
- 准确性：被测答案和参考答案的事实一致性
- 完整性：被测答案是否包含所有关键信息
- 清晰度：表达是否清楚

只返回 JSON：{"accuracy": int, "completeness": int, "clarity": int}
"""

result = await judge_llm.create({
  model: "claude-opus-4-7",
  system: judge_prompt.format(...),
  ...
})
```

**关键：judge model 要比被测 model 强**。用 Opus 评 Sonnet ✓；用 Sonnet 评 Sonnet 自己 ✗。

LLM-as-a-judge 准确率 80-90%（和人工 inter-rater agreement 差不多）。生产 eval 默认就用这个。

#### Tier 3：人工评审（最准但最贵）

抽样让真人打分。适合：

- 上线前最后一道关
- 对比新旧 prompt 时一锤定音
- 用户反馈"答得不好"的 case 找根因

每个 case ≈ 5-10 min 人工时间。50 个 case 一次评审 1 个工时。

### 工具

| 工具 | 主打 | 价格 |
|------|------|------|
| **Langfuse** | 开源、自托管、track + eval 一站式 | Free / 自部署 |
| **Braintrust** | SaaS、UI 漂亮、CI 集成好 | $39+/月 |
| **OpenAI Evals** | 开源框架、很多内置 eval | Free |
| **DeepEval** | 开源 Python lib | Free |
| **Phoenix (Arize)** | 开源 + 商业版 | Free / 商业 |

**起手推荐 Langfuse**：免费、能 self-host、log 和 eval 一起做。匠人内部用 Langfuse track 所有 LLM 调用 + 跑 daily eval。

### Regression Test：每次改 prompt 必跑

CI 里加一步：每次 prompt 文件改了，自动跑 golden set + LLM-as-judge：

```yaml
# .github/workflows/llm-eval.yml
on:
  pull_request:
    paths:
      - 'src/common/prompts/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run eval
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - name: Comment PR with eval results
        run: # post results to PR
```

匠人内部 prompt 改动必须过 eval baseline 才能 merge。这是把"AI 质量"工程化的关键 lever。

### Eval 不止改 prompt 时跑

生产监控里**每天定时跑 eval**：

- 同样的 50 个 query，每天跑一遍
- 模型升级 / Anthropic 自己改了底层模型 → eval 分数漂移
- 提前发现"还没人投诉但效果偷偷下降"

匠人有一个 daily-eval cron，每天早上 9 点跑，分数低于 baseline 5% 就 page on-call。

## 实战 Eval 例子（匠人简历分析功能）

### 数据

50 条真实简历样本（脱敏 + 标注后人工标准答案）。

### Eval 维度

```python
metrics = {
  "技能提取准确率": "提取的技能列表 vs 真实技能列表（F1）",
  "工作年限误差": "abs(predicted_years - actual_years)",
  "教育背景分类": "exact match",
  "总评质量": "LLM-as-judge 1-5 分"
}
```

### 跑 eval（伪代码）

```python
for case in golden_set:
  output = analyze_resume(case.resume)
  
  metrics["技能提取准确率"].append(f1_score(output.skills, case.expected_skills))
  metrics["工作年限误差"].append(abs(output.years - case.expected_years))
  metrics["教育背景分类"].append(output.education == case.expected_education)
  
  judge_score = await llm_judge(case.expected, output)
  metrics["总评质量"].append(judge_score)

print(aggregate_metrics(metrics))
```

### 结果（真实数据）

| Prompt 版本 | 技能 F1 | 年限 MAE | 教育 acc | 总评（1-5） | Cost/1K calls |
|-------------|---------|----------|----------|-------------|---------------|
| v1.0 (Sonnet, no few-shot) | 0.71 | 1.3 | 0.83 | 3.4 | $4.50 |
| v1.1 (+ 5 few-shot) | 0.85 | 0.8 | 0.91 | 4.1 | $4.80 |
| v1.2 (+ XML output) | 0.89 | 0.7 | 0.94 | 4.2 | $4.80 |
| v2.0 (Haiku, ported) | 0.84 | 0.9 | 0.92 | 4.0 | **$1.20** |

最终上 v2.0：质量略降但成本降到 1/4，性价比最优。**没有 eval 你做不出这种决策**。

## 本章小结

- 99% 场景不要 fine-tune，优先 RAG + Prompt
- 真要 fine-tune：风格严 / 极低 latency / 强 domain / privacy 必本地
- Eval 三档：golden set 关键词 → LLM-as-judge → 人工
- LLM-as-judge 必须用更强的模型评，否则有偏
- prompt 改 / 模型变 / 上线前都跑 regression eval
- 工具默认 Langfuse 自托管，CI 集成跑 eval

下一章讲生产部署：latency / cost / observability / safety 四件套。
