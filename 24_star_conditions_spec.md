# Star Conditions Spec

> **Game Version:** v0.4.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D3 (stage tiers), D5 (companion-weapon binding)
> **Depends On:** `05_stages_spec.md` (§12 Star Conditions), `03_weapons_spec.md` (weapon profiles)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Star Tiers](#2-star-tiers)
3. [1★ Conditions](#3-1-conditions)
4. [2★ Conditions](#4-2-conditions)
5. [3★ Conditions](#5-3-conditions)
6. [Condition Categories](#6-condition-categories)
7. [Star Display UI](#7-star-display-ui)
8. [Auto-Clear Eligibility](#8-auto-clear-eligibility)
9. [Stage-Specific Conditions](#9-stage-specific-conditions)
10. [Gaps & Open Questions](#10-gaps--open-questions)

---

## 1. Overview

Stars rate the player's performance on each stage. They gate content (auto-clear, harder stages) and provide goals beyond basic completion.

### Design Principles

| Principle | Why |
|---|---|
| **Achievable** | 1★ should be easy, 2★ should be natural for good players, 3★ should require mastery |
| **Varied** | Different condition types encourage different playstyles |
| **Informative** | Stars tell the player what they did well, not just that they won |
| **Progressive** | Stars unlock features (auto-clear at 3★) |

---

## 2. Star Tiers

| Stars | Meaning | Unlocks | Difficulty |
|---|---|---|---|
| ★☆☆ (1★) | Completed | Basic stage rewards | Easy — just survive |
| ★★☆ (2★) | Performed well | Bonus rewards, stage intel | Medium — need some skill |
| ★★★ (3★) | Mastery | Auto-clear, frenzy mode, rare drops | Hard — requires specific challenges |

---

## 3. 1★ Conditions

1★ is awarded for **basic completion**. No special conditions — just finish the stage.

| Condition | Requirement |
|---|---|
| **Survive the full duration** | Timer reaches 0:00 (or boss killed for standard/highlight tiers) |
| **OR Defeat the boss** | Boss HP reaches 0 before timer ends |

That's it. If the player finishes the stage by any means, they get 1★.

---

## 4. 2★ Conditions

2★ requires meeting **at least 2 out of 4** condition types. Each type has a threshold the player must reach.

### 2★ Condition Pool

| # | Condition | Threshold (Standard 5min) | Threshold (Quick 3min) | Threshold (Highlight 10min) | Category |
|---|---|---|---|---|---|
| 1 | **Kill Count** | 200+ kills | 120+ kills | 400+ kills | Combat |
| 2 | **Clear Time** | Under 4:30 | Under 2:45 | Under 9:00 | Speed |
| 3 | **Level Reached** | Level 12+ | Level 8+ | Level 18+ | Progression |
| 4 | **Gold Collected** | 500+ gold | 300+ gold | 800+ gold | Economy |

### Why These 4 Conditions

| Condition | What It Tests |
|---|---|
| Kill Count | Can the player handle enemy density? |
| Clear Time | Can the player kill the boss efficiently? |
| Level Reached | Did the player collect enough XP (good positioning)? |
| Gold Collected | Did the player collect pickups (good movement)? |

### 2★ Evaluation

```javascript
function check2Star(stageResult, stageTier) {
  const conditions = get2StarConditions(stageTier);
  let met = 0;
  
  if (stageResult.kills >= conditions.killCount) met++;
  if (stageResult.clearTime <= conditions.clearTime) met++;
  if (stageResult.level >= conditions.levelReached) met++;
  if (stageResult.gold >= conditions.goldCollected) met++;
  
  return met >= 2; // Need at least 2 out of 4
}
```

---

## 5. 3★ Conditions

3★ requires meeting **at least 2 out of 6+** mastery conditions. These are significantly harder and often require specific builds or playstyles.

### 3★ Condition Pool

| # | Condition | Description | Category | Simulatable? |
|---|---|---|---|---|
| 1 | **No-Hit Run** | Take 0 damage the entire stage | Mastery | ❌ No (requires manual play) |
| 2 | **Starter Weapon Only** | Only W1 active, no W2/W3 unlocked | Challenge | ✅ Yes |
| 3 | **Underleveled** | Finish at Level 8 or below | Challenge | ✅ Yes |
| 4 | **Solo Run** | All 3 companion slots empty | Solo | ✅ Yes |
| 5 | **All Weapons Maxed** | W1/W2/W3 all at Level 7 | Build | ✅ Yes |
| 6 | **Speed Kill** | Boss killed in under 15 seconds | Speed | ✅ Yes |
| 7 | **Itemless** | No power-up pickups collected | Challenge | ✅ Yes |
| 8 | **Pacifist Segment** | Survive first 2 minutes with 0 kills | Stealth | ❌ No |

### Why These Conditions

| Condition | What It Tests |
|---|---|
| No-Hit Run | Perfect positioning and awareness |
| Starter Weapon Only | Can the player win with minimal tools? |
| Underleveled | Did the player skip XP (intentional challenge)? |
| Solo Run | Pure skill, no companion help |
| All Weapons Maxed | Did the player optimize their build? |
| Speed Kill | High DPS output in short window |
| Itemless | Can the player win without power-ups? |
| Pacifist Segment | Stealth and evasion skills |

### 3★ Evaluation

```javascript
function check3Star(stageResult, stageTier) {
  const conditions = get3StarConditions(stageTier);
  let met = 0;
  
  if (stageResult.damageTaken === 0) met++;           // No-hit
  if (stageResult.weaponsUnlocked === 1) met++;       // Starter only
  if (stageResult.level <= 8) met++;                   // Underleveled
  if (stageResult.companionsActive === 0) met++;      // Solo
  if (stageResult.allWeaponsMaxed) met++;              // All maxed
  if (stageResult.bossKillTime <= 15) met++;           // Speed kill
  if (stageResult.powerUpsCollected === 0) met++;     // Itemless
  if (stageResult.zeroKillsFirst2Min) met++;           // Pacifist
  
  return met >= 2; // Need at least 2 out of 8
}
```

---

## 6. Condition Categories

### Why Categories Matter

Categories help with:
- **UI filtering** — show "Mastery" conditions together
- **Quest generation** — "Earn 2★ using only Mastery conditions"
- **Achievement tracking** — "Complete all Speed-type 3★ conditions"
- **Build diversity** — different categories reward different playstyles

### Category Summary

| Category | 2★ | 3★ | Playstyle |
|---|---|---|---|
| **Combat** | Kill Count | — | Aggressive, high DPS |
| **Speed** | Clear Time | Speed Kill | Fast, efficient |
| **Progression** | Level Reached | — | Thorough, collect XP |
| **Economy** | Gold Collected | — | Mobile, collect pickups |
| **Mastery** | — | No-Hit Run | Perfect play |
| **Challenge** | — | Starter Only, Underleveled, Itemless | Self-imposed restrictions |
| **Solo** | — | Solo Run | No companions |
| **Build** | — | All Weapons Maxed | Optimize loadout |
| **Stealth** | — | Pacifist Segment | Evasion, avoidance |

---

## 7. Star Display UI

### Stage Select Screen

```
┌─────────────────────────────────────────────────┐
│  💀 The Graveyard                               │
│  ★★★  Best: 3:45  Clears: 12                   │
│                                                 │
│  Conditions met:                                │
│  ✅ Kill 200+ (247)  ✅ Clear under 4:30 (3:45)│
│  ❌ Level 12+ (10)   ✅ Gold 500+ (623)        │
│                                                 │
│  [▶ Play]  [🌾 Auto-Clear]                     │
└─────────────────────────────────────────────────┘
```

### Post-Run Results Screen

After completing a stage, the results screen shows which conditions were met:

```
┌─────────────────────────────────────────────────┐
│  ★★★ MASTERY ACHIEVED!                         │
├─────────────────────────────────────────────────┤
│  Time: 3:45         ✅ Under 4:30              │
│  Kills: 247         ✅ 200+ kills              │
│  Level: 10          ❌ Level 12+               │
│  Gold: 623          ✅ 500+ gold               │
│  Damage: 0          ✅ No-hit run              │
│  Companions: 0      ✅ Solo run                │
│                                                 │
│  2★: ✅ (3/4 conditions)                       │
│  3★: ✅ (2/8 conditions)                       │
└─────────────────────────────────────────────────┘
```

### Star Animation

- Stars fill in one at a time (0.5s delay between each)
- 3★ triggers a brief golden flash effect
- Newly earned stars pulse for 1 second

---

## 8. Auto-Clear Eligibility

Only 3★ stages become auto-clear eligible (see `23_auto_clear_farming_spec.md`).

### Why 3★ Required

| Stars | Auto-Clear? | Rationale |
|---|---|---|
| 1★ | ❌ No | Basic completion doesn't prove mastery |
| 2★ | ❌ No | Good performance, but not consistent enough |
| 3★ | ✅ Yes | Mastery proven — simulation should produce similar results |

---

## 9. Stage-Specific Conditions

Some stages have unique 3★ conditions tied to their theme.

### Graveyard Specific

| Condition | Description |
|---|---|
| **Gravekeeper's Bane** | Kill the boss without it spawning any minions |
| **Ghost Whisperer** | Kill 50 ghosts without taking ghost damage |

### Future Stages

Each new stage can add 1-2 unique 3★ conditions. These are defined in the stage's data file and loaded by the star condition system.

---

## 10. Gaps & Open Questions

**Q1: Should 2★ conditions vary by stage tier?**
- Currently: Yes (different thresholds for 3min/5min/10min)
- Concern: More data to balance
- **Recommendation:** Keep tier-specific thresholds. They're simple multipliers.

**Q2: Can conditions stack across runs?**
- E.g., "Kill 200 total zombies across 3 runs" for 2★
- **Recommendation:** No. Each star evaluation is per-run. Keeps it simple.

**Q3: Should 3★ conditions rotate or be fixed?**
- Fixed: Same conditions every time (consistent goals)
- Rotating: Different conditions each week (variety)
- **Recommendation:** Fixed for now. Rotating conditions add complexity.

**Q4: What happens if a condition is impossible on a stage?**
- E.g., "No-Hit Run" on a stage with unavoidable damage
- **Recommendation:** Mark impossible conditions with "N/A" and don't count them toward the 2-of-6 requirement.

---

*Star Conditions Spec v0.1.0 — August 26, 2026*
