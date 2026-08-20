# Test 11 — Cross-Spec Integration Test

> **Date:** 2026-08-20
> **Purpose:** Final validation across all 10 spec files before implementation
> **Status:** ✅ PASS

---

## UNIVERSAL VALUES CHECK

| Value | Expected | Spec 01 | Spec 02 | Spec 03 | Spec 04 | Spec 05 | Spec 06 | Spec 07 | Spec 08 | Spec 10 | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Game duration | 5 minutes | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| Boss spawn time | 4:00 | ✅ | — | — | ✅ | ✅ | — | — | ✅ | ✅ | ✅ |
| Player max HP | 100 | — | ✅ | — | ✅ | — | — | ✅ | — | ✅ | ✅ |
| Player speed | 200 px/s | — | ✅ | — | — | — | — | — | — | ✅ | ✅ |
| Pickup range | 50 px | — | ✅ | — | — | — | ✅ | — | — | ✅ | ✅ |
| Magnet radius | 350 px | — | — | — | — | — | ✅ | — | — | ✅ | ✅ |
| Magnet instant burst | 150 px | — | — | — | — | — | ✅ | — | — | ✅ | ✅ |
| XP formula | floor(375 × 1.3^(N-14)) | — | — | — | — | — | — | ✅ | — | ✅ | ✅ |
| L1→2 XP | 5 | — | — | — | — | — | — | ✅ | — | ✅ | ✅ |
| Difficulty scaling | +15% HP, +10% DMG | — | — | — | — | ✅ | — | — | — | ✅ | ✅ |
| Projectile lifetime | 3s or 600px | ✅ | — | ✅ | — | — | — | — | — | — | ✅ |
| Max enemies | 200 | ✅ | — | — | — | ✅ | — | — | — | ✅ | ✅ |
| End states | 3 (Victory/Survived/Defeat) | ✅ | — | — | — | — | — | — | ✅ | — | ✅ |
| Obstacles | 5 types, included in V1 | ✅ | — | — | — | ✅ | — | — | — | ✅ | ✅ |
| Timer shows Boss at 4:00 | 4:00 | — | — | — | — | — | — | — | ✅ | — | ✅ |
| Weapon unlocks | W2=Lv3, W3=Lv6 | — | — | ✅ | — | — | — | ✅ | — | ✅ | ✅ |

**Universal Values: 16/16 PASS**

---

## NEW VALUES FROM GAP REVIEWS

| Value | Expected | Spec 04 | Spec 06 | Spec 10 | Status |
|---|---|---|---|---|---|
| Boss screen wipe resistance | 0.8 (80%) | ✅ | ✅ | ✅ | ✅ |
| Screen wipe boss damage | 200 (20% of 1000 HP) | — | ✅ | ✅ | ✅ |
| Player hitbox | 20×20 | — | — | ✅ | ✅ |
| W2 orb damage cooldown | 0.5s | — | — | ✅ | ✅ |
| Obstacle weights | 30/10/25/15/20 | — | — | ✅ | ✅ |
| Obstacle seed derivation | hash(stageId + difficultyLevel) | — | — | ✅ | ✅ |
| Max level-up queue | 3 | — | — | ✅ | ✅ |
| Weapon unlock guaranteed | true | — | — | ✅ | ✅ |
| Excess XP behavior | carry_over | — | — | ✅ | ✅ |
| Max health passive heals current | true | — | — | ✅ | ✅ |
| W1 targeting | nearest | — | — | ✅ | ✅ |
| W2 targeting | self (orbit) | — | — | ✅ | ✅ |
| W3 targeting | player_position | — | — | ✅ | ✅ |
| Boss charge resume | continue_from_frozen | ✅ | — | ✅ | ✅ |
| Spawn cap behavior | stop_spawn (no despawn) | — | — | ✅ | ✅ |
| Difficulty scaling timer start | boss_death_timestamp | — | — | ✅ | ✅ |
| Power-up despawn | null (never despawn) | — | ✅ | ✅ | ✅ |
| Gold value per coin | 1 | — | ✅ | ✅ | ✅ |
| Drop roll order | weaponUp > screenWipe > magnet > nothing | — | ✅ | ✅ | ✅ |

