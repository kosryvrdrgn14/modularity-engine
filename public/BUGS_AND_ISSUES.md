# Bugs & Issues Tracker

> **Purpose:** Track known bugs, fixed bugs, and potential issues across all sessions
> **Created:** September 2, 2026

---

## Active Issues

*None — all known issues have been resolved as of September 2, 2026.*

---

## Fixed Bugs

### BUG-001: Level-3 Weapon Upgrade Freeze (Session ~3)
- **Severity:** Critical
- **Symptom:** Game froze when weapon reached level 3 upgrade
- **Root Cause:** `game2.html` grew to 10,519 lines. An audio listener threw an exception, silently killing the upgrade-selection logic registered after it — zero console output due to missing try/catch in event bus dispatch loop.
- **Fix:** File split into modular engine/ui/data files. Added try/catch wrapping to event bus listener dispatch.
- **Lesson:** File size directly impacts debuggability. Event bus must never let one listener's failure kill subsequent listeners.

### BUG-002: Shop Overlay Missing After Split (Session ~4)
- **Severity:** High
- **Symptom:** Shop button clicked but overlay didn't appear
- **Root Cause:** During the monolithic file split, the shop overlay's HTML was accidentally deleted while the button that opened it survived. `getElementById` returned null silently.
- **Fix:** Restored shop overlay HTML in game2.html.
- **Lesson:** Post-refactor checklist item #3 (grep for all moved/renamed IDs) would have caught this.

### BUG-003: Empty Town Screen After Data Migration (September 2, 2026)
- **Severity:** High
- **Symptom:** Town screen rendered with correct header/background but no NPC cards, no location cards, no breadcrumb — center area completely empty.
- **Root Cause:** Two compounding issues:
  1. `LocationManager` received `GameManager` (save data) where it needed `DataManager` (JSON content). Game class passed `gameManager: this.gameManager` to TownScreen, but `this.gameManager` is `new GameManager()`, not the `Game` instance itself.
  2. Old JS globals (`LOCATION_TREE`, `NPC_DATA`) were removed (script tags deleted) before the new JSON data path was correctly wired, so the fallback chain also failed.
- **Fix:**
  - `LocationManager` constructor changed to accept `{ gameManager, dataManager }` (destructured)
  - `TownScreen` now stores and forwards `dataManager` directly
  - `_getLocationsData()` and `_getNPCsData()` read from `this.dataManager` instead of `this.gameManager?.dataManager`
- **Lesson:** The project has three confusingly-similar manager objects (Game, GameManager, DataManager). Always verify which object you're passing. Use destructured constructor args to prevent positional-argument swaps. See KNOWLEDGE.md §11.

### BUG-004: Missing EMBEDDED_DATA Fallback for locations/npcs (September 2, 2026)
- **Severity:** Medium
- **Symptom:** If JSON fetch for `locations.json` or `npcs.json` failed, DataManager had `undefined` for those keys, leading to silent failures downstream.
- **Root Cause:** `EMBEDDED_DATA` in `embeddedData.js` only had fallbacks for `characters` and `leveling`. The 9 other content types (including locations and npcs) had no fallback.
- **Fix:** Added `locations: { regions: [] }` and `npcs: {}` to `EMBEDDED_DATA`.
- **Lesson:** Every DataManager content type needs a fallback entry, even if minimal/empty.

### BUG-005: Crash-Prone getCurrentRegion/Location (September 2, 2026)
- **Severity:** Medium
- **Symptom:** If `data.regions` was empty or undefined, `getCurrentRegion()` would crash with `Cannot read property of undefined`.
- **Root Cause:** No defensive check for empty/missing regions array.
- **Fix:** Added guard clauses: returns `{ id: 'unknown', name: 'Unknown', locations: {} }` if regions is empty.
- **Lesson:** Always handle empty data gracefully. See KNOWLEDGE.md §6.

### BUG-006: Upgrade Card Not Showing First Tab Items (Pre-September 2026)
- **Severity:** Low
- **Symptom:** Shop's first tab didn't show items until switching to another tab and back.
- **Root Cause:** Tab rendering wasn't triggered on initial open.
- **Fix:** Fixed during shop tab refactor (details in earlier session).

---

## Potential Issues (Watch List)

### POT-001: Enemy Visuals Not Fully Data-Driven
- **Status:** Partially addressed (visuals added to enemies.json, engine reads from JSON)
- **Remaining:** Weapon visuals still hardcoded in combat.js (colors, shapes set inline). Future modding tools would need these in JSON too.
- **Priority:** Low — not blocking any current feature

### POT-002: Weapon Attack Areas Partially Data-Driven
- **Status:** Link established (attackArea field in weapons.json references attackAreas.json)
- **Remaining:** Per-level stats still inline in weapons.json rather than scaling from attackAreas.json base values.
- **Priority:** Low — works correctly, just not fully DRY

### POT-003: NPC Portraits Still Base64 in svgPortraits.js
- **Status:** NPC_DATA migrated to JSON with `portraitKey` references, but SVG_PORTRAITS remains a JS global with massive base64 strings
- **Remaining:** Full migration would require either asset path references or a portrait asset loading system
- **Priority:** Medium — blocks web tools from easily generating NPC content

---

## Resolved Design Gaps

### GAP-001: Location → Stage Link Missing
- **Resolved:** September 2, 2026
- **What:** Locations had no way to reference which combat stage they contained
- **Fix:** Added `stageId` and `stageConfig` to location schema and locations.json

### GAP-002: No Navigation Arrows for PC
- **Status:** Planned (Phase 1)
- **What:** Regions could only be switched via mobile swipe, no PC/keyboard support

### GAP-003: Stages Not Linked to Locations
- **Resolved:** September 2, 2026
- **What:** Combat always used hardcoded stage_graveyard regardless of location
- **Fix:** cemetery → stage_graveyard, crypt → stage_graveyard_extended in locations.json

---

*Last updated: September 2, 2026*
