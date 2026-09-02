# NPC Dialogue System — Reusable Template

> **Version:** 2.0 (Design Decisions Locked)
> **Extracted from:** `game2.html` TownScreen system
> **Last Updated:** 2026-08-26

---

## Overview

The dialogue system supports typewriter text, branching choices, NPC portraits, affection tracking, flag-based unlocks, nested response loops, and **affection tier-based dialogue**. Each NPC follows the same data structure.

### Design Decisions Referenced
- D1 (3 companion slots), D5 (1:1 binding) — companion dialogue in combat
- D6 (mythology factions) — NPC personality and faction ties

---

## Affection Tier Dialogue Patterns

Dialogue changes based on the NPC's affection tier with the player.

### Tier-Based Greeting Pool

```javascript
const GREETINGS = {
  0: ["What do you need?"],                    // Stranger
  1: ["Oh, it's you again."],                  // Interest
  2: ["Welcome back! I was hoping you'd visit."], // Respect
  3: ["There you are! I have so much to tell you."], // Trust
  4: ["My love! Come, sit with me."]           // Claim (married)
};
```

### Tier-Based Response Templates

| Tier | Gift Received | Quest Complete | Random Chat |
|---|---|---|---|
| 0 (Stranger) | "Thank you." | "Appreciated." | "..." |
| 1 (Interest) | "Oh, how thoughtful." | "Thanks for your help." | "Nice weather today." |
| 2 (Respect) | "You really know what I like!" | "I knew I could count on you." | "Tell me about your adventures." |
| 3 (Trust) | "This means the world to me." | "You always keep your promises." | "I feel safe with you." |
| 4 (Claim) | "You spoil me. I love it." | "My hero, as always." | "I'm so happy we're together." |

### Why Tier-Based Dialogue

- **Rewards investment** — higher tiers feel more personal
- **Motivates progression** — players want to hear new lines
- **Creates emotional connection** — NPC personality evolves with relationship
- **Low content cost** — template-based, not unique per NPC

---

## NPC Data Structure

```javascript
const NPC_DATA = {
  npc_id: {
    id: 'npc_id',                          // unique snake_case ID
    name: 'Display Name',                   // shown in UI
    portrait: '<svg>...</svg>',             // inline SVG string or data URI
    unlocked: true,                         // whether NPC is available
    unlockCondition: 'flag_name',           // optional: flag that must be true
    greeting: "Opening line of dialogue.",  // typewriter text on first open
    topics: [                               // array of dialogue choices
      {
        id: 'topic_id',                    // unique within this NPC
        text: 'Choice button label',       // shown to player
        response: "NPC reply text.",        // typewriter text after selection
        affection: 1,                       // affection gain (0 = none)
        flag: 'flag_to_set',               // optional: flag set on selection
        close: false,                       // if true, closes dialogue immediately
      },
      // ... more topics
      {
        id: 'end',
        text: '[End Conversation]',
        response: null,
        close: true,
      }
    ]
  }
};
```

---

## Dialogue Flow

```
Player clicks NPC card
  → _openDialogue(npc)
    → Sets portrait (inline SVG via SVG_PORTRAITS map)
    → Sets NPC name
    → Hides choices & continue button
    → Shows dialogue overlay
    → _typewriteText(npc.greeting, callback)
      → When complete → _showChoices(npc)
        → Creates button for each topic
        → Player clicks a choice:
          → If close=true → closes overlay
          → Sets flag (if defined)
          → Adds affection (if > 0)
          → Hides choices
          → _typewriteText(topic.response, callback)
            → When complete → Shows "Continue" button
              → Player clicks Continue → _showChoices(npc) again
```

---

## Working Example: Elder Rowan

```javascript
old_man: {
  id: 'old_man',
  name: 'Elder Rowan',
  portrait: '<svg ...>...</svg>',  // inline SVG
  unlocked: true,
  greeting: "Welcome back, traveler. The road has been dangerous, but we're alive.",
  topics: [
    {
      id: 'about_camp',
      text: 'Tell me about the camp.',
      response: "We were farmers, merchants, refugees... The Gravekeeper's rise drove us here. These tents are all we have left. But you — you fight. That gives us hope.",
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
```

## Working Example: Lina

```javascript
cute_girl: {
  id: 'cute_girl',
  name: 'Lina',
  portrait: '<svg ...>...</svg>',
  unlocked: false,
  unlockCondition: 'town_camp_upgraded',
  greeting: "Oh! You fixed up the camp! I'm... I'm Lina. Thank you for making this place safer.",
  topics: [
    {
      id: 'about_herself',
      text: 'How did you end up here?',
      response: "I was a baker's daughter in the city. When the dead started walking, we fled. My family... I don't know if they made it. But I'm grateful to be alive.",
      affection: 1,
    },
    {
      id: 'help',
      text: 'Is there anything I can do to help?',
      response: "If you could clear the graveyard, maybe we could rebuild the city road. People would start coming back. Please... be careful out there.",
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
```

---

## Creating a New NPC

### Step 1: Define the NPC Data

