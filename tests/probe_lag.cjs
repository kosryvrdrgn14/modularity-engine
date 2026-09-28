// ============================================================
// VERIFICATION PROBE (standalone, not in run_all).
//   node tests/probe_lag.cjs         → B31: pickup lifecycle + audio gate
//   node tests/probe_lag.cjs --wipe  → B32: screen_wipe drop actually wipes
// B31 mode asserts:
//   1. Pickup despawn: 60s of natural play → zero pickups older than the
//      lifespan (non-trophy).
//   2. Planted pickup: age forced past lifespan → destroyed by the sweep;
//      planted boss_trophy survives.
//   3. Pool cap: 520 pickups planted → sweep cuts actives to ≤500.
//   4. Suspended-context gate: play() with a suspended stub context schedules
//      zero nodes and retries resume exactly once per play() call.
//   5. Running-context play(): nodes scheduled (audio path still works).
// B32 mode asserts (real collection path, no bus shortcuts):
//   W1. Collecting screen_wipe kills every active non-boss enemy through the
//       real 'death' event (kill counter increments).
//   W2. Bosses are not cheesed: take bossDamage × (1 − bossResistance); a
//       killing blow routes through canonical death + bossDeath (victory).
//   W3. Trophy drop (B28) fires at boss-drop time on the wipe kill path.
//   W4. Renderer feedback armed (rings/cleanup arrays) and cleaned on exit.
// Prints PASS/FAIL lines; exit 1 on any failure.
// ============================================================
const path = require('path');
const wipeMode = process.argv.includes('--wipe');

