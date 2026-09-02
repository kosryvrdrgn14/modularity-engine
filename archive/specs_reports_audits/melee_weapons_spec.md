# Melee Weapons Spec — V1.2

## Design Philosophy

Melee weapons compensate for **shorter range** with:
- Higher DPS than ranged weapons (risk vs reward)
- Multi-target potential (AoE or pierce)
- Better performance in crowded swarms
- Unique movement strategies

**Balance rule:** A melee weapon should clear **30-50% more enemies per second** than W1 projectile when used at optimal range, but has **40-60% less effective range**.

---

## Weapon Comparison Matrix (V1.2)

| Stat | W1 Projectile | Dagger | Sword (Whip) | Claymore |
|---|---|---|---|---|
| **Range** | 300px | 50-100px | 140-180px | 100-140px |
| **Base DPS** | 8 | 12 (6×2) | 14 | 18 |
| **Max DPS (Lv7)** | 43 | 50 (homing) | 45 (triple-hit) | 30 (+ explosion) |
| **Attack Speed** | 1/s | 2/s | 0.6/s | 0.5/s |
| **AoE Width** | 0 (single) | 30px cone | 160px (all sides) | 160px (line) |
| **Best Against** | Mixed | Swarms | Groups (360°) | Boss + adds |
| **Weakness** | Tanks | Range | Single-target | Speed |
| **Ideal Map** | 5min | 3min | 5min | 10min |

---

## Weapon 1: Shadow Dagger

**Concept:** Rapid short-range stabs with homing daggers. The "machine gun" of melee weapons.

### Visual
- Purple/dark blade with afterimage trails
- Stab animation: quick forward thrust
- Lv4: Triple stab with purple slash effects
- Lv7: Multiple homing daggers that seek enemies

### Stats Per Level

| Level | Damage | Cooldown | Hits | Total Damage | Range | Notes |
|---|---|---|---|---|---|---|
| 1 | 4 | 0.50s | 1 | 4 | 50px | Single stab |
| 2 | 5 | 0.45s | 1 | 5 | 55px | Single stab |
| 3 | 6 | 0.40s | 1 | 6 | 60px | Single stab |
| 4 | 7 | 0.35s | 3 | 21 | 60px | Triple stab |
| 5 | 8 | 0.32s | 3 | 24 | 65px | Triple stab |
| 6 | 9 | 0.28s | 3 | 27 | 70px | Triple stab |
| 7 | 10 | 0.25s | 5 | 50 | 100px | Homing daggers |

### DPS Analysis

| Level | DPS | vs W1 (DPS: 8-43) | Notes |
|---|---|---|---|
| 1 | 8 | Equal | Starts balanced |
| 2 | 11 | +38% | Pulls ahead |
| 3 | 15 | +40% | Strong early |
| 4 | 60 | +140% | **Power spike** (triple stab) |
| 5 | 75 | +110% | Scales well |
| 6 | 96 | +90% | Dominant |
| 7 | 200 | +365% | Insane burst (homing) |

### Power Spikes

**Lv4 — Triple Stab:**
- Each attack hits 3 times in rapid succession (0.1s between hits)
- Each hit deals full damage
- Cone width: 40px
- Clears rat/bat swarms effortlessly

**Lv7 — Homing Daggers:**
- 5 daggers fan out in a cone
- Each dagger **homes toward nearest enemy**
- Daggers deal full damage on hit
- Daggers disappear after hitting or traveling 100px
- Cone width: 60px
- Visual: Purple daggers with trailing afterimages

### Homing Mechanics
```
Homing behavior:
1. Player throws 5 daggers forward in cone
2. Each dagger tracks nearest enemy
3. Dagger homes in (turn rate: 200°/s)
4. Dagger hits enemy → damage + disappear
5. If no enemy within 100px → dagger dissipates

Cooldown: 0.25s after all daggers resolve
```

### Implementation Notes
- **Attack pattern:** Forward cone throw with homing
- **Hitbox:** Cone shape + individual dagger hitboxes
- **Homing:** Each dagger seeks nearest enemy, adjusts trajectory
- **Cooldown:** After all daggers hit or dissipate
- **Complexity:** ⭐⭐⭐ Medium (cone + homing AI per dagger)

### Strengths
- Highest burst damage when enemies are close
- Homing ensures hits even if enemies move
- Melts rats/bats (1-2 shot kills)
- Fast cooldown means consistent damage

### Weaknesses
- Shortest range of all weapons (50-100px)
- Requires enemies to be close (risky)
- Homing has turn rate limit (fast enemies can dodge)
- Useless against enemies at max distance

