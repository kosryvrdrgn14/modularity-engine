#!/usr/bin/env node
// ONE-OFF (delete after run): damage report after the over-deletion.
// Lists every surviving prelude that mentions the four live-container tokens
// (loadout-slot, shop-tab, dialogue-choice, dog-choice as substrings), and
// checks the loadout/shop expected rules one by one.
const fs = require('fs');
const file = 'public/styles.css';
const src = fs.readFileSync(file, 'utf8');
const TOKENS = ['loadout-slot', 'shop-tab', 'dialogue-choice', 'dog-choice'];

// walk prelude/block pairs
const segs = [];
let depth = 0, bufStart = 0, blockStart = -1;
for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  if (ch === '{' && depth === 0) { blockStart = i; depth++; }
  else if (ch === '{') depth++;
  else if (ch === '}' && depth > 1) depth--;
  else if (ch === '}' && depth === 1) {
    segs.push({ prelude: src.slice(bufStart, blockStart).trim(), body: src.slice(blockStart, i + 1) });
    bufStart = i + 1; depth = 0;
  }
}
console.log('surviving preludes mentioning live tokens:');
for (const s of segs) {
  const hit = TOKENS.filter((t) => s.prelude.includes(t));
  if (hit.length) console.log('  [' + hit.join(',') + '] ' + s.prelude.split('\n').pop().trim().slice(0, 90));
}
console.log('\nexpected-live checks:');
const checks = [
  ['.loadout-slots {', /loadout-slots\s*\{/],
  ['#shop-tabs {', /#shop-tabs\s*\{/],
  ['#dialogue-choices {', /#dialogue-choices\s*\{/],
  ['.dog-choices', /dog-choices/],
  ['#loadout-overlay #loadout-slots .widget-card {', /#loadout-overlay #loadout-slots \.widget-card\s*\{/],
  ['#shop-tabs .widget-card {', /#shop-tabs \.widget-card\s*\{/],
  ['.loadout-back {', /\.loadout-back\s*\{/],
  ['.loadout-confirm {', /\.loadout-confirm\s*\{/],
  ['#loadout-slots {', /#loadout-slots\s*\{/],
];
for (const [label, re] of checks) console.log((re.test(src) ? '  OK    ' : '  MISS  ') + label);
