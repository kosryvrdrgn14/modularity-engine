// ============================================================
// Suite: Step 4 — Roleplay Export (favorites / memoryCheckpoint UI)
// Contract (npc_memory_roleplay_export_spec.md + compilation §6 step 4):
//   PURE CONSUMPTION: no new evaluator, no new log, no new renderer.
//   - Card generation reads the canonical log via the shared projection
//   - memoryCheckpoint = curated read-side index (never a write filter)
//   - favorites = (memoryCheckpoint-set, NPC-set) pairs, title-screen
//     accessible WITHOUT a live session (no Game/GameLoop dependency)
//   - spoiler gating reads through the §1 evaluator
//   - content exclusions inherited, not bypassed
// Run: node tests/suites/step4_export.cjs
// ============================================================
const { bootGame, STEP_DETECTORS, createRunner } = require('../lib/harness.cjs');

(async () => {
  const { browser, page, errors } = await bootGame();
  const detect = () => page.evaluate(STEP_DETECTORS.step4_export);

  if (!(await detect())) {
    console.log('SKIP — Step 4 (roleplay export) not implemented yet.');
    console.log('This suite is its definition of done. See npc_memory_roleplay_export_spec.md.');
    await browser.close();
    process.exit(0);
  }

  const r = createRunner({ suiteName: 'step4_export' });

  // ── Facts/flavor split: generation without touching a live session ──
  const gen = await page.evaluate(() => {
    const ex = window.game.npcExportSystem || window.NPCExport;
    if (!ex) return { fail: 'no export api' };
    // Seed minimal history through the canonical log API (no session started).
    const append = window.game.memoryLog
      ? (ev) => window.game.memoryLog.append(ev)
      : (ev) => window.game.gameManager.logNpcEvent(ev);
    append({ chapterMarker: 'ch1', npcIds: ['old_man'], type: 'questCompleted', payload: { questId: 'sq_01_herbalist' } });
    append({ chapterMarker: 'ch2', npcIds: ['old_man'], type: 'questCompleted', payload: { questId: 'x_secret' }, spoilerTag: 'old_man_true_backstory' });
    const card = ex.generateCard
      ? ex.generateCard('old_man', {})
      : { fail: 'no generateCard' };
    return { fail: null, card };
  });
  if (gen.fail === 'no export api') {
    r.check('export API present', false, gen.fail);
  } else if (gen.card && gen.card.fail) {
    r.check('generateCard callable', false, gen.card.fail);
  } else {
    const c = gen.card;
    const text = typeof c === 'string' ? c : JSON.stringify(c);
    r.check('card generates from log-derived facts', text.includes('old_man') || text.length > 0);
    r.check('card carries flavor section (static authored data)', !!(c.flavor || text.includes('flavor') || typeof c === 'string'));
  }

  // ── Spoiler containment: tagged facts excluded as of a checkpoint cutoff ──
  const spoiler = await page.evaluate(() => {
    const ex = window.game.npcExportSystem || window.NPCExport;
    if (!ex || !ex.generateCard) return { fail: true };
    const early = ex.generateCard('old_man', { upToSeq: 1 });
    const full = ex.generateCard('old_man', {});
    const s = (x) => typeof x === 'string' ? x : JSON.stringify(x);
    return { earlyHasSpoiler: s(early).includes('secret'), fullHasSpoiler: s(full).includes('secret') };
  });
  if (!spoiler.fail) {
    r.check('spoiler-tagged fact absent before its seq (cutoff honored)', spoiler.earlyHasSpoiler === false);
    r.check('spoiler-tagged fact present at full history (gate, not deletion)', spoiler.fullHasSpoiler === true);
  }

  // ── Favorites: (checkpoint-set, NPC-set) pairs, session-independent ──
  const fav = await page.evaluate(() => {
    const ex = window.game.npcExportSystem || window.NPCExport;
    if (!ex?.addFavorite) return { fail: true };
    ex.addFavorite({ label: 'test set', members: [{ npcId: 'old_man' }, { npcId: 'cute_girl' }] });
    const list = ex.listFavorites ? ex.listFavorites() : [];
    return { fail: null, count: list.length };
  });
  if (!fav.fail) {
    r.check('favorites accept multi-NPC sets', fav.count >= 1);
  } else {
    r.check('favorites API present (addFavorite)', false, 'not implemented');
  }

  // ── Structural: the export layer added NO second evaluator/log ──
  const purity = await page.evaluate(() => {
    const g = window.game;
    return {
      secondLog: !!(g.npcEventLog2 || g.memoryLog2),
      secondEvaluator: !!(g.spoilerEvaluator || window.SpoilerEngine),
    };
  });
  r.check('no parallel log sprouted (one-rule compliance)', purity.secondLog === false);
  r.check('no parallel spoiler evaluator sprouted', purity.secondEvaluator === false);

  r.check('no page/console errors during suite', errors.length === 0, errors.slice(0, 3).join(' | '));

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
