# Modularity Engine — Changelog

---

## v1.4.0 — Quest Scaffold Update (Phase 0.5)
**Date:** September 5, 2026
**Status:** ✅ Complete

### Session Summary
- **Scaffold audited against first real story JSON** — 6 skeleton defects found and fixed before Phase 1
- **`kill_count` payload fix** — death events carry `entity.enemyData.id`; handler now matches real enemies
- **`complete_stage` robustness** — accepts `target` or `stage_id` alias; lost runs no longer count (`stage_completed` check)
- **Unlock handling** — `stages` → `unlock_stage()`, `regions` → `unlockRegion()` + flags, `locations` → `location_unlocked_<id>` (was wrongly calling `unlock_stage`); nested `time_events` accepted
- **Objective emitters wired** — `npc:talked` from dialogue open, `location:navigated` from location navigation; unified `_onObjectiveEvent` dispatcher
- **Save migration v3** — `quests.failed/objectives/timeEvents` added to default store + `_migrate()`
- **`quest:available` spam guard** — only emits on state change
- **Gates aligned to story flags** — `content_gates.json` now references story flags (`met_stranger`, `graveyard_cleared`, …); added `regions` category
- **Stage id fix** — combat results now report `session.selected_stage_id` instead of hardcoded `stage_graveyard`
- **Verified** — 38/38 Node unit tests + 14/14 headless browser assertions, zero console errors

---

## v1.3.0 — Orphan Cleanup + Boss Fixes + Loadout System
**Date:** September 2, 2026
**Status:** ✅ Complete

### Session Summary
- **Boss freeze bug fixed** — Missing `compositionWeights` in late-game waves + entity vs definition mixup
- **Loadout screen** — Pre-combat weapon/companion selection wired into town combat flow
- **New region backgrounds** — Graveyard + Forest SVGs with atmosphere (fog, fireflies, tombstones)
- **Slide + Zoom transition** — Region switching with snappy 370ms animation
- **8 bugs fixed** (BUG-007 through BUG-012)

### Orphan Cleanup
Archived 50+ unused files to reduce context noise:
- `screenshots/` → `archive/screenshots/` (20+ test PNGs)
- 30 unused SVG assets → `archive/assets/` (rendering uses inline base64)
- `versions/` → `archive/versions/` (historical snapshots, 400KB+)
- `README.md` → `archive/` (template boilerplate)
- Deleted orphaned `data/npcData.js` and `data/locationTree.js`
- Total archive size: ~4MB

---

## v1.0.0 — File Split Complete
**Date:** August 31, 2026
**Status:** ✅ Complete — Game fully modular

### What Changed
- **game2.html:** 10,519 lines → 249 lines (97.6% reduction)
- **Classes:** 38 inline → 0 inline (100% extracted)
- **Files:** 1 → 28+ modular files

### File Structure Created
```
public/
├── game2.html          # 249 lines (HTML + init only)
├── styles.css          # 1,232 lines (all CSS)
├── data/               # 13 files (game data)
├── engine/             # 8 files (core systems)
├── systems/            # 3 files (game systems)
└── ui/                 # 3 files (UI components)
```

### Key Accomplishments
1. **Broke circular dependencies** — TitleMenu and TownScreen refactored with dependency injection
2. **Extracted data layer** — 13 JSON/JS data files
3. **Split engine core** — 6 core classes, 3 entity classes, 3 combat classes, 3 pickup classes, 2 rendering classes
4. **Split systems** — Companion, progression (9 classes), loot (3 classes)
5. **Split UI** — Audio (2 classes), game HUD, town navigation
6. **Extracted CSS** — All styles to external file
7. **Slimmed game2.html** — Only HTML structure + initialization

### Bug Fixes
- **#61:** Upgrade freeze bug fixed (EventBus try/catch)
- **#62:** Diagnostic logging added to selectUpgrade handler

### Files Created
- `FILE_SPLIT_REPORT.md` — Complete split documentation
- `FILE_SPLIT_PLAN.md` — Split plan summary
- `PHASE0_CIRCULAR_DEPS_STATUS.md` — Circular dependency docs
- `Claude_Handoff_File_Split.md` — Handoff for Claude review

---

## v0.4.0 — Design Decisions Locked (D1-D8)
**Date:** August 26, 2026
**Status:** All 8 core design decisions resolved, game_frame.md updated

