# Melee Weapons Spec — V1.1

## Design Philosophy

Melee weapons compensate for **shorter range** with:
- Higher DPS than ranged weapons (risk vs reward)
- Multi-target potential (AoE or pierce)
- Utility effects (slow, stun, bleed)
- Better performance in crowded swarms

**Balance rule:** A melee weapon should clear **30-50% more enemies per second** than W1 projectile when used at optimal range, but has **40-60% less effective range**.

---

## Weapon Comparison Matrix (Updated)

| Stat | W1 Projectile | Dagger | Sword (Whip) | Claymore |
|---|---|---|---|---|
| **Range** | 300px | 50-100px | 140-180px | 100-140px |
| **Base DPS** | 8 | 12 (6×2) | 14 (7×2) | 18 |
| **Max DPS (Lv7)** | 43 | 50 (+ boomerang) | 55 (+ bleed) | 30 (+ huge AoE) |
| **Attack Speed** | 1/s | 2/s | 0.8/s | 0.5/s |
| **AoE Width** | 0 (single) | 30px cone | 160px (front+back) | 160px (line) |
| **Best Against** | Mixed | Swarms | Groups (360°) | Boss + adds |
| **Weakness** | Tanks | Range | Single-target | Speed |
| **Ideal Map** | 5min | 3min | 5min | 10min |

### Movement Strategy

| Weapon | Movement Style | Why |
|---|---|---|
| **Dagger** | Rush in, kill, dash out | Short range forces aggressive positioning |
| **Sword** | Strafe left/right, hit both sides | Front+back whip means you can run parallel to enemies |
| **Claymore** | Stand ground, aim at boss + adds | Short range but huge AoE covers boss + surrounding mobs |

---

## Weapon 1: Shadow Dagger

**Concept:** Rapid short-range stabs that shred low-HP swarms. The "machine gun" of melee weapons.

### Visual
- Purple/dark blade with afterimage trails
- Stab animation: quick forward thrust
- Lv4: Triple stab with purple slash effects
- Lv7: Boomerang daggers with return trail

### Stats Per Level

| Level | Damage | Cooldown | Hits | Total Damage/Attack | Range | Notes |
|---|---|---|---|---|---|---|
| 1 | 4 | 0.50s | 1 | 4 | 50px | Single stab |
| 2 | 5 | 0.45s | 1 | 5 | 55px | Single stab |
| 3 | 6 | 0.40s | 1 | 6 | 60px | Single stab |
| 4 | 7 | 0.35s | 3 | 21 | 60px | Triple stab |
| 5 | 8 | 0.32s | 3 | 24 | 65px | Triple stab |
| 6 | 9 | 0.28s | 3 | 27 | 70px | Triple stab |
| 7 | 10 | 0.25s | 5 | 50 | 100px | Boomerang toss |

### DPS Analysis

| Level | DPS | vs W1 (DPS: 8-43) | Notes |
|---|---|---|---|
| 1 | 8 | Equal | Starts balanced |
| 2 | 11 | +38% | Pulls ahead |
| 3 | 15 | +40% | Strong early |
| 4 | 60 | +140% | **Power spike** (triple stab) |
| 5 | 75 | +110% | Scales well |
| 6 | 96 | +90% | Dominant |
| 7 | 200 | +365% | Insane burst (boomerang) |

### Power Spikes

**Lv4 — Triple Stab:**
- Each attack hits 3 times in rapid succession (0.1s between hits)
- Each hit deals full damage
- Cone width: 40px
- Clears rat/bat swarms effortlessly

**Lv7 — Boomerang Toss:**
- 5 daggers fan out in a cone
- Daggers travel outward to **100px** (W2 orbit distance)
- Daggers **return** to player, hitting enemies on the way back
- Each dagger deals full damage **both ways** (outbound + inbound)
- Total potential hits: 10 per attack (5 out × 2)
- Cone width: 60px
- Visual: Purple daggers with trailing afterimages

### Boomerang Mechanics
```
Attack flow:
1. Player throws 5 daggers forward in cone
2. Daggers travel outward (0.15s)
3. Daggers reach max range (100px)
4. Daggers return to player (0.15s)
5. Enemies hit on return take full damage
6. Cooldown starts after all daggers return

Total attack time: 0.3s (out + back)
Cooldown: 0.25s after return
Effective DPS: 200 (if all hit both ways)
```

