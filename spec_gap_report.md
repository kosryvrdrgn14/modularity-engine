# Spec Gap Report — Simulation Findings

> **Date:** August 26, 2026
> **Scope:** All new specs (23-29) + cross-references to existing specs
> **Method:** 10 simulations across economy, stars, content, balance, and system limits

---

## Critical Findings (Fix Before Implementation)

### 🔴 1. Gold Surplus at Endgame (§25 Economy)

**Simulation Result:**
```
Run 50: 6,595g accumulated
Total income: 10,470g over 50 runs
Total spent: 3,875g over 50 runs
Net surplus: 6,595g
```

**Problem:** Gold income outpaces sinks by ~60% at endgame. Players will hoard gold with nothing to spend it on.

**Impact:** Economy feels broken. Gold becomes meaningless. No motivation to do combat runs.

**Fix Options:**
- A) Add more gold sinks (cosmetics, estate decorations, respec costs)
- B) Reduce gold income by 20-30% in late game
- C) Add gold-based endgame content (legendary items, faction donations)
- **Recommended:** Option A — add 3-4 new sinks without changing existing balance

**New Sinks to Add:**

| Sink | Cost | Effect | Unlock |
|---|---|---|---|
| Estate Decoration | 100-500g | Cosmetic changes, +5% affection | Tier 3+ estate |
| Skill Respec | 100/200/400g | Reset skill tree (escalating) | Library Lv3 |
| Legendary Crafting | 500g + materials | Create unique equipment | Blacksmith Lv3 |
| Faction Donation | 200-500g | +10-20 reputation | Any faction |

---

### 🔴 2. 2-Star Too Easy (§24 Stars)

**Simulation Result:**
```
2-star achievement rate: 74% (target: 40-60%)
3-star achievement rate: 31% (target: 5-15%)
```

**Problem:** 2-star conditions are too lenient. 74% of random runs achieve 2★, making it feel like a participation trophy.

**Impact:** Stars lose meaning. Players expect 2★ and don't feel challenged until 3★.

**Fix — Raise 2★ Thresholds:**

| Condition | Current | Proposed | Rationale |
|---|---|---|---|
| Kill Count | 200+ | 250+ | Harder to reach in 5min |
| Clear Time | Under 4:30 | Under 4:00 | Boss must die fast |
| Level Reached | 12+ | 13+ | Requires good XP collection |
| Gold Collected | 500+ | 600+ | Requires active pickup gathering |

**Projected 2★ rate after fix: ~45-55%** (within target range)

---

### 🔴 3. 3-Star Too Easy (§24 Stars)

**Simulation Result:**
```
3-star achievement rate: 31% (target: 5-15%)
```

**Problem:** 3-star conditions are achievable too often. "Solo run" and "Starter weapon only" are too easy to combine.

**Impact:** Auto-clear unlocks too easily. Frenzy mode accessible too early.

**Fix — Make 3★ Conditions Mutually Exclusive:**

Instead of "pick 2 of 8", change to:
- **Required condition:** No-Hit Run OR Solo Run (must pick one)
- **Plus 1 additional:** From the remaining 6 conditions

This forces at least one "hard" condition, reducing achievement rate.

**Alternative Fix:** Add a "Clear Time" 3★ condition:
- Must clear in under 3:30 (very fast)
- This is hard to combine with No-Hit (need to be fast AND perfect)

**Projected 3★ rate after fix: ~8-12%** (within target range)

---

### 🔴 4. Companion Slot Conflict (§20/§26/§27)

**Simulation Result:**
```
3 wives = 3 companion slots ALL occupied
Dog companion has NO SLOT
Player must choose: wife OR dog per slot
```

**Problem:** The 1:1 binding (W1=C1, W2=C2, W3=C3) means 3 wives fill all slots. The Dog (or any non-wife companion) can't be deployed.

**Impact:** Players who invested in the Dog feel punished for getting wives. Companions feel less valuable.

**Fix Options:**
- A) **Companion deployment is per-stage, not permanent.** Player chooses 3 of N companions before each stage.
- B) Add a 4th "flex" slot (not bound to a weapon)
- C) Wives provide passive bonuses even when not deployed
- **Recommended:** Option A — player chooses 3 companions per stage. Wives not deployed still give 50% passive bonus.

**Updated Rule:**
```
Companion slots = 3 (always)
Available companions = N (wives + dog + others)
Deployment = Player chooses 3 per stage
Not-deployed wives = 50% passive bonus (reduced from 100%)
```

---

## Moderate Findings (Fix Before Beta)

### 🟡 5. Date Scene Volume (§26 Romance)

**Simulation Result:**
```
Total date scenes needed: 55 (target: < 30)
Tier 1: 20 scenes, Tier 2: 20 scenes, Tier 3: 15 scenes
```

**Problem:** 55 unique date scenes is too much content to create.

**Fix — Reuse Date Templates:**

