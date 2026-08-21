const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  const filePath = path.resolve(__dirname, 'public/game.html');
  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(3000);
  
  // Check if game is loaded and expose game object
  const gameCheck = await page.evaluate(() => {
    // The game is in the script tag, not exposed globally
    // Let's check the canvas exists
    const canvas = document.querySelector('canvas');
    return {
      hasCanvas: !!canvas,
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      title: document.title,
    };
  });
  
  console.log('Game loaded:', gameCheck);
  
  // The game object isn't on window. We need to check the source code directly.
  // Let's read the game.html and analyze the upgrade handling code
  console.log('\n=== ANALYSIS OF UPGRADE INPUT HANDLING ===');
  
  const fs = require('fs');
  const html = fs.readFileSync(filePath, 'utf8');
  
  // Check for keyboard handler for number keys
  const hasDigit1 = html.includes('Digit1') || html.includes('Numpad1');
  const hasDigit2 = html.includes('Digit2') || html.includes('Numpad2');
  const hasDigit3 = html.includes('Digit3') || html.includes('Numpad3');
  
  console.log('Has Digit1 handler:', hasDigit1);
  console.log('Has Digit2 handler:', hasDigit2);
  console.log('Has Digit3 handler:', hasDigit3);
  
  // Check for mouse click handler on upgrade cards
  const hasClickUpgrade = html.includes('click.*upgrade') || html.includes('upgrade.*click') || html.includes('selectOption');
  console.log('Has click upgrade handler:', hasClickUpgrade);
  
  // Find the keydown handler
  const keydownMatch = html.match(/addEventListener\('keydown'[^}]+\}/s);
  if (keydownMatch) {
    console.log('\n=== KEYDOWN HANDLER CODE ===');
    console.log(keydownMatch[0].substring(0, 500));
  }
  
  // Find the levelUp event handler
  const levelUpMatch = html.match(/eventBus\.on\('levelUp'[^}]+\}/s);
  if (levelUpMatch) {
    console.log('\n=== LEVEL UP EVENT HANDLER ===');
    console.log(levelUpMatch[0].substring(0, 500));
  }
  
  // Check for canvas click handler that handles upgrade selection
  const canvasClickMatch = html.match(/canvas.*click|addEventListener.*click[^}]*upgrade/s);
  console.log('\nCanvas click upgrade handler found:', !!canvasClickMatch);
  
  // Verify the bug
  console.log('\n=== BUG VERIFICATION ===');
  if (!hasDigit1 && !hasDigit2 && !hasDigit3) {
    console.log('❌ BUG CONFIRMED: No keyboard handler for number keys (1/2/3) during levelUp state');
  }
  
  // Check if game state transition from levelUp to playing exists on upgrade selection
  const hasLevelUpToPlaying = html.includes("setState('playing')") || html.includes("setState(\"playing\")");
  const levelUpContext = html.match(/levelUp[\s\S]{0,200}setState\('playing'\)/g);
  console.log('Has levelUp → playing transition:', !!levelUpContext);
  if (levelUpContext) {
    console.log('LevelUp → playing contexts found:', levelUpContext.length);
  }
  
  // Find where levelUp state is checked for upgrade selection
  const upgradeSelectionCode = html.match(/isLevelUp[\s\S]{0,300}/g);
  if (upgradeSelectionCode) {
    console.log('\n=== isLevelUp USAGE ===');
    upgradeSelectionCode.forEach((code, i) => {
      console.log(`Context ${i + 1}:`, code.substring(0, 200));
    });
  }
  
  await page.screenshot({ path: 'screenshots/upgrade_bug_test.png' });
  
  await browser.close();
})();
