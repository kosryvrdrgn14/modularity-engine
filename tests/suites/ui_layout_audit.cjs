#!/usr/bin/env node
// ============================================================
// ui_layout_audit.cjs — §12 UI polish standards, mechanized
// (v2.19.18; goal: UI lands correct ~80-90% by process)
//
// PROBE MODEL (corrected after the report-first pass): geometry probes
// (gaps/deadBands/alignment/whitespace) run over STRUCTURAL sections — the
// panel's block children, which is what layout alignment actually means.
// Contrast runs over TEXT LEAVES, with symbol-only text (emoji pictograms
// like 🏹📜) EXEMPT — they are non-text UI under §12.5, and auditing them
// as text produced meaningless 1.07 ratios.
//
// WHAT IT CHECKS (DOM geometry, no screenshots):
//   gaps        — vertical gaps between sibling blocks must sit on the
//                 §12.1 scale (4/8/12/16/20/24 ±1px); flags arbitrary one-offs.
//   deadBands   — contiguous empty space between structural blocks (§12.3):
//                 >96px panels, >48px HUD. Intentional breathing room is
//                 documented §12.3; anything else is a defect.
//   alignment   — structural blocks sharing a panel share left/right edges
//                 within 2px (§12.2).
//   whitespace  — content bbox ÷ panel area, REPORTED vs §12.3 targets.
//   contrast    — §12.5 size-aware WCAG ratio (4.5 body / 3.0 large) against
//                 the EFFECTIVE background (alpha-stack composite).
//   overflow    — v2.19.20: horizontal overflow (scrollWidth > clientWidth) on
//                 document AND panel; scrollWidth reports overflowing content
//                 even under overflow:hidden clipping. Desktop-gated.
//   wraps       — v2.19.20 REPORT-ONLY: text leaves that DECLARE truncation
//                 (text-overflow:ellipsis + overflow:hidden) but actually wrap
//                 — the mobile "Tap to remove" defect class. Report-only
//                 because one known live instance (gamelog secondary detail
//                 line) wrapping is a design decision, not a defect.
//
// ROLLOUT: report-first across structural screens × §11 viewports (this
// version gates nothing on real screens except the negative controls);
// promotion per probe per screen once reports are clean (§11 policy).
//
// NEGATIVE CONTROLS (v2.19.3 rule): a synthetic panel with an off-scale gap
// (18px), a dead band (130px), a misaligned block, and low-contrast text
// MUST flag on all four detectors — in-suite, no revert dance.
//
// Exit codes: 0 green, 1 failures, 2 crash.
// ============================================================
const path = require('path');
const fs = require('fs');

