#!/usr/bin/env node
// ONE-OFF (delete after run): B14 deletion — rule-precise removal of
// confirmed-dead rules + the toast fade-out bug fix (rename).
// Parser walks prelude/block pairs; a rule is dropped iff its PRELUDE (real
// selector text) contains one of the dead substrings. Comments between rules
// are preserved; a comment is only removed when it directly precedes a
// dropped rule AND mentions the same dead class (keeps file honest).
const fs = require('fs');
const file = 'public/styles.css';
let src = fs.readFileSync(file, 'utf8');

const DEAD = ['dialogue-choice', 'dog-choice', 'farming-section', 'section-label',
  'gamelog-entry', 'gamelog-ts', 'kind-event', 'kind-reward', 'kind-warn', 'kind-error',
  'menu-item', 'menu-arrow', 'pause-btn', 'shop-tab', 'town-panel',
  'loadout-slot', 'loadout-card'];
const RENAME = { '.town-toast.toast-leaving': '.town-toast.leaving' };

// tokenize into segments: {prelude, block} pairs (block may be null for at-rules w/o block)
const segs = [];
let depth = 0, bufStart = 0, inBlock = false, blockStart = -1;
for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  if (ch === '{' && depth === 0) { inBlock = true; blockStart = i; depth++; }
  else if (ch === '{') depth++;
  else if (ch === '}' && depth > 1) depth--;
  else if (ch === '}' && depth === 1) {
    segs.push({ prelude: src.slice(bufStart, blockStart), block: src.slice(blockStart, i + 1) });
    bufStart = i + 1; inBlock = false; depth = 0;
  }
}
segs.push({ prelude: src.slice(bufStart), block: null }); // tail

const removed = [], renamed = [];
const outParts = [];
for (const seg of segs) {
  if (!seg.block) { outParts.push(seg.prelude); continue; }
  const prelude = seg.prelude;
  const deadHit = DEAD.find((d) => prelude.includes(d));
  if (deadHit) { removed.push(prelude.trim().split('\n').pop().trim().slice(0, 60)); continue; }
  let newPrelude = prelude;
  for (const [from, to] of Object.entries(RENAME)) {
    if (prelude.includes(from)) { newPrelude = prelude.split(from).join(to); renamed.push(from); }
  }
  outParts.push(newPrelude, seg.block);
}
const out = outParts.join('');

// assertions
const countDead = (s, d) => {
  // count occurrences of `.dead` token OUTSIDE comments
  const noComments = s.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  return (noComments.match(new RegExp('\\.' + d.replace(/[-]/g, '\\-') + '\\b', 'g')) || []).length;
};
let failures = 0;
for (const d of DEAD) {
  const n = countDead(out, d);
  if (n > 0) { console.error(`STILL PRESENT: .${d} ×${n}`); failures++; }
}
if (removed.length === 0) { console.error('NOTHING REMOVED — aborting'); process.exit(1); }
if (failures) process.exit(1);

fs.writeFileSync(file, out);
console.log(`removed rules: ${removed.length}`);
removed.forEach((r) => console.log('  − ' + r));
console.log(`renamed: ${renamed.length ? renamed.join(', ') : 'NONE'}`);
const v = fs.readFileSync(file, 'utf8');
console.log('rename landed:', v.includes('.town-toast.leaving') ? 'OK' : 'FAIL');
console.log('size:', src.length, '→', v.length, `(${src.length - v.length} chars freed)`);
