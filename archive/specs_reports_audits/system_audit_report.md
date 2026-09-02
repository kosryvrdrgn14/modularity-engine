# System Audit Report — Modularity Engine

**Date:** August 21, 2026
**Scope:** Full line-by-line trace of game.html across 4 pipelines
**Total Gaps Found:** 14 (6 Critical, 5 Medium, 3 Low)

---

## Pipeline 1: Stat Upgrade Propagation

### Trace: Damage Up → Weapon Damage

```
Player presses 1/2/3
  → InputManager keydown → emit('selectUpgrade', { index })
  → Game handler → option.apply(this)
  → player.damageMultiplier *= 1.15
  → W1 _fireW1: Math.floor(stats.damage * (player.damageMultiplier || 1)) ✅
  → W2 _fireW2: Math.floor(stats.damage * (player.damageMultiplier || 1)) ✅
  → W3 _fireW3: Math.floor(stats.damage * (player.damageMultiplier || 1)) ✅
```

**Status: ✅ COMPLETE** — All 3 weapons read `player.damageMultiplier` dynamically.

### Trace: Speed Up → Movement

```
option.apply → player.speed = (player.stats?.speed || 200) * player.speedMultiplier
  → MovementSystem._movePlayer: player.x += kb.dx * player.speed * dt ✅
```

**Status: ⚠️ FRAGILE** — `player.stats?.speed` is undefined (stat is `moveSpeed`, not `speed`). Falls back to `200` which happens to be correct. Not broken, but brittle.

### Trace: Health Up → HP Bar

```
option.apply → player.maxHp += 20; player.hp = min(hp+20, maxHp)
  → Renderer._drawUI: hpPercent = player.hp / player.maxHp ✅
  → DamageSystem._handleDamage: target.hp -= finalDamage ✅
```

**Status: ✅ COMPLETE**

### GAP 1 — 🔴 CRITICAL: Crits Never Apply from Weapons

**The Gap:** `_handleProjectileHit` passes `{ stats: {} }` as the damage source:
```javascript
_handleProjectileHit(data) {
    this._handleDamage(data.target, { stats: {} }, data.projectile.damage);
}
```
The `_handleDamage` method reads `source.stats?.critChance` — which is `0` for `{ stats: {} }`. Crits never proc from any weapon.

**The Impact:** The crit system (5% chance, 1.5x multiplier) defined in `02_character_spec.md` is completely non-functional. Player deals flat damage only.

**The Fix:** Pass the player's crit stats to damage sources:
```javascript
_handleProjectileHit(data) {
    const player = this.entityManager.getActive('player')[0];
    this._handleDamage(data.target, { stats: player?.stats || {} }, data.projectile.damage);
}
_handleAreaPulse(data) {
    ...
    this._handleDamage(enemy, { stats: player?.stats || {} }, data.damage);
}
```

### GAP 2 — 🟡 MEDIUM: Speed Up Uses Wrong Stat Key

**The Gap:** `game.player.stats?.speed` is undefined. The actual stat is `moveSpeed`:
```javascript
// Current (fragile):
game.player.speed = (game.player.stats?.speed || 200) * game.player.speedMultiplier;
// Should be:
game.player.speed = (game.player.stats?.moveSpeed || 200) * game.player.speedMultiplier;
```

**The Impact:** Works by coincidence (fallback = 200 = correct base speed). Would break if base speed ever changed.

**The Fix:** Change `stats?.speed` to `stats?.moveSpeed`.

---

## Pipeline 2: Lifecycle & Game Over

### Trace: Player HP ≤ 0 → Game Over

```
CollisionSystem.update() → emit('contactDamage', { target: player, source: enemy, damage })
  → DamageSystem._handleDamage(player, enemy, damage)
    → player.hp -= finalDamage
    → if (player.hp <= 0):
      → player.active = false
      → emit('death', { entity: player, ... })
      → Game handler: gameState.triggerGameOver('defeat', stats)
      → _handleGameOver(): pause loop, showEndScreen()
  → UIManager._renderEndScreen() shows overlay
```

**Status: ✅ COMPLETE** — Full chain from HP→0 to end screen works.

### Trace: Timer Expiry (5:00)

```
Game.update() → if (gameTime >= 300):
  → gameState.triggerGameOver('survived', stats)
  → _handleGameOver()
```

**Status: ✅ COMPLETE**

### Trace: Boss Kill → Victory

