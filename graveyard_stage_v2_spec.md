# Graveyard Stage V2 — 10-Minute Extended Map Spec

## Overview

Redesign of the graveyard stage from a 5-minute standard map to a 10-minute highlight map with new enemy types, a miniboss encounter, and a cute female necromancer as the final boss.

**Duration:** 10 minutes (600 seconds)
**Theme:** Gothic horror — escalating from light undead swarms to a necromancer's full power
**Difficulty curve:** Gentle start → rat/skeleton混合 → ghoul miniboss → necromancer boss rush

---

## Enemy Roster

### Existing Enemies (kept, stats adjusted for 10-min scaling)

| Enemy | HP | DMG | Speed | Size | XP | Gold | Behavior | Notes |
|---|---|---|---|---|---|---|---|---|
| Zombie | 10 | 5 | 40 | 10 | 1 | 1 | Chase | Basic melee fodder |
| Bat | 5 | 3 | 100 | 8 | 1 | 1 | Swarm (erratic) | Fast, fragile harasser |
| Skeleton | 20 | 8 | 50 | 12 | 3 | 2 | Chase | Mid-tier melee |
| Ghost | 15 | 10 | 80 | 12 | 2 | 2 | Wander/Chase | Phases in/out |
| Caster | 12 | 8 | 50 | 13 | 3 | 3 | Ranged | Keeps distance, shoots |

### New Enemies

#### Rat (Fast Harasser)
| Stat | Value | Comparison |
|---|---|---|
| **HP** | 6 | Slightly tankier than bat (5) |
| **Damage** | 6 | Double bat damage (3), matches zombie (5) |
| **Speed** | 120 | Fastest enemy (bat is 100) |
| **Size** | 7 | Smallest enemy (bat is 8) |
| **XP** | 1 | Same as bat/zombie |
| **Gold** | 1 | Same as bat/zombie |
| **Gold Coins** | 1-1 | Minimal loot |
| **Behavior** | Swarm (erraticism: 0.9) | More erratic than bat (0.8) |
| **First Appears** | 1:30 | After initial zombie wave |
| **Spawn Weight** | 70 | Common but less than zombie |
| **Drops** | Magnet (3%) | Lower magnet chance than bat (5%) |

**Design intent:** Rats are glass cannons that punish players who ignore them. They're fast enough to catch up but fragile enough to die in 1-2 hits. Their higher damage (6 vs bat's 3) makes them threatening in packs but manageable individually.

#### Brute (Beefy Undead)
| Stat | Value | Comparison |
|---|---|---|
| **HP** | 40 | Double skeleton (20), 4x zombie (10) |
| **Damage** | 12 | Higher than ghost (10), caster (8) |
| **Speed** | 30 | Slowest enemy (zombie is 40) |
| **Size** | 16 | Larger than caster (13) |
| **XP** | 5 | Higher than skeleton (3) |
| **Gold** | 4 | Higher than skeleton (2) |
| **Gold Coins** | 3-5 | Good loot |
| **Behavior** | Chase | Slow but relentless |
| **First Appears** | 3:00 | Mid-game tank |
| **Spawn Weight** | 30 | Uncommon, dangerous |
| **Drops** | Screen Wipe (2%), Weapon Level Up (1.5%) | Better drop rates |

**Design intent:** Brutes are damage sponges that force players to either kite them or commit resources. Their slow speed means they're not immediately threatening, but their high HP and damage make them dangerous if ignored. They appear in smaller numbers but each one demands attention.

#### Ghoul (Miniboss)
| Stat | Value | Comparison |
|---|---|---|
| **HP** | 300 | 30% of main boss (1000) |
| **Damage** | 18 | Higher than boss (15) |
| **Speed** | 60 | Slightly slower than boss (70) |
| **Size** | 22 | Between caster (13) and boss (28) |
| **XP** | 30 | 60% of boss (50) |
| **Gold** | 15 | Good payout |
| **Gold Coins** | 15-20 | Solid loot |
| **Behavior** | Ghoul (lunge attack) | Unique attack pattern |
| **First Appears** | 7:00 | Miniboss before final boss |
| **Spawn Count** | 1 | Always exactly one |
| **Drops** | Weapon Level Up (100%), Magnet (50%) | Guaranteed weapon upgrade |

