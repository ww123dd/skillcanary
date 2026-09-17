'use strict';

const stats = require('../src/lib/stats');
function must(condition, message) { if (!condition) throw new Error(message); }
for (const alpha of [0.01, 0.1, 0.3, 0.34, 1, 2]) {
  for (let i = 0; i < 200; i++) {
    const value = stats.sampleBeta(alpha, 1, stats.makeRng(i + 1));
    must(Number.isFinite(value), 'sampleBeta(' + alpha + ') must be finite, got ' + value);
    must(value >= 0 && value <= 1, 'sampleBeta(' + alpha + ') must stay in [0,1], got ' + value);
  }
}
for (const pair of [[0.01, 0.01], [0.1, 0.3], [0.3, 2], [2, 0.1]]) {
  const value = stats.sampleBeta(pair[0], pair[1], stats.makeRng(7));
  must(Number.isFinite(value) && value >= 0 && value <= 1, 'boundary pair must be finite and in range: ' + pair.join(','));
}
let refused = 0;
for (const pair of [[0, 1], [-1, 1], [1, 0]]) {
  try { stats.sampleBeta(pair[0], pair[1], stats.makeRng(1)); } catch (_) { refused += 1; }
}
must(refused === 3, 'non-positive alpha/beta must be refused');
must(stats.sampleBeta(0.3, 2, stats.makeRng(42)) === stats.sampleBeta(0.3, 2, stats.makeRng(42)), 'same seed must reproduce');
console.log('sampling boundary tests passed: shapes<1 finite, range bounded, invalid parameters refused');