---

## Weapon 2: Soul Whip (Sword)

**Concept:** Vampire Survivors-style whip that hits **front, back, then both sides**. The "movement freedom" melee weapon.

### Visual
- Ethereal blue/white energy whip
- Swing animation: front sweep → back sweep → simultaneous sweep
- Lv4: Wider arcs with blue trail
- Lv7: Extended whip with crimson afterimage

### Attack Pattern (Triple-Hit Combo)

```
Combo sequence:
1. Hit FRONT (180° arc, range 140-180px)
2. Hit BACK (180° arc, same range)
3. Hit BOTH SIDES (360° sweep, same range)

Total attack time: 0.8s (3 hits)
Cooldown: starts after combo completes
```

**Movement Strategy:**
- Strafe LEFT → hits enemies in front (left) + behind (right) + all around
- The final "both sides" hit catches anything the first two missed
- Running through a swarm while comboing hits everything

### Stats Per Level

| Level | Damage | Cooldown | Combo | Range | Arc Width | Total/Combo |
|---|---|---|---|---|---|---|
| 1 | 6 | 1.40s | F→B→Both | 140px | 80px | 18 |
| 2 | 7 | 1.30s | F→B→Both | 150px | 85px | 21 |
| 3 | 8 | 1.20s | F→B→Both | 160px | 90px | 24 |
| 4 | 10 | 1.10s | F→B→Both | 170px | 100px | 30 |
| 5 | 12 | 1.00s | F→B→Both | 175px | 110px | 36 |
| 6 | 15 | 0.90s | F→B→Both | 180px | 120px | 45 |
| 7 | 18 | 0.80s | F→B→Both | 180px | 160px | 54 |

### DPS Analysis

| Level | DPS (single) | DPS (3 enemies) | vs W1 (DPS: 8-43) |
|---|---|---|---|
| 1 | 13 | 39 | +63% (single) |
| 2 | 16 | 48 | +100% (single) |
| 3 | 20 | 60 | +150% (single) |
| 4 | 27 | 81 | -33% (single) |
| 5 | 36 | 108 | -16% (single) |
| 6 | 50 | 150 | +16% (single) |
| 7 | 68 | 204 | +58% (single) |

**Note:** Whip's triple-hit means **all directions** are dangerous. Running through a swarm while comboing hits everything.

### Power Spikes

**Lv4 — Wide Arc:**
- Arc width increases from 90px to 100px
- Can hit enemies slightly to the sides (not just front/back)
- Visual: wider swing with blue trail
- Both-sides hit is now more reliable

**Lv7 — Crimson Whip:**
- Arc extends to **160px width** (hits massive area on all sides)
- All 3 hits in combo are wider
- Visual: Red afterimage effect on whip
- Both-sides hit becomes devastating (360° coverage)

### Implementation Notes
- **Attack pattern:** Front sweep → Back sweep → Both-sides sweep (3 hits)
- **Hitbox:** Three sectors (front 180° + back 180° + full 360°)
- **Hit detection:** Enemies within arc AND range take damage on each hit
- **Cooldown:** After all 3 hits complete
- **Complexity:** ⭐⭐⭐ Medium (three sector hitboxes in sequence)

### Strengths
- Hits enemies on **ALL sides** (front, back, both)
- Movement freedom — strafe while comboing
- Final hit catches stragglers
- Safe distance (140-180px)
- Consistent damage without aiming

