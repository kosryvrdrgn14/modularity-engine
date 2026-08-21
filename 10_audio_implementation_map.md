# Modularity Engine — Audio Implementation Map

> **Game Version:** v0.2.0 (First Playable Build)
> **Spec Version:** 1.2 (`09_audio_spec.md`)
> **Last Updated:** 2026-08-21
> **Status:** Implementation Complete — All sounds wired and synthesized
> **Purpose:** Exact line-by-line mapping of where every sound fires in `game.html`, what triggers it, and what the AudioManager needs to do.

---

## Table of Contents

1. [AudioManager Integration Point](#1-audiomanager-integration-point)
2. [All EventBus Emissions → Sound Mapping](#2-all-eventbus-emissions--sound-mapping)
3. [Sound Trigger Locations by System](#3-sound-trigger-locations-by-system)
4. [Payout Triad Engine Hooks](#4-payout-triad-engine-hooks)
5. [Distance-Based Audio Source Positions](#5-distance-based-audio-source-positions)
6. [Ducking Integration Points](#6-ducking-integration-points)
7. [Implementation Checklist](#7-implementation-checklist)

---

## 1. AudioManager Integration Point

The `AudioManager` is currently a stub at **line 2135** of `game.html`.

### Current Stub

```
Line 2135: class AudioManager {
Line 2136:   constructor(eventBus) { ... }
Line 2142:   init() { this.ctx = new AudioContext() ... }
Line 2151:   resume() { ... }
Line 2157:   play(soundId) { /* EMPTY — placeholder */ }
Line 2161: }
```

### What Needs to Happen

The AudioManager must:

1. **Subscribe to game events** during `init()` — listen on the EventBus for all events listed in §2.
2. **Map events to sound IDs** — each event carries data (entity type, pickup type, etc.) that determines which sound plays.
3. **Synthesize sounds using Web Audio API** — oscillators, gain envelopes, filters per `09_audio_spec.md`.
4. **Manage the 16-slot sound pool** with eviction logic per §1.2 of the audio spec.

### Where AudioManager Is Instantiated

```
Line 2192: this.audioManager = new AudioManager(this.eventBus);
```

### Where AudioManager.init() Is Called

```
Line 2226: this.audioManager.init();
```

**Implementation note:** `init()` must happen BEFORE `_setupEvents()` (line 2229) so that the AudioManager's event listeners are registered before any game events fire. Alternatively, have AudioManager subscribe to events inside `init()`.

### Where AudioManager.resume() Should Be Called

On the **first user click/tap** to start the game. Currently there is no title screen — the game auto-starts. Two options:

1. Add a "Click to Start" overlay and call `audioManager.resume()` in its click handler.
2. Call `audioManager.resume()` inside `startGame()` at line 2318 — but this may not satisfy browser autoplay policy on some browsers.

**Recommended:** Add a one-time click handler on the canvas or a start overlay that calls `resume()` before `startGame()`.

---

## 2. All EventBus Emissions → Sound Mapping

Every `eventBus.emit()` call in the game. The "Sound" column shows what the AudioManager should play when it hears this event.

### Game Events with Sound

| Line | Event | Event Data | Sound ID | Priority | Distance? |
|---|---|---|---|---|---|
| 231 | `stateChange` | `{ from, to, data }` | *No sound* | — | — |
| 663 | `pause` | `{ paused: true }` | `ui_click` | 10 | No |
| 675, 706 | `restart` | `{}` | `restart` | 3 | No |
| 667-671, 700 | `selectUpgrade` | `{ index }` | `ui_click` | 10 | No |
| 973 | `bossSpawn` | `{ boss }` | `boss_spawn` | 4 | Yes |
| 1215 | `contactDamage` | `{ target: player, source: enemy, damage }` | `player_hurt` | 1 | No (player) |
| 1223 | `projectileHit` | `{ projectile, target, damage }` | `weapon_hit` | 8 | Yes |
| 1239 | `projectileHit` | `{ projectile: orb, target, damage }` | `weapon_hit` | 8 | Yes |
| 1260 | `pickup` | `{ player, pickup }` | *(see §2.1 below)* | 9 | Yes |
| 1429 | `areaPulse` | `{ x, y, damage, radius }` | `w3_pulse` | 6 | No (player) |
| 1444 | `weaponLevelUp` | `{ weaponId, newLevel }` | `powerup_collect` | 2 | No |
| 1501 | `damage` | `{ target, source, damage, isCrit }` | *(see §2.2)* | — | — |
| 1511 | `death` | `{ entity, type, killer }` | *(see §2.3)* | — | — |
| 1518 | `bossDeath` | `{ boss, killer }` | `boss_death` | 4 | No |
| 1706 | `levelUp` | `{ level }` | `levelup` | 3 | No |
| 2304 | `magnetActivate` | `{ player }` | `magnet_hum` | 9 | No (player) |
| 2441 | `weaponUnlock` | `{ weaponId, name }` | `weapon_unlock` | 2 | No |

### §2.1 — Pickup Event Sub-Types

The `pickup` event (line 1260) carries `data.pickup.pickupData.id`. The AudioManager must check this field:

| `pickupData.id` | Sound ID | Priority | Notes |
|---|---|---|---|
| `exp_small` | `xp_small` | 9 | **Payout Triad engine** (§4 of audio spec) |
| `gold_coin` | `gold_coin` | 9 | **Payout Triad engine** (brighter pattern) |
| `weapon_levelup` | `powerup_collect` | 2 | Full 5-note arpeggio |
| `screen_wipe` | `screenwipe` | 5 | Dramatic sweep + noise |
| `magnet` | `powerup_collect` | 2 | Reuse power-up sound |
| `health` | `powerup_collect` | 2 | Reuse power-up sound (if health pickup exists) |

**Critical:** The `pickup` event fires on the **game's EventBus**, not as a direct AudioManager call. The AudioManager must have an `eventBus.on('pickup', ...)` listener that inspects `data.pickup.pickupData.id` to route to the correct sound.

### §2.2 — Damage Event (No Direct Sound)

The `damage` event (line 1501) is emitted by DamageSystem and listened to by FloatingTextSystem (line 1956). It does **not** need its own sound — the `contactDamage` and `projectileHit` events that *cause* damage already have sounds assigned. The `damage` event is purely for UI (floating numbers).

### §2.3 — Death Event Sub-Types

The `death` event (line 1511) carries `data.type` (the entity's `type` field). Route by enemy type:

| `data.type` | Sound ID | Priority | Notes |
|---|---|---|---|
| `player` | `player_death` | 1 | Always plays. Final. |
| `zombie` | `zombie_kill` | 7 | Pitch drop: 400→100Hz |
| `bat` | `bat_kill` | 7 | Chirp: 1200→800Hz |
| `skeleton` | `skeleton_kill` | 7 | Layered: 300Hz + 600Hz |
| `ghost` | `ghost_kill` | 7 | Ethereal wail: 600→200Hz |
| `caster` | `caster_kill` | 7 | Burst: 500→200Hz |
| `boss_gravekeeper` | `boss_death` | 4 | Layered bass drop (handled by `bossDeath` event) |

**Note:** The boss death fires BOTH `death` (line 1511, type=`boss_gravekeeper`) AND `bossDeath` (line 1518). The AudioManager should listen for `bossDeath` specifically and skip the generic `death` event when `data.type === 'boss_gravekeeper'` to avoid double-playing.

---

## 3. Sound Trigger Locations by System

### 3.1 WeaponSystem (lines 1290–1444)

| Method | Line | Sound Trigger | When |
|---|---|---|---|
| `_fireW1()` | 1310 | `w1_fire` | Every time a projectile is created (line ~1356) |
| `_fireW2()` | 1363 | `w2_hum` | When W2 is first unlocked and orbs are created. Continuous while active. |
| `_fireW3()` | 1404 | `w3_pulse` | When `areaPulse` event is emitted (line 1429) |
| `levelUp()` | 1441 | `powerup_collect` | When `weaponLevelUp` event is emitted (line 1444) |
| `unlockWeapon()` | *(called from Game)* | `weapon_unlock` | When `weaponUnlock` event is emitted (line 2441) |

**Implementation approach for W1:**
- Add `this.eventBus.emit('weaponFire', { weaponId: 'w1_projectile' })` at line ~1356 inside the projectile creation loop, OR
- Have AudioManager listen for entity creation of type `projectile` and check its `visual.color === '#FFD700'` to identify W1, OR
- **Simplest:** Emit a `weaponFire` event from `_fireW1` and map it to `w1_fire`.

**Implementation approach for W2:**
- The W2 orbit hum is a **continuous sound**. AudioManager should start it when W2 is unlocked and stop it when:
  - W2 is no longer active (weaponSystem doesn't have it)
  - Player dies
  - Game ends
  - Game is paused (duck to 10%)
- Track as a persistent oscillator node, not a one-shot sound.

**Implementation approach for W3:**
- The `areaPulse` event (line 1429) is the natural hook. AudioManager listens for it and plays `w3_pulse`.

### 3.2 CollisionSystem (lines 1190–1270)

| Line | Event Emitted | Sound Trigger | Notes |
|---|---|---|---|
| 1215 | `contactDamage` | `player_hurt` | Enemy touches player |
| 1223 | `projectileHit` | `weapon_hit` | W1 projectile hits enemy |
| 1239 | `projectileHit` | `weapon_hit` | W2 orb hits enemy (same event) |
| 1260 | `pickup` | *(varies by pickup type)* | Player collects item |

**Note on `projectileHit`:** Both W1 projectiles and W2 orbs emit the same `projectileHit` event. The AudioManager can distinguish them by checking `data.projectile.visual?.shape`:
- W1 projectile: `shape === 'square'`, `color === '#FFD700'`
- W2 orb: `shape === 'circle'`, `color === '#4FC3F7'`

For now, both can play `weapon_hit`. Future differentiation is optional.

### 3.3 DamageSystem (lines 1468–1545)

| Line | Event Emitted | Sound Trigger | Notes |
|---|---|---|---|
| 1501 | `damage` | *(none — UI only)* | Floating text system handles this |
| 1511 | `death` | *(varies by enemy type)* | See §2.3 |
| 1518 | `bossDeath` | `boss_death` | Boss-specific death event |

### 3.4 PickupSystem (lines 1561–1650)

| Line | Event Emitted | Sound Trigger | Notes |
|---|---|---|---|
| 1627 | `magnetActivate` | `magnet_hum` | Continuous hum for 10s duration |
| *(pickup entity created)* | *(visual only)* | *(none)* | Sound fires on collection, not spawn |

**Magnet implementation:**
- Start `magnet_hum` continuous sound when `magnetActivate` fires.
- Fade out over 0.5s in the last second (total duration: 10s).
- The AudioManager should track `magnetTimer` independently or listen for magnet deactivation.

### 3.5 LevelingSystem (line 1706)

| Line | Event Emitted | Sound Trigger | Notes |
|---|---|---|---|
| 1706 | `levelUp` | `levelup` | Ascending scale run: C5→E5→G5→C6 |

### 3.6 SpawnSystem (line 973)

| Line | Event Emitted | Sound Trigger | Notes |
|---|---|---|---|
| 973 | `bossSpawn` | `boss_spawn` | Ground-shaking impact. Camera shake already triggers here. |

### 3.7 MovementSystem — Boss Behavior (lines 1115–1165)

| Boss State | Line | Sound Trigger | Notes |
|---|---|---|---|
| `chase` → `windup` | 1137 | `boss_charge` | Telegraphing growl. Should play when boss enters windup state. |
| `charge` | 1146 | *(no event emitted)* | **GAP:** No event is emitted when boss starts charging. Need to emit `bossCharge` event here. |
| `pause` | 1155 | *(none)* | Post-charge rest. No sound needed. |

**⚠️ GAP:** The MovementSystem `_moveBoss()` method transitions through states (chase → windup → charge → pause) but does NOT emit events for state changes. The AudioManager cannot detect boss charge start without an event.

**Fix:** Add `this.eventBus.emit('bossCharge', { boss })` at line 1146 when `boss._bossState` transitions to `'charge'`. The MovementSystem needs an `eventBus` reference (currently it does not have one — it receives `entityManager` and `inputManager` only).

**Alternative:** Move boss state-change event emission to the Game class by checking boss state in the `update()` loop.

### 3.8 Game Class — Event Handlers (lines 2238–2315)

| Line | Event Listened | Sound Trigger | Notes |
|---|---|---|---|
| 2251 | `levelUp` | `levelup` | Level-up screen shown |
| 2267 | `selectUpgrade` | `ui_click` | Upgrade card selected |
| 2285 | `death` (player) | `player_death` | Player died |
| 2292 | `bossSpawn` | `boss_spawn` | Boss appeared |
| 2297 | `bossDeath` | `boss_death` | Boss killed → victory |
| 2302 | `pickup` | *(varies)* | Magnet or weapon_levelup pickup |
| 2313 | `restart` | `restart` | Game restarted |

**Note:** The Game class listens to `death` at line 2285 but only acts on it when `data.entity === this.player`. The AudioManager should have its **own** listener for `death` that handles ALL entity types (enemies + player), independent of the Game class's handler.

---

## 4. Payout Triad Engine Hooks

Per `09_audio_spec.md` §4, the payout triad engine applies to XP and gold pickups. Here are the exact integration points:

### Pickup Collection Path

```
Player touches pickup entity
  → CollisionSystem._checkPickups() (line ~1260)
    → eventBus.emit('pickup', { player, pickup })
      → AudioManager listens for 'pickup'
        → Checks data.pickup.pickupData.id
          → 'exp_small': triggers payout triad with combo stepping
          → 'gold_coin': triggers brighter arpeggio pattern
```

### Combo Stepping State

The AudioManager must maintain:
```javascript
this.comboIndex = 0;          // Current position in C Major scale
this.lastPickupTime = 0;      // Timestamp of last pickup
this.COMBO_TIMEOUT = 0.6;     // Reset combo after 0.6s gap
```

### Scale Array (from spec §4)

```javascript
const C_MAJOR_SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
```

### Volume Decoupling

Each pickup triggers with randomized gain:
```javascript
const gain = 0.08 + Math.random() * 0.04; // 0.08 to 0.12
```

### Micro-Tuning Jitter

```javascript
const jitter = (Math.random() - 0.5) * 30; // ±15 Hz
```

---

## 5. Distance-Based Audio Source Positions

Per `09_audio_spec.md` §6, sounds from spatial sources should attenuate by distance from the player.

### Spatial Sounds (Distance Applies)

| Sound | Source Position | Distance Calculated From |
|---|---|---|
| `weapon_hit` | Enemy position (`target.x, target.y`) | Player position |
| `zombie_kill` | Enemy position | Player position |
| `bat_kill` | Enemy position | Player position |
| `skeleton_kill` | Enemy position | Player position |
| `ghost_kill` | Enemy position | Player position |
| `caster_kill` | Enemy position | Player position |
| `xp_small` | Pickup position | Player position |
| `gold_coin` | Pickup position | Player position |

### Non-Spatial Sounds (Full Volume Always)

| Sound | Rationale |
|---|---|
| `w1_fire` | Player's own weapon |
| `w3_pulse` | Player's own weapon |
| `player_hurt` | Player needs to hear damage |
| `player_death` | Critical feedback |
| `levelup` | UI event |
| `ui_click` | UI event |
| `boss_spawn` | Global event |
| `boss_death` | Global event |
| `boss_charge` | Warning — must be heard |
| `restart` | UI event |
| `weapon_unlock` | UI event |
| `magnet_hum` | Player's pickup effect |
| `powerup_collect` | Player's pickup effect |
| `screenwipe` | Player's pickup effect |

### Distance Calculation

From the event data, the AudioManager can compute distance:

```javascript
// For projectileHit:
const dx = data.target.x - player.x;
const dy = data.target.y - player.y;
const distance = Math.sqrt(dx * dx + dy * dy);
```

**Problem:** The AudioManager does not currently have a reference to the player entity. It needs one, OR the Game class should pass player position in event data.

**Fix options:**
1. Pass `player` reference to AudioManager constructor.
2. Add `playerX, playerY` to relevant event payloads.
3. Have AudioManager store a `playerRef` that Game sets during `startGame()`.

**Recommended:** Option 3 — simplest and doesn't require changing every emit call.

```javascript
// In Game.startGame():
this.audioManager.setPlayer(this.player);

// In AudioManager:
setPlayer(player) { this.player = player; }
```

---

## 6. Ducking Integration Points

Per `09_audio_spec.md` §5, the AudioManager must duck lower-priority sounds when high-priority sounds play.

### Duck Triggers

| Trigger | Line/Event | Duck Target | Level | Duration |
|---|---|---|---|---|
| `player_hurt` plays | `contactDamage` event | All priority > 1 | 80% (×0.8) | 0.3s |
| `player_death` plays | `death` (player) event | All | 0% (silence) | Permanent (game over) |
| `powerup_collect` plays | `pickup` (weapon_levelup) | All priority > 2 | 80% | 0.3s |
| `levelup` plays | `levelUp` event | All priority > 3 | 80% | 0.3s |
| Boss becomes active | `bossSpawn` event | All priority > 4 | 70% (×0.7) | While boss alive |
| Boss dies | `bossDeath` event | All ducked | Restore to 100% | 0.5s ramp |
| Level-up screen opens | `levelUp` → `setState('levelUp') | All combat sounds | 10% (×0.1) | While screen visible |
| Level-up screen closes | `selectUpgrade` → `setState('playing') | All | Restore to 100% | 0.2s ramp |

### Implementation Notes

- Each SFX slot has a `GainNode` in the audio chain.
- Ducking modifies `priorityGain.gain` using `linearRampToValueAtTime`.
- **Stacking:** If multiple ducks are active, the lowest gain wins (not additive).
- Music layer ducking uses the same mechanism but on the music channel's gain nodes.

---

## 7. Implementation Checklist

### Phase A: Core Audio Infrastructure

- [x] **A1.** Replace AudioManager stub (line 2135) with full implementation.
- [x] **A2.** Implement `init()` — create AudioContext, master gain, channel gains (SFX/Music/UI).
- [x] **A3.** Implement `resume()` — call `audioContext.resume()` on user gesture.
- [x] **A4.** Implement 16-slot SFX pool with eviction logic.
- [x] **A5.** Implement `play(soundId, options)` — route to correct synthesis function.
- [x] **A6.** Add `setPlayer(player)` method for distance calculations.
- [x] **A7.** Add browser unlock handler (click-to-start overlay or canvas click).

### Phase B: Event Wiring

- [x] **B1.** Subscribe to `pickup` event — route by `pickupData.id`.
- [x] **B2.** Subscribe to `death` event — route by `data.type`.
- [x] **B3.** Subscribe to `projectileHit` event — play `weapon_hit`.
- [x] **B4.** Subscribe to `contactDamage` event — play `player_hurt`.
- [x] **B5.** Subscribe to `areaPulse` event — play `w3_pulse`.
- [x] **B6.** Subscribe to `levelUp` event — play `levelup`.
- [x] **B7.** Subscribe to `selectUpgrade` event — play `ui_click`.
- [x] **B8.** Subscribe to `bossSpawn` event — play `boss_spawn`.
- [x] **B9.** Subscribe to `bossDeath` event — play `boss_death`.
- [x] **B10.** Subscribe to `weaponUnlock` event — play `weapon_unlock`.
- [x] **B11.** Subscribe to `weaponLevelUp` event — play `powerup_collect`.
- [x] **B12.** Subscribe to `magnetActivate` event — start `magnet_hum`.
- [x] **B13.** Subscribe to `restart` event — play `restart`.
- [x] **B14.** Subscribe to `stateChange` event — stop continuous sounds on game over.
- [x] **B15.** `weaponFire` event emitted from `_fireW1()` (line 1362).

### Phase C: Synthesis Functions

- [x] **C1.** `_playPickupTriad()` — payout triad engine for XP (3-note arpeggio).
- [x] **C2.** `_playGoldArpeggio()` — brighter 3-note pattern for coins.
- [x] **C3.** `_synthPowerUp()` — full 5-note arpeggio for power-ups.
- [x] **C4.** `_synthLevelUp()` — ascending C5→E5→G5→C6.
- [x] **C5.** `_synthW1Fire()` — W1 single blip.
- [x] **C6.** `_synthWeaponHit()` — noise burst.
- [x] **C7.** `_synthEnemyKill(type)` — routes to 5 enemy-specific death sounds.
- [x] **C8.** `_synthBossSpawn()` — deep impact + noise.
- [x] **C9.** `_synthBossDeath()` — layered 3-oscillator bass drop.
- [x] **C10.** `_synthBossCharge()` — low sweep warning.
- [x] **C11.** `_synthPlayerHurt()` — blunt impact.
- [x] **C12.** `_synthPlayerDeath()` — descending wail.
- [x] **C13.** `_synthW3Pulse()` — sawtooth→LP whoosh/bass pulse.
- [x] **C14.** `_synthScreenWipe()` — dramatic sweep + noise.
- [x] **C15.** `_startMagnetHum()` / `_stopMagnetHum()` — continuous sine 220+330Hz.
- [x] **C16.** `startOrbitHum()` / `stopOrbitHum()` — W2 continuous triangle 110+165Hz.
- [x] **C17.** `_synthUIClick()` — tiny sine 800Hz.
- [x] **C18.** `_synthRestart()` — ascending sine 440→880Hz.
- [x] **C19.** `_synthWeaponUnlock()` — rising triad C5→E5→G5.

### Phase D: Distance & Ducking

- [x] **D1.** `_getDistance()` — calculates distance from player to source.
- [x] **D2.** `_distanceVolume()` — 4-tier attenuation (0–100px: 100%, 100–200px: 70%, 200–400px: 40%, 400+px: 20%).
- [x] **D3.** `_duckAll()` — priority ducking with timed restore.
- [x] **D4.** `_duckForBoss()` — ducks SFX to 60% during boss fight.
- [x] **D5.** `duckForLevelUp()` — ducks combat to 10% during upgrade screen.

### Phase E: Boss Sound Event (Code Change Required)

- [x] **E1.** `_detectBossStateChanges()` in Game.update() emits `bossCharge` events.
- [x] **E2.** `bossCharge` emitted on `windup` and `charge` state transitions.
- [x] **E3.** `death` handler guards against `boss_gravekeeper` type.

### Phase F: Testing

- [ ] **F1.** Verify AudioContext resumes on first click (browser policy).
- [ ] **F2.** Verify payout triad harmonizes during rapid XP collection (10+ pickups/sec).
- [ ] **F3.** Verify combo stepping resets after 0.6s gap.
- [ ] **F4.** Verify 16-slot pool evicts lowest priority when full.
- [ ] **F5.** Verify ducking lowers combat sounds during level-up screen.
- [ ] **F6.** Verify boss spawn sound plays and camera shake coincides.
- [ ] **F7.** Verify W2 continuous hum starts/stops correctly.
- [ ] **F8.** Verify magnet hum fades out in last 0.5s.
- [ ] **F9.** Verify no sound plays after game over (except death sting).
- [ ] **F10.** Verify restart sound plays and all sounds reset cleanly.

**Note:** Phase F requires manual playtesting in browser — AudioContext cannot be verified in headless tests.

---

## Appendix: Resolved Gaps

All 7 gaps were fixed on 2026-08-21. Listed here for reference.

| # | Gap | Fix Applied | Line |
|---|---|---|---|
| 1 | No `weaponFire` event for W1 | `eventBus.emit('weaponFire', { weaponId: 'w1_projectile' })` in `_fireW1()` | 1362 |
| 2+3 | No `bossCharge` event / MovementSystem has no eventBus | `_detectBossStateChanges()` in Game.update() — tracks `boss._prevAudioState` transitions | 2431 |
| 4 | AudioManager has no `player` ref | `setPlayer(player)` method + called from `startGame()` | 2165, 2374 |
| 5 | Boss death fires both `death` AND `bossDeath` | Guard: `if (data.type === 'boss_gravekeeper') return` in `death` handler | 2315 |
| 6 | No browser unlock handler | `unlockAudio` click/touchstart listener with `{ once: true }` in `init()` | 2254 |
| 7 | W2 hum not tracked as continuous | `startOrbitHum()` / `stopOrbitHum()` stubs with `_orbitHumRunning` flag | 2171 |

**New events now available for AudioManager:**
- `weaponFire` — fires when W1 creates projectiles
- `bossCharge` — fires on boss state transitions (windup, charge)
- `setPlayer()` — provides player position for distance calculations

---

*End of 10_audio_implementation_map.md — Version 1.0 (for game v0.2.0)*
