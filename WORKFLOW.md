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
| B2 | ~~Screenshot pixel-probe QA~~ **DONE v2.19.8** (`visual_probe.cjs`, 22 checks in the battery: all 8 structural screenshots — title/town/combat/paused/levelup/boss/end/shop — HUD pixel regions for timer/gold/XP, paused frame-stillness, real-path level-up/boss/end/shop flows, blank-detector negative control; golden-image diffing stays the deliberate v2 non-goal) | Catches visual regressions automation currently can't | — | — |
| B3 | ~~Criteria-based release checklist + release hygiene~~ **DONE v2.19.5** (`npm run release:check` — verify + strict battery + CHANGELOG header hygiene; negative control proved it red on a duplicate header) | Makes "done" mechanical when sessions break | — | — |
| B4 | ~~Plan-first forcing function: commit the plan~~ **RE-SCOPED v2.19.4 (docs-only):** multi-file plans get restated in the session summary; commit-based gate retired — its premise is dead here (git CLI blocked, platform auto-syncs, no local commit step to hook) | The rule can't be mechanical on this platform; shrink it rather than re-log a skippable reminder | S | P3 |
| B5 | Fix run_all check-count reporting for suites 5–7 | Small trust/cosmetic fix | S | P3 |
| B6 | ~~Task decomposition for content batches~~ **DONE v2.19.6** (file-at-a-time rule landed as §5.6 of the content sub-workflow) | Safer large content additions | — | — |
| B7 | ~~Widget Inspector (§6.4) + 9-slice skins~~ **DONE v2.19.12 + v2.19.13** | §6.4 shipped as `WidgetRenderer.installInspector()` → `window.__WIDGET_DEBUG__`. 9-slice skins shipped as skin vocabulary v2 (border-image + texture + ornament as CSS custom props; `bazaar_cloth` upgraded w/ 3 authored SVGs; verify skin-asset gate; step3 pins) | — | — |
| B8 | ~~Consolidate §5.7 + shopData → content/shop.json~~ **DONE v2.19.7** (shop.json via POT-006, 17th content file; §5.7 renderers single-homed in shop.js; audit found the town panel Sandbox button was a dead no-op — now wired through `onSandbox` → `ShopSystem.openSandbox`) | Open map items; §5.5/§5.6 CLOSED v2.19.2 | — | — |
| B9 | ~~Evaluate ESLint `no-undef` as a battery gate~~ **DONE v2.19.4** (`npm run verify` F5 gate, eslint.game.cjs + game_globals.cjs rot-guard; partyBtn class caught statically) | The net moved into the unconditional gate — see F5 in §11 | — | — |
| B10 | ~~Perf budget/benchmark for the combat loop~~ **DONE v2.19.14** (`tests/suites/perf_budget.cjs`: per-tick CPU budgets — idle ≤1ms, stress-120 update ≤3ms/p95 ≤8ms/render ≤3ms, heap ≤64MB; ~5–15× baseline headroom; overload negative control + frozen-state restore re-check; in battery, 14 suites) | — | — |
| B11 | ~~WCAG-based accessibility audit of the widget system~~ **DONE v2.19.15** (widget-system scope: keyboard operability + accessible state + focus visibility + widget-scoped contrast lifts; screen-by-screen contrast sweep deferred as next-step P3) | — | — |

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
- Section affected: §2 ladder (§10 B2) — visual QA slice 2, B2 closed
- What happened: visual_probe grew from 14 to 22 checks — the four remaining §5.2 structural
  scenarios (level-up, boss, end screen, shop) plus the gold-chip/XP-bar pixel regions from the
  trace's proven probes, all driven through real paths (XP-grant → overlay → key selection →
  drain; `window.skipToBoss()`; `showEndScreen`; `openShop` against content/shop.json). Run-one
  lesson again: the level-up probe counted `.widget-card` and found 0 — level-up cards are
  bespoke `.levelup-card` markup, NOT widget cards (the only screen-2 overlay never migrated).
  Read the markup, probe the layer that renders — same lesson as slice 1's DOM-vs-canvas,
  now twice-proven as a general rule for this suite. All 8 artifact screenshots land every
  battery run for the human-skim channel.
- Change made: B2 closed (golden-image diffing remains the deliberate §5.4 non-goal);
  TESTING_PLAN §4.9 row + §5 status updated; CHANGELOG v2.19.8.

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

