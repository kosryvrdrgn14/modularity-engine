const path = require('path');
(async () => {
  const { bootGame } = require(path.join(__dirname, 'lib', 'harness.cjs'));
  const { browser, page } = await bootGame();
  try {
    const out = await page.evaluate(async () => {
      const g = window.game;
      g.titleMenu.hide();
      g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
      g.gameManager.set('session.current_stage_tier', 'standard');
      g.startGame();
      await new Promise(r => setTimeout(r, 900));
      const gmo = g.gameLoop.updateFn; // noop the sim during planting
      g.gameLoop.updateFn = () => {};
      const em = g.entityManager, ps = g.pickupSystem;
      ps.reset();
      const L = ps.pickupLifespan;
      const trophy = em.create('pickup', { x: 8100, y: 8000, pickupData: { id: 'boss_trophy', bossId: 'x' }, visual: {}, age: L + 5 });
      for (let i = 0; i < 20; i++) em.create('pickup', { x: 5000 + i, y: 5000, pickupData: { id: 'gold_coin', value: 1 }, visual: {}, age: L - 2 });
      for (let i = 0; i < 500; i++) em.create('pickup', { x: 6000 + i, y: 6000, pickupData: { id: 'gold_coin', value: 1 }, visual: {}, age: 0 });
      const before = {
        trophyActive: trophy.active, trophyAge: trophy.age, trophyDataId: trophy.pickupData?.id,
        totalPickups: em.getCount('pickup'),
      };
      ps._sweepExpired(); // ONE direct sweep, no ticks
      const after = {
        trophyActive: trophy.active, trophyAge: trophy.age,
        coins: em.getCount('pickup') - (trophy.active ? 1 : 0),
      };
      // now restore the loop and tick 61 frames — does the TICK path kill it?
      g.gameLoop.updateFn = gmo;
      for (let i = 0; i < 61; i++) g.gameLoop.updateFn(1 / 60);
      const afterTicks = {
        trophyActive: trophy.active, trophyAge: +trophy.age.toFixed(2),
        coins: em.getCount('pickup') - (trophy.active ? 1 : 0),
        state: g.gameState.state,
      };
      return { before, after, afterTicks };
    });
    console.log(JSON.stringify(out, null, 2));
    await browser.close();
    process.exit(0);
  } catch (e) { console.error('DEBUG CRASHED:', e); process.exit(2); }
})();
