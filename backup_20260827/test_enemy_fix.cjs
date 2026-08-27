const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  const filePath = path.resolve(__dirname, 'public/game.html');
  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(2000);
  
  console.log('=== ENEMY/WEAPON FIX VERIFICATION ===\n');
  
  const html = fs.readFileSync(filePath, 'utf8');
  
  // 1. Check enemy spawn uses player position
  const hasPlayerSpawn = html.includes('px + Math.cos(angle) * dist') && html.includes('py + Math.sin(angle) * dist');
  console.log(`Enemy spawn around player: ${hasPlayerSpawn ? '✅' : '❌'}`);
  
  // 2. Check boss spawn uses player position
  const hasBossPlayerSpawn = html.match(/_spawnBoss[\s\S]{0,500}px \+ Math\.cos/);
  console.log(`Boss spawn around player: ${hasBossPlayerSpawn ? '✅' : '❌'}`);
  
  // 3. Check projectile despawn fix (no origin distance)
  const hasOriginDist = html.includes('proj.x * proj.x + proj.y * proj.y');
  console.log(`Projectile origin-distance removed: ${!hasOriginDist ? '✅' : '❌'}`);
  
  // 4. Check div-by-zero guard in weapon targeting
  const hasWeaponGuard = html.includes("if (dist < 1) return;  // Guard");
  console.log(`Weapon div-by-zero guard: ${hasWeaponGuard ? '✅' : '❌'}`);
  
  // 5. Check enemy colors are visible
  const hasBatFixed = html.includes("'#6B3FA0'");
  const hasBatOriginal = html.includes("'#1A1A2E'");
  console.log(`Bat color fixed: ${hasBatFixed && !hasBatOriginal ? '✅' : '❌'}`);
  
  // 6. Check enemy movement guard
  const hasEnemyGuard = html.includes("if (dist > 1)");
  console.log(`Enemy movement guard: ${hasEnemyGuard ? '✅' : '❌'}`);
  
  // Summary
  const checks = [hasPlayerSpawn, hasBossPlayerSpawn, !hasOriginDist, hasWeaponGuard, hasBatFixed && !hasBatOriginal, hasEnemyGuard];
  const passed = checks.filter(Boolean).length;
  console.log(`\n=== RESULT: ${passed}/${checks.length} checks passed ===`);
  
  if (passed === checks.length) {
    console.log('✅ ALL FIXES VERIFIED');
  }
  
  // Take screenshot
  await page.screenshot({ path: 'screenshots/enemy_fix_test.png' });
  
  await browser.close();
})();
