# Data-Driven Widget UI System — Design Spec

**Status:** Draft, first implementation pass. Explicitly expected to iterate — if the card
template proves wrong in practice, rebuild rather than force-fit around it. The goal of this doc
is a clear starting shape, not a guarantee of permanence.

**Relationship to other systems:** Consumed by the inventory system spec (categories/sorting) and
the NPC memory/roleplay export spec (checkpoint/favorites menus) as their rendering layer, rather
than each building its own UI code. Also the foundation for §7's occlusion-detection tool, which
depends on interactive elements being declared through this system rather than hand-coded.

---

## 1. Philosophy

Most of this game's UI is structurally repetitive — cards, tiles, and list rows with an icon,
title, secondary text, and a tap action — even though the *content* varies enormously (a weapon
tile and a quest-log entry are the same shape wearing different data). One flexible **Card
template**, configured per instance via data, covers the large majority of screens. A small
**Specialized tier** handles genuine outliers. A separate **Skin layer** handles visual variety
without touching structure at all. All three are data, editable without code — for you and for
modders.

---

## 2. The Card Template (primary widget)

### 2.1 Slots — optional, not fixed

`icon`, `primaryText`, `secondaryText`, `badge` (numeric/short text), `progressBar`,
`statusIndicator` (lock, checkmark, notification dot). An instance declares only the slots it
uses — a simple weapon tile might use three; a quest card with progress might use five. No slot
is ever forced to exist.

### 2.2 Per-slot data binding

```json
{
  "template": "card",
  "slots": {
    "icon": { "bind": "npc.portrait" },
    "primaryText": { "bind": "npc.name" },
    "secondaryText": { "bind": "quest.description" },
    "progressBar": { "bind": "quest.progress.current", "max": "quest.progress.max" }
  },
  "onClick": { "emit": "questCardSelected", "payload": { "questId": "{{quest.id}}" } }
}
```

### 2.3 Layout presets, not freeform positioning

A fixed, small set of named arrangements — `icon-left`, `icon-top`, `icon-only`,
`text-only-row`. An instance picks one; there is no drag-anywhere sub-element placement. This is
a deliberate constraint: true freeform layout reintroduces most of the complexity this system
exists to avoid, for a flexibility this game's actual screens don't need.

### 2.4 Size and color as bounded tokens

Size: preset tokens (`small`/`medium`/`large`) or an explicit width/height pair with a fixed
aspect ratio — never arbitrary pixel drag-resize. Color: accent/theme tokens drawn from a defined
palette, never raw hex values. This keeps modder recoloring safe (can't produce unreadable
contrast by accident) and preserves the existing accessibility decision that shape/icon carries
meaning, color stays decorative (see §4.4).

### 2.5 Repeat-over-array

A template instance can point at a data array and auto-instantiate one card per element,
formalizing what list-driven screens (companion roster, location cards, quest log) already do
conceptually.

### 2.6 Context accent

A lightweight variation axis — combat cards, town cards, and romance cards can each apply a
different default accent/icon-arrangement to the *same* underlying template, so the game doesn't
read as visually uniform across wildly different contexts, without adding new widget types.

### 2.7 Text reflow (localization safety)

Text slots must reflow (ellipsis-truncate or auto-shrink), never assume fixed width. Cheap to do
correctly now; expensive to retrofit across 50+ characters' worth of card content once
localization becomes real.

---

## 3. Specialized Templates (second tier)

### 3.1 What qualifies

Genuine structural outliers that cannot reasonably be expressed as a configured Card: the VN
dialogue/date-scene interface, the in-combat HUD (health bar, minimap, weapon cooldowns), the
settings panel (sliders, toggles), the NPC checkpoint/history browser.

### 3.2 The graduation rule (mandatory check before adding a new one)

Before creating a new specialized template, explicitly answer: *is this structurally impossible
to express with the Card template's slots/presets, or do I just not want to configure it that
way?* Only the first answer justifies a new template. This rule exists specifically because "just
one more special case" compounds quietly across a large roster and many features — write this
check into review/PR habits, not just this document, so it survives past whoever wrote it.

### 3.3 Registry

Keep the specialized-template list explicit and short in `MASTER_DESIGN.md` or an equivalent
living doc, so it's obvious at a glance whether something new is a genuine addition or scope
creep.

---

## 4. Skinning System

### 4.1 What a skin is

Purely visual: border art (9-slice, so one asset stretches cleanly to any card size), a
background texture or color, an optional corner ornament/accent icon. Layered under and around
slot content — never structural, never touches data bindings or click behavior.

```json
{
  "skinId": "spider_queen_estate",
  "border": "assets/ui/skins/silk_border_9slice.png",
  "background": "assets/ui/skins/web_texture.png",
  "cornerOrnament": "assets/ui/skins/spider_sigil.png",
  "accentColorToken": "estate_arachnid"
}
```

### 4.2 Skins are data

`content/ui_skins.json` maps skin-id → asset paths and color tokens, following the same pattern
as every other content type in this project. Adding a new skin never touches renderer code.

