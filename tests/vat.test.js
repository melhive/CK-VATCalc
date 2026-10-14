// Run with: node tests/vat.test.js  (development only; not needed for deployment)
const V = require('../vat.js');
let fail = 0;
function eq(name, a, b) { if (a !== b) { fail++; console.log('FAIL', name, 'got', a, 'expected', b); } else console.log('ok  ', name); }
function calc(s) { const p = V.parseAmount(s); if (p.status !== 'ok') return p.status; const r = V.computeVat(p.centavos); return [V.formatPeso(r.gross), V.formatPeso(r.vat), V.formatPeso(r.net)].join('|'); }

eq('350', calc('350'), '₱350.00|₱37.50|₱312.50');
eq('3,360.00', calc('3,360.00'), '₱3,360.00|₱360.00|₱3,000.00');
eq('1120', calc('1120'), '₱1,120.00|₱120.00|₱1,000.00');
eq('1,120', calc('1,120'), '₱1,120.00|₱120.00|₱1,000.00');
eq('zero', calc('0'), '₱0.00|₱0.00|₱0.00');
eq('empty', calc(''), 'empty');
eq('spaces only', calc('   '), 'empty');
eq('negative', calc('-5'), 'error');
eq('text', calc('abc'), 'error');
eq('1.234,56', calc('1.234,56'), 'error');
eq('1,23', calc('1,23'), 'error');
eq('1.2.3', calc('1.2.3'), 'error');
eq('3 decimals', calc('1.234'), 'error');
eq('dot only', calc('.'), 'error');
eq('.5', calc('.5'), '₱0.50|₱0.05|₱0.45');
eq('350.', calc('350.'), '₱350.00|₱37.50|₱312.50');
eq('peso sign', calc('₱1,120.00'), '₱1,120.00|₱120.00|₱1,000.00');
eq('max', calc('999,999,999.99').split('|')[0], '₱999,999,999.99');
eq('over max', calc('1,000,000,000'), 'error');
eq('e-notation', calc('1e5'), 'error');
eq('Infinity', calc('Infinity'), 'error');
// Reconciliation + half-up rounding sweep
let bad = 0;
for (let g = 0; g <= 200000; g++) {
  const r = V.computeVat(g);
  const exact = g * 12 / 112;
  if (r.vat + r.net !== g || Math.abs(r.vat - exact) > 0.5 + 1e-9 || !Number.isInteger(r.vat)) bad++;
}
eq('reconcile sweep 0..200000 centavos', bad, 0);
eq('0.01', calc('0.01'), '₱0.01|₱0.00|₱0.01');
eq('0.10', calc('0.10'), '₱0.10|₱0.01|₱0.09');
const mx = V.computeVat(V.MAX_CENTAVOS);
eq('max reconcile', mx.vat + mx.net, V.MAX_CENTAVOS);
console.log(fail ? fail + ' FAILED' : 'ALL PASSED');
process.exit(fail ? 1 : 0);
