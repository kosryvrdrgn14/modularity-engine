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
//   3. MAP: PROJECT_MAP.md is validated against reality — every load-order
//      file has a contract block, every block's file exists, Status is a
//      valid lifecycle value, every `Defines:` symbol is actually present
//      in its file, every GuardedBy suite exists, §3.1 content rows point
//      at real content files. A new/renamed file without a map block = RED
//      (KNOWLEDGE §19: the map may not silently rot).
//   4. TRACE (opt-in): the 112-check Playwright regression suite.
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

// ── 3. PROJECT_MAP.md contract validation ──
console.log('== Project map (PROJECT_MAP.md) ==');
const MAP = path.join(ROOT, 'PROJECT_MAP.md');
if (!fs.existsSync(MAP)) {
  fail('PROJECT_MAP.md is missing — file contracts are enforced here (KNOWLEDGE §19)');
} else {
  const mapText = fs.readFileSync(MAP, 'utf8');
  const STATUSES = new Set(['NORMATIVE', 'IN-FLUX', 'DEPRECATED']);

  // Parse contract blocks: `### <path>` with full-line path charset, then fields.
  const blocks = new Map();
  // Stop at next block header, next ## section, or true EOF. (A bare \s*$
  // alternative would terminate every body at its own header line.)
  const re = /^### ([a-zA-Z0-9_][a-zA-Z0-9_./-]*)$([\s\S]*?)(?=^### |^## |(?![\s\S]))/gm;
  let m;
  while ((m = re.exec(mapText)) !== null) blocks.set(m[1], m[2]);
  if (blocks.size === 0) fail('no contract blocks found — block headers must be exactly `### <path>`');

  // 3a. Coverage both directions.
  let covered = 0;
  for (const src of srcs) {
    if (blocks.has(src)) covered++; else fail(`load-order file has NO contract block: ${src}`);
  }
  for (const key of blocks.keys()) {
    if (!fs.existsSync(path.join(ROOT, 'public', key))) fail(`map block points at missing file: ${key}`);
  }
  if (covered === srcs.length && covered > 0) ok(`${covered}/${srcs.length} load-order files have contract blocks`);

  // 3b. Field checks per block.
  let checked = 0;
  for (const [key, body] of blocks) {
    const srcPath = path.join(ROOT, 'public', key);
    const source = fs.existsSync(srcPath) ? fs.readFileSync(srcPath, 'utf8') : '';

    const st = body.match(/^[-*]\s*Status:\s*([A-Za-z-]+)/m);
    if (!st) fail(`${key}: no Status line`);
    else if (!STATUSES.has(st[1])) fail(`${key}: bad Status "${st[1]}" (NORMATIVE | IN-FLUX | DEPRECATED)`);

    const defLine = body.match(/^[-*]\s*Defines:(.*)$/m);
    if (defLine) {
      for (const sym of [...defLine[1].matchAll(/`([^`]+)`/g)].map((x) => x[1])) {
        if (source && !source.includes(sym)) fail(`${key}: Defines \`${sym}\` not found in file source`);
        checked++;
      }
    }

    const guardLine = body.match(/^[-*]\s*GuardedBy:(.*)$/m);
    if (guardLine) {
      for (const suite of [...guardLine[1].matchAll(/(tests\/suites\/[\w.-]+\.cjs)/g)].map((x) => x[1])) {
        if (!fs.existsSync(path.join(ROOT, suite))) fail(`${key}: GuardedBy suite missing: ${suite}`);
        checked++;
      }
    }
  }
  if (checked > 0) ok(`${checked} Defines/GuardedBy symbols cross-checked against disk`);

  // 3c. §3.1 content rows point at real content files.
  const c3 = mapText.match(/### §3\.1[\s\S]*?(?=### §3\.2)/);
  if (c3) {
    let rows = 0;
    for (const f of [...c3[0].matchAll(/\|\s*([a-z_]+\.json)\s*\|/g)].map((x) => x[1])) {
      rows++;
      if (!fs.existsSync(path.join(ROOT, 'public', 'content', f))) fail(`§3.1 row references missing content file: ${f}`);
    }
    if (rows > 0) ok(`§3.1 content index consistent (${rows} rows)`);
  }
}

// ── 4. Optional regression trace ──
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
