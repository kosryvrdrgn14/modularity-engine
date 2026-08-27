# Melee Weapons Spec — V1.0

## Design Philosophy

Melee weapons compensate for **shorter range** with:
- Higher DPS than ranged weapons (risk vs reward)
- Multi-target potential (AoE or pierce)
- Utility effects (slow, stun, bleed)
- Better performance in crowded swarms

**Balance rule:** A melee weapon should clear **30-50% more enemies per second** than W1 projectile when used at optimal range, but has **40-60% less effective range**.

---

## Weapon Comparison Matrix

| Stat | W1 Projectile | Dagger | Sword (Whip) | Claymore |
|---|---|---|---|---|
| **Range** | 300px | 50-80px | 120-160px | 200-280px |
| **Base DPS** | 8 | 12 (6×2) | 10 | 7 |
| **Max DPS (Lv7)** | 43 | 50 | 35 | 25 (+ AoE) |
| **Attack Speed** | 1/s | 2/s | 0.8/s | 0.5/s |
| **AoE Width** | 0 (single) | 30px cone | 60px arc | 100px line |
| **Best Against** | Mixed | Swarms | Groups | Tanks/Boss |
| **Weakness** | Tanks | Range | Speed | Speed |
| **Ideal Map** | 5min | 3min | 5min | 10min |

---

## Weapon 1: Shadow Dagger

**Concept:** Rapid short-range stabs that shred low-HP swarms. The "machine gun" of melee weapons.

### Visual
- Purple/dark blade with afterimage trails
- Stab animation: quick forward thrust
- Lv7: Multiple dagger projection effect

### Stats Per Level

| Level | Damage | Cooldown | Hits | Total Damage/Attack | Range |
|---|---|---|---|---|---|
| 1 | 4 | 0.50s | 1 | 4 | 50px |
| 2 | 5 | 0.45s | 1 | 5 | 55px |
| 3 | 6 | 0.40s | 1 | 6 | 60px |
| 4 | 7 | 0.35s | 3 | 21 | 60px |
| 5 | 8 | 0.32s | 3 | 24 | 65px |
| 6 | 9 | 0.28s | 3 | 27 | 70px |
| 7 | 10 | 0.25s | 5 | 50 | 80px |

### DPS Analysis

| Level | DPS | vs W1 (DPS: 8-43) | Notes |
|---|---|---|---|
| 1 | 8 | Equal | Starts balanced |
| 2 | 11 | +38% | Pulls ahead |
| 3 | 15 | +40% | Strong early |
| 4 | 60 | +140% | **Power spike** (triple stab) |
| 5 | 75 | +110% | Scales well |
| 6 | 96 | +90% | Dominant |
| 7 | 200 | +365% | Insane burst (quintuple) |

### Power Spikes

**Lv4 — Triple Stab:**
- Each attack hits 3 times in rapid succession (0.1s between hits)
- Each hit deals full damage
- Cone width: 40px
- Clears rat/bat swarms effortlessly

**Lv7 — Quintuple Dagger Toss:**
- 5 daggers fan out in a cone (W2 orbit distance ~80px)
- Each dagger deals full damage
- Daggers have slight homing toward nearest enemy
- Cone width: 60px
- Can hit enemies slightly outside melee range

### Implementation Notes
- **Attack pattern:** Single forward thrust (Lv1-3), triple thrust (Lv4-6), fan toss (Lv7)
- **Hitbox:** Cone shape emanating from player
- **Hit detection:** Check enemies within cone angle (60°) and range
- **Cooldown:** After all hits in a combo complete
- **Complexity:** ⭐⭐ Low-Medium (cone hitbox + multi-hit)

### Strengths
- Highest single-target DPS at close range
- Melts rats/bats (1-2 shot kills)
- Fast cooldown means consistent damage
- Power spike at Lv4 is massive

### Weaknesses
- Shortest range of all weapons
- Requires enemies to be very close (risky)
- Lv7 daggers still limited range (80px)
- Useless against fast enemies that keep distance

---

## Weapon 2: Soul Whip (Sword)

**Concept:** Vampire Survivors whip — medium range arc that hits all enemies in a line. The "crowd control" melee weapon.

### Visual
- Ethereal blue/white energy whip
- Arc swing animation: horizontal sweep
- Lv7: Extended whip with trailing afterimage

### Stats Per Level

| Level | Damage | Cooldown | Targets Hit | Range | Arc Width |
|---|---|---|---|---|---|
| 1 | 8 | 1.25s | Unlimited | 120px | 50px |
| 2 | 10 | 1.15s | Unlimited | 130px | 55px |
| 3 | 12 | 1.05s | Unlimited | 140px | 60px |
| 4 | 15 | 0.95s | Unlimited | 150px | 70px |
| 5 | 18 | 0.85s | Unlimited | 160px | 80px |
| 6 | 22 | 0.78s | Unlimited | 175px | 90px |
| 7 | 28 | 0.70s | Unlimited | 200px | 100px |

