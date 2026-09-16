'use strict';
// Regression guard: the launch plan and checklist leaked into the public repository once.
// They stay local (gitignored, archived outside the repo). This fails if either is tracked again.
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..', '..');
const forbidden = ['docs/launch-plan.md', 'docs/launch-checklist.md'];
const tracked = spawnSync('git', ['-C', root, 'ls-files'].concat(forbidden), { encoding: 'utf8' });
const found = String(tracked.stdout || '').trim();
if (found) { console.error('private planning document is tracked again:' + String.fromCharCode(10) + found); process.exit(1); }
console.log('no private planning document is tracked');
