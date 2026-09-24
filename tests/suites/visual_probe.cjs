#!/usr/bin/env node
// ============================================================
// visual_probe.cjs — B2 slice 1: screenshot + pixel-probe QA (v2.19.6)
//
// What automation could not see before this suite (TESTING_PLAN §5):
//   - whether a screen RENDERS content at all (the blank-preview class)
//   - whether the combat HUD actually draws (timer text pixels present)
//   - whether pause really freezes the drawn frame (pixel stillness)
// Structural screenshots land in tests/artifacts/<stamp>/ for the
// human-skimmable channel (§5.2); every pixel assertion is a cheap
// deterministic heuristic, NOT a golden-image diff (§5.1 discipline).
//
// Provenance: probes reuse the regression trace's techniques — timer
// white-pixel region (BUG-027 check), ESC keydown-burst pause (§23),
// variance-over-downsample (§5.3 frame check). Negative control follows
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
  const { bootGame } = require(path.join(__dirname, '..', 'lib', 'harness.cjs'));
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
