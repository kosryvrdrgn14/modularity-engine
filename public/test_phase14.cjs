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
function assert(label, cond, detail) {
  if (cond) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ ${label}`); if (detail) console.log(`     ${detail}`); }
}
function gap(label, desc) { gaps.push({ label, desc }); console.log(`  ⚠️  GAP: ${label} — ${desc}`); }

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
  // 1. STAGE SELECTOR UI
  // ============================================================
  console.log('\n=== 1. STAGE SELECTOR UI ===');

  // Click DEV stage select
  await page.evaluate(() => {
    game.gameState.setState('title');
    game.titleMenu.show();
  });
  await page.waitForTimeout(500);

  const devBtn = await page.$('.menu-item[data-action="dev-stage"]');
  assert('DEV stage button exists', !!devBtn);
  if (devBtn) {
    await devBtn.click();
    await page.waitForTimeout(500);

    const overlay = await page.evaluate(() => {
      const ov = document.getElementById('dev-stage-overlay');
      if (!ov) return null;
      return {
        visible: ov.style.display !== 'none',
        hasStageButtons: ov.querySelectorAll('.dev-tier-btn').length,
        stageNames: Array.from(ov.querySelectorAll('[style*="color:#4FC3F7"]')).map(e => e.textContent.trim()),
        bossBadges: Array.from(ov.querySelectorAll('[style*="background:#3D1F4D"]')).map(e => e.textContent.trim()),
        waveBadges: Array.from(ov.querySelectorAll('[style*="background:#1a3310"]')).map(e => e.textContent.trim()),
      };
    });

    assert('Overlay visible', overlay?.visible);
    assert('6 tier buttons (2 stages × 3 tiers)', overlay?.hasStageButtons === 6, `Got ${overlay?.hasStageButtons}`);
    assert('Shows Graveyard name', overlay?.stageNames?.some(n => n.includes('Graveyard')));
    assert('Shows Extended name', overlay?.stageNames?.some(n => n.includes('Extended')));
    assert('Shows boss badges', overlay?.bossBadges?.length >= 2, `Got ${overlay?.bossBadges?.length}`);
    assert('Shows wave counts', overlay?.waveBadges?.length >= 2, `Got ${overlay?.waveBadges?.length}`);

    // Click a tier button and verify game starts
    await page.evaluate(() => {
      const btn = document.querySelector('.dev-tier-btn[data-stage="stage_graveyard_extended"][data-tier="highlight"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);

    const gameAfterClick = await page.evaluate(() => ({
      state: game.gameState.state,
      stage: game.dataManager.stages?.id,
      tier: game.gameManager.get('session.current_stage_tier'),
      bossTime: game._bossSpawnTime,
    }));
    assert('Game started after tier click', gameAfterClick.state === 'playing');
    assert('Extended stage loaded', gameAfterClick.stage === 'stage_graveyard_extended');
    assert('Highlight tier selected', gameAfterClick.tier === 'highlight');
    assert('Boss spawn at 540s', gameAfterClick.bossTime === 540);
  }

  // ============================================================
  // 2. ALL 6 COMBINATIONS
  // ============================================================
  console.log('\n=== 2. ALL 6 STAGE×TIER COMBINATIONS ===');

  const combos = [
    { stage: 'stage_graveyard', tier: 'quick', expectBoss: 120, expectWeapons: 3 },
    { stage: 'stage_graveyard', tier: 'standard', expectBoss: 240, expectWeapons: 3 },
    { stage: 'stage_graveyard', tier: 'highlight', expectBoss: 540, expectWeapons: 3 },
    { stage: 'stage_graveyard_extended', tier: 'quick', expectBoss: 120, expectWeapons: 3 },
    { stage: 'stage_graveyard_extended', tier: 'standard', expectBoss: 240, expectWeapons: 3 },
    { stage: 'stage_graveyard_extended', tier: 'highlight', expectBoss: 540, expectWeapons: 3 },
  ];

  for (const c of combos) {
    await page.evaluate(({s, t}) => {
      game.gameManager.set('session.selected_stage_id', s);
      game.gameManager.set('session.current_stage_tier', t);
      game.startGame();
    }, {s: c.stage, t: c.tier});
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => ({
      stage: game.dataManager.stages?.id,
      tier: game.gameManager.get('session.current_stage_tier'),
      bossTime: game._bossSpawnTime,
      weaponCount: game._currentStageWeapons?.length,
      playerHP: game.entityManager.getActive('player')[0]?.hp,
    }));

    assert(`${c.stage}/${c.tier} stage correct`, result.stage === c.stage);
    assert(`${c.stage}/${c.tier} boss at ${c.expectBoss}s`, result.bossTime === c.expectBoss, `Got ${result.bossTime}`);
    assert(`${c.stage}/${c.tier} weapons = ${c.expectWeapons}`, result.weaponCount === c.expectWeapons, `Got ${result.weaponCount}`);
    assert(`${c.stage}/${c.tier} player alive`, result.playerHP > 0);
  }

  // ============================================================
  // 3. GRAVEKEEPER BOSS SPAWN
  // ============================================================
  console.log('\n=== 3. GRAVEKEEPER BOSS SPAWN ===');

  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    game.gameManager.set('session.current_stage_tier', 'standard');
    game.startGame();
  });
  await page.waitForTimeout(500);

  // Run game forward to boss
  for (let i = 0; i < 250; i++) {
    await page.evaluate(() => game.update(1));
  }
  await page.waitForTimeout(1000);

  const gk = await page.evaluate(() => ({
    bossSpawned: game.spawnSystem.bossSpawned,
    bosses: game.entityManager.getActive('enemy').filter(e => e.isBoss).map(e => e.enemyData?.id),
    gameTime: Math.round(game.spawnSystem.gameTime),
  }));
  assert('Gravekeeper spawned', gk.bossSpawned);
  assert('Boss is gravekeeper', gk.bosses.includes('boss_gravekeeper'));

  // ============================================================
  // 4. ENEMY DATA INTEGRITY
  // ============================================================
  console.log('\n=== 4. ENEMY DATA INTEGRITY ===');

  const enemies = await page.evaluate(() => game.dataManager.enemies.map(e => ({
    id: e.id, type: e.type, hp: e.stats?.hp, dmg: e.stats?.damage,
  })));

  const expected = {
    zombie: { hp: 10, dmg: 5 }, bat: { hp: 5, dmg: 3 }, skeleton: { hp: 20, dmg: 8 },
    ghost: { hp: 15, dmg: 10 }, caster: { hp: 12, dmg: 8 }, rat: { hp: 6, dmg: 6 },
    brute: { hp: 40, dmg: 12 }, ghoul: { hp: 300, dmg: 18 },
    boss_gravekeeper: { hp: 1000, dmg: 15 }, boss_necromancer: { hp: 1200, dmg: 18 },
  };

  for (const e of enemies) {
    if (expected[e.id]) {
      assert(`${e.id} HP=${expected[e.id].hp}`, e.hp === expected[e.id].hp);
      assert(`${e.id} DMG=${expected[e.id].dmg}`, e.dmg === expected[e.id].dmg);
    }
  }

  // ============================================================
  // 5. SVG ASSET COVERAGE
  // ============================================================
  console.log('\n=== 5. SVG ASSET COVERAGE ===');

  const assetKeys = await page.evaluate(() => Object.keys(ASSET_MAP));
  const neededColors = ['#3B8A30','#6B3FA0','#C0392B','#8E44AD','#2E86C1','#8B6914','#2D4A1E','#5B2C6F','#6A0DAD','#4A0000'];
  for (const color of neededColors) {
    assert(`Asset enemy_square_${color}`, assetKeys.includes('enemy_square_' + color));
  }

  // ============================================================
  // 6. FILE SYNTAX CHECKS
  // ============================================================
  console.log('\n=== 6. FILE SYNTAX CHECKS ===');

  const files = [
    'data/embeddedData.js', 'data/assetMap.js', 'data/npcData.js',
    'data/locationTree.js', 'data/shopData.js', 'data/companionData.js',
    'engine/spawnSystem.js', 'engine/game.js', 'engine/titleMenu.js',
    'engine/dataManager.js',
  ];
  for (const f of files) {
    try {
      new Function(fs.readFileSync(path.join(__dirname, f), 'utf8'));
      assert(`${f} parses`);
    } catch (e) {
      assert(`${f} parses`, false, e.message.substring(0, 100));
    }
  }

  // ============================================================
  // 7. EDGE CASES
  // ============================================================
  console.log('\n=== 7. EDGE CASES ===');

  // Invalid stage fallback
  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'nonexistent');
    game.startGame();
  });
  await page.waitForTimeout(500);
  const edge1 = await page.evaluate(() => game.dataManager.stages?.id);
  assert('Invalid stage falls back', !!edge1);

  // Null stage fallback
  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', null);
    game.startGame();
  });
  await page.waitForTimeout(500);
  const edge2 = await page.evaluate(() => game.dataManager.stages?.id);
  assert('Null stage falls back', !!edge2);

  // ============================================================
  // 8. TIER MULTIPLIER VERIFICATION
  // ============================================================
  console.log('\n=== 8. TIER MULTIPLIER VERIFICATION ===');

  for (const tier of ['quick', 'standard', 'highlight']) {
    await page.evaluate(({t}) => {
      game.gameManager.set('session.selected_stage_id', 'stage_graveyard');
      game.gameManager.set('session.current_stage_tier', t);
      game.startGame();
    }, {t: tier});
    await page.waitForTimeout(300);

    const mults = await page.evaluate(() => ({
      hp: game.spawnSystem._tierHpMult,
      gold: game.spawnSystem._tierGoldMult,
    }));

    const expected = { quick: { hp: 0.8, gold: 0.8 }, standard: { hp: 1.0, gold: 1.0 }, highlight: { hp: 1.3, gold: 1.5 } };
    assert(`${tier} HP mult=${expected[tier].hp}`, mults.hp === expected[tier].hp, `Got ${mults.hp}`);
    assert(`${tier} Gold mult=${expected[tier].gold}`, mults.gold === expected[tier].gold, `Got ${mults.gold}`);
  }

  // ============================================================
  // 9. AUDIO & COMPANION SYSTEMS
  // ============================================================
  console.log('\n=== 9. SUPPORTING SYSTEMS ===');

  const systems = await page.evaluate(() => ({
    audio: !!game.audioManager && typeof game.audioManager.playMenuSound === 'function',
    companion: !!game.companionSystem,
    companionData: typeof COMPANION_DATA !== 'undefined' && COMPANION_DATA.dog !== undefined,
    starSystem: !!game.starSystem,
    frenzySystem: !!game.frenzySystem,
    farmingSystem: !!game.farmingSystem,
    sandboxSystem: !!game.sandboxSystem,
  }));
  assert('AudioManager functional', systems.audio);
  assert('CompanionSystem exists', systems.companion);
  assert('Dog companion in data', systems.companionData);
  assert('StarSystem exists', systems.starSystem);
  assert('FrenzySystem exists', systems.frenzySystem);
  assert('FarmingSystem exists', systems.farmingSystem);
  assert('SandboxSystem exists', systems.sandboxSystem);

  // ============================================================
  // 10. GAME OVER & RESTART
  // ============================================================
  console.log('\n=== 10. GAME OVER & RESTART ===');

  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard');
    game.gameManager.set('session.current_stage_tier', 'standard');
    game.startGame();
  });
  await page.waitForTimeout(500);

  // Kill player
  await page.evaluate(() => {
    const player = game.entityManager.getActive('player')[0];
    if (player) player.hp = 0;
    game.update(0.1);
  });
  await page.waitForTimeout(500);

  const goState = await page.evaluate(() => game.gameState.state);
  assert('Game over state after death', goState === 'gameOver');

  // Restart
  await page.evaluate(() => {
    game.gameManager.set('session.selected_stage_id', 'stage_graveyard_extended');
    game.gameManager.set('session.current_stage_tier', 'highlight');
    game.startGame();
  });
  await page.waitForTimeout(500);

  const restart = await page.evaluate(() => ({
    state: game.gameState.state,
    stage: game.dataManager.stages?.id,
    hp: game.entityManager.getActive('player')[0]?.hp,
  }));
  assert('Restart works', restart.state === 'playing');
  assert('Restart loads correct stage', restart.stage === 'stage_graveyard_extended');
  assert('Player HP restored', restart.hp === 100);

  // ============================================================
  // RESULTS
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (gaps.length > 0) {
    console.log('\nGAPS:');
    for (const g of gaps) console.log(`  ⚠️  ${g.label}: ${g.desc}`);
  }

  const critErrors = jsErrors.filter(e => !e.includes('CORS') && !e.includes('content/'));
  if (critErrors.length > 0) {
    console.log('\nJS ERRORS:');
    for (const e of critErrors) console.log('  ', e.substring(0, 200));
  }

  await browser.close();
  server.close();
}

run().catch(e => { console.error('CRASH:', e); process.exit(1); });