- Date: 2026-09-25
- Section affected: ui/loadout.js (weapons-phase Next button) + step5 suite
- What happened: user-reported bug — the weapons-phase action button rendered as an empty green
  bar (screenshot). Root cause: the v2.17.0 chrome migration moved both action buttons into the
  skeleton EMPTY; `_renderCompanions()` stamps its confirm label per render, but
  `_renderWeapons()` never set the Next button's `textContent` — the old inline label was
  silently dropped. A migration gap, not a data/render issue; visible only with ≥1 weapon
  selected (green `.active` bar, no text).
- Change made: one line in `_renderWeapons()` — `nextBtn.textContent = canProceed ?
  '▶ Companions' : 'Select a weapon'` (mirrors the companions phase; inactive state now shows
  an honest hint). step5 suite 11→12: Next label must be non-empty in both states, proven
  non-vacuous (label commented → RED → restored byte-identically). Docs: CHANGELOG v2.19.9,
  TESTING_PLAN §4.9 row (12). LESSON: when chrome moves into a persistent skeleton, per-render
  label stamps that lived in the old markup must be re-homed — a suite that checks one button's
  label is not a screen-wide label gate.

- Date: 2026-09-25
- Section affected: public/styles.css (loadout slot chips) + visual_probe (slice 3)
- What happened: second loadout regression from the same user screenshots — horizontal
  scrollbars at the panel's bottom edge. Probed the layer that renders (one-off DOM diagnostic,
  deleted after use): #loadout-slots scrollWidth 463 vs client 378 at desktop, and the panel
  scrollWidth 483 vs 418 — .loadout-panel has only overflow-y:auto, which per CSS computes
  overflow-x to auto, so the panel showed the scrollbar. Root cause: the v2.17.0 migration's
  widget chips lost the retired .loadout-slot { flex: 1 } geometry — flex children with
  min-width:auto refuse to shrink below their nowrap min-content, so the row can never fit.
  (The layout-text-only-row column rule is a no-op inside the flex slot row — the side-by-side
  look comes from flex itself.)
- Change made: one scoped line — `#loadout-overlay #loadout-slots .widget-card {
  flex: 1 1 0; min-width: 0; }` — restoring the retired geometry (equal thirds, shrinkable,
  ellipsis active again). visual_probe grew 22→25 (slice 3): real-path loadout scenario with
  `09_loadout.png`, the v2.19.9 Next-label pin re-asserted at the visual layer, and a
  no-horizontal-overflow pin (slots + panel scrollWidth−clientWidth ≤ 1). Negative control:
  CSS line reverted → exactly the overflow pin RED (85/65 px) → restored byte-identically.
  LESSON: a widget-vocabulary migration silently drops retired per-screen geometry; the fix
  lives in the screen's scoped theme section, and the permanent probe now watches the actual
  failure (scrollWidth−clientWidth), not a guess.

- Date: 2026-09-25
- Section affected: ui/npcExportUi.js (favorites browser) + step4 suite + PROJECT_MAP §4.1
- What happened: the planned shrink-regression sweep (post-v2.19.10 bug class) swept ALL nine
  pooled-widget hosts at 2 viewports — every screen clean, loadout fix holding. But sweeping
  means opening every screen, and the export browser had never been opened WITH favorites:
  openBrowser() threw `WIDGET DEF invalid: unknown slot "onClick"` — the def carried onClick
  INSIDE `slots` (it is a top-level key per §2.2; every other screen has it outside). The
  empty-state path (zero favorites) never renders the list, so the throw was invisible to
  every suite: step4 tests the export SYSTEM, not the browser UI with favorites present.
  Player impact: clicking Favorite Memories on the title screen with any favorited memory =
  broken overlay.
- Change made: one move — onClick hoisted out of `slots` to top level (comment in place).
  step4 8→11: seeded-slot browser flow (favorites → pooled widget cards → card click fires
  exportFavoriteOpened → regenerateFromSlot view → back re-renders the list), slot removed
  after. Negative control: def re-broken → exactly the browser pins RED (original validator
  error reproduced) → restored byte-identically. Sweep one-shots deleted after reporting.
  LESSON: sweeps pay double — the audit found zero overflow but caught a live throw on the
  one screen whose happy path no suite had ever executed. "A gate is done when its negative
  control proved it can go red" now also applies to SCREENS: a screen whose error path is the
  only path a suite exercises is unpinned.

