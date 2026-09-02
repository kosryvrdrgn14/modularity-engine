# Companion System — Engine Integration Analysis

**Version:** 0.4.0 (Design Decisions Locked)
**Status:** Spec
**Design Decisions:** D1 (3 slots), D2 (invulnerable), D5 (1:1 binding)
**Specs Cross-Referenced:** `01_engine_architecture.md`, `03_weapons_spec.md`, `04_enemies_spec.md`, `20_companion_combat_spec.md`

---

## 1. Current Engine State (What Exists)

### Entity Types Currently Supported

```typescript
type EntityType = 'player' | 'enemy' | 'projectile' | 'orb' | 'pickup' | 'obstacle' | 'boss'
```

### 1:1 Weapon-Companion Binding (D5)

The engine reads `store.npcs.companions` (3 slots, each bound to a weapon) and creates companion entities. Each companion:
- Buffs its paired weapon (damage, cooldown, special effects)
- Auto-levels with the weapon (no separate upgrade system)
- Emits attacks from its own position (not the player's)

**Data flow:**
```
store.npcs.companions = { 1: 'dog', 2: null, 3: null }
store.combat.weaponLevels = { w1: 3, w2: 0, w3: 0 }

→ Companion 1 (Dog) created with:
  - slot: 1
  - weaponSlot: 'w1'
  - level: 3 (mirrors W1 level)
  - damage: COMPANION_DATA['dog'].damage[3]
  - cooldown: COMPANION_DATA['dog'].cooldown[3]
```

**Engine changes needed:**
1. Add `'companion'` to EntityType union
2. Add COMPANION collision layer (0b100000)
3. Add CompanionSystem class with state machine
4. Update CollisionSystem for companion-enemy cone detection
5. Update Renderer for companion sprites + cone effects
6. Update DamageSystem for companion damage (no `stats.damage` multiplier)

### Entity Pools Currently Allocated

| Pool | Initial | Max |
|---|---|---|
| Enemies | 50 | 200 |
| Projectiles | 100 | 500 |
| Orbs | 20 | 50 |
| Pickups | 100 | 500 |
| Floating Text | 50 | 100 |
| Obstacles | 0 | Dynamic |

### Collision Layers Currently Defined

| Layer | Bit | Description |
|---|---|---|
| PLAYER | `0b0001` | Player character |
| ENEMY | `0b0010` | Enemies + boss |
| PROJECTILE | `0b0100` | Player weapons |
| PICKUP | `0b1000` | XP, gold, power-ups |
| OBSTACLE | `0b10000` | Static map obstacles |

### System Execution Order (Per Frame)

```
1. InputManager
2. MovementSystem
3. WeaponSystem
4. CollisionSystem
5. DamageSystem
6. EntityManager
7. SpawnSystem
8. PickupSystem
9. LevelingSystem
10. AudioManager
11. UIManager
12. CameraEffects
13. Camera
```

### Draw Order (Back to Front)

```
1. Background tiles
2. Cracked floor
3. Grave mounds
4. Pickups
5. Solid obstacles
6. Enemies (y-sorted)
7. Player
8. Weapon effects
9. Power-up effects
10. Floating text
11. UI overlay
```

---

## 2. Required Engine Changes

### 2.1 New Entity Type: `'companion'`

**Gap:** The engine has no `companion` entity type. The Dog needs its own type with unique fields.

**What to add:**

```typescript
// Add to EntityType union
type EntityType = 'player' | 'enemy' | 'projectile' | 'orb' | 'pickup' | 'obstacle' | 'boss' | 'companion'

// Add companion-specific fields to Entity interface
interface Entity {
  // ...existing fields...

  // Companion-specific (only when type === 'companion')
  companionId?: string;           // 'dog', 'cat', 'hawk', etc.
  companionState?: string;        // 'idle' | 'follow' | 'attackRun' | 'growl' | 'return'
  attackCooldown?: number;        // Time until next attack
  target?: Entity | null;         // Current attack target
  coneAngle?: number;             // Attack cone angle (radians)
  coneRange?: number;             // Attack cone range (px)
  primaryDamage?: number;         // Primary target damage
  secondaryDamage?: number;       // AoE secondary damage
  detectionRange?: number;        // How far to detect enemies
  maxChaseRange?: number;         // Max distance from player to chase
  followDistance?: number;        // Distance behind player to follow
  followSpeedMultiplier?: number; // Speed relative to player
  attackSpeedMultiplier?: number; // Speed when rushing to attack
  hitCooldown?: number;           // Per-enemy hit cooldown
  lootRadius?: number;            // Passive loot collection range
}
```

**Priority:** HIGH — Must be done first.

### 2.2 Companion Entity Pool

**Gap:** No pool exists for companions.

**What to add:**

```typescript
// Add to pool allocation
Companions: { initial: 3, max: 3 }  // Max 3 companion slots
```

**Note:** Companions are never pooled/recycled mid-game. They're created at stage start and destroyed at stage end. Pool size = 3 (matching companion slots).

**Priority:** HIGH.

### 2.3 New Collision Layer: `'COMPANION'`

**Gap:** The existing collision layers don't handle companion-entity interactions. Companions need to:
- ✅ Deal damage to enemies (growl cone)
- ✅ Collect pickups (loot radius)
- ❌ NOT collide with the player (they follow independently)
- ❌ NOT collide with other companions
- ❌ NOT collide with obstacles (they pathfind around them)

**What to add:**

```typescript
// Add new collision layer
COMPANION: 0b100000  // Bit 5

// Add collision pairs
| Pair | Layers | Response |
|---|---|---|
| Companion → Enemy (growl) | COMPANION ↔ ENEMY | Deal cone damage, apply hit cooldown |
| Companion → Pickup (loot) | COMPANION ↔ PICKUP | Attract pickup to companion, then deliver to player |
```

**Important:** The companion doesn't use the standard AABB collision system for its growl attack. Instead, it uses a **cone check** (angle + distance from companion to each enemy). This is a new collision shape type.

**Priority:** HIGH.

### 2.4 Cone Collision Check (New Shape Type)

**Gap:** The collision system only supports AABB and circle checks. The Dog's growl requires a **cone check** — a 60° wedge extending 60px from the Dog's position.

**What to add:**

```typescript
// New collision helper function
function isInCone(
  source: { x: number, y: number, facing: number },  // Dog position + direction
  target: { x: number, y: number },                    // Enemy position
  coneAngle: number,     // Total cone angle (radians, e.g., PI/3 for 60°)
  coneRange: number      // Max distance (px)
): boolean {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > coneRange) return false

  const angleToTarget = Math.atan2(dy, dx)
  let angleDiff = angleToTarget - source.facing

  // Normalize to [-PI, PI]
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

  return Math.abs(angleDiff) <= coneAngle / 2
}
```

**Priority:** HIGH — Required for the growl attack.

### 2.5 System Execution Order Update

**Gap:** The companion system needs its own update step. It should run after MovementSystem (so player position is current) but before CollisionSystem (so companion attacks are processed before collision checks).

**Updated order:**

```
1. InputManager
2. MovementSystem
3. CompanionSystem        ← NEW (after movement, before weapons)
4. WeaponSystem
5. CollisionSystem
6. DamageSystem
7. EntityManager
8. SpawnSystem
9. PickupSystem
10. LevelingSystem
11. AudioManager
12. UIManager
13. CameraEffects
14. Camera
```

**Why before WeaponSystem?** The Dog's growl is an independent attack. Processing it before weapons means the Dog can kill enemies that would otherwise be targeted by W1, which feels natural — the Dog clears stragglers.

**Priority:** HIGH.

### 2.6 CompanionSystem — New Class

**Gap:** No companion AI system exists.

**What to create:**

```typescript
class CompanionSystem {
  companions: Entity[] = []

  constructor(eventBus, entityManager) { ... }

  init(companionData: any[], player: Entity) {
    // Spawn companion entities from GameManager's companion list
    for (const data of companionData) {
      const companion = this.entityManager.acquire('companion')
      Object.assign(companion, data)
      companion.x = player.x
      companion.y = player.y + 24  // Start below player
      companion.state = 'follow'
      companion.attackCooldown = 0
      this.companions.push(companion)
    }
  }

  update(dt: number, player: Entity, enemies: Entity[]) {
    for (const c of this.companions) {
      if (!c.active) continue

      // Tick attack cooldown
      if (c.attackCooldown > 0) c.attackCooldown -= dt

      switch (c.companionState) {
        case 'follow':
          this._updateFollow(c, player, dt)
          if (c.attackCooldown <= 0) {
            const target = this._findNearestEnemy(c, enemies)
            if (target && this._distance(c, target) <= c.detectionRange) {
              c.companionState = 'attackRun'
              c.target = target
            }
          }
          break

        case 'attackRun':
          this._updateAttackRun(c, dt)
          if (this._distance(c, c.target) < 20) {
            c.companionState = 'growl'
            c._growlTimer = 0.1  // 100ms wind-up
          }
          if (!c.target || !c.target.active) {
            c.target = this._findNearestEnemy(c, enemies)
            if (!c.target) c.companionState = 'return'
          }
          break

        case 'growl':
          c._growlTimer -= dt
          if (c._growlTimer <= 0) {
            this._performGrowl(c, enemies)
            c.attackCooldown = this._getCooldown(c)
            c.companionState = 'return'
          }
          break

        case 'return':
          this._updateFollow(c, player, dt)
          if (this._distance(c, this._getFollowPos(c, player)) < 20) {
            c.companionState = 'follow'
          }
          break
      }

      // Passive loot collection
      this._collectNearbyLoot(c, player)
    }
  }

  _performGrowl(c: Entity, enemies: Entity[]) {
    // Find all enemies in cone
    const inCone = enemies.filter(e =>
      e.active && isInCone(c, e, c.coneAngle, c.coneRange)
    )

    // Sort by distance
    inCone.sort((a, b) => this._distance(c, a) - this._distance(c, b))

    // Apply damage
    if (inCone.length > 0) {
      // Primary target
      this.eventBus.emit('companionDamage', {
        source: c,
        target: inCone[0],
        damage: c.primaryDamage
      })

      // Secondary targets
      for (let i = 1; i < inCone.length; i++) {
        this.eventBus.emit('companionDamage', {
          source: c,
          target: inCone[i],
          damage: c.secondaryDamage
        })
      }
    }

    // Emit visual event
    this.eventBus.emit('companionGrowl', {
      x: c.x, y: c.y,
      angle: Math.atan2(c.target.y - c.y, c.target.x - c.x),
      range: c.coneRange,
      angleSpan: c.coneAngle
    })
  }

  _collectNearbyLoot(c: Entity, player: Entity) {
    const pickups = this.entityManager.getActive('pickup')
    for (const p of pickups) {
      if (this._distance(c, p) <= c.lootRadius) {
        // Attract to companion, then deliver to player
        this.eventBus.emit('companionLootCollect', {
          companion: c,
          pickup: p,
          player
        })
      }
    }
  }
}
```

**Priority:** HIGH — Core system.

### 2.7 Event Bus Additions

**Gap:** The companion system needs new events that don't exist yet.

**New events to add:**

| Event | Emitted By | Consumed By | Data |
|---|---|---|---|
| `companionDamage` | CompanionSystem | DamageSystem | `{ source, target, damage }` |
| `companionGrowl` | CompanionSystem | Renderer, AudioManager | `{ x, y, angle, range, angleSpan }` |
| `companionLootCollect` | CompanionSystem | PickupSystem | `{ companion, pickup, player }` |
| `companionSpawn` | CompanionSystem | AudioManager | `{ companionId }` |

**Priority:** HIGH.

### 2.8 DamageSystem Integration

**Gap:** The DamageSystem's `applyDamage()` function expects an attacker entity. When the Dog attacks, the "attacker" is the companion entity, not the player. The function needs to handle this.

**Current flow:**
```
Projectile hits enemy → applyDamage(projectile, enemy)
```

**New flow:**
```
Dog growl hits enemy → applyDamage(dog_companion, enemy)
```

**Issue:** The `applyDamage()` function uses `attacker.stats.damage` for the base damage. But the Dog's damage comes from `companion.primaryDamage` / `companion.secondaryDamage`, not from `stats.damage`.

**Fix options:**
1. **Option A:** Set `companion.stats.damage = primaryDamage` before calling `applyDamage()`. Simple but hacky.
2. **Option B:** Add a `baseDamage` parameter to `applyDamage()` that overrides `attacker.stats.damage`. Clean.
3. **Option C:** Create a separate `applyCompanionDamage()` function. Most isolated.

**Recommendation:** Option B. Add an optional `overrideDamage` parameter:

```typescript
function applyDamage(attacker, defender, overrideDamage = null) {
  const baseDamage = overrideDamage ?? attacker.stats.damage
  // ... rest of formula unchanged
}
```

**Priority:** HIGH.

### 2.9 Renderer — Companion Drawing

**Gap:** The renderer doesn't know how to draw companion entities.

**What to add:**

```typescript
// In Renderer.render(), add after player drawing (layer 7.5)
// Draw companions between player and weapon effects

// In the entity draw loop, add a companion case:
case 'companion':
  // Draw the companion SVG sprite
  const sprite = this.svgAssets.get(entity.companionId + '_combat')
  if (sprite) {
    ctx.drawImage(sprite, screen.x - 16, screen.y - 16, 32, 32)
  }

  // Draw growl cone if attacking
  if (entity.companionState === 'growl' && entity._growlEffect) {
    this._drawGrowlCone(ctx, entity)
  }
  break
```

**Growl cone rendering:**

```typescript
_drawGrowlCone(ctx, entity) {
  const effect = entity._growlEffect
  const progress = effect.elapsed / effect.duration  // 0 → 1

  ctx.save()
  ctx.translate(screen.x, screen.y)
  ctx.rotate(entity._growlEffect.angle)

  // Cone shape
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, entity.coneRange * Math.min(progress * 2, 1),
    -entity.coneAngle / 2, entity.coneAngle / 2)
  ctx.closePath()

  // Fill with fading orange
  const alpha = 0.3 * (1 - progress)
  ctx.fillStyle = `rgba(255, 140, 0, ${alpha})`
  ctx.fill()

  ctx.restore()
}
```

**Priority:** HIGH.

### 2.10 SpawnSystem — Companion Spawning

**Gap:** The SpawnSystem only spawns enemies. Companions need to be spawned at stage start from GameManager's companion list.

**What to add:**

```typescript
// In Game.startGame(), after player creation:
const companions = this.gameManager.get_companions()
if (companions.length > 0) {
  this.companionSystem.init(
    companions.map(id => COMPANION_DATA[id]),
    player
  )
}
```

**Priority:** MEDIUM.

### 2.11 PickupSystem — Companion Loot Delivery

**Gap:** The PickupSystem only checks player proximity for collection. The Dog's 40px loot radius needs a separate collection path.

**What to add:**

```typescript
// In PickupSystem.update(), add companion loot check:
// After normal player pickup check, also check companions

this.eventBus.on('companionLootCollect', (data) => {
  const { pickup, player } = data
  // Collect the pickup and deliver to player
  this.collectPickup(player, pickup)
})
```

**Priority:** MEDIUM.

### 2.12 HUD — Companion Display

**Gap:** The HUD shows weapon slots but no companion slots.

**What to add:**

```
Below weapon bar, add 3 companion slots:
┌─────────────────────────────────────┐
│  W1  W2  W3  (existing weapon bar) │
│  🐕  +   +   (companion slots)     │
└─────────────────────────────────────┘
```

- Each slot shows the companion's SVG portrait (or `+` if empty)
- During combat, show a small cooldown indicator on the companion icon
- When the Dog is in `attackRun` or `growl` state, the icon pulses

**Priority:** LOW — Can be added after core combat works.

### 2.13 AudioManager — Companion SFX

**Gap:** No companion sounds exist.

**What to add:**

```typescript
// New synthesized sounds:
companion_dog_growl: Square wave burst, 200Hz–400Hz sweep, 0.2s
companion_dog_bark: Two quick square pulses, 500Hz, 0.1s each
companion_dog_pant: Sine wave 300Hz, 0.1s (return state)
companion_loot_collect: Soft chime (player pickup sound at 60% volume)
```

**Priority:** LOW — Can use existing sounds initially.

---

## 3. Identified Gaps

### Gap 1: No Companion Data Schema

**Issue:** The engine loads companion data from `GameManager.get_companions()`, but there's no JSON schema for companion definitions. The Dog's combat stats are hardcoded in the spec.

**Fix:** Add a `content/companions.json` file (or embed in `game2.html`):

```json
{
  "companions": [
    {
      "id": "dog",
      "name": "Dog",
      "slot": 1,
      "pairedWeapon": "w1_projectile",
      "combatSprite": "assets/dog_combat.svg",
      "attackType": "cone",
      "statsPerLevel": [
        { "cooldown": 10.0, "primaryDamage": 18, "secondaryDamage": 9 },
        { "cooldown": 9.5, "primaryDamage": 18, "secondaryDamage": 9 },
        { "cooldown": 9.0, "primaryDamage": 22, "secondaryDamage": 11 },
        { "cooldown": 8.0, "primaryDamage": 22, "secondaryDamage": 11 },
        { "cooldown": 7.5, "primaryDamage": 26, "secondaryDamage": 13 },
        { "cooldown": 7.0, "primaryDamage": 26, "secondaryDamage": 13 },
        { "cooldown": 5.5, "primaryDamage": 32, "secondaryDamage": 16 }
      ],
      "coneAngle": 60,
      "coneRange": 60,
      "followDistance": 24,
      "followSpeedMultiplier": 0.8,
      "attackSpeedMultiplier": 1.5,
      "detectionRange": 120,
      "maxChaseRange": 200,
      "hitCooldown": 1.0,
      "lootRadius": 40
    }
  ]
}
```

**Priority:** HIGH — Needed for data-driven design.

### Gap 2: Companion Level Sync with Weapon Level

**Issue:** The Dog's upgrade level is tied to W1's level, but the engine has no mechanism to sync them. When the player picks a W1 upgrade, the Dog's stats should update.

**Fix:** Add a listener for `weaponLevelUp` events:

```typescript
eventBus.on('weaponLevelUp', (data) => {
  if (data.weaponId === 'w1_projectile') {
    // Update Dog's stats from companion data
    const dog = this.companions.find(c => c.companionId === 'dog')
    if (dog) {
      const levelData = COMPANION_DATA.dog.statsPerLevel[data.newLevel - 1]
      dog.attackCooldown = 0  // Reset cooldown on level up
      dog.primaryDamage = levelData.primaryDamage
      dog.secondaryDamage = levelData.secondaryDamage
      // Cooldown is applied when cooldown expires, not immediately
    }
  }
})
```

**Priority:** HIGH.

### Gap 3: Companion During Boss Intro

**Issue:** During boss intro, the game pauses but companions might still be in `attackRun` state. When the intro ends, the Dog could be mid-charge at a weird position.

**Fix:** During boss intro, force all companions to `return` state:

```typescript
eventBus.on('bossIntro', () => {
  for (const c of this.companionSystem.companions) {
    c.companionState = 'return'
    c.target = null
    c.attackCooldown = 5  // Give breathing room after intro
  }
})
```

**Priority:** MEDIUM.

### Gap 4: Companion Death Handling

**Issue:** The spec says the Dog has no HP bar and can't take damage. But what if the Dog gets stuck in geometry or pathfinds into an unreachable position?

**Fix:** Add a safety timeout — if the Dog is in `attackRun` for more than 3 seconds without reaching its target, force it back to `return`:

```typescript
// In CompanionSystem._updateAttackRun():
c._attackRunTimer = (c._attackRunTimer || 0) + dt
if (c._attackRunTimer > 3.0) {
  c.companionState = 'return'
  c._attackRunTimer = 0
  c.target = null
}
```

**Priority:** MEDIUM.

### Gap 5: Multiple Companions Targeting Same Enemy

**Issue:** If 3 companions are active (future), they might all target the same enemy and overkill it, wasting damage.

**Fix:** For v1 with only the Dog, this isn't an issue. For future: add a target-lock system where each enemy can only be "claimed" by one companion at a time.

**Priority:** LOW — Defer to when 2+ companions exist.

### Gap 6: Companion in Endless Mode (Post-Boss)

**Issue:** After the boss dies, the game continues with escalating difficulty. The Dog should continue fighting but might get overwhelmed by faster/stronger enemies.

**Fix:** No change needed — the Dog's 10s cooldown and limited chase range naturally limit its effectiveness in endless mode. This is by design.

**Priority:** NONE — Working as intended.

---

## 4. Conflicts

### Conflict 1: CompanionDamage vs PlayerDamage Attribution

**Issue:** When the Dog kills an enemy, who gets credit? The kill counter should attribute it to the player (for stats), but the XP/gold drops should work normally.

**Resolution:** `companionDamage` events should set `attacker` to the companion entity, but the `death` event handler should check if the killer is a companion and attribute the kill to the player for stat tracking:

```typescript
eventBus.on('death', (data) => {
  if (data.killer.type === 'companion') {
    data.killer = player  // Attribute kill to player for stats
  }
  // ... rest of death handling unchanged
})
```

### Conflict 2: Loot Collection Priority

**Issue:** If both the player and the Dog are within range of a pickup, who collects it? Double collection would be a bug.

**Resolution:** PickupSystem checks player first. If the player is in range, the pickup is collected by the player. Only if the player is out of range but the Dog is in range does the Dog collect it. This prevents double-collection.

### Conflict 3: Companion Rendering vs Y-Sort

**Issue:** The engine y-sorts all entities for depth. Companions should be rendered between the player and enemies, not mixed in with enemy y-sorting.

**Resolution:** Render companions in a separate pass after the player, before enemies. Don't include them in the enemy y-sort array.

---

## 5. Stage 2 Preparation Notes

While the focus is on companion integration, here are quick notes for stage 2:

### What Reuses from Stage 1

- All 5 enemy types (skeleton, zombie, ghost, bat, caster)
- All 3 weapons (projectile, orbit, area)
- Player character, leveling system, pickup system
- Boss telegraph/intro system (for the new boss)
- Town screen, dialogue system

### What Changes for Stage 2

- **1–2 new enemy types** (e.g., armored skeleton, wraith)
- **New boss** (female Necromancer — different attack patterns)
- **Stage background** (different environment)
- **Wave timeline** (different spawn schedule)
- **Possible new pickups** (stage-specific power-ups)

### Companion in Stage 2

- The Dog carries over from stage 1 if acquired
- New companions can be acquired in the upgraded camp
- Companion slots (3) remain the same
- Each companion tied to a weapon slot

---

## 6. Implementation Checklist

| # | Task | Priority | Est. Lines | Dependencies |
|---|---|---|---|---|
| 1 | Add `'companion'` to EntityType | HIGH | ~5 | None |
| 2 | Add companion fields to Entity interface | HIGH | ~20 | #1 |
| 3 | Add `COMPANION` collision layer (bit 5) | HIGH | ~5 | None |
| 4 | Add `isInCone()` collision helper | HIGH | ~25 | None |
| 5 | Create CompanionSystem class | HIGH | ~150 | #1–4 |
| 6 | Add `companionDamage`, `companionGrowl`, `companionLootCollect` events | HIGH | ~15 | None |
| 7 | Update DamageSystem for overrideDamage param | HIGH | ~10 | None |
| 8 | Add companion entity pool (size 3) | HIGH | ~5 | #1 |
| 9 | Add companion drawing to Renderer | HIGH | ~60 | #1 |
| 10 | Wire companion spawn in Game.startGame() | HIGH | ~20 | #5 |
| 11 | Add `companionLootCollect` handler in PickupSystem | MEDIUM | ~15 | #6 |
| 12 | Add `weaponLevelUp` listener for companion stat sync | HIGH | ~20 | #5 |
| 13 | Add boss intro companion reset handler | MEDIUM | ~10 | #5 |
| 14 | Add attack run safety timeout | MEDIUM | ~10 | #5 |
| 15 | Create `content/companions.json` (or embed data) | HIGH | ~40 | None |
| 16 | Add companion SFX to AudioManager | LOW | ~20 | None |
| 17 | Add companion slots to HUD | LOW | ~30 | None |
| 18 | Test and tune damage/cooldown numbers | HIGH | — | All above |
| **Total** | | | **~460 lines** | |

---

## 7. Recommended Implementation Order

```
Phase 1: Foundation (do first)
  ├── #1, #2, #3, #4, #8   (entity type, collision layer, cone check, pool)
  └── #15                   (companion data schema)

Phase 2: Core System
  ├── #5, #6, #7            (CompanionSystem, events, damage integration)
  └── #9, #10               (rendering, spawning)

Phase 3: Polish
  ├── #11, #12, #13, #14    (loot, level sync, boss reset, safety)
  └── #16, #17              (audio, HUD)

Phase 4: Balance
  └── #18                   (tune numbers through playtesting)
```

---

*Companion Engine Integration Analysis v1.0 — Created August 24, 2026*
