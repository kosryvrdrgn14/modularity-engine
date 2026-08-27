# Modularity Engine — Visual Specification

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-19
> **Status:** Planning
> **Reference:** `vs_plan.md` for master design specs, `vs_prog.md` for progression

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Player Visual](#player-visual)
4. [Enemy Visuals](#enemy-visuals)
5. [Boss Visual](#boss-visual)
6. [Weapon Visuals](#weapon-visuals)
7. [Pickup Visuals](#pickup-visuals)
8. [Power-Up Visuals](#power-up-visuals)
9. [Damage Numbers](#damage-numbers)
10. [Map & Obstacles](#map--obstacles)
11. [Background & Environment](#background--environment)
12. [Visual Hierarchy Rules](#visual-hierarchy-rules)

---

## Design Philosophy

The prototype uses **basic geometric shapes** — squares, diamonds, circles, triangles, and rectangles — to represent every game entity. No sprites, no complex art. Every entity must be instantly recognizable by **shape, color, and size alone**, even when the screen is filled with hundreds of objects.

**Recognition Priority:**
1. **Color** — Primary differentiator. Bright for player/drops, dark for enemies.
2. **Shape** — Secondary differentiator. Each entity type has a unique shape.
3. **Size** — Tertiary differentiator. Reinforces threat level and importance.
4. **Motion** — Quaternary. Rotation, pulse, and animation cues for special states.

---

## Color Palette

### Player & Friendly

| Name | Hex | RGB | Use |
|---|---|---|---|
| Hero Gold | `#FFD700` | 255, 215, 0 | Player body — bright, heroic, warm |
| Hero Glow | `#FFF4B0` | 255, 244, 176 | Player glow/aura — soft yellow-white |
| Hero Accent | `#FF8C00` | 255, 140, 0 | Player secondary — dark orange accent |

### Enemies (Dark / Scary)

| Name | Hex | RGB | Use |
|---|---|---|---|
| Corpse Green | `#2D5A27` | 45, 90, 39 | Zombie body — sickly, dark green |
| Blood Red | `#8B1A1A` | 139, 26, 26 | Skeleton body — dark crimson, bone-like |
| Phantom Purple | `#4A1A6B` | 74, 26, 107 | Ghost body — deep violet, ethereal |
| Bat Black | `#1A1A2E` | 26, 26, 46 | Bat body — near-black blue, nocturnal |
| Caster Teal | `#1A4A4A` | 26, 74, 74 | Caster body — dark teal, magical |

### Boss

| Name | Hex | RGB | Use |
|---|---|---|---|
| Boss Crimson | `#4A0000` | 74, 0, 0 | Boss body — deep blood red, menacing |
| Boss Aura | `#FF0000` | 255, 0, 0 | Boss glow/pulse — bright red warning |
| Boss Accent | `#FF4444` | 255, 68, 68 | Boss attack telegraph — red circle |

### Pickups & Drops (Bright / Visible)

| Name | Hex | RGB | Use |
|---|---|---|---|
| EXP Blue | `#4FC3F7` | 79, 195, 247 | XP gems — bright sky blue, easy to spot |
| EXP Blue Light | `#81D4FA` | 129, 212, 250 | Large XP gem — lighter blue |
| Gold Yellow | `#FFD700` | 255, 215, 0 | Gold coins — matches hero gold for reward association |
| Power-Up Green | `#00E676` | 0, 230, 118 | Screen Wipe — bright green, stands out |
| Magnet Pink | `#FF4081` | 255, 64, 129 | Magnet — hot pink, distinct from everything else |
| Weapon Up Orange | `#FF9100` | 255, 145, 0 | Weapon Level-Up — bright orange |

### UI & Effects

| Name | Hex | RGB | Use |
|---|---|---|---|
| UI White | `#FFFFFF` | 255, 255, 255 | HUD text, outlines |
| HP Red | `#EF4444` | 239, 68, 68 | Health bar fill |
| EXP Cyan | `#06B6D4` | 6, 182, 212 | EXP bar fill |
| Damage White | `#FFFFFF` | 255, 255, 255 | Normal damage numbers |
| Crit Yellow | `#FBBF24` | 251, 191, 36 | Critical hit numbers |
| Heal Green | `#22C55E` | 34, 197, 94 | Positive feedback |

---

## Player Visual

| Property | Value |
|---|---|
| Shape | **Square** (rotated 0° — axis-aligned) |
| Color | `#FFD700` (Hero Gold) |
| Size | 24×24 px |
| Border | 2px solid `#FF8C00` (Hero Accent) |
| Glow | 8px `#FFF4B0` drop shadow, 50% opacity |
| Hitbox | Circle, radius 12px (invisible) |
| Invincibility Flash | Alternate between visible and invisible every 100ms |

**Motion:**
- Idle: None (static square)
- Moving: 5° rotation in movement direction (subtle tilt)
- Level-Up: Brief 1.5× scale pulse (0.3s)
- Low HP (<25%): Pulsing red tint overlay, 1s cycle

---

## Enemy Visuals

### Enemy 1: Zombie (Fodder)

| Property | Value |
|---|---|
| Shape | **Square** (axis-aligned) |
| Color | `#2D5A27` (Corpse Green) |
| Size | 20×20 px |
| Border | 1px solid `#1A3D17` (darker green) |
| Motion | Wobble: ±3° rotation oscillation, 0.5s cycle |

### Enemy 2: Bat (Pressure)

| Property | Value |
|---|---|
| Shape | **Diamond** (square rotated 45°) |
| Color | `#1A1A2E` (Bat Black) |
| Size | 14×14 px |
| Border | 1px solid `#2A2A4E` (slightly lighter) |
| Motion | Flutter: scale oscillation between 0.9× and 1.1×, 0.2s cycle |

### Enemy 3: Skeleton (Tank)

| Property | Value |
|---|---|
| Shape | **Square** (axis-aligned) |
| Color | `#8B1A1A` (Blood Red) |
| Size | 28×28 px |
| Border | 3px solid `#5C1010` (darker red) |
| Motion | None (heavy, solid, menacing) |

### Enemy 4: Ghost (Trick)

| Property | Value |
|---|---|
| Shape | **Circle** |
| Color | `#4A1A6B` (Phantom Purple) |
| Size | 18×18 px |
| Border | 2px solid `#6B2FA0` (lighter purple) |
| Opacity | 70% (semi-transparent, ethereal) |
| Motion | Float: ±5px vertical oscillation, 1.0s cycle |

### Enemy 5: Caster (Disruptor)

| Property | Value |
|---|---|
| Shape | **Triangle** (pointing up) |
| Color | `#1A4A4A` (Caster Teal) |
| Size | 22×22 px |
| Border | 1px solid `#0D3333` (darker teal) |
| Motion | Pulse: scale oscillation between 0.95× and 1.05×, 0.8s cycle |

### Enemy Projectile (Caster)

| Property | Value |
|---|---|
| Shape | **Small diamond** (rotated square) |
| Color | `#4DD0E1` (bright teal) |
| Size | 6×6 px |
| Motion | Linear travel toward player. No animation. |

---

## Boss Visual

### The Gravekeeper

| Property | Value |
|---|---|
| Shape | **Large square** (axis-aligned) |
| Color | `#4A0000` (Boss Crimson) |
| Size | 56×56 px |
| Border | 4px solid `#FF0000` (Boss Aura) |
| Glow | 16px `#FF0000` drop shadow, 70% opacity |
| Hitbox | Circle, radius 28px |

**Phase Visual Changes:**
- **Phase 1 (100%–50% HP):** Steady red glow. Slow pulse (2s cycle). Normal border.
- **Phase 2 (50%–0% HP):** Glow intensifies (90% opacity). Pulse speeds up (1s cycle). Border thickens to 6px. Brief 0.5s flash when entering Phase 2.

**Attack Telegraphs:**
- **Charge:** Body rotates toward player. 0.3s wind-up (slight scale down to 0.9×).
- **Ground Pound (Phase 2):** Red circle telegraph appears at target location. Circle is `#FF0000` at 30% opacity, 80px radius. Shrinks to 0 over 0.75s, then damage applies.

### Boss Minions (Zombies)

Boss-spawned zombies use the same visual as regular zombies but spawn with a brief red flash (0.2s) to distinguish them from regular spawns.

---

## Weapon Visuals

### Weapon 1: Projectile

| Property | Value |
|---|---|
| Shape | **Small square** |
| Color | `#FFD700` (Hero Gold — matches player) |
| Size | 8×8 px |
| Motion | Travels in straight line toward nearest enemy. Disappears on hit or after 3s. |
| L4 (Pierce): | Size increases to 10×10 px |
| L7 (Split): | Split projectiles are 6×6 px, same color, fan out ±30° |

### Weapon 2: Orbit

| Property | Value |
|---|---|
| Shape | **Circle** |
| Color | `#FF8C00` (Dark Orange — player accent) |
| Size | 10px diameter |
| Motion | Orbits player in circular path. Smooth rotation. |
| L4 (Expanded): | Size increases to 14px diameter |
| L7 (Afterimage): | Trail of 3 fading circles behind each orb, opacity 30%→10%→0% |

### Weapon 3: Area

| Property | Value |
|---|---|
| Shape | **Expanding ring** (circle outline) |
| Color | `#FFF4B0` (Hero Glow — bright white-yellow) |
| Initial Size | 80px radius |
| Max Size | Expands to full weapon radius over 0.15s |
| Opacity | Starts at 80%, fades to 0% at max radius |
| Border | 3px solid fill |
| L4 (Double Pulse): | Two rings, 0.3s apart. Second ring is `#FFD700` |
| L7 (Devastation): | Third pulse is 160px radius, `#FF0000` ring, 1s stun indicator |

---

## Pickup Visuals

### XP Gem (Small)

| Property | Value |
|---|---|
| Shape | **Small diamond** (square rotated 45°) |
| Color | `#4FC3F7` (EXP Blue) |
| Size | 8×8 px |
| Motion | Gentle float: ±2px vertical oscillation, 1.5s cycle |
| Collection | Brief scale-up to 1.5× then disappear (0.15s) |

### XP Gem (Large)

| Property | Value |
|---|---|
| Shape | **Diamond** (square rotated 45°) |
| Color | `#81D4FA` (EXP Blue Light) |
| Size | 12×12 px |
| Border | 1px solid `#4FC3F7` |
| Motion | Same float as small gem |
| Glow | 4px `#4FC3F7` drop shadow, 40% opacity |

### Gold Coin

| Property | Value |
|---|---|
| Shape | **Circle** |
| Color | `#FFD700` (Gold Yellow) |
| Size | 10px diameter |
| Border | 1px solid `#B8860B` (dark gold) |
| Motion | Slight rotation oscillation, 0.5s cycle. Scatter on drop (±30px from enemy death position). |
| Collection | Spin + scale-up to 1.3× then disappear (0.15s) |

---

## Power-Up Visuals

### Screen Wipe

| Property | Value |
|---|---|
| Shape | **Circle** (pulsing) |
| Color | `#00E676` (Power-Up Green) |
| Size | 14px diameter |
| Border | 2px solid `#00C853` (darker green) |
| Motion | Pulse: scale oscillation 0.9×–1.1×, 0.6s cycle |
| Glow | 6px `#00E676` drop shadow, 60% opacity |
| Collection Effect | White flash expanding from player: ring from 0px to 1000px radius over 0.5s, opacity 90%→0% |

### Magnet (EXP & Gold)

| Property | Value |
|---|---|
| Shape | **Diamond** (square rotated 45°) |
| Color | `#FF4081` (Magnet Pink) |
| Size | 12×12 px |
| Border | 2px solid `#C51162` (darker pink) |
| Motion | Pulse: scale oscillation 0.85×–1.15×, 0.5s cycle |
| Glow | 8px `#FF4081` drop shadow, 70% opacity |
| Active Effect | Pulsing pink ring around player: 350px radius, 15% opacity, 0.3s cycle |

### Weapon Level-Up

| Property | Value |
|---|---|
| Shape | **Triangle** (pointing up) |
| Color | `#FF9100` (Weapon Up Orange) |
| Size | 14×14 px |
| Border | 2px solid `#E65100` (darker orange) |
| Motion | Rotate: slow 360° rotation, 2s cycle |
| Glow | 6px `#FF9100` drop shadow, 50% opacity |
| Collection Effect | Orange sparkle burst: 12 small circles radiating outward from player, fading over 0.4s |

---

## Damage Numbers

| Type | Color | Size | Font | Motion |
|---|---|---|---|---|
| Normal Damage | `#FFFFFF` | 12px | Monospace, bold | Float upward 30px over 0.5s, fade to 0% |
| Critical Hit | `#FBBF24` | 16px | Monospace, bold | Float upward 40px over 0.6s, fade to 0%. Scale 1.3×. |
| Player Damage Taken | `#EF4444` | 14px | Monospace, bold | Float upward 25px over 0.4s, fade to 0% |
| Gold Pickup | `#FFD700` | 10px | Monospace | Float upward 20px over 0.3s, fade to 0% |
| XP Pickup | `#4FC3F7` | 10px | Monospace | Float upward 20px over 0.3s, fade to 0% |

All damage numbers have a 1px black text shadow for readability against any background.

---

## Map & Obstacles

The Stage 1 map is an **infinite open arena** with a tiled ground pattern. To improve movement feel and give the player spatial awareness, add **static obstacles** that the player and enemies must navigate around.

### Obstacle Types

#### Tombstone (Small)

| Property | Value |
|---|---|
| Shape | **Rectangle** (taller than wide) |
| Color | `#3A3A4A` (dark gray-purple) |
| Size | 16×24 px |
| Border | 1px solid `#2A2A3A` (darker) |
| Top Detail | Small cross: two intersecting lines, `#4A4A5A` |
| Collision | Solid. Player and enemies pathfind around. |
| Spawn Rate | 1 per 120px² of arena |
| Purpose | Forces movement. Creates choke points. Breaks up open space. |

#### Tombstone (Large)

| Property | Value |
|---|---|
| Shape | **Rectangle** |
| Color | `#2E2E3E` (darker gray-purple) |
| Size | 32×40 px |
| Border | 2px solid `#1E1E2E` |
| Top Detail | Large cross, `#3E3E4E` |
| Collision | Solid. Larger obstruction. |
| Spawn Rate | 1 per 400px² of arena |
| Purpose | Major obstacle. Creates safe pockets and ambush points. |

#### Grave Mound

| Property | Value |
|---|---|
| Shape | **Wide ellipse** (drawn as a low, wide rounded rectangle) |
| Color | `#2A3A2A` (dark earthy green) |
| Size | 40×16 px |
| Border | None |
| Collision | **Passable.** Player walks over, enemies walk over. |
| Spawn Rate | 1 per 80px² of arena |
| Purpose | Visual flavor. Breaks up the ground pattern. Non-blocking. |

#### Broken Wall

| Property | Value |
|---|---|
| Shape | **Irregular rectangle** (slightly tilted, 5–10°) |
| Color | `#4A4A5A` (medium gray) |
| Size | 48×12 px |
| Border | 1px solid `#3A3A4A` |
| Collision | Solid. Long obstruction. |
| Spawn Rate | 1 per 300px² of arena |
| Purpose | Creates corridors. Forces flanking around long walls. |

#### Cracked Floor

| Property | Value |
|---|---|
| Shape | **Square with internal lines** |
| Color | `#1A1A2A` (very dark, barely visible) |
| Size | 32×32 px |
| Border | None |
| Collision | **Passable.** |
| Spawn Rate | 1 per 100px² of arena |
| Purpose | Visual variety on ground. Subtle. |

### Obstacle Placement Rules

1. **Minimum spacing:** No obstacle within 48px of another obstacle. Prevents clustering that creates impassable walls.
2. **Player spawn safety:** No obstacles within 100px of the player's starting position. Ensures a clear area to begin.
3. **Boss arena clearance:** No obstacles within 200px of the boss spawn point. Ensures the boss fight is fair.
4. **Density:** ~5% of the visible arena is occupied by obstacles. Enough to matter, not enough to frustrate.
5. **Obstacle variety:** Each screen should contain at least 2 different obstacle types.

### Obstacle Colors (Summary)

| Obstacle | Color | Hex |
|---|---|---|
| Tombstone (Small) | Dark gray-purple | `#3A3A4A` |
| Tombstone (Large) | Darker gray-purple | `#2E2E3E` |
| Grave Mound | Dark earthy green | `#2A3A2A` |
| Broken Wall | Medium gray | `#4A4A5A` |
| Cracked Floor | Very dark purple-black | `#1A1A2A` |

**Design intent:** Obstacles are darker than enemies but brighter than the background. They should feel like part of the environment, not gameplay hazards. The player should perceive them as solid (collision) but not threatening.

---

## Background & Environment

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

## Visual Hierarchy Rules

These rules ensure readability when the screen is packed with entities.

### Z-Order (Draw Order)

1. Ground tiles and cracked floor (bottom)
2. Grave mounds (passable obstacles)
3. Pickups (XP, gold)
4. Obstacles (tombstones, walls) — drawn above pickups so pickups appear "on" the ground
5. Enemies
6. Player
7. Weapon projectiles and effects
8. Damage numbers (top)

### Size Hierarchy

| Entity | Size | Rationale |
|---|---|---|
| Player | 24×24 px | Mid-size. Visible but not oversized. |
| Boss | 56×56 px | Largest. Clearly the biggest threat. |
| Skeleton | 28×28 px | Largest regular enemy. Tank = big. |
| Caster | 22×22 px | Medium. Triangular shape makes it feel larger. |
| Zombie | 20×20 px | Standard. Baseline enemy size. |
| Ghost | 18×18 px | Slightly small. Semi-transparency compensates. |
| Bat | 14×14 px | Smallest enemy. Fast = small. |
| XP Small | 8×8 px | Tiny. Never competes with enemies for attention. |
| XP Large | 12×12 px | Small. Noticeable upgrade from small. |
| Gold Coin | 10px | Small. Bright color compensates. |
| Power-Ups | 12–14px | Slightly larger than coins. Glow makes them pop. |

### Color Contrast Rules

| Rule | Description |
|---|---|
| Player is brightest | `#FFD700` at 100% opacity. Always the most eye-catching entity. |
| Drops are second brightest | Blue, gold, green, pink, orange at 100% opacity with glow. |
| Enemies are muted | All enemy colors are dark (low RGB values). Never compete with player/drops for attention. |
| Boss is dark + bright border | Dark body with `#FF0000` glow creates menace without hiding it. |
| Obstacles are muted | Gray-purple tones. Blend with background. Noticed only when collided with. |

### Readability Checklist

- [ ] Player is always visible among enemies
- [ ] XP gems are distinguishable from gold coins by shape (diamond vs circle)
- [ ] Power-ups are instantly recognizable by color (green, pink, orange)
- [ ] Boss is clearly larger and more menacing than regular enemies
- [ ] Obstacles are visible but not distracting
- [ ] Damage numbers are readable against any background
- [ ] All entities are distinguishable at minimum screen size (800×600)

---

*End of vs_colors.md — Version 1*
