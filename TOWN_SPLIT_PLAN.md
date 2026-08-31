# Town Screen Split Plan — Data-Driven Architecture

**Date:** August 31, 2026
**Goal:** Make town system data-driven and modular for easy content addition
**Future:** Enable web tools for human content creation

---

## Vision

### Current State
- Town features hardcoded in TownScreen class (1,139 lines)
- Adding new NPCs, locations, or features requires modifying JavaScript
- No easy way for non-developers to add content

### Target State
- Town engine handles UI/interactions generically
- Town content loaded from external data files
- Adding new NPCs, locations, or features = adding data files
- Web tools let humans create content visually

---

## Architecture Overview

### Data-Driven Design Principle
```
Engine (Code) + Content (Data) = Feature
```

**Engine:** Handles UI mechanics, interactions, rendering
**Content:** Defines what appears, where, and how it behaves

### Example: Combat System
```
Engine: WeaponSystem, CollisionSystem, DamageSystem
Content: weapons.json, enemies.json, stages.json
Result: Add new weapon = add entry to weapons.json
```

### Example: Town System (Proposed)
```
Engine: TownEngine (panels, navigation, dialogue UI)
Content: locations.json, npcs.json, dialogues.json, farming.json
Result: Add new NPC = add entry to npcs.json
```

---

## Town Screen Split Details

### 1. Town Engine (`ui/townEngine.js` — ~500 lines)

**Purpose:** Generic town UI framework

**Responsibilities:**
- Panel management (left, right, backdrop)
- Tab navigation (dock tabs)
- Breadcrumb navigation
- Location card rendering
- Swipe gestures (region switching)
- Typewriter text animation
- Event wiring (clicks, touches)

**Data Required:** None (pure UI)

**Interface:**
```javascript
class TownEngine {
  constructor({ audioManager, onTabSwitch, onLocationSelect, onBack }) { ... }
  
  // Panel management
  openPanel(side) { ... }
  closePanels() { ... }
  
  // Navigation
  renderBreadcrumb(history) { ... }
  renderLocationCards(locations) { ... }
  
  // Content rendering (delegates to content)
  renderContent(contentRenderer) { ... }
  
  // Animation
  typewriteText(text, callback) { ... }
}
```

### 2. Town Content (`ui/townContent.js` — ~600 lines)

**Purpose:** Game-specific town features

**Responsibilities:**
- NPC dialogue system
- Companion display
- Camp upgrade
- Farming system UI
- Estate notifications
- Disaster alerts
- Sandbox config

**Data Required:**
- `data/npcData.js` — NPC definitions
- `data/svgPortraits.js` — NPC portraits
- `data/farmingConfig.js` — Farming slots
- `data/locationTree.js` — Location hierarchy
- `data/disasterEvents.js` — Disasters
- `data/estateTiers.js` — Estate upgrades
- `data/affectionTiers.js` — NPC affection

**Interface:**
```javascript
class TownContent {
  constructor({ gameManager, companionSystem, estateSystem, ... }) { ... }
  
  // NPC system
  openDialogue(npc) { ... }
  showChoices(npc) { ... }
  
  // Feature renderers
  renderCompanionSlots() { ... }
  renderFarmingButton() { ... }
  renderUpgradeCard() { ... }
  
  // Notifications
  showDisasterNotification(disaster) { ... }
  showEstateProduction(estate, produced) { ... }
}
```

### 3. Town Screen (`ui/town.js` — ~50 lines)

**Purpose:** Orchestrator

**Responsibilities:**
- Combine engine + content
- Wire dependencies
- Provide show/hide interface

**Interface:**
```javascript
class TownScreen {
  constructor(deps) {
    this.engine = new TownEngine(deps);
    this.content = new TownContent(deps);
  }
  
  show(stats) {
    this.engine.show();
    this.content.renderInitialContent();
  }
  
  hide() {
    this.engine.hide();
  }
}
```

---

## Data File Structure

