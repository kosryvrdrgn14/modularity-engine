# Test Plan — Multi-Location Navigation System

> **Workflow:** Implement Phase → Run Tests → Fix Issues → Next Phase
> **Created:** September 2, 2026

---

## Pre-Flight Checklist (Run Before Every Phase)

- [ ] All existing JS files pass `node --check`
- [ ] All JSON files parse without error
- [ ] Game loads on preview without console errors
- [ ] Title menu renders and "New Game" works
- [ ] Town screen loads after character selection

---

## Phase 1: Navigation Arrows

### Implementation
Add left/right arrow buttons flanking the swipe indicator for PC region navigation.

### Test Cases

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 1.1 | Arrows render | Load town screen | Left `◀` and right `▶` arrows visible on either side of swipe dots | |
| 1.2 | Right arrow switches region | Click right arrow | Region switches from Town → Graveyard, dots update, region name changes | |
| 1.3 | Left arrow switches region | Click right then left arrow | Region switches back to Town | |
| 1.4 | Left arrow hidden at first region | Be at region 0 (Town) | Left arrow is hidden or disabled | |
| 1.5 | Right arrow hidden at last region | Navigate to region 2 (Forest) | Right arrow is hidden or disabled | |
| 1.6 | Breadcrumb clears on region switch | Drill into Town → Trade District → Blacksmith, then click right arrow | Breadcrumb resets to root of new region | |
| 1.7 | Location cards update on switch | Switch region via arrow | NPC area shows locations from new region | |
| 1.8 | Swipe indicator dots update | Switch region via arrow | Active dot matches current region index | |
| 1.9 | Region name label updates | Switch region via arrow | `swipe-region-name` text changes to current region name | |
| 1.10 | Audio plays on switch | Click right arrow | Menu select sound plays | |
| 1.11 | No-op at boundaries | Click left arrow at region 0 | Nothing happens, no error, no sound | |
| 1.12 | Rapid clicking | Click right arrow 5 times fast | Stops at last region, no crash, no double-switch | |

### Console Checks
- [ ] No `TypeError` or `undefined` errors in console
- [ ] No duplicate event listener warnings

---

## Phase 2: Keyboard Navigation

### Implementation
Add ArrowLeft/ArrowRight key support when town screen is active.

### Test Cases

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 2.1 | Right arrow key | Press → key | Region switches to next | |
| 2.2 | Left arrow key | Press ← key | Region switches to previous | |
| 2.3 | Arrow keys at root | Be at city_root, press → | Region switches | |
| 2.4 | Arrow keys blocked when drilled in | Navigate to Trade District, press → | No region switch (breadcrumb nav takes priority) | |
| 2.5 | Arrow keys blocked when town hidden | Start combat, press → | Nothing happens | |
| 2.6 | Arrow keys work from any root location | Navigate to Graveyard → Cemetery Gate (root), press → | Switches to Forest | |
| 2.7 | Up/Down arrows ignored | Press ↑ or ↓ | Nothing happens | |
| 2.8 | Arrow keys don't interfere with combat | During combat, press → | Movement works, no region switch | |
| 2.9 | Left arrow at first region | Press ← at Town | No error, no switch | |
| 2.10 | Right arrow at last region | Press → at Forest | No error, no switch | |

### Console Checks
- [ ] No errors on keypress
- [ ] No duplicate listener accumulation (verify by pressing keys 10+ times)

---

## Phase 3: Link Stages to Locations

### Implementation
Add `stageId` to location tree entries, wire combat to use current location's stage.

