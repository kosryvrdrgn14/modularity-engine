# Modularity Engine — Design Plan

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Planning

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Principles](#architecture-principles)
3. [Version 1 Scope](#version-1-scope)
4. [Required Markdown Spec Files](#required-markdown-spec-files)
5. [JSON Content Files](#json-content-files)
6. [Spec File Creation Prompts](#spec-file-creation-prompts)
7. [Spec Validation Test Prompts](#spec-validation-test-prompts)
8. [Engine Core Systems](#engine-core-systems)
9. [Feature Checklist](#feature-checklist)
10. [Missing Details & Recommended Actions](#missing-details--recommended-actions)

---

## Project Overview

Modularity Engine is a top-down, auto-attacking survival game inspired by Vampire Survivors. You control a character who moves through a stage while weapons fire automatically. Waves of enemies close in; you collect EXP and gold from defeated foes, level up to choose weapon upgrades, and survive as long as possible. The game ends when your health hits zero — and with hundreds of enemies on screen, it should feel **fun and chaotic** every time you play.

This is a personal project built for one person. Every design decision optimizes for your enjoyment and the ability to iterate quickly.

**Core Loop:**
```
Move → Auto-attack → Kill enemies → Collect pickups → Level up → Choose upgrades → Repeat → Survive
```

---

## Architecture Principles

### 1. Engine / Content Separation
- **Engine** = TypeScript source code handling the game loop, rendering, physics, collision, entity management, and systems (not spec'd in markdown — built directly).
- **Content** = JSON data files defining *what* exists in the game (enemies, weapons, stages, characters, pickups). The engine reads JSON at runtime.

### 2. Modularity
The name says it all. Every game entity is defined by data, not hardcoded logic.
- Adding a new weapon, enemy, stage, or character means adding a JSON file and ensuring the engine has a compatible behavior type.
- Systems (spawning, leveling, damage) are generic and driven by data.
- The entire project is designed to be modified and reassembled multiple times without touching engine code.

### 3. Spec-Driven Development
- Each markdown spec file is a **self-contained reference** for one domain.
- Specs are written so that you can re-establish context at any time by reading the relevant file.
- Specs include data schemas, gameplay formulas, and explicit values — no ambiguity.

---

## Version 1 Scope

> **Note:** V1 is compressed to a **5-minute prototype** (not the original 10-minute design). All progression, wave timing, and balance targets are defined in `vs_prog.md`. This file provides the architecture and spec structure; `vs_prog.md` provides the numbers.

**Goal:** A playable prototype proving the core loop works. One stage, one character, three weapons, five enemy types, one boss — enough to feel the chaos.

| Feature | Detail |
|---|---|
| Duration | **5 minutes** (boss spawns at minute 4) |
| Stage | 1 stage (infinite scrolling arena with timed waves + obstacles) |
| Input | **Click/tap-to-move** (primary) + WASD/arrow keys (secondary) |
| Character | 1 playable character with base stats |
| Weapons | 3 weapons with auto-attack, upgradeable to max level 7 |
| Enemies | 5 standard enemy types + 1 boss |
| Pickups | EXP gems (small/large), gold coins |
| Leveling | XP bar, level-up screen, choose 1 of 3 random upgrades |
| Power-up Drops | Specific monsters drop power-ups on kill |
| Screen Wipe | Power-up — kills all enemies on screen (low drop chance) |
| Magnet | Power-up — attracts all nearby EXP and gold (moderate drop chance) |
| Weapon Level-Up Drop | Power-up — randomly levels up 1–3 weapons by 1 level |
| Weapon Power Spikes | Level 4 (mid) and Level 7 (max) unlock significant bonus effects |
| Sounds | Procedural Web Audio API synthesis (casino-style pickup arpeggios) |
| Visuals | Basic geometric shapes (squares, diamonds, circles, triangles) |
| Obstacles | Tombstones, grave mounds, broken walls, cracked floor |
| UI / HUD | Health bar, EXP bar, level number, gold counter, weapon icons with levels, timer |
| Polish | Clean modern UI theme, smooth animations, readable at a glance |

---

## Required Specification Files

> **Source of Truth:** `vs_prog.md` owns all progression, balance, and gameplay numbers. `vs_colors.md` owns all visual specs (shapes, colors, obstacles). This file owns architecture and spec structure.

Each file below must be created **one at a time** using the prompts in [Spec File Creation Prompts](#spec-file-creation-prompts).

| # | File Name | Purpose | Canonical Source |
|---|---|---|---|
| 1 | `01_engine_architecture.md` | Game loop structure, entity-component approach, rendering pipeline, collision system, data loading flow, scene/state management | This file |
| 2 | `02_character_spec.md` | Playable character stats, movement, hitbox, invincibility frames, death condition | This file + `vs_prog.md` |
| 3 | `03_weapons_spec.md` | 3 weapons: name, description, base stats, behavior, upgrade table (levels 1–7), power spike bonuses at L4 and L7, targeting logic | `vs_prog.md` Weapon Progression |
| 4 | `04_enemies_spec.md` | 5 enemy types + 1 boss: name, HP, speed, damage, size, behavior pattern, spawn weight, drop table | `vs_prog.md` Enemy Spawn Details |
| 5 | `05_stages_spec.md` | Stage definition: name, size, background, spawn zones, wave timeline, difficulty scaling formula | `vs_prog.md` Wave Timeline |
| 6 | `06_pickups_and_powerups_spec.md` | EXP gem tiers, gold coin values, screen wipe mechanic, magnet mechanic, weapon level-up drop logic, drop rate tables | `vs_prog.md` Drop Economy |
| 7 | `07_leveling_system_spec.md` | XP curve formula, level-up screen behavior, upgrade pool rules, UI flow | `vs_prog.md` Experience Curve |
| 8 | `08_ui_hud_spec.md` | HUD layout (positions, sizes), health bar design, EXP bar, gold display, weapon panel, level-up selection screen, game-over screen, pause menu | This file + `vs_colors.md` |
| 9 | `09_audio_spec.md` | Sound categories, required sound list per event, volume levels, priority/fallback rules | `vs_prog.md` Sound Design Arc |
| 10 | `10_json_schemas.md` | JSON schema for every content file: characters, weapons, enemies, stages, pickups. Field names, types, defaults, examples | All specs combined |
| — | `vs_colors.md` | Visual specification: shapes, colors, sizes, obstacles, background | **Already exists** |
| — | `vs_prog.md` | Stage 1 progression, balance, sound design | **Already exists** |

---

## JSON Content Files

These are the data files the engine loads. Schemas defined in `10_json_schemas.md`.

| File | Contains | Example Count (V1) |
|---|---|---|
| `content/characters.json` | Character definitions | 1 |
| `content/weapons.json` | Weapon definitions + upgrade tables | 3 |
| `content/enemies.json` | Enemy + boss definitions + drop tables | 6 |
| `content/stages.json` | Stage layout + wave timeline | 1 |
| `content/pickups.json` | Pickup types, values, power-up definitions | 5 |
| `content/leveling.json` | XP curve, upgrade pool config | 1 |

---

## Spec File Creation Prompts

> **Instructions:** Create each file one at a time in the order listed. Use the corresponding prompt below. After creating each file, review it against the [Feature Checklist](#feature-checklist) before moving to the next.
>
> **Important:** For specs 03–07 and 09, use the values from `vs_prog.md` as the source of truth. The prompts below define the structure; `vs_prog.md` provides the numbers.

---

### Prompt 1 — Create `01_engine_architecture.md`

```
Create the file 01_engine_architecture.md for Modularity Engine.

This spec defines the core engine architecture. It must cover:

1. GAME LOOP — Fixed-timestep update loop (target 60 FPS). Separate update() and render() phases. Define the order of systems each frame: input → movement → auto-attack → collision → entity cleanup → spawn → pickup collection → UI update → render.

2. ENTITY SYSTEM — Describe how entities (player, enemies, weapons, projectiles, pickups) are represented. Each entity has: id, type, position (x,y), velocity, hitbox, stats object, and a behavior reference. Entities are stored in typed arrays or a simple pool for performance.

3. COLLISION SYSTEM — Axis-aligned bounding box (AABB) checks. Collision layers: player-damageable (enemies hit player), enemy-damageable (projectiles hit enemies), pickup-collectable (player touches pickups). Define collision response: damage application, knockback, pickup collection, power-up trigger.

4. RENDERING — Canvas-based 2D rendering. Camera follows player with smooth lerp. Draw order: background → entities (sorted by y for depth) → projectiles → pickups → UI overlay. Define how sprites/animations are referenced (sprite sheet + frame data).

5. DATA LOADING — On stage start, engine loads the relevant JSON content files (character, weapons, enemies for stage, pickups). Validate data on load. Hot-reload support for development.

6. SCENE / STATE MANAGEMENT — Scenes: Menu → Character Select (V1: skip, auto-select) → Stage → Pause → Level-Up Overlay → End Screen. The game has THREE end states:
   - **VICTORY** — Boss killed before 5:00. Title: "VICTORY". Bonus: +100 gold, confetti effect. Bonus text: "The Gravekeeper has been vanquished!"
   - **SURVIVED** — Timer reaches 5:00 with boss alive. Title: "SURVIVED". No bonus.
   - **DEFEAT** — Player HP reaches 0. Title: "DEFEATED". Red tint overlay.
   All three show end screen stats (see 08_ui_hud_spec.md). Game freezes for 1.0s, then end screen fades in over 0.5s.

7. DAMAGE SYSTEM — Damage = attacker.damage - defender.defense (minimum 1). Critical hit chance as a stat. Knockback force based on damage dealt. Invincibility frames after taking damage (0.5s default).

8. CAMERA EFFECTS — Screen shake on: boss spawn (0.5s, medium intensity), screen wipe activation (0.3s, light), boss death (1.0s, heavy), player low HP warning (<25% HP, subtle continuous shake). Duration and intensity should be parameterized per event.

9. RENDERING — HiDPI support: use `devicePixelRatio` for crisp rendering on retina displays. Canvas resolution scales with device pixel ratio, logical coordinates remain the same.

10. PROJECTILE LIFETIME — Projectiles despawn after 3 seconds OR 600px traveled, whichever comes first. Orbit weapons persist for their duration stat. Area weapons are instant (no projectile entity).

11. OBSTACLE COLLISION RULES — Player and enemies collide with obstacles (slide along surfaces). Projectiles, pickups, and power-ups pass through obstacles. Click/tap-to-move pathfinding: simple steering toward target, slide along obstacle if blocked. No A* needed for V1.

12. PERFORMANCE NOTES — Object pooling for projectiles and enemies. Spatial hashing for collision broadphase if entity count exceeds 200. Max 200 enemies + 500 projectiles + 500 pickups on screen.

Include ASCII diagrams where helpful. Reference other spec files where details live (e.g., "see 03_weapons_spec.md for weapon stats", "see vs_colors.md for visual specs").
```

---

### Prompt 2 — Create `02_character_spec.md`

```
Create the file 02_character_spec.md for Modularity Engine.

This spec defines the single playable character for V1.

Must include:

1. CHARACTER IDENTITY — Name, description, lore flavor text (1-2 sentences).

2. BASE STATS TABLE:
   - Max Health: 100
   - Movement Speed: 200 px/s
   - Armor: 0 (damage reduction flat)
   - Pickup Range: 50 px (radius for auto-collecting pickups)
   - Magnet Range: 0 (base, increased by magnet power-up)
   - Crit Chance: 0%
   - Crit Multiplier: 1.5x
   - Level: starts at 1
   - Starting Weapon: (reference one of the 3 weapons from 03_weapons_spec.md)

3. MOVEMENT — Dual input system:
   - **Primary: Click/Tap-to-Move** — Player clicks or taps a location on the canvas. Character pathfinds toward that point, stopping when within a small threshold (e.g., 4px). Movement stops if a new click/tap is registered. Visual indicator shows the target destination.
   - **Secondary: WASD/Arrow Keys** — Traditional 8-directional movement. Diagonal normalization so diagonal speed = cardinal speed.
   - Both systems can coexist. WASD overrides click-to-move if pressed during pathfinding.
   - Touch devices use tap-to-move exclusively (no virtual joystick).

4. HITBOX — Circular, radius 12px. Visual sprite is larger for readability.

5. INVINCIBILITY FRAMES — After taking damage, invulnerable for 0.5 seconds. Visual: sprite flashes/blinks at 100ms intervals.

6. DEATH CONDITION — When health ≤ 0. Trigger DEFEAT end screen (see 01_engine_architecture.md Scene/State Management for all three end states).

7. OBSTACLE INTERACTION — Player collides with obstacles and slides along surfaces. Click/tap pathfinding steers toward target; if blocked by obstacle, slides along it (no A* pathfinding). WASD movement also slides along obstacles.

8. VISUAL — For V1 prototype, use basic geometric shapes from vs_colors.md: Hero Gold square (24×24px, #FFD700), Hero Glow aura (#FFF4B0), Hero Accent (#FF8C00). See vs_colors.md Player Visual section for full spec.
```

---

### Prompt 3 — Create `03_weapons_spec.md`

```
Create the file 03_weapons_spec.md for Modularity Engine.

This spec defines 3 weapons. Each weapon auto-fires without player input. USE THE EXACT VALUES from vs_prog.md Weapon Progression section — do not invent or approximate stats. The source of truth is vs_prog.md.

For EACH weapon, define:

1. IDENTITY — Name, description, visual concept from vs_colors.md.

2. BEHAVIOR TYPE — One of:
   - Projectile (fires toward nearest enemy, travels until hit or 3s timeout or 600px distance)
   - Orbit (circles the player, damages on contact, persists for weapon duration stat)
   - Area (instant pulse around player, no persistent projectile entity)

3. UPGRADE TABLE — Copy the EXACT table from vs_prog.md for this weapon. Columns vary by weapon type:
   - Projectile: Level | Damage | Cooldown | Projectile Count | Special
   - Orbit: Level | Damage | Orbit Speed | Orb Count | Radius | Special
   - Area: Level | Damage | Cooldown | Radius | Pulses | Special
   Do NOT use placeholder scaling rules. Use the exact numbers from vs_prog.md.

4. POWER SPIKE DETAILS — Copy the exact descriptions from vs_prog.md:
   - Level 4 (Mid Spike): Exact bonus name and mechanical effect
   - Level 7 (Max/Ultimate): Exact bonus name and mechanical effect

5. DPS TABLE — Copy the DPS progression table from vs_prog.md for this weapon.

6. UNLOCK CONDITION:
   - Weapon 1 (Projectile): Available from game start
   - Weapon 2 (Orbit): Unlocked when player reaches Level 3
   - Weapon 3 (Area): Unlocked when player reaches Level 6

Weapon Roster (V1):
- Weapon 1: Projectile — single-target burst, fires toward nearest enemy
- Weapon 2: Orbit — crowd control, orbs circle the player
- Weapon 3: Area — burst damage, pulses around the player

Ensure all three weapons feel mechanically distinct. Reference vs_colors.md for visual specs (shape, color, size of projectiles/orbs).
```

---

### Prompt 4 — Create `04_enemies_spec.md`

```
Create the file 04_enemies_spec.md for Modularity Engine.

This spec defines 5 standard enemy types and 1 boss. USE THE EXACT VALUES from vs_prog.md Enemy Spawn Details section — do not invent or approximate stats.

For EACH enemy, define:

1. IDENTITY — Name, description, visual concept from vs_colors.md (color, shape, size).

2. STATS TABLE — Copy the EXACT table from vs_prog.md for this enemy:
   | Stat | Value |
   |---|---|
   | HP | |
   | Damage (contact) | |
   | Speed | |
   | Size (radius) | |
   | XP Value | |
   | Gold Value | |
   | Spawn Weight | |
   | First Appears | (timestamp from wave timeline) |

3. BEHAVIOR — Movement pattern:
   - Chase: moves directly toward player (Zombie)
   - Swarm: fast but low HP, spawns in groups of 2–4 (Bat)
   - Tank: slow, high HP, absorbs damage (Skeleton)
   - Wander → Chase: drifts randomly, then locks onto player (Ghost)
   - Ranged: maintains distance, fires slow projectiles at player (Caster). Include projectile stats: damage, speed, visual.

4. DROP TABLE — Copy the exact drop rates from vs_prog.md Drop Economy:
   - XP and Gold values from stats
   - Power-up drops: only specific enemies drop specific power-ups (see vs_prog.md Drop Economy table)

5. SPAWN BEHAVIOR — Enemies spawn from off-screen edges at 400–600px from the player. No formations in V1.

ENEMY ROSTER (V1) — Use exact stats from vs_prog.md:

- Enemy 1: Zombie — HP 10, DMG 8, Speed 60, XP 1, Gold 1–2. Chase behavior. First appears 0:00.
- Enemy 2: Bat — HP 5, DMG 5, Speed 120, XP 1, Gold 1. Swarm behavior (groups of 2–4). First appears 1:00. Drops Magnet (5%).
- Enemy 3: Skeleton — HP 35, DMG 12, Speed 40, XP 3, Gold 2–3. Tank behavior. First appears 2:00. Drops Screen Wipe (2%).
- Enemy 4: Ghost — HP 15, DMG 10, Speed 80, XP 2, Gold 2–3. Wander→Chase behavior. First appears 2:30. Drops Magnet (5%).
- Enemy 5: Caster — HP 12, DMG 8, Speed 50, XP 3, Gold 3–4. Ranged behavior. Projectile: 6 DMG, 150 px/s. First appears 3:00. Drops Screen Wipe (2%).

BOSS — The Gravekeeper (exact stats from vs_prog.md Boss Encounter section):
- HP 1,000, Contact DMG 15, Speed 70/100 px/s, Size 28px radius, Spawn Time 4:00
- Phase 1 (100%–50% HP): Charges + minion spawns every 3s (3 zombies)
- Phase 2 (50%–0% HP): Faster charges every 2s + 5 zombies + ground-pound AoE (80px, 20 DMG, 0.75s telegraph)
- Drops: 50 XP, 20–30 Gold, guaranteed Weapon Level-Up
- Boss spawn announcement: text at 3:50 ("Something stirs in the darkness..."), camera shake + text at 3:55 ("The Gravekeeper rises!"), spawn at 4:00
- Include boss DPS check: player needs ~17+ DPS to kill within 60s time limit. Expected player DPS at 4:00 is 80–110, giving 9–12s kill time.
```

---

### Prompt 5 — Create `05_stages_spec.md`

```
Create the file 05_stages_spec.md for Modularity Engine.

This spec defines 1 stage for V1. USE THE EXACT VALUES from vs_prog.md Wave Timeline section.

Must include:

1. STAGE IDENTITY — Name, theme, visual description. Theme: dark gothic / cemetery. See vs_colors.md Background & Environment section for exact colors.

2. DIMENSIONS — Infinite arena with camera following player. No bounds. Player can move freely in any direction.

3. SPAWN RULES:
   - Enemies spawn from off-screen edges at 400–600px minimum distance from the player.
   - Maximum simultaneous enemies on screen: 200 (cap per time bracket — see wave timeline).
   - All drops come from enemy kills. No environmental pickups.

4. WAVE TIMELINE — Copy the EXACT Master Timeline from vs_prog.md:

   | Time | Enemy Types | Spawn Rate (/sec) | Composition | Max Enemies | Notes |
   |---|---|---|---|---|---|
   | 0:00–0:30 | Zombie | 0.8 | 100% Zombie | 25 | Tutorial |
   | 0:30–1:00 | Zombie | 1.2 | 100% Zombie | 40 | Picking up |
   | 1:00–1:30 | Zombie, Bat | 1.5 | 60% Z, 40% B | 60 | Bats arrive |
   | 1:30–2:00 | Zombie, Bat | 1.8 | 50% Z, 50% B | 80 | Full bat swarm |
   | 2:00–2:30 | Z, Bat, Skeleton | 2.0 | 40% Z, 35% B, 25% S | 100 | Skeletons |
   | 2:30–3:00 | Z, B, S, Ghost | 2.2 | 30% Z, 30% B, 25% S, 15% G | 120 | Ghosts phase in |
   | 3:00–3:30 | All 5 | 2.5 | 25% Z, 25% B, 20% S, 15% G, 15% C | 150 | Full roster |
   | 3:30–4:00 | All 5 | 3.0 | 20% Z, 25% B, 20% S, 15% G, 20% C | 180 | Peak density |
   | 4:00–4:30 | All + Boss | 2.0 | Reduced regulars | 150 + Boss | Boss active |
   | 4:30–5:00 | All + Boss | 1.5 | Minimal regulars | 120 + Boss | Final push |

   Include the EXACT spawn rate formula from vs_prog.md:
   `spawn_rate(t) = base_rate × (1 + 0.4 × floor(t / 30))`
   Capped at 3.0/second. Base rate starts at 0.8.

5. ENEMY COMPOSITION WEIGHTS — Copy the exact percentages from vs_prog.md for each time bracket.

6. DIFFICULTY SCALING — After boss defeat only (if boss dies before 5:00):
   - HP multiplier: `1 + 0.15 × minutes_after_boss_kill`
   - Damage multiplier: `1 + 0.10 × minutes_after_boss_kill`
   - If boss is NOT killed by 5:00, no scaling applies — game simply ends.

7. XP VALUE SCALING — Enemy XP values increase over time:
   `xp_value(t) = base_xp × (1 + 0.05 × floor(t / 60))`
   5% increase per minute. Include this in the engine spec.

8. OBSTACLES — 5 obstacle types from vs_colors.md: tombstones, grave mounds, broken walls, cracked floor. Player and enemies collide (slide along surfaces). Projectiles and pickups pass through. Obstacles are scattered around the arena to improve movement feel.

9. BACKGROUND/ENVIRONMENT — Dark tiled ground with subtle grid. See vs_colors.md for exact hex values.

10. STAGE EVENT MARKERS:
   - 3:50 — Screen dims slightly. Text: "Something stirs in the darkness..."
   - 3:55 — Camera shake. Text: "The Gravekeeper rises!"
   - 4:00 — Boss spawns from nearest screen edge.
   - Post-boss-kill scaling milestones — Brief text overlay: "Danger increases..." at each 30-second interval after boss death.
```

---

### Prompt 6 — Create `06_pickups_and_powerups_spec.md`

```
Create the file 06_pickups_and_powerups_spec.md for Modularity Engine.

This spec defines all collectible pickups and power-up drops.

SECTION 1: BASE PICKUPS

1. EXP GEM (Small):
   - Value: 1 XP
   - Visual: small blue gem
   - Behavior: static on ground, collected on player contact (within pickup range)
   - Attracted by magnet power-up

2. EXP GEM (Large):
   - Value: 5 XP
   - Visual: larger blue gem, slight glow
   - Same behavior as small

3. GOLD COIN:
   - Value: 1-3 gold (random)
   - Visual: gold coin
   - Behavior: slight scatter on drop, static, collected on contact
   - Attracted by magnet power-up

SECTION 2: POWER-UP DROPS

Power-ups drop from specific enemy kills. They appear as floating items with a distinct glow/ring to stand out.

4. SCREEN WIPE:
   - Effect: Instantly kills ALL enemies currently on screen. Deals boss 20% max HP (80% resistance).
   - Visual: bright white flash expanding outward from player
   - Sound: dramatic whoosh/boom
   - Drop source: Only from Enemy type 3 (Armored Skeleton) and Enemy type 5 (Ranged Caster)
   - Drop chance: 2% per kill (low)
   - Display: collectible item with skull/lightning icon, pulses on ground

5. MAGNET (EXP & Gold):
   - Effect: For 10 seconds, all EXP gems and gold coins within 350px radius are attracted to the player at 400 px/s. New pickups spawned during duration are also affected.
   - Instant burst: On pickup, all pickups within 150px are instantly collected (no travel time).
   - Visual: magnetic field ripple effect around player during duration
   - Sound: magnetic hum (continuous sine wave: 220Hz + 330Hz)
   - Drop source: From Enemy type 2 (Fast Bat) and Enemy type 4 (Ghost)
   - Drop chance: 5% per kill (moderate)
   - Display: horseshoe magnet icon, glows on ground

6. WEAPON LEVEL-UP:
   - Effect: Randomly selects 1 to 3 of the player's current weapons and increases each by 1 level (up to max 7). If a weapon is already max, it is skipped and rerolled.
   - Visual: weapon upgrade sparkles around player
   - Sound: power-up jingle
   - Drop source: Rare drop from any enemy (1% base chance), guaranteed drop from boss
   - Display: upward arrow icon with weapon symbols

SECTION 3: DROP RATE TABLE

| Enemy Type | EXP Value | Gold Value | Screen Wipe | Magnet | Weapon Up |
|---|---|---|---|---|---|
| 1 (Zombie) | 1 | 1-2 | — | — | 1% |
| 2 (Bat) | 1 | 1 | — | 5% | — |
| 3 (Skeleton) | 3 | 2-3 | 2% | — | 1% |
| 4 (Ghost) | 2 | 2-3 | — | 5% | 1% |
| 5 (Caster) | 3 | 3-4 | 2% | — | 1% |
| Boss | 50 | 20-30 | — | — | 100% |

SECTION 4: MAGNET INTERACTION RULES
- Player's base pickup range: 50px
- Magnet extends pickup range to 350px for its duration
- After magnet expires, pickup range returns to base (or 100px if player has collected magnet before — V1: returns to base)
- Multiple magnet pickups do not stack duration; picking up another resets the 10s timer

SECTION 5: PICKUP COLLECTION RULES
- Pickups have a slight float animation to be visible
- Gold coins scatter in a small radius on enemy death (±30px)
- EXP gems drop at enemy's death position
- If entity count of pickups exceeds 500, oldest pickups despawn
```

---

### Prompt 7 — Create `07_leveling_system_spec.md`

```
Create the file 07_leveling_system_spec.md for Modularity Engine.

This spec defines the EXP/leveling system and level-up choice flow.

SECTION 1: XP CURVE

USE THE EXACT TABLE from vs_prog.md Experience Curve section. Do NOT use placeholder values.

| Level | XP to Next Level | Cumulative XP | Design Note |
|---|---|---|---|
| 1 → 2 | 5 | 5 | ~5 seconds. First upgrade. |
| 2 → 3 | 10 | 15 | Weapon 2 choice available. |
| 3 → 4 | 15 | 30 | ~30 seconds. Comfortable pace. |
| 4 → 5 | 22 | 52 | ~50 seconds. Building momentum. |
| 5 → 6 | 32 | 84 | Weapon 3 choice available. |
| 6 → 7 | 45 | 129 | ~2 minutes. Escalation begins. |
| 7 → 8 | 62 | 191 | ~2:30. Player should feel strong. |
| 8 → 9 | 85 | 276 | ~3:15. Pre-boss power building. |
| 9 → 10 | 115 | 391 | ~3:45. Tension rising. |
| 10 → 11 | 155 | 546 | ~4:15. Boss fight in progress. |
| 11 → 12 | 210 | 756 | ~4:45. Near game end. |
| 12 → 13 | 280 | 1036 | Stretch goal. |
| 13 → 14 | 375 | 1411 | Elite territory. |
| 14+ | Formula | — | See below. |

Formula for level N (N ≥ 14): `xp_to_next(N) = floor(375 × 1.3^(N-14))`

Include the Expected Level Milestones table from vs_prog.md (timestamp → expected level).

SECTION 2: LEVEL-UP FLOW

1. When player XP ≥ threshold for next level:
   - Game pauses (or slows to 10% speed — V1: full pause)
   - Level-up screen overlays game
   - Player level increments by 1

2. Level-up screen shows 3 random upgrade options (cards):
   - Each card shows: icon, name, current level → new level, description of change
   - Options are drawn from the UPGRADE POOL

3. Player clicks/taps one option. Game resumes.
   - If only 1 weapon exists and it's maxed, show stat boost options instead.

SECTION 3: UPGRADE POOL RULES

The upgrade pool contains two categories:

A) WEAPON UPGRADES:
   - For each weapon the player currently owns: offer "Upgrade [Weapon] to Level N+1"
   - If player doesn't own all 3 weapons: offer "Unlock [Weapon Name]" as an option
   - Weapon unlock introduces the weapon at Level 1

B) PASSIVE STAT BOOSTS (V1 pool with max stacks):
   | Boost | Effect | Max Stacks |
   |---|---|---|
   | Max Health +20% | Increases maximum HP | 5 |
   | Movement Speed +10% | Faster movement | 3 |
   | Armor +1 | Reduces incoming damage by 1 (min 1) | 3 |
   | Pickup Range +25px | Collect pickups from further away | 4 |
   | Crit Chance +5% | Chance for 1.5× damage | 4 |

Option generation:
1. Roll 3 options from the combined pool (weapon upgrades + passives)
2. Weight: weapon upgrades 60%, passives 40%
3. No duplicate options in a single level-up screen
4. If a weapon is at max level (7), it is excluded from the pool
5. If a weapon is not yet owned but its unlock level has been reached, "Unlock [Weapon]" appears as an option
6. If only passives are available (all weapons maxed), show 3 random passives
7. If a passive is at max stacks, it is excluded from the pool

SECTION 4: VISUAL DESIGN
- Level-up screen: 3 cards in a row, each with icon top, text middle, stat change bottom
- Hover/selected card elevates with shadow
- Confetti or particle effect on selection
- Current weapon levels shown at top of screen for reference
```

---

### Prompt 8 — Create `08_ui_hud_spec.md`

```
Create the file 08_ui_hud_spec.md for Modularity Engine.

This spec defines all UI screens and HUD elements.

DESIGN THEME: Modern, polished. Dark semi-transparent panels. Crisp white text. Accent color: electric blue (#3B82F6). Font: clean sans-serif. Rounded corners, soft shadows.

SECTION 1: IN-GAME HUD (always visible during gameplay)

Layout (portrait-friendly, works on landscape too):

+------------------------------------------------------+
|  [HP BAR]                        [LEVEL] [GOLD ICON] |
|  ████████░░░░                    Lv.5    🪙 342       |
|                                                       |
|                    GAME AREA                          |
|                                                       |
|                                                       |
|  [EXP BAR - full width bottom]                        |
|  ████████████████████░░░░░░░  Lv.5                    |
|                                                       |
|  [WEAPON PANEL - bottom left]                         |
|  🔱 Lv.3  🔥 Lv.1  ⚡ Lv.7                           |
+------------------------------------------------------+

Element specs:

1. HEALTH BAR — Top-left. Red fill on dark background. Shows "HP" label and numeric "72/100". Width: 200px, height: 16px. Smooth animation on damage.

2. LEVEL DISPLAY — Top-center-right. Circle with level number. Pulses on level up.

3. GOLD DISPLAY — Top-right. Coin icon + numeric value. Increments with animation on gold pickup.

4. EXP BAR — Bottom edge, full width. Blue fill. Shows current level and progress: "Lv.5 — 120/150". Fills smoothly.

5. WEAPON PANEL — Bottom-left corner. Row of weapon icons, each showing weapon icon + level number. Highlights when weapon fires or upgrades. Max level weapons have a gold border.

6. TIMER — Top-center. Shows elapsed time: "MM:SS". Boss spawns at 4:00.

7. BOSS HEALTH BAR — Appears at top of screen when boss spawns. Large bar, boss name displayed. Disappears when boss dies.

SECTION 2: LEVEL-UP SCREEN

- Semi-transparent dark overlay (game pauses fully)
- Title: "LEVEL UP!" in large text with glow
- 3 upgrade cards centered horizontally
- Each card (200x280px): icon (top), weapon/upgrade name, "Lv.2 → Lv.3" text, description of change
- Cards have subtle entrance animation (scale up from 0.8)
- Selected card has blue glow border
- Keyboard shortcuts: 1, 2, 3 to quick-select
- Touch: tap a card to select it
- On selection: confetti or particle effect, brief delay (0.3s), then game resumes

SECTION 3: END SCREENS (3 states — see 01_engine_architecture.md)

All end screens share the same layout: dark overlay, stats summary with animated counters (values tick up from 0), "Restart" button (primary), "Main Menu" button (secondary). 1.0s pause for dramatic effect before fade-in over 0.5s.

Stats displayed on ALL end screens:
- Time Survived: MM:SS (or "5:00" if survived full duration)
- Level Reached: #
- Enemies Killed: #
- Gold Collected: #
- Boss Defeated: Yes / No
- Weapon Loadout: W1 Lv.#, W2 Lv.#, W3 Lv.#

3a. VICTORY SCREEN (boss killed before 5:00):
- Title: "VICTORY" in gold text
- Bonus: +100 gold added to total
- Bonus text: "The Gravekeeper has been vanquished!"
- Confetti particle effect
- Background: dark with gold accent

3b. SURVIVED SCREEN (timer reaches 5:00, boss alive):
- Title: "SURVIVED" in white text
- No bonus
- Background: dark with blue accent

3c. DEFEAT SCREEN (player HP reaches 0):
- Title: "DEFEATED" in red text
- Red tint overlay
- No bonus
- Same stats minus boss defeated

SECTION 4: PAUSE MENU (press Escape or tap pause button)

- Semi-transparent overlay
- Title: "PAUSED"
- Buttons: "Resume", "Restart", "Quit to Menu"
- Game fully pauses behind overlay
- Touch: tap outside overlay to resume (optional)

SECTION 5: MINI UI ELEMENTS

- Damage numbers: float up from hit enemies, color-coded (white normal, yellow crit, red player damage taken)
- Kill count: small "+1" that fades at enemy death position
- Gold pickup: "+3g" floating text near pickup
- Boss health bar: large bar at top of screen during boss fight, with boss name
- Victory bonus: "+100g" floating text on boss kill

SECTION 6: RESPONSIVE LAYOUT
- HUD scales based on screen size
- Minimum supported: 800x600
- Touch-friendly tap targets for mobile (minimum 44x44px)
- Level-up cards stack vertically on narrow screens
```

---

### Prompt 9 — Create `09_audio_spec.md`

```
Create the file 09_audio_spec.md for Modularity Engine.

This spec defines the audio design for V1. THE CANONICAL SOURCE for all audio specs is the Sound Design Arc section in vs_prog.md. This prompt defines the structure; vs_prog.md provides every number, waveform, frequency, and timing.

This file MUST include the following sections, each pulling exact values from vs_prog.md:

SECTION 1: AUDIO ARCHITECTURE
- Web Audio API (no external libraries, no Howler.js). Single HTML5 file, zero dependencies.
- Audio channels: SFX (multiple concurrent), Music (1 track), UI (1 concurrent)
- Max simultaneous sounds: 16 (older sounds ducked/forced when exceeded)
- Volume defaults: Master 80%, Music 70%, SFX 85%. No settings UI in V1.
- All sounds are procedurally synthesized using Web Audio API oscillators.

SECTION 2: SFX LIST — Copy the full SFX table from vs_prog.md. Each entry has: ID, trigger, waveform, frequency/pattern, duration, notes.

Required SFX (copy exact specs from vs_prog.md):
- Weapon hit (noise burst, 200–800Hz bandpass, 0.03s)
- Enemy kills: per-type (Zombie pop, Bat chirp, Skeleton clank, Ghost wail, Caster fizz, Boss death)
- Pickup sounds: XP small (3-note payout triad), XP large (4-note extended), Gold coin (brighter clink)
- Level-up (ascending scale run C5→E5→G5→C6)
- Power-up collect (5-note full arpeggio)
- Screen wipe (descending sweep 2000Hz→100Hz + white noise)
- Player hurt (square 200Hz→100Hz, 0.1s)
- Player death (square+sine 400Hz→50Hz, 1.5s)
- Weapon fire: per-weapon (Projectile = square blip, Orbit = triangle hum, Area = sawtooth sweep)
- UI click (sine 800Hz, 0.02s)
- Boss warning (sine 100Hz fade-in, 2s)
- Boss spawn (square+noise 80Hz→40Hz, 1s)
- Magnet hum (continuous sine 220Hz + 330Hz, duration of effect)

SECTION 3: MUSIC PROGRESSION — Copy the exact Music Progression table from vs_prog.md. Each entry has: timestamp, track, transition, feel.

Key music moments:
- 0:00 Stage Theme ambient intro (fade in 2s)
- 0:15 Beat drop (drums enter)
- 1:00 Building loop (add bass)
- 2:00 Full intensity (add lead synth)
- 3:30 Pre-boss build (strings swell)
- 3:50 Silence (2s dramatic cut)
- 3:52 Boss theme ominous intro
- 4:00 Boss theme full combat
- 4:30 Boss Phase 2 escalation (+15% tempo)
- Boss death: Victory sting (2s brass fanfare)
- 5:00 Game Over melancholic piano
- Player death: Death sting (1s impact, silence)

Crossfade: 2s transitions except pre-boss silence (instant cut) and boss death (slow-mo bass drop).

SECTION 4: PICKUP SOUND ENGINE — The Payout Triad. Copy the full spec from vs_prog.md:
- Oscillator: square wave, attack 0.005s, decay 0.04s, release 0.02s
- C Major scale C5–C6 (8 frequencies: 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50)
- Arpeggio: Base → ×1.5 → ×2.0 (3 notes in 0.065s)
- Variance engine: combo stepping (advance scale index per pickup, reset after 0.6s gap), micro-tuning jitter (±15Hz), volume decoupling (gain 0.08–0.12)
- Per-type variations: XP small (3-note), XP large (4-note), Gold (brighter pattern), Power-up (5-note), Level-up (scale run)

SECTION 5: SOUND PRIORITY SYSTEM — Copy the exact priority order and ducking rules from vs_prog.md.

Priority (highest to lowest):
1. Player hurt/death
2. Power-up collected
3. Level-up
4. Boss sounds
5. Screen wipe
6. Weapon fire
7. Enemy death
8. Weapon hit
9. Pickup collection
10. Enemy ambient

Ducking: high-priority sound ducks lower sounds by 20% for 0.3s. Boss active ducks all regular combat by 30%. Level-up screen ducks combat to 10%.

SECTION 6: DISTANCE-BASED AUDIO — Copy the exact attenuation table from vs_prog.md (0–100px = 100%, 100–200px = 70%, 200–400px = 40%, 400px+ = 20%). Exceptions: player sounds always 100%, boss sounds minimum 80%.
```

---

### Prompt 10 — Create `10_json_schemas.md`

```
Create the file 10_json_schemas.md for Modularity Engine.

This spec defines the JSON schema for every content file the engine loads. USE THE EXACT VALUES from vs_prog.md, vs_colors.md, and the numbered spec files (02–09) as the source of truth for all field values.

Each schema must include: field name, type (required/optional), default value, description, and a complete V1 example populated with real values from the specs.

Define schemas for:

1. CHARACTERS.JSON — Single character definition
   - id, name, description, stats (maxHealth: 100, moveSpeed: 200, armor: 0, pickupRange: 50, magnetRange: 0, critChance: 0, critMultiplier: 1.5), startingWeapon (weapon id), visual (shape: "square", size: 24, color: "#FFD700")
   - Source: 02_character_spec.md + vs_colors.md

2. WEAPONS.JSON — Array of 3 weapon definitions
   - id, name, description, type (projectile/orbit/area), targeting, unlockLevel (1/3/6), statsPerLevel (array of 7 level objects with exact values from vs_prog.md Weapon Progression), powerSpikes ({level4: {name, description, statModifiers}, level7: {name, description, statModifiers}}), visual (shape, color from vs_colors.md)
   - Source: 03_weapons_spec.md + vs_prog.md Weapon Progression

3. ENEMIES.JSON — Array of 6 definitions (5 enemies + 1 boss)
   - id, name, type (normal/boss), stats (hp, damage, speed, size, xpValue, goldValue), behavior (pattern, params), drops (powerUpTable [{type, chance}]), spawn (weight, firstAppears)
   - Boss-specific: phases [{hpThreshold, speed, chargeInterval, minionCount, groundPound}], loot (xp, gold, guaranteedPowerUp)
   - Source: 04_enemies_spec.md + vs_prog.md Enemy Spawn Details + Boss Encounter

4. STAGES.JSON — Single stage definition
   - id, name, theme, background, spawnConfig (minDistance: 400–600, maxEnemies: 200, baseSpawnRate: 0.8, spawnRateCap: 3.0)
   - waves (array of 10 time brackets from vs_prog.md Master Timeline, each with: time, enemyTypes, spawnRate, compositionWeights, maxEnemies)
   - difficultyScaling ({hpMultiplier: "1 + 0.15 × minutes_after_boss_kill", damageMultiplier: "1 + 0.10 × minutes_after_boss_kill"})
   - xpScaling (formula: "base_xp × (1 + 0.05 × floor(t / 60))")
   - bossConfig ({enemyId, spawnTime: 4:00, announcement: [{time: 3:50, text, type: "text"}, {time: 3:50, type: "dim"}, {time: 3:55, type: "shake", text}]})
   - obstacles (types: 5, collisionRules: "player+enemies collide, projectiles+pickups pass through")
   - Source: 05_stages_spec.md + vs_prog.md Wave Timeline

5. PICKUPS.JSON — Array of 6 pickup definitions
   - id, name, type (exp_small/exp_large/gold/screen_wipe/magnet/weapon_levelup), value, visual (shape, color from vs_colors.md)
   - Behavior: {duration, attractRadius, attractSpeed, instantBurstRadius}
   - Drop config: {sources [{enemyId, chance}], guaranteedDropEnemies}
   - Magnet special: attractRadius: 350, attractSpeed: 400, instantBurstRadius: 150, duration: 10
   - Source: 06_pickups_and_powerups_spec.md + vs_prog.md Drop Economy

6. LEVELING.JSON — Leveling configuration
   - xpCurve (array of 14 entries from vs_prog.md XP Table, each with: level, xpToNext, cumulativeXp)
   - formula ({forLevel: 14, expression: "floor(375 × 1.3^(N-14))"})
   - upgradePool ({weaponWeight: 0.6, passiveWeight: 0.4})
   - passiveOptions (5 entries, each with: id, name, stat, value, description, maxStacks)
   - Source: 07_leveling_system_spec.md + vs_prog.md Experience Curve

Include TypeScript type annotations alongside the JSON examples. Each file's schema should be self-contained — a developer reading only that schema should understand the full structure.
```

---

## Spec Validation Test Prompts

> **Instructions:** After creating each spec file, run its matching test prompt to validate correctness. Fix any failures before moving to the next spec. The test prompt reads the spec file and checks it against the source of truth files (vs_prog.md, vs_colors.md, vs_plan.md).

---

### Test 1 — Validate `01_engine_architecture.md`

```
Read the file 01_engine_architecture.md and validate it against the requirements below. Report PASS or FAIL for each check.

REQUIRED SECTIONS — All must exist:
1. Game Loop — fixed-timestep, 60 FPS target, correct system order: input → movement → auto-attack → collision → entity cleanup → spawn → pickup collection → UI update → render
2. Entity System — entity structure (id, type, position, velocity, hitbox, stats, behavior), object pooling
3. Collision System — AABB, 3 collision layers defined (player-damageable, enemy-damageable, pickup-collectable)
4. Rendering — Canvas 2D, camera follows player, draw order: background → entities (y-sort) → projectiles → pickups → UI overlay
5. Data Loading — JSON content files loaded on stage start, validation on load
6. Scene/State Management — MUST list THREE end states: Victory (boss killed), Survived (timer 5:00), Defeat (player dies). Each with distinct title.
7. Damage System — formula: attacker.damage - defender.defense (min 1), crit chance, knockback, invincibility frames (0.5s)
8. Camera Effects — screen shake on: boss spawn, screen wipe, boss death, low HP (<25%)
9. HiDPI — devicePixelRatio support mentioned
10. Projectile Lifetime — 3 seconds OR 600px, whichever first
11. Obstacle Collision — player + enemies collide with obstacles, projectiles + pickups pass through
12. Performance — max 200 enemies + 500 projectiles + 500 pickups

CROSS-REFERENCE CHECKS:
- [ ] Boss spawn time is 4:00 (not 10:00)
- [ ] Game duration is 5 minutes (not 10)
- [ ] References 03_weapons_spec.md for weapon stats
- [ ] References 08_ui_hud_spec.md for end screen stats
- [ ] References vs_colors.md for visual specs
- [ ] Invincibility frames = 0.5s (matches 02_character_spec.md)
- [ ] Damage formula uses defense/armor (matches passive stats in 07_leveling_system_spec.md)
```

---

### Test 2 — Validate `02_character_spec.md`

```
Read the file 02_character_spec.md and validate it against the requirements below.

REQUIRED — Stats table must contain EXACTLY these values:
- Max Health: 100
- Movement Speed: 200 px/s
- Armor: 0
- Pickup Range: 50 px
- Magnet Range: 0
- Crit Chance: 0%
- Crit Multiplier: 1.5x
- Level: starts at 1

REQUIRED SECTIONS:
1. Character Identity — name, description, lore text
2. Base Stats Table — all values above present and correct
3. Movement — dual input: click/tap-to-move (primary) + WASD/arrow keys (secondary)
   - Click/tap: pathfinds to target, stops within 4px threshold, visual indicator
   - WASD: 8-directional, diagonal normalization
   - WASD overrides click-to-move if pressed
   - Touch devices: tap-to-move exclusively, no virtual joystick
4. Hitbox — circular, radius 12px
5. Invincibility Frames — 0.5 seconds, 100ms blink intervals
6. Death Condition — health ≤ 0, triggers DEFEAT end screen (reference 01_engine_architecture.md)
7. Obstacle Interaction — player slides along obstacles, pathfinding steers around
8. Visual — Hero Gold square 24×24px, color #FFD700, references vs_colors.md

CROSS-REFERENCE CHECKS:
- [ ] Starting Weapon references a weapon from 03_weapons_spec.md
- [ ] Visual spec matches vs_colors.md Player Visual section
- [ ] Death condition references 3 end states from 01_engine_architecture.md
```

---

### Test 3 — Validate `03_weapons_spec.md`

```
Read the file 03_weapons_spec.md and validate it against vs_prog.md Weapon Progression section.

FOR EACH WEAPON (Projectile, Orbit, Area), verify:
1. Upgrade table has EXACTLY 7 levels
2. All stat values match vs_prog.md (copy-paste check, not approximation)
3. DPS table matches vs_prog.md DPS Progression
4. Level 4 power spike defined with exact name and effect from vs_prog.md
5. Level 7 power spike defined with exact name and effect from vs_prog.md
6. Unlock condition matches: W1=start, W2=Level 3, W3=Level 6

WEAPON-SPECIFIC CHECKS:
- Projectile: Level 1 DMG=8, Cooldown=1.00s, L4=Pierce +1 enemy, L7=Projectiles split on hit
- Orbit: Level 1 DMG=5, Orbit Speed=2.0s, L4=+50% radius +1 orb, L7=Afterimage trails
- Area: Level 1 DMG=12, Cooldown=2.50s, L4=Double pulse, L7=Massive explosion + stun

CROSS-REFERENCE CHECKS:
- [ ] Projectile lifetime: 3s or 600px (matches 01_engine_architecture.md)
- [ ] Visual specs reference vs_colors.md
- [ ] Behavior types match 01_engine_architecture.md (Projectile/Orbit/Area)
```

---

### Test 4 — Validate `04_enemies_spec.md`

```
Read the file 04_enemies_spec.md and validate it against vs_prog.md Enemy Spawn Details.

FOR EACH ENEMY, verify stats match vs_prog.md EXACTLY:
- Zombie: HP 10, DMG 8, Speed 60, Size 14px, XP 1, Gold 1-2, Weight 100, First Appears 0:00
- Bat: HP 5, DMG 5, Speed 120, Size 10px, XP 1, Gold 1, Weight 80, First Appears 1:00
- Skeleton: HP 35, DMG 12, Speed 40, Size 16px, XP 3, Gold 2-3, Weight 60, First Appears 2:00
- Ghost: HP 15, DMG 10, Speed 80, Size 12px, XP 2, Gold 2-3, Weight 50, First Appears 2:30
- Caster: HP 12, DMG 8, Speed 50, Size 13px, XP 3, Gold 3-4, Weight 45, First Appears 3:00, Projectile DMG 6, Projectile Speed 150 px/s

DROP TABLE CHECK:
- Bat drops Magnet 5%
- Ghost drops Magnet 5%
- Skeleton drops Screen Wipe 2%
- Caster drops Screen Wipe 2%
- Zombie: 1% Weapon Up
- Skeleton, Ghost, Caster: 1% Weapon Up

BOSS CHECK — The Gravekeeper:
- HP 1,000, DMG 15, Speed 70/100, Size 28px, Spawn 4:00
- Phase 1: charges + 3 minions every 3s
- Phase 2: faster charges every 2s + 5 minions + ground pound (80px, 20 DMG, 0.75s telegraph)
- Drops: 50 XP, 20-30 Gold, guaranteed Weapon Level-Up
- Announcement: text at 3:50, shake at 3:55, spawn at 4:00
- Boss DPS check mentioned: ~17+ DPS needed, expected 80-110

CROSS-REFERENCE CHECKS:
- [ ] Boss spawn = 4:00 (not 10:00)
- [ ] Visual specs reference vs_colors.md
- [ ] Drop table matches vs_prog.md Drop Economy table
```

---

### Test 5 — Validate `05_stages_spec.md`

```
Read the file 05_stages_spec.md and validate it against vs_prog.md Wave Timeline.

WAVE TIMELINE CHECK — must have EXACTLY 10 time brackets:
1. 0:00–0:30: Zombie, 0.8/s, 25 max
2. 0:30–1:00: Zombie, 1.2/s, 40 max
3. 1:00–1:30: Z+B, 1.5/s, 60 max
4. 1:30–2:00: Z+B, 1.8/s, 80 max
5. 2:00–2:30: Z+B+S, 2.0/s, 100 max
6. 2:30–3:00: Z+B+S+G, 2.2/s, 120 max
7. 3:00–3:30: All 5, 2.5/s, 150 max
8. 3:30–4:00: All 5, 3.0/s, 180 max
9. 4:00–4:30: All+Boss, 2.0/s, 150+Boss max
10. 4:30–5:00: All+Boss, 1.5/s, 120+Boss max

SPAWN FORMULA CHECK:
- spawn_rate(t) = base_rate × (1 + 0.4 × floor(t / 30))
- Capped at 3.0/second
- Base rate starts at 0.8

COMPOSITION WEIGHTS — verify percentages for each bracket match vs_prog.md.

DIFFICULTY SCALING CHECK:
- Post-boss only: HP × (1 + 0.15 × minutes), Damage × (1 + 0.10 × minutes)
- No scaling if boss not killed by 5:00

OBSTACLES CHECK:
- 5 types mentioned, collision rules defined
- References vs_colors.md

EVENT MARKERS CHECK:
- 3:50 text announcement
- 3:55 camera shake + text
- 4:00 boss spawn
- Post-boss difficulty notifications

XP SCALING CHECK:
- xp_value(t) = base_xp × (1 + 0.05 × floor(t / 60))

CROSS-REFERENCE CHECKS:
- [ ] Game duration = 5 minutes (not 10)
- [ ] Boss spawns at 4:00 (not 10:00)
- [ ] Difficulty scaling: +15% HP, +10% damage (not +5%)
- [ ] Obstacles included (not excluded)
```

---

### Test 6 — Validate `06_pickups_and_powerups_spec.md`

```
Read the file 06_pickups_and_powerups_spec.md and validate it.

DROP RATE TABLE CHECK — must match vs_prog.md:
| Enemy | XP | Gold | Screen Wipe | Magnet | Weapon Up |
| Zombie | 1 | 1-2 | — | — | 1% |
| Bat | 1 | 1 | — | 5% | — |
| Skeleton | 3 | 2-3 | 2% | — | 1% |
| Ghost | 2 | 2-3 | — | 5% | 1% |
| Caster | 3 | 3-4 | 2% | — | 1% |
| Boss | 50 | 20-30 | — | — | 100% |

POWER-UP CHECKS:
- Screen Wipe: kills all enemies, deals 20% boss HP (80% resistance), 2% from Skeleton/Caster
- Magnet: 350px radius, 400 px/s, 10s duration, instant burst 150px, 5% from Bat/Ghost
- Weapon Level-Up: levels 1-3 random weapons, 1% base, 100% boss, max level 7

MAGNET RULES CHECK:
- Base pickup range: 50px
- Magnet extends to 350px
- Instant burst: 150px
- No duration stacking, reset timer on re-pickup

PICKUP RULES CHECK:
- Gold scatter: ±30px
- Despawn limit: 500 pickups

CROSS-REFERENCE CHECKS:
- [ ] Magnet instant burst (150px) present
- [ ] All drop rates match vs_prog.md Drop Economy
- [ ] Sound references match vs_prog.md Sound Design Arc
```

---

### Test 7 — Validate `07_leveling_system_spec.md`

```
Read the file 07_leveling_system_spec.md and validate against vs_prog.md Experience Curve.

XP TABLE CHECK — must match vs_prog.md EXACTLY:
| Level | XP to Next | Cumulative |
| 1→2 | 5 | 5 |
| 2→3 | 10 | 15 |
| 3→4 | 15 | 30 |
| 4→5 | 22 | 52 |
| 5→6 | 32 | 84 |
| 6→7 | 45 | 129 |
| 7→8 | 62 | 191 |
| 8→9 | 85 | 276 |
| 9→10 | 115 | 391 |
| 10→11 | 155 | 546 |
| 11→12 | 210 | 756 |
| 12→13 | 280 | 1036 |
| 13→14 | 375 | 1411 |
| 14+ | floor(375 × 1.3^(N-14)) | — |

FORMULA CHECK:
- xp_to_next(N) = floor(375 × 1.3^(N-14)) for N ≥ 14
- NOT floor(250 × 1.35^(N-10)) — this is the OLD wrong formula

PASSIVE BOOSTS CHECK — must have max stacks:
- Max Health +20%: max 5 stacks
- Movement Speed +10%: max 3 stacks
- Armor +1: max 3 stacks
- Pickup Range +25px: max 4 stacks
- Crit Chance +5%: max 4 stacks

UPGRADE POOL RULES CHECK:
- Weapon upgrades 60%, passives 40%
- No duplicates in single screen
- Max level weapons excluded
- Unlock options appear when level reached
- Max stack passives excluded
- All-weapons-maxed → 100% passives

MILESTONES CHECK:
- Expected Level Milestones table from vs_prog.md included
- Level-up pacing table included

CROSS-REFERENCE CHECKS:
- [ ] Level-up screen behavior matches 01_engine_architecture.md (full pause)
- [ ] Weapon unlocks: W2 at Level 3, W3 at Level 6 (matches 03_weapons_spec.md)
```

---

### Test 8 — Validate `08_ui_hud_spec.md`

```
Read the file 08_ui_hud_spec.md and validate it.

TIMER CHECK:
- Timer shows boss spawns at 4:00 (NOT 10:00)

END SCREENS CHECK — must define 3 distinct screens:
1. Victory: title "VICTORY", gold text, +100 gold bonus, confetti, text "The Gravekeeper has been vanquished!"
2. Survived: title "SURVIVED", white text, no bonus
3. Defeat: title "DEFEATED", red text, red tint overlay, no bonus

END SCREEN STATS CHECK — ALL 3 screens must show:
- Time Survived
- Level Reached
- Enemies Killed
- Gold Collected
- Boss Defeated (Yes/No)
- Weapon Loadout (W1 Lv.#, W2 Lv.#, W3 Lv.#)

HUD ELEMENTS CHECK:
- Health bar (top-left, red)
- Level display (top-center-right)
- Gold display (top-right)
- EXP bar (bottom, full width, blue)
- Weapon panel (bottom-left, gold border on max level)
- Timer (top-center)
- Boss health bar (appears at boss spawn)

LEVEL-UP SCREEN CHECK:
- 3 cards, keyboard 1-2-3, touch tap to select
- Semi-transparent overlay, game pauses

PAUSE MENU CHECK:
- Escape to pause, Resume/Restart/Quit

MINI UI CHECK:
- Damage numbers (white/yellow/red color-coded)
- Floating gold text (+Ng)
- Victory bonus text (+100g on boss kill)

CROSS-REFERENCE CHECKS:
- [ ] Design theme matches (dark, electric blue accent #3B82F6)
- [ ] Responsive: 800x600 minimum, touch targets 44x44px
- [ ] Cards stack vertically on narrow screens
```

---

### Test 9 — Validate `09_audio_spec.md`

```
Read the file 09_audio_spec.md and validate against vs_prog.md Sound Design Arc.

ARCHITECTURE CHECK:
- Web Audio API only (no Howler.js)
- Volume defaults: Master 80%, Music 70%, SFX 85%
- Max 16 simultaneous sounds

SFX COUNT CHECK — must have at least 13 SFX entries:
weapon_hit, kill_zombie, kill_bat, kill_skeleton, kill_ghost, kill_caster, kill_boss,
pickup_xp_small, pickup_xp_large, pickup_gold, level_up, powerup_collect,
screen_wipe, player_hurt, player_death, weapon_fire (per-weapon), ui_click,
boss_warning, boss_spawn, magnet_hum

MUSIC CHECK:
- At least 10 music moments/timestamps
- 3:50 silence, 3:52 boss intro, 4:00 boss full combat
- Victory sting on boss death
- Death sting on player death

PAYOUT TRIAD CHECK:
- Square waveform
- C Major scale: 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50 Hz
- Arpeggio: Base → ×1.5 → ×2.0
- Combo stepping: advance index, reset after 0.6s gap
- Micro-tuning jitter: ±15 Hz
- Volume decoupling: gain 0.08–0.12

PRIORITY CHECK:
- 10-level priority list present
- Ducking rules: high-priority ducks by 20%, boss active ducks by 30%, level-up ducks to 10%

DISTANCE AUDIO CHECK:
- 4 tiers: 0-100px=100%, 100-200px=70%, 200-400px=40%, 400px+=20%
- Player sounds always 100%, boss minimum 80%
```

---

### Test 10 — Validate `10_json_schemas.md`

```
Read the file 10_json_schemas.md and validate it.

SCHEMA COMPLETENESS CHECK — all 6 JSON files must have schemas:
1. characters.json — id, name, stats (all 8 fields), startingWeapon, visual (shape, size, color)
2. weapons.json — 3 weapons, each with upgradeTable (7 levels), powerSpikes (L4+L7), unlockLevel
3. enemies.json — 6 entries (5 enemies + boss), each with stats, behavior, drops, spawn
4. stages.json — 1 stage with 10 time brackets, spawnConfig, difficultyScaling, xpScaling, bossConfig with announcement
5. pickups.json — 6 pickups, each with behavior, dropConfig. Magnet: attractRadius=350, instantBurstRadius=150
6. leveling.json — xpCurve (14 entries), formula (floor(375 × 1.3^(N-14))), passiveOptions with maxStacks

VALUE ACCURACY CHECK:
- Character maxHealth=100, moveSpeed=200, pickupRange=50
- Boss spawn=4:00, HP=1000
- Magnet attractRadius=350, instantBurstRadius=150
- XP formula: floor(375 × 1.3^(N-14))
- Game duration: 5 minutes
- Obstacles: 5 types, collision rules defined

TYPE CHECK:
- TypeScript type annotations present alongside JSON examples
- Each schema is self-contained with field types and defaults

CROSS-REFERENCE CHECKS:
- [ ] All values match the corresponding spec files (02-09)
- [ ] No stale boss spawn times (10:00)
- [ ] No wrong XP formulas
```

---

### Test 11 — Cross-Spec Integration Test

```
After all 10 spec files are created, read all of them and validate cross-spec consistency.

UNIVERSAL VALUES CHECK — these values must be identical across all files that reference them:
| Value | Expected | Files That Must Agree |
|---|---|---|
| Game duration | 5 minutes | 01, 05, 07, 08, 10 |
| Boss spawn time | 4:00 | 01, 04, 05, 08, 10 |
| Player max HP | 100 | 02, 04 (boss DPS check), 07, 10 |
| Player speed | 200 px/s | 02, 10 |
| Pickup range | 50 px | 02, 06, 10 |
| Magnet radius | 350 px | 06, 10 |
| Magnet instant burst | 150 px | 06, 10 |
| XP formula | floor(375 × 1.3^(N-14)) | 07, 10 |
| L1→2 XP | 5 | 07, 10 |
| Difficulty scaling | +15% HP, +10% DMG | 05, 10 |
| Projectile lifetime | 3s or 600px | 01, 03 |
| Max enemies | 200 | 01, 05 |
| End states | 3 (Victory/Survived/Defeat) | 01, 08 |
| Obstacles | 5 types, included in V1 | 01, 05, 10 |
| Timer shows | Boss at 4:00 | 08 |
| Weapon unlocks | W2=Lv3, W3=Lv6 | 03, 07 |

DROP RATE CONSISTENCY CHECK:
- Drop rate table in 06_pickups must match drop rates in 04_enemies
- Both must match vs_prog.md Drop Economy

WAVE TIMELINE CHECK:
- 05_stages must have 10 brackets matching vs_prog.md
- Enemy first-appearance times in 04_enemies must align with 05_stages

VISUAL CONSISTENCY CHECK:
- All entity visuals (player, enemies, boss, pickups, obstacles) reference vs_colors.md
- No entity specifies a color/shape that conflicts with vs_colors.md

AUDIO CONSISTENCY CHECK:
- All sound triggers in 09_audio match events defined in 01-08
- Boss spawn announcement timing in 05_stages matches 09_audio
```

---

## Engine Core Systems

The engine is built in TypeScript. Below is the system inventory (no spec file needed — built directly).

| System | Responsibility |
|---|---|
| `GameLoop` | Fixed-timestep update/render cycle |
| `EntityManager` | Create, destroy, pool, iterate entities |
| `InputManager` | Click/tap-to-move (primary) + WASD/arrow keys (secondary) + mouse/touch input capture |
| `MovementSystem` | Pathfinding to click target, collision with obstacles, movement normalization |
| `CollisionSystem` | AABB checks, collision layers, response |
| `Camera` | Follow player, smooth lerp, bounds |
| `Renderer` | Canvas 2D draw calls, sprite batching, UI overlay |
| `SpawnSystem` | Read stage wave timeline, instantiate enemies |
| `WeaponSystem` | Cooldowns, targeting, projectile creation |
| `DamageSystem` | Damage calc, crits, knockback, invincibility |
| `PickupSystem` | Magnet attraction, collection range, power-up activation |
| `LevelingSystem` | XP tracking, level-up trigger, upgrade selection |
| `AudioManager` | Sound loading, playback, channel management |
| `UIManager` | HUD rendering, level-up screen, game-over, pause |
| `DataManager` | JSON loading, validation, hot-reload |

---

## Feature Checklist

Use this checklist to verify each spec file covers all V1 requirements.

### Core Gameplay
- [ ] 1 stage defined with wave timeline and difficulty scaling (5-minute duration)
- [ ] 1 character with base stats and movement
- [ ] Click/tap-to-move as primary input (with WASD/arrow keys secondary)
- [ ] Touch devices: tap-to-move exclusively, no virtual joystick
- [ ] 3 weapons with distinct mechanics (projectile, orbit, area)
- [ ] Each weapon has full upgrade table (Levels 1–7)
- [ ] Power spike at Level 4 defined per weapon
- [ ] Power spike at Level 7 (max) defined per weapon
- [ ] 5 enemy types with distinct behaviors
- [ ] 1 boss with spawn time (minute 4), stats, and attack pattern
- [ ] Boss does NOT respawn in V1

### Pickups & Economy
- [ ] EXP gems (small + large) with values
- [ ] Gold coins with value range
- [ ] Screen wipe power-up: effect, drop source, drop chance (2%)
- [ ] Magnet power-up: effect, duration, drop source, drop chance (5%)
- [ ] Weapon level-up drop: effect, drop chance (1% base, 100% boss)
- [ ] Weapon level-up drop randomly levels 1–3 weapons
- [ ] XP value scaling: +5% per minute

### Leveling & UI
- [ ] Leveling system with XP curve (compressed for 5 minutes)
- [ ] Level-up screen with 3 random choices
- [ ] Upgrade pool: weapon upgrades + passive stats
- [ ] HUD: health bar, EXP bar, level, gold, weapon levels, timer
- [ ] Game-over screen with stats
- [ ] Pause menu
- [ ] Boss health bar
- [ ] Damage numbers (floating text)

### Visuals (from `vs_colors.md`)
- [ ] Player: Hero Gold square, 24×24px
- [ ] Enemies: 5 distinct shapes/colors (square, diamond, circle, triangle)
- [ ] Boss: Large crimson square with red glow
- [ ] Pickups: Diamonds (XP), circles (gold), distinct colors
- [ ] Power-ups: Green (wipe), pink (magnet), orange (weapon up)
- [ ] Obstacles: 5 types (tombstones, grave mounds, broken walls, cracked floor)
- [ ] Background: Dark tiled ground with subtle grid

### Audio (from `vs_prog.md` Sound Design Arc)
- [ ] Procedural Web Audio API synthesis (no external files)
- [ ] Pickup sounds: Payout triad arpeggios (C Major scale)
- [ ] Variance engine: combo stepping, micro-tuning jitter, volume decoupling
- [ ] Weapon fire sounds: per-weapon distinct sounds
- [ ] Enemy hit/kill sounds: per-type distinct sounds
- [ ] Boss sounds: spawn, phase transition, death
- [ ] Music: stage theme, boss theme, menu theme
- [ ] Sound priority system and ducking rules

### Data & Schemas
- [ ] JSON schemas for all content files
- [ ] All 6 JSON content files spec'd
- [ ] Cross-references between files are consistent

---

## Missing Details & Recommended Actions

> **Resolved Conflicts:** The following conflicts have been resolved and are now canonical:
> - **XP Curve:** `vs_prog.md` is the source of truth (compressed for 5 minutes)
> - **Boss Spawn:** Minute 4 (not minute 10)
> - **Wave Timeline:** `vs_prog.md` 5-minute timeline supersedes this file's original 10-minute table
> - **Obstacles:** Included in V1 (defined in `vs_colors.md`)
> - **Visual Spec:** `vs_colors.md` is the canonical source for shapes, colors, and sizes
> - **Sound Design:** `vs_prog.md` Sound Design Arc is the canonical source

The following items are **not yet resolved** in V1 and should be addressed during implementation:

### Gameplay Details

| # | Missing Detail | Recommendation | Status |
|---|---|---|---|
| 1 | **Player knockback when hit** — Does the player get pushed back on damage? | Recommend: yes, small knockback away from source. Add to `02_character_spec.md` during review. | Open |
| 2 | **Projectile collision with obstacles** — V1 has obstacles now. Do projectiles collide? | Recommend: no, projectiles pass through obstacles. Only player and enemies collide. Add to `01_engine_architecture.md`. | Open |
| 2b | **Click/tap-to-move pathfinding** — How does the character navigate around obstacles? | Recommend: simple steering — move toward target, if blocked by obstacle, slide along it. No A* needed for V1. Add to `01_engine_architecture.md`. | Open |
| 3 | **Critical hit display** — How are crits visually communicated? | Recommend: yellow damage numbers + micro screen shake. Add to `08_ui_hud_spec.md`. | Open |
| 4 | **Weapon projectile lifetime** — Do projectiles despawn after distance/time? | Recommend: yes, 3-second lifetime or 600px max distance. Add to `03_weapons_spec.md`. | Open |
| 5 | **Gold spending** — Is gold used for anything in V1? | Recommend: no. Gold is a score metric only in V1. Note for V2 (shop/upgrade between runs). | Open |
| 6 | **Item pickup magnet auto-collect** — Do pickups auto-collect or require walking over? | Recommend: both — base pickup range for walk-over, magnet extends range. Already spec'd in `06`. | Resolved |
| 7 | **Boss respawn after defeat** — Does the boss respawn? At what interval? | Recommend: boss does NOT respawn in V1. 5-minute run ends regardless. Game over or victory at 5:00. | Resolved |
| 8 | **XP value inflation** — Should enemy XP values scale with time? | Recommend: yes, XP value +5% per minute (as defined in `vs_prog.md`). | Resolved |
| 9 | **Obstacle collision rules** — Which entities collide with obstacles? | Recommend: player and enemies collide. Projectiles and pickups pass through. Defined in `vs_colors.md`. | Resolved |

### Technical Details

| # | Missing Detail | Recommendation | Status |
|---|---|---|---|
| 10 | **Canvas resolution / scaling** — HiDPI support? | Recommend: yes, use `devicePixelRatio` for crisp rendering. Add to `01_engine_architecture.md`. | Open |
| 11 | **Save/load state** — Any persistence in V1? | Recommend: no persistence in V1. Each run is fresh. | Resolved |
| 12 | **Performance target** — Min FPS? Max entities? | Recommend: 60 FPS target, 30 FPS minimum acceptable. Max 200 enemies + 500 projectiles + 500 pickups. | Resolved |
| 13 | **Touch controls** — Virtual joystick for mobile? | **Resolved.** Click/tap-to-move IS the touch input — no virtual joystick needed. Touch devices use tap-to-move exclusively. Keyboard overrides tap if pressed mid-path. Fully spec'd in `02_character_spec.md` Prompt 2. | Resolved |

### Content Gaps

| # | Missing Detail | Recommendation | Status |
|---|---|---|---|
| 14 | **Passive stat upgrade descriptions** — Only 5 passives listed | Recommend: acceptable for V1. Expand pool in V2 with armor penetration, cooldown reduction, area increase, etc. | Open |
| 15 | **Weapon unlock order** — Player starts with 1 weapon, how are others unlocked? | Recommend: weapon 2 unlocked at Level 3, weapon 3 unlocked at Level 6 (as defined in `vs_prog.md`). | Resolved |
| 16 | **Boss loot** — Boss guaranteed drops weapon level-up, but does it also drop gold/XP? | Recommend: yes — 50 XP + 20-30 gold + guaranteed weapon level-up. Already spec'd in `vs_prog.md`. | Resolved |
| 17 | **Difficulty notification** — Should the player be warned when difficulty spikes? | Recommend: yes, brief text overlay "Danger increases..." at scaling milestones. Add to `05_stages_spec.md`. | Open |
| 18 | **Screen shake** — Any camera effects on big hits/events? | Recommend: yes, subtle screen shake on: boss spawn, screen wipe, boss death, player low HP warning (<25%). Add to `01_engine_architecture.md`. | Open |

### Recommended Action Items (Post-Spec Creation)

1. **Review each spec file** against the Feature Checklist after creation.
2. **Fill in the gaps** listed above by editing the relevant spec files.
3. **Create all 6 JSON content files** with actual V1 values after specs are finalized.
4. **Build engine systems** in dependency order: GameLoop → EntityManager → InputManager → Camera → Renderer → CollisionSystem → DamageSystem → SpawnSystem → WeaponSystem → PickupSystem → LevelingSystem → UIManager → AudioManager → DataManager.
5. **Playtest balance** — The numbers in specs are initial estimates. Expect tuning during development.

---

## Source of Truth Summary

| Spec Area | Canonical File | Notes |
|---|---|---|
| Architecture & Engine | `vs_plan.md` (this file) | System inventory, prompts, structure |
| Progression & Balance | `vs_prog.md` | XP curve, wave timeline, weapon stats, enemy stats, drop rates |
| Visual Design | `vs_colors.md` | Shapes, colors, sizes, obstacles, background |
| Sound Design | `vs_prog.md` Sound Design Arc | Payout triad, variance engine, all audio specs |
| Testing | `available_tests.md` | Tools, commands, test types |
| JSON Schemas | `10_json_schemas.md` (to be created) | Will reference all above files |

---

## Version Roadmap (Out of Scope for V1)

| Version | Features |
|---|---|
| V2 | 3 stages, 5 characters, 8 weapons, 15 enemies, 3 bosses, gold shop between runs, achievements, save/load |
| V3 | Online leaderboards, daily challenges, enemy editor, mod support via JSON |
| V4 | Sprite pack system, music pack system, full settings menu, accessibility options |

---

*End of vs_plan.md — Version 1*
