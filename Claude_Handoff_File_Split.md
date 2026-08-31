# Handoff: File Split Plan Review

**Date:** August 31, 2026
**Requester:** Buffy (Freebuff agent) for Kos
**Repo:** https://github.com/kosryvrdrgn14/modularity-engine

---

## Executive Summary

We have a working Vampire Survivors-style browser game (`public/game2.html`, 10,515 lines) that needs to be split into modular files for maintainability. The game is a prototype that will eventually be ported to Godot. We need your review of the split plan, circular dependency solutions, and any risks we've missed.

**Current state:** Game is fully functional (all weapons, companions, stages, upgrades working). Just fixed a critical upgrade freeze bug via EventBus try/catch.

---

## Project Structure

```
/
├── public/
│   ├── game2.html                    # Main game (10,515 lines, monolithic)
│   ├── index.html                    # React app shell (Vite default)
│   ├── content/                      # JSON data files (loaded via fetch)
│   │   ├── characters.json
│   │   ├── weapons.json
│   │   ├── enemies.json
│   │   ├── stages.json
│   │   ├── pickups.json
│   │   └── leveling.json
│   ├── data/                         # Extracted JS data (13 files)
│   │   ├── embeddedData.js           # Fallback JSON data
│   │   ├── companionData.js          # Companion stats (7 levels each)
│   │   ├── assetMap.js               # SVG asset paths
│   │   ├── locationTree.js           # Town location hierarchy
│   │   ├── shopData.js               # Shop items
│   │   ├── disasterEvents.js         # Disaster definitions
│   │   ├── farmingConfig.js          # Auto-clear settings
│   │   ├── affectionTiers.js         # NPC affection levels
│   │   ├── estateTiers.js            # Estate upgrades
│   │   ├── childGrowthStages.js      # Children growth
│   │   ├── sandboxDefaults.js        # Sandbox mode
│   │   ├── svgPortraits.js           # SVG portrait strings
│   │   └── npcData.js                # NPC definitions
│   ├── engine/                       # Extracted engine files (38 files, NOT loaded)
│   │   ├── game.js                   # Game orchestrator (956 lines)
│   │   ├── weaponSystem.js           # 8 weapons with upgrades
│   │   ├── companionSystem.js        # Companion AI + combat
│   │   ├── renderer.js               # Canvas rendering
│   │   ├── audioManager.js           # Web Audio synthesis
│   │   └── ... (33 more files)
│   ├── assets/                       # SVG asset files
│   ├── screenshots/                  # Test screenshots
│   ├── test_*.cjs                    # Playwright headless tests
│   └── ...
├── src/                              # React app (Vite template, not used by game)
├── backup_20260827/                  # Backup of previous session
├── FILE_SPLIT_PLAN.md                # Split plan summary
├── Claude_Handoff_Upgrade_Bug.md     # Bug fix handoff (completed)
└── package.json                      # Vite + React dependencies
```

---

## What's Been Done

### ✅ Phase 1: Data Extraction (Complete)
- 13 data files extracted to `public/data/`
- Loaded via `<script>` tags in game2.html
- All data loads correctly

### ✅ Engine Files Created (But NOT Loaded)
- 38 files in `public/engine/`
- These are standalone copies of the classes
- **NOT connected to game2.html yet** — still all inline

### ✅ Bug Fixes
- EventBus `_dispatch` now wraps each listener in try/catch
- Diagnostic logging added to `selectUpgrade` handler
- 5 test files updated to reference `game2.html` instead of `game.html`

---

## Current game2.html Structure