### Weaknesses
- Lower single-target DPS than dagger
- Slow combo speed (0.8s per attack)
- Must commit to full combo (can't cancel)
- No vertical coverage (horizontal whip only)

---

## Weapon 3: Grave Claymore

**Concept:** Massive sword with slow, devastating swings. **Short range but HUGE AoE** with explosion. The "positioning" melee weapon.

### Visual
- Dark iron blade with glowing runes
- Slow overhead swing animation
- Lv4: Ground crack + explosion effect
- Lv7: Larger explosion with extended range

### Stats Per Level

| Level | Damage | Cooldown | Range | AoE Width | Explosion |
|---|---|---|---|---|---|
| 1 | 18 | 2.00s | 100px | 120px | — |
| 2 | 22 | 1.85s | 105px | 130px | — |
| 3 | 28 | 1.70s | 110px | 140px | — |
| 4 | 35 | 1.55s | 115px | 150px | 50% dmg, 100px radius |
| 5 | 42 | 1.40s | 120px | 160px | 50% dmg, 110px radius |
| 6 | 50 | 1.30s | 130px | 170px | 50% dmg, 120px radius |
| 7 | 65 | 1.15s | 140px | 200px | 60% dmg, 150px radius |

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

Total coverage area: ~22,000 px²
```

### DPS Analysis

| Level | DPS (single) | DPS (5 enemies) | vs W1 (DPS: 8-43) |
|---|---|---|---|
| 1 | 9 | 45 | +13% (single) |
| 2 | 12 | 60 | +50% (single) |
| 3 | 16 | 80 | +78% (single) |
| 4 | 23 (+ explosion) | 115 | -47% (single) |
| 5 | 30 (+ explosion) | 150 | -30% (single) |
| 6 | 38 (+ explosion) | 190 | -12% (single) |
| 7 | 57 (+ explosion) | 285 | +33% (single) |

### Positioning Strategy

**Boss Fight (Necromancer + skeleton adds):**
```
1. Wait for boss to summon skeletons
2. Position yourself so boss is at 100-140px distance
3. Skeletons will surround boss naturally
4. Swing → hit boss + 5-8 skeletons in AoE
5. Explosion hits boss again + any survivors

Result: Boss + entire skeleton wave damaged simultaneously
```

### Power Spikes

**Lv4 — Ground Slam:**
- Swing creates ground crack at impact point
- Crack explodes after 0.5s dealing **50% of swing damage** in **100px radius**
- Can hit enemies that weren't in initial swing
- Visual: Orange/red crack effect + explosion
- **Example:** 35 damage swing → 17.5 explosion = 52.5 total to boss

**Lv7 — Abyssal Cleave:**
- AoE width expands to **200px** (massive coverage)
- Explosion radius increases to **150px**
- Explosion damage increases to **60% of swing damage**
- Visual: Dark purple explosion with screen shake
- **Example:** 65 damage swing → 39 explosion = 104 total to boss

### Explosion Mechanics
```
Explosion behavior:
- Triggered 0.5s after swing completes
- Deals 50% (Lv4-6) or 60% (Lv7) of swing damage
- Radius: 100-150px (scales with level)
- Can hit enemies NOT hit by initial swing
- Visual: Ground crack → explosion → smoke

Example (Lv7):
- Swing damage: 65 (hits boss + 5 skeletons)
- Explosion (0.5s later): 39 damage to all in 150px radius
- Total: 65 + 39 = 104 to boss, 65 + 39 to each skeleton in radius
```

### Implementation Notes
- **Attack pattern:** Linear overhead swing (forward line, 200px wide)
- **Hitbox:** Rectangle (140px range × 200px width)
- **Lv4+ explosion:** Circle at swing endpoint (100-150px radius) after 0.5s delay
- **Cooldown:** After swing animation + explosion resolves
- **Complexity:** ⭐⭐ Low-Medium (rectangle hitbox + delayed explosion)

### Strengths
- **Huge AoE** hits boss + surrounding mobs simultaneously
- Highest burst damage (65 per swing at Lv7)
- Explosion catches enemies outside initial swing
- Excellent against stationary bosses
- Simple to implement (no persistent zones)

### Weaknesses
- **Shortest range** of all melee weapons (100-140px)
- Slowest attack speed (0.5/s)
- Long windup (0.5s) makes it vulnerable
- Requires prediction (enemies move during windup)
- Explosion is delayed (enemies can dodge)

---

## Balance Comparison vs W1 Projectile

### 3-Minute Map (Quick)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Dagger** | Highest DPS, homing ensures hits | Short range, risky | ⭐ Best choice |
| W1 Projectile | Safe, consistent | Lower DPS | Good fallback |
| Sword | Hits groups | Too slow for short map | Weakest |
| Claymore | High AoE | Too slow, explosion wasted | Weakest |

### 5-Minute Map (Standard)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Sword** | Triple-hit covers all sides, safe | Moderate DPS | ⭐ Best choice |
| W1 Projectile | Safe, consistent | Lower crowd clear | Good |
| Dagger | High DPS | Risky, short range | Good (skill-based) |
| Claymore | Good AoE | Slow, explosion underused | Decent |

### 10-Minute Map (Highlight)
| Weapon | Pros | Cons | Verdict |
|---|---|---|---|
| **Claymore** | Huge AoE, boss killer, explosion | Slow start, short range | ⭐ Best choice |
| W1 Projectile | Safe, scales well | Lower peak DPS | Good |
| Sword | Consistent crowd clear | Lower boss damage | Good |
| Dagger | High DPS | Too risky late game | Decent (if skilled) |

---

## Movement Strategy Comparison

| Weapon | Optimal Movement | Why It Works |
|---|---|---|
| **Dagger** | Rush toward enemy, stab, dash away | Homing ensures hits even if you miss |
| **Sword** | Strafe LEFT/RIGHT, keep enemies parallel | Triple-hit covers all sides while moving |
| **Claymore** | Stand ground, aim at boss cluster | Short range but 200px AoE + explosion covers everything |

### Example: Fighting a Horde

**With Dagger:**
```
Enemies approaching from all sides
→ Rush toward nearest group
→ Triple stab kills 3-4
→ Homing daggers seek remaining enemies
→ Dash away, repeat
```

**With Sword:**
```
Enemies surrounding you
→ Strafe LEFT
→ Front hit (left side)
→ Back hit (right side)
→ Both-sides hit (catches stragglers)
→ Continue strafing, combo again
```

**With Claymore:**
```
Boss + skeleton adds clustered
→ Position at 100px from boss
→ Swing → hits boss + 6 skeletons
→ Explosion hits survivors 0.5s later
→ Wait for cooldown, repeat
```

---

## Implementation Complexity

| Weapon | Complexity | Estimated Lines | Key Systems |
|---|---|---|---|
| **Dagger** | ⭐⭐⭐ Medium | ~200 | Cone hitbox, homing AI, multi-hit |
| **Sword** | ⭐⭐⭐ Medium | ~250 | Three sector hitboxes in sequence |
| **Claymore** | ⭐⭐ Low-Med | ~180 | Rectangle hitbox, delayed explosion |

### Recommended Implementation Order
1. **Claymore** — Simplest (no zones), teaches explosion mechanic
2. **Dagger** — Medium complexity, teaches homing
3. **Sword** — Most hits in combo, teaches multi-phase attacks

---

## Final Balance Summary

### DPS Comparison (Lv7)

| Weapon | Single-Target | Crowd DPS (5 enemies) | Effective Range |
|---|---|---|---|
| W1 Projectile | 43 | 43 (single target) | 300px |
| **Dagger** | 200 | 200 (single target) | 100px |
| **Sword** | 68 | 204 (3 enemies × 68 each) | 180px |
| **Claymore** | 57 | 285 (5 enemies × 57 each) | 140px |

### When Each Weapon Excels

| Scenario | Best Weapon | Why |
|---|---|---|
| Small fast swarm (rats/bats) | **Dagger** | High DPS, homing ensures hits |
| Large slow horde (zombies/brutes) | **Sword** | Triple-hit covers all sides |
| Boss + adds (necromancer + skeletons) | **Claymore** | 200px AoE + explosion hits everything |
| Solo boss (no adds) | **Dagger** | Highest single-target DPS (200) |
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
**✅ Homing simplifies implementation** — no boomerang pathing, just seek nearest enemy.
**⚠️ Watch for:** Homing turn rate too high (dags feel unfair) or too low (miss too often).

### Sword
**✅ Triple-hit combo is clean** — front, back, both. Simple to understand, fun to execute.
**⚠️ Watch for:** 0.8s combo time might feel slow. Consider adding a "cancel" option to cut combo short.

### Claymore
**✅ Explosion only (no zones)** — much simpler to implement, still powerful.
**⚠️ Watch for:** 0.5s explosion delay might feel disconnected. Consider shortening to 0.3s.

---

## Future Additions (Noted for Later)

- **Claymore Zones:** Add persistent damage zones at Lv7 in a future balance patch
- **Sword Bleed:** Could add bleed effect as a Lv7 power spike if damage feels low
- **Dagger Bleed/Slow:** Could add utility effects if dagger feels one-dimensional

---

## Asset Requirements (Future)

| Weapon | SVG Needed | ViewBox | Notes |
|---|---|---|---|
| Dagger | `w6_dagger.svg` | 16×16 | Purple blade |
| Sword | `w7_sword.svg` | 16×16 | Energy whip arc |
| Claymore | `w8_claymore.svg` | 16×16 | Large dark blade |

### Animation Sprites (Future)
- Dagger: 3-frame stab + homing throw
- Sword: Front swing → Back swing → Both-sides swing
- Claymore: 4-frame overhead swing + ground crack + explosion

---

*Spec Version: 1.2*
*Status: Planning — No Implementation Yet*
*Changes: Claymore zones removed (noted for later), Sword bleed replaced with triple-hit combo, Dagger simplified to homing*
*Next Step: File split, then implement weapons in order of complexity*
