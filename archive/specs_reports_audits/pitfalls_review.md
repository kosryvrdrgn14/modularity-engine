# Modularity Engine — AI Pitfalls Review

> **Date:** 2026-08-20
> **Purpose:** Identify common AI implementation pitfalls and add safeguards
> **Source:** Game development best practices, common AI coding errors

---

## Table of Contents

1. [Critical Pitfalls](#1-critical-pitfalls)
2. [High-Risk Pitfalls](#2-high-risk-pitfalls)
3. [Medium-Risk Pitfalls](#3-medium-risk-pitfalls)
4. [Safeguards by Phase](#4-safeguards-by-phase)
5. [Test Plan for Each Pitfall](#5-test-plan-for-each-pitfall)
6. [Code Review Checklist](#6-code-review-checklist)

---

## 1. Critical Pitfalls

These will cause bugs, crashes, or incorrect behavior if not addressed.

### P1: Floating Point Accumulation in Timers

**Problem:** Using floating point for game timers causes drift over time. A 60 FPS game running for 5 minutes (30,000 frames) can accumulate 100ms+ of drift.

**Example:**
```javascript
// WRONG — accumulates error
this.timer += deltaTime;
if (this.timer >= this.cooldown) {
  this.fire();
  this.timer = 0;
}

// CORRECT — use frame counting or fixed-step timers
this.timer += deltaTime;
while (this.timer >= this.cooldown) {
  this.fire();
  this.timer -= this.cooldown;
}
```

**Affected Systems:** GameLoop, WeaponSystem, SpawnSystem, DamageSystem (iFrames), PickupSystem (magnet duration)

**Safeguard:** Use integer frame counters for all game timers. Store timers in seconds but convert to frames at initialization.

---

### P2: Event Bus Re-entrancy

**Problem:** If a listener emits another event, it can cause infinite loops or inconsistent state.

**Example:**
```javascript
// WRONG — re-entrancy causes infinite loop
eventBus.on('damage', (data) => {
  if (data.damage > 10) {
    eventBus.emit('criticalHit', data); // This might trigger another 'damage' event
  }
});

// CORRECT — queue events for next frame
eventBus.on('damage', (data) => {
  if (data.damage > 10) {
    eventBus.queue('criticalHit', data); // Processed after current frame
  }
});
```

**Affected Systems:** All systems that emit and listen to events

**Safeguard:** Event bus must queue events emitted during processing. Process queue at end of frame.

---

### P3: Entity Pool Exhaustion

**Problem:** If all pool slots are occupied, new entities can't be created. Game crashes or entities disappear.

**Example:**
```javascript
// WRONG — no fallback
function spawnEnemy() {
  const enemy = enemyPool.get(); // Returns null if pool empty!
  enemy.active = true;
  return enemy;
}

// CORRECT — handle exhaustion
function spawnEnemy() {
  const enemy = enemyPool.get();
  if (!enemy) {
    // Option 1: Don't spawn (respect cap)
    return null;
    // Option 2: Recycle oldest
    // const oldest = enemyPool.getOldest();
    // resetEntity(oldest);
    // return oldest;
  }
  enemy.active = true;
  return enemy;
}
```

**Affected Systems:** EntityManager, SpawnSystem, PickupSystem

**Safeguard:** Always check pool.get() return value. Implement graceful degradation.

---

### P4: Division by Zero

**Problem:** Common in damage calculations, DPS estimates, and spawn rate math.

**Example:**
```javascript
// WRONG — crashes if cooldown is 0
const dps = damage / cooldown;

// CORRECT — guard against zero
const dps = cooldown > 0 ? damage / cooldown : 0;
```

**Affected Systems:** DamageSystem, WeaponSystem, SpawnSystem

**Safeguard:** Add validation for all division operations. Use safe division helper.

---

### P5: Null Reference Errors

**Problem:** Accessing properties of undefined entities after they've been destroyed.

**Example:**
```javascript
// WRONG — entity might be destroyed
const target = getNearestEnemy(player);
const dist = target.position.x - player.position.x; // Crash if target is null

// CORRECT — null check
const target = getNearestEnemy(player);
if (!target) return; // No enemies on screen
const dist = target.position.x - player.position.x;
```

**Affected Systems:** All systems that iterate entities

**Safeguard:** Always null-check before accessing entity properties. Use optional chaining where supported.

---

## 2. High-Risk Pitfalls

These will cause incorrect behavior or subtle bugs.

### P6: Mutation During Iteration

**Problem:** Modifying an array while iterating over it causes skipped or double-processed elements.

**Example:**
```javascript
// WRONG — skips elements
for (let i = 0; i < entities.length; i++) {
  if (entities[i].dead) {
    entities.splice(i, 1); // Array shifts, next element skipped!
    i--;
  }
}

// CORRECT — iterate backwards or use filter
for (let i = entities.length - 1; i >= 0; i--) {
  if (entities[i].dead) {
    entities.splice(i, 1);
  }
}

// BETTER — separate cleanup phase
const deadEntities = entities.filter(e => e.dead);
deadEntities.forEach(e => removeEntity(e));
```

**Affected Systems:** EntityManager, CollisionSystem, PickupSystem

**Safeguard:** Never modify arrays during forward iteration. Use backward iteration or separate cleanup phase.

---

### P7: Incorrect Delta Time Usage

**Problem:** Using raw deltaTime without clamping causes physics explosions when tab switches or lag spikes.

**Example:**
```javascript
// WRONG — position jumps on lag spike
player.x += player.speed * deltaTime; // deltaTime could be 5 seconds!

// CORRECT — clamp deltaTime
const clampedDelta = Math.min(deltaTime, 1/30); // Max 30 FPS equivalent
player.x += player.speed * clampedDelta;
```

**Affected Systems:** MovementSystem, SpawnSystem, WeaponSystem

**Safeguard:** Clamp deltaTime to max 2 frames (33ms at 60 FPS).

---

### P8: Integer vs Float Confusion

**Problem:** Canvas drawImage requires integer coordinates for pixel-perfect rendering. Floats cause blurry sprites.

**Example:**
```javascript
// WRONG — blurry rendering
ctx.fillRect(entity.x, entity.y, width, height);

// CORRECT — snap to pixels
ctx.fillRect(Math.round(entity.x), Math.round(entity.y), width, height);
```

**Affected Systems:** Renderer, Camera

**Safeguard:** Use Math.round() for all canvas draw calls.

---

### P9: Collision Tunneling

**Problem:** Fast-moving objects pass through thin objects in a single frame.

**Example:**
```javascript
// WRONG — AABB check misses fast projectile
projectile.x += projectile.speed * deltaTime; // Moves 100px in one frame
checkCollision(projectile, wall); // Wall is 20px wide, missed!

// CORRECT — sweep or continuous collision
const prevX = projectile.x;
projectile.x += projectile.speed * deltaTime;
if (checkCollision(projectile, wall)) {
  // Find exact collision point
  const hitX = findIntersection(prevX, projectile.x, wall);
  projectile.x = hitX;
}
```

**Affected Systems:** CollisionSystem, WeaponSystem (projectiles)

**Safeguard:** For fast objects, check collision along movement path, not just at end position.

---

### P10: State Machine Invalid Transitions

**Problem:** Game enters invalid states (e.g., gameOver → playing without reset).

**Example:**
```javascript
// WRONG — no validation
function setState(newState) {
  this.state = newState;
}

// CORRECT — validate transitions
function setState(newState) {
  if (!this.isValidTransition(this.state, newState)) {
    console.error(`Invalid transition: ${this.state} → ${newState}`);
    return;
  }
  this.state = newState;
}
```

**Affected Systems:** GameState

**Safeguard:** Define valid transitions table. Reject invalid transitions with error.

---

## 3. Medium-Risk Pitfalls

These will cause minor issues or code quality problems.

### P11: Hardcoded Magic Numbers

**Problem:** Values scattered throughout code instead of using config/JSON.

**Example:**
```javascript
// WRONG — magic numbers
if (player.hp < 25) { // What is 25?
  emit('lowHp');
}

// CORRECT — use config
const LOW_HP_THRESHOLD = 0.25; // 25% of max HP
if (player.hp < player.maxHp * LOW_HP_THRESHOLD) {
  emit('lowHp');
}
```

**Affected Systems:** All

**Safeguard:** All game values must come from JSON schemas or named constants.

---

### P12: Missing Cleanup on Game Restart

**Problem:** Old entities, events, and state persist when restarting.

**Example:**
```javascript
// WRONG — old entities remain
function restartGame() {
  startNewGame(); // Creates new player, but old enemies still in pool!
}

// CORRECT — full cleanup
function restartGame() {
  entityManager.clearAll();
  eventBus.clear();
  audioManager.stopAll();
  startNewGame();
}
```

**Affected Systems:** GameState, EntityManager, AudioManager, EventBus

**Safeguard:** Implement destroy() method on all systems. Call on restart.

---

### P13: Audio Context Not Resuming

**Problem:** Browsers block audio until user gesture. If AudioContext stays suspended, no sound plays.

**Example:**
```javascript
// WRONG — no unlock
const audioCtx = new AudioContext(); // Stays suspended

// CORRECT — resume on first click
const audioCtx = new AudioContext();
document.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}, { once: true });
```

**Affected Systems:** AudioManager

**Safeguard:** Always check AudioContext state before playing. Resume on first user gesture.

---

### P14: Canvas Context State Leaks

**Problem:** Forgetting to save/restore canvas context state causes rendering artifacts.

**Example:**
```javascript
// WRONG — globalAlpha leaked
ctx.globalAlpha = 0.5;
drawEntity(entity);
// Next draw uses 0.5 alpha!

// CORRECT — save/restore
ctx.save();
ctx.globalAlpha = 0.5;
drawEntity(entity);
ctx.restore();
```

**Affected Systems:** Renderer

**Safeguard:** Always wrap draw calls in save/restore. Never modify global state directly.

---

### P15: Incorrect AABB Overlap

**Problem:** AABB collision uses wrong formula, causing missed or false positives.

**Example:**
```javascript
// WRONG — uses distance instead of overlap
function checkAABB(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy) < a.radius + b.radius; // Circle check, not AABB!
}

// CORRECT — AABB overlap
function checkAABB(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
```

**Affected Systems:** CollisionSystem

**Safeguard:** Use standard AABB overlap formula. Test with known cases.

---

## 4. Safeguards by Phase

### Phase 1: Core Infrastructure

| Safeguard | Implementation |
|---|---|
| EventBus re-entrancy | Queue events emitted during processing |
| DataManager validation | Validate JSON schema on load |
| GameState transitions | Valid transitions table with error logging |

### Phase 2: Game Loop & Camera

| Safeguard | Implementation |
|---|---|
| Delta time clamping | Max 33ms (2 frames at 60 FPS) |
| Fixed timestep | Use integer frame counter |
| Camera bounds | Clamp to arena dimensions |

### Phase 3: Input System

| Safeguard | Implementation |
|---|---|
| Coordinate transformation | Screen → world space conversion |
| Touch detection | Check for touch events before mouse |
| Input buffering | Store input state, process in update() |

### Phase 4: Entity Management

| Safeguard | Implementation |
|---|---|
| Pool exhaustion check | Always check get() return value |
| Entity IDs | Use incrementing integer IDs |
| Cleanup on restart | clearAll() method |

### Phase 5: Spawn System

| Safeguard | Implementation |
|---|---|
| Spawn cap enforcement | Count active enemies before spawning |
| Spawn rate limiting | Use accumulator pattern |
| Boss spawn timing | Use frame counter, not floating point |

### Phase 6: Movement System

| Safeguard | Implementation |
|---|---|
| Diagonal normalization | Normalize velocity vector |
| Obstacle collision | Check before moving, not after |
| Speed clamping | Max speed = arena diagonal / 2 seconds |

### Phase 7: Collision System

| Safeguard | Implementation |
|---|---|
| AABB formula | Standard overlap test |
| Tunneling prevention | Sweep for fast objects |
| Collision layers | Bitmask for efficient filtering |

### Phase 8: Weapon System

| Safeguard | Implementation |
|---|---|
| Cooldown validation | Never fire if cooldown > 0 |
| Projectile limit | Max 500 active projectiles |
| Orb cooldown | Per-enemy, not global |

### Phase 9: Damage System

| Safeguard | Implementation |
|---|---|
| Division by zero | Guard all divisions |
| iFrame validation | Check before applying damage |
| Crit calculation | Roll once, apply consistently |

### Phase 10: Pickup System

| Safeguard | Implementation |
|---|---|
| Drop rate validation | Sum of chances ≤ 1.0 |
| Magnet override | All pickups use 350px during magnet |
| Despawn timers | Use frame counters |

### Phase 11: Leveling System

| Safeguard | Implementation |
|---|---|
| XP overflow | Carry excess to next level |
| Queue limit | Max 3 level-ups queued |
| Passive max stacks | Check before applying |

### Phase 12: Rendering

| Safeguard | Implementation |
|---|---|
| Context save/restore | Wrap all draw calls |
| Pixel rounding | Math.round() for coordinates |
| Z-order enforcement | Draw in correct order |

### Phase 13: UI System

| Safeguard | Implementation |
|---|---|
| Touch target size | Min 44×44px |
| Responsive layout | Check canvas size on resize |
| State validation | Only show UI in correct state |

### Phase 14: Audio System

| Safeguard | Implementation |
|---|---|
| AudioContext unlock | Resume on first click |
| Oscillator limit | Max 16 concurrent |
| Volume clamping | 0.0–1.0 range |

---

## 5. Test Plan for Each Pitfall

### P1: Floating Point Accumulation

**Test:** Run game for 5 minutes. Verify timer shows "5:00" at end, not "4:59" or "5:01".

**Check:**
```
Expected: Timer = 300.000s (5 minutes exactly)
Actual: Timer = 300.0xx (within 10ms tolerance)
Pass: |actual - 300| < 0.01
```

---

### P2: Event Bus Re-entrancy

**Test:** Emit event that triggers another event. Verify both fire without infinite loop.

**Check:**
```
1. Emit 'damage' event
2. Listener emits 'criticalHit' event
3. Verify 'criticalHit' fires exactly once
4. Verify no stack overflow
```

---

### P3: Entity Pool Exhaustion

**Test:** Spawn 200 enemies, then try to spawn 201st. Verify graceful handling.

**Check:**
```
1. Spawn 200 enemies (cap)
2. Try to spawn 201st
3. Verify: returns null, no crash, no entity created
4. Kill 1 enemy, try again
5. Verify: spawns successfully
```

---

### P4: Division by Zero

**Test:** Set weapon cooldown to 0. Verify no crash.

**Check:**
```
1. Create weapon with cooldown = 0
2. Try to calculate DPS
3. Verify: returns Infinity or 0, no NaN, no crash
```

---

### P5: Null Reference Errors

**Test:** Kill all enemies, then fire weapon. Verify no crash.

**Check:**
```
1. Clear all enemies
2. Fire W1 (targets nearest enemy)
3. Verify: no crash, weapon doesn't fire (no target)
4. Spawn 1 enemy
5. Fire again
6. Verify: fires at new enemy
```

---

### P6: Mutation During Iteration

**Test:** Kill 10 enemies in one frame. Verify all processed correctly.

**Check:**
```
1. Spawn 10 enemies
2. Kill all in single frame (screen wipe)
3. Verify: all 10 removed, no skipped entities
4. Count remaining entities: 0
```

---

### P7: Incorrect Delta Time Usage

**Test:** Simulate 1-second lag spike. Verify no physics explosion.

**Check:**
```
1. Set deltaTime = 1.0 (1 second)
2. Run one frame
3. Verify: player moves max 2 frames worth of distance
4. Verify: no entities teleported off-screen
```

---

### P8: Integer vs Float Confusion

**Test:** Render entity at (10.5, 20.7). Verify pixel-perfect rendering.

**Check:**
```
1. Set entity position to (10.5, 20.7)
2. Render entity
3. Verify: drawn at (11, 21) or (10, 20), not (10.5, 20.7)
```

---

### P9: Collision Tunneling

**Test:** Fire fast projectile through thin wall. Verify collision detected.

**Check:**
```
1. Create projectile with speed = 1000 px/s
2. Create wall with width = 10px
3. Fire projectile at wall
4. Verify: collision detected, projectile stopped
```

---

### P10: State Machine Invalid Transitions

**Test:** Try invalid transition (gameOver → playing). Verify rejected.

**Check:**
```
1. Set state to 'gameOver'
2. Try setState('playing')
3. Verify: state remains 'gameOver'
4. Verify: error logged
```

---

### P11: Hardcoded Magic Numbers

**Test:** Search codebase for unexplained numbers. Verify all come from config.

**Check:**
```
1. Grep for numbers > 1 and < 1000
2. Verify: each has a named constant or config reference
3. No bare numbers in game logic
```

---

### P12: Missing Cleanup on Restart

**Test:** Play game, die, restart. Verify clean state.

**Check:**
```
1. Play game for 1 minute
2. Die (gameOver)
3. Click "Play Again"
4. Verify: all old entities removed
5. Verify: timer at 0:00
6. Verify: player at full HP
7. Verify: no old sounds playing
```

---

### P13: Audio Context Not Resuming

**Test:** Load game, don't click. Verify no sound plays. Click. Verify sound plays.

**Check:**
```
1. Load game
2. Wait 1 second
3. Verify: AudioContext.state === 'suspended'
4. Click anywhere
5. Verify: AudioContext.state === 'running'
6. Play sound
7. Verify: sound audible
```

---

### P14: Canvas Context State Leaks

**Test:** Draw entity with alpha 0.5, then draw another. Verify second entity at full alpha.

**Check:**
```
1. Draw entity A with globalAlpha = 0.5
2. Draw entity B with no alpha set
3. Verify: entity B is fully opaque
```

---

### P15: Incorrect AABB Overlap

**Test:** Test AABB with known cases.

**Check:**
```
Case 1: Overlapping rectangles
  A: {x:0, y:0, w:10, h:10}
  B: {x:5, y:5, w:10, h:10}
  Expected: true

Case 2: Non-overlapping rectangles
  A: {x:0, y:0, w:10, h:10}
  B: {x:20, y:20, w:10, h:10}
  Expected: false

Case 3: Touching edges
  A: {x:0, y:0, w:10, h:10}
  B: {x:10, y:0, w:10, h:10}
  Expected: false (no overlap, just touching)
```

---

## 6. Code Review Checklist

Use this checklist when reviewing each phase's implementation:

### General

- [ ] No magic numbers (all values from config/constants)
- [ ] No division without zero-check
- [ ] No null access without null-check
- [ ] No array mutation during forward iteration
- [ ] All timers use integer frame counters
- [ ] All deltaTime usage clamped to max 33ms

### Event System

- [ ] Events queued if emitted during processing
- [ ] No circular event dependencies
- [ ] All event listeners cleaned up on restart

### Entity System

- [ ] Pool.get() return value always checked
- [ ] Entity IDs are unique and incrementing
- [ ] Dead entities marked, not immediately removed
- [ ] Cleanup phase separate from update phase

### Collision System

- [ ] AABB formula is correct (overlap, not distance)
- [ ] Fast objects use sweep collision
- [ ] Collision layers defined as bitmask
- [ ] No tunneling through thin objects

### Rendering

- [ ] Canvas context saved before modifications
- [ ] Canvas context restored after modifications
- [ ] All coordinates rounded to integers
- [ ] Draw order enforced (background → entities → UI)

### Audio

- [ ] AudioContext resumed on first user gesture
- [ ] Max concurrent sounds enforced (16)
- [ ] All volumes clamped to 0.0–1.0
- [ ] No audio played during pause

### Input

- [ ] Touch coordinates transformed to world space
- [ ] Input state read once per frame, not polled
- [ ] Pause button works on both keyboard and touch

### State Management

- [ ] All state transitions validated
- [ ] Game restart clears all state
- [ ] No stale state references after restart

---

## Summary

| Category | Count | Severity |
|---|---|---|
| Critical Pitfalls | 5 | 🔴 Will cause bugs/crashes |
| High-Risk Pitfalls | 5 | 🟡 Will cause incorrect behavior |
| Medium-Risk Pitfalls | 5 | 🟢 Will cause minor issues |
| **Total** | **15** | — |

### Key Takeaways

1. **Use integer frame counters** for all game timers (P1)
2. **Queue events** to prevent re-entrancy (P2)
3. **Always check pool.get()** return value (P3)
4. **Guard all divisions** against zero (P4)
5. **Null-check before accessing** entity properties (P5)
6. **Never mutate arrays** during forward iteration (P6)
7. **Clamp deltaTime** to max 33ms (P7)
8. **Round coordinates** for canvas rendering (P8)
9. **Sweep collision** for fast objects (P9)
10. **Validate state transitions** (P10)

### Recommendation

Add these checks to the implementation prompts:

1. **Prompt template should include:** "Apply all safeguards from pitfalls_review.md"
2. **Each phase test should include:** Pitfall-specific test cases
3. **Code review should use:** The checklist in Section 6
4. **Before moving to next phase:** Verify no new pitfalls introduced

---

*End of pitfalls_review.md — Version 1.0*