```
DamageSystem._handleDamage(boss, ...) → boss.hp <= 0:
  → emit('death', { entity: boss })
  → emit('bossDeath', { boss })
  → Game handler: gameState.triggerGameOver('victory', stats)
  → _handleGameOver()
```

**Status: ✅ COMPLETE**

### GAP 3 — 🔴 CRITICAL: Restart From Game Over Fails (State Machine Deadlock)

**The Gap:** `startGame()` calls `gameState.setState('playing')` but the current state is `gameOver`. The valid transitions are:
```javascript
gameOver: ['endScreen'],  // Can only go to endScreen, NOT playing
```
So `setState('playing')` fails silently. The game loop unpauses but `update()` returns immediately because `!isPlaying()`.

**The Impact:** "Click to restart" and Enter/Space restart do nothing. Game is permanently frozen after game over.

**The Fix:** Add a `reset()` method to GameState:
```javascript
reset() {
    this.state = 'menu';
    this.previousState = null;
    this.endResult = null;
    this.endStats = null;
}
```
Call `this.gameState.reset()` at the start of `startGame()`.

### GAP 4 — 🔴 CRITICAL: GameLoop.start() Creates Duplicate Loops on Restart

**The Gap:** `startGame()` calls `this.gameLoop.start()` every time. But `GameLoop.start()` doesn't check if already running:
```javascript
start() {
    this.running = true;  // Already true from first start
    this.lastTime = performance.now();
    this._loop(this.lastTime);  // Creates SECOND parallel loop!
}
```
Each restart adds another `requestAnimationFrame` chain, causing the game to run faster and faster.

**The Impact:** After first restart, the game runs at 2x speed. After second restart, 3x speed. Eventually the game becomes unplayable.

**The Fix:** Add guard to `start()`:
```javascript
start() {
    if (this.running) return;  // Prevent duplicate loops
    this.running = true;
    this.lastTime = performance.now();
    this._loop(this.lastTime);
}
```

### GAP 5 — 🟡 MEDIUM: WeaponSystem Not Reset on Restart

**The Gap:** `startGame()` calls `this.weaponSystem.init(this.player)` which sets `weaponLevels['w1_projectile'] = 1`. But it doesn't clear `weaponLevels` or `cooldowns` for W2/W3. If the player had W2/W3 unlocked before restart, they persist.

**The Impact:** On restart, the player might have W2/W3 from the previous run if they were unlocked.

**The Fix:** Add reset method to WeaponSystem:
```javascript
reset() {
    this.weaponLevels = {};
    this.cooldowns = {};
}
```
Call `this.weaponSystem.reset()` in `startGame()` before `init()`.

---

## Pipeline 3: Weapon & Entity Spawning / Collision

### Entity Lifecycle Trace

| Entity | Unlock/Spawn | Movement | Collision | Damage | Death/Drops |
|---|---|---|---|---|---|
| **Player** | Created in startGame | MovementSystem ✅ | — | DamageSystem ✅ | Game over ✅ |
| **W1 Projectile** | weaponLevels check ✅ | MovementSystem._moveProjectiles ✅ | Projectile vs Enemy ✅ | projectileHit event ✅ | Destroyed on hit ✅ |
| **W2 Orb** | Level 3 unlock ✅ | WeaponSystem orbit calc ✅ | Orb vs Enemy ✅ | projectileHit event ✅ | Persistent (recycled) ✅ |
| **W3 Pulse** | Level 6 unlock ✅ | — (instant) | Area radius check ✅ | areaPulse event ✅ | — (instant) ✅ |
| **Enemy** | SpawnSystem wave timeline ✅ | MovementSystem._moveEnemies ✅ | Player vs Enemy ✅ | contactDamage ✅ | death → drops ✅ |
| **Boss** | SpawnSystem at 240s ✅ | Same as enemy ✅ | Player vs Enemy ✅ | contactDamage ✅ | bossDeath → victory ✅ |
| **Pickup** | PickupSystem drops ✅ | — (static + magnet) | Player vs Pickup ✅ | pickup event ✅ | Destroyed on collect ✅ |

### GAP 6 — 🔴 CRITICAL: Boss Phase Behavior Not Implemented

**The Gap:** Boss data defines `phases` with charge intervals, minion spawn, ground pound. But `MovementSystem._moveEnemies` just chases the player with basic movement. No code reads `enemy.behavior.params` or `enemy.enemyData.phases`.

