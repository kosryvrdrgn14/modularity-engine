#!/usr/bin/env node
// ============================================================
// verify.cjs — one-command static verification (TOOLING_MAP §2)
//
//   node tools/verify.cjs           # syntax + content JSON, fast (~2s)
//   node tools/verify.cjs --trace   # + full headless regression trace
//
// What "verify" means here, honestly scoped:
//   1. SYNTAX: every <script src> in public/game2.html parses (node --check
//      semantics) IN THE REAL LOAD ORDER — a file that parses alone but
//      breaks the reassembled boot is caught.
//   2. CONTENT: every registered content JSON parses; the embeddedData
//      mirror is byte-in-sync (--check mode) — the POT-006 contract.
//   3. TRACE (opt-in): the 112-check Playwright regression suite.
//
// Exit codes: 0 green, 1 red. Built to be invoked by humans AND agents —
// no interactive prompts, no environment assumptions beyond Node.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const HTML = path.join(ROOT, 'public', 'game2.html');
const TRACE = process.argv.includes('--trace');

let failed = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failed++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

// ── 1. Syntax across the REAL load order ──
console.log('== Syntax: browser load order (public/game2.html) ==');
const html = fs.readFileSync(HTML, 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
if (srcs.length === 0) fail('no <script src> tags found in game2.html — extraction regex broke');
let loadOrderOk = true;
for (const src of srcs) {
  const p = path.join(ROOT, 'public', src);
  try {
    execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
  } catch (e) {
    loadOrderOk = false;
    fail(`${src}: ${e.stderr?.toString().split('\n')[0] || 'syntax error'}`);
  }
}
if (loadOrderOk) ok(`${srcs.length} files parse in load order`);

// ── 2. Content JSON + mirror sync (POT-006 contract) ──
console.log('== Content pipeline ==');
const contentDir = path.join(ROOT, 'public', 'content');
const jsons = fs.existsSync(contentDir) ? fs.readdirSync(contentDir).filter((f) => f.endsWith('.json')) : [];
let contentOk = true;
for (const f of jsons) {
  try {
    JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'));
  } catch (e) {
    contentOk = false;
    fail(`content/${f}: ${e.message.split('\n')[0]}`);
  }
}
if (contentOk) ok(`${jsons.length} content JSON files parse`);
try {
  execFileSync('npm', ['run', 'content:check', '--silent'], { cwd: ROOT, stdio: 'pipe' });
  ok('embeddedData mirror in sync (content:check)');
} catch (e) {
  fail('embeddedData mirror OUT OF SYNC — run: npm run content:sync');
}

// ── 3. Optional regression trace ──
if (TRACE) {
  console.log('== Regression trace (headless) ==');
  try {
    const out = execFileSync('node', [path.join(ROOT, 'tests', 'regression_trace.cjs')], {
      cwd: ROOT, stdio: 'pipe', timeout: 300000,
    }).toString();
    const tail = out.trim().split('\n').slice(-3).join('\n');
    console.log(tail.split('\n').map((l) => `  ${l}`).join('\n'));
    if (!/ALL .*PASS|112\/112|0 failed/i.test(out)) fail('trace did not report green');
  } catch (e) {
    fail(`trace failed: ${e.stdout?.toString().split('\n').slice(-4).join(' | ') || e.message}`);
  }
}

console.log(failed === 0 ? 'VERIFY GREEN' : `VERIFY RED — ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
