# Adjacency System Spec (Backpack-Style)

> **Game Version:** Future (not yet implemented)
> **Date:** August 29, 2026
> **Status:** Design — Do not implement until core systems are stable
> **Depends On:** Weapon system, Companion system, Evolution system

---

## 1. Overview

Inspired by Backpack Battles, each equipped item (weapon or companion) occupies a slot in a grid. Items have **tags/properties** that can enhance adjacent items. Placement matters — the same 3 weapons + 3 companions can produce wildly different builds depending on how they're arranged.

### Why Adjacency

| Problem | Solution |
|---|---|
| Late-game builds feel samey | Adjacency creates exponential variety from limited items |
| No meaningful gear decisions | Placement adds a puzzle layer to loadout |
| Weapons scale linearly | Adjacency multipliers create exponential scaling for late-game |
| Companion-weapon synergy is boring | Adjacency enables "evolution" through right combos |

---

## 2. Grid Layout

The loadout is a **1×6 strip** with defined adjacency:

```
┌─────┬─────┬─────┬─────┬─────┬─────┐
│ C1  │ W1  │ W2  │ W3  │ C2  │ C3  │
└─────┴─────┴─────┴─────┴─────┴─────┘
```

**Adjacency rules (left/right neighbors only):**

| Slot | Left Neighbor | Right Neighbor | Total Adjacencies |
|---|---|---|---|
| C1 | — | W1 | 1 |
| W1 | C1 | W2 | 2 |
| W2 | W1 | W3 | 2 |
| W3 | W2 | C2 | 2 |
| C2 | W3 | C3 | 2 |
| C3 | C2 | — | 1 |

**Key insight:** W2 and W3 are the most connected — they receive buffs from both sides. C2 sits between W3 and C3, creating a secondary power center.

### Why This Layout

- C1↔W1: Companion 1 buffs Weapon 1 directly (tight synergy)
- W1↔W2↔W3: Weapons chain together — placing a fire weapon next to a vuln weapon amplifies both
- W3↔C2: Second companion buffs the third weapon
- C2↔C3: Companions can buff each other (e.g., Healer heals adjacent Archer)

---

## 3. Tag System

Every item (weapon or companion) has **tags** that define what it can give and receive.

### Tag Types

| Tag | Description | Example Items |
|---|---|---|
| `fire` | Deals fire damage or applies burn | Flame Wave, Dragon companion |
| `frost` | Deals frost damage or slows | Ice Bolt, Frost Mage companion |
| `lightning` | Deals lightning damage or chains | Arcane Bolt, Storm Mage companion |
| `physical` | Deals physical damage | Projectile, Sword, Claymore |
| `poison` | Applies poison DoT | Spider, Poison Dart |
| `holy` | Heals or shields | Healer, Shield Bash |
| `dark` | Debuffs or debuffs enemies | Necromancer, Curse |
| `speed` | Affects attack/move speed | Panther, Dagger |
| `range` | Affects projectile range/speed | Archer, Projectile |
| `aoe` | Affects area of effect | Area Pulse, Hawk dive |
| `vuln` | Increases damage taken by enemies | Mage, Owl |
| `summon` | Creates entities | Rat swarm, Skeleton summon |

### Tag Interactions

Tags interact with adjacent items through **buff rules**:

| Attacker Tag | Adjacent Tag | Effect |
|---|---|---|
| `fire` + `vuln` | Fire damage +25% to vuln'd targets |
| `frost` + `aoe` | Slow applies to full AoE radius |
| `lightning` + `speed` | Chain lightning fires 20% faster |
| `physical` + `fire` | Physical hits apply burn (1s DoT) |
| `poison` + `range` | Poison range +50% |
| `holy` + `summon` | Summons get +20% HP |
| `dark` + `vuln` | Debuff duration +50% |
| `speed` + `physical` | Physical attack speed +15% |

### Why Tags Over Hardcoded Synergies

- Adding a new item only requires assigning tags — no code changes
- Tag interactions are composable: 3 items with `fire` + `vuln` + `aoe` = amplified fire AoE
- Easy to balance: adjust tag multipliers, not individual item stats
- Future-proof: new tags can be added without breaking old ones

---

## 4. Evolution System

When a **companion** is adjacent to the **right weapon**, the weapon can evolve at level 7.

### Evolution Rules

| Companion | Adjacent Weapon | Evolution | New Effect |
|---|---|---|---|
| Dog | Sword | Wolf Fang Blade | +lifesteal on hit |
| Healer | Any | Blessed Weapon | Heals player on kill |
| Archer | Projectile | Homing Arrow | Projectiles track enemies |
| Mage | Arcane Bolt | Storm Call | Lightning chains to 5 targets |
| Knight | Claymore | Earthsplitter | Ground fissure AoE |
| Panther | Dagger | Shadow Strike | Teleport-strike on crit |
| Spider | Any | Web Shot | Slow + poison on all hits |
| Hawk | Flame Wave | Phoenix Dive | Fire trail on dive |
| Owl | Any | Piercing Gaze | Attacks ignore armor |

