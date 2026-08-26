# Frenzy Mode Spec

> **Game Version:** v0.4.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D3 (stage tiers)
> **Depends On:** `05_stages_spec.md` (§14 Frenzy Mode), `24_star_conditions_spec.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Unlock Criteria](#2-unlock-criteria)
3. [Gameplay Changes](#3-gameplay-changes)
4. [Trigger Methods](#4-trigger-methods)
5. [Loot & Rewards](#5-loot--rewards)
6. [Clean Run Compatibility](#6-clean-run-compatibility)
7. [UI & Display](#7-ui--display)
8. [Gaps & Open Questions](#8-gaps--open-questions)

---

## 1. Overview

Frenzy mode is an alternate playstyle unlocked after mastering a stage. It throws the rules out the window — maximum enemies, maximum chaos, maximum drops. It's the "victory lap" for players who have already proven their skill.

### Why Frenzy Mode Exists

| Purpose | How It Works |
|---|---|
| **Rewards mastery** | 3★ players get a more intense experience |
| **Variety** | Different gameplay feel from normal stages |
| **Farming** | Better drop rates for rare items |
| **Fun** | Pure chaos is enjoyable after mastering the basics |
| **End-game content** | Gives maxed players something to do |

### Core Concept

```
Normal Stage: Gradual escalation, strategic pacing, boss at end
Frenzy Stage: MAXIMUM FROM START, constant chaos, better drops
```

---

## 2. Unlock Criteria

### Primary Unlock

Achieve **3★** on the stage. That's it.

### Why 3★ Required

| Stars | Access | Rationale |
|---|---|---|
| 1★ | Normal only | Basic completion doesn't prove mastery |
| 2★ | Normal only | Good performance, but not consistent enough |
| 3★ | Normal + Frenzy | Mastery proven — player can handle the chaos |

---

## 3. Gameplay Changes

### Spawn Rate

| Mode | Spawn Rate | Max Enemies |
|---|---|---|
| Normal | Base (0.8 → 3.0/sec) | 200 |
| Frenzy | 3.0/sec from start | 250 (higher cap) |

### Enemy Stats

| Stat | Normal | Frenzy | Rationale |
|---|---|---|---|
| HP | 1.0× | 0.7× | Faster kills = more chaos |
| Damage | 1.0× | 1.0× | Same danger level |
| Speed | 1.0× | 1.1× | Slightly faster = more pressure |

### Wave Timeline

| Mode | Timeline |
|---|---|
| Normal | Gradual: zombies → bats → skeletons → ghosts → casters → boss |
| Frenzy | All enemy types from 0:00. Boss at 50% time (2:30 in 5min stage) |

### Weapon Behavior

No changes to weapons — the player's build is the same. The difference is enemy density and pacing.

---

## 4. Trigger Methods

### Method 1: Stage Select

On the stage select screen, 3★ stages show a toggle:

```
┌─────────────────────────────────────────────────┐
│  💀 The Graveyard  ★★★                         │
│                                                 │
│  Mode: [Normal] [Frenzy 🔥]                    │
│                                                 │
│  [▶ Play]  [🌾 Auto-Clear]                     │
└─────────────────────────────────────────────────┘
```

### Method 2: Alternate Trigger (In-Game)

During a normal run, if the player kills 100 enemies in the first 2 minutes, a prompt appears:

```
┌─────────────────────────────────────────────────┐
│  🔥 FRENZY AVAILABLE                           │
│                                                 │
│  Kill 100 enemies in 2 minutes?               │
│  Activate Frenzy Mode for the rest of this run?│
│                                                 │
│  [Yes]  [No]                                    │
└─────────────────────────────────────────────────┘
```

If accepted, the remaining run switches to frenzy mode (increased spawns, all enemy types).

### Why Two Methods

- **Stage Select:** Planned — player chooses frenzy before starting
- **In-Game:** Spontaneous — rewards aggressive play with immediate chaos

---

## 5. Loot & Rewards

### Drop Rate Bonuses

| Drop Type | Normal | Frenzy |
|---|---|---|
| Gold | 1.0× | 1.2× |
| XP | 1.0× | 1.0× |
| Materials | 1.0× | 1.3× |
| Rare drops | Base rates | 1.5× rates |
| Soft-pity | Preserved | Preserved (carries over) |

### Frenzy Completion Bonus

| Condition | Bonus |
|---|---|
| Complete frenzy stage | +50% gold bonus |
| 3★ in frenzy | +1 guaranteed rare drop |
| No-hit in frenzy | +100% gold bonus (stacks with above) |

### Why Better Drops

- Frenzy is harder (more enemies, faster pace)
- Better drops reward the increased difficulty
- Rare drop bonus makes frenzy the best farming method
- Still requires mastery (3★ unlock) — not accessible to everyone

---

## 6. Clean Run Compatibility

### What Is a Clean Run?

A "clean run" is a run where the player uses no external help (no auto-clear, no hired adventurers). Clean runs track separately for leaderboards and achievements.

### Frenzy + Clean Run

| Scenario | Clean Run? | Notes |
|---|---|---|
| Frenzy selected at stage start | ✅ Yes | Player chose frenzy before starting |
| Frenzy activated in-game | ✅ Yes | Player earned frenzy through performance |
| Auto-clear in frenzy | ❌ No | Auto-clear is never a clean run |

### Star Evaluation in Frenzy

Stars are still evaluated in frenzy mode. The same 2★ and 3★ conditions apply, but the thresholds are adjusted:

| Condition | Normal Threshold | Frenzy Threshold |
|---|---|---|
| Kill Count | 200+ | 300+ (more enemies available) |
| Clear Time | Under 4:30 | Under 3:00 (faster pace) |
| No-Hit | 0 damage | 0 damage (same) |
| Solo | No companions | No companions (same) |

---

## 7. UI & Display

### Frenzy Indicator

During frenzy mode, the UI shows a persistent indicator:

```
┌─────────────────────────────────────────────────┐
│  🔥 FRENZY MODE    ⏱ 2:30    ❤️ 85/100        │
├─────────────────────────────────────────────────┤
│                                                 │
│         [Gameplay area]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Flame icon** pulses red/orange
- **Timer** shows remaining time
- **Screen border** has a subtle red tint (80% opacity)

