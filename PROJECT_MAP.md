# PROJECT_MAP.md — File Contracts & Coupling Index

**What this is:** one contract block per load-order file, stating only its **cross-file edges** —
what it defines, who it calls, who it answers to, what content/store it touches, and what guards it.
Purpose: make multi-file work safe without reading everything, and make stale mapping *impossible to miss*.

**Verification:** `npm run verify` enforces this file (coverage, symbols, statuses, index consistency).
**Maintenance law:** KNOWLEDGE.md §19 — contract updates ride along with the change that invalidates
them; a new file without a block is a red suite, not a TODO; map errors are logged in §5 below.

**Honest scope (§5.1):** checks are syntactic, not semantic. A block says what the code *claims*;
review confirms truth. Never describe internal logic here — read the file for that.

---

## §0 How to use

**Reading a contract block** (fields marked ★ are archetype-required — see §4):

```
### <path relative to public/>
- Purpose: one line — what role this file plays
- Status: NORMATIVE | IN-FLUX | DEPRECATED   (★ — see below)
- Defines: backticked global symbols this file introduces (★ if any)
- Calls: cross-file things it invokes (other files' globals, store, DOM ids it owns)
- Listens / Emits: central-bus events (event names exactly as emitted)
- Content: public/content/*.json files it reads
- Store: persistent.* branches it reads or writes (owner marked)
- GuardedBy: tests/suites/* that would fail if its contract breaks
```

**Lifecycle statuses (exactly one per file):**
- `NORMATIVE` — load-bearing; changes here are breaking changes for its callers. Treat edits as contract negotiations.
- `IN-FLUX` — mid-refactor or expected to move; extra caution, cross-check §5 for open notes.
- `DEPRECATED` — superseded; planned removal. Do not build on it; deletion is a *goal*, not a risk.

**Rules for editing this map:**
1. New/renamed file ⇒ new/renamed block **in the same change** (verify fails otherwise).
2. Renamed global, event, content file, or store branch ⇒ update every block + §3 index referencing it.
3. If the map disagrees with the code, the code wins *and* §5 gets an entry — the map was wrong.
4. **Dynamic-create lines are load-bearing (v2.19.4):** they are the allowlist for the verify F2
   gate — a `getElementById`/`querySelector('#…')` id that exists only at runtime must be listed
   in its owning file's `Dynamic-create: [...]` or verify goes red. Add the id in the same change
   that creates it.

---

## §1 Load-order contract (from `public/game2.html` — verified by tools/verify.cjs)

The boot is script-tag concatenation over window globals. Order tiers — **a file must not reference
a symbol defined in a later tier at top level** (function-body use is fine; construction happens in `engine/game.js`):

| Tier | Files | Why the order exists |
|---|---|---|
| **T0 data** | `data/embeddedData.js` → `data/assetMap.js` → `disasterEvents.js` → `farmingConfig.js` → `affectionTiers.js` → `estateTiers.js` → `childGrowthStages.js` → `sandboxDefaults.js` → `svgPortraits.js` | Plain global consts (`EMBEDDED_DATA`, …). Everything later reads these. `embeddedData.js` is **generated** (`npm run content:sync`) — never hand-edit. The shop catalog left T0 in v2.19.7: it is `content/shop.json` (`DataManager.shop`) now |
| **T1 early systems** | `engine/titleMenu_refactored.js` → `systems/npcExport.js` → `systems/calendarTime.js` → `systems/gameLog.js` → `ui/npcExportUi.js` | Class declarations only (no construction) — safe before core |
| **T2 core** | `engine/core.js` | `DataManager`, `EventBus`, `GameLoop`, `Camera`, `InputManager`, `GameState` — the substrate |
| **T3 sim** | `engine/entities.js` → `combat.js` → `pickup.js` → `rendering.js` → `systems/companion.js` → `conditionEngine.js` → `npcSystem.js` → `progression.js` → `loot.js` → `quest.js` → `engine/locationManager.js` | Class declarations; reference T0/T2 globals inside methods only |
| **T4 UI** | `ui/audio.js` → `ui/game.js` → `dockMenu.js` → `widgetRenderer.js` → `shop.js` → `townEngine.js` → `townContent.js` → `loadout.js` → `town.js` | Same rule; DOM lookups happen at construction, not load |
| **T5 orchestrator** | `engine/game.js` | `Game` constructs **everything**, wires the bus, owns the loop. The only file allowed to reference every other |

---

## §2 File contracts

### T0 — data (generated & static blobs)

### data/embeddedData.js
- Purpose: build-time mirror of all content JSONs (offline/first-load fallback for DataManager)
- Status: NORMATIVE
- Defines: `EMBEDDED_DATA`
- Calls: nothing (pure data)
- **Generated file:** `npm run content:sync` → never edit by hand; drift fails `npm run verify`
- GuardedBy: `npm run content:check` (byte-verify inside verify)