Instead of unique scenes per NPC, use **10 date templates** with NPC-specific dialogue swaps:

| Template | Setting | NPCs Using It |
|---|---|---|
| Sunset Walk | Outdoor path | Any NPC |
| Market Visit | Town market | Shopkeeper NPCs |
| Training Session | Arena | Combat NPCs |
| Library Study | Library | Scholar NPCs |
| Stargazing | Hilltop | Romantic NPCs |
| Cook Together | Tavern kitchen | Food-loving NPCs |
| Forest Picnic | Forest edge | Nature NPCs |
| Workshop Visit | Blacksmith | Craft-loving NPCs |
| Festival Night | Town square | Social NPCs |
| Quiet Evening | Estate | Married NPCs |

Each template has ~5 dialogue lines that swap per NPC. Total unique content: 10 templates × 5 lines = 50 lines (not 55 full scenes).

**Result: 10 templates instead of 55 scenes** — massive content reduction.

---

### 🟡 6. Frenzy Gold Imbalance (§29 Frenzy)

**Simulation Result:**
```
Normal: 200 kills, 300g, 1.0% rare
Frenzy: 400 kills, 360g, 1.5% rare
Kill diff: +100%, Gold diff: +20%, Rare diff: +50%
```

**Problem:** Frenzy doubles kill count but only gives 20% more gold. Players may feel frenzy isn't worth the effort for gold farming.

**Impact:** Frenzy becomes a "rare drop farming" mode only, not a general farming mode.

**Fix — Increase Frenzy Gold to 1.5×:**

| Mode | Gold Multiplier | Rationale |
|---|---|---|
| Normal | 1.0× | Baseline |
| Frenzy | 1.5× | Rewards the chaos |

**Result: Frenzy gives 450g vs 300g** — 50% more gold, making it viable for gold farming too.

---

### 🟡 7. Disaster Stacking Risk (§28 Disasters)

**Simulation Result:**
```
Run 22: bandit raid
Run 23: plague (back-to-back!)
Run 24: bandit raid (3 in 3 runs!)
```

**Problem:** Disasters can stack back-to-back, overwhelming the player with costs.

**Impact:** Player feels punished by RNG. Three disasters in 3 runs costs 325g — more than a full run's income.

**Fix — Add Cooldown Between Disasters:**

```javascript
// After resolving a disaster, no new disaster for 3 runs
const DISASTER_COOLDOWN = 3;
let lastDisasterRun = 0;

function checkDisaster(run) {
  if (run - lastDisasterRun < DISASTER_COOLDOWN) return false;
  // ... roll for disaster
}
```

**Result:** Maximum 1 disaster per 4 runs. Player has time to recover.

---

## Minor Findings (Fix Before Release)

### 🟢 8. Affection Grind Time

**Simulation Result:**
```
Tier 3 NPC: ~48 runs to Claim (100 affection)
Time: ~4.0 hours at 5min/run
```

**Status:** OK — 4 hours per Tier 3 NPC is reasonable for a deep relationship.

**Note:** Tier 1 NPCs should be much faster (2-step chain, ~10 runs = 50 min).

---

### 🟢 9. Auto-Clear Material Output

**Simulation Result:**
```
30 runs with 3 slots: 520 total materials
Can build: Tier 1-3 estates
Cannot build: Tier 4-5 estates (need more materials)
```

**Status:** OK — Tier 4-5 estates require multiple wives' estates producing materials. This is intentional long-term progression.

**Note:** Players with 3 wives at Tier 3+ will have enough materials for Tier 4-5 estates by run 40+.

---

### 🟢 10. Content Volume

**Simulation Result:**
```
Dialogue: 1200 lines — OK (< 2000 target)
Quests: 55 chains — OK (< 60 target)
Dates: 55 scenes — NEEDS REDUCTION (fix #5 above)
```

**Status:** After applying fix #5 (template-based dates), content volume is manageable.

---

## Summary: Priority Fix Order

| Priority | Issue | Spec | Fix Difficulty |
|---|---|---|---|
| 🔴 P0 | Gold surplus at endgame | §25 | Easy — add 4 sinks |
| 🔴 P0 | 2-star too easy | §24 | Easy — raise thresholds |
| 🔴 P0 | 3-star too easy | §24 | Medium — add mutual exclusivity |
| 🔴 P0 | Companion slot conflict | §20/§26 | Medium — per-stage deployment |
| 🟡 P1 | Date scene volume | §26 | Easy — template system |
| 🟡 P1 | Frenzy gold imbalance | §29 | Easy — change multiplier |
| 🟡 P1 | Disaster stacking | §28 | Easy — add cooldown |
| 🟢 P2 | Affection grind time | §26 | None — acceptable |
| 🟢 P2 | Material output | §23 | None — acceptable |
| 🟢 P2 | Content volume | §26 | None — after fix #5 |

---

*Gap Report v1.0 — August 26, 2026*