### Frenzy Activation Animation

When frenzy activates (in-game trigger):

1. Screen flashes red (0.2s)
2. Text "🔥 FRENZY ACTIVATED" appears center screen
3. Spawn rate immediately increases
4. All enemy types unlock simultaneously
5. Music tempo increases (if applicable)

### Post-Run Results

Frenzy runs show a special results screen:

```
┌─────────────────────────────────────────────────┐
│  🔥 FRENZY COMPLETE!                           │
├─────────────────────────────────────────────────┤
│  Time: 3:15         Kills: 487                 │
│  Level: 14          Gold: 892 (+50% bonus)     │
│  Rare Drops: 2      Materials: 45              │
│                                                 │
│  ★★★ MASTERY ACHIEVED (Frenzy)                │
│  Conditions: Kill 300+ ✅, No-hit ✅           │
└─────────────────────────────────────────────────┘
```

---

## 8. Gaps & Open Questions

**Q1: Should frenzy mode have its own leaderboard?**
- Separate leaderboard for fastest frenzy clear
- **Recommendation:** Yes, as a future feature. Not critical for v1.

**Q2: Can frenzy mode be used for quest completion?**
- Does killing enemies in frenzy count toward kill quests?
- **Recommendation:** Yes. Kills are kills regardless of mode.

**Q3: Should frenzy mode affect companion behavior?**
- Companions could go "berserk" in frenzy (faster attacks, more damage)
- **Recommendation:** No changes in v1. Keep it simple — more enemies, better drops.

**Q4: What about frenzy in 3min stages?**
- 3min stages are short — frenzy would be extremely intense
- **Recommendation:** Frenzy available on all stage tiers. 3min frenzy = pure chaos.

**Q5: Can frenzy mode be activated in auto-clear?**
- Auto-clear runs in normal mode only
- **Recommendation:** No frenzy in auto-clear. Auto-clear is for farming, not challenge.

---

*Frenzy Mode Spec v0.1.0 — August 26, 2026*
