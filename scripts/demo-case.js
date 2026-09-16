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
const badReasons = lines(bad.text, /^\s*[x!]/);
console.log('SkillCanary demo - the same case, twice');
console.log('');
console.log('step 1/3  a change that cannot show what it fixed');
console.log('  $ skillcanary gate examples/change.bad.json examples/cases.json');
badReasons.forEach(function (l) { console.log('  ' + l); });
console.log('  Result: ' + (bad.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + bad.code + ')');
console.log('');
console.log('step 2/3  the same change, with a case and evidence');
console.log('  $ skillcanary gate examples/change.good.json examples/cases.json');
console.log('  Result: ' + (good.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + good.code + ')');
console.log('');
console.log('step 3/3  break the passing change by one field');
console.log('  $ <the same change, with reason shortened>');
lines(broken.text, /^\s*[x!]/).forEach(function (l) { console.log('  ' + l); });
console.log('  Result: ' + (broken.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + broken.code + ')');
console.log('');
if (bad.code === 0 || good.code !== 0 || broken.code === 0) {
  console.error('DEMO BROKEN: expected fail, pass, then fail again.');
  process.exit(1);
}
console.log('The case never changed. The second run passed because the change could prove it; the third failed because it could not.');
console.log('Reproduce: npm run demo:case');
