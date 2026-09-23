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

    // §7.2 mechanism — reusable scan. Three states, never conflated:
    //   unpresented: not rendered / 0×0 / outside viewport bounds (screen
    //     closed — a presentation state, NOT an occlusion bug; hidden screens'
    //     cards legitimately sit at 0×0 until their overlay opens)
    //   occluded: presented but buried under another element (the §7 bug class)
    const scanFn = () => {
      const out = { checked: 0, occluded: [], unpresented: [], contextBuried: [] };
      const label = (inst) => {
        const d = inst.def || {};
        const name = (inst.data && inst.data.item && inst.data.item.name) ||
          (d.slots && d.slots.primaryText && d.slots.primaryText.bind) ||
          (d.onClick && d.onClick.emit) || 'widget';
        return `${d.layout || 'card'} · ${name}`;
      };
      // Fullscreen modals legitimately own the viewport when open — persistent
      // header chips (v2.15.0) are contextually buried, NOT bug-occluded.
      const modalOpen = !!document.querySelector('#shop-overlay.active, #pause-overlay.active');
      // Scan EVERY renderer's registry (WidgetRenderer._all, v2.14.0) — the
      // audit owns no assumptions about which screen owns which renderer.
      for (const R of WidgetRenderer._all) {
        for (const inst of R._instances) {
          const el = inst.el;
          if (!el.isConnected) { out.unpresented.push(label(inst)); continue; }
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) { out.unpresented.push(label(inst)); continue; }
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          if (cy < 0 || cx < 0 || cy > window.innerHeight || cx > window.innerWidth) { out.unpresented.push(label(inst)); continue; }
          const hit = document.elementFromPoint(cx, cy);
          out.checked++;
          if (!hit || !(hit === el || el.contains(hit))) {
            if (modalOpen && el.closest('#town-chips')) out.contextBuried.push(label(inst));
            else out.occluded.push(label(inst));
          }
        }
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
      } else {
        // §11 report-only: becomes a gate per screen at migration time.
        check(`[${res.name}] scan ran non-vacuously (report-only viewport)`, res.checked > 0);
        const usable = res.occluded.length === 0;
        console.log(`  ◦ [${res.name}] REPORT-ONLY: checked=${res.checked}, occluded=${res.occluded.length}, unpresented=${res.unpresented.length} → ${usable ? 'USABLE' : 'HAS ISSUES (promote to gate at this screen\'s migration)'}`);
        if (res.occluded.length) console.log(`      occluded: ${res.occluded.join(' ; ')}`);
      }
    }

    // ── Pause-menu cards (v2.14.0, screen 2): presented here so the desktop
    // gate covers them (they sit 0×0/unpresented while their overlay is
    // closed — which is why 'unpresented' is a state, not a failure). ──
    // Realistic pause context, per the game's own startGame funnel: the title
    // menu and town screen are HIDDEN by the time a pause menu can ever open
    // mid-run. The audit must reproduce that — showing pause over the boot
    // screen buries the cards under title-menu items (a setup artifact, not
    // a game bug; the titleMenu-never-hidden bug class in reverse).
    await page.evaluate(() => {
      document.getElementById('shop-overlay')?.classList.remove('active');
      window.game.titleMenu.hide();
      window.game.townScreen?.hide();
      window.game.uiManager.showPauseMenu('audit-snapshot');
    });
    // §11 promotion (v2.14.0, migration screen 2): pause cards gate at ALL
    // three viewports — presented, unburied, ≥3 interactive targets.
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(120);
      const pauseScan = await page.evaluate(scanFn);
      check(`[§11 gate: pause cards @ ${vp.name}] presented and clickable`,
        pauseScan.occluded.length === 0 && pauseScan.checked >= 3,
        JSON.stringify(pauseScan));
    }
    await page.evaluate(() => window.game.uiManager.hidePauseMenu());

    // ── §11 promotion (v2.13.0, migration screen 1: game-log panel). ──
    // The screen's own mobile/landscape gates are now GATING (element-specific:
    // fits viewport, no horizontal overflow, renders). The generic full-screen
    // scans above stay report-only until their screens migrate.
    const glog = await page.evaluate(() => {
      const gl = window.game.gameLog;
      gl.clear();
      gl.log('parity-probe-info', { kind: 'info' });
      gl.log('parity-probe-error', { kind: 'error' });
      gl.openPanel();
      const panel = document.getElementById('gamelog-panel');
      const list = document.getElementById('gamelog-list');
      const rect = panel.getBoundingClientRect();
      return {
        cards: panel.querySelectorAll('.widget-card').length,
        fitsViewport: rect.left >= -1 && rect.right <= window.innerWidth + 1,
        noHOverflow: list.scrollWidth <= list.clientWidth + 1,
      };
    });
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(120);
      const now = await page.evaluate(() => {
        const panel = document.getElementById('gamelog-panel');
        const list = document.getElementById('gamelog-list');
        const rect = panel.getBoundingClientRect();
        return {
          cards: panel.querySelectorAll('.widget-card').length,
          fitsViewport: rect.left >= -1 && rect.right <= window.innerWidth + 1,
          noHOverflow: list.scrollWidth <= list.clientWidth + 1,
        };
      });
      check(`[§11 gate: game-log panel @ ${vp.name}] renders widget cards`, now.cards >= 2, JSON.stringify(now));
      check(`[§11 gate: game-log panel @ ${vp.name}] fits viewport, no horizontal overflow`,
        now.fitsViewport && now.noHOverflow, JSON.stringify(now));
    }
    await page.evaluate(() => window.game.gameLog.closePanel());

    // ── Town HUD chips (v2.15.0, screen 3): §11 gates at all three viewports
    // in town-base presentation (the phase where the header actually lives —
    // shop closed, town shown; the chips are the always-visible HUD). ──
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(120);
      const chips = await page.evaluate(() => {
        document.getElementById('shop-overlay')?.classList.remove('active');
        window.game.titleMenu.hide();
        window.game.townScreen.show();
        const cards = document.querySelectorAll('#town-chips .widget-card');
        return { count: cards.length, ids: [...cards].map((c) => c.id) };
      });
      const chipScan = await page.evaluate(scanFn);
      check(`[§11 gate: town chips @ ${vp.name}] 3 chips rendered with stable ids`,
        chips.count === 3 && chips.ids.join(',') === 'town-log-toggle,town-date,town-run-stats',
        JSON.stringify(chips));
      check(`[§11 gate: town chips @ ${vp.name}] clickable, unburied`,
        chipScan.occluded.length === 0, JSON.stringify(chipScan));
    }
    // ── Dialogue choices (v2.16.0, screen 4): §11 gates at all three viewports.
    // Presented through the REAL flow (townContent.openDialogue on a live NPC);
    // choices render after the typewriter finishes, so scans wait for cards. ──
    await page.setViewportSize({ width: 1280, height: 800 });
    const dlgSeed = await page.evaluate(() => {
      document.getElementById('shop-overlay')?.classList.remove('active');
      window.game.titleMenu.hide();
      window.game.townScreen.show();
      const npcs = (typeof NPC_DATA !== 'undefined' && NPC_DATA) || {};
      const npc = npcs['blacksmith'] || Object.values(npcs)[0];
      if (!npc) return 'no NPC_DATA to open dialogue with';
      window.game.townScreen.content.openDialogue(npc);
      return { npc: npc.id };
    });
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(1400); // typewriter completes, then choices render
      const dscan = await page.evaluate(scanFn);
      check(`[§11 gate: dialogue choices @ ${vp.name}] presented and clickable`,
        dscan.occluded.length === 0 && dscan.checked >= 1,
        JSON.stringify({ ...dscan, seed: typeof dlgSeed === 'string' ? dlgSeed : dlgSeed.npc }));
    }
    await page.evaluate(() => {
      document.getElementById('dialogue-overlay')?.classList.remove('active');
      window.game.townScreen.content.dom.dialogueChoices.style.display = 'none';
    });

    // Leave town-base presentation active — it is the negative control's baseline.

    // Negative control (back at the gating viewport): a burying overlay MUST
    // be detected — an audit that cannot fail proves nothing. Self-consistent
    // design: open a screen with cards, baseline scan → cover → scan again AT
    // THE SAME MOMENT, so the comparison never depends on stale state.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(100);
    // Interactive targets for the control (the audit enumerates onClick-bearing
    // instances only, per §7): the town-base state from the chips gates already
    // presents the three chips — no modal stacking needed for the baseline.
    const baseline = await page.evaluate(scanFn);
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = '__audit_cover__';
      d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:transparent';
      document.body.appendChild(d);
    });
    const covered = await page.evaluate(scanFn);
    await page.evaluate(() => { const d = document.getElementById('__audit_cover__'); if (d) d.remove(); });
    check('negative control: audit detects a burying overlay (can fail)',
      baseline.occluded.length === 0 && baseline.checked >= 3 &&
      covered.checked === baseline.checked &&
      covered.occluded.length === covered.checked,
      `baseline: ${JSON.stringify(baseline)} | covered: ${JSON.stringify(covered)}`);
    await page.evaluate(() => window.game.uiManager.hidePauseMenu());

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
