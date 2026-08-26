# Disaster Events Spec

> **Game Version:** v0.4.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D4 (estates produce materials/quests/unlocks, no gold)
> **Depends On:** `27_estate_bloodline_spec.md`, `26_affection_romance_spec.md`, `25_economy_gold_sinks_spec.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Event Types](#2-event-types)
3. [Frequency & Scaling](#3-frequency--scaling)
4. [Resolution Options](#4-resolution-options)
5. [Gratitude Content](#5-gratitude-content)
6. [UI & Notification](#6-ui--notification)
7. [Gaps & Open Questions](#7-gaps--open-questions)

---

## 1. Overview

Disasters are random events that affect estates and the town. They create urgency, provide gold sinks, and give the wife network a purpose.

### Why Disasters Exist

| Purpose | How It Works |
|---|---|
| **Gold sink** | Resolving disasters costs gold |
| **Wife network purpose** | Multiple wives help each other during crises |
| **Content variety** | Breaks up the "build → wait → upgrade" loop |
| **Emotional stakes** | "My family is in danger" motivates action |
| **Quest generation** | Disasters create unique quests |

### Core Principle

> Disasters are **challenges to resolve**, not punishments. The player should feel motivated to act, not frustrated by random losses.

---

## 2. Event Types

### Estate Disasters

| Disaster | Effect | Severity | Resolution Cost |
|---|---|---|---|
| **Fire** | -50% material output for 2 runs | Medium | 100g, 20 wood |
| **Flood** | -30% material output for 1 run | Low | 50g, 10 wood |
| **Bandit Raid** | Lose 1 random material (20 units) | Medium | 75g + defeat 20 enemies |
| **Plague** | -1 worker for 3 runs | High | 150g, 30 herbs |
| **Earthquake** | 1 building damaged (needs repair) | High | 200g, 40 stone |
| **Monster Attack** | -1 guard for 5 runs | Medium | 100g + defeat 30 enemies |

### Town Disasters

| Disaster | Effect | Severity | Resolution Cost |
|---|---|---|---|
| **Market Crash** | -50% gold from shops for 3 runs | Medium | 200g + quest completion |
| **Faction Conflict** | -20 reputation with 1 faction | High | 150g + diplomacy quest |
| **Worker Strike** | -2 workers for 2 runs | Low | 100g + talk to workers |
| **Supply Shortage** | Building costs +50% for 2 runs | Medium | 150g, 50 mixed materials |
| **Spirit Haunting** | -10% XP gain for 3 runs | Low | 75g + defeat ghost enemies |

### Why These Types

| Type | Design Purpose |
|---|---|
| Fire/Flood | Common, low-impact — teaches the system |
| Bandit/Monster | Combat-oriented — ties to gameplay |
| Plague/Earthquake | High-impact — motivates prevention (Guard Post) |
| Market/Faction | Economy/reputation focused — consequences matter |

---

## 3. Frequency & Scaling

### Base Frequency

| Town Level | Disaster Chance (per run) | Average Frequency |
|---|---|---|
| 1 | 5% | 1 per 20 runs |
| 2 | 10% | 1 per 10 runs |
| 3 | 15% | 1 per 6-7 runs |
| 4 | 20% | 1 per 5 runs |
| 5 | 25% | 1 per 4 runs |

### Scaling Factors

| Factor | Effect on Frequency |
|---|---|
| Number of estates | +5% per estate (more targets) |
| Guard Post built | -10% (prevents some disasters) |
| Town population | +2% per 10 population (more people = more problems) |
| Faction reputation | -5% per "Honored" faction (stability) |

### Why Scaling Works

- Early game: Rare disasters (player is building, not managing crises)
- Mid game: Moderate frequency (player has resources to resolve)
- Late game: Frequent but manageable (player has networks and gold)

### Staggering Rule

Disasters **never fire alongside gold-sink quests**. If a quest requires gold spending, no disaster triggers that run. This prevents overwhelming the player with simultaneous costs.

---

## 4. Resolution Options

### Resolution Types

| Type | How It Works | Cost |
|---|---|---|
| **Gold Payment** | Pay gold to fix immediately | Gold only |
| **Material Repair** | Spend materials to repair | Materials only |
| **Combat Resolution** | Defeat enemies to resolve | Time + combat |
| **Wife Network** | Ask another wife for help | Reduced cost |
| **Ignore** | Do nothing (consequences persist) | 0 |

### Wife Network Resolution

When the player has multiple wives, they can ask one wife to help another:

| Network Size | Cost Reduction |
|---|---|
| 1 wife | 0% (solo resolution) |
| 2 wives | 25% cost reduction |
| 3 wives | 50% cost reduction |

**Example:**
- Fire at Freya's estate costs 100g, 20 wood
- With 2 wives: costs 75g, 15 wood
- With 3 wives: costs 50g, 10 wood

### Why Multiple Resolution Types

- Players choose based on current resources (gold-rich vs. material-rich)
- Wife network gives purpose to multiple marriages
- Combat resolution ties back to gameplay
- "Ignore" option exists for players who don't care about that estate

---

## 5. Gratitude Content

When a wife helps another during a disaster, unique dialogue triggers:

### Gratitude Dialogue Pool

```
Wife A (helped): "Thank you for helping me. I won't forget this."
Wife B (helper): "Of course. That's what family is for."

