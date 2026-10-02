# Modularity Engine — Project Wiki

**What this is:** the agent-facing map of this project — how it is built, what is true right now,
what is planned next, and the rules that keep it that way. It covers **current state** and **future
state**, and it is written so an agent with **no access to the repository** can answer most
questions, then work safely once it does have access.

**Canonical source:** this file (`docs/WIKI.md`). The GitHub Page at `docs/index.html` is
*generated* from it by `npm run docs:wiki` (`tools/wiki_build.cjs`). Never hand-edit the HTML — edit
this file and rebuild, or the two will drift.

**Snapshot this wiki was written against:** v2.19.43 (2026-09-30) · battery **585 checks / 15
suites, strict green** · game scripts **36** · content JSONs **17** · DOM ids in the shell **104**.

**Repo of truth for specifics:** `PROJECT_MAP.md` (per-file contracts, verify-enforced),
`KNOWLEDGE.md` (working agreement), `WORKFLOW.md` (process + backlog), `TOOLING_MAP.md` (tool
catalog), `TESTING_PLAN.md` (test architecture), `CHANGELOG.md` (history). This wiki **summarises
and links**; it never overrides them. Where this page and a repo doc disagree, the repo doc wins —
and the wiki is a bug to be fixed.

---

## 1. Start here

### 1.1 What the project is

**Modularity Engine** is a gothic-survival game with a town-hub / combat-run loop. You run timed
expeditions into cursed locations (graveyard, forest, refugee camp…), fight escalating waves with
weapon + companion builds, collect drops, and spend gold, materials and story progress back in town
on NPCs who remember what you did.

The distinguishing systems, and the reason the architecture looks the way it does:

- **Canonical NPC memory log** — one append-only, store-backed log is the only source of story
  memory. It is the input to dialogue, affection, and the roleplay-export feature. There is exactly
  one memory log by design (see rule *two logs, two purposes* in §10).
- **Condition-driven content** — one shared, fail-closed condition evaluator gates quests, NPC
  dialogue/location selection, and calendar modifiers. No feature may fork condition logic.
- **Data-driven everything** — 17 content JSONs define monsters, weapons, stages, quests, NPCs,
  locations, shop stock, skins, calendar, pickups, companions. Systems are content-agnostic.
- **One test battery** — 15 headless-browser suites (585 checks) plus static gates that fail the
  build, not just warn.

### 1.2 Two codebases live in this repo

| | The game | The shell |
|---|---|---|
| Lives in | `public/` | `src/` |
| Language | plain classic-script JS (no modules, no bundler) | TypeScript + React 19 + Vite + Convex |
| Boots from | `public/game2.html` (script-tag concatenation over window globals) | `src/main.tsx` |
| Served | `/game2.html`, inside an `<iframe>` | routes `/`, `/game`, `/auth`, `/dashboard` |
| Tests | the 15-suite battery (`tests/`) | TypeScript typecheck only |

`src/pages/Game.tsx` renders `<iframe src="/game2.html">`. The shell handles landing page, auth
and routing; **almost every engineering decision lives in `public/`, `tests/` and `tools/`.** If you
are changing gameplay, you are in `public/`.

### 1.3 Running the game

The game is a **static site**: `public/game2.html` plus its scripts and content JSONs. There is no
build step for it, and the battery boots it straight off `file://`.

- **In this platform (how agents normally work):** the dev server is started and managed for you.
  Never run `npm run dev`, never kill or restart a server — edit files and they are picked up. The
  route `/` (and `/game`) shows the game in an iframe.
- **Outside the platform (plain clone):** any static server over the repo root works —
  `npx serve .` then open `/game2.html` — or open the file directly, which also exercises the
  offline content-mirror path.
- **Headlessly:** see §8.5 — `tests/lib/harness.cjs` boots the real game in Chromium; that is how
  every suite drives real state.

### 1.4 How to use this page

- **No repo access?** Sections 2–7 give you the map; 12–14 give you the roadmap and what is
  genuinely undecided. Ask for file contents before writing code.
- **Repo access?** Read §9 (verification) and §10 (rules) *before* your first edit, then use §12's
  recipes. Re-read this page's §16 on how it is maintained.
- **Are you an agent?** Everything here is written to be acted on: exact commands, exact file
  ownership, and the specific failure modes this project has actually hit.

---

## 2. Quick facts

| Fact | Value |
|---|---|
| Game entry | `public/game2.html` (shell + script tags; ~104 DOM ids) |
| Game code | 36 classic-script files under `public/{data,engine,systems,ui}` |
| Orchestrator | `public/engine/game.js` (`window.game`; constructs everything, owns the loop) |
| Content | 17 JSONs in `public/content/` + schemas in `public/schemas/` |
| Generated data | `public/data/embeddedData.js` (mirror; never hand-edit — `npm run content:sync`) |
| Styles | `public/styles.css` (~2.1k lines; classes swept by `tools/css_sweep.cjs`) |
| Save schema | `persistent.*` branches; current migration **v9** |
| Event bus | `window.EventBus` in `public/engine/core.js`; ~60 events |
| Fast gate | `npm run verify` (~seconds: syntax, content, map, F1/F5/F2, skin assets, patch selftest) |
| Full gate | `npm run release:check` (verify + strict battery + CHANGELOG hygiene) |
| Battery | `npm run test:strict` — 585 checks / 15 suites, skips are failures |
| Dev server | platform-managed; **never** run `npm run dev` / restart servers from a session |
| Version control | **git CLI is blocked** in agent sessions; repo admin is human-side |
| Secrets | never edit `.env*`; the owner manages keys in the platform UI |

---

## 3. Repository map