### Design Decisions (D1-D8)
- **D1:** 3 companion slots, fixed. W1=C1, W2=C2, W3=C3.
- **D2:** Companions always invulnerable. Protected quest targets = map assets with HP.
- **D3:** Stage length tiers: 3min (quick grind), 5min (baseline story), 10min (highlight story). Frontloaded weapons for 3min, scaling for 10min.
- **D4:** Estates produce materials + quests + unlocks only. No gold production.
- **D5:** 1:1 companion-weapon binding. Companions buff/evolve their paired weapon.
- **D6:** Keep 3 core factions. 50-55 wife roster from multiple mythologies expands factions. Some lore-only.
- **D7:** Skill tree is a placeholder. Game playable without it.
- **D8:** Gold income: combat + quests + events. No estate income.
- **D9:** No separate world map. Reuse city/town navigation for all areas. Same interface, different data.

### Updated Files
- **game_frame.md** — v0.3.0 → v0.4.0 (D9: world map → unified location hierarchy):
  - Section 6.5: 3 fixed companion slots with 1:1 weapon binding
  - Section 6.5: Combat engine integration updated for binding model
  - Section 7: Faction expansion note added (D6)
  - Section 8: Skill tree marked as placeholder (D7)
  - Section 11: Estate economy updated — materials/quests/unlocks, no gold (D4)
  - Section 14 (Gap 11): Resolved via 1:1 binding (D1/D5)
  - Section 14 (Q3): Resolved with D1/D2/D5
  - Save data: partySlots → 3
- **22_city_builder_location_system.md** — v0.1.0 → v0.2.0 (renamed, noted as reusable for all areas)
- **spec_update_roadmap.md** — All 9 decisions marked as resolved

---

## v0.8.0 — Grand Bazaar Shop System
**Date:** August 26, 2026
**Status:** Shop spec created (adjusted from Gemini draft)

### New Spec Files
- **31_grand_bazaar_spec.md** — Single shop with 4 tabs: Combat Consumables, Companion/Adventurer, Estate/Productivity, Gifts/Romance
  - Price tiers scaled to economy (25-15,000g range)
  - Town level gates item availability
  - ~20 items across 4 tabs
  - UI design with tab navigation and buy confirmation

### Adjustments from Gemini Draft
- Removed: Mana system, equipment system, marriage ring, auto-clear expansion, school supplies, crafting catalysts
- Rescaled: Prices from 250,000g max to 15,000g max (matches our economy)
- Added: Productivity boosts, adventurer upgrades, estate boosts
- Kept: Gift system, combat consumables, shop escalation

---

## v0.7.0 — Design Refinements + Endgame Sandbox
**Date:** August 26, 2026
**Status:** Refinements applied, sandbox spec created

### Design Refinements
- **Auto-clear rule of 3:** Slot 1 = companion, Slot 2 = adventurer, Slot 3 = flexible/manual
- **Auto-clear background completion:** No visible timer — completes during other gameplay
- **Companion one-place-only:** Companion can only be in ONE place (combat OR auto-clear, never both)
- **Gacha protection:** Rare drops ramp from 1% → 99% over 7 clears per stage (predictable supply)
- **Legacy companions:** Children provide unique weapon evolutions not available with regular companions
- **Gold productivity boosts:** Gold can boost output of Blacksmith, Miner, Merchant's Guild for quests
- **Disasters simplified:** Gold sink only, 3-run cooldown, full system deferred to balancing

### New Spec Files
- **30_endgame_sandbox_spec.md** — Build testing mode with custom difficulty, damage reports, build comparison

### Updated Files
- `23_auto_clear_farming_spec.md` — Rule-of-3 slots, background completion, auto-save settings
- `20_companion_combat_spec.md` — One-place-only lockout rule
- `06_pickups_and_powerups_spec.md` — Gacha protection system
- `27_estate_bloodline_spec.md` — Legacy companions + weapon evolutions
- `25_economy_gold_sinks_spec.md` — Productivity boosts + quest-driven sinks
- `28_disaster_events_spec.md` — Simplified to gold sink with cooldown
- `game_frame.md` — Sandbox module added, gacha protection noted

### Gold Bloat Reference
- Run 50 surplus: 6,595g (60% more income than sinks)
- Target surplus: 2,000-3,000g
- Fix: Add ~150g/run in new sinks when ready

---

## v0.6.0 — Supporting Specs Updated (Phase 5)
**Date:** August 26, 2026
**Status:** 5 supporting specs updated

### Updated Files
- **07_leveling_system_spec.md** — Added XP scaling by stage tier (3min/5min/10min), v2.0
- **06_pickups_and_powerups_spec.md** — Added soft-pity drop system with cross-run persistence, v2.0
- **08_ui_hud_spec.md** — Added Stage Select, Companion Management, Farming Slots, Bottom Action Bar UI designs, v2.0
- **14_game_manager.md** — Added world state, farming state, pity counters to save schema, v2.0
- **dialogue_template.md** — Added affection tier dialogue patterns, gift preference system, v2.0

