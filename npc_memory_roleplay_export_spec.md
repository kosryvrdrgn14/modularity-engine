# NPC Memory & Roleplay Export System — Design Spec

**Status:** Draft — intentionally detailed/"overkill" per design decision, to be pruned after the
simulation testing plan (§9) surfaces which parts actually matter in practice. Do not treat every
field here as final; treat the *shape* of the system as the thing worth getting right early.

**Naming (locked 2026-09-14):** this system's curated history points are **memoryCheckpoints**.
The bare word "checkpoint" is owned by the auto-save system's event checkpoints
(MASTER_DESIGN §21, `engine/game.js`); it must not be reused here. All references below and in
`data_driven_systems_compilation.md` use the new term.

**Relationship to other systems:** This reuses infrastructure already specified elsewhere rather
than duplicating it — the condition/gate engine (originally scoped for quest and location
availability), the affection tier system, and the wife-network relationship data. Building this as
a third independent consumer of that shared engine is the point; do not fork a second condition
evaluator for this feature.

---

## 1. Purpose & Scope

Lets a player generate a portable, roleplay-ready "character card" for any datable NPC, at any
point in their shared history, for use in an external AI chat tool of the player's choosing
(single-character or, via favoriting a set, multi-character group scenes in tools like Odysseus
that support multiple independent personas in one conversation).

**Hard architectural boundary:** this system must be fully decoupled from live gameplay session
state. It reads only from the save file's persisted event log (§2) and must be usable from the
title screen without loading into an active game session. Do not let any part of this feature
depend on `Game`, `GameLoop`, or any in-session-only object.

**Out of scope (deliberately):** anything that happens *after* the exported text leaves the
Copy button. What the player does with an external AI tool is outside this system's
responsibility once the card is generated.

---

## 2. Event Log (event-sourced NPC history)

Every narratively meaningful thing that happens to an NPC is recorded as an append-only,
timestamped event — not as an overwritten flag. Current state is *derived* from this log, never
stored as the primary source of truth.

### 2.1 Event record shape

```json
{
  "eventId": "evt_00042",
  "chapterMarker": "ch2_necromancer_trial",
  "npcIds": ["elena"],
  "type": "questCompleted",
  "payload": { "questId": "free_elena_from_lich", "playerChoice": "showed_mercy" },
  "spoilerTag": "elena_true_backstory_revealed",
  "seq": 47
}
```

- `npcIds` is an array, not a single ID — events involving multiple characters (a joint gratitude
  quest, a group festival moment) are recorded once and are visible to every relevant NPC's log,
  not duplicated per character.
- `spoilerTag` is optional but strongly recommended on any event that reveals significant lore —
  this is what the gate engine keys off of when deciding what a given memoryCheckpoint's export may
  safely include (§6).
- `seq` is a per-save monotonic counter (groundwork decision, 2026-09-14): it exists purely for
  ordering and log replay and carries no wall-clock meaning. Milestone context comes from
  `chapterMarker`. There is no in-game calendar system; §11's timestamp question is closed by
  this choice.

### 2.2 Event type taxonomy (starting set — expect this list to grow with content)

`affectionTierChange`, `questCompleted`, `giftGiven`, `dialogueChoiceMade`, `letterReceived`,
`estateQuestCompleted`, `gratitudeQuestCompleted`, `disasterResolvedTogether`, `festivalAttended`,
`married`, `childBorn`, `warfrontAssisted`.

### 2.3 Storage

Per-save-file only, append-only. Do not design for a cross-save or global log — scope is one
player's one playthrough. This keeps the log bounded and avoids a whole separate class of
cross-save-consistency problems nobody needs.

### 2.4 Save versioning

This is new persisted data. It must be included under whatever save-schema-versioning discipline
gets built (see the earlier backend recommendations) from the moment this feature ships, not
retrofitted later.

Groundwork note (2026-09-14): the save layer already versions and migrates persisted content
(GameManager `_migrate`, `save_version` 4 in systems/progression.js) and stores one JSON document
per slot (`vs_save_slot_N`). The append-only log joins that mechanism at ship time, which also
satisfies §2.3's self-contained-per-save requirement.

---

## 3. MemoryCheckpoints

A memoryCheckpoint is a **named, curated** point in an NPC's (or NPC group's) history — not every event
becomes a memoryCheckpoint, or the list becomes unusable noise.

### 3.1 MemoryCheckpoint record shape

```json
{
  "memoryCheckpointId": "elena_ch2_trial_complete",
  "npcIds": ["elena"],
  "label": "Ch2: Trial of the Necromancer — Complete",
  "eventCutoff": "evt_00042",
  "autoGenerated": true
}
```

- `eventCutoff` marks "replay the log up through this event" — this is how a snapshot at this
  memoryCheckpoint gets reconstructed.
- `autoGenerated: false` should be reserved for a possible future "manual memoryCheckpoint" feature
  (player-triggered "save a memory of right now") — not required for v1, but worth reserving the
  field now so it isn't a breaking schema change later.

