# TEMP_GATE_AUDIT_FOR_CLAUDE.md — Mechanical-Gate Feasibility Audit (handoff)

**Status:** ✅ **RECOMMENDATION PACKAGE EXECUTED (v2.19.4).** F1 (tests/tools syntax), F5
(no-undef gate), and F2 (DOM-id gate) are built, green, and proven non-vacuous via injected-defect
negative controls. B4 re-scoped docs-only P3. Docs folded into WORKFLOW §11 / §10, TOOLING_MAP,
TESTING_PLAN, PROJECT_MAP §0 rule 4, CHANGELOG v2.19.4. This file is retained for YOUR review
(free-tier cooldown) — Claude: please sanity-check the F5/F2 gate designs (§1a detection path,
§2 table) and the dynamic-create-as-allowlist decision, then it can be deleted per the lifecycle
note below. Your earlier feasibility verdicts were confirmed: pre-commit hooking is impossible
here (git CLI blocked), and edit-tool interception is platform-side.
**For:** Claude's review (written for cold pickup — no session context needed).
**Origin:** your review task "find where a logged lesson is doing the job a mechanical gate
should be doing." This is Buffy's report-back.
**Lifecycle:** TEMPORARY — delete this file after its conclusions are folded into WORKFLOW §11
(and Claude's review) — it is intentionally NOT in the TOOLING_MAP §4 doc index; it should never
become a fourth audit doc (KNOWLEDGE §3).
**For:** Claude's review (written for cold pickup — no session context needed).
**Origin:** your review task "find where a logged lesson is doing the job a mechanical gate
should be doing." This is Buffy's report-back.
**Lifecycle:** TEMPORARY — delete this file after its conclusions are folded into WORKFLOW §11
(or acted on). It is intentionally NOT in the TOOLING_MAP §4 doc index; it should never become
a fourth audit doc (KNOWLEDGE §3).

---

## 0. Environment facts established by probe (read-only)

- **`git` is blocked platform-side** — terminal returns: "Git and GitHub commands are blocked;
  Vly manages version control." User confirms this is expected: **the project auto-syncs to
  GitHub**, so nothing is lost — it just means there is no local commit step to hook a gate onto.
- **`tools/verify.cjs` never syntax-checks `tests/`** — the load-order sweep covers the 37
  `public/` files only (rg for `tests/` in verify.cjs returns nothing). Two of the three
  multi-part-edit incidents (v2.15–v2.19) were in suite files.
- **144 literal `getElementById('…')` call sites** across `public/engine|systems|ui`; zero
  static check anywhere that those ids exist in `game2.html` (the shop-overlay bug class,
  KNOWLEDGE §5 checklist). Only live Playwright suites catch these today.
- Existing gates for calibration: `npm run verify` (syntax, content JSON, embeddedData mirror,
  PROJECT_MAP enforcement — the model of a gate nobody has to remember) and `npm test`
 (12 suites + 115-check trace, strict-gated).

## 1. The two named cases — feasibility verdicts

### 1a. "Recall, not read" (str_replace targets reconstructed from memory)

Recurred ≥4× (v2.15→v2.19), each caught by a net (node --check, live probe, self-check), each
logged as the same lesson. Net works; habit isn't improving.

- **Prevention via tool wrapping: NOT feasible.** The edit tools are platform-side
  (Freebuff/Vly/Daytona layer). No hook point exists between the agent's tool call and the sync
  layer; nothing can be built from inside the project to intercept or veto an edit.
- **Detection gate: FEASIBLE, CHEAP, biggest teeth-per-line in this report.** The failure mode's
  deterministic footprint (half-applied edit ⇒ broken syntax) is already what node --check
  catches — the gap is only *coverage*. Add `tests/**/*.cjs` (+ `tools/*.cjs`) to verify's
  syntax sweep: ~10 lines, zero new concepts, same "just there" property as the rest of verify.
- **Edit-receipt convention (file mtime must be ≤ last check): feasible but NOT recommended** —
  effort M, marginal value over the coverage fix, adds ceremony.

### 1b. B4 plan-first forcing function

- **As designed ("commit the plan"): NOT feasible — premise dead in this environment.** No
  local commit step exists to gate (git blocked; auto-sync is platform-managed, not
  agent-invoked). A pre-commit hook is structurally impossible here.
- **Alternative shapes considered and rejected:** verify checking for a plan artifact on disk
  (gameable, ceremony without teeth); verify reading agent todo state (todos are platform-side,
  invisible to disk tools).
- **Honest verdict:** the only remaining "gate" for plan-first is the session harness itself
  (the human). Recommendation: **re-scope B4 to docs-only** ("multi-file plans get restated in
  the session summary" — S, P3) or **retire it** and let WORKFLOW §1's record stand. A rule
  that can't be enforced and keeps being skipped should be shrunk, not re-logged. Note this is
  a *softening*, not a dismissal: externalized plans have demonstrably worked (every B-task
  this week opened with one); the gap is only the momentum case, and no mechanical gate for it
  exists on this platform.

## 2. Full §9/§10 audit — every reminder-standing-in-for-gate found

| # | Finding | Mechanical here? | Effort | Priority vs B1–B11 |
|---|---|---|---|---|
| F1 | verify never checks `tests/` syntax — the real gate for the recall-not-read lesson | **YES** | S | **P1 — biggest value-per-line; directly encodes a 4×-recurred lesson** |
| F2 | Stale DOM ids: 144 `getElementById` sites, no static id-existence check (shop-overlay bug class) | **YES** — verify already parses game2.html script tags; extract `id="…"` and cross-check the literals. Needs an allowlist for dynamically created ids (`slot-picker-overlay`, `dev-stage-overlay`, … — best sourced from PROJECT_MAP DOM lines) | M | **P2 — automates the §5 checklist's DOM step; kills a historical bug class** |
| F3 | B4 plan-first | **No** (git blocked; todo state invisible) | S | Re-scope to P3 docs or retire |
| F4 | B5 run_all check-counts `~0` for suites 5–7 | YES (harness reports counts; run_all display drifts) | S | P3 confirmed |
| F5 | B9 ESLint `no-undef` — partyBtn lesson still a manual habit | **YES** — wire ESLint (config exists) into verify or the battery | S | **P2 — same shape as F1: move an existing net into the gate** |
| F6 | §11 mobile gates report-only; promotion happens by remembering | Partially — verify could require *presence* of a migrated screen's viewport rows in the occlusion artifact (presence gate only, not quality) | M | P3 — weak tea; keep as watch-item |
| F7 | "Docs ride along" beyond PROJECT_MAP (spec/TESTING_PLAN/CHANGELOG) — enforced only by memory | **No honest gate.** Version headers aren't mechanically stamped here, so a changed-file⇒changed-changelog check has nothing to anchor on. Ceremony would cost more than it catches | — | Documented can't-fix |
| F8 | B1's negative-control rule ("suite done when proven able to go red") | Partially — battery could fail suites lacking a negative-control marker convention | S | P3 (low value at 12 suites; revisit at ~20) |
| F9 | M-list manual visual pass | **No — by design** (human-layer verification) | — | Documented can't-fix |
| F10 | Map-vs-code drift | Already gated (verify map checks, v2.11) — confirmed healthy, no action | — | Confirmed healthy |

## 3. The pattern the audit reveals

The lessons that keep failing are exactly the ones whose nets live **outside** the two enforced
gates. F1, F2, F5 are all the same move that made verify work for map rot in v2.11: take an
existing, proven, manually-invoked net and make it unconditional. Nothing new needs inventing —
this is coverage expansion, not new tooling.

## 4. Recommendation package (awaiting go-ahead; nothing built)

1. **F1 — verify syntax-checks `tests/` + `tools/`** (S, ~10 lines) — cheap and clearly correct.
2. **F5 — ESLint `no-undef` into the verify/battery gate** (S) — mechanically closes the
   partyBtn class; retires B9.
3. **F2 — DOM-id cross-check in verify** (M) — `getElementById` literals vs ids present in
   game2.html + PROJECT_MAP-sourced allowlist for dynamically created ids; goes red on the
   shop-overlay class before any browser boots.
4. **B4 — re-scope to docs-only or retire** (S) — its mechanism is impossible on this platform.
5. **Fold this report into WORKFLOW §11** as the durable record (incl. the documented
   can't-fixes F3/F6/F7/F8/F9), then **delete this temp file**.

Suggested landing order if approved: 1 → 2 → 3 (each: build → verify + battery strict →
rides-along docs → CHANGELOG v2.19.4), then 4–5 as the closing docs step.
