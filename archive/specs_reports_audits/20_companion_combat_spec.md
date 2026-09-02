# Companion NPC Combat Spec

**Version:** 0.4.0 (Design Decisions Locked)
**Status:** Spec
**Design Decisions:** D1 (3 slots), D2 (always invulnerable), D5 (1:1 binding)
**Related Files:** `03_weapons_spec.md`, `04_enemies_spec.md`, `19_town_system_spec.md`, `dialogue_template.md`

---

## 1. Overview

Companions are NPC allies that fight alongside the player in combat. They have their own position on the battlefield, independent movement patterns, and emit attacks from their own location (not the player's). Each companion occupies one of **3 companion slots** and is tied 1:1 to a weapon slot:

| Companion Slot | Weapon Slot | Upgrade Path |
|---|---|---|
| Slot 1 | W1 (Projectile) | Companion upgrades with W1 level |
| Slot 2 | W2 (Orbit) | Companion upgrades with W2 level |
| Slot 3 | W3 (Area Pulse) | Companion upgrades with W3 level |

The Dog is in **Companion Slot 1** (tied to W1). It is the first companion and serves as the prototype for the entire companion system.

**Design Philosophy:** Companions are supplementary. They add variety and utility but do not replace player skill or weapon choices. A player who neglects positioning will not be saved by companions. They are a welcome addition, not a crutch.

### Companion Deployment System

The player has **3 companion slots** but may own **N companions** (wives, Dog, others). Deployment is **per-stage** — before entering combat, the player chooses which 3 companions to bring.

**Deployment Rules:**
- Max 3 companions deployed per stage
- Deployment is chosen at stage select (before combat starts)
- Not-deployed wives still provide **50% passive bonus** (reduced from 100%)
- Not-deployed companions provide **no passive bonus**
- Player can change deployment between stages freely

### One-Place-Only Rule

A companion can only be in **ONE place** at a time. They cannot be deployed in manual combat AND auto-clearing a stage simultaneously.

| State | Can Deploy to Combat? | Can Assign to Auto-Clear? |
|---|---|---|
| **Available** | ✅ Yes | ✅ Yes |
| **In Manual Combat** | ❌ No (already deployed) | ❌ No |
| **In Auto-Clear** | ❌ No (busy farming) | ❌ No (already assigned) |
| **Locked** | ❌ No | ❌ No |
| **Story Unavailable** | ❌ No | ❌ No |
| **Resting** | ❌ No | ❌ No |

**Why one-place-only:**
- Prevents double-dipping (companion buffs manual combat AND auto-clears simultaneously)
- Creates meaningful choices: "Do I bring Dog to this boss fight, or let him farm herbs?"
- Simplifies the system: no need to track a companion in multiple places
- Hired adventurers are NOT affected (they're generic, only exist in auto-clear)

### Companion Status States

Each companion has a status that determines availability:

| Status | Meaning | Can Deploy? | Source |
|---|---|---|---|
| **Available** | Ready to deploy or assign | ✅ Yes | Default state after recruitment |
| **In Manual Combat** | Active in a companion slot during combat | ❌ No (already in) | Assigned to slot 1/2/3 at stage select |
| **In Auto-Clear** | Assigned to a farming slot | ❌ No (busy farming) | Assigned to auto-clear slot |
| **Locked** | Not yet recruited | ❌ No | NPC not yet met/befriended |
| **Story Unavailable** | Temporarily unavailable | ❌ No | Quest flag, pregnant, personal quest, raising child |
| **Resting** | Recovering after combat | ❌ No (cooldown) | Post-combat rest timer (future feature) |

**Why status states matter:**
- Prevents deploying companions that haven't been recruited
- Allows quests to temporarily remove companions (story tension)
- Future-proofs for cooldown/rest mechanics
- Clear UI feedback on why a companion can't be deployed

### Invulnerability Rule (D2 DECIDED)

Companions are **always invulnerable**. They cannot:
- Take damage from enemies
- Be targeted by enemy projectiles
- Die or be knocked out
- Be affected by status effects (stun, slow, etc.)

If a quest needs a protect target, that target is a **map asset with HP**, not a companion. This keeps companion management simple and the player's focus on their own survival.

---

## 2. Current Game Balance Reference

To balance the Dog properly, here are the current weapon and enemy stats:

### Player Weapons (Base)

| Weapon | Base Damage | Cooldown | Type | Notes |
|---|---|---|---|---|
| W1 Projectile | 15 | 0.5s | Single target, ranged | Fast, reliable |
| W2 Orbit | 10 | 0.8s | Area, close range | Hits multiple enemies |
| W3 Area Pulse | 20 | 2.5s | AoE burst | Slow but powerful |

**Damage upgrade:** +5 damage per stack (additive)

### Enemies (Base)

| Enemy | HP | Damage | Speed | Notes |
|---|---|---|---|---|
| Skeleton | 10 | 8 | 60 | Standard melee |
| Zombie | 8 | 6 | 40 | Slow, tanky feel |
| Ghost | 6 | 5 | 80 | Fast, fragile |
| Bat | 4 | 3 | 120 | Swarm, very fast |
| Caster | 12 | 7 | 50 | Ranged attacker |
| Boss (Gravekeeper) | 200 | 15 | 70 | Multi-phase |

---

## 3. Dog Companion — Core Design

### 3.1 Behavior States

The Dog operates on a simple state machine:

```
IDLE → FOLLOW → ATTACK_RUN → GROWL → RETURN → FOLLOW
  ↑                                                      |
  └──────────────────────────────────────────────────────┘
```

| State | Description | Duration |
|---|---|---|
| **IDLE** | Spawns near player at combat start | Instant |
| **FOLLOW** | Trails 16–32px behind player with slight random offset, collects nearby loot | Continuous |
| **ATTACK_RUN** | Rushes toward nearest enemy within detection range | Until reaching target |
| **GROWL** | Stops at target, emits cone AoE attack | ~0.3s (wind-up + release) |
| **RETURN** | Runs back to follow position behind player | Until back in range |

### 3.2 Detection & Targeting

- **Detection Range:** 120px from Dog's current position
- **Target Priority:** Closest enemy to the Dog (not the player)
- **Trigger:** Only attacks when the attack cooldown has expired
- **No Target:** If no enemies are within 120px, the Dog stays in FOLLOW state

### 3.3 Movement

**Follow Behavior:**
- The Dog positions itself 16–32px **behind** the player (opposite of player's last movement direction)
- A small random offset (±8px) is applied every 2–3 seconds to give organic movement
- Follow speed: 80% of player speed (slightly slower, so it trails naturally)
- If the Dog gets more than 100px from the player, it teleports to follow position (prevents getting stuck on terrain)

**Attack Run Behavior:**
- Dog runs directly toward the target at 150% player speed (fast, aggressive dash)
- If the target dies while Dog is running, Dog switches to next closest enemy or returns to FOLLOW
- Maximum run distance: 200px from player (won't chase forever)

### 3.4 The Growl Attack (AoE Cone)

This is the Dog's signature attack — a cone-shaped AoE growl that damages enemies in front of it.

**Cone Properties:**

| Property | Value | Notes |
|---|---|---|
| Cone Angle | 60° | Wide enough to hit groups |
| Cone Range | 60px | Short-range, requires close positioning |
| Primary Target Damage | 100% of base | The nearest enemy takes full damage |
| Secondary Damage | 50–75% of base | Enemies further back in the cone |
| Visual | Semi-transparent orange cone | Fades over 0.4s |
| Audio | Dog growl/bark SFX | Triggers on attack |

**Damage Distribution:**
- The closest enemy in the cone takes **100% of base damage**
- Enemies beyond the primary target take **50% of base damage** (within the same cone)
- This makes the Dog excellent against tightly grouped enemies but less effective against spread-out ones

### 3.5 Hit Cooldown

- **Per-enemy hit cooldown:** 1.0s (same enemy cannot be damaged by Dog again within 1 second)
- Prevents the Dog from melting a single target with repeated growls
- Different enemies can be hit simultaneously

---

## 4. Damage Balance Table

The Dog's damage is balanced against W1 (its paired weapon) and the 10-second cooldown.

### At W1 Level 1 (Dog Level 1) — Base Stats

| Metric | Value | Comparison |
|---|---|---|
| Cooldown | 10.0s | ~20× slower than W1 |
| Primary Target Damage | 18 | Higher than W1's 15 per hit |
| Secondary AoE Damage | 9–13.5 | Decent group clear |
| DPS (single target) | 1.8 | Very low — intentional |
| DPS (5 enemies in cone) | 54 | Strong burst when positioned well |
| Kills per growl (Lv1) | ~1–2 skeletons | Supplementary, not dominant |

**Why 18 primary damage?**
- At 10s cooldown, the Dog needs high per-hit damage to feel impactful
- 18 damage = 1.8 hits to kill a skeleton (10 HP) — nearly a one-shot on weak enemies
- But only every 10 seconds, so W1 still does 300 damage in that same window
- The Dog is a **burst punctuation**, not a sustained DPS source

### Upgrade Scaling

Since the Dog is tied to W1, it upgrades when W1 upgrades:

| W1 Level | Dog Cooldown | Primary Dmg | Secondary Dmg | Notes |
|---|---|---|---|---|
| **1** | 10.0s | 18 | 9–13.5 | Base |
| **2** | 9.5s | 18 | 9–13.5 | Slight cooldown buff |
| **3** | 9.0s | 22 | 11–16.5 | Damage bump |
| **4** ⭐ | 8.0s | 22 | 11–16.5 | **Power Spike** — cooldown drops significantly |
| **5** | 7.5s | 26 | 13–19.5 | Damage bump |
| **6** | 7.0s | 26 | 13–19.5 | Steady improvement |
| **7** ⭐⭐ | 5.5s | 32 | 16–24 | **Max Power Spike** — nearly double base DPS |

**Power Spike Explanation:**
- Level 4 spike: Cooldown drops from 9s → 8s, making the Dog feel noticeably more active
- Level 7 spike: Cooldown drops to 5.5s with 32 primary damage — the Dog becomes a genuine AoE threat
- At max level, the Dog's single-target DPS is ~5.8 (still less than W1's ~30), but the AoE burst is significant

### Upgrade Formula

```javascript
// Cooldown decreases by 0.5s per level, with bigger drops at spikes
function getCompanionCooldown(level) {
  const baseCooldown = 10.0;
  const reductionPerLevel = 0.5;
  const spikeReductions = { 4: -0.5, 7: -1.0 }; // Extra reduction at power spikes
  let cooldown = baseCooldown - (level - 1) * reductionPerLevel;
  if (spikeReductions[level]) cooldown += spikeReductions[level];
  return Math.max(cooldown, 5.0); // Minimum 5s cooldown
}

// Damage scales with level
function getCompanionDamage(level) {
  const baseDamage = 18;
  const damagePerLevel = Math.floor((level - 1) / 2) * 4; // +4 every 2 levels
  const spikeBonus = level >= 7 ? 6 : level >= 4 ? 0 : 0;
  return baseDamage + damagePerLevel + spikeBonus;
}
```

---

## 5. Visual Design

### 5.1 Combat Sprite

- **File:** `public/assets/dog_combat.svg`
- **Size:** 32×32px (same as smaller enemies)
- **Orientation:** Side-view, facing the direction of movement
- **States:**
  - **Follow:** Walking animation (subtle leg movement via SVG animate)
  - **Attack Run:** Running animation (faster leg movement, ears back)
  - **Growl:** Brief flash/expansion effect (0.3s)
  - **Return:** Trotting animation

### 5.2 Growl Cone Visual

The cone should be rendered as a semi-transparent wedge:

```
Color: #FF8C00 (dark orange) at 30% opacity
Border: None (soft edge)
Duration: 0.4s total
  - 0.0s–0.1s: Cone scales from 0% to 100% size
  - 0.1s–0.3s: Cone holds at full size, pulsing
  - 0.3s–0.4s: Cone fades out
Damage applies at 0.1s (when cone reaches full size)
```

### 5.3 Floating Text

When the Dog attacks, show:
- **Primary target:** Red damage number (e.g., "-18")
- **Secondary targets:** Smaller red damage numbers (e.g., "-9")
- **Kill:** Gold "+Xg" text if the Dog gets the killing blow
- **Loot collected:** Small blue "+X" for XP, gold "+Xg" for gold (when Dog picks up loot)

---

## 6. Integration Points

### 6.1 What Systems Need Changes

| System | Change Required | Priority |
|---|---|---|
| **MovementSystem** | Add `updateCompanion(dt)` method for Dog AI | High |
| **CollisionSystem** | Add cone collision check for Dog's growl | High |
| **Renderer** | Draw Dog sprite + growl cone effect | High |
| **WeaponSystem** | Companion cooldown tracked alongside weapon cooldowns | Medium |
| **DamageSystem** | Apply damage from Dog's growl (not from player) | Medium |
| **SpawnSystem** | Spawn Dog entity at combat start if companion is active | Low |
| **UI/HUD** | Show companion slot with Dog icon below weapon bar | Medium |
| **AudioManager** | Dog growl/bark SFX on attack | Low |
| **GameManager** | Read companions list to determine which to spawn | Low |

### 6.2 Entity Type

The Dog should be a new entity type: `companion`

```javascript
{
  type: 'companion',
  id: 'dog',
  x: 0, y: 0,
  vx: 0, vy: 0,
  state: 'follow',     // idle, follow, attackRun, growl, return
  attackCooldown: 0,   // Time until next growl
  target: null,         // Current attack target
  coneAngle: Math.PI / 3, // 60 degrees
  coneRange: 60,
  primaryDamage: 18,
  secondaryDamage: 9,
  size: 16,             // Half-size for collision (32×32 sprite)
  active: true,
  render: 'dog_combat'  // SVG asset key
}
```

### 6.3 Combat Flow

```
Game.startGame()
  └─► For each companion in GameManager.get_companions():
      └─► Spawn companion entity near player
      └─► companion.state = 'follow'

Game.update(dt) — each frame:
  └─► MovementSystem.updateCompanion(dt)
      └─► For each companion entity:
          └─► switch(companion.state):
              case 'follow':
                  └─► Move toward follow position behind player
                  └─► If attackCooldown <= 0 AND enemy within 120px:
                      companion.state = 'attackRun'
                      companion.target = nearestEnemy
              case 'attackRun':
                  └─► Move toward companion.target at 150% speed
                  └─► If reached target (distance < 20px):
                      companion.state = 'growl'
                  └─► If target died: find next target or return
              case 'growl':
                  └─► Wait 0.1s, then deal cone damage
                  └─► Emit 'companionGrowl' event
                  └─► companion.attackCooldown = getCompanionCooldown(level)
                  └─► companion.state = 'return'
              case 'return':
                  └─► Move toward follow position
                  └─► If within 20px of follow position:
                      companion.state = 'follow'

CollisionSystem — cone check:
  └─► On 'companionGrowl' event:
      └─► Find all enemies within cone (angle + range check)
      └─► Sort by distance from Dog
      └─► Apply primaryDamage to closest enemy
      └─► Apply secondaryDamage to remaining enemies in cone
      └─► Check per-enemy hit cooldown (1.0s)
```

### 6.4 Rendering

```
Renderer.render(entities, player):
  └─► ... (grid, telegraphs, etc.)
  └─► Draw all companion entities (after player, before enemies)
      └─► For each companion:
          └─► ctx.drawImage(companionSvg, x - size, y - size)
          └─► If growing: draw cone wedge effect
  └─► Draw enemies
  └─► Draw projectiles, pickups, floating text
```

Companions render **after the player but before enemies** so they appear "in front" of the player but enemies overlap them when close.

---

## 7. Audio

| Trigger | Sound | Waveform |
|---|---|---|
| Dog growl attack | Short bark + growl | Square wave burst, 200Hz–400Hz sweep, 0.2s |
| Dog returns to follow | Light pant | Sine wave 300Hz, 0.1s |
| Dog spawned | Happy bark | Two quick square pulses, 500Hz, 0.1s each |

---

## 8. Edge Cases & Rules

| Scenario | Behavior |
|---|---|
| No enemies on screen | Dog stays in FOLLOW, cooldown continues ticking |
| All enemies dead (end of wave) | Dog returns to FOLLOW |
| Player dies | Dog despawns with player |
| Dog's target goes off-screen (>300px) | Dog returns to FOLLOW, picks new target next cooldown |
| Loot near Dog (40px) | Dog passively collects it and delivers to player totals |
| Multiple companions active | Each runs independently, no interaction between them |
| Companion slot empty | No entity spawned, weapon slot still functions normally |
| Boss fight | Dog can attack boss, but boss's contact damage can "scare" the Dog back (forces return state) |
| Player levels up during Dog attack | Attack completes, then upgrade is processed |

---

## 9. Future Companion Template

This spec establishes the pattern for future companions:

```json
{
  "id": "companion_id",
  "name": "Display Name",
  "slot": 1,
  "pairedWeapon": "w1_projectile",
  "combatSprite": "assets/companion_sprite.svg",
  "portraitSvg": "SVG_PORTRAITS key",
  "attackType": "cone",           // cone, projectile, buff, heal, etc.
  "attackCooldown": 10.0,
  "primaryDamage": 18,
  "secondaryDamage": 9,
  "secondaryDamageFalloff": 0.5,
  "coneAngle": 60,
  "coneRange": 60,
  "followDistance": 24,
  "followSpeedMultiplier": 0.8,
  "attackSpeedMultiplier": 1.5,
  "detectionRange": 120,
  "maxChaseRange": 200,
  "hitCooldown": 1.0,
  "sfx": {
    "attack": "companion_dog_growl",
    "spawn": "companion_dog_bark"
  }
}
```

Future companions might include:
- **Slot 2 (paired with W2):** A cat that teleports to orbit range and swipes
- **Slot 3 (paired with W3):** A hawk that dives in a line AoE

---

## 10. Implementation Steps

| Step | Task | Estimated Lines |
|---|---|---|
| 1 | Add `companion` entity type to EntityManager | ~20 |
| 2 | Create CompanionSystem (AI state machine) | ~120 |
| 3 | Add cone collision check to CollisionSystem | ~40 |
| 4 | Render companion sprite + cone effect in Renderer | ~60 |
| 5 | Wire companion spawn in Game.startGame() | ~30 |
| 6 | Add Dog growl SFX to AudioManager | ~15 |
| 7 | Update HUD to show companion in weapon bar area | ~25 |
| 8 | Test and tune damage/cooldown numbers | — |
| **Total** | | **~310 lines** |

---

## 11. Design Decisions (Confirmed)

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Slow effect on growl? | **No** for v1 | Keep it pure damage. Utility companions (slow, snare, buff) can be added later as upgrade options or new companion types. |
| 2 | Auto loot pickup? | **Yes** — 40px range | Acts as a mini extension of player looting range. Dog passively collects gold/XP within 40px and brings it to the player. Not tied to the growl attack. |
| 3 | Scale with player damage stat? | **No** initially | Companion damage is self-contained. Test first, worry about long-term balance later. Prevents exponential scaling issues. |
| 4 | Dog only if petted? | **Yes** | Dog joins party only if player chose "Pet the dog" in dialogue. Walking away means no Dog in combat. Simple, clear consequence for player choice. |

### Loot Pickup (Passive)

The Dog has a passive loot collection radius of **40px** from its current position:
- Any gold coins or XP gems within 40px are instantly attracted to the Dog
- The Dog then delivers them to the player (they add to the player's totals)
- This works in all states (FOLLOW, ATTACK_RUN, RETURN) — the Dog is always collecting
- Visual: loot items fly toward the Dog sprite with a short magnet-like animation
- Audio: soft chime when loot is collected (same as player pickup, slightly quieter)
- This makes the Dog useful even when not attacking — it extends the player's effective looting range
| 5 | Future upgrades? | **TBD** | Slow effect, larger cone, faster loot pickup, etc. can be added as companion-specific upgrade trees in a later version. |

---

*Companion Combat Spec v1.0 — Created August 24, 2026*

---

## ⚠️ Forward Design Note: Adjacency System (Planned)

> **See:** `32_adjacency_system_spec.md` for the full adjacency system design.

**Impact on companion design:**

The adjacency system will add a `tags` array to companion data:

```json
{
  "id": "mage",
  "name": "Mage",
  "tags": ["lightning", "vuln"],
  "adjacencyBuffs": {
    "lightning": "+10% chain damage to adjacent",
    "vuln": "+5% vuln duration to adjacent"
  }
}
```

**Design constraints:**

1. Companion data must support `tags` array (add to schema, populate later)
2. Companion attack types should map to tags for adjacency interactions
3. The 3 companion slot structure (C1, C2, C3) maps to the adjacency grid
4. Companion-weapon evolution is adjacency-dependent (companion must be adjacent to weapon)

*Added: August 29, 2026 — Design reference for future adjacency system*
