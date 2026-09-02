# Companion Designs Spec — V1.1

## Overview

Three new companions to complement the existing Dog companion. Each fills a distinct combat role:

| Companion | Role | Playstyle | Best With |
|---|---|---|---|
| **Dog** | Melee DPS | Rush in, AOE growl | Any weapon |
| **Healer** | Beginner Support | Stay close, threshold heals + passive regen | Risk-averse players |
| **Archer** | Ranged DPS | Stay back, fast arrows + slow + poison | Kiting builds |
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
A support companion for **beginners and risk-averse players**. Provides safety net through threshold heals + passive regen. Good players won't need her — Dog is better for DPS.

### Visual
- Light blue/white robe with healing cross
- Gentle glow aura
- Staff with blue orb
- SVG: `companion_healer.svg`

### Stats Per Level

| Level | Heal 1 (80%) | Heal 2 (60%) | Heal 3 (20%) | Passive Regen | Follow Dist |
|---|---|---|---|---|---|
| 1 | 15 HP | 25 HP | 25 HP | 1 HP/5s | 30px |
| 2 | 17 HP | 27 HP | 27 HP | 1 HP/5s | 30px |
| 3 | 20 HP | 30 HP | 30 HP | 1 HP/5s | 28px |
| 4 | 22 HP | 33 HP | 33 HP | 1 HP/5s | 28px |
| 5 | 25 HP | 35 HP | 35 HP | 1 HP/5s | 26px |
| 6 | 28 HP | 40 HP | 40 HP | 1 HP/5s | 26px |
| 7 | 32 HP | 45 HP | 45 HP | 1 HP/5s | 24px |

### Healing Thresholds

```
Player HP: 100%

Threshold 1: Player reaches 80% HP (80 HP)
→ Healer casts heal
→ Player gains 15-32 HP (based on level)
→ Heal counter: 2 remaining

Threshold 2: Player reaches 60% HP (60 HP)
→ Healer casts heal
→ Player gains 25-45 HP (based on level)
→ Heal counter: 1 remaining

Threshold 3: Player reaches 20% HP (20 HP)
→ Healer casts heal
→ Player gains 25-45 HP (based on level)
→ Heal counter: 0 remaining

Total healing potential: 65-122 HP (scales with level)
```

### Passive Regen Mechanics

```
Passive regen:
- Healer provides 1 HP per 5 seconds continuously
- Works even after all 3 heals are used
- Visual: Subtle green sparkle on player every 5s
- Does NOT stack with other healers
- Provides ~12 HP/min sustained healing

Total effective HP per stage:
- 3min map: ~36 HP from regen + 65-122 from heals = 101-158 HP
- 5min map: ~60 HP from regen + 65-122 from heals = 125-182 HP
- 10min map: ~120 HP from regen + 65-122 from heals = 185-242 HP
```

### DPS Analysis
**Healer does NO direct damage.** Her value is in survivability.

**Effective HP Added:**
| Level | Total Heals | Regen (5min) | Total HP | % Increase (100 HP) |
|---|---|---|---|---|
| 1 | 65 HP | 60 HP | 125 HP | +125% |
| 2 | 71 HP | 60 HP | 131 HP | +131% |
| 3 | 80 HP | 60 HP | 140 HP | +140% |
| 4 | 88 HP | 60 HP | 148 HP | +148% |
| 5 | 95 HP | 60 HP | 155 HP | +155% |
| 6 | 108 HP | 60 HP | 168 HP | +168% |
| 7 | 122 HP | 60 HP | 182 HP | +182% |

### Power Spikes

**Lv4 — Improved Healing:**
- Heals increase by ~25%
- Visual: Heal effect becomes larger

**Lv7 — Master Healer:**
- Heals increase significantly
- Visual: Golden aura on player after heal
- Passive regen becomes 1 HP/4s (slight buff)

