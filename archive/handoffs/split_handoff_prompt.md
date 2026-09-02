# File Split Handoff Prompt — Modularity Engine

## Context

You are reviewing a file split plan for a browser-based Vampire Survivors-style game called "Modularity Engine." The game is currently a single `game2.html` file (9,762 lines, 374 KB) containing all CSS, HTML, and JavaScript. We want to split it into separate files for maintainability.

The game is a prototype that will eventually be ported to Godot. For now, it runs as a single HTML file with vanilla JavaScript (no bundler, no ES modules yet — just `<script>` tags).

## What We Need From You

1. **Review the split plan** — Is the proposed file structure correct? Are there better groupings?
2. **Validate the circular dependency fixes** — Are the proposed fixes (event bus, constructor injection) the right approach?
3. **Identify any risks we missed** — Will this split break anything in the game?
4. **Recommend the safest execution order** — What should we split first? What should we split last?
5. **Suggest any architectural improvements** — Should we adopt ES modules? Use Vite? Something else?

## Current Architecture

### File: `public/game2.html` (9,762 lines)

**Structure:**
- Lines 7-1181: CSS (~1,167 lines)
- Lines 1182-1366: HTML (~185 lines)
- Lines 1367-9762: JavaScript (~8,380 lines)

**30+ Classes:**

| Class | Lines | Dependencies | Notes |
|---|---|---|---|
| EventBus | 66 | DataManager | Central event system |
| DataManager | 55 | GameState | Embedded JSON data loader |
| GameState | 320 | GameLoop | State machine with transitions |
| GameLoop | 53 | Camera | requestAnimationFrame loop |
| Camera | 62 | InputManager | Viewport tracking + screen shake |
| InputManager | 176 | EntityManager, UIManager | Keyboard + mouse + touch input |
| EntityManager | 142 | none | Object pool + entity lifecycle |
| CompanionSystem | 501 | DamageSystem, SpawnSystem | NPC companion AI + combat |
| SpawnSystem | 148 | MovementSystem | Enemy wave spawning |
| MovementSystem | 228 | CollisionSystem | Entity movement + projectile tracking |
| CollisionSystem | 82 | WeaponSystem | Hit detection |
| WeaponSystem | 386 | AudioManager, DamageSystem | 5 weapons with upgrade system |
| DamageSystem | 124 | PickupSystem | Damage application + death handling |
| PickupSystem | 143 | LevelingSystem | Loot drops + collection |
| LevelingSystem | 118 | Renderer | XP + level-up queue |
| TelegraphSystem | 300 | none | Boss attack telegraphs |
| Renderer | 366 | none | Canvas drawing + effects |
| FloatingTextSystem | 72 | UIManager | Damage numbers + notifications |
| UIManager | 151 | none | HUD + upgrade selection |
| AudioManager | 904 | Game | Web Audio API sound synthesis |
| TitleBGM | 195 | none | Procedural title screen music |
| TitleMenu | 167 | none | Title screen navigation |
| StorageBackend | 6 | none | Abstract storage interface |
| LocalStorageBackend | 18 | StorageBackend | localStorage implementation |
| GameManager | 469 | LocalStorageBackend | Persistent game state + save/load |
| StarSystem | 52 | none | Stage star evaluation |
| FrenzySystem | 26 | none | Post-3-star chaos mode |
| GachaProtection | 112 | none | Rare drop pity system |
| LocationManager | 122 | none | Nested location navigation |
| ShopSystem | 91 | none | Grand Bazaar shop UI |
| DisasterSystem | 47 | none | Random disaster events |
| FarmingSystem | 130 | none | Auto-clear stage farming |
| AffectionSystem | 53 | none | NPC affection tracking |
| EstateSystem | 76 | none | Wife estate management |
| ChildrenSystem | 89 | none | Legacy companion children |
| SandboxSystem | 78 | none | Endgame testing mode |
| Game | 1098 | ALL other classes | Main orchestrator |
| TownScreen | 1172 | Game, LocationManager, ShopSystem | Town UI + navigation |

### Circular Dependencies Found

```
AudioManager → Game → AudioManager
Game → TownScreen → Game
WeaponSystem → AudioManager → Game → WeaponSystem
DamageSystem → PickupSystem → LevelingSystem → Renderer (one-way, OK)
CompanionSystem → SpawnSystem → MovementSystem → CollisionSystem → WeaponSystem → AudioManager → Game → CompanionSystem (long chain)
```

### Shared State

- **eventBus**: 28 classes receive this via constructor — central communication
- **entityManager**: 8 classes reference this — entity lifecycle
- **gameManager**: 10 classes reference this — persistent state
- **dataManager**: 5 classes reference this — embedded data access
- **game**: AudioManager and TownScreen reference the Game orchestrator directly

### Data Objects (not classes)

These are defined inline and referenced by multiple classes:
- `SVG_PORTRAITS` — SVG strings for NPC/companion portraits
- `NPC_DATA` — NPC definitions with dialogue, locations, unlocks
- `COMPANION_DATA` — Companion stat tables (7 levels each)
- `LOCATION_TREE` — Nested location hierarchy for town
- `TOWN_LOCATIONS` — Location display data
- `SHOP_ITEMS` — Grand Bazaar item catalog
- Embedded JSON fallbacks — characters, weapons, enemies, stages, pickups, leveling

