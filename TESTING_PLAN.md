# Automated & Unsupervised End-to-End Testing Plan

**Status:** Planned (v1) · **Date:** September 12, 2026 · **Owner:** dev agent + player
**Scope:** All game features + recent changes (v1.9.x–v2.2.0), runnable without human supervision, producing verdicts and artifacts a human reviews asynchronously.

---

## 0. Goals & Non-Goals

> **Tool inventory:** for what each test tool is, its npm script, and its limits, see
> `TOOLING_MAP.md` §2 (kept in sync with `package.json`). This document owns the test
> *architecture and manual checklist*; that one owns the *tool catalog*.

**Goals**
1. One command (`node isolate/test_e2e.cjs`) boots the real game in a real browser and verifies every feature end-to-end: title → save slots → town → quests → combat → level-ups → weapons → boss → results → back to town.
2. **Unsupervised:** deterministic (seeded RNG, injected clock), self-reporting (PASS/FAIL + artifacts), and safe to run on a schedule or after every change batch.
3. Verify the *player-visible* behavior, not just internals: what renders on canvas, what the HUD shows, what saves persist, what the end screen says.
4. Catch regressions in the bug classes this project has actually had: ghost runs, cross-slot contamination, dead ticks, dropped event fields, fallback drift, uncancellable timers.

**Non-goals**
- Pixel-perfect visual regression (no golden-image diffs yet — layouts still change weekly).
- Load/stress testing beyond the swarm gates in §6.
- Multi-browser certification (Chromium only; see manual list).

---

## 1. Current State (What Exists, What's Missing)

| Exists today | Gap |
|---|---|
| `tests/regression_trace.cjs` — 115 checks, Playwright headless Chromium, `file://` boot of `game2.html` (relocated from `isolate/` 2026-09-14) | Single file, regression-oriented; not a full game-loop driver |
| `tests/run_all.cjs` — autonomous aggregator over the trace + step-gated suites (`tests/suites/`) with artifacts under `tests/artifacts/` | L1 of this plan is operational now; step suites skip until each plan step lands |
| DOM/localStorage/canvas-pixel probing via `page.evaluate` | No scripted *play* (movement, kills, level-ups are simulated at the API/event level) |
| Screenshots taken ad hoc (`screenshots/*.png`, older scripts) | No visual comparison, no failure-artifact bundling |
| Fallback-mirror byte check (`content:check`) | Not wired into the trace run |
| Per-fix assertions (BUG-022..030, POT-001..014) | No feature matrix, no performance gates, no single summary report |

**Key structural fact:** `window.game` is fully exposed (game2.html:274). The trace already exploits this. The plan builds the E2E driver on the same contract — direct evaluation into the live game for *control*, real rendering/input for *verification*.

---

## 2. Architecture — Three Layers

```
L1  UNIT-ish (existing)        pure logic via page.evaluate on a booted game
    → keep as regression suite (97 checks), split into files by area

L2  GAME-LOOP DRIVER (new)     isolate/driver/* — plays the game like a player
    • boots game2.html (file:// — also exercises the POT-006 fallback path)
    • drives via the same inputs a player has:
        - InputManager events (mouse clicks for click-to-move, keyboard for ESC/1-5)
        - EventBus emits ONLY where the real systems emit them (death, pickup,
          quest events) — never injected into listeners that a player path
          wouldn't reach
    • fast-forwards time: `game.gameTime += n` + forced update(dt) ticks for
      long-horizon tests (boss at 8:00, farming timers) — never await wall-clock

L3  VERIFICATION (new)         isolate/lib/verify.js
    • DOM: querySelector text/classes (town chips, shop, end screen)
    • Canvas pixels: getImageData probes (HUD chips render, effects colored)
    • State: game.gameState.state, gameManager.store invariants
    • Persistence: localStorage raw + re-boot round-trips
    • Visual: screenshots + cheap heuristic checks (§5)
    • Performance: rAF FPS sampling, update(dt) p95 timing (§6)
```

Rule carried over from KNOWLEDGE.md's defensive-pattern lesson: **assert through the most player-visible surface possible.** (A kill counter can be checked in `_runKillCount`, but the HUD chip pixel-probe catches a renderer regression the counter can't.)

---

## 3. Determinism Infrastructure (required before the matrix is unsupervised)

