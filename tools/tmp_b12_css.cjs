#!/usr/bin/env node
// ONE-OFF (delete after run): insert B12 confirm-panel CSS before the
// §10 screen-6 shop section in styles.css (str_replace flaky on this file).
const fs = require('fs');
const file = 'public/styles.css';
let s = fs.readFileSync(file, 'utf8');

// locate the screen-6 header line robustly (regex, not byte-exact)
const re = /^[ \t]*\/\* ─+ §10 screen-6 .*$/m;
const m = s.match(re);
if (!m || m.index === undefined) { console.error('ANCHOR FAIL: screen-6 header not found'); process.exit(1); }
if ((s.match(/shop-purchase-confirm/g) || []).length > 0) { console.error('ALREADY INSERTED'); process.exit(1); }

const css = `/* ── B12 (v2.19.24): purchase confirmation panel ──
   Full-description reveal surface + qty stepper clamped [1, affordable].
   §12 tokens; stepper/Buy/Cancel ≥44px (§11 coarse-pointer from birth).
   The confirm panel — not the card — is the full-text surface (§12.8). */
#shop-purchase-confirm {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10;
}
.spc-card {
  background: var(--surface-panel, #111122);
  border: 1px solid rgba(255, 215, 0, 0.25);
  border-radius: 12px;
  padding: var(--space-5, 20px);
  width: min(360px, calc(100% - 32px));
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.spc-close {
  position: absolute;
  top: 8px; right: 8px;
  width: 44px; height: 44px; /* §11 touch target */
  background: none;
  border: none;
  color: var(--text-tertiary, #7d7d87);
  font-size: 18px;
  cursor: pointer;
}
.spc-close:hover { color: #FFD700; }
.spc-icon { font-size: 40px; line-height: 1; }
.spc-name { color: #FFD700; font-size: 17px; font-weight: 700; margin-top: var(--space-2, 8px); }
/* FULL text by design — this panel is the reveal surface (§12.8 disposition). */
.spc-desc { color: var(--text-secondary, #8a8a94); font-size: 13px; line-height: 1.5; margin-top: var(--space-2, 8px); }
.spc-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4, 16px);
  margin-top: var(--space-4, 16px);
}
.spc-qty-btn {
  width: 44px; height: 44px; /* §11 coarse-pointer minimum */
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: #ddd;
  font-size: 20px;
  cursor: pointer;
}
.spc-qty-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
.spc-qty-btn:disabled { opacity: 0.35; cursor: default; }
.spc-qty { color: #ddd; font-size: 18px; font-weight: 700; min-width: 32px; text-align: center; }
.spc-total { color: #FFD700; font-size: 15px; font-weight: 600; text-align: center; margin-top: var(--space-3, 12px); }
.spc-unit { color: var(--text-tertiary, #7d7d87); font-size: 12px; font-weight: 400; }
.spc-actions { display: flex; gap: var(--space-3, 12px); margin-top: var(--space-4, 16px); }
.spc-cancel,
.spc-buy {
  flex: 1;
  min-height: 44px; /* §11 */
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.spc-cancel { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.25); color: #ddd; }
.spc-cancel:hover { background: rgba(255, 255, 255, 0.15); }
.spc-buy { background: rgba(76, 175, 80, 0.25); border: 1px solid #4CAF50; color: #7bd47f; }
.spc-buy:hover:not(:disabled) { background: rgba(76, 175, 80, 0.4); }
.spc-buy:disabled { opacity: 0.35; cursor: default; }
/* B12: grid cards go name-priority — single-line description with the FULL
   ellipsis spec (§12.8). Wrapping report line goes 2 → 0. */
#shop-items .widget-card .slot-secondaryText {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

s = s.slice(0, m.index) + css + s.slice(m.index);
fs.writeFileSync(file, s);
const v = fs.readFileSync(file, 'utf8');
console.log('inserted:', v.includes('#shop-purchase-confirm') && v.includes('.spc-buy') ? 'OK' : 'VERIFY FAIL');