## Proposed Split Plan

### Phase 0: Break Circular Dependencies (in game2.html)

Before splitting, refactor these in the monolithic file:

1. **AudioManager** — Remove `this.game` reference. Receive `audioContext`, `eventBus`, and any needed game state via constructor params.
2. **WeaponSystem** — Replace `audioManager.playWeaponSound()` with `eventBus.emit('weaponSound', { weaponId, level })`.
3. **DamageSystem** — Replace direct `PickupSystem` call with `eventBus.emit('dropPickup', { enemy, x, y })`.
4. **TownScreen** — Already receives `game` via constructor. Verify no forward imports needed.

### Phase 1: Extract Data Layer

```
data/
  constants.js    — SVG_PORTRAITS, NPC_DATA, COMPANION_DATA, LOCATION_TREE, SHOP_ITEMS
  embedded.json   — characters, weapons, enemies, stages, pickups, leveling (fallback data)
```

### Phase 2: Split Engine

```
engine/
  core.js         — EventBus, DataManager, GameState, GameLoop, Camera (~600 lines)
  entities.js     — EntityManager, SpawnSystem, MovementSystem (~500 lines)
  combat.js       — WeaponSystem, CollisionSystem, DamageSystem, TelegraphSystem (~800 lines)
  rendering.js    — Renderer, FloatingTextSystem (~450 lines)
```

### Phase 3: Split Systems

```
systems/
  progression.js  — GameManager, StorageBackend, LocalStorageBackend, AffectionSystem, EstateSystem, ChildrenSystem, DisasterSystem, FarmingSystem, SandboxSystem (~950 lines)
  pickups.js      — PickupSystem, LevelingSystem, StarSystem, FrenzySystem, GachaProtection (~450 lines)
  companion.js    — CompanionSystem (~500 lines)
```

### Phase 4: Split UI

```
ui/
  audio.js        — AudioManager, TitleBGM (~1,100 lines)
  title.js        — TitleMenu (~170 lines)
  town.js         — TownScreen, LocationManager, ShopSystem (~1,400 lines)
  game.js         — UIManager (~150 lines)
```

### Phase 5: Extract CSS

```
styles.css        — All CSS (~1,167 lines)
```

### Phase 6: Slim Down game.html

```
game.html
  — HTML structure (~185 lines)
  — <link rel="stylesheet" href="styles.css">
  — <script> tags in dependency order
  — Game class (orchestrator, ~300 lines)
```

### Load Order (bottom-up)

```html
<script src="data/constants.js"></script>
<script src="engine/core.js"></script>
<script src="engine/entities.js"></script>
<script src="engine/rendering.js"></script>
<script src="engine/combat.js"></script>
<script src="systems/pickups.js"></script>
<script src="systems/progression.js"></script>
<script src="systems/companion.js"></script>
<script src="ui/audio.js"></script>
<script src="ui/game.js"></script>
<script src="ui/title.js"></script>
<script src="ui/town.js"></script>
<script src="game.html#game-script"></script>  <!-- Game class inline -->
```

## Questions for Claude

1. **Is the circular dependency fix correct?** Specifically:
   - AudioManager removing `this.game` and receiving everything via constructor
   - WeaponSystem using eventBus instead of direct AudioManager call
   - Is there a cleaner pattern we should use?

2. **Should we use ES modules (import/export) instead of script tags?**
   - We're using Vite as dev server, which supports ES modules
   - But we plan to port to Godot eventually — will ES modules complicate that?
   - Is the added complexity worth it for a prototype?

3. **Is the file grouping correct?** Specifically:
   - Should AudioManager be in `ui/audio.js` or `engine/audio.js`?
   - Should GameManager be in `systems/progression.js` or its own file?
   - Are there classes that should be split differently?

4. **What's the safest execution order?**
   - Should we extract data first (lowest risk)?
   - Or break circular dependencies first (highest risk but unblocks everything)?
   - How do we verify nothing breaks after each step?

5. **Are there any risks we missed?**
   - Will multiple `<script>` tags cause performance issues?
   - Will global scope pollution be a problem?
   - Will the Freebuff WebContainer (our dev environment) handle multiple files correctly?

6. **Should we adopt any tooling?**
   - Vite already handles HMR and bundling — should we use its module system?
   - Should we add TypeScript for type safety during the split?
   - Any other tooling that would make this safer?

## Constraints

- **No bundler for production** — this is a prototype, keep it simple
- **Must work in Freebuff WebContainer** — the dev environment runs `vite dev`
- **Must remain playable after each phase** — no big-bang migration
- **Godot port planned** — keep the architecture engine-agnostic (JSON data, clean logic)
- **Single developer** — simplicity > cleverness

## What We Want

A concrete, step-by-step execution plan that:
1. Identifies the exact changes needed for each file
2. Specifies the order of operations
3. Includes verification steps after each phase
4. Minimizes risk of breaking the game
5. Can be executed incrementally over multiple sessions

Please review and advise.
