# Modularity Engine — JSON Schemas

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** All numbered specs (02–09), `vs_prog.md`, `vs_colors.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [characters.json](#2-charactersjson)
3. [weapons.json](#3-weaponsjson)
4. [enemies.json](#4-enemiesjson)
5. [stages.json](#5-stagesjson)
6. [pickups.json](#6-pickupsjson)
7. [leveling.json](#7-levelingjson)
8. [Cross-Reference Summary](#8-cross-reference-summary)

---

## 1. Overview

This spec defines the JSON schema for every content file the engine loads. All values are sourced from the numbered spec files (02–09), `vs_prog.md`, and `vs_colors.md`.

**Files loaded by the engine:**

| File | Source Spec | Purpose |
|---|---|---|
| `characters.json` | 02_character_spec.md | Player character definition |
| `weapons.json` | 03_weapons_spec.md | Weapon definitions and upgrade tables |
| `enemies.json` | 04_enemies_spec.md | Enemy definitions and boss config |
| `stages.json` | 05_stages_spec.md | Stage layout, waves, obstacles |
| `pickups.json` | 06_pickups_and_powerups_spec.md | Pickup and power-up definitions |
| `leveling.json` | 07_leveling_system_spec.md | XP curve and upgrade pool |

**Audio config:** NOT a JSON file. All audio is procedurally synthesized using Web Audio API oscillators (see `09_audio_spec.md` §1). Audio configuration is hardcoded in the engine.

**Schema conventions:**
- Each schema includes: field name, type, required/optional, default value, description
- Complete V1 example populated with real values
- TypeScript type annotations alongside JSON examples
- Self-contained — a developer reading only that schema understands the full structure

---

## 2. characters.json

**Purpose:** Defines the player character. Single object (not an array).

### TypeScript Type

```typescript
interface CharacterSchema {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description: string;           // Flavor text
  stats: {
    maxHealth: number;           // Maximum hit points (100)
    moveSpeed: number;           // Movement speed in px/s (200)
    armor: number;               // Flat damage reduction (0)
    pickupRange: number;         // Base pickup collection radius in px (50)
    magnetRange: number;         // Magnet pickup radius, 0 = no innate magnet (0)
    critChance: number;          // Critical hit probability 0–1 (0)
    critMultiplier: number;      // Critical hit damage multiplier (1.5)
  };
  hitbox: {                      // AABB collision box [NEW — Spec 1 §4]
    width: number;               // Hitbox width in px (20, smaller than visual for fairness)
    height: number;              // Hitbox height in px (20)
  };
  startingWeapon: string;        // Weapon ID unlocked at start ("w1_projectile")
  visual: {
    shape: string;               // Rendered shape ("square")
    size: number;                // Visual size in px (24, larger than hitbox)
    color: string;               // Fill color hex ("#FFD700")
  };
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Character",
  "type": "object",
  "required": ["id", "name", "description", "stats", "hitbox", "startingWeapon", "visual"],
  "properties": {
    "id": { "type": "string", "description": "Unique identifier" },
    "name": { "type": "string", "description": "Display name" },
    "description": { "type": "string", "description": "Flavor text" },
    "stats": {
      "type": "object",
      "required": ["maxHealth", "moveSpeed", "armor", "pickupRange", "magnetRange", "critChance", "critMultiplier"],
      "properties": {
        "maxHealth": { "type": "number", "minimum": 1, "description": "Maximum hit points" },
        "moveSpeed": { "type": "number", "minimum": 0, "description": "Movement speed in px/s" },
        "armor": { "type": "number", "minimum": 0, "description": "Flat damage reduction (min damage = 1)" },
        "pickupRange": { "type": "number", "minimum": 0, "description": "Base pickup collection radius in px" },
        "magnetRange": { "type": "number", "minimum": 0, "description": "Innate magnet radius, 0 = none" },
        "critChance": { "type": "number", "minimum": 0, "maximum": 1, "description": "Critical hit probability (0–1)" },
        "critMultiplier": { "type": "number", "minimum": 1, "description": "Critical hit damage multiplier" }
      }
    },
    "hitbox": {
      "type": "object",
      "required": ["width", "height"],
      "properties": {
        "width": { "type": "number", "minimum": 1, "description": "AABB hitbox width in px" },
        "height": { "type": "number", "minimum": 1, "description": "AABB hitbox height in px" }
      },
      "description": "Collision box (smaller than visual for fair gameplay)"
    },
    "startingWeapon": { "type": "string", "description": "Weapon ID unlocked at game start" },
    "visual": {
      "type": "object",
      "required": ["shape", "size", "color"],
      "properties": {
        "shape": { "type": "string", "enum": ["square", "circle", "triangle", "diamond"], "description": "Rendered shape" },
        "size": { "type": "number", "minimum": 1, "description": "Visual size in px (may differ from hitbox)" },
        "color": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$", "description": "Fill color hex" }
      }
    }
  }
}
```

### V1 Example

```json
{
  "id": "player_default",
  "name": "The Survivor",
  "description": "A lone hero fighting through the night.",
  "stats": {
    "maxHealth": 100,
    "moveSpeed": 200,
    "armor": 0,
    "pickupRange": 50,
    "magnetRange": 0,
    "critChance": 0,
    "critMultiplier": 1.5
  },
  "hitbox": {
    "width": 20,
    "height": 20
  },
  "startingWeapon": "w1_projectile",
  "visual": {
    "shape": "square",
    "size": 24,
    "color": "#FFD700"
  }
}
```

**Source:** `02_character_spec.md` + `vs_colors.md` Player Visual + `01_engine_architecture.md` §4

---

## 3. weapons.json

**Purpose:** Defines all weapons. Array of 3 weapon objects.

### TypeScript Type

```typescript
interface WeaponSchema {
  id: string;                          // Unique identifier
  name: string;                        // Display name
  description: string;                 // Flavor text
  type: "projectile" | "orbit" | "area"; // Weapon behavior category
  targeting: string;                   // [NEW] Targeting logic: "nearest" | "self" | "player_position"
  unlockLevel: number;                 // Player level to unlock (1, 3, or 6)
  statsPerLevel: WeaponLevel[];        // Array of 7 level objects
  orbDamageCooldown: number;           // [NEW] Per-enemy damage cooldown in seconds (0.5 for W2, 0 for others)
  powerSpikes: {
    level4: PowerSpike;                // Level 4 power spike
    level7: PowerSpike;                // Level 7 power spike
  };
  visual: {
    shape: string;                     // Projectile/orb/pulse shape
    color: string;                     // Fill color hex
  };
}

