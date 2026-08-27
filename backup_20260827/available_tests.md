# Modularity Engine — Available Tests

> **Version:** 1.0
> **Last Updated:** 2026-08-19
> **Platform:** Freebuff Web (Ubuntu 22.04, Node 22.23.1)
> **Reference:** `vs_plan.md`, `vs_prog.md`, `vs_colors.md`

---

## Table of Contents

1. [Platform Environment](#platform-environment)
2. [Testing Tools Available](#testing-tools-available)
3. [Headless Browser Testing](#headless-browser-testing)
4. [Automated Test Types](#automated-test-types)
5. [Screenshot & Visual Testing](#screenshot--visual-testing)
6. [Performance Testing](#performance-testing)
7. [Game Logic Testing](#game-logic-testing)
8. [Audio Testing](#audio-testing)
9. [Input Testing](#input-testing)
10. [CI/CD Integration](#cicd-integration)
11. [Test Commands Reference](#test-commands-reference)

---

## Platform Environment

| Property | Value |
|---|---|
| OS | Ubuntu 22.04.5 LTS (Jammy Jellyfish) |
| Kernel | 6.8.0-107-generic x86_64 |
| Node.js | 22.23.1 |
| npm | 10.9.8 |
| Bun | 1.3.14 |
| Chrome | 152.0.7977.42 (Google Chrome for Testing) |
| Playwright | 1.62.1 |
| Puppeteer | 25.8.0 |
| Package Manager | Bun (primary), npm/pnpm/yarn available |

### Chrome Binary Location

```
/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome
```

### System Dependencies Installed

- libglib2.0-0, libnss3, libatk1.0-0, libcups2, libdrm2
- libxkbcommon0, libxcomposite1, libxdamage1, libxrandr2
- libgbm1, libpango-1.0-0, libcairo2, libasound2, libatspi2.0-0
- libatk-bridge2.0-0, libgtk-3-0, libx11-xcb1, libxcb-dri3-0
- libxss1, libxtst6, fonts-liberation

### Known Limitations

- **No display server** — Chrome runs headless only (no X11/Wayland)
- **dbus warnings** — Cosmetic errors about system bus; do not affect functionality
- **No GPU acceleration** — Software rendering only; canvas performance may differ slightly from real hardware
- **No audio output** — Can test audio logic and Web Audio API creation, but cannot verify actual sound playback

---

## Testing Tools Available

### Playwright (Recommended for UI Testing)

```bash
npx playwright --version        # 1.62.1
npx playwright install chromium # One-time browser install
npx playwright test             # Run test suite
```

**Pros:**
- Multi-browser support (Chromium, Firefox, WebKit)
- Built-in assertions, tracing, and reporting
- Auto-wait for elements, network idle detection
- Screenshot and video recording built-in
- Parallel test execution

**Cons:**
- Heavier dependency footprint
- Requires browser installation step

### Puppeteer (Recommended for Simple Scripts)

```bash
npx puppeteer --version         # 25.8.0
node script.js                  # Direct execution
```

**Pros:**
- Lighter than Playwright
- Direct Chrome control
- Good for custom test scripts
- Chrome already cached

**Cons:**
- Chromium only
- More manual setup for assertions

### Node.js Built-in Test Runner

```bash
node --test test/*.js           # Node 22 built-in test runner
```

**Pros:**
- Zero dependencies
- Fast for unit tests
- Built into Node 22

**Cons:**
- Limited assertions library
- No browser integration

### Bun Test Runner

```bash
bun test                        # Bun's built-in test runner
bun test --watch                # Watch mode
```

**Pros:**
- Extremely fast
- Jest-compatible API
- Built into Bun

**Cons:**
- May have edge case differences from Jest

---

## Headless Browser Testing

### Quick Verification Command

```bash
/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome \
  --headless --no-sandbox \
  --screenshot=/tmp/test.png \
  --window-size=800,600 \
  https://example.com
```

### Puppeteer Headless Script Example

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: '/tmp/game_screenshot.png' });
  
  await browser.close();
})();
```

### Playwright Headless Script Example

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: '/tmp/game_screenshot.png' });
  
  await browser.close();
})();
```

---

## Automated Test Types

### 1. Unit Tests

**What:** Test individual functions and modules in isolation.

**Applicable to:**
- XP curve calculations
- Weapon damage formulas
- Spawn rate calculations
- Drop rate probability logic
- Collision detection math
- Entity state management
- Combo stepping / variance engine

**Framework:** Bun test or Node test runner

**Example:**
```javascript
import { describe, it, expect } from 'bun:test';
import { calculateXPToNext } from '../src/systems/leveling';

describe('XP Curve', () => {
  it('returns correct XP for level 1→2', () => {
    expect(calculateXPToNext(1)).toBe(5);
  });
  
  it('returns correct XP for level 14+', () => {
    // Formula: floor(375 * 1.3^(N-14))
    expect(calculateXPToNext(14)).toBe(375);
    expect(calculateXPToNext(15)).toBe(488); // floor(375 * 1.3)
  });
});
```

### 2. Integration Tests

**What:** Test how modules work together.

**Applicable to:**
- Weapon system + collision system interaction
- Spawn system + entity manager interaction
- Pickup collection + leveling system
- Damage system + health management
- Power-up activation + weapon upgrade flow

**Framework:** Bun test or Playwright

### 3. Visual Regression Tests

**What:** Capture screenshots and compare against baseline images to detect visual changes.

**Applicable to:**
- HUD layout and positioning
- Entity rendering (player, enemies, boss)
- Pickup and power-up visuals
- Level-up screen overlay
- Game over screen
- Boss health bar
- Damage numbers
- Color accuracy

**Framework:** Playwright (built-in screenshot comparison)

**Workflow:**
1. Capture baseline screenshots at key game states
2. After code changes, capture new screenshots
3. Diff images pixel-by-pixel
4. Flag differences above threshold (e.g., >0.1% pixel difference)

**Key Screenshots to Capture:**
| Screenshot | Timestamp | Purpose |
|---|---|---|
| Game Start | 0:00 | Verify player, HUD, clean arena |
| Early Combat | 0:30 | Verify zombies spawning, weapon firing |
| First Level-Up | ~0:10 | Verify level-up screen overlay |
| Mid-Game Chaos | 2:00 | Verify multiple weapons, enemy density |
| Power-Up Drop | ~2:30 | Verify power-up visual on ground |
| Boss Warning | 3:50 | Verify warning text, screen dimming |
| Boss Fight | 4:00 | Verify boss visual, health bar |
| Boss Death | ~4:15 | Verify loot drops, victory effect |
| Game Over | Any death | Verify stats screen |
| Full Run (Survived) | 5:00 | Verify survived screen, final stats |

### 4. Performance Tests

**What:** Measure frame rate, memory usage, and entity counts under load.

**Applicable to:**
- FPS during heavy enemy density (150+ entities)
- Memory usage over 5-minute run
- Entity pool recycling efficiency
- Collision detection performance
- Canvas rendering performance
- Audio system overhead

**Metrics to Track:**
| Metric | Target | Alert Threshold |
|---|---|---|
| FPS | 60 | <30 |
| Frame Time | <16.67ms | >33ms |
| Entity Count | <200 enemies | >200 |
| Pickup Count | <500 | >500 |
| Memory Usage | <256MB | >512MB |
| Audio Nodes | <16 concurrent | >16 |

**Method:** Inject performance monitoring via Puppeteer, log metrics to file.

### 5. Gameplay Tests (Automated Play)

**What:** Simulate a full 5-minute run using scripted inputs and verify outcomes.

**Applicable to:**
- Full game loop validation
- Level-up frequency matches design
- Weapon unlock timing
- Boss spawn at 4:00
- Boss defeat within time limit
- Victory/defeat screen triggers
- Drop rate validation (statistical)
- XP curve progression

**Method:**
1. Launch game in headless Chrome
2. Simulate WASD movement (random or patterned)
3. Let auto-attack handle combat
4. Simulate level-up card selections
5. Log game state at 30-second intervals
6. Verify final stats against design targets

**Input Simulation:**
```javascript
// Simulate WASD movement
await page.keyboard.down('KeyW');
await page.waitForTimeout(500);
await page.keyboard.up('KeyW');
await page.keyboard.down('KeyD');
await page.waitForTimeout(300);
await page.keyboard.up('KeyD');

// Simulate level-up selection (press 1, 2, or 3)
await page.keyboard.press('Digit1');
```

### 6. Collision Detection Tests

**What:** Verify entity collision logic works correctly.

**Applicable to:**
- Player-enemy contact damage
- Projectile-enemy hits
- Pickup collection range
- Obstacle collision
- Boss attack hitboxes
- Screen wipe范围
- Magnet attraction range

**Method:** Unit tests with known positions and expected outcomes.

### 7. Audio Logic Tests

**What:** Verify Web Audio API setup and sound trigger logic (not actual playback).

**Applicable to:**
- AudioContext creation
- OscillatorNode configuration (waveform, frequency)
- GainNode envelope (attack, decay, release)
- Sound trigger conditions
- Combo stepping index advancement
- Volume ducking logic
- Sound priority system
- Micro-tuning jitter range

**Limitation:** Cannot verify actual audio output in headless Chrome. Tests confirm logic only.

### 8. Data Integrity Tests

**What:** Verify JSON content files load correctly and match schemas.

**Applicable to:**
- `characters.json` — all required fields present
- `weapons.json` — upgrade tables complete, power spikes defined
- `enemies.json` — all 5 types + boss, drop tables valid
- `stages.json` — wave timeline valid, spawn rates reasonable
- `pickups.json` — power-up definitions complete
- `leveling.json` — XP curve data matches design

**Method:** Schema validation with Zod or JSON Schema.

### 9. Cross-Browser Tests

**What:** Verify the game works across different browsers.

**Applicable to:**
- Chromium (primary — Playwright)
- Firefox (via Playwright)
- WebKit/Safari (via Playwright)

**Note:** Chrome is the primary target for the prototype. Cross-browser testing is optional for V1.

### 10. Responsive Layout Tests

**What:** Verify the game renders correctly at different viewport sizes.

**Applicable to:**
- Minimum supported: 800×600
- Standard: 1280×720
- Wide: 1920×1080
- Mobile aspect: 375×667 (portrait)

**Method:** Playwright viewport resizing + screenshot comparison.

### 11. Memory Leak Tests

**What:** Detect memory growth over extended play sessions.

**Applicable to:**
- Entity pool exhaustion
- Audio node accumulation
- Event listener cleanup
- Canvas context retention
- Pickup despawn logic

**Method:** Monitor `performance.memory` over 5+ minute runs, flag unbounded growth.

### 12. Save State Tests (V2+)

**What:** Verify game state persistence (if implemented in future versions).

**Applicable to:**
- Level progress
- Gold accumulation
- Unlock status
- Settings

**Note:** Not applicable to V1 prototype (no persistence).

---

## Screenshot & Visual Testing

### Capture Locations

| File Path | Contents |
|---|---|
| `/tmp/test_screenshot.png` | Single page capture |
| `/tmp/game_screenshots/` | Multi-state captures |
| `/tmp/baseline/` | Reference images for regression |
| `/tmp/diffs/` | Pixel diff output |

### Screenshot Commands

```bash
# Single screenshot via Chrome CLI
/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome \
  --headless --no-sandbox \
  --screenshot=/tmp/game.png \
  --window-size=1280,720 \
  http://localhost:5173

# Puppeteer script screenshot
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({headless:'new', executablePath:'/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome', args:['--no-sandbox']});
  const p = await b.newPage();
  await p.setViewport({width:1280,height:720});
  await p.goto('http://localhost:5173');
  await p.screenshot({path:'/tmp/game.png', fullPage:true});
  await b.close();
})();
"
```

---

## Performance Testing

### Metrics Collection

```javascript
// Inject into game page via Puppeteer
const metrics = await page.evaluate(() => {
  return {
    fps: window.__gameMetrics?.fps || 0,
    entityCount: window.__gameMetrics?.entityCount || 0,
    memoryUsed: performance.memory?.usedJSHeapSize || 0,
    memoryTotal: performance.memory?.jsHeapSizeLimit || 0
  };
});
```

### Performance Test Script Outline

1. Launch game in headless Chrome
2. Inject performance monitoring hook
3. Simulate 5 minutes of gameplay
4. Sample metrics every 5 seconds
5. Calculate average, min, max for each metric
6. Compare against targets in `vs_prog.md`
7. Flag any threshold violations

---

## Game Logic Testing

### Test Coverage Targets

| Module | Test Type | Priority |
|---|---|---|
| XP Curve | Unit | High |
| Weapon Damage | Unit | High |
| Spawn System | Unit + Integration | High |
| Collision Detection | Unit | High |
| Drop Rate Logic | Unit + Statistical | Medium |
| Level-Up Selection | Unit | Medium |
| Boss Mechanics | Integration | High |
| Combo Stepping | Unit | Medium |
| Wave Timeline | Integration | Medium |
| Game State Machine | Integration | High |

---

## Audio Testing

### What Can Be Tested

| Test | Method | Feasibility |
|---|---|---|
| AudioContext creation | Unit test | ✅ Yes |
| Oscillator configuration | Unit test | ✅ Yes |
| Frequency calculations | Unit test | ✅ Yes |
| Gain envelope timing | Unit test | ✅ Yes |
| Combo stepping logic | Unit test | ✅ Yes |
| Sound trigger conditions | Unit test | ✅ Yes |
| Volume ducking logic | Unit test | ✅ Yes |
| Actual sound playback | Browser test | ⚠️ Headless only |
| Audio quality | Manual | ❌ Requires speakers |
| Music transitions | Manual | ❌ Requires playback |

---

## Input Testing

### Keyboard Mapping

| Key | Action | Test Method |
|---|---|---|
| W / ArrowUp | Move up | Simulate keydown |
| A / ArrowLeft | Move left | Simulate keydown |
| S / ArrowDown | Move down | Simulate keydown |
| D / ArrowRight | Move right | Simulate keydown |
| 1 | Select level-up option 1 | Simulate keypress |
| 2 | Select level-up option 2 | Simulate keypress |
| 3 | Select level-up option 3 | Simulate keypress |
| Escape | Pause menu | Simulate keypress |

### Touch Input (V2+)

| Gesture | Action | Test Method |
|---|---|---|
| Touch drag | Movement | Emulate touch events |
| Tap | UI interaction | Emulate touch events |

---

## CI/CD Integration

### Recommended Pipeline

```yaml
# Example: GitHub Actions or similar
stages:
  - lint          # ESLint, Prettier
  - typecheck     # tsc --noEmit
  - unit          # bun test
  - integration   # Playwright tests
  - visual        # Screenshot regression
  - performance   # FPS/memory benchmarks
```

### Pre-Commit Checks

1. `bun run lint` — Code style
2. `bun tsc -b --noEmit` — Type checking
3. `bun test` — Unit tests
4. `bun convex dev --once` — Convex codegen (if applicable)

### Post-Build Checks

1. Screenshot baseline capture
2. Visual regression diff
3. Performance benchmark run
4. Full 5-minute gameplay test

---

## Test Commands Reference

### Quick Commands

```bash
# Type checking
bun tsc -b --noEmit

# Unit tests
bun test

# Unit tests (watch mode)
bun test --watch

# Lint
bun run lint

# Format
bun run format

# Build check (no output)
tsc --noEmit

# Convex codegen + typecheck
bun convex dev --once && bun tsc -b --noEmit
```

### Headless Chrome

```bash
# Screenshot
/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome \
  --headless --no-sandbox \
  --screenshot=/tmp/screenshot.png \
  --window-size=1280,720 \
  http://localhost:5173

# Version check
/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome --version
```

### Playwright

```bash
# Install browsers (one-time)
npx playwright install chromium

# Run tests
npx playwright test

# Run specific test
npx playwright test tests/visual.spec.ts

# Generate report
npx playwright show-report
```

### Puppeteer

```bash
# Run script
node test_script.js

# Quick screenshot
node -e "const p=require('puppeteer');(async()=>{const b=await p.launch({headless:'new',executablePath:'/home/daytona/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome',args:['--no-sandbox']});const pg=await b.newPage();await pg.setViewport({width:1280,height:720});await pg.goto('http://localhost:5173');await pg.screenshot({path:'/tmp/test.png'});await b.close();})()"
```

---

## Testing Priority (V1 Prototype)

| Priority | Test Type | Why |
|---|---|---|
| **Critical** | Type checking | Catches compile errors before runtime |
| **Critical** | Unit tests (XP, damage, spawn) | Core game math must be correct |
| **High** | Visual regression | Verify shapes, colors, layouts match design |
| **High** | Performance monitoring | Ensure 60 FPS with 200 entities |
| **High** | Gameplay automation | Verify 5-minute loop works end-to-end |
| **Medium** | Collision tests | Ensure hitboxes work correctly |
| **Medium** | Audio logic tests | Verify sound triggers fire at right times |
| **Medium** | Responsive layout | Verify minimum 800×600 support |
| **Low** | Cross-browser | Chrome only is acceptable for V1 |
| **Low** | Memory leak detection | Important for extended play, less for 5-min runs |

---

*End of available_tests.md — Version 1*
