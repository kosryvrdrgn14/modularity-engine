# COMBAT ART PIPELINE SPEC — AI-generated art for the combat layer

**Created:** September 28, 2026 (B35 planning — no code changes yet)
**Status:** PROPOSAL — dimensions RESOLVED 2026-09-30 (§10.6): square delivery frames,
shape = silhouette, normalize-step delivery (§3.0); generator = ChatGPT image models
(owner-driven; API for batches). Still open: §10.1–§10.5 (style workflow, hero starting
size, art direction refs, B35a scope, animation option).
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
| **HERO** | player | **20 / 32 / 40** (scale ladder, §3.1) | **32 × 32 base** (ladder to 64/128, §3.1) |
| **M** | zombie, skeleton, ghost, caster | 20–26 | **128 × 128** |
| **S** | bat, rat | 14–16 | **96 × 96** |
| **L** | brute, companions (13) | 28–32 | **128 × 128** |
| **XL** | ghoul (miniboss) | 44 | **192 × 192** |
| **BOSS** | gravekeeper, necromancer | 56–60 | **256 × 256** |
| **ITEM** | all pickups incl. trophy | 16–36 | **64 × 64** |
| **FX** | projectiles (w1 bolt, w5 bolt) | 8–12 | **32 × 32** |

### §3.0 Generators cannot hit tier sizes — the NORMALIZE STEP delivers them (added 2026-09-30)

Measured reality of image generators (GPT-image family, incl. the ChatGPT "IMG2"
models the owner plans to use): output sizes are fixed LARGE buckets —
1024×1024 / 1536×1024 / 1024×1536 (newer variants add 1k–4k buckets) — and
in-bucket adherence is approximate. Tier file sizes (96–256 px) are NOT
requestable. Therefore:

- §3 file sizes are DELIVERY targets produced by a deterministic NORMALIZE STEP
  (generate big → downscale to the tier size, alpha-preserving), never generator
  requests. Any model at any output size feeds the same pipeline.
- Generation prompts: ALWAYS the square bucket (1024×1024) for sprites — the
  landscape/portrait buckets risk subject cropping; transparency + ≤80% fill per §3.
- Verify the alpha channel is REAL transparency (model-dependent quirk); §8.4 is
  the gate.
- Optional pre-batch check: a script asserts every delivered file's dimensions
  equal its tier size before a B35 batch ships.

Weapon **effects** recommendation: keep cones/pulses/waves **procedural for now**
(they are already juicy, data-colored, and scale with weapon level); convert only
the discrete projectile sprites (32×32) first. Revisit after the character pass.

### §3.1 Hero scale ladder — base 32×32, scalable to 64/128 (HoloCure baseline, not locked)

**Baseline reference: HoloCure** — small native pixel sprites, chibi proportions,
strong dark outline, crisp-upscaled on a colorful field, character small on screen
with big readability. NOT locked: every choice below is a knob, not a commitment.

**Two generation workflows** (both stay available; pick per style after testing):
- **Pixel-native (true HoloCure model):** author the hero AT 32×32 real pixels.
  The file never grows — the ladder is a DRAW-TIME decision. Upscale with
  nearest-neighbor (`imageSmoothingEnabled = false`): drawn 32 = crisp ×2, drawn
  40 = crisp ×1.25 (uneven but workable), drawn 64 = crisp ×4. Generating
  "larger" pixel art is unnecessary; 32 native pixels scale cleanly forever.
- **Master-downscale (smooth/painted styles):** generate ONE 128×128 master,
  derive 64 and 32 by downscale (with smoothing ON). The ladder is a FILE-size
  decision. (Downscaling smooth art to 32 gives mush; that's why this workflow
  pairs with smoothing enabled and the higher tiers.)

**The three drawn sizes (world px, hitbox 20×20 unchanged at every step):**
| Step | Drawn Ø | Feel |
|---|---|---|
| BASE | **20** | exactly today's footprint — zero visual-geometry delta |
| MID | **32** | HoloCure-like presence (pixel-native crisp ×2) |
| HIGH | **40** | chunky hero, most screen presence |

**Implementation contract (makes the ladder free):**
- Drawn Ø = `2 × stats.size × (visual.artScale || HERO_SCALE)` — a global
  `HERO_SCALE` knob (1.0 / 1.6 / 2.0) plus optional per-entity
  `visual.artScale` override. Enemy tiers get the same knob later.
- One smoothing flag per draw batch: `false` = crisp pixels (pixel-native art),
  `true` = smooth (master-downscale art). Decided per style, applied globally,
  one line to flip during art exploration.
- File swap 32→64→128 requires ZERO code changes under either workflow.

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
6. **Hero ladder test:** the same character generated (a) as native 32×32 pixel
   art and (b) as a 128×128 master — compare crisp-upscale vs downscale at
   drawn 20/32/40 on the dark field, smoothing off vs on. This decides the
   workflow (and is the core HoloCure-baseline vs smoother-styles question).
7. **Normalize step (§3.0):** a 1024×1024 generation normalized to a tier file
   (e.g. M 128) at its drawn Ø on the #1A1A2E field — must stay readable, and the
   delivered file's dimensions must equal the tier size exactly.
8. **Frame-independence (dynamic-shape resolution):** one deliberately non-square
   source (e.g. 1536×1024) pushed through normalize proves the pipeline is
   generator-agnostic — the runtime drawImage path accepts ANY source dimensions
   (§2); delivery frames stay square (§3). Monster shape lives in the silhouette,
   never the frame.

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

1. Hero style direction: **pixel-native 32×32 (HoloCure baseline, crisp
   upscale)** vs master-downscale smooth — run test §8.6 and pick. *(Ladder
   works either way; this is a style choice, not a pipeline choice.)*
2. Hero drawn size to START at: **20 (today's footprint) / 32 (HoloCure feel,
   recommended) / 40** — one knob, changeable anytime without regenerating art.
3. Art direction: gothic graveyard per §3 palette — or do you have reference images?
4. B35a scope (3 entities first) — ok?
5. Animation: Option A first + sheets for player/bosses if tools pass §8.3 — or full Option B commitment now?
6. RESOLVED (2026-09-30, owner + Claude review): **frames stay square; shapes are
   silhouettes.** "Dynamic sprite dimensions" is already true where it matters — the
   runtime accepts any source file dimensions (§2 drawImage path) and the normalize
   step accepts any generator output (§3.0) — while AUTHORING frames stay 1:1 for
   anchor safety, sheet compatibility, and testability. Non-uniform presentation, if
   ever needed, is a per-entity `artScaleX/Y` knob built when a real monster needs
   it (YAGNI until then). Generator direction: owner-driven ChatGPT image models —
   direct generation for style exploration; API generation for B35 batches (img2img /
   style-reference for roster consistency; OpenAI image API native-transparent or
   Leonardo AI, both Node-ready).
