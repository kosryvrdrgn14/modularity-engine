# COMBAT ART PIPELINE SPEC — AI-generated art for the combat layer

**Created:** September 28, 2026 (B35 planning — no code changes yet)
**Status:** PROPOSAL — awaiting owner sign-off on dimensions + animation option
**Both animation options are specified and stay available** (Option A static+deform, Option B sprite sheets); the renderer contract in §7 supports either per-entity, so the tool-consistency question can stay open.

---

## §1 What this covers

Replacing the procedural shapes (circles/diamonds/squares in `_drawEntity`,
public/engine/rendering.js) with AI-generated art for: the player character,
enemies, companions, pickups, and (optionally) weapon effects. This doc defines
the dimension standard, file/naming contract, and both animation approaches so
image-generation tools can be evaluated against real constraints. **No code
changes yet.**

## §2 Measured ground truth (from the current pipeline — the standard derives from these)

Rendering facts that constrain art:
- One canvas; the world layer draws in **world units**; the camera has **no zoom**
  (1 world unit = 1 CSS px on every device; DPR-3 phones just render each world px
  as 3 device px). Screen-space HUD is separate (B24 contract).
- `_drawEntity` draws centered at (x, y) with `size` = **half-extent** — the drawn
  diameter is `2 × size`. The existing SVG image path already uses
  `drawImage(img, x−size, y−size, 2·size, 2·size)`, so **art drops in with zero
  draw-path math changes**.
- Hitboxes are gameplay (`stats.size`) and must NOT move when art lands —
  art scale is independent (Vampire-Survivors-style: sprite much larger than hitbox).

Current drawn diameters (`2 × stats.size`):

| Entity | size | drawn Ø |
|---|---|---|
| player (hitbox 20×20) | 10 | 20 |
| rat / bat | 7 / 8 | 14 / 16 |
| zombie | 10 | 20 |
| skeleton / ghost | 12 | 24 |
| caster | 13 | 26 |
| brute | 16 | 32 |
| companion (all) | 14 | 28 |
| ghoul (miniboss) | 22 | 44 |
| boss_gravekeeper | 28 | 56 |
| boss_necromancer | 30 | 60 |
| pickups (gems/coins/powerups/trophy) | 8–18 | 16–36 |
| projectiles | 4–6 | 8–12 |

## §3 THE DIMENSION STANDARD (the deliverable)

**Art unit = world unit = CSS px.** Art files are square, transparent
background, subject centered and occupying **≤ 80% of the frame** (padding for
limbs/effects and downscale safety), consistent light from top-left, no baked
drop shadow (the engine draws shadows as ellipses if wanted).

Files are generated at ~4× their drawn diameter (headroom for DPR-3 phones and
future art-scale tuning), snapped to clean sizes:

| Tier | Assets | Drawn Ø (px) | **File size** |
|---|---|---|---|
| **HERO** | player | **40** (2× current 20 — recommended, hitbox unchanged) | **128 × 128** |
| **M** | zombie, skeleton, ghost, caster | 20–26 | **128 × 128** |
| **S** | bat, rat | 14–16 | **96 × 96** |
| **L** | brute, companions (13) | 28–32 | **128 × 128** |
| **XL** | ghoul (miniboss) | 44 | **192 × 192** |
| **BOSS** | gravekeeper, necromancer | 56–60 | **256 × 256** |
| **ITEM** | all pickups incl. trophy | 16–36 | **64 × 64** |
| **FX** | projectiles (w1 bolt, w5 bolt) | 8–12 | **32 × 32** |

Weapon **effects** recommendation: keep cones/pulses/waves **procedural for now**
(they are already juicy, data-colored, and scale with weapon level); convert only
the discrete projectile sprites (32×32) first. Revisit after the character pass.

Style guidelines for generation testing:
- Top-down / three-quarter RPG view, single subject centered, readable at drawn
  size (do the downscale test: 128 file → 20px must still read as "zombie").
