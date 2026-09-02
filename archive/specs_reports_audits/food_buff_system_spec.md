# Food Buff System Spec — V1.0

## Design Philosophy

**Core Fantasy:** Players prepare for battle by consuming food buffs. Simple system — pick 1 food before entering a stage, get a passive stat buff for the entire run.

**Design Goals:**
- Easy to understand (1 food = 1 buff)
- Meaningful choice (different foods for different stages)
- Collectible (food items drop from stages/town)
- Scalable (can add more foods later)

---

## System Overview

```
Pre-Stage Flow:
1. Player selects stage
2. Player sees "Food Buff" selection screen
3. Player picks 1 food from inventory (or none)
4. Food is consumed
5. Stage begins with buff active
6. Buff lasts entire stage (until death or completion)
```

### Rules

| Rule | Description |
|---|---|
| **Limit** | 1 food per stage |
| **Consumption** | Food is consumed on use (gone after stage) |
| **Duration** | Buff lasts entire stage |
| **Stacking** | Only 1 food buff active at a time |
| **Obtaining** | Drops from stages, town shops, quests |

---

## Food Item Types

### Tier 1: Common Foods

| Food | Effect | Duration | Rarity | Obtain |
|---|---|---|---|---|
| **Bread** | +5 Max HP | Stage | Common | Town shop (10g) |
| **Cooked Meat** | +10% Damage | Stage | Common | Stage drop |
| **Fresh Fish** | +10% Move Speed | Stage | Common | Stage drop |
| **Apple** | +2 HP regen/5s | Stage | Common | Town shop (15g) |
| **Cheese** | +5% Gold find | Stage | Common | Stage drop |

### Tier 2: Uncommon Foods

| Food | Effect | Duration | Rarity | Obtain |
|---|---|---|---|---|
| **Hearty Stew** | +15 Max HP, +1 HP regen/5s | Stage | Uncommon | Quest reward |
| **Spiced Wine** | +15% Damage, -5% Move Speed | Stage | Uncommon | Tavern trade |
| **Grilled Steak** | +20% Damage | Stage | Uncommon | Stage drop (rare) |
| **Potion Brew** | +15% Cooldown Reduction | Stage | Uncommon | Mage quest |
| **Golden Apple** | +10 Max HP, +5% All Stats | Stage | Uncommon | Rare drop |

### Tier 3: Rare Foods

| Food | Effect | Duration | Rarity | Obtain |
|---|---|---|---|---|
| **Dragon Steak** | +30% Damage, fire trail | Stage | Rare | Dragon boss drop |
| **Phoenix Egg** | +1 revive (50% HP) | Stage | Rare | Phoenix boss drop |
| **Frost Salmon** | +25% Move Speed, freeze immune | Stage | Rare | Frost stage drop |
| **Arcane Elixir** | +25% Cooldown Reduction, +10% Crit | Stage | Rare | Mage quest chain |
| **Spider Queen's Honey** | +20% Damage, poison immune | Stage | Rare | Spider boss drop |

---

## Stat Buff Details

### Damage Buffs

| Food | Damage Bonus | Notes |
|---|---|---|
| Cooked Meat | +10% | Simple, reliable |
| Spiced Wine | +15% | Slows you slightly |
| Grilled Steak | +20% | Best common DPS buff |
| Dragon Steak | +30% | Plus fire trail effect |
| Spider Queen's Honey | +20% | Plus poison immune |

**Damage Calculation:**
```
Base Damage: 100
With Cooked Meat (+10%): 110
With Grilled Steak (+20%): 120
With Dragon Steak (+30%): 130

Example (Lv7 W1 Projectile):
Base DPS: 43
With Cooked Meat: 47.3 DPS (+10%)
With Grilled Steak: 51.6 DPS (+20%)
With Dragon Steak: 55.9 DPS (+30%)
```

### HP Buffs

| Food | HP Bonus | Regen | Notes |
|---|---|---|---|
| Bread | +5 HP | — | Simple survivability |
| Apple | — | +2 HP/5s | Sustained healing |
| Hearty Stew | +15 HP | +1 HP/5s | Best common HP buff |
| Golden Apple | +10 HP | — | Plus +5% all stats |

**HP Calculation:**
```
Base HP: 100
With Bread (+5): 105 HP
With Hearty Stew (+15): 115 HP (+ 1 HP/5s regen)

Example (surviving boss hit doing 20 damage):
Base: 100 → 80 HP (survives)
With Bread: 105 → 85 HP (survives)
With Hearty Stew: 115 → 95 HP (survives + regen)
```

### Speed Buffs

| Food | Speed Bonus | Notes |
|---|---|---|
| Fresh Fish | +10% | Simple mobility |
| Frost Salmon | +25% | Plus freeze immune |

**Speed Calculation:**
```
Base Speed: 100
With Fresh Fish (+10%): 110
With Frost Salmon (+25%): 125

Kiting becomes easier with speed buffs.
```

### Cooldown Reduction

| Food | CDR Bonus | Notes |
|---|---|---|
| Potion Brew | +15% | Attacks faster |
| Arcane Elixir | +25% | Plus +10% crit |

**CDR Calculation:**
```
Base Cooldown: 1.0s
With Potion Brew (-15%): 0.85s
With Arcane Elixir (-25%): 0.75s

Example (W1 Projectile Lv7):
Base: 0.65s cooldown → 1.54 attacks/s
With Potion Brew: 0.55s → 1.82 attacks/s (+18% DPS)
With Arcane Elixir: 0.49s → 2.04 attacks/s (+33% DPS)
```

---

## Food Combos with Weapons/Companions

### Best Foods for Each Build

