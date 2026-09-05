# Bugs & Issues Tracker

> **Purpose:** Track known bugs, fixed bugs, and potential issues across all sessions
> **Created:** September 2, 2026
> **Last Updated:** September 2, 2026

---

## Active Issues

*None — all known issues have been resolved as of September 2, 2026.*

---

## Fixed Bugs

### BUG-001: Level-3 Weapon Upgrade Freeze (Session ~3)
- **Severity:** Critical
- **Symptom:** Game froze when weapon reached level 3 upgrade
- **Root Cause:** `game2.html` grew to 10,519 lines. An audio listener threw an exception, silently killing the upgrade-selection logic registered after it.
- **Fix:** File split into modular engine/ui/data files. Added try/catch wrapping to event bus listener dispatch.

### BUG-002: Shop Overlay Missing After Split (Session ~4)
- **Severity:** High
- **Symptom:** Shop button clicked but overlay didn't appear
- **Root Cause:** During the monolithic file split, the shop overlay's HTML was accidentally deleted.
- **Fix:** Restored shop overlay HTML in game2.html.

### BUG-003: Empty Town Screen After Data Migration (September 2, 2026)
- **Severity:** High
- **Symptom:** Town screen rendered with correct header/background but no NPC cards, no location cards, no breadcrumb.
- **Root Cause:** `LocationManager` received `GameManager` (save data) where it needed `DataManager` (JSON content). Three confusingly-similar objects: Game, GameManager, DataManager.
- **Fix:** Destructured constructor pattern, direct DataManager forwarding.
- **Lesson:** See KNOWLEDGE.md §11 for naming conventions.

### BUG-004: Missing EMBEDDED_DATA Fallback for locations/npcs (September 2, 2026)
- **Severity:** Medium
- **Root Cause:** `EMBEDDED_DATA` only had fallbacks for `characters` and `leveling`.
- **Fix:** Added `locations`, `npcs`, and `companions` fallback entries.

### BUG-005: Crash-Prone getCurrentRegion/Location (September 2, 2026)
- **Severity:** Medium
- **Root Cause:** No defensive check for empty/missing regions array.
- **Fix:** Added guard clauses with safe defaults.

### BUG-006: Upgrade Card Not Showing First Tab Items (Pre-September 2026)
- **Severity:** Low
- **Fix:** Fixed during shop tab refactor.

### BUG-007: Game Freeze at Boss Spawn (September 2, 2026)
- **Severity:** Critical
- **Symptom:** Game froze ~4:00 into graveyard stage when boss was supposed to spawn. Screen shook, then became unresponsive.
- **Root Cause:** Waves 8-9 in `stage_graveyard` had `enemyTypes` but no `compositionWeights`. `_spawnEnemy()` crashed: `Cannot read properties of undefined (reading 'zombie')`.
- **Fix:**
  1. `_spawnEnemy()` now falls back to equal weights from `enemyTypes` if `compositionWeights` missing
  2. Added proper `compositionWeights` to waves 8-9 in `stages.json`
- **Lesson:** All waves with enemyTypes must have compositionWeights. Data validation schema should enforce this.

### BUG-008: Boss Health Bar NaN / AI Broken (September 2, 2026)
- **Severity:** High
- **Symptom:** Boss spawned but health bar showed nothing. Boss charge sounds never played.
- **Root Cause:** `bossSpawn` event passed the enemy **definition** object (from `dataManager.enemies`) instead of the actual spawned **entity** (from `entityManager.create()`). `renderer.bossEntity` was set to the definition which had no `hp`, `maxHp`, `active`, or `_bossState`.
- **Fix:** `_spawnBoss()` now captures entity reference and passes `{ boss, entity }` in event. Handler uses `data.entity || data.boss`.
- **Lesson:** Event payloads should carry the runtime object, not the static definition. Always verify what `entityManager.create()` returns.

### BUG-009: Invalid Transition gameOver → town (September 2, 2026)
- **Severity:** Medium
- **Symptom:** After boss victory, console warned `Invalid transition: gameOver → town`.
- **Root Cause:** `_showGameOverReturnOption()` tried `setState('town')` from `gameOver` state. State machine only allows `gameOver → endScreen`.
- **Fix:** Added `setState('endScreen')` in `_handleGameOver()` after showing end screen. Also added `town → playing` as valid transition (was missing).

### BUG-010: Shake Announcements Silently Ignored (September 2, 2026)
- **Severity:** Low
- **Symptom:** "The Gravekeeper rises!" shake announcement in stage data was never rendered.
- **Root Cause:** `_updateAnnouncements()` only handled `text`, `boss_name`, and `dim` types — `shake` was silently dropped.
- **Fix:** Added shake handler that shows text and triggers camera shake.

