// ============================================================
// Shared harness for step-gated regression suites.
// Convention (KNOWLEDGE.md "step-gate testing rule"):
//   - One suite file per plan step (data_driven_systems_compilation.md §6).
//   - A suite SKIPS (exit 0, loudly) while its step is unimplemented.
//   - The moment the step lands, detection flips and the suite enforces
//     its contract. An implementation is NOT done while its suite skips.
//   - run_all.cjs --strict turns skips into failures (use after a step lands).
// Exit codes: 0 = all checks passed (or skipped), 1 = failures, 2 = crash.
// ============================================================
const { chromium } = require('playwright');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');

/** Boot the real game headless under file:// (pure fallback path) with a
 *  clean storage context. Resolves { page, browser } — caller closes.
 *
 *  opts.keepStorage — skip the post-load localStorage.clear(). Persistence
 *  suites (step 2 round-trip) need this PLUS a same-page page.reload(): a
 *  second bootGame() launches a FRESH browser whose storage starts empty, so
 *  a save→new-boot assertion against it is always vacuously empty. */
async function bootGame(opts = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // B1 (v2.19.3): pre-boot storage seeding via context init scripts — runs
  // BEFORE any game script on every navigation in this context. The old
  // boot→setItem→reload dance was clobbered by the game's lifecycle saves
  // (save:runInterrupted/pagehide paths write the CURRENT store on unload),
  // so injected seeds never reached the boot under test — caught by the
  // save_fuzz race probe (a negative control doing its job).
  if (Array.isArray(opts.initScripts)) {
    for (const s of opts.initScripts) await context.addInitScript(s.fn, s.arg);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    // Known-benign under file://: JSON fetch failures (embeddedData carries the game).
    if (m.type() === 'error' && !m.text().includes('Fetch API')) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('file://' + path.join(PUBLIC_DIR, 'game2.html'));
  if (!opts.keepStorage) {
    await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
  }
  await page.waitForFunction(() => window.game && window.game.gameManager, null, { timeout: 15000 });
  return { browser, context, page, errors };
}

/** In-page probe: is a given plan step's primary API present?
 *  Detection points are documented in each suite; when a step's real API
 *  lands with a different name, update exactly one line here or in the suite. */
const STEP_DETECTORS = {
  // Step 1 — generic condition evaluator. Planned homes: dataManager.conditionEngine,
  // a standalone GateEngine, or a GameManager method. Escape hatch flag honored.
  step1_gate_engine: () =>
    !!(window.__STEP1_GATE_ENGINE__ ||
       window.game?.dataManager?.conditionEngine ||
       window.GateEngine ||
       window.game?.gameManager?.evaluateCondition),
  // Step 2 — NPC condition system (dialogue selection, locationRules, memory log).
  step2_npc_system: () =>
    !!(window.__STEP2_NPC_SYSTEM__ ||
       window.game?.npcSystem ||
       window.NPCSystem),
  // Step 3 — widget renderer (Card template). Inventory tag support is probed
  // separately inside the suite (write-through probe, in memory, never saved).
  step3_widget_inventory: () =>
    !!(window.__STEP3_WIDGET_SYSTEM__ ||
       window.WidgetRenderer ||
       window.game?.widgetSystem),
  // Step 4 — roleplay export (favorites/checkpoint consumption of the log).
  step4_export: () =>
    !!(window.__STEP4_EXPORT__ ||
       window.game?.npcExportSystem ||
       window.NPCExport),
};

function createRunner({ suiteName }) {
  let pass = 0, fail = 0;
  const failures = [];
  return {
    check(name, ok, note = '') {
      if (ok) { pass++; console.log(`PASS — ${name}`); }
      else { fail++; failures.push(name); console.log(`FAIL — ${name}${note ? `  [${note}]` : ''}`); }
      return ok;
    },
    summary(extra = '') {
      console.log(`\n${suiteName}: ${pass} passed, ${fail} failed${extra ? `, ${extra}` : ''}`);
      if (failures.length) console.log('Failed checks:\n  - ' + failures.join('\n  - '));
      return fail === 0 ? 0 : 1;
    },
    counts: () => ({ pass, fail }),
  };
}

module.exports = { bootGame, STEP_DETECTORS, createRunner, PUBLIC_DIR };
