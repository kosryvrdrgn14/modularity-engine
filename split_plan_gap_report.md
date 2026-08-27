# Split Plan Gap Report

**Date:** August 27, 2026
**File:** `public/game2.html` (9,762 lines, 374 KB)
**Status:** Backup created at `backup_20260827/`

---

## Executive Summary

The split plan has **3 critical issues** and **5 moderate issues** that must be resolved before splitting. The biggest blocker is **circular dependencies** — in a monolithic file they work fine, but circular imports between ES modules will break.

**Recommendation:** Refactor to break circular dependencies BEFORE splitting, or use a different module strategy.

---

## Critical Issues

### 1. Circular Dependency: Game ↔ AudioManager

```
AudioManager references Game (for audio context, state checks)
Game references AudioManager (for sound playback)
```

**Impact:** If `AudioManager` imports `Game` and `Game` imports `AudioManager`, JavaScript module loader will deadlock.

**Fix Options:**
- **A.** Inject AudioManager into Game via constructor (already done), remove Game reference from AudioManager
- **B.** Create an `IAudioContext` interface that AudioManager exposes, Game imports only the interface
- **C.** Use dependency injection — pass needed Game methods as callbacks to AudioManager

**Recommended:** Option A — AudioManager should NOT import Game. It should receive everything it needs via constructor parameters.

### 2. Circular Dependency: Game ↔ TownScreen

```
TownScreen references Game (for game.townScreen.show(), game.startGame(), etc.)
Game references TownScreen (for this.townScreen = new TownScreen(this))
```

**Impact:** Same deadlock issue.

**Fix Options:**
- **A.** TownScreen receives Game reference via constructor (already done), Game imports TownScreen class
- **B.** TownScreen emits events instead of calling Game methods directly

**Recommended:** Option A — TownScreen already receives `game` in constructor. Just ensure Game imports TownScreen class, not vice versa.

### 3. Engine → UI Dependency Chain

```
WeaponSystem (engine/combat.js) → AudioManager (ui/audio.js)
DamageSystem (engine/combat.js) → PickupSystem (systems/pickups.js) → LevelingSystem → Renderer
FloatingTextSystem (engine/rendering.js) → UIManager (ui/game.js)
```

**Impact:** Engine classes depend on UI classes, breaking the clean separation.