**Ghoul Behavior — Lunge Attack:**
1. **Idle (2s):** Stands still, players can freely attack
2. **Windup (0.5s):** Glows purple, telegraphs lunge direction
3. **Lunge (0.3s):** Dashes forward 200px at 300 speed, dealing 18 damage to anything in path
4. **Stunned (1.5s):** Immobilized after lunge, free damage window
5. Repeat cycle

**Design intent:** The ghoul teaches players to watch for telegraphed attacks before the necromancer boss fight. Its lunge is dangerous but has a long recovery window, rewarding players who dodge and counter-attack.

---

## Boss: Cute Necromancer

### Stats
| Stat | Value | Comparison |
|---|---|---|
| **HP** | 1200 | 20% higher than Gravekeeper (1000) |
| **Damage** | 18 | Higher than Gravekeeper (15) |
| **Speed** | 65 | Slightly slower than Gravekeeper (70) |
| **Size** | 30 | Slightly larger than Gravekeeper (28) |
| **XP** | 75 | 50% higher than Gravekeeper (50) |
| **Gold** | 1 | Same (gold comes from coins) |
| **Gold Coins** | 25-35 | Better than Gravekeeper (20-30) |

### Boss Phases

**Phase 1 (100% - 60% HP): Summoning**
- Summons 2 skeletons every 8 seconds
- Fires purple magic bolts (damage: 8, speed: 120) every 3 seconds
- Moves toward player slowly (speed: 40)
- Vulnerable to all damage

**Phase 2 (60% - 30% HP): Dance of Death**
- Summons 3 skeletons every 6 seconds
- Fires magic bolts every 2 seconds
- Adds new attack: **Skull Ring** — ring of 8 skulls expands outward (damage: 10 each)
- Moves faster (speed: 60)
- Occasionally pauses to channel (1.5s window)

**Phase 3 (30% - 0% HP): Desperation**
- Summons 4 skeletons every 4 seconds
- Fires magic bolts every 1.5 seconds
- **Skull Ring** every 5 seconds
- New attack: **Shadow Step** — teleports behind player (0.5s windup, visible flash)
- Moves fastest (speed: 80)
- Enraged visual (glowing purple aura)

### Boss Intro Sequence
- **Duration:** 4 seconds (skippable)
- **0s:** Screen dims to 75% brightness
- **1s:** Necromancer portrait fades in with name: "Lilith the Necromancer"
- **2s:** Subtitle: "She who commands the dead"
- **3.5s:** Portrait fades, screen brightens
- **4s:** Boss spawns at nearest edge to player

---

## Wave Composition (10 Minutes)

### Early Game (0:00 - 3:00) — Introduction
| Time | Enemies | Spawn Rate | Max Enemies | Notes |
|---|---|---|---|---|
| 0:00-0:30 | Zombie | 0.8 | 20 | Pure zombie intro |
| 0:30-1:00 | Zombie | 1.2 | 35 | More zombies |
| 1:00-1:30 | Zombie, Bat | 1.5 | 50 | Bats introduced |
| 1:30-2:00 | Zombie, Bat, Rat | 1.8 | 65 | **Rats introduced** |
| 2:00-2:30 | Zombie, Bat, Rat, Skeleton | 2.0 | 80 | Skeletons arrive |
| 2:30-3:00 | Zombie, Bat, Rat, Skeleton | 2.2 | 95 | Mix intensifies |

