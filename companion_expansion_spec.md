# Companion Expansion Spec — V1.0

**Date:** August 29, 2026
**Purpose:** 9 new companions for swap testing. Balanced against Dog/Healer/Archer/Mage.
**Status:** Design + Simulation Complete

---

## Existing Reference (Power Budget)

| Companion | Role | DPS (Lv7) | Utility | Cooldown (Lv1→7) |
|---|---|---|---|---|
| Dog | Melee AoE | 8.7 | Loot 40px | 10.0→5.5s |
| Healer | Support | 0 | +182 HP (5min) | Threshold heals |
| Archer | Ranged DPS | 43.6 | 50% slow, poison | 2.2→1.0s arrow |
| Mage | AoE Support | 33.8 | +25% vulnerability | 7.5→4.5s |

**Power budget range:** 0–44 DPS. Utility companions can trade DPS for effects.

---

## New Companions

### 5. Knight (Sentinel) — Armor Shred Tank

**Role:** Frontline melee. Applies armor shred that increases ALL damage taken by target.
**Visual:** Silver helmet + shield. Follows close (20px). Charge + shield bash.

| Level | Bash DMG | Armor Shred | Shred Duration | Cooldown |
|---|---|---|---|---|
| 1 | 20 | 10% | 3s | 8.0s |
| 2 | 22 | 12% | 3s | 7.5s |
| 3 | 25 | 14% | 3s | 7.0s |
| 4 | 28 | 16% | 3.5s | 6.0s |
| 5 | 32 | 18% | 3.5s | 5.5s |
| 6 | 36 | 20% | 4s | 5.0s |
| 7 | 42 | 25% (cap) | 4s | 4.0s |

**Mechanic:** Knight charges nearest enemy, dealing bash damage + applying armor shred (increases ALL damage taken, stacks with Mage vulnerability). Unique: shred reduces enemy defense, making even weak attacks hit harder.
**DPS (Lv7):** 10.5 + shred amplification ≈ 13–18 effective.
**Complexity:** ⭐⭐ Low-Medium (charge + debuff)

---

### 6. Panther (Striker) — Chain Lightning Melee

**Role:** Mobile melee DPS. Lightning bolt chains between nearby enemies on hit.
**Visual:** Black panther with electric blue sparks. Fast movement.

| Level | Strike DMG | Chain Hits | Chain Range | Cooldown |
|---|---|---|---|---|
| 1 | 15 | 2 | 60px | 6.0s |
| 2 | 17 | 2 | 65px | 5.5s |
| 3 | 20 | 3 | 70px | 5.0s |
| 4 | 24 | 3 | 75px | 4.5s |
| 5 | 28 | 4 | 80px | 4.0s |
| 6 | 32 | 4 | 85px | 3.5s |
| 7 | 38 | 5 | 90px | 3.0s |

**Mechanic:** Panther lunges at nearest enemy, lightning chains to 1–4 nearby enemies (full damage each). Fast cooldown = constant pressure.
**DPS (Lv7):** 12.7 + chains = ~25–38 AoE.
**Complexity:** ⭐⭐⭐ Medium (chain targeting like Mage but melee)

---

### 7. Spider (Venomist) — Stacking Poison

**Role:** DoT specialist. Applies stacking poison that grows stronger over time.
**Visual:** Dark purple spider. Stays at medium range (60px).

| Level | Spit DMG | Poison/tick | Max Stacks | Cooldown |
|---|---|---|---|---|
| 1 | 6 | 2/tick | 3 | 3.0s |
| 2 | 7 | 2.5/tick | 3 | 2.8s |
| 3 | 8 | 3/tick | 4 | 2.5s |
| 4 | 10 | 3.5/tick | 4 | 2.2s |
| 5 | 12 | 4/tick | 5 | 2.0s |
| 6 | 15 | 5/tick | 5 | 1.8s |
| 7 | 18 | 6/tick | 6 | 1.5s |

