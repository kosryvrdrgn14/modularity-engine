# Modularity Engine — Full Project Review

> **Version:** 1.0
> **Last Updated:** 2026-08-19
> **Reviewed Files:** `vs_plan.md`, `vs_prog.md`, `vs_colors.md`, `available_tests.md`

---

## Table of Contents

1. [File Inventory](#file-inventory)
2. [Red Flags](#red-flags)
3. [Conflicts Found](#conflicts-found)
4. [Missing Specs](#missing-specs)
5. [Sync Plan](#sync-plan)
6. [Automated Testing by Phase](#automated-testing-by-phase)
7. [Recommended Actions](#recommended-actions)

---

## File Inventory

| File | Lines | Purpose | Status |
|---|---|---|---|
| `vs_plan.md` | 762 | Master design plan, architecture, prompts for 10 spec files | ✅ Complete |
| `vs_prog.md` | 961 | Stage 1 progression, balance, sound design | ✅ Complete |
| `vs_colors.md` | 495 | Visual spec: shapes, colors, obstacles | ✅ Complete |
| `available_tests.md` | 666 | Testing tools and automation reference | ✅ Complete |
| `01_engine_architecture.md` | — | Game loop, entity system, collision | ❌ Not created |
| `02_character_spec.md` | — | Player stats, movement | ❌ Not created |
| `03_weapons_spec.md` | — | 3 weapons, upgrade tables | ❌ Not created |
| `04_enemies_spec.md` | — | 5 enemies + boss | ❌ Not created |
| `05_stages_spec.md` | — | Stage layout, waves | ❌ Not created |
| `06_pickups_and_powerups_spec.md` | — | Pickups, power-ups | ❌ Not created |
| `07_leveling_system_spec.md` | — | XP curve, level-up flow | ❌ Not created |
| `08_ui_hud_spec.md` | — | HUD layout, screens | ❌ Not created |
| `09_audio_spec.md` | — | Sound categories | ❌ Not created |
| `10_json_schemas.md` | — | JSON schemas | ❌ Not created |
| `content/*.json` | — | Game data files | ❌ Not created |

---

## Red Flags

### 🔴 CRITICAL: XP Curve Conflict

**Problem:** Two different XP curves exist in the project.

| Source | Level 1→2 | Level 2→3 | Formula (high levels) |
|---|---|---|---|
| `vs_plan.md` | 10 XP | 15 XP | `floor(250 × 1.35^(N-10))` |
| `vs_prog.md` | 5 XP | 10 XP | `floor(375 × 1.3^(N-14))` |

**Impact:** The engine cannot have two XP curves. One must be canonical.

**Recommendation:** Use `vs_prog.md` curve (compressed for 5 minutes). Update `vs_plan.md` to reference `vs_prog.md` as the source of truth for Stage 1.

---

### 🔴 CRITICAL: Boss Spawn Time Conflict

**Problem:** Boss spawns at different times.

| Source | Boss Spawn | Game Duration |
|---|---|---|
| `vs_plan.md` | Minute 10 | 10+ minutes |
| `vs_prog.md` | Minute 4 | 5 minutes |

**Impact:** Wave timeline, difficulty scaling, and progression are all affected.

**Recommendation:** Use `vs_prog.md` 5-minute timeline. Update `vs_plan.md` to note that V1 is compressed to 5 minutes.

---

### 🔴 CRITICAL: Wave Timeline Conflict

**Problem:** Two completely different wave timelines exist.

| Source | Time Brackets | Enemy Introductions |
|---|---|---|
| `vs_plan.md` | 8 brackets (0:00–10:00+) | Zombies at 0:00, Bats at 1:00, Skeletons at 3:00, Ghosts at 5:00, Casters at 7:00 |
| `vs_prog.md` | 10 brackets (0:00–5:00) | Zombies at 0:00, Bats at 1:00, Skeletons at 2:00, Ghosts at 2:30, Casters at 3:00 |

**Impact:** Spawn system implementation will be wrong if based on the wrong timeline.

**Recommendation:** Use `vs_prog.md` timeline. Mark `vs_plan.md` wave table as "original 10-minute design, superseded by `vs_prog.md`."

---

### 🟡 MAJOR: Obstacles Added Without Plan Update

**Problem:** `vs_colors.md` defines 5 obstacle types (Tombstones, Grave Mounds, Broken Walls, Cracked Floor), but `vs_plan.md` explicitly states "No obstacles in V1 (pure open arena)."

**Impact:** Obstacles affect collision system, spawn rules, pathfinding, and gameplay feel.

**Decision Required:** Do we include obstacles in V1?

- **Option A (Recommended):** Include obstacles. They improve movement feel significantly. Update `vs_plan.md` to reflect this.
- **Option B:** Remove obstacles from `vs_colors.md`. Keep V1 as pure open arena.

---

### 🟡 MAJOR: Visual Spec Not in Original Plan

**Problem:** `vs_colors.md` is a new file not listed in the 10 required spec files from `vs_plan.md`.

**Impact:** The original plan referenced `08_ui_hud_spec.md` for visual design. `vs_colors.md` covers shapes, colors, and obstacles — overlapping with and extending beyond the UI spec.

**Recommendation:** 
- Keep `vs_colors.md` as the visual spec (it's more comprehensive)
- `08_ui_hud_spec.md` should focus on HUD layout, screens, and UI flow only
- Update `vs_plan.md` to include `vs_colors.md` in the file inventory

---

### 🟡 MAJOR: Sound Design Overlap

**Problem:** Sound design is covered in two places:
- `vs_plan.md` references `09_audio_spec.md`
- `vs_prog.md` has a detailed "Sound Design Arc" section with Payout Triad system

**Impact:** Implementation could reference conflicting specs.

**Recommendation:** 
- `vs_prog.md` is the canonical source for sound design (it has the detailed specs)
- `09_audio_spec.md` should be a summary pointing to `vs_prog.md` for details
- Or: merge all sound specs into `09_audio_spec.md` and have `vs_prog.md` reference it

---

### 🟢 MINOR: Version Roadmap Timing

**Problem:** `vs_plan.md` mentions boss at minute 10 in the roadmap section, but V1 is 5 minutes.

**Impact:** Low — roadmap is for future versions.

**Recommendation:** Add note that V1 is compressed to 5 minutes.

---

## Conflicts Found

### Conflict Matrix

| Spec Area | `vs_plan.md` | `vs_prog.md` | `vs_colors.md` | Resolution |
|---|---|---|---|---|
| XP Curve (L1→2) | 10 XP | 5 XP | — | Use `vs_prog.md` |
| XP Formula | `floor(250 × 1.35^(N-10))` | `floor(375 × 1.3^(N-14))` | — | Use `vs_prog.md` |
| Boss Spawn | Minute 10 | Minute 4 | — | Use `vs_prog.md` |
| Game Duration | 10+ minutes | 5 minutes | — | Use `vs_prog.md` |
| Wave Timeline | 8 brackets | 10 brackets | — | Use `vs_prog.md` |
| Obstacles | None | None | 5 types | Decision needed |
| Visual Spec | `08_ui_hud_spec.md` | — | `vs_colors.md` | Use `vs_colors.md` |
| Sound Design | `09_audio_spec.md` | Sound Design Arc | — | Merge or reference |
| Enemy Stats | Not defined | Defined | Defined | Use `vs_prog.md` |
| Weapon Stats | Not defined | Defined | Defined | Use `vs_prog.md` |

---

## Missing Specs

### Critical Missing Items

| # | Missing Spec | Impact | Priority |
|---|---|---|---|
| 1 | **10 spec files not created** | Engine cannot be built without them | Critical |
| 2 | **JSON content files** | Engine has no data to load | Critical |
| 3 | **Obstacle decision** | Affects collision, spawn, pathfinding | High |
| 4 | **XP curve canonical source** | Engine needs one curve | High |
| 5 | **Boss respawn rules** | `vs_prog.md` doesn't define respawn | Medium |
| 6 | **Screen shake implementation** | Referenced in `vs_prog.md` but not spec'd | Medium |
| 7 | **Touch controls (V2)** | Noted as deferred, but no spec exists | Low |

### Items to Add to `vs_plan.md`

| # | Item | Section |
|---|---|---|
| 1 | Reference `vs_colors.md` in file inventory | Required Markdown Spec Files |
| 2 | Note V1 is 5 minutes, not 10 | Version 1 Scope |
| 3 | Update boss spawn to minute 4 | Wave Timeline |
| 4 | Update XP curve to match `vs_prog.md` | Missing Details |
| 5 | Add obstacle decision to Missing Details | Missing Details |
| 6 | Reference `vs_prog.md` for progression details | Spec File Creation Prompts |

---

## Sync Plan

### Phase 1: Resolve Conflicts (Do First)

| # | Action | Files Affected |
|---|---|---|
| 1 | Choose canonical XP curve (`vs_prog.md`) | `vs_plan.md`, `vs_prog.md` |
| 2 | Choose canonical boss spawn (minute 4) | `vs_plan.md`, `vs_prog.md` |
| 3 | Decide on obstacles (include or exclude) | `vs_plan.md`, `vs_colors.md` |
| 4 | Decide sound design canonical source | `vs_plan.md`, `vs_prog.md` |
| 5 | Add `vs_colors.md` to `vs_plan.md` file inventory | `vs_plan.md` |

### Phase 2: Update `vs_plan.md`

| # | Change | Location |
|---|---|---|
| 1 | Add note: "V1 is compressed to 5 minutes" | Version 1 Scope |
| 2 | Add `vs_colors.md` to file inventory | Required Markdown Spec Files |
| 3 | Update boss spawn to minute 4 | Wave Timeline (Prompt 5) |
| 4 | Update XP curve to match `vs_prog.md` | Missing Details |
| 5 | Add obstacle decision to Missing Details | Missing Details |
| 6 | Note `vs_prog.md` as progression source of truth | Spec File Creation Prompts |

### Phase 3: Create Spec Files (In Order)

| # | File | Source | Testing |
|---|---|---|---|
| 1 | `01_engine_architecture.md` | `vs_plan.md` Prompt 1 | Unit tests for game loop |
| 2 | `02_character_spec.md` | `vs_plan.md` Prompt 2 | Unit tests for movement |
| 3 | `03_weapons_spec.md` | `vs_prog.md` Weapon Progression | Unit tests for damage calc |
| 4 | `04_enemies_spec.md` | `vs_prog.md` Enemy Spawn Details | Unit tests for spawn logic |
| 5 | `05_stages_spec.md` | `vs_prog.md` Wave Timeline | Integration tests for waves |
| 6 | `06_pickups_and_powerups_spec.md` | `vs_prog.md` Drop Economy | Unit tests for drop rates |
| 7 | `07_leveling_system_spec.md` | `vs_prog.md` Experience Curve | Unit tests for XP math |
| 8 | `08_ui_hud_spec.md` | `vs_plan.md` Prompt 8 + `vs_colors.md` | Visual regression tests |
| 9 | `09_audio_spec.md` | `vs_prog.md` Sound Design Arc | Audio logic tests |
| 10 | `10_json_schemas.md` | All specs combined | Schema validation tests |

### Phase 4: Create JSON Content Files

| # | File | Source |
|---|---|---|
| 1 | `content/characters.json` | `02_character_spec.md` + `vs_colors.md` |
| 2 | `content/weapons.json` | `03_weapons_spec.md` + `vs_colors.md` |
| 3 | `content/enemies.json` | `04_enemies_spec.md` + `vs_colors.md` |
| 4 | `content/stages.json` | `05_stages_spec.md` |
| 5 | `content/pickups.json` | `06_pickups_and_powerups_spec.md` + `vs_colors.md` |
| 6 | `content/leveling.json` | `07_leveling_system_spec.md` |

---

## Automated Testing by Phase

### Phase 1: Spec Validation

| Test | Tool | Command |
|---|---|---|
| XP curve consistency | Unit test | Verify `vs_prog.md` values match `vs_plan.md` after update |
| Boss spawn consistency | Unit test | Verify minute 4 in all references |
| JSON schema validation | Zod | Validate all schemas before content creation |
| Cross-reference check | Manual | Verify all file references resolve |

### Phase 2: Engine Core

| Test | Tool | Command | Pass Criteria |
|---|---|---|---|
| Game loop runs at 60 FPS | Puppeteer | Inject FPS counter, log for 60s | Average ≥ 55 FPS |
| Entity pool allocation | Unit test | Create 200 entities, verify no leaks | Memory stable |
| Collision detection accuracy | Unit test | Known positions, expected results | 100% pass |
| Input responsiveness | Puppeteer | Simulate WASD, measure response | < 16ms latency |

### Phase 3: Game Systems

| Test | Tool | Command | Pass Criteria |
|---|---|---|---|
| XP curve progression | Unit test | Simulate kills, verify level-ups | Matches `vs_prog.md` milestones |
| Weapon damage calc | Unit test | Verify all 7 levels per weapon | Matches `vs_prog.md` tables |
| Spawn rate over time | Integration test | Log spawns for 5 minutes | Matches wave timeline |
| Drop rate statistical | Unit test | Simulate 10,000 kills, verify rates | Within 10% of target |
| Level-up selection | Unit test | Verify pool rules, no duplicates | 100% pass |
| Boss spawn at 4:00 | Integration test | Run game to 4:00, verify boss exists | Boss spawned |
| Boss defeat triggers victory | Integration test | Defeat boss, verify screen | Victory screen shown |

### Phase 4: Visual & Audio

| Test | Tool | Command | Pass Criteria |
|---|---|---|---|
| Visual regression | Playwright | Screenshot comparison | < 0.1% pixel diff |
| Color accuracy | Playwright | Extract pixel colors, compare to `vs_colors.md` | Exact match |
| Shape rendering | Playwright | Verify entity shapes | Correct shape per type |
| HUD layout | Playwright | Screenshot HUD elements | Positions match spec |
| Audio logic | Unit test | Verify oscillator config | Correct waveform/frequency |
| Combo stepping | Unit test | Simulate rapid pickups | Index advances correctly |
| Volume ducking | Unit test | Simulate priority sounds | Ducking applied correctly |

### Phase 5: Integration

| Test | Tool | Command | Pass Criteria |
|---|---|---|---|
| Full 5-minute run | Puppeteer | Automated play, log stats | Completes without crash |
| Performance under load | Puppeteer | Monitor FPS with 200 enemies | ≥ 30 FPS minimum |
| Memory leak detection | Puppeteer | Monitor heap over 5 minutes | No unbounded growth |
| Game over triggers | Puppeteer | Let player die, verify screen | Death screen shown |
| Pause/resume | Puppeteer | Press Escape, verify pause | Game pauses, resumes |

### Phase 6: Balance Validation

| Test | Tool | Command | Pass Criteria |
|---|---|---|---|
| Level at boss spawn | Puppeteer | Run to 4:00, check level | Level 10–12 |
| Kill count | Puppeteer | Run full game, log kills | 400–500 enemies |
| Gold economy | Puppeteer | Run full game, log gold | 800–1,200 gold |
| Boss kill time | Puppeteer | Defeat boss, log time | 8–15 seconds |
| Power-up frequency | Puppeteer | Log power-up drops | 7–12 per run |

---

## Recommended Actions

### Immediate (Before Implementation)

1. **Resolve the XP curve conflict** — Choose `vs_prog.md` as canonical, update `vs_plan.md`
2. **Resolve the boss spawn conflict** — Choose minute 4, update `vs_plan.md`
3. **Decide on obstacles** — Include them (recommended) or remove from `vs_colors.md`
4. **Update `vs_plan.md`** — Add `vs_colors.md` to file inventory, note V1 is 5 minutes
5. **Create a single source of truth map** — Document which file owns each spec area

### During Implementation

1. **Create spec files in order** — Follow Phase 3 sequence
2. **Write tests alongside specs** — Each spec file gets corresponding tests
3. **Use `vs_prog.md` as balance source** — All gameplay numbers come from here
4. **Use `vs_colors.md` as visual source** — All rendering specs come from here
5. **Run tests after each phase** — Don't proceed until tests pass

### Post-Implementation

1. **Run full test suite** — All phases, all tests
2. **Playtest balance** — Compare actual gameplay to `vs_prog.md` targets
3. **Visual QA** — Screenshot comparison against `vs_colors.md` specs
4. **Performance benchmark** — Verify 60 FPS with 200 entities

---

*End of vs_review.md — Version 1*
