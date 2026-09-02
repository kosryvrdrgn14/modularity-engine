# Content Registry — Modularity Engine

> **Purpose:** Single reference for all content types and how to add them
> **Last Updated:** September 2, 2026
> **Migration Note:** LOCATION_TREE and NPC_DATA migrated from JS globals to JSON files loaded via DataManager.

---

## Content Types

### 1. Weapons
**File:** `content/weapons.json`
**Schema:** `schemas/weapon.json`
**How to Add:**
1. Copy an existing weapon entry
2. Change `id` to unique value (e.g., `w9_new_weapon`)
3. Adjust `type`, `statsPerLevel`, `powerSpikes`, `visual`
4. Test in game

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `type` — Behavior type (projectile, orbit, area, cone, chain, melee_cone, melee_combo, melee_slam)
- `targeting` — Target selection (nearest, self, player_position)
- `unlockLevel` — Player level required
- `statsPerLevel` — Array of 7 level stats
- `visual` — Shape and color

**Optional Fields:**
- `attackArea` — Reference to `attackAreas.json` key (e.g., `"cone_flame"`, `"circle_medium"`), or null for weapons without a static area

**Example:**
```json
{
  "id": "w9_lightning_orb",
  "name": "Lightning Orb",
  "type": "orbit",
  "attackArea": null,
  "targeting": "self",
  "unlockLevel": 5,
  "statsPerLevel": [...],
  "visual": { "shape": "circle", "color": "#00BFFF" }
}
```

---

### 2. Enemies
**File:** `content/enemies.json`
**Schema:** `schemas/enemy.json`
**How to Add:**
1. Copy an existing enemy entry
2. Change `id` to unique value
3. Adjust `stats`, `behavior`, `drops`
4. Add spawn weight to stage config

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `type` — Tier (normal, elite, boss)
- `stats` — HP, damage, speed, size, XP, gold
- `behavior` — Movement pattern
- `visual` — Shape and color (e.g., `{ "shape": "circle", "color": "#3B8A30" }`)

**Example:**
```json
{
  "id": "fire_elemental",
  "name": "Fire Elemental",
  "type": "elite",
  "stats": { "hp": 50, "damage": 15, "speed": 60, "size": 15, "xpValue": 10, "goldValue": 8 },
  "visual": { "shape": "circle", "color": "#FF4500" },
  "behavior": { "pattern": "chase", "params": { "chaseSpeed": 60 } }
}
```

---

### 3. Stages
**File:** `content/stages.json`
**Schema:** `schemas/stage.json`
**How to Add:**
1. Copy an existing stage entry
2. Change `id` to unique value
3. Adjust `duration`, `waves`, `bossConfig`
4. Add enemy types to waves

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `duration` — Stage length (180, 300, 600 seconds)
- `spawnConfig` — Enemy spawn settings
- `waves` — Wave definitions

**Example:**
```json
{
  "id": "stage_volcano",
  "name": "The Volcano",
  "duration": 300,
  "spawnConfig": { "minDistance": 400, "maxDistance": 600, "maxEnemies": 200, "baseSpawnRate": 1.0 },
  "waves": [
    { "time": "0:00-0:30", "enemyTypes": ["fire_elemental"], "spawnRate": 1.0, "maxEnemies": 30 }
  ]
}
```

---

### 4. NPCs
**File:** `content/npcs.json`
**Schema:** `schemas/npc.json`
**How to Add:**
1. Copy an existing NPC entry
2. Change `id` to unique value
3. Adjust `name`, `greeting`, `topics`, `location`
4. Add SVG portrait key to `data/svgPortraits.js`

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `portraitKey` — Key into SVG_PORTRAITS object
- `location` — Location ID where NPC appears
- `greeting` — First dialogue line
- `topics` — Dialogue options

**Example:**
```json
{
  "id": "blacksmith",
  "name": "Garret the Blacksmith",
  "portraitKey": "blacksmith",
  "location": "blacksmith",
  "unlocked": true,
  "greeting": "Hmph. Another traveler.",
  "topics": [
    { "id": "about_weapons", "text": "Can you forge me something?", "response": "Bring me rare metal..." },
    { "id": "end", "text": "[End Conversation]", "close": true }
  ]
}
```

