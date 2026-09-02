# Engine-Agnostic Porting Guide

> **Version:** 1.0
> **Date:** August 24, 2026
> **Purpose:** Align the current HTML prototype with Claude's engine-agnostic design principles for eventual Godot port
> **Related:** `game_frame.md`, `14_game_manager.md`, `extract_engine.html`

---

## Table of Contents

1. [Porting Philosophy](#1-porting-philosophy)
2. [Conflict Resolution](#2-conflict-resolution)
3. [Refactored Save Schema](#3-refactored-save-schema)
4. [Engine-Agnostic GameManager](#4-engine-agnostic-gamemanager)
5. [Asset Manifest System](#5-asset-manifest-system)
6. [ID Conventions](#6-id-conventions)
7. [Mode Transition Contracts](#7-mode-transition-contracts)
8. [Global Flags & Counters](#8-global-flags--counters)
9. [What Stays HTML-Only](#9-what-stays-html-only)
10. [Godot Port Checklist](#10-godot-port-checklist)

---

## 1. Porting Philosophy

The HTML prototype is a **reference implementation**, not the final product. Every design decision must satisfy two audiences:

1. **HTML prototype** — must work now in the browser
2. **Godot port** — must translate cleanly without rearchitecting

### The Rule

> If a feature requires browser-specific APIs (localStorage, Canvas2D, Web Audio) to function, the **data and logic** must still be portable even if the **rendering** is not.

This means:
- Game content lives in JSON files (already true)
- Game state is a plain data structure (needs refactoring)
- Rendering is a separate layer that reads from state (mostly true)
- Storage is an interface, not a concrete implementation (needs refactoring)

---

## 2. Conflict Resolution

### Conflict 1: Save Schema — RESOLVE

**Claude's schema (5 keys):**
```json
{ "save_version", "session", "persistent", "flags", "counters" }
```

**Our schema (14+ keys):**
```json
{ "meta", "player", "combat", "skills", "town", "npcs", "factions", "quests", "unlocks", "estates", "family", "inventory", "flags" }
```

**Resolution:** Merge into Claude's 5-key structure. Our detailed sections become sub-keys within `persistent`:

```json
{
  "save_version": 1,
  "session": {
    "current_stage_id": null,
    "run_in_progress": false,
    "run_data": {}
  },
  "persistent": {
    "player": { "level": 1, "xp": 0, "total_gold": 0 },
    "currency": 0,
    "combat": { "unlocked_weapons": [], "best_run": null },
    "skills": { "unlocked": [], "skill_points": 0 },
    "town": { "phase": 1, "buildings": {}, "resources": {} },
    "npcs": { "met": [], "relationships": {} },
    "factions": { "wanderers_guild": { "reputation": 0 } },
    "quests": { "active": [], "completed": [] },
    "unlocks": { "stages": [], "items": [], "features": [] },
    "estates": [],
    "family": { "wives": [], "children": [] },
    "inventory": { "equipment": {}, "consumables": [] }
  },
  "flags": {},
  "counters": {
    "total_kills": 0,
    "total_runs": 0,
    "affection_waifu_1": 0
  }
}
```

**Why this works:** Claude's `session` handles per-run data. Our detailed sections live under `persistent`. `flags` and `counters` are flat key/value as Claude specified. The schema is extensible without adding new top-level keys.

### Conflict 2: localStorage — RESOLVE

**Current:** GameManager reads/writes localStorage directly.

**Fix:** Add a `StorageBackend` interface:

```javascript
// Abstract storage interface
class StorageBackend {
  load(key) { throw new Error('Not implemented'); }
  save(key, data) { throw new Error('Not implemented'); }
}

// HTML implementation
class LocalStorageBackend extends StorageBackend {
  load(key) { return JSON.parse(localStorage.getItem(key)); }
  save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
}

// Godot implementation (future)
class GodotSaveBackend extends StorageBackend {
  load(key) { return Godot FileAccess.open(...); }
  save(key, data) { /* Godot file write */ }
}

// GameManager uses the backend, never touches storage directly
class GameManager {
  constructor(eventBus, backend) {
    this.backend = backend; // injected, not hardcoded
    this.store = null;
  }
  init() {
    this.store = this.backend.load('modularity_engine_save') || this._createDefault();
  }
  save() {
    this.backend.save('modularity_engine_save', this.store);
  }
}
```

**Why this works:** The HTML prototype uses `LocalStorageBackend`. Godot uses `GodotSaveBackend`. GameManager never knows which one it has.

### Conflict 3: Asset Referencing — RESOLVE

**Current:** SVGs inlined as base64 data URIs in `ASSET_MAP`.

**Fix:** Create `asset_manifest.json` with logical keys:

```json
{
  "player": "assets/svg/player.svg",
  "zombie": "assets/svg/zombie.svg",
  "bat": "assets/svg/bat.svg",
  "skeleton": "assets/svg/skeleton.svg",
  "ghost": "assets/svg/ghost.svg",
  "caster": "assets/svg/caster.svg",
  "boss_gravekeeper": "assets/svg/boss.svg",
  "w1_projectile": "assets/svg/w1_projectile.svg",
  "w2_orbit": "assets/svg/w2_orbit.svg",
  "w3_pulse": "assets/svg/w3_pulse.svg",
  "xp_gem_small": "assets/svg/xp_gem_small.svg",
  "xp_gem_large": "assets/svg/xp_gem_large.svg",
  "gold_coin": "assets/svg/gold_coin.svg",
  "screen_wipe": "assets/svg/screen_wipe.svg",
  "magnet": "assets/svg/magnet.svg",
  "weapon_levelup": "assets/svg/weapon_levelup.svg",
  "waifu_01_neutral": "assets/vn/waifu_01/neutral.svg",
  "waifu_01_happy": "assets/vn/waifu_01/happy.svg",
  "waifu_01_sad": "assets/vn/waifu_01/sad.svg"
}
```

**JSON content files reference sprites by logical key:**
```json
{ "id": "zombie", "sprite": "zombie", "hp": 10 }
```

**HTML prototype loads via manifest → fetch. Godot loads via manifest → Godot resource loader.**

### Conflict 4: ID Conventions — RESOLVE

**Current IDs (mostly OK):**
- `w1_projectile`, `w2_orbit`, `w3_area` — OK
- `zombie`, `bat`, `skeleton`, `ghost`, `caster` — OK
- `boss_gravekeeper` — OK
- `stage_graveyard` — OK
- `xp_gem_small`, `gold_coin` — OK

**Issues to fix:**
- Some embedded data uses camelCase: `chargeDuration`, `pauseDuration` → should be `charge_duration`, `pause_duration` in JSON (camelCase OK in JavaScript code, snake_case in data files)

**Rule:** JSON content files use `snake_case` for all IDs and field names. JavaScript code uses `camelCase` for variables and methods. This is the standard cross-engine convention.

### Conflict 5: Mode Transition Contracts — RESOLVE

Claude specifies exact JSON shapes for entering/exiting each mode. We need to define these before building town/VN.

---

## 3. Refactored Save Schema

```json
{
  "save_version": 1,

  "session": {
    "current_stage_id": null,
    "run_in_progress": false,
    "run_data": {
      "time_survived": 0,
      "kills": 0,
      "gold_earned": 0,
      "level_reached": 1
    }
  },

  "persistent": {
    "currency": 0,
    "player": {
      "level": 1,
      "xp": 0,
      "total_gold": 0,
      "base_stats": {
        "max_health": 100,
        "move_speed": 200,
        "damage_multiplier": 1.0,
        "speed_multiplier": 1.0
      }
    },
    "combat": {
      "unlocked_weapons": ["w1_projectile"],
      "weapon_levels": {},
      "best_run": null,
      "run_history": []
    },
    "skills": {
      "unlocked": [],
      "skill_points": 0
    },
    "town": {
      "phase": 1,
      "population": 0,
      "buildings": {},
      "resources": { "gold": 0, "wood": 0, "stone": 0, "herbs": 0, "ore": 0 }
    },
    "npcs": {
      "met": [],
      "relationships": {}
    },
    "factions": {
      "wanderers_guild": { "reputation": 0, "rank": "unknown" }
    },
    "quests": {
      "active": [],
      "completed": []
    },
    "unlocks": {
      "stages": ["stage_graveyard"],
      "items": [],
      "features": ["town_basic", "combat_basic"]
    },
    "estates": [],
    "family": {
      "wives": [],
      "children": []
    },
    "inventory": {
      "equipment": { "weapon": null, "armor": null },
      "consumables": [],
      "max_slots": 24
    }
  },

  "flags": {
    "boss_1_defeated": false,
    "met_waifu_1": false,
    "town_built_blacksmith": false
  },

  "counters": {
    "total_kills": 0,
    "total_runs": 0,
    "affection_waifu_1": 0,
    "quests_completed": 0
  }
}
```

### Rules
- `save_version` is mandatory, starts at 1, never removed
- `session` resets every combat run
- `persistent` carries across runs
- `flags` = flat boolean key/value (no nested objects)
- `counters` = flat numeric key/value (no nested objects)
- No new top-level keys without approval

---

## 4. Engine-Agnostic GameManager

### Interface (portable to any language)

```
GameManager
  ├── init(backend)           // Load or create default
  ├── save()                  // Persist via backend
  ├── reset()                 // Wipe and recreate
  │
  ├── get(path)               // Read: "persistent.town.resources.gold"
  ├── set(path, value)        // Write: "persistent.currency", 50
  │
  ├── add_currency(amount, source)
  ├── spend_currency(amount, source) → bool
  ├── get_currency() → int
  │
  ├── set_flag(key, value)
  ├── get_flag(key) → bool
  ├── toggle_flag(key)
  │
  ├── add_counter(key, amount)
  ├── get_counter(key) → int
  ├── set_counter(key, value)
  │
  ├── start_session(stage_id, modifiers, loadout)
  ├── end_session(result)
  │
  └── on(event, callback)     // Event bus (cross-mode communication)
```

### What Changes from Current GameManager

| Current | Engine-Agnostic |
|---|---|
| `localStorage.getItem/setItem` | `backend.load/save` (injected) |
| `store.town.resources.gold` | `get("persistent.town.resources.gold")` |
| `addGold(amount, source)` | `add_currency(amount, source)` |
| Nested flag objects | Flat `flags` key/value only |
| `endCombatSession(result)` | `end_session(result)` |
| Auto-save timer | Backend-dependent (HTML: timer, Godot: on scene change) |

---

## 5. Asset Manifest System

### File: `asset_manifest.json`

Maps logical keys to file paths. Both HTML and Godot read this file.

```json
{
  "sprites": {
    "player": "assets/svg/player.svg",
    "zombie": "assets/svg/zombie.svg",
    "bat": "assets/svg/bat.svg",
    "skeleton": "assets/svg/skeleton.svg",
    "ghost": "assets/svg/ghost.svg",
    "caster": "assets/svg/caster.svg",
    "boss_gravekeeper": "assets/svg/boss.svg",
    "w1_projectile": "assets/svg/w1_projectile.svg",
    "w2_orbit": "assets/svg/w2_orbit.svg",
    "w3_pulse": "assets/svg/w3_pulse.svg",
    "xp_gem_small": "assets/svg/xp_gem_small.svg",
    "xp_gem_large": "assets/svg/xp_gem_large.svg",
    "gold_coin": "assets/svg/gold_coin.svg",
    "screen_wipe": "assets/svg/screen_wipe.svg",
    "magnet": "assets/svg/magnet.svg",
    "weapon_levelup": "assets/svg/weapon_levelup.svg"
  },
  "vn_portraits": {
    "waifu_01_neutral": "assets/vn/waifu_01/neutral.svg",
    "waifu_01_happy": "assets/vn/waifu_01/happy.svg",
    "waifu_01_sad": "assets/vn/waifu_01/sad.svg",
    "waifu_01_angry": "assets/vn/waifu_01/angry.svg"
  },
  "ui": {
    "hp_bar": "assets/ui/hp_bar.svg",
    "xp_bar": "assets/ui/xp_bar.svg",
    "button": "assets/ui/button.svg"
  },
  "audio": {
    "boss_charge_warn": "assets/audio/boss_charge_warn.ogg",
    "level_up": "assets/audio/level_up.ogg",
    "coin_pickup": "assets/audio/coin_pickup.ogg"
  }
}
```

### How Content Files Reference Assets

```json
{
  "id": "zombie",
  "sprite": "zombie",
  "hp": 10,
  "damage": 5
}
```

The engine resolves `"sprite": "zombie"` → `asset_manifest.sprites.zombie` → `"assets/svg/zombie.svg"` → loads the file.

### HTML Prototype Implementation

The HTML prototype loads `asset_manifest.json`, then loads all SVGs as `Image` objects into an `imageCache`. The `_drawEntity()` method looks up the cache by sprite key.

### Godot Port

In Godot, the manifest maps to `preload()` calls or resource paths. The same JSON content files work — only the loader changes.

---

## 6. ID Conventions

### Rules (Claude's, now enforced)

1. Every entity has a unique string `id` field
2. IDs are `snake_case`, lowercase, no spaces
3. Never reference by array index or display name
4. Always reference by `id` string

### Current ID Audit

| Entity | Current ID | Status |
|---|---|---|
| Player | `"survivor"` | ✅ OK |
| Zombie | `"zombie"` | ✅ OK |
| Bat | `"bat"` | ✅ OK |
| Skeleton | `"skeleton"` | ✅ OK |
| Ghost | `"ghost"` | ✅ OK |
| Caster | `"caster"` | ✅ OK |
| Boss | `"boss_gravekeeper"` | ✅ OK |
| Weapon 1 | `"w1_projectile"` | ✅ OK |
| Weapon 2 | `"w2_orbit"` | ✅ OK |
| Weapon 3 | `"w3_area"` | ⚠️ Rename to `"w3_pulse"` (matches visual name) |
| Stage | `"stage_graveyard"` | ✅ OK |
| XP Small | `"xp_gem_small"` | ✅ OK |
| XP Large | `"xp_gem_large"` | ✅ OK |
| Gold | `"gold_coin"` | ✅ OK |
| Screen Wipe | `"screen_wipe"` | ✅ OK |
| Magnet | `"magnet"` | ✅ OK |
| Weapon Level-Up | `"weapon_levelup"` | ✅ OK |

### Central ID Registry

All entity IDs are defined in `content/id_registry.json` — the single source of truth. Before creating any new content JSON file, check the registry for existing IDs and add new ones following the naming rules in `id_system.md`.

**61 IDs registered** across 20 entity types: character, weapon, enemy, stage, pickup, skill, building, npc, faction, quest, dialogue, dialogue_node, item, estate, telegraph, stage_event, attack, audio, flag, counter.

### Field Name Convention

| Location | Convention | Example |
|---|---|---|
| JSON content files | `snake_case` | `"charge_duration": 1.5` |
| JavaScript code | `camelCase` | `chargeDuration` |
| Save data keys | `snake_case` | `"total_gold"` |
| Event names | `camelCase` | `"combat:sessionEnd"` |

---

## 7. Mode Transition Contracts

### Combat Entry

```json
{
  "stage_id": "stage_graveyard",
  "modifiers": {
    "damage_mult": 1.0,
    "spawn_rate_mult": 1.0,
    "hp_mult": 1.0
  },
  "loadout": {
    "character_id": "survivor",
    "weapon_ids": ["w1_projectile", "w2_orbit", "w3_area"]
  }
}
```

### Combat Exit

```json
{
  "result": "win" | "loss" | "timeout",
  "stage_id": "stage_graveyard",
  "rewards": {
    "currency": 156,
    "xp": 89,
    "items": [
      { "id": "health_potion", "count": 3 }
    ]
  },
  "flags_triggered": ["boss_1_defeated"],
  "counters_updated": {
    "total_kills": 134
  },
  "stats": {
    "time_survived": 185.3,
    "level_reached": 8,
    "kills": 134,
    "damage_dealt": 15420
  }
}
```

### Town Entry

```json
{
  "return_from": "combat",
  "combat_result": { ... }
}
```

### Town Exit

```json
{
  "destination": "combat" | "vn_scene" | "world_map",
  "stage_id": "stage_graveyard",
  "modifiers": { ... },
  "loadout": { ... }
}
```

### VN Scene Entry

```json
{
  "scene_id": "waifu_01_intro",
  "context": {
    "affection_level": 2,
    "met_before": true
  }
}
```

### VN Scene Exit

```json
{
  "scene_id": "waifu_01_intro",
  "result": "completed",
  "flags_triggered": ["met_waifu_1"],
  "counters_updated": {
    "affection_waifu_1": 1
  }
}
```

---

## 8. Global Flags & Counters

### Rules
- Flat key/value only — no nested objects
- `flags` = boolean (true/false)
- `counters` = integer (0, 1, 2, ...)
- All three modes (combat, town, VN) read and write the same store
- No quest chains, no conditionals-on-conditionals — flat only for this slice

### Standard Flags (pre-defined)

| Flag | Set By | Read By | Purpose |
|---|---|---|---|
| `boss_1_defeated` | Combat | Town, VN | Unlocks post-boss content |
| `met_waifu_1` | VN | Town | Unlocks waifu-related buildings |
| `town_built_blacksmith` | Town | Combat | Enables weapon upgrades |
| `stage_2_unlocked` | Combat | World Map | Unlocks next stage |

### Standard Counters (pre-defined)

| Counter | Set By | Read By | Purpose |
|---|---|---|---|
| `total_kills` | Combat | UI, achievements | Lifetime kill count |
| `total_runs` | Combat | UI, difficulty | Lifetime run count |
| `affection_waifu_1` | VN | VN, town | NPC relationship level |
| `quests_completed` | Town | unlocks | Gate content behind quest count |

---

## 9. What Stays HTML-Only

These are rendering/UX concerns that don't affect portability:

| Feature | HTML-Only | Portable |
|---|---|---|
| Canvas2D rendering | ✅ | ❌ (Godot uses its own renderer) |
| Web Audio synthesis | ✅ | ❌ (Godot uses AudioStreamPlayer) |
| localStorage | ✅ | ❌ (Godot uses FileAccess) |
| HTML/CSS UI | ✅ | ❌ (Godot uses Control nodes) |
| Touch/mouse input | ✅ | ❌ (Godot uses InputEvent) |
| Game loop (requestAnimationFrame) | ✅ | ❌ (Godot uses _process/_physics_process) |
| JSON content files | ✅ | ✅ (same files, different loader) |
| Asset manifest | ✅ | ✅ (same file, different resolver) |
| Save schema | ✅ | ✅ (same structure, different backend) |
| Mode transition contracts | ✅ | ✅ (same data shapes) |
| Flags & counters | ✅ | ✅ (same key/value store) |
| ID conventions | ✅ | ✅ (same snake_case strings) |

---

## 10. Godot Port Checklist

When porting to Godot, verify these items:

### Data Layer (Port First)
- [ ] All JSON content files use `snake_case` IDs and field names
- [ ] `asset_manifest.json` exists and maps all logical keys
- [ ] Save schema matches the 5-key structure (`save_version`, `session`, `persistent`, `flags`, `counters`)
- [ ] GameManager uses injected `StorageBackend`, not hardcoded localStorage
- [ ] Mode transition contracts are defined as typed dictionaries/classes

### Content Layer
- [ ] All enemies, weapons, items, buildings, NPCs have unique `id` fields
- [ ] All sprite references use logical keys (not file paths)
- [ ] All tuning values are in JSON (not hardcoded in GDScript)
- [ ] VN dialogue uses node-based format with `node_id` and `target_node_id`

### Logic Layer
- [ ] Combat engine reads from `session` and `persistent` — never from rendering code
- [ ] Town reads `flags` and `counters` to determine building availability
- [ ] VN reads `counters.affection_*` for dialogue branching
- [ ] All modes emit results through the transition contract (not direct state mutation)

### Rendering Layer (Port Last)
- [ ] Replace Canvas2D calls with Godot `draw_*` or `Sprite2D`/`AnimatedSprite2D`
- [ ] Replace Web Audio with `AudioStreamPlayer` + `.ogg`/`.wav` files
- [ ] Replace HTML UI with Godot `Control` nodes
- [ ] Replace `requestAnimationFrame` with `_process(delta)`
- [ ] Replace touch/mouse input with `InputEvent` handling

---

*Engine-Agnostic Porting Guide v1.0 — Generated August 24, 2026*
