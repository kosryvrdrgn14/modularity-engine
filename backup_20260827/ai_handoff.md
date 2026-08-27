# AI Handoff — Modularity Engine

> **Purpose:** This document gives any AI agent the full context to continue work on this project without re-reading every file. Read this first, then the specific files it references.
>
> **Last Updated:** 2026-08-19
> **Project Status:** Planning phase — 0 of 10 spec files created, 0 JSON content files created

---

## What We're Building

**Modularity Engine** is a Vampire Survivors-style auto-attacking survival game. The player moves through an arena while weapons fire automatically. Waves of enemies close in; you collect XP and gold, level up to choose upgrades, and survive for 5 minutes. The game targets a single HTML5 file with no external libraries or assets — all audio is procedural Web Audio API synthesis.

**Design Principles:**
- Engine / Content separation: game logic is TypeScript, all game data lives in JSON files
- Everything is modular — add new weapons, enemies, stages by adding JSON files, not code
- Spec-driven: each system is defined in a markdown spec before implementation
- The prototype proves the core loop works: one stage, one character, three weapons, five enemies, one boss

**Platform:** Freebuff Web (Vite + React + TypeScript + Convex backend)
**Target Output:** Playable game in the browser via the Freebuff web app

---

## File Inventory

### Design Documents (Root Level)

| File | Role | Source of Truth For |
|---|---|---|
| `vs_plan.md` | **Master plan.** Architecture, version scope, all 10 creation prompts, 11 validation test prompts, feature checklist, engine system inventory, missing details log. | Architecture, spec structure, prompts, checklist |
| `vs_prog.md` | **Progression & balance.** XP curve, wave timeline, weapon stats (all 7 levels), enemy stats, drop rates, weapon power spikes, boss encounter, sound design arc, balance targets, fun factor checklist. | ALL gameplay numbers, ALL balance values, ALL audio specs |
| `vs_colors.md` | **Visual spec.** Color palette, shapes/sizes/colors for every entity (player, 5 enemies, boss, 3 weapons, pickups, power-ups, obstacles), damage numbers, map obstacles (5 types with placement rules), background/environment, visual hierarchy rules, z-order draw order. | ALL visual/rendering specs, ALL entity appearance |
| `vs_review.md` | **Project review.** Conflict log (all 7 resolved), missing specs, sync plan, automated testing plan by phase. | Historical record of decisions, testing plan |
| `available_tests.md` | **Testing reference.** Platform environment details, available tools (Playwright, Puppeteer, Bun test), headless browser capabilities, screenshot/testing commands, test type catalog. | How to test, what tools are available |

### Spec Files (Not Yet Created — To Be Generated from Prompts)

These 10 files will be created one at a time from the prompts in `vs_plan.md`:

| # | File | Created From | Sources |
|---|---|---|---|
| 1 | `01_engine_architecture.md` | Prompt 1 | `vs_plan.md` |
| 2 | `02_character_spec.md` | Prompt 2 | `vs_plan.md` + `vs_colors.md` |
| 3 | `03_weapons_spec.md` | Prompt 3 | `vs_prog.md` Weapon Progression |
| 4 | `04_enemies_spec.md` | Prompt 4 | `vs_prog.md` Enemy Spawn Details + Boss Encounter |
| 5 | `05_stages_spec.md` | Prompt 5 | `vs_prog.md` Wave Timeline |
| 6 | `06_pickups_and_powerups_spec.md` | Prompt 6 | `vs_prog.md` Drop Economy |
| 7 | `07_leveling_system_spec.md` | Prompt 7 | `vs_prog.md` Experience Curve |
| 8 | `08_ui_hud_spec.md` | Prompt 8 | `vs_plan.md` + `vs_colors.md` |
| 9 | `09_audio_spec.md` | Prompt 9 | `vs_prog.md` Sound Design Arc |
| 10 | `10_json_schemas.md` | Prompt 10 | All specs combined |

### Content Files (Not Yet Created — After All Specs Exist)

| File | Source |
|---|---|
| `content/characters.json` | `02_character_spec.md` + `vs_colors.md` |
| `content/weapons.json` | `03_weapons_spec.md` + `vs_colors.md` |
| `content/enemies.json` | `04_enemies_spec.md` + `vs_colors.md` |
| `content/stages.json` | `05_stages_spec.md` |
| `content/pickups.json` | `06_pickups_and_powerups_spec.md` + `vs_colors.md` |
| `content/leveling.json` | `07_leveling_system_spec.md` |

---

## Source of Truth Hierarchy

This is the most important section. When numbers conflict between files, the higher-ranked file wins.

```
1. vs_prog.md       → ALL gameplay numbers (XP, weapons, enemies, drops, waves, boss, audio)
2. vs_colors.md     → ALL visual specs (shapes, colors, sizes, obstacles, background)
3. vs_plan.md       → Architecture, spec structure, prompts, feature checklist
4. Spec files (01-10) → Derived from above — must not invent values, always reference source
5. JSON content files → Generated from spec files — must match spec values exactly
```

**Key rule:** Prompts in `vs_plan.md` define the *structure* of each spec file. `vs_prog.md` provides the *numbers*. `vs_colors.md` provides the *visuals*. The AI generating spec files must copy exact values from the source-of-truth files, never approximate or invent.

---

## Production Workflow

### Phase 1: Create Spec Files (Current Phase)

**Process for each spec file:**

```
1. User says: "create spec #N"
2. AI reads the corresponding Prompt N from vs_plan.md
3. AI reads vs_prog.md and/or vs_colors.md for the relevant numbers/visuals
4. AI generates the spec file (e.g., 01_engine_architecture.md)
5. User says: "run test #N"
6. AI reads the generated spec file and validates it against the test prompt
7. If PASS → move to next spec
8. If FAIL → fix the spec and re-run test
```

