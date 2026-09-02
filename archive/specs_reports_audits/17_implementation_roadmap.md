# Implementation Roadmap — Incremental Build Plan

> **Version:** 1.0
> **Date:** August 24, 2026
> **Goal:** Expand the combat loop into a full game loop with title screen, NPC companions, town builder, and persistent state — one feature at a time with testing between each.
> **Rule:** No step starts until the previous step passes its test gate.

---

## Table of Contents

1. [Principles](#1-principles)
2. [Feature Overview](#2-feature-overview)
3. [Build Sequence](#3-build-sequence)
4. [Step Details](#4-step-details)
5. [Test Gates](#5-test-gates)
6. [Game State Tracking](#6-game-state-tracking)
7. [Risk Register](#7-risk-register)

---

## 1. Principles

1. **One feature at a time.** Each step adds exactly one feature. No combining.
2. **Test before moving on.** Every step has a test gate. If it fails, fix before proceeding.
3. **Nothing breaks.** The game must work after every step. If a step breaks the game, it's not done.
4. **Commit after each step.** Each completed step is a save point. If something goes wrong later, we can revert to the last working step.
5. **Small diffs.** Each step should be a manageable amount of code. If a step feels too big, split it.

---

## 2. Feature Overview

| # | Feature | What It Adds | Depends On |
|---|---|---|---|
| 1 | Title Screen | First thing player sees. Start game button. | Nothing |
| 2 | External Content Files | JSON files for enemies, weapons, pickups, stages | Nothing |
| 3 | ID System Integration | All entities use IDs from id_registry.json | Step 2 |
| 4 | Game State Persistence | Save/load between sessions via GameManager | Nothing |
| 5 | NPC Companion: Dog | Companion entity that follows, fetches loot, attacks | Nothing |
| 6 | NPC Companion UI | 3 slots under weapons in combat HUD | Step 5 |
| 7 | Combat → Town Transition | Game over returns to town, not restart | Step 4 |
| 8 | Basic Town Builder | Refugee camp, campfires, tents, 1-2 upgrades | Step 7 |
| 9 | Town NPC | One NPC to talk to in town | Step 8 |
| 10 | Full Loop Test | Title → Combat → Town → Combat → Town | All |

---

## 3. Build Sequence

```
Step 1: Title Screen
  ↓ test: game shows title, click starts combat
Step 2: External Content Files
  ↓ test: game loads from JSON, same behavior as before
Step 3: ID System Integration
  ↓ test: all entities use prefixed IDs, no broken refs
Step 4: Game State Persistence
  ↓ test: play, close, reopen — gold and progress saved
Step 5: NPC Companion: Dog
  ↓ test: dog follows player, picks up loot, attacks enemies
Step 6: NPC Companion UI
  ↓ test: 3 slots visible under weapons, dog icon in slot 1
Step 7: Combat → Town Transition
  ↓ test: game over shows town instead of restart
Step 8: Basic Town Builder
  ↓ test: can build campfire, tent, upgrade once
Step 9: Town NPC
  ↓ test: can talk to one NPC, dialogue appears
Step 10: Full Loop
  ↓ test: title → combat → town → combat → town, all state persists
```

---

## 4. Step Details

### Step 1: Title Screen

**What:** A title screen that appears when the game loads. Shows game title, "Press to Start" button. Clicking starts combat.

**Files changed:** `public/game2.html`

**Implementation:**
- Add a `titleScreen` div in the HTML (similar to the existing loading screen)
- Show it on page load, hide on click
- Click triggers `game.startGame()`
- Style with dark theme, game title, subtitle

**Test gate:**
- [ ] Game loads and shows title screen
- [ ] Clicking "Start" begins combat
- [ ] No JS errors
- [ ] Combat works normally after title screen

**Estimated effort:** 30 min

---

### Step 2: External Content Files

**What:** Extract embedded game data from game2.html into separate JSON files. The game loads from JSON files instead of hardcoded data.

**Files changed:** `public/game2.html`, new `content/*.json` files

**Implementation:**
- Create `content/enemies.json` — all enemy definitions
- Create `content/weapons.json` — all weapon definitions
- Create `content/pickups.json` — all pickup definitions
- Create `content/stages.json` — stage config
- Modify `DataManager` to load from JSON files (it already has `fetch` + fallback)
- Remove `EMBEDDED_DATA` constant from game2.html
- Verify fallback still works if JSON files aren't found

**Test gate:**
- [ ] Game loads enemies, weapons, pickups from JSON files
- [ ] All 5 enemy types appear correctly
- [ ] All 3 weapons work correctly
- [ ] All pickups spawn and function
- [ ] Boss spawns at 4:00 with intro sequence
- [ ] No JS errors
- [ ] Game behavior identical to before extraction

**Estimated effort:** 1-2 hrs

---

### Step 3: ID System Integration

**What:** Rename all entity IDs to use the type-prefixed snake_case format from id_system.md.

**Files changed:** `content/*.json`, `public/game2.html`

**Implementation:**
- Rename `zombie` → `enemy_zombie` in enemies.json and all references
- Rename `bat` → `enemy_bat`, etc.
- Rename `w1_projectile` → `weapon_projectile`, etc.
- Rename `exp_small` → `pickup_xp_small`, etc.
- Update ASSET_MAP keys to match new IDs
- Update all cross-references in game2.html

**Test gate:**
- [ ] All enemies use `enemy_*` IDs
- [ ] All weapons use `weapon_*` IDs
- [ ] All pickups use `pickup_*` IDs
- [ ] No broken references (grep for old IDs returns 0)
- [ ] Game plays identically to before renaming
- [ ] No JS errors

**Estimated effort:** 1 hr

---

### Step 4: Game State Persistence

**What:** GameManager saves to localStorage after combat. Loading the game restores gold, runs, and flags.

**Files changed:** `public/game2.html`

**Implementation:**
- Verify `GameManager.save()` writes to localStorage after combat
- Verify `GameManager.init()` loads from localStorage on page load
- Add gold display in combat HUD (top-right, coin icon)
- Add "Total Gold: X" on game over screen
- Verify `end_session()` correctly processes combat results
- Test save/load cycle: play → die → reload → gold persists

**Test gate:**
- [ ] Gold displays in HUD during combat
- [ ] Gold shows on game over screen
- [ ] After dying, reloading page shows saved gold
- [ ] `total_runs` counter increments correctly
- [ ] `total_kills` counter increments correctly
- [ ] No data corruption on save/load
- [ ] No JS errors

**Estimated effort:** 1 hr

---

### Step 5: NPC Companion: Dog

**What:** A dog companion that follows the player, picks up nearby loot, and attacks enemies that have hit the player.

**Files changed:** `public/game2.html`, `content/enemies.json` (or new `content/companions.json`)

**Implementation:**

**Dog behavior:**
- Spawns near player at combat start
- Follows player at 1.2x player speed (slightly faster to catch up)
- Stays within 80-120px of player (too close = backs off, too far = runs to catch up)
- When loot is within 150px, runs to it and "fetches" it (auto-collects)
- After fetching, runs back to player
- When an enemy damages the player, dog targets that enemy
- Dog attacks: bites (melee, 5 damage, 0.8s cooldown)
- Dog has no HP bar, cannot die, cannot be targeted by enemies
- Dog visual: small brown/golden shape (circle or simple SVG)

**Data structure:**
```json
{
  "id": "companion_dog",
  "name": "Rex",
  "type": "dog",
  "speed_multiplier": 1.2,
  "fetch_range": 150,
  "follow_min": 80,
  "follow_max": 120,
  "attack_damage": 5,
  "attack_cooldown": 0.8,
  "attack_range": 40,
  "visual": { "shape": "circle", "color": "#C8860A", "size": 8 }
}
```

**Test gate:**
- [ ] Dog spawns at combat start near player
- [ ] Dog follows player smoothly (no jittering)
- [ ] Dog runs to nearby loot and auto-collects
- [ ] Dog returns to player after collecting
- [ ] Dog attacks enemies that hit the player
- [ ] Dog cannot die or be targeted
- [ ] Dog has no HP bar
- [ ] No JS errors

**Estimated effort:** 2-3 hrs

---

### Step 6: NPC Companion UI

**What:** Show 3 companion slots under the weapon bar in combat HUD. Dog occupies slot 1. Slots 2-3 are empty but visible.

**Files changed:** `public/game2.html`

**Implementation:**
- Add 3 small circular slots below the weapon bar
- Slot 1: shows dog icon (brown circle) with name "Rex"
- Slots 2-3: show empty slot icons (gray circles with "+" or "Locked")
- Slots have subtle border glow when companion is active
- Companion name appears on hover/tap

**Layout:**
```
┌──────────────────────┐
│ [PW1] [PW2] [PW3]   │  ← Player weapons
│ [🐕 Rex] [+] [+]    │  ← Companion slots
│ ⏱ 2:45   💰 150     │
└──────────────────────┘
```

**Test gate:**
- [ ] 3 slots visible under weapons
- [ ] Slot 1 shows dog icon and name
- [ ] Slots 2-3 show empty/locked state
- [ ] Layout doesn't overlap with weapons or timer
- [ ] Works in portrait orientation
- [ ] No JS errors

**Estimated effort:** 1 hr

---

### Step 7: Combat → Town Transition

**What:** When combat ends (win or lose), transition to a town screen instead of just showing game over. Town shows basic info and a "Return to Combat" button.

**Files changed:** `public/game2.html`

**Implementation:**
- Add `town` GameState (add to transitions: `gameOver → town`)
- On game over, transition to town state
- Town screen shows:
  - "Refugee Camp" title
  - Gold earned this run
  - Total gold
  - "Return to Combat" button
  - Placeholder building slots (locked)
- "Return to Combat" starts a new run
- Town persists between runs (shows current gold, run count)

**Test gate:**
- [ ] Combat ends → town screen appears
- [ ] Town shows gold and run info
- [ ] "Return to Combat" starts new combat
- [ ] Gold persists between combat → town → combat cycles
- [ ] No JS errors

**Estimated effort:** 2 hrs

---

### Step 8: Basic Town Builder

**What:** Town screen has 2 buildable structures: Campfire (heals between runs) and Tent (increases max HP). Each has 1 upgrade level.

**Files changed:** `public/game2.html`, `content/buildings.json` (new)

**Implementation:**

**Buildings:**

| Building | Cost | Effect | Upgrade Cost | Upgrade Effect |
|---|---|---|---|---|
| Campfire | 50 gold | Heal 20% HP between runs | 100 gold | Heal 40% HP between runs |
| Tent | 75 gold | +10 max HP | 150 gold | +20 max HP |

**Town UI:**
- Grid layout with building cards
- Each card shows: name, cost, effect, level, "Build" or "Upgrade" button
- Buildings that can't be afforded are grayed out
- Built buildings show a checkmark and current level
- Gold display at top

**Test gate:**
- [ ] Town shows 2 building cards
- [ ] Can build Campfire for 50 gold
- [ ] Can build Tent for 75 gold
- [ ] Can upgrade Campfire for 100 gold
- [ ] Can upgrade Tent for 150 gold
- [ ] Can't build if insufficient gold
- [ ] Campfire heals between runs
- [ ] Tent increases max HP
- [ ] Buildings persist between runs
- [ ] No JS errors

**Estimated effort:** 2-3 hrs

---

### Step 9: Town NPC

**What:** One NPC in town (a wandering traveler) that the player can talk to. Shows a simple 3-line dialogue with one choice.

**Files changed:** `public/game2.html`, `content/npcs.json` (new), `content/dialogue.json` (new)

**Implementation:**

**NPC:**
- Name: "Wandering Traveler"
- Appears in town screen as a character card
- Tap/click to talk

**Dialogue:**
```
Node 1: "Traveler: Hey there. I've been wandering these roads for weeks."
  → Choice: "Where are you from?" → Node 2a
  → Choice: "Be safe out there." → Node 2b

Node 2a: "Traveler: I came from the city to the east. It's not safe there anymore."
  → (end, +1 affection)

Node 2b: "Traveler: Thanks. You too. Come find me if you need anything."
  → (end)
```

**Test gate:**
- [ ] NPC card visible in town
- [ ] Clicking NPC opens dialogue
- [ ] Dialogue shows text and choices
- [ ] Choices advance the dialogue
- [ ] Dialogue ends after final node
- [ ] NPC card shows "Talked" status after conversation
- [ ] No JS errors

**Estimated effort:** 2 hrs

---

### Step 10: Full Loop Test

**What:** End-to-end test of the complete game loop. No new code — just verification.

**Test gate:**
- [ ] Game loads → title screen appears
- [ ] Click "Start" → combat begins
- [ ] Combat works (enemies, weapons, pickups, leveling)
- [ ] Dog companion follows, fetches, attacks
- [ ] Dog UI shows in slot 1
- [ ] Gold accumulates during combat
- [ ] Boss spawns at 4:00 with intro sequence
- [ ] Combat ends (win or lose) → town screen
- [ ] Town shows gold, buildings, NPC
- [ ] Can build/upgrade buildings
- [ ] Can talk to NPC
- [ ] "Return to Combat" starts new run
- [ ] Gold and buildings persist between runs
- [ ] All state saved to localStorage
- [ ] Reloading page restores all state
- [ ] No JS errors throughout entire loop

**Estimated effort:** 1 hr (testing only, no new code)

---

## 5. Test Gates Summary

| Step | Test Type | Pass Criteria |
|---|---|---|
| 1. Title Screen | Visual + functional | Title shows, click starts combat |
| 2. External Files | Functional parity | Same behavior as before, data from JSON |
| 3. ID System | Reference integrity | 0 broken refs, same behavior |
| 4. State Persistence | Save/load cycle | Gold persists across reloads |
| 5. Dog Companion | Entity behavior | Follows, fetches, attacks, can't die |
| 6. Companion UI | Visual layout | 3 slots, correct positioning |
| 7. Town Transition | State machine | Combat → town → combat flow |
| 8. Town Builder | Resource spending | Build/upgrade, effects apply |
| 9. Town NPC | Dialogue system | Talk, choose, end |
| 10. Full Loop | Integration | Everything works end-to-end |

---

## 6. Game State Tracking

### What Gets Saved (via GameManager)

| Data | Where | When |
|---|---|---|
| Gold earned | `persistent.currency` | After each combat session |
| Gold spent | `persistent.currency` | On building/upgrade in town |
| Total runs | `counters.total_runs` | After each combat session |
| Total kills | `counters.total_kills` | After each combat session |
| Buildings owned | `persistent.town.buildings` | After build/upgrade in town |
| Building levels | `persistent.town.buildings[id].level` | After upgrade |
| NPC met | `flags.met_traveler` | After talking to NPC |
| Dog unlocked | `flags.companion_dog` | Always true (starter companion) |
| Max HP bonus | `persistent.player.base_stats.max_health` | After Tent upgrade |
| Stage completed | `flags.boss_1_defeated` | After beating the boss |

### Session Data (resets each run)

| Data | Where | Purpose |
|---|---|---|
| Current stage | `session.current_stage_id` | Which stage is active |
| Run in progress | `session.run_in_progress` | Prevents double-starts |
| Run stats | `session.run_data` | Time survived, kills, gold this run |

### Combat Result (written at end of each run)

```json
{
  "result": "win" | "loss",
  "stage_id": "stage_graveyard",
  "rewards": { "currency": 156 },
  "flags_triggered": ["boss_1_defeated"],
  "counters_updated": { "total_kills": 134 },
  "stats": { "time_survived": 185.3, "level_reached": 8 }
}
```

---

## 7. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| External file loading fails (CORS, file://) | Game won't load data | Keep embedded fallback until server deployment |
| Dog AI causes performance issues with many enemies | Frame drops | Cap dog pathfinding updates to every 3rd frame |
| Town builder UI is complex to build in canvas | Long implementation | Keep town as HTML overlay, not canvas-rendered |
| Save data corruption on partial writes | Lost progress | Use try/catch on all save operations |
| State machine gets tangled with new states | Hard to debug | Keep states simple: title, playing, levelUp, bossIntro, gameOver, town |
| ID renaming breaks dozens of references | Runtime errors | Use find-and-replace carefully, verify with grep |

---

## Total Estimated Effort

| Step | Hours |
|---|---|
| 1. Title Screen | 0.5 |
| 2. External Files | 1.5 |
| 3. ID Integration | 1 |
| 4. State Persistence | 1 |
| 5. Dog Companion | 2.5 |
| 6. Companion UI | 1 |
| 7. Town Transition | 2 |
| 8. Town Builder | 2.5 |
| 9. Town NPC | 2 |
| 10. Full Loop Test | 1 |
| **Total** | **~15 hrs** |

---

## After This Roadmap

Once the full loop works (Step 10), the next features to add would be:
- More NPC companions (cat, bird, etc.)
- More town buildings (Blacksmith, Market, Tavern)
- Equipment system
- Second stage
- Skill tree (first branch)
- Quest system (3 starter quests)
- Multiple characters

---

*Implementation Roadmap v1.0 — Generated August 24, 2026*
