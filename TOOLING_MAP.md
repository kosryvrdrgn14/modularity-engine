# Tooling Map — Human + AI Development Reference

**Purpose:** one catalog of every tool available for building this game — what it is, who it's
for, when to reach for it, and what it depends on. Read this before reaching for an ad-hoc
command or reinventing something that exists.

**How this document is meant to be used:** this is a working document, not a finished one. Use
it from the start of active development — the build process is the validation pass for the
tools themselves. When something in here doesn't work as described, feels missing, or turns out
unnecessary, log it in §5 immediately rather than quietly working around it. A tool that's hard
to discover or awkward to invoke is a bug in this document, not just an inconvenience.

**Verification basis:** every status below was checked against the repo on 2026-09-14
(v2.10.0). Stale entries from the original draft are recorded in §5 rather than silently
corrected, so the correction history stays visible.

---

## 1. Layer 1 — In-Session Dev Tools

Require a live game session (or a title screen). Useful to human and AI alike once the game is
running. Console tools: open DevTools, type the accessor.

| Tool | Status | Purpose | Access |
|---|---|---|---|
| Dev: Stage Select | Built | Jump directly to any stage/tier for testing | Title menu → 🧪 Stage Select |
| Dev: Choose Weapons | Built | Free weapon-loadout selection, bypassing unlock progression | Title menu → Stage Select overlay → "Dev: Choose Weapons" |
| Dev: Choose Companions | Built | Free companion pairing for testing | Same overlay |
| Sandbox System | Built | Endgame build/weapon-level testing with live DPS/kill stats; config surface is the shop's Sandbox tab | Town → shop overlay (Sandbox mode) |
| Quest Inspector | Built (v1.0-era) | Quest state debugging: dump state, complete/activate quests | Console: `__QUEST_DEBUG__` |
| NPC Condition Inspector | Built (v2.5.0) | Why an NPC's location/dialogueSet/mood resolved the way it did; log queries; full schema reference | Console: `__NPC_DEBUG__.evaluate('old_man')`, `.explain('old_man')`, `.log(id)`, `.schema()` |
| Game Log Inspector | Built (v2.9.0) | Session console tail: filter, dump-to-clipboard, clear | Console: `__GAMELOG_DEBUG__.last(20)`, `.filter(q)`, `.dump()` |
| Widget Inspector | **Planned** (`widget_ui_system_spec.md` §6.4) | Which layout/skin/bindings produced a given on-screen card | Not yet built (renderer already keeps a def registry — hook point exists) |
| Widget Live-Preview | **Built (v2.12.0; v1.1.1 + v1.2 regressions v2.16.0–v2.17.0)** (`widget_ui_system_spec.md` §6.3) | Render every layout × size × skin against dummy data + contract edges (missing data renders empty; declared-event click; pooled rebind emits rebound payload; warm-pool def-swap emits the NEW event + selected-bind; pool hides surplus nodes), screenshot the matrix for the manual §4.4 contrast check | `npm run widget:preview` |
| Date/Time Inspector | Built (v2.8.0) | Current day, resolved season per region, active festivals, modifiers | Console: `game.timeService.getDateContext()`, `.getSeason('graveyard')`, `.getActiveModifiers()` |

**Known gap (confirmed 2026-09-14):** entry points are inconsistent — Stage Select/Weapons/
Companions behind the title menu's dev overlay, Sandbox through the town shop UI, three
inspectors console-only. **Recommendation stands:** consolidate behind one central dev surface
with one documented route in.

---

## 2. Layer 2 — Codebase / Automated Verification Tools

Operate on the codebase directly. No live session required. Everything here is invoked via
named npm scripts (see standardization below) — that is what makes them agent-discoverable.

