# Meta-Systems Design Doc — Town, Combat Loop, Affection & Economy

> ⚠️ **SUPERSEDED** — This document is historical. For current design, see `MASTER_DESIGN.md`.
> **Status:** Historical Reference Only
> This doc exists to sync design intent across all standalone feature markdowns — treat it as the top-level reference, not a replacement for the detailed docs.

---

## 1. Vision / Core Pillars

- Combat is Vampire Survivors-style, stage length tied to quest importance (3 / 5 / 10 min).
- Town is a city builder meta-layer: refugee camp → hamlet → village → town, gaining districts as it grows.
- Romance/affection system: 50-55 waifus, tiered by how much story/quest investment they require. Explicitly **not** gacha-slop — no pay-to-skip, no timers, no dual premium currency, no energy caps.
- Everything should interconnect once the player is deep in: combat materials → district upgrades → NPC unlocks → affection → estates → estate materials → back into crafting/combat stage choices.
- Simple, straight-path onboarding early; complexity/interconnection reveals itself as the player progresses.

---

## 2. Core Gameplay Loop

1. **Select stage or quest** (minor/story/major → 3/5/10 min)
2. **Fight** — manual (chase frenzy/mastery/speedrun) or auto-clear (if stage already 3-starred)
3. **Return to town** — loot/materials/renown deposited
4. **Manage resources** — spend on districts, estates, crafting
5. **NPC interaction** — dialogue, gifts, quests, affection progress
6. **Loop back to stage select**

Auto-clear exists so the player can spend real time in the social/management half of the loop (talking to NPCs, dating, managing the economy) instead of always grinding combat manually.

---

## 3. Combat System

### Stage lengths (tied to quest importance)
- Minor quest → 3 min
- Story quest → 5 min
- Major plot battle → 10 min

### Weapons
- Player brings **3 weapon slots**; roster grows via unlocks/shops.
- Power spikes at **level 4 and level 7 (max)**.
- Some weapons peak early and plateau (best for 3-min stages); some are weak early but scale hard by level 7 (best for 10-min stages, sometimes 5-min as a skill check).
- Evolutions are still RNG-influenced, but companion pairing (see §4) reduces raw VS randomness and hands the player agency.
- Each weapon upgrade also slightly buffs its paired companion's attack (minimal-fuss bonus feedback loop).

### Star conditions (2★/3★)
Design goal: cheap to simulate (for auto-clear), legible before attempting (shown at stage select).

**2★ (pick one axis):**
- Damage taken below a % threshold
- Clear with time to spare / survive to the end with margin
- Reach a minimum level by stage end
- Collect X% of spawned pickups

**3★ (stack harder or add a second axis):**
- No-hit clear
- Clear using only starting weapon (no evolutions)
- Clear while underleveled
- Kill a bonus elite/miniboss that spawns only when playing well
- Overkill/combo thresholds (max simultaneous enemies killed in one hit, total kill count)

**Note:** Positional/dodge-based conditions are hard to simulate for auto-clear — reserve those for manual-only bonus rewards, not 3★ gates.

