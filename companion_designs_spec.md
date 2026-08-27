# Companion Designs Spec — V1.0

## Overview

Three new companions to complement the existing Dog companion. Each fills a distinct combat role:

| Companion | Role | Playstyle | Best With |
|---|---|---|---|
| **Dog** | Melee DPS | Rush in, AOE growl | Any weapon |
| **Healer** | Support | Stay close, threshold heals | Aggressive builds |
| **Archer** | Ranged DPS | Stay back, slow + poison | Kiting builds |
| **Mage** | AoE Support | Stay close, chain lightning + vulnerability | Boss fights |

---

## Existing Reference: Dog

### Dog Stats (Lv1 → Lv7)

| Level | Cooldown | Primary DMG | Secondary DMG | Total/Attack | DPS |
|---|---|---|---|---|---|
| 1 | 10.0s | 18 | 9 | 27 | 2.7 |
| 2 | 9.5s | 18 | 9 | 27 | 2.8 |
| 3 | 9.0s | 22 | 11 | 33 | 3.7 |
| 4 | 8.0s | 22 | 11 | 33 | 4.1 |
| 5 | 7.5s | 26 | 13 | 39 | 5.2 |
| 6 | 7.0s | 26 | 13 | 39 | 5.6 |
| 7 | 5.5s | 32 | 16 | 48 | 8.7 |

**Dog Characteristics:**
- Follow distance: 24px (very close)
- Cone attack: 60° angle, 60px range
- Detection range: 120px
- Hit cooldown: 1.0s
- Loot radius: 40px (collects nearby pickups)

---

## Companion 1: Healer (Priestess)

### Concept
A support companion who stays close and heals the player at specific HP thresholds. Limited number of heals per stage, making positioning and resource management important.

### Visual
- Light blue/white robe with healing cross
- Gentle glow aura
- Staff with blue orb
- SVG: `companion_healer.svg`

### Stats Per Level

| Level | Heal 1 (80%) | Heal 2 (60%) | Heal 3 (20%) | Total Heals | Follow Dist |
|---|---|---|---|---|---|
| 1 | 10 HP | 20 HP | 20 HP | 3 | 30px |
| 2 | 12 HP | 22 HP | 22 HP | 3 | 30px |
| 3 | 14 HP | 25 HP | 25 HP | 3 | 28px |
| 4 | 16 HP | 28 HP | 28 HP | 3 | 28px |
| 5 | 18 HP | 30 HP | 30 HP | 3 | 26px |
| 6 | 20 HP | 35 HP | 35 HP | 3 | 26px |
| 7 | 25 HP | 40 HP | 40 HP | 3 | 24px |

### Healing Thresholds

```
Player HP: 100%

Threshold 1: Player reaches 80% HP (80 HP)
→ Healer casts heal
→ Player gains 10-25 HP (based on level)
→ Heal counter: 2 remaining

Threshold 2: Player reaches 60% HP (60 HP)
→ Healer casts heal
→ Player gains 20-40 HP (based on level)
→ Heal counter: 1 remaining

Threshold 3: Player reaches 20% HP (20 HP)
→ Healer casts heal
→ Player gains 20-40 HP (based level)
→ Heal counter: 0 remaining

Total healing potential: 50-105 HP (scales with level)
```

### Healing Mechanics
```
Heal behavior:
1. Healer tracks player HP continuously
2. When HP crosses threshold DOWNWARD → trigger heal
3. Heal is instant (no cast time)
4. Visual: Green sparkle on player + floating text "+20 HP"
5. Healer says "Restores!" or similar
6. Once all 3 heals used, healer becomes passive (just follows)
```

### DPS Analysis
**Healer does NO damage.** Her value is in survivability.

**Effective HP Added:**
| Level | Total Heals | Effective HP | % Increase (100 HP player) |
|---|---|---|---|
| 1 | 3 | 50 HP | +50% |
| 2 | 3 | 56 HP | +56% |
| 3 | 3 | 64 HP | +64% |
| 4 | 3 | 72 HP | +72% |
| 5 | 3 | 78 HP | +78% |
| 6 | 3 | 90 HP | +90% |
| 7 | 3 | 105 HP | +105% |

### Power Spikes

**Lv4 — Improved Healing:**
- Heals increase by ~30%
- Visual: Heal effect becomes larger