```
<root>/
├── public/                 THE GAME
│   ├── game2.html          boot shell: DOM + ordered <script> tags + init
│   ├── styles.css          all game CSS
│   ├── data/               T0 data blobs (embeddedData generated, others hand-tuned)
│   ├── engine/             core substrate, entities, combat, pickups, rendering, orchestrator
│   ├── systems/            calendar, companion, conditions, memory/NPCs, progression, loot, quests
│   ├── ui/                 audio, HUD, dock, widget renderer, shop, town*, loadout
│   ├── content/            17 content JSONs (the single content source)
│   ├── schemas/            7 JSON schemas for content authoring/validation
│   ├── assets/             SVG backgrounds, portraits, widget skin art
│   └── BUGS_AND_ISSUES.md  active bug tracker
├── tests/                  headless battery (15 suites + 121-check trace + standalone probes)
├── tools/                  static gates, sweeps, the patch tool, content generator, previews
├── docs/                   THIS WIKI (WIKI.md canonical → index.html generated for GitHub Pages)
├── src/                    platform shell (React/Vite/Convex/auth/landing) — see §1.2
├── PROJECT_MAP.md          per-file contracts + coupling indexes (verify-enforced)
├── KNOWLEDGE.md            working agreement / rules (§1–§20)
├── WORKFLOW.md             process: session loop, verification ladder, backlog B1–B37, lesson log
├── TOOLING_MAP.md          tool catalog with statuses + field-trial log
├── TESTING_PLAN.md         test architecture, 12 manual checks (M1–M12), perf gates
├── MASTER_DESIGN.md        design intent, implementation status, §24 plan of record
├── combat_art_pipeline_spec.md  art pipeline spec (dimensions, normalize step, B35 plan)
├── *_spec.md               subsystem specs (npc condition, memory/export, widget, calendar, log)
├── CHANGELOG.md            what changed, when, why
├── archive/, gamesplit/, *.html fossils   historical; NOT part of the active codebase
└── tools/ fossils (_bNN_*.cjs, tmp_*.cjs)  historical; superseded by patch_apply
```

### 3.1 The shell (`src/`) in one paragraph

React 19 + Vite + Tailwind v4 + shadcn/ui + Convex/Convex Auth. Routes: `/` and `/game` render
the game iframe, `/auth` is sign-in, `/dashboard` is a protected starter screen. It is *platform
scaffolding for hosting the game with auth* — it contains **no gameplay logic**. Do not put game
systems here; do not "modernize" the game into React.

---

## 4. Runtime architecture

### 4.1 Boot model

There is no module system in the game. `public/game2.html` lists 36 `<script src>` tags; each file
assigns globals (`window.ClassName = …` or `const X = …`). Order is load-bearing, which is why
files are tiered. The rule: **a file must not reference a symbol defined in a later tier at top
level** (function-body references are fine — construction happens in the orchestrator).

| Tier | Files | Role |
|---|---|---|
| **T0 data** | `data/embeddedData.js`, `data/assetMap.js`, `data/disasterEvents.js`, `data/farmingConfig.js`, `data/affectionTiers.js`, `data/estateTiers.js`, `data/childGrowthStages.js`, `data/sandboxDefaults.js`, `data/svgPortraits.js` | Plain global data blobs. `embeddedData.js` is **generated** from `content/*.json`. |
| **T1 early systems** | `engine/titleMenu_refactored.js`, `systems/npcExport.js`, `systems/calendarTime.js`, `systems/gameLog.js`, `ui/npcExportUi.js` | Class declarations only, no construction — safe to load before core. |
| **T2 core** | `engine/core.js` | The substrate: `DataManager`, `EventBus`, `GameLoop`, `Camera`, `InputManager`, `GameState`. Also registers the content fetch list. |
| **T3 simulation** | `engine/entities.js`, `engine/combat.js`, `engine/pickup.js`, `engine/rendering.js`, `systems/companion.js`, `systems/conditionEngine.js`, `systems/npcSystem.js`, `systems/progression.js`, `systems/loot.js`, `systems/quest.js`, `engine/locationManager.js` | Classes that reference T0/T2 globals only inside methods. |
| **T4 UI** | `ui/audio.js`, `ui/game.js`, `ui/dockMenu.js`, `ui/widgetRenderer.js`, `ui/shop.js`, `ui/townEngine.js`, `ui/townContent.js`, `ui/loadout.js`, `ui/town.js` | DOM controllers; DOM lookups happen at construction, not load. |
| **T5 orchestrator** | `engine/game.js` | `Game` constructs every system, wires the bus, owns the loop, autosaves. **The only file allowed to reference everything.** |

### 4.2 Runtime flow

```
titleMenu (save slots / settings)
   └── town (regions, NPCs, shop, farming, dock)          ← hub; persistent save lives here
         └── loadout (stage → weapons → companions)
               └── combat run (waves → boss → end screen)
                     └── results → back to town
```

Combat runs are *sessions*: they have their own counters, their own autosave heartbeat
(`persistent.combat`), and they are journaled so an interrupted run can be resumed with the boss
intact. Everything outside the session (gold, inventory, quests, memory, calendar) persists through
`systems/progression.js`.

### 4.3 File ownership (one line per game file)