### 4.3 Use cases

Per-district identity (Market vs. Garrison vs. Shrine), per-estate identity matching a wife's
specialty, per-context variation (combat/town/romance) layered on top of §2.6's accent system.
This is the primary, cheapest lever for avoiding a uniform "every screen is the same rectangle"
feel — same underlying widget, very different perceived identity, zero new logic per screen.

### 4.4 Hard constraint: skins are never the sole channel for information

A skin must never be the only way a piece of information is conveyed. This directly protects the
existing weapon-triangle accessibility decision (shape/icon carries meaning, color is decorative)
from being silently broken by a future skin's color choices reducing contrast or removing a
previously color-coded distinction. Treat this as a hard rule, not a guideline — validate it at
skin-authoring time if practical (§6.1).

### 4.5 Modding surface

Skins are the safest possible mod entry point — a new border/background asset plus a config
entry cannot touch game logic or data bindings at all. Point mod support here first, before
exposing raw layout files, since it's foolproof by construction.

---

## 5. Rendering & Performance

### 5.1 Instance pooling for lists

Long lists (companion roster, inventory grid, quest log) reuse a pool of card instances and
rebind data on scroll/filter changes, rather than destroying and recreating DOM. Most visible as
avoided jank on mobile specifically.

### 5.2 Reactive re-render, not polling

A bound slot (progress bar, badge count) re-renders on the specific event that changes its bound
value, never via interval polling. This is the same lesson already learned from the game-loop
state-machine bug — anything that polls independently of real state-change events risks drifting
out of sync with what's actually true, or continuing to run when it shouldn't.

---

## 6. Data Integrity & Tooling

### 6.1 Schema validation at load time

Malformed layout or skin files must fail loudly with a clear error the moment they're loaded —
never silently render broken, invisible, or default-fallback widgets. Directly relevant to §7: a
genuinely malformed widget definition is one of the easiest ways to accidentally create an
invisible-but-technically-present interactive element.

### 6.2 Version tagging

Layout and skin files carry a version tag, same discipline as save-schema versioning. When the
widget vocabulary changes in a future update, an old mod's file gets flagged as needing an
update rather than silently breaking or misrendering.

### 6.3 Live-preview tool

A lightweight standalone previewer — feed it a layout/skin plus dummy data, see the rendered
result instantly, without booting the full game. Cheap once the renderer exists (same renderer,
synthetic data), and meaningfully speeds up iteration for both you and modders.

### 6.4 Widget inspector (dev tool)

For any card currently on screen, show which layout file, which skin, and which data bindings
produced it — the UI equivalent of browser devtools' element inspector. Given how much time this
project has already lost to "why isn't this working" archaeology (the `partyBtn` bug, the
GameManager/DataManager mixup), a built-in introspection layer for this specific system pays for
itself quickly.

---

## 7. Occlusion Detection ("buried UI element" tracking)

### 7.1 Purpose

Directly targets the exact bug class already hit twice in this project — an interactive element
existing correctly in code but visually blocked by something else on top of it (`titleMenu` never
hidden, the shop overlay's HTML silently deleted during a split). This system asks the browser
directly whether an element is actually clickable, rather than inferring it from reading code.

### 7.2 Mechanism

For every rendered widget instance that declares an `onClick`/interactive action, use
`document.elementFromPoint()` at that instance's visual click target and check whether it
resolves back to the expected element. If it resolves to something else, flag the mismatch by
widget/layout name.

### 7.3 Why this system makes it (nearly) free

Because every interactive element in the game is, by construction, a declared widget instance
with an explicit action (§2.2), the audit tool never needs to infer what "should" be clickable —
it simply enumerates every currently-rendered instance with an `onClick` and checks it. No
separate reverse-engineering pass required; this falls out of building the widget system this
way from the start.

### 7.4 Integration

Add as an automated step in the post-refactor verification checklist already established (this
project's `KNOWLEDGE.md`), using the Playwright tooling already present in the codebase's test
scripts — not a manual, memory-dependent check.

---

## 8. Rollout

Pilot the Card template and one skin on a single real screen — the inventory system is the
natural first candidate, since it's already scoped as category/data-driven — before expanding
the slot/preset vocabulary further. Resist building out the full vocabulary speculatively; let
real screens reveal what's actually missing.

**Explicitly expected:** if this shape proves wrong under real use, rebuild rather than force-fit
around it. This spec is a strong starting point, not a permanent commitment.

---

## 9. Open Questions

- Exact context-accent (§2.6) mechanism — a per-screen default vs. an explicit per-instance
  override — worth settling once the pilot screen is built and there's a real second screen to
  compare against.
- Whether skin accessibility validation (§4.4) can be partially automated (e.g., a contrast-ratio
  check at authoring time) or needs to stay a manual authoring discipline for v1.
- Whether the specialized-template registry (§3.3) needs its own doc or lives inside
  `MASTER_DESIGN.md` — a scope/location decision, not a design one.