**Mechanic:** Fires venom spit every 1.5–3s. Each hit applies poison (2 damage/tick for 3s = 6 damage per stack). Stacks up to 3–6 times. At Lv7 with 6 stacks: 36 damage/tick = 72 DPS from poison alone.
**DPS (Lv7):** 12 direct + ~36 DoT = ~48 total (but ramp-up time).
**Complexity:** ⭐⭐ Low-Medium (DoT stacking, Archer-like but different feel)

---

### 8. Hawk (Skydiver) — Dive Bomb AoE

**Role:** Aerial AoE. Dives from above in a line, damaging all enemies in path.
**Visual:** Brown hawk. Circles high above player (not on ground).

| Level | Dive DMG | Dive Width | Dive Range | Cooldown |
|---|---|---|---|---|
| 1 | 22 | 30px | 120px | 8.0s |
| 2 | 25 | 32px | 125px | 7.5s |
| 3 | 28 | 35px | 130px | 7.0s |
| 4 | 32 | 38px | 140px | 6.0s |
| 5 | 36 | 40px | 150px | 5.5s |
| 6 | 40 | 42px | 160px | 5.0s |
| 7 | 48 | 45px | 180px | 4.0s |

**Mechanic:** Hawk circles above player. On cooldown, dives in a straight line through the densest enemy cluster. All enemies in the dive path take full damage. Great for clearing lines of enemies.
**DPS (Lv7):** 12.0 (but hits 5–10 enemies = 60–120 total per dive).
**Complexity:** ⭐⭐⭐ Medium (line targeting + path detection)

---

### 9. Turtle (Bulwark) — Shield Companion

**Role:** Pure defense. Grants player a periodic damage shield + knockback on hit.
**Visual:** Green turtle with shell. Follows very close (16px).

| Level | Shield HP | Knockback DMG | Knockback Range | Cooldown |
|---|---|---|---|---|
| 1 | 15 | 5 | 40px | 12.0s |
| 2 | 18 | 6 | 42px | 11.0s |
| 3 | 22 | 7 | 44px | 10.0s |
| 4 | 26 | 8 | 46px | 8.0s |
| 5 | 30 | 10 | 48px | 7.0s |
| 6 | 35 | 12 | 50px | 6.0s |
| 7 | 42 | 15 | 55px | 5.0s |

**Mechanic:** Every 5–12s, grants player a shield that absorbs next 15–42 damage. When hit while shielded, nearby enemies are knocked back (5–15 damage + 40–55px push). Shield breaks on absorb or expires after 5s.
**DPS (Lv7):** 3.0 + knockback utility. Effective HP: +42 per shield × ~6 shields in 5min = +252 HP.
**Complexity:** ⭐⭐ Low-Medium (shield absorb + knockback)

---

### 10. Owl (Oracle) — Damage Amplifier

**Role:** Pure amplifier. Applies debuff that increases damage taken by ALL sources.
**Visual:** White owl. Hovers at medium range (50px).

| Level | Hoot DMG | Damage Amp | Amp Duration | Cooldown |
|---|---|---|---|---|
| 1 | 5 | 12% | 4s | 6.0s |
| 2 | 6 | 14% | 4s | 5.5s |
| 3 | 7 | 16% | 4.5s | 5.0s |
| 4 | 8 | 18% | 4.5s | 4.5s |
| 5 | 10 | 20% | 5s | 4.0s |
| 6 | 12 | 22% | 5s | 3.5s |
| 7 | 15 | 25% (cap) | 5s | 3.0s |

**Mechanic:** Owl hoots, applying "Exposed" debuff to all enemies within 100px. Exposed increases ALL damage taken by 12–25% for 4–5s. Low personal DPS but massive team amplification. Stacks multiplicatively with Mage vulnerability.
**DPS (Lv7):** 5.0 direct + ~25% amp on everything = massive effective value.
**Complexity:** ⭐⭐ Low-Medium (AoE debuff application)

---

### 11. Rat (Plague) — Swarm Caster

**Role:** Summon swarm. Spawns 3–6 mini rats that auto-attack nearest enemies.
**Visual:** Brown rat. Stays close (20px). Mini rats are tiny (5px).

