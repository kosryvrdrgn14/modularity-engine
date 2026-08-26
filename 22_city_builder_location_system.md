# City Builder — Location Hierarchy & Navigation System

> **Game Version:** v0.3.0+  
> **Date:** August 26, 2026  
> **Parent:** `game_frame.md` §5 (City Builder / Town Hub)  
> **Predecessor:** `19_town_system_spec.md` (flat town screen)  
> **Status:** Design Document — Awaiting Review

---

## Table of Contents

1. [Overview](#1-overview)
2. [Location Hierarchy](#2-location-hierarchy)
3. [Navigation System](#3-navigation-system)
4. [Location Data Schema](#4-location-data-schema)
5. [NPC Placement & Overflow](#5-npc-placement--overflow)
6. [Unlock System](#6-unlock-system)
7. [Visual Design](#7-visual-design)
8. [Ambient Sound System](#8-ambient-sound-system)
9. [Save Data Structure](#9-save-data-structure)
10. [Implementation Phases](#10-implementation-phases)
11. [Gaps, Conflicts & Open Questions](#11-gaps-conflicts--open-questions)

---

## 1. Overview

### What This Replaces

The current town screen (`19_town_system_spec.md`) is a **flat single-screen** with one background and a list of NPCs. It works for a refugee camp but cannot scale to a city with multiple districts, buildings, and NPCs scattered across locations.

### What This Is

A **hierarchical location navigation system** that lets the player explore a growing city. The city expands from a small camp to a full city through upgrades, quests, and reputation. Each location can have NPCs, buildings, shops, and quest triggers.

### Design Principles

| Principle | Why |
|---|---|
| **Rule of 3** | Max 3 items displayed per level (3 districts, 3 sub-districts, 3 buildings). Prevents UI clutter on mobile and keeps choices meaningful. Expandable later if needed. |
| **Flexible depth** | Districts can have buildings directly (small town) OR sub-districts then buildings (large city). Same data structure, different depth. |
| **Easy to add content** | Adding a new district, building, or NPC assignment is one JSON entry. No engine changes needed. |
| **Quick access** | Three navigation methods: breadcrumb trail, back button, and a side menu for power users. |
| **NPC overflow via scroll** | If more than 3 NPCs are in a location, scroll to see the rest. Priority system shows quest-relevant NPCs first. |

---

## 2. Location Hierarchy

### The Four Levels

```
CITY (root)
  └── DISTRICT (zone)
        └── SUB-DISTRICT (area)
              └── BUILDING (specific location)
```

### Rule of 3 at Each Level

| Level | Max Displayed | Overflow |
|---|---|---|
| Districts | 3 visible | Scroll if more exist |
| Sub-districts | 3 visible | Scroll if more exist |
| Buildings | 3 visible | Scroll if more exist |
| NPCs per location | 3 visible | Scroll + priority sort |

### Flexible Depth

**Small town** — Districts contain buildings directly (skip sub-districts):
```
CITY
  ├── Trade District → [Market, Blacksmith, Farm]
  ├── Residential District → [Shelter, Chapel, Well]
  └── Wilderness → [Graveyard, Forest, Quarry]
```

**Large city** — Districts split into sub-districts, then buildings:
```
CITY
  ├── Trade District
  │     ├── Market Square → [Market, Auction House, Bank]
  │     ├── Artisan Row → [Blacksmith, Tannery, Alchemist]
  │     └── Warehouse District → [Storage, Import/Export]
  ├── Residential District
  │     ├── Common Quarter → [Shelter, Tavern, Bathhouse]
  │     ├── Noble Quarter → [Manor, Library, Chapel]
  │     └── Slums → [Fenced Camp, Back Alley, Fence]
  └── Wilderness
        ├── East Road → [Graveyard, Bandit Camp, Ruins]
        ├── North Woods → [Lumber Camp, Herbalist Grove]
        └── Mountains → [Quarry, Mine, Dwarven Gate]
```

**The data structure is the same** — the engine just checks: does this district have `subDistricts[]` or `buildings[]`? If buildings, render them directly. If sub-districts, let the player drill down first.

### Why This Works

| Concern | How It's Addressed |
|---|---|
| "What if a district has only 2 things?" | Show 2 cards. Rule of 3 is a max, not a minimum. |
| "What if we need 4 districts?" | The 4th exists but isn't shown until the player scrolls. Or unlock via town upgrade. |
| "What if a building moves to a new sub-district?" | Change its `location` field in JSON. No code change. |
| "What if a district gets sub-districts later?" | Add `subDistricts[]` to the district. Old `buildings[]` can be migrated or removed. |

---

## 3. Navigation System

### Three Navigation Methods

#### 3a. Breadcrumb Trail

A horizontal text bar below the top bar showing the current path:

```
┌─────────────────────────────────────────────────┐
│  🏕 Refugee Camp              💰 150 Gold       │
├─────────────────────────────────────────────────┤
│  Town  ›  Trade District  ›  Tavern             │
└─────────────────────────────────────────────────┘
```

- Each segment is **tappable** — tapping "Trade District" jumps back to that level
- The current location is **not tappable** (you're already there)
- Scrollable horizontally if the path gets long (mobile)

#### 3b. Back Button

A `←` button at the top-left of the location content area:

- Goes up **one level** (Building → Sub-district, Sub-district → District, District → City)
- Disabled/hidden when already at City root
- Works the same as tapping the second-to-last breadcrumb

#### 3c. Side Menu (Quick Access)

A `☰` hamburger button at the top-right opens a slide-out side panel. Swipe left/right to navigate between pages if needed.

**Default View** (3 priority items + compact list):

```
┌─────────────────────────────────────────┐
│  ☰ Locations                        ✕  │
├─────────────────────────────────────────┤
│  ⚠ PRIORITY QUESTS                     │
│  ! Blacksmith — "I need iron ore"      │
│  ! Elder Rowan — "The graveyard..."    │
│  ! Lina — "Can you clear the road?"    │
├─────────────────────────────────────────┤
│  🏕 Town Center                        │
│  🏪 Trade District                     │
│  🏠 Residential                        │
│                                         │
│  [Show All ▼]                           │
└─────────────────────────────────────────┘
```

**Expanded View** (toggle "Show All"):

```
┌─────────────────────────────────────────┐
│  ☰ Locations                        ✕  │
├─────────────────────────────────────────┤
│  ⚠ PRIORITY QUESTS                     │
│  ! Blacksmith — "I need iron ore"      │
│  ! Elder Rowan — "The graveyard..."    │
├─────────────────────────────────────────┤
│  🏕 Town Center ▾                      │
│  ├── 🏪 Trade District ▾              │
│  │     ├── 🛒 Market                  │
│  │     ├── ⚒ Blacksmith    !         │
│  │     └── 🍺 Tavern                  │
│  ├── 🏠 Residential ▾                 │
│  │     ├── 🏕 Shelter                 │
│  │     └── ⛪ Chapel                  │
│  └── 🌲 Wilderness ▾                  │
│        └── 💀 Graveyard    !          │
│  🔒 Arena (Complete: Prove Your Worth)│
├─────────────────────────────────────────┤
│  [Hide ▲]                              │
└─────────────────────────────────────────┘
```

- **Default:** 3 priority quest markers at top, then 3 recent locations. Compact.
- **Expanded:** Full tree with collapsible sections (tap ▾ to expand/collapse)
- Priority/main story quests always show `!` at the top
- Side quests and misc go in a separate "Other Quests" section (scrollable)
- Locked locations show as `🔒 Location Name` with unlock requirement tooltip
- Tapping any unlocked location **jumps directly there**
- Swipe right or tap `✕` to close

### Navigation State Machine

```
                    ┌──────────┐
                    │   CITY   │ ← root
                    └────┬─────┘
                         │ tap district
                         ▼
                  ┌──────────────┐
                  │   DISTRICT   │
                  └──┬────────┬──┘
                     │        │
            tap sub-dist   tap building
                     │        │
                     ▼        ▼
             ┌──────────┐  ┌──────────┐
             │SUB-DIST  │  │ BUILDING │
             └────┬─────┘  └──────────┘
                  │
            tap building
                  │
                  ▼
             ┌──────────┐
             │ BUILDING │
             └──────────┘
```

### Where Dialogue Happens

- **NPC cards** appear at the **top** of any location (max 3 visible)
- Tapping an NPC opens the **dialogue overlay** (same system as `19_town_system_spec.md`)
- Dialogue overlay sits on top of the location screen — closing it returns to the same location
- The player does NOT need to re-navigate after closing dialogue

---

## 4. Location Data Schema

### Location Definition (JSON)

```json
{
  "id": "trade_district",
  "type": "district",
  "name": "Trade District",
  "description": "The bustling heart of commerce.",
  "icon": "🏪",
  "parentId": "city_root",
  "order": 1,

  "unlockCondition": {
    "type": "town_level",
    "townLevel": 2
  },

  "background": "assets/district_trade.svg",

  "subDistricts": [
    {
      "id": "market_square",
      "type": "sub_district",
      "name": "Market Square",
      "description": "Stalls and vendors line the cobblestone square.",
      "icon": "🛒",
      "parentId": "trade_district",
      "order": 1,

      "buildings": [
        {
          "id": "market",
          "type": "building",
          "name": "Market",
          "description": "Buy and sell goods.",
          "icon": "🛒",
          "parentId": "market_square",
          "order": 1,

          "unlockCondition": {
            "type": "town_level",
            "townLevel": 1
          },

          "functions": ["shop", "sell"],
          "background": "assets/building_market.svg"
        },
        {
          "id": "blacksmith",
          "type": "building",
          "name": "Blacksmith",
          "description": "Forge and upgrade weapons.",
          "icon": "⚒️",
          "parentId": "market_square",
          "order": 2,

          "unlockCondition": {
            "type": "flag",
            "flag": "met_blacksmith"
          },

          "functions": ["forge", "upgrade_weapon"],
          "background": "assets/building_blacksmith.svg",
          "npcDefault": "gareth"
        }
      ]
    }
  ]
}
```

### Flat Location Index

For quick lookups, the engine maintains a flat index:

```javascript
const LOCATION_INDEX = {
  'city_root':          { type: 'city',        name: 'Town',           parentId: null,          order: 0 },
  'trade_district':     { type: 'district',    name: 'Trade District', parentId: 'city_root',   order: 1 },
  'residential':        { type: 'district',    name: 'Residential',    parentId: 'city_root',   order: 2 },
  'wilderness':         { type: 'district',    name: 'Wilderness',     parentId: 'city_root',   order: 3 },
  'market_square':      { type: 'sub_district', name: 'Market Square', parentId: 'trade_district', order: 1 },
  'market':             { type: 'building',    name: 'Market',         parentId: 'market_square', order: 1 },
  'blacksmith':         { type: 'building',    name: 'Blacksmith',     parentId: 'market_square', order: 2 },
  'tavern':             { type: 'building',    name: 'Tavern',         parentId: 'market_square', order: 3 },
  // ... more locations
};
```

### Why Flat Index + Tree

| Method | Used For |
|---|---|
| **Tree** (nested JSON) | Content definition — easy to read, easy to add new locations |
| **Flat index** | Runtime lookups — `getParent(id)`, `getChildren(id)`, `isUnlocked(id)` |

The engine builds the flat index from the tree on load. Content designers work with the tree; the engine works with the flat index.

### Location Properties Reference

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique identifier (snake_case) |
| `type` | enum | ✅ | `'city'` \| `'district'` \| `'sub_district'` \| `'building'` |
| `name` | string | ✅ | Display name |
| `description` | string | ❌ | Flavor text shown in location header |
| `icon` | string | ❌ | Emoji or icon identifier for cards and side menu |
| `parentId` | string | ✅ | Parent location ID (`null` for city root) |
| `order` | number | ✅ | Display order among siblings (1, 2, 3...) |
| `unlockCondition` | object | ❌ | When to show this location (see §6) |
| `background` | string | ❌ | SVG asset path for location background |
| `subDistricts` | array | ❌ | Child sub-districts (if this district has sub-districts) |
| `buildings` | array | ❌ | Child buildings (if this location has buildings directly) |
| `functions` | string[] | ❌ | What the player can do here: `'shop'`, `'forge'`, `'quest_board'`, `'inn'`, etc. |
| `npcDefault` | string | ❌ | NPC ID that appears here by default |

---

## 5. NPC Placement & Overflow

### NPC Location Assignment

NPCs are assigned to locations in their data definition:

```json
{
  "id": "gareth",
  "name": "Gareth Ironhand",
  "location": {
    "default": "blacksmith",
    "overrides": [
      { "flag": "gareth_moved_to_tavern", "location": "tavern" }
    ]
  }
}
```

**Default location** — where the NPC lives unless an override is active.
**Overrides** — event/flag-driven location changes (e.g., "After completing quest X, the Blacksmith moves to the Tavern").

### NPC Display Priority

When more than 3 NPCs are in a location, they are sorted by priority:

| Priority | Criteria | Example |
|---|---|---|
| 1 (highest) | Has an active quest for the player | "I need your help with something..." |
| 2 | Has unvisited dialogue (new topics) | New dialogue options since last visit |
| 3 | Affection level > 0 | NPCs the player has interacted with |
| 4 | Default ordering by NPC ID | Alphabetical fallback |

### NPC Overflow Behavior

```
3 or fewer NPCs → Show all as cards (current behavior)
4+ NPCs → Show top 3 by priority + scroll indicator (↓)
            Swipe up/down to see remaining NPCs
            Quest NPCs always visible without scrolling
```

### NPC Assignment via Events

NPCs can be dynamically assigned to locations:

```javascript
// Quest completion moves an NPC
gameManager.set_flag('gareth_moved_to_tavern', true);
// Next time player visits, Gareth appears in the Tavern instead of Blacksmith

// New NPC arrives after town upgrade
gameManager.add_npc_to_location('lina', 'residential.shelter');

// NPC leaves (quest-driven)
gameManager.remove_npc_from_location('old_man', 'city_root');
```

### NPCs in the Root (City) View

When the player is at the city root, they see NPCs that are assigned to the root or "wandering" — NPCs without a specific building assignment, or NPCs that the city event system has placed in the root area.

---

## 6. Unlock System

### Two Unlock Gates

Every location can have an `unlockCondition` with two types:

#### Type 1: Town Level

```json
{
  "type": "town_level",
  "townLevel": 2
}
```

The town has a persistent level (1-5) that increases as the player upgrades. Higher-level locations require higher town levels.

| Town Level | Unlocked |
|---|---|
| 1 | Root, basic district with 1-2 buildings, refugee camp NPCs |
| 2 | Second district, sub-districts start appearing |
| 3 | Third district, most buildings available |
| 4 | Full city layout, advanced buildings |
| 5 | Complete city, all locations unlocked |

#### Type 2: NPC/Quest Gate

```json
{
  "type": "quest",
  "questId": "clear_graveyard"
}

// OR

{
  "type": "npc_trust",
  "npcId": "gareth",
  "minTrust": 2
}

// OR

{
  "type": "flag",
  "flag": "met_blacksmith"
}

// OR compound:
{
  "type": "and",
  "conditions": [
    { "type": "town_level", "townLevel": 3 },
    { "type": "quest", "questId": "forge_alliance" }
  ]
}
```

### Why Two Gates

| Gate | Purpose | Example |
|---|---|---|
| **Town level** | Broad progression — the city physically grows | New district appears when town reaches level 2 |
| **NPC/Quest gate** | Specific content — this building or area requires story progress | Blacksmith unlocks after meeting Gareth (flag), Library after completing "First Lessons" quest |

### Unlock Evaluation

```javascript
function isLocationUnlocked(location, gameState) {
  if (!location.unlockCondition) return true; // No condition = always unlocked

  const cond = location.unlockCondition;

  switch (cond.type) {
    case 'town_level':
      return gameState.town.level >= cond.townLevel;

    case 'quest':
      return gameState.quests.completed.includes(cond.questId);

    case 'npc_trust':
      return (gameState.npcs.relationships[cond.npcId] || 0) >= cond.minTrust;

    case 'flag':
      return gameState.flags[cond.flag] === true;

    case 'and':
      return cond.conditions.every(c => isLocationUnlocked({ unlockCondition: c }, gameState));

    case 'or':
      return cond.conditions.some(c => isLocationUnlocked({ unlockCondition: c }, gameState));

    default:
      return true;
  }
}
```

### Locked Location Display

- Locked locations show in the navigation as `🔒 Location Name`
- Grayed out, not tappable
- Tooltip/long-press shows the unlock requirement: *"Unlocks at Town Level 3"* or *"Complete: Clear the Graveyard"*
- This gives the player visibility into what they're working toward

---

## 7. Visual Design

### Screen Layout

```
┌─────────────────────────────────────────────────────┐
│  ←  ☰              Trade District         💰 150g  │
├─────────────────────────────────────────────────────┤
│  Town  ›  Trade District  ›  Market Square         │
├─────────────────────────────────────────────────────┤
│                                                     │
│         [Background: district_trade.svg]            │
│         (800×300, scrolls with content)             │
│                                                     │
├─────────────────────────────────────────────────────┤
│  NPC Area (top of content)                          │
│  ┌──────┐  ┌──────┐  ┌──────┐                     │
│  │ NPCs │  │ NPCs │  │ NPCs │  (scrollable)        │
│  └──────┘  └──────┘  └──────┘                     │
├─────────────────────────────────────────────────────┤
│  Location Cards (bottom of content)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 🛒       │  │ ⚒️       │  │ 🍺       │        │
│  │ Market   │  │Blacksmith│  │ Tavern   │        │
│  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────┤
├─────────────────────────────────────────────────────┤
│  ⚔ Combat   🐕 Party   🛒 Shop   ⚙ Debug       │
└─────────────────────────────────────────────────────┘
```

### Bottom Action Bar

The bottom bar is **always visible** in the town screen and contains 4 action buttons:

| Button | Icon | Action | Badge |
|---|---|---|---|
| **Combat** | ⚔ | Enter stage select / start combat | — |
| **Party** | 🐕 | Open companion management (assign 3 slots) | Red dot if new companion available |
| **Shop** | 🛒 | Open global item shop (available at any location) | Red dot if new item unlocked |
| **Debug** | ⚙ | Opens debug dropdown (Test Town, Skip to Boss, +100g, etc.) | Only in dev builds |

The **Debug button** opens a small dropdown with all debug actions. As new debug tools are added, old ones move into this dropdown rather than cluttering the main UI. This keeps the bottom bar clean while preserving quick testing access.

### NPC Companion Interface

Tapping **Party** (🐕) opens a companion management overlay:

```
┌─────────────────────────────────────────┐
│  Party Management                    ✕  │
├─────────────────────────────────────────┤
│  Slot 1: [🐕 Dog]     Lv 3  [Change]   │
│  Slot 2: [+] Empty     [Change]         │
│  Slot 3: [+] Empty     [Change]         │
├─────────────────────────────────────────┤
│  Available Companions:                  │
│  [🐕 Dog]  [🧙 Mage]  [🗡 Rogue]      │
│                                         │
│  Tap a companion to assign to a slot    │
│  Tap a filled slot to remove            │
└─────────────────────────────────────────┘
```

- 3 companion slots (matches weapon slots 1:1)
- Filled slots show companion portrait + level
- Empty slots show `+` icon
- Tapping `[Change]` opens available companions list
- Companions are invulnerable in combat (per `game_frame.md` §6.5)
- Equipped companions shown in the bottom bar badge if new ones are available

### Card Design

**Location cards:**
```
┌──────────────┐
│     🏪       │  ← icon or mini SVG preview
│              │
│ Trade District│  ← name (bold)
│ "Commerce..."│  ← description (truncated)
│              │
│ 🔒 Locked   │  ← if locked (shows requirement)
└──────────────┘
```

**NPC cards:**
```
┌──────────────┐
│  [Portrait]  │  ← inline SVG, 52×52
│  Gareth      │  ← name
│  "Need help?"│  ← quest indicator or greeting
│  ⭐⭐⭐      │  ← affection level
└──────────────┘
```

### Background System

**Every location gets its own background image.** Each new town level, district, sub-district, and building has a dedicated SVG background. If two locations share the same visual (e.g., a building uses its parent district's background), they reference the same SVG file.

| Location Type | Background | Example |
|---|---|---|
| City root | `town_refugee_camp.svg` | Campfire, tents, night sky |
| District | `district_trade.svg` | Market stalls, cobblestone |
| Sub-district | `subdist_market_square.svg` | Open-air bazaar |
| Building | `building_blacksmith.svg` | Forge interior |

- Loads when the player enters the location
- Renders behind the NPC and building cards
- Transitions smoothly between locations (fade or slide)
- Same-image reuse: `building_market.svg` can reference `subdist_market_square.svg` if the interior is the same scene

### Mobile Considerations

| Feature | Mobile Implementation |
|---|---|
| Breadcrumb | Horizontally scrollable, tappable text |
| Back button | Large touch target (44×44px minimum) |
| Side menu | Swipe right to open, swipe left or tap overlay to close. Left swipe also works. |
| Location cards | 3 columns on tablet, 1-2 columns on phone |
| NPC cards | Horizontal scroll row (like app icons) |
| Portrait mode | All layouts optimized for vertical phone screens |

---

## 8. Ambient Sound System

Each location can define an ambient sound that plays while the player is in that location. This creates atmosphere and makes the city feel alive.

### Location Ambient Config

```json
{
  "id": "trade_district",
  "ambientSound": {
    "id": "ambient_market",
    "volume": 0.3,
    "crossfadeDuration": 1.0
  }
}
```

### Ambient Sound Definitions

| Location | Ambient Sound | Description |
|---|---|---|
| City root (camp) | `ambient_campfire` | Crackling fire, crickets, distant wind |
| Trade District | `ambient_market` | Crowd chatter, cart wheels, haggling |
| Blacksmith | `ambient_forge` | Hammer on anvil, bellows, fire roar |
| Tavern | `ambient_tavern` | Muffled laughter, clinking mugs, lute music |
| Residential | `ambient_village` | Birds, distant cooking, children playing |
| Chapel | `ambient_chapel` | Soft hymn, echoing footsteps, incense crackle |
| Wilderness | `ambient_forest` | Wind through trees, bird calls, rustling leaves |
| Graveyard | `ambient_graveyard` | Eerie wind, distant crows, ominous drone |
| Mountains | `ambient_mountain` | Howling wind, distant echoes, rockfall rumble |

### AudioManager Integration

```javascript
// New methods needed:
audioManager.playAmbient(soundId, volume, crossfadeDuration)
audioManager.stopAmbient(crossfadeDuration)
audioManager.setAmbientVolume(volume)

// Called by LocationManager on location change:
locationManager.onNavigate = (newLocation) => {
  const ambient = newLocation.ambientSound;
  if (ambient) {
    audioManager.playAmbient(ambient.id, ambient.volume, ambient.crossfadeDuration);
  } else {
    audioManager.stopAmbient(0.5);
  }
};
```

### Crossfade Behavior

When the player navigates between locations:
1. Current ambient fades out over `crossfadeDuration` (default 1.0s)
2. New ambient fades in over the same duration
3. Both play simultaneously during the crossfade
4. If the new location has no ambient, current ambient fades out and silence follows

### Why Ambient Sounds Per Location

- Makes each location feel distinct (market vs. chapel vs. forest)
- Provides audio feedback that the player has changed location
- Enhances immersion without requiring music tracks
- Lightweight — each ambient is a short looping synthesized sound, not a full music track

---

## 9. Save Data Structure

### Town State in Save File

```json
{
  "town": {
    "level": 2,
    "name": "Refugee Camp",
    "currentLocation": "trade_district",
    "locationHistory": ["city_root", "trade_district"],

    "buildings": {
      "market": { "level": 1, "built": true },
      "blacksmith": { "level": 1, "built": true },
      "tavern": { "level": 0, "built": false }
    },

    "resources": {
      "gold": 150,
      "wood": 20,
      "stone": 10,
      "herbs": 5,
      "ore": 0
    },

    "workers": {
      "farmers": 1,
      "miners": 0,
      "builders": 0,
      "idle": 2
    },

    "population": 5,
    "popCap": 10,

    "locationUnlocks": {
      "trade_district": true,
      "residential": true,
      "wilderness": false,
      "market_square": true,
      "market": true,
      "blacksmith": true,
      "tavern": false
    }
  }
}
```

### Why `locationUnlocks` Is a Flat Map

Instead of re-evaluating unlock conditions every time the player enters town, we cache the results. When a flag changes, quest completes, or town levels up, we re-evaluate all locations and update `locationUnlocks`. This:
- Makes rendering fast (just check `locationUnlocks[id]`)
- Allows the engine to show/hide locations without knowing unlock logic
- Is easy to debug (dump the object to see what's unlocked)

### `currentLocation` and `locationHistory`

- `currentLocation` — where the player is right now (for resume after save/load)
- `locationHistory` — breadcrumb trail (last 5 locations, for back navigation)
- Both reset to `city_root` on new game

---

## 10. Implementation Phases

### Phase 1: Navigation Framework (No Content Changes)

**Goal:** Replace the flat town screen with a hierarchical navigation system. Keep existing content (Elder Rowan, Lina, camp upgrade) working.

| Task | What | Estimate |
|---|---|---|
| 1.1 | Define location tree for current content (root → camp → shacks) | Data |
| 1.2 | Build `LocationManager` class (flat index, parent/child lookups, unlock checks) | ~100 lines |
| 1.3 | Add breadcrumb bar to town screen HTML/CSS | ~30 lines |
| 1.4 | Add back button with up-navigation | ~15 lines |
| 1.5 | Add location card rendering (dynamic from location tree) | ~60 lines |
| 1.6 | Wire card clicks to navigate into children | ~30 lines |
| 1.7 | Wire back button and breadcrumb taps | ~20 lines |
| 1.8 | Parse check + headless browser test | Testing |

**Total: ~255 lines**

### Phase 1b: Ambient Sound Support

**Goal:** Add ambient sound playback per location.

| Task | What | Estimate |
|---|---|---|
| 1b.1 | Add `playAmbient()` / `stopAmbient()` to AudioManager | ~40 lines |
| 1b.2 | Implement crossfade between ambient tracks | ~30 lines |
| 1b.3 | Add `ambientSound` field to location data schema | Data |
| 1b.4 | Wire LocationManager to trigger ambient on navigate | ~15 lines |
| 1b.5 | Create 5 initial ambient sound loops (synthesized) | ~50 lines |
| 1b.6 | Parse check + headless browser test | Testing |

**Total: ~135 lines**

### Phase 2: Side Menu

**Goal:** Add the hamburger quick-access menu.

| Task | What | Estimate |
|---|---|---|
| 2.1 | Add hamburger button and side menu overlay HTML/CSS | ~40 lines |
| 2.2 | Render location tree in side menu (recursive) | ~40 lines |
| 2.3 | Wire taps to jump directly to any location | ~20 lines |
| 2.4 | Swipe gesture to open/close on mobile | ~25 lines |
| 2.5 | Parse check + headless browser test | Testing |

**Total: ~125 lines**

### Phase 3: NPC Placement System

**Goal:** NPCs appear in their assigned locations, with priority sorting and overflow scroll.

| Task | What | Estimate |
|---|---|---|
| 3.1 | Add `location` field to NPC data schema | Data |
| 3.2 | Build `getNPCsAtLocation(locationId)` function | ~30 lines |
| 3.3 | Implement priority sort (quest > new > affection > default) | ~25 lines |
| 3.4 | Add horizontal scroll for 4+ NPCs | ~20 lines |
| 3.5 | Wire NPC assignment to flags/events | ~15 lines |
| 3.6 | Parse check + headless browser test | Testing |

**Total: ~90 lines**

### Phase 4: Unlock System & Location Growth

**Goal:** Locations unlock based on town level and quest/NPC gates.

| Task | What | Estimate |
|---|---|---|
| 4.1 | Implement `isLocationUnlocked()` evaluator | ~40 lines |
| 4.2 | Add locked location cards (grayed + lock icon + tooltip) | ~25 lines |
| 4.3 | Cache unlock state in save data | ~15 lines |
| 4.4 | Re-evaluate unlocks on flag/quest/town-level change | ~20 lines |
| 4.5 | Add 2-3 new districts with sub-districts for testing | Data |
| 4.6 | Parse check + headless browser test | Testing |

**Total: ~100 lines**

### Phase 5: Content & Polish

**Goal:** Fill out the city with real content, backgrounds, and transitions.

| Task | What | Estimate |
|---|---|---|
| 5.1 | Create SVG backgrounds for initial locations | Art |
| 5.2 | Add location transition animation (fade) | ~20 lines |
| 5.3 | Add bottom action bar (Combat, Party, Shop, Debug) | ~40 lines |
| 5.4 | Build companion management overlay | ~50 lines |
| 5.5 | Mobile responsive testing and fixes | ~30 lines |
| 5.6 | Final integration test: navigate all paths | Testing |

**Total: ~140 lines + art**

---

## 11. Gaps, Conflicts & Open Questions

### Identified Gaps

**Gap 1: No town level-up trigger.**
`game_frame.md` defines town level 1-5 but there's no mechanic to earn town XP or trigger a level-up. Town level presumably increases as buildings are built, but the threshold isn't defined.
- **Action:** Define town XP curve: e.g., each building built = 1 town XP, level up at 2/5/10/18/30.

**Gap 2: Background art volume.**
27 possible locations × 1 SVG each = 27 SVGs. This is significant art work.
- **Action:** Every location gets its own background by design. To manage volume: locations that share a visual theme can reference the same SVG file. Start with the 5-6 locations needed for the prototype (root, 2 districts, 2 buildings) and add more as the city expands.

**Gap 3: No building upgrade UI defined.**
Buildings have levels (1-3) but there's no spec for how the player upgrades them. The camp upgrade (100g) exists, but the Blacksmith upgrade, Market upgrade, etc. have no UI.
- **Action:** Each building card shows its current level and upgrade cost. Tapping the building opens its function screen (shop, forge, etc.) with an upgrade button.

**Gap 4: Side menu tree could be overwhelming at end-game.**
With 27+ locations, the side menu tree could be very long. On mobile, this requires a lot of scrolling.
- **Action:** Two-tier side menu design:
  - **Default view:** Shows 3 priority/main story quest markers (`!`) at the top, then a compact list of recent/important locations. Stick with 3 displayed at a time.
  - **"Show All" toggle:** Experienced players can tap to expand the full location tree with collapsible sections. Districts collapse by default; tapping expands.
  - Side swipe left/right to navigate between side menu pages if needed.

**Gap 5: NPC assignment conflicts.**
If two quests want the same NPC in different locations, there's a conflict. The current override system is last-write-wins.
- **Action:** Add priority to overrides. Higher-priority overrides win. Also add a `conflictResolution: 'latest' | 'highest_priority' | 'error'` config.

### Identified Conflicts

**Conflict 1: Current town screen has upgrade card + camp upgrade inline.**
The current `TownScreen` in `game2.html` has the camp upgrade as a button directly on the screen. In the new system, upgrades should happen inside the building's function screen, not on the navigation screen.
- **Resolution:** Phase 1 preserves existing behavior (upgrade card at root). Phase 4+ moves upgrades into building screens.

**Conflict 2: `game_frame.md` save structure vs. new location saves.**
`game_frame.md` has `town.buildings` as a flat object. The new system adds `town.currentLocation`, `town.locationHistory`, and `town.locationUnlocks`. These don't conflict but the save schema needs to be updated in one place.
- **Resolution:** Update `game_frame.md` §2 (Save Data Structure) after this spec is approved.

**Conflict 3: Existing NPC data has no `location` field.**
Elder Rowan and Lina in `game2.html` have no location assignment. They currently appear at the root.
- **Resolution:** Add `location: 'city_root'` as default for existing NPCs. New NPCs get explicit locations.

### Open Questions

**Q1: Should the background image change per sub-district or per district?**
- **DECIDED:** Every new location (town, district, sub-district, building) gets its own background image. If two locations share the same visual, they reference the same SVG file. No tiered system — every location has a dedicated background entry.

**Q2: How deep should the hierarchy go?**
- **DECIDED:** Cap at 4 levels (City → District → Sub-district → Building). Side swipe navigation if the breadcrumb path gets long. No deeper nesting — "rooms" within buildings can be handled by the building's function screen.

**Q3: Should the side menu show quest markers?**
- **DECIDED:** Yes, but tiered. Priority/main story quests show `!` markers on their location in the side menu. Side quests and miscellaneous quests go in a separate list. Default view shows 3 priority items at a time. Experienced players can toggle to a full list with collapsible sections.

**Q4: How does combat entry work with the new navigation?**
- **DECIDED:** Persistent bottom action bar with 4 buttons: ⚔ Combat, 🐕 Party (companion management), 🛒 Shop (global item shop), ⚙ Debug (dropdown with all debug tools). The Party button opens a companion overlay where the player manages their 3 companion slots. Debug tools accumulate in the dropdown as new ones are added; old ones move there to keep the main UI clean.

**Q5: Should locations have ambient sounds or music?**
- **DECIDED:** Yes, include ambient sounds per location from the start. Each location can define an `ambientSound` field. Examples: market chatter for Trade District, forge hammering for Blacksmith, forest wind for Wilderness, crackling fire for city root. The AudioManager needs a `playAmbient(soundId)` / `stopAmbient()` method with crossfade on location change.

**Q6: What happens to the debug "Test Town" button?**
- **DECIDED:** Keep all debug options. They move into the ⚙ Debug dropdown in the bottom action bar. As new debug tools are added per version, old ones stay in the dropdown. This preserves quick testing access without cluttering the main UI.

---

*City Builder Location Hierarchy & Navigation Spec v0.1.0 — Generated August 26, 2026*
