#!/usr/bin/env node
// patch_apply_selftest.cjs — behavior guard for tools/patch_apply.cjs
// (added 2026-09-30: F1 only proves the tool PARSES; this proves it BEHAVES)
//
// Packages the original fixture battery as a permanent regression gate:
// dry-green, atomic red (nothing written on a mid-batch miss), CRLF
// preservation, the origin schema (top-level array + count key), same-file
// sequential folding, literal $& replacement, count-0 assertions, and
// mixed-EOL refusal. Each scenario runs the REAL tool against throwaway
// files and byte-compares the results.
//
// Usage: node tools/patch_apply_selftest.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'patch_apply.cjs');
let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.error(`  ✗ ${m}`); failed++; };

const run = (patch, dry) => {
  try {
    execFileSync(process.execPath, [TOOL, patch, ...(dry ? ['--dry'] : [])], { stdio: 'pipe' });
    return { code: 0 };
  } catch (e) {
    return { code: e.status, err: (e.stderr || e.stdout || '').toString() };
  }
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-selftest-'));
try {
  // ── fixtures ──
  const w = (name, text) => { fs.writeFileSync(path.join(dir, name), text); return path.join(dir, name); };
  const lf = w('lf.txt', 'alpha\n### v2.19.42 - anchor\nomega\n');
  const crlf = w('crlf.txt', 'line one\r\nline two\r\nline three\r\n');
  const dup = w('dup.txt', 'dup here\ndup here\n');
  const P = (name, obj) => { const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(obj, null, 2)); return p; };

  // ── 1. dry-green two-file batch (project schema), bytes untouched ──
  console.log('== patch_apply_selftest ==');
  const p1 = P('p1.json', { patches: [
    { file: lf, find: '### v2.19.42 - anchor\n', replace: "### v2.19.43 - don't escape, `backticks` fine\n### v2.19.42 - anchor\n" },
    { file: crlf, find: 'line two\n', replace: 'line two (edited)\n' },
  ] });
  const before = [fs.readFileSync(lf, 'utf8'), fs.readFileSync(crlf, 'utf8')];
  const r1 = run(p1, true);
  r1.code === 0 ? ok('dry run exits 0') : bad(`dry run exit ${r1.code}`);
  fs.readFileSync(lf, 'utf8') === before[0] && fs.readFileSync(crlf, 'utf8') === before[1]
    ? ok('dry run writes nothing')
    : bad('dry run MODIFIED files');

  // ── 2. apply: LF insert + CRLF preserved (line endings byte-exact) ──
  const r2 = run(p1, false);
  r2.code === 0 ? ok('apply exits 0') : bad(`apply exit ${r2.code}: ${r2.err.split('\n')[0] || ''}`);
  const lfAfter = fs.readFileSync(lf, 'utf8');
  const crlfAfter = fs.readFileSync(crlf, 'utf8');
  lfAfter.includes("don't escape, `backticks` fine") ? ok('prose with apostrophe+backtick applied') : bad('prose lost');
  lfAfter.includes('### v2.19.42 - anchor\n') ? ok('anchored insert keeps the anchor') : bad('anchor consumed');
  (crlfAfter.match(/(?<!\r)\n/g) || []).length === 0 ? ok('CRLF file stays 100% CRLF') : bad('lone LF introduced into CRLF file');

  // ── 3. atomic red: mid-batch miss writes NOTHING ──
  const dupBefore = fs.readFileSync(dup, 'utf8');
  const p3 = P('p3.json', [
    { file: dup, find: 'dup here\n', replace: 'dup here (x)\n', count: 2 },
    { file: lf, find: 'THIS ANCHOR DOES NOT EXIST\n', replace: 'x\n' },
  ]);
  const r3 = run(p3, false);
  r3.code === 1 ? ok('mismatch exits 1') : bad(`mismatch exit ${r3.code} (expected 1)`);
  fs.readFileSync(dup, 'utf8') === dupBefore ? ok('atomic: earlier valid entry NOT written') : bad('atomicity BROKEN — partial write');

  // ── 4. origin schema: top-level array + count alias ──
  const p4 = P('p4.json', [{ file: dup, find: 'dup here\n', replace: 'dup here (x)\n', count: 2 }]);
  const r4 = run(p4, false);
  r4.code === 0 && fs.readFileSync(dup, 'utf8').split('dup here (x)').length - 1 === 2
    ? ok('origin schema (array + count) applies both')
    : bad(`origin schema failed (exit ${r4.code})`);

  // ── 5. same-file sequential fold ──
  const fold = w('fold.txt', 'one\ntwo\n');
  const p5 = P('p5.json', { patches: [
    { file: fold, find: 'one\n', replace: 'ONE\n' },
    { file: fold, find: 'two\n', replace: 'TWO\n' },
  ] });
  run(p5, false);
  fs.readFileSync(fold, 'utf8') === 'ONE\nTWO\n' ? ok('same-file entries fold sequentially') : bad('same-file fold clobbered');

  // ── 6. literal $& (split/join, never String.replace) ──
  const dollar = w('dollar.txt', 'keep\n');
  run(P('p6.json', [{ file: dollar, find: 'keep\n', replace: '$& $1 literal\nkeep\n' }]), false);
  fs.readFileSync(dollar, 'utf8').startsWith('$& $1 literal\n') ? ok('$& stays literal') : bad('$& was interpreted');

  // ── 7. count-0 assertion: green, no write ──
  const aBefore = fs.readFileSync(lf, 'utf8');
  const p7 = P('p7.json', { patches: [{ file: lf, find: 'should-not-exist\n', expectedCount: 0, replace: '' }] });
  const r7 = run(p7, false);
  r7.code === 0 && fs.readFileSync(lf, 'utf8') === aBefore
    ? ok('count-0 assertion exits 0 without rewriting')
    : bad(`count-0 assertion (exit ${r7.code})`);

  // ── 8. mixed EOL: refuse ──
  const mixed = w('mixed.txt', 'crlf line\r\nlf line\n');
  const r8 = run(P('p8.json', [{ file: mixed, find: 'lf line\n', replace: 'x\n' }]), true);
  r8.code === 1 ? ok('mixed-EOL target refused (exit 1)') : bad(`mixed-EOL exit ${r8.code} (expected 1)`);

  console.log(failed === 0 ? '== SELFTEST GREEN — patch_apply behavior verified ==' : `== SELFTEST RED — ${failed} failure(s) ==`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exit(failed === 0 ? 0 : 1);
