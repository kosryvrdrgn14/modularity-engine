const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });
  
  const filePath = path.resolve(__dirname, 'public/game.html');
  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(2000);
  
  console.log('=== WEAPON UNLOCK DEBUG LOG ===\n');
  
  // Filter for weapon-related logs
  const weaponLogs = logs.filter(l => l.text.includes('[WeaponUnlock]') || l.text.includes('[W3]'));
  
  if (weaponLogs.length === 0) {
    console.log('No weapon unlock logs yet (level 1, no unlocks needed)');
  } else {
    weaponLogs.forEach(l => console.log(l.text));
  }
  
  // Simulate leveling up to 7 to test weapon unlocks
  console.log('\n=== SIMULATING LEVEL UP TO 7 ===\n');
  
  // Find the game object and force level ups
  const result = await page.evaluate(() => {
    // The game is not on window, so we need to manually trigger
    // Let's check what's on the console
    return {
      canvasExists: !!document.querySelector('canvas'),
      title: document.title,
    };
  });
  
  console.log('Game state:', result);
  
  // Check for any errors
  const errors = logs.filter(l => l.type === 'error');
  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log(e.text));
  }
  
  // Check all logs for clues
  console.log('\n=== ALL CONSOLE LOGS ===');
  logs.forEach(l => console.log(`[${l.type}] ${l.text}`));
  
  await browser.close();
})();