### 3.2 What qualifies as memoryCheckpoint-worthy (curation policy)

Auto-generate a memoryCheckpoint on: affection tier changes, quest chain completions (especially the
Interest→Respect→Trust→Claim beats), marriage, and any event tagged with a `spoilerTag`. Do
**not** auto-generate one for every gift or every letter — those stay as plain log events,
readable when reconstructing state, but not surfaced as their own selectable point in the
history menu.

### 3.3 Naming convention

Settle this now, in writing, before content scales past a handful of characters:
`"[Chapter/Arc marker]: [Milestone] — [State]"`. Consistency here matters more than the exact
format chosen — a mixed convention across 50+ characters' histories is worse than any single
reasonable one applied uniformly.

---

## 4. Favorites

A favorite is a **(memoryCheckpoint-set, NPC-set) pair**, not a single NPC — this is what enables both
the single-character use case and the group-scene use case from the same data structure.

```json
{
  "favoriteId": "fav_00007",
  "memoryCheckpoints": [
    { "npcId": "elena", "memoryCheckpointId": "elena_ch2_trial_complete" },
    { "npcId": "spider_queen", "memoryCheckpointId": "spiderqueen_claim_tier" }
  ],
  "customLabel": "Winter Festival Y1 crew",
  "dateFavorited": "..."
}
```

Note each NPC in a favorite can reference a *different* memoryCheckpoint for herself — a group favorite
doesn't require all members to be "at the same point," just the specific points the player wants
to revisit together.

### 4.1 Title screen access

A dedicated, always-visible entry point on the title screen (not buried in a submenu), listing
favorites by custom label or auto-generated summary, sorted by recency by default. Selecting one
regenerates and displays/copies the card(s) for every NPC in that favorite, independently.

### 4.2 Empty state

A save with zero favorites (or very early game, minimal history) should show a clear, friendly
empty state — not a blank or broken-looking menu. Explicitly one of the required test scenarios
(§9.4).

---

## 5. Cross-Character Relationship Registry

A lightweight, first-class data set — not something inferred ad hoc per export.

```json
{
  "pair": ["elena", "spider_queen"],
  "relationshipType": "found_family",
  "sharedEventRefs": ["evt_00081", "evt_00120"]
}
```

- Auto-populated where possible: a joint gratitude quest or shared festival attendance should
  automatically create or reinforce a relationship record between the involved NPCs.
- Baseline relationships (e.g., general "sister-wives, generally warm" default per the no-jealousy
  house rule) can be seeded once as defaults, refined by actual shared events over time.
- This same registry serves the in-game wife-network system and this export feature — build once,
  consume twice.

---

## 6. Facts vs. Flavor

Two clearly separated data categories per character, combined only at generation time:

- **Flavor (static, authored once):** personality description, voice/speech quirks, a small set
  of canonical example lines pulled from her actual in-game dialogue, physical description.
- **Facts (dynamic, derived per memoryCheckpoint):** everything reconstructed by replaying the event log
  up to the memoryCheckpoint's cutoff, filtered through the spoiler gate (§7).

This split keeps generation cheap — flavor never needs recomputation; only the facts section is
re-derived per memoryCheckpoint/character combination.

---

## 7. Spoiler Gating

Reuses the existing condition/gate evaluator (the same engine backing quest and location
availability) as a third consumer. Query shape: *"given this memoryCheckpoint's event cutoff, which
facts/events are safe to include?"* An event's `spoilerTag` (§2.1) is checked against what's been
revealed as of the cutoff — no separate spoiler system, no separate logic to maintain.

---

## 8. The Constraint Model ("negative prompt" layer)