- **D1 — Seeded RNG.** Every system call-site uses bare `Math.random()` (13 files). Fix once: a `Random` singleton (`seeded-math.js`, mulberry32) installed as `Math.random` replacement *only inside the boot page* (`page.addInitScript`), seed logged with every run so failures are reproducible: `node test_e2e.cjs --seed 12345 --replay`.
- **D2 — Clock control.** Farming (2-min real timers), sandboxes, and debounces use wall-clock. Driver virtualizes: replace `setInterval/setTimeout` in the page with a manual clock the tests advance (`page.clock`-style shim). Autosave heartbeat/debounce tests assert *call counts*, not sleeps.
- **D3 — Fixed canvas & DPR.** Viewport 1280×720, `deviceScaleFactor: 1`, deterministic font rendering flags. (Baseline for §5 heuristics.)
- **D4 — Audio stubbed at the ctx level** (`AudioContext` → offline/mock ctx that counts node starts). Audio *routing* is testable (which sound fired); audibility is not (→ manual list).
- **D5 — Storage isolation.** Fresh browser context per scenario; seeded saves built with the game's own `_createDefault()` (the existing trace's proven technique); origin-pinned to one `file://` path so slot keys never leak between runs.

---

## 4. Test Matrix

Legend: 🟩 exists in the trace · 🟨 partially covered · 🟥 new. "Drive" = L2 plays it.

