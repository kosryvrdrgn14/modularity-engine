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

## 2b. Step-gate testing rule (added 2026-09-14)

Every plan step ships WITH its regression suite, and no step is "done" while its suite
still reports SKIP:

- `node tests/run_all.cjs` = full autonomous pass: the 112-check regression trace plus one
  step-gated suite per plan step (compilation §6). Skips are loud and exit 0 while a step is
  unimplemented; `--strict` flips skips to failures once the step lands.
- Detection lives in `tests/lib/harness.cjs` (STEP_DETECTORS). When a step's real API lands
  under a different name than probed, update the detector — one line, deliberate.
- New infrastructure (evaluator, memory log, widget renderer) is NOT complete until its suite
  enforces the contract, including no-silent-fail behaviors and persistence round-trips.
- Reach-test the machine, not just the API (BUG-031): suites drive real state transitions
  (events fired, state machines walked), not only method existence.

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
- Never call `setState()` and ignore its boolean return (BUG-024). A rejected
  transition leaves the machine in the old state while the caller proceeds as
  if it succeeded — the split-brain behind the stuck-victory/ghost-run family.
  If a flow must work from ANY state (ending a run, returning to title), it
  goes through `GameState.transition(newState, { allowRestart: true })`, the
  single sanctioned force-path — never raw `this.state` writes, and never a
  second ad-hoc bypass.

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

---

## 12. The preview window refreshes constantly — treat memory as disposable

The Freebuff preview window reloads **almost continuously** while the agent
works (and 502 incidents can rotate the origin, which also wipes
localStorage, since it is scoped per-origin).

Consequences for how we build and verify:

- **Never rely on the user's preview holding state** across a turn — not
  screen state, not in-memory progress, not even localStorage guarantees.
- In-memory-only progress is lost on every refresh. Anything the player (or
  the user testing) would mourn losing must be **persisted at the moment it
  is earned**, not at the next natural save point (see MASTER_DESIGN §21).
- When the user reports "lost progress / reset state", first ask: refresh
  wipe? origin rotation? unsaved-progress window? — before suspecting slot
  or save-format logic (the Sep 5 slot trace showed slot machinery was fine).
- Automated browser tests must boot their own in-process server + fresh
  context and never assume anything about the live preview's storage.

## 13. Archived files are not part of the active codebase

`archive/` and `public/archive/` contain superseded/legacy files kept only
for historical reference. Never read, search within, or reference these
folders during normal development tasks — if a search or grep turns up a
result from either path, treat it as noise and ignore it. If a mechanical
exclusion (`.gitignore`, branch separation) doesn't seem to be filtering
these out in your current session, flag it rather than working around it
by manually filtering results each time.

## 14. Prefer targeted file access over broad search when search looks unreliable

If a search tool call returns unexpectedly broad or irrelevant results (noise
from unrelated directories, root-level clutter despite a scoped query), stop
retrying variations of the same search. Switch immediately to either:

- `read_files` on specific, already-known paths, or
- `rg`/`grep` via terminal with explicit `--glob`/`--exclude-dir` scoping.

Repeatedly retrying a search that's already shown signs of ignoring scope
wastes context without fixing the underlying issue.

Formal probe results and per-tool verdicts live in `TOOL_AUDIT_PLAN.md`
(probed Sep 6, 2026): `code_search` is UNTRUSTED (ignores `cwd`, leaks
`dist/` despite `.gitignore`), `glob` is CAUTION (intermittent recursion
faults), `read_files`/`write_file`/`list_directory`/`write_todos`/terminal
are TRUSTED.

## 15. Never write source files with inline shell one-liners (added 2026-09-14)

A malformed `node -e` one-liner wiped `public/styles.css` to zero bytes mid-session
(v2.7.0). It was recovered from the git object database — but the lesson is the
process, not the rescue:

- **Create/modify source files only with file tools** (`write_file`, `str_replace`).
  Shell is for inspection, builds, tests — never for file content.
- **If a shell write is ever unavoidable** (e.g. the file-tool sync layer refuses a
  path after an external write — this happened to `styles.css` and `game.js`), write
  the code as a reviewed, idempotent script in `tools/` that verifies its own result
  and exits non-zero on mismatch — never as an inline `-e` string.
- **`str_replace` can start refusing a file mid-session** after external tooling has
  written it, even when the target text verifies as present via `grep`/`node -e`.
  Don't fight it in a loop — fall back to the scripted pattern above.
- **`rm` of a tracked file is recoverable** — the blob lives in `.git/objects` (loose
  or packed). `tools/recover_styles_css.cjs` and `tools/audit_monolithic_backup.cjs`
  are working reference implementations for reading the object DB without git
  commands (git CLI is blocked in this environment).

## 16. The suite error net is a bug detector, not a nuisance (added 2026-09-14)

The game-log suite's first run failed its "no console errors" check because a
synthetic `levelUp` emit crashed `Game._checkWeaponUnlocks()` — a REAL latent bug
(any level-up outside combat threw inside the listener). Whitelisting expected
deliberate rejections is correct; silencing unexpected errors is how bugs hide.
When the error net goes red, diagnose before dismissing.