**Quest/companion flavor conditions** (sprinkle in, don't overuse): escort/protect objectives, "don't let companion X drop below 50% HP," boss-specific dodge patterns.

### Frenzy mode
- Trigger: a **totem** (Bastion-style) that only **appears after a stage has already been 3-starred**. Breaking it decouples the stage from timed spawns into max-spawn dump mode.
- Alternate trigger (used sparingly, for specific stages): kill X monsters within wave 1/2 within a time window.
- Frenzy is chased manually once players have strong combos/companions, for faster clear times and better loot.
- Open question (flagged, not yet resolved): whether frenzy is meant to be compatible with a clean/no-hit run or is inherently an alternate, looser playstyle. Decide per-stage if needed.

### Rare drop soft-pity
- Starts at low base rate (~1%), ramps per consecutive clear without a drop.
- Reference curve: ~25% by clear 4 (if no drop yet), ~99% by clear 5.
- Counter resets to 0 on a successful drop (clears-since-last-drop, not lifetime clears).
- Purpose: gives designers a predictable supply floor for target-farmed items, while giving players pity protection against frustration.
- Applies to: sub-3★-time rare drop unlock, and generally to any deliberately-farmable rare material.

### Speedrun / sub-3★-time rewards
- Once 3★'d, stages can be speedrun for a rare drop unlocked below a target clear time.
- The player's best manual clear time becomes the benchmark auto-clear will also use (see §5) — auto-clear never exceeds player skill, only matches it.

---

## 4. Companion & Party System

- Player starts with a **dog companion** only (chases/bites enemies) — full 4-companion party is a long-term unlock.
- Companions:
  - Take no damage.
  - Have their own attacks/buffs.
  - Modify and can evolve the player's weapons.
  - **1:1 slot mapping**: 3 weapon slots, 1 companion slot per weapon — player assigns a companion to a specific weapon, no stacking ambiguity.
- Companion status states (needed for UI + assignment logic): **Available / Deployed (in a party or auto-clear slot) / Unavailable (story lockout, pregnancy/childcare, personal quest)**. A companion can only be assigned in one place at a time.
- Children (post-fountain-of-youth, see §9) eventually join as combat NPCs too, with their own inherited-trait weapon combinations (see §9).

---

## 5. Auto-Clear & Farming System

### Core rule
- Once a stage is 3★'d, it becomes eligible for auto-clear.
- Auto-clear (companion or hired adventurer) **matches the player's best manual clear time exactly — never better.** This removes any incentive to leave companions idle "for better results."
- **Hired adventurers**: generic, no lockout concerns (single-purpose feature), full loot minus 10-15%.
- **Companions**: full loot, no penalty, but subject to affection/cooldown/story lockouts. May build affection while auto-clearing (design intent: affection banked from auto-clear should require an active town-side interaction to "cash in," not passive drip — keeps the social loop from becoming idle-only).

### Rule of 3 (per-turn farming slots)
- Player can run **3 auto-clear slots at once**:
  1. One stage staffed by companions
  2. One stage staffed by hired adventurers
  3. One flexible slot — either companion/adventurer, or the player manually plays a stage they haven't 3★'d yet
- Concurrency cap should scale with town tier (e.g. more slots unlock at Town tier) rather than being capped only by roster size.
- UI: auto-save last-used group/stage assignment per slot; allow **named, saveable farming plans** (e.g. "Weekend grind," "Waifu material rush") the player can swap between.

### Speed reward system (resolved design)
- **Do NOT use a synced/shared batch clock.** Original plan (slowest stage in a batch gates the whole batch, with bonus loot for faster picks) was scrapped because any bonus/penalty layered on a synced clock is still effectively a soft timegate — which conflicts with the stated goal that auto-clear should free the player up, not gate them.
- **Resolved approach: each of the 3 slots runs on its own independent timer.** A slot finishes and becomes reassignable the moment its own stage's duration elapses, with no dependency on the other two slots.
- Reward for speed is structural, not a bonus formula: faster stages simply cycle (and reward-roll) more often over the same stretch of time. No 20%-bucket loot bonus needed — the design conversation converged on dropping that system once slots were decoupled.
- (Historical note, superseded: an earlier draft considered auto-looping fast stages within a shared slowest-stage window, plus a 20%-bucket % bonus for stages that didn't loop-qualify. Both are unnecessary once slots are independent — kept here only so future-you doesn't reinvent and re-discard the same idea.)

---

## 6. Town / Settlement Progression

### Growth stages (gated by quest-tier completion, not just resource totals)
1. **Refugee Camp** — tents, campfire, 1-2 generic NPCs (intro)
2. **Hamlet** — after first story quest (5 min tier); first named NPCs appear
3. **Village** — cluster of minor quests + one story quest; districts start subdividing
4. **Town** — after a major plot battle (10 min tier); districts gain sub-locations
5. **(Optional) City/Capital** — late game milestone

### District suggestions
- Market/Trade District
- Residential
- Government District
- Artisan/Crafting Quarter — crafting that feeds weapon evolutions/passives
- Garrison/Training Grounds — combat modifiers, stage-start perks
- Scholar/Archive District — light research tree, unlocks stage variants/map modifiers
- Temple/Shrine District — morale buffs, possible light philosophy/faction choice
- Outskirts/Farmland — passive trickle resource, visual signal of town reach
- Tavern/Culture District — side quests, rumors, lighter tonal beats

Each district's **first building** unlocks via a story-tier quest; **upgrade tiers within it** unlock via minor quests/resources (narrative gating + grindable progression, neither dominating).

---

## 7. NPC / Location / Estate UI Structure

- Base pattern: max 3 NPCs to talk to per location, max 3 locations, each location can nest another 3 (open to exceeding 3 later).
- Refined browsing pattern: **display 3 by default, side-swipe for more, tap a side button to open a full text-link (+ small icon) list menu.**
- Empty/unstaffed slots should not render as empty placeholder frames — only show what currently exists (a fresh Hamlet shows 1 NPC, not 3 empty portraits).
- Notification dots only on NPCs/locations with something new — no static permanent badges.
- **Estates and the eventual family/kids roster need their own dedicated screen** (a "Family"/"Household" tab), separate from normal town-district browsing — the 3/3/3 nesting pattern doesn't scale to 50+ potential estates. Add filter/sort (by affection tier, district, "has new content") once the roster passes ~20-30 entries.
- Suggested: a lightweight home-base dashboard/summary screen surfacing: companions returning/available, batch stages ready to collect, NPCs with new dialogue, affection tiers close to their next breakthrough.
- Quest log should tag quest type at a glance (Main / Minor / Personal-Waifu / Kid / District) once multiple quest sources are live simultaneously.

---

## 8. Affection & Romance System

### Roster structure (~50-55 waifus)
- **Tier 1 — Default/Early (~10-15):** available early, standard dialogue/gift/date loop, no story gate.
- **Tier 2 — Quest-unlocked (~15-20):** affection gated behind a personal questline (narrative-weight arcs).
- **Tier 3 — Deep/late-game (~15-20):** tied to major plot progression, sometimes cross-referencing other companions' arcs.

### Affection tier chain (reusable 4-step skeleton)
1. **Interest** — can start talking to her at all; low bar (discovery quest or combat encounter).
2. **Respect** — capability check quest (prove you can operate in her world).
3. **Trust** — resourcefulness/rare-fetch or harder task quest.
4. **Claim** — rite-of-passage / climactic quest; unlocks full romance eligibility.

Easier (Tier 1) girls can use a shortened 2-step version (Interest → Claim, maybe one gift/dialogue gate between). Full 4-step chains reserved for Tier 2/3 "hard route" girls to keep content cost proportional to narrative spotlight.

### Worked examples
- **Necromancer (Tier 2, mind-controlled boss intro):** fought as boss early → learn she's lich-controlled → quest to find lich lair, defeat lich, free her → she stands trial and repents → player chooses mercy → affection begins. Datable mid/late game. Demonstrates: met early for attachment, sympathetic obstacle, quest-resolved, final gate is a **player choice**, not just a checklist completion.
- **Spider Queen (Tier 3, multi-quest hard route):** discover her forest/hunting grounds → kill poachers from a foreign kingdom (Respect: capability check) → capture a rare golden lamb alive for a romantic dinner (Trust: harder/different skill, e.g. non-lethal capture) → defeat her current mate (a giant spider) to take his place (Claim: rite of passage).
  - **Capture-target fallback mechanic** (reusable for any capture/defend quest): survive X minutes in-stage → target spawns and appears on minimap → clear guards/monsters around it (VS coffin-unlock style) → interact to claim. Reuses existing survival/spawn-wave systems; low implementation risk. Can remain the default even long-term; save bespoke capture mechanics only for flagship romance chains.

### Content pacing rule
- Quest chains should reuse objectives across arcs where possible (e.g. poachers plaguing Spider Queen's forest might also be wanted by a Ranger NPC or tie into a Government District quest) — saves scope, makes the world feel interconnected.

---

## 9. Marriage, Estates & Bloodline

### Marriage requirements
1. Reach max affection (Claim tier).
2. Spend resources (gold, etc.) to build her an **estate** — framed in-world as an ancient ritual befitting the player's status.

### Estates
- Estate = home + business reflecting the wife's passion/specialty (not a generic gold-producer — avoids economic bloat).
- **Do not produce gold.** Instead:
  - Chance to generate story quests / requests from wife or kids (a light rotating quest board per estate, weighted by estate level and story progress).
  - Produce rare materials tied to the estate's theme (e.g. necromantic reagents, monster-tamed goods) — these feed crafting and other characters' quests, closing the economy loop.
- Estates can be upgraded with more resources; higher tiers allow more children with that wife.
- Estate specialty ↔ wife specialty is the core identity/economy anchor — ties "who to invest in" to actual crafting/quest goals, not just personal preference.

### Fountain of Youth (world logic)
- Player (and, narratively, those intimate with him / his bloodline) ages very slowly — explains long relationship/parenting timelines without breaking pacing.

### Children
- Grow up to become additional combat-adventure NPCs alongside their father.
- Inheritance: combination of mother's specialty + a **player-chosen** father trait (leaning agency-over-RNG, consistent with the companion/weapon philosophy) — exact quality/rarity of the resulting combo can still carry light randomness for a "pleasant surprise" element.
- Produce new weapon combinations/evolutions — same systemic layer as companion-weapon modification, but a second, deeper combinatorial tier (mother's estate-specialty weapon type × father's chosen weapon).
- Children's quests: **templated, not hand-authored** — pulled from a quest-type pool keyed to the child's mother's biome/rivals (e.g. items from mother's home biome, or "fight alongside father against a foe known to mother"). Short (1-2 quests), not full personal arcs, until DLC scope allows more.
- **Explicitly no father-daughter romance option** — kept out of the base game entirely (mass-appeal line, avoids a common harem-genre "ick" even among fans of the genre). Game code is not obfuscated, so modding that in (or anything else) is left to the modding community; not Anthropic/dev-supported content.
- Open question (unresolved, flag for later): do children have gameplay function beyond flavor (e.g. becoming full companions, granting stat/estate bonuses) or are they closer to narrative texture with a combat-NPC bonus? Decide before building systemic weight under "family."

---

## 10. Wife Network — Mutual Aid System

Triggered during random disaster events (see §11) when the player wants to resolve a crisis without spending gold.

- Player can ask **other wives with estates** to divert some of their own production to help resolve another wife's problem.
- **Helping wives take a real, visible production reduction** — not a free action. This keeps "ask the network" from being a strictly-dominant free option once players are gold-rich, and keeps every resolution path meaningfully differentiated.
- Helping generates its own **gratitude content** afterward, scaled to sacrifice size:
  - **Minor assist** (small % diverted, shared across several wives) → a simple 3-exchange dialogue acknowledgment, maybe a small default gift. Low authoring overhead.
  - **Major assist** (one wife covers most/all of it solo) → a proper mini-quest or named special gift — she felt it, she gets a real thank-you.
- Gratitude content should be **templated by estate specialty** (like children's quests) rather than bespoke per wife, to keep authoring scope bounded across 50+ possible wives.
- This mechanic reinforces the "found family" theme *mechanically*, not just narratively — people pitch in, pitching in costs something, and it's acknowledged.

---

## 11. Random Events (Disasters)

- Example: a wife's business/estate suffers a setback (natural disaster, etc.) and needs a gold infusion or help to resolve.
- Frequency and severity should scale with **town tier and estate count** (a Refugee Camp shouldn't get "business failure" events; a full Town with a dozen estates should have a believable trickle).
- **Resolution should offer a real choice, not just pay-or-lose:**
  1. Pay full gold — fastest, most expensive, purely player resource.
  2. Pay a percentage + wife network helps — cheaper in gold, costs other wives' production (see §10).
  3. Full wife network coverage, no gold — free to the player, but the largest hit to the helping wives' production, and the richest gratitude-content payoff afterward.
- Make the wife's reaction to being helped (or not) visible — a scene/line, not just a stat change — so it reinforces the relationship system instead of reading as a generic Sims-style disaster mechanic.
- Stagger disaster-event frequency against gold-sink-quest frequency (§12) so both don't fire on the same "gold available" signal and bury the player in simultaneous asks.

---

## 12. Economy & Gold Sinks

Deliberately spread across multiple domains so no single system carries the whole economy:

1. **Combat/production boosts** — dump gold into the merchant's guild, blacksmith, or a specific estate (e.g. the dwarf miner) to temporarily boost output and finish a resource-heavy quest in fewer turns. Frequency of these gold-sink-worthy quests scales with how much gold the player is holding — sink is *available*, never *forced*. Watch for diminishing returns on repeatedly boosting the same node, to prevent wealthy late-game players from trivializing "need X in fewer turns" quests outright.
2. **Wife gifts (romance sink)** — expensive gifts, generally gated to higher affection tiers (Trust/Claim+) so gold can't be used to shortcut relationship progress it hasn't earned. Effects:
   - Extra loving dialogue lines from the recipient (write as a shared pool per gift-category or per estate-specialty, not 50+ bespoke lines).
   - At endgame, top-tier gifts unlock a **custom date** (full VN-interface scene) per item — planned as ongoing free DLC content over time, not a launch-day requirement.
   - Minor gift acknowledgment = short 3-exchange dialogue; full date-quest = full VN interface. Interface weight should always match content weight.
   - Max-affection "thriving" wives get a passive cosmetic status indicator (glowy rainbow aura) — cheap to implement, purely a delight/completionist signal, not a mechanical stat.
3. **Disaster response (narrative sink)** — see §11. Scales with wealth (a rich player gets to feel wealthy by fully funding these), optional co-resolution via the wife network.

General rule: ensure at least one gold sink remains meaningfully active in the late game (when districts/estates are maxed) — don't let all sinks front-load into the early/mid game and leave gold a dead currency in the back half.

---

## 13. Content/Art Pipeline Notes (Romance Images)

- Character images: **dev-time generated using character LoRAs**, not live runtime generation — deliberate choice for consistency/quality control; avoids likeness-drift and moderation issues that come with runtime gen.
- More images can be added over time as LoRAs improve — natural free/DLC content cadence, since the mechanical hook (gift → affection tier → image/date unlock) is already built; new content just slots in.
- **Multi-character scenes** (e.g. group dates) require ComfyUI + ControlNet for consistent multi-LoRA composition — meaningfully harder than single-character generation (identity bleed risk). Treat as a stretch-goal/later-DLC tier, not a baseline launch promise.

---

## 14. Open Design Questions (Not Yet Resolved)

Flagging these explicitly so they don't get lost:

- Does frenzy mode need to be achievable *alongside* a clean/no-hit 3★ run, or are frenzy-chasing and mastery-clearing meant to be two separate, non-overlapping goals per stage?
- Is the sub-3★-time rare drop meant to become a **permanent standing perk** once achieved (since auto-clear now always matches the player's best time), or should there be any additional gating? (Current design leans toward: yes, it's permanent — flagged just to make sure that's an intentional decision, not an accidental side effect.)
- Do children have systemic gameplay function beyond combat-NPC/flavor (e.g., growing into full companions, unlocking estate tiers) — decide before building further systems under "family."
- Exact rare-drop pity curve shape (linear ramp vs. long-flat-then-spike) — affects how special early "lucky" drops feel vs. how predictable target-farming supply is.
- Concurrency cap scaling table for auto-clear slots by town tier (beyond the flat "Rule of 3").

---

## 15. Current Prototype vs. Target Scope

**Currently implemented (as of this doc):**
`Combat stage → town upgrade → dialogue with 2 NPCs → pet dog and gain companion → back to combat with dog.`

**Target scope (this document):** the full interconnected loop across combat tiers, weapon/companion pairing, auto-clear farming with independent timers, town/district progression, a 50+ waifu affection/marriage/estate system, children/bloodline, wife-network mutual aid, disaster events, and a multi-domain gold sink economy — all feeding back into each other per §2 and the dependency web discussed separately.

This doc is meant to be the sync point between the ~15+ existing feature-specific markdowns — update this file's relevant section whenever a detail changes in one of those, so there's always one current source of truth for how the systems fit together.