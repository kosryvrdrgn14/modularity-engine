# Game Bug Report — Master Log

**Project:** Modularity Engine (Vampire Survivors Prototype)
**File:** `game.html` (single-file HTML5 game)
**Last Updated:** August 21, 2026

---

## Summary

| # | Bug | Severity | Status | Source |
|---|---|---|---|---|
| 1 | Level-up upgrade selection stuck | 🔴 Critical | ✅ Fixed | User |
| 2 | Enemies spawn at world origin (0,0) | 🔴 Critical | ✅ Fixed | Code review |
| 3 | Bat color identical to background | 🟡 Medium | ✅ Fixed | Code review |
| 4 | Projectile despawn used origin distance | 🔴 Critical | ✅ Fixed | Gemini |
| 5 | Division by zero in weapon targeting | 🟡 Medium | ✅ Fixed | Code review |
| 6 | Division by zero in enemy movement | 🟡 Medium | ✅ Fixed | Code review |
| 7 | Canvas Y-sort NaN crash risk | 🟡 Medium | ✅ Fixed | Gemini |
| 8 | No distance cap on projectiles | 🟡 Medium | ✅ Fixed | Gemini |
| 9 | Weapons W2/W3 never unlock | 🔴 Critical | ✅ Fixed | User |
| 10 | W2 orbs had no collision with enemies | 🔴 Critical | ✅ Fixed | Code review |
| 11 | W3 pulse had no visual effect | 🟡 Medium | ✅ Fixed | Code review |
| 12 | Renderer init order wrong (undefined) | 🔴 Critical | ✅ Fixed | Code review |
| 13 | Game freeze on game over (no end screen) | 🔴 Critical | ✅ Fixed | User |
| 14 | Boss death never triggered victory | 🔴 Critical | ✅ Fixed | Code review |
| 15 | No restart from end screen | 🟡 Medium | ✅ Fixed | Code review |
| 16 | Damage upgrade had no effect on weapons | 🔴 Critical | ✅ Fixed | User |
| 17 | Crits never proc from weapons | 🔴 Critical | ✅ Fixed | System audit |
| 18 | Restart from game over deadlocks | 🔴 Critical | ✅ Fixed | System audit |
| 19 | GameLoop creates duplicate loops on restart | 🔴 Critical | ✅ Fixed | System audit |
| 20 | No floating damage numbers | 🔴 Critical | ✅ Fixed | System audit |
| 21 | No boss health bar | 🔴 Critical | ✅ Fixed | System audit |
| 22 | Boss has no behavior (just chases) | 🔴 Critical | ✅ Fixed | System audit |
| 23 | Enemy behavior patterns not implemented | 🟡 Medium | ✅ Fixed | System audit |
| 24 | W1 projectile count per level ignored | 🟡 Medium | ✅ Fixed | System audit |
| 25 | W3 pulse count per level ignored | 🟡 Medium | ✅ Fixed | System audit |
| 26 | Speed Up uses wrong stat key | 🟢 Low | ✅ Fixed | System audit |
| 27 | WeaponSystem not reset on restart | 🟡 Medium | ✅ Fixed | System audit |
| 28 | Double power-ups per level (addXP while loop + key repeat) | 🔴 Critical | ✅ Fixed | User report |
| 29 | Upgrade key repeat: holding 1/2/3 applies upgrade multiple times | 🔴 Critical | ✅ Fixed | Console trace |
| 30 | Upgrade lock resets before key release (pending level-up race) | 🔴 Critical | ✅ Fixed | Gemini review |
| 30b | Double power-up: queue entry not consumed in levelUp handler | 🔴 Critical | ✅ Fixed | Claude review |

| 31 | No audio plays — missing #start-overlay element (AudioContext never unlocked) | 🔴 Critical | ✅ Fixed | Audio audit |
| 32 | Audio dies after first power-up selection — duckForLevelUp(true) called on levelUp but duckForLevelUp(false) never called in selectUpgrade handler | 🔴 Critical | ✅ Fixed | User report |

