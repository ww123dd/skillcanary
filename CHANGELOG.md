# Changelog

## 0.18.0

- External regression set grown to 30 cases (46 -> 56 benchmark cases): five more advisories with the fixed version read from the OSV record - glob-parent 5.1.2, minimatch 3.0.5, ini 1.3.6, y18n 3.2.2, hosted-git-info 2.8.9 - each paired (before = must block, after = must pass).
- The generic `npm-advisory` rule carried all five without a checker change, which is the point of keeping advisory data in the case rather than in the code.

## 0.17.0

- `hook install` no longer takes the PreToolUse slot by default: it wires the collection events (SessionStart, Stop, SessionEnd) and leaves the guard slot alone. `--with-pre-tool` opts in, and re-wiring replaces the previous SkillCanary entries instead of appending duplicates.
- The PreToolUse allow path is now silent: a matched rule prints a decision, everything else prints nothing, so SkillCanary cannot compete with another guard on the same event or feed a host an unexpected allow shape.
- `hook verify` verifies the events that are actually wired and reports PreToolUse as optional instead of failing; the host write is atomic (temp file + rename) after the backup.

## 0.16.0

- External regression set grown to 20 cases (36 -> 46 benchmark cases): five more published advisories with the fixed versions read from the OSV record rather than copied by hand - node-fetch 2.6.1, json5 2.2.2, semver 7.5.2, tough-cookie 4.1.3, cross-spawn 7.0.5 - each paired (before = must block, after = must pass).
- `external-rules.js` gained a generic `npm-advisory` rule that takes the package and the fixed version from the case, so the checker holds no hand-copied advisory data.

## 0.15.0

- Started the externally sourced regression set: ten cases across five upstream changes, each citing a public source and each paired (before = must block, after = must pass): GitHub Actions Node16-era pins, the deprecated artifact action v3, Node 18 end of life (nodejs.org release schedule), and two published advisories with their fixed versions taken from OSV (lodash 4.17.21, minimist 1.2.6).
- `benchmarks/real/checks/external-rules.js` implements those rules against fixtures under `benchmarks/real/fixtures/external/`, and the README benchmark count is now enforced at 36.

## 0.14.0

- Added `skillcanary decision record`: it writes a `skillcanary/decision/v1` row (with reward vector and evidence hashes) from a real action. `--quote` is required and stored, so the tool can never invent the operator decision; without the words nothing is recorded.
- `doctor` policy stops reporting "no decision history yet" once real decisions exist.

## 0.13.0

- Added `skillcanary workflow import <session.jsonl>`: it reads a real agent session, extracts the tool calls and writes `.skillcanary/workflow.json` in the shape the execution-mode audit consumes. Only tool names, risk classification and a sha256 of each input are written - raw commands and message text never leave the session file.
- With a real workflow present, `doctor` execution-mode stops reporting "no workflow audit configured" and audits the modes actually recommended for those steps.

## 0.12.0

- Added `skillcanary hook verify`: it fires each event through the command string the host configuration actually stores, then confirms the collector received a new outcome row. Structure is not proof - this is the live check, and it names `hook install --write` when something is missing.

## 0.11.0

- `selfcheck --write` now also writes `.skillcanary/trace.json`, derived from the runs that actually happened: the plan is the check list, the spans carry the real exit codes and durations, retries only appear when a check failed in one trial and passed in a later one, and completion is per check. `trajectory analyze` and the doctor trajectory check therefore read facts produced here instead of a fixture.

## 0.10.0

- `selfcheck --trials N` runs this repository own verifications N times and writes `.skillcanary/trials.jsonl` from the real runs, so `reliability estimate` and the doctor reliability check work on facts produced here instead of a fixture. `npm run selfcheck:trials` runs three trials; the summary prints the real Pass^k rate.
- `selfcheck --only <check>` runs a single verification, which is what the suite uses to test the recorder without re-entering itself.

## 0.9.3

- Added `skillcanary selfcheck [--write]`: runs this repository own verifications (suite, benchmark validate + real, the three release checks, and a lint pass) and, with `--write`, records each real run as an evidence envelope and an outcome row. `npm run selfcheck` is wired into CI.
- Local collector state (`.skillcanary/`) is now ignored everywhere, so outcomes, evidence and the store never leak into the repository.

## 0.9.2

- Fixed the suite version assertion: it reads `package.json` instead of a literal, so a patch bump cannot break `npm test` on a clean clone.

