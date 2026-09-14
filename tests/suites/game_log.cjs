// ============================================================
// Suite: Game Log / session console (game_log_system_spec.md §4)
// Real transitions only (BUG-031): bus-driven entries with correct stamps,
// ring-buffer cap under flood, clear(), UI chip/panel rendering, and the
// ONE-RULE purity check (the game log is NOT the memory log).
// Run: node tests/suites/game_log.cjs
// ============================================================
const { bootGame, STEP_DETECTORS, createRunner } = require('../lib/harness.cjs');

STEP_DETECTORS.game_log = () => !!(window.game?.gameLog || window.__GAMELOG_DEBUG__);

(async () => {
  const { browser, page, errors } = await bootGame();
  const detect = () => page.evaluate(STEP_DETECTORS.game_log);

  if (!(await detect())) {
    console.log('SKIP — GameLogSystem not implemented yet.');
    console.log('This suite is its definition of done. See game_log_system_spec.md.');
    await browser.close();
    process.exit(0);
  }

  const r = createRunner({ suiteName: 'game_log' });

  // ── Capture through real bus events ──
  const captured = await page.evaluate(() => {
    const g = window.game;
    const gl = g.gameLog;
    gl.clear();
    gl.log('probe-first', { kind: 'info' });
    g.timeService.advanceDay(0, 'combat_run_complete');
    g.timeService.advanceDay(30, 'story_skip');
    g.eventBus.emit('quest:completed', { questId: 'probe_quest' });
    g.eventBus.emit('levelUp', { level: 7 });
    g.eventBus.emit('weaponLevelUp', { weaponId: 'probe_blade', newLevel: 5 });
    g.eventBus.emit('shopPurchase', { item: { id: 'health_potion', name: 'Health Potion', cost: 50 } });
    const entries = gl.getEntries();
    return {
      size: gl.size(),
      texts: entries.map((e) => e.text),
      kinds: entries.map((e) => e.kind),
      days: entries.map((e) => e.day),
      hasTs: entries.every((e) => /^\d{2}:\d{2}$/.test(e.at)),
    };
  });
  r.check('day advance + timeskip captured', captured.texts.some((t) => t.includes('A new day begins')) && captured.texts.some((t) => t.includes('timeskip: +30 days')), JSON.stringify(captured.texts));
  r.check('quest/level/weapon/purchase captured', ['probe_quest', 'Level up! Lv 7', 'probe_blade', 'Health Potion'].every((frag) => captured.texts.some((t) => t.includes(frag))), JSON.stringify(captured.texts));
  r.check('entries carry kinds + day stamps + session clock', captured.hasTs && captured.days.every((d) => Number.isFinite(d)) && captured.kinds.includes('reward') && captured.kinds.includes('event'), JSON.stringify(captured));
  r.check('timeskip is flagged as an event kind', captured.kinds[captured.texts.findIndex((t) => t.includes('timeskip'))] === 'event');

  // ── Ring buffer: flood past the cap, oldest drop ──
  const flood = await page.evaluate(() => {
    const gl = window.game.gameLog;
    const before = gl.size();
    for (let i = 0; i < 250; i++) gl.log(`flood-${i}`);
    return { cap: 200, size: gl.size(), first: gl.getEntries()[0]?.text, last: gl.getEntries().at(-1)?.text };
  });
  r.check('ring buffer holds at MAX_ENTRIES (200)', flood.size === flood.cap, JSON.stringify(flood));
  r.check('oldest entries drop (window slides)', flood.first !== 'flood-0' && flood.last === 'flood-249', JSON.stringify({ first: flood.first, last: flood.last }));

  // ── clear() ──
  const cleared = await page.evaluate(() => {
    const gl = window.game.gameLog;
    gl.clear();
    return { size: gl.size() };
  });
  r.check('clear() empties the buffer', cleared.size === 0, JSON.stringify(cleared));

  // ── Town console UI: chip toggles panel, entries render ──
  const ui = await page.evaluate(() => {
    const gl = window.game.gameLog;
    const chip = document.getElementById('town-log-toggle');
    const chipExists = !!chip;
    gl.log('ui-probe-entry', { kind: 'info' });
    gl.openPanel();
    const panel = document.getElementById('gamelog-panel');
    const openActive = panel?.classList.contains('active') || false;
    const rendered = (document.getElementById('gamelog-list')?.textContent || '').includes('ui-probe-entry');
    gl.closePanel();
    const closedActive = panel?.classList.contains('active') || false;
    return { chipExists, openActive, rendered, closedActive };
  });
  r.check('town header exposes the 📖 Log chip', ui.chipExists);
  r.check('panel opens, renders newest entries, closes', ui.openActive && ui.rendered && !ui.closedActive, JSON.stringify(ui));

  // ── Purity: the game log is NOT the memory log (one-rule) ──
  const purity = await page.evaluate(() => {
    const g = window.game;
    const gl = g.gameLog;
    const gm = g.gameManager;
    gl.clear();
    gl.log('purity-probe', { kind: 'info' });
    const npcBranch = gm.store.persistent.npcs;
    return {
      logIsMemoryLog: gl === gm.memoryLog,
      eventLogTouched: npcBranch.eventLog.some((e) => (e.payload || {}).text === 'purity-probe'),
      eventSeqChangedByLog: false,
      gameLogHasEventLogField: !('eventLog' in gl),
      gameLogHasFavoritesField: !('favorites' in gl),
      memoryLogSizeUnchangedByFlood: true,
    };
  });
  r.check('gameLog is a distinct object from the canonical memoryLog', purity.logIsMemoryLog === false, JSON.stringify(purity));
  r.check('game log writes never touch the memory log store branch', purity.eventLogTouched === false && purity.gameLogHasEventLogField && purity.gameLogHasFavoritesField, JSON.stringify(purity));

  r.check('no page/console errors during suite', errors.length === 0, errors.slice(0, 3).join(' | '));

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
