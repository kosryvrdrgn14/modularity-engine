# Quest, Flag & Lock/Unlock System — Design Document

**Version:** 1.0  
**Date:** September 2, 2026  
**Status:** Draft — pending review  

---

## 1. Overview

This system adds a story-driven quest layer that gates content via flags. The player's progress through main story quests and side quests sets flags that unlock (or temporarily lock) weapons, companions, NPCs, stages, locations, and dialogue branches.

**Design principles:**
- Data-driven: quests, flags, and gates live in JSON files — no hardcoded logic
- Backward-compatible: existing flag/unlock infrastructure is extended, not replaced
- Modular: quest system is a new file (`systems/quest.js`) that plugs into the existing EventBus + gameManager
- Debuggable: every flag change is logged with source context

---

## 2. Current State (What We Already Have)

| Feature | Implementation | Location |
|---|---|---|
| Flag storage | `gameManager.set_flag(key, value)` / `get_flag(key)` | `systems/progression.js:201-203` |
| Weapon unlocks | `unlocked_weapons` array + `unlock_weapon(id)` | `systems/progression.js:292-295` |
| Stage unlocks | `unlocks.stages` array + `unlock_stage(id)` | `systems/progression.js:298-300` |
| Feature unlocks | `unlocks.features` array + `unlock_feature(id)` | `systems/progression.js:303-305` |
| NPC unlock check | `unlockCondition` field checked against flags | `ui/townContent.js:79-80` |
| Location gating | `unlockCondition` field checked against flags | `engine/locationManager.js:41` |
| Post-combat flags | `result.flags_triggered` processed after combat | `systems/progression.js:342-345` |
| Quest storage | `quests: { active: [], completed: [] }` (exists, unused) | `systems/progression.js:68` |

---

## 3. New Data Files

### 3.1 `content/quests.json` — Quest Definitions

```json
{
  "main_quests": [
    {
      "id": "mq_01_stranger_arrives",
      "name": "A Stranger Arrives",
      "chapter": 1,
      "order": 1,
      "type": "main",
      "description": "A wounded traveler stumbles into camp. Help them recover.",
      "objectives": [
        {
          "type": "talk_to",
          "target": "old_man",
          "description": "Speak with the Elder about the stranger"
        },
        {
          "type": "complete_stage",
          "target": "stage_graveyard",
          "tier": "quick",
          "description": "Clear the Graveyard to prove you can fight"
        }
      ],
      "prerequisites": [],
      "unlocks_on_complete": {
        "flags": ["met_stranger", "graveyard_cleared"],
        "weapons": ["w2_orbit"],
        "companions": ["companion_dog"],
        "locations": ["cemetery"],
        "npcs": ["stranger"],
        "dialogue": ["old_man_post_graveyard"]
      },
      "time_events": [
        {
          "trigger": "on_complete",
          "delay_seconds": 1800,
          "flag": "stranger_scouting",
          "description": "Stranger leaves to scout — temporarily unavailable"
        }
      ],
      "rewards": {
        "gold": 100,
        "xp": 50
      }
    }
  ],
  "side_quests": [
    {
      "id": "sq_01_herbalist_request",
      "name": "Herbalist's Request",
      "chapter": 1,
      "order": 10,
      "type": "side",
      "description": "The Herbalist needs rare ingredients from the Graveyard.",
      "objectives": [
        {
          "type": "kill_count",
          "target": "zombie",
          "count": 10,
          "description": "Defeat 10 Zombies"
        }
      ],
      "prerequisites": ["met_herbalist"],
      "unlocks_on_complete": {
        "flags": ["herbalist_ingredient_found"],
        "weapons": [],
        "companions": [],
        "locations": [],
        "npcs": [],
        "dialogue": ["herbalist_grateful"]
      },
      "repeatable": false,
      "rewards": {
        "gold": 50,
        "xp": 25
      }
    }
  ]
}
```

### 3.2 `content/content_gates.json` — Gate Rules

Maps content IDs to the flags/quests required to access them:

```json
{
  "weapons": {
    "w2_orbit": { "unlock_flag": "mq_01_stranger_arrives" },
    "w3_pulse": { "unlock_flag": "sq_02_arena_challenge" },
    "w4_flame_wave": { "unlock_flag": "chapter2_unlocked" },
    "w5_arcane_bolt": { "unlock_flag": "met_mage" }
  },
  "companions": {
    "companion_dog": { "unlock_flag": "mq_01_stranger_arrives" },
    "companion_archer": { "unlock_flag": "guild_joined" }
  },
  "stages": {
    "stage_graveyard": { "unlock_flag": null },
    "stage_graveyard_extended": { "unlock_flag": "graveyard_cleared" },
    "stage_forest": { "unlock_flag": "chapter2_unlocked" }
  },
  "locations": {
    "cemetery": { "unlock_flag": "graveyard_cleared" },
    "crypt": { "unlock_flag": "graveyard_warning" },
    "deep_woods": { "unlock_flag": "chapter2_unlocked" }
  },
  "npcs": {
    "stranger": { "unlock_flag": "met_stranger", "temp_disable_flag": "stranger_scouting" },
    "hunter": { "unlock_flag": "guild_joined" }
  },
  "dialogue_branches": {
    "old_man_post_graveyard": { "unlock_flag": "graveyard_cleared" },
    "herbalist_grateful": { "unlock_flag": "herbalist_ingredient_found" }
  }
}
```

