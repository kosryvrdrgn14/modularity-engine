#!/usr/bin/env node
// ============================================================
// perf_budget.cjs — B10: performance budget gate for the combat loop
// (v2.19.14; backlog row B10, WORKFLOW §10)
//
// WHY THIS METRIC (honesty note): headless rAF cadence is throttled and
// vsync-dependent — an FPS assertion would flake across CI machines. The
// honest, deterministic-ish budget for THIS layer is CPU cost per tick:
// GameLoop's own updateFn(dt)/renderFn(alpha) called directly, wall-timed,
// with a rAF yield between samples. A budget breach here is exactly "the
// update/render work no longer fits its slice" — the thing that becomes
// dropped frames on real hardware.
//
// BUDGETS: chosen from a one-shot baseline (measured on this harness, then
// deleted per the one-shot pattern). Observed: idle update mean 0.02ms
// (p95 0.10), stress-120-enemy update mean 0.58ms (p95 1.30, max 5.90),
// render mean 0.25ms (max 3.70), ~10MB heap. Budgets sit ~5–15× above the
// observed means but below one 16.67ms frame (update p95) — wide enough for
// CI jitter and GC blips, tight enough to catch real regressions. Max is
// REPORTED (extra) not gated: a single GC pause is noise, sustained p95
// degradation is the signal.
//
// STRESS: 120 enemies spawned through SpawnSystem's own entity shape with
// real enemy defs on a real battlefield (startGame → stage_graveyard) —
// no spawn-timer waiting, fully deterministic load.
//
// NEGATIVE CONTROL (v2.19.3 rule — a gate is done when it can go red):
// updateFn is REPLACED with a pure 6ms busy-loop (the original is NOT called
// — letting the sim advance would grow the state: dead enemies drop pickups,
// weapons keep firing — and the post-restore re-measure would no longer be
// same-conditions). The measured mean MUST exceed the stress budget inside
// this suite (no revert dance), then the original is restored and, on the
// frozen state, the budget must hold again.
//
// Exit codes: 0 green, 1 failures, 2 crash. Skips loudly if the game loop
// is absent.
// ============================================================
const path = require('path');

