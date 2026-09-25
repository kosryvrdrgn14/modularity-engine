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

    // §7.2 mechanism — reusable scan. Four states, never conflated:
    //   unpresented: not rendered / 0×0 / FULLY outside the viewport (screen
    //     closed — a presentation state, NOT an occlusion bug; hidden screens'
    //     cards legitimately sit at 0×0 until their overlay opens)
    //   clipped (v2.19.16): presented but not fully contained in the viewport
    //     — the old scan only tested the CENTER point, so a card hanging 80px
    //     past the edge passed as fine, and a center-outside partially-visible
    //     card was even misfiled as 'unpresented' (absorbing a real bug into
    //     the benign bucket). Full-rect vs edges now, with per-edge px.
    //   occluded: presented and fully contained but buried (the §7 bug class)
    const scanFn = () => {
      const out = { checked: 0, occluded: [], unpresented: [], contextBuried: [], clipped: [] };
      const label = (inst) => {
        const d = inst.def || {};
        const name = (inst.data && inst.data.item && inst.data.item.name) ||
          (d.slots && d.slots.primaryText && d.slots.primaryText.bind) ||
          (d.onClick && d.onClick.emit) || 'widget';
        return `${d.layout || 'card'} · ${name}`;
      };
      // Fullscreen modals legitimately own the viewport when open — persistent
      // header chips (v2.15.0) are contextually buried, NOT bug-occluded.
      const modalOpen = !!document.querySelector('#shop-overlay.active, #pause-overlay.active, #loadout-overlay:not(.hidden)');
      // Scan EVERY renderer's registry (WidgetRenderer._all, v2.14.0) — the
      // audit owns no assumptions about which screen owns which renderer.
      for (const R of WidgetRenderer._all) {
        for (const inst of R._instances) {
          const el = inst.el;
          if (!el.isConnected) { out.unpresented.push(label(inst)); continue; }
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) { out.unpresented.push(label(inst)); continue; }
          // Fully outside = unpresented (unchanged semantics). PARTIALLY
          // outside = clipped (the new category — edges vs viewport, ±1px tol).
          const fullyOutside = rect.left >= window.innerWidth || rect.top >= window.innerHeight ||
            rect.right <= 0 || rect.bottom <= 0;
          if (fullyOutside) { out.unpresented.push(label(inst)); continue; }
          const over = {
            left: rect.left < -1 ? Math.round(-rect.left) : 0,
            top: rect.top < -1 ? Math.round(-rect.top) : 0,
            right: rect.right > window.innerWidth + 1 ? Math.round(rect.right - window.innerWidth) : 0,
            bottom: rect.bottom > window.innerHeight + 1 ? Math.round(rect.bottom - window.innerHeight) : 0,
          };
          if (over.left || over.top || over.right || over.bottom) {
            out.clipped.push(`${label(inst)} [${Object.entries(over).filter(([, v]) => v).map(([k, v]) => k + '+' + v + 'px').join(' ')}]`);
            continue; // clickability at an off-viewport center is meaningless — the clip IS the finding
          }
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
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

    // ── Shop tab chips (v2.18.0, screen 6): §11 gates at all three viewports.
    // The pilot phase already presents the shop through the REAL open path
    // (townScreen.show() + openShop()) — gate the chip strip here. ──
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(120);
      const tabGates = await page.evaluate(() => {
        const chips = [...document.querySelectorAll('#shop-tabs .widget-card')];
        return {
          count: chips.length,
          clickable: chips.filter((el) => {
            const rct = el.getBoundingClientRect();
            if (rct.width === 0 || rct.height === 0) return false;
            const hit = document.elementFromPoint(rct.left + rct.width / 2, rct.top + rct.height / 2);
            return !!(hit && (hit === el || el.contains(hit)));
          }).length,
          selected: chips.filter((el) => el.classList.contains('widget-selected')).length,
        };
      });
      check(`[§11 gate: shop tabs @ ${vp.name}] 5 chips, all clickable, one selected`,
        tabGates.count === 5 && tabGates.clickable === 5 && tabGates.selected === 1,
        JSON.stringify(tabGates));
    }

    // ── Title menu entries (v2.19.0, screen 7): §11 gates at all three
    // viewports. Presented through the REAL path (titleMenu.show()), gate,
    // then hidden again — the menu must never linger active over other
    // screens' setups (the titleMenu-never-hidden bug class). Single-select
    // via v1.2 selected.bind; locked entries count as clickable (screen CSS
    // keeps pointer-events so the denial sound + tooltip survive). ──
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(120);
      const menuGates = await page.evaluate(() => {
        document.getElementById('shop-overlay')?.classList.remove('active');
        window.game.titleMenu.show();
        const cards = [...document.querySelectorAll('#title-menu .widget-card')];
        const clickable = cards.filter((el) => {
          const rct = el.getBoundingClientRect();
          if (rct.width === 0 || rct.height === 0) return false;
          const hit = document.elementFromPoint(rct.left + rct.width / 2, rct.top + rct.height / 2);
          return !!(hit && (hit === el || el.contains(hit)));
        }).length;
        const sel = cards.filter((el) => el.classList.contains('widget-selected')).length;
        window.game.titleMenu.hide(); // restore baseline for the matrix scan
        return { count: cards.length, clickable, sel };
      });
      check(`[§11 gate: title menu @ ${vp.name}] 8 entries, all clickable, one selected`,
        menuGates.count === 8 && menuGates.clickable === 8 && menuGates.sel === 1,
        JSON.stringify(menuGates));
    }

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
        // v2.19.16: full-rect vs viewport (report-first showed desktop clean).
        check(`[desktop gate] every interactive instance fully within the viewport (no clipping)`,
          res.clipped.length === 0, `clipped: ${res.clipped.join(' ; ')}`);
      } else {
        // §11 report-only: becomes a gate per screen at migration time.
        check(`[${res.name}] scan ran non-vacuously (report-only viewport)`, res.checked > 0);
        const usable = res.occluded.length === 0 && res.clipped.length === 0;
        console.log(`  ◦ [${res.name}] REPORT-ONLY: checked=${res.checked}, occluded=${res.occluded.length}, clipped=${res.clipped.length}, unpresented=${res.unpresented.length} → ${usable ? 'USABLE' : 'HAS ISSUES (promote to gate at this screen\'s migration)'}`);
        if (res.clipped.length) console.log(`      clipped: ${res.clipped.join(' ; ')}`);
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

    // ── Loadout cards (v2.17.0, screen 5): §11 gates at all three viewports.
    // The panel is a scrollable list (max-height 88vh) — parity here means every
    // interactive card is REACHABLE (scroll → clickable, like a real user), so
    // the gate scrolls each card into view before probing. ──
    await page.setViewportSize({ width: 1280, height: 800 });
    const loSeed = await page.evaluate(() => {
      document.getElementById('shop-overlay')?.classList.remove('active');
      document.getElementById('dialogue-overlay')?.classList.remove('active');
      window.game.titleMenu.hide();
      window.game.townScreen.show();
      const ls = window.game.townScreen.loadoutScreen;
      if (!ls) return 'no loadoutScreen';
      ls.show({ stageId: null, onConfirm: () => {}, onBack: () => {} });
      return { cards: document.querySelectorAll('#loadout-grid .widget-card').length };
    });
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(120);
      const lo = await page.evaluate(() => {
        const panel = document.querySelector('#loadout-overlay .loadout-panel');
        const cards = [...panel.querySelectorAll('#loadout-grid .widget-card')];
        const chips = [...panel.querySelectorAll('#loadout-slots .widget-card')];
        const reachable = (el) => {
          el.scrollIntoView({ block: 'center' });
          const rct = el.getBoundingClientRect();
          const hit = document.elementFromPoint(rct.left + rct.width / 2, rct.top + rct.height / 2);
          return !!(hit && (hit === el || el.contains(hit)));
        };
        return {
          cards: cards.length,
          chips: chips.length,
          allCardsReachable: cards.every(reachable),
          allChipsReachable: chips.every(reachable),
        };
      });
      check(`[§11 gate: loadout @ ${vp.name}] cards+chips rendered as widgets`,
        typeof loSeed === 'object' && lo.cards >= 5 && lo.chips === 3,
        JSON.stringify({ loSeed, lo }));
      check(`[§11 gate: loadout @ ${vp.name}] every card reachable (scroll→clickable)`,
        lo.allCardsReachable && lo.allChipsReachable, JSON.stringify(lo));
    }
    await page.evaluate(() => window.game.townScreen.loadoutScreen.hide());

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

    // Negative control for the clipped category (v2.19.16): a live interactive
    // card parked 60px past the right edge MUST be reported clipped (the
    // detector can fail in exactly the direction this category exists for —
    // partial off-screen, which the old center-point scan absorbed silently).
    // Three bridge-safe steps: create → scan → remove (no DOM across the wire).
    await page.evaluate(() => {
      const R = new WidgetRenderer({});
      const stage = document.createElement('div');
      stage.id = '__clip_ctl__';
      stage.style.cssText = 'position:fixed;top:0;left:0;z-index:99998;';
      const inner = document.createElement('div');
      inner.style.cssText = `position:fixed;top:40px;left:${window.innerWidth - 20}px;`; // 20px visible, rest clipped
      stage.appendChild(inner);
      document.body.appendChild(stage);
      // render() (not repeatInto) so the registry entry carries the real data
      // and the audit's label names the card instead of its bind path.
      inner.appendChild(R.render({ template: 'card', layout: 'icon-left',
        slots: { primaryText: { bind: 'item.name' } },
        onClick: { emit: 'clipCtl', payload: {} } }, { item: { name: 'clipctl-card' } }));
    });
    const clipScan = await page.evaluate(scanFn);
    await page.evaluate(() => document.getElementById('__clip_ctl__')?.remove());
    check('negative control: audit detects a partially off-screen card (clipped, can fail)',
      clipScan.clipped.length === 1 && clipScan.clipped[0].includes('clipctl-card') &&
      clipScan.clipped[0].includes('right+'),
      JSON.stringify(clipScan.clipped));

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
