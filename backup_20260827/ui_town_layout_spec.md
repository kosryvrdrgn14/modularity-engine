# Town & Location Screen — Prototype UI Layout Spec

> **Version:** 1.0 (Prototype)
> **Date:** August 26, 2026
> **Parent:** `22_city_builder_location_system.md` (D9 unified hierarchy), `ui_design.md` (portrait-first)
> **Status:** Spec
> **Conflicts Resolved:** C1-C5 from Gemini handoff review
> **Design Decisions:** D3 (stage tiers), D5 (1:1 companion binding), D9 (unified location hierarchy)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Screen Zones](#2-screen-zones)
3. [Zone 1: Top Header](#3-zone-1-top-header)
4. [Zone 2: Left Panel — Social & Progress](#4-zone-2-left-panel--social--progress)
5. [Zone 3: Center Stage — Atmosphere & Focus](#5-zone-3-center-stage--atmosphere--focus)
6. [Zone 4: Right Panel — Infrastructure & Systems](#6-zone-4-right-panel--infrastructure--systems)
7. [Zone 5: Bottom Dock — Navigation & Companions](#7-zone-5-bottom-dock--navigation--companions)
8. [Overlay: NPC Dialogue](#8-overlay-npc-dialogue)
9. [Overlay: Shop / Farming / Sandbox](#9-overlay-shop--farming--sandbox)
10. [Responsive Breakpoints](#10-responsive-breakpoints)
11. [Interaction Patterns](#11-interaction-patterns)
12. [Gaps & Open Questions](#12-gaps--open-questions)

---

## 1. Design Philosophy

### Problem with Gemini's Proposal

Gemini proposed **persistent side rails** (left + right) flanking a center stage. This works on desktop (1024px+) but **breaks on mobile portrait** (360-414px) where horizontal space is extremely limited. Side rails would leave ~100px for the center — not enough for camp art or dialogue.

### Our Solution: Adaptive Three-Zone Layout

Instead of persistent side rails, we use a **stacked zones** approach that works at all widths:

```
┌─────────────────────────────────┐
│  ZONE 1: TOP HEADER (fixed)     │  ← Resources, title, back
├─────────────────────────────────┤
│                                 │
│  ZONE 3: CENTER STAGE           │  ← Camp art, background, atmosphere
│  (atmospheric background)       │     (takes up most vertical space)
│                                 │
│  ZONE 2: LEFT PANEL             │  ← NPCs, social, progress (slides in from left)
│  (collapsible/overlay)          │
│                                 │
│  ZONE 4: RIGHT PANEL            │  ← Districts, systems (slides in from right)
│  (collapsible/overlay)          │
│                                 │
├─────────────────────────────────┤
│  ZONE 5: BOTTOM DOCK (fixed)    │  ← Navigation, companions, action bar
└─────────────────────────────────┘
```

**Key principle:** On mobile, the left and right panels are **not persistent**. They are accessed via swipe or button taps, sliding in as overlays over the center stage. On desktop (≥768px), they become persistent side columns.

### Why This Works

| Screen Width | Layout | Behavior |
|---|---|---|
| **< 480px** (phone) | Single column, panels slide in | Center stage visible, panels overlay on demand |
| **480-768px** (large phone/small tablet) | Two-column hybrid | Left panel persistent, right panel slides |
| **≥ 768px** (tablet/desktop) | Three-column | Both panels persistent, center stage compressed |

---

## 2. Screen Zones

### Zone Map (Mobile Portrait — Primary Target)

```
┌─────────────────────────────────┐
│ ◀ 🏕️ Refugee Camp    💰150 🪵45 │  ← Zone 1: Top Header
│    ⚔Lv8 ⏱4:32                  │     (48px height)
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │   [Camp Background]     │    │
│  │   town_refugee_camp.svg │    │  ← Zone 3: Center Stage
│  │   Campfire, tents,      │    │     (flex: 1, fills remaining space)
│  │   moonlight, atmosphere │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│ 🗺️Map 👥NPCs 📋Quests 🛒Shop ⚔️│  ← Zone 5: Bottom Dock
│  (primary nav)   (3 companion   │     (56px height)
│                   slots inline) │
└─────────────────────────────────┘
```

### Swipeable Regions (D9)

Left/right swipe at root level switches between major areas:

```
◄── Town ──►  ◄── Graveyard ──►  ◄── Forest (🔒) ──►
     ● ○ ○         (page dots)
```

---

## 3. Zone 1: Top Header

**Persistent.** Always visible. 48px height.

### Layout

```
┌─────────────────────────────────────────┐
│ ◀ 🏕️ Refugee Camp         💰150 🪵45    │
│                     ⚔Lv8  ⏱4:32  🪨30  │
└─────────────────────────────────────────┘
```

### Elements

| Element | Position | Behavior |
|---|---|---|
| **Back button (◀)** | Far left | Navigates up one level in location hierarchy. Hidden at root level. |
| **Location icon + name** | Left-center | Shows current location name (e.g., "Refugee Camp", "Trade District"). Tappable at root to show region selector. |
| **Gold counter** | Top-right | Gold icon + number. Tap for detailed breakdown (gold earned this run, total, spending history). |
| **Resource chips** | Below gold (2nd row on mobile) | Wood 🪵, Stone 🪨, Herbs 🌿, Ore ⛏️. Compact chips, tap to see amounts. |
| **Level badge** | Right side | Player level in a small circle. Taps to show level details. |
| **Timer** | Right side | Shows last run time or current session time. |

### Responsive

| Width | Layout |
|---|---|
| **< 480px** | Single row: Back + Name + Gold. Resources on hover/long-press only. |
| **480-768px** | Two rows: Row 1 = Back + Name + Gold + Level. Row 2 = Resources + Timer. |
| **≥ 768px** | Single row: everything inline. |

---

## 4. Zone 2: Left Panel — Social & Progress

**On mobile:** Hidden by default. Revealed by:
- Tapping the "👥 NPCs" tab in the bottom dock
- Swiping right from the center stage
- Tapping an NPC indicator in the center stage

**On desktop (≥768px):** Persistent left column (280px wide).

### Layout (Slide-in Panel)

```
┌─────────────────────────────┐
│  📋 PRIORITY QUESTS          │
│  ┌───────────────────────┐  │
│  │ ⚔️ Clear Graveyard     │  │
│  │ ████████░░ 32/50      │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🏠 Camp Upgrade       │  │
│  │ Spend 100g            │  │
│  └───────────────────────┘  │
│                             │
│  👥 RESIDENTS (2)           │
│  ┌───────────────────────┐  │
│  │ 👴 Elder Rowan   ❤️0  │  │  ← NPC card with portrait
│  │   Tap to talk         │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🔒 Lina          🔒   │  │  ← Locked NPC
│  │   Upgrade camp first  │  │
│  └───────────────────────┘  │
│                             │
│  🐕 DOG STATUS              │
│  ┌───────────────────────┐  │
│  │ Dog: Ready for combat │  │
│  └───────────────────────┘  │
│                             │
│  ⚔️ [ ENTER COMBAT ]        │  ← Primary CTA
└─────────────────────────────┘
```

### Elements

| Element | Priority | Behavior |
|---|---|---|
| **Priority Quests** | Top | Max 3 visible. Shows pinned/active quests with progress bars. Tap to expand in Journal overlay. |
| **Camp Upgrade Card** | Below quests (if applicable) | Shows upgrade button with gold cost. Disappears after max upgrade. |
| **Resident NPCs** | Middle | Shows NPCs at current location with portraits. Tap opens dialogue modal (§8). Max 3 visible, scroll for more. |
| **Dog/Companion Status** | Below NPCs | Shows deployed companions and their status. Tap to open Party screen. |
| **Enter Combat** | Bottom (sticky) | Primary CTA. Opens Pre-Run Weapon Selection (§4 of `ui_design.md`). |

### NPC Card Design

```
┌───────────────────────────────┐
│ [Portrait]  Elder Rowan       │
│             ❤️ Trust: Lv.0    │
│             💬 2 topics       │
│             Tap to talk →     │
└───────────────────────────────┘
```

| State | Visual |
|---|---|
| **Available** | Full color portrait, green "Tap to talk" hint |
| **Has quest** | Yellow pulse dot, "📋 Quest available" |
| **Locked** | Greyed portrait, lock icon, unlock requirement |
| **In dialogue** | Blue border (currently talking) |

---

## 5. Zone 3: Center Stage — Atmosphere & Focus

**Always visible.** This is the visual anchor — the camp art, environmental atmosphere, and central focus.

### Layout

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│   [Background SVG/Canvas]       │
│                                 │
│   Shows:                        │
│   - Camp background art         │
│   - Animated campfire flames    │
│   - Tents/shacks                │
│   - Moonlight/stars             │
│   - NPC silhouettes (if any)    │
│   - Active companions (3 slots) │
│                                 │
│                                 │
│   ┌─────┐ ┌─────┐ ┌─────┐     │
│   │ 🐕  │ │     │ │     │     │  ← Companion slots (if deployed)
│   │ Dog │ │ Empty│ │ Empty│    │
│   └─────┘ └─────┘ └─────┘     │
│                                 │
└─────────────────────────────────┘
```

### Behavior

| State | Center Stage Shows |
|---|---|
| **Root (City/Camp)** | Full camp art with campfire, tents, atmosphere |
| **Sub-location (Blacksmith)** | Blacksmith interior art (or generic building interior) |
| **Dialogue active** | Darkened backdrop with dialogue modal centered |
| **Combat prep** | Weapon selection overlay slides up from bottom |

### Companion Slots in Center

3 slots at the bottom of the center stage. Each shows:
- Companion portrait (if deployed)
- Status indicator (green = ready, yellow = deployed in auto-clear)
- Tap to open Party management

---

## 6. Zone 4: Right Panel — Infrastructure & Systems

**On mobile:** Hidden by default. Revealed by:
- Tapping the "📋 Quests" or "🛒 Shop" tab in the bottom dock
- Swiping left from the center stage

**On desktop (≥768px):** Persistent right column (280px wide).

### Layout (Slide-in Panel)

```
┌─────────────────────────────┐
│  📍 LOCATIONS                │
│  ┌───────────────────────┐  │
│  │ 🏕️ Refugee Camp  ●    │  │  ← Current (dot indicator)
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🔨 Trade District  ▸  │  │  ← Tap to enter
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🏠 Residential     ▸  │  │
│  └───────────────────────┘  │
│                             │
│  🔄 AUTO-CLEAR FARMING      │
│  ┌───────────────────────┐  │
│  │ Slot 1: 🐕 Running    │  │
│  │ Slot 2: ⏳ Idle       │  │
│  │ Slot 3: 🔒 Locked    │  │
│  │ [Open Farming Menu]   │  │
│  └───────────────────────┘  │
│                             │
│  ⚠️ PENDING EVENTS          │
│  ┌───────────────────────┐  │
│  │ 🐀 Rat Infestation    │  │
│  │ 80g to resolve        │  │
│  └───────────────────────┘  │
│                             │
│  🔬 [ SANDBOX MODE ]        │  ← Debug/testing
└─────────────────────────────┘
```

### Elements

| Element | Behavior |
|---|---|
| **Location list** | Shows child locations of current area. Tap to navigate. Current location highlighted with dot. |
| **Auto-Clear Farming** | Shows slot status (running/complete/locked). Tap opens farming overlay. |
| **Pending Events** | Disaster notifications, urgent quests. Tap to resolve. |
| **Sandbox** | Debug button for testing. Hidden in production. |

---

## 7. Zone 5: Bottom Dock — Navigation & Companions

**Persistent.** Always visible. 56px height + safe area padding.

### Layout (Mobile)

```
┌─────────────────────────────────────────┐
│  🗺️     👥 NPCs    📋 Quests    🛒     │
│  Map     Social    Systems     Shop     │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐              │  ← Companion strip (inline)
│  │ 🐕  │ │  +  │ │  +  │              │     Shows deployed companions
│  └─────┘ └─────┘ └─────┘              │     Tap to open Party screen
│                                         │
│  ⚔️ Enter Combat                        │  ← Primary CTA (full width)
└─────────────────────────────────────────┘
```

### Tab System

| Tab | Icon | Label | Panel Opens | Badge |
|---|---|---|---|---|
| **Map** | 🗺️ | Map | Center stage (root view) | None |
| **Social** | 👥 | NPCs | Left panel (residents, quests) | Count of talkable NPCs |
| **Systems** | 📋 | Quests | Right panel (locations, farming, events) | Count of pending events |
| **Shop** | 🛒 | Shop | Opens shop overlay | None |
| **Combat** | ⚔️ | Fight | Opens weapon selection → combat | None |

### Tab Behavior

| State | Visual |
|---|---|
| **Active** | Gold color (#FFD700), filled icon, underline indicator |
| **Inactive** | Grey color (#8888AA), outline icon |
| **Badge present** | Small red circle with count, top-right of icon |
| **Long-press** | Context menu (e.g., long-press Shop → view inventory) |

### Companion Strip

Below the tab bar, a compact strip shows 3 companion slots:

```
┌─────┐ ┌─────┐ ┌─────┐
│ 🐕  │ │  +  │ │  +  │
│ Lv3 │ │     │ │     │
└─────┘ └─────┘ └─────┘
```

- Each slot shows companion portrait if deployed, "+" if empty
- Level badge if companion is in combat
- Tap to open full Party management screen
- Occupied slots show deployment status (combat/auto-clear/available)

---

## 8. Overlay: NPC Dialogue

**Centered modal.** Appears when player taps an NPC to talk.

### Layout

```
┌─────────────────────────────────────────┐
│                                         │
│           ╔═══════════════════╗         │
│           ║  [Dark backdrop]  ║         │
│           ║                   ║         │
│           ║  ┌─────────────┐  ║         │
│           ║  │ [Portrait]  │  ║         │
│           ║  │ Elder Rowan │  ║         │
│           ║  │ ❤️ Lv.0     │  ║         │
│           ║  └─────────────┘  ║         │
│           ║                   ║         │
│           ║  "Welcome back,   ║         │
│           ║   traveler..."    ║         │
│           ║                   ║         │
│           ║  ┌─────────────┐  ║         │
│           ║  │ Tell me     │  ║         │  ← Choice 1
│           ║  │ about camp  │  ║         │
│           ║  └─────────────┘  ║         │
│           ║  ┌─────────────┐  ║         │
│           ║  │ Anything     │  ║         │  ← Choice 2
│           ║  │ strange?     │  ║         │
│           ║  └─────────────┘  ║         │
│           ║  ┌─────────────┐  ║         │
│           ║  │ [End Chat]   │  ║         │  ← Exit
│           ║  └─────────────┘  ║         │
│           ║                   ║         │
│           ╚═══════════════════╝         │
│                                         │
└─────────────────────────────────────────┘
```

### Dialogue Modal Specs

| Property | Value |
|---|---|
| **Width** | 90% of screen (max 400px) |
| **Position** | Centered vertically and horizontally |
| **Backdrop** | Black at 60% opacity. Tap to dismiss (if no choices pending). |
| **Portrait** | 80×80px circle, top of modal |
| **NPC name** | 16px, bold, white |
| **Affection** | 12px, heart icon + level |
| **Greeting text** | 14px, typewriter animation (25ms per char) |
| **Choice buttons** | Full width, 48px height, rounded, dark background with border |
| **Choice hover** | Border color changes to accent blue (#3B82F6) |
| **Choice selected** | Brief flash, then response typewriter animation |
| **End conversation** | Closes modal, returns to previous panel |

### Dialogue Flow

```
Tap NPC card
  → Modal opens with greeting (typewriter)
  → Choices appear after greeting completes
  → Tap choice → response typewriter
  → "Continue" button → back to choices (or close if end topic)
  → Tap backdrop → close (only after response shown)
```

---

## 9. Overlay: Shop / Farming / Sandbox

All three use the same overlay container (reuses existing `#shop-overlay`).

### Shop Overlay (Grand Bazaar)

```
┌─────────────────────────────────────────┐
│  🛒 Grand Bazaar                    ✕   │
├─────────────────────────────────────────┤
│  [⚔️ Combat] [🐕 Companion] [🏗️ Estate] [💝 Gifts] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ⚔️ Iron Sword         💰 100g  │    │
│  │   +12 Attack Damage            │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 🐕 Dog Treats          💰 50g  │    │
│  │   +5 Dog Affection             │    │
│  └─────────────────────────────────┘    │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Farming Overlay

Reuses shop overlay. Title changes to "🌾 Auto-Clear Farming". Shows 3 slots with status.

### Sandbox Overlay

Reuses shop overlay. Title changes to "🔬 Sandbox Mode". Shows difficulty slider, weapon levels, DPS toggle.

---

## 10. Responsive Breakpoints

### Mobile Portrait (< 480px) — Primary Target

```
┌──────────────────────┐
│ ◀ Camp    💰150      │  ← Compact header
├──────────────────────┤
│                      │
│  [Camp Background]   │  ← Full center stage
│                      │
│  [🐕] [+] [+]       │  ← Companion slots
│                      │
├──────────────────────┤
│ 🗺️  👥  📋  🛒  ⚔️  │  ← 5-tab bottom nav
│ Map  NPCs Shop Fight │
└──────────────────────┘
```

- Left/right panels: **Slide-in overlays** (toggled by bottom nav tabs)
- Center stage: **Full width, fills remaining height**
- Companion slots: **Below center stage, above bottom nav**

### Tablet Portrait (480-768px)

```
┌──────────────────────────────────┐
│ ◀ 🏕️ Refugee Camp    💰150 🪵45  │
├──────────────────────────────────┤
│                                  │
│  ┌────────┐  ┌──────────────┐   │
│  │ LEFT   │  │              │   │
│  │ PANEL  │  │ CENTER STAGE │   │
│  │ (200px)│  │              │   │
│  │ NPCs   │  │ [Background] │   │
│  │ Quests │  │              │   │
│  │        │  │              │   │
│  └────────┘  └──────────────┘   │
│                                  │
├──────────────────────────────────┤
│ 🗺️  👥  📋  🛒  ⚔️  [🐕][+][+] │
└──────────────────────────────────┘
```

- Left panel: **Persistent** (200px)
- Right panel: **Slide-in** (toggled by 📋 tab)
- Center stage: **Flex fill** between panels

### Desktop (≥768px)

```
┌──────────────────────────────────────────────────────┐
│ ◀ 🏕️ Refugee Camp          💰150 🪵45 🪨30 ⚔Lv8 ⏱4:32 │
├────────────┬────────────────────────┬────────────────┤
│            │                        │                │
│ LEFT PANEL │     CENTER STAGE       │  RIGHT PANEL   │
│ (280px)    │     (flex: 1)          │  (280px)       │
│            │                        │                │
│ 📋 Quests  │   [Camp Background]    │  📍 Locations  │
│ 👥 NPCs    │                        │  🔄 Farming    │
│ 🐕 Dogs    │   [🐕] [+] [+]        │  ⚠️ Events     │
│            │                        │  🔬 Sandbox    │
│ ⚔️ Combat  │                        │                │
│            │                        │                │
├────────────┴────────────────────────┴────────────────┤
│ 🗺️ Map  👥 Social  📋 Systems  🛒 Shop  ⚔️ Combat    │
└──────────────────────────────────────────────────────┘
```

- All three columns visible
- Left: Social & progress
- Center: Atmosphere
- Right: Infrastructure

---

## 11. Interaction Patterns

### Swipe Gestures

| Gesture | Context | Action |
|---|---|---|
| **Swipe left** | Center stage (root) | Switch to next region (Town → Graveyard → Forest) |
| **Swipe right** | Center stage (root) | Switch to previous region |
| **Swipe right** | Center stage (in sub-location) | Open left panel (NPCs) |
| **Swipe left** | Center stage (in sub-location) | Open right panel (systems) |
| **Swipe down** | Open panel | Close panel |
| **Swipe up** | Bottom dock | Expand companion strip |

### Tap Targets

| Element | Min Size | Notes |
|---|---|---|
| **Bottom nav tabs** | 48×48px | With 8px padding |
| **NPC cards** | 100% width × 64px | Full-width tap targets |
| **Location cards** | 100% width × 56px | Easy to tap |
| **Dialogue choices** | 100% width × 48px | Full-width |
| **Companion slots** | 56×56px | Compact but tappable |

### Back Navigation

| Source | Back Action |
|---|---|
| **Sub-location** | Return to parent location (breadcrumb) |
| **Region** | Return to Town (default region) |
| **Overlay** | Close overlay, return to center stage |
| **Dialogue modal** | Close modal, return to NPC list |

---

## 12. Gaps & Open Questions

### Resolved from Gemini Review

| # | Gap | Resolution |
|---|---|---|
| **G1** | Mobile adaptation for side rails | Panels are slide-in overlays on mobile, persistent only on desktop (≥768px) |
| **G2** | Swipe region integration | Left/right swipe at root switches regions (D9). Sub-location swiping opens panels. |
| **G3** | Dialogue modal spec | Full spec in §8. Uses existing dialogue system with centered modal + backdrop. |
| **G4** | Breadcrumb/back integration | Back button in Zone 1 (Top Header). Breadcrumbs in left panel header. |
| **G5** | Farming button placement | In right panel (Zone 4). Also accessible via bottom dock "📋 Quests" tab. |
| **G6** | Shop overlay integration | Bottom dock "🛒 Shop" tab opens existing Grand Bazaar overlay. |
| **G7** | Disaster notification placement | In right panel (Zone 4), below farming. Also shows as priority card in left panel. |

### New Open Questions

| # | Question | Impact | Recommendation |
|---|---|---|---|
| **Q1** | Should the bottom dock show 4 or 5 tabs? | 5 tabs may be crowded on small phones. | Start with 4 (Map, Social, Systems, Shop) and add Combat as a floating CTA above the dock. |
| **Q2** | Should companion slots be in the bottom dock or center stage? | Bottom dock keeps them always visible but adds height. Center stage keeps them atmospheric but hidden when panels are open. | Center stage (as currently implemented). Companion strip in bottom dock only on desktop. |
| **Q3** | How do we handle the "Enter Combat" CTA? | Gemini puts it in left rail. Our current implementation has it as a bottom dock button. | Floating button above bottom dock (iOS-style FAB). Always visible, one tap to weapon selection. |
| **Q4** | Should panels remember their last-open state? | If player opens NPCs, navigates away, comes back — should NPCs still be showing? | No. Panels close on navigation. Player explicitly reopens them. Prevents clutter. |
| **Q5** | How do we handle region swipe vs. panel swipe conflict? | Swipe left could mean "next region" or "open right panel." | At root level: swipe = region switch. In sub-locations: swipe = panel open. Disambiguated by depth. |
| **Q6** | Should the camp background be interactive? | Tapping the campfire, tents, etc. could trigger actions. | No for prototype. Background is purely atmospheric. Future: tapping tents could show residents, campfire could show gathering events. |

---

## Appendix A: CSS Layout Reference

```css
/* Zone 1: Top Header */
#town-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: rgba(15, 15, 26, 0.95);
  border-bottom: 1px solid #333355;
}

/* Zone 3: Center Stage */
#town-center {
  position: fixed;
  top: 48px;
  left: 0;
  right: 0;
  bottom: 120px; /* above bottom dock */
  overflow: hidden;
}

/* Zone 5: Bottom Dock */
#town-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(15, 15, 26, 0.95);
  border-top: 1px solid #333355;
  padding-bottom: env(safe-area-inset-bottom);
}

/* Zone 2: Left Panel (slide-in) */
#town-left-panel {
  position: fixed;
  top: 48px;
  left: 0;
  bottom: 120px;
  width: 280px;
  z-index: 90;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  background: rgba(15, 15, 26, 0.98);
  border-right: 1px solid #333355;
  overflow-y: auto;
}
#town-left-panel.open { transform: translateX(0); }

/* Zone 4: Right Panel (slide-in) */
#town-right-panel {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 120px;
  width: 280px;
  z-index: 90;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  background: rgba(15, 15, 26, 0.98);
  border-left: 1px solid #333355;
  overflow-y: auto;
}
#town-right-panel.open { transform: translateX(0); }

/* Desktop: All panels persistent */
@media (min-width: 768px) {
  #town-left-panel,
  #town-right-panel {
    transform: none;
  }
  #town-center {
    left: 280px;
    right: 280px;
  }
}

/* Dialogue Modal */
#dialogue-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
#dialogue-box {
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  background: #1A1A2E;
  border: 1px solid #333355;
  border-radius: 12px;
  padding: 24px;
}
```

---

## Appendix B: Zone Mapping to Existing Code

| Zone | Current Implementation | Changes Needed |
|---|---|---|
| **Zone 1 (Header)** | `#town-topbar` | Rename to `#town-header`. Add resource chips. |
| **Zone 2 (Left Panel)** | `#town-npc-area` (inline) | Move to `#town-left-panel` (slide-in). Add quest cards. |
| **Zone 3 (Center)** | `#town-bg` + `#town-overlay` | Keep as-is. Add companion slots to center. |
| **Zone 4 (Right Panel)** | `#town-npc-area` (locations) | Move location cards + farming to `#town-right-panel` (slide-in). |
| **Zone 5 (Bottom Dock)** | `#town-actionbar` + `#town-companions` | Merge into unified `#town-dock`. Add companion strip. |
| **Dialogue Modal** | `#dialogue-overlay` | Update layout per §8. Add portrait + typewriter. |
| **Shop Overlay** | `#shop-overlay` | No changes needed. Already works as overlay. |
