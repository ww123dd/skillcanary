'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseArgs, printJson, writeJson, readJson } = require('../lib/util');
const execution = require('../lib/execution');

// Import a real agent session into a workflow record, then audit its execution modes.
//
// Privacy: only tool names, risk classification and a hash of each tool input are
// written. Raw inputs and assistant/user text never leave the session file.

const DETERMINISTIC = new Set(['Read', 'Glob', 'Grep', 'NotebookRead']);
const OPEN_ENDED = new Set(['Task', 'Agent', 'Skill']);
const DESTRUCTIVE = /(rm\s+-rf|drop\s+table|truncate\s+table|delete\s+from|git\s+reset\s+--hard|--force\b|format\s+[a-z]:)/i;

function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }

function classify(name, input) {
  const command = input && typeof input.command === 'string' ? input.command : '';
  if (name === 'Bash' || name === 'BashOutput') {
    if (DESTRUCTIVE.test(command)) return { level: 'high', irreversible: true, requires_human: true, branches: ['applied', 'rejected'] };
    return { level: 'medium', branches: ['exit 0', 'nonzero'] };
  }
  if (OPEN_ENDED.has(name)) return { level: 'low', open_ended: true };
  if (DETERMINISTIC.has(name)) return { level: 'low', known_next: true };
  if (name === 'Write' || name === 'Edit' || name === 'NotebookEdit') return { level: 'medium', irreversible: false };
  return { level: 'low' };
}

function toStep(block, index) {
  const name = String(block && block.name || 'unknown');
  const input = (block && block.input) || {};
  const shape = classify(name, input);
  const step = {
    id: String((block && block.id) || ('step-' + index)),
    tool: name,
    risk: shape.level,
    parameters_sha256: sha256(JSON.stringify(input))
  };
  if (shape.known_next) step.known_next = true;
  if (shape.open_ended) step.open_ended = true;
  if (shape.irreversible === true) step.irreversible = true;
  if (shape.requires_human === true) step.requires_human = true;
  if (Array.isArray(shape.branches)) step.branches = shape.branches;
  return step;
}

function extractSteps(text) {
  const steps = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row = null;
    try { row = JSON.parse(line); } catch (_) { continue; }
    const content = row && row.message && row.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block && block.type === 'tool_use') steps.push(toStep(block, steps.length + 1));
    }
  }
  return steps;
}

module.exports = function run(argv) {
  const args = parseArgs(argv);
  const sub = args._[0];
  if (sub !== 'import' || !args._[1]) {
    process.stderr.write('Usage: skillcanary workflow import <session.jsonl> [--host claude|codex|auto] [--output .skillcanary/workflow.json] [--dry-run] [--json]\n');
    return 2;
  }
  const file = path.resolve(args._[1]);
  if (!fs.existsSync(file)) { process.stderr.write('session file not found: ' + file + '\n'); return 1; }
  const text = fs.readFileSync(file, 'utf8');
  const steps = extractSteps(text);
  const workflow = {
    schema_version: 'skillcanary/workflow/v1',
    source: {
      host: args.host || 'auto',
      session_file: path.basename(file),
      session_sha256: sha256(text),
      imported_at: new Date().toISOString(),
      tools_seen: steps.length
    },
    steps: steps
  };
  const audit = execution.auditWorkflow(workflow);
  const recommendations = {};
  for (const step of audit.steps) recommendations[step.recommended_mode] = (recommendations[step.recommended_mode] || 0) + 1;
  const report = { schema_version: 'skillcanary/workflow-import/v1', ok: steps.length > 0, workflow: workflow, audit: audit, recommendations: recommendations, raw_inputs_written: false };

  if (args.dryRun !== true && args['dry-run'] !== true) {
    const out = path.resolve(args.output || path.join('.skillcanary', 'workflow.json'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    writeJson(out, workflow);
    report.output = out;
  }

  if (args.json) printJson(report);
  else {
    process.stdout.write('SkillCanary workflow import @ ' + path.basename(file) + '\n');
    process.stdout.write('  steps            : ' + steps.length + ' tool call(s)\n');
    process.stdout.write('  modes recommended: ' + Object.keys(recommendations).sort().map(function (key) { return key + '=' + recommendations[key]; }).join(' ') + '\n');
    process.stdout.write('  audit issues     : ' + audit.issues.length + '  agent_overuse=' + audit.agent_overuse_score + '\n');
    process.stdout.write('  privacy          : only tool names, risk and input hashes were written\n');
    if (report.output) process.stdout.write('  output           : ' + report.output + '\n');
  }
  return steps.length ? 0 : 1;
};

module.exports.extractSteps = extractSteps;
module.exports.classify = classify;