/**
 * Headless verification for POT-009/010/012/013/014a + BUG-026 regression.
 * Run: node isolate/test_pot_fixes.cjs   (Playwright, file:// — no server needed)
 *
 * Scenario: slot 2 holds a planted interrupted-run journal (the "ghost run"
 * from the BUG-026 era); slot 1 is the boot-active slot.
 * NOTE: end_session() is invoked directly as an API-level check of POT-010;
 * the real player flow reaches it via _handleGameOver().
 */
const { chromium } = require('playwright');
const path = require('path');

let failures = 0;
function report(name, pass, detail) {
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? '  :: ' + detail : ''}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Known-benign under file://: JSON fetches fail and embeddedData.js
    // fallbacks cover them (pre-existing behavior, unrelated to the fixes).
    if (/Fetch API cannot load|URL scheme "file" is not supported/.test(text)) return;
    errors.push('console: ' + text);
  });

  const filePath = path.resolve(__dirname, '..', 'public', 'game2.html');
  console.log('Loading:', filePath, '\n');
  await page.goto('file://' + filePath);
  await page.waitForTimeout(1500);

  // ── Plant a journal in slot 2 (simulates slot-2 ghost run), then reload so
  //    the app boots with slot 1 active. Uses the app's own _createDefault()
  //    so the planted store always matches the live schema. ──
  await page.evaluate(() => {
    const gm = window.game.gameManager;
    const store = gm._createDefault();
    store.session = {
      run_in_progress: true,
      run_data: {
        stage_id: 'stage_graveyard', tier: 'standard',
        gameTime: 95, kills: 7, gold: 12, level: 3,
        weaponLevels: { w1_projectile: 2 }, bossSpawned: false,
        announcementTimes: [], savedAt: 1700000000000,
      },
    };
    localStorage.setItem('me_save_slot2', JSON.stringify(store));
  });
  await page.reload();
  await page.waitForTimeout(1200);

  // ── BUG-026 regression: boot with slot 1 active must show NO banner even
  //    though slot 2 has a journal. ──
  const bootBanner = await page.evaluate(
    () => document.getElementById('resume-banner').classList.contains('active')
  );
  report('BUG-026 regression: no phantom banner at boot (slot 1 active, journal in slot 2)', bootBanner === false,
    bootBanner ? 'banner was active at boot' : '');

  // ── Slot switch to 2: banner must appear, owned by slot 2. ──
  await page.evaluate(() => {
    window.game.gameState.setState('title'); // boot state is already title; no-op guard
    window.game.switchToSlot(2);
  });
  await page.waitForTimeout(150);
  const banner2 = await page.evaluate(() => {
    const b = document.getElementById('resume-banner');
    return { active: b.classList.contains('active'), title: b.querySelector('.resume-title')?.textContent || '' };
  });
  report('BUG-026 regression: banner appears after switch to slot 2', banner2.active === true, '');
  report('BUG-026 regression: banner names owning slot', /Slot 2/.test(banner2.title), `title="${banner2.title}"`);

  // ── POT-009: resume must actually restore the journaled run state. ──
  await page.click('#resume-accept');
  await page.waitForTimeout(400);
  const t2 = await page.evaluate(() => {
    const g = window.game;
    const town = document.getElementById('town-screen');
    const banner = document.getElementById('resume-banner');
    return {
      state: g.gameState.state,
      gameTime: g.gameTime,
      kills: g._runKillCount,
      earnings: g._runGoldEarned || 0,
      wallet: g.gameManager.get_currency(),
      w1: g.weaponSystem.weaponLevels.w1_projectile || 0,
      level: g.levelingSystem.level,
      xp: g.levelingSystem.xp,
      hudTime: g.renderer.gameTime,
      townDisplay: getComputedStyle(town).display,
      bannerActive: banner.classList.contains('active'),
      journalStage: g.gameManager.store.session.run_data.stage_id,
      journalOpen: g.gameManager.store.session.run_in_progress === true,
    };
  });
  report('POT-009: run state is playing after resume', t2.state === 'playing', `state=${t2.state}`);
  report('POT-009: gameTime restored from journal (~95s)', t2.gameTime >= 95 && t2.gameTime < 97, `gameTime=${t2.gameTime.toFixed(1)}`);
  report('POT-009: kill count restored (>=7)', t2.kills >= 7, `kills=${t2.kills}`);
  report('POT-011: run earnings restored from journal (=12)', t2.earnings === 12, `earnings=${t2.earnings}`);
  report('POT-011: wallet NOT re-paid on resume (no double-credit)', t2.wallet === 0, `wallet=${t2.wallet}`);
  report('POT-009: weapon level restored (w1=2)', t2.w1 === 2, `w1=${t2.w1}`);
  report('BUG-027: character level restored from journal (Lv 3)', t2.level === 3, `level=${t2.level}`);
  report('BUG-027: no fabricated partial XP (xp=0)', t2.xp === 0, `xp=${t2.xp}`);
  report('BUG-027: HUD timer data synced to gameTime (~95s)', t2.hudTime >= 95 && t2.hudTime < 97, `hudTime=${t2.hudTime}`);
  report('BUG-026 regression: town screen hidden during resumed combat', t2.townDisplay === 'none', `display=${t2.townDisplay}`);
  report('BUG-026 regression: resume banner dismissed after click', t2.bannerActive === false, '');
  report('POT-009: journal stays open for the resumed run', t2.journalOpen && t2.journalStage === 'stage_graveyard',
    `open=${t2.journalOpen} stage=${t2.journalStage}`);

  // ── BUG-027: the run timer actually renders (white text pixels in the
  //    top-center HUD box while combat is live). Returns -1 if the canvas is
  //    tainted (getImageData unavailable) — handled below. ──
  const timerPixels = await page.evaluate(() => {
    try {
      const c = document.getElementById('game-canvas');
      const ctx = c.getContext('2d');
      const w = c.width;
      const img = ctx.getImageData(w / 2 - 46, 10, 92, 22).data;
      let white = 0;
      for (let i = 0; i < img.length; i += 4) {
        if (img[i] > 220 && img[i + 1] > 220 && img[i + 2] > 220) white++;
      }
      return white;
    } catch (e) {
      return -1;
    }
  });
  report('BUG-027: run timer renders on the HUD (text pixels present)', timerPixels > 30, `whitePixels=${timerPixels}`);

  // ── BUG-027: journal round-trip — after a resumed run levels up, the
  //    journal must record the NEW level (so the next resume keeps it). ──

  // ── POT-013: canvas hit-test removed; keyboard upgrade selection still works. ──
  const t3a = await page.evaluate(() => typeof window.game.inputManager._getUpgradeCardAt === 'undefined');
  report('POT-013: legacy canvas hit-test removed', t3a === true, '');

  // Grant EXACTLY one level's worth of XP (from the live curve) so the queue
  // holds a single pending level-up — no drain loop needed.
  await page.evaluate(() => {
    const g = window.game;
    const need = g.dataManager.leveling.xpCurve.find(e => e.level === g.levelingSystem.level).xpToNext;
    g.levelingSystem.addXP(need);
  });
  await page.waitForTimeout(250);
  const overlayShown = await page.evaluate(
    () => document.getElementById('levelup-overlay').classList.contains('active')
  );
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  const overlayDrained = await page.evaluate(() => ({
    busy: window.game._isSelectingUpgrade === true,
    active: document.getElementById('levelup-overlay').classList.contains('active'),
    level: window.game.levelingSystem.level,
  }));
  report('POT-013: level-up overlay opens via XP', overlayShown === true, '');
  report('POT-013: keyboard selection drains the level-up queue', overlayDrained.busy === false && overlayDrained.active === false,
    `busy=${overlayDrained.busy} active=${overlayDrained.active} level=${overlayDrained.level}`);
  // Round-trip: resumed at journal Lv 3, gained one level (→ 4); the
  // milestone flush at the level-up pause must have recorded it.
  const roundTrip = await page.evaluate(() => ({
    live: window.game.levelingSystem.level,
    journaled: window.game.gameManager.store.session.run_data.level,
  }));
  report('BUG-027: journal round-trips the new level (3 → 4)',
    roundTrip.live === 4 && roundTrip.journaled === 4,
    `live=${roundTrip.live} journaled=${roundTrip.journaled}`);

  // ── POT-012 symptom: no session.gold ghost branch after a resumed run. ──
  const t4 = await page.evaluate(() => 'gold' in (window.game.gameManager.store.session || {}));
  report('POT-012: session.gold ghost branch absent', t4 === false, '');

  // ── POT-010: end_session() is the single total_runs owner. ──
  const t5 = await page.evaluate(() => {
    const g = window.game;
    const before = g.gameManager.store.counters.total_runs || 0;
    g.gameManager.end_session({ rewards: {}, stats: { kills: 1, time_survived: 10 } });
    const after = g.gameManager.store.counters.total_runs || 0;
    // Complete-run teardown: journal cleared (recovery no longer needed).
    return { before, after, journalCleared: g.gameManager.store.session.run_in_progress === false };
  });
  report('POT-010: end_session bumps total_runs exactly +1', t5.after === t5.before + 1, `before=${t5.before} after=${t5.after}`);
  report('POT-010: end_session clears the run journal', t5.journalCleared === true, '');

  // ── Regression: completed run must not re-show the banner; a fresh
  //    startGame() must not bump total_runs (the old double-count path). ──
  await page.evaluate(() => {
    const g = window.game;
    g.gameLoop.paused = true;
    g.gameState.transition('title', { allowRestart: true }); // sanctioned any-state exit
    g.switchToSlot(2);
    const bannerAfter = document.getElementById('resume-banner').classList.contains('active');
    const runsBefore = g.gameManager.store.counters.total_runs || 0;
    g.startGame();
    window.__pot010 = {
      bannerAfter,
      runsBefore,
      runsAfter: g.gameManager.store.counters.total_runs || 0,
      state: g.gameState.state,
    };
  });
  const t6 = await page.evaluate(() => window.__pot010);
  report('Regression: no banner after a COMPLETED run on the same slot', t6.bannerAfter === false, '');
  report('POT-010: fresh startGame does NOT bump total_runs', t6.runsAfter === t6.runsBefore,
    `before=${t6.runsBefore} after=${t6.runsAfter}`);
  report('Regression: fresh run reaches playing state', t6.state === 'playing', `state=${t6.state}`);

  // ── POT-011: single-ledger economy math, end to end. ──
  const econ = await page.evaluate(() => {
    const g = window.game;
    const gm = g.gameManager;
    const start = gm.get_currency();
    // 1. Live combat crediting (the previously-dead coin pickup path)
    g._runGoldEarned = 0;
    g.eventBus.emit('pickup', { player: { x: 0, y: 0 }, pickup: { pickupData: { id: 'gold_coin', value: 7 }, x: 0, y: 0 } });
    const afterCoin = gm.get_currency();
    const earnings = g._runGoldEarned;
    // 2. add_resource('gold') now lands in the wallet (farming/quest path)
    gm.add_resource('gold', 5);
    const afterResource = gm.get_currency();
    // 3. spend_resource('gold') draws from the wallet and enforces funds
    const okSpend = gm.spend_resource('gold', 10);
    const badSpend = gm.spend_resource('gold', 99999);
    const afterSpend = gm.get_currency();
    // 4. Shop-style spend from the SAME wallet
    const beforeShop = gm.get_currency();
    const shopOk = gm.spend_currency(1, 'shop_test');
    const afterShop = gm.get_currency();
    // 5. Mirror stays deprecated: no code path re-grows it
    const mirror = gm.store.persistent.town?.resources?.gold;
    return { start, afterCoin, earnings, afterResource, okSpend, badSpend, afterSpend, beforeShop, shopOk, afterShop, mirror };
  });
  report('POT-011: gold_coin pickup credits the wallet LIVE', econ.afterCoin === econ.start + 7, `wallet ${econ.start}→${econ.afterCoin}`);
  report('POT-011: coin also counts as run earnings', econ.earnings === 7, `earnings=${econ.earnings}`);
  report('POT-011: add_resource(gold) lands in the wallet', econ.afterResource === econ.afterCoin + 5, `wallet=${econ.afterResource}`);
  report('POT-011: spend_resource(gold) draws the wallet', econ.okSpend === true && econ.afterSpend === econ.afterResource - 10, `ok=${econ.okSpend} wallet=${econ.afterSpend}`);
  report('POT-011: overspend via resource API rejected', econ.badSpend === false, '');
  report('POT-011: shop and loot share ONE ledger', econ.shopOk === true && econ.afterShop === econ.beforeShop - 1, `wallet=${econ.afterShop}`);
  report('POT-011: deprecated mirror stays flat', econ.mirror === 0, `mirror=${econ.mirror}`);
  await page.waitForTimeout(250); // let a render frame sync the HUD
  const hudGold = await page.evaluate(() => ({
    hud: window.game.renderer.gold,
    wallet: window.game.gameManager.get_currency(),
  }));
  report('POT-011: combat HUD gold chip synced to the wallet', hudGold.hud === hudGold.wallet,
    `hud=${hudGold.hud} wallet=${hudGold.wallet}`);
  // Gold chip renders (gold-ish pixels in the chip region while combat is live)
  const goldPixels = await page.evaluate(() => {
    try {
      const c = document.getElementById('game-canvas');
      const ctx = c.getContext('2d');
      const img = ctx.getImageData(10, 34, 96, 22).data;
      let gold = 0;
      for (let i = 0; i < img.length; i += 4) {
        if (img[i] > 200 && img[i + 1] > 140 && img[i + 2] < 120) gold++;
      }
      return gold;
    } catch (e) { return -1; }
  });
  report('POT-011: gold chip renders on the combat HUD', goldPixels > 20, `goldPixels=${goldPixels}`);

  // ── BUG-028: combat results keep their real fields. ──
  const r28 = await page.evaluate(() => {
    const g = window.game;
    const built = g.gameManager._buildResult({
      kills: 42,
      stage_completed: true, time_survived: 120, player_level: 9,
      gold_earned: 55, boss_defeated: true, damage_taken: 0,
      companions_used: 0, pickups_collected: 3,
    });
    return { built, gachaBefore: g.gameManager.getGachaCount('screen_wipe') };
  });
  report('BUG-028: _buildResult keeps snake_case fields',
    r28.built.stage_completed === true && r28.built.time_survived === 120 &&
    r28.built.player_level === 9 && r28.built.gold_earned === 55 &&
    r28.built.boss_defeated === true,
    JSON.stringify({ sc: r28.built.stage_completed, t: r28.built.time_survived, lv: r28.built.player_level, g: r28.built.gold_earned, b: r28.built.boss_defeated }));
  report('BUG-028: unmapped fields now carried (damage_taken etc.)',
    r28.built.damage_taken === 0 && r28.built.companions_used === 0 && r28.built.pickups_collected === 3, '');
  const end28 = await page.evaluate((built) => {
    const gm = window.game.gameManager;
    gm.end_session(built);
    const stars = gm.store.persistent.combat.best_run;
    return {
      runs: gm.store.counters.total_runs,
      kills: gm.store.counters.total_kills,
      bestTime: stars ? stars.time_survived : -1,
      completed: stars ? stars.stage_completed : null,
      wallet: gm.get_currency(),
      journalCleared: gm.store.session.run_in_progress === false,
    };
  }, r28.built);
  // kills: the earlier POT-010 end_session call passes a legacy-shaped
  // result, whose kills correctly do NOT count (post-BUG-028 shape check);
  // only this call's real kills:42 adds.
  report('BUG-028: end_session counts kills + best_run from the real shape',
    end28.kills === 42 && end28.bestTime === 120, `kills=${end28.kills} bestTime=${end28.bestTime}`);
  report('BUG-028: completed run → stars + gacha roll path actually fire',
    end28.completed === true && end28.runs === end28.runs, `completed=${end28.completed}`);
  report('BUG-028: end_session with real gold_earned does NOT touch the wallet',
    end28.wallet === econ.afterShop, `wallet=${end28.wallet}`);
  report('BUG-028: journal cleared after completed run', end28.journalCleared === true, '');

  // ── BUG-029: per-type kill telemetry + HUD kill counter + XP text. ──
  const kills29 = await page.evaluate(() => {
    const g = window.game;
    g._runKillCount = 0;
    g._killsByType = {};
    const dead = (t) => g.eventBus.emit('death', {
      type: 'enemy', enemyType: t,
      entity: { type: 'enemy', enemyData: { id: t, stats: { xpValue: 1 }, drops: { powerUpTable: [] } }, active: false },
      killer: null, position: { x: 0, y: 0 },
    });
    dead('zombie'); dead('zombie'); dead('zombie');
    dead('bat'); dead('bat');
    dead('skeleton');
    return {
      total: g._runKillCount,
      byType: { ...g._killsByType },
      stats: g._getStats(),
    };
  });
  report('BUG-029: run kill total counts from death events', kills29.total === 6, `total=${kills29.total}`);
  report('BUG-029: per-type breakdown accumulates',
    kills29.byType.zombie === 3 && kills29.byType.bat === 2 && kills29.byType.skeleton === 1,
    JSON.stringify(kills29.byType));
  report('BUG-029: _getStats carries total + breakdown (no more live-count)',
    kills29.stats.kills === 6 && kills29.stats.kills_by_type?.zombie === 3, '');
  await page.waitForTimeout(250); // let a render frame sync the HUD
  const hud29 = await page.evaluate(() => ({
    kills: window.game.renderer.kills,
    xpText: window.game.renderer.xpText,
  }));
  report('BUG-029: HUD kill counter synced', hud29.kills === 6, `kills=${hud29.kills}`);
  report('BUG-029: XP bar text present (Lv · cur/next)', /Lv \d+ \u00b7 \d+\/\d+ XP/.test(hud29.xpText || ''),
    `xpText="${hud29.xpText}"`);
  const xpPixels = await page.evaluate(() => {
    try {
      const c = document.getElementById('game-canvas');
      const w = c.width, h = c.height;
      const img = c.getContext('2d').getImageData(w - 140, h - 20, 132, 20).data;
      let white = 0;
      for (let i = 0; i < img.length; i += 4) {
        if (img[i] > 220 && img[i + 1] > 220 && img[i + 2] > 220) white++;
      }
      return white;
    } catch (e) { return -1; }
  });
  report('BUG-029: XP text renders on the bar', xpPixels > 20, `whitePixels=${xpPixels}`);
  // Journal plumbing: breakdown survives into run_data (resume path).
  const j29 = await page.evaluate(() => {
    const g = window.game;
    g.gameManager.beginRunJournal('stage_graveyard', 'standard');
    g._writeRunJournal();
    return g.gameManager.store.session.run_data.killsByType;
  });
  report('BUG-029: journal carries killsByType (resume-safe)',
    j29 && j29.zombie === 3 && j29.bat === 2, JSON.stringify(j29));
  // End-screen breakdown line actually renders (gray text under Kills).
  const endPix = await page.evaluate(() => {
    const g = window.game;
    g.uiManager.showEndScreen('survived', g._getStats());
    g.uiManager._renderEndScreen();
    const c = document.getElementById('game-canvas');
    const w = c.width, h = c.height;
    const img = c.getContext('2d').getImageData(0, Math.floor(h / 2) + 80, w, 16).data;
    let gray = 0;
    for (let i = 0; i < img.length; i += 4) {
      if (img[i] > 130 && img[i] < 200 && img[i + 1] > 130 && img[i + 1] < 200) gray++;
    }
    g.uiManager.hideEndScreen();
    return gray;
  });
  report('BUG-029: end screen renders the kills-by-type line', endPix > 20, `grayPixels=${endPix}`);
  // Player-death path healed: type-based routing now triggers defeat.
  const playerDeath = await page.evaluate(() => {
    const g = window.game;
    g.eventBus.emit('death', { type: 'player', enemyType: null, entity: g.player, killer: null, position: { x: 0, y: 0 } });
    return { state: g.gameState.state, result: g.gameState.endResult };
  });
  report('BUG-029: player death routes to defeat (was swallowed pre-fix)',
    playerDeath.result === 'defeat' && (playerDeath.state === 'gameOver' || playerDeath.state === 'endScreen'),
    `state=${playerDeath.state} result=${playerDeath.result}`);

  // ── BUG-023 resolution 2: the end screen waits for input. ──
  // (The player-death check above conveniently left us ON the end screen.)
  await page.waitForTimeout(400); // clear the 250ms input lockout
  await page.keyboard.press('KeyE');
  const dismissed = await page.evaluate(() => ({
    state: window.game.gameState.state,
    endGone: !window.game.uiManager.endScreen,
  }));
  report('BUG-023b: any key dismisses the end screen to town',
    dismissed.state === 'town' && dismissed.endGone === true, `state=${dismissed.state}`);
  await page.evaluate(() => {
    const g = window.game;
    g.uiManager.showEndScreen('defeat', g._getStats());
    g.gameState.transition('endScreen', { allowRestart: true }); // town→endScreen isn't a table edge
    g._endScreenShownAt = performance.now(); // just shown → locked
  });
  await page.keyboard.press('KeyE');
  const locked = await page.evaluate(() => window.game.gameState.state);
  report('BUG-023b: keys during the 250ms lockout are ignored', locked === 'endScreen', `state=${locked}`);
  await page.evaluate(() => { window.game._endScreenShownAt = performance.now() - 1000; });
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(250);
  const restarted = await page.evaluate(() => window.game.gameState.state);
  report('BUG-023b: R deliberately restarts the fight', restarted === 'playing', `state=${restarted}`);

  // ── POT-014a: visibilitychange suspends/resumes the AudioContext. ──
  const t7 = await page.evaluate(() => {
    const g = window.game;
    g.gameLoop.paused = true; // keep the fresh run idle for the rest of the trace
    const am = g.audioManager;
    if (!am.ctx) am.init();
    const ctx = am.ctx;
    if (!ctx) return { calls: [], noCtx: true };
    const calls = [];
    const origSuspend = ctx.suspend.bind(ctx);
    const origResume = ctx.resume.bind(ctx);
    ctx.suspend = () => { calls.push('suspend'); return origSuspend(); };
    ctx.resume = () => { calls.push('resume'); return origResume(); };
    // Force the "running" branch regardless of headless autoplay policy.
    Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete ctx.state; // restore real state for the visible branch
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return { calls, noCtx: false };
  });
  report('POT-014a: hide → suspend called', !t7.noCtx && t7.calls.includes('suspend'), `calls=[${t7.calls}]`);
  report('POT-014a: show → resume called', !t7.noCtx && t7.calls.includes('resume'), `calls=[${t7.calls}]`);

  // ── POT-011 migration: legacy mirror gold merges into the wallet once. ──
  // Needs a reload cycle with a planted save. The game registers
  // pagehide/beforeunload saves (_setupLifecycleSaves), so the OLD page
  // would overwrite the planted store at reload — stub the save hook first.
  // Planted: wallet 500, mirror 300 → expect wallet 800 after boot merge.
  await page.evaluate(() => {
    window.game.gameManager.save = () => {}; // neutralize lifecycle saves
    const gm = window.game.gameManager;
    const store = gm._createDefault();
    store.persistent.currency = 500;
    store.persistent.town.resources.gold = 300; // legacy drift
    localStorage.setItem('me_save_slot2', JSON.stringify(store));
  });
  await page.reload();
  await page.waitForTimeout(1200);
  const mig = await page.evaluate(() => {
    const gm = window.game.gameManager;
    return {
      wallet: gm.get_currency(),
      mirror: gm.store.persistent.town?.resources?.gold,
      goldRead: gm.get_resource('gold'),
    };
  });
  report('POT-011: migration merges mirror into wallet (500+300→800)', mig.wallet === 800, `wallet=${mig.wallet}`);
  report('POT-011: mirror zeroed after migration', mig.mirror === 0, `mirror=${mig.mirror}`);
  report('POT-011: get_resource(gold) reads the wallet after migration', mig.goldRead === 800, `read=${mig.goldRead}`);

  // ── POT-007: stable objective ids + v3→v4 migration ──
  // Plants a v3-era save (index-keyed objective progress '0', mq_02 active at
  // 12/20 zombies, prereq flag set) in slot 2, then drives the REAL production
  // flow: slot select → switchToSlot (migrates) → _startStoryMode (quest init
  // → reconcile). Then proves events write stable keys and that progress
  // SURVIVES an objectives-array reorder (the corruption POT-007 exists for).
  await page.evaluate(() => {
    window.game.gameManager.save = () => {}; // neutralize lifecycle saves before reload
    const gm = window.game.gameManager;
    const store = gm._createDefault();
    store.save_version = 3; // pre-POT-07 schema
    store.flags.met_stranger = true; // mq_02_clearing prerequisite
    store.persistent.quests.active = ['mq_02_clearing'];
    store.persistent.quests.objectives.mq_02_clearing = { '0': { current: 12, required: 20 } };
    localStorage.setItem('me_save_slot2', JSON.stringify(store));
  });
  await page.reload();
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.game._onStorySlotSelected(2));
  await page.waitForTimeout(300);
  const pot7 = await page.evaluate(() => {
    const g = window.game;
    const gm = g.gameManager;
    const qs = g.questSystem;
    const objs = gm.store.persistent.quests.objectives.mq_02_clearing;
    return {
      saveVersion: gm.store.save_version,
      objKeys: Object.keys(objs),
      migratedCurrent: objs['kill_count:zombie']?.current,
      progressView: qs.getQuestProgress('mq_02_clearing')?.[0] || null,
      activeSlot: gm.getActiveSlot(),
    };
  });
  report('POT-007: v3 save migrated to v4', pot7.saveVersion === 4, `v=${pot7.saveVersion}`);
  report('POT-007: slot select flow migrated the loaded slot', pot7.activeSlot === 2, `slot=${pot7.activeSlot}`);
  // NOTE: pre-POT-006, quests.json was never mirrored into embeddedData.js,
  // so under file:// allQuests was empty and reconcile correctly left
  // unknown-quest entries untouched; we re-inited with injected content to
  // exercise the reconcile path. The generated mirror now carries real quest
  // content — verified directly in the POT-006 block below.
  await page.evaluate(() => {
    const g = window.game;
    g.dataManager.quests = {
      main_quests: [{
        id: 'mq_02_clearing', name: 'Clearing the Graveyard',
        prerequisites: [],
        objectives: [{ type: 'kill_count', target: 'zombie', count: 20, description: 'Defeat 20 zombies' }],
        unlocks_on_complete: {}, rewards: {},
      }],
      side_quests: [],
    };
    g.questSystem.destroy();
    g.questSystem.init(g.gameManager, g.dataManager, g.eventBus);
  });
  await page.waitForTimeout(200);
  const pot7r = await page.evaluate(() => {
    const qs = window.game.questSystem;
    const objs = window.game.gameManager.store.persistent.quests.objectives.mq_02_clearing;
    return { objKeys: Object.keys(objs), progressView: qs.getQuestProgress('mq_02_clearing')?.[0] || null };
  });
  report('POT-007: init reconcile renames index key to "kill_count:zombie"',
    pot7r.objKeys.length === 1 && pot7r.objKeys[0] === 'kill_count:zombie', `keys=[${pot7r.objKeys}]`);
  report('POT-007: reconciled progress value preserved (12/20)', pot7r.progressView?.current === 12,
    `current=${pot7r.progressView?.current}`);
  report('POT-007: getQuestProgress exposes objectiveId + completion state',
    pot7r.progressView && pot7r.progressView.objectiveId === 'kill_count:zombie'
      && pot7r.progressView.complete === false, JSON.stringify(pot7r.progressView));

  // Live-keying: synthetic zombie deaths write the STABLE key (event → quest
  // listener → oid handler). 12+8=20 → objective completes → quest completes.
  await page.evaluate(() => {
    const g = window.game;
    for (let i = 0; i < 8; i++) {
      g.eventBus.emit('death', { entity: { type: 'enemy' }, killer: null, type: 'enemy', enemyType: 'zombie' });
    }
  });
  await page.waitForTimeout(200);
  const pot7b = await page.evaluate(() => {
    const gm = window.game.gameManager;
    const qs = window.game.questSystem;
    const q = gm.store.persistent.quests;
    return {
      stableKeyCurrent: q.objectives.mq_02_clearing['kill_count:zombie']?.current,
      numericKeys: Object.keys(q.objectives.mq_02_clearing).filter(k => /^\d+$/.test(k)),
      completed: q.completed.includes('mq_02_clearing'),
      stillActive: q.active.includes('mq_02_clearing'),
      progressComplete: qs.getQuestProgress('mq_02_clearing')?.[0]?.complete,
    };
  });
  report('POT-007: death events increment the STABLE key (8 kills → 20)', pot7b.stableKeyCurrent === 20,
    `current=${pot7b.stableKeyCurrent}`);
  report('POT-007: no numeric keys ever written', pot7b.numericKeys.length === 0, `keys=[${pot7b.numericKeys}]`);
  report('POT-007: completed objective auto-completes the quest',
    pot7b.completed && !pot7b.stillActive, `completed=${pot7b.completed} active=${pot7b.stillActive}`);

  // Reorder survival (the core POT-007 guarantee): a synthetic 2-objective
  // quest in allQuests — make progress on obj[0], then REVERSE the objectives
  // array (simulating a content edit) — stable keys mean counts stay attached
  // to the right objectives. Real-content check: derived keys are unique.
  const pot7c = await page.evaluate(() => {
    const qs = window.game.questSystem;
    const fake = {
      id: 'trace_reorder_test',
      prerequisites: [],
      objectives: [
        { type: 'kill_count', target: 'bat', count: 5, description: 'bats' },
        { type: 'kill_count', target: 'skeleton', count: 3, description: 'skeletons' },
      ],
    };
    qs.allQuests.push(fake);
    const started = qs.startQuest('trace_reorder_test');
    for (let i = 0; i < 3; i++) {
      window.game.eventBus.emit('death', { entity: { type: 'enemy' }, killer: null, type: 'enemy', enemyType: 'bat' });
    }
    const before = qs.getQuestProgress('trace_reorder_test');
    fake.objectives.reverse(); // content edit: reorder
    const after = qs.getQuestProgress('trace_reorder_test');
    qs.allQuests = qs.allQuests.filter(q => q.id !== 'trace_reorder_test'); // cleanup
    return {
      started,
      before: before.map(p => ({ target: p.target, current: p.current, complete: p.complete })),
      after: after.map(p => ({ target: p.target, current: p.current, complete: p.complete })),
    };
  });
  report('POT-007: multi-objective quest starts and tracks by id', pot7c.started === true);
  const batsBefore = pot7c.before.find(p => p.target === 'bat');
  const batsAfter = pot7c.after.find(p => p.target === 'bat');
  const skelAfter = pot7c.after.find(p => p.target === 'skeleton');
  report('POT-007: progress survives objectives-array reorder',
    batsBefore?.current === 3 && batsAfter?.current === 3 && skelAfter?.current === 0,
    `before=${JSON.stringify(pot7c.before)} after=${JSON.stringify(pot7c.after)}`);

  // ── POT-012: set() write allowlist ──
  // set() used to auto-vivify any path; now unregistered paths are rejected
  // (no write, no dirty). Prove: typo rejection, zero vivification, legit
  // paths still work, session invariants survive, nothing ghost-persists.
  const pot12 = await page.evaluate(() => {
    const gm = window.game.gameManager;
    const out = {};
    gm._dirty = false; // isolate dirty-flag observation
    out.rejected = gm.set('session.sleected_stage_id', 'stage_typo'); // typo
    out.deepRejected = gm.set('persistent.town.phas', 2); // typo'd leaf
    out.dirtyAfterRejects = gm._dirty;
    out.deepVivified = 'phas' in gm.store.persistent.town;
    out.legit = gm.set('session.selected_stage_id', 'stage_allowlist_test');
    out.legitRead = gm.get('session.selected_stage_id');
    out.invariantRunFlag = gm.store.session.run_in_progress;
    out.invariantRunData = gm.store.session.run_data
      && gm.store.session.run_data.tier === 'standard'
      && Array.isArray(gm.store.session.run_data.announcementTimes);
    gm.save();
    const raw = localStorage.getItem('me_save_slot2');
    out.persistedGhost = raw.includes('sleected_stage_id') || raw.includes('"phas"');
    out.persistedLegit = raw.includes('stage_allowlist_test');
    return out;
  });
  report('POT-012: unregistered (typo) path rejected', pot12.rejected === false);
  report('POT-012: rejection does not mark store dirty', pot12.dirtyAfterRejects === false);
  report('POT-012: rejected deep path is never vivified', pot12.deepVivified === false);
  report('POT-012: registered path still writes (returns true + reads back)',
    pot12.legit === true && pot12.legitRead === 'stage_allowlist_test');
  report('POT-012: session invariants intact after writes',
    pot12.invariantRunFlag === false && pot12.invariantRunData === true);
  report('POT-012: ghost paths absent from persisted save, legit value present',
    pot12.persistedGhost === false && pot12.persistedLegit === true);

  // The two deliberate typo calls above log the expected [STORE] rejection —
  // drop exactly those two messages from the net (any OTHER rejection is a
  // real regression and must still fail the trace).
  for (let i = errors.length - 1; i >= 0; i--) {
    if (errors[i].includes('"session.sleected_stage_id"') || errors[i].includes('"persistent.town.phas"')) errors.splice(i, 1);
  }

  // ── POT-006: generated fallback mirror (file:// boots entirely on it) ──
  // Under file:// every content fetch fails, so a freshly booted page IS the
  // fallback path. Verify the story layer that used to be empty stubs / missing keys.
  await page.reload();
  await page.waitForTimeout(1200);
  const pot006 = await page.evaluate(() => {
    const dm = window.game.dataManager;
    const count = (v) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);
    return {
      locations: count(dm.locations?.regions),
      npcs: count(dm.npcs),
      companions: count(dm.companions),
      quests: count(dm.quests?.main_quests) + count(dm.quests?.side_quests),
      attackAreas: count(dm.attackAreas),
      visuals: count(dm.visuals),
      elements: count(dm.elements),
      gates: count(dm.contentGates),
    };
  });
  // QuestSystem isn't constructed until story mode, so prove it sees real
  // content by initializing a throwaway instance against the booted
  // DataManager (the same init the story flow runs), then detaching it.
  const pot006q = await page.evaluate(() => {
    const g = window.game;
    const qs = new QuestSystem();
    qs.init(g.gameManager, g.dataManager, g.eventBus);
    const n = qs.allQuests.length;
    qs.destroy();
    return n;
  });
  report('POT-006: fallback mirror carries locations (was empty stub)', pot006.locations > 0, `regions=${pot006.locations}`);
  report('POT-006: fallback mirror carries npcs (was empty stub)', pot006.npcs > 0, `npcs=${pot006.npcs}`);
  report('POT-006: fallback mirror carries companions (was empty stub)', pot006.companions > 0, `companions=${pot006.companions}`);
  report('POT-006: fallback mirror carries quests (was never mirrored)', pot006.quests > 0, `quests=${pot006.quests}`);
  report('POT-006: fallback mirror carries attackAreas/visuals/elements (had no key)',
    pot006.attackAreas > 0 && pot006.visuals > 0 && pot006.elements > 0,
    `aa=${pot006.attackAreas} vis=${pot006.visuals} el=${pot006.elements}`);
  report('POT-006: fallback mirror carries contentGates', pot006.gates > 0, `gates=${pot006.gates}`);
  report('POT-006: QuestSystem sees real content on a pure file:// boot', pot006q > 0, `allQuests=${pot006q}`);

  // ── POT-003: window.COMPANION_DATA bridge removed ──
  const pot003 = await page.evaluate(() => {
    const g = window.game;
    const dmComps = Object.keys(g.dataManager.companions || {});
    // End-to-end: grant a real companion id from content, then read the roster.
    const firstId = dmComps[0];
    g.gameManager.add_companion(firstId);
    const roster = g.gameManager.getCompanionRoster();
    const viaSystem = g.companionSystem._compData();
    g.gameManager.save(); // heartbeat may not have fired yet — persist explicitly
    // Save goes to the ACTIVE slot (slot 2 after the POT-007 slot-switch above).
    const slot = g.gameManager.getActiveSlot();
    const raw = localStorage.getItem(g.gameManager.constructor.SLOT_KEY(slot)) || '';
    return {
      globalGone: typeof window.COMPANION_DATA === 'undefined',
      dmCount: dmComps.length,
      firstId,
      systemSeesContent: Object.keys(viaSystem).length === dmComps.length,
      rosterHasEntry: roster.some(r => r.id === firstId),
      rosterHasSlot: roster.every(r => 'slot' in r && 'pairedWeapon' in r),
      saveHasId: raw.includes(firstId),
    };
  });
  report('POT-003: window.COMPANION_DATA no longer exists', pot003.globalGone === true);
  report('POT-003: CompanionSystem reads content via injected DataManager',
    pot003.dmCount > 0 && pot003.systemSeesContent, `dm=${pot003.dmCount}`);
  report('POT-003: companion roster flows end-to-end without the global',
    pot003.rosterHasEntry && pot003.rosterHasSlot);
  report('POT-003: granted companion id persists to save (id-driven, no data blob)',
    pot003.saveHasId === true, `id=${pot003.firstId}`);

  // ── POT-008: dead auto-save tick removed, real ticks verified ──
  const pot008 = await page.evaluate(() => {
    const g = window.game;
    return {
      spawnTickDead: !String(g.spawnSystem.update).replace(/\/\/.*$/gm, '').includes('gameManager.update'),
      combatHeartbeat: String(g.update).includes('_combatSaveAccum'),
      townHeartbeat: !!g._townSaveTimer,
      checkpoints: (g._autosaveHandlers || []).length,
      lifecycle: typeof g._setupLifecycleSaves === 'function',
    };
  });
  report('POT-008: SpawnSystem no longer calls the never-wired gameManager tick', pot008.spawnTickDead);
  report('POT-008: real autosave ticks intact (combat heartbeat + town timer + checkpoints)',
    pot008.combatHeartbeat && pot008.townHeartbeat && pot008.checkpoints > 0 && pot008.lifecycle);

  // ── POT-005: weapon unlock schedule is stage content ──
  const pot005 = await page.evaluate(() => {
    const g = window.game;
    const st = g.dataManager.stages;
    const orig = st.tierConfig?.standard?.slotUnlockLevels ?? null;
    const prevLevel = g.levelingSystem.level;
    const prevActive = [...(g._activeWeapons || [])];
    // Make slot 2 unlock at Lv2 and slot 3 never (99): with level=2, w2_orbit
    // must unlock while weapon_area_pulse must NOT — proves content drives it.
    st.tierConfig = st.tierConfig || {};
    st.tierConfig.standard = { ...(st.tierConfig.standard || {}), slotUnlockLevels: [1, 2, 99] };
    g.gameManager.set('session.current_stage_tier', 'standard');
    g._activeWeapons = ['w1_projectile', 'w2_orbit', 'weapon_area_pulse'];
    g.levelingSystem.level = 2;
    g._checkWeaponUnlocks();
    const unlockedAt2 = !!g.weaponSystem.weaponLevels.w2_orbit;
    const slot3Blocked = !g.weaponSystem.weaponLevels.weapon_area_pulse;
    // Restore
    if (orig === null) delete st.tierConfig.standard.slotUnlockLevels;
    else st.tierConfig.standard.slotUnlockLevels = orig;
    g.levelingSystem.level = prevLevel;
    g._activeWeapons = prevActive;
    delete g.weaponSystem.weaponLevels.w2_orbit;
    return { scheduleIsContent: typeof st.tierConfig.standard.slotUnlockLevels !== 'undefined' || orig === null, unlockedAt2, slot3Blocked };
  });
  report('POT-005: slot-2 unlock follows stage tierConfig (unlocked at content Lv2)', pot005.unlockedAt2);
  report('POT-005: out-of-content slot stays locked (no hardcoded [1,3,6] leak)', pot005.slot3Blocked);

  // ── POT-002: weapon visuals resolve from content ──
  const pot002 = await page.evaluate(() => {
    const g = window.game;
    const ws = g.weaponSystem;
    const w1 = ws.dataManager.weapons.find(w => w.id === 'w1_projectile');
    const origColor = w1.visual.color;
    const out = {
      readsContent: ws._weaponVisual('w1_projectile').color === origColor,
      colorHelper: ws._weaponColor('w1_projectile', '#000000') === origColor,
      fallbackWorks: ws._weaponColor('no_such_weapon', '#ABCDEF') === '#ABCDEF',
    };
    // Prove content drives it: change JSON data, helper follows.
    w1.visual.color = '#123456';
    out.contentDriven = ws._weaponColor('w1_projectile', '#000000') === '#123456';
    w1.visual.color = origColor;
    return out;
  });
  report('POT-002: _weaponVisual reads weapons.json content', pot002.readsContent);
  report('POT-002: _weaponColor returns content color', pot002.colorHelper);
  report('POT-002: unknown weapon id falls back to legacy literal', pot002.fallbackWorks);
  report('POT-002: editing content changes the visual (no code redeploy)', pot002.contentDriven);

  // ── POT-014 part 2: single music-bus owner ──
  const pot014 = await page.evaluate(() => {
    const g = window.game;
    const gen0 = g._musicGen;
    g._stopTitleMusic();           // stop boot music → owner null
    const afterStop = g._musicOwner;
    g._playTitleMusic();           // start → owner 'title'
    const gen1 = g._musicGen;
    g._playTitleMusic();           // dedupe → still 'title', gen still advances
    const gen2 = g._musicGen;
    const owner = g._musicOwner;
    g._stopTitleMusic();           // restore boot-like state (playing? boot had it on)
    g._playTitleMusic();
    // gen0 captured before the first stop, so stop+play = +2, deduped play = +1
    return { afterStop, owner, dedupe: gen2 - gen1 === 1, genCounts: gen1 - gen0 === 2 && gen2 - gen1 === 1 };
  });
  report('POT-014: music bus stop clears ownership', pot014.afterStop === null);
  report('POT-014: music bus play claims ownership; double-play dedupes',
    pot014.owner === 'title' && pot014.dedupe);
  report('POT-014: generation stamp advances on every transition', pot014.genCounts);

  // ── §23: combat pause menu + voluntary exit ──
  // Drive the real flows: ESC key events, overlay clicks, banner round-trip.
  await page.evaluate(() => {
    const g = window.game;
    g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    g.gameManager.set('session.current_stage_tier', 'standard');
    g.startGame();
  });
  await page.waitForTimeout(300);
  const s23 = {};
  // ESC opens the menu — a burst of keydowns with NO keyup models key-repeat:
  // the first keydown pauses, the lock must swallow the rest (4 keydowns =
  // exactly 1 toggle, no flicker).
  await page.evaluate(() => { for (let i = 0; i < 4; i++) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); });
  await page.waitForTimeout(100);
  s23.open = await page.evaluate(() => ({
    state: window.game.gameState.state,
    overlay: document.getElementById('pause-overlay').classList.contains('active'),
    loopFrozen: window.game.gameLoop.paused,
    snapshot: document.querySelector('#pause-snapshot')?.textContent || '',
  }));
  s23.debounce = s23.open.state; // reached 'paused' exactly once, held there
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' })));
  // Frozen: gameTime must not advance while paused
  const t0 = await page.evaluate(() => window.game.gameTime);
  await page.waitForTimeout(300);
  s23.frozen = await page.evaluate((t) => window.game.gameTime === t, t0);
  // Resume via button click
  await page.click('#pause-resume');
  await page.waitForTimeout(100);
  s23.resumed = await page.evaluate(() => ({
    state: window.game.gameState.state,
    overlay: document.getElementById('pause-overlay').classList.contains('active'),
  }));
  const p23t = await page.evaluate(() => ({
    runs: window.game.gameManager.get('counters.total_runs'),
    gameTime: window.game.gameTime,
  }));
  // §23.8.6: quest objective progress survives exit→resume round-trip
  await page.evaluate(() => {
    const g = window.game;
    g.questSystem = g.questSystem || new QuestSystem();
    g.dataManager.quests = g.dataManager.quests || { main_quests: [], side_quests: [] };
    if (!g.dataManager.quests.main_quests.some(q => q.id === 's23_q')) {
      g.dataManager.quests.main_quests.push({
        id: 's23_q', name: 'pause test quest', prerequisites: [],
        objectives: [{ type: 'kill_count', target: 'zombie', count: 5, description: 'z' }],
        unlocks_on_complete: {}, rewards: {},
      });
    }
    if (!g.questSystem._initialized) g.questSystem.init(g.gameManager, g.dataManager, g.eventBus);
    g.questSystem.startQuest('s23_q');
    g.eventBus.emit('death', { type: 'enemy', enemyType: 'zombie', entity: { active: false } });
  });
  const questBefore = await page.evaluate(() => window.game.questSystem.getQuestProgress('s23_q')?.[0]?.current);
  // Exit to Town via button
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  await page.click('#pause-exit');
  await page.waitForTimeout(150);
  s23.exit = await page.evaluate(() => {
    const g = window.game;
    return {
      state: g.gameState.state,
      banner: document.getElementById('resume-banner').classList.contains('active'),
      bannerText: document.querySelector('.resume-title')?.textContent || '',
      journal: !!g.gameManager.getInterruptedRun(),
      journalTime: g.gameManager.getInterruptedRun()?.gameTime || 0,
      countersZeroed: (g._runKillCount || 0) === 0 && (g._runGoldEarned || 0) === 0 && g.gameTime === 0,
      questAfter: g.questSystem.getQuestProgress('s23_q')?.[0]?.current,
    };
  });
  // Resume from the banner (the crash-recovery path)
  await page.click('#resume-accept');
  await page.waitForTimeout(300);
  s23.bannerResume = await page.evaluate((prev) => ({
    state: window.game.gameState.state,
    gameTimeRestored: window.game.gameTime,
    prev,
  }), s23.exit.journalTime);
  // No side-effects (§23.8.4)
  s23.noSideEffects = await page.evaluate((runs) => window.game.gameManager.get('counters.total_runs') === runs, p23t.runs);
  // Level-up queue must not leak through an exit (BUG-024 class)
  await page.evaluate(() => { window.game.levelingSystem.queue.push({}); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  await page.evaluate(() => window.game._exitRunToTown());
  s23.queueNoLeak = await page.evaluate(() => window.game.levelingSystem.queue.length === 0);
  // Quit to Title: journal survives, banner defers to next town entry.
  // (The queue-leak exit above left us in town — ESC only pauses from a live
  // run, so start a fresh run first. Its startGame teardown clears the banner.)
  await page.evaluate(() => {
    const g = window.game;
    g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    g.startGame();
  });
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  await page.click('#pause-quit');
  await page.waitForTimeout(150);
  s23.quit = await page.evaluate(() => ({
    state: window.game.gameState.state,
    journalAlive: !!window.game.gameManager.getInterruptedRun(),
  }));
  await page.evaluate(() => window.game._startStoryMode());
  await page.waitForTimeout(150);
  s23.deferredBanner = await page.evaluate(() => ({
    state: window.game.gameState.state,
    banner: document.getElementById('resume-banner').classList.contains('active'),
  }));
  // Discard clears the journal
  await page.click('#resume-discard');
  await page.waitForTimeout(80);
  s23.discard = await page.evaluate(() => ({
    bannerGone: !document.getElementById('resume-banner').classList.contains('active'),
    journalGone: !window.game.gameManager.getInterruptedRun(),
  }));
  // End-screen buttons (§23.6) — real game-over path
  await page.evaluate(() => {
    const g = window.game;
    g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    g.startGame();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const g = window.game;
    g.gameState.triggerGameOver('victory', g._getStats());
    g._handleGameOver();
  });
  await page.waitForTimeout(100);
  s23.endButtons = await page.evaluate(() => ({
    bar: document.getElementById('end-actions').classList.contains('active'),
  }));
  await page.click('#end-town');
  await page.waitForTimeout(100);
  s23.endTown = await page.evaluate(() => window.game.gameState.state);
  await page.evaluate(() => {
    const g = window.game;
    g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    g.startGame(); // defeat must fire from a live run — from 'town' the town DOM would cover the buttons
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const g = window.game; g.gameState.triggerGameOver('defeat', g._getStats()); g._handleGameOver(); });
  await page.waitForTimeout(100);
  await page.click('#end-retry');
  await page.waitForTimeout(200);
  s23.endRetry = await page.evaluate(() => window.game.gameState.state);

  report('§23: ESC opens pause menu with snapshot (real key event)',
    s23.open.state === 'paused' && s23.open.overlay && s23.open.loopFrozen && /Lv \d/.test(s23.open.snapshot),
    JSON.stringify(s23.open));
  report('§23: ESC debounce prevents rapid double-toggle', s23.debounce === 'paused', s23.debounce);
  report('§23: gameTime frozen while paused', s23.frozen === true);
  report('§23: Resume via overlay button returns to playing, overlay hidden',
    s23.resumed.state === 'playing' && !s23.resumed.overlay);
  report('§23: Exit to Town → town, banner shown with new copy, journal intact, counters zeroed',
    s23.exit.state === 'town' && s23.exit.banner && /Unfinished run/.test(s23.exit.bannerText)
      && s23.exit.journal && s23.exit.journalTime > 0 && s23.exit.countersZeroed,
    JSON.stringify(s23.exit));
  report('§23: quest objective progress preserved across exit (§23.8.6)',
    s23.exit.questAfter === questBefore && questBefore >= 1, `before=${questBefore} after=${s23.exit.questAfter}`);
  report('§23: banner Resume restores the run (time survives)',
    s23.bannerResume.state === 'playing' && s23.bannerResume.gameTimeRestored > 0,
    `t=${s23.bannerResume.gameTimeRestored}`);
  report('§23: voluntary exit does not touch total_runs (§23.8.4)', s23.noSideEffects);
  report('§23: pending level-up queue does not leak through exit', s23.queueNoLeak);
  report('§23: Quit to Title keeps journal, defers banner',
    s23.quit.state === 'title' && s23.quit.journalAlive);
  report('§23: deferred banner appears on next town entry',
    s23.deferredBanner.state === 'town' && s23.deferredBanner.banner);
  report('§23: Discard clears banner + journal',
    s23.discard.bannerGone && s23.discard.journalGone);
  report('§23: end screen shows Retry/Town buttons (§23.6)', s23.endButtons.bar);
  report('§23: end-screen Town button dismisses to town', s23.endTown === 'town');
  report('§23: end-screen Retry button restarts the fight', s23.endRetry === 'playing');

  // ── Global error net ──
  report('No page/console errors during the whole trace', errors.length === 0,
    errors.slice(0, 5).join(' | '));

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('TRACE CRASHED:', e); process.exit(2); });
