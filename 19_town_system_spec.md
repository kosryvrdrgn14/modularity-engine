# Town System Specification

> **⚠️ Partially Superseded:** Navigation system, location hierarchy, and NPC placement are now defined in `22_city_builder_location_system.md`. This spec remains valid for the **dialogue system** (§4) and **NPC data structure** (§5).
>
> **Game Version:** v0.2.0+
> **Date:** August 24, 2026
> **Parent:** `17_implementation_roadmap.md` Steps 7-9
> **Assets:** 4 SVGs created (`town_refugee_camp.svg`, `town_wooden_shacks.svg`, `npc_old_man.svg`, `npc_cute_girl.svg`)

---

## Table of Contents

1. [Overview](#1-overview)
2. [State Flow](#2-state-flow)
3. [Town Screen Layout](#3-town-screen-layout)
4. [Dialogue System](#4-dialogue-system)
5. [NPC Data Structure](#5-npc-data-structure)
6. [Town Progression](#6-town-progression)
7. [Implementation Steps](#7-implementation-steps)
8. [Assets Created](#8-assets-created)

---

## 1. Overview

After combat ends (win or lose), the player transitions to the **Town Screen** — a refugee camp that serves as the game's hub. The town starts as a rough camp with tents and a campfire. The player can:

- View their run stats (time, level, kills, gold)
- Talk to NPCs (old man refugee, cute girl after upgrade)
- Spend gold to upgrade the camp
- Return to combat

The town is **not** canvas-rendered — it's an HTML overlay with SVG backgrounds and CSS-styled dialogue boxes. This keeps the UI complex but maintainable.

---

## 2. State Flow

```
Combat Ends (win/lose)
  │
  ▼
┌──────────┐
│ gameOver │ ── shows end screen overlay ──┐
└──────────┘                                │
                                            ▼
                                    ┌──────────┐
                                    │   town   │ ← New state
                                    └────┬─────┘
                                         │
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                    ┌──────────┐  ┌──────────┐  ┌──────────┐
                    │  Stats   │  │ Dialogue │  │ Upgrade  │
                    │  Screen  │  │  Screen  │  │  Screen  │
                    └──────────┘  └──────────┘  └──────────┘
                          │              │              │
                          └──────────────┼──────────────┘
                                         │
                                    "Return to Combat"
                                         │
                                         ▼
                                    ┌──────────┐
                                    │  combat  │
                                    └──────────┘
```

### Valid State Transitions

| From | To | Trigger |
|---|---|---|
| `gameOver` | `endScreen` | Show stats overlay |
| `endScreen` | `town` | Click "Continue to Town" |
| `town` | `town` (sub-screen) | Click Stats/Dialogue/Upgrade |
| `town` | `combat` | Click "Return to Combat" |
| `town` | `title` | Click "Return to Title" (optional) |

---

## 3. Town Screen Layout

### Refugee Camp (Phase 1) — Initial State

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐│
│  │                                                     ││
│  │         [Background: town_refugee_camp.svg]         ││
│  │                                                     ││
│  │    ★ Night sky, campfire with animated flames,      ││
│  │      rough tents, moonlight                         ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─── Top Bar ────────────────────────────────────────┐│
│  │  Refugee Camp          💰 150 Gold    ⏱ 4:32 Lv8  ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─── NPC Area ───────────────────────────────────────┐│
│  │                                                     ││
│  │  ┌──────┐  "Welcome back, traveler.               ││
│  │  │ OLD  │   The road has been dangerous,           ││
│  │  │ MAN  │   but we're alive."                      ││
│  │  │ POR- │                                          ││
│  │  │ TRAIT│  [Talk to Refugees]                      ││
│  │  └──────┘  [Upgrade Camp — 100g]                   ││
│  │                                                     ││
│  │  (Cute girl slot: LOCKED — unlock by upgrading)    ││
│  │                                                     ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─── Bottom Bar ─────────────────────────────────────┐│
│  │  [Return to Combat]    [Return to Title]           ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Wooden Shacks (Phase 2) — After 100g Upgrade

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐│
│  │                                                     ││
│  │        [Background: town_wooden_shacks.svg]         ││
│  │                                                     ││
│  │    ★ Better buildings, stone campfire ring,         ││
│  │      chimney smoke, warm window glow                ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─── Top Bar ────────────────────────────────────────┐│
│  │  Refugee Camp (Upgraded)   💰 50 Gold   ⏱ 4:32 Lv8││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─── NPC Area ───────────────────────────────────────┐│
│  │                                                     ││
│  │  ┌──────┐  "The shacks keep the rain off.         ││
│  │  │ OLD  │   Better than tents, that's for sure."   ││
│  │  │ MAN  │                                          ││
│  │  │ POR- │  [Talk to Refugees]                      ││
│  │  │ TRAIT│                                          ││
│  │  └──────┘                                          ││
│  │                                                     ││
│  │  ┌──────┐  "Oh! You fixed up the camp!            ││
│  │  │CUTE  │   I'm... I'm Lina. Thank you."          ││
│  │  │GIRL  │                                          ││
│  │  │ POR- │  [Talk to Lina]  ← NEW                   ││
│  │  │ TRAIT│                                          ││
│  │  └──────┘                                          ││
│  │                                                     ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─── Bottom Bar ─────────────────────────────────────┐│
│  │  [Return to Combat]    [Return to Title]           ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 4. Dialogue System

### Visual Design

```
┌─────────────────────────────────────────────────┐
│  ┌──────┐                                       │
│  │ NPC  │  "Dialogue text appears here.         ││
│  │ POR- │   It scrolls in character by           ││
│  │ TRAIT│   character for a RPG feel."           ││
│  │      │                                        ││
│  └──────┘                                        ││
│                                                 ││
│  ┌─── Choices ──────────────────────────────────┐│
│  │ 1. "Tell me about the camp."                 ││
│  │ 2. "Have you seen anything strange?"          ││
│  │ 3. [End Conversation]                         ││
│  └──────────────────────────────────────────────┘│
│                                                 ││
│  ┌─── Response ─────────────────────────────────┐│
│  │ "Well, there are stories of a graveyard      ││
│  │  nearby. The dead don't rest easy there."    ││
│  │                                               ││
│  │              [Continue]                       ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Dialogue Flow

```
NPC Greeting (auto)
  │
  ▼
Player sees choices (2-3 options)
  │
  ├─→ Option A → NPC Response → [Continue] → back to choices
  ├─→ Option B → NPC Response → [Continue] → back to choices
  └─→ Option C (End) → close dialogue, return to town
```

### Text Rendering

- **Font:** Serif (Georgia or system serif) — RPG feel
- **Text color:** `#E0D0C0` (warm parchment)
- **Typewriter effect:** Characters appear one at a time (30ms per char)
- **Click/tap to skip:** Immediately shows full text
- **Background:** Semi-transparent dark panel with border

---

## 5. NPC Data Structure

### Embedded Data (in game2.html)

```javascript
NPC_DATA: {
  old_man: {
    id: 'old_man',
    name: 'Elder Rowan',
    portrait: 'npc_old_man',
    unlocked: true,  // Available from start
    dialogue: {
      greeting: "Welcome back, traveler. The road has been dangerous, but we're alive.",
      topics: [
        {
          id: 'about_camp',
          text: 'Tell me about the camp.',
          response: "We were farmers, merchants, refugees... The Gravekeeper's rise drove us here. These tents are all we have left.",
          affection: 0,
        },
        {
          id: 'about_graveyard',
          text: 'Have you seen anything strange?',
          response: "The graveyard to the east... The dead don't rest easy there. Something ancient keeps them rising. Be careful if you go back.",
          affection: 0,
          flag: 'graveyard_warning',
        },
        {
          id: 'end',
          text: '[End Conversation]',
          response: null,
          close: true,
        }
      ]
    }
  },
  cute_girl: {
    id: 'cute_girl',
    name: 'Lina',
    portrait: 'npc_cute_girl',
    unlocked: false,  // Requires camp upgrade
    unlockCondition: 'town_camp_upgraded',
    dialogue: {
      greeting: "Oh! You fixed up the camp! I'm... I'm Lina. Thank you for making this place safer.",
      topics: [
        {
          id: 'about_herself',
          text: 'How did you end up here?',
          response: "I was a baker's daughter in the city. When the dead started walking, we fled. My family... I don't know if they made it.",
          affection: 1,
        },
        {
          id: 'help',
          text: 'Is there anything I can do to help?',
          response: "If you could clear the graveyard, maybe we could rebuild the city road. People would start coming back.",
          affection: 1,
          flag: 'lina_quest_hint',
        },
        {
          id: 'end',
          text: '[End Conversation]',
          response: null,
          close: true,
        }
      ]
    }
  }
}
```

### NPC Properties

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (`old_man`, `cute_girl`) |
| `name` | string | Display name in dialogue |
| `portrait` | string | Asset key for portrait SVG |
| `unlocked` | boolean | Whether NPC is currently available |
| `unlockCondition` | string | Flag/condition that unlocks NPC |
| `dialogue.greeting` | string | First thing NPC says when approached |
| `dialogue.topics[]` | array | Conversation branches |
| `topics[].id` | string | Unique topic identifier |
| `topics[].text` | string | Player's dialogue option |
| `topics[].response` | string | NPC's reply (null = close dialogue) |
| `topics[].affection` | number | Affection gained from this choice |
| `topics[].flag` | string | Optional flag to set on this choice |
| `topics[].close` | boolean | If true, closes dialogue after this choice |

---

## 6. Town Progression

### Phase System

| Phase | Name | Background | NPCs | Upgrade Cost |
|---|---|---|---|---|
| 1 | Refugee Camp | `town_refugee_camp.svg` | Old Man only | 100 gold |
| 2 | Wooden Shacks | `town_wooden_shacks.svg` | Old Man + Lina | — |

### Upgrade Logic

```javascript
// When player clicks "Upgrade Camp — 100g"
if (gameManager.get_currency() >= 100) {
  gameManager.spend_currency(100, 'camp_upgrade');
  gameManager.set_flag('town_camp_upgraded', true);
  gameManager.set('persistent.town.level', 2);
  // Unlock Lina
  NPC_DATA.cute_girl.unlocked = true;
  // Update background to wooden shacks
  updateTownBackground();
}
```

### Gold Flow

```
Combat End
  → gameManager.end_session(combatResult)
  → persistent.currency += gold_earned
  → Player sees gold in town top bar
  → Can spend 100g to upgrade camp
  → persistent.currency -= 100
  → town.level = 2
```

---

## 7. Implementation Steps

### Step 1: Town Screen HTML/CSS (30 min)

- Add `#town-screen` div to game2.html (after title screen)
- Background image container (loads SVG based on town.level)
- Top bar: camp name, gold, run stats
- NPC area: scrollable list of available NPCs
- Bottom bar: "Return to Combat" and "Return to Title" buttons
- Style: dark theme, parchment accents, RPG serif fonts

### Step 2: Town State Machine (20 min)

- Add `town` state to GameState transitions
- Wire `endScreen` → `town` transition (after "Continue to Town" click)
- Wire `town` → `combat` transition (after "Return to Combat" click)
- Wire `town` → `title` transition (optional "Return to Title")
- Load NPC data based on flags (old man always, Lina if upgraded)

### Step 3: NPC Display (30 min)

- Show NPC cards in the NPC area
- Each card: portrait SVG + name + brief greeting
- Click to open dialogue
- Locked NPCs show grayed out with lock icon
- Unlocked NPCs show with glow border

### Step 4: Dialogue System (45 min)

- Modal overlay with NPC portrait on left, text on right
- Typewriter text effect (30ms per character)
- Choice buttons below text
- Click/tap to skip typewriter
- Response text after choice
- "Continue" button to return to choices
- "End Conversation" closes dialogue
- Track affection per NPC (stored in `persistent.npcs.relationships`)

### Step 5: Camp Upgrade (20 min)

- Show "Upgrade Camp — 100g" button if phase == 1 and gold >= 100
- Disable button if gold < 100
- On click: deduct gold, set flag, update background, unlock Lina
- Visual transition: background fades from tents to shacks

### Step 6: Integration (20 min)

- Wire `end_session()` to save gold before town loads
- Wire `gameManager.get_currency()` to display in top bar
- Wire NPC affection to `persistent.npcs.relationships`
- Wire flags to unlock conditions
- Test full loop: combat → town → talk → upgrade → combat

---

## 8. Assets Created

| File | Purpose | Size |
|---|---|---|
| `public/assets/town_refugee_camp.svg` | Phase 1 background — night, campfire, 4 rough tents, stars, moon, sparks | 800×450 |
| `public/assets/town_wooden_shacks.svg` | Phase 2 background — night, 4 wooden shacks, stone campfire ring, chimney smoke, warm windows, barrel, crates | 800×450 |
| `public/assets/npc_old_man.svg` | Elder Rowan portrait — gray hair, beard, kind eyes, scar, shirt collar | 120×120 |
| `public/assets/npc_cute_girl.svg` | Lina portrait — long dark hair, big brown eyes, blush, gold earrings, flower accessory, purple dress | 120×120 |

### Portrait Display Size

| Context | Width | Height |
|---|---|---|
| Town NPC card | 80px | 80px |
| Dialogue screen | 100px | 100px |
| Hover/tooltip | 120px | 120px |

---

*Town System Specification v1.0 — Generated August 24, 2026*