- Date: 2026-09-25
- Section affected: ui/widgetRenderer.js + engine/game.js (B7 §6.4 inspector) + step3 suite
- What happened: B7 split — the §6.4 widget inspector shipped, 9-slice skins stay open in the
  row. Built per the gameLog inspector precedent: `WidgetRenderer.installInspector()` (static,
  idempotent) installs `window.__WIDGET_DEBUG__` at boot and sweeps the CLASS-level `_all`
  registry, because every screen constructs its own renderer instance. `list()` enumerates live
  pooled cards + producing def summaries + data across ALL instances; `inspect(el)` returns the
  full def JSON, resolved data, payload preview (templates resolved), selected/disabled,
  geometry and a live elementFromPoint clickable check; `occlusion()` runs the §7.2 audit
  across every live interactive instance — §7's mechanism is now callable in any game state.
  "Live" = connected + laid out, so parked pool surplus and hidden-overlay cards are excluded
  (the step3 stage initially rendered into the hidden shop host and list() correctly reported
  zero — the gate works; the stage was wrong). step3 22→26 incl. the built-in negative control
  (a fixed veil over the stage MUST be flagged naming the veil — the detector can go red
  without any revert dance). Two self-inflicted stumbles, both caught by the gates: first run
  called the method as a static before making it static (boot TypeError, 4 checks red); the
  first inspect assertion was written against the wrong contract (slots is the spec object,
  not list()'s names array).
-  Change made: installInspector + game.js wiring + step3 pins; docs rides-along (PROJECT_MAP
  widgetRenderer/game.js blocks, TOOLING_MAP inspector row Planned→Built, TESTING_PLAN §4.9
  row 26). CHANGELOG v2.19.12. LESSON: registry-shaped inspectors belong on the class, not the
  instance — and stage the screen for what the probe actually gates on (liveness), not what
  the earlier suite steps happened to leave behind.

- Date: 2026-09-25
- Section affected: widgetRenderer.js (§4.1 skin vocabulary v2) + ui_skins.json + styles.css + verify (skin-asset gate) — B7 part 2, B7 CLOSED
- What happened: the second half of B7 — 9-slice skins. Renderer gains skin vocabulary v2:
  image fields (`border` + `borderSlice`/`borderWidth`, texture `background`,
  `cornerOrnament`) land ONLY as CSS custom props — §4.4 discipline unchanged (never
  structural, never a bindings/events touch); v1 color-only skins keep their exact behavior;
  v2 adds a `backgroundColor` underlay so a texture never becomes the sole contrast channel.
  `bazaar_cloth` upgraded with three hand-authored SVGs under public/assets/ui/skins/
  (border 48×48 slice-16, weave tile, sigil ornament — text-authorable, no binary art).
  styles.css consumes the props with `none`/neutral fallbacks (unskinned/v1 cards are
  pixel-identical), and the loadout radius override is restored for skinned cards (9-slice
  ignores border-radius — the art would clip under the 8px theme). Known trade documented:
  skinned cards get square ornamental corners while border-image is active. verify gains the
  §4.1 asset-exists rule as gate 3d (fs.existsSync per image ref + version-vocabulary check),
  proven non-vacuous (bogus path → RED → reverted byte-identically). step3 26→29 (v2 props,
  computed CSS consumption incl. ::after ornament, skinned→plain pool swap leaves zero stale
  props — the `_rebind` cleanup list grew 2→7). styles.css file-tool flakiness recurred; the
  node-anchored edit pattern (assert count==1 → write → rg-verify) is now the established
  fallback.
-  Change made: v2 vocabulary in _applySkin + _rebind hygiene + ui_skins.json upgrade +
  content:sync mirror + 3 SVG assets + styles.css consumption + verify gate 3d + step3 pins;
  docs rides-along (PROJECT_MAP widgetRenderer Content line, TOOLING_MAP verify row,
  TESTING_PLAN §4.9 row 29). CHANGELOG v2.19.13. LESSON: "purely visual" is only free if the
  fallbacks are total — every new prop needs a no-skin default AND a pool-swap cleanup, or the
  art leaks across rebinds the way stale classes did in v1.3.

- Date: 2026-09-25
- Section affected: tests/suites/perf_budget.cjs (B10) + run_all SUITES — battery 13→14
- What happened: B10 landed as a budget gate, not a benchmark: headless rAF cadence is
  vsync-throttled and untrustworthy, so the honest CI metric is per-tick CPU cost — GameLoop's
  own updateFn(dt)/renderFn(alpha) wall-timed directly with rAF yields between samples.
  Budgets set from a one-shot baseline (idle update mean 0.02ms; stress-120 update mean 0.58ms,
  p95 1.30, max 5.90; render 0.25; ~10MB heap) with ~5–15× headroom, still ≤ a frame at p95.
  Stress = 120 enemies through SpawnSystem's own entity shape with real defs on a real
  battlefield — deterministic load, no spawn-timer waiting. Max is REPORTED not gated (single
  GC pauses are noise; sustained p95 is the signal). First draft's negative control wrapped
  updateFn with busy-loop + orig-call — the sim advanced 20 ticks under overload, enemies died
  and dropped pickups, and the "restored" re-measure measured a DIFFERENT, organically heavier
  state (4.26ms vs its own baseline). Fix: pure busy-loop, original NOT called — frozen state
  makes the restore re-check same-conditions.
- Change made: perf_budget.cjs (10 checks incl. the in-suite negative control + restore
  re-check) joined run_all SUITES (14 suites, 426 checks strict green); docs rides-along
  (TESTING_PLAN §4.9, TOOLING_MAP suite row 13→14). CHANGELOG v2.19.14. LESSON: a negative
  control that mutates the system under test invalidates its own restore assertion — freeze
  the state, or account for the mutation.

- Date: 2026-09-25
- Section affected: widgetRenderer.js + styles.css (B11 widget-system a11y) + step3 suite
- What happened: B11 landed as an audit-then-fix at the ONE fix point every screen inherits:
  the renderer. Findings (verified against source, WCAG-cited): (1) interactive widget cards
  were click-only — no role/tabindex/keyboard activation (2.1.1/4.1.2); (2) no visible focus
  indicator anywhere (2.4.7); (3) widget-scoped meta text at #666/#555 on #0a018-family
  backgrounds = 2.9–3.9:1 (1.4.3) — incl. the game-log lines, a widget-rendered offender
  found mid-fix. Strengths already present: lang=en, weapon-triangle never-sole-channel,
  disabled denial tooltip (not hover-sole), §11 viewport matrix gates. Fixes: interactive
  cards get role=button + tabindex=0 + Enter/Space via a shared emitClick (disabled honored
  on the keyboard path, click-time discipline); attrs re-sync on _rebind — created-plain
  nodes never GAIN attrs (a focusable button with no event is an a11y lie) and created-
  interactive nodes lose them on plain-swap; :focus-visible gold outline (pointer clicks
  paint nothing); contrast lifts scoped to widget-rendered text only (#666→#8a8a94,
  #555→#6b6b76) — the 12 screen-local sub-4.5 tokens are a DEFERRED screen-by-screen sweep.
  Probe lessons: repeatInto pools per CONTAINER (one host per scenario — a shared host
  rebinds, it never appends); file:// stylesheets are CSSOM-opaque (cssRules throws) so the
  focus-rule pin reads the stylesheet from disk + proves the paint live on a staged first-
  tabbable card (random Tab walks die on hidden-overlay unfocusable cards).
- Change made: renderer a11y branch + _rebind sync + styles.css focus/contrast + step3
  29→35 (incl. over-application guards + in-source negative control: keyboard path neutered
  → exactly the Enter/Space pin RED → restored byte-identically). Docs: PROJECT_MAP
  widgetRenderer block, TESTING_PLAN §4.9. CHANGELOG v2.19.15. LESSON: audit fixes belong at
  the shared fix point first — one renderer edit beats 9 screen patches, and the over-
  application guard (plain cards must stay inert) is as important as the feature itself.
  POST-SCRIPT: the first release:check after B11 went RED on perf_budget's restore re-check
  (3.76ms vs 3.0) with all 9 real checks green — a 20-sample MEAN over a window that fit one
  autosave/GC blip, violating the suite's own noise policy. Hardened to identity assert +
  30-sample MEDIAN; green twice after. LESSON: a statistic chosen for one window (120-sample
  stress) is not automatically right for a shorter one (20-sample restore) — match the
  robustness of the statistic to the blip budget of the window.

- Date: 2026-09-25 (from Claude's review of the gate-audit handoff)
- Section affected: §6 plan-first/approval discipline — the resume-after-pending seam
- What happened: a stop-and-report turn left a built-but-unapproved package pending; the next
  message ("proceed to next task") meant the wider roadmap but read, reasonably, as approval of
  the freshest pending item — and got built. Neither side was undisciplined: the ambiguity is
  structural to the handoff (a pending state meets a new instruction), not a lapse in
  plan-before-acting. Agreed protocol, both directions: (1) SENDER — when a turn ends in
  "awaiting go-ahead," close with an explicit named ask ("approve X? or name another target")
  so the fork has exactly two labeled branches; (2) RECEIVER — a bare "proceed" right after a
  stop-and-report is a fork requiring a one-line confirmation of which branch is meant, EXCEPT
  when the pending state was framed as a single binary ask with nothing else open (then it is
  approval). Naming the target explicitly ("proceed to B7; leave the audit pending") is always
  unambiguous on either side.
- Change made: protocol recorded here as the norm for future sessions; this session already
  ran on it (every plan turn closed with a binary "OK to proceed?", and the one genuine fork —
  bounds-check vs B11 — was disambiguated by name: "do B11 first… after"). No code, no gates.

- Date: 2026-09-25
- Section affected: widget_occlusion.cjs scanFn + widgetRenderer.js inspector — clipped category
- What happened: user asked whether any check compares a widget's FULL rect against the viewport
  edges, not just its center point. Answer was no — and worse, the center-only test misfiled a
  partially-off-screen card as 'unpresented' (the benign bucket), silently absorbing the exact
  bug class in question. The v2.19.10 loadout bug also evaded it (clip lived inside a scroll
  container, still within the viewport). scanFn gained the fourth state 'clipped' (full-rect vs
  edges ±1px, per-edge px in the report; partially-outside reclassified OUT of unpresented;
  clickability skipped for clipped cards — the clip IS the finding). __WIDGET_DEBUG__.occlusion()
  mirrors it. Report-first across all 3 viewports before gating: all clean (matrix + the
  element-specific gates already cover their screens), so desktop got gated per §11, mobile
  stays report-only. Negative controls now cover both failure directions (burying overlay AND
  a card parked 60px off the right edge). Registry detail found on the way: _instances keeps
  CREATION-time data for repeatInto cards (Maps rebind, the Set doesn't) — audit labels fall
  back to bind paths for pooled cards; the clip control uses render() to carry real data.
- Change made: scanFn clipped taxonomy + desktop gate + off-screen negative control +
  inspector parity; 37→39 checks, all green. Docs: TESTING_PLAN, TOOLING_MAP. CHANGELOG
  v2.19.16. LESSON: a center-point presence check is a sampling heuristic, not a bounds check —
  and a detector that files real defects into a benign bucket is worse than no detector.

- Date: 2026-09-25
- Section affected: styles.css screen-local tokens (B11 sweep, the deferred half of v2.19.15) + step3 pins
- What happened: the screen-by-screen contrast sweep ran with per-token judgment against each
  rule's REAL background, not a blind find-replace: 19 tokens lifted (#555/#666/#777 → #8a8a94
  for real text on dark panels; #7d7d87 for dim-but-interactive — locked menu entries, dock
  tabs, inactive confirm button), 1 rule consolidated (the v2.19.15 .loadout-confirm one-off
  folded back into the original rule), and 8 remaining sub-4.5 declarations judged-exempt and
  documented in-place: .menu-lock pictogram, breadcrumb separator, loc-arrow (decorative),
  .location-card.locked (opacity .4 + pointer-events:none = WCAG inactive exemption), and the
  retired .loadout-slot-* dead rules. A new dead-rule class surfaced mid-sweep: the retired
  .loadout-slot-label/-hint/.loadout-card-meta rules still style nothing (widget slots own
  those nodes since v2.17.0) — left for a future dead-CSS pass, not silently "fixed".
  CATCH-OF-THE-DAY: the new step3 contrast pin FAILED my own first pass — #6b6b76 on
  #0a0a18-family panels is 3.72:1, not ≥4.5 (my dim tier was miscalculated); the correct
  dim value is #7d7d87 (≈4.55). The auditor + negative control caught the sweep's own math
  error before it shipped.
- Change made: 19 token lifts + 1 consolidation + in-place exemption documentation; step3
  35→37 (WCAG ratio math over representative live pairs incl. the dim tier, negative control
  = pre-sweep #555-on-#0a0a18 must FAIL). Docs: TESTING_PLAN §4.9. CHANGELOG v2.19.17.
  LESSON: contrast is a pair property (fg × actual bg), never a token property — and a pin
  written alongside a fix must be allowed to fail the fix, or it is decoration.
```
