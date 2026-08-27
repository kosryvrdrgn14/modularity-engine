# Session Bug Log — August 24, 2026

> **Session Focus:** Boss telegraph accuracy, debug skip-to-boss tool, boss charge direction

---

## Bug #37: Boss Hangs During Intro Sequence

**Reported:** Boss appears after warning text, game freezes  
**Root Cause:** `startBossIntro()` called `this.gameLoop.paused = true`, but `_updateBossIntro()` was called from `update()` which only runs when the loop is NOT paused. The intro timer never advanced.  
**First Fix Attempt:** Kept loop running so `update()` would tick the timer — but enemies kept moving and dealing contact damage, killing the player during the intro.  
**Final Fix:** Game loop stays paused (entities frozen), but `render()` runs every frame and ticks the intro timer with real elapsed time. Intro plays out cleanly while entities are frozen.  
**Prevention Rule:** When pausing for a non-gameplay sequence (intro, cutscene), ensure the timer advances in `render()` not `update()`, OR ensure entities can't deal damage during the paused state.

---

## Bug #38: B Key Skip-to-Boss Not Working Through Iframe

**Reported:** Press B during gameplay, nothing happens  
**Root Cause:** The `InputManager` checked `this.gameState.isPlaying()` but `InputManager` doesn't have a `gameState` reference — `this.gameState` was `undefined`, causing the check to silently fail.  
**Fix:** Removed the state check from `InputManager`, let it always emit the event, and let `Game` handle the state validation.  
**Prevention Rule:** InputManagers should emit events without state checks — let the Game class validate state in event handlers.

---

## Bug #39: B Key Sets gameTime But Doesn't Spawn Boss

**Reported:** Warning text appears but boss never spawns  
**Root Cause:** `skipToBoss()` only set `game.gameTime = 238` which triggered the announcement text at t=230, but the boss spawn at t=240 never fired because the spawn system's `bossSpawned` flag wasn't set.  
**Fix:** Changed `skipToBoss()` to call `spawnSystem._spawnBoss()` directly instead of just setting the time.  
**Prevention Rule:** Debug tools should call the actual spawn/creation method, not rely on time manipulation to trigger game events.

---

## Bug #40: `game._spawnBoss()` Is Undefined

**Reported:** B key spawns red and blue enemies but not the boss  
**Root Cause:** `_spawnBoss()` is defined on `SpawnSystem`, not `Game`. `game._spawnBoss()` called a non-existent method (undefined — no-op). The red/blue enemies were regular enemies from the wave at t=245.  
**Fix:** Changed to `game.spawnSystem._spawnBoss()`.  
**Prevention Rule:** When calling methods across systems, verify which class owns the method. `SpawnSystem` owns spawn methods, not `Game`.

---

## Bug #41: Telegraph Rectangle Drawn 90° Off From Charge Direction

**Reported:** Telegraph shows orange warning zone, but boss charges -90° from it  
**Root Cause:** `ctx.rotate(t.angle)` rotated the canvas so local X-axis = charge direction, but `fillRect(-w/2, 0, w, h)` drew the rectangle along the local Y-axis (perpendicular to charge). The rectangle extended sideways instead of forward.  
**Fix:** Changed to `fillRect(0, -w/2, h, w)` so the rectangle extends along the local X-axis (charge direction). Chevrons also updated to point forward.  
**Prevention Rule:** When using canvas rotation, verify which axis your shapes are drawn on. `fillRect(x, y, w, h)` extends w along X and h along Y — if you rotate by angle, X = angle direction.

---

## Bug #42: Telegraph Direction and Charge Direction Mismatch

**Reported:** Boss still charges at player location instead of telegraph direction  
**Root Cause:** During windup, boss tracked the player and updated `_chargeDir` every frame. When charge started, `_chargeDir` reflected the player's CURRENT position, not where the telegraph pointed at windup start. Telegraph and charge used different "snapshots" of the direction.  
**Fix:** Freeze boss during windup. Lock `_chargeDir` to the telegraph's final angle when windup ends: `boss._chargeDir = { x: Math.cos(ta), y: Math.sin(ta) }`.  
**Prevention Rule:** When a telegraph warns about an incoming attack, the attack direction must be locked to the telegraph's final state, not recalculated at attack time.

---

## Bug #43: Duplicate `_showDogDialogue` and Companion Methods

**Discovered:** TownScreen class has duplicate `_showDogDialogue`, `_showCompanionNotification`, and `_renderCompanionSlots` methods (defined twice at different line numbers).  
**Impact:** The second definition silently overwrites the first. Functionally harmless but indicates a code duplication issue from Python bulk insertions.  
**Status:** Not yet fixed — flagged for cleanup.  
**Prevention Rule:** After any bulk code insertion via Python/regex, scan for duplicate method definitions in the same class.

---

## Key Design Discoveries

### Telegraph-Charge Synchronization Pattern
For boss attacks with telegraph warnings:
1. **Windup phase:** Boss freezes, telegraph shows danger zone
2. **Telegraph updates:** Track player, update telegraph position/angle in real time
3. **Windup end:** Lock attack direction to telegraph's FINAL angle
4. **Attack phase:** Execute attack in locked direction

This pattern ensures the telegraph is always truthful — the player sees exactly where the attack will land.

### Canvas Rotation Axis Convention
- `ctx.rotate(angle)` makes local X-axis point in direction `angle`
- `fillRect(x, y, w, h)` extends `w` along local X, `h` along local Y
- To draw a rectangle extending forward in the rotation direction: use `fillRect(0, -crossSection/2, length, crossSection)`

### Debug Tool Best Practices
- Call the actual method on the owning system, not a pass-through on Game
- Don't rely on time manipulation — directly invoke spawn/creation
- Always verify which class owns the method via grep before writing debug code
