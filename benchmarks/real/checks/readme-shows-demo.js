'use strict';
// Regression guard: the red-to-green demo is what makes a visitor believe the tool.
// If it disappears from the first screen, the front page is back to asking for faith.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const head = fs.readFileSync(path.join(root, 'README.md'), 'utf8').split(/\r?\n/).slice(0, 30).join(String.fromCharCode(10));
const missing = [];
if (head.indexOf('assets/demo.svg') === -1) missing.push('assets/demo.svg');
if (head.indexOf('npm run demo') === -1) missing.push('npm run demo:case');
if (missing.length) { console.error('first screen no longer shows the demo: ' + missing.join(', ')); process.exit(1); }
console.log('first screen still shows the demo');
