# Spec Update Roadmap

> **Date:** August 26, 2026  
> **Purpose:** Plan incremental spec updates to align with `design-goal-scope.md`  
> **Approach:** Resolve conflicts first → update existing specs → create new specs  
> **Rule:** One spec at a time, dependency-ordered

---

## Phase 0: Resolve Conflicts (Decisions Required)

These decisions affect multiple specs and must be made before any spec updates.

| # | Decision | Affects | Options | Recommendation |
|---|---|---|---|---|
| D1 | **Companion slots: 3** | §20, §21, §22, game_frame, UI | ✅ DECIDED: 3 slots. W1=C1, W2=C2, W3=C3. One companion per weapon. |
| D2 | **Companion damage: Always invulnerable** | §20, §21, combat engine | ✅ DECIDED: Always invulnerable. Protected quest targets = map assets with HP. |
| D3 | **Stage length tiers: 3/5/10min** | §05, combat engine, spawn system | ✅ DECIDED: 3min=quick grind, 5min=baseline story, 10min=highlight. Frontloaded weapons for 3min, scaling for 10min, mix for 5min. |
| D4 | **Estate production: Materials + Quests + Unlocks** | game_frame §5, economy | ✅ DECIDED: No gold. Estates produce materials, quests, and unlock content only. |
| D5 | **Companion-weapon binding: 1:1** | §20, combat engine | ✅ DECIDED: C1 buffs W1, C2 buffs W2, C3 buffs W3. Companion upgrades mirror weapon. |
| D6 | **Faction system: Keep + massive expansion** | game_frame §7 | ✅ DECIDED: Keep 3 core. 50-55 wife roster from multiple mythologies expands factions. Some lore-only. |
| D7 | **Skill tree: Placeholder** | game_frame §8 | ✅ DECIDED: Keep 5-branch as placeholder. Unlocks/bonuses. Game playable without it. |
| D8 | **Gold income: Combat + Quests + Events** | economy, combat, estates | ✅ DECIDED: Three gold sources. No estate income. |

**Status:** ✅ ALL DECISIONS RESOLVED (August 26, 2026). Proceed to Phase 1.

---

## Phase 1: Update Core Framework Specs

These specs are referenced by everything else. Update them first.

### Step 1: Update `game_frame.md` (Master Framework)

**Why first:** This is the source of truth for all systems. Every other spec references it.

| Section | Update | New Content |
|---|---|---|
| §2 Save Data | Already updated ✅ | `town.level`, `town.currentLocation` etc. |
| §5 City Builder | Add reference to §22 ✅ | Cross-reference added |
| §5 Economy | Update estate model | Estates produce materials/quests, not gold (if D4=B) |
| §6 NPC System | Add companion status states | Available / Deployed / Unavailable |
| §6 Companions | Update slot count | 3 base, 4th via Tavern (if D1=B) |
| §7 Factions | Verify still current | Confirm D6 decision |
| §8 Skill Tree | Verify still current | Confirm D7 decision |
| §9 Quest System | Add quest types from goal doc | Main / Minor / Personal / District |
| §11 Macro Loop | Update with auto-clear | Add farming system overview |

**Effort:** ~2 hours  
**Depends on:** Phase 0 decisions

### Step 2: Update `03_weapons_spec.md`

**Why:** Goal doc changes weapon-companion binding and adds weapon evolution mechanics.

| Update | Details |
|---|---|
| Companion pairing | Each weapon has a paired companion slot (if D5=B) |
| Weapon evolutions | Add evolution system (companion pairing reduces RNG) |
| Power spikes | Verify Lv4/Lv7 spikes still make sense with 3/5/10min stages |
| Stage-specific scaling | Some weapons peak early (3min), some scale late (7min) |

**Effort:** ~1.5 hours  
**Depends on:** D1, D3, D5

### Step 3: Update `05_stages_spec.md`

**Why:** Goal doc introduces stage length tiers and star conditions.