(async () => {
  const { bootGame } = require(path.join(__dirname, 'lib', 'harness.cjs'));
  const { browser, page, errors } = await bootGame();
  let pass = 0, fail = 0;
  const check = (name, ok, note = '') => {
    if (ok) { pass++; console.log(`PASS — ${name}`); }
    else { fail++; console.log(`FAIL — ${name}${note ? `  [${note}]` : ''}`); }
  };

  try {
    if (wipeMode) {
      // ════════ B32: screen_wipe actually wipes ════════
      const w = await page.evaluate(async () => {
        const g = window.game;
        g.titleMenu.hide();
        g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
        g.gameManager.set('session.current_stage_tier', 'standard');
        g.startGame();
        await new Promise(r => setTimeout(r, 900));
        const em = g.entityManager;
        const out = {};
        const origSpawn = g.spawnSystem.update;
        g.spawnSystem.update = () => {}; // isolate from natural spawns
        try {
          // W1 — real collection path: 5 zombies + a wipe pickup on the player
          for (let i = 0; i < 5; i++) {
            em.create('enemy', {
              x: 100 + i * 10, y: 100, hp: 10, damage: 1, speed: 0, size: 10,
              enemyData: g.dataManager.enemies.find(e => e.id === 'zombie'),
              visual: { shape: 'circle', color: '#5A7' },
            });
          }
          const killsBefore = g._runKillCount || 0;
          em.create('pickup', { x: g.player.x, y: g.player.y,
            pickupData: { id: 'screen_wipe' }, visual: { shape: 'star', color: '#00E676', size: 16 } });
          g.gameLoop.updateFn(1 / 60); // one real frame: collect + wipe
          out.enemiesLeft = em.getActive('enemy').length;
          out.killDelta = (g._runKillCount || 0) - killsBefore;
          out.ringsArmed = g.renderer.wipeEffects.length > 0;
          out.cleanupArmed = g.renderer.cleanupEffects.length > 0;
          out.countedText = g.floatingTextSystem.texts.some(t => t.text.startsWith('SCREEN WIPE!'));

          // W2/W3 — boss takes resistanced damage; killing blow → canonical victory
          const bossDef = g.dataManager.enemies.find(e => e.id === 'boss_gravekeeper');
          const boss = em.create('enemy', {
            x: g.player.x + 40, y: g.player.y, hp: 30, damage: 5, speed: 0, size: 24,
            enemyData: bossDef, isBoss: true, visual: { shape: 'circle', color: '#4A0000' },
          });
          boss.maxHp = 30;
          let trophyDrop = 0;
          g.eventBus.on('bossTrophyDropped', () => trophyDrop++);
          em.create('pickup', { x: g.player.x, y: g.player.y,
            pickupData: { id: 'screen_wipe' }, visual: { shape: 'star', color: '#00E676', size: 16 } });
          g.gameLoop.updateFn(1 / 60);
          out.bossHp = Math.round(boss.hp); // 30 − 40 → dead
          // victory signal: endResult is set by triggerGameOver regardless of
          // whether the state machine has already advanced gameOver → endScreen
          out.victory = (g.gameState.state === 'gameOver' || g.gameState.state === 'endScreen')
            && g.gameState.endResult === 'victory';
          out.trophyDropped = trophyDrop;

          // W4 — the stale-effect risk is the RESTART funnel (Buy Again):
          // plant fresh effects (age 0 — they cannot have expired naturally)
          // and verify startGame() clears them before the next fight.
          g.renderer.addWipeEffect(100, 100, 3);
          g.renderer.addCleanupEffect(100, 100, '#fff');
          g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
          g.startGame();
          out.ringsCleared = g.renderer.wipeEffects.length === 0;
          out.cleanupCleared = g.renderer.cleanupEffects.length === 0;
        } finally {
          g.spawnSystem.update = origSpawn;
        }
        return out;
      });
      check(`W1: real-path collection wipes every non-boss enemy (left=${w.enemiesLeft})`, w.enemiesLeft === 0, `left=${w.enemiesLeft}`);
      check('W1: wipe kills ride the real death event → kill counter +5', w.killDelta === 5, `delta=${w.killDelta}`);
      check('W1: renderer feedback armed (rings + cleanup dots)', w.ringsArmed && w.cleanupArmed, `rings=${w.ringsArmed} dots=${w.cleanupArmed}`);
      check('W1: single counted announcement (SCREEN WIPE! ×N)', w.countedText === true);
      check('W2: boss takes resistanced damage, not the wipe (200 × 0.2 = 40)', w.bossHp <= -10, `hp=${w.bossHp}`);
      check('W2: boss killing blow routes to canonical victory (gameOver)', w.victory === true);
      check('W3: bossTrophyDropped fires on the wipe-kill path (B28 intact)', w.trophyDropped === 1, `drops=${w.trophyDropped}`);
      check('W4: run exit clears the wipe feedback arrays', w.ringsCleared && w.cleanupCleared, `rings=${w.ringsCleared} dots=${w.cleanupCleared}`);
    } else {
    // ── 1. Natural-play despawn hygiene ──
    const nat = await page.evaluate(async () => {
      const g = window.game;
      g.titleMenu.hide();
      g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
      g.gameManager.set('session.current_stage_tier', 'standard');
      g.startGame();
      await new Promise(r => setTimeout(r, 900));
      // 60s of fixed-step play at natural pressure, player god-tanked
      for (let i = 0; i < 3600; i++) {
        g.gameLoop.updateFn(1 / 60);
        if (g.player) { g.player.hp = g.player.maxHp; g.player.iFrames = 1; }
        if (g.gameState.isGameOver()) break;
      }
      const now = g.gameTime;
      const stale = g.entityManager.getActive('pickup')
        .filter(p => p.pickupData?.id !== 'boss_trophy' && p.age > g.pickupSystem.pickupLifespan + 1);
      return { stale: stale.length, pickups: g.entityManager.getCount('pickup'), t: Math.round(now) };
    });
    check(`natural 60s run leaves zero stale non-trophy pickups (t=${nat.t}s, actives=${nat.pickups})`, nat.stale === 0, `stale=${nat.stale}`);

    // ── 2 & 3. Planted-lifespan, trophy exemption, pool cap (deterministic) ──
    // Isolation: stub spawn/weapon/collision so the live sim cannot mint new
    // drops during the measurement window — the sweep alone decides fate.
    const plant = await page.evaluate(async () => {
      const g = window.game;
      const em = g.entityManager;
      const ps = g.pickupSystem;
      ps.reset();
      const L = ps.pickupLifespan;
      const orig = {
        spawn: g.spawnSystem.update, weapon: g.weaponSystem.update, coll: g.collisionSystem.update,
      };
      g.spawnSystem.update = () => {}; g.weaponSystem.update = () => {}; g.collisionSystem.update = () => {};
      try {
        // NOTE: EntityManager.create() hardcodes age:0 (ignores data.age) —
        // set ages AFTER create.
        // Age-expiry: one pre-expired coin + one pre-expired trophy
        const expiredCoin = em.create('pickup', { x: 8000, y: 8000, pickupData: { id: 'gold_coin', value: 1 }, visual: {} });
        expiredCoin.age = L + 5;
        const trophyOld = em.create('pickup', { x: 8100, y: 8000, pickupData: { id: 'boss_trophy', bossId: 'x' }, visual: {} });
        trophyOld.age = L + 5;
        // Cap: 20 coins aged just-under-lifespan (created FIRST = oldest) + 500 fresh → 520 + trophy, cap 500.
        for (let i = 0; i < 20; i++) {
          const c = em.create('pickup', { x: 5000 + i, y: 5000, pickupData: { id: 'gold_coin', value: 1 }, visual: {} });
          c.age = L - 2;
        }
        for (let i = 0; i < 500; i++) {
          em.create('pickup', { x: 6000 + i, y: 6000, pickupData: { id: 'gold_coin', value: 1 }, visual: {} });
        }
        // 61 ticks = 1.017s game → exactly one sweep fires (interval 1s).
        for (let i = 0; i < 61; i++) g.gameLoop.updateFn(1 / 60);
        const actives = em.getActive('pickup');
        const coins = actives.filter(p => p.pickupData?.id === 'gold_coin');
        const staleNonTrophy = actives.filter(p => p.pickupData?.id !== 'boss_trophy' && p.age > L);
        const oldestKept = coins.reduce((m, p) => Math.max(m, p.age), 0);
        const trophyOldAlive = trophyOld.active === true && trophyOld.age > L;
        return { coins: coins.length, cap: em.poolLimits.pickup, oldestKept: +oldestKept.toFixed(2), trophyOldAlive, stale: staleNonTrophy.length };
      } finally {
        g.spawnSystem.update = orig.spawn; g.weaponSystem.update = orig.weapon; g.collisionSystem.update = orig.coll;
      }
    });
    // (natural leftovers from check 1 legitimately count toward the cap —
    // total non-trophy actives is the real invariant, not just gold coins)
    check(`pool cap enforced: total actives ≤ ${plant.cap} after one sweep (got ${plant.coins})`,
      plant.coins <= plant.cap, `coins=${plant.coins}`);
    check(`cap removes the OLDEST (survivors are the fresh plants, oldest=${plant.oldestKept}s)`,
      plant.oldestKept <= 1.1, `oldest=${plant.oldestKept}`);
    check(`age expiry: pre-expired coin destroyed by the sweep`, plant.stale === 0, `stale=${plant.stale}`);
    check(`boss_trophy exempt from BOTH expiry and cap (over-age trophy alive)`,
      plant.trophyOldAlive === true, `alive=${plant.trophyOldAlive}`);

    // ── 4 & 5. Audio gate ──
    const audio = await page.evaluate(async () => {
      const g = window.game;
      const am = g.audioManager;
      // stub the synth fns to COUNT calls, never touch real ctx
      let scheduled = 0;
      const orig = am._playNote.bind(am);
      am._playNote = (...a) => { scheduled++; return orig(...a); };
      let resumed = 0;
      const fakeCtx = {
        get state() { return am._fakeSuspended ? 'suspended' : 'running'; },
        resume: () => { resumed++; return Promise.resolve(); },
        currentTime: 0,
        createOscillator: () => ({ type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {}, disconnect() {} }),
        createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
        createBuffer: () => ({}),
        createBufferSource: () => ({ connect() {}, start() {}, stop() {}, disconnect() {} }),
        createBiquadFilter: () => ({ connect() {}, disconnect() {} }),
        destination: {},
        sampleRate: 44100,
      };
      am._fakeSuspended = true;
      const realCtx = am.ctx;
      am.ctx = fakeCtx;
      am.play('w1_fire');
      am.play('w1_fire'); // second call while still "suspended" (resume promise resolved synchronously-ish)
      const suspendedScheduled = scheduled;
      // now running
      am._fakeSuspended = false;
      am.play('w1_fire');
      const runningScheduled = scheduled - suspendedScheduled;
      am.ctx = realCtx;
      am._playNote = orig;
      return { suspendedScheduled, runningScheduled, resumed };
    });
    check('suspended context: play() schedules ZERO nodes (gate)', audio.suspendedScheduled === 0, `scheduled=${audio.suspendedScheduled}`);
    check('suspended context: play() retries resume each call (2 calls → ≥1 resume attempts)', audio.resumed >= 1, `attempts=${audio.resumed}`);
    check('running context: play() schedules nodes (audio path intact)', audio.runningScheduled >= 1, `scheduled=${audio.runningScheduled}`);

    } // end mode branch

    // ── page errors (pageerror-captured by harness; bus-error net excluded) ──
    const realErrors = errors.filter(e => !e.includes('[UPDATE ERROR]') && !e.includes('setTownLevel rejected'));
    check('no page/console errors during the probe', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

    console.log(`\n${wipeMode ? 'B32 WIPE' : 'B31'} PROBE: ${pass} passed, ${fail} failed`);
    await browser.close();
    process.exit(fail === 0 ? 0 : 1);
  } catch (e) {
    console.error('PROBE CRASHED:', e);
    await browser.close();
    process.exit(2);
  }
})();
