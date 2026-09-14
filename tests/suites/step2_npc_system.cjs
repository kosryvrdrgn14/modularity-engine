// ============================================================
// Suite: Step 2 — NPC Condition System + Canonical Memory Log
// Contract (npc_condition_system_spec.md; compilation §2 + §6 step 2;
// MASTER_DESIGN §24):
//   - locationRules: first-match-wins, base location as fallback
//   - dialogueSets: first passing set wins; guaranteed unconditional
//     fallback (legacy root-topic synthesis for NPCsWithout dialogueSets)
//   - Canonical event log { eventId, seq, chapterMarker, npcIds[], type,
//     payload, spoilerTag }: append-only, typed write path, fail-closed
//     validation, multi-NPC events visible to every listed npc
//   - Projections: per-npc, type filter, spoilerFilter 'safe'
//   - Persistence: append → save → page.reload() → still queryable
//     (keepStorage boot + same-page reload; a second bootGame() browser
//     would have EMPTY storage and make the assertion vacuous)
//   - Producers: dialogue choice/flag/affection events land via the
//     central listeners with curation (giftGiven deduped per choiceId)
//   - No page/console errors during the suite
// Run: node tests/suites/step2_npc_system.cjs
// ============================================================
const { bootGame, STEP_DETECTORS, createRunner } = require('../lib/harness.cjs');