### Mid Game (3:00 - 6:00) — Escalation
| Time | Enemies | Spawn Rate | Max Enemies | Notes |
|---|---|---|---|---|
| 3:00-3:30 | Zombie, Bat, Rat, Skeleton, Ghost | 2.5 | 110 | Ghosts appear |
| 3:30-4:00 | Zombie, Bat, Rat, Skeleton, Ghost, Caster | 2.8 | 130 | Casters join |
| 4:00-4:30 | Zombie, Bat, Rat, Skeleton, Ghost, Caster, **Brute** | 2.5 | 140 | **Brutes introduced** |
| 4:30-5:00 | Zombie, Bat, Rat, Skeleton, Ghost, Caster, Brute | 2.8 | 150 | Full roster |
| 5:00-5:30 | Zombie, Bat, Rat, Skeleton, Ghost, Caster, Brute | 3.0 | 160 | Peak intensity |
| 5:30-6:00 | Zombie, Bat, Rat, Skeleton, Ghost, Caster, Brute | 2.8 | 150 | Slight calm before boss |

### Late Game (6:00 - 8:30) — Boss Rush
| Time | Enemies | Spawn Rate | Max Enemies | Notes |
|---|---|---|---|---|
| 6:00-6:30 | Zombie, Rat, Skeleton, Ghost, Caster | 2.5 | 120 | Reduced, preparing |
| 6:30-7:00 | Zombie, Rat, Skeleton, Ghost, Caster | 2.0 | 100 | Calm before storm |
| 7:00-7:05 | — | — | — | **Ghoul Miniboss spawns** |
| 7:05-7:30 | Zombie, Rat, Skeleton + Ghoul | 2.5 | 100 | Fight ghoul |
| 7:30-8:00 | Zombie, Rat, Skeleton | 2.0 | 80 | Post-ghoul cleanup |
| 8:00-8:30 | Zombie, Rat | 1.5 | 60 | Calm before necromancer |

### Final Boss (8:30 - 10:00)
| Time | Enemies | Spawn Rate | Max Enemies | Notes |
|---|---|---|---|---|
| 8:30-8:35 | — | — | — | **Necromancer intro** |
| 8:35-9:00 | Necromancer + skeletons (summoned) | 1.5 | 70 | Phase 1 |
| 9:00-9:30 | Necromancer + skeletons (summoned) | 2.0 | 80 | Phase 2 |
| 9:30-10:00 | Necromancer + skeletons (summoned) | 2.5 | 90 | Phase 3 (enraged) |
| 10:00+ | — | — | — | **Victory or defeat** |

---

## Composition Weights (when multiple enemies spawn)

### Early Game Weights
| Enemy | 0:00-1:00 | 1:00-2:00 | 2:00-3:00 |
|---|---|---|---|
| Zombie | 1.0 | 0.55 | 0.40 |
| Bat | — | 0.45 | 0.30 |
| Rat | — | — | 0.15 |
| Skeleton | — | — | 0.15 |

### Mid Game Weights
| Enemy | 3:00-4:00 | 4:00-5:00 | 5:00-6:00 |
|---|---|---|---|
| Zombie | 0.25 | 0.20 | 0.15 |
| Bat | 0.25 | 0.20 | 0.15 |
| Rat | 0.20 | 0.20 | 0.20 |
| Skeleton | 0.20 | 0.20 | 0.20 |
| Ghost | 0.10 | 0.15 | 0.15 |
| Caster | — | 0.05 | 0.10 |
| Brute | — | — | 0.05 |

### Late Game Weights
| Enemy | 6:00-7:00 | 7:00-8:00 | 8:00-8:30 |
|---|---|---|---|
| Zombie | 0.30 | 0.35 | 0.40 |
| Rat | 0.30 | 0.35 | 0.40 |
| Skeleton | 0.25 | 0.20 | 0.20 |
| Ghost | 0.10 | 0.10 | — |
| Caster | 0.05 | — | — |

---

## Spawn Configuration

```javascript
spawnConfig: {
  minDistance: 400,
  maxDistance: 600,
  maxEnemies: 160,        // Peak cap
  baseSpawnRate: 0.8,
  spawnRateCap: 3.5,      // Higher than standard for 10-min
  maxEnemyCapBehavior: "stop_spawn"
}
```