### data/assetMap.js
- Purpose: asset path map for preloading
- Status: NORMATIVE
- Defines: `ASSET_MAP`

### data/disasterEvents.js
- Purpose: disaster event definitions
- Status: NORMATIVE
- Defines: `DISASTER_EVENTS`

### data/farmingConfig.js
- Purpose: farming mini-game tuning
- Status: NORMATIVE
- Defines: `FARMING_CONFIG`

### data/affectionTiers.js
- Purpose: affection tier thresholds
- Status: NORMATIVE
- Defines: `AFFECTION_TIERS`

### data/estateTiers.js
- Purpose: estate tier thresholds
- Status: NORMATIVE
- Defines: `ESTATE_TIERS`

### data/childGrowthStages.js
- Purpose: child growth stage table
- Status: NORMATIVE
- Defines: `CHILD_GROWTH_STAGES`

### data/sandboxDefaults.js
- Purpose: sandbox-mode starting defaults
- Status: NORMATIVE
- Defines: `SANDBOX_DEFAULTS`

### data/svgPortraits.js
- Purpose: inline SVG portrait strings
- Status: NORMATIVE
- Defines: `SVG_PORTRAITS`

### T1 — early systems

### engine/titleMenu_refactored.js
- Purpose: title screen, save-slot picker, settings entry, dev-stage overlay
- Status: NORMATIVE
- Defines: `TitleMenu` (+ static `MENU_ITEMS` def table — adding a menu entry is an array entry)
- Calls: `DataManager.enemies`, `DataManager.companions`, `DataManager.stages`, `WidgetRenderer` (menu strip is ONE pooled repeat — §10 screen-7, v2.19.0; def `MENU_ITEM_DEF` declares `widget:titleAction`; selected + locked are DATA via v1.2 `selected.bind` / v1.3 `disabled.bind`, locked denial stays code; clicks activate by explicit index and never claim keyboard selection), DOM: `title-screen`, `title-menu` (widget pool host — no innerHTML wipes), `title-tooltip`, `info-version`, `info-best-run`, `info-total-gold`, `slot-picker-overlay`, `settings-screen`, `dev-stage-overlay`
- Dynamic-create: [slot-picker-overlay, slot-picker-close, dev-stage-overlay] (overlays created on demand — F2 gate)
- GuardedBy: trace (title flow checks), `tests/suites/step7_title_menu.cjs`

### systems/npcExport.js
- Purpose: roleplay-export — derives facts from the canonical memory log with spoiler gating; favorites; constraint template. **Pure consumer — never a data source (one-rule)**
- Status: NORMATIVE
- Defines: `NPCExportSystem`
- Store: reads/writes `persistent.npcs.favorites` only (additive; branch owned by store default in progression.js)
- Listens: none — invoked, never subscribed
- GuardedBy: `tests/suites/step4_export.cjs`

### systems/calendarTime.js
- Purpose: TimeService — event-driven calendar (day advances, seasons, festivals, region biomes)
- Status: NORMATIVE
- Defines: `TimeService`
- Calls: `DataManager.calendar`, `game.eventBus`
- Emits: `time:dayAdvanced`
- Store: **owns `persistent.time` writes** (POT-012) — default branch shape lives in progression.js
- Content: `calendar.json`
- GuardedBy: `tests/suites/calendar_time.cjs`

### systems/gameLog.js
- Purpose: session play-log console (ring buffer + persisted capped tail). **Display-only — never a data source (one-rule, KNOWLEDGE §17)**
- Status: NORMATIVE
- Defines: `GameLogSystem`, `__GAMELOG_DEBUG__`, `__GAMELOG_ERRNET__`
- Calls: `WidgetRenderer` (entries render as pooled cards — §10 screen-1 migration, v2.13.0; accents via bounded §2.6 tokens)
- Listens: `time:dayAdvanced`, `quest:completed`, `levelUp`, `weaponLevelUp`, `shopPurchase`, `farmingLootCollected`, `resources:changed`, `gameLog:updated` (self)
- Emits: `gameLog:updated`
- Store: mirrors tail into `persistent.gameLog.tail` (branch shape owned by progression.js)
- DOM: `gamelog-panel`
- Dynamic-create: [gamelog-panel, gamelog-list, gamelog-prev-list, gamelog-cur-list, gamelog-count, gamelog-clear, gamelog-close] (console panel built in JS — F2 gate)
- GuardedBy: `tests/suites/game_log.cjs`

### ui/npcExportUi.js
- Purpose: export UI — title-screen Favorite Memories browser + in-game memory topic rendering
- Status: NORMATIVE
- Defines: `NPCExportUI`
- Calls: `NPCExportSystem` (getFavoriteSummaries reads raw slots; regenerateFromSlot per favorite), `WidgetRenderer` (favorites list = pooled widget cards; def `onClick` is TOP-LEVEL emitting `exportFavoriteOpened` — v2.19.11: it sat inside `slots`, validate() rejected the def, and openBrowser() threw on any save with favorites; the empty state never renders the list, so only the battery pin caught it)
- DOM: `export-overlay`, `export-list`, `export-copy-current`, `export-close`, `export-back`
- Dynamic-create: [export-overlay, export-list, export-copy-current, export-close, export-back] (overlay built on demand — F2 gate)
- GuardedBy: `tests/suites/step4_export.cjs` (UI purity checks + v2.19.11 browser flow: seeded-slot favorites → widget cards → card click regenerates → back re-renders)

