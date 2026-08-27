# Implementation Plan — One Feature at a Time

> **Date:** August 26, 2026
> **Total Features:** 20 across 6 phases
> **Estimated Time:** 40-80 hours
> **Rule:** Add one feature, test it, verify it works, then move to the next.

---

## Current State

The game (game2.html) already has:
- ✅ Title screen with animated background
- ✅ 5-minute Graveyard stage (Standard tier)
- ✅ 3 weapons (Projectile, Orbit, Area)
- ✅ Dog companion
- ✅ Basic town (camp upgrade, Elder Rowan, Lina)
- ✅ Boss telegraph system
- ✅ Audio system (synthesized)
- ✅ Boss intro sequence
- ✅ Debug tools (B key, skip options)

---

## Phase A: Infrastructure

These must be built first — everything else depends on them.

### A1: Game Manager (save/load)

**What:** Central save/load system using localStorage. Stores all player progress in one JSON object.

**Why first:** Every feature reads/writes to the save. Without it, nothing persists.

**Test:** Save game, reload page, verify progress is retained (gold, weapons, town level, NPC relationships).

**Files:** New `GameManager` class in game2.html, or separate JS file.

---

### A2: External JSON Content

**What:** Move hardcoded game data (enemies, weapons, stages, pickups) to external JSON files. The engine loads them at startup.

**Why:** Makes content editable without touching code. Foundation for modular design.

**Test:** Game loads and plays identically to before. Edit a JSON value (e.g., zombie HP), reload, verify change took effect.

**Files:** `content/enemies.json`, `content/weapons.json`, `content/stages.json`, `content/pickups.json`, `content/leveling.json`.

---

### A3: ID System

**What:** Centralized ID format for all content. Example: `enemy_zombie`, `weapon_w1_projectile`, `stage_graveyard`.

**Why:** Prevents ID collisions when adding new content. Makes cross-referencing reliable.

**Test:** All existing content uses new ID format. No duplicate IDs. JSON files load correctly with new IDs.

**Files:** Update all JSON files with new ID format.

---

## Phase B: Core Combat Extensions

These extend the existing combat loop without changing the core.

### B1: Stage Tiers (3/5/10min)

**What:** Add Quick (3min) and Highlight (10min) stage options alongside the existing Standard (5min) stage.

**Why:** Different playstyles — quick grind vs. epic run. Different weapon scaling.

**Test:** Play each tier. Verify: 3min has no boss, 5min has boss at 4:00, 10min has mid-boss at 5:00 + boss at 8:00. Enemy HP scales correctly.

**Files:** Update spawn system, wave timeline, stage select screen.

---

### B2: Star Conditions (1★/2★/3★)

**What:** Performance rating system. 1★ = complete, 2★ = 2 of 4 conditions, 3★ = 1 hard + 1 additional.

**Why:** Gives players goals. Gates auto-clear and frenzy mode.

**Test:** Play stage, check star display on results screen. Verify 2★ requires specific thresholds. Verify 3★ requires mutual exclusivity.

**Files:** New star evaluation system, stage select UI update.

---

### B3: Gacha Protection

**What:** Rare drops ramp from 1% → 99% over 7 clears per stage.

**Why:** Predictable supply, no frustration. Designers can balance item acquisition.

**Test:** Play same stage 7 times without getting rare drop. Verify drop chance increases. Verify drop happens by clear 7.

**Files:** Update drop system with per-stage clear counter.

---

### B4: Frenzy Mode

**What:** Post-3★ alternate playstyle. Max spawns from start, 1.5× gold, 1.5× rare drops.

**Why:** Rewards mastery, gives endgame variety, best farming method.

**Test:** Achieve 3★ on a stage. Verify frenzy option appears. Play frenzy — verify max spawns, faster pace, better drops.

**Files:** Frenzy toggle on stage select, spawn system modifier, drop multiplier.

---

## Phase C: Companion System

These expand the companion system beyond the Dog prototype.

### C1: Companion 1:1 Binding

**What:** 3 companion slots, each bound to a weapon slot. W1=C1, W2=C2, W3=C3.

**Why:** Simplifies upgrade path. Each companion buffs its paired weapon.

**Test:** Assign companions to slots. Verify: companion damage scales with weapon level, companion attacks emit from companion position, weapon buffs apply correctly.

**Files:** Update companion system with slot binding, weapon buff integration.

---

### C2: Companion One-Place-Only Lockout

**What:** Companion can only be in ONE place — combat OR auto-clear, never both.

**Why:** Prevents double-dipping. Creates meaningful choices.

**Test:** Assign companion to auto-clear. Try to deploy in combat. Verify: blocked. Remove from auto-clear. Verify: can deploy in combat.

**Files:** Update companion status checks, auto-clear slot validation.

---

### C3: Companion Status States

**What:** Track companion states: Available, In Manual Combat, In Auto-Clear, Locked, Story Unavailable, Resting.

**Why:** Clear UI feedback. Prevents invalid assignments.

**Test:** Check companion status display. Verify: locked companions can't be deployed, story-unavailable companions show reason, resting companions have cooldown.