| File | Owns |
|---|---|
| `engine/core.js` | content loading + registry, event bus, game loop, camera, input (incl. touch joystick vector), game state machine |
| `engine/entities.js` | entity manager (plain push arrays, not pools), wave spawner, movement |
| `engine/combat.js` | weapon firing + weapon level-ups, collision, damage |
| `engine/pickup.js` | pickup spawn/expiry/sweep, magnet, XP, level-ups, boss-trophy + screen-wipe behavior, telegraph |
| `engine/rendering.js` | all canvas drawing + floating text; weapon/companion HUD slot grid; wipe/orb/flash effects |
| `engine/locationManager.js` | town/world location graph navigation |
| `engine/game.js` | orchestration: construct, wire, loop, pause/ESC, boss flow, resume banner, autosave, debug hooks |
| `engine/titleMenu_refactored.js` | title screen, save-slot picker, settings entry, dev overlays |
| `systems/conditionEngine.js` | **the** condition evaluator (`evaluate`, `validate`) — fail-closed |
| `systems/npcSystem.js` | NPC dialogue/location/mood selection + **the canonical memory log** |
| `systems/npcExport.js` | roleplay export (pure consumer of the memory log) |
| `systems/progression.js` | save store, migrations (v9), and meta systems: affection, children, estate, farming, disasters, sandbox |
| `systems/quest.js` | quest availability (via ConditionEngine), objectives, time events |
| `systems/calendarTime.js` | day/season/festival/biome resolution; **sole writer** of `persistent.time` |
| `systems/gameLog.js` | session play-log console (ring buffer + capped persisted tail) — display only |
| `systems/companion.js` | companion spawn, combat assists, loot fetch |
| `systems/loot.js` | star/frenzy/gacha-protection luck layers |
| `ui/widgetRenderer.js` | pooled, data-driven card renderer (skins, selection, disabled, a11y) + console inspector |
| `ui/audio.js` | all sound; the single bus→sound subscriber |
| `ui/game.js` | combat HUD DOM: level-up cards, pause menu, end screen |
| `ui/shop.js` | shop + farming + sandbox modes; purchase confirm / repeat-buy |
| `ui/loadout.js` | pre-combat loadout picker |
| `ui/dockMenu.js` | town dock buttons (rebuilt from config at runtime) |
| `ui/townEngine.js` | town scene: region rendering/swiping, combat entry panel |
| `ui/townContent.js` | town HUD chips, NPC dialogue UI, town-root farming card |
| `ui/town.js` | town shell/root controller |
| `ui/npcExportUi.js` | favorites browser + in-game memory topic rendering |
| `data/*` | static tuning blobs + the generated content mirror |

### 4.4 Code conventions and file lifecycle

- Classic scripts, no modules/imports, no bundler step. Files declare globals
  (`window.ClassName = ClassName` or top-level `const`); cross-file references are plain names,
  which is exactly why the load-order tiers and the `no-undef` globals list exist.
- 2-space indent, `const`/`let` in preference to `var`, single-quoted strings, semicolons, JSDoc-ish
  short comments only where intent is non-obvious. Comments explain *why*, not *what*.
