# Title Screen — Assets & Implementation Plan

> **Game Version:** v0.2.0+
> **Parent Step:** Roadmap Step 1 of `17_implementation_roadmap.md`
> **Date:** August 24, 2026
> **Goal:** Fantasy anime-styled title screen with BGM, background art, menu SFX, and full navigation — built as assets first, then wired into the game.

---

## Table of Contents

1. [Asset Build Order](#1-asset-build-order)
2. [Title Screen BGM Specification](#2-title-screen-bgm-specification)
3. [Title Screen Background Art](#3-title-screen-background-art)
4. [Menu Sound Effects](#4-menu-sound-effects)
5. [Title Screen UI Layout](#5-title-screen-ui-layout)
6. [Input & Navigation](#6-input--navigation)
7. [State Machine Changes](#7-state-machine-changes)
8. [Implementation Steps](#8-implementation-steps)
9. [Test Gates](#9-test-gates)
10. [Integration Points](#10-integration-points)

---

## 1. Asset Build Order

Assets are built **before** the title screen code. Each asset is self-contained and testable independently.

```
Asset 1: Title Screen BGM        (synthesized, no files)
Asset 2: Background art SVG      (single SVG file)
Asset 3: Menu SFX — navigate     (synthesized, no files)
Asset 4: Menu SFX — select       (synthesized, no files)
Asset 5: Menu SFX — back/cancel  (synthesized, no files)
Asset 6: Menu SFX — locked       (synthesized, no files)
Asset 7: Menu SFX — slider tick  (synthesized, no files)
   ↓
Title Screen Code (HTML/CSS + JavaScript)
   ↓
Integration with Game state machine
```

**Why this order:**
- BGM is the largest new audio feature — get it working standalone first
- Background art is visual-only — can be tested by just opening the SVG
- Menu SFX are small, quick additions to AudioManager
- Title screen code depends on all three being ready

---

## 2. Title Screen BGM Specification

### Style: Fantasy Anime Village / Peaceful Town Theme

Think *Genshin Impact* title screen or *Rune Factory* village theme — warm, inviting, slightly magical. This contrasts with the dark combat music, signaling that the title screen is a safe space.

### Musical Structure

| Section | Time | Layers Active | Feel |
|---|---|---|---|
| **Intro** | 0:00–0:08 | Piano + Pad | Gentle. Music box quality. A single melody emerges from silence. |
| **Main Theme A** | 0:08–0:32 | Piano + Pad + Strings | Warm. A hopeful melody in D Major. Strings provide gentle swell. |
| **Main Theme B** | 0:32–0:56 | Piano + Pad + Strings + Flute | Brighter. Flute (sine wave) plays a counter-melody. Feels alive. |
| **Bridge** | 0:56–1:12 | Piano + Strings + Pad | Reflective. Chord change to relative minor. Builds anticipation. |
| **Main Theme A'** | 1:12–1:36 | Full ensemble | Return of the main theme, fuller. A sense of coming home. |
| **Loop point** | 1:36 | Crossfade back to 0:08 | Seamless loop — intro plays only once, then loops from Theme A. |

### Key & Tempo

| Property | Value |
|---|---|
| Key | D Major (bright, warm, anime-friendly) |
| Tempo | 90 BPM (relaxed, walking pace) |
| Time Signature | 4/4 |
| Chord Progression | D → G → A → D → Bm → Em → A → D (I-IV-V-I-vi-ii-V-I) |
| Loop Duration | ~90 seconds (full cycle), seamless crossfade |

### Instrument Bank (All Synthesized)

| Instrument | Waveform | Technique | Role |
|---|---|---|---|
| **Piano** | Triangle | Triangle wave body + fast decay (0.15s). Play individual notes, not chords — arpeggiated pattern. | Main melody carrier. Plays the recognizable theme. |
| **Pad** | Sawtooth + LP Filter | Low-pass filtered sawtooth. Cutoff at 600Hz. Very soft (15% volume). Slow LFO on cutoff (0.05Hz). | Warm bed of sound. Fills silence. |
| **Strings** | Sawtooth × 3 | Three detuned sawtooth oscillators (±5 cents detuning). Slow attack (0.5s), slow release (1.5s). | Swells and chord pads. Emotional weight. |
| **Flute** | Sine + Triangle | Sine body + triangle overtone (20% mix). Vibrato: LFO on frequency at 5Hz, depth ±3Hz. | Counter-melody. Airy, bright. Appears at 0:32. |

### Melody Notation (Piano — Main Theme A)

The melody is the part the player will associate with the game. Keep it simple, memorable, and hummable.

```
Bar 1:  D4(♩) - F#4(♩) - A4(♩) - D5(♩)
Bar 2:  C#5(♩) - A4(♩) - B4(♩) - A4(♩)
Bar 3:  G4(♩) - B4(♩) - D5(♩) - G5(♩)
Bar 4:  F#5(♩) - E5(♩) - D5(𝅗𝅥)
Bar 5:  D4(♩) - F#4(♩) - A4(♩) - D5(♩)
Bar 6:  E5(♩) - D5(♩) - C#5(♩) - A4(♩)
Bar 7:  B4(♩) - G4(♩) - A4(♩) - F#4(♩)
Bar 8:  E4(𝅗𝅥) - D4(𝅗𝅥)
```

### Note-to-Frequency Mapping

| Note | Frequency (Hz) |
|---|---|
| D4 | 293.66 |
| E4 | 329.63 |
| F#4 | 369.99 |
| G4 | 392.00 |
| A4 | 440.00 |
| B4 | 493.88 |
| C#5 | 554.37 |
| D5 | 587.33 |
| E5 | 659.25 |
| F#5 | 739.99 |
| G5 | 783.99 |

### Flute Counter-Melody (enters at 0:32)

```
Bar 9:  A5(♩.) - G5(♪) - F#5(♩) - E5(♩)
Bar 10: D5(♩) - E5(♩) - F#5(𝅗𝅥)
Bar 11: G5(♩.) - F#5(♪) - E5(♩) - D5(♩)
Bar 12: C#5(♩) - B4(♩) - A4(𝅗𝅥)
```

### Volume Levels

| Layer | Volume | Notes |
|---|---|---|
| Piano | 0.25 | Main character — clear and present |
| Pad | 0.12 | Background warmth — barely audible, felt more than heard |
| Strings | 0.15 | Emotional swell — rises to 0.20 during bridge |
| Flute | 0.18 | Counter-melody — distinct but not overpowering |
| **Master** | 0.40 | Title screen max — ducked to 0.20 when combat starts |

### Transition to Combat

| Event | Action |
|---|---|
| Player clicks "Start" | Title BGM fades out over 1.5s |
| Combat begins | Combat BGM fades in over 2s (from `09_audio_spec.md` §3) |
| Player returns to title (after game over) | Combat BGM fades out, title BGM fades in over 2s |

### Implementation Approach

The BGM is a **stateful synthesizer** — it keeps track of which bar it's on and schedules note events ahead of time using `AudioContext.currentTime`. It loops by resetting the bar counter when it reaches the end.

```
TitleBGM class:
  - state: { barIndex, beatIndex, currentChord, activeOscillators[] }
  - scheduleBar(barIndex) → creates notes for 4 beats at 90 BPM
  - loop() → when barIndex reaches end, reset to bar 1 (skip intro)
  - fadeIn(duration) → ramp music gain from 0 to target
  - fadeOut(duration) → ramp music gain to 0, then stop scheduling
  - stop() → silence all oscillators, reset state
```

---

## 3. Title Screen Background Art

### Concept: Gothic Fantasy Village Silhouette at Dusk

A single-layer SVG showing a dark fantasy village/town silhouette against a gradient sky with stars. This sets the mood: the player is in a dark world, but there's a town to return to — it connects the title screen to the town builder feature.

### Composition

```
┌─────────────────────────────────────────┐
│  ★    ·  ★       ·    ★  ·    ★        │  ← Stars (scattered dots)
│     ·        ★         ·     ·    ★     │
│  ·      ★        ·   ★    ·      ·     │
│                                         │
│  ─────────── gradient sky ───────────   │  ← Deep blue to orange gradient
│                                         │
│     ╱╲   ╱╲╱╲    ╱╲   ╱╲╱╲╱╲          │  ← Building silhouettes
│    ╱  ╲ ╱    ╲  ╱  ╲ ╱        ╲        │
│   ╱ ▪▪ ╲╱ ▪▪▪╲╱ ▪▪ ╲╱  ▪▪▪▪  ╲       │  ← Windows (warm orange dots)
│  ╱──────╲──────╲──────╲────────╲      │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Ground
└─────────────────────────────────────────┘
```

### SVG Specification

| Property | Value |
|---|---|
| File | `public/assets/title_background.svg` |
| Canvas | 800×450 (16:9 aspect, will scale to viewport) |
| viewBox | `0 0 800 450` |

### Layers (bottom to top)

#### Layer 1: Sky Gradient
```svg
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="#0A0A1A"/>   <!-- Deep space -->
    <stop offset="40%"  stop-color="#1A1A3E"/>   <!-- Midnight blue -->
    <stop offset="70%"  stop-color="#2D1B4E"/>   <!-- Purple dusk -->
    <stop offset="90%"  stop-color="#8B3A3A"/>   <!-- Deep red -->
    <stop offset="100%" stop-color="#D4764A"/>   <!-- Orange horizon -->
  </linearGradient>
</defs>
<rect width="800" height="450" fill="url(#sky)"/>
```

#### Layer 2: Stars (20-30 dots)
Scattered `<circle>` elements at random positions in the top 60% of the canvas. Sizes: 1-2px radius. Colors: white with 40-80% opacity. Include 2-3 slightly larger "bright stars" (3px, 100% opacity) with a subtle cross-hatch glow.

#### Layer 3: Moon (optional)
A crescent moon in the upper-right area:
```svg
<circle cx="680" cy="80" r="30" fill="#E8D5B7" opacity="0.9"/>
<circle cx="690" cy="75" r="28" fill="url(#sky)"/>  <!-- mask for crescent -->
```

#### Layer 4: Building Silhouettes (7-10 buildings)
Dark shapes (`#0D0D1A` with slight purple tint `#12101E`) forming a village skyline:

| Building | Position (x) | Width | Height | Shape |
|---|---|---|---|---|
| Tall tower | 100 | 40 | 120 | Rectangular with triangle roof |
| Small house | 180 | 60 | 60 | Square with triangle roof |
| Church/steeple | 280 | 50 | 140 | Rectangular with tall pointed roof |
| Medium house | 370 | 70 | 70 | Square with triangle roof |
| Shop | 460 | 80 | 55 | Wide rectangle, flat roof with sign |
| Tall house | 560 | 45 | 100 | Narrow, two stories |
| Windmill | 650 | 50 | 110 | Tower + cross shape (static, not animated) |
| Cottage | 720 | 65 | 50 | Small with chimney |

Each building is a `<path>` or `<polygon>` with dark fill. Windows are small `<rect>` elements (4×4px) with warm orange fill (`#FF9100` at 80% opacity).

#### Layer 5: Ground
```svg
<rect x="0" y="380" width="800" height="70" fill="#0D0D1A"/>
```
Slightly uneven top edge using a `<path>` with gentle curves.

#### Layer 6: Ambient Particles (CSS animated)
8-12 tiny orange/amber dots drifting upward slowly — like floating embers or fireflies. These are the only animated element.

```svg
<circle class="ember" cx="200" cy="350" r="1.5" fill="#FFB74D" opacity="0.6"/>
```

CSS animation (inline `<style>`):
```css
.ember {
  animation: float-up 8s ease-in-out infinite;
}
@keyframes float-up {
  0%   { transform: translateY(0); opacity: 0.6; }
  50%  { transform: translateY(-40px); opacity: 0.3; }
  100% { transform: translateY(-80px); opacity: 0; }
}
```
Each ember gets a different `animation-delay` (staggered 0-8s) and slightly different drift via `translateX` oscillation.

### Design Prompt (for AI/artist generation)

> Create a wide SVG landscape (800×450) of a gothic fantasy village at dusk, viewed from a distance. The sky transitions from deep space blue at the top through midnight purple to a warm orange horizon at the bottom. Scattered white stars dot the upper sky, with one crescent moon. Below, a silhouette skyline of 7-10 medieval buildings — a church with steeple, a windmill, small houses with triangle roofs, a shop with a sign. The buildings are near-black (#0D0D1A) against the colored sky. Small orange dots represent lit windows. A few amber particles drift upward like fireflies. The ground is dark earth. The overall mood should feel like the title screen of a dark fantasy RPG — inviting but mysterious. Flat vector art style, no gradients on buildings (solid silhouette), gradient only on sky.

---

## 4. Menu Sound Effects

All sounds are synthesized in the AudioManager — no external audio files.

### Sound Definitions

| ID | Trigger | Waveform | Pattern | Duration | Volume | Notes |
|---|---|---|---|---|---|---|
| `menu_navigate` | Move selection up/down | Sine | Single blip at 600Hz | 0.04s | 0.10 | Light, quick. Like a soft tick. |
| `menu_select` | Confirm selection | Square | Rising 3-note: C5→E5→G5 | 0.12s | 0.15 | Positive. "Yes, let's go." |
| `menu_back` | Cancel / go back | Sine | Falling 2-note: E5→C5 | 0.10s | 0.10 | Gentle retreat. Not punishing. |
| `menu_locked` | Try to select locked item | Square | Low buzz: 200Hz for 0.08s | 0.08s | 0.08 | Soft "thunk". Not harsh. |
| `menu_slider` | Slider value changes | Sine | Tiny tick at 1000Hz | 0.02s | 0.06 | Barely there. Just tactile feedback. |
| `menu_hover` | Highlight new item | Sine | Very quiet blip at 800Hz | 0.015s | 0.04 | Almost subliminal. You feel it more than hear it. |

### Sound Specifications

#### `menu_navigate`
```
Waveform:   sine
Frequency:  600 Hz
Attack:     0.005s
Sustain:    0.01s at full volume
Release:    0.025s (quick fade)
Total:      0.04s
Volume:     0.10
```

#### `menu_select`
```
Note 1:     C5 (523.25 Hz) at 0.00s
Note 2:     E5 (659.25 Hz) at 0.04s
Note 3:     G5 (783.99 Hz) at 0.08s
Waveform:   square
Attack:     0.005s per note
Decay:      0.03s per note
Total:      0.12s
Volume:     0.15
```
Same payout triad pattern as combat pickups (from `09_audio_spec.md` §4), but played at menu tempo instead of rapid collection speed. Creates a sense of continuity — the game "sounds like itself" even in menus.

#### `menu_back`
```
Note 1:     E5 (659.25 Hz) at 0.00s
Note 2:     C5 (523.25 Hz) at 0.04s
Waveform:   sine
Attack:     0.005s per note
Decay:      0.03s per note
Total:      0.10s
Volume:     0.10
```
Descending version of `menu_select` — signals "retreat" without being negative.

#### `menu_locked`
```
Waveform:   square
Frequency:  200 Hz
Attack:     0.005s
Sustain:    0.03s at 70% volume
Release:    0.045s
Total:      0.08s
Volume:     0.08
```
Low, brief. Like tapping on wood. Not an error sound — just a "not right now."

#### `menu_slider`
```
Waveform:   sine
Frequency:  1000 Hz
Attack:     0.003s
Decay:      0.017s
Total:      0.02s
Volume:     0.06
```
Tiny click. Felt more than heard.

#### `menu_hover`
```
Waveform:   sine
Frequency:  800 Hz
Attack:     0.003s
Decay:      0.012s
Total:      0.015s
Volume:     0.04
```
Almost subliminal. Subtle enough that you don't notice it until it's gone.

### Audio Channel Assignment

All menu sounds use the **UI channel** (from `09_audio_spec.md` §1). They do not compete with SFX slots. Volume is controlled by the SFX master gain (since UI is part of the SFX chain).

---

## 5. Title Screen UI Layout

### Layout (Portrait-first, scales to landscape)

```
┌────────────────────────────────┐
│                                │
│  [Background SVG: village]     │  ← Full-bleed, dark overlay
│                                │
│  ─── GAME TITLE ───            │  ← Large, centered, styled
│  "Vampire Survivors" style     │
│                                │
│  ── MAIN MENU ──               │
│                                │
│   ▶ Play                       │  ← Active, gold highlight
│   ▸ Characters    🔒           │  ← Locked
│   ▸ Stages        🔒           │  ← Locked
│   ▸ Settings                   │  ← Active
│                                │
│  ── INFO BAR ──                │
│  v0.1.0  │  Best: 4:32 Lv9    │
│  Total Gold: 320               │
│                                │
│  WASD / ↑↓ to navigate        │
│  ENTER to select               │
└────────────────────────────────┘
```

### Visual Styling

| Element | Style |
|---|---|
| Background | SVG at full opacity, with dark semi-transparent overlay (rgba(0,0,0,0.4)) |
| Title text | `#FFD700` (gold), `font-size: 2.5rem`, subtle text-shadow glow, font: serif or fantasy |
| Menu items | `#E0E0E0` (light gray), `font-size: 1.2rem` |
| Selected item | `#FFD700` (gold), left arrow indicator `▶`, slight scale-up (1.05×) |
| Locked items | `#666666` (dark gray), lock icon `🔒`, italic |
| Info bar | `#888888`, `font-size: 0.8rem`, separator dots |
| Container | `max-width: 400px`, centered, glass-morphism: `backdrop-filter: blur(10px)`, `background: rgba(10, 10, 26, 0.85)`, `border: 1px solid rgba(255, 215, 0, 0.15)`, `border-radius: 12px` |

### HTML Structure (conceptual)

```html
<div id="title-screen">
  <!-- Background SVG (positioned absolute, full viewport) -->
  <svg id="title-bg" ...><!-- village SVG --></svg>
  <div id="title-overlay"></div>

  <!-- Content (centered, scrollable on mobile) -->
  <div id="title-content">
    <h1 id="title-name">Vampire Survivors</h1>

    <div id="title-menu">
      <div class="menu-item active" data-action="play">▶ Play</div>
      <div class="menu-item locked" data-action="characters">🔒 Characters</div>
      <div class="menu-item locked" data-action="stages">🔒 Stages</div>
      <div class="menu-item" data-action="settings">▸ Settings</div>
    </div>

    <div id="title-info">
      <span>v0.1.0</span>
      <span>│</span>
      <span id="info-best-run">Best: --:-- Lv--</span>
      <span>│</span>
      <span id="info-total-gold">Gold: 0</span>
    </div>

    <div id="title-controls-hint">
      WASD / ↑↓ to navigate · ENTER to select
    </div>
  </div>
</div>
```

### Settings Sub-Screen

```
┌────────────────────────────────┐
│                                │
│  ── SETTINGS ──                │
│                                │
│  SFX    [====----] 60%        │  ← Draggable slider
│  Music  [======──] 80%        │  ← Draggable slider
│                                │
│  ── CONTROLS ──                │
│  WASD / Arrow Keys — Move     │
│  1 / 2 / 3 — Select Upgrade   │
│  Click — Select / Interact     │
│                                │
│  ── DANGER ZONE ──             │
│  [Reset All Progress]          │  ← Confirmation dialog
│                                │
│  ◀ Back                        │
└────────────────────────────────┘
```

---

## 6. Input & Navigation

### Keyboard

| Key | Action | State |
|---|---|---|
| `ArrowUp` / `W` | Move selection up | title |
| `ArrowDown` / `S` | Move selection down | title |
| `Enter` / `Space` | Select current item | title |
| `Escape` | Back to main menu (from sub-screens) | settings |
| `ArrowLeft` / `A` | Decrease slider value | settings |
| `ArrowRight` / `D` | Increase slider value | settings |

### Mouse / Touch

| Action | Result |
|---|---|
| Click on menu item | Select it |
| Click on locked item | Play `menu_locked` sound, show tooltip |
| Hover over item | Highlight + `menu_hover` sound |
| Click "Back" | Return to main menu + `menu_back` sound |
| Drag on slider | Adjust value + `menu_slider` tick per step |
| Tap on mobile | Same as click |

### Navigation Rules

- Selection wraps: bottom → top, top → bottom
- Locked items can be highlighted but not selected
- Selecting a locked item plays `menu_locked` and shows brief tooltip: "Complete X to unlock"
- "Settings" opens a sub-screen; Escape or "Back" returns
- Only one sub-screen can be open at a time

---

## 7. State Machine Changes

### New GameState: `title`

```
                    ┌──────────┐
                    │  title   │ ← New state
                    └────┬─────┘
                         │ click "Play"
                         ▼
                    ┌──────────┐
                    │ playing  │
                    └────┬─────┘
                         │ player dies
                         ▼
                    ┌──────────┐
                    │ gameOver │
                    └────┬─────┘
                         │ click "Continue"
                         ▼
                    ┌──────────┐
                    │  title   │ ← Returns here (not restart)
                    └──────────┘
```

### Valid Transitions

| From | To | Trigger |
|---|---|---|
| *(initial)* | `title` | Page load |
| `title` | `playing` | Click "Play" |
| `title` | `settings` | Click "Settings" (sub-state, not full state) |
| `settings` | `title` | Click "Back" or Escape |
| `playing` | `levelUp` | Level up (existing) |
| `playing` | `bossIntro` | Boss appears (existing) |
| `levelUp` | `playing` | Select upgrade (existing) |
| `bossIntro` | `playing` | Intro ends (existing) |
| `playing` | `gameOver` | Player dies (existing) |
| `gameOver` | `title` | Click "Continue" or "Return to Title" |

### Page Load Behavior

```
1. Page loads
2. Show title screen (div#title-screen visible, canvas hidden)
3. AudioManager created (AudioContext suspended)
4. Title BGM starts scheduling (but silent — audio locked)
5. User clicks "Play"
6. AudioContext.resume() ← unlocks audio
7. Title BGM fades in (starts playing)
8. Start 3s countdown: title BGM fades out, combat begins
```

---

## 8. Implementation Steps

### Step A: Background Art (15 min)
1. Create `public/assets/title_background.svg` per §3 spec
2. Verify it renders correctly at different viewport sizes
3. Add dark overlay styling

### Step B: Title BGM Synthesizer (45 min)
1. Add `TitleBGM` class to AudioManager section of `game2.html`
2. Implement bar scheduler (90 BPM, 4 bars per section)
3. Implement piano melody (D Major theme from §2)
4. Implement pad layer (filtered sawtooth)
5. Implement strings (detuned sawtooth trio)
6. Implement flute counter-melody (sine + vibrato)
7. Implement loop (reset to Theme A after full cycle)
8. Implement fadeIn/fadeOut methods
9. Test: plays standalone, loops seamlessly, sounds warm and inviting

### Step C: Menu SFX (20 min)
1. Add 6 menu sound methods to AudioManager (§4)
2. Wire `menu_navigate` to keyboard up/down events
3. Wire `menu_select` to Enter/space/click
4. Wire `menu_back` to Escape
5. Wire `menu_locked` to locked item selection
6. Wire `menu_hover` to mouse hover
7. Wire `menu_slider` to slider drag events
8. Test: all 6 sounds play at correct moments, correct volume

### Step D: Title Screen HTML/CSS (30 min)
1. Add `#title-screen` div to game2.html
2. Add background SVG inline or via `<img>`
3. Add dark overlay
4. Add game title, menu items, info bar
5. Style per §5 (glass-morphism, gold accents, locked states)
6. Add settings sub-screen
7. Add sliders with mouse drag support
8. Test: renders on both desktop and mobile viewports

### Step E: Title Screen JavaScript (45 min)
1. Add `title` state to GameState
2. Implement `TitleMenu` class:
   - `selectedIndex`, `items[]`, `lockedItems[]`
   - `moveSelection(direction)` → plays `menu_navigate`
   - `select()` → plays `menu_select` or `menu_locked`
   - `goBack()` → plays `menu_back`
3. Wire keyboard events (WASD + arrows + Enter + Escape)
4. Wire mouse/touch events (click, hover, slider drag)
5. Implement `showTitleScreen()` and `hideTitleScreen()` methods
6. Wire "Play" → `AudioManager.resume()` → fade title BGM → start combat
7. Wire "Settings" → show settings sub-screen
8. Wire GameManager data display (best run, total gold, version)
9. Wire game over → title screen transition
10. Test: full navigation flow works, BGM plays, all SFX fire

### Step F: Integration (30 min)
1. Title BGM fades out when combat starts
2. Combat BGM fades in after title fades
3. Game over shows title screen (not restart)
4. Title screen shows updated stats after returning from combat
5. Save/load: title screen reads from GameManager
6. Test: complete flow — title → combat → game over → title → combat

---

## 9. Test Gates

### Asset Tests (before code)

| Test | Pass Criteria |
|---|---|
| Background SVG renders | Opens in browser, shows village silhouette at 800×450 |
| Title BGM sounds right | Warm, inviting, fantasy feel. Loops seamlessly. No pops or clicks. |
| Menu SFX are distinct | Each of the 6 sounds is distinguishable. None are harsh or annoying. |

### Title Screen Tests (after code)

| Test | Pass Criteria |
|---|---|
| Title shows on load | Page loads → title screen visible, canvas hidden |
| Navigation works | Arrow keys move selection, wraps at edges |
| Select Play | Click/Enter → audio unlocks, title fades, combat starts |
| Locked items | Characters/Stages show lock icon, playing them shows tooltip + `menu_locked` |
| Settings opens | Click Settings → sub-screen appears with sliders |
| Settings sliders work | Drag or arrow keys adjust volume, `menu_slider` ticks |
| Back returns | Escape/Back → main menu, `menu_back` sound |
| BGM plays | Title BGM audible after first click (audio unlocked) |
| BGM fades on start | Clicking "Play" → title BGM fades out over 1.5s, combat starts |
| Stats display | Total gold and best run shown from GameManager |
| Game over → title | Dying → game over screen → "Return to Title" → title screen |
| Mobile works | Touch to navigate, tap to select, portrait layout |
| No JS errors | Console clean throughout entire flow |

---

## 10. Integration Points

### Files Changed

| File | Change |
|---|---|
| `public/game2.html` | Title screen HTML, CSS, JS, TitleBGM class, menu SFX methods, state machine update |
| `public/assets/title_background.svg` | New file — village silhouette SVG |

### AudioManager Methods Added

| Method | Purpose |
|---|---|
| `titleBGM.fadeIn(duration)` | Fade title music in |
| `titleBGM.fadeOut(duration)` | Fade title music out |
| `titleBGM.stop()` | Stop title music, reset state |
| `titleBGM.update(dt)` | Tick the bar scheduler |
| `playMenuSound(soundId)` | Route menu sounds (navigate, select, back, locked, slider, hover) |

### GameManager Reads

| Data | Source | Displayed In |
|---|---|---|
| `persistent.currency` | GameManager | Title info bar: "Total Gold: X" |
| `counters.total_runs` | GameManager | Title info bar: "Best: --" |
| `counters.best_time` | GameManager | Title info bar: "Best: X:XX" |
| `counters.best_level` | GameManager | Title info bar: "Lv X" |
| `save_version` | GameManager | Title info bar: "v0.1.0" |

### EventBus Events Added

| Event | Data | Fired By |
|---|---|---|
| `titleScreenShow` | `{}` | Game.showTitleScreen() |
| `titleScreenHide` | `{}` | Game.hideTitleScreen() |
| `menuNavigate` | `{ direction }` | TitleMenu.moveSelection() |
| `menuSelect` | `{ action }` | TitleMenu.select() |
| `menuBack` | `{}` | TitleMenu.goBack() |

---

*Title Screen Assets & Plan v1.0 — Generated August 24, 2026*
