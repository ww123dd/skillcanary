'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const repo = path.resolve(__dirname, '..');
const cli = path.join(repo, 'bin', 'skillcanary.js');
function gate(file) {
  const r = spawnSync(process.execPath, [cli, 'gate', file, 'examples/cases.json'], { cwd: repo, encoding: 'utf8' });
  return { code: r.status, text: ((r.stdout || '') + (r.stderr || '')).trim() };
}
function reasons(text) {
  return text.split(/\r?\n/).filter(function (l) { return /^\s*[x!]/.test(l); }).map(function (l) { return l.trim(); });
}
function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
const bad = gate('examples/change.bad.json');
const good = gate('examples/change.good.json');
const os = require('os');
const brokenFile = path.join(os.tmpdir(), 'skillcanary-demo-broken.svg.json');
const brokenChange = JSON.parse(fs.readFileSync(path.join(repo, 'examples/change.good.json'), 'utf8'));
brokenChange.reason = 'too short';
fs.writeFileSync(brokenFile, JSON.stringify(brokenChange, null, 2), 'utf8');
const broken = gate(brokenFile);
fs.unlinkSync(brokenFile);
if (bad.code === 0 || good.code !== 0 || broken.code === 0) { console.error('refusing to render: the demo does not flip red-green-red'); process.exit(1); }
const rows = [];
let y = 96;
function row(text, color, size) { rows.push('<text x="28" y="' + y + '" fill="' + color + '" font-size="' + (size || 16) + '">' + esc(text) + '</text>'); y += 26; }
row('$ skillcanary gate examples/change.bad.json examples/cases.json', '#8b949e', 15);
reasons(bad.text).forEach(function (l) { row(l, '#f85149'); });
row('Result: FAIL (exit ' + bad.code + ')', '#f85149', 17);
y += 18;
row('$ skillcanary gate examples/change.good.json examples/cases.json', '#8b949e', 15);
row('Result: PASS (exit ' + good.code + ')', '#3fb950', 17);
y += 18;
y += 18;
row('$ <the same change, with reason shortened by one field>', '#8b949e', 15);
reasons(broken.text).forEach(function (l) { row(l, '#f85149'); });
row('Result: FAIL (exit ' + broken.code + ')', '#f85149', 17);
y += 18;
row('same case - pass only when the change can prove what it fixed', '#8b949e', 15);
row('Reproduce: npm run demo:case', '#58a6ff', 15);
const height = y + 20;
const out = ['<svg xmlns="http://www.w3.org/2000/svg" width="900" height="' + height + '" viewBox="0 0 900 ' + height + '" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">',
  '  <rect width="900" height="' + height + '" rx="10" fill="#0d1117"/>',
  '  <rect x="0" y="0" width="900" height="34" rx="10" fill="#161b22"/>',
  '  <circle cx="22" cy="17" r="6" fill="#f85149"/><circle cx="42" cy="17" r="6" fill="#d29922"/><circle cx="62" cy="17" r="6" fill="#3fb950"/>',
  '  <text x="84" y="22" fill="#8b949e" font-size="13">SkillCanary - red, then green</text>',
  rows.join(''),
  '</svg>', ''].join('\n');
fs.mkdirSync(path.join(repo, 'assets'), { recursive: true });
fs.writeFileSync(path.join(repo, 'assets', 'demo.svg'), out, 'utf8');
console.log('wrote assets/demo.svg from the real gate output (' + rows.length + ' lines)');
