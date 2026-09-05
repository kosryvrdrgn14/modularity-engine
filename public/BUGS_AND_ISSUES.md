# Bugs & Issues Tracker

> **Purpose:** Track known bugs, fixed bugs, and potential issues across all sessions
> **Created:** September 2, 2026
> **Last Updated:** September 5, 2026

---

## Active Issues

*None — all known issues have been resolved as of September 5, 2026.*

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

### BUG-016: Story Mode Re-Entry Double-Registered Quest Listeners (September 5, 2026)
- **Severity:** Medium (latent — never triggered in normal play before slot system)
- **Symptom:** None observed yet; found by trace during slot-system design. Title → Story Mode → title → Story Mode left the first QuestSystem's listeners attached while a second QuestSystem also registered — kill-count objectives would progress 2× per kill.
- **Root Cause:** `_startStoryMode()` called `questSystem.init()` on a surviving instance; `init()` registers event listeners unconditionally.
- **Fix:** `_startStoryMode()` now destroys the old QuestSystem and creates a fresh one per entry (`destroy()` cleanup verified in Phase 0.5 tests).
- **Discovered by:** slot-system scaffold review (this flow becomes routine once slots exist)

### BUG-017: title → town Transition Missing (September 5, 2026)
- **Severity:** Low (worked by accident via DOM; console warned every time)
- **Symptom:** `Invalid transition: title → town` on every Story Mode / Test Town entry.
- **Root Cause:** State machine's `title` row only allowed `['playing']`. Same class as BUG-009/BUG-012.
- **Fix:** Added `'town'` to title's allowed transitions.

### BUG-018: Settings "Reset Progress" Did Not Clear Slot Saves (September 5, 2026)
- **Severity:** Medium (data integrity after slot migration)
- **Symptom:** Reset button removed the retired legacy key `modularity_engine_save`; the active slot's real save stayed on disk until an auto-save cycle re-wrote it.
- **Root Cause:** Hardcoded legacy key outlived its storage format (found during slot-system damage sweep).
- **Fix:** Reset now calls `wipeSlot(activeSlot)` — slot-aware, resets live store, persists immediately.

### BUG-019: bossConfig.spawnTime Was Dead Data (September 5, 2026)
- **Severity:** Medium (data-driven design violation)
- **Symptom:** None visible — spawn silently used the computed default.
- **Root Cause:** Engine computed boss spawn as `tierConfig.duration - 60`; the `spawnTime` field in stages.json was never read by any code path.
- **Fix:** `spawnTime` is now the authoritative override in `startGame()` (parsed mm:ss), capped at `duration - 60` so short tiers still get a boss window.

### BUG-020: Boss Announcement Offset Hack Mis-timed Extended Stage (September 5, 2026)
- **Severity:** Medium (presentation)
- **Symptom:** "Lilith appears!" fired ~270s AFTER she had already spawned (the original POT-004 symptom).
- **Root Cause:** Announcements were shifted by `bossActual - 240` — only correct for data authored against the 4:00 reference. Extended stage's 510/515/520 were absolute times, so at highlight tier they got +300.
- **Fix:** Announcement times are absolute (offset hack removed); extended stage retimed to 465/470/475/480, leading the 8:00 spawn.

### BUG-021: Hardcoded 300s Run End Truncated Long Stages (September 5, 2026)
- **Severity:** High (content unreachable — the extended stage could never be completed)
- **Symptom:** Every run ended at exactly 5:00 regardless of stage/tier. Extended stage's 21 waves (to 9:30) and its 8:00 boss were unreachable; mq_07 (kill Lilith) untestable. Quick-tier runs also overstayed by 2 minutes.
- **Root Cause:** `if (this.gameTime >= 300)` hardcoded in `Game.update()` while boss spawn time was dynamic.
- **Fix:** Run end reads `_activeRunDuration` (stage tierConfig duration) set at `startGame()`.
- **Lesson:** Same class as BUG-007 — wave/boss data extending past hardcoded time assumptions. Any new stage MUST declare realistic `tierConfig.*.duration` values.

---

## Potential Issues (Watch List)

### POT-008: Auto-Save Timer Has Never Fired (September 5, 2026)
- **Severity:** High (silent — the only mid-run protection the game appears to have does not exist)
- **Symptom:** None visible. Found by audit while drafting the auto-save design plan (MASTER_DESIGN §21).
- **Root Cause:** `SpawnSystem.update()` calls `this.gameManager.update(dt)` (the 60s auto-save tick), but `SpawnSystem` is constructed as `new SpawnSystem(entityManager, dataManager, eventBus)` — `gameManager` is never assigned, so `this.gameManager` is always undefined and the timer never ticks. No `beforeunload`/`visibilitychange` handlers exist either.
- **Impact:** A crash/502/accidental close mid-run loses the entire run. Only combat-end and some explicit town actions persist.
- **Fix:** Planned as MASTER_DESIGN.md §21 (Auto-Save System) — chunks 1–4: wire the dead tick, event-driven checkpoints, run journal with crash recovery, page-lifecycle saves.
- **CONFIRMED LIVE (Sep 5 slot trace):** headless reproduction shows quest completion in town + page refresh (no exit-card save) = quest progress lost — "back to the starting quest" symptom. This is the unsaved-progress window, not a slot-isolation bug; slot machinery verified correct across plain and reload-variant traces. Exit-to-title now saves (v1.8.2); full fix = §21 event checkpoints.
- **RESOLVED for town/quest progress (v1.9.0):** §21 chunks 1, 2, 4 implemented — quest/unlock/level events save instantly, 30s combat heartbeat, 15s town heartbeat, lifecycle saves on refresh/hide/close. Browser-verified: quest completed in town survives a RAW refresh. Remaining gap: mid-run combat-only progress (chunk 3 run journal, planned).

