#!/usr/bin/env node
// ============================================================
// release_check.cjs — criteria-based release gate (WORKFLOW B3, v2.19.5)
//
//   npm run release:check          # full battery + docs hygiene, exit 0/1
//
// Makes "done" MECHANICAL when sessions break (B3's reason-to-exist):
// instead of remembering what a release needs, the check is just there —
// the same pattern as npm run verify (F1/F5/F2) and the battery.
//
// Criteria (all must be green):
//   1. `npm run verify` green — static gates (F1 syntax incl. tests/tools,
//      content pipeline, PROJECT_MAP contracts, F5 no-undef, F2 DOM ids).
//   2. Battery green in --strict (npm run test:strict) — all suites run,
//      no skips silently passing (run_all --strict flips skips to FAIL).
//   3. CHANGELOG hygiene — exactly one H2 version header at the top of the
//      file (a version lands as one header, not two for the same release).
//      Catches the double-header class seen pre-v2.9.2 and the doc-tail
//      class where a release's docs land in a later session than its code.
//
// Exit codes: 0 = release-ready, 1 = any criterion red.
// Built to be invoked by humans AND agents — no prompts, no env assumptions.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SKIP_BATTERY = args.includes('--no-battery'); // verify + docs only (fast feedback)
let failed = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failed++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

// ── Criterion 1: static gates ──
console.log('== Criterion 1: npm run verify (static gates) ==');
try {
  const out = execFileSync('npm', ['run', 'verify', '--silent'], { cwd: ROOT, stdio: 'pipe', timeout: 180000 });
  const tail = out.toString().trim().split('\n').slice(-1)[0];
  ok(`verify ${tail}`);
} catch (e) {
  const out = ((e.stdout || '') + '\n' + (e.stderr || '')).toString();
  const problems = out.split('\n').filter((l) => l.includes('✗')).slice(0, 10);
  for (const p of problems) fail(p.trim());
  if (!problems.length) fail('verify failed (no detail captured)');
}

// ── Criterion 2: strict battery ──
if (!SKIP_BATTERY) {
  console.log('== Criterion 2: battery --strict (no silent skips) ==');
  const res = spawnSync('npm', ['run', 'test:strict', '--silent'], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
  const out = (res.stdout || '') + (res.stderr || '');
  if (res.status !== 0) {
    const red = out.split('\n').filter((l) => /FAIL|RED/.test(l)).slice(0, 10);
    for (const l of red) console.error(`  ${l.trim()}`);
    fail('battery RED in strict mode');
  } else {
    const total = (out.match(/TOTAL: (\d+) checks/) || [])[1];
    ok(`battery green (strict) — ${total ? total + ' checks, ' : ''}no skips`);
  }
} else {
  console.log('== Criterion 2: battery --strict ==\n  – skipped (--no-battery)');
}

// ── Criterion 3: CHANGELOG hygiene ──
console.log('== Criterion 3: CHANGELOG version-header hygiene ==');
{
  const text = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const headers = [...text.matchAll(/^## (v[\d.]+[^\n]*)/gm)].map((m) => m[1]);
  if (headers.length === 0) {
    fail('no version headers found in CHANGELOG.md (expected at least one `## vX.Y.Z`)');
  } else {
    // Single latest version: the top header is THE current release record.
    // A second header for the SAME version = the double-header defect class
    // (pre-v2.9.2). A docs tail landing after code = same version appears
    // with a different top header (doc-tail class, v2.19.1's incident).
    const top = headers[0];
    const versionCore = top.match(/v[\d.]+/)[0];
    const dupes = headers.filter((h) => h.match(/v[\d.]+/)[0] === versionCore).length;
    if (dupes > 1) fail(`CHANGELOG has ${dupes} headers for ${versionCore} — one release = one header`);
    else ok(`single top header: ${top} (no double-header for ${versionCore})`);
    // The top header must open the release record: only the file title (#),
    // blank lines, and `---` dividers may precede it — no prose blocks.
    // (First draft also failed on the legitimate title/first-entry `---`
    // divider — caught by its own first run; divider exempted here.)
    const lines = text.split('\n');
    const topLineIdx = lines.findIndex((l) => l.startsWith('## ' + top));
    const stray = lines.slice(0, topLineIdx).filter((l) => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('#') && t !== '---';
    });
    if (stray.length) {
      fail(`stray prose before the top version header: "${stray[0].trim().slice(0, 60)}"`);
    } else ok('top header position clean (title/dividers only)');
  }
}

console.log(failed === 0
  ? 'RELEASE CHECK GREEN — all criteria pass'
  : `RELEASE CHECK RED — ${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
