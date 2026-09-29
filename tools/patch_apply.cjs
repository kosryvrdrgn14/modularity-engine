#!/usr/bin/env node
// ============================================================
// patch_apply.cjs — JSON-driven atomic find/replace tool
// (TOOLING_MAP §2; adopted v2.19.43)
//
// Replaces the throwaway _bNN_*.cjs pattern: scripts that embedded
// docs prose as escaped JS strings kept failing to parse when the
// prose contained apostrophes or backticks (≥3 incidents). Here the
// prose lives in a JSON patch file, where apostrophes and backticks
// are ordinary characters — nothing to escape. Those scripts also
// claimed OK while aborting before their write when an anchor missed
// (their earlier OK lines lie); this tool counts every anchor BEFORE
// writing anything.
//
// Usage:
//   node tools/patch_apply.cjs patch.json            # apply
//   node tools/patch_apply.cjs patch.json --dry      # verify only
//
// Patch schema:
// {
//   "patches": [
//     { "file": "WORKFLOW.md",
//       "find": "### v2.19.42 (Sept 28, 2026) — B36: shop Done bar + ESC\n",
//       "replace": "### v2.19.43 (...)\n<new block>\n### v2.19.42 (Sept 28, 2026) — B36: shop Done bar + ESC\n",
//       "expectedCount": 1 }
//   ]
// }
//
// Rules:
//   1. Every `find` must match EXACTLY expectedCount times (default 1)
//      in its target file AT THE MOMENT IT APPLIES. expectedCount: 0
//      asserts the find is ABSENT (deprecated-anchor guard);
//      "> N" (string, e.g. "> 1") = at-least matching.
//   2. ATOMIC: if ANY entry is invalid or mismatches, nothing is
//      written — not even the entries that would have applied.
//   3. Sequential per file: entries for the same file fold over the
//      EVOLVING text in order (entry N+1 sees entry N's result), and
//      each file is written exactly once, only after every fold in the
//      whole batch succeeded.
//   4. EOL preservation: the file's dominant line ending is detected
//      and \n inside find/replace are converted to it before
//      counting/matching, so patch files authored with plain \n work
//      on CRLF files and never create mixed endings. A MIXED-EOL
//      target file is REFUSED (no guessing).
//   5. Multi-line finds match CONTIGUOUSLY (one span per occurrence).
//   6. Empty find → ERROR (to insert, use a one-line anchor in find
//      and repeat it in replace). Empty replace DELETES the span.
//      Replacement text is applied LITERALLY (split/join, never
//      String.replace — $& and friends in prose must stay literal).
//   7. If replace does NOT contain find verbatim it is still applied (a
//      plain modification) but the tool WARNS — the anchored-INSERT idiom
//      requires restating the anchor, and a missing anchor tail there
//      silently deletes content. No warning for replace="" (deletion) or
//      expectedCount 0 (assertion-only).
//   8. Nonexistent file → ERROR (no implicit creates; an append needs
//      an anchor too).
//   9. --dry validates everything and writes nothing.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const args = process.argv.slice(2).filter((a) => a !== '--dry');
const patchPath = args[0];
if (!patchPath || args.length !== 1) {
  console.error('usage: node tools/patch_apply.cjs <patch.json> [--dry]');
  process.exit(1);
}
const resolvedPatch = path.resolve(patchPath);
if (!fs.existsSync(resolvedPatch)) {
  console.error(`patch file not found: ${patchPath}`);
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(resolvedPatch, 'utf8'));
} catch (e) {
  console.error(`patch JSON parse error: ${e.message.split('\n')[0]}`);
  process.exit(1);
}

const entries = Array.isArray(spec && spec.patches) ? spec.patches : null;
if (!entries || entries.length === 0) {
  console.error('patch JSON must be {"patches":[{file,find,replace,expectedCount?}...]} with at least one entry');
  process.exit(1);
}

// ── EOL helpers ──────────────────────────────────────────────
// Dominant EOL per file: all newlines CRLF → CRLF; all LF → LF;
// mixed → refuse. The tool never guesses and never CREATES a mixed file.
function detectEol(label, text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/\n/g) || []).length;
  if (lf === 0) return '\n'; // no newlines at all — default
  if (crlf === lf) return '\r\n';
  if (crlf === 0) return '\n';
  console.error(`EOL ERROR: ${label}: mixed line endings (${crlf} CRLF / ${lf - crlf} lone LF) — normalize it first; refusing to guess.`);
  process.exit(1);
}
const toFileEol = (s, eol) => (eol === '\r\n' ? s.replace(/\n/g, '\r\n') : s);

// Occurrences of needle in haystack (each must be a contiguous span).
function countContiguous(haystack, needle) {
  if (needle.length === 0) return 0;
  let count = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) { count++; i = haystack.indexOf(needle, i + 1); }
  return count;
}

