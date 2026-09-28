const fs = require('fs');
let failures = 0;
function edit(file, anchor, replacement, label) {
  let s = fs.readFileSync(file, 'utf8');
  const count = s.split(anchor).length - 1;
  if (count !== 1) { console.error(`FAIL ${label}: anchor count ${count} in ${file}`); failures++; return; }
  s = s.replace(anchor, replacement);
  fs.writeFileSync(file, s, 'utf8');
  if (!fs.readFileSync(file, 'utf8').includes(replacement.slice(0, Math.min(80, replacement.length)))) {
    console.error(`FAIL ${label}: §20 post-write check`); failures++; return;
  }
  console.log(`OK ${label}`);
}

// ── 1. CHANGELOG: new top header v2.19.38 ──
edit('CHANGELOG.md',
  '## v2.19.37 — B31: pickup lifecycle + suspended-audio guard (mobile lag 2:40+)',
  `## v2.19.38 — B32: screen_wipe drop actually screen-wipes
**Date:** September 28, 2026
**Status:** ✅ Complete (B32 wipe probe 9/9; B31 probe 9/9; battery 578 strict green)

### The bug
The screen_wipe power-up drop (skeletons/casters/brutes, 2% + gacha ramp) was purely
cosmetic: collecting it showed "SCREEN WIPE!" and killed nothing. No consumer of the
pickup id existed anywhere — pickups.json fully specified the behavior that was never
wired (killsAllEnemies: true; bosses take bossDamage 200 modulated by bossResistance
0.8).

### B32 fix (routed through the real kill flow, data-driven)
- PickupSystem listens on 'pickup' → _executeScreenWipe() (pickup.js): every active
  non-boss enemy dies DIRECTLY (no armor/iFrames lottery — a wipe means wipe) but via
  the REAL 'death' event, so kill counters, quest objectives, drops, and audio all
  fire exactly as a normal kill. Bosses are NOT cheesed: they take
  round(bossDamage × (1 − bossResistance)) = 40 — enough to finish a nearly-dead
  boss, never to skip the fight; a killing blow routes through the canonical
  death + bossDeath flow (victory + B28 trophy all intact).
- Renderer feedback (rendering.js + game.js listener): two expanding screen-space
  rings from the player (converted CSS px → world at draw time; camera stores
  top-left world coords), a world-space dissolving dot per culled enemy (color from
  the enemy visual, capped at 80), and one counted announcement
  "SCREEN WIPE! ×N" — the old uncounted FloatingText push is retired so collection
  never renders two overlapping texts. startGame() clears the transient arrays so
  Buy Again never carries stale effects into the next fight.

### Gates
- tests/probe_lag.cjs --wipe (9 checks): real CollisionSystem collection wipes all
  non-boss enemies; kill counter +N via the real death event; rings/dots armed;
  single counted announcement; boss takes 40 and a killing blow reaches
  endResult 'victory'; bossTrophyDropped fires on the wipe path; startGame clears
  the feedback arrays. B31 mode re-run green after the edits (one flaked run of the
  natural-hygiene check during battery contention; clean on rerun).

---

## v2.19.37 — B31: pickup lifecycle + suspended-audio guard (mobile lag 2:40+)`,
  'CHANGELOG');

// ── 2. WORKFLOW §10: B32 row before B31 row ──
edit('WORKFLOW.md',
  '| B31 | ~~Mobile lag at 2:40–2:60',
  '| B32 | ~~screen_wipe drop does not actually wipe~~ **DONE v2.19.38** (user report during the B31 session — collection showed \"SCREEN WIPE!\" and killed nothing; no consumer of the id existed anywhere, pickups.json had fully specified the behavior that was never wired; fix routes collection through PickupSystem._executeScreenWipe — non-boss enemies die directly via the REAL death event so counters/quests/drops/audio fire as normal kills, bosses take round(bossDamage × (1 − bossResistance)) = 40 with a killing blow flowing through canonical death + bossDeath (victory + B28 trophy intact); renderer feedback = two expanding screen-space rings from the player + one world-space dissolving dot per culled enemy + a counted \"SCREEN WIPE! ×N\" announcement, the uncounted FloatingText push retired so collection never renders two texts; startGame clears the transient arrays so Buy Again never carries stale effects) | the same cosmetic-only class as the weapon-level-up pickup (WEAPON UP! with no code — still open, needs a design decision on which weapon upgrades); data-driven from pickups.json — no new constants | S | tests/probe_lag.cjs --wipe (9 checks) |\n| B31 | ~~Mobile lag at 2:40–2:60',
  'WORKFLOW §10 row');

