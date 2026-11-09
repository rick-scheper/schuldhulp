// PROTOTYPE — runs the benchmark core from mc-budget-benchmark.html in Node for a desktop-class baseline.
// Usage: node prototype/mc-budget/node-baseline.mjs
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('./mc-budget-benchmark.html', import.meta.url), 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const { runOnce } = new Function(core + '\nreturn { runOnce };')();
runOnce(300, true); // warm-up
console.log('N\tpaired\tsim ms\tpost ms\tslider ms\trecords MB');
let last;
for (const N of [1000, 5000, 10000]) for (const paired of [false, true]) {
  const r = []; for (let i = 0; i < 3; i++) r.push(runOnce(N, paired));
  const med = k => r.map(x => x[k]).sort((a, b) => a - b)[1];
  console.log([N, paired ? 'y' : 'n', med('sim').toFixed(0), med('post').toFixed(0), med('slider').toFixed(2), r[0].mb.toFixed(1)].join('\t'));
  last = r[0].sanity;
}
console.log(JSON.stringify(last.strat.map(s => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.round(v * 100) / 100])))), 'flip', last.flip);