| Update | Details |
|---|---|
| Stage length tiers | 3min (minor) / 5min (story) / 10min (major) |
| Star conditions | 2★ and 3★ system with 10+ condition types |
| Wave scaling | Different wave densities per stage length |
| Boss timing | 3min: no boss / 5min: boss at 4:00 / 10min: boss at 8:00 + mid-boss |
| Frenzy mode | Totem-based post-3★ alternate playstyle |
| Auto-clear eligibility | 3★ stages become auto-clear candidates |

**Effort:** ~3 hours  
**Depends on:** D3

---

## Phase 2: Update Combat Specs

### Step 4: Update `04_enemies_spec.md`

| Update | Details |
|---|---|
| Enemy scaling per stage | Different HP/damage for 3min vs 5min vs 10min stages |
| Boss phases | Ensure boss Phase 2 works for 10min stages |
| New enemy types | Goal doc implies more variety for longer stages |
| Drop tables | Soft-pity system for rare drops |

**Effort:** ~2 hours  
**Depends on:** Step 3

### Step 5: Update `20_companion_combat_spec.md`

| Update | Details |
|---|---|
| Slot count | Update to match D1 decision |
| Damage model | Update to match D2 decision |
| Weapon pairing | Add 1:1 weapon-companion binding (if D5=B) |
| Status states | Available / Deployed / Unavailable |
| Companion evolutions | Companions modify and can evolve weapons |
| New companion types | Dog is prototype; plan for 3-4 more |
| Affection in combat | Companions build affection during auto-clear |

**Effort:** ~2 hours  
**Depends on:** D1, D2, D5

### Step 6: Update `21_companion_engine_integration.md`

| Update | Details |
|---|---|
| Entity type updates | Match new companion slot count |
| Collision layer | Verify companion-enemy collision still works |
| Rendering | Update for new companion types |
| Weapon pairing events | Add weaponCompanionBind event |

**Effort:** ~1.5 hours  
**Depends on:** Step 5

---

## Phase 3: Update Town & Economy Specs

### Step 7: Update `22_city_builder_location_system.md`

| Update | Details |
|---|---|
| District list | Align with goal doc's 9 districts |
| Estate locations | Add estate sub-districts |
| Auto-clear UI | Add farming slot management to town screen |
| Companion deployment | Add "Deploy to stage" UI in party management |
| Gold sinks | Update with 3 sink types from goal doc §12 |

**Effort:** ~2 hours  
**Depends on:** Steps 1, 5

### Step 8: Update `19_town_system_spec.md`

| Update | Details |
|---|---|
| Dialogue system | Verify still current (it is) |
| NPC data structure | Add estate/romance fields |
| Mark superseded sections | Navigation now in §22 |

**Effort:** ~30 min  
**Depends on:** Step 7

---

## Phase 4: Create New Spec Files

These systems don't exist in our current specs and need new files.

### Step 9: Create `23_auto_clear_farming_spec.md`

**New file.** Covers:

| Section | Content |
|---|---|
| Core rules | 3★ unlock, matches best time, independent timers |
| Slot system | 3 slots: companion / hired / flexible |
| Hired adventurers | Generic units, full loot minus 10-15% |
| Companion lockouts | Affection/cooldown/story-based unavailability |
| Named farming plans | Saveable configurations |
| Speed rewards | Faster stages cycle more often |
| UI design | Slot management screen in town |

**Effort:** ~3 hours  
**Depends on:** Steps 1, 5, 7

### Step 10: Create `24_star_conditions_spec.md`

**New file.** Covers:

| Section | Content |
|---|---|
| 2★ conditions | 4 condition types (damage, time, level, pickups) |
| 3★ conditions | 6+ condition types (no-hit, starter weapon, underleveled, etc.) |
| Quest flavor conditions | Escort/protect objectives |
| Auto-clear simulation | Which conditions are simulatable vs manual-only |
| Star display | UI showing stars at stage select |

**Effort:** ~2 hours  
**Depends on:** Step 3

