# Phase 0: Circular Dependencies — Status Report

**Date:** August 31, 2026
**Status:** Audit complete, TitleMenu ✅, TownScreen ✅

---

## Audit Results

### Classes That Reference `this.game` (Circular!)

| Class | Lines | `this.game.*` refs | Status |
|-------|-------|-------------------|--------|
| **TitleMenu** | 6731-7155 | 12 | ✅ Refactored |
| **TownScreen** | 9347-10519 | 58 | ✅ Refactored |

### Classes With NO Circular Dependencies ✅

| Class | Notes |
|-------|-------|
| AudioManager | Only takes `eventBus` in constructor |
| All engine classes | Receive dependencies via constructor |
| All system classes | Receive dependencies via constructor |
| UIManager | Only takes `canvas` and `eventBus` |

---

## Circular Dependency Chains

```
Game ↔ TitleMenu
  Game creates: new TitleMenu(this)
  TitleMenu calls: this.game._startFromTitle(), this.game._showSettings(), this.game._testTown()
  TitleMenu accesses: this.game.audioManager, this.game.gameManager, this.game.dataManager

Game ↔ TownScreen
  Game creates: new TownScreen(this)
  TownScreen calls: this.game.startGame()
  TownScreen accesses: this.game.audioManager, this.game.gameManager, this.game.eventBus,
                       this.game.companionSystem, this.game.estateSystem, this.game.affectionSystem,
                       this.game.farmingSystem, this.game.disasterSystem, this.game.sandboxSystem
```

---

## Refactored TitleMenu ✅

**File:** `public/engine/titleMenu_refactored.js`

**Constructor change:**
```javascript
// OLD (circular):
class TitleMenu {
  constructor(game) {
    this.game = game;
    ...
  }
}

// NEW (no circular):
class TitleMenu {
  constructor({ audioManager, gameManager, dataManager, onStart, onSettings, onTestTown }) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.dataManager = dataManager;
    this.onStart = onStart;
    this.onSettings = onSettings;
    this.onTestTown = onTestTown;
    ...
  }
}
```

**What changed:**
- `this.game.audioManager` → `this.audioManager`
- `this.game.gameManager` → `this.gameManager`
- `this.game.dataManager` → `this.dataManager`
- `this.game._startFromTitle()` → `this.onStart()`
- `this.game._showSettings()` → `this.onSettings()`
- `this.game._testTown()` → `this.onTestTown()`

**Game-side changes needed:**
```javascript
// OLD:
this.titleMenu = new TitleMenu(this);

// NEW:
this.titleMenu = new TitleMenu({
  audioManager: this.audioManager,
  gameManager: this.gameManager,
  dataManager: this.dataManager,
  onStart: () => this._startFromTitle(),
  onSettings: () => this._showSettings(),
  onTestTown: () => this._testTown(),
});
```

---

## TownScreen Refactoring ✅

**File:** `public/engine/townScreen_refactored.js`

**Constructor change:**
```javascript
// OLD (circular):
class TownScreen {
  constructor(game) {
    this.game = game;
    ...
  }
}

// NEW (no circular):
class TownScreen {
  constructor({ audioManager, gameManager, eventBus, dataManager, companionSystem, estateSystem, affectionSystem, farmingSystem, disasterSystem, sandboxSystem, startGame, getPendingDisaster, clearPendingDisaster }) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.dataManager = dataManager;
    this.companionSystem = companionSystem;
    this.estateSystem = estateSystem;
    this.affectionSystem = affectionSystem;
    this.farmingSystem = farmingSystem;
    this.disasterSystem = disasterSystem;
    this.sandboxSystem = sandboxSystem;
    this.startGame = startGame;
    this.getPendingDisaster = getPendingDisaster;
    this.clearPendingDisaster = clearPendingDisaster;
    ...
  }
}
```

**All 58 `this.game.*` references replaced:**
- `this.game.audioManager` → `this.audioManager`
- `this.game.gameManager` → `this.gameManager`
- `this.game.eventBus` → `this.eventBus`
- `this.game.companionSystem` → `this.companionSystem`
- `this.game.estateSystem` → `this.estateSystem`
- `this.game.affectionSystem` → `this.affectionSystem`
- `this.game.farmingSystem` → `this.farmingSystem`
- `this.game.disasterSystem` → `this.disasterSystem`
- `this.game.sandboxSystem` → `this.sandboxSystem`
- `this.game.dataManager` → `this.dataManager`
- `this.game.startGame()` → `this.startGame()`
- `this.game._pendingDisaster` → `this.getPendingDisaster()` / `this.clearPendingDisaster()`

---

## Game-Side Changes Needed

When ready to apply, update `game2.html`:

### TitleMenu (line 8538)
```javascript
// OLD:
this.titleMenu = new TitleMenu(this);

// NEW:
this.titleMenu = new TitleMenu({
  audioManager: this.audioManager,
  gameManager: this.gameManager,
  dataManager: this.dataManager,
  onStart: () => this._startFromTitle(),
  onSettings: () => this._showSettings(),
  onTestTown: () => this._testTown(),
});
```

### TownScreen (line 8539)
```javascript
// OLD:
this.townScreen = new TownScreen(this);

// NEW:
this.townScreen = new TownScreen({
  audioManager: this.audioManager,
  gameManager: this.gameManager,
  eventBus: this.eventBus,
  dataManager: this.dataManager,
  companionSystem: this.companionSystem,
  estateSystem: this.estateSystem,
  affectionSystem: this.affectionSystem,
  farmingSystem: this.farmingSystem,
  disasterSystem: this.disasterSystem,
  sandboxSystem: this.sandboxSystem,
  startGame: () => this.startGame(),
  getPendingDisaster: () => this._pendingDisaster,
  clearPendingDisaster: () => { this._pendingDisaster = null; },
});
```

## Changes Applied to game2.html

**Backup created:** `public/game2_backup_20260831_1018.html`

**File size:** 10,519 → 8,996 lines (removed ~1,523 lines)

**Changes made:**
1. ✅ Removed inline TitleMenu class (lines 6727-7147)
2. ✅ Removed inline TownScreen class (lines 8922-10046)
3. ✅ Added script tags for refactored files (lines 1446-1447)
4. ✅ Updated Game constructor for TitleMenu (line 8119)
5. ✅ Updated Game constructor for TownScreen (line 8129)

**Script load order:**
```
1433-1445: Data files (13 files)
1446-1447: Refactored engine files (2 files)
1448+:     Inline script (main game code)
```

**TypeScript compilation:** ✅ Passed

## Next Steps

1. ✅ Audit complete
2. ✅ TitleMenu refactored (`titleMenu_refactored.js`)
3. ✅ TownScreen refactored (`townScreen_refactored.js`)
4. ✅ Apply Game-side changes (constructor updates)
5. ✅ Remove inline classes from game2.html
6. ✅ Add `<script>` tags to load refactored files
7. ⏳ Test game in preview

---

## Non-Destructive Approach

All refactored files are created in `public/engine/` alongside the originals:
- `public/engine/titleMenu_refactored.js` ✅
- `public/engine/townScreen_refactored.js` ✅

**game2.html is NOT modified yet.** When ready, we'll:
1. Remove inline TitleMenu class (lines 6731-7155)
2. Remove inline TownScreen class (lines 9347-10519)
3. Add `<script src="engine/titleMenu_refactored.js">` 
4. Add `<script src="engine/townScreen_refactored.js">`
5. Update Game constructor to pass individual deps

---

*Phase 0 status by Buffy — August 31, 2026*
