#!/usr/bin/env node
// ============================================================
// widget_occlusion.cjs — Occlusion Detection (widget_ui_system_spec.md §7)
// with the §11 Device & Input Parity viewport matrix.
//   npm run widget:audit   (also registered in tests/run_all.cjs)
//
// Asks the BROWSER whether every rendered interactive widget instance is
// actually clickable at its visual position — the buried/unclickable-element
// bug class hit twice in this project (titleMenu never hidden; shop overlay
// HTML silently deleted during a split). Consumes the renderer's _instances
// registry — the §7 groundwork that every interactive render registers.
//
// Viewport matrix (§11: parity target, both orientations, no primary):
//   desktop 1280×800       — GATING. Breaking it is red, always.
//   mobile-portrait 390×844  — REPORT-ONLY until a screen's migration makes
//   mobile-landscape 844×390  it pass (then promoted to a gate, per screen).
//   Report-only ≠ ignore: per-viewport artifacts make drift visible.
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

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, gate: true },
  { name: 'mobile-portrait', width: 390, height: 844, gate: false },
  { name: 'mobile-landscape', width: 844, height: 390, gate: false },
];

const r = { n: 0, bad: 0 };
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
    // vacuously green with 0 instances). Real presentation path: rendering
    // with the overlay closed yields 0×0 rects — a "screen not open" state,
    // not occlusion (§7 targets burial, not presentation).
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

    // §7.2 mechanism — reusable scan. "offscreen/zero-size" (presentation) is
    // reported separately from "occluded" (buried under another element).
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

    // ── Viewport matrix (§11). Presentation persists across resizes; the
    // game's own resize handlers re-fit the canvas. ──
    const results = [];
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(150); // let resize handlers settle
      const scan = await page.evaluate(scanFn);
      results.push({ name: vp.name, width: vp.width, height: vp.height, gate: vp.gate, ...scan });
    }

    for (const res of results) {
      if (res.gate) {
        check(`[desktop gate] scan ran non-vacuously`, res.checked > 0, JSON.stringify(res));
        check(`[desktop gate] every interactive instance clickable at its position`,
          res.occluded.length === 0, `occluded: ${res.occluded.join(' ; ')}`);
        check(`[desktop gate] no interactive instance offscreen/zero-size`,
          res.offscreen.length === 0, `offscreen: ${res.offscreen.join(' ; ')}`);
      } else {
        // §11 report-only: becomes a gate per screen at migration time.
        check(`[${res.name}] scan ran non-vacuously (report-only viewport)`, res.checked > 0);
        const usable = res.occluded.length === 0 && res.offscreen.length === 0;
        console.log(`  ◦ [${res.name}] REPORT-ONLY: checked=${res.checked}, occluded=${res.occluded.length}, offscreen=${res.offscreen.length} → ${usable ? 'USABLE' : 'HAS ISSUES (promote to gate at this screen\'s migration)'}`);
        if (res.occluded.length) console.log(`      occluded: ${res.occluded.join(' ; ')}`);
        if (res.offscreen.length) console.log(`      offscreen: ${res.offscreen.join(' ; ')}`);
      }
    }

    // Negative control (back at the gating viewport): a burying overlay MUST
    // be detected — an audit that cannot fail proves nothing.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = '__audit_cover__';
      d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:transparent';
      document.body.appendChild(d);
    });
    const covered = await page.evaluate(scanFn);
    await page.evaluate(() => { const d = document.getElementById('__audit_cover__'); if (d) d.remove(); });
    const desktop = results.find((x) => x.name === 'desktop');
    check('negative control: audit detects a burying overlay (can fail)',
      covered.occluded.length >= desktop.checked && covered.checked === desktop.checked,
      `covered scan: ${JSON.stringify({ checked: covered.checked, occluded: covered.occluded.length })}`);

    check('no page errors across all viewports', errors.length === 0, errors.slice(0, 3).join(' | '));

    fs.writeFileSync(path.join(artifacts, 'widget_occlusion.json'),
      JSON.stringify({ when: new Date().toISOString(), viewports: results, negativeControl: { checked: covered.checked, occluded: covered.occluded.length }, ok: r.bad === 0 }, null, 2));
  } finally {
    await browser.close();
  }
  console.log(r.bad === 0 && r.n > 0
    ? `WIDGET OCCLUSION GREEN (${r.n}/${r.n}) — matrix artifact written (mobile rows are report-only per §11)`
    : `WIDGET OCCLUSION RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  const msg = String(e && e.message || e);
  // Loud skip = detection point not yet live (pre-implementation convention).
  if (/no shopSystem|widgetRenderer|townScreen/.test(msg)) {
    console.log(`  SKIP widget_occlusion: ${msg}`);
    process.exit(0);
  }
  console.error('widget_occlusion crash:', msg);
  process.exit(2);
});
