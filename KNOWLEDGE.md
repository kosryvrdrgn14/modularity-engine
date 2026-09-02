# KNOWLEDGE.md — Working Agreement (Human + AI)

This file is the standing contract for how we work together on this project.
Read it at the start of every session. When a request conflicts with a rule
here, flag the conflict instead of silently picking one side.

---

## 1. Every non-trivial task starts with a stated plan — no exceptions

Before writing or editing code for anything beyond a one-line fix, post a short
plan: what will change, which files, what could break, and how it will be
verified. Wait for a go-ahead on anything that touches more than 2-3 files or
any shared system (event bus, save data, data schemas).

This is not optional based on how the request was phrased. A vague prompt
("add a shop") is not license to skip the plan — it's a signal to propose one
and ask a clarifying question if genuinely ambiguous, not to fill the gap
silently and start building.

**Never "yolo" a multi-file or multi-system change.** If you notice yourself
about to touch more than 3 files without having stated a plan first, stop and
state the plan before continuing.

## 2. File size discipline

- No file should exceed ~2,000 lines. Split proactively when a file crosses
  this, not after it's already causing problems.
- Before adding significant new code to an existing file, check its current
  size. If it's near the threshold, split first, then add the feature.
- `game2.html` grew to 10,519 lines before this rule existed. That single
  fact caused most of the debugging pain on this project — the level-3
  upgrade freeze took 3 sessions to diagnose specifically because the file
  was too large to hold in context while tracing it.

## 3. Specs are written just-in-time, not in bulk

- Write the spec for the feature you're about to build this session or next.
  Do not write specs for features more than 1-2 sessions out.
- Max 3 active/unimplemented spec documents at once. If a 4th is needed,
  either implement one of the existing 3 first, or merge overlapping specs
  together instead of creating a new file.
- Before creating a new doc, check whether an existing doc already covers
  this topic. If yes, edit that doc — don't create a second "audit" or
  "plan" or "report" doc on the same subject. (This project accumulated 4
  separate audit docs and 3 separate split-plan docs before this rule.)
- `MASTER_DESIGN.md` is the only long-form doc that should be read in full
  regularly. Everything else gets searched by keyword, not read end to end.

## 4. Write one, test one

Never batch more than 2-3 small changes without running verification in
between. After each meaningful change:
- Run the type check / syntax check.
- If the change touched HTML+JS wiring (new buttons, overlays, event
  listeners), manually confirm the specific element exists and the specific
  listener fires — don't assume from reading the code that it's wired
  correctly.
- If a smoke test exists for the touched area, run it before moving to the
  next change.

## 5. Mandatory post-refactor verification checklist

Any time a file is split, renamed, or has code moved out of it, run ALL of
these before considering the refactor done:

- [ ] `node --check` (or equivalent) on every file in the actual load order,
      reassembled — not just each file in isolation.
- [ ] Grep the whole codebase for every `getElementById`, `querySelector`,
      and similar DOM lookup. Confirm every target ID/selector still exists
      somewhere in the HTML. (The shop overlay bug happened because this
      step was skipped — the button worked, but its overlay's HTML had been
      silently deleted during the split.)
- [ ] Grep for every name that was moved/renamed. Confirm no dangling
      reference to the old location remains anywhere, including in files
      that weren't part of the direct refactor.
- [ ] Delete or clearly quarantine any file made obsolete by the refactor
      immediately — don't leave old and new versions of the same logic
      sitting side by side. (34 orphaned files accumulated in `engine/`
      this way, one of which was missing a bug fix that was live everywhere
      else — a real regression trap, not just clutter.)

## 6. Defensive patterns, applied from the start on new code

- Every event-bus dispatch loop wraps each individual listener call in its
  own try/catch, logging which listener and which event threw. One
  listener throwing must never silently prevent other listeners on the same
  event from running. (This exact gap caused the level-3 upgrade freeze —
  an audio listener threw, silently killing the actual upgrade-selection
  logic registered after it, with zero console output.)
- Any code that looks up data by array index into a content list (e.g.
  `weapons[0]`) is a latent bug once that list can be reordered or extended.
  Prefer lookup by stable ID over positional index for anything content-driven.

## 7. One source of truth per data type

If the same data (weapon stats, enemy stats, NPC data, anything
content-driven) could plausibly end up in two files, it must not. Before
adding a new data file, check whether this data already lives somewhere
else. If migrating data to a new location, delete it from the old location
in the same change — don't leave both.

## 8. Scaffold-first for cross-system features; skip it for isolated content

- If a new feature touches 3+ existing systems (event bus, save/persistence,
  UI screens, dialogue, etc.), build the skeleton first: stub functions,
  wired-up event hooks, empty UI containers that render but do nothing real
  yet. Verify the skeleton loads and connects correctly before writing real
  logic inside it.
- If a new feature is self-contained content (a new weapon, enemy, stage)
  that only requires adding entries to existing data files, skip
  scaffolding — the content-driven architecture already makes this safe.

## 9. Orphan and doc hygiene, on a schedule

- After any significant refactor session, do a quick pass: any file not
  referenced by anything else? Delete it or flag it explicitly for review
  in the same session, not "eventually."
- Periodically (roughly weekly, or after any major feature lands) check for
  documents that now say something MASTER_DESIGN.md contradicts. Update or
  archive the stale one immediately rather than letting drift accumulate.

## 10. When context is running low

Estimate roughly how much context a task will need before starting. If it
looks like it'll consume most of what's left, say so and either defer the
task to a fresh session or explicitly scope it down — don't push forward on
a shrinking budget and risk acting on a partial view of the codebase. This
is exactly how the false circular-dependency analysis happened: an
architecture claim was made without the room left to actually verify it
against the current source.

## 11. Watch for confusingly similar object names

This project has three objects with easily-confused names:
- **`Game`** — the main orchestrator, owns `this.dataManager`
- **`GameManager`** (commonly held as `this.gameManager`) — save data, flags,
  currency (`systems/progression.js`)
- **`DataManager`** (commonly held as `this.dataManager`) — JSON content
  loading (`engine/core.js`)

`Game.gameManager !== Game.dataManager`. Before passing a dependency by a
variable named `gameManager` or `dataManager`, verify which actual class
instance it refers to — don't assume from the name alone. This exact mixup
caused the town screen to render empty after the location/NPC schema
migration: `LocationManager` received `GameManager` where it needed
`DataManager`, and the two objects share no properties, so the failure was
silent rather than a crash.

If a constructor needs two or more same-shaped dependencies (multiple
"manager" objects), prefer a destructured options object over positional
arguments — swapping positional argument order is an easy, silent mistake
with no type system to catch it.
