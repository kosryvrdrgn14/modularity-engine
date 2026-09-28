// ============================================================
// INVESTIGATION PROBE v2 — two modes:
//   node tests/probe_lag.cjs --no-audio   → pure gameplay cost
//       (AudioManager.play stubbed; measures update/render per bucket
//        + isolation deltas pickups-vs-enemies at ~260s)
//   node tests/probe_lag.cjs --unlocked   → audio context RUNNING
//       (autoplay policy disabled at launch; verifies AudioHandlers
//        stay bounded when the context is actually running)
//   default (no flag)                      → suspended-context demo
// Mobile DPR-3 context, gameLoop paused, manual fixed-dt driving.
// ============================================================
const { chromium } = require('playwright');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const MOBILE = {
  viewport: { width: 390, height: 664 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

function pct(arr, p) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}

(async () => {
  const noAudio = process.argv.includes('--no-audio');
  const unlocked = process.argv.includes('--unlocked');
  const mode = noAudio ? 'NO-AUDIO (pure gameplay cost)' : unlocked ? 'AUDIO-UNLOCKED (running context)' : 'DEFAULT (suspended context)';
  console.log(`MODE: ${mode}\n`);

  const launchArgs = unlocked ? ['--autoplay-policy=no-user-gesture-required'] : [];
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const context = await browser.newContext(MOBILE);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Fetch API') && !m.text().includes('[UPDATE ERROR]')) errors.push(m.text());
  });
  await page.goto('file://' + path.join(PUBLIC_DIR, 'game2.html'));
  await page.waitForFunction(() => window.game && window.game.gameManager, null, { timeout: 15000 });

  await page.evaluate(() => {
    const g = window.game;
    g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    g.gameManager.set('session.current_stage_tier', 'standard');
    g.startGame();
  });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const g = window.game;
    g.gameLoop.paused = true;
    window.__PERF = { upd: [], ren: [], counts: [], ctxState: () => g.audioManager.ctx ? g.audioManager.ctx.state : 'none' };
    const origUpdate = g.update.bind(g);
    const origRender = g.render.bind(g);
    g.update = function (dt) {
      const t0 = performance.now();
      origUpdate(dt);
      window.__PERF.upd.push({ t: this.gameTime, ms: performance.now() - t0 });
    };
    g.render = function (interp) {
      const t0 = performance.now();
      origRender(interp);
      window.__PERF.ren.push({ t: this.gameTime, ms: performance.now() - t0 });
    };
  });

  if (noAudio) {
    await page.evaluate(() => { window.game.audioManager.play = () => {}; });
    console.log('audioManager.play stubbed\n');
  }

  async function driveTo(target) {
    await page.evaluate((tgt) => {
      const g = window.game;
      const P = window.__PERF;
      let guard = 0;
      while (g.gameTime < tgt && guard < 40000) {
        guard++;
        for (let i = 0; i < 20; i++) g.update(1 / 60);
        if (g.player) { g.player.hp = g.player.maxHp; g.player.iFrames = 1; }
        const boss = g.renderer && g.renderer.bossEntity;
        if (boss && boss.active) boss.hp = boss.maxHp;
        if (g.gameState.isGameOver()) break;
      }
      if (window.gc) window.gc();
      P.counts.push({
        t: Math.round(g.gameTime),
        enemies: g.entityManager.getCount('enemy'),
        pickups: g.entityManager.getCount('pickup'),
        projectiles: g.entityManager.getCount('projectile'),
        total: g.entityManager.entities.length,
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1,
        ctx: window.__PERF.ctxState(),
      });
    }, target);
  }

  const targets = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 250, 260];
  for (const t of targets) {
    const s0 = Date.now();
    try { await driveTo(t); } catch (e) { console.log(`CRASHED driving to t=${t}: ${String(e).slice(0, 80)}`); break; }
    const wall = ((Date.now() - s0) / 1000).toFixed(1);
    const c = await page.evaluate(() => window.__PERF.counts[window.__PERF.counts.length - 1]);
    const m = (await cdp.send('Performance.getMetrics')).metrics;
    const g = (n) => (m.find((x) => x.name === n) || {}).value;
    console.log(`t=${String(c.t).padStart(3)}s heap=${String(c.heapMB).padStart(4)}MB enemies=${String(c.enemies).padStart(3)} pickups=${String(c.pickups).padStart(3)} arr=${c.total} ctx=${c.ctx} audio=${g('AudioHandlers')} (wall ${wall}s)`);
  }

  // per-bucket timing
  const buckets = await page.evaluate(() => {
    const P = window.__PERF;
    const B = [];
    const edges = [0, 60, 120, 160, 200, 240, 270];
    const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);
    const p95 = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]; };
    for (let i = 0; i < edges.length - 1; i++) {
      const lo = edges[i], hi = edges[i + 1];
      const u = P.upd.filter((f) => f.t >= lo && f.t < hi).map((f) => f.ms);
      const r = P.ren.filter((f) => f.t >= lo && f.t < hi).map((f) => f.ms);
      if (!u.length && !r.length) continue;
      B.push({ bucket: `${lo}-${hi}s`, updN: u.length, updMed: med(u).toFixed(2), updP95: p95(u).toFixed(2), renN: r.length, renMed: med(r).toFixed(2), renP95: p95(r).toFixed(2) });
    }
    return B;
  });
  console.log('\n=== per-bucket JS time (ms) — update tick | render frame ===');
  for (const b of buckets) {
    console.log(`${b.bucket.padStart(8)} upd med=${b.updMed.padStart(5)} p95=${b.updP95.padStart(6)} | ren med=${b.renMed.padStart(5)} p95=${b.renP95.padStart(6)}`);
  }

  if (!noAudio) {
    console.log('\n(isolation skipped in audio modes — run --no-audio for the gameplay-cost isolation)');
    if (errors.length) { console.log('\nERRORS:'); for (const e of errors.slice(0, 8)) console.log(' - ' + e); }
    await browser.close();
    process.exit(0);
  }

  // ---- Isolation at ~260s ----
  const iso = await page.evaluate(() => {
    const g = window.game;
    const N = 900;
    const measure = () => {
      const s = [];
      for (let i = 0; i < N; i++) {
        const t0 = performance.now();
        g.update(1 / 60);
        s.push(performance.now() - t0);
        if (g.player) { g.player.hp = g.player.maxHp; g.player.iFrames = 1; }
        const boss = g.renderer && g.renderer.bossEntity;
        if (boss && boss.active) boss.hp = boss.maxHp;
      }
      s.sort((a, b) => a - b);
      return { med: s[Math.floor(N / 2)], p95: s[Math.ceil(0.95 * N) - 1] };
    };
    const base = measure();
    let pickups = 0;
    for (const e of g.entityManager.entities) if (e.type === 'pickup' && e.active) { e.active = false; pickups++; }
    const noPickups = measure();
    const origSpawn = g.spawnSystem.update;
    g.spawnSystem.update = () => {};
    let enemies = 0;
    for (const e of g.entityManager.entities) if (e.type === 'enemy' && e.active) { e.active = false; enemies++; }
    const noEnemies = measure();
    g.spawnSystem.update = origSpawn;
    return {
      counts: { pickups, enemies },
      base: { med: +base.med.toFixed(2), p95: +base.p95.toFixed(2) },
      noPickups: { med: +noPickups.med.toFixed(2), p95: +noPickups.p95.toFixed(2) },
      noEnemies: { med: +noEnemies.med.toFixed(2), p95: +noEnemies.p95.toFixed(2) },
    };
  });
  console.log('\n=== isolation @ ~260s (900-tick median/p95 ms, audio stubbed) ===');
  console.log(`baseline           med=${iso.base.med} p95=${iso.base.p95}`);
  console.log(`pickups destroyed  med=${iso.noPickups.med} p95=${iso.noPickups.p95}  (removed ${iso.counts.pickups})`);
  console.log(`enemies destroyed  med=${iso.noEnemies.med} p95=${iso.noEnemies.p95}  (removed ${iso.counts.enemies})`);

  if (errors.length) { console.log('\nERRORS:'); for (const e of errors.slice(0, 8)) console.log(' - ' + e); }
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('PROBE CRASHED:', e); process.exit(2); });
