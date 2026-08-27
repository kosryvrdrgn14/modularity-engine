# Endgame Sandbox Mode Spec

> **Game Version:** v0.6.0+
> **Date:** August 26, 2026
> **Status:** Spec
> **Design Decisions:** D1 (3 slots), D3 (stage tiers), D5 (1:1 binding)
> **Depends On:** All combat specs, companion specs, weapon specs

---

## Table of Contents

1. [Overview](#1-overview)
2. [Unlock Criteria](#2-unlock-criteria)
3. [Sandbox Features](#3-sandbox-features)
4. [Difficulty Scaling](#4-difficulty-scaling)
5. [Asset Reuse](#5-asset-reuse)
6. [Build Testing Tools](#6-build-testing-tools)
7. [Leaderboards & Records](#7-leaderboards--records)
8. [Gaps & Open Questions](#8-gaps--open-questions)

---

## 1. Overview

The sandbox is an endgame mode where players freely test weapon combinations, companion setups, and builds using existing assets. It's the "training room" for theorycrafters.

### Why Sandbox Exists

| Purpose | How It Works |
|---|---|
| **Build testing** | Try any weapon/companion combo without committing resources |
| **Theorycrafting** | Test damage numbers, synergies, and edge cases |
| **Fun** | Pure gameplay without progression pressure |
| **Content reuse** | Existing stages, enemies, and backgrounds — no new art needed |
| **Endgame activity** | Gives maxed players something to do between content updates |

### Core Concept

```
Player unlocks sandbox → Select any stage → Customize difficulty → Test builds → See damage numbers
```

---

## 2. Unlock Criteria

| Requirement | Details |
|---|---|
| **Complete all story stages** | All 3 main stages at 1★+ |
| **Reach Town Level 5** | Full city unlocked |
| **Complete at least one 3★ run** | Proves mastery |

### Why These Requirements

- Ensures the player has seen all content before sandboxing
- Prevents new players from skipping to sandbox (they'd miss the progression)
- Town Level 5 means all companions and weapons are available

---

## 3. Sandbox Features

### Stage Selection

Player can select ANY stage they've unlocked, including:
- All story stages (Graveyard, Forest, Cursed Library, etc.)
- All difficulty variants (Normal, Hard, Nightmare — future)
- Custom difficulty modifiers (see §4)

### Build Customization

Before entering sandbox, the player can set:

| Setting | Options | Default |
|---|---|---|
| **Weapon Levels** | 1-7 (per weapon) | Current levels |
| **Companion Selection** | Any unlocked companion | Current deployment |
| **Companion Levels** | 1-7 (mirrors weapon level) | Current levels |
| **Player Stats** | Base stats + skill tree bonuses | Current stats |
| **Starting Gold** | 0-9999 | 0 |
| **Starting Level** | 1-20 | 1 |

### During Sandbox

| Feature | Description |
|---|---|
| **Damage numbers** | Always visible (toggle on/off) |
| **DPS counter** | Real-time DPS display |
| **Enemy HP bars** | Always visible |
| **Cooldown timers** | Visible on all weapons |
| **Kill counter** | Tracks total kills |
| **Time survived** | Tracks survival time |

### Why These Features

- **Damage numbers** — essential for theorycrafting
- **DPS counter** — instantly shows build effectiveness
- **Enemy HP bars** — shows how fast enemies die
- **Cooldown timers** — helps optimize weapon timing
- **Kill/time counters** — benchmarks for comparing builds

---

## 4. Difficulty Scaling

Sandbox allows custom difficulty modifiers to test builds under different conditions.

### Difficulty Presets

| Preset | Enemy HP | Enemy Damage | Spawn Rate | Purpose |
|---|---|---|---|---|
| **Easy** | 0.5× | 0.5× | 0.8× | Test basic combos |
| **Normal** | 1.0× | 1.0× | 1.0× | Standard experience |
| **Hard** | 1.5× | 1.5× | 1.3× | Stress test builds |
| **Nightmare** | 2.0× | 2.0× | 1.5× | Extreme optimization |
| **Custom** | 0.5-3.0× | 0.5-3.0× | 0.5-2.0× | Full control |

### Custom Difficulty Sliders

```
Enemy HP:       [0.5× ──────── 1.0× ──────── 2.0× ──────── 3.0×]
Enemy Damage:   [0.5× ──────── 1.0× ──────── 2.0× ──────── 3.0×]
Spawn Rate:     [0.5× ──────── 1.0× ──────── 1.5× ──────── 2.0×]
Boss HP:        [0.5× ──────── 1.0× ──────── 2.0× ──────── 5.0×]
Gold Drops:     [0× ─────────── 1.0× ──────── 2.0× ──────── 5.0×]
```

### Why Custom Difficulty

- Test builds against "what if enemies had 3× HP?"
- Find breakpoints (e.g., "at what damage does one-shot kill a skeleton?")
- Stress test performance with maximum spawn rates
- Fun: "How long can I survive at 5× boss HP?"

---

## 5. Asset Reuse

Sandbox reuses ALL existing assets — no new art, enemies, or stages needed.

### Reused Assets

| Asset Type | Source | Usage |
|---|---|---|
| Stages | Graveyard, Forest, Library | Backgrounds, obstacles, wave timelines |
| Enemies | Zombie, Bat, Skeleton, Ghost, Caster | All enemy types, same behaviors |
| Bosses | Gravekeeper, future bosses | Same phases, same telegraphs |
| Weapons | W1, W2, W3 | Same fire patterns, same visuals |
| Companions | Dog, wives, children | Same AI, same attacks |
| Pickups | XP, gold, power-ups | Same drop tables |
| UI | HUD, menus, overlays | Same layout, same interactions |

### What's Different in Sandbox

| Element | Normal | Sandbox |
|---|---|---|
| Progression | Earn gold/XP/unlocks | None (testing only) |
| Difficulty | Fixed per stage | Customizable |
| Build | Limited by unlocks | All weapons/companions available |
| Stats | Permanent upgrades | Configurable per session |
| Goal | Survive/win | Test/learn/have fun |

### Why Reuse Works

- Zero new art budget required
- Players already know the assets — focus is on build testing
- Existing balance data is the baseline for custom difficulty
- New stages/ enemies added to sandbox automatically

---

## 6. Build Testing Tools

### Damage Breakdown

After each sandbox run, show a damage breakdown:

```
┌─────────────────────────────────────────────────┐
│  📊 DAMAGE REPORT                               │
├─────────────────────────────────────────────────┤
│  Total Damage: 45,230                           │
│  DPS: 150.8                                     │
│  Time: 5:00                                     │
│                                                 │
│  By Source:                                     │
│  ├── W1 Projectile: 18,400 (40.7%)             │
│  ├── W2 Orbit: 12,300 (27.2%)                  │
│  ├── W3 Area: 8,500 (18.8%)                    │
│  ├── Dog Growl: 3,200 (7.1%)                   │
│  └── Wife Passive: 2,830 (6.3%)                │
│                                                 │
│  By Enemy Type:                                │
│  ├── Zombies: 12,000 (26.5%)                   │
│  ├── Bats: 8,500 (18.8%)                       │
│  ├── Skeletons: 10,200 (22.6%)                 │
│  ├── Ghosts: 6,300 (14.0%)                     │
│  ├── Casters: 4,200 (9.3%)                     │
│  └── Boss: 4,030 (8.9%)                        │
└─────────────────────────────────────────────────┘
```

### Build Comparison

Save sandbox builds and compare:

| Build | W1 | W2 | W3 | Companion | DPS | Kills |
|---|---|---|---|---|---|---|
| **Build A** | L7 | L5 | L3 | Dog | 150.8 | 512 |
| **Build B** | L4 | L7 | L5 | Freya | 142.3 | 487 |
| **Build C** | L7 | L7 | L7 | 3 wives | 201.5 | 634 |

### Why Build Comparison

- Helps players optimize their builds
- Creates community discussion ("which build is best?")
- Gives theorycrafters concrete data
- Encourages experimentation

---

## 7. Leaderboards & Records

### Personal Records

Track the player's best sandbox performances:

| Record | Metric | Stage |
|---|---|---|
| Highest DPS | Damage per second | Any stage |
| Most Kills | Total enemies killed | Any stage |
| Longest Survive | Time survived | Any stage |
| Boss Speed Kill | Fastest boss kill | Boss stages |

### Why Personal Records

- Gives players goals in sandbox
- Encourages optimization
- No competitive pressure (personal only)
- Fun to see improvement over time

---

## 8. Gaps & Open Questions

**Q1: Should sandbox have its own currency?**
- Option A: No — sandbox is free, no rewards
- Option B: Yes — "test tokens" earned in sandbox for cosmetic rewards
- **Recommendation:** No currency in v1. Pure testing mode.

**Q2: Can sandbox runs count for quests?**
- **Recommendation:** No. Sandbox is testing only. Quests require real runs.

**Q3: Should sandbox save build configurations?**
- **Recommendation:** Yes, up to 5 saved builds. Quick swap between configurations.

**Q4: Can other players see my sandbox builds?**
- Option A: No — private
- Option B: Yes — share builds with friends
- **Recommendation:** Private in v1. Share feature in future update.

---

*Endgame Sandbox Mode Spec v0.1.0 — August 26, 2026*
