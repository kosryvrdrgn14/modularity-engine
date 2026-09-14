// ============================================================
// Suite: Calendar & Time (calendar_time_system_spec.md §6)
// Real state transitions only (BUG-031 rule): day advancement, season
// boundaries, biome overrides, the LOCKED modifier rule (first-match-wins
// on seasonOverride + stacked festivals), evaluator types end-to-end,
// log day-stamping, export context line, migration.
// Run: node tests/suites/calendar_time.cjs
// ============================================================
const { bootGame, STEP_DETECTORS, createRunner } = require('../lib/harness.cjs');

STEP_DETECTORS.calendar_time = () =>
  !!(window.game?.timeService || window.__STEP_CALENDAR__);

(async () => {
  const { browser, page, errors } = await bootGame();
  const detect = () => page.evaluate(STEP_DETECTORS.calendar_time);

  if (!(await detect())) {
    console.log('SKIP — TimeService not implemented yet.');
    console.log('This suite is its definition of done. See calendar_time_system_spec.md.');
    await browser.close();
    process.exit(0);
  }

  const r = createRunner({ suiteName: 'calendar_time' });

  // ── Core state: default day, content-driven advance, skip logging ──
  const basic = await page.evaluate(() => {
    const g = window.game;
    const ts = g.timeService;
    const gm = g.gameManager;
    const day0 = ts.getCurrentDay();
    const r1 = ts.advanceDay(0, 'combat_run_complete');
    const afterCombat = ts.getCurrentDay();
    const r2 = ts.advanceDay(30, 'story_skip');
    const afterSkip = ts.getCurrentDay();
    return {
      day0,
      combatDelta: afterCombat - day0,
      skipDelta: afterSkip - afterCombat,
      skipLogLen: gm.store.persistent.time.skipLog.length,
      skipLogEntry: gm.store.persistent.time.skipLog[0] || null,
      dirty: gm._dirty,
      label: ts.getDateLabel(),
    };
  });
  r.check('fresh save starts at Day 1', basic.day0 === 1, `got ${basic.day0}`);
  r.check('combat_run_complete advances by content delta (1)', basic.combatDelta === 1, JSON.stringify(basic));
  r.check('story_skip advances by explicit days (30)', basic.skipDelta === 30, JSON.stringify(basic));
  r.check('skipLog records ONLY the skip (combat advance is quiet)', basic.skipLogLen === 1 && basic.skipLogEntry?.source === 'story_skip', JSON.stringify(basic.skipLogEntry));
  r.check('advanceDay marks the store dirty', basic.dirty === true);
  r.check('date label contains month + weekday', /Day \d+, \w+ \(\w+\)/.test(basic.label), basic.label);

  // ── Season boundary flip: cross the NEXT month boundary forward ──
  // (No rewinding: advanceDay rejects negative days by design — fail-closed
  // proved en route. We skip to the last day of the current month, then +1.)
  const boundary = await page.evaluate(() => {
    const g = window.game;
    const ts = g.timeService;
    const months = g.dataManager.calendar.calendar.months;
    const day = ts.getCurrentDay();
    let acc = 0, boundaryDay = null, monthBefore = null, monthAfter = null;
    for (let i = 0; i < months.length; i++) {
      acc += months[i].days;
      if (acc >= day) {
        boundaryDay = acc + 1;
        monthBefore = months[i].id;
        monthAfter = months[(i + 1) % months.length].id;
        break;
      }
    }
    ts.advanceDay(boundaryDay - 1 - day, 'test_skip'); // last day of monthBefore
    const before = { label: ts.getDateLabel(), season: ts.getSeason() };
    ts.advanceDay(1, 'test_skip'); // cross into monthAfter
    const after = { label: ts.getDateLabel(), season: ts.getSeason() };
    return { monthBefore, monthAfter, before, after };
  });
  r.check('last day of the month still names that month', boundary.before.label.includes(boundary.monthBefore), JSON.stringify(boundary.before));
  r.check('day after the boundary flips month exactly', boundary.after.label.includes(boundary.monthAfter) && !boundary.after.label.includes(boundary.monthBefore), JSON.stringify(boundary.after));
  r.check('season flips with the month (default schedule)', boundary.before.season !== boundary.after.season, `${boundary.before.season} -> ${boundary.after.season}`);

  // ── Region biome override (graveyard = eternal_dusk) ──
  // Town's expected season is DERIVED from content for the current day —
  // the boundary test above may legitimately have advanced the calendar.
  const biome = await page.evaluate(() => {
    const ts = window.game.timeService;
    const cal = window.game.dataManager.calendar;
    const day = ts.getCurrentDay();
    const byMonth = cal.seasons.default.byMonth;
    const months = cal.calendar.months;
    let acc = 0, expected = null;
    const yearLen = months.reduce((s, m) => s + m.days, 0);
    let d = (day - 1) % yearLen;
    for (const m of months) {
      if (d < m.days) { expected = byMonth[m.id]; break; }
      d -= m.days;
    }
    return { town: ts.getSeason('town'), graveyard: ts.getSeason('graveyard'), expected };
  });
  r.check('town follows the default schedule for its day', biome.town === biome.expected, JSON.stringify(biome));
  r.check('graveyard uses its biome schedule (eternal dusk)', biome.graveyard === 'dusk', JSON.stringify(biome));

  // ── THE LOCKED RULE: seasonOverride first-match-wins; festivals stack ──
  const modifier = await page.evaluate(() => {
    const g = window.game;
    const ts = g.timeService;
    const gm = g.gameManager;
    gm.set_flag('blight_active', true);
    gm.set_flag('harvest_festival_active', true);
    const both = { season: ts.getSeason('town'), festivals: ts.getFestivals(), activeIds: ts.getActiveModifiers().map((m) => m.id) };
    // Prove ORDER decides, not flag order: turn blight off.
    gm.set_flag('blight_active', false);
    const festivalOnly = { season: ts.getSeason('town'), festivals: ts.getFestivals() };
    gm.set_flag('harvest_festival_active', false);
    const cleared = { festivals: ts.getFestivals(), season: ts.getSeason('town') };
    return { both, festivalOnly, cleared };
  });
  r.check('blight wins the season field (first-match-wins)', modifier.both.season === 'blight', JSON.stringify(modifier.both));
  r.check('festival still stacks during the blight', modifier.both.festivals.includes('harvest_festival'), JSON.stringify(modifier.both));
  r.check('without blight, default schedule returns', modifier.festivalOnly.season !== 'blight', JSON.stringify(modifier.festivalOnly));
  r.check('festival clears when its flag clears', modifier.cleared.festivals.length === 0, JSON.stringify(modifier.cleared));

  // ── Evaluator types end-to-end through the SHARED engine ──
  const evalTypes = await page.evaluate(() => {
    const g = window.game;
    const gm = g.gameManager;
    gm.set_flag('harvest_festival_active', true);
    const day = gm.store.persistent.time.currentDay;
    const actualSeason = gm._timeServiceRef.getSeason('town');
    return {
      actualSeason,
      seasonPasses: gm.evaluateCondition({ season: { is: actualSeason } }),
      seasonFailsWrong: gm.evaluateCondition({ season: { is: 'no_such_season' } }),
      seasonExplicitRegion: gm.evaluateCondition({ season: { is: 'dusk', region: 'graveyard' } }),
      festivalPasses: gm.evaluateCondition({ festival: { active: 'harvest_festival' } }),
      festivalFails: gm.evaluateCondition({ festival: { active: 'no_such_festival' } }),
      timePasses: gm.evaluateCondition({ time: { dayAtLeast: day - 1 } }),
      timeFailsFuture: gm.evaluateCondition({ time: { dayAtLeast: day + 100 } }),
      combinator: gm.evaluateCondition({ all: [{ time: { dayAtLeast: 1 } }, { festival: { active: 'harvest_festival' } }] }),
      malformedFailsClosed: gm.evaluateCondition({ time: { dayAtLeast: 'not-a-number' } }),
    };
  });
  r.check('season condition routes through the shared engine', evalTypes.seasonPasses === true && evalTypes.seasonFailsWrong === false, JSON.stringify(evalTypes));
  r.check('season condition with explicit region', evalTypes.seasonExplicitRegion === true, JSON.stringify(evalTypes));
  r.check('festival condition sees the stacked set', evalTypes.festivalPasses === true && evalTypes.festivalFails === false, JSON.stringify(evalTypes));
  r.check('time.dayAtLeast thresholds work', evalTypes.timePasses === true && evalTypes.timeFailsFuture === false, JSON.stringify(evalTypes));
  r.check('combinators compose with time types', evalTypes.combinator === true);
  r.check('malformed time condition fails closed', evalTypes.malformedFailsClosed === false);

  // ── Log stamping: events carry the day they happened on ──
  const stamping = await page.evaluate(() => {
    const g = window.game;
    const gm = g.gameManager;
    gm.clearNpcEvents();
    const day = gm._timeServiceRef.getCurrentDay();
    gm.logNpcEvent({ npcIds: ['old_man'], type: 'npcTalkedTo', payload: { conversationId: 'c1' } });
    const ev = gm.memoryLog.getEventsForNpc('old_man')[0];
    return { eventDay: ev?.day, expectedDay: day, seq: ev?.seq };
  });
  r.check('log events are stamped with the current day', stamping.eventDay === stamping.expectedDay, JSON.stringify(stamping));
  r.check('seq remains the ordering spine (unchanged)', Number.isFinite(stamping.seq), JSON.stringify(stamping));

  // ── Export context line: present with stamped history, absent without ──
  const exportCtx = await page.evaluate(() => {
    const g = window.game;
    const ex = g.npcExportSystem;
    const card = ex.generateCard('old_man', { allowEmpty: true });
    const text = ex.renderText(card);
    return {
      hasCtxLine: /— Day \d+, \w+.*—/.test(text),
      text: text.slice(0, 400),
    };
  });
  r.check('export card carries the calendar context line', exportCtx.hasCtxLine, exportCtx.text);

  // ── Persistence round-trip: day survives a save/reload (keepStorage) ──
  const roundTrip = await page.evaluate(() => {
    const g = window.game;
    const ts = g.timeService;
    ts.advanceDay(5, 'roundtrip_probe'); // non-tabulated source => logged as skip
    g.gameManager.save();
    return { daySaved: g.gameManager.store.persistent.time.currentDay };
  });
  await page.reload();
  const afterReload = await page.evaluate(() => ({
    dayLoaded: window.game.timeService.getCurrentDay(),
    v: window.game.gameManager.store.save_version,
  }));
  r.check('current day persists across save/reload', afterReload.dayLoaded === roundTrip.daySaved + 0, `saved=${roundTrip.daySaved} loaded=${afterReload.dayLoaded}`);
  r.check('store is v7 after migration', afterReload.v >= 7, `v=${afterReload.v}`);

  // The malformed-time rejection is a DELIBERATE fail-closed probe (excluded);
  // anything else reaching the error net is a real problem.
  const unexpectedErrors = errors.filter((e) => !e.includes('[CONDITION] rejected: "time" must be an object'));
  r.check('no page/console errors during suite', unexpectedErrors.length === 0, unexpectedErrors.slice(0, 3).join(' | '));

  process.exit(r.summary());
})().catch((e) => { console.error('SUITE CRASHED:', e); process.exit(2); });