**Files:** Companion status UI, state management.

---

## Phase D: Town & Economy

These build out the town hub and economy.

### D1: Location Hierarchy

**What:** City → Districts → Sub-Districts → Buildings navigation system.

**Why:** Scalable town that grows from camp to city. Same system for all areas.

**Test:** Navigate through hierarchy. Verify: breadcrumb updates, back button works, NPC placement per location, background changes.

**Files:** LocationManager class, location data, navigation UI.

---

### D2: Swipe Between Regions

**What:** Horizontal swipe at root level to switch between Town, Graveyard, Forest, etc.

**Why:** Fastest way to move between major areas on mobile.

**Test:** Swipe left/right at root. Verify: region changes, ambient sound crossfades, breadcrumb updates, page indicator shows position.

**Files:** Swipe gesture handler, region data, page indicator UI.

---

### D3: Grand Bazaar Shop

**What:** Single shop with 4 tabs: Combat Consumables, Companion/Adventurer, Estate/Productivity, Gifts/Romance.

**Why:** Centralized gold sink. All purchases in one place.

**Test:** Open shop, buy items from each tab. Verify: gold deducted, item effects apply, items unlock based on town level.

**Files:** Shop UI, item data, purchase system.

---

### D4: Gold Productivity Boosts

**What:** Gold can boost output of Blacksmith, Miner, Merchant's Guild for quest completion.

**Why:** Gold feels useful. Quests with large material requirements become solvable faster.

**Test:** Start a large material quest. Buy productivity boost. Verify: output increases for 3 runs.

**Files:** Boost system, quest integration.

---

### D5: Disaster Events (Simplified)

**What:** Random gold sink events with 3-run cooldown. Player pays gold to resolve.

**Why:** Gold drain when player is loaded. Narrative flavor.

**Test:** Play several runs. Verify: disaster triggers occasionally, gold cost displayed, 3-run cooldown prevents stacking.

**Files:** Disaster trigger system, notification UI.

---

## Phase E: Progression Systems

These add long-term progression loops.

### E1: Auto-Clear (Rule of 3)

**What:** 3 farming slots: Slot 1 = companion, Slot 2 = adventurer, Slot 3 = flexible/manual. Background completion (no timer).

**Why:** Frees player from replaying mastered stages. Provides steady material income.

**Test:** Achieve 3★ on a stage. Assign to farming slot. Do other things (town, dialogue). Return — verify loot is ready to collect.

**Files:** Farming slot UI, background completion system, loot collection.

---

### E2: Affection & Romance

**What:** 4-step tier chain (Interest → Respect → Trust → Claim). Gifts, dialogue choices, dates, marriage.

**Why:** Long-term NPC relationships. Emotional investment. Multiple wives.

**Test:** Give gifts, make dialogue choices, complete quests. Verify: affection increases, tier unlocks new dialogue, date available at Respect+, marriage at Claim.

**Files:** Affection system, gift system, date VN interface, marriage quest chain.

---

### E3: Estate System

**What:** 5-tier estates (Homestead → Dynasty). Material production (no gold). Quest generation.

**Why:** Family home. Material income. Quest variety. Legacy system.

**Test:** Build estate Tier 1. Verify: materials produced per run. Upgrade to Tier 3. Verify: quests generated. Check estate UI.

**Files:** Estate UI, production system, quest generator.

---

### E4: Children & Legacy

**What:** Children grow over runs (Infant → Adult). Adult children become legacy companions with unique weapon evolutions.

**Why:** Long-term goal. Unique combat abilities. Emotional investment.

**Test:** Wait for child to reach adulthood. Choose companion path. Verify: legacy evolution unlocked, unique weapon effect active.

**Files:** Children growth system, legacy companion integration, evolution effects.

---

## Phase F: Endgame

### F1: Endgame Sandbox

**What:** Build testing mode with custom difficulty. Reuses all existing assets.

**Why:** Theorycrafting. Build comparison. Fun without progression pressure.

**Test:** Enter sandbox. Set weapon levels, companion, difficulty. Play. Verify: damage numbers visible, DPS counter works, build comparison saves.

**Files:** Sandbox mode UI, difficulty sliders, damage report system.

---

## Testing Strategy

After each feature:

1. **Parse check:** `bun tsc -b --noEmit` (if applicable)
2. **Manual playtest:** Play the game, verify the new feature works
3. **Regression check:** Verify old features still work
4. **Edge cases:** Test boundary conditions (max level, 0 gold, etc.)
5. **Update spec:** Mark feature as implemented in the spec file
6. **Commit:** Save progress with descriptive commit message

---

## Risk Areas

| Risk | Mitigation |
|---|---|
| Game Manager breaks save/load | Test save/load after every change |
| External JSON fails to load | Keep embedded fallback data |
| Companion binding breaks weapons | Test all 3 weapon-companion pairs |
| Shop prices break economy | Verify against economy simulation |
| Auto-clear produces wrong loot | Compare auto-clear vs manual loot |
| Estate production overflows | Cap material storage |

---

*Implementation Plan v1.0 — August 26, 2026*