console.log(`== patch_apply: ${path.basename(resolvedPatch)}${DRY ? ' (dry run — nothing will be written)' : ''} ==`);

// ── 1. Field validation (fail fast, nothing read yet) ────────
const failures = [];
const warnings = [];
for (let n = 0; n < entries.length; n++) {
  const e = entries[n];
  const label = e && e.file ? `${e.file} [entry ${n}]` : `[entry ${n}]`;
  if (!e || typeof e !== 'object') { failures.push(`${label}: not an object`); continue; }
  if (!e.file || typeof e.file !== 'string') { failures.push(`${label}: missing "file"`); continue; }
  if (!e.find || typeof e.find !== 'string') {
    failures.push(`${label}: "find" is missing or empty — to insert, use a one-line anchor in find and repeat it in replace`);
    continue;
  }
  if (typeof e.replace !== 'string') { failures.push(`${label}: missing "replace"`); continue; }
  const isAssertion = e.expectedCount === 0;
  if (e.replace !== '' && !isAssertion && e.replace.indexOf(e.find) === -1) {
    warnings.push(`${label}: "replace" does not contain "find" — applied as a plain modification (if this was meant as an anchored INSERT, restate the anchor in replace)`);
  }
}
if (failures.length > 0) {
  console.error('== PATCH RED — nothing written (atomic) ==');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
for (const w of warnings) console.log(`  ⚠ ${w}`);

// ── 2. Group entries by resolved target file (order preserved) ──
const byFile = new Map(); // resolvedPath -> { label, entries: [] }
for (let n = 0; n < entries.length; n++) {
  const e = entries[n];
  const key = path.resolve(e.file);
  if (!byFile.has(key)) byFile.set(key, { label: e.file, entries: [] });
  byFile.get(key).entries.push({ n, e });
}

// ── 3. Fold per file over EVOLVING text; collect transformed buffers ──
const failures2 = [];
const writes = []; // { file, label, next, eol, applied }
let applied = 0;

for (const [key, group] of byFile) {
  if (!fs.existsSync(key)) {
    failures2.push(`${group.label}: target file does not exist`);
    continue;
  }
  const text = fs.readFileSync(key, 'utf8');
  const eol = detectEol(group.label, text);
  let current = text;
  let fileApplied = 0;

  for (const { n, e } of group.entries) {
    const find = toFileEol(e.find, eol);
    const replace = toFileEol(e.replace, eol);
    const count = countContiguous(current, find);

    let expect = typeof e.expectedCount === 'number' ? e.expectedCount : 1;
    let atLeast = false;
    if (typeof e.expectedCount === 'string' && e.expectedCount.trim().startsWith('>')) {
      atLeast = true;
      expect = Number(e.expectedCount.trim().slice(1));
      if (!Number.isFinite(expect)) { failures2.push(`${group.label} [entry ${n}]: bad expectedCount "${e.expectedCount}"`); continue; }
    }
    const matches = atLeast ? count >= expect : count === expect;

    if (!matches) {
      failures2.push(`${group.label} [entry ${n}]: found ${count}×, expected ${atLeast ? '≥' : 'exactly'} ${expect} — NOTHING will be written (atomic)`);
      continue;
    }
    current = current.split(find).join(replace);
    fileApplied++;
    applied++;
    console.log(`  ✓ ${group.label} [entry ${n}]: anchor ${atLeast ? '≥' : '=='}${expect} matched ${count}× → ${DRY ? 'WOULD apply' : 'staged'}`);
  }

  // Write only files whose content actually changed (assertion-only
  // entries — expectedCount 0 — must not trigger a no-op rewrite).
  if (fileApplied > 0 && current !== text) writes.push({ file: key, label: group.label, next: current, eol });
}

// ── 4. Write phase — only if EVERY fold in the WHOLE batch succeeded ──
if (failures2.length > 0) {
  console.error('== PATCH RED — nothing written (atomic) ==');
  for (const f of failures2) console.error(`  ✗ ${f}`);
  process.exit(1);
}

if (DRY) {
  console.log(`== PATCH DRY GREEN — ${applied} entr${applied === 1 ? 'y' : 'ies'} valid across ${writes.length} file${writes.length === 1 ? '' : 's'}, nothing written ==`);
  process.exit(0);
}

for (const w of writes) {
  fs.writeFileSync(w.file, w.next, 'utf8');
  console.log(`  ✓ ${w.label}: written (${w.eol === '\r\n' ? 'CRLF' : 'LF'} preserved) OK`);
}
console.log(`== PATCH APPLIED — ${applied} entries across ${writes.length} file${writes.length === 1 ? '' : 's'} (all-or-nothing) ==`);
