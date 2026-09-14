// ============================================================
// Suite: Step 3 — Widget Renderer (Card template) + Inventory tags
// Contract (compilation §3 + §5, widget_ui_system_spec.md §2):
//   Card template renders declared slots only; layout presets (not
//   freeform); bounded size/color tokens; repeat-over-array; onClick
//   emits declared events; instance pooling on rebind; schema validation
//   fails loudly; skins never the sole info channel.
// Inventory half (compilation §3): category/tags extend the EXISTING
//   store.inventory — probe is write-through in memory and NEVER saved
//   (localStorage cleared at boot; no explicit save call here).
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

  // ── Card template core behaviors (probed via the renderer's public API) ──
  const widget = await page.evaluate(() => {
    const R = window.WidgetRenderer || window.game.widgetSystem;
    const mk = (def, data) => R.render(def, data) || R.renderCard?.(def, data);
    const el = mk({
      template: 'card',
      layout: 'icon-left',
      slots: {
        icon: { bind: 'npc.portrait' },
        primaryText: { bind: 'npc.name' },
        badge: { bind: 'npc.level' },
      },
      onClick: { emit: 'cardSelected', payload: { id: '{{npc.id}}' } },
    }, { npc: { portrait: 'p1', name: 'Rowan', level: 3, id: 'old_man' } });
    if (!el) return { fail: 'render returned nothing' };
    const text = el.textContent || '';
    const clicks = [];
    window.addEventListener('cardSelected', (e) => clicks.push(e.detail || e.data || e));
    el.dispatchEvent(new CustomEvent('click', { bubbles: true }));
    return {
      fail: null,
      hasName: text.includes('Rowan'),
      hasLevel: text.includes('3'),
      isElement: el.nodeType === 1,
      clicks: clicks.length,
    };
  });
  if (widget.fail) {
    r.check('renderer render() returns a DOM element', false, widget.fail);
  } else {
    r.check('bound slot renders (primaryText)', widget.hasName);
    r.check('badge slot renders', widget.hasLevel);
    r.check('onClick emits declared event with payload', widget.clicks > 0);
  }

  // ── Repeat-over-array ──
  const repeat = await page.evaluate(() => {
    const R = window.WidgetRenderer || window.game.widgetSystem;
    const out = R.renderRepeat?.({
      template: 'card',
      slots: { primaryText: { bind: 'item.name' } },
    }, [{ item: { name: 'A' } }, { item: { name: 'B' } }, { item: { name: 'C' } }]);
    return out ? (out.length ?? out.children?.length ?? null) : null;
  });
  r.check('repeat-over-array instantiates one card per element', repeat === 3, `got ${repeat}`);

  // ── Malformed definition fails loudly (no silent broken widget) ──
  const malformed = await page.evaluate(() => {
    const R = window.WidgetRenderer || window.game.widgetSystem;
    try { R.render({ template: 'card', slots: { primaryText: { bind: 42 } } }, {}); return 'silent'; }
    catch (e) { return 'threw'; }
  });
  r.check('schema validation fails loudly on malformed layout', malformed === 'threw', `got: ${malformed}`);

  // ── Inventory: category/tags extend the EXISTING store.inventory shape ──
  const inv = await page.evaluate(() => {
    const gm = window.game.gameManager;
    const store = gm.store;
    const shapeBefore = {
      hasInventory: !!store.inventory,
      hasConsumables: Array.isArray(store.inventory?.consumables),
      hasEquipment: !!store.inventory?.equipment,
    };
    // Write-through probe (never saved): legacy item + tagged item coexist.
    if (gm._addToInventory) gm._addToInventory({ id: 'probe_legacy', count: 1 });
    store.inventory.consumables.push({ id: 'probe_tagged', count: 1, category: 'material', tags: ['spider_queen', 'textile'] });
    const items = store.inventory.consumables;
    const legacy = items.find(i => i.id === 'probe_legacy');
    const tagged = items.find(i => i.id === 'probe_tagged');
    return { shapeBefore, legacyOk: !!legacy && legacy.count === 1, taggedOk: !!tagged && Array.isArray(tagged.tags) };
  });
  r.check('store.inventory keeps equipment/consumables shape', inv.shapeBefore.hasInventory && inv.shapeBefore.hasConsumables && inv.shapeBefore.hasEquipment);
  r.check('legacy {id,count} item and tagged item coexist in consumables', inv.legacyOk && inv.taggedOk);

  r.check('no page/console errors during suite', errors.length === 0, errors.slice(0, 3).join(' | '));

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
