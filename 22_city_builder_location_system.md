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
8. [Save Data Structure](#8-save-data-structure)
9. [Implementation Phases](#9-implementation-phases)
10. [Gaps, Conflicts & Open Questions](#10-gaps-conflicts--open-questions)

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

A `☰` hamburger button at the top-right opens a slide-out side panel:

```
┌─────────────────────────────────────────┐
│  ☰ Locations                           │
├─────────────────────────────────────────┤
│  🏕 Town Center                        │
│  ├── 🏪 Trade District                 │
│  │     ├── Market                      │
│  │     ├── Blacksmith                  │
│  │     └── Tavern                      │
│  ├── 🏠 Residential                    │
│  │     ├── Shelter                     │
│  │     └── Chapel                      │
│  └── 🌲 Wilderness                     │
│        └── Graveyard                   │
├─────────────────────────────────────────┤
│  ⚔ Enter Combat                       │
│  🏠 Return to Title                    │
└─────────────────────────────────────────┘
```

- Shows **all unlocked locations** in a tree view
- Locked locations show as `🔒 District Name` (grayed out)
- Tapping any unlocked location **jumps directly there** (no sequential navigation needed)
- Swipe right or tap `✕` to close
- Also contains quick-access links: Enter Combat, Return to Title

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
│  [Return to Combat]          [Return to Title]      │
└─────────────────────────────────────────────────────┘
```

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

Each location can have its own SVG background. The background:
- Loads when the player enters the location
- Renders behind the NPC and building cards
- Is optional — locations without backgrounds get a themed solid color/gradient
- Transitions smoothly between locations (fade or slide)

### Mobile Considerations

| Feature | Mobile Implementation |
|---|---|
| Breadcrumb | Horizontally scrollable, tappable text |
| Back button | Large touch target (44×44px minimum) |
| Side menu | Swipe right to open, swipe left or tap overlay to close |
| Location cards | 3 columns on tablet, 1-2 columns on phone |
| NPC cards | Horizontal scroll row (like app icons) |
| Portrait mode | All layouts optimized for vertical phone screens |

---

## 8. Save Data Structure

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

## 9. Implementation Phases

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
| 5.1 | Create SVG backgrounds for 3 districts | Art |
| 5.2 | Add location transition animation (fade) | ~20 lines |
| 5.3 | Add "Enter Combat" and "Return to Title" to side menu | ~15 lines |
| 5.4 | Mobile responsive testing and fixes | ~30 lines |
| 5.5 | Final integration test: navigate all paths | Testing |

**Total: ~65 lines + art**

---

## 10. Gaps, Conflicts & Open Questions

### Identified Gaps

**Gap 1: No town level-up trigger.**
`game_frame.md` defines town level 1-5 but there's no mechanic to earn town XP or trigger a level-up. Town level presumably increases as buildings are built, but the threshold isn't defined.
- **Action:** Define town XP curve: e.g., each building built = 1 town XP, level up at 2/5/10/18/30.

**Gap 2: Background per location is expensive.**
27 possible locations × 1 SVG each = 27 SVGs. That's a lot of art.
- **Action:** Use a **tiered visual system**: key locations (districts, important buildings) get full SVG backgrounds. Minor locations (sub-districts, generic buildings) get a themed card with a gradient/icon instead. This reduces SVGs needed to ~8-10.

**Gap 3: No building upgrade UI defined.**
Buildings have levels (1-3) but there's no spec for how the player upgrades them. The camp upgrade (100g) exists, but the Blacksmith upgrade, Market upgrade, etc. have no UI.
- **Action:** Each building card shows its current level and upgrade cost. Tapping the building opens its function screen (shop, forge, etc.) with an upgrade button.

**Gap 4: Side menu tree could be overwhelming at end-game.**
With 27+ locations, the side menu tree could be very long. On mobile, this requires a lot of scrolling.
- **Action:** Add collapsible sections in the side menu. Districts collapse by default; tapping expands to show sub-districts and buildings.

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
- Option A: Each district has one background; sub-districts share it (simpler, fewer SVGs)
- Option B: Each sub-district has its own background (richer, more art)
- **Recommendation:** Option A for MVP. District backgrounds change; sub-districts are distinguished by card layout and NPC composition.

**Q2: How deep should the hierarchy go?**
Currently: City → District → Sub-district → Building (4 levels max). Should we allow deeper nesting (e.g., Building → Room)?
- **Recommendation:** Cap at 4 levels for v1. Deeper nesting adds navigation complexity without meaningful gameplay benefit. If needed later, "rooms" can be sub-locations within a building's function screen.

**Q3: Should the side menu show quest markers?**
If an NPC in a distant location has a quest, should the side menu show a `!` indicator on that location?
- **Recommendation:** Yes. This guides the player to quest-givers without forcing them to remember where NPCs are. Show a `!` on the location name and a `?` on the NPC name.

**Q4: How does combat entry work with the new navigation?**
Currently "Return to Combat" is a button at the bottom. In the new system, should combat entry be:
- A persistent button at the bottom (always visible)?
- An option in the side menu only?
- Both?
- **Recommendation:** Both. Persistent button at the bottom for quick access, plus in the side menu for when scrolling.

**Q5: Should locations have ambient sounds or music?**
Different districts could have different ambient audio (market chatter, forge hammering, forest wind).
- **Recommendation:** Defer to a later version. The audio system needs to support location-based ambient tracks. The current `AudioManager` doesn't have this capability yet.

**Q6: What happens to the debug "Test Town" button?**
The current title screen has a "Test Town (+100g)" button for rapid testing. Should this remain?
- **Recommendation:** Yes, keep it for development. Remove before release. It should dump the player at `city_root` with 100g, same as now.

---

*City Builder Location Hierarchy & Navigation Spec v0.1.0 — Generated August 26, 2026*
