# Modularity Engine — Weapons Specification

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** `vs_prog.md` Weapon Progression (all values), `vs_colors.md` Weapon Visuals, `01_engine_architecture.md` (engine systems)

---

## Table of Contents

1. [Weapon Overview](#1-weapon-overview)
2. [Weapon 1: Projectile](#2-weapon-1-projectile)
3. [Weapon 2: Orbit](#3-weapon-2-orbit)
4. [Weapon 3: Area](#4-weapon-3-area)
5. [Combined DPS by Minute](#5-combined-dps-by-minute)
6. [Weapon System Behavior](#6-weapon-system-behavior)
7. [Cross-Reference Summary](#7-cross-reference-summary)

---

## 1. Weapon Overview

All weapons auto-fire without player input. The player's role is positioning — weapons handle targeting and firing.

### Unlock Schedule

| Weapon | Unlock Condition | Expected Time |
|---|---|---|
| Weapon 1 (Projectile) | Start of game | 0:00 |
| Weapon 2 (Orbit) | Player reaches Level 3 | ~0:15 |
| Weapon 3 (Area) | Player reaches Level 6 | ~1:15 |

### Behavior Types

| Type | Behavior | Entity Type | Collision |
|---|---|---|---|
| Projectile | Fires toward nearest enemy, travels until hit/timeout | `projectile` | `PROJECTILE` layer → damages `ENEMY` |
| Orbit | Orbs circle player, damage on contact | `orb` | `PROJECTILE` layer → damages `ENEMY` |
| Area | Instant pulse around player, no persistent entity | None (instant) | No collision entity — damage applied in single frame |

### Projectile Lifetime (All Projectile Type)

| Condition | Value |
|---|---|
| Time alive | ≥ 3.0 seconds |
| Distance traveled | ≥ 600 pixels |
| Off-screen | > 200px beyond screen edge |
| Hit enemy | On contact (unless pierce) |

See `01_engine_architecture.md` Section 11 for full projectile lifetime rules.

---

## 2. Weapon 1: Projectile

**Type:** Fires a projectile toward the nearest enemy.

### Upgrade Table

Values copied EXACTLY from `vs_prog.md` Weapon 1 table.

| Level | Damage | Cooldown | Projectile Count | Special |
|---|---|---|---|---|
| 1 | 8 | 1.00s | 1 | — |
| 2 | 10 | 0.95s | 1 | — |
| 3 | 12 | 0.90s | 1 | — |
| **4** | **15** | **0.85s** | **1** | **Power Spike: Pierces +1 enemy** |
| 5 | 18 | 0.80s | 2 | +1 projectile |
| 6 | 22 | 0.75s | 2 | — |
| **7** | **28** | **0.65s** | **3** | **Power Spike: Projectiles split on hit** |

### Power Spike Details

**Level 4 — Pierce:**
- Projectiles pass through 1 additional enemy before disappearing
- Each pierce deals 75% damage to secondary targets (e.g., 15 × 0.75 = 11.25 damage)
- Visual: projectile size increases from 8×8px to 10×10px

**Level 7 — Split:**
- On hit, the projectile splits into 3 smaller projectiles that fan out ±30° from the original direction
- Split projectiles deal 50% damage (28 × 0.5 = 14 damage each)
- Split projectiles do NOT split again (no chain splitting)
- Visual: split projectiles are 6×6px, same color

### DPS Progression

Values copied EXACTLY from `vs_prog.md`.

| Level | DPS |
|---|---|
| 1 | 8.0 |
| 2 | 10.5 |
| 3 | 13.3 |
| 4 | 17.6 (+ pierce = ~22 effective) |
| 5 | 22.5 |
| 6 | 29.3 |
| 7 | 43.1 (+ split = ~55 effective) |

### Behavior

1. Each cooldown cycle, fire 1–3 projectiles (based on level)
2. Each projectile targets the **nearest enemy** to the player
3. Projectile travels in a straight line at 300 px/s toward target
4. On hit: deal damage, destroy projectile (unless pierce at L4+)
5. On timeout (3s) or distance (600px): destroy projectile
6. Projectile does NOT track — if target moves out of path, projectile continues straight

### Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 4 px (8×8 visual) |
| At L4+ | 5 px (10×10 visual) |
| At L7 (split) | 3 px (6×6 visual) |
| Collision layer | `PROJECTILE` (0b00100) |

### Visual

From `vs_colors.md` Weapon 1 Visual section.

| Property | Value |
|---|---|
| Shape | Small square |
| Color | `#FFD700` (Hero Gold — matches player) |
| Size | 8×8 px (L1–3), 10×10 px (L4+), 6×6 px (L7 split) |
| Motion | Straight line toward nearest enemy |
| Fire sound | Square wave blip, base frequency scales with damage |

---

## 3. Weapon 2: Orbit

**Type:** Orbs circle the player, damaging enemies on contact.

### Upgrade Table

Values copied EXACTLY from `vs_prog.md` Weapon 2 table.

| Level | Damage | Orbit Speed | Orb Count | Radius | Special |
|---|---|---|---|---|---|
| 1 | 5 | 2.0s/rotation | 2 | 80px | — |
| 2 | 6 | 1.85s | 2 | 85px | — |
| 3 | 7 | 1.70s | 2 | 90px | — |
| **4** | **9** | **1.55s** | **3** | **120px** | **Power Spike: +50% radius, +1 orb** |
| 5 | 11 | 1.40s | 3 | 130px | — |
| 6 | 13 | 1.30s | 4 | 140px | +1 orb |
| **7** | **16** | **1.00s** | **4** | **160px** | **Power Spike: Afterimage trails** |

### Power Spike Details

**Level 4 — Expanded Orbit:**
- Orbit radius increases by 50% (80px → 120px at L4)
- Third orb added
- Dramatically increases coverage area

**Level 7 — Afterimage:**
- Each orb leaves a damaging afterimage trail that persists for 0.5 seconds
- Afterimages deal 30% of base damage per tick (16 × 0.3 = 4.8 damage)
- Visual: trail of 3 fading circles behind each orb, opacity 30% → 10% → 0%

### DPS Progression

Values copied EXACTLY from `vs_prog.md`.

| Level | DPS (approximate) |
|---|---|
| 1 | 5.0 |
| 2 | 6.5 |
| 3 | 8.2 |
| 4 | 17.3 (+ radius = huge area) |
| 5 | 23.6 |
| 6 | 30.0 |
| 7 | 64.0 (+ afterimages) |

### Behavior

1. Orbs are spawned when weapon is unlocked (2 orbs at L1)
2. Orbs circle the player at the weapon's orbit speed and radius
3. Each orb is an entity of type `orb` with collision layer `PROJECTILE`
4. On contact with enemy: deal damage, apply knockback
5. Orbs do NOT despawn on hit — they pass through enemies (continuous damage)
6. Orb count increases at L4 (+1), L6 (+1)
7. Orbs are evenly spaced around the orbit circle (360° / orbCount)

### Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 5 px (L1–3), 7 px (L4+) |
| Collision layer | `PROJECTILE` (0b00100) |
| Damage cooldown per enemy | 0.5s (same enemy can't be hit by same orb more than once per 0.5s) |

### Visual

From `vs_colors.md` Weapon 2 Visual section.

| Property | Value |
|---|---|
| Shape | Circle |
| Color | `#FF8C00` (Dark Orange — player accent) |
| Size | 10px diameter (L1–3), 14px diameter (L4+) |
| Motion | Orbits player in circular path, smooth rotation |
| L7 Afterimage | Trail of 3 fading circles, opacity 30%→10%→0% |
| Fire sound | Triangle wave hum, 110Hz + 165Hz (perfect fifth) |

---

## 4. Weapon 3: Area

**Type:** Pulses damage in a radius around the player.

### Upgrade Table

Values copied EXACTLY from `vs_prog.md` Weapon 3 table.

| Level | Damage | Cooldown | Radius | Pulses | Special |
|---|---|---|---|---|---|
| 1 | 12 | 2.50s | 80px | 1 | — |
| 2 | 15 | 2.35s | 88px | 1 | — |
| 3 | 18 | 2.20s | 96px | 1 | — |
| **4** | **22** | **2.00s** | **110px** | **2** | **Power Spike: Double pulse** |
| 5 | 27 | 1.85s | 120px | 2 | — |
| 6 | 33 | 1.70s | 135px | 2 | — |
| **7** | **42** | **1.40s** | **160px** | **3** | **Power Spike: Massive explosion + stun** |

### Power Spike Details

**Level 4 — Double Pulse:**
- Area attack fires twice in quick succession (0.3s apart)
- Each pulse deals full damage
- Visual: two rings, second ring is `#FFD700` (gold)

**Level 7 — Devastation:**
- Third pulse is a massive explosion (160px radius) that deals 2× damage (42 × 2 = 84 damage)
- Stuns all enemies hit for 1.0 second (enemies cannot move or attack)
- Visual: third pulse is `#FF0000` ring with 1s stun indicator

### DPS Progression

Values copied EXACTLY from `vs_prog.md`.

| Level | DPS |
|---|---|
| 1 | 4.8 |
| 2 | 6.4 |
| 3 | 8.2 |
| 4 | 22.0 (double pulse = 2× per cycle) |
| 5 | 29.2 |
| 6 | 38.8 |
| 7 | 90.0 (triple pulse + 2× on third) |

### Behavior

1. Each cooldown cycle, emit 1–3 pulses (based on level)
2. Each pulse: apply damage to ALL enemies within radius instantly
3. No projectile entity — damage is applied in a single frame
4. Pulses are spaced 0.3s apart (at L4+)
5. At L7: third pulse has 2× damage + 1s stun
6. Visual ring expands from player center to full radius over 0.15s

### Hitbox

| Property | Value |
|---|---|
| Shape | None (instant area effect) |
| Collision layer | None (no entity — damage applied directly) |
| Damage type | Area of effect around player |

### Visual

From `vs_colors.md` Weapon 3 Visual section.

| Property | Value |
|---|---|
| Shape | Expanding ring (circle outline) |
| Color | `#FFF4B0` (Hero Glow — bright white-yellow) |
| Initial Size | 80px radius (scales with weapon radius stat) |
| Max Size | Weapon radius stat |
| Expansion time | 0.15s |
| Opacity | 80% → 0% over expansion |
| Border | 3px solid |
| L4 (Double) | Two rings, 0.3s apart. Second ring `#FFD700` |
| L7 (Devastation) | Third pulse: 160px radius, `#FF0000` ring, 1s stun indicator |
| Fire sound | Sawtooth sweep 800Hz → 200Hz over 0.3s |

---

## 5. Combined DPS by Minute

From `vs_prog.md` Combined DPS table.

| Minute | W1 Level | W2 Level | W3 Level | Total DPS |
|---|---|---|---|---|
| 0:00 | 1 | — | — | 8 |
| 1:00 | 2–3 | 1 | — | 20–25 |
| 2:00 | 3–4 | 1–2 | 1 | 35–45 |
| 3:00 | 4–5 | 2–3 | 1–2 | 55–75 |
| 4:00 (Boss) | 5–6 | 3–4 | 2–3 | 80–110 |

**Boss DPS Check:** Player needs ~17+ DPS to kill the boss (1000 HP) within 60 seconds. Expected DPS at 4:00 is 80–110, giving a 9–12 second kill time. See `vs_prog.md` Boss DPS Check section.

---

## 6. Weapon System Behavior

### Auto-Fire Mechanism

The WeaponSystem manages all weapon firing:

```
class WeaponSystem {
    weapons: WeaponState[]  // One per owned weapon
    
    update(dt, player, enemies):
        for weapon in weapons:
            weapon.cooldown -= dt
            if weapon.cooldown <= 0:
                fire(weapon, player, enemies)
                weapon.cooldown = weapon.currentCooldown
}

function fire(weapon, player, enemies):
    switch weapon.type:
        case 'projectile':
            count = weapon.projectileCount
            for i in range(count):
                target = findNearestEnemy(player, enemies)
                if target:
                    spawnProjectile(player, target, weapon)
        case 'orbit':
            // Orbs already exist as entities, no firing needed
            // Just ensure orb count matches weapon level
            updateOrbCount(player, weapon)
        case 'area':
            pulseCount = weapon.pulses
            for i in range(pulseCount):
                // Delayed by 0.3s between pulses
                setTimeout(() => areaPulse(player, weapon), i * 0.3)
```

### Targeting Logic (Projectile)

```
function findNearestEnemy(player, enemies):
    nearest = null
    nearestDist = Infinity
    for enemy in enemies:
        if !enemy.active: continue
        dist = distance(player, enemy)
        if dist < nearestDist:
            nearestDist = dist
            nearest = enemy
    return nearest
```

### Targeting Logic (Area)

Area weapons don't target — they affect all enemies within radius:

```
function areaPulse(player, weapon):
    for enemy in enemies:
        if !enemy.active: continue
        dist = distance(player, enemy)
        if dist <= weapon.radius:
            damage = weapon.damage
            // L7: third pulse deals 2× damage
            if weapon.level === 7 and isThirdPulse:
                damage *= 2
            applyDamage(player, enemy, damage)
            // L7: stun for 1.0s
            if weapon.level === 7 and isThirdPulse:
                enemy.stunTimer = 1.0
```

### Cooldown Management

- Cooldown starts at weapon's base cooldown value
- Each frame: `cooldown -= dt`
- When `cooldown <= 0`: fire weapon, reset cooldown
- Cooldown is NOT affected by attack speed passives in V1

### Weapon Level-Up

When the player collects a weapon level-up power-up or chooses a weapon upgrade at level-up:

```
function upgradeWeapon(weapon):
    if weapon.level >= 7: return  // Max level
    weapon.level += 1
    // Update stats from upgrade table
    updateWeaponStats(weapon)
    // At L4+: update visuals (size, behavior)
    if weapon.level === 4 or weapon.level === 7:
        applyPowerSpike(weapon)
```

---

## 7. Cross-Reference Summary

| Section | References |
|---|---|
| All upgrade tables | `vs_prog.md` Weapon Progression (source of truth) |
| Power spike details | `vs_prog.md` Weapon Progression — Power Spike Details |
| DPS tables | `vs_prog.md` Weapon Progression — DPS Progression |
| Weapon visuals | `vs_colors.md` Weapon Visuals section |
| Projectile lifetime | `01_engine_architecture.md` Section 11 |
| Collision layers | `01_engine_architecture.md` Section 4 (PROJECTILE = 0b00100) |
| Enemy targeting | `01_engine_architecture.md` Section 3 (nearest enemy) |
| Weapon unlock timing | `07_leveling_system_spec.md` (level-up choices) |
| JSON schema | `10_json_schemas.md` weapons.json |
| Sound effects | `09_audio_spec.md` per-weapon fire sounds |
| Combined DPS | `vs_prog.md` Combined DPS by Minute table |
| Boss DPS check | `vs_prog.md` Boss DPS Check section |

---

*End of 03_weapons_spec.md — Version 1*
