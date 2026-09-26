#!/usr/bin/env node
// ONE-OFF (delete after run): word-boundary usage counts for B14 candidates.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const files = walk(path.join(ROOT, 'public')).filter((f) => /\.(js|html)$/.test(f) && !f.endsWith('styles.css'));
const texts = files.map((f) => ({ f: path.relative(ROOT, f), t: fs.readFileSync(f, 'utf8') }));
const classes = ['shop-tab', 'pause-btn', 'dialogue-choice', 'dog-choice', 'menu-item', 'menu-arrow',
  'town-panel', 'farming-section', 'section-label', 'gamelog-entry', 'gamelog-ts', 'kind-event',
  'kind-reward', 'kind-warn', 'kind-error', 'toast-leaving', 'loadout-card', 'loadout-slot',
  'loadout-slot-label', 'loadout-slot-value', 'loadout-slot-hint', 'loadout-card-icon', 'loadout-card-name', 'loadout-card-meta'];
for (const c of classes) {
  const re = new RegExp('\\b' + c + '\\b', 'g');
  const hits = texts.filter(({ t }) => re.test(t)).map(({ f }) => f);
  console.log((hits.length ? 'USED  ' : 'DEAD  ') + c + (hits.length ? '  ← ' + hits.join(', ') : ''));
}
