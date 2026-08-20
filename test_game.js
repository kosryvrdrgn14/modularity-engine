import { chromium } from 'playwright';

const SCREENSHOT_DIR = './screenshots';

async function runTests() {
  console.log('🎮 Starting Modularity Engine playtest...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  
  try {
    // Step 1: Load the game
    console.log('📸 Step 1: Loading game...');
    await page.goto('http://localhost:5173/game.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_loading.png` });
    console.log('   ✅ Game loaded');
    
    // Step 2: Check for canvas
    console.log('📸 Step 2: Checking canvas...');
    const canvas = await page.$('#game-canvas');
    console.log(`   Canvas found: ${canvas ? '✅' : '❌'}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_canvas.png` });
    
    // Step 3: Wait for game to start
    console.log('📸 Step 3: Waiting for game start...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_game_start.png` });
    
    // Step 4: Test movement (click somewhere)
    console.log('📸 Step 4: Testing click-to-move...');
    await page.mouse.click(800, 400);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_player_moved.png` });
    
    // Step 5: Wait for enemies to spawn
    console.log('📸 Step 5: Waiting for enemies...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05_enemies_spawned.png` });
    
    // Step 6: Move player around to collect items
    console.log('📸 Step 6: Moving player to collect items...');
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(400 + Math.random() * 400, 300 + Math.random() * 200);
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_gameplay.png` });
    
    // Step 7: Wait for level up
    console.log('📸 Step 7: Waiting for level up...');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07_level_up.png` });
    
    // Step 8: Press 1 to select upgrade
    console.log('📸 Step 8: Selecting upgrade...');
    await page.keyboard.press('1');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08_upgrade_selected.png` });
    
    // Step 9: Continue playing
    console.log('📸 Step 9: Continuing gameplay...');
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(400 + Math.random() * 400, 300 + Math.random() * 200);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09_mid_game.png` });
    
    // Step 10: Final state
    console.log('📸 Step 10: Final state...');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10_final.png` });
    
    // Report errors
    console.log('\n📊 Test Results:');
    console.log(`   Console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('   Errors:');
      errors.forEach(e => console.log(`     - ${e}`));
    }
    
    console.log('\n✅ Playtest complete! Screenshots saved to ./screenshots/');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png` });
  } finally {
    await browser.close();
  }
}

// Run tests
runTests().catch(console.error);