### BUG-011: Queued Boss Intro Lost During Level-Up (September 2, 2026)
- **Severity:** Medium
- **Symptom:** If player leveled up right as boss intro tried to start, intro was queued but never processed.
- **Root Cause:** `startBossIntro()` queued to `_queuedBossIntro` during level-up, but `selectUpgrade` handler never checked for it.
- **Fix:** Added `_queuedBossIntro` processing in `selectUpgrade` handler after game resumes. Also added `isBossIntro()` guard to prevent re-entry.

### BUG-012: Missing town → playing Transition (September 2, 2026)
- **Severity:** Low
- **Symptom:** Console warned `Invalid transition: town → playing` every time combat started from town.
- **Root Cause:** State machine didn't include `playing` in `town`'s allowed transitions.
- **Fix:** Added `'playing'` to `town: ['combat', 'title', 'town', 'playing']`.

### BUG-013: Town Side Panels Partially Blocked by Header (September 5, 2026)
- **Severity:** Low (cosmetic)
- **Symptom:** The top of the left/right town panels (quest cards on the NPCs sidebar) was partially covered by the top header bar.
- **Root Cause:** `#town-left-panel` / `#town-right-panel` are `position: absolute; top: 0` with `z-index: 8`, while `#town-header` is z-index 10 in normal flow — the panels' top edge rendered underneath the header.
- **Fix:** Set both panels to `top: 48px` to clear the header. Verified: panel top edge now sits at/below the header bottom. (Was flagged as "can wait until after quest phases" — fixed immediately since it affected quest-panel visibility during playtesting.)

### BUG-014: "undefined Lundefined Lundefined" in Town Header (September 5, 2026)
- **Severity:** Low (cosmetic)
- **Symptom:** Header run-stats chip showed `⏱ undefined  Lundefined  ☠ undefined` after entering Story Mode.
- **Root Cause:** `_startStoryMode` calls `townScreen.show({})`; the empty object passed the `if (this._lastRunStats)` guard, then `time/level/kills` were undefined when rendered.
- **Fix:** `TownScreen.show()` now treats an empty stats object as "no run finished" (`_lastRunStats = null`), and `updateDisplay()` only renders the chip when all three fields exist, otherwise resets to the default `⚔Lv1`.

### BUG-015: Locked Weapons Reach Combat via Loadout Prefill (September 5, 2026)
- **Severity:** Medium (gameplay/economy integrity — gates bypassed)
- **Symptom:** Player received "Area" weapon upgrades in a story run despite never unlocking it — it appeared usable at Lv6 (slot schedule).
- **Root Cause:** `LoadoutScreen._prefillFromStage()` copied the stage's `recommendedWeapons` (graveyard/standard = w1, w2_orbit, **weapon_area_pulse**) into slots **without the quest-gate filter**. A locked id in a slot rendered as "Empty" but stayed in `selectedWeapons`; the full prefill also made Confirm active immediately. The upgrade pool in `_showUpgradeOptions()` is correctly guarded (`wLevel > 0`) — the corruption entered through the loadout, not combat.
- **Fix (3 layers):** (1) `_prefillFromStage()` now filters recommendations through `getAvailableWeapons()` (same gate filter as the card list); (2) confirm sanitizes the shipped loadout against the gates (belt-and-suspenders); (3) slot requirement relaxed from "exactly 3" to "at least 1" — a fresh story player has 1 weapon, and 3 was only reachable via the leak itself.
- **Note:** Dev/Test-Town mode (no quest system) is unaffected — prefill still fills all 3 recommended weapons there.
- **Verified:** 7/7 Node unit checks + 9/9 headless browser checks (fresh story → prefill = w1 only; Next enabled with 1 weapon; hostile injection stripped at confirm; zero JS errors).

---

## Potential Issues (Watch List)

### POT-001: NPC Portraits Still Base64 in svgPortraits.js
- **Status:** NPC_DATA migrated to JSON with `portraitKey`, but SVG_PORTRAITS remains JS global
- **Remaining:** Full migration needs asset path references or portrait loading system
- **Priority:** Medium — blocks web tools from generating NPC content

### POT-002: Weapon Visuals Partially Hardcoded
- **Status:** Weapon colors/shapes set inline in combat.js
- **Remaining:** Could be moved to weapons.json `visual` field for full data-driven control
- **Priority:** Low

### POT-003: Companion Data Still Uses Global
- **Status:** `COMPANION_DATA` populated from JSON but accessed as global by companion.js and progression.js
- **Remaining:** Should pass DataManager reference instead of relying on window global
- **Priority:** Low — works, just not clean

---

*Last updated: September 5, 2026*