interface WeaponLevel {
  level: number;                       // 1–7
  damage: number;                      // Base damage per hit
  cooldown: number;                    // Seconds between attacks
  projectileCount?: number;            // W1: number of projectiles
  orbitCount?: number;                 // W2: number of orbs
  orbitSpeed?: number;                 // W2: seconds per rotation
  orbitRadius?: number;                // W2: orbit radius in px
  pulseRadius?: number;                // W3: area radius in px
  pulseCount?: number;                 // W3: number of pulses
}

interface PowerSpike {
  name: string;                        // Power spike name
  description: string;                 // What changes
  statModifiers: Record<string, number>; // Exact stat changes
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Weapons",
  "type": "array",
  "minItems": 3,
  "maxItems": 3,
  "items": {
    "type": "object",
    "required": ["id", "name", "description", "type", "targeting", "unlockLevel", "statsPerLevel", "orbDamageCooldown", "powerSpikes", "visual"],
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "description": { "type": "string" },
      "type": { "type": "string", "enum": ["projectile", "orbit", "area"] },
      "targeting": { "type": "string", "enum": ["nearest", "self", "player_position"], "description": "Targeting logic" },
      "unlockLevel": { "type": "integer", "enum": [1, 3, 6] },
      "orbDamageCooldown": { "type": "number", "minimum": 0, "description": "Per-enemy damage cooldown in seconds (0 for non-orbit weapons)" },
      "statsPerLevel": {
        "type": "array",
        "minItems": 7,
        "maxItems": 7
      },
      "powerSpikes": {
        "type": "object",
        "required": ["level4", "level7"]
      },
      "visual": {
        "type": "object",
        "required": ["shape", "color"]
      }
    }
  }
}
```

### V1 Example

```json
[
  {
    "id": "w1_projectile",
    "name": "Projectile",
    "description": "Fires a projectile toward the nearest enemy.",
    "type": "projectile",
    "targeting": "nearest",
    "unlockLevel": 1,
    "orbDamageCooldown": 0,
    "statsPerLevel": [
      { "level": 1, "damage": 8, "cooldown": 1.00, "projectileCount": 1 },
      { "level": 2, "damage": 10, "cooldown": 0.95, "projectileCount": 1 },
      { "level": 3, "damage": 12, "cooldown": 0.90, "projectileCount": 1 },
      { "level": 4, "damage": 15, "cooldown": 0.85, "projectileCount": 1 },
      { "level": 5, "damage": 18, "cooldown": 0.80, "projectileCount": 2 },
      { "level": 6, "damage": 22, "cooldown": 0.75, "projectileCount": 2 },
      { "level": 7, "damage": 28, "cooldown": 0.65, "projectileCount": 3 }
    ],
    "powerSpikes": {
      "level4": {
        "name": "Pierce",
        "description": "Projectiles pass through 1 additional enemy before disappearing. Each pierce deals 75% damage to secondary targets.",
        "statModifiers": {
          "pierceCount": 1,
          "pierceDamageMultiplier": 0.75
        }
      },
      "level7": {
        "name": "Split",
        "description": "On hit, the projectile splits into 3 smaller projectiles that fan out. Split projectiles deal 50% damage and do not split again.",
        "statModifiers": {
          "splitCount": 3,
          "splitDamageMultiplier": 0.50,
          "splitCanReSplit": 0
        }
      }
    },
    "visual": {
      "shape": "square",
      "color": "#FFD700"
    }
  },
  {
    "id": "w2_orbit",
    "name": "Orbit",
    "description": "Orbs circle the player, damaging enemies on contact.",
    "type": "orbit",
    "targeting": "self",
    "unlockLevel": 3,
    "orbDamageCooldown": 0.5,
    "statsPerLevel": [
      { "level": 1, "damage": 5, "cooldown": 2.00, "orbitCount": 2, "orbitRadius": 80 },
      { "level": 2, "damage": 6, "cooldown": 1.85, "orbitCount": 2, "orbitRadius": 85 },
      { "level": 3, "damage": 7, "cooldown": 1.70, "orbitCount": 2, "orbitRadius": 90 },
      { "level": 4, "damage": 9, "cooldown": 1.55, "orbitCount": 3, "orbitRadius": 120 },
      { "level": 5, "damage": 11, "cooldown": 1.40, "orbitCount": 3, "orbitRadius": 130 },
      { "level": 6, "damage": 13, "cooldown": 1.30, "orbitCount": 4, "orbitRadius": 140 },
      { "level": 7, "damage": 16, "cooldown": 1.00, "orbitCount": 4, "orbitRadius": 160 }
    ],
    "powerSpikes": {
      "level4": {
        "name": "Expanded Orbit",
        "description": "Orbit radius increases by 50% and a third orb is added. Dramatically increases coverage area.",
        "statModifiers": {
          "orbitRadiusBonus": 0.50,
          "orbitCountBonus": 1
        }
      },
      "level7": {
        "name": "Afterimage",
        "description": "Each orb leaves a damaging afterimage trail that persists for 0.5 seconds. Afterimages deal 30% of base damage per tick.",
        "statModifiers": {
          "afterimageDuration": 0.5,
          "afterimageDamageMultiplier": 0.30
        }
      }
    },
    "visual": {
      "shape": "circle",
      "color": "#4FC3F7"
    }
  },
  {
    "id": "w3_area",
    "name": "Area",
    "description": "Pulses damage in a radius around the player.",
    "type": "area",
    "targeting": "player_position",
    "unlockLevel": 6,
    "orbDamageCooldown": 0,
    "statsPerLevel": [
      { "level": 1, "damage": 12, "cooldown": 2.50, "pulseRadius": 80, "pulseCount": 1 },
      { "level": 2, "damage": 15, "cooldown": 2.35, "pulseRadius": 88, "pulseCount": 1 },
      { "level": 3, "damage": 18, "cooldown": 2.20, "pulseRadius": 96, "pulseCount": 1 },
      { "level": 4, "damage": 22, "cooldown": 2.00, "pulseRadius": 110, "pulseCount": 2 },
      { "level": 5, "damage": 27, "cooldown": 1.85, "pulseRadius": 120, "pulseCount": 2 },
      { "level": 6, "damage": 33, "cooldown": 1.70, "pulseRadius": 135, "pulseCount": 2 },
      { "level": 7, "damage": 42, "cooldown": 1.40, "pulseRadius": 160, "pulseCount": 3 }
    ],
    "powerSpikes": {
      "level4": {
        "name": "Double Pulse",
        "description": "The area attack fires twice in quick succession (0.3s apart). Each pulse deals full damage.",
        "statModifiers": {
          "pulseCount": 2,
          "pulseDelay": 0.3
        }
      },
      "level7": {
        "name": "Devastation",
        "description": "The third pulse is a massive explosion (160px radius) that deals 2× damage and stuns all enemies hit for 1.0 second.",
        "statModifiers": {
          "thirdPulseRadius": 160,
          "thirdPulseDamageMultiplier": 2.0,
          "thirdPulseStunDuration": 1.0
        }
      }
    },
    "visual": {
      "shape": "circle",
      "color": "#FF9100"
    }
  }
]
```

**Source:** `03_weapons_spec.md` + `vs_prog.md` Weapon Progression + `vs_colors.md` Weapon Visuals

---

## 4. enemies.json

**Purpose:** Defines all enemies and the boss. Array of 6 objects.

### TypeScript Type

```typescript
interface EnemySchema {
  id: string;
  name: string;
  type: "normal" | "boss";
  stats: {
    hp: number;
    damage: number;
    speed: number;                    // px/s
    size: number;                     // radius in px
    xpValue: number;
    goldValue: number;                // base gold, actual = random(min, max)
  };
  behavior: {
    pattern: string;                  // Movement/AI pattern name
    params: Record<string, number>;   // Behavior parameters
  };
  drops: {
    powerUpTable: DropEntry[];        // Power-up drop chances
  };
  spawn: {
    weight: number;                   // Spawn probability weight
    firstAppears: string;             // Time when enemy first spawns ("0:00", "1:00", etc.)
  };
  // Boss-specific fields (only present when type === "boss")
  phases?: BossPhase[];
  loot?: {
    xp: number;
    gold: { min: number; max: number };
    guaranteedPowerUp: string;        // Power-up ID
  };
  screenWipeResistance?: number;      // [NEW] 0–1, damage multiplier from screen wipe (0.8 = 80% resistance)
  chargeResumeBehavior?: string;      // [NEW] Boss charge behavior after pause ("continue_from_frozen")
}

