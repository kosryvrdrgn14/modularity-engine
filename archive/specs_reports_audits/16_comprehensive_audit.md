# Comprehensive Project Audit

> **Date:** August 24, 2026
> **Scope:** All spec files, game code, content files, and cross-references
> **Game Version:** v0.4.0 (post-SVG, post-audio, post-telegraph, post-GameManager)

---

## Table of Contents

1. [Project Inventory](#1-project-inventory)
2. [Critical Issues (Fix Now)](#2-critical-issues-fix-now)
3. [Conflicts Between Files](#3-conflicts-between-files)
4. [Red Flags](#4-red-flags)
5. [Gaps in Implementation](#5-gaps-in-implementation)
6. [Gaps in Specifications](#6-gaps-in-specifications)
7. [What's Working](#7-whats-working)
8. [Recommendations](#8-recommendations)

---

## 1. Project Inventory

### Spec Files (17 total)

| File | Lines | Last Updated | Status |
|---|---|---|---|
| `vs_plan.md` | 1,533 | Aug 20 | ✅ Original plan, superseded by newer files |
| `vs_prog.md` | 961 | Aug 20 | ✅ Progression spec, still valid |
| `vs_colors.md` | 495 | Aug 20 | ✅ Visual spec, still valid |
| `01_engine_architecture.md` | 1,514 | Aug 20 | ⚠️ Old — superseded by extract_engine.html |
| `02_character_spec.md` | — | Aug 20 | ⚠️ Old — data now in game2.html embedded |
| `03_weapons_spec.md` | — | Aug 20 | ⚠️ Old — data now in game2.html embedded |
| `04_enemies_spec.md` | 779 | Aug 20 | ⚠️ Old — data now in game2.html embedded |
| `05_stages_spec.md` | 495 | Aug 20 | ⚠️ Old — data now in game2.html embedded |
| `06_pickups_and_powerups_spec.md` | — | Aug 20 | ⚠️ Old — data now in game2.html embedded |
| `07_leveling_system_spec.md` | — | Aug 20 | ⚠️ Old — data now in game2.html embedded |
| `08_ui_hud_spec.md` | — | Aug 20 | ⚠️ Old — superseded by ui_design.md |
| `09_audio_spec.md` | 516 | Aug 21 | ✅ Audio spec, partially implemented |
| `10_audio_implementation_map.md` | 473 | Aug 21 | ✅ Audio mapping, implemented |
| `10_json_schemas.md` | 1,181 | Aug 20 | ⚠️ Old — needs update for new schema |
| `11_svg_asset_spec.md` | 482 | Aug 23 | ✅ SVG assets, all created |
| `12_codebase_map.md` | — | Aug 23 | ✅ Engine map, needs update for new classes |
| `13_telegraph_and_boss_intro.md` | 961 | Aug 24 | ✅ Fully implemented |
| `14_game_manager.md` | 595 | Aug 24 | ✅ Fully implemented |
| `15_engine_agnostic_port.md` | 625 | Aug 24 | ✅ Porting guide, complete |
| `id_system.md` | — | Aug 24 | ✅ ID naming rules, complete |
| `ui_design.md` | 1,085 | Aug 24 | ✅ All questions answered |
| `game_frame.md` | 1,646 | Aug 24 | ⚠️ Mixed old/new schema |
| `extract_engine.html` | — | Aug 23 | ⚠️ Needs update for GameManager |

### Code Files

| File | Lines | Status |
|---|---|---|
| `public/game2.html` | 4,431 | ✅ Running, 0 runtime errors |
| `content/id_registry.json` | 300+ | ✅ 61 IDs registered |

### Content Files (Planned vs Actual)

| File | Status | Notes |
|---|---|---|
| `content/characters.json` | ❌ Not created | Data embedded in game2.html |
| `content/weapons.json` | ❌ Not created | Data embedded in game2.html |
| `content/enemies.json` | ❌ Not created | Data embedded in game2.html |
| `content/stages.json` | ❌ Not created | Data embedded in game2.html |
| `content/pickups.json` | ❌ Not created | Data embedded in game2.html |
| `content/leveling.json` | ❌ Not created | Data embedded in game2.html |
| `content/mechanics.json` | ❌ Not created | Telegraph data in spec only |
| `content/audio_config.json` | ❌ Not created | Audio hardcoded in AudioManager |
| `content/ui_config.json` | ❌ Not created | UI hardcoded in UIManager |
| `content/upgrades.json` | ❌ Not created | Upgrades hardcoded in Game |
| `content/npcs.json` | ❌ Not created | NPCs in game_frame.md only |
| `content/factions.json` | ❌ Not created | Factions in game_frame.md only |
| `content/skills.json` | ❌ Not created | Skills in game_frame.md only |
| `content/quests.json` | ❌ Not created | Quests in game_frame.md only |
| `content/buildings.json` | ❌ Not created | Buildings in game_frame.md only |
| `content/items.json` | ❌ Not created | Items in game_frame.md only |
| `content/unlocks.json` | ❌ Not created | Unlocks in game_frame.md only |
| `content/story.json` | ❌ Not created | Story in game_frame.md only |
| `content/estates.json` | ❌ Not created | Estates in game_frame.md only |
| `content/dialogue.json` | ❌ Not created | VN not implemented yet |
| `content/asset_manifest.json` | ❌ Not created | SVGs inlined as base64 |
| `content/id_registry.json` | ✅ Created | 61 IDs |

---

## 2. Critical Issues (Fix Now)

### CI-1: GameManager `add_xp()` Uses Old Schema

**Location:** `public/game2.html` L3700-3708
**Problem:** `add_xp()` references `this.store.player` and `this.store.skills` — old schema paths. Should be `this.store.persistent.player` and `this.store.persistent.skills`.
**Impact:** XP tracking will crash or silently fail when `store.player` is undefined.
**Fix:** Change all `this.store.player.*` → `this.store.persistent.player.*` and `this.store.skills.*` → `this.store.persistent.skills.*` in `add_xp()`.

### CI-2: GameManager `get_effective_stats()` Uses Old Schema

**Location:** `public/game2.html` L3825
**Problem:** `this.store.player.baseStats` should be `this.store.persistent.player.base_stats`.
**Impact:** Stats calculation returns undefined.
**Fix:** Change path.

### CI-3: game_frame.md Uses Old Schema (19 camelCase References)

**Location:** `game_frame.md` throughout
**Problem:** The centralized store section, combat module section, and save data schema all use the old camelCase field names (`totalGold`, `unlockedWeapons`, `weaponLevels`, etc.) instead of the new engine-agnostic snake_case (`total_gold`, `unlocked_weapons`, `weapon_levels`).
**Impact:** Anyone implementing from game_frame.md will create incompatible data structures.
**Fix:** Update all 19 references to match the new schema in `14_game_manager.md` and `15_engine_agnostic_port.md`.

### CI-4: 14 Inline SVGs Not in Asset Manifest

**Location:** `public/game2.html` ASSET_MAP
**Problem:** 14 SVGs are inlined as base64 data URIs. No `asset_manifest.json` exists. The ID system spec says assets should be referenced by logical key via manifest.
**Impact:** Godot port will need to extract all SVGs and create the manifest manually.
**Fix:** Extract SVGs to `public/assets/svg/`, create `content/asset_manifest.json`, update ASSET_MAP to load from manifest.

---

## 3. Conflicts Between Files

### CONFLICT-1: `w3_area` vs `w3_pulse`

| File | ID Used |
|---|---|
| `game2.html` embedded data | `w3_area` |
| `11_svg_asset_spec.md` | `w3_pulse` |
| `id_registry.json` | `weapon_area_pulse` |

**Three different names for the same weapon.** The registry says `weapon_area_pulse`, the code says `w3_area`, the SVG spec says `w3_pulse`.

**Resolution:** Rename to `weapon_area_pulse` everywhere (P0 priority).

### CONFLICT-2: `weapon_levelup` vs `pickup_weapon_level_up`

| File | ID Used |
|---|---|
| `game2.html` embedded data | `weapon_levelup` (36 references) |
| `id_registry.json` | `pickup_weapon_level_up` |

**Resolution:** Rename to `pickup_weapon_level_up` in game2.html (P0 priority).

### CONFLICT-3: Schema Naming Convention

| File | Convention |
|---|---|
| `game_frame.md` | camelCase (`totalGold`, `unlockedWeapons`) |
| `14_game_manager.md` | snake_case (`total_gold`, `unlocked_weapons`) |
| `15_engine_agnostic_port.md` | snake_case |
| `game2.html` GameManager | snake_case (new methods) but old schema paths in `add_xp()` |

**Resolution:** snake_case everywhere. game_frame.md needs full update.

### CONFLICT-4: GameManager Method Naming

| File | Convention |
|---|---|
| `game2.html` GameManager class | snake_case methods (`add_currency`, `get_resource`) |
| `game2.html` Game class calls | Mixed: `gameManager.get_resource()` ✅ but `gameManager._buildResult()` ⚠️ (underscore prefix = private) |

**Minor issue.** The `_buildResult` method is called externally from Game class but marked private. Either make it public (`buildResult`) or move the result-building logic into Game class.

---

## 4. Red Flags

### RED-1: 15+ Old Spec Files Never Updated

The original spec files (01-08) were created on Aug 20 and never updated to reflect the current implementation. They describe an architecture that no longer matches the code.

**Risk:** Someone reading `01_engine_architecture.md` will get a completely different picture than what's in `game2.html`.

**Action:** Either update them or add a prominent deprecation notice pointing to the current files.

### RED-2: No Content Files Exist

All 18 planned content JSON files are empty/missing. The id_registry.json references them but they don't exist. All game data is hardcoded in game2.html.

**Risk:** The entire "modular content" architecture is theoretical. No external file loading works yet.

**Action:** This is expected for a prototype, but should be noted as a blocker for the engine extraction phase.

### RED-3: localStorage in GameManager (Not Abstracted)

The `StorageBackend` abstraction exists, but `LocalStorageBackend` is the only implementation and is instantiated by default. The GameManager constructor accepts a `backend` parameter but the Game class doesn't pass one.

**Risk:** The abstraction is there but unused. If someone adds Godot code, they'll need to remember to inject the backend.

**Action:** Low priority for prototype. High priority before Godot port.

### RED-4: No Error Handling in Gold Tracking

`add_currency()` and `spend_currency()` don't validate inputs. Negative amounts, NaN, or non-numeric values will corrupt the store silently.

**Action:** Add input validation before the Godot port.

### RED-5: Boss Intro Doesn't Queue During Level-Up

The spec (`13_telegraph_and_boss_intro.md` Gap 5) says boss intro should queue if `gameState === 'levelUp'`. The implementation in `startBossIntro()` doesn't check for this — it just calls `setState('bossIntro')` which will fail the transition check if current state is `levelUp`.

**Risk:** If a boss spawns during level-up, the game could get stuck.

**Action:** Add queue logic to `startBossIntro()`.

---

## 5. Gaps in Implementation

### GAP-1: No Town Builder

The town builder is fully designed in `game_frame.md` but has zero implementation. No buildings, no resource spending, no worker management.

**Priority:** P1 (after engine extraction)

### GAP-2: No VN/Dialogue System

The VN system is designed in `13_telegraph_and_boss_intro.md` and `id_system.md` but has no implementation. No dialogue engine, no character portraits, no choice system.

**Priority:** P2 (after town builder)

### GAP-3: No Skill Tree

Skills are defined in `id_registry.json` (3 nodes) and designed in `game_frame.md` but the skill tree UI and logic don't exist.

**Priority:** P2

### GAP-4: No Quest System

Quests are designed in `game_frame.md` but no quest tracking, objective checking, or reward granting exists.

**Priority:** P2

### GAP-5: No NPC System

NPCs are designed (2 in registry, full system in game_frame.md) but no dialogue, trust, companion, or shop logic exists.

**Priority:** P2

### GAP-6: No Equipment/Inventory System

Inventory is designed (24 slots, gift system) but no item management, equipment slots, or gift logic exists.

**Priority:** P2

### GAP-7: No Estate/Family System

Estates are designed (5 tiers, marriage, children) but no implementation exists.

**Priority:** P3

### GAP-8: No Faction System

Factions are designed (3 factions, reputation ranks) but no implementation exists.

**Priority:** P3

### GAP-9: No Difficulty Scaling

`difficultyScaling` and `xpScaling` formulas in stage data are strings that are never evaluated (extract_engine Gaps 5-6).

**Priority:** P1

### GAP-10: No BGM Support

`musicGain` node is created in AudioManager but never used (extract_engine Gap 10).

**Priority:** P2

### GAP-11: No Boss Phase Transitions

The Gravekeeper has 2 phases defined but only the basic charge cycle works. Phase 2's ground pound is never triggered (extract_engine Gap 1).

**Priority:** P1

### GAP-12: Caster Enemy Can't Shoot

The Caster has projectile stats but no code spawns enemy projectiles (extract_engine Gap 2).

**Priority:** P1

### GAP-13: W3 setTimeout for Pulse Delay

`WeaponSystem._fireW3()` uses `setTimeout` which fires outside the game loop (extract_engine Gap 9).

**Priority:** P0 (can cause crashes)

---

## 6. Gaps in Specifications

### SPEC-1: No Mode Transition Contract Implementation

Claude's handoff defines transition contracts for combat/town/VN but no code implements them. The GameManager has `start_session()` and `end_session()` but no actual mode switching.

### SPEC-2: No Asset Manifest File

`15_engine_agnostic_port.md` specifies `asset_manifest.json` but it doesn't exist. SVGs are inlined.

### SPEC-3: No Save Migration Testing

The GameManager has a `_migrate()` function but it's never tested. If someone has an old save, it might break silently.

### SPEC-4: No Content File Validation

No script validates that content JSON files match their schemas or that all IDs in the registry are actually used.

### SPEC-5: No Audio Implementation for New Systems

The boss intro and telegraph systems emit audio events (`bossIntro`, `telegraphSpawn`) but the AudioManager only handles a subset. The `playSound` event from TelegraphSystem isn't wired.

### SPEC-6: Portrait-Only Not Enforced

`ui_design.md` says portrait-only but game2.html renders at whatever viewport size the browser provides. No orientation lock or aspect ratio enforcement.

---

## 7. What's Working

### Fully Functional

| Feature | Status | Notes |
|---|---|---|
| Combat loop (5-min stage) | ✅ | Enemies, weapons, pickups, leveling |
| 3 weapons with upgrades | ✅ | Lv4/Lv7 power spikes |
| 5 enemy types + 1 boss | ✅ | All with distinct behaviors |
| SVG graphics (14 assets) | ✅ | Inlined, rendering correctly |
| Audio system (30+ sounds) | ✅ | Synthesized, all triggers working |
| Boss charge telegraph | ✅ | Data-driven via TelegraphSystem |
| Boss introduction sequence | ✅ | Pause → overlay → resume |
| Pre-boss announcements | ✅ | Timed text events |
| Gold tracking | ✅ | Via GameManager |
| Combat session results | ✅ | Structured CombatResult object |
| Level-up system | ✅ | 3 upgrade choices, queued levels |
| iFrame system | ✅ | Damage immunity frames |
| Camera system | ✅ | Follow + shake |
| Floating damage text | ✅ | On hit and pickup |
| Game over / victory | ✅ | Proper state handling |

### Partially Working

| Feature | Status | Issue |
|---|---|---|
| GameManager gold tracking | ⚠️ | Old schema refs in `add_xp()` |
| Boss phase transitions | ⚠️ | Only charge cycle works |
| Environmental telegraphs | ⚠️ | System exists but no stage events trigger them |
| Hazard zones | ⚠️ | `spawnHazard()` works but nothing creates them |

---

## 8. Recommendations

### Immediate (This Session)

| # | Action | Priority | Effort |
|---|---|---|---|
| 1 | Fix `add_xp()` and `get_effective_stats()` old schema refs | P0 | 5 min |
| 2 | Fix `w3_area` → `weapon_area_pulse` in game2.html | P0 | 10 min |
| 3 | Fix `weapon_levelup` → `pickup_weapon_level_up` in game2.html | P0 | 10 min |
| 4 | Add boss intro queue during level-up | P0 | 10 min |
| 5 | Replace `setTimeout` in W3 with queue-based delay | P0 | 15 min |

### Short-Term (Next Session)

| # | Action | Priority | Effort |
|---|---|---|---|
| 6 | Update game_frame.md schema to snake_case | P1 | 30 min |
| 7 | Create `content/asset_manifest.json` | P1 | 20 min |
| 8 | Extract SVGs to files, load via manifest | P1 | 30 min |
| 9 | Add caster enemy projectile spawning | P1 | 30 min |
| 10 | Add boss phase 2 ground pound | P1 | 30 min |
| 11 | Add difficulty scaling formula evaluation | P1 | 30 min |
| 12 | Add deprecation notices to old spec files (01-08) | P1 | 10 min |

### Medium-Term (Engine Extraction Phase)

| # | Action | Priority | Effort |
|---|---|---|---|
| 13 | Extract embedded data to external JSON files | P2 | 2-3 hrs |
| 14 | Refactor AudioManager to read from audio_config.json | P2 | 2 hrs |
| 15 | Implement town builder (one building) | P2 | 4-6 hrs |
| 16 | Implement VN dialogue engine (one scene) | P2 | 4-6 hrs |
| 17 | Implement skill tree (one branch) | P2 | 3-4 hrs |
| 18 | Implement quest tracking (3 quests) | P2 | 3-4 hrs |

### Long-Term (Feature Build Phase)

| # | Action | Priority | Effort |
|---|---|---|---|
| 19 | Full NPC system with trust, companions, shops | P3 | 1-2 days |
| 20 | Estate/family system | P3 | 2-3 days |
| 21 | Faction system with reputation | P3 | 1 day |
| 22 | Equipment/inventory with gift system | P3 | 1-2 days |
| 23 | Full skill tree (5 branches, 50+ nodes) | P3 | 2-3 days |
| 24 | Multiple stages with unique mechanics | P3 | 1-2 days per stage |

---

## Summary

| Category | Count |
|---|---|
| Critical Issues | 4 |
| Conflicts | 4 |
| Red Flags | 5 |
| Implementation Gaps | 13 |
| Specification Gaps | 6 |
| Working Features | 15 |
| Recommended Actions | 24 |

**Bottom line:** The combat prototype is solid and playable. The architecture is well-designed but mostly theoretical — no content files, no town, no VN, no skill tree. The immediate priority is fixing the 5 P0 bugs (old schema refs, ID renames, boss intro queue, W3 setTimeout). After that, the next big milestone is extracting the embedded data to external JSON files, which unlocks the entire modular content pipeline.

---

*Comprehensive Project Audit v1.0 — Generated August 24, 2026*
