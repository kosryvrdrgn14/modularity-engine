# Estate & Bloodline System Spec

> **Game Version:** v0.4.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D4 (estates produce materials/quests/unlocks, no gold), D5 (1:1 binding)
> **Depends On:** `game_frame.md` §11 (Estate System), `26_affection_romance_spec.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Estate Tiers](#2-estate-tiers)
3. [Estate Structure](#3-estate-structure)
4. [Estate Production](#4-estate-production)
5. [Estate Upgrades](#5-estate-upgrades)
6. [Marriage Mechanics](#6-marriage-mechanics)
7. [Children System](#7-children-system)
8. [Bloodline & Legacy](#8-bloodline--legacy)
9. [Wife Network](#9-wife-network)
10. [Gaps & Open Questions](#10-gaps--open-questions)

---

## 1. Overview

Estates are self-contained households for each wife. They produce materials, generate quests, and house the player's family. The key principle: **estates pay for themselves** — no ongoing gold drain on the player.

### Core Concept

```
Player builds estate (gold + resources + quests)
  → Estate becomes self-sustaining (produces materials, not gold)
  → Estate generates family quests
  → Children grow in the estate
  → Estate provides legacy bonuses
```

### Why Estates Exist

| Purpose | How It Works |
|---|---|
| **Gold sink** | Initial build cost drains late-game gold surplus |
| **Family home** | Provides a place for wife + children |
| **Material production** | Generates crafting materials for the player |
| **Quest generator** | Family quests add content variety |
| **Legacy system** | Children become companions/managers |
| **Emotional investment** | Building a home for your family creates attachment |

---

## 2. Estate Tiers

| Tier | Name | What It Includes | Build Cost | Self-Sustaining? |
|---|---|---|---|---|
| **0** | Courting | No estate yet | 0 | N/A |
| **1** | Homestead | Small house + garden | 200g, 30 wood | No (player funds upkeep) |
| **2** | Farmstead | House + farmlands + 1 farmer | 400g, 60 wood, 20 stone | Barely (covers own upkeep) |
| **3** | Manor | House + farmlands + business + 3 staff | 800g, 100 wood, 60 stone, 30 ore | Yes (covers family costs) |
| **4** | Estate | Multiple businesses, staff quarters, grounds | 1500g, 200 wood, 120 stone, 60 ore | Yes (covers family + children) |
| **5** | Dynasty | Full estate + legacy hall + children's quarters | 3000g, 400 wood, 200 stone, 100 ore | Yes (covers full family + bonuses) |

### Why These Tiers

| Tier | Design Purpose |
|---|---|
| 0 | Relationship building — no investment yet |
| 1 | Commitment begins — small gold investment |
| 2 | Self-sufficiency — estate covers its own costs |
| 3 | Marriage eligibility — "I can provide" threshold |
| 4 | Family growth — children, legacy |
| 5 | Dynasty — endgame achievement |

---

## 3. Estate Structure

### Physical Layout

Each estate has a visual layout that expands with tiers:

```
Tier 1 (Homestead):
┌─────────────┐
│   Garden    │
│  ┌───────┐  │
│  │ House │  │
│  └───────┘  │
└─────────────┘

Tier 3 (Manor):
┌─────────────────────┐
│  Farmlands          │
│  ┌───────┐ ┌─────┐ │
│  │ House │ │Shop │ │
│  └───────┘ └─────┘ │
│  ┌─────────────┐    │
│  │   Staff     │    │
│  │  Quarters   │    │
│  └─────────────┘    │
└─────────────────────┘

