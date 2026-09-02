# Stage Creation Template

> **Version:** 1.0
> **Date:** August 29, 2026
> **Purpose:** Standardized template for creating new stages with easy balance levers

---

## Stage Structure

Every stage follows this JSON structure in `EMBEDDED_DATA.stages`:

```javascript
{
  id: "stage_graveyard",           // Unique identifier
  name: "The Graveyard",           // Display name
  theme: "Gothic horror",          // Visual/narrative theme
  background: {                    // Visual settings
    baseColor: "#1A1A2E",          // Canvas background
    gridColor: "#16213E",          // Grid overlay
    gridSize: 50                   // Grid spacing
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 1: Spawn Configuration
  // ═══════════════════════════════════════════
  spawnConfig: {
    minDistance: 400,               // Min spawn distance from player
    maxDistance: 600,               // Max spawn distance from player
    maxEnemies: 200,               // Hard cap on active enemies
    baseSpawnRate: 0.8,            // Base spawns per second
    spawnRateCap: 3.0,             // Maximum spawn rate
    maxEnemyCapBehavior: "stop_spawn"  // What happens at cap
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 2: Wave Timeline
  // ═══════════════════════════════════════════
  waves: [
    {
      time: "0:00-0:30",           // Time bracket (MM:SS-MM:SS)
      enemyTypes: ["zombie"],       // Which enemies can spawn
      spawnRate: 0.8,              // Spawns per second in this bracket
      compositionWeights: {         // Relative spawn probability
        zombie: 1.0
      },
      maxEnemies: 25               // Cap for this bracket
    },
    // ... more waves ...
  ],
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 3: Tier Multipliers
  // ═══════════════════════════════════════════
  tierMultipliers: {
    quick: {                        // 3-minute variant
      duration: 180,                // Seconds
      hp: 0.8,                      // Enemy HP multiplier
      damage: 0.9,                  // Enemy damage multiplier
      spawnRate: 1.5,               // Spawn rate multiplier
      maxEnemies: 0.8,              // Max enemies multiplier
      gold: 0.8,                    // Gold drop multiplier
      xp: 1.2                       // XP multiplier
    },
    standard: {                     // 5-minute variant
      duration: 300,
      hp: 1.0, damage: 1.0, spawnRate: 1.0,
      maxEnemies: 1.0, gold: 1.0, xp: 1.0
    },
    highlight: {                    // 10-minute variant
      duration: 600,
      hp: 1.3, damage: 1.2, spawnRate: 1.0,
      maxEnemies: 1.2, gold: 1.5, xp: 1.0
    }
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 4: Weapon Loadouts
  // ═══════════════════════════════════════════
  weaponLoadouts: {
    quick: {                        // Recommended weapons for 3min
      weapons: ["w1_projectile", "w4_flame_wave", "weapon_area_pulse"],
      description: "Frontloaded for fast clears"
    },
    standard: {                     // Recommended weapons for 5min
      weapons: ["w1_projectile", "w2_orbit", "weapon_area_pulse"],
      description: "Balanced for standard play"
    },
    highlight: {                    // Recommended weapons for 10min
      weapons: ["w1_projectile", "w5_arcane_bolt", "weapon_area_pulse"],
      description: "Scaling for extended runs"
    }
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 5: Boss Configuration
  // ═══════════════════════════════════════════
  bossConfig: {
    enemyId: "boss_gravekeeper",
    spawnTime: "4:00",              // When boss appears
    announcement: [                 // Pre-boss sequence
      { time: 230, text: "Something stirs...", type: "text" },
      { time: 235, text: "The Gravekeeper rises!", type: "shake" },
      { time: 240, type: "boss_spawn" }
    ],
    phases: [                       // Boss behavior phases
      { hpThreshold: 0.6, behavior: "chase", speed: 30 },
      { hpThreshold: 0.3, behavior: "charge", speed: 50 },
      { hpThreshold: 0.0, behavior: "enrage", speed: 70 }
    ]
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 6: Star Conditions
  // ═══════════════════════════════════════════
  starConditions: {
    oneStar: {                      // Complete the stage
      requirement: "survive"
    },
    twoStar: {                      // 2 of 4 conditions
      options: [
        { id: "no_damage", desc: "Take no damage", threshold: 0 },
        { id: "speed_clear", desc: "Clear in under X time", threshold: 0.7 },
        { id: "kill_all", desc: "Kill 100% of enemies", threshold: 1.0 },
        { id: "gold_rich", desc: "Earn X gold", threshold: 100 }
      ],
      required: 2
    },
    threeStar: {                    // 1 hard + 1 additional
      hardRequirement: { id: "no_damage", desc: "Take no damage" },
      additionalRequired: 1
    }
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 7: Difficulty Scaling
  // ═══════════════════════════════════════════
  difficultyScaling: {
    hpMultiplier: "1 + 0.15 * minutes_after_boss_kill",
    damageMultiplier: "1 + 0.10 * minutes_after_boss_kill"
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 8: XP Scaling
  // ═══════════════════════════════════════════
  xpScaling: {
    formula: "base_xp * (1 + 0.05 * floor(t / 60))"
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 9: Obstacles
  // ═══════════════════════════════════════════
  obstacles: {
    types: 5,
    collisionRules: "player+enemies collide",
    weights: {
      small_tombstone: 0.30,
      large_tombstone: 0.10,
      grave_mound: 0.25,
      broken_wall: 0.15,
      cracked_floor: 0.20
    }
  },
  
  // ═══════════════════════════════════════════
  // BALANCE LEVER 10: Loot Table
  // ═══════════════════════════════════════════
  lootTable: {
    xpGem: { chance: 1.0, value: 1 },
    goldCoin: { chance: 1.0, value: 1 },
    rareDrop: { chance: 0.02, type: "screen_wipe" },
    magnetDrop: { chance: 0.05 }
  }
}
```

