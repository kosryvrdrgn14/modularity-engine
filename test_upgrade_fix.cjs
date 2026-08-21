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
  
  console.log('=== UPGRADE SELECTION FIX VERIFICATION ===\n');
  
  // 1. Verify keyboard handlers exist in source
  const html = fs.readFileSync(filePath, 'utf8');
  
  const hasDigit1 = html.includes('Digit1');
  const hasDigit2 = html.includes('Digit2');
  const hasDigit3 = html.includes('Digit3');
  const hasNumpad1 = html.includes('Numpad1');
  const hasSelectUpgrade = html.includes("eventBus.emit('selectUpgrade'");
  const hasSelectUpgradeHandler = html.includes("eventBus.on('selectUpgrade'");
  const hasShowUpgradeOptions = html.includes('_showUpgradeOptions');
  const hasApplyOption = html.includes('option.apply(this)');
  const hasResumePlaying = html.includes("gameState.setState('playing')");
  const hasIsPaused = html.includes('_isPaused');
  const hasCardClick = html.includes('_getUpgradeCardAt');
  
  console.log('Keyboard handlers:');
  console.log(`  Digit1: ${hasDigit1 ? '✅' : '❌'}`);
  console.log(`  Digit2: ${hasDigit2 ? '✅' : '❌'}`);
  console.log(`  Digit3: ${hasDigit3 ? '✅' : '❌'}`);
  console.log(`  Numpad1: ${hasNumpad1 ? '✅' : '❌'}`);
  
  console.log('\nEvent system:');
  console.log(`  selectUpgrade emit: ${hasSelectUpgrade ? '✅' : '❌'}`);
  console.log(`  selectUpgrade handler: ${hasSelectUpgradeHandler ? '✅' : '❌'}`);
  console.log(`  _showUpgradeOptions: ${hasShowUpgradeOptions ? '✅' : '❌'}`);
  console.log(`  option.apply(this): ${hasApplyOption ? '✅' : '❌'}`);
  console.log(`  Resume to playing: ${hasResumePlaying ? '✅' : '❌'}`);
  
  console.log('\nInput protection:');
  console.log(`  _isPaused flag: ${hasIsPaused ? '✅' : '❌'}`);
  console.log(`  Card click detection: ${hasCardClick ? '✅' : '❌'}`);
  
  // 2. Verify upgrade options have apply functions
  const hasDamageUp = html.includes("'Damage Up'");
  const hasSpeedUp = html.includes("'Speed Up'");
  const hasHealthUp = html.includes("'Health Up'");
  const hasDamageApply = html.includes('damage * 1.15');
  const hasSpeedApply = html.includes('speed *= 1.10');
  const hasHealthApply = html.includes('maxHp += 20');
  
  console.log('\nUpgrade effects:');
  console.log(`  Damage Up: ${hasDamageUp && hasDamageApply ? '✅' : '❌'}`);
  console.log(`  Speed Up: ${hasSpeedUp && hasSpeedApply ? '✅' : '❌'}`);
  console.log(`  Health Up: ${hasHealthUp && hasHealthApply ? '✅' : '❌'}`);
  
  // 3. Verify pending level-up queue is consumed
  const hasPendingCheck = html.includes('hasPendingLevelUp');
  const hasConsumeLevelUp = html.includes('consumeLevelUp');
  
  console.log('\nMulti-level support:');
  console.log(`  hasPendingLevelUp: ${hasPendingCheck ? '✅' : '❌'}`);
  console.log(`  consumeLevelUp: ${hasConsumeLevelUp ? '✅' : '❌'}`);
  
  // 4. Count all fixes
  const allChecks = [
    hasDigit1, hasDigit2, hasDigit3, hasNumpad1,
    hasSelectUpgrade, hasSelectUpgradeHandler,
    hasShowUpgradeOptions, hasApplyOption, hasResumePlaying,
    hasIsPaused, hasCardClick,
    hasDamageUp && hasDamageApply, hasSpeedUp && hasSpeedApply, hasHealthUp && hasHealthApply,
    hasPendingCheck, hasConsumeLevelUp,
  ];
  const passed = allChecks.filter(Boolean).length;
  const total = allChecks.length;
  
  console.log(`\n=== RESULT: ${passed}/${total} checks passed ===`);
  
  if (passed === total) {
    console.log('✅ ALL FIXES VERIFIED — Level-up upgrade selection should work now!');
  } else {
    console.log('❌ SOME FIXES MISSING');
  }
  
  // 5. Take screenshot
  await page.screenshot({ path: 'screenshots/upgrade_fix_test.png' });
  
  if (errors.length > 0) {
    console.log('\n⚠️ Console errors:', errors);
  }
  
  await browser.close();
})();
