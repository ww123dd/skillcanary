# SkillCanary

**Agent / Skill 的错题本：每一次改动都要结账 —— 要么这道题真的关掉了，要么不许合。**
**The mistake book for agent skills: every change settles a case, or it does not land.**

同一个失败会换一个新名字回来。你改了一条规则，CI 绿了，PR 合了；三天后它又出现 —— 这次你分不清：是规则从一开始就没生效，是模型换了，还是上次那次「修好了」本来就只是碰巧。

SkillCanary 给 agent / skill 的每一次自进化建一本错题本：

```text
真实失败  →  抄成 case  →  门禁判分  →  记录结果  →  下一步该改哪
            (可测的转变)   (证据+哈希)   (state/action/outcome)
```

- **抄题** —— 真实失败必须先变成 case 或确定性目标，才允许动 skill；没有题目，就没有资格改。
- **判分** —— 改动要在同一道题上重测：证据带 provenance 和哈希，Pass^k 看它稳不稳，而不是看一次运气。
- **防抄答案** —— 隐藏测试、参考答案收起、污点扫描：抄答案式通过不算通过。
- **记账** —— 纠正 / 返工 / 工具错误三笔预算；债超了就停手，而不是继续加规则。
- **复习** —— state / action / outcome 进历史，policy 告诉你下一步该改哪，而不是从记忆重建。

它不评模型，也不当 runner、扫描器或注册表 —— 那些工具回答「能不能跑」「安不安全」「怎么分发」。它只回答一句：

> **这次改动，是真的把这道题做对了，还是只是把答案改得像对的？**

它不声称「这个 skill 普遍更好了」—— 那种话没有外部事实可以重算。它只证明：**这道题关掉了，别的题没有因此变坏。**

30 秒看到结论：

```bash
git clone https://gitee.com/review-for-qing-lazy/skillcanary
cd skillcanary && node bin/skillcanary.js doctor examples/basic-skill
```

---

**The mistake book for agent skills: every change settles a case, or it does not land.**

The same failure comes back under a new name. You changed one rule, CI went green, the PR merged; three days later it is back — and you cannot tell whether the rule never worked, the model changed, or last time was luck.

SkillCanary keeps a mistake book for every self-evolution step of an agent or skill:

- **Write the problem down** — a real failure must become a case or a deterministic target before the skill may change.
- **Grade the same problem** — the change is re-tested on that case with provenance and hashes; pass^k says whether it holds up, not whether it was lucky once.
- **Block copying answers** — hidden tests, stashed solutions and taint scanning: passing by copying is not passing.
- **Keep the ledger** — correction, rework and tool-error budgets; when the debt is over budget you stop, instead of adding another rule.
- **Review** — state / action / outcome go into history and policy tells you what to fix next, instead of rebuilding from memory.

It does not rate models and is not a runner, scanner or registry. Those answer *can it run*, *is it safe*, *how do we distribute it*. It answers one thing:

> **Did this change actually solve the case — or did it just make the answer look right?**

It does not claim the skill is now better in general: that has no external fact to recompute. It proves the case is closed and nothing else regressed.

## The pain it targets

| User pain | What SkillCanary does |
|---|---|
| "It drifted again." | Requires a case or deterministic target and a measurable transition. |
| "The tool call failed." | Treats MCP boundaries, fallback, offload and veto mapping as first-class checks. |
| "I cannot prove the change helped." | Stores before/after evidence and verifies provenance and hashes. |
| "The same failure keeps coming back." | Converts incidents into advice candidates and executable regressions. |
| "We keep adding rules forever." | Measures correction, rework and tool-error budgets and stops the loop. |
| "I do not know what to fix next." | Records state/action/outcome and recommends the next action. |

## Quick start

```bash
skillcanary doctor ./skills/my-skill
```

`doctor` is the single entry point. It reports the current skill, hook, evidence and error-budget state and gives the next action.

Full loop:

```bash
skillcanary init . --with-action
skillcanary import auto runner-result.json --case c01 --skill my-skill --output .skillcanary/change.json
skillcanary gate .skillcanary/change.json .skillcanary/cases.json --require-provenance
skillcanary anchor ./skills/my-skill --check
skillcanary hook doctor
skillcanary release preflight
```

Store evidence:

```bash
skillcanary evidence normalize raw-result.json --output evidence.json
skillcanary evidence record evidence.json --log .skillcanary/evidence.jsonl
skillcanary store index --input .skillcanary/evidence.jsonl --dir .skillcanary/store
skillcanary store query --dir .skillcanary/store --verdict FAIL->PASS --json
```

Track whether the change helped:

```bash
skillcanary budget ingest sessions.json --output .skillcanary/outcomes.jsonl
skillcanary budget check --input .skillcanary/outcomes.jsonl --config .skillcanary/budget.json
```

> Until the first npm release, replace `skillcanary` with `node bin/skillcanary.js`.

## The loop

### 1. Observe

Real sessions and runner artifacts become failure signals. The scanner is local-first and produces advice candidates, not permanent rules.

### 2. Decide

A change must state:

- the target case or deterministic check;
- the expected transition;
- what should be fixed;
- what might regress;
- the repeat budget.

### 3. Gate

`gate` rejects observation-only, held-out, flat, under-repeated or unlinked changes. With `--require-provenance`, it also verifies independent review and evidence-file hashes.

### 4. Store

`eval_run` and `eval_case_score` are materialized as queryable records. A generic SQL export is available for teams that need their own database.

### 5. Learn

Outcome signals feed the error budget and policy engine. The first policy implementation is a UCB contextual bandit. It is deliberately small; it is a baseline for learning which improvement action works for a failure mode.

## Why it is different

| Existing layer | Its job | SkillCanary relationship |
|---|---|---|
| skillgrade / agent-skills-eval / promptfoo | Run and grade evals | Import their artifacts with `import auto` |
| skills-best-practices | Explain how to write a skill | Turn recommendations into executable checks |
| skillwarden / skillguard / skillgate | Security scanning and install policy | Keep security separate; consume results when available |
| SkillSeal | Fingerprints and signatures | Future provenance integration |
| skillrot / SkillDrift | Detect drift | Treat drift as one signal to the gate |
| Registry | Distribute skills | Gate changes before publish |

The differentiator is not another check. It is the closed loop:

> **Observe a real failure. Decide the change. Gate the evidence. Store the outcome. Learn the next move.**

## Commands

| Command | Purpose |
|---|---|
| `doctor [skill]` | Unified reliability status and next action. |
| `init` | Create change, cases, budget and hook examples. |
| `lint` | Validate skill structure, references and portability. |
| `gate` | Enforce targets, evidence, provenance and held-out rules. |
| `anchor` | Hash skill files and detect drift. |
| `mcp-onboard` | Validate MCP boundaries, fallback, offload and veto mapping. |
| `import <runner|auto>` | Convert runner artifacts into changes. |
| `evidence` | Normalize, append and summarize evidence envelopes. |
| `store` | Materialize, query and export eval tables. |
| `budget` | Derive correction, rework and tool-error signals. |
| `scan / advice / promote / armor / track` | Extract candidates and track outcomes. |
| `hook` | Host-neutral session and tool-event adapter. |
| `policy` | Record decisions, run Pareto/drift analysis and compare algorithms. |
| `trajectory` | Compute six-dimensional trajectory metrics. |
| `reliability` | Estimate pass^k, compare trials and compose step reliability. |
| `grader` | Calibrate judges and select grader strategy. |
| `execution` | Audit deterministic/workflow/agent/human modes. |
| `golden` | Curate capability and regression golden sets. |
| `adapter` | Normalize runner, scanner, trace, registry and MCP artifacts. |
| `active rank` | Rank failure candidates by information value. |
| `drift check` | Detect change-point drift in outcomes. |
| `release preflight` | Check metadata, credentials and privacy before publish. |