### Implementation Notes
- **Attack pattern:** Forward cone throw → boomerang return
- **Hitbox:** Cone shape (outbound) + Cone shape (inbound)
- **Hit detection:** Enemies within cone AND range take damage each pass
- **Cooldown:** After all daggers return to player
- **Complexity:** ⭐⭐⭐ Medium (cone hitbox + boomerang path + multi-hit)

### Strengths
- Highest burst damage when enemies are close
- Boomerang hits enemies behind you on return
- Melts rats/bats (1-2 shot kills)
- Fast cooldown means consistent damage

### Weaknesses
- Shortest range of all weapons (50-100px)
- Requires enemies to be very close (risky)
- Boomerang has travel time (0.3s) — fast enemies may dodge
- Useless against enemies that keep max distance

---

## Weapon 2: Soul Whip (Sword)

**Concept:** Vampire Survivors-style whip that hits **front AND back**. The "movement freedom" melee weapon — strafe left/right to hit enemies on both sides.

### Visual
- Ethereal blue/white energy whip
- Swing animation: horizontal sweep front, then back
- Lv4: Wide arc with blue trail
- Lv7: Extended whip with crimson afterimage + bleed effect

### Stats Per Level

| Level | Damage | Cooldown | Targets | Range | Arc | Bleed |
|---|---|---|---|---|---|---|
| 1 | 10 | 1.25s | Unlimited | 140px | 80px | — |
| 2 | 12 | 1.15s | Unlimited | 150px | 85px | — |
| 3 | 15 | 1.05s | Unlimited | 160px | 90px | — |
| 4 | 18 | 0.95s | Unlimited | 170px | 100px | — |
| 5 | 22 | 0.85s | Unlimited | 175px | 110px | 5/2s |
| 6 | 27 | 0.78s | Unlimited | 180px | 120px | 8/2s |
| 7 | 35 | 0.70s | Unlimited | 180px | 160px | 12/2s |

### Attack Pattern (Front + Back)

```
Swing pattern:
1. Whip swings FRONT (180° arc, range 140-180px)
2. Brief pause (0.1s)
3. Whip swings BACK (180° arc, same range)
4. Cooldown starts

Total attack time: 0.6s (front + back)
Cooldown: 0.70s after both swings
Effective DPS: 35 (single target, both swings)
Effective DPS in crowd: 70-140 (hitting 2-4 enemies per swing)
```

**Movement Strategy:**
- Strafe LEFT → whip hits enemies in front (left side of screen) AND behind (right side)
- Strafe RIGHT → whip hits enemies in front (right side) AND behind (left side)
- This means you can **run parallel** to a group of enemies and hit them all without turning

### DPS Analysis

| Level | DPS (single) | DPS (crowd, 3 enemies) | vs W1 (DPS: 8-43) |
|---|---|---|---|
| 1 | 16 | 48 | +100% (crowd) |
| 2 | 21 | 63 | +58% (single) |
| 3 | 29 | 87 | +60% (crowd) |
| 4 | 38 | 114 | -11% (single) |
| 5 | 52 (+bleed) | 156 | +21% (single) |
| 6 | 69 (+bleed) | 207 | +60% (single) |
| 7 | 100 (+bleed) | 300 | +133% (single) |

**Note:** Whip's dual-swing means **both sides** of the player are dangerous. Running through a swarm while whipping hits everything.

### Power Spikes

**Lv4 — Wide Arc:**
- Arc width increases from 90px to 100px
- Can hit enemies slightly to the sides (not just front/back)
- Visual: wider swing with blue trail

**Lv7 — Crimson Whip:**
- Arc extends to **160px width** (hits enemies on both sides easily)
- Adds **bleed effect**: 12 damage over 2 seconds (6 per tick)
- Bleed stacks up to 3x (36 damage over 2s max)
- Visual: Red afterimage effect on whip
- Whip range stays at 180px (front+back)

