# KNOWLEDGE.md — Working Agreement & Lessons Learned

> Read at the start of every session. When a request conflicts with a rule here, flag the conflict instead of silently picking one side.

---

## 1. Every non-trivial task starts with a stated plan — no exceptions

Before writing or editing code for anything beyond a one-line fix, post a short plan: what will change, which files, what could break, and how it will be verified. Wait for a go-ahead on anything that touches more than 2-3 files or any shared system (event bus, save data, data schemas).

This is not optional based on how the request was phrased. A vague prompt ("add a shop") is not license to skip the plan — it's a signal to propose one and ask a clarifying question if genuinely ambiguous, not to fill the gap silently and start building.

**Never "yolo" a multi-file or multi-system change.** If you notice yourself about to touch more than 3 files without having stated a plan first, stop and state the plan before continuing.

## 2. File size discipline

- No file should exceed ~2,000 lines. Split proactively when a file crosses this, not after it's already causing problems.
- Before adding significant new code to an existing file, check its current size. If it's near the threshold, split first, then add the feature.
- `game2.html` grew to 10,519 lines before this rule existed. That single fact caused most of the debugging pain on this project — the level-3 upgrade freeze took 3 sessions to diagnose specifically because the file was too large to hold in context while tracing it.

## 3. Specs are written just-in-time, not in bulk

- Write the spec for the feature you're about to build this session or next. Do not write specs for features more than 1-2 sessions out.
- Max 3 active/unimplemented spec documents at once. If a 4th is needed, either implement one of the existing 3 first, or merge overlapping specs together instead of creating a new file.
- Before creating a new doc, check whether an existing doc already covers this topic. If yes, edit that doc — don't create a second "audit" or "plan" or "report" doc on the same subject.
- `MASTER_DESIGN.md` is the only long-form doc that should be read in full regularly. Everything else gets searched by keyword, not read end to end.

## 4. Write one, test one

Never batch more than 2-3 small changes without running verification in between. After each meaningful change:
- Run the type check / syntax check.
- If the change touched HTML+JS wiring (new buttons, overlays, event listeners), manually confirm the specific element exists and the specific listener fires — don't assume from reading the code that it's wired correctly.
- If a smoke test exists for the touched area, run it before moving to the next change.

## 5. Mandatory post-refactor verification checklist

Any time a file is split, renamed, or has code moved out of it, run ALL of these before considering the refactor done:

- [ ] `node --check` (or equivalent) on every file in the actual load order, reassembled — not just each file in isolation.
- [ ] Grep the whole codebase for every `getElementById`, `querySelector`, and similar DOM lookup. Confirm every target ID/selector still exists somewhere in the HTML.
- [ ] Grep for every name that was moved/renamed. Confirm no dangling reference to the old location remains anywhere, including in files that weren't part of the direct refactor.
- [ ] Delete or clearly quarantine any file made obsolete by the refactor immediately — don't leave it in the active path.

## 6. Defensive coding for data loading

- Every DataManager content type should have a fallback in `EMBEDDED_DATA` (even if minimal/empty) so a fetch failure doesn't crash the game.
- Every method that reads from DataManager should handle `undefined`/`null` gracefully. Never assume data exists.
- When removing a global variable (script tag), ensure ALL references to it are updated first. Check `grep -rn` across the entire codebase.

---

## Naming Convention — The Three Managers

This project has three objects with confusingly similar names. **Never confuse them.**

| Object | Class | Owns | Created in | Key property |
|---|---|---|---|---|
| `Game` | `Game` | Everything — the main class | `game2.html` | `this.dataManager`, `this.gameManager`, `this.townScreen` |
| `gameManager` | `GameManager` | Save data, flags, currency, progression | `Game` constructor | `this.store`, `get_flag()`, `set_flag()`, `get_currency()` |
| `dataManager` | `DataManager` | JSON content loading | `Game` constructor | `this.locations`, `this.npcs`, `this.weapons`, `this.enemies` |

**Common mistake:** Passing `gameManager` (GameManager) where `dataManager` (DataManager) is needed, because both are "managers" and both are passed as constructor arguments.

**Rule:** When wiring dependencies, always verify which object you're passing. If a class needs JSON content, it needs `dataManager`. If it needs save data/flags, it needs `gameManager`. If it needs both, accept both as separate parameters using destructured objects — never rely on one manager having a reference to the other.

**Consideration for future:** `GameManager` may benefit from renaming to `SaveManager` or `ProgressManager` to reduce naming collision risk while the codebase is still small.

---

## Data Flow Architecture

```
Game.init()
  └─ DataManager.loadAll()          ← fetches content/*.json, stores as this.locations, this.npcs, etc.
       └─ embeddedData.js fallback  ← EMBEDDED_DATA[key] if fetch fails

TownScreen({ gameManager, dataManager, ... })
  └─ LocationManager({ gameManager, dataManager })  ← reads JSON via dataManager
  └─ ShopSystem({ gameManager })
  └─ TownContent({ gameManager, locationManager, ... })
  └─ TownEngine({ locationManager })
```

**Key:** `gameManager` and `dataManager` are always passed as **separate** parameters. Do not assume one has a reference to the other.

---

*Last updated: September 2, 2026*
