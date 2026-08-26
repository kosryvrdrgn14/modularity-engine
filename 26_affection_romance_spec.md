# Affection & Romance System Spec

> **Game Version:** v0.4.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D1 (3 companion slots), D2 (invulnerable), D5 (1:1 binding), D6 (mythology-based factions)
> **Depends On:** `game_frame.md` §6 (NPC System), §11 (Estate System), `dialogue_template.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [NPC Roster Structure](#2-npc-roster-structure)
3. [Affection Tier Chain](#3-affection-tier-chain)
4. [Affection Gain Methods](#4-affection-gain-methods)
5. [Gift System](#5-gift-system)
6. [Date System (VN Interface)](#6-date-system-vn-interface)
7. [Marriage Requirements](#7-marriage-requirements)
8. [Companion Integration](#8-companion-integration)
9. [Content Pacing](#9-content-pacing)
10. [Gaps & Open Questions](#10-gaps--open-questions)

---

## 1. Overview

The affection system creates long-term relationships with NPCs. It rewards repeated interaction, gift-giving, and shared combat experiences. The ultimate payoff is marriage, estate building, and family creation.

### Design Philosophy

| Principle | Why |
|---|---|
| **Multiple wives** | Players can pursue multiple NPCs — encourages collecting and variety |
| **Mythology-based roster** | 50-55 NPCs from different mythologies — diverse personalities and stories |
| **Tier-based progression** | Clear milestones (Interest → Respect → Trust → Claim) prevent aimless grinding |
| **Self-contained estates** | Each wife's estate pays for itself — no gold drain on the player |
| **Content reuse** | Objectives and dialogue patterns shared across arcs — manageable content volume |

---

## 2. NPC Roster Structure

### Roster Size

- **Total NPCs:** 50-55 (expandable via DLC/updates)
- **Datable NPCs:** ~30-35 (subset with romance paths)
- **Non-datable NPCs:** ~15-20 (quest givers, shopkeepers, faction leaders)

### Tier Distribution

| Tier | Count | Description | Romance Complexity |
|---|---|---|---|
| **Tier 1 (Common)** | ~20 | Simple personalities, easy to woo | 2-step affection chain |
| **Tier 2 (Uncommon)** | ~10 | Deeper stories, harder to impress | 3-step affection chain |
| **Tier 3 (Rare)** | ~5 | Complex characters, multi-faction ties | 4-step affection chain |

### Mythology Categories

| Mythology | Example NPCs | Faction |
|---|---|---|
| Greek | Athena, Artemis, Persephone | Olympus Guard |
| Norse | Freya, Hel, Sif | Valkyrie Circle |
| Egyptian | Isis, Bastet, Sekhmet | Desert Covenant |
| Japanese | Amaterasu, Tsukuyomi, Benzaiten | Shrine Keepers |
| Celtic | Morrigan, Brigid, Danu | Green Circle |
| Hindu | Lakshmi, Kali, Saraswati | Temple Alliance |
| Aztec | Xochiquetzal, Itzpapalotl, Coatlicue | Jaguar Order |
| Slavic | Baba Yaga, Mokosh, Melanina | Frost Court |
| Mesopotamian | Inanna, Ereshkigal, Tiamat | Star Keepers |

### Why Mythology-Based

- **Rich source material** — thousands of years of stories, personalities, aesthetics
- **Natural faction alignment** — each mythology maps to a faction
- **Visual variety** — different cultures = different character designs
- **Player engagement** — "I want to date the Norse goddess" is a strong hook

---

## 3. Affection Tier Chain

### The 4-Step Chain

```
Interest → Respect → Trust → Claim
  (Tier 1)   (Tier 1-2)  (Tier 2-3)  (Tier 3)