### Bleed Mechanics
```
Bleed effect:
- Applied on each whip hit
- Deals 6 damage per second for 2 seconds (12 total at Lv7)
- Stacks up to 3 times (36 damage over 2s max)
- Visual: Red pulse on affected enemies
- Does NOT refresh duration on re-application (separate timers)

Example:
- Hit enemy 3 times with Lv7 whip
- Enemy takes: 35 + 35 + 35 = 105 immediate damage
- Enemy then takes: 36 bleed damage over 2s
- Total: 141 damage per 3-hit combo
```

### Implementation Notes
- **Attack pattern:** Front sweep → Back sweep (dual hit)
- **Hitbox:** Two sectors (front 180° + back 180°)
- **Hit detection:** Enemies within arc AND range take damage on each swing
- **Bleed:** Separate DoT system (stacks, duration, tick rate)
- **Cooldown:** After both swings complete
- **Complexity:** ⭐⭐⭐ Medium (dual sector hitbox + bleed DoT)

### Strengths
- Hits enemies on BOTH sides (front + back)
- Movement freedom — strafe to hit parallel groups
- Bleed rewards hitting multiple enemies
- Safe distance (140-180px)
- Consistent damage without aiming

### Weaknesses
- Lower single-target DPS than dagger
- Slower attack speed
- Bleed requires multiple hits to shine
- No vertical coverage (only horizontal whip)

---

## Weapon 3: Grave Claymore

**Concept:** Massive sword with slow, devastating swings. **Short range but HUGE AoE** — meant to hit the boss AND all mobs surrounding it. The "positioning" melee weapon.

### Visual
- Dark iron blade with glowing runes
- Slow overhead swing animation
- Lv4: Ground crack + explosion (wide AoE)
- Lv7: Massive shockwave + lingering damage zone (huge coverage)

### Stats Per Level

| Level | Damage | Cooldown | Range | AoE Width | Explosion | Zone |
|---|---|---|---|---|---|---|
| 1 | 18 | 2.00s | 100px | 120px | — | — |
| 2 | 22 | 1.85s | 105px | 130px | — | — |
| 3 | 28 | 1.70s | 110px | 140px | — | — |
| 4 | 35 | 1.55s | 115px | 150px | 50% dmg, 100px radius | — |
| 5 | 42 | 1.40s | 120px | 160px | 50% dmg, 110px radius | 1.0s |
| 6 | 50 | 1.30s | 130px | 170px | 50% dmg, 120px radius | 1.5s |
| 7 | 65 | 1.15s | 140px | 200px | 60% dmg, 150px radius | 2.0s |

### Range & AoE Visualization

```
Claymore swing (Lv7):

Player position:     [P]
Swing range:         140px forward
AoE width:           200px (100px left + 100px right)
Explosion radius:    150px (at swing endpoint)

       ←────── 200px AoE width ──────→
       │                               │
       │         ┌─────────────┐       │
       │         │  EXPLOSION  │       │
       │         │  150px rad  │       │
       │         └─────────────┘       │
       │               ↑               │
       │          140px range          │
       │               ↑               │
       │             [P]               │

Total coverage area: ~22,000 px² (vs W1's single target)
```

### DPS Analysis

| Level | DPS (single) | DPS (5 enemies) | vs W1 (DPS: 8-43) |
|---|---|---|---|
| 1 | 9 | 45 | +13% (single) |
| 2 | 12 | 60 | +50% (single) |
| 3 | 16 | 80 | +78% (single) |
| 4 | 23 (+ explosion) | 115 | -47% (single) |
| 5 | 30 (+ AoE) | 150 | -30% (single) |
| 6 | 38 (+ AoE) | 190 | -12% (single) |
| 7 | 57 (+ AoE + zone) | 285 | +33% (single) |

**Note:** Claymore's power is in **hitting multiple enemies with one swing**. Single-target DPS is lower, but crowd DPS is massive.

### Positioning Strategy

**Boss Fight (Necromancer + skeleton adds):**
```
1. Wait for boss to summon skeletons
2. Position yourself so boss is at 100-140px distance
3. Skeletons will surround boss naturally
4. Swing → hit boss + 5-8 skeletons in AoE
5. Explosion hits boss again + any survivors
6. Zone lingers, damage-over-time to anything standing in it

Result: Boss + entire skeleton wave damaged simultaneously
```

**Swarm Clearing:**
```
1. Let enemies cluster around you
2. Swing when 8-10 enemies are within 140px
3. AoE width (200px) hits most of them
4. Explosion catches stragglers

Result: Clear 10+ enemies per swing
```

