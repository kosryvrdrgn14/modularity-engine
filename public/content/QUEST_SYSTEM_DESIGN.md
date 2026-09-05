# Quest, Flag & Lock/Unlock System — Design Document

**Version:** 1.5  
**Date:** September 5, 2026  
**Status:** Phase 2 (gating enforcement) complete — ready for Phase 3  

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
        "companions": ["dog"],
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
    "weapon_area_pulse": { "unlock_flag": "sq_02_arena_challenge" },
    "w4_flame_wave": { "unlock_flag": "chapter2_unlocked" },
    "w5_arcane_bolt": { "unlock_flag": "met_mage" },
    "w6_dagger": { "unlock_flag": "chapter3_unlocked" },
    "w7_sword": { "unlock_flag": "forge_access" },
    "w8_claymore": { "unlock_flag": "guild_joined" }
  },
  "companions": {
    "dog": { "unlock_flag": "mq_01_stranger_arrives" },
    "archer": { "unlock_flag": "guild_joined" },
    "mage": { "unlock_flag": "met_mage" },
    "knight": { "unlock_flag": "chapter2_unlocked" },
    "healer": { "unlock_flag": "herbalist_ingredient_found" }
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
    "cute_girl": { "unlock_flag": "town_camp_upgraded" },
    "hunter": { "unlock_flag": "guild_joined" },
    "grave_digger": { "unlock_flag": "graveyard_cleared" }
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

---

## 12. Issue Resolution Log

| # | Original Issue | Resolution |
|---|---|---|
| 1 | Double-listen risk (19 listeners in Game constructor) | QuestSystem stores handler refs in `_handlers{}`. On `destroy()`, calls `eventBus.off(event, handler)` for each. Game.destroy() calls `questSystem.destroy()` before reinstantiating. |
| 2 | Flag setting bypass in progression.js:344 | `progression.process_combat_result()` now calls `questSystem.setFlag()` instead of writing `store.flags` directly. The `set_flag()` method on gameManager is deprecated for quest-relevant flags — questSystem.setFlag() is the single entry point. |
| 3 | Content gate collision (3 different check paths) | `content_gates.json` is the single source of truth. Old `unlockCondition` fields on NPC/location JSON are preserved for backward compat but `isContentUnlocked()` takes priority. locationManager.js and townContent.js both route through `questSystem.isContentUnlocked()`. |
| 4 | Loadout null safety | `getAvailableWeapons()` / `getAvailableCompanions()` include `if (!this.questSystem)` guard returning full list. No crash on early load. |
| 5 | Hardcoded quest card | Replaced with `questSystem.getActiveQuests().slice(0, 3)` dynamic render. Empty state shows "No active quests" placeholder. |
| 6 | Time event clock drift | `processPendingTimeEvents()` compares `fireAt <= Date.now()`. Events with `fireAt` more than 7 days in the future are ignored (clock rollback protection). Events older than 30 days are auto-purged. |
| 7 | Save migration | `save_version` bumped to 3. `_migrate()` v3 adds: `quests.objectives = {}`, `quests.timeEvents = []`, `quests.failed = []`. |
| 8 | Loading order | `systems/quest.js` script tag placed after `systems/progression.js` in game2.html. QuestSystem.init() is called from Game constructor AFTER DataManager.loadAll() resolves. |
| 9 | EventBus `off()` method | Already exists at core.js:17. No action needed. |
| 10 | Debug log leaks | `selectUpgrade` debug logs at game.js:234,245,256 flagged for removal. New quest debug logs gated behind `if (window.__QUEST_DEBUG__)`. |
| 11 | COMPANION_DATA global | Gate filtering only happens in `getAvailableCompanions()` at UI level. `COMPANION_DATA` global remains unmodified — companion system continues to read full data. |
| 12 | Save version bump | Added `_migrate()` case for v < 3 that initializes new quest fields with safe defaults. |

---

## 12.5 Phase 0.5 — Scaffold Update (2026-09-05)

Applied after reviewing the first real story JSON against the Phase 0 skeleton:

| # | Fix | Detail |
|---|---|---|
| S1 | `kill_count` payload mismatch | Death events emit `{entity, killer, position}`. Handler now reads `entity.enemyData.id` (falls back to `enemyId`/`enemyId` prop/entity type) |
| S2 | `complete_stage` robustness | Accepts `target` (canonical) or `stage_id` alias; requires `stage_completed !== false` so lost runs don't count |
| S3 | Unlock handling in `completeQuest` | `stages` → `unlock_stage()`; `regions` → `unlockRegion()` + `region_<id>_unlocked` flag; `locations` → `location_unlocked_<id>` flag (was wrongly calling `unlock_stage`); `time_events` accepted at quest top level OR nested in `unlocks_on_complete` |
| S4 | Objective emitters wired | `npc:talked` (from `TownContent.openDialogue`) → `talk_to`; `location:navigated` (from `LocationManager.navigateTo`) → `reach_location`. Objective dispatch refactored to one generic `_onObjectiveEvent(type, data)` |
| S5 | Save migration v3 | `_createDefault` → `save_version: 3` with `quests.failed/objectives/timeEvents`; `_migrate()` v3 case initializes the new quest fields on existing saves |
| S6 | `quest:available` spam guard | `_reevaluateAvailability` tracks last-emitted ids and only emits on state change |
| S7 | Gates aligned to story flags | `content_gates.json` now references the story flags (`met_stranger`, `graveyard_cleared`, `met_mage`, `shadow_fallen`, …). Added `regions` category. No code reads gates yet (Phase 2) |
| S8 | Schema doc updated | `quests.json` `_schema` documents `stage_id` alias, nested time_events, `stages[]`/`regions[]` unlock keys |
| S9 | Hardcoded stage id in results | `_buildResult` call now reads `session.selected_stage_id` instead of always `'stage_graveyard'` — required for `complete_stage` objectives on other stages |

**Objective event map (final):**

| Objective type | Event | Payload |
|---|---|---|
| `kill_count` | `death` | `{ entity, killer, position }` (match `entity.enemyData.id`) |
| `complete_stage` | `combat:sessionEnd` | `{ stageId, stage_completed, … }` |
| `talk_to` | `npc:talked` | `{ npcId }` |
| `reach_location` | `location:navigated` | `{ locationId, regionId }` |

---

## 12.75 Phase 0.75 — Single-Source Gates + Quest Schema (2026-09-05)

Applied after the feasibility review (roadblocks R2 + R7):

| # | Fix | Detail |
|---|---|---|
| R2 | **Gates auto-derived from quests** | `QuestSystem._buildDerivedGates()` scans every quest's `unlocks_on_complete` and builds the content→granting-quest map at load. `isContentUnlocked()` is now: quest-granted content unlocks when ANY granting quest completes (authoritative) → explicit `content_gates.json` rules apply only to non-quest content → `temp_disable_flag` applies to any source. `getUnlockedContent()` returns the union of derived + explicit ids. Story authors write ONE file (quests.json); gates can never drift |
| R7 | **`schemas/quest.json` created** | Draft-07 schema matching existing schema style (enemy/stage/npc/…). Covers quest, objectives (type enum + target/count/tier), unlocks, time_events, rewards. The web-tool validator and the game validate against the same contract |
| — | **content_gates.json pruned** | Now the OVERRIDE layer only: `cute_girl → town_camp_upgraded` (non-quest game gate) + 2 dialogue-branch gates. All weapon/companion/stage/region/location gates removed (auto-derived). Embedded fallback synced |

**Note on temp-disable:** the mechanism is supported in code (`temp_disable_flag`) and unit-tested, but no NPC uses it yet. Deliberate — mq_01's `stranger_scouting` time event would hide Elder Rowan and stall mq_04 if it fires before the player reports back. Revisit when time events tick live (Phase 3).

---

## 12.9 Phase 1 — Player-Facing Quest Layer (2026-09-05)

Implemented the town quest panel and acceptance flow:

| Item | Detail |
|---|---|
| **Quest panel** | `TownContent._renderQuestPanel()` replaces the hardcoded "Clear the Graveyard" card. Sections: Available (📜 + Accept button) → Active (⚔️ live objective progress `current/required` with ✅/⬜ ticks) → Recently completed (🏆 compact) |
| **Acceptance flow** | Accept button → `questSystem.startQuest()` → panel refreshes → dock badge decrements |
| **Live refresh** | TownContent listens to `quest:started`, `quest:objective_progress`, `quest:completed`, `quest:available` and re-renders the panel + dock badge without disturbing the NPC list |
| **Auto-complete** | In `_onObjectiveEvent`, a quest auto-completes when its last objective finishes (completions collected then applied after the loop to avoid mid-iteration mutation). Rewards + unlocks + next-quest availability chain immediately |
| **Story Mode wiring** | `_startStoryMode` calls `townScreen.setQuestSystem(questSystem)` after init; TownScreen forwards to TownContent. Dev/Test-Town mode shows a muted "Available in Story Mode" placeholder |
| **Dock badge** | NPCs tab badge shows the count of quests ready to accept |
| **Styling** | `quest-available` (green border), `quest-active` (gold left edge), `quest-completed` (dimmed), accept button, objective lines |

**Design decision — auto-complete:** quests complete the moment their last objective is done (no manual turn-in step). The story uses no "return to quest giver" pattern, so this keeps the flow tight: talk/fight → reward + unlock → next quest available. If turn-in quests are ever wanted, add a `turn_in: "npc_id"` objective type in Phase 5+.

**Backlog (user-requested):** unlock notifications — when a quest grants a weapon/companion/region, show a toast/banner ("New weapon unlocked: Orbit!") so players *see* what they earned. Currently unlocks are only visible via the loadout/panel. Candidate hook: `quest:completed` listener in a small notification UI (Phase 4 polish or alongside web tools).

---

## 12.95 Phase 2 — Gating Enforcement (2026-09-05)

The gate rules existed since Phase 0.75 — this phase wires the UI to *obey* them:

| # | Integration | Detail |
|---|---|---|
| 1 | **Loadout filtering** | `getAvailableWeapons()` / `getAvailableCompanions()` filter through `isContentUnlocked()` when a quest system is attached. Fresh story start: only `w1_projectile` (companions list empty until dog unlocks via mq_01) |
| 2 | **Forwarding** | `TownScreen.setQuestSystem()` also forwards to `loadoutScreen` and sets `locationManager.questSystem` |
| 3 | **NPC panel filter** | NPCs sidebar hides gate-locked NPCs (Story Mode); explicit `unlockCondition` checks remain as fallback |
| 4 | **Region gating** | `LocationManager.switchRegion()` refuses locked regions; town swipe/arrows/keyboard play a 'back' sound and stay put instead of transitioning. Regions unlock via quests (graveyard ← mq_01, forest ← mq_04) |
| 5 | **Dev mode preserved** | No quest system attached (Test Town / Stage Select dev) → all content available, regions unrestricted |

---

## 13. Scaffolding Simulation — Resolved Plan

### New Issues Found After Resolution

| # | Issue | Severity | Fix |
|---|---|---|---|
| R1 | **QuestSystem depends on EventBus, gameManager, dataManager** — if any is null at init, questSystem crashes | 🟡 Medium | `init()` must null-check all three, log warning if missing, enter degraded mode (all content unlocked) |
| R2 | **questSystem.setFlag() called before questSystem.init()** — progression.js may process combat results before Game constructor finishes | 🟡 Medium | Add `_initialized` flag. `setFlag()` queues changes if not initialized, replays on init. |
| R3 | **content_gates.json references content IDs that may not exist in DataManager** — e.g. `w2_orbit` gate exists but weapon data might not be loaded yet | 🟢 Low | `isContentUnlocked()` silently returns true for unknown content IDs (fail-open) |
| R4 | **Double-set flag protection** — `setFlag('met_stranger', true)` called twice emits two events, two re-evaluations | 🟢 Low | Guard: `if (this.gameManager.get_flag(flag) === value) return` (skip no-op sets) |
| R5 | **Quest objective types need a registry** — `kill_count`, `talk_to`, `complete_stage` are hardcoded type strings | 🟡 Medium | Create `_objectiveHandlers{}` map in QuestSystem. Each handler is a function. Unknown types log error. |
| R6 | **Time events fire silently on reload** — player may not notice NPC vanished until they visit town | 🟢 Low | Emit `quest:time_event` event so UI can show notification |
