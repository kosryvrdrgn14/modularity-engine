# Weapon Evolution System Spec — V1.0

## Design Philosophy

**Core Fantasy:** Players start with basic weapons, unlock magical variants, and discover evolution combos with companions. Late game is about collecting legendary weapons and companions to create overpowered builds.

**Progression Curve:**
```
Early Game: Basic weapons (Sword, Dagger, Claymore)
Mid Game: Magical variants unlock (Fire Sword, Ice Dagger, etc.)
Late Game: Legendary weapons + companion combos = evolutions
End Game: Ridiculous builds, screen-filling effects
```

---

## Weapon Evolution Framework

### Weapon Tiers

| Tier | Name | Unlock | Power | Example |
|---|---|---|---|---|
| **Tier 1** | Basic | Start of game | Low | Sword |
| **Tier 2** | Magical | Stage completion | Medium | Flame Sword |
| **Tier 3** | Rare | Quest rewards | High | Frostbrand |
| **Tier 4** | Legendary | Boss drops | Very High | Spider Queen's Fang |
| **Tier 5** | Evolved | Companion combo at Lv7 | Insane | Webweaver |

### Evolution Mechanics

```
Evolution Trigger:
1. Player has Tier 3+ weapon equipped
2. Player has matching companion in same slot
3. Weapon reaches Lv7
4. Evolution activates automatically
5. Weapon transforms into evolved form

Example:
- Weapon: Frostbrand (Tier 3, Slot 2)
- Companion: Ice Sprite (Slot 2, same slot)
- Both at required levels
- At Lv7: Frostbrand evolves into "Blizzard Blade"
```

### Evolution Requirements

| Requirement | Description |
|---|---|
| Weapon Tier | Must be Tier 3 or higher |
| Companion Match | Companion must be in same weapon slot |
| Companion Unlock | Companion must be unlocked (not just acquired) |
| Weapon Level | Weapon must reach Lv7 |
| Stage Clear | Some evolutions require specific stage clears |

---

## Sword Weapon Evolution Tree

### Base Weapon: Sword (Tier 1)

**Concept:** Basic melee weapon, whip-style front+back+both attack pattern.

**Stats (Existing):**
- Range: 140-180px
- Attack Speed: 0.6-0.8s
- Pattern: Front → Back → Both

---

### Tier 2 Variants (Magical Swords)

#### Flame Sword
| Property | Value |
|---|---|
| Unlock | Complete Graveyard stage |
| Effect | +20% damage, fire trail on swing |
| Visual | Orange/red blade with flame particles |
| DPS | +25% over base Sword |

#### Frost Sword
| Property | Value |
|---|---|
| Unlock | Complete Frost Cavern stage |
| Effect | +15% damage, slows enemies 30% |
| Visual | Blue/white blade with ice particles |
| DPS | +20% over base Sword |

#### Shadow Sword
| Property | Value |
|---|---|
| Unlock | Complete Dark Abyss stage |
| Effect | +25% damage, crits from behind |
| Visual | Purple/black blade with shadow trail |
| DPS | +30% over base Sword (from behind) |

---

### Tier 3 Variants (Rare Swords)

#### Frostbrand
| Property | Value |
|---|---|
| Unlock | Quest: "Frozen Heart" |
| Effect | +30% damage, freezes enemies 1.5s |
| Visual | Crystal blue blade with frost aura |
| DPS | +35% over base Sword |
| Evolution Potential | ✅ Yes (Ice Sprite companion) |

#### Hellfire Blade
| Property | Value |
|---|---|
| Unlock | Quest: "Infernal Pact" |
| Effect | +35% damage, burns enemies (5 dmg/s for 3s) |
| Visual | Dark red blade with hellfire |
| DPS | +40% over base Sword |
| Evolution Potential | ✅ Yes (Demon companion) |

#### Venom Fang
| Property | Value |
|---|---|
| Unlock | Quest: "Serpent's Kiss" |
| Effect | +25% damage, poisons enemies (8 dmg/s for 2s) |
| Visual | Green blade with toxic drips |
| DPS | +30% over base Sword |
| Evolution Potential | ✅ Yes (Spider Queen companion) |

