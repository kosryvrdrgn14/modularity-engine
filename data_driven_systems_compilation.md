# Data-Driven Systems — Compilation & Integration Map

**Purpose of this document:** a single reference tying together every data-driven system
designed so far — what's already built, what's fully spec'd, and what's only been discussed —
plus the dependency relationships between them. Read this before starting work on any system
listed below, to avoid rebuilding shared infrastructure that another system already needs.

**The one rule this whole document exists to enforce:** several systems below need the *same*
underlying capability (rule evaluation, memory logging, rendering). Build each shared capability
once, generically, and have every consumer read from it — do not let a feature build its own
"just for this" version. This project has already paid for that mistake multiple times
(GameManager/DataManager duplication, orphaned duplicate data files, the EMBEDDED_DATA gap that
caused the town screen to go blank). Treat that history as the reason this rule is non-negotiable,
not just good practice.

---

## 1. The Shared Core: Condition/Gate Engine

**Status: BUILT — Step 1 complete (v2.4.0, 2026-09-14).** `public/systems/conditionEngine.js`
implements the vocabulary below: typed leaf conditions (`flag`/`questState`/`affectionTier`),
`all`/`any`/`not` recursion, fail-closed policy (malformed input logs + returns false, never
true-by-default), reserved extension types (`time`, `dialogueChoice`, `location`, `season`) that
reject with a specific message, and a `validate()` surface. GameManager exposes
`evaluateCondition(cond, ctx?)` + `buildConditionContext()` (getter-style live context); quest
`prerequisites` now accept condition objects mixed with legacy flag strings (strings keep exact
legacy behavior). The same file validates content at GENERATION time — the embeddedData
generator runs `validate()` over every quest's object prerequisites. Contract enforced by
`tests/suites/step1_gate_engine.cjs` (30 checks, strict). Reserved types are implemented in
later steps: `time` and `dialogueChoice` are the first two on deck (§2).

**Condition vocabulary (as designed):**
```json
{ "flag": "lich_defeated", "equals": true }
{ "questState": "necromancer_trial", "state": "completed" }
{ "affectionTier": "spider_queen", "atLeast": "trust" }
{ "all": [ {"flag": "married_spider_queen"}, {"season": "winter"} ] }
```
`all` / `any` / `not` combinators let complex arcs be expressed as data, without new code per
character.

**Confirmed and planned consumers:**
1. Quest availability — **built**
2. NPC location/dialogue selection — planned (§2)
3. Inventory gift-eligibility — planned (§3)
4. Roleplay-export spoiler gating — planned, full spec exists (§4)

**Action item before starting §2, §3, or §4:** verify the existing quest gate engine is
generalized enough to serve all four consumers, extending it (e.g., adding a `time`/schedule
condition type for §2) rather than writing a second evaluator anywhere.

---

## 2. NPC Data-Driven Locations, Dialogue, and Mood

