# Automated & Unsupervised End-to-End Testing Plan

**Status:** Planned (v1) · **Date:** September 12, 2026 · **Owner:** dev agent + player
**Scope:** All game features + recent changes (v1.9.x–v2.2.0), runnable without human supervision, producing verdicts and artifacts a human reviews asynchronously.

---

## 0. Goals & Non-Goals

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
| `isolate/test_pot_fixes.cjs` — 97 checks, Playwright headless Chromium, `file://` boot of `game2.html` | Single file, regression-oriented; not a full game-loop driver |
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

### 4.8 Save integrity fuzz
- 🟥 50 seeded random mutations of a valid save (dropped keys, wrong types, injected ghosts) → boot never throws, degraded-mode path or migration handles each
- 🟥 Double-boot race: two boots against same slot (refresh storm) → no duplicate totals (POT-010 family)

---

## 5. Visual QA Layer (screenshots, unsupervised)

No golden-image gating yet. Instead, cheap deterministic heuristics per screenshot:

1. **Pixel probes on the live canvas** (already proven): HUD gold chip color present at expected coords; XP bar numbers rendered; kill chip renders; end-screen breakdown text (DOM) matches `_killsByType`.
2. **Structural screenshots** saved per scenario: `artifacts/<runid>/NN_<name>.png` — title, town, shop open, combat T+30/T+120, boss spawn, level-up screen, end screen, pause menu. A human skims the artifact folder after each run — this is the "screenshot" channel doing real QA work without automation overhead.
3. **Cheap frame checks:** non-blank variance (stdev > threshold in a downsampled buffer — catches blank-preview class), HUD region unchanged when it shouldn't change (paused state really frozen).
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

**Manual session script (suggested order):** M4 → M8 → M1 → M2 → M3 → M9(if built) → M7 → M5 → M6. ~25 minutes total.

---

## 10. Build Order (sessions)

1. **Session A — determinism + harness split:** D1–D5, split the 97-check trace into `isolate/suites/` by area, report.json/report.md artifacts, content:check wiring. *Deliverable: same coverage, one command, clean reports.*
2. **Session B — the Driver:** L2 click/keyboard input driving, full slot→town→combat→death loop (4.2), HUD equivalence checks during live combat (4.4 first block).
3. **Session C — combat depth:** weapon-by-weapon matrix incl. power spikes, unlock pacing via content, level-up/pickup/drop flows (4.4 rest + 4.6 Drive).
4. **Session D — bosses, stars, fuzz, perf:** 4.5 + 4.8 + P1–P4 + screenshot heuristics; wire wrapper + fast mode.
5. **Session E (with pause-menu build):** 4.6 pause tests ride along; extend music-bus flow test (D4 counts).

After each session: run suite, attach report.md, update this file's matrix checkmarks, and log any new manual items discovered.
