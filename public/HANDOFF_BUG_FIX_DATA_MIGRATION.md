# Handoff: Data Migration Bug — Empty Town Screen

> **Date:** September 2, 2026
> **Author:** Buffy (Codebuff)
> **For:** Claude (comparison/review)

---

## What Happened

After completing Phase 0B (migrate LOCATION_TREE to JSON) and Phase 0C (migrate NPC_DATA to JSON), the town screen rendered with correct header and background but **no NPC cards, no location cards, and no breadcrumb**. The center area was completely empty.

## Root Cause

**`gameManager` passed to TownScreen was the GameManager instance, not the Game instance.**

In `engine/game.js` line 174-188, TownScreen is created with:

```javascript
this.townScreen = new TownScreen({
  audioManager: this.audioManager,
  gameManager: this.gameManager,  // ← This is new GameManager(), NOT `this` (Game)
  eventBus: this.eventBus,
  dataManager: this.dataManager,  // ← Game's DataManager, passed separately
  ...
});
```

`this.gameManager` is `new GameManager(this.eventBus)` — a separate class that manages save data, flags, currency. It does **NOT** have a `dataManager` property.

TownScreen then passed this GameManager to LocationManager:

```javascript
this.locationManager = new LocationManager(gameManager);  // gameManager = GameManager
```

LocationManager's `_getLocationsData()` tried:

```javascript
const dm = this.gameManager?.dataManager;  // undefined — GameManager has no dataManager
if (dm?.locations) return dm.locations;    // skipped
if (typeof LOCATION_TREE !== 'undefined') return LOCATION_TREE;  // also gone (script tag removed)
return { regions: [] };  // ← EMPTY — this is what rendered
```

Same issue for `_getNPCsData()` — returned `{}`.

**Two compounding factors:**
1. The old `LOCATION_TREE` and `NPC_DATA` globals were removed (script tags deleted)
2. The new JSON data wasn't accessible because LocationManager had the wrong reference

## The Fix

### 1. `engine/locationManager.js` — Accept dataManager as constructor parameter

```javascript
// Before:
constructor(gameManager) {
  this.gameManager = gameManager;
  ...
}

// After:
constructor(gameManager, dataManager) {
  this.gameManager = gameManager;
  this.dataManager = dataManager || null;
  ...
}
```

### 2. `engine/locationManager.js` — Read from `this.dataManager` instead of `this.gameManager?.dataManager`

```javascript
// Before:
_getLocationsData() {
  const dm = this.gameManager?.dataManager;  // undefined!
  if (dm?.locations) return dm.locations;
  ...
}

// After:
_getLocationsData() {
  if (this.dataManager?.locations) return this.dataManager.locations;  // works
  ...
}
```

Same change for `_getNPCsData()`.

### 3. `ui/town.js` — Store and forward dataManager

```javascript
// Before:
constructor({ audioManager, gameManager, eventBus, dataManager, ... }) {
  this.gameManager = gameManager;
  // dataManager was accepted but never stored!
  this.locationManager = new LocationManager(gameManager);
}

// After:
constructor({ audioManager, gameManager, eventBus, dataManager, ... }) {
  this.gameManager = gameManager;
  this.dataManager = dataManager;
  this.locationManager = new LocationManager(gameManager, dataManager);
}
```

## Key Lesson

The project has **three "manager" objects** with confusingly similar names:
- **`Game`** — the main class, owns `this.dataManager`
- **`GameManager`** (`this.gameManager`) — save data, flags, currency (class in `systems/progression.js`)
- **`DataManager`** (`this.dataManager`) — JSON content loading (class in `engine/core.js`)

When passing dependencies, always verify which object you're passing. `Game.gameManager !== Game.dataManager`.

## Files Modified

| File | Change |
|---|---|
| `engine/locationManager.js` | Accept `dataManager` param, read from `this.dataManager` |
| `ui/town.js` | Store `dataManager`, pass to LocationManager |
| `ui/townEngine.js` | Added debug logs (can be removed after verification) |

## Debug Logs Added (Remove After Verification)

LocationManager and TownEngine have temporary `console.warn`/`console.log` calls that should be removed once the fix is confirmed working:
- `[LocationManager] No locations data found`
- `[LocationManager] No NPCs data found`
- `[TownEngine] renderLocationCards early return`
- `[TownEngine] No current location found`
- `[TownEngine] Rendering location: ...`
- `[TownEngine] NPCs at ...`
- `[TownEngine] Children at ...`

## Verification

After fix, browser console should show:
```
[TownEngine] Rendering location: city_root Refugee Camp
[TownEngine] NPCs at city_root : 1 ["old_man"]
[TownEngine] Children at city_root : 3 ["trade_district", "residential", "wilderness"]
```

And the town screen should show:
- Elder Rowan NPC card
- Trade District, Residential, Wilderness location cards (Wilderness locked)
- Breadcrumb showing "Refugee Camp"