---

## 4. New System: `systems/quest.js`

### 4.1 Responsibilities

1. **Load quest definitions** from `content/quests.json` via DataManager
2. **Track quest state**: active, completed, failed, available
3. **Evaluate prerequisites**: check if all prerequisite flags/quests are met
4. **Track objective progress**: kill counts, stage completions, talk-to targets
5. **Award rewards** and trigger unlocks on completion
6. **Process time events**: delayed flag changes (NPC leaves/returns)
7. **Expose query API** for UI: `getActiveQuests()`, `getAvailableQuests()`, `getQuestProgress(id)`

### 4.2 Quest States

```
available → active → completed
                  → failed (optional)
```

- **available**: prerequisites met, not yet started
- **active**: started, objectives in progress
- **completed**: all objectives done, rewards claimed

### 4.3 EventBus Integration

New events:
| Event | Emitter | Data | Purpose |
|---|---|---|---|
| `quest:available` | QuestSystem | `{ questId }` | Quest became available |
| `quest:started` | QuestSystem | `{ questId }` | Quest accepted |
| `quest:objective_progress` | QuestSystem | `{ questId, objectiveIndex, current, total }` | Progress update |
| `quest:completed` | QuestSystem | `{ questId, rewards }` | Quest finished |
| `quest:flag_set` | QuestSystem | `{ flag, source, value }` | Flag changed (debug) |

Existing events listened to:
| Event | Source | Handler |
|---|---|---|
| `death` | Game | Update kill_count objectives |
| `combat:sessionEnd` | ProgressionSystem | Check stage completion objectives |
| `resources:changed` | ProgressionSystem | (indirect — post-combat) |

### 4.4 Store Shape (extends progression.js)

```javascript
// Inside progression.store.persistent
quests: {
  active: ["mq_01_stranger_arrives"],       // quest IDs
  completed: ["sq_01_herbalist_request"],    // quest IDs
  failed: [],                                // quest IDs
  objectives: {                              // per-quest objective progress
    "mq_01_stranger_arrives": {
      "0": { "current": 1, "required": 1 }, // objective index → progress
      "1": { "current": 0, "required": 1 }
    }
  },
  timeEvents: [                              // pending delayed events
    { "questId": "mq_01", "flag": "stranger_scouting", "fireAt": 1693000000000 }
  ]
}
```

---

## 5. Content Gate Resolver

### 5.1 How It Works

When any system needs to check if content is available, it calls:

```javascript
questSystem.isContentUnlocked(contentType, contentId)
// Returns: true/false

questSystem.getUnlockedContent(contentType)
// Returns: array of unlocked content IDs for a type

questSystem.getAvailableWeapons()  // convenience — replaces loadout's current method
questSystem.getAvailableCompanions()
```

### 5.2 Priority Chain

```
content_gates.json  →  check flag  →  check active quest time_events  →  unlocked?
```

A weapon locked behind flag `met_stranger` is:
- **Locked** if `met_stranger` is false
- **Unlocked** if `met_stranger` is true
- **Temporarily disabled** if `stranger_scouting` flag is also set (for NPCs/companions)

### 5.3 Migration Path

Existing hardcoded unlocks bypass the gate system initially:
- `w1_projectile` — always available (no gate in `content_gates.json`)
- `stage_graveyard` — always available (`unlock_flag: null`)

No existing data needs to change. The gate system layers on top.

---

## 6. Integration Points

### 6.1 Loadout Screen (`ui/loadout.js`)

**Current:** `getAvailableWeapons()` returns ALL weapons from DataManager  
**After:** Returns only weapons where `questSystem.isContentUnlocked('weapons', id)` is true

```javascript
// BEFORE (line 62)
getAvailableWeapons() {
  return this.dataManager?.weapons || [];
}

// AFTER
getAvailableWeapons() {
  if (!this.questSystem) return this.dataManager?.weapons || [];
  return (this.dataManager?.weapons || []).filter(w => 
    this.questSystem.isContentUnlocked('weapons', w.id)
  );
}
```

### 6.2 Town NPCs (`ui/townContent.js`)

**Current:** NPCs checked via `npc.unlockCondition` against flags directly  
**After:** Routed through `questSystem.isContentUnlocked('npcs', npc.id)` which also checks temp disable flags

### 6.3 Location Manager (`engine/locationManager.js`)

