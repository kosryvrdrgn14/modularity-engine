# Modularity Engine — Stage 1 Progression

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-19
> **Status:** Planning
> **Reference:** `vs_plan.md` for master design specs

---

## Table of Contents

1. [Progression Overview](#progression-overview)
2. [Experience Curve](#experience-curve)
3. [Wave Timeline](#wave-timeline)
4. [Enemy Spawn Details](#enemy-spawn-details)
5. [Drop Economy](#drop-economy)
6. [Weapon Progression](#weapon-progression)
7. [Level-Up Pacing](#level-up-pacing)
8. [Power-Up Drop Schedule](#power-up-drop-schedule)
9. [Sound Design Arc](#sound-design-arc)
10. [Boss Encounter](#boss-encounter)
11. [Stage End & Victory](#stage-end--victory)
12. [Balance Targets](#balance-targets)
13. [Fun Factor Checklist](#fun-factor-checklist)

---

## Progression Overview

Stage 1 is a 5-minute survival encounter. The player starts with one weapon and faces increasingly dense waves of enemies. The experience arc is designed to deliver:

- **Minutes 0:00–1:00** — *Tutorial Flow.* Only zombies. First level-ups land fast (5–10 seconds), teaching the upgrade system. The player learns movement and auto-attack.
- **Minutes 1:00–2:00** — *Early Chaos.* Bats arrive, doubling pressure. A second weapon unlocks. The first power spike hits (Weapon 1 at Level 4).
- **Minutes 2:00–3:00** — *Escalation.* Skeletons and ghosts appear. The third weapon unlocks. Screen density climbs. Power-ups start dropping.
- **Minutes 3:00–4:00** — *Peak Madness.* Casters join. All five enemy types active. Spawn rate peaks. The player should feel powerful but threatened. Weapon 2 hits its power spike.
- **Minutes 4:00–5:00** — *Boss Climax.* The boss spawns at 4:00. One-minute fight. Victory if the boss dies before the timer expires.

**Target Level at Boss Spawn:** 10–12
**Target Weapon Levels at Boss Spawn:** W1 Lv.5–6, W2 Lv.3–4, W3 Lv.2–3
**Target Kill Count:** 400–500 enemies by 5:00

---

## Experience Curve

The XP curve is compressed for a 5-minute game. Early levels arrive rapidly (every 5–10 seconds) to hook the player, then slow down to create meaningful upgrade decisions.

### XP Table

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

### XP Curve Formula

For levels 1–14, use the table above. For level 15 and beyond:

```
xp_to_next(N) = floor(375 × 1.3^(N - 14))
```

This gives a 30% increase per level past 14, which is steep enough to discourage infinite scaling but smooth enough to avoid jarring jumps.

### Expected Level Milestones

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

## Wave Timeline

The wave timeline controls enemy composition and spawn rate over the 5-minute duration.

### Master Timeline

| Time | Enemy Types | Spawn Rate (per sec) | Composition | Max Enemies | Notes |
|---|---|---|---|---|---|
| 0:00 – 0:30 | Zombie | 0.8 | 100% Zombie | 25 | Tutorial. Slow pace. |
| 0:30 – 1:00 | Zombie | 1.2 | 100% Zombie | 40 | Picking up. More zombies. |
| 1:00 – 1:30 | Zombie, Bat | 1.5 | 60% Zombie, 40% Bat | 60 | Bats arrive. Pressure doubles. |
| 1:30 – 2:00 | Zombie, Bat | 1.8 | 50% Zombie, 50% Bat | 80 | Full bat swarm. |
| 2:00 – 2:30 | Zombie, Bat, Skeleton | 2.0 | 40% Zombie, 35% Bat, 25% Skeleton | 100 | Skeletons tank through. |
| 2:30 – 3:00 | Zombie, Bat, Skeleton, Ghost | 2.2 | 30% Zombie, 30% Bat, 25% Skeleton, 15% Ghost | 120 | Ghosts phase in. |
| 3:00 – 3:30 | All 5 types | 2.5 | 25% Z, 25% B, 20% S, 15% G, 15% C | 150 | Casters join. Full roster. |
| 3:30 – 4:00 | All 5 types | 3.0 | 20% Z, 25% B, 20% S, 15% G, 20% C | 180 | Peak density before boss. |
| 4:00 – 4:30 | All 5 types + Boss | 2.0 | Reduced regular spawns | 150 + Boss | Boss active. Focus shifts. |
| 4:30 – 5:00 | All 5 types + Boss | 1.5 | Minimal regular spawns | 120 + Boss | Final push. |

### Spawn Rate Formula

The base spawn rate increases over time:

```
spawn_rate(t) = base_rate × (1 + 0.4 × floor(t / 30))
```

Where `t` is elapsed seconds and `base_rate` is 0.8 at the start. This gives a 40% increase every 30 seconds, capped at 3.0/second.

### Enemy Composition Weights

At each time bracket, enemies spawn according to these weights:

| Time | Zombie | Bat | Skeleton | Ghost | Caster |
|---|---|---|---|---|---|
| 0:00–1:00 | 100% | — | — | — | — |
| 1:00–2:00 | 55% | 45% | — | — | — |
| 2:00–3:00 | 35% | 30% | 25% | 10% | — |
| 3:00–4:00 | 22% | 25% | 20% | 15% | 18% |
| 4:00–5:00 | 20% | 25% | 20% | 15% | 20% |

### Difficulty Scaling Formula

After the boss is defeated (if the player kills it before 5:00), enemy stats scale up for the remaining duration:

```
hp_multiplier = 1 + 0.15 × minutes_after_boss_kill
damage_multiplier = 1 + 0.10 × minutes_after_boss_kill
```

If the boss is not killed by 5:00, no scaling applies — the game simply ends.

---

## Enemy Spawn Details

This section defines the stats for each enemy type as they appear in Stage 1. All values are tuned for the 5-minute prototype.

### Enemy 1: Zombie (Fodder)

| Stat | Value |
|---|---|
| HP | 10 |
| Damage (contact) | 8 |
| Speed | 60 px/s |
| Size (radius) | 14px |
| XP Value | 1 |
| Gold Value | 1–2 |
| Spawn Weight | 100 (early), scales down over time |
| Behavior | Chase — moves directly toward the player |
| First Appears | 0:00 |

### Enemy 2: Bat (Pressure)

| Stat | Value |
|---|---|
| HP | 5 |
| Damage (contact) | 5 |
| Speed | 120 px/s |
| Size (radius) | 10px |
| XP Value | 1 |
| Gold Value | 1 |
| Spawn Weight | 80 |
| Behavior | Swarm — fast, low HP, spawns in groups of 2–4 |
| First Appears | 1:00 |
| Power-Up Drop | Magnet (5% chance) |

### Enemy 3: Skeleton (Tank / Obstacle)

| Stat | Value |
|---|---|
| HP | 35 |
| Damage (contact) | 12 |
| Speed | 40 px/s |
| Size (radius) | 16px |
| XP Value | 3 |
| Gold Value | 2–3 |
| Spawn Weight | 60 |
| Behavior | Tank — slow, high HP, absorbs damage |
| First Appears | 2:00 |
| Power-Up Drop | Screen Wipe (2% chance) |

### Enemy 4: Ghost (Trick)

| Stat | Value |
|---|---|
| HP | 15 |
| Damage (contact) | 10 |
| Speed | 80 px/s |
| Size (radius) | 12px |
| XP Value | 2 |
| Gold Value | 2–3 |
| Spawn Weight | 50 |
| Behavior | Wander → Chase — drifts randomly, then locks onto player |
| First Appears | 2:30 |
| Power-Up Drop | Magnet (5% chance) |

### Enemy 5: Caster (Disruptor)

| Stat | Value |
|---|---|
| HP | 12 |
| Damage (contact) | 8 |
| Speed | 50 px/s |
| Size (radius) | 13px |
| XP Value | 3 |
| Gold Value | 3–4 |
| Spawn Weight | 45 |
| Behavior | Ranged — maintains distance, fires slow projectiles at player |
| First Appears | 3:00 |
| Projectile Damage | 6 |
| Projectile Speed | 150 px/s |
| Power-Up Drop | Screen Wipe (2% chance) |

### Boss: "The Gravekeeper"

| Stat | Value |
|---|---|
| HP | 1,000 |
| Damage (contact) | 15 |
| Speed | 70 px/s (Phase 1), 100 px/s (Phase 2) |
| Size (radius) | 28px |
| XP Value | 50 |
| Gold Value | 20–30 |
| Spawn Time | 4:00 |
| Behavior | Two-phase boss with attack patterns |
| Power-Up Drop | Weapon Level-Up (100% guaranteed) |

**Boss Attack Patterns:**

- **Phase 1 (100%–50% HP):** Charges toward the player in straight lines. Every 3 seconds, spawns 3 zombie minions. Charge deals 15 damage on contact.
- **Phase 2 (50%–0% HP):** Movement speed increases to 100 px/s. Charges become faster and more frequent (every 2 seconds). Spawns 5 minions per wave. Adds a ground-pound AoE every 5 seconds (radius 80px, 20 damage, telegraphed by a red circle).

**Boss Spawn Announcement:**
- At 3:50 (10 seconds before spawn): Screen dims slightly. Text appears: "Something stirs in the darkness..."
- At 3:55 (5 seconds before spawn): Camera shake. Text: "The Gravekeeper rises!"
- At 4:00: Boss spawns from the nearest screen edge with a dramatic entrance animation.

---

## Drop Economy

This section defines what enemies drop and the expected income per minute.

### Base Drops Per Enemy Kill

| Enemy Type | XP | Gold | Screen Wipe | Magnet | Weapon Up |
|---|---|---|---|---|---|
| Zombie | 1 | 1–2 | — | — | 1% |
| Bat | 1 | 1 | — | 5% | — |
| Skeleton | 3 | 2–3 | 2% | — | 1% |
| Ghost | 2 | 2–3 | — | 5% | 1% |
| Caster | 3 | 3–4 | 2% | — | 1% |
| Boss | 50 | 20–30 | — | — | 100% |

### Expected Income Per Minute

| Minute | Est. Kills | Est. XP | Est. Gold | Power-Ups |
|---|---|---|---|---|
| 0:00–1:00 | 48 | 48 | 60–90 | 0–1 |
| 1:00–2:00 | 90 | 100 | 110–160 | 1–2 |
| 2:00–3:00 | 130 | 230 | 200–310 | 2–3 |
| 3:00–4:00 | 165 | 310 | 310–480 | 3–4 |
| 4:00–5:00 | 80 + Boss | 200 | 120–180 | 1–2 + Boss drop |
| **Total** | **~513** | **~888** | **~800–1220** | **7–12** |

### XP Value Scaling

Enemy XP values increase slightly over time to keep pace with the XP curve:

```
xp_value(t) = base_xp × (1 + 0.05 × floor(t / 60))
```

This gives a 5% XP value increase per minute. Zombies that spawned at minute 3 are worth 1.15 XP instead of 1 XP. This prevents the XP curve from stalling in the mid-game.

### Gold Economy

Gold has no spending mechanic in V1. It serves as a score metric only. The gold economy is tuned so that:
- A typical run yields 800–1,200 gold
- High-end runs (skilled play, good power-up luck) yield 1,500+ gold
- Gold is displayed on the game-over screen as a bragging-right stat

---

## Weapon Progression

This section defines when weapons unlock, how they scale, and when power spikes land.

### Weapon Unlock Schedule

| Weapon | Unlock Condition | Expected Unlock Time |
|---|---|---|
| Weapon 1 (Projectile) | Start of game | 0:00 |
| Weapon 2 (Orbit) | Player reaches Level 3 | ~0:15 |
| Weapon 3 (Area) | Player reaches Level 6 | ~1:15 |

### Weapon 1: Projectile (Primary)

**Type:** Fires a projectile toward the nearest enemy.

| Level | Damage | Cooldown | Projectile Count | Special |
|---|---|---|---|---|
| 1 | 8 | 1.00s | 1 | — |
| 2 | 10 | 0.95s | 1 | — |
| 3 | 12 | 0.90s | 1 | — |
| **4** | **15** | **0.85s** | **1** | **Power Spike: Pierces +1 enemy** |
| 5 | 18 | 0.80s | 2 | +1 projectile |
| 6 | 22 | 0.75s | 2 | — |
| **7** | **28** | **0.65s** | **3** | **Power Spike: Projectiles split on hit** |

**Power Spike Details:**
- **Level 4 — Pierce:** Projectiles pass through 1 additional enemy before disappearing. Each pierce deals 75% damage to secondary targets.
- **Level 7 — Split:** On hit, the projectile splits into 3 smaller projectiles that fan out. Split projectiles deal 50% damage and do not split again.

**DPS Progression:**
| Level | DPS |
|---|---|
| 1 | 8.0 |
| 2 | 10.5 |
| 3 | 13.3 |
| 4 | 17.6 (+ pierce = ~22 effective) |
| 5 | 22.5 |
| 6 | 29.3 |
| 7 | 43.1 (+ split = ~55 effective) |

### Weapon 2: Orbit (Crowd Control)

**Type:** Orbs circle the player, damaging enemies on contact.

| Level | Damage | Orbit Speed | Orb Count | Radius | Special |
|---|---|---|---|---|---|
| 1 | 5 | 2.0s/rotation | 2 | 80px | — |
| 2 | 6 | 1.85s | 2 | 85px | — |
| 3 | 7 | 1.70s | 2 | 90px | — |
| **4** | **9** | **1.55s** | **3** | **120px** | **Power Spike: +50% radius, +1 orb** |
| 5 | 11 | 1.40s | 3 | 130px | — |
| 6 | 13 | 1.30s | 4 | 140px | +1 orb |
| **7** | **16** | **1.00s** | **4** | **160px** | **Power Spike: Afterimage trails** |

**Power Spike Details:**
- **Level 4 — Expanded Orbit:** Orbit radius increases by 50% and a third orb is added. This dramatically increases the coverage area.
- **Level 7 — Afterimage:** Each orb leaves a damaging afterimage trail that persists for 0.5 seconds. Afterimages deal 30% of base damage per tick.

**DPS Progression:**
| Level | DPS (approximate) |
|---|---|
| 1 | 5.0 |
| 2 | 6.5 |
| 3 | 8.2 |
| 4 | 17.3 (+ radius = huge area) |
| 5 | 23.6 |
| 6 | 30.0 |
| 7 | 64.0 (+ afterimages) |

### Weapon 3: Area (Burst Damage)

**Type:** Pulses damage in a radius around the player.

| Level | Damage | Cooldown | Radius | Pulses | Special |
|---|---|---|---|---|---|
| 1 | 12 | 2.50s | 80px | 1 | — |
| 2 | 15 | 2.35s | 88px | 1 | — |
| 3 | 18 | 2.20s | 96px | 1 | — |
| **4** | **22** | **2.00s** | **110px** | **2** | **Power Spike: Double pulse** |
| 5 | 27 | 1.85s | 120px | 2 | — |
| 6 | 33 | 1.70s | 135px | 2 | — |
| **7** | **42** | **1.40s** | **160px** | **3** | **Power Spike: Massive explosion + stun** |

**Power Spike Details:**
- **Level 4 — Double Pulse:** The area attack fires twice in quick succession (0.3s apart). Each pulse deals full damage.
- **Level 7 — Devastation:** The third pulse is a massive explosion (160px radius) that deals 2× damage and stuns all enemies hit for 1.0 second.

**DPS Progression:**
| Level | DPS |
|---|---|
| 1 | 4.8 |
| 2 | 6.4 |
| 3 | 8.2 |
| 4 | 22.0 (double pulse = 2× per cycle) |
| 5 | 29.2 |
| 6 | 38.8 |
| 7 | 90.0 (triple pulse + 2× on third) |

### Combined DPS by Minute

This shows the player's total estimated DPS as weapons scale:

| Minute | W1 Level | W2 Level | W3 Level | Total DPS |
|---|---|---|---|---|
| 0:00 | 1 | — | — | 8 |
| 1:00 | 2–3 | 1 | — | 20–25 |
| 2:00 | 3–4 | 1–2 | 1 | 35–45 |
| 3:00 | 4–5 | 2–3 | 1–2 | 55–75 |
| 4:00 (Boss) | 5–6 | 3–4 | 2–3 | 80–110 |

---

## Level-Up Pacing

This section defines how frequently level-ups occur and what choices the player faces.

### Level-Up Frequency

| Minute | Levels Gained | Interval Between Level-Ups | Design Feel |
|---|---|---|---|
| 0:00–1:00 | 4 | ~12–15 seconds | Rapid. Teaches the system. |
| 1:00–2:00 | 3 | ~18–22 seconds | Steady. Building power. |
| 2:00–3:00 | 2 | ~25–30 seconds | Measured. Meaningful choices. |
| 3:00–4:00 | 2 | ~28–35 seconds | Tense. Every pick matters. |
| 4:00–5:00 | 1–2 | ~30–45 seconds | Climactic. Boss fight pressure. |
| **Total** | **12–13** | — | — |

### Upgrade Pool Composition

At each level-up, the player sees 3 random options from the upgrade pool.

**Pool Categories:**
- **Weapon Upgrades (60% weight):** Upgrade an owned weapon by 1 level, or unlock a new weapon.
- **Passive Stat Boosts (40% weight):** Permanent stat increase.

**Pool Rules:**
1. No duplicate options in a single level-up screen.
2. If a weapon is at max level (7), it is excluded from the pool.
3. If a weapon is not yet owned but its unlock level has been reached, "Unlock [Weapon]" appears as an option.
4. If all weapons are maxed, the pool is 100% passive boosts.
5. Passives can stack (e.g., picking Max Health +20% twice gives +40% total).

### Passive Stat Boosts (V1 Pool)

| Boost | Effect | Max Stacks |
|---|---|---|
| Max Health +20% | Increases maximum HP | 5 |
| Movement Speed +10% | Faster movement | 3 |
| Armor +1 | Reduces incoming damage by 1 (min 1) | 3 |
| Pickup Range +25px | Collect pickups from further away | 4 |
| Crit Chance +5% | Chance for 1.5× damage | 4 |

### Expected Upgrade Distribution

In a typical 5-minute run with 12–13 level-ups:

| Category | Expected Picks | Notes |
|---|---|---|
| Weapon 1 upgrades | 3–4 | Player focuses on primary weapon. |
| Weapon 2 upgrades | 2–3 | Secondary weapon. |
| Weapon 3 upgrades | 1–2 | Late unlock, fewer picks. |
| Weapon unlocks | 0 (built into weapon picks) | W2 at level 3, W3 at level 6. |
| Passive boosts | 3–4 | Health, speed, armor most common. |

---

## Power-Up Drop Schedule

Power-ups drop from specific enemy kills and provide temporary or instant advantages.

### Drop Rate Reference

| Power-Up | Drop Source | Drop Chance | Expected Frequency |
|---|---|---|---|
| Screen Wipe | Skeleton, Caster | 2% | 1 per 2–3 minutes |
| Magnet | Bat, Ghost | 5% | 1 per 1–2 minutes |
| Weapon Level-Up | Any enemy | 1% | 1 per 1–2 minutes |
| Weapon Level-Up | Boss | 100% | Guaranteed on boss kill |

### Expected Power-Up Count Per Run

| Power-Up | Expected Count | Notes |
|---|---|---|
| Screen Wipe | 1–2 | Rare. Saves the player in tight spots. |
| Magnet | 2–3 | Moderate. Great for XP bursts. |
| Weapon Level-Up | 2–4 | Rare from mobs + 1 from boss. |

### Power-Up Timing Notes

- **Screen Wipe:** Most impactful when the screen is dense. Players should feel relief and excitement when one drops. The 2% chance from Skeletons and Casters means the player gets roughly one every 90 seconds once those enemies appear (at minute 2+).
- **Magnet:** Drops from Bats (minute 1+) and Ghosts (minute 2+). The 5% chance means one drops roughly every 60 seconds once bats are active. Magnets are most valuable when many pickups are on the ground.
- **Weapon Level-Up:** The 1% base chance means roughly one drops every 2 minutes from regular kills. The boss guarantee ensures the player gets at least one during the boss fight, potentially pushing a weapon to its next power spike.

### Magnet Interaction Rules

- Base pickup range: 50px
- Magnet extends pickup range to 350px for 10 seconds
- All pickups within 350px are attracted at 400 px/s
- Multiple magnets do not stack; picking up another resets the 10-second timer
- Magnet pickups also grant an immediate burst: all pickups within 150px are instantly collected

---

## Sound Design Arc

Sound design is a progression system. The audio arc mirrors the chaos curve — sparse and clear at the start, layered and intense by the end. Every sound cue reinforces the player's sense of power and the rising threat.

### Music Progression

| Time | Track | Transition | Feel |
|---|---|---|---|
| 0:00 | Stage Theme — Ambient Intro | Fade in over 2s | Quiet. Atmospheric. Gothic synth pads. |
| 0:15 | Stage Theme — Beat Drop | Drums enter | Rhythm kicks in. Player moves. |
| 1:00 | Stage Theme — Building Loop | Add bass layer | Bats arrive. Tension rising. |
| 2:00 | Stage Theme — Full Intensity | Add lead synth | Skeletons and ghosts. Full chaos. |
| 3:30 | Stage Theme — Pre-Boss Build | Strings swell, drums intensify | "Something is coming." |
| 3:50 | Silence — 2s | Music cuts out | Dramatic pause. Screen dims. |
| 3:52 | Boss Theme — Ominous Intro | Deep bass, low strings | "The Gravekeeper rises!" |
| 4:00 | Boss Theme — Full Combat | Aggressive drums, distorted synths | Boss fight. Maximum intensity. |
| 4:30 | Boss Theme — Phase 2 Escalation | Tempo +15%, added layers | Boss enters Phase 2. Desperate. |
| Boss death | Victory Sting | 2s brass fanfare | Relief. Triumph. |
| 5:00 (survived) | Game Over — Melancholic | Piano + strings, 5s fade | Bittersweet. Stats reveal. |
| Player death | Death Sting — Low boom | 1s impact, then silence | Finality. Defeat. |

### SFX Layering by Minute

The soundscape builds as more enemies and weapons fill the screen.

| Minute | Active Sounds | Density | Audio Character |
|---|---|---|---|
| 0:00–1:00 | W1 fire, zombie hit/kill, XP pickup, gold pickup | Sparse | Individual sounds are distinct and clear. Each hit and kill feels impactful. |
| 1:00–2:00 | + W2 orbit hum, bat death screech, level-up chime | Moderate | Two weapons firing. Bat swarms add texture. Level-ups punctuate. |
| 2:00–3:00 | + W3 area pulse, skeleton armor clank, ghost wail, power-up drop | Dense | Three weapons. New enemy sounds layer in. Power-up drops cut through. |
| 3:00–4:00 | + Caster projectile, screen wipe whoosh, magnet hum | Very Dense | Cacophony. Sounds blend into a wall of chaos. Screen wipe provides relief. |
| 4:00–5:00 | + Boss charges, boss minions, ground pound, boss death | Peak | Boss sounds dominate. Regular sounds ducked. Victory/death sting caps it. |

### Key Sound Moments

These are the emotional peaks in the audio experience. Each one should feel earned and satisfying.

| Moment | Sound | Emotional Payoff |
|---|---|---|
| First level-up (0:05) | Ascending chime + card reveal | "I'm getting stronger." |
| First weapon unlock (0:15) | Power-up jingle + weapon equip sound | "New toy!" |
| W1 hits L4 (2:00) | Enhanced fire sound + pierce whoosh | "My weapon evolved." |
| First screen wipe | Dramatic whoosh/boom + silence | "I survived that." Relief. |
| First magnet | Magnetic hum + rapid pickup chimes | "Look at all that XP!" Rush. |
| Boss warning (3:50) | Music cuts. Ominous rumble. | Dread. Anticipation. |
| Boss spawn (4:00) | Entrance roar + ground shake | "Here it comes." Heart pounding. |
| W1 hits L7 (3:30) | Split projectile sound + visual fanfare | "I'm unstoppable." Peak power. |
| Boss death (4:15) | Explosion + slow-mo bass drop + victory sting | "I did it." Catharsis. |
| Game over (5:00) | Death sting or melancholic piano | Finality. Stats reveal. "One more try." |

### Sound Priority System

When many sounds play simultaneously, the engine must prioritize which ones the player hears.

**Priority Order (highest to lowest):**
1. Player hurt / death
2. Power-up collected
3. Level-up
4. Boss sounds (charges, ground pound, death)
5. Screen wipe
6. Weapon fire (player's weapons)
7. Enemy death
8. Weapon hit
9. Pickup collection (XP, gold)
10. Enemy ambient (bats, ghosts)

**Ducking Rules:**
- When a high-priority sound plays, lower volume of all lower-priority sounds by 20% for 0.3 seconds.
- When the boss is active, duck all regular combat sounds by 30% so boss cues are audible.
- During the level-up screen, duck all combat sounds to 10% volume (game is paused, but ambient remains).

### Distance-Based Audio

Sounds attenuate based on distance from the player to create spatial awareness.

| Distance | Volume | Effect |
|---|---|---| |
| 0–100px | 100% | Full volume. Immediate. |
| 100–200px | 70% | Noticeable but not overwhelming. |
| 200–400px | 40% | Atmospheric. Fills the space. |
| 400px+ | 20% | Barely audible. Background texture. |

**Exceptions:** Player sounds (weapon fire, hurt, death) are always at 100% regardless of distance. Boss sounds are always at 80% minimum to maintain presence.

### Audio Implementation Notes

- **V1 Approach:** Synthesized sounds using Web Audio API oscillators. No external audio files. Single HTML5 file, zero external dependencies.
- **Music Crossfade:** Track transitions use 2-second crossfades except for the pre-boss silence (instant cut) and boss death (slow-motion bass drop).
- **Volume Defaults:** Master 80%, Music 70%, SFX 85%. No settings UI in V1.

### Pickup Sound Engine — The Payout Triad

The pickup sound system is the most frequently heard audio in the game. It is modeled on the casino slot machine research that inspired Vampire Survivors: rapid ascending arpeggios locked to a consonant musical scale, with deliberate randomization to prevent repetition fatigue during high-velocity collection.

#### Oscillator Configuration

| Parameter | Value | Rationale |
|---|---|---|
| Waveform | `square` | Crunchy, retro 8-bit arcade texture. Harmonically rich — sounds full even at low volume. |
| Attack | 0.005s | Instant on. No fade-in. Matches the percussive "clink" of a coin drop. |
| Decay | 0.04s | Very short. Each note in the arpeggio is a blip, not a tone. |
| Release | 0.02s | Sharp cutoff. Notes do not bleed into each other. |
| Total Duration | ~0.065s per arpeggio | Fast enough that 10+ pickups per second still sound distinct. |

#### C Major Harmonic Scale (C5–C6)

All pickup tones are locked to the C Major scale in the C5–C6 octave. This ensures that rapid, overlapping pickups **harmonize** instead of creating dissonant ear fatigue.

| Scale Degree | Note | Frequency (Hz) |
|---|---|---|
| 1 | C5 | 523.25 |
| 2 | D5 | 587.33 |
| 3 | E5 | 659.25 |
| 4 | F5 | 698.46 |
| 5 | G5 | 783.99 |
| 6 | A5 | 880.00 |
| 7 | B5 | 987.77 |
| 8 | C6 | 1046.50 |

#### Payout Triad Arpeggio Pattern

Each individual pickup triggers a rapid, quantized 3-note arpeggio — not a smooth pitch slide. The frequency envelope **steps** through three notes in sequence:

```
Note 1 (0.00s): Base Note          → e.g., 523.25 Hz (C5)
Note 2 (0.02s): Perfect 5th        → Base × 1.5    → e.g., 784.88 Hz
Note 3 (0.04s): Octave             → Base × 2.0    → e.g., 1046.50 Hz
```

The Perfect 5th interval (ratio 3:2) is the most consonant interval after the octave. Combined with the octave (ratio 2:1), it forms a **major triad** — the most psychologically "rewarding" chord in Western music theory. This is the same interval structure used in casino slot machine payout sounds.

**Why this works:** The ascending major triad triggers a micro-dopamine response. The brain recognizes the pattern as "ascending resolution" — the same harmonic structure used in victory fanfares, coin pickups across 40+ years of arcade games, and slot machine payout jingles.

#### Variance Engine — Anti-Repetition System

When the player vacuums dozens of pickups per second (especially with Magnet active), naively replaying the same arpeggio creates a harsh "machine gun" effect. The variance engine prevents this through three layered techniques:

**1. Combo Stepping**

An index counter advances through the C Major scale array with each pickup. The base note of each arpeggio shifts up the scale progressively.

```
Pickup 1 → Base = C5 (523.25 Hz)
Pickup 2 → Base = D5 (587.33 Hz)
Pickup 3 → Base = E5 (659.25 Hz)
Pickup 4 → Base = F5 (698.46 Hz)
Pickup 5 → Base = G5 (783.99 Hz)
Pickup 6 → Base = A5 (880.00 Hz)
Pickup 7 → Base = B5 (987.77 Hz)
Pickup 8 → Base = C6 (1046.50 Hz)
Pickup 9 → Base = C5 (reset to start)
```

**Reset condition:** If the time delta between the last pickup and the current pickup exceeds **0.6 seconds**, the combo index resets to 0. This means fast collection creates a rising melodic cascade, while isolated pickups always start from the satisfying low C5.

**2. Micro-Tuning Jitter**

Add a random frequency offset of **±15 Hz** to the final output frequency of each note. This ensures that even when the combo index lands on the same scale degree twice in rapid succession, the two arpeggios sound subtly different.

```
final_freq = base_freq + random(-15, +15)
```

The ±15 Hz range is carefully chosen: large enough to be perceptible (the human ear can detect ~3.6 Hz differences in this range), but small enough to stay within the C Major scale's consonant envelope.

**3. Volume Decoupling**

Randomize the peak gain value slightly per note trigger:

```
peak_gain = random(0.08, 0.12)
```

This prevents the auditory system from locking into a perceived "flat" volume pattern. The slight dynamic variation mimics the natural inconsistency of physical coins hitting a tray — a sound humans associate with reward.

#### Pickup Sound Specifications by Type

| Pickup Type | Arpeggio Pattern | Duration | Peak Gain | Notes |
|---|---|---|---|---|
| XP Gem (Small) | Base → ×1.5 → ×2.0 | 0.065s | 0.08–0.12 | Standard payout triad. Combo-stepped. |
| XP Gem (Large) | Base → ×1.5 → ×2.0 → ×2.5 | 0.085s | 0.10–0.14 | Extended arpeggio (4 notes). Slightly louder. 4th note = Major 3rd above octave. |
| Gold Coin | Base → ×1.25 → ×1.5 | 0.055s | 0.09–0.13 | Shorter, brighter. Major 2nd → Perfect 5th. Clink texture. |
| Power-Up Collect | Base → ×1.25 → ×1.5 → ×2.0 → ×2.5 | 0.12s | 0.15–0.20 | Full 5-note arpeggio. Louder, longer. Victory feel. |
| Level-Up | Ascending scale run: C5→E5→G5→C6 | 0.20s | 0.18–0.22 | Full octave arpeggio. Slowest pickup sound. Triumphant. |
| Screen Wipe | Descending sweep: 2000Hz → 100Hz | 1.5s | 0.20–0.25 | White noise burst at tail. Dramatic. Not part of pickup system. |
| Magnet Hum | Continuous sine wave: 220Hz + 330Hz | Duration of effect | 0.05–0.08 | Layered perfect 5th. Constant, low. Magnetic texture. |

#### Weapon Fire Sounds

| Weapon | Waveform | Pattern | Notes |
|---|---|---|---|
| W1 (Projectile) | Square | Single blip at base freq. Pitch scales with damage. | Short, punchy. Like a laser shot. |
| W2 (Orbit) | Triangle | Continuous hum at 110Hz + 165Hz (perfect 5th). | Low, constant. Orbital resonance feel. |
| W3 (Area) | Sawtooth → Low-pass filter sweep | Burst from 800Hz → 200Hz over 0.3s. | Whoosh/bass pulse. Area denial feel. |

#### Enemy Hit/Kill Sounds

| Event | Waveform | Frequency Range | Notes |
|---|---|---|---|
| Enemy Hit | Noise burst (white noise × gain envelope) | 200–800Hz (bandpass filtered) | Short, percussive. Duration: 0.03s. |
| Zombie Kill | Square wave pitch drop: 400Hz → 100Hz | 0.15s | Satisfying "pop" downward. |
| Bat Kill | Square wave chirp: 1200Hz → 800Hz | 0.08s | Quick, high-pitched. Matches bat's swiftness. |
| Skeleton Kill | Square + noise layered | 300Hz + 600Hz | Heavier. Armor break feel. Duration: 0.2s. |
| Ghost Kill | Sine wave wail: 600Hz → 200Hz | 0.3s | Ethereal fade. Ghostly dissipation. |
| Caster Kill | Square wave burst: 500Hz → 200Hz | 0.15s | Standard. Magical fizz. |
| Boss Death | Sine + square layered: 60Hz base + 120Hz + 240Hz | 2.0s | Deep, layered. Overtones cascade down. Slow-motion bass drop feel. |

#### Player Hurt / Death

| Event | Waveform | Pattern | Notes |
|---|---|---|---|
| Player Hurt | Square wave: 200Hz → 100Hz | 0.1s | Low, blunt impact. Immediate. |
| Player Death | Square + sine: 400Hz → 50Hz | 1.5s | Slow descending wail. Finality. Silence after. |

#### UI Sounds

| Event | Waveform | Pattern | Notes |
|---|---|---|---|
| UI Click | Sine wave: 800Hz | 0.02s | Tiny, clean. Button feedback. |
| Boss Warning | Sine wave: 100Hz, fading in | 2.0s | Ominous rumble. Low frequency. |
| Boss Spawn | Square + noise: 80Hz → 40Hz | 1.0s | Ground-shaking impact. Heavy. |

### Fun Factor Checklist (Sound-Specific)

- [ ] First level-up sound feels rewarding
- [ ] Weapon unlock sound feels like a power jump
- [ ] Screen wipe sound creates a moment of relief
- [ ] Magnet pickup sound creates a rush of satisfaction
- [ ] Boss warning silence creates genuine tension
- [ ] Boss death sound provides catharsis
- [ ] Death sting feels final, not frustrating
- [ ] Late-game chaos sounds intense but not painful
- [ ] No single sound becomes annoying through repetition
- [ ] Music builds naturally and doesn't feel jarring
- [ ] XP pickup arpeggios harmonize during rapid collection (no dissonance)
- [ ] Combo stepping creates melodic rise during Magnet vacuum
- [ ] Gold coin pickup sounds distinct from XP pickup
- [ ] Each weapon has a unique, recognizable fire sound
- [ ] Enemy hit sounds provide satisfying feedback without overwhelming
- [ ] Boss spawn sound creates genuine physical tension (low frequency)

---

## Boss Encounter

The boss fight is the climax of Stage 1. It tests whether the player has built a viable weapon loadout and survived the chaos.

### Boss Stats

| Stat | Value |
|---|---|
| Name | The Gravekeeper |
| HP | 1,000 |
| Contact Damage | 15 |
| Speed (Phase 1) | 70 px/s |
| Speed (Phase 2) | 100 px/s |
| Size (radius) | 28px |
| Spawn Time | 4:00 |
| Despawn | On death or at 5:00 (game end) |

### Boss Phases

**Phase 1 (100%–50% HP):**
- Movement: Charges in straight lines toward the player. Each charge lasts 1.5 seconds, followed by a 1.0-second pause.
- Minion Spawns: Every 3 seconds, spawns 3 Zombies near the player (within 200px).
- Visual: Slow, deliberate movements. Red aura. Ground trembles on charge.

**Phase 2 (50%–0% HP):**
- Triggered at 500 HP. Brief animation pause (0.5s). Boss roars. Speed increases.
- Movement: Charges become faster (100 px/s) and more frequent (every 2 seconds).
- Minion Spawns: Every 2 seconds, spawns 5 Zombies.
- Ground Pound: Every 5 seconds, targets the player's position. A red circle (80px radius) appears as a 0.75-second telegraph, then deals 20 damage to anything inside.
- Visual: Red aura intensifies. Screen shakes on ground pound. More aggressive.

### Boss DPS Check

The player needs to deal 1,000 damage before the timer reaches 5:00 (60 seconds of boss fight).

| Player DPS | Kill Time | Difficulty |
|---|---|---|
| 40 | 25s | Easy |
| 25 | 40s | Comfortable |
| 17 | 60s | Tight — barely makes it |
| <17 | 60s+ | Will not kill boss in time |

The expected player DPS at 4:00 is 80–110, giving a kill time of 9–12 seconds. This means most players should defeat the boss comfortably, but under-built or unlucky runs create tension.

### Boss Loot

On death, the boss drops:
- 50 XP (collected automatically)
- 20–30 gold (scattered around boss death position)
- 1× Weapon Level-Up power-up (guaranteed, drops at boss position)

The boss kill triggers a brief slow-motion effect (0.5s at 25% speed) before the loot drops.

---

## Stage End & Victory

### End Conditions

| Condition | Trigger | Result |
|---|---|---|
| **Victory** | Boss killed before 5:00 | "VICTORY" screen |
| **Survival** | Timer reaches 5:00 (boss alive) | "SURVIVED" screen |
| **Defeat** | Player HP reaches 0 | "GAME OVER" screen |

### End Screen Behavior

When the stage ends:
1. All gameplay freezes.
2. A 1.0-second pause for dramatic effect.
3. The end screen fades in over 0.5 seconds.
4. Stats are displayed with animated counters (values tick up from 0).

### End Screen Stats

| Stat | Display |
|---|---|
| Time Survived | MM:SS (or "5:00" if survived full duration) |
| Level Reached | # |
| Enemies Killed | # |
| Gold Collected | # |
| Boss Defeated | Yes / No |
| Weapon Loadout | W1 Lv.#, W2 Lv.#, W3 Lv.# |

### Victory Bonus

If the player defeats the boss:
- Bonus: +100 gold
- Bonus text: "The Gravekeeper has been vanquished!"
- Confetti particle effect on the end screen

### Defeat Screen

If the player dies:
- Red tint overlay
- "DEFEATED" title
- Same stats as above, minus boss defeated
- "Restart" button (primary), "Main Menu" button (secondary)

---

## Balance Targets

These are the numerical targets the progression should hit during playtesting. Adjust values during implementation to match these feels.

### Kill Rate Targets

| Minute | Target Kills | Target Kill Rate | Notes |
|---|---|---|---|
| 0:00–1:00 | 40–50 | 0.7–0.8/s | Comfortable. Player learning. |
| 1:00–2:00 | 80–100 | 1.3–1.7/s | Building. Multiple weapons. |
| 2:00–3:00 | 120–150 | 2.0–2.5/s | Escalating. Screen filling. |
| 3:00–4:00 | 150–180 | 2.5–3.0/s | Peak chaos. |
| 4:00–5:00 | 70–100 | 1.2–1.7/s | Boss focus. Fewer regulars. |
| **Total** | **460–580** | — | — |

### DPS Checkpoints

| Timestamp | Minimum DPS | Target DPS | Notes |
|---|---|---|---|
| 1:00 | 12 | 18–22 | Comfortably clearing zombies. |
| 2:00 | 25 | 35–45 | Handling mixed enemy types. |
| 3:00 | 40 | 55–75 | Keeping up with density. |
| 4:00 (Boss) | 60 | 80–110 | Killing boss before timer. |

### Health Economy

| Metric | Target |
|---|---|
| Starting HP | 100 |
| HP at 2:00 (avg) | 70–85 (some hits taken) |
| HP at 3:00 (avg) | 50–70 (tension rising) |
| HP at 4:00 (Boss) | 40–60 (risky but alive) |
| HP at boss death | 20–40 (close call is fun) |

### Satisfaction Targets

| Metric | Target |
|---|---|
| First level-up | < 10 seconds |
| First power spike (W1 L4) | ~2:00–2:30 |
| First screen wipe drop | ~2:30–3:30 |
| First magnet drop | ~1:30–2:30 |
| Boss kill (avg player) | 10–15 seconds |
| Boss kill (skilled player) | 6–8 seconds |

### Audio Checkpoints
| Metric | Target |
|---|---|
| Music beat drops | Within 15 seconds of stage start |
| First weapon unlock sound | ~0:15 |
| W1 power spike audio | ~2:00–2:30 |
| Boss warning silence | 3:50 (10 seconds before spawn) |
| Boss theme full intensity | 4:00 |
| Victory sting | Within 2 seconds of boss death |
| Death sting | Within 1 second of HP reaching 0 |

---

## Fun Factor Checklist

Use this checklist during playtesting to verify the progression feels right.

### Pacing
- [ ] First level-up lands within 10 seconds
- [ ] Level-ups feel frequent in minute 1 (4+ in 60 seconds)
- [ ] Level-ups slow down naturally by minute 3
- [ ] No minute feels empty or boring
- [ ] The player always has something to work toward (next weapon unlock, next power spike)

### Power Fantasy
- [ ] Player feels weak at start (zombies are a genuine threat)
- [ ] Player feels strong by minute 2 (clearing groups confidently)
- [ ] Player feels powerful by minute 3 (screen is chaos, but they're winning)
- [ ] Weapon power spikes (L4, L7) are noticeable and satisfying
- [ ] Screen wipe drops feel like a clutch moment

### Tension
- [ ] Health drops steadily but never feels hopeless
- [ ] The 3:30–4:00 window feels dangerous (peak density)
- [ ] Boss spawn announcement creates anticipation
- [ ] Boss fight is challenging but winnable
- [ ] Close calls (low HP, boss at 10% health) happen regularly

### Chaos
- [ ] Screen is filled with enemies by minute 3
- [ ] Multiple weapons firing simultaneously creates visual noise
- [ ] Gold coins and XP gems scatter satisfyingly
- [ ] Magnet pickups create a rush of collection
- [ ] Damage numbers flood the screen during big fights

### Reward
- [ ] Level-up screen feels meaningful (good choices, not overwhelming)
- [ ] Weapon unlocks feel like power jumps
- [ ] Boss loot feels earned and rewarding
- [ ] End screen stats tell a satisfying story
- [ ] The player wants to immediately try again

### Sound & Audio
- [ ] First level-up chime feels satisfying
- [ ] Weapon unlock sound reinforces the power fantasy
- [ ] Screen wipe sound creates a moment of relief
- [ ] Magnet pickup audio creates a rush
- [ ] Boss warning silence creates genuine dread
- [ ] Boss fight music feels intense and distinct
- [ ] Boss death sound provides catharsis
- [ ] Death sting feels final, not frustrating
- [ ] Late-game audio chaos is intense but not painful
- [ ] Music transitions feel natural, not jarring
- [ ] No single sound becomes annoying through repetition

---

*End of vs_prog.md — Version 1*
