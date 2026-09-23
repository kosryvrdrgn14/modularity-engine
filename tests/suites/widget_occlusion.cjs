#!/usr/bin/env node
// ============================================================
// widget_occlusion.cjs — Occlusion Detection (widget_ui_system_spec.md §7)
//   npm run widget:audit   (also registered in tests/run_all.cjs)
//
// Asks the BROWSER whether every rendered interactive widget instance is
// actually clickable at its visual position — the buried/unclickable-element
// bug class hit twice in this project (titleMenu never hidden; shop overlay
// HTML silently deleted during a split). Consumes the renderer's _instances
// registry — the §7 groundwork that every interactive render registers.
//
// Includes a NEGATIVE CONTROL: after the live audit, an overlay is injected
// over the cards and the audit is re-run — it MUST now report occlusion.
// An audit that cannot fail proves nothing.
//
// Exit codes: 0 green, 1 failures, 2 crash. Skips loudly if no renderer
// registry exists (pre-implementation detection point).
// ============================================================
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const r = { n: 0, bad: 0, skips: 0 };
const check = (name, pass, extra) => {
  r.n++;
  if (pass) console.log(`  ✓ ${name}`);
  else { r.bad++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

(async () => {
  const { bootGame } = require(path.join(__dirname, '..', 'lib', 'harness.cjs'));
  const { browser, page, errors } = await bootGame();
  const artifacts = path.join(__dirname, '..', 'artifacts');
  fs.mkdirSync(artifacts, { recursive: true });

  try {
    // Seed the pilot screen (fresh save = empty inventory → the audit would be
    // vacuously green with 0 instances). Same recipe as step3_widget_inventory.
    const seed = await page.evaluate(() => {
      const gm = window.game.gameManager;
      gm._addToInventory({ id: 'health_potion', count: 2 });
      gm._addToInventory({ id: 'probe_tagged', count: 1, category: 'material', tags: ['spider_queen'] });
      const ts = window.game.townScreen;
      if (!ts || !ts.shopSystem) return 'no townScreen/shopSystem';
      ts.show();            // real presentation path — without it, rects are 0×0
      const shop = ts.shopSystem;
      shop.openShop();      // real open path → overlay gets its 'active' class
      shop.currentTab = 'inventory';
      shop.renderItems();
      const R = shop.widgetRenderer;
      return { instances: R && R._instances ? R._instances.size : -1 };
    });
    check('pilot screen renders interactive widget instances',
      typeof seed === 'object' && seed.instances > 0,
      typeof seed === 'string' ? seed : JSON.stringify(seed));

    // §7.2 mechanism — the scan, as a reusable page function (used twice).
    const scanFn = () => {
      const R = window.game.townScreen.shopSystem.widgetRenderer;
      const out = { checked: 0, occluded: [], offscreen: [] };
      const label = (inst) => {
        const d = inst.def || {};
        const name = (inst.data && inst.data.item && inst.data.item.name) ||
          (d.slots && d.slots.primaryText && d.slots.primaryText.bind) ||
          (d.onClick && d.onClick.emit) || 'widget';
        return `${d.layout || 'card'} · ${name}`;
      };
      for (const inst of R._instances) {
        const el = inst.el;
        if (!el.isConnected) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) { out.offscreen.push(label(inst)); continue; }
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (cy < 0 || cx < 0 || cy > window.innerHeight || cx > window.innerWidth) { out.offscreen.push(label(inst)); continue; }
        const hit = document.elementFromPoint(cx, cy);
        out.checked++;
        if (!hit || !(hit === el || el.contains(hit))) out.occluded.push(label(inst));
      }
      return out;
    };

    const live = await page.evaluate(scanFn);
    check('live audit ran non-vacuously (checked > 0)', live.checked > 0, JSON.stringify(live));
    check('every interactive instance clickable at its visual position',
      live.occluded.length === 0,
      `occluded: ${live.occluded.join(' ; ')}`);
    check('no interactive instance offscreen/zero-size',
      live.offscreen.length === 0,
      `offscreen: ${live.offscreen.join(' ; ')}`);

    // Negative control: an overlay that buries the cards MUST be detected.
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = '__audit_cover__';
      d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:transparent';
      document.body.appendChild(d);
    });
    const covered = await page.evaluate(scanFn);
    await page.evaluate(() => { const d = document.getElementById('__audit_cover__'); if (d) d.remove(); });
    check('negative control: audit detects a burying overlay (can fail)',
      covered.occluded.length >= live.checked && covered.checked === live.checked,
      `covered scan: ${JSON.stringify({ checked: covered.checked, occluded: covered.occluded.length })}`);

    check('no page errors during audit', errors.length === 0, errors.slice(0, 3).join(' | '));

    fs.writeFileSync(path.join(artifacts, 'widget_occlusion.json'),
      JSON.stringify({ when: new Date().toISOString(), live, coveredControl: { checked: covered.checked, occluded: covered.occluded.length }, ok: r.bad === 0 }, null, 2));
  } finally {
    await browser.close();
  }
  console.log(r.bad === 0 && r.n > 0 ? `WIDGET OCCLUSION GREEN (${r.n}/${r.n})` : `WIDGET OCCLUSION RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  const msg = String(e && e.message || e);
  // Loud skip = detection point not yet live (pre-implementation convention).
  if (/no shopSystem|widgetRenderer/.test(msg)) {
    console.log(`  SKIP widget_occlusion: ${msg}`);
    process.exit(0);
  }
  console.error('widget_occlusion crash:', msg);
  process.exit(2);
});