| Build | Recommended Food | Why |
|---|---|---|
| **Dagger + Archer** | Grilled Steak | Maximizes burst damage |
| **Sword + Mage** | Potion Brew | Faster attacks + vulnerability |
| **Claymore + Dog** | Dragon Steak | Huge swing damage + fire trail |
| **Any + Healer** | Hearty Stew | Stack HP for maximum survivability |
| **Kiting Build** | Frost Salmon | Speed + freeze immune |

### Evolution Synergies

| Food | Evolved Weapon | Synergy |
|---|---|---|
| Dragon Steak | Dragon's Fury | Fire trail + fire breath = double fire |
| Spider Queen's Honey | Webweaver | Poison immune + web snare = safe melee |
| Frost Salmon | Blizzblade | Freeze immune + freeze = permanent slow |

---

## Balance Analysis

### DPS Increase by Food Tier

| Tier | Best DPS Food | DPS Increase | Notes |
|---|---|---|---|
| Tier 1 | Cooked Meat | +10% | Reliable, always good |
| Tier 2 | Grilled Steak | +20% | Significant boost |
| Tier 3 | Dragon Steak | +30% | Game-changing |

### Comparison to Weapon Upgrades

| Source | DPS Increase | Cost |
|---|---|---|
| W1 Lv1→Lv7 | +250% (8→28 damage) | Time/XP |
| Food Buff (Tier 1) | +10% | 10-20 gold |
| Food Buff (Tier 2) | +20% | Quest/rare drop |
| Food Buff (Tier 3) | +30% | Boss drop |

**Note:** Food buffs are **multiplicative** with weapon upgrades. A Lv7 weapon + Tier 3 food = massive damage.

### Stage Difficulty vs Food Importance

| Stage Length | Food Importance | Why |
|---|---|---|
| 3min (Quick) | Low | Short enough to survive without |
| 5min (Standard) | Medium | Helps with consistency |
| 10min (Highlight) | High | Nearly essential for late game |

---

## Food Acquisition

### Drop Sources

| Source | Food Tier | Drop Rate |
|---|---|---|
| Graveyard (Easy) | Tier 1 | 50% |
| Graveyard (Hard) | Tier 1-2 | 30% Tier 2 |
| Boss Kills | Tier 2-3 | 100% (random) |
| Town Shop | Tier 1 | Always available |
| Quests | Tier 2-3 | Quest-dependent |

### Town Shop Prices

| Food | Price | Stock |
|---|---|---|
| Bread | 10g | Unlimited |
| Apple | 15g | Unlimited |
| Cooked Meat | 25g | 3 per day |
| Fresh Fish | 25g | 3 per day |
| Cheese | 20g | 3 per day |

### Inventory

```
Inventory Rules:
- Max 10 food items stored
- Can hold multiple of same food
- Food is consumed on use
- No selling food back
- Overflow goes to mail (claim within 7 days)
```

---

## Implementation Notes

### UI Flow

```
Pre-Stage Screen:
┌─────────────────────────────────┐
│  Select Stage: Graveyard (5min) │
├─────────────────────────────────┤
│  Food Buff:                     │
│  [Bread] [Cooked Meat] [None]   │
│                                 │
│  Selected: Cooked Meat (+10% DMG)│
├─────────────────────────────────┤
│  [Start Stage]                  │
└─────────────────────────────────┘
```

### Code Structure

```javascript
class FoodBuffSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.activeBuff = null;
  }
  
  // Apply food buff at stage start
  applyBuff(foodId) {
    const food = FOOD_DATA[foodId];
    if (!food) return;
    
    this.activeBuff = {
      id: foodId,
      effects: food.effects,
      duration: 'stage'
    };
    
    // Apply stat modifications
    this.applyEffects(food.effects);
  }
  
  // Remove buff at stage end
  removeBuff() {
    if (!this.activeBuff) return;
    
    this.removeEffects(this.activeBuff.effects);
    this.activeBuff = null;
  }
  
  // Check if buff is active
  hasBuff(effectType) {
    return this.activeBuff?.effects[effectType] || false;
  }
}
```

### Complexity

| System | Complexity | Notes |
|---|---|---|
| Food data | ⭐ Low | Simple stat objects |
| Buff application | ⭐ Low | Modify player stats |
| UI selection | ⭐⭐ Medium | Grid of food items |
| **Total** | ⭐⭐ Low-Medium | Simple system |

---

## Future Additions (Noted for Later)

- **Cooking System:** Combine ingredients to make food
- **Food Recipes:** Discover recipes for better food
- **Food Storage:** Upgrade inventory capacity
- **Food Delivery:** Send food to estate wives for affection
- **Food Rot:** Food expires after X days (adds urgency)

---

## Asset Requirements

| Food | SVG Created | ViewBox | Status |
|---|---|---|---|
| Cooked Meat | `food_meat.svg` | 16×16 | ✅ Created |
| Potion Brew | `food_potion.svg` | 16×16 | ✅ Created |
| Bread | `food_bread.svg` | 16×16 | ✅ Created |
| Fresh Fish | — | 16×16 | ❌ Needed |
| Apple | — | 16×16 | ❌ Needed |
| Cheese | — | 16×16 | ❌ Needed |
| Hearty Stew | — | 16×16 | ❌ Needed |
| Grilled Steak | — | 16×16 | ❌ Needed |
| Dragon Steak | — | 16×16 | ❌ Needed |
| Phoenix Egg | — | 16×16 | ❌ Needed |
| Frost Salmon | — | 16×16 | ❌ Needed |
| Arcane Elixir | — | 16×16 | ❌ Needed |
| Spider Queen's Honey | — | 16×16 | ❌ Needed |

---

*Spec Version: 1.0*
*Status: Planning — No Implementation Yet*
*Next Step: File split, then implement food system after companions*