### Implementation Notes
- **Behavior:** Follow player at close range (24-30px)
- **AI:** No combat AI, just follows and tracks HP
- **Heal trigger:** Check player HP each frame, trigger on threshold crossing
- **Passive regen:** Timer-based, heal 1 HP every 5 seconds
- **Complexity:** ⭐ Low (HP tracking + timer)

### Strengths
- Massive survivability boost (+125-182% HP)
- Passive regen provides sustained healing
- Simple to understand and use
- Perfect for beginners learning the game

### Weaknesses
- No damage contribution
- Limited heals (3 per stage)
- Good players won't need her
- Regen is slow (1 HP/5s)

### Design Intent
> "Healer is a crutch for new players. Once you learn enemy patterns and positioning, switch to Dog for DPS. She exists so bad players can still enjoy the game without rage-quitting."

---

## Companion 2: Archer (Ranger)

### Concept
A ranged companion who stays at distance and applies slow + poison. Fast attack speed for consistent single-target damage.

### Visual
- Dark green hooded cloak
- Bow with arrow
- Quiver on back
- SVG: `companion_archer.svg`

### Stats Per Level

| Level | Arrow DMG | Slow | Poison | Arrow CD | Burst CD | Burst Count | Range |
|---|---|---|---|---|---|---|---|
| 1 | 8 | 20% | 2/2s | 2.2s | 10s | 2 | 120px |
| 2 | 10 | 25% | 3/2s | 2.0s | 10s | 2 | 125px |
| 3 | 12 | 30% | 4/2s | 1.8s | 9s | 2 | 130px |
| 4 | 15 | 35% | 5/2s | 1.6s | 9s | 3 | 135px |
| 5 | 18 | 40% | 6/2s | 1.4s | 8s | 3 | 140px |
| 6 | 22 | 45% | 8/2s | 1.2s | 8s | 3 | 145px |
| 7 | 28 | 50% | 10/2s | 1.0s | 7s | 4 | 150px |

### Attack Mechanics

**Normal Arrow (every 1.0-2.2s):**
```
1. Archer targets nearest enemy within 150px range
2. Fires single arrow at target
3. Arrow travels to target (0.15s flight time)
4. On hit: damage + 20-50% slow for 2s + poison (2-10 damage over 2s)
5. Visual: Green arrow projectile
```

**Burst Shot (every 7-10s):**
```
1. Timer reaches burst threshold
2. Archer fires 2-4 arrows in rapid succession (0.08s between)
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

| Level | Arrow DPS | Burst DPS | Poison DPS | Total |
|---|---|---|---|---|
| 1 | 3.6 | 1.6 | 2 | 7.2 |
| 2 | 5.0 | 1.8 | 3 | 9.8 |
| 3 | 6.7 | 2.0 | 4 | 12.7 |
| 4 | 9.4 | 3.3 | 5 | 17.7 |
| 5 | 12.9 | 3.8 | 6 | 22.7 |
| 6 | 18.3 | 4.2 | 8 | 30.5 |
| 7 | 28.0 | 5.6 | 10 | 43.6 |

**Note:** Slow doesn't add DPS but makes kiting easier. Effective DPS against fast enemies is higher.

### Power Spikes

**Lv4 — Triple Shot:**
- Burst fires 3 arrows instead of 2
- Damage increases significantly
- Visual: Triple arrow spread

**Lv7 — Master Ranger:**
- Burst fires 4 arrows
- Arrow cooldown reduced to 1.0s (very fast)
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
- Fast attack speed (1.0s at Lv7)
- Slow makes kiting easier
- Poison stacks for sustained damage
- Good single-target DPS

### Weaknesses
- Lower AoE than dog/mage
- Requires enemies to be in range
- Slow doesn't help against ranged enemies
- Poison is less effective against high-HP targets

---

## Companion 3: Mage (Sorceress)

### Concept
An AoE support companion who stays close and casts chain lightning. Applies vulnerability debuff (capped at 25%) to increase player damage.

### Visual
- Dark purple hooded robe
- Staff with lightning orb
- Floating lightning sparks
- SVG: `companion_mage.svg`

### Stats Per Level

| Level | Lightning DMG | Chain Hits | Vulnerability | Vuln Duration | Cooldown | Follow Dist |
|---|---|---|---|---|---|---|
| 1 | 12 | 5 | 15% | 3s | 7.5s | 32px |
| 2 | 15 | 5 | 17% | 3s | 7.0s | 32px |
| 3 | 18 | 5 | 19% | 3s | 6.5s | 30px |
| 4 | 22 | 6 | 21% | 3.5s | 6.0s | 30px |
| 5 | 26 | 6 | 23% | 3.5s | 5.5s | 28px |
| 6 | 30 | 7 | 25% | 4s | 5.0s | 28px |
| 7 | 38 | 8 | 25% (cap) | 4s | 4.5s | 26px |

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
- Increases ALL damage taken by enemy by 15-25% (capped at 25%)
- Duration: 3-4 seconds
- Visual: Purple crackle on enemy
- Stacks with other vulnerabilities (diminishing returns)
- Affects: Player weapons, companion attacks, other sources

Example (Lv6-7, 25% vulnerability):
- Player deals 100 damage → enemy takes 125 damage
- Mage deals 38 damage → enemy takes 47.5 damage
- Total amplification across full combo is significant
```