**Lv7 — Master Healer:**
- Heals increase significantly
- Visual: Golden aura on player after heal
- Healer gains passive HP regen (1 HP/5s to player)

### Implementation Notes
- **Behavior:** Follow player at close range (24-30px)
- **AI:** No combat AI, just follows and tracks HP
- **Heal trigger:** Check player HP each frame, trigger on threshold crossing
- **Cooldown:** None (threshold-based, not time-based)
- **Complexity:** ⭐ Low (simple follow + HP tracking)

### Strengths
- Massive survivability boost (+50-105 HP)
- No cooldowns to manage
- Works with any playstyle
- Simple to implement

### Weaknesses
- No damage contribution
- Limited heals (3 per stage)
- Useless at full HP
- Late heals (20% threshold) might be too late

---

## Companion 2: Archer (Ranger)

### Concept
A ranged companion who stays at distance and applies slow + poison to enemies. Single-target focused with periodic burst damage.

### Visual
- Dark green hooded cloak
- Bow with arrow
- Quiver on back
- SVG: `companion_archer.svg`

### Stats Per Level

| Level | Arrow DMG | Slow | Poison | Arrow CD | Burst CD | Burst Count | Range |
|---|---|---|---|---|---|---|---|
| 1 | 8 | 20% | 2/2s | 3.0s | 10s | 2 | 120px |
| 2 | 10 | 25% | 3/2s | 2.8s | 10s | 2 | 125px |
| 3 | 12 | 30% | 4/2s | 2.6s | 9s | 2 | 130px |
| 4 | 15 | 35% | 5/2s | 2.4s | 9s | 3 | 135px |
| 5 | 18 | 40% | 6/2s | 2.2s | 8s | 3 | 140px |
| 6 | 22 | 45% | 8/2s | 2.0s | 8s | 3 | 145px |
| 7 | 28 | 50% | 10/2s | 1.8s | 7s | 4 | 150px |

### Attack Mechanics

**Normal Arrow (every 1.8-3.0s):**
```
1. Archer targets nearest enemy within 150px range
2. Fires single arrow at target
3. Arrow travels to target (0.2s flight time)
4. On hit: damage + 20-50% slow for 2s + poison (2-10 damage over 2s)
5. Visual: Green arrow projectile
```

**Burst Shot (every 7-10s):**
```
1. Timer reaches burst threshold
2. Archer fires 2-4 arrows in rapid succession (0.1s between)
3. Each arrow targets nearest enemy (can be same or different)
4. Each arrow applies full effects (damage + slow + poison)
5. Visual: Multiple arrows with green trail
```

### Slow Mechanics
```
Slow effect:
- Reduces enemy movement speed by 20-50%
- Duration: 2 seconds
- Visual: Enemy glows green
- Stacks with other slows (diminishing returns)
- Does NOT affect attack speed
```

### Poison Mechanics
```
Poison effect:
- Deals 2-10 damage per second for 2 seconds
- Total: 4-20 damage over duration
- Visual: Green poison bubbles on enemy
- Stacks up to 3 times (6-30 damage over 2s max)
- Does NOT affect boss damage reduction
```

### DPS Analysis

| Level | Arrow DPS | Burst DPS | Slow DPS | Poison DPS | Total |
|---|---|---|---|---|---|
| 1 | 2.7 | 1.6 | 0 | 2 | 6.3 |
| 2 | 3.6 | 1.8 | 0 | 3 | 8.4 |
| 3 | 4.6 | 2.0 | 0 | 4 | 10.6 |
| 4 | 6.3 | 3.3 | 0 | 5 | 14.6 |
| 5 | 8.2 | 3.8 | 0 | 6 | 18.0 |
| 6 | 11.0 | 4.2 | 0 | 8 | 23.2 |
| 7 | 15.6 | 5.6 | 0 | 10 | 31.2 |

**Note:** Slow doesn't add DPS but makes kiting easier. Effective DPS against fast enemies is higher.

### Power Spikes

**Lv4 — Triple Shot:**
- Burst fires 3 arrows instead of 2
- Damage increases significantly
- Visual: Triple arrow spread

**Lv7 — Master Ranger:**
- Burst fires 4 arrows
- Arrow cooldown reduced to 1.8s
- Slow increased to 50%
- Visual: Arrows leave green trail

