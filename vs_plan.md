# Vampire Survivors Type Game — Master Design Plan

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-19
> **Status:** Planning

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Principles](#architecture-principles)
3. [Version 1 Scope](#version-1-scope)
4. [Required Markdown Spec Files](#required-markdown-spec-files)
5. [JSON Content Files](#json-content-files)
6. [Spec File Creation Prompts](#spec-file-creation-prompts)
7. [Engine Core Systems](#engine-core-systems)
8. [Feature Checklist](#feature-checklist)
9. [Missing Details & Recommended Actions](#missing-details--recommended-actions)

---

## Project Overview

A top-down, auto-attacking survival game inspired by Vampire Survivors. The player controls a character who moves through a stage while weapons fire automatically. Waves of enemies approach; the player collects EXP and gold from defeated enemies, levels up to choose weapon upgrades, and survives as long as possible. The game ends when the player's health reaches zero.

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
- Every game entity is defined by data, not hardcoded logic.
- Adding a new weapon, enemy, stage, or character = adding a JSON file and ensuring the engine has a compatible behavior type.
- Systems (spawning, leveling, damage) are generic and driven by data.

### 3. Spec-Driven Development
- Each markdown spec file is a **self-contained reference** for one domain.
- Specs are written so that any contributor (or AI assistant) can re-establish context by reading the relevant file.
- Specs include data schemas, gameplay formulas, and explicit values — no ambiguity.

---

## Version 1 Scope

**Goal:** A playable prototype proving the core loop works.

| Feature | Detail |
|---|---|
| Stage | 1 stage (infinite scrolling arena with timed waves) |
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
| Sounds | Basic: hit, kill, pickup, level-up, boss spawn, screen wipe, UI click |
| UI / HUD | Health bar, EXP bar, level number, gold counter, weapon icons with levels, timer |
| Polish | Clean modern UI theme, smooth animations, readable at a glance |

---

## Required Markdown Spec Files

Each file below must be created **one at a time** using the prompts in [Spec File Creation Prompts](#spec-file-creation-prompts).

| # | File Name | Purpose |
|---|---|---|
| 1 | `01_engine_architecture.md` | Game loop structure, entity-component approach, rendering pipeline, collision system, data loading flow, scene/state management |
| 2 | `02_character_spec.md` | Playable character stats, movement, hitbox, invincibility frames, death condition |
| 3 | `03_weapons_spec.md` | 3 weapons: name, description, base stats, behavior, upgrade table (levels 1–7), power spike bonuses at L4 and L7, targeting logic |
| 4 | `04_enemies_spec.md` | 5 enemy types + 1 boss: name, HP, speed, damage, size, behavior pattern, spawn weight, drop table (EXP amount, gold amount, power-up chance) |
| 5 | `05_stages_spec.md` | Stage definition: name, size, background, spawn zones, wave timeline (enemy composition over time), difficulty scaling formula |
| 6 | `06_pickups_and_powerups_spec.md` | EXP gem tiers, gold coin values, screen wipe mechanic, magnet mechanic, weapon level-up drop logic, drop rate tables |
| 7 | `07_leveling_system_spec.md` | XP curve formula, level-up screen behavior, upgrade pool rules (weapon new / weapon upgrade / passive), UI flow |
| 8 | `08_ui_hud_spec.md` | HUD layout (positions, sizes), health bar design, EXP bar, gold display, weapon panel, level-up selection screen, game-over screen, pause menu |
| 9 | `09_audio_spec.md` | Sound categories, required sound list per event, volume levels, priority/fallback rules |
| 10 | `10_json_schemas.md` | JSON schema for every content file: characters, weapons, enemies, stages, pickups. Field names, types, defaults, examples |

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

---

### Prompt 1 — Create `01_engine_architecture.md`

```
Create the file 01_engine_architecture.md for a Vampire Survivors type game.

This spec defines the core engine architecture. It must cover:

1. GAME LOOP — Fixed-timestep update loop (target 60 FPS). Separate update() and render() phases. Define the order of systems each frame: input → movement → auto-attack → collision → entity cleanup → spawn → pickup collection → UI update → render.

2. ENTITY SYSTEM — Describe how entities (player, enemies, weapons, projectiles, pickups) are represented. Each entity has: id, type, position (x,y), velocity, hitbox, stats object, and a behavior reference. Entities are stored in typed arrays or a simple pool for performance.

3. COLLISION SYSTEM — Axis-aligned bounding box (AABB) checks. Collision layers: player-damageable (enemies hit player), enemy-damageable (projectiles hit enemies), pickup-collectable (player touches pickups). Define collision response: damage application, knockback, pickup collection, power-up trigger.

4. RENDERING — Canvas-based 2D rendering. Camera follows player with smooth lerp. Draw order: background → entities (sorted by y for depth) → projectiles → pickups → UI overlay. Define how sprites/animations are referenced (sprite sheet + frame data).

5. DATA LOADING — On stage start, engine loads the relevant JSON content files (character, weapons, enemies for stage, pickups). Validate data on load. Hot-reload support for development.

6. SCENE / STATE MANAGEMENT — Scenes: Menu → Character Select (V1: skip, auto-select) → Stage → Pause → Level-Up Overlay → Game Over. State machine with clear transitions.

7. DAMAGE SYSTEM — Damage = attacker.damage - defender.defense (minimum 1). Critical hit chance as a stat. Knockback force based on damage dealt. Invincibility frames after taking damage (0.5s default).

8. PERFORMANCE NOTES — Object pooling for projectiles and enemies. Spatial hashing for collision broadphase if entity count exceeds 200. Cap simultaneous projectiles and enemies.

Include ASCII diagrams where helpful. Be specific with formulas and numbers where V1 values are known. Reference other spec files where details live (e.g., "see 03_weapons_spec.md for weapon stats").
```

---

### Prompt 2 — Create `02_character_spec.md`

```
Create the file 02_character_spec.md for a Vampire Survivors type game.

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

3. MOVEMENT — 8-directional movement using WASD or arrow keys. Diagonal normalization so diagonal speed = cardinal speed.

4. HITBOX — Circular, radius 12px. Visual sprite is larger for readability.

5. INVINCIBILITY FRAMES — After taking damage, invulnerable for 0.5 seconds. Visual: sprite flashes/blinks at 100ms intervals.

6. DEATH CONDITION — When health ≤ 0. Trigger game-over screen. Display: time survived, enemies killed, gold collected, level reached.

7. VISUAL — Describe the character's appearance concept for an artist/AI art generator. Top-down perspective, readable silhouette, distinct from enemies.
```

---

### Prompt 3 — Create `03_weapons_spec.md`

```
Create the file 03_weapons_spec.md for a Vampire Survivors type game.

This spec defines 3 weapons. Each weapon auto-fires without player input.

For EACH weapon, define:

1. IDENTITY — Name, description, icon concept.

2. BEHAVIOR TYPE — One of:
   - Projectile (fires in a direction, travels until hit or timeout)
   - Orbit (circles the player)
   - Area (instant effect around player)

3. BASE STATS (Level 1):
   - Damage
   - Cooldown (seconds between attacks)
   - Area / Size (hitbox radius or projectile size)
   - Speed (projectile speed, or orbit speed)
   - Duration (for orbit/area weapons)
   - Knockback force
   - Projectile count (how many projectiles per attack)

4. TARGETING LOGIC:
   - Projectile: fires toward nearest enemy
   - Orbit: always active, damages on contact
   - Area: pulses around player on cooldown

5. UPGRADE TABLE — Full table from Level 1 to Level 7 with these columns per level:
   | Level | Damage | Cooldown | Area | Speed | Duration | Knockback | Projectiles | Notes |
   
   Scaling rules:
   - Damage: +15-25% per level
   - Cooldown: -5-10% per level (faster)
   - Area: +10-20% per level
   - Projectiles: +1 at specific levels

6. POWER SPIKES:
   - Level 4 (Mid Spike): Describe the significant bonus unlocked. Example: "Pierces through 1 additional enemy" or "Attacks in a wider arc" — make each weapon's L4 spike unique.
   - Level 7 (Max / Ultimate): Describe the ultimate bonus. Example: "Projectiles leave fire trails" or "Orbit speed doubles and leaves damaging afterimages" — make each weapon's L7 spike dramatic and visually distinct.

7. WEAPON 1 SPEC (example: Projectile type)
8. WEAPON 2 SPEC (example: Orbit type)  
9. WEAPON 3 SPEC (example: Area type)

Ensure all three weapons feel mechanically distinct and cover different playstyles (single-target burst, crowd control, area denial).
```

---

### Prompt 4 — Create `04_enemies_spec.md`

```
Create the file 04_enemies_spec.md for a Vampire Survivors type game.

This spec defines 5 standard enemy types and 1 boss.

For EACH enemy, define:

1. IDENTITY — Name, description, visual concept (color, shape, size for readability).

2. STATS TABLE:
   | Stat | Value |
   |---|---|
   | HP | |
   | Damage (contact) | |
   | Speed | |
   | Size (radius) | |
   | XP Value | (amount of XP dropped on death) |
   | Gold Value | (amount of gold dropped on death) |
   | Spawn Weight | (relative probability in spawn pool) |

3. BEHAVIOR — Movement pattern:
   - Chase: moves directly toward player
   - Wander: moves in random directions, occasionally toward player
   - Swarm: fast but low HP, spawns in groups
   - Tank: slow, high HP, high damage
   - Ranged: keeps distance, fires projectiles at player (V1: simple)

4. DROP TABLE:
   - Base drops: always drops XP + gold (amounts from stats)
   - Power-up drop chance: base 0% (most enemies don't drop power-ups)
   - Special drop enemies: Mark which enemy types CAN drop power-ups and at what chance

5. SPAWN BEHAVIOR:
   - How they enter the stage (from edges? from spawn points?)
   - Any formation or grouping rules

ENEMY ROSTER (V1):

- Enemy 1: Basic zombie-type (chase, low HP, lowest XP) — Fodder
- Enemy 2: Fast bat-type (swarm, very low HP, fast) — Pressure
- Enemy 3: Armored skeleton (tank, medium HP, slow) — Obstacle
- Enemy 4: Ghost (wander → chase, medium HP, phases through nothing special in V1) — Trick
- Enemy 5: Ranged caster (ranged, low HP, fires slow projectiles) — Disruptor

BOSS:
- Boss 1:定义 at minute 10 (or configurable). High HP, high damage, unique attack pattern. Drops large XP cache + guaranteed rare power-up.
- Include: name, stats, attack phases (V1: 1-2 phases), visual concept, spawn announcement.
```

---

### Prompt 5 — Create `05_stages_spec.md`

```
Create the file 05_stages_spec.md for a Vampire Survivors type game.

This spec defines 1 stage for V1.

Must include:

1. STAGE IDENTITY — Name, theme, visual description, background color/pattern.

2. DIMENSIONS — Stage size (or infinite with procedural wrapping). For V1: infinite arena with camera following player. No bounds.

3. SPAWN RULES:
   - Enemies spawn from off-screen edges at a minimum distance from the player (e.g., 400-600 px away).
   - Maximum simultaneous enemies on screen: 200 (cap).
   - Spawn rate increases over time.

4. WAVE TIMELINE — Define enemy composition over time:

   | Time (min:sec) | Enemy Types Active | Spawn Rate (per second) | Notes |
   |---|---|---|---|
   | 0:00 - 1:00 | Enemy 1 only | 0.5 | Tutorial pace |
   | 1:00 - 3:00 | Enemy 1, 2 | 1.0 | Bats introduced |
   | 3:00 - 5:00 | Enemy 1, 2, 3 | 1.5 | Skeletons arrive |
   | 5:00 - 7:00 | Enemy 1, 2, 3, 4 | 2.0 | Ghosts phase in |
   | 7:00 - 9:00 | Enemy 1, 2, 3, 4, 5 | 2.5 | Full roster |
   | 9:00 - 10:00 | All + increasing rate | 3.0 | Pre-boss tension |
   | 10:00 | BOSS SPAWNS | — | Boss entrance |
   | 10:00+ | All + boss | 3.0+ | Post-boss: endless |

5. DIFFICULTY SCALING — After boss defeat, enemy stats scale: +5% HP and damage per minute. Spawn rate caps at 5.0/s.

6. PICKUP SPAWN — No pickups spawn independently; all drops come from enemy kills. (Or define if environmental pickups exist.)

7. BACKGROUND/ENVIRONMENT — Simple tiled ground pattern. No obstacles in V1 (pure open arena). Visual theme: dark gothic / cemetery.

8. STAGE EVENT MARKERS — Define at which timestamps special events occur (boss spawn warning, difficulty spikes).
```

---

### Prompt 6 — Create `06_pickups_and_powerups_spec.md`

```
Create the file 06_pickups_and_powerups_spec.md for a Vampire Survivors type game.

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
   - Effect: Instantly kills ALL enemies currently on screen. Deals boss 50% max HP.
   - Visual: bright white flash expanding outward from player
   - Sound: dramatic whoosh/boom
   - Drop source: Only from Enemy type 3 (Armored Skeleton) and Enemy type 5 (Ranged Caster)
   - Drop chance: 2% per kill (low)
   - Display: collectible item with skull/lightning icon, pulses on ground

5. MAGNET (EXP & Gold):
   - Effect: For 10 seconds, all EXP gems and gold coins within 300px radius are attracted to the player at 400 px/s. New pickups spawned during duration are also affected.
   - Visual: magnetic field ripple effect around player during duration
   - Sound: magnetic hum
   - Drop source: From Enemy type 2 (Fast Bat) and Enemy type 4 (Ghost)
   - Drop chance: 5% per kill (moderate — "a little more frequently" than screen wipe)
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
Create the file 07_leveling_system_spec.md for a Vampire Survivors type game.

This spec defines the EXP/leveling system and level-up choice flow.

SECTION 1: XP CURVE

Total XP required to reach each level:

| Level | XP Required (cumulative) | XP to Next Level |
|---|---|---|
| 1 → 2 | 10 | 10 |
| 2 → 3 | 25 | 15 |
| 3 → 4 | 50 | 25 |
| 4 → 5 | 90 | 40 |
| 5 → 6 | 150 | 60 |
| 6 → 7 | 240 | 90 |
| 7 → 8 | 370 | 130 |
| 8 → 9 | 550 | 180 |
| 9 → 10 | 800 | 250 |
| 10+ | Formula: next = prev * 1.35 | — |

Formula for level N (N ≥ 10): `xp_to_next(N) = floor(250 * 1.35^(N-10))`

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

B) PASSIVE STAT BOOSTS (V1 minimal set):
   - Max Health +20%
   - Movement Speed +10%
   - Armor +1
   - Pickup Range +25px
   - Crit Chance +5%

Option generation:
1. Roll 3 options from the combined pool (weapon upgrades + passives)
2. Weight: weapon upgrades 60%, passives 40%
3. No duplicate options in a single level-up screen
4. If a weapon is at max level (7), it is excluded from the pool
5. If only passives are available (all weapons maxed), show 3 random passives

SECTION 4: VISUAL DESIGN
- Level-up screen: 3 cards in a row, each with icon top, text middle, stat change bottom
- Hover/selected card elevates with shadow
- Confetti or particle effect on selection
- Current weapon levels shown at top of screen for reference
```

---

### Prompt 8 — Create `08_ui_hud_spec.md`

```
Create the file 08_ui_hud_spec.md for a Vampire Survivors type game.

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

6. TIMER — Top-center. Shows elapsed time: "MM:SS". Boss spawns at 10:00.

SECTION 2: LEVEL-UP SCREEN

- Semi-transparent dark overlay
- Title: "LEVEL UP!" in large text with glow
- 3 upgrade cards centered horizontally
- Each card (200x280px): icon (top), weapon/upgrade name, "Lv.2 → Lv.3" text, description of change
- Cards have subtle entrance animation (scale up from 0.8)
- Selected card has blue glow border
- Keyboard shortcuts: 1, 2, 3 to quick-select

SECTION 3: GAME OVER SCREEN

- Dark overlay with red tint
- Title: "GAME OVER"
- Stats summary:
  - Time Survived: MM:SS
  - Enemies Killed: #
  - Gold Collected: #
  - Level Reached: #
  - Damage Dealt: #
- Buttons: "Restart" (primary), "Main Menu" (secondary)
- Fade in over 0.5s

SECTION 4: PAUSE MENU (press Escape)

- Semi-transparent overlay
- Title: "PAUSED"
- Buttons: "Resume", "Restart", "Quit to Menu"
- Game fully pauses behind overlay

SECTION 5: MINI UI ELEMENTS

- Damage numbers: float up from hit enemies, color-coded (white normal, yellow crit, red player damage taken)
- Kill count: small "+1" that fades at enemy death position
- Gold pickup: "+3g" floating text near pickup
- Boss health bar: large bar at top of screen during boss fight, with boss name

SECTION 6: RESPONSIVE LAYOUT
- HUD scales based on screen size
- Minimum supported: 800x600
- Touch-friendly tap targets for mobile (minimum 44x44px)
```

---

### Prompt 9 — Create `09_audio_spec.md`

```
Create the file 09_audio_spec.md for a Vampire Survivors type game.

This spec defines the audio design for V1.

SECTION 1: AUDIO ARCHITECTURE
- Use Web Audio API or Howler.js (confirm which in implementation)
- Audio channels: SFX (multiple concurrent), Music (1 track), UI (1 concurrent)
- Max simultaneous sounds: 16 (older sounds ducked/forged when exceeded)
- Volume controls: Master, SFX, Music (V1: fixed defaults, no settings UI)

SECTION 2: REQUIRED SOUNDS

SFX CHANNEL:
| ID | Sound Name | Trigger | Notes |
|---|---|---|---|
| sfx_hit | Weapon hit impact | Projectile/enemy collision | Short, punchy. 3-5 variants for variety |
| sfx_kill | Enemy death | Enemy HP reaches 0 | Satisfying pop/crumble. 3 variants |
| sfx_pickup_xp | EXP gem collected | Player touches EXP gem | Quick chime, pitch scales with gem size |
| sfx_pickup_gold | Gold coin collected | Player touches gold | Clink sound. Batched if multiple collected quickly |
| sfx_level_up | Player levels up | XP threshold reached | Ascending fanfare, 1-2 seconds |
| sfx_powerup_collect | Power-up item collected | Player touches power-up | Bright, rewarding sound |
| sfx_screen_wipe | Screen wipe activated | Screen wipe power-up triggered | Dramatic whoosh/boom, 2-3 seconds |
| sfx_boss_spawn | Boss appears | Boss spawns at 10:00 | Ominous, low rumble + scream |
| sfx_boss_death | Boss defeated | Boss HP reaches 0 | Epic, satisfying, 2-3 seconds |
| sfx_player_hurt | Player takes damage | Player collision with enemy/projectile | Quick impact + vocal grunt |
| sfx_player_death | Player dies | HP reaches 0 | Dramatic, slow |
| sfx_weapon_fire | Weapon fires | Weapon cooldown completes | Per-weapon: projectile (whoosh), orbit (hum), area (pulse) |
| sfx_ui_click | UI button clicked | Menu interaction | Short click/tap |

MUSIC CHANNEL:
| ID | Track Name | When |
|---|---|---|
| music_stage | Stage Theme | During gameplay. Loop. Upbeat, dark, driving rhythm |
| music_boss | Boss Theme | During boss fight. Replaces stage theme. More intense |
| music_menu | Menu Theme | Title/pause screens. Calmer, atmospheric |
| music_gameover | Game Over | Short, melancholic (5-10 seconds, no loop) |

SECTION 3: AUDIO PRIORITIES
- When > 16 sounds playing: prioritize player sounds > weapon sounds > enemy sounds
- Distance-based volume: sounds from enemies/pickups quieter if far from player
- Low-pass filter on all audio when paused

SECTION 4: IMPLEMENTATION NOTES
- V1: Use royalty-free sound generators or synthesized sounds (Web Audio API oscillators)
- No external audio assets required for V1 — generate procedurally or use simple waveforms
- Document recommended free sound resources if procedural is insufficient
```

---

### Prompt 10 — Create `10_json_schemas.md`

```
Create the file 10_json_schemas.md for a Vampire Survivors type game.

This spec defines the JSON schema for every content file the engine loads. Each schema must include: field name, type, required/optional, default value, description, and a complete V1 example.

Define schemas for:

1. CHARACTERS.JSON — Single character definition
   - id, name, description, stats (maxHealth, moveSpeed, armor, pickupRange, magnetRange, critChance, critMultiplier), startingWeapon (weapon id), visual (sprite, size, color)

2. WEAPONS.JSON — Array of weapon definitions
   - id, name, description, type (projectile/orbit/area), targeting (nearest/random), stats per level (damage, cooldown, area, speed, duration, knockback, projectiles), powerSpikes (level 4 and 7 bonuses with description and stat modifiers)

3. ENEMIES.JSON — Array of enemy + boss definitions
   - id, name, type (normal/boss), stats (hp, damage, speed, size, xpValue, goldValue), behavior (pattern, additional params), drops (xpRange, goldRange, powerUpTable [{type, chance}]), spawn (weight, formations)

4. STAGES.JSON — Array of stage definitions
   - id, name, theme, background, spawnConfig (minDistance, maxEnemies, baseSpawnRate), waves [{time, enemies [{id, weight}], spawnRate}], difficultyScaling ({hpMultiplierPerMinute, damageMultiplierPerMinute, spawnRateCap}), bossConfig ({enemyId, spawnTime})

5. PICKUPS.JSON — Array of pickup definitions
   - id, name, type (exp_small/exp_large/gold/screen_wipe/magnet/weapon_levelup), value, visual, behavior (duration, range, radius), dropConfig (sources [{enemyId, chance}], guaranteedDropEnemies)

6. LEVELING.JSON — Leveling configuration
   - xpCurve [{level, totalXp, xpToNext}], formula for 10+, upgradePool (weaponWeight, passiveWeight), passiveOptions [{id, name, stat, value, description}]

Include type annotations (TypeScript-style) alongside the JSON examples for clarity.
```

---

## Engine Core Systems

The engine is built in TypeScript. Below is the system inventory (no spec file needed — built directly).

| System | Responsibility |
|---|---|
| `GameLoop` | Fixed-timestep update/render cycle |
| `EntityManager` | Create, destroy, pool, iterate entities |
| `InputManager` | WASD/arrow key + touch input capture |
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

- [ ] 1 stage defined with wave timeline and difficulty scaling
- [ ] 1 character with base stats and movement
- [ ] 3 weapons with distinct mechanics (projectile, orbit, area)
- [ ] Each weapon has full upgrade table (Levels 1–7)
- [ ] Power spike at Level 4 defined per weapon
- [ ] Power spike at Level 7 (max) defined per weapon
- [ ] 5 enemy types with distinct behaviors
- [ ] 1 boss with spawn time, stats, and attack pattern
- [ ] EXP gems (small + large) with values
- [ ] Gold coins with value range
- [ ] Screen wipe power-up: effect, drop source, drop chance (2%)
- [ ] Magnet power-up: effect, duration, drop source, drop chance (5%)
- [ ] Weapon level-up drop: effect, drop chance (1% base, 100% boss)
- [ ] Weapon level-up drop randomly levels 1–3 weapons
- [ ] Leveling system with XP curve
- [ ] Level-up screen with 3 random choices
- [ ] Upgrade pool: weapon upgrades + passive stats
- [ ] HUD: health bar, EXP bar, level, gold, weapon levels, timer
- [ ] Game-over screen with stats
- [ ] Pause menu
- [ ] Boss health bar
- [ ] Damage numbers (floating text)
- [ ] Basic sounds: hit, kill, pickup, level-up, boss spawn, screen wipe, UI click
- [ ] Music: stage theme, boss theme
- [ ] JSON schemas for all content files
- [ ] All 6 JSON content files spec'd

---

## Missing Details & Recommended Actions

The following items are **not yet resolved** in V1 and should be addressed during implementation:

### Gameplay Details

| # | Missing Detail | Recommendation |
|---|---|---|
| 1 | **Player knockback when hit** — Does the player get pushed back on damage? | Recommend: yes, small knockback away from source. Add to `02_character_spec.md` during review. |
| 2 | **Projectile collision with walls** — V1 has no walls, but what about future stages? | Recommend: no wall collision V1. Document in `01_engine_architecture.md` as a future consideration. |
| 3 | **Critical hit display** — How are crits visually communicated? | Recommend: yellow damage numbers + screen shake micro. Add to `08_ui_hud_spec.md`. |
| 4 | **Weapon projectile lifetime** — Do projectiles despawn after distance/time? | Recommend: yes, 3-second lifetime or 600px max distance. Add to `03_weapons_spec.md`. |
| 5 | **Gold spending** — Is gold used for anything in V1? | Recommend: no. Gold is a score metric only in V1. Note for V2 (shop/upgrade between runs). |
| 6 | **Item pickup magnet auto-collect** — Do pickups auto-collect or require walking over? | Recommend: both — base pickup range for walk-over, magnet extends range. Already spec'd in `06`. |
| 7 | **Boss respawn after defeat** — Does the boss respawn? At what interval? | Recommend: boss respawns every 5 minutes after first defeat with +25% stats each time. Add to `05_stages_spec.md`. |
| 8 | **XP value inflation** — Should enemy XP values scale with time? | Recommend: yes, XP value +10% per minute. Add to `04_enemies_spec.md`. |

### Technical Details

| # | Missing Detail | Recommendation |
|---|---|---|
| 9 | **Canvas resolution / scaling** — HiDPI support? | Recommend: yes, use `devicePixelRatio` for crisp rendering. Add to `01_engine_architecture.md`. |
| 10 | **Save/load state** — Any persistence in V1? | Recommend: no persistence in V1. Each run is fresh. |
| 11 | **Performance target** — Min FPS? Max entities? | Recommend: 60 FPS target, 30 FPS minimum acceptable. Max 200 enemies + 500 projectiles + 500 pickups. |
| 12 | **Touch controls** — Virtual joystick for mobile? | Recommend: defer to V2. V1 is keyboard only. Note in `02_character_spec.md`. |

### Content Gaps

| # | Missing Detail | Recommendation |
|---|---|---|
| 13 | **Passive stat upgrade descriptions** — Only 5 passives listed | Recommend: acceptable for V1. Expand pool in V2 with armor penetration, cooldown reduction, area increase, etc. |
| 14 | **Weapon unlock order** — Player starts with 1 weapon, how are others unlocked? | Recommend: weapon 2 unlocked at Level 3, weapon 3 unlocked at Level 5. Alternatively, only via level-up choices. Decide and add to `07_leveling_system_spec.md`. |
| 15 | **Boss loot** — Boss guaranteed drops weapon level-up, but does it also drop gold/XP? | Recommend: yes — 50 XP + 20-30 gold + guaranteed weapon level-up. Already spec'd in `06`. |
| 16 | **Difficulty notification** — Should the player be warned when difficulty spikes? | Recommend: yes, brief text overlay "Danger increases..." at scaling milestones. Add to `05_stages_spec.md`. |
| 17 | **Screen shake** — Any camera effects on big hits/events? | Recommend: yes, subtle screen shake on: boss spawn, screen wipe, boss death, player low HP warning (<25%). Add to `01_engine_architecture.md`. |

### Recommended Action Items (Post-Spec Creation)

1. **Review each spec file** against the Feature Checklist after creation.
2. **Fill in the gaps** listed above by editing the relevant spec files.
3. **Create all 6 JSON content files** with actual V1 values after specs are finalized.
4. **Build engine systems** in dependency order: GameLoop → EntityManager → InputManager → Camera → Renderer → CollisionSystem → DamageSystem → SpawnSystem → WeaponSystem → PickupSystem → LevelingSystem → UIManager → AudioManager → DataManager.
5. **Playtest balance** — The numbers in specs are initial estimates. Expect tuning during development.

---

## Version Roadmap (Out of Scope for V1)

| Version | Features |
|---|---|
| V2 | 3 stages, 5 characters, 8 weapons, 15 enemies, 3 bosses, gold shop between runs, achievements, save/load |
| V3 | Online leaderboards, daily challenges, enemy editor, mod support via JSON |
| V4 | Sprite pack system, music pack system, full settings menu, accessibility options |

---

*End of vs_plan.md — Version 1*
