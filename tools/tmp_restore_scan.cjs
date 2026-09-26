#!/usr/bin/env node
// ONE-OFF (delete after run): full bodies of MISSING-LIVE artifact rules.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'tests', 'artifacts', 'widget_preview', '2026-09-24T04-23-14', 'preview.html');

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
function parseRules(css) {
  const out = []; let depth = 0, buf = '';
  for (const ch of css) {
    buf += ch;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { out.push(buf); buf = ''; } }
  }
  return out.map((r) => {
    const i = r.indexOf('{');
    return { selector: r.slice(0, i).trim(), body: r.slice(i + 1, r.length - 1).trim() };
  }).filter((r) => r.selector && !r.selector.startsWith('@'));
}

const artRaw = fs.readFileSync(ART, 'utf8');
const m = artRaw.match(/<style[^>]*>([\s\S]*?)<\/style>/);
const rules = parseRules(strip(m[1]));
const WANT = [
  '#pause-actions .widget-card, #end-actions .widget-card',
  '#dialogue-overlay .widget-card,',
  '#loadout-overlay .widget-card',
  '#loadout-overlay #loadout-slots .widget-card.widget-selected',
  '#loadout-overlay #loadout-slots .widget-card .slot-primaryText',
  '#loadout-overlay #loadout-slots .widget-card.widget-selected .slot-primaryText',
  '#loadout-overlay #loadout-slots .widget-card .slot-secondaryText',
  '#shop-tabs .widget-card.widget-selected',
  '#shop-tabs .widget-card.interactive:hover',
  '#title-menu .widget-card',
  '#title-menu .widget-card .slot-icon',
  '#title-menu .widget-card.widget-disabled',
];
for (const { selector, body } of rules) {
  const selOne = selector.replace(/\s+/g, ' ');
  if (WANT.some((w) => selOne.startsWith(w))) {
    console.log('SEL: ' + selOne);
    console.log('BODY: ' + body.replace(/\s+/g, ' '));
    console.log('---');
  }
}
