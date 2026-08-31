# Modularity Engine — Game Framework

> ⚠️ **SUPERSEDED** — This document is historical. For current design, see `MASTER_DESIGN.md`.
> **Original Version:** 0.4.0 (Design Decisions Locked)
> **Date:** August 26, 2026
> **Status:** Historical Reference Only
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
    "level": 1,
    "name": "Refugee Camp",
    "currentLocation": "city_root",
    "locationHistory": ["city_root"],
    "locationUnlocks": {
      "city_root": true
    },
    "population": 0,
    "popCap": 5,
    "buildings": {},
    "resources": {
      "wood": 0,
      "stone": 0,
      "herbs": 0,
      "ore": 0
    },
    "workers": {
      "farmers": 0,
      "miners": 0,
      "builders": 0,
      "scholars": 0,
      "masons": 0,
      "idle": 0,
      "assignments": {}
    },
    "managers": [],
    "upgrades": {}
  },

  "npcs": {
    "met": [],
    "relationships": {},
    "completedDialogues": [],
    "activeRequests": [],
    "companions": [],
    "partySlots": 3
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

  "estates": [],
  "family": {
    "wives": [],
    "children": [],
    "familyTree": {}
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
| `town` | City Builder | Level, location navigation, buildings, resources, upgrades. Only the city builder writes here. See `22_city_builder_location_system.md` for full location hierarchy. |
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
| 10 | **Estate & Family** | `EstateModule` | `estates`, `family` | `npcs`, `factions`, `town`, `player.totalGold` | `estates`, `family`, `npcs.relationships`, `factions.reputation` |
| 11 | **Endgame Sandbox** | `SandboxModule` | None (testing only) | `combat`, `npcs.companions`, `player.baseStats` | None (no persistent writes) |

### Why These Are Separate Modules

Each module has a **single responsibility** and owns its own data section. Modules communicate only through the central store — never directly to each other. This means:

- You can debug the NPC system by reading only `save_data.npcs`
- You can test combat by mocking only `save_data.combat` and `save_data.player`
- Save schema follows Claude's engine-agnostic 5-key structure: `save_version`, `session`, `persistent`, `flags`, `counters`
- GameManager uses injected `StorageBackend` — HTML uses localStorage, Godot will use FileAccess
- See `15_engine_agnostic_port.md` for full porting checklist and conflict resolution

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
| Game starts immediately | Game starts after selecting a stage from the location hierarchy (reuse town navigation) |
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

  // Gold earned (D8: Combat + Quests + Events)
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

**Q2c: Is there a separate world map?** (RESOLVED — D9 DECIDED)
No separate world map. The city/town navigation interface is reused for ALL areas. The location hierarchy (City → Districts → Sub-Districts → Buildings) is data-driven — the same system represents the town, the Graveyard region, the Forest, etc. Players swipe left/right between regions at the root level. See `22_city_builder_location_system.md` for full design.

> **Detailed design:** See `22_city_builder_location_system.md` for the full location hierarchy (City → Districts → Sub-Districts → Buildings), navigation system (breadcrumb + back + side menu), NPC placement, unlock system, ambient sounds, and implementation phases.

### Why a Town Hub

The town is the player's **persistent home** between combat runs. But it's not just a gold sink — it's a living settlement that grows from a campfire to a city. The key design insight: **gold kickstarts the early game, but reputation and quests drive the rest.** This prevents gold inflation from breaking the equipment economy.

### The Two-Phase Economy

The city progresses through two distinct economic phases:

```
PHASE 1: GOLD-DRIVEN (Early Game)
──────────────────────────────────
Player earns gold in combat → Spends gold to build basic structures
Gold is the primary resource. Buildings cost gold only.
Ends when: Player has built all Phase 1 structures (small village)

PHASE 2: POPULATION-DRIVEN (Mid-Late Game)
───────────────────────────────────────────
Workers arrive as population grows → Workers gather resources autonomously
Gold becomes secondary. Buildings cost resources (wood, stone, ore) gathered by workers.
Player gold now spent on: equipment, consumables, NPC hiring, managers
Ends when: City is fully built (town center Lv5)
```

**Why this works:**
- Early game: Gold feels valuable and impactful (building your first Blacksmith costs 200g — meaningful)
- Mid game: Gold stays valuable for equipment/items (not inflated by city costs)
- Late game: Gold is spent on NPC managers and luxury items (not mandatory progression)
- City growth feels earned through reputation and quests, not just grinding gold

### Phase 1: Gold-Driven Structures (Camp → Small Village)

These structures cost gold only. They're the player's first investment.

| Building | Gold Cost | Unlocks | Upgrade Path |
|---|---|---|---|
| **Campfire** | Free | Basic town, rest (heal) | Lv2: +10% gold. Lv3: NPC gathering spot. |
| **Shelter** | 50 | Pop capacity: 5. First workers arrive. | Lv2: Pop capacity 10. Lv3: Pop capacity 15. |
| **Blacksmith** | 200 | Weapon upgrades between runs | Lv2: Equipment crafting (costs resources). |
| **Market** | 100 | Buy consumables, sell items | Lv2: Bulk discounts. |
| **Farm** | 120 | 1 worker generates herbs/wood | Lv2: +50% yield. |
| **Quarry** | 120 | 1 worker generates stone/ore | Lv2: +50% yield. |

**Phase 1 total cost: ~790 gold** (achievable in 3-5 runs)

### Phase 2: Population-Driven Structures (Village → City)

Once the player has a small village (Campfire + Shelter + Blacksmith + Market + Farm + Quarry all built), the game transitions to Phase 2. New structures are unlocked by **reputation milestones** and **quest completion**, not gold.

Workers arrive as population grows (gated by reputation and shelter upgrades). Workers gather resources autonomously between runs. Buildings cost **resources gathered by workers**, not gold.

| Building | Unlock Condition | Resource Cost | Workers Needed | Upgrade Path |
|---|---|---|---|---|
| **Tavern** | Reputation: Friendly with any faction | 30 wood, 20 stone | 2 builders | Lv2: NPC recruitment. Lv3: Faction quest givers. |
| **Library** | Complete quest: "First Lessons" | 50 wood, 10 herbs | 2 scholars | Lv2: Skill tree access. Lv3: Skill respec. |
| **Chapel** | Reputation: Honored with any faction | 40 stone, 20 ore | 3 masons | Lv2: Faction blessing. Lv3: Cross-faction peace. |
| **Arena** | Complete quest: "Prove Your Worth" | 60 stone, 30 ore | 4 builders | Lv2: Time trials. Lv3: Endless mode. |
| **Watchtower** | Reputation: Friendly with Wanderers' Guild | 40 wood, 30 stone | 3 scouts | Lv2: Enemy intel. Lv3: Weather effects. |
| **Wall** | Complete quest: "The Hollow Approaches" | 80 stone, 40 ore | 5 masons | Lv2: Enemy spawn distance +20%. Lv3: +50%. |
| **Town Hall** | Reputation: Honored with 2 factions | 100 wood, 80 stone, 40 ore | 6 builders | Lv2: All buildings +1 level. Lv3: City complete. |

### Worker & Population System

```
Population Growth:
  Shelter Lv1 → Pop cap: 5   (1 farmer, 1 miner, 3 idle)
  Shelter Lv2 → Pop cap: 10  (2 farmers, 2 miners, 1 builder, 5 idle)
  Shelter Lv3 → Pop cap: 20  (4 farmers, 3 miners, 3 builders, 2 scholars, 8 idle)
  Town Hall    → Pop cap: 35  (6 farmers, 5 miners, 8 builders, 3 scholars, 3 masons, 10 idle)

Resource Generation (per combat run, ~5 min):
  Farmer:  +3 wood or +2 herbs (player assigns)
  Miner:   +3 stone or +2 ore (player assigns)
  Builder: Required for construction (consumed on build)
  Scholar: +1 research point (unlocks Library upgrades)
  Mason:   Required for stone structures (consumed on build)
```

**Workers are NOT managed day-to-day.** The player assigns worker roles when they return to town (simple UI: drag farmers to wood or herbs). Workers then generate resources passively until the next run. This keeps the city builder lightweight — no real-time micromanagement.

### NPC Managers (Gold Sink for Late Game)

Once the city is growing, the player can spend gold to hire **NPC managers** — named characters who automate city functions:

| Manager | Gold Cost | Function | Unlock |
|---|---|---|---|
| **Foreman** | 300 | Auto-assigns workers to optimal roles | Shelter Lv3 |
| **Steward** | 500 | Auto-collects resources between runs | Town Hall Lv1 |
| **Quartermaster** | 400 | Optimizes resource allocation for builds | Town Hall Lv1 |
| **Recruiter** | 350 | Attracts new workers faster | Tavern Lv2 |

**Why NPC managers are the late-game gold sink:** By the time the player has 300+ gold to spend on managers, they've already built most of the city through reputation/quests. Gold at this point is surplus — spending it on managers is a convenience, not a requirement. This keeps gold valuable without making it mandatory for city progression.

### Resource Economy (Full Picture)

```
PHASE 1 (Gold-Driven):
  Combat → Gold → Buildings (Campfire, Shelter, Blacksmith, Market, Farm, Quarry)

PHASE 2 (Population-Driven):
  Workers → Wood/Stone/Herbs/Ore → Buildings (Tavern, Library, Chapel, etc.)
  Combat → Reputation → Unlocks new buildings
  Combat → Quest completion → Unlocks new buildings
  Gold → Equipment, consumables, NPC managers (NOT city buildings)

                  ┌─────────────────┐
                  │   COMBAT RUN    │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         Gold (early)  Reputation  Quest objectives
              │            │            │
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ PHASE 1 │ │ UNLOCKS │ │ UNLOCKS │
         │ Build   │ │ New     │ │ New     │
         │ basics  │ │ bldgs   │ │ bldgs   │
         └────┬────┘ └────┬────┘ └────┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  WORKERS    │
                    │  Generate   │
                    │  resources  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  PHASE 2    │
                    │  Build      │
                    │  advanced   │
                    │  with       │
                    │  resources  │
                    └─────────────┘
```

### Why This Economy Works

| Problem | How This Solves It |
|---|---|
| **Gold inflation** | Gold only funds Phase 1 (~790g total). Phase 2 uses worker-gathered resources. Gold stays valuable for equipment/managers. |
| **Grinding feels bad** | Phase 1 is short (3-5 runs). Phase 2 progression is quest/reputation-based — doing interesting things, not repeating combat for gold. |
| **City feels alive** | Workers arriving, buildings going up, population growing — the city develops itself as the player earns trust with the world. |
| **Gold stays relevant** | Equipment, consumables, and NPC managers always cost gold. The player always has a reason to earn gold, even in late game. |
| **No micromanagement** | Workers auto-generate. Player assigns roles once per visit. No farming sim complexity. |
| **Quests matter** | Buildings are gated by reputation and quests, not just gold. This makes the NPC/faction systems essential, not optional. |

### Town View Design

The town is a **static screen** with clickable buildings. Not a real-time simulation. When the player clicks a building:
- The building's menu opens (upgrade options, NPC list, shop inventory, etc.)
- The player interacts with the building's UI
- Changes are written to the central store

The town visually evolves as buildings are added: Phase 1 shows a campfire with a few tents. Phase 2 shows walls going up, a chapel, an arena. Phase 3 (Town Hall) shows a thriving settlement.

This is simpler than a real city builder but provides the same loop of **earn → spend → upgrade → unlock** without the micromanagement overhead.

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
  },
  "companion": {
    "unlockedAtTrust": 3,
    "partySlotCost": 1,
    "combatRole": "support",
    "damageMultiplier": 0.25,
    "attackSpeedMultiplier": 0.5,
    "attackPattern": "melee_swipe",
    "attackRange": 60,
    "attackCooldown": 2.0,
    "damageType": "physical",
    "passiveEffect": null,
    "combatDialogue": {
      "onSpawn": ["Let's heat things up!", "Stand back, I'll handle this."],
      "onKill": ["One less to worry about.", "Hmph. Too easy."],
      "onBossSpawn": ["That's a big one... stay focused!", "Don't let it corner you!"],
      "onLowHealth": ["Watch your health!", "Fall back if you need to!"]
    },
    "isDeadWeight": false
  }
}
```

### 6.5 NPC Combat Companions & Party System

**Core rule: Survival is 100% on the player character.** NPCs in combat are invulnerable support entities — they cannot take damage, cannot die, and cannot be targeted by enemies. The player is the only entity with an HP bar that matters.

#### Why Invulnerable Support NPCs

| Choice | Justification |
|---|---|
| **No NPC health management** | Eliminates the complexity of babysitting allies. The player focuses entirely on their own survival and positioning. No "revive the healer" moments. |
| **Support-only damage** | NPCs deal 15-30% of player damage. They supplement but never carry. The player always feels like the hero. |
| **Flavor through dialogue** | NPCs shout battle cries, react to bosses, and comment on kills. This makes the world feel alive without adding mechanical overhead. |
| **Build补ning** | A player weak in AoE can bring an NPC with area attacks. A player lacking single-target can bring a focused attacker. NPCs fill gaps. |
| **Dead weight as a feature** | Some NPCs are intentionally weak — bringing them is a social cost (affection building, quest requirement) not a combat optimization. This creates interesting tradeoffs. |

#### Party Slot System (Per-Stage Deployment)

The player has **3 companion slots**, each bound 1:1 to a weapon slot. W1=C1, W2=C2, W3=C3. A companion in slot 1 buffs and evolves weapon 1, slot 2 buffs weapon 2, etc. Companions are always invulnerable — they cannot take damage or die.

**Per-stage deployment:** The player owns N companions (wives, Dog, others) but chooses which 3 to deploy before each stage. Not-deployed wives still provide **50% passive bonus**.

```
Companion Pool: [Dog, Freya, Isis, Amaterasu] (4 companions)
Stage Select:   Choose 3 of 4 to deploy
Deployed:       [1] Freya → W1, [2] Dog → W2, [3] Isis → W3
Not-deployed:   Amaterasu → 50% passive bonus (wife)
```

**Why per-stage deployment:**
- Players aren't punished for having more companions than slots
- Wives always provide value (50% passive even when not deployed)
- Players can adapt their party to the stage (e.g., bring Dog for farming, wife for boss)
- Reduces the "which 3 of my 5 wives do I bring?" anxiety

#### NPC Companion Tiers

| Tier | Trust Required | Damage | Attack Speed | Special | Example NPCs |
|---|---|---|---|---|---|
| **Dead Weight** | 0-1 | 10% | Very slow | None. Takes a slot for affection/quest only. | Lost traveler, drunk bard |
| **Apprentice** | 2 | 20% | Slow | Basic attack pattern. Occasional dialogue. | Young squire, apprentice mage |
| **Adept** | 3 | 30% | Normal | Active attack pattern. Frequent dialogue. Passive aura. | Gareth, Elara |
| **Master** | 4 | 40% | Fast | Advanced pattern. Rich dialogue. Strong passive. Unique ability. | Faction leaders |
| **Sworn** | 5 | 50% | Fast | Full kit. In-combat ultimate ability (cooldown). Maximum dialogue. | Fully romanced/allied NPCs |

#### Dead Weight NPCs

Some NPCs are deliberately weak in combat. Bringing them is a **social cost** — you sacrifice a party slot for:
- **Affection building**: The NPC gains trust faster when brought along (they "see you in action")
- **Quest requirements**: "The Blacksmith wants you to bring his apprentice on a run so she can learn"
- **Faction reputation**: Some faction quests require specific NPCs in the party
- **Story moments**: Bringing a scared NPC through a dangerous stage has narrative weight

```json
{
  "id": "apprentice_ani",
  "name": "Ani",
  "title": "Blacksmith's Apprentice",
  "faction": "forge_brotherhood",
  "companion": {
    "unlockedAtTrust": 1,
    "partySlotCost": 1,
    "combatRole": "dead_weight",
    "damageMultiplier": 0.10,
    "attackSpeedMultiplier": 0.3,
    "attackPattern": "timid_swing",
    "attackRange": 40,
        "attackCooldown": 3.0,
    "passiveEffect": null,
    "combatDialogue": {
      "onSpawn": ["O-okay, I'll do my best...", "Please protect me!", "*nervous gulp*"] ,
      "onKill": ["I-I got one! Did you see?!", "That was scary..."],
      "onBossSpawn": ["W-what IS that?!", "*backs away trembling*"] ,
      "onLowHealth": ["I can't watch...!", "Are you okay?!"] 
    },
    "isDeadWeight": true,
    "affectionBonusMultiplier": 2.0,
    "questRequiredFor": ["gb_apprentice_training"]
  }
}
```

#### NPC Passive Effects in Combat

Higher-trust NPCs provide passive auras that supplement the player's build:

| NPC | Trust 3 Passive | Trust 5 Passive |
|---|---|---|
| **Gareth** (Blacksmith) | +10% player damage | +20% player damage, armor pierce |
| **Elara** (Herbalist) | Regenerate 1 HP/sec | Regenerate 3 HP/sec, cleanse on hit |
| **Vex** (Shadow Agent) | +10% crit chance | +20% crit chance, crit damage +25% |
| **Bram** (Wanderer Scout) | +15% move speed | +25% move speed, enemy slow aura |
| **Ani** (Apprentice) | None | None (still dead weight, but affection bonus) |

#### In-Combat Dialogue System

NPCs speak during combat via floating text bubbles. This is purely flavor — no player interaction required.

```
Trigger Frequency:  Every 15-30 seconds (randomized)
Trigger Events:     Kill streak (3+), boss spawn, player low HP, area clear
Display Duration:    2 seconds
Max On Screen:       1 (only one NPC speaks at a time)
```

Dialogue is defined per-NPC in `combatDialogue` and selected randomly from the pool. Higher trust unlocks more lines and rarer quips.

#### Party Composition Strategy

| Scenario | Recommended Party | Why |
|---|---|---|
| **General combat** | 2-3 companions matched to weapons | Companions buff their paired weapons |
| **Boss fight** | All 3 slots filled | Maximum passive bonuses + AoE support |
| **Affection farming** | 1 combat companion + 1 dead weight + 1 empty | Build trust with dead weight while staying viable |
| **Quest completion** | Quest-specified companion in paired slot | Meet quest requirements |
| **Challenge run** | Solo (no companions) | All slots empty = pure skill |

#### Combat Engine Integration (D1/D5: 1:1 Weapon-Companion Binding)

The combat engine reads `store.npcs.companions` (3 slots, each bound to a weapon) and spawns them as invulnerable entities. Each companion buffs and evolves its paired weapon:

```javascript
// CombatModule.startSession()
const companions = store.npcs.companions; // { 1: 'dog', 2: null, 3: null }
const weapons = store.combat.weaponLevels; // { w1: 3, w2: 0, w3: 0 }

