# Modularity Engine — Changelog

---

## v0.2.0 — First Playable Build
**Date:** August 21, 2026
**Status:** Playable prototype (29 bugs fixed)

### Core Systems
- Game loop at 60 FPS with fixed timestep
- Camera follows player with smooth lerp + screen shake
- Click/tap to move + WASD/arrow key controls
- Entity pooling for enemies, projectiles, pickups, orbs

### Combat
- **W1 Projectile** — Fires toward nearest enemy, multi-shot at higher levels
- **W2 Orbit** — Blue orbs circle player, deal contact damage (unlocks at level 3)
- **W3 Area Pulse** — Orange ring damages all enemies in radius (unlocks at level 6)
- Crit system (5% chance, 1.5x multiplier) now functional
- Damage multiplier upgrade system

### Enemies
- 5 enemy types with unique behaviors:
  - **Zombie** — Basic chase
  - **Bat** — Fast with erratic swarm movement
  - **Skeleton** — Tanky chase
  - **Ghost** — Wander/chase pattern
  - **Caster** — Maintains distance (ranged archetype)
- **Boss: The Gravekeeper** — Charge attack pattern, spawns at 4:00

### Progression
- XP gems from enemy kills
- Level-up system with upgrade selection (1/2/3 keys or click)
- 3 upgrade types: Damage Up (+15%), Speed Up (+10%), Health Up (+20 HP)
- Wave timeline with 10 brackets over 5 minutes
- Gold coins (tracked visually, no spending in V1)

### Pickups
- XP gems (diamonds, blue)
- Gold coins (circles, gold)
- Screen Wipe (star, green) — kills all enemies
- Magnet (circle, pink) — attracts pickups for 10s
- Weapon Level-Up (triangle, orange)

### UI
- HP bar (red)
- Level badge (blue circle, top-right)
- XP bar (bottom)
- Boss health bar during boss fight
- Floating damage numbers and pickup text indicators
- Level-up upgrade selection screen
- End screen (Victory/Survived/Defeated) with stats
- Restart on click/Enter/Space

### Audio
- Stub only (Web Audio API initialized, no sounds)

### Bug Fixes (29 total)
- Level-up upgrade selection stuck
- Enemies spawning at world origin
- Bat invisible (color matched background)
- Projectile despawn using origin distance
- Division by zero in weapon targeting/movement
- Y-sort NaN crash risk
- Weapons W2/W3 never unlocking
- W2 orbs had no collision with enemies
- W3 pulse had no visual effect
- Renderer initialization order
- Game freeze on game over
- Boss death not triggering victory
- No restart from end screen
- Damage upgrade had no effect on weapons
- Crits never proccing from weapons
- Restart state machine deadlock
- Duplicate game loops on restart
- No floating damage numbers
- No boss health bar
- Boss had no behavior (just chased)
- Enemy behavior patterns not implemented
- W1/W3 multi-shot not implemented
- Speed Up wrong stat key
- WeaponSystem not reset on restart
- Double power-ups per level (addXP while loop)
- Upgrade key repeat applying upgrades multiple times

### Known Limitations
- Audio not implemented
- Gold not tracked on HUD
- Weapon power spikes (level 4/7 effects) not implemented
- Passive upgrade pool limited to 3 types
- No pickup despawn timer
- Caster doesn't fire projectiles
- Boss Phase 2 (minions, ground pound) not implemented
- Screen wipe has no visual flash effect

---

## v0.1.0 — Design Phase Complete
**Date:** August 20, 2026
**Status:** Spec files only

### Files Created
- `vs_plan.md` — Master design document
- `vs_prog.md` — Progression & balance
- `vs_colors.md` — Visual specifications
- `01_engine_architecture.md` through `10_json_schemas.md` — Full specs
- `simulation_report.md` — Game balance simulation
- `test_11_cross_spec_integration.md` — Cross-spec validation
- `implement_prototype.md` — Implementation plan
- `pitfalls_review.md` — AI pitfalls guide
