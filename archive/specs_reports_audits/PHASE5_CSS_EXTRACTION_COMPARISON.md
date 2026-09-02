# Phase 5: CSS Extraction — Visual Comparison Guide

**Date:** August 31, 2026
**Status:** CSS extracted to `public/styles.css`

---

## What Changed

### Before (Inline CSS)
```html
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  /* ... 1,232 lines of CSS ... */
</style>
```

### After (External CSS)
```html
<link rel="stylesheet" href="styles.css">
```

---

## File Statistics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| game2.html lines | 2,502 | 1,269 | -1,233 lines |
| CSS location | Inline `<style>` | External `styles.css` | Moved |
| CSS lines | 1,232 | 1,232 | Same |
| Selectors | 1,013 | 1,013 | Same |
| Keyframe animations | 2 | 2 | Same |

---

## Screenshots to Compare

Please verify the following screens in the preview:

### 1. Title Screen
- [ ] Title text ("MODULARITY ENGINE") is visible
- [ ] Menu items are styled correctly
- [ ] Background gradient is correct
- [ ] Info bar at bottom is visible

### 2. Loading Screen
- [ ] Loading bar is visible
- [ ] Progress text is styled

### 3. Stage Select
- [ ] Stage cards are styled
- [ ] Tier buttons have correct colors
- [ ] Weapon selector works

### 4. Gameplay
- [ ] HUD elements are positioned correctly
- [ ] Level-up overlay appears centered
- [ ] Upgrade cards are styled
- [ ] Enemy health bars visible

### 5. Town Screen
- [ ] Location cards are styled
- [ ] NPC dialogue overlay works
- [ ] Shop overlay styled correctly
- [ ] Bottom dock tabs styled

### 6. Settings Screen
- [ ] Slider controls work
- [ ] Save/Load buttons styled

---

## CSS Selectors Verified

### Critical Selectors (must work)
- `#game-canvas` — Full screen canvas
- `#loading-screen` — Loading overlay
- `#start-overlay` — Click-to-start
- `#title-screen` — Title menu
- `#levelup-overlay` — Level-up cards
- `.levelup-card` — Upgrade cards
- `#town-screen` — Town hub
- `#shop-overlay` — Shop menu

### Animation Keyframes
- `@keyframes pulse` — Loading bar animation
- `@keyframes fadeIn` — Overlay transitions

---

## Potential Issues to Watch For

1. **Path issues** — `href="styles.css"` must be relative to `game2.html`
2. **Load order** — CSS must load before JS runs
3. **Specificity** — No CSS should be overridden by inline styles

---

## Verification Steps

1. Open preview in Freebuff
2. Navigate through each screen listed above
3. Check console for 404 errors on `styles.css`
4. Verify no visual regressions

---

*Comparison guide created by Buffy — August 31, 2026*
