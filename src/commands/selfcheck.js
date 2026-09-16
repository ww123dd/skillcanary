'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { parseArgs, printJson, writeJson } = require('../lib/util');
const reliability = require('../lib/reliability');

// Self-check: run this project's own verifications against itself and record what happened.
//
// The point is not another report. It is that the tool collects its *own* real runs -
// exit codes and output hashes from commands that actually executed - so the collector
// side (outcomes, evidence) fills with facts produced here rather than with fixtures.
//
// Recording is opt-in: without --write nothing is written.

const CHECKS = [
  { id: 'suite', command: ['node', ['tests/run.js']] },
  { id: 'benchmark-validate', command: ['node', ['benchmarks/real/validate.js']] },
  { id: 'benchmark-real', command: ['node', ['benchmarks/real/run.js']] },
  { id: 'check-private-docs', command: ['node', ['benchmarks/real/checks/no-private-docs.js']] },
  { id: 'check-readme-demo', command: ['node', ['benchmarks/real/checks/readme-shows-demo.js']] },
  { id: 'check-readme-benchmark-count', command: ['node', ['benchmarks/real/checks/readme-benchmark-count.js']] },
  { id: 'lint-example', command: ['node', ['bin/skillcanary.js', 'lint', 'examples/basic-skill']] }
];

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

