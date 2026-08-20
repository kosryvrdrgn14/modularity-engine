# Modularity Engine — Leveling System Specification

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** `vs_prog.md` Experience Curve + Upgrade Pool Composition + Passive Stat Boosts (all values), `01_engine_architecture.md` (engine systems)

---

## Table of Contents

1. [Leveling Overview](#1-leveling-overview)
2. [XP Curve](#2-xp-curve)
3. [XP Curve Formula](#3-xp-curve-formula)
4. [Expected Level Milestones](#4-expected-level-milestones)
5. [Level-Up Flow](#5-level-up-flow)
6. [Upgrade Pool Rules](#6-upgrade-pool-rules)
7. [Passive Stat Boosts](#7-passive-stat-boosts)
8. [Expected Upgrade Distribution](#8-expected-upgrade-distribution)
9. [Level-Up Visual Design](#9-level-up-visual-design)
10. [Cross-Reference Summary](#10-cross-reference-summary)

---

## 1. Leveling Overview

The XP curve is compressed for a 5-minute game. Early levels arrive rapidly (every 5–10 seconds) to hook the player, then slow down to create meaningful upgrade decisions.

| Property | Value |
|---|---|
| Max Level (practical) | 12–13 in a typical run |
| Max Level (theoretical) | 14+ (formula continues) |
| First Level-Up | ~5 seconds (5 XP) |
| Last Level-Up (typical) | ~4:45 (Level 12–13) |
| Total Level-Ups Per Run | 12–13 |
| Upgrade Choices Per Level | 3 random options |

---

## 2. XP Curve

Values copied EXACTLY from `vs_prog.md` Experience Curve section.

| Level | XP to Next Level | Cumulative XP | Design Note |
|---|---|---|---|
| 1 → 2 | 5 | 5 | ~5 seconds in. First upgrade. |
| 2 → 3 | 10 | 15 | Unlocks Weapon 2 choice. |
| 3 → 4 | 15 | 30 | ~30 seconds. Comfortable pace. |
| 4 → 5 | 22 | 52 | ~50 seconds. Building momentum. |
| 5 → 6 | 32 | 84 | Unlocks Weapon 3 choice. |
| 6 → 7 | 45 | 129 | ~2 minutes. Escalation begins. |
| 7 → 8 | 62 | 191 | ~2:30. Player should feel strong. |
| 8 → 9 | 85 | 276 | ~3:15. Pre-boss power building. |
| 9 → 10 | 115 | 391 | ~3:45. Tension rising. |
| 10 → 11 | 155 | 546 | ~4:15. Boss fight in progress. |
| 11 → 12 | 210 | 756 | ~4:45. Near game end. |
| 12 → 13 | 280 | 1036 | Stretch goal for skilled players. |
| 13 → 14 | 375 | 1411 | Elite territory. |
| 14+ | `floor(375 × 1.3^(N-14))` | — | Formula for extended runs. |

---

## 3. XP Curve Formula

From `vs_prog.md` XP Curve Formula section.

For levels 1–14, use the table above. For level 15 and beyond:

```
xp_to_next(N) = floor(375 × 1.3^(N - 14))
```

This gives a 30% increase per level past 14, which is steep enough to discourage infinite scaling but smooth enough to avoid jarring jumps.

### Formula Examples

| Level | XP to Next Level |
|---|---|
| 14 | 375 (from table) |
| 15 | floor(375 × 1.3^1) = 487 |
| 16 | floor(375 × 1.3^2) = 634 |
| 17 | floor(375 × 1.3^3) = 824 |
| 18 | floor(375 × 1.3^4) = 1,071 |
| 20 | floor(375 × 1.3^6) = 1,818 |

---

## 4. Expected Level Milestones

From `vs_prog.md` Expected Level Milestones section.

| Timestamp | Expected Level | Notes |
|---|---|---|
| 0:05 | 2 | First upgrade. Weapon or passive choice. |
| 0:15 | 3 | Weapon 2 unlock becomes available. |
| 0:30 | 4 | Comfortable rhythm established. |
| 0:50 | 5 | Player has 2–3 upgrades. |
| 1:15 | 6 | Weapon 3 unlock becomes available. |
| 1:45 | 7 | Escalation phase. 2–3 weapons active. |
| 2:15 | 8 | Player should feel noticeably stronger. |
| 3:00 | 9 | Pre-boss tension. Dense enemy packs. |
| 3:30 | 10 | Boss warning appears. |
| 4:00 | 10–11 | Boss spawns. |
| 4:30 | 11–12 | Mid-boss fight. |
| 5:00 | 12–13 | Game ends. |

---

## 5. Level-Up Flow

### Trigger

When player XP ≥ threshold for next level:
1. Game pauses fully (V1: no slow-motion, hard pause)
2. Level-up screen overlays game
3. Player level increments by 1
4. XP bar resets to 0. **Excess XP IS carried over** — if the player needs 5 XP to level and gains 8 XP, they start at 3/10 XP toward the next level (Level 2→3 requires 10 XP). This prevents XP waste during fast-kill sequences.

### Level-Up Screen

1. Shows 3 random upgrade options (cards)
2. Each card shows:
   - Icon (weapon icon: square/projectile, circle/orbit, triangle/area; passive icon: heart/speed, shield/armor, magnet/range, star/crit)
   - Name (e.g., "Projectile" or "Max Health +20%")
   - Current state → New state (e.g., "Lv.3 → Lv.4" or "Stack 2 → Stack 3")
   - Description of the change (e.g., "Pierce +1 enemy" or "+20% max HP")
3. Options are drawn from the UPGRADE POOL (see §6)
4. Player clicks/taps one option
5. Game resumes after 0.3s delay (confetti/particle effect plays)

### Edge Cases

- **Multiple level-ups at once:** If the player gains enough XP for 2+ levels, only the first level-up is shown. The second is queued and shown after the first is resolved. **Max queue: 3.** If more than 3 level-ups queue, excess levels are applied automatically with random selections (no screen shown). This prevents infinite level-up screens during fast-kill sequences.
- **Level-up during boss charges:** Level-ups can trigger at any time, including mid-boss-charge. The boss freezes during the level-up pause. This is NOT considered an exploit — the player still needs to make a good choice, and the pause is brief (0.3s after selection). No special handling needed.
- **Only 1 weapon and it's maxed:** Show 3 passive stat boost options instead.
- **All weapons maxed and all passives maxed:** Show 3 random passives (even if at max stacks — the player can still pick them, but they have no effect. This is a degenerate case that shouldn't happen in a 5-minute run).

---

## 6. Upgrade Pool Rules

From `vs_prog.md` Upgrade Pool Composition section.

### Pool Categories

- **Weapon Upgrades (60% weight):** Upgrade an owned weapon by 1 level, or unlock a new weapon.
- **Passive Stat Boosts (40% weight):** Permanent stat increase.

### Pool Rules

1. **No duplicate options** in a single level-up screen.
2. **Max level exclusion:** If a weapon is at max level (7), it is excluded from the pool.
3. **Weapon unlock:** If a weapon is not yet owned but its unlock level has been reached, "Unlock [Weapon]" appears as an option. **Weapon unlocks are guaranteed to appear** in every level-up screen until picked. They have priority over other options — if the pool would otherwise show 3 passives, the weapon unlock replaces one.
4. **All weapons maxed:** If all weapons are maxed, the pool is 100% passive boosts.
5. **Passive stacking:** Passives can stack (e.g., picking Max Health +20% twice gives +40% total).
6. **Max stack exclusion:** If a passive is at max stacks, it is excluded from the pool.

### Weapon Unlock Schedule

| Weapon | Unlock Level | Expected Time |
|---|---|---|
| Weapon 1 (Projectile) | Start of game | 0:00 |
| Weapon 2 (Orbit) | Player reaches Level 3 | ~0:15 |
| Weapon 3 (Area) | Player reaches Level 6 | ~1:15 |

### Option Generation Algorithm

```
function generateLevelUpOptions(player):
    pool = []
    
    // Add weapon upgrades
    for weapon in player.weapons:
        if weapon.level < 7:
            pool.push({type: 'weapon_upgrade', weapon: weapon, weight: 60})
    
    // Add weapon unlocks (if unlock level reached and not owned)
    if player.level >= 3 and !player.hasWeapon(2):
        pool.push({type: 'weapon_unlock', weaponId: 2, weight: 60})
    if player.level >= 6 and !player.hasWeapon(3):
        pool.push({type: 'weapon_unlock', weaponId: 3, weight: 60})
    
    // Add passive boosts
    for passive in PASSIVE_BOOSTS:
        if passive.currentStacks < passive.maxStacks:
            pool.push({type: 'passive', passive: passive, weight: 40})
    
    // If pool is empty (all maxed), add all passives at max weight
    if pool.length === 0:
        for passive in PASSIVE_BOOSTS:
            pool.push({type: 'passive', passive: passive, weight: 100})
    
    // Select 3 unique options (no duplicates)
    options = selectUnique(pool, 3)
    return options
```

### Selection Method

Options are selected using weighted random sampling without replacement:
1. Calculate total weight of all pool entries
2. Roll a random number between 0 and total weight
3. Select the entry that the roll falls into
4. Remove that entry from the pool
5. Repeat until 3 options are selected

---

## 7. Passive Stat Boosts

From `vs_prog.md` Passive Stat Boosts section.

| Boost | Effect | Max Stacks | Per-Stack Value |
|---|---|---|---|
| Max Health +20% | Increases maximum HP | 5 | +20% of base HP (100) = +20 HP per stack |
| Movement Speed +10% | Faster movement | 3 | +10% of base speed (200 px/s) = +20 px/s per stack |
| Armor +1 | Reduces incoming damage by 1 (min 1) | 3 | +1 flat damage reduction per stack |
| Pickup Range +25px | Collect pickups from further away | 4 | +25px radius per stack |
| Crit Chance +5% | Chance for 1.5× damage | 4 | +5% crit chance per stack |

### Passive Effect Calculations

**Max Health +20%:**
- Stack 1: 100 → 120 HP. **Current HP also increases by the same amount** (e.g., if player has 80/100 HP, it becomes 100/120 HP). This ensures Max Health is always useful, even without healing.
- Stack 2: 120 → 140 HP (+20 current)
- Stack 3: 140 → 160 HP (+20 current)
- Stack 4: 160 → 180 HP (+20 current)
- Stack 5: 180 → 200 HP (+20 current, max)

**Movement Speed +10%:**
- Stack 1: 200 → 220 px/s
- Stack 2: 200 → 240 px/s
- Stack 3: 200 → 260 px/s (max)

**Armor +1:**
- Stack 1: 0 → 1 armor (reduces all damage by 1, minimum 1)
- Stack 2: 0 → 2 armor
- Stack 3: 0 → 3 armor (max)
- Note: Armor applies to ALL damage sources (enemy contact, caster projectiles, boss attacks, ground pound)

**Pickup Range +25px:**
- Stack 1: 50 → 75px
- Stack 2: 50 → 100px
- Stack 3: 50 → 125px
- Stack 4: 50 → 150px (max)
- Note: Magnet overrides pickup range to 350px during its duration. After magnet expires, range returns to the player's current base range (including passive bonuses).

**Crit Chance +5%:**
- Stack 1: 0% → 5% crit chance
- Stack 2: 0% → 10% crit chance
- Stack 3: 0% → 15% crit chance
- Stack 4: 0% → 20% crit chance (max)
- Note: Crit multiplier is 1.5× (from `02_character_spec.md`). Crits apply to all damage sources.

### XP Gain Animation

When the player collects XP gems, a floating text indicator appears:
- **Small gem (+1 XP):** Blue text (`#4FC3F7`), 10px, floats upward 20px over 0.3s, fades to 0% opacity
- **Large gem (+5 XP):** Blue text (`#81D4FA`), 12px, floats upward 20px over 0.3s, fades to 0% opacity
- **Scaled XP (post-XP-scaling):** Shows the actual value (e.g., "+1.15 XP" at minute 3)

See `01_engine_architecture.md` §7 for damage formula: `max(1, rawDamage - defender.armor)`. Armor passive stacks add directly to the `armor` stat.

---

## 8. Expected Upgrade Distribution

From `vs_prog.md` Expected Upgrade Distribution section.

In a typical 5-minute run with 12–13 level-ups:

| Category | Expected Picks | Notes |
|---|---|---|
| Weapon 1 upgrades | 3–4 | Player focuses on primary weapon. |
| Weapon 2 upgrades | 2–3 | Secondary weapon. |
| Weapon 3 upgrades | 1–2 | Late unlock, fewer picks. |
| Weapon unlocks | 0 (built into weapon picks) | W2 at level 3, W3 at level 6. |
| Passive boosts | 3–4 | Health, speed, armor most common. |

### Typical Run Breakdown

| Level | Timestamp | Likely Choice |
|---|---|---|
| 2 | 0:05 | W1 upgrade or Max Health |
| 3 | 0:15 | Unlock Weapon 2 |
| 4 | 0:30 | W1 upgrade or Movement Speed |
| 5 | 0:50 | W1 upgrade or W2 upgrade |
| 6 | 1:15 | Unlock Weapon 3 |
| 7 | 1:45 | W1 upgrade or W2 upgrade |
| 8 | 2:15 | W1 upgrade or Armor |
| 9 | 3:00 | W2 upgrade or Pickup Range |
| 10 | 3:30 | W1 upgrade or Crit Chance |
| 11 | 4:15 | W2 upgrade or W3 upgrade |
| 12 | 4:45 | Any available upgrade |
| 13 | 5:00 | Game ends (if reached) |

**Note:** This is a "good run" scenario. Bad RNG (all passives early, late weapon unlocks) can significantly alter the distribution.

---

## 9. Level-Up Visual Design

From `vs_plan.md` Prompt 7 — Section 4: Visual Design.

### Level-Up Screen Layout

```
+------------------------------------------------------+
|                                                       |
|              ★ LEVEL UP! ★                            |
|                                                       |
|  +----------+  +----------+  +----------+            |
|  |  [Icon]  |  |  [Icon]  |  |  [Icon]  |            |
|  |          |  |          |  |          |            |
|  | Weapon 1 |  | Max HP   |  | Weapon 2 |            |
|  | Lv.3→Lv.4|  | +20%     |  | Lv.1→Lv.2|            |
|  | Pierce+1 |  | 100→120  |  | +1 orb   |            |
|  +----------+  +----------+  +----------+            |
|                                                       |
|  [Current Weapons: W1 Lv.3  W2 Lv.1  W3 Lv.1]      |
|                                                       |
+------------------------------------------------------+
```

### Card Design

- **Size:** 200×280 px per card
- **Layout:** Icon (top, 64×64), Name (middle, bold), Level/Stack change (bottom, smaller)
- **Background:** Dark semi-transparent (`#1A1A2A` at 90% opacity)
- **Border:** 2px solid `#3B82F6` (electric blue)
- **Hover/Selected:** Elevate with shadow, border glows `#3B82F6`
- **Entrance animation:** Scale up from 0.8× over 0.2s, staggered by 0.1s per card

### Selection Effects

- **On click/tap:** Card flashes white (0.1s), then confetti/particle effect plays
- **Confetti:** 20 particles, random colors from Hero palette, scatter outward, fade over 0.5s
- **Delay:** 0.3s after selection before game resumes (gives time for the effect to play)

### Current Weapon Display

- Shown at the top of the level-up screen
- Row of weapon icons with level numbers
- Max level weapons have a gold border
- This helps the player make informed decisions

---

## 10. Cross-Reference Summary

| Section | References |
|---|---|
| XP table | `vs_prog.md` Experience Curve — XP Table (source of truth) |
| XP formula | `vs_prog.md` Experience Curve — XP Curve Formula |
| Level milestones | `vs_prog.md` Experience Curve — Expected Level Milestones |
| Upgrade pool rules | `vs_prog.md` Upgrade Pool Composition |
| Passive stat boosts | `vs_prog.md` Passive Stat Boosts |
| Passive max stacks | `vs_prog.md` Passive Stat Boosts |
| Weapon unlock schedule | `03_weapons_spec.md` §1 Weapon Overview |
| Weapon upgrade mechanics | `03_weapons_spec.md` §6 Weapon Level-Up |
| Player base stats | `02_character_spec.md` §2 Base Stats |
| Level-up screen layout | `08_ui_hud_spec.md` §2 Level-Up Screen |
| Level-up sound | `09_audio_spec.md` — ascending scale run C5→E5→G5→C6, 0.3s |
| JSON schema | `10_json_schemas.md` leveling.json |

---

*End of 07_leveling_system_spec.md — Version 1*