### T2 — core

### engine/core.js
- Purpose: substrate — `DataManager` (content load + registry), `EventBus`, `GameLoop`, `Camera`, `InputManager`, `GameState`
- Status: NORMATIVE
- Defines: `DataManager`, `EventBus`, `GameLoop`, `Camera`, `InputManager`, `GameState`
- Calls: `EMBEDDED_DATA` (fallback), `COMPANION_DATA` (guarded)
- Emits (via GameState/UI flow): `stateChange`, `pause`, `restart`, `selectUpgrade`, `skipToBoss`, `pauseMenuAction`, `endScreenDismiss`
- Content: **registers the fetch list for all 16 content JSONs** (POT-006 — new content files must join here AND the generator)
- GuardedBy: trace (boot), content:check

### T3 — simulation & systems

### engine/entities.js
- Purpose: `EntityManager` (entity pools), `SpawnSystem` (stage waves), `MovementSystem`
- Status: NORMATIVE
- Defines: `EntityManager`, `SpawnSystem`, `MovementSystem`, `distBetween`, `isInCone` (cross-file helper functions — declared in tools/game_globals.cjs)
- Calls: `DataManager.enemies`, `DataManager.stages`
- Emits: `bossSpawn`
- GuardedBy: trace (spawning)

### engine/combat.js
- Purpose: `WeaponSystem` (firing/level-ups), `CollisionSystem`, `DamageSystem`
- Status: NORMATIVE
- Defines: `WeaponSystem`, `CollisionSystem`, `DamageSystem`
- Calls: `DataManager.weapons`, `DataManager.attackAreas`
- Emits: `weaponFire`, `weaponLevelUp`, `damage`, `damageEntity`, `contactDamage`, `projectileHit`, `areaPulse`, `arcaneShot`, `chainLightning`, `coneAttack`, `bossDeath`, `pickup`, `death`
- Listens: `damageEntity`, `contactDamage`, `projectileHit`, `areaPulse`, `companionDamage`
- GuardedBy: trace (combat block)

### engine/pickup.js
- Purpose: `PickupSystem` (xp/gold/magnet), `LevelingSystem` (xp curve, level-ups), `TelegraphSystem` (power-up drop telegraphs)
- Status: NORMATIVE
- Defines: `PickupSystem`, `LevelingSystem`, `TelegraphSystem`, `preloadAssets` (cross-file helper — declared in tools/game_globals.cjs)
- Calls: `DataManager.leveling`
- Emits: `pickup`, `levelUp`, `damage`
- Listens: `pickup`, `magnetActivate`, `death`
- Note: listener-less `playSound`/`telegraph*` emitters deleted v2.19.2 (§5.5 resolved)
- GuardedBy: trace (pickups/leveling)

### engine/rendering.js
- Purpose: `Renderer` (canvas draw) + `FloatingTextSystem`
- Status: NORMATIVE
- Defines: `Renderer`, `FloatingTextSystem`
- Listens: `damage`, `pickup`
- GuardedBy: trace

### systems/companion.js
- Purpose: companion dog — spawn, combat assists, loot fetch
- Status: NORMATIVE
- Defines: `CompanionSystem`
- Calls: `DataManager.companions`
- Emits: `companionSpawn`, `companionDamage`, `companionGrowl`, `companionLootCollect`
- Note: `floatingText` emit deleted v2.19.2 (§5.5 resolved) — heal/shield feedback calls `FloatingTextSystem.spawn` (injected by engine/game.js)
- GuardedBy: trace (companion combat regression)

### systems/conditionEngine.js
- Purpose: **the one shared gate/condition evaluator** (all/any/not, typed conditions, fail-closed). No feature may fork this logic
- Status: NORMATIVE
- Defines: `ConditionEngine` — public API `evaluate(condition, context)` (fail-closed)
- Called by: quest.js, npcSystem.js, progression.js (`buildConditionContext` provider)
- GuardedBy: `tests/suites/step1_gate_engine.cjs`

### systems/npcSystem.js
- Purpose: NPC dialogue/location/mood selection + `NpcMemoryLog` (**the canonical memory log** — only story memory); console inspector
- Status: NORMATIVE
- Defines: `NPCSystem`, `NpcMemoryLog`, `__NPC_DEBUG__`
- Calls: `DataManager.npcs`, condition engine (`ConditionEngine.evaluate`, per-NPC), TimeService (day stamps), reads `__QUEST_DEBUG__` flag (set by engine/game.js)
- Listens: `npc:talked`, `npc:dialogueChoice`, `npc:dialogueFlag`, `npc:dialogueAffection`, `quest:completed`
- Emits: none (log writes via manager)
- Store: writes `persistent.npcs` eventLog/favorites-adjacent state; reads `persistent.time` for day stamps
- Content: `npcs.json`, `locations.json` (via location rules)
- GuardedBy: `tests/suites/step2_npc_system.cjs`

