# Spec Audit Report — Cross-Reference & Gap Analysis

> **Date:** August 26, 2026  
> **Scope:** All 46 markdown spec files  
> **Purpose:** Find broken links, inconsistencies, missing connections, and unresolved gaps before proceeding to complex features

---

## Executive Summary

| Category | Count | Severity |
|---|---|---|
| **Stale file references** (game.html → game2.html) | 8 files | 🟡 Medium |
| **Save data structure conflicts** | 3 conflicts | 🔴 High |
| **ID system mismatch** | 1 systemic issue | 🟡 Medium |
| **Version number inconsistencies** | 2 files | 🟢 Low |
| **Missing cross-references** | 5 gaps | 🟡 Medium |
| **Unresolved gaps from previous specs** | 7 gaps | 🟡 Medium |
| **Duplicate code (open bug)** | 1 issue | 🟡 Low |
| **Spec superseded but not marked** | 3 files | 🟡 Medium |
| **Total issues found** | **30** | |

---

## 1. Stale File References (game.html → game2.html)

These files still reference `game.html` instead of `game2.html`:

| File | Lines | Issue |
|---|---|---|
| `09_audio_spec.md` | L516 | "all 7 implementation gaps resolved in game.html" |
| `10_audio_implementation_map.md` | L7, L25 | "where every sound fires in `game.html`", "at line 2137 of `game.html`" |
| `12_codebase_map.md` | L4, L28 | "`public/game.html` (3403 lines)" — also wrong line count |
| `CHANGELOG.md` | L80 | "7 implementation gaps resolved in game.html" |
| `playtest_report.md` | L103, L119 | "Open `game.html` in a browser" |
| `session_sync_report.md` | L95, L170 | Already noted as stale — "Some spec files still reference game.html" |
| `system_audit_report.md` | L4, L420 | "Full line-by-line trace of game.html" |
| `dialogue_template.md` | Various | References game.html for NPC data |

**Action:** Batch-replace `game.html` → `game2.html` in all .md files. Also update line counts where mentioned (game2.html is ~7000+ lines, not 3403).

---

## 2. Save Data Structure Conflicts

### Conflict A: `town.phase` vs `town.level`

| Spec | Field | Values |
|---|---|---|
| `19_town_system_spec.md` | `town.phase` | 1 (camp) or 2 (shacks) |
| `game_frame.md` | `town.phase` | 1-5 (city progression) |
| `22_city_builder_location_system.md` | `town.level` | 1-5 (town upgrade level) |

**Problem:** `game_frame.md` uses `town.phase` for city progression (1-5). The new city builder spec uses `town.level` (1-5). These are different field names for the same concept. The old town spec uses `town.phase` as a binary (1 or 2).

**Resolution:** Standardize on `town.level` (1-5) for the persistent city progression. Deprecate `town.phase`. Update `game_frame.md` §2 and `19_town_system_spec.md`.

### Conflict B: `town.buildings` structure

| Spec | Structure |
|---|---|
| `game_frame.md` | `town.buildings: {}` — flat object |
| `22_city_builder_location_system.md` | `town.buildings: { "market": { level: 1, built: true } }` — flat object with level |

**Status:** Compatible — the city builder spec extends the same structure. No conflict, but `game_frame.md` should be updated to show the new building schema.

### Conflict C: `npcs.companions` vs `town.companions`

| Spec | Field |
|---|---|
| `game_frame.md` | `npcs.companions: []` |
| `20_companion_combat_spec.md` | Companion data on entity objects |
| `22_city_builder_location_system.md` | No companion field in town (companion management is a separate UI) |

**Status:** Compatible — companions live in `npcs.companions` per `game_frame.md`. The city builder spec's companion management overlay reads from this field. No conflict.

---

## 3. ID System Mismatch

### Current State

