# TownScreen Review — Engine vs Content Separation

**Date:** August 31, 2026
**File:** `engine/townScreen_refactored.js` (1,139 lines)
**Status:** Analysis complete, separation possible

---

## Executive Summary

The TownScreen class can be split into a **Town Engine** (UI framework) and **Town Content** (game-specific features), similar to how the combat engine is separate from weapon/enemy data.

**Current State:** 1,139 lines, 20+ methods, mixed UI and content logic
**Proposed State:** ~400 lines engine + ~700 lines content (loaded from external files)

---

## Current Method Classification

### Engine Methods (UI Framework) — ~400 lines
These handle the generic UI mechanics, not game-specific content:

| Method | Lines | Purpose |
|--------|-------|---------|
| `constructor` | 30 | Setup DOM references, dependencies |
| `_setupEvents` | 80 | Wire event listeners (dock, backdrop, swipe) |
| `show()` | 15 | Display town screen |
| `hide()` | 10 | Hide town screen |
| `_switchDockTab` | 55 | Tab navigation (map, social, systems, shop, combat) |
| `_closePanels` | 12 | Close side panels |
| `_renderBreadcrumb` | 35 | Navigation breadcrumb trail |
| `_renderLocationCards` | 70 | Location card grid |
| `_renderLeftPanel` | 50 | Left panel (NPCs, quests) |
| `_renderRightPanel` | 65 | Right panel (locations, farming) |
| `_updateSwipeIndicator` | 15 | Swipe dot indicator |
| `_swipeNextRegion` / `_swipePrevRegion` | 25 | Swipe navigation |
| `_onLocationNavigate` | 12 | Navigation callback |
| `_typewriteText` | 25 | Text animation engine |
| **Total** | **~500** | |

### Content Methods (Game Features) — ~640 lines
These handle game-specific functionality:

| Method | Lines | Purpose | Content Source |
|--------|-------|---------|----------------|
| `_updateDisplay` | 50 | Update game-specific UI | gameManager, estateSystem |
| `_openDialogue` | 20 | Open NPC dialogue | NPC_DATA |
| `_showChoices` | 55 | Show dialogue choices | NPC_DATA, affectionSystem |
| `_showDogDialogue` | 55 | Dog companion dialogue | NPC_DATA, gameManager |
| `_renderCompanionSlots` | 30 | Companion display | gameManager |
| `_createNPCCard` | 40 | NPC card creation | NPC_DATA, SVG_PORTRAITS |
| `_renderUpgradeCard` | 30 | Camp upgrade card | gameManager |
| `_showDisasterNotification` | 35 | Disaster alerts | disasterSystem |
| `_renderFarmingSlotsButton` | 35 | Farming UI | farmingSystem |
| `_openFarmingMenu` | 60 | Farming menu | farmingSystem, FARMING_CONFIG |
| `_assignFarmingSlot` | 40 | Farming assignment | farmingSystem, gameManager |
| `_collectFarmingSlot` | 20 | Farming collection | farmingSystem |
| `_showEstateProduction` | 15 | Estate notifications | estateSystem |
| `_openSandbox` | 100 | Sandbox config UI | sandboxSystem |
| **Total** | **~600** | | |

---

## Data Dependencies

### Content Data (External Files)
| Data | Used By | Current Location |
|------|---------|------------------|
| `NPC_DATA` | Dialogue, NPC cards | `data/npcData.js` |
| `SVG_PORTRAITS` | NPC portraits | `data/svgPortraits.js` |
| `FARMING_CONFIG` | Farming slots | `data/farmingConfig.js` |
| `LOCATION_TREE` | Location hierarchy | `data/locationTree.js` |
| `SHOP_DATA` | Shop items | `data/shopData.js` |
| `DISASTER_EVENTS` | Disasters | `data/disasterEvents.js` |
| `AFFECTION_TIERS` | NPC affection | `data/affectionTiers.js` |
| `ESTATE_TIERS` | Estate upgrades | `data/estateTiers.js` |

### System Dependencies
| System | Purpose |
|--------|---------|
| `gameManager` | Persistent state, flags, resources |
| `companionSystem` | Companion data |
| `estateSystem` | Estate management |
| `affectionSystem` | NPC affection |
| `farmingSystem` | Auto-clear farming |
| `disasterSystem` | Disaster events |
| `sandboxSystem` | Sandbox mode |
| `locationManager` | Location navigation |
| `shopSystem` | Shop UI |
| `audioManager` | Sound effects |

---

## Proposed Architecture

### Town Engine (`ui/townEngine.js` — ~500 lines)
**Purpose:** Generic town UI framework

**Contains:**
- Panel management (open/close/toggle)
- Tab navigation (dock tabs)
- Breadcrumb navigation
- Location card rendering
- Swipe gestures
- Typewriter text animation
- Event wiring

**Data:** None (pure UI)

### Town Content (`ui/townContent.js` — ~600 lines)
**Purpose:** Game-specific town features

**Contains:**
- NPC dialogue system
- Companion display
- Camp upgrade
- Farming system UI
- Estate notifications
- Disaster alerts
- Sandbox config

**Data:** Reads from `data/*.js` files

### Town Screen (`ui/town.js` — ~50 lines)
**Purpose:** Orchestrator that combines engine + content

**Contains:**
- `TownScreen` class
- Constructor that wires engine + content
- `show()` / `hide()` methods

---

## Comparison to Combat Engine

| Aspect | Combat | Town (Proposed) |
|--------|--------|-----------------|
| Engine | `combat.js` (WeaponSystem, etc.) | `townEngine.js` (panels, tabs, navigation) |
| Content Data | `weapons.json`, `enemies.json` | `npcData.js`, `farmingConfig.js`, etc. |
| Content Logic | Weapon firing, damage calculation | Dialogue, farming, estate |
| Orchestrator | `game.js` | `town.js` |

---

## Benefits of Separation

1. **Reusability** — Town engine could be used for other hub screens
2. **Testability** — Engine and content can be tested independently
3. **Maintainability** — UI changes don't affect game logic
4. **Extensibility** — Add new features by adding content files, not modifying engine
5. **Context Window** — Smaller files are easier to work with

---

## Implementation Plan

### Phase 1: Extract Town Engine
1. Create `ui/townEngine.js` with generic UI methods
2. Keep `ui/town.js` as orchestrator
3. Move content methods to temporary holding file

### Phase 2: Extract Town Content
1. Create `ui/townContent.js` with game-specific methods
2. Wire content to engine via callbacks/events
3. Ensure all data files are properly loaded

### Phase 3: Test & Verify
1. Verify all town features work
2. Check NPC dialogue, farming, estate, sandbox
3. Test navigation and swipe gestures

---

## Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `ui/townEngine.js` | ~500 | Generic town UI framework |
| `ui/townContent.js` | ~600 | Game-specific town features |
| `ui/town.js` | ~50 | Orchestrator (slimmed down) |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking town navigation | Low | Medium | Test thoroughly after each phase |
| Data loading issues | Medium | High | Verify all data files load before engine |
| Event wiring complexity | Medium | Medium | Use clear callback pattern |
| Performance regression | Low | Low | Profile before/after |

---

## Recommendation

**Proceed with separation.** The benefits outweigh the risks:
- Cleaner architecture
- Easier to add new town features
- Smaller files for better context management
- Consistent with combat engine pattern

**Estimated effort:** 2-3 hours
**Testing required:** Full town feature regression test

---

*Review created by Buffy — August 31, 2026*