**The Impact:** Boss fights like a regular enemy with 1000 HP. No charge attacks, no minions, no phase transitions. Boss is just a damage sponge.

**The Fix:** Add boss behavior to MovementSystem or a dedicated BossBehaviorSystem that reads `enemyData.phases` and executes charge/minion/groundPound patterns.

### GAP 7 — 🟡 MEDIUM: Enemy Behavior Patterns Not Implemented

**The Gap:** Enemy data defines behavior patterns (`chase`, `swarm`, `wander_chase`, `ranged`, `boss_charge`) but `MovementSystem._moveEnemies` just does basic chase for all enemies.

| Enemy | Defined Behavior | Actual Behavior |
|---|---|---|
| Zombie | `chase` | Chase ✅ (matches) |
| Bat | `swarm` (erratic) | Chase ❌ (no erraticism) |
| Skeleton | `chase` | Chase ✅ (matches) |
| Ghost | `wander_chase` | Chase ❌ (no wander phase) |
| Caster | `ranged` (maintain distance) | Chase ❌ (no distance keeping) |

**The Impact:** All enemies behave identically (direct chase). Bats aren't erratic, ghosts don't wander, casters don't keep distance.

**The Fix:** Read `enemy.enemyData.behavior.pattern` in `_moveEnemies` and apply pattern-specific movement.

### GAP 8 — 🟡 MEDIUM: W1 Projectile Count Per Level Not Implemented

**The Gap:** W1 data defines `projectileCount` per level (1→1→1→1→2→2→3), but `_fireW1` always fires 1 projectile:
```javascript
// Always creates 1 projectile, ignores stats.projectileCount
this.entityManager.create('projectile', { ... });
```

**The Impact:** W1 never fires multiple projectiles. Levels 5-7 feel the same as level 1-4 in terms of projectile count.

**The Fix:** Loop `stats.projectileCount` times with slight angle spread:
```javascript
for (let i = 0; i < stats.projectileCount; i++) {
    const spread = (i - (stats.projectileCount - 1) / 2) * 0.2;
    const angle = Math.atan2(dy, dx) + spread;
    this.entityManager.create('projectile', {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ...
    });
}
```

### GAP 9 — 🟡 MEDIUM: W3 Pulse Count Per Level Not Implemented

**The Gap:** W3 data defines `pulseCount` per level (1→1→1→2→2→2→3), but `_fireW3` always emits 1 pulse:
```javascript
this.eventBus.emit('areaPulse', { ... });  // Always once
```

**The Impact:** W3 never fires multiple pulses. Level 4+ power spike (Double Pulse) doesn't work.

**The Fix:** Emit `areaPulse` in a loop:
```javascript
for (let i = 0; i < stats.pulseCount; i++) {
    setTimeout(() => {
        this.eventBus.emit('areaPulse', { ... });
    }, i * 200);  // 200ms between pulses
}
```

### GAP 10 — 🟢 LOW: Weapon Power Spikes Not Implemented

**The Gap:** All 3 weapons define power spike effects at levels 4 and 7:
- W1 Level 4: Pierce (+1 enemy)
- W1 Level 7: Split (3 projectiles)
- W2 Level 4: Expanded Orbit (+50% radius)
- W2 Level 7: Afterimage (damaging trails)
- W3 Level 4: Double Pulse (+1 pulse)
- W3 Level 7: Devastation (triple + stun)

None of these are implemented. The `powerSpikes` data exists but no code reads `weapon.powerSpikes`.

**The Impact:** Weapon progression feels flat. No exciting power spike moments at level 4 and 7.

### GAP 11 — 🟢 LOW: Gold Counter Always Shows 0

**The Gap:** `_getStats()` returns `gold: 0` hardcoded. Gold coins are collected but never tracked.

```javascript
_getStats() {
    return {
        ...
        gold: 0,  // Never incremented
    };
}
```

**The Impact:** End screen always shows "Gold: 0" even after collecting hundreds of coins.

**The Fix:** Add `this.gold = 0` to Game, increment on gold pickup, read in `_getStats()`.

### GAP 12 — 🟢 LOW: Pickup Duration/Despawn Not Implemented

**The Gap:** Pickups have `behavior.duration` (30s for gold coins) but no code checks pickup age against duration. Pickups persist forever until collected or entity cap hit.

**The Impact:** Ground becomes permanently cluttered with pickups. No strategic pressure to collect quickly.

---

## Pipeline 4: Rendering & Visual Effects

### Draw Call Trace

