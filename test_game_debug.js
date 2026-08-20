import { chromium } from 'playwright';

async function runDebugTest() {
  console.log('🔍 Debug test starting...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  // Capture all console output
  page.on('console', msg => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));
  
  try {
    console.log('1. Loading game...');
    await page.goto('http://localhost:5173/game.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    console.log('2. Checking DOM elements...');
    const canvas = await page.$('#game-canvas');
    const loading = await page.$('#loading-screen');
    console.log(`   Canvas: ${canvas ? 'found' : 'NOT FOUND'}`);
    console.log(`   Loading screen: ${loading ? 'found' : 'NOT FOUND'}`);
    
    console.log('3. Checking canvas size...');
    const canvasSize = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      return c ? { width: c.width, height: c.height, display: c.style.display } : null;
    });
    console.log(`   Canvas size: ${JSON.stringify(canvasSize)}`);
    
    console.log('4. Checking if Game class exists...');
    const gameExists = await page.evaluate(() => typeof Game !== 'undefined');
    console.log(`   Game class: ${gameExists ? 'exists' : 'NOT FOUND'}`);
    
    console.log('5. Checking game state...');
    const gameState = await page.evaluate(() => {
      if (typeof game !== 'undefined') {
        return {
          state: game.gameState?.state,
          playerExists: !!game.player,
          entityCount: game.entityManager?.entities?.length || 0
        };
      }
      return null;
    });
    console.log(`   Game state: ${JSON.stringify(gameState)}`);
    
    console.log('6. Waiting for game to initialize...');
    await page.waitForTimeout(3000);
    
    console.log('7. Taking screenshot...');
    await page.screenshot({ path: 'screenshots/debug_01.png' });
    
    console.log('8. Clicking to move player...');
    await page.mouse.click(640, 360);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/debug_02.png' });
    
    console.log('9. Checking entity count after wait...');
    const entityCount = await page.evaluate(() => {
      if (typeof game !== 'undefined') {
        return game.entityManager?.entities?.length || 0;
      }
      return 0;
    });
    console.log(`   Entities: ${entityCount}`);
    
    console.log('10. Waiting more for enemies...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/debug_03.png' });
    
    const finalCount = await page.evaluate(() => {
      if (typeof game !== 'undefined') {
        return game.entityManager?.entities?.length || 0;
      }
      return 0;
    });
    console.log(`   Final entities: ${finalCount}`);
    
    console.log('\n✅ Debug test complete!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await page.screenshot({ path: 'screenshots/debug_error.png' });
  } finally {
    await browser.close();
  }
}

runDebugTest().catch(console.error);
