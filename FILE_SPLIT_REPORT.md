# File Split Report — Modularity Engine

**Date:** August 31, 2026
**Status:** ✅ Complete
**Original:** `game2.html` (10,519 lines, monolithic)
**Final:** `game2.html` (249 lines, modular)

---

## Executive Summary

The game was successfully split from a single 10,519-line monolithic file into 28+ modular files. The split followed a 6-phase plan:

1. **Phase 0:** Broke circular dependencies (TitleMenu, TownScreen)
2. **Phase 1:** Extracted 13 data files
3. **Phase 2:** Extracted 17 engine core classes
4. **Phase 3:** Extracted 13 system classes
5. **Phase 4:** Extracted 5 UI classes
6. **Phase 5:** Extracted CSS to external file
7. **Phase 6:** Slimmed game2.html to 249 lines

**Result:** 97.6% reduction in game2.html, fully modular architecture.

---

## File Structure

```
public/
├── game2.html              # 249 lines (HTML + initialization)
├── styles.css              # 1,232 lines (all CSS)
│
├── data/                   # 13 files (game data)
│   ├── embeddedData.js     # 1,996 lines — Fallback JSON data
│   ├── companionData.js    # 216 lines — Companion stats (7 levels each)
│   ├── npcData.js          # 175 lines — NPC definitions with dialogue
│   ├── locationTree.js     # 92 lines — Town location hierarchy
│   ├── shopData.js         # 30 lines — Shop items
│   ├── assetMap.js         # 24 lines — SVG asset paths
│   ├── farmingConfig.js    # 15 lines — Auto-clear settings
│   ├── svgPortraits.js     # 15 lines — SVG portrait strings
│   ├── sandboxDefaults.js  # 13 lines — Sandbox mode settings
│   ├── affectionTiers.js   # 9 lines — NPC affection levels
│   ├── disasterEvents.js   # 9 lines — Disaster definitions
│   ├── estateTiers.js      # 9 lines — Estate upgrade tiers
│   └── childGrowthStages.js # 3 lines — Children growth data
│
├── engine/                 # 8 files (core systems)
│   ├── game.js             # 990 lines — Game orchestrator
│   ├── core.js             # 518 lines — EventBus, DataManager, GameState, GameLoop, Camera, InputManager
│   ├── entities.js         # 506 lines — EntityManager, SpawnSystem, MovementSystem
│   ├── combat.js           # 831 lines — CollisionSystem, WeaponSystem, DamageSystem
│   ├── pickup.js           # 547 lines — PickupSystem, LevelingSystem, TelegraphSystem
│   ├── rendering.js        # 573 lines — Renderer, FloatingTextSystem
│   ├── titleMenu_refactored.js # 428 lines — Title menu (no circular deps)
│   └── townScreen_refactored.js # 1,139 lines — Town hub (no circular deps)
│
├── systems/                # 3 files (game systems)
│   ├── companion.js        # 1,010 lines — CompanionSystem
│   ├── progression.js      # 937 lines — GameManager, StorageBackend, LocalStorageBackend, AffectionSystem, EstateSystem, ChildrenSystem, DisasterSystem, FarmingSystem, SandboxSystem
│   └── loot.js             # 102 lines — StarSystem, FrenzySystem, GachaProtection
│
└── ui/                     # 3 files (UI components)
    ├── audio.js            # 1,146 lines — AudioManager, TitleBGM
    ├── game.js             # 148 lines — UIManager
    └── town.js             # 182 lines — LocationManager, ShopSystem
```

---

## Detailed File Descriptions

### game2.html (249 lines)
**Purpose:** HTML entry point and initialization script

**Contains:**
- HTML `<head>` with CSS link
- All HTML elements (overlays, screens, UI containers)
- Script tags loading all JS files in dependency order
- Inline `<script>` with Game initialization only

**Dependencies:** All other files

---

### styles.css (1,232 lines)
**Purpose:** All CSS styles for the game

**Contains:**
- Canvas and screen layouts
- Title screen styles
- Town screen styles
- Level-up overlay styles
- Shop overlay styles
- Settings screen styles
- Responsive adjustments
- Keyframe animations (pulse, fadeIn)

**Dependencies:** None (loaded via `<link>` tag)

---

### data/ Files (13 files, 2,606 lines total)

#### embeddedData.js (1,996 lines)
**Purpose:** Fallback game data when JSON files can't be loaded

**Contains:**
- Character definitions
- Weapon stats (7 levels each)
- Enemy types and stats
- Stage configurations
- Pickup definitions
- Leveling curves

#### companionData.js (216 lines)
**Purpose:** Companion stat tables

**Contains:**
- 13 companions × 7 levels each
- Primary/secondary damage
- Cooldowns
- Special abilities

#### npcData.js (175 lines)
**Purpose:** NPC definitions for town

**Contains:**
- Dialogue trees
- Unlock conditions
- Affection levels
- Location assignments

