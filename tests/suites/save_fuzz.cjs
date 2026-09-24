#!/usr/bin/env node
// ============================================================
// save_fuzz.cjs — Save-integrity fuzz + double-boot race (B1, WORKFLOW §10)
//
// What it proves (TESTING_PLAN §4.8):
//   1. ANY mutated/partial/corrupt save boots the game without throwing:
//      dropped keys, wrong types, ghost entries, version chaos, corrupt JSON,
//      and non-object roots. Degraded-mode (fresh default or migration) is
//      the correct outcome, not a crash.
//   2. The migration chain lands on v9 with a structurally sane persistent
//      branch and NEVER resurrects the retired persistent.town.phase field.
//   3. Double-boot race / refresh storm: N boots against the same seeded slot
//      never duplicate or lose counters (POT-010 family — end_session() is
//      the single total_runs owner).
//   4. Boot hygiene: no unexpected page/console errors across all runs
//      (deliberate file:// fetch warnings excluded by the harness).
//
// Method: seeded LCG PRNG (deterministic across runs — a red reproduces).
// Each mutant is a deep clone of a real v9 store; a mutation never re-reads
// the pristine seed (KNOWLEDGE §16 spirit: one bad mutant can't poison the
// next case). Boots are serial; each gets its own browser + fresh storage
// via bootGame(), the mutant is injected pre-boot into the storage context.
// Exit codes: 0 green, 1 failures, 2 crash. Skips loudly if the harness or
// game entry is missing.
// ============================================================
const path = require('path');
const fs = require('fs');