```
Game.render()
  → Renderer.render(entities, player)
    → clear() — fill background ✅
    → camera.apply(ctx) — translate ✅
    → _drawGrid() — grid lines ✅
    → entities.filter(active).sort(y).forEach(_drawEntity) ✅
    → _updateAndDrawPulses(1/60) — W3 pulse ring ✅
    → ctx.restore() ✅
    → _drawUI(player) — HP bar, level badge, XP bar ✅
  → UIManager.render()
    → _renderLevelUp() — upgrade cards ✅
    → _renderEndScreen() — game over overlay ✅
```

**Status: ✅ Core rendering chain complete**

### Renderer Reference Chain

```
Game.renderer = new Renderer(canvas, camera)  ← Created FIRST
Game.damageSystem = new DamageSystem(entityManager, eventBus, renderer)  ← Gets valid ref
DamageSystem._handleAreaPulse → this.renderer.addPulseEffect() ✅
```

**Status: ✅ Valid reference chain**

### GAP 13 — 🔴 CRITICAL: No Floating Damage Numbers

**The Gap:** `DamageSystem._handleDamage` emits a `damage` event with `{ damage, isCrit, position }` but nothing listens to it for visual feedback. There is no floating text system.

**The Impact:** Player has no visual feedback when dealing or receiving damage. Can't tell if attacks are landing or if crits are proccing (they aren't, per Gap 1).

**The Fix:** Add a `FloatingTextSystem` that listens to `damage` events and renders text at the damage position:
```javascript
class FloatingTextSystem {
    constructor(entityManager, eventBus) {
        this.texts = [];
        eventBus.on('damage', (data) => {
            this.texts.push({
                x: data.position.x,
                y: data.position.y,
                text: data.isCrit ? `${data.damage}!` : `${data.damage}`,
                color: data.isCrit ? '#FFD700' : '#FFF',
                age: 0,
                maxAge: 0.8,
            });
        });
    }
    update(dt) { /* age and remove */ }
    draw(ctx) { /* render floating text */ }
}
```

### GAP 14 — 🔴 CRITICAL: No Boss Health Bar

**The Gap:** `bossSpawn` event triggers screen shake but no health bar is rendered. There's no visual indicator of boss HP during the fight.

**The Impact:** Player can't see boss progress. Boss feels like an HP sponge with no feedback.

**The Fix:** Add boss health bar to `_drawUI`:
```javascript
// In _drawUI, after HP bar:
const boss = entities.find(e => e.isBoss && e.active);
if (boss) {
    const bossHpPercent = boss.hp / boss.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(w/2 - 100, 10, 200, 16);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(w/2 - 100, 10, 200 * bossHpPercent, 16);
    ctx.fillStyle = '#FFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE GRAVEKEEPER', w/2, 22);
}
```

---

## Summary

### Critical Gaps (6) — Must Fix Before Playable

| # | Gap | Pipeline | Impact |
|---|---|---|---|
| 1 | Crits never apply from weapons | Stat Upgrade | Crit system dead |
| 3 | Restart from game over fails (state deadlock) | Lifecycle | Game frozen after death |
| 4 | GameLoop creates duplicate loops on restart | Lifecycle | Game speeds up on restart |
| 6 | Boss phase behavior not implemented | Spawning | Boss is damage sponge |
| 13 | No floating damage numbers | Rendering | No combat feedback |
| 14 | No boss health bar | Rendering | No boss progress indicator |

### Medium Gaps (5) — Should Fix for Quality

| # | Gap | Pipeline | Impact |
|---|---|---|---|
| 2 | Speed Up uses wrong stat key | Stat Upgrade | Works by coincidence |
| 5 | WeaponSystem not reset on restart | Lifecycle | W2/W3 persist across runs |
| 7 | Enemy behavior patterns not implemented | Spawning | All enemies behave identically |
| 8 | W1 projectile count per level not implemented | Spawning | No multi-shot at higher levels |
| 9 | W3 pulse count per level not implemented | Spawning | No double/triple pulse |

### Low Gaps (3) — Polish Phase

| # | Gap | Pipeline | Impact |
|---|---|---|---|
| 10 | Weapon power spikes not implemented | Spawning | Flat weapon progression |
| 11 | Gold counter always shows 0 | Rendering | End screen stat wrong |
| 12 | Pickup duration/despawn not implemented | Spawning | Ground clutters permanently |

---

*Audit completed via line-by-line execution trace of game.html (2236 lines).*