### DPS Analysis

| Level | DPS | vs W1 (DPS: 8-43) | Notes |
|---|---|---|---|
| 1 | 6 | -25% | Starts weaker (AoE compensates) |
| 2 | 9 | +12% | Catches up |
| 3 | 11 | -8% | Balanced |
| 4 | 16 | +6% | Solid |
| 5 | 21 | -16% | Scaling slower |
| 6 | 28 | -35% | Lower single-target |
| 7 | 40 | -7% | Competitive |

**Note:** Whip DPS is lower than single-target weapons because it hits **all enemies in arc**. Effective DPS in crowds is 2-5x higher than shown.

### Power Spikes

**Lv4 — Wide Arc:**
- Arc width increases from 60px to 70px
- Can hit enemies slightly behind player
- Visual: wider swing animation

**Lv7 — Crimson Whip:**
- Arc range extends to 200px (longest whip reach)
- Leaves a brief damaging trail (0.3s, 50% damage)
- Visual: red afterimage effect
- Trail hits enemies that walk into it

### Implementation Notes
- **Attack pattern:** Horizontal arc sweep (180° in front)
- **Hitbox:** Sector shape (arc from player)
- **Hit detection:** Enemies within arc angle AND range take damage
- **Cooldown:** After full swing animation completes
- **Complexity:** ⭐⭐⭐ Medium (sector hitbox + trail effect)

### Strengths
- Hits ALL enemies in arc (great for swarms)
- Safe distance (120-200px)
- Consistent damage without aiming
- Lv7 trail adds passive AoE

### Weaknesses
- Lower single-target DPS than dagger
- Slower attack speed
- Arc only hits in front (must face enemies)
- Trail effect is brief (0.3s)

---

## Weapon 3: Grave Claymore

**Concept:** Massive sword with slow, devastating linear swings. The "boss killer" melee weapon with longest range.

### Visual
- Dark iron blade with glowing runes
- Slow overhead swing animation
- Lv4: Ground crack + explosion effect
- Lv7: Extended range + lingering damage zone

### Stats Per Level

| Level | Damage | Cooldown | Range | Line Width | AOE Duration |
|---|---|---|---|---|---|
| 1 | 15 | 2.00s | 200px | 80px | — |
| 2 | 18 | 1.85s | 220px | 85px | — |
| 3 | 22 | 1.70s | 240px | 90px | — |
| 4 | 28 | 1.55s | 260px | 100px | 0.5s (explosion) |
| 5 | 35 | 1.40s | 270px | 105px | 0.8s |
| 6 | 42 | 1.30s | 280px | 110px | 1.0s |
| 7 | 55 | 1.15s | 320px | 120px | 1.5s |

### DPS Analysis

| Level | DPS | vs W1 (DPS: 8-43) | Notes |
|---|---|---|---|
| 1 | 8 | Equal | Starts balanced |
| 2 | 10 | +25% | Pulls ahead |
| 3 | 13 | +30% | Strong |
| 4 | 18 | +33% + explosion | **Power spike** |
| 5 | 25 | +39% + AoE | Scaling well |
| 6 | 32 | +45% + AoE | Dominant |
| 7 | 48 | +12% + 1.5s AoE | Insane burst + zone |

**Note:** Claymore DPS includes AoE damage from lingering zones (Lv4+). Real effective DPS is 20-40% higher than shown when enemies stand in zones.

### Power Spikes

**Lv4 — Ground Slam:**
- Swing creates a ground crack at impact point
- Crack explodes after 0.5s dealing 50% of swing damage in 80px radius
- Visual: Orange/red crack effect + explosion
- Can hit enemies that weren't in initial swing

**Lv7 — Abyssal Cleave:**
- Range extends to 320px (rivaling W1 projectile!)
- Each swing leaves a damaging zone (1.5s duration, 30% of swing damage per tick)
- Zone is 120px wide, 200px long
- Visual: Dark purple energy lingers on ground
- Multiple zones can overlap for stacking damage

### Implementation Notes
- **Attack pattern:** Linear overhead swing (forward line)
- **Hitbox:** Rectangle (line width × range)
- **Hit detection:** Enemies within rectangle take damage
- **Lv4 explosion:** Separate AoE circle at swing endpoint
- **Lv7 zones:** Persistent damage zones (like W2 orbit trails but stationary)
- **Cooldown:** After full swing animation (includes windup)
- **Complexity:** ⭐⭐⭐⭐ High (rectangle hitbox + explosion + persistent zones)

### Strengths
- Longest melee range (320px at Lv7 = W1 range!)
- Highest burst damage (55 per swing at Lv7)
- AoE zones provide passive damage
- Excellent against bosses (high single-hit damage)
- Zones stack (can create kill zones)