### SLOT-UI: Wiped Storage Masqueraded as Saves in Slot Picker (September 5, 2026)
- **Severity:** Low (display honesty; the underlying wipe was INFRA/origin-scoped, not game code)
- **Symptom:** Slot 1 displayed "Lv1 / 0 / 0 quests" with a Continue button right after the user had played it — looked like a lost save.
- **Diagnosis (3-way headless):** UI↔disk link verified perfect (seeded progress renders exactly); wiped-localStorage boot reproduces the screenshot bit-for-bit. The storage was emptied — consistent with a preview-origin rotation during the 502s (localStorage is origin-scoped).
- **Fix (v1.9.1):** Slot picker now labels by ACTUAL progress, not file existence — three states: **Continue** (progress or story_started), **✦ New Game / Fresh Start** (persisted default), **✦ New Game / Empty** (never persisted). A wiped or boot-fresh slot can no longer masquerade as a save.
- **User action if old saves are wanted:** they may still exist under the previous preview origin; not recoverable from the current origin.

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

### POT-004: Extended Stage Boss Timing Mismatch (September 5, 2026) — RESOLVED v1.9.2
- **Status (was):** `stage_graveyard_extended` has `bossConfig.spawnTime: "4:00"` but its announcement timeline fires "Dark energy..." at 510s and "Lilith the Necromancer appears!" at 515s (~8:35)
- **Behavior:** Spawn is driven by `spawnTime` (SpawnSystem line ~151: `_bossSpawnTime || 240`) — Lilith appears at 4:00 **unannounced**, then the announcement sequence plays at ~8:30 for a boss that's already been fighting the player
- **Impact:** mq_07 (kill Lilith) depends on this stage; confusing presentation but not blocking
- **Fix options:** align `spawnTime` to ~8:30, or retime the announcement block to lead the 4:00 spawn (e.g. text at 210s, shake at 235s, boss_spawn at 240s)
- **Priority:** Medium — must resolve before sq_02/mq_07 testing on the extended stage
- **RESOLUTION (v1.9.2, Sep 5):** the trace found THREE bugs, not one — see BUG-019/020/021 below. Extended stage retimed to spawn=8:00 with announcements leading (465/470/475/480); all 6 stage×tier combos verified with ≥60s boss windows.

### POT-005: Weapon Unlock Domain Has Code/Metadata Duplication (September 5, 2026)
- **Status:** Three disconnected sources describe weapon availability: (1) quest gates (authoritative, works), (2) `unlockSchedule = [1, 3, 6]` hardcoded in `game.js _checkWeaponUnlocks()` — the in-combat slot pacing, (3) `unlockLevel` field in weapons.json — display-only, nothing reads it functionally
- **Risk:** Numbers can drift between data and code (KNOWLEDGE.md §7 violation); `unlockLevel: 6` on Area *coincidentally* matches the hardcoded slot-2 unlock at Lv6
- **Recommended:** Move slot schedule to stage `tierConfig.slotUnlockLevels: [1, 3, 6]` (per-stage pacing becomes a JSON edit); either wire `unlockLevel` into display or drop it
- **Priority:** Medium — do during the config-extraction pass; no gameplay change if numbers copied as-is

### POT-006: embeddedData.js Mirrors All Content Files (September 5, 2026)
- **Status:** `data/embeddedData.js` (~2,000+ lines) hand-maintains fallback copies of every content JSON for offline/failure resilience
- **Risk:** Every content edit must be mirrored or the fallback diverges from the real files (has already needed 3 sync edits: locations/npcs, companions, gates)
- **Recommended:** Auto-generate the fallback from content files at build time, or accept as documented safety net with a sync-check in the web tools
- **Priority:** Medium — grows with every content addition; blocks clean modding workflow

### POT-007: Quest Objective Progress Keyed by Array Index (September 5, 2026)
- **Status:** `quest.js _getQuestStore` keys objective progress as `objectives[questId][0]`, `[1]`, …
- **Risk:** Editing/reordering objectives of a quest that any save has *in progress* silently corrupts that save's progress (e.g. old objective 1's count applies to new objective 1)
- **Recommended:** Give objectives stable ids (`obj_id` per objective) and key progress by those; migration v4 when done. Interim rule: **never reorder objectives of a shipped quest** — add a new objective at the end instead
- **Priority:** Medium — matters the moment quest content is edited post-launch (web tools make this likely)

---

## Environment Notes (Not Game Bugs)

### INFRA-001: Preview 502 Errors During Combat (September 5, 2026)
- **Symptom:** `statusCode: 502` while testing combat in the preview
- **Diagnosis:** Game is fully client-side static files — nothing in the game code can produce a 502. Source is the Freebuff preview proxy/dev server (transient infra restart)
- **Impact:** A 502 mid-combat loses that run's progress (saves commit at combat end). No action possible in game code; retry after the preview recovers

---

*Last updated: September 5, 2026*