## Current proof

- 59 deterministic regression cases: 0 false positives, 0 false negatives.
- 21 executable self-regression cases.
- Six-dimensional trajectory metrics, pass^k reliability, calibrated grader routing and execution-mode auditing.
- Canonical adapters for runner, security, trace, registry, provenance, MCP and EvalPort artifacts; SARIF, JUnit, EvalPort and OTel export.
- Safe policy lab with greedy, UCB, Thompson, hybrid, Pareto and CUSUM drift analysis.
- Provenance gate implemented with SHA-256 evidence verification.
- Evidence store implemented with JSONL materialization and SQL export.
- Error budget implemented.
- Hook doctor implemented.
- Privacy and release preflight implemented.
- English and Chinese documentation shipped.

This is an alpha. The hosted dashboard, cross-repository meta-learning and signed artifacts are planned, not shipped.

## Algorithm lab

The policy engine now supports:

- greedy, UCB, Thompson and hybrid policies;
- Beta posterior uncertainty;
- Pareto analysis across fixed, regression, correction, rework, tool-error and cost objectives;
- CUSUM drift detection;
- active case ranking;
- deterministic simulation with fixed seeds.

```bash
skillcanary policy simulate --horizon 100 --seed 7
skillcanary policy pareto --log .skillcanary/decisions.jsonl
skillcanary policy drift --log .skillcanary/decisions.jsonl
skillcanary active rank .skillcanary/advice.jsonl --top 10
skillcanary drift check .skillcanary/outcomes.jsonl
```

## Adapter control plane

SkillCanary does not need to re-implement every runner or scanner. Adapters normalize external artifacts into canonical envelopes:

```bash
skillcanary adapter list
skillcanary adapter detect result.json
skillcanary adapter import security result.json --output risk.json
skillcanary adapter export result.json --format sarif --output result.sarif
skillcanary adapter doctor
```

The core manages evidence contracts, gates, storage and policy. The adapter owns vendor-specific translation.

## Install from source

```bash
git clone <your-fork-or-repo>
cd skillcanary
node bin/skillcanary.js doctor examples/basic-skill
npm test
npm run benchmark
npm run benchmark:real
```

## Documentation

- [Positioning](docs/positioning.md)
- [Competitive landscape](docs/competitive-landscape.md)
- [Pain points](docs/pain-points.md)
- [Evidence model](docs/evidence-model.md)
- [Evidence storage](docs/evidence-storage.md)
- [Error budget](docs/error-budget.md)
- [Policy engine](docs/policy-engine.md)
- [Algorithms](docs/algorithms.md)
- [Adapter protocol](docs/adapters.md)
- [Compatibility](docs/compatibility.md)
- [Trajectory metrics](docs/trajectory-metrics.md)
- [Reliability](docs/reliability.md)
- [Grader orchestrator](docs/grader-orchestrator.md)
- [Execution modes](docs/execution-modes.md)
- [Golden set](docs/golden-set.md)
- [Runtime layers](docs/architecture/runtime-layers.md)
- [Integrations](docs/integrations/README.md)
- [Threat model](docs/threat-model.md)
- [Non-goals](docs/non-goals.md)

## Safety and privacy

- Session scanning is local-first.
- Raw sessions must not be committed to a public repository.
- Public repositories must not contain internal paths, credentials, business terms or user transcripts.
- High-risk actions require human approval.
- Blocking promotion requires deterministic evidence and a must-fail canary.
- Hook rules are local policy, not a sandbox.
- The error budget is a stop signal to collect new incidents, not a reason to add more rules.

## Status

`skillcanary@0.9.0` - Alpha, dependency-free, cross-platform.

Agent execution is delegated to runners such as `skillgrade`, `agent-skills-eval`, `promptfoo` or your own harness.

## License

MIT
