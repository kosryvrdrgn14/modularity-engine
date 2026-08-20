# Modularity Engine — UI & HUD Specification

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** `vs_plan.md` Prompt 8 (layout + screens), `vs_colors.md` Damage Numbers + Visual Hierarchy Rules, `01_engine_architecture.md` (end states), `07_leveling_system_spec.md` (level-up screen), `04_enemies_spec.md` (boss health bar)

---

## Table of Contents

1. [Design Theme](#1-design-theme)
2. [In-Game HUD](#2-in-game-hud)
3. [Level-Up Screen](#3-level-up-screen)
4. [End Screens](#4-end-screens)
5. [Pause Menu](#5-pause-menu)
6. [Mini UI Elements](#6-mini-ui-elements)
7. [Responsive Layout](#7-responsive-layout)
8. [Draw Order](#8-draw-order)
9. [Cross-Reference Summary](#9-cross-reference-summary)

---

## 1. Design Theme

| Property | Value |
|---|---|
| Style | Modern, polished |
| Panels | Dark semi-transparent (`#1A1A2A` at 85–90% opacity) |
| Text | Crisp white (`#FFFFFF`) |
| Accent | Electric blue (`#3B82F6`) |
| Font | Clean sans-serif (system font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) |
| Borders | Rounded corners (8px), soft shadows |
| Animations | Smooth transitions (0.2–0.3s), subtle easing |

---

## 2. In-Game HUD

Always visible during gameplay. Portrait-friendly, works on landscape too.

### Layout

```
+------------------------------------------------------+
|  [HP BAR]                        [LEVEL] [GOLD ICON] |
|  ████████░░░░                    Lv.5    🪙 342       |
|                                                       |
|                    GAME AREA                          |
|                                                       |
|                                                       |
|  [EXP BAR - full width bottom]                        |
|  ████████████████████░░░░░░░  Lv.5                    |
|                                                       |
|  [WEAPON PANEL - bottom left]                         |
|  🔱 Lv.3  🔥 Lv.1  ⚡ Lv.7                           |
+------------------------------------------------------+
```

### Element Specs

#### 1. Health Bar

| Property | Value |
|---|---|
| Position | Top-left, 16px margin from edges |
| Size | 200×16 px |
| Background | `#1A1A2A` (dark panel) |
| Fill | `#EF4444` (red) |
| Label | "HP" text, 10px, left-aligned inside bar |
| Numeric | "72/100" text, 10px, right-aligned inside bar |
| Animation | Smooth fill transition on damage (0.3s ease-out) |
| Low HP | Fill color shifts to `#DC2626` (brighter red) below 25% HP |

#### 2. Level Display

| Property | Value |
|---|---|
| Position | Top-center-right (to the right of timer) |
| Size | 32×32 px circle |
| Background | `#3B82F6` (electric blue) |
| Text | Level number, 14px, white, centered |
| Animation | Scale pulse to 1.2× on level up (0.3s) |

#### 3. Gold Display

| Property | Value |
|---|---|
| Position | Top-right, 16px margin from edges |
| Icon | Coin circle: `#FFD700`, 12px diameter |
| Text | Numeric value, 14px, white |
| Animation | "+3g" floating text on gold pickup (see §5 Mini UI Elements). Main counter ticks up smoothly over 0.2s. |

#### 4. EXP Bar

| Property | Value |
|---|---|
| Position | Bottom edge, full width, 16px height |
| Background | `#1A1A2A` (dark panel) |
| Fill | `#4FC3F7` (EXP Blue) |
| Label | "Lv.5 — 120/150" text, 10px, centered |
| Animation | Smooth fill transition on XP gain (0.2s ease-out) |

#### 5. Weapon Panel

| Property | Value |
|---|---|
| Position | Bottom-left corner, above EXP bar |
| Layout | Horizontal row of weapon icons |
| Each Weapon | Icon (24×24 px) + level number (10px text below) |
| Icons | W1: square `#FFD700`, W2: circle `#FF8C00`, W3: triangle `#FFF4B0` |
| Max Level | Gold border (`#FFD700`, 2px) on weapons at Level 7 |
| Fire Highlight | Brief white flash (0.1s) when weapon fires |
| Upgrade Highlight | Scale pulse to 1.3× + gold flash (0.3s) on upgrade |

#### 6. Timer

| Property | Value |
|---|---|
| Position | Top-center |
| Format | "MM:SS" (elapsed time) |
| Text | 16px, white, monospace |
| Boss Warning | At 3:50, timer text flashes red every 0.5s until boss spawns |

#### 7. Pause Button

| Property | Value |
|---|---|
| Position | Top-right corner, above gold display |
| Size | 32×32 px |
| Icon | "||" (two vertical bars), 16px, white |
| Opacity | 60% (increases to 100% on hover) |
| Touch Target | 44×44 px (extends beyond visible icon for easy tapping) |

#### 8. Boss Health Bar

| Property | Value |
|---|---|
| Position | Top of screen, centered, 8px below timer |
| Size | 400×20 px |
| Background | `#1A1A2A` (dark panel) |
| Fill | `#EF4444` (red) |
| Label | "The Gravekeeper" text, 12px, white, centered above bar |
| Phase 2 | Fill shifts to `#DC2626` (brighter red) at 50% HP. Border pulses (0.5s cycle). |
| Appearance | Fades in over 0.5s when boss spawns |
| Disappearance | Fades out over 0.3s when boss dies |

---

## 3. Level-Up Screen

See `07_leveling_system_spec.md` §9 for full visual design. This section covers HUD integration.

### Overlay

| Property | Value |
|---|---|
| Background | `#000000` at 60% opacity (dark overlay) |
| Game State | Fully paused |
| Z-Order | Above all gameplay elements |

### Title

| Property | Value |
|---|---|
| Text | "LEVEL UP!" |
| Size | 32px, bold |
| Color | `#3B82F6` (electric blue) with glow (`#3B82F6` at 30% opacity, 20px blur) |
| Position | Top-center of overlay |

### Cards

| Property | Value |
|---|---|
| Count | 3 |
| Size | 200×280 px each |
| Layout | Centered horizontally, with 16px gaps |
| Background | `#1A1A2A` at 90% opacity |
| Border | 2px solid `#3B82F6` |
| Entrance | Scale up from 0.8× over 0.2s, staggered by 0.1s per card |
| Hover/Selected | Elevate with shadow (0 8px 32px rgba(59,130,246,0.3)), border glows |

### Card Content (top to bottom)

1. **Icon** (64×64 px, centered)
2. **Name** (16px, bold, white)
3. **Level Change** (12px, `#3B82F6`, e.g., "Lv.3 → Lv.4")
4. **Description** (11px, `#9CA3AF`, e.g., "Pierce +1 enemy")

### Selection

| Property | Value |
|---|---|
| Click/Tap | Card flashes white (0.1s), then confetti plays |
| Keyboard | 1, 2, 3 to quick-select |
| Confetti | 20 particles, random Hero palette colors, scatter outward, fade over 0.5s |
| Resume Delay | 0.3s after selection before game resumes |

### Current Weapon Display

| Property | Value |
|---|---|
| Position | Below title, above cards |
| Content | Row of weapon icons with level numbers |
| Max Level | Gold border on Level 7 weapons |

---

## 4. End Screens

All end screens share the same layout. See `01_engine_architecture.md` §6 for end state definitions.

### Common Layout

| Property | Value |
|---|---|
| Background | `#000000` at 70% opacity (dark overlay) |
| Pre-delay | 1.0s pause for dramatic effect before fade-in |
| Fade-in | 0.5s |
| Content | Title → Stats → Buttons |

### HUD During End Screens

- HUD elements (HP bar, EXP bar, weapon panel, timer, gold display, pause button) are **hidden** during end screens
- Only the end screen overlay (title, stats, buttons) is visible
- This creates a clean, focused end-screen experience

### Stats Display

Stats are displayed with animated counters — each stat ticks up from 0 over 0.5s, staggered by 0.2s per stat (total animation: ~1.5s). Victory bonus text (+100g) appears **after** the stats animation completes.

| Stat | Format | Example |
|---|---|---|
| Time Survived | MM:SS | "3:42" |
| Level Reached | # | "11" |
| Enemies Killed | # | "487" |
| Gold Collected | # | "1,234" |
| Boss Defeated | Yes / No | "Yes" |
| Weapon Loadout | W1 Lv.#, W2 Lv.#, W3 Lv.# | "W1 Lv.5, W2 Lv.3, W3 Lv.2" |

### 4a. Victory Screen

| Property | Value |
|---|---|
| Title | "VICTORY" |
| Title Color | `#FFD700` (Hero Gold) |
| Title Size | 48px, bold |
| Bonus | "+100g" floating text, gold color |
| Bonus Text | "The Gravekeeper has been vanquished!" (16px, `#FFD700`) |
| Background Accent | Gold gradient overlay (subtle) |
| Confetti | 50 particles, Hero palette colors |
| Buttons | "Play Again" (primary, `#3B82F6`), "Main Menu" (secondary, transparent) |

### 4b. Survived Screen

| Property | Value |
|---|---|
| Title | "SURVIVED" |
| Title Color | `#FFFFFF` (white) |
| Title Size | 48px, bold |
| Bonus | None |
| Background Accent | Blue gradient overlay (subtle) |
| Buttons | "Play Again" (primary), "Main Menu" (secondary) |

### 4c. Defeat Screen

| Property | Value |
|---|---|
| Title | "DEFEATED" |
| Title Color | `#EF4444` (red) |
| Title Size | 48px, bold |
| Bonus | None |
| Red Tint | `#EF4444` at 20% opacity overlay on entire screen |
| Buttons | "Try Again" (primary, `#EF4444`), "Main Menu" (secondary) |

### Button Design

| Property | Value |
|---|---|
| Size | 200×48 px |
| Background (Primary) | `#3B82F6` |
| Background (Secondary) | Transparent, 2px border `#6B7280` |
| Text | 16px, white, centered |
| Hover | Brighten 10% |
| Border Radius | 8px |

---

## 5. Mini UI Elements

### Damage Numbers

From `vs_colors.md` Damage Numbers section.

| Type | Color | Size | Font | Motion |
|---|---|---|---|---|
| Normal Damage | `#FFFFFF` | 12px | Monospace, bold | Float upward 30px over 0.5s, fade to 0% |
| Critical Hit | `#FBBF24` | 16px | Monospace, bold | Float upward 40px over 0.6s, fade to 0%. Scale 1.3×. |
| Player Damage Taken | `#EF4444` | 14px | Monospace, bold | Float upward 25px over 0.4s, fade to 0% |
| Gold Pickup | `#FFD700` | 10px | Monospace | Float upward 20px over 0.3s, fade to 0% |
| XP Pickup | `#4FC3F7` | 10px | Monospace | Float upward 20px over 0.3s, fade to 0% |

All damage numbers have a 1px black text shadow for readability against any background.

**Damage Number Cap:** Maximum 30 simultaneous damage numbers on screen. When exceeded, oldest numbers are despawned first. This prevents unreadable overlap during dense combat.

### Kill Count

| Property | Value |
|---|---|
| Text | "+1" (or "+3" for multi-kills) |
| Color | `#FFFFFF` at 60% opacity |
| Size | 10px |
| Position | At enemy death position |
| Motion | Float upward 15px over 0.3s, fade to 0% |

### Gold Pickup Text

| Property | Value |
|---|---|
| Text | "+3g" (or actual gold amount) |
| Color | `#FFD700` |
| Size | 10px |
| Position | At gold coin pickup position |
| Motion | Float upward 20px over 0.3s, fade to 0% |

### XP Pickup Text

| Property | Value |
|---|---|
| Text | "+1 XP" (or scaled amount) |
| Color | `#4FC3F7` |
| Size | 10px |
| Position | At XP gem pickup position |
| Motion | Float upward 20px over 0.3s, fade to 0% |

### Victory Bonus Text

| Property | Value |
|---|---|
| Text | "+100g" |
| Color | `#FFD700` |
| Size | 16px, bold |
| Position | Center of victory screen |
| Motion | Scale from 0.5× to 1.0× over 0.3s, then hold |

---

## 6. Responsive Layout

### Screen Size Support

| Property | Value |
|---|---|
| Minimum Supported | 800×600 px |
| Recommended | 1280×720 px |
| Maximum | No limit (scales up) |

### Scaling Rules

- HUD elements use fixed pixel sizes (not percentages) for consistency
- Game area fills the remaining space after HUD
- Camera zoom adjusts to keep the player visible regardless of screen size

### Touch Support

| Element | Touch Target |
|---|---|
| Level-up cards | Full card area (200×280 px) |
| Pause button | 44×44 px minimum |
| End screen buttons | 200×48 px |
| Game area (movement) | Full canvas |

### Narrow Screen Adaptation

- Level-up cards stack vertically on screens narrower than 600px: each card becomes full-width (200px), stacked with 12px gaps, centered vertically
- Weapon panel wraps to 2 rows if needed
- Timer and level display move below HP bar on very small screens

---

## 7. Pause Menu

| Property | Value |
|---|---|
| Trigger | Escape key or tap pause button (top-right corner, 32×32 px "||" icon) |
| Background | `#000000` at 50% opacity |
| Title | "PAUSED" (24px, white, centered) |
| Buttons | "Resume" (primary), "Restart" (secondary), "Quit to Menu" (secondary) |
| Game State | Fully paused |
| Resume | Tap outside overlay (optional) or click "Resume" |

### Button Behavior

- **Resume:** Unpauses game, returns to gameplay
- **Restart:** Resets all game state (player HP, weapons, level, gold, timer, enemies) and starts a new run from 0:00. Brief fade-to-black (0.3s) before restart.
- **Quit to Menu:** In V1, there is no main menu screen. "Quit to Menu" returns to the game's initial state (level 1, no weapons, 0 gold) with a "MODULARITY ENGINE" title screen and a "Start Game" button. This serves as the V1 main menu.

---

## 8. Z-Order (Draw Order)

From `vs_colors.md` Visual Hierarchy Rules.

1. Ground tiles and cracked floor (bottom)
2. Grave mounds (passable obstacles)
3. Pickups (XP, gold)
4. Obstacles (tombstones, walls)
5. Enemies
6. Player
7. Weapon projectiles and effects
8. Damage numbers (top)
9. HUD elements (above everything)
10. Overlays (level-up, pause, end screens)

---

## 9. Cross-Reference Summary

| Section | References |
|---|---|
| HUD layout | `vs_plan.md` Prompt 8 §1 |
| Level-up screen | `07_leveling_system_spec.md` §9 Level-Up Visual Design |
| End screen states | `01_engine_architecture.md` §6 Scene/State Management |
| End screen stats | `vs_prog.md` Stage End & Victory |
| Boss health bar | `04_enemies_spec.md` §7 Boss: The Gravekeeper |
| Damage numbers | `vs_colors.md` Damage Numbers |
| Visual hierarchy | `vs_colors.md` Visual Hierarchy Rules |
| Design theme | `vs_plan.md` Prompt 8 — Design Theme |
| Screen shake events | `01_engine_architecture.md` §9 |
| Timer / boss spawn | `05_stages_spec.md` §10 Boss Spawn Sequence |
| JSON schema | `10_json_schemas.md` (UI config) |

---

*End of 08_ui_hud_spec.md — Version 1*