---

## Tier Multipliers (10-Minute Highlight)

```javascript
tierMultipliers: {
  highlight: {
    hp: 1.3,           // Enemies are 30% tankier
    damage: 1.2,       // Enemies deal 20% more
    spawnRate: 1.0,    // Normal spawn rate
    maxEnemies: 1.2,   // 20% more enemies on screen
    gold: 1.5,         // 50% more gold (compensation for longer stage)
    xp: 1.0            // Normal XP (player levels faster due to more enemies)
  }
}
```

---

## Difficulty Scaling (Post-Boss Kill)

After killing the necromancer, enemies continue to spawn with scaling:

```javascript
difficultyScaling: {
  hpMultiplier: "1 + 0.20 * minutes_after_boss_kill",
  damageMultiplier: "1 + 0.15 * minutes_after_boss_kill",
  timerStart: "necromancer_death_timestamp"
}
```

---

## Drop Tables

### Regular Enemies
| Enemy | Power-Up Drops |
|---|---|
| Zombie | Weapon Level Up (1%) |
| Bat | Magnet (5%) |
| Rat | Magnet (3%) |
| Skeleton | Screen Wipe (2%), Weapon Level Up (1%) |
| Ghost | Magnet (5%), Weapon Level Up (1%) |
| Caster | Screen Wipe (2%), Weapon Level Up (1%) |
| Brute | Screen Wipe (2%), Weapon Level Up (1.5%) |

### Miniboss (Ghoul)
| Drop | Chance | Notes |
|---|---|---|
| Weapon Level Up | 100% | Guaranteed |
| Magnet | 50% | High chance |

### Final Boss (Necromancer)
| Drop | Chance | Notes |
|---|---|---|
| Weapon Level Up | 100% | Guaranteed |
| Screen Wipe | 100% | Guaranteed |
| Magnet | 100% | Guaranteed |
| Gold (25-35) | 100% | Boss loot |

---

## Asset Requirements

### SVG Files Created
| File | Usage | ViewBox |
|---|---|---|
| `rat.svg` | Rat enemy sprite | 16×16 |
| `brute.svg` | Brute enemy sprite | 16×16 |
| `ghoul.svg` | Ghoul miniboss sprite | 24×24 |
| `necromancer_boss.svg` | Necromancer combat sprite | 32×32 |
| `necromancer_portrait.svg` | Necromancer intro portrait | 120×120 |

### Visual Style Notes
- **Rat:** Brown fur, red eyes, long tail, whiskers, running pose
- **Brute:** Greenish skin, massive shoulders, exposed ribs, glowing red eyes
- **Ghoul:** Purple/gray tones, skull-like face, long claws, glowing purple eyes
- **Necromancer:** Cute anime style, dark purple hair, glowing purple eyes, crown horns, skull earrings, fang

---

## Implementation Notes

### After File Split
1. Add new enemy definitions to `enemies.json` (or inline data)
2. Add new wave compositions to `stages.json`
3. Add SVG sprites to rendering pipeline
4. Implement Ghoul lunge behavior in `SpawnSystem`
5. Implement Necromancer multi-phase behavior in `SpawnSystem`
6. Add boss intro portrait to overlay system

### Balance Testing Checklist
- [ ] Rats die in 1-2 hits from W1 (projectile)
- [ ] Brutes take 4-5 hits from W1
- [ ] Ghoul dies in ~15-20 seconds with W1 + W2
- [ ] Necromancer Phase 1 takes ~30-40 seconds
- [ ] Full 10-minute run is completable with standard loadout
- [ ] Gold payout feels rewarding (target: 80-120 gold per run)
- [ ] XP scaling allows player to reach level 8-10 by final boss

### Godot Port Notes
- All SVGs are self-contained (no CSS dependencies)
- Gradient IDs are unique per SVG (safe for parallel rendering)
- Enemy sizes are in game units (1 unit = 1px at 1x zoom)
- Boss sprites are 2x-3x larger than regular enemies for visual clarity