```
Lines 1-6:       DOCTYPE + head
Lines 7-1240:    CSS (~1,234 lines)
Lines 1242-1432: HTML structure (~191 lines)
Lines 1433-1445: Data script tags (13 files)
Lines 1446-10513: Inline JavaScript (~9,068 lines)
  - 38 classes all in one <script> block
  - EventBus, DataManager, GameState, GameLoop, Camera
  - InputManager, EntityManager, SpawnSystem, MovementSystem
  - CollisionSystem, WeaponSystem, DamageSystem, PickupSystem
  - LevelingSystem, TelegraphSystem, Renderer, FloatingTextSystem
  - UIManager, AudioManager, TitleBGM, TitleMenu
  - StorageBackend, LocalStorageBackend, GameManager
  - StarSystem, FrenzySystem, GachaProtection
  - LocationManager, ShopSystem, DisasterSystem, FarmingSystem
  - AffectionSystem, EstateSystem, ChildrenSystem, SandboxSystem
  - Game (orchestrator), TownScreen
```

---

## Known Circular Dependencies

These must be resolved BEFORE splitting into ES modules:

### 1. AudioManager → Game
```
AudioManager references this.game for:
  - this.game.gameState.isBossActive()
  - this.game.gameState.isLevelUp()
  - this.game.player?.x, this.game.player?.y
  - this.game.renderer?.bossEntity
```

**Current state:** AudioManager receives `game` in constructor but also stores it as `this.game`.

### 2. TownScreen → Game
```
TownScreen references this.game for:
  - this.game.startGame()
  - this.game.townScreen.show()
  - this.game.gameManager.*
  - this.game.audioManager.*
```

**Current state:** TownScreen receives `game` in constructor, Game imports TownScreen class.

### 3. WeaponSystem → AudioManager (indirect via eventBus)
```
WeaponSystem emits events like:
  - this.eventBus.emit('weaponFire', { weaponId })
  - this.eventBus.emit('weaponLevelUp', { weaponId })
  
AudioManager listens to these events to play sounds.
```

**Current state:** This is actually GOOD — they communicate via eventBus, not direct reference.

---

## The Split Plan (6 Phases)

### Phase 0: Break Circular Dependencies 🔴 CRITICAL
**Why first:** ES modules deadlock on circular imports.

**What to fix:**
1. AudioManager: Remove `this.game` reference, receive all state via constructor params or events
2. TownScreen: Already receives `game` in constructor — ensure Game imports TownScreen, not vice versa
3. Verify no other circular refs exist

**Risk:** High — touches core systems
**Verification:** Game must run identically after each refactor

### Phase 1: Data Layer ✅ DONE
- 13 files extracted to `public/data/`
- Zero risk — data only, no logic

### Phase 2: Split Engine Core
**Target:**
```
engine/
  core.js         — EventBus, DataManager, GameState, GameLoop, Camera
  entities.js     — EntityManager, SpawnSystem, MovementSystem
  combat.js       — WeaponSystem, CollisionSystem, DamageSystem
  rendering.js    — Renderer, FloatingTextSystem
```

**Why:** Core systems have few dependencies, needed by everything else.

### Phase 3: Split Systems
**Target:**
```
systems/
  progression.js  — GameManager, StorageBackend, AffectionSystem, EstateSystem, ChildrenSystem, DisasterSystem, FarmingSystem, SandboxSystem
  pickups.js      — PickupSystem, LevelingSystem, StarSystem, FrenzySystem, GachaProtection
  companion.js    — CompanionSystem
```

**Why:** Systems depend on engine core but are self-contained.

### Phase 4: Split UI
**Target:**
```
ui/
  audio.js        — AudioManager, TitleBGM
  title.js        — TitleMenu
  town.js         — TownScreen, LocationManager, ShopSystem
  game.js         — UIManager
```

**Why:** UI depends on engine + systems.

### Phase 5: Extract CSS
**Target:**
```
styles.css — All CSS (~1,234 lines)
```

**Why:** CSS is independent, extract last to avoid breaking layout during JS splits.

### Phase 6: Slim Down game2.html
**Target:**
```
game2.html
  — HTML structure (~191 lines)
  — <link rel="stylesheet" href="styles.css">
  — <script> tags in dependency order
  — Game class (orchestrator, ~300 lines)
```

---

## Load Order (Critical!)

Scripts must load in dependency order (bottom-up):