```

### Tier Details

| Tier | Name | Affection Points | How to Reach | What Unlocks |
|---|---|---|---|---|
| 0 | Stranger | 0 | Default | Basic dialogue |
| 1 | Interest | 10-20 | Gift-giving, small quests | Personal dialogue, gift responses |
| 2 | Respect | 30-50 | Combat companionship, medium quests | Deep dialogue, date eligibility (Tier 1 NPCs) |
| 3 | Trust | 60-80 | Long quests, estate visits | Full dialogue, marriage eligibility (Tier 2 NPCs) |
| 4 | Claim | 90-100 | Marriage quest chain, estate completion | Marriage, family, legacy (Tier 3 NPCs) |

### Tier Shortcuts

| NPC Tier | Steps Required | Rationale |
|---|---|---|
| Tier 1 (Common) | 2 steps (Interest → Claim) | Simple personalities, fast payoff |
| Tier 2 (Uncommon) | 3 steps (Interest → Trust → Claim) | Moderate complexity |
| Tier 3 (Rare) | 4 steps (full chain) | Deep stories, maximum reward |

### Why Tier Shortcuts

- Tier 1 NPCs are abundant (~20) — full 4-step chains would be overwhelming
- Tier 3 NPCs are rare (~5) — they deserve the full journey
- Players can marry multiple Tier 1 NPCs quickly, then invest in Tier 2/3 for deeper stories

---

## 4. Affection Gain Methods

### Primary Methods

| Method | Affection | Frequency | Notes |
|---|---|---|---|
| **Gift giving** | +1 to +5 | Once per visit | Based on gift quality and NPC preference |
| **Dialogue choices** | +1 to +2 | Per conversation | Right answer = gain, wrong = no change (never lose) |
| **Combat companionship** | +2 | Per run | NPC gains trust by "seeing you in action" |
| **Quest completion** | +3 to +5 | Per quest | NPC-specific quests have bigger impact |
| **Estate visits** | +1 | Per visit | Showing you care about their home |
| **Date events** | +5 to +10 | Unlockable | VN-style scenes at high affection |

### Affection Multipliers

| Condition | Multiplier | Rationale |
|---|---|---|
| NPC is "dead weight" companion | 3× | Bringing weak NPCs = deliberate social cost |
| NPC has active quest | 2× | Focused interaction = faster bond |
| First time meeting | 1.5× | First impressions matter |
| Daily gift limit | 3 gifts max | Prevents hoarding-based grinding |

### Why These Methods

| Method | Design Purpose |
|---|---|
| Gifts | Gold sink + choice (which NPC to invest in?) |
| Dialogue | Story engagement + personality discovery |
| Combat | Ties affection to gameplay (not just town visits) |
| Quests | Narrative progression + meaningful rewards |
| Estates | Shows long-term commitment |
| Dates | Emotional payoff for high investment |

---

## 5. Gift System

### Gift Categories

| Category | Cost | Affection | Available At | Example |
|---|---|---|---|---|
| **Basic** | 10-25g | +1 | Market | Wildflowers, Homemade Meal |
| **Quality** | 50-75g | +2-3 | Blacksmith, Tavern | Rare Gem, Fine Wine |
| **Luxury** | 100-250g | +4-5 | Faction Shop, Library | Ancient Tome, Legendary Artifact |
| **Personal** | Quest reward | +3-6 | Quest completion | NPC's lost item, handcrafted gift |

### NPC Gift Preferences

Each NPC has preferred gift categories:

```json
{
  "id": "freya",
  "name": "Freya",
  "giftPreferences": {
    "loved": ["luxury", "personal"],
    "liked": ["quality"],
    "neutral": ["basic"],
    "disliked": []
  }
}
```

- **Loved:** 2× affection bonus
- **Liked:** 1× affection (standard)
- **Neutral:** 0.5× affection (still works, just less effective)
- **Disliked:** 0× affection (no gain, no loss — NPC is polite about it)

### Gift Response Dialogue

Each NPC has unique dialogue for receiving gifts:

```
Loved gift: "Oh! You remembered! This is... exactly what I wanted."
Liked gift: "Thank you. This is very thoughtful of you."
Neutral gift: "How nice. Thank you."
```

---

## 6. Date System (VN Interface)

### When Dates Unlock

| NPC Tier | Date Unlocks At | Date Type |
|---|---|---|
| Tier 1 | Respect (Tier 2) | Simple outdoor date |
| Tier 2 | Trust (Tier 3) | Activity-based date |
| Tier 3 | Trust (Tier 3) | Full VN scene with choices |

### Date Structure

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ┌──────────┐                                  │
│   │ PORTRAIT │   Freya                          │
│   │ (animated)│   "The sunset is beautiful       │
│   │          │    today, isn't it?"              │
│   └──────────┘                                  │
│                                                 │
│   ┌────────────────────────────────────────┐    │
│   │ ► "It's even more beautiful with you." │    │
│   │ ► "Yeah, nice weather."                │    │
│   │ ► "I'm more interested in dinner."     │    │
│   └────────────────────────────────────────┘    │
│                                                 │
│              [1]  [2]  [3]                      │
└─────────────────────────────────────────────────┘
```

### Date Choices Impact

| Choice | Affection | Notes |
|---|---|---|
| **Romantic** | +3-5 | Highest affection, requires knowing NPC's personality |
| **Friendly** | +1-2 | Safe choice, always works |
| **Neutral** | +0 | No gain, no loss |
| **Wrong** | -1 | Rare, only for clearly insensitive choices |

### Why VN-Style Dates