---

### 5. Locations
**File:** `content/locations.json`
**Schema:** `schemas/location.json`
**How to Add:**
1. Add new location to appropriate region
2. Set `id`, `name`, `icon`, `desc`
3. Add `children` for sub-locations
4. Link a `stageId` if the location has combat
5. Set `locked` and `unlockCondition` for progression gates

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `icon` — Emoji icon
- `desc` — Description

**Optional Fields:**
- `stageId` — Stage ID for combat (e.g., `"stage_graveyard"`), or null
- `stageConfig` — Tier options and recommended weapons
- `children` — Child location IDs
- `locked` — Whether location is locked by default
- `unlockCondition` — Game flag to unlock

**Example:**
```json
{
  "id": "cemetery",
  "name": "Cemetery",
  "icon": "🪦",
  "desc": "Rows of weathered tombstones",
  "background": "assets/town_refugee_camp.svg",
  "stageId": "stage_graveyard",
  "stageConfig": {
    "tiers": ["quick", "standard", "highlight"],
    "recommendedWeapons": ["w1_projectile", "w2_orbit", "weapon_area_pulse"]
  },
  "children": [],
  "locked": false
}
```

---

### 6. Shop Items
**File:** `data/shopData.js`
**Schema:** `schemas/shop.json`
**How to Add:**
1. Add item to appropriate category (combat, companion, estate, gifts)
2. Set `id`, `name`, `icon`, `desc`, `cost`, `effect`

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `icon` — Emoji icon
- `desc` — Description
- `cost` — Gold cost

**Example:**
```javascript
{ id: 'health_potion', name: 'Health Potion', icon: '🧪', desc: 'Restores 30 HP', cost: 50, effect: 'heal_30' }
```

---

### 7. Attack Areas
**File:** `content/attackAreas.json`
**How to Add:**
1. Copy an existing area entry
2. Change key to unique value (e.g., `"cone_fire_breath"`)
3. Set `type` (cone, circle, arc, crescent, cross, spiral, line, ring, polygon)
4. Define `params` with base values and per-level scaling
5. Reference from a weapon via `"attackArea": "your_key"`

**Structure:**
```json
"cone_fire_breath": {
  "type": "cone",
  "description": "Wide fire breath",
  "params": {
    "baseAngle": 60,
    "baseRange": 70,
    "anglePerLevel": 4,
    "rangePerLevel": 6
  },
  "visual": {
    "fillOpacity": 0.4,
    "strokeWidth": 2,
    "animation": "flicker",
    "gradient": ["#FF4500", "#FF6B00", "#FFD700"]
  }
}
```

---

### 8. Companions
**File:** `content/companions.json`
**Schema:** `schemas/companion.json` (planned)
**How to Add:**
1. Copy an existing companion entry
2. Change `id` to unique value
3. Adjust `name`, `role`, `visual`, `statsPerLevel`, `icon`, `desc`

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `role` — Role label (e.g. "Melee AoE", "Support")
- `visual` — Shape and color for rendering
- `statsPerLevel` — Array of stat objects per level (0-6)
- `icon` — Emoji icon for loadout UI
- `desc` — Short description for loadout UI

---

## Content Loading Order

```
1. data/*.js (script tags) — Shop, farming, SVG portraits, etc.
2. content/*.json (DataManager fetch) — Locations, NPCs, weapons, enemies, stages, companions, pickups, attack areas, visuals, elements
3. engine/*.js (script tags) — Game systems
```

**Note:** Locations and NPCs are now loaded as JSON via DataManager, not as JS globals. Web tools should generate pure JSON files that pass schema validation.

---

## Validation

Schemas in `schemas/` can be used to validate content:
- Use JSON Schema validators (ajv, tv4)
- Validate on load in development mode
- Show errors in console for debugging

---

## Web Tools Integration

When building web tools:
1. Use schemas to generate forms
2. Validate before export
3. Export to correct file format (JSON or JS)
4. Player can add file to `content/` or `data/` folder
5. Game loads automatically

---

*This registry is the single source of truth for content creation.*
