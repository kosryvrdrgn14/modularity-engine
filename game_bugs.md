# Game Bug Report — Master Log

**Project:** Modularity Engine (Vampire Survivors Prototype)
**File:** `game.html` (single-file HTML5 game)
**Last Updated:** August 24, 2026

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
| 43 | Duplicate _showDogDialogue/companion methods — two identical definitions from Python bulk insert | 🟡 Low | ⚠️ Open | Code review |
| — | Companion system implemented | ℹ️ Feature | ✅ Complete | Spec + Implementation |

**Total: 43 bugs found, 42 fixed, 1 open**

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

*Report compiled from all development sessions and system audit. 36 bugs found and fixed.*

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
