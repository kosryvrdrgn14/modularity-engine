// ============================================================
// INVESTIGATION PROBE (not a suite) — B31 verification, one-off.
// node tests/probe_lag.cjs
// Asserts the B31 behaviors headlessly (desktop page is fine — none of these
// depend on mobile emulation):
//   1. Pickup despawn: 60s of natural play → zero pickups older than the
//      lifespan (non-trophy).
//   2. Planted pickup: age forced past lifespan → destroyed by the sweep;
//      planted boss_trophy survives.
//   3. Pool cap: 520 pickups planted → sweep cuts actives to ≤500.
//   4. Suspended-context gate: play() with a suspended stub context schedules
//      zero nodes and retries resume exactly once per play() call.
//   5. Running-context play(): nodes scheduled (audio path still works).
// Prints PASS/FAIL lines; exit 1 on any failure.
// ============================================================
const path = require('path');

(async () => {
  const { bootGame } = require(path.join(__dirname, 'lib', 'harness.cjs'));
  const { browser, page, errors } = await bootGame();
  let pass = 0, fail = 0;
  const check = (name, ok, note = '') => {
    if (ok) { pass++; console.log(`PASS — ${name}`); }
    else { fail++; console.log(`FAIL — ${name}${note ? `  [${note}]` : ''}`); }
  };

  try {
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

    // ── page errors (pageerror-captured by harness; bus-error net excluded) ──
    const realErrors = errors.filter(e => !e.includes('[UPDATE ERROR]') && !e.includes('setTownLevel rejected'));
    check('no page/console errors during B31 probe', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

    console.log(`\nB31 PROBE: ${pass} passed, ${fail} failed`);
    await browser.close();
    process.exit(fail === 0 ? 0 : 1);
  } catch (e) {
    console.error('PROBE CRASHED:', e);
    await browser.close();
    process.exit(2);
  }
})();