### systems/progression.js
- Purpose: persistence backbone — `GameManager` + storage backends, store schema + migrations, and the meta systems: Affection, Children, Estate, Farming, Disaster, Sandbox
- Status: NORMATIVE
- Defines: `GameManager`, `StorageBackend`, `LocalStorageBackend`, `AffectionSystem`, `ChildrenSystem`, `EstateSystem`, `FarmingSystem`, `DisasterSystem`, `SandboxSystem`, `CHILD_GROWTH_THRESHOLD`, `setTownLevel`, `getTownLevel`
- Emits: `resources:changed`, `player:levelUp`, `counter:changed`, `farmingComplete`, `combat:sessionEnd`, `save:reset`, `save:slotSwitched`, `save:slotWiped`, `unlock:weapon`, `unlock:stage`, `unlock:feature`
- Store: **owns the default shape of ALL `persistent.*` branches** (combat, currency, factions, gameLog, inventory, npcs, player, quests, skills, time, town, unlocks) + migrations (current: v9)
- GuardedBy: trace (saves/slots), `tests/suites/step3_widget_inventory.cjs` (inventory), `tests/suites/save_fuzz.cjs` (migration shape gate, v9, double-boot race)

### systems/loot.js
- Purpose: `StarSystem`, `FrenzySystem`, `GachaProtection` (drop flavor/luck layers)
- Status: NORMATIVE
- Defines: `StarSystem`, `FrenzySystem`, `GachaProtection`
- Store: reads/writes `persistent.combat` session counters
- GuardedBy: trace

### systems/quest.js
- Purpose: quest engine — availability via ConditionEngine, objectives, time events; debug inspector
- Status: NORMATIVE
- Defines: `QuestSystem`
- Calls: ConditionEngine `evaluate` (shared — no forking), `DataManager.quests`, `DataManager.contentGates`, reads `__QUEST_DEBUG__` flag (set by engine/game.js)
- Emits: `quest:available`, `quest:started`, `quest:objective_progress`, `quest:completed`, `quest:flag_set`, `quest:time_event`
- Listens: `combat:sessionEnd`, `npc:talked`, `location:navigated`, `death`
- Store: writes `persistent.quests`
- Content: `quests.json`, `content_gates.json`
- GuardedBy: `tests/suites/step1_gate_engine.cjs`, trace (quests)

### engine/locationManager.js
- Purpose: town/world location graph navigation
- Status: NORMATIVE
- Defines: `LocationManager`
- Calls: `DataManager.locations`, `DataManager.npcs`
- Emits: `location:navigated`
- GuardedBy: trace

### T4 — UI

### ui/audio.js
- Purpose: `AudioManager` (WebAudio SFX/BGM) + `TitleBGM`; the single bus→sound subscriber
- Status: NORMATIVE
- Defines: `AudioManager`, `TitleBGM`
- Listens: `weaponFire`, `projectileHit`, `areaPulse`, `contactDamage`, `damage`, `pickup`, `levelUp`, `weaponLevelUp`, `weaponUnlock`, `death`, `bossSpawn`, `bossDeath`, `bossCharge`, `magnetActivate`, `restart`, `selectUpgrade`, `stateChange`
- GuardedBy: trace (audio smoke)

### ui/game.js
- Purpose: `UIManager` — combat HUD DOM: level-up cards, pause menu, end screen
- Status: NORMATIVE
- Defines: `UIManager`
- Calls: `WidgetRenderer` (pause/end action buttons are widget cards, v2.14.0 — declared `widget:*` document events bridged to the bus; ids `pause-resume/exit/quit`, `end-retry/town` preserved)
- Emits: `selectUpgrade`, `pauseMenuAction`, `restart`, `endScreenDismiss`
- DOM: `levelup-overlay`, `levelup-cards`, `pause-overlay`, `pause-resume`, `pause-quit`, `pause-exit`, `end-actions`, `end-retry`, `end-town`
- GuardedBy: trace (pause/end flows)

### ui/dockMenu.js
- Purpose: town dock buttons
- Status: NORMATIVE
- Defines: `DockMenu`
- DOM: `town-dock`
- GuardedBy: trace