- Every game file has a lifecycle status in `PROJECT_MAP.md`: `NORMATIVE` (load-bearing — edits are
  contract negotiations), `IN-FLUX` (moving; cross-check the map health log), `DEPRECATED`
  (superseded — don't build on it). Before building on a file, check its status.
- Rendering coordinates: world space vs screen space is the single most bug-prone distinction in
  this codebase. See §10 before writing draw code.
- Keep files focused; the project prefers extracting a system over growing a file past the point
  where its contract is hard to describe.

---

## 5. Content pipeline & persistence

### 5.1 Content pipeline (three-place contract)

A content file is real only if **all three** exist — miss any one and `npm run verify` fails:

1. `public/content/<name>.json` — the data,
2. a row in `DataManager.loadAll()`'s fetch list in `public/engine/core.js`,
3. a registry entry in `tools/generateEmbeddedData.mjs` (the generator).

The 17 files: `attackAreas`, `calendar`, `characters`, `companions`, `content_gates`, `elements`,
`enemies`, `leveling`, `locations`, `npcs`, `pickups`, `quests`, `shop`, `stages`, `ui_skins`,
`visuals`, `weapons`.

Then regenerate the mirror: `npm run content:sync`. `npm run content:check` byte-verifies it and
also runs inside `verify`. **Never hand-edit `public/data/embeddedData.js`.**

Schemas live in `public/schemas/` (enemy, location, npc, quest, shop, stage, weapon) and are the
contract for authoring; lookups are by **stable id, never array index**.

### 5.2 Save store

One `persistent` object, canonical shape and migrations owned by `systems/progression.js`.

| Branch | Written by |
|---|---|
| `player`, `currency`, `skills`, `factions`, `unlocks`, `inventory` | progression only (others call typed APIs) |
| `combat` | progression (shape) + `engine/game.js` (run state/autosave) + `systems/loot.js` (session counters) |
| `town` | progression only — level via typed `getTownLevel`/`setTownLevel` |
| `quests` | progression (shape) + `systems/quest.js` |
| `npcs` | progression (shape) + `npcSystem` (memory log) + `npcExport` (favorites only) |
| `time` | progression (shape) + `calendarTime.js` (**sole writer**) |
| `gameLog` | progression (shape) + `gameLog.js` (capped tail mirror) |

**POT-012 allowlist:** there is a write-allowlist of paths. A write to an unlisted path is a silent
failure *by design* — it is how split-brain bugs were killed. Adding state means adding to the
allowlist deliberately. New store branches/fields join via **one version bump** with shape defaults.

### 5.3 Numbers worth knowing (art, scale, feel)

- Entities are drawn at **`2 × stats.size`** (the art is twice the gameplay footprint). No camera
  zoom: **1 world unit = 1 CSS pixel**.
- **Hitboxes are independent of art.** Resizing a monster's art never changes what it hits — change
  `visual.size` / hitbox fields in content deliberately, not for looks.
- Reference sizes: player 10 · rat 7 · bat 8 · zombie 10 · skeleton 12 · ghost 12 · caster 13 ·
  brute 16 · ghoul 22 · bosses 28–30 · companions 14 · pickups 8–18 · projectiles 4–6.
- Camera and HUD live in different spaces — see §10 (layering + DPR rules) before adding any
  screen-space draw.

---

## 6. Event bus map

One bus (`EventBus` in `engine/core.js`). Most cross-system wiring ends in `engine/game.js`.
Canonical emitter→listener table: `PROJECT_MAP.md` §3.2. Shape:

| Event | Emitters | Listeners |
|---|---|---|
| `damage`, `damageEntity`, `contactDamage`, `projectileHit`, `areaPulse` | combat (pickup emits `damage`) | game, renderer, audio, combat self |
| `death` | combat | pickup, quest, audio, game |
| `pickup` | combat, pickup, game | pickup, renderer, audio, game |
| `levelUp` / `player:levelUp` | pickup / progression | game, audio, gameLog / *none (engine uses `levelUp`)* |
| `weaponLevelUp` / `weaponUnlock` | combat / game | game, audio, gameLog / audio |
| `weaponFire`, `bossSpawn`, `bossDeath`, `bossCharge`, `bossIntro` | combat, entities, game | audio, game |
| `arcaneShot`, `chainLightning`, `coneAttack` | combat | game |
| `companionSpawn`, `companionDamage`, `companionGrowl`, `companionLootCollect` | companion | game, combat |
| `magnetActivate` | game | pickup, audio |
| `npc:talked`, `npc:dialogueChoice`, `npc:dialogueFlag`, `npc:dialogueAffection` | townContent | npcSystem, quest |
| `quest:available/started/objective_progress/completed/flag_set/time_event` | quest | game, npcSystem, townContent, gameLog (others reserved) |
| `time:dayAdvanced` | calendarTime | gameLog |
| `location:navigated` | locationManager | quest |
| `resources:changed` | progression | shop, gameLog |
| `shopPurchase`, `shopEffect`, `startCombat`, `farmingLootCollected` | shop | gameLog / *some reserved* |
| `stateChange`, `pause`, `restart`, `selectUpgrade`, `pauseMenuAction`, `endScreenDismiss`, `skipToBoss` | core + ui/game + game | game, audio |
| `save:reset/slotSwitched/slotWiped`, `unlock:*`, `counter:changed`, `farmingComplete` | progression | reserved API surface (no listener yet) |

Rules: an event with no listener is **not automatically dead** (reserved surface is legitimate —
the 2026-09 dead-event audit deleted only emitters proven unused), but adding a new event must be
documented in `PROJECT_MAP.md` §3.2 in the same change.

---

## 7. UI system (screens)

### 7.1 Widget system

All list-like UI is rendered by `ui/widgetRenderer.js` from **data + a card def** rather than
hand-built DOM. Properties available to a def: layout, size, skin, data-bound context accent,
data-bound `selected`/`disabled`, click payload, `role="button"` + `tabindex` + Enter/Space, and a
document-event bridge. Skins are data (`content/ui_skins.json`; v2 vocabulary adds 9-slice border,
texture background, corner ornament — asset paths are verify-gated).

Migrated screens (7): game-log console, pause/end actions, town HUD chips, dialogue + dog choices,
loadout cards + slot chips, shop tabs + stocked items, title menu strip.

### 7.2 The DOM id contract

- Any `getElementById('x')` / `querySelector('#x')` in game code must resolve to an id that exists
  in `game2.html`, **or** be listed in the owning file's `Dynamic-create: [...]` line in
  `PROJECT_MAP.md`. This is a verify gate (F2) — it has caught real "button silently dead" bugs.
- Conversely, `tools/dom_sweep.cjs` sweeps the other direction: ids in the shell that nothing
  references. Current state: 104 ids, 0 new orphans, 9 annotated as *planned content* (B37) and 1
  as a runtime-constructed fossil. Styled-in-CSS counts as intended UI, not as a consumer.

### 7.3 Shop layout (reference example of an audited screen)

```
#shop-overlay
├── header: gold readout · ✕ (#shop-close)
├── tabs (widget pool)
├── #shop-items (scroll region, widget pool)
└── #shop-done-bar > #shop-done        ← pinned bottom; ESC also closes (progressively)
```

Bottom-pinned exits exist because the **preview toolbar covers top-right chrome on phones** — every
full-viewport overlay in this project needs an exit at the bottom of the screen.

---

## 8. Verification stack

### 8.1 The ladder (climb in order; stop when the change is covered)

| Rung | Command | Catches | Cost |
|---|---|---|---|
| 0 | Read the region before editing | half-applied/malformed edits | 0 |
| 1 | `node --check <file>` | syntax after multi-part edits | seconds |
| 2 | `npm run verify` | load-order syntax, content JSON, mirror sync, PROJECT_MAP drift, F1 test/tool syntax, F5 no-undef, F2 DOM ids, skin assets, patch_apply behavior | seconds |
| 3 | feature suite `node tests/suites/<x>.cjs` | that area's contracts | ~1 min |
| 4 | `npm run test` / `test:strict` | cross-system regressions; strict makes skips fail | minutes |
| 5 | `npm run release:check` | verify + strict battery + CHANGELOG hygiene | minutes |
| 6 | `npm run widget:preview` / `widget:audit` | card-matrix regressions, occlusion, viewport parity | ~1 min |
| 7 | manual M1–M12 (`TESTING_PLAN.md` §9) | feel, audio-as-heard, aesthetics | human |

Minimum evidence after editing `public/`: **rung 2**. Before closing work: **rung 5**.

### 8.2 What `npm run verify` checks (F-gates)

| Gate | Meaning |
|---|---|
| syntax | every `game2.html` script parses **in real load order** |
| content | all 17 JSONs parse; `embeddedData` mirror byte-in-sync |
| map | PROJECT_MAP coverage both ways, `Defines` symbols exist, statuses valid, `GuardedBy` suites exist, §3.1 rows real, globals rot-guard |
| F1 | every `tests/` + `tools/` file parses (recall-not-read net) |
| F5 | ESLint `no-undef` over game files (cross-file globals declared + rot-guarded against the map) |
| F2 | DOM ids exist or are documented `Dynamic-create` |
| skins | `ui_skins.json` image paths resolve; skin version is v1/v2 |
| behavior | `tools/patch_apply_selftest.cjs` — 13 behavior checks on the house edit tool |
| wiki mirror | `docs/index.html` matches its source `docs/WIKI.md` — run `npm run docs:wiki` after any wiki edit |

### 8.3 The battery (15 suites, 585 checks)

| Suite | Guards |
|---|---|
| `regression_trace` (121) | boot → town → combat → boss → end; save/restore; the historical trace |
| `step1_gate_engine` | condition evaluator: typed conditions, combinators, fail-closed, quest routing |
| `step2_npc_system` | NPC selection + canonical memory log incl. save→reload round-trip |
| `step3_widget_inventory` | widget render contract, inventory, inspector, skin pins, a11y, contrast |
| `step4_export` | export purity + favorites browser flow |
| `step5_loadout_widgets` | loadout pooled cards, selection/confirm payloads |
| `step6_shop_tabs` | shop tabs, purchase confirm, repeat-buy, one-transaction commits |
| `step7_title_menu` | title strip, locked-as-data, keyboard parity |
| `calendar_time` | day advance, seasons, locked modifier rule, day stamps |
| `game_log` | log capture, ring buffer, two-logs purity |
| `widget_occlusion` | clickability + viewport containment across 3 viewports (desktop gates; mobile promoted per screen) |
| `ui_layout_audit` | spacing scale, dead bands, alignment, contrast, overflow, touch targets, orientation flip |
| `visual_probe` | structural screenshots, HUD pixel regions, real-path flows, frozen-frame pixel pins |
| `perf_budget` | per-tick CPU budgets, idle + 120-entity stress, audio-scheduling gate, pickup lifecycle |
| `save_fuzz` | 50 seeded save mutants + corrupt JSON boot survival; double-boot race |

**Standalone probes** (not in the battery, run directly):
`node tests/probe_lag.cjs` (9 checks), `--wipe` (9), `--wup` (13) — lag/audio/pickup-lifecycle,
screen-wipe behavior, weapon-upgrade orb show.

**Read-only sweeps** (not gates): `node tools/css_sweep.cjs` (dead CSS candidates, with a
template-built bucket so variable class names aren't misreported), `node tools/dom_sweep.cjs`
(orphan DOM ids, delta-vs-baseline).

### 8.4 Screenshot-driven testing

There is no golden-image diffing (declined as churn outweighed catch). Instead: structural
screenshots + pixel probes on HUD regions + negative controls that prove detectors fire. When you
add a detector, prove it can fail — a green test that cannot go red is not evidence.

### 8.5 Driving the real game headlessly (the harness)

`tests/lib/harness.cjs` is **the** way any agent exercises real game state:

- `bootGame()` — launches Chromium, boots `public/game2.html`, installs an error net and a
  console/page-error net, and returns handles for driving the game.
- Storage control — `keepStorage` plus a real reload is how persistence round-trips are tested.
- `bootGame({ mobile: 'iphone13' })` / `newMobilePage(browser)` — **real device emulation**
  (isMobile + hasTouch + DPR 3 + mobile UA), which is what caught the DPR-scaled HUD bug.
- Per-step API detectors + a PASS/FAIL runner with CI-friendly exit codes. Suites emit artifacts to
  `tests/artifacts/`.

Rule: assert through the most player-visible surface available. A counter can be checked in
`game._runKillCount`, but the HUD pixel probe catches renderer regressions the counter cannot.

### 8.6 Adding checks and suites

1. New checks for an existing area go in that suite (`tests/suites/<area>.cjs`) — the step-gated
   suites are named for the plan step they guard (`step3_…` = widget/inventory), feature suites for
   subsystems (`calendar_time`, `game_log`, `perf_budget`, …).
2. **A new suite file must be registered in `tests/run_all.cjs`'s suite list** — an unregistered
   suite never runs and never fails, which is worse than not existing.
3. Every check must be able to fail: add a negative control for any new detector.
4. If the area has no suite and behaviour matters, `npm test` (skip-safe) tells you which guards
   exist; `npm run test:strict` is the release gate.
5. Per-file **standalone probes** (heavier or opt-in scenarios) live next to the suites as
   `tests/probe_*.cjs` and are invoked directly with mode flags — see `tests/probe_lag.cjs`
   (default / `--wipe` / `--wup`). Keep them out of the default battery unless they are cheap and
   deterministic; record the promotion decision where the suite list documents it.

---

## 9. Rules that bind agents

Condensed from `KNOWLEDGE.md` (§1–§20) and `WORKFLOW.md`; those files remain authoritative.

1. **Plan first.** Non-trivial task → state the plan (files, what could break, how verified) before
   editing. More than ~3 files or a shared system → get owner go-ahead.
2. **Never edit from recall.** Read the region you are about to change (this project has been bitten
   by half-applied edits and stale line numbers).
3. **Never write source files with inline shell one-liners** (no `sed -i`, no heredoc redirection).
   Use the file-edit tools. This is a house rule (§15) with incident history.
4. **Docs ride along.** A change that invalidates a contract updates it *in the same change*:
   `PROJECT_MAP.md` (new file → new contract block, or verify goes red), `KNOWLEDGE.md` (lessons),
   `WORKFLOW.md` §11, `TOOLING_MAP.md`, `CHANGELOG.md` (top entry; single version header).
5. **One source of truth per data type.** Don't mirror state; don't build a second condition
   evaluator, second memory log, or second copy of a truth.
6. **Content = JSON + registry + generated mirror** (§5.1). Authoring content without all three
   is incomplete work.
7. **Verify prior writes after any failed or suspicious command** (§20). A command that printed
   success before failing later lied; check on-disk state before retrying.
8. **`npm run verify` after every `public/` edit; `release:check` before calling work done.**
9. **git CLI is blocked.** Don't try to commit, push, or branch. Repo admin is human-side.
10. **Never start/stop the dev server.** The platform runs it; file edits are picked up
    automatically. Fix code, not the server.
11. **Never edit `.env*`.** The owner manages keys.
12. **Prose-heavy edits use `tools/patch_apply.cjs`** (§12.5) — JSON patch file, `--dry` first.
    Do not hand-roll escaped find/replace scripts.
13. **Archives are not code** (`archive/`, `gamesplit/`, root `*.html` fossils, `tools/_bNN_*.cjs`).
    Don't read them into context; don't revive them.
14. **File findings in `public/BUGS_AND_ISSUES.md`** (the active tracker) and in `CHANGELOG.md`'s
    incident notes — a defect you found but did not fix is recorded, not remembered.

---

## 10. Lesson bank (hard-won; still binding)

Rendering & camera

- World-space effects draw **inside** the camera transform; screen-space effects (HUD, orbs, flashes,
  rings) draw **after `ctx.restore()`**. Getting this wrong is invisible to array/state asserts and
  fatal on device.
- Canvas screen-space UI must be authored in **CSS pixels** via the `UI_DPR` scale (backing store is
  devicePixelRatio-scaled). A "36px" slot on a DPR-3 phone was 12 physical px. World-space floating
  text scales its *font* by dpr; positions stay world-space.
- **Array-length asserts prove state, never pixels.** The weapon-upgrade show was fully "green" while
  drawing off-screen for every real player. Pixel pins (frozen frame after clearing the world) are
  the gate for anything visual.
- Fill glyphs as **paths, not font characters** (▲ U+25B2 paints nothing headless).
- Pixel filters need **blend tolerance** (gold ring: r≥90, g≥75, b≤70, r−b≥40), because grid
  antialiasing mixes colors; and text glyphs are not portable between environments.

UI & devices

- Fixed-centered rows clip on phones: every such row needs an auto-fit/stacking fallback and a
  layout-audit cell (slot-picker, level-up, end-screen actions all hit this same class).
- When a DOM control (joystick) and canvas HUD (slot rail) claim a corner, one moves — pick the
  cheaper mover (a draw constant), not the gesture geometry.
- Touch targets ≥44px only matter under `pointer: coarse`; desktop stays dense and that is correct.
- Your new UI block can itself create a dead band — the layout audit flagged the shop's own bottom
  bar on the day it landed.

Testing & tooling

- Prove new detectors can fail (negative controls), or you are shipping theater.
- After clearing the world (`entityManager.clearAll()`), a live rAF scan races the next frame —
  **stop the loop and render exactly one frame** for pixel probes.
- Skipping a suite must be loud: `--strict` turns skips into failures.
- `node --check` on a file that parses alone ≠ the reassembled boot; verify checks real load order.
- css_sweep's literal class scan cannot see `toast-${kind}`-style construction (the widget prefix
  exemption never covered template suffixes) — read call sites before believing the dead bucket.
- dom_sweep's "alive" definition excludes styles.css mentions on purpose: styled-in-CSS is intended
  UI, and an id named only by CSS is a documentation fact, not liveness.
- `styles.css` is currently 100% LF; never trust memory about line endings — detect per file (which
  is what `patch_apply` does).

Platform

- After any malformed/failed terminal call, assume the platform may be mid-502; verify on-disk
  state before retrying.
- The Freebuff preview toolbar overlays top-right chrome in the browser preview — screenshots of the
  preview are not the game on a real device, and platform chrome is not a game bug.

---

## 11. Glossary

| Token | Meaning |
|---|---|
| `B<n>` | backlog item in `WORKFLOW.md` §10 (B1–B37; next new item is **B38**) |
| `POT-<n>` | data-driven-system constraint from `MASTER_DESIGN.md` (POT-006 content pipeline, POT-012 store allowlist, …) |
| `M<n>` | manual check in `TESTING_PLAN.md` §9 (M1–M12) |
| `F1/F2/F5` | static gates inside `npm run verify` |
| `§<n>` | section number inside the doc being cited |
| tier `T0`–`T5` | load-order tiers in §4.1 / `PROJECT_MAP.md` §1 |
| `AGENTS`/`LLM` terms | "battery" = the full strict suite run; "sweep" = read-only orphan detector; "gate" = a check that fails the build |

---

## 12. How-to recipes

*(These are the common tasks; each ends in the gate that proves it.)*

### 12.1 Add a new enemy / weapon / stage / quest / npc

1. Author the content JSON entry (id is stable and human-meaningful; follow `public/schemas/`).
2. If it references another content type, the id must exist there (conditions validate fail-closed).
3. `npm run content:sync` (regenerates `embeddedData.js`), then `npm run verify`.
4. Behavior: only if the entry needs runtime behavior *not already supported* — then extend the
   system **and its suite**, not the data file.
5. Gate: `npm run verify` (rung 2) + the relevant feature suite; full battery if combat-facing.

### 12.2 Add a new content *type* (a 18th JSON)

1. Create `public/content/<name>.json` (+ schema in `public/schemas/` if structured).
2. Register the fetch in `DataManager.loadAll()` (`engine/core.js`) **and** the generator registry
   (`tools/generateEmbeddedData.mjs`).
3. `npm run content:sync`, `npm run verify`.
4. Add the file's row to `PROJECT_MAP.md` §3.1 and a `Content:` line on any consuming file's block.
5. Gate: `npm run verify` must be green or the work is not done.

### 12.3 Build a new DOM screen

1. Scaffold persistent chrome in `public/game2.html`; dynamic parts must be listed as
   `Dynamic-create: [...]` in the owning file's map block.
2. Render lists through `WidgetRenderer` (data + def) instead of bespoke DOM — see the seven
   migrated screens for the pattern.
3. Every full-viewport overlay needs a **bottom-pinned exit** (platform chrome owns the top).
4. Gate: register the screen in `ui_layout_audit.cjs`'s matrix, run `widget:audit`, and screenshot
   it in `visual_probe` if it's a structural screen.

### 12.4 Add a bus event

1. Emit with the payload shape documented; add to `PROJECT_MAP.md` §3.2 in the same change.
2. Wire the listener in the **owning** system (usually `engine/game.js` for cross-system effects) —
   not in the emitter's file.
3. If it needs a new sound, wire it in `ui/audio.js` (single sound subscriber).
4. Gate: `verify` (§3.2 consistency) + the suite that covers the new behavior.

### 12.5 Edit docs safely

```bash
# 1. write the patch JSON (prose needs no escaping):
#    {"patches":[{"file":"WORKFLOW.md","find":"...exact...","replace":"...","expectedCount":1}]}
node tools/patch_apply.cjs patch.json --dry     # validate only
node tools/patch_apply.cjs patch.json           # apply atomically
```

All-or-nothing batches; exact `expectedCount` (default 1; `"> N"` = at-least; `0` = assert-absent);
same-file entries fold sequentially; per-file CRLF/LF preserved (mixed → refused); literal
replacement (`$&` safe). Its behavior is gated inside `verify` (13 checks). For very small unique
edits, the file-edit tools are fine — the rule exists because hand-rolled escaped find/replace broke
on prose three times in one session.

### 12.6 Purge an unused id or class

1. `node tools/dom_sweep.cjs` / `node tools/css_sweep.cjs` — report only.
2. Grep the call sites yourself before believing a "dead" verdict (template-built and
   constructed names are invisible to literal scans).
3. Delete **and** remove the map/CSS references in the same change; run the full battery —
   deletion is always human-reviewed and battery-verified, never automatic.

### 12.7 Cut a release (version + changelog)

1. The **only** version header at the top of `CHANGELOG.md` is the current release — `release:check`
   enforces exactly one. Add a new one *above* the existing for unreleased work; never leave two.
2. Each entry: version, date, status, what changed and **why**, plus incident/lesson notes.
3. Close out the version references you touched in `PROJECT_MAP.md` / specs (they cite versions).
4. Run `npm run release:check` — verify + strict battery + changelog hygiene. Red means not
   released. `npm run release:check -- --no-battery` is the fast docs/verify-only path while
   iterating (the battery is still required before calling the work done).
5. Wiki upkeep: if the release changed the snapshot line or a gate/command, update this page and
   `npm run docs:wiki` — the wiki-mirror gate inside `verify` will catch you if you forget.

---

## 13. Future state — roadmap

### 13.1 Sequenced now → next

| # | Item | State | Gate / notes |
|---|---|---|---|
| 1 | **B35 — art pipeline** (§14.2) | spec folded; awaiting owner decisions 1–5 | `combat_art_pipeline_spec.md` §9; a/b/c gates: art renders, fallback intact when art absent, drawn-Ø pin, perf budget |
| 2 | **B37 — undetected-UI wire-or-delete** | 9 planned-content ids inventoried, not deleted | owner call; `dom_sweep` keeps them as baseline until then |
| 3 | **B20** toast duration scaling | formula undecided | flag before the next toast type lands |
| 4 | **B21** inventory item detail sheet | spec exists, paused | spec already answers the design question |
| 5 | **B22** matrix-coverage audit | process item | run alongside periodic orphan/doc hygiene |
| 6 | **B35b/c** art batches | after B35a proves the pipeline | — |

### 13.2 Design systems not yet built (from `MASTER_DESIGN.md` §15–16)

- Skill tree (placeholder today; game playable without it)
- Faction system (basic reputation only)
- Marriage / children systems (design complete, not started)
- Adjacency system (design complete, not started)
- Multi-character scenes, particle system, web tools (design complete, not started)
- Full in-game calendar UI + weather/season content (`time` condition type is registered but
  unimplemented); full NPC roster content

Open design questions carried in `MASTER_DESIGN.md` §16: frenzy-vs-clean 3★ coexistence; sub-3★-time
rare-drop as a permanent perk; children's gameplay function; rare-drop pity curve shape; auto-clear
slot concurrency scaling by town tier.

### 13.3 Backlog mechanics

`WORKFLOW.md` §10 is the live table (B1–B37, most closed with post-mortems). Next new item = **B38**;
add it near the top with: item, why, effort, priority, and the gate that will prove it. A closed row
keeps its rationale and lesson — the record *is* the value.

---

## 14. Open decisions (awaiting the owner)

Nothing below is blocked on engineering; each is a one-line answer away from unblocking work.

### 14.1 Combat art pipeline (`combat_art_pipeline_spec.md` §10)

1. **Style workflow:** pixel-native 32×32 hero (crisp upscale) vs smooth master-downscale — decided
   by running spec test §8.6, not by argument.
2. **Hero drawn size to start at:** 20 (today) / 32 (recommended) / 40 — a knob; no art regeneration
   needed to change it later.
3. **Art direction:** gothic-graveyard palette per spec, or owner reference images?
4. **B35a scope:** loader + `visual.art` + player/zombie/boss_gravekeeper as stills (3 files) — ok?
5. **Animation:** Option A (static + programmatic deform) first, sheets for player/bosses only if
   tools pass §8.3 — or commit to full Option B now?

Already resolved and binding: **frames stay square; shape is silhouette**; generators emit fixed
large buckets (1024×1024 / 1536×1024 / 1024×1536) and a deterministic **normalize step** delivers
tier sizes (requested sizes are never requested); always request square; verify real alpha. Runtime
`drawImage` accepts any source dimensions. Non-uniform presentation would be a per-entity
`artScaleX/Y` knob, built only if a real monster needs it.

### 14.2 Product decisions

- **B37 town ids** — wire the planned content (camp upgrade, events panel, resource chips, companion
  status, header/location label) or delete the markup? The owner's current work (character stories +
  building history) makes several of these likely to land.