**Status: BUILT — Step 2 complete (v2.5.0, 2026-09-14).** Spec:
`npc_condition_system_spec.md` (written before implementation, per convention).
`public/systems/npcSystem.js` implements `NpcMemoryLog` (the canonical event log —
see §4's ownership note) and `NPCSystem`: `locationRules` (first-match-wins, base
location as fallback), `dialogueSets` (first passing set wins with a GUARANTEED
unconditional fallback — legacy root-topics NPCs synthesize one automatically), per-topic
conditions, and the mood layer (selection input, stamped into event payloads). All
conditions evaluate through the §1 engine — zero forks. Producers are centrally registered
bus listeners (`npc:dialogueChoice`, `npc:dialogueFlag`, `npc:dialogueAffection` emitted at
the single selection point in TownContent; `npc:talked` and `quest:completed` re-used as
they exist); log writes ride the §21 autosave machinery (typed GameManager methods:
`logNpcEvent` / `getNpcEventsForNpc` — POT-012 `WRITABLE_PATHS` untouched; store v5 adds
`persistent.npcs.eventLog`/`eventSeq` additively). Dev Condition Inspector:
`window.__NPC_DEBUG__` (evaluate/explain/log/schema). `old_man` is the migrated reference
NPC; every other NPC stays 100% legacy-functional. Build-time validation of NPC `when`
conditions added to the generator (same policy as quest gates). Contract enforced by
`tests/suites/step2_npc_system.cjs` (30 checks, strict — including the save→reload
round-trip via the harness's new `keepStorage` boot). Deferred from the original sketch:
`npc:locationChanged`/`dialogueSetChanged`/`moodChanged`/`schedule:tick` hooks and `time`
conditions (registered extension types, implemented in later steps).

**Original design sketch (for reference):**

**Core data additions per NPC:**
- `locationRules`: ordered list of `{ location, conditions }` — first match wins. Lets an NPC's
  location shift across an arc (boss encounter → captured → estate) driven entirely by data.
- `dialogueSets`: named pools, each with conditions, evaluated highest-priority-match-first.
  **Must always include one unconditional fallback set** — if every conditioned set fails to
  match, the NPC should say something sensible, never go silent. This is the same lesson as the
  `EMBEDDED_DATA`/empty-regions fix, applied to dialogue instead of location data.
- A **mood layer**, separate from affection tier — fast-changing and cosmetic (happy/tired/busy),
  used for flavor text and portrait variation without touching the real relationship number.
- Time-of-day / schedule conditions — requires extending the gate engine (§1) with a `time` type.
- Cross-character flag awareness — an explicit design decision (not an accident) on whether one
  NPC's dialogue can reference events from another's storyline.
- **Dialogue/choice memory** — a per-NPC log of `{ conversationId: choiceId }`, distinct from
  story flags, enabling callback lines without a dedicated flag per minor branch.

**Event hooks to add to the bus:** `npc:locationChanged`, `npc:dialogueSetChanged`,
`npc:moodChanged`, `schedule:tick`.

**Dev tooling:** a "Dev: NPC Condition Inspector" screen, matching the existing "Dev: Stage
Select" house style — shows which conditions were evaluated and why a given location/dialogue set
won, for whichever NPC is currently loaded.

**Dependencies:** the gate engine (§1). **Feeds into:** the roleplay-export event log (§4) — the
dialogue/choice memory log described here is the same underlying data that system's event log
needs. See the build-order note in §5 before starting either.

---

## 3. Modular Inventory System

**Status: designed in discussion, not yet written as a standalone spec file.** Consider splitting
into `inventory_system_spec.md` before implementation, matching project convention.

**Core data model:**
```json
{
  "id": "spider_silk",
  "category": "material",
  "tags": ["estate_specialty", "spider_queen", "textile"],
  "stackable": true,
  "maxStack": 999,
  "rarity": "uncommon",
  "icon": "spider_silk.svg"
}
```
Categories defined in `content/item_categories.json` (id, display name, icon, sort priority,
preferred layout). `tags` enable cross-cutting filters independent of a rigid single-category
taxonomy.

**Starting categories:** Weapons, Materials (tag-filterable by estate specialty), Gifts (tagged
by minimum affection tier), Quest Items (non-sellable, non-routable by default), Key Items (tied
to `unlockCondition`), Rare Drops/Trophies (from the pity system).

**UX notes:** mobile — horizontal swipeable category tabs, 2-3 column grid, tap for detail sheet;
PC — sidebar category list with counts, wider grid, text search. A badge on any item currently
reserved by the estate/warfront routing system, linking directly to its routing config.

**Dependencies:**
- **Gift eligibility must read through the shared gate engine (§1)** — "minimum affection tier"
  gift-tagging is the same kind of condition already used for quest and (planned) NPC
  availability. Do not implement this as separate logic.
- **Rendering depends on the Widget UI System (§5)** — the inventory grid is explicitly the
  recommended pilot screen for that system's Card template (see that spec's §8, Rollout).

**Storage decision (2026-09-14 groundwork):** the inventory model extends the EXISTING
`store.inventory` in `systems/progression.js` — it is merged into live saves via
`_migrate` (v1.4) and actively written by `ui/shop.js` via `_addToInventory`. There is NO
parallel v2 inventory system: items gain optional `category` and `tags` fields (absent = legacy
consumable, so old saves need no data migration — only the `_migrate` default-shape step).
Migration steps in `_migrate` must add any new container fields the tag/category model needs,
one version bump, per the save-versioning discipline. `consumables` is NOT duplicated as a new
array; the model grows around it.

---

## 4. NPC Memory & Roleplay Export System

**Status: full spec written — see `npc_memory_roleplay_export_spec.md`.**

