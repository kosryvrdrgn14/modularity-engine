# Modularity Engine — Audio Specification

> **Version:** 1.0 (Prototype)
> **Last Updated:** 2026-08-20
> **Status:** Spec
> **Canonical Sources:** `vs_prog.md` Sound Design Arc (ALL audio values), `01_engine_architecture.md` (audio systems)

---

## Table of Contents

1. [Audio Architecture](#1-audio-architecture)
2. [SFX List](#2-sfx-list)
3. [Music Progression](#3-music-progression)
4. [Pickup Sound Engine — The Payout Triad](#4-pickup-sound-engine--the-payout-triad)
5. [Sound Priority System](#5-sound-priority-system)
6. [Distance-Based Audio](#6-distance-based-audio)
7. [Cross-Reference Summary](#7-cross-reference-summary)

---

## 1. Audio Architecture

| Property | Value |
|---|---|
| API | Web Audio API (no external libraries, no Howler.js) |
| Output | Single HTML5 file, zero external dependencies |
| Synthesis | All sounds procedurally generated using oscillators |
| Channels | SFX (multiple concurrent), Music (1 track), UI (1 concurrent) |
| Max Simultaneous Sounds | 16 (older sounds ducked/forced when exceeded) |
| Volume Defaults | Master 80%, Music 70%, SFX 85% |
| Settings UI | None in V1 |

### Audio Channels

| Channel | Concurrent | Purpose |
|---|---|---|
| SFX | 16 max | Weapon fire, enemy hit/kill, pickups, power-ups, player hurt |
| Music | 1 | Background music track (single track, crossfade transitions) |
| UI | 1 | Level-up chime, button clicks, screen transitions |

---

## 2. SFX List

All values copied EXACTLY from `vs_prog.md` Sound Design Arc section.

### Weapon Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `w1_fire` | W1 fires | Square | Single blip at base freq. Pitch scales with damage | 0.03s | Short, punchy. Laser shot. |
| `w2_hum` | W2 orbs active | Triangle | Continuous hum at 110Hz + 165Hz (perfect 5th) | Continuous | Low, constant. Orbital resonance. |
| `w3_pulse` | W3 pulses | Sawtooth → LP filter | Burst from 800Hz → 200Hz | 0.3s | Whoosh/bass pulse. Area denial. |
| `weapon_hit` | Projectile hits enemy | Noise burst | White noise × gain envelope, 200–800Hz bandpass | 0.03s | Short, percussive. |

### Enemy Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `zombie_kill` | Zombie dies | Square | Pitch drop: 400Hz → 100Hz | 0.15s | Satisfying "pop" downward. |
| `bat_kill` | Bat dies | Square | Chirp: 1200Hz → 800Hz | 0.08s | Quick, high-pitched. Matches swiftness. |
| `skeleton_kill` | Skeleton dies | Square + noise | Layered: 300Hz + 600Hz | 0.2s | Heavier. Armor break feel. |
| `ghost_kill` | Ghost dies | Sine | Wail: 600Hz → 200Hz | 0.3s | Ethereal fade. Ghostly dissipation. |
| `caster_kill` | Caster dies | Square | Burst: 500Hz → 200Hz | 0.15s | Standard. Magical fizz. |
| `boss_death` | Boss dies | Sine + square | Layered: 60Hz + 120Hz + 240Hz | 2.0s | Deep, layered. Slow-motion bass drop. |

### Pickup Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `xp_small` | Small XP gem collected | Square | Payout triad (3-note) | 0.065s | See §4 for full spec. |
| `xp_large` | Large XP gem collected | Square | Extended arpeggio (4-note) | 0.085s | Slightly louder. 4th note = Major 3rd above octave. |
| `gold_coin` | Gold coin collected | Square | Brighter pattern: Base → ×1.25 → ×1.5 | 0.055s | Shorter, brighter. Clink texture. |
| `powerup_collect` | Power-up collected | Square | Full 5-note arpeggio | 0.12s | Louder, longer. Victory feel. |
| `levelup` | Level-up triggered | Square | Ascending scale run: C5→E5→G5→C6 | 0.20s | Full octave. Slowest pickup sound. Triumphant. |
| `screenwipe` | Screen wipe activated | Sweep + noise | Descending: 2000Hz → 100Hz + white noise burst | 1.5s | Dramatic. Not part of pickup system. |
| `magnet_hum` | Magnet active | Sine | Continuous: 220Hz + 330Hz (perfect 5th) | Duration of effect | Layered. Constant, low. Magnetic texture. |

### Player Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `player_hurt` | Player takes damage | Square | 200Hz → 100Hz | 0.1s | Low, blunt impact. Immediate. |
| `player_death` | Player dies | Square + sine | 400Hz → 50Hz | 1.5s | Slow descending wail. Finality. Silence after. |

### UI Sounds

| ID | Trigger | Waveform | Pattern | Duration | Notes |
|---|---|---|---|---|---|
| `ui_click` | Button press | Sine | 800Hz | 0.02s | Tiny, clean. Button feedback. |
| `boss_warning` | 3:50 announcement | Sine | 100Hz, fading in | 2.0s | Ominous rumble. Low frequency. |
| `boss_spawn` | 4:00 boss appears | Square + noise | 80Hz → 40Hz | 1.0s | Ground-shaking impact. Heavy. |

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
| 3:50 | Silence — 2s | Music cuts out | Dramatic pause. Screen dims. |
| 3:52 | Boss Theme — Ominous Intro | Deep bass, low strings | "The Gravekeeper rises!" |
| 4:00 | Boss Theme — Full Combat | Aggressive drums, distorted synths | Boss fight. Maximum intensity. |
| 4:30 | Boss Theme — Phase 2 Escalation | Tempo +15%, added layers | Boss enters Phase 2. Desperate. |
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

## 7. Cross-Reference Summary

| Section | References |
|---|---|
| All SFX values | `vs_prog.md` Sound Design Arc (source of truth) |
| Music progression | `vs_prog.md` Sound Design Arc — Music Progression |
| Payout triad | `vs_prog.md` Sound Design Arc — Pickup Sound Engine |
| Sound priority | `vs_prog.md` Sound Design Arc — Sound Priority System |
| Distance audio | `vs_prog.md` Sound Design Arc — Distance-Based Audio |
| Audio architecture | `01_engine_architecture.md` §3 Event Bus (audio events) |
| Screen shake events | `01_engine_architecture.md` §9 Camera Effects |
| Boss spawn sequence | `05_stages_spec.md` §10 Boss Spawn Sequence |
| Boss sounds | `04_enemies_spec.md` §7 Boss: The Gravekeeper |
| Level-up sound | `07_leveling_system_spec.md` §5 Level-Up Flow |
| JSON schema | `10_json_schemas.md` (audio config) |

---

*End of 09_audio_spec.md — Version 1*
