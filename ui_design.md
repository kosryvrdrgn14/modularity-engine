# UI Design Specification

> **Version:** 1.0
> **Date:** August 23, 2026
> **Related:** `game_frame.md` (game framework), `11_svg_asset_spec.md` (assets), `12_codebase_map.md` (engine map)
> **Platform:** Web (mobile-first), playable on desktop and mobile browsers
> **Orientation:** Portrait-only

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Screen: World Map](#3-screen-world-map)
4. [Screen: Pre-Run Weapon Selection](#4-screen-pre-run-weapon-selection)
5. [Screen: Combat HUD](#5-screen-combat-hud)
6. [Screen: Town Hub](#6-screen-town-hub)
7. [Screen: Estate View](#7-screen-estate-view)
8. [Screen: Journal](#8-screen-journal)
9. [Screen: Party & Family](#9-screen-party--family)
10. [Screen: Skill Tree](#10-screen-skill-tree)
11. [Screen: Inventory](#11-screen-inventory)
12. [Overlay: Level-Up](#12-overlay-level-up)
13. [Overlay: NPC Dialogue](#13-overlay-npc-dialogue)
14. [Overlay: Game Over / Victory](#14-overlay-game-over--victory)
15. [Mobile-Specific Patterns](#15-mobile-specific-patterns)
16. [Design Tokens & Styling](#16-design-tokens--styling)
17. [Progressive Disclosure](#17-progressive-disclosure)
18. [Open Questions](#18-open-questions)

---

## 1. Design Principles

### Core Rules

1. **One thing at a time.** Each screen shows one system. No screen tries to show everything.
2. **Progressive complexity.** UI elements unlock as the player progresses. New players see 3 tabs; endgame players see 5.
3. **Glanceable first, detailed on tap.** Summary cards show status at a glance. Tap to drill in.
4. **Thumb-reachable.** Primary navigation lives at the bottom. Actions are in the lower 60% of the screen.
5. **No dead ends.** Every screen has a clear back path to the World Map.
6. **Mobile-native gestures.** Swipe, pull-to-refresh, long-press for context menus. Desktop gets keyboard shortcuts and hover states as enhancement.

### Visual Style

- **Dark theme primary.** Dark backgrounds (#0F0F1A) with light text. Reduces eye strain, makes colors pop.
- **Card-based layout.** Information lives in rounded cards with subtle borders. Cards group related data.
- **Accent color hierarchy.** Gold for currency, green for HP/positive, red for damage/negative, blue for XP, purple for rare/legendary.
- **Minimal text.** Icons + numbers first, labels second. Players scan visuals, not paragraphs.
- **Animation as feedback.** Subtle motion on state changes (quest complete, level up, item acquired). No animation for decoration.

---

## 2. Navigation Architecture

### Primary Navigation (Bottom Bar)

Visible on all screens **except combat**. 5 tabs, thumb-reachable.

```
┌──────────────────────────────────────────────┐
│                                              │
│              [SCREEN CONTENT]                │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│  🗺️ Map    👥 Party    📖 Journal    🌳 Skills    🎒 Inv  │
│    ▲          ▲            ▲           ▲         ▲      │
│  active     badge:2      badge:1     badge:     none   │
│                        (new quests)  (pts)             │
└──────────────────────────────────────────────┘
```

| Tab | Icon | Badge Logic | Shortcut Key (Desktop) |
|---|---|---|---|
| **Map** | Compass / Map icon | None (home screen) | `M` |
| **Party** | People / Heart icon | Count of family members with pending needs | `P` |
| **Journal** | Book / Scroll icon | Count of new/available quests | `J` |
| **Skills** | Tree / Star icon | Count of unspent skill points | `K` |
| **Inventory** | Bag / Chest icon | Count of new items (unviewed) | `I` |

### Navigation Rules

- **From any tab → Map:** Single tap on Map tab.
- **Tab switching:** Instant. No page transition animation (feels sluggish). Content fades in with a 100ms crossfade.
- **Deep links:** Tapping a quest in Journal can navigate to the relevant screen (e.g., "Talk to Gareth" → opens Party with Gareth selected).
- **Back button (Android/mobile):** Returns to Map from any screen. If in a sub-view (quest detail, NPC dialogue), goes back one level.
- **Combat mode:** Bottom bar hides. Combat HUD replaces it. Tab shortcuts still work to peek at Journal (overlay, not full switch).

### Screen Hierarchy

```
World Map (root)
├── Pre-Run Weapon Selection (modal, before entering a stage)
├── Town Hub
│   ├── NPC Dialogue (modal sheet, slides up)
│   ├── Shop (sub-screen within Town)
│   └── Building Management (sub-screen within Town)
├── Estate View (one per wife, carousel navigation)
│   ├── Family Quests (list within Estate View)
│   ├── Staff Management (sub-view)
│   └── Upgrade (sub-view)
├── Combat HUD (during runs)
│   ├── Level-Up Overlay (modal, pauses game)
│   └── Pause Menu (overlay)
├── Journal (full-screen tab)
│   ├── Quest Detail (expandable card)
│   └── Faction Standing (sub-tab within Journal)
├── Party & Family (full-screen tab)
│   ├── NPC Detail (expandable card)
│   └── Companion Management (sub-view)
├── Skill Tree (full-screen tab)
│   └── Node Detail (tooltip on tap)
└── Inventory (full-screen tab)
    ├── Equipment Detail (expandable card)
    └── Consumables (sub-tab within Inventory)
```

---

## 3. Screen: World Map

The central hub. The player returns here after every combat run and to navigate between all features.

### Layout

```
┌──────────────────────────────────────────┐
│  Gold: 1,250  🪙   Wood: 45  🪨 Stone: 30 │  ← Resource bar (sticky top)
├──────────────────────────────────────────┤
│                                          │
│          [INTERACTIVE MAP VIEW]           │
│                                          │
│    🏘️ Town ──── 🏠 Estate 1              │
│      │              │                    │
│      ├── 🏠 Estate 2                     │
│      │              │                    │
│    ⚔️ Stage 1 ── 🏠 Estate 3             │
│    (Graveyard)    (locked)               │
│      │                                   │
│    🔒 Stage 2                            │
│    (locked)                              │
│                                          │
├──────────────────────────────────────────┤
│  📌 Active Quest: "Clear 50 Zombies"     │  ← Sticky pinned quest
│     ████████░░░░░░ 32/50                  │
└──────────────────────────────────────────┘
```

### Elements

| Element | Behavior |
|---|---|
| **Resource bar** | Sticky top. Shows gold + primary resources. Always visible. Tap gold to see detailed breakdown. |
| **Map nodes** | Circular icons with location art. Tap to navigate. Locked nodes are greyed out with a lock icon. |
| **Connection lines** | Drawn between related nodes (Town → Estates, Town → Stages). Shows progression path. |
| **Pinned quest** | Sticky bottom. Shows the player's tracked quest with a progress bar. Tap to open Journal. |
| **Locked stages** | Greyed out. Tap shows unlock requirements ("Complete Stage 1 to unlock"). |
| **New quest indicator** | Pulsing dot on nodes that have available quests (Estate nodes, Town NPC nodes). |

### Interactions

| Gesture | Action |
|---|---|
| **Tap node** | Navigate to that screen (Town, Estate, Stage select) |
| **Long-press node** | Show tooltip with quick info (name, status, pending actions) |
| **Pinch to zoom** | Zoom map on desktop (scroll wheel) / mobile (pinch gesture) |
| **Drag to pan** | Pan the map if it extends beyond screen (mobile: two-finger drag) |

### Stage Nodes (Pre-Run Flow)

When the player taps a stage node, it opens the **Stage Detail → Weapon Selection** flow:

```
Stage Node Tap
  → Stage Detail Card (slides up from bottom)
    → "Select Loadout" button
      → Weapon Selection Screen (full screen)
        → "Launch" button
          → Combat
```

---

## 4. Screen: Pre-Run Weapon Selection

**New feature:** Before entering a stage, the player selects up to **3 starting weapons** from their unlocked pool. This replaces the default "start with W1 only" system and adds meaningful pre-run strategy.

### How Weapon Unlocks Work

| Source | Weapon Access |
|---|---|
| **Default** | W1 (Projectile) always unlocked from the start |
| **Level milestones** | W2 (Orbit) at player level 3, W3 (Area) at player level 6 (existing system) |
| **NPC shops** | Buy weapon unlock recipes from the Blacksmith or Merchant |
| **Quest rewards** | Certain quests grant weapon unlocks as rewards |
| **Faction reputation** | Faction-specific weapons unlock at Honored+ reputation |
| **Skill tree** | Some skill nodes unlock unique weapons |
| **Estate crafting** | Manor-tier estate enables the Workshop (craft weapons from materials) |
| **Boss drops** | Rare weapon drops from boss kills (low chance, high value) |

### Weapon Pool

The player's unlocked weapons are stored in `save_data.combat.unlockedWeapons[]`. Each weapon entry includes:

```json
{
  "id": "w1_projectile",
  "name": "Arcane Bolt",
  "type": "projectile",
  "tier": "common",
  "description": "Fires a magic projectile at the nearest enemy.",
  "baseStats": {
    "damage": 8,
    "cooldown": 0.6,
    "projectiles": 1,
    "speed": 300
  },
  "sprite": "w1_projectile",
  "source": "default"
}
```

### Selection Screen Layout

```
┌──────────────────────────────────────────┐
│  ← Back        STAGE 1: GRAVEYARD        │  ← Header
│                 Survive 5 minutes         │
├──────────────────────────────────────────┤
│                                          │
│  SELECT STARTING WEAPONS (0/3)           │
│                                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ ⚡  │ │ 🌀  │ │ 💥  │ │ 🔥  │       │  ← Weapon cards
│  │W1   │ │W2   │ │W3   │ │W4   │       │     (scrollable grid)
│  │Lv1  │ │Lv1  │ │Lv1  │ │LOCKED│       │
│  │     │ │     │ │     │ │  🔒  │       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│                                          │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ 🛡️  │ │ 🌑  │ │ 🌿  │               │
│  │W5   │ │W6   │ │W7   │               │
│  │LOCKED│ │LOCKED│ │LOCKED│               │
│  │  🔒  │ │  🔒  │ │  🔒  │               │
│  └─────┘ └─────┘ └─────┘               │
│                                          │
├──────────────────────────────────────────┤
│  SELECTED:                               │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ ⚡  │ │     │ │     │               │  ← Selected slots
│  │ W1  │ │ ?   │ │ ?   │               │     (tap to deselect)
│  └─────┘ └─────┘ └─────┘               │
│                                          │
│         [ ⚔️ LAUNCH STAGE ]              │  ← Enabled when 1+ selected
└──────────────────────────────────────────┘
```

### Weapon Card States

| State | Visual | Behavior |
|---|---|---|
| **Unlocked & Available** | Full color, icon + name + "Lv1" badge | Tap to select. Selected: blue border + checkmark. |
| **Selected** | Blue border, checkmark overlay, slight scale-up (1.05x) | Tap again to deselect. Moves back to pool. |
| **Locked** | Greyed out, lock icon overlay, 40% opacity | Tap shows tooltip: "Unlock by reaching Player Level X" or "Complete quest: [name]" |
| **Max Level** | Gold border (power spike indicator) | Shows "Lv7 MAX" badge. Tapping shows stat summary. |

### Selection Rules

| Rule | Details |
|---|---|
| **Min 1 weapon** | Player must select at least 1 weapon to launch. W1 is always available as fallback. |
| **Max 3 weapons** | Only 3 slots. Strategic choice — covering range vs. specialization. |
| **Duplicates?** | No. Each weapon can only be selected once per run. |
| **Level persistence** | Selected weapons start at their current unlock level (from previous runs or skill tree). No reset. |
| **NPC companion weapons** | NPC companions bring their own weapons. Player selection is independent. |

### Weapon Detail Panel (Tap on weapon card)

When the player taps an unlocked weapon card, a detail panel slides up:

```
┌──────────────────────────────────────────┐
│  ⚡ ARCANE BOLT (W1)           Common    │
│                                          │
│  Fires a magic projectile at the         │
│  nearest enemy.                          │
│                                          │
│  Stats:                                  │
│  Damage: 8    Cooldown: 0.6s            │
│  Projectiles: 1    Speed: 300            │
│                                          │
│  Power Spikes:                           │
│  Lv4: +1 projectile, +20% damage        │
│  Lv7: Piercing, +50% damage             │
│                                          │
│  Source: Default (always unlocked)        │
│                                          │
│  [ SELECT ]    [ CANCEL ]               │
└──────────────────────────────────────────┘
```

### Desktop Keyboard Shortcuts

| Key | Action |
|---|---|
| `1`-`7` | Toggle weapon in that grid position |
| `Enter` | Launch with current selection |
| `Esc` | Back to map |

---

## 5. Screen: Combat HUD

Minimal. Only moment-to-moment information. Everything else waits until the run is over.

### Layout

```
┌──────────────────────────────────────────┐
│ ❤️ ████████░░░░ 72/100    ⭐ Lv.7       │  ← HP bar + Level
│ 📊 ██████░░░░░░ 420/600  🪙 125         │  ← XP bar + Gold
├──────────────────────────────────────────┤
│                                          │
│                                          │
│                                          │
│              [GAME AREA]                 │
│            (canvas renders here)         │
│                                          │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ ⚡W1 Lv4  🌀W2 Lv2  💥W3 Lv1           │  ← Weapon bar
│ 📌 "Kill 50" ████░░░░░░ 32/50           │  ← Pinned quest
└──────────────────────────────────────────┘
```

### Elements

| Element | Position | Details |
|---|---|---|
| **HP bar** | Top-left, 32px height | Red gradient fill. Pulses red when below 25%. Shakes on hit. |
| **Level badge** | Top-right of HP bar | Gold circle with level number. Pulses on level up. |
| **XP bar** | Below HP bar, 20px height | Blue gradient fill. Flashes white on XP gain. |
| **Gold counter** | Right of XP bar | Gold coin icon + number. Animates count-up on pickup. |
| **Weapon bar** | Bottom, above pinned quest | 3 weapon icons with level badges. Grey if weapon not yet unlocked. Shows current cooldown as a circular progress overlay. |
| **Pinned quest** | Bottom strip | Single line: icon + description + progress bar. Tap to expand (pauses game, shows full details). |

### HUD Scaling

| Screen Width | HP Bar | Weapon Icons | Font |
|---|---|---|---|
| **< 400px** (small phone) | 28px height | 36×36px | 12px base |
| **400-768px** (phone/tablet) | 32px height | 44×44px | 14px base |
| **> 768px** (desktop) | 36px height | 52×52px | 16px base |

### Combat Animations

| Event | Animation | Duration |
|---|---|---|
| **Player hit** | HP bar flash red + screen shake (2px, 0.1s) | 0.15s |
| **Enemy kill** | Gold counter animates +1, floating "+5g" text | 0.5s |
| **Level up** | Full-screen radial flash + level badge pulse + "LEVEL UP" text | 1.0s |
| **Boss spawn** | Screen shake (8px, 0.5s) + boss warning overlay | 0.5s |
| **Weapon fire** | Weapon icon briefly highlights (cooldown sweep) | Per-weapon cooldown |

---

## 6. Screen: Town Hub

The social and economic center. Player visits between runs to spend gold, talk to NPCs, and manage buildings.

### Layout

```
┌──────────────────────────────────────────┐
│  ← Map     TOWN HUB      🪙 1,250       │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🏪 Blacksmith                    │    │  ← Building cards
│  │ "Need something forged?"          │    │     Tap to enter shop/craft
│  │ Status: Open  │  Workers: 2/2     │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🍺 Tavern                        │    │
│  │ "Pull up a chair!"               │    │
│  │ Status: Open  │  Staff: 3/5      │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📚 Library         🔒 Locked     │    │
│  │ Requires: Town Pop 15+            │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🏛️ Arena          🔒 Locked     │    │
│  │ Requires: Quest "Trial of Steel"  │    │
│  └──────────────────────────────────┘    │
│                                          │
├──────────────────────────────────────────┤
│  NPCs in Town:                           │
│  🟢 Gareth (Blacksmith)  ❤️ Lv.3        │  ← NPCs currently in town
│  🟢 Elara (Herbalist)    ❤️ Lv.2        │     Green = available to talk
│  🟡 Merchant              ❤️ Lv.1        │     Yellow = has quest available
│  ⚪ Innkeeper             ❤️ Lv.0        │     Grey = nothing new
└──────────────────────────────────────────┘
```

### Building Cards

| State | Visual | Behavior |
|---|---|---|
| **Open** | Full color, status text green | Tap to enter (opens shop/craft/npc list) |
| **Locked** | Greyed, lock icon, requirements listed | Tap shows full unlock requirements |
| **Upgrading** | Amber border, progress indicator | Tap shows upgrade progress and ETA |
| **Full** | Green "Full" badge on staff count | Tap enters but shows "Hire more staff?" prompt |

### NPC List

- NPCs are listed below buildings
- **Color coding:** Green (talk available), Yellow (quest available), Grey (nothing new)
- **Affection badge:** Shows current trust level with heart icon
- Tap NPC → opens NPC Dialogue (modal sheet)
- If NPC has a quest, the quest icon pulses

---

## 7. Screen: Estate View

One estate at a time. Swipe between estates (carousel). Each estate shows its household status.

### Layout (Single Estate)

```
┌──────────────────────────────────────────┐
│  ← Map    IRONHAND MANOR    Tier 3  🏠  │
│           Wife: Gareth                   │
│  ● ○ ○ (3 estates, viewing #1)          │  ← Dot indicators (swipe)
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 👨‍👩‍👧‍👦 FAMILY                       │    │
│  │ Gareth (❤️ Lv.5)  + Elise (wife) │    │  ← Family card
│  │ Children: 2                       │    │
│  │  ├─ Tomas (Child)  📈 Growing     │    │
│  │  └─ Lily (Toddler) 📈 Growing     │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📋 FAMILY QUESTS (2 available)   │    │  ← Quest section
│  │  ├─ "Tomas needs herbs"  ⚡ NEW  │    │     Tap to expand
│  │  └─ "Fix the fence"      ⚡ NEW  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🏗️ BUILDINGS                     │    │  ← Estate buildings
│  │  ├─ House      Lv.3 ████████░░  │    │
│  │  ├─ Farmlands  Lv.2 ██████░░░░  │    │
│  │  └─ Workshop   Lv.1 ████░░░░░░  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 👷 STAFF (3/5)          [Manage] │    │  ← Staff card
│  │  Farmer  │  Cook  │  Guard       │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [ 💍 Upgrade Estate ]                   │  ← Primary action
└──────────────────────────────────────────┘
```

### Swipe Navigation

| Gesture | Action |
|---|---|
| **Swipe left/right** | Switch between estates (dot indicators update) |
| **Tap quest** | Opens quest detail (modal sheet) |
| **Tap "Manage"** | Opens staff management sub-view |
| **Tap "Upgrade Estate"** | Opens upgrade panel with costs and requirements |

### Empty State (No Estates Yet)

```
┌──────────────────────────────────────────┐
│  ← Map     YOUR ESTATES                  │
├──────────────────────────────────────────┤
│                                          │
│         [No estates built yet]           │
│                                          │
│    Build an estate to provide for        │
│    someone special.                      │
│                                          │
│    Requirements:                         │
│    • Affection Lv.3+ with an NPC         │
│    • 200g + 30 wood                      │
│    • Complete quest: "A Place to Call     │
│      Home"                               │
│                                          │
│         [ 💍 Start Courting ]            │
└──────────────────────────────────────────┘
```

---

## 8. Screen: Journal

The information hub. Quests, faction standing, and story log. Always accessible via the bottom tab.

### Tabs within Journal

```
┌──────────────────────────────────────────┐
│  ← Map        JOURNAL                    │
├──────────────────────────────────────────┤
│  [ All ] [ Story ] [ Family ] [ Faction ]│  ← Filter tabs
├──────────────────────────────────────────┤
│                                          │
│  📌 PINNED (max 3)                       │
│  ┌──────────────────────────────────┐    │
│  │ ⚔️ Clear the Graveyard  32/50    │    │
│  │ ████████████░░░░░░░░  64%        │    │  ← Always visible
│  └──────────────────────────────────┘    │
│                                          │
│  🏠 FAMILY QUESTS (2)              [▸]   │  ← Collapsible
│  ⚔️ ACTIVE (5)                     [▸]   │
│  🏛️ FACTION (1)                    [▸]   │
│  ✅ COMPLETED (12)                  [▸]   │
│                                          │
│  ── FACTION STANDING ──                  │
│  🟡 Wanderers     ████████░░  Honored   │
│  🔵 Forge Brotherhood  ██████░░░░ Friendly│
│  🟣 Shadow Covenant   ██░░░░░░░░ Distant │
│                                          │
└──────────────────────────────────────────┘
```

### Quest List Item

```
┌──────────────────────────────────────────┐
│ 🟡  "Tomas needs herbs for medicine"     │  ← Color = quest type
│     Family Quest • Ironhand Manor        │
│     Gather 5 Thornwood Herbs (2/5)       │
│     ████░░░░░░░░░░░░░░░  40%            │
│                                          │
│     Reward: +Affection, +Herb Recipe     │
│                                          │
│     [ 📌 Pin ]  [ View Details ]         │  ← Actions
└──────────────────────────────────────────┘
```

### Quest Type Colors

| Type | Color | Icon |
|---|---|---|
| **Main** | Gold | ⭐ |
| **Side** | Blue | 📋 |
| **Family** | Green | 🏠 |
| **Faction** | Purple | 🏛️ |
| **Repeatable** | Orange | 🔄 |
| **Hidden** | Grey (reveals color on completion) | ❓ |

### Interactions

| Gesture | Action |
|---|---|
| **Tap quest** | Expand to full detail view |
| **Long-press quest** | Context menu: Pin / Abandon / Track on map |
| **Swipe left on quest** | Quick-pin |
| **Swipe right on quest** | Abandon (with confirmation) |
| **Pull down** | Refresh quest list (check for new family quests) |
| **Tap filter tab** | Filter quests by type |

---

## 9. Screen: Party & Family

View all NPC relationships, current companions, and family status.

### Layout

```
┌──────────────────────────────────────────┐
│  ← Map        PARTY & FAMILY             │
├──────────────────────────────────────────┤
│  COMPANION SLOTS (2/4)                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ ⚔️   │ │ 🌿   │ │  +   │ │  +   │   │  ← Companion slots
│  │Gareth│ │ Elara│ │empty │ │empty │   │     Tap to swap/remove
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
├──────────────────────────────────────────┤
│  ALL NPCs                                │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ ⚔️ Gareth        ❤️ Lv.5  ★★★★☆  │    │  ← NPC cards
│  │ Blacksmith • Forge Brotherhood    │    │     Tap for detail
│  │ Companion (Adept)                 │    │
│  │ +20% damage in combat             │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🌿 Elara         ❤️ Lv.3  ★★★☆☆  │    │
│  │ Herbalist • Wanderers             │    │
│  │ Companion (Apprentice)            │    │
│  │ +1 HP/sec in combat               │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📦 Merchant       ❤️ Lv.1  ★☆☆☆☆  │    │
│  │ Trader • Unaffiliated             │    │
│  │ Not in party                      │    │
│  │ 3x affection if brought as DW     │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 👶 Ani            ❤️ Lv.0  ☆☆☆☆☆  │    │
│  │ Child (Toddler) • Ironhand Manor  │    │
│  │ Unavailable (too young)           │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### NPC Card States

| State | Visual | Action |
|---|---|---|
| **Active Companion** | Blue border, "Companion" badge | Tap to view stats/swap |
| **Available** | Default border, "Tap to add" hint | Tap to add to party |
| **Locked/Unavailable** | Greyed, lock reason shown | Tap shows why unavailable |
| **Dead Weight** | Orange "Dead Weight" badge | Shows 3x affection multiplier |

### NPC Detail View (Tap card)

```
┌──────────────────────────────────────────┐
│  ⚔️ GARETH                               │
│  Blacksmith • Forge Brotherhood           │
│                                          │
│  ❤️ Trust: Lv.5 ████████████████░░ 87%  │
│                                          │
│  Role: Adept Companion                   │
│  Combat Bonus: +30% damage              │
│  Passive: Crafts discounted weapons      │
│                                          │
│  ── AVAILABLE QUESTS ──                  │
│  📋 "Gareth's Lost Hammer" (Main)       │
│  📋 "Stock the Forge" (Repeatable)      │
│                                          │
│  ── DIALOGUE ──                          │
│  "The forge is warm. What do you need?"  │
│  [ 💬 Talk ]  [ 🎁 Gift ]  [ ⚔️ Deploy ] │
└──────────────────────────────────────────┘
```

---

## 10. Screen: Skill Tree

5-branch tree with ~50-60 nodes. Zoomable, scrollable canvas.

### Layout

```
┌──────────────────────────────────────────┐
│  ← Map     SKILL TREE     Points: 12 ⭐  │
├──────────────────────────────────────────┤
│                                          │
│  [ Combat ] [ Town ] [ Explorer ]        │  ← Branch tabs
│  [ Survival ] [ Arcane ]                 │
│                                          │
│         ┌───────┐                        │
│         │ ROOT  │                        │
│         └───┬───┘                        │
│        ┌────┴────┐                       │
│    ┌───┴───┐ ┌───┴───┐                  │
│    │ Node  │ │ Node  │                  │
│    └───┬───┘ └───┬───┘                  │
│    ┌───┴───┐ ┌───┴───┐                  │
│    │ Node  │ │ Node  │                  │
│    │ ★NEW  │ │       │                  │  ← Unlocked nodes
│    └───────┘ └───────┘                  │
│                                          │
│  ── BRANCH: COMBAT ──                    │
│  Unlocked: 8/12  │  Next: "Piercing"    │
│  Requires: Lv.5 Combat Branch           │
└──────────────────────────────────────────┘
```

### Node States

| State | Visual | Behavior |
|---|---|---|
| **Unlocked** | Full color, filled | Tap shows what it does |
| **Available** | Bright outline, pulsing glow | Tap to unlock (spends skill point) |
| **Locked** | Greyed, lock icon | Tap shows prerequisites |
| **New (just unlocked)** | Animated sparkle | Draws attention |

---

## 11. Screen: Inventory

Equipment, consumables, and resource summary.

### Layout

```
┌──────────────────────────────────────────┐
│  ← Map       INVENTORY                   │
├──────────────────────────────────────────┤
│  [ Equipment ] [ Consumables ] [ Resources]│ ← Sub-tabs
├──────────────────────────────────────────┤
│                                          │
│  EQUIPPED                                │
│  ┌──────────────────────────────────┐    │
│  │ Weapon: ⚡ Iron Sword    ATK +12  │    │
│  │ Armor:  🛡️ Leather Vest  DEF +8  │    │
│  │ Ring:   💍 Empty                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  BACKPACK (8/20 slots)                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │ ⚔️  │ │ 🛡️  │ │ 🧪  │ │ 📜  │           │  ← Item grid
│  │ x1  │ │ x1  │ │ x3  │ │ x1  │           │
│  └────┘ └────┘ └────┘ └────┘           │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │ 💎  │ │ 🪵  │ │ 🪨  │ │ ⬜  │           │
│  │ x5  │ │ x45 │ │ x30 │ │empty│           │
│  └────┘ └────┘ └────┘ └────┘           │
│                                          │
│  ── RESOURCES ──                         │
│  🪙 Gold: 1,250   🪵 Wood: 45           │
│  🪨 Stone: 30     ⛏️ Ore: 12            │
└──────────────────────────────────────────┘
```

---

## 12. Overlay: Level-Up

Full-screen modal. Pauses the game. Appears on character level up.

### Layout

```
┌──────────────────────────────────────────┐
│                                          │
│            ⭐ LEVEL UP! ⭐               │
│              Level 7 → 8                 │
│                                          │
│  CHOOSE AN UPGRADE:                      │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ ⚔️ Damage Up                     │    │  ← Card 1
│  │ +15% base damage                 │    │     Tap to select
│  │              [ 1 ]               │    │     or press key 1
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🌀 Orbit Up                      │    │  ← Card 2
│  │ Lv 2 → 3                         │    │
│  │              [ 2 ]               │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ ❤️ Health Up                     │    │  ← Card 3
│  │ +20 max HP & heal                │    │
│  │              [ 3 ]               │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

### Card Design

| Property | Value |
|---|---|
| **Card size** | 90% width, auto height, 16px gap between cards |
| **Card background** | `#1A1A2E` with `1px solid #333` border |
| **Selected state** | `2px solid #4FC3F7` border, slight scale (1.02x) |
| **Key badge** | Bottom-right, shows `1` / `2` / `3` |
| **Mobile** | Cards stack vertically, tap to select |
| **Desktop** | Cards stack vertically, press `1`/`2`/`3` |

### Queued Level-Ups

If the player gains multiple levels at once, a counter shows:

```
⭐ LEVEL UP! (2 remaining after this choice)
```

The overlay stays open until all queued level-ups are resolved.

---

## 13. Overlay: NPC Dialogue

Modal sheet that slides up from the bottom. Used for conversations, gifting, and shops.

### Layout

```
┌──────────────────────────────────────────┐
│ ─── (drag handle)                        │  ← Swipe down to dismiss
│                                          │
│  ⚔️ GARETH                    ❤️ Lv.5   │
│  "The forge is warm today. What brings   │
│   you here?"                             │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 💬 "I need weapons forged."      │    │  ← Dialogue option
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │ 🎁 "I brought you a gift."       │    │  ← Dialogue option
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │ 📋 "Do you have any work?"       │    │  ← Dialogue option
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │ 👋 "Just passing through."       │    │  ← Exit option
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### Dialogue Options

| Icon | Type | Behavior |
|---|---|---|
| 💬 | Standard dialogue | Advances conversation, may trigger quest |
| 🎁 | Gift | Opens gift selection (consumables from inventory) |
| 📋 | Quest | Shows available quest from this NPC |
| ⚔️ | Shop/Trade | Opens the NPC's shop (Blacksmith, Merchant) |
| 👋 | Exit | Closes dialogue, returns to previous screen |

---

## 14. Overlay: Game Over / Victory

Full-screen overlay. Appears when the run ends.

### Layout

```
┌──────────────────────────────────────────┐
│                                          │
│            [DEFEAT] or [VICTORY]         │  ← Result banner
│                                          │
│  ── RUN SUMMARY ──                       │
│  Time:  3:42                             │
│  Level: 9                                │
│  Kills: 127                              │
│  Gold:  185                              │
│  Boss:  Defeated ✓ (or Not Reached)     │
│                                          │
│  ── QUEST PROGRESS ──                    │
│  ✅ "Clear 50 Zombies" → Complete!       │
│  🔄 "Gather Herbs" 2/5                   │
│  🏠 "Tomas needs medicine" 0/5           │
│                                          │
│  ── REWARDS ──                           │
│  🪙 +185 Gold                            │
│  ⭐ +45 XP                               │
│  📜 Quest: "Clear 50 Zombies" complete!  │
│  ❤️ +1 Affection (Gareth, companion)     │
│                                          │
│  [ 🔄 Try Again ]  [ 🗺️ World Map ]      │
└──────────────────────────────────────────┘
```

### Animations

| Element | Animation |
|---|---|
| **Result banner** | Scale-in from 0.5x → 1x with bounce (0.3s) |
| **Stats** | Stagger fade-in, 100ms delay between each |
| **Rewards** | Count-up animation for gold/XP (numbers roll up) |
| **Quest progress** | Checkmark animation on completed quests |
| **New unlocks** | Sparkle animation + "NEW" badge |

---

## 15. Mobile-Specific Patterns

### Touch Targets

| Element | Min Size | Notes |
|---|---|---|
| **Bottom nav tabs** | 48×48px | With 8px padding |
| **Quest list items** | 100% width × 64px min | Easy to tap, hard to miss |
| **Weapon cards** | 80×80px | Large enough for icon + label |
| **Dialogue options** | 100% width × 56px | Full-width tap targets |
| **Skill tree nodes** | 44×44px | With spacing between nodes |

### Gesture Map

| Gesture | Context | Action |
|---|---|---|
| **Tap** | Everywhere | Primary action (select, open, navigate) |
| **Long-press** | Quest items, NPCs | Context menu (pin, abandon, gift) |
| **Swipe left** | Quest in Journal | Quick-pin to tracked |
| **Swipe right** | Quest in Journal | Abandon (with undo) |
| **Swipe left/right** | Estate carousel | Switch between estates |
| **Pull down** | Quest log, estate view | Refresh (check for new quests) |
| **Pinch** | World map, skill tree | Zoom in/out |
| **Two-finger drag** | World map, skill tree | Pan when zoomed |
| **Swipe down** | Modal sheets | Dismiss overlay |

### Orientation Behavior

| Orientation | Behavior |
|---|---|
| **Portrait** | Primary layout. All screens designed for this first. |
| **Landscape** | Combat HUD expands horizontally. Map shows more nodes. Skill tree shows more branches. No re-layout needed — just wider content area. |

### Bottom Safe Area

All bottom navigation and interactive elements respect the device safe area (notch, home indicator). Use `env(safe-area-inset-bottom)` padding.

---

## 16. Design Tokens & Styling

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#0F0F1A` | Screen background |
| `--bg-card` | `#1A1A2E` | Card backgrounds |
| `--bg-card-hover` | `#222240` | Card hover/active state |
| `--border-default` | `#333355` | Card borders |
| `--border-accent` | `#4FC3F7` | Selected/active borders |
| `--text-primary` | `#E8E8F0` | Main text |
| `--text-secondary` | `#8888AA` | Labels, descriptions |
| `--text-muted` | `#555577` | Disabled text |
| `--gold` | `#FFD700` | Currency, rewards, rarity |
| `--hp-green` | `#4CAF50` | HP bar, positive |
| `--hp-red` | `#F44336` | Damage, critical |
| `--xp-blue` | `#42A5F5` | XP bar, experience |
| `--family-green` | `#66BB6A` | Family quests, affection |
| `--faction-purple` | `#AB47BC` | Faction content |
| `--quest-gold` | `#FFC107` | Main quests |
| `--quest-blue` | `#42A5F5` | Side quests |
| `--locked-grey` | `#555577` | Locked content |

### Typography

| Element | Font Size | Weight | Line Height |
|---|---|---|---|
| **Screen title** | 24px | Bold (700) | 32px |
| **Section header** | 18px | SemiBold (600) | 24px |
| **Card title** | 16px | Medium (500) | 22px |
| **Body text** | 14px | Regular (400) | 20px |
| **Caption/label** | 12px | Regular (400) | 16px |
| **Badge number** | 11px | Bold (700) | 16px |

**Font:** System default stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). No custom font loading — keeps the single-file format clean.

### Spacing

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | Icon gaps, inline spacing |
| `--space-sm` | 8px | Card padding, list gaps |
| `--space-md` | 16px | Section gaps, card margins |
| `--space-lg` | 24px | Screen padding, major sections |
| `--space-xl` | 32px | Top/bottom screen margins |

### Border Radius

| Element | Radius |
|---|---|
| **Cards** | 12px |
| **Buttons** | 8px |
| **Badges/pills** | 999px (full round) |
| **Avatars/icons** | 50% (circle) |
| **Bottom nav** | 0 (flush to edge) |

---

## 17. Progressive Disclosure

The UI unlocks features as the player progresses. This prevents overwhelm and makes each unlock feel significant.

### Unlock Timeline

| Player Progress | UI Changes |
|---|---|
| **Start of game** | Map + Combat + Inventory only. Bottom bar: 2 tabs (Map, Inventory). Journal and Party locked. |
| **First NPC interaction** | Party tab unlocks. Bottom bar: 3 tabs (Map, Party, Inventory). |
| **First quest received** | Journal tab unlocks. Bottom bar: 4 tabs. Pinned quest appears on Map. |
| **Town unlocked** | Town node appears on map. Building cards show in Town. |
| **First estate built** | Estate nodes appear on map. Family tab section in Party. |
| **First wife** | Full Estate View unlocks. Family quests begin. Estate carousel. |
| **First faction contact** | Faction standing section in Journal. Faction filter tab. |
| **Skill tree unlocked** | Skills tab unlocks. Bottom bar: 5 tabs (full). |
| **5+ unlocked weapons** | Weapon selection screen appears before stage runs. |

### Locked State Communication

When a tab is locked, tapping it shows a non-intrusive toast:

```
┌──────────────────────────────────────────┐
│  🔒 Journal unlocks when you receive     │
│     your first quest.                    │
└──────────────────────────────────────────┘
```

Toast auto-dismisses after 3 seconds. No blocking modal.

---

## 18. Design Decisions (Answered)

### Q1: Starting Weapons — DECIDED

**Multiple weapons from the start.** Players choose a character type that comes with a specific weapon set (3 weapons). All 3 active immediately. Weapons start at reduced base stats (~60%) to allow progression while keeping the same mechanics. Power spikes at Lv4 and Lv7 still apply.

**Character weapon sets:**
| Character | W1 | W2 | W3 | Theme |
|---|---|---|---|---|
| Survivor (default) | Projectile | Orbit | Area | Balanced |
| Berserker | Melee Sweep | Spin Attack | Ground Pound | Aggression |
| Mage | Chain Lightning | Orbital Spells | AoE Blast | Magic |
| Ranger | Multi-Shot | Traps | Bombardment | Ranged |
| Support | Healing Pulse | Shield Wave | Buff Aura | Teamplay |

### Q2: 20+ Weapons Grid — DECIDED

**Category tabs with sub-filters.** Tab system: All | Default | Suggested | Favorites | then type sub-filters: Melee | Ranged | Magic | Support.

- **Default:** Character's starting set (highlighted)
- **Suggested:** Weapons recommended for the next stage
- **Favorites:** Player-pinned (long-press to favorite)
- **Type filters:** Melee/Ranged/Magic/Support sub-tabs

Grid: 4 columns mobile, 6 columns desktop. Scrollable. Android fully supported (standard Material Design tabs + RecyclerView pattern).

### Q3: NPC Companion Weapons — DECIDED

**NPC weapons show in the weapon bar.** NPC weapons appear as smaller icons with colored NPC border. Bar becomes: `[PW1] [PW2] [PW3] [NPC1] [NPC2]`.

**NPC level scaling:** NPCs auto-level to match the player's current level. Stats scale at reduced rate (10-50% of player damage depending on trust tier). No manual NPC upgrade management — they stay relevant throughout the run.

### Q4: Estate Quest Notifications — DECIDED

**Cap at 3 visible estate quests.** Additional quests queued, appear as current ones complete.

**"Visit All Estates" option:** After every 5 runs, a free prompt lets the player check all families in one visit — summary cards per estate, bulk needs addressing. Prevents neglect feeling.

Badge on Journal tab shows count. No combat pop-ups. Estate quests in Journal under "Family" tab.

### Q5: Skill Tree Navigation — DECIDED

**Three navigation modes:**
1. **Suggested (Default):** Highlights recommended next nodes with glow effect. Tap to select, confirm to unlock.
2. **Randomize:** Shuffles visual layout for discovery. Same data, different arrangement.
3. **List:** Vertical list of all nodes sorted by branch and cost. For readers over spatial navigators.

**Interactions:** Mobile: tap + confirm, drag to pan, pinch to zoom. Desktop: click + confirm, scroll to pan, wheel to zoom. Branch tabs at top switch between 5 branches.

### Q6: Inventory — DECIDED

**Grid with cap + gift/surplus system.**
- **Starting capacity:** 24 slots (6×4 mobile)
- **Expansion:** Warehouse upgrades +8 slots/level (max 48)
- **Equipment slots:** Separate (Weapon, Armor, Accessory, Relic)
- **Resources:** Counters, not slots

**Gift system:** When full or holding low-level items:
- **Gift to estates:** Wife/children use them → affection + dialogue
- **Blacksmith:** Recycles weapons → materials
- **Market:** Sells items → gold
- **Surplus quests:** Auto-generated ("Blacksmith needs 3 iron swords")

Long-press item → Equip, Gift, Drop, Study. Drag to estate slot for direct gifting.

### Q7: Portrait vs Landscape for Combat

Vampire Survivors is typically landscape. Should we enforce landscape for combat, or support both?

**Decision (Aug 29):** Portrait-only for now. Mobile-first UI. PC layout migration deferred — user will notify when ready. When migrating: PC gets side rails always visible, hover states, keyboard shortcuts. Mobile keeps slide-in panels, touch-optimized targets.