**New Values: 19/19 PASS**

---

## DROP RATE CONSISTENCY CHECK

### vs_prog.md Drop Economy (Source of Truth)

| Enemy | XP | Gold | Screen Wipe | Magnet | Weapon Up |
|---|---|---|---|---|---|
| Zombie | 1 | 1–2 | — | — | 1% |
| Bat | 1 | 1 | — | 5% | — |
| Skeleton | 3 | 2–3 | 2% | — | 1% |
| Ghost | 2 | 2–3 | — | 5% | 1% |
| Caster | 3 | 3–4 | 2% | — | 1% |
| Boss | 50 | 20–30 | — | — | 100% |

### Spec 04 (Enemies) Drop Rates

| Enemy | XP | Gold | Screen Wipe | Magnet | Weapon Up | Match |
|---|---|---|---|---|---|---|
| Zombie | 1 | 1–2 | — | — | 1% | ✅ |
| Bat | 1 | 1 | — | 5% | — | ✅ |
| Skeleton | 3 | 2–3 | 2% | — | 1% | ✅ |
| Ghost | 2 | 2–3 | — | 5% | 1% | ✅ |
| Caster | 3 | 3–4 | 2% | — | 1% | ✅ |
| Boss | 50 | 20–30 | — | — | 100% | ✅ |

### Spec 10 (JSON Schemas) Drop Rates

| Enemy | XP | Gold Coins | Screen Wipe | Magnet | Weapon Up | Match |
|---|---|---|---|---|---|---|
| Zombie | 1 | 1–2 | — | — | 1% | ✅ |
| Bat | 1 | 1 | — | 5% | — | ✅ |
| Skeleton | 3 | 2–3 | 2% | — | 1% | ✅ |
| Ghost | 2 | 2–3 | — | 5% | 1% | ✅ |
| Caster | 3 | 3–4 | 2% | — | 1% | ✅ |
| Boss | 50 | 20–30 | — | — | 100% | ✅ |

**Drop Rates: All 6 enemies consistent across vs_prog.md, Spec 04, and Spec 10**

---

## WAVE TIMELINE CHECK

### vs_prog.md Wave Timeline (Source of Truth)

| Time | Spawn Rate | Max Enemies | Types |
|---|---|---|---|
| 0:00–0:30 | 0.8 | 25 | Zombie |
| 0:30–1:00 | 1.2 | 40 | Zombie |
| 1:00–1:30 | 1.5 | 60 | Zombie, Bat |
| 1:30–2:00 | 1.8 | 80 | Zombie, Bat |
| 2:00–2:30 | 2.0 | 100 | Zombie, Bat, Skeleton |
| 2:30–3:00 | 2.2 | 120 | Zombie, Bat, Skeleton, Ghost |
| 3:00–3:30 | 2.5 | 150 | All 5 |
| 3:30–4:00 | 3.0 | 180 | All 5 |
| 4:00–4:30 | 2.0 | 150 | All + Boss |
| 4:30–5:00 | 1.5 | 120 | All + Boss |

### Spec 05 (Stages) Wave Timeline

| Time | Spawn Rate | Max Enemies | Types | Match |
|---|---|---|---|---|
| 0:00–0:30 | 0.8 | 25 | Zombie | ✅ |
| 0:30–1:00 | 1.2 | 40 | Zombie | ✅ |
| 1:00–1:30 | 1.5 | 60 | Zombie, Bat | ✅ |
| 1:30–2:00 | 1.8 | 80 | Zombie, Bat | ✅ |
| 2:00–2:30 | 2.0 | 100 | Zombie, Bat, Skeleton | ✅ |
| 2:30–3:00 | 2.2 | 120 | Zombie, Bat, Skeleton, Ghost | ✅ |
| 3:00–3:30 | 2.5 | 150 | All 5 | ✅ |
| 3:30–4:00 | 3.0 | 180 | All 5 | ✅ |
| 4:00–4:30 | 2.0 | 150 | All + Boss | ✅ |
| 4:30–5:00 | 1.5 | 120 | All + Boss | ✅ |