### Step 11: Create `25_economy_gold_sinks_spec.md`

**New file.** Covers:

| Section | Content |
|---|---|
| Gold income | Combat rewards, quest rewards |
| Gold sinks | 3 types: combat boosts, wife gifts, disaster response |
| Sink balancing | Ensure at least 1 sink active in late game |
| Estate production | Materials + quests, not gold |
| Resource economy | Gold vs materials vs reputation |

**Effort:** ~2 hours  
**Depends on:** D4, D8

### Step 12: Create `26_affection_romance_spec.md`

**New file.** Covers:

| Section | Content |
|---|---|
| Roster structure | 50-55 waifus, 3 tiers |
| Affection tier chain | Interest → Respect → Trust → Claim |
| Tier shortcuts | 2-step for Tier 1, full 4-step for Tier 2/3 |
| Gift system | Gift categories, dialogue pools |
| Date system | VN interface for top-tier dates |
| Marriage requirements | Max affection + estate |
| Content pacing | Reuse objectives across arcs |

**Effort:** ~4 hours  
**Depends on:** Steps 1, 7, 8

### Step 13: Create `27_estate_bloodline_spec.md`

**New file.** Covers:

| Section | Content |
|---|---|
| Estate structure | Home + business per wife's specialty |
| Estate production | Rare materials, story quests |
| Estate upgrades | Higher tiers = more children |
| Marriage mechanics | Resource costs, ritual framing |
| Fountain of Youth | World logic for aging |
| Children system | Inheritance, weapon combinations, combat NPCs |
| Children quests | Templated, 1-2 quests per child |
| Wife network | Mutual aid during disasters |

**Effort:** ~4 hours  
**Depends on:** Steps 12, 7

### Step 14: Create `28_disaster_events_spec.md`

**New file.** Covers:

| Section | Content |
|---|---|
| Event types | Estate disasters, natural events |
| Frequency scaling | Town tier + estate count |
| Resolution options | Gold / wife network / full network |
| Gratitude content | Templated by estate specialty |
| Staggering | Don't fire alongside gold-sink quests |

**Effort:** ~2 hours  
**Depends on:** Steps 12, 13, 25

### Step 15: Create `29_frenzy_mode_spec.md`

**New file.** Covers:

| Section | Content |
|---|---|
| Trigger | Totem spawn after 3★ clear |
| Alternate trigger | Kill X in wave within time |
| Gameplay | Max-spawn dump mode |
| Loot | Better drops, faster clears |
| Clean run compatibility | Per-stage decision |

**Effort:** ~1.5 hours  
**Depends on:** Steps 3, 4

---

## Phase 5: Update Supporting Specs

### Step 16: Update `07_leveling_system_spec.md`

| Update | Details |
|---|---|
| XP curves per stage | Different curves for 3/5/10min stages |
| Upgrade pool | Add companion-weapon upgrades |
| Level caps | May differ per stage length |

**Effort:** ~1 hour  
**Depends on:** Step 3

### Step 17: Update `06_pickups_and_powerups_spec.md`

| Update | Details |
|---|---|
| Drop tables | Add soft-pity system |
| Rare drops | Speed-run rare drops |
| New pickup types | Estate materials, quest items |

**Effort:** ~1 hour  
**Depends on:** Steps 3, 4

### Step 18: Update `08_ui_hud_spec.md`

| Update | Details |
|---|---|
| Stage select screen | Star display, stage length indicator |
| Auto-clear UI | Farming slot management |
| Party management | 3-4 companion slots, weapon binding |
| Farming plans | Named saveable configurations |
| Quest log | Tag types (Main/Minor/Personal/District) |

**Effort:** ~2 hours  
**Depends on:** Steps 7, 9

### Step 19: Update `14_game_manager.md`

| Update | Details |
|---|---|
| Save structure | Add estate, romance, family data |
| Auto-clear state | Track farming slots, timers |
| Disaster state | Track event history, resolutions |