[More lines based on mythology and personality]
```

### Gratitude Rewards

| Event | Reward |
|---|---|
| Wife helps another | +2 affection between them |
| Player resolves disaster | +1 affection with affected wife |
| Network resolution | +5% material output for 2 runs (gratitude bonus) |

### Why Gratitude Matters

- Makes the wife network feel alive and connected
- Rewards the player for building multiple relationships
- Creates narrative moments ("My wives are friends!")
- Provides mechanical benefits (affection, production bonuses)

---

## 6. UI & Notification

### Disaster Notification

When a disaster triggers:

```
┌─────────────────────────────────────────────────┐
│  ⚠️ DISASTER                                    │
│                                                 │
│  🔥 Fire at Valkyrie's Rest!                   │
│                                                 │
│  Effect: -50% material output for 2 runs       │
│                                                 │
│  Resolution Options:                            │
│  [💰 Pay 100g] [🔨 Repair 20 wood]             │
│  [⚔️ Fight Bandits] [👥 Ask Wife Network]      │
│  [❌ Ignore]                                    │
└─────────────────────────────────────────────────┘
```

### Disaster Log

A log of all disasters and their resolutions:

```
┌─────────────────────────────────────────────────┐
│  📜 Disaster Log                                │
├─────────────────────────────────────────────────┤
│  🔥 Fire at Valkyrie's Rest — Resolved (100g)  │
│  🌊 Flood at Homestead — Ignored               │
│  ⚔️ Bandit Raid at Ironhand Manor — Fought     │
└─────────────────────────────────────────────────┘
```

---

## 7. Gaps & Open Questions

**Q1: Can disasters destroy an estate completely?**
- Option A: No — disasters reduce output, never destroy
- Option B: Yes — extreme disasters can destroy (requires rebuild)
- **Recommendation:** No destruction in v1. Too punishing.

**Q2: Can the player prevent disasters?**
- Guard Post reduces frequency, but can't eliminate entirely
- **Recommendation:** Guard Post is the only prevention. Accept some risk.

**Q3: Should disasters affect children?**
- Option A: No — children are safe
- Option B: Yes — children can get sick/injured (adds stakes)
- **Recommendation:** No child effects in v1. Too emotionally heavy.

**Q4: How do disasters interact with auto-clear?**
- Can a disaster trigger during auto-clear?
- **Recommendation:** No. Disasters only trigger after manual combat runs. Auto-clear is "safe."

**Q5: Should there be disaster seasons?**
- Certain disasters more common at certain times
- **Recommendation:** Defer to future version. Adds complexity without much benefit.

---

*Disaster Events Spec v0.1.0 — August 26, 2026*