- **Weapon-up pickup on other sources** — the visual show now fires for any upgrade; whether other
  sources (level-up cards) should route through the same show is undecided.

### 14.3 Known unverified / in flight

- Full device pass of the weapon-upgrade orb effect (flight → burst → chime) and the shop Done bar —
  unit-gated, awaiting a human look on a real device.
- The Freebuff preview toolbar's overlay is a *preview-only* artifact; do not "fix" game chrome to
  accommodate it beyond the bottom-exit rule already adopted.

---

## 15. Agent FAQ

Short answers to the questions agents actually ask. Deeper answers are linked in each row.

**Q: Where do I start for "add a new enemy"?** §12.1. Content JSON → sync → verify. Code only if
behavior is missing.

**Q: Which suite guards the shop?** `step6_shop_tabs` (tabs, confirm, repeat-buy) and
`step3_widget_inventory` (purchase/inventory round-trip); `widget_occlusion` + `ui_layout_audit`
gate its clickability/layout on 3 viewports.

**Q: How do I edit the docs without corrupting them?** §12.5 — `patch_apply` with `--dry` first.

**Q: A new file — what breaks?** `npm run verify` goes red until it has a `PROJECT_MAP.md` contract
block. That's the intended forcing function, not a bug.

**Q: An id exists in the shell but nothing happens when clicked.** Check `dom_sweep` classification:
CONSTRUCTED (rebuilt at runtime), MANAGED (inside a JS-managed container), or a B37 planned id.
Also check the id is not merely *styled* in CSS — styling is not wiring.