### Current Data Files
| File | Purpose | Format |
|------|---------|--------|
| `data/npcData.js` | NPC definitions | JS object |
| `data/svgPortraits.js` | NPC portraits | JS object (SVG strings) |
| `data/locationTree.js` | Location hierarchy | JS object |
| `data/farmingConfig.js` | Farming settings | JS object |
| `data/shopData.js` | Shop items | JS object |
| `data/disasterEvents.js` | Disasters | JS object |
| `data/estateTiers.js` | Estate upgrades | JS object |
| `data/affectionTiers.js` | NPC affection | JS object |

### Proposed New Data Files
| File | Purpose | Format |
|------|---------|--------|
| `data/dialogues.js` | Dialogue trees | JS object |
| `data/quests.js` | Quest definitions | JS object |
| `data/events.js` | Town events | JS object |

### Data Schema Examples

#### NPC Definition (`data/npcData.js`)
```javascript
const NPC_DATA = {
  elder_rowan: {
    id: 'elder_rowan',
    name: 'Elder Rowan',
    location: 'city_root',
    portrait: 'elder_rowan',  // References SVG_PORTRAITS
    greeting: 'Welcome, young one...',
    topics: [
      {
        text: 'Tell me about the camp',
        response: 'We have survived much...',
        flag: 'talked_to_rowan',
        affection: 5,
      },
      {
        text: 'Any work available?',
        response: 'The graveyard needs clearing...',
        close: false,
      },
    ],
    unlockCondition: null,  // Always available
  },
};
```

#### Location Definition (`data/locationTree.js`)
```javascript
const LOCATION_TREE = {
  regions: [
    {
      id: 'town',
      name: 'Town',
      background: 'assets/town_refugee_camp.svg',
      locations: {
        city_root: {
          name: 'Refugee Camp',
          icon: '🏕️',
          npcs: ['elder_rowan', 'lina'],
          children: ['graveyard', 'forest'],
        },
        graveyard: {
          name: 'Graveyard',
          icon: '💀',
          npcs: [],
          children: [],
          unlockCondition: 'talked_to_rowan',
        },
      },
    },
  ],
};
```

#### Farming Config (`data/farmingConfig.js`)
```javascript
const FARMING_CONFIG = {
  slots: [
    { id: 1, type: 'companion', label: '🐕 Companion' },
    { id: 2, type: 'adventurer', label: '⚔️ Adventurer' },
    { id: 3, type: 'flexible', label: '🔄 Flexible' },
  ],
  stages: ['stage_graveyard', 'stage_forest'],
  durations: { quick: 180, standard: 300, highlight: 600 },
};
```

---

## Content Creation Workflow

### Current Workflow (Developer)
1. Edit JavaScript code
2. Add new class methods
3. Wire event handlers
4. Test in browser

### Proposed Workflow (Content Creator)
1. Open web tool (browser-based)
2. Fill form (NPC name, dialogue, location)
3. Preview changes
4. Export JSON/JS file
5. Add to `data/` folder
6. Game loads new content automatically

---

## Web Tools Vision

### Tool 1: NPC Creator
**Purpose:** Create and edit NPCs

**Features:**
- Form for NPC properties (name, location, portrait)
- Dialogue tree editor (visual node graph)
- Preview dialogue in-game
- Export to `npcData.js`

### Tool 2: Location Creator
**Purpose:** Create and edit locations

**Features:**
- Visual location hierarchy editor
- Drag-and-drop NPC placement
- Background image selector
- Preview location layout
- Export to `locationTree.js`

### Tool 3: Quest Creator
**Purpose:** Create and edit quests

**Features:**
- Quest objective editor
- Reward configuration
- Prerequisite chain builder
- Export to `quests.js`

### Tool 4: Shop Creator
**Purpose:** Create and edit shop items

**Features:**
- Item form (name, cost, effect)
- Category assignment
- Price balancing tools
- Export to `shopData.js`

### Tool 5: Farming Creator
**Purpose:** Configure farming system