### Why Companion-Weapon Evolution

- Creates meaningful companion choices (not just "best DPS companion")
- Adjacency requirement adds puzzle element to loadout
- Evolution at Lv7 gives a clear power spike goal
- Encourages experimentation with unusual combos

---

## 5. Scaling Formula

### Adjacency Multiplier

Each tag on an item provides a **base buff** to adjacent items with compatible tags:

```
buff = baseBuff × (1 + adjacentTagCount × 0.1)
```

Example:
- W2 (Fire) has `fire` tag
- C1 (next to W2) has `fire` tag
- W2 gets: `+10% fire damage` from C1's `fire` tag
- If W2 also has `vuln` tag and C2 has `vuln` tag: `+10% vuln` from C2

### Late-Game Scaling

At max evolution (Lv7 weapons + evolved companions), adjacency multipliers stack:

- Base weapon damage × (1 + tag buffs)² = exponential scaling
- This creates the "ridiculous" late-game power spikes similar to Vampire Survivors

---

## 6. UI Design (Future)

### Loadout Screen

```
┌──────────────────────────────────────┐
│  Equipment Grid                       │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┐│
│  │ C1  │ W1  │ W2  │ W3  │ C2  │ C3  ││
│  │ 🐕  │ 🗡️  │ 🔥  │ ⚡  │ 🧙  │     ││
│  │Dog  │Sword│Flame│Arc  │Mage │Empty││
│  │     │ Lv4 │ Lv7 │ Lv2 │ Lv5 │     ││
│  └─────┴─────┴─────┴─────┴─────┴─────┘│
│                                       │
│  Active Buffs:                        │
│  • Fire + Vuln → +25% fire damage     │
│  • Speed + Physical → +15% atk speed  │
│  • Adjacent fire tags → +20% burn DoT │
│                                       │
│  [Swap Items]  [Evolution Guide]      │
└──────────────────────────────────────┘
```

### Drag-and-Drop

- Long-press an item to pick it up
- Drag to another slot to swap
- Adjacent items pulse briefly to show buff connections
- Evolution indicators glow when the right combo is adjacent

---

## 7. Implementation Notes

### DO NOT Implement Until:

- [ ] Core combat loop is stable (all 8 weapons working)
- [ ] Companion system is fully functional (13 companions)
- [ ] Weapon evolution system is designed and balanced
- [ ] Stage progression is complete (3+ stages)
- [ ] UI framework can handle drag-and-drop

### When Implementing:

1. Add `tags` array to weapon and companion data definitions
2. Create `AdjacencySystem` class that:
   - Reads the 6-slot grid
   - Calculates buff multipliers from adjacent tags
   - Applies multipliers to weapon/companion stats each frame
3. Create `EvolutionSystem` class that:
   - Checks companion adjacency to weapons at Lv7
   - Triggers evolution event with new weapon stats
4. Update UI to show:
   - Grid layout with drag-and-drop
   - Active buff indicators
   - Evolution glow effects

### Data Format (Future)

```json
{
  "id": "w7_sword",
  "name": "Soul Sword",
  "tags": ["physical", "speed"],
  "adjacencyBuffs": {
    "fire": "+10% fire damage to adjacent",
    "physical": "+5% physical damage to adjacent"
  },
  "evolutions": {
    "dog": {
      "name": "Wolf Fang Blade",
      "effect": "+15% lifesteal on hit",
      "triggerLevel": 7
    }
  }
}
```

---

## 8. Gaps & Open Questions

**Q1: Should adjacent buffs be visible during combat?**
- Option A: Yes — small icons pulse when buffs are active
- Option B: No — player learns through experimentation
- **Recommendation:** Yes, but subtle. Small buff icons near weapon slots.

**Q2: Can items have more than 3 tags?**
- **Recommendation:** Max 3 tags per item. Keeps interactions manageable.

**Q3: Should there be negative adjacency (penalties)?**
- Example: Fire weapon next to Frost weapon = both weakened
- **Recommendation:** No penalties in v1. Add later for difficulty modes.

**Q4: How does this interact with the dev loadout selector?**
- The selector should show the grid layout, not just a list
- Player arranges items in the grid before confirming
- **Recommendation:** Update dev selector to grid view when adjacency ships.

**Q5: Does the 1×6 strip support future expansion?**
- Option A: Expand to 2×3 grid (6 items, 12 adjacencies)
- Option B: Keep 1×6 strip, add "artifact" slots for passive items
- **Recommendation:** 1×6 for now. 2×3 grid as v2 expansion.

---

*Adjacency System Spec v0.1.0 — August 29, 2026*
*Design reference only. Do not implement until core systems are stable.*
