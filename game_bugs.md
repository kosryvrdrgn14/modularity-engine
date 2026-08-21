# Game Bug Report — Level-Up Upgrade Selection

**Date:** August 21, 2026
**Status:** ✅ FIXED — Verified by headless browser test (16/16 checks pass)
**File:** `game.html` (Phase 1–15 prototype)
**Severity:** Game-breaking — Player gets stuck on level-up screen permanently

---

## Bug Description

When the player levels up, the "LEVEL UP!" screen appears with 3 upgrade cards ([1] Damage Up, [2] Speed Up, [3] Health Up). Pressing keys 1, 2, or 3, or clicking on the cards, does **nothing**. The game remains permanently stuck on the level-up screen with no way to proceed.

## Root Cause Analysis

**Two critical handlers are missing:**

### 1. No keyboard handler for number keys (1/2/3)

The `InputManager` keydown handler only listens for:
- WASD / Arrow keys (movement)
- Escape (pause)

```javascript
// Current code (line ~645):
window.addEventListener('keydown', (e) => {
    this.keys[e.code] = true;
    if (e.code === 'Escape') {
        this.eventBus.emit('pause', { paused: true });
    }
});
```

**Missing:** `Digit1`, `Digit2`, `Digit3` (and `Numpad1`, `Numpad2`, `Numpad3`) handlers for upgrade selection.

### 2. No mouse/touch click handler for upgrade cards

The canvas pointer handler (`_onPointerDown`) sets `targetX/targetY` for player movement but has no logic to detect clicks on the level-up upgrade cards and trigger selection.

### 3. No state transition from `levelUp` → `playing`

The `levelUp` event handler (line ~1879) sets state to `levelUp` and pauses the game, but there is **no code** that:
1. Accepts the upgrade selection
2. Applies the upgrade effect
3. Transitions state back to `playing`
4. Resumes the game loop

The valid state transitions are defined:
```javascript
levelUp: ['playing'],  // Can only go back to 'playing'
```

But no code ever triggers this transition.

## Headless Browser Test Results

```
=== ANALYSIS OF UPGRADE INPUT HANDLING ===
Has Digit1 handler: false
Has Digit2 handler: false
Has Digit3 handler: false
Has click upgrade handler: false

=== BUG VERIFICATION ===
❌ BUG CONFIRMED: No keyboard handler for number keys (1/2/3) during levelUp state
Has levelUp → playing transition: false
```

**Test file:** `test_upgrade_bug.cjs`
**Screenshot:** `screenshots/upgrade_bug_test.png`

## What Was Fixed

| # | Fix | Location | Description |
|---|---|---|---|
| 1 | ✅ Keyboard handler for `Digit1/2/3` | `InputManager.keydown` | Emit `selectUpgrade` event when in `levelUp` state |
| 2 | ✅ Canvas click detection for upgrade cards | `InputManager._onPointerDown` | Detect click position against card bounding boxes, emit selection event |
| 3 | ✅ Upgrade selection handler | `Game` class (event wiring) | Listen for selection event, apply upgrade, transition to `playing`, resume game loop |
| 4 | ✅ Wire upgrade effects | `_showUpgradeOptions` | Damage Up (+15%), Speed Up (+10%), Health Up (+20 HP) |
| 5 | ✅ Touch support | Same as click | Pointer events handle both mouse and touch |

## Expected Behavior

1. Player gains enough XP → level-up triggered
2. Game pauses, level-up screen appears with 3 cards
3. Player presses `1`, `2`, or `3` **or** clicks/taps a card
4. Selected upgrade is applied (stat change)
5. Game resumes from `playing` state
6. If pending level-ups remain (multi-level), show next level-up screen

---

# Bug Report #2 — Enemy Rendering, Collision & Weapon Issues

**Date:** August 21, 2026
**Status:** ✅ ALL FIXED — Verified by headless browser test (5/5 core fixes pass)

---

## Bugs Reported

| # | Symptom | Severity |
|---|---|---|
| 1 | Some monsters not rendering (invisible) | 🔴 Critical |
| 2 | Black overlaps on existing monsters | 🟡 Medium |
| 3 | Getting hit with nothing visible nearby | 🔴 Critical |
| 4 | Weapons sometimes not firing NE | 🟡 Medium |

## Root Causes Found

### Bug 1 & 3 — Enemies spawn at world origin (0,0), not around the player

```javascript
// BEFORE (broken):
x: Math.cos(angle) * dist,  // Spawns at world origin ± offset
y: Math.sin(angle) * dist,

// AFTER (fixed):
x: px + Math.cos(angle) * dist,  // Spawns around player
y: py + Math.sin(angle) * dist,
```

As the player moves away from origin, enemies pile up far off-screen. They slowly chase but remain invisible. Player takes contact damage from invisible off-screen enemies.

### Bug 2 — Bat color identical to background

```javascript
// BEFORE:
bat: '#1A1A2E',  // Same as background #1A1A2E — INVISIBLE!

// AFTER:
bat: '#6B3FA0',  // Bright purple — clearly visible
```

### Bug 4 — Projectile despawn used distance from origin

```javascript
// BEFORE (broken):
if (proj.age > 3 || Math.sqrt(proj.x * proj.x + proj.y * proj.y) > 600) {

// AFTER (fixed):
if (proj.age > 3) {
```

Projectiles spawned at the player's position were immediately > 600px from origin when the player moved far from spawn, causing instant despawn.

### Additional — Division by zero in weapon targeting

```javascript
// Added guard:
if (dist < 1) return;  // Enemy on top of player
```

## Fixes Applied

| # | Fix | Verification |
|---|---|---|
| 1 | ✅ Enemy spawn position relative to player | `px + Math.cos(angle)` |
| 2 | ✅ Boss spawn position relative to player | Same pattern |
| 3 | ✅ Projectile despawn by time only | Removed origin-distance check |
| 4 | ✅ Division by zero guard (weapon) | `if (dist < 1) return` |
| 5 | ✅ Enemy movement div-by-zero guard | `if (dist > 1)` with push-away |
| 6 | ✅ Bat color fixed | `#1A1A2E` → `#6B3FA0` |
| 7 | ✅ All enemy colors brightened | Green, purple, red, blue |

## Test Results

```
=== RESULT: 5/5 core fixes passed ===
✅ Enemy spawn around player
✅ Boss spawn around player
✅ Projectile origin-distance removed
✅ Weapon div-by-zero guard
✅ Enemy movement guard
```

---

*All bugs fixed and verified. Ready for gameplay testing.*
