# City Builder Scaling Simulation

> **Date:** August 26, 2026  
> **Purpose:** Verify the city builder design scales when fully populated  
> **Spec:** `22_city_builder_location_system.md`

---

## Full City Stats

| Metric | Count | Rule of 3 |
|---|---|---|
| Total locations | 40 | — |
| Districts | 3 | ✅ Max 3 at root |
| Sub-districts | 9 | ✅ 3 per district |
| Buildings | 27 | ✅ 3 per sub-district |
| Total NPCs | 66 | — |
| Max NPCs/location | 3 | ✅ No overflow |

---

## Navigation Scenarios

### Scenario 1: City Root
```
Top Bar:    🏕 Refugee Camp              💰 150g
Breadcrumb: Town
NPCs (3/3): [Elder Rowan] [Wandering Bard] [Town Crier]
Cards (3):  [Trade District] [Residential] [Wilderness]
Bottom:     [⚔ Combat] [🐕 Party] [🛒 Shop] [⚙ Debug]
```

### Scenario 2: Trade District
```
Top Bar:    🏪 Trade District            💰 150g
Breadcrumb: Town  ›  Trade District
NPCs (3/3): [Merchant Captain] [Tax Collector] [Mysterious Trader]
Cards (3):  [Market Square] [Artisan Row] [Warehouse District]
```

### Scenario 3: Artisan Row
```
Top Bar:    ⚒️ Artisan Row               💰 150g
Breadcrumb: Town  ›  Trade District  ›  Artisan Row
NPCs (3/3): [Apprentice Ani] [Tanner] [Alchemist]
Cards (3):  [Blacksmith] [Tannery] [Alchemist]
```

### Scenario 4: Blacksmith (Building)
```
Top Bar:    ⚒️ Blacksmith                💰 150g
Breadcrumb: Town  ›  Trade District  ›  Artisan Row  ›  Blacksmith
NPCs (1/3): [Gareth Ironhand]
Functions:  [Forge Weapon] [Upgrade Armor] [Talk to Gareth]
```

---

## Side Menu (Full View)

```
┌─────────────────────────────────────────┐
│  ☰ Locations                        ✕  │
├─────────────────────────────────────────┤
│  ⚠ PRIORITY QUESTS                     │
│  ! Blacksmith — "I need iron ore"      │
│  ! Graveyard — "The dead rise again"   │
│  ! Library — "Complete: First Lessons" │
├─────────────────────────────────────────┤
│  🏕 Town Center (3 NPCs)              │
│  🏪 Trade District ▾                   │
│  │  🛒 Market Square (3 NPCs)         │
│  │  │  🛒 Market    ⚒ Blacksmith !    │
│  │  │  🏦 Bank                         │
│  │  ⚒ Artisan Row (3 NPCs)           │
│  │  │  ⚒ Blacksmith !  🧪 Alchemist  │
│  │  │  👔 Tannery                      │
│  │  📦 Warehouse District (3 NPCs)    │
│  │     📦 Storage  🚢 Import  🤫 Fence│
│  🏠 Residential ▾                     │
│  │  🏕 Common Quarter (3 NPCs)        │
│  │  │  🏕 Shelter  🍺 Tavern  🛁 Bath │
│  │  🏛 Noble Quarter (3 NPCs)         │
│  │  │  🏛 Manor  📚 Library !  ⛪ Chapel│
│  │  🏚 Slums (3 NPCs)                 │
│  │     🏚 Camp  🔪 Back Alley  🤫 Fence│
│  🌲 Wilderness ▾                       │
│  │  💀 East Road (3 NPCs)             │
│  │  │  💀 Graveyard !  ⚔ Bandit  🏛 Ruins│
│  │  🌲 North Woods (3 NPCs)           │
│  │  │  🪓 Lumber  🌿 Grove  🐺 Post  │
│  │  ⛰ Mountains (3 NPCs)             │
│  │     ⛰ Quarry  ⛏ Mine  🚪 Gate     │
│  🔒 Arena (Complete: Prove Your Worth)│
├─────────────────────────────────────────┤
│  [Hide ▲]                              │
└─────────────────────────────────────────┘
```

---

## City Growth Progression

### Town Level 1 (Start)
- **Locations:** 4 (1 district, 3 buildings)
- **NPCs:** 6
- **Feel:** Small camp, intimate

### Town Level 2 (~3 runs)
- **Locations:** 13 (+9)
- **NPCs:** 22 (+16)
- **Feel:** Trade opens, economy starts

### Town Level 3 (~5 runs)
- **Locations:** 25 (+12)
- **NPCs:** 44 (+22)
- **Feel:** Wilderness opens, combat stages available

### Town Level 4-5 (Full)
- **Locations:** 40 (+15)
- **NPCs:** 66 (+22)
- **Feel:** Thriving city, all content available

---

## Scaling Issues Found

### 1. Background Art Volume
- **Problem:** 40 locations × 1 SVG = 40 SVGs
- **Solution:** Reuse SVGs across same-theme locations
- **Actual unique backgrounds:** ~15-20

### 2. NPC Portrait Volume
- **Problem:** 66 NPCs × 1 portrait = 66 SVGs
- **Solution:** Template-based portraits for minor NPCs
- **Key NPCs with unique art:** ~20
- **Minor NPCs with templates:** ~46

### 3. Side Menu Scroll
- **Problem:** 40 entries = long scroll on mobile
- **Solution:** Collapse by default, Show All toggle
- **Priority quests at top:** 3 max
- **Recent locations in middle**

### 4. Pacing Jump
- **Problem:** Level 1→2 adds 9 locations at once
- **Solution:** Unlock sub-districts independently within districts
- **Or:** Start with only 1 sub-district per new district

### 5. Breadcrumb Length
- **Problem:** 4 levels deep = long breadcrumb on mobile
- **Solution:** Horizontal scroll, side swipe for long paths
- **Or:** Abbreviate: "Town › ... › Artisan Row › Smith"

---

## Recommendations

1. **Progressive unlock within districts** — Don't unlock all 3 sub-districts at once. Unlock 1, then the others via quests/flags.
2. **Template NPC portraits** — Create 5-6 base templates (warrior, merchant, scholar, etc.) and vary colors/features. Only key NPCs get unique art.
3. **Shared backgrounds** — Market Square and Market share the same visual. Artisan Row and Blacksmith share the forge theme.
4. **Side menu smart defaults** — Show last 3 visited locations + 3 priority quests. Full tree only on "Show All" toggle.
5. **Breadcrumb abbreviation** — On mobile, show only last 2 segments with "..." for earlier ones.

---

*City Builder Scaling Simulation — August 26, 2026*