### Power Spikes

**Lv4 — Ground Slam:**
- Swing creates ground crack at impact point
- Crack explodes after 0.5s dealing **50% of swing damage** in **100px radius**
- Can hit enemies that weren't in initial swing
- Visual: Orange/red crack effect + explosion
- **Example:** 35 damage swing → 17.5 explosion = 52.5 total to boss

**Lv7 — Abyssal Cleave:**
- AoE width expands to **200px** (hits massive area)
- Explosion radius increases to **150px**
- Explosion damage increases to **60% of swing damage**
- Each swing leaves a **damaging zone** (2.0s duration, 25% of swing damage per tick)
- Zone is **200px wide, 150px long**
- Visual: Dark purple energy lingers on ground
- Multiple zones can overlap for stacking damage

### Zone Mechanics (Lv5+)
```
Zone behavior:
- Created at swing endpoint
- Deals 25% of swing damage per second
- Duration: 1.0s (Lv5), 1.5s (Lv6), 2.0s (Lv7)
- Visual: Purple ground effect
- Enemies standing in zone take damage each tick

Example (Lv7):
- Swing damage: 65
- Zone damage per tick: 16 (25% of 65)
- Zone duration: 2.0s
- Total zone damage: 32 (if enemy stands in full duration)

Combined with explosion:
- Swing: 65
- Explosion (60%): 39
- Zone (2s): 32
- Total potential: 136 damage per attack
```

### Implementation Notes
- **Attack pattern:** Linear overhead swing (forward line, 200px wide)
- **Hitbox:** Rectangle (140px range × 200px width)
- **Lv4 explosion:** Circle at swing endpoint (100-150px radius)
- **Lv5+ zones:** Persistent rectangle damage zones
- **Cooldown:** After full swing animation (includes 0.5s windup)
- **Complexity:** ⭐⭐⭐⭐ High (rectangle hitbox + explosion + persistent zones)

### Strengths
- **Huge AoE** hits boss + surrounding mobs simultaneously
- Highest burst damage (65 per swing at Lv7)
- Zones provide passive damage
- Excellent against stationary bosses
- Explosion catches enemies outside initial swing

### Weaknesses
- **Shortest range** of all melee weapons (100-140px)
- Slowest attack speed (0.5/s)
- Long windup (0.5s) makes it vulnerable
- Requires prediction (enemies move during windup)
- Zones are stationary (fast enemies avoid them)

---

## Balance Comparison vs W1 Projectile

### 3-Minute Map (Quick)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Dagger** | Highest DPS, boomerang utility | Short range, risky | ⭐ Best choice |
| W1 Projectile | Safe, consistent | Lower DPS | Good fallback |
| Sword | Hits groups | Too slow for short map | Weakest |
| Claymore | High AoE | Too slow, zones wasted | Weakest |

### 5-Minute Map (Standard)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Sword** | Front+back hits, bleed, safe | Moderate DPS | ⭐ Best choice |
| W1 Projectile | Safe, consistent | Lower crowd clear | Good |
| Dagger | High DPS | Risky, short range | Good (skill-based) |
| Claymore | Good AoE | Slow, zones underused | Decent |

### 10-Minute Map (Highlight)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Claymore** | Huge AoE, boss killer, zones stack | Slow start, short range | ⭐ Best choice |
| W1 Projectile | Safe, scales well | Lower peak DPS | Good |
| Sword | Consistent crowd clear | Lower boss damage | Good |
| Dagger | High DPS | Too risky late game | Decent (if skilled) |

---

## Movement Strategy Comparison

| Weapon | Optimal Movement | Why It Works |
|---|---|---|
| **Dagger** | Rush toward enemy, stab, dash away | Boomerang hits enemies behind you on return |
| **Sword** | Strafe LEFT/RIGHT, keep enemies parallel | Front+back whip hits both sides while moving |
| **Claymore** | Stand ground, aim at boss cluster | Short range but huge AoE covers entire area |

### Example: Fighting a Horde

**With Dagger:**
```
Enemies approaching from all sides
→ Rush toward nearest group
→ Triple stab kills 3-4
→ Boomerang hits enemies behind you
→ Dash away, repeat
```