**Summary for integration purposes:** an event-sourced per-NPC history log (not overwrittenflags), named memoryCheckpoints auto-generated at major milestones, favorites as
`(memoryCheckpoint-set, NPC-set)` pairs accessible from the title screen (decoupled from live gameplay
session state), a cross-character relationship registry, a facts/flavor data split, a full
constraint model (spoiler containment, a hard no-jealousy rule, meta/immersion boundaries,
inheritance of existing content-exclusion decisions), and a complete no-code testing plan for
validating character behavior across different receiving AI models.

**Dependencies:**
- **Spoiler gating explicitly reuses the shared gate engine (§1)** — the spec is written to
  consume it, not fork a separate evaluator.
- **The event log here and §2's dialogue/choice memory log are conceptually the same data.**
  Whichever of these two systems is built first should be designed generically enough for the
  other to simply consume it — see the build-order note below.- **Rendering (favorites menu, memoryCheckpoint browser) depends on the Widget UI System (§5).**

**Groundwork decisions locked 2026-09-14 (carried from the five-decision pre-build pass):**
- **Naming:** curated history points are **memoryCheckpoints** — the bare word "checkpoint" is
  owned by the auto-save system's event checkpoints (MASTER_DESIGN §21).
- **Event ordering:** per-save monotonic integer `seq` + the existing `chapterMarker` field —
  no in-game calendar is built for this system (spec §11 resolved).**Full detail:** see the attached spec file for the complete event schema, memoryCheckpoint tagging
rules, constraint model, and testing matrix.

---

## 5. Data-Driven Widget UI System

**Status: full spec written — see `widget_ui_system_spec.md`.**

**Summary for integration purposes:** a slot-based Card template (icon, primary/secondary text,
badge, progress bar, status indicator — all optional, data-bound), fixed layout presets rather
than freeform positioning, bounded size/color tokens, a repeat-over-array mechanism, context
accents, a small Specialized-template tier with an explicit "graduation rule" for when something
genuinely can't be a Card, and a purely-visual Skinning layer (9-slice borders, data-driven, with
a hard rule that skins can never be the sole channel for information). Also specifies instance
pooling, reactive re-rendering, schema validation at load time, version tagging, a live-preview
tool, a widget inspector dev tool, and the occlusion-detection system (using
`document.elementFromPoint()` to catch buried/unclickable UI elements automatically).

**This is the rendering layer for:** §2's NPC Condition Inspector dev screen, §3's inventory grid
(explicitly the recommended pilot screen), and §4's favorites/memoryCheckpoint browser.

**Full detail:** see the attached spec file for the complete slot vocabulary, skin data model,
and the occlusion-detection mechanism.

---

## 6. Integration Map & Recommended Build Order (revised 2026-09-14 — plan of record)

Supersedes the original sequencing after the §1 audit (the quest gate engine proved to be an
id-keyed lookup, NOT a general condition evaluator — §1 is new construction) and the locked
memory-log decision below.

0. ✅ **Groundwork decisions (done, v2.3.2):** memoryCheckpoint naming locked; inventory merges
   into the existing `store.inventory`; event ordering = per-save monotonic `seq` +
   `chapterMarker` (no calendar built); `spouses` unlock category added; `ui_skins.json`
   pipeline-registered (mirror at 15 content files).
0a. ✅ **Step 1 — condition evaluator (done, v2.4.0):** `public/systems/conditionEngine.js` —
   ONE evaluator, fail-closed, all/any/not, typed conditions, `validate()` in the content
   pipeline, existing lookups folded (mixed-mode prerequisites, zero migration). Suite:
   `tests/suites/step1_gate_engine.cjs` 30/30 strict. Remaining steps below may now start.
0b. ✅ **Test-harness safety (done 2026-09-14):** the trace relocated to
   `tests/regression_trace.cjs` (112/112 green post-move). Full autonomous testing now lives at
   `node tests/run_all.cjs` — the trace plus one step-gated suite per step below
   (`tests/suites/stepN_*.cjs`, skip-until-implemented; `--strict` after landing). Each step's
   suite is part of its definition of done. Remaining isolate/ deletion is pure archive
   hygiene: still confirm `game2_backup_monolithic.html` recoverability before removing it.
