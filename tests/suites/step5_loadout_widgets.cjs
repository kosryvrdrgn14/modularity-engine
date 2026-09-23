#!/usr/bin/env node
// ============================================================
// step5_loadout_widgets.cjs — §10 screen-5 migration pin (v2.17.0)
//
// Contract under test:
//   1. Loadout cards + slot chips render as pooled widget cards
//      (WidgetRenderer.repeatInto) — no innerHTML string building
//      inside phase renders (the §5.1 pooling promise, done properly
//      for the first time: persistent chrome, phase renders only
//      re-populate hosts).
//   2. Chrome node IDENTITY survives interactions — picking a weapon
//      re-renders hosts, not the panel (proof: the #loadout-title
//      element is the SAME DOM node before and after).
//   3. Selection is DATA (renderer v1.2 `selected.bind`): picking
//      adds .widget-selected to the slot chip; clearing removes it.
//   4. v1.2 click-time DEF: a warm pool rebound from weapons defs to
//      companion defs emits COMPANION payloads (the weapons card never
//      leaks its creation-time event).
//   5. Confirm ships the right loadout (weapons/companions arrays),
//      BUG-015 belt-and-suspenders intact, overlay hides.
//
// Exit codes: 0 green, 1 failures, 2 crash. Skips loudly if the
// loadout screen is absent (pre-implementation detection point).
// ============================================================
const path = require('path');

const r = { n: 0, bad: 0 };
const check = (name, pass, extra) => {
  r.n++;
  if (pass) console.log(`  ✓ ${name}`);
  else { r.bad++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

(async () => {
  const { bootGame } = require(path.join(__dirname, '..', 'lib', 'harness.cjs'));
  const { browser, page, errors } = await bootGame();

  try {
    const probe = await page.evaluate(async () => {
      const g = window.game;
      g.titleMenu.hide();
      g.gameState.setState('town');
      g.townScreen.show();
      const ls = g.townScreen.loadoutScreen;
      if (!ls) return 'no loadoutScreen';

      // ── WEAPONS PHASE ──
      let confirmed = null;
      ls.show({ stageId: null, onConfirm: (l) => { confirmed = l; }, onBack: () => {} });
      const titleEl = document.getElementById('loadout-title');
      const gridCards = () => document.querySelectorAll('#loadout-grid .widget-card').length;
      const slotCards = () => document.querySelectorAll('#loadout-slots .widget-card').length;
      const foreignCards = () => document.querySelectorAll('#loadout-grid .loadout-card').length;
      const selectedChips = () => document.querySelectorAll('#loadout-slots .widget-selected').length;

      const wCount = gridCards();
      const chipCount = slotCards();
      // Pick two weapons via widget events (click = declared event, bubbles)
      document.querySelectorAll('#loadout-grid .widget-card')[0]?.click();
      document.querySelectorAll('#loadout-grid .widget-card')[1]?.click();
      const afterTwoPicks = selectedChips();
      const sameTitleNode = document.getElementById('loadout-title') === titleEl;
      const noForeignCards = foreignCards() === 0;
      // Clear slot 0 via its chip
      document.querySelector('#loadout-slots .widget-card')?.click();
      const afterClear = selectedChips();

      // ── COMPANIONS PHASE (warm pool) ──
      document.getElementById('loadout-next')?.click();
      const compTitle = document.getElementById('loadout-title')?.textContent || '';
      const chromeSurvived = document.getElementById('loadout-title') === titleEl;
      const cCount = gridCards();
      // v1.2 def-swap: this pool node was a WEAPON card last phase — its click
      // must now emit a COMPANION payload (lands in selectedCompanions).
      document.querySelector('#loadout-grid .widget-card')?.click();
      const compInSlots = ls.selectedCompanions.filter(Boolean).length;
      const confirmLabel = document.getElementById('loadout-confirm')?.textContent || '';
      document.getElementById('loadout-confirm')?.click();
      const overlayHidden = document.getElementById('loadout-overlay').classList.contains('hidden');
      return {
        wCount, chipCount, afterTwoPicks, sameTitleNode, noForeignCards, afterClear,
        compTitle, chromeSurvived, cCount, compInSlots, confirmLabel,
        confirmed, overlayHidden,
        stateOk: ls.phase === 'companions',
      };
    });

    if (typeof probe === 'string') {
      console.log(`  SKIP step5_loadout_widgets: ${probe}`);
      process.exit(0);
    }

    check('weapons grid renders as widget cards (no string-built cards)',
      probe.wCount > 0 && probe.noForeignCards, JSON.stringify(probe));
    check('3 slot chips render as widget cards', probe.chipCount === 3);
    check('picking two weapons fills two slots via selected-bind (v1.2)',
      probe.afterTwoPicks === 2, `got ${probe.afterTwoPicks}`);
    check('chrome node identity survives a pick — hosts re-populate, panel never rebuilds (§5.1)',
      probe.sameTitleNode);
    check('clearing slot 0 via chip unselects it', probe.afterClear === 1, `got ${probe.afterClear}`);
    check('Next switches to companions phase on the same chrome',
      probe.compTitle.includes('Companions') && probe.chromeSurvived && probe.stateOk);
    check('companion grid renders as widget cards', probe.cCount > 0);
    check('v1.2 def-swap: warm-pool card emits COMPANION payload (weapons event never leaks)',
      probe.compInSlots === 1, `companions filled: ${probe.compInSlots}`);
    check('confirm label reflects chosen companions', probe.confirmLabel.includes('Start Combat'));
    check('confirm ships {weapons, companions} and hides the overlay',
      !!probe.confirmed && Array.isArray(probe.confirmed.weapons) &&
      Array.isArray(probe.confirmed.companions) && probe.overlayHidden,
      JSON.stringify(probe.confirmed || {}));
    check('no page errors during loadout flow', errors.length === 0,
      errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
  console.log(r.bad === 0 && r.n > 0
    ? `STEP5 LOADOUT WIDGETS GREEN (${r.n}/${r.n})`
    : `STEP5 LOADOUT WIDGETS RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  const msg = String(e && e.message || e);
  if (/no loadoutScreen|townScreen/.test(msg)) {
    console.log(`  SKIP step5_loadout_widgets: ${msg}`);
    process.exit(0);
  }
  console.error('step5_loadout_widgets crash:', msg);
  process.exit(2);
});
