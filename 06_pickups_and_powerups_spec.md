# Modularity Engine — Pickups & Power-Ups Specification

> **Version:** 2.0 (Design Decisions Locked)
> **Last Updated:** 2026-08-26
> **Status:** Spec
> **Design Decisions:** D3 (stage tiers)
> **Canonical Sources:** `vs_prog.md` Drop Economy + Power-Up Drop Schedule + Magnet Interaction Rules (all values), `vs_colors.md` Pickup Visuals + Power-Up Visuals, `01_engine_architecture.md` (engine systems)

---

## Table of Contents

1. [Pickup Overview](#1-pickup-overview)
2. [Base Pickups](#2-base-pickups)
3. [Power-Up Drops](#3-power-up-drops)
4. [Drop Rate Table](#4-drop-rate-table)
5. [Drop Mechanics](#5-drop-mechanics)
6. [Magnet Interaction Rules](#6-magnet-interaction-rules)
7. [Pickup Collection Rules](#7-pickup-collection-rules)
8. [Pickup Visual Summary](#8-pickup-visual-summary)
9. [Cross-Reference Summary](#9-cross-reference-summary)

---

## 1. Pickup Overview

All drops come from enemy kills. No environmental pickups exist in V1.

| Category | Types | Count |
|---|---|---|
| Base Pickups | XP Gem (Small), XP Gem (Large), Gold Coin | 3 |
| Power-Ups | Screen Wipe, Magnet, Weapon Level-Up | 3 |
| **Total** | | **6** |

### Expected Income Per Run

From `vs_prog.md` Drop Economy section.

| Minute | Est. Kills | Est. XP | Est. Gold | Power-Ups |
|---|---|---|---|---|
| 0:00–1:00 | 48 | 48 | 60–90 | 0–1 |
| 1:00–2:00 | 90 | 100 | 110–160 | 1–2 |
| 2:00–3:00 | 130 | 230 | 200–310 | 2–3 |
| 3:00–4:00 | 165 | 310 | 310–480 | 3–4 |
| 4:00–5:00 | 80 + Boss | 200 | 120–180 | 1–2 + Boss drop |
| **Total** | **~513** | **~888** | **~800–1,220** | **7–12** |

---

## 2. Base Pickups

### XP Gem (Small)

| Property | Value |
|---|---|
| Value | 1 XP |
| Shape | Small diamond (square rotated 45°) |
| Color | `#4FC3F7` (EXP Blue) |
| Size | 8×8 px |
| Motion | Gentle float: ±2px vertical oscillation, 1.5s cycle |
| Collection | Brief scale-up to 1.5× then disappear (0.15s) |
| Collision | Collectible within pickup range (50px base, 350px during magnet) |
| Magnet | ✅ Attracted by magnet |

### XP Gem (Large)

| Property | Value |
|---|---|
| Value | 5 XP |
| Shape | Diamond (square rotated 45°) |
| Color | `#81D4FA` (EXP Blue Light) |
| Size | 12×12 px |
| Border | 1px solid `#4FC3F7` |
| Motion | Same float as small gem |
| Glow | 4px `#4FC3F7` drop shadow, 40% opacity |
| Collection | Same as small gem |
| Collision | Collectible within pickup range |
| Magnet | ✅ Attracted by magnet |

### Gold Coin

| Property | Value |
|---|---|
| Value | 1 gold per coin. Number of coins dropped varies by enemy type (see drop rate table). |
| Shape | Circle |
| Color | `#FFD700` (Gold Yellow) |
| Size | 10px diameter |
| Border | 1px solid `#B8860B` (dark gold) |
| Motion | Slight rotation oscillation, 0.5s cycle. Scatter on drop (±30px from enemy death position). |
| Collection | Spin + scale-up to 1.3× then disappear (0.15s) |
| Collision | Collectible within pickup range |
| Magnet | ✅ Attracted by magnet |
| Spending | **Gold has no spending mechanic in V1.** Score metric only. See `vs_prog.md` Gold Economy section. |

---

## 3. Power-Up Drops

Power-ups drop from specific enemy kills. They appear as floating items with a distinct glow/ring to stand out from base pickups.

### Screen Wipe

| Property | Value |
|---|---|
| Effect | Instantly kills ALL enemies currently on screen. Deals boss 20% max HP (200 damage). Boss has 80% resistance to screen wipe. |
| Duration | Instant (0.5s visual effect) |
| Shape | Circle (pulsing) |
| Color | `#00E676` (Power-Up Green) |
| Size | 14px diameter |
| Border | 2px solid `#00C853` (darker green) |
| Motion | Pulse: scale oscillation 0.9×–1.1×, 0.6s cycle |
| Glow | 6px `#00E676` drop shadow, 60% opacity |
| Collection Effect | White flash expanding from player: ring from 0px to 1000px radius over 0.5s, opacity 90%→0% |
| Sound | Dramatic whoosh/boom (descending sweep 2000Hz→100Hz + white noise) |
| Drop Source | Skeleton (2% chance), Caster (2% chance) |
| Expected Frequency | 1 per 2–3 minutes (once Skeletons/Casters appear at 2:00+) |
| Expected Per Run | 1–2 |
| Boss Interaction | Deals 20% max HP to boss (200 damage). Boss has 80% resistance. Does NOT one-shot boss. 5 screen wipes needed to kill boss from full HP. |

### Magnet (EXP & Gold)

| Property | Value |
|---|---|
| Effect | For 10 seconds, all EXP gems and gold coins within 350px radius are attracted to the player at 400 px/s. New pickups spawned during duration are also affected. |
| Instant Burst | On pickup, all pickups within 150px are instantly collected (no travel time). |
| Duration | 10 seconds (resets if another magnet is picked up) |
| Shape | Diamond (square rotated 45°) |
| Color | `#FF4081` (Magnet Pink) |
| Size | 12×12 px |
| Border | 2px solid `#C51162` (darker pink) |
| Motion | Pulse: scale oscillation 0.85×–1.15×, 0.5s cycle |
| Glow | 8px `#FF4081` drop shadow, 70% opacity |
| Active Effect | Pulsing pink ring around player: 350px radius, 15% opacity, 0.3s cycle |
| Sound | Magnetic hum (continuous sine 220Hz + 330Hz) during duration. Fades out over 0.5s in the last second. |
| Drop Source | Bat (5% chance), Ghost (5% chance) |
| Expected Frequency | 1 per 1–2 minutes (once Bats appear at 1:00+) |
| Expected Per Run | 2–3 |
| Stacking | Multiple magnets do NOT stack duration. Picking up another resets the 10-second timer. |

### Weapon Level-Up

| Property | Value |
|---|---|
| Effect | Randomly selects min(owned_weapon_count, 3) weapons and increases each by 1 level (max 7). |
| Shape | Triangle (pointing up) |
| Color | `#FF9100` (Weapon Up Orange) |
| Size | 14×14 px |
| Border | 2px solid `#E65100` (darker orange) |
| Motion | Rotate: slow 360° rotation, 2s cycle |
| Glow | 6px `#FF9100` drop shadow, 50% opacity |
| Collection Effect | Orange sparkle burst: 12 small circles radiating outward from player in a radial pattern (30° apart), fading over 0.4s |
| Sound | Power-up jingle (5-note full arpeggio) |
| Drop Source | Any enemy (1% base chance), Boss (100% guaranteed) |
| Expected Frequency | 1 per 1–2 minutes from regular kills + 1 from boss |
| Expected Per Run | 2–4 (including boss drop) |
| Selection Algorithm | See `03_weapons_spec.md` §6 Weapon Level-Up for full logic |

---

## 4. Drop Rate Table

Values copied EXACTLY from `vs_prog.md` Drop Economy section.

### Base Drops Per Enemy Kill

| Enemy | XP | Gold | Screen Wipe | Magnet | Weapon Up |
|---|---|---|---|---|---|
| Zombie | 1 | 1–2 | — | — | 1% |
| Bat | 1 | 1 | — | 5% | — |
| Skeleton | 3 | 2–3 | 2% | — | 1% |
| Ghost | 2 | 2–3 | — | 5% | 1% |
| Caster | 3 | 3–4 | 2% | — | 1% |
| Boss | 50 | 20–30 | — | — | 100% |

### Drop Rate Reference (by Power-Up)

From `vs_prog.md` Power-Up Drop Schedule.

| Power-Up | Drop Source | Drop Chance | Expected Frequency |
|---|---|---|---|
| Screen Wipe | Skeleton, Caster | 2% | 1 per 2–3 minutes |
| Magnet | Bat, Ghost | 5% | 1 per 1–2 minutes |
| Weapon Level-Up | Any enemy | 1% | 1 per 1–2 minutes |
| Weapon Level-Up | Boss | 100% | Guaranteed on boss kill |

### Expected Power-Up Count Per Run

From `vs_prog.md` Power-Up Drop Schedule.

| Power-Up | Expected Count | Notes |
|---|---|---|
| Screen Wipe | 1–2 | Rare. Saves the player in tight spots. |
| Magnet | 2–3 | Moderate. Great for XP bursts. |
| Weapon Level-Up | 2–4 | Rare from mobs + 1 from boss. |

### Power-Up Timing Notes

From `vs_prog.md` Power-Up Timing Notes section.

- **Screen Wipe:** Most impactful when the screen is dense. Players should feel relief and excitement when one drops. The 2% chance from Skeletons and Casters means the player gets roughly one every 90 seconds once those enemies appear (at minute 2+).
- **Magnet:** Drops from Bats (minute 1+) and Ghosts (minute 2+). The 5% chance means one drops roughly every 60 seconds once bats are active. Magnets are most valuable when many pickups are on the ground.
- **Weapon Level-Up:** The 1% base chance means roughly one drops every 2 minutes from regular kills. The boss guarantee ensures the player gets at least one during the boss fight, potentially pushing a weapon to its next power spike.

---

## 5. Drop Mechanics

### Roll Order

Each enemy rolls drops independently on death. The roll order is:

```
1. Weapon Level-Up (if applicable — 1% for Zombie/Skeleton/Ghost/Caster, 100% for Boss)
2. Screen Wipe (2% for Skeleton/Caster only)
3. Magnet (5% for Bat/Ghost only)
4. Nothing (all other rolls fail)
```

### Mutual Exclusivity

- Power-up drops are **mutually exclusive per kill** — only 1 power-up per kill maximum
- If a power-up roll succeeds, the other power-up slots are skipped
- XP and Gold always drop regardless of power-up rolls (they're not part of the power-up roll)
- Boss drops ALL loot simultaneously: 50 XP + 20–30 gold + 1× Weapon Level-Up

### Drop Position

| Pickup Type | Drop Position |
|---|---|
| XP Gem | At enemy's death position |
| Gold Coin | Scattered ±30px from enemy death position (random direction per coin) |
| Power-Up | At enemy's death position, with 0.5s delay before becoming collectible |

### Gold Scatter

- Each gold coin scatters independently in a random direction
- Scatter distance: ±30px from enemy death position
- Multiple gold coins (from high-value enemies) scatter in different directions
- Coins settle after scatter and become static (collectible on contact)

---

## 6. Soft-Pity Drop System

Power-up drops use a soft-pity system to prevent extreme bad luck.

### Pity Counters

Each drop type has its own independent pity counter. The counter increments with each kill that doesn't produce that drop type, and resets when the drop is produced.

| Drop Type | Base Chance | Pity Ramp | Max Chance |
|---|---|---|---|
| Weapon Level-Up | 1% | +2% per kill | 20% |
| Screen Wipe | 2% | +3% per kill | 30% |
| Magnet | 5% | +5% per kill | 50% |

### Pity Algorithm

```
function rollDrop(enemy, dropType):
    baseChance = dropTable[enemy.type][dropType]
    pityCount = enemy.pityCounters[dropType]
    pityBonus = pityCount * pityRamp[dropType]
    finalChance = min(baseChance + pityBonus, maxChance)
    
    if random() < finalChance:
        enemy.pityCounters[dropType] = 0
        return dropType
    else:
        enemy.pityCounters[dropType] += 1
        return null
```

### Pity Carry-Over

Pity counters persist across runs. If a player goes 15 kills without a weapon up, the pity bonus carries to the next run. This ensures long-term bad luck is impossible.

### Why Soft-Pity

| Problem | Solution |
|---|---|
| Player goes 50 kills with no drop | Pity ensures a drop by ~20 kills |
| Drop feels too frequent | Base chance is still low (1-5%) |
| Different drop types compete | Each has its own counter |

---

## 7. Magnet Interaction Rules

From `vs_prog.md` Magnet Interaction Rules section and `01_engine_architecture.md` §19.

### Pickup Range

| State | Range |
|---|---|
| Base (no magnet) | 50px radius |
| Magnet active | 350px radius |
| After magnet expires | Returns to base (50px) |

### Attraction Physics

From `01_engine_architecture.md` §19.

```
function updateMagnet(pickups, player, dt):
    for pickup in pickups:
        if !pickup.active: continue
        dist = distance(pickup, player)
        if dist <= magnetRadius:  // 350px
            // Calculate direction toward player
            dx = player.x - pickup.x
            dy = player.y - pickup.y
            normalize(dx, dy)
            // Move toward player at 400 px/s
            pickup.x += dx * magnetSpeed * dt  // 400 px/s
            pickup.y += dy * magnetSpeed * dt
```

### Instant Burst

- On magnet pickup, all pickups within 150px are instantly collected (no travel time)
- This includes XP gems, gold coins, and any other pickups
- The burst happens on the same frame as the magnet pickup

### Stacking Rules

- Multiple magnets do NOT stack duration
- Picking up a second magnet **resets** the 10-second timer to 10s
- The instant burst still triggers on each magnet pickup
- There is no "magnet level" — all magnets have the same 350px radius and 10s duration

### Magnet Lifecycle

```
1. Player kills enemy → Magnet drops (5% chance from Bat/Ghost)
2. Magnet appears on ground with pulse animation and glow
3. Player walks over magnet → Instant burst (150px) + magnet active for 10s
4. During magnet: 350px attraction radius, 400 px/s speed
5. Pink ring visual around player during duration
6. Magnetic hum sound plays during duration
7. After 10s: magnet deactivates, pickup range returns to 50px
8. If another magnet is picked up during active duration, timer resets to 10s
```

---

## 8. Pickup Collection Rules

### Collection Methods

1. **Walk-over collection:** Player walks within pickup range (50px base) → pickup is collected
2. **Magnet attraction:** Pickups within 350px are pulled toward player at 400 px/s → collected on contact
3. **Magnet instant burst:** Pickups within 150px are instantly collected on magnet pickup

### Pickup Behavior

- Pickups have a slight float animation to be visible (±2px vertical oscillation). During magnet attraction, the float animation is overridden by the attraction movement.
- Gold coins scatter ±30px on enemy death, then become static. If magnet is active when coins drop, they scatter first (0.1s), then begin attraction.
- EXP gems drop at enemy's death position, become static immediately
- Pickups are collectible immediately after spawning (no delay, except power-ups which have 0.5s delay)
- **Power-up despawn:** Power-ups persist indefinitely until collected. They do NOT despawn. This ensures the player never misses a power-up due to timing. Base pickups (XP/gold) are subject to the 500-entity cap.

### Pickup Despawn

- If entity count of pickups exceeds **500**, oldest pickups despawn
- Despawned pickups simply disappear — no visual effect
- This prevents performance issues from thousands of uncollected pickups
- In practice, with magnet and base pickup range, most pickups are collected before the cap is reached

### Pickup Entity Cap

From `01_engine_architecture.md` §12.

| Pickup Type | Max Count | Notes |
|---|---|---|
| XP Gems | 500 (shared with gold) | Total pickup cap |
| Gold Coins | 500 (shared with XP) | Total pickup cap |
| Power-Ups | No cap (rare) | Power-ups are too rare to need a cap |

---

## 9. Pickup Visual Summary

All visuals from `vs_colors.md` Pickup Visuals + Power-Up Visuals sections.

### Base Pickup Visuals

| Pickup | Shape | Color | Size | Glow | Collection Animation |
|---|---|---|---|---|---|
| XP Gem (Small) | Diamond | `#4FC3F7` | 8×8 | None | Scale to 1.5×, 0.15s |
| XP Gem (Large) | Diamond | `#81D4FA` | 12×12 | 4px `#4FC3F7` 40% | Scale to 1.5×, 0.15s |
| Gold Coin | Circle | `#FFD700` | 10px | None | Spin + scale to 1.3×, 0.15s |

### Power-Up Visuals

| Power-Up | Shape | Color | Size | Glow | Collection Effect |
|---|---|---|---|---|---|
| Screen Wipe | Circle (pulse) | `#00E676` | 14px | 6px `#00E676` 60% | White flash ring 0→1000px, 0.5s |
| Magnet | Diamond | `#FF4081` | 12×12 | 8px `#FF4081` 70% | Pink ring 350px, 10s duration |
| Weapon Up | Triangle (rotate) | `#FF9100` | 14×14 | 6px `#FF9100` 50% | Orange sparkle burst, 12 circles, 0.4s |

### Damage Numbers (on collection)

| Type | Color | Size | Font | Motion |
|---|---|---|---|---|
| Gold Pickup | `#FFD700` | 10px | Monospace | Float upward 20px over 0.3s, fade to 0% |
| XP Pickup | `#4FC3F7` | 10px | Monospace | Float upward 20px over 0.3s, fade to 0% |

---

## 10. Cross-Reference Summary

| Section | References |
|---|---|
| All drop rates | `vs_prog.md` Drop Economy (source of truth) |
| Power-up drop schedule | `vs_prog.md` Power-Up Drop Schedule |
| Magnet interaction rules | `vs_prog.md` Magnet Interaction Rules + `01_engine_architecture.md` §19 |
| XP scaling formula | `vs_prog.md` Drop Economy — XP Value Scaling |
| Gold economy | `vs_prog.md` Drop Economy — Gold Economy |
| Pickup visuals | `vs_colors.md` Pickup Visuals |
| Power-up visuals | `vs_colors.md` Power-Up Visuals |
| Pickup collision | `01_engine_architecture.md` §4 (PICKUP layer) |
| Pickup despawn cap | `01_engine_architecture.md` §12 (max 500 pickups) |
| Magnet attraction physics | `01_engine_architecture.md` §19 |
| Screen wipe vs boss | `04_enemies_spec.md` §7 Boss: The Gravekeeper |
| Weapon level-up logic | `03_weapons_spec.md` §6 Weapon Level-Up |
| Enemy drop tables | `04_enemies_spec.md` §8 Drop Rate Summary |
| Sound effects | `09_audio_spec.md` per-pickup sounds |
| JSON schema | `10_json_schemas.md` pickups.json |

---

*End of 06_pickups_and_powerups_spec.md — Version 2.0 (Design Decisions Locked)*
