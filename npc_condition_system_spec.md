# NPC Condition System — Design Spec (§2)

**Status:** Spec for v1 (implementation follows this document in the same step, per plan of record).
**Plan of record:** `data_driven_systems_compilation.md` §6 step 2; `MASTER_DESIGN.md` §24.
**Builds on:** Step 1 — `ConditionEngine` (`public/systems/conditionEngine.js`) is the ONE evaluator; nothing here forks it.
**Companion suites:** `tests/suites/step2_npc_system.cjs` is this step's definition of done (strict-gated).

---

## 0. Ground truth this spec is written against (verified in code)

- Dialogue flow: `TownContent.openDialogue(npc)` → emits `npc:talked` (quest `talk_to` objectives) → greeting → `showChoices(npc)` loops `npc.topics` unconditionally. Topic handler: `topic.close` ends; `topic.flag` sets a flag; `topic.affection` adds affection; `topic.response` typewrites, then returns to choices.
- NPC location consumer: `LocationManager.getNPCsAtLocation(locationId)` filters `npc.location === locationId && npc.unlocked` — it reads `dataManager.npcs` (or `NPC_DATA` fallback). The town panel additionally filters through `questSystem.isContentUnlocked('npcs', id)`.
- Quest gates: `quest.js _buildDerivedGates` already derives `npc:*` unlock gates from `unlocks_on_complete.npcs` — the gate layer exists; what's missing is a runtime selection layer for topics.
- Affection: stored as counter `affection_<npcId>`; tiers from global `AFFECTION_TIERS` (data/affectionTiers.js); engine already exposes `affectionTier` conditions.
- Store: `save_version: 4`; `persistent.npcs = { met: [], relationships: {}, companions: [], companionStatus: {} }` exists. POT-012: `set()` is allowlisted (5 paths); **new persisted state must go through typed methods, not raw `set()`**.
- Save mechanics: slots `me_save_slot1..3`; event-checkpoint autosave list lives in `game.js _setupAutoSave()`; lifecycle saves on pagehide/beforeunload; `_migrate` is additive-first (v<4 precedent: shape defaults, then one version bump).

---

## 1. Scope

**In v1:**
1. **Canonical NPC memory log** (`NpcMemoryLog`) — the locked decision: ONE append-only log, owned by the NPC system, shaped to §4's export schema from day one.
2. **NPCSystem** — data-driven dialogue selection (topics → dialogueSets with a guaranteed unconditional fallback), `locationRules` (first-match-wins with unconditional last entry), mood plumbing, `npc:*` event hooks.
3. **GameManager wiring** — typed methods only (`logNpcEvent`, `getNpcEvents`), migration v5, central bus listeners for log producers.
4. **Dev tooling** — a console NPC Condition Inspector (house style: `window.__QUEST_DEBUG__` pattern).
5. **Content migration** — `old_man` migrated to the new schema as the reference implementation; all legacy NPCs keep working unchanged (fallback rule).

**Deliberately deferred (extension points only):** `time`/`dialogueChoice`/`location`/`season` condition *implementations* in the engine (reserved types already reject with a clear message); the mood *effects* beyond selection input; the widget/inventory pilot (step 3); the export system (step 4); full roster content.

**Non-goals / guarantees:** no fork of the evaluator; no parallel inventory; no calendar system (log uses `seq` + `chapterMarker` per the locked timestamp decision); no changes to the §23 state machine or the §21 autosave ownership (producers join the existing pattern, they do not add saves).

---

## 2. Canonical memory log

### 2.1 Event shape (§4's schema, verbatim contract)

```json
{
  "eventId": "ch1:7",
  "seq": 47,
  "chapterMarker": "ch1",
  "npcIds": ["old_man"],
  "type": "dialogueChoiceMade",
  "payload": { "conversationId": "old_man_main", "choiceId": "about_graveyard" },
  "spoilerTag": null
}
```

- `seq` — per-save monotonic counter (`store.persistent.npcs.eventSeq`). Ordering and replay only; **no wall-clock meaning** (no calendar system exists; §11 open question stays closed).
- `chapterMarker` — milestone context string supplied by the producer (quest chapter, act marker). Free-form; v1 producers pass quest chapter or `'town'`.
- `eventId` — derived `${chapterMarker}:${seq}` for tooling/debugging.
- `npcIds` — array; multi-NPC events are recorded ONCE and are visible to every listed NPC (step-2 suite enforces this).
- `type` — one of the taxonomy in §2.3.
- `payload` — free object; per-type conventions below.
- `spoilerTag` — `null` or a tag id; the export system's spoiler gate keys off this. The projection filter (`spoilerFilter: 'safe'`) already has a suite contract.

### 2.2 Storage and ownership

- Home: `store.persistent.npcs.eventLog` (array, append-only) + `store.persistent.npcs.eventSeq` (number). This is a new persisted branch → **typed methods on GameManager** (POT-012), NOT `set()`:
  - `logNpcEvent({ npcIds, type, payload, spoilerTag?, chapterMarker? })` → returns the stored event or `null` (validation failure logs loudly — fail-closed philosophy).
  - `getNpcEventsForNpc(npcId, opts)` / `getNpcEvents(opts)` → projection queries.
  - `clearNpcEvents()` — dev/test only.