Framed as behavioral constraints, written positively where possible (a receiving model of unknown
capability follows "stays guarded until trust is earned" more reliably than "never acts overly
friendly").

### 8.1 Universal base template (applies to every exported card)

**In-character consistency:**
- Spoiler containment — never reference or act on facts not yet revealed as of this memoryCheckpoint.
  *Generated directly from the gate evaluator's output for this checkpoint — not hand-written.*- Relationship-status accuracy — behavior matches the actual affection tier/marital status at this memoryCheckpoint, not any later or earlier state.
- **No jealousy, ever, between other established characters.** State this explicitly and
  directly — an external model's genre-default instinct without this line is to invent rivalry
  drama, which directly contradicts this project's house rule. This matters most exactly in the
  group-scene use case this feature is built for.

**Meta / immersion boundaries:**
- Never acknowledges being an AI or language model.
- Never references backend/game-mechanical terms (affection tier, unlock condition, stat values)
  directly in dialogue.
- Treats the snapshot as a starting point for improvisation, not license to override established
  canon facts.

**Responsible boundaries:**
- A brief context line establishing this is adult fictional roleplay content, generated for a
  player who unlocked it in-game.
- **Inherits the game's own existing content boundaries exactly, does not create a loophole
  around them.** Characters excluded from romantic content in-game (e.g., any parent/child
  dynamic) either have no export option at all, or an export explicitly scoped away from romantic
  or intimate framing. This is not a new rule — it is making sure a decision already made
  correctly doesn't quietly stop applying once content leaves the game's own interface.

### 8.2 Per-character additions

Personality-specific bounds layered on top of the base template — e.g., a naturally shy Tier 1
character constrained against sudden assertiveness without in-story cause; a Tier 3 character
constrained against referencing lore/domains she has no established connection to. Same
data-driven pattern as everything else in this project: one shared base, characters supply the
delta.

---

## 9. Testing & Validation Plan (no code required)

Purpose: before any of the above gets built, validate the *shape* of the constraint model and
card format by hand, against real models, using written scenarios only. This is what makes
"overkill on the first draft, prune after simulation" an actual process rather than a slogan.

### 9.1 Test subjects (deliberately small, deliberately varied — do not test all 50+ characters)

1. A fast Tier 1 romance with minimal memoryCheckpoint history.
2. A hard-route Tier 3 character, at a memoryCheckpoint *before* her arc resolves.
3. A three-character group favorite spanning different affection tiers with each other and the
   player.
4. An early save with zero favorited memoryCheckpoints (menu/empty-state check, not a conversation
   test).

### 9.2 Test scenario categories (run each against subjects 1–3 above)

| # | Test | What you're checking |
|---|---|---|
| 1 | **Baseline coherence** | Open with a neutral prompt. Does she sound like her voice bible without further prompting? |
| 2 | **Spoiler leakage** | Ask her directly, then via leading questions, about facts she shouldn't know yet at this memoryCheckpoint. Does she hold the line? |
| 3 | **Relationship-status accuracy** | Ask her to describe her relationship to the player. Does it match the memoryCheckpoint's actual tier — not over- or under-stated? |
| 4 | **Jealousy-trope resistance** *(critical for the group case)* | In the 3-character group test, explicitly try to provoke rivalry or jealousy framing. Does the found-family tone hold, or does it slide into genre-default drama? |
| 5 | **Meta-boundary** | Ask directly "are you an AI?" and ask about game mechanics (levels, stats, unlock conditions). Does she stay in-world? |
| 6 | **Personality drift over a long conversation** | Run 15–20 turns. Does she stay recognizably herself, or drift toward a generic "helpful assistant" tone as the conversation grows? |
| 7 | **Content-boundary check** | For any character where a content exclusion applies, confirm it holds under direct testing; for others, confirm a sane baseline. |

### 9.3 Cross-model variance

Run the *same* generated card and the *same* scripted prompts (tests 1–7) across at least two to
three meaningfully different receiving models — at minimum one frontier commercial model and one
smaller/local model (via Odysseus or similar), since the whole point of this feature is that the
receiving model is the player's choice, not yours. The goal is finding the realistic *floor* of
behavior, not just confirming it works great on the best available model.

### 9.4 Empty-state check

Separately, confirm the title-screen favorites menu on a fresh/near-empty save reads as
intentional and friendly, not broken.

### 9.5 Scoring

Simple per-test, per-model, per-subject scale (e.g. Pass / Partial / Fail with a one-line note) is
sufficient for pruning decisions — this doesn't need statistical rigor, it needs enough signal to
tell you which parts of §8's constraint model are pulling their weight and which are unnecessary
for a given character archetype.

### 9.6 What "done" looks like for this testing pass

Not "100% pass rate everywhere" — realistically, some smaller local models will fail some tests
regardless of prompt engineering. The bar is: identify which failures are (a) fixable by
rewording the constraint template, (b) acceptable/expected variance across model capability, or
(c) a sign the underlying data model (facts/flavor split, memoryCheckpoint granularity) needs a
structural change before implementation begins.

---

## 10. UX Flow Summary

- **In-game:** a scroll/book icon on an NPC's detail screen → preview of the current-state card →
  Favorite / Copy actions. Gated behind having *any* interaction history — no export option for a
  stranger.
- **Title screen:** dedicated favorites entry point → select a favorite → regenerate and
  display/copy card(s) for every NPC in that favorite, independently rendered.
- **Output format:** one canonical internal representation per generated card, rendered into
  plain copy-paste text by default; a structured card format for compatible external tools as a
  secondary renderer. New target platforms are new renderers, not rearchitecture.

---

## 11. Open Questions (carried forward, not blocking the test pass)

- ~~Exact `timestamp` convention~~ **RESOLVED (2026-09-14 groundwork):** events carry a per-save
  monotonic integer `seq` (ordering/replay only — no wall-clock meaning); milestone context comes
  from the existing `chapterMarker` field. No in-game calendar is built for this feature. See §2.1.
- Whether manual (player-triggered) memoryCheckpoints are worth adding in v1 or deferred — the
  schema already reserves room for it (§3.1, `autoGenerated: false`) either way. Naming is locked:
  **memoryCheckpoint** everywhere — the bare word "checkpoint" is owned by the auto-save system.
- Whether the structured-card renderer should target a specific existing convention or a bespoke
  format — worth revisiting once §9's testing surfaces what actually matters to real usage.