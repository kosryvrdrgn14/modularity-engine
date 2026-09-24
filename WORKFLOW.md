# WORKFLOW.md — The Standing Development Workflow (Baseline v1)

**What this is:** the one document describing HOW we build this game — the session loop, the
verification ladder, each sub-workflow, where every process was derived from (proven practice),
and an honest effectiveness review of each section. **Purpose:** a baseline to improve against,
not a finished artifact. Changes to the workflow land here in the same change that changes the
behavior (same rides-along law as PROJECT_MAP/KNOWLEDGE §19).

**Why a new doc (KNOWLEDGE §3 check):** our other meta-docs are RULES (KNOWLEDGE), TOOLS
(TOOLING_MAP), CONTRACTS (PROJECT_MAP), TESTS (TESTING_PLAN), and RECORDS (CHANGELOG). None
narrates the *process that binds them together*. This doc is that missing layer; it duplicates
no rule — it sequences and reviews them.

**How to improve the workflow:** propose the change in §11 (improvement log) → land the change
in the relevant section the same session → record what prompted it. Revisit this doc monthly,
or immediately after any incident (§7).

---

## 1. The session loop (every session, every task)

```
1. RE-ESTABLISH  Read KNOWLEDGE.md + PROJECT_MAP blocks for the touched files
                 (never the whole map; never MEMORY.md/archives — §13).
2. PLAN          Post the plan: files touched, what could break, how verified.
                 >3 files or a shared system ⇒ wait for go-ahead (KNOWLEDGE §1).
3. BUILD SMALL   One meaning-unit at a time; ≤2-3 changes between verifications (§4 rule).
4. VERIFY        Climb the verification ladder (§2). No step is done while its suite SKIPs.
5. DOCS RIDE     Contract/spec/plan updates land with the change that invalidated them.
6. RECORD        Incidents + lessons → CHANGELOG incident section, KNOWLEDGE §16, WORKFLOW §11.
```