| Source | ID Format | Example |
|---|---|---|
| `id_system.md` | Prefixed: `{type}_{name}` | `enemy_zombie`, `weapon_w1_projectile` |
| `game2.html` (actual code) | Short: `{name}` | `zombie`, `w1_projectile`, `old_man` |
| `04_enemies_spec.md` | Short: `{name}` | `zombie`, `bat`, `skeleton` |
| `03_weapons_spec.md` | Short: `{name}` | `w1_projectile`, `w2_orbit` |
| `22_city_builder_location_system.md` | Prefixed: `{type}_{name}` | `trade_district`, `market_square` |

**Problem:** The ID system spec (`id_system.md`) requires prefixed IDs for Godot portability, but the actual game code and most specs use short IDs. The city builder spec uses a hybrid (location IDs are descriptive but not strictly prefixed).

**Resolution:** This was previously noted in `session_sync_report.md` as "fine for now, needed for Godot port." Defer full ID migration to the Godot port phase. For now, document the convention: combat entities use short IDs (for backwards compatibility), new systems (city builder, NPCs) use descriptive IDs.

---

## 4. Version Number Inconsistencies

| File | Version Claimed | Actual |
|---|---|---|
| `game2.html` in-game display | v0.2.0 | Should be v0.2.5 |
| `CHANGELOG.md` | v0.2.5 (latest) | Correct |
| `12_codebase_map.md` | "3403 lines" | game2.html is ~7000+ lines |

**Action:** Update the in-game version display to v0.2.5 (or v0.3.0 if the city builder spec is considered a version bump). Update `12_codebase_map.md` line count.

---

## 5. Missing Cross-References

### 5a. Specs That Don't Reference `game_frame.md`

The following specs define systems that `game_frame.md` should know about but doesn't explicitly reference:

| Spec | Missing Reference |
|---|---|
| `20_companion_combat_spec.md` | No link to `game_frame.md` §6.5 (NPC companions) |
| `22_city_builder_location_system.md` | Links to `game_frame.md` §5 but §5 doesn't mention location hierarchy |
| `dialogue_template.md` | No link to `19_town_system_spec.md` or `game_frame.md` §6 |

### 5b. `game_frame.md` Sections That Are Outdated

| Section | Issue |
|---|---|
| §5 (City Builder) | Doesn't mention location hierarchy, navigation system, or ambient sounds |
| §2 (Save Data) | Missing `town.currentLocation`, `town.locationHistory`, `town.locationUnlocks`, `town.level` |
| §6 (NPC System) | Doesn't mention companion management overlay or 3-slot party UI |
| §11 (Macro Progression) | Doesn't reference the city builder's two-phase economy from §5 |

### 5c. Specs That Reference Each Other But One Is Stale

| Active Spec | References | Stale Spec |
|---|---|---|
| `22_city_builder_location_system.md` | `19_town_system_spec.md` | 19 is superseded by 22 for navigation, but still valid for dialogue system |
| `21_companion_engine_integration.md` | `20_companion_combat_spec.md` | Both are current, but 21 should reference 22 for town companion UI |

---

## 6. Unresolved Gaps from Previous Specs

These gaps were identified in earlier specs but never resolved:

| Gap | Source | Status |
|---|---|---|
| **Gap 5: Upgrade options reference `game` variable instead of parameter** | `extract_engine.html` | Unresolved — latent bug relying on global scope |
| **Gap 8: No obstacle system** | `extract_engine.html` | Unresolved — stage data defines obstacles but no engine support |
| **Gap 9: W3 pulse uses setTimeout** | `extract_engine.html` | Partially fixed (queue-based) but setTimeout may still be in code |
| **Gap 10: No background music support** | `extract_engine.html` | Unresolved — `musicGain` node exists but unused |
| **Boss Phase 2 not implemented** | `04_enemies_spec.md`, `extract_engine.html` | Unresolved — ground pound and minion spawn defined but not coded |
| **Caster doesn't fire projectiles** | `04_enemies_spec.md` | Unresolved — behavior defined, no projectile spawning code |
| **Gold counter always shows 0** | `game_bugs.md` (known limitation) | Partially resolved via GameManager but HUD display may still be broken |

---

## 7. Duplicate Code (Open Bug)