### Test Cases

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 3.1 | Cemetery → stage_graveyard | Navigate to Graveyard → Cemetery, click Fight | Combat plays stage_graveyard (5-min, Gravekeeper boss) | |
| 3.2 | Crypt → stage_graveyard_extended | Navigate to Graveyard → Crypt, click Fight | Combat plays stage_graveyard_extended (10-min, Necromancer boss) | |
| 3.3 | Town root → default stage | Navigate to Town → Refugee Camp, click Fight | Falls back to stage_graveyard (or shows "select a battle location") | |
| 3.4 | Location preserved after combat | Complete combat, return to town | Screen shows the same location you left from | |
| 3.5 | Stage selected correctly in DataManager | After navigating to Cemetery, check `dataManager.stages.id` | Equals `stage_graveyard` | |
| 3.6 | Breadcrumb shows after combat return | Win/lose combat from Cemetery | Return to town, breadcrumb shows Graveyard > Cemetery | |
| 3.7 | Boss matches stage | Play stage_graveyard_extended from Crypt | Necromancer boss spawns (not Gravekeeper) | |
| 3.8 | Duration matches stage | Play from Crypt | Timer counts to 10:00 (not 5:00) | |
| 3.9 | Stage tier selection works | If tier UI exists, select "quick" from Cemetery | Stage plays with reduced duration | |
| 3.10 | No stage on forest locations | Navigate to Forest → Forest Edge, click Fight | Uses default stage or shows message | |

### Console Checks
- [ ] `dataManager.selectStage()` called with correct ID
- [ ] `session.selected_stage_id` set correctly in GameManager
- [ ] No "stage not found" warnings

---

## Phase 4: Graveyard NPCs

### Implementation
Add 2-3 NPCs to Graveyard locations in npcData.js.

### Test Cases

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 4.1 | Gate guard appears | Navigate to Graveyard → Cemetery Gate | NPC card visible with name and portrait | |
| 4.2 | Grave digger appears | Navigate to Graveyard → Cemetery | NPC card visible | |
| 4.3 | NPCs don't appear in Town | Navigate to Town → Refugee Camp | Only Elder Rowan and Lina visible (not graveyard NPCs) | |
| 4.4 | NPC dialogue works | Click gate guard NPC | Dialogue overlay opens with greeting | |
| 4.5 | Dialogue choices work | Select a topic | Response displays, affection updates | |
| 4.6 | Dialogue close works | Click [End Conversation] | Overlay closes, return to location view | |
| 4.7 | NPC location field correct | Check NPC_DATA entries | Each graveyard NPC has `location: 'graveyard_entrance'` or `location: 'cemetery'` | |
| 4.8 | NPCs not in other regions | Navigate to Forest | Graveyard NPCs not shown | |
| 4.9 | NPC count badge updates | Navigate to region with NPCs | Dock NPCs badge shows correct count | |
| 4.10 | Locked NPC shows lock | If any NPC has `locked: true` | Card shows lock icon, clicking does nothing | |

### Console Checks
- [ ] No `Cannot read property of undefined` on NPC render
- [ ] NPC portrait SVG renders (not broken image)

---

## Phase 5: Forest Content

### Implementation
Add placeholder NPCs to Forest, unlock region for testing.

### Test Cases

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 5.1 | Forest accessible | Navigate via arrow or swipe to Forest | Region loads, shows Forest Edge | |
| 5.2 | Hunter NPC appears | Navigate to Forest → Forest Edge | NPC card visible | |
| 5.3 | Herbalist NPC appears | If added to deep_woods or forest_edge | NPC card visible at correct location | |
| 5.4 | Forest NPCs not in Town | Navigate to Town | Forest NPCs not shown | |
| 5.5 | Forest NPCs not in Graveyard | Navigate to Graveyard | Forest NPCs not shown | |
| 5.6 | Deep Woods placeholder | Navigate to Forest → Deep Woods | Shows "Nothing here yet" card | |
| 5.7 | Forest dialogue works | Click hunter NPC | Dialogue opens and functions | |
| 5.8 | All 3 regions navigable | Swipe/click through all 3 regions | Each loads correctly with its own content | |
| 5.9 | Region dot count correct | Check swipe indicator | 3 dots, each labeled correctly | |
| 5.10 | Full navigation cycle | Town → Graveyard → Forest → Town | All transitions smooth, no errors | |

### Console Checks
- [ ] No errors during region switching
- [ ] `LOCATION_TREE.regions` has 3 entries

---

## Phase 6: Battle Card UI

### Implementation
Show a "⚔️ Battle" card in locations that have a linked stage.

