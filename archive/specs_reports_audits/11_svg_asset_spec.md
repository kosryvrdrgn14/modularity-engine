# Modularity Engine — SVG Asset Specification

> **Game Version:** v0.2.0+  
> **Purpose:** Define exact dimensions, colors, and design prompts for replacing all primitive canvas shapes (squares, circles, diamonds, triangles, stars) with polished SVG game assets.  
> **Canvas Context:** 2D top-down, dark background `#0A0A1A`, grid lines `#16213E`, entities rendered at integer coordinates with `size` defining the radius/half-width.  
> **Coordinate System:** All sizes below are in **canvas pixels**. SVGs should be designed at 2× resolution and downscaled for crisp rendering.  
> **Export Format:** SVG files, 2× canvas-pixel dimensions (e.g. a 20px entity = 40×40 SVG). Use viewBox for scalability.

---

## Table of Contents

1. [Player Character](#1-player-character)
2. [Enemies](#2-enemies)
3. [Boss](#3-boss)
4. [Pickups & Power-Ups](#4-pickups--power-ups)
5. [Weapon 1 — Projectile](#5-weapon-1--projectile)
6. [Weapon 2 — Orbit](#6-weapon-2--orbit)
7. [Weapon 3 — Area Pulse](#7-weapon-3--area-pulse)
8. [VFX — Screen Wipe Flash](#8-vfx--screen-wipe-flash)
9. [VFX — Level-Up Burst](#9-vfx--level-up-burst)
10. [UI Elements](#10-ui-elements)

---

## 1. Player Character

**Current:** Square `#FFD700`, size=24 (half-width=24, so 48×48 fill rect)  
**Hitbox:** 20×20 (width=20, height=20, size = width/2 = 10)  
**SVG Canvas Size:** 48×48  
**viewBox:** `0 0 48 48`

| Property | Value |
|---|---|
| Shape | Square base with character detail |
| Primary Color | `#FFD700` (gold) |
| Secondary Color | `#B8860B` (dark gold shadow) |
| Accent Color | `#FFF8DC` (cornsilk highlight) |
| Size | 48×48 SVG (renders at 24px half-width on canvas) |
| iFrame blink | 50% alpha toggle (no SVG change needed) |

**SVG Prompt:**
> Create a top-down pixel-art style game character SVG, 48×48 viewBox. A heroic warrior seen from above wearing golden armor. The character should be a compact square-ish silhouette (matching a 48×48 bounding box) with a small cape or scarf detail trailing behind. Use gold (#FFD700) as the primary color with dark gold (#B8860B) shadows and cornsilk (#FFF8DC) highlights. Clean edges, no anti-aliasing artifacts, transparent background. The character should read clearly as a "player avatar" at small sizes. Include subtle directional indicator (e.g. visor or shield edge) facing upward.

---

## 2. Enemies

### 2a. Zombie

**Current:** Square `#3B8A30`, size=10 (20×20 fill rect)  
**SVG Canvas Size:** 20×20  
**viewBox:** `0 0 20 20`

| Property | Value |
|---|---|
| Shape | Squat shambling figure, square-ish |
| Primary Color | `#3B8A30` (forest green) |
| Secondary Color | `#2D6A25` (dark green shadow) |
| Highlight | `#5AA84F` (bright green) |
| Size | 20×20 SVG |

**SVG Prompt:**
> Create a top-down zombie game enemy SVG, 20×20 viewBox. A small shambling undead figure seen from above. Square-ish body shape with slightly ragged edges to suggest decay. Forest green (#3B8A30) primary with darker green (#2D6A25) shadows. Two tiny raised arms or reaching claws. Small glowing eyes as a highlight detail. Should be instantly readable as a "zombie" at very small scale. Transparent background, clean pixel-art aesthetic.

---

### 2b. Bat

**Current:** Square `#6B3FA0`, size=8 (16×16 fill rect)  
**SVG Canvas Size:** 16×16  
**viewBox:** `0 0 16 16`

| Property | Value |
|---|---|
| Shape | Small winged creature |
| Primary Color | `#6B3FA0` (purple) |
| Secondary Color | `#4A2D70` (dark purple) |
| Highlight | `#9B6FD0` (light purple) |
| Size | 16×16 SVG |

**SVG Prompt:**
> Create a top-down bat enemy SVG, 16×16 viewBox. A tiny flying creature seen from above with spread wings in a V-shape. Purple (#6B3FA0) body with darker purple (#4A2D70) wing shadows. Small pink/red eyes. Wings should be angular and bat-like. The smallest enemy in the game — must be readable at tiny scale. Transparent background, pixel-art style.

---

### 2c. Skeleton

**Current:** Square `#C0392B`, size=12 (24×24 fill rect)  
**SVG Canvas Size:** 24×24  
**viewBox:** `0 0 24 24`

| Property | Value |
|---|---|
| Shape | Bony humanoid figure |
| Primary Color | `#C0392B` (red — represents bloodied bones) |
| Secondary Color | `#922B21` (dark red shadow) |
| Bone Accent | `#F5E6CC` (bone white for skull detail) |
| Size | 24×24 SVG |

**SVG Prompt:**
> Create a top-down skeleton warrior enemy SVG, 24×24 viewBox. A skeletal figure seen from above with a visible skull and bony shoulders. Red (#C0392B) represents the blood-soaked bones theme. Include a small weapon silhouette (sword or club) extending from one side. Bone-white (#F5E6CC) skull detail on the head. Should look menacing but compact. Transparent background, dark fantasy pixel-art style.

---

### 2d. Ghost

**Current:** Square `#8E44AD`, size=12 (24×24 fill rect)  
**SVG Canvas Size:** 24×24  
**viewBox:** `0 0 24 24`

| Property | Value |
|---|---|
| Shape | Ethereal floating figure |
| Primary Color | `#8E44AD` (purple) |
| Secondary Color | `#6C3483` (dark purple, semi-transparent edges) |
| Glow | `#D2B4DE` (lavender glow/aura) |
| Size | 24×24 SVG |

**SVG Prompt:**
> Create a top-down ghost enemy SVG, 24×24 viewBox. An ethereal translucent spirit seen from above with a flowing wispy tail. Purple (#8E44AD) body fading to transparent at the edges. Two glowing white/lavender (#D2B4DE) eyes. The bottom should taper into a ghostly trail suggesting floaty movement. Semi-transparent feel — use opacity gradients. Transparent background, spooky but not terrifying.

---

### 2e. Caster

**Current:** Square `#2E86C1`, size=13 (26×26 fill rect)  
**SVG Canvas Size:** 26×26  
**viewBox:** `0 0 26 26`

| Property | Value |
|---|---|
| Shape | Robed spellcaster |
| Primary Color | `#2E86C1` (blue) |
| Secondary Color | `#1B4F72` (dark blue robe) |
| Accent | `#AED6F1` (light blue magic glow) |
| Size | 26×26 SVG |

**SVG Prompt:**
> Create a top-down mage/caster enemy SVG, 26×26 viewBox. A robed spellcaster seen from above with a circular cloak spread and a staff or orb. Blue (#2E86C1) robe with dark blue (#1B4F72) shadows. A small glowing magic orb or rune in the center or at the tip of a staff in light blue (#AED6F1). Should look like a ranged magic-user. Transparent background, dark fantasy style.

---

## 3. Boss

### The Gravekeeper

**Current:** Square `#4A0000`, size=28 (56×56 fill rect)  
**SVG Canvas Size:** 56×56  
**viewBox:** `0 0 56 56`

| Property | Value |
|---|---|
| Shape | Large imposing undead figure |
| Primary Color | `#4A0000` (dark blood red) |
| Secondary Color | `#1A0000` (near-black shadow) |
| Accent | `#FF1744` (bright red glowing eyes/runes) |
| Bone Accent | `#8B0000` (dark crimson bone details) |
| Size | 56×56 SVG |

**SVG Prompt:**
> Create a top-down boss enemy SVG, 56×56 viewBox. An imposing undead gravekeeper seen from above — the largest enemy in the game. Massive square-ish armored shoulders in dark blood red (#4A0000) with near-black (#1A0000) shadow recesses. A central skull or death mask with glowing red (#FF1744) eyes. Large weapon (scythe or gravestone hammer) extending to one side. Dark crimson (#8B0000) bone armor details. Should radiate danger and feel significantly larger/more detailed than normal enemies. Transparent background, dark gothic pixel-art style.

**Phase 2 Visual Enhancement:** The boss should have a secondary state visual — consider adding glowing rune cracks or an aura effect as a separate SVG layer that activates at 50% HP.

---

## 4. Pickups & Power-Ups

### 4a. XP Gem (Small)

**Current:** Diamond `#4FC3F7`, size=8 (16×16 bounding)  
**SVG Canvas Size:** 16×16  
**viewBox:** `0 0 16 16`

| Property | Value |
|---|---|
| Shape | Diamond/gem |
| Primary Color | `#4FC3F7` (light blue) |
| Highlight | `#B3E5FC` (white-blue sparkle) |
| Size | 16×16 SVG |

**SVG Prompt:**
> Create a small top-down XP gem SVG, 16×16 viewBox. A tiny diamond-shaped crystal gem in light blue (#4FC3F7) with a white-blue (#B3E5FC) highlight sparkle on one facet. Clean geometric diamond shape. Should look like a collectible resource. Transparent background, bright and readable at tiny scale.

---

### 4b. XP Gem (Large)

**Current:** Diamond `#81D4FA`, size=14 (28×28 bounding)  
**SVG Canvas Size:** 28×28  
**viewBox:** `0 0 28 28`

| Property | Value |
|---|---|
| Shape | Larger diamond/gem |
| Primary Color | `#81D4FA` (bright light blue) |
| Highlight | `#E1F5FE` (white sparkle) |
| Shadow | `#29B6F6` (deeper blue edge) |
| Size | 28×28 SVG |

**SVG Prompt:**
> Create a large top-down XP gem SVG, 28×28 viewBox. A bigger version of the small XP gem — a diamond-shaped crystal in bright light blue (#81D4FA) with deeper blue (#29B6F6) edge facets and a white (#E1F5FE) sparkle highlight. Should look more valuable than the small gem. Multiple facet lines for a richer crystal appearance. Transparent background.

---

### 4c. Gold Coin

**Current:** Circle `#FFD700`, size=10 (20×20 bounding)  
**SVG Canvas Size:** 20×20  
**viewBox:** `0 0 20 20`

| Property | Value |
|---|---|
| Shape | Circular coin |
| Primary Color | `#FFD700` (gold) |
| Shadow | `#B8860B` (dark gold edge) |
| Highlight | `#FFF8DC` (cornsilk shine) |
| Size | 20×20 SVG |

**SVG Prompt:**
> Create a top-down gold coin SVG, 20×20 viewBox. A circular gold coin seen from above with a slight 3D bevel effect. Gold (#FFD700) primary with dark gold (#B8860B) rim shadow and a small cornsilk (#FFF8DC) highlight arc for shine. A subtle "$" or coin symbol in the center. Should look like classic game gold. Transparent background.

---

### 4d. Screen Wipe Power-Up

**Current:** Star `#00E676`, size=16 (32×32 bounding)  
**SVG Canvas Size:** 32×32  
**viewBox:** `0 0 32 32`

| Property | Value |
|---|---|
| Shape | 5-pointed star (nuclear/radiation style) |
| Primary Color | `#00E676` (green) |
| Glow | `#69F0AE` (bright green aura) |
| Size | 32×32 SVG |

**SVG Prompt:**
> Create a top-down screen wipe power-up SVG, 32×32 viewBox. A 5-pointed star in bright green (#00E676) with a bright green (#69F0AE) glow aura radiating outward. Think "nuke" or "screen clear" energy. Sharp star points with a slightly pulsing/brighter center. Should feel powerful and rare. Transparent background, clean vector style.

---

### 4e. Magnet Power-Up

**Current:** Circle `#FF4081`, size=14 (28×28 bounding)  
**SVG Canvas Size:** 28×28  
**viewBox:** `0 0 28 28`

| Property | Value |
|---|---|
| Shape | U-shaped magnet or magnetic orb |
| Primary Color | `#FF4081` (pink/red) |
| Secondary | `#F50057` (darker magenta) |
| Glow | `#FF80AB` (light pink pulse) |
| Size | 28×28 SVG |

**SVG Prompt:**
> Create a top-down magnet power-up SVG, 28×28 viewBox. A magnetic attractor icon — either a U-shaped magnet or a pulsing orb with visible magnetic field lines radiating outward. Pink/magenta (#FF4081) primary with darker (#F50057) body and light pink (#FF80AB) energy arcs or field lines. Should visually communicate "attracts items". Transparent background.

---

### 4f. Weapon Level-Up Power-Up

**Current:** Triangle `#FF9100`, size=16 (32×32 bounding)  
**SVG Canvas Size:** 32×32  
**viewBox:** `0 0 32 32`

| Property | Value |
|---|---|
| Shape | Upward triangle / arrow-up icon |
| Primary Color | `#FF9100` (orange) |
| Secondary | `#E65100` (dark orange shadow) |
| Highlight | `#FFAB40` (bright orange glow) |
| Size | 32×32 SVG |

**SVG Prompt:**
> Create a top-down weapon level-up power-up SVG, 32×32 viewBox. An upward-pointing triangle or arrow-up icon in bright orange (#FF9100) with darker orange (#E65100) shadow edges and bright orange (#FFAB40) glow accent. Should communicate "upgrade" or "level up" — think of an upward chevron or wing shape. Maybe with a small weapon silhouette (sword/crosshair) inside. Transparent background.

---

## 5. Weapon 1 — Projectile

### Projectile Bullet

**Current:** Square `#FFD700`, size=4 (8×8 fill rect)  
**SVG Canvas Size:** 8×8  
**viewBox:** `0 0 8 8`

| Property | Value |
|---|---|
| Shape | Small fast-moving projectile |
| Primary Color | `#FFD700` (gold) |
| Glow | `#FFF8DC` (white-gold core) |
| Trail | `#FFA000` (amber, optional tail effect) |
| Size | 8×8 SVG |

**SVG Prompt:**
> Create a tiny projectile bullet SVG, 8×8 viewBox. A small fast-moving golden (#FFD700) projectile — either a square-ish energy bolt or a small diamond shape. White-gold (#FFF8DC) bright center/core for heat. Optional: a very short amber (#FFA000) tail or glow behind it. Must be readable at 8px. The most-fired object in the game — should feel punchy. Transparent background.

**Power Spike Lv4 (Pierce):** Consider a slightly elongated/piercing variant.  
**Power Spike Lv7 (Split):** Consider a cluster of 3 smaller projectiles.

---

## 6. Weapon 2 — Orbit

### Orbiting Sphere

**Current:** Circle `#4FC3F7`, size=6 (12×12 bounding)  
**SVG Canvas Size:** 12×12  
**viewBox:** `0 0 12 12`

| Property | Value |
|---|---|
| Shape | Small glowing orb |
| Primary Color | `#4FC3F7` (light blue) |
| Core | `#E1F5FE` (white-blue hot center) |
| Outer Glow | `#0288D1` (blue energy ring) |
| Size | 12×12 SVG |

**SVG Prompt:**
> Create a small orbiting sphere weapon SVG, 12×12 viewBox. A tiny glowing energy orb in light blue (#4FC3F7) with a hot white-blue (#E1F5FE) center and a darker blue (#0288D1) outer ring/glow. Should feel like a floating energy ball that orbits the player. Smooth circular shape with a soft glow aura. Transparent background.

**Power Spike Lv4 (Expanded Orbit):** Orbs get larger orbit radius — consider 14×14 variant with stronger glow.  
**Power Spike Lv7 (Afterimage):** Consider a slightly larger 16×16 variant with trailing effect.

---

## 7. Weapon 3 — Area Pulse

### Pulse Shockwave Ring

**Current:** Canvas-drawn expanding ring stroke, `#FF9100`, lineWidth=5, maxAge=0.5s  
**SVG Canvas Size:** Dynamic (scales from 0 to pulseRadius)  
**Recommended SVG:** Ring SVG at max radius, scaled via CSS/canvas transform

| Property | Value |
|---|---|
| Shape | Expanding ring/shockwave |
| Primary Color | `#FF9100` (orange) |
| Fill | `#FF9100` at 25% opacity (shockwave body) |
| Stroke | `#FF9100` at 70% opacity, 5px width |
| Max Radius | 80–160px (level-dependent) |
| Duration | 0.5s expand + fade |

**SVG Prompt:**
> Create a circular shockwave ring SVG, viewBox `0 0 320 320` (for max radius 160). A radial shockwave effect — concentric orange (#FF9100) rings expanding outward from center. The outer edge is a thick bright stroke (70% opacity), inner area is a soft semi-transparent fill (25% opacity). Should look like a ground pound or energy burst emanating from the player. Use radial gradient from transparent center to opaque ring edge. The SVG will be scaled from 0 to full size over 0.5s. Transparent background.

**Power Spike Lv4:** Double pulse (same SVG, fired twice with 250ms delay).  
**Power Spike Lv7:** Triple pulse with stun — consider adding a brief white flash variant.

---

## 8. VFX — Screen Wipe Flash

**Current:** Full-screen white flash overlay (handled in Renderer)  
**SVG Canvas Size:** Full-screen  
**Recommended:** CSS/canvas effect, not an SVG — but a radial gradient SVG could be used for the expanding ring

| Property | Value |
|---|---|
| Effect | Full-screen white flash fading to transparent |
| Duration | ~0.3s |
| Color | White `#FFFFFF` at 60% → 0% opacity |

**No SVG needed** — this is a canvas rect fill. Keep as-is.

---

## 9. VFX — Level-Up Burst

**Current:** Golden particles burst around player  
**SVG Canvas Size:** N/A (particle effect)

**No SVG needed** — this is a particle system. Keep as-is.

---

## 10. UI Elements

### HP Bar

**Current:** Canvas rect, 200×16, background `#333`, fill `#EF4444` (or `#FF0000` when <25%), border `#FFF`

| Property | Value |
|---|---|
| Size | 200×16 |
| Background | `#333333` |
| Fill (normal) | `#EF4444` |
| Fill (critical) | `#FF0000` |
| Border | `#FFFFFF`, 1px |

### XP Bar

**Current:** Canvas rect, full-width × 20, background `#333`, fill `#4FC3F7`

| Property | Value |
|---|---|
| Size | Full viewport width × 20 |
| Background | `#333333` |
| Fill | `#4FC3F7` |

### Level Badge

**Current:** Circle, `#3B82F6`, radius 16 (32×32), white text centered

| Property | Value |
|---|---|
| Size | 32×32 circle |
| Background | `#3B82F6` |
| Text | White, 12px monospace |

### Boss Health Bar

**Current:** Canvas rect, 240×14, centered top, background `#333`, fill `#C0392B`

| Property | Value |
|---|---|
| Size | 240×14 |
| Background | `#333333` |
| Fill | `#C0392B` (or `#FF0000` when <25%) |
| Position | Centered, 40px from top |

---

## Color Palette Reference

| Name | Hex | Usage |
|---|---|---|
| Dark Background | `#0A0A1A` | Game canvas bg |
| Grid Lines | `#16213E` | Background grid |
| Gold (Player) | `#FFD700` | Player, projectiles, gold coins |
| Dark Gold | `#B8860B` | Player shadows, coin edges |
| Light Blue (XP) | `#4FC3F7` | XP gems, orbit weapon, XP bar |
| Bright Blue | `#3B82F6` | Level badge, UI accent |
| Green (Zombie) | `#3B8A30` | Zombie enemy |
| Purple (Bat) | `#6B3FA0` | Bat enemy |
| Red (Skeleton) | `#C0392B` | Skeleton, HP bar, boss bar |
| Light Purple (Ghost) | `#8E44AD` | Ghost enemy |
| Blue (Caster) | `#2E86C1` | Caster enemy |
| Dark Red (Boss) | `#4A0000` | Gravekeeper boss |
| Bright Red (Boss Eyes) | `#FF1744` | Boss glow accents |
| Orange (W3/Weapon Up) | `#FF9100` | Area pulse, weapon level-up |
| Pink (Magnet) | `#FF4081` | Magnet power-up |
| Green (Screen Wipe) | `#00E676` | Screen wipe power-up |
| White | `#FFFFFF` | UI text, borders, critical flash |

---

## Asset Priority Order

For implementation, create SVGs in this order:

1. **Player Character** — most visible entity
2. **Zombie** — first enemy encountered, highest spawn weight
3. **Gold Coin** — most collected item
4. **XP Gem (Small)** — second most collected
5. **W1 Projectile** — most-fired weapon effect
6. **W2 Orbit Sphere** — active weapon visual
7. **Bat** — second enemy, fast and small
8. **Skeleton** — tanky enemy, distinct color
9. **Ghost** — semi-transparent, needs special handling
10. **Caster** — ranged enemy
11. **Boss (Gravekeeper)** — rare but high-impact
12. **W3 Pulse Ring** — area effect
13. **Screen Wipe Star** — rare power-up
14. **Magnet** — rare power-up
15. **Weapon Level-Up** — rare power-up
16. **XP Gem (Large)** — boss drop only

---

## Implementation Notes

- **Loading:** SVGs should be preloaded during the loading screen phase and cached as `Image` objects.
- **Rendering:** Replace `ctx.fillRect` / `ctx.arc` calls in `Renderer._drawEntity()` with `ctx.drawImage(svgImage, x - halfW, y - halfH, w, h)`.
- **iFrame blink:** Keep the existing `globalAlpha` toggle for hit invulnerability — it works on `drawImage` too.
- **Scaling:** All SVGs are designed at 2× for crisp rendering on high-DPI. Use `drawImage` with the entity's `size * 2` for width/height.
- **Rotation:** Some entities (projectiles, orbiters) may benefit from rotation. Consider adding a `rotation` property to entities and using `ctx.rotate()` before drawing.
- **Pulse Effect:** The area pulse shockwave should remain canvas-drawn (expanding ring animation) rather than an SVG, as it scales dynamically.
- **Fallback:** If an SVG fails to load, fall back to the existing primitive shape rendering (color + shape type are already on each entity's `visual` property).
