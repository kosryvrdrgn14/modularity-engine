# Game Bug Report — Master Log

**Project:** Modularity Engine (Vampire Survivors Prototype)
**File:** `game.html` (single-file HTML5 game)
**Last Updated:** August 21, 2026

---

## Summary

| # | Bug | Severity | Status | Discovered By |
|---|---|---|---|---|
| 1 | Level-up upgrade selection stuck | 🔴 Critical | ✅ Fixed | User + Headless test |
| 2 | Enemies spawn at world origin (0,0) | 🔴 Critical | ✅ Fixed | User + Code review |
| 3 | Bat color identical to background | 🟡 Medium | ✅ Fixed | User + Code review |
| 4 | Projectile despawn used origin distance | 🔴 Critical | ✅ Fixed | User + Code review |
| 5 | Division by zero in weapon targeting | 🟡 Medium | ✅ Fixed | Code review |
| 6 | Division by zero in enemy movement | 🟡 Medium | ✅ Fixed | Code review |
| 7 | Canvas Y-sort NaN crash risk | 🟡 Medium | ✅ Fixed | Gemini review |
| 8 | No distance cap on projectiles | 🟡 Medium | ✅ Fixed | Gemini review |
| 9 | Weapons W2/W3 never unlock | 🔴 Critical | ✅ Fixed | User report |
| 10 | W2 orbs had no collision with enemies | 🔴 Critical | ✅ Fixed | Code review |
| 11 | W3 pulse had no visual effect | 🟡 Medium | ✅ Fixed | Code review |
| 12 | Renderer init order wrong (undefined) | 🔴 Critical | ✅ Fixed | Code review |
| 13 | Game freeze on game over (no end screen) | 🔴 Critical | ✅ Fixed | User report |
| 14 | Boss death never triggered victory | 🔴 Critical | ✅ Fixed | Code review |
| 15 | No restart from end screen | 🟡 Medium | ✅ Fixed | Code review |
| 16 | Damage upgrade had no effect on weapons | 🔴 Critical | ✅ Fixed | User report |

**Total: 16 bugs found, 16 fixed**

---

## Bug #1 — Level-Up Upgrade Selection Stuck

**Date:** August 21, 2026
**Severity:** 🔴 Critical (Game-breaking)
**Discovered by:** User manual testing
**Verified by:** Headless Playwright test (`test_upgrade_bug.cjs`)

### Symptom
Player gets stuck on the "LEVEL UP!" screen permanently. Pressing 1/2/3 or clicking cards does nothing.

### Root Cause
Three missing handlers:
1. No keyboard handler for `Digit1/2/3` in `InputManager`
2. No mouse click detection on upgrade card bounding boxes
3. No `selectUpgrade` event handler to apply upgrades and resume game

### Fix
- Added `Digit1/2/3` + `Numpad1/2/3` keydown → `selectUpgrade` event
- Added `_getUpgradeCardAt(x, y)` to detect card click positions
- Added `selectUpgrade` event handler with upgrade application + state transition
- Added `_isPaused` flag to prevent movement clicks during levelUp
- Added `_showUpgradeOptions()` method with 3 upgrade effects

### Test Results
```
=== RESULT: 16/16 checks passed ===
✅ ALL FIXES VERIFIED
```

---

## Bug #2 — Enemies Spawn at World Origin (0,0)

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** User manual testing

### Symptom
Some monsters not rendering. Getting hit with nothing visible nearby. Enemies pile up far off-screen.

### Root Cause
Enemy spawn positions used `Math.cos(angle) * dist` without adding player position:
```javascript
// BEFORE (broken):
x: Math.cos(angle) * dist,  // Spawns at world origin ± offset
y: Math.sin(angle) * dist,

// AFTER (fixed):
x: px + Math.cos(angle) * dist,  // Spawns around player
y: py + Math.sin(angle) * dist,
```

### Fix
- Added `player.x + offset` and `player.y + offset` to enemy spawn positions
- Same fix applied to boss spawn

---

## Bug #3 — Bat Color Identical to Background

**Date:** August 21, 2026
**Severity:** 🟡 Medium (visual)
**Discovered by:** User manual testing ("black overlaps")

### Symptom
Bats are invisible against the dark background. Player takes damage from invisible enemies.

### Root Cause
Bat color `#1A1A2E` was identical to background color `#1A1A2E`.