### Spec 10 (JSON Schemas) Wave Timeline

| Time | Spawn Rate | Max Enemies | Types | Match |
|---|---|---|---|---|
| 0:00–0:30 | 0.8 | 25 | Zombie | ✅ |
| 0:30–1:00 | 1.2 | 40 | Zombie | ✅ |
| 1:00–1:30 | 1.5 | 60 | Zombie, Bat | ✅ |
| 1:30–2:00 | 1.8 | 80 | Zombie, Bat | ✅ |
| 2:00–2:30 | 2.0 | 100 | Zombie, Bat, Skeleton | ✅ |
| 2:30–3:00 | 2.2 | 120 | Zombie, Bat, Skeleton, Ghost | ✅ |
| 3:00–3:30 | 2.5 | 150 | All 5 | ✅ |
| 3:30–4:00 | 3.0 | 180 | All 5 | ✅ |
| 4:00–4:30 | 2.0 | 150 | All + Boss | ✅ |
| 4:30–5:00 | 1.5 | 120 | All + Boss | ✅ |

**Wave Timeline: All 10 brackets consistent across vs_prog.md, Spec 05, and Spec 10**

---

## ENEMY FIRST-APPEARANCE ALIGNMENT

### Spec 04 (Enemies) First Appears

| Enemy | First Appears |
|---|---|
| Zombie | 0:00 |
| Bat | 1:00 |
| Skeleton | 2:00 |
| Ghost | 2:30 |
| Caster | 3:00 |
| Boss | 4:00 |

### Spec 05 (Stages) Wave Composition

| Wave | Types | New Enemy |
|---|---|---|
| 0:00–0:30 | Zombie | — |
| 0:30–1:00 | Zombie | — |
| 1:00–1:30 | Zombie, Bat | Bat ✅ |
| 1:30–2:00 | Zombie, Bat | — |
| 2:00–2:30 | Zombie, Bat, Skeleton | Skeleton ✅ |
| 2:30–3:00 | Zombie, Bat, Skeleton, Ghost | Ghost ✅ |
| 3:00–3:30 | All 5 | Caster ✅ |
| 3:30–4:00 | All 5 | — |
| 4:00–4:30 | All + Boss | Boss ✅ |
| 4:30–5:00 | All + Boss | — |

**Enemy First Appearance: All 5 regular enemies + boss align correctly**

---

## VISUAL CONSISTENCY CHECK

### Entity Visuals vs vs_colors.md

| Entity | Shape | Color | vs_colors.md | Status |
|---|---|---|---|---|
| Player | Square | #FFD700 | Hero Gold | ✅ |
| Zombie | Square | #2D5A27 | Corpse Green | ✅ |
| Bat | Square | #1A1A2E | Bat Black | ✅ |
| Skeleton | Square | #8B1A1A | Blood Red | ✅ |
| Ghost | Square | #4A1A6B | Phantom Purple | ✅ |
| Caster | Square | #1A4A4A | Caster Teal | ✅ |
| Boss | Square | #4A0000 | Boss Crimson | ✅ |
| XP Small | Diamond | #4FC3F7 | EXP Blue | ✅ |
| XP Large | Diamond | #81D4FA | EXP Blue Light | ✅ |
| Gold Coin | Circle | #FFD700 | Gold Yellow | ✅ |
| Screen Wipe | Star | #00E676 | Power-Up Green | ✅ |
| Magnet | Circle | #FF4081 | Magnet Pink | ✅ |
| Weapon Up | Triangle | #FF9100 | Weapon Up Orange | ✅ |

