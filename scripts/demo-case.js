'use strict';
// One-command reproduction of the core claim: the same case fails, then passes.
// This demo asserts the flip. If it ever stops flipping, the demo fails too.
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
const badReasons = lines(bad.text, /^\s*[x!]/);
console.log('SkillCanary demo - the same case, twice');
console.log('');
console.log('step 1/2  a change that cannot show what it fixed');
console.log('  $ skillcanary gate examples/change.bad.json examples/cases.json');
badReasons.forEach(function (l) { console.log('  ' + l); });
console.log('  Result: ' + (bad.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + bad.code + ')');
console.log('');
console.log('step 2/2  the same change, with a case and evidence');
console.log('  $ skillcanary gate examples/change.good.json examples/cases.json');
console.log('  Result: ' + (good.code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + good.code + ')');
console.log('');
if (bad.code === 0 || good.code !== 0) {
  console.error('DEMO BROKEN: expected change.bad.json to fail and change.good.json to pass.');
  process.exit(1);
}
console.log('The only difference is whether the change can prove what it fixed.');
console.log('Reproduce: npm run demo:case');
