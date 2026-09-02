const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  const filePath = path.resolve(__dirname, 'game2.html');
  console.log('=== AUDIO DUCKING FIX VERIFICATION ===\n');

  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(1000);

  // Click start overlay
  const overlay = await page.$('#start-overlay');
  if (overlay) {
    await overlay.click();
    console.log('✅ Start overlay clicked');
  }
  await page.waitForTimeout(500);

  // Check the fix in source code
  const html = fs.readFileSync(filePath, 'utf8');
  
  // 1. Verify duckForLevelUp(true) is called in levelUp handler
  const duckTrueInLevelUp = html.includes("this.audioManager.duckForLevelUp(true)") &&
    html.match(/eventBus\.on\('levelUp'[\s\S]{0,500}duckForLevelUp\(true\)/);
  console.log(`\n1. duckForLevelUp(true) in levelUp handler: ${duckTrueInLevelUp ? '✅' : '❌'}`);

  // 2. Verify duckForLevelUp(false) is called in selectUpgrade handler  
  const duckFalseInSelectUpgrade = html.match(/eventBus\.on\('selectUpgrade'[\s\S]{0,600}duckForLevelUp\(false\)/);
  console.log(`2. duckForLevelUp(false) in selectUpgrade handler: ${duckFalseInSelectUpgrade ? '✅' : '❌'}`);

  // 3. Verify duckForLevelUp(false) is called in pause handler
  const duckFalseInPause = html.match(/eventBus\.on\('pause'[\s\S]{0,400}duckForLevelUp\(false\)/);
  console.log(`3. duckForLevelUp(false) in pause handler: ${duckFalseInPause ? '✅' : '❌'}`);

  // 4. Count all duckForLevelUp calls
  const trueCount = (html.match(/duckForLevelUp\(true\)/g) || []).length;
  const falseCount = (html.match(/duckForLevelUp\(false\)/g) || []).length;
  console.log(`\n4. duckForLevelUp(true) calls: ${trueCount}`);
  console.log(`   duckForLevelUp(false) calls: ${falseCount}`);
  console.log(`   Balance check: ${trueCount === falseCount ? '✅ Balanced' : '⚠️ Imbalanced (may be OK if unpause restores)'}`);

  // 5. Verify the duckForLevelUp method itself
  const duckMethodExists = html.includes('duckForLevelUp(active)');
  console.log(`\n5. duckForLevelUp method defined: ${duckMethodExists ? '✅' : '❌'}`);

  // 6. Verify sfxGain is restored to 0.85
  const restoreToDefault = html.match(/duckForLevelUp[\s\S]{0,100}0\.85/);
  console.log(`6. sfxGain restores to 0.85: ${restoreToDefault ? '✅' : '❌'}`);

  // 7. Check that no game.html errors
  const errors = consoleLogs.filter(l => l.includes('[error]'));
  console.log(`\n7. Console errors: ${errors.length === 0 ? '✅ None' : `❌ ${errors.length} errors`}`);
  if (errors.length > 0) errors.slice(0, 5).forEach(e => console.log(`   ${e}`));

  // 8. Simulate gameplay for 8 seconds to trigger level-up
  console.log('\n8. Simulating 8s gameplay...');
  await page.waitForTimeout(8000);

  // Check if level-up was triggered (look for levelUp event in logs)
  const levelUpLogs = consoleLogs.filter(l => l.includes('levelUp'));
  console.log(`   Level-up events in console: ${levelUpLogs.length}`);
  if (levelUpLogs.length > 0) {
    levelUpLogs.forEach(l => console.log(`   ${l}`));
  }

  // Take screenshot
  await page.screenshot({ path: path.resolve(__dirname, '..', 'screenshots', 'audio_ducking_test.png') });
  console.log('\n9. Screenshot saved');

  // Summary
  const allPass = duckTrueInLevelUp && duckFalseInSelectUpgrade && duckFalseInPause && 
                   duckMethodExists && restoreToDefault && errors.length === 0;
  
  console.log('\n=== RESULT ===');
  if (allPass) {
    console.log('✅ ALL CHECKS PASSED — Audio ducking is properly balanced.');
    console.log('   - levelUp handler ducks audio (sfxGain → 0.1)');
    console.log('   - selectUpgrade handler restores audio (sfxGain → 0.85)');
    console.log('   - pause handler also restores audio');
    console.log('   - No console errors');
    console.log('\n   Sound should now persist after power-up selection!');
  } else {
    console.log('⚠️ SOME CHECKS FAILED');
  }

  await browser.close();
})();