### 4.1 Boot & content pipeline
- 🟩 All 14 content files load; fallback mirror populated (file://)
- 🟥 `content:check` runs as part of the suite (byte-sync gate)
- 🟥 Corrupt-one-JSON scenario: boot still succeeds on fallback; warning logged
- 🟩 Registry guard: unregistered content file fails generation (run generator in `--check` as step 0)

### 4.2 Title, slots, persistence
- 🟩 3 slots render with real summaries; legacy-key adoption; wipe flow
- 🟥 **Drive:** click through slot select → town → play → die → end screen → town → exit-to-title → re-enter (full loop, no API shortcuts)
- 🟩 Cross-slot contamination (BUG-026 family) incl. resume answered from title
- 🟥 Migration ladder: plant v1/v2/v3 stores → boot → assert v4 + values preserved

### 4.3 Town systems
- 🟥 **Drive:** shop buy/sell (gold debits, inventory changes), farming assign → virtual-clock complete → collect (gold via POT-011 wallet), estate production, camp upgrade (phase 2), disaster resolve
- 🟩 Quest start/complete via events
- 🟥 **Drive:** quest kill objectives by actually killing spawned enemies (L2 combat, not synthetic events)

### 4.4 Combat core (the big one — Drive)
- 🟩 Resume restore (time/kills/gold/level/weapons/boss flag/journal)
- 🟥 **Drive 60s of stage_graveyard standard:** move via click targets, take hits, collect pickups (XP/gold/health), verify: HUD gold chip == wallet, kill counter == kills-by-type sum, XP bar numbers == levelingSystem, timer advances
- 🟥 Weapon-by-weapon: for each of w1/w2/w3/w4/w5/w6/w7/w8 — force level, spawn dummy enemies, assert damage events fired + visual color matches weapons.json (POT-002 round-trip) + power-spike behavior at Lv4/Lv7 (explosion queue, chain, combo, nova)
- 🟥 Unlock pacing: level to 3 → slot 2 unlocks; to 6 → slot 3 (POT-005, now content-driven; also assert quick/highlight fallback)
- 🟥 Level-up flow: XP threshold → upgrade screen → pick option → applied to player stats
- 🟥 Power-up drops: force magnet/coin/screen-wipe drops from kill events; magnet pulls exp/coins within radius; screen-wipe kills all alive; drop rates roughly match pickup.json weights (N=200 seeded trials)

### 4.5 Boss & stage completion
- 🟥 Fast-forward to 3:55 → announcements fire in order → boss spawns → boss fight kills → bossDeath flow → stage result with stars
- 🟩 Result fields complete (BUG-028): gold_earned, time_survived, player_level, kills_by_type
- 🟥 Extended stage: 8:00 spawn + announcement lead ordering (POT-004 regression)
- 🟥 Star thresholds: run 3 variants (gold/time/kills) → 0★/2★/3★ boundary math

### 4.6 Death, end screen, exit (recent UX)
- 🟩 End screen: no auto-return, any-key → town, R → restart, 250ms lockout
- 🟥 **Drive:** press real keys through the InputManager (not direct calls); screenshot before/after dismiss
- 🟥 Defeat vs victory result paths both produce correct result + town return
- 🟥 Pause menu (§23, when built): ESC opens/closes, options work, state freezes (update() gated), resume/save/exit routes correct

### 4.7 Data-driven regressions (this session's wave)
- 🟩 POT-011 single ledger (pickup→wallet→spend→persist→migration)
- 🟩 POT-007 stable objective ids + reorder survival
- 🟩 POT-012 allowlist rejects + no vivify + legit paths
- 🟩 POT-003 companions via injected DataManager (no global)
- 🟩 POT-014 music-bus: owner/gen semantics (extend: assert stop actually stops scheduled nodes via D4 mock)
- 🟥 POT-014 real flow: title→combat transition fires exactly one stop (D4 call count)

### 4.9 Post-plan system suites (added 2026-09-14)

> **Static gate (v2.11.0; F1/F5/F2 v2.19.4):** `npm run verify` additionally enforces
> `PROJECT_MAP.md` — every load-order file must have a contract block, every block's `Defines:`
> symbols must exist in source, Status must be a valid lifecycle value, GuardedBy suites must
> exist, §3.1 content rows must point at real files — plus three mechanical gates: **F1**
> syntax-checks every `tests/`/`tools/` file, **F5** runs ESLint no-undef over the game files
> (cross-file globals declared in `tools/game_globals.cjs`, rot-guarded against this map), and
> **F2** cross-checks every literal DOM id against game2.html + the map's Dynamic-create
> allowlist. New/renamed file without a block = red, per KNOWLEDGE §19.
- 🟩 `step1_gate_engine.cjs` — ConditionEngine: typed conditions, combinators, fail-closed, quest routing (30)
- 🟩 `step2_npc_system.cjs` — NPC system + canonical memory log incl. save/reload round-trip (30)
- 🟩 `step3_widget_inventory.cjs` — widget pilot + inventory canonical home + POT-015 + gold chip + §6.4 inspector (list/inspect/occlusion + veiled negative control) (26)
- 🟩 `step4_export.cjs` — roleplay export: spoiler cutoff, favorites, purity + favorites-browser UI flow (v2.19.11: seeded slot → widget cards → click → back) (11)
- 🟩 `calendar_time.cjs` — event-driven days, biomes, locked modifier rule, log day-stamps (27)
- 🟩 `game_log.cjs` — session console capture, ring buffer, UI, two-logs purity (18)
- 🟩 `widget_occlusion.cjs` — §7 occlusion audit + negative control + §11 promoted gates (game-log panel, pause cards, town chips, dialogue choices, loadout cards, shop tabs, title menu at all 3 viewports) (37)
- 🟩 `step5_loadout_widgets.cjs` — loadout pooled cards + chrome identity + v1.2 selected-bind/def-swap + confirm payload + Next-button label pin (12)
- 🟩 `step6_shop_tabs.cjs` — shop chips/selected-bind, v1.3 disabled suppression, purchase flow, tab round-trip (former pilot pool bug), def-swap skin evidence (10)
- 🟩 `step7_title_menu.cjs` — title menu pooled strip + locked-as-DATA (no emission, denial kept) + declared-event funnel + keyboard parity + pool identity + selection-reset (15)
- 🟩 `save_fuzz.cjs` — B1 save-integrity fuzz: 50 seeded mutants + 5 corrupt-JSON roots → boot survives, v9 lands, phase stays dead; double-boot race preserves totals (57)
- 🟩 `visual_probe.cjs` — B2 COMPLETE (slice 1 v2.19.6 + slice 2 v2.19.8 + slice 3 v2.19.10): screenshot QA in the battery — structural screenshots (title/town/combat/paused/levelup/boss/end/shop/loadout) into `artifacts/visual_*/` + pixel probes: DOM-layer render checks for the DOM screens, canvas variance + timer/gold/XP text pixels for combat, paused frame-stillness, real-path flows (XP-grant level-up incl. drain, skipToBoss boss spawn, end-screen show, shop catalog on content/shop.json, loadout widget picks), negative control proving the blank detector fires on solid buffers (25)
- Run everything: `npm test` (skip-safe) / `npm run test:strict` (skips fail).

### 4.8 Save integrity fuzz — 🟩 DONE v2.19.3 (`tests/suites/save_fuzz.cjs`, 57 checks)
- 🟩 50 seeded random mutations of a valid v9 save (dropped keys, wrong types, injected ghosts, version chaos) + 5 corrupt-JSON roots → boot never throws, migration lands v9, retired `phase` never resurrects (first run caught 3 real gaps: string-version chain bypass, `counters=null` title crash, scalar-root acceptance — all fixed at the `_migrate` shape gate)
- 🟩 Double-boot race: 3 consecutive boots against one seeded slot → totals never duplicated/lost (POT-010 family); anti-vacuous seed control (`__fuzzSeeded`) required per boot

---

## 5. Visual QA Layer (screenshots, unsupervised)

No golden-image gating yet. Instead, cheap deterministic heuristics per screenshot:

> **Status (v2.19.10):** B2 is COMPLETE — `tests/suites/visual_probe.cjs` (in the battery, 25
> checks) automates items 1–3 across all nine §5.2 structural scenarios (title, town, combat,
> paused, level-up, boss, end screen, shop, loadout) with layer-correct render probes and the blank-
> detector negative control. What remains open is item 4 only (golden-image diffing), which
> stays a later-phase decision. The M-list (§9) is untouched — probes verify presence, never
> aesthetic quality.

1. **Pixel probes on the live canvas** (already proven): HUD gold chip color present at expected coords; XP bar numbers rendered; kill chip renders; end-screen breakdown text (DOM) matches `_killsByType`. *(gold chip + XP bar live in visual_probe; kill chip + end-screen breakdown remain trace checks)*
2. **Structural screenshots** saved per scenario: `artifacts/<runid>/NN_<name>.png` — title, town, shop open, combat T+30/T+120, boss spawn, level-up screen, end screen, pause menu. A human skims the artifact folder after each run — this is the "screenshot" channel doing real QA work without automation overhead. *(all eight captured by visual_probe every battery run)*
3. **Cheap frame checks:** non-blank variance (stdev > threshold in a downsampled buffer — catches blank-preview class), HUD region unchanged when it shouldn't change (paused state really frozen). *(both live in visual_probe, incl. combat/boss variance)*
4. Later (v2): pixel-diff against last-*approved* screenshots with a small tolerance, gated on explicit approval commits.

---

## 6. Performance Gates (headless, relative — not laptop-truth)

- **P1:** 60s standard stage at default spawn: p95 frame `update(dt)` < 8ms, no frame > 50ms.
- **P2:** extended stage T+8:30 (boss + swarm): entity count gate + p95 < 16ms.
- **P3:** screen-wipe with 300 alive entities: single update < 33ms.
- **P4:** boot → interactive (title visible) < 5s on CI hardware; embeddedData parse < 200ms.
Headless numbers are smoke gates (catching 10× regressions), not feel — see manual list.

---

## 7. Reporting & Failure Artifacts

One run = one folder:
```
artifacts/<timestamp>/
  report.json      # {seed, pass[], fail[], durations, perf, content:check}
  report.md        # human-skimmable: ✅/❌ per matrix cell, links to artifacts
  NN_*.png         # structural screenshots
  fail_*.png       # screenshot at assertion moment + page state dump
  console.log      # full page console (filtered of known-benign file:// noise)
  last_error.stack # pageerror with game state snapshot (state, gameTime, slot)
```
Exit code 0/1 → usable from CI, a wrapper script, or a manual "run suite" command. Failures always include: seed, scenario name, screenshot, console tail, and the store snapshot — enough to debug without re-running.

---

## 8. Operating It Unsupervised

- `bun run test:e2e` → L1+L2+L3 full suite (target < 10 min).
- `bun run test:e2e -- --fast` → L1 + smoke Drive (boot, slot loop, 60s combat, boss ff) (< 3 min).
- `content:check` + generator `--check` always run as step 0 (POT-006 gate).
- Suite runs **after every change batch** and at session start as a health check; report.md pasted into the session summary. The player reviews screenshots + failures async; no supervision required to *run*.

---

## 9. Known Limits → **Manual Testing Needed Afterwards**

Automation cannot verify these; each needs one focused human pass on the laptop:

| # | What | Why it can't be automated | How to test |
|---|---|---|---|
| M1 | **Audio as heard** — title BGM fade timing, combat SFX, level-up sting, quest/boss stingers, volume slider, tab-hide silence | D4 stubs verify routing/counts, not audibility/mix balance | One combat run with sound on; toggle music slider; hide tab mid-track |
| M2 | **New visuals read well** — w8 brown slam + orange explosion distinctness (BUG-030 fix), HUD chips (gold/kill/XP numbers) legibility at small window sizes, 5 weapon slots + chips not crowding on narrow widths | Aesthetic legibility, not presence | One fight per weapon family; resize preview to ~800px wide |
| M3 | **Feel** — click-to-move responsiveness, camera easing, hit feedback, 250ms end-screen lockout vs. "instant" feel | Subjective timing | Casual 5-minute run; end a fight and try to double-dismiss |
| M4 | **Real resume on real hardware** — all planted-save traces are synthetic; do one organic interrupt (close tab mid-boss-fight), reopen, resume: level/timer/gold/kills/weapons/boss flag all correct (BUG-027/029 family) | pagehide timing + real origin storage | Close tab during extended-stage boss; reopen; resume |
| M5 | **Performance feel on laptop** — headless gates (§6) don't equal 60fps on your hardware; extended stage late-wave stutter, input latency | Hardware-dependent | Extended standard run to boss; watch for hitching |
| M6 | **Cross-browser spot check** — Firefox + Safari/WebKit: AudioContext unlock, fetch fallback path, performance.now behavior | Only Chromium is automated | Load title + one fight in each browser |
| M7 | **NPC dialogue presentation** — typewriter pacing, portrait rendering (POT-001 still open: base64 portraits), dialogue-option layout | Subjective + pending migration | Talk to every NPC once in town |
| M8 | **Save-slot UX honesty** — slot summaries match reality after the M4 session (dates, level, quest counts render correctly) | Visual correctness of derived data | Glance at title slot cards after M4 |
| M9 | **ESC pause menu (once built)** — ergonomics of pause during chaos, does ESC feel safe mid-boss | New UX, needs a human opinion | Pause mid-swarm, resume, exit-to-town |
| M10 | **Calendar & date chip** — 📅 chip reads sensibly, hover context (season/festivals) is right, chip updates after a run (+1 day) and story skips; season flip at month boundary feels correct in dialogue conditions later | Visual + feel of time passing | One run; then console `game.timeService.advanceDay(30,'story_skip')` and re-enter town; check chip + hover |
| M11 | **Game log console** — 📖 Log chip opens/closes; purchase/run/level entries appear with correct day stamps; errors show as ⚠; panel readable at 800px width | Presentation + usefulness, not presence | Open the panel, buy a potion, finish a run, read the tail |
| M12 | **Roleplay export (§9 simulation, spec)** — copy a card into your external AI tool; run the scripted scenarios: spoiler leakage, relationship accuracy, jealousy resistance, meta-questions, personality drift | External model behavior | Follow npc_memory_roleplay_export_spec.md §9.2 tests 1–7; score pass/partial/fail |

**Manual session script (suggested order):** M4 → M8 → M1 → M2 → M3 → M9(if built) → M7 → M11 → M10 → M12(async, at your desk) → M5 → M6. ~30 minutes total.

---

## 10. Build Order (sessions)

1. **Session A — determinism + harness split:** D1–D5, split the 97-check trace into `isolate/suites/` by area, report.json/report.md artifacts, content:check wiring. *Deliverable: same coverage, one command, clean reports.*
2. **Session B — the Driver:** L2 click/keyboard input driving, full slot→town→combat→death loop (4.2), HUD equivalence checks during live combat (4.4 first block).
3. **Session C — combat depth:** weapon-by-weapon matrix incl. power spikes, unlock pacing via content, level-up/pickup/drop flows (4.4 rest + 4.6 Drive).
4. **Session D — bosses, stars, fuzz, perf:** 4.5 + 4.8 + P1–P4 + screenshot heuristics; wire wrapper + fast mode.
5. **Session E (with pause-menu build):** 4.6 pause tests ride along; extend music-bus flow test (D4 counts).

After each session: run suite, attach report.md, update this file's matrix checkmarks, and log any new manual items discovered.
