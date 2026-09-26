#!/usr/bin/env node
// css_sweep.cjs — dead-CSS sweep (B14, v2.19.26). Manual tool, NOT a battery
// gate: every class selector in public/styles.css is checked against runtime
// references (public/**/*.js + public/*.html). Zero-hit classes are reported
// as dead candidates. PREFIX-CONSTRUCTED classes (widget-*, size-*, layout-*,
// skin-*, slot-*) are exempted from the DEAD verdict — widgetRenderer builds
// them via string concatenation (`size-${def.size}`), so a naive grep misses
// them; review those by hand against the renderer before deleting.
// Also reports classes referenced ONLY by tests (vacuous-assertion risk).
//
// B14 INCIDENT LESSON (see WORKFLOW §11): the FIRST cut script matched dead
// names as raw SUBSTRINGS and treated comment text as selector text — it
// deleted 12 LIVE rules that merely FOLLOWED comments like "Mirrors the
// retired .menu-item look" (comment-adjacency), plus 4 live container rules
// whose names contained dead names (loadout-slots ⊃ loadout-slot).
// RECOVERY came from widget_preview artifacts, which inline the stylesheet.
// RULES for any future deletion: (1) strip comments BEFORE matching;
// (2) match WHOLE selector tokens, never substrings; (3) for each rule to
// drop, require EVERY class token in its prelude to be on the dead list;
// (4) run the full battery before calling it done.
//
// Usage: node tools/css_sweep.cjs   (read-only — deletes nothing)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS = path.join(ROOT, 'public', 'styles.css');
const EXEMPT_PREFIX = /^(widget|size|layout|skin|slot)-/;
const FILE_EXT = /^(svg|png|jpg|jpeg|webp|gif|css|js|json|woff2?|ttf)$/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ── 1. class occurrences in the stylesheet (comments stripped) ──
const cssRaw = fs.readFileSync(CSS, 'utf8');
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments
const classLines = new Map(); // class -> [{line, ctx}]
css.split('\n').forEach((line, i) => {
  for (const m of line.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
    const cls = m[1];
    if (FILE_EXT.test(cls)) continue;
    if (!classLines.has(cls)) classLines.set(cls, []);
    classLines.get(cls).push({ line: i + 1, ctx: line.trim().slice(0, 90) });
  }
});

// ── 2. runtime references ──
const codeFiles = walk(path.join(ROOT, 'public')).filter((f) => /\.(js|html)$/.test(f) && !f.endsWith('styles.css'));
const testFiles = walk(path.join(ROOT, 'tests')).filter((f) => /\.(cjs|js)$/.test(f));
const codeText = codeFiles.map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));
const testText = testFiles.map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));

const alive = [], dead = [], prefix = [], testOnly = [];
for (const [cls, occ] of [...classLines.entries()].sort()) {
  const re = new RegExp('\\b' + cls.replace(/[-]/g, '\\-') + '\\b');
  const inCode = codeText.some(({ t }) => re.test(t));
  const inTests = testText.some(({ t }) => re.test(t));
  if (inCode) alive.push(cls);
  else if (EXEMPT_PREFIX.test(cls)) prefix.push({ cls, occ });
  else if (inTests) testOnly.push({ cls, occ });
  else dead.push({ cls, occ });
}

console.log(`classes in stylesheet: ${classLines.size}`);
console.log(`ALIVE (referenced by runtime code): ${alive.length}`);
console.log(`\n=== DEAD CANDIDATES (zero runtime refs) — ${dead.length} ===`);
for (const { cls, occ } of dead) {
  console.log(`  .${cls}  @L${occ.map((o) => o.line).join(',L')}`);
  occ.slice(0, 2).forEach((o) => console.log(`      | ${o.ctx}`));
}
console.log(`\n=== PREFIX-CONSTRUCTED (exempt — verify against renderer) — ${prefix.length} ===`);
console.log('  ' + prefix.map((p) => p.cls).join(', '));
console.log(`\n=== TEST-ONLY (runtime-dead, referenced by suites — investigate) — ${testOnly.length} ===`);
for (const { cls } of testOnly) console.log(`  .${cls}`);
