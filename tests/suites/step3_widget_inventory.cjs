// ============================================================
// Suite: Step 3 — Widget Renderer (Card template) + Inventory tags
// Contract (compilation §3 + §5, widget_ui_system_spec.md §2/§8):
//   Card template renders declared slots only; layout presets (not
//   freeform); bounded size/color tokens; repeat-over-array (pooled);
//   onClick emits DECLARED events with templated payloads; schema
//   validation fails loudly; skins are purely visual.
// Inventory half (compilation §3): category/tags extend the EXISTING
//   persistent.inventory — the CANONICAL home (root store.inventory never
//   existed; the shop's buy path crashed on it pre-Step-3). The suite's
//   probe is write-through in memory and NEVER saved.
// Run: node tests/suites/step3_widget_inventory.cjs
// ============================================================
const { bootGame, STEP_DETECTORS, createRunner } = require('../lib/harness.cjs');

(async () => {
  const { browser, page, errors } = await bootGame();
  const detect = () => page.evaluate(STEP_DETECTORS.step3_widget_inventory);

  if (!(await detect())) {
    console.log('SKIP — Step 3 (widget renderer) not implemented yet.');
    console.log('This suite is its definition of done. See widget_ui_system_spec.md §2/§8.');
    await browser.close();
    process.exit(0);
  }

  const r = createRunner({ suiteName: 'step3_widget_inventory' });

  // ── Card template core behaviors (real renderer API) ──
  const widget = await page.evaluate(() => {
    const R = window.WidgetRenderer ? new WidgetRenderer() : window.game.widgetSystem;
    const el = R.render({
      template: 'card',
      layout: 'icon-left',
      slots: {
        icon: { bind: 'npc.portrait' },
        primaryText: { bind: 'npc.name' },
        badge: { bind: 'npc.level' },
      },
      onClick: { emit: 'cardSelected', payload: { id: '{{npc.id}}' } },
    }, { npc: { portrait: '🧙', name: 'Rowan', level: 3, id: 'old_man' } });
    if (!el || el.nodeType !== 1) return { fail: 'render returned nothing' };
    const text = el.textContent || '';
    const clicks = [];
    el.addEventListener('cardSelected', (e) => clicks.push(e.detail));
    el.click();
    return {
      fail: null,
      hasName: text.includes('Rowan'),
      hasLevel: text.includes('3'),
      payload: clicks[0] || null,
      classes: el.className,
    };
  });
  if (widget.fail) {
    r.check('renderer render() returns a DOM element', false, widget.fail);
  } else {
    r.check('bound slot renders (primaryText)', widget.hasName);
    r.check('badge slot renders', widget.hasLevel);
    r.check('onClick emits DECLARED event with templated payload', widget.payload && widget.payload.id === 'old_man', JSON.stringify(widget.payload));
    r.check('layout preset applied as class (icon-left)', widget.classes.includes('layout-icon-left'));
  }

  // ── Optional slots: undeclared slots never render (§2.1) ──
  const slots = await page.evaluate(() => {
    const R = new WidgetRenderer();
    const el = R.render({ template: 'card', slots: { primaryText: { bind: 'a' } } }, { a: 'only' });
    const declared = el.querySelectorAll('[data-slot]').length;
    const primary = el.querySelector('[data-slot="primaryText"]');
    return { declared, primaryOk: primary && primary.textContent === 'only' };
  });
  r.check('only declared slots exist (no forced vocabulary)', slots.declared === 1 && slots.primaryOk);

  // ── Repeat-over-array + pooling (§2.5, §5.1) ──
  const repeat = await page.evaluate(() => {
    const R = new WidgetRenderer();
    const host = document.createElement('div');
    const def = { template: 'card', slots: { primaryText: { bind: 'item.name' } } };
    const mk = (n) => Array.from({ length: n }, (_, i) => ({ item: { name: 'I' + i } }));
    R.repeatInto(host, def, mk(3));
    const nodesAfter3 = host.children.length;
    const firstText1 = host.children[0].textContent;
    R.repeatInto(host, def, mk(5)); // grow: 2 new nodes, 3 reused
    const nodesAfter5 = host.children.length;
    const firstText2 = host.children[0].textContent;
    R.repeatInto(host, def, mk(2)); // shrink: extras hidden, not destroyed
    const visibleAfter2 = Array.from(host.children).filter((c) => c.style.display !== 'none').length;
    const totalAfter2 = host.children.length;
    return { nodesAfter3, nodesAfter5, firstText1, firstText2, visibleAfter2, totalAfter2 };
  });
  r.check('repeat-over-array instantiates one card per element', repeat.nodesAfter3 === 3, JSON.stringify(repeat));
  r.check('pooled rebind reuses nodes (no DOM churn on regrow)', repeat.nodesAfter5 === 5 && repeat.firstText2 === 'I0', JSON.stringify(repeat));
  r.check('pooled shrink hides extras instead of destroying', repeat.visibleAfter2 === 2 && repeat.totalAfter2 === 5);

  // ── Malformed definitions fail LOUDLY (§6.1) ──
  const malformed = await page.evaluate(() => {
    const R = new WidgetRenderer();
    const outcomes = {};
    const attempt = (name, fn) => { try { fn(); outcomes[name] = 'silent'; } catch (e) { outcomes[name] = 'threw'; } };
    attempt('badBind', () => R.render({ template: 'card', slots: { primaryText: { bind: 42 } } }, {}));
    attempt('badTemplate', () => R.render({ template: 'list' }, {}));
    attempt('badLayout', () => R.render({ template: 'card', layout: 'freeform' }, {}));
    attempt('badSize', () => R.render({ template: 'card', size: 'gigantic' }, {}));
    attempt('unknownSlot', () => R.render({ template: 'card', slots: { footer: { bind: 'x' } } }, {}));
    attempt('noEmit', () => R.render({ template: 'card', onClick: { payload: {} } }, {}));
    attempt('progressNoMax', () => R.render({ template: 'card', slots: { progressBar: { bind: 'v' } } }, {}));
    return outcomes;
  });
  const allThrew = Object.values(malformed).every((v) => v === 'threw');
  r.check('schema validation fails loudly on ALL malformed defs', allThrew, JSON.stringify(malformed));

  // ── Skin layer: found skin applies CSS props only; missing skin degrades ──
  const skins = await page.evaluate(() => {
    const skinsData = window.game?.dataManager?.uiSkins || {};
    const R = new WidgetRenderer({ skins: skinsData });
    const withSkin = R.render({ template: 'card', skinId: 'bazaar_cloth', slots: { primaryText: { bind: 'a' } } }, { a: 'x' });
    const bg = withSkin.style.getPropertyValue('--widget-skin-bg');
    const accent = withSkin.style.getPropertyValue('--widget-accent');
    const R2 = new WidgetRenderer({ skins: {} });
    const missing = R2.render({ template: 'card', skinId: 'nope', slots: { primaryText: { bind: 'a' } } }, { a: 'x' });
    return {
      skinRegistered: !!skinsData.bazaar_cloth,
      bgApplied: bg.includes('30, 26, 20'),
      accentApplied: accent.includes('255, 205, 100'),
      missingRendered: missing.nodeType === 1,
      missingClass: missing.className.includes('skin-nope'),
    };
  });
  r.check('pilot skin registered in content pipeline', skins.skinRegistered);
  r.check('skin applies color tokens as CSS custom props (visual only)', skins.bgApplied && skins.accentApplied, JSON.stringify(skins));
  r.check('missing skin degrades to unskinned (structure intact)', skins.missingRendered && skins.missingClass);

  // ── Pilot screen reachable: Inventory tab renders through the widget system ──
  const pilot = await page.evaluate(() => {
    const gm = window.game.gameManager;
    gm._addToInventory({ id: 'health_potion', count: 2 });
    gm._addToInventory({ id: 'probe_tagged', count: 1, category: 'material', tags: ['spider_queen', 'textile'] });
    const shop = window.game.townScreen?.shopSystem;
    if (!shop) return { fail: 'no shopSystem on townScreen' };
    shop.currentMode = 'shop';
    shop.currentTab = 'inventory';
    shop.renderItems();
    const host = document.getElementById('shop-items');
    const cards = host.querySelectorAll('.widget-card');
    return {
      fail: null,
      cardCount: cards.length,
      texts: Array.from(cards).map((c) => (c.textContent || '').trim().slice(0, 40)),
      hasPotion: (cards[0]?.textContent || '').toLowerCase().includes('health potion'),
      hasTagged: Array.from(cards).some((c) => (c.textContent || '').toLowerCase().includes('probe tagged')),
      hasSkin: !!host.querySelector('.widget-card.skin-bazaar_cloth'),
      pooledHost: !!host._widgetPool,
    };
  });
  if (pilot.fail) {
    r.check('pilot screen (Inventory tab) renders via widget system', false, pilot.fail);
  } else {
    r.check('pilot screen (Inventory tab) renders widget cards', pilot.cardCount === 2, JSON.stringify(pilot));
    r.check('shop items resolve display names; tagged item renders', pilot.hasPotion && pilot.hasTagged);
    r.check('pilot skin applied on real screen', pilot.hasSkin);
    r.check('pilot grid uses the pooled path', pilot.pooledHost);
  }

  // ── Gold chip: header wallet is live via the ONE ledger (POT-011) ──
  const goldChip = await page.evaluate(() => {
    const gm = window.game.gameManager;
    const el = document.getElementById('shop-gold');
    const before = gm.get_currency();
    const textMatches = (v) => el && el.textContent.includes(String(v));
    const initialOk = textMatches(before);
    gm.add_currency(777, 'test_gold_chip');
    const afterAdd = gm.get_currency();
    const addOk = textMatches(afterAdd);
    const spent = gm.spend_currency(177, 'test_gold_chip_spend');
    const afterSpend = gm.get_currency();
    const spendOk = spent && textMatches(afterSpend);
    // Restore so later inventory probes start from the original wallet.
    gm.spend_currency(afterSpend - before, 'test_gold_chip_restore');
    const restored = gm.get_currency() === before;
    return { initialOk, addOk, spendOk, restored, before, afterAdd, afterSpend };
  });
  r.check('shop header shows live gold from the one ledger', goldChip.initialOk && goldChip.addOk && goldChip.spendOk, JSON.stringify(goldChip));
  r.check('gold chip test leaves the wallet untouched', goldChip.restored);

  // ── Inventory: category/tags extend the EXISTING canonical shape ──
  const inv = await page.evaluate(() => {
    const gm = window.game.gameManager;
    const store = gm.store;
    const canonical = store.persistent?.inventory;
    const shapeBefore = {
      hasInventory: !!canonical,
      hasConsumables: Array.isArray(canonical?.consumables),
      hasEquipment: !!canonical?.equipment,
    };
    if (gm._addToInventory) gm._addToInventory({ id: 'probe_legacy', count: 1 });
    canonical.consumables.push({ id: 'probe_tagged2', count: 1, category: 'material', tags: ['spider_queen', 'textile'] });
    const items = gm.getInventoryItems();
    const legacy = items.find((i) => i.id === 'probe_legacy');
    const tagged = items.find((i) => i.id === 'probe_tagged2');
    // getEffectiveStats composition (POT-015): equipment bonus map applies.
    canonical.equipment.weapon = 'probe_sword';
    canonical.consumables.push({ id: 'probe_sword', count: 1, bonus: { damage_multiplier: 0.25 } });
    const stats = gm.getEffectiveStats();
    return {
      shapeBefore, legacyOk: !!legacy && legacy.count === 1,
      taggedOk: !!tagged && Array.isArray(tagged.tags),
      statsDamage: stats.damage_multiplier,
      statsHealth: stats.max_health,
    };
  });
  r.check('persistent.inventory keeps equipment/consumables shape', inv.shapeBefore.hasInventory && inv.shapeBefore.hasConsumables && inv.shapeBefore.hasEquipment);
  r.check('legacy {id,count} item and tagged item coexist in consumables', inv.legacyOk && inv.taggedOk);
  r.check('getEffectiveStats composes base + equipment bonus (POT-015)', inv.statsDamage === 1.25 && inv.statsHealth === 100, JSON.stringify(inv));

  // The skin test deliberately renders with a nonexistent skin id ('nope') to
  // prove the degrade path — the renderer's loud warning for it is EXPECTED.
  const unexpectedErrors = errors.filter((e) => !e.includes('[WIDGET] skin "nope" not found'));
  r.check('no page/console errors during suite', unexpectedErrors.length === 0, unexpectedErrors.slice(0, 3).join(' | '));

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
