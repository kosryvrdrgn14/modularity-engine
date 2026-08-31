# Phase 0: Circular Dependencies — Status Report

**Date:** August 31, 2026
**Status:** Audit complete, TitleMenu refactored, TownScreen pending

---

## Audit Results

### Classes That Reference `this.game` (Circular!)

| Class | Lines | `this.game.*` refs | Status |
|-------|-------|-------------------|--------|
| **TitleMenu** | 6731-7155 | 12 | ✅ Refactored |
| **TownScreen** | 9347-10519 | 58 | ⏳ Pending |

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

## TownScreen Refactoring (Pending)

**Complexity:** 58 `this.game.*` references across 1173 lines

**Dependencies to inject:**
```javascript
class TownScreen {
  constructor({
    audioManager,
    gameManager,
    eventBus,
    companionSystem,
    estateSystem,
    affectionSystem,
    farmingSystem,
    disasterSystem,
    sandboxSystem,
    dataManager,
    startGame,      // callback
  }) {
    ...
  }
}
```

**Properties accessed:**
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
- `this.game._pendingDisaster` → `this._pendingDisaster` (or inject via constructor)

---

## Next Steps

1. ✅ Audit complete
2. ✅ TitleMenu refactored (`titleMenu_refactored.js`)
3. ⏳ TownScreen refactoring (58 refs, ~1173 lines)
4. ⏳ Apply Game-side changes (constructor updates)
5. ⏳ Test game after each change
6. ⏳ Remove inline classes from game2.html
7. ⏳ Add `<script>` tags to load refactored files

---

## Non-Destructive Approach

All refactored files are created in `public/engine/` alongside the originals:
- `public/engine/titleMenu_refactored.js` ✅
- `public/engine/townScreen_refactored.js` ⏳

**game2.html is NOT modified yet.** When ready, we'll:
1. Remove inline TitleMenu class (lines 6731-7155)
2. Remove inline TownScreen class (lines 9347-10519)
3. Add `<script src="engine/titleMenu_refactored.js">` 
4. Add `<script src="engine/townScreen_refactored.js">`
5. Update Game constructor to pass individual deps

---

*Phase 0 status by Buffy — August 31, 2026*