- Palette families per faction: graveyard enemies (desaturated bone, poison
  green, cold purple), player+companions (warm gold/teal accents) — contrast
  against the dark blue field (#1A1A2E / grid #16213E).

## §4 Data + file contract

- Files: `public/art/combat/<group>/<id>.png`
  (`art/combat/player/survivor.png`, `art/combat/enemies/zombie.png`, …)
- Loader: extend `assetMap.js` (ASSET_MAP) + existing `preloadAssets()`; cache
  key convention **`art_<id>`** (separate from the legacy `type_shape_color` keys).
- Content hook: `visual.art` field, e.g. enemies.json
  `"visual": { "shape": "circle", "color": "#3B8A30", "art": "zombie" }`;
  characters.json `"visual": { ..., "art": "survivor" }`.
- **Fallback rule (hard requirement):** missing art falls back to the current
  shape rendering silently. Headless tests, the battery, and any file:// boot
  must work with zero art files present.

## §5 ANIMATION OPTION A — static images + programmatic deform

One still PNG per entity; motion is code (canvas transforms, time-based):
- Idle bob: `y += sin(t·3)·2` (pickups already do this via `floatOffset`)
- Walk: squash-and-stretch cycle (`scaleY = 1±0.06·sin(t·10)`, scaleX inverse)
  + lean into movement direction (±8° by velocity)
- Flyers (bat/ghost): bob + rotation wobble
- Hit: white flash overlay (`source-atop` white) + 1-frame scale pop 1.15→1
- Death: scale-down + fade + slight rotate (0.25s)
- **Pros:** 1 file/entity; trivially consistent; iterate in minutes; juice applies
  to every entity at once; tiny memory. **Cons:** puppet feel, no limb animation.
- Cost: ~60 lines in `_drawEntity` (transform + flash), no new assets.

## §6 ANIMATION OPTION B — full sprite sheets

- Sheet standard: **8 frames per row**, frame size = tier file size (§3), rows
  per action: idle (8) · move (8) · attack (6) · hit (4) · death (8) — one
  `*_sheet.png` per entity, 1024px wide.
- Playback: renderer anim state machine keyed on entity state
  (`_animName`/`_animTime`), 10fps idle/move, 14fps attack.
- **Facing: start with a single row + horizontal flip for left** (halves the
  generation-consistency risk); 4-direction rows only where it pays later.
- **Pros:** real limb animation, reads best at boss scale. **Cons:** the exact
  consistency risk the owner flagged; 5–10× asset weight; needs atlas loader +
  state machine (~120 lines); slower iteration.
- **Hybrid path (recommended):** Option A everywhere first; sheets only where
  they pay (player + the two bosses). The §7 contract supports both
  simultaneously per-entity (`mode: 'deform' | 'sheet'`).

## §7 Renderer integration contract (both options)

- `_drawEntity` branches: art → sheet/deform → shape fallback (never breaks).
- Art draws at `2 × stats.size` diameter regardless of file px (§3 headroom).
- Shared transform pipeline (bob/lean/blink) applies to both options; iFrames
  blink unchanged; B24 world-text untouched.
- Memory: ≤40 files resident at these sizes is trivial (<15 MB GPU); preload
  rides the existing loading screen progress bar.

## §8 Tool-evaluation test matrix (what to actually generate when testing)

1. **Style lock:** player + zombie + boss_gravekeeper in one style pass — same
   palette family, same light direction.
2. **Variant consistency:** 4 zombie generations — same silhouette language.
3. **Sheet feasibility (Option B):** one 8-frame walk cycle for the zombie —
   judge frame-to-frame consistency honestly; this is the go/no-go for sheets.
4. **Transparency + no baked shadow + no baked ground.**
5. **Downscale readability:** each file at its drawn Ø (§3) on the #1A1A2E field.

## §9 Execution plan after sign-off

- **B35a:** loader + `visual.art` + player, zombie, boss_gravekeeper as stills
  with Option A deform — proves the pipeline end-to-end (3 files).
- **B35b:** remaining enemies/companions/pickups (batch).
- **B35c:** optional sheet pass for player + bosses (only if tools pass §8.3);
  projectile sprites; effects stay procedural unless proven worth it.
- Gates: visual_probe cells (art path renders; fallback intact with art absent;
  drawn-diameter pin), perf_budget (drawImage batch at 200 entities ≤ budget),
  full battery green.

## §10 Decisions needed from the owner

1. Player drawn at **40px** (2× current) for presence — yes/no? *(recommended yes)*
2. Art direction: gothic graveyard per §3 palette — or do you have reference images?
3. B35a scope (3 entities first) — ok?
4. Animation: Option A first + sheets for player/bosses if tools pass §8.3 — or full Option B commitment now?