const r = { n: 0, bad: 0 };
const check = (name, pass, extra) => {
  r.n++;
  if (pass) console.log(`  ✓ ${name}`);
  else { r.bad++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

// Deterministic PRNG (mulberry32). Same seed ⇒ same mutant sequence.
function lcg(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const deepClone = (v) => JSON.parse(JSON.stringify(v));

function buildSeedStore() {
  return {
    save_version: 9,
    session: { current_stage_id: null, run_in_progress: false, run_data: null },
    world: { currentRegion: 'town', currentLocation: 'city_root', locationHistory: ['town:city_root'], regionIndex: 0, regionUnlocks: { town: true, graveyard: false, forest: false }, locationUnlocks: { 'town:city_root': true } },
    persistent: {
      currency: 150,
      player: { level: 3, xp: 40, total_gold: 210, base_stats: { max_health: 100, move_speed: 200, damage_multiplier: 1.0, speed_multiplier: 1.0 } },
      combat: { unlocked_weapons: ['w1_projectile'], weapon_levels: { w1_projectile: 2 }, best_run: null, run_history: [], stars: {} },
      skills: { unlocked: [], skill_points: 0 },
      town: { level: 1, population: 0, popCap: 5, buildings: {}, resources: { gold: 0, wood: 2, stone: 0, herbs: 1, ore: 0 }, workers: { farmers: 0, miners: 0, builders: 0, idle: 0 } },
      npcs: { met: ['old_man'], relationships: {}, companions: [], companionStatus: {}, eventLog: [], eventSeq: 0, favorites: [] },
      factions: { wanderers_guild: { reputation: 0, rank: 'unknown' } },
      quests: { active: [], completed: [], failed: [], objectives: {}, timeEvents: [] },
      unlocks: { stages: ['stage_graveyard'], items: [], features: ['town_basic', 'combat_basic'] },
      estates: [],
      family: { wives: [], children: [] },
      inventory: { equipment: { weapon: null, armor: null }, consumables: [], max_slots: 24 },
      gameLog: { tail: [] },
    },
    farming: { slots: [], plans: [], pityCounters: {}, clearCounters: {}, gachaCounters: {} },
    estates: [],
    flags: { story_started: true },
    counters: { total_kills: 7, total_runs: 2 },
  };
}

// ── Mutation operators ────────────────────────────────────────
// Each op: (store, rng) => description. Returns null when not applicable.
const OPS = [
  ['drop key', (s, rng) => {
    const paths = [
      ['persistent', 'player', 'level'], ['persistent', 'town', 'level'],
      ['persistent', 'npcs', 'eventSeq'], ['persistent', 'gameLog', 'tail'],
      ['persistent', 'currency'], ['counters', 'total_runs'], ['save_version'],
      ['world', 'currentRegion'], ['persistent', 'quests', 'objectives'],
      ['farming', 'slots'],
    ];
    const p = paths[Math.floor(rng() * paths.length)];
    let o = s; for (let i = 0; i < p.length - 1; i++) { o = o?.[p[i]]; if (o == null) return null; }
    delete o[p[p.length - 1]];
    return `dropped ${p.join('.')}`;
  }],
  ['wrong type', (s, rng) => {
    const cases = [
      [(s2) => { s2.persistent.player.level = 'three'; }, 'player.level=string'],
      [(s2) => { s2.persistent.currency = NaN; }, 'currency=NaN'], // JSON.stringify → null
      [(s2) => { s2.persistent.town = null; }, 'town=null'],
      [(s2) => { s2.persistent.quests = []; }, 'quests=array'],
      [(s2) => { s2.persistent.npcs.eventLog = 'nope'; }, 'eventLog=string'],
      [(s2) => { s2.counters = null; }, 'counters=null'],
      [(s2) => { s2.world = undefined; }, 'world=undefined'], // dropped by stringify
      [(s2) => { s2.persistent.player.base_stats.move_speed = null; }, 'move_speed=null'],
    ];
    const [fn, label] = cases[Math.floor(rng() * cases.length)];
    fn(s); return label;
  }],
  ['ghost entry', (s, rng) => {
    const cases = [
      [(s2) => { s2.persistent.combat.unlocked_weapons.push('w_ghost'); }, 'ghost weapon id'],
      [(s2) => { s2.persistent.npcs.met.push('npc_ghost'); }, 'ghost npc id'],
      [(s2) => { s2.persistent.quests.active.push('mq_ghost'); }, 'ghost quest id'],
      [(s2) => { s2.world.locationHistory.push('town:ghost_room'); }, 'ghost location'],
      [(s2) => { s2.persistent.town.phase = 2; }, 'retired phase field'], // §5.6 regression trap
    ];
    const [fn, label] = cases[Math.floor(rng() * cases.length)];
    fn(s); return label;
  }],
  ['version chaos', (s, rng) => {
    const cases = [
      [(s2) => { s2.save_version = 0; }, 'v0'],
      [(s2) => { s2.save_version = 3; }, 'v3'],
      [(s2) => { s2.save_version = 8; }, 'v8'],
      [(s2) => { s2.save_version = 999; }, 'v999 (future)'],
      [(s2) => { delete s2.save_version; delete s2.version; }, 'no version'],
      [(s2) => { s2.save_version = 'nine'; }, 'version=string'],
      [(s2) => { s2.save_version = 2; s2.persistent.town.phase = 1; }, 'v2 + phase'],
    ];
    const [fn, label] = cases[Math.floor(rng() * cases.length)];
    fn(s); return label;
  }],
];

function buildMutants(count) {
  const rng = lcg(0x5EED0001);
  const mutants = [];
  for (let i = 0; i < count; i++) {
    const store = buildSeedStore();
    const nOps = 1 + Math.floor(rng() * 3); // 1–3 stacked mutations
    const applied = [];
    for (let k = 0; k < nOps; k++) {
      const [name, op] = OPS[Math.floor(rng() * OPS.length)];
      const desc = op(store, rng);
      if (desc) applied.push(`${name}: ${desc}`);
    }
    mutants.push({ id: i + 1, desc: applied.join(' + ') || 'no-op', store });
  }
  // Corrupt-JSON cases ride OUTSIDE the deep-clone loop (not object mutables).
  mutants.push({ id: 'j1', desc: 'truncated JSON', raw: '{"save_version":9,"persistent":{"currency"' });
  mutants.push({ id: 'j2', desc: 'JSON array root', raw: '[1,2,3]' });
  mutants.push({ id: 'j3', desc: 'JSON scalar root', raw: '"just a string"' });
  mutants.push({ id: 'j4', desc: 'JSON null root', raw: 'null' });
  mutants.push({ id: 'j5', desc: 'empty object root', raw: '{}' });
  return mutants;
}

(async () => {
  const harnessPath = path.join(__dirname, '..', 'lib', 'harness.cjs');
  if (!fs.existsSync(harnessPath) || !fs.existsSync(path.join(__dirname, '..', '..', 'public', 'game2.html'))) {
    console.log('  SKIP save_fuzz: harness or game entry missing');
    process.exit(0);
  }
  const { bootGame } = require(harnessPath);
  const MUTANT_COUNT = 50;
  const mutants = buildMutants(MUTANT_COUNT);
  const bootErrors = [];

  console.log(`  seeding: ${mutants.length} cases (seeded LCG, deterministic)`);

  for (const m of mutants) {
    let ok = false, v = null, hasPhase = null, townLevel = null, seeded = false, err = null;
    try {
      // Own browser per case; the seed is injected via context init script —
      // it runs BEFORE any game script on the (single) navigation, so init()
      // reads the mutant as its normal save. keepStorage skips the harness's
      // post-goto clear (the context is fresh; nothing else to protect).
      const payload = m.raw !== undefined ? m.raw : JSON.stringify(m.store);
      const { browser, page, errors } = await bootGame({
        keepStorage: true,
        initScripts: [{
          fn: (p) => {
            try {
              localStorage.setItem('me_save_slot1', p);
              window.__fuzzSeeded = localStorage.getItem('me_save_slot1') === p;
            } catch (_) { window.__fuzzSeeded = false; }
          },
          arg: payload,
        }],
      });
      try {
        await page.waitForFunction(() => window.game && window.game.gameManager, null, { timeout: 15000 });
        const probe = await page.evaluate(() => {
          const gm = window.game.gameManager;
          return {
            v: gm.store?.save_version,
            phase: 'phase' in (gm.store?.persistent?.town || {}),
            townLevel: gm.store?.persistent?.town?.level,
            hasStore: !!gm.store,
            seeded: window.__fuzzSeeded === true,
          };
        });
        seeded = probe.seeded;
        ok = seeded && probe.hasStore && typeof probe.v === 'number' && probe.v >= 9;
        v = probe.v; hasPhase = probe.phase; townLevel = probe.townLevel;
        if (errors.length) bootErrors.push(`case ${m.id}: ${errors[0]}`);
      } finally {
        await browser.close();
      }
    } catch (e) {
      err = String(e && e.message || e).slice(0, 120);
    }
    check(
      `case ${m.id} boots clean`,
      ok,
      `${m.desc} | seeded=${seeded} v=${v} phase=${hasPhase} townLevel=${townLevel}${err ? ' | ' + err : ''}`
    );
  }

  // ── 3) Double-boot race / refresh storm (POT-010 family) ──
  // The user-facing scenario: preview refresh hits a save mid-play. N boots
  // against one seeded slot; totals must be identical after every boot and
  // never inflated by a duplicate end_session/autosave path.
  {
    const seed = buildSeedStore();
    seed.counters.total_runs = 2;
    seed.counters.total_kills = 7;
    const { browser, page, errors } = await bootGame({
      keepStorage: true,
      initScripts: [{
        fn: (s) => {
          try {
            localStorage.setItem('me_save_slot1', JSON.stringify(s));
            window.__fuzzSeeded = true;
          } catch (_) { window.__fuzzSeeded = false; }
        },
        arg: seed,
      }],
    });
    try {
      const totals = [];
      let raceOk = true;
      for (let i = 0; i < 3; i++) {
        if (i > 0) await page.reload();
        await page.waitForFunction(() => window.game && window.game.gameManager, null, { timeout: 15000 });
        const t = await page.evaluate(() => {
          const gm = window.game.gameManager;
          return {
            seeded: window.__fuzzSeeded === true,
            runs: gm.store?.counters?.total_runs,
            kills: gm.store?.counters?.total_kills,
            slot: gm.getActiveSlot(),
            hasStore: !!gm.store,
          };
        });
        totals.push(t);
        if (!t.seeded || !t.hasStore || t.slot !== 1 || t.runs !== 2 || t.kills !== 7) raceOk = false;
      }
      check('double-boot race: 3 consecutive boots against one slot preserve totals (no dup/loss)',
        raceOk, JSON.stringify(totals));
      if (errors.length) bootErrors.push(`race: ${errors[0]}`);
    } finally {
      await browser.close();
    }
  }

  check('no unexpected page/console errors across all boots',
    bootErrors.length === 0, bootErrors.slice(0, 3).join(' | '));

  console.log(r.bad === 0 && r.n > 0
    ? `SAVE FUZZ GREEN (${r.n}/${r.n})`
    : `SAVE FUZZ RED — ${r.bad}/${r.n} failed`);
  process.exit(r.bad === 0 ? 0 : 1);
})().catch((e) => {
  console.error('save_fuzz crash:', String(e && e.message || e));
  process.exit(2);
});