1. **Build the generic condition evaluator (§1) — new construction.** Parser + all/any/not
   recursion + typed conditions + no-silent-fail policy + load-time schema validation. Fold the
   existing lookups behind it: `isContentUnlocked` and `_checkPrerequisites` (bare flag strings
   in prerequisites remain sugar for all-of flag conditions — no content migration). Register
   `time` and `dialogueChoice` as reserved-but-unimplemented condition types (extension points,
   not rearchitecture later). Ship with trace coverage that drives real state transitions
   (BUG-031 lesson: reach-test the machine, not just the API). **Gate: its suite
   (`tests/suites/step1_gate_engine.cjs`) must pass `--strict` before the step counts as done.**
2. ✅ **NPC locations/dialogue/mood (§2) — done (v2.5.0, 2026-09-14).** Spec
   `npc_condition_system_spec.md` written first; implementation in
   `public/systems/npcSystem.js` (`NpcMemoryLog` + `NPCSystem`); GameManager typed methods
   (`logNpcEvent`/`getNpcEventsForNpc`), store v5 (additive `persistent.npcs.eventLog`/`eventSeq`),
   TownContent wired at the single selection point, locationManager consults `resolveLocation`,
   generator validates NPC conditions, `window.__NPC_DEBUG__` inspector, `old_man` reference
   migration. The canonical memory log's first producers landed here. Suite:
   `tests/suites/step2_npc_system.cjs` 30/30 strict (incl. save→reload round-trip).
   Deferred to later steps: `time`/`dialogueChoice` condition implementations,
   `schedule:tick`, `npc:locationChanged`/`moodChanged` broadcast hooks.
3. **Widget/inventory pilot (§5 Card + one skin on the §3 grid) — parallel track, explicit
   go/no-go.** Recommended: run in parallel with §2 once the §1 evaluator lands (the pilot's
   gift-eligibility and key-item conditions read through it). POT-015 (`getEffectiveStats`
   composition point) lands with this milestone. **Gate: `tests/suites/step3_widget_inventory.cjs`
   must pass `--strict` (card slots/repeat/loud-validation; inventory tagged items coexisting
   with legacy shape).**
4. **Roleplay export favorites/memoryCheckpoint UI (§4)** — pure consumption: reads the
   canonical log, the evaluator's spoiler queries, and the widget layer. No new evaluator,
   no new log, no new rendering code. **Gate: `tests/suites/step4_export.cjs` must pass
   `--strict`, including its no-duplicate-infrastructure purity checks.**
5. **POT-001 (NPC portraits) lands with §2's portrait-variation work.**

**Memory-log ownership decision (LOCKED 2026-09-14 — resolves the original step 3):**
ONE canonical log, built with §2, shaped to §4's schema from day one, owned by neither feature.
Schema: `{ eventId, seq, chapterMarker, npcIds[], type, payload, spoilerTag }` — append-only,
per-save, session-independent (usable from the title screen; no Game/GameLoop dependency),
persisted via the existing store + `_migrate` discipline. §2's `{ conversationId: choiceId }`
memory is an event type (`dialogueChoiceMade`) plus a query projection
(`getEventsForNpc(npcId, { type, upToSeq, spoilerFilter })`), NOT a second store. Rationale:
§4's schema is the strict superset (npcIds[], spoilerTag, chapterMarker); starting from §2's
subset would force a parallel translation log later. Writes flow through ONE append API via
centrally-registered bus listeners (the §21 autosave event-checkpoint pattern);
memoryCheckpoints and favorites are read-side curation layers over the log, never write-side
filters.

**Explicit warning to carry into planning, worth repeating even though it opens this document
too:** no system above should end up with its own independent condition evaluator, its own
memory log, or its own rendering approach "just for this feature." If a session's plan includes
writing new evaluation logic, a new event log format, or new widget-rendering code, stop and check
this document first — it almost certainly already has a home.

---

## 7. Files in this compilation

- `npc_memory_roleplay_export_spec.md` — full spec, referenced in §4
- `widget_ui_system_spec.md` — full spec, referenced in §5
- `KNOWLEDGE.md` — general workflow discipline; the "don't duplicate shared infrastructure" rule
  in this document is a specific application of that file's broader lessons
- `MASTER_DESIGN.md` — overall project architecture; §2 and §3 above should graduate into their
  own dedicated spec files here once implementation begins, matching existing project convention