interface BossPhase {
  hpThreshold: number;                // HP percentage to trigger phase (0–1)
  speed: number;                      // Movement speed in px/s
  chargeInterval: number;             // Seconds between charges
  minionCount: number;                // Zombies spawned per wave
  minionInterval: number;             // Seconds between minion waves
  groundPound?: {                     // Phase 2 only
    interval: number;                 // Seconds between ground pounds
    radius: number;                   // Damage radius in px
    damage: number;                   // Damage dealt
    telegraphTime: number;            // Warning duration in seconds
  };
}

interface DropEntry {
  type: string;                       // Power-up ID ("screen_wipe", "magnet", "weapon_levelup")
  chance: number;                     // Drop probability (0–1)
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Enemies",
  "type": "array",
  "minItems": 6,
  "maxItems": 6,
  "items": {
    "type": "object",
    "required": ["id", "name", "type", "stats", "behavior", "drops", "spawn"]
  }
}
```

### V1 Example

```json
[
  {
    "id": "zombie",
    "name": "Zombie",
    "type": "normal",
    "stats": { "hp": 10, "damage": 5, "speed": 40, "size": 10, "xpValue": 1, "goldValue": 1 },
    "behavior": { "pattern": "chase", "params": { "chaseSpeed": 40, "wanderRadius": 100 } },
    "drops": {
      "powerUpTable": [
        { "type": "weapon_levelup", "chance": 0.01 }
      ]
    },
    "spawn": { "weight": 100, "firstAppears": "0:00" }
  },
  {
    "id": "bat",
    "name": "Bat",
    "type": "normal",
    "stats": { "hp": 5, "damage": 3, "speed": 100, "size": 8, "xpValue": 1, "goldValue": 1 },
    "behavior": { "pattern": "swarm", "params": { "swarmRadius": 150, "erraticism": 0.8 } },
    "drops": {
      "powerUpTable": [
        { "type": "magnet", "chance": 0.05 }
      ]
    },
    "spawn": { "weight": 80, "firstAppears": "1:00" }
  },
  {
    "id": "skeleton",
    "name": "Skeleton",
    "type": "normal",
    "stats": { "hp": 20, "damage": 8, "speed": 50, "size": 12, "xpValue": 3, "goldValue": 2 },
    "behavior": { "pattern": "chase", "params": { "chaseSpeed": 50, "wanderRadius": 80 } },
    "drops": {
      "powerUpTable": [
        { "type": "screen_wipe", "chance": 0.02 },
        { "type": "weapon_levelup", "chance": 0.01 }
      ]
    },
    "spawn": { "weight": 60, "firstAppears": "2:00" }
  },
  {
    "id": "ghost",
    "name": "Ghost",
    "type": "normal",
    "stats": { "hp": 15, "damage": 10, "speed": 80, "size": 12, "xpValue": 2, "goldValue": 2 },
    "behavior": { "pattern": "wander_chase", "params": { "wanderTime": 2, "chaseTime": 4, "phaseOpacity": 0.4 } },
    "drops": {
      "powerUpTable": [
        { "type": "magnet", "chance": 0.05 },
        { "type": "weapon_levelup", "chance": 0.01 }
      ]
    },
    "spawn": { "weight": 50, "firstAppears": "2:30" }
  },
  {
    "id": "caster",
    "name": "Caster",
    "type": "normal",
    "stats": { "hp": 12, "damage": 8, "speed": 50, "size": 13, "xpValue": 3, "goldValue": 3 },
    "behavior": { "pattern": "ranged", "params": { "maintainDistance": 150, "projectileDamage": 6, "projectileSpeed": 150, "fireCooldown": 2.0 } },
    "drops": {
      "powerUpTable": [
        { "type": "screen_wipe", "chance": 0.02 },
        { "type": "weapon_levelup", "chance": 0.01 }
      ]
    },
    "spawn": { "weight": 45, "firstAppears": "3:00" }
  },
  {
    "id": "boss_gravekeeper",
    "name": "The Gravekeeper",
    "type": "boss",
    "stats": { "hp": 1000, "damage": 15, "speed": 70, "size": 28, "xpValue": 50, "goldValue": 20 },
    "behavior": { "pattern": "boss_charge", "params": { "chargeDuration": 1.5, "pauseDuration": 1.0 } },
    "drops": {
      "powerUpTable": [
        { "type": "weapon_levelup", "chance": 1.0 }
      ]
    },
    "spawn": { "weight": 0, "firstAppears": "4:00" },
    "phases": [
      {
        "hpThreshold": 1.0,
        "speed": 70,
        "chargeInterval": 3.0,
        "minionCount": 3,
        "minionInterval": 3.0
      },
      {
        "hpThreshold": 0.5,
        "speed": 100,
        "chargeInterval": 2.0,
        "minionCount": 5,
        "minionInterval": 2.0,
        "groundPound": {
          "interval": 5.0,
          "radius": 80,
          "damage": 20,
          "telegraphTime": 0.75
        }
      }
    ],
    "loot": {
      "xp": 50,
      "gold": { "min": 20, "max": 30 },
      "guaranteedPowerUp": "weapon_levelup"
    },
    "screenWipeResistance": 0.8,
    "chargeResumeBehavior": "continue_from_frozen"
  }
]
```

**Source:** `04_enemies_spec.md` + `vs_prog.md` Enemy Spawn Details + Boss Encounter

---

## 5. stages.json

**Purpose:** Defines stage layout, wave timeline, obstacles, and boss config. Single object.

### TypeScript Type

```typescript
interface StageSchema {
  id: string;
  name: string;
  theme: string;
  background: {
    baseColor: string;               // Background fill color
    gridColor: string;               // Grid line color
    gridSize: number;                // Grid cell size in px
  };
  spawnConfig: {
    minDistance: number;              // Minimum spawn distance from player (px)
    maxDistance: number;              // Maximum spawn distance from player (px)
    maxEnemies: number;              // Global enemy cap
    baseSpawnRate: number;           // Starting spawns per second (0.8)
    spawnRateCap: number;            // Maximum spawns per second (3.0)
    maxEnemyCapBehavior: string;     // [NEW] What happens at cap ("stop_spawn")
  };
  waves: WaveBracket[];              // Array of 10 time brackets
  difficultyScaling: {
    hpMultiplier: string;            // Formula string
    damageMultiplier: string;        // Formula string
    timerStart: string;              // [NEW] When scaling begins ("boss_death_timestamp")
  };
  xpScaling: {
    formula: string;                 // XP scaling formula
  };
  bossConfig: {
    enemyId: string;                 // Boss enemy ID
    spawnTime: string;               // Spawn time ("4:00")
    announcement: BossAnnouncement[];
  };
  obstacles: {
    types: number;                   // Number of obstacle types (5)
    collisionRules: string;          // Collision description
    weights: ObstacleWeights;        // [NEW] Type selection probabilities
    seedDerivation: string;          // [NEW] Seed formula
  };
}

