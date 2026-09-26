#!/usr/bin/env node
// ONE-OFF (delete after run): restore the 4 live rules wrongly deleted by the
// B14 cut script (substring bug). One verbatim (.loadout-slots), three
// reconstructed minimal flex hosts (documented; geometry gates will verify).
const fs = require('fs');
const file = 'public/styles.css';
let s = fs.readFileSync(file, 'utf8');

if (/loadout-slots\s*\{/.test(s)) { console.error('loadout-slots already present?'); process.exit(1); }

const RESTORE = `
    /* B14 restore (v2.19.26): the cut script's substring bug deleted this LIVE
       host rule alongside the retired .loadout-slot family. Body verbatim
       (incl. the v2.19.19 flex-wrap fix). */
    .loadout-slots {
      display: flex;
      flex-wrap: wrap; /* v2.19.19: chips wrap instead of ever pinning the row wide */
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }
    /* B14 restore (v2.19.26): RECONSTRUCTED minimal flex hosts — the original
       bodies were lost to the same cut bug (never re-read post-v2.19.23).
       Evidence: the v2.19.23 spacing sweep proves #dialogue-choices carried
       margin-top (now var(--space-4)); neither host had off-scale spacing.
       Consumer rules survived (chips/cards carry their own padding). */
    #shop-tabs {
      display: flex;
      gap: var(--space-2);
      padding: 0 var(--space-4);
    }
    #dialogue-choices {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-4);
    }
    #dog-dialogue .dog-choices {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
`;

// insert after the .town-toast.leaving block (stable, just renamed)
const anchor = s.match(/\.town-toast\.leaving\s*\{[^}]*\}/);
if (!anchor) { console.error('anchor (toast.leaving) not found'); process.exit(1); }
s = s.slice(0, anchor.index + anchor[0].length) + '\n' + RESTORE + s.slice(anchor.index + anchor[0].length);
fs.writeFileSync(file, s);

// verify
const v = fs.readFileSync(file, 'utf8');
const checks = [
  [/loadout-slots\s*\{[\s\S]*?flex-wrap: wrap/, '.loadout-slots verbatim'],
  [/#shop-tabs\s*\{/, '#shop-tabs'],
  [/#dialogue-choices\s*\{/, '#dialogue-choices'],
  [/dog-choices\s*\{/, '.dog-choices'],
  [/\.town-toast\.leaving\s*\{/, 'toast rename intact'],
  [/#loadout-overlay #loadout-slots \.widget-card\s*\{/, 'loadout widget-card theme'],
  [/#shop-tabs \.widget-card\s*\{/, 'shop tab card theme'],
];
let ok = true;
for (const [re, label] of checks) {
  const pass = re.test(v);
  console.log((pass ? 'OK    ' : 'MISS  ') + label);
  ok = ok && pass;
}
process.exit(ok ? 0 : 1);