## 0.9.1

- Added `skillcanary hook install [--host codex|claude] [--write]`: the first action after installing. Dry run by default; `--write` backs the host file up, merges the four events (session start, pre-tool, stop, session end) and creates `.skillcanary/hook-rules.json`. Existing host hooks survive the merge and a second run is a no-op.
- `doctor` gained `hook-wiring`: it reports whether a host actually calls the hook layer - the only automatic collector - and names the exact command when it does not.
- Packaging: `docs/launch/**` and `docs/reading/**` can no longer ship in the tarball (negations in `files` plus a check that inspects `npm pack --dry-run`), and the launch drafts are out of the repository.
- Redacted a literal local path in `docs/writing/a-real-regression.md` so the release privacy scan stays clean.

## 0.9.0

- Added six-dimensional trajectory metrics with independent tool, parameter, utilization, recovery, plan and completion checks.
- Added pass^k reliability estimation, Wilson intervals, cost-per-success, p95 latency and composite step reliability.
- Added deterministic-first grader orchestration with Cohen's kappa calibration.
- Added deterministic/workflow/agent/human execution-mode auditing.
- Added capability/regression golden-set curation.
- Extended adapters with EvalPort, OpenTelemetry, Langfuse and MLflow descriptors plus EvalPort/OTel export.
- Extended doctor with trajectory, reliability and execution-mode status.

## 0.8.0

- Added canonical adapter protocol for runner, security, trace, registry, provenance, MCP and CI artifacts.
- Added `adapter list|detect|import|export|doctor` with SARIF and JUnit export.
- Added Thompson sampling, hybrid policy, reward vectors, Pareto analysis, CUSUM drift detection and deterministic policy simulation.
- Added `active rank` for information-value-based failure candidate selection.
- Added `drift check` for outcome change-point detection.
- Extended `doctor` with adapter registry, drift and policy status.
- Added algorithm, adapter and compatibility documentation.

## 0.7.0

- Repositioned SkillCanary as an agent change control plane.
- Added `doctor` as the unified reliability status and next-action command.
- Added pain-point documentation and refreshed positioning, README and FAQ.
- Added `doctor` to the GitHub Action and example scripts.
- Kept runner adapters, provenance, evidence store, error budget and release preflight in the shipped surface.

## 0.6.0

- Added robust skillgrade, agent-skills-eval and promptfoo artifact adapters, including `import auto`.
- Imported changes now use the modern `target.kind` schema instead of the legacy `target_case` shape.
- Added JSONL-backed `store index`, `store query` and generic SQL export for `eval_run` / `eval_case_score`.
- Added `budget ingest`, `budget stats` and `budget check` with correction, rework and tool-error signals.
- Added `hook doctor` with hard failures for malformed rules and invalid regexes.
- Added executable real-regression benchmark cases and runner.
- Rewrote English and Chinese READMEs around evidence, policy, storage, runtime boundaries and shipped vs planned status.

## 0.5.0

- Added provenance schema and gate --require-provenance with local evidence hash verification.
- Added Evidence Envelope, eval run and eval case score storage contracts.
- Added evidence normalize/record/stats commands.
- Rewrote English and Chinese READMEs around evidence, trust, policy and runtime layers.

## 0.4.0

- Added domain-agnostic decision log and policy engine MVP.
- Added policy record/stats/recommend with a UCB contextual-bandit baseline.
- Added decision schema, policy library and policy-engine documentation.
- Generalized change targets to case | deterministic; deterministic evidence uses COUNT->0.
- Reframed experience capsules as decision records.

## 0.3.0

- Added host-agnostic hook command for session-start, pre-tool, stop and session-end.
- Added runtime-layer documentation and hook examples.
- Added configurable .skillcanary/hook-rules.json example.

## 0.2.0

- Gate now requires cases.json by default; --allow-no-cases is drafting-only.
- Lint severity rebalanced; .skillcanaryignore supports scoped suppression.
- Secret detection skips placeholders, env vars and function signatures.
- Anchor --output supports absolute paths.
- Added scan, advice, promote, armor and track minimum Armor Runtime commands.
- Added advice, armor and outcome schemas.

## 0.1.0

- Initial MVP.
- Added `lint`, `gate`, `anchor`, `mcp-onboard`, `verify` and `init`.
- Added dependency-free CLI, schemas, examples and tests.