### DPS Analysis

| Level | Lightning DPS | Vuln Amplification | Total Effective DPS |
|---|---|---|---|
| 1 | 8.0 | +15% | 9.2 |
| 2 | 10.7 | +17% | 12.5 |
| 3 | 13.8 | +19% | 16.4 |
| 4 | 18.3 | +21% | 22.1 |
| 5 | 21.8 | +23% | 26.8 |
| 6 | 26.7 | +25% | 33.4 |
| 7 | 33.8 | +25% | 42.3 |

**Note:** Vulnerability amplifies ALL damage, so effective DPS is higher than shown when combined with player weapons.

### Power Spikes

**Lv4 — Extended Chain:**
- Chains to 6 enemies instead of 5
- Vulnerability duration increased to 3.5s
- Visual: Longer lightning chain

**Lv7 — Archmage:**
- Chains to 8 enemies
- Vulnerability capped at 25% (max)
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
| **Healer** | 0 | 0 | +182 HP (5min map) |
| **Archer** | 43.6 | 0 (single target) | 50% slow, poison |
| **Mage** | 33.8 | 33.8 (chain) | +25% vulnerability |

### Effective Value Analysis

**Dog:**
- Raw DPS: 8.7
- Utility: Loot collection (40px radius)
- Effective value: **Medium DPS + utility**

**Healer:**
- Raw DPS: 0
- Utility: +182 HP (5min map) = ~36s extra life at 5 DPS taken
- Effective value: **Massive survivability for beginners**

**Archer:**
- Raw DPS: 43.6
- Utility: 50% slow, poison DoT
- Effective value: **High single-target + crowd control**

**Mage:**
- Raw DPS: 33.8
- Utility: +25% vulnerability
- Effective value: **High AoE + damage amplification**

### When Each Companion Excels

| Scenario | Best Companion | Why |
|---|---|---|
| Beginner/learning | **Healer** | Safety net, passive regen |
| Kiting/fast enemies | **Archer** | Slow makes them easier to dodge |
| Boss fights | **Mage** | Vulnerability + chain lightning |
| Mixed waves | **Dog** | Balanced DPS + loot collection |
| Hard stage (10min) | **Mage + Dog** | Damage amp + balanced DPS |

### Slot Pairing Recommendations

| Slot | Weapon | Companion | Synergy |
|---|---|---|---|
| 1 (W1 Projectile) | Range | Archer | Both ranged, safe positioning |
| 2 (W2 Orbit) | AoE | Mage | Both AoE, massive damage |
| 3 (W3 Area) | Burst | Dog/Healer | Survivability or balanced |

---

## Late Game Scaling (VS Style)

This is a **Vampire Survivors-style game**. Late game should be **ridiculous damage scaling**.

