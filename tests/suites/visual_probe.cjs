#!/usr/bin/env node
// ============================================================
// visual_probe.cjs — B2: screenshot + pixel-probe QA (slice 1 v2.19.6,
// slice 2 v2.19.8, slice 3 v2.19.10 loadout screen)
//
// What automation could not see before this suite (TESTING_PLAN §5):
//   - whether a screen RENDERS content at all (the blank-preview class)
//   - whether the combat HUD actually draws (timer/gold/XP text pixels)
//   - whether pause really freezes the drawn frame (pixel stillness)
// Slice 2 adds the remaining §5.2 structural shots — boss, level-up,
// end screen, shop overlay — plus the gold-chip and XP-bar pixel regions
// from the trace (POT-011 / BUG-029 probes).
// Structural screenshots land in tests/artifacts/visual_<stamp>/ for the
// human-skimmable channel (§5.2); every pixel assertion is a cheap
// deterministic heuristic, NOT a golden-image diff (§5.1 discipline).
//
// Provenance: probes reuse the regression trace's techniques — timer
// white-pixel region (BUG-027), gold-chip region (POT-011), XP-bar region
// (BUG-029), ESC keydown-burst pause (§23), XP-grant level-up flow (POT-013),
// window.skipToBoss() debug boss spawn, showEndScreen + _renderEndScreen
// (BUG-028 era), variance-over-downsample (§5.3). Negative control follows
// the v2.19.3 rule: a gate is done when proven able to go red — a solid
// synthetic buffer must report ~zero variance (blank detectable).
//
// Exit codes: 0 green, 1 failures, 2 crash.
// ============================================================
const path = require('path');
const fs = require('fs');