---

### Tier 4 Variants (Legendary Swords)

#### Spider Queen's Fang
| Property | Value |
|---|---|
| Unlock | Boss drop: Spider Queen (Webbed Caverns) |
| Effect | +40% damage, web snare on hit |
| Visual | Dark purple blade with web patterns |
| DPS | +45% over base Sword |
| Special | Webs slow enemies 50% for 2s |
| Evolution Potential | ✅ Yes (Spider Queen companion) |

#### Dragon's Tooth
| Property | Value |
|---|---|
| Unlock | Boss drop: Ancient Dragon (Dragon's Lair) |
| Effect | +50% damage, fire breath cone |
| Visual | Obsidian blade with dragon scale texture |
| DPS | +55% over base Sword |
| Special | Cone of fire deals 30% of swing damage |
| Evolution Potential | ✅ Yes (Dragon companion) |

#### Excalibur
| Property | Value |
|---|---|
| Unlock | Quest: "Holy Grail" (endgame quest chain) |
| Effect | +60% damage, holy light AoE |
| Visual | Golden blade with divine radiance |
| DPS | +65% over base Sword |
| Special | Holy light heals player 2 HP per kill |
| Evolution Potential | ✅ Yes (Angel companion) |

---

### Tier 5 Variants (Evolved Weapons)

#### Webweaver (Spider Queen's Fang + Spider Queen)
| Property | Value |
|---|---|
| Evolution | Spider Queen's Fang + Spider Queen companion (Slot 2) |
| Trigger | Both at Lv7 |
| Effect | +60% damage, web snare + fire vulnerability |
| Visual | Living blade with spider legs, dripping venom |
| DPS | +70% over base Sword |
| Special 1 | Webs snare enemies for 3s |
| Special 2 | +40% fire vulnerability for 4s |
| Combo | Pairs with fire weapons for massive damage |

**Webweaver Mechanics:**
```
Evolution sequence:
1. Player equips Spider Queen's Fang (Tier 4) in Slot 2
2. Player unlocks Spider Queen companion
3. Player assigns Spider Queen to Slot 2
4. Weapon reaches Lv7
5. Transformation animation plays (2s)
6. Weapon becomes Webweaver

Webweaver attacks:
- Standard whip pattern (front+back+both)
- Each hit applies: Web Snare (3s slow 50%)
- Each hit applies: Fire Vulnerability (+40% fire damage for 4s)
- Visual: Purple web projectiles + orange fire vulnerability icon

Combo example:
- Player has Webweaver + Fire Mage companion
- Webweaver applies +40% fire vulnerability
- Fire Mage deals +40% damage
- Total: Insane fire damage
```

---

#### Blizzblade (Frostbrand + Ice Sprite)
| Property | Value |
|---|---|
| Evolution | Frostbrand + Ice Sprite companion (Slot 2) |
| Trigger | Both at Lv7 |
| Effect | +55% damage, blizzard AoE |
| Visual | Crystal blade with swirling snow |
| DPS | +60% over base Sword |
| Special 1 | Freezes enemies 2s on hit |
| Special 2 | Blizzard aura deals 10 dmg/s to nearby enemies |
| Combo | Pairs with ice weapons for perma-freeze |

---

#### Dragon's Fury (Dragon's Tooth + Dragon)
| Property | Value |
|---|---|
| Evolution | Dragon's Tooth + Dragon companion (Slot 2) |
| Trigger | Both at Lv7 |
| Effect | +75% damage, fire breath + dragon summon |
| Visual | Obsidian blade with living dragon head |
| DPS | +80% over base Sword |
| Special 1 | Fire breath cone deals 50% of swing damage |
| Special 2 | Dragon companion becomes permanent (no cooldown) |
| Combo | Pairs with fire weapons for screen-clearing |

---

#### Holy Avenger (Excalibur + Angel)
| Property | Value |
|---|---|
| Evolution | Excalibur + Angel companion (Slot 3) |
| Trigger | Both at Lv7 |
| Effect | +80% damage, holy light + resurrection |
| Visual | Golden blade with angelic wings |
| DPS | +85% over base Sword |
| Special 1 | Holy light AoE heals player 5 HP per kill |
| Special 2 | Once per stage: resurrect with 50% HP on death |
| Combo | Ultimate survival build |

---

## Other Weapon Evolution Trees

### Dagger Evolution Tree

**Base:** Shadow Dagger (Tier 1)

**Tier 3:**
- **Venomfang** (Poison + bleed)
- **Shadowstrike** (Crit from stealth)
- **Thunderbolt** (Chain lightning on kill)

**Tier 4:**
- **Assassin's Blade** (Assassination quests)
- **Ninja Star** (Ranged daggers)
- **Soulreaper** (Life steal)

**Tier 5 (Evolved):**
- **Plaguebearer** (Venomfang + Plague Rat) —Poison spreads to nearby enemies
- **Shadow Dancer** (Shadowstrike + Shadow Mephisto) —Invisible between attacks
- **Stormcaller** (Thunderbolt + Storm Elemental) —Chain lightning hits 10 targets

---

### Claymore Evolution Tree

**Base:** Grave Claymore (Tier 1)

**Tier 3:**
- **Thunderstrike** (Lightning on swing)
- **Avalanche** (Ice damage + slow)
- **Earthquake** (Ground slam AoE)

**Tier 4:**
- **Leviathan** (Water damage + knockback)
- **Worldsplitter** (Massive range)
- **Bonesmasher** (Undead bonus damage)

**Tier 5 (Evolved):**
- **Stormbringer** (Thunderstrike + Storm Giant) —Lightning chains to 15 targets
- **Glacial Titan** (Avalanche + Frost Giant) —Freezes entire screen
- **Seismic God** (Earthquake + Earth Elemental) —Ground裂缝 persist for 10s

---

## Evolution Combo Matrix

### Sword Combos

| Weapon | Companion | Evolved Form | Special Effect |
|---|---|---|---|
| Spider Queen's Fang | Spider Queen | **Webweaver** | Webs + 40% fire vuln |
| Frostbrand | Ice Sprite | **Blizzblade** | Freeze + blizzard AoE |
| Dragon's Tooth | Dragon | **Dragon's Fury** | Fire breath + permanent dragon |
| Excalibur | Angel | **Holy Avenger** | Heal on kill + resurrection |
| Hellfire Blade | Demon | **Infernal Edge** | Hellfire + demon summon |
| Venomfang | Snake | **Toxicolor** | Poison spreads on kill |

### Dagger Combos

| Weapon | Companion | Evolved Form | Special Effect |
|---|---|---|---|
| Venomfang | Plague Rat | **Plaguebearer** | Poison spreads |
| Shadowstrike | Shadow Mephisto | **Shadow Dancer** | Stealth between attacks |
| Thunderbolt | Storm Elemental | **Stormcaller** | Chain lightning x10 |

### Claymore Combos

| Weapon | Companion | Evolved Form | Special Effect |
|---|---|---|---|
| Thunderstrike | Storm Giant | **Stormbringer** | Lightning chains x15 |
| Avalanche | Frost Giant | **Glacial Titan** | Freeze entire screen |
| Earthquake | Earth Elemental | **Seismic God** | Persistent ground裂缝 |

---

## Balance: Evolution Power Levels

### DPS Comparison

| Tier | Weapon Type | DPS Range | Example |
|---|---|---|---|
| Tier 1 | Basic | 100% | Sword |
| Tier 2 | Magical | 120-130% | Flame Sword |
| Tier 3 | Rare | 135-145% | Frostbrand |
| Tier 4 | Legendary | 150-165% | Spider Queen's Fang |
| Tier 5 | Evolved | 170-185% | Webweaver |

**Scaling:** Each tier is ~15-20% stronger than the last.

### Utility Comparison

| Tier | Utility | Example |
|---|---|---|
| Tier 1 | None | Sword (pure damage) |
| Tier 2 | Minor | Flame Sword (fire trail) |
| Tier 3 | Moderate | Frostbrand (freeze) |
| Tier 4 | Significant | Spider Queen's Fang (web snare) |
| Tier 5 | Game-changing | Webweaver (webs + 40% fire vuln) |

---

## Evolution Visual Effects

### Transformation Animation

```
Evolution sequence (2s):
1. Weapon glows with tier color (blue → purple → gold)
2. Companion joins weapon (spins around it)
3. Explosion of particles (tier color)
4. Weapon transforms into evolved form
5. Player gains buff aura (1s)
6. Floating text: "WEAPON EVOLVED!"
```

### Evolved Weapon Visuals

| Weapon | Visual Effect |
|---|---|
| Webweaver | Living blade with spider legs, dripping venom, web trails |
| Blizzblade | Crystal blade with swirling snow, ice particles |
| Dragon's Fury | Obsidian blade with dragon head, fire breath |
| Holy Avenger | Golden blade with angelic wings, holy light |

---

## Implementation Notes

### Evolution System

```javascript
// Check for evolution on weapon level up
function checkEvolution(weaponId, companionId) {
  const weapon = getWeapon(weaponId);
  const companion = getCompanion(companionId);
  
  // Must be Tier 3+ weapon
  if (weapon.tier < 3) return null;
  
  // Must be same slot
  if (weapon.slot !== companion.slot) return null;
  
  // Must both be Lv7
  if (weapon.level < 7 || companion.level < 7) return null;
  
  // Check evolution table
  const evolution = EVOLUTION_TABLE[weaponId + '+' + companionId];
  if (!evolution) return null;
  
  return evolution;
}
```

### Evolution Table Structure

```javascript
const EVOLUTION_TABLE = {
  "spider_queens_fang+spider_queen": {
    name: "Webweaver",
    tier: 5,
    damageBonus: 0.70,
    specialEffects: ["web_snare_3s", "fire_vulnerability_40_4s"],
    visual: "webweaver_svg",
    transformationTime: 2.0
  },
  // ... more evolutions
};
```

### Complexity

| System | Complexity | Notes |
|---|---|---|
| Evolution check | ⭐ Low | Simple condition check |
| Transformation animation | ⭐⭐ Medium | Particle effects + weapon swap |
| Evolved weapon mechanics | ⭐⭐⭐ High | New attack patterns + effects |
| **Total** | ⭐⭐⭐ Medium | Build incrementally |

---

## Future Additions (Noted for Later)

- **Evolution Trees:** Branching paths (e.g., Sword → Fire Sword → Phoenix Blade OR Ice Sword → Frost Blade → Blizzard Titan)
- **Cross-Weapon Evolutions:** Combine two weapons for hybrid evolution
- **Evolution Materials:** Collect items to unlock evolution paths
- **Visual Evolution:** Weapon外观 changes with each tier
- **Companion Evolution:** Companions also evolve with weapons

---

## Asset Requirements

### SVG Files Needed (Future)

| Weapon | Tier | ViewBox | Notes |
|---|---|---|---|
| Flame Sword | 2 | 16×16 | Orange blade with fire |
| Frost Sword | 2 | 16×16 | Blue blade with ice |
| Shadow Sword | 2 | 16×16 | Purple blade with shadow |
| Frostbrand | 3 | 16×16 | Crystal blue blade |
| Spider Queen's Fang | 4 | 16×16 | Dark purple with webs |
| Dragon's Tooth | 4 | 16×16 | Obsidian with dragon scale |
| Excalibur | 4 | 16×16 | Golden with divine light |
| Webweaver | 5 | 16×16 | Living blade with spider legs |
| Blizzblade | 5 | 16×16 | Crystal with swirling snow |
| Dragon's Fury | 5 | 16×16 | Obsidian with dragon head |
| Holy Avenger | 5 | 16×16 | Golden with angelic wings |

---

*Spec Version: 1.0*
*Status: Planning — No Implementation Yet*
*Next Step: File split, then implement evolution system after base weapons*