| Tool | Status | Purpose |
|---|---|---|
| **Playwright headless suite** | **Built & primary safety net** — 10 suites + 112-check regression trace, all green, in version control (`tests/`) | Drives the REAL game (bootGame harness, real state transitions per KNOWLEDGE §2b): gate engine, NPC/memory log, widgets/inventory, export purity, calendar, game log, loadout + shop widget screens, occlusion/§11 viewport gates, plus the full historical trace. `npm test` (skip-safe) / `npm run test:strict` (skips fail) / `npm run test:trace`. Artifacts in `tests/artifacts/` |
| **Trace harness (`tests/lib/harness.cjs`)** | Built | `bootGame()` headless browser boot with error net, storage control (`keepStorage` + reload for true persistence round-trips), per-step API detectors, PASS/FAIL runner with CI-friendly exit codes. THE canonical way any agent drives real game state |
| **`tools/verify.cjs`** | **Built (v2.10.0; map checks v2.11.0)** | `npm run verify` — syntax-checks all 37 game files IN REAL LOAD ORDER + validates all 16 content JSONs + embeddedData mirror sync + **enforces PROJECT_MAP.md** (block coverage both ways, `Defines:` symbol presence, Status enum, GuardedBy suites, §3.1 content rows). `npm run verify:trace` adds the regression trace. ~2s without trace; the first command to run after any edit |
| **`PROJECT_MAP.md`** | **Built (v2.11.0), verify-enforced** | The file-contract map: one block per load-order file (cross-file edges only), load-order tiers, §3 reverse indexes (content consumers, event emitters→listeners, store-branch ownership), §4 archetype templates, §5 health log. Maintenance law: KNOWLEDGE §19 |
| `node --check` | Available (Node built-in) | Per-file syntax. verify.cjs wraps it across the load order; use directly for a single file |
| ESLint | **Limited: TS/React only** — `eslint.config.js` scopes `**/*.{ts,tsx}`; the game's plain JS in `public/` is NOT linted (`npm run lint` will not catch game-code `no-undef`) | For the Vite/React shell. The real JS safety net is verify.cjs + the trace. Scoping ESLint onto `public/` is possible but will flood with game-style findings — decide deliberately (§5) |
| **POT-006 content pipeline** | Built & documented-here | `public/content/*.json` are the single content source. Registration contract: a new content file joins BOTH `DataManager.loadAll()`'s fetch list (`engine/core.js`) AND the generator registry (`tools/generateEmbeddedData.mjs`) — miss either and the mirror goes out of sync / the orphan guard errors. Scripts: `npm run content:sync` (regenerate `public/data/embeddedData.js`), `npm run content:check` (byte-verify). Build-time condition validation runs through the shared ConditionEngine |
| ConditionEngine `validate()` | Built (v2.4.0) | Load-time validation of condition objects with human-readable paths; wired into the content pipeline for quest + NPC gates, and into TimeService for calendar modifiers |
| Duplicate-method/key/switch-case AST checker | **LOST — not on disk** (original draft said Built; no acorn script exists in the tree and acorn is not a dependency) | Was a session artifact. Rebuild is cheap (~50 lines with acorn) if duplicate-declaration bugs reappear — log an entry first per §5 |
| Orphan-file cleanup script | **LOST — not on disk.** What exists: the generator's unregistered-content guard (narrow, content-only) and `tools/audit_monolithic_backup.cjs` (backup-recoverability audits) | If orphan cleanup is needed again, rebuild as a tools/ script with dry-run default; do NOT hand-delete |
| Data-extraction script | Historical (one-time) | Monolith-split era; the split is long done. Root fossils `generate_copy.cjs`, `extract_engine.html`, `file_split.html`, `gamesplit/`, `test_enemy_fix.cjs`, `test_upgrade_bug.cjs`, `test_upgrade_fix.cjs`, `test_weapon_unlock.cjs` are the same era — candidates for the §22.3-style audit-then-delete pass, NOT living tools |
| Occlusion detection (`elementFromPoint`) | **Built (v2.12.0; §11 viewport matrix v2.12.1)** (`widget_ui_system_spec.md` §7+§11) | Every interactive widget instance must actually be clickable at its position, across a 3-viewport matrix (desktop 1280×800 GATING; mobile portrait/landscape REPORT-ONLY until promoted per §11); non-vacuous (negative control); runs in the battery + `npm run widget:audit` | `tests/suites/widget_occlusion.cjs` |
| `tools/recover_styles_css.cjs` + `tools/audit_monolithic_backup.cjs` | Built (v2.7.0/v2.9.1) | Read-only git-object-DB readers (no git CLI — it's blocked in this environment). Recovery of an accidentally-deleted/mangled tracked file; audit-before-delete for any backup. Reference implementations for KNOWLEDGE §15/§18 patterns |

### npm script standardization (synced with package.json — these all exist)

```
npm run verify          # tools/verify.cjs — load-order syntax + content + mirror sync + PROJECT_MAP contracts
npm run widget:preview  # tools/widget_preview.cjs — §6.3 live-preview matrix + screenshot
npm run widget:audit    # tests/suites/widget_occlusion.cjs — §7 occlusion audit (also in battery; §11 gates: game-log, pause, chips, dialogue, loadout, shop tabs)
npm run verify:trace    # verify + the full headless regression trace
npm run test            # all 7 suites (skips allowed pre-implementation)
npm run test:strict     # all suites, skips FAIL — post-implementation gate
npm run test:trace      # regression trace only
npm run content:sync    # regenerate public/data/embeddedData.js from public/content/*.json
npm run content:check   # byte-verify the mirror is in sync (also runs inside verify)
npm run lint            # eslint — TS/React shell ONLY (see limitations above)
npm run dev / build     # vite dev / production build (platform-managed; do not run dev manually)
```

**Agent convention:** after any edit to `public/`, run `npm run verify` (fast) and, when
behavioral, `npm test`. These two are the minimum evidence for "it compiles and nothing broke."

---

## 3. Layer 3 — Human-Primary Tools & Decisions

Not automatable, or not worth automating — named so they're deliberate steps, not skipped ones.

- **Visual QA** — looking at the rendered screen. The occlusion detector will confirm
  clickability, never that something *looks* right. Manual checklist: TESTING_PLAN.md §9 (M1–M12).
- **§9 export simulation** — the roleplay-export validation plan
  (`npc_memory_roleplay_export_spec.md` §9.2, tests 1–7, scored pass/partial/fail). Human-judged
  by design; tracked as manual item M12.
- **Multi-model session routing** — choosing which AI model handles which task
  (wide-context architecture/audit vs narrow implementation/debugging). Working well; keep.
- **Design/architecture review checkpoints** — periodic passes comparing recent work against
  documented intent (the `project_review` pattern; Claude's session reviews fill this role).
- **Repo administration** — visibility, branches, archive hygiene. NOTE: git CLI is blocked in
  agent sessions (platform-managed version control); repo admin is human-side. Agent-side
  recovery/audit of repo state goes through the Layer-2 object-DB tools.

---

## 4. Reference Docs Index

| Doc | Covers |
|---|---|
| `MASTER_DESIGN.md` | Overall architecture, §24 plan-of-record, implementation status |
| `PROJECT_MAP.md` | Per-file contract blocks, load-order tiers, coupling indexes, archetype templates — enforced by `npm run verify` |
| `KNOWLEDGE.md` | Working-agreement rules for human/AI collaboration (incl. §15–18 session lessons) |
| `TESTING_PLAN.md` | Three-layer test architecture, manual checklist M1–M12, unsupervised operation |
| `TOOL_AUDIT_PLAN.md` | Per-tool verdicts and probe recipes for THIS environment's toolset |
| `CHANGELOG.md` | What changed, when, and why — the status record |
| `data_driven_systems_compilation.md` | Cross-system dependency map, verified build order, one-rule |
| `npc_condition_system_spec.md` | NPC dialogue/location/mood selection, canonical memory log (Step 2) |
| `npc_memory_roleplay_export_spec.md` | Export system: checkpoints, favorites, constraints, §9 test plan |
| `widget_ui_system_spec.md` | Card template, skinning, pooling, inspector/preview/occlusion specs |
| `calendar_time_system_spec.md` | Event-driven calendar, season resolution, locked modifier rule |
| `game_log_system_spec.md` | Session console; the two-logs boundary |
| `ui_convention_reference.md` | **Planned** — curated UI/UX conventions from genre peers, mapped onto the widget system |
| `TOOLING_MAP.md` | This document |

---

## 5. Live Notes / Adjustments Log

Add an entry any time something here turns out wrong, missing, or unnecessary once actually
used. Keep entries short — date, what happened, what changed as a result.

```
[Template entry — copy this format]
- Date:
- Tool/section affected:
- What happened:
- Adjustment made (or still open):
```

---

- Date: 2026-09-14
- Tool/section affected: §1 (Layer 1), §2 (Layer 2), §4
- What happened: Initial verified rewrite. Original draft claimed the NPC inspector and three
  npm scripts were unbuilt/planned that are Built (NPC inspector, test, content:sync/check);
  claimed an acorn AST checker and orphan script exist that are NOT on disk; described the
  Playwright suite as "in progress" (it is the primary safety net); omitted the three console
  inspectors, the trace harness, both git-object-DB tools, and five reference docs; listed
  monolith-split fossils as living tools.
- Adjustment made: statuses corrected against repo; fossils marked historical; missing
  tools/docs added; §2 npm block synced with package.json; verify.cjs actually built (v2.10.0)
  so the doc's promise exists. Open: ESLint scoping decision (leave TS-only vs carefully
  extend to public/); dev-menu consolidation (§1 gap); rebuild-or-drop decisions on the two
  LOST tools if their bug class reappears.

---

- Date: 2026-09-14
- Tool/section affected: §2 verify.cjs
- What happened: Built and ran green on first pass (37 files, 16 content JSONs, mirror sync).
  Trailing note: the load-order extraction regex expects `<script src="..."></script>` exactly;
  if game2.html ever gains `<script ... />` or attribute variations, verify silently checks
  nothing — the 0-files guard fails loudly in that case.
- Adjustment made: none needed yet; watch when editing game2.html's script block.

---

- Date: 2026-09-23
- Tool/section affected: §2 (verify.cjs, PROJECT_MAP.md), §4
- What happened: Built PROJECT_MAP.md (37/37 contract blocks) and integrated map validation into
  verify (coverage both directions, Defines symbol presence, Status enum, GuardedBy existence,
  §3.1 content rows). Two map attribution errors were caught and fixed before first green
  (`evaluateCondition` → actual API is `ConditionEngine.evaluate`; `__QUEST_DEBUG__` is a flag SET
  in engine/game.js and READ by quest/npcSystem, listed in the setter's Defines and readers' Calls).
  One parser regex bug found and fixed pre-green (body lookahead terminated at its own header line).
- Adjustment made: this row. Open items live in PROJECT_MAP §5, not here: §5.5 dead-event audit
  list (19 emitted events with no static listener), §5.6 `persistent.town` dual-writer decision —
  map-scoped, not tool-scoped.

---

- Date: 2026-09-23
- Tool/section affected: §1 (Live-Preview, occlusion), §2 (npm block)
- What happened: Built both tools per widget_ui_system_spec.md §10's tool-first phase. Preview
  inlines the real renderer + real widget CSS (no copy drift); its Node import goes through the
  file's globalThis bridge (module.exports is unreliable in this environment). Occlusion audit
  consumes the renderer's `_instances` registry; required the REAL presentation path
  (townScreen.show() + shop.openShop()) — rendering with overlay classes missing yields 0×0 rects,
  a "screen not open" state §7 explicitly does not target. Suite includes a negative control so it
  cannot pass vacuously.
- Adjustment made: rows moved Planned→Built; npm block updated. Open: Widget Inspector (§6.4)
  remains Planned — registry hook point already exists.

---

- Date: 2026-09-23
- Tool/section affected: §2 (Playwright suite row, Live-Preview row), TESTING_PLAN §4.9
- What happened: Documentation-maintenance pass after v2.16.0 (dialogue-overlay migration).
  Found drift caught early: the Playwright row still said "7 suites, 265 contract checks" (battery
  is 8 suites since widget_occlusion joined; check counts go stale every session, so the count was
  dropped in favor of naming the suites); the Live-Preview row said "both contract edges" (it now
  proves 4, including the v1.1.1 pooled-rebind regression); TESTING_PLAN §4.9 was missing the
  occlusion suite and showed game_log at its old check count (12→18). Same lesson as the audit
  rows: statuses and counts drift every migration — a two-minute grep of "Built (v" + suite names
  per doc catches it.
- Adjustment made: rows and §4.9 updated. Note: per-suite check counts in TESTING_PLAN are
  re-verified against battery output at each documentation pass, not trusted from memory.