### Implementation Notes
- **Behavior:** Stay 100-150px from player, follow at distance
- **AI:** Target nearest enemy in range, fire arrows
- **Arrow projectile:** Linear travel with homing toward target
- **Slow application:** On hit, apply debuff to enemy
- **Poison application:** On hit, apply DoT to enemy
- **Complexity:** ⭐⭐⭐ Medium (projectile AI + debuff system)

### Strengths
- Safe distance (100-150px)
- Slow makes kiting easier
- Poison stacks for sustained damage
- Burst shot handles priority targets
- Good single-target DPS

### Weaknesses
- Lower AoE than dog/mage
- Requires enemies to be in range
- Slow doesn't help against ranged enemies
- Poison is less effective against high-HP targets

---

## Companion 3: Mage (Sorceress)

### Concept
An AoE support companion who stays close and casts chain lightning. Applies vulnerability debuff to increase player damage.

### Visual
- Dark purple hooded robe
- Staff with lightning orb
- Floating lightning sparks
- SVG: `companion_mage.svg`

### Stats Per Level

| Level | Lightning DMG | Chain Hits | Vulnerability | Vuln Duration | Cooldown | Follow Dist |
|---|---|---|---|---|---|---|
| 1 | 12 | 5 | 20% | 3s | 7.5s | 32px |
| 2 | 15 | 5 | 22% | 3s | 7.0s | 32px |
| 3 | 18 | 5 | 24% | 3s | 6.5s | 30px |
| 4 | 22 | 6 | 26% | 3.5s | 6.0s | 30px |
| 5 | 26 | 6 | 28% | 3.5s | 5.5s | 28px |
| 6 | 30 | 7 | 30% | 4s | 5.0s | 28px |
| 7 | 38 | 8 | 35% | 4s | 4.5s | 26px |

### Chain Lightning Mechanics

```
Chain behavior:
1. Mage targets nearest enemy within 120px
2. Lightning strikes primary target (full damage)
3. Lightning chains to up to 4-7 nearby enemies (within 80px of previous)
4. Each chain deals FULL damage (no reduction)
5. Visual: Blue lightning bolt between targets
6. Total hits: 5-8 enemies per cast

Example (Lv1):
- Primary target: 12 damage
- Chain 1: 12 damage (enemy within 80px)
- Chain 2: 12 damage (enemy within 80px of chain 1)
- Chain 3: 12 damage
- Chain 4: 12 damage
- Total: 60 damage across 5 enemies
```

### Vulnerability Mechanics

```
Vulnerability effect:
- Increases ALL damage taken by enemy by 20-35%
- Duration: 3-4 seconds
- Visual: Purple crackle on enemy
- Stacks with other vulnerabilities (diminishing returns)
- Affects: Player weapons, companion attacks, other sources

Example (Lv7, 35% vulnerability):
- Player deals 100 damage → enemy takes 135 damage
- Mage deals 38 damage → enemy takes 51.3 damage
- Total amplification across full combo is significant
```

### DPS Analysis

| Level | Lightning DPS | Vuln Amplification | Total Effective DPS |
|---|---|---|---|
| 1 | 8.0 | +20% (on 1 target) | 9.6 |
| 2 | 10.7 | +22% | 13.1 |
| 3 | 13.8 | +24% | 17.1 |
| 4 | 18.3 | +26% | 23.1 |
| 5 | 21.8 | +28% | 27.9 |
| 6 | 26.7 | +30% | 34.7 |
| 7 | 33.8 | +35% | 45.6 |

**Note:** Vulnerability amplifies ALL damage, so effective DPS is higher than shown when combined with player weapons.

### Power Spikes

**Lv4 — Extended Chain:**
- Chains to 6 enemies instead of 5
- Vulnerability duration increased to 3.5s
- Visual: Longer lightning chain

**Lv7 — Archmage:**
- Chains to 8 enemies
- Vulnerability increased to 35%
- Cooldown reduced to 4.5s
- Visual: Purple lightning with screen flash

### Implementation Notes
- **Behavior:** Follow player at close range (26-32px)
- **AI:** Target nearest enemy, cast chain lightning
- **Chain logic:** Find nearest unchained enemy within 80px of last target
- **Vulnerability:** Apply debuff on hit, amplify incoming damage
- **Complexity:** ⭐⭐⭐⭐ High (chain targeting + vulnerability system)

### Strengths
- Massive AoE (hits 5-8 enemies)
- Vulnerability amplifies player damage
- Good burst damage on cooldown
- Works well against grouped enemies
- Synergizes with all weapons