### Fix
All enemy colors brightened:
| Enemy | Before | After |
|---|---|---|
| Zombie | `#2D5A27` | `#3B8A30` |
| Bat | `#1A1A2E` | `#6B3FA0` |
| Skeleton | `#8B1A1A` | `#C0392B` |
| Ghost | `#4A1A6B` | `#8E44AD` |
| Caster | `#1A4A4A` | `#2E86C1` |

---

## Bug #4 — Projectile Despawn Used Origin Distance

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** User manual testing + Gemini code review

### Symptom
Weapons sometimes not firing. Projectiles vanish immediately when player is far from spawn.

### Root Cause
Projectile despawn used distance from world origin (0,0):
```javascript
// BEFORE (broken):
if (proj.age > 3 || Math.sqrt(proj.x * proj.x + proj.y * proj.y) > 600) {
```

### Fix
Replaced with `distanceTraveled` tracking from spawn point:
```javascript
// AFTER (fixed):
proj.distanceTraveled = (proj.distanceTraveled || 0) + Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * dt;
if (proj.age > 3 || proj.distanceTraveled > 600) {
```

---

## Bug #5 — Division by Zero in Weapon Targeting

**Date:** August 21, 2026
**Severity:** 🟡 Medium
**Discovered by:** Code review

### Symptom
Weapon fires NaN projectile when enemy is exactly at player position.

### Root Cause
No guard for `dist === 0` when calculating projectile direction.

### Fix
Added `if (dist < 1) return;` guard before firing.

---

## Bug #6 — Division by Zero in Enemy Movement

**Date:** August 21, 2026
**Severity:** 🟡 Medium
**Discovered by:** Code review

### Symptom
Enemy stops moving when exactly on top of player.

### Root Cause
No guard for `dist === 0` when normalizing movement direction.

### Fix
Added `if (dist > 1)` guard with push-away fallback.

---

## Bug #7 — Canvas Y-Sort NaN Crash Risk

**Date:** August 21, 2026
**Severity:** 🟡 Medium
**Discovered by:** Gemini code review

### Symptom
Potential crash when inactive entities with missing `y` values are included in sort.

### Root Cause
Renderer received all entities but sorted including inactive ones. Dead entities could have undefined `y`.

### Fix
Filter active entities before sort:
```javascript
// BEFORE:
const sorted = [...entities].sort((a, b) => a.y - b.y);
for (const entity of sorted) {
  if (!entity.active) continue;

// AFTER:
const sorted = entities.filter(e => e.active).sort((a, b) => a.y - b.y);
for (const entity of sorted) {
```

---

## Bug #8 — No Distance Cap on Projectiles

**Date:** August 21, 2026
**Severity:** 🟡 Medium
**Discovered by:** Gemini code review

### Symptom
Projectiles live up to 3 seconds with no range limit, flying across the entire map.

### Root Cause
Original fix removed origin-distance check entirely, leaving only time-based despawn.

### Fix
Added `distanceTraveled` tracking from spawn point with 600px cap.

---

## Bug #9 — Weapons W2/W3 Never Unlock

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** User report ("only see one weapon")

### Symptom
W2 (Orbit) and W3 (Area) never appear. Only W1 (Projectile) fires.

### Root Cause
`unlockWeapon()` method existed but was never called. No automatic unlock when player reaches required level.

### Fix
Added `_checkWeaponUnlocks()` method called on every level-up:
- W2 unlocks at player level 3
- W3 unlocks at player level 6

---

## Bug #10 — W2 Orbs Had No Collision with Enemies

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** Code review

### Symptom
W2 orbs spin around player but deal no damage to enemies.

### Root Cause
`CollisionSystem` only checked Player↔Enemy, Projectile↔Enemy, Player↔Pickup. No Orb↔Enemy check.

### Fix
Added orb vs enemy collision with 0.5s per-enemy damage cooldown to prevent rapid multi-hits.

---

## Bug #11 — W3 Pulse Had No Visual Effect

**Date:** August 21, 2026
**Severity:** 🟡 Medium
**Discovered by:** Code review

### Symptom
W3 area pulse damages enemies but has no visual feedback.

### Root Cause
No rendering code for the area pulse effect.

### Fix
- Added `pulseEffects` array to Renderer
- Added `addPulseEffect(x, y, radius, color)` method
- Added expanding orange ring animation (0.3s fade)
- Hooked into render loop

---

## Bug #12 — Renderer Init Order Wrong

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** Code review