---

## v0.5.0 — New System Specs (Phase 4)
**Date:** August 26, 2026
**Status:** 7 new spec files created

### New Spec Files
- **23_auto_clear_farming_spec.md** — Auto-clear system for 3★ stages (3 farming slots, hired adventurers, companion lockouts, named plans)
- **24_star_conditions_spec.md** — 1★/2★/3★ system with condition pools, auto-clear eligibility, stage-specific conditions
- **25_economy_gold_sinks_spec.md** — Gold income (combat+quests+events), 3 sink categories (combat/gifts/management), resource separation
- **26_affection_romance_spec.md** — 50-55 NPC roster, 4-step tier chain (Interest→Respect→Trust→Claim), gift system, VN dates, marriage
- **27_estate_bloodline_spec.md** — 5-tier estate system, material production (no gold), children, bloodline bonuses, wife network
- **28_disaster_events_spec.md** — Random estate/town disasters, 3 resolution types, wife network aid, gratitude content
- **29_frenzy_mode_spec.md** — Post-3★ alternate playstyle, max spawns, better drops, clean run compatible

### Design Decisions Referenced
- D1 (3 companion slots), D3 (stage tiers), D4 (no gold from estates), D5 (1:1 binding), D6 (mythology factions), D8 (3 gold sources)

---

## v0.3.0 — City Builder Navigation & Location System
**Date:** August 26, 2026
**Status:** Design document complete, awaiting review

### New Design Documents
- **22_city_builder_location_system.md** — Hierarchical city navigation with 4-level depth:
  - City → Districts → Sub-Districts → Buildings
  - Breadcrumb trail + back button + side menu (3 navigation methods)
  - Rule of 3: max 3 items per level, scroll for overflow
  - NPC placement with priority sorting and quest indicators
  - Two-gate unlock system: town level + NPC/quest gates
  - Locked locations show unlock requirements
  - Flat location index for fast runtime lookups
  - 5 implementation phases defined (~635 lines total)
  - 10 gaps/conflicts/questions identified for review

---

## v0.2.5 — Companion, Town & Polish
**Date:** August 24, 2026
**Status:** Full game loop with town, companion, and debug tools

### New Features
- **Title Screen** — Gothic village background, animated embers, fantasy BGM, WASD/arrow navigation, Settings menu
- **Town System** — Refugee camp after combat, Elder Rowan NPC, camp upgrade (100g → wooden shacks), Lina NPC unlock
- **Dog Companion** — Pet in town to recruit, follows player in combat, growl AoE attack every 10s, auto-collects loot within 40px, scales with W1 upgrades
- **3 Companion Slots** — UI shows companion boxes under weapons, dog fills slot 1
- **NPC Dialogue System** — Typewriter text, choice buttons, topic loops, affection tracking, inline SVG portraits
- **Debug: Test Town** — Title screen option gives +100g, skips combat
- **Debug: B Key** — Spawns boss instantly for testing

### Boss Telegraph Fix
- Telegraph rectangle now extends in the correct charge direction (was 90° off)
- Boss freezes during windup — telegraph is the truth
- Charge direction locked to telegraph's final angle
- Chevrons point forward in charge direction

### Boss Intro Fix
- Intro timer now advances in `render()` while game loop is paused
- Entities frozen during intro — no damage during cutscene
- Skip intro via click/Space during boss introduction

### Audio
- Full AudioManager with 19+ synthesized sounds
- Boss charge telegraph warning, spawn roar
- Dog growl and bark sounds
- Menu navigate, select, back, locked, powerup sounds
- Volume sliders with persistent settings
- Audio ducking during level-up

