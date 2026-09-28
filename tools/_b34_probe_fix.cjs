const fs = require('fs');
const p = 'tests/probe_lag.cjs';
let s = fs.readFileSync(p, 'utf8');
let failures = 0;
function rep(anchor, replacement, label) {
  const count = s.split(anchor).length - 1;
  if (count !== 1) { console.error(`FAIL ${label}: anchor count ${count}`); failures++; return; }
  s = s.replace(anchor, replacement);
  console.log(`OK ${label}`);
}

// W2: correct keys + w3 excluded (level 0)
rep(`          const picks = { w1: 0, w2: 0, w3: 0 };
          for (let i = 0; i < 3000; i++) picks[g._pickUpgradeTarget()]++;
          out.picks = { w1: +(picks.w1_projectile === undefined ? picks.w1 / 3000 : picks.w1 / 3000), w2: picks.w2 / 3000, w3: picks.w3 / 3000 };`,
`          const picks = { w1_projectile: 0, w2_orbit: 0, weapon_area_pulse: 0 };
          for (let i = 0; i < 3000; i++) picks[g._pickUpgradeTarget()]++;
          // w3 has level 0 → ineligible. Mix: 95% lowest + 5% highest — both
          // between w1(1) and w2(2); tie-break takes the FIRST lowest/highest,
          // so w1 gets the 95% share and w2 the 5% jackpot share.
          out.picks = { w1: picks.w1_projectile / 3000, w2: picks.w2_orbit / 3000, w3: picks.weapon_area_pulse / 3000 };`,
  'W2 keys');

// W3: leave w3 at level 0 (excluded) — assert ONLY w2 eligible
rep(`          // W3 — maxed exclusion: w1 maxed (7), w2 mid → ONLY w2 eligible
          g.weaponSystem.weaponLevels.w1_projectile = 7;
          g.weaponSystem.weaponLevels.w2_orbit = 3;
          let allW2 = true;
          for (let i = 0; i < 1000; i++) if (g._pickUpgradeTarget() !== 'w2_orbit') allW2 = false;
          out.maxedExcluded = allW2;`,
`          // W3 — maxed/zero exclusion: w1 maxed (7), w3 lv0 (never unlocked),
          // w2 mid → ONLY w2 eligible across all rolls
          g.weaponSystem.weaponLevels.w1_projectile = 7;
          g.weaponSystem.weaponLevels.w2_orbit = 3;
          g.weaponSystem.weaponLevels.weapon_area_pulse = 0;
          let allW2 = true;
          for (let i = 0; i < 1000; i++) if (g._pickUpgradeTarget() !== 'w2_orbit') allW2 = false;
          out.maxedExcluded = allW2;`,
  'W3 eligibility');

// W4: split the counted-text assert out (text belongs to _applyWeaponLevelUp, not launchUpgradeOrb)
rep(`          out.flashArmed = g.renderer.slotFlashes.length >= 1;
          out.burstArmed = g.renderer.upgradeBursts.length >= 1;
          out.countedText = g.floatingTextSystem.texts.some(t => t.text.startsWith('WEAPON UP!'));`,
`          out.flashArmed = g.renderer.slotFlashes.length >= 1;
          out.burstArmed = g.renderer.upgradeBursts.length >= 1;`,
  'W4 split a');

rep(`          check('W4: impact arms flash + burst + counted text', w.flashArmed && w.burstArmed && w.countedText === true);`,
`          check('W4: impact arms flash + burst', w.flashArmed && w.burstArmed === true);
          // counted announcement comes from _applyWeaponLevelUp (roll → text)
          g.weaponSystem.weaponLevels.w1_projectile = 1;
          g.weaponSystem.weaponLevels.w2_orbit = 2;
          g.weaponSystem.weaponLevels.weapon_area_pulse = 1;
          g.floatingTextSystem.texts.length = 0;
          g.renderer.upgradeOrbs.length = 0;
          g._applyWeaponLevelUp();
          const countedText = g.floatingTextSystem.texts.some(t => t.text.startsWith('WEAPON UP!'));
          out.countedText = countedText;
          out.wupInstances = g.renderer.upgradeOrbs.length; // 1–3 orbs launched
          check('W4: pickup rolls 1–3 orbs and announces the count', countedText === true && out.wupInstances >= 1 && out.wupInstances <= 3, \`orbs=\${out.wupInstances}\`);`,
  'W4 split b');

// W6: honest contract — restart clears without applying
rep(`          // W6 — restart flush: in-flight orb (unapplied level) survives restart
          g.weaponSystem.weaponLevels.w1_projectile = 4;
          g.renderer.launchUpgradeOrb('w2_orbit'); // unapplied (w2@2 → 3 on impact)
          g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
          g.startGame();
          out.flushedLevel = (g.weaponSystem.weaponLevels.w2_orbit || 0) === 3;
          out.flushedClear = g.renderer.upgradeOrbs.length === 0 && g.renderer.slotFlashes.length === 0;`,
`          // W6 — restart teardown: in-flight orbs are cleared WITHOUT applying
          // (startGame resets weaponLevels and re-unlocks at Lv1 — mid-run
          // upgrade levels never persist across runs; applying into the dying
          // system would be a phantom). Fresh run = fresh loadout.
          g.weaponSystem.weaponLevels.w1_projectile = 4;
          g.weaponSystem.weaponLevels.w2_orbit = 2;
          g.renderer.launchUpgradeOrb('w2_orbit'); // would-be w2@3, never applied
          g.gameManager.set('session.selected_stage_id', 'stage_graveyard');
          g.startGame();
          await new Promise(r => setTimeout(r, 200));
          out.flushedClear = g.renderer.upgradeOrbs.length === 0 && g.renderer.slotFlashes.length === 0;
          out.freshLoadout = (g.weaponSystem.weaponLevels.w1_projectile || 0) === 1;`,
  'W6 contract');

// checks: W6 text
rep(`      check('W6: restart flushes in-flight orbs — earned level applied, arrays clear', w.flushedLevel && w.flushedClear === true);`,
`      check('W6: restart clears in-flight orbs; fresh run starts at Lv1', w.flushedClear && w.freshLoadout === true);`,
  'W6 check text');

if (failures) process.exit(1);
fs.writeFileSync(p, s, 'utf8');
console.log('probe fixes landed');