for (let slot = 1; slot <= 3; slot++) {
  const companionId = companions[slot];
  const weaponId = `w${slot}`;
  const weaponLevel = weapons[weaponId] || 0;

  if (companionId) {
    const npcData = dataManager.npcs.find(n => n.id === companionId);
    if (npcData?.companion) {
      const companionLevel = weaponLevel; // Companions mirror weapon level

      entityManager.create('companion', {
        x: player.x + offset,
        y: player.y + offset,
        npcId: companionId,
        slot: slot,  // 1:1 with weapon
        weaponSlot: weaponId,
        damage: getCompanionDamage(npcData.companion, companionLevel),
        cooldown: getCompanionCooldown(npcData.companion, companionLevel),
        attackPattern: npcData.companion.attackPattern,
        invulnerable: true,  // KEY: companions cannot take damage (D2)
        visual: npcData.visual,
        passiveEffect: npcData.companion.passiveEffect,
        weaponBuff: npcData.companion.weaponBuff, // Buffs applied to paired weapon
      });
    }
  }
}
```

**Why 1:1 binding simplifies everything:**
- No separate companion upgrade system — companions auto-level with their paired weapon
- UI is clean: 3 slots = 3 companions = 3 weapons
- Balance is natural: each companion only affects one weapon's DPS
- Players choose which companion to pair with which weapon, not which companion to bring
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

## 7. Faction & Reputation System (D6: Keep 3 Core + Massive Expansion)

> **Status:** 3 core factions defined below. The 50-55 NPC wife roster is based on multiple mythologies from different eras, which will significantly expand the faction landscape. Some factions will be lore-only without reputation tracks. Full faction expansion deferred to a future spec.

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

## 8. Skill Tree & Permanent Progression (D7: PLACEHOLDER)

> **Status:** This section is a placeholder. The skill tree is used for unlocks and bonuses but the game is fully playable without it. No detailed node design yet — will be fleshed out in a future spec update.

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
| **Family** | Generated by estate households. Tied to the NPC family's story and needs. | "Your wife asks you to gather herbs from the Thornwood for the children's medicine." |
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

## 11. Estate, Marriage & Family System

### Why This System Exists

The affection system needs a **long-term payoff**. Trust Level 5 with an NPC is meaningful, but what comes after? Marriage and estates give the player:
- A **major gold sink** for late-game surplus gold
- A reason to **deepen relationships** beyond max trust
- A **legacy system** that persists across the entire game
- **Passive income** that rewards investment without requiring constant attention
- **Family progression** that creates emotional attachment to the world

### Core Concept

> *To marry an NPC, the player must build them an estate — a self-contained household that covers its own living costs. The estate's income goes entirely toward feeding, housing, and maintaining the family. It never adds to the player's gold. The player's proof that they can provide is building it — once complete, it sustains itself without any further gold drain on the player.*

This creates a natural progression:
1. **Court** the NPC (raise affection through gifts, quests, bringing them along)
2. **Build** their estate (gold + resources + quests + hired staff)
3. **Marry** (complete the marriage quest chain)
4. **Upgrade** the estate (raise affection further, unlock children, earn reputation)
5. **Legacy** (children grow, become companions/managers, extend the family line)

### Estate Tiers

Each estate progresses through 5 tiers. Higher tiers require more resources, quests, and staff.

| Tier | Name | What It Includes | Cost | Self-Sustaining? |
|---|---|---|---|---|
| **0** | Courting | No estate yet. Gift-giving and questing only. | 0 | N/A |
| **1** | Homestead | Small house + garden. NPC has a home. | 200g, 30 wood | No (player funds upkeep) |
| **2** | Farmstead | House + farmlands + 1 farmer. Produces food/resources. | 400g, 60 wood, 20 stone, 2 workers | Barely (covers own upkeep) |
| **3** | Manor | House + farmlands + business + 3 staff. Profitable. | 800g, 100 wood, 60 stone, 30 ore, 4 workers, quest | Yes (covers family costs) |
| **4** | Estate | Full estate with multiple businesses, staff quarters, grounds. | 1500g, 200 wood, 120 stone, 60 ore, 8 workers, quest chain | Yes (covers family + children costs) |
| **5** | Dynasty | Estate + children + legacy. Endgame property. | 3000g, 400 wood, 200 stone, 100 ore, 12 workers, reputation milestone | Yes (covers full family + bonuses) |

### Why These Tiers

| Tier | Design Purpose |
|---|---|
| **0 (Courting)** | The relationship-building phase. No gold investment yet — just time and effort. |
| **1 (Homestead)** | The commitment begins. The player spends gold to give the NPC a home. Small investment, big emotional payoff. |
| **2 (Farmstead)** | The estate starts producing enough internally to cover its own upkeep. The NPC is "taken care of" without costing the player more gold. |
| **3 (Manor)** | Marriage eligibility. The estate covers all family costs and is staffed. The NPC is established. This is the "I can provide" threshold. |
| **4 (Estate)** | Post-marriage growth. Upgrading the estate raises affection further and unlocks children. |
| **5 (Dynasty)** | Endgame. The family line continues. Children become companions/managers. The player's legacy is established. |

### Marriage Requirements

To marry an NPC, the player must satisfy **all** of the following:

| Requirement | Why |
|---|---|
| **Affection Level 5** (max) | The NPC must fully trust and love the player |
| **Estate Tier 3+** (Manor) | The player must prove they can provide a home |
| **Marriage Quest Chain** | A multi-step quest that tests the relationship (see below) |
| **Faction Reputation: Honored** | The community must recognize the player's standing |
| **Town Population: 15+** | The town must be large enough to support a wedding |

### Marriage Quest Chain

Each NPC has a unique marriage quest chain that reflects their personality:

**Example: Gareth's Marriage Chain**
```
1. "A Ring of Iron" (Trust 5 required)
   → Forge a special ring at the Blacksmith using rare materials
   → Objective: Collect 50 ore, 20 rare minerals, complete 3 combat runs without taking damage

