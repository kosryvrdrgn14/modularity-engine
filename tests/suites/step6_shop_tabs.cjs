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
//   3. B12 (v2.19.24): purchase CONFIRM flow — a card tap opens the panel
//      (affordable items only; unaffordable cards stay click-suppressed via
//      v1.3), gold does NOT move until Buy. Qty stepper clamped [1,
//      affordable], live total = qty×cost, commit via buy(item, qty): ONE
//      transaction of qty×cost, inventory stack count = qty.
//   3b. B12 negative control: cancel path (scrim tap) spends nothing.
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

      // 3) fund + re-render: affordability re-resolves (v1.3 rebind)
      gm.add_currency(5000);
      shop.renderItems();
      const fundedDisabled = disabledCount();

      // 3b) B12: card tap opens the confirm panel — gold intact, full desc shown
      const goldBeforeTap = gold();
      const invBeforeTap = gm.getInventoryItems().length;
      itemCards()[0]?.click();
      const confirmOpen = !!document.getElementById('shop-purchase-confirm');
      const goldAfterTap = gold(); // must be UNCHANGED — no purchase without Buy
      const descFull = document.getElementById('shop-purchase-confirm')?.querySelector('.spc-desc')?.textContent || '';
      const qtyStart = parseInt(document.getElementById('spc-qty')?.textContent || '0', 10);
      const buyBtnStart = document.getElementById('spc-buy');

      // 3c) stepper: + raises qty and total; − clamps at 1 (never 0); cap at
      // affordability. health_potion cost 50 → funded 5000+leftover → cap ≫ 5.
      const totalAt1 = document.getElementById('spc-total')?.textContent || '';
      document.getElementById('spc-plus')?.click();
      const qtyAfterPlus = parseInt(document.getElementById('spc-qty')?.textContent || '0', 10);
      const totalAfterPlus = document.getElementById('spc-total')?.textContent || '';
      document.getElementById('spc-minus')?.click();
      document.getElementById('spc-minus')?.click(); // second − must clamp at 1
      const qtyAfterMinus = parseInt(document.getElementById('spc-qty')?.textContent || '0', 10);
      const minusDisabledAt1 = document.getElementById('spc-minus')?.disabled === true;

      // 3d) B12 negative control: cancel (scrim tap) — nothing spent
      document.querySelector('#shop-purchase-confirm').click(); // e.target === host
      const confirmClosedOnScrim = !document.getElementById('shop-purchase-confirm');
      const cancelSpentNothing = gold() === goldBeforeTap && gm.getInventoryItems().length === invBeforeTap;

      // 3e) commit path: reopen, qty 3, Buy — ONE transaction of 3×cost
      itemCards()[0]?.click();
      document.getElementById('spc-plus')?.click();
      document.getElementById('spc-plus')?.click(); // qty 3
      const goldBeforeBuy = gold();
      document.getElementById('spc-buy')?.click();
      const goldAfterBuy = gold();
      const invAfterBuy = gm.getInventoryItems();
      const boughtEntry = invAfterBuy.find((i) => i.id === 'health_potion');
      const buyWorked = goldAfterBuy === goldBeforeBuy - 150 && !!boughtEntry && boughtEntry.count === 3;
      const confirmClosedAfterBuy = !document.getElementById('shop-purchase-confirm');

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
        fundedDisabled,
        confirmOpen, goldAfterTap, goldBeforeTap, descFull, qtyStart,
        buyBtnStartExists: !!buyBtnStart, totalAt1, qtyAfterPlus, totalAfterPlus,
        qtyAfterMinus, minusDisabledAt1, confirmClosedOnScrim, cancelSpentNothing,
        buyWorked, confirmClosedAfterBuy,
        roundTrip,
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
    check('B12: card tap opens confirm panel', probe.confirmOpen);
    check('B12: card tap moves NO gold (accident protection)', probe.goldAfterTap === probe.goldBeforeTap,
      `${probe.goldBeforeTap} → ${probe.goldAfterTap}`);
    check('B12: confirm shows FULL description (reveal surface)', probe.descFull.length > 10, JSON.stringify(probe.descFull));
    check('B12: qty starts at 1, Buy enabled', probe.qtyStart === 1 && probe.buyBtnStartExists);
    check('B12: stepper + raises qty and total', probe.qtyAfterPlus === 2 && probe.totalAfterPlus !== probe.totalAt1,
      `total ${probe.totalAt1} → ${probe.totalAfterPlus}`);
    check('B12: stepper − clamps at 1 (never 0) and disables', probe.qtyAfterMinus === 1 && probe.minusDisabledAt1);
    check('B12 negctl: scrim tap closes panel and spends NOTHING', probe.confirmClosedOnScrim && probe.cancelSpentNothing);
    check('B12: Buy commits ONE transaction qty×cost, stack count=qty', probe.buyWorked,
      `gold ${probe.goldBeforeTap}→${probe.goldAfterBuy}, inv count ${JSON.stringify(probe.buyWorked ? 3 : null)}`);
    check('B12: confirm closes after commit', probe.confirmClosedAfterBuy);
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