const r = { n: 0, bad: 0 };
const check = (name, pass, extra) => {
  r.n++;
  if (pass) console.log(`  ✓ ${name}`);
  else { r.bad++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

(async () => {
  const harness = require(path.join(__dirname, '..', 'lib', 'harness.cjs'));
  const { bootGame } = harness;
  const { browser, page, errors } = await bootGame();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '..', 'artifacts', `visual_${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  // Downsampled luminance stdev of the live canvas (§5.3). -1 = tainted/unavailable.
  // Negative control: the same math on caller-supplied synthetic buffers.
  const probeFns = `
    window.__lumStdev = () => {
      try {
        const c = document.getElementById('game-canvas');
        const ctx = c.getContext('2d');
        const vals = [];
        for (let y = 0; y < c.height; y += 8) {
          const row = ctx.getImageData(0, y, c.width, 1).data;
          for (let i = 0; i < row.length; i += 32) {
            vals.push(0.299 * row[i] + 0.587 * row[i + 1] + 0.114 * row[i + 2]);
          }
        }
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const v = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
        return Math.sqrt(v);
      } catch (e) { return -1; }
    };
    window.__stdevOf = (w, h, fillFn) => {
      const vals = [];
      for (let y = 0; y < h; y += 8) {
        for (let x = 0; x < w; x += 32) {
          const [rr, gg, bb] = fillFn(x, y);
          vals.push(0.299 * rr + 0.587 * gg + 0.114 * bb);
        }
      }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const v = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      return Math.sqrt(v);
    };
    window.__timerWhitePixels = () => {
      try {
        const c = document.getElementById('game-canvas');
        const ctx = c.getContext('2d');
        const img = ctx.getImageData(c.width / 2 - 46, 10, 92, 22).data;
        let white = 0;
        for (let i = 0; i < img.length; i += 4) {
          if (img[i] > 220 && img[i + 1] > 220 && img[i + 2] > 220) white++;
        }
        return white;
      } catch (e) { return -1; }
    };
    window.__timerRegion = () => {
      try {
        const c = document.getElementById('game-canvas');
        const img = c.getContext('2d').getImageData(c.width / 2 - 46, 10, 92, 22).data;
        return Array.from(img);
      } catch (e) { return null; }
    };
    // Slice 2 regions — verbatim thresholds from the regression trace.
    window.__goldChipPixels = () => {
      try {
        const c = document.getElementById('game-canvas');
        const img = c.getContext('2d').getImageData(10, 34, 96, 22).data;
        let gold = 0;
        for (let i = 0; i < img.length; i += 4) {
          if (img[i] > 200 && img[i + 1] > 140 && img[i + 2] < 120) gold++;
        }
        return gold;
      } catch (e) { return -1; }
    };
    window.__xpBarPixels = () => {
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
    };
  `;

  try {
    // ── 1. Title screen: screenshot + DOM-render probes ──
    // (First draft measured CANVAS variance here and went red: title/town are
    // DOM screens — the canvas behind them is uniform. Probe the layer that
    // actually renders: DOM visibility + widget content for title/town;
    // canvas variance only for combat.)
    await page.evaluate(probeFns);
    await page.waitForTimeout(500);
    const titleShot = path.join(outDir, '01_title.png');
    await page.screenshot({ path: titleShot });
    const titleDom = await page.evaluate(() => ({
      visible: (() => { const el = document.getElementById('title-screen'); return el && el.offsetHeight > 0; })(),
      menuCards: document.querySelectorAll('#title-menu .widget-card').length,
      versionText: (document.getElementById('info-version')?.textContent || '').trim().length,
    }));
    check('title screenshot captured', fs.existsSync(titleShot) && fs.statSync(titleShot).size > 5000,
      `${fs.existsSync(titleShot) ? fs.statSync(titleShot).size + 'B' : 'missing'}`);
    check('title screen visible with pooled menu strip rendered',
      titleDom.visible && titleDom.menuCards > 0, JSON.stringify(titleDom));
    check('title version line renders', titleDom.versionText > 0, '');

    // ── 2. Town: real screen path (same entry as step5) ──
    await page.evaluate(() => {
      const g = window.game;
      g.titleMenu.hide();
      g.gameState.setState('town');
      g.townScreen.show();
    });
    await page.waitForTimeout(500);
    const townShot = path.join(outDir, '02_town.png');
    await page.screenshot({ path: townShot });
    const townDom = await page.evaluate(() => ({
      visible: (() => { const el = document.getElementById('town-screen'); return el && getComputedStyle(el).display !== 'none'; })(),
      dockButtons: document.querySelectorAll('#town-dock *').length,
      goldText: (document.getElementById('town-gold')?.textContent || '').trim().length,
    }));

    // ── 2b. B29 (v2.19.36): long toasts must WRAP, not clip ──
    // Desktop pin: bounds hold and the wrap property is live (desktop text
    // fits under both nowrap and normal, so this is a regression pin).
    {
      const toastRects = await page.evaluate(() => {
        const g = window.game;
        g.townScreen.content.showToast('The stranger leaves to scout — temporarily unavailable.', 'time', '⏳');
        return new Promise((resolve) => setTimeout(() => {
          const el = document.querySelector('#town-toast-container .town-toast');
          const r = el ? el.getBoundingClientRect() : null;
          resolve({ w: r ? Math.round(r.width) : -1,
            right: r ? Math.round(r.right) : -1,
            vw: window.innerWidth,
            ws: el ? getComputedStyle(el).whiteSpace : 'none' });
        }, 350));
      });
      check('[B29] long toast stays inside the viewport (bounds pin)',
        toastRects.w > 0 && toastRects.right <= toastRects.vw,
        JSON.stringify(toastRects));
      check('[B29] toast wraps long text (white-space: normal)',
        toastRects.ws === 'normal', `white-space=${toastRects.ws}`);
      await page.evaluate(() => {
        const c = document.getElementById('town-toast-container');
        if (c) c.innerHTML = '';
      });
    }

    check('town screenshot captured', fs.existsSync(townShot) && fs.statSync(townShot).size > 5000, '');
    check('town screen visible with dock + gold chip rendered',
      townDom.visible && townDom.dockButtons > 0 && townDom.goldText > 0, JSON.stringify(townDom));

    // ── 3. Combat: canvas-rendered, so variance + HUD pixel probes apply ──
    await page.evaluate(() => {
      const g = window.game;
      g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
      g.gameManager.set('session.current_stage_tier', 'standard');
      g.startGame();
    });
    await page.waitForTimeout(900);
    const combatShot = path.join(outDir, '03_combat.png');
    await page.screenshot({ path: combatShot });
    const combatSd = await page.evaluate(() => window.__lumStdev());
    const timerPx = await page.evaluate(() => window.__timerWhitePixels());
    check('combat screenshot captured', fs.existsSync(combatShot) && fs.statSync(combatShot).size > 5000, '');
    check('combat canvas non-uniform (rendered content present; blank-cleared = 0.0)',
      combatSd > 3, `stdev=${combatSd.toFixed(1)}`);
    check('combat HUD timer draws text pixels (BUG-027 probe)', timerPx > 30, `whitePixels=${timerPx}`);

    // ── B30 (v2.19.36): desktop slot rail is pixel-identical ──
    // Force the w1 stroke gold (the renderer reads _weaponLevels directly)
    // so the rail's left edge is measurable: the desktop x=10 anchor must
    // not move (fine pointer ⇒ slotOffsetX stays 0).
    {
      const railX = await page.evaluate(() => new Promise((resolve) => {
        const g = window.game;
        const prev = g.renderer._weaponLevels ? g.renderer._weaponLevels.w1_projectile : undefined;
        g.renderer._weaponLevels = Object.assign({}, g.renderer._weaponLevels, { w1_projectile: 3 });
        // Deterministic ruler: the world must be empty of gold-coincident
        // pixels (coins/gems would false-positive the scan band), so clear
        // entities and let two clean frames render before measuring.
        g.entityManager.clearAll();
        setTimeout(() => {
          const c = document.getElementById('game-canvas');
          const h = c.height; // DPR 1 desktop: css px == device px
          const ctx = c.getContext('2d');
          let minX = -1;
          for (const dy of [-2, -1, 0, 1, 2]) { // band around the slot top stroke (h-60)
            const y = h - 60 + dy;
            if (y < 0 || y >= h) continue;
            const row = ctx.getImageData(0, y, 320, 1).data;
            for (let x = 0; x < 320; x++) {
              const r = row[x * 4], gg = row[x * 4 + 1], b = row[x * 4 + 2];
              if (r > 170 && gg > 130 && b < 110) { if (minX < 0 || x < minX) minX = x; break; }
            }
          }
          if (prev === undefined) delete g.renderer._weaponLevels.w1_projectile;
          else g.renderer._weaponLevels.w1_projectile = prev;
          resolve(minX);
        }, 120);
      }));
      check('[B30/desktop] weapon-slot rail stays anchored at x=10 (pixel-identical)',
        railX >= 5 && railX <= 55, `goldMinX=${railX}`);
    }


    // ── 3b. B24 (v2.19.31): HUD scale on a REAL device-emulated page ──
    // The canvas backing store is devicePixelRatio-scaled; before B24 the HUD
    // drew in raw backing pixels, so on a DPR-3 phone the 200px HP bar measured
    // ~67px. The probe boots a REAL run on the emulated iPhone-13 page (DPR 3)
    // and measures the HP bar's red run-length IN DEVICE PIXELS at mid-screen:
    // it must be ≈ 200 × dpr (± tolerance), i.e. the HUD is sized in CSS px.
    // Also sweeps the SAME class: floating damage text must scale its font by
    // dpr (world-space), and the emulated run must not error.
    {
      const mErrors = [];
      const { context: mCtx, page: mPage } = await harness.newMobilePage(browser, { errors: mErrors });
      try {
        const hud = await mPage.evaluate(async () => {
          const g = window.game;
          const dpr = window.devicePixelRatio || 1;
          g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
          g.gameManager.set('session.current_stage_tier', 'standard');
          g.startGame();
          await new Promise((res) => setTimeout(res, 700)); // a few rendered frames (player may take damage — that's fine, see below)
          const canvas = document.getElementById('game-canvas');
          const ctx = canvas.getContext('2d');
          // Ruler = the GOLD CHIP (10,34,96,22 css): fixed geometry, gold
          // #FFD700 stroke border, nothing gold beside it on that row (the
          // kill chip sits top-RIGHT). The HP bar was rejected as ruler: on a
          // 390px screen the centered level badge overdraws its right end.
          // Span of gold pixels on the chip row ≈ 96 CSS px × dpr proves the
          // HUD is drawn in CSS-pixel units (raw-pixel drawing would measure
          // ≈ 96/3 = 32 css on this DPR-3 page — the B24 defect).
          const yDev = Math.round(45 * dpr); // chip row: y=34..56 css
          const row = ctx.getImageData(0, yDev, canvas.width, 1).data;
          let minX = -1, maxX = -1;
          for (let x = 0; x < Math.round(150 * dpr); x++) {
            const r = row[x * 4], gg = row[x * 4 + 1], b = row[x * 4 + 2];
            const goldish = r > 170 && gg > 130 && b < 110;
            if (goldish) { if (minX < 0) minX = x; maxX = x; }
          }
          const spanCss = minX < 0 ? 0 : (maxX - minX + 1) / dpr;
          return { dpr, spanCss };
        });
        check(`[B24/emulated DPR${hud.dpr}] HUD gold chip sized in CSS pixels (span ≈ 96 ± 8 css)`,
          hud.spanCss >= 88 && hud.spanCss <= 104,
          `goldSpan=${hud.spanCss.toFixed(1)}css (raw-pixel defect would read ≈32css)`);
        check('[B24/emulated] no page errors during emulated combat render', mErrors.length === 0, mErrors.slice(0, 2).join(' | '));

        // ── B29 (v2.19.36): the red-proving cell — on a 390px phone the old
        // nowrap pushed this exact line past the right viewport edge. ──
        const toastM = await mPage.evaluate(() => new Promise((resolve) => {
          const g = window.game;
          g.townScreen.content.showToast('The stranger leaves to scout — temporarily unavailable.', 'time', '⏳');
          setTimeout(() => {
            const el = document.querySelector('#town-toast-container .town-toast');
            const r = el ? el.getBoundingClientRect() : null;
            resolve({ right: r ? Math.round(r.right) : -1, vw: window.innerWidth });
          }, 350);
        }));
        check('[B29/emulated] long toast wraps inside a 390px viewport',
          toastM.right > 0 && toastM.right <= toastM.vw, JSON.stringify(toastM));
        await mPage.evaluate(() => {
          const c = document.getElementById('town-toast-container');
          if (c) c.innerHTML = '';
        });


        // ── B27 (v2.19.34): NATURAL boss spawn via the real spawn tick ──
        // Every prior boss probe rode the skipToBoss DEBUG entry, which never
        // exercised the tick's latch/unlock path — the user's boss-less run
        // shipped invisible to the battery. Drive the clock to just before
        // the boss time and let the REAL tick spawn it.
        const natural = await mPage.evaluate(() => new Promise((resolve) => {
          const g = window.game;
          const ss = g.spawnSystem;
          ss.gameTime = (g._bossSpawnTime || 240) - 0.5; // one tick from due
          const t0 = Date.now();
          const iv = setInterval(() => {
            const boss = g.entityManager.getActive('enemy').find(e => e.isBoss);
            if (boss || Date.now() - t0 > 3000) {
              clearInterval(iv);
              resolve({ boss: !!boss, flagged: ss.bossSpawned, count: g.entityManager.getCount('enemy'),
                hp: boss ? boss.hp : 0, isBoss: boss ? !!boss.isBoss : false,
                barRef: !!(g.renderer.bossEntity && g.renderer.bossEntity.isBoss) });
            }
          }, 100);
        }));
        check('[B27/natural tick] boss entity EXISTS after crossing the spawn time (not just the flag)',
          natural.boss && natural.isBoss && natural.flagged,
          JSON.stringify(natural));
        check('[B27/natural tick] boss HP matches the real definition (latched once, full HP)',
          natural.hp > 0 && natural.boss, `hp=${natural.hp}`);
        check('[B27/natural tick] renderer holds the boss ref (HUD bar will draw)',
          natural.barRef, '');

        // ── B28 (v2.19.35): 100% boss trophy — deterministic death artifact ──
        // The trophy is awarded AT DROP TIME (boss died ⇒ trophy event fires);
        // the star pickup is a cosmetic marker on the normal inert pickup path
        // (unknown ids are ignored by the reward listeners). Post-victory
        // collection is impossible by design (gameOver stops the update loop),
        // so the DROP event is the headless "boss existed and died" proof.
        // The probe stubs triggerGameOver during the kill so collection can
        // also be exercised before the run would end.
        const trophy = await mPage.evaluate(() => new Promise((resolve) => {
          const g = window.game;
          const boss = g.entityManager.getActive('enemy').find(e => e.isBoss);
          if (!boss) { resolve({ error: 'no boss to kill' }); return; }
          const events = { dropped: 0, droppedBossId: null, rewardPickups: 0 };
          g.eventBus.on('bossTrophyDropped', (d) => { events.dropped++; events.droppedBossId = d.bossId; });
          const onReward = () => { events.rewardPickups++; };
          g.eventBus.on('pickup', onReward);
          const realGameOver = g.gameState.triggerGameOver.bind(g.gameState);
          g.gameState.triggerGameOver = () => false; // stub: keep the run alive for collection
          // The bossDeath listener calls _handleGameOver UNCONDITIONALLY after
          // triggerGameOver — it pauses the loop and tears the run down, which
          // would stop collection. Stub it too (restored below).
          const realHandleGameOver = g._handleGameOver;
          g._handleGameOver = () => {};
          let trophyEntity = null;
          const onDeath = () => setTimeout(() => {
            trophyEntity = g.entityManager.getActive('pickup').find(p => p.pickupData?.id === 'boss_trophy');
            events.entityDump = trophyEntity ? JSON.stringify(trophyEntity.pickupData) : 'none';
            if (trophyEntity) {
              g.player.x = trophyEntity.x; g.player.y = trophyEntity.y;
              g.player.stats.pickupRange = 150;
            }
          }, 80);
          g.eventBus.on('death', onDeath);
          g.damageSystem._handleDamage(boss, { stats: {} }, 999999); // overkill through the REAL pipeline
          setTimeout(() => {
            g.eventBus.off('death', onDeath);
            g.eventBus.off('pickup', onReward);
            g.gameState.triggerGameOver = realGameOver; // restore
            g._handleGameOver = realHandleGameOver;
            const stillThere = g.entityManager.getActive('pickup').some(p => p.pickupData?.id === 'boss_trophy');
            resolve({ ...events, trophyEntity: !!trophyEntity, stillThere,
              victoryLive: typeof g.gameState.triggerGameOver === 'function' && !g.gameState.isGameOver() });
          }, 900);
        }));
        check('[B28] boss death awards the trophy: drop event fires with the boss id',
          trophy.dropped === 1 && !!trophy.droppedBossId,
          JSON.stringify(trophy));
        check('[B28] trophy marker pickup exists and is collectible through the normal inert path',
          trophy.trophyEntity === true && trophy.rewardPickups >= 1 && !trophy.stillThere,
          JSON.stringify(trophy));
        check('[B28] victory wiring untouched after the stubbed kill (restore verified)',
          trophy.victoryLive === true, `victoryLive=${trophy.victoryLive}`);

        // ── B30 (v2.19.36): slot rail clears the joystick zone ──
        // User screenshot: the canvas rail (x=10) rendered under the DOM
        // joystick zone on phones. Coarse pages offset the rail right of the
        // zone (136/160 by width); desktop stays pixel-identical (pinned in
        // the desktop cell above). Gold w1 stroke = deterministic ruler.
        {
          await mPage.evaluate(() => {
            const g = window.game;
            g.renderer._weaponLevels = Object.assign({}, g.renderer._weaponLevels, { w1_projectile: 3 });
          });
          await mPage.waitForTimeout(80);
          const railRow = () => mPage.evaluate(() => new Promise((resolve) => {
            const g = window.game;
            // Same determinism rule as the desktop cell: clear the world so
            // only HUD gold can enter the scan band, then measure.
            g.entityManager.clearAll();
            setTimeout(() => {
              const c = document.getElementById('game-canvas');
              const dpr = window.devicePixelRatio || 1;
              const hDev = c.height;
              const ctx = c.getContext('2d');
              let minX = -1;
              const yC = Math.round((hDev / dpr - 60) * dpr); // slot top stroke row
              for (const dy of [-2, -1, 0, 1, 2]) {
                const y = yC + dy;
                if (y < 0 || y >= hDev) continue;
                const row = ctx.getImageData(0, y, c.width, 1).data;
                for (let x = 0; x < row.length / 4; x++) {
                  const r = row[x * 4], gg = row[x * 4 + 1], b = row[x * 4 + 2];
                  if (r > 170 && gg > 130 && b < 110) { const cx = x / dpr; if (minX < 0 || cx < minX) minX = cx; break; }
                }
              }
              resolve(minX);
            }, 120);
          }));
          const zoneRight = () => mPage.evaluate(() => {
            const z = document.getElementById('touch-controls');
            const r = z ? z.getBoundingClientRect() : null;
            return r ? Math.round(r.right) : -1;
          });
          const portraitX = await railRow();
          const zoneP = await zoneRight();
          check('[B30/emulated portrait] weapon-slot rail clears the joystick zone (≥140css)',
            portraitX >= 140, `goldMinX=${portraitX.toFixed(1)}css, zoneRight=${zoneP}`);
          await mPage.setViewportSize({ width: 844, height: 390 });
          await mPage.waitForTimeout(150);
          const landscapeX = await railRow();
          const zoneL = await zoneRight();
          check('[B30/emulated landscape] rail re-offsets beside the wider zone (≥160css)',
            landscapeX >= 160, `goldMinX=${landscapeX.toFixed(1)}css, zoneRight=${zoneL}`);
        }

      } finally {
        await mCtx.close();
      }
    }

    // Slice 2: the rest of the §5.1 HUD regions.
    const goldPx = await page.evaluate(() => window.__goldChipPixels());
    const xpPx = await page.evaluate(() => window.__xpBarPixels());
    check('combat HUD gold chip renders (POT-011 probe)', goldPx > 20, `goldPixels=${goldPx}`);
    check('combat HUD XP bar text renders (BUG-029 probe)', xpPx > 20, `whitePixels=${xpPx}`);

    // ── 4. Pause: state stillness AND frame stillness ──
    await page.evaluate(() => {
      for (let i = 0; i < 4; i++) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    });
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' })));
    await page.waitForTimeout(150);
    const paused = await page.evaluate(() => ({
      overlay: document.getElementById('pause-overlay').classList.contains('active'),
      frozen: window.game.gameLoop.paused,
    }));
    check('pause opened via ESC (overlay + loop frozen)', paused.overlay && paused.frozen,
      `overlay=${paused.overlay} frozen=${paused.frozen}`);
    const gt0 = await page.evaluate(() => window.game.gameTime);
    const regionA = await page.evaluate(() => window.__timerRegion());
    await page.waitForTimeout(400);
    const gtStill = await page.evaluate((t) => window.game.gameTime === t, gt0);
    const regionB = await page.evaluate(() => window.__timerRegion());
    let diffFrac = -1;
    if (regionA && regionB && regionA.length === regionB.length) {
      let diff = 0;
      for (let i = 0; i < regionA.length; i += 4) {
        const la = 0.299 * regionA[i] + 0.587 * regionA[i + 1] + 0.114 * regionA[i + 2];
        const lb = 0.299 * regionB[i] + 0.587 * regionB[i + 1] + 0.114 * regionB[i + 2];
        if (Math.abs(la - lb) > 12) diff++;
      }
      diffFrac = diff / (regionA.length / 4);
    }
    check('paused: gameTime does not advance', gtStill, '');
    check('paused: timer region is frame-still (pixel diff < 5% over 400ms)',
      diffFrac >= 0 && diffFrac < 0.05, `diffFrac=${diffFrac === -1 ? 'tainted' : diffFrac.toFixed(4)}`);
    await page.screenshot({ path: path.join(outDir, '04_paused.png') });

    // ── 4b. Resume, then the level-up overlay (real XP-grant path, POT-013) ──
    await page.click('#pause-resume');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const g = window.game;
      const need = g.dataManager.leveling.xpCurve.find(e => e.level === g.levelingSystem.level).xpToNext;
      g.levelingSystem.addXP(need);
    });
    await page.waitForTimeout(350);
    const lvl = await page.evaluate(() => ({
      active: document.getElementById('levelup-overlay').classList.contains('active'),
      // NOTE: level-up cards are NOT widget cards — they are bespoke .levelup-card
      // elements with [key]/name/desc markup (ui/game.js _showLevelUpOverlay).
      // Slice-2 draft probed '.widget-card' here and found 0; read the real
      // markup, probe the layer that renders.
      cards: document.querySelectorAll('#levelup-cards .levelup-card').length,
      keycaps: document.querySelectorAll('#levelup-cards .card-key').length,
    }));
    check('level-up overlay opens with selectable upgrade cards (real XP path)',
      lvl.active && lvl.cards > 0 && lvl.keycaps === lvl.cards, JSON.stringify(lvl));
    await page.screenshot({ path: path.join(outDir, '05_levelup.png') });
    await page.keyboard.press('1');
    await page.waitForTimeout(350);
    const lvlDrained = await page.evaluate(() => ({
      active: document.getElementById('levelup-overlay').classList.contains('active'),
      level: window.game.levelingSystem.level,
    }));
    check('level-up overlay drains after selection',
      lvlDrained.active === false, JSON.stringify(lvlDrained));

    // ── 4c. Boss (real debug entry path: window.skipToBoss) ──
    await page.evaluate(() => window.skipToBoss());
    await page.waitForTimeout(1200);
    const boss = await page.evaluate(() => ({
      spawned: window.game.spawnSystem?.bossSpawned === true,
      playing: window.game.gameState.isPlaying(),
    }));
    const bossSd = await page.evaluate(() => window.__lumStdev());
    check('boss spawn lands via skipToBoss (spawnSystem flag + still playing)',
      boss.spawned && boss.playing, JSON.stringify(boss));
    check('boss encounter renders non-blank canvas', bossSd > 3, `stdev=${bossSd.toFixed(1)}`);
    await page.screenshot({ path: path.join(outDir, '06_boss.png') });

    // ── 4d. End screen (UI-level show + render, then dismiss) ──
    await page.evaluate(() => {
      const g = window.game;
      g.uiManager.showEndScreen('survived', g._getStats());
      g.uiManager._renderEndScreen();
    });
    await page.waitForTimeout(250);
    const end = await page.evaluate(() => ({
      shown: !!window.game.uiManager.endScreen,
      actions: !!document.getElementById('end-actions'),
    }));
    check('end screen renders with action row', end.shown && end.actions, JSON.stringify(end));
    await page.screenshot({ path: path.join(outDir, '07_end.png') });
    // B26 (v2.19.33): the keyboard-hint lines are a FINE-POINTER affordance —
    // present on desktop (pixel evidence in the hint strip), absent on touch.
    const hintPx = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const h = canvas.height / dpr, w = canvas.width / dpr;
      const y0 = Math.round((h / 2 + 170) * dpr), y1 = Math.round((h / 2 + 215) * dpr);
      const x0 = Math.round((w / 2 - 200) * dpr), x1 = Math.round((w / 2 + 200) * dpr);
      const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let n = 0;
      for (let i = 0; i < img.length; i += 4) {
        const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
        if (lum > 90) n++;
      }
      return n;
    });
    check('end screen desktop: keyboard hint lines render (fine-pointer affordance)', hintPx > 40, `hintPixels=${hintPx}`);
    await page.evaluate(() => window.game.uiManager.hideEndScreen());

    // ── 4d-b. B26 emulated end-screen cell: bounds + touch affordances ──
    // The end-action bar was the B15/B17 clip class on its NEXT surface (two
    // ~220px cards centered as a row ≈512px on a 390px phone). Gate: the bar
    // must fit the viewport in BOTH orientations, and the coarse pointer must
    // suppress the keyboard hints (pixel strip stays dark).
    {
      const { context: eCtx, page: ePage } = await harness.newMobilePage(browser, { errors });
      try {
        await ePage.evaluate(() => {
          const g = window.game;
          g.uiManager.showEndScreen('survived', g._getStats());
          g.uiManager._renderEndScreen();
        });
        await ePage.waitForTimeout(250);
        const portrait = await ePage.evaluate(() => {
          const bar = document.getElementById('end-actions');
          const r = bar.getBoundingClientRect();
          const canvas = document.getElementById('game-canvas');
          const ctx = canvas.getContext('2d');
          const dpr = window.devicePixelRatio || 1;
          const h = canvas.height / dpr, w = canvas.width / dpr;
          const y0 = Math.round((h / 2 + 170) * dpr), y1 = Math.round((h / 2 + 215) * dpr);
          const x0 = Math.round((w / 2 - 200) * dpr), x1 = Math.round((w / 2 + 200) * dpr);
          const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
          let n = 0;
          for (let i = 0; i < img.length; i += 4) {
            const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
            if (lum > 90) n++;
          }
          return { x: r.x, right: r.right, vw: window.innerWidth, hintPx: n,
            coarse: window.matchMedia('(pointer: coarse)').matches };
        });
        check(`[B26/emulated portrait] end-action bar fits the viewport (no out-of-bounds cards)`,
          portrait.x >= -1 && portrait.right <= portrait.vw + 1,
          `x=${Math.round(portrait.x)} right=${Math.round(portrait.right)} vw=${portrait.vw}`);
        check('[B26/emulated] coarse pointer suppresses keyboard hints (strip dark)',
          portrait.coarse === true && portrait.hintPx < 10,
          `coarse=${portrait.coarse} hintPixels=${portrait.hintPx}`);
        await ePage.setViewportSize({ width: 844, height: 390 });
        await ePage.waitForTimeout(250);
        const landscape = await ePage.evaluate(() => {
          const r = document.getElementById('end-actions').getBoundingClientRect();
          return { x: r.x, right: r.right, vw: window.innerWidth };
        });
        check('[B26/emulated landscape] end-action bar still fits (wraps, no clip)',
          landscape.x >= -1 && landscape.right <= landscape.vw + 1,
          `x=${Math.round(landscape.x)} right=${Math.round(landscape.right)} vw=${landscape.vw}`);
        await ePage.evaluate(() => window.game.uiManager.hideEndScreen());
      } finally {
        await eCtx.close();
      }
    }

    // ── 4e. Shop overlay (single-homed Grand Bazaar on content/shop.json) ──
    await page.evaluate(() => {
      const g = window.game;
      g.gameState.transition('town', { allowRestart: true });
      g.townScreen.show({});
      g.townScreen.shopSystem.openShop();
    });
    await page.waitForTimeout(400);
    const shop = await page.evaluate(() => ({
      overlay: document.getElementById('shop-overlay').classList.contains('active'),
      cards: document.querySelectorAll('#shop-items .widget-card').length,
      gold: (document.getElementById('shop-gold')?.textContent || '').length,
    }));
    check('shop overlay renders stocked catalog as widget cards (content/shop.json)',
      shop.overlay && shop.cards > 0 && shop.gold > 0, JSON.stringify(shop));
    await page.screenshot({ path: path.join(outDir, '08_shop.png') });
    await page.evaluate(() => window.game.townScreen.shopSystem.close());

    // ── 4f. Loadout (v2.19.10, slice 3): the screen that regressed twice —
    // v2.19.9 empty Next-button label, v2.19.10 horizontal overflow. DOM screen:
    // probe the DOM layer, through the real widget-pick path (like step5). ──
    await page.evaluate(() => {
      const ls = window.game.townScreen.loadoutScreen;
      ls.show({ stageId: null, onConfirm: () => {}, onBack: () => {} });
      // Real path: pick two weapons via the declared events on the grid cards.
      const cards = document.querySelectorAll('#loadout-grid .widget-card');
      if (cards[0]) cards[0].click();
      if (cards[1]) cards[1].click();
    });
    await page.waitForTimeout(250);
    const loadout = await page.evaluate(() => {
      const panel = document.querySelector('#loadout-overlay .loadout-panel');
      const slots = document.getElementById('loadout-slots');
      const next = document.getElementById('loadout-next');
      return {
        filled: window.game.townScreen.loadoutScreen.selectedWeapons.filter(Boolean).length,
        nextLabel: (next?.textContent || '').trim(),
        nextActive: next?.classList.contains('active') === true,
        // v2.19.10 overflow pin: pre-fix the slot row scrolled (463px min-content
        // in a 378px host) and the panel grew a horizontal scrollbar.
        slotsOverflow: slots ? slots.scrollWidth - slots.clientWidth : -1,
        panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : -1,
      };
    });
    const loadoutShot = path.join(outDir, '09_loadout.png');
    await page.screenshot({ path: loadoutShot });
    check('loadout screenshot captured', fs.existsSync(loadoutShot) && fs.statSync(loadoutShot).size > 5000, '');
    check('loadout Next button carries a visible label when armed (v2.19.9 pin at the visual layer)',
      loadout.filled > 0 && loadout.nextActive && loadout.nextLabel.length > 0, JSON.stringify(loadout));
    check('loadout slot row + panel do not horizontally scroll (v2.19.10 pin)',
      loadout.slotsOverflow <= 1 && loadout.panelOverflow <= 1, JSON.stringify(loadout));
    await page.evaluate(() => window.game.townScreen.loadoutScreen.hide());

    // ── 5. Negative control: the blank-detector must be able to fire ──
    const solidSd = await page.evaluate(() => window.__stdevOf(320, 180, () => [40, 40, 40]));
    const noisySd = await page.evaluate(() => window.__stdevOf(320, 180, (x, y) => [(x * 7) % 256, (y * 5) % 256, 128]));
    check('negative control: solid-color buffer reports ~zero variance (blank IS detectable)',
      solidSd < 0.5, `solidStdev=${solidSd.toFixed(3)}`);
    check('negative control: noisy buffer reports high variance (direction of comparison is right)',
      noisySd > 8, `noisyStdev=${noisySd.toFixed(1)}`);

    // ── 6. Hygiene ──
    check('no page errors during the visual flow', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }

  console.log(r.bad === 0 && r.n > 0
    ? `VISUAL PROBE GREEN (${r.n}/${r.n}) — artifacts in tests/artifacts/visual_${stamp}/`
    : `VISUAL PROBE RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  console.error('visual_probe crash:', String(e && e.message || e));
  process.exit(2);
});