Tier 5 (Dynasty):
┌─────────────────────────────┐
│  Farmlands    Legacy Hall   │
│  ┌───────┐   ┌───────────┐ │
│  │ House │   │ Children  │ │
│  │       │   │ Quarters  │ │
│  └───────┘   └───────────┘ │
│  ┌─────┐ ┌─────┐ ┌───────┐│
│  │Shop │ │Work-│ │Guard  ││
│  │     │ │shop │ │Post   ││
│  └─────┘ └─────┘ └───────┘│
└─────────────────────────────┘
```

### Data Structure

```json
{
  "id": "estate_freya",
  "wifeId": "freya",
  "tier": 3,
  "name": "Valkyrie's Rest",
  "mythology": "norse",
  "buildings": {
    "house": { "level": 3, "built": true },
    "farmlands": { "level": 2, "built": true },
    "shop": { "level": 1, "built": true },
    "staffQuarters": { "level": 1, "built": true }
  },
  "staff": ["farmer", "cook", "guard"],
  "production": {
    "materials": { "wood": 5, "herbs": 3, "ore": 2 },
    "questsGenerated": 12,
    "lastRun": "2026-08-26"
  },
  "children": [
    { "name": "Storm", "stage": "child", "age": 15, "mythology": "norse" }
  ],
  "upgrades": {
    "farmlands": 2,
    "workshop": 1,
    "quarters": 1
  }
}
```

---

## 4. Estate Production

### Materials (No Gold — D4)

Estates produce materials based on tier and staff:

| Tier | Materials/Run | Types | Notes |
|---|---|---|---|
| 1 | 1-2 | Basic (herbs, wood scraps) | Minimal output |
| 2 | 3-5 | Basic (wood, herbs, stone) | Covers own upkeep |
| 3 | 8-12 | Mixed (all basic + some rare) | Profitable |
| 4 | 15-20 | All types + rare materials | Very profitable |
| 5 | 25-30 | All types + legendary materials | Maximum output |

### Quest Generation

Estates generate family quests that tie the player back to their family:

**Fixed Quests (one-time, story-driven):**
- Unique to each NPC wife
- Unlock special items, dialogue, or estate upgrades
- Example: "Freya's Lost Hammer" → Find her ancestral weapon in a combat stage

**Random Quests (repeatable, rotating):**
- Generated from a pool every few runs
- Scale with estate tier
- Tied to household needs: food shortages, staff problems, children's requests

**Quest Pool by Tier:**

| Tier | Fixed Quests | Random Pool | Frequency |
|---|---|---|---|
| 1 | 1 | 3 basic | 1 per 5 runs |
| 2 | 2 | 5 quests | 1 per 4 runs |
| 3 | 3 | 8 quests | 1 per 3 runs |
| 4 | 4 | 12 quests | 1 per 2 runs |
| 5 | 5 | 15 quests | 1 per run |

---

## 5. Estate Upgrades

### Upgrade Types

| Upgrade | Effect | Cost | Max Level |
|---|---|---|---|
| **Farmlands** | +50% material output per level | 100g, 20 wood | 3 |
| **Workshop** | Unlocks crafting recipes | 150g, 30 stone | 2 |
| **Staff Quarters** | +1 staff slot per level | 120g, 25 wood | 3 |
| **Guard Post** | Prevents random disasters | 200g, 40 stone | 2 |
| **Legacy Hall** | +1 child growth speed | 300g, 50 ore | 1 |

### Upgrade Flow

```
Player visits estate → Taps "Upgrade" → Selects upgrade → Pays cost → Instant effect
```

---

## 6. Marriage Mechanics

### Marriage Requirements (from `26_affection_romance_spec.md`)

| Requirement | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Affection | Claim (4) | Claim (4) | Claim (4) |
| Estate Tier | 2+ | 3+ | 4+ |
| Quest | Simple | Medium | Complex |
| Reputation | Friendly | Honored | Revered |
| Population | 10+ | 15+ | 20+ |

### Marriage Ceremony

When all requirements are met:

1. Player talks to NPC → "Marry me" option appears
2. Brief ceremony scene (VN-style dialogue)
3. NPC gains "Wife" title
4. Estate unlocked for building
5. +20 faction reputation
6. +5% permanent buff to paired weapon

### Why Marriage Is Expensive

- It's the gateway to the estate/children/legacy system
- It requires investment across multiple systems (affection, gold, reputation, quests)
- It should feel like an achievement, not a transaction

---

## 7. Children System

### Unlock Conditions

- Estate Tier 4+ (Estate)
- Marriage complete
- Minimum 10 runs since marriage

### Child Properties

| Property | Details |
|---|---|
| **How many** | 1-3 children per marriage (based on estate tier and affection) |
| **Growth** | 1 child per 10 combat runs (or real-time equivalent) |
| **Stages** | Infant → Toddler → Child → Teen → Adult |
| **Inheritance** | Children inherit partial stats from both parents |
| **Mythology** | Child inherits mother's mythology (visual + abilities) |

### Child Growth Stages

| Stage | Runs to Reach | Bonus | Choice at Transition |
|---|---|---|---|
| **Infant** | 0 | +5% affection gain with parent | None |
| **Toddler** | 10 | +10% material output from estate | None |
| **Child** | 20 | +1 passive stat (player's choice) | Choose stat: HP, damage, speed |
| **Teen** | 30 | Can be assigned as worker (high efficiency) | Assign role |
| **Adult** | 40 | Becomes companion or manager | Choose path |

### Adult Children

When a child reaches adulthood, the player chooses:

**Path A: Companion**
- Joins the companion pool
- Unique abilities based on mother's mythology
- Stats scale with player level
- Takes a companion slot (1:1 with weapons)

**Path B: Manager**
- Assigns to an estate to automate functions
- Increases material output by 25%
- Generates 1 random quest per 5 runs
- Frees up the player from manual estate management

### Why Children Work

| Design Aspect | Justification |
|---|---|
| **Long-term goal** | 40 runs to raise a child = significant investment |
| **Emotional attachment** | Naming children, choosing their path creates investment |
| **Mechanical benefit** | Adult children are powerful companions/managers |
| **Legacy** | The player's family tree grows across the game |
| **No micromanagement** | Children grow automatically. Player only decides at milestones |

---

## 8. Bloodline & Legacy

### Inheritance System

Children inherit partial stats from both parents:

| Parent | Inheritance |
|---|---|
| **Player** | 30% of base stats (HP, damage, speed) |
| **Mother** | 50% of mythology abilities + 20% of personality traits |

### Bloodline Bonuses

As the player's family grows, passive bonuses accumulate:

| Family Size | Bonus |
|---|---|
| 1 child | +2% all stats |
| 3 children | +5% all stats, 1 bonus skill point |
| 5 children | +8% all stats, 2 bonus skill points |
| 10 children (endgame) | +12% all stats, 3 bonus skill points, unique "Patriarch/Matriarch" title |

### Why Bloodline Matters

- Creates a sense of legacy and progression
- Rewards long-term investment in multiple families
- Provides meaningful end-game bonuses
- Makes the "collect all wives" goal mechanically rewarding

---

## 9. Wife Network

### Mutual Aid System

Wives can help each other during disasters (see `28_disaster_events_spec.md`):

| Network Size | Aid Strength |
|---|---|
| 1 wife | No network (solo) |
| 2 wives | Basic aid (one wife helps another) |
| 3 wives | Full network (all wives coordinate) |

### Network Benefits

| Benefit | Effect |
|---|---|
| **Disaster resolution** | Wives contribute resources to fix problems |
| **Gratitude content** | Wife A thanks wife B for help → unique dialogue |
| **Combined quests** | Multi-wife quests that require cooperation |
| **Reputation boost** | +10 faction reputation per successful network event |

---

## 10. Gaps & Open Questions

**Q1: Can children die or get sick?**
- Option A: No — children are safe
- Option B: Yes — random events can affect children
- **Recommendation:** No death/sickness in v1. Too emotionally heavy for a roguelite.

**Q2: How do children interact with each other?**
- Sibling relationships? Rivalries? Team-ups?
- **Recommendation:** Sibling bonuses only in v1 (+2% stats per sibling). No complex interactions.

**Q3: Can adult children marry other NPCs?**
- Grandchildren system?
- **Recommendation:** Defer to future version. Too complex for v1.

**Q4: What happens if an estate is destroyed by a disaster?**
- Can it be rebuilt? What about the family?
- **Recommendation:** Estates can be rebuilt (50% cost). Family is safe (relocated to town temporarily).

**Q5: Should there be a "family tree" visualization?**
- A visual representation of the player's bloodline
- **Recommendation:** Yes, as a simple tree view in the estate screen. Low priority but adds flavor.

---

*Estate & Bloodline System Spec v0.1.0 — August 26, 2026*