**Visual Consistency: All 13 entities match vs_colors.md**

---

## AUDIO CONSISTENCY CHECK

### Sound Triggers vs Spec Events

| Sound | Trigger Event | Spec Source | Status |
|---|---|---|---|
| w1_fire | W1 fires | 03_weapons_spec.md | ✅ |
| w2_hum | W2 orbs active | 03_weapons_spec.md | ✅ |
| w3_pulse | W3 pulses | 03_weapons_spec.md | ✅ |
| zombie_kill | Zombie dies | 04_enemies_spec.md | ✅ |
| bat_kill | Bat dies | 04_enemies_spec.md | ✅ |
| skeleton_kill | Skeleton dies | 04_enemies_spec.md | ✅ |
| ghost_kill | Ghost dies | 04_enemies_spec.md | ✅ |
| caster_kill | Caster dies | 04_enemies_spec.md | ✅ |
| caster_projectile | Caster fires | 04_enemies_spec.md | ✅ |
| boss_charge | Boss begins charge | 04_enemies_spec.md | ✅ |
| boss_ground_pound | Boss slams ground | 04_enemies_spec.md | ✅ |
| boss_death | Boss dies | 04_enemies_spec.md | ✅ |
| xp_small | XP gem collected | 06_pickups_spec.md | ✅ |
| xp_large | Large XP gem collected | 06_pickups_spec.md | ✅ |
| gold_coin | Gold coin collected | 06_pickups_spec.md | ✅ |
| powerup_collect | Power-up collected | 06_pickups_spec.md | ✅ |
| levelup | Level-up triggered | 07_leveling_spec.md | ✅ |
| screenwipe | Screen wipe activated | 06_pickups_spec.md | ✅ |
| magnet_hum | Magnet active | 06_pickups_spec.md | ✅ |
| player_hurt | Player takes damage | 02_character_spec.md | ✅ |
| player_death | Player dies | 02_character_spec.md | ✅ |
| ui_click | Button press | 08_ui_hud_spec.md | ✅ |
| boss_warning | 3:50 announcement | 05_stages_spec.md | ✅ |
| boss_spawn | 4:00 boss appears | 05_stages_spec.md | ✅ |

### Boss Announcement Timing

| Event | Spec 05 (Stages) | Spec 09 (Audio) | Match |
|---|---|---|---|
| 3:50 — "Something stirs..." | 230s | 3:50 | ✅ |
| 3:55 — "The Gravekeeper rises!" | 235s | 3:55 | ✅ |
| 4:00 — Boss spawns | 240s | 4:00 | ✅ |

### Audio Config

| Check | Status |
|---|---|
| No audio.json exists | ✅ |
| Audio hardcoded in engine | ✅ |
| Web Audio API only | ✅ |

**Audio Consistency: 24/24 sounds match, boss timing aligned**

---

## SUMMARY

| Check Category | Tests | Passed | Status |
|---|---|---|---|
| Universal Values | 16 | 16 | ✅ |
| New Values (Gap Reviews) | 19 | 19 | ✅ |
| Drop Rate Consistency | 6 enemies | 6 | ✅ |
| Wave Timeline | 10 brackets | 10 | ✅ |
| Enemy First Appearance | 6 enemies | 6 | ✅ |
| Visual Consistency | 13 entities | 13 | ✅ |
| Audio Consistency | 24 sounds | 24 | ✅ |
| **TOTAL** | **94 checks** | **94** | **✅ ALL PASS** |

---

## VERDICT

✅ **TEST 11 PASS — All 94 cross-spec consistency checks pass**

No conflicts, no stale values, no missing references. All 10 spec files are fully aligned and ready for implementation.

---

*End of Test 11 — Cross-Spec Integration Test*
