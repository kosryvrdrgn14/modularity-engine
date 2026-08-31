# File Split Plan — Modularity Engine

**Date:** August 31, 2026
**Current State:** `public/game2.html` (10,515 lines, monolithic)
**Goal:** Split into modular files for maintainability before Godot port

---

## Why Split?

1. **Maintainability** — 10,500 lines in one file is hard to navigate and debug
2. **Collaboration** — Multiple developers can work on separate files without merge conflicts
3. **Godot Port** — Clean separation makes it easier to port logic to GDScript
4. **Testing** — Individual modules can be tested in isolation
5. **Performance** — Smaller files load faster and are easier to cache

---

## Current Architecture

### What's Been Done
- ✅ **Phase 1: Data extraction** — 13 data files moved to `public/data/`
- ✅ **Engine files created** — 38 files in `public/engine/` (but NOT loaded yet)

### What's Still Inline in game2.html
- **CSS**: ~1,234 lines (lines 7-1240)
- **HTML**: ~191 lines (lines 1242-1432)
- **JavaScript**: ~9,068 lines (lines 1446-10513)
- **38 classes** all in one `<script>` block

---

## The Plan

### Phase 0: Break Circular Dependencies ⚠️ CRITICAL

**Why first:** Circular imports will deadlock JavaScript's module loader. Must be resolved before any file splitting.

**What to fix:**
1. **AudioManager → Game** — AudioManager currently references `this.game` for audio context and state checks. Fix: Remove `this.game` reference, receive everything via constructor params.
2. **TownScreen → Game** — TownScreen calls `game.townScreen.show()`, `game.startGame()`, etc. Fix: TownScreen receives `game` in constructor (already done), but Game must import TownScreen class, not vice versa.
3. **WeaponSystem → AudioManager** — WeaponSystem calls `audioManager.playWeaponSound()`. Fix: Use `eventBus.emit('weaponSound', { weaponId, level })` instead.

**Risk:** High — touches core systems
**Verification:** Game must run identically after each refactor

---

### Phase 1: Extract Data Layer ✅ DONE

**Why data first:** Data files have zero dependencies on game logic. Safest to extract.

**What was extracted:**
```
data/
  embeddedData.js      — characters, weapons, enemies, stages, pickups, leveling
  companionData.js     — companion stat tables (7 levels each)
  assetMap.js          — SVG asset paths
  locationTree.js      — nested location hierarchy
  shopData.js          — shop item catalog
  disasterEvents.js    — random disaster definitions
  farmingConfig.js     — auto-clear stage settings
  affectionTiers.js    — NPC affection levels
  estateTiers.js       — estate upgrade tiers
  childGrowthStages.js — children growth data
  sandboxDefaults.js   — sandbox mode settings
  svgPortraits.js      — SVG portrait strings
  npcData.js           — NPC definitions with dialogue
```

**Risk:** Low — data only, no logic
**Verification:** All data loads correctly, game runs unchanged

---

### Phase 2: Split Engine Core

**Why next:** Core systems (EventBus, GameState, Camera) have few dependencies and are needed by everything else.

**Target structure:**
```
engine/
  core.js         — EventBus, DataManager, GameState, GameLoop, Camera (~600 lines)
  entities.js     — EntityManager, SpawnSystem, MovementSystem (~500 lines)
  combat.js       — WeaponSystem, CollisionSystem, DamageSystem (~600 lines)
  rendering.js    — Renderer, FloatingTextSystem (~450 lines)
```

**What changes:**
- Add `<script src="engine/core.js"></script>` etc. to game2.html
- Remove inline class definitions
- Verify load order is correct (bottom-up dependency)

**Risk:** Medium — must get load order right
**Verification:** Game runs, all weapons fire, enemies spawn, rendering works

---

### Phase 3: Split Systems

**Why here:** Systems depend on engine core but are more self-contained than UI.

**Target structure:**
```
systems/
  progression.js  — GameManager, StorageBackend, LocalStorageBackend, AffectionSystem, EstateSystem, ChildrenSystem, DisasterSystem, FarmingSystem, SandboxSystem (~950 lines)
  pickups.js      — PickupSystem, LevelingSystem, StarSystem, FrenzySystem, GachaProtection (~450 lines)
  companion.js    — CompanionSystem (~500 lines)
```

**What changes:**
- Move progression systems to `systems/progression.js`
- Move pickup/loot systems to `systems/pickups.js`
- Move companion AI to `systems/companion.js`

**Risk:** Medium — progression system has many cross-references
**Verification:** XP/leveling works, gold/pickups work, companions fight, save/load works

---

### Phase 4: Split UI

**Why here:** UI depends on engine and systems, so split those first.

**Target structure:**
```
ui/
  audio.js        — AudioManager, TitleBGM (~1,100 lines)
  title.js        — TitleMenu (~170 lines)
  town.js         — TownScreen, LocationManager, ShopSystem (~1,400 lines)
  game.js         — UIManager (~150 lines)
```

**What changes:**
- Move AudioManager + TitleBGM to `ui/audio.js`
- Move title screen to `ui/title.js`
- Move town/hub to `ui/town.js`
- Move in-game HUD to `ui/game.js`

**Risk:** Medium — AudioManager is the most complex, has event wiring
**Verification:** Title screen works, town navigation works, audio plays, HUD displays

---

### Phase 5: Extract CSS

**Why here:** CSS is independent but affects visual appearance. Extract last to avoid breaking layout during JS splits.

**Target:**
```
styles.css — All CSS (~1,234 lines)
```

**What changes:**
- Move all CSS from `<style>` tag to `styles.css`
- Add `<link rel="stylesheet" href="styles.css">` to game2.html
- Remove `<style>` tag

**Risk:** Low — CSS is self-contained
**Verification:** All screens look identical, no styling regressions

---

### Phase 6: Slim Down game2.html

**Why last:** By now, game2.html should only contain HTML structure + Game orchestrator class.

**Target:**
```
game2.html
  — HTML structure (~191 lines)
  — <link rel="stylesheet" href="styles.css">
  — <script> tags in dependency order (data → engine → systems → ui → game)
  — Game class (orchestrator, ~300 lines)
```

**What changes:**
- Remove all inline classes (already moved to separate files)
- Keep only HTML + Game orchestrator
- Add script tags in correct load order

**Risk:** Low — by this point, everything is already split
**Verification:** Game runs, all features work, file is under 500 lines

---

## Load Order (Critical!)

Scripts must load in dependency order (bottom-up):

```html
<!-- Data (no dependencies) -->
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

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular dependencies | 🔴 Game won't load | Phase 0: Break all circular refs first |
| Wrong load order | 🔴 Classes undefined | Use dependency graph, test after each script |
| Global scope pollution | 🟡 Variable conflicts | Use IIFE or namespace pattern if needed |
| Event wiring breaks | 🟡 Sounds/UI fail | Verify eventBus connections after each split |
| CSS layout breaks | 🟢 Visual only | Test each screen after CSS extraction |

---

## Current Blockers

1. **Upgrade freeze bug** — Must fix before splitting (have full working game first)
2. **Phase 0 not started** — Circular dependencies must be resolved
3. **Engine files not loaded** — Files exist but game2.html still has everything inline

---

## Next Steps

1. ✅ Fix upgrade freeze bug (waiting on Claude feedback)
2. ⬜ Phase 0: Break circular dependencies
3. ⬜ Phase 2: Load engine files via script tags
4. ⬜ Phase 3-6: Continue split per plan

---

*Plan created by Buffy — August 31, 2026*
