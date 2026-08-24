# Game Manager Specification

> **Version:** 1.0
> **Date:** August 24, 2026
> **Related:** `game_frame.md` (centralized store design), `extract_engine.html` (engine extraction), `13_telegraph_and_boss_intro.md`
> **Implements:** Centralized data store, resource tracking, combat session results, module event bus

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Architecture](#2-architecture)
3. [Save Data Schema](#3-save-data-schema)
4. [GameManager Class API](#4-gamemanager-class-api)
5. [Combat Session Result Interface](#5-combat-session-result-interface)
6. [Resource Tracking](#6-resource-tracking)
7. [Module Event Bus](#7-module-event-bus)
8. [Save/Load System](#8-saveload-system)
9. [Integration Points](#9-integration-points)
10. [Migration Strategy](#10-migration-strategy)

---

## 1. Purpose

The Game Manager is the **single source of truth** for all player progress. It:

- Stores all persistent data (gold, items, quests, NPCs, buildings, skills)
- Tracks resources across combat runs and town visits
- Produces structured combat session results
- Routes events between feature modules (combat ↔ town ↔ NPCs ↔ quests)
- Handles save/load to localStorage
- Manages save format versioning and migration

Every feature module reads from and writes to the Game Manager. No module owns player progress — the Game Manager does.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GAME MANAGER                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Combat   │  │   Town   │  │   NPCs   │  │  Quests  │  │
│  │  Module   │  │  Module  │  │  Module  │  │  Module  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │                                   │
│              ┌───────────┴───────────┐                      │
│              │   Central Store       │                      │
│              │   (save_data.json)    │                      │
│              └───────────┬───────────┘                      │
│                          │                                   │
│              ┌───────────┴───────────┐                      │
│              │   Event Bus           │                      │
│              │   (cross-module)      │                      │
│              └───────────┬───────────┘                      │
│                          │                                   │
│              ┌───────────┴───────────┐                      │
│              │   Save/Load           │                      │
│              │   (localStorage)      │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

| Principle | Implementation |
|---|---|
| **Single source of truth** | One `store` object. All modules read/write through GameManager methods. |
| **Module isolation** | Modules don't call each other directly. They emit events; GameManager routes them. |
| **Optimistic writes** | Modules write to the in-memory store immediately. Save happens on explicit call or interval. |
| **Versioned schema** | Save data has a `version` field. Migration functions upgrade old saves. |
| **Atomic session results** | Combat produces a single `CombatResult` object. GameManager processes it atomically. |

---

## 3. Save Data Schema

```javascript
const DEFAULT_SAVE = {
  version: 1,
  
  meta: {
    createdAt: Date.now(),
    lastSaved: Date.now(),
    lastPlayed: Date.now(),
    totalPlayTime: 0,       // seconds
    prestigeCount: 0,
  },

  player: {
    name: "Survivor",
    level: 1,
    xp: 0,
    totalGold: 0,
    totalKills: 0,
    totalRuns: 0,
    baseStats: {
      maxHealth: 100,
      moveSpeed: 200,
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      pickupRadius: 50,
    },
    skillBonuses: {},        // computed from skill tree
  },

  combat: {
    unlockedWeapons: ["w1_projectile"],
    weaponLevels: {},
    lastRunStats: null,
    bestRunStats: null,
    runHistory: [],          // last 10 runs
  },

  skills: {
    unlocked: [],
    skillPoints: 0,
    totalPointsEarned: 0,
  },

  town: {
    phase: 1,
    population: 0,
    popCap: 5,
    buildings: {},
    resources: {
      gold: 0,
      wood: 0,
      stone: 0,
      herbs: 0,
      ore: 0,
    },
    workers: {
      farmers: 0,
      miners: 0,
      builders: 0,
      scholars: 0,
      masons: 0,
      idle: 0,
      assignments: {},
    },
    managers: [],
    upgrades: {},
  },

  npcs: {
    met: [],
    relationships: {},
    completedDialogues: [],
    activeRequests: [],
    companions: [],
    partySlots: 2,
  },

  factions: {
    wanderers_guild: { reputation: 0, rank: "unknown" },
    shadow_covenant: { reputation: 0, rank: "unknown" },
    forge_brotherhood: { reputation: 0, rank: "unknown" },
  },

  quests: {
    active: [],
    completed: [],
    failed: [],
    available: [],
    estateQueue: [],         // queued estate quests (max 3 visible)
  },

  unlocks: {
    stages: ["stage_graveyard"],
    items: [],
    abilities: [],
    features: ["town_basic", "combat_basic"],
    characters: ["survivor"],
  },

  estates: [],

  family: {
    wives: [],
    children: [],
    familyTree: {},
  },

  inventory: {
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
      relic: null,
    },
    consumables: [],
    maxSlots: 24,
    surplus: [],             // items available for gifting
  },

  flags: {},                 // arbitrary boolean flags for unlock conditions
};
```

---

## 4. GameManager Class API

```javascript
class GameManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.store = null;
    this._autoSaveInterval = null;
    this._dirty = false;
  }

  // ── Lifecycle ──────────────────────────────────
  init()                          // Load save or create default
  save()                          // Write to localStorage
  reset()                         // Wipe save, reload default
  destroy()                       // Stop auto-save, cleanup

  // ── Store Access ───────────────────────────────
  get(path)                       // Read nested value: "town.resources.gold"
  set(path, value)                // Write nested value
  getState()                      // Return full store (read-only copy)

  // ── Resource Tracking ──────────────────────────
  addGold(amount, source)         // Add gold with source tag
  spendGold(amount, source)       // Spend gold, returns false if insufficient
  addResource(type, amount)       // wood, stone, herbs, ore
  spendResource(type, amount)     // Returns false if insufficient
  getResource(type)               // Get current amount

  // ── Combat Session ─────────────────────────────
  startCombatSession(stageId)     // Record combat start
  endCombatSession(result)        // Process CombatResult, update store
  getRunHistory()                 // Last 10 runs
  getBestRun()                    // Best run stats

  // ── Player Progress ────────────────────────────
  addXP(amount)                   // Add XP, check level up
  addSkillPoint()                 // Award skill point
  unlockWeapon(weaponId)          // Add to unlocked weapons
  unlockStage(stageId)            // Add to unlocked stages
  unlockFeature(featureId)        // Add to unlocked features

  // ── Module Events ──────────────────────────────
  on(event, callback)             // Listen to module events
  emit(event, data)               // Emit module event
  reportProgress(questId, type, amount)  // Update quest progress

  // ── Query Helpers ──────────────────────────────
  hasResource(type, amount)       // Check if player has enough
  getEffectiveStats()             // baseStats + skillBonuses + equipment
  getUnlockedWeapons()            // Array of weapon IDs
  getActiveCompanions()           // Array of NPC IDs
  getReputation(factionId)        // Get faction reputation
}
```

---

## 5. Combat Session Result Interface

When a combat session ends, the engine produces a structured `CombatResult`:

```javascript
{
  // Identification
  stageId: "stage_graveyard",
  stageCompleted: false,        // did the player beat the boss?
  
  // Timing
  timeSurvived: 185.3,          // seconds
  gameTimeLimit: 300,            // stage time limit
  
  // Player state at end
  playerLevel: 8,
  playerHp: 45,
  playerMaxHp: 120,
  
  // Combat stats
  kills: 134,
  killsByType: {
    zombie: 62,
    bat: 35,
    skeleton: 22,
    ghost: 10,
    caster: 5,
    boss_gravekeeper: 0,
  },
  damageDealt: 15420,
  damageTaken: 890,
  
  // Rewards
  goldEarned: 156,
  xpEarned: 89,
  itemsFound: [
    { id: "health_potion", count: 3 },
    { id: "iron_ore", count: 5 },
  ],
  
  // Weapons used
  weaponsUsed: ["w1_projectile", "w2_orbit"],
  weaponLevelsEnd: {
    w1_projectile: 4,
    w2_orbit: 2,
  },
  
  // Boss
  bossDefeated: false,
  bossDamageDealt: 0,
  
  // Quest progress
  questEvents: [
    { type: "kill", enemy: "skeleton", count: 22 },
    { type: "survive", time: 185.3 },
    { type: "earn_gold", amount: 156 },
  ],
}
```

### How the Game Manager Processes It

```javascript
endCombatSession(result) {
  const store = this.store;

  // 1. Gold
  store.town.resources.gold += result.goldEarned;
  store.player.totalGold += result.goldEarned;

  // 2. XP
  this.addXP(result.xpEarned);

  // 3. Kill counts
  store.player.totalKills += result.kills;
  store.player.totalRuns += 1;

  // 4. Best run
  if (!store.combat.bestRunStats || 
      result.timeSurvived > store.combat.bestRunStats.timeSurvived) {
    store.combat.bestRunStats = result;
  }

  // 5. Run history (keep last 10)
  store.combat.runHistory.unshift(result);
  if (store.combat.runHistory.length > 10) {
    store.combat.runHistory.pop();
  }

  // 6. Last run
  store.combat.lastRunStats = result;

  // 7. Items
  if (result.itemsFound) {
    for (const item of result.itemsFound) {
      this._addToInventory(item);
    }
  }

  // 8. Quest progress
  for (const event of result.questEvents) {
    this._processQuestEvent(event);
  }

  // 9. Faction reputation
  if (result.bossDefeated) {
    store.factions.wanderers_guild.reputation += 10;
  }

  // 10. Emit events for other modules
  this.eventBus.emit('combat:sessionEnd', result);
  this.eventBus.emit('resources:changed', { gold: store.town.resources.gold });
  this.eventBus.emit('player:progressChanged', { 
    level: store.player.level, 
    totalGold: store.player.totalGold 
  });

  // 11. Save
  this.save();
}
```

---

## 6. Resource Tracking

### Resource Types

| Resource | Earned From | Spent On |
|---|---|---|
| `gold` | Combat kills, gold coins, quest rewards, market sales | Equipment, buildings (Phase 1), NPC managers, consumables |
| `wood` | Farm building, lumber quests, forest stage drops | Building upgrades (Phase 2), estate construction |
| `stone` | Quarry building, mining quests, cave stage drops | Building upgrades (Phase 2), estate construction |
| `herbs` | Garden building, herb gathering quests | Healing items, NPC gifts, alchemy |
| `ore` | Mine building, mining quests | Weapon crafting, equipment upgrades |

### Gold Flow

```
COMBAT RUN
  ├─ Kill enemies → gold coins drop → PickupSystem
  ├─ Boss kill → guaranteed gold drop
  └─ Quest bonus →额外 gold from active quests
       │
       ▼
  CombatResult.goldEarned
       │
       ▼
GameManager.endCombatSession()
  ├─ store.town.resources.gold += goldEarned
  ├─ store.player.totalGold += goldEarned
  └─ eventBus.emit('resources:changed')
       │
       ▼
TOWN VISIT
  ├─ Buy equipment (Blacksmith) → gold decreases
  ├─ Build structures (Phase 1) → gold decreases
  ├─ Hire managers → gold decreases
  ├─ Sell items (Market) → gold increases
  └─ Gift items (Estates) → affection increases, no gold change
       │
       ▼
  store.town.resources.gold reflects current balance
```

### Anti-Inflation Rules

1. **Phase 1 buildings cost gold** (Campfire→Market: ~790g total, 3-5 runs)
2. **Phase 2 buildings cost resources** (not gold) — gold stays valuable for equipment
3. **Estate income covers household costs only** — never adds to player gold
4. **Equipment costs escalate** — late-game items cost 200-500g
5. **NPC managers are gold sinks** — 100-400g each, convenience not mandatory

---

## 7. Module Event Bus

The Game Manager has its own event bus for cross-module communication. This is separate from the combat engine's EventBus (which handles frame-by-frame game events).

### Event Types

| Event | Emitter | Data | Listeners |
|---|---|---|---|
| `combat:sessionEnd` | GameManager | CombatResult | Quest, Faction, NPC, Town modules |
| `combat:bossDefeated` | GameManager | { bossId, stageId } | Unlock, Faction, NPC modules |
| `resources:changed` | GameManager | { gold, wood, stone, herbs, ore } | UI (update displays) |
| `player:levelUp` | GameManager | { level, skillPoint } | Skill, Quest modules |
| `player:progressChanged` | GameManager | { level, totalGold, totalKills } | UI, Achievement modules |
| `quest:completed` | GameManager | { questId, rewards } | NPC, Faction, Unlock modules |
| `quest:progress` | GameManager | { questId, objective, current, target } | UI |
| `npc:relationshipChanged` | GameManager | { npcId, oldValue, newValue } | Quest, UI modules |
| `faction:reputationChanged` | GameManager | { factionId, oldValue, newValue, newRank } | Unlock, UI modules |
| `unlock:stage` | GameManager | { stageId } | UI, World Map |
| `unlock:weapon` | GameManager | { weaponId } | Combat, UI modules |
| `estate:upgraded` | GameManager | { estateId, newTier } | UI, Quest modules |
| `family:childBorn` | GameManager | { childId, wifeId } | UI, Quest modules |
| `save:written` | GameManager | { timestamp } | None (internal) |

---

## 8. Save/Load System

### Storage

- **Key:** `modularity_engine_save`
- **Format:** JSON string in localStorage
- **Size limit:** ~5MB (localStorage limit). Estimated max save: ~50KB with full progression.

### Save Triggers

| Trigger | When |
|---|---|
| **End of combat session** | `endCombatSession()` calls `save()` |
| **Town action** | Building upgrade, NPC interaction, quest completion |
| **Auto-save** | Every 60 seconds if dirty |
| **Page unload** | `beforeunload` event triggers final save |

### Load Triggers

| Trigger | When |
|---|---|
| **Game init** | `GameManager.init()` loads from localStorage |
| **New game** | Creates default save, no localStorage read |

### Migration

```javascript
const MIGRATIONS = {
  1: (data) => {
    // v0 → v1: Add inventory.maxSlots, quests.estateQueue
    data.inventory = data.inventory || {};
    data.inventory.maxSlots = data.inventory.maxSlots || 24;
    data.quests = data.quests || {};
    data.quests.estateQueue = data.quests.estateQueue || [];
    data.version = 1;
    return data;
  },
  // Future: 2: (data) => { ... }
};

function migrateSave(data) {
  const currentVersion = data.version || 0;
  for (let v = currentVersion; v < Object.keys(MIGRATIONS).length; v++) {
    if (MIGRATIONS[v + 1]) {
      data = MIGRATIONS[v + 1](data);
    }
  }
  return data;
}
```

---

## 9. Integration Points

### With game2.html (Current Prototype)

The GameManager plugs into the existing game as a **local-only** store (no full macro progression yet):

```javascript
// In Game constructor:
this.gameManager = new GameManager(this.eventBus);
this.gameManager.init();

// Gold tracking: modify PickupSystem._onEnemyDeath
// Instead of just spawning a visual coin:
onPickupGold(amount) {
  this.gameManager.addGold(amount, 'combat_kill');
}

// Session end: modify Game._handleGameOver
// Instead of just showing stats:
const result = this._buildCombatResult();
this.gameManager.endCombatSession(result);

// HUD: read gold from GameManager
_getStats() {
  return {
    time: ...,
    level: ...,
    kills: ...,
    gold: this.gameManager.getResource('gold'),  // <-- was always 0
  };
}
```

### With Engine Extraction (Future)

When the engine is extracted from game2.html:
1. GameManager becomes the bridge between the combat engine and all other modules
2. The combat engine reads `gameManager.getEffectiveStats()` instead of hardcoded values
3. The combat engine writes `gameManager.endCombatSession(result)` instead of showing a game-over screen
4. The town module reads `gameManager.store.town` for building states
5. The NPC module reads `gameManager.store.npcs` for relationships

### With game_frame.md (Architecture)

The GameManager implements the centralized store described in game_frame.md Section 4. The save data schema matches exactly. The `onCombatEnd(result)` interface matches the spec.

---

## 10. Migration Strategy

### Phase 1: Local Gold Tracking (Now)

Add GameManager to game2.html with:
- Local gold counter (no localStorage)
- Gold display in HUD
- Gold in combat stats
- Basic `addGold()` / `spendGold()` / `getResource()`

### Phase 2: Full Save System (Engine Extraction)

- Add localStorage persistence
- Add save/load on init and game over
- Add migration system
- Add auto-save

### Phase 3: Module Integration (Framework Build)

- Combat writes `CombatResult` to GameManager
- Town reads resources from GameManager
- NPCs read relationships from GameManager
- Quests read progress from GameManager
- Events route between all modules

---

*Game Manager Specification v1.0 — Generated August 24, 2026*