#### locationTree.js (92 lines)
**Purpose:** Town location hierarchy

**Contains:**
- Nested location structure
- Region definitions
- Unlock requirements
- Background images

#### shopData.js (30 lines)
**Purpose:** Shop item catalog

**Contains:**
- Combat items
- Companion items
- Estate items
- Gift items

#### assetMap.js (24 lines)
**Purpose:** SVG asset paths

**Contains:**
- Entity sprite paths
- UI element paths
- Background images

#### farmingConfig.js (15 lines)
**Purpose:** Auto-clear farming settings

**Contains:**
- Slot types
- Slot labels
- Time requirements

#### svgPortraits.js (15 lines)
**Purpose:** SVG portrait strings for NPCs

**Contains:**
- Inline SVG for each NPC

#### sandboxDefaults.js (13 lines)
**Purpose:** Sandbox mode configuration

**Contains:**
- Default weapon levels
- Default difficulty
- DPS display settings

#### affectionTiers.js (9 lines)
**Purpose:** NPC affection level thresholds

**Contains:**
- Tier names
- Point requirements
- Unlock rewards

#### disasterEvents.js (9 lines)
**Purpose:** Random disaster definitions

**Contains:**
- Disaster types
- Gold costs
- Effects

#### estateTiers.js (9 lines)
**Purpose:** Estate upgrade tiers

**Contains:**
- Upgrade levels
- Resource requirements
- Production rates

#### childGrowthStages.js (3 lines)
**Purpose:** Children growth data

**Contains:**
- Growth stage names
- Age requirements

---

### engine/ Files (8 files, 5,532 lines total)

#### game.js (990 lines)
**Purpose:** Main game orchestrator

**Contains:**
- `Game` class
- System initialization
- Game loop coordination
- Event wiring
- State management

**Dependencies:** All other engine, system, and UI files

---

#### core.js (518 lines)
**Purpose:** Core infrastructure classes

**Contains:**
- `EventBus` — Central event routing with re-entrancy protection
- `DataManager` — Embedded data loader with JSON fallback
- `GameState` — State machine with validated transitions
- `GameLoop` — requestAnimationFrame loop
- `Camera` — Viewport tracking + screen shake
- `InputManager` — Keyboard + mouse + touch input

**Dependencies:** None (loaded first)

---

#### entities.js (506 lines)
**Purpose:** Entity management and spawning

**Contains:**
- `EntityManager` — Object pool + entity lifecycle
- `SpawnSystem` — Enemy wave spawning
- `MovementSystem` — Entity movement + projectile tracking

**Dependencies:** core.js

---

#### combat.js (831 lines)
**Purpose:** Combat and weapon systems

**Contains:**
- `CollisionSystem` — Hit detection
- `WeaponSystem` — 8 weapons with upgrade system
- `DamageSystem` — Damage application + death handling

**Dependencies:** core.js, entities.js

---

#### pickup.js (547 lines)
**Purpose:** Loot and progression systems

**Contains:**
- `PickupSystem` — Loot drops + collection
- `LevelingSystem` — XP + level-up queue
- `TelegraphSystem` — Boss attack telegraphs

**Dependencies:** core.js, entities.js

---

#### rendering.js (573 lines)
**Purpose:** Visual rendering

**Contains:**
- `Renderer` — Canvas drawing + effects
- `FloatingTextSystem` — Damage numbers + notifications

**Dependencies:** core.js

---

#### titleMenu_refactored.js (428 lines)
**Purpose:** Title screen navigation

**Contains:**
- `TitleMenu` class
- Menu navigation
- Stage selection
- Weapon/companion loadout

**Dependencies:** core.js (audioManager, gameManager, dataManager)

**Note:** Refactored to remove circular dependency on Game

---

#### townScreen_refactored.js (1,139 lines)
**Purpose:** Town hub screen

**Contains:**
- `TownScreen` class
- NPC dialogue system
- Location navigation
- Shop integration
- Farming system UI

**Dependencies:** core.js, systems/companion.js, systems/progression.js

**Note:** Refactored to remove circular dependency on Game

---

### systems/ Files (3 files, 2,049 lines total)

#### companion.js (1,010 lines)
**Purpose:** Companion AI and combat

**Contains:**
- `CompanionSystem` class
- 13 companion types
- AI behaviors (melee, ranged, healer, tank, etc.)
- Weapon buff system

**Dependencies:** core.js, entities.js

---

#### progression.js (937 lines)
**Purpose:** Game progression and persistence

**Contains:**
- `GameManager` — Persistent game state + save/load
- `StorageBackend` — Abstract storage interface
- `LocalStorageBackend` — localStorage implementation
- `AffectionSystem` — NPC affection tracking
- `EstateSystem` — Wife estate management
- `ChildrenSystem` — Legacy companion children
- `DisasterSystem` — Random disaster events
- `FarmingSystem` — Auto-clear stage farming
- `SandboxSystem` — Endgame testing mode

