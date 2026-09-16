#!/usr/bin/env node
'use strict';
// External-rules checker: each rule encodes an upstream change with a public source and
// blocks the local shape that upstream deprecated or that an advisory fixed.
// usage: node checks/external-rules.js --rule <id> --dir <fixture-dir>
const fs = require('fs');
const path = require('path');
const i = process.argv.indexOf('--rule');
const rule = i >= 0 ? process.argv[i + 1] : null;
const d = process.argv.indexOf('--dir');
const dir = path.resolve(d >= 0 ? process.argv[d + 1] : '.');
function block(msg) { process.stderr.write('BLOCK: ' + msg + '\n'); process.exit(1); }
function allow(msg) { process.stdout.write('OK: ' + msg + '\n'); process.exit(0); }
function workflows(root) {
  const base = path.join(root, '.github', 'workflows');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter(function (n) { return /\.ya?ml$/i.test(n); }).map(function (n) { return { name: n, text: fs.readFileSync(path.join(base, n), 'utf8') }; });
}
function deps(root) {
  const f = path.join(root, 'package.json');
  if (!fs.existsSync(f)) return {};
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Object.assign({}, p.dependencies, p.devDependencies, p.optionalDependencies, p.peerDependencies);
}
function versionOf(spec) { const m = String(spec || '').match(/\d+(?:\.\d+)*/); return m ? m[0].split('.').map(Number) : null; }
function lt(a, b) { for (let k = 0; k < Math.max(a.length, b.length); k++) { const x = a[k] || 0, y = b[k] || 0; if (x !== y) return x < y; } return false; }
function scanWorkflows(re) { const hits = []; for (const f of workflows(dir)) { let m; while ((m = re.exec(f.text)) !== null) hits.push(f.name + ': ' + m[0].replace(/uses:\s*/, '')); } return hits; }
if (!rule) block('--rule is required');
if (!fs.existsSync(dir)) block('fixture not found: ' + dir);
const RULES = {
  'gha-node16-deprecated': function () {
    const hits = scanWorkflows(/uses:\s*actions\/(?:checkout|setup-node|cache)@(?:v1|v2|v3)\b/g);
    if (hits.length) block('action pinned to a Node16-era major: ' + hits.join(', '));
    allow('no Node16-era action pins');
  },
  'gha-artifact-v3': function () {
    const hits = scanWorkflows(/uses:\s*actions\/(?:upload-artifact|download-artifact)@v3\b/g);
    if (hits.length) block('deprecated artifact action: ' + hits.join(', '));
    allow('no deprecated artifact action');
  },
  'node-eol': function () {
    const f = path.join(dir, 'package.json');
    if (!fs.existsSync(f)) allow('no package.json');
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    const range = p.engines && p.engines.node;
    if (!range) allow('no engines.node');
    const m = String(range).match(/(\d+)/);
    if (m && Number(m[1]) <= 18) block('engines.node starts at an end-of-life major: ' + range);
    allow('engines.node floor is supported: ' + range);
  },
  'npm-lodash-advisory': function () {
    const spec = deps(dir).lodash;
    if (!spec) allow('lodash is not a dependency');
    const v = versionOf(spec);
    if (v && lt(v, [4, 17, 21])) block('lodash ' + spec + ' predates the advisory fix 4.17.21');
    allow('lodash is at or above the fixed version: ' + spec);
  },
  'npm-minimist-advisory': function () {
    const spec = deps(dir).minimist;
    if (!spec) allow('minimist is not a dependency');
    const v = versionOf(spec);
    if (v && lt(v, [1, 2, 6])) block('minimist ' + spec + ' predates the advisory fix 1.2.6');
    allow('minimist is at or above the fixed version: ' + spec);
  },
  'npm-advisory': function () {
    const pi = process.argv.indexOf('--package');
    const fi = process.argv.indexOf('--fixed');
    const name = pi >= 0 ? process.argv[pi + 1] : null;
    const fixed = fi >= 0 ? process.argv[fi + 1] : null;
    if (!name || !fixed) block('--package and --fixed are required for npm-advisory');
    const spec = deps(dir)[name];
    if (!spec) allow(name + ' is not a dependency');
    const v = versionOf(spec);
    const f = versionOf(fixed);
    if (v && f && lt(v, f)) block(name + ' ' + spec + ' predates the advisory fix ' + fixed);
    allow(name + ' is at or above the advisory fix ' + fixed + ': ' + spec);
  }
};
if (!RULES[rule]) block('unknown rule: ' + rule);
RULES[rule]();