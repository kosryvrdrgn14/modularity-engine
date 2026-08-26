# Auto-Clear & Farming System Spec

> **Game Version:** v0.4.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D1 (3 companion slots), D3 (stage tiers), D5 (1:1 binding)
> **Depends On:** `05_stages_spec.md` (star conditions), `20_companion_combat_spec.md` (companion system)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Unlock Criteria](#2-unlock-criteria)
3. [Farming Slots](#3-farming-slots)
4. [Simulation Rules](#4-simulation-rules)
5. [Hired Adventurers](#5-hired-adventurers)
6. [Companion Lockouts](#6-companion-lockouts)
7. [Named Farming Plans](#7-named-farming-plans)
8. [Loot & Rewards](#8-loot--rewards)
9. [UI Design](#9-ui-design)
10. [Gaps & Open Questions](#10-gaps--open-questions)

---

## 1. Overview

Auto-clear lets players farm stages without replaying them manually. After achieving 3★ on a stage, the player can assign farming slots to automatically clear that stage on a timer. This rewards mastery and reduces grind fatigue.

### Core Concept

```
Player achieves 3★ on Graveyard
  → Unlocks auto-clear for Graveyard
  → Assigns a farming slot (companion or hired adventurer)
  → Slot runs in background (timer = best clear time × 1.2)
  → Loot delivered to player's inventory when complete
  → Player can start another run or manage town while waiting
```

### Why Auto-Clear Exists

| Problem | Solution |
|---|---|
| Late-game players have mastered early stages | Auto-clear lets them farm without replaying trivial content |
| Multiple wives = multiple estates = massive material needs | Auto-clear provides steady material income |
| Grind fatigue | Set it and forget it — check back when timer finishes |
| Speed reward | Faster manual clears = faster auto-clear timers |

---

## 2. Unlock Criteria

A stage becomes auto-clear eligible when the player achieves **3★** on it.

### Star Requirements Recap (from `05_stages_spec.md`)

| Star | Requirements |
|---|---|
| 1★ | Complete the stage (survive or kill boss) |
| 2★ | Performance thresholds (kill count, time, level, gold) |
| 3★ | Mastery challenges (no-hit, starter weapon only, underleveled, etc.) |

### Auto-Clear Unlock Flow

```
Stage Select Screen
  ├── ★☆☆ (1★) — "Play" button only
  ├── ★★☆ (2★) — "Play" button only
  └── ★★★ (3★) — "Play" + "Auto-Clear" buttons
                    └── Tap "Auto-Clear" → Farming Slot Manager
```

### Why 3★ Required

- 1★ = basic completion (anyone can do it)
- 2★ = skill demonstrated (but not mastery)
- 3★ = mastery proven (the simulation should produce similar results)
- Prevents auto-farming of stages the player hasn't truly mastered

---

## 3. Farming Slots

### Slot System

The player has **3 farming slots** (expandable via town upgrades).

| Slot | Source | Notes |
|---|---|---|
| Slot 1 | Available from start | Basic farming |
| Slot 2 | Town Level 3 | Second parallel farm |
| Slot 3 | Town Level 5 | Maximum farming capacity |

### Slot Assignment

Each slot can be assigned to:
1. **A 3★-cleared stage** (required)
2. **A unit** — either a companion or a hired adventurer
3. **Optional: A farming plan** (saved configuration)

### Slot States

| State | Meaning | Timer |
|---|---|---|
| **Idle** | No stage assigned | N/A |
| **Running** | Stage being auto-cleared | Counts down |
| **Complete** | Loot ready to collect | N/A (until collected) |
| **Locked** | Slot not yet unlocked | N/A |

---

## 4. Simulation Rules

Auto-clear simulates a combat run using the player's current loadout and the stage's data.

### What Gets Simulated

| Component | Simulated? | How |
|---|---|---|
| Player weapons | ✅ Yes | Uses current weapon levels from save data |
| Player stats | ✅ Yes | Uses baseStats + skill tree bonuses |
| Companion | ✅ Yes | If assigned, uses companion's current level |
| Enemy waves | ✅ Yes | Replays the stage's wave timeline |
| Spawn rates | ✅ Yes | Same as manual play |
| Boss | ✅ Yes | Same HP, same phases |
| Drops | ⚠️ Modified | See §8 (Loot & Rewards) |
| Player skill | ❌ No | Simulated as "optimal" — no mistakes, good positioning |
| RNG variance | ✅ Yes | Randomized within expected ranges |

### Simulation Duration

```
simTime = bestClearTime × 1.2
```

- Uses the player's **best recorded clear time** for that stage
- Multiplied by 1.2 (20% slower than best — accounts for RNG variance)
- Minimum: 60 seconds (even fast stages take at least 1 minute)
- Maximum: stage duration (can't be longer than the stage itself)

### Simulation Outcome

The simulation always produces a **successful clear** (since the player has 3★ mastery). The variance is in loot quality, not success/failure.

---

## 5. Hired Adventurers

When the player doesn't want to assign a companion to a farming slot, they can hire a generic adventurer.

### Adventurer Types

| Type | Damage | Speed | Cost | Unlock |
|---|---|---|---|---|
| **Recruit** | 50% of player | Normal | 50g per run | Town Level 2 |
| **Veteran** | 75% of player | Fast | 100g per run | Town Level 3 |
| **Elite** | 90% of player | Very Fast | 200g per run | Town Level 4 |

### Adventurer Rules

- Adventurers are **generic** — no personality, no dialogue, no affection
- They consume gold per run (paid upfront when assigned)
- They produce **full loot minus 10-15%** (slightly worse than companion-assisted farming)
- They cannot be deployed in manual combat (town only)
- They don't build affection or trigger quests

### Why Hired Adventurers

| Reason | Justification |
|---|---|
| **Companion availability** | Companions may be locked out (§6) — adventurers fill the gap |
| **Gold sink** | Late-game gold needs a purpose — hiring adventurers costs gold |
| **Passive income** | Players who invest gold get materials back (ROI over time) |
| **No micromanagement** | Hire once, assign, forget |

---

## 6. Companion Lockouts

Companions may be unavailable for auto-clear due to various conditions.

### Lockout Reasons

| Reason | Duration | Source |
|---|---|---|
| **Affection cooldown** | 1 combat run | Companion just returned from a date/event |
| **Story unavailable** | Until quest flag clears | Quest requires companion elsewhere |
| **Resting** | 2-3 auto-clear cycles | Companion fatigued from repeated farming |
| **Deployed in manual run** | Until run ends | Companion is in active combat |

### Lockout Display

In the farming slot UI, locked companions show:
```
🐕 Dog — 🔒 Resting (1 cycle remaining)
```

### Why Lockouts Exist

- Prevents "set and forget" with the same companion forever
- Encourages hiring adventurers or rotating companions
- Creates narrative reasons (companion is tired, busy, away)
- Balances passive income with active engagement

---

## 7. Named Farming Plans

Players can save farming configurations for quick reassignment.

### Plan Structure

```json
{
  "id": "plan_grind_herbs",
  "name": "Herb Grinding",
  "stageId": "graveyard",
  "unitType": "companion",
  "unitId": "dog",
  "notes": "Farm herbs for Elara's garden quest"
}
```

### Plan Management

- **Save:** After assigning a slot, tap "Save as Plan" → name it
- **Load:** Tap a saved plan → auto-fills stage + unit assignment
- **Delete:** Long-press a plan → confirm deletion
- **Max plans:** 10 (expandable via Library upgrade)

### Why Named Plans

- Players often farm the same stages repeatedly
- Switching between "herb grinding" and "ore farming" should be one tap
- Reduces micromanagement of slot assignments
- Feels like a real farming system, not just a button

---

## 8. Loot & Rewards

### Base Loot (Companion-Assisted)

Full loot table from the stage, 100% drop rates:

| Drop Type | Amount | Notes |
|---|---|---|
| Gold | 100% of stage average | Same as manual clear |
| XP | 100% of stage average | Applied to persistent player level |
| Materials | 100% of stage drops | Estate materials, crafting components |
| Power-ups | 50% chance per slot | Reduced from manual (no skill input) |
| Rare drops | Soft-pity preserved | Pity counter carries over from manual play |

### Reduced Loot (Hired Adventurer)

| Drop Type | Amount | Notes |
|---|---|---|
| Gold | 85% of stage average | 15% reduction |
| XP | 90% of stage average | 10% reduction |
| Materials | 85% of stage drops | 15% reduction |
| Power-ups | 30% chance per slot | Significantly reduced |
| Rare drops | Soft-pity preserved | Same pity system |

### Speed Bonus

Faster stages cycle more often, so speed has compounding value:

| Stage Tier | Base Timer | Effective Farming Rate |
|---|---|---|
| Quick (3min) | ~3.6 min | ~16.7 farms/hour |
| Standard (5min) | ~6 min | ~10 farms/hour |
| Highlight (10min) | ~12 min | ~5 farms/hour |

**Design intent:** Quick stages are best for volume farming (many small drops). Highlight stages are best for rare drops (fewer runs but better per-run yield).

---

## 9. UI Design

### Farming Slot Manager

Accessed from the town screen via a "Farming" button or the Party management overlay.

```
┌─────────────────────────────────────────────────┐
│  🌾 Farming Slots                    ⚙ Settings │
├─────────────────────────────────────────────────┤
│                                                 │
│  Slot 1: 🐕 Dog → Graveyard ★★★               │
│  [Running: 2:34 remaining]  [Collect] [Cancel]  │
│                                                 │
│  Slot 2: ⚔️ Veteran → Forest ★★★              │
│  [Running: 4:12 remaining]  [Collect] [Cancel]  │
│                                                 │
│  Slot 3: 🔒 Unlock at Town Level 5             │
│                                                 │
├─────────────────────────────────────────────────┤
│  📋 Saved Plans                                 │
│  ├── Herb Grinding (Graveyard + Dog)            │
│  ├── Ore Farming (Quarry + Veteran)             │
│  └── + New Plan                                 │
└─────────────────────────────────────────────────┘
```

### Stage Select Integration

On the stage select screen, 3★ stages show an additional button:

```
┌─────────────────────────────────────────────────┐
│  💀 The Graveyard  ★★★                         │
│  Best: 3:45 | Clears: 12                       │
│                                                 │
│  [▶ Play]  [🌾 Auto-Clear]                     │
└─────────────────────────────────────────────────┘
```

Tapping "Auto-Clear" opens the Farming Slot Manager with the stage pre-selected.

---

## 10. Gaps & Open Questions

**Q1: Should auto-clear produce quest progress?**
- Option A: Yes — auto-clear counts toward kill quests, time survived, etc.
- Option B: No — only manual clears count toward quests
- **Recommendation:** Yes, but with a cap. Auto-clear contributes up to 50% of a quest's kill requirement. Prevents complete automation of story quests.

**Q2: Can auto-clear be interrupted?**
- Option A: Yes — cancel mid-run, partial loot
- Option B: No — must wait for completion
- **Recommendation:** Yes, cancel with partial loot (proportional to time elapsed). Gives player control.

**Q3: Should there be a "boost" option?**
- Spend 2× gold to complete auto-clear instantly
- **Recommendation:** Yes, as a late-game gold sink. Instant completion for 3× gold cost.

**Q4: Maximum concurrent auto-clears?**
- Currently 3 slots. Should there be a hard cap or just UI limitation?
- **Recommendation:** 3 is the cap. Adding more would reduce engagement with manual play.

---

*Auto-Clear & Farming System Spec v0.1.0 — August 26, 2026*