**Features:**
- Slot configuration
- Stage assignment
- Duration settings
- Export to `farmingConfig.js`

---

## Gap Analysis

### Identified Gaps

| Gap | Description | Priority | Solution |
|-----|-------------|----------|----------|
| 1 | No dialogue tree editor | High | Create visual node editor |
| 2 | No location hierarchy editor | High | Create drag-and-drop UI |
| 3 | No quest system yet | Medium | Design quest data schema |
| 4 | No event system yet | Medium | Design event data schema |
| 5 | No web tools exist | High | Build incrementally |
| 6 | Data format is JS, not JSON | Low | Keep JS for now (easier debugging) |

### Missing Data Schemas

| Schema | Status | Notes |
|--------|--------|-------|
| NPC | ✅ Exists | `npcData.js` |
| Location | ✅ Exists | `locationTree.js` |
| Dialogue | ⚠️ Partial | Inline in NPC data |
| Quest | ❌ Missing | Need to design |
| Event | ❌ Missing | Need to design |
| Shop Item | ✅ Exists | `shopData.js` |
| Farming | ✅ Exists | `farmingConfig.js` |

### Recommended New Schemas

#### Quest Schema (`data/quests.js`)
```javascript
const QUEST_DATA = {
  clear_graveyard: {
    id: 'clear_graveyard',
    name: 'Clear the Graveyard',
    description: 'Defeat 50 zombies in the graveyard',
    objectives: [
      { type: 'kill', target: 'zombie', count: 50 },
    ],
    rewards: {
      gold: 100,
      affection: { elder_rowan: 10 },
    },
    prerequisites: ['talked_to_rowan'],
  },
};
```

#### Event Schema (`data/events.js`)
```javascript
const EVENT_DATA = {
  zombie_horde: {
    id: 'zombie_horde',
    name: 'Zombie Horde',
    description: 'A horde of zombies approaches!',
    trigger: { type: 'random', chance: 0.1, cooldown: 300 },
    effects: [
      { type: 'spawn', enemy: 'zombie', count: 20 },
    ],
    resolution: {
      type: 'survive',
      duration: 60,
      reward: { gold: 50 },
    },
  },
};
```

---

## Implementation Plan

### Phase 1: Extract Town Engine (2 hours)
1. Create `ui/townEngine.js`
2. Move generic UI methods
3. Wire callbacks for content
4. Test navigation, panels, swipe

### Phase 2: Extract Town Content (2 hours)
1. Create `ui/townContent.js`
2. Move game-specific methods
3. Wire to engine via callbacks
4. Test all town features

### Phase 3: Document Data Schemas (1 hour)
1. Document existing schemas
2. Design quest schema
3. Design event schema
4. Create schema documentation

### Phase 4: Build Web Tools (Future)
1. NPC Creator (week 1)
2. Location Creator (week 2)
3. Quest Creator (week 3)
4. Shop Creator (week 4)

---

## Success Criteria

### Technical
- [ ] Town engine handles all UI mechanics
- [ ] Town content loads from data files
- [ ] All town features work (dialogue, farming, estate, etc.)
- [ ] No JavaScript modification needed for new content

### Content Creation
- [ ] Web tool can create new NPC
- [ ] Web tool can create new location
- [ ] Exported file loads in game
- [ ] Non-developer can add content

### Architecture
- [ ] Consistent with combat engine pattern
- [ ] Data-driven design principle followed
- [ ] Modular file structure maintained
- [ ] Easy to extend with new features

---

## References

### Similar Implementations
- **Combat Engine:** `engine/combat.js` + `data/weapons.json`
- **Companion System:** `systems/companion.js` + `data/companionData.js`
- **Stage System:** `data/stages.json` (loaded by DataManager)

### Design Principles
1. **Separation of Concerns:** Engine handles UI, content handles data
2. **Data-Driven:** Features defined by data, not code
3. **Modularity:** Each feature in its own file
4. **Extensibility:** Add content by adding data, not code

---

*Plan created by Buffy — August 31, 2026*
