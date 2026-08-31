# Content Registry — Modularity Engine

> **Purpose:** Single reference for all content types and how to add them
> **Last Updated:** August 31, 2026

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

**Example:**
```json
{
  "id": "w9_lightning_orb",
  "name": "Lightning Orb",
  "type": "orbit",
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

**Example:**
```json
{
  "id": "fire_elemental",
  "name": "Fire Elemental",
  "type": "elite",
  "stats": { "hp": 50, "damage": 15, "speed": 60, "size": 15, "xpValue": 10, "goldValue": 8 },
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
**File:** `data/npcData.js`
**Schema:** `schemas/npc.json`
**How to Add:**
1. Copy an existing NPC entry
2. Change `id` to unique value
3. Adjust `name`, `greeting`, `topics`
4. Add SVG portrait to `data/svgPortraits.js`

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `greeting` — First dialogue line
- `topics` — Dialogue options

**Example:**
```javascript
blacksmith: {
  id: 'blacksmith',
  name: 'Garret the Blacksmith',
  greeting: "Hmph. Another traveler.",
  topics: [
    { id: 'about_weapons', text: 'Can you forge me something?', response: "Bring me rare metal..." },
    { id: 'end', text: '[End Conversation]', close: true }
  ]
}
```

---

### 5. Locations
**File:** `data/locationTree.js`
**Schema:** `schemas/location.json`
**How to Add:**
1. Add new location to appropriate region
2. Set `id`, `name`, `icon`, `desc`
3. Add `children` for sub-locations
4. Add `npcs` for NPC placement

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `icon` — Emoji icon
- `desc` — Description

**Example:**
```javascript
blacksmith: {
  id: 'blacksmith',
  name: 'Blacksmith',
  icon: '🔨',
  desc: 'Weapons and armor',
  background: 'assets/town_blacksmith.svg',
  children: [],
  npcs: ['blacksmith']
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

### 7. Companions
**File:** `data/companionData.js`
**How to Add:**
1. Copy an existing companion entry
2. Change `id` to unique value
3. Adjust `name`, `stats`, `ability`

**Required Fields:**
- `id` — Unique identifier
- `name` — Display name
- `stats` — Combat stats per level
- `ability` — Special ability

---

## Content Loading Order

```
1. data/*.js (script tags) — NPCs, locations, shop, companions
2. content/*.json (fetch) — Weapons, enemies, stages, pickups
3. engine/*.js (script tags) — Game systems
```

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