- Validation (fail-closed, logged, event rejected): `npcIds` non-empty string array; `type` in taxonomy; `payload` present object (or null for type conventions that allow it); `spoilerTag` string or null. Unknown `type` is rejected loudly — authors get signal, not silence.
- **Append-only:** no producer ever edits/deletes entries. memoryCheckpoints (§4, later) are read-side indexes over this log, never write filters.
- **Save-versioning:** v5 migration adds the three fields (`eventLog: []`, `eventSeq: 0`) to existing saves; older saves boot clean. This is the additive-journal precedent (§21 chunk 3) with one version bump.
- **No new content file.** The log is runtime state, not content; it joins neither `loadAll()` nor the generator registry (orphan-guard rule applies only to content files).

### 2.3 Event taxonomy (v1 producers)

| type | producer (bus listener) | payload |
|---|---|---|
| `dialogueChoiceMade` | `townContent` topic selection (§3.5) | `{ conversationId, choiceId }` |
| `npcTalkedTo` | existing `npc:talked` emit (greeting opened) | `{ npcId, conversationId }` |
| `questCompleted` | existing `quest:completed` | `{ questId }` |
| `giftGiven` | affection increments from dialogue topics (v1 proxy for gifts) | `{ itemId: null, affection: n }` |
| `flagSet` | selective: only `dialogue`-authored `flag:` topics | `{ flagId }` |

Curation principle (from §4): only narratively meaningful events are logged. In v1 that means: choices made in dialogueSets (not every hover/talk), quest completions, and dialogue-flag sets. `npcTalkedTo` is logged once per openDialogue (the existing emit point), which keeps spam bounded.

### 2.4 Producers: centrally registered, no per-feature saves

- All log-writing producers are **bus listeners registered centrally in NPCSystem.init()** (`npc:talked`, `quest:completed` already exist as events). Dialogue choice logging happens at the single selection point (§3.5), not sprinkled through handlers.
- **No new autosave behavior.** The log rides the existing flush machinery: town heartbeat (15s), event checkpoints, lifecycle saves. `logNpcEvent` marks the store dirty; it never calls `save()` itself. This keeps the §21 central-registration rule and the double-listener rule intact.

---

## 3. NPCSystem (runtime)

### 3.1 Home and construction

- New file: `public/systems/npcSystem.js` (classic script, loaded **after** conditionEngine.js and progression.js; before quest.js consumers as needed).
- Exposes `class NpcMemoryLog` and `class NPCSystem`; `globalThis` bridges (same dual-environment pattern as conditionEngine.js — Node can import it for the pipeline/tests).
- Instance home: `game.npcSystem` (constructed in Game init where companion/affection systems live), with `gameManager.memoryLog` kept as the canonical write/query surface for tooling.

### 3.2 Data model (content, in npcs.json)

NPC entries gain OPTIONAL fields (absent = legacy behavior, zero migration):

```json
"old_man": {
  "id": "old_man",
  "name": "Elder Rowan",
  "location": "city_root",
  "locationRules": [
    { "when": { "questState": "mq_02_clearing", "state": "active" }, "location": "graveyard_entrance" }
  ],
  "dialogueSets": [
    {
      "id": "old_man_main",
      "when": { "any": [ { "flag": "graveyard_cleared" }, { "questState": "mq_02_clearing", "state": "active" } ] },
      "greeting": "You've seen the graveyard yourself now. What did you find?",
      "topics": [ { "id": "...", "text": "...", "response": "...", "affection": 1, "flag": "...", "close": false } ]
    },
    { "id": "old_man_fallback", "when": null, "greeting": "...", "topics": [ ... ] }
  ],
  "mood": { "base": "hopeful", "rules": [ { "when": { "questState": "mq_02_clearing", "state": "failed" }, "mood": "worried" } ] },
  "topics": [ ... legacy ... ]
}
```

