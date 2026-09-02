# Lessons Learned — Modularity Engine

**Project:** Vampire Survivors Prototype
**Period:** August 20–21, 2026
**Purpose:** Prevent recurring mistakes and establish testing standards

---

## Part 1: All Bugs Found (30)

### Category A: Broken Event Pipelines

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 1 | Level-up upgrade selection stuck | No keyboard/click handlers for 1/2/3 | Added handlers + event wiring |
| 9 | W2/W3 weapons never unlock | `unlockWeapon()` defined but never called | Added `_checkWeaponUnlocks()` on level-up |
| 13 | Game freeze on game over | `triggerGameOver()` never called `showEndScreen()` | Added `_handleGameOver()` |
| 14 | Boss death no victory | `bossDeath` event never emitted | Added emission in `DamageSystem` |
| 16 | Damage upgrade no effect | Modified `player.stats.damage` but weapons read weapon data | Changed to `player.damageMultiplier` |
| 17 | Crits never proc from weapons | Passed `{ stats: {} }` as damage source | Passed `player.stats` instead |

### Category B: Broken Game Logic

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 2 | Enemies spawn at world origin | Spawn position missing player offset | Added `player.x + offset` |
| 4 | Projectiles despawn instantly | Used distance from origin (0,0) | Changed to `distanceTraveled` |
| 5 | Div-by-zero in weapon targeting | No guard for `dist === 0` | Added `if (dist < 1) return` |
| 6 | Div-by-zero in enemy movement | No guard for `dist === 0` | Added push-away fallback |
| 22 | Boss has no behavior | `boss_charge` pattern not implemented | Added chase/windup/charge/pause |
| 23 | All enemies chase identically | Behavior patterns not read | Added swarm/wander/ranged patterns |
| 24 | W1 always fires 1 projectile | `projectileCount` data ignored | Added loop with angle spread |
| 25 | W3 always fires 1 pulse | `pulseCount` data ignored | Added loop with 250ms delay |

### Category C: Broken Visual/Rendering

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 3 | Bat invisible (matched bg) | Color `#1A1A2E` = background | Brightened all enemy colors |
| 7 | Y-sort NaN crash risk | Sorted including inactive entities | Filter before sort |
| 11 | W3 pulse no visual | No rendering code | Added expanding orange ring |
| 12 | Renderer init order wrong | `DamageSystem` created before `Renderer` | Reordered initialization |
| 20 | No floating damage numbers | No system existed | Added `FloatingTextSystem` |
| 21 | No boss health bar | No rendering code | Added boss HP bar to `_drawUI` |

### Category D: Broken State/Restart

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 3 | Restart state deadlock | `gameOver → playing` invalid transition | Added `GameState.reset()` |
| 4 | Duplicate game loops | `GameLoop.start()` called without guard | Added `if (this.running) return` |
| 27 | WeaponSystem not reset | No `reset()` method on restart | Added `WeaponSystem.reset()` |

### Category E: Game Balance/UX

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 26 | Speed Up wrong stat key | `stats?.speed` vs `stats?.moveSpeed` | Changed to `moveSpeed` |
| 28 | Double power-ups per level | `addXP` while loop + key repeat | Changed to batch emit + debounce |
| 29 | Upgrade key repeat | `keydown` fires repeatedly | Added `_upgradeKeyLock` debounce |
| 30 | Lock resets before key release | Lock reset in handler, not on keyup | Reset on `keyup` event |
| 30b | Queue entry not consumed | `levelUp` handler didn't consume from queue | Added `consumeLevelUp()` in handler |

---

## Part 2: Fix Errors We Made

### Error 1: Treating Symptoms Instead of Causes

**What happened:** When the double power-up bug appeared, we added a triple-lock system (`_upgradeKeyLock`, `_isSelectingUpgrade`, `_isProcessingLevelUp`) instead of finding the root cause.

**What Claude found:** The root cause was a single missing line — the `levelUp` handler didn't consume its queue entry. 30 lines of defensive code replaced by 3 lines of correct logic.

**Lesson:** Before adding defensive locks, trace the exact data flow to find where the wrong value appears. Locks are workarounds, not fixes.

