# Game Log / Console System — Design Spec

**Status:** Spec + v1 implemented together (v2.9.0, 2026-09-14) — small enough surface that a
separate spec-then-build pass would be ceremony; the capture policy below is the contract.
**Depends on:** EventBus (central listener registration, §21 rule), WidgetRenderer (panel cards),
store discipline (v1 log is SESSION-scoped — see below), calendar date labels for timestamps.

---

## 0. The one critical distinction (do not violate)

There are TWO logs and they must never merge:

| | **Game Log (this spec)** | **Canonical NPC memory log** (Step 2) |
|---|---|---|
| Purpose | Player + dev **play surface** | **Story memory** (data-driven content source) |
| Scope | Session-scoped ring buffer | Per-save, append-only, persisted |
| Content | Everything noisy: pickups, level-ups, purchases, day advances, combat events | Only narratively meaningful events |
| Consumers | The console UI, the dev inspector | Export, memoryCheckpoints, future NPC conditions |
| Writes | Fire-and-forget, capped, | Typed, validated, fail-closed |

The game log MAY read from systems for display, but it is **never a data source** — no condition,
no export, no memory feature may read from it. It exists to be looked at, not to be trusted.

---

## 1. Capture policy (v1)

Central bus listeners only (no per-system sprinkles). v1 captures:

- `time:dayAdvanced` — `"Day 34 → 35 (combat)"` / story skips as `"— timeskip: +30 days (story_skip)"`
- `quest:completed` — `"Quest completed: {questId}"`
- `levelUp` (existing emit) — `"Level up! Lv {n}"`
- `weaponLevelUp` (existing emit) — `"{weaponId} → Lv {n}"`
- `shopPurchase` — `"Purchased {itemId} (−{cost} gold)"`
- `resources:changed` with `source` — `"Gold +777 (source)"` (debounced per-frame)
- `farmingComplete` / `farmingLootCollected` — `"Farming loot: gold {g}…"`
- **Errors as entries:** `window.onerror` + `console.error` net → `⚠ {message}` — the dev-visible
  error tail without touching the error-net config of suites.
- Combat events (kills, damage) are **excluded in v1** — too noisy, revisit later.

**Timestamps:** every entry stamps the CURRENT in-game day at receive time (`Day N` prefix) +
session clock (`mm:ss` since boot). The calendar gives story context; the session clock gives
debug context. Neither is a save-format change.

---

## 2. Storage & behavior

- **Ring buffer, 200 entries** (`MAX_ENTRIES`), drop-oldest. Session-scoped: **not persisted**.
  Rationale: it's a play/debug surface; persistence would be a second save log (the exact
  duplication the one-rule forbids). If a future feature needs persistent history, that's a new
  decision — not this buffer.
- `log(text, { kind })` — kinds: `info` (default), `event`, `reward`, `warn`, `error` → colored.
- `getEntries(n?)`, `clear()` (dev), `size()`.
- New entries emit `gameLog:updated` on the bus (UI re-renders when open).

---

## 3. UI

**Town console** (v1): a **📖 Log chip** in the town header meta (next to 📅 Day) toggles a
slide-down panel listing entries newest-first: `[Day 34 · 02:14] text`, kind-colored, scrollable,
`Clear` + `✕` buttons. Zero interference with panels; closes on outside click.

**Dev inspector** (house style): `window.__GAMELOG_DEBUG__` → `.last(n)`, `.filter(kindOrText)`,
`.dump()` (copy all to clipboard), `.clear()`.

---

## 4. Testing (suite: `tests/suites/game_log.cjs`)

Real transitions per BUG-031: day advance produces a day-advance entry with correct day stamp;
purchase produces an entry and wallet delta; levelUp/quest entries; ring-buffer cap holds at
`MAX_ENTRIES` under flood; `clear()` empties; UI chip toggles the panel and renders entries;
purity: the game log is not the memory log (`gameLog` ≠ `memoryLog`; no `favorites`/`eventLog`
fields written by it).