**Re-proven twice more (2026-09-23, v2.16.0):** the step2 suite's console-error net caught a
constructor signature slip (`clearPendingDisaster` dropped in a signature rewrite) before it
could ship, and the preview tool went RED on its own harness filter bug — the tool's RED is
also evidence about the tool, not just the code.

**Re-proven again (2026-09-24, v2.19.0):** the step7 suite's first red run hid three failures
behind one root cause — a click-bridge that claimed keyboard selection — plus a suite
expectation that contradicts its own green sibling check (`disabledIdx=[1,2]` proves index 2
is locked Stages, so "ArrowDown ×2 = Settings" could never pass). Lesson generalized: **when
a check contradicts a passing sibling, suspect the check first**; a multi-failure cascade
usually has one root — fix the cause, re-pin each expectation deliberately.

**Re-proven twice more (2026-09-24, v2.19.3):** the save-fuzz suite's race probe was RED
because the boot→setItem→reload seeding dance was clobbered by lifecycle saves — the suite
had a flaw AND its value assertions were the negative control that exposed it (vacuous-green
detection working as designed). Fixed properly in the harness (`initScripts` pre-boot seeding);
the next run caught THREE real game bugs (string save_version silently skipping the whole
migration chain; `counters=null` crashing the title boot; scalar JSON roots accepted). **A
fuzz suite is not done when it goes green — it's done when its negative control has proven the
suite can go red.**

## 17. Two logs, two purposes — never merge (added 2026-09-14)

The **game log** (`GameLogSystem`) is a session-scoped play/debug surface: noisy,
fire-and-forget, not persisted, never read by any system. The **canonical NPC memory
log** (`NpcMemoryLog`) is per-save story memory: typed, validated, append-only,
persisted, consumed by export/checkpoints/conditions. The game-log suite enforces
purity in both directions. Any future "log"-shaped feature must state which one it is
before it is built.

## 18. §22.3 executed; backup recoverability is a solved pattern (2026-09-14)

`isolate/` was deleted after `tools/audit_monolithic_backup.cjs` verified — by
line-level comparison against every git snapshot — that both monolithic HTML backups
contained **0 lines absent from git history**. The directory was gitignored, so this
audit was the only thing standing between a casual `rm` and permanent loss. The tool
stays in `tools/` as the reference for any future "is this backup safe to delete?"
question: audit first, delete second.

## 19. PROJECT_MAP.md is a contract, not documentation (added 2026-09-23)

`PROJECT_MAP.md` maps every load-order file's cross-file edges (Defines / Calls / bus events /
content / store ownership / GuardedBy). It is **enforced**, not aspirational:

- **Contract updates ride along with the change that invalidates them.** Renaming a global,
  moving a store write, adding a listener — the same change updates the map block and any §3 index row.
- **A new or renamed file without a contract block is a red suite, not a TODO.** `npm run verify`
  fails on coverage in both directions (load-order file without a block; block pointing at a missing
  file), on `Defines:` symbols absent from source, on invalid Status values, and on §3.1 rows that
  name content files that don't exist.
- **Status is a lifecycle decision, exactly one per file:** `NORMATIVE` (load-bearing — edits are
  contract negotiations), `IN-FLUX` (mid-refactor), `DEPRECATED` (do not build on it; deletion is the goal).
- **If the map disagrees with the code, the code wins** — and the map gets a §5 health-log entry,
  same discipline as TOOLING_MAP §5.
- **Never describe internal logic in a block.** The moment a block explains how something works
  inside one file, it duplicates the file and starts lying. Cross-file edges only.

Standing rules I follow on every task, so future sessions inherit them:

- **Default path for scoped lookups:** terminal `rg` (`rg -n "pattern" public/engine`).
  It auto-filters gitignored paths — verified: `rg --files` returns 0 dist hits —
  so `dist/` noise cannot recur on this path.
- **`code_search` only for fuzzy, project-wide discovery** where noise is
  tolerable, and never with a `cwd` that must be honored (it ignores it).
- **Backbone for known paths:** `read_files` (with offset/limit windows) and
  `list_directory`. Prefer them over any search when the path is already known.
- **One diagnosis, then switch** (see §14). A suspicious search result gets
  exactly one assessment; then the trusted path takes over. No retry loops.
- **`str_replace` reports per replacement:** a non-matching oldString is
  skipped with a notice while other replacements in the same call still
  apply. Always read the report; never assume all-or-nothing.
- **No context-prune tool exists in my toolset.** Context discipline comes
  from: (a) keeping tool outputs small — targeted reads instead of broad
  searches, since a single bad search can dump megabytes of minified bundle
  into context; (b) externalized state — `write_todos`, progress notes,
  `KNOWLEDGE.md`, `TOOL_AUDIT_PLAN.md`, `BUGS_AND_ISSUES.md` — which is what
  makes sessions resumable after user interruptions and context summarization.
- **`TOOL_AUDIT_PLAN.md` is the source of truth** for per-tool verdicts and
  probe recipes. If a tool misbehaves in a new way, add the evidence there
  and adjust the verdict — don't silently work around it and forget.
