// Extracted from game2.html - pure data, no logic.

const EMBEDDED_DATA = {
  characters: {
    id: "player_default",
    name: "The Survivor",
    stats: {
      maxHealth: 100,
      moveSpeed: 200,
      armor: 0,
      pickupRange: 50,
      magnetRange: 0,
      critChance: 0,
      critMultiplier: 1.5
    },
    hitbox: {
      width: 20,
      height: 20
    },
    startingWeapon: "w1_projectile",
    visual: {
      shape: "square",
      size: 24,
      color: "#FFD700"
    }
  },
  weapons: [
    {
      id: "w1_projectile",
      name: "Projectile",
      type: "projectile",
      targeting: "nearest",
      unlockLevel: 1,
      orbDamageCooldown: 0,
      statsPerLevel: [
        {
          level: 1,
          damage: 8,
          cooldown: 1,
          projectileCount: 1
        },
        {
          level: 2,
          damage: 10,
          cooldown: 0.95,
          projectileCount: 1
        },
        {
          level: 3,
          damage: 12,
          cooldown: 0.9,
          projectileCount: 1
        },
        {
          level: 4,
          damage: 15,
          cooldown: 0.85,
          projectileCount: 1
        },
        {
          level: 5,
          damage: 18,
          cooldown: 0.8,
          projectileCount: 2
        },
        {
          level: 6,
          damage: 22,
          cooldown: 0.75,
          projectileCount: 2
        },
        {
          level: 7,
          damage: 28,
          cooldown: 0.65,
          projectileCount: 3
        }
      ],
      powerSpikes: {
        level4: {
          name: "Pierce",
          statModifiers: {
            pierceCount: 1
          }
        },
        level7: {
          name: "Split",
          statModifiers: {
            splitCount: 3
          }
        }
      },
      visual: {
        shape: "square",
        color: "#FFD700"
      }
    },
    {
      id: "w2_orbit",
      name: "Orbit",
      type: "orbit",
      targeting: "self",
      unlockLevel: 3,
      orbDamageCooldown: 0.5,
      statsPerLevel: [
        {
          level: 1,
          damage: 5,
          cooldown: 2,
          orbitCount: 2,
          orbitSpeed: 2,
          orbitRadius: 80
        },
        {
          level: 2,
          damage: 6,
          cooldown: 1.85,
          orbitCount: 2,
          orbitSpeed: 1.85,
          orbitRadius: 85
        },
        {
          level: 3,
          damage: 7,
          cooldown: 1.7,
          orbitCount: 2,
          orbitSpeed: 1.7,
          orbitRadius: 90
        },
        {
          level: 4,
          damage: 9,
          cooldown: 1.55,
          orbitCount: 3,
          orbitSpeed: 1.55,
          orbitRadius: 120
        },
        {
          level: 5,
          damage: 11,
          cooldown: 1.4,
          orbitCount: 3,
          orbitSpeed: 1.4,
          orbitRadius: 130
        },
        {
          level: 6,
          damage: 13,
          cooldown: 1.3,
          orbitCount: 4,
          orbitSpeed: 1.3,
          orbitRadius: 140
        },
        {
          level: 7,
          damage: 16,
          cooldown: 1,
          orbitCount: 4,
          orbitSpeed: 1,
          orbitRadius: 160
        }
      ],
      powerSpikes: {
        level4: {
          name: "Expanded Orbit",
          statModifiers: {
            orbitRadiusBonus: 0.5
          }
        },
        level7: {
          name: "Afterimage",
          statModifiers: {
            afterimageDuration: 0.5
          }
        }
      },
      visual: {
        shape: "circle",
        color: "#4FC3F7"
      }
    },
    {
      id: "weapon_area_pulse",
      name: "Area",
      type: "area",
      targeting: "player_position",
      unlockLevel: 6,
      orbDamageCooldown: 0,
      statsPerLevel: [
        {
          level: 1,
          damage: 12,
          cooldown: 2.5,
          pulseRadius: 80,
          pulseCount: 1
        },
        {
          level: 2,
          damage: 15,
          cooldown: 2.35,
          pulseRadius: 88,
          pulseCount: 1
        },
        {
          level: 3,
          damage: 18,
          cooldown: 2.2,
          pulseRadius: 96,
          pulseCount: 1
        },
        {
          level: 4,
          damage: 22,
          cooldown: 2,
          pulseRadius: 110,
          pulseCount: 2
        },
        {
          level: 5,
          damage: 27,
          cooldown: 1.85,
          pulseRadius: 120,
          pulseCount: 2
        },
        {
          level: 6,
          damage: 33,
          cooldown: 1.7,
          pulseRadius: 135,
          pulseCount: 2
        },
        {
          level: 7,
          damage: 42,
          cooldown: 1.4,
          pulseRadius: 160,
          pulseCount: 3
        }
      ],
      powerSpikes: {
        level4: {
          name: "Double Pulse",
          statModifiers: {
            pulseCountBonus: 1
          }
        },
        level7: {
          name: "Devastation",
          statModifiers: {
            thirdPulseStunDuration: 1
          }
        }
      },
      visual: {
        shape: "circle",
        color: "#FF9100"
      }
    },
    {
      id: "w4_flame_wave",
      name: "Flame Wave",
      type: "cone",
      targeting: "nearest",
      unlockLevel: 1,
      orbDamageCooldown: 0,
      statsPerLevel: [
        {
          level: 1,
          damage: 20,
          cooldown: 0.8,
          coneAngle: 60,
          coneRange: 60
        },
        {
          level: 2,
          damage: 28,
          cooldown: 0.7,
          coneAngle: 60,
          coneRange: 65
        },
        {
          level: 3,
          damage: 36,
          cooldown: 0.6,
          coneAngle: 60,
          coneRange: 70
        },
        {
          level: 4,
          damage: 45,
          cooldown: 0.5,
          coneAngle: 70,
          coneRange: 80
        },
        {
          level: 5,
          damage: 50,
          cooldown: 0.48,
          coneAngle: 70,
          coneRange: 82
        },
        {
          level: 6,
          damage: 54,
          cooldown: 0.46,
          coneAngle: 70,
          coneRange: 84
        },
        {
          level: 7,
          damage: 58,
          cooldown: 0.45,
          coneAngle: 75,
          coneRange: 85
        }
      ],
      powerSpikes: {
        level4: {
          name: "Inferno",
          statModifiers: {
            burnDuration: 3,
            burnDamage: 5
          }
        },
        level7: {
          name: "Explosion",
          statModifiers: {
            explodeRadius: 40,
            explodeDamage: 15
          }
        }
      },
      visual: {
        shape: "cone",
        color: "#FF4500"
      }
    },
    {
      id: "w5_arcane_bolt",
      name: "Arcane Bolt",
      type: "chain",
      targeting: "nearest",
      unlockLevel: 1,
      orbDamageCooldown: 0,
      statsPerLevel: [
        {
          level: 1,
          damage: 5,
          cooldown: 2,
          chainCount: 0,
          chainRange: 80
        },
        {
          level: 2,
          damage: 7,
          cooldown: 1.9,
          chainCount: 0,
          chainRange: 80
        },
        {
          level: 3,
          damage: 10,
          cooldown: 1.8,
          chainCount: 0,
          chainRange: 80
        },
        {
          level: 4,
          damage: 14,
          cooldown: 1.6,
          chainCount: 1,
          chainRange: 80
        },
        {
          level: 5,
          damage: 22,
          cooldown: 1.3,
          chainCount: 2,
          chainRange: 90
        },
        {
          level: 6,
          damage: 35,
          cooldown: 1,
          chainCount: 3,
          chainRange: 100
        },
        {
          level: 7,
          damage: 55,
          cooldown: 0.7,
          chainCount: 5,
          chainRange: 120
        }
      ],
      powerSpikes: {
        level4: {
          name: "Chain Lightning",
          statModifiers: {
            chainCount: 1
          }
        },
        level7: {
          name: "Arcane Storm",
          statModifiers: {
            chainCount: 5,
            slowAmount: 0.5,
            slowDuration: 2
          }
        }
      },
      visual: {
        shape: "diamond",
        color: "#9C27B0"
      }
    },
    {
      id: "w6_dagger",
      name: "Dagger",
      type: "melee_cone",
      targeting: "nearest",
      unlockLevel: 1,
      orbDamageCooldown: 0,
      statsPerLevel: [
        {
          level: 1,
          damage: 4,
          cooldown: 0.5,
          hitCount: 1,
          range: 50,
          coneWidth: 30
        },
        {
          level: 2,
          damage: 5,
          cooldown: 0.45,
          hitCount: 1,
          range: 55,
          coneWidth: 30
        },
        {
          level: 3,
          damage: 6,
          cooldown: 0.4,
          hitCount: 1,
          range: 60,
          coneWidth: 35
        },
        {
          level: 4,
          damage: 7,
          cooldown: 0.35,
          hitCount: 3,
          range: 60,
          coneWidth: 40
        },
        {
          level: 5,
          damage: 8,
          cooldown: 0.32,
          hitCount: 3,
          range: 65,
          coneWidth: 45
        },
        {
          level: 6,
          damage: 9,
          cooldown: 0.28,
          hitCount: 3,
          range: 70,
          coneWidth: 50
        },
        {
          level: 7,
          damage: 10,
          cooldown: 0.25,
          hitCount: 5,
          range: 100,
          coneWidth: 60,
          homing: true,
          homingTurnRate: 200
        }
      ],
      powerSpikes: {
        level4: {
          name: "Triple Stab",
        },
        level7: {
          name: "Homing Daggers",
        }
      },
      visual: {
        shape: "triangle",
        color: "#9B59B6"
      }
    },
    {
      id: "w7_sword",
      name: "Soul Sword",
      type: "melee_combo",
      targeting: "self",
      unlockLevel: 1,
      orbDamageCooldown: 0,
      statsPerLevel: [
        {
          level: 1,
          damage: 6,
          cooldown: 1.4,
          range: 140,
          arcWidth: 80,
          comboHits: 3
        },
        {
          level: 2,
          damage: 7,
          cooldown: 1.3,
          range: 150,
          arcWidth: 85,
          comboHits: 3
        },
        {
          level: 3,
          damage: 8,
          cooldown: 1.2,
          range: 160,
          arcWidth: 90,
          comboHits: 3
        },
        {
          level: 4,
          damage: 10,
          cooldown: 1.1,
          range: 170,
          arcWidth: 100,
          comboHits: 3
        },
        {
          level: 5,
          damage: 12,
          cooldown: 1,
          range: 175,
          arcWidth: 110,
          comboHits: 3
        },
        {
          level: 6,
          damage: 15,
          cooldown: 0.9,
          range: 180,
          arcWidth: 120,
          comboHits: 3
        },
        {
          level: 7,
          damage: 18,
          cooldown: 0.8,
          range: 180,
          arcWidth: 160,
          comboHits: 3
        }
      ],
      powerSpikes: {
        level4: {
          name: "Wide Arc",
        },
        level7: {
          name: "Crimson Whip",
        }
      },
      visual: {
        shape: "arc",
        color: "#3498DB"
      }
    },
    {
      id: "w8_claymore",
      name: "Claymore",
      type: "melee_slam",
      targeting: "nearest",
      unlockLevel: 1,
      orbDamageCooldown: 0,
      statsPerLevel: [
        {
          level: 1,
          damage: 18,
          cooldown: 2,
          range: 100,
          aoeWidth: 120
        },
        {
          level: 2,
          damage: 22,
          cooldown: 1.85,
          range: 105,
          aoeWidth: 130
        },
        {
          level: 3,
          damage: 28,
          cooldown: 1.7,
          range: 110,
          aoeWidth: 140
        },
        {
          level: 4,
          damage: 35,
          cooldown: 1.55,
          range: 115,
          aoeWidth: 150,
          explosionDmgPct: 0.5,
          explosionRadius: 100
        },
        {
          level: 5,
          damage: 42,
          cooldown: 1.4,
          range: 120,
          aoeWidth: 160,
          explosionDmgPct: 0.5,
          explosionRadius: 110
        },
        {
          level: 6,
          damage: 50,
          cooldown: 1.3,
          range: 130,
          aoeWidth: 170,
          explosionDmgPct: 0.5,
          explosionRadius: 120
        },
        {
          level: 7,
          damage: 65,
          cooldown: 1.15,
          range: 140,
          aoeWidth: 200,
          explosionDmgPct: 0.6,
          explosionRadius: 150
        }
      ],
      powerSpikes: {
        level4: {
          name: "Ground Explosion",
        },
        level7: {
          name: "Devastation",
        }
      },
      visual: {
        shape: "rectangle",
        color: "#7F8C8D"
      }
    }
  ],
  enemies: [
    {
      id: "zombie",
      name: "Zombie",
      type: "normal",
      stats: {
        hp: 10,
        damage: 5,
        speed: 40,
        size: 10,
        xpValue: 1,
        goldValue: 1,
        goldCoins: {
          min: 1,
          max: 2
        }
      },
      behavior: {
        pattern: "chase",
        params: {
          chaseSpeed: 40
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "pickup_weapon_level_up",
            chance: 0.01
          }
        ]
      },
      spawn: {
        weight: 100,
        firstAppears: "0:00"
      }
    },
    {
      id: "bat",
      name: "Bat",
      type: "normal",
      stats: {
        hp: 5,
        damage: 3,
        speed: 100,
        size: 8,
        xpValue: 1,
        goldValue: 1,
        goldCoins: {
          min: 1,
          max: 1
        }
      },
      behavior: {
        pattern: "swarm",
        params: {
          erraticism: 0.8
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "magnet",
            chance: 0.05
          }
        ]
      },
      spawn: {
        weight: 80,
        firstAppears: "1:00"
      }
    },
    {
      id: "skeleton",
      name: "Skeleton",
      type: "normal",
      stats: {
        hp: 20,
        damage: 8,
        speed: 50,
        size: 12,
        xpValue: 3,
        goldValue: 2,
        goldCoins: {
          min: 2,
          max: 3
        }
      },
      behavior: {
        pattern: "chase",
        params: {
          chaseSpeed: 50
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "screen_wipe",
            chance: 0.02
          },
          {
            type: "pickup_weapon_level_up",
            chance: 0.01
          }
        ]
      },
      spawn: {
        weight: 60,
        firstAppears: "2:00"
      }
    },
    {
      id: "ghost",
      name: "Ghost",
      type: "normal",
      stats: {
        hp: 15,
        damage: 10,
        speed: 80,
        size: 12,
        xpValue: 2,
        goldValue: 2,
        goldCoins: {
          min: 2,
          max: 3
        }
      },
      behavior: {
        pattern: "wander_chase",
        params: {
          wanderTime: 2,
          chaseTime: 4
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "magnet",
            chance: 0.05
          },
          {
            type: "pickup_weapon_level_up",
            chance: 0.01
          }
        ]
      },
      spawn: {
        weight: 50,
        firstAppears: "2:30"
      }
    },
    {
      id: "caster",
      name: "Caster",
      type: "normal",
      stats: {
        hp: 12,
        damage: 8,
        speed: 50,
        size: 13,
        xpValue: 3,
        goldValue: 3,
        goldCoins: {
          min: 3,
          max: 4
        }
      },
      behavior: {
        pattern: "ranged",
        params: {
          maintainDistance: 150,
          projectileDamage: 6,
          projectileSpeed: 150
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "screen_wipe",
            chance: 0.02
          },
          {
            type: "pickup_weapon_level_up",
            chance: 0.01
          }
        ]
      },
      spawn: {
        weight: 45,
        firstAppears: "3:00"
      }
    },
    {
      id: "rat",
      name: "Rat",
      type: "normal",
      stats: {
        hp: 6,
        damage: 6,
        speed: 120,
        size: 7,
        xpValue: 1,
        goldValue: 1,
        goldCoins: {
          min: 1,
          max: 1
        }
      },
      behavior: {
        pattern: "swarm",
        params: {
          erraticism: 0.9
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "magnet",
            chance: 0.03
          },
          {
            type: "pickup_weapon_level_up",
            chance: 0.01
          }
        ]
      },
      spawn: {
        weight: 70,
        firstAppears: "1:30"
      }
    },
    {
      id: "brute",
      name: "Brute",
      type: "normal",
      stats: {
        hp: 40,
        damage: 12,
        speed: 30,
        size: 16,
        xpValue: 5,
        goldValue: 4,
        goldCoins: {
          min: 3,
          max: 5
        }
      },
      behavior: {
        pattern: "chase",
        params: {
          chaseSpeed: 30
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "screen_wipe",
            chance: 0.02
          },
          {
            type: "pickup_weapon_level_up",
            chance: 0.015
          }
        ]
      },
      spawn: {
        weight: 30,
        firstAppears: "3:00"
      }
    },
    {
      id: "boss_gravekeeper",
      name: "The Gravekeeper",
      type: "boss",
      stats: {
        hp: 1000,
        damage: 15,
        speed: 70,
        size: 28,
        xpValue: 50,
        goldValue: 1,
        goldCoins: {
          min: 20,
          max: 30
        }
      },
      behavior: {
        pattern: "boss_charge",
        params: {
          chargeDuration: 1.5,
          pauseDuration: 1
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "pickup_weapon_level_up",
            chance: 1
          }
        ]
      },
      spawn: {
        weight: 0,
        firstAppears: "4:00"
      },
      phases: [
        {
          hpThreshold: 1,
          speed: 70,
          chargeInterval: 3,
          chargeDuration: 1.5,
          pauseDuration: 1,
          minionCount: 3,
          minionInterval: 3
        },
        {
          hpThreshold: 0.5,
          speed: 100,
          chargeInterval: 2,
          chargeDuration: 1.5,
          pauseDuration: 0.8,
          minionCount: 5,
          minionInterval: 2,
          groundPound: {
            interval: 5,
            radius: 80,
            damage: 20,
            telegraphTime: 0.75
          }
        }
      ],
      loot: {
        xp: 50,
        gold: {
          min: 20,
          max: 30
        },
        guaranteedPowerUp: "pickup_weapon_level_up"
      },
      screenWipeResistance: 0.8,
      chargeResumeBehavior: "continue_from_frozen"
    },
    {
      id: "boss_necromancer",
      name: "Lilith the Necromancer",
      type: "boss",
      stats: {
        hp: 1200,
        damage: 18,
        speed: 65,
        size: 30,
        xpValue: 75,
        goldValue: 1,
        goldCoins: {
          min: 25,
          max: 35
        }
      },
      behavior: {
        pattern: "boss_charge",
        params: {
          chargeDuration: 1.2,
          pauseDuration: 0.8
        }
      },
      intro: {
        bossName: "Lilith the Necromancer",
        bossSubtitle: "She who commands the dead",
        totalDuration: 4,
        allowSkip: true,
        dimColor: "rgba(20, 0, 40, 0.80)",
        nameColor: "#C77DFF",
        subtitleColor: "#888888",
        nameFontSize: 36,
        subtitleFontSize: 16
      },
      drops: {
        powerUpTable: [
          {
            type: "pickup_weapon_level_up",
            chance: 1
          }
        ]
      },
      spawn: {
        weight: 0,
        firstAppears: "8:35"
      },
      phases: [
        {
          hpThreshold: 1,
          speed: 40,
          chargeInterval: 3,
          chargeDuration: 1.2,
          pauseDuration: 0.8,
          minionCount: 2,
          minionInterval: 8,
          magicBolt: {
            interval: 3,
            damage: 8,
            speed: 120
          }
        },
        {
          hpThreshold: 0.6,
          speed: 60,
          chargeInterval: 2,
          chargeDuration: 1.2,
          pauseDuration: 0.6,
          minionCount: 3,
          minionInterval: 6,
          magicBolt: {
            interval: 2,
            damage: 8,
            speed: 120
          },
          skullRing: {
            interval: 8,
            count: 8,
            damage: 10,
            speed: 100
          }
        },
        {
          hpThreshold: 0.3,
          speed: 80,
          chargeInterval: 1.5,
          chargeDuration: 1,
          pauseDuration: 0.5,
          minionCount: 4,
          minionInterval: 4,
          magicBolt: {
            interval: 1.5,
            damage: 8,
            speed: 150
          },
          skullRing: {
            interval: 5,
            count: 8,
            damage: 10,
            speed: 120
          },
          shadowStep: {
            interval: 6,
            windup: 0.5
          }
        }
      ],
      loot: {
        xp: 75,
        gold: {
          min: 25,
          max: 35
        },
        guaranteedPowerUp: "pickup_weapon_level_up"
      },
      screenWipeResistance: 0.8,
      chargeResumeBehavior: "continue_from_frozen"
    },
    {
      id: "ghoul",
      name: "Ghoul",
      type: "miniboss",
      stats: {
        hp: 300,
        damage: 18,
        speed: 60,
        size: 22,
        xpValue: 30,
        goldValue: 15,
        goldCoins: {
          min: 15,
          max: 20
        }
      },
      behavior: {
        pattern: "ghoul_lunge",
        params: {
          lungeDistance: 200,
          lungeSpeed: 300,
          windup: 0.5,
          stunDuration: 1.5
        }
      },
      drops: {
        powerUpTable: [
          {
            type: "pickup_weapon_level_up",
            chance: 1
          },
          {
            type: "magnet",
            chance: 0.5
          }
        ]
      },
      spawn: {
        weight: 0,
        firstAppears: "7:00"
      },
      phases: [],
      screenWipeResistance: 0.5
    }
  ],
  stages: [
    {
      id: "stage_graveyard",
      name: "The Graveyard",
      theme: "Gothic horror",
      tier: "standard",
      duration: 300,
      background: {
        baseColor: "#1A1A2E",
        gridColor: "#16213E",
        gridSize: 50
      },
      spawnConfig: {
        minDistance: 400,
        maxDistance: 600,
        maxEnemies: 200,
        baseSpawnRate: 0.8,
        spawnRateCap: 3
      },
      waves: [
        {
          time: "0:00-0:30",
          enemyTypes: [
            "zombie"
          ],
          spawnRate: 0.8,
          compositionWeights: {
            zombie: 1
          },
          maxEnemies: 25
        },
        {
          time: "0:30-1:00",
          enemyTypes: [
            "zombie"
          ],
          spawnRate: 1.2,
          compositionWeights: {
            zombie: 1
          },
          maxEnemies: 40
        },
        {
          time: "1:00-1:30",
          enemyTypes: [
            "zombie",
            "bat"
          ],
          spawnRate: 1.5,
          compositionWeights: {
            zombie: 0.55,
            bat: 0.45
          },
          maxEnemies: 60
        },
        {
          time: "1:30-2:00",
          enemyTypes: [
            "zombie",
            "bat",
            "rat"
          ],
          spawnRate: 1.8,
          compositionWeights: {
            zombie: 0.4,
            bat: 0.35,
            rat: 0.25
          },
          maxEnemies: 80
        },
        {
          time: "2:00-2:30",
          enemyTypes: [
            "zombie",
            "bat",
            "skeleton"
          ],
          spawnRate: 2,
          compositionWeights: {
            zombie: 0.4,
            bat: 0.35,
            skeleton: 0.25
          },
          maxEnemies: 100
        },
        {
          time: "2:30-3:00",
          enemyTypes: [
            "zombie",
            "bat",
            "skeleton",
            "ghost"
          ],
          spawnRate: 2.2,
          compositionWeights: {
            zombie: 0.3,
            bat: 0.3,
            skeleton: 0.25,
            ghost: 0.15
          },
          maxEnemies: 120
        },
        {
          time: "3:00-3:30",
          enemyTypes: [
            "zombie",
            "bat",
            "skeleton",
            "ghost",
            "caster",
            "rat",
            "brute"
          ],
          spawnRate: 2.5,
          compositionWeights: {
            zombie: 0.2,
            bat: 0.2,
            skeleton: 0.15,
            ghost: 0.1,
            caster: 0.1,
            rat: 0.15,
            brute: 0.1
          },
          maxEnemies: 150
        },
        {
          time: "3:30-4:00",
          enemyTypes: [
            "zombie",
            "bat",
            "skeleton",
            "ghost",
            "caster",
            "rat",
            "brute"
          ],
          spawnRate: 3,
          compositionWeights: {
            zombie: 0.15,
            bat: 0.2,
            skeleton: 0.15,
            ghost: 0.1,
            caster: 0.15,
            rat: 0.15,
            brute: 0.1
          },
          maxEnemies: 180
        },
        {
          time: "4:00-4:30",
          enemyTypes: [
            "zombie",
            "bat",
            "skeleton",
            "ghost",
            "caster"
          ],
          spawnRate: 2,
          maxEnemies: 150
        },
        {
          time: "4:30-5:00",
          enemyTypes: [
            "zombie",
            "bat",
            "skeleton",
            "ghost",
            "caster"
          ],
          spawnRate: 1.5,
          maxEnemies: 120
        }
      ],
      bossConfig: {
        enemyId: "boss_gravekeeper",
        spawnTime: "4:00",
        announcement: [
          {
            time: 230,
            text: "Something stirs in the darkness...",
            type: "text"
          },
          {
            time: 235,
            text: "The Gravekeeper rises!",
            type: "shake"
          },
          {
            time: 240,
            type: "boss_spawn"
          }
        ]
      },
      tierConfig: {
        quick: {
          duration: 180,
          recommendedWeapons: [
            "w1_projectile",
            "w4_flame_wave",
            "weapon_area_pulse"
          ],
        },
        standard: {
          duration: 300,
          recommendedWeapons: [
            "w1_projectile",
            "w2_orbit",
            "weapon_area_pulse"
          ],
        },
        highlight: {
          duration: 600,
          recommendedWeapons: [
            "w1_projectile",
            "w5_arcane_bolt",
            "weapon_area_pulse"
          ],
        }
      },
      tierMultipliers: {
        quick: {
          hp: 0.8,
          damage: 0.9,
          spawnRate: 1.5,
          maxEnemies: 0.8,
          gold: 0.8,
          xp: 1.2
        },
        standard: {
          hp: 1,
          damage: 1,
          spawnRate: 1,
          maxEnemies: 1,
          gold: 1,
          xp: 1
        },
        highlight: {
          hp: 1.3,
          damage: 1.2,
          spawnRate: 1,
          maxEnemies: 1.2,
          gold: 1.5,
          xp: 1
        }
      },
    },
    {
      id: "stage_graveyard_extended",
      name: "The Graveyard (Extended)",
      theme: "Gothic horror",
      tier: "standard",
      duration: 600,
      background: {
        baseColor: "#1A1A2E",
        gridColor: "#16213E",
        gridSize: 50
      },
      spawnConfig: {
        minDistance: 400,
        maxDistance: 600,
        maxEnemies: 200,
        baseSpawnRate: 0.8,
        spawnRateCap: 3
      },
      waves: [
        {
          time: "0:00-0:30",
          enemyTypes: [
            "zombie"
          ],
          spawnRate: 0.8,
          compositionWeights: {
            zombie: 1
          },
          maxEnemies: 20
        },
        {
          time: "0:30-1:00",
          enemyTypes: [
            "zombie"
          ],
          spawnRate: 1.2,
          compositionWeights: {
            zombie: 1
          },
          maxEnemies: 35
        },
        {
          time: "1:00-1:30",
          enemyTypes: [
            "zombie",
            "bat"
          ],
          spawnRate: 1.5,
          compositionWeights: {
            zombie: 0.55,
            bat: 0.45
          },
          maxEnemies: 50
        },
        {
          time: "1:30-2:00",
          enemyTypes: [
            "zombie",
            "bat",
            "rat"
          ],
          spawnRate: 1.8,
          compositionWeights: {
            zombie: 0.4,
            bat: 0.35,
            rat: 0.25
          },
          maxEnemies: 65
        },
        {
          time: "2:00-2:30",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton"
          ],
          spawnRate: 2,
          compositionWeights: {
            zombie: 0.3,
            bat: 0.25,
            rat: 0.2,
            skeleton: 0.25
          },
          maxEnemies: 80
        },
        {
          time: "2:30-3:00",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton"
          ],
          spawnRate: 2.2,
          compositionWeights: {
            zombie: 0.25,
            bat: 0.25,
            rat: 0.25,
            skeleton: 0.25
          },
          maxEnemies: 95
        },
        {
          time: "3:00-3:30",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton",
            "ghost"
          ],
          spawnRate: 2.5,
          compositionWeights: {
            zombie: 0.25,
            bat: 0.2,
            rat: 0.2,
            skeleton: 0.2,
            ghost: 0.15
          },
          maxEnemies: 110
        },
        {
          time: "3:30-4:00",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton",
            "ghost",
            "caster"
          ],
          spawnRate: 2.8,
          compositionWeights: {
            zombie: 0.2,
            bat: 0.2,
            rat: 0.15,
            skeleton: 0.15,
            ghost: 0.15,
            caster: 0.15
          },
          maxEnemies: 130
        },
        {
          time: "4:00-4:30",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton",
            "ghost",
            "caster",
            "brute"
          ],
          spawnRate: 2.5,
          compositionWeights: {
            zombie: 0.18,
            bat: 0.18,
            rat: 0.15,
            skeleton: 0.15,
            ghost: 0.12,
            caster: 0.12,
            brute: 0.1
          },
          maxEnemies: 140
        },
        {
          time: "4:30-5:00",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton",
            "ghost",
            "caster",
            "brute"
          ],
          spawnRate: 2.8,
          compositionWeights: {
            zombie: 0.15,
            bat: 0.18,
            rat: 0.15,
            skeleton: 0.15,
            ghost: 0.12,
            caster: 0.15,
            brute: 0.1
          },
          maxEnemies: 150
        },
        {
          time: "5:00-5:30",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton",
            "ghost",
            "caster",
            "brute"
          ],
          spawnRate: 3,
          compositionWeights: {
            zombie: 0.12,
            bat: 0.15,
            rat: 0.18,
            skeleton: 0.15,
            ghost: 0.12,
            caster: 0.15,
            brute: 0.13
          },
          maxEnemies: 160
        },
        {
          time: "5:30-6:00",
          enemyTypes: [
            "zombie",
            "bat",
            "rat",
            "skeleton",
            "ghost",
            "caster",
            "brute"
          ],
          spawnRate: 2.8,
          compositionWeights: {
            zombie: 0.15,
            bat: 0.15,
            rat: 0.18,
            skeleton: 0.15,
            ghost: 0.12,
            caster: 0.15,
            brute: 0.1
          },
          maxEnemies: 150
        },
        {
          time: "6:00-6:30",
          enemyTypes: [
            "zombie",
            "rat",
            "skeleton",
            "ghost",
            "caster"
          ],
          spawnRate: 2.5,
          compositionWeights: {
            zombie: 0.25,
            rat: 0.25,
            skeleton: 0.25,
            ghost: 0.15,
            caster: 0.1
          },
          maxEnemies: 120
        },
        {
          time: "6:30-7:00",
          enemyTypes: [
            "zombie",
            "rat",
            "skeleton",
            "ghost",
            "caster"
          ],
          spawnRate: 2,
          compositionWeights: {
            zombie: 0.25,
            rat: 0.25,
            skeleton: 0.25,
            ghost: 0.15,
            caster: 0.1
          },
          maxEnemies: 100
        },
        {
          time: "7:00-7:30",
          enemyTypes: [
            "zombie",
            "rat",
            "skeleton"
          ],
          spawnRate: 2.5,
          compositionWeights: {
            zombie: 0.35,
            rat: 0.35,
            skeleton: 0.3
          },
          maxEnemies: 100
        },
        {
          time: "7:30-8:00",
          enemyTypes: [
            "zombie",
            "rat",
            "skeleton"
          ],
          spawnRate: 2,
          compositionWeights: {
            zombie: 0.4,
            rat: 0.3,
            skeleton: 0.3
          },
          maxEnemies: 80
        },
        {
          time: "8:00-8:30",
          enemyTypes: [
            "zombie",
            "rat"
          ],
          spawnRate: 1.5,
          compositionWeights: {
            zombie: 0.5,
            rat: 0.5
          },
          maxEnemies: 60
        },
        {
          time: "8:30-8:35",
          enemyTypes: [],
          spawnRate: 0,
          compositionWeights: {},
          maxEnemies: 0
        },
        {
          time: "8:35-9:00",
          enemyTypes: [
            "zombie",
            "skeleton"
          ],
          spawnRate: 1.5,
          compositionWeights: {
            zombie: 0.5,
            skeleton: 0.5
          },
          maxEnemies: 70
        },
        {
          time: "9:00-9:30",
          enemyTypes: [
            "zombie",
            "skeleton"
          ],
          spawnRate: 2,
          compositionWeights: {
            zombie: 0.5,
            skeleton: 0.5
          },
          maxEnemies: 80
        },
        {
          time: "9:30-10:00",
          enemyTypes: [
            "zombie",
            "skeleton"
          ],
          spawnRate: 2.5,
          compositionWeights: {
            zombie: 0.5,
            skeleton: 0.5
          },
          maxEnemies: 90
        }
      ],
      bossConfig: {
        enemyId: "boss_necromancer",
        spawnTime: "4:00",
        announcement: [
          {
            time: 510,
            text: "Dark energy fills the air...",
            type: "text",
            styling: {
              fontSize: 24,
              position: "center",
              animation: "fadeInHoldFadeOut"
            }
          },
          {
            time: 510,
            type: "dim",
            brightness: 0.75
          },
          {
            time: 515,
            text: "Lilith the Necromancer appears!",
            type: "shake",
            styling: {
              fontSize: 28,
              position: "center",
              animation: "scalePulse"
            }
          },
          {
            time: 520,
            type: "boss_spawn",
            position: "nearest_edge_to_player"
          }
        ]
      },
      tierConfig: {
        quick: {
          duration: 180,
          recommendedWeapons: [
            "w1_projectile",
            "w4_flame_wave",
            "weapon_area_pulse"
          ],
        },
        standard: {
          duration: 300,
          recommendedWeapons: [
            "w1_projectile",
            "w2_orbit",
            "weapon_area_pulse"
          ],
        },
        highlight: {
          duration: 600,
          recommendedWeapons: [
            "w1_projectile",
            "w5_arcane_bolt",
            "weapon_area_pulse"
          ],
        }
      },
      tierMultipliers: {
        quick: {
          hp: 0.8,
          damage: 0.9,
          spawnRate: 1.5,
          maxEnemies: 0.8,
          gold: 0.8,
          xp: 1.2
        },
        standard: {
          hp: 1,
          damage: 1,
          spawnRate: 1,
          maxEnemies: 1,
          gold: 1,
          xp: 1
        },
        highlight: {
          hp: 1.3,
          damage: 1.2,
          spawnRate: 1,
          maxEnemies: 1.2,
          gold: 1.5,
          xp: 1
        }
      },
    }
  ],
  pickups: [
    {
      id: "exp_small",
      name: "XP Gem (Small)",
      type: "exp_small",
      value: 1,
      visual: {
        shape: "diamond",
        color: "#4FC3F7",
        size: 8
      }
    },
    {
      id: "exp_large",
      name: "XP Gem (Large)",
      type: "exp_large",
      value: 5,
      visual: {
        shape: "diamond",
        color: "#81D4FA",
        size: 14
      }
    },
    {
      id: "gold_coin",
      name: "Gold Coin",
      type: "gold",
      value: 0,
      visual: {
        shape: "circle",
        color: "#FFD700",
        size: 10
      },
      goldValuePerCoin: 1
    },
    {
      id: "screen_wipe",
      name: "Screen Wipe",
      type: "screen_wipe",
      value: 0,
      visual: {
        shape: "star",
        color: "#00E676",
        size: 16
      },
      killsAllEnemies: true,
      bossDamage: 200,
      bossResistance: 0.8
    },
    {
      id: "magnet",
      name: "Magnet",
      type: "magnet",
      value: 0,
      visual: {
        shape: "circle",
        color: "#FF4081",
        size: 14
      },
      behavior: {
        duration: 10,
        attractRadius: 350,
        attractSpeed: 400,
        instantBurstRadius: 150
      }
    },
    {
      id: "pickup_weapon_level_up",
      name: "Weapon Level-Up",
      type: "pickup_weapon_level_up",
      value: 0,
      visual: {
        shape: "triangle",
        color: "#FF9100",
        size: 16
      }
    }
  ],
  leveling: {
    xpCurve: [
      {
        level: 1,
        xpToNext: 5
      },
      {
        level: 2,
        xpToNext: 10
      },
      {
        level: 3,
        xpToNext: 15
      },
      {
        level: 4,
        xpToNext: 22
      },
      {
        level: 5,
        xpToNext: 32
      },
      {
        level: 6,
        xpToNext: 45
      },
      {
        level: 7,
        xpToNext: 60
      },
      {
        level: 8,
        xpToNext: 80
      },
      {
        level: 9,
        xpToNext: 105
      },
      {
        level: 10,
        xpToNext: 135
      },
      {
        level: 11,
        xpToNext: 170
      },
      {
        level: 12,
        xpToNext: 210
      },
      {
        level: 13,
        xpToNext: 260
      }
    ],
    upgradePool: {
      weaponUpgrades: 0.4,
      passiveStats: 0.3,
      specialAbilities: 0.3
    }
  },

  // --- Fallback data for locations and NPCs (minimal, prevents crash if JSON fetch fails) ---
  locations: { regions: [] },
  npcs: {},
  companions: {},

  // --- Fallback data for quest system ---
  quests: { main_quests: [], side_quests: [] },
  // Override layer only — quest-granted gates are auto-derived from quests.json
  contentGates: {
    npcs: {
      cute_girl: { unlock_flag: 'town_camp_upgraded' }
    },
    dialogue_branches: {}
  }
};