(async () => {
  const { bootGame } = require(path.join(__dirname, '..', 'lib', 'harness.cjs'));
  const { browser, page, errors } = await bootGame();

  try {
    const result = await page.evaluate(async () => {
      const g = window.game;
      if (!g?.gameLoop?.updateFn) return 'no gameLoop';
      g.titleMenu.hide();
      g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
      g.gameManager.set('session.current_stage_tier', 'standard');
      g.startGame();
      await new Promise(r => setTimeout(r, 900));

      // Tick-cost sampler: direct updateFn/renderFn calls, rAF between frames.
      const measure = async (frames) => {
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
        const sorted = [...upd].sort((a, b) => a - b);
        return {
          updMean: upd.reduce((a, b) => a + b, 0) / upd.length,
          updP95: sorted[Math.floor(sorted.length * 0.95)],
          updMax: Math.max(...upd),
          renMean: ren.reduce((a, b) => a + b, 0) / ren.length,
        };
      };

      const BUDGET = { idleUpd: 1.0, idleRen: 2.0, stressUpd: 3.0, stressP95: 8.0, stressRen: 3.0, heapMB: 64 };

      // ── Idle combat (real battlefield, normal spawn pressure) ──
      const idle = await measure(60);

      // ── Stress: 120 enemies via SpawnSystem's own create shape + real defs ──
      const em = g.entityManager;
      const player = em.getActive('player')[0];
      const defs = g.dataManager.enemies || [];
      let created = 0;
      for (let i = 0; i < 120 && defs.length; i++) {
        const d = defs[i % defs.length];
        const angle = (i / 120) * Math.PI * 2;
        em.create('enemy', {
          x: player.x + Math.cos(angle) * (140 + (i % 5) * 60),
          y: player.y + Math.sin(angle) * (140 + (i % 5) * 60),
          hp: Math.round(d.stats?.hp || 10),
          damage: Math.round(d.stats?.damage || 3),
          speed: d.stats?.speed || 40,
          size: d.stats?.size || 10,
          enemyData: d,
        });
        created++;
      }
      // Engage weapons/collisions/pickups before sampling.
      for (let i = 0; i < 10; i++) { g.gameLoop.updateFn(1 / 60); await new Promise(r => requestAnimationFrame(r)); }
      const live = em.getActive('enemy').length;
      const stress = await measure(120);

      // ── Negative control: a 6ms/tick update MUST breach the budget ──
      // Pure busy-loop, original NOT invoked: the sim must not advance, so
      // the post-restore re-measure is same-conditions (frozen state).
      const orig = g.gameLoop.updateFn;
      g.gameLoop.updateFn = () => {
        const t0 = performance.now();
        while (performance.now() - t0 < 6) { /* busy */ }
      };
      const overloaded = await measure(20);
      g.gameLoop.updateFn = orig; // restore
      const restored = await measure(20);

      const heapMB = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null;
      return {
        idle, stress, created, live, overloaded, restored, heapMB,
        heapSupported: heapMB !== null,
      };
    });

    if (typeof result === 'string') {
      console.log(`  SKIP perf_budget: ${result}`);
      process.exit(0);
    }

    const r = { n: 0, bad: 0 };
    const check = (name, pass, extra) => {
      r.n++;
      if (pass) console.log(`  ✓ ${name}`);
      else { r.bad++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
    };
    const f = (x) => x.toFixed(2);

    check('idle update tick within budget (≤1ms; baseline 0.02ms)',
      result.idle.updMean <= 1.0, `mean ${f(result.idle.updMean)}ms`);
    check('idle render tick within budget (≤2ms; baseline 0.07ms)',
      result.idle.renMean <= 2.0, `mean ${f(result.idle.renMean)}ms`);
    check('stress engaged: 120 enemies created, majority still live',
      result.created === 120 && result.live > 60, `created=${result.created} live=${result.live}`);
    check('stress update tick within budget (≤3ms; baseline 0.58ms)',
      result.stress.updMean <= 3.0, `mean ${f(result.stress.updMean)}ms`);
    check('stress update p95 within budget (≤8ms; baseline 1.30ms)',
      result.stress.updP95 <= 8.0, `p95 ${f(result.stress.updP95)}ms (max ${f(result.stress.updMax)}ms reported, not gated — GC blips are noise)`);
    check('stress render tick within budget (≤3ms; baseline 0.25ms)',
      result.stress.renMean <= 3.0, `mean ${f(result.stress.renMean)}ms`);
    check('heap within budget (≤64MB; baseline ~10MB)', !result.heapSupported || result.heapMB <= 64,
      result.heapSupported ? `${f(result.heapMB)}MB` : 'performance.memory unavailable — n/a');
    check('negative control: injected 6ms/tick overload EXCEEDS the stress budget (detector can go red)',
      result.overloaded.updMean > 3.0, `overloaded mean ${f(result.overloaded.updMean)}ms`);
    check('original updateFn restored — budget holds again',
      result.restored.updMean <= 3.0, `restored mean ${f(result.restored.updMean)}ms`);
    check('no page/console errors during the perf run', errors.length === 0,
      errors.slice(0, 3).join(' | '));

    console.log(r.bad === 0 && r.n > 0
      ? `PERF BUDGET GREEN (${r.n}/${r.n})`
      : `PERF BUDGET RED — ${r.bad}/${r.n} failed`);
    process.exit(r.bad === 0 ? 0 : 1);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  const msg = String(e && e.message || e);
  if (/no gameLoop/.test(msg)) {
    console.log(`  SKIP perf_budget: ${msg}`);
    process.exit(0);
  }
  console.error('perf_budget crash:', msg);
  process.exit(2);
});