- **Emotional investment** — reading dialogue and making choices creates attachment
- **Personality discovery** — dates reveal NPC backstories and quirks
- **Replayability** — different choices lead to different outcomes
- **Low art cost** — static portraits + text, no animation needed

---

## 7. Marriage Requirements

To marry an NPC, the player must satisfy **all** requirements:

### Requirements

| Requirement | Tier 1 NPC | Tier 2 NPC | Tier 3 NPC |
|---|---|---|---|
| **Affection Level** | Claim (4) | Claim (4) | Claim (4) |
| **Estate Tier** | Tier 2+ | Tier 3+ | Tier 4+ |
| **Marriage Quest** | Simple (1 step) | Medium (2 steps) | Complex (3 steps) |
| **Faction Reputation** | Friendly | Honored | Revered |
| **Town Population** | 10+ | 15+ | 20+ |

### Marriage Quest Examples

**Tier 1 NPC (Simple):**
```
"A Small Ceremony"
→ Gather 20 flowers from the Forest
→ Talk to the Elder for blessing
→ Return to NPC
```

**Tier 3 NPC (Complex):**
```
"The Goddess's Trial"
→ Complete 3 faction quests for her mythology
→ Defeat a special boss encounter
→ Build her a Tier 4 estate
→ Host the ceremony at the estate
```

### Marriage Rewards

| Reward | Effect |
|---|---|
| **Spouse title** | NPC gains "Wife" title in dialogue |
| **Estate access** | Can build and upgrade her estate |
| **Children eligibility** | Estate Tier 4+ unlocks children |
| **Combat buff** | +5% to paired weapon (permanent) |
| **Unique dialogue** | New conversation options |
| **Faction bonus** | +20 reputation with NPC's faction |

---

## 8. Companion Integration

### How Affection Affects Combat

| Affection Tier | Combat Effect |
|---|---|
| Interest | Basic companion (standard stats) |
| Respect | +10% damage, +1 dialogue line per run |
| Trust | +20% damage, +2 dialogue lines, passive aura |
| Claim (married) | +30% damage, +3 dialogue lines, unique ability |

### Companion Slot Binding

Each wife/companion is bound to a weapon slot (D5):

| Slot | Weapon | Companion |
|---|---|---|
| 1 | W1 (Projectile) | C1 — buffs W1 |
| 2 | W2 (Orbit) | C2 — buffs W2 |
| 3 | W3 (Area) | C3 — buffs W3 |

Players choose which 3 of their unlocked companions to deploy per stage.

---

## 9. Content Pacing

### Reuse Strategy

To manage 50-55 NPCs without overwhelming content creation:

| Content Type | Reuse Strategy |
|---|---|
| **Gift responses** | Template-based: 5 response patterns × NPC personality filter |
| **Date scenes** | 10 date templates × NPC-specific dialogue swaps |
| **Quest objectives** | Shared objective types (kill, collect, survive) × NPC-specific flavor |
| **Marriage quests** | 3 tiers × 5 templates per tier = 15 unique structures |
| **Combat dialogue** | 10 trigger types × 3 lines per type × NPC personality |

### Content Volume Estimate

| NPC Tier | Per NPC | × Count | Total |
|---|---|---|---|
| Tier 1 | ~20 dialogue lines, 1 quest chain | × 20 | 400 lines, 20 chains |
| Tier 2 | ~40 dialogue lines, 2 quest chains | × 10 | 400 lines, 20 chains |
| Tier 3 | ~80 dialogue lines, 3 quest chains | × 5 | 400 lines, 15 chains |
| **Total** | | **35 datable** | **1200 lines, 55 chains** |

---

## 10. Gaps & Open Questions

**Q1: Can the player divorce?**
- Option A: No — marriage is permanent
- Option B: Yes — costly (lose affection, reputation, estate)
- **Recommendation:** No divorce in v1. Add later if players request it.

**Q2: How do wives interact with each other?**
- Jealousy system? Shared events? Mutual aid?
- **Recommendation:** Mutual aid only (§11_wife_network). No jealousy in v1 — too complex.

**Q3: Can non-datable NPCs become companions?**
- Currently: Only datable NPCs are companions
- Option B: Any NPC with trust 3+ can be a companion
- **Recommendation:** Only datable NPCs. Keeps the companion system focused.

**Q4: Should affection decay over time?**
- If the player ignores an NPC for many runs, does affection drop?
- **Recommendation:** No decay in v1. Adds anxiety without fun.

**Q5: How many wives can the player have?**
- Currently: Up to 3 (one per companion slot)
- Option B: Unlimited (but 3 companion slots = only 3 in combat)
- **Recommendation:** 3 wives max for v1. Matches companion slots. Expand later.

---

*Affection & Romance System Spec v0.1.0 — August 26, 2026*