(async () => {
  const { browser, page, errors } = await bootGame({ keepStorage: true });
  const detect = () => page.evaluate(STEP_DETECTORS.step2_npc_system);

  if (!(await detect())) {
    console.log('SKIP — Step 2 (NPC condition system + memory log) not implemented yet.');
    console.log('This suite is its definition of done. See npc_condition_system_spec.md.');
    await browser.close();
    process.exit(0);
  }

  const r = createRunner({ suiteName: 'step2_npc_system' });

  // Sanity: the full wiring exists (system, typed write surface, inspector).
  const wired = await page.evaluate(() => ({
    sys: !!window.game?.npcSystem,
    log: !!window.game?.gameManager?.memoryLog,
    logNpcEvent: typeof window.game?.gameManager?.logNpcEvent === 'function',
    engine: !!window.game?.gameManager?.conditionEngine,
    inspector: typeof window.__NPC_DEBUG__ === 'object',
    legacyNpc: !!window.game?.npcSystem?.getNpc('old_man'),
  }));
  r.check('npcSystem + memoryLog + typed write path wired', wired.sys && wired.log && wired.logNpcEvent, JSON.stringify(wired));
  r.check('condition engine shared (no fork)', wired.engine);
  r.check('legacy NPC content reachable (old_man)', wired.legacyNpc);
  r.check('dev inspector installed (window.__NPC_DEBUG__)', wired.inspector);

  // ── locationRules: first-match-wins + fallback ──
  // old_man (reference content): rule moves him to graveyard_entrance while
  // mq_02_clearing is ACTIVE; base location city_root otherwise.
  const loc = await page.evaluate(() => {
    const g = window.game;
    const base = g.npcSystem.resolveLocation('old_man');
    g.gameManager.store.persistent.quests.active.push('mq_02_clearing');
    const moved = g.npcSystem.resolveLocation('old_man');
    g.gameManager.store.persistent.quests.active = g.gameManager.store.persistent.quests.active.filter((q) => q !== 'mq_02_clearing');
    const restored = g.npcSystem.resolveLocation('old_man');
    return { base, moved, restored, unknown: g.npcSystem.resolveLocation('no_such_npc') };
  });
  r.check('locationRules fallback = base location', loc.base === 'city_root', JSON.stringify(loc));
  r.check('locationRules first-match-wins when condition passes', loc.moved === 'graveyard_entrance', JSON.stringify(loc));
  r.check('locationRules restore after condition clears', loc.restored === 'city_root');
  r.check('unknown npc resolves to null (no guess)', loc.unknown === null);

  // ── dialogueSets: gated set wins over legacy fallback; legacy synthesis ──
  const dlg = await page.evaluate(() => {
    const g = window.game;
    const sys = g.npcSystem;
    const legacy = sys.selectDialogueSet('old_man'); // no flag yet → legacy topics
    g.gameManager.set_flag('graveyard_cleared', true);
    const gated = sys.selectDialogueSet('old_man');
    const gatedTopics = sys.selectTopics('old_man').map((t) => t.id);
    g.gameManager.store.flags.graveyard_cleared = false; // reset
    const pureLegacyNpc = sys.selectDialogueSet('tavern_keeper'); // no dialogueSets at all
    return {
      legacyIsLegacy: legacy.id === 'legacy_topics',
      legacyTopicCount: legacy.topics.length,
      gatedId: gated.id,
      gatedGreeting: (gated.greeting || '').slice(0, 30),
      gatedTopics,
      pureLegacyOk: pureLegacyNpc && Array.isArray(pureLegacyNpc.topics) && pureLegacyNpc.topics.length > 0,
    };
  });
  r.check('fallback: legacy synthesis before any set passes', dlg.legacyIsLegacy && dlg.legacyTopicCount === 3, JSON.stringify(dlg));
  r.check('gated dialogueSet wins when condition passes', dlg.gatedId === 'old_man_post_graveyard', JSON.stringify(dlg));
  r.check('gated set topics come from content (not legacy)', dlg.gatedTopics.join(',') === 'post_graveyard_resolve,post_graveyard_camp,end');
  r.check('pure-legacy NPC still resolves (fallback rule)', dlg.pureLegacyOk);

  // ── mood layer ──
  const mood = await page.evaluate(() => {
    const g = window.game;
    const base = g.npcSystem.getMood('old_man');
    g.gameManager.store.persistent.quests.active.push('mq_02_clearing');
    const grave = g.npcSystem.getMood('old_man');
    g.gameManager.store.persistent.quests.active = [];
    const worried = (() => {
      g.gameManager.store.persistent.quests.failed.push('mq_02_clearing');
      const m = g.npcSystem.getMood('old_man');
      g.gameManager.store.persistent.quests.failed = [];
      return m;
    })();
    return { base, grave, worried };
  });
  r.check('mood: base when no rule passes', mood.base === 'hopeful', JSON.stringify(mood));
  r.check('mood: rule overrides when condition passes', mood.grave === 'grave' && mood.worried === 'worried');

  // ── Canonical memory log: append-only, validation, projections ──
  const log = await page.evaluate(() => {
    const g = window.game;
    const gm = g.gameManager;
    g.gameManager.clearNpcEvents();
    const before = gm.memoryLog.size();
    const e1 = gm.logNpcEvent({ chapterMarker: 'ch1', npcIds: ['old_man', 'cute_girl'], type: 'dialogueChoiceMade', payload: { conversationId: 'c1', choiceId: 'ch_a' } });
    const e2 = gm.logNpcEvent({ npcIds: ['old_man'], type: 'giftGiven', payload: { itemId: null, affection: 1 } });
    const after = gm.memoryLog.size();
    // Fail-closed: malformed specs rejected loudly, size unchanged.
    const bad1 = gm.logNpcEvent({ npcIds: [], type: 'dialogueChoiceMade', payload: {} });
    const bad2 = gm.logNpcEvent({ npcIds: ['old_man'], type: 'madeUpType', payload: {} });
    const bad3 = gm.logNpcEvent(null);
    const afterBad = gm.memoryLog.size();
    const forOldMan = gm.getNpcEventsForNpc('old_man');
    const forCuteGirl = gm.getNpcEventsForNpc('cute_girl');
    const seqs = forOldMan.map((e) => e.seq);
    const monotonic = seqs.every((s, i) => i === 0 || s > seqs[i - 1]);
    const eventShape = forOldMan.length
      ? ['eventId', 'seq', 'chapterMarker', 'npcIds', 'type', 'payload', 'spoilerTag'].every((k) => k in forOldMan[0])
      : false;
    return {
      before, after, afterBad, rejected: bad1 === null && bad2 === null && bad3 === null,
      multiNpc: forOldMan.length === 2 && forCuteGirl.length === 1,
      seqStart: e1.seq, seq2: e2.seq, monotonic, eventShape,
      typeFilter: gm.getNpcEventsForNpc('old_man', { type: 'giftGiven' }).length,
    };
  });
  r.check('events append via typed path (size +2)', log.after === log.before + 2, JSON.stringify(log));
  r.check('malformed events rejected fail-closed (size unchanged)', log.rejected && log.afterBad === log.after);
  r.check('multi-NPC event visible to EVERY listed npc', log.multiNpc);
  r.check('seq strictly monotonic, event shape complete', log.monotonic && log.eventShape && log.seq2 === log.seqStart + 1);
  r.check('type projection filters correctly', log.typeFilter === 1);

  // ── Spoiler filter (export system's future read path) ──
  const spoiler = await page.evaluate(() => {
    const gm = window.game.gameManager;
    gm.logNpcEvent({ chapterMarker: 'ch2', npcIds: ['old_man'], type: 'questCompleted', payload: { questId: 'x' }, spoilerTag: 'secret_backstory' });
    const all = gm.getNpcEventsForNpc('old_man').length;
    const safe = gm.getNpcEventsForNpc('old_man', { spoilerFilter: 'safe' }).length;
    return { all, safe };
  });
  r.check('spoilerFilter excludes tagged events when set', spoiler.safe < spoiler.all, JSON.stringify(spoiler));

  // ── Producers: dialogue choice/flag/affection through central listeners ──
  const producers = await page.evaluate(() => {
    const g = window.game;
    const gm = g.gameManager;
    gm.clearNpcEvents();
    const bus = g.eventBus;
    bus.emit('npc:dialogueChoice', { npcId: 'old_man', conversationId: 'c1', choiceId: 'ch_a' });
    // Dirty must be observable on a write that does NOT ride an autosave
    // listener — the later quest:completed emit below triggers the §21
    // checkpoint save, which legitimately resets _dirty to false.
    const dirtyAfterWrite = gm._dirty === true;
    bus.emit('npc:dialogueFlag', { npcId: 'old_man', flagId: 'graveyard_warning', conversationId: 'c1' });
    bus.emit('npc:dialogueAffection', { npcId: 'cute_girl', affection: 1, choiceId: 'about_herself', conversationId: 'c1' });
    bus.emit('npc:dialogueAffection', { npcId: 'cute_girl', affection: 1, choiceId: 'about_herself', conversationId: 'c1' }); // dupe — curated
    bus.emit('npc:talked', { npcId: 'old_man', conversationId: 'c1' });
    bus.emit('quest:completed', { questId: 'mq_01_first_rites', chapter: 1 });
    return {
      choices: gm.getNpcEvents({ type: 'dialogueChoiceMade' }).length,
      flags: gm.getNpcEvents({ type: 'flagSet' }).length,
      gifts: gm.getNpcEvents({ type: 'giftGiven' }).length,
      talks: gm.getNpcEvents({ type: 'npcTalkedTo' }).length,
      quests: gm.getNpcEvents({ type: 'questCompleted' }).length,
      questMarker: (gm.getNpcEvents({ type: 'questCompleted' })[0] || {}).chapterMarker,
      dirtyAfterWrite,
    };
  });
  r.check('producer: choice logged once per emit', producers.choices === 1, JSON.stringify(producers));
  r.check('producer: dialogue flag logged', producers.flags === 1);
  r.check('producer curation: giftGiven deduped per choiceId', producers.gifts === 1);
  r.check('producer: talk + quest completion logged', producers.talks === 1 && producers.quests === 1);
  r.check('producer: quest event stamped with chapter marker', producers.questMarker === 'chapter:1');
  r.check('log writes mark store dirty (rides existing autosave)', producers.dirtyAfterWrite === true);

  // ── Persistence round-trip: append → save → SAME-PAGE reload → queryable ──
  await page.evaluate(() => {
    const g = window.game;
    g.gameManager.clearNpcEvents();
    g.gameManager.logNpcEvent({ chapterMarker: 'rt', npcIds: ['old_man', 'cute_girl'], type: 'dialogueChoiceMade', payload: { conversationId: 'rt1', choiceId: 'choice_1' } });
    g.gameManager.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.game && window.game.gameManager, null, { timeout: 15000 });
  const reloaded = await page.evaluate(() => {
    const g = window.game;
    const log = g.gameManager.memoryLog;
    return {
      total: log.size(),
      oldMan: log.getEventsForNpc('old_man').length,
      cuteGirl: log.getEventsForNpc('cute_girl').length,
      choice: (log.getEvents({ type: 'dialogueChoiceMade' })[0] || {}).payload?.choiceId,
      version: g.gameManager.store.save_version,
      seqIntact: typeof g.gameManager.store.persistent.npcs.eventSeq === 'number',
    };
  });
  r.check('round-trip: log survives save → reload', reloaded.total === 1 && reloaded.oldMan === 1 && reloaded.cuteGirl === 1, JSON.stringify(reloaded));
  r.check('round-trip: payload + seq survive intact', reloaded.choice === 'choice_1' && reloaded.seqIntact);
  r.check('store migrated to v5 with log branch', reloaded.version >= 5);

  // ── Boot hygiene: no page/console errors during the whole suite ──
  // EXCEPT the deliberate fail-closed rejections — [MEMORYLOG] rejected lines
  // ARE the loud-signal contract (spec §2.2); everything else must be clean.
  const unexpectedErrors = errors.filter((e) => !e.includes('[MEMORYLOG] rejected'));
  r.check('no page/console errors during suite', unexpectedErrors.length === 0, unexpectedErrors.slice(0, 3).join(' | '));

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
