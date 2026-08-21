# Modularity Engine — Codebase Map

> **Game Version:** v0.2.0+  
> **File:** `public/game.html` (single-file HTML5 game, 3403 lines)  
> **Purpose:** Complete structural map for navigating the codebase during SVG graphics replacement and future development.  
> **Last Updated:** August 21, 2026

---

## Table of Contents

1. [File Structure Overview](#1-file-structure-overview)
2. [Class Map — Line Ranges & Responsibilities](#2-class-map--line-ranges--responsibilities)
3. [Update Pipeline (per frame)](#3-update-pipeline-per-frame)
4. [Render Pipeline (per frame)](#4-render-pipeline-per-frame)
5. [Entity Lifecycle](#5-entity-lifecycle)
6. [All Entity Creation Points (Visual Properties)](#6-all-entity-creation-points-visual-properties)
7. [Renderer — Drawing Code Map](#7-renderer--drawing-code-map)
8. [Embedded Data Structure](#8-embedded-data-structure)
9. [Event Bus Map](#9-event-bus-map)
10. [SVG Replacement Touchpoints](#10-svg-replacement-touchpoints)

---

## 1. File Structure Overview

```
public/game.html (3403 lines)
├── L1-6       HTML <head>, meta tags
├── L7-87      CSS styles (canvas, loading-screen, start-overlay)
├── L88-100    HTML body (canvas, loading-screen, start-overlay)
├── L101       <script> tag opens
├── L103-175   EventBus class
├── L176-230   DataManager class
├── L231-288   GameState class
├── L289-519   EMBEDDED_DATA constant (inline JSON)
│   ├── L293-309   Character data
│   ├── L311-366   Weapon data (3 weapons × 7 levels)
│   ├── L368-413   Enemy data (5 enemies + 1 boss)
│   ├── L415-449   Stage data
│   ├── L451-486   Pickup data (6 types)
│   └── L488-519   Leveling data (XP curve + upgrades)
├── L520-578   GameLoop class
├── L579-634   Camera class
├── L635-798   InputManager class
├── L799-879   EntityManager class
├── L880-1026  SpawnSystem class
├── L1027-1223 MovementSystem class
├── L1224-1305 CollisionSystem class
├── L1306-1498 WeaponSystem class
├── L1499-1589 DamageSystem class
├── L1590-1698 PickupSystem class
├── L1699-1775 LevelingSystem class
├── L1776-1982 Renderer class          ← PRIMARY SVG TARGET
├── L1983-2052 FloatingTextSystem class
├── L2053-2164 UIManager class
├── L2165-2986 AudioManager class
├── L2988-3392 Game class (main orchestrator)
├── L3394-3396 Bootstrap: new Game().init()
└── L3403      </script></html>
```

---

## 2. Class Map — Line Ranges & Responsibilities

| # | Class | Lines | Size | Responsibility |
|---|---|---|---|---|
| 1 | **EventBus** | L110-175 | 66 | Pub/sub event system. `on()`, `off()`, `emit()`, `_dispatch()` |
| 2 | **DataManager** | L176-230 | 55 | Loads JSON content files, falls back to `EMBEDDED_DATA`. Holds `characters`, `weapons`, `enemies`, `stages`, `pickups`, `leveling` |
| 3 | **GameState** | L231-288 | 58 | State machine: `idle → playing → levelUp → gameOver → endScreen`. Emits `stateChange` |
| 4 | **EMBEDDED_DATA** | L289-519 | 231 | Inline JSON for all game data (character, weapons, enemies, stages, pickups, leveling) |
| 5 | **GameLoop** | L526-578 | 53 | Fixed-timestep game loop. Calls `updateFn(dt)` at 60fps, `renderFn(interp)` every frame |
| 6 | **Camera** | L579-634 | 56 | Smooth follow, screen shake, world↔screen coordinate transforms |
| 7 | **InputManager** | L641-798 | 158 | Keyboard + pointer input. Handles movement keys (WASD/arrows), upgrade card selection (1/2/3 keys + click), pause (Esc/P) |
| 8 | **EntityManager** | L805-879 | 75 | Object pool. `create(type, data)`, `destroy(entity)`, `getActive(type)`, `cleanup()` |
| 9 | **SpawnSystem** | L886-1026 | 141 | Wave-based enemy spawner. Time-gated spawns, boss spawn at 4:00. `_getEnemyColor()` defines enemy colors |
| 10 | **MovementSystem** | L1033-1223 | 191 | Player movement, enemy AI (chase/swarm/wander/ranged/boss_charge), projectile travel, pickup attraction |
| 11 | **CollisionSystem** | L1230-1305 | 76 | AABB collision. Projectile→enemy, orb→enemy, player→enemy (contact damage), player→pickup |
| 12 | **WeaponSystem** | L1312-1498 | 187 | Weapon firing, level management. `_fireW1()` (projectiles), `_fireW2()` (orbiters), `_fireW3()` (area pulses) |
| 13 | **DamageSystem** | L1505-1589 | 85 | Applies damage with crits, emits floating text, handles projectile hits and area pulses |
| 14 | **PickupSystem** | L1596-1698 | 103 | Enemy death → drop rolls → pickup spawning. `_getPowerUpVisual()` maps power-up types to visuals |
| 15 | **LevelingSystem** | L1705-1775 | 71 | XP tracking, level-up queue, stat upgrades from EMBEDDED_DATA |
| 16 | **Renderer** | L1782-1982 | 201 | **PRIMARY SVG TARGET.** Draws grid, entities (by shape), pulse effects, UI overlay (HP/XP bars, level badge, boss HP) |
| 17 | **FloatingTextSystem** | L1987-2052 | 66 | Damage numbers, pickup text (+1 XP, etc.) floating upward |
| 18 | **UIManager** | L2059-2164 | 106 | Level-up card UI, end screen overlay |
| 19 | **AudioManager** | L2169-2986 | 818 | Web Audio synthesizer. 16-slot pool, 30+ sound effects, distance-based volume, ducking |
| 20 | **Game** | L2992-3392 | 401 | Main orchestrator. Wires all systems, handles game flow, upgrade options, game over |

---

## 3. Update Pipeline (per frame)

Called by `GameLoop._loop()` → `Game.update(dt)` at L3205:

```
Game.update(dt)                          L3205
├── WeaponSystem.update(dt)              L3208  (fire W1/W2/W3)
├── MovementSystem.update(dt)            L3209  (move all entities)
├── CollisionSystem.update()             L3210  (detect hits → emit events)
├── DamageSystem.update(dt)              L3211  (apply damage, crits)
├── EntityManager.cleanup()              L3212  (remove dead entities)
├── SpawnSystem.update(dt)               L3213  (spawn new enemies)
├── PickupSystem.update(dt)              L3214  (attract pickups, magnet)
├── LevelingSystem.update(dt)            L3215  (process XP, emit levelUp)
├── _detectBossStateChanges()            L3218  (boss phase transitions)
├── Camera.follow(player)                L3222
├── Camera.update(dt)                    L3223
└── Game over check (time >= 300s)       L3226
```

---

## 4. Render Pipeline (per frame)

Called by `GameLoop._loop()` → `Game.render(interp)` at L3290:

```
Game.render(interp)                      L3290
├── Renderer.render(entities, player)    L3292
│   ├── Renderer.clear()                 L1833  (clear canvas to #0A0A1A)
│   ├── Camera.apply(ctx)                L1835  (translate for camera)
│   ├── Renderer._drawGrid()             L1838  (grid lines #16213E)
│   ├── For each active entity (y-sorted):
│   │   └── Renderer._drawEntity(entity) L1844  ← SVG REPLACEMENT TARGET
│   │       ├── iFrame blink (globalAlpha)
│   │       ├── Read entity.visual.shape + .color + .size
│   │       ├── IF square:  ctx.fillRect()
│   │       ├── IF circle:  ctx.arc() + fill
│   │       ├── IF diamond: ctx.moveTo/lineTo polygon
│   │       ├── IF triangle: ctx.moveTo/lineTo polygon
│   │       └── IF star: _drawStar()
│   ├── Renderer._updateAndDrawPulses()  L1848  (area pulse shockwaves)
│   └── Camera.restore()                 L1850
│
├── FloatingTextSystem.draw(ctx)         L3295  (damage numbers, +XP)
│
└── UIManager.render()                   L3299  (level-up cards, end screen)
```

---

## 5. Entity Lifecycle

### Entity Types

| Type | Created At | Visual Source | Shape | Color | Size |
|---|---|---|---|---|---|
| `player` | L3176 `Game.startGame()` | EMBEDDED_DATA.character.visual | square | `#FFD700` | 24 (hitbox 10) |
| `enemy` | L975 `SpawnSystem._spawnEnemy()` | `_getEnemyColor()` + square | square | varies by type | varies |
| `boss` | L996 `SpawnSystem._spawnBoss()` | hardcoded | square | `#4A0000` | 28 |
| `projectile` | L1387 `WeaponSystem._fireW1()` | hardcoded | square | `#FFD700` | 4 |
| `orb` | L1421 `WeaponSystem._fireW2()` | hardcoded | circle | `#4FC3F7` | 6 |
| `pickup` | L1619 `PickupSystem._onEnemyDeath()` | pickup data or `_getPowerUpVisual()` | varies | varies | varies |
| `enemyProjectile` | (not currently spawned) | — | — | — | — |

### Entity Properties (created via `EntityManager.create(type, data)`)

Every entity gets:
```
{
  id: unique,
  type: string,
  active: true,
  x, y: world coordinates,
  vx, vy: velocity,
  size: number (half-width/half-height),
  hp, maxHp: health,
  damage: number,
  speed: number,
  visual: { shape: 'square'|'circle'|'diamond'|'triangle'|'star', color: string, size?: number },
  iFrames: number (invulnerability frames),
  age: number (lifetime in seconds),
  // Type-specific:
  ownerId (orbs), orbitAngle, orbitRadius, orbitSpeed,
  distanceTraveled (projectiles),
  pickupData (pickups), attractRadius,
  wave, behavior, goldCoins, xpValue, goldValue (enemies)
}
```

---

## 6. All Entity Creation Points (Visual Properties)

These are every location where `visual:` is assigned — the points to change during SVG replacement:

### Data Definitions (EMBEDDED_DATA, L289-519)

| Line | Entity | visual |
|---|---|---|
| L308 | Player character | `{ shape: "square", size: 24, color: "#FFD700" }` |
| L328 | W1 Projectile weapon | `{ shape: "square", color: "#FFD700" }` |
| L346 | W2 Orbit weapon | `{ shape: "circle", color: "#4FC3F7" }` |
| L364 | W3 Area weapon | `{ shape: "circle", color: "#FF9100" }` |
| L453 | XP Small pickup | `{ shape: "diamond", color: "#4FC3F7", size: 8 }` |
| L458 | XP Large pickup | `{ shape: "diamond", color: "#81D4FA", size: 14 }` |
| L463 | Gold Coin pickup | `{ shape: "circle", color: "#FFD700", size: 10 }` |
| L469 | Screen Wipe pickup | `{ shape: "star", color: "#00E676", size: 16 }` |
| L475 | Magnet pickup | `{ shape: "circle", color: "#FF4081", size: 14 }` |
| L481 | Weapon Level-Up pickup | `{ shape: "triangle", color: "#FF9100", size: 16 }` |

### Runtime Creation (hardcoded in system methods)

| Line | System | Entity | visual |
|---|---|---|---|
| L979 | SpawnSystem._spawnEnemy() | enemy | `{ shape: 'square', color: this._getEnemyColor(selected.id) }` |
| L1002 | SpawnSystem._spawnBoss() | boss | `{ shape: 'square', color: '#4A0000' }` |
| L1390 | WeaponSystem._fireW1() | projectile | `{ shape: 'square', color: '#FFD700' }` |
| L1425 | WeaponSystem._fireW2() | orb | `{ shape: 'circle', color: '#4FC3F7' }` |
| L1619 | PickupSystem._onEnemyDeath() | pickup | `{ shape: 'diamond', color: '#4FC3F7', size: 8 }` (XP fallback) |
| L1631 | PickupSystem._onEnemyDeath() | pickup | `{ shape: 'circle', color: '#FFD700', size: 10 }` (gold fallback) |
| L1644 | PickupSystem._onEnemyDeath() | pickup | `this._getPowerUpVisual(drop.type)` (power-ups) |
| L3182 | Game.startGame() | player | `charData.visual` (from data) |

### Dynamic Visual Assignment

| Line | System | Method | Logic |
|---|---|---|---|
| L1008 | SpawnSystem | `_getEnemyColor(id)` | Maps enemy ID → color. Returns `{ zombie: '#3B8A30', bat: '#6B3FA0', skeleton: '#C0392B', ghost: '#8E44AD', caster: '#2E86C1' }` |
| L1650 | PickupSystem | `_getPowerUpVisual(type)` | Maps power-up type → visual. Returns `{ screen_wipe: {star, #00E676, 16}, magnet: {circle, #FF4081, 14}, weapon_levelup: {triangle, #FF9100, 16} }` |

---

## 7. Renderer — Drawing Code Map

**Class:** L1782-1982  
**Constructor:** L1784 — stores `canvas`, `ctx` (2D context), `camera`, initializes `pulseEffects = []`

### Methods

| Method | Lines | Purpose | SVG Replacement? |
|---|---|---|---|
| `constructor(canvas, camera)` | L1784-1790 | Init canvas context, pulse array | No |
| `addPulseEffect(x, y, radius, color)` | L1791-1793 | Queue a shockwave effect | No (keep canvas) |
| `_updateAndDrawPulses(dt)` | L1796-1823 | Animate + draw expanding rings | No (keep canvas) |
| `clear()` | L1827-1829 | Fill canvas with `#0A0A1A` | No |
| `render(entities, player)` | L1832-1855 | **Main render loop.** Clears, applies camera, draws grid, draws entities (y-sorted), draws pulses, draws UI | Partial — calls `_drawEntity` |
| `_drawGrid()` | L1859-1880 | Draws background grid lines `#16213E` | No |
| **`_drawEntity(entity)`** | **L1883-1930** | **THE SVG REPLACEMENT TARGET.** Draws each entity by shape type. | **YES — this is the primary method to modify** |
| `_drawStar(x, y, radius, points)` | L1931-1942 | Helper for star-shaped entities | Could be replaced with SVG |
| `_drawUI(player)` | L1943-1982 | HP bar, XP bar, level badge, boss HP bar, timer | No (UI is canvas-drawn) |

### `_drawEntity()` — Detailed Breakdown (L1883-1930)

```
_drawEntity(entity)
├── ctx.save()                              L1884
├── iFrame blink: globalAlpha = 0.5         L1887-1889
├── Read: x, y, size, color, shape          L1891-1895
├── ctx.fillStyle = color                   L1897
│
├── IF shape === 'square':                  L1898-1899
│   └── ctx.fillRect(x - size, y - size, size * 2, size * 2)
│
├── IF shape === 'circle':                  L1901-1904
│   └── ctx.arc(x, y, size, 0, PI*2) + fill
│
├── IF shape === 'diamond':                 L1906-1911
│   └── 4-point polygon (diamond)
│
├── IF shape === 'triangle':                L1913-1918
│   └── 3-point polygon (upward triangle)
│
├── IF shape === 'star':                    L1920-1922
│   └── _drawStar(x, y, size, 5)
│
└── ctx.restore()                           L1924
```

**SVG Replacement Strategy:** Replace the `if/else if` shape block (L1898-1922) with `ctx.drawImage(svgImage, x - halfW, y - halfH, w, h)`. The `visual.shape` property on each entity can be extended to support an `svgKey` or `image` property.

---

## 8. Embedded Data Structure

**Constant:** `EMBEDDED_DATA` at L292  
**Access:** `DataManager.getEmbeddedData(key)` at L224

```
EMBEDDED_DATA
├── characters: {                          L293
│     name, description, stats, hitbox, startingWeapon, visual
│   }
├── weapons: [                             L311
│     { id, name, type, targeting, unlockLevel, statsPerLevel[7], powerSpikes, visual }
│   ]
├── enemies: [                             L368
│     { id, name, type, stats, behavior, drops, spawn, phases? }
│   ]
├── stages: {                              L415
│     stage1: { name, waves, bgElements }
│   }
├── pickups: [                             L451
│     { id, name, type, value, visual, behavior, dropConfig }
│   ]
└── leveling: {                            L488
      xpCurve: [...],
      statUpgrades: [...]                   L511
    }
```

### Key Data Relationships

```
ENEMY death → PickupSystem rolls drops → creates pickup entity with visual from:
  1. PickupSystem._getPowerUpVisual(type) for power-ups
  2. DataManager.pickups[type].visual for XP/gold
  3. Fallback: { shape: 'circle', color: '#FFF', size: 12 }

PLAYER level-up → Game._showUpgradeOptions() → builds upgrade pool:
  - 3 stat upgrades (Damage Up, Speed Up, Health Up)
  - weapon upgrades for each unlocked weapon (up to level 7)
  - Shuffled, pick 3 → UIManager.showLevelUp()

WEAPON fire → WeaponSystem creates entities with hardcoded visuals:
  - W1: projectile { shape: 'square', color: '#FFD700', size: 4 }
  - W2: orb { shape: 'circle', color: '#4FC3F7', size: 6 }
  - W3: area pulse → emits event → Renderer.addPulseEffect() (canvas-drawn)
```

---

## 9. Event Bus Map

Every event emitted in the game and its handler:

| Event | Emitted At | Handler At | Data |
|---|---|---|---|
| `stateChange` | L263 (GameState.setState) | L2330 (AudioManager) | `{ from, to, data }` |
| `pause` | InputManager (Esc/P key) | L3080 (Game) | — |
| `levelUp` | L1727 (LevelingSystem.addXP) | L3093 (Game) | `{ level }` |
| `selectUpgrade` | L699/701/703/732 (InputManager) | L3108 (Game) | `{ index }` |
| `death` | L1569 (DamageSystem) | L3128 (Game) | `{ entity, type }` |
| `weaponFire` | L1394 (WeaponSystem._fireW1) | L2284 (AudioManager) | `{ weaponId }` |
| `projectileHit` | L1530 (DamageSystem) | L2286 (AudioManager) | `{ projectile, enemy }` |
| `areaPulse` | L1456 (WeaponSystem._fireW3) | L1575 (DamageSystem → Renderer) | `{ x, y, damage, radius }` |
| `contactDamage` | L1284 (CollisionSystem) | L2299 (AudioManager) | `{ entity, source }` |
| `pickup` | L1604 (CollisionSystem → PickupSystem) | L2266 (AudioManager), L1718 (LevelingSystem), L3145 (Game) | `{ pickup, player }` |
| `death` (pickup) | L1604 (CollisionSystem) | L1599 (PickupSystem._onEnemyDeath) | `{ entity, type }` |
| `magnetActivate` | L3147 (Game event listener) | L2315 (AudioManager) | `{ player }` |
| `weaponLevelUp` | (from weapon_levelup pickup) | L2288 (AudioManager) | — |
| `weaponUnlock` | L3319 (Game._checkWeaponUnlocks) | L2290 (AudioManager) | `{ weaponId }` |
| `bossSpawn` | L1005 (SpawnSystem._spawnBoss) | L3136 (Game), L2303 (AudioManager) | `{ boss }` |
| `bossDeath` | L1572 (DamageSystem) | L3141 (Game), L2306 (AudioManager) | `{ boss }` |
| `bossCharge` | L1212 (MovementSystem) | L2310 (AudioManager) | `{ phase }` |
| `restart` | L3163 (InputManager) | L3165 (Game), L2320 (AudioManager) | — |
| `damage` | L1539 (DamageSystem) | L1989 (FloatingTextSystem) | `{ target, damage, isCrit }` |
| `stateChange` → `gameOver` | L3278 (Game._handleGameOver) | L2330 (AudioManager → stop hums) | `{ to: 'gameOver' }` |

---

## 10. SVG Replacement Touchpoints

For replacing primitive shapes with SVG graphics, these are the exact files/lines to modify:

### Phase 1: SVG Asset Loading

| What | Where | Change |
|---|---|---|
| Add SVG preload function | New code before Game class (around L2988) | Add `AssetManager` class or method to load SVGs as `Image` objects during loading screen |
| Extend DataManager | L176-230 | Add `loadAssets()` method or add asset paths to `loadAll()` |
| Update loading screen | L176-230 (`loadAll`) | Add SVG loading to progress bar |

### Phase 2: Entity Visual Extension

| What | Where | Change |
|---|---|---|
| Extend `visual` property | All creation points (§6 above) | Add `svgKey` or `imageRef` alongside existing `shape`/`color` |
| Update EntityManager | L819 (`create`) | Accept and store `image` property on entities |

### Phase 3: Renderer Modification

| What | Where | Change |
|---|---|---|
| **`_drawEntity()`** | **L1883-1930** | **Replace shape if/else with `ctx.drawImage(svgImage, ...)` when SVG available, fallback to existing shapes** |
| `_drawStar()` | L1931-1942 | May keep as fallback, or replace with star SVG |
| Add `imageCache` to Renderer | L1784 (constructor) | Store preloaded SVG Image objects |

### Phase 4: Cleanup

| What | Where | Change |
|---|---|---|
| Remove `_drawStar()` | L1931-1942 | Only if all star shapes have SVGs |
| Simplify shape code | L1898-1922 | Keep as fallback path for any entity without an SVG |

### Exact Line Reference for `_drawEntity()` Modification

**Current code (L1898-1922):**
```javascript
if (shape === 'square') {
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
} else if (shape === 'circle') {
  // ...
} else if (shape === 'diamond') {
  // ...
} else if (shape === 'triangle') {
  // ...
} else if (shape === 'star') {
  this._drawStar(x, y, size, 5);
}
```

**Replacement pattern:**
```javascript
const svgImage = this.imageCache?.[entity.visual?.svgKey];
if (svgImage) {
  const drawSize = size * 2;
  ctx.drawImage(svgImage, x - size, y - size, drawSize, drawSize);
} else {
  // existing shape fallback (keep current code)
}
```

---

## Appendix: Quick Reference — Entity → Line → Visual

| Entity | Creation Line | Visual Line | Shape | Color |
|---|---|---|---|---|
| Player | L3176 | L308 | square | `#FFD700` |
| Zombie | L975 | L1008→L1012 | square | `#3B8A30` |
| Bat | L975 | L1008→L1013 | square | `#6B3FA0` |
| Skeleton | L975 | L1008→L1014 | square | `#C0392B` |
| Ghost | L975 | L1008→L1015 | square | `#8E44AD` |
| Caster | L975 | L1008→L1016 | square | `#2E86C1` |
| Boss | L996 | L1002 | square | `#4A0000` |
| Projectile (W1) | L1387 | L1390 | square | `#FFD700` |
| Orb (W2) | L1421 | L1425 | circle | `#4FC3F7` |
| Pulse (W3) | L1456 | — (canvas ring) | ring | `#FF9100` |
| XP Small | L1619 | L1619 | diamond | `#4FC3F7` |
| XP Large | — (from data) | L458 | diamond | `#81D4FA` |
| Gold Coin | L1631 | L1631 | circle | `#FFD700` |
| Screen Wipe | L1644→L1650 | L1654 | star | `#00E676` |
| Magnet | L1644→L1650 | L1655 | circle | `#FF4081` |
| Weapon Level-Up | L1644→L1650 | L1656 | triangle | `#FF9100` |
