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
const path = require('path');
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

  // ── §4.1 v2 skins: 9-slice border art + texture bg + ornament (v2.19.13) ──
  // bazaar_cloth upgraded to vocabulary v2: image fields land as CSS custom
  // props only (renderer never touches structure — §4.4); styles.css consumes
  // them. Pins: props set, CSS actually resolves them (computed
  // border-image-source + ::after ornament), and pool hygiene (skinned→plain
  // swap leaves ZERO stale art props).
  const v2skin = await page.evaluate(() => {
    const skinsData = window.game?.dataManager?.uiSkins || {};
    const R = new WidgetRenderer({ skins: skinsData });
    const def = { template: 'card', skinId: 'bazaar_cloth', slots: { primaryText: { bind: 'a' } } };
    const el = R.render(def, { a: 'x' });
    document.body.appendChild(el);
    const st = el.style;
    const props = {
      borderImage: st.getPropertyValue('--widget-skin-border-image'),
      slice: st.getPropertyValue('--widget-skin-border-slice'),
      width: st.getPropertyValue('--widget-skin-border-width'),
      bgImage: st.getPropertyValue('--widget-skin-bg-image'),
      bg: st.getPropertyValue('--widget-skin-bg'),
      ornament: st.getPropertyValue('--widget-skin-ornament'),
    };
    const computedBorder = getComputedStyle(el).borderImageSource;
    const computedOrnament = getComputedStyle(el, '::after').backgroundImage;
    el.remove();
    // Pool hygiene: one host, skinned then plain — no stale art may survive.
    const host = document.createElement('div');
    document.body.appendChild(host);
    R.repeatInto(host, def, [{ a: '1' }]);
    R.repeatInto(host, { template: 'card', slots: { primaryText: { bind: 'a' } } }, [{ a: '2' }]);
    const pooled = host.children[0];
    const leftover = ['--widget-skin-border-image', '--widget-skin-border-slice', '--widget-skin-border-width',
      '--widget-skin-bg-image', '--widget-skin-bg', '--widget-skin-ornament', '--widget-accent']
      .filter((p) => pooled.style.getPropertyValue(p) !== '');
    host.remove();
    return { props, computedBorder, computedOrnament, leftover };
  });
  r.check('v2 skin sets 9-slice border + texture + ornament as CSS props (§4.1, visual only)',
    v2skin.props.borderImage.includes('bazaar_border_9slice.svg') &&
    v2skin.props.slice === '16' && v2skin.props.width === '16px' &&
    v2skin.props.bgImage.includes('bazaar_weave.svg') &&
    v2skin.props.bg.includes('30, 26, 20') &&
    v2skin.props.ornament.includes('bazaar_sigil.svg'), JSON.stringify(v2skin.props));
  r.check('styles.css consumes the skin props (computed border-image + ::after ornament)',
    v2skin.computedBorder.includes('bazaar_border_9slice') &&
    v2skin.computedOrnament.includes('bazaar_sigil'),
    JSON.stringify({ border: v2skin.computedBorder, orn: v2skin.computedOrnament }));
  r.check('pool swap skinned→plain leaves zero stale skin props (v2.19.13 hygiene)',
    v2skin.leftover.length === 0, JSON.stringify(v2skin.leftover));

  // ── B11 (v2.19.15): keyboard operability + accessible state (WCAG 2.1.1/4.1.2) ──
  // Every pin has a failing direction on BOTH sides: the interactive checks go
  // red if the renderer under-applies, the plain-card/swap checks go red if it
  // over-applies (a focusable button with no event would be an a11y lie).
  const a11y = await page.evaluate(() => {
    const R = new WidgetRenderer({});
    const mkHost = () => { const h = document.createElement('div'); document.body.appendChild(h); return h; };
    const interDef = { template: 'card', slots: { primaryText: { bind: 'a.id' } },
      onClick: { emit: 'a11yPing', payload: { id: '{{a.id}}' } } };
    const plainDef = { template: 'card', slots: { primaryText: { bind: 'a.id' } } };
    const disabledDef = { template: 'card', slots: { primaryText: { bind: 'a.id' } },
      onClick: { emit: 'a11yPing', payload: {} }, disabled: { bind: 'd' } };
    let kbPayload = null;
    // Scenario A: interactive card — attrs + keyboard activation.
    const hostA = mkHost();
    R.repeatInto(hostA, interDef, [{ a: { id: 'x1' } }]);
    const card = hostA.children[0];
    card.addEventListener('a11yPing', (e) => { kbPayload = e.detail; });
    const role = card.getAttribute('role');
    const tabindex = card.getAttribute('tabindex');
    card.focus();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const enterFired = !!kbPayload && kbPayload.id === 'x1';
    kbPayload = null;
    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    const spaceFired = !!kbPayload && kbPayload.id === 'x1';
    // Scenario B: plain card — no attrs (over-application guard). Own host:
    // repeatInto pools per CONTAINER, so a shared host would rebind, not add.
    const hostB = mkHost();
    R.repeatInto(hostB, plainDef, [{ a: { id: 'p1' } }]);
    const plain = hostB.children[0];
    const plainRole = plain.getAttribute('role');
    const plainTab = plain.getAttribute('tabindex');
    // Scenario C: pool def-swap — the SAME node rebound interactive→plain.
    const hostC = mkHost();
    R.repeatInto(hostC, interDef, [{ a: { id: 'sw0' } }]);
    const swapNode = hostC.children[0];
    R.repeatInto(hostC, plainDef, [{ a: { id: 'sw1' } }]);
    const afterSwapRole = swapNode.getAttribute('role');
    const afterSwapTab = swapNode.getAttribute('tabindex');
    // Scenario D: disabled card — keyboard suppressed (v1.3 discipline).
    const hostD = mkHost();
    R.repeatInto(hostD, disabledDef, [{ a: { id: 'x3' }, d: true }]);
    kbPayload = null;
    hostD.children[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const disabledSuppressed = kbPayload === null;
    for (const h of [hostA, hostB, hostC, hostD]) h.remove();
    return { role, tabindex, enterFired, spaceFired, plainRole, plainTab, afterSwapRole, afterSwapTab, disabledSuppressed };
  });
  r.check('interactive cards expose role=button + tabindex=0 (WCAG 4.1.2)',
    a11y.role === 'button' && a11y.tabindex === '0', JSON.stringify({ role: a11y.role, tabindex: a11y.tabindex }));
  r.check('Enter and Space activate the declared event with resolved payload (WCAG 2.1.1)',
    a11y.enterFired && a11y.spaceFired);
  r.check('plain cards stay inert — no role, no focusability (over-application guard)',
    a11y.plainRole === null && a11y.plainTab === null, JSON.stringify({ role: a11y.plainRole, tab: a11y.plainTab }));
  r.check('pool def-swap syncs a11y attrs (interactive→plain drops them)',
    a11y.afterSwapRole === null && a11y.afterSwapTab === null,
    JSON.stringify({ role: a11y.afterSwapRole, tab: a11y.afterSwapTab }));
  r.check('disabled card: keyboard activation suppressed (v1.3 click-time discipline on the keyboard path)',
    a11y.disabledSuppressed);

  // ── B11 (v2.19.15): visible keyboard focus (WCAG 2.4.7) ──
  // Two honest halves: (1) the rule exists in the stylesheet — checked from
  // disk Node-side, because file:// stylesheets are CSSOM-opaque here
  // (cssRules throws cross-origin). (2) it PAINTS live: a fresh interactive
  // card is staged as the body's FIRST tabbable, one real Tab keystroke focuses
  // it (keyboard-originated → :focus-visible matches), computed outline must
  // be solid. (A random Tab walk proved fragile: hidden-overlay cards are
  // unfocusable and earlier suites leave arbitrary tabbable DOM around.)
  const fs = require('fs');
  const cssText = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'styles.css'), 'utf8');
  const ruleFound = cssText.includes('.widget-card:focus-visible') &&
    cssText.includes('outline: 2px solid var(--widget-accent)');
  await page.evaluate(() => {
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    const host = document.createElement('div');
    host.id = 'a11y-focus-stage';
    const R = new WidgetRenderer({});
    R.repeatInto(host, { template: 'card', slots: { primaryText: { bind: 'a' } },
      onClick: { emit: 'focusProbe', payload: {} } }, [{ a: 'kb' }]);
    document.body.insertBefore(host, document.body.firstChild);
  });
  await page.keyboard.press('Tab');
  const focusLive = await page.evaluate(() => {
    const el = document.activeElement;
    const stage = document.getElementById('a11y-focus-stage');
    const card = stage && stage.querySelector('.widget-card');
    if (!card || el !== card) return { hit: false, outline: null, width: null, matches: false };
    const cs = getComputedStyle(card);
    return { hit: true, outline: cs.outlineStyle, width: cs.outlineWidth, matches: card.matches(':focus-visible') };
  });
  await page.evaluate(() => document.getElementById('a11y-focus-stage')?.remove());
  r.check('focus-visible rule exists and paints on a keyboard-focused widget card (WCAG 2.4.7)',
    ruleFound && focusLive.hit && focusLive.matches && focusLive.outline === 'solid' && focusLive.width !== '0px',
    JSON.stringify({ ruleFound, focusLive }));

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

  // ── §6.4 Widget inspector (v2.19.12): console bridge over WidgetRenderer._all ──
  // Stage A: shop overlay really OPEN (the pilot above only rendered into the
  // hidden host — the inspector's liveness gate must not see parked cards).
  // Stage B: overlay closed, town shown → clean occlusion baseline over the
  // persistent chips, then the built-in negative control: a covering element
  // MUST be flagged — the detector can go red.
  const inspector = await page.evaluate(() => {
    const dbg = window.__WIDGET_DEBUG__;
    if (!dbg) return { fail: '__WIDGET_DEBUG__ not installed at boot' };
    const g = window.game;
    g.titleMenu.hide();
    g.gameState.setState('town');
    g.townScreen.show({});
    const shop = g.townScreen.shopSystem;
    shop.openShop();
    shop.currentTab = 'inventory';
    shop.renderItems();
    const shopCard = document.querySelector('#shop-items .widget-card');
    const listed = dbg.list();
    const one = shopCard ? dbg.inspect(shopCard) : null;
    shop.close();
    const clean = dbg.occlusion();
    const veil = document.createElement('div');
    veil.className = 'occlusion-veil';
    veil.style.cssText = 'position:fixed;inset:0;z-index:99999;';
    document.body.appendChild(veil);
    const veiled = dbg.occlusion();
    veil.remove();
    return {
      fail: null,
      listedCount: listed.length,
      hasShopCard: !!shopCard && listed.some((it) => it.el === shopCard),
      inspectOk: !!one && one.def.template === 'card' && !!(one.def.slots && typeof one.def.slots === 'object'),
      inspectData: one ? one.data : null,
      cleanChecked: clean.checked, cleanFlagged: clean.flagged,
      veiledChecked: veiled.checked, veiledFlagged: veiled.flagged.length,
      veilSeen: veiled.flagged.some((f) => String(f.coveredBy).includes('occlusion-veil')),
    };
  });
  if (inspector.fail) {
    r.check('§6.4 inspector installed (window.__WIDGET_DEBUG__)', false, inspector.fail);
  } else {
    r.check('§6.4 inspector lists live cards across renderer instances (incl. shop pilot)',
      inspector.listedCount > 0 && inspector.hasShopCard, `listed=${inspector.listedCount}`);
    r.check('§6.4 inspect() returns the producing def + resolved data',
      inspector.inspectOk && !!inspector.inspectData, JSON.stringify(inspector.inspectData || {}));
    // inspectOk = def.template==='card' + slots is the spec OBJECT (bind map),
    // not list()'s names array — assert the data too (checked above).
    r.check('§7.2 occlusion audit: interactive cards reachable on a clean stage',
      inspector.cleanChecked > 0 && inspector.cleanFlagged.length === 0,
      JSON.stringify({ checked: inspector.cleanChecked, flagged: inspector.cleanFlagged }));
    r.check('§7.2 occlusion negative control: a covering element IS flagged (detector can go red)',
      inspector.veiledChecked === inspector.cleanChecked && inspector.veiledFlagged > 0 && inspector.veilSeen,
      JSON.stringify({ flagged: inspector.veiledFlagged, veilSeen: inspector.veilSeen }));
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
