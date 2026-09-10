# Bugs & Issues Tracker

> **Purpose:** Track known bugs, fixed bugs, and potential issues across all sessions
> **Created:** September 2, 2026
> **Last Updated:** September 7, 2026

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

### BUG-022: Ghost Run — Old Combat Kept Running Under Town/New Stage (September 5, 2026)
- **Severity:** Critical (this session's headline bug)
- **Symptoms (user-verified with screenshots):** (1) Zombie quest counter ticked up while standing in town; rat side-quest stayed 0/10. (2) Entering the extended stage showed a LEVEL UP screen immediately plus the previous run's frozen "VICTORY — Time 4:43 / Level 11" overlay permanently on top of a live fight. (3) Victory screen auto-dismissed to town "barely readable".
- **Root Cause (traced, 3 defects compounding):**
  1. `hideEndScreen()` existed but was NEVER called — after the first run ended, the canvas victory overlay rendered every frame forever, under every later screen.
  2. `InputManager` emitted `restart` on EVERY Enter/Space keypress and canvas click UNCONDITIONALLY (no state guard), and the `restart` listener called `startGame()` with no guard either — a live run could start underneath the town/title UI.
  3. `_gameOverReturnTimer` (1.5s auto-return to town) fired even after a restart had begun; from `playing` state the `setState('town')` transition was rejected but `townScreen.show()` ran anyway — slapping the town UI over a live fight. Enemies spawned around the idle player, auto-weapons killed them → zombie quest ticked in town.
- **Why rats never ticked:** rats first spawn at 1:30 on the wave clock; every ghost restart reset `gameTime` to 0. Kill attribution itself was correct (verified: quest target `rat` matches enemies.json id; rats present in both Graveyard wave tables from 1:30).
- **Fix (all three):**
  1. Input emitters state-guarded (only fire `restart` from `gameOver`/`endScreen`); `restart` listener double-guarded.
  2. `startGame()` now does full teardown: clears `_gameOverReturnTimer`, hides end screen + level-up overlay, resets `_isSelectingUpgrade`/`_isPaused`.
  3. `_showGameOverReturnOption()` no-ops unless state is still `endScreen`.
- **Lesson:** Any auto-timer that mutates UI must re-validate game state when it fires; restart paths need teardown + guards at BOTH the emitter and the listener.

### BUG-023: End Screen Auto-Dismiss Too Fast to Read (September 5, 2026)
- **Severity:** Low (UX)
- **Symptom:** Victory screen auto-returned to town after 1.5s — "barely any time to even read the victory screen".
- **Fix:** Auto-return delay raised 1.5s → 4s. Click/Enter still restarts immediately (state-guarded per BUG-022). Later option: add an explicit button and drop the auto-return entirely.

### BUG-025: `_emptyRunData()` Called but Never Defined (September 6, 2026)
- **Severity:** High (latent P1 — fresh boots and old-save migration would throw)
- **Symptom:** None yet in play — found during §21 chunk-3 recon. `GameManager._emptyRunData()` was invoked at 3 sites (store default `_createDefault()`, `_migrate()` for pre-v3 saves, `end_session()`) but never defined anywhere.
- **Impact:** Any boot with no existing save, or migration of a save predating the v3 journal fields, would ReferenceError during load.
- **Fix:** Static defined in `progression.js` (v1.9.3), shape per MASTER_DESIGN §21.3B: `{stage_id, tier, gameTime, kills, gold, level, weaponLevels, bossSpawned, announcementTimes, savedAt}`.
- **Lesson:** store-shape stubs added without their supporting functions will sit dormant until exactly the wrong moment (fresh boot); any new store field should land together with the code that uses it.

### BUG-024: triggerGameOver Silently Rejected from Sub-States — Split-Brain (September 6, 2026)
- **Severity:** Critical (root cause of the BUG-022 symptom family)
- **Symptom:** With the level-up overlay up, a win/loss firing in the same frame was silently discarded: `setState('gameOver')` returned `false` (levelUp only allows → playing) and the return value was ignored, so the machine stayed at `levelUp` while the victory screen still displayed. Upgrades kept applying, `setState('endScreen')` in `_handleGameOver()` was rejected too, and the next stage's `startGame()` (levelUp → playing is legal) "succeeded" while inheriting the old run's state — the stuck-victory / dump-back-into-the-fight symptoms.
- **Root cause:** State machine had no path from any sub-state (`levelUp`, `paused`, `bossIntro`) to `gameOver`, and the one caller that must always succeed ignored `setState()`'s return value.
- **Fix:** (1) `GameState.transition(newState, { allowRestart })` added in `core.js` as the single sanctioned force-path for flows that must work from ANY state; `triggerGameOver()` now uses it. (2) `_handleGameOver()` clears sub-flow debris first: `_isSelectingUpgrade`, the level-up overlay, pending level-up queue, queued boss intro. (3) Audit removed the dead `'combat'` target from the town row (no code ever set it; the table had no `combat` row, so entering it would have bricked the machine) and fixed latent `_returnToTitle()` which called `setState('title')` from gameOver/endScreen — never allowed, would have rejected silently.
- **Lesson:** same class as the EventBus listener failure — an important operation failed silently and the caller proceeded as if it succeeded. RULE: never call `setState()` without honoring its return value; if a flow must work from ANY state, it must go through `GameState.transition()`, not raw writes.

### BUG-026: Cross-Slot Resume Contamination — Phantom Banner + Ghost Run Via the Resume Path (September 7, 2026)
- **Severity:** Critical (save-slot integrity — same symptom family as BUG-022, new entry path)
- **User reproduction (9 steps, save slots 1 & 2):**
  1. Fresh boot, no saves → Story Mode → slot 1
  2. Play to Cemetery, lose, refresh
  3. Title screen shows NO notification; slot 1 holds the run's progress; slot 2 empty
  4. Open slot 2 → a "resume run" notification appears INSIDE slot 2 (run actually belongs to slot 1)
  5. Click Resume → town screen stays up, combat audio starts underneath — cannot participate
  6. Starting a fresh quest fight stops the ghost audio (the two runs merged into one loop)
  7. Preview refreshes by itself mid-fight (INFRA-001-class, environmental)
  8. Title → slot 2 again → resume notification appears again (slot 2 now holds the GHOST run's journal)
  9. Resume again → combat audio, still trapped in town
- **Root cause (3 defects compounding):**
  1. **Boot-scoped banner:** the resume banner is detected ONCE at boot against the boot-time active slot. Switching slots never hid it or re-checked it — the slot-1 banner stayed up over slot 2's town, reading as a slot-2 notification.
  2. **No journal-ownership check at resume:** clicking Resume used the boot-time snapshot and ran `startGame()`, whose `beginRunJournal()` wrote the journal into whatever store was now active — grafting slot 1's run into slot 2's save (the ghost run that then legitimately produced the step-8 banner).
  3. **Town screen never dismissed:** `startGame()` hid the title menu but never the town screen, so resuming from town left the town DOM over a live fight (combat audio + unplayable town UI).
- **Fix (game.js, v1.9.4):**
  1. `switchToSlot()` now hides the stale banner and re-runs detection against the INCOMING slot's store — the banner re-appears only if that slot genuinely has an interrupted run.
  2. `_resumeInterruptedRun()` re-verifies the journal against the LIVE store before acting (owning slot + stage_id + savedAt must match); a mismatch aborts with a console warning instead of starting a foreign run.
  3. `startGame()` teardown now also calls `townScreen.hide()` (idempotent) — the single funnel for every combat start (title Play, restart, loadout confirm, resume) can no longer leave the town over a fight.
  4. Banner title now names the owning save slot: "⚡ Interrupted run detected (Slot N)".
  5. Resuming from the title banner stops the title BGM first (it would have kept playing under combat audio).
- **Note on step 2→3:** a clean defeat runs `end_session()`, which clears the journal — the banner at boot means the session actually ended mid-fight (refresh/502, INFRA-001), which is exactly the crash-recovery case the journal exists for. The bug was never that the journal survived; it was that the banner outlived its slot and the resume path could transplant it.
- **Lesson:** any UI presenting per-slot state must be re-scoped on every slot switch, and any action consuming persisted state must re-verify it against the live store at action time — boot-time snapshots are hints, not facts. (Same class as BUG-022's "auto-timers must re-validate state when they fire".)

### BUG-027: Resume Restored Weapons but Not Character Level; Run Timer Invisible (September 10, 2026)
- **Severity:** Medium (resume fidelity — run continued but at wrong power curve)
- **User report:** resuming from the title banner worked (returned to combat, weapons kept — e.g. Lv 7 projectile), but the character was Lv 1 again. Also: no run timer on the HUD, so the resumed start time was unverifiable.
- **Root cause (2 items):**
  1. **Journaled field with no consumer:** `_writeRunJournal()` records `level` (and `_emptyRunData()` defaults it), but the resume-restore block in `startGame()` never applied it to `levelingSystem` — the HUD reads `levelingSystem.level` per frame, so the run restarted at Lv 1 on the Lv-1 upgrade curve while weapon levels (which the block explicitly loops over) restored fine. Every journaled field except `level` had a consumer.
  2. **`gameTime` was invisible:** it is the resume-restore anchor, yet no HUD element displayed it — a resumed run could not be verified by the player (and the journal only snapshots every 30s + at milestones, so the restored clock can legitimately lag the crash moment by up to 30s — §21.3B — which made verification matter).
- **Fix (v1.9.6):**
  1. Resume block restores `levelingSystem.level = jr.level` and zeroes `xp` (partial XP toward the next level is not journaled per §21.6 and is not fabricated).
  2. Run timer added to the combat HUD (top-center, `m:ss`, mirrors the journaled clock exactly): `rendering.js _drawUI()` + per-frame `renderer.gameTime = gameTime` sync in `game.js`.
- **Verification:** trace extended (`isolate/test_pot_fixes.cjs`) — level restored from journal (3), no fabricated XP, HUD timer synced, timer pixels actually render on canvas, and a journal ROUND-TRIP: resume at Lv 3 → level up → milestone flush records Lv 4 for the next resume. 28/28 checks pass.
- **Lesson:** every field in the journal shape must have a consumer in the restore block — a recorded-but-never-read field is a silent restore gap. When touching either side, diff `_emptyRunData()` keys against the restore block.

### BUG-028: _buildResult Name Mismatch — Combat Results Lost 7 Fields Every Run (September 10, 2026)
- **Severity:** High (silent progression-data loss; found during POT-011)
- **Root cause:** `_buildResult()` read **camelCase** (`data.goldEarned`, `data.stageCompleted`, `data.timeSurvived`…) while its only caller passed **snake_case** (`gold_earned`, `stage_completed`, `time_survived`…). Undefined reads fell through to defaults, so every combat result was built with `stage_completed: false`, `time_survived: 0`, `player_level: 1`, `gold_earned: 0`, `boss_defeated: false`.
- **Blast radius (all silently disabled):** star evaluation (2★/3★ thresholds never met except defaults), gacha rare-drop rolls (only ran on `stage_completed` — never true), best-run tracking (`time_survived` always 0, `best_run` never improved), `total_kills` (read `result.stats.kills`, which doesn't exist on the result shape — fixed to `result.kills`), no-hit/solo/companion hard star conditions (`damage_taken`/`companions_used` were never mapped at all).
- **Fix (v1.9.7):** `_buildResult` now normalizes BOTH naming conventions and carries the unmapped fields; `end_session` reads `kills`/`time_survived` from the real result shape.
- **Verification:** trace asserts the built result keeps snake_case fields, unmapped fields are carried, `end_session` counts kills and records best_run, and the completed-run path (stars + gacha) fires. 
- **Lesson:** when a producer and consumer agree on a shape by hand, they drift — the result builder should have been exercised by at least one test that asserted field round-trip. The headless trace now does exactly that.

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

### POT-009: Interrupted-Run Restore Is Clobbered by startGame() Teardown (September 8, 2026) — RESOLVED v1.9.5
- **Severity:** High — resume is effectively fake
- **Found by:** full-code audit (Sep 8), follow-up to BUG-026
- **Symptom:** Resume banner works and the journal re-seeds correctly, but the fight itself restarts from t=0.
- **Root Cause:** In `game.js startGame()`, the resume restore block set `gameTime`, kills, gold, weapon levels and re-marked `spawnSystem.bossSpawned` — then teardown ran AFTER it with no early return: `spawnSystem.reset(effectiveSpawn)` (clears `bossSpawned`) and `gameTime = 0` wiped the restored values. The re-seeded journal made saves LOOK right while the actual run restarted.
- **Resolution (v1.9.5):** `startGame()` reordered — resume restore now runs after the full teardown and loadout/tier setup, guarded in a try/catch that degrades to a fresh run on corrupt journals. Headless trace (`isolate/test_pot_fixes.cjs`) asserts `gameTime`/kills/gold/weapon-levels/bossSpawned all survive into the live run; all checks pass.
- **Priority:** High — BUG-026's fix is incomplete without this; player-facing resume currently restores nothing that matters.

### POT-010: total_runs Is Incremented Twice Per Run (September 8, 2026) — RESOLVED v1.9.5
- **Severity:** Medium (stat corruption, not gameplay)
- **Found by:** full-code audit (Sep 8)
- **Root Cause:** `game.js startGame()` did `counters.total_runs++` for every combat start, AND `progression.js end_session()` incremented it again on every completed run. Every finished run counted twice; every abandoned run counted once.
- **Resolution (v1.9.5):** The `startGame()` increment removed — `end_session()` is now the single owner. Trace asserts startGame leaves the counter untouched and end_session bumps it exactly +1. Note: existing save slots may already carry doubled values; left as-is (stat-only cosmetic).
- **Priority:** Medium — cheap one-line fix, but save-slot data already carries doubled values.

### POT-011: Dual Gold Ledgers That Drift (persistent.currency vs town.resources.gold) (September 8, 2026) — RESOLVED v1.9.7
- **Severity:** Medium
- **Found by:** full-code audit (Sep 8)
- **Original evidence:** loot wrote `town.resources.gold` (via `add_resource('gold')`), shops/disasters/estates spent `persistent.currency` (via `spend_currency`), and `end_session` wrote both — the two ledgers diverged depending on which API each caller used.
- **Deeper findings during the fix (Sep 10):**
  1. **Combat gold was never credited at all** — the coin-pickup handler was a stub (`// Gold is tracked separately (not implemented yet)`). Coins dropped, were collected, vanished; `gold_earned` was always 0 and the 2★ gold threshold (≥600) could never be met via runs.
  2. **The per-run zeroing destroyed banked gold** — `startGame()` zeroed `town.resources.gold`, which was ALSO where farming `collectSlot()` income landed, so every fight start silently wiped farm earnings.
- **Resolution (v1.9.7):** `persistent.currency` is THE single wallet. `town.resources.gold` is deprecated; all resource-API gold ops (`add/spend/get/has_resource('gold')`) redirect to the currency API, so farming/quest gold and shop spends share one ledger. One-time migration in `init()` folds any legacy mirror balance into the wallet and zeroes the mirror. Combat coins now credit the wallet LIVE and accumulate in a per-run `_runGoldEarned` counter; the wallet is never zeroed at fight start. Journal `gold` redefined as RUN EARNINGS (not a wallet snapshot) so resume restores the counter without double-paying the wallet; `end_session`'s mirror write removed.
- **Verification:** trace checks cover live crediting, earnings accounting, shared-ledger spends from both APIs, overspend rejection, deprecated mirror staying flat, no double-credit on resume, and the migration merge (500+300 → 800) across a reload. 45/45 pass.
- **Note:** `end_session`'s `result.rewards.currency` path remains (currently unused by callers) — future callers get single-ledger behavior for free.

### POT-012: GameManager.set() Auto-Vivifies Paths and Is Persisted Wholesale (September 8, 2026) — PARTIALLY RESOLVED v1.9.5
- **Severity:** Medium
- **Found by:** full-code audit (Sep 8)
- **Root Cause:** `set(path, value)` creates any missing intermediate object, so a typo'd or early `set('session.x', …)` silently grows a NEW session object that bypasses `_createDefault()` invariants (e.g. `run_in_progress`, `run_data` shape). There are 11 `set('session.*')` call-sites, and every write marks `_dirty`, so transient session state is persisted by heartbeats and by `switchToSlot()`'s save-on-exit.
- **Resolution (v1.9.5, symptom):** The one live ghost-path symptom removed — the resumed-run restore no longer writes `set('session.gold', …)` (a write-only branch nothing ever read). Trace asserts `session.gold` never appears.
- **Still open:** the allowlist itself — `set()` can still auto-vivify arbitrary paths. Route session writes through explicit GameManager methods or allowlist session keys in `set()`.
- **Priority:** Medium — silent-corruption class, same family as BUG-026.

### POT-013: Legacy Canvas Upgrade-Card Hit-Test Parallels the HTML Overlay (September 8, 2026) — RESOLVED v1.9.5
- **Severity:** Low
- **Found by:** full-code audit (Sep 8)
- **Status:** `core.js _onPointerDown()` ran `_getUpgradeCardAt(x, y)` with hardcoded 160×200 card geometry, while card selection UI is the HTML level-up overlay in `ui/game.js`. Number-key selection (Digit1–3 → `selectUpgrade`) is the live keyboard path.
- **Resolution (v1.9.5):** Canvas hit-test and `_getUpgradeCardAt()` deleted (`#levelup-overlay` confirmed `position:fixed; inset:0; pointer-events:auto`, so the canvas can never legitimately receive card clicks). Keyboard `selectUpgrade` path retained and trace-verified end-to-end (XP → overlay → key 1 → upgrade applied, queue drained).
- **Priority:** Low — deletion candidate, zero behavior change intended.

### POT-014: AudioContext Lifecycle Gaps (No Tab-Hide Suspend; Ad-Hoc BGM Ownership) (September 8, 2026) — PARTIALLY RESOLVED v1.9.5
- **Severity:** Low
- **Found by:** full-code audit (Sep 8)
- **Resolution (v1.9.5, part 1):** `visibilitychange` suspend/resume added in `AudioManager.init()` — hidden tab suspends the context (battery/CPU saved, no stale BGM bleed), returning resumes it; both calls no-op-safe and gesture-independent.
- **Still open (part 2):** music stop/start is still hand-wired per screen (the BUG-026 resume fix was one of these). A single music-bus owner with one BGM owner per screen remains future work.
- **Priority:** Low — polish, but cheap and prevents a repeat bug class.

### POT-015: getEffectiveStats() Is a Stub (September 8, 2026)
- **Severity:** Medium (when progression features land) / None today
- **Found by:** full-code audit (Sep 8)
- **Status:** `progression.js getEffectiveStats()` (~L518) returns `{ ...base }` with an in-code TODO — skill-tree and equipment bonuses are never applied. Any current caller silently gets base stats.
- **Recommended:** Before implementing skill trees/equipment, make `getEffectiveStats()` the single composition point (base + tree + equipment + companions) and migrate all stat readers to it.
- **Priority:** Medium — must be done as part of, not after, the next progression milestone.

### Audit Positives (September 8, 2026)
- `quest.js` re-verified clean: no unguarded content globals, degraded-mode fallback intact — the INFRA-003 lesson continues to hold in newer code.
- All former bare `COMPANION_DATA` references are now guarded live (`companion.js _compData()` ×4, `progression.js` inline ×1) — INFRA-003 fix confirmed complete in current code.

---

## Environment Notes (Not Game Bugs)

### INFRA-001: Preview 502 Errors During Combat (September 5, 2026)
- **Symptom:** `statusCode: 502` while testing combat in the preview
- **Diagnosis:** Game is fully client-side static files — nothing in the game code can produce a 502. Source is the Freebuff preview proxy/dev server (transient infra restart)
- **Impact:** A 502 mid-combat loses that run's progress (saves commit at combat end). No action possible in game code; retry after the preview recovers

### INFRA-003: Unguarded COMPANION_DATA Globals — Hardened (September 6, 2026)
- **Found by:** external review (Claude) of the post-cleanup codebase; verified against live code.
- **Symptom:** `data/companionData.js` is no longer in the script list; the live chain is `DataManager.loadAll()` → `content/companions.json` → `window.COMPANION_DATA` (engine/core.js). Nothing was broken — but 6 references (`companion.js` ×4, `progression.js` ×2) accessed the global bare/unguarded, while `titleMenu_refactored.js` and `loadout.js` already used the defensive `typeof` pattern. If the fallback chain ever regressed, half the files degrade gracefully and half hard-crash.
- **Fix (v1.9.3):** `CompanionSystem._compData()` static guard wraps all 4 `companion.js` sites; inline guard in `getCompanionRoster()` (`progression.js`); stale `entities.js` comment (claimed a script tag that no longer exists) corrected. Headless-verified: missing global degrades to `{}`, no throw; `node --check` passes; zero bare refs remain.
- **Also cleaned:** the three never-loaded data files (`npcData.js`, `locationTree.js`, `companionData.js`) are confirmed absent from `public/data/` (removed during the review pass; no code references remain — only schema doc strings, updated).
- **Hygiene note:** a root `isolate/` sandbox (review tooling + pre-split monolith backups) was found untracked and NOT gitignored, actively polluting search. Added to `.gitignore`; deletion pending owner decision (monolith backup recovery unverifiable — git is platform-blocked in agent sessions).

### INFRA-002: Agent Search Tools Unreliable — Verified Faults (September 6, 2026)
- **Symptom:** `code_search` ignored `cwd` scoping (root config files returned for `public/engine`-scoped queries), leaked content from gitignored `dist/` despite its documented `.gitignore` handling, and truncated output from context bloat. `glob` intermittently under-reported (1 file returned for a folder holding 87; 0 for a folder holding ~117).
- **Diagnosis:** Harness-side tool defects, not project configuration — confirmed by a reproducible 8-probe suite (see `TOOL_AUDIT_PLAN.md`, run Sep 6, 2026). Cost: ~15 wasted tool calls tracing BUG-022 before the pattern was recognized.
- **Key finding:** the terminal `rg` path auto-filters gitignored `dist/` correctly (`rg --files` → 0 dist hits, 347 total). Dist noise exists only via `code_search`.
- **Resolution:** Verdict table + standing rules live in `TOOL_AUDIT_PLAN.md` and KNOWLEDGE.md §14/§15. Scoped lookups go to terminal `rg`; `code_search` is restricted to fuzzy project-wide discovery only. Closed — mitigations in effect.

---

*Last updated: September 7, 2026*