### Test Cases

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 6.1 | Battle card at Cemetery | Navigate to Graveyard → Cemetery | Battle card visible with stage name "The Graveyard" | |
| 6.2 | Battle card at Crypt | Navigate to Graveyard → Crypt | Battle card visible with "The Graveyard (Extended)" | |
| 6.3 | No battle card at Town root | Navigate to Town → Refugee Camp | No battle card (no stageId on location) | |
| 6.4 | No battle card at Trade District | Navigate to Town → Trade District | No battle card | |
| 6.5 | Battle card shows tier options | Look at battle card | Quick / Standard / Highlight tiers displayed | |
| 6.6 | Battle card click starts combat | Click battle card | Combat starts with correct stage | |
| 6.7 | Battle card shows description | Look at battle card | Stage description visible (e.g., "5-minute introductory stage") | |
| 6.8 | Battle card shows recommended weapons | Look at battle card | Weapon icons or names listed | |
| 6.9 | Battle card styling consistent | Compare with NPC cards | Same card style, spacing, hover states | |
| 6.10 | Fight dock button still works | Click Fight in dock | Still triggers combat (fallback to current stage) | |
| 6.11 | Battle card + NPC cards coexist | Navigate to Cemetery with NPC | Both battle card and NPC cards visible in same area | |
| 6.12 | Battle card updates on region switch | Switch from Cemetery (has card) to Town root (no card) | Card disappears, only NPC cards remain | |

### Console Checks
- [ ] No rendering errors
- [ ] Stage ID correctly read from location data

---

## Final Integration Test (After All Phases)

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| F.1 | Full loop: Town → Graveyard → Cemetery → Combat → Win → Return | Complete game loop | Returns to Cemetery location with stats | |
| F.2 | Full loop: Graveyard → Crypt → Combat → Lose → Return | Die in extended stage | Returns to Crypt location | |
| F.3 | Navigation: Town → Graveyard → Forest → Town via arrows only | Use only arrow buttons | All transitions smooth | |
| F.4 | Navigation: Town → Graveyard → Forest → Town via keyboard only | Use only arrow keys | All transitions smooth | |
| F.5 | Navigation: Town → Graveyard → Forest via swipe only | Use only touch swipe | All transitions smooth | |
| F.6 | NPC dialogue across regions | Talk to NPCs in Town, Graveyard, Forest | All dialogues work, no cross-region bleed | |
| F.7 | Shop accessible from any region | Open shop from any region | Shop opens correctly | |
| F.8 | Systems panel accessible from any region | Open Systems from any region | Panel opens correctly | |
| F.9 | Sandbox mode from any region | Open sandbox from any region | Sandbox works, combat starts correctly | |
| F.10 | No orphan references | Grep for removed methods (`_getEnemyColor`) | None found | |
| F.11 | File sizes within limits | `wc -l` all modified files | All under 2,000 lines | |
| F.12 | Full JS syntax check | `node --check` all engine/ui/data files | All pass | |

---

## Regression Tests (Verify Existing Features Still Work)

| # | Feature | Test | Pass/Fail |
|---|---|---|---|
| R.1 | Town screen loads | Start game, arrive at town | Screen renders with header, dock, NPC area | |
| R.2 | Camp upgrade works | Have 100g, click upgrade card | Camp upgrades, Lina unlocks | |
| R.3 | Dog dialogue triggers | Upgrade camp, talk to Lina, end conversation | Dog dialogue appears | |
| R.4 | Companion system | Pet dog | Dog joins party, companion slot fills | |
| R.5 | Shop opens | Click Shop in dock | Shop overlay opens with tabs | |
| R.6 | Shop tabs switch | Click Combat / Companion / Estate / Gifts | Content changes per tab | |
| R.7 | Farming slots render | Check farming section | Slots visible with correct state | |
| R.8 | HUD displays correctly | During combat | Health, XP, gold, weapon levels all visible | |
| R.9 | Weapon visuals work | During combat, use all 8 weapons | Each weapon has visible projectile/effect | |
| R.10 | Boss spawns correctly | Play stage_graveyard to 4:00 | Gravekeeper spawns with health bar | |
| R.11 | Victory screen | Defeat Gravekeeper | Victory screen shows with stats | |
| R.12 | Game over screen | Die during combat | Game over screen shows with stats | |