**Order matters.** Spec 1 (engine architecture) is referenced by all others. Spec 10 (JSON schemas) references all others. Create in order 1→10.

**After all 10 specs:** Run Test 11 (cross-spec integration) to catch cross-file inconsistencies.

### Phase 2: Create JSON Content Files

After all specs pass validation, generate the 6 JSON content files from the specs.

### Phase 3: Build Engine

Build the game engine in TypeScript, consuming the JSON content files. Engine systems built in dependency order:

```
GameLoop → EntityManager → InputManager → Camera → Renderer →
CollisionSystem → DamageSystem → SpawnSystem → WeaponSystem →
PickupSystem → LevelingSystem → UIManager → AudioManager → DataManager
```

---

## Critical Values (Quick Reference)

These values appear across multiple files and MUST be consistent everywhere:

| Value | Amount | Where Defined |
|---|---|---|
| Game duration | 5 minutes | `vs_prog.md` |
| Boss spawn | 4:00 | `vs_prog.md` Boss Encounter |
| Player max HP | 100 | `vs_prog.md` Character Stats |
| Player speed | 200 px/s | `vs_prog.md` Character Stats |
| XP L1→2 | 5 XP | `vs_prog.md` Experience Curve |
| XP formula (L14+) | `floor(375 × 1.3^(N-14))` | `vs_prog.md` Experience Curve |
| Pickup range | 50 px | `vs_prog.md` Character Stats |
| Magnet radius | 350 px | `vs_prog.md` Drop Economy |
| Magnet instant burst | 150 px | `vs_prog.md` Drop Economy |
| Projectile lifetime | 3s or 600px | `vs_plan.md` Prompt 1 |
| Max enemies | 200 | `vs_plan.md` Prompt 1 |
| Difficulty scaling | +15% HP, +10% DMG/min | `vs_prog.md` (post-boss only) |
| End states | 3 (Victory/Survived/Defeat) | `vs_plan.md` Prompt 1 |
| Obstacles | 5 types, included in V1 | `vs_colors.md` |
| Input | Click/tap-to-move (primary), WASD (secondary) | `vs_plan.md` |
| Weapon unlocks | W2 at Lv.3, W3 at Lv.6 | `vs_prog.md` Weapon Progression |
| Boss HP | 1,000 | `vs_prog.md` Boss Encounter |
| Boss contact DMG | 15 | `vs_prog.md` Boss Encounter |

---

## Known Tool Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| **Web search is unreliable** | Cannot look up external references during session | All external research has been pre-loaded into design docs (casino audio research, Web Audio API specs). The Gemini handoff on payout triad audio design is embedded in `vs_prog.md` Sound Design Arc section. |
| **No display server** | Chrome runs headless only | Visual testing uses screenshots + pixel color extraction, not live preview |
| **No audio output** | Cannot hear actual sound playback | Audio testing validates Web Audio API logic (oscillator config, frequency values, timing) not actual sound |
| **No GPU acceleration** | Software rendering only | Canvas performance testing may differ slightly from real hardware |
| **Freebuff session limits** | Sessions expire, work must be picked up next session | This handoff document exists so any AI can resume context |

---

## Previous Conflicts (All Resolved)

These were found during the planning phase and are now resolved. Do not re-introduce them.

| # | Conflict | Resolution |
|---|---|---|
| 1 | XP curve had two versions (10 XP vs 5 XP at L1→2) | `vs_prog.md` is canonical. Prompt 7 updated. |
| 2 | Boss spawned at minute 10 in some places | Boss spawns at minute 4 everywhere. All prompts updated. |
| 3 | Wave timeline had wrong duration (10 min vs 5 min) | 5-minute timeline from `vs_prog.md`. Prompt 5 rewritten. |
| 4 | Obstacles were excluded from V1 | Obstacles are included. 5 types defined in `vs_colors.md`. |
| 5 | Sound design had overlapping specs | `vs_prog.md` Sound Design Arc is canonical. Prompt 9 rewritten. |
| 6 | Visual spec was not located in one place | `vs_colors.md` is the single visual source. |
| 7 | Touch controls were "deferred to V2" | Click/tap-to-move IS the primary touch input. No virtual joystick. |

---

## Context Recovery Checklist

If you lose context mid-session or a new AI picks up this project:

1. Read `ai_handoff.md` (this file) — understand the project structure and workflow
2. Read `vs_plan.md` — understand the architecture, read the prompts and test prompts
3. Read `vs_prog.md` — this is the source of truth for ALL gameplay numbers
4. Read `vs_colors.md` — this is the source of truth for ALL visuals
5. Check `vs_review.md` — see what conflicts existed and how they were resolved
6. Check `available_tests.md` — understand what testing tools are available
7. Check which spec files exist on disk (`ls *.md`) — determine current progress
8. Resume from where the previous session left off

---

## Session History

| Session | What Happened |
|---|---|
| Session 1 | Created `vs_plan.md` (master design plan), `vs_prog.md` (progression/balance), `vs_colors.md` (visual spec) |
| Session 2 | Created `vs_review.md` (full project review, conflict resolution), `available_tests.md` (testing reference). Resolved all 7 conflicts. Added click/tap-to-move requirement. |
| Session 3 | Synced all 10 creation prompts in `vs_plan.md` against `vs_prog.md` — fixed 10 critical errors (wrong boss times, wrong XP values, wrong wave timeline, missing features). Added 11 validation test prompts. Verified all cross-references are consistent. |
| Session 4 | Created this `ai_handoff.md` document. Planning phase complete — ready to begin spec file creation. |

**Next step:** User says "create spec #1" → generate `01_engine_architecture.md` from Prompt 1, then "run test #1" to validate.

---

*End of ai_handoff.md*
