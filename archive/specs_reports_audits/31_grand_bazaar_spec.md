# Grand Bazaar — Shop System Spec

> **Game Version:** v0.7.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D3 (stage tiers), D5 (1:1 binding), D8 (gold from combat/quests/events)
> **Depends On:** `25_economy_gold_sinks_spec.md`, `23_auto_clear_farming_spec.md`, `20_companion_combat_spec.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Shop Structure](#2-shop-structure)
3. [Tab 1: Combat Consumables](#3-tab-1-combat-consumables)
4. [Tab 2: Companion & Adventurer Upgrades](#4-tab-2-companion--adventurer-upgrades)
5. [Tab 3: Estate & Productivity](#5-tab-3-estate--productivity)
6. [Tab 4: Gifts & Romance](#6-tab-4-gifts--romance)
7. [Price Tiers](#7-price-tiers)
8. [Shop Escalation](#8-shop-escalation)
9. [UI Design](#9-ui-design)
10. [Gaps & Open Questions](#10-gaps--open-questions)

---

## 1. Overview

The Grand Bazaar is the game's single shop, accessible from the town screen via the bottom action bar (🛒 Shop). It sells items across 4 tabs, with prices scaled to our economy.

### Why One Shop

- Simple to implement and navigate
- All gold sinks in one place
- Player learns one interface
- Easy to expand with new tabs later

### Economy Context

| Metric | Value |
|---|---|
| Average gold/run | ~209g |
| Gold at run 50 | ~6,595g (surplus) |
| Target surplus | 2,000-3,000g |
| Shop should absorb | ~100-200g per run |

---

## 2. Shop Structure

### 4 Tabs

| Tab | Icon | Purpose | Price Range |
|---|---|---|---|
| **Combat Consumables** | ⚔️ | Single-use items for combat runs | 25-500g |
| **Companion & Adventurer** | 🐕 | Upgrade hired adventurers, buy companion items | 100-2,000g |
| **Estate & Productivity** | 🏗️ | Boost estate output, speed up quests | 75-3,000g |
| **Gifts & Romance** | 💝 | NPC gifts, date items, romance progression | 50-5,000g |

### Dynamic Availability

Items unlock based on town level:

| Town Level | Items Available |
|---|---|
| 1 (Camp) | Cheap + some Moderate |
| 2 (Village) | All Moderate |
| 3 (Town) | All Moderate + Expensive |
| 4 (City) | All except Legendary |
| 5 (Capital) | All items including Legendary |

---

## 3. Tab 1: Combat Consumables

Single-use items the player can buy and use in combat runs.

| Item | Price | Effect | Duration | Unlock |
|---|---|---|---|---|
| **Health Potion** | 25g | Restore 25 HP | Instant | Start |
| **Mana Crystal** | 50g | Reduce all cooldowns by 20% | 15s | Town Lv2 |
| **Damage Charm** | 75g | +25% damage | 30s | Town Lv2 |
| **Speed Tonic** | 75g | +30% move speed | 30s | Town Lv2 |
| **Shield Orb** | 150g | Block 1 hit | Until hit | Town Lv3 |
| **Revive Token** | 500g | Revive once at 50% HP | Per run | Town Lv4 |
| **Boss Bane Scroll** | 300g | +50% damage to bosses | 10s | Town Lv3 |

### Why Consumables Work

- **Gold sink** — player spends gold every run if they choose
- **Skill ceiling** — good players don't need them, casual players appreciate them
- **Boss help** — Revive Token and Boss Bane help struggling players
- **Not required** — game is completable without any consumables

---

## 4. Tab 2: Companion & Adventurer Upgrades

Items that improve hired adventurers or provide companion-related benefits.

| Item | Price | Effect | Unlock |
|---|---|---|---|
| **Adventurer Training Manual** | 100g | Upgrade 1 Recruit → Veteran | Town Lv2 |
| **Veteran Promotion** | 300g | Upgrade 1 Veteran → Elite | Town Lv3 |
| **Adventurer Equipment Set** | 500g | +15% adventurer damage | Town Lv3 |
| **Companion Treat** | 75g | +3 affection with assigned companion | Start |
| **Companion Training** | 200g | +1 level to assigned companion (cap: weapon level) | Town Lv3 |
| **Adventurer Contract Extension** | 150g | Adventurer works for 5 runs instead of 1 | Town Lv2 |

### Why This Tab

- **Adventurer progression** — players can improve their farming efficiency
- **Companion affection** — gifts that work during combat (not just town visits)
- **Gold sink** — recurring costs for adventurer maintenance

---

## 5. Tab 3: Estate & Productivity

Items that boost estate output or speed up quest progress.

| Item | Price | Effect | Duration | Unlock |
|---|---|---|---|---|
| **Fertilizer** | 75g | +50% herb output | 3 runs | Town Lv1 |
| **Mining Boost** | 100g | +40% ore output | 3 runs | Town Lv2 |
| **Lumber Supply** | 75g | +50% wood output | 3 runs | Town Lv1 |
| **Mason's Hammer** | 150g | +30% stone output | 3 runs | Town Lv2 |
| **Merchant's Favor** | 200g | +50% trade output | 3 runs | Town Lv3 |
| **Blacksmith's Fuel** | 175g | +30% crafting speed | 3 runs | Town Lv3 |
| **Building Permit** | 500g | Skip 1 build wait | Instant | Town Lv2 |
| **Worker Hiring Fee** | 100g | +1 worker (permanent) | Permanent | Town Lv1 |

### Why This Tab

- **Quest acceleration** — helps complete large material quests faster
- **Estate growth** — speeds up resource gathering
- **Gold sink** — recurring costs that scale with estate count
- **Not mandatory** — player can gather materials naturally

---

## 6. Tab 4: Gifts & Romance

Items that increase NPC affection or enable romance events.

| Item | Price | Affection | NPC Preference | Unlock |
|---|---|---|---|---|
| **Wildflowers** | 50g | +1 | Neutral (all NPCs) | Start |
| **Fine Wine** | 150g | +2 | Liked (social NPCs) | Town Lv2 |
| **Rare Gem** | 300g | +3 | Loved (material NPCs) | Town Lv3 |
| **Ancient Tome** | 500g | +4 | Loved (scholar NPCs) | Town Lv3 |
| **Handcrafted Gift** | 200g | +3 | Loved (craft NPCs) | Town Lv2 |
| **Festival Lantern** | 100g | +2 | Liked (all NPCs) | Town Lv2 |
| **Legendary Artifact** | 2,000g | +5 | Loved (all NPCs) | Town Lv4 |
| **Engagement Bouquet** | 3,000g | +10 | Required for marriage | Town Lv5 |

### Why This Tab

- **Gold sink** — gifts are the primary romance gold drain
- **Choice** — player decides which NPC to invest in
- **NPC preferences** — encourages learning personalities
- **Marriage gate** — Engagement Bouquet is required for marriage (additional cost beyond estate)

### NPC Gift Preferences

Each NPC has preferences that affect affection gain:

| Preference | Multiplier | Examples |
|---|---|---|
| **Loved** | 2× | Specific items per NPC |
| **Liked** | 1× | Category-based (social, craft, scholar) |
| **Neutral** | 0.5× | Wildflowers (universal) |
| **Disliked** | 0× | No gain, no loss |

---

## 7. Price Tiers

Scaled to our economy (~209g/run average income):

| Tier | Price Range | Runs to Afford | Items |
|---|---|---|---|
| **Cheap** | 25-100g | 0.1-0.5 | Health Potion, Wildflowers, Fertilizer |
| **Moderate** | 150-500g | 1-2.5 | Consumables, Gifts, Adventurer Upgrades |
| **Expensive** | 750-2,000g | 3.5-10 | Equipment, Rare Gifts, Estate Boosts |
| **Premium** | 3,000-6,000g | 14-30 | Legendary Items, Marriage Requirements |
| **Legendary** | 8,000-15,000g | 40-70 | Endgame items, Sandbox Exclusives |

### Why This Scale

- **Early game:** Player buys cheap consumables and basic gifts
- **Mid game:** Player invests in adventurer upgrades and estate boosts
- **Late game:** Player saves for premium gifts and legendary items
- **Endgame:** Legendary items provide long-term gold sink

---

## 8. Shop Escalation

Items unlock based on town level, preventing new players from being overwhelmed.

### Unlock Schedule

| Town Level | Unlocked Tiers | Example Items |
|---|---|---|
| **1 (Camp)** | Cheap only | Health Potion, Wildflowers, Fertilizer |
| **2 (Village)** | Cheap + Moderate | Consumables, Basic Gifts, Worker Hiring |
| **3 (Town)** | + Expensive | Equipment, Rare Gifts, Estate Boosts |
| **4 (City)** | + Premium | Legendary Items, Advanced Gear |
| **5 (Capital)** | + Legendary | Endgame items, Marriage Bouquet |

### Why Escalation

- Prevents information overload for new players
- Creates "unlock moments" as town grows
- Matches item power to player progression
- Late-game items feel special (locked behind town level)

---

## 9. UI Design

### Shop Screen

```
┌─────────────────────────────────────────────────┐
│  🛍 Grand Bazaar                    💰 1,250g   │
├─────────────────────────────────────────────────┤
│  [⚔️ Combat] [🐕 Companions] [🏗️ Estate] [💝 Gifts] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚔️ Health Potion              25g    [Buy]     │
│  Restore 25 HP instantly                       │
│                                                 │
│  🛡 Shield Orb                150g    [Buy]     │
│  Block 1 hit. Lasts until triggered.           │
│                                                 │
│  🔥 Boss Bane Scroll          300g    [Buy]     │
│  +50% damage to bosses for 10s.               │
│                                                 │
│  🔒 Revive Token              500g    [Locked]  │
│  Unlock at Town Level 4                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Item Card Layout

