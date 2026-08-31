# Design Principles — Modularity Engine

**Date:** August 31, 2026
**Purpose:** Guide future development decisions
**Status:** Active — Reference this document before making architectural changes

---

## Core Principle: Data-Driven Design

### Statement
> **Features are defined by data, not code. Adding content should require adding data files, not modifying JavaScript.**

### What This Means

| Approach | Bad (Code-Driven) | Good (Data-Driven) |
|----------|-------------------|-------------------|
| Add new weapon | Edit WeaponSystem.js | Add entry to weapons.json |
| Add new NPC | Edit TownScreen.js | Add entry to npcData.js |
| Add new stage | Edit SpawnSystem.js | Add entry to stages.json |
| Add new dialogue | Edit _showChoices() | Add entry to dialogues.json |

### The Pattern
```
Engine (Generic Logic) + Content (Data Files) = Feature
```

**Engine:** Handles UI mechanics, interactions, rendering
**Content:** Defines what appears, where, and how it behaves

---

## Architectural Patterns

### Pattern 1: Engine + Content Separation

**Example: Combat System**
```
engine/combat.js      → WeaponSystem, CollisionSystem, DamageSystem
data/weapons.json     → Weapon definitions (stats, visuals, behaviors)
data/enemies.json     → Enemy definitions (stats, patterns, drops)
data/stages.json      → Stage configurations (waves, timers, bosses)
```

**Example: Town System**
```
ui/townEngine.js      → Panels, navigation, swipe, typewriter
ui/townContent.js     → Dialogue, farming, estate, disasters
data/npcData.js       → NPC definitions (dialogue, locations)
data/locationTree.js  → Location hierarchy
data/farmingConfig.js → Farming settings
```

**Example: Shop System**
```
ui/shop.js            → Shop overlay, tabs, rendering
data/shopData.js      → Item definitions (cost, effects, categories)
Result: Add new item = add entry to shopData.js
```

**Example: Companion System**
```
systems/companion.js  → AI state machine, combat logic
data/companionData.js → Companion stats (7 levels each)
```

### Pattern 2: Modular File Structure

```
public/
├── data/           # Content definitions (JSON/JS)
├── engine/         # Core systems (generic logic)
├── systems/        # Game systems (feature logic)
├── ui/             # UI components (presentation)
└── game2.html      # Entry point (orchestrator)
```

### Pattern 3: Event-Driven Communication

**Instead of:**
```javascript
// BAD: Direct coupling
weaponSystem.damageEnemy(enemy, damage);
```

**Use:**
```javascript
// GOOD: Event-driven
eventBus.emit('damageEntity', { entity: enemy, damage: damage });
```

---

## Web Tools Intent

### Vision
> **Non-developers should be able to create game content using visual web tools, without touching code.**

### Tool Categories

| Tool | Purpose | Data Files |
|------|---------|------------|
| NPC Creator | Create/edit NPCs | npcData.js, svgPortraits.js |
| Location Creator | Create/edit locations | locationTree.js |
| Quest Creator | Create/edit quests | quests.js (future) |
| Shop Creator | Create/edit shop items | shopData.js |
| Farming Creator | Configure farming | farmingConfig.js |
| Weapon Creator | Create/edit weapons | weapons.json |
| Enemy Creator | Create/edit enemies | enemies.json |
| Stage Creator | Create/edit stages | stages.json |

### Tool Architecture

```
┌─────────────────────────────────────────────────┐
│                Web Tool (Browser)               │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
│  │ Form Inputs │  │ Visual Editor│  │Preview │ │
│  └─────────────┘  └─────────────┘  └────────┘ │
├─────────────────────────────────────────────────┤
│              Data Validation Layer              │
├─────────────────────────────────────────────────┤
│           Export to JSON/JS Files               │
└─────────────────────────────────────────────────┘
```

### Workflow

1. **Open Tool:** Creator loads in browser
2. **Edit Content:** Fill forms, use visual editors
3. **Preview:** See changes in real-time
4. **Export:** Generate data file
5. **Import:** Add file to `data/` folder
6. **Play:** Game loads new content automatically

---

## Development Guidelines

### Before Making Changes

1. **Check this document** — Does the change follow data-driven principles?
2. **Ask:** Can this feature be defined by data instead of code?
3. **Ask:** Will this change enable or block future web tools?

### When Adding Features

1. **Separate engine from content** — Generic logic vs game-specific data
2. **Create data schemas** — Define what data the feature needs
3. **Document the schema** — So web tools can be built later
4. **Test with mock data** — Ensure engine works with any data

### When Refactoring

1. **Move toward data-driven** — Extract hardcoded values to data files
2. **Preserve engine interfaces** — Don't break the engine/content contract
3. **Update documentation** — Keep schemas and examples current

---

## Data Schema Standards

### File Naming
- `data/[feature]Data.js` — Main data file
- `data/[feature]Config.js` — Configuration file
- `data/[feature]Schema.js` — Schema definition (for validation)

### Data Structure
```javascript
const FEATURE_DATA = {
  [unique_id]: {
    id: 'unique_id',
    name: 'Display Name',
    description: 'What this does',
    // Feature-specific properties
  },
};
```

### Schema Documentation
Each data file should include:
1. **Purpose:** What this data defines
2. **Properties:** List of all fields with types
3. **Examples:** Sample entries
4. **Constraints:** Required fields, valid ranges

---

## Future Considerations

### Scaling
- **Data files:** Can grow indefinitely (no code changes needed)
- **Engine files:** Keep under 500 lines (split if larger)
- **Context window:** Smaller files = easier AI assistance

### Performance
- **Lazy loading:** Load data files only when needed
- **Caching:** Cache parsed data in memory
- **Validation:** Validate data on load, not every frame

### Testing
- **Unit tests:** Test engine with mock data
- **Integration tests:** Test engine + real data
- **Visual tests:** Verify rendering with screenshots

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `FILE_SPLIT_REPORT.md` | Current file structure |
| `FILE_SPLIT_PLAN.md` | Split architecture decisions |
| `TOWN_SPLIT_PLAN.md` | Town system split details |
| `TOWNSCREEN_REVIEW.md` | Town analysis |

---

## Checklist for Future Work

### Before Starting a Feature
- [ ] Can this be data-driven?
- [ ] What data files are needed?
- [ ] What engine changes are needed?
- [ ] Will this enable web tools?

### Before Merging Changes
- [ ] Does it follow data-driven principles?
- [ ] Are data schemas documented?
- [ ] Is the engine/content separation clean?
- [ ] Will web tools be able to create this content?

---

*Document created by Buffy — August 31, 2026*
*Reference this before making architectural decisions*
