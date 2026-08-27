# Attack Telegraph System & Boss Introduction Sequences

> **Version:** 1.0
> **Game Version:** v0.4.0 (post-SVG, post-audio)
> **Date:** August 24, 2026
> **Related Files:** `game2.html`, `extract_engine.html`, `game_frame.md`, `11_svg_asset_spec.md`

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Feature 1: Data-Driven Attack Telegraph System](#2-feature-1-data-driven-attack-telegraph-system)
3. [Feature 2: Boss Introduction Sequence](#3-feature-2-boss-introduction-sequence)
4. [Data Schemas (content/mechanics.json)](#4-data-schemas)
5. [Engine Changes Required](#5-engine-changes-required)
6. [Rendering Pipeline](#6-rendering-pipeline)
7. [Event Flow](#7-event-flow)
8. [Examples & Use Cases](#8-examples--use-cases)
9. [Gaps, Conflicts & Questions](#9-gaps-conflicts--questions)
10. [Implementation Priority](#10-implementation-priority)

---

## 1. Current State Audit

### What Exists Today

| System | Location | Lines | What It Does | Limitation |
|---|---|---|---|---|
| Boss charge state machine | `MovementSystem._moveBoss()` | L1145-1205 | Hardcoded chase→windup→charge→pause cycle | Only handles boss_charge pattern. No other telegraph shapes. Not data-driven. |
| Boss warning zone renderer | `Renderer._drawBossWarningZone()` | L1926-1975 | Draws orange flickering rectangle with chevrons | Only supports rectangle shape. Tightly coupled to boss entity. |
| Boss spawn | `SpawnSystem._spawnBoss()` | L983-1005 | Creates boss entity, emits `bossSpawn` event | No intro sequence. Boss just appears and fight begins immediately. |
| Stage announcements | `stages.bossConfig.announcement[]` | L437-439 | Defines timed text events (dim at 230s, text at 235s) | **Never rendered.** Engine only reads `spawnTime`. Gap 7 in extract_engine.html. |

### Problems with Current Design

1. **Not data-driven**: The boss charge cycle (1.2s windup, 1.5s charge, 1.0s pause) is hardcoded in JavaScript. Changing it requires editing the engine.
2. **Single shape only**: Only supports directional rectangles. Can't do circles, cones, lines, or AoE markers.
3. **No stage event telegraphs**: Can't add environmental hazards (falling debris, lava pools, poison clouds) that telegraph before dealing damage.
4. **No boss intro**: The Gravekeeper just spawns. No dramatic pause, no name card, no visual introduction. Missed opportunity for game feel.
5. **Announcement data unused**: The stage JSON already defines announcement timing and text but the engine ignores it.

---

## 2. Feature 1: Data-Driven Attack Telegraph System

### Core Concept

A **TelegraphSystem** that:
- Reads telegraph definitions from `content/mechanics.json` (or enemy data)
- Manages active telegraph instances (creation, timer, rendering, expiry)
- Applies damage when telegraphs resolve (the "hit" after the warning)
- Supports multiple shapes, colors, animation styles, and damage patterns
- Is used by both monsters (attacks) and stage events (environmental hazards)

### Telegraph Lifecycle

```
                    ┌─────────────────────────────────────┐
                    │        TELEGRAPH LIFECYCLE           │
                    └─────────────────────────────────────┘

1. TRIGGER          2. WINDUP (visible)        3. RESOLVE (damage)
   ┌──────┐            ┌──────┐                   ┌──────┐
   │ NONE │ ─────────► │ WARN │ ────────────────► │ HIT  │ ──► destroy
   └──────┘  spawn     └──────┘  timer expires    └──────┘
                    draw shape           deal damage in shape
                    animate              spawn VFX
                    flash                emit sound
```

### Telegraph Shape Types

| Shape | Use Case | Config Fields |
|---|---|---|
| `rectangle` | Boss charge lane, debris fall zone | `x, y, width, height, angle` |
| `circle` | AoE ground pound, explosion radius | `x, y, radius` |
| `cone` | Breath attack, fan-shaped spells | `x, y, angle, arcDegrees, radius` |
| `line` | Laser, beam, trap activation | `x1, y1, x2, y2, width` |
| `ring` | Donut AoE (safe in center) | `x, y, innerRadius, outerRadius` |
| `cross` | Cardinal direction attacks | `x, y, armLength, armWidth` |

### Telegraph Visual Styles

Each telegraph has a visual configuration that controls how the warning looks during windup:

| Property | Description | Default |
|---|---|---|
| `fillColor` | Semi-transparent fill during windup | `"rgba(255, 145, 0, 0.25)"` |
| `strokeColor` | Border color | `"rgba(255, 145, 0, 0.55)"` |
| `strokeWidth` | Border thickness in pixels | `2` |
| `flickerRate` | How fast the fill pulses (Hz) | `6` (i.e., `sin(Date.now() * 0.012)`) |
| `flickerMin` | Minimum alpha during flicker | `0.15` |
| `flickerMax` | Maximum alpha during flicker | `0.35` |
| `chevrons` | Show directional chevrons | `true` |
| `chevronCount` | Number of chevron arrows | `5` |
| `chevronColor` | Chevron color | `"rgba(255, 200, 0, 0.7)"` |
| `pulseScale` | Whether the shape grows during windup | `false` |
| `pulseScaleFrom` | Start scale (0-1) | `0.8` |
| `outlineOnly` | If true, no fill — stroke only | `false` |
| `dangerIcon` | Show a ⚠ or 💀 icon at center | `null` |

### Why This Design Works

| Alternative | Problem | Our Approach |
|---|---|---|
| Hardcoded per-enemy | Every new enemy needs engine changes. Content creators can't add telegraphs. | Data-driven: add a telegraph to any enemy's JSON and it just works. |
| Canvas-based only | Can't preview in editor. Can't reuse SVGs. | Hybrid: shapes drawn on canvas (for dynamic sizing) but colors/config from data. |
| Fixed rectangle | Limited game feel. Can't do interesting AoE patterns. | 6 shape types cover all standard top-down game telegraph patterns. |
| No damage phase | Telegraph is just visual — must have separate damage logic. | Telegraph = windup + damage in one system. Single source of truth. |

---

### Telegraph Instance Schema

When a telegraph is active in-game, the engine creates an instance with this runtime shape:

```javascript
{
  id: "telegraph_001",           // unique instance ID
  shapeType: "circle",           // rectangle | circle | cone | line | ring | cross
  source: "enemy",               // "enemy" | "stage_event" | "boss"
  sourceEntity: <entity ref>,    // reference to the entity that triggered it (if any)

  // Position & dimensions (world coordinates)
  x: 200,                        // center X
  y: -50,                        // center Y
  width: 120,                    // rectangle/cross only
  height: 400,                   // rectangle/cross only
  radius: 80,                    // circle/ring/cone only
  innerRadius: 40,               // ring only
  angle: 0.785,                  // rotation in radians (rectangle, cone, line)
  arcDegrees: 90,                // cone only
  x1: 0, y1: 0,                 // line start
  x2: 100, y2: 200,             // line end
  lineWidth: 30,                 // line width

  // Timing
  createdAt: 12.5,               // gameTime when created
  windupDuration: 1.0,           // seconds of visible warning
  elapsed: 0.3,                  // seconds since creation
  resolveDamage: true,           // whether to deal damage at resolve
  damage: 15,                    // damage on resolve
  knockback: 0,                  // optional knockback force

  // Visual config (from JSON or defaults)
  visual: {
    fillColor: "rgba(255, 145, 0, 0.25)",
    strokeColor: "rgba(255, 145, 0, 0.55)",
    strokeWidth: 2,
    flickerRate: 6,
    flickerMin: 0.15,
    flickerMax: 0.35,
    chevrons: true,
    chevronCount: 5,
    chevronColor: "rgba(255, 200, 0, 0.7)",
    pulseScale: false,
    pulseScaleFrom: 0.8,
    outlineOnly: false,
    dangerIcon: null,
  },

  // Sound
  windupSound: "telegraph_warn",  // audio event to play on creation
  resolveSound: "telegraph_hit",  // audio event to play on resolve

  // Callback (for custom behavior on resolve)
  onResolve: null,                 // optional function(telegraph, entityManager)
}
```

---

## 3. Feature 2: Boss Introduction Sequence

### Core Concept

When a boss spawns, the game:
1. **Freezes gameplay** (entities stop, timers pause)
2. **Shows a dramatic introduction overlay** (boss image, name, subtitle)
3. **Plays a sound cue** (dramatic chord or fanfare)
4. **Holds for 3-4 seconds** (configurable)
5. **Resumes gameplay** with the boss now active

This is a standard "boss arrival" sequence seen in games like Hollow Knight, Dead Cells, and Vampire Survivors (Harvest Dawn).

### Introduction Sequence Timeline

```
TIME    EVENT
─────   ─────────────────────────────────────────────
0.0s    Screen begins to dim (darken overlay fades in)
0.3s    Boss image fades in at center (scale 0.8→1.0)
0.5s    Boss name appears below image (slide up + fade in)
0.8s    Subtitle / tagline appears (slide up + fade in)
1.0s    Camera shake triggers (rumble feel)
1.2s    "WARNING" text flashes at top (optional, configurable)
3.0s    All intro elements begin fading out
3.5s    Screen brightens back to normal
3.8s    Gameplay resumes, boss state machine starts
4.0s    (Optional) Arena borders activate, music shifts to boss theme
```

### Why This Design Works

| Alternative | Problem | Our Approach |
|---|---|---|
| No intro (current) | Boss just appears. No dramatic moment. Player doesn't know a boss fight started. | Pause + overlay = unmistakable boss arrival. |
| Skip button | Some players want to skip. But on first encounter, it should be mandatory. | `allowSkip` flag in boss data. First encounter = forced. Subsequent = skippable. |
| Cutscene-style | Too complex for a canvas game. Needs scene graph, camera paths, etc. | Simple overlay: darken → image → name → fade. 3.5 seconds total. High impact, low code. |
| Per-boss custom intro | Every boss needs unique intro code. | Data-driven: each boss defines its intro in the enemy JSON. Engine reads config and plays it. |

### Introduction Instance Schema

```javascript
{
  bossId: "boss_gravekeeper",
  bossName: "The Gravekeeper",
  bossSubtitle: "Guardian of the Forgotten Dead",
  bossImage: "boss_intro_gravekeeper",  // key into imageCache or inline data URI

  // Timing
  totalDuration: 3.5,          // seconds total
  dimStart: 0.0,               // when screen dim begins
  imageFadeIn: 0.3,            // when boss image starts fading in
  nameFadeIn: 0.5,             // when name text starts appearing
  subtitleFadeIn: 0.8,         // when subtitle starts appearing
  shakeTime: 1.0,              // when camera shake triggers
  fadeOutStart: 3.0,           // when everything starts fading out
  resumeTime: 3.5,             // when gameplay resumes

  // Visual
  dimColor: "rgba(0, 0, 0, 0.7)",   // overlay darkness
  nameColor: "#FF4444",              // boss name color
  subtitleColor: "#AAAAAA",          // subtitle color
  nameFontSize: 36,                  // px
  subtitleFontSize: 18,              // px
  imageScale: 1.0,                   // final scale of boss image
  imageMaxWidth: 200,                // max width in px
  imageMaxHeight: 200,               // max height in px

  // Audio
  introSound: "boss_intro_gravekeeper",  // audio event
  musicFadeOut: true,                     // fade current music during intro
  musicFadeIn: true,                      // fade boss music after intro

  // Gameplay
  allowSkip: false,              // can player skip? (false for first encounter)
  freezeEntities: true,          // stop all movement during intro
  freezeProjectiles: true,       // stop projectiles too
  freezeSpawners: true,          // stop enemy spawning during intro
}
```

---

## 4. Data Schemas

### Addition to `content/mechanics.json` — Telegraph Templates

```json
{
  "telegraphTemplates": [
    {
      "id": "boss_charge_lane",
      "description": "Directional charge warning — rectangle along charge path",
      "shapeType": "rectangle",
      "windupDuration": 1.2,
      "resolveDamage": true,
      "damage": 15,
      "visual": {
        "fillColor": "rgba(255, 145, 0, 0.25)",
        "strokeColor": "rgba(255, 145, 0, 0.55)",
        "strokeWidth": 2,
        "flickerRate": 6,
        "chevrons": true,
        "chevronCount": 5
      },
      "windupSound": "boss_charge_warn",
      "resolveSound": "boss_charge_impact"
    },
    {
      "id": "ground_pound_circle",
      "description": "Circular AoE around an entity (boss ground pound)",
      "shapeType": "circle",
      "windupDuration": 0.75,
      "resolveDamage": true,
      "damage": 20,
      "visual": {
        "fillColor": "rgba(255, 50, 0, 0.30)",
        "strokeColor": "rgba(255, 50, 0, 0.60)",
        "strokeWidth": 3,
        "flickerRate": 8,
        "pulseScale": true,
        "pulseScaleFrom": 0.5,
        "dangerIcon": "⚠"
      },
      "windupSound": "ground_pound_warn",
      "resolveSound": "ground_pound_hit"
    },
    {
      "id": "falling_debris",
      "description": "Circle that warns of falling rocks/debris — no entity source",
      "shapeType": "circle",
      "windupDuration": 1.5,
      "resolveDamage": true,
      "damage": 10,
      "visual": {
        "fillColor": "rgba(200, 150, 50, 0.20)",
        "strokeColor": "rgba(200, 150, 50, 0.40)",
        "strokeWidth": 2,
        "flickerRate": 4,
        "chevrons": false,
        "dangerIcon": "⚠"
      },
      "windupSound": "debris_warn",
      "resolveSound": "debris_hit"
    },
    {
      "id": "lava_pool",
      "description": "Circle that fills with lava after telegraph — persists as hazard",
      "shapeType": "circle",
      "windupDuration": 2.0,
      "resolveDamage": false,
      "postResolve": {
        "type": "persistent_hazard",
        "tickDamage": 3,
        "tickInterval": 0.5,
        "duration": 5.0,
        "visual": {
          "fillColor": "rgba(255, 80, 0, 0.60)",
          "strokeColor": "rgba(255, 120, 0, 0.80)"
        }
      },
      "visual": {
        "fillColor": "rgba(255, 80, 0, 0.15)",
        "strokeColor": "rgba(255, 80, 0, 0.30)",
        "flickerRate": 3,
        "pulseScale": true,
        "pulseScaleFrom": 0.3
      },
      "windupSound": "lava_warn",
      "resolveSound": "lava_erupt"
    },
    {
      "id": "caster_bolt",
      "description": "Line telegraph for ranged enemy projectile path",
      "shapeType": "line",
      "windupDuration": 0.5,
      "resolveDamage": true,
      "damage": 6,
      "visual": {
        "fillColor": "rgba(150, 50, 255, 0.30)",
        "strokeColor": "rgba(150, 50, 255, 0.60)",
        "strokeWidth": 4,
        "flickerRate": 10,
        "chevrons": false
      },
      "windupSound": null,
      "resolveSound": "caster_bolt_fire"
    },
    {
      "id": "laser_beam",
      "description": "Narrow line telegraph for beam attacks",
      "shapeType": "line",
      "windupDuration": 0.8,
      "resolveDamage": true,
      "damage": 12,
      "visual": {
        "fillColor": "rgba(255, 0, 0, 0.20)",
        "strokeColor": "rgba(255, 0, 0, 0.50)",
        "strokeWidth": 6,
        "flickerRate": 12,
        "chevrons": false
      },
      "windupSound": "laser_warn",
      "resolveSound": "laser_fire"
    }
  ]
}
```

### Addition to Enemy Data — Per-Attack Telegraph

Enemies can define attacks with telegraph configurations. The engine reads these and spawns telegraphs when the enemy's behavior triggers them.

```json
{
  "id": "boss_gravekeeper",
  "name": "The Gravekeeper",
  "type": "boss",
  "stats": { ... },
  "behavior": {
    "pattern": "boss_charge",
    "params": {
      "chargeDuration": 1.5,
      "pauseDuration": 1.0,
      "chargeInterval": 3.0
    }
  },
  "attacks": [
    {
      "id": "charge",
      "trigger": "on_state_enter:windup",
      "telegraph": {
        "templateId": "boss_charge_lane",
        "dynamicSize": true,
        "sizeFormula": {
          "width": "entity.size * 4",
          "length": 600
        },
        "positionSource": "entity",
        "angleSource": "entity._chargeDir"
      },
      "onResolve": {
        "type": "charge_rush",
        "speed": "entity.speed * 3",
        "duration": "entity._chargeDuration"
      }
    },
    {
      "id": "ground_pound",
      "trigger": "on_phase:2:timer:5.0",
      "telegraph": {
        "templateId": "ground_pound_circle",
        "radius": 80,
        "positionSource": "entity"
      },
      "onResolve": {
        "type": "aoe_damage",
        "radius": 80,
        "damage": 20,
        "knockback": 100
      }
    }
  ],
  "intro": {
    "bossName": "The Gravekeeper",
    "bossSubtitle": "Guardian of the Forgotten Dead",
    "bossImage": "boss_intro_gravekeeper",
    "totalDuration": 3.5,
    "allowSkip": false,
    "introSound": "boss_intro_gravekeeper",
    "nameColor": "#FF4444"
  },
  "phases": [ ... ]
}
```

### Addition to Stage Data — Environmental Telegraphs

Stages can define timed environmental events that use the telegraph system.

```json
{
  "id": "stage_cave",
  "name": "The Crystal Cavern",
  "environmentalEvents": [
    {
      "id": "falling_stalactites",
      "description": "Stalactites fall periodically — telegraph before impact",
      "trigger": {
        "type": "timer",
        "interval": 8.0,
        "randomOffset": 3.0,
        "startTime": 30.0
      },
      "telegraph": {
        "templateId": "falling_debris",
        "positionSource": "random_near_player",
        "positionRange": { "minDist": 50, "maxDist": 350 },
        "radius": 40,
        "randomizeRadius": { "min": 25, "max": 60 }
      },
      "onResolve": {
        "type": "aoe_damage",
        "damage": 8,
        "spawnVfx": "rock_shatter"
      },
      "maxConcurrent": 3
    },
    {
      "id": "lava_eruption",
      "description": "Lava pools form and persist as damage zones",
      "trigger": {
        "type": "timer",
        "interval": 12.0,
        "startTime": 60.0
      },
      "telegraph": {
        "templateId": "lava_pool",
        "positionSource": "random_near_player",
        "positionRange": { "minDist": 100, "maxDist": 400 },
        "radius": 60
      },
      "maxConcurrent": 5
    }
  ],
  "bossConfig": {
    "enemyId": "boss_gravekeeper",
    "spawnTime": "4:00",
    "intro": {
      "useEnemyIntro": true
    },
    "announcement": [
      {
        "time": 230,
        "text": "Something stirs in the darkness...",
        "type": "text",
        "styling": {
          "fontSize": 24,
          "position": "center",
          "animation": "fadeInHoldFadeOut"
        }
      },
      {
        "time": 235,
        "text": "THE GRAVEKEEPER APPROACHES",
        "type": "boss_name",
        "styling": {
          "fontSize": 42,
          "color": "#FF4444",
          "position": "center",
          "animation": "slam",
          "holdDuration": 2.0
        }
      }
    ]
  }
}
```

---

## 5. Engine Changes Required

### New Class: `TelegraphSystem`

```
Location: Between DamageSystem and PickupSystem in the class order
Dependencies: EntityManager, EventBus, DataManager
Update position: Called AFTER movement but BEFORE collision/damage
```

**Responsibilities:**
1. `spawn(config)` — Create a telegraph instance from a template or inline config
2. `update(dt)` — Tick all active telegraphs, check windup expiry, resolve damage
3. `render(ctx, camera)` — Draw all active telegraphs (called from Renderer)
4. `clearAll()` — Remove all telegraphs (on game reset)
5. `getActiveAt(x, y)` — Query telegraphs covering a point (for hazard checks)

### Changes to Existing Systems

| System | Change | Reason |
|---|---|---|
| **MovementSystem._moveBoss()** | Replace hardcoded state machine with data-driven attack reading from `enemy.attacks[]` | Boss behaviors become configurable per-boss |
| **MovementSystem._moveBoss()** | On windup state enter, call `telegraphSystem.spawn(config)` instead of storing `_chargePath` | Telegraphs are now managed by the TelegraphSystem |
| **Renderer.render()** | Replace `_drawBossWarningZone(entities)` with `this.telegraphSystem.render(ctx, camera)` | Single rendering path for all telegraphs |
| **Renderer._drawBossWarningZone()** | DELETE — replaced by TelegraphSystem._drawTelegraph() which handles all shapes | Remove boss-specific rendering |
| **CollisionSystem** | After damage resolution, check `telegraphSystem.getActiveAt(x, y)` for persistent hazards (lava pools) | Environmental damage zones need collision detection |
| **SpawnSystem._spawnBoss()** | On boss spawn, check `enemyData.intro` and call `game.startBossIntro(introConfig)` if defined | Trigger intro sequence |
| **Game.update()** | Add `this.telegraphSystem.update(dt)` in the system update chain | Tick telegraph timers |
| **Game.update()** | When `gameState === 'bossIntro'`, skip all system updates | Freeze gameplay during intro |
| **Game.startBossIntro()** | New method: pause game, show intro overlay, resume after duration | Orchestrate the intro sequence |
| **Renderer** | New method `_drawBossIntro(overlay)` to render the intro overlay | Boss name, image, subtitle rendering |
| **GameState** | Add `'bossIntro'` state between `'playing'` and the existing states | Track intro state for freeze logic |
| **AudioManager** | New event handler for `bossIntro` — play intro sound, fade music | Audio during boss intro |

### System Update Order (Modified)

```
BEFORE (current):
  MovementSystem → WeaponSystem → CollisionSystem → DamageSystem → EntityManager → SpawnSystem → PickupSystem → LevelingSystem

AFTER (with telegraphs):
  MovementSystem → TelegraphSystem → WeaponSystem → CollisionSystem → DamageSystem → EntityManager → SpawnSystem → PickupSystem → LevelingSystem

Why TelegraphSystem AFTER Movement:
  - Entities have moved to their new positions
  - Telegraph positions can reference entity positions (e.g., boss ground pound at boss.x, boss.y)
  - But BEFORE collision so telegraph damage can be applied in the same frame
```

---

## 6. Rendering Pipeline

### Telegraph Rendering Order

```
1. Grid (background)
2. Persistent hazard telegraphs (lava pools, etc.) — BOTTOM LAYER
3. Active windup telegraphs — MIDDLE LAYER (flickering, animated)
4. Entities (y-sorted)
5. Pulse effects (weapon area pulses)
6. Floating text
7. UI overlay
```

### Shape Rendering Details

**Rectangle:**
```
ctx.save()
ctx.translate(cx, cy)
ctx.rotate(angle)
ctx.fillRect(-length/2, -width/2, length, width)   // flickering fill
ctx.strokeRect(-length/2, -width/2, length, width)  // border
// chevrons at intervals along length
ctx.restore()
```

**Circle:**
```
ctx.beginPath()
ctx.arc(x, y, radius * currentScale, 0, Math.PI * 2)
ctx.fill()    // flickering fill
ctx.stroke()  // border
// optional dangerIcon at center
```

**Cone:**
```
ctx.beginPath()
ctx.moveTo(x, y)
ctx.arc(x, y, radius, startAngle, endAngle)
ctx.closePath()
ctx.fill()
ctx.stroke()
```

**Line:**
```
ctx.beginPath()
ctx.moveTo(x1, y1)
ctx.lineTo(x2, y2)
ctx.lineWidth = configuredWidth
ctx.stroke()  // flickering
```

**Ring:**
```
ctx.beginPath()
ctx.arc(x, y, outerRadius, 0, Math.PI * 2)
ctx.arc(x, y, innerRadius, 0, Math.PI * 2, true)  // counter-clockwise for hole
ctx.fill()
ctx.stroke()
```

**Cross:**
```
// Two overlapping rectangles forming a +
// Horizontal arm
ctx.fillRect(x - armLength/2, y - armWidth/2, armLength, armWidth)
// Vertical arm
ctx.fillRect(x - armWidth/2, y - armLength/2, armWidth, armLength)
```

---

## 7. Event Flow

### Telegraph Flow

```
enemy._bossState enters 'windup'
  └─► MovementSystem reads enemy.attacks[i].trigger === 'on_state_enter:windup'
      └─► MovementSystem calls telegraphSystem.spawn(attack.telegraph)
          └─► TelegraphSystem creates instance, emits 'telegraphSpawn'
              └─► AudioManager plays windupSound

telegraphSystem.update(dt) each frame
  └─► elapsed += dt
  └─► if elapsed >= windupDuration:
      └─► telegraphSystem.resolve(telegraph)
          └─► if resolveDamage:
              └─► Deal damage to all entities within shape bounds
          └─► if postResolve (persistent hazard):
              └─► Convert telegraph to persistent hazard entity
          └─► emit 'telegraphResolve'
              └─► AudioManager plays resolveSound
              └─► FloatingTextSystem shows damage numbers
          └─► Remove telegraph from active list
```

### Boss Intro Flow

```
SpawnSystem._spawnBoss()
  └─► entityManager.create('enemy', bossData)
  └─► eventBus.emit('bossSpawn', { boss })
      └─► Game._onBossSpawn(boss):
          └─► if boss.enemyData.intro:
              └─► this.startBossIntro(boss.enemyData.intro)
                  └─► gameState.setState('bossIntro')
                  └─► gameLoop.paused = true
                  └─► inputManager._isPaused = true
                  └─► this.introOverlay = { ...introConfig, elapsed: 0 }
                  └─► audioManager.emit('bossIntro', introConfig)
                  └─► camera.shake(8, 0.5)

Game.update() — during 'bossIntro' state:
  └─► this.introOverlay.elapsed += dt
  └─► if elapsed >= totalDuration:
      └─► this.introOverlay = null
      └─► gameState.setState('playing')
      └─► gameLoop.paused = false
      └─► inputManager._isPaused = false
      └─► boss._bossState = 'chase'  // start boss AI
      └─► eventBus.emit('bossIntroComplete')

Game.render() — during 'bossIntro' state:
  └─► Still renders the game world (frozen)
  └─► this.renderer.render(entities, player)  // frozen frame
  └─► this.renderer.renderBossIntro(this.introOverlay)  // overlay on top
```

### Announcement Flow (Pre-Boss Warning)

```
Game.update() — checks bossConfig.announcement[]:
  └─► for each announcement where gameTime >= announcement.time:
      └─► if !announcement._triggered:
          └─► announcement._triggered = true
          └─► if type === 'text':
              └─► renderer.showAnnouncement(text, styling)
          └─► if type === 'dim':
              └─► renderer.startDimming(brightness, duration)
          └─► if type === 'boss_name':
              └─► renderer.showBossName(text, styling)  // pre-intro hype
```

---

## 8. Examples & Use Cases

### Example 1: Gravekeeper Charge (Existing, Refactored)

**Before (hardcoded):**
```javascript
// In MovementSystem._moveBoss()
boss._chargePath = {
  startX: boss.x, startY: boss.y,
  dirX: boss._chargeDir.x, dirY: boss._chargeDir.y,
  length: 600, width: boss.size * 4,
};
boss._bossState = 'windup';
```

**After (data-driven):**
```javascript
// In MovementSystem._moveBoss(), on state enter:
const chargeAttack = boss.enemyData.attacks.find(a => a.id === 'charge');
if (chargeAttack && boss._bossState === 'windup') {
  this.telegraphSystem.spawn({
    ...chargeAttack.telegraph,
    x: boss.x,
    y: boss.y,
    angle: Math.atan2(boss._chargeDir.y, boss._chargeDir.x),
    width: boss.size * 4,
    length: 600,
  });
}
```

### Example 2: Cave Falling Debris (New — Stage Event)

```javascript
// Stage event triggers on timer:
const debrisEvent = stage.environmentalEvents.find(e => e.id === 'falling_stalactites');
if (gameTime >= debrisEvent._nextTrigger) {
  const angle = Math.random() * Math.PI * 2;
  const dist = debrisEvent.telegraph.positionRange.minDist +
    Math.random() * (debrisEvent.telegraph.positionRange.maxDist - debrisEvent.telegraph.positionRange.minDist);
  this.telegraphSystem.spawn({
    ...debrisEvent.telegraph,
    x: player.x + Math.cos(angle) * dist,
    y: player.y + Math.sin(angle) * dist,
    radius: debrisEvent.telegraph.radius +
      (Math.random() * (debrisEvent.telegraph.randomizeRadius.max - debrisEvent.telegraph.randomizeRadius.min)),
  });
  debrisEvent._nextTrigger = gameTime + debrisEvent.trigger.interval +
    (Math.random() * debrisEvent.trigger.randomOffset);
}
```

### Example 3: Caster Ranged Attack Telegraph (New — Enemy Attack)

```json
{
  "id": "caster",
  "attacks": [
    {
      "id": "bolt",
      "trigger": "on_cooldown:3.0",
      "telegraph": {
        "templateId": "caster_bolt",
        "dynamicPosition": true,
        "positionSource": "entity_to_player_line"
      },
      "onResolve": {
        "type": "spawn_projectile",
        "speed": 150,
        "damage": 6,
        "visual": { "shape": "circle", "color": "#9B30FF" }
      }
    }
  ]
}
```

### Example 4: Boss Ground Pound (New — Phase 2)

The Gravekeeper's Phase 2 ground pound currently has data defined in `phases[1].groundPound` but is never triggered. With the telegraph system:

```json
{
  "id": "ground_pound",
  "trigger": "on_phase:2:cooldown:5.0",
  "telegraph": {
    "templateId": "ground_pound_circle",
    "radius": 80,
    "positionSource": "entity"
  },
  "onResolve": {
    "type": "aoe_damage",
    "radius": 80,
    "damage": 20,
    "knockback": 100,
    "spawnVfx": "ground_crack"
  }
}
```

### Example 5: Boss Introduction (The Gravekeeper)

```json
{
  "intro": {
    "bossName": "The Gravekeeper",
    "bossSubtitle": "Guardian of the Forgotten Dead",
    "bossImage": "boss_intro_gravekeeper",
    "totalDuration": 3.5,
    "dimColor": "rgba(0, 0, 0, 0.75)",
    "nameColor": "#FF4444",
    "subtitleColor": "#888888",
    "nameFontSize": 40,
    "subtitleFontSize": 18,
    "allowSkip": false,
    "introSound": "boss_intro_gravekeeper",
    "freezeEntities": true,
    "freezeProjectiles": true,
    "freezeSpawners": true
  }
}
```

---

## 9. Gaps, Conflicts & Questions

### Identified Gaps

**Gap 1: No boss intro image asset exists.**
The `boss.svg` in the SVG asset spec is the in-game sprite (56×56). A boss intro needs a larger, more dramatic portrait. This requires a new SVG asset: `boss_intro_gravekeeper.svg` (~200×200).
- **Action:** Add to `11_svg_asset_spec.md` as a new "boss intro portrait" category.

**Gap 2: No `persistent_hazard` entity type.**
The lava pool telegraph creates a hazard zone that persists after resolution. The current engine only has `enemy`, `player`, `projectile`, and `pickup` entity types. Persistent hazards need their own type with tick-based damage.
- **Action:** Add `hazard` entity type to EntityManager. Hazards are created by telegraphSystem on resolve, checked by CollisionSystem on each frame, and removed when their duration expires.

**Gap 3: TelegraphSystem collision with DamageSystem overlap.**
If both the TelegraphSystem AND DamageSystem deal damage on the same frame, a player could take double damage from the same source.
- **Action:** TelegraphSystem damage should use `iFrames` like entity damage does. Apply 0.5s iFrames after telegraph resolve damage.

**Gap 4: No telegraph VFX beyond shapes.**
The telegraph spec covers shapes and flickering, but "falling debris" should have a shadow that grows as the rock approaches. "Lava" should bubble. These require additional VFX layers.
- **Action:** Add optional `vfx` field to telegraph config. Support `shadow` (growing dark circle), `particles` (particle emitter during windup), and `screen_tint` (color wash over the screen). Defer full VFX system to a later version — start with shapes only.

**Gap 5: Boss intro during level-up overlap.**
If a boss spawns during a level-up screen, the intro should wait until the level-up is resolved.
- **Action:** Queue the boss intro. If `gameState === 'levelUp'` when boss spawns, queue the intro and trigger it after the upgrade is selected.

**Gap 6: Skip button for boss intro on mobile.**
The `allowSkip` flag implies a skip button, but mobile has no keyboard. Need a tap-to-skip mechanism.
- **Action:** Show "Tap to skip" text during intro when `allowSkip === true`. Any tap dismisses the overlay.

**Gap 7: Environmental event spawning near off-screen areas.**
If `random_near_player` places a telegraph far from the camera edge, the player might not see the warning.
- **Action:** Clamp telegraph positions to be within 1.5× the camera viewport. If the telegraph center would be off-screen, re-roll the position.

### Identified Conflicts

**Conflict 1: TelegraphSystem update order vs. existing boss state machine.**
Currently `MovementSystem._moveBoss()` manages the entire boss state machine including telegraph spawning. With TelegraphSystem, who owns the state machine?
- **Resolution:** MovementSystem still owns the boss state machine (chase/windup/charge/pause). TelegraphSystem is a dumb renderer+damage-dealer. MovementSystem tells TelegraphSystem "spawn this telegraph here" and "this telegraph just resolved, apply charge_rush." Clean separation of concerns.

**Conflict 2: Multiple telegraphs from the same source.**
If a boss has both a ground pound AND a charge, two telegraphs could overlap on the player.
- **Resolution:** Each telegraph is independent. The player must dodge both. This is intentional — later bosses will layer telegraphs for challenge. No conflict, just a design consideration.

**Conflict 3: TelegraphSystem.render() vs. Renderer.render().**
Where does telegraph rendering live?
- **Resolution:** TelegraphSystem has its own `render(ctx, camera)` method, but it's CALLED by Renderer.render() at the appropriate point in the pipeline (after grid, before entities). The Renderer is responsible for draw ordering; TelegraphSystem is responsible for draw calls.

### Open Questions

**Q1: Should telegraphs deal damage automatically or require manual collision checks?**
- Option A: TelegraphSystem checks all player entities against active telegraph shapes on resolve. Automatic.
- Option B: TelegraphSystem emits an event; DamageSystem handles the actual damage application. Decoupled.
- **Recommendation:** Option A. Simpler, faster, and the damage is always tied to the telegraph shape. No risk of event ordering bugs.

**Q2: Should persistent hazards (lava pools) use the entity system or be managed entirely by TelegraphSystem?**
- Option A: Hazards are entities (type: 'hazard') managed by EntityManager. CollisionSystem checks them.
- Option B: Hazards are managed internally by TelegraphSystem. It tracks active hazards and checks collisions itself.
- **Recommendation:** Option A. Entities are the standard way to represent things in the game world. CollisionSystem already handles entity-player collisions. Adding a `hazard` type is clean and consistent.

**Q3: How many concurrent telegraphs should the engine support?**
- Performance concern: drawing 20+ semi-transparent shapes with flicker animations every frame.
- **Recommendation:** Cap at 10 active telegraphs. If a new telegraph spawns and the cap is reached, remove the oldest one. In practice, rarely more than 3-5 will be active simultaneously.

**Q4: Should the boss intro overlay be canvas-rendered or DOM-based?**
- Canvas: Consistent with the game, but harder to do text layout and image scaling.
- DOM: Easy text/image handling, but a separate rendering layer.
- **Recommendation:** Canvas. The game is a single HTML file. Adding DOM elements for the intro would break the canvas-only approach. Canvas text rendering with `ctx.fillText()` and `ctx.drawImage()` is sufficient for a simple overlay.

**Q5: Should the announcement system (pre-boss text) be separate from the intro system?**
The stage JSON already has `bossConfig.announcement[]` with timed text events. The boss intro is a new system. Are they the same thing?
- **Recommendation:** Keep them separate but complementary. Announcements happen BEFORE the boss spawns (e.g., "Something stirs..." at 3:50). The intro happens AFTER the boss spawns (e.g., "THE GRAVEKEEPER" overlay at 4:00). Announcements build tension; the intro delivers the payoff.

---

## 10. Implementation Priority

| Phase | What | Estimated Lines | Dependencies |
|---|---|---|---|
| **Phase 1** | TelegraphSystem class (spawning, timer, resolution) | ~120 | None |
| **Phase 2** | Rectangle + circle shape rendering | ~80 | Phase 1 |
| **Phase 3** | Refactor boss charge to use TelegraphSystem | ~40 changes | Phase 1+2 |
| **Phase 4** | Cone, line, ring, cross shape rendering | ~60 | Phase 2 |
| **Phase 5** | Boss intro sequence (pause, overlay, resume) | ~100 | None (can be parallel) |
| **Phase 6** | Announcement system (pre-boss text events) | ~60 | Phase 5 |
| **Phase 7** | Stage environmental events (debris, lava) | ~80 | Phase 1+2 |
| **Phase 8** | Hazard entity type + collision integration | ~50 | Phase 7 |
| **Phase 9** | Audio integration (telegraph sounds, intro music) | ~30 | AudioManager |
| **Total** | | **~620 new lines** | |

### Content File Changes

| File | Change | Lines Added |
|---|---|---|
| `content/mechanics.json` | Add `telegraphTemplates[]` (6 templates) | ~80 |
| `content/enemies.json` | Add `attacks[]` and `intro` to boss data | ~40 |
| `content/stages.json` | Add `environmentalEvents[]` to stage data | ~30 |
| `content/audio_config.json` | Add telegraph and intro sound events | ~20 |
| `11_svg_asset_spec.md` | Add boss intro portrait spec | ~15 |

---

*Attack Telegraph & Boss Intro Spec v1.0 — Generated August 24, 2026*