interface WaveBracket {
  time: string;                      // Time range ("0:00–0:30")
  enemyTypes: string[];              // Enemy IDs that can spawn
  spawnRate: number;                 // Spawns per second
  compositionWeights: Record<string, number>; // Enemy type weights (sum to 1.0)
  maxEnemies: number;                // Per-bracket enemy cap
}

interface BossAnnouncement {
  time: number;                      // Seconds from game start
  text?: string;                     // Display text
  type: string;                      // "text" | "dim" | "shake" | "boss_spawn"
  brightness?: number;               // For dim type (0–1)
  position?: string;                 // For boss_spawn ("nearest_edge_to_player")
  styling?: {                        // Text styling
    fontSize: number;
    position: string;
    animation: string;
  };
}

interface ObstacleWeights {
  small_tombstone: number;           // 0.30
  large_tombstone: number;           // 0.10
  grave_mound: number;               // 0.25
  broken_wall: number;               // 0.15
  cracked_floor: number;             // 0.20
}
```

### V1 Example

```json
{
  "id": "stage_graveyard",
  "name": "The Graveyard",
  "theme": "Gothic horror",
  "background": {
    "baseColor": "#1A1A2E",
    "gridColor": "#16213E",
    "gridSize": 50
  },
  "spawnConfig": {
    "minDistance": 400,
    "maxDistance": 600,
    "maxEnemies": 200,
    "baseSpawnRate": 0.8,
    "spawnRateCap": 3.0,
    "maxEnemyCapBehavior": "stop_spawn"
  },
  "waves": [
    {
      "time": "0:00–0:30",
      "enemyTypes": ["zombie"],
      "spawnRate": 0.8,
      "compositionWeights": { "zombie": 1.0 },
      "maxEnemies": 25
    },
    {
      "time": "0:30–1:00",
      "enemyTypes": ["zombie"],
      "spawnRate": 1.2,
      "compositionWeights": { "zombie": 1.0 },
      "maxEnemies": 40
    },
    {
      "time": "1:00–1:30",
      "enemyTypes": ["zombie", "bat"],
      "spawnRate": 1.5,
      "compositionWeights": { "zombie": 0.55, "bat": 0.45 },
      "maxEnemies": 60
    },
    {
      "time": "1:30–2:00",
      "enemyTypes": ["zombie", "bat"],
      "spawnRate": 1.8,
      "compositionWeights": { "zombie": 0.55, "bat": 0.45 },
      "maxEnemies": 80
    },
    {
      "time": "2:00–2:30",
      "enemyTypes": ["zombie", "bat", "skeleton"],
      "spawnRate": 2.0,
      "compositionWeights": { "zombie": 0.40, "bat": 0.35, "skeleton": 0.25 },
      "maxEnemies": 100
    },
    {
      "time": "2:30–3:00",
      "enemyTypes": ["zombie", "bat", "skeleton", "ghost"],
      "spawnRate": 2.2,
      "compositionWeights": { "zombie": 0.30, "bat": 0.30, "skeleton": 0.25, "ghost": 0.15 },
      "maxEnemies": 120
    },
    {
      "time": "3:00–3:30",
      "enemyTypes": ["zombie", "bat", "skeleton", "ghost", "caster"],
      "spawnRate": 2.5,
      "compositionWeights": { "zombie": 0.25, "bat": 0.25, "skeleton": 0.20, "ghost": 0.15, "caster": 0.15 },
      "maxEnemies": 150
    },
    {
      "time": "3:30–4:00",
      "enemyTypes": ["zombie", "bat", "skeleton", "ghost", "caster"],
      "spawnRate": 3.0,
      "compositionWeights": { "zombie": 0.20, "bat": 0.25, "skeleton": 0.20, "ghost": 0.15, "caster": 0.20 },
      "maxEnemies": 180
    },
    {
      "time": "4:00–4:30",
      "enemyTypes": ["zombie", "bat", "skeleton", "ghost", "caster", "boss_gravekeeper"],
      "spawnRate": 2.0,
      "compositionWeights": { "zombie": 0.20, "bat": 0.25, "skeleton": 0.20, "ghost": 0.15, "caster": 0.20 },
      "maxEnemies": 150
    },
    {
      "time": "4:30–5:00",
      "enemyTypes": ["zombie", "bat", "skeleton", "ghost", "caster", "boss_gravekeeper"],
      "spawnRate": 1.5,
      "compositionWeights": { "zombie": 0.20, "bat": 0.25, "skeleton": 0.20, "ghost": 0.15, "caster": 0.20 },
      "maxEnemies": 120
    }
  ],
  "difficultyScaling": {
    "hpMultiplier": "1 + 0.15 × minutes_after_boss_kill",
    "damageMultiplier": "1 + 0.10 × minutes_after_boss_kill",
    "timerStart": "boss_death_timestamp"
  },
  "xpScaling": {
    "formula": "base_xp × (1 + 0.05 × floor(t / 60))"
  },
  "bossConfig": {
    "enemyId": "boss_gravekeeper",
    "spawnTime": "4:00",
    "announcement": [
      {
        "time": 230,
        "text": "Something stirs in the darkness...",
        "type": "text",
        "styling": { "fontSize": 24, "position": "center", "animation": "fadeInHoldFadeOut" }
      },
      { "time": 230, "type": "dim", "brightness": 0.8 },
      {
        "time": 235,
        "text": "The Gravekeeper rises!",
        "type": "shake",
        "styling": { "fontSize": 28, "position": "center", "animation": "scalePulse" }
      },
      { "time": 240, "type": "boss_spawn", "position": "nearest_edge_to_player" }
    ]
  },
  "obstacles": {
    "types": 5,
    "collisionRules": "player+enemies collide, projectiles+pickups pass through",
    "weights": {
      "small_tombstone": 0.30,
      "large_tombstone": 0.10,
      "grave_mound": 0.25,
      "broken_wall": 0.15,
      "cracked_floor": 0.20
    },
    "seedDerivation": "hash(stageId + difficultyLevel)"
  }
}
```

**Source:** `05_stages_spec.md` + `vs_prog.md` Wave Timeline + `vs_colors.md` Map & Obstacles

---

## 6. pickups.json

**Purpose:** Defines all pickups and power-ups. Array of 6 objects.

### TypeScript Type

```typescript
interface PickupSchema {
  id: string;
  name: string;
  type: "exp_small" | "exp_large" | "gold" | "screen_wipe" | "magnet" | "weapon_levelup";
  value: number;                       // XP value or gold value (0 for power-ups)
  visual: {
    shape: string;
    color: string;
    size: number;                      // Visual size in px
  };
  behavior: {
    duration: number | null;           // null = persistent, number = seconds
    attractRadius: number;             // Pickup collection radius in px (base: 50)
    attractSpeed: number;              // Magnet attraction speed in px/s (0 = no attraction)
    instantBurstRadius: number;        // Instant collection radius on magnet pickup (0 = none)
  };
  dropConfig: {
    sources: DropSource[];             // Which enemies can drop this
    guaranteedDropEnemies: string[];   // Enemy IDs that always drop this
    rollOrder: number;                 // [NEW] Drop priority (lower = rolled first)
  };
  // Screen wipe specific
  killsAllEnemies?: boolean;           // Instantly kills all regular enemies
  bossDamage?: number;                 // [NEW] Damage dealt to boss (200)
  bossResistance?: number;             // [NEW] Boss resistance multiplier (0.8)
  // Magnet specific
  magnetFadeOutDuration?: number;      // Fade-out time in seconds (0.5)
  // Gold specific
  goldValuePerCoin?: number;           // [NEW] Gold per coin (1)
  // Power-up specific
  powerUpDespawnTime?: number | null;  // [NEW] Despawn timer, null = never
}

