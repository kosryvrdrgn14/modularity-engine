# Calendar & Time System — Design Spec

**Status:** Spec written 2026-09-14 (spec-first per project convention). Implementation pending owner go.
**Depends on:** Step-1 ConditionEngine (`time`/`season` are registered-but-rejected reserved types — this system is their implementation), Step-2 canonical memory log (additive day stamp), content pipeline (new content file), store migration discipline (additive v7).

---

## 0. Locked decisions (do not relitigate without owner)

1. **Event-driven days, never wall-clock.** The day advances when content/systems say so — combat runs, quest completions, story timeskips (coma, chapter jumps), and later, per-turn once a turn is defined. No real-time simulation, no offline elapsed time, no AFK dependence.
2. **Modular engine, default content.** The engine is calendar-agnostic; a "unique fantasy calendar" and the "plain 4-season default" are the same engine with different `calendar.json` content. v1 ships the simple default; exotic calendars are content edits later.
3. **Seasons resolve: base calendar → region biome schedule → event modifier.** Biome/area determines a region's season schedule; events modify on top.
4. **Modifier resolution — STACKED-BY-FIELD, ORDERED-WITHIN-FIELD:**
   - `seasonOverride` fields resolve **first-match-wins** among passing modifiers (list order in `eventModifiers` = priority — identical to `locationRules`/`dialogueSets`/`mood.rules`; zero new ordering concepts).
   - `festivals`/flags/duration extensions **stack** (union across all passing modifiers).
   - Canonical illustration: while `blight` (listed first) is active, the `harvest_festival` modifier cannot override the season — blight wins the season field — but the festival still **stacks**: it is celebrated during the blight. Content can author against that exact combination: `{"all": [{"seasonIs": "blight"}, {"festivalIs": "harvest_festival"}]}`.
5. **`seq` remains the memory log's ordering spine.** Day is an additive stamp on events (absent = "pre-calendar history"); `chapterMarker` continues to carry milestone context. Spoiler cutoffs and memoryCheckpoints keep keying off `seq`, never off day.
6. **Farming stays decoupled in v1.** Farming timers are a separate loop (owner is redesigning it toward "fast clear = full rewards, no wait"); a farming cycle is not a story day. Revisit only after both systems have shipped and been felt together.
7. **POT-012 discipline:** all time writes go through typed methods (`advanceDay()`); no new `WRITABLE_PATHS` entries; `persistent.time` joins via one additive migration bump (v7).

---

## 1. Purpose & Scope

Gives the story temporal awareness: a date label for memory/export context, seasons that drive content conditions (dialogueSets, quests, availability), festivals, and story-controlled timeskips — all data-driven so a bespoke fantasy calendar is a content change, not a rearchitecture.

**In scope (v1):** calendar content file, `TimeService` + `GameManager.advanceDay()`, `season`/`festival`/`time` condition types in the shared evaluator, event day-stamping, memoryCheckpoint/export date context, default calendar content, suite.