### Bug Fixes (7 new — #37–#43)
- Boss hangs during intro (#37)
- B key skip-to-boss silent fail (#38)
- B key shows warning but no boss spawn (#39)
- `game._spawnBoss()` undefined — method on SpawnSystem (#40)
- Telegraph rectangle 90° off from charge direction (#41)
- Boss charges at player not telegraph direction (#42)
- Duplicate TownScreen methods from bulk insert (#43, open)

### SVG Assets (23 total)
- Enemy sprites: zombie, bat, skeleton, ghost, caster, boss
- NPC portraits: Elder Rowan, Lina, Dog
- Dog combat sprite
- Weapons: W1 projectile, W2 orbit, W3 pulse
- Pickups: XP gems, gold, magnet, screen wipe, weapon level-up
- Environment: title background, refugee camp, wooden shacks
- Player sprite

---

## v0.2.0 — First Playable Build
**Date:** August 21, 2026
**Status:** Playable prototype (30 bugs fixed, audio gaps resolved)

### Audio Preparation (v0.2.0+)
- 7 implementation gaps resolved in game2.html for audio system
- `weaponFire` event added to W1 projectile creation
- `bossCharge` event detection via state transition tracking
- AudioManager gains `setPlayer()` for distance-based audio
- Browser audio unlock handler (click/touchstart)
- W2 continuous hum tracking stubs
- Boss death double-fire guard added
- Full audio implementation map created (`10_audio_implementation_map.md`)
- Audio spec updated to v1.3 with game event→sound mapping
- **Full AudioManager implemented** — 19 sounds, 16 event wires, payout triad engine, ducking, distance audio

### Core Systems
- Game loop at 60 FPS with fixed timestep
- Camera follows player with smooth lerp + screen shake
- Click/tap to move + WASD/arrow key controls
- Entity pooling for enemies, projectiles, pickups, orbs

### Combat
- **W1 Projectile** — Fires toward nearest enemy, multi-shot at higher levels
- **W2 Orbit** — Blue orbs circle player, deal contact damage (unlocks at level 3)
- **W3 Area Pulse** — Orange ring damages all enemies in radius (unlocks at level 6)
- Crit system (5% chance, 1.5x multiplier) now functional
- Damage multiplier upgrade system

### Enemies
- 5 enemy types with unique behaviors:
  - **Zombie** — Basic chase
  - **Bat** — Fast with erratic swarm movement
  - **Skeleton** — Tanky chase
  - **Ghost** — Wander/chase pattern
  - **Caster** — Maintains distance (ranged archetype)
- **Boss: The Gravekeeper** — Charge attack pattern, spawns at 4:00

### Progression
- XP gems from enemy kills
- Level-up system with upgrade selection (1/2/3 keys or click)
- 3 upgrade types: Damage Up (+15%), Speed Up (+10%), Health Up (+20 HP)
- Wave timeline with 10 brackets over 5 minutes
- Gold coins (tracked visually, no spending in V1)

### Pickups
- XP gems (diamonds, blue)
- Gold coins (circles, gold)
- Screen Wipe (star, green) — kills all enemies
- Magnet (circle, pink) — attracts pickups for 10s
- Weapon Level-Up (triangle, orange)

### UI
- HP bar (red)
- Level badge (blue circle, top-right)
- XP bar (bottom)
- Boss health bar during boss fight
- Floating damage numbers and pickup text indicators
- Level-up upgrade selection screen
- End screen (Victory/Survived/Defeated) with stats
- Restart on click/Enter/Space

### Audio
- Stub only (Web Audio API initialized, no sounds)

### Bug Fixes (30 total)
- Level-up upgrade selection stuck
- Enemies spawning at world origin
- Bat invisible (color matched background)
- Projectile despawn using origin distance
- Division by zero in weapon targeting/movement
- Y-sort NaN crash risk
- Weapons W2/W3 never unlocking
- W2 orbs had no collision with enemies
- W3 pulse had no visual effect
- Renderer initialization order
- Game freeze on game over
- Boss death not triggering victory
- No restart from end screen
- Damage upgrade had no effect on weapons
- Crits never proccing from weapons
- Restart state machine deadlock
- Duplicate game loops on restart
- No floating damage numbers
- No boss health bar
- Boss had no behavior (just chased)
- Enemy behavior patterns not implemented
- W1/W3 multi-shot not implemented
- Speed Up wrong stat key
- WeaponSystem not reset on restart
- Double power-ups per level (addXP while loop)
- Upgrade key repeat applying upgrades multiple times
- Double power-up: queue entry not consumed in levelUp handler (root cause fix from Claude review)

### Known Limitations (resolved in v0.2.5)
- ~~Audio not implemented~~ ✅ Full AudioManager
- Gold not tracked on HUD
- Weapon power spikes (level 4/7 effects) not implemented
- Passive upgrade pool limited to 3 types
- No pickup despawn timer
- Caster doesn't fire projectiles
- Boss Phase 2 (minions, ground pound) not implemented
- Screen wipe has no visual flash effect

---

## v0.1.0 — Design Phase Complete
**Date:** August 20, 2026
**Status:** Spec files only

### Files Created
- `vs_plan.md` — Master design document
- `vs_prog.md` — Progression & balance
- `vs_colors.md` — Visual specifications
- `01_engine_architecture.md` through `10_json_schemas.md` — Full specs
- `simulation_report.md` — Game balance simulation
- `test_11_cross_spec_integration.md` — Cross-spec validation
- `implement_prototype.md` — Implementation plan
- `pitfalls_review.md` — AI pitfalls guide