### Weaknesses
- Long cooldown (4.5-7.5s)
- Single target between casts
- Requires enemies to be grouped for chains
- Vulnerability duration is short (3-4s)

---

## Balance Comparison

### DPS Comparison (Lv7)

| Companion | Single-Target DPS | AoE DPS | Utility |
|---|---|---|---|
| **Dog** | 8.7 | 8.7 (cone) | Loot collection |
| **Healer** | 0 | 0 | +105 HP |
| **Archer** | 31.2 | 0 (single target) | 50% slow, poison |
| **Mage** | 33.8 | 33.8 (chain) | +35% vulnerability |

### Effective Value Analysis

**Dog:**
- Raw DPS: 8.7
- Utility: Loot collection (40px radius)
- Effective value: **Medium DPS + utility**

**Healer:**
- Raw DPS: 0
- Utility: +105 HP at Lv7
- Effective value: **Massive survivability**

**Archer:**
- Raw DPS: 31.2
- Utility: 50% slow, poison DoT
- Effective value: **High single-target + crowd control**

**Mage:**
- Raw DPS: 33.8
- Utility: +35% vulnerability
- Effective value: **High AoE + damage amplification**

### When Each Companion Excels

| Scenario | Best Companion | Why |
|---|---|---|
| Aggressive melee play | **Healer** | Extra HP lets you take risks |
| Kiting/fast enemies | **Archer** | Slow makes them easier to dodge |
| Boss fights | **Mage** | Vulnerability + chain lightning |
| Mixed waves | **Dog** | Balanced DPS + loot collection |
| Hard stage (10min) | **Mage + Healer** | Survivability + damage amp |

### Slot Pairing Recommendations

| Slot | Weapon | Companion | Synergy |
|---|---|---|---|
| 1 (W1 Projectile) | Range | Archer | Both ranged, safe positioning |
| 2 (W2 Orbit) | AoE | Mage | Both AoE, massive damage |
| 3 (W3 Area) | Burst | Healer/Dog | Survivability or balanced |

---

## Implementation Complexity

| Companion | Complexity | Estimated Lines | Key Systems |
|---|---|---|---|
| **Healer** | ⭐ Low | ~80 | HP tracking, threshold triggers |
| **Archer** | ⭐⭐⭐ Medium | ~200 | Projectile AI, slow/poison debuffs |
| **Mage** | ⭐⭐⭐⭐ High | ~250 | Chain targeting, vulnerability system |

### Recommended Implementation Order
1. **Healer** — Simplest, teaches companion mechanics
2. **Archer** — Medium complexity, teaches projectile + debuffs
3. **Mage** — Most complex, teaches chain targeting + vulnerability

---

## Potential Issues & Feedback

### Healer
**✅ Simple and effective** — Threshold-based healing is easy to understand.
**⚠️ Concern:** 3 heals might feel too limited on 10-min maps. Consider adding a "recharge" mechanic (healer regenerates 1 heal every 2 minutes).

### Archer
**✅ Great utility** — Slow + poison makes kiting much easier.
**⚠️ Concern:** 3-second arrow cooldown might feel slow. Consider reducing to 2.5s at base level.

### Mage
**✅ Powerful AoE** — Chain lightning hitting 5-8 enemies is satisfying.
**⚠️ Concern:** Vulnerability might be too strong in boss fights. Consider capping at 25% instead of 35% at Lv7.

---

## Asset Requirements

| Companion | SVG Created | ViewBox | Status |
|---|---|---|---|
| Healer | `companion_healer.svg` | 14×14 | ✅ Created |
| Archer | `companion_archer.svg` | 14×14 | ✅ Created |
| Mage | `companion_mage.svg` | 14×14 | ✅ Created |

### Animation Sprites (Future)
- Healer: Staff raise + green sparkle
- Archer: Bow draw + arrow fire
- Mage: Staff channel + lightning cast

---

## Future Additions (Noted for Later)

- **Healer Recharge:** Regenerate 1 heal every 2 minutes
- **Archer Multi-Shot:** Hit multiple enemies with one arrow
- **Mage Overload:** Ultimate ability after 5 casts

---

*Spec Version: 1.0*
*Status: Planning — No Implementation Yet*
*Next Step: File split, then implement companions in order of complexity*
