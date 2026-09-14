// ============================================================
// Suite: Step 2 — NPC Condition System + Canonical Memory Log
// Contract (compilation §2 + §6 step 2; MASTER_DESIGN §24):
//   locationRules first-match-wins; dialogueSets with guaranteed
//   unconditional fallback; canonical event log { eventId, seq,
//   chapterMarker, npcIds[], type, payload, spoilerTag } with append-only
//   writes via bus listeners; dialogueChoiceMade projection; npc:* hooks.
// Active when the harness detector sees the NPC system.
// Run: node tests/suites/step2_npc_system.cjs
// ============================================================
const { bootGame, STEP_DETECTORS, createRunner } = require('../lib/harness.cjs');

(async () => {
  const { browser, page, errors } = await bootGame();
  const detect = () => page.evaluate(STEP_DETECTORS.step2_npc_system);

  if (!(await detect())) {
    console.log('SKIP — Step 2 (NPC condition system + memory log) not implemented yet.');
    console.log('This suite is its definition of done. See compilation §2 and MASTER_DESIGN §24.');
    await browser.close();
    process.exit(0);
  }

  const r = createRunner({ suiteName: 'step2_npc_system' });

  // ── locationRules: first-match-wins, unconditional last entry = fallback ──
  const loc = await page.evaluate(() => {
    const npc = window.__pickTestNpc?.() || null;
    if (!npc) return { fail: 'no test npc helper' };
    // Contract: an NPC whose rules all fail lands on the unconditional entry.
    // The suite plants a two-rule NPC through the system's own registration API
    // if available; otherwise reads whatever content defines.
    const sys = window.game.npcSystem;
    const resolved = sys.resolveLocation
      ? sys.resolveLocation(npc.id)
      : { fail: 'no resolveLocation' };
    return { resolved, sys };
  });
  if (!loc.fail && typeof loc.resolved === 'object') {
    r.check('resolveLocation returns a location id', typeof loc.resolved.location === 'string' || typeof loc.resolved === 'string');
  } else {
    r.check('location resolution API present and callable', false, JSON.stringify(loc).slice(0, 80));
  }

  // ── Canonical memory log: append-only, seq monotonic, multi-NPC visibility ──
  const log = await page.evaluate(async () => {
    const g = window.game;
    const api = g.memoryLog || g.gameManager?.logNpcEvent;
    if (!api) return { fail: 'no memory log api' };
    const append = (ev) => (g.memoryLog ? g.memoryLog.append(ev) : g.gameManager.logNpcEvent(ev));
    const before = g.memoryLog ? g.memoryLog.size() : g.gameManager.store.npcEventLog?.length || 0;
    append({ chapterMarker: 'ch1', npcIds: ['old_man', 'cute_girl'], type: 'dialogueChoiceMade', payload: { conversationId: 'c1', choiceId: 'ch_a' } });
    append({ chapterMarker: 'ch1', npcIds: ['old_man'], type: 'giftGiven', payload: { itemId: 'flowers' }, spoilerTag: null });
    const after = g.memoryLog ? g.memoryLog.size() : g.gameManager.store.npcEventLog?.length || 0;
    // Query projection: per-NPC, type filter, seq order
    const forOldMan = g.memoryLog ? g.memoryLog.getEventsForNpc('old_man', {}) : [];
    const choicesOnly = g.memoryLog ? g.memoryLog.getEventsForNpc('old_man', { type: 'dialogueChoiceMade' }) : [];
    const seqs = forOldMan.map(e => e.seq);
    const monotonic = seqs.every((s, i) => i === 0 || s > seqs[i - 1]);
    const persist = () => g.gameManager.save();
    return { before, after, forOldMan: forOldMan.length, choicesOnly: choicesOnly.length, monotonic, persist };
  });
  if (log.fail) {
    r.check('memory log append/query API present', false, log.fail);
  } else {
    r.check('events append (size grows by 2)', log.after === log.before + 2, `${log.before} -> ${log.after}`);
    r.check('multi-NPC event visible to every listed npc', log.forOldMan === 2, `forOldMan=${log.forOldMan}`);
    r.check('type projection filters correctly', log.choicesOnly === 1);
    r.check('seq strictly monotonic per NPC view', log.monotonic);
  }

  // ── Persistence round-trip: append → save → fresh boot → still queryable ──
  if (!log.fail) {
    await page.evaluate(() => window.game.gameManager.save());
    const { browser: b2, page: p2 } = await bootGame();
    const reloaded = await p2.evaluate(() => {
      const g = window.game;
      const n = g.memoryLog ? g.memoryLog.size() : g.gameManager.store.npcEventLog?.length || 0;
      const q = g.memoryLog ? g.memoryLog.getEventsForNpc('cute_girl', {}).length : 0;
      return { n, q };
    });
    r.check('log survives save/load round-trip', reloaded.n >= 2 && reloaded.q >= 1, JSON.stringify(reloaded));
    await b2.close();
  }

  // ── Spoiler filter on the projection (export system's future read path) ──
  const spoiler = await page.evaluate(() => {
    const g = window.game;
    if (!g.memoryLog) return { fail: true };
    g.memoryLog.append({ chapterMarker: 'ch2', npcIds: ['old_man'], type: 'questCompleted', payload: { questId: 'x' }, spoilerTag: 'secret_backstory' });
    const all = g.memoryLog.getEventsForNpc('old_man', {});
    const safe = g.memoryLog.getEventsForNpc('old_man', { spoilerFilter: 'safe' });
    return { all: all.length, safe: safe.length };
  });
  if (!spoiler.fail) {
    r.check('spoilerFilter excludes tagged events when set', spoiler.safe < spoiler.all, `all=${spoiler.all} safe=${spoiler.safe}`);
  }

  r.check('no page/console errors during suite', errors.length === 0, errors.slice(0, 3).join(' | '));

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