**Rule:** If you find yourself adding "just in case" guards, you haven't found the root cause yet.

---

### Error 2: Overcomplicating the Event System

**What happened:** We added EventBus re-entrancy protection, queue-based event processing, and multiple debounce flags. These interacted in complex ways that made debugging harder.

**What Claude did:** Used the existing event system correctly — emit per level, consume per handler. No new flags needed.

**Lesson:** Use the event system as designed. If events are stacking up, the issue is usually in the data flow, not the event system.

**Rule:** Before modifying the event system, verify the data flow with console logs.

---

### Error 3: Not Testing Edge Cases Early

**What happened:** We fixed the upgrade selection bug, then the double power-up bug appeared. We fixed that, then the key repeat bug appeared. Each fix revealed a new edge case.

**What we should have tested:**
- Single level-up → 1 upgrade
- Double level-up (from one XP gain) → 2 upgrades
- Triple level-up → 3 upgrades
- Key held during upgrade → only 1 applied
- Click during upgrade → only 1 applied
- Mouse + keyboard mixed → no double-trigger

**Lesson:** Test the full range of inputs before declaring a fix complete.

**Rule:** For every event handler, test: single trigger, double trigger, rapid trigger, and mixed input sources.

---

### Error 4: Assuming Fix Worked Without Verification

**What happened:** We applied the triple-lock fix and declared it "bulletproof" without user testing. The user reported the bug still existed.

**What we should have done:** Asked the user to test immediately, or run a headless browser test that simulates rapid key presses.

**Lesson:** Never declare a fix complete without verification from the actual game.

**Rule:** Every bug fix must include a test that reproduces the original bug and verifies the fix.

---

### Error 5: Not Understanding the Full Event Lifecycle

**What happened:** We didn't understand that `addXP` emitting `levelUp` inside a while loop would cause the handler to fire multiple times, each consuming from the queue.

**What we should have traced:**
1. What calls `addXP`?
2. How many times can it be called per frame?
3. What does the `levelUp` handler do?
4. What does `selectUpgrade` do?
5. What's in the queue before and after each step?

**Lesson:** Always trace the full lifecycle of an event from emission to consumption.

**Rule:** Before fixing an event-related bug, draw the complete event flow diagram.

---

### Error 6: Ignoring Browser Behavior

**What happened:** We didn't account for `keydown` repeating when a key is held. This caused the upgrade to apply multiple times.

**What we should have known:** `keydown` fires repeatedly at ~30Hz when held. `keyup` fires once on release. Touch events can trigger both touch and mouse events.

**Lesson:** Browser input events have specific behaviors that affect game logic.

**Rule:** For any input handler, test: single press, held key, rapid clicks, and touch + mouse simultaneously.

---

### Error 7: Creating Dead Code During Fixes

**What happened:** We added `_isProcessingLevelUp`, `_isSelectingUpgrade`, and complex lock logic that was later removed by Claude's simpler fix.

**What we should have done:** Found the root cause first, then applied the minimal fix.

**Lesson:** Dead code from abandoned fixes clutters the codebase and confuses future developers.

**Rule:** Before adding new state variables, ask: "Is this solving the root cause or hiding it?"

---

## Part 3: Test Plan for Future Iterations

### Test 1: Upgrade Selection (Critical Path)

**Purpose:** Verify upgrade selection works correctly under all conditions.

| Test Case | Input | Expected Result |
|---|---|---|
| Single level-up, press 1 | `keydown '1'` | 1 upgrade applied, game resumes |
| Single level-up, click card | `mousedown` on card | 1 upgrade applied, game resumes |
| Double level-up, press 1 | XP for 2 levels, `keydown '1'` | 1st upgrade applied, 2nd screen shown |
| Key held during upgrade | Hold `1` for 2s | Only 1 upgrade applied |
| Rapid clicks on card | 3 clicks in 100ms | Only 1 upgrade applied |
| Mixed input (click + key) | Click card then press 2 | Only 1 upgrade applied |
| 3 pending level-ups | XP for 3 levels | 3 upgrade screens, sequential |