| Level | Swarm Count | Rat DMG | Rat HP | Cooldown |
|---|---|---|---|---|
| 1 | 3 | 4 | 3 | 10.0s |
| 2 | 3 | 5 | 3 | 9.5s |
| 3 | 4 | 5 | 4 | 9.0s |
| 4 | 4 | 6 | 4 | 8.0s |
| 5 | 5 | 7 | 5 | 7.5s |
| 6 | 5 | 8 | 5 | 7.0s |
| 7 | 6 | 10 | 6 | 5.5s |

**Mechanic:** Rat spawns mini-rats that rush nearest enemies, dealing contact damage. Mini-rats die in 1 hit but respawn on next cooldown. Swarm provides constant pressure + body-blocking. Mini-rats despawn when parent Rat's cooldown triggers new swarm.
**DPS (Lv7):** 6 rats × 10 dmg ÷ 5.5s ≈ 10.9 (but hits 6 targets).
**Complexity:** ⭐⭐⭐ Medium (entity spawning + swarm AI)

---

### 12. Frog (Leaper) — Knockback + Slow

**Role:** Crowd control. Leaps to enemies, applies slow + knockback on impact.
**Visual:** Green frog. Bouncy movement.

| Level | Leap DMG | Slow | Knockback | Cooldown |
|---|---|---|---|---|
| 1 | 12 | 30% / 2s | 50px | 5.0s |
| 2 | 14 | 33% / 2s | 52px | 4.5s |
| 3 | 16 | 36% / 2s | 55px | 4.0s |
| 4 | 20 | 40% / 2.5s | 58px | 3.5s |
| 5 | 24 | 43% / 2.5s | 60px | 3.0s |
| 6 | 28 | 46% / 3s | 62px | 2.5s |
| 7 | 35 | 50% / 3s | 65px | 2.0s |

**Mechanic:** Frog leaps to the nearest enemy, dealing damage + 30–50% slow for 2–3s + 50–65px knockback. Great for keeping enemies away from player. At Lv7: leaps every 2s with 50% slow.
**DPS (Lv7):** 17.5 + CC value.
**Complexity:** ⭐⭐ Low-Medium (leap + slow + knockback)

---

### 13. Bat (Leech) — Life Steal + Speed

**Role:** Sustain + mobility. Heals player on hit + grants brief speed boost.
**Visual:** Red bat. Circles player (40px orbit).

| Level | Bite DMG | Heal on Hit | Speed Boost | Cooldown |
|---|---|---|---|---|
| 1 | 8 | 3 HP | +10% / 2s | 2.0s |
| 2 | 9 | 4 HP | +12% / 2s | 1.8s |
| 3 | 10 | 5 HP | +14% / 2s | 1.6s |
| 4 | 12 | 6 HP | +16% / 2.5s | 1.4s |
| 5 | 14 | 7 HP | +18% / 2.5s | 1.2s |
| 6 | 16 | 8 HP | +20% / 3s | 1.0s |
| 7 | 20 | 10 HP | +25% / 3s | 0.8s |

**Mechanic:** Bat orbits player, biting nearest enemy every 0.8–2s. Each bite heals player 3–10 HP and grants 10–25% speed boost for 2–3s. Fast attack speed = constant sustain + mobility.
**DPS (Lv7):** 25.0 + heal 12.5/s + speed buff.
**Complexity:** ⭐⭐ Low-Medium (orbit + heal + buff)

---

## Balance Simulation

### DPS Comparison (Lv7, Single Target, 5min Stage)