- **`locationRules`** — ordered array, first-match-wins; the entry with `"when": null` (or the NPC's base `location`) is the unconditional fallback. Evaluator: `ConditionEngine` via `gameManager.evaluateCondition`.
- **`dialogueSets`** — ordered array; **first set whose `when` passes wins**; a set with `"when": null` is the **guaranteed unconditional fallback** (contract: an NPC ALWAYS has dialogue — the fallback rule from the compilation). Legacy `topics` at the NPC root are treated as an implicit final fallback set (`id: legacy_topics`).
- **Topic fields** — unchanged legacy fields plus optional `when` (per-topic condition), optional `dialogueSetId` (id for conversation logging). Topic evaluation order: set filter, then per-topic `when`, then topic-level `close`/`flag`/`affection` handling exactly as today.
- **`mood`** — `{ base, rules: [{ when, mood }] }`; resolved on demand; v1 use: mood is stamped into `payload.mood` on logged events (the mood *layer*, not mood *effects*).

### 3.3 Resolution APIs

- `npcSystem.resolveLocation(npcId)` → location id (first-match-wins; fallback = NPC base location; unknown npc → null).
- `npcSystem.selectDialogueSet(npcId)` → `{ id, greeting, topics }` (first passing set; guaranteed fallback; unknown npc → null).
- `npcSystem.selectTopics(npcId)` → filtered topic array for the winning set (per-topic `when` applied; combinator conditions through the engine; reserved-type conditions fail closed and log).
- `npcSystem.getMood(npcId)` → mood string (base or first passing rule).
- All reads go through live context: `gameManager.buildConditionContext()` — no snapshot copies.

### 3.4 locationManager + town integration (thin, non-breaking)

- `getNPCsAtLocation` keeps its signature and returns the same data shape. Optional integration: when `game.npcSystem` exists, it consults `resolveLocation(npcId)` before the static `npc.location` check — making locationRules effective everywhere NPCs are listed. Guarded so legacy boot order (npcSystem absent) behaves exactly as today.
- `TownContent.openDialogue` uses `selectDialogueSet`/`selectTopics` when `npcSystem` is present, falling back to `npc.topics` verbatim otherwise. The greeting/choices/typewriter flow, dog dialogue, quest `npc:talked` emit — all unchanged.

### 3.5 Choice logging (the single selection point)

In `showChoices`, the click handler for a chosen topic emits:
`this.eventBus.emit('npc:dialogueChoice', { npcId, conversationId: <winning set id>, choiceId: topic.id, mood })`.
NPCSystem listens, stamps the current chapter marker, and calls `gameManager.logNpcEvent(...)`. One emit point, one listener — no per-topic writes.

### 3.6 Chapter marker

`npcSystem.setChapterMarker(marker)` (default `'town'`). Quest completion listener stamps `chapter:<n>` from the completed quest's `chapter` field. Free-form string; consumers should treat it as opaque ordering context.

### 3.7 Dev Condition Inspector (house style)

`window.__NPC_DEBUG__` with:
- `evaluate(npcId)` → `{ location, locationRuleId, dialogueSet, mood, topics: [...] }` — full resolution trace for one NPC.
- `explain(npcId)` → per-dialogueSet `when` with pass/fail (helps authors see WHY a set didn't win).
- `log(npcId, opts)` → the memory-log projection for one NPC.
- Plus a data-shape summary: `__NPC_DEBUG__.schema()` → the topic/dialogueSet/locationRule field reference (self-documenting content format).

---

## 4. Engine extension points (unchanged from Step 1)

`time`, `dialogueChoice`, `location`, `season` remain **registered-but-rejected** in ConditionEngine. Implementing them is explicitly OUT of v1 scope; when landed later they must land in the engine, not as feature-local forks. The spec's conditions therefore use only `flag` / `questState` / `affectionTier` / combinators today. (A future `dialogueChoice` condition will read the memory log — registered now as the planned bridge.)

---

## 5. Content migration (reference implementation)

- `old_man` gets: `dialogueSets` (one gated post-graveyard set — the flag the existing topics already set), a `locationRule` demonstrating first-match-wins, and `mood` rules. **Legacy root `topics` remain and serve as the guaranteed unconditional fallback** via the selection mechanism's legacy synthesis — zero content duplication. Explicit `"when": null` fallback sets are supported for NPCs that want fallback content DIFFERENT from their root topics; not needed here.
- No other NPCs change (fallback rule keeps them 100% legacy). `content:sync` regenerates the mirror; pipeline validation (condition objects in NPC content go through `ConditionEngine.validate()` at build time, same as quest gates — generator edit).

---

## 6. Testing contract (suite + trace)

`tests/suites/step2_npc_system.cjs` (already strict-gated) enforces:
1. `resolveLocation` first-match-wins + fallback.
2. Log append grows size by exactly the appended count; multi-NPC events visible to every listed NPC; type projection; `seq` strictly monotonic.
3. **Round-trip:** append → save → reload → still queryable (suite uses `page.reload()` after the harness storage fix — fresh-browser boot can never see a prior save).
4. Spoiler filter excludes tagged events when set.
5. Suite updated for real APIs (no `window.__pickTestNpc__` fantasy): uses `old_man` + injected test NPCs through the real registration path; no page/console errors.

Regression trace (112 checks) must stay green; `run_all --strict` goes all-green when this step lands.

## 7. Risks / notes

- **POT-012 discipline:** the three new persisted fields ship as typed methods only; `WRITABLE_PATHS` stays untouched (five paths, complete live map).
- **Boot order:** npcSystem loads after progression.js (needs GameManager at construct time? No — constructed with references, no construct-time store access; init() registers bus listeners once).
- **Double-listener rule:** NPCSystem.init() registers each listener exactly once; re-init guarded.
- **Log growth:** choices + talk events only → tens per session, not thousands; no compaction needed for v1 (recorded decision, §4's own curation principle).