interface DropSource {
  enemyId: string;                     // Enemy that drops this
  chance: number;                      // Drop probability (0–1)
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Pickups",
  "type": "array",
  "minItems": 6,
  "maxItems": 6,
  "items": {
    "type": "object",
    "required": ["id", "name", "type", "value", "visual", "behavior", "dropConfig"]
  }
}
```

### V1 Example

```json
[
  {
    "id": "exp_small",
    "name": "XP Gem (Small)",
    "type": "exp_small",
    "value": 1,
    "visual": { "shape": "diamond", "color": "#4FC3F7", "size": 8 },
    "behavior": {
      "duration": null,
      "attractRadius": 50,
      "attractSpeed": 0,
      "instantBurstRadius": 0
    },
    "dropConfig": {
      "sources": [
        { "enemyId": "zombie", "chance": 1.0 },
        { "enemyId": "bat", "chance": 1.0 },
        { "enemyId": "skeleton", "chance": 1.0 },
        { "enemyId": "ghost", "chance": 1.0 },
        { "enemyId": "caster", "chance": 1.0 }
      ],
      "guaranteedDropEnemies": [],
      "rollOrder": 0
    }
  },
  {
    "id": "exp_large",
    "name": "XP Gem (Large)",
    "type": "exp_large",
    "value": 5,
    "visual": { "shape": "diamond", "color": "#81D4FA", "size": 14 },
    "behavior": {
      "duration": null,
      "attractRadius": 50,
      "attractSpeed": 0,
      "instantBurstRadius": 0
    },
    "dropConfig": {
      "sources": [],
      "guaranteedDropEnemies": ["boss_gravekeeper"],
      "rollOrder": 0
    }
  },
  {
    "id": "gold_coin",
    "name": "Gold Coin",
    "type": "gold",
    "value": 0,
    "visual": { "shape": "circle", "color": "#FFD700", "size": 10 },
    "behavior": {
      "duration": null,
      "attractRadius": 50,
      "attractSpeed": 0,
      "instantBurstRadius": 0
    },
    "dropConfig": {
      "sources": [
        { "enemyId": "zombie", "chance": 1.0 },
        { "enemyId": "bat", "chance": 1.0 },
        { "enemyId": "skeleton", "chance": 1.0 },
        { "enemyId": "ghost", "chance": 1.0 },
        { "enemyId": "caster", "chance": 1.0 },
        { "enemyId": "boss_gravekeeper", "chance": 1.0 }
      ],
      "guaranteedDropEnemies": [],
      "rollOrder": 0
    },
    "goldValuePerCoin": 1
  },
  {
    "id": "screen_wipe",
    "name": "Screen Wipe",
    "type": "screen_wipe",
    "value": 0,
    "visual": { "shape": "star", "color": "#00E676", "size": 16 },
    "behavior": {
      "duration": null,
      "attractRadius": 50,
      "attractSpeed": 0,
      "instantBurstRadius": 0
    },
    "dropConfig": {
      "sources": [
        { "enemyId": "skeleton", "chance": 0.02 },
        { "enemyId": "caster", "chance": 0.02 }
      ],
      "guaranteedDropEnemies": [],
      "rollOrder": 2
    },
    "killsAllEnemies": true,
    "bossDamage": 200,
    "bossResistance": 0.8,
    "powerUpDespawnTime": null
  },
  {
    "id": "magnet",
    "name": "Magnet",
    "type": "magnet",
    "value": 0,
    "visual": { "shape": "circle", "color": "#FF4081", "size": 14 },
    "behavior": {
      "duration": 10,
      "attractRadius": 350,
      "attractSpeed": 400,
      "instantBurstRadius": 150
    },
    "dropConfig": {
      "sources": [
        { "enemyId": "bat", "chance": 0.05 },
        { "enemyId": "ghost", "chance": 0.05 }
      ],
      "guaranteedDropEnemies": [],
      "rollOrder": 3
    },
    "magnetFadeOutDuration": 0.5,
    "powerUpDespawnTime": null
  },
  {
    "id": "weapon_levelup",
    "name": "Weapon Level-Up",
    "type": "weapon_levelup",
    "value": 0,
    "visual": { "shape": "triangle", "color": "#FF9100", "size": 16 },
    "behavior": {
      "duration": null,
      "attractRadius": 50,
      "attractSpeed": 0,
      "instantBurstRadius": 0
    },
    "dropConfig": {
      "sources": [
        { "enemyId": "zombie", "chance": 0.01 },
        { "enemyId": "skeleton", "chance": 0.01 },
        { "enemyId": "ghost", "chance": 0.01 },
        { "enemyId": "caster", "chance": 0.01 }
      ],
      "guaranteedDropEnemies": ["boss_gravekeeper"],
      "rollOrder": 1
    },
    "powerUpDespawnTime": null
  }
]
```

**Source:** `06_pickups_and_powerups_spec.md` + `vs_prog.md` Drop Economy + `vs_colors.md` Pickup Visuals

---

## 7. leveling.json

**Purpose:** Defines XP curve, upgrade pool, and passive boosts. Single object.

### TypeScript Type

```typescript
interface LevelingSchema {
  xpCurve: XpEntry[];                  // Array of 14 entries
  formula: {
    forLevel: number;                   // Level where formula kicks in (14)
    expression: string;                 // Formula string
  };
  upgradePool: {
    weaponWeight: number;               // Weapon upgrade probability weight (0.6)
    passiveWeight: number;              // Passive boost probability weight (0.4)
    weaponUnlockGuaranteed: boolean;    // [NEW] Weapon unlocks appear every screen until picked
  };
  passiveOptions: PassiveOption[];      // Array of 5 passive boosts
  maxLevelUpQueue: number;              // [NEW] Max queued level-ups (3)
  excessXPBehavior: string;             // [NEW] What happens to excess XP ("carry_over")
  maxHealthPassiveHealsCurrent: boolean; // [NEW] Max Health passive also heals current HP
}