**Effort:** ~1.5 hours  
**Depends on:** Steps 1, 9, 13

### Step 20: Update `dialogue_template.md`

| Update | Details |
|---|---|
| Affection tiers | Interest/Respect/Trust/Claim dialogue patterns |
| Gift responses | Template for gift acknowledgment |
| Date scenes | VN interface structure |
| Estate quests | Templated quest dialogue |

**Effort:** ~1.5 hours  
**Depends on:** Step 12

---

## Summary: Full Roadmap

| Phase | Step | Spec File | Action | Effort | Depends On |
|---|---|---|---|---|---|
| **0** | D1-D8 | — | Resolve 8 design decisions | User session | — |
| **1** | 1 | `game_frame.md` | Update master framework | 2h | Phase 0 |
| **1** | 2 | `03_weapons_spec.md` | Add companion pairing, evolutions | 1.5h | D1,D3,D5 |
| **1** | 3 | `05_stages_spec.md` | Add stage tiers, star conditions | 3h | D3 |
| **2** | 4 | `04_enemies_spec.md` | Enemy scaling, soft-pity | 2h | Step 3 |
| **2** | 5 | `20_companion_combat_spec.md` | Update slots, binding, status | 2h | D1,D2,D5 |
| **2** | 6 | `21_companion_engine_integration.md` | Engine updates | 1.5h | Step 5 |
| **3** | 7 | `22_city_builder_location_system.md` | Districts, auto-clear UI | 2h | Steps 1,5 |
| **3** | 8 | `19_town_system_spec.md` | Mark superseded, add fields | 0.5h | Step 7 |
| **4** | 9 | `23_auto_clear_farming_spec.md` | **NEW** — Farming system | 3h | Steps 1,5,7 |
| **4** | 10 | `24_star_conditions_spec.md` | **NEW** — Star system | 2h | Step 3 |
| **4** | 11 | `25_economy_gold_sinks_spec.md` | **NEW** — Economy | 2h | D4,D8 |
| **4** | 12 | `26_affection_romance_spec.md` | **NEW** — Romance system | 4h | Steps 1,7,8 |
| **4** | 13 | `27_estate_bloodline_spec.md` | **NEW** — Estates + children | 4h | Steps 12,7 |
| **4** | 14 | `28_disaster_events_spec.md` | **NEW** — Disasters | 2h | Steps 12,13,25 |
| **4** | 15 | `29_frenzy_mode_spec.md` | **NEW** — Frenzy mode | 1.5h | Steps 3,4 |
| **5** | 16 | `07_leveling_system_spec.md` | XP per stage tier | 1h | Step 3 |
| **5** | 17 | `06_pickups_and_powerups_spec.md` | Soft-pity, new drops | 1h | Steps 3,4 |
| **5** | 18 | `08_ui_hud_spec.md` | Stage select, farming UI | 2h | Steps 7,9 |
| **5** | 19 | `14_game_manager.md` | Save structure expansion | 1.5h | Steps 1,9,13 |
| **5** | 20 | `dialogue_template.md` | Affection tiers, dates | 1.5h | Step 12 |

**Total estimated effort: ~39 hours**  
**New spec files: 7**  
**Updated spec files: 13**  
**Design decisions needed: 8**

---

## Recommended Order

For maximum momentum with minimum blocking:

1. **First session:** Resolve Phase 0 decisions (D1-D8) with user
2. **Second session:** Steps 1-3 (core framework + weapons + stages)
3. **Third session:** Steps 4-6 (combat specs)
4. **Fourth session:** Steps 7-8 (town specs)
5. **Fifth session:** Steps 9-11 (auto-clear + stars + economy)
6. **Sixth session:** Steps 12-15 (romance + estates + disasters + frenzy)
7. **Seventh session:** Steps 16-20 (supporting specs)

Each session produces working, reviewable spec updates. No session depends on more than the previous session's output.

---

*Spec Update Roadmap v1.0 — August 26, 2026*
