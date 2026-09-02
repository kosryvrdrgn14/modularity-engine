# Game Bug Report — Master Log

**Project:** Modularity Engine (Vampire Survivors Prototype)
**Files:** `public/game2.html` + 28 modular files (post-split)
**Last Updated:** August 31, 2026 (v1.0.0)

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
| 33 | Game freeze: _playPowerUpArpeggio is not a function — undefined method called in pickup handler for weapon_levelup/magnet/health pickups | 🔴 Critical | ✅ Fixed | User report |
| 34 | NPC portrait not rendering — base64 data URI SVGs in `<img>` tags fail in iframe/CSP contexts | 🟡 Medium | ✅ Fixed | User report |
| 35 | Elder Rowan dialogue stuck on greeting — _showChoices indentation corrupted during Python code replacement | 🔴 Critical | ✅ Fixed | User report |
| 36 | W3 area pulse never fires — _updateW3Pulses defined but never called from WeaponSystem.update() | 🔴 Critical | ✅ Fixed | Code review |
| 37 | Boss hangs during intro — gameLoop.paused=true prevents _updateBossIntro from ticking | 🔴 Critical | ✅ Fixed | User report |
| 38 | B key skip-to-boss not working — InputManager has no gameState reference, check silently fails | 🟡 Medium | ✅ Fixed | User report |
| 39 | B key shows warning text but boss never spawns — only set gameTime, didn't call _spawnBoss | 🟡 Medium | ✅ Fixed | User report |
| 40 | game._spawnBoss() is undefined — method lives on SpawnSystem, not Game | 🔴 Critical | ✅ Fixed | User report |
| 41 | Telegraph rectangle drawn 90° off — fillRect draws along local Y-axis after ctx.rotate | 🔴 Critical | ✅ Fixed | User report |
| 42 | Boss charges at player instead of telegraph direction — _chargeDir recalculated at charge start instead of locked to telegraph angle | 🔴 Critical | ✅ Fixed | User report |
| 43 | Duplicate _showDogDialogue/companion methods — two identical definitions from Python bulk insert | 🟡 Low | ✅ Fixed | Removed 79 duplicate lines |
| — | Companion system implemented | ℹ️ Feature | ✅ Complete | Spec + Implementation |
| 44 | townScreen partyBtn ReferenceError — deleted DOM element still referenced in _setupEvents | 🔴 Critical | ✅ Fixed | Claude ESLint audit |
| 45 | Companion growl cone renders at wrong position — screen.x/screen.y used instead of s.x/s.y | 🟡 Medium | ✅ Fixed | Claude ESLint audit |
| 46 | Double power-up: mouse+key race condition on upgrade selection | 🔴 Critical | ✅ Fixed | Gemini review |
| 47 | Empty wave compositionWeights crash when spawnRate=0 | 🟡 Medium | ✅ Fixed | Phase 1.3 audit |
| 48 | Data sync drift between embeddedData.js and content/*.json | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 49 | Ghoul lunge behavior not implemented in MovementSystem | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 50 | Necromancer phase attacks not implemented | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 51 | Necromancer portrait SVG not wired into boss intro overlay | 🟢 Low | 🟡 Open | Phase 1.3 audit |
| 52 | Fast-forward testing unreliable (bypasses game state logic) | 🟢 Low | 🟡 Open | Phase 1.3 audit |
| 53 | stageId/tier undefined in DEV stage selector click callback | 🔴 Critical | ✅ Fixed | Dev loadout selector |
| 54 | Quote escaping in str_replace broke engine/titleMenu.js | 🟡 Medium | ✅ Fixed | Dev loadout selector |
| 55 | _activeWeapons not used in upgrade/unlock/pickup logic | 🔴 Critical | ✅ Fixed | Dev loadout selector |
| 46 | Double power-up persists — mouse click and key events both fire selectUpgrade without shared guard | 🔴 Critical | ✅ Fixed | Gemini + Claude review |
| 47 | SpawnSystem compositionWeights crash on empty waves — wave with spawnRate=0 still triggers _spawnEnemy | 🟡 Medium | ✅ Fixed | Phase 1.3 gap test |
| 48 | Data sync drift — embeddedData.js and content/*.json can have different enemy/stage counts | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 49 | Ghoul lunge behavior not implemented — data defined but MovementSystem has no ghoul_lunge handler | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 50 | Necromancer magic/skull/shadowStep attacks not implemented — data has 3 phases but engine only handles charge | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 51 | Necromancer boss portrait not wired into intro overlay — SVG exists but not rendered | 🟢 Low | 🟡 Open | Phase 1.3 audit |
| 52 | Fast-forward testing unreliable — setting spawnSystem.gameTime directly bypasses game state checks | 🟢 Low | 🟡 Open | Phase 1.3 test methodology |

**Total: 62 bugs found, 56 fixed, 6 open**

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

## Bug #34 — NPC Portrait Not Rendering

**Date:** August 24, 2026
**Severity:** 🟡 Medium (visual)
**Discovered by:** User manual testing

### Symptom
NPC portraits (Elder Rowan, Lina) show broken image icons or blank circles in both the NPC card and dialogue overlay.

### Root Cause
Portraits were loaded as `<img src="data:image/svg+xml;base64,...">` or `<img src="assets/npc_old_man.svg">`. In iframe contexts (Freebuff preview) and some browsers, base64 data URI SVGs in `<img>` tags are blocked by CSP policies or fail to decode. File-path `<img>` tags also fail when served through certain proxy configurations.

### Fix
Switched from `<img>` tags to **inline SVG elements**:
1. Created `SVG_PORTRAITS` map with raw SVG strings (not data URIs)
2. Changed `dialogue-portrait` from `<img>` to `<div>`
3. NPC cards now inject `<svg>` elements via `innerHTML` instead of `<img>` tags
4. `_openDialogue()` sets `dialoguePortrait.innerHTML` to styled SVG

```javascript
// BEFORE (broken in iframe):
<img class="npc-portrait" src="${npc.portrait}" />

// AFTER (works everywhere):
const svgHtml = SVG_PORTRAITS[npc.id] || '<div class="npc-portrait"></div>';
const svgWithClass = svgHtml.replace('<svg ', '<svg class="npc-portrait" ');
card.innerHTML = `${svgWithClass}<div class="npc-info">...</div>`;
```

### Prevention Rule
> **Never use `<img>` tags with data URI SVGs or file-path SVGs for game assets that may render in iframes.** Always use inline SVG elements via `innerHTML` injection from a pre-loaded SVG map.

---

## Bug #35 — Elder Rowan Dialogue Stuck on Greeting

**Date:** August 24, 2026
**Severity:** 🔴 Critical (dialogue broken)
**Discovered by:** User manual testing

### Symptom
Elder Rowan's dialogue shows the greeting text via typewriter but never progresses to show dialogue choices. The dialogue is stuck. Lina's dialogue works correctly.

### Root Cause
During a Python-based code replacement (to add SVG_PORTRAITS map and update `_openDialogue`), the `_showChoices` method was re-inserted with **4 spaces** of indentation instead of the class-standard **2 spaces**:

```javascript
// CORRECT (2 spaces — matches class method convention):
  _showChoices(npc) {
    this.dom.dialogueChoices.innerHTML = '';
    ...
  }

// CORRUPTED (4 spaces — from Python replacement):
    _showChoices(npc) {
    this.dom.dialogueChoices.innerHTML = '';
    ...
    }
```

The extra indentation caused `_showChoices` to be parsed with inconsistent brace alignment, breaking the callback chain in `_openDialogue` → `_typewriteText` → `onComplete` → `_showChoices`. The typewriter completed but the callback silently failed.

### Fix
Corrected `_showChoices` indentation to 2 spaces, matching all other class methods.

### Prevention Rule
> **When using Python/regex to insert code into JavaScript class methods, always verify the indentation matches the surrounding methods (2 spaces for this project).** Run a visual diff or parse check after any bulk code insertion.

### Related Prevention Checklist
- [ ] After any Python-based code insertion, verify all class methods use consistent indentation
- [ ] Run `node -e "new Function(html.match(/<script>([\s\S]*)<\/script>/)[1])"` to verify parse
- [ ] Check that callback chains (`_typewriteText` → `onComplete` → `_showChoices`) resolve correctly

### Regression (August 26, 2026)
Bug recurred during Phase D-E code insertions. Same symptom: greeting shows but choices never appear.

**Regression fix:** Added defensive guards to dialogue system:
- `_typewriteText`: handles null/undefined text gracefully (calls onComplete immediately)
- `_showChoices`: guards against null `topic.response` before calling typewriteText
- `_openDialogue`: guards against missing npc/topics/greeting
- Added optional chaining (`?.`) to all `audioManager` calls in dialogue

**Root cause pattern:** Python-based code insertion can corrupt method boundaries or introduce null references. The defensive guards prevent any single null/missing value from breaking the entire dialogue chain.

---

## Bug #36 — W3 Area Pulse Never Fires

**Date:** August 24, 2026
**Severity:** 🔴 Critical (weapon broken)
**Discovered by:** Code review

### Symptom
Weapon 3 (Area Pulse) fires but the pulse effect never triggers — no damage, no visual. The weapon appears to do nothing.

### Root Cause
`_updateW3Pulses(dt)` was defined in WeaponSystem but **never called** from `WeaponSystem.update()`. The pulse queue filled up but was never processed.

```javascript
// update() method — _updateW3Pulses was missing:
update(dt) {
  this._fireW1(dt);
  this._fireW2(dt);
  this._fireW3(dt);
  // _updateW3Pulses(dt) was never here!
  this._updateOrbitPositions(dt);
}
```

### Fix
Added the missing call:
```javascript
update(dt) {
  this._fireW1(dt);
  this._fireW2(dt);
  this._fireW3(dt);
  this._updateW3Pulses(dt);  // ← added
  this._updateOrbitPositions(dt);
}
```

### Prevention Rule
> **When creating a queue-based deferred system (like `_w3PulseQueue`), always ensure the queue processor is called from the main update loop.** Search for all `_queue` variables and verify each has a corresponding `_update*` call in `update()`.

---

## Bug #44 — Undeclared `partyBtn` Crashes TownScreen Constructor

**Date:** August 27, 2026
**Severity:** 🔴 Critical (game won't load — blank screen)
**Discovered by:** Claude analysis (ESLint no-undef)

### Symptom
Preview shows a blank dark screen after loading. Loading screen hides, but title screen never appears. No error visible to user.

### Root Cause
During the town UI refactor (switching from action bar to bottom dock), the `#ab-party` HTML element was removed, but the event listener referencing its variable was left behind:

```javascript
// In TownScreen._setupEvents(), called from constructor:
if (partyBtn) partyBtn.addEventListener('click', () => {
  this.game.audioManager.playMenuSound('select');
  // Party management — show companion slots (already visible)
});
```

`partyBtn` was **never declared** (no `const`, no `getElementById`). Accessing an undeclared variable throws `ReferenceError`, which crashes the TownScreen constructor. Since `TownScreen` is created before `titleMenu.show()`, the title screen never renders.

### Fix
Deleted the dead 4-line block. The party button was intentionally folded into always-visible companion slots.

### Prevention Rule
> **When removing a UI element, grep the entire file for every reference to that variable or ID name before considering the removal "done."** Don't trust that a single-pass edit caught every reference. LLMs frequently remove an element (button + getElementById) but miss downstream event listeners in the same function. Always: `grep -n 'variableName' file.html` after removing an element.

---

## Bug #45 — Companion Growl Cone Renders at Wrong Position

**Date:** August 27, 2026
**Severity:** 🟡 Visual (silent glitch — no crash)
**Discovered by:** Claude analysis

### Symptom
The companion's growl cone effect renders offset from the companion sprite instead of centered on it. Not a crash because `screen` resolves to `window.screen` (the browser Screen API) which has no `.x/.y`, so `ctx.translate(undefined, undefined)` silently does nothing.

### Root Cause
In the companion sprite draw function, the growl cone block used `screen.x/screen.y` instead of `s.x/s.y`:

```javascript
// Every other line uses s.x, s.y (companion's screen position):
ctx.ellipse(s.x - sz * 0.4, s.y + sz * 0.05, ...);

// But growl cone used screen.x/screen.y (browser Screen API):
ctx.translate(screen.x, screen.y);  // ← BUG: should be s.x, s.y
```

### Fix
Changed `screen.x/screen.y` → `s.x/s.y` to match the rest of the drawing function.

### Prevention Rule
> **When copy-pasting drawing code blocks, verify that positional variables match the local scope.** `screen` is a browser global — referencing it accidentally won't crash, it will silently render at the wrong position. Always grep for `screen.x` and `screen.y` in canvas draw functions to catch this pattern.

---

## Bug #46 — Double Upgrade Regression (Bug #28/30 Re-fix)

**Date:** August 27, 2026
**Severity:** 🔴 Critical (game balance)
**Discovered by:** Cross-check audit
**Regression of:** Bug #28, Bug #30

### Symptom
Player receives 2 upgrades per single level-up during queued level-ups (e.g., gaining 2+ levels at once). Same symptom as original Bug #28.

### Root Cause
Town layout refactor removed the `_isSelectingUpgrade` processing guard from the `selectUpgrade` handler. Additionally, `_onPointerDown` had a broken pattern: it reset `_upgradeKeyLock = false` at the top, then immediately checked `!_upgradeKeyLock` — making the lock useless for mouse clicks.

```javascript
// Broken: reset defeats the lock
_onPointerDown(screenX, screenY) {
  this._upgradeKeyLock = false;  // ← always resets
  ...
  if (!this._upgradeKeyLock) {   // ← always true
    this._upgradeKeyLock = true;
    this.eventBus.emit('selectUpgrade', { index: cardIndex });
  }
}
```

### Fix (4 changes)
1. Added `_isSelectingUpgrade` guard to `selectUpgrade` handler
2. Reset `_isSelectingUpgrade = false` on state transition to 'playing'
3. Reset `_isSelectingUpgrade = false` before showing next queued upgrade
4. Removed broken `_upgradeKeyLock = false` reset from `_onPointerDown`

### Prevention Rule
> **When refactoring UI code, grep for all debounce/guard variables (`_isSelectingUpgrade`, `_upgradeKeyLock`, etc.) to ensure they survive the refactor.** Town layout refactor touched `_setupEvents()` and accidentally removed upgrade guards. Always verify guard logic after bulk code moves.

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

*Report compiled from all development sessions and system audit. 46 bugs found and fixed.*

---


---

## Companion System — Implementation Notes (v0.3.0)

**Added:** August 24, 2026
**Spec:** `20_companion_combat_spec.md`, `21_companion_engine_integration.md`

### What Was Built

| Component | Description | Lines |
|---|---|---|
| CompanionSystem class | AI state machine (follow → attackRun → growl → return) | ~200 |
| COMPANION_DATA constant | Dog stats per level (7 levels) | ~30 |
| isInCone() helper | Cone collision check for growl attack | ~15 |
| companionDamage handler | DamageSystem integration for companion attacks | ~25 |
| companionLootCollect handler | PickupSystem integration for loot collection | ~5 |
| weaponLevelUp sync | Dog stats update when W1 upgrades | ~5 |
| bossIntro reset | Companion state reset during boss intro | ~3 |
| Safety timeout | 3s attack run limit prevents infinite chase | ~5 |
| Companion audio | Growl + bark synthesized sounds | ~30 |
| Companion rendering | Body, collar, eyes, growl cone effect | ~80 |

### Bugs/Gap Resolutions

| # | Gap | Resolution |
|---|---|---|
| 1 | No companion data schema | Created `COMPANION_DATA` constant with 7-level stat table |
| 2 | Level sync with weapon | Added `weaponLevelUp` event listener that calls `companionSystem.setLevel()` |
| 3 | Boss intro companion freeze | Added `bossIntro` event listener that forces all companions to `return` state |
| 4 | Infinite chase safety | Added 3s `_attackRunTimer` limit — forces return if target unreachable |

### Design Decisions (Confirmed)

| Decision | Choice | Rationale |
|---|---|---|
| Slow effect on growl | No (v1) | Pure damage. Utility companions later. |
| Auto loot pickup | Yes, 40px range | Mini extension of player looting range. |
| Scale with player damage stat | No initially | Test first, rebalance later. |
| Dog only if petted | Yes | Clear player choice consequence. |

### Potential Issues to Watch

| Issue | Risk | Mitigation |
|---|---|---|
| Multiple companions targeting same enemy | Low (v1 has only Dog) | Future: target-lock system |
| Companion stuck in geometry | Medium | 3s safety timeout handles this |
| Companion during level-up screen | Low | Level-up pauses game, companion state frozen |
| Performance with 3 companions | Low | Only 3 entities max, simple AI |

## Prevention Checklist — Recurring Patterns

These bugs share common root causes. Use this checklist after any code change session:

### 1. Indentation & Formatting
| Check | Why |
|---|---|
| Class methods use consistent 2-space indentation | Bug #35: wrong indentation broke callback chain |
| Python/regex insertions preserve surrounding formatting | Bulk replacements can corrupt indentation |
| Run parse check after any code insertion | Catches syntax errors before user testing |

### 2. Queue-Based Systems
| Check | Why |
|---|---|
| Every `_queue` variable has a processor in `update()` | Bug #36: W3 pulse queue never processed |
| Every `setInterval`/`setTimeout` has a cleanup path | Prevents post-game-over callbacks |
| Deferred systems respect pause state | Prevents damage during menus/intros |

### 3. Asset Loading
| Check | Why |
|---|---|
| No `<img>` tags with data URI SVGs in iframe contexts | Bug #34: CSP blocks data URIs |
| Inline SVG elements used for all NPC/entity portraits | Works in all browser contexts |
| SVG_PORTRAITS map checked before rendering | Prevents undefined/null SVG errors |

### 4. Callback Chains
| Check | Why |
|---|---|
| `onComplete` callbacks verified with console.log during dev | Bug #35: silent callback failure |
| Typewriter → choices → response → continue loop tested end-to-end | Prevents stuck dialogue |

### 5. Pause & Intro Sequences
| Check | Why |
|---|---|
| Intro/cutscene timers advance in `render()`, not `update()` | Bug #37: paused game loop prevents timer from ticking |
| Entities can't deal damage during paused intro states | Prevents player death during non-gameplay sequences |
| Boss state resets companions and projectile systems on intro start | Prevents stale AI running during cutscene |

### 6. Cross-System Method Calls
| Check | Why |
|---|---|
| Verify which class owns a method before calling it | Bug #40: `_spawnBoss` is on SpawnSystem, not Game |
| Debug tools call actual spawn/creation methods, not time hacks | Bug #39: setting gameTime doesn't trigger spawn logic |
| InputManagers emit events without state checks | Bug #38: InputManager lacked gameState reference |

### 7. Telegraph & Attack Synchronization
| Check | Why |
|---|---|
| Telegraph direction matches attack direction (same angle source) | Bug #41: canvas rotation axis mismatch |
| Attack direction locked at windup end, not recalculated at attack start | Bug #42: telegraph and charge used different direction snapshots |
| `fillRect` dimensions verified against canvas rotation axis | X-axis = rotation direction, Y-axis = perpendicular |

### 8. Bulk Code Insertion
| Check | Why |
|---|---|
| Scan for duplicate method definitions after Python/regex insertions | Bug #43: duplicate _showDogDialogue from repeated inserts |
| Verify class method count matches expected after bulk edits | Catches accidental duplications early |
| Event handlers removed/replaced on re-open | Prevents stale listener accumulation |

### 9. UI Element Removal
| Check | Why |
|---|---|
| `grep -n 'varName' file.html` after removing any element/variable | Bug #44: partyBtn deleted but event listener left behind |
| Trace every reference from declaration to end of function scope | Prevents orphaned references to removed DOM elements |
| Check constructor/init chains for downstream dependencies | partyBtn crash blocked titleMenu.show() two lines later |
| Remove HTML element + getElementById + ALL event listeners in one pass | Partial removals are the root cause of orphan variable crashes |

### 10. Canvas Drawing & Coordinate Systems
| Check | Why |
|---|---|
| `grep -n 'screen\.x\|screen\.y' file.html` in canvas draw functions | Bug #45: screen.x silently resolves to browser Screen API, not sprite position |
| Verify positional variables match local scope (s.x vs screen.x vs entity.x) | Copy-paste errors introduce wrong coordinate systems |
| Browser globals like `screen`, `location`, `name` won't crash when used wrongly | Silent misrendering is harder to find than crashes |

### 11. Refactor Isolation Protocol
| Check | Why |
|---|---|
| **Isolate before refactoring**: identify ALL methods/variables in the affected scope before touching code | Bug #44 + #46: town layout refactor accidentally dropped partyBtn + upgrade guards |
| List every guard/lock/debounce variable in the target scope before starting | Prevents silent removal of safety logic during restructuring |
| Refactor in small steps — move one block at a time, verify parse + guard survival after each step | Bulk moves make it impossible to tell which step broke what |
| After refactor, grep for every guard variable name across the entire file | Catches orphaned references and missing guards in one pass |


---

## Phase 1.1–1.3 Bugs (August 29, 2026)

### Bug #44 — townScreen partyBtn ReferenceError (Crash)

**Severity:** 🔴 Critical  
**Discovered by:** Claude ESLint static analysis  
**Status:** ✅ Fixed

### Symptom
Title screen shows blank/loading screen after town UI refactor. Game never starts.

### Root Cause
During the town UI refactor, the `partyBtn` DOM element was removed (feature folded into always-visible companion slots), but the `_setupEvents()` method still referenced it via `partyBtn.addEventListener(...)`. Since `partyBtn` was never declared, JavaScript throws `ReferenceError` and halts the `TownScreen` constructor, which prevents `titleMenu.show()` from running.

### Fix
Deleted the orphaned `if (partyBtn) { ... }` block (3 lines).

### Lesson
**Pattern to watch for:** When removing a UI element, grep for its variable/ID name across the entire file to catch every downstream reference. Partial removals are the root cause of orphan variable crashes.

---

### Bug #45 — Companion Growl Cone Renders at Wrong Position

**Severity:** 🟡 Medium  
**Discovered by:** Claude ESLint static analysis  
**Status:** ✅ Fixed

### Symptom
Dog's growl cone visual effect renders at wrong transform origin instead of centered on the companion sprite.

### Root Cause
The companion sprite draw function uses `s.x`/`s.y` for all visual elements (eyes, nose, mouth), but the growl cone block accidentally uses `screen.x`/`screen.y`. `window.screen` (the browser Screen API) has no `.x`/`.y` properties, so it resolves to `undefined`, causing the cone to render at the wrong position.

### Fix
Changed `ctx.translate(screen.x, screen.y)` to `ctx.translate(s.x, s.y)`.

---

### Bug #46 — Double Power-Up on Mouse Click + Key

**Severity:** 🔴 Critical  
**Discovered by:** Gemini code review + Claude analysis  
**Status:** ✅ Fixed

### Symptom
Player gets 2 upgrade selections when they should get 1, even after the key repeat fix (#29).

### Root Cause
Two separate input paths fire `selectUpgrade`:
1. `keydown` handler with `_upgradeKeyLock` debounce (fixed in #29)
2. `_onPointerDown` handler for mouse/touch clicks — does NOT share the same lock

A rapid click or touch during the brief window between `levelUp` event and state transition allows both inputs to fire.

### Fix
Added `_isSelectingUpgrade` guard flag in Game's `selectUpgrade` handler. Both keyboard and mouse/touch paths check this flag before processing.

---

### Bug #47 — SpawnSystem compositionWeights Crash on Empty Waves

**Severity:** 🟡 Medium  
**Discovered by:** Phase 1.3 comprehensive gap test  
**Status:** ✅ Fixed

### Symptom
Console error: `Cannot read properties of undefined (reading 'zombie')` during gameplay on the extended 10-minute stage.

### Root Cause
The extended stage has an empty wave (8:30-8:35) with `spawnRate: 0` and empty `compositionWeights: {}`. The SpawnSystem's `_spawnEnemy` method tries to look up `weights[enemy.id]` for each enemy type, but when the wave has no composition weights and spawnRate is 0, it should skip spawning entirely. The guard only checked `if (!wave)` but not the spawn rate.

### Fix
Added guard: `if (!wave || !wave.spawnRate || wave.spawnRate <= 0) return;`

---

### Bug #48 — Data Sync Drift Between Files

**Severity:** 🟡 Medium  
**Discovered by:** Phase 1.3 audit  
**Status:** 🟡 Open

### Symptom
`embeddedData.js` and `content/*.json` can have different enemy/stage counts. The game loads JSON first, falls back to embedded data, but they can drift out of sync.

### Impact
If JSON files fail to load (CORS on file:// protocol), the embedded fallback may be outdated. Currently:
- enemies.json has 10 enemies (correct)
- embeddedData.js has 13 enemies (includes extras from earlier iteration)
- leveling.json has 13 XP curve entries, embeddedData.js has 14

### Recommended Fix
Add a build script that regenerates `embeddedData.js` from `content/*.json`, or consolidate to a single source of truth.

---

### Bug #49 — Ghoul Lunge Behavior Not Implemented

**Severity:** 🟡 Medium  
**Discovered by:** Phase 1.3 audit  
**Status:** 🟡 Open

### Symptom
Ghoul miniboss spawns with correct stats (300 HP, 18 DMG) but behaves as a regular chase enemy instead of performing its lunge attack.

### Root Cause
The enemy data defines `behavior.pattern: "ghoul_lunge"` with lunge parameters, but MovementSystem only handles `chase`, `swarm`, `wander_chase`, `ranged`, and `boss_charge` patterns. The `ghoul_lunge` pattern falls through to default chase behavior.

### Recommended Fix
Implement ghoul lunge behavior: idle (2s) → windup telegraph (0.5s) → lunge dash (200px at 300 speed) → stunned (1.5s) → repeat.

---

### Bug #50 — Necromancer Phase Attacks Not Implemented

**Severity:** 🟡 Medium  
**Discovered by:** Phase 1.3 audit  
**Status:** 🟡 Open

### Symptom
Necromancer boss has 3 phases defined with magic bolts, skull rings, and shadow step, but only uses basic charge behavior.

### Root Cause
The boss behavior system handles `boss_charge` pattern with minion spawning, but the Necromancer's additional attack types (`magicBolt`, `skullRing`, `shadowStep`) are defined in data but not processed by the engine.

### Recommended Fix
Extend boss behavior to process phase-specific attack properties:
- `magicBolt`: periodic projectile toward player
- `skullRing`: expanding ring of projectiles
- `shadowStep`: teleport behind player with windup telegraph

---

### Bug #51 — Necromancer Portrait Not Wired Into Boss Intro

**Severity:** 🟢 Low  
**Discovered by:** Phase 1.3 audit  
**Status:** 🟡 Open

### Symptom
Necromancer boss intro shows name/subtitle text but no portrait image.

### Root Cause
The boss intro overlay system renders text (name, subtitle) and a dim overlay, but doesn't load or display the boss portrait SVG. The `necromancer_portrait.svg` file exists in `public/assets/` but is not referenced in the intro rendering code.

### Recommended Fix
Wire portrait SVG into boss intro: check `boss.intro.portrait` in data, load the SVG, and render it centered during the intro sequence.

---

### Bug #52 — Fast-Forward Testing Unreliable

**Severity:** 🟢 Low  
**Discovered by:** Phase 1.3 test methodology  
**Status:** 🟡 Open

### Symptom
Setting `spawnSystem.gameTime` directly in tests doesn't trigger boss spawning or wave transitions because the game's `update()` method checks `gameState.isPlaying()` and other state guards.

### Root Cause
The game loop manages state transitions (level-up, boss intro, game over) that block `update()` from advancing. Manually setting time bypasses these guards but also bypasses the actual game logic that needs to run.

### Recommended Fix
Add a `game.debugSkipToTime(seconds)` method that:
1. Sets the game state to 'playing'
2. Runs the game loop forward in controlled ticks
3. Handles any state transitions that occur (level-ups, boss intros)

---

| 46 | Double power-up: mouse+key race condition on upgrade selection | 🔴 Critical | ✅ Fixed | Gemini review |
| 47 | Empty wave compositionWeights crash when spawnRate=0 | 🟡 Medium | ✅ Fixed | Phase 1.3 audit |
| 48 | Data sync drift between embeddedData.js and content/*.json | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 49 | Ghoul lunge behavior not implemented in MovementSystem | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 50 | Necromancer phase attacks not implemented | 🟡 Medium | 🟡 Open | Phase 1.3 audit |
| 51 | Necromancer portrait SVG not wired into boss intro overlay | 🟢 Low | 🟡 Open | Phase 1.3 audit |
| 52 | Fast-forward testing unreliable (bypasses game state logic) | 🟢 Low | 🟡 Open | Phase 1.3 audit |
| 53 | stageId/tier undefined in DEV stage selector click callback | 🔴 Critical | ✅ Fixed | Dev loadout selector impl |
| 54 | Quote escaping in str_replace broke engine/titleMenu.js syntax | 🟡 Medium | ✅ Fixed | Dev loadout selector impl |
| 55 | _activeWeapons not used in upgrade/unlock/pickup logic — dev picks excluded from upgrade pool | 🔴 Critical | ✅ Fixed | Dev loadout selector impl |

---

## Detailed Bug Reports — Session August 29, 2026 (Dev Loadout Selector)

---

### Bug #53 — stageId/tier Undefined in DEV Stage Selector Click Callback

**Severity:** 🔴 Critical  
**Discovered by:** Dev loadout selector implementation  
**Status:** ✅ Fixed

### Symptom
Clicking a tier button in the DEV stage selector would call `_showWeaponSelector(stageId, tier)` but both variables were `undefined` in the `forEach` callback scope. This caused the weapon selector to receive `undefined, undefined` and fail to load the correct stage loadout for default weapon selection.

### Root Cause
The `forEach` callback parameter was `btn`, and the click handler used `stageId` and `tier` which were never declared in that scope. The correct values are `btn.dataset.stage` and `btn.dataset.tier` (which are set as data attributes on the tier buttons).

```javascript
// BROKEN:
btn.addEventListener('click', () => {
  this._showWeaponSelector(stageId, tier);  // stageId and tier are undefined!
});

// FIXED:
btn.addEventListener('click', () => {
  this._showWeaponSelector(btn.dataset.stage, btn.dataset.tier);
});
```

### Impact
The weapon selector received `undefined` parameters, so the default weapon loadout was not loaded from the correct stage data. This broke the entire DEV loadout flow.

### Prevention Rule
When using `forEach` or `map` callbacks, always verify that variables referenced inside the callback are either declared in the callback scope, passed as parameters, or accessible via the callback parameter (e.g., `btn.dataset`). Never assume outer-scope variables are accessible in arrow function callbacks without explicit closure.

---

### Bug #54 — Quote Escaping in str_replace Broke engine/titleMenu.js Syntax

**Severity:** 🟡 Medium  
**Discovered by:** Syntax check after dev loadout implementation  
**Status:** ✅ Fixed

### Symptom
After inserting the `_showWeaponSelector` method via `str_replace`, `node -c engine/titleMenu.js` reported `Unexpected token ';'` at line 268.

### Root Cause
The `str_replace` tool inserted `opacity +;\">';` where `\"` inside the JS source code was interpreted as a literal double-quote character that broke the string concatenation. The correct code should have been `+ opacity + ';">';`.

```javascript
// BROKEN (syntax error):
html += '<div ... opacity:' + opacity +;\">';
//                                              ^ " breaks the string

// FIXED:
html += '<div ... opacity:' + opacity + ';">';
```

### Impact
The entire `engine/titleMenu.js` file was syntactically invalid and could not be loaded by the browser. The inline copy in `game2.html` was correct (inserted via Python) so the game still worked, but the split file was broken.

### Prevention Rule
When inserting JavaScript string concatenation via `str_replace` or Python bulk edits, always verify the resulting file passes `node --check` before considering the edit complete. Pay special attention to quote characters (`'`, `"`, `\`) in HTML attribute strings — these are the most common source of syntax errors in template literal concatenation.

---

### Bug #55 — _activeWeapons Not Used in Upgrade/Unlock/Pickup Logic

**Severity:** 🔴 Critical  
**Discovered by:** Dev loadout selector design review  
**Status:** ✅ Fixed

### Symptom
When using the DEV loadout to bring weapons not in the stage loadout (e.g., Dagger `w6_shadow_dagger` alongside the standard Projectile+Orbit+Area loadout), those weapons would:
1. Never appear in level-up upgrade options
2. Never auto-unlock when the player reached the weapon's `unlockLevel`
3. Never be upgraded by `pickup_weapon_level_up` pickups

### Root Cause
Three methods in `Game` used `_currentStageWeapons` (the stage's loadout) instead of the combined set of stage weapons + dev-chosen weapons:

```javascript
// _checkWeaponUnlocks(): only unlocked weapons in _currentStageWeapons
if (!this._currentStageWeapons?.includes(weapon.id)) continue;

// _showUpgradeOptions(): only showed upgrades for _currentStageWeapons
const activeWeaponIds = this._currentStageWeapons || ...

// _applyWeaponLevelUp(): only leveled up _currentStageWeapons
const weaponIds = this._currentStageWeapons || ...
```

### Fix
Introduced `_activeWeapons` — a union (Set) of stage loadout weapons and dev-chosen weapons:

```javascript
// In startGame():
const stageWeapons = loadout ? loadout.weapons : [...];
const devWeapons = this.gameManager.get('session.dev_weapons');
if (devWeapons && devWeapons.length > 0) {
  this._activeWeapons = [...new Set([...stageWeapons, ...devWeapons.filter(Boolean)])];
} else {
  this._activeWeapons = [...stageWeapons];
}

// All three methods now use _activeWeapons:
if (!this._activeWeapons?.includes(weapon.id)) continue;
const activeWeaponIds = this._activeWeapons || ...;
const weaponIds = this._activeWeapons || ...;
```

### Impact
Without this fix, the DEV weapon selector was functionally useless — weapons selected outside the stage loadout had no effect during gameplay. This also affects the future production weapon selection system where players choose which weapons to bring to a stage.

### Prevention Rule
When introducing a new data source (dev loadout, player inventory, etc.), trace ALL downstream consumers that use the old data source. A `grep` for the old variable name (`_currentStageWeapons`) should have been run to find every reference before making the change. This is the same pattern as the `partyBtn` bug (#44) — modifying a data source without updating all consumers.

---

*Dev Loadout Selector session bugs: 3 found, 3 fixed, 0 open.*

---

## Bug #56: W4 Flame Wave deals ZERO damage — upgrade freeze
**Date:** Current session  
**Severity:** 🔴 Critical  
**Status:** Fixed

**Symptom:** W4 (Flame Wave) appeared to fire (visual cone visible) but dealt zero damage to enemies. Selecting the Flame Wave upgrade caused the game to freeze.

**Root cause:** W4 emitted `this.eventBus.emit('damage', { source: player, target: enemy, damage, type: 'fire' })` — but `'damage'` is a **notification event** used by FloatingTextSystem for display. No system listens for it to actually apply damage. W4 also didn't emit `weaponFire`, so no audio played.

**Impact:** Enemies were never damaged by W4, they accumulated on screen, and the upgrade selection triggered state processing on an impossible game state, causing a freeze.

**Fix:** Changed W4 to emit `damageEntity` (which DamageSystem handles) for each enemy in the cone, plus added `weaponFire` emission for audio.

**Lesson:** Always trace event names through the full emit→listener chain. `'damage'` is NOT the same as `'damageEntity'` — the former is display-only, the latter applies actual damage. Never assume an event name sounds like it does damage.

---

## Bug #57: W4, W5, W6 missing visual effects
**Date:** Current session  
**Severity:** 🟡 Medium  
**Status:** Fixed

**Symptom:** W4 (Flame Wave) cone attack, W5 (Arcane Bolt) arcane shot and chain lightning, W6 (Dagger) homing projectiles had no visual feedback.

**Root cause:** These weapons emitted custom events (`coneAttack`, `arcaneShot`, `chainLightning`) but nothing in the Renderer or Game listened for them.

**Impact:** Weapons appeared to fire into empty air with no visible effect, making combat feel broken.

**Fix:** Added `coneEffects` and `chainLightningEffects` arrays to Renderer with drawing methods (`_updateAndDrawCones`, `_updateAndDrawChainLightnings`). Added event listeners in Game.init() to wire `coneAttack`→`addConeEffect`, `chainLightning`→`addChainLightningEffect`, `arcaneShot`→`addPulseEffect` (as a brief cast flash).

---

## Bug #58: W5 Arcane Bolt chain uses setTimeout (freeze risk)
**Date:** Current session  
**Severity:** 🟡 Medium  
**Status:** Fixed

**Symptom:** Same pattern as W7/W8 — W5 chain reaction used `setTimeout` to trigger the next chain hit 50ms later. If the game paused (level-up, game over) during a chain, the callback would fire against stale entity state.

**Root cause:** `setTimeout(() => { if (nearest.hp <= 0) this._handleW5Chain(killer, nearest); }, 50)` runs outside the game loop.

**Fix:** Replaced with `_w5ChainQueue` — a frame-based queue processed in `_updateW5Chains(dt)`. Also fixed the chain damage event from `'damage'` (notification only) to `'damageEntity'` (actual damage).

---

## Bug #59: W4-W8 weapons had no audio
**Date:** Current session  
**Severity:** 🟡 Medium  
**Status:** Fixed

**Symptom:** W4 (Flame Wave), W5 (Arcane Bolt), W6 (Dagger), W7 (Sword), W8 (Claymore) fire sounds were silent.

**Root cause:** AudioManager only had a handler for `w1_projectile` weaponFire events. W4-W8 emitted `weaponFire` events but no synth methods existed for them.

**Fix:** Added `weaponFire` event handlers for all 5 new weapons in AudioManager, with unique synth sounds (W4=flame whoosh, W5=arcane ping, W6=slash swoosh, W7=combo hit, W8=heavy slam). Added corresponding switch cases and `_synthW*_Fire()` methods.

---

### Weapon Damage Pipeline Audit (post-fix):

| Weapon | Damage Event | Listener | Visual | Audio | Status |
|---|---|---|---|---|---|
| W1 Projectile | `projectileHit` (CollisionSystem) | DamageSystem ✅ | ✅ projectile entity | ✅ w1_fire | ✅ |
| W2 Orbit | `projectileHit` (CollisionSystem) | DamageSystem ✅ | ✅ orb entities | ✅ orbit hum | ✅ |
| W3 Area Pulse | `areaPulse` | DamageSystem ✅ | ✅ pulse effect | ✅ w3_pulse | ✅ |
| W4 Flame Wave | `damageEntity` | DamageSystem ✅ | ✅ cone effect | ✅ w4_fire | ✅ |
| W5 Arcane Bolt | `projectileHit` (CollisionSystem) + `damageEntity` (chain) | DamageSystem ✅ | ✅ arcane pulse + chain lightning | ✅ w5_fire | ✅ |
| W6 Dagger | `damageEntity` (cone) + projectile entities (Lv7 homing) | DamageSystem ✅ | ✅ projectile entities | ✅ w6_fire | ✅ |
| W7 Sword | `damageEntity` (combo) | DamageSystem ✅ | ✅ (combo queue) | ✅ w7_fire | ✅ |
| W8 Claymore | `damageEntity` (slam) + `areaPulse` (explosion) | DamageSystem ✅ | ✅ pulse effect (explosion) | ✅ w8_fire | ✅ |

### setTimeout Audit (all frame-based now):

| Weapon | Before | After |
|---|---|---|
| W5 Chain | `setTimeout` 50ms | `_w5ChainQueue` frame-based |
| W7 Combo | `setTimeout` 0/250/500ms | `_w7ComboQueue` frame-based |
| W8 Explosion | `setTimeout` 200ms | `_w8ExplosionQueue` frame-based |

*Weapon damage pipeline session: 4 found, 4 fixed, 0 open.*

---

## Bug #60: All weapons unlocked immediately instead of loadout-position progression
**Date:** Current session  
**Severity:** 🔴 Critical  
**Status:** Fixed

**Symptom:** When the player selected a weapon loadout (e.g., Dagger-FlameWave-Sword), ALL three weapons were active from the start of the stage instead of progressing: Slot 0 at Lv1, Slot 1 at Lv3, Slot 2 at Lv6.

**Root cause:** Two bugs working together:
1. `startGame()` called `unlockWeapon()` for ALL weapons in `_activeWeapons`, making them all active at Level 1.
2. `_checkWeaponUnlocks()` used fixed `unlockLevel` values from weapon data (e.g., w2_orbit=3, weapon_area_pulse=6) instead of loadout position.

**Impact:** The game had no weapon unlock progression. All weapons fired immediately, making the game trivially easy and defeating the purpose of the loadout selection system.

**Fix:**
1. `startGame()` now only unlocks Slot 0: `this.weaponSystem.unlockWeapon(this._activeWeapons[0])`
2. `_checkWeaponUnlocks()` now uses loadout position: Slot 0=Lv1 (start), Slot 1=unlocks at Lv3, Slot 2=unlocks at Lv6.

**Verified via headless tests:**
- Loadout [Dagger, FlameWave, Sword]: Dagger active at Lv1, FlameWave at Lv3, Sword at Lv6 ✅
- Loadout [Sword, Dagger, Projectile]: Sword active at Lv1, Dagger at Lv3, Projectile at Lv6 ✅
- Upgrade pool only shows upgrades for currently unlocked weapons ✅

---

## Bug #61: _isSelectingUpgrade flag not reset on early return
**Date:** Current session  
**Severity:** 🟡 Medium  
**Status:** Fixed

**Symptom:** If `selectUpgrade` was called with an out-of-bounds index (e.g., index 2 when only 2 options exist), the `_isSelectingUpgrade` flag would stay `true` forever, permanently blocking all future upgrade selections.

**Root cause:** The early return path `if (index < 0 || index >= this.uiManager.levelUpOptions.length) return;` did not reset `_isSelectingUpgrade`.

**Impact:** Would permanently freeze the upgrade system, trapping the player in the level-up screen.

**Fix:** Added `this._isSelectingUpgrade = false;` before the early return.

---

## Bug #62: startGame() exposed on window for testing
**Date:** Current session  
**Severity:** 🟢 Low  
**Status:** Intentional  

**Note:** Added `window.game = game;` to game2.html for headless browser testing. This exposes the game object globally for debug/test access. Should be removed before production release.

---

*Weapon unlock progression session: 3 found, 3 fixed, 0 open.*

---

## Bug #63: Title screen overlay blocks all mouse/touch input during gameplay
**Date:** Current session  
**Severity:** 🔴 Critical  
**Status:** Fixed

**Symptom:** After starting the game, clicking on upgrade cards during the level-up screen did nothing. The game appeared to "freeze" at the level-up screen because no input could reach the canvas.

**Root cause:** The `startGame()` method never called `this.titleMenu.hide()`. The title screen element (`#title-screen`) has `z-index: 100`, `position: fixed`, and `800×600` dimensions — covering the ENTIRE game canvas. It retained `class="active"`, meaning it was visible and intercepting all mouse/touch events.

**Evidence from headless browser:**
- `document.elementsFromPoint(220, 320)` returned `#title-screen` as element[0] with `z-index: 100`
- Raw `mousedown` event listener on canvas never fired
- Direct `eventBus.emit('selectUpgrade')` worked fine (bypassing DOM)
- Keyboard events worked (they go through `window`, not the canvas DOM)

**Fix:** Added `this.titleMenu.hide();` as the first line of `startGame()`.

**Lesson (from Claude handoff):** When removing or hiding UI elements, always trace ALL references. The `titleMenu.hide()` was called in some code paths (e.g., `_startFromTitle()`) but was missing from `startGame()` which can be called directly by the dev selector. Always verify that overlays with `position: fixed` and high `z-index` are properly hidden before gameplay begins.

---

### Input System Audit (post-fix):

| Input Path | Before Fix | After Fix | Status |
|---|---|---|---|
| Touch/click on upgrade cards | ❌ Blocked by title screen | ✅ Works | Fixed |
| Keyboard (1/2/3) on upgrade cards | ✅ Worked (goes through window) | ✅ Works | OK |
| Touch/click during gameplay | ❌ Blocked by title screen | ✅ Works | Fixed |
| Touch/click on title menu | ✅ Worked (same element) | ✅ Works | OK |

*Title screen overlay session: 1 critical bug found, 1 fixed.*

---

## Bug #64: Lv3 upgrade freeze — EventBus listener silent failure
**Date:** August 31, 2026  
**Severity:** 🔴 Critical  
**Status:** ✅ Fixed

**Symptom:** Player can click upgrade cards at Lv2, but the game freezes at the Lv3 level-up screen (cards visible but unresponsive). Keyboard shortcuts (1/2/3) worked, but mouse/touch clicks on upgrade cards froze the game.

**Root Cause:** The EventBus `_dispatch` method had no error handling. If any listener threw an exception, all subsequent listeners for that event would silently never run. The `selectUpgrade` event had two listeners:
1. Audio manager's `ui_click` sound (registered first)
2. Actual upgrade-application logic that hides the menu and resumes the game (registered second)

If the audio listener threw for any reason, the second listener never ran, leaving the level-up screen stuck.

**Evidence:**
- Keyboard shortcuts worked because they called `selectUpgrade` directly via `eventBus.emit()`
- Click/touch on HTML overlay cards also emitted `selectUpgrade`, but the audio listener may have thrown in that context
- After adding try/catch to EventBus, the bug could not be reproduced

**Fix:** Added try/catch wrapper to EventBus `_dispatch` method:
```javascript
// BEFORE (broken):
_dispatch(event, data) {
  this.nestingDepth++;
  const list = this.listeners.get(event);
  if (list) {
    for (let i = 0; i < list.length; i++) {
      list[i](data);  // ← if this throws, remaining listeners never run
    }
  }
  this.nestingDepth--;
}

// AFTER (fixed):
_dispatch(event, data) {
  this.nestingDepth++;
  const list = this.listeners.get(event);
  if (list) {
    for (let i = 0; i < list.length; i++) {
      try {
        list[i](data);
      } catch (e) {
        console.error(`[EventBus] Listener ${i} for '${event}' threw:`, e);
      }
    }
  }
  this.nestingDepth--;
}
```

**Additional Diagnostic Logging:**
Added console.log statements to `selectUpgrade` handler to trace execution:
- `[selectUpgrade] Received:` — event arrived
- `[selectUpgrade] Applying:` — upgrade being applied
- `[selectUpgrade] Game resumed` — game successfully continued

**Lesson:**
> **When using an event bus pattern, always wrap listener calls in try/catch.** A single failing listener should not prevent other listeners from running. This is especially critical for events with multiple listeners where the order matters (e.g., audio first, then logic).

**Verification:**
- User tested in preview after fix
- Console showed clean execution: `Received → Applying → Game resumed`
- No `[EventBus] Listener threw` errors
- Game continued after upgrade selection at Lv3 and Lv4

---

*Lv3 freeze investigation: 1 root cause found and fixed.*

---

## File Split Map (v1.0.0)

**Quick Reference:** Use this map to find which file contains a specific class or feature.

### Game Entry Point
| File | Lines | Purpose |
|------|-------|---------|
| `game2.html` | 249 | HTML structure + initialization script |
| `styles.css` | 1,232 | All CSS styles |

### Data Layer (13 files)
| File | Lines | Contains |
|------|-------|----------|
| `data/embeddedData.js` | 1,996 | Characters, weapons, enemies, stages, pickups, leveling |
| `data/companionData.js` | 216 | 13 companions × 7 levels |
| `data/npcData.js` | 175 | NPC dialogue trees |
| `data/locationTree.js` | 92 | Town location hierarchy |
| `data/shopData.js` | 30 | Shop items |
| `data/assetMap.js` | 24 | SVG asset paths |
| `data/farmingConfig.js` | 15 | Auto-clear settings |
| `data/svgPortraits.js` | 15 | NPC SVG portraits |
| `data/sandboxDefaults.js` | 13 | Sandbox mode config |
| `data/affectionTiers.js` | 9 | NPC affection levels |
| `data/disasterEvents.js` | 9 | Disaster definitions |
| `data/estateTiers.js` | 9 | Estate upgrade tiers |
| `data/childGrowthStages.js` | 3 | Children growth data |

### Engine Core (8 files)
| File | Lines | Classes |
|------|-------|----------|
| `engine/game.js` | 990 | Game (orchestrator) |
| `engine/townScreen_refactored.js` | 1,139 | TownScreen |
| `engine/combat.js` | 831 | CollisionSystem, WeaponSystem, DamageSystem |
| `engine/rendering.js` | 573 | Renderer, FloatingTextSystem |
| `engine/pickup.js` | 547 | PickupSystem, LevelingSystem, TelegraphSystem |
| `engine/core.js` | 518 | EventBus, DataManager, GameState, GameLoop, Camera, InputManager |
| `engine/entities.js` | 506 | EntityManager, SpawnSystem, MovementSystem |
| `engine/titleMenu_refactored.js` | 428 | TitleMenu |

### Systems (3 files)
| File | Lines | Classes |
|------|-------|----------|
| `systems/companion.js` | 1,010 | CompanionSystem |
| `systems/progression.js` | 937 | GameManager, StorageBackend, LocalStorageBackend, AffectionSystem, EstateSystem, ChildrenSystem, DisasterSystem, FarmingSystem, SandboxSystem |
| `systems/loot.js` | 102 | StarSystem, FrenzySystem, GachaProtection |

### UI (3 files)
| File | Lines | Classes |
|------|-------|----------|
| `ui/audio.js` | 1,146 | AudioManager, TitleBGM |
| `ui/town.js` | 182 | LocationManager, ShopSystem |
| `ui/game.js` | 148 | UIManager |

### Class → File Lookup
| Class | File |
|-------|------|
| Game | `engine/game.js` |
| EventBus | `engine/core.js` |
| DataManager | `engine/core.js` |
| GameState | `engine/core.js` |
| GameLoop | `engine/core.js` |
| Camera | `engine/core.js` |
| InputManager | `engine/core.js` |
| EntityManager | `engine/entities.js` |
| SpawnSystem | `engine/entities.js` |
| MovementSystem | `engine/entities.js` |
| CollisionSystem | `engine/combat.js` |
| WeaponSystem | `engine/combat.js` |
| DamageSystem | `engine/combat.js` |
| PickupSystem | `engine/pickup.js` |
| LevelingSystem | `engine/pickup.js` |
| TelegraphSystem | `engine/pickup.js` |
| Renderer | `engine/rendering.js` |
| FloatingTextSystem | `engine/rendering.js` |
| TitleMenu | `engine/titleMenu_refactored.js` |
| TownScreen | `engine/townScreen_refactored.js` |
| CompanionSystem | `systems/companion.js` |
| GameManager | `systems/progression.js` |
| StorageBackend | `systems/progression.js` |
| LocalStorageBackend | `systems/progression.js` |
| AffectionSystem | `systems/progression.js` |
| EstateSystem | `systems/progression.js` |
| ChildrenSystem | `systems/progression.js` |
| DisasterSystem | `systems/progression.js` |
| FarmingSystem | `systems/progression.js` |
| SandboxSystem | `systems/progression.js` |
| StarSystem | `systems/loot.js` |
| FrenzySystem | `systems/loot.js` |
| GachaProtection | `systems/loot.js` |
| AudioManager | `ui/audio.js` |
| TitleBGM | `ui/audio.js` |
| UIManager | `ui/game.js` |
| LocationManager | `ui/town.js` |
| ShopSystem | `ui/town.js` |

---

*File split map created August 31, 2026*