interface XpEntry {
  level: number;                        // Current level
  xpToNext: number;                     // XP needed for next level
  cumulativeXp: number;                 // Total XP from level 1
}

interface PassiveOption {
  id: string;
  name: string;
  stat: string;                         // Stat affected
  value: number;                        // Per-stack value
  description: string;                  // What it does
  maxStacks: number;                    // Maximum stacks
  icon: string;                         // UI icon identifier
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Leveling",
  "type": "object",
  "required": ["xpCurve", "formula", "upgradePool", "passiveOptions", "maxLevelUpQueue", "excessXPBehavior", "maxHealthPassiveHealsCurrent"],
  "properties": {
    "xpCurve": { "type": "array", "minItems": 14, "maxItems": 14 },
    "formula": { "type": "object" },
    "upgradePool": { "type": "object" },
    "passiveOptions": { "type": "array", "minItems": 5, "maxItems": 5 },
    "maxLevelUpQueue": { "type": "integer", "minimum": 1 },
    "excessXPBehavior": { "type": "string", "enum": ["carry_over", "lost"] },
    "maxHealthPassiveHealsCurrent": { "type": "boolean" }
  }
}
```

### V1 Example

```json
{
  "xpCurve": [
    { "level": 1, "xpToNext": 5, "cumulativeXp": 0 },
    { "level": 2, "xpToNext": 10, "cumulativeXp": 5 },
    { "level": 3, "xpToNext": 15, "cumulativeXp": 15 },
    { "level": 4, "xpToNext": 22, "cumulativeXp": 30 },
    { "level": 5, "xpToNext": 32, "cumulativeXp": 52 },
    { "level": 6, "xpToNext": 45, "cumulativeXp": 84 },
    { "level": 7, "xpToNext": 62, "cumulativeXp": 129 },
    { "level": 8, "xpToNext": 85, "cumulativeXp": 191 },
    { "level": 9, "xpToNext": 115, "cumulativeXp": 276 },
    { "level": 10, "xpToNext": 155, "cumulativeXp": 391 },
    { "level": 11, "xpToNext": 210, "cumulativeXp": 546 },
    { "level": 12, "xpToNext": 280, "cumulativeXp": 756 },
    { "level": 13, "xpToNext": 375, "cumulativeXp": 1036 },
    { "level": 14, "xpToNext": 488, "cumulativeXp": 1411 }
  ],
  "formula": {
    "forLevel": 14,
    "expression": "floor(375 × 1.3^(N-14))"
  },
  "upgradePool": {
    "weaponWeight": 0.6,
    "passiveWeight": 0.4,
    "weaponUnlockGuaranteed": true
  },
  "passiveOptions": [
    {
      "id": "max_health",
      "name": "Max Health +20%",
      "stat": "maxHealth",
      "value": 0.20,
      "description": "Increases maximum HP by 20% of base (100). Current HP also increases.",
      "maxStacks": 5,
      "icon": "heart"
    },
    {
      "id": "move_speed",
      "name": "Movement Speed +10%",
      "stat": "moveSpeed",
      "value": 0.10,
      "description": "Increases movement speed by 10% of base (200 px/s).",
      "maxStacks": 3,
      "icon": "speed"
    },
    {
      "id": "armor",
      "name": "Armor +1",
      "stat": "armor",
      "value": 1,
      "description": "Reduces all incoming damage by 1 (minimum damage is always 1).",
      "maxStacks": 3,
      "icon": "shield"
    },
    {
      "id": "pickup_range",
      "name": "Pickup Range +25px",
      "stat": "pickupRange",
      "value": 25,
      "description": "Increases pickup collection radius by 25px.",
      "maxStacks": 4,
      "icon": "magnet"
    },
    {
      "id": "crit_chance",
      "name": "Crit Chance +5%",
      "stat": "critChance",
      "value": 0.05,
      "description": "5% chance to deal 1.5× damage on all attacks.",
      "maxStacks": 4,
      "icon": "star"
    }
  ],
  "maxLevelUpQueue": 3,
  "excessXPBehavior": "carry_over",
  "maxHealthPassiveHealsCurrent": true
}
```

**Source:** `07_leveling_system_spec.md` + `vs_prog.md` Experience Curve + Passive Stat Boosts

---

## 8. Cross-Reference Summary

| Schema | References |
|---|---|
| characters.json | `02_character_spec.md`, `vs_colors.md` Player Visual, `01_engine_architecture.md` §4 |
| weapons.json | `03_weapons_spec.md`, `vs_prog.md` Weapon Progression, `vs_colors.md` Weapon Visuals |
| enemies.json | `04_enemies_spec.md`, `vs_prog.md` Enemy Spawn Details + Boss Encounter |
| stages.json | `05_stages_spec.md`, `vs_prog.md` Wave Timeline, `vs_colors.md` Map & Obstacles |
| pickups.json | `06_pickups_and_powerups_spec.md`, `vs_prog.md` Drop Economy, `vs_colors.md` Pickup Visuals |
| leveling.json | `07_leveling_system_spec.md`, `vs_prog.md` Experience Curve + Passive Stat Boosts |
| Audio | Hardcoded in engine (no JSON file — see `09_audio_spec.md` §1) |

**Key cross-schema consistency checks:**
- `enemies.json[boss].screenWipeResistance` (0.8) = `pickups.json[screen_wipe].bossResistance` (0.8)
- `characters.json.startingWeapon` = `weapons.json[0].id` ("w1_projectile")
- `stages.json.bossConfig.enemyId` = `enemies.json[5].id` ("boss_gravekeeper")
- `leveling.json.xpCurve` values = `vs_prog.md` XP Table (exact match)
- All visual colors reference `vs_colors.md` palette

---

*End of 10_json_schemas.md — Version 1.0*
