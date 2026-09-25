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
  'tests/suites/game_log.cjs',
  'tests/suites/step5_loadout_widgets.cjs',
  'tests/suites/step6_shop_tabs.cjs',
  'tests/suites/step7_title_menu.cjs',
  'tests/suites/save_fuzz.cjs',
  'tests/suites/widget_occlusion.cjs',
  'tests/suites/visual_probe.cjs',
  'tests/suites/perf_budget.cjs',
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
  // B5 (v2.19.5): count verdict lines in BOTH output conventions — the harness
  // runner's `PASS/FAIL/SKIP —` lines (trace + step1–4, calendar, game_log) AND
  // the local `✓/✗` check format (step5/6/7, save_fuzz, widget_occlusion).
  // Previously only the first was counted, so five suites reported checks~0
  // and per-suite check counts couldn't be trusted in the summary.
  let checks = 0;
  for (const l of out.split('\n')) {
    if (/^(PASS|FAIL|SKIP)\b/.test(l) || /^\s*[✓✗]\s/.test(l)) checks++;
  }
  results.push({
    suite: path.basename(suite),
    status: failed ? 'FAIL' : skipped ? 'SKIP' : 'PASS',
    strictFail: STRICT && skipped,
    exit: res.status,
    checks,
  });
}

console.log('\n================ RUN_ALL SUMMARY ================');
let totalChecks = 0;
for (const r of results) {
  const tag = r.strictFail ? 'FAIL (skip in --strict)' : r.status;
  totalChecks += r.checks;
  console.log(`${r.status.padEnd(5)}  ${r.suite.padEnd(28)} exit=${r.exit}  checks~${r.checks}  ${tag}`);
}
const fails = results.filter(r => r.status === 'FAIL' || r.strictFail).length;
console.log('=================================================');
console.log(`TOTAL: ${totalChecks} checks across ${results.length} suites (${results.filter(r => r.status === 'PASS').length} green)`);
console.log(`${fails === 0 ? 'ALL SUITES GREEN' : fails + ' SUITE(S) RED'}${STRICT ? ' (strict)' : ''} — artifacts in tests/artifacts/${stamp}/`);
process.exit(fails === 0 ? 0 : 1);