(async () => {
  const { bootGame, newMobilePage, MOBILE_PROFILES } = require(path.join(__dirname, '..', 'lib', 'harness.cjs'));
  const { browser, page, errors } = await bootGame();
  const { page: mobilePage } = await newMobilePage(browser, { errors });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '..', 'artifacts', `ui_layout_${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const r = { n: 0, bad: 0 };
  const check = (name, pass, extra) => {
    r.n++;
    if (pass) console.log(`  ✓ ${name}`);
    else { r.bad++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
  };

  const probeFns = `
    window.__layoutProbe = (() => {
      const SPACE = [4, 8, 12, 16, 20, 24];
      const onScale = (v) => SPACE.some((s) => Math.abs(v - s) <= 1);
      const lum = (r, g, b) => {
        const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const parseColor = (str) => {
        if (!str || str === 'none' || str === 'transparent') return null;
        const m = str.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/);
        if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        if (str.startsWith('#')) {
          const v = str.slice(1);
          const hex = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
          return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
        }
        return null;
      };
      const effectiveBg = (el) => {
        let acc = null;
        let node = el;
        while (node && node !== document.documentElement) {
          const c = parseColor(getComputedStyle(node).backgroundColor);
          if (c) {
            if (acc === null) { if (c.a >= 0.999) return c; acc = c; }
            else if (c.a > 0) {
              const a = c.a;
              acc = { r: c.r * a + acc.r * (1 - a), g: c.g * a + acc.g * (1 - a), b: c.b * a + acc.b * (1 - a), a: 1 };
              if (a >= 0.999) return acc;
            }
          }
          node = node.parentElement;
        }
        return acc || { r: 10, g: 10, b: 26, a: 1 };
      };
      const hasText = (el) => (el.textContent || '').trim().length > 0;
      // §12.5: symbol-only text (emoji pictograms) is non-text UI — exempt.
      const isRealText = (el) => /[\\p{L}\\p{N}]/u.test((el.textContent || ''));
      const isTextLeaf = (el) => el.children.length === 0 && hasText(el) && isRealText(el);
      const textLeaves = (panel) => {
        const out = [];
        for (const el of panel.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (isTextLeaf(el)) out.push(el);
        }
        return out;
      };
      // STRUCTURAL sections: the panel's block children (what alignment means).
      // Blocks with a transform (selected-card scale etc.) are TRANSIENT states
      // and excluded from geometry — a scale(1.02) is not a layout defect.
      const structural = (panel) => [...panel.children].filter((c) => {
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        if (cs.position === 'fixed' || cs.position === 'absolute') return false;
        if (cs.transform !== 'none') return false;
        return c.getBoundingClientRect().height > 0;
      });
      // CONTENT rect of a block: the block ITSELF may be the text leaf (bare
      // text node — the negctl/classic case), else the union of its descendant
      // text leaves. Dead bands measure actual empty visual space, not padded
      // boxes; contentless fillers are skipped (they ARE the dead band).
      const contentRect = (el) => {
        if (isTextLeaf(el)) {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        }
        const leaves = textLeaves(el);
        if (!leaves.length) return null;
        const rs = leaves.map((d) => d.getBoundingClientRect());
        return { top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)) };
      };
      // §12.5 inactive-component exemption (WCAG 1.4.3): text inside a
      // pointer-events:none subtree (locked cards etc.) is not contrast-audited
      // — the CSS marks inactivity mechanically, so the probe honors it.
      // §12.3: a block whose own background IMAGE paints the area (the town
      // map scene etc.) is not empty — visual space filled by art is not a
      // dead band. Only DOM text drives contentRect, so honor bg art here.
      const paintsOwnArea = (el) => {
        if (getComputedStyle(el).backgroundImage !== 'none') return true;
        // A full-bleed media child (the town map <img> etc.) paints the
        // block's area too — visual space covered by art is not a dead band.
        const r0 = el.getBoundingClientRect();
        return [...el.children].some((c) => {
          const tag = c.tagName;
          if (tag !== 'IMG' && tag !== 'SVG' && tag !== 'CANVAS') return false;
          const r1 = c.getBoundingClientRect();
          return r1.height > 0 && r1.top <= r0.top + 4 && r1.bottom >= r0.bottom - 4;
        });
      };
      const inactiveSubtree = (el) => {
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
          if (getComputedStyle(n).pointerEvents === 'none') return true;
        }
        return false;
      };
      const barFor = (cs) => {
        const px = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight) >= 700;
        return (px >= 24 || (bold && px >= 18.66)) ? 3.0 : 4.5;
      };
      const ratio = (fg, bg) => {
        const l1 = lum(fg.r, fg.g, fg.b), l2 = lum(bg.r, bg.g, bg.b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      const gapRows = (panel) => {
        const rows = [];
        const collect = (parent) => {
          const kids = structural(parent);
          for (let i = 1; i < kids.length; i++) {
            const a = kids[i - 1].getBoundingClientRect();
            const b = kids[i].getBoundingClientRect();
            rows.push({ prev: kids[i - 1], next: kids[i], gap: b.top - a.bottom });
          }
        };
        collect(panel);
        for (const child of panel.children) if (child.children.length > 1) collect(child);
        return rows;
      };
      return {
        analyze(panel, opts) {
          const out = { gaps: [], deadBands: [], alignment: { leftSpread: 0, rightSpread: 0 }, contrast: [], whitespace: null };
          const pr = panel.getBoundingClientRect();
          const secs = structural(panel).map((el) => el.getBoundingClientRect());
          // whitespace ratio (§12.3, report-only) — structural union vs panel
          if (secs.length) {
            const top = Math.min(...secs.map((x) => x.top)), bot = Math.max(...secs.map((x) => x.bottom));
            const left = Math.min(...secs.map((x) => x.left)), right = Math.max(...secs.map((x) => x.right));
            out.whitespace = { ratio: Math.round(((right - left) * (bot - top)) / ((pr.width || 1) * (pr.height || 1)) * 100) / 100 };
          }
          // gaps (§12.1)
          for (const row of gapRows(panel)) {
            if (row.gap > 2 && !onScale(row.gap)) {
              out.gaps.push({ gap: Math.round(row.gap), between: (row.prev.className || row.prev.tagName) + ' → ' + (row.next.className || row.next.tagName) });
            }
          }
          // dead bands (§12.3) — COVERAGE-INTERVAL model: a vertical run is a
          // dead band iff NOTHING paints it. Coverage = text leaves + elements
          // with a non-transparent effective background + media children
          // (img/canvas/svg). A transparent contentless filler covers nothing
          // (it IS the dead band — the negctl case); the town map <img> covers
          // its full region (no false band). Exclusion-based models failed
          // here: excluding a painted middle block merges its neighbors' gap
          // across it, inventing a 667px band.
          const pr2 = panel.getBoundingClientRect();
          const covered = [];
          for (const el of panel.querySelectorAll('*')) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const rc = el.getBoundingClientRect();
            if (rc.height <= 0 || rc.width <= 0) continue;
            if (rc.bottom < pr2.top || rc.top > pr2.bottom) continue;
            let paints = false;
            if (el.children.length === 0 && hasText(el)) paints = true;
            else {
              const bg = parseColor(cs.backgroundColor);
              if ((bg && bg.a > 0.05) || cs.backgroundImage !== 'none') paints = true;
              else if (el.tagName === 'IMG' || el.tagName === 'CANVAS' || el.tagName === 'SVG') paints = true;
            }
            if (paints) covered.push({ top: rc.top, bottom: rc.bottom });
          }
          covered.sort((a, b) => a.top - b.top);
          const merged = [];
          for (const iv of covered) {
            if (merged.length && iv.top <= merged[merged.length - 1].bottom + 1) {
              merged[merged.length - 1].bottom = Math.max(merged[merged.length - 1].bottom, iv.bottom);
            } else merged.push({ ...iv });
          }
          const deadMax = opts.hud ? 48 : 96;
          const pTop = Math.max(pr2.top, merged.length ? merged[0].bottom : pr2.top);
          for (let i = 1; i < merged.length; i++) {
            const band = merged[i].top - merged[i - 1].bottom;
            if (band > deadMax) out.deadBands.push({ band: Math.round(band), at: Math.round(merged[i - 1].bottom) });
          }
          // alignment (§12.2) — structural blocks share edges within 2px
          if (secs.length >= 2) {
            const spread = (arr) => Math.max(...arr) - Math.min(...arr);
            out.alignment = {
              leftSpread: spread(secs.map((x) => Math.round(x.left))),
              rightSpread: spread(secs.map((x) => Math.round(x.right))),
            };
          }
          // contrast (§12.5) — text leaves, symbol-only + inactive exempt
          for (const el of textLeaves(panel)) {
            if (inactiveSubtree(el)) continue;
            const cs = getComputedStyle(el);
            const fg = parseColor(cs.color);
            if (!fg) continue;
            const bg = effectiveBg(el);
            const rr = ratio(fg, bg);
            const min = barFor(cs);
            if (rr < min) {
              out.contrast.push({ text: (el.textContent || '').trim().slice(0, 24), ratio: Math.round(rr * 100) / 100, min });
            }
          }
          // v2.19.20: overflow probes — scrollWidth > clientWidth on document
          // and panel. scrollWidth reports overflowing content even under
          // overflow:hidden clipping, so the global page clip hides nothing.
          // Defect model (learned from the town false positive): overflow is a
          // defect when the USER can experience it — overflow-x auto/scroll
          // renders a real scrollbar (the screenshot-1 class), visible leaks
          // layout. overflow-x hidden is a BY-DESIGN clip (the town location
          // carousel parks cards off-panel under overflow:hidden) — not this
          // probe's defect; unreachable content is the occlusion suite's job.
          const de = document.documentElement;
          const panelOvX = getComputedStyle(panel).overflowX;
          const panelExperienced = panelOvX === 'auto' || panelOvX === 'scroll' || panelOvX === 'visible';
          out.overflow = {
            docX: de.scrollWidth > de.clientWidth + 1,
            panelX: panelExperienced && panel.scrollWidth > panel.clientWidth + 1,
            doc: de.scrollWidth + '/' + de.clientWidth,
            panel: panel.scrollWidth + '/' + panel.clientWidth + ' ovX:' + panelOvX,
          };
          // v2.19.20: half-spec ellipsis probe (REPORT-ONLY). A text leaf that
          // DECLARES truncation (text-overflow:ellipsis + overflow hidden) but
          // actually renders >1 line is the screenshot-1 defect class — the
          // spec (§12.8) requires the full three-property ellipsis or none.
          // Line count = DISTINCT rect tops: Chrome splits one line into
          // multiple range rects at the truncation boundary (95px + 73px on the
          // SAME line — counting rects flagged an ellipsized-on-one-line label).
          out.wraps = [];
          for (const el of textLeaves(panel)) {
            const cs = getComputedStyle(el);
            if (cs.textOverflow !== 'ellipsis' || cs.overflowX !== 'hidden') continue;
            const range = document.createRange();
            range.selectNodeContents(el);
            const tops = [...range.getClientRects()].map((r) => Math.round(r.top));
            const lines = [...new Set(tops)].length;
            if (lines > 1) out.wraps.push({ text: (el.textContent || '').trim().slice(0, 24), lines });
          }
          // v2.19.21 REPORT-ONLY: §11 coarse-pointer minimum (≥44px) for
          // interactive elements. Feeds the per-screen promotion/fix decision;
          // NOT gated — plenty of dense-desktop UI legitimately measures
          // smaller (chips, back arrows) and whether that is a defect per
          // screen is a design decision, not a mechanical one.
          out.touchTargets = [];
          for (const el of panel.querySelectorAll('button, [role="button"], [tabindex]')) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.width < 44 || r.height < 44) {
              out.touchTargets.push({ el: ((el.className || el.tagName) + '').slice(0, 34), w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || '').trim().slice(0, 18) });
            }
          }
          return out;
        },
      };
    })();
  `;

  try {
    await page.evaluate(probeFns);
    await mobilePage.evaluate(probeFns); // same probe runtime on the emulated page

    // ── Negative controls FIRST: synthetic panel must flag on all four ──
    const negctl = await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = '__layout_negctl__';
      host.style.cssText = 'position:fixed;top:0;left:0;width:420px;height:600px;background:#111122;z-index:99997;padding:10px;';
      host.innerHTML =
        '<div class="nc-a" style="height:40px;color:#555;background:#0a0a18;font-size:12px;line-height:40px;">bad contrast text</div>' +
        '<div style="height:130px;background:transparent;"></div>' + // dead band 130px
        '<div class="nc-b" style="height:40px;margin-left:30px;background:#0a0a18;color:#ddd;font-size:12px;line-height:40px;">section b</div>' + // misaligned
        '<div class="nc-c" style="height:40px;margin-top:18px;background:#0a0a18;color:#ddd;font-size:12px;line-height:40px;">section c</div>'; // 18px = off-scale
      document.body.appendChild(host);
      const res = window.__layoutProbe.analyze(host, { hud: false });
      host.remove();
      return res;
    });
    check('negative control: off-scale gap IS flagged (18px — 13px sits within the ±1 tolerance of 12)',
      negctl.gaps.some((g) => g.gap === 18), JSON.stringify(negctl.gaps));
    check('negative control: dead band IS flagged (130px > 96px)', negctl.deadBands.some((d) => d.band >= 96),
      JSON.stringify(negctl.deadBands));
    check('negative control: misaligned block IS flagged (spread > 2px)',
      negctl.alignment.leftSpread > 2 || negctl.alignment.rightSpread > 2, JSON.stringify(negctl.alignment));
    check('negative control: low-contrast text IS flagged (#555 on #0a0a18)',
      negctl.contrast.some((c) => c.ratio < 4.5), JSON.stringify(negctl.contrast));

          // v2.19.20 negative control: overflow — the child is 2000px wide in a
          // 300px host whose overflow-x computes to 'visible' (layout leak).
          // The town carousel case (overflow:hidden clip) must NOT flag.
    const negctlOv = await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = '__layout_negctl_ov__';
      host.style.cssText = 'position:fixed;top:0;left:0;width:300px;height:80px;background:#111122;z-index:99997;';
      host.innerHTML = '<div style="width:2000px;height:20px;background:#0a0a18;color:#ddd;font-size:12px;">oversized child</div>';
      document.body.appendChild(host);
      const res = window.__layoutProbe.analyze(host, { hud: false });
      host.remove();
      return res.overflow;
    });
    check('negative control: horizontal overflow IS flagged (2000px child in 300px host)',
      negctlOv.panelX === true, JSON.stringify(negctlOv));
    const negctlWrap = await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = '__layout_negctl_wrap__';
      host.style.cssText = 'position:fixed;top:0;left:0;width:300px;background:#111122;z-index:99997;padding:8px;';
      host.innerHTML =
        '<div id="nc-halfspec" style="width:110px;overflow:hidden;text-overflow:ellipsis;color:#ddd;font-size:12px;background:#0a0a18;">WRAPS- this long text overflows its tiny box and wraps</div>' +
        '<div id="nc-fullspec" style="width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ddd;font-size:12px;background:#0a0a18;">ONE-LINE- this long text overflows and truncates</div>';
      document.body.appendChild(host);
      const res = window.__layoutProbe.analyze(host, { hud: false });
      host.remove();
      return res.wraps;
    });
    check('negative control: half-spec ellipsis IS flagged (declares truncation, actually wraps)',
      negctlWrap.some((w) => (w.text || '').startsWith('WRAPS-')), JSON.stringify(negctlWrap));
    check('negative control: proper ellipsis NOT flagged (nowrap truncates on one line)',
      !negctlWrap.some((w) => (w.text || '').startsWith('ONE-LINE-')), JSON.stringify(negctlWrap));

    // ── Report-first sweep: structural screens × §11 viewports ──
    const SCREENS = [
      { name: 'title', setup: `g.titleMenu.show();`, panel: '#title-menu', hud: false },
      { name: 'town', setup: `g.titleMenu.hide(); g.gameState.setState('town'); g.townScreen.show();`, panel: '#town-screen', hud: false },
      { name: 'shop', setup: `g.townScreen.shopSystem.openShop();`, panel: '#shop-overlay', hud: false },
      { name: 'loadout', setup: `g.townScreen.shopSystem.close(); g.townScreen.loadoutScreen.show({stageId:null,onConfirm:()=>{},onBack:()=>{}});`, panel: '.loadout-panel', hud: false },
    ];
    const VIEWPORTS = [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'mobile-portrait', width: 390, height: 844 },
      { name: 'mobile-landscape', width: 844, height: 390 },
    ];
    const report = { when: new Date().toISOString(), screens: {} };
    let probed = 0;
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const sc of SCREENS) {
        await page.evaluate(`(() => { const g = window.game; ${sc.setup} })()`);
        await page.waitForTimeout(250);
        const res = await page.evaluate(({ panelSel, hud }) => {
          const panel = document.querySelector(panelSel);
          if (!panel) return null;
          const r = panel.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          return window.__layoutProbe.analyze(panel, { hud });
        }, { panelSel: sc.panel, hud: sc.hud });
        if (res === null) continue;
        probed++;
        report.screens[`${sc.name}@${vp.name}`] = res;
        const issues = res.gaps.length + res.deadBands.length + res.contrast.length + res.wraps.length +
          ((res.alignment.leftSpread > 2 || res.alignment.rightSpread > 2) ? 1 : 0) +
          ((res.overflow.docX || res.overflow.panelX) ? 1 : 0);
        if (vp.name === 'desktop') {
          // §11 promotion: every probe gated on desktop — report-first showed
          // all 4 structural screens clean on all probes (v2.19.18).
          check(`[desktop gate: ${sc.name}] gaps on the §12.1 scale`, res.gaps.length === 0,
            JSON.stringify(res.gaps));
          check(`[desktop gate: ${sc.name}] no dead bands (§12.3)`, res.deadBands.length === 0,
            JSON.stringify(res.deadBands));
          check(`[desktop gate: ${sc.name}] sections aligned (§12.2)`,
            res.alignment.leftSpread <= 2 && res.alignment.rightSpread <= 2, JSON.stringify(res.alignment));
          check(`[desktop gate: ${sc.name}] text contrast ≥ WCAG (§12.5)`, res.contrast.length === 0,
            JSON.stringify(res.contrast));
          check(`[desktop gate: ${sc.name}] no horizontal overflow (doc/panel scrollWidth)`,
            !res.overflow.docX && !res.overflow.panelX, JSON.stringify(res.overflow));
        }
        console.log(`  ◦ [${sc.name} @ ${vp.name}] ${vp.name === 'desktop' ? 'GATED' : 'REPORT-ONLY'}: gaps=${res.gaps.length} deadBands=${res.deadBands.length} alignSpread=${res.alignment.leftSpread}/${res.alignment.rightSpread} contrast=${res.contrast.length} overflowX=${res.overflow.docX || res.overflow.panelX ? 'YES!' : 'no'} wraps=${res.wraps.length} wsRatio=${res.whitespace ? res.whitespace.ratio : 'n/a'} → ${issues === 0 ? 'CLEAN' : 'ISSUES'}`);
        if (res.wraps.length) console.log(`      wraps(REPORT): ${JSON.stringify(res.wraps.slice(0, 4))}`);
        if (res.gaps.length) console.log(`      gaps: ${JSON.stringify(res.gaps.slice(0, 4))}`);
        if (res.deadBands.length) console.log(`      deadBands: ${JSON.stringify(res.deadBands.slice(0, 4))}`);
        if (res.contrast.length) console.log(`      contrast: ${JSON.stringify(res.contrast.slice(0, 4))}`);

        // v2.19.21: real-emulation cell (iPhone 13 profile: isMobile+hasTouch+
        // DPR3+mobile UA) — the same screen, the same 5 gates, on a TRUE
        // mobile context, so mobile text metrics (font boosting, touch
        // sizing) are audited with the same rigor as desktop. One cell per
        // screen; failure here is exactly the screenshot-1 class. Runs once
        // (on the desktop iteration of the viewport loop).
        if (vp.name === 'desktop') {
        await mobilePage.evaluate(`(() => { const g = window.game; ${sc.setup} })()`);
        await mobilePage.waitForTimeout(250);
        const mres = await mobilePage.evaluate(({ panelSel, hud }) => {
          const panel = document.querySelector(panelSel);
          if (!panel) return null;
          const r = panel.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          return window.__layoutProbe.analyze(panel, { hud });
        }, { panelSel: sc.panel, hud: sc.hud });
        if (mres === null) {
          check(`[mobile-emulated: ${sc.name}] panel present under device emulation`, false, `selector ${sc.panel} absent or zero-size`);
        } else {
          check(`[mobile-emulated: ${sc.name}] gaps on the §12.1 scale`, mres.gaps.length === 0, JSON.stringify(mres.gaps));
          check(`[mobile-emulated: ${sc.name}] no dead bands (§12.3)`, mres.deadBands.length === 0, JSON.stringify(mres.deadBands));
          check(`[mobile-emulated: ${sc.name}] sections aligned (§12.2)`, mres.alignment.leftSpread <= 2 && mres.alignment.rightSpread <= 2, JSON.stringify(mres.alignment));
          check(`[mobile-emulated: ${sc.name}] text contrast ≥ WCAG (§12.5)`, mres.contrast.length === 0, JSON.stringify(mres.contrast));
          check(`[mobile-emulated: ${sc.name}] no user-experienced horizontal overflow`,
            !mres.overflow.docX && !mres.overflow.panelX, JSON.stringify(mres.overflow));
          report.screens[`${sc.name}@mobile-emulated`] = mres;
          console.log(`  ◦ [${sc.name} @ mobile-emulated] GATED: gaps=${mres.gaps.length} deadBands=${mres.deadBands.length} contrast=${mres.contrast.length} overflowX=${(mres.overflow.docX || mres.overflow.panelX) ? 'YES!' : 'no'} wraps=${mres.wraps.length} touch<44px=${mres.touchTargets.length} wsRatio=${mres.whitespace ? mres.whitespace.ratio : 'n/a'}`);
          if (mres.touchTargets.length) console.log(`      touch(REPORT): ${JSON.stringify(mres.touchTargets.slice(0, 3))}${mres.touchTargets.length > 3 ? ` …+${mres.touchTargets.length - 3} more` : ''}`);

          // v2.19.22: orientation-flip stability — the same screen on the
          // emulated page flipped portrait ↔ landscape; user-experienced
          // horizontal overflow must not appear in EITHER orientation (the
          // classic auto-adjust failure mode: a layout that survives one
          // aspect ratio and scrolls in the other).
          await mobilePage.setViewportSize({ width: 390, height: 844 });
          await mobilePage.waitForTimeout(200);
          const flipP = await mobilePage.evaluate(({ panelSel, hud }) => {
            const p = document.querySelector(panelSel);
            return p && p.getBoundingClientRect().width > 0 ? window.__layoutProbe.analyze(p, { hud }).overflow : null;
          }, { panelSel: sc.panel, hud: sc.hud });
          await mobilePage.setViewportSize({ width: 844, height: 390 });
          await mobilePage.waitForTimeout(200);
          const flipL = await mobilePage.evaluate(({ panelSel, hud }) => {
            const p = document.querySelector(panelSel);
            return p && p.getBoundingClientRect().width > 0 ? window.__layoutProbe.analyze(p, { hud }).overflow : null;
          }, { panelSel: sc.panel, hud: sc.hud });
          await mobilePage.setViewportSize(MOBILE_PROFILES.iphone13.viewport); // restore profile
          await mobilePage.waitForTimeout(200);
          check(`[mobile-emulated: ${sc.name}] orientation flip: no user-experienced overflow in portrait or landscape`,
            !!flipP && !!flipL && !flipP.panelX && !flipL.panelX,
            JSON.stringify({ portrait: flipP, landscape: flipL }));
        }
        }
      }
      await page.evaluate(() => {
        window.game.townScreen.loadoutScreen.hide?.();
        window.game.townScreen.shopSystem.close?.();
      });
      await mobilePage.evaluate(() => {
        window.game.townScreen.loadoutScreen.hide?.();
        window.game.townScreen.shopSystem.close?.();
      });
    }
    check('layout audit ran non-vacuously across screens/viewports', probed >= 8, `probed=${probed}`);

    fs.writeFileSync(path.join(outDir, 'ui_layout_report.json'), JSON.stringify(report, null, 2));
    check('no page errors during the layout audit', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
  console.log(r.bad === 0 && r.n > 0
    ? `UI LAYOUT AUDIT GREEN (${r.n}/${r.n}) — report in tests/artifacts/ui_layout_${stamp}/`
    : `UI LAYOUT AUDIT RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  console.error('ui_layout_audit crash:', String(e && e.message || e));
  process.exit(2);
});