### Weaknesses
- Slowest attack speed (0.5/s)
- Long windup makes it vulnerable
- Requires prediction (enemies move during windup)
- Zones are stationary (fast enemies avoid them)

---

## Balance Comparison vs W1 Projectile

### 3-Minute Map (Quick)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Dagger** | Highest DPS, melts swarms | Short range, risky | ⭐ Best choice |
| W1 Projectile | Safe, consistent | Lower DPS | Good fallback |
| Sword | Hits groups | Too slow for short map | Weakest |
| Claymore | High damage | Too slow, zones wasted | Weakest |

### 5-Minute Map (Standard)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Sword** | Balanced, hits groups | Moderate DPS | ⭐ Best choice |
| W1 Projectile | Safe, consistent | Lower crowd clear | Good |
| Dagger | High DPS | Risky, short range | Good (skill-based) |
| Claymore | Good damage | Slow, zones underused | Decent |

### 10-Minute Map (Highlight)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Claymore** | Zones stack, boss killer | Slow start, zones shine late | ⭐ Best choice |
| W1 Projectile | Safe, scales well | Lower peak DPS | Good |
| Sword | Consistent crowd clear | Lower boss damage | Good |
| Dagger | High DPS | Too risky late game | Decent (if skilled) |

---

## Implementation Complexity

| Weapon | Complexity | Estimated Lines | Key Systems |
|---|---|---|---|
| **Dagger** | ⭐⭐ Low-Med | ~150 | Cone hitbox, multi-hit combo |
| **Sword** | ⭐⭐⭐ Medium | ~200 | Sector hitbox, trail effect |
| **Claymore** | ⭐⭐⭐⭐ High | ~300 | Rectangle hitbox, explosion, persistent zones |

### Recommended Implementation Order
1. **Dagger** — Simplest, teaches melee mechanics
2. **Sword** — Medium complexity, teaches AoE
3. **Claymore** — Most complex, teaches persistent zones

---

## Potential Issues & Feedback

### Dagger Concerns
**Issue:** Lv7 quintuple toss still short range (80px) — feels underwhelming for Lv7.
**Recommendation:** Consider making Lv7 daggers travel outward 100-120px (W2 orbit distance) and return, creating a "boomerang" effect. This gives it more utility without breaking the short-range identity.

**Issue:** Triple stab at Lv4 might feel like "same attack, more hits" — lacks visual impact.
**Recommendation:** Add a brief "frenzy mode" visual (player glows, attack speed doubles for 0.5s) to make it feel more impactful.

### Sword Concerns
**Issue:** Whip comparison is apt, but VS whip has a unique property: it hits enemies **behind** the player too.
**Recommendation:** Consider making the sword arc 360° (or at least 270°) to differentiate from dagger's cone. This makes it the "hit everything around you" weapon.

**Issue:** Lower DPS might feel weak even though AoE compensates.
**Recommendation:** Add a "bleed" effect (5 damage over 2s) to give it sustained damage that rewards hitting many enemies.

### Claymore Concerns
**Issue:** Complex implementation (rectangle hitbox + explosion + persistent zones) — high bug risk.
**Recommendation:** Start with simpler zones (just damage on swing, no persistent effect) and add zones in a later patch.

**Issue:** Slow windup (2s at Lv1) feels bad when enemies are chasing you.
**Recommendation:** Add a "parry" mechanic — if an enemy hits you during windup, the swing deals 50% more damage. This rewards aggressive play.

**Issue:** Lv7 range (320px) equals W1 projectile range — why pick melee?
**Recommendation:** Keep Lv7 range at 280px (slightly shorter than W1) but make zones deal 40% damage instead of 30%. This maintains the "melee has shorter range but higher damage" identity.

---

## Final Recommendations

1. **Dagger:** Keep as designed, but consider Lv7 boomerang effect
2. **Sword:** Add 360° arc or bleed effect to differentiate from dagger
3. **Claymore:** Simplify initial implementation (no zones at Lv7), add zones later
4. **All weapons:** Add visual feedback (screen shake, hit effects) to make melee feel impactful
5. **Balance:** Playtest with actual wave compositions to verify DPS feels right

---

## Asset Requirements (Future)

| Weapon | SVG Needed | ViewBox | Notes |
|---|---|---|---|
| Dagger | `w6_dagger.svg` | 16×16 | Purple blade |
| Sword | `w7_sword.svg` | 16×16 | Energy whip arc |
| Claymore | `w8_claymore.svg` | 16×16 | Large dark blade |

### Animation Sprites (Future)
- Dagger: 3-frame stab animation
- Sword: 2-frame swing animation
- Claymore: 4-frame overhead swing

---

*Spec Version: 1.0*
*Status: Planning — No Implementation Yet*
*Next Step: File split, then implement weapons in order of complexity*
