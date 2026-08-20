# Modularity Engine — Implementation Plan

> **Version:** 1.0 (Prototype)
> **Date:** 2026-08-20
> **Purpose:** Step-by-step implementation sequence for the V1 prototype
> **Source:** All 10 spec files, simulation report, test results

---

## Table of Contents

1. [Implementation Overview](#1-implementation-overview)
2. [System Dependency Map](#2-system-dependency-map)
3. [Implementation Phases](#3-implementation-phases)
4. [Phase 1: Core Infrastructure](#4-phase-1-core-infrastructure)
5. [Phase 2: Game Loop & Camera](#5-phase-2-game-loop--camera)
6. [Phase 3: Input System](#6-phase-3-input-system)
7. [Phase 4: Entity Management](#7-phase-4-entity-management)
8. [Phase 5: Spawn System](#8-phase-5-spawn-system)
9. [Phase 6: Movement System](#9-phase-6-movement-system)
10. [Phase 7: Collision System](#10-phase-7-collision-system)
11. [Phase 8: Weapon System](#11-phase-8-weapon-system)
12. [Phase 9: Damage System](#12-phase-9-damage-system)
13. [Phase 10: Pickup System](#13-phase-10-pickup-system)
14. [Phase 11: Leveling System](#14-phase-11-leveling-system)
15. [Phase 12: Rendering](#15-phase-12-rendering)
16. [Phase 13: UI System](#16-phase-13-ui-system)
17. [Phase 14: Audio System](#17-phase-14-audio-system)
18. [Phase 15: Integration & Testing](#18-phase-15-integration--testing)
19. [Prompt Sequence](#19-prompt-sequence)

---

## 1. Implementation Overview

The prototype is a single HTML5 file with zero external dependencies. All code is written in TypeScript (transpiled to JavaScript) and all assets are procedurally generated.

**Build target:** Single `index.html` file containing:
- Inline `<script>` with all game code
- Inline `<style>` for minimal CSS
- Canvas element for rendering
- No external libraries, no bundler, no npm

**System execution order (from Spec 01 §2):**

```
1. InputManager        — Capture click/tap targets, WASD/arrow state
2. MovementSystem      — Process player pathfinding, enemy movement
3. WeaponSystem        — Tick cooldowns, auto-fire, create projectiles
4. CollisionSystem     — AABB checks across all collision layers
5. DamageSystem        — Apply damage, crits, knockback, invincibility
6. EntityManager       — Destroy dead entities, recycle to pool
7. SpawnSystem         — Read wave timeline, instantiate enemies
8. PickupSystem        — Magnet attraction, collection, power-up activation
9. LevelingSystem      — XP threshold checks, trigger level-up overlay
10. AudioManager       — Process sound triggers from this frame's events
11. UIManager          — Update HUD values, damage numbers
12. CameraEffects      — Apply screen shake
13. Camera             — Smooth lerp to player position
```

---

## 2. System Dependency Map

```
                    ┌─────────────┐
                    │  EventBus   │ ← All systems communicate through this
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  DataManager│   │ GameLoop  │   │ GameState │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │                │                │
          │         ┌──────▼──────┐         │
          │         │   Camera    │         │
          │         └──────┬──────┘         │
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │ SpawnSystem│   │InputManager│   │UIManager  │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │                │                │
          │         ┌──────▼──────┐         │
          │         │MovementSystem│        │
          │         └──────┬──────┘         │
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │EntityManager│  │WeaponSystem│  │AudioManager│
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │                │                │
          │         ┌──────▼──────┐         │
          │         │CollisionSystem│        │
          │         └──────┬──────┘         │
          │                │                │
          │         ┌──────▼──────┐         │
          │         │DamageSystem │         │
          │         └──────┬──────┘         │
          │                │                │
          │         ┌──────▼──────┐         │
          │         │ PickupSystem│         │
          │         └──────┬──────┘         │
          │                │                │
          │         ┌──────▼──────┐         │
          │         │LevelingSystem│        │
          │         └─────────────┘         │
```

**Key dependency rules:**
- Systems communicate ONLY through EventBus (no direct imports)
- DataManager loads all JSON before game starts
- EntityManager manages all entity creation/destruction
- CollisionSystem feeds into DamageSystem and PickupSystem
- LevelingSystem triggers UIManager level-up overlay

---

## 3. Implementation Phases

| Phase | Name | Systems | Depends On | Est. Complexity |
|---|---|---|---|---|
| 1 | Core Infrastructure | EventBus, DataManager, GameState | None | Low |
| 2 | Game Loop & Camera | GameLoop, Camera | Core | Low |
| 3 | Input System | InputManager | Core | Low |
| 4 | Entity Management | EntityManager | Core | Medium |
| 5 | Spawn System | SpawnSystem | Core, EntityManager | Medium |
| 6 | Movement System | MovementSystem | Core, InputManager, EntityManager | Medium |
| 7 | Collision System | CollisionSystem | Core, EntityManager | Medium |
| 8 | Weapon System | WeaponSystem | Core, EntityManager, CollisionSystem | High |
| 9 | Damage System | DamageSystem | Core, CollisionSystem, EntityManager | Medium |
| 10 | Pickup System | PickupSystem | Core, EntityManager, CollisionSystem | High |
| 11 | Leveling System | LevelingSystem | Core, DataManager, PickupSystem | Medium |
| 12 | Rendering | Renderer, CameraEffects | Core, EntityManager, Camera | High |
| 13 | UI System | UIManager | Core, GameState, LevelingSystem | High |
| 14 | Audio System | AudioManager | Core, EventBus | High |
| 15 | Integration | Full Game Loop | All | High |

---

## 4. Phase 1: Core Infrastructure

**Goal:** Set up the foundational systems that everything else depends on.

**Systems:** EventBus, DataManager, GameState

### Step 1.1: EventBus

**Source:** `01_engine_architecture.md` §3 Event Bus

**Responsibilities:**
- Central event routing system
- `on(event, callback)` — subscribe to events
- `off(event, callback)` — unsubscribe
- `emit(event, data)` — fire event to all listeners
- Event queue to prevent re-entrancy

**Events to implement (from Spec 01):**
- `damage` — damage dealt to entity
- `death` — entity killed
- `pickup` — item collected
- `levelUp` — player leveled up
- `bossSpawn` — boss appeared
- `bossDeath` — boss killed
- `screenWipe` — screen wipe activated
- `gameOver` — game ended (victory/survived/defeat)
- `pause` — game paused/unpaused
- `weaponLevelUp` — weapon leveled up
- `magnetActivate` — magnet activated
- `bossAnnounce` — boss announcement text
- `areaPulse` — area damage pulse
- `obstacleHit` — entity hit obstacle

**Test:** Verify events fire and listeners receive correct data.

### Step 1.2: DataManager

**Source:** `01_engine_architecture.md` §6 Data Loading

**Responsibilities:**
- Load 6 JSON files from `content/` directory
- Validate schema on load
- Provide typed access to game data
- Handle load errors gracefully

**Files to load:**
1. `content/characters.json`
2. `content/weapons.json`
3. `content/enemies.json`
4. `content/stages.json`
5. `content/pickups.json`
6. `content/leveling.json`

**Test:** Load all 6 files, verify data is accessible.

### Step 1.3: GameState

**Source:** `01_engine_architecture.md` §7 Scene/State Management

**Responsibilities:**
- State machine with 5 states: `title`, `playing`, `levelUp`, `paused`, `gameOver`
- State transitions with validation
- End state tracking (victory/survived/defeat)
- Pause/unpause handling

**State transitions:**
```
title → playing (on start)
playing → levelUp (on level up)
levelUp → playing (on upgrade selected)
playing → paused (on ESC/tap pause)
paused → playing (on resume)
playing → gameOver (on death/timer/boss kill)
gameOver → title (on quit)
gameOver → playing (on restart)
```

**Test:** Verify all valid transitions work, invalid transitions rejected.

**Phase 1 Test:** All 3 systems initialize, EventBus routes events, DataManager loads JSON, GameState transitions correctly.

---

## 5. Phase 2: Game Loop & Camera

**Goal:** Establish the fixed-timestep update/render cycle and camera following.

**Systems:** GameLoop, Camera

### Step 2.1: GameLoop

**Source:** `01_engine_architecture.md` §1 Game Loop

**Responsibilities:**
- Fixed-timestep update at 60 FPS (16.67ms per tick)
- Interpolation for smooth rendering between updates
- System execution in correct order (13 systems)
- Pause support (skip updates when paused)
- Frame counter and delta time tracking

**System order:**
```
1. InputManager
2. MovementSystem
3. WeaponSystem
4. CollisionSystem
5. DamageSystem
6. EntityManager
7. SpawnSystem
8. PickupSystem
9. LevelingSystem
10. AudioManager
11. UIManager
12. CameraEffects
13. Camera
```

**Test:** Game loop runs at 60 FPS, systems execute in order.

### Step 2.2: Camera

**Source:** `01_engine_architecture.md` §8 Camera Effects

**Responsibilities:**
- Follow player with smooth lerp (0.1 factor)
- Stay within arena bounds (800×600 minimum)
- HiDPI support (devicePixelRatio)
- Screen shake effect (0.5s, medium intensity)

**Test:** Camera follows player smoothly, stays in bounds.

**Phase 2 Test:** Game loop runs, camera follows player, shake works.

---

## 6. Phase 3: Input System

**Goal:** Handle mouse/touch click-to-move and WASD/arrow keyboard input.

**Systems:** InputManager

### Step 3.1: InputManager

**Source:** `01_engine_architecture.md` §19 Additional Systems Notes + `vs_plan.md` click-to-move requirement

**Responsibilities:**
- Primary: Click/tap-to-move (mouse position → player target)
- Secondary: WASD/arrow keys (direct movement)
- Touch device detection
- Input state tracking (current target, keys pressed)
- Coordinate transformation (screen → world space)
- Pause button detection (ESC key, top-right tap)

**Input modes:**
- Desktop: Mouse click sets target, WASD overrides
- Mobile: Tap sets target, no virtual joystick

**Test:** Click moves player to target, WASD moves player directly.

**Phase 3 Test:** Input works on both desktop and mobile layouts.

---

## 7. Phase 4: Entity Management

**Goal:** Create, destroy, and recycle game entities using object pooling.

**Systems:** EntityManager

### Step 4.1: EntityManager

**Source:** `01_engine_architecture.md` §2 Entity System

**Responsibilities:**
- Entity creation with unique IDs
- Entity destruction (mark for cleanup)
- Object pooling for performance
- Entity iteration (for systems to process)
- Entity type tracking (player, enemy, projectile, pickup, obstacle)
- Entity stats management

**Entity types:**
- `player` — The survivor character
- `enemy` — Zombies, bats, skeletons, ghosts, casters
- `boss` — The Gravekeeper
- `projectile` — W1 projectiles
- `orb` — W2 orbiting orbs
- `pickup` — XP gems, gold coins, power-ups
- `obstacle` — Tombstones, walls, etc.

**Pool sizes:**
- Enemies: 200 max
- Projectiles: 500 max
- Pickups: 500 max

**Test:** Create/destroy entities, verify pool recycling works.

**Phase 4 Test:** EntityManager handles 200+ entities without performance issues.

---

## 8. Phase 5: Spawn System

**Goal:** Spawn enemies based on wave timeline and composition weights.

**Systems:** SpawnSystem

### Step 5.1: SpawnSystem

**Source:** `05_stages_spec.md` §4 Spawn Rate Formula

**Responsibilities:**
- Read wave timeline from stages.json
- Spawn enemies at correct rates
- Respect per-bracket max enemies
- Spawn from correct distance (400–600px from player)
- Stop spawning when cap reached (no despawn)
- Boss spawn at 4:00 with announcement sequence
- Enemy composition weights per time bracket

**Spawn formula:**
```
spawnRate = baseRate × (1 + 0.4 × floor(time / 30))
spawnRate = min(spawnRate, spawnRateCap)  // Cap at 3.0
```

**Wave brackets (from stages.json):**
| Time | Rate | Max | Types |
|---|---|---|---|
| 0:00–0:30 | 0.8 | 25 | Zombie |
| 0:30–1:00 | 1.2 | 40 | Zombie |
| 1:00–1:30 | 1.5 | 60 | Zombie, Bat |
| ... | ... | ... | ... |
| 4:00–4:30 | 2.0 | 150 | All + Boss |

**Test:** Enemies spawn at correct rates, composition matches weights.

**Phase 5 Test:** Full 5-minute spawn timeline works correctly.

---

## 9. Phase 6: Movement System

**Goal:** Handle player pathfinding to click target and enemy movement.

**Systems:** MovementSystem

### Step 6.1: MovementSystem

**Source:** `01_engine_architecture.md` §8 Movement

**Responsibilities:**
- Player: Pathfind to click/tap target
- Player: WASD/arrow direct movement
- Enemies: Chase player (zombies, skeletons)
- Enemies: Swarm behavior (bats)
- Enemies: Wander → chase (ghosts)
- Enemies: Ranged maintain distance (casters)
- Boss: Charge toward player
- Obstacle collision response
- Movement normalization (diagonal movement)

**Player movement:**
- Speed: 200 px/s (from characters.json)
- Target: Click/tap position
- Pathfinding: Simple direct movement (no A* for V1)

**Enemy movement patterns:**
- `chase` — Move directly toward player
- `swarm` — Erratic movement toward player
- `wander_chase` — Random drift, then lock onto player
- `ranged` — Maintain distance, fire projectiles
- `boss_charge` — Charge in straight lines

**Test:** Player moves to click target, enemies chase correctly.

**Phase 6 Test:** Player and all enemy types move correctly.

---

## 10. Phase 7: Collision System

**Goal:** Detect and respond to collisions between entities.

**Systems:** CollisionSystem

### Step 7.1: CollisionSystem

**Source:** `01_engine_architecture.md` §4 Collision System

**Responsibilities:**
- AABB collision detection
- Collision layers (5 layers)
- Collision pairs (10 pairs)
- Obstacle collision (player + enemies collide, projectiles + pickups pass)
- Pickup collection (proximity-based, 50px radius)
- Ghost through obstacles (phase ability)
- Boss through obstacles

**Collision layers:**
1. Player
2. Enemy
3. Projectile (player)
4. Pickup
5. Obstacle

**Collision pairs:**
1. Player ↔ Enemy (damage on contact)
2. Player ↔ Projectile (enemy) (damage on contact)
3. Player ↔ Pickup (collection)
4. Player ↔ Obstacle (collision response)
5. Enemy ↔ Projectile (player) (damage on hit)
6. Enemy ↔ Orb (damage on contact)
7. Enemy ↔ Obstacle (collision response)
8. Orb ↔ Enemy (damage on contact)
9. Projectile (player) ↔ Obstacle (pass through)
10. Pickup ↔ Obstacle (pass through)

**Test:** Collisions detected correctly, responses applied.

**Phase 7 Test:** All collision pairs work, obstacles block correctly.

---

## 11. Phase 8: Weapon System

**Goal:** Handle weapon cooldowns, targeting, and projectile/orb/pulse creation.

**Systems:** WeaponSystem

### Step 8.1: WeaponSystem

**Source:** `03_weapons_spec.md` + `10_json_schemas.md` weapons.json

**Responsibilities:**
- Tick weapon cooldowns
- Auto-fire when cooldown ready
- W1: Fire projectile toward nearest enemy
- W2: Maintain orbiting orbs around player
- W3: Pulse damage in radius around player
- Weapon level-up application
- Power spike activation (L4, L7)
- Pierce mechanics (W1 L4+)
- Split mechanics (W1 L7)
- Afterimage trails (W2 L7)
- Double/triple pulse (W3 L4+/L7)

**Weapon stats (from weapons.json):**
- W1 Level 1: damage=8, cooldown=1.00s, projectiles=1
- W2 Level 1: damage=5, cooldown=2.00s, orbs=2, radius=80px
- W3 Level 1: damage=12, cooldown=2.50s, radius=80px, pulses=1

**Power spikes:**
- W1 L4: Pierce +1 enemy (75% damage)
- W1 L7: Split into 3 projectiles (50% damage)
- W2 L4: +50% radius, +1 orb
- W2 L7: Afterimage trails (30% damage, 0.5s)
- W3 L4: Double pulse (0.3s apart)
- W3 L7: Triple pulse + stun (1.0s)

**Test:** Weapons fire correctly, level-ups apply, power spikes work.

**Phase 8 Test:** All 3 weapons work at all 7 levels with power spikes.

---

## 12. Phase 9: Damage System

**Goal:** Apply damage, critical hits, knockback, and invincibility frames.

**Systems:** DamageSystem

### Step 9.1: DamageSystem

**Source:** `01_engine_architecture.md` §7 Damage System

**Responsibilities:**
- Damage calculation: `max(1, attacker.damage - defender.armor)`
- Critical hit check: `random() < critChance ? damage × critMultiplier : damage`
- Knockback on hit
- Invincibility frames (0.5s after hit)
- iFrame blink animation
- Orb damage cooldown (0.5s per enemy)
- Screen wipe damage to boss (200, 80% resistance)

**Damage formula:**
```
baseDamage = attacker.damage
critDamage = random() < critChance ? baseDamage × critMultiplier : baseDamage
finalDamage = max(1, critDamage - defender.armor)
```

**Invincibility frames:**
- Duration: 0.5s (500ms)
- Visual: Blink effect (50% opacity)
- Applied after any hit

**Test:** Damage calculation correct, crits work, iFrames prevent double-hit.

**Phase 9 Test:** Full damage pipeline works with all modifiers.

---

## 13. Phase 10: Pickup System

**Goal:** Handle item drops, magnet attraction, and power-up activation.

**Systems:** PickupSystem

### Step 10.1: PickupSystem

**Source:** `06_pickups_and_powerups_spec.md` + `10_json_schemas.md` pickups.json

**Responsibilities:**
- Drop items on enemy death
- Drop rate rolls (weaponUp > screenWipe > magnet > nothing)
- Gold coin scatter (±30px)
- Proximity collection (50px base range)
- Magnet attraction (350px radius, 400 px/s)
- Magnet instant burst (150px)
- Magnet override (all pickups use 350px during magnet)
- Screen wipe activation (kill all enemies, 200 damage to boss)
- Weapon level-up power-up (1–3 random weapons)
- Pickup float animation (±2px oscillation)
- Pickup despawn (30s for gold, null for power-ups)

**Drop rates (from pickups.json):**
| Enemy | Weapon Up | Screen Wipe | Magnet |
|---|---|---|---|
| Zombie | 1% | — | — |
| Bat | — | — | 5% |
| Skeleton | 1% | 2% | — |
| Ghost | 1% | — | 5% |
| Caster | 1% | 2% | — |
| Boss | 100% | — | — |

**Power-ups:**
- Screen Wipe: Kills all enemies, 200 damage to boss
- Magnet: 350px attraction for 10s
- Weapon Level-Up: 1–3 random weapons gain a level

**Test:** Drops work, magnet attracts, screen wipe clears enemies.

**Phase 10 Test:** Full pickup economy works correctly.

---

## 14. Phase 11: Leveling System

**Goal:** Track XP, trigger level-ups, and apply upgrades.

**Systems:** LevelingSystem

### Step 11.1: LevelingSystem

**Source:** `07_leveling_system_spec.md` + `10_json_schemas.md` leveling.json

**Responsibilities:**
- Track player XP
- Check XP thresholds from leveling.json
- Trigger level-up overlay
- Handle multi-level XP carryover
- Max queue 3 level-ups
- Upgrade pool generation (60% weapon, 40% passive)
- Weapon unlock guaranteed until picked
- Passive boost application
- Max Health passive heals current HP
- Level-up screen pause

**XP curve (from leveling.json):**
| Level | XP to Next | Cumulative |
|---|---|---|
| 1→2 | 5 | 5 |
| 2→3 | 10 | 15 |
| 3→4 | 15 | 30 |
| ... | ... | ... |
| 13→14 | 375 | 1411 |
| 14+ | floor(375 × 1.3^(N-14)) | — |

**Upgrade pool rules:**
- Weapon upgrades: 60% weight
- Passive boosts: 40% weight
- Weapon unlocks: GUARANTEED until picked
- Max level weapons excluded
- Max stack passives excluded

**Passive boosts (from leveling.json):**
| Boost | Value | Max Stacks |
|---|---|---|
| Max Health +20% | +20 HP | 5 |
| Move Speed +10% | +20 px/s | 3 |
| Armor +1 | +1 flat | 3 |
| Pickup Range +25px | +25px | 4 |
| Crit Chance +5% | +5% | 4 |

**Test:** XP tracking works, level-ups trigger, upgrades apply correctly.

**Phase 11 Test:** Full leveling system works with all upgrades.

---

## 15. Phase 12: Rendering

**Goal:** Render all game entities and effects using Canvas 2D.

**Systems:** Renderer, CameraEffects

### Step 12.1: Renderer

**Source:** `01_engine_architecture.md` §5 Rendering + `vs_colors.md`

**Responsibilities:**
- Canvas 2D context
- Draw order: background → obstacles → entities (y-sort) → projectiles → pickups → UI overlay
- Entity rendering by shape and color
- HiDPI support (devicePixelRatio)
- Background grid rendering
- Entity glow effects
- Damage number floating text
- Floating gold text

**Entity visuals (from vs_colors.md):**
| Entity | Shape | Color | Size |
|---|---|---|---|
| Player | Square | #FFD700 | 24px |
| Zombie | Square | #2D5A27 | 20px |
| Bat | Square | #1A1A2E | 16px |
| Skeleton | Square | #8B1A1A | 24px |
| Ghost | Square | #4A1A6B | 24px |
| Caster | Square | #1A4A4A | 26px |
| Boss | Square | #4A0000 | 56px |
| XP Small | Diamond | #4FC3F7 | 8px |
| XP Large | Diamond | #81D4FA | 14px |
| Gold Coin | Circle | #FFD700 | 10px |
| Screen Wipe | Star | #00E676 | 16px |
| Magnet | Circle | #FF4081 | 14px |
| Weapon Up | Triangle | #FF9100 | 16px |

**Test:** All entities render correctly with correct shapes and colors.

### Step 12.2: CameraEffects

**Source:** `01_engine_architecture.md` §8 Camera Effects

**Responsibilities:**
- Screen shake on events
- Shake intensity levels (light/medium/heavy)
- Shake duration (0.3–0.5s)

**Shake triggers:**
- Boss spawn: 0.5s, medium
- Screen wipe: 0.3s, light
- Boss death: 0.5s, heavy
- Low HP (<25%): 0.3s, light
- Boss ground pound: 0.3s, heavy

**Test:** Screen shake works on all triggers.

**Phase 12 Test:** Full rendering pipeline works, all entities visible.

---

## 16. Phase 13: UI System

**Goal:** Render HUD, level-up screen, end screens, and pause menu.

**Systems:** UIManager

### Step 13.1: UIManager

**Source:** `08_ui_hud_spec.md`

**Responsibilities:**
- HUD rendering (HP, level, gold, EXP bar, weapon panel, timer)
- Level-up screen (3 cards, keyboard 1-2-3, touch tap)
- End screens (Victory/Survived/Defeat with stats)
- Pause menu (Resume/Restart/Quit)
- Damage numbers (white/yellow/red)
- Floating gold text (+Ng)
- Boss health bar
- Responsive layout (800×600 min, touch targets 44×44px)

**HUD elements:**
| Element | Position | Size |
|---|---|---|
| HP bar | Top-left | 200×16px |
| Level | Top-center-right | 32×32 circle |
| Gold | Top-right | Coin icon + numeric |
| EXP bar | Bottom, full width | 100% width |
| Weapon panel | Bottom-left | Per-weapon icons |
| Timer | Top-center | "MM:SS" format |
| Boss HP bar | Top-center, below timer | Fades in at boss spawn |

**Level-up screen:**
- 3 cards (200×280px each)
- Semi-transparent overlay (60% opacity)
- Game pauses fully
- Selection effects (scale, glow)

**End screens:**
- Victory: "VICTORY" gold text, +100g bonus, confetti
- Survived: "SURVIVED" white text
- Defeat: "DEFEATED" red text, 20% red tint

**Test:** All UI elements render correctly, interactions work.

**Phase 13 Test:** Full UI system works with all screens.

---

## 17. Phase 14: Audio System

**Goal:** Play procedural sounds using Web Audio API.

**Systems:** AudioManager

### Step 14.1: AudioManager

**Source:** `09_audio_spec.md`

**Responsibilities:**
- Web Audio API initialization
- Browser unlock (AudioContext.resume on first click)
- SFX playback (16 concurrent slots)
- Music playback (1 dedicated slot)
- Sound priority system (10 levels)
- Ducking rules (high-priority, boss, level-up)
- Distance-based audio (4 tiers)
- Payout Triad engine (C Major scale, combo stepping)
- Music layer system (9 instruments, 12 time-based configurations)
- Crossfade implementation

**SFX (25 sounds):**
- Weapon: w1_fire, w2_hum, w3_pulse, weapon_hit
- Enemy: zombie_kill, bat_kill, skeleton_kill, ghost_kill, caster_kill, caster_projectile, boss_charge, boss_ground_pound, boss_death
- Pickup: xp_small, xp_large, gold_coin, powerup_collect, levelup, screenwipe, magnet_hum
- Player: player_hurt, player_death
- UI: ui_click, boss_warning, boss_spawn

**Music layers:**
- Pad, Bass, Drums (kick/hi-hat/snare), Lead, Strings, Brass, Piano
- 12 time-based configurations (0:00 → 5:00)

**Payout Triad:**
- C Major scale (C5–C6): 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50 Hz
- Combo stepping: advance index, reset after 0.6s gap
- Micro-tuning jitter: ±15 Hz
- Volume decoupling: gain 0.08–0.12

**Test:** All sounds play correctly, music layers work.

**Phase 14 Test:** Full audio system works with all sounds and music.

---

## 18. Phase 15: Integration & Testing

**Goal:** Connect all systems and verify the complete game works.

### Step 15.1: Game Initialization

**Responsibilities:**
- Load all JSON files
- Initialize all systems
- Set up EventBus subscriptions
- Create player entity
- Start game loop

**Boot sequence:**
1. Create AudioContext (suspended)
2. Load 6 JSON files via DataManager
3. Initialize all systems
4. Create player entity
5. Wait for first click/tap
6. Resume AudioContext
7. Start game loop

### Step 15.2: Full Game Loop Test

**Test scenarios:**
1. Boot → Title screen → Click to start
2. 0:00–0:30: Zombies spawn, W1 fires, kills happen
3. 0:05: First level-up, upgrade selection
4. 0:15: W2 unlock, orbit orbs appear
5. 1:00: Bats arrive, sound density increases
6. 1:15: W3 unlock, area pulses
7. 2:00: W1 hits L4 (pierce), power spike feels good
8. 2:30: Ghosts arrive, new enemy sound
9. 3:00: Casters arrive, projectiles fly
10. 3:30: W1 hits L7 (split), room-clearing
11. 3:50: Boss warning, music cuts
12. 3:55: Camera shake, "The Gravekeeper rises!"
13. 4:00: Boss spawns, boss health bar appears
14. 4:15: Boss killed, victory sting
15. 4:15: Victory screen with stats

### Step 15.3: Edge Case Testing

**Edge cases to test:**
- Player dies mid-level-up
- Boss spawns during level-up pause
- Screen wipe during boss fight
- Magnet pickup with 500+ items on screen
- All weapons maxed, all passives maxed
- Excess XP from boss kill (50 XP at Level 9)
- Tab away and return (AudioContext re-suspend)
- Mobile touch input
- Resize window during gameplay

### Step 15.4: Performance Testing

**Performance targets:**
- 60 FPS with 200 enemies + 50 projectiles + 500 pickups
- No memory leaks from entity pooling
- Audio latency < 50ms
- Load time < 2s

**Test:** Run full 5-minute game, verify performance stays stable.

---

## 19. Prompt Sequence

Each phase corresponds to one implementation prompt. The prompts are designed to be self-contained — each one builds on the previous but can be understood independently.

| Prompt | Phase | Deliverable | Key Systems |
|---|---|---|---|
| 1 | Core Infrastructure | EventBus, DataManager, GameState | EventBus, DataManager, GameState |
| 2 | Game Loop & Camera | GameLoop, Camera | GameLoop, Camera |
| 3 | Input System | InputManager | InputManager |
| 4 | Entity Management | EntityManager | EntityManager |
| 5 | Spawn System | SpawnSystem | SpawnSystem |
| 6 | Movement System | MovementSystem | MovementSystem |
| 7 | Collision System | CollisionSystem | CollisionSystem |
| 8 | Weapon System | WeaponSystem | WeaponSystem |
| 9 | Damage System | DamageSystem | DamageSystem |
| 10 | Pickup System | PickupSystem | PickupSystem |
| 11 | Leveling System | LevelingSystem | LevelingSystem |
| 12 | Rendering | Renderer, CameraEffects | Renderer, CameraEffects |
| 13 | UI System | UIManager | UIManager |
| 14 | Audio System | AudioManager | AudioManager |
| 15 | Integration | Full Game | All systems |

**Prompt format:**
Each prompt includes:
1. **Goal** — What to build
2. **Source specs** — Which spec files to reference
3. **Systems** — Which systems to implement
4. **Interface** — Public API for the system
5. **Dependencies** — What other systems it needs
6. **Test** — How to verify it works
7. **Integration** — How it connects to the game loop

---

## Appendix A: Pitfalls Review Reference

**CRITICAL:** Before implementing any phase, read `pitfalls_review.md` and apply all safeguards.

### Mandatory Checks Per Phase

| Phase | Key Pitfalls | Safeguard |
|---|---|---|
| 1 (Core) | P2 (Event re-entrancy), P10 (State transitions) | Queue events, validate transitions |
| 2 (GameLoop) | P1 (Timer drift), P7 (Delta time clamping) | Integer frame counters, clamp to 33ms |
| 3 (Input) | P8 (Float confusion) | Round coordinates for canvas |
| 4 (Entities) | P3 (Pool exhaustion), P6 (Mutation during iteration) | Check pool.get(), backward iteration |
| 5 (Spawn) | P1 (Timer drift), P3 (Pool exhaustion) | Frame counters, cap enforcement |
| 6 (Movement) | P7 (Delta time), P9 (Tunneling) | Clamp delta, sweep collision |
| 7 (Collision) | P9 (Tunneling), P15 (AABB formula) | Sweep for fast objects, standard AABB |
| 8 (Weapons) | P4 (Division by zero), P3 (Pool exhaustion) | Guard divisions, projectile limits |
| 9 (Damage) | P4 (Division by zero), P5 (Null references) | Safe division, null checks |
| 10 (Pickups) | P6 (Mutation), P1 (Timer drift) | Separate cleanup, frame counters |
| 11 (Leveling) | P5 (Null references), P10 (State transitions) | Null checks, valid transitions |
| 12 (Rendering) | P14 (Context leaks), P8 (Float confusion) | Save/restore, Math.round() |
| 13 (UI) | P10 (State transitions), P12 (Missing cleanup) | State validation, full restart |
| 14 (Audio) | P13 (Context unlock), P11 (Magic numbers) | Resume on click, use config |
| 15 (Integration) | All | Run full test suite |

### Code Review Before Each Phase

Use the checklist in `pitfalls_review.md` §6. Every phase must pass before moving to the next.

---

## Appendix B: File Structure

```
index.html                    ← Single HTML file (all code inline)
├── <style>                   ← Minimal CSS
├── <canvas>                  ← Game canvas
└── <script>                  ← All game code
    ├── EventBus              ← Event routing
    ├── DataManager           ← JSON loading
    ├── GameState             ← State machine
    ├── GameLoop              ← Fixed timestep
    ├── Camera                ← Follow player
    ├── InputManager          ← Click/tap + WASD
    ├── EntityManager         ← Object pooling
    ├── SpawnSystem           ← Enemy spawning
    ├── MovementSystem        ← Pathfinding
    ├── CollisionSystem       ← AABB detection
    ├── WeaponSystem          ← Weapon mechanics
    ├── DamageSystem          ← Damage calc
    ├── PickupSystem          ← Item drops
    ├── LevelingSystem        ← XP + upgrades
    ├── Renderer              ← Canvas 2D drawing
    ├── CameraEffects         ← Screen shake
    ├── UIManager             ← HUD + screens
    └── AudioManager          ← Web Audio API
```

---

*End of implement_prototype.md — Version 1.0*
