# Modularity Engine — Enemies Specification

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** `vs_prog.md` Enemy Spawn Details + Boss Encounter (all values), `vs_colors.md` Enemy Visuals + Boss Visual, `01_engine_architecture.md` (engine systems)

---

## Table of Contents

1. [Enemy Overview](#1-enemy-overview)
2. [Enemy 1: Zombie](#2-enemy-1-zombie)
3. [Enemy 2: Bat](#3-enemy-2-bat)
4. [Enemy 3: Skeleton](#4-enemy-3-skeleton)
5. [Enemy 4: Ghost](#5-enemy-4-ghost)
6. [Enemy 5: Caster](#6-enemy-5-caster)
7. [Boss: The Gravekeeper](#7-boss-the-gravekeeper)
8. [Drop Rate Summary](#8-drop-rate-summary)
9. [Enemy Behavior Algorithms](#9-enemy-behavior-algorithms)
10. [Spawn System](#10-spawn-system)
11. [Cross-Reference Summary](#11-cross-reference-summary)

---

## 1. Enemy Overview

5 standard enemy types + 1 boss. All stats copied EXACTLY from `vs_prog.md` Enemy Spawn Details section.

### Enemy Roster

| # | Name | Role | HP | DMG | Speed | Size | XP | Gold | First Appears |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Zombie | Fodder | 10 | 8 | 60 px/s | 14px | 1 | 1–2 | 0:00 |
| 2 | Bat | Pressure | 5 | 5 | 120 px/s | 10px | 1 | 1 | 1:00 |
| 3 | Skeleton | Tank | 35 | 12 | 40 px/s | 16px | 3 | 2–3 | 2:00 |
| 4 | Ghost | Trick | 15 | 10 | 80 px/s | 12px | 2 | 2–3 | 2:30 |
| 5 | Caster | Disruptor | 12 | 8 | 50 px/s | 13px | 3 | 3–4 | 3:00 |

### Behavior Types

| Type | Description | Enemies |
|---|---|---|
| Chase | Moves directly toward player | Zombie |
| Swarm | Fast, low HP, spawns in groups of 2–4 | Bat |
| Tank | Slow, high HP, absorbs damage | Skeleton |
| Wander → Chase | Drifts randomly, then locks onto player | Ghost |
| Ranged | Maintains distance, fires slow projectiles | Caster |

---

## 2. Enemy 1: Zombie

**Role:** Fodder. The most common enemy. Easy to kill, swarms the player.

### Stats

Values copied EXACTLY from `vs_prog.md`.

| Stat | Value |
|---|---|
| HP | 10 |
| Damage (contact) | 8 |
| Speed | 60 px/s |
| Size (radius) | 14px |
| XP Value | 1 |
| Gold Value | 1–2 (random) |
| Spawn Weight | 100 (0:00), 80 (1:00), 60 (2:00), 40 (3:00+). Linear interpolation between brackets. |
| Behavior | Chase — moves directly toward the player |
| First Appears | 0:00 |

### Behavior: Chase

1. Each frame: calculate direction vector from zombie to player
2. Normalize direction vector
3. Multiply by speed (60 px/s) and dt
4. Apply movement (with obstacle collision — slide along surfaces per `01_engine_architecture.md` §12)
5. No pathfinding — zombies walk straight toward player, getting stuck on obstacles occasionally (this is intentional — creates chokepoints)

### Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 14px |
| Collision layer | `ENEMY` (0b00010) |
| Contact damage | 8 per hit |
| Damage cooldown | 0.5s (same enemy can't damage player more than once per 0.5s) |

### Visual

From `vs_colors.md` Enemy Visuals — Zombie.

| Property | Value |
|---|---|
| Shape | Square (axis-aligned) |
| Color | `#2D5A27` (Corpse Green) |
| Size | 20×20 px |
| Border | 1px solid `#1A3D17` (darker green) |
| Motion | Wobble: ±3° rotation oscillation, 0.5s cycle |
| Death animation | Brief shrink to 0.5× over 0.15s, then disappear |
| Death behavior | On HP ≤ 0: enemy becomes intangible immediately (collision disabled), death animation plays, then entity is released back to pool. Loot spawns on HP=0 frame, not during animation. |

---

## 3. Enemy 2: Bat

**Role:** Pressure. Fast, fragile, spawns in groups. Forces constant movement.

### Stats

Values copied EXACTLY from `vs_prog.md`.

| Stat | Value |
|---|---|
| HP | 5 |
| Damage (contact) | 5 |
| Speed | 120 px/s |
| Size (radius) | 10px |
| XP Value | 1 |
| Gold Value | 1 |
| Spawn Weight | 80 |
| Behavior | Swarm — fast, low HP, spawns in groups of 2–4 |
| First Appears | 1:00 |
| Power-Up Drop | Magnet (5% chance) |

### Behavior: Swarm

1. Bats spawn in groups of 2–4 from the same off-screen edge point
2. Each bat picks a random offset from the group center within a 30px radius (circular spread, not rectangular) to avoid stacking
3. Each bat independently chases the player using the same Chase algorithm as Zombie
4. Bats are fast (120 px/s) but fragile — they die in 1–2 hits from most weapons
5. Swarm behavior creates "waves" of fast-moving targets that test the player's crowd control

### Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 10px |
| Collision layer | `ENEMY` (0b00010) |
| Contact damage | 5 per hit |
| Damage cooldown | 0.5s |

### Visual

From `vs_colors.md` Enemy Visuals — Bat.

| Property | Value |
|---|---|
| Shape | Diamond (square rotated 45°) |
| Color | `#1A1A2E` (Bat Black) |
| Size | 14×14 px |
| Border | 1px solid `#2A2A4E` (slightly lighter) |
| Motion | Flutter: scale oscillation between 0.9× and 1.1×, 0.2s cycle |
| Death animation | Quick fade out over 0.1s |
| Death behavior | On HP ≤ 0: intangible immediately, animation plays, entity released to pool. |

---

## 4. Enemy 3: Skeleton

**Role:** Tank. High HP damage sponge. Forces sustained damage output.

### Stats

Values copied EXACTLY from `vs_prog.md`.

| Stat | Value |
|---|---|
| HP | 35 |
| Damage (contact) | 12 |
| Speed | 40 px/s |
| Size (radius) | 16px |
| XP Value | 3 |
| Gold Value | 2–3 (random) |
| Spawn Weight | 60 |
| Behavior | Tank — slow, high HP, absorbs damage |
| First Appears | 2:00 |
| Power-Up Drop | Screen Wipe (2% chance) |

### Behavior: Tank

1. Same Chase algorithm as Zombie (move directly toward player)
2. Speed is very slow (40 px/s) — roughly 2/3 of player speed
3. Skeletons act as mobile obstacles — their high HP and slow speed create walls that block the player's path
4. Skeletons can body-block other enemies, creating natural chokepoints
5. Intentionally hard to kill quickly — tests whether the player has sufficient DPS

### Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 16px |
| Collision layer | `ENEMY` (0b00010) |
| Contact damage | 12 per hit |
| Damage cooldown | 0.5s |

### Visual

From `vs_colors.md` Enemy Visuals — Skeleton.

| Property | Value |
|---|---|
| Shape | Square (axis-aligned) |
| Color | `#8B1A1A` (Blood Red) |
| Size | 28×28 px |
| Border | 3px solid `#5C1010` (darker red) |
| Motion | None (heavy, solid, menacing) |
| Death animation | Crumble: breaks into 4 small squares that scatter outward over 0.3s |
| Death behavior | On HP ≤ 0: intangible immediately, animation plays, entity released to pool. |

---

## 5. Enemy 4: Ghost

**Role:** Trick. Unpredictable movement pattern creates anxiety and surprise damage.

### Stats

Values copied EXACTLY from `vs_prog.md`.

| Stat | Value |
|---|---|
| HP | 15 |
| Damage (contact) | 10 |
| Speed | 80 px/s |
| Size (radius) | 12px |
| XP Value | 2 |
| Gold Value | 2–3 (random) |
| Spawn Weight | 50 |
| Behavior | Wander → Chase — drifts randomly, then locks onto player |
| First Appears | 2:30 |
| Power-Up Drop | Magnet (5% chance) |

### Behavior: Wander → Chase

1. **Wander phase (3–5 seconds):** Ghost drifts in a random direction at 50% speed (40 px/s). Changes direction every 1–2 seconds. During this phase, the ghost is unpredictable and hard to predict.
2. **Chase phase (2–4 seconds):** Ghost locks onto the player and moves directly toward them at full speed (80 px/s). The transition is signaled by a brief 0.3s pause (ghost stops moving, opacity drops to 40%).
3. After chase phase ends, ghost returns to wander phase for 3–5 seconds.
4. The wander/chase cycle repeats indefinitely.
5. Ghosts can pass through obstacles during wander phase (they're ethereal). During chase phase, they collide with obstacles like other enemies. **Ghost is an exception to the engine's enemy-obstacle collision rule** (see `01_engine_architecture.md` §12) — during wander phase, ghost uses a separate collision layer that ignores obstacles.
6. Ghost opacity is 70% at all times — partially transparent, harder to see in crowds.

### Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 12px |
| Collision layer | `ENEMY` (0b00010) |
| Contact damage | 10 per hit |
| Damage cooldown | 0.5s |
| Obstacle collision | Wander: none (passes through). Chase: collides (slides). |

### Visual

From `vs_colors.md` Enemy Visuals — Ghost.

| Property | Value |
|---|---|
| Shape | Circle |
| Color | `#4A1A6B` (Phantom Purple) |
| Size | 18×18 px |
| Border | 2px solid `#6B2FA0` (lighter purple) |
| Opacity | 70% (semi-transparent, ethereal) |
| Motion | Float: ±5px vertical oscillation, 1.0s cycle |
| Wander visual | Opacity drops to 50% during wander |
| Chase visual | Opacity increases to 85% during chase, brief 0.3s flash at transition |
| Death animation | Fade out over 0.3s with upward drift (+20px) |
| Death behavior | On HP ≤ 0: intangible immediately, animation plays, entity released to pool. |

---

## 6. Enemy 5: Caster

**Role:** Disruptor. Ranged attacker that forces the player to close distance or dodge projectiles.

### Stats

Values copied EXACTLY from `vs_prog.md`.

| Stat | Value |
|---|---|
| HP | 12 |
| Damage (contact) | 8 |
| Speed | 50 px/s |
| Size (radius) | 13px |
| XP Value | 3 |
| Gold Value | 3–4 (random) |
| Spawn Weight | 45 |
| Behavior | Ranged — maintains distance, fires slow projectiles at player |
| First Appears | 3:00 |
| Projectile Damage | 6 |
| Projectile Speed | 150 px/s |
| Power-Up Drop | Screen Wipe (2% chance) |

### Behavior: Ranged

1. **Preferred distance:** 200–300px from the player
2. If player is within 200px: Caster retreats at full speed (50 px/s) away from player
3. If player is beyond 300px: Caster advances toward player at full speed
4. If player is 200–300px: Caster strafes perpendicular to the player. Direction is chosen once when entering strafe range and persists for 1.5–2.5 seconds before randomly switching. This prevents jittering from frame-by-frame randomization.
5. **Firing:** Every 2.0 seconds, fires a projectile toward the player's current position
6. Projectiles are non-tracking — they travel in a straight line and despawn after 3s or 600px
7. Caster pauses for 0.3s when firing (brief wind-up animation)
8. Casters prioritize self-preservation — they try to stay at range, making them annoying to reach

### Caster Projectile

| Property | Value |
|---|---|
| Damage | 6 |
| Speed | 150 px/s |
| Lifetime | 3.0 seconds or 600px distance |
| Shape | Small diamond (rotated square) |
| Color | `#4DD0E1` (bright teal) |
| Size | 6×6 px |
| Collision layer | `ENEMY` (0b00010) → damages `PLAYER` |
| Tracking | No — straight line from cast position |

### Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 13px |
| Collision layer | `ENEMY` (0b00010) |
| Contact damage | 8 per hit |
| Damage cooldown | 0.5s |

### Visual

From `vs_colors.md` Enemy Visuals — Caster.

| Property | Value |
|---|---|
| Shape | Triangle (pointing up) |
| Color | `#1A4A4A` (Caster Teal) |
| Size | 22×22 px |
| Border | 1px solid `#0D3333` (darker teal) |
| Motion | Pulse: scale oscillation between 0.95× and 1.05×, 0.8s cycle |
| Cast animation | Brief 0.3s scale-up to 1.1×, then fire |
| Death animation | Dissolve: opacity fades over 0.2s while scaling up to 1.2× |
| Death behavior | On HP ≤ 0: intangible immediately, animation plays, entity released to pool. |

---

## 7. Boss: The Gravekeeper

**Role:** Stage climax. Tests whether the player has built a viable weapon loadout.

### Stats

Values copied EXACTLY from `vs_prog.md` Boss Encounter section.

| Stat | Value |
|---|---|
| Name | The Gravekeeper |
| HP | 1,000 |
| Contact Damage | 15 |
| Speed (Phase 1) | 70 px/s |
| Speed (Phase 2) | 100 px/s |
| Size (radius) | 28px |
| XP Value | 50 |
| Gold Value | 20–30 (random) |
| Spawn Time | 4:00 |
| Despawn | On death or at 5:00 (game end) |
| Power-Up Drop | Weapon Level-Up (100% guaranteed) |

### Boss Spawn Announcement

From `vs_prog.md` Boss Encounter section. Three-step announcement:

| Time | Event | Visual |
|---|---|---|
| 3:50 | Screen dims slightly (80% brightness). Text: "Something stirs in the darkness..." | White text, center screen, fade in over 1s, hold 2s, fade out |
| 3:55 | Camera shake (0.5s, medium). Text: "The Gravekeeper rises!" | Yellow text, center screen, shake with camera |
| 4:00 | Boss spawns from nearest screen edge with dramatic entrance | Boss slides in from edge over 0.5s, red flash on arrival |

### Phase 1 (100%–50% HP: 1000–500 HP)

**Movement:**
- Charges toward the player in straight lines
- Each charge lasts 1.5 seconds at 70 px/s
- After charge: 1.0-second pause (boss stops, brief recovery animation)
- Boss can clip through obstacles during charges (boss is too large to be blocked). **Boss is an exception to the engine's enemy-obstacle collision rule** (see `01_engine_architecture.md` §12) — boss always ignores obstacles.
- Between charges, boss slowly repositions toward the player at 30 px/s

**Minion Spawns:**
- Every 3 seconds, spawns 3 Zombies at random positions within a 200px radius of the player. Minimum 40px distance from the player to avoid stacking on top of them
- Minions spawn with a brief red flash (0.2s) to distinguish from regular spawns
- Minions spawned by the boss use standard Zombie behavior (Chase) and count toward the 200-enemy cap


**Visual:**
- Steady red glow (70% opacity), slow pulse (2s cycle)
- Body rotates toward charge direction
- 0.3s wind-up before charge (slight scale down to 0.9×)
- Ground trembles during charge (subtle camera shake, 1px intensity)

### Phase 2 (50%–0% HP: 500–0 HP)

**Triggered at 500 HP.** Brief animation pause (0.5s): boss stops, roars (visual: scale pulse 1.0→1.2→1.0), screen shakes (0.5s, medium). Speed increases.

**Movement:**
- Charges become faster (100 px/s) and more frequent (every 2 seconds)
- Charge duration: 1.2 seconds
- After charge: 0.8-second pause
- Between charges: repositions at 50 px/s

**Minion Spawns:**
- Every 2 seconds, spawns 5 Zombies at random positions within a 200px radius of the player. Minimum 40px distance from the player (same rules as Phase 1)
- Same red flash visual as Phase 1

**Ground Pound:**
- Every 5 seconds, targets the player's current position
- Telegraph: red circle (80px radius) appears at target location
  - Circle is `#FF0000` at 30% opacity
  - Circle shrinks to 0 over 0.75 seconds
- After telegraph: deals 20 damage to ALL entities within 80px of the target point (including enemies — boss doesn't care about collateral)
- Camera shake on impact (0.3s, heavy)
- Ground pound hits the player even if they move — it targets the position at cast time, not the player's current position

**Visual:**
- Glow intensifies (90% opacity), pulse speeds up (1s cycle)
- Border thickens to 6px
- Brief 0.5s red flash when entering Phase 2
- Red aura particles emit continuously during Phase 2

### Boss Hitbox

| Property | Value |
|---|---|
| Shape | Circle |
| Radius | 28px |
| Collision layer | `ENEMY` (0b00010) |
| Contact damage | 15 per hit |
| Damage cooldown | 0.5s |
| Obstacle collision | None — boss passes through obstacles |

### Boss Visual

From `vs_colors.md` Boss Visual.

| Property | Value |
|---|---|
| Shape | Large square (axis-aligned) |
| Color | `#4A0000` (Boss Crimson) |
| Size | 56×56 px |
| Border | 4px solid `#FF0000` (Boss Aura), 6px in Phase 2 |
| Glow | 16px `#FF0000` drop shadow, 70% opacity (90% in Phase 2) |
| Hitbox | Circle, radius 28px |

**Phase Visual Changes:**
- Phase 1: Steady red glow, slow pulse (2s cycle), normal border
- Phase 2: Glow intensifies (90% opacity), pulse speeds up (1s cycle), border thickens to 6px, brief 0.5s flash on transition

**Attack Telegraphs:**
- Charge: Body rotates toward player, 0.3s wind-up (scale down to 0.9×)
- Ground Pound: Red circle telegraph at target location, `#FF0000` at 30% opacity, 80px radius, shrinks to 0 over 0.75s

### Boss DPS Check

The player needs to deal 1,000 damage within 60 seconds (4:00–5:00).

| Player DPS | Kill Time | Difficulty |
|---|---|---|
| 80–110 | 9–12s | Expected — most runs |
| 40 | 25s | Comfortable |
| 25 | 40s | Tight but possible |
| 17 | 60s | Barely — last-second kill |
| <17 | 60s+ | Will not kill in time → SURVIVED ending |

Expected player DPS at 4:00 is 80–110 (see `03_weapons_spec.md` Combined DPS by Minute).

### Boss Loot

On death:
- 50 XP (collected automatically — no pickup entity)
- 20–30 gold (scattered around boss death position, ±40px)
- 1× Weapon Level-Up power-up (guaranteed, drops at boss position)
- Any zombies the boss spawned that are still alive remain — they are NOT killed on boss death. They continue chasing the player with standard Zombie behavior
- Brief slow-motion effect: 0.5s at 25% speed before loot drops
- Screen shake: 1.0s, heavy intensity (see `01_engine_architecture.md` §9)
- Victory check: if boss dies before 5:00 → VICTORY end screen

---

## 8. Drop Rate Summary

Values copied EXACTLY from `vs_prog.md` Drop Economy section.

| Enemy | XP | Gold | Screen Wipe | Magnet | Weapon Up |
|---|---|---|---|---|---|
| Zombie | 1 | 1–2 | — | — | 1% |
| Bat | 1 | 1 | — | 5% | — |
| Skeleton | 3 | 2–3 | 2% | — | 1% |
| Ghost | 2 | 2–3 | — | 5% | 1% |
| Caster | 3 | 3–4 | 2% | — | 1% |
| Boss | 50 | 20–30 | — | — | 100% |

### XP Value Scaling

Enemy XP values increase over time:

```
xp_value(t) = base_xp × (1 + 0.05 × floor(t / 60))
```

5% increase per minute. A Zombie spawned at minute 3 is worth 1.15 XP instead of 1 XP. Applied at spawn time — the XP value is baked into the entity when it spawns.

### Drop Mechanics

- Each enemy rolls drops independently on death
- Power-up drops are mutually exclusive per kill (only 1 power-up per kill maximum)
- Drop order: Weapon Up (1%) > Screen Wipe (2%) > Magnet (5%) > nothing
- If a power-up roll succeeds, the other power-up slots are skipped
- Gold coins scatter in a small radius (±30px) on enemy death
- EXP gems drop at enemy's death position
- See `06_pickups_and_powerups_spec.md` for full pickup behavior

---

## 9. Enemy Behavior Algorithms

Detailed movement algorithms for each behavior type.

### Chase (Zombie, Bat, Skeleton)

```
function chaseBehavior(enemy, player, dt):
    dx = player.x - enemy.x
    dy = player.y - enemy.y
    dist = sqrt(dx² + dy²)
    if dist > 0:
        dx /= dist  // normalize
        dy /= dist
    enemy.x += dx * enemy.speed * dt
    enemy.y += dy * enemy.speed * dt
    // Obstacle collision: slide along surfaces (per 01_engine_architecture.md §12)
```

### Swarm (Bat)

```
function swarmBehavior(bat, player, dt):
    // Spawn phase: offset from group center
    if bat.age < 0.5:  // first 0.5s after spawn
        bat.x += bat.spawnOffset.x * dt * 2
        bat.y += bat.spawnOffset.y * dt * 2
    else:
        chaseBehavior(bat, player, dt)
```

### Wander → Chase (Ghost)

```
function wanderChaseBehavior(ghost, player, dt):
    ghost.stateTimer -= dt
    
    if ghost.state === 'wander':
        // Drift in current direction at 50% speed
        ghost.x += ghost.wanderDir.x * ghost.speed * 0.5 * dt
        ghost.y += ghost.wanderDir.y * ghost.speed * 0.5 * dt
        ghost.opacity = 0.5
        
        // Change direction every 1-2s
        if ghost.stateTimer <= 0:
            ghost.state = 'transition'
            ghost.stateTimer = 0.3  // 0.3s pause
    
    elif ghost.state === 'transition':
        // Brief pause, opacity drops to 40%
        ghost.opacity = 0.4
        if ghost.stateTimer <= 0:
            ghost.state = 'chase'
            ghost.stateTimer = 2 + random(0, 2)  // 2-4s chase
            ghost.opacity = 0.85
    
    elif ghost.state === 'chase':
        // Move toward player at full speed
        chaseBehavior(ghost, player, dt)
        ghost.opacity = 0.85
        
        if ghost.stateTimer <= 0:
            ghost.state = 'wander'
            ghost.stateTimer = 3 + random(0, 2)  // 3-5s wander
            ghost.wanderDir = randomDirection()
```

### Ranged (Caster)

```
function rangedBehavior(caster, player, dt):
    dist = distance(caster, player)
    
    // Retreat if too close
    if dist < 200:
        dx = caster.x - player.x
        dy = caster.y - player.y
        normalize(dx, dy)
        caster.x += dx * caster.speed * dt
        caster.y += dy * caster.speed * dt
    
    // Advance if too far
    elif dist > 300:
        chaseBehavior(caster, player, dt)
    
    // Strafe at preferred distance
    else:
        // Perpendicular to player direction
        dx = player.x - caster.x
        dy = player.y - caster.y
        // Rotate 90° for strafe direction
        strafeX = -dy
        strafeY = dx
        normalize(strafeX, strafeY)
        caster.x += strafeX * caster.speed * dt
        caster.y += strafeY * caster.speed * dt
    
    // Firing
    caster.fireCooldown -= dt
    if caster.fireCooldown <= 0:
        spawnCasterProjectile(caster, player)
        caster.fireCooldown = 2.0
        caster.castAnimation = 0.3  // wind-up
```

### Boss Charge (Gravekeeper)

```
function bossCharge(boss, player, dt):
    if boss.phase === 1:
        chargeSpeed = 70
        chargeDuration = 1.5
        pauseDuration = 1.0
        chargeInterval = 3.0
    else:  // phase 2
        chargeSpeed = 100
        chargeDuration = 1.2
        pauseDuration = 0.8
        chargeInterval = 2.0
    
    boss.attackTimer -= dt
    
    if boss.state === 'reposition':
        // Move slowly toward player
        chaseBehavior(boss, player, dt)
        boss.currentSpeed = boss.phase === 1 ? 30 : 50
        if boss.attackTimer <= 0:
            boss.state = 'windup'
            boss.attackTimer = 0.3
    
    elif boss.state === 'windup':
        // Scale down to 0.9×, pause
        boss.scale = 0.9
        if boss.attackTimer <= 0:
            boss.state = 'charge'
            boss.attackTimer = chargeDuration
            // Set charge direction toward player's current position
            boss.chargeDir = directionTo(boss, player)
    
    elif boss.state === 'charge':
        // Move in straight line at charge speed
        boss.x += boss.chargeDir.x * chargeSpeed * dt
        boss.y += boss.chargeDir.y * chargeSpeed * dt
        boss.scale = 1.0
        // Clips through obstacles
        if boss.attackTimer <= 0:
            boss.state = 'pause'
            boss.attackTimer = pauseDuration
    
    elif boss.state === 'pause':
        // Recovery pause
        if boss.attackTimer <= 0:
            boss.state = 'reposition'
            boss.attackTimer = chargeInterval
```

### Boss Ground Pound (Phase 2 only)

```
function bossGroundPound(boss, player):
    // Target: player's CURRENT position (not predicted)
    targetX = player.x
    targetY = player.y
    
    // Telegraph: red circle appears
    spawnTelegraph(targetX, targetY, 80, 0.75)  // radius 80px, 0.75s duration
    
    // After telegraph: deal damage
    setTimeout(0.75, () => {
        for entity in allEntities:
            if distance(entity, {targetX, targetY}) <= 80:
                if entity.type === 'player':
                    dealDamage(boss, entity, 20)
                // Also damages enemies (boss doesn't care about collateral)
                elif entity.type === 'enemy':
                    dealDamage(boss, entity, 20)
        
        // Camera shake
        emit('camera_shake', {duration: 0.3, intensity: 'heavy'})
    })
```

---

## 10. Spawn System

### Spawn Rules

From `01_engine_architecture.md` §6 and `05_stages_spec.md`.

- Enemies spawn from off-screen edges at 400–600px minimum distance from the player
- Spawn position: random point on a circle of radius 400–600px centered on the player
- Maximum simultaneous enemies: varies by time bracket (25 → 180, see `05_stages_spec.md`)
- Boss occupies 1 slot in the enemy count

### Spawn Timing

Spawn rate increases over time:

```
spawn_rate(t) = base_rate × (1 + 0.4 × floor(t / 30))
```

Capped at 3.0/second. Base rate starts at 0.8. See `05_stages_spec.md` for the full wave timeline.

### Enemy Composition

At each time bracket, enemies spawn according to composition weights defined in `05_stages_spec.md`. The spawn system rolls a random enemy type based on the current bracket's weights.

### Post-Boss Scaling

If the boss is killed before 5:00, remaining enemies gain scaled stats:

```
HP multiplier: 1 + 0.15 × minutes_after_boss_kill
Damage multiplier: 1 + 0.10 × minutes_after_boss_kill
```

Scaling is applied at spawn time — existing enemies are not retroactively buffed. This includes zombies previously spawned by the boss: they retain their original stats.

---

## 11. Cross-Reference Summary

| Section | References |
|---|---|
| All enemy stats | `vs_prog.md` Enemy Spawn Details (source of truth) |
| Boss stats & phases | `vs_prog.md` Boss Encounter |
| Drop rates | `vs_prog.md` Drop Economy |
| Enemy visuals | `vs_colors.md` Enemy Visuals |
| Boss visual | `vs_colors.md` Boss Visual |
| Boss spawn announcement | `vs_prog.md` Boss Encounter — Boss Spawn Announcement |
| Boss DPS check | `vs_prog.md` Boss DPS Check |
| XP scaling formula | `vs_prog.md` Drop Economy — XP Value Scaling |
| Obstacle collision | `01_engine_architecture.md` §12 |
| Enemy projectile collision | `01_engine_architecture.md` §18 |
| Screen shake events | `01_engine_architecture.md` §9 |
| Pickup drops | `06_pickups_and_powerups_spec.md` |
| Spawn rules & wave timeline | `05_stages_spec.md` |
| JSON schema | `10_json_schemas.md` enemies.json |
| Sound effects | `09_audio_spec.md` per-enemy hit/kill sounds |

---

*End of 04_enemies_spec.md — Version 1*
