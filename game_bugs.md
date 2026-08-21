# Game Bug Report — Level-Up Upgrade Selection

**Date:** August 21, 2026
**Status:** 🔴 CONFIRMED — Critical
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

## What Needs to Be Fixed

| # | Fix | Location | Description |
|---|---|---|---|
| 1 | Add keyboard handler for `Digit1/2/3` | `InputManager.keydown` | Emit upgrade selection event when in `levelUp` state |
| 2 | Add canvas click detection for upgrade cards | `InputManager._onPointerDown` or `UIManager` | Detect click position against card bounding boxes, emit selection event |
| 3 | Add upgrade selection handler | `Game` class (event wiring) | Listen for selection event, apply upgrade, transition to `playing`, resume game loop |
| 4 | Wire upgrade effects | `LevelingSystem` or `WeaponSystem` | Actually apply Damage Up / Speed Up / Health Up stat changes |
| 5 | Add touch support for upgrade cards | `InputManager` pointer handlers | Same as click but for touch events on mobile |

## Expected Behavior

1. Player gains enough XP → level-up triggered
2. Game pauses, level-up screen appears with 3 cards
3. Player presses `1`, `2`, or `3` **or** clicks/taps a card
4. Selected upgrade is applied (stat change)
5. Game resumes from `playing` state
6. If pending level-ups remain (multi-level), show next level-up screen

## Additional Notes

- The upgrade cards show "Damage Up", "Speed Up", "Health Up" as placeholder names — the actual upgrade pool should pull from the weapon/passive data in `07_leveling_system_spec.md`
- The card UI rendering works (cards are drawn on canvas), only the input handling is missing
- This bug was introduced in Phase 15 (Integration) when the levelUp event was added but the selection handler was never wired up

---

*Reported by automated Playwright test — `test_upgrade_bug.cjs`*
