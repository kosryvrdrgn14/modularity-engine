# Modularity Engine — Character Specification

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** `vs_prog.md` (stats), `vs_colors.md` (visuals), `01_engine_architecture.md` (engine systems)

---

## Table of Contents

1. [Character Identity](#1-character-identity)
2. [Base Stats](#2-base-stats)
3. [Movement System](#3-movement-system)
4. [Hitbox](#4-hitbox)
5. [Invincibility Frames](#5-invincibility-frames)
6. [Death Condition](#6-death-condition)
7. [Obstacle Interaction](#7-obstacle-interaction)
8. [Visual](#8-visual)
9. [Player Entity Setup](#9-player-entity-setup)

---

## 1. Character Identity

| Property | Value |
|---|---|
| **Name** | The Warden |
| **Description** | A lone guardian bound to the cemetery, fighting endless waves of the restless dead. |
| **Lore** | "When the graves opened, someone had to stand between the living and the dead. The Warden chose duty over fear — and now the dead never stop coming." |
| **Role** | Melee-range survivor. Relies on auto-attacking weapons while dodging enemy swarms. |
| **V1 Availability** | Only playable character (auto-selected, no character select screen) |

---

## 2. Base Stats

All values copied from `vs_prog.md` Character Stats section.

| Stat | Value | Notes |
|---|---|---|
| **Max Health** | 100 | Starting and maximum HP |
| **Movement Speed** | 200 px/s | Base movement speed before passives |
| **Armor** | 0 | Flat damage reduction (minimum damage always 1) |
| **Pickup Range** | 50 px | Radius for auto-collecting pickups on contact |
| **Magnet Range** | 0 px | Base magnet range (extended to 350px by magnet power-up) |
| **Crit Chance** | 0% | Increased by passive upgrade (+5% per stack, max 4) |
| **Crit Multiplier** | 1.5× | Damage multiplier on critical hits |
| **Starting Level** | 1 | XP starts at 0 |
| **Starting Gold** | 0 | Gold is score-only in V1 |
| **Hitbox Radius** | 12 px | Circular collision hitbox |

### Starting Weapon

| Property | Value |
|---|---|
| **Weapon** | Weapon 1 — Projectile (see `03_weapons_spec.md`) |
| **Level** | 1 |
| **Unlock** | Available from game start |

Weapon 2 (Orbit) unlocks at Level 3. Weapon 3 (Area) unlocks at Level 6. See `03_weapons_spec.md` for full weapon details.

### Stat Modifiers (Passive Upgrades)

These are the only ways base stats change in V1:

| Passive | Effect | Max Stacks | Source |
|---|---|---|---|
| Max Health +20% | Increases maxHp (100 → 120 → 140 → ...) | 5 | Level-up upgrade pool |
| Movement Speed +10% | Increases moveSpeed (200 → 220 → 240 → ...) | 3 | Level-up upgrade pool |
| Armor +1 | Reduces incoming damage by 1 (min 1) | 3 | Level-up upgrade pool |
| Pickup Range +25px | Increases pickupRange (50 → 75 → 100 → ...) | 4 | Level-up upgrade pool |
| Crit Chance +5% | Increases critChance (0% → 5% → 10% → ...) | 4 | Level-up upgrade pool |

See `07_leveling_system_spec.md` for upgrade pool rules.

---

## 3. Movement System

The player uses a **dual-input movement system**. Click/tap-to-move is the primary input. WASD/arrow keys are secondary and override click-to-move when pressed.

### Primary: Click/Tap-to-Move

| Property | Value |
|---|---|
| **Trigger** | Mouse click or touch tap on canvas |
| **Behavior** | Character pathfinds toward the clicked/tapped point |
| **Arrival threshold** | 4 px (stops when within this distance of target) |
| **Visual indicator** | Small circle or ring appears at destination, fades after arrival |
| **New input** | Clicking/tapping a new location replaces the current target |
| **WASD override** | If WASD is pressed during pathfinding, click-to-move cancels |

**Algorithm:**

```
1. Player clicks/taps at world position (targetX, targetY)
2. Set player.movingToTarget = true
3. Spawn visual indicator at target position (see Visual Indicator below)
4. Each frame:
   a. Calculate direction: dx = targetX - player.x, dy = targetY - player.y
   b. If distance < 4px: stop, set movingToTarget = false, fade indicator
   c. Else: normalize direction, set velocity = dir × speed
5. Movement applies via MovementSystem (see 01_engine_architecture.md)
```

**Visual Indicator:**

| Property | Value |
|---|---|
| Shape | Ring (circle outline, no fill) |
| Color | `#FFFFFF` (white) at 60% opacity |
| Size | 12px diameter |
| Border | 2px solid |
| Spawn | Instant on click/tap |
| Fade | Opacity 60% → 0% over 0.5s after arrival |
| Position | Centered on target world position |

The indicator gives the player feedback that their click registered and shows where the character is heading.

### Secondary: WASD / Arrow Keys

| Property | Value |
|---|---|
| **Trigger** | W/A/S/D or Arrow keys held down |
| **Behavior** | 8-directional movement |
| **Diagonal normalization** | Diagonal speed = cardinal speed (normalize vector) |
| **No key held** | Decelerate with friction (× 0.85 per frame at 60fps, ~0.85^60 ≈ 0.002 per second) |
| **Overrides** | Cancels any active click-to-move pathfinding |

**Key mappings:**

| Key | Direction |
|---|---|
| W / ↑ | Up (−Y) |
| S / ↓ | Down (+Y) |
| A / ← | Left (−X) |
| D / → | Right (+X) |

**Diagonal normalization:**

```
dx = 0; dy = 0
if (W or ↑) dy -= 1
if (S or ↓) dy += 1
if (A or ←) dx -= 1
if (D or →) dx += 1
length = sqrt(dx² + dy²)
if length > 0: dx /= length; dy /= length
velocity = { dx × speed, dy × speed }
```

### Touch Device Behavior

- Touch devices use **tap-to-move exclusively** — no virtual joystick
- Single tap sets pathfinding target
- Tap-and-hold does NOT create continuous movement (tap only)
- WASD is not available on touch — movement is click/tap only
- Pause button is a touch target in the top-right corner

### Input Priority

| Priority | Input | Behavior |
|---|---|---|
| 1 (highest) | WASD/Arrow keys held | Cancels click-to-move, direct control |
| 2 | Click/Tap on canvas | Sets pathfinding target |
| 3 (lowest) | No input | Decelerate with friction |

---

## 4. Hitbox

| Property | Value |
|---|---|
| **Shape** | Circle |
| **Radius** | 12 px |
| **Visual size** | 24×24 px (larger than hitbox for readability) |
| **Collision layer** | `PLAYER` (bit `0b0001`) |

The hitbox is invisible. The visual sprite (24×24 gold square) is larger than the hitbox (12px radius circle) so the player feels like they have a fair dodge window.

### Why 12px Radius

- Small enough to dodge between enemies in tight spaces
- Large enough that the player doesn't feel "unfair" when hit
- Matches the Zombie contact radius (14px) — player is slightly smaller than enemies, rewarding precise movement

---

## 5. Invincibility Frames

| Property | Value |
|---|---|
| **Duration** | 0.5 seconds (500ms) |
| **Trigger** | After taking any damage |
| **Visual** | Sprite blinks (visible/invisible toggle every 100ms) |
| **During i-frames** | Cannot take additional damage |
| **Applies to** | Player only (enemies do NOT have i-frames in V1) |

### I-Frame Timer

The player entity has two fields for i-frame management:
- `iFrames: number` — remaining invincibility time (seconds)
- `iFrameAge: number` — time since i-frames started (used for blink timing only)

```
// Each frame:
if (player.iFrames > 0):
    player.iFrames -= dt
    player.iFrameAge += dt
    player.visible = (floor(player.iFrameAge * 10) % 2 === 0)  // Blink at 10Hz
else:
    player.visible = true
    player.iFrameAge = 0  // Reset blink timer when i-frames end
```

**Why `iFrameAge` instead of `player.age`:** Entity age resets when acquired from the pool, which would make the blink phase depend on creation time rather than damage time. Using a dedicated timer ensures consistent blink behavior regardless of when the entity was created.

### I-Frame Application

When the player takes damage:

```
function onPlayerDamage(damage):
    if player.iFrames > 0: return  // Still invulnerable
    player.stats.hp -= damage
    player.iFrames = 0.5    // Start 500ms invulnerability
    player.iFrameAge = 0    // Reset blink timer
    emit('damage', { defender: player, isPlayerDamage: true })
```

### Knockback on Hit

The player receives knockback when damaged, same as all entities:
- Direction: away from the damage source
- Force: `damage dealt × 2` px/s impulse
- Applied as instant velocity change (not acceleration)
- Knockback velocity decays via the same friction (× 0.85/frame)
- During knockback, the player can still move with WASD or click/tap (input overrides knockback velocity)

This means skilled players can cancel knockback by immediately providing movement input.

### Visual Behavior

| Time | State |
|---|---|
| 0ms | Visible |
| 100ms | Invisible |
| 200ms | Visible |
| 300ms | Invisible |
| 400ms | Visible |
| 500ms | Visible (i-frames end, normal state) |

The blink is fast enough to be noticeable but not disorienting. The player can still see their position during i-frames.

---

## 6. Death Condition

| Property | Value |
|---|---|
| **Trigger** | `player.stats.hp <= 0` |
| **Result** | DEFEAT end screen (see `01_engine_architecture.md` Section 7) |
| **No respawn** | Player death ends the run immediately |

### Death Flow

```
1. Player HP drops to 0 or below
2. Game state → GAME_OVER
3. Game freezes for 1.0 seconds (dramatic pause)
4. Red tint overlay fades in over 0.5 seconds
5. End screen appears with:
   - Title: "DEFEATED" in red text
   - Stats: Time Survived, Level, Enemies Killed, Gold, Boss Defeated, Weapon Loadout
   - Buttons: "Restart" (primary), "Main Menu" (secondary)
6. See 08_ui_hud_spec.md for full end screen layout
```

### Three End States (from `01_engine_architecture.md`)

| State | Trigger | Title | Bonus |
|---|---|---|---|
| VICTORY | Boss killed before 5:00 | "VICTORY" (gold) | +100 gold, confetti |
| SURVIVED | Timer reaches 5:00, boss alive | "SURVIVED" (white) | None |
| DEFEAT | Player HP ≤ 0 | "DEFEATED" (red) | None |

---

## 7. Obstacle Interaction

| Property | Value |
|---|---|
| **Collides with obstacles** | ✅ Yes |
| **Response** | Slide along surface (not stop) |
| **Pathfinding** | Simple steering toward target, slide if blocked |
| **No A\* pathfinding** | V1 uses reactive collision, not planned paths |

### Collision Response

When the player moves into an obstacle:

```
1. Calculate overlap on X and Y axes
2. Push out along the axis of least penetration
3. Zero velocity on that axis (slide along the other)
```

This means the player slides along walls rather than getting stuck. Combined with click/tap pathfinding, the player navigates around obstacles naturally.

### Obstacle Types (from `vs_colors.md`)

| Type | Collidable | Size | Effect on Player |
|---|---|---|---|
| Tombstone (Small) | ✅ Yes | 16×24px | Blocks movement, must navigate around |
| Tombstone (Large) | ✅ Yes | 32×40px | Major obstruction, creates choke points |
| Grave Mound | ❌ No | 40×16px | Walkable, visual only |
| Broken Wall | ✅ Yes | 48×12px | Long obstacle, forces flanking |
| Cracked Floor | ❌ No | 32×32px | Walkable, visual only |

See `vs_colors.md` Map & Obstacles section for obstacle placement rules.

---

## 8. Visual

All values from `vs_colors.md` Player Visual section.

| Property | Value |
|---|---|
| **Shape** | Square (axis-aligned, 0° rotation) |
| **Color** | `#FFD700` (Hero Gold) |
| **Size** | 24×24 px |
| **Border** | 2px solid `#FF8C00` (Hero Accent) |
| **Glow** | 8px `#FFF4B0` drop shadow, 50% opacity |
| **Hitbox** | Circle, radius 12px (invisible) |

### Animations

| State | Animation | Duration |
|---|---|---|
| Idle | None (static square) | — |
| Moving | 5° rotation in movement direction (subtle tilt) | Continuous |
| Level-Up | Brief 1.5× scale pulse | 0.3s |
| Low HP (<25%) | Pulsing red tint overlay | 1.0s cycle |
| Invincibility Flash | Alternate visible/invisible every 100ms | 0.5s total |
| Low HP Warning | Red tint overlay pulses (opacity 0% ↔ 20%), 1.0s cycle. Camera shakes subtly (2px, continuous). Both active while HP < 25% of maxHp. | Continuous |
| Death | — | Triggers DEFEAT end screen |

### Color Palette

| Name | Hex | Use |
|---|---|---|
| Hero Gold | `#FFD700` | Player body — bright, heroic, warm |
| Hero Glow | `#FFF4B0` | Player glow/aura — soft yellow-white |
| Hero Accent | `#FF8C00` | Player border — dark orange accent |

### Why Gold?

Gold is the universal color of heroes, treasure, and value. It stands out sharply against the dark cemetery background (`#0D0D1A`) and the muted enemy colors (dark green, dark red, dark purple). The player is always the brightest object on screen, making them instantly identifiable even in chaos.

---

## 9. Player Entity Setup

When the game starts, the engine creates exactly one player entity:

```typescript
function createPlayer(characterData: CharacterData): Entity {
  return {
    id: 0,                    // Always ID 0 (unique)
    type: 'player',
    x: 0,                     // Arena origin
    y: 0,
    vx: 0,
    vy: 0,
    hitbox: { shape: 'circle', radius: 12 },
    collisionLayer: COLLISION.PLAYER,  // 0b00001
    isStatic: false,
    stats: {
      maxHp: 100,
      hp: 100,
      damage: 0,              // Player doesn't deal contact damage
      speed: 200,
      armor: 0,
      critChance: 0,
      critMultiplier: 1.5,
      xpValue: 0,
      goldValue: 0,
      goldMin: 0,
      goldMax: 0,
    },
    behavior: 'player',
    visual: {
      shape: 'square',
      color: '#FFD700',
      size: 24,
      borderColor: '#FF8C00',
      borderWidth: 2,
      glowColor: '#FFF4B0',
      glowSize: 8,
    },
    active: true,
    age: 0,
    ttl: null,
    distanceTraveled: 0,
    iFrames: 0,               // Invincibility timer (seconds remaining)
    iFrameAge: 0,             // Time since i-frames started (for blink timing)
    movingToTarget: false,
    targetX: null,
    targetY: null,
  };
}
```

### Starting Position

The player spawns at world origin `(0, 0)`. Per `01_engine_architecture.md` obstacle placement rules, no obstacles are placed within 100px of the player start position, ensuring a clear area to begin.

### Camera Snap

On game start, the camera snaps to the player's position (no lerp on first frame):

```
camera.snapToPlayer(player.x, player.y)
```

### Player Never Pooled

The player entity is created once and never recycled. It persists across the entire run. On game over, it is destroyed and recreated on restart.

---

## Cross-Reference Summary

| Section | References |
|---|---|
| Base stats | `vs_prog.md` Character Stats (source of truth) |
| Movement | `01_engine_architecture.md` Sections 1, 4, 12 (InputManager, MovementSystem, Obstacle Collision) |
| Hitbox | `01_engine_architecture.md` Section 4 (Collision System) |
| I-frames | `01_engine_architecture.md` Section 8 (Damage System) |
| Death | `01_engine_architecture.md` Section 7 (Scene/State Management — 3 end states) |
| Obstacles | `vs_colors.md` Map & Obstacles, `01_engine_architecture.md` Section 12 |
| Visual | `vs_colors.md` Player Visual section |
| Weapon | `03_weapons_spec.md` (Weapon 1 — Projectile) |
| Passive upgrades | `07_leveling_system_spec.md` upgrade pool |
| JSON schema | `10_json_schemas.md` characters.json |

---

*End of 02_character_spec.md — Version 1*