### Weapon + Companion Combos

**Example: Mage + W5 Arcane Bolt (Chain Lightning)**
```
Lv7 Mage: 38 damage × 8 chains = 304 damage per cast
Lv7 W5: 45 damage × 3 projectiles = 135 damage per shot
Vulnerability: +25% to ALL damage

Combined DPS: ~80-100 DPS (before weapon upgrades)
With weapon power spikes: 200-400 DPS
```

**Example: Archer + W4 Flame Wave (DoT Stacking)**
```
Lv7 Archer: 28 damage × 4 burst = 112 damage per burst
Poison: 10 damage/s × 2s × 3 stacks = 60 damage
Lv7 W4: 35 damage × 2 waves = 70 damage per shot

Combined DPS: ~60-80 DPS (before weapon upgrades)
With weapon power spikes: 150-300 DPS
```

**Example: Dog + W1 Projectile (Balanced)**
```
Lv7 Dog: 32 damage per growl (8.7 DPS)
Lv7 W1: 28 damage × 3 projectiles = 84 damage per shot

Combined DPS: ~50-70 DPS (before weapon upgrades)
With weapon power spikes: 100-200 DPS
```

### Scaling Curve

```
Early Game (0-2min): 10-30 DPS
Mid Game (2-5min): 50-150 DPS
Late Game (5-10min): 200-500 DPS
End Game (10min+): 500-1000+ DPS

The game should feel EASY by end game.
Players should feel POWERFUL.
That's the VS fantasy.
```

### Combo Synergies (Future)

| Combo | Effect | Scaling |
|---|---|---|
| Mage + W5 Arcane | Chain lightning + chain bolts | Insane AoE |
| Archer + W4 Flame | Slow + fire DoT | DoT stacking |
| Dog + W1 Projectile | Balanced + loot | Consistent DPS |
| Mage + W2 Orbit | Vulnerability + orbit damage | Boss killer |
| Archer + W3 Area | Slow + AoE burst | Crowd control |

---

## Implementation Complexity

| Companion | Complexity | Estimated Lines | Key Systems |
|---|---|---|---|
| **Healer** | ⭐ Low | ~100 | HP tracking, threshold triggers, passive regen |
| **Archer** | ⭐⭐⭐ Medium | ~200 | Projectile AI, slow/poison debuffs |
| **Mage** | ⭐⭐⭐⭐ High | ~250 | Chain targeting, vulnerability system |

### Recommended Implementation Order
1. **Healer** — Simplest, teaches companion mechanics
2. **Archer** — Medium complexity, teaches projectile + debuffs
3. **Mage** — Most complex, teaches chain targeting + vulnerability

---

## Potential Issues & Feedback

### Healer
**✅ Perfect for beginners** — Passive regen + threshold heals = safe learning experience.
**⚠️ Watch for:** Players never switching off healer. Consider adding a "Healer Mastery" achievement for completing a stage without using heals.

### Archer
**✅ Fast attack speed feels good** — 1.0s at Lv7 is satisfying.
**⚠️ Watch for:** Slow might be too strong in late game. Consider reducing max slow to 40% if kiting becomes trivial.

### Mage
**✅ Vulnerability cap at 25% is balanced** — Powerful but not game-breaking.
**⚠️ Watch for:** Chain lightning targeting might be janky. Consider adding a "chain priority" system (prioritize low-HP enemies).

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

- **Healer Mastery Achievement:** Complete stage without using heals
- **Archer Multi-Shot:** Hit multiple enemies with one arrow
- **Mage Overload:** Ultimate ability after 5 casts
- **Companion Evolutions:** Combine companions for hybrid forms
- **Companion Equipment:** Give companions items to boost stats

---

*Spec Version: 1.1*
*Status: Planning — No Implementation Yet*
*Changes: Healer passive regen added, Archer fire rate increased, Mage vuln capped at 25%*
*Next Step: File split, then implement companions in order of complexity*
