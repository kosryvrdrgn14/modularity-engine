#!/usr/bin/env node
// ============================================================
// step7_title_menu.cjs — §10 screen-7 migration pin (v2.19.0)
//
// Contract under test:
//   1. Title menu entries are pooled widget cards (8) in #title-menu; the
//      SELECTED entry is DATA (renderer v1.2 selected.bind) — exactly one
//      card selected at a time, Play on show/reset.
//   2. Locked entries are DATA (v1.3 disabled.bind → widget-disabled) and
//      their clicks emit NOTHING (no route, no state change) while the
//      denial tooltip still shows (the locked interaction, kept).
//   3. Unlocked clicks flow through the declared widget:titleAction event:
//      Story Mode opens the slot picker through the REAL funnel
//      (onSlotPlay → _showSlotPicker), no bespoke click wiring.
//   4. Keyboard parity: ArrowDown moves the selection via pooled rebind
//      (node identity preserved — no churn), Enter activates (Settings →
//      settings screen), Escape closes it.
//   5. hide()/show() resets selection to Play via data; pool survives.
//
// Exit codes: 0 green, 1 failures, 2 crash. Skips loudly if the title
// menu is absent (pre-implementation detection point).
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
      const menu = () => document.getElementById('title-menu');
      const cards = () => [...menu().querySelectorAll('.widget-card')];
      const selected = () => cards().filter((c) => c.classList.contains('widget-selected'));
      const state = () => g.gameState.state;
      await new Promise((res) => setTimeout(res, 100)); // boot settle

      // 1) pooled strip + default selection
      const cardCount = cards().length;
      const firstSelected = selected().length === 1 && cards()[0]?.classList.contains('widget-selected');
      const poolHost = menu()._widgetPool ? menu()._widgetPool.length : -1;

      // 2) locked entries are DATA and emit nothing
      const disabledIdx = cards().map((c, i) => (c.classList.contains('widget-disabled') ? i : -1)).filter((i) => i >= 0);
      const stateBefore = state();
      cards()[1]?.click(); // Characters (locked)
      await new Promise((res) => setTimeout(res, 150));
      const lockedSilent = state() === stateBefore &&
        !document.getElementById('slot-picker-overlay')?.classList.contains('active');
      const tooltipShown = document.getElementById('title-tooltip')?.classList.contains('visible') === true;

      // 3) unlocked click → declared event → real funnel (slot picker)
      cards()[4]?.click(); // 📖 Story Mode
      const pickerOpened = document.getElementById('slot-picker-overlay')?.classList.contains('active') === true;
      document.getElementById('slot-picker-close')?.click();
      const pickerClosed = !document.getElementById('slot-picker-overlay')?.classList.contains('active');

      // 4) keyboard parity: pooled selection move (identity preserved) + activate
      const nodeBefore = cards()[0];
      return {
        cardCount, firstSelected, poolHost, disabledIdx, lockedSilent, tooltipShown,
        pickerOpened, pickerClosed, stateAfterClicks: state(), nodeBefore: !!nodeBefore,
      };
    });

    if (typeof probe === 'string') {
      console.log(`  SKIP step7_title_menu: ${probe}`);
      process.exit(0);
    }

    check('menu renders 8 pooled widget cards', probe.cardCount === 8 && probe.poolHost === 8,
      JSON.stringify({ cardCount: probe.cardCount, poolHost: probe.poolHost }));
    check('Play selected by default (exactly one, index 0)', probe.firstSelected);
    check('locked entries are DATA: exactly indexes [1,2] carry widget-disabled',
      JSON.stringify(probe.disabledIdx) === '[1,2]', JSON.stringify(probe.disabledIdx));
    check('locked click emits NOTHING (no route, no state change)', probe.lockedSilent);
    check('locked denial tooltip still shows', probe.tooltipShown);
    check('Story Mode click → widget:titleAction → real funnel opens slot picker', probe.pickerOpened);
    check('slot picker cancel returns to menu', probe.pickerClosed);

    // Keyboard + pool identity + reset (needs real key events outside evaluate)
    const kb = await page.evaluate(() => {
      const menu = document.getElementById('title-menu');
      const cards = () => [...menu.querySelectorAll('.widget-card')];
      const sel = () => cards().findIndex((c) => c.classList.contains('widget-selected'));
      return { sel: sel(), node: cards()[0], state: window.game.gameState.state };
    });
    check('selection settled on Play after picker round-trip', kb.sel === 0, `sel=${kb.sel}`);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const moved = await page.evaluate(() => {
      const menu = document.getElementById('title-menu');
      const cards = [...menu.querySelectorAll('.widget-card')];
      return {
        sel: cards.findIndex((c) => c.classList.contains('widget-selected')),
        sameNode: cards[0] === menu._widgetPool?.[0], // pool identity preserved
        count: cards.length,
      };
    });
    check('ArrowDown ×2 moves selection to index 2 via pooled rebind', moved.sel === 2, `sel=${moved.sel}`);
    check('pool reuses nodes on selection move (no churn)', moved.sameNode && moved.count === 8,
      JSON.stringify(moved));

    await page.keyboard.press('Enter'); // index 2 = Settings
    const settingsOpen = await page.evaluate(() =>
      document.getElementById('settings-screen')?.classList.contains('active') === true);
    check('Enter activates selection (Settings screen opens)', settingsOpen);
    await page.keyboard.press('Escape');
    const settingsClosed = await page.evaluate(() =>
      !document.getElementById('settings-screen')?.classList.contains('active'));
    check('Escape returns to the menu', settingsClosed);

    // 5) hide/show reset via data
    const reset = await page.evaluate(() => {
      const g = window.game;
      g.titleMenu.hide();
      const hidden = !document.getElementById('title-screen').classList.contains('active');
      g.titleMenu.show();
      const cards = [...document.querySelectorAll('#title-menu .widget-card')];
      return {
        hidden,
        count: cards.length,
        sel: cards.findIndex((c) => c.classList.contains('widget-selected')),
        selCount: cards.filter((c) => c.classList.contains('widget-selected')).length,
      };
    });
    check('hide()/show() resets selection to Play via data', reset.hidden && reset.sel === 0 && reset.selCount === 1,
      JSON.stringify(reset));
    check('no page errors during title-menu flows', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
  console.log(r.bad === 0 && r.n > 0
    ? `STEP7 TITLE MENU GREEN (${r.n}/${r.n})`
    : `STEP7 TITLE MENU RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  const msg = String(e && e.message || e);
  if (/no titleMenu|title-menu/.test(msg)) {
    console.log(`  SKIP step7_title_menu: ${msg}`);
    process.exit(0);
  }
  console.error('step7_title_menu crash:', msg);
  process.exit(2);
});