**Q: Is it safe to delete "dead" CSS or ids?** Only after hand-verifying call sites and running the
full battery — the one time this was automated wholesale, it deleted 12 live rules (§10 lesson bank).

**Q: Why does my change pass tests but look broken on device?** Most likely a world-vs-screen-space
canvas layering mistake or DPR units; both are proven by pixel pins, not array asserts. §10.

**Q: Where's the truth about who writes `persistent.time`?** §5.2 and `PROJECT_MAP.md` §3.3 — the
calendaring system is the sole writer; the allowlist is the enforcement.

**Q: What is *not* implemented that sounds like it is?** Skill tree, marriage, children gameplay,
adjacency, web tools, full calendar UI, particle system — §13.2.

**Q: How do I know the docs I'm reading are current?** Every doc carries a version or date;
`CHANGELOG.md`'s single top header is the current version; `verify` enforces the map; this wiki's
§16 says how it ages.

**Q: Can I add a shortcut npm script?** Sure, and update `TOOLING_MAP.md` §2's script block in the
same change (it is documentation-of-record for scripts).

---

## 16. Glossary of documents + how this wiki is maintained

| Doc | Owns |
|---|---|
| `KNOWLEDGE.md` | rules of engagement (§1–§20, lessons) |
| `WORKFLOW.md` | process: session loop, ladder, sub-workflows, backlog §10, improvement log §11 |
| `PROJECT_MAP.md` | per-file contracts, coupling indexes, map health log (verify-enforced) |
| `TOOLING_MAP.md` | every tool: status, how to run, limits, field-trial log |
| `TESTING_PLAN.md` | test architecture, suites, manual list, perf gates |
| `MASTER_DESIGN.md` | design intent + implementation status + §24 plan of record |
| `combat_art_pipeline_spec.md` and `*_spec.md` | subsystem specs (conditions, memory/export, widgets, calendar, log) |
| `CHANGELOG.md` | what changed, when, why (single top header, enforced) |
| `docs/WIKI.md` | **this** — the browsable map for humans and agents |

**Maintenance of this wiki:**

- It is a **summary**, never a replacement. Sources of truth stay in the repo docs listed above.
- Update it in the same change that moves the ground it describes: version snapshot in the header,
  command lists, gate tables, roadmap.
- Numbers that drift most often: battery check/suite counts, DOM id count, content-file count.
  Re-derive from a battery run and `verify` output rather than from memory.
- Rendered page: `npm run docs:wiki` → `docs/index.html`. Publishing: GitHub Pages with
  **source = `docs/`** (the repo-root `index.html` is the platform shell, so root-source Pages
  would publish the wrong site). `.nojekyll` is committed so no path filtering surprises us.
- Agent-facing rule: if a change makes this page wrong, fixing the page is part of the change.