# ID System Specification

> **Version:** 1.0
> **Date:** August 24, 2026
> **Purpose:** Centralized ID system for all game entities, ensuring consistency across content files, engine code, and the Godot port
> **Related:** `15_engine_agnostic_port.md` (Section 6), `content/id_registry.json`

---

## Table of Contents

1. [Rules](#1-rules)
2. [Entity Types & Prefixes](#2-entity-types--prefixes)
3. [ID Registry Format](#3-id-registry-format)
4. [Reference Validation](#4-reference-validation)
5. [Naming Examples](#5-naming-examples)
6. [Migration from Current IDs](#6-migration-from-current-ids)

---

## 1. Rules

### Mandatory (No Exceptions)

1. **Every entity has a unique string `id` field.** No exceptions. No anonymous entities.
2. **IDs are `snake_case`**, always lowercase, no spaces, no hyphens, no camelCase.
3. **Never reference by array index.** Always by `id` string.
4. **Never reference by display name.** `"The Gravekeeper"` is a name, not an ID.
5. **IDs are immutable once defined.** If an ID must change, it's a breaking change requiring migration.
6. **No new entity types without a prefix.** Every ID starts with its entity type prefix.

### Naming Convention

```
{prefix}_{descriptive_name}

Examples:
  enemy_zombie
  weapon_projectile
  pickup_gold_coin
  stage_graveyard
  building_blacksmith
  npc_blacksmith
  quest_main_001_awakening
  dialogue_blacksmith_intro
  skill_combat_damage_1
  item_iron_sword
  faction_wanderers_guild
  telegraph_boss_charge_lane
  estate_gareth
  stage_event_falling_stalactites
```

### What NOT to Do

| ❌ Wrong | ✅ Correct | Why |
|---|---|---|
| `w1_projectile` | `weapon_projectile` | Prefix identifies entity type |
| `W3_Area` | `weapon_area_pulse` | snake_case, not UPPER_CASE |
| `gold-coin` | `pickup_gold_coin` | No hyphens |
| `boss1` | `enemy_boss_gravekeeper` | Descriptive, not numeric |
| `"The Gravekeeper"` | `enemy_boss_gravekeeper` | Never use display name as ID |
| `n1`, `n2` | `dialogue_blacksmith_intro_n1` | Node IDs include scene context |

---

## 2. Entity Types & Prefixes

| Prefix | Entity Type | Content File | Example |
|---|---|---|---|
| `character_` | Playable character | `characters.json` | `character_survivor` |
| `weapon_` | Weapon | `weapons.json` | `weapon_projectile` |
| `enemy_` | Enemy / Boss | `enemies.json` | `enemy_zombie`, `enemy_boss_gravekeeper` |
| `stage_` | Stage / Level | `stages.json` | `stage_graveyard` |
| `pickup_` | Pickup / Drop | `pickups.json` | `pickup_gold_coin` |
| `skill_` | Skill tree node | `skills.json` | `skill_combat_damage_1` |
| `building_` | Town building | `buildings.json` | `building_blacksmith` |
| `npc_` | NPC character | `npcs.json` | `npc_blacksmith` |
| `faction_` | Faction | `factions.json` | `faction_wanderers_guild` |
| `quest_` | Quest | `quests.json` | `quest_main_001_awakening` |
| `dialogue_` | Dialogue scene | `dialogue.json` | `dialogue_blacksmith_intro` |
| `item_` | Equipment / Consumable | `items.json` | `item_iron_sword` |
| `estate_` | Estate instance | `estates.json` | `estate_gareth` |
| `telegraph_` | Telegraph template | `mechanics.json` | `telegraph_boss_charge_lane` |
| `stage_event_` | Stage environmental event | `mechanics.json` | `stage_event_falling_stalactites` |
| `attack_` | Enemy attack pattern | `mechanics.json` | `attack_charge` |
| `audio_` | Audio event | `audio_config.json` | `audio_boss_charge_warn` |
| `ui_` | UI element | `ui_config.json` | `ui_hud_hp_bar` |
| `asset_` | Asset manifest key | `asset_manifest.json` | `asset_zombie` |
| `flag_` | Global flag | save data | `flag_boss_1_defeated` |
| `counter_` | Global counter | save data | `counter_total_kills` |

### Sub-IDs (Within an Entity)

Some entities have child nodes that need IDs. The convention is:

```
{parent_id}_{child_type}_{number}

Examples:
  dialogue_blacksmith_intro_n1     (node 1 of blacksmith intro)
  dialogue_blacksmith_intro_n2a    (branch A of node 2)
  skill_combat_damage_1            (node 1 in combat branch)
  quest_main_001_awakening_obj_1   (objective 1 of quest)
```

---

## 3. ID Registry Format

The `content/id_registry.json` file is the **single source of truth** for all entity IDs.

```json
{
  "version": 1,
  "entities": {
    "character_survivor": {
      "type": "character",
      "file": "characters.json",
      "display_name": "Survivor",
      "references": []
    },
    "weapon_projectile": {
      "type": "weapon",
      "file": "weapons.json",
      "display_name": "Projectile",
      "references": ["character_survivor.start_weapon"]
    },
    "enemy_zombie": {
      "type": "enemy",
      "file": "enemies.json",
      "display_name": "Zombie",
      "references": ["stage_graveyard.waves.enemy_types"]
    },
    "enemy_boss_gravekeeper": {
      "type": "enemy",
      "file": "enemies.json",
      "display_name": "The Gravekeeper",
      "references": ["stage_graveyard.boss_config.enemy_id"]
    }
  }
}
```

### Fields

| Field | Required | Description |
|---|---|---|
| `type` | Yes | Entity type (matches prefix) |
| `file` | Yes | Which content JSON file defines this entity |
| `display_name` | Yes | Human-readable name (can be localized later) |
| `references` | No | Array of `{parent}.{field}` paths that reference this ID |

---

## 4. Reference Validation

### Rules

1. **Every reference must resolve.** If `weapons.json` references `enemy_zombie`, that ID must exist in the registry.
2. **No orphaned IDs.** Every ID in the registry must be referenced by at least one other entity OR be a root entity (character, stage).
3. **No circular references.** Entity A cannot reference Entity B which references Entity A (except in dialogue branching, which is by design).

### Validation Script (Future)

A simple validation script can check the registry against all content files:

```python
# Pseudocode
for each content_file in content_files:
    for each entity in content_file:
        assert entity.id in registry
        for each reference in entity.references:
            assert reference.target_id in registry

# Check for orphans
for each id in registry:
    if registry[id].references is empty AND id is not a root type:
        warn(f"Orphaned ID: {id}")
```

---

## 5. Naming Examples

### Characters
```
character_survivor         → "The Survivor" (default)
character_berserker        → "Berserker" (unlocked via quest)
character_mage             → "Mage" (unlocked via faction)
```

### Weapons
```
weapon_projectile          → "Projectile" (fires bullets)
weapon_orbit               → "Orbit" (spheres orbit player)
weapon_area_pulse          → "Area" (periodic AoE)  ← was "w3_area"
weapon_chain_lightning     → "Chain Lightning" (bounces)
weapon_melee_sweep         → "Melee Sweep" (wide arc)
```

### Enemies
```
enemy_zombie               → "Zombie"
enemy_bat                  → "Bat"
enemy_skeleton             → "Skeleton"
enemy_ghost                → "Ghost"
enemy_caster               → "Caster"
enemy_boss_gravekeeper     → "The Gravekeeper"
```

### Pickups
```
pickup_xp_small            → "Small XP Gem"
pickup_xp_large            → "Large XP Gem"
pickup_gold_coin           → "Gold Coin"
pickup_health_potion       → "Health Potion"
pickup_magnet              → "Magnet"
pickup_screen_wipe         → "Screen Wipe"
pickup_weapon_level_up     → "Weapon Level-Up"  ← was "weapon_levelup"
```

### Stages
```
stage_graveyard            → "The Graveyard"
stage_forest               → "The Dark Forest"
stage_cave                 → "The Crystal Cavern"
```

### Skills
```
skill_combat_damage_1      → "+15% Damage"
skill_combat_speed_1       → "+10% Move Speed"
skill_town_warehouse_1     → "+8 Inventory Slots"
```

### Buildings
```
building_campfire          → "Campfire" (starter)
building_blacksmith        → "Blacksmith"
building_market            → "Market"
building_tavern            → "Tavern"
building_library           → "Library"
```

### NPCs
```
npc_blacksmith             → "Gareth" (The Blacksmith)
npc_apprentice_ani         → "Ani" (Apprentice)
npc_elara                  → "Elara" (Healer)
```

### Quests
```
quest_main_001_awakening   → "The Awakening" (tutorial)
quest_side_gareth_iron     → "Gareth Needs Iron" (side)
quest_faction_001_join     → "Join the Forge Brotherhood" (faction)
```

### Dialogue
```
dialogue_blacksmith_intro  → Blacksmith first meeting
dialogue_blacksmith_intro_n1  → Node 1 of that scene
dialogue_blacksmith_intro_n2a → Branch A of node 2
```

### Telegraphs
```
telegraph_boss_charge_lane      → Boss charge warning rectangle
telegraph_ground_pound_circle   → Ground pound AoE warning
telegraph_falling_debris        → Falling rock warning circle
telegraph_lava_pool             → Lava pool formation warning
telegraph_caster_bolt           → Caster projectile path warning
telegraph_laser_beam            → Laser beam path warning
```

### Stage Events
```
stage_event_falling_stalactites → Periodic stalactite drops
stage_event_lava_eruption       → Lava pool formation
```

### Attacks
```
attack_charge             → Boss charge attack
attack_ground_pound       → Boss ground pound
attack_bolt               → Caster ranged bolt
```

---

## 6. Migration from Current IDs

### IDs That Need Renaming

| Current ID | New ID | Reason |
|---|---|---|
| `w1_projectile` | `weapon_projectile` | Add prefix, remove shorthand |
| `w2_orbit` | `weapon_orbit` | Add prefix, remove shorthand |
| `w3_area` | `weapon_area_pulse` | Add prefix, descriptive name |
| `weapon_levelup` | `pickup_weapon_level_up` | Add prefix, fix spacing |
| `exp_small` | `pickup_xp_small` | Add prefix, fix abbreviation |
| `exp_large` | `pickup_xp_large` | Add prefix, fix abbreviation |
| `player_default` | `character_survivor` | Add prefix, descriptive name |

### IDs That Are Fine (Already snake_case with good names)

| ID | Type | Notes |
|---|---|---|
| `zombie` | enemy | Needs prefix → `enemy_zombie` |
| `bat` | enemy | Needs prefix → `enemy_bat` |
| `skeleton` | enemy | Needs prefix → `enemy_skeleton` |
| `ghost` | enemy | Needs prefix → `enemy_ghost` |
| `caster` | enemy | Needs prefix → `enemy_caster` |
| `boss_gravekeeper` | enemy | Needs prefix → `enemy_boss_gravekeeper` |
| `gold_coin` | pickup | Needs prefix → `pickup_gold_coin` |
| `magnet` | pickup | Needs prefix → `pickup_magnet` |
| `screen_wipe` | pickup | Needs prefix → `pickup_screen_wipe` |
| `stage_graveyard` | stage | Already good |
| `blacksmith` | building/npc | Needs disambiguation → `building_blacksmith` / `npc_blacksmith` |
| `iron_sword` | item | Needs prefix → `item_iron_sword` |
| `steel_armor` | item | Needs prefix → `item_steel_armor` |
| `legendary_blade` | item | Needs prefix → `item_legendary_blade` |

### Migration Priority

| Priority | IDs to Rename | Files Affected |
|---|---|---|
| **P0 (Now)** | `w1/w2/w3_*` → `weapon_*`, `weapon_levelup` → `pickup_weapon_level_up` | game2.html, 11_svg_asset_spec.md, asset_manifest.json |
| **P1 (Next)** | Add prefixes to all entities: `zombie` → `enemy_zombie`, etc. | All content JSON files |
| **P2 (Later)** | Disambiguate `blacksmith` (building vs NPC), rename `obj_1` → `quest_*_obj_1` | game_frame.md |

---

*ID System Specification v1.0 — Generated August 24, 2026*
