'use strict';
// Regression guard: the launch drafts leaked into the published tarball once, and the
// launch plan leaked into the repository before that. Vigilance is not the fix - this
// check fails if any working note is tracked again, or if any of them would ship.
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..', '..');
const FORBIDDEN = [
  'docs/launch/',
  'docs/reading/',
  'docs/launch-plan.md',
  'docs/launch-checklist.md',
  ' 清单.md'
];

const tracked = spawnSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' });
const trackedHits = String(tracked.stdout || '').split(/\r?\n/).filter(function (file) {
  return FORBIDDEN.some(function (prefix) { return file.indexOf(prefix) === 0 || file.indexOf(prefix) >= 0; });
});
if (trackedHits.length) {
  console.error('private planning document is tracked again:' + String.fromCharCode(10) + trackedHits.join(String.fromCharCode(10)));
  process.exit(1);
}

const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
if (pack.status !== 0) { console.error('npm pack --dry-run failed: ' + String(pack.stderr || pack.stdout).slice(0, 300)); process.exit(1); }
let report = null;
try { report = JSON.parse(String(pack.stdout || '').trim()); } catch (error) { console.error('cannot parse npm pack output: ' + error.message); process.exit(1); }
const files = (report[0] && report[0].files) ? report[0].files.map(function (entry) { return entry.path; }) : [];
const shipped = files.filter(function (file) { return FORBIDDEN.some(function (prefix) { return file.indexOf(prefix) === 0 || file.indexOf(prefix) >= 0; }); });
if (shipped.length) {
  console.error('private planning document would ship in the tarball:' + String.fromCharCode(10) + shipped.join(String.fromCharCode(10)));
  process.exit(1);
}
console.log('no private planning document is tracked or shipped (' + files.length + ' packed files checked)');