// ── 3. WORKFLOW §11: v2.19.38 block ──
edit('WORKFLOW.md',
  '### v2.19.37 (Sept 28, 2026) — B31: pickup lifecycle + suspended-audio guard',
  `### v2.19.38 (Sept 28, 2026) — B32: screen_wipe actually wipes
\`\`\`
- User: "fix the screen wipe drop so it actually screen wipes :))" — the power-up was
  pure theater: a float text and zero code. pickups.json had specified the whole
  contract (killsAllEnemies, bossDamage 200, bossResistance 0.8) that nobody wired.
- Design choice worth remembering: the wipe kills DIRECTLY (no armor/iFrames — the
  pickup says wipe) but every kill still rides the real 'death' event, so the whole
  downstream ecosystem (kill counters, quest kill_count objectives, death drops,
  audio, B28 trophy) behaves exactly as if the player had swung at each enemy. Boss
  damage stays resistanced (40, not 200) so the drop can finish a fight but never
  skip one — the anti-cheese line is in the data, not a magic number.
- Renderer: rings are SCREEN-space CSS px at capture time, converted to world coords
  at draw time (camera.x/y are top-left world; screen×DPR + camera = world in backing
  units — verified against Camera.apply before writing). Dots are world-space and
  capped (80) — a 120-enemy wipe must not mint an unbounded effect array right after
  B31 taught us to cap things.
- The counted announcement ("SCREEN WIPE! ×N") required retiring the old uncounted
  push in FloatingTextSystem._onPickup — two overlapping texts on every collection
  would have been the next user report.
- Probe lesson (twice in one probe): assert the CONTRACT, not a private detail. W2
  first asserted state === 'gameOver' and failed because the canonical path had
  already advanced gameOver → endScreen (endResult is the durable signal). W4 first
  asserted a _exitRunToTown clear that required a paused state the probe never had —
  the real stale-effect risk is the restart funnel (startGame), so that is where the
  clear lives and where the gate points.
\`\`\`
### v2.19.37 (Sept 28, 2026) — B31: pickup lifecycle + suspended-audio guard`,
  'WORKFLOW §11 block');

// ── 4. TESTING_PLAN: probe row note ──
edit('TESTING_PLAN.md',
  'Promoting into run_all as a suite (count bump) is a noted follow-up.',
  'Promoting into run_all as a suite (count bump) is a noted follow-up. v2.19.38 B32: --wipe mode (9 checks) gates the screen_wipe contract — real-path collection wipes non-boss enemies via the real death event, bosses take resistanced damage with canonical victory on a killing blow, B28 trophy intact, counted announcement, restart clears the feedback arrays.',
  'TESTING_PLAN perf row');

// ── 5. PROJECT_MAP: pickup.js emits + note ──
edit('PROJECT_MAP.md',
  '- Emits: `pickup`, `levelUp`, `damage`, `bossTrophyDropped` (B28 v2.19.35 — fires at boss-death drop time, tagged with the boss id; the marker pickup itself is inert and rides the normal collection path)',
  '- Emits: `pickup`, `levelUp`, `damage`, `bossTrophyDropped` (B28 v2.19.35 — fires at boss-death drop time, tagged with the boss id; the marker pickup itself is inert and rides the normal collection path), `screenWipe` (B32 v2.19.38 — `{x, y, killed, bossDamage, positions}` at collection; positions carries up to 80 world coords + enemy colors for the renderer cleanup dots)',
  'PROJECT_MAP pickup emits');

edit('PROJECT_MAP.md',
  '- Note (B31 v2.19.37): `_sweepExpired()` — non-trophy pickups expire at 45s (last-10s blink via iFrames) and actives cap at 500 oldest-first; `boss_trophy` is exempt from both (B28 marker). Sweeps run on a 1s accumulator inside update().',
  '- Note (B31 v2.19.37): `_sweepExpired()` — non-trophy pickups expire at 45s (last-10s blink via iFrames) and actives cap at 500 oldest-first; `boss_trophy` is exempt from both (B28 marker). Sweeps run on a 1s accumulator inside update().\n- Note (B32 v2.19.38): `_executeScreenWipe()` — screen_wipe collection kills all active non-boss enemies DIRECTLY but via the real death event (counters/quests/drops/audio unchanged); bosses take `bossDamage × (1 − bossResistance)` from pickups.json (40 effective) with killing blows flowing through canonical death + bossDeath. `boss_trophy` never wiped (it is not an enemy).',
  'PROJECT_MAP pickup note');

// ── 6. PROJECT_MAP: renderer defines/handles ──
edit('PROJECT_MAP.md',
  '- Note (B31 v2.19.37): suspended-context guard',
  '- Note (B32 v2.19.38): wipe feedback — `addWipeEffect(x, y, killed)` (two screen-space rings, CSS px → world at draw time) + `addCleanupEffect(x, y, color)` (world-space dissolving dot, capped 80); arrays cleared by startGame(). Consumes the `screenWipe` payload via the game.js listener.\n- Note (B31 v2.19.37): suspended-context guard',
  'PROJECT_MAP audio note');

// ── 7. PROGRESS_REPORT: addendum ──
edit('PROGRESS_REPORT_TEMP.md',
  '## ADDENDUM (v2.19.37 — the "lag 2:40+, worse post-boss" report → B31)',
  `## ADDENDUM (v2.19.38 — "fix the screen wipe drop so it actually screen wipes")

You were right — it was pure theater: a "SCREEN WIPE!" float text with zero code
behind it. pickups.json had specified the whole behavior (kills all enemies; bosses
take 200 damage resisted at 0.8) that was never wired. Now it does what the name
says: every normal enemy on the field dies through the REAL kill flow (counters,
quests, drops, audio all fire exactly like a normal kill), the boss takes a resisted
40 — enough to finish a nearly-dead boss, never to skip the fight — and you get two
expanding green rings, a dissolving marker per culled enemy, and "SCREEN WIPE! ×N".
Same-session flag: the "WEAPON UP!" pickup has the identical cosmetic-only bug and
needs a design decision (which weapon upgrades?) before I wire it. Gates:
node tests/probe_lag.cjs --wipe (9/9) + full battery green.

---

## ADDENDUM (v2.19.37 — the "lag 2:40+, worse post-boss" report → B31)`,
  'PROGRESS_REPORT');

if (failures) { console.error(`\n${failures} doc edit(s) FAILED`); process.exit(1); }
console.log('\nALL DOC EDITS LANDED');