| # | Companion | Direct DPS | AoE/Total DPS | Utility | Effective Value |
|---|---|---|---|---|---|
| 1 | Dog | 8.7 | 8.7 (cone) | Loot 40px | Medium |
| 2 | Healer | 0 | 0 | +182 HP | High (survival) |
| 3 | Archer | 28.0 | 43.6 (burst) | 50% slow + poison | High |
| 4 | Mage | 33.8 | 33.8 (chain) | +25% vuln | High |
| 5 | Knight | 10.5 | 13–18 (shred) | +25% armor shred | Medium-High |
| 6 | Panther | 12.7 | 25–38 (chain) | AoE pressure | High |
| 7 | Spider | 12.0 | 48 (DoT stacked) | Ramp-up poison | Very High (late) |
| 8 | Hawk | 12.0 | 60–120 (dive) | Line clear | High (burst) |
| 9 | Turtle | 3.0 | 3.0 | +252 HP shields | High (survival) |
| 10 | Owl | 5.0 | 5.0 | +25% amp all | Very High (team) |
| 11 | Rat | 10.9 | 10.9 (swarm) | Body block | Medium |
| 12 | Frog | 17.5 | 17.5 | 50% slow + knockback | Medium-High |
| 13 | Bat | 25.0 | 25.0 | +10 HP/s heal + speed | High |

### Tier Ranking

| Tier | Companions | Why |
|---|---|---|
| **S** (Best) | Owl, Mage, Archer | Highest effective value through amp/chain/burst |
| **A** (Strong) | Spider, Hawk, Panther, Bat | High DPS or strong sustain |
| **B** (Good) | Knight, Frog, Dog | Solid all-rounders with CC/utility |
| **C** (Situational) | Healer, Turtle, Rat | Best in specific scenarios (new players, boss fights, swarm) |

### Cooldown Budget Check

| Companion | Lv1 CD | Lv7 CD | Attacks/min (Lv7) |
|---|---|---|---|
| Dog | 10.0s | 5.5s | 10.9 |
| Healer | threshold | threshold | 3 heals + regen |
| Archer | 2.2s | 1.0s | 60 + burst |
| Mage | 7.5s | 4.5s | 13.3 |
| Knight | 8.0s | 4.0s | 15.0 |
| Panther | 6.0s | 3.0s | 20.0 |
| Spider | 3.0s | 1.5s | 40.0 |
| Hawk | 8.0s | 4.0s | 15.0 |
| Turtle | 12.0s | 5.0s | 12.0 |
| Owl | 6.0s | 3.0s | 20.0 |
| Rat | 10.0s | 5.5s | 10.9 |
| Frog | 5.0s | 2.0s | 30.0 |
| Bat | 2.0s | 0.8s | 75.0 |

### Synergy Matrix

| Combo | Effect | Rating |
|---|---|---|
| Owl + Mage | 25% amp × 25% vuln = ~56% damage increase | ⭐⭐⭐⭐⭐ |
| Spider + Archer | Poison + slow = enemies melt while crawling | ⭐⭐⭐⭐ |
| Knight + Panther | Shred + chain = melee AoE devastation | ⭐⭐⭐⭐ |
| Bat + Dog | Heal + loot = sustain + economy | ⭐⭐⭐ |
| Hawk + Frog | Dive + knockback = crowd control | ⭐⭐⭐ |
| Turtle + Healer | Shield + heal = unkillable beginner | ⭐⭐⭐ |
| Rat + Frog | Swarm + knockback = wall of bodies | ⭐⭐ |

---

## Implementation Complexity Summary

| Companion | Complexity | Key Systems Needed |
|---|---|---|
| Knight | ⭐⭐ | Charge AI + armor shred debuff |
| Panther | ⭐⭐⭐ | Chain targeting (reuse Mage) + melee lunge |
| Spider | ⭐⭐ | DoT stacking system + ranged spit |
| Hawk | ⭐⭐⭐ | Line targeting + dive path + AoE |
| Turtle | ⭐⭐ | Shield absorb + knockback |
| Owl | ⭐⭐ | AoE debuff application |
| Rat | ⭐⭐⭐ | Entity spawning + swarm AI + despawn |
| Frog | ⭐⭐ | Leap + slow + knockback |
| Bat | ⭐⭐ | Orbit + heal + speed buff |

**Total estimated:** ~1,200 lines of new companion logic (9 companions × ~130 lines avg).

---

*Companion Expansion Spec v1.0 — August 29, 2026*