- **Derived from:** working agreements with AI pair developers (plan-first, small diffs);
  ADR discipline for decision locks (Nygard — https://adr.github.io/); Eisenhower's
  "plans are nothing, planning is everything" — the plan's value is the forcing function,
  not the artifact. Internal origin: KNOWLEDGE §1 (written after yolo'd multi-file sessions).
- **Effectiveness: HIGH, one known gap.** Sessions now resume cleanly across preview wipes,
  origin rotations, and context summarizations (externalized state is the reason — KNOWLEDGE
  §10/v2.9.2). The gap: plan-first is still occasionally skipped under momentum; the rule
  exists because of it, not instead of it. Backlog item B4 adds a commit-based forcing function.

## 2. The per-change verification ladder (climb in order; stop when covered)

| Rung | Command/tool | Catches | Cost |
|---|---|---|---|
| 0 | Read the region before editing (never edit from recall) | half-applied/malformed edits | zero |
| 1 | `node --check` after every multi-part edit | syntax, split methods | seconds |
| 2 | `npm run verify` after every edit to `public/` (or `tests/`/`tools/`) | load-order syntax, content JSON, map drift, test/tool syntax (F1), no-undef (F5), DOM ids (F2) | seconds |
| 3 | Feature suite for the touched area (`tests/suites/*`) | behavior, contracts, persistence round-trips | ~1 min |
| 4 | Full battery `npm test` (strict before closing work) | cross-system regressions, step-gate skips | minutes |
| 5 | `npm run widget:preview` / `widget:audit` when UI moved | renderer contract, occlusion, viewport parity | ~1 min |
| 6 | Manual M-list pass (TESTING_PLAN §4) | what automation cannot see | minutes |

- **Derived from:** TDD's write-one-test-one cadence (Kent Beck; KNOWLEDGE §4 is our phrasing);
  the test pyramid — many fast static/suite checks, few slow browser runs (Fowler —
  https://martinfowler.com/bliki/TestPyramid.html); step-gate testing so suites skip LOUDLY
  before a feature exists and fail it after (our harness, KNOWLEDGE §2b); NASA-style flight
  rules (pre-committed "if X then Y" gates; NASA — https://standards.nasa.gov/).
- **Effectiveness: STRONGEST section.** Evidence: the level-3 upgrade freeze class is dead
  (error net + per-listener try/catch, v2.9/KNOWLEDGE §6); two latent bugs caught pre-ship in
  v2.16 (constructor slip, harness RED); v2.19's three red checks resolved to one root cause +
  one wrong expectation, both caught by the ladder in minutes. Known gaps: the runner's
  check-count display drifts (`counts~0` for suites 5–7 — cosmetic, backlog B5); mobile gates
  are report-only until each screen promotes them (§11 policy, working as designed).

## 3. Spec-first sub-workflow (features, not screens)

```
1. Write the spec JUST for the next 1-2 sessions of work (KNOWLEDGE §3).
2. Lock open decisions in the spec (decisions section → SETTLED markers) before building.
3. Max 3 active/unimplemented specs; merge or implement before adding a 4th.
4. Build skeleton-first when a feature touches 3+ systems; skip scaffolding for pure content.
5. On completion: mark spec sections BUILT with versions; fold lessons into the spec, not a new doc.
```

- **Derived from:** just-in-time/waste-avoidance (Lean); FDA design-controls shape — user needs →
  documented design → verification against it (https://www.fda.gov/regulatory-information/search-fda-guidance-documents/design-control-guidance-medical-device-manufacturers);
  Etsy's "Just-in-Time QA" (Deb Lewis, talks 2013–2017). Internal origin: the 4-audits/3-split-
  plans pile-up that motivated KNOWLEDGE §3.
- **Effectiveness: HIGH.** Every subsystem shipped v2.5→v2.8 spec-first with zero
  decision-regret reversals; locked decisions (v2.12 §9→§10) held through all 7 migrations.
  Cost note: specs are searched, never read whole — this works because they stay under ~300 lines.

## 4. Data-driven UI migration sub-workflow (now the standing pattern)

```
def (data table + card def) → npm run widget:preview (dummy data) → swap render code,
events + ids unchanged → step suite pins the migration (incl. a real-bug regression)
→ occlusion audit + §11 gates → PROJECT_MAP + spec + TESTING_PLAN counts ride along
→ CHANGELOG entry with incidents → one manual visual pass.
```

- **Derived from:** strangler-fig incremental rewrite (Fowler) applied at screen granularity —
  one screen per release, old code deleted same change (KNOWLEDGE §5 orphan rule); gradulation
  rule (bespoke code stays where form-factor demands it — our §3.2, in the spirit of "the test
  pyramid is a heuristic, not a religion").
- **Effectiveness: VALIDATED (7/7 screens).** Each migration surfaced at least one real bug or
  hardening (v1.1 accents → v1.1.1 click-time data → v1.2 def-swap/selected → v1.3 disabled/hygiene);
  the campaign completing in v2.19 means future DOM screens inherit this loop by default.
  Watch-item: renderer vocabulary growth must stay bounded — new def features need a migration
  forcing them, not speculation.

## 5. Content sub-workflow (monsters/weapons/stages/UI data)

```
1. Content = JSON in public/content/ + schema in public/schemas/ + registry entry
   (engine/core.js fetch list + generator registry) — all three or verify fails (POT-006).
2. Never hand-edit data/embeddedData.js (generated mirror; npm run content:sync).
3. New content types that need runtime behavior get a system + suite BEFORE the content lands.
4. Lookup by stable ID, never array index (KNOWLEDGE §6).
5. Batches decompose file-at-a-time (B6, v2.19.6): one content file per change unit —
   author → content:sync → verify → battery for that file — never a multi-file dump.
   The batch prompt states the file order up front; a failed file blocks only its own
   unit, not the batch. (Anthropic agent guidance: decompose large tasks into
   independently-verifiable units; pairs with §1 BUILD SMALL.)
```

- **Derived from:** data-driven design (engine/content split from the v1 plan — vs_plan.md);
  single-source-of-truth per data type (KNOWLEDGE §7); fail-closed validation (the ConditionEngine
  pattern, reused everywhere).
- **Effectiveness: HIGH.** 16 content files; AI authoring of new content is safe (schema +
  registry + mirror enforced); the calendar/NPC/dialogue systems proved bespoke behavior can
  stay content-shaped. Open items: none — `data/shopData.js` migrated to `content/shop.json`
  (§5.4, v2.19.7, 17 content files) and the POT-006 write-up in TOOLING_MAP is current.

## 6. Docs-as-code & housekeeping

- Contract updates ride along with the invalidating change (KNOWLEDGE §19) — enforced by
  `verify`'s map checks (coverage, symbols, statuses, GuardedBy existence).
- Every post-refactor session: orphan pass (delete/flag immediately). Every major feature:
  stale-doc pass against MASTER_DESIGN.
- **Release gate (B3, v2.19.5):** `npm run release:check` makes "done" mechanical — verify
  green + battery strict-green + CHANGELOG single-version-header hygiene. Run it before
  calling any release complete (this is what catches the double-header / doc-tail class when
  sessions break mid-release).
- Health logs, not silent fixes: PROJECT_MAP §5, TOOLING_MAP §5, WORKFLOW §11 — "the map was
  wrong" is an entry, not an embarrassment.
- Docs index lives in TOOLING_MAP §4; new docs join it in the same change.

- **Derived from:** docs-as-code (versioned, reviewed, tested like source —
  https://www.writethedocs.org/guide/writing/docs-as-code/); enforced contracts ("docs that can
  fail a build cannot silently rot" — DORA's finding that quality documentation measurably
  improves delivery performance, dora.dev); Diátaxis doc typology for keeping doc PURPOSES
  separate (https://diataxis.fr/); the "swept wiki" idea — docs that are cheap to correct get
  corrected (community practice). Internal origin: v2.11 made the map enforced after the
  location/NPC schema migration proved prose docs rot silently.
- **Effectiveness: HIGH and improving.** v2.11's verify caught map errors at birth; the rides-
  along rule held through v2.13→v2.19 without a single audit-forcing drift. Honest note: v2.19's
  docs tail finished a session AFTER its code (preview reset interrupted verification) — the
  recovery cost one session start. The ladder + this doc reduce but cannot eliminate that;
  see backlog B3 for release checklists.

## 7. Failure-handling & incident recording

```
On RED: diagnose before dismissing (the net is a bug detector — KNOWLEDGE §16).
        Suspect the check first when it contradicts a passing sibling (v2.19 lesson).
        One root cause usually explains a cascade; fix cause, re-pin each expectation.
On incident: CHANGELOG incident section (what happened, how caught, rule it proves/refines).
             Generalized lessons → KNOWLEDGE §16 append. Workflow lessons → WORKFLOW §11.
Never: dismiss a red as flaky without reading the artifact; silence an error net; batch a fix
       with the test change that would have caught it.
```

- **Derived from:** blameless postmortem culture (Google SRE — https://sre.google/sre-book/postmortem-culture/);
  root-cause analysis / 5-Whys discipline; "standing issues" logs for long-horizon agent work
  (Anthropic's agent-engineering guidance — https://www.anthropic.com/engineering/claude-code-best-practices).
  Internal origin: the audio-listener crash that killed the upgrade-selection logic silently
  (KNOWLEDGE §6/§16 origin story).
- **Effectiveness: HIGH.** Every release since v2.13 carries an incidents section, and the rules
  extracted there have each re-proven at least once (the sign of a real lesson, not anecdote).

## 8. Provenance summary

| Our practice | Proven practice it came from | Source |
|---|---|---|
| Plan-first, small diffs, externalized state | AI pair/agent working agreements | Anthropic agent guidance (URL in §7); KNOWLEDGE §1/§10 |
| Verification ladder | Test pyramid + TDD cadence + flight rules | martinfowler.com/bliki/TestPyramid.html; standards.nasa.gov |
| Step-gate suites (loud SKIPs) | Step-gate/whole-team testing | KNOWLEDGE §2b (internal formalization) |
| Error nets + per-listener isolation | Fail-loud design, defensive dispatch | KNOWLEDGE §6 (internal, incident-born) |
| Spec-first, locked decisions, ≤3 specs | Just-in-time spec; design controls; ADRs | adr.github.io; FDA design-control guidance; Etsy JIT QA |
| Screen-by-screen strangler migration | Strangler-fig incremental rewrite | Fowler (martinfowler.com) |
| Content JSON + schema + registry + mirror | Data-driven design; fail-closed validation | vs_plan.md origin; ConditionEngine pattern |
| Enforced file-contract map | Docs-as-code + contract testing | writethedocs.org; diataxis.fr; dora.dev |
| Incident sections + blameless recording | Postmortem culture; RCA/5-Whys | sre.google/sre-book/postmortem-culture/ |
| Coverage skepticism (suites > coverage %) | "Coverage ≠ suite effectiveness" (ICSE'14) | doi.org/10.1145/2568225.2568271 |
| Occlusion audit with negative control | Testing that an audit CAN fail; chaos principles | principlesofchaos.org (non-vacuous-checks spirit) |
| Speculative: attribution beyond those listed | — | Marked "internal origin" instead of guessed provenance |

## 9. Effectiveness review (baseline snapshot, v2.19.0, 2026-09-24)

| Section | Verdict | Evidence for | Known weakness |
|---|---|---|---|
| §1 Session loop | HIGH | Resumable across wipes/rotations; zero lost work since v2.9.2 | Plan-first skipped under momentum |
| §2 Verification ladder | STRONGEST | Freeze-class bugs dead; v2.19 red→green in minutes; 11 suites green incl. strict | Runner count display drift; mobile report-only until promoted |
| §3 Spec-first | HIGH | 7 specs; zero decision reversals; locked decisions held 7 migrations | Doc-count rule needed (and now holds) |
| §4 UI migration loop | VALIDATED | 7/7 screens; every migration yielded a bug/hardening | Vocabulary growth needs a forcing function |
| §5 Content pipeline | HIGH | 17 JSONs; AI-safe authoring | none open (shopData migrated v2.19.7) |
| §6 Docs housekeeping | HIGH | Map checks catch drift; rides-along held 7 releases | Doc tail can lag code when sessions break |
| §7 Failure handling | HIGH | Re-proven lessons; incidents recorded every release | No formal postmortem format for multi-session failures yet |

**Measurable proxies going forward (revisit each review):** suites green/strict; checks per
migration; red-runs-to-root-cause; docs-rides-along compliance (drift caught by verify = miss);
backlog aging.

## 10. Improvement backlog (priors; sources point at the section to change)

| ID | Item | Why | Effort | Priority |
|---|---|---|---|---|
| B1 | ~~Save-integrity fuzz tests~~ **DONE v2.19.3** (`save_fuzz.cjs`, 57 checks) | First seeded run caught 3 real bugs (version-string chain bypass, counters=null boot crash, scalar-root acceptance) + a harness seeding flaw — fixed; lesson in KNOWLEDGE §16 | — | — |
| B2 | Screenshot pixel-probe QA — **slice 1 DONE v2.19.6** (`tests/suites/visual_probe.cjs` in the battery: screenshots title/town/combat/paused, layer-correct render probes, paused frame-stillness, blank-detector negative control). **Slice 2 remainder:** boss/level-up/end-screen shots, more probe regions, threshold tuning | Catches visual regressions automation currently can't | M | P2 |
| B3 | ~~Criteria-based release checklist + release hygiene~~ **DONE v2.19.5** (`npm run release:check` — verify + strict battery + CHANGELOG header hygiene; negative control proved it red on a duplicate header) | Makes "done" mechanical when sessions break | — | — |
| B4 | ~~Plan-first forcing function: commit the plan~~ **RE-SCOPED v2.19.4 (docs-only):** multi-file plans get restated in the session summary; commit-based gate retired — its premise is dead here (git CLI blocked, platform auto-syncs, no local commit step to hook) | The rule can't be mechanical on this platform; shrink it rather than re-log a skippable reminder | S | P3 |
| B5 | Fix run_all check-count reporting for suites 5–7 | Small trust/cosmetic fix | S | P3 |
| B6 | ~~Task decomposition for content batches~~ **DONE v2.19.6** (file-at-a-time rule landed as §5.6 of the content sub-workflow) | Safer large content additions | — | — |
| B7 | Widget Inspector (§6.4) + 9-slice skins | §6 remainder; hook point exists | M/L | P3 |
| B8 | ~~Consolidate §5.7 + shopData → content/shop.json~~ **DONE v2.19.7** (shop.json via POT-006, 17th content file; §5.7 renderers single-homed in shop.js; audit found the town panel Sandbox button was a dead no-op — now wired through `onSandbox` → `ShopSystem.openSandbox`) | Open map items; §5.5/§5.6 CLOSED v2.19.2 | — | — |
| B9 | ~~Evaluate ESLint `no-undef` as a battery gate~~ **DONE v2.19.4** (`npm run verify` F5 gate, eslint.game.cjs + game_globals.cjs rot-guard; partyBtn class caught statically) | The net moved into the unconditional gate — see F5 in §11 | — | — |
| B10 | Perf budget/benchmark for the combat loop | Later; performance not yet a demonstrated pain | M | P3 |
| B11 | WCAG-based accessibility audit of the widget system (extends §4.4/§11) | Later; after content/build phases settle | M | P3 |

## 11. Improvement log (append; format from TOOLING_MAP §5)

```
[Template entry — copy this format]
- Date:
- Section affected:
- What happened:
- Change made:

- Date: 2026-09-24
- Section affected: §10 backlog (B8 row)
- What happened: executing B8 showed the row's rationale was stale — POT-006 had been
  documented since v2.10.0, and the §5.5/§5.6 items closed same-day (v2.19.2). A backlog
  item had outlived its written reason.
- Change made: B8 row rescoped to the real remainder (§5.7 + shopData migration); first
  entry in this log.

- Date: 2026-09-24
- Section affected: §2 verification ladder (§10 backlog B1)
- What happened: B1's fuzz suite validated the ladder end-to-end — its own harness
  flaw was caught by the suite's negative control, then its first properly-seeded run
  caught 3 real migration-boundary bugs the 112-check trace never reached (no prior
  test ever fed a corrupt save to a real boot).
- Change made: B1 closed; fuzz suite added to the battery (12 suites); lesson logged
  in KNOWLEDGE §16 ("a fuzz suite isn't done when green — done when its negative
  control has proven it can go red").

- Date: 2026-09-24
- Section affected: §5 content pipeline + §10 (B8) — shop migration + §5.7 consolidation
- What happened: executed as two §5.6 units, verified between. **Unit A** migrated the last
  non-content T0 catalog: `data/shopData.js` → `content/shop.json` (registered generator +
  core.js, mirror re-synced, shop.js reads `DataManager.shop` via a `_stockedItems()` accessor,
  T0 script tag + map block + `SHOP_DATA` global retired). The map gate went RED on the stale
  block mid-unit — the rides-along law working as designed. **Unit B** deleted townContent's
  duplicated farming/sandbox overlay renderers (122 lines) and single-homed the modes in
  shop.js. The §5.7 audit inverted its own premise: the duplicated townContent block's only
  callers were each other — its `openSandbox` had NO entry point — and the town panel's
  Sandbox button was a silent no-op the whole time (TownEngine accepts `onSandbox`, town.js
  never passed one). "Both paths live" was map-prose, not wiring. Fixed: farming card →
  `shopSystem.openFarming`, panel button → `onSandbox` → `shopSystem.openSandbox` (sandbox
  becomes REACHABLE — a behavior delta, not a regression); `sandboxSystem` dependency dropped
  from TownContent. Battery green between units and after (394 checks/13 suites; DOM id refs
  115→106 with the deleted ids).
- Change made: B8 closed; §5 open items cleared; PROJECT_MAP §1/§2/§3.1/§5.4/§5.7 rides-along;
  game_globals rot-guard updated; TOOLING_MAP pipeline count 16→17.

- Date: 2026-09-24
- Section affected: §5 content sub-workflow + §10 (B2 slice 1, B6) — visual QA + batch rule
- What happened: **B2 slice 1** landed as `tests/suites/visual_probe.cjs` (in the battery):
  structural screenshots (title/town/combat/paused → artifacts/visual_*/), layer-correct
  render probes — DOM visibility + pooled widget content for the DOM screens, canvas
  luminance variance + HUD text pixels for combat — paused frame-stillness (pixel diff
  < 5% over 400ms), and the v2.19.3 negative-control rule honored up front: a solid
  synthetic buffer must report ≈0 variance, proving the blank detector can fire. Honest
  run-one lesson: the first draft probed canvas variance on title/town and went red —
  they are DOM screens; the canvas behind them is uniform. Probe the layer that renders
  (generalizes §16's "suspect the check first": here the check was measuring the wrong
  layer entirely). **B6** landed as §5.6: content batches decompose file-at-a-time,
  each file its own author→sync→verify→battery unit, order stated up front, failures
  contained to their own unit.
- Change made: B2 re-scoped to slice 2 remainder (boss/level-up/end-screen shots, more
  probe regions, threshold tuning); B6 closed; TESTING_PLAN §4.9 + §5 status updated;
  CHANGELOG v2.19.6.

- Date: 2026-09-24
- Section affected: §6 housekeeping + §10 backlog (B3, B5) — release gate landed
- What happened: executed together because they share a root: run_all's `checks~0` display for
  suites 5–12 (B5) and the missing release checklist (B3) were both trust gaps in the SAME
  evidence chain the release decision reads. **B5:** the summary counted only the harness
  runner's `PASS/FAIL/SKIP —` lines; five suites print a local `✓/✗` format, so their counts
  showed 0 (step5=0 vs its real 11, save_fuzz=0 vs its real 57…). run_all now counts both
  verdict formats and prints a TOTAL line — 380 checks/12 suites, matching every count
  documented in TESTING_PLAN §4.9. **B3:** `tools/release_check.cjs` + `npm run release:check`
  gates a release on: verify green, battery strict-green (skips fail), CHANGELOG
  single-version-header hygiene (the pre-2.9.2 double-header class) with title/divider-only
  preamble. Its first draft went red on the legitimate `---` divider (check contradicted
  known-good content — suspect the check first); fixed, then proven non-vacuous by injecting
  a duplicate v2.19.4 header → RED → reverted byte-identically.
- Change made: B5 closed, B3 closed; release:check added to §6 and TOOLING_MAP §2/npm block;
  CHANGELOG v2.19.5.

- Date: 2026-09-24
- Section affected: §2 ladder + §10 backlog (B4, B9) — mechanical-gate landing (F1/F5/F2)
- What happened: the gate-feasibility audit (handoff: Claude; full report folded from
  TEMP_GATE_AUDIT_FOR_CLAUDE.md) found the lessons that keep recurring are exactly the ones
  whose nets live OUTSIDE the two enforced gates. Three were made mechanical in `npm run verify`:
  **F1** — verify now syntax-checks tests/ + tools/ (the recall-not-read lesson, 4× recurred,
  had its net outside the gate; two of three multi-part-edit incidents were in suite files);
  **F5** — ESLint no-undef on the game files via tools/eslint.game.cjs + tools/game_globals.cjs,
  whose entries are meta-checked against PROJECT_MAP so the globals list cannot rot (partyBtn
  class; closes B9); **F2** — DOM-id cross-check: every literal getElementById/querySelector('#…')
  in game code must exist in game2.html or be documented as dynamic-create in the file's
  PROJECT_MAP block (the shop-overlay bug class, KNOWLEDGE §5). All three proven non-vacuous
  by injected-defect negative controls (a bare undefined global and an unknown id each turned
  verify RED, then reverted byte-identically). Also settled: B4's commit-based mechanism is
  impossible on this platform (git CLI blocked, platform auto-syncs) — re-scoped to docs-only,
  P3. Documented can't-fixes (plan-first interception, rides-along docs beyond the map, mobile
  gate promotion, negative-control presence convention, M-list): reviewed, remain soft/human
  by design.
- Change made: F1/F5/F2 gates landed in tools/verify.cjs; eslint.game.cjs + game_globals.cjs
  added; B9 closed, B4 re-scoped; PROJECT_MAP dynamic-create lines adopted as the F2 allowlist;
  TOOLING_MAP §2 verify row + npm block updated; full audit retained for Claude in
  TEMP_GATE_AUDIT_FOR_CLAUDE.md until his review, then delete.
```