### ui/widgetRenderer.js
- Purpose: WidgetRenderer — data-driven card rendering (pooled), skins from content; v1.1: data-bound context accent (`accent.bind` → bounded `--widget-accent-<token>` palette) + `muted` flag; v1.1.1: click-time binding data (`_instanceData`) — pooled rebind updates onClick payloads too; v1.2: data-bound `selected.bind` (`.widget-selected` on render+rebind) + click-time DEF (`_instanceDef`) — a warm pool rebound with a different def emits the NEW event, and layout/size classes refresh on rebind; v2.19.15 (B11): interactive cards are keyboard-operable buttons — `role="button"` + `tabindex="0"` + Enter/Space activation (shared emitClick, `_instanceDisabled` honored), a11y attrs re-sync on `_rebind` (created-plain nodes never gain attrs — no focusable-but-dead cards); visible `:focus-visible` outline in styles.css
- Status: NORMATIVE
- Defines: `WidgetRenderer` (+ static `WidgetRenderer._all`: registry of every renderer instance — consumed by the §7.2 occlusion audit and the §6.4 inspector), static `installInspector()` (v2.19.12 — installed once at boot by engine/game.js; idempotent `window.__WIDGET_DEBUG__` console bridge: `list()` live cards across all renderer instances, `inspect(el)` producing def + resolved data + payload preview + clickable check, `occlusion()` §7.2 audit over every live interactive instance; "live" = connected + laid out, so parked pool surplus and hidden-overlay cards are excluded)
- Calls: `DataManager.uiSkins`, `game` (registry access)
- Content: `ui_skins.json` (v2 vocabulary v2.19.13: v1 = color-token only; v2 = 9-slice `border`/`borderSlice`/`borderWidth` + texture `background` + `backgroundColor` underlay (§4.4 contrast floor) + `cornerOrnament` — image fields land as CSS custom props only (`--widget-skin-border-image/-slice/-width`, `--widget-skin-bg-image`, `--widget-skin-ornament`), consumed by styles.css; asset paths enforced by the verify skin-asset gate; `_rebind` cleans all seven skin props on skinned→plain pool swaps)
- GuardedBy: `tests/suites/step3_widget_inventory.cjs` (render contract + §6.4 inspector: list/inspect/occlusion incl. the veiled negative control), `tools/widget_preview.cjs` (v1.1.1/v1.2 pool regressions), `tests/suites/step5_loadout_widgets.cjs` (def-swap + selected-bind live)

