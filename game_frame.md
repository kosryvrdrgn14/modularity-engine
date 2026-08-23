# Modularity Engine — Game Framework

> **Version:** 0.3.0 (Framework Design)
> **Date:** August 23, 2026
> **Status:** Design Document
> **Predecessor:** `extract_engine.html` (combat engine extraction plan)

---

## Table of Contents

1. [Vision & Scope](#1-vision--scope)
2. [Centralized Data Architecture](#2-centralized-data-architecture)
3. [Feature Map](#3-feature-map)
4. [Combat Engine (Feature Module)](#4-combat-engine-feature-module)
5. [City Builder / Town Hub](#5-city-builder--town-hub)
6. [NPC System & Visual Novel Dialogue](#6-npc-system--visual-novel-dialogue)
7. [Faction & Reputation System](#7-faction--reputation-system)
8. [Skill Tree & Permanent Progression](#8-skill-tree--permanent-progression)
9. [Quest System](#9-quest-system)
10. [Unlock System](#10-unlock-system)
11. [Macro Progression & Game Loop](#11-macro-progression--game-loop)
12. [Data Flow Between Systems](#12-data-flow-between-systems)
13. [Content File Architecture](#13-content-file-architecture)
14. [Gaps, Conflicts & Open Questions](#14-gaps-conflicts--open-questions)

---

## 1. Vision & Scope

### What This Game Is

A **survival roguelite RPG** where the player:

- **Fights** in Vampire Survivors-style combat stages (the existing engine)
- **Returns to town** after each run to spend gold, upgrade buildings, and talk to NPCs
- **Builds and upgrades** a persistent town hub that unlocks new features
- **Develops relationships** with NPCs who provide quests, items, dialogue, and abilities
- **Progresses through a skill tree** that permanently enhances the character
- **Earns faction reputation** that gates content and story branches
- **Completes quests** that bridge all systems together

### Why This Architecture

| Design Choice | Why It Works |
|---|---|
| **Centralized save data** | Every feature reads/writes one source of truth. No feature owns player progress — the save file does. This means combat results instantly affect town state, NPC trust, and quest progress without any feature needing to know about the others. |
| **Combat as a feature module** | The combat engine is the most complex system but it's *one game mode*. Making it a module means it loads content, runs a session, and writes results back. It doesn't need to know about NPCs or skill trees — it just reports what happened. |
| **Town as the meta-hub** | The town is the persistent layer between combat runs. It's where gold gets spent, NPCs are found, quests are picked up, and buildings are upgraded. This gives meaning to the gold earned in combat. |
| **NPCs as content gates** | NPCs aren't just flavor — they're the mechanism by which the player unlocks new stages, items, and abilities. Trust levels create a natural progression gate that rewards repeated interaction. |
| **Factions as branching content** | 1-3 factions give the player meaningful choices. Helping one faction might lock out another's quests. This creates replayability and makes the player's choices matter. |
| **Quests as the glue** | Quests are the connective tissue. A quest might say "talk to the Blacksmith, then defeat 50 skeletons, then return." This naturally bridges town exploration, NPC interaction, and combat. |
| **Skill tree for permanence** | Combat is roguelite (you lose upgrades between runs) but the skill tree is permanent. This creates a meta-progression loop: each combat run earns resources that feed permanent growth. |

### Core Game Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                        PERSISTENT LAYER                         │
│                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│   │  TOWN   │◄──►│   NPC   │◄──►│ SKILLS  │◄──►│  QUESTS │   │
│   │  HUB    │    │ SYSTEM  │    │  TREE   │    │ SYSTEM  │   │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘   │
│        │              │              │              │          │
│        └──────────────┴──────┬───────┴──────────────┘          │
│                              │                                  │
│                     ┌────────▼────────┐                         │
│                     │  CENTRAL STORE   │                         │
│                     │  (save_data)     │                         │
│                     └────────┬────────┘                         │
│                              │                                  │
├──────────────────────────────┼──────────────────────────────────┤
│                     EPISODIC LAYER                              │
│                              │                                  │
│                     ┌────────▼────────┐                         │
│                     │ COMBAT ENGINE    │                         │
│                     │ (feature module) │                         │
│                     └─────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**The flow:**
1. Player is in **town** → talks to NPCs, picks up quests, upgrades buildings, spends gold
2. Player enters **stage selection** → picks a stage (unlocked by quests/NPCs/faction)
3. Player enters **combat** → fights enemies, earns gold/XP/items, completes quest objectives
4. Combat ends → results written to **central store**
5. Player returns to **town** → gold is available, quest objectives update, NPC trust may change
6. Repeat

---

## 2. Centralized Data Architecture

### Why Centralized Storage

Every feature in the game needs to read and write player state. If each feature had its own storage:
- Quest system wouldn't know what stage you just completed
- NPC trust wouldn't update when you fulfill a promise
- The skill tree wouldn't know how much gold you earned
- Building upgrades wouldn't know what you've unlocked

**A single save file eliminates all of these cross-feature synchronization problems.** Every feature reads the same data, writes to the same data, and trusts that other features are doing the same.

### Save Data Structure

The entire player state lives in one JSON object:

```json
{
  "version": "0.3.0",
  "meta": {
    "playerName": "Survivor",
    "totalPlayTime": 0,
    "lastSaved": "2026-08-23T00:00:00Z",
    "gameStage": "town"
  },

  "player": {
    "level": 1,
    "xp": 0,
    "xpToNext": 10,
    "hp": 100,
    "maxHp": 100,
    "baseStats": {
      "moveSpeed": 200,
      "armor": 0,
      "pickupRange": 50,
      "critChance": 0,
      "critMultiplier": 1.5,
      "damageMultiplier": 1.0,
      "speedMultiplier": 1.0
    },
    "skillPoints": 0,
    "totalGold": 0,
    "totalKills": 0,
    "totalRuns": 0,
    "bestTime": null
  },

  "combat": {
    "unlockedWeapons": ["w1_projectile"],
    "weaponLevels": {},
    "lastRunStats": null,
    "bestRunStats": null
  },

  "skills": {
    "unlocked": [],
    "skillPoints": 0,
    "totalPointsEarned": 0
  },

  "town": {
    "buildings": {},
    "resources": {
      "gold": 0,
      "wood": 0,
      "stone": 0,
      "herbs": 0
    },
    "upgrades": {}
  },

  "npcs": {
    "met": [],
    "relationships": {},
    "completedDialogues": [],
    "activeRequests": []
  },

  "factions": {
    "wanderers_guild": { "reputation": 0, "rank": "unknown" },
    "shadow_covenant": { "reputation": 0, "rank": "unknown" },
    "forge_brotherhood": { "reputation": 0, "rank": "unknown" }
  },

  "quests": {
    "active": [],
    "completed": [],
    "failed": [],
    "available": []
  },

  "unlocks": {
    "stages": ["stage_graveyard"],
    "items": [],
    "abilities": [],
    "features": ["town_basic", "combat_basic"]
  },

  "inventory": {
    "equipment": {
      "weapon": null,
      "armor": null,
      "accessory": null
    },
    "consumables": [],
    "quest_items": []
  },

  "flags": {}
}
```

### Why This Structure

| Section | Owner Feature | Why It's Here |
|---|---|---|
| `meta` | Core | Session info, save management. Needed by everything. |
| `player` | Core | Base stats that modify all features. Combat uses `baseStats`, town uses `totalGold`. |
| `combat` | Combat Engine | What weapons are unlocked, last run results. Only the combat engine writes to `weaponLevels`. |
| `skills` | Skill Tree | Permanent upgrades. Only the skill tree writes to `unlocked[]`. |
| `town` | City Builder | Buildings, resources, upgrades. Only the city builder writes here. |
| `npcs` | NPC System | Relationship data, dialogue history. Only the NPC system writes here. |
| `factions` | Faction System | Reputation values. Only the faction system writes here. |
| `quests` | Quest System | Active/completed quests. Only the quest system writes here. |
| `unlocks` | Unlock System | What content is available. Multiple features can ADD to these arrays. |
| `inventory` | Combat + Town | Items earned in combat, equipment managed in town. |
| `flags` | Quest + NPC | Arbitrary boolean flags for conditional logic ("met_blacksmith", "saved_village"). |

### Data Access Pattern

```
Feature reads:    store.player.totalGold    → "How much gold do I have?"
Feature writes:   store.town.resources.gold += 100  → "Combat earned gold"

Feature reads:    store.npcs.relationships.blacksmith  → Trust level 3
Feature writes:   store.npcs.relationships.blacksmith += 1  → "Gave gift"

Feature reads:    store.flags.met_blacksmith  → true/false
Feature writes:   store.flags.met_blacksmith = true  → "First conversation done"
```

### Persistence

- **Auto-save** after every state transition (return from combat, complete quest, upgrade building)
- **Manual save** available from pause menu
- **Save format** is JSON — human-readable, debuggable, easy to version
- **Save file location**: browser `localStorage` (for web) or file system (for desktop)
- **Save migration**: version field enables upgrading old saves when schema changes

---

## 3. Feature Map

### All Features and Their Responsibilities

| # | Feature | Module Name | Data Owner | Reads From | Writes To |
|---|---|---|---|---|---|
| 1 | **Core** | `CoreModule` | `meta`, `player` | Everything | `meta`, `player` |
| 2 | **Combat Engine** | `CombatModule` | `combat`, `inventory` | `player`, `skills`, `unlocks`, `inventory` | `combat`, `inventory`, `player.xp` |
| 3 | **City Builder** | `TownModule` | `town` | `player.totalGold`, `unlocks`, `town` | `town`, `unlocks` |
| 4 | **NPC System** | `NPCModule` | `npcs` | `npcs`, `factions`, `quests`, `flags` | `npcs`, `flags` |
| 5 | **Faction System** | `FactionModule` | `factions` | `factions`, `npcs` | `factions`, `unlocks` |
| 6 | **Skill Tree** | `SkillModule` | `skills` | `skills`, `player` | `skills`, `player.baseStats` |
| 7 | **Quest System** | `QuestModule` | `quests` | `quests`, `combat`, `town`, `npcs`, `unlocks` | `quests`, `flags`, `unlocks` |
| 8 | **Unlock System** | `UnlockModule` | `unlocks` | `unlocks` | `unlocks` |
| 9 | **Inventory** | `InventoryModule` | `inventory` | `inventory`, `combat`, `npcs` | `inventory` |

### Why These Are Separate Modules

Each module has a **single responsibility** and owns its own data section. Modules communicate only through the central store — never directly to each other. This means:

- You can debug the NPC system by reading only `save_data.npcs`
- You can test combat by mocking only `save_data.combat` and `save_data.player`
- Adding a new feature (e.g., a crafting system) means adding a new module + data section without touching existing modules

---

## 4. Combat Engine (Feature Module)

### Role in the Framework

The combat engine is **one game mode** — a self-contained module that:
1. **Reads** from the central store: player stats, skill bonuses, unlocked weapons, active quest objectives
2. **Loads** content from external files: characters, weapons, enemies, stages, pickups, audio, mechanics
3. **Runs** the existing game loop: move → auto-attack → kill → collect → level up → repeat
4. **Writes** results back to the central store: gold earned, XP gained, kills counted, items found, quest progress

### What Changes From Current Game

| Current | Framework Version |
|---|---|
| Game starts immediately | Game starts after selecting a stage from the world map |
| One hardcoded stage | Multiple stages loaded from `stages.json`, gated by `unlocks.stages` |
| Gold goes nowhere | Gold writes to `store.town.resources.gold` |
| Stats are per-run only | Base stats from `store.player.baseStats` + skill tree modifiers |
| No quest integration | Active quest objectives tracked during combat (kill counts, time survived, etc.) |
| Game over = restart | Game over = return to town with earned rewards |
| Single character | Multiple characters unlocked via NPCs/quests/factions |

### Combat → Store Interface

```javascript
// When combat session ends:
function onCombatEnd(result) {
  const store = getStore();

  // Gold earned
  store.town.resources.gold += result.goldEarned;
  store.player.totalGold += result.goldEarned;

  // XP earned (applied to persistent level, not just combat level)
  store.player.xp += result.xpEarned;
  // Check for level up → award skill points

  // Kill counts
  store.player.totalKills += result.kills;
  store.player.totalRuns += 1;

  // Quest progress
  questModule.reportProgress('kill_zombie', result.killsByType.zombie || 0);
  questModule.reportProgress('survive_time', result.timeSurvived);
  questModule.reportProgress('earn_gold', result.goldEarned);
  questModule.reportProgress('complete_stage', result.stageCompleted ? result.stageId : null);

  // Items found
  if (result.itemsFound) {
    for (const item of result.itemsFound) {
      store.inventory.consumables.push(item);
    }
  }

  // Best run tracking
  if (!store.combat.bestRunStats || result.timeSurvived > store.combat.bestRunStats.timeSurvived) {
    store.combat.bestRunStats = result;
  }

  // Faction reputation from combat
  if (result.bossDefeated) {
    factionModule.addReputation('wanderers_guild', 10);
  }

  // Save
  saveStore(store);
}
```

### Why Combat Is a Module (Not the Core)

If combat were the core, every other feature would be an "add-on" to combat. But the vision is a **RPG with combat**, not a **combat game with RPG elements**. The town, NPCs, and story are equal partners. Making combat a module means:

- The game can boot into the town directly (not a combat screen)
- Combat can be skipped if the player wants to focus on town/NPC content
- New game modes (dungeon crawls, boss rushes, etc.) can be added as new modules alongside combat

---

## 5. City Builder / Town Hub

### Why a Town Hub

Gold earned in combat needs a **sink** — a place to spend it that creates meaningful choices. A town with upgradeable buildings gives the player:
- **Short-term goals**: "I need 50 more gold to upgrade the Blacksmith"
- **Long-term goals**: "I need to build the Library to unlock the skill tree"
- **Visual feedback**: The town grows and changes as you upgrade it
- **Feature gating**: Buildings unlock features (the Library unlocks skills, the Tavern unlocks faction quests)

### Building Types

| Building | Cost (Gold) | Unlocks | Upgrade Path |
|---|---|---|---|
| **Campfire** | Free (starting) | Basic town, rest (heal) | Lv2: +10% gold from combat. Lv3: +20% gold. Lv5: Gold magnet. |
| **Blacksmith** | 200 | Weapon upgrades between runs, equipment crafting | Lv2: Weapon enchanting. Lv3: Armor crafting. Lv5: Legendary recipes. |
| **Tavern** | 150 | NPC recruitment, faction quest givers | Lv2: Bonus NPC visitors. Lv3: Rare NPCs. Lv5: Tavern stories (lore). |
| **Market** | 100 | Buy consumables, sell items, trade resources | Lv2: Bulk discounts. Lv3: Rare items. Lv5: Export goods for gold. |
| **Library** | 300 | Skill tree access, spell research | Lv2: +1 skill point per level. Lv3: Skill respec. Lv5: Ultimate skills. |
| **Farm** | 120 | Passive resource generation (herbs, wood) | Lv2: +50% yield. Lv3: New crop types. Lv5: Auto-harvest. |
| **Quarry** | 120 | Passive resource generation (stone, ore) | Lv2: +50% yield. Lv3: Rare minerals. Lv5: Auto-mining. |
| **Chapel** | 250 | Faction reputation bonuses, blessing buffs | Lv2: Choose a faction for bonus. Lv3: Cross-faction peace. Lv5: Divine abilities. |
| **Arena** | 400 | Challenge modes, practice combat, leaderboard | Lv2: Time trials. Lv3: Endless mode. Lv5: Spectator mode. |
| **Watchtower** | 350 | World map, stage selection, scouting | Lv2: See enemy types before entering. Lv3: Weather effects. Lv5: Aerial view. |

### Why These Buildings

| Building | Justification |
|---|---|
| **Campfire** | Gives the player an immediate "home" with no cost. Upgrades provide passive bonuses that make future gold-earning easier (compounding progression). |
| **Blacksmith** | The primary gold sink for combat-focused players. Weapon upgrades between runs bridge the roguelite (lose upgrades) and RPG (keep progression) loops. |
| **Tavern** | The NPC hub. Without it, NPCs have nowhere to congregate. The upgrade path controls NPC variety and availability. |
| **Market** | Provides the economy loop. Buy low, sell high. Consumables from the market can be taken into combat (providing tactical depth). |
| **Library** | The skill tree needs a physical home in the game world. The Library makes skills feel like a learned ability, not just a menu. |
| **Farm + Quarry** | Resource generators that provide passive income. These give the player something to check on when they return to town — creating a "return loop" (farm needs harvesting). |
| **Chapel** | Faction reputation bonuses give the Chapel strategic importance. Choosing which faction to bless creates meaningful choices. |
| **Arena** | Practice mode and challenges. Lets players test builds without risking a real run. Also provides leaderboards for competitive motivation. |
| **Watchtower** | World map access. The more you upgrade it, the more information you get about stages before entering. |

### Resource Economy

```
COMBAT                          TOWN
─────────                       ─────
Kill enemies  →  Gold           Gold  →  Buy buildings
Kill enemies  →  XP             Gold  →  Buy consumables
Find items    →  Inventory      Herbs →  Potions (blacksmith)
Boss kills    →  Reputation     Stone →  Building materials
Time survived →  Quest progress Wood  →  Building materials
                                      
         ◄──── Gold flows TO town
         ────► Items flow TO combat (consumables, equipment)
```

### Town View Design

The town is a **static screen** with clickable buildings. Not a real-time simulation. When the player clicks a building:
- The building's menu opens (upgrade options, NPC list, shop inventory, etc.)
- The player interacts with the building's UI
- Changes are written to the central store

This is simpler than a real city builder but provides the same loop of **earn → spend → upgrade → unlock**.

---

## 6. NPC System & Visual Novel Dialogue

### Why NPCs Are the Story Engine

The combat engine tells a story through gameplay (surviving, getting stronger). But it can't tell a story through **characters, dialogue, or relationships**. NPCs fill this gap by:

- Providing **personality** to the town (the Blacksmith is gruff but fair, the Herbalist is kind)
- Creating **emotional stakes** (helping an NPC feels good, betraying them feels bad)
- **Gating content** behind relationships (the Blacksmith won't craft legendary items until trust is high enough)
- Driving **quest chains** (the Herbalist asks you to gather herbs, then introduces you to the Chapel)

### NPC Definition

```json
{
  "id": "blacksmith",
  "name": "Gareth Ironhand",
  "title": "Master Blacksmith",
  "faction": "forge_brotherhood",
  "portrait": "assets/npcs/gareth_portrait.svg",
  "greeting": "Another survivor. You look like you could use a sharper blade.",
  "personality": "gruff",
  "trustLevels": {
    0: { "name": "Stranger", "description": "Doesn't know you yet" },
    1: { "name": "Acquaintance", "description": "Recognizes your face" },
    2: { "name": "Customer", "description": "Does business with you" },
    3: { "name": "Friend", "description": "Trusts you with his best work" },
    4: { "name": "Brother-in-Arms", "description": "Fought alongside you" },
    5: { "name": "Sworn Ally", "description": "Would die for you" }
  },
  "dialogue": {
    "greetings": {
      "default": "What do you need?",
      "trust_1": "Back again? I suppose you're not terrible.",
      "trust_3": "Ah, my favorite customer! Let me show you something special.",
      "trust_5": "For you? I'll melt down my own armor. Anything."
    },
    "requests": [
      {
        "id": "gb_fetch_iron",
        "text": "I need iron ore. The quarry has plenty, if you're willing to get your hands dirty.",
        "type": "fetch",
        "objective": { "resource": "stone", "amount": 10 },
        "trustRequired": 1,
        "rewards": {
          "trust": 1,
          "reputation": { "forge_brotherhood": 5 },
          "item": "iron_sword",
          "gold": 50
        }
      }
    ],
    "options": [
      {
        "id": "chat_about_past",
        "text": "Tell me about yourself.",
        "trustRequired": 2,
        "response": "I was a soldier once. Before the Hollow came. Now I forge weapons for those brave enough to fight.",
        "effects": { "trust": 1, "flag": "knows_gareth_past" }
      },
      {
        "id": "ask_for_discount",
        "text": "Can I get a discount?",
        "trustRequired": 0,
        "response": "Discount? HA! You think gold grows on trees? ...Fine. 10% off. But don't tell anyone.",
        "effects": { "flag": "has_blacksmith_discount" }
      }
    ]
  },
  "shop": {
    "unlockTrust": 1,
    "items": [
      { "id": "iron_sword", "name": "Iron Sword", "cost": 100, "trustRequired": 1, "type": "weapon_part" },
      { "id": "steel_armor", "name": "Steel Armor", "cost": 250, "trustRequired": 3, "type": "equipment" },
      { "id": "legendary_blade", "name": "Soulreaver", "cost": 1000, "trustRequired": 5, "type": "legendary" }
    ]
  }
}
```

### Visual Novel Dialogue Interface

When the player talks to an NPC, the screen transitions to a **dialogue view**:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ┌──────────┐                                           │
│   │          │    Gareth Ironhand                        │
│   │ PORTRAIT │    "Another survivor. You look like you   │
│   │          │     could use a sharper blade."           │
│   └──────────┘                                           │
│                                                          │
│   Trust: ████████░░ 3/5  (Friend)                        │
│   Faction: Forge Brotherhood (Honored)                   │
│                                                          │
│   ┌────────────────────────────────────────────────┐     │
│   │ ► Tell me about yourself.                      │     │
│   │ ► Can I see your wares?                        │     │
│   │ ► I need help with something.                  │     │
│   │ ► Goodbye.                                     │     │
│   └────────────────────────────────────────────────┘     │
│                                                          │
│              [1]  [2]  [3]  [4]                          │
└──────────────────────────────────────────────────────────┘
```

### Why Visual Novel Style

| Choice | Justification |
|---|---|
| **Static portrait + text** | Simpler to implement than animated characters. Focus is on writing quality, not animation budget. |
| **Branching dialogue options** | Gives the player agency. "Do I ask about his past or go straight to shopping?" |
| **Trust displayed on screen** | Transparency about relationship progress motivates continued interaction. |
| **Keyboard shortcuts (1-4)** | Consistent with the combat engine's upgrade selection. Familiar interaction pattern. |
| **Faction displayed** | Connects the NPC to the larger world. "Helping Gareth helps the Forge Brotherhood." |

### Trust Mechanics

- Trust increases through: completing requests, choosing dialogue options that build rapport, giving gifts
- Trust decreases through: betraying promises, siding with rival factions, refusing requests repeatedly
- Trust gates: dialogue options, shop inventory, quest availability, special abilities
- Trust is **per-NPC**, not per-faction (though faction reputation moves alongside it)

---

## 7. Faction & Reputation System

### Why Factions

Factions create **meaningful choice** in a game that could otherwise be purely optimization-driven. If the player can only maximize one thing, there's no interesting decision. Factions force the player to choose:

- "Do I help the Forge Brotherhood (combat bonuses) or the Wanderers' Guild (exploration bonuses)?"
- "If I raise Shadow Covenant reputation, the Forge Brotherhood will distrust me."

### Faction Design

| Faction | Theme | Primary Benefit | Secondary Benefit | Conflict |
|---|---|---|---|---|
| **Wanderers' Guild** | Exploration & discovery | New stage unlocks, map knowledge, scouting bonuses | Consumables, gold bonuses | Enemies with the Shadow Covenant |
| **Shadow Covenant** | Stealth & cunning | Cooldown abilities, critical hit bonuses, escape mechanics | Rare items, black market access | Enemies with the Forge Brotherhood |
| **Forge Brotherhood** | Combat & crafting | Weapon upgrades, armor, damage bonuses | Equipment, resource efficiency | Enemies with the Shadow Covenant |

### Reputation Ranks

```
-100 to -51  HOSTILE     →  Attacked on sight, locked out of quests
 -50 to -21  UNWELCOME   →  Rip-off prices, refuses quests
 -20 to  -1  NEUTRAL     →  Basic interactions, no special benefits
   0 to  20  FRIENDLY    →  Standard shop, basic quests
  21 to  50  HONORED     →  Discounted shop, special quests, faction items
  51 to  80  REVERED     →  Best prices, exclusive quests, unique abilities
 81 to 100  EXALTED      →  Faction leader status, ultimate rewards
```

### Why Three Factions

| Count | Problem |
|---|---|
| **1 faction** | No choice. Everyone is on the same side. No conflict. |
| **2 factions** | Binary choice. Once you pick one, the other is dead content. |
| **3 factions** | Triangle of tension. Any two can ally against the third. Creates "pick two, sacrifice one" dynamics. Enough variety without overwhelming the player. |
| **4+ factions** | Too many to develop meaningfully. Player can't remember all the relationships. Dilutes the impact of each. |

### Faction Conflict Rules

- Helping one faction **slowly decreases** reputation with its rivals (at reduced rate)
- Openly betraying a faction (completing a rival's quest that harms them) causes a **large reputation drop**
- Some quests are **faction-exclusive** — only available at certain reputation levels
- The Chapel building can provide a **faction peace** upgrade (Lv3) that reduces reputation penalties

---

## 8. Skill Tree & Permanent Progression

### Why a Skill Tree

The combat engine is roguelite — you lose weapon upgrades between runs. But the player needs **permanent growth** to feel progress. A skill tree provides:

- **Visible progression**: A growing tree of unlocked nodes is satisfying
- **Build diversity**: Different players specialize in different ways
- **Meaningful choices**: Limited skill points force prioritization
- **Synergy with combat**: Skills modify how combat plays (not just stats)

### Skill Tree Structure

```
                    ┌─────────────┐
                    │   CORE      │
                    │  (Start)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  COMBAT   │ │  TOWN │ │  EXPLORER │
        │  MASTERY  │ │  LIFE │ │  PATH     │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
         ┌────┤       ┌────┤       ┌────┤
         │    │       │    │       │    │
       ┌─▼┐ ┌▼──┐  ┌─▼┐ ┌▼──┐  ┌─▼┐ ┌▼──┐
       │Dmg│ │Spd│  │Gld│ │Bld│  │Exp│ │Map│
       └───┘ └───┘  └───┘ └───┘  └───┘ └───┘
```

### Branch Design

| Branch | Theme | Sample Nodes |
|---|---|---|
| **Combat Mastery** | Raw combat power | +15% damage, +1 projectile, Crit damage +25%, Armor piercing, Life steal 5% |
| **Town Life** | Economy & crafting | +10% gold earned, Building costs -15%, Double farm yield, Auto-repair equipment |
| **Explorer Path** | Discovery & utility | +20% move speed, See enemy HP bars, Unlock hidden stages, Map reveals secrets |
| **Survival Instinct** | Defense & recovery | +20 max HP, Regenerate 1 HP/sec, Revive once per run, +0.5s iFrames |
| **Arcane Arts** | Special abilities | Unlock cooldown abilities, Reduce ability cooldowns, Ability power +20%, Combo abilities |

### Why 5 Branches

| Count | Problem |
|---|---|
| **2-3** | Too few. Everyone ends up with the same build. No specialization. |
| **5** | Enough for meaningful diversity. Each branch has a clear identity. Player can specialize in 1-2 branches or go wide. |
| **7+** | Too many to balance. Nodes become incremental (+1% this, +2% that). Loses identity. |

### Skill Points Economy

- Earned from: leveling up (1 point per level), completing main quests, faction reputation milestones, building upgrades (Library Lv2+)
- Starting rate: ~3-5 points per combat run (assuming 10-15 minute run, reaching level 8-12)
- Total tree size: ~50-60 nodes
- Points needed to fill one branch: ~10-12
- This means the player can fully master 2 branches, partially fill a 3rd, and has to make choices

### Why Permanent Skills (Not Run-Based)

If skills reset every run, there's no meta-progression. The player would feel like they're starting from zero every time. Permanent skills mean:

- Run 1: Earn 4 skill points → unlock "Gold Bonus" and "Move Speed"
- Run 5: Earn 20 total points → unlock Combat Mastery tier 3
- Run 20: Nearly full build → trying different branch combinations

This creates the "one more run" hook that roguelites thrive on.

---

## 9. Quest System

### Why Quests

Quests are the **connective tissue** that bridges all systems. Without quests:
- The player has no direction ("What should I do next?")
- Features don't interact ("I upgraded the Blacksmith but nothing happened")
- NPCs have no purpose beyond shopkeepers
- The story doesn't progress

### Quest Types

| Type | Description | Example |
|---|---|---|
| **Main Quest** | Advances the primary story. Unlocks major features. | "The Hollow is spreading. Find the Watchtower and scout the enemy base." |
| **Side Quest** | Optional content from NPCs. Provides rewards and trust. | "Gareth needs iron ore. Bring him 10 from the Quarry." |
| **Faction Quest** | Available from faction NPCs. Advances faction storyline. | "The Wanderers need a map of the Graveyard. Survive 5 minutes without dying." |
| **Repeatable** | Can be done multiple times for ongoing rewards. | "Clear the Graveyard of 100 zombies." (Resets daily or per run) |
| **Hidden** | Triggered by specific actions or flags. Not shown until discovered. | "Find the ancient sword in the Graveyard → Unlocks the Shadow Covenant." |

### Quest Data Structure

```json
{
  "id": "main_001_awakening",
  "name": "The Awakening",
  "type": "main",
  "description": "You wake up in a graveyard. Something is wrong. Survive.",
  "giver": "narrator",
  "objectives": [
    {
      "id": "obj_1",
      "type": "survive_time",
      "target": 60,
      "description": "Survive for 1 minute",
      "stageRequired": "stage_graveyard"
    }
  ],
  "rewards": {
    "gold": 100,
    "trust": { "blacksmith": 1 },
    "unlocks": ["stage_graveyard"],
    "flags": { "completed_tutorial": true }
  },
  "prerequisites": {
    "flags": [],
    "questsCompleted": [],
    "trust": {},
    "reputation": {}
  },
  "chain": {
    "next": "main_002_first_friend"
  }
}
```

### Quest Chain System

Quests can be chained: completing one unlocks the next. This creates story arcs:

```
main_001_awakening
  └─► main_002_first_friend (meet the Blacksmith)
        └─► main_003_iron_ore (fetch quest for Blacksmith)
              ├─► main_004_forge_brotherhood (introduced to faction)
              └─► side_001_blacksmiths_past (optional lore)
```

### Why Quests Are Central

| Without Quests | With Quests |
|---|---|
| Player enters combat, earns gold, spends gold, repeat | Player follows a story thread that weaves through all features |
| No motivation to talk to NPCs | NPCs give quests that reward trust and items |
| Town upgrades feel disconnected | Building the Watchtower is required for the "Scout" main quest |
| No narrative progression | Each quest chain reveals more of the world's story |
| No replayability | Hidden quests and faction branches encourage different playthroughs |

---

## 10. Unlock System

### Why an Explicit Unlock System

Content gating prevents the player from being overwhelmed and creates a sense of discovery. Without it:
- All stages are available from the start (no progression)
- All items are available (no excitement from finding something new)
- All features are available (no "I just unlocked X!" moments)

### Unlock Categories

| Category | What It Gates | Example |
|---|---|---|
| **Stages** | Combat arenas | Graveyard → Forest → Cursed Library → Demon Citadel |
| **Weapons** | Combat tools | Unlock via quests, NPC trust, or faction reputation |
| **Items** | Equipment and consumables | Buy from NPC shops, find in combat, earn from quests |
| **Abilities** | Cooldown-based special moves | Earned from skill tree or NPC training |
| **Features** | Game systems | Library unlocks skill tree, Arena unlocks challenge modes |
| **NPCs** | Town characters | Appear after certain quests or building upgrades |
| **Buildings** | Town structures | Some require quest completion before they can be built |

### Unlock Conditions

```json
{
  "id": "stage_forest",
  "name": "The Whispering Forest",
  "type": "stage",
  "conditions": {
    "any": [
      { "type": "quest_completed", "questId": "main_005_forest_scout" },
      { "type": "reputation", "faction": "wanderers_guild", "minRank": "honored" }
    ]
  },
  "description": "A dense forest where the trees seem to watch you.",
  "reward": {
    "flags": { "knows_about_forest": true }
  }
}
```

### Why Any/All Condition Logic

- **Any**: The player needs to satisfy ONE of the conditions (alternative paths)
- **All**: The player needs to satisfy ALL conditions (cumulative requirements)
- This allows both "complete this quest OR reach this reputation" and "complete quest X AND have building Y"

---

## 11. Macro Progression & Game Loop

### The Meta-Game Loop

```
    ┌──────────────────────────────────────────────────┐
    │                   START HERE                       │
    │                      │                             │
    │              ┌───────▼───────┐                     │
    │              │   IN TOWN     │                     │
    │              │               │                     │
    │              │ • Talk to NPCs│                     │
    │              │ • Pick up     │                     │
    │              │   quests      │                     │
    │              │ • Spend gold  │                     │
    │              │ • Upgrade     │                     │
    │              │   buildings   │                     │
    │              │ • Check skill │                     │
    │              │   tree        │                     │
    │              └───────┬───────┘                     │
    │                      │                             │
    │              ┌───────▼───────┐                     │
    │              │   WORLD MAP   │                     │
    │              │               │                     │
    │              │ • Select stage│                     │
    │              │ • See quest   │                     │
    │              │   objectives  │                     │
    │              │ • Check enemy │                     │
    │              │   intel       │                     │
    │              └───────┬───────┘                     │
    │                      │                             │
    │              ┌───────▼───────┐                     │
    │              │    COMBAT     │                     │
    │              │               │                     │
    │              │ • Fight waves │                     │
    │              │ • Earn gold   │                     │
    │              │ • Find items  │                     │
    │              │ • Complete    │                     │
    │              │   objectives  │                     │
    │              │ • Survive!    │                     │
    │              └───────┬───────┘                     │
    │                      │                             │
    │              ┌───────▼───────┐                     │
    │              │  POST-RUN     │                     │
    │              │               │                     │
    │              │ • Review loot │                     │
    │              │ • Quest progress│                    │
    │              │ • NPC trust   │                     │
    │              │   changes     │                     │
    │              │ • Return to   │                     │
    │              │   town        │                     │
    │              └───────┬───────┘                     │
    │                      │                             │
    │                      └──────── loops back ─────────┘
    │                                                     │
    └─────────────────────────────────────────────────────┘
```

### Progression Milestones

| Phase | Focus | Player Experiences |
|---|---|---|
| **Early Game** (Runs 1-5) | Discovery | Learning combat, meeting first NPCs, building Campfire and Blacksmith, completing tutorial quests |
| **Early-Mid** (Runs 6-15) | Investment | Choosing a faction, upgrading buildings, unlocking skill tree, meeting faction NPCs |
| **Mid Game** (Runs 16-30) | Specialization | Committing to skill branches, raising NPC trust, faction reputation meaningful, new stages unlocked |
| **Mid-Late** (Runs 31-50) | Mastery | Challenging stages, legendary items, high trust NPCs, faction storylines converging |
| **Late Game** (Runs 50+) | Completion | All buildings maxed, all NPCs at max trust, faction endings, hidden content, challenge modes |

### Why This Loop Works

The loop has **three types of progression** that feed each other:

1. **Short-term** (per run): Gold earned, XP gained, quest objectives completed
2. **Medium-term** (across runs): Building upgrades, NPC trust increases, faction reputation
3. **Long-term** (across many runs): Skill tree completion, story arc resolution, unlock completion

Each type motivates a different kind of engagement:
- Short-term: "I need 20 more gold to finish this quest"
- Medium-term: "One more run and I can upgrade the Tavern to Level 3"
- Long-term: "I'm close to Exalted with the Forge Brotherhood"

---

## 12. Data Flow Between Systems

### Cross-Feature Data Flow Map

```
COMBAT ENGINE                        PERSISTENT STATE
─────────────                        ────────────────
                                     
Player kills zombie ───────────────► quests.progress.kill_zombie += 1
Player kills boss ─────────────────► factions.reputation += 10
Player earns gold ─────────────────► town.resources.gold += earned
Player earns XP ───────────────────► player.xp += earned → check level up → skills.skillPoints += 1
Player finds item ─────────────────► inventory.consumables.push(item)
Player survives 5 min ─────────────► quests.progress.survive_time = max(current, 5)
Player dies ────────────────────────► combat.lastRunStats = { ... }

TOWN / NPC                           PERSISTENT STATE
──────────                           ────────────────
Player builds Blacksmith ──────────► town.buildings.blacksmith = { level: 1 }
Player talks to NPC ──────────────► npcs.met.push('blacksmith')
Player completes NPC request ──────► npcs.relationships.blacksmith += 1
Player joins faction ──────────────► factions.reputation += 5
Player upgrades skill ─────────────► skills.unlocked.push('combat_damage_1')
                                      player.baseStats.damageMultiplier += 0.15

QUEST SYSTEM                         PERSISTENT STATE
────────────                         ────────────────
Quest completed ────────────────────► quests.completed.push(questId)
                                      unlocks.stages.push('stage_forest') [if reward]
                                      npcs.relationships.npc += 1 [if reward]
                                      flags.quest_done_X = true [if reward]
```

### The Event Bus Pattern

All cross-feature communication uses the central store's event bus:

```javascript
// When combat ends:
eventBus.emit('combat:sessionEnd', result);

// Listeners:
questModule.onCombatEnd(result);    // Updates quest progress
factionModule.onCombatEnd(result);  // Updates faction reputation
npcModule.onCombatEnd(result);      // Updates NPC reactions ("I heard you fought well!")
```

### Why Event Bus + Central Store

| Approach | Problem | Our Solution |
|---|---|---|
| Direct function calls | Tight coupling. Combat can't exist without quest system. | Event bus allows loose coupling. |
| Pure events | State becomes inconsistent. Two features might disagree on values. | Central store is single source of truth. |
| Central store only | No real-time reactivity. Player wouldn't see updates until next read. | Event bus triggers re-reads after writes. |

---

## 13. Content File Architecture

### Complete Content File Map

| # | File | Purpose | Size (est.) | Read By |
|---|---|---|---|---|
| 1 | `content/characters.json` | Playable character definitions | ~30 lines | Combat Module |
| 2 | `content/weapons.json` | Weapon definitions + 7-level stats | ~120 lines | Combat Module |
| 3 | `content/enemies.json` | Enemy definitions + boss phases + drops | ~130 lines | Combat Module |
| 4 | `content/stages.json` | Stage config: waves, background, BGM, timing | ~100 lines | Combat Module, Unlock System |
| 5 | `content/pickups.json` | Pickup definitions + behavior + sound | ~70 lines | Combat Module |
| 6 | `content/leveling.json` | XP curve + passive upgrade pool | ~40 lines | Combat Module |
| 7 | `content/upgrades.json` | Level-up upgrade option definitions | ~30 lines | Combat Module |
| 8 | `content/mechanics.json` | Movement patterns, telegraphs, buffs/debuffs | ~80 lines | Combat Module |
| 9 | `content/audio_config.json` | Sound event → synth parameter mapping | ~120 lines | Audio Manager |
| 10 | `content/ui_config.json` | UI text, colors, layout config | ~80 lines | UI Manager |
| 11 | `content/npcs.json` | NPC definitions: dialogue, trust, shops, requests | ~200 lines | NPC Module |
| 12 | `content/factions.json` | Faction definitions: ranks, rewards, conflicts | ~60 lines | Faction Module |
| 13 | `content/skills.json` | Skill tree: nodes, requirements, effects | ~150 lines | Skill Module |
| 14 | `content/quests.json` | Quest definitions: objectives, rewards, chains | ~200 lines | Quest Module |
| 15 | `content/buildings.json` | Town building definitions: costs, upgrades, unlocks | ~120 lines | Town Module |
| 16 | `content/items.json` | Equipment and consumable definitions | ~100 lines | Inventory Module, Combat Module |
| 17 | `content/unlocks.json` | Unlock conditions and dependencies | ~80 lines | Unlock Module |
| 18 | `content/story.json` | Main story dialogue, narrator text, lore entries | ~150 lines | Quest Module, NPC Module |

### Why Separate Content Files Per System

| Alternative | Problem | Our Approach |
|---|---|---|
| One giant JSON | Impossible to find anything. Merge conflicts. Loading entire file for one feature. | One file per system. Each module loads only what it needs. |
| Embedded in engine | Can't change content without touching code. Can't share content between games. | External files. Same engine, different content = different game. |
| Database | Overkill for a single-player game. Adds complexity. | JSON files. Simple, human-readable, version-controllable. |

---

## 14. Gaps, Conflicts & Open Questions

### Identified Gaps

**Gap 1: No save data schema versioning strategy.**
When the game updates and the save format changes, old saves could break. We need a migration system.
- **Question:** Should we use semantic versioning on the save format and include migration functions per version bump? Or is a "reset save on major version change" acceptable?

**Gap 2: Combat engine currently has no "session result" output.**
The existing combat engine runs until game over and shows stats, but doesn't export a structured result object. We need to define the combat result interface.
- **Action:** Add `onCombatEnd(result)` hook that packages gold, XP, kills, items, time survived, and quest-relevant events into a standard format.

**Gap 3: No resource types beyond gold.**
The town uses wood, stone, herbs, and gold. But the combat engine only generates gold. Where do other resources come from?
- **Options:** (a) Farm and Quarry buildings generate resources passively over real time. (b) Resources drop from specific enemies. (c) Resources are earned from specific quest types.
- **Recommendation:** All three. Farm/Quarry provide baseline. Some enemies drop resources. Quests can reward specific resources. This creates multiple paths to the same goal.

**Gap 4: No inventory management UI.**
Items can be earned, bought, and found. But there's no inventory screen to manage equipment and consumables.
- **Action:** Design an inventory UI module (grid-based or list-based) accessible from the town.

**Gap 5: No equipment system in the combat engine.**
The combat engine has a player with base stats but no equipment slots. If the Blacksmith sells swords and armor, the combat engine needs to read equipment from the store and apply bonuses.
- **Action:** Extend `store.inventory.equipment` with stat modifiers that the combat engine reads during player creation.

**Gap 6: No real-time building upgrade feedback.**
When a building is upgraded, there's no visual change in the town view (since it's a static screen).
- **Options:** (a) Different SVG/icon per building level. (b) Text-based description change. (c) Animated upgrade sequence.
- **Recommendation:** SVG/icon per level. Simple, visual, satisfying.

**Gap 7: No dialogue branching based on combat history.**
An NPC might say "I heard you defeated the Gravekeeper!" but the combat history isn't available in the NPC dialogue context.
- **Action:** The NPC module reads `combat.lastRunStats` and `store.flags` to dynamically adjust dialogue. Flags like `defeated_gravekeeper` are set by the combat module and read by the NPC module.

**Gap 8: No time-gated content.**
Some roguelites have daily challenges or time-limited events. Our framework doesn't address this.
- **Decision:** Defer to a future version. The framework supports it via the `meta.lastSaved` timestamp and `flags` system, but we won't design it now.

**Gap 9: No multiplayer or social features.**
The framework is single-player only. No leaderboards (beyond local Arena scores), no co-op, no PvP.
- **Decision:** By design. This is a personal project. Social features would add significant complexity for minimal benefit.

**Gap 10: No accessibility options.**
No colorblind mode, no difficulty settings, no input remapping.
- **Action:** Add an `options` section to the save data and an Options menu in the UI. Include at minimum: difficulty modifier, colorblind palette, input remapping.

### Identified Conflicts

**Conflict 1: Gold economy balance.**
If combat gives gold AND the town generates gold (via buildings), the economy could inflate. The player might never feel resource-constrained.
- **Resolution:** Buildings should cost escalating amounts. Higher-tier buildings cost resources (wood, stone) in addition to gold. The Chapel and Watchtower require quest completion AND resources AND gold. This creates multi-resource gates.

**Conflict 2: NPC trust vs. faction reputation tension.**
If Gareth (Forge Brotherhood) asks you to steal from the Shadow Covenant, do you gain trust with Gareth but lose reputation with the Covenant? The systems need to be coordinated.
- **Resolution:** Quest rewards explicitly define both trust and reputation changes. The quest definition includes both. The quest system writes to both `npcs.relationships` and `factions.reputation`. No implicit coupling.

**Conflict 3: Skill tree power vs. combat balance.**
If the skill tree gives +50% damage, the combat engine's balance is broken. Content designed for base stats becomes trivial.
- **Resolution:** The combat engine reads `player.baseStats` which includes skill modifiers. Content (enemy HP, damage) is designed around a **power budget** that accounts for expected skill progression. Enemies at minute 4 of the Graveyard assume the player has ~15-20% stat bonuses from skills.

**Conflict 4: Quest completion in combat vs. return to town.**
Quest objectives are completed during combat, but quest turn-in happens in town. What if the player completes an objective but dies before returning?
- **Resolution:** Quest progress is written to the store in real-time during combat (on kill, on time milestone). If the player dies, the progress is saved. The quest remains "active" but the objective is marked complete. The player turns it in from town next visit.

**Conflict 5: Building costs vs. player progression pace.**
If buildings are too expensive, the player grinds combat repeatedly before doing anything in town. If too cheap, everything is maxed quickly.
- **Resolution:** First buildings (Campfire, Blacksmith, Market) are cheap and available early. Mid-tier (Tavern, Library, Farm, Quarry) cost 100-300 gold. Late-tier (Chapel, Arena, Watchtower) cost 250-400 gold AND require quest completion. This creates a natural unlock cadence.

**Conflict 6: Multiple stages vs. content depth.**
More stages mean more variety but less depth per stage. With 4+ stages, each needs unique enemies, waves, and mechanics.
- **Resolution:** Start with 3-4 stages. Each stage reuses core enemies but adds 1-2 unique enemies and one unique mechanic (e.g., Forest has poison zones, Cursed Library has trap tiles). The engine's `mechanics.json` makes this data-driven.

### Open Questions

**Q1: Should the game have a narrator / story voice?**
Options: (a) Silent protagonist with text-only narration. (b) Narrator with occasional story text between stages. (c) Full dialogue system like a JRPG.
- **Recommendation:** (a) Silent protagonist with text narration. Simplest to implement, easiest to expand. Narrator text appears at key story moments (start of game, boss encounters, faction milestones).

**Q2: How should the transition between town and combat work?**
Options: (a) Seamless transition (camera zooms into the stage). (b) Loading screen with lore text. (c) World map as an intermediate screen.
- **Recommendation:** (c) World map. It provides a natural place to select stages, view quest objectives, and check intel. Also future-proofs for multiple regions.

**Q3: Should NPCs be able to accompany the player in combat?**
If an NPC trust level is high enough, they could appear as a combat ally. This would require the combat engine to support AI-controlled allies.
- **Recommendation:** Defer to a future version. The framework supports it (NPC data has a `combatAlly` field that the combat engine can read), but implementing AI allies is significant scope.

**Q4: Should there be a "prestige" or "new game+" system?**
When the player completes all content, should they be able to restart with bonuses? Or is the game "done" at that point?
- **Recommendation:** Include in the framework design but defer implementation. The save data has a `meta.prestigeCount` field. When implemented, prestige would reset most progress but keep cosmetic rewards and unlock harder difficulty modifiers.

**Q5: How should the game handle difficulty scaling across the macro loop?**
If a player is over-leveled for a stage, should it be trivial? Should enemies scale to the player's skill tree?
- **Options:** (a) Fixed difficulty per stage. Player outgrows early stages. (b) Dynamic scaling: enemies scale to player power. (c) Difficulty modes per stage (Normal/Hard/Nightmare).
- **Recommendation:** (a) initially, with (c) as a build option. Fixed difficulty means the Graveyard is always the same challenge. This lets players feel their power growth by returning to earlier stages and stomping them. Hard mode unlocks at higher reputation.

**Q6: Should the save data be a single file or distributed across localStorage keys?**
Options: (a) Single JSON in one localStorage key (simple, but hits 5MB limit eventually). (b) Split across multiple keys (complex, but unlimited).
- **Recommendation:** (a) Single JSON. For a web game, 5MB is more than enough for save data. If the game moves to desktop, switch to file-based storage.

**Q7: How should the game handle the "first run" experience?**
The player starts with nothing — no buildings, no NPCs, no quests. The first run should be guided.
- **Recommendation:** A short scripted tutorial quest chain: "Survive 60 seconds" → "Return to town" → "Build the Blacksmith" → "Talk to Gareth" → "Complete his request" → "Enter the World Map." This naturally introduces all systems.

**Q8: Should skill tree resets cost resources?**
If the player wants to try a different build, should they be able to respec? For free or for a cost?
- **Recommendation:** Library Lv3 unlocks respec. Cost: increasing gold per respec (100, 200, 400...). This prevents infinite respeccing while allowing experimentation.

**Q9: What happens to quest progress if a quest is abandoned?**
Can the player abandon quests? If so, what happens to partial progress?
- **Recommendation:** Main quests cannot be abandoned. Side quests and faction quests can be abandoned. Abandoning resets progress but doesn't penalize the player. The quest becomes available again from the quest giver.

**Q10: How should the game handle content updates and new features?**
If we add a new stage, NPC, or building in a future version, how does it integrate with existing saves?
- **Recommendation:** The `unlocks.stages` array in the save only contains stages the player has unlocked. New stages are NOT automatically added — they need to be unlocked through gameplay. This means adding content is backward-compatible: new content is gated behind new unlock conditions that existing players haven't met yet.

---

## Appendix A: Feature Implementation Priority

| Priority | Feature | Reason |
|---|---|---|
| **P0** | Centralized data store | Everything depends on it. Must be first. |
| **P0** | Combat module integration | The existing game. Needs to write results to the store. |
| **P1** | Town hub (basic) | The player needs somewhere to return to. Campfire + Blacksmith + Market. |
| **P1** | Quest system (basic) | Gives direction. Tutorial quest chain introduces all systems. |
| **P1** | NPC system (basic) | The Blacksmith NPC with dialogue and requests. |
| **P2** | World map & stage selection | Natural transition between town and combat. |
| **P2** | Skill tree (first branch) | Permanent progression. Start with Combat Mastery only. |
| **P2** | Unlock system | Gates stages and features behind progression. |
| **P3** | Faction system | Adds depth after core loop is solid. Start with Forge Brotherhood only. |
| **P3** | City builder (full) | All buildings, resource generators, upgrade paths. |
| **P3** | Full NPC roster | 5-8 NPCs with full dialogue trees and trust levels. |
| **P4** | Full skill tree (all branches) | Remaining 4 branches. |
| **P4** | Full faction system (all 3) | Remaining 2 factions + conflict system. |
| **P4** | Equipment & inventory | Equipment slots, stat modifiers, inventory UI. |
| **P5** | Prestige / New Game+ | Endgame replayability. |

---

## Appendix B: How This Relates to extract_engine.html

The `extract_engine.html` plan describes how to modularize the combat engine from a single HTML file into engine + external content files. This framework document extends that by:

1. **The combat engine becomes `CombatModule`** — one of 9 feature modules
2. **Content files expand from 10 to 18** — adding NPCs, factions, skills, quests, buildings, items, unlocks, and story
3. **A centralized store is introduced** — all modules read/write one save file
4. **The engine's data loading is extended** — it reads `store.player.baseStats` (which includes skill tree bonuses) and writes `store.town.resources.gold` on session end
5. **New UI modules are needed** — town view, NPC dialogue, skill tree, world map, inventory

The extraction plan's Phase 1-5 (externalizing combat data) becomes a prerequisite for this framework's implementation. The combat engine must be modular before it can be wrapped in a CombatModule.

---

*Modularity Engine Game Framework v0.3.0 — Generated August 23, 2026*
