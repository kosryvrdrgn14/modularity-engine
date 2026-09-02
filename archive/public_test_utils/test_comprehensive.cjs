const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let fp = path.join(__dirname, req.url === '/' ? 'game2.html' : req.url);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end('Not found: ' + fp); return; }
  const ext = path.extname(fp);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  res.end(fs.readFileSync(fp));
});

let passed = 0, failed = 0, gaps = [];

function assert(label, condition, detail) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ ${label}`); if (detail) console.log(`     ${detail}`); }
}

function gap(label, description) {
  gaps.push({ label, description });
  console.log(`  ⚠️  GAP: ${label} — ${description}`);
}

async function run() {
  const port = await new Promise(r => server.listen(0, () => r(server.address().port)));
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  // ============================================================
  // SECTION 1: DATA INTEGRITY
  // ============================================================
  console.log('\n=== 1. DATA INTEGRITY ===');

  const data = await page.evaluate(() => ({
    enemies: game.dataManager.enemies?.length,
    enemyIds: game.dataManager.enemies?.map(e => e.id),
    stages: game.dataManager._allStages?.length,
    stageIds: game.dataManager._allStages?.map(s => s.id),
    weapons: game.dataManager.weapons?.length,
    weaponIds: game.dataManager.weapons?.map(w => w.id),
    characters: game.dataManager.characters?.name,
    pickups: game.dataManager.pickups?.length,
    leveling: game.dataManager.leveling?.xpCurve?.length,
    hasAssetMap: typeof ASSET_MAP !== 'undefined',
    assetCount: typeof ASSET_MAP !== 'undefined' ? Object.keys(ASSET_MAP).length : 0,
  }));

  assert('Enemies loaded (10)', data.enemies === 10, `Got ${data.enemies}`);
  assert('Rat enemy exists', data.enemyIds?.includes('rat'));
  assert('Brute enemy exists', data.enemyIds?.includes('brute'));
  assert('Ghoul enemy exists', data.enemyIds?.includes('ghoul'));
  assert('Necromancer boss exists', data.enemyIds?.includes('boss_necromancer'));
  assert('Gravekeeper boss exists', data.enemyIds?.includes('boss_gravekeeper'));
  assert('2 stages loaded', data.stages === 2, `Got ${data.stages}`);
  assert('Graveyard stage exists', data.stageIds?.includes('stage_graveyard'));
  assert('Extended stage exists', data.stageIds?.includes('stage_graveyard_extended'));
  assert('3 weapons loaded', data.weapons === 3);
  assert('Character loaded', data.characters === 'The Survivor');
  assert('6 pickups loaded', data.pickups === 6);
  assert('14 XP curve entries', data.leveling === 14);
  assert('Asset map loaded', data.hasAssetMap);
  assert('Asset map has 15+ entries', data.assetCount >= 15, `Got ${data.assetCount}`);

  // ============================================================
  // SECTION 2: STAGE SELECTION
  // ============================================================
  console.log('\n=== 2. STAGE SELECTION ===');

  const stageTests = await page.evaluate(() => {
    const results = {};
    const stages = game.dataManager.getStageList();
    for (const stage of stages) {
      results[stage.id] = {
        name: stage.name,
        hasWaves: !!stage.waves && stage.waves.length > 0,
        waveCount: stage.waves?.length || 0,
        hasBossConfig: !!stage.bossConfig,
        bossId: stage.bossConfig?.enemyId,
        hasWeaponLoadouts: !!stage.weaponLoadouts,
        loadoutTiers: Object.keys(stage.weaponLoadouts || {}),
        hasTierMultipliers: !!stage.tierMultipliers,
        tierKeys: Object.keys(stage.tierMultipliers || {}),
      };
    }
    return results;
  });

  for (const [stageId, info] of Object.entries(stageTests)) {
    assert(`${stageId} has waves`, info.hasWaves, `${info.waveCount} waves`);
    assert(`${stageId} has boss config`, info.hasBossConfig);
    assert(`${stageId} boss is ${info.bossId}`, !!info.bossId);
    assert(`${stageId} has weapon loadouts`, info.hasWeaponLoadouts);
    assert(`${stageId} has 3 tiers`, info.loadoutTiers.length === 3);
    assert(`${stageId} has tier multipliers`, info.hasTierMultipliers);
  }

  // ============================================================
  // SECTION 3: WEAPON LOADOUTS PER TIER
  // ============================================================
  console.log('\n=== 3. WEAPON LOADOUTS ===');

  const loadoutTests = await page.evaluate(() => {
    const results = [];
    const stages = game.dataManager.getStageList();
    for (const stage of stages) {
      for (const [tier, loadout] of Object.entries(stage.weaponLoadouts || {})) {
        results.push({
          stage: stage.id, tier, weapons: loadout.weapons, duration: loadout.duration,
        });
      }
    }
    return results;
  });

  for (const lt of loadoutTests) {
    assert(`${lt.stage}/${lt.tier} has 3 weapons`, lt.weapons.length === 3, JSON.stringify(lt.weapons));
    assert(`${lt.stage}/${lt.tier} has duration`, typeof lt.duration === 'number' && lt.duration > 0, `Got ${lt.duration}`);
  }

  // ============================================================
  // SECTION 4: TIER MULTIPLIERS
  // ============================================================
  console.log('\n=== 4. TIER MULTIPLIERS ===');

  const multTests = await page.evaluate(() => {
    const results = [];
    const stages = game.dataManager.getStageList();
    for (const stage of stages) {
      for (const [tier, mults] of Object.entries(stage.tierMultipliers || {})) {
        results.push({ stage: stage.id, tier, ...mults });
      }
    }
    return results;
  });

  const expectedMults = {
    quick: { hp: 0.8, damage: 0.9, gold: 0.8, xp: 1.2 },
    standard: { hp: 1.0, damage: 1.0, gold: 1.0, xp: 1.0 },
    highlight: { hp: 1.3, damage: 1.2, gold: 1.5, xp: 1.0 },
  };

  for (const mt of multTests) {
    const exp = expectedMults[mt.tier];
    if (exp) {
      assert(`${mt.stage}/${mt.tier} HP mult = ${exp.hp}`, mt.hp === exp.hp, `Got ${mt.hp}`);
      assert(`${mt.stage}/${mt.tier} Gold mult = ${exp.gold}`, mt.gold === exp.gold, `Got ${mt.gold}`);
    }
  }

  // ============================================================
  // SECTION 5: ENEMY STAT VALIDATION
  // ============================================================
  console.log('\n=== 5. ENEMY STATS ===');

  const enemyStats = await page.evaluate(() => {
    return game.dataManager.enemies.map(e => ({
      id: e.id, type: e.type, hp: e.stats?.hp, dmg: e.stats?.damage,
      speed: e.stats?.speed, size: e.stats?.size, xp: e.stats?.xpValue,
      firstAppears: e.spawn?.firstAppears, hasDrops: !!e.drops,
    }));
  });

  const expectedEnemies = {
    zombie: { hp: 10, dmg: 5, type: 'normal' },
    bat: { hp: 5, dmg: 3, type: 'normal' },
    skeleton: { hp: 20, dmg: 8, type: 'normal' },
    ghost: { hp: 15, dmg: 10, type: 'normal' },
    caster: { hp: 12, dmg: 8, type: 'normal' },
    rat: { hp: 6, dmg: 6, type: 'normal' },
    brute: { hp: 40, dmg: 12, type: 'normal' },
    ghoul: { hp: 300, dmg: 18, type: 'miniboss' },
    boss_gravekeeper: { hp: 1000, dmg: 15, type: 'boss' },
    boss_necromancer: { hp: 1200, dmg: 18, type: 'boss' },
  };

  for (const e of enemyStats) {
    const exp = expectedEnemies[e.id];
    if (exp) {
      assert(`${e.id} HP = ${exp.hp}`, e.hp === exp.hp, `Got ${e.hp}`);
      assert(`${e.id} DMG = ${exp.dmg}`, e.dmg === exp.dmg, `Got ${e.dmg}`);
      assert(`${e.id} type = ${exp.type}`, e.type === exp.type, `Got ${e.type}`);
      assert(`${e.id} has drops`, e.hasDrops);
    }
  }

  // ============================================================
  // SECTION 6: BOSS INTRO DATA
  // ============================================================
  console.log('\n=== 6. BOSS INTRO DATA ===');

  const bossIntros = await page.evaluate(() => {
    return game.dataManager.enemies
      .filter(e => e.type === 'boss' && e.intro)
      .map(e => ({
        id: e.id, name: e.intro.bossName, subtitle: e.intro.bossSubtitle,
        duration: e.intro.totalDuration, skip: e.intro.allowSkip,
      }));
  });

  for (const bi of bossIntros) {
    assert(`${bi.id} has intro name`, !!bi.name, bi.name);
    assert(`${bi.id} has subtitle`, !!bi.subtitle);
    assert(`${bi.id} intro duration ≥ 3s`, bi.duration >= 3, `Got ${bi.duration}`);
    assert(`${bi.id} skippable`, bi.skip === true);
  }

  // ============================================================
  // SECTION 7: WAVE PROGRESSION (Graveyard)
  // ============================================================
  console.log('\n=== 7. WAVE PROGRESSION ===');

  const waveTests = await page.evaluate(() => {
    const stage = game.dataManager._allStages.find(s => s.id === 'stage_graveyard');
    if (!stage) return null;
    return stage.waves.map(w => ({
      time: w.time, enemies: w.enemyTypes, rate: w.spawnRate, max: w.maxEnemies,
      hasWeights: !!w.compositionWeights,
    }));
  });

  if (waveTests) {
    assert('Graveyard has 10 waves', waveTests.length === 10, `Got ${waveTests.length}`);
    // First wave should be zombie only
    assert('Wave 1 (0:00) = zombie only', waveTests[0].enemies.length === 1 && waveTests[0].enemies[0] === 'zombie');
    // Last wave should include boss
    assert('Wave 10 (4:30) includes boss', waveTests[9].enemies.includes('boss_gravekeeper'));
    // Spawn rate should increase
    assert('Spawn rate increases over time', waveTests[0].rate < waveTests[5].rate);
    // Max enemies should increase
    assert('Max enemies increases over time', waveTests[0].max < waveTests[5].max);
    // All waves have composition weights
    assert('All waves have composition weights', waveTests.every(w => w.hasWeights));
  }

  // Extended stage waves
  const extWaves = await page.evaluate(() => {
    const stage = game.dataManager._allStages.find(s => s.id === 'stage_graveyard_extended');
    if (!stage) return null;
    return {
      count: stage.waves.length,
      hasRat: stage.waves.some(w => w.enemyTypes.includes('rat')),
      hasBrute: stage.waves.some(w => w.enemyTypes.includes('brute')),
      hasNecro: stage.waves.some(w => w.enemyTypes.includes('boss_necromancer')),
      lastWave: stage.waves[stage.waves.length - 1]?.time,
    };
  });

  if (extWaves) {
    assert('Extended stage has 20 waves', extWaves.count === 20, `Got ${extWaves.count}`);
    assert('Extended has rats', extWaves.hasRat);
    assert('Extended has brutes', extWaves.hasBrute);
    assert('Extended has necromancer boss', extWaves.hasNecro);
    assert('Extended last wave is 9:30-10:00', extWaves.lastWave === '9:30-10:00');
  }

  // ============================================================
  // SECTION 8: BOSS SPAWN TEST (Graveyard)
  // ============================================================
  console.log('\n=== 8. BOSS SPAWN (Graveyard) ===');

  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    game.gameManager.set('session.current_stage_tier', 'standard');
    game.startGame();
  });
  await page.waitForTimeout(2000);

  // Run game forward normally to boss spawn
  let graveyardBoss = false;
  for (let t = 0; t < 250; t += 10) {
    await page.evaluate((t) => { game.spawnSystem.gameTime = t; }, t);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);

  graveyardBoss = await page.evaluate(() => {
    return game.entityManager.getActive('enemy').some(e => e.isBoss && e.enemyData?.id === 'boss_gravekeeper');
  });
  assert('Gravekeeper spawns in graveyard stage', graveyardBoss);

  // ============================================================
  // SECTION 9: BOSS SPAWN TEST (Extended — Necromancer)
  // ============================================================
  console.log('\n=== 9. BOSS SPAWN (Extended — Necromancer) ===');

  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard_extended');
    game.gameManager.set('session.current_stage_tier', 'highlight');
    game.startGame();
  });
  await page.waitForTimeout(2000);

  // Fast-forward near boss spawn
  await page.evaluate(() => { game.spawnSystem.gameTime = 541; });
  await page.waitForTimeout(3000);

  const necroBoss = await page.evaluate(() => {
    const bosses = game.entityManager.getActive('enemy').filter(e => e.isBoss);
    return {
      found: bosses.some(b => b.enemyData?.id === 'boss_necromancer'),
      hp: bosses.find(b => b.enemyData?.id === 'boss_necromancer')?.hp,
      phases: bosses.find(b => b.enemyData?.id === 'boss_necromancer')?.enemyData?.phases?.length,
    };
  });
  assert('Necromancer spawns in extended stage', necroBoss.found);
  assert('Necromancer HP = 1200', necroBoss.hp === 1200, `Got ${necroBoss.hp}`);
  assert('Necromancer has 3 phases', necroBoss.phases === 3, `Got ${necroBoss.phases}`);

  // ============================================================
  // SECTION 10: ENEMY SPAWNING BY WAVE
  // ============================================================
  console.log('\n=== 10. ENEMY SPAWNING BY WAVE ===');

  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard_extended');
    game.gameManager.set('session.current_stage_tier', 'standard');
    game.startGame();
  });
  await page.waitForTimeout(1000);

  // Test wave at 1:30 (should have rats)
  await page.evaluate(() => { game.spawnSystem.gameTime = 100; });
  await page.waitForTimeout(3000);
  const wave130 = await page.evaluate(() => {
    const enemies = game.entityManager.getActive('enemy');
    return { hasRat: enemies.some(e => e.enemyData?.id === 'rat'), total: enemies.length };
  });
  assert('Rats spawn after 1:30', wave130.hasRat, `Total: ${wave130.total}`);

  // Test wave at 4:30 (should have brutes)
  await page.evaluate(() => { game.spawnSystem.gameTime = 270; });
  await page.waitForTimeout(3000);
  const wave430 = await page.evaluate(() => {
    const enemies = game.entityManager.getActive('enemy');
    return { hasBrute: enemies.some(e => e.enemyData?.id === 'brute'), total: enemies.length };
  });
  assert('Brutes spawn after 4:00', wave430.hasBrute, `Total: ${wave430.total}`);

  // ============================================================
  // SECTION 11: SVG ASSET MAPPINGS
  // ============================================================
  console.log('\n=== 11. SVG ASSET MAPPINGS ===');

  const assetTests = await page.evaluate(() => {
    const needed = [
      'enemy_square_#3B8A30',  // zombie
      'enemy_square_#6B3FA0',  // bat
      'enemy_square_#C0392B',  // skeleton
      'enemy_square_#8E44AD',  // ghost
      'enemy_square_#2E86C1',  // caster
      'enemy_square_#8B6914',  // rat
      'enemy_square_#2D4A1E',  // brute
      'enemy_square_#5B2C6F',  // ghoul
      'enemy_square_#6A0DAD',  // necromancer
      'enemy_square_#4A0000',  // gravekeeper
    ];
    return needed.map(k => ({ key: k, exists: !!ASSET_MAP[k] }));
  });

  for (const a of assetTests) {
    assert(`Asset ${a.key}`, a.exists);
  }

  // ============================================================
  // SECTION 12: TITLE SCREEN UI
  // ============================================================
  console.log('\n=== 12. TITLE SCREEN UI ===');

  // Go back to title
  await page.evaluate(() => {
    game.gameState.setState('title');
    game.titleMenu.show();
  });
  await page.waitForTimeout(500);

  const titleUI = await page.evaluate(() => {
    const screen = document.getElementById('title-screen');
    const items = document.querySelectorAll('.menu-item');
    return {
      visible: screen?.classList.contains('active'),
      itemCount: items.length,
      actions: Array.from(items).map(i => i.dataset.action),
      hasStageSelect: Array.from(items).some(i => i.dataset.action === 'dev-stage'),
    };
  });

  assert('Title screen visible', titleUI.visible);
  assert('6 menu items', titleUI.itemCount === 6, `Got ${titleUI.itemCount}`);
  assert('Has Play option', titleUI.actions.includes('play'));
  assert('Has Test Town option', titleUI.actions.includes('test-town'));
  assert('Has Stage Select DEV option', titleUI.hasStageSelect);

  // ============================================================
  // SECTION 13: DATA FILE SYNTAX CHECKS
  // ============================================================
  console.log('\n=== 13. FILE SYNTAX CHECKS ===');

  const syntaxCheck = await page.evaluate(() => {
    const results = [];
    // Check EMBEDDED_DATA structure
    try {
      const ed = EMBEDDED_DATA;
      results.push({ file: 'EMBEDDED_DATA', ok: !!ed.enemies && !!ed.stages && !!ed.weapons });
    } catch (e) {
      results.push({ file: 'EMBEDDED_DATA', ok: false, error: e.message });
    }
    return results;
  });

  for (const s of syntaxCheck) {
    assert(`${s.file} structure valid`, s.ok, s.error || '');
  }

  // Node-level checks
  const nodeCheck = (() => {
    const results = [];
    const files = [
      'data/embeddedData.js', 'data/assetMap.js', 'data/npcData.js',
      'data/locationTree.js', 'data/shopData.js', 'data/companionData.js',
    ];
    for (const f of files) {
      try {
        new Function(fs.readFileSync(path.join(__dirname, f), 'utf8'));
        results.push({ file: f, ok: true });
      } catch (e) {
        results.push({ file: f, ok: false, error: e.message.substring(0, 100) });
      }
    }
    return results;
  })();

  for (const n of nodeCheck) {
    assert(`${n.file} parses`, n.ok, n.error || '');
  }

  // ============================================================
  // SECTION 14: GAME START/STOP CYCLE
  // ============================================================
  console.log('\n=== 14. GAME LIFECYCLE ===');

  // Start standard game
  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    game.gameManager.set('session.current_stage_tier', 'standard');
    game.startGame();
  });
  await page.waitForTimeout(1000);

  const lifecycle1 = await page.evaluate(() => ({
    state: game.gameState.state,
    playerHP: game.entityManager.getActive('player')[0]?.hp,
    weapons: game._currentStageWeapons,
  }));
  assert('Game state is playing', lifecycle1.state === 'playing');
  assert('Player HP = 100', lifecycle1.playerHP === 100);
  assert('Standard loadout = W1+W2+W3', JSON.stringify(lifecycle1.weapons) === '["w1_projectile","w2_orbit","weapon_area_pulse"]');

  // Reset and start extended
  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard_extended');
    game.gameManager.set('session.current_stage_tier', 'highlight');
    game.startGame();
  });
  await page.waitForTimeout(1000);

  const lifecycle2 = await page.evaluate(() => ({
    state: game.gameState.state,
    playerHP: game.entityManager.getActive('player')[0]?.hp,
    weapons: game._currentStageWeapons,
    stage: game.dataManager.stages?.id,
  }));
  assert('Extended game starts correctly', lifecycle2.state === 'playing');
  assert('Extended stage loaded', lifecycle2.stage === 'stage_graveyard_extended');
  assert('Highlight loadout = W1+W5+W3', JSON.stringify(lifecycle2.weapons) === '["w1_projectile","w5_arcane_bolt","weapon_area_pulse"]');

  // ============================================================
  // SECTION 15: AUDIO SYSTEM
  // ============================================================
  console.log('\n=== 15. AUDIO SYSTEM ===');

  const audio = await page.evaluate(() => ({
    exists: !!game.audioManager,
    hasInit: typeof game.audioManager?.init === 'function',
    hasPlayMenuSound: typeof game.audioManager?.playMenuSound === 'function',
  }));
  assert('AudioManager exists', audio.exists);
  assert('AudioManager.init exists', audio.hasInit);
  assert('AudioManager.playMenuSound exists', audio.hasPlayMenuSound);

  // ============================================================
  // SECTION 16: COMPANION SYSTEM
  // ============================================================
  console.log('\n=== 16. COMPANION SYSTEM ===');

  const companion = await page.evaluate(() => ({
    exists: !!game.companionSystem,
    hasData: typeof COMPANION_DATA !== 'undefined',
    companionCount: typeof COMPANION_DATA !== 'undefined' ? COMPANION_DATA.length : 0,
  }));
  assert('CompanionSystem exists', companion.exists);
  assert('COMPANION_DATA loaded', companion.hasData);
  assert('Dog companion in data', companion.companionCount >= 1, `Got ${companion.companionCount}`);

  // ============================================================
  // SECTION 17: SPARSE EDGE CASES
  // ============================================================
  console.log('\n=== 17. EDGE CASES ===');

  // Start with invalid stage
  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'nonexistent_stage');
    game.startGame();
  });
  await page.waitForTimeout(1000);

  const edge1 = await page.evaluate(() => ({
    state: game.gameState.state,
    stage: game.dataManager.stages?.id,
  }));
  assert('Invalid stage falls back to first stage', edge1.stage === 'stage_graveyard');
  assert('Game still starts with fallback', edge1.state === 'playing');

  // Start without stage selection
  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', null);
    game.startGame();
  });
  await page.waitForTimeout(1000);

  const edge2 = await page.evaluate(() => ({
    state: game.gameState.state,
    stage: game.dataManager.stages?.id,
  }));
  assert('Null stage falls back', !!edge2.stage);
  assert('Game starts without selection', edge2.state === 'playing');

  // ============================================================
  // RESULTS
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (gaps.length > 0) {
    console.log('\nGAPS FOUND:');
    for (const g of gaps) {
      console.log(`  ⚠️  ${g.label}`);
      console.log(`     ${g.description}`);
    }
  }

  if (jsErrors.length > 0) {
    const critical = jsErrors.filter(e => !e.includes('CORS') && !e.includes('content/'));
    if (critical.length > 0) {
      console.log('\nJS ERRORS (non-CORS):');
      for (const e of critical) console.log('  ', e.substring(0, 200));
    }
  }

  await browser.close();
  server.close();
}

run().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
