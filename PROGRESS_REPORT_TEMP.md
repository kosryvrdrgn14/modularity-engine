# PROGRESS REPORT — TEMP (Claude handoff + manual-test session)

**Created:** September 26, 2026, immediately after v2.19.26 shipped green.
**UPDATED mid-test:** v2.19.27 shipped — see "MID-TEST FIX" below.
**Delete after the manual test** (or keep as session notes — owner's call).

---

## ADDENDUM (v2.19.28 — the level-up cards screenshot you sent)

**Same defect class as B15, next screen — fixed, gated, shipped green.** The level-up
cards were a nowrap flex row of three fixed-width cards inside the centered
`#levelup-overlay`: identical clipping to the slot picker on narrow phones.
- **Fix:** `#levelup-cards` → auto-fit centered grid (3-across desktop, ONE centered
column on phones in portrait; guarded wrap row in landscape — full vertical stacking
was the preference you confirmed on B15).
- **Gated:** `levelup` is now a battery screen, driven through the REAL runtime path
(`g.uiManager.showLevelUp([...])` → `#levelup-overlay`) — desktop gates + emulated
iPhone cell + orientation flip. Same portrait-stacking rule applied to BOTH grids
(slot-picker and level-up) so the class can't regress independently.
- **Battery:** 525 → **539 checks** (15 suites, strict green) · **Version: v2.19.28**,
release:check green. Backlog B1–B17 all closed (B16 = golden-image diffing, declined).
- **Elder Rowan at the graveyard entrance = BY DESIGN:** `npcs.json` `old_man`
`locationRules` relocates him there while `mq_02_clearing` is active (Step 2 of the
condition-system reference); he also has a post-graveyard dialogue set on the
`graveyard_cleared` flag. Not a bug.
- **In flight:** your combat-touch report is being planned as **B18 (virtual joystick)**
— plan-first per house rules; implementation starts on your go-ahead.

---

## SHIPPED (v2.19.29 — B18 combat joystick) — RE-TEST ON YOUR PHONE

**Root cause:** there were no touch controls — combat was tap-to-move (one short walk
per tap, hard stop at the tap point, WASD cancels the target). That's why it felt
broken, not laggy: it was never a joystick.

**What's new:** the usual left-thumb virtual stick, touch devices only:
- Touch anywhere in the LOWER-LEFT of the screen during combat → the base appears
  under your thumb (floating origin — no hunting for a fixed pad); drag to steer.
  Small tilt = walk, full tilt = run. Right thumb keeps all the buttons
  (level-up cards, pause, end screen) exactly as before.
- Desktop/mouse play is untouched — the stick literally doesn't exist there.
- Pause menu and level-up overlay freeze and ignore the stick; a phone call or
  browser gesture stealing the touch drops the stick to zero (no phantom drifting).

**Gated:** battery 539 → **548 checks** (15 suites, strict green), including a
synthetic-drag proof that the player actually moves and a paused-refusal pin.
**Version: v2.19.29, release:check green.**

**Re-test asks (feel is the part emulation can't judge):**
1. Does the dead-zone/tilt sensitivity feel right, or is it twitchy/sluggish?
2. Stick SIZE and placement — comfortable for your thumb after a few minutes?
3. Deliberate release: lift thumb mid-fight → player stops immediately?
4. Any case where the stick fights with tapping level-up cards with the other thumb?

---

## CLAUDE'S TRIAGE — PROCESSED (v2.19.30)

All six open questions answered and actioned:

| Q | Decision | Where it landed |
|---|---|---|
| Q1 purchase confirm | **Buy Again inside the panel** (option b) — implemented | **B19, shipped v2.19.30**: after a buy, the panel stays open as a "Buy Again" surface (qty reset, live post-purchase total); fresh tap = first-purchase "Buy" again; quick-buy toggle deliberately deferred |
| Q2 tab wrap vs scroll | **Keep wrap** — scroll can hide tabs (hidden-content trap) | Recorded; revisit only on real-device cramping |
| Q3 44px chips | **Keep 44px** — standard minimum touch target | Recorded; "slightly chunkier" is the right trade |
| Q4 toast timing | Keep 3.5s default; **scale duration to message length** | **Backlog B20** (P3, before more toast types land) |
| Q5 inventory tap | **A spec GAP, not a new decision** — the inventory spec already designs the detail sheet | **Backlog B21** (tied to that spec; resumes with inventory work) |
| Q6 desc ellipsis | **Keep the one-line description** — discovery friction otherwise | Recorded; confirm panel still carries full text |

Plus two process adoptions: **B22** — "is every screen registered in the battery matrix"
gets checked periodically, separate from gate strictness (Claude called the closing line
the sharpest insight of the session); and **KNOWLEDGE.md §20 — verify prior writes before
re-running** (the 502 double-append lesson, generalized).

**B19 verification:** step6 18 → 24 checks — panel persists, "Buy Again" label + qty
reset, post-purchase total, second transaction through the same commit path (stack merges
3+1=4), fresh-tap semantics, cancel still spends nothing. **Battery 548 → 554; v2.19.30,
release:check green.** No settings toggle was built (per Claude's "don't speculate"
rule — only if (b) proves insufficient after real use).

**New manual-test item for you:** buy a few potions in a row — the panel should stay up,
relabel to "Buy Again", and keep the total honest after each purchase. Spend yourself
down to nearly broke and confirm the button disables instead of letting you overspend.

---

## SHIPPED (v2.19.31 — B23 + B24, from your two findings)

**1. Town companion slots — REMOVED.** You were right: they were a dead display (never
clickable — the highlight was faking interactivity) and they sat on top of the Auto-Clear
Farming card on your phone. Gone from the town map. Companion status is still in Systems;
assignment stays in the fight-confirmation (loadout) screen.

**2. Tiny combat HUD — root-caused and fixed.** Not a styling miss: the canvas was being
drawn at 3× internal resolution but the HUD used raw pixels — so on your phone everything
canvas-drawn (weapon/companion slots, HP bar, timer, gold, kill counter, XP text) rendered
at ONE-THIRD physical size. 36px slots measured 12px on your screen; the "Lv2" text was
~3px. Desktop was never affected (1× screen). Now all canvas UI draws in CSS pixels —
your phone HUD should be the same physical size as on a laptop. The upgrade cards, pause
menu, and joystick were DOM overlays, which is why only those felt right.

**Gated:** battery 554 → **556 checks** — a new emulated-iPhone probe boots a real run at
DPR 3 and measures a HUD chip's on-screen size so this class can't silently regress.
**Version: v2.19.31, release:check green.**

**Re-test asks:** reload → town (slots gone, farming card clean) → fight: are the weapon
slots, HP bar, and timer now comfortably readable? If the HUD now feels TOO BIG on your
phone (it's desktop-sized, which on a 5–6" screen may read chunky), say so — sizing is a
dial now, not a bug.

---

## SHIPPED (v2.19.32 — B25, the boss-warning-no-boss resume bug)

**Your report was exactly right, and so was your design instinct.** What was happening:
the save journal marks "boss spawned" as a milestone, and resume restored that FLAG —
but enemies are deliberately never saved, so nothing re-created the boss. The flag then
also blocked the natural spawn tick. Result: boss-less run forever, with the warning
text able to replay. Resuming a dozen times would never have produced a boss.

**New semantics (as you called them):**
1. **The boss is already there.** Resume after the boss spawn re-spawns the boss (fresh
   HP — pre-crash damage was never saved; the intro cutscene replays and stays skippable).
2. **No unwinnable resumes.** If the journal would hand you <30s of run, the clock rewinds
   to leave a full 30s boss window (invisible — kills/gold/level come from the journal,
   not the clock). No more full-HP boss with 10 seconds left.
3. Resume before the boss spawn: unchanged (the boss shows up naturally at 4:00).

**Gated:** the regression trace plants a 4:50 boss-journal and asserts the whole contract
(clock ≈4:30, boss entity exists, intro skippable, warnings don't replay). Trace 115 → 121,
battery 556 → **562**. **Version: v2.19.32, release:check green.**

**Re-test ask:** get a run past 4:00 (or use Debug: B key to force the boss), quit the
preview mid-fight, reopen, resume — the boss should be waiting, with a fair clock.

---

## MID-TEST FIX (v2.19.27 — the slot-picker screenshot you sent)

**Confirmed real bug, root-caused, fixed, gated:** the save-slot picker was a nowrap
flex row of three fixed 190px cards inside a CENTERED overlay — on your phone's ~363px
visible width it clipped BOTH edges, and centered overflow can't scroll, so Slot 1 was
partially untappable. The dialog had never been in the battery's screen matrix (that's
why every gate since v2.19.18 skipped it).
- **Fix:** auto-fit grid — 3-across on desktop, ONE centered column on phones; cards
  capped at 190px; `+ slot-btn/slot-close` added to the 44px touch block.
- **Gated:** `slotpicker` is now a battery screen (desktop gates + emulated iPhone cell
  + orientation flip). Probe model gained "center-frame alignment" (centered overlays
  align on the center axis, not edges) with its own negative control.
- **Battery:** 510 → **525 checks**, release:check green.
- **Re-test on your phone:** reload, Play → slot picker — all 3 slots should stack in
  one centered column, nothing clipped, all buttons tappable.

---

## TL;DR state

- **Version:** v2.19.27 · `release:check` GREEN · battery **525 checks / 15 suites, strict green**
- **Backlog:** B1–B15 **all closed** — zero open items (§10 of WORKFLOW.md)
- **This session shipped:** v2.19.19 → v2.19.27 (responsive hardening → overflow/ellipsis detectors → device emulation gates → orientation gates → §12.1 spacing sweep → purchase-confirm dialog + qty stepper → touch targets → dead-CSS sweep → slot-picker fix)
- Battery growth this session: 458 → 525 checks (layout audit 22 → 81; step6 10 → 18)

## Manual-test menu (highest value first)

1. **Shop purchase-confirm (v2.19.24)** — desktop + a real phone if possible:
   - Tap an item card → panel opens, **no gold moves** until Buy.
   - Description fully readable (this replaced wrapping/truncated text).
   - Stepper: `−` stops at 1; `+` stops at what you can afford; total = qty × cost live.
   - Buy with qty 3 → ONE deduction of 3×cost; Inventory tab shows `×3`; game log says
     "Purchased 3× Health Potion (−150 gold)".
   - Cancel / ✕ / scrim-tap → nothing spent.
2. **Toast fade-out fix (v2.19.26)** — trigger any town toast (quest complete etc.) and
   WATCH IT LEAVE after ~3.5s: it should fade/slide OUT now (this was silently dead before).
3. **Touch sizing (v2.19.25)** — on a real phone: town chips, dock tabs, shop tabs,
   loadout chips/back/confirm should all feel comfortably tappable (≥44px).
4. **Loadout on mobile** — the original screenshots' screen: chips one-line, no
   horizontal scrollbar anywhere (check BOTH phases: weapons + companions).
5. **Shop tabs on narrow screens** — they now wrap to a second row instead of overflowing.

## Where things stand per system

| Area | State |
|---|---|
| Spacing | §12.1 4-pt scale enforced; 57 declarations migrated; 80px dock clearance documented keep |
| Overflow | GATED (doc/panel scrollWidth; user-experienced model — by-design clips exempt) |
| Text truncation | GATED (half-spec ellipsis detector); full text lives in the confirm panel |
| Device parity | iPhone-13 emulation gates per screen; orientation flip gated |
| Touch targets | GATED on emulated cells (pointer:coarse block); desktop report-only |
| Contrast/alignment/dead bands | GATED since v2.19.18 |
| css_sweep tool | `tools/css_sweep.cjs` — read-only, manual; deletion rules in its header |

## OPEN QUESTIONS / SECOND OPINIONS WANTED

**Q1 — Purchase confirm on EVERY tap?** Every stocked card tap now opens the dialog
(before: instant buy). Power-users buying many potions may find it heavy. Options:
(a) keep as-is; (b) "Buy again" button INSIDE the panel for repeat buys; (c) a settings
toggle "quick-buy". Your call after playing.

**Q2 — Shop tab strip wrap vs scroll.** On 390px the 5 tabs now WRAP to a second row
(gate-proven). Alternative: horizontal scroll-snap row. Currently wrap won because it
keeps every tab visible; revisit if it feels cramped on real hardware.

**Q3 — Loadout chips are 44px tall now** (touch fix) — they were 40px. Visually slightly
chunkier on phones only. Fine? (Desktop unchanged.)

**Q4 — Toast timing.** Toast shows 3.5s then fades over 300ms. With fade-out restored,
does the timing feel right, or should quest-reward toasts persist longer?

**Q5 — Inventory tab tap does nothing visible** (just a console log + sound — pre-existing
pilot behavior). Should inventory items open a detail/use dialog like the shop confirm?
Candidate future backlog item.

**Q6 — Shop description ellipsis length.** Cards show name + one-line desc truncated.
Is the visible portion enough to choose items by name-recognition, or should cards drop
the desc line entirely (name-priority purity)? The confirm panel always has the full text.

## Incidents this session (for context, all resolved)

- **B14 over-deletion:** first cut script matched substrings + comment text → 12 live
  rules deleted → battery red in ONE run → recovered from widget_preview artifacts
  (they inline the stylesheet). Full lessons in §11 + tool header.
- **502 retries can double-append** (one WORKFLOW block duplicated, removed) — verify
  prior writes before re-running.
- Sandbox runner died mid-recovery once; re-attached on next message, no data loss.

## If you find a defect in manual testing

House rules apply: file it in WORKFLOW §10 (ID B17+ — B15 slot-picker and B16
golden-image-declined are taken) with "why/effort/priority". The slot-picker catch proves
the value: any dialog/screen not yet in the battery matrix is ungoverned — report it and
it gets fixed AND gated in the same unit. Real-device findings (font boosting quirks,
safe areas, viewport chrome) are the one class emulation can't fully cover.
