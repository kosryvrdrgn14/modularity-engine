# Modularity Engine — Stages Specification

> **Version:** 3.0 (Stage Creation Template Added)
> **Last Updated:** 2026-08-29
> **Status:** Spec
> **Design Decisions:** D3 (stage tiers: 3/5/10min), D5 (1:1 companion binding)
> **Canonical Sources:** `vs_prog.md` Wave Timeline + Boss Encounter + Stage End (all values), `vs_colors.md` Map & Obstacles + Background & Environment, `01_engine_architecture.md` (engine systems)
> **Template:** See `stage_creation_template.md` for the standardized stage creation format with all balance levers

---

## Table of Contents

1. [Stage Overview](#1-stage-overview)
2. [Arena Dimensions](#2-arena-dimensions)
3. [Background & Environment](#3-background--environment)
4. [Wave Timeline](#4-wave-timeline)
5. [Spawn Rate Formula](#5-spawn-rate-formula)
6. [Enemy Composition Weights](#6-enemy-composition-weights)
7. [Difficulty Scaling](#7-difficulty-scaling)
8. [XP Value Scaling](#8-xp-value-scaling)
9. [Obstacles](#9-obstacles)
10. [Boss Spawn Sequence](#10-boss-spawn-sequence)
11. [Stage End Conditions](#11-stage-end-conditions)
12. [Cross-Reference Summary](#12-cross-reference-summary)

---

## 1. Stage Overview

### Stage Length Tiers (D3 DECIDED)

Stages come in 3 length tiers. Each tier has different design goals, weapon scaling expectations, and content density.

| Tier | Duration | Purpose | Boss? | Weapon Focus | Example Use |
|---|---|---|---|---|---|
| **Quick** | 3 minutes | Grind quests, minor quests, daily challenges | No | Frontloaded (W1, W3) | "Clear 50 zombies for the Blacksmith" |
| **Standard** | 5 minutes | Baseline story stages, main progression | Yes (at 4:00) | Balanced (all weapons) | "Defeat the Gravekeeper" |
| **Highlight** | 10 minutes | Major story moments, faction milestones | Yes (at 8:00) + mid-boss | Scaling (W2 dominant) | "Survive the Necromancer's ritual" |

**Why 3 tiers:**
- 3min stages keep grind sessions short and satisfying
- 5min stages are the "default" — balanced for all weapon types
- 10min stages are epic encounters that test sustained builds
- Players choose stage length based on their goals (quick grind vs. deep run)

### Current Stage: The Graveyard (Standard Tier)

| Property | Value |
|---|---|
| Name | The Graveyard |
| Theme | Dark gothic / cemetery |
| Tier | Standard (5 minutes) |
| Duration | 5 minutes (300 seconds) |
| Arena | Infinite open arena with camera following player |
| Enemy Count | 5 types + 1 boss |
| Total Est. Kills | ~513 enemies |
| Total Est. XP | ~888 |
| Total Est. Gold | ~800–1,220 |

---

## 2. Arena Dimensions

- **Infinite arena** — no boundaries, no edges
- Camera follows player with smooth lerp (see `01_engine_architecture.md` §5)
- Ground tile pattern repeats seamlessly in all directions
- Player can move freely in any direction from the starting position
- No minimap in V1

---

## 3. Background & Environment

From `vs_colors.md` Background & Environment section.

### Ground Tile

| Property | Value |
|---|---|
| Base Color | `#0D0D1A` (very dark purple-black) |
| Tile Size | 64×64 px |
| Tile Pattern | Subtle grid of thin lines at `#15152A` (barely visible) |
| Overlay | Random `#1A1A2A` cracked floor patches (from obstacle list) |

### Arena Boundary

No visible boundary. The camera follows the player infinitely. The ground tile pattern repeats seamlessly.

### Lighting

No dynamic lighting in V1. The player has a subtle 32px ambient glow (`#FFD700` at 5% opacity) that serves as a visual anchor and light source reference.

---

## 4. Wave Timeline

Values copied EXACTLY from `vs_prog.md` Master Timeline.

| Time | Enemy Types | Spawn Rate (/sec) | Composition | Max Enemies | Notes |
|---|---|---|---|---|---|
| 0:00–0:30 | Zombie | 0.8 | 100% Zombie | 25 | Tutorial. Slow pace. |
| 0:30–1:00 | Zombie | 1.2 | 100% Zombie | 40 | Picking up. More zombies. |
| 1:00–1:30 | Zombie, Bat | 1.5 | 60% Zombie, 40% Bat | 60 | Bats arrive. Pressure doubles. |
| 1:30–2:00 | Zombie, Bat | 1.8 | 50% Zombie, 50% Bat | 80 | Full bat swarm. |
| 2:00–2:30 | Zombie, Bat, Skeleton | 2.0 | 40% Zombie, 35% Bat, 25% Skeleton | 100 | Skeletons tank through. |
| 2:30–3:00 | Zombie, Bat, Skeleton, Ghost | 2.2 | 30% Zombie, 30% Bat, 25% Skeleton, 15% Ghost | 120 | Ghosts phase in. |
| 3:00–3:30 | All 5 types | 2.5 | 25% Z, 25% B, 20% S, 15% G, 15% C | 150 | Casters join. Full roster. |
| 3:30–4:00 | All 5 types | 3.0 | 20% Z, 25% B, 20% S, 15% G, 20% C | 180 | Peak density before boss. |
| 4:00–4:30 | All 5 types + Boss | 2.0 | Reduced regular spawns | 150 + Boss | Boss active. Focus shifts. |
| 4:30–5:00 | All 5 types + Boss | 1.5 | Minimal regular spawns | 120 + Boss | Final push. |

### Timeline Design Notes

- **0:00–1:00 (Tutorial):** Slow zombie-only waves. Player learns movement and auto-attack.
- **1:00–2:00 (Early Chaos):** Bats arrive, doubling pressure. W1 hits Lv4 power spike around 2:00.
- **2:00–3:00 (Escalation):** Skeletons and ghosts appear. W3 unlocks. Screen density climbs.
- **3:00–4:00 (Peak Madness):** Casters join. All five types active. Spawn rate peaks at 3.0/sec.
- **4:00–5:00 (Boss Climax):** Boss spawns at 4:00. Regular spawns reduce to keep performance stable.

---

## 5. Spawn Rate Formula

From `vs_prog.md` Spawn Rate Formula section.

```
spawn_rate(t) = base_rate × (1 + 0.4 × floor(t / 30))
```

Where:
- `t` = elapsed seconds (0–300)
- `base_rate` = 0.8 (starting spawn rate)
- `floor(t / 30)` = increases every 30 seconds
- **Cap:** 3.0 spawns/second maximum

**Spawn rate progression:**

| Time Window | floor(t/30) | Multiplier | Spawn Rate |
|---|---|---|---|
| 0:00–0:30 | 0 | 1.0× | 0.8/sec |
| 0:30–1:00 | 1 | 1.4× | 1.12/sec (rounded to 1.2 in timeline) |
| 1:00–1:30 | 2 | 1.8× | 1.44/sec (rounded to 1.5) |
| 1:30–2:00 | 3 | 2.2× | 1.76/sec (rounded to 1.8) |
| 2:00–2:30 | 4 | 2.6× | 2.08/sec (rounded to 2.0) |
| 2:30–3:00 | 5 | 3.0× | 2.4/sec (rounded to 2.2) |
| 3:00–3:30 | 6 | 3.4× | 2.72/sec (rounded to 2.5) |
| 3:30–4:00 | 7 | 3.8× | 3.04/sec → **capped at 3.0** |
| 4:00–4:30 | 8 | 4.2× | 3.36 → **capped at 2.0** (boss active, reduced) |
| 4:30–5:00 | 9 | 4.6× | 3.68 → **capped at 1.5** (final push, minimal) |

**Note:** The formula produces slightly different values than the table due to rounding (e.g., 1.12 vs 1.2 at 0:30–1:00). The **table values are canonical** — use them in the timeline bracket lookup. The formula is provided for any dynamic calculations outside the bracket system (e.g., post-boss scaling adjustments).

### Post-Boss Spawn Override

When the boss is active (4:00–5:00), the spawn rate is overridden by the timeline table values (2.0/sec and 1.5/sec) regardless of what the formula produces. This prevents the arena from becoming overcrowded during the boss fight.

---

## 6. Enemy Composition Weights

From `vs_prog.md` Enemy Composition Weights section.

| Time | Zombie | Bat | Skeleton | Ghost | Caster |
|---|---|---|---|---|---|
| 0:00–1:00 | 100% | — | — | — | — |
| 1:00–2:00 | 55% | 45% | — | — | — |
| 2:00–3:00 | 35% | 30% | 25% | 10% | — |
| 3:00–4:00 | 22% | 25% | 20% | 15% | 18% |
| 4:00–5:00 | 20% | 25% | 20% | 15% | 20% |

### Composition Selection Algorithm

```
function selectEnemyType(time, compositionWeights):
    roll = random(0, 100)
    cumulative = 0
    for enemyType in compositionWeights:
        cumulative += enemyType.weight
        if roll < cumulative:
            return enemyType
    return lastEnemyType  // fallback
```

- Composition weights are sampled from the 1-minute brackets above
- Within each bracket, weights are uniform random
- If a rolled enemy type hasn't appeared yet (e.g., rolling Bat at 0:30), reroll

### Enemy HP Weights (for spawn balancing)

When the spawn system selects an enemy type, it uses the composition weights above. However, if the current enemy count exceeds 80% of the max cap, the system preferentially spawns lower-HP enemies (Zombies, Bats) to prevent HP pool overload:

```
if enemyCount > maxEnemies * 0.8:
    // Bias toward low-HP enemies
    applyWeightBias(compositionWeights, {zombie: 1.5, bat: 1.3, skeleton: 0.7, ghost: 0.8, caster: 0.7})
```

---

## 7. Difficulty Scaling

From `vs_prog.md` Difficulty Scaling Formula section.

### Conditions

- Difficulty scaling activates **only after the boss is killed**
- If the boss is NOT killed by 5:00, no scaling applies — game simply ends with SURVIVED screen
- Scaling applies to all new enemy spawns after boss death

### Formulas

```
hp_multiplier = 1 + 0.15 × minutes_after_boss_kill
damage_multiplier = 1 + 0.10 × minutes_after_boss_kill
```

### Scaling Timeline (if boss dies at 4:10)

| Time After Boss Kill | HP Multiplier | Damage Multiplier |
|---|---|---|
| 0:00 (boss death) | 1.00× | 1.00× |
| 0:30 | 1.075× | 1.05× |
| 1:00 | 1.15× | 1.10× |

**Note:** In most runs, the boss dies between 4:09–4:12, leaving only 48–51 seconds before the 5:00 timer. Maximum scaling in a typical run is ~1.08× HP and ~1.05× damage — barely noticeable. Scaling exists for extreme cases where the boss dies very early (e.g., 4:01 with god-tier builds).

### Implementation

- Scaling is applied at spawn time — existing enemies are NOT retroactively buffed
- The multiplier is calculated from `gameTime - bossDeathTime`
- Scaling affects: enemy HP, enemy contact damage, caster projectile damage
- Scaling does NOT affect: boss (already dead), boss minions (already spawned)

---

## 8. XP Value Scaling

From `vs_prog.md` XP Value Scaling section.

```
xp_value(t) = base_xp × (1 + 0.05 × floor(t / 60))
```

Where:
- `t` = elapsed seconds (0–300)
- `base_xp` = enemy's base XP value (e.g., 1 for Zombie)
- 5% increase per minute

**Examples:**

| Time | Zombie XP | Bat XP | Skeleton XP | Ghost XP | Caster XP |
|---|---|---|---|---|---|
| 0:00–0:59 | 1.00 | 1.00 | 3.00 | 2.00 | 3.00 |
| 1:00–1:59 | 1.05 | 1.05 | 3.15 | 2.10 | 3.15 |
| 2:00–2:59 | 1.10 | 1.10 | 3.30 | 2.20 | 3.30 |
| 3:00–3:59 | 1.15 | 1.15 | 3.45 | 2.30 | 3.45 |
| 4:00–4:59 | 1.20 | 1.20 | 3.60 | 2.40 | 3.60 |

### Implementation

- XP scaling is applied at spawn time — the XP value is baked into the entity when it spawns
- The multiplier is `1 + 0.05 × floor(t / 60)` where `t` is the spawn timestamp
- Boss XP (50) is NOT scaled — boss always drops 50 XP

---

## 9. Obstacles

From `vs_colors.md` Map & Obstacles section.

### Obstacle Types

#### Tombstone (Small)

| Property | Value |
|---|---|
| Shape | Rectangle (taller than wide) |
| Color | `#3A3A4A` (dark gray-purple) |
| Size | 16×24 px |
| Border | 1px solid `#2A2A3A` (darker) |
| Top Detail | Small cross: two intersecting lines, `#4A4A5A` |
| Collision | **Solid.** Player and enemies pathfind around. |
| Spawn Rate | 1 per 120px² of arena |
| Purpose | Forces movement. Creates choke points. Breaks up open space. |

#### Tombstone (Large)

| Property | Value |
|---|---|
| Shape | Rectangle |
| Color | `#2E2E3E` (darker gray-purple) |
| Size | 32×40 px |
| Border | 2px solid `#1E1E2E` |
| Top Detail | Large cross, `#3E3E4E` |
| Collision | **Solid.** Larger obstruction. |
| Spawn Rate | 1 per 400px² of arena |
| Purpose | Major obstacle. Creates safe pockets and ambush points. |

#### Grave Mound

| Property | Value |
|---|---|
| Shape | Wide ellipse (drawn as a low, wide rounded rectangle) |
| Color | `#2A3A2A` (dark earthy green) |
| Size | 40×16 px |
| Border | None |
| Collision | **Passable.** Player walks over, enemies walk over. No gameplay effect. |
| Spawn Rate | 1 per 80px² of arena |
| Purpose | Visual flavor. Breaks up the ground pattern. Non-blocking. |

#### Broken Wall

| Property | Value |
|---|---|
| Shape | Irregular rectangle (slightly tilted, 5–10°) |
| Color | `#4A4A5A` (medium gray) |
| Size | 48×12 px |
| Border | 1px solid `#3A3A4A` |
| Collision | **Solid.** Long obstruction. |
| Spawn Rate | 1 per 300px² of arena |
| Purpose | Creates corridors. Forces flanking around long walls. |

#### Cracked Floor

| Property | Value |
|---|---|
| Shape | Square with internal lines |
| Color | `#1A1A2A` (very dark, barely visible) |
| Size | 32×32 px |
| Border | None |
| Collision | **Passable.** No gameplay effect. |
| Spawn Rate | 1 per 100px² of arena |
| Purpose | Visual variety on ground. Subtle. |

### Obstacle Collision Rules

From `01_engine_architecture.md` §12.

| Entity | Collides with Obstacles? | Behavior |
|---|---|---|
| Player | ✅ Yes | Slides along surfaces. Click/tap pathfinding steers around. |
| Enemies | ✅ Yes | Slide along surfaces. Zombies get stuck occasionally (intentional). |
| Boss | ❌ No | Passes through all obstacles. Exception to enemy-obstacle collision. |
| Ghost (wander) | ❌ No | Passes through during wander phase. Exception to enemy-obstacle collision. |
| Ghost (chase) | ✅ Yes | Collides during chase phase. |
| Projectiles | ❌ No | Pass through obstacles. |
| Pickups | ❌ No | Pass through obstacles. |
| Caster Projectiles | ❌ No | Pass through obstacles (enemy projectiles follow same rule). |

### Obstacle Placement Rules

From `vs_colors.md` Obstacle Placement Rules.

1. **Minimum spacing:** No obstacle within 48px of another obstacle. Prevents clustering that creates impassable walls.
2. **Player spawn safety:** No obstacles within 100px of the player's starting position (0,0). Ensures a clear area to begin.
3. **Boss arena clearance:** No obstacles within 200px of any boss spawn point. Ensures the boss fight is fair.
4. **Density:** ~5% of the visible arena is occupied by obstacles. Enough to matter, not enough to frustrate.
5. **Obstacle variety:** Each screen should contain at least 2 different obstacle types.
6. **Procedural generation:** Obstacles are placed at stage start using seeded random. The seed is derived from the stage ID, ensuring the same layout every run.

### Obstacle Generation Algorithm

```
function generateObstacles(playerStart, arenaSeed):
    // arenaSeed = hash(stageId + difficultyLevel) — deterministic per stage
    rng = seededRandom(arenaSeed)
    obstacles = []
    
    // Generate obstacles in a large area around player start
    for x in range(-2000, 2000, 32):
        for y in range(-2000, 2000, 32):
            // Skip player spawn safety zone
            if distance(x, y, playerStart) < 100:
                continue
            
            // Skip if too close to another obstacle
            if any obstacle within 48px of (x, y):
                continue
            
            // Roll for obstacle type
            roll = rng.random()
            if roll < 0.02:  // 2% chance per tile
                type = selectObstacleType(rng)
                obstacles.push(createObstacle(type, x, y))
```

**Obstacle Type Selection Weights:**

| Type | Weight | Probability |
|---|---|---|
| Tombstone (Small) | 30 | 30% |
| Tombstone (Large) | 10 | 10% |
| Grave Mound | 25 | 25% |
| Broken Wall | 15 | 15% |
| Cracked Floor | 20 | 20% |

Weights are designed to produce the density ratios from vs_colors.md: Grave Mounds are most common (visual flavor), followed by Small Tombstones (chokers), then Cracked Floor (visual variety), then Broken Walls (long obstructions), then Large Tombstones (rare major obstacles).
    
    return obstacles
```

**Note:** Obstacles are generated once at stage start. They do not change during gameplay. The generation area extends well beyond the visible screen to ensure the player never reaches an empty area.

---

## 10. Boss Spawn Sequence

From `vs_prog.md` Boss Encounter section.

### Pre-Spawn Announcement

| Time | Event | Visual | Audio |
|---|---|---|---|
| 3:50 | Screen dims to 80% brightness. Text: "Something stirs in the darkness..." | White text, 24px, center screen, fade in over 1s, hold 2s, fade out | Boss warning: sine 100Hz fade-in, 2s |
| 3:55 | Camera shake (0.5s, medium). Text: "The Gravekeeper rises!" | Yellow text, 28px, center screen, shake with camera | Boss warning intensifies |
| 4:00 | Boss spawns from nearest screen edge | Boss slides in from edge over 0.5s, red flash on arrival | Boss spawn: square+sine 80Hz→40Hz, 1s |

### Boss Spawn Position

- Boss spawns from the **screen edge closest to the player's current position** (the edge the player is nearest to). This ensures the boss enters from a visible direction.
- Boss slides in from off-screen over 0.5 seconds
- Red flash on arrival (0.2s, `#FF0000` at 60% opacity)
- Boss occupies 1 slot in the 200-enemy cap
- **Cap enforcement:** When the enemy count reaches the cap, the spawn system stops spawning new enemies until an enemy dies. The system does NOT despawn existing enemies.

### Music Transition During Boss

| Time | Music Event |
|---|---|
| 3:50 | Pre-boss build (strings swell) |
| 3:50 | Silence (2s dramatic cut) |
| 3:52 | Boss theme ominous intro |
| 4:00 | Boss theme full combat |

See `09_audio_spec.md` for full music progression. Key transitions: ambient intro (0:00), beat drop (0:15), full intensity (2:00), pre-boss build (3:30), silence (3:50), boss theme (3:52), boss Phase 2 escalation (4:30).

---

## 11. Stage End Conditions

From `vs_prog.md` Stage End & Victory section.

### End States

| Condition | Trigger | Result | Screen Title |
|---|---|---|---|
| **Victory** | Boss killed before 5:00 | +100 gold bonus, confetti | "VICTORY" (gold text) |
| **Survived** | Timer reaches 5:00 (boss alive) | No bonus | "SURVIVED" (white text) |
| **Defeat** | Player HP reaches 0 | No bonus | "DEFEATED" (red text) |

### End Screen Behavior

When the stage ends:
1. All gameplay freezes (entities stop moving, weapons stop firing, timer stops)
2. 1.0-second pause for dramatic effect
3. End screen fades in over 0.5 seconds
4. Stats are displayed with animated counters — each stat ticks up from 0 over 0.5s, staggered by 0.2s per stat (total animation: ~1.5s)

### End Screen Stats (All Three End States)

| Stat | Display |
|---|---|
| Time Survived | MM:SS (or "5:00" if survived full duration) |
| Level Reached | # |
| Enemies Killed | # |
| Gold Collected | # |
| Boss Defeated | Yes / No |
| Weapon Loadout | W1 Lv.#, W2 Lv.#, W3 Lv.# |

### Victory Bonus

- +100 gold added to the player's total
- Displayed as "+100g" floating text on the victory screen
- Confetti particle effect (50 particles, random colors from Hero palette)

### Post-Boss-Kill Scaling Milestones

If the boss is killed, brief text overlays appear at 30-second intervals after boss death:

| Time After Boss Kill | Text |
|---|---|
| 0:30 | "Danger increases..." |
| 1:00 | "The horde grows stronger..." |
| 1:30+ | (no more text — game ends soon) |

Text appears center-screen, fades in over 0.5s, holds for 2s, fades out. White text, 80% opacity.

**Timer:** Milestone timing starts from the boss death timestamp, not from 4:00. If the boss dies at 4:10, the first milestone appears at 4:40.

---

## 12. Star Conditions (Goal Doc)

Stages award 1★–3★ based on performance. Stars gate auto-clear eligibility and unlock harder content.

### Star Conditions

| Star | Condition Types | Examples |
|---|---|---|
| **1★** | Complete the stage (survive or kill boss) | "Survive 5 minutes" / "Defeat the Gravekeeper" |
| **2★** | Performance thresholds (4+ conditions, pick 2) | "Kill 200+ enemies", "Finish under 4:30", "Reach Level 12+", "Collect 500+ gold" |
| **3★** | Mastery challenges (6+ conditions, pick 2) | "No-hit run", "Starter weapon only", "Underleveled (Lv8 or below)", "No companions", "All weapons Lv7" |

### 2★ Conditions Pool

| Condition | Threshold | Category |
|---|---|---|
| Kill count | 200+ kills | Combat |
| Time cleared | Under 4:30 (boss killed before 4:30) | Speed |
| Level reached | Level 12+ | Progression |
| Gold collected | 500+ gold | Economy |
| Boss killed | Yes (required for 2★) | Boss |
| Weapon loadout | All 3 weapons unlocked | Build |

### 3★ Conditions Pool

| Condition | Threshold | Category |
|---|---|---|
| No-hit run | Take 0 damage entire stage | Mastery |
| Starter weapon only | Only W1, no W2/W3 | Challenge |
| Underleveled | Finish at Level 8 or below | Challenge |
| No companions | All 3 companion slots empty | Solo |
| All weapons maxed | W1/W2/W3 all at Level 7 | Build |
| Speed kill | Boss killed in under 15 seconds | Speed |
| Itemless | No power-up pickups collected | Challenge |
| Pacifist segment | Survive first 2 minutes with 0 kills | Stealth |

### Star Display

Stars appear on the stage select screen:
- ★☆☆ = 1★ (completed)
- ★★☆ = 2★ (all 2★ conditions met)
- ★★★ = 3★ (all 3★ conditions met)
- Locked stages show gray stars

### Auto-Clear Eligibility

Stages with 3★ become eligible for auto-clear (farming system). See `23_auto_clear_farming_spec.md` for full farming mechanics.

---

## 13. Stage Scaling by Tier (D3)

### Quick Stage (3 minutes)

| Property | Value |
|---|---|
| Duration | 180 seconds |
| Boss | None |
| Wave timeline | Compressed — all enemy types by 1:30 |
| Spawn rate | 1.5× faster than Standard |
| XP scaling | 1.2× (faster leveling) |
| Gold scaling | 0.8× (less gold, shorter run) |
| Weapon expectation | W1 at L4+ by end, W2 at L1-2, W3 at L1 |
| Difficulty | Lower enemy HP (0.8×) |

### Standard Stage (5 minutes)

| Property | Value |
|---|---|
| Duration | 300 seconds |
| Boss | Yes (at 4:00) |
| Wave timeline | As defined in §4 (current Graveyard) |
| Spawn rate | Base (1.0×) |
| XP scaling | 1.0× (baseline) |
| Gold scaling | 1.0× (baseline) |
| Weapon expectation | W1 at L5-6, W2 at L3-4, W3 at L2-3 |
| Difficulty | Base enemy HP (1.0×) |

### Highlight Stage (10 minutes)

| Property | Value |
|---|---|
| Duration | 600 seconds |
| Boss | Yes (at 8:00) + mid-boss at 5:00 |
| Wave timeline | Extended — gradual escalation over 10 minutes |
| Spawn rate | 0.8× slower early, 1.2× faster late |
| XP scaling | 1.0× (more time = more XP naturally) |
| Gold scaling | 1.5× (longer run = more gold) |
| Weapon expectation | W1 at L7, W2 at L6-7, W3 at L5-6 |
| Difficulty | Higher enemy HP (1.3×), new enemy variants |
| Special | Frenzy mode unlockable (see §14) |

---

## 14. Frenzy Mode (Goal Doc)

Frenzy mode is an alternate playstyle unlocked after achieving 3★ on a stage.

### Trigger

- **Primary:** 3★ clear on the stage
- **Alternate:** Kill X enemies within a time window during normal play

### Gameplay

- Max-spawn dump mode — enemies spawn at maximum rate from the start
- No wave progression — constant chaos
- Better drop rates (1.5× rare drops)
- Faster clears (enemies have 0.7× HP for faster kills)

### Clean Run Compatibility

- Frenzy mode counts as a "clean run" only if the player chooses it at stage start
- Clean runs in frenzy mode still award stars (if conditions are met)
- Players can toggle between normal and frenzy at stage select

---

## 15. Cross-Reference Summary

| Section | References |
|---|---|
| Wave timeline | `vs_prog.md` Wave Timeline — Master Timeline (source of truth) |
| Spawn rate formula | `vs_prog.md` Wave Timeline — Spawn Rate Formula |
| Composition weights | `vs_prog.md` Wave Timeline — Enemy Composition Weights |
| Difficulty scaling | `vs_prog.md` Wave Timeline — Difficulty Scaling Formula |
| XP scaling | `vs_prog.md` Drop Economy — XP Value Scaling |
| Boss spawn sequence | `vs_prog.md` Boss Encounter — Boss Spawn Announcement |
| Boss stats & phases | `04_enemies_spec.md` §7 Boss: The Gravekeeper |
| Stage end conditions | `vs_prog.md` Stage End & Victory |
| End screen stats | `08_ui_hud_spec.md` §3 End Screens |
| Background & environment | `vs_colors.md` Background & Environment |
| Obstacle types & placement | `vs_colors.md` Map & Obstacles |
| Obstacle collision rules | `01_engine_architecture.md` §12 |
| Enemy spawn behavior | `04_enemies_spec.md` §10 Spawn System |
| Music transitions | `09_audio_spec.md` Music Progression |
| Screen shake events | `01_engine_architecture.md` §9 |
| JSON schema | `10_json_schemas.md` stages.json |
| Stage tiers (D3) | `game_frame.md` §4 (Combat Engine) |
| Star conditions | `24_star_conditions_spec.md` (to be created) |
| Frenzy mode | `29_frenzy_mode_spec.md` (to be created) |
| Auto-clear | `23_auto_clear_farming_spec.md` (to be created) |
| Companion pairing | `03_weapons_spec.md` §2 (1:1 binding, D5) |

---

*End of 05_stages_spec.md — Version 2.0 (Design Decisions Locked)*