**With Sword:**
```
Enemies surrounding you
→ Strafe LEFT → whip hits enemies on left (front) AND right (back)
→ Continue strafing → whip hits again
→ Bleed stacks on 5-6 enemies
→ Enemies die from bleed while you keep moving
```

**With Claymore:**
```
Boss + skeleton adds clustered
→ Position at 100px from boss
→ Swing → hits boss + 6 skeletons
→ Explosion hits survivors
→ Zone lingers, damages anything standing in it
→ Wait for cooldown, repeat
```

---

## Implementation Complexity

| Weapon | Complexity | Estimated Lines | Key Systems |
|---|---|---|---|
| **Dagger** | ⭐⭐⭐ Medium | ~200 | Cone hitbox, boomerang path, multi-hit |
| **Sword** | ⭐⭐⭐ Medium | ~250 | Dual sector hitbox, bleed DoT |
| **Claymore** | ⭐⭐⭐⭐ High | ~300 | Rectangle hitbox, explosion, persistent zones |

### Recommended Implementation Order
1. **Dagger** — Teaches melee mechanics + boomerang
2. **Sword** — Teaches dual-hit + bleed system
3. **Claymore** — Most complex, teaches persistent zones

---

## Final Balance Summary

### DPS Comparison (Lv7)

| Weapon | Single-Target DPS | Crowd DPS (5 enemies) | Effective Range |
|---|---|---|---|
| W1 Projectile | 43 | 43 (single target) | 300px |
| **Dagger** | 200 | 200 (single target) | 100px |
| **Sword** | 100 | 300 (6 enemies × 50 each) | 180px |
| **Claymore** | 57 | 285 (5 enemies × 57 each) | 140px |

### When Each Weapon Excels

| Scenario | Best Weapon | Why |
|---|---|---|
| Small fast swarm (rats/bats) | **Dagger** | High DPS, boomerang hits stragglers |
| Large slow horde (zombies/brutes) | **Sword** | Front+back whip hits all sides, bleed stacks |
| Boss + adds | **Claymore** | Huge AoE hits boss and all surrounding mobs |
| Solo boss (no adds) | **Dagger** | Highest single-target DPS |
| Mixed wave (fast + slow) | **Sword** | Consistent damage, movement freedom |

### Map Recommendations

| Map Length | Recommended Loadout | Why |
|---|---|---|
| 3min (Quick) | Dagger + W1 + W3 | Dagger for speed, W1 for safety, W3 for AoE |
| 5min (Standard) | Sword + W1 + W2 | Sword for crowd control, W1+W2 for single-target |
| 10min (Highlight) | Claymore + W1 + W2 | Claymore for boss, W1+W2 for clearing adds |

---

## Potential Issues & Feedback

### Dagger
**✅ Boomerang fixed the range issue** — 100px outbound + return gives it utility without breaking short-range identity.
**⚠️ Watch for:** Boomerang pathing bugs — daggers getting stuck or not returning.

### Sword
**✅ Front+back whip is great** — gives movement freedom and differentiates from dagger.
**⚠️ Watch for:** Bleed stacking might be too strong in large crowds (36 bleed × 10 enemies = 360 total bleed damage).

### Claymore
**✅ Short range (100-140px) + huge AoE (200px)** — perfect for boss fights where you need to hit boss + adds.
**⚠️ Watch for:** Explosion + zone overlap might be too complex. Consider simplifying zones to just "extra damage on swing" initially.

---

## Asset Requirements (Future)

| Weapon | SVG Needed | ViewBox | Notes |
|---|---|---|---|
| Dagger | `w6_dagger.svg` | 16×16 | Purple blade |
| Sword | `w7_sword.svg` | 16×16 | Energy whip arc |
| Claymore | `w8_claymore.svg` | 16×16 | Large dark blade |

### Animation Sprites (Future)
- Dagger: 3-frame stab + boomerang throw
- Sword: 2-frame front swing + 2-frame back swing
- Claymore: 4-frame overhead swing + ground crack

---

*Spec Version: 1.1*
*Status: Planning — No Implementation Yet*
*Changes: Sword front+back whip + damage buff, Claymore short range + huge AoE, Dagger boomerang*
*Next Step: File split, then implement weapons in order of complexity*
