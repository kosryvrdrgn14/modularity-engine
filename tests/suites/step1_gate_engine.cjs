// ============================================================
// Suite: Step 1 — Generic Condition/Gate Engine
// Contract (data_driven_systems_compilation.md §1 + §6 step 1):
//   condition-object parser, all/any/not recursion, typed conditions
//   (flag / questState / affectionTier), no-silent-fail policy,
//   load-time validation; existing id-keyed lookups keep working.
// Active when the harness detector sees the engine (escape hatch:
//   set window.__STEP1_GATE_ENGINE__ = true from the console to opt in early).
// Until then: loud SKIP, exit 0 — this suite is the step's definition
//   of done, so an implementation is NOT done while this shows SKIP.
// Run: node tests/suites/step1_gate_engine.cjs
// ============================================================
const { bootGame, STEP_DETECTORS, createRunner } = require('../lib/harness.cjs');

(async () => {
  const { browser, page, errors } = await bootGame();
  const detect = () => page.evaluate(STEP_DETECTORS.step1_gate_engine);

  if (!(await detect())) {
    console.log('SKIP — Step 1 (condition/gate engine) not implemented yet.');
    console.log('This suite is its definition of done. See data_driven_systems_compilation.md §1.');
    await browser.close();
    process.exit(0);
  }

  const r = createRunner({ suiteName: 'step1_gate_engine' });

  // Error-net baseline: the no-silent-fail probes BELOW deliberately log
  // rejections (that is the behavior under test). Everything after them
  // must be silent — asserted as an exact count at the end.
  const errBefore = errors.length;

  // In-page scenario harness: evaluate conditions against a controlled state snapshot.
  // The engine contract: evaluate(condition, context) -> boolean; unknown condition
  // shapes REJECT loudly (no-silent-fail), never return true-by-default.
  await page.evaluate(() => {
    window.__g = window.game;
    const eng = window.__g.dataManager?.conditionEngine ||
                window.GateEngine || window.__g.gameManager;
    window.__eval = (cond, ctx) => eng.evaluateCondition
      ? eng.evaluateCondition(cond, ctx)
      : eng.evaluate(cond, ctx);
    window.__ctx = {
      flags: { lich_defeated: true, married_spider_queen: false, season: 'winter' },
      quests: { necromancer_trial: 'completed', mq_01: 'active' },
      affection: { spider_queen: 65 }, // tier index: Trust at 60+
      seq: 10,
    };
  });

  const ev = (cond) => page.evaluate(([c]) => {
    try { return { ok: true, val: window.__eval(c, window.__ctx) }; }
    catch (e) { return { ok: false, err: String(e).slice(0, 120) }; }
  }, [cond]);

  // ── Typed leaf conditions ──
  r.check('flag equals:true', (await ev({ flag: 'lich_defeated', equals: true })).val === true);
  r.check('flag equals:false on false flag', (await ev({ flag: 'married_spider_queen', equals: false })).val === true);
  r.check('flag bare presence', (await ev({ flag: 'lich_defeated' })).val === true);
  r.check('questState completed', (await ev({ questState: 'necromancer_trial', state: 'completed' })).val === true);
  r.check('questState non-matching state is false', (await ev({ questState: 'mq_01', state: 'completed' })).val === false);
  r.check('affectionTier atLeast trust', (await ev({ affectionTier: 'spider_queen', atLeast: 'trust' })).val === true);
  r.check('affectionTier below threshold is false', (await ev({ affectionTier: 'spider_queen', atLeast: 'claim' })).val === false);

  // ── all / any / not recursion ──
  r.check('all: both true', (await ev({ all: [{ flag: 'lich_defeated' }, { questState: 'necromancer_trial', state: 'completed' }] })).val === true);
  r.check('all: one false -> false', (await ev({ all: [{ flag: 'lich_defeated' }, { flag: 'married_spider_queen' }] })).val === false);
  r.check('any: one true -> true', (await ev({ any: [{ flag: 'married_spider_queen' }, { flag: 'lich_defeated' }] })).val === true);
  r.check('any: all false -> false', (await ev({ any: [{ flag: 'married_spider_queen' }] })).val === false);
  r.check('not: negates', (await ev({ not: { flag: 'married_spider_queen' } })).val === true);
  r.check('nested: any inside all', (await ev({ all: [{ flag: 'lich_defeated' }, { any: [{ flag: 'x_y' }, { flag: 'season' }] }] })).val === true);
  r.check('nested: all inside not', (await ev({ not: { all: [{ flag: 'lich_defeated' }, { flag: 'married_spider_queen' }] } })).val === true);

  // ── No-silent-fail policy ──
  const bad1 = await ev({ flag: 'x', nonsenseComparator: 1 });
  r.check('unknown comparator REJECTS (throws or false), never true', bad1.ok ? bad1.val === false : true, bad1.err || '');
  const bad2 = await ev({ all: 'not-an-array' });
  r.check('malformed combinator rejects, never true', bad2.ok ? bad2.val === false : true, bad2.err || '');
  const bad3 = await ev({ questState: 42 });
  r.check('wrong-typed operand rejects, never true', bad3.ok ? bad3.val === false : true, bad3.err || '');

  // ── Backward compatibility: existing id-keyed lookups unchanged ──
  const compat = await page.evaluate(() => {
    const g = window.__g;
    const qs = new QuestSystem();
    qs.init(g.gameManager, g.dataManager, g.eventBus);
    const n = qs.allQuests.length;
    const gateProbe = typeof qs.isContentUnlocked === 'function' && typeof qs._checkPrerequisites === 'function';
    qs.destroy();
    return { n, gateProbe };
  });
  r.check('isContentUnlocked/_checkPrerequisites still present (folded behind, not removed)', compat.gateProbe);
  r.check('quest content still loads through the existing path', compat.n > 0, `allQuests=${compat.n}`);

  // ── Mixed-mode routing: quest.js sends condition OBJECTS through the engine ──
  const routing = await page.evaluate(() => {
    const g = window.__g;
    g.gameManager.switchToSlot(1); // ensure a live store for flag reads
    g.gameManager.set_flag('cond_probe', true);
    const qs = new QuestSystem();
    qs.init(g.gameManager, g.dataManager, g.eventBus);
    const mixedFail = qs._checkPrerequisites({
      id: 'probe_mixed_fail',
      prerequisites: ['cond_probe', { all: [{ flag: 'cond_probe' }, { flag: 'definitely_not_set_flag' }] }],
    });
    const mixedPass = qs._checkPrerequisites({
      id: 'probe_mixed_pass',
      prerequisites: ['cond_probe', { any: [{ flag: 'cond_probe' }, { flag: 'definitely_not_set_flag' }] }],
    });
    const stringOnly = qs._checkPrerequisites({ id: 'probe_str', prerequisites: ['cond_probe'] });
    const malformedObj = qs._checkPrerequisites({ id: 'probe_bad', prerequisites: [{ flag: 'cond_probe', nonsense: 1 }] });
    qs.destroy();
    return { mixedFail, mixedPass, stringOnly, malformedObj };
  });
  r.check('string prereq still routes as legacy flag AND', routing.stringOnly === true);
  r.check('object prereq: failing combinator blocks the quest', routing.mixedFail === false);
  r.check('object prereq: passing combinator unlocks the quest', routing.mixedPass === true);
  r.check('malformed object prereq fails closed (no unlock)', routing.malformedObj === false);

  // ── validate(): the load-time validation surface (pipeline uses this) ──
  const val = await page.evaluate(() => {
    const eng = new window.ConditionEngine();
    return {
      good: eng.validate({ all: [{ flag: 'a' }, { not: { flag: 'b' } }] }).length,
      badComb: eng.validate({ all: 'nope' }).length,
      badFlag: eng.validate({ flag: 'x', extra: 1 }).length,
      badTier: eng.validate({ affectionTier: 'spider_queen', atLeast: 'beloved' }).length,
      reserved: eng.validate({ time: 'night' }).length,
      nestedPath: eng.validate({ any: [{ all: [] }] })[0] || '',
    };
  });
  r.check('validate(): clean condition yields zero problems', val.good === 0);
  r.check('validate(): flags malformed combinator', val.badComb > 0);
  r.check('validate(): flags disallowed extra key on flag', val.badFlag > 0);
  r.check('validate(): flags unknown tier name', val.badTier > 0);
  r.check('validate(): flags reserved extension type', val.reserved > 0);
  r.check('validate(): problem paths point at the offending sub-condition',
    val.nestedPath.includes('root.any[0]') && val.nestedPath.includes('"all"'), val.nestedPath);

  r.check('no page/console errors during suite (exactly the 4 deliberate rejections)',
    errors.length === errBefore + 4,
    `baseline=${errBefore} total=${errors.length} unexpected=[${errors.slice(0, errBefore).concat(errors.slice(errBefore + 4)).map(e => e.slice(0, 80)).join(' | ')}]`);

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