### Symptom
W3 pulse visual never renders. DamageSystem receives `undefined` as renderer.

### Root Cause
Initialization order in `Game.init()`:
```
Line 1926: this.damageSystem = new DamageSystem(..., this.renderer);  // renderer undefined!
Line 1929: this.renderer = new Renderer(...);  // Created AFTER damageSystem
```

### Fix
Moved `this.renderer = new Renderer(...)` before `this.damageSystem = new DamageSystem(...)`.

---

## Bug #13 — Game Freeze on Game Over

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** User report ("game just freezes when it ends")

### Symptom
Game freezes with no notification of whether the player died or timer ran out.

### Root Cause
`triggerGameOver()` set state to `gameOver` but never called `uiManager.showEndScreen()`. No end screen overlay was rendered.

### Fix
Added `_handleGameOver()` method that:
1. Pauses the game loop
2. Sets `_isPaused` on InputManager
3. Calls `uiManager.showEndScreen(result, stats)`

---

## Bug #14 — Boss Death Never Triggered Victory

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** Code review

### Symptom
Killing the boss does nothing. No victory screen.

### Root Cause
`bossDeath` event was never emitted. Damage system only emitted generic `death` event.

### Fix
Added `bossDeath` emission in damage system when `target.isBoss` and HP ≤ 0:
```javascript
if (target.isBoss) {
  this.eventBus.emit('bossDeath', { boss: target, killer: source });
}
```

---

## Bug #15 — No Restart from End Screen

**Date:** August 21, 2026
**Severity:** 🟡 Medium
**Discovered by:** Code review

### Symptom
End screen says "Click to restart" but clicking does nothing. No keyboard restart either.

### Root Cause
No restart event handler. No InputManager integration with end screen.

### Fix
- Added `restart` event → `startGame()` handler
- Added click detection on end screen → `restart` event
- Added Enter/Space key → `restart` event
- Wired InputManager to Game reference (`_game`)
- Added duplicate-trigger guard to `triggerGameOver`

---

## Bug #16 — Damage Upgrade Had No Effect on Weapons

**Date:** August 21, 2026
**Severity:** 🔴 Critical
**Discovered by:** User report ("keeps picking damage upgrade but always needs 2 hits")

### Symptom
Picking Damage Up (+15%) has no effect on weapon damage. W1 always deals base 8 damage.

### Root Cause
Damage Up modified `player.stats.damage` but weapons used `weapon.statsPerLevel[level-1].damage` — completely separate values.

### Fix
- Added `player.damageMultiplier` (initialized to 1)
- Damage Up now multiplies: `player.damageMultiplier *= 1.15`
- All weapons apply multiplier: `Math.floor(stats.damage * (player.damageMultiplier || 1))`
- Speed Up uses same pattern: `player.speedMultiplier *= 1.10`

### Math After Fix
| Damage Up Picks | W1 Damage | Zombie HP | Hits to Kill |
|---|---|---|---|
| 0 | 8 | 10 | 2 |
| 1 | 9 | 10 | 2 |
| 2 | **10** | 10 | **1!** |
| 3 | 11 | 10 | 1 |

---

## Testing Infrastructure

### Headless Browser Tests Created
| File | Purpose |
|---|---|
| `test_upgrade_bug.cjs` | Verifies level-up selection bug exists |
| `test_upgrade_fix.cjs` | Verifies level-up fix (16/16 checks) |
| `test_enemy_fix.cjs` | Verifies enemy spawn/color fixes (5/5 checks) |
| `test_weapon_unlock.cjs` | Verifies weapon unlock logic with debug logging |

### Screenshots Captured
| File | Content |
|---|---|
| `screenshots/upgrade_bug_test.png` | Level-up screen stuck |
| `screenshots/upgrade_fix_test.png` | Level-up after fix |
| `screenshots/enemy_fix_test.png` | Enemies after spawn fix |

---

## Known Limitations (Not Bugs)

1. **Audio system** — Stub only, no sounds implemented
2. **Gold spending** — Gold has no spending mechanic in V1
3. **Weapon power spikes** — Level 4 and 7 power spike effects not fully implemented
4. **Passive upgrades** — Only 3 upgrade types (Damage/Speed/Health Up)
5. **Mobile touch** — Upgrade cards work via click, but no dedicated touch optimization
6. **Boss minion spawn** — Boss Phase 2 minion spawn not implemented

---

*Report compiled from all development sessions. All bugs verified by headless browser testing where applicable.*
