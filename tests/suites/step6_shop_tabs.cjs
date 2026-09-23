#!/usr/bin/env node
// ============================================================
// step6_shop_tabs.cjs — §10 screen-6 migration pin (v2.18.0)
//
// Contract under test:
//   1. Tab chips are pooled widget cards (5); the ACTIVE tab is DATA
//      (renderer v1.2 selected.bind) — exactly one chip selected at a time.
//   2. Stocked tabs are pooled widget cards; unaffordable items carry
//      widget-disabled (v1.3) AND their clicks are suppressed (gold never
//      moves). Affordability re-resolves on re-render (buy → refresh).
//   3. Purchase flows through the declared widget:shopBuy event: gold
//      deducted, inventory grows.
//   4. THE FORMER PILOT BUG: tab round-trips combat→inventory→combat→
//      inventory render cards EVERY time. Pre-migration, _renderInventory
//      wiped the pooled host so the first round-trip rebound DETACHED nodes
//      and rendered nothing. Also proves the v1.3 def-swap: the same pool
//      carries bazaar_cloth skin (inventory) and plain cards (combat).
//   5. openShop()/close() reset the visible selection to Combat via data.
//
// Exit codes: 0 green, 1 failures, 2 crash. Skips loudly if the shop
// system is absent (pre-implementation detection point).
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
      const shop = g.townScreen?.shopSystem;
      if (!shop) return 'no shopSystem';
      shop.openShop();

      const chips = () => document.querySelectorAll('#shop-tabs .widget-card');
      const itemCards = () => document.querySelectorAll('#shop-items .widget-card');
      const selectedCount = () => [...chips()].filter((c) => c.classList.contains('widget-selected')).length;
      const disabledCount = () => [...itemCards()].filter((c) => c.classList.contains('widget-disabled')).length;
      const gm = g.gameManager;
      const gold = () => gm.get_currency();

      // 1) chips + default selection
      const chipCount = chips().length;
      const combatSelected = selectedCount() === 1 && chips()[0].classList.contains('widget-selected');

      // 2) broke state: every stocked card disabled, click suppressed
      gm.spend_currency(gold(), 'suite_reset');
      const brokeAllDisabled = itemCards().length > 0 && disabledCount() === itemCards().length;
      const goldBeforeClick = gold();
      itemCards()[0]?.click();
      const clickSuppressed = gold() === goldBeforeClick;

      // 3) fund + re-render: affordability re-resolves (v1.3 rebind), buy works
      gm.add_currency(5000);
      shop.renderItems();
      const fundedDisabled = disabledCount();
      const goldBeforeBuy = gold();
      const invBeforeBuy = gm.getInventoryItems().length;
      itemCards()[0]?.click();
      const buyWorked = gold() < goldBeforeBuy && gm.getInventoryItems().length === invBeforeBuy + 1;

      // 4) THE ROUND-TRIP (former pilot bug) + def-swap skin evidence
      const toInventory = () => chips()[4]?.click();
      const toCombat = () => chips()[0]?.click();
      toInventory();
      const inv1 = itemCards().length;
      const skinInInventory = !!document.querySelector('#shop-items .widget-card.skin-bazaar_cloth');
      toCombat();
      const combat1 = itemCards().length;
      const noSkinInCombat = !document.querySelector('#shop-items .widget-card.skin-bazaar_cloth');
      toInventory();
      const inv2 = itemCards().length;
      toCombat();
      const combat2 = itemCards().length;
      const roundTrip = inv1 > 0 && combat1 > 0 && inv2 > 0 && combat2 > 0;

      // 5) close resets selection to combat
      shop.close();
      shop.openShop();
      const resetSelected = selectedCount() === 1 && chips()[0].classList.contains('widget-selected');

      return {
        chipCount, combatSelected, brokeAllDisabled, clickSuppressed,
        fundedDisabled, buyWorked, roundTrip,
        counts: { inv1, combat1, inv2, combat2 },
        skinInInventory, noSkinInCombat, resetSelected,
      };
    });

    if (typeof probe === 'string') {
      console.log(`  SKIP step6_shop_tabs: ${probe}`);
      process.exit(0);
    }

    check('tab strip renders 5 pooled widget chips', probe.chipCount === 5);
    check('active tab is DATA: exactly Combat selected on open', probe.combatSelected);
    check('broke state: every stocked card disabled (v1.3)', probe.brokeAllDisabled);
    check('disabled cards emit NOTHING (click suppressed, gold intact)', probe.clickSuppressed);
    check('affordability re-resolves on re-render after funding', probe.fundedDisabled === 0);
    check('purchase flows through widget:shopBuy (gold down, inventory up)', probe.buyWorked);
    check('tab round-trip ×2 renders cards EVERY time (former pilot pool bug dead)',
      probe.roundTrip, JSON.stringify(probe.counts));
    check('def-swap: bazaar_cloth skin present in inventory, absent in combat',
      probe.skinInInventory && probe.noSkinInCombat);
    check('close→open resets selection to Combat via data', probe.resetSelected);
    check('no page errors during shop flow', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
  console.log(r.bad === 0 && r.n > 0
    ? `STEP6 SHOP TABS GREEN (${r.n}/${r.n})`
    : `STEP6 SHOP TABS RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  const msg = String(e && e.message || e);
  if (/no shopSystem|townScreen/.test(msg)) {
    console.log(`  SKIP step6_shop_tabs: ${msg}`);
    process.exit(0);
  }
  console.error('step6_shop_tabs crash:', msg);
  process.exit(2);
});