**Out of scope (v1):** per-turn advancement (reserved — needs the turn definition first), farming-time integration (decision #6), cross-save or global calendars (per-save only, like the memory log), real-world time in any form.

---

## 2. Content: `public/content/calendar.json`

Registered in `DataManager.loadAll()` (key `calendar`) and the generator registry — 16th content file, matching the add-a-content-file convention (orphan guard hard-errors otherwise).

```json
{
  "_note": "Default calendar. Replace months/seasons with a bespoke calendar later — engine is content-agnostic.",
  "calendar": {
    "name": "Common Reckoning",
    "epochLabel": "Day 1 of the Refuge",
    "months": [
      { "id": "seedfall", "days": 28 },
      { "id": "highsun",  "days": 28 },
      { "id": "emberfall", "days": 28 },
      { "id": "deepfrost", "days": 28 }
    ],
    "daysPerWeek": 6,
    "weekdayNames": ["firstday", "workday", "midday", "marketday", "eve", "restday"]
  },
  "seasons": {
    "default": {
      "byMonth": { "seedfall": "spring", "highsun": "summer", "emberfall": "harvest", "deepfrost": "winter" }
    },
    "schedules": {
      "eternal_dusk": { "fixed": "dusk" }
    }
  },
  "regionBiomes": {
    "town": "default",
    "graveyard": "eternal_dusk",
    "forest": "default"
  },
  "eventModifiers": [
    {
      "id": "blight",
      "when": { "flag": "blight_active" },
      "seasonOverride": "blight",
      "summary": "The land sickens; crops blacken on the stalk."
    },
    {
      "id": "harvest_festival",
      "when": { "flag": "harvest_festival_active" },
      "festivals": ["harvest_festival"],
      "summary": "Lanterns in the camp; the Bazaar stays open late."
    }
  ],
  "daySources": {
    "combat_run_complete": 1,
    "quest_completed": 1
  }
}
```

- **`months`/`daysPerWeek`** drive `getDateLabel()`; any positive lengths work (10-month fantasy calendars, leap-days-as-months, whatever).
- **`seasons.default.byMonth`** — the base mapping. `seasons.schedules` — named alternative schedules (fixed or `byMonth`) that biomes can point at; a region's schedule may be `"default"`.
- **`regionBiomes`** — region id → schedule id. Unknown region falls back to `"default"` (fail-soft for content that hasn't caught up, with a dev-mode console note, NOT a silent guess: log once per unknown region).
- **`eventModifiers[].when`** — a standard ConditionEngine condition (validated at build time by the generator, same as quest/NPC `when`s). Fields a modifier may set: `seasonOverride` (single string), `festivals` (array — stacks), `flags` (array — stacks). Unknown fields → build-time validation error.
- **`daySources`** — named day-delta table so even *how much* a day advances is content. Missing source key → no advance (explicit over implicit).

---

## 3. State & API

**State (store v7, additive):**

```json
"persistent.time": { "currentDay": 1, "skipLog": [] }
```

- `currentDay` — the single source of truth. Starts at 1.
- `skipLog` — bounded audit trail of non-default advances (`{ days, source, atDay }`), capped at 50 entries (drop oldest). Combat/quest advances (from `daySources`) are NOT logged — only story timeskips and unusual jumps. This keeps timeskips debuggable without spamming the save.
- Modifier state: **none.** Modifiers are stateless — active when their `when` passes. (Duration via flag lifecycle or future `durationDays` field — reserved, rejected in v1 with the standard reserved-type message.)

**`TimeService` (new, `public/systems/calendarTime.js`):**

- `constructor({ gameManager, eventBus, content })` — store-resolved per call (BUG-026 class), no construct-time store writes.
- `getCurrentDay()` → int
- `getDateLabel()` → `"Day 34, Emberfall (mid-week), Year 1"` — year derived from total days ÷ month total; mid-week/marketday from `daysPerWeek`.
- `getSeason(regionId?)` → resolved season string. Resolution order: event modifiers (first-match-wins on `seasonOverride`) → region biome schedule → `seasons.default`. No region param = player's current region (`store.world.currentRegion`).
- `getFestivals()` → stacked union of `festivals` from ALL passing modifiers.
- `getActiveModifiers()` → ids of passing modifiers (for the dev inspector).
- `getDateContext(day?)` → `{ day, season, festivals, label }` for stamping/exports.

**`GameManager.advanceDay(days, source)`** — THE typed write path:

- Validates `days >= 0` integer; `source` must be a string. `source` not in `calendar.daySources` and `days === 0` → no-op. Explicit story skips use `source: 'story_skip'` with explicit `days` (always logged to `skipLog`).
- `source` in `daySources` → advances by the content delta (e.g. `combat_run_complete: 1`).
- Marks dirty; emits `time:dayAdvanced { fromDay, toDay, source }` on the bus (producers may listen — e.g. future time-events; NO listener here triggers saves, §21 rule).
- Called from: combat end handler (`_handleGameOver`/victory path, source `combat_run_complete`), quest completion listener (source `quest_completed`), story beats (explicit skips).

---

## 4. Condition types (shared evaluator — no forks)

Implements the reserved types in `ConditionEngine`. Variants:

| Condition | Meaning |
|---|---|
| `{"season": {"is": "harvest"}}` | resolved season (current region) equals value |
| `{"season": {"is": "harvest", "region": "graveyard"}}` | resolved season of an explicit region |
| `{"festival": {"active": "harvest_festival"}}` | festival is in the stacked active set |
| `{"time": {"dayAtLeast": 34}}` | `currentDay >= n` (ordering threshold only) |

- Context: `buildConditionContext()` gains `{ time: { currentDay }, season: <current-region season>, festivals: [...] }` — conditions read through TimeService when wired, else fail-closed (`false` + loud `[CONDITION]` note) exactly like every other missing-dependency path.
- `validate()` stops rejecting these three types; `dialogueChoice` stays reserved (its implementation is the separate dialogue-memory follow-up).
- Generator: quest + NPC `when` validation automatically gains these types via the engine — no pipeline change beyond calendar.json's own schema validation (new small section: months positive, byMonth values are strings, modifier fields known, `when` conditions validate).

---

## 5. Memory log & export integration

- **Event stamp:** `NpcMemoryLog.append()` adds `day: store.persistent.time?.currentDay ?? null` at append time. Read from the SAME store the log already resolves — no new dependency, no service injection. Additive; `validateSpec` stays permissive (day optional, must be a positive number when present).
- **memoryCheckpoint labels** gain day context when the cutoff event has one: `"Emberfall: completed 'clear_the_well' (Day 34, harvest)"`.
- **Export card context line** (§10 output): derived from the day of the latest included fact — `"— Day 34, mid-Emberfall, harvest season —"`. Pre-calendar facts contribute no line (absent day = absent context, never invented).
- Facts' `_factFromEvent` may surface `day` in long-form exports later; v1 keeps facts text unchanged except the single context line.

---

## 6. Testing plan (suite: `tests/suites/calendar_time.cjs`)

Real state transitions only (BUG-031 rule — no method-existence probes):

1. Day advances via `advanceDay(1, 'combat_run_complete')` (content-driven delta) and explicit `advanceDay(30, 'story_skip')`; store persists both; `skipLog` records only the skip.
2. **Season boundary flip:** set day to a month boundary via skip → `getSeason()` changes exactly at the boundary.
3. **Region biome:** `getSeason('graveyard')` returns `dusk` while town is `spring` (schedule override works).
4. **Modifier rule (the locked decision):** set both `blight_active` and `harvest_festival_active` → `getSeason('town')` = `blight` (first-match-wins on seasonOverride — blight listed first) AND `getFestivals()` includes `harvest_festival` (stacking). Reorder test data in a second check to prove order is what decides, not flag order.
5. **Conditions end-to-end:** NPC/quest-style conditions `{"season": ...}`, `{"festival": ...}`, `{"time": ...}` route through `evaluateCondition` and flip as state changes; malformed variants fail closed.
6. **Log stamping:** append an event post-advance → stored `day` matches; append in a pre-calendar store shape → `day` null, no crash.
7. **Export context line** present with day-stamped history, absent on empty/pre-calendar.
8. **Migration:** plant a v6 store → boots clean as v7 with `persistent.time.currentDay === 1`; regression trace untouched (>= assertions).
9. **Label round-trip:** `getDateLabel()` contains the right month name and day-of-month arithmetic across a multi-month skip.

Detector: `window.game.timeService` / `window.__STEP_CALENDAR__`. Registered in `run_all.cjs` alongside the step suites (skip-safe until implementation lands, strict-enforced after).

---

## 7. Future hooks (reserved, not built)

- **Per-turn advancement:** once a combat "turn"/encounter is formally defined, add source key `turn_complete` to `daySources` — no engine change.
- **`durationDays`** on modifiers (self-expiring events) — rejected in v1 with the reserved-field message.
- **Time-events:** `schedule:tick` listener (deferred since Step 2) can now subscribe to `time:dayAdvanced` for aging crops/festivals-by-date.
- **Bespoke calendar content:** replace `calendar.json` fields only. The engine never learns calendar specifics.
