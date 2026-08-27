# SVG Asset Catalog — Modularity Engine

## Overview

All visual assets for the game are SVG files. They fall into 5 categories:

| Category | Count | Location |
|---|---|---|
| NPC Portraits | 7 | `public/assets/npcs/` |
| Enemy Sprites | 4 | `public/assets/` |
| Weapon/Projectile | 3 | `public/assets/` |
| Pickups/Items | 5 | `public/assets/` |
| Environment/UI | 4 | `public/assets/` |
| **Total** | **23** | |

---

## 1. NPC Portraits (`public/assets/npcs/`)

Used in: Town screen NPC cards, dialogue overlay, companion slots, party menu

| File | NPC ID | ViewBox | Used In |
|---|---|---|---|
| `npc_old_man.svg` | `old_man` | 120×120 | Elder Rowan — town elder, dialogue |
| `npc_cute_girl.svg` | `cute_girl` | 120×120 | Lina — baker NPC, dialogue |
| `npc_dog.svg` | `dog` | 100×100 | Dog companion — portrait, companion slot |
| `npc_blacksmith.svg` | `blacksmith` | 120×120 | Garret — Trade District blacksmith |
| `npc_tavern_keeper.svg` | `tavern_keeper` | 120×120 | Mira — Trade District tavern keeper |
| `npc_worried_refugee.svg` | `worried_refugee` | 120×120 | Refugee NPC — residential area |
| `npc_weather_watcher.svg` | `weather_watcher` | 120×120 | Sarah — residential NPC with monocle |

**Usage pattern:**
```javascript
const svgHtml = SVG_PORTRAITS[npc.id] || '';
const styled = svgHtml.replace('<svg ', '<svg style="width:80px;height:80px;border-radius:50%;" ');
```

---

## 2. Enemy Sprites (`public/assets/`)

Used in: Combat canvas rendering via `Renderer.drawEntity()`

| File | Entity ID | ViewBox | Notes |
|---|---|---|---|
| `zombie.svg` | `zombie` | 16×16 | Basic melee enemy |
| `skeleton.svg` | `skeleton` | 16×16 | Ranged skeleton |
| `ghost.svg` | `ghost` | 16×16 | Phase-through enemy |
| `caster.svg` | `caster` | 16×16 | Magic-spawning enemy |
| `bat.svg` | `bat` | 16×16 | Fast flying enemy |

---

## 3. Weapon & Projectile Sprites (`public/assets/`)

Used in: Combat canvas rendering via `WeaponSystem` and `Renderer`

| File | Weapon ID | ViewBox | Notes |
|---|---|---|---|
| `w1_projectile.svg` | `w1_projectile` | — | Arrow projectile sprite |
| `w2_orbit.svg` | `w2_orbit` | — | Orbiting ring projectile |
| `w3_pulse.svg` | `weapon_area_pulse` | — | Area pulse wave effect |
| `boss.svg` | boss entity | 56×56 | Boss enemy sprite (large) |

---

## 4. Pickup & Item Sprites (`public/assets/`)

Used in: Combat canvas rendering via `PickupSystem` and `Renderer`

| File | Pickup ID | ViewBox | Notes |
|---|---|---|---|
| `xp_gem_small.svg` | `xp_small` | — | Small XP gem |
| `xp_gem_large.svg` | `xp_large` | — | Large XP gem |
| `gold_coin.svg` | `gold` | — | Gold coin pickup |
| `magnet.svg` | `magnet` | — | Magnet power-up |
| `screen_wipe.svg` | `screen_wipe` | — | Screen wipe power-up |
| `weapon_levelup.svg` | `weapon_levelup` | — | Weapon upgrade drop |

---

## 5. Environment & UI (`public/assets/`)

Used in: Town screen backgrounds, title screen, combat backgrounds

| File | Usage | ViewBox | Notes |
|---|---|---|---|
| `title_background.svg` | Title screen bg | — | Night sky fantasy scene |
| `town_refugee_camp.svg` | Town background (Tier 1) | — | Campfire + tents |
| `town_wooden_shacks.svg` | Town background (Tier 2) | — | Upgraded camp |
| `dog_combat.svg` | Dog combat sprite | — | In-game companion sprite |

---

## 6. Boss Intro Portrait

The boss intro sequence currently uses the boss SVG (`boss.svg`) rendered via canvas.
A dedicated boss portrait for the intro overlay has NOT been created yet.

**Recommended addition:**
- `assets/boss_intro_portrait.svg` — Larger, more detailed portrait for the intro sequence
- ViewBox: 200×200 or 256×256
- Should show the boss's face/upper body in dramatic style

---

## AI Generation Prompts

When generating new SVG assets, use these prompts to maintain visual consistency:

### NPC Portrait Template
```
Create an SVG portrait of [NPC NAME] for a dark fantasy game.
Style: Anime-inspired, detailed face portrait inside a circular frame.
ViewBox: 0 0 120 120
Background: Dark circle (#1A1A2E) with subtle border (#333355).
Character should have: [DESCRIBE FEATURES]
Color palette: Dark fantasy tones, muted colors, occasional gold accents.
Include: Linear gradients for skin/hair, detailed eyes with highlights, subtle blush/wrinkles.
No text. No external dependencies.
```

### Enemy Sprite Template
```
Create an SVG sprite of [ENEMY NAME] for a bullet-heaven game.
Style: Pixel-art inspired, simple but readable at 16×16.
ViewBox: 0 0 16 16
Character: [DESCRIBE ENEMY]
Color palette: Dark fantasy, use 3-5 colors max.
No background (transparent). No text.
```

### Weapon Projectile Template
```
Create an SVG projectile for [WEAPON NAME].
Style: Simple, readable at small sizes.
ViewBox: 0 0 16 16 (or appropriate size)
Shape: [DESCRIBE PROJECTILE]
Color: [DESCRIBE COLOR]
No background. No text.
```

### Pickup/Item Template
```
Create an SVG pickup icon for [ITEM NAME] in a dark fantasy game.
Style: Clean, iconic, readable at small sizes.
ViewBox: 0 0 16 16
Icon: [DESCRIBE ITEM]
Color: [DESCRIBE COLOR] with subtle glow effect.
No background. No text.
```

### Environment Background Template
```
Create an SVG background for [LOCATION NAME].
Style: Dark fantasy, atmospheric, suitable for a game background.
ViewBox: 0 0 400 600 (portrait orientation for mobile)
Scene: [DESCRIBE SCENE]
Color palette: Dark blues, purples, oranges for fire/light sources.
No characters. Atmospheric only.
```

---

## File Naming Convention

```
npc_[character_id].svg          — NPC portraits
[enemy_id].svg                  — Enemy sprites
w[weapon_number]_[name].svg     — Weapon projectiles
[pickup_id].svg                 — Pickup items
[town|title|stage]_[name].svg   — Environment backgrounds
boss.svg                        — Boss enemy sprite
dog_combat.svg                  — Companion combat sprite
```

---

## Integration Notes

1. **Standalone files** exist in `public/assets/` for Godot port or external use
2. **Embedded strings** in `SVG_PORTRAITS` object in `game2.html` for `file://` compatibility
3. When splitting to multi-file, replace embedded strings with `<img src="assets/npcs/xxx.svg">`
4. For Godot port: import SVGs as `Texture2D` resources
5. All SVGs use inline styles (no CSS classes) for portability
6. Gradient IDs must be unique per SVG when multiple are rendered on same page
