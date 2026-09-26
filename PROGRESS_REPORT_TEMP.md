# PROGRESS REPORT — TEMP (Claude handoff + manual-test session)

**Created:** September 26, 2026, immediately after v2.19.26 shipped green.
**Delete after the manual test** (or keep as session notes — owner's call).

---

## TL;DR state

- **Version:** v2.19.26 · `release:check` GREEN · battery **510 checks / 15 suites, strict green**
- **Backlog:** B1–B14 **all closed** — zero open items (§10 of WORKFLOW.md)
- **This session shipped:** v2.19.19 → v2.19.26 (responsive hardening → overflow/ellipsis detectors → device emulation gates → orientation gates → §12.1 spacing sweep → purchase-confirm dialog + qty stepper → touch targets → dead-CSS sweep)
- Battery growth this session: 458 → 510 checks (layout audit 22 → 66; step6 10 → 18)

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

House rules apply: file it in WORKFLOW §10 (ID B15+) with "why/effort/priority", don't
hot-fix mid-test; screenshot both desktop and phone if it's visual. Mobile findings are
especially valuable now — the emulated gates cover iPhone-13-class; real-device variance
(font boosting quirks, safe areas, viewport quirks) is the one thing the battery can't see.