---

## Quick Reference: Balance Levers

| Lever | What It Controls | Quick Tune |
|---|---|---|
| `spawnConfig.baseSpawnRate` | Early game pacing | Lower = slower start |
| `waves[i].spawnRate` | Mid/late game intensity | Higher = more enemies |
| `waves[i].compositionWeights` | Enemy variety | Adjust ratios for difficulty |
| `tierMultipliers.*` | Tier-specific scaling | Multiplier on all stats |
| `bossConfig.spawnTime` | Boss encounter timing | Earlier = harder |
| `bossConfig.phases` | Boss behavior | Add/remove phases |
| `starConditions` | Player goals | Adjust thresholds |
| `difficultyScaling` | Post-boss scaling | Change formulas |
| `xpScaling` | Progression speed | Change multiplier |
| `lootTable` | Reward frequency | Adjust chances |

---

## Creating a New Stage

### Step 1: Copy Template
```javascript
const newStage = { ...TEMPLATE };
```

### Step 2: Set Identity
```javascript
newStage.id = "stage_forest";
newStage.name = "The Dark Forest";
newStage.theme = "Survival horror";
```

### Step 3: Adjust Waves
- Change `enemyTypes` to use forest enemies
- Adjust `compositionWeights` for variety
- Modify `spawnRate` per bracket

### Step 4: Configure Boss
- Set `bossConfig.enemyId` to forest boss
- Adjust `spawnTime` (e.g., "7:00" for 10min stage)
- Define `phases` for boss behavior

### Step 5: Set Star Conditions
- Adjust thresholds for stage difficulty
- Add unique conditions (e.g., "no healing")

### Step 6: Test
- Play through each tier (3/5/10min)
- Verify spawn rates feel right
- Check boss timing
- Validate star conditions

---

## Engine Integration

The engine reads stage data via:
```javascript
const stage = EMBEDDED_DATA.stages;
const tier = 'standard'; // or 'quick' / 'highlight'
const multipliers = stage.tierMultipliers[tier];
```

**Key functions that consume stage data:**
- `SpawnSystem` — reads `waves`, `spawnConfig`, `tierMultipliers`
- `GameManager` — reads `starConditions`, `lootTable`
- `Renderer` — reads `background`, `obstacles`
- `AudioManager` — reads `bossConfig.announcement` for triggers

---

*Template v1.0 — August 29, 2026*
