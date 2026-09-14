#!/usr/bin/env node
// ============================================================
// run_all.cjs — full autonomous test pass (no supervision needed).
// Runs every suite (regression + step-gated) in sequence, captures
// artifacts per suite, and reports one line per suite + totals.
// Exit codes: 0 = green, 1 = any failure, 2 = crash.
//   node tests/run_all.cjs             # skips are OK (pre-implementation)
//   node tests/run_all.cjs --strict    # skips FAIL (post-implementation)
// Artifacts: tests/artifacts/<timestamp>/<suite>.log
// ============================================================
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');
const ROOT = __dirname;
const SUITES = [
  'tests/regression_trace.cjs',
  'tests/suites/step1_gate_engine.cjs',
  'tests/suites/step2_npc_system.cjs',
  'tests/suites/step3_widget_inventory.cjs',
  'tests/suites/step4_export.cjs',
  'tests/suites/calendar_time.cjs',
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(ROOT, 'artifacts', stamp);
fs.mkdirSync(outDir, { recursive: true });

const results = [];
for (const suite of SUITES) {
  const abs = path.join(ROOT, '..', suite);
  const res = spawnSync('node', [abs], { encoding: 'utf8', timeout: 240000 });
  const out = (res.stdout || '') + (res.stderr || '');
  fs.writeFileSync(path.join(outDir, path.basename(suite) + '.log'), out);

  const skipped = /SKIP —/.test(out);
  const passed = res.status === 0;
  const failed = res.status !== 0;
  // --strict: a skip is a failure (post-implementation gate)
  const countsAsFailure = failed || (STRICT && skipped);
  results.push({
    suite: path.basename(suite),
    status: failed ? 'FAIL' : skipped ? 'SKIP' : 'PASS',
    strictFail: STRICT && skipped,
    exit: res.status,
    lines: out.trim().split('\n').filter(l => /^(PASS|FAIL|SKIP)/.test(l)).length,
  });
}

console.log('\n================ RUN_ALL SUMMARY ================');
for (const r of results) {
  const tag = r.strictFail ? 'FAIL (skip in --strict)' : r.status;
  console.log(`${r.status.padEnd(5)}  ${r.suite.padEnd(28)} exit=${r.exit}  checks~${r.lines}  ${tag}`);
}
const fails = results.filter(r => r.status === 'FAIL' || r.strictFail).length;
console.log('=================================================');
console.log(`${fails === 0 ? 'ALL SUITES GREEN' : fails + ' SUITE(S) RED'}${STRICT ? ' (strict)' : ''} — artifacts in tests/artifacts/${stamp}/`);
process.exit(fails === 0 ? 0 : 1);