```
┌─────────────────────────────────────┐
│  🛡 Shield Orb          💰 150g    │
│  Block 1 hit. Lasts until triggered.│
│  Duration: Until hit                │
│  Unlock: Town Level 3              │
│                         [Buy] [Info]│
└─────────────────────────────────────┘
```

### Buy Confirmation

```
┌─────────────────────────────────────────────────┐
│  Buy Shield Orb?                                │
│                                                 │
│  Cost: 150g                                     │
│  Your gold: 1,250g → 1,100g                     │
│                                                 │
│  [Confirm]  [Cancel]                            │
└─────────────────────────────────────────────────┘
```

---

## 10. Gaps & Open Questions

**Q1: Should items be consumable or permanent?**
- Consumables: Health Potion, Shield Orb, Buffs
- Permanent: Equipment, Adventurer Upgrades, Worker Hiring
- **Recommendation:** Mix of both. Consumables for combat, permanent for town.

**Q2: Should there be a "Buy Multiple" option?**
- For cheap items like Health Potions
- **Recommendation:** Yes, for items under 100g. Quantity selector (1/5/10).

**Q3: Should the shop have a "Favorites" or "Recent" tab?**
- **Recommendation:** Yes, a "Recently Bought" section at the top for quick re-buy.

**Q4: Should prices scale with town level?**
- Same item costs more at higher town levels?
- **Recommendation:** No. Fixed prices. Town level gates availability, not price.

**Q5: Should there be sales or discounts?**
- Random items on sale for 1-2 runs
- **Recommendation:** Defer to future version. Adds complexity without much benefit.

---

*Grand Bazaar Shop System Spec v0.1.0 — August 26, 2026*
