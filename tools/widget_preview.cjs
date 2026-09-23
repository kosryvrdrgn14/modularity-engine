#!/usr/bin/env node
// ============================================================
// widget_preview.cjs — Live-Preview Tool (widget_ui_system_spec.md §6.3)
//   npm run widget:preview
//
// Renders every layout preset × size token × registered skin against rich
// dummy data, PLUS the two contract edge cases: a card with missing DATA
// (must render empty — never throw) and an interactive card (clicking it
// must emit the DECLARED CustomEvent with the resolved payload).
//
// Single source of truth: this tool INLINES the real public/ui/widgetRenderer.js
// and the real widget CSS rules from public/styles.css at run time — no copies
// to drift. The screenshot + self-contained page land in
// tests/artifacts/widget_preview/<stamp>/ for eyeballing skin contrast (§10:
// the manual §4.4 check happens HERE).
//
// Exit codes: 0 green, 1 red.
// ============================================================
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const RENDERER = path.join(ROOT, 'public', 'ui', 'widgetRenderer.js');
const STYLES = path.join(ROOT, 'public', 'styles.css');
const SKINS = path.join(ROOT, 'public', 'content', 'ui_skins.json');

let failed = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failed++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

// ── Gather real sources (fail loudly if any is missing) ──
for (const p of [RENDERER, STYLES, SKINS]) {
  if (!fs.existsSync(p)) { fail(`missing file: ${path.relative(ROOT, p)}`); process.exit(1); }
}
const rendererSrc = fs.readFileSync(RENDERER, 'utf8');
const css = fs.readFileSync(STYLES, 'utf8');
const skinJson = JSON.parse(fs.readFileSync(SKINS, 'utf8'));
const skins = skinJson.skins || skinJson; // accept registry {skins:{...}} or flat map

// Extract every CSS rule that styles widget structure/skins (selector{body} pairs).
const widgetCss = [];
let m;
const blockRe = /([^{}]+)\{([^{}]*)\}/g;
while ((m = blockRe.exec(css))) {
  if (/\.widget-card|\.widget-slot|\.widget-progress/.test(m[1])) widgetCss.push(m[0].trim());
}
if (widgetCss.length === 0) fail('no .widget-* CSS rules found in styles.css — preview would not mirror the game');

// Node-side contract smoke using the REAL renderer class (validate is fail-closed).
// NOTE: require() does not return the class in this environment — the file's
// globalThis bridge is the dependable import path.
require(RENDERER);
const WidgetRenderer = globalThis.WidgetRenderer;
if (typeof WidgetRenderer !== 'function') { fail('widgetRenderer.js did not expose WidgetRenderer on globalThis'); process.exit(1); }
const Rn = new WidgetRenderer({ skins: null });
Rn.validate({ template: 'card', layout: 'icon-left', slots: { icon: { bind: 'a.b' } } });
let threw = false;
try { Rn.validate({ template: 'card', slots: { icon: {} } }); } catch (_) { threw = true; }
if (!threw) fail('renderer.validate() accepted a malformed def (missing bind) — fail-closed broken');
else ok('renderer.validate() fail-closed contract holds (Node side)');

const layouts = WidgetRenderer.LAYOUTS;
const sizes = WidgetRenderer.SIZES;
const skinIds = Object.keys(skins).filter((k) => k !== '_note');

// ── Build the self-contained preview page ──
const showcaseSlots = {
  icon: { bind: 'item.icon' },
  primaryText: { bind: 'item.name' },
  secondaryText: { bind: 'item.desc' },
  badge: { bind: 'item.count' },
  progressBar: { bind: 'item.durability', max: 'item.maxDurability' },
  statusIndicator: { bind: 'item.status' },
};
const demoData = () => ({
  item: { id: 'axe_01', icon: '🪓', name: "Ranger's Axe", desc: 'Cleaves through the horde.', count: '×3', durability: 62, maxDurability: 100, status: 'ready' },
});

const pageHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Widget Preview Matrix</title>
<style>
  body { background: #14161b; color: #ddd; font-family: system-ui, sans-serif; padding: 24px; }
  h2 { margin: 28px 0 10px; font-size: 1rem; color: #9ab; text-transform: uppercase; letter-spacing: .08em; }
  .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  ${widgetCss.join('\n  ')}
</style></head>
<body>
<div id="root"></div>
<script>${rendererSrc}<\/script>
<script>
  const R = new WidgetRenderer({ skins: ${JSON.stringify(skins)}, logger: (...a) => console.log('[skin]', ...a) });
  const SLOTS = ${JSON.stringify(showcaseSlots)};
  const data = ${JSON.stringify(demoData())};
  const root = document.getElementById('root');
  function section(title, nodes) {
    const h = document.createElement('h2'); h.textContent = title; root.appendChild(h);
    const row = document.createElement('div'); row.className = 'row';
    for (const n of nodes) row.appendChild(n);
    root.appendChild(row);
  }
  const LAYOUTS = WidgetRenderer.LAYOUTS, SIZES = WidgetRenderer.SIZES;
  // 1) layouts × sizes (first skin)
  const matrix = [];
  for (const layout of LAYOUTS) for (const size of SIZES)
    matrix.push(R.render({ template: 'card', _v: 1, layout, size, slots: SLOTS }, data));
  section('layouts × sizes', matrix);
  // 2) every registered skin (icon-left / medium)
  const skinGrid = [];
  for (const id of ${JSON.stringify(skinIds)})
    skinGrid.push(R.render({ template: 'card', _v: 1, layout: 'icon-left', size: 'medium', skinId: id, slots: SLOTS }, data));
  section('skins (' + ${JSON.stringify(skinIds.length)} + ')', skinGrid);
  // 3) missing DATA — must render empty, never throw (runtime condition vs schema)
  const missing = R.render({ template: 'card', _v: 1, layout: 'icon-left', slots: SLOTS }, {});
  missing.id = 'preview-missing';
  section('edge: missing data (renders empty)', [missing]);
  // 4) interactive — click emits the DECLARED event with resolved payload
  const inter = R.render({ template: 'card', _v: 1, layout: 'icon-left', slots: { icon: SLOTS.icon, primaryText: SLOTS.primaryText },
    onClick: { emit: 'invItemSelected', payload: { itemId: '{{item.id}}' } } }, data);
  inter.id = 'preview-interactive';
  section('edge: interactive (click → declared event)', [inter]);
  document.addEventListener('invItemSelected', (e) => console.log('[preview-click]', JSON.stringify(e.detail)));
<\/script></body></html>`;

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(ROOT, 'tests', 'artifacts', 'widget_preview', stamp);
fs.mkdirSync(outDir, { recursive: true });
const pagePath = path.join(outDir, 'preview.html');
fs.writeFileSync(pagePath, pageHtml);

// ── Drive it headlessly ──
(async () => {
  console.log('== Widget live preview (§6.3) ==');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const clickEvents = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.text().startsWith('[preview-click]')) clickEvents.push(msg.text());
  });
  await page.goto('file://' + pagePath);
  await page.waitForFunction(() => window.WidgetRenderer && document.querySelectorAll('.widget-card').length > 0, null, { timeout: 10000 });

  const counts = await page.evaluate(() => ({ cards: document.querySelectorAll('.widget-card').length }));
  const expected = layouts.length * sizes.length + skinIds.length + 2;
  if (counts.cards === expected) ok(`${counts.cards}/${expected} preview cards rendered (layouts×sizes + ${skinIds.length} skins + 2 edges)`);
  else fail(`expected ${expected} preview cards, got ${counts.cards}`);

  if (errors.length === 0) ok('no page errors — missing-data edge rendered empty without throwing');
  else fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);

  await page.click('#preview-interactive');
  await page.waitForTimeout(150);
  const clickOk = clickEvents.some((t) => t.includes('"itemId":"axe_01"'));
  if (clickOk) ok("interactive edge: click emitted the DECLARED event with resolved payload ('axe_01')");
  else fail(`interactive edge: declared event not observed (got: ${clickEvents.join(' ; ') || 'nothing'})`);

  const shot = path.join(outDir, 'matrix.png');
  await page.screenshot({ path: shot, fullPage: true });
  ok(`screenshot: ${path.relative(ROOT, shot)} — eyeball skin contrast here (§4.4 manual check, §10)`);

  await browser.close();
  console.log(failed === 0 ? 'PREVIEW GREEN' : `PREVIEW RED — ${failed} problem(s)`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('preview crash:', e.message); process.exit(2); });