2. "The Approval" (Reputation: Honored with Forge Brotherhood)
   → Present the ring to Gareth's faction leader for blessing
   → Objective: Talk to faction leader, complete a faction quest

3. "The Wedding" (Estate Tier 3+ required)
   → Host the wedding at your estate
   → Objective: Have 20+ town population, all staff hired, estate fully built
   → Reward: Marriage to Gareth, affection unlocks to Tier 6 (Dynasty)
```

### Estate Economy (Materials + Quests + Unlocks — D4 DECIDED)

Estates produce **materials, story quests, and unlock content** — never gold. Gold income comes from combat, quests, and events (D8). This keeps gold valuable for equipment and town upgrades while letting estates provide unique materials and story content.

```
Tier 1 (Homestead):    Produces: 1-2 basic materials/run (herbs, wood scraps)
                       Generates: No quests yet
                       Cost: Player funds upkeep (~5g/run) until Tier 2

Tier 2 (Farmstead):    Produces: 3-5 materials/run (wood, herbs, basic stone)
                       Generates: 1 basic quest per 5 runs
                       Self-sustaining: Covers own material upkeep

Tier 3 (Manor):        Produces: 8-12 materials/run (wood, stone, ore, rare herbs)
                       Generates: 1 quest per 3 runs (materials + story)
                       Unlocks: 1 unique item or crafting recipe