**Bug #43:** Duplicate `_showDogDialogue` / `_showCompanionNotification` / `_renderCompanionSlots` methods in TownScreen class. Two identical definitions exist from Python bulk insert. Status: ⚠️ Open.

**Impact:** JavaScript uses the last definition, so the game works, but the duplicate is dead code that wastes space and could cause confusion during future edits.

**Action:** Remove the first set of duplicate methods (lines ~6730-6793 in game2.html).

---

## 8. Superseded Specs Not Marked

| Spec | Superseded By | Issue |
|---|---|---|
| `19_town_system_spec.md` | `22_city_builder_location_system.md` | 19 is partially superseded (navigation replaced) but dialogue system still valid. Should note: "Navigation superseded by §22. Dialogue system still current." |
| `12_codebase_map.md` | None (needs update) | References game.html with wrong line count. Needs full rewrite. |
| `16_comprehensive_audit.md` | None (stale) | Predates companion, town, title screen, audio. Needs re-audit or archival. |

---

## 9. Recommended Actions (Priority Order)

### Immediate (Before Next Feature)

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | **Update `game_frame.md` §2** (Save Data) with new fields: `town.level`, `town.currentLocation`, `town.locationHistory`, `town.locationUnlocks` | 15 min | Prevents save format confusion |
| 2 | **Update `game_frame.md` §5** (City Builder) to reference `22_city_builder_location_system.md` for location hierarchy | 10 min | Keeps master doc current |
| 3 | **Standardize `town.phase` → `town.level`** across all specs and game2.html | 20 min | Prevents field name conflicts |
| 4 | **Remove duplicate methods** (Bug #43) from game2.html | 5 min | Clean code |
| 5 | **Batch-replace `game.html` → `game2.html`** in all .md files | 10 min | Accuracy |

### Before Godot Port

| # | Action | Effort | Impact |
|---|---|---|---|
| 6 | **Migrate IDs to prefixed format** per `id_system.md` | High | Required for Godot content pipeline |
| 7 | **Resolve extract_engine.html gaps** (obstacles, BGM, boss phases) | Medium | Engine completeness |
| 8 | **Rewrite `12_codebase_map.md`** to reflect current game2.html | Medium | Accurate reference |
| 9 | **Archive or re-audit `16_comprehensive_audit.md`** | Low | Avoid confusion |

---

## 10. File Health Summary

### Healthy (Current & Consistent)
- `01_engine_architecture.md` ✅
- `02_character_spec.md` ✅
- `03_weapons_spec.md` ✅
- `04_enemies_spec.md` ✅ (but boss Phase 2 gap)
- `05_stages_spec.md` ✅
- `06_pickups_and_powerups_spec.md` ✅
- `07_leveling_system_spec.md` ✅
- `08_ui_hud_spec.md` ✅
- `09_audio_spec.md` ✅ (but game.html ref)
- `10_json_schemas.md` ✅
- `11_svg_asset_spec.md` ✅
- `13_telegraph_and_boss_intro.md` ✅
- `14_game_manager.md` ✅
- `15_engine_agnostic_port.md` ✅
- `17_implementation_roadmap.md` ✅
- `18_title_screen_assets_and_plan.md` ✅
- `20_companion_combat_spec.md` ✅
- `21_companion_engine_integration.md` ✅
- `22_city_builder_location_system.md` ✅
- `id_system.md` ✅
- `ui_design.md` ✅
- `dialogue_template.md` ✅
- `game_bugs.md` ✅
- `CHANGELOG.md` ✅

### Needs Update
- `game_frame.md` — §2 and §5 outdated
- `19_town_system_spec.md` — Partially superseded, needs note
- `12_codebase_map.md` — Wrong file reference and line count
- `16_comprehensive_audit.md` — Stale, predates recent features
- `10_audio_implementation_map.md` — References game.html

### Stale (Consider Archiving)
- `system_audit_report.md` — Pre-companion, pre-town, pre-audio
- `session_sync_report.md` — Snapshot from Aug 24, already noted issues
- `playtest_report.md` — References game.html

---

*Audit completed August 26, 2026. 30 issues found across 46 files. 5 immediate actions recommended before next feature work.*