**Fix Options:**
- **A.** Move AudioManager to engine/ (it's a system, not really UI)
- **B.** Use event bus exclusively — engine emits events, UI listens
- **C.** Create interfaces/abstractions between layers

**Recommended:** Option B — The EventBus already exists. Replace direct references with event emissions.

---

## Moderate Issues

### 4. Global Constants and Data

**Current state:** `SVG_PORTRAITS`, `NPC_DATA`, `COMPANION_DATA`, `LOCATION_TREE`, `TOWN_LOCATIONS`, `SHOP_ITEMS`, etc. are defined inline in the file.

**Issue:** These need to be in a shared data file accessible by multiple modules.

**Fix:** Create `data/constants.js` with all shared data, import in each module.

### 5. Embedded JSON Data

**Current state:** `DataManager` loads embedded JSON data (characters, weapons, enemies, stages, etc.) from `content/*.json` files with fallbacks.

**Issue:** The embedded data is a ~50KB string literal inside the file.

**Fix:** Move embedded data to `data/embedded.json` or keep in `data/constants.js`.

### 6. CSS Must Stay with HTML

**Current state:** 1,167 lines of CSS in `<style>` tag.

**Issue:** CSS can't be imported via JavaScript modules. Must either:
- Stay in `game.html` `<style>` tag
- Move to `styles.css` and link via `<link>` tag

**Recommendation:** Move to `styles.css` for cleaner separation.

### 7. HTML Structure

**Current state:** ~185 lines of HTML for all screens (title, town, dialogue, shop, etc.).

**Issue:** HTML references IDs that JavaScript expects. If HTML is split into templates, IDs must remain stable.

**Recommendation:** Keep all HTML in `game.html`, split only CSS and JavaScript.

### 8. Script Load Order

**Current state:** All classes defined in one `<script>` tag, no import/export.

**Issue:** When splitting into files, load order matters. Classes must be defined before they're used.

**Fix:** Use `<script>` tags in dependency order, or convert to ES modules with Vite.

---

## Dependency Graph (Corrected for Split)

### Load Order (bottom-up)

```
1. data/constants.js     — Shared data, no dependencies
2. engine/core.js        — EventBus, DataManager, GameState, GameLoop, Camera
3. engine/entities.js    — EntityManager, SpawnSystem, MovementSystem
4. engine/rendering.js   — Renderer, FloatingTextSystem (needs UIManager interface)
5. engine/combat.js      — WeaponSystem, CollisionSystem, DamageSystem, TelegraphSystem
6. systems/pickups.js    — PickupSystem, LevelingSystem, StarSystem, FrenzySystem, GachaProtection
7. systems/progression.js — GameManager, StorageBackend, AffectionSystem, EstateSystem, etc.
8. systems/companion.js  — CompanionSystem
9. ui/audio.js           — AudioManager, TitleBGM (needs audio context interface)
10. ui/game.js           — UIManager
11. ui/title.js          — TitleMenu
12. ui/town.js           — TownScreen, LocationManager, ShopSystem
13. game.html            — Game class (orchestrator), HTML, CSS
```

### Circular Dependencies to Break

| From | To | Issue | Fix |
|---|---|---|---|
| AudioManager | Game | Audio needs game state | Inject via constructor, remove import |
| TownScreen | Game | Town calls game methods | Already injected, remove import |
| WeaponSystem | AudioManager | Weapon plays sounds | Use EventBus events |
| DamageSystem | PickupSystem | Damage drops pickups | Use EventBus events |
| FloatingTextSystem | UIManager | Float text uses canvas | Already has canvas ref |
| CompanionSystem | SpawnSystem | Companion spawns entities | Use EventBus events |

---

## Recommended Approach

### Phase 1: Break Circular Dependencies (in game2.html)

Before splitting, refactor these circular references:

1. **AudioManager** — Remove `this.game` reference, receive all needed values via constructor
2. **WeaponSystem** — Replace `audioManager.playWeaponSound()` with `eventBus.emit('weaponSound', ...)`
3. **DamageSystem** — Replace direct PickupSystem call with `eventBus.emit('dropPickup', ...)`
4. **TownScreen** — Verify Game reference is only via constructor (already done)

### Phase 2: Extract Data Layer

1. Create `data/constants.js` with all shared constants
2. Create `data/embedded.json` with embedded data
3. Update DataManager to import from data layer

### Phase 3: Split Engine (no UI dependencies)

1. Create `engine/core.js` — EventBus, DataManager, GameState, GameLoop, Camera
2. Create `engine/entities.js` — EntityManager, SpawnSystem, MovementSystem
3. Create `engine/rendering.js` — Renderer, FloatingTextSystem
4. Create `engine/combat.js` — WeaponSystem, CollisionSystem, DamageSystem, TelegraphSystem

### Phase 4: Split Systems

1. Create `systems/pickups.js` — PickupSystem, LevelingSystem, StarSystem, FrenzySystem, GachaProtection
2. Create `systems/progression.js` — GameManager, StorageBackend, AffectionSystem, EstateSystem, ChildrenSystem, DisasterSystem, FarmingSystem, SandboxSystem
3. Create `systems/companion.js` — CompanionSystem

### Phase 5: Split UI

1. Create `ui/audio.js` — AudioManager, TitleBGM
2. Create `ui/game.js` — UIManager
3. Create `ui/title.js` — TitleMenu
4. Create `ui/town.js` — TownScreen, LocationManager, ShopSystem

### Phase 6: Slim Down game.html

1. Move CSS to `styles.css`
2. Keep HTML structure
3. Keep only Game class (orchestrator, ~300 lines)
4. Add `<script>` tags in correct load order

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Circular imports break module loading | 🔴 Critical | Break cycles before splitting |
| Load order issues | 🟡 Moderate | Test after each file extraction |
| Shared state (eventBus) not accessible | 🟡 Moderate | Pass via constructor, not import |
| CSS specificity changes | 🟢 Low | Keep all CSS in one file |
| HTML ID mismatches | 🟢 Low | Keep HTML in game.html |
| Performance (multiple HTTP requests) | 🟢 Low | Prototype only, not production |

---

## Estimated Effort

| Phase | Effort | Risk |
|---|---|---|
| Phase 1: Break circular deps | 2-3 hours | High |
| Phase 2: Extract data | 1 hour | Low |
| Phase 3: Split engine | 1 hour | Medium |
| Phase 4: Split systems | 1 hour | Low |
| Phase 5: Split UI | 1 hour | Medium |
| Phase 6: Slim game.html | 30 min | Low |
| **Total** | **6-7 hours** | |

---

## Conclusion

**The split is worth doing but requires preparation.** The circular dependencies between Game, AudioManager, and TownScreen are the main blocker. Once those are broken (by removing direct Game references from child classes), the rest of the split is straightforward.

**Alternative:** If time is limited, keep the monolithic file but extract just the data layer (`data/constants.js`) to reduce file size by ~30%. This gives immediate benefit without the risk of breaking circular dependencies.