### ui/shop.js
- Purpose: shop screen — buy consumables/upgrades, sandbox launcher, farming loot handoff
- Status: NORMATIVE
- Defines: `ShopSystem`
- Calls: `WidgetRenderer` (tab chips + stocked items are pooled repeats — §10 screen-6, v2.18.0; defs `TAB_CHIP_DEF`/`SHOP_ITEM_DEF` declare `widget:shopTab`/`widget:shopBuy`; active tab and cant-afford are DATA via v1.2 `selected.bind` / v1.3 `disabled.bind`; the inventory pilot's cardDef now rebinds the same host pool — v1.3 rebind swaps skins with the def)
- Emits: `shopPurchase`, `shopEffect`, `startCombat`, `farmingLootCollected`
- Listens: `resources:changed`
- Content: `shop.json` (v2.19.7 — the stocked catalog via `DataManager.shop`; POT-006)
- Store: writes inventory/gold **through progression APIs** (POT-012 clean — no direct branch writes)
- DOM: `shop-overlay`, `shop-items` (widget pool host — no innerHTML wipes; farming/sandbox modes still wipe here, kept bespoke per §3.2), `shop-gold`, `shop-tabs` (pool host), `shop-close`, `sb-launch`, `sb-difficulty`, `sb-diff-val`, `sb-show-dps`
- Dynamic-create: [sb-launch, sb-difficulty, sb-diff-val, sb-show-dps, shop-empty-notice] (farming/sandbox mode UI built in renderers — F2 gate)
- Note: v2.19.7 §5.7 consolidation — the farming/sandbox overlay UI single-homes here (`openFarming`/`openSandbox`); townContent's town-root farming card and the town panel's Sandbox button both route into this system
- GuardedBy: `tests/suites/step3_widget_inventory.cjs` (purchase/inventory round-trip), `tests/suites/step6_shop_tabs.cjs` (tabs/disabled/round-trip pin)

### ui/townEngine.js
- Purpose: town scene engine — location rendering/swiping, combat entry panel
- Status: NORMATIVE
- Defines: `TownEngine`
- Calls: `DataManager.stages`, `DataManager.weapons`
- DOM: `town-bg`, `town-gold`, `town-camp-name`, `town-breadcrumb`, `dock-map`, `town-left-panel`, `town-back`, `town-arrow-left`, `town-arrow-right`, `panel-backdrop`, `panel-enter-combat`, `panel-open-sandbox`, `swipe-region-name`, `dialogue-text` (shared)
- Dynamic-create: [town-run-stats] (referenced by the engine's DOM cache; the chip id is a v2.15 widget def in townContent — F2 gate)
- GuardedBy: trace (town)

### ui/townContent.js
- Purpose: town screens content — NPC dialogue engine (dialogueSets through condition engine), HUD chips (date/log/gold/run stats), town-root farming entry card
- Status: NORMATIVE
- Defines: `TownContent`
- Calls: `WidgetRenderer` (HUD chips: one pooled repeat — §10 screen-3, v2.15.0, ids `town-log-toggle/town-date/town-run-stats`, log chip declares `widget:toggleGameLog`; dialogue + dog choices: pooled repeats — §10 screen-4, v2.16.0, defs `DIALOGUE_CHOICE_DEF`/`DOG_CHOICE_DEF` declare `widget:dialogueChoice`/`widget:dogChoice`, behavior in `_handleTopicChoice`/`_handleDogChoice`, verbatim from the pre-migration listeners); `ShopSystem.openFarming` (v2.19.7 — the town-root farming card opens shop.js's single-homed farming mode)
- Emits: `npc:talked`, `npc:dialogueChoice`, `npc:dialogueFlag`, `npc:dialogueAffection`
- Listens: `quest:completed`, `quest:time_event`
- Store: town level read/written via typed `GameManager.getTownLevel`/`setTownLevel` (§5.6 closed v2.19.2 — no direct branch writes)
- DOM: `dialogue-overlay`, `dialogue-name`, `dialogue-text`, `dialogue-choices`, `dialogue-continue`, `dialogue-portrait`, `dog-dialogue*`, `companion-slot-*`, `companion-notification`
- Dynamic-create: [town-run-stats] (widget chip def id — F2 gate; v2.19.7 removed the duplicated farming/sandbox overlay renderers and their sb-* ids, see §5.7)
- GuardedBy: `tests/suites/step2_npc_system.cjs` (dialogue selection)

### ui/loadout.js
- Purpose: pre-combat loadout picker (stage → weapons → companions)
- Status: NORMATIVE
- Defines: `LoadoutScreen`
- Calls: `COMPANION_DATA` (guarded), `DataManager.stages`, `WidgetRenderer` (cards + slot chips are pooled repeats — §10 screen-5, v2.17.0; defs `WEAPON_CARD_DEF`/`COMPANION_CARD_DEF`/`SLOT_CHIP_DEF` declare `widget:loadoutPick`/`widget:loadoutClear`, bridged on the overlay; persistent chrome skeleton, phase renders only re-populate hosts; selection via renderer v1.2 `selected.bind`)
- DOM: `loadout-overlay`, `loadout-next`, `loadout-confirm`, `loadout-back`, `loadout-back-companions`, `loadout-slots` (pool host), `loadout-grid` (pool host)
- Dynamic-create: [loadout-overlay, loadout-title, loadout-subtitle, loadout-next, loadout-confirm, loadout-back, loadout-back-companions, loadout-slots, loadout-grid] (chrome skeleton built once per show() — F2 gate)
- GuardedBy: `tests/suites/step5_loadout_widgets.cjs`

### ui/town.js
- Purpose: `TownScreen` — town shell/root controller
- Status: NORMATIVE
- Defines: `TownScreen`
- GuardedBy: trace

### T5 — orchestrator

### engine/game.js
- Purpose: `Game` — constructs & wires every system, owns the loop, combat heartbeat autosave, pause/ESC flow, boss flow, resume banner, dev hooks
- Status: NORMATIVE
- Defines: `Game`, `game` (window), `this.timeService` (public instance surface: game.timeService), `__QUEST_DEBUG__` (debug flag, read by quest/npcSystem)
- Listens (hub — most connections end here): `damage`, `death`, `pickup`, `levelUp`, `weaponLevelUp`, `bossSpawn`, `bossDeath`, `bossIntro`, `bossCharge`, `arcaneShot`, `chainLightning`, `coneAttack`, `companionSpawn`, `companionGrowl`, `companionLootCollect`, `contactDamage`, `areaPulse`, `pause`, `restart`, `selectUpgrade`, `pauseMenuAction`, `endScreenDismiss`, `skipToBoss`, `quest:objective_progress`, `save:runInterrupted` (self)
- Emits: `bossIntro`, `bossIntroComplete`, `bossCharge`, `magnetActivate`, `pause`, `pickup`, `weaponUnlock`, `save:runInterrupted`
- Store: writes `persistent.combat` (run state/autosave); town level via typed `setTownLevel` (§5.6 closed v2.19.2)
- DOM: `game-canvas`, `loading-screen`, `loading-fill`, `loading-status`, `settings-screen`, `settings-back`, `music-slider`, `music-val`, `sfx-slider`, `sfx-val`, `resume-banner`, `resume-accept`, `resume-discard`, `reset-progress`
- GuardedBy: trace (full boot→combat→end cycle)

---

## §3 Reverse indexes (derived from §2 — verify checks consistency)

### §3.1 Content file → consumers

| Content file | Direct consumers (beyond DataManager registry) |
|---|---|
| calendar.json | calendarTime.js |
| npcs.json | npcSystem.js, locationManager.js |
| shop.json | shop.js (catalog tabs + inventory display-name fallback) |
| locations.json | locationManager.js, npcSystem.js (location rules) |
| quests.json | quest.js |
| content_gates.json | quest.js (gate inputs) |
| weapons.json | combat.js, townEngine.js, game.js |
| stages.json | entities.js, townEngine.js, loadout.js, game.js |
| enemies.json | entities.js, titleMenu_refactored.js, game.js |
| attackAreas.json | combat.js |
| leveling.json | pickup.js |
| companions.json | companion.js (+ `COMPANION_DATA` const readers: core/titleMenu/entities/progression/loadout — guarded) |
| ui_skins.json | widgetRenderer.js |
| characters.json | game.js (selectStage flow) |
| elements.json / visuals.json / pickups.json | registry-only (consumed via DataManager at runtime) |

All 16 are registered in `engine/core.js` fetch list + generator registry (POT-006); missing either = hard error.

### §3.2 Bus event → emitters / listeners

`NONE` in Listeners = emitted but no static listener found (§5.5 — verify before declaring dead).

| Event | Emitters | Listeners |
|---|---|---|
| `time:dayAdvanced` | calendarTime | gameLog |
| `quest:completed` | quest | gameLog, npcSystem, townContent |
| `quest:started` | quest | NONE |
| `quest:available` | quest | NONE |
| `quest:objective_progress` | quest | game |
| `quest:flag_set` | quest | NONE |
| `quest:time_event` | quest | townContent |
| `npc:talked` | townContent | npcSystem, quest |
| `npc:dialogueChoice` | townContent | npcSystem |
| `npc:dialogueFlag` | townContent | npcSystem |
| `npc:dialogueAffection` | townContent | npcSystem |
| `location:navigated` | locationManager | quest |
| `levelUp` | pickup | game, audio, gameLog |
| `player:levelUp` | progression | NONE (engine side uses `levelUp`) |
| `weaponLevelUp` | combat | game, audio, gameLog |
| `weaponUnlock` | game | audio |
| `weaponFire` | combat | audio |
| `damage` | combat, pickup | game, rendering, audio |
| `damageEntity` | combat | combat (self) |
| `contactDamage` | combat | game, combat (self), audio |
| `projectileHit` | combat | combat (self), audio |
| `arcaneShot` / `chainLightning` / `coneAttack` | combat | game |
| `areaPulse` | combat | combat (self), audio |
| `pickup` | combat, pickup, game | pickup, rendering, audio, game |
| `magnetActivate` | game | pickup, audio |
| `death` | combat | pickup, quest, audio, game |
| `bossSpawn` | entities | audio, game |
| `bossDeath` | combat | audio, game |
| `bossCharge` | game | audio |
| `bossIntro` | game | game (self) |
| `bossIntroComplete` | game | NONE |
| (v2.19.2) `playSound`, `telegraphSpawn`/`telegraphResolve`, `floatingText` — emitters DELETED (§5.5 resolved): no listeners existed; companion feedback now calls `FloatingTextSystem.spawn` directly | — | — |
| `companionSpawn` | companion | game |
| `companionDamage` | companion | combat |
| `companionGrowl` | companion | game |
| `companionLootCollect` | companion | game |
| `stateChange` | core | audio |
| `pause` | core, game | game, audio(no) → game |
| `restart` | core, ui/game | game, audio |
| `selectUpgrade` | core, ui/game | game, audio |
| `pauseMenuAction` | core, ui/game | game |
| `endScreenDismiss` | core, ui/game | game |
| `skipToBoss` | core | game |
| `startCombat` | shop | NONE (direct call path — §5.5) |
| `shopPurchase` | shop | gameLog |
| `shopEffect` | shop | NONE |
| `farmingLootCollected` | shop, townContent | gameLog |
| `resources:changed` | progression | shop, gameLog |
| `counter:changed` | progression | NONE |
| `farmingComplete` | progression | NONE |
| `combat:sessionEnd` | progression | quest |
| `save:reset` / `save:slotSwitched` / `save:slotWiped` | progression | NONE (§5.5) |
| `unlock:weapon` / `unlock:stage` / `unlock:feature` | progression | NONE (§5.5) |
| `save:runInterrupted` | game | game (self) |
| `gameLog:updated` | gameLog | gameLog (self) |

### §3.3 Store branch ownership (POT-012 surface)

| Branch | Default shape | Other writers (registered) |
|---|---|---|
| `player`, `currency`, `skills`, `factions`, `unlocks`, `inventory` | progression.js | NONE direct (shop/quests write via progression APIs) |
| `combat` | progression.js | game.js (run state/autosave), loot.js (session counters) |
| `town` | progression.js | NONE direct (level via typed setTownLevel — §5.6 closed v2.19.2) |
| `quests` | progression.js | quest.js |
| `npcs` | progression.js | npcSystem.js (log), npcExport.js (favorites only) |
| `time` | progression.js | calendarTime.js (**sole writer per POT-012**), npcSystem reads for stamps |
| `gameLog` | progression.js | gameLog.js (capped tail mirror only) |

---

## §4 Archetype templates (what a contract block must contain, per file type)

Required (★) vs optional (○). A block missing a ★ line for its archetype fails `verify:map` intent review.

| Archetype | Purpose | Status | Defines | Calls | Listens/Emits | Content | Store | GuardedBy |
|---|---|---|---|---|---|---|---|---|
| **Engine service** (engine/*, systems/*) | ★ | ★ | ★ if global | ★ | ★ if bus-connected | ○ | ★ if touches persistent | ★ |
| **UI controller** (ui/*) | ★ | ★ | ★ if global | ○ | ★ if bus-connected | ○ | ○ | ★ | — DOM ownership listed under Calls |
| **Data blob** (data/*) | ★ | ★ | ★ | N/A | N/A | N/A | N/A | ○ |
| **Generated file** (data/embeddedData.js) | ★ | ★ | ★ | N/A | N/A | mirror of all | N/A | ★ (content:check) |
| **Content JSON** (content/*) | — | — | — | — | — | — | — | — (indexed in §3.1, not block-per-file) |
| **Test suite** (tests/suites/*) | — | — | — | — | — | — | — | — (indexed via GuardedBy lines) |
| **Tool** (tools/*) | — | — | — | — | — | — | — | — (TOOLING_MAP.md owns this catalog) |

Convention notes: systems files MUST declare store lines even when empty (`Store: none — reads via APIs`);
UI files MUST list their DOM ids. New archetypes get a row here before the first file of that type ships.

---

## §5 Health log (pre-seeded — add entries on first real use, per KNOWLEDGE §19)

**Format:** date • what happened • adjustment (or still open).

- **5.1 (2026-09-14, birth of map)** — *Scope limit:* all checks are syntactic (substring/coverage).
  Semantic truth (e.g., "the only writer of X") is established by review, not regex. Standing caveat.
- **5.2 (2026-09-14)** — *Extraction false positives encountered:* `class BUG` (prose "class BUG-026" in a
  comment) and `window.confirm` (browser API). These were manually excluded from blocks. Adjustments:
  symbol checks may need word-boundary matching if they misfire.
- **5.3 (2026-09-14)** — flag-type debug symbols don't fit "Defines" the same way classes do:
  `__QUEST_DEBUG__` is a boolean *set* in engine/game.js (~:984) and *read* in quest.js/npcSystem.js.
  Convention: listed in the **setter's** Defines, in each **reader's** Calls. Initial map had this
  attribution wrong (probe's per-file `window.` regex can't tell setters from readers); fixed at birth.
- **5.4 (open)** — `data/shopData.js` (and other T0 blobs) are candidates for the content/ pipeline;
  marked IN-FLUX until migrated. This map must be updated the same change that migrates them.
- **5.5 (RESOLVED v2.19.2)** — dead-event audit executed: no listeners, no dynamic-name subscribers,
  no harness deps for any candidate. `playSound`, `telegraphSpawn/Resolve`, `floatingText` emitters
  DELETED (companion feedback → `FloatingTextSystem.spawn`); the rest KEPT as reserved API surface
  (`save:*`, `unlock:*`, `quest:available/started/flag_set`, `player:levelUp`, `counter:changed`,
  `farmingComplete`, `startCombat`, `shopEffect`, `bossIntroComplete`). §3.2 updated.
- **5.4 (RESOLVED v2.19.7)** — `data/shopData.js` migrated to `content/shop.json` (POT-006):
  registered in the generator registry + `engine/core.js` fetch list, mirror re-synced,
  `SHOP_DATA` reads replaced with `DataManager.shop` in shop.js, T0 script tag and map block
  removed. `SHOP_DATA` is no longer a global; §3.1 gains the shop.json row.
- **5.6 (RESOLVED v2.19.2)** — progression.js is the sole writer via typed `setTownLevel`/`getTownLevel`;
  the `persistent.town.phase` writable path was RETIRED (WRITABLE_PATHS now session-only) and _migrate
  v9 canonicalizes saves carrying the retired `phase` field (level stays canonical; phase never wins).
  The old path's auto-vivification was a live split-brain — §5.6's original concern, now closed.
- **5.7 (RESOLVED v2.19.7)** — the duplicate farming/sandbox overlay renderers in townContent.js
  are DELETED; shop.js is the single home (`openFarming`/`openSandbox`). Audit finding recorded:
  the duplicated townContent block's only callers were each other (its `openSandbox` had NO
  entry point), and the town panel's Sandbox button was a silent no-op all along — TownEngine
  accepts `onSandbox` but town.js never passed one. Now wired: `onSandbox →
  shopSystem.openSandbox(sandboxSystem)`; the town-root farming card routes into
  `shopSystem.openFarming`. Behavior delta: sandbox is reachable (new), farming overlay close
  restores the default shop chrome via `ShopSystem.close()` (same visual result, one owner).
- **5.4 (RESOLVED v2.19.7)**
