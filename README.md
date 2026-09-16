# SkillCanary

**规则告诉你这次这么改；机制要求你以后每次都还得这么过。SkillCanary 做的是后者。**

同一个问题会换个样子回来。你把这次的答案写成一条规则，下次它换个形态，那条规则就不管用了。更麻烦的是规则没有判据：没人说得清哪条真的在起作用，于是没人敢删，只增不减，最后谁都不敢动。

机制不一样。它把失败变成一道题，让以后的每次改动都回来重考；这道题是可测的，判分靠能从外部重新算出来的事实，不靠谁的一句说明。

所以它对每一次改动只问四句：

1. **你在回答哪道题？** 答不上来，这就不是修复，只是一次编辑。
2. **改之前，它是坏的吗？证据在哪？** 没有 baseline，你分不清「修好了」和「本来就没坏」。
3. **改之后，是同一道题、同一套判据、重新跑出来的吗？别的题有没有被弄坏？** 换题、换判据、只跑一次，三个里踩中任何一个，这次通过都不算数。
4. **三个月后这个结论还算数吗？** 判据漂了（用例改了、runner 换了、契约变了），旧结论就得作废，否则就是拿过期的事实给自己盖章。

四句都过了，才算这次改动有用；四句下来什么都没暴露，那这次改动大概率只是净增复杂度。它不评模型，也不管你怎么跑——算不出来的事实，就不算通过。它也不会说「这个 skill 变好了」，只会说这道题关掉了、别的题没被弄坏。

30 秒看它怎么问：

```bash
git clone https://gitee.com/review-for-qing-lazy/skillcanary
cd skillcanary && node bin/skillcanary.js doctor examples/basic-skill
```

最后一句也写在这儿：机制自己也会腐化。如果一条机制的维护成本已经高过它挡下的问题，它该退役，而不是继续加补丁。

---

A rule tells you how to change it this time. A mechanism says you still have to pass this next time — and makes that pass/fail externally recomputable.

The same failure comes back in a different shape, so a rule written for the old shape stops working. Worse, rules carry no verdict: nobody can tell which one is doing the work, so nobody dares delete one, and the list only grows.

SkillCanary turns a failure into a case instead, and asks four questions of every change: which case does this answer; was the case failing before, and where is that evidence; does it pass the same case under the same criteria on a re-run, without breaking the others; and will that conclusion still hold when the criteria drift? Pass all four and the change counts. It does not rate models or run them, and it will not claim the skill got better in general — only that this case closed and nothing else regressed.

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