```javascript
// Add to NPC_DATA in game2.html or external NPCs JSON
new_npc: {
  id: 'new_npc',
  name: 'NPC Name',
  portrait: 'assets/npc_new_npc.svg',  // or inline SVG string
  unlocked: false,
  unlockCondition: 'some_flag',        // null if always available
  greeting: "First thing they say when you open dialogue.",
  topics: [
    {
      id: 'topic_lore',
      text: 'Ask about lore.',
      response: "Their response about the world.",
      affection: 1,
    },
    {
      id: 'topic_quest',
      text: 'Ask for a quest.',
      response: "Here's what I need you to do...",
      affection: 0,
      flag: 'quest_started',
    },
    {
      id: 'topic_gift',
      text: '[Give a gift]',
      response: "Thank you so much! You're too kind.",
      affection: 2,
    },
    {
      id: 'end',
      text: '[End Conversation]',
      response: null,
      close: true,
    }
  ]
}
```

### Step 2: Create the Portrait SVG

- Viewbox: `0 0 120 120`
- Background circle: dark fill, subtle border
- Character centered in the circle
- Use gradients for skin/hair/clothing
- Include distinguishing features (accessories, scars, expressions)
- Keep it recognizable at 52×52 (NPC card) and 80×80 (dialogue)

### Step 3: Add to SVG_PORTRAITS Map

```javascript
const SVG_PORTRAITS = {
  'old_man': '<svg ...>...</svg>',
  'cute_girl': '<svg ...>...</svg>',
  'new_npc': '<svg ...>...</svg>',  // add here
};
```

### Step 4: Set Unlock Condition

| Scenario | `unlocked` | `unlockCondition` |
|---|---|---|
| Always available | `true` | `null` |
| Available after flag | `false` | `'flag_name'` |
| Available after town upgrade | `false` | `'town_camp_upgraded'` |
| Available after quest | `false` | `'quest_complete_001'` |

---

## Affection System

| Value | Meaning |
|---|---|
| `0` | Neutral — no change |
| `1` | Friendly — small trust gain |
| `2` | Generous — notable trust gain |
| `3+` | Deep bond — reserved for special interactions |

Affection is stored via `GameManager.add_counter('affection_npc_id', amount)`.

---

## Flag System

Flags are boolean key/value pairs stored via `GameManager.set_flag('flag_name', true)`.

Common flag patterns:

| Flag | Set By | Used For |
|---|---|---|
| `graveyard_warning` | Elder Rowan topic | Unlock graveyard quest |
| `lina_quest_hint` | Lina topic | Unlock next quest stage |
| `town_camp_upgraded` | Camp upgrade button | Unlock Lina NPC |
| `quest_started` | NPC dialogue | Track quest progression |

---

## NPC Card Layout

Each NPC card in the town screen shows:

```
┌──────────────────────────────────┐
│ [Portrait SVG]  NPC Name         │
│                  "Greeting..."   │
│                  ▸ Talk           │
└──────────────────────────────────┘
```

If locked:
```
┌──────────────────────────────────┐
│ [Portrait SVG]  NPC Name         │
│                  🔒 Unlock text   │
└──────────────────────────────────┘
```

---

## Dialogue Overlay Layout

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ [Portrait]  NPC Name             │   │
│  │              Dialogue text...     │   │
│  │              (typewriter)         │   │
│  │                                   │   │
│  │  ┌─ Choice 1 ─────────────────┐  │   │
│  │  ├─ Choice 2 ─────────────────┤  │   │
│  │  ├─ Choice 3 ─────────────────┤  │   │
│  │  └─ [End Conversation] ───────┘  │   │
│  │                                   │   │
│  │  [Continue]  ← shown after reply │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Key Implementation Notes

1. **Inline SVGs** — Use the `SVG_PORTRAITS` map with raw SVG strings injected via `innerHTML`. Do NOT use `<img>` tags with data URIs — they fail in iframe/CSP contexts.

2. **Typewriter** — 25ms per character. Clicking the dialogue text skips to the end. Uses `setInterval` cleared on completion.

3. **Topic Loop** — After viewing a response and clicking Continue, `_showChoices` is called again, allowing the player to pick another topic. Only `[End Conversation]` closes the overlay.

4. **Affection Persistence** — Stored in `GameManager` counters via `add_counter('affection_' + npc.id, amount)`.

5. **Unlock Persistence** — Stored in `GameManager` flags via `set_flag(unlockCondition, true)`.


---

## Gift Response Templates

Each NPC has gift preferences that affect affection gain and dialogue.

### Gift Preference Structure

```javascript
const NPC_GIFTS = {
  npc_id: {
    loved: ["luxury", "personal"],     // 2× affection bonus
    liked: ["quality"],                 // 1× affection (standard)
    neutral: ["basic"],                 // 0.5× affection
    disliked: []                        // 0× affection (no gain)
  }
};
```

### Gift Response Dialogue by Preference

```javascript
const GIFT_RESPONSES = {
  loved: [
    "This is... exactly what I wanted. How did you know?",
    "I can't believe you found this! You're incredible.",
    "My heart is so full right now. Thank you."
  ],
  liked: [
    "Thank you. This is very thoughtful of you.",
    "Oh, nice! I was just thinking about this.",
    "You have good taste. Thank you."
  ],
  neutral: [
    "How nice. Thank you.",
    "That's... thoughtful. Thanks.",
    "Appreciated."
  ],
  disliked: [
    "Oh. Um... thank you, I suppose.",
    "That's very kind, but I'm not really sure what to do with this.",
    "Thanks. I'll... find a use for it."
  ]
};
```

### Why Gift Preferences Matter

- **Choice** — players must learn NPC personalities to maximize affection
- **Replayability** — different NPCs prefer different gifts
- **Gold sink** — luxury gifts are expensive but worth it for loved NPCs
- **Personality expression** — preferences reveal character traits

---

*End of dialogue_template.md — Version 2.0 (Design Decisions Locked)*