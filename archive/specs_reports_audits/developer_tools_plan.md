# Developer Tools Plan

> **Date:** August 29, 2026
> **Purpose:** Enable content creators to add/edit game data without touching code
> **Approach:** HTML-based editors that output JSON files mergeable with the game

---

## Concept

Since the game is modular and data-driven (all content in JSON), we can create standalone HTML tools that let developers:

1. **Create** new content (enemies, weapons, locations, stages)
2. **Edit** existing content (tweak stats, adjust balance)
3. **Preview** changes before merging
4. **Export** JSON that drops into `public/data/` or `public/content/`

Each tool is a self-contained HTML file (no build step) that reads/writes JSON.

---

## Tool List

### 1. Monster Creator (`tools/monster_creator.html`)
- Visual editor for enemy stats (HP, damage, speed, behavior)
- Behavior pattern selector (chase, swarm, wander, ranged, boss)
- SVG preview (upload or paste inline SVG)
- Wave assignment (which stage brackets spawn this enemy)
- Export: enemy entry for `enemies.json` or `EMBEDDED_DATA`

### 2. Weapon Creator (`tools/weapon_creator.html`)
- Stat editor (damage, cooldown, range, projectile count)
- Upgrade path editor (Lv1-7 stats, power spikes at 4/7)
- Visual preview (weapon icon, projectile type)
- Evolution chain editor (Tier 1→5, companion combo triggers)
- Export: weapon entry for `weapons.json` or `EMBEDDED_DATA`

### 3. Stage Creator (`tools/stage_creator.html`)
- Timeline editor (wave brackets, enemy composition)
- Boss configuration (spawn time, phases, telegraphs)
- Star condition editor (1★/2★/3★ thresholds)
- Difficulty multiplier grid (3min/5min/10min tiers)
- Export: stage entry for `stages.json`

### 4. Location Creator (`tools/location_creator.html`)
- Tree editor (regions → districts → buildings)
- NPC placement (assign NPCs to locations)
- Background image assignment
- Ambient sound assignment
- Export: location entry for `locationTree.js`

### 5. NPC Creator (`tools/npc_creator.html`)
- Portrait upload/preview (SVG or PNG)
- Dialogue tree editor (greeting, topics, responses)
- Affection tier configuration
- Gift preferences
- Quest generation rules
- Export: NPC entry for `npcData.js`

### 6. Item Creator (`tools/item_creator.html`)
- Item type selector (consumable, equipment, gift, material)
- Stat modifier editor
- Shop pricing and stock
- Drop rate configuration
- Export: item entry for `shopData.js` or `EMBEDDED_DATA`

### 7. Companion Creator (`tools/companion_creator.html`)
- Combat stats (damage, cooldown, behavior)
- Slot binding (1:1 with weapons)
- Evolution triggers
- Portrait and combat sprite preview
- Export: companion entry for `COMPANION_DATA`

### 8. Balance Calculator (`tools/balance_calc.html`)
- DPS calculator (weapon × upgrade × food × companion)
- Time-to-kill calculator (enemy HP vs player DPS)
- Economy simulator (gold income vs sinks)
- Export: balance report or stat adjustments

---

## Technical Design

### File Format
Each tool is a single HTML file with:
- Inline CSS (dark theme, matching game aesthetic)
- Inline JS (vanilla, no frameworks)
- File input/output via `<input type="file">` and download links

### Workflow
1. Developer opens tool in browser
2. Loads existing JSON (optional, for editing)
3. Creates/edits content visually
4. Exports JSON file
5. Drops JSON into `public/data/` or `public/content/`
6. Game loads updated content on next refresh

### Future Integration
When the game has an admin panel, these tools can be embedded directly:
- In-game monster editor (pause → edit enemy stats)
- Weapon tuning dashboard
- Stage timeline visualizer

---

## Priority

| Tool | Priority | Rationale |
|---|---|---|
| Monster Creator | High | Most frequent content addition |
| Weapon Creator | High | Core combat variety |
| Stage Creator | High | Defines gameplay loops |
| NPC Creator | Medium | Town/dialogue content |
| Location Creator | Medium | Town expansion |
| Item Creator | Medium | Shop/economy content |
| Companion Creator | Low | Fewer companions than enemies |
| Balance Calculator | Low | Useful but not blocking |

---

*This plan is for documentation. Actual implementation will be done after core game features are solid.*
