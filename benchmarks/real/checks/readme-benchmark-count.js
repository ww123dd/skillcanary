'use strict';
// Documentation as contract: the count printed in the README has to equal the real case count.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'real', 'cases.json'), 'utf8')).cases;
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const match = /current bench: (\d+)/.exec(readme);
if (!match) { console.error('README does not state the benchmark count (expected: current bench: N)'); process.exit(1); }
if (Number(match[1]) !== cases.length) { console.error('README says ' + match[1] + ' cases, the benchmark has ' + cases.length); process.exit(1); }
console.log('README benchmark count matches: ' + cases.length);
