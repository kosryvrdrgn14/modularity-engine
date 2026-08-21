# Modularity Engine — Audio Specification

> **Version:** 1.1 (Prototype)
> **Last Updated:** 2026-08-21
> **Status:** Spec — Updated for v0.2.0 game state
> **Canonical Sources:** `vs_prog.md` Sound Design Arc (ALL audio values), `01_engine_architecture.md` (audio systems)

---

## Table of Contents

1. [Audio Architecture](#1-audio-architecture)
2. [SFX List](#2-sfx-list)
3. [Music Progression](#3-music-progression)
4. [Pickup Sound Engine — The Payout Triad](#4-pickup-sound-engine--the-payout-triad)
5. [Sound Priority System](#5-sound-priority-system)
6. [Distance-Based Audio](#6-distance-based-audio)
7. [QA Acceptance — Fun Factor Checklist](#7-qa-acceptance--fun-factor-checklist)
8. [Cross-Reference Summary](#8-cross-reference-summary)

---

## 1. Audio Architecture

| Property | Value |
|---|---|
| API | Web Audio API (no external libraries, no Howler.js) |
| Output | Single HTML5 file, zero external dependencies |
| Synthesis | All sounds procedurally generated using oscillators |
| Channels | SFX (multiple concurrent), Music (1 track), UI (1 concurrent) |
| Max Simultaneous Sounds | 16 (eviction logic in §1.1 below) |
| Volume Defaults | Master 80%, Music 70%, SFX 85% |
| Settings UI | None in V1 |

### Audio Channels

| Channel | Concurrent | Purpose |
|---|---|---|
| SFX | 16 max (eviction per §1.2) | Weapon fire, enemy hit/kill, pickups, power-ups, player hurt |
| Music | 1 (never evicted) | Background music track (layer-based synthesis, crossfade transitions) |
| UI | 1 | Level-up chime, button clicks, screen transitions |

### 1.1 AudioContext Initialization & Browser Unlock

Modern browsers block audio playback until a user gesture (click, tap, keypress). The game must handle this explicitly.

**Boot sequence:**
1. On game load, create a suspended `AudioContext`: `new AudioContext()` → state = `suspended`.
2. Show the title screen with a "Click to Start" / "Tap to Start" prompt.
3. On the first user click/tap on the start button:
   a. Call `audioContext.resume()` to unlock the audio context.
   b. Play the `ui_click` sound as a confirmation blip (verifies audio is working).
   c. Start the game and begin music playback.
4. If `audioContext.resume()` fails, the game continues silently — audio is non-blocking.

**Edge cases:**
- If the user tabs away and returns, the AudioContext may re-suspend. On `visibilitychange` → `visible`, call `audioContext.resume()` if suspended.
- On mobile, ensure the start button is a direct touch event (not a programmatic tap) to satisfy browser unlock requirements.

### 1.2 Sound Pool & Eviction Logic

The engine maintains a pool of 16 active sound slots. When a new sound triggers and all slots are occupied:

1. **Evict lowest-priority active sound** using the priority table in §5. If multiple sounds share the same priority, evict the oldest (earliest start time).
2. **Boss sounds cannot be evicted** — they always find a slot by evicting lower-priority sounds first.
3. **Player hurt/death sounds cannot be evicted** — they are priority 1 and always play.
4. **Pooled sounds** are `OscillatorNode` + `GainNode` pairs. When evicted, the oscillator is stopped and the slot is freed immediately.
5. **SFX slots vs Music slot:** Music occupies a dedicated 1 slot separate from the 16 SFX slots. Music is never evicted.

**Slot allocation:**
- SFX pool: 16 slots shared across weapon, enemy, pickup, player, and UI sounds.
- Music pool: 1 dedicated slot.
- Total simultaneous: up to 17 (16 SFX + 1 music).

---

## 2. SFX List

All values copied EXACTLY from `vs_prog.md` Sound Design Arc section.

### Weapon Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `w1_fire` | W1 fires | Square | Single blip at base freq. Pitch scales with damage | 0.03s | Short, punchy. Laser shot. |
| `w2_hum` | W2 orbs active | Triangle | Continuous hum at 110Hz + 165Hz (perfect 5th) | Continuous while W2 equipped | Low, constant. Orbital resonance. Stops when W2 is unequipped, player dies, or game ends. |
| `w3_pulse` | W3 pulses | Sawtooth → LP filter | Burst from 800Hz → 200Hz | 0.3s | Whoosh/bass pulse. Area denial. |
| `weapon_hit` | Projectile hits enemy | Noise burst | White noise × gain envelope, 200–800Hz bandpass | 0.03s | Short, percussive. |

### Enemy Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `zombie_kill` | Zombie dies | Square | Pitch drop: 400Hz → 100Hz | 0.15s | Satisfying "pop" downward. |
| `bat_kill` | Bat dies | Square | Chirp: 1200Hz → 800Hz | 0.08s | Quick, high-pitched. Matches swiftness. |
| `skeleton_kill` | Skeleton dies | Square + noise | Layered: 300Hz + 600Hz | 0.2s | Heavier. Armor break feel. |
| `ghost_kill` | Ghost dies | Sine | Wail: 600Hz → 200Hz | 0.3s | Ethereal fade. Ghostly dissipation. |
| `caster_projectile` | Caster fires projectile | Square | Rising blip: 300Hz → 600Hz | 0.08s | Short, magical. Projectile launch cue. **[FUTURE — Caster ranged attack not yet implemented]** |
| `caster_kill` | Caster dies | Square | Burst: 500Hz → 200Hz | 0.15s | Standard. Magical fizz. |
| `boss_charge` | Boss begins charge | Square | Low sweep: 80Hz → 120Hz | 0.4s | Warning growl. Player should dodge. |
| `boss_ground_pound` | Boss slams ground | Square + noise | Deep impact: 60Hz + noise burst | 0.5s | Heavy. Screen shakes. Area damage cue. **[FUTURE — Boss Phase 2 not yet implemented]** |
| `boss_death` | Boss dies | Sine + square | Layered: 60Hz + 120Hz + 240Hz | 2.0s | Deep, layered. Slow-motion bass drop. |

### Pickup Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `xp_small` | Small XP gem collected | Square | Payout triad (3-note) | 0.065s | See §4 for full spec. |
| `xp_large` | Large XP gem collected | Square | Extended arpeggio (4-note) | 0.085s | Slightly louder. 4th note = Major 3rd above octave. **[FUTURE — Only small gems drop in v0.2.0]** |
| `gold_coin` | Gold coin collected | Square | Brighter pattern: Base → ×1.25 → ×1.5 | 0.055s | Shorter, brighter. Clink texture. |
| `powerup_collect` | Power-up collected | Square | Full 5-note arpeggio | 0.12s | Louder, longer. Victory feel. |
| `levelup` | Level-up triggered | Square | Ascending scale run: C5→E5→G5→C6 | 0.20s | Full octave. Slowest pickup sound. Triumphant. |
| `screenwipe` | Screen wipe activated | Sweep + noise | Descending: 2000Hz → 100Hz + white noise burst | 1.5s | Dramatic. Not part of pickup system. |
| `magnet_hum` | Magnet active | Sine | Continuous: 220Hz + 330Hz (perfect 5th) | Duration of effect, fades out over 0.5s in last second | Layered. Constant, low. Smooth fade-out at end. |

### Player Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `player_hurt` | Player takes damage | Square | 200Hz → 100Hz | 0.1s | Low, blunt impact. Immediate. |
| `player_death` | Player dies | Square + sine | 400Hz → 50Hz | 1.5s | Slow descending wail. Finality. Silence after. |

### UI Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `ui_click` | Button press | Sine | 800Hz | 0.02s | Tiny, clean. Button feedback. |
| `boss_warning` | 3:50 announcement | Sine | 100Hz, fading in | 2.0s | Ominous rumble. Low frequency. **[FUTURE — No announcement system yet]** |
| `boss_spawn` | 4:00 boss appears | Square + noise | 80Hz → 40Hz | 1.0s | Ground-shaking impact. Heavy. |
| `weapon_unlock` | New weapon unlocked | Square | Rising triad: C5→E5→G5 | 0.15s | Triumphant jingle. "New toy!" feel. **[NEW — v0.2.0]** |
| `restart` | Game restarted after death | Sine | 440Hz → 880Hz | 0.1s | Quick ascending blip. Fresh start. **[NEW — v0.2.0]** |

### Sounds Not Yet Implemented (Marked [FUTURE])

These sounds reference game features that are not yet built. Implement them when the corresponding feature ships.

| Sound ID | Feature Required | Priority |
|---|---|---|
| `caster_projectile` | Caster ranged attack behavior | Medium |
| `boss_ground_pound` | Boss Phase 2 attack | High |
| `boss_warning` | 3:50 announcement system | High |
| `xp_large` | Large XP gem drop | Low |
| `w2_hum` | W2 continuous orbital hum (W2 exists but no continuous sound) | Medium |

---

## 2.1 Event-to-Sound Mapping

This table maps game engine events (from the EventBus) to sound IDs. The AudioManager listens for these events and triggers the corresponding sound.

| Game Event | Event Data | Sound ID | Notes |
|---|---|---|---|
| `pickup` | `{ type: 'exp_small' }` | `xp_small` | Payout triad engine (§4) |
| `pickup` | `{ type: 'exp_large' }` | `xp_large` | **[FUTURE]** Extended arpeggio |
| `pickup` | `{ type: 'gold_coin' }` | `gold_coin` | Brighter arpeggio pattern |
| `pickup` | `{ type: 'screen_wipe' }` | `screenwipe` | Dramatic sweep + noise |
| `pickup` | `{ type: 'magnet' }` | `magnet_hum` | Continuous hum, fades on pickup end |
| `pickup` | `{ type: 'weapon_levelup' }` | `powerup_collect` | Full 5-note arpeggio |
| `pickup` | `{ type: 'health' }` | `powerup_collect` | Reuse power-up sound |
| `levelUp` | `{ level }` | `levelup` | Ascending scale run |
| `selectUpgrade` | `{ index }` | `ui_click` | Button feedback |
| `projectileHit` | `{ entity, damage }` | `weapon_hit` | Short noise burst |
| `projectileFire` | `{ weaponId }` | `w1_fire` | Single blip |
| `orbHit` | `{ entity, damage }` | `weapon_hit` | Short noise burst |
| `areaPulse` | `{ radius }` | `w3_pulse` | Whoosh/bass pulse |
| `death` | `{ entity, type }` | `{type}_kill` | Enemy-specific death sound |
| `death` | `{ entity, type: 'player' }` | `player_death` | Slow descending wail |
| `contactDamage` | `{ entity, damage }` | `player_hurt` | Low blunt impact |
| `bossSpawn` | `{ entity }` | `boss_spawn` | Ground-shaking impact |
| `bossCharge` | `{ entity }` | `boss_charge` | Warning growl |
| `bossDeath` | `{ entity }` | `boss_death` | Slow-motion bass drop |
| `weaponUnlock` | `{ weaponId }` | `weapon_unlock` | **[NEW]** Rising triad jingle |
| `restart` | `{}` | `restart` | **[NEW]** Quick ascending blip |
| `magnetActivate` | `{}` | `magnet_hum` | Continuous magnetic hum |

### Implementation Notes

- The AudioManager should subscribe to these events via the EventBus during `AudioManager.init()`.
- For events with subtypes (e.g., `pickup` with `type`), the AudioManager checks `eventData.type` to select the correct sound.
- Distance-based attenuation (§6) applies to spatial sounds (enemy deaths, weapon hits, pickups). Player sounds and UI sounds bypass distance checks.
- The `w2_hum` continuous sound is triggered by `weaponUnlock` with `weaponId: 'w2_orbit'` and stopped when the weapon is no longer active.

---

## 3. Music Progression

Values copied EXACTLY from `vs_prog.md` Music Progression section.

| Time | Track | Transition | Feel |
|---|---|---|---|
| 0:00 | Stage Theme — Ambient Intro | Fade in over 2s | Quiet. Atmospheric. Gothic synth pads. |
| 0:15 | Stage Theme — Beat Drop | Drums enter | Rhythm kicks in. Player moves. |
| 1:00 | Stage Theme — Building Loop | Add bass layer | Bats arrive. Tension rising. |
| 2:00 | Stage Theme — Full Intensity | Add lead synth | Skeletons and ghosts. Full chaos. |
| 3:30 | Stage Theme — Pre-Boss Build | Strings swell, drums intensify | "Something is coming." |
| 3:50 | Silence — 2s | Music cuts out | Dramatic pause. Screen dims. **[FUTURE — No announcement system]** |
| 3:52 | Boss Theme — Ominous Intro | Deep bass, low strings | "The Gravekeeper rises!" |
| 4:00 | Boss Theme — Full Combat | Aggressive drums, distorted synths | Boss fight. Maximum intensity. |
| 4:30 | Boss Theme — Phase 2 Escalation | Tempo +15%, added layers | Boss enters Phase 2. Desperate. **[FUTURE — Phase 2 not implemented]** |
| Boss death | Victory Sting | 2s brass fanfare | Relief. Triumph. |
| 5:00 (survived) | Game Over — Melancholic | Piano + strings, 5s fade | Bittersweet. Stats reveal. |
| Player death | Death Sting — Low boom | 1s impact, then silence | Finality. Defeat. |

### SFX Layering by Minute

From `vs_prog.md` Sound Design Arc section.

| Minute | Active Sounds | Density | Audio Character |
|---|---|---|---|
| 0:00–1:00 | W1 fire, zombie hit/kill, XP pickup, gold pickup | Sparse | Individual sounds are distinct and clear. |
| 1:00–2:00 | + W2 orbit hum, bat death screech, level-up chime | Moderate | Two weapons. Bat swarms add texture. |
| 2:00–3:00 | + W3 area pulse, skeleton armor clank, ghost wail, power-up drop | Dense | Three weapons. New enemy sounds layer in. |
| 3:00–4:00 | + Caster projectile, screen wipe whoosh, magnet hum | Very Dense | Cacophony. Sounds blend into chaos. |
| 4:00–5:00 | + Boss charges, boss minions, ground pound, boss death | Peak | Boss sounds dominate. Regular sounds ducked. |

### Key Sound Moments

From `vs_prog.md` Sound Design Arc section.

| Moment | Sound | Emotional Payoff |
|---|---|---|
| First level-up (0:05) | Ascending chime + card reveal | "I'm getting stronger." |
| First weapon unlock (0:15) | Power-up jingle + weapon equip sound | "New toy!" |
| W1 hits L4 (2:00) | Enhanced fire sound + pierce whoosh | "My weapon evolved." |
| First screen wipe | Dramatic whoosh/boom + silence | "I survived that." Relief. |
| First magnet | Magnetic hum + rapid pickup chimes | "Look at all that XP!" Rush. |
| Boss warning (3:50) | Music cuts. Ominous rumble. | Dread. Anticipation. |
| Boss spawn (4:00) | Entrance roar + ground shake | "Here it comes." Heart pounding. |
| W1 hits L7 (3:30) | Split projectile sound + visual fanfare | "I'm unstoppable." Peak power. |
| Boss death (4:15) | Explosion + slow-mo bass drop + victory sting | "I did it." Catharsis. |
| Game over (5:00) | Death sting or melancholic piano | Finality. "One more try." |

### Crossfade Rules

From `vs_prog.md` Sound Design Arc section.

| Transition | Method | Duration |
|---|---|---|
| Normal track change | Crossfade | 2s |
| Pre-boss silence (3:50) | Instant cut | 0s |
| Boss death victory sting | Slow-mo bass drop | 1.5s |
| Game over melancholic | Fade in | 5s |

### Music Synthesis Approach

Since the prototype is a single HTML file with zero external assets, all music is synthesized using Web Audio API oscillators and noise generators. There are no audio files, no base64-encoded tracks, and no external music libraries.

**Instrument bank (all synthesized):**

| Instrument | Waveform | Technique | Used For |
|---|---|---|---|
| Synth Pad | Sawtooth + LP filter | Low-pass filtered sawtooth, slow LFO on filter cutoff. Cutoff sweeps 200Hz↔800Hz over 4s. | Atmospheric layers, ambient intro, pre-boss build |
| Bass | Square | Sub-bass at 55Hz (A1) + 110Hz (A2). Simple root-note pattern, 120 BPM. | Bass layer, boss ground pound rhythm |
| Drums (Kick) | Sine | Pitch sweep 150Hz → 40Hz over 0.08s. Gain envelope: instant attack, fast decay. | Kick drum, 4-on-the-floor pattern |
| Drums (Hi-hat) | Noise | White noise × gain envelope, 5kHz HP filter. 0.03s decay. | Hi-hat, 8th-note pattern |
| Drums (Snare) | Noise + Sine | Noise burst (3kHz BP) + sine body (200Hz). 0.1s decay. | Snare, beats 2 and 4 |
| Lead Synth | Square | Simple melody line. C5–C6 range. 1/8th note steps. | Lead melody, full intensity section |
| Strings | Sawtooth + LP filter | Multiple detuned sawtooth oscillators (±5 cents). Slow attack (0.3s), slow release (1s). | Swell builds, pre-boss tension, boss theme layers |
| Brass | Square + Sawtooth | Square body + sawtooth overtone. Medium attack (0.1s). | Victory sting fanfare, boss hits |
| Piano | Triangle | Triangle wave body + quick decay. Simple chords. | Game over melancholic, quiet moments |

**Music layering model:**

The music system uses a **layer-based approach**. Each "track" in the progression table is actually a combination of active layers:

| Time | Active Layers | Layer Configuration |
|---|---|---|
| 0:00 | Pad only | Pad at 30% volume, 2s fade-in |
| 0:15 | Pad + Drums | Add kick + hi-hat at 60% volume |
| 1:00 | Pad + Drums + Bass | Add bass at 50% volume |
| 2:00 | Pad + Drums + Bass + Lead | Add lead at 40% volume |
| 3:30 | All + Strings | Add strings at 60%, increasing to 80% over 20s |
| 3:50 | None (silence) | All layers fade to 0 over 0.2s |
| 3:52 | Bass + Strings (low) | Boss intro: bass at 30%, strings at 20% |
| 4:00 | Bass + Drums + Lead + Strings | Full combat: all layers at 70–80% |
| 4:30 | All (tempo +15%) | Phase 2: increase tempo by 15%, add brass hits |
| Boss death | Brass only | Victory fanfare: brass at 80%, 2s hold, 1s fade |
| 5:00 | Piano | Melancholic: piano at 50%, simple chord progression, 5s fade |
| Player death | None → low boom | 1s sine sweep 80Hz→40Hz, then silence |

**BPM:** 120 BPM base (144 BPM during Phase 2 escalation at 4:30).

### Crossfade Implementation

Since all music is synthesized layers (not pre-recorded tracks), "crossfading" is implemented as layer volume transitions:

- **Normal track change (2s crossfade):** Outgoing layers ramp volume to 0% over 2s. Incoming layers ramp volume to target over 2s. Both run simultaneously during transition.
- **Pre-boss silence (instant cut):** All layer gain nodes set to 0 immediately (no ramp). Set `gain.linearRampToValueAtTime(0, currentTime)`.
- **Boss death victory sting:** After boss death, all combat layers fade to 0 over 1.5s (slow-mo bass drop effect: simultaneously sweep bass oscillator from 80Hz→40Hz). Then brass layer fades in for 2s fanfare.
- **Game over melancholic:** All layers at 0. Piano layer fades in from 0 to 50% over 5s.

**Ducking integration:** Layer volume = base volume × ducking multiplier. When ducking triggers (§5), the engine iterates active layers and multiplies their gain by the duck factor (0.8 for high-priority duck, 0.7 for boss active, 0.1 for level-up screen).

---

## 4. Pickup Sound Engine — The Payout Triad

All values copied EXACTLY from `vs_prog.md` Pickup Sound Engine section.

### Oscillator Configuration

| Parameter | Value | Rationale |
|---|---|---|
| Waveform | `square` | Crunchy, retro 8-bit arcade texture. Harmonically rich. |
| Attack | 0.005s | Instant on. No fade-in. Matches percussive "clink." |
| Decay | 0.04s | Very short. Each note is a blip, not a tone. |
| Release | 0.02s | Sharp cutoff. Notes do not bleed into each other. |
| Total Duration | ~0.065s per arpeggio | Fast enough that 10+ pickups/sec still sound distinct. |

### C Major Harmonic Scale (C5–C6)

All pickup tones are locked to the C Major scale in the C5–C6 octave. Rapid, overlapping pickups **harmonize** instead of creating dissonant ear fatigue.

| Scale Degree | Note | Frequency (Hz) |
|---|---|---|
| 1 | C5 | 523.25 |
| 2 | D5 | 587.33 |
| 3 | E5 | 659.25 |
| 4 | F5 | 698.46 |
| 5 | G5 | 783.99 |
| 6 | A5 | 880.00 |
| 7 | B5 | 987.77 |
| 8 | C6 | 1046.50 |

### Payout Triad Arpeggio Pattern

Each pickup triggers a rapid, quantized 3-note arpeggio — not a smooth pitch slide:

```
Note 1 (0.00s): Base Note    → e.g., 523.25 Hz (C5)
Note 2 (0.02s): Perfect 5th  → Base × 1.5 → e.g., 784.88 Hz
Note 3 (0.04s): Octave       → Base × 2.0 → e.g., 1046.50 Hz
```

The Perfect 5th (ratio 3:2) is the most consonant interval after the octave. Combined with the octave (ratio 2:1), it forms a **major triad** — the most psychologically "rewarding" chord in Western music theory.

### Variance Engine — Anti-Repetition System

Three layered techniques prevent the "machine gun effect" during high-velocity collection:

**1. Combo Stepping**

An index counter advances through the C Major scale array with each pickup:

```
Pickup 1 → Base = C5 (523.25 Hz)
Pickup 2 → Base = D5 (587.33 Hz)
Pickup 3 → Base = E5 (659.25 Hz)
Pickup 4 → Base = F5 (698.46 Hz)
Pickup 5 → Base = G5 (783.99 Hz)
Pickup 6 → Base = A5 (880.00 Hz)
Pickup 7 → Base = B5 (987.77 Hz)
Pickup 8 → Base = C6 (1046.50 Hz)
Pickup 9 → Base = C5 (reset to start)
```

**Reset condition:** If the time delta between pickups exceeds **0.6 seconds**, the combo index resets to 0. Fast collection creates a rising melodic cascade; isolated pickups start from C5.

**2. Micro-Tuning Jitter**

Random frequency offset of **±15 Hz** applied to each note:

```
final_freq = base_freq + random(-15, +15)
```

Large enough to be perceptible (human ear detects ~3.6 Hz differences), small enough to stay consonant.

**3. Volume Decoupling**

Randomize peak gain per note trigger:

```
peak_gain = random(0.08, 0.12)
```

Mimics natural inconsistency of physical coins hitting a tray — a sound humans associate with reward.

### Pickup Sound Specifications by Type

| Pickup Type | Arpeggio Pattern | Duration | Peak Gain | Notes |
|---|---|---|---|---|
| XP Gem (Small) | Base → ×1.5 → ×2.0 | 0.065s | 0.08–0.12 | Standard payout triad. Combo-stepped. |
| XP Gem (Large) | Base → ×1.5 → ×2.0 → ×2.5 | 0.085s | 0.10–0.14 | Extended (4 notes). Louder. |
| Gold Coin | Base → ×1.25 → ×1.5 | 0.055s | 0.09–0.13 | Shorter, brighter. Clink texture. |
| Power-Up Collect | Base → ×1.25 → ×1.5 → ×2.0 → ×2.5 | 0.12s | 0.15–0.20 | Full 5-note. Louder, longer. |
| Level-Up | C5→E5→G5→C6 | 0.20s | 0.18–0.22 | Full octave scale run. Triumphant. |
| Screen Wipe | 2000Hz → 100Hz sweep + noise | 1.5s | 0.20–0.25 | Dramatic. Not part of pickup system. |
| Magnet Hum | Continuous 220Hz + 330Hz | Duration | 0.05–0.08 | Layered perfect 5th. Magnetic texture. |

---

## 5. Sound Priority System

From `vs_prog.md` Sound Priority System section.

### Priority Order (highest to lowest)

| Priority | Sound |
|---|---|
| 1 | Player hurt / death |
| 2 | Power-up collected |
| 3 | Level-up |
| 4 | Boss sounds (charges, ground pound, death) |
| 5 | Screen wipe |
| 6 | Weapon fire (player's weapons) |
| 7 | Enemy death |
| 8 | Weapon hit |
| 9 | Pickup collection (XP, gold) |
| 10 | Enemy ambient (bats, ghosts) |

### Ducking Rules

From `vs_prog.md` Sound Priority System section.

| Trigger | Effect | Duration |
|---|---|---|
| High-priority sound plays | Lower volume of all lower-priority sounds by 20% | 0.3s |
| Boss active | Duck all regular combat sounds by 30% | While boss alive |
| Level-up screen | Duck all combat sounds to 10% volume | While level-up screen visible |

### Ducking Implementation

Each active SFX slot and the music layer system has a `GainNode`. Ducking modifies these gain nodes:

**Gain chain:** `source oscillator → per-sound gain (volume decoupling) → priority gain (ducking) → channel gain (SFX/Music/UI) → master gain`

**Ducking algorithm:**
1. When a high-priority sound (priority 1–3) triggers:
   a. For each active slot with priority > triggering sound's priority: set `priorityGain.gain.linearRampToValueAtTime(0.8, currentTime + 0.05)`.
   b. After 0.3s, restore all ducked slots: `priorityGain.gain.linearRampToValueAtTime(1.0, currentTime + 0.1)`.
2. When boss becomes active (boss spawns):
   a. For all active slots with priority > 4 (below boss): set `priorityGain` to 0.7.
   b. On boss death: restore all to 1.0 over 0.5s.
3. When level-up screen opens:
   a. Set ALL combat sound `priorityGain` to 0.1.
   b. UI channel remains at 1.0 (level-up chime plays at full volume).
   c. On level-up screen close: restore all to 1.0 over 0.2s.

**Ducking stacking:** If multiple duck triggers are active simultaneously, the lowest gain value wins (not additive). Example: Boss active (0.7) + high-priority sound (0.8) → final gain = 0.7.

---

## 6. Distance-Based Audio

From `vs_prog.md` Distance-Based Audio section.

| Distance | Volume | Effect |
|---|---|---|
| 0–100px | 100% | Full volume. Immediate. |
| 100–200px | 70% | Noticeable but not overwhelming. |
| 200–400px | 40% | Atmospheric. Fills the space. |
| 400px+ | 20% | Barely audible. Background texture. |

### Exceptions

| Sound Type | Minimum Volume | Rationale |
|---|---|---|
| Player sounds (weapon fire, hurt, death) | 100% always | Player needs to hear their own actions |
| Boss sounds | 80% minimum | Maintain boss presence regardless of distance |

---

## 7. QA Acceptance — Fun Factor Checklist

From `vs_prog.md` Sound Design Arc. These are the sound-specific acceptance criteria for the prototype. Every item must be verified during playtesting.

| # | Checkpoint | Verified |
|---|---|---|
| 1 | First level-up sound feels rewarding (ascending chime + card reveal) | ☐ |
| 2 | Weapon unlock sound feels like a power jump (power-up jingle + equip) | ☐ |
| 3 | Screen wipe sound creates a moment of relief (whoosh/boom + silence) | ☐ |
| 4 | Magnet pickup sound creates a rush of satisfaction (hum + rapid chimes) | ☐ |
| 5 | Boss warning silence creates genuine tension (music cuts, low rumble) | ☐ |
| 6 | Boss death sound provides catharsis (explosion + slow-mo bass + sting) | ☐ |
| 7 | Death sting feels final, not frustrating (low boom, then silence) | ☐ |
| 8 | Late-game chaos sounds intense but not painful (ducking keeps it balanced) | ☐ |
| 9 | No single sound becomes annoying through repetition (variance engine works) | ☐ |
| 10 | Music builds naturally and doesn't feel jarring (smooth layer transitions) | ☐ |
| 11 | XP pickup arpeggios harmonize during rapid collection (no dissonance) | ☐ |
| 12 | Combo stepping creates melodic rise during Magnet vacuum | ☐ |
| 13 | Gold coin pickup sounds distinct from XP pickup (different arpeggio pattern) | ☐ |
| 14 | Each weapon has a unique, recognizable fire sound | ☐ |
| 15 | Enemy hit sounds provide satisfying feedback without overwhelming | ☐ |
| 16 | Boss spawn sound creates genuine physical tension (low frequency impact) | ☐ |

**How to verify:** Play through a full 5-minute run. Check each item during the corresponding game moment. Items 1–7 are one-shot moments. Items 8–16 require sustained attention across the full run.

---

## 8. Cross-Reference Summary

| Section | References |
|---|---|
| All SFX values | `vs_prog.md` Sound Design Arc (source of truth) |
| Event→Sound mapping | §2.1 Event-to-Sound Mapping (game events → sound IDs) |
| Music progression | `vs_prog.md` Sound Design Arc — Music Progression |
| Music synthesis | §3 Music Synthesis Approach (instrument bank, layer model) |
| Crossfade implementation | §3 Crossfade Implementation (layer volume transitions) |
| Audio initialization | §1.1 AudioContext Initialization & Browser Unlock |
| Sound pool / eviction | §1.2 Sound Pool & Eviction Logic |
| Payout triad | `vs_prog.md` Sound Design Arc — Pickup Sound Engine |
| Sound priority | `vs_prog.md` Sound Design Arc — Sound Priority System |
| Ducking implementation | §5 Ducking Implementation (gain chain, stacking rules) |
| Distance audio | `vs_prog.md` Sound Design Arc — Distance-Based Audio |
| QA checklist | §7 QA Acceptance — Fun Factor Checklist (from `vs_prog.md`) |
| Audio architecture | `01_engine_architecture.md` §3 Event Bus (audio events) |
| Screen shake events | `01_engine_architecture.md` §9 Camera Effects |
| Boss spawn sequence | `05_stages_spec.md` §10 Boss Spawn Sequence |
| Boss sounds | `04_enemies_spec.md` §7 Boss: The Gravekeeper |
| Level-up sound | `07_leveling_system_spec.md` §5 Level-Up Flow |
| Audio config | Hardcoded in engine (no JSON file — see Prompt 10 audio note) |

---

*End of 09_audio_spec.md — Version 1.2 (updated for v0.2.0 game state, added event→sound mapping, marked 5 future sounds, added 2 new sounds)*
