'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseArgs, printJson, readJson } = require('../lib/util');
const policy = require('../lib/policy');

// Record an operator decision mechanically.
//
// The one thing a tool must never invent is "the operator decided". This command keeps
// the decision with the operator (--quote is required, and the words are stored) and
// does the boilerplate: id, reward vector, evidence hashes, decision schema.

function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

module.exports = function run(argv) {
  const args = parseArgs(argv);
  const sub = args._[0] || 'record';
  if (sub !== 'record') { process.stderr.write('Usage: skillcanary decision record [options]\n'); return 2; }

  const quote = typeof args.quote === 'string' ? args.quote.trim() : '';
  if (!args.summary) { process.stderr.write('Usage: skillcanary decision record --summary "<what changed>" --quote "<operator words>" [--action fix] [--target <what>] [--failure-mode <fm>] [--skill <name>] [--evidence <file>] [--log .skillcanary/decisions.jsonl] [--dry-run] [--json]\n'); return 2; }
  if (quote.length < 6) { process.stderr.write('a decision needs the operator own words in --quote; without them nothing is recorded\n'); return 1; }

  const observedAt = new Date().toISOString();
  const evidence = [];
  for (const file of (Array.isArray(args.evidence) ? args.evidence : (args.evidence ? [args.evidence] : []))) {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) { process.stderr.write('evidence not found: ' + file + '\n'); return 1; }
    evidence.push({ path: file, sha256: sha256File(full) });
  }

  const record = {
    schema_version: 'skillcanary/decision/v1',
    id: 'dec-' + sha256(args.summary + ':' + quote + ':' + observedAt).slice(0, 12),
    observed_at: observedAt,
    state: {
      skill: args.skill || 'skillcanary',
      task_context: args['task-context'] || 'operator loop',
      failure_mode: args['failure-mode'] || 'unverified_change'
    },
    action: {
      type: args.action || 'keep',
      target: args.target || args.summary,
      summary: args.summary
    },
    prediction: { expected: args.expected || 'the change holds without new manual steps' },
    outcome: { status: args.outcome || 'pending', evidence: evidence, observed_at: observedAt },
    verification: { verified_by: args['verified-by'] || 'exit-code', result: args.result || 'pass', evidence_ref: evidence.length ? evidence[0].path : null },
    authorization: { by: args.by || 'operator', channel: args.channel || 'codex-chat', quote: quote, recorded_at: observedAt }
  };
  record.reward = policy.computeReward(record);
  record.reward_vector = policy.rewardVector(record);

  if (args['dry-run'] === true) {
    const dry = { ok: true, dry_run: true, would_record: record };
    if (args.json) printJson(dry); else process.stdout.write('decision (dry run, nothing recorded): ' + record.action.summary + '\n  quote "' + quote + '"\n');
    return 0;
  }
  const log = path.resolve(args.log || path.join('.skillcanary', 'decisions.jsonl'));
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.appendFileSync(log, JSON.stringify(record) + '\n', 'utf8');
  const report = { schema_version: 'skillcanary/decision-record/v1', ok: true, record: record, log: log };
  if (args.json) printJson(report);
  else process.stdout.write('recorded ' + record.id + ' (' + record.action.type + ') reward=' + record.reward + '\n  log   ' + log + '\n  quote "' + quote + '"\n');
  return 0;
};

module.exports.sha256File = sha256File;