# Modularity Engine — Engine Architecture

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** `vs_plan.md` (architecture), `vs_prog.md` (numbers), `vs_colors.md` (visuals)

---

## Table of Contents

1. [Game Loop](#1-game-loop)
2. [Entity System](#2-entity-system)
3. [Collision System](#3-collision-system)
4. [Rendering](#4-rendering)
5. [Data Loading](#5-data-loading)
6. [Scene / State Management](#6-scene--state-management)
7. [Damage System](#7-damage-system)
8. [Camera Effects](#8-camera-effects)
9. [HiDPI Rendering](#9-hidpi-rendering)
10. [Projectile Lifetime](#10-projectile-lifetime)
11. [Obstacle Collision Rules](#11-obstacle-collision-rules)
12. [Performance Notes](#12-performance-notes)
13. [Event Bus Architecture](#13-event-bus-architecture)
14. [Game Initialization & Boot Sequence](#14-game-initialization--boot-sequence)
15. [Game Timer System](#15-game-timer-system)
16. [Page Visibility & Tab Handling](#16-page-visibility--tab-handling)
17. [Boss Health Bar](#17-boss-health-bar)
18. [Enemy Projectiles](#18-enemy-projectiles)
19. [Additional Systems Notes](#19-additional-systems-notes)

---

## 1. Game Loop

The engine uses a **fixed-timestep update loop** targeting **60 FPS**. The update phase runs at a fixed 16.667ms interval regardless of render frame rate. The render phase runs as fast as the browser allows, interpolating between physics states for smooth display.

### Timestep Structure

```
FIXED_TIMESTEP = 1000 / 60  (16.667ms)
MAX_FRAME_SKIP = 5          (prevent spiral of death)
accumulator += deltaTime
while (accumulator >= FIXED_TIMESTEP):
    update(FIXED_TIMESTEP)
    accumulator -= FIXED_TIMESTEP
render(accumulator / FIXED_TIMESTEP)   // interpolation factor
```

### System Execution Order (Per Frame)

Each `update()` call processes systems in this exact order:

```
1. InputManager        — Capture click/tap targets, WASD/arrow state
2. MovementSystem      — Process player pathfinding, enemy movement, apply velocities
3. WeaponSystem        — Tick cooldowns, auto-fire, create projectiles/orbs/pulses
4. CollisionSystem     — AABB checks across all collision layers
5. DamageSystem        — Apply damage, crits, knockback, invincibility frames
6. EntityManager       — Destroy dead entities, recycle to pool
7. SpawnSystem         — Read wave timeline, instantiate enemies from pool
8. PickupSystem        — Magnet attraction, collection range checks, power-up activation
9. LevelingSystem      — XP threshold checks, trigger level-up overlay
10. AudioManager       — Process sound triggers from this frame's events
11. UIManager          — Update HUD values, damage numbers, floating text
12. CameraEffects      — Apply screen shake, follow target
13. Camera             — Smooth lerp to player position
```

### Render Phase

After all updates complete:

```
1. Clear canvas
2. Apply camera transform (translate + shake offset)
3. Draw background tiles (see vs_colors.md Background & Environment)
4. Draw obstacles (grave mounds first — passable, then solid obstacles)
5. Draw pickups (EXP gems, gold coins) — sorted by y
6. Draw entities (enemies, player) — sorted by y for depth
7. Draw weapon effects (projectiles, orbit trails, area pulses)
8. Draw damage numbers and floating text
9. Reset camera transform
10. Draw UI overlay (HUD, boss health bar, timer)
```

### Timing Diagram

```
Frame N                    Frame N+1                  Frame N+2
|---------- dt -----------|---------- dt -----------|---------- dt -----------|
|                          |                          |
|-- update(16.6ms) ------|-- update(16.6ms) ------|-- update(16.6ms) ------|
|                          |                          |
|-- render(interpolation) -|-- render(interpolation) -|-- render(interpolation) -|
```

---

## 2. Entity System

All game objects are **entities** stored in a flat array (typed array or object pool) for cache-friendly iteration. Entities are not class hierarchies — they are data containers with behavior functions referenced by type.

### Entity Structure

Every entity contains these fields:

```typescript
interface Entity {
  id: number;              // Unique identifier (incrementing counter)
  type: EntityType;        // 'player' | 'enemy' | 'projectile' | 'orb' | 'pickup' | 'obstacle'
  
  // Spatial
  x: number;               // World X position (px)
  y: number;               // World Y position (px)
  vx: number;              // Velocity X (px/s)
  vy: number;              // Velocity Y (px/s)
  
  // Collision
  hitbox: Hitbox;          // { shape: 'circle' | 'aabb', radius | width, height }
  collisionLayer: number;  // Bitmask for collision filtering
  isStatic: boolean;       // true = doesn't move (obstacles, pickups)
  
  // Stats (varies by type)
  stats: EntityStats;      // HP, damage, speed, armor, etc.
  
  // Behavior
  behavior: BehaviorType;  // 'chase' | 'swarm' | 'tank' | 'wander' | 'ranged' | 'projectile' | 'orbit' | 'area'
  
  // Visual
  visual: VisualDef;       // { shape, color, size, animation } — see vs_colors.md
  
  // Lifecycle
  active: boolean;         // false = pooled/inactive
  age: number;             // Time alive in seconds
  ttl: number | null;      // Time-to-live (projectiles, floating text)
}

type EntityType = 'player' | 'enemy' | 'projectile' | 'orb' | 'pickup' | 'obstacle' | 'boss';

interface EntityStats {
  maxHp: number;
  hp: number;
  damage: number;
  speed: number;
  armor: number;           // Flat damage reduction
  critChance: number;      // 0.0 - 1.0
  critMultiplier: number;  // e.g. 1.5
  xpValue: number;         // XP dropped on death (enemies only)
  goldValue: number;       // Gold dropped on death (enemies only)
  goldMin: number;         // Min gold range
  goldMax: number;         // Max gold range
}

type BehaviorType = 
  | 'player'       // Controlled by input
  | 'chase'        // Move directly toward player (Zombie)
  | 'swarm'        // Fast, low HP, spawns in groups (Bat)
  | 'tank'         // Slow, high HP (Skeleton)
  | 'wanderChase'  // Drift randomly, then lock onto player (Ghost)
  | 'ranged'       // Maintain distance, fire projectiles (Caster)
  | 'bossCharge'   // Boss charge + minion spawn pattern
  | 'projectile'   // Travels in straight line, damages on contact
  | 'orbit'        // Circles player, damages on contact
  | 'area'         // Instant pulse, no persistent entity
```

### Entity Pools

Pre-allocated pools per entity type avoid garbage collection spikes:

| Pool | Initial Size | Max Size | Notes |
|---|---|---|---|
| Enemies | 50 | 200 | Grows by 25 when needed |
| Projectiles | 100 | 500 | Recycled on hit or timeout |
| Orbs | 20 | 50 | Weapon 2 (Orbit) |
| Pickups | 100 | 500 | Oldest despawn when full |
| Floating Text | 50 | 100 | Damage numbers, gold text |
| Obstacles | 0 | Dynamic | Placed at stage start |

Pool allocation pattern:

```
pool = Array(initialSize).fill(null).map(() => createInactiveEntity())

function acquire():
    for entity in pool:
        if !entity.active:
            entity.active = true
            return entity
    // Pool exhausted — grow
    newEntities = Array(GROWTH_STEP).fill(null).map(() => createInactiveEntity())
    pool.push(...newEntities)
    return acquire() // Recursive, guaranteed to find one

function release(entity):
    entity.active = false
    entity.age = 0
    // Reset all fields to defaults
```

### Player Entity

Exactly 1 player entity exists at all times. Created on stage start, never pooled. Stats loaded from `content/characters.json`. See `02_character_spec.md` for full stat definitions.

---

## 3. Event Bus Architecture

All inter-system communication happens through a central **event bus**. Systems emit events; other systems subscribe to events they care about. This decouples systems — the damage system doesn't need to know about the audio system, it just emits a `damage` event.

### Event Registration

```
class EventBus {
    listeners: Map<string, Function[]>
    
    on(event: string, callback: Function):
        if !this.listeners.has(event):
            this.listeners.set(event, [])
        this.listeners.get(event).push(callback)
    
    off(event: string, callback: Function):
        this.listeners.get(event)?.remove(callback)
    
    emit(event: string, data: any):
        for callback in this.listeners.get(event) ?? []:
            callback(data)
    
    clear():
        this.listeners.clear()
}
```

### Event Types

| Event | Emitted By | Consumed By | Data |
|---|---|---|---|
| `damage` | DamageSystem | AudioManager, UIManager, CameraEffects | `{ attacker, defender, damage, isCrit, isPlayerDamage }` |
| `death` | DamageSystem | SpawnSystem (drops), UIManager (floating text), AudioManager, LevelingSystem (XP) | `{ entity, killer, position }` |
| `pickup` | PickupSystem | AudioManager, UIManager, LevelingSystem (XP/gold), WeaponSystem (weapon level-up) | `{ player, pickup }` |
| `levelUp` | LevelingSystem | UIManager, AudioManager | `{ player, newLevel }` |
| `bossSpawn` | SpawnSystem | CameraEffects (shake), UIManager (health bar), AudioManager (warning) | `{ boss }` |
| `bossDeath` | DamageSystem | CameraEffects (shake), AudioManager, StateManager (victory) | `{ boss, killer }` |
| `screenWipe` | PickupSystem | CameraEffects (shake), AudioManager | `{ player }` |
| `gameOver` | StateManager | UIManager, AudioManager | `{ result: 'victory' | 'survived' | 'defeat', stats }` |
| `pause` | InputManager | All systems (stop updating) | `{ paused: boolean }` |

### Dispatch Rules

- Events are dispatched **synchronously** within the current frame
- Listeners are called in registration order
- No event re-entrancy: if a listener emits another event, it is queued and processed after the current emit completes
- Maximum 32 nested events per frame (prevent infinite loops)

### System Registration

Each system registers its listeners during initialization:

```
// Example: AudioManager registers listeners
audioManager.init(eventBus):
    eventBus.on('damage', (data) => playHitSound(data))
    eventBus.on('death', (data) => playKillSound(data))
    eventBus.on('pickup', (data) => playPickupSound(data))
    eventBus.on('levelUp', (data) => playLevelUpSound(data))
    eventBus.on('bossSpawn', (data) => playBossWarning(data))
    eventBus.on('bossDeath', (data) => playVictorySting(data))
    eventBus.on('screenWipe', (data) => playScreenWipeSound(data))
    eventBus.on('gameOver', (data) => playGameOverSound(data))
```

---

## 4. Collision System

### AABB Collision Detection

All collision checks use **Axis-Aligned Bounding Box (AABB)** for simplicity and speed. Circular entities (player, enemies) use a bounding AABB derived from their radius.

```
function aabbOverlap(a, b):
    return a.x - a.halfW < b.x + b.halfW &&
           a.x + a.halfW > b.x - b.halfW &&
           a.y - a.halfH < b.y + b.halfH &&
           a.y + a.halfH > b.y - b.halfH
```

For circular hitboxes (player, enemies, boss), convert to AABB:

```
circleToAABB(entity):
    halfSize = entity.hitbox.radius
    return { x: entity.x, y: entity.y, halfW: halfSize, halfH: halfSize }
```

### Collision Layers

Entities are assigned to collision layers via a bitmask. Two entities collide only if their layers match a valid pair.

| Layer | Bit | Description |
|---|---|---|
| `PLAYER` | `0b0001` | The player character |
| `ENEMY` | `0b0010` | Standard enemies + boss |
| `PROJECTILE` | `0b0100` | Player weapons (projectiles, orbs) |
| `PICKUP` | `0b1000` | EXP gems, gold coins, power-ups |
| `OBSTACLE` | `0b10000` | Static map obstacles |

### Collision Pairs

| Pair | Layers | Response |
|---|---|---|
| Enemy → Player | `ENEMY` ↔ `PLAYER` | Deal damage to player, apply knockback, trigger i-frames |
| Projectile → Enemy | `PROJECTILE` ↔ `ENEMY` | Deal damage to enemy, destroy projectile (unless pierce) |
| Player → Pickup | `PLAYER` ↔ `PICKUP` | Collect pickup, trigger pickup effect |
| Player → Obstacle | `PLAYER` ↔ `OBSTACLE` | Push player out of obstacle (slide) |
| Enemy → Obstacle | `ENEMY` ↔ `OBSTACLE` | Push enemy out of obstacle (slide) |

### Collision Response

**Damage Application:**

```
function applyDamage(attacker, defender):
    if defender.stats.iFrames > 0: return  // Invulnerable
    
    baseDamage = attacker.stats.damage
    isCrit = random() < attacker.stats.critChance
    finalDamage = isCrit ? baseDamage * attacker.stats.critMultiplier : baseDamage
    finalDamage = max(1, finalDamage - defender.stats.armor)
    
    defender.stats.hp -= finalDamage
    defender.stats.iFrames = 0.5  // 500ms invincibility
    
    // Knockback
    dx = defender.x - attacker.x
    dy = defender.y - attacker.y
    len = sqrt(dx*dx + dy*dy)
    knockbackForce = finalDamage * 2  // Scaled by damage
    defender.vx += (dx/len) * knockbackForce
    defender.vy += (dy/len) * knockbackForce
    
    // Events
    emit('damage', { attacker, defender, damage: finalDamage, isCrit })
    if defender.stats.hp <= 0:
        emit('death', { entity: defender })
```

**Pickup Collection:**

```
function collectPickup(player, pickup):
    // Range check (handled by collision system)
    // Apply effect based on pickup type:
    //   exp_small: add 1 XP
    //   exp_large: add 5 XP
    //   gold: add random goldMin-goldMax
    //   screen_wipe: kill all enemies, deal 20% boss HP (80% resistance)
    //   magnet: start 10s attract timer, instant burst 150px
    //   weapon_levelup: level 1-3 random weapons
    
    release(pickup)  // Return to pool
    emit('pickup', { player, pickup })
```

### Broadphase Optimization

For up to 200 enemies + 500 projectiles + 500 pickups, brute-force O(n²) is acceptable (~200 enemy-player checks per frame). If profiling shows issues, add **spatial hashing** with 64px grid cells:

```
grid = Map<string, Entity[]>()  // Key: "cellX,cellY"

function insertEntity(entity):
    cellX = floor(entity.x / CELL_SIZE)
    cellY = floor(entity.y / CELL_SIZE)
    key = `${cellX},${cellY}`
    grid.get(key).push(entity)

function queryNeighbors(entity):
    cellX = floor(entity.x / CELL_SIZE)
    cellY = floor(entity.y / CELL_SIZE)
    results = []
    for dx in [-1, 0, 1]:
        for dy in [-1, 0, 1]:
            results.push(...grid.get(`${cellX+dx},${cellY+dy}`))
    return results
```

**V1 recommendation:** Skip spatial hashing. Brute-force is fine at 200 entities. Profile first.

---

## 5. Rendering

### Canvas Setup

- HTML5 Canvas element, 2D context
- Canvas sized to fill viewport (CSS: `width: 100%; height: 100%`)
- Logical resolution matches CSS pixel size
- HiDPI scaling applied via `devicePixelRatio` (see Section 10)

### Camera System

The camera follows the player with smooth interpolation (lerp):

```
class Camera {
    x: number;           // Current camera X (center of screen)
    y: number;           // Current camera Y
    targetX: number;     // Player position (target)
    targetY: number;
    lerpFactor: number;  // 0.1 (slow) to 1.0 (instant). V1: 0.08
    
    update(dt):
        this.x += (this.targetX - this.x) * this.lerpFactor
        this.y += (this.targetY - this.y) * this.lerpFactor
        // Apply screen shake offset (see Section 9)
        this.renderX = this.x + this.shakeOffsetX
        this.renderY = this.y + this.shakeOffsetY
    
    worldToScreen(wx, wy):
        return { 
            x: wx - this.renderX + canvas.width / 2, 
            y: wy - this.renderY + canvas.height / 2 
        }
    
    screenToWorld(sx, sy):
        return { 
            x: sx + this.renderX - canvas.width / 2, 
            y: sy + this.renderY - canvas.height / 2 
        }
    
    isVisible(wx, wy, margin = 100):
        // Check if entity is within screen bounds + margin
        screen = worldToScreen(wx, wy)
        return screen.x > -margin && screen.x < canvas.width + margin &&
               screen.y > -margin && screen.y < canvas.height + margin
}
```

### Camera Bounds

- **No bounds.** The arena is infinite. Camera follows the player freely in all directions.
- Background tiles repeat seamlessly in all directions.

### Draw Order (Back to Front)

| Layer | What | Notes |
|---|---|---|
| 1 | Background tiles | 64×64px grid pattern. See `vs_colors.md` Background & Environment. |
| 2 | Cracked floor patches | Visual-only, passable. See `vs_colors.md`. |
| 3 | Grave mounds | Passable obstacles. Drawn above ground. |
| 4 | Pickups (XP, gold) | Diamond and circle shapes. See `vs_colors.md` Pickup Visuals. |
| 5 | Solid obstacles | Tombstones, broken walls. Drawn above pickups so pickups appear "on ground." |
| 6 | Enemies | Sorted by Y position for depth. Each type has unique shape/color per `vs_colors.md`. |
| 7 | Player | Hero Gold square, 24×24px. See `vs_colors.md` Player Visual. |
| 8 | Weapon effects | Projectiles (small gold squares), orbit orbs (orange circles), area pulses (expanding rings). |
| 9 | Power-up effects | Screen wipe flash, magnet ring, weapon-up sparkles. |
| 10 | Floating text | Damage numbers, gold/XP pickup text. |
| 11 | UI overlay | Not affected by camera transform. |

### Entity Rendering

Each entity has a `visual` property that defines how to draw it. The renderer switches on `visual.shape`:

```
function drawEntity(ctx, entity, camera):
    screen = camera.worldToScreen(entity.x, entity.y)
    
    switch entity.visual.shape:
        case 'square':
            ctx.fillStyle = entity.visual.color
            ctx.fillRect(
                screen.x - entity.visual.size/2, 
                screen.y - entity.visual.size/2, 
                entity.visual.size, 
                entity.visual.size
            )
            if entity.visual.border:
                ctx.strokeStyle = entity.visual.borderColor
                ctx.lineWidth = entity.visual.borderWidth
                ctx.strokeRect(...)
            if entity.visual.glow:
                ctx.shadowColor = entity.visual.glowColor
                ctx.shadowBlur = entity.visual.glowSize
        
        case 'circle':
            ctx.beginPath()
            ctx.arc(screen.x, screen.y, entity.visual.size/2, 0, PI*2)
            ctx.fillStyle = entity.visual.color
            ctx.fill()
        
        case 'diamond':
            // Rotated square 45°
            ctx.save()
            ctx.translate(screen.x, screen.y)
            ctx.rotate(PI/4)
            ctx.fillRect(-size/2, -size/2, size, size)
            ctx.restore()
        
        case 'triangle':
            // Upward-pointing triangle
            ctx.beginPath()
            ctx.moveTo(screen.x, screen.y - size/2)
            ctx.lineTo(screen.x - size/2, screen.y + size/2)
            ctx.lineTo(screen.x + size/2, screen.y + size/2)
            ctx.closePath()
            ctx.fill()
```

### Visual Definitions

All entity visuals are defined in `vs_colors.md`. The engine reads `visual` properties from entity data and renders accordingly. See `vs_colors.md` for:
- Player: Hero Gold square, 24×24px
- Enemies: 5 distinct shapes/colors
- Boss: Large crimson square, 56×56px
- Pickups: Diamonds (XP), circles (gold)
- Power-ups: Green (wipe), pink (magnet), orange (weapon up)
- Obstacles: 5 types with muted colors
- Damage numbers: Color-coded (white/yellow/red)

---

## 6. Data Loading

### Content Files

On stage start, the engine loads 6 JSON content files:

| File | Loaded By | Contains |
|---|---|---|
| `content/characters.json` | DataManager | Player stats, starting weapon |
| `content/weapons.json` | DataManager | 3 weapon definitions + upgrade tables |
| `content/enemies.json` | DataManager | 5 enemies + 1 boss + drop tables |
| `content/stages.json` | DataManager | Stage layout + wave timeline |
| `content/pickups.json` | DataManager | 6 pickup types + power-up mechanics |
| `content/leveling.json` | DataManager | XP curve + upgrade pool config |

Schemas for all files are defined in `10_json_schemas.md`.

### Loading Flow

```
async function loadStageData(stageId):
    // 1. Load all content files in parallel
    [characters, weapons, enemies, stages, pickups, leveling] = await Promise.all([
        loadJSON('content/characters.json'),
        loadJSON('content/weapons.json'),
        loadJSON('content/enemies.json'),
        loadJSON('content/stages.json'),
        loadJSON('content/pickups.json'),
        loadJSON('content/leveling.json'),
    ])
    
    // 2. Validate data (check required fields, types, value ranges)
    validateCharacters(characters)
    validateWeapons(weapons)
    validateEnemies(enemies)
    validateStage(stages, stageId)
    validatePickups(pickups)
    validateLeveling(leveling)
    
    // 3. Store in engine references
    engine.data = { characters, weapons, enemies, stages, pickups, leveling }
    
    // 4. Initialize systems with loaded data
    spawnSystem.init(stages[stageId])
    weaponSystem.init(weapons)
    levelingSystem.init(leveling)
    
    // 5. Create player from character data
    player = createPlayer(characters[0])
    
    return player
```

### Data Validation

Every field is validated on load. Invalid data throws immediately (fail fast) rather than causing silent bugs at runtime:

```
function validateWeapons(data):
    for weapon in data:
        assert weapon.id, "Weapon missing id"
        assert weapon.name, "Weapon missing name"
        assert weapon.type in ['projectile', 'orbit', 'area'], "Invalid weapon type"
        assert weapon.statsPerLevel.length === 7, "Must have exactly 7 levels"
        assert weapon.powerSpikes.level4, "Missing L4 power spike"
        assert weapon.powerSpikes.level7, "Missing L7 power spike"
        // Validate each level's stats are numeric and positive
        for level in weapon.statsPerLevel:
            assert level.damage > 0
            assert level.cooldown > 0
```

### Hot Reload (Development)

During development, `DataManager` watches for file changes and reloads affected data. The engine re-initializes systems with new data without restarting the game. Hot reload is disabled in production builds.

---

## 7. Scene / State Management

### Scene Graph

```
MENU (V1: skip, auto-select default character)
  → STAGE (main gameplay)
      → PAUSE (overlay, triggered by Escape key)
      → LEVEL_UP (overlay, triggered by XP threshold)
  → END_SCREEN (one of three states)
      → VICTORY
      → SURVIVED  
      → DEFEAT
```

### State Machine

```
enum GameState {
    LOADING,        // Loading content files
    MENU,           // Title screen (V1: skipped)
    PLAYING,        // Main gameplay loop
    PAUSED,         // Pause overlay active
    LEVEL_UP,       // Level-up selection overlay active
    GAME_OVER,      // 1.0s freeze, then fade in end screen
    END_SCREEN      // End screen with stats
}
```

### State Transitions

| From | To | Trigger |
|---|---|---|
| LOADING | MENU | Data loaded successfully |
| MENU | PLAYING | Character selected (V1: instant) |
| PLAYING | PAUSED | Escape key pressed / tap pause button |
| PAUSED | PLAYING | Escape key / tap Resume |
| PLAYING | LEVEL_UP | XP ≥ threshold for next level |
| LEVEL_UP | PLAYING | Player selects upgrade option |
| PLAYING | GAME_OVER | Player HP ≤ 0 / Timer ≥ 5:00 / Boss killed |
| GAME_OVER | END_SCREEN | 1.0s freeze + 0.5s fade-in complete |

### Three End States

The game has **three** distinct end conditions. Each produces a different end screen:

#### VICTORY — Boss killed before 5:00

- **Trigger:** Boss HP ≤ 0 while timer < 5:00
- **Title:** "VICTORY" in gold text
- **Bonus:** +100 gold added to final total
- **Bonus text:** "The Gravekeeper has been vanquished!"
- **Effect:** Confetti particle burst
- **Background tint:** Dark with gold accent

#### SURVIVED — Timer reaches 5:00 with boss alive

- **Trigger:** Timer ≥ 5:00 and boss still alive
- **Title:** "SURVIVED" in white text
- **Bonus:** None
- **Background tint:** Dark with blue accent

#### DEFEAT — Player HP reaches 0

- **Trigger:** Player HP ≤ 0
- **Title:** "DEFEATED" in red text
- **Bonus:** None
- **Background tint:** Red overlay (30% opacity)

### End Screen Behavior (All Three)

1. Game freezes for **1.0 seconds** (dramatic pause)
2. End screen fades in over **0.5 seconds**
3. Stats animate (counters tick up from 0 over 1.5s)
4. Stats displayed: Time Survived, Level Reached, Enemies Killed, Gold Collected, Boss Defeated (Yes/No), Weapon Loadout
5. Two buttons: "Restart" (primary), "Main Menu" (secondary)
6. See `08_ui_hud_spec.md` for full end screen layout

### Pause Behavior

- Game fully freezes (all systems stop updating)
- Semi-transparent dark overlay
- Title: "PAUSED"
- Buttons: Resume, Restart, Quit to Menu
- Touch: tap pause button in top-right corner

### Level-Up Behavior

- Game **fully pauses** (not slow-motion)
- Semi-transparent dark overlay
- Title: "LEVEL UP!" with glow
- 3 upgrade cards centered horizontally
- Player selects one → game resumes after 0.3s delay
- See `07_leveling_system_spec.md` for upgrade pool rules
- See `08_ui_hud_spec.md` for level-up screen layout

---

## 8. Damage System

### Damage Formula

```
baseDamage = attacker.stats.damage
isCrit = random() < attacker.stats.critChance
rawDamage = isCrit ? baseDamage * attacker.stats.critMultiplier : baseDamage
finalDamage = max(1, rawDamage - defender.stats.armor)
```

**Key rules:**
- Minimum damage is always **1** (armor cannot reduce below 1)
- Critical hit chance and multiplier come from the attacker's stats
- Armor is flat reduction (e.g., Armor 3 reduces damage by 3, minimum 1)
- Knockback force is proportional to finalDamage: `knockbackForce = finalDamage × 2`

### Critical Hits

- **Display:** Yellow damage numbers (16px, 1.3× scale) — see `vs_colors.md` Damage Numbers
- **Player crit stats:** Start at 0% chance, 1.5× multiplier
- **Can be increased** via passive upgrade: Crit Chance +5% per stack (max 4 stacks)
- **No crit on player damage taken** — crits are attacker-side only

### Knockback

- Direction: away from attacker's position
- Force: `damage dealt × 2` pixels/second impulse
- Applied as instant velocity change (not acceleration)
- Both player and enemies receive knockback
- Knockback velocity decays naturally through movement system friction

### Invincibility Frames

- **Duration:** 0.5 seconds (500ms) after taking damage
- **Visual:** Entity sprite blinks (alternates visible/invisible every 100ms)
- **During i-frames:** Entity cannot take additional damage
- **i-frames are entity-side:** Each entity has its own i-frame timer

```
if entity.stats.iFrames > 0:
    entity.stats.iFrames -= dt
    entity.visible = (floor(entity.age * 10) % 2 === 0)  // Blink at 10Hz
else:
    entity.visible = true
```

### Damage Events

Every damage application emits an event for UI, audio, and visual systems:

```
emit('damage', {
    attacker: Entity,
    defender: Entity,
    damage: number,       // Final damage dealt
    isCrit: boolean,
    isPlayerDamage: boolean  // true = player took damage (for screen effects)
})
```

### Death Events

When an entity's HP ≤ 0:

```
emit('death', {
    entity: Entity,
    killer: Entity,       // Who dealt the killing blow
    position: { x, y }    // For drop spawning
})
```

Death handling:
1. Entity marked inactive (returned to pool)
2. Drop table rolled (XP, gold, power-ups) — see `06_pickups_and_powerups_spec.md`
3. Floating text spawned (+1 XP, +3g, etc.)
4. Kill count incremented
5. If boss: trigger VICTORY end state
6. If player: trigger DEFEAT end state

---

## 9. Camera Effects

### Screen Shake

Screen shake offsets the camera rendering position by random amounts for a specified duration and intensity.

```
class CameraEffect {
    shakeDuration: number;     // Total shake time (seconds)
    shakeIntensity: number;    // Max pixel offset
    shakeTimer: number;        // Current time remaining
    shakeOffsetX: number;      // Current frame offset
    shakeOffsetY: number;      // Current frame offset
    
    trigger(duration, intensity):
        this.shakeDuration = duration
        this.shakeIntensity = intensity
        this.shakeTimer = duration
    
    update(dt):
        if this.shakeTimer > 0:
            this.shakeTimer -= dt
            progress = this.shakeTimer / this.shakeDuration  // 1.0 → 0.0
            currentIntensity = this.shakeIntensity * progress  // Decay over time
            this.shakeOffsetX = (random() * 2 - 1) * currentIntensity
            this.shakeOffsetY = (random() * 2 - 1) * currentIntensity
        else:
            this.shakeOffsetX = 0
            this.shakeOffsetY = 0
```

### Shake Events

| Event | Duration | Intensity | Notes |
|---|---|---|---|
| Boss spawn | 0.5s | Medium (6px) | Dramatic entrance |
| Screen wipe activation | 0.3s | Light (3px) | Satisfying feedback |
| Boss death | 1.0s | Heavy (10px) | Triumphant moment |
| Player low HP warning | Continuous | Subtle (2px) | Only while HP < 25% |

**Low HP shake** is special: it runs continuously while HP is below 25% of max, using a slow sine wave modulation on top of the random offset. It stops immediately when HP rises above 25% (e.g., from a healing power-up in future versions).

---

## 10. HiDPI Rendering

### Device Pixel Ratio Support

The canvas renders crisply on retina and high-DPI displays by scaling the internal resolution to match `window.devicePixelRatio`.

```
function setupCanvas(canvas):
    dpr = window.devicePixelRatio || 1
    cssWidth = canvas.clientWidth
    cssHeight = canvas.clientHeight
    
    // Set internal resolution to match physical pixels
    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    
    // Scale context so drawing commands use CSS pixels (logical coordinates)
    ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    
    // Store logical dimensions for camera/UI calculations
    canvas.logicalWidth = cssWidth
    canvas.logicalHeight = cssHeight
```

### Resize Handling

```
window.addEventListener('resize', () => {
    setupCanvas(canvas)
    // Camera and UI automatically use logicalWidth/logicalHeight
})
```

### Key Rules

- All game coordinates are in **logical pixels** (CSS pixels)
- Canvas internal resolution is `logical × dpr`
- `ctx.scale(dpr, dpr)` makes drawing commands work in logical space
- Camera, collision, and entity positions all use logical coordinates
- Only the canvas buffer resolution changes — no game logic changes

---

## 11. Projectile Lifetime

### Despawn Rules

Projectiles are removed from the game when ANY of these conditions is true:

| Condition | Value | Applies To |
|---|---|---|
| Time alive | ≥ 3.0 seconds | All projectiles |
| Distance traveled | ≥ 600 pixels | Projectile type (Weapon 1) |
| Off-screen | > 200px beyond screen edge | All projectiles |
| Hit an enemy | On contact | Non-piercing projectiles |

### Per-Weapon Behavior

**Weapon 1 (Projectile):**
- Travels in straight line toward nearest enemy
- Despawns on first hit OR after 3s OR after 600px
- At Level 4 (Pierce): passes through 1 additional enemy before despawning
- At Level 7 (Split): parent projectile despawns on hit, spawns 2 child projectiles that fan out ±30°

**Weapon 2 (Orbit):**
- Circles the player for the weapon's duration stat (not a projectile entity)
- Persisted as `orb` entity type, not `projectile`
- Despawns when orbit duration expires
- At Level 7 (Afterimage): visual trail effect, no additional despawn logic

**Weapon 3 (Area):**
- Instant pulse — no persistent projectile entity
- Damage is applied in a single frame to all enemies within radius
- Visual ring expands over 0.15s then disappears
- No lifetime tracking needed

### Distance Tracking

```
entity.distanceTraveled += sqrt(dx*dx + dy*dy)

if entity.age >= 3.0 || entity.distanceTraveled >= 600:
    release(entity)  // Return to pool
```

---

## 12. Obstacle Collision Rules

### Which Entities Collide with Obstacles

| Entity Type | Collides? | Response |
|---|---|---|
| Player | ✅ Yes | Slide along surface |
| Enemies | ✅ Yes | Slide along surface |
| Boss | ✅ Yes | Slide along surface |
| Projectiles | ❌ No | Pass through |
| Pickups | ❌ No | Rest on ground, passable |
| Power-ups | ❌ No | Rest on ground, passable |

### Obstacle Types

5 obstacle types from `vs_colors.md`:

| Type | Size | Collidable | Purpose |
|---|---|---|---|
| Tombstone (Small) | 16×24px | ✅ Yes | Creates choke points |
| Tombstone (Large) | 32×40px | ✅ Yes | Major obstruction |
| Grave Mound | 40×16px | ❌ No (passable) | Visual flavor |
| Broken Wall | 48×12px | ✅ Yes | Forces flanking |
| Cracked Floor | 32×32px | ❌ No (passable) | Ground detail |

### Collision Response (Slide)

When a moving entity hits an obstacle, it slides along the surface instead of stopping:

```
function resolveObstacleCollision(entity, obstacle):
    // Calculate overlap
    overlapX = calculateHorizontalOverlap(entity, obstacle)
    overlapY = calculateVerticalOverlap(entity, obstacle)
    
    // Push out along the axis of least penetration
    if abs(overlapX) < abs(overlapY):
        entity.x += overlapX  // Slide horizontally
        entity.vx = 0
    else:
        entity.y += overlapY  // Slide vertically
        entity.vy = 0
```

### Click/Tap-to-Move Pathfinding

The click/tap-to-move system uses **simple steering**, not A* pathfinding:

```
function updatePathfinding(player, target, obstacles):
    dx = target.x - player.x
    dy = target.y - player.y
    distance = sqrt(dx*dx + dy*dy)
    
    if distance < 4:  // Arrival threshold
        player.movingToTarget = false
        return
    
    // Normalize direction
    dirX = dx / distance
    dirY = dy / distance
    
    // Attempt to move
    nextX = player.x + dirX * player.stats.speed * dt
    nextY = player.y + dirY * player.stats.speed * dt
    
    // Check obstacle collision at next position
    if !collidesWithObstacle(nextX, player.y, player.hitbox, obstacles):
        player.x = nextX
    elif !collidesWithObstacle(player.x, nextY, player.hitbox, obstacles):
        player.y = nextY
    else:
        // Both blocked — try sliding along each axis independently
        // Already handled by resolveObstacleCollision above
```

### Obstacle Placement Rules

From `vs_colors.md`:

1. **Minimum spacing:** No obstacle within 48px of another obstacle
2. **Player spawn safety:** No obstacles within 100px of player start position
3. **Boss arena clearance:** No obstacles within 200px of boss spawn point
4. **Density:** ~5% of visible arena occupied by obstacles
5. **Variety:** Each screen should show at least 2 different obstacle types

Obstacles are placed once at stage start and never move.

---

## 13. Performance Notes

### Targets

| Metric | Target | Minimum |
|---|---|---|
| Frame rate | 60 FPS | 30 FPS |
| Input latency | < 16ms | < 32ms |
| Load time | < 2s | < 5s |
| Memory | < 100MB | < 200MB |

### Entity Caps

| Entity Type | Max Count | Notes |
|---|---|---|
| Enemies | 200 | Including boss (1 slot) |
| Projectiles | 500 | Weapon 1 projectiles |
| Orbs | 50 | Weapon 2 orbiting orbs |
| Pickups | 500 | Oldest despawn when full |
| Obstacles | ~100 | Placed at stage start |
| Floating text | 100 | Damage numbers, pickup text |

### Optimization Strategies

1. **Object pooling** — All entity types use pre-allocated pools. No `new` allocations during gameplay.
2. **Visibility culling** — Don't render entities outside the camera viewport + 100px margin.
3. **Spatial hashing** — Optional. Only needed if profiling shows collision detection bottleneck at 200+ entities. 64px grid cells.
4. **Canvas state batching** — Minimize `ctx.save()`/`ctx.restore()` calls. Group draws by fillStyle.
5. **Avoid string allocations** — No string concatenation in hot loops. Use numeric IDs.
6. **Typed arrays** — Use `Float32Array` for position/velocity data if profiling shows GC pressure.

### Performance Monitoring (Debug Mode)

In development, overlay an FPS counter:

```
class FPSCounter {
    frames: number = 0
    lastTime: number = 0
    fps: number = 0
    
    update(dt):
        this.frames++
        this.lastTime += dt
        if this.lastTime >= 1.0:
            this.fps = this.frames
            this.frames = 0
            this.lastTime -= 1.0
}
```

Display as small text in top-right corner during development. Hidden in production.

---

## 14. Game Initialization & Boot Sequence

### Boot Flow

The game initializes in this exact order on page load:

```
1. DOM Ready
   └─ Create <canvas> element, append to document body
   └─ Call setupCanvas() for HiDPI (see Section 10)
   └─ Register resize listener

2. Create Engine Core
   └─ Instantiate EventBus (see Section 3)
   └─ Instantiate all systems (GameLoop, EntityManager, InputManager, Camera, etc.)
   └─ Register system event listeners on EventBus

3. Show Loading Screen
   └─ Dark background with "Loading..." text (see 08_ui_hud_spec.md)
   └─ Render one frame to display loading screen

4. Load Content Data
   └─ Parallel fetch of 6 JSON files (see Section 6)
   └─ Validate all data on load (fail-fast on errors)
   └─ On error: show error message with details, halt initialization

5. Initialize Systems
   └─ SpawnSystem.init(stageData)
   └─ WeaponSystem.init(weaponsData)
   └─ LevelingSystem.init(levelingData)
   └─ AudioManager.init(audioContext) — create Web Audio API context

6. Create Player
   └─ Acquire player entity from character data
   └─ Position at arena origin (0, 0)
   └─ Camera snap to player position (no lerp on first frame)

7. Place Obstacles
   └─ Generate obstacle positions per vs_colors.md placement rules
   └─ Create obstacle entities (static, never pooled)

8. Start Game Loop
   └─ GameLoop.start() — begin fixed-timestep update/render cycle
   └─ Timer starts at 0:00
   └─ First enemy spawns per wave timeline
```

### Loading Error Handling

- If any JSON file fails to load: show error overlay with file name and HTTP status
- If data validation fails: show error overlay with field name and expected type
- No retry logic in V1 — user must refresh the page
- Audio context may require user gesture to start (see Section 19)

---

## 15. Game Timer System

### Timer Behavior

The game timer tracks elapsed time from 0:00 to 5:00 and drives all time-based events.

```
class GameTimer {
    elapsed: number = 0      // Seconds since game start
    running: boolean = false  // false during loading, pause, level-up
    
    update(dt):
        if this.running:
            this.elapsed += dt
    
    get formatted(): string:
        minutes = floor(this.elapsed / 60)
        seconds = floor(this.elapsed % 60)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    
    get bossSpawnTime(): boolean:
        return this.elapsed >= 240  // 4:00 in seconds
    
    get gameTimeExpired(): boolean:
        return this.elapsed >= 300  // 5:00 in seconds
}
```

### Timer Pause Rules

| State | Timer Running? |
|---|---|
| PLAYING | ✅ Yes |
| PAUSED | ❌ No |
| LEVEL_UP | ❌ No |
| GAME_OVER | ❌ No |
| END_SCREEN | ❌ No |

### Time-Driven Events

| Time | Event | System |
|---|---|---|
| 0:00 | Game starts, first enemies spawn | SpawnSystem |
| 0:30 | Wave bracket 2 begins (higher spawn rate) | SpawnSystem |
| 1:00 | Bats arrive | SpawnSystem |
| ... | (10 wave brackets total) | SpawnSystem |
| 3:50 | Boss announcement text: "Something stirs..." | UIManager |
| 3:55 | Camera shake + text: "The Gravekeeper rises!" | CameraEffects, UIManager |
| 4:00 | Boss spawns from nearest screen edge | SpawnSystem |
| 5:00 | Timer expires → SURVIVED if boss alive, or game continues if boss dead | StateManager |

See `05_stages_spec.md` for the complete wave timeline.

### Boss Spawn Trigger

When `timer.elapsed >= 240` (4:00) AND boss has not yet spawned:
1. Emit `bossSpawn` event
2. Spawn boss entity from nearest screen edge (400-600px from player)
3. Camera shake (0.5s, medium — see Section 9)
4. Boss health bar appears (see Section 17)
5. Music transitions to boss theme (see `09_audio_spec.md`)

---

## 16. Page Visibility & Tab Handling

### Visibility Change

The game auto-pauses when the browser tab loses focus or the page becomes hidden:

```
document.addEventListener('visibilitychange', () => {
    if document.hidden && engine.state === 'PLAYING':
        engine.pause()
        // Show "PAUSED" overlay (same as Escape key)
    // Do NOT auto-resume — player must manually resume
})
```

### Rules

- **Tab hidden → auto-pause.** Game enters PAUSED state.
- **Tab visible → do NOT auto-resume.** Player must tap/click Resume or press Escape.
- **Timer stops** during auto-pause (see Section 15).
- **Audio mutes** during auto-pause.
- **Works on mobile:** `visibilitychange` fires when app is backgrounded on iOS/Android.

### Window Blur (Desktop)

```
window.addEventListener('blur', () => {
    if engine.state === 'PLAYING':
        engine.pause()
})
```

Optional in V1. Can be enabled/disabled via config.

---

## 17. Boss Health Bar

### Appearance

The boss health bar is a large bar displayed at the top of the screen during the boss fight.

| Property | Value |
|---|---|
| Position | Top-center of screen, below timer |
| Width | 60% of screen width (min 300px) |
| Height | 20px |
| Background | Dark gray (#1A1A2E) |
| Fill | Boss Crimson (#4A0000) transitioning to bright red (#FF0000) as HP drops |
| Border | 2px solid #FF4444 |
| Label | Boss name: "The Gravekeeper" centered above bar |
| Boss HP text | "HP" + numeric value centered inside bar |

### Lifecycle

| Event | Action |
|---|---|
| Boss spawns (4:00) | Bar fades in over 0.5s |
| Boss takes damage | Bar fill updates smoothly (lerp, 0.2s) |
| Boss enters Phase 2 (50% HP) | Bar flashes red briefly (0.3s) |
| Boss dies | Bar fades out over 0.5s |
| Game ends (defeat/survived) | Bar hidden immediately |

### Phase 2 Visual Cue

When boss HP drops below 50%, the health bar border pulses (opacity 0.5→1.0, 0.5s cycle) to signal the phase transition to the player.

---

## 18. Enemy Projectiles

### Overview

The Caster enemy (Enemy type 5) fires projectiles at the player. These are distinct from player projectiles and have their own collision behavior.

### Enemy Projectile Entity

```
interface EnemyProjectile extends Entity {
    type: 'enemyProjectile'
    stats: {
        damage: 6          // From vs_prog.md Caster stats
        speed: 150         // px/s
        lifetime: 4.0      // seconds (longer than player projectiles)
    }
    hitbox: { shape: 'circle', radius: 3 }  // Small, 6×6px visual
    collisionLayer: ENEMY  // Same layer as enemies — damages PLAYER
    visual: { shape: 'diamond', color: '#4DD0E1', size: 6 }  // See vs_colors.md
}
```

### Collision Layer

Enemy projectiles use the `ENEMY` collision layer (bit `0b0010`). This means:
- ✅ They collide with `PLAYER` (same as enemy contact damage)
- ❌ They do NOT collide with other enemies
- ❌ They do NOT collide with player projectiles
- ❌ They do NOT collide with obstacles (same as player projectiles)

### Behavior

1. Caster maintains distance from player (300-400px preferred range)
2. Caster fires projectile toward player's current position every 2.0 seconds
3. Projectile travels in straight line at 150 px/s
4. On hit: deal 6 damage to player, apply knockback, trigger i-frames, destroy projectile
5. Projectile despawns after 4 seconds or when off-screen (>200px beyond edge)
6. Maximum 10 enemy projectiles on screen simultaneously (pool cap)

### Visual

Small bright teal diamond (`#4DD0E1`), 6×6px. Travels in straight line. No animation. See `vs_colors.md` Enemy Projectile section.

---

## 19. Additional Systems Notes

### Gold as Score Metric (V1)

Gold is a **score-only metric** in V1. It is:
- ✅ Collected from enemy kills
- ✅ Displayed in the HUD gold counter
- ✅ Shown on the end screen stats
- ✅ Increased by +100 on Victory (boss kill bonus)
- ❌ NOT spent on anything (no shop, no upgrades, no purchases)

This is intentional for the V1 prototype. Gold spending (shop/upgrade between runs) is planned for V2. See `vs_plan.md` Version Roadmap.

### XP Value Scaling

Enemy XP values increase over time per `vs_prog.md`:

```
xp_value(t) = base_xp × (1 + 0.05 × floor(t / 60))
```

- 5% increase per minute
- Applied at enemy spawn time (the XP value is set when the enemy entity is created)
- A Zombie spawned at 3:00 gives `1 × (1 + 0.05 × 3) = 1.15 XP` (rounded to 1)
- This scaling is applied by the SpawnSystem when creating enemy entities
- See `05_stages_spec.md` for the XP scaling formula

### Magnet Attraction Physics

When the magnet power-up is active, pickups within range are attracted to the player:

```
MAGNET_RADIUS = 350      // px — pickups within this radius are attracted
MAGNET_SPEED = 400       // px/s — attraction travel speed
INSTANT_BURST = 150      // px — pickups within this range are collected instantly on pickup
MAGNET_DURATION = 10     // seconds

function updateMagnetPickups(player, pickups, dt):
    for pickup in pickups:
        if !pickup.active: continue
        dx = player.x - pickup.x
        dy = player.y - pickup.y
        distance = sqrt(dx*dx + dy*dy)
        
        if distance < MAGNET_RADIUS:
            // Accelerate toward player
            dirX = dx / distance
            dirY = dy / distance
            pickup.x += dirX * MAGNET_SPEED * dt
            pickup.y += dirY * MAGNET_SPEED * dt
            
            // Collect when within pickup range
            if distance < player.stats.pickupRange:
                collectPickup(player, pickup)
```

**Instant burst behavior:** When the player collects a magnet power-up, all pickups within 150px are immediately collected (no travel time). Remaining pickups within 350px begin attracted movement.

**Duration stacking:** Multiple magnet pickups do NOT stack duration. Picking up another magnet resets the 10s timer.

### Background Music System

The AudioManager handles background music as a separate channel from SFX:

- **Music channel:** Single track, crossfaded between transitions
- **SFX channel:** Up to 16 concurrent sounds (see `09_audio_spec.md`)
- **UI channel:** Single concurrent sound for menu interactions

Music transitions are driven by the game timer (see `09_audio_spec.md` Sound Design Arc for the full timeline). Key transitions:
- 0:00 — Stage theme ambient intro (fade in 2s)
- 0:15 — Beat drop (drums enter)
- 3:30 — Pre-boss build (strings swell)
- 3:50 — Silence (2s dramatic cut)
- 4:00 — Boss theme full combat
- Boss death — Victory sting (2s brass fanfare)
- 5:00 — Game Over melancholic piano

See `09_audio_spec.md` for complete audio specifications.

### Web Audio API Context

The Web Audio API requires a user gesture (click/tap) before creating or resuming an AudioContext. The engine handles this:

```
// On first user interaction (click or tap anywhere)
function initAudio():
    if audioContext.state === 'suspended':
        audioContext.resume()
    // Now audio can play

// Register on first interaction
document.addEventListener('click', initAudio, { once: true })
document.addEventListener('touchstart', initAudio, { once: true })
```

Until the first user gesture, all sounds are silently queued. After the AudioContext resumes, queued sounds play normally.

---

## Cross-Reference Summary

| Section | References |
|---|---|
| Entity visuals | `vs_colors.md` — all shapes, colors, sizes |
| Entity stats | `02_character_spec.md`, `04_enemies_spec.md`, `03_weapons_spec.md` |
| Wave timeline | `05_stages_spec.md` (drives SpawnSystem) |
| XP/leveling | `07_leveling_system_spec.md` (drives LevelingSystem) |
| XP scaling | `05_stages_spec.md` (XP value formula) |
| Pickups/power-ups | `06_pickups_and_powerups_spec.md` (drives PickupSystem) |
| Magnet physics | `06_pickups_and_powerups_spec.md` (attract rules) |
| HUD/UI | `08_ui_hud_spec.md` (drives UIManager) |
| Boss health bar | `08_ui_hud_spec.md` (layout) |
| Audio/music | `09_audio_spec.md` (drives AudioManager) |
| Data schemas | `10_json_schemas.md` (defines all JSON content files) |
| Progression numbers | `vs_prog.md` (source of truth for all gameplay values) |
| Obstacle placement | `vs_colors.md` Map & Obstacles section |
| Enemy projectiles | `04_enemies_spec.md` (Caster projectile stats) |
| Timer events | `05_stages_spec.md` (wave timeline) |

---

*End of 01_engine_architecture.md — Version 1*