**Current:** `loc.locked && !gameManager.get_flag(loc.unlockCondition)`  
**After:** `questSystem.isContentUnlocked('locations', loc.id)` (same logic, centralized)

### 6.4 Post-Combat (`systems/progression.js`)

**Current:** `result.flags_triggered` sets flags  
**After:** Flags set through `questSystem.setFlag(flag, true, source)` which also:
1. Logs the change
2. Re-evaluates quest availability
3. Emits `quest:flag_set` event

### 6.5 Town Panel (`ui/townContent.js`)

**Current:** Hardcoded "Clear the Graveyard" quest card (line 124)  
**After:** Dynamic quest list from `questSystem.getActiveQuests()`

---

## 7. Time Events (NPC Leave/Return)

### 7.1 How They Work

When a quest completes, it can schedule time-based events:

```json
{
  "trigger": "on_complete",
  "delay_seconds": 1800,
  "flag": "stranger_scouting",
  "description": "Stranger leaves to scout"
}
```

This sets `stranger_scouting = true` after 30 minutes. The NPC's gate rule checks both `unlock_flag` AND `temp_disable_flag`:

```json
"stranger": { 
  "unlock_flag": "met_stranger", 
  "temp_disable_flag": "stranger_scouting" 
}
```

A later quest can clear `stranger_scouting` when the NPC "returns."

### 7.2 Storage

Pending time events are stored in `progression.store.persistent.quests.timeEvents[]` with a `fireAt` timestamp. On game load, `questSystem.init()` checks pending events and fires any that have passed.

---

## 8. Save/Load

All quest state lives inside `progression.store.persistent.quests` — automatically persisted by the existing `_save()` mechanism. No new save logic needed.

---

## 9. Debug & Guard Features

### 9.1 Debug Logging

Every flag change is logged:
```javascript
setFlag(flag, value, source = 'unknown') {
  console.log(`[QUEST] Flag: ${flag} = ${value} (source: ${source})`);
  this.gameManager.set_flag(flag, value);
  this.eventBus.emit('quest:flag_set', { flag, value, source });
  this._reevaluateAvailability();
}
```

### 9.2 Console Commands (dev mode)

```javascript
window.QUEST_DEBUG = {
  flags: () => console.table(game.gameManager.store.flags),
  active: () => console.table(questSystem.getActiveQuests()),
  completed: () => console.table(questSystem.getCompletedQuests()),
  unlock: (flag) => questSystem.setFlag(flag, true, 'debug'),
  reset: () => questSystem.resetAll()
};
```

### 9.3 Guards

- **Double-start prevention:** Quest can't be started if already active/completed
- **Invalid flag source:** Flag changes without a `source` parameter log a warning
- **Missing quest definition:** Loading a quest ID not in `quests.json` logs error, skips
- **Time event overflow:** Pending time events older than 7 days are auto-cleared on load

---

## 10. File Impact Summary

| File | Action | What Changes |
|---|---|---|
| `content/quests.json` | **CREATE** | Quest definitions |
| `content/content_gates.json` | **CREATE** | Gate rules mapping content → flags |
| `systems/quest.js` | **CREATE** | Quest system module |
| `game2.html` | **EDIT** | Add `<script>` tag for quest.js |
| `ui/loadout.js` | **EDIT** | Filter weapons/companions through gate system |
| `ui/townContent.js` | **EDIT** | Replace hardcoded quest card, route NPC checks through quest system |
| `engine/locationManager.js` | **EDIT** | Route location checks through quest system |
| `systems/progression.js` | **EDIT** | Route flag changes through quest system, add quest store shape |
| `engine/core.js` | **EDIT** | Add `quest` to DataManager fetch targets |
| `data/embeddedData.js` | **EDIT** | Add quests + gates fallback data |
| `styles.css` | **EDIT** | Quest panel styles (if needed) |

---

## 11. Implementation Phases

### Phase 0: Scaffolding (no behavior change)
1. Create `content/quests.json` with empty structure
2. Create `content/content_gates.json` with current unlocks mapped
3. Create `systems/quest.js` skeleton
4. Add to DataManager + embeddedData fallback
5. Add `<script>` tag to game2.html

### Phase 1: Core Quest System
1. Quest loading and state management
2. Flag routing through quest system
3. Content gate resolver
4. Quest availability evaluation

### Phase 2: Content Gating
1. Update `loadout.js` to filter by gates
2. Update `townContent.js` to use gate system for NPCs
3. Update `locationManager.js` to use gate system
4. Replace hardcoded quest card

### Phase 3: Time Events
1. Delayed flag scheduling
2. Pending event processing on load
3. NPC leave/return flow

### Phase 4: Debug Tools
1. Console commands
2. Debug logging
3. Dev menu integration (if desired)

### Phase 5: Storyline Content
1. User creates basic storyline in `quests.json`
2. Test full flow: quest → flags → unlocks → content availability