**Total: 32 bugs found, 32 fixed** (30b is root cause fix replacing #30's workaround)

---

## Pipeline Audit Results

### Pipeline 1: Stat Upgrade Propagation

| Check | Status |
|---|---|
| Damage Up mutates `player.damageMultiplier` | ✅ |
| All weapons read `damageMultiplier` dynamically | ✅ |
| Crits apply from weapon damage | ✅ (fixed #17) |
| Speed Up updates `player.speed` | ✅ (fixed #26) |
| Health Up updates `player.hp/maxHp` | ✅ |

### Pipeline 2: Lifecycle & Game Over

| Check | Status |
|---|---|
| HP ≤ 0 → death event → gameOver | ✅ |
| Timer 5:00 → survived | ✅ |
| Boss kill → victory | ✅ |
| Restart transitions state correctly | ✅ (fixed #18) |
| GameLoop doesn't duplicate on restart | ✅ (fixed #19) |
| All systems reset on restart | ✅ (fixed #27) |

### Pipeline 3: Weapon & Entity Spawning/Collision

| Check | Status |
|---|---|
| W1 fires correct projectile count | ✅ (fixed #24) |
| W2 orbs deal damage with cooldown | ✅ |
| W3 fires correct pulse count | ✅ (fixed #25) |
| Boss has charge behavior | ✅ (fixed #22) |
| Enemies have unique movement patterns | ✅ (fixed #23) |
| All collision pairs defined | ✅ |
| Per-entity damage cooldowns active | ✅ |

### Pipeline 4: Rendering & Visual Effects

| Check | Status |
|---|---|
| Floating damage numbers | ✅ (fixed #20) |
| Boss health bar | ✅ (fixed #21) |
| Area pulse ring visual | ✅ |
| Level-up screen | ✅ |
| End screen overlay | ✅ |
| Pickup text indicators | ✅ |

---

## Fixes Applied in System Audit (Batch Summary)

### Batch 1 — Infrastructure
- **GameState.reset()** — Allows clean restart from gameOver/endScreen
- **GameLoop.start() guard** — Prevents duplicate animation loops
- **startGame() calls reset** — Ensures clean state on restart

### Batch 2 — Damage System
- **Projectile hits use player crit stats** — Crits now proc from weapons
- **Area pulse uses player crit stats** — W3 crits work
- **Speed Up uses correct stat key** — `moveSpeed` instead of `speed`
- **WeaponSystem.reset()** — Clears weapon levels on restart

### Batch 3 — Visual Feedback
- **FloatingTextSystem** — Shows damage numbers, crit indicators, pickup text
- **Boss health bar** — Displays boss HP with name during fight
- **Renderer.bossEntity** — Reference set on spawn, cleared on restart

### Batch 4 — Wiring
- **FloatingTextSystem in Game** — Connected to eventBus, rendered in loop
- **Camera transform for floating text** — Text appears in world space
- **Boss entity reference** — Set on bossSpawn, cleared on restart

### Batch 5 — Gameplay
- **Boss charge behavior** — Chase → Windup → Charge → Pause cycle
- **Enemy behavior patterns** — Swarm (bat), wander_chase (ghost), ranged (caster)
- **W1 projectile count** — Fires `projectileCount` projectiles with angle spread
- **W3 pulse count** — Fires `pulseCount` pulses with 250ms delay

---

## Bug #28 — Double Power-Ups Per Level

**Date:** August 21, 2026
**Severity:** 🔴 Critical (game balance)
**Discovered by:** User manual testing

### Symptom
Player gets 2 upgrade selections when they should get 1. Makes the game too easy.

### Root Cause
`addXP` used `if` (single level-up per call) instead of `while` (all pending level-ups). When multiple XP gems are collected in one frame, each `addXP` call triggers a separate `levelUp` event. Both events queue up, creating 2 upgrade screens.

### Fix
Changed `addXP` to use `while` loop:
```javascript
// BEFORE (broken):
if (this.xp >= xpNeeded && this.queue.length < 3) { ... }

// AFTER (fixed):
while (this.xp >= xpNeeded && this.queue.length < 3) { ... }
```
Also added guard to `_showUpgradeOptions` to prevent duplicate screens during race conditions.

---

## Bug #29 — Upgrade Key Repeat Applies Upgrade Multiple Times

**Date:** August 21, 2026
**Severity:** 🔴 Critical (game balance)
**Discovered by:** Console trace analysis

### Symptom
Player picks 1 upgrade but it applies twice, making the game too easy.

### Root Cause
`keydown` event fires repeatedly when a key is held (browser key repeat). Flow:
1. User presses 1 → `selectUpgrade(index=0)` → upgrade applied, next level-up screen shown
2. Key repeat fires `keydown` within milliseconds → `selectUpgrade(index=0)` fires again
3. Guard checks: `isLevelUp() = true`, `levelUpOptions = exists` → both pass
4. Upgrade applied a **second time**

### Fix
Added `_upgradeKeyLock` debounce flag to InputManager:
- Set `true` on first keydown/click for upgrade selection
- Blocks subsequent keydown events while locked
- Reset `false` after upgrade is consumed

### Console Evidence
User's console log showed clean single emits:
```
[levelUp event] Fired at level 2   ← 1 event (correct)
[levelUp event] Fired at level 3   ← 1 event (correct)
[levelUp event] Fired at level 4   ← 1 event (correct)
```
No double emits — issue was key repeat, not event duplication.

---

## Bug #30 — Upgrade Lock Resets Before Key Release

**Date:** August 21, 2026
**Severity:** 🔴 Critical (game balance)
**Discovered by:** Gemini code review

### Symptom
With pending level-ups in queue, holding 1/2/3 applies the upgrade multiple times across sequential level-up screens.

### Root Cause
Lock was reset at the end of `selectUpgrade` handler. When there's a pending level-up, `_showUpgradeOptions()` shows the next screen while the key is still held. Lock is already false, so key repeat fires again.

```
keydown '1' → lock=true → selectUpgrade → apply → hideLevelUp →
hasPending=true → _showUpgradeOptions (new screen!) →
lock=false → key still held → keydown '1' → SELECTS AGAIN!
```

### Fix
- Removed lock reset from `selectUpgrade` handler
- Reset lock on `keyup` (when key is actually released)
- Reset lock on any `pointerdown` (cross-input cleanup)

```javascript
// keyup handler now resets lock:
window.addEventListener('keyup', (e) => {
  this.keys[e.code] = false;
  if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
    this._upgradeKeyLock = false;
  }
});
```

---

## Known Limitations (Not Bugs)

1. **Audio system** — Stub only, no sounds implemented
2. **Gold spending** — Gold has no spending mechanic in V1
3. **Weapon power spikes** — Level 4 and 7 special effects (pierce, split, afterimage, stun) not implemented
4. **Passive upgrades** — Only 3 upgrade types (Damage/Speed/Health Up) in the pool
5. **Pickup despawn** — Pickups persist until collected (no duration-based despawn)
6. **Gold counter** — Always shows 0 on end screen (gold not tracked)
7. **Caster ranged attack** — Caster keeps distance but doesn't fire projectiles
8. **Boss minion spawn** — Boss Phase 2 minion spawn not implemented
9. **Boss ground pound** — Boss Phase 2 ground pound not implemented
10. **Screen wipe visual** — Screen wipe kills enemies but no white flash effect

---

## Testing Infrastructure

### Headless Browser Tests Created
| File | Purpose |
|---|---|
| `test_upgrade_bug.cjs` | Verifies level-up selection bug exists |
| `test_upgrade_fix.cjs` | Verifies level-up fix (16/16 checks) |
| `test_enemy_fix.cjs` | Verifies enemy spawn/color fixes |
| `test_weapon_unlock.cjs` | Verifies weapon unlock logic |

### Audit Reports
| File | Purpose |
|---|---|
| `system_audit_report.md` | Full 4-pipeline audit with 14 gaps found |

---

*Report compiled from all development sessions and system audit. 27 bugs found and fixed.*