**How to test:**
```javascript
// In browser console during gameplay:
// Simulate gaining 50 XP (multiple level-ups)
game.levelingSystem.addXP(50);
// Check queue length
console.log('Queue:', game.levelingSystem.queue.length);
// Simulate rapid keypresses
for (let i = 0; i < 10; i++) {
  game.eventBus.emit('selectUpgrade', { index: 0 });
}
// Verify only 1 upgrade was applied per level
```

---

### Test 2: Weapon Unlock Pipeline

**Purpose:** Verify weapons unlock at correct levels and fire correctly.

| Test Case | Level | Expected |
|---|---|---|
| W1 fires at level 1 | 1 | Projectiles fire toward nearest enemy |
| W2 unlocks at level 3 | 3 | Orbit orbs appear and circle player |
| W3 unlocks at level 6 | 6 | Area pulse fires periodically |
| W1 multi-shot at level 5 | 5 | 2 projectiles per fire |
| W3 multi-pulse at level 4 | 4 | 2 pulses per fire |

**How to test:**
```javascript
// Skip to level 3
game.levelingSystem.level = 3;
game._checkWeaponUnlocks();
console.log('W2 level:', game.weaponSystem.weaponLevels['w2_orbit']);
// Should print: W2 level: 1
```

---

### Test 3: Game Over Pipeline

**Purpose:** Verify all game over conditions work.

| Test Case | Trigger | Expected |
|---|---|---|
| Player death | `player.hp = 0` | "DEFEATED" screen |
| Timer expiry | `gameTime = 300` | "SURVIVED" screen |
| Boss kill | `boss.hp = 0` | "VICTORY" screen |
| Restart from defeat | Click/Enter | New game starts |
| Restart from victory | Click/Enter | New game starts |

**How to test:**
```javascript
// Simulate player death
game.player.hp = 0;
// Check game state
console.log('State:', game.gameState.state);  // Should be 'gameOver'
console.log('End screen:', game.uiManager.endScreen?.result);  // Should be 'defeat'
// Simulate restart
game.eventBus.emit('restart');
console.log('State:', game.gameState.state);  // Should be 'playing'
```

---

### Test 4: Enemy Behavior

**Purpose:** Verify enemies behave according to their patterns.

| Enemy | Expected Behavior |
|---|---|
| Zombie | Direct chase |
| Bat | Erratic swarm movement |
| Skeleton | Direct chase (tanky) |
| Ghost | Wander → chase cycles |
| Caster | Maintain distance, don't chase |
| Boss | Chase → windup → charge → pause |

**How to test:**
```javascript
// Check enemy behavior
const enemies = game.entityManager.getActive('enemy');
for (const e of enemies) {
  console.log(e.enemyData?.id, e.enemyData?.behavior?.pattern);
}
// Verify bat has erratic movement
const bat = enemies.find(e => e.enemyData?.id === 'bat');
// Check if bat's position changes irregularly
```

---

### Test 5: Rendering Pipeline

**Purpose:** Verify all visual elements render correctly.

| Element | Expected |
|---|---|
| Player | Golden square, centered |
| Enemies | Colored squares, visible |
| Projectiles | Yellow squares, fly toward enemies |
| Orbs | Blue circles, orbit player |
| XP gems | Blue diamonds |
| Gold coins | Gold circles |
| Damage numbers | Float up from hit position |
| Boss health bar | Red bar with name |
| Level-up screen | 3 upgrade cards |
| End screen | Overlay with stats |

**How to test:**
```javascript
// Check rendering
const entities = game.entityManager.getActive();
console.log('Active entities:', entities.length);
// Check floating text system
console.log('Floating texts:', game.floatingTextSystem.texts.length);
// Check pulse effects
console.log('Pulse effects:', game.renderer.pulseEffects.length);
```

---

### Test 6: Input System

**Purpose:** Verify all input methods work.

| Input | Expected |
|---|---|
| Click on canvas | Player moves to click position |
| WASD keys | Player moves in direction |
| Arrow keys | Player moves in direction |
| Press 1/2/3 during level-up | Upgrade selected |
| Click card during level-up | Upgrade selected |
| Enter/Space on end screen | Game restarts |
| Escape | Game pauses |