Tier 4 (Estate):       Produces: 15-20 materials/run (all types + rare materials)
                       Generates: 1 quest per 2 runs (story-heavy, affection-gated)
                       Unlocks: 2 unique items + 1 estate-exclusive companion ability

Tier 5 (Dynasty):      Produces: 25-30 materials/run (all types + legendary materials)
                       Generates: 1 quest per run (family story, children quests)
                       Unlocks: Full estate quest chain + legacy items
```

**Multiple estates multiply content, not income.** A player with 3 wives at Tier 4 has 3 households producing materials and generating quests. The player's gold never increases from estate activity — instead, they get a rich variety of materials, stories, and unlocks from their families.

### Why Estates Are Self-Contained

The key insight: **the estate covers its own household costs so the player doesn't have to keep funding it.** The player's gold is the *initial investment* to build the estate, but once complete, the estate's workers and businesses generate exactly enough to cover the family's living expenses. This means:
- The player never has to continuously "pay rent" for an estate after building it
- The estate feels like a gift to the family, not a money-making machine
- Multiple estates mean multiple self-sustaining households — more families, same player gold
- All combat gold stays with the player for equipment, town buildings, and personal upgrades

### Children

Children are unlocked at **Estate Tier 4+** and **Marriage Tier 5** (Dynasty). They represent the ultimate legacy progression.

| Child Property | Details |
|---|---|
| **How many** | 1-3 children per marriage (based on estate tier and affection) |
| **Growth** | Children grow over time (1 child per 10 combat runs, or real-time equivalent) |
| **Stages** | Infant → Toddler → Child → Teen → Adult |
| **Adult children** | Become available as companions (unique abilities) or managers (estate automation) |
| **Inheritance** | Children inherit partial stats from both parents |

### Child Bonuses by Stage

| Stage | Bonus |
|---|---|
| **Infant** | +5% affection gain with the parent NPC |
| **Toddler** | +10% gold from the parent's estate |
| **Child** | +1 passive stat bonus (player's choice: HP, damage, speed) |
| **Teen** | Can be assigned as a worker (high efficiency) |
| **Adult** | Becomes a companion or manager (player's choice) |

### Why Children Work

| Design Aspect | Justification |
|---|---|
| **Long-term goal** | Children take time to grow. The player invests in a future payoff. |
| **Emotional attachment** | Naming children, watching them grow, choosing their path — creates investment. |
| **Mechanical benefit** | Adult children are powerful companions/managers. The payoff is real. |
| **Legacy** | The player's family tree grows across the game. Multiple wives = multiple family lines. |
| **No micromanagement** | Children grow automatically. Player only makes decisions at milestones ( Teen → Adult choice). |

### Multiple Wives & Estates

The player can have **up to 3 wives** (configurable). Each wife has:
- Her own estate (separate from others)
- Her own children (separate family line)
- Her own affection track (independent of other wives)
- Her own marriage quest chain

**Why limit to 3?**
- More than 3 estates would overwhelm the player with management
- 3 wives = 3 family lines = enough for a dynasty without excessive complexity
- Each wife represents a different faction/story path, encouraging diversity

### NPC Staff for Estates

Estates require hired staff to function. Staff are hired from the Tavern or found through quests:

| Staff Role | Function | Hire Cost | Where to Find |
|---|---|---|---|
| **Farmer** | Generates food/resources | 100g | Tavern Lv1 |
| **Cook** | Reduces household costs by 10% (estate breaks even at lower tier) | 150g | Tavern Lv2 |
| **Guard** | Protects estate (prevents random events) | 200g | Arena Lv1 |
| **Nurse** | +1 child growth speed | 250g | Chapel Lv1 |
| **Tutor** | +1 child stat bonus | 300g | Library Lv2 |
| **Steward** | Manages estate automation | 400g | Town Hall Lv1 |

### Family & Estate Quests

Each estate generates ongoing quests that tie the player back to their family between combat runs. These quests appear in the quest log when the player visits the estate or talks to their wife.

**Fixed Quests** (one-time, story-driven):
- Unique to each NPC wife based on her personality and backstory
- Unlock special items, dialogue, or estate upgrades
- Example: "Gareth's Lost Hammer" → Find his ancestral weapon in a combat stage. Reward: Blacksmith crafting discount + affection.
- Example: "Elara's Garden" → Gather rare seeds from 3 different stages. Reward: +1 child growth stage + unique dialogue.

**Random Quests** (repeatable, rotating):
- The estate generates a random quest from a pool every 3-5 combat runs
- Scale with estate tier: higher tier = more quest variety and better rewards
- Tied to household needs: food shortages, staff problems, children's requests, neighbor disputes
- Example: "The kids found a stray cat. Bring it food." → 10 gold, +affection.
- Example: "A traveler needs shelter. Clear the road of bandits." → 50 gold, +reputation.
- Example: "The Cook wants exotic spices. Collect 5 from the Desert stage." → Cooking recipe unlock.

**Quest Pool by Estate Tier:**

| Tier | Fixed Quests | Random Pool | Frequency |
|---|---|---|---|
| **1 (Homestead)** | 1 | 3 basic quests | 1 per 5 runs |
| **2 (Farmstead)** | 2 | 5 quests | 1 per 4 runs |
| **3 (Manor)** | 3 | 8 quests | 1 per 3 runs |
| **4 (Estate)** | 4 | 12 quests | 1 per 2 runs |
| **5 (Dynasty)** | 5 | 15 quests | 1 per run |

**Why Family Quests Work:**
- Gives the player a reason to check in with each estate between runs
- Creates narrative hooks that make the family feel alive (the kids need things, the wife has plans)
- Rewards are small but meaningful — affection, unique items, cosmetic unlocks, dialogue
- Random quests prevent the estate from feeling stale after the fixed quests are done
- Higher tiers reward investment with more content density

### Estate Data Structure

```json
"estates": [
  {
    "id": "estate_gareth",
    "wifeId": "blacksmith",
    "tier": 3,
    "name": "Ironhand Manor",
    "income": 30,
    "staff": ["farmer", "cook", "guard"],
    "children": [
      { "name": "Forge", "stage": "child", "age": 15, "bonus": "damage" }
    ],
    "upgrades": {
      "farmlands": 2,
      "workshop": 1,
      "quarters": 1
    }
  }
]
```

### Estate → Affection & Reputation Feedback Loop

Upgrading an estate raises affection with the resident NPC:

| Estate Upgrade | Affection Gain | Reputation Gain |
|---|---|---|
| Tier 1 → 2 | +1 affection | +5 with NPC's faction |
| Tier 2 → 3 | +1 affection | +10 with NPC's faction |
| Tier 3 → 4 | +1 affection (post-marriage) | +15 with NPC's faction |
| Tier 4 → 5 | +1 affection (post-marriage) | +20 with NPC's faction |
| Hire new staff | +0.5 affection | — |
| Add child | +1 affection | +10 with NPC's faction |

This creates a virtuous cycle: **upgrade estate → raise affection → unlock new dialogue/quests → earn reputation → unlock new buildings → upgrade estate further.**

---

## 12. Macro Progression & Game Loop

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

## 13. Data Flow Between Systems

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

## 14. Content File Architecture

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
| 8 | `content/mechanics.json` | Movement patterns, telegraph templates (6 shapes), enemy attacks, stage environmental events, buffs/debuffs | ~200 lines | Combat Module, TelegraphSystem |
| 9 | `content/audio_config.json` | Sound event → synth parameter mapping | ~120 lines | Audio Manager |
| 10 | `content/ui_config.json` | UI text, colors, layout config | ~80 lines | UI Manager |
| 11 | `content/npcs.json` | NPC definitions: dialogue, trust, shops, requests, combat companions | ~300 lines | NPC Module, Combat Module |
| 12 | `content/factions.json` | Faction definitions: ranks, rewards, conflicts | ~60 lines | Faction Module |
| 13 | `content/skills.json` | Skill tree: nodes, requirements, effects | ~150 lines | Skill Module |
| 14 | `content/quests.json` | Quest definitions: objectives, rewards, chains | ~200 lines | Quest Module |
| 15 | `content/buildings.json` | Town building definitions: two-phase costs, upgrades, worker requirements, unlocks | ~150 lines | Town Module |
| 16 | `content/items.json` | Equipment and consumable definitions | ~100 lines | Inventory Module, Combat Module |
| 17 | `content/unlocks.json` | Unlock conditions and dependencies | ~80 lines | Unlock Module |
| 18 | `content/story.json` | Main story dialogue, narrator text, lore entries | ~150 lines | Quest Module, NPC Module |
| 19 | `content/estates.json` | Estate definitions: tiers, costs, income, staff, children config | ~100 lines | Estate Module |

### Why Separate Content Files Per System

| Alternative | Problem | Our Approach |
|---|---|---|
| One giant JSON | Impossible to find anything. Merge conflicts. Loading entire file for one feature. | One file per system. Each module loads only what it needs. |
| Embedded in engine | Can't change content without touching code. Can't share content between games. | External files. Same engine, different content = different game. |
| Database | Overkill for a single-player game. Adds complexity. | JSON files. Simple, human-readable, version-controllable. |

---

## 15. Gaps, Conflicts & Open Questions

### Identified Gaps

**Gap 1: No save data schema versioning strategy.**
When the game updates and the save format changes, old saves could break. We need a migration system.
- **Question:** Should we use semantic versioning on the save format and include migration functions per version bump? Or is a "reset save on major version change" acceptable?

**Gap 2: Combat engine currently has no "session result" output.** (RESOLVED)
The existing combat engine runs until game over and shows stats, but doesn't export a structured result object. **GameManager** now provides `buildCombatResult()` and `endCombatSession(result)` that packages gold, XP, kills, items, time survived, and quest-relevant events into a standard format. See `14_game_manager.md`.

**Gap 3: No resource types beyond gold.** (PARTIALLY RESOLVED)
The town uses wood, stone, herbs, and gold. **GameManager** now supports multi-resource tracking (`addResource()`, `spendResource()`, `getResource()`) with 5 resource types: gold, wood, stone, herbs, ore. Resource *earning* (drops, buildings, quests) will be implemented when town/quest modules are built. The store and API are ready.

**Gap 4: No inventory management UI.**
Items can be earned, bought, and found. But there's no inventory screen to manage equipment and consumables.
- **Action:** Design an inventory UI module (grid-based or list-based) accessible from the town.

**Gap 5a: Rare drop gacha protection.** (RESOLVED — §06 Pickups)
Rare drops use per-STAGE-clear protection: 1% base → ramps to 99% by clear 7. Predictable supply, no frustration.

**Gap 5b: Inventory gift/surplus system.** Players can gift unneeded items to estates (affection + dialogue), Blacksmith (recycling → materials), Market (selling → gold), or Library (studying → skill XP). An algorithm generates surplus quests ("Blacksmith needs 3 iron swords") based on high-stock or low-level items. Max 3 estate quests visible at once, with a "Visit All Estates" prompt every 5 runs.

**Gap 5b: No equipment system in the combat engine.**
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

**Gap 11: Companion damage tuning could trivialize combat.** (RESOLVED — D1/D5)
Companions are now bound 1:1 to weapon slots (W1=C1, W2=C2, W3=C3). Each companion buffs and evolves only its paired weapon. This naturally limits total DPS increase — a Master-tier companion at 40% makes W1 significantly stronger but doesn't affect W2 or W3. Combined with the 3-slot cap, total DPS increase is bounded at ~40% per weapon, not multiplicative across all weapons.

**Gap 12: Dead weight NPCs could feel pointless if affection bonuses are too small.**
If bringing Ani (10% damage) only gives 2x affection gain but costs a party slot, players may never bother.
- **Action:** Dead weight affection bonus should be significant (3x multiplier) and dead weight NPCs should have unique quest lines that REQUIRE them in the party. This makes bringing them a deliberate choice, not an oversight.

**Gap 13: Estate upkeep at Tier 1-2 could feel like a burden before it breaks even.**
A Tier 1 Homestead costs the player ~10g/run in upkeep until upgraded. If the player builds 3 estates at Tier 1, that's 30g/run drained — noticeable in early game.
- **Action:** Tier 1 upkeep should be very low (5g/run) so it's a minor cost. The message should be: "Your investment is growing. Upgrade to let the estate take care of itself." Tier 2 should break even so the player feels the transition from burden to self-sufficiency.

**Gap 14: Children growth speed could feel too slow or too fast.**
1 child per 10 runs = ~50 minutes of play per growth stage. Too slow for impatient players, too fast for those who want to savor it.
- **Action:** Make child growth speed configurable (game speed option). Also tie growth to estate upgrades (Nurse speeds growth, Tutor improves child quality). Let the player influence the pace.

**Gap 15: Multiple wives = multiple self-sustaining households.**
A player with 3 wives has 3 estates covering 3 families. Each family is self-sufficient, but the initial investment (building 3 Tier 3+ estates) is massive.
- **Action:** This is intentional and balanced by design. The player spends significant gold and resources upfront to build each estate. The payoff is that all 3 families are cared for without further gold drain. The player's gold stays focused on their own progression — equipment, town, skill tree. Multiple families are a prestige achievement, not a gold generator.

**Gap 16: TelegraphSystem and BossIntroSystem.** (RESOLVED) The combat engine's boss telegraph is hardcoded (warning zone in `Renderer._drawBossWarningZone()`) and bosses spawn without introduction sequences. External content files cannot define new telegraph shapes, attack timings, or boss intro animations. The stage data's `bossConfig.announcement[]` is never rendered. **Action:** See `13_telegraph_and_boss_intro.md` for the full design of: (a) a data-driven TelegraphSystem supporting 6 shape types (rectangle, circle, cone, line, ring, cross), (b) a boss introduction sequence with pause/overlay/resume, (c) stage environmental event telegraphs (falling debris, lava pools), and (d) the announcement system for pre-boss tension text.

### Identified Conflicts

**Conflict 1: Gold economy balance.** (RESOLVED)
The two-phase economy solves this. Gold only funds Phase 1 structures (~790g total, achievable in 3-5 runs). Phase 2 structures cost worker-gathered resources, not gold. Gold stays valuable for equipment, consumables, and NPC managers — never inflated by mandatory city costs.

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

**Q2: How should the transition between town and combat work?** (RESOLVED — Unified Location Hierarchy)
Options: (a) Seamless transition (camera zooms into the stage). (b) Loading screen with lore text. (c) World map as an intermediate screen.
- **DECIDED:** No separate world map. Reuse the city/town navigation interface for all areas. The location hierarchy (City → Districts → Sub-Districts → Buildings) is data-driven — the same system represents the town, the Graveyard region, the Forest, etc. Each area has its own location tree, NPCs, backgrounds, and ambient sounds. The player navigates between areas using the same breadcrumb + back + side menu interface. This eliminates a separate world map screen and keeps the UX consistent.

**Q2b: What are the stage length tiers?** (RESOLVED — D3 DECIDED)
Three stage tiers: 3min (quick grind), 5min (baseline story), 10min (highlight story). Frontloaded weapons work well for 3min but scale poorly for 10min. Scaling weapons are weak at start but excel at 10min. 5min is a mix. See `05_stages_spec.md` §13 for full scaling details.

**Q3: How should NPC combat companions work?** (RESOLVED — D1/D2/D5)
NPCs can accompany the player in combat as invulnerable support companions. They deal reduced damage and attack slower than the player. Survival is 100% on the player character — NPCs cannot die, take damage, or be targeted by enemies. 3 companion slots, each bound 1:1 to a weapon slot (W1=C1, W2=C2, W3=C3). Companions buff and evolve their paired weapon. NPC weapons show in the weapon bar as smaller icons with colored NPC border. NPCs auto-level to match the player's current level, scaling at 10-50% of player damage depending on trust tier. No manual NPC upgrade management. Some NPCs are intentionally weak ("dead weight") and take up party slots for affection building or quest requirements. See Section 6.5 for the full design.

**⚠️ Adjacency System (Planned — See `32_adjacency_system_spec.md`):**

The 1:1 binding (C1↔W1, C2↔W2, C3↔W3) is the foundation for a Backpack Battles-style adjacency system planned for late-game scaling. In the final game, items will have **tags** (fire, physical, vuln, etc.) that buff adjacent items. The grid layout will be:

```
C1 ↔ W1 ↔ W2 ↔ W3 ↔ C2 ↔ C3
```

W2 and W3 receive the most buffs (2 neighbors each). Companion-weapon evolution will require adjacency + correct tags + Lv7. This creates the "ridiculous" exponential scaling Vampire Survivors is known for. **Do not design weapon/companion data in a way that blocks this — all items must support a `tags` array in their data format.** See `32_adjacency_system_spec.md` for full details.

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
- **Recommendation:** A short scripted tutorial quest chain: "Survive 60 seconds" → "Return to town" → "Build the Blacksmith" → "Talk to Gareth" → "Complete his request" → "Explore the Graveyard." This naturally introduces all systems.

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

## Appendix A2: Endgame Sandbox Mode

The sandbox is an endgame mode for build testing and theorycrafting. It reuses ALL existing assets (stages, enemies, weapons, companions) with customizable difficulty. Players can:
- Set weapon/companion levels freely
- Adjust enemy HP/damage/spawn rate (0.5× to 3×)
- See real-time damage numbers and DPS counters
- Compare builds side-by-side
- Track personal records

See `30_endgame_sandbox_spec.md` for full design.

---

## Appendix A3: Grand Bazaar Shop

The Grand Bazaar is the game's single shop, accessible from the town screen. It has 4 tabs: Combat Consumables, Companion & Adventurer, Estate & Productivity, and Gifts & Romance. Items unlock based on town level. Prices are scaled to the economy (25-15,000g range).

See `31_grand_bazaar_spec.md` for full design.

---

The sandbox is an endgame mode for build testing and theorycrafting. It reuses ALL existing assets (stages, enemies, weapons, companions) with customizable difficulty. Players can:
- Set weapon/companion levels freely
- Adjust enemy HP/damage/spawn rate (0.5× to 3×)
- See real-time damage numbers and DPS counters
- Compare builds side-by-side
- Track personal records

See `30_endgame_sandbox_spec.md` for full design.

---

## Appendix B: How This Relates to extract_engine.html

The `extract_engine.html` plan describes how to modularize the combat engine from a single HTML file into engine + external content files. This framework document extends that by:

1. **The combat engine becomes `CombatModule`** — one of 9 feature modules
2. **Content files expand from 10 to 18** — adding NPCs, factions, skills, quests, buildings, items, unlocks, and story
3. **A centralized store is introduced** — all modules read/write one save file
4. **The engine's data loading is extended** — it reads `store.player.baseStats` (which includes skill tree bonuses) and writes `store.town.resources.gold` on session end
5. **New UI modules are needed** — location view (reused for town/world), NPC dialogue, skill tree, inventory

The extraction plan's Phase 1-5 (externalizing combat data) becomes a prerequisite for this framework's implementation. The combat engine must be modular before it can be wrapped in a CombatModule.

---

*Modularity Engine Game Framework v0.4.0 — Updated August 26, 2026*
