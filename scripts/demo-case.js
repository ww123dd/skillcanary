'use strict';
// One-command reproduction of the core claim: the same case fails, then passes.
// This demo asserts the flip. If it ever stops flipping, the demo fails too.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const repo = path.resolve(__dirname, '..');
const cli = path.join(repo, 'bin', 'skillcanary.js');
function gate(file) {
  const r = spawnSync(process.execPath, [cli, 'gate', file, 'examples/cases.json'], { cwd: repo, encoding: 'utf8' });
  return { code: r.status, text: ((r.stdout || '') + (r.stderr || '')).trim() };
}
function lines(text, keep) {
  return text.split(/\r?\n/).filter(function (l) { return keep.test(l); }).map(function (l) { return l.trim(); });
}
const bad = gate('examples/change.bad.json');
const good = gate('examples/change.good.json');
const brokenFile = path.join(os.tmpdir(), 'skillcanary-demo-broken.json');
const brokenChange = JSON.parse(fs.readFileSync(path.join(repo, 'examples/change.good.json'), 'utf8'));
brokenChange.reason = 'too short';
fs.writeFileSync(brokenFile, JSON.stringify(brokenChange, null, 2), 'utf8');
const broken = gate(brokenFile);
fs.unlinkSync(brokenFile);
const tmpSkill = path.join(os.tmpdir(), 'skillcanary-demo-skill-' + Date.now());
fs.cpSync(path.join(repo, 'examples/basic-skill'), tmpSkill, { recursive: true });
fs.appendFileSync(path.join(tmpSkill, 'references/guide.md'), 'changed');
const drift = spawnSync(process.execPath, [cli, 'anchor', tmpSkill, '--check'], { cwd: repo, encoding: 'utf8' });
const driftText = ((drift.stdout || '') + (drift.stderr || '')).trim();
const badReasons = lines(bad.text, /^\s*[x!]/);
console.log('SkillCanary demo - one case, one skill, four runs');
console.log('');
console.log('step 1/4  a change that cannot show what it fixed');
console.log('  $ skillcanary gate examples/change.bad.json examples/cases.json');
badReasons.forEach(function (l) { console.log('  ' + l); });
console.log('  Result: ' + (bad.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + bad.code + ')');
console.log('');
console.log('step 2/4  the same change, with a case and evidence');
console.log('  $ skillcanary gate examples/change.good.json examples/cases.json');
console.log('  Result: ' + (good.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + good.code + ')');
console.log('');
console.log('step 3/4  break the passing change by one field');
console.log('  $ <the same change, with reason shortened>');
lines(broken.text, /^\s*[x!]/).forEach(function (l) { console.log('  ' + l); });
console.log('  Result: ' + (broken.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + broken.code + ')');
console.log('');
console.log('step 4/4  change one reference file of the skill itself');
console.log('  $ skillcanary anchor <skill> --check');
lines(driftText, /^\s*[x!]/).forEach(function (l) { console.log('  ' + l); });
console.log('  Result: ' + (/DRIFT/.test(driftText) ? 'DRIFT' : 'IN_SYNC') + ' (exit ' + drift.code + ')');
console.log('');
if (bad.code === 0 || good.code !== 0 || broken.code === 0 || drift.code === 0) {
  console.error('DEMO BROKEN: expected fail, pass, fail again, and drift.');
  process.exit(1);
}
console.log('The case never changed. The change passed only while it could prove what it fixed, and the skill only stayed in sync while its files did.');
console.log('Reproduce: npm run demo:case');
