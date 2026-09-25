#!/usr/bin/env node
// ONE-OFF (B10): baseline perf measurement — sets the honest budgets for the
// perf_budget suite. Measures CPU cost per update/render tick (GameLoop's own
// updateFn/renderFn called directly — vsync-independent, deterministic-ish)
// at two loads: idle and ~120 enemies. Deleted after the budgets are chosen.
const path = require('path');
const { bootGame } = require(path.join(__dirname, '..', 'tests', 'lib', 'harness.cjs'));

(async () => {
  const { browser, page } = await bootGame();
  const out = await page.evaluate(async () => {
    const g = window.game;
    g.titleMenu.hide();
    g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    g.gameManager.set('session.current_stage_tier', 'standard');
    g.startGame();
    await new Promise(r => setTimeout(r, 900));

    const measure = async (label, frames) => {
      const upd = [], ren = [];
      for (let i = 0; i < frames; i++) {
        let t0 = performance.now();
        g.gameLoop.updateFn(1 / 60);
        upd.push(performance.now() - t0);
        t0 = performance.now();
        g.gameLoop.renderFn(0);
        ren.push(performance.now() - t0);
        await new Promise(r => requestAnimationFrame(r));
      }
      const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length * p)]; };
      const stats = arr => ({ mean: arr.reduce((a, b) => a + b, 0) / arr.length, p95: pct(arr, 0.95), max: Math.max(...arr) });
      return { label, update: stats(upd), render: stats(ren) };
    };

    const idle = await measure('idle', 60);
    const memBefore = performance.memory ? performance.memory.usedJSHeapSize : null;

    // Stress: ~120 enemies via SpawnSystem's own create shape + real defs.
    const em = g.entityManager;
    const player = em.getActive('player')[0];
    const defs = g.dataManager.enemies || [];
    let n = 0;
    for (let i = 0; i < 120 && defs.length; i++) {
      const d = defs[i % defs.length];
      const angle = (i / 120) * Math.PI * 2;
      em.create('enemy', {
        x: player.x + Math.cos(angle) * (140 + (i % 5) * 60),
        y: player.y + Math.sin(angle) * (140 + (i % 5) * 60),
        hp: Math.round((d.stats?.hp || 10) * 1.0),
        damage: Math.round(d.stats?.damage || 3),
        speed: d.stats?.speed || 40,
        size: d.stats?.size || 10,
        enemyData: d,
      });
      n++;
    }
    // A few frames to let weapons/pickups/collisions engage, then measure.
    for (let i = 0; i < 10; i++) { g.gameLoop.updateFn(1 / 60); await new Promise(r => requestAnimationFrame(r)); }
    const stress = await measure('stress120', 120);
    const memAfter = performance.memory ? performance.memory.usedJSHeapSize : null;
    const enemies = em.getActive('enemy').length;
    return { idle, stress, enemies: n, liveEnemies: enemies,
      memBefore, memAfter, memSupported: !!performance.memory };
  });
  const fmt = s => `mean ${s.mean.toFixed(2)}ms p95 ${s.p95.toFixed(2)}ms max ${s.max.toFixed(2)}ms`;
  console.log(`enemies created: ${out.enemies} (live: ${out.liveEnemies})`);
  console.log(`memory API: ${out.memSupported ? `yes (${(out.memAfter / 1048576).toFixed(0)}MB after)` : 'no'}`);
  console.log(`idle   update: ${fmt(out.idle.update)} | render: ${fmt(out.idle.render)}`);
  console.log(`stress update: ${fmt(out.stress.update)} | render: ${fmt(out.stress.render)}`);
  await browser.close();
})().catch(e => { console.error('baseline crash:', e.message); process.exit(2); });