function fingerprint(dir) {
  const pkg = fs.existsSync(path.join(dir, 'package.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) : {};
  return sha256(JSON.stringify({ name: pkg.name || null, version: pkg.version || null }));
}

// The commands always run against this tool itself; --dir only decides where the
// recorded state goes, so a test can point the recorder at a temp directory.
const TOOL_ROOT = path.resolve(__dirname, "..", "..");

function runCheck(dir, check) {
  const started = Date.now();
  const result = spawnSync(check.command[0], check.command[1], { cwd: TOOL_ROOT, encoding: 'utf8', windowsHide: true, timeout: 600000 });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  return {
    id: check.id,
    command: check.command[0] + ' ' + check.command[1].join(' '),
    exit_code: typeof result.status === 'number' ? result.status : 1,
    ok: result.status === 0,
    duration_ms: Date.now() - started,
    stdout_sha256: sha256(stdout),
    stderr_sha256: sha256(stderr),
    stdout_bytes: Buffer.byteLength(stdout),
    tail: stdout.trim().split(/\r?\n/).slice(-1)[0] || stderr.trim().split(/\r?\n/).slice(-1)[0] || ''
  };
}

module.exports = function run(argv) {
  const args = parseArgs(argv);
  const dir = path.resolve(args.dir || '.');
  const write = args.write === true;
  const stamp = new Date().toISOString();
  const skillHash = fingerprint(dir);
  const trials = Math.max(1, Number(args.trials || 1));
  const only = typeof args.only === 'string' ? args.only : null;
  const selected = only ? CHECKS.filter(function (check) { return check.id === only; }) : CHECKS;
  if (!selected.length) { process.stderr.write('unknown check: ' + only + '\n'); return 2; }
  const runs = [];
  const trialRows = [];
  for (let trial = 1; trial <= trials; trial++) {
    for (const check of selected) {
      const row = runCheck(dir, check);
      row.trial_index = trial;
      runs.push(row);
      trialRows.push({
        task_id: check.id,
        trial_index: trial,
        pass: row.ok,
        cost: 0,
        latency_ms: row.duration_ms,
        security_violations: 0,
        metadata: { command: row.command, exit_code: row.exit_code, stdout_sha256: row.stdout_sha256 }
      });
    }
  }
  const failed = runs.filter(function (row) { return !row.ok; });
  const report = {
    schema_version: 'skillcanary/selfcheck/v1',
    generated_at: stamp,
    dir: dir,
    tool_root: TOOL_ROOT,
    skill: 'skillcanary-selfcheck',
    skill_hash: skillHash,
    runs: runs,
    trials: trials,
    reliability: reliability.reliabilityFromTrials(trialRows, trials),
    passed: runs.length - failed.length,
    failed: failed.length,
    recorded: false
  };

  if (write) {
    const stateDir = path.join(dir, '.skillcanary');
    fs.mkdirSync(stateDir, { recursive: true });
    const selfcheckFile = path.join(stateDir, 'selfcheck.json');
    writeJson(selfcheckFile, report);
    const artifactSha = sha256(JSON.stringify(report));

    const evidenceFile = path.join(stateDir, 'evidence.jsonl');
    const outcomesFile = path.join(stateDir, 'outcomes.jsonl');
    const evidenceRows = [];
    const outcomeRows = [];
    for (const row of runs) {
      evidenceRows.push({
        schema_version: 'skillcanary/evidence/v1',
        run_id: 'selfcheck-' + row.id + '-' + stamp.replace(/[-:TZ.]/g, '').slice(0, 14),
        skill: report.skill,
        skill_hash: skillHash,
        engine: 'node',
        model: 'none',
        case_id: row.id,
        kind: 'deterministic',
        check: row.command,
        count_before: 0,
        count_after: row.ok ? 0 : 1,
        evidence: row.stdout_sha256,
        observed_at: stamp,
        verification: { verified_by: 'exit-code', oracle: row.command, result: row.ok ? 'pass' : 'fail' },
        artifacts: [{ path: '.skillcanary/selfcheck.json', sha256: artifactSha }]
      });
      outcomeRows.push({
        session_id: 'selfcheck-' + row.id,
        skill: report.skill,
        skill_hash: skillHash,
        observed_at: stamp,
        signals: { completed: row.ok, failures: row.ok ? 0 : 1, exit_code: row.exit_code, duration_ms: row.duration_ms }
      });
    }
    fs.appendFileSync(evidenceFile, evidenceRows.map(function (row) { return JSON.stringify(row); }).join('\n') + '\n', 'utf8');
    fs.appendFileSync(outcomesFile, outcomeRows.map(function (row) { return JSON.stringify(row); }).join('\n') + '\n', 'utf8');
    const trialsFile = path.join(stateDir, 'trials.jsonl');
    fs.writeFileSync(trialsFile, trialRows.map(function (row) { return JSON.stringify(row); }).join('\n') + '\n', 'utf8');
    report.recorded_to = { selfcheck: selfcheckFile, evidence: evidenceFile, outcomes: outcomesFile, trials: trialsFile };
    report.recorded = true;
  }

  if (args.json) printJson(report);
  else {
    process.stdout.write('SkillCanary selfcheck @ ' + dir + (write ? ' (recorded)' : ' (read only)') + '\n');
    for (const row of runs) process.stdout.write('  ' + (row.ok ? 'o ' : 'x ') + row.id.padEnd(28) + ' exit=' + row.exit_code + '  ' + row.duration_ms + 'ms  ' + row.tail.slice(0, 70) + '\n');
    process.stdout.write('  Result: ' + report.passed + '/' + runs.length + ' passed over ' + trials + ' trial(s)' + (write ? ' - recorded to .skillcanary/{selfcheck.json,evidence.jsonl,outcomes.jsonl,trials.jsonl}' : ' - add --write to record') + '\n');
    if (trials > 1) {
      const unstable = report.reliability.task_rows.filter(function (task) { return task.pass_power_k !== 1; });
      const rate = report.reliability.pass_power_k;
      process.stdout.write('  Pass^' + trials + ': ' + (rate * 100).toFixed(0) + '% of ' + report.reliability.tasks + ' task(s)' + (unstable.length ? ' (unstable: ' + unstable.map(function (task) { return task.task_id; }).join(', ') + ')' : '') + '\n');
    }
  }
  return failed.length ? 1 : 0;
};

module.exports.CHECKS = CHECKS;