**How to test:**
```javascript
// Check input state
console.log('Keys:', game.inputManager.keys);
console.log('Has target:', game.inputManager.hasTarget);
console.log('Target:', game.inputManager.targetX, game.inputManager.targetY);
```

---

### Test 7: State Machine

**Purpose:** Verify all state transitions are valid.

| From | To | Valid? |
|---|---|---|
| loading | playing | ✅ |
| playing | paused | ✅ |
| playing | levelUp | ✅ |
| playing | gameOver | ✅ |
| paused | playing | ✅ |
| levelUp | playing | ✅ |
| gameOver | endScreen | ✅ |
| endScreen | playing | ✅ |
| levelUp | gameOver | ❌ (must go through playing) |
| gameOver | playing | ❌ (must go through endScreen) |

**How to test:**
```javascript
// Test invalid transition
game.gameState.setState('gameOver');
const result = game.gameState.setState('playing');
console.log('Invalid transition result:', result);  // Should be false
```

---

### Test 8: Performance

**Purpose:** Verify game runs at target FPS.

| Metric | Target |
|---|---|
| FPS | 60 (stable) |
| Entity count | < 200 enemies |
| Pickup count | < 500 |
| Frame time | < 16.67ms |

**How to test:**
```javascript
// Monitor FPS
let frames = 0;
setInterval(() => {
  console.log('FPS:', frames);
  frames = 0;
}, 1000);
// In game loop: frames++;
```

---

## Part 4: Code Review Checklist

Before merging any code change, verify:

### Event System
- [ ] No duplicate event listeners
- [ ] Events are consumed properly (no stale queue entries)
- [ ] No re-entrancy issues (events triggering events)
- [ ] EventBus processing flag is respected

### State Management
- [ ] All state transitions are in the valid transitions table
- [ ] No state changes during event processing
- [ ] Restart properly resets all state
- [ ] No stale references after restart

### Input Handling
- [ ] `keydown` has debounce for game actions
- [ ] `mousedown` doesn't conflict with `touchstart`
- [ ] Input is locked during level-up/pause
- [ ] No input during game over screen (except restart)

### Rendering
- [ ] All entities have valid visual properties
- [ ] No rendering during paused state (except UI overlays)
- [ ] Camera transform is applied/restored correctly
- [ ] No stale entity references in renderer

### Game Balance
- [ ] Upgrade effects are applied to the correct variable
- [ ] Weapon stats read from the correct source
- [ ] Damage multiplier applies to all weapons
- [ ] Level-up queue doesn't stack incorrectly

### Edge Cases
- [ ] What happens when all enemies die?
- [ ] What happens when player has 0 HP at frame start?
- [ ] What happens when pickup count exceeds 500?
- [ ] What happens when weapon level exceeds 7?
- [ ] What happens when game time exceeds 5:00?

---

## Part 5: Anti-Patterns to Avoid

### 1. "Lock Everything" Anti-Pattern
**Bad:** Adding `_isX`, `_isY`, `_isZ` flags to prevent race conditions
**Good:** Fix the root cause so locks aren't needed
**Example:** Triple-lock for upgrade selection → 1-line consume fix

### 2. "Emit and Hope" Anti-Pattern
**Bad:** Emitting events without ensuring they're consumed
**Good:** Every emit should have a clear consumer
**Example:** `levelUp` emitted but not consumed → double upgrade

### 3. "Workaround Accumulation" Anti-Pattern
**Bad:** Adding workounds on top of workarounds
**Good:** Step back and find the root cause
**Example:** Key repeat fix → lock reset fix → consume fix

### 4. "Assume It Works" Anti-Pattern
**Bad:** Declaring fix complete without user testing
**Good:** Always verify with actual gameplay
**Example:** Triple-lock "bulletproof" → still broken

### 5. "Copy-Paste Fix" Anti-Pattern
**Bad:** Applying the same pattern everywhere without understanding
**Good:** Understand why the pattern works in each context
**Example:** Debounce on keyboard → also needed on click

---

*This document should be reviewed and updated after each major bug fix session.*