```html
<!-- Data (no dependencies) -->
<script src="data/embeddedData.js"></script>
<script src="data/companionData.js"></script>
... (13 data files)

<!-- Engine core (depends on data) -->
<script src="engine/core.js"></script>
<script src="engine/entities.js"></script>
<script src="engine/combat.js"></script>
<script src="engine/rendering.js"></script>

<!-- Systems (depends on engine) -->
<script src="systems/progression.js"></script>
<script src="systems/pickups.js"></script>
<script src="systems/companion.js"></script>

<!-- UI (depends on engine + systems) -->
<script src="ui/audio.js"></script>
<script src="ui/game.js"></script>
<script src="ui/title.js"></script>
<script src="ui/town.js"></script>

<!-- Orchestrator (depends on everything) -->
<script>
  // Game class (slimmed down to ~300 lines)
</script>
```

---

## Questions for Claude

### 1. Circular Dependency Fixes
Is the proposed fix correct?
- AudioManager: Remove `this.game`, receive state via constructor params
- TownScreen: Already receives `game` in constructor — is this sufficient?
- Any cleaner patterns we should use?

### 2. ES Modules vs Script Tags
Should we use ES modules (import/export) instead of script tags?
- We're using Vite as dev server (supports ES modules)
- We plan to port to Godot eventually
- Is the added complexity worth it for a prototype?
- Will ES modules complicate the Godot port?

### 3. File Grouping
Is the proposed file grouping correct?
- Should AudioManager be in `ui/audio.js` or `engine/audio.js`?
- Should GameManager be in `systems/progression.js` or its own file?
- Are there classes that should be split differently?

### 4. Execution Order
What's the safest execution order?
- Should we extract data first (lowest risk)?
- Or break circular dependencies first (highest risk but unblocks everything)?
- How do we verify nothing breaks after each step?

### 5. Risks We Missed
Are there any risks we missed?
- Will multiple `<script>` tags cause performance issues?
- Will global scope pollution be a problem?
- Will Freebuff's dev server handle multiple files correctly?

### 6. Tooling
Should we adopt any tooling?
- Vite already handles HMR and bundling — should we use its module system?
- Should we add TypeScript for type safety during the split?
- Any other tooling that would make this safer?

---

## Constraints

- **No bundler for production** — this is a prototype, keep it simple
- **Must work in Freebuff WebContainer** — the dev environment runs `vite dev`
- **Must remain playable after each phase** — no big-bang migration
- **Godot port planned** — keep the architecture engine-agnostic (JSON data, clean logic)
- **Single developer** — simplicity > cleverness

---

## Verification Checklist

After each phase, verify:
- [ ] Game loads without errors
- [ ] Title screen appears
- [ ] Can start a stage
- [ ] Player moves correctly
- [ ] Weapons fire and deal damage
- [ ] Enemies spawn and die
- [ ] XP/gold pickups work
- [ ] Level-up overlay appears
- [ ] Weapon upgrades work
- [ ] Boss spawns and can be defeated
- [ ] Victory/defeat screens work
- [ ] Town screen loads
- [ ] Save/load works

---

## Additional Context

### Game Features (All Working)
- 8 weapons with 7-level upgrade system (power spikes at Lv4 and Lv7)
- 12 companions with stat scaling
- 3 stage tiers (3min, 5min, 10min)
- Boss fights with intro sequences
- Town hub with NPC dialogue
- Save/load system
- Sandbox testing mode
- Audio synthesis (Web Audio API)
- Mobile portrait layout

### Tech Stack
- Vanilla JavaScript (no framework for game)
- React + Vite + TypeScript (for project shell, not used by game)
- Canvas 2D rendering
- Web Audio API for sound
- LocalStorage for saves

---

## What We Want From You

A concrete, step-by-step execution plan that:
1. Identifies the exact changes needed for each file
2. Specifies the order of operations
3. Includes verification steps after each phase
4. Minimizes risk of breaking the game
5. Can be executed incrementally over multiple sessions

Please review and advise.

---

*Handoff prepared by Buffy — August 31, 2026*
