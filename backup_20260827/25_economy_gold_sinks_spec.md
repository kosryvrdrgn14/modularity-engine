# Economy & Gold Sinks Spec

> **Game Version:** v0.4.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D4 (estates produce materials/quests/unlocks, no gold), D8 (gold from combat + quests + events)
> **Depends On:** `game_frame.md` §5 (City Builder), §11 (Estate System)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Gold Income Sources](#2-gold-income-sources)
3. [Gold Sink Categories](#3-gold-sink-categories)
4. [Sink Balancing](#4-sink-balancing)
5. [Resource Types](#5-resource-types)
6. [Estate Production (No Gold)](#6-estate-production-no-gold)
7. [Economy Timeline](#7-economy-timeline)
8. [Gaps & Open Questions](#8-gaps--open-questions)

---

## 1. Overview

The economy balances three resource types: **gold**, **materials**, and **reputation**. Gold is the primary currency for combat-related purchases. Materials are for building and crafting. Reputation gates content.

### Core Principle

> **Gold funds the player. Materials fund the city. Reputation gates content.**

This separation prevents any single resource from becoming the bottleneck for everything.

---

## 2. Gold Income Sources

Gold comes from three sources only (D8 DECIDED):

### Source 1: Combat Rewards

| Source | Gold Amount | Frequency |
|---|---|---|
| Enemy kills | 1-4 per kill | Every kill |
| Boss kill | 20-30 gold | Once per run |
| Stage completion bonus | 50-100 gold | Once per run |
| 3★ bonus | +50% gold | Once per 3★ clear |

### Source 2: Quest Rewards

| Quest Type | Gold Reward | Frequency |
|---|---|---|
| Main quests | 100-500 gold | One-time |
| Side quests | 50-200 gold | One-time |
| Repeatable quests | 25-75 gold | Unlimited |
| Estate quests | 10-50 gold | Per quest |

### Source 3: Event Rewards

| Event Type | Gold Reward | Frequency |
|---|---|---|
| Random encounters | 25-100 gold | Random |
| Disasters (resolution) | 50-150 gold | When resolved |
| NPC gifts | 10-30 gold | Random |
| Faction milestones | 100-300 gold | Per milestone |

### What Does NOT Give Gold

| Source | Instead Gives |
|---|---|
| Estates | Materials, quests, unlocks (D4) |
| Auto-clear farming | Materials (gold only from the original clear) |
| Skill tree | Permanent stat bonuses (no gold) |
| Children | Companion/manager abilities (no gold) |

---

## 3. Gold Sink Categories

Gold is spent in 3 categories:

### Category 1: Combat Boosts

Purchases that help in combat runs.

| Item | Cost | Effect | Unlock |
|---|---|---|---|
| Health Potion | 25g | Restore 25 HP mid-run | Start |
| Damage Boost | 50g | +20% damage for 30s | Town Level 2 |
| Speed Boost | 50g | +30% move speed for 30s | Town Level 2 |
| Shield Orb | 75g | Block 1 hit | Town Level 3 |
| Revive Token | 200g | Revive once per run (50% HP) | Town Level 4 |

### Category 2: Wife/Companion Gifts

Gifts that increase affection with NPCs.

| Gift | Cost | Affection | Available At |
|---|---|---|---|
| Wildflowers | 10g | +1 | Market |
| Homemade Meal | 25g | +2 | Tavern |
| Rare Gem | 75g | +3 | Blacksmith |
| Ancient Tome | 100g | +4 | Library |
| Legendary Artifact | 250g | +5 | Faction Shop |

### Category 3: Town Management & Productivity Boosts

Purchases for town growth, automation, and **productivity boosts**.

**Core Rule:** Gold can boost the output or progress of certain city/estate functions. This creates a gold sink that feels useful, not punitive.

| Item | Cost | Effect | Unlock |
|---|---|---|---|
| Hire Worker | 100g | +1 worker | Shelter Lv1 |
| Hire Manager | 300-500g | Automate town functions | Town Level 3 |
| Speed Build | 150g | Instant building completion | Town Level 2 |
| Extra Farming Slot | 200g | +1 auto-clear slot | Town Level 3 |

### Productivity Boosts (Gold → Output)

When quests require large quantities of materials, the player can dump gold into specific NPCs/locations to increase output:

| Boost Target | Cost | Effect | Quest Tie-In |
|---|---|---|---|
| **Merchant's Guild** | 50-200g | +50% material trade output for 3 runs | "Deliver 100 wood to the village" |
| **Blacksmith** | 75-150g | +30% crafting speed for 3 runs | "Forge 50 iron ingots" |
| **Dwarf Miner Estate** | 100-250g | +40% ore output for 3 runs | "Mine 80 ore for the wall" |
| **Herb Garden** | 50-100g | +60% herb output for 3 runs | "Gather 60 herbs for the chapel" |

**Why productivity boosts work:**
- Gold feels useful (not just hoarded)
- Quests with large material requirements become solvable faster
- Player chooses which quests to accelerate (not forced)
- Boosts are temporary (3 runs) — not permanent upgrades

### Quest-Driven Gold Sink Frequency

The frequency of large-material quests scales with the player's gold:

| Gold Held | Quest Frequency | Rationale |
|---|---|---|
| < 500g | 1 quest per 10 runs | Low gold = small quests |
| 500-2000g | 1 quest per 5 runs | Moderate gold = moderate quests |
| 2000-5000g | 1 quest per 3 runs | High gold = large quests |
| > 5000g | 1 quest per 2 runs | Surplus gold = frequent large quests |

This ensures there's always a gold sink available when the player is loaded, but it's never forced — the player can ignore the quests if they prefer to save.

---

## 4. Sink Balancing

### The 3-Sink Rule

At any point in the game, at least 1 of the 3 sink categories should be relevant:

| Game Stage | Active Sinks | Why |
|---|---|---|
| **Early** (Runs 1-5) | Combat Boosts, Gifts | Cheap, immediate value |
| **Mid** (Runs 6-20) | All 3 | Workers, managers, gifts, boosts |
| **Late** (Runs 20+) | Gifts, Managers | Combat boosts less needed, gifts for multiple wives |

### Gold Drain Rate

| Phase | Gold Income/Run | Gold Drain/Run | Net |
|---|---|---|---|
| Early | ~100g | ~75g (potions, gifts) | +25g (saving) |
| Mid | ~200g | ~180g (workers, gifts, boosts) | +20g (slow save) |
| Late | ~300g | ~280g (managers, rare gifts) | +20g (minimal save) |

**Design intent:** Players always have enough gold for 1-2 purchases per run, but never enough for everything. This creates meaningful choices.

### Why This Balance Works

| Problem | How It's Solved |
|---|---|
| Gold inflation | 3 sink categories absorb gold at different rates |
| Gold becomes meaningless | Late-game sinks (managers, rare gifts) cost 300-500g |
| Gold is too scarce | Early sinks are cheap (10-75g), always affordable |
| One sink dominates | 3 categories ensure variety — combat, social, management |

---

## 5. Resource Types

### Gold

- **Earned from:** Combat, quests, events
- **Spent on:** Combat boosts, gifts, town management
- **Never earned from:** Estates (D4)
- **Storage:** Unlimited

### Materials

- **Earned from:** Estates (auto-generated), worker assignments, quest rewards
- **Spent on:** Building construction, equipment crafting, estate upgrades
- **Never earned from:** Gold conversion (no gold→material shop)
- **Storage:** Capped per type (50-200 depending on type)

### Reputation

- **Earned from:** Quest completion, NPC trust milestones, faction events
- **Spent on:** Content gates (unlocks), faction shop access, story progression
- **Never earned from:** Gold or material conversion
- **Storage:** Per-faction (-100 to +100)

### Resource Flow Diagram

```
COMBAT ──► Gold ──► Combat Boosts
         │       ──► Gifts (Affection)
         │       ──► Town Management
         │
         ├──► Materials (from estates/workers)
         │       ──► Building Construction
         │       ──► Equipment Crafting
         │       ──► Estate Upgrades
         │
         └──► Reputation (from quests/NPCs)
                 ──► Content Unlocks
                 ──► Faction Shop Access
                 ──► Story Progression
```

---

## 6. Estate Production (No Gold)

Estates produce materials, quests, and unlocks — never gold (D4 DECIDED).

### Estate Output by Tier

| Tier | Materials/Run | Quests | Unlocks |
|---|---|---|---|
| 1 (Homestead) | 1-2 basic | None | None |
| 2 (Farmstead) | 3-5 basic | 1 per 5 runs | None |
| 3 (Manor) | 8-12 mixed | 1 per 3 runs | 1 unique item |
| 4 (Estate) | 15-20 all types | 1 per 2 runs | 2 items + ability |
| 5 (Dynasty) | 25-30 all + rare | 1 per run | Full quest chain |

### Why No Gold From Estates

| Reason | Justification |
|---|---|
| **Gold inflation** | Estates generating gold would make combat gold meaningless |
| **Equipment balance** | Gold should come from active play, not passive income |
| **Estate identity** | Estates are about family/content, not money printing |
| **Player focus** | Gold stays focused on combat boosts, gifts, and management |

---

## 7. Economy Timeline

### Early Game (Runs 1-5)

```
Gold: 0 → ~500 (saving for first buildings)
Sinks: Potions (25g), Wildflowers (10g), First worker (100g)
Focus: Building Campfire, Blacksmith, Market
Materials: None yet (no estates)
```

### Mid Game (Runs 6-20)

```
Gold: ~500 → ~2000 (fluctuating)
Sinks: All 3 categories active
Focus: Town expansion, NPC relationships, faction quests
Materials: Starting to accumulate from Tier 1-2 estates
```

### Late Game (Runs 20+)

```
Gold: ~2000 → ~5000 (slowly growing)
Sinks: Managers (300-500g), Rare gifts (100-250g), Boosts (50-75g)
Focus: Marriage, estate upgrades, children, faction endings
Materials: Abundant from Tier 3-5 estates
```

---

## 8. Gaps & Open Questions

**Q1: Should there be a gold cap?**
- Option A: No cap — hoarding is a valid strategy
- Option B: Soft cap at 10,000g — diminishing returns on interest
- **Recommendation:** No cap. Let players hoard if they want. The sink system drains gold naturally.

**Q2: Can gold be converted to materials?**
- Option A: No — materials come only from estates/workers
- Option B: Yes — at the Market (expensive conversion rate)
- **Recommendation:** No conversion. Keeps resource types distinct.

**Q3: Should combat boost items be consumable or permanent?**
- Currently: Consumable (single-use per run)
- Option B: Permanent unlock (buy once, use anytime)
- **Recommendation:** Consumable for basic boosts, permanent for late-game items (Revive Token).

**Q4: How should the economy handle multiple wives?**
- 3 wives = 3 estates = 3 sets of material production
- Player needs gold for gifts to all 3
- **Recommendation:** Gift costs scale with wife count. 2nd wife gifts cost 1.2×, 3rd wife 1.5×. Prevents trivializing affection.

---

*Economy & Gold Sinks Spec v0.1.0 — August 26, 2026*


---
*See `31_grand_bazaar_spec.md` for the full shop item catalog and pricing.*