**Dependencies:** core.js

---

#### loot.js (102 lines)
**Purpose:** Loot drop systems

**Contains:**
- `StarSystem` — Stage star evaluation
- `FrenzySystem` — Post-3-star chaos mode
- `GachaProtection` — Rare drop pity system

**Dependencies:** None

---

### ui/ Files (3 files, 1,476 lines total)

#### audio.js (1,146 lines)
**Purpose:** Sound system

**Contains:**
- `AudioManager` — Web Audio API sound synthesis
- `TitleBGM` — Procedural title screen music
- 16-slot SFX pool
- Pickup triad engine
- Boss/level-up/hurt sounds

**Dependencies:** core.js (eventBus)

---

#### game.js (148 lines)
**Purpose:** In-game HUD

**Contains:**
- `UIManager` — HUD + upgrade selection
- Health/XP/gold display
- Level-up overlay

**Dependencies:** core.js (eventBus)

---

#### town.js (182 lines)
**Purpose:** Town navigation systems

**Contains:**
- `LocationManager` — Nested location navigation
- `ShopSystem` — Grand Bazaar shop UI

**Dependencies:** core.js (gameManager, eventBus)

---

## Script Load Order

```html
<!-- 1. Data files (no dependencies) -->
<script src="data/embeddedData.js"></script>
<script src="data/companionData.js"></script>
<script src="data/assetMap.js"></script>
<script src="data/locationTree.js"></script>
<script src="data/shopData.js"></script>
<script src="data/disasterEvents.js"></script>
<script src="data/farmingConfig.js"></script>
<script src="data/affectionTiers.js"></script>
<script src="data/estateTiers.js"></script>
<script src="data/childGrowthStages.js"></script>
<script src="data/sandboxDefaults.js"></script>
<script src="data/svgPortraits.js"></script>
<script src="data/npcData.js"></script>

<!-- 2. Refactored UI (no circular deps) -->
<script src="engine/titleMenu_refactored.js"></script>
<script src="engine/townScreen_refactored.js"></script>

<!-- 3. Engine core (depends on data) -->
<script src="engine/core.js"></script>
<script src="engine/entities.js"></script>
<script src="engine/combat.js"></script>
<script src="engine/pickup.js"></script>
<script src="engine/rendering.js"></script>

<!-- 4. Systems (depends on engine) -->
<script src="systems/companion.js"></script>
<script src="systems/progression.js"></script>
<script src="systems/loot.js"></script>

<!-- 5. UI (depends on engine + systems) -->
<script src="ui/audio.js"></script>
<script src="ui/game.js"></script>
<script src="ui/town.js"></script>

<!-- 6. Orchestrator (depends on everything) -->
<script src="engine/game.js"></script>

<!-- 7. Initialization -->
<script>
  const game = new Game();
  window.game = game;
  game.init().catch(console.error);
</script>
```

---

## Statistics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| game2.html lines | 10,519 | 249 | -97.6% |
| Classes in game2.html | 38 | 0 | -100% |
| Total JS files | 1 | 28+ | +2,700% |
| CSS location | Inline | External | Moved |
| Circular dependencies | 2 | 0 | -100% |

---

## Key Architectural Decisions

### 1. Dependency Injection Over Global Access
- TitleMenu and TownScreen receive dependencies via constructor
- No `this.game` references — prevents circular dependencies
- Callbacks for actions (startGame, onSettings, etc.)

### 2. EventBus for Communication
- Classes communicate via events, not direct references
- Central event routing with re-entrancy protection
- Easy to add new features without coupling

### 3. Data-Driven Design
- All game data in separate JSON/JS files
- Easy to modify balance without touching code
- Fallback to embedded data if files can't load

### 4. Modular File Structure
- Each file has single responsibility
- Clear dependency hierarchy
- Easy to test individual components

---

## Files Created During Split

### Backup Files
- `game2_backup_20260831_1018.html` — Pre-split backup
- `game2_backup_monolithic.html` — Earlier backup
- `game2_backup_v0.7.0.html` — Version backup

### Documentation
- `FILE_SPLIT_PLAN.md` — Original split plan
- `FILE_SPLIT_REPORT.md` — This report
- `PHASE0_CIRCULAR_DEPS_STATUS.md` — Circular dependency docs
- `PHASE5_CSS_EXTRACTION_COMPARISON.md` — CSS comparison guide
- `Claude_Handoff_Upgrade_Bug.md` — Bug fix handoff
- `Claude_Handoff_File_Split.md` — Split handoff for Claude

---

## Next Steps

1. **Test the game** — Verify all features work in preview
2. **Clean up old files** — Remove duplicate engine files from earlier extraction attempts
3. **Commit to GitHub** — Push the modular codebase
4. **Continue development** — Add new features to individual files

---

*Report created by Buffy — August 31, 2026*
