// Extracted from game2.html — pure data, no logic.

const EMBEDDED_DATA = {
  characters: {
    id: "player_default",
    name: "The Survivor",
    description: "A lone hero fighting through the night.",
    stats: {
      maxHealth: 100,
      moveSpeed: 200,
      armor: 0,
      pickupRange: 50,
      magnetRange: 0,
      critChance: 0,
      critMultiplier: 1.5
    },
    hitbox: { width: 20, height: 20 },
    startingWeapon: "w1_projectile",
    visual: { shape: "square", size: 24, color: "#FFD700" }
  },

  weapons: [
    {
      id: "w1_projectile", name: "Projectile", type: "projectile",
      targeting: "nearest", unlockLevel: 1, orbDamageCooldown: 0,
      statsPerLevel: [
        { level: 1, damage: 8, cooldown: 1.00, projectileCount: 1 },
        { level: 2, damage: 10, cooldown: 0.95, projectileCount: 1 },
        { level: 3, damage: 12, cooldown: 0.90, projectileCount: 1 },
        { level: 4, damage: 15, cooldown: 0.85, projectileCount: 1 },
        { level: 5, damage: 18, cooldown: 0.80, projectileCount: 2 },
        { level: 6, damage: 22, cooldown: 0.75, projectileCount: 2 },
        { level: 7, damage: 28, cooldown: 0.65, projectileCount: 3 },
      ],
      powerSpikes: {
        level4: { name: "Pierce", description: "Pierces +1 enemy", statModifiers: { pierceCount: 1 } },
        level7: { name: "Split", description: "Splits into 3", statModifiers: { splitCount: 3 } },
      },
      visual: { shape: "square", color: "#FFD700" }
    },
    {
      id: "w2_orbit", name: "Orbit", type: "orbit",
      targeting: "self", unlockLevel: 3, orbDamageCooldown: 0.5,
      statsPerLevel: [
        { level: 1, damage: 5, cooldown: 2.00, orbitCount: 2, orbitSpeed: 2.00, orbitRadius: 80 },
        { level: 2, damage: 6, cooldown: 1.85, orbitCount: 2, orbitSpeed: 1.85, orbitRadius: 85 },
        { level: 3, damage: 7, cooldown: 1.70, orbitCount: 2, orbitSpeed: 1.70, orbitRadius: 90 },
        { level: 4, damage: 9, cooldown: 1.55, orbitCount: 3, orbitSpeed: 1.55, orbitRadius: 120 },
        { level: 5, damage: 11, cooldown: 1.40, orbitCount: 3, orbitSpeed: 1.40, orbitRadius: 130 },
        { level: 6, damage: 13, cooldown: 1.30, orbitCount: 4, orbitSpeed: 1.30, orbitRadius: 140 },
        { level: 7, damage: 16, cooldown: 1.00, orbitCount: 4, orbitSpeed: 1.00, orbitRadius: 160 },
      ],
      powerSpikes: {
        level4: { name: "Expanded Orbit", description: "+50% radius, +1 orb", statModifiers: { orbitRadiusBonus: 0.50 } },
        level7: { name: "Afterimage", description: "Damaging trails", statModifiers: { afterimageDuration: 0.5 } },
      },
      visual: { shape: "circle", color: "#4FC3F7" }
    },
    {
      id: "weapon_area_pulse", name: "Area", type: "area",
      targeting: "player_position", unlockLevel: 6, orbDamageCooldown: 0,
      statsPerLevel: [
        { level: 1, damage: 12, cooldown: 2.50, pulseRadius: 80, pulseCount: 1 },
        { level: 2, damage: 15, cooldown: 2.35, pulseRadius: 88, pulseCount: 1 },
        { level: 3, damage: 18, cooldown: 2.20, pulseRadius: 96, pulseCount: 1 },
        { level: 4, damage: 22, cooldown: 2.00, pulseRadius: 110, pulseCount: 2 },
        { level: 5, damage: 27, cooldown: 1.85, pulseRadius: 120, pulseCount: 2 },
        { level: 6, damage: 33, cooldown: 1.70, pulseRadius: 135, pulseCount: 2 },
        { level: 7, damage: 42, cooldown: 1.40, pulseRadius: 160, pulseCount: 3 },
      ],
      powerSpikes: {
        level4: { name: "Double Pulse", description: "Fires twice", statModifiers: { pulseCountBonus: 1 } },
        level7: { name: "Devastation", description: "Triple + stun", statModifiers: { thirdPulseStunDuration: 1.0 } },
      },
      visual: { shape: "circle", color: "#FF9100" }
    },
  ],

  enemies: [
    { id: "zombie", name: "Zombie", type: "normal",
      stats: { hp: 10, damage: 5, speed: 40, size: 10, xpValue: 1, goldValue: 1, goldCoins: { min: 1, max: 2 } },
      behavior: { pattern: "chase", params: { chaseSpeed: 40 } },
      drops: { powerUpTable: [{ type: "pickup_weapon_level_up", chance: 0.01 }] },
      spawn: { weight: 100, firstAppears: "0:00" }
    },
    { id: "bat", name: "Bat", type: "normal",
      stats: { hp: 5, damage: 3, speed: 100, size: 8, xpValue: 1, goldValue: 1, goldCoins: { min: 1, max: 1 } },
      behavior: { pattern: "swarm", params: { erraticism: 0.8 } },
      drops: { powerUpTable: [{ type: "magnet", chance: 0.05 }] },
      spawn: { weight: 80, firstAppears: "1:00" }
    },
    { id: "skeleton", name: "Skeleton", type: "normal",
      stats: { hp: 20, damage: 8, speed: 50, size: 12, xpValue: 3, goldValue: 2, goldCoins: { min: 2, max: 3 } },
      behavior: { pattern: "chase", params: { chaseSpeed: 50 } },
      drops: { powerUpTable: [{ type: "screen_wipe", chance: 0.02 }, { type: "pickup_weapon_level_up", chance: 0.01 }] },
      spawn: { weight: 60, firstAppears: "2:00" }
    },
    { id: "ghost", name: "Ghost", type: "normal",
      stats: { hp: 15, damage: 10, speed: 80, size: 12, xpValue: 2, goldValue: 2, goldCoins: { min: 2, max: 3 } },
      behavior: { pattern: "wander_chase", params: { wanderTime: 2, chaseTime: 4 } },
      drops: { powerUpTable: [{ type: "magnet", chance: 0.05 }, { type: "pickup_weapon_level_up", chance: 0.01 }] },
      spawn: { weight: 50, firstAppears: "2:30" }
    },
    { id: "caster", name: "Caster", type: "normal",
      stats: { hp: 12, damage: 8, speed: 50, size: 13, xpValue: 3, goldValue: 3, goldCoins: { min: 3, max: 4 } },
      behavior: { pattern: "ranged", params: { maintainDistance: 150, projectileDamage: 6, projectileSpeed: 150 } },
      drops: { powerUpTable: [{ type: "screen_wipe", chance: 0.02 }, { type: "pickup_weapon_level_up", chance: 0.01 }] },
      spawn: { weight: 45, firstAppears: "3:00" }
    },
    { id: "boss_gravekeeper", name: "The Gravekeeper", type: "boss",
      stats: { hp: 1000, damage: 15, speed: 70, size: 28, xpValue: 50, goldValue: 1, goldCoins: { min: 20, max: 30 } },
      behavior: { pattern: "boss_charge", params: { chargeDuration: 1.5, pauseDuration: 1.0 } },
      intro: {
        bossName: "The Gravekeeper",
        bossSubtitle: "Guardian of the Forgotten Dead",
        totalDuration: 3.5,
        allowSkip: true,
        dimColor: "rgba(0, 0, 0, 0.75)",
        nameColor: "#FF4444",
        subtitleColor: "#888888",
        nameFontSize: 40,
        subtitleFontSize: 18,
      },
      drops: { powerUpTable: [{ type: "pickup_weapon_level_up", chance: 1.0 }] },
      spawn: { weight: 0, firstAppears: "4:00" },
      phases: [
        { hpThreshold: 1.0, speed: 70, chargeInterval: 3.0, chargeDuration: 1.5, pauseDuration: 1.0, minionCount: 3, minionInterval: 3.0 },
        { hpThreshold: 0.5, speed: 100, chargeInterval: 2.0, chargeDuration: 1.5, pauseDuration: 0.8, minionCount: 5, minionInterval: 2.0,
          groundPound: { interval: 5.0, radius: 80, damage: 20, telegraphTime: 0.75 } }
      ],
      loot: { xp: 50, gold: { min: 20, max: 30 }, guaranteedPowerUp: "pickup_weapon_level_up" },
      screenWipeResistance: 0.8,
      chargeResumeBehavior: "continue_from_frozen"
    },
  ],

  stages: {
    id: "stage_graveyard",
    name: "The Graveyard",
    theme: "Gothic horror",
    background: { baseColor: "#1A1A2E", gridColor: "#16213E", gridSize: 50 },
    spawnConfig: { minDistance: 400, maxDistance: 600, maxEnemies: 200, baseSpawnRate: 0.8, spawnRateCap: 3.0, maxEnemyCapBehavior: "stop_spawn" },
    waves: [
      { time: "0:00-0:30", enemyTypes: ["zombie"], spawnRate: 0.8, compositionWeights: { zombie: 1.0 }, maxEnemies: 25 },
      { time: "0:30-1:00", enemyTypes: ["zombie"], spawnRate: 1.2, compositionWeights: { zombie: 1.0 }, maxEnemies: 40 },
      { time: "1:00-1:30", enemyTypes: ["zombie", "bat"], spawnRate: 1.5, compositionWeights: { zombie: 0.55, bat: 0.45 }, maxEnemies: 60 },
      { time: "1:30-2:00", enemyTypes: ["zombie", "bat"], spawnRate: 1.8, compositionWeights: { zombie: 0.55, bat: 0.45 }, maxEnemies: 80 },
      { time: "2:00-2:30", enemyTypes: ["zombie", "bat", "skeleton"], spawnRate: 2.0, compositionWeights: { zombie: 0.40, bat: 0.35, skeleton: 0.25 }, maxEnemies: 100 },
      { time: "2:30-3:00", enemyTypes: ["zombie", "bat", "skeleton", "ghost"], spawnRate: 2.2, compositionWeights: { zombie: 0.30, bat: 0.30, skeleton: 0.25, ghost: 0.15 }, maxEnemies: 120 },
      { time: "3:00-3:30", enemyTypes: ["zombie", "bat", "skeleton", "ghost", "caster"], spawnRate: 2.5, compositionWeights: { zombie: 0.25, bat: 0.25, skeleton: 0.20, ghost: 0.15, caster: 0.15 }, maxEnemies: 150 },
      { time: "3:30-4:00", enemyTypes: ["zombie", "bat", "skeleton", "ghost", "caster"], spawnRate: 3.0, compositionWeights: { zombie: 0.20, bat: 0.25, skeleton: 0.20, ghost: 0.15, caster: 0.20 }, maxEnemies: 180 },
      { time: "4:00-4:30", enemyTypes: ["zombie", "bat", "skeleton", "ghost", "caster", "boss_gravekeeper"], spawnRate: 2.0, compositionWeights: { zombie: 0.20, bat: 0.25, skeleton: 0.20, ghost: 0.15, caster: 0.20 }, maxEnemies: 150 },
      { time: "4:30-5:00", enemyTypes: ["zombie", "bat", "skeleton", "ghost", "caster", "boss_gravekeeper"], spawnRate: 1.5, compositionWeights: { zombie: 0.20, bat: 0.25, skeleton: 0.20, ghost: 0.15, caster: 0.20 }, maxEnemies: 120 },
    ],
    difficultyScaling: { hpMultiplier: "1 + 0.15 * minutes_after_boss_kill", damageMultiplier: "1 + 0.10 * minutes_after_boss_kill", timerStart: "boss_death_timestamp" },
    xpScaling: { formula: "base_xp * (1 + 0.05 * floor(t / 60))" },
    bossConfig: {
      enemyId: "boss_gravekeeper", spawnTime: "4:00",
      announcement: [
        { time: 230, text: "Something stirs in the darkness...", type: "text", styling: { fontSize: 24, position: "center", animation: "fadeInHoldFadeOut" } },
        { time: 230, type: "dim", brightness: 0.8 },
        { time: 235, text: "The Gravekeeper rises!", type: "shake", styling: { fontSize: 28, position: "center", animation: "scalePulse" } },
        { time: 240, type: "boss_spawn", position: "nearest_edge_to_player" }
      ]
    },
    obstacles: {
      types: 5, collisionRules: "player+enemies collide, projectiles+pickups pass through",
      weights: { small_tombstone: 0.30, large_tombstone: 0.10, grave_mound: 0.25, broken_wall: 0.15, cracked_floor: 0.20 },
      seedDerivation: "hash(stageId + difficultyLevel)"
    },
    weaponLoadouts: {
      quick: { duration: 180, weapons: ["w1_projectile", "w4_flame_wave", "weapon_area_pulse"], description: "Frontloaded for fast clears" },
      standard: { duration: 300, weapons: ["w1_projectile", "w2_orbit", "weapon_area_pulse"], description: "Balanced for standard play" },
      highlight: { duration: 600, weapons: ["w1_projectile", "w5_arcane_bolt", "weapon_area_pulse"], description: "Scaling for extended runs" },
    },
    tierMultipliers: {
      quick: { hp: 0.8, damage: 0.9, spawnRate: 1.5, maxEnemies: 0.8, gold: 0.8, xp: 1.2 },
      standard: { hp: 1.0, damage: 1.0, spawnRate: 1.0, maxEnemies: 1.0, gold: 1.0, xp: 1.0 },
      highlight: { hp: 1.3, damage: 1.2, spawnRate: 1.0, maxEnemies: 1.2, gold: 1.5, xp: 1.0 },
    }
  },

  pickups: [
    { id: "exp_small", name: "XP Gem (Small)", type: "exp_small", value: 1,
      visual: { shape: "diamond", color: "#4FC3F7", size: 8 },
      behavior: { duration: null, attractRadius: 50, attractSpeed: 0, instantBurstRadius: 0 },
      dropConfig: { sources: [{ enemyId: "zombie", chance: 1.0 }, { enemyId: "bat", chance: 1.0 }, { enemyId: "skeleton", chance: 1.0 }, { enemyId: "ghost", chance: 1.0 }, { enemyId: "caster", chance: 1.0 }], guaranteedDropEnemies: [], rollOrder: 0 }
    },
    { id: "exp_large", name: "XP Gem (Large)", type: "exp_large", value: 5,
      visual: { shape: "diamond", color: "#81D4FA", size: 14 },
      behavior: { duration: null, attractRadius: 50, attractSpeed: 0, instantBurstRadius: 0 },
      dropConfig: { sources: [], guaranteedDropEnemies: ["boss_gravekeeper"], rollOrder: 0 }
    },
    { id: "gold_coin", name: "Gold Coin", type: "gold", value: 0,
      visual: { shape: "circle", color: "#FFD700", size: 10 },
      behavior: { duration: 30, attractRadius: 50, attractSpeed: 0, instantBurstRadius: 0 },
      dropConfig: { sources: [{ enemyId: "zombie", chance: 1.0 }, { enemyId: "bat", chance: 1.0 }, { enemyId: "skeleton", chance: 1.0 }, { enemyId: "ghost", chance: 1.0 }, { enemyId: "caster", chance: 1.0 }, { enemyId: "boss_gravekeeper", chance: 1.0 }], guaranteedDropEnemies: [], rollOrder: 0 },
      goldValuePerCoin: 1
    },
    { id: "screen_wipe", name: "Screen Wipe", type: "screen_wipe", value: 0,
      visual: { shape: "star", color: "#00E676", size: 16 },
      behavior: { duration: null, attractRadius: 50, attractSpeed: 0, instantBurstRadius: 0 },
      dropConfig: { sources: [{ enemyId: "skeleton", chance: 0.02 }, { enemyId: "caster", chance: 0.02 }], guaranteedDropEnemies: [], rollOrder: 2 },
      killsAllEnemies: true, bossDamage: 200, bossResistance: 0.8, powerUpDespawnTime: null
    },
    { id: "magnet", name: "Magnet", type: "magnet", value: 0,
      visual: { shape: "circle", color: "#FF4081", size: 14 },
      behavior: { duration: 10, attractRadius: 350, attractSpeed: 400, instantBurstRadius: 150 },
      dropConfig: { sources: [{ enemyId: "bat", chance: 0.05 }, { enemyId: "ghost", chance: 0.05 }], guaranteedDropEnemies: [], rollOrder: 3 },
      powerUpDespawnTime: null
    },
    { id: "pickup_weapon_level_up", name: "Weapon Level-Up", type: "pickup_weapon_level_up", value: 0,
      visual: { shape: "triangle", color: "#FF9100", size: 16 },
      behavior: { duration: null, attractRadius: 50, attractSpeed: 0, instantBurstRadius: 0 },
      dropConfig: { sources: [{ enemyId: "zombie", chance: 0.01 }, { enemyId: "skeleton", chance: 0.01 }, { enemyId: "ghost", chance: 0.01 }, { enemyId: "caster", chance: 0.01 }], guaranteedDropEnemies: ["boss_gravekeeper"], rollOrder: 1 },
      powerUpDespawnTime: null
    },
  ],

  leveling: {
    xpCurve: [
      { level: 1, xpToNext: 5, cumulativeXp: 0 },
      { level: 2, xpToNext: 10, cumulativeXp: 5 },
      { level: 3, xpToNext: 15, cumulativeXp: 15 },
      { level: 4, xpToNext: 22, cumulativeXp: 30 },
      { level: 5, xpToNext: 32, cumulativeXp: 52 },
      { level: 6, xpToNext: 45, cumulativeXp: 84 },
      { level: 7, xpToNext: 62, cumulativeXp: 129 },
      { level: 8, xpToNext: 85, cumulativeXp: 191 },
      { level: 9, xpToNext: 115, cumulativeXp: 276 },
      { level: 10, xpToNext: 155, cumulativeXp: 391 },
      { level: 11, xpToNext: 210, cumulativeXp: 546 },
      { level: 12, xpToNext: 280, cumulativeXp: 756 },
      { level: 13, xpToNext: 375, cumulativeXp: 1036 },
      { level: 14, xpToNext: 375, cumulativeXp: 1411 },
    ],
    formula: { forLevel: 14, expression: "floor(375 * 1.3^(N-14))" },
    upgradePool: { weaponWeight: 0.6, passiveWeight: 0.4, weaponUnlockGuaranteed: true },
    passiveOptions: [
      { id: "max_health", name: "Max Health +20%", stat: "maxHealth", value: 0.20, description: "Increases maximum HP by 20%", maxStacks: 5, icon: "heart" },
      { id: "move_speed", name: "Move Speed +10%", stat: "moveSpeed", value: 0.10, description: "Increases movement speed by 10%", maxStacks: 3, icon: "speed" },
      { id: "armor", name: "Armor +1", stat: "armor", value: 1, description: "Reduces all damage by 1", maxStacks: 3, icon: "shield" },
      { id: "pickup_range", name: "Pickup Range +25px", stat: "pickupRange", value: 25, description: "Collect pickups from further", maxStacks: 4, icon: "magnet" },
      { id: "crit_chance", name: "Crit Chance +5%", stat: "critChance", value: 0.05, description: "5% chance for 1.5x damage", maxStacks: 4, icon: "star" },
    ],
    maxLevelUpQueue: 3,
    excessXPBehavior: "carry_over",
    maxHealthPassiveHealsCurrent: true,
  },
};
