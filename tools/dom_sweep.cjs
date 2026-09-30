#!/usr/bin/env node
// dom_sweep.cjs — orphan/undetected-UI sweep for game2.html ids
// (2026-09-30; born from the WORKFLOW §10 B37 hand-audit)
//
// Direction the F2 gate does NOT cover: game2.html ids that no game code,
// content, stylesheet, or suite ever references. Classification per id:
//
//   ALIVE          literal id found in public/**/*.{js,json} or tests/**
//                  — a runtime CONSUMER. styles.css does NOT count as
//                  liveness: static markup is styled-and-rendered all over
//                  town (that is exactly the "undetected UI" shape). CSS
//                  mentions are shown as an annotation instead.
//   MANAGED        the id is never named by JS, but it sits INSIDE a
//                  subtree whose ANCESTOR id is a live consumer (e.g.
//                  #levelup-title inside #levelup-overlay, which the game
//                  shows/hides) — static text/styling hooks, alive by
//                  containment.
//   CONSTRUCTED    id is built at runtime from a config or template hole —
//                  e.g. dockMenu wipes #town-dock and rebuilds
//                  btn.id = 'dock-' + config.id, so the STATIC button copy is
//                  a fossil: harmless markup, never seen by a player.
//                  Evidence listed per id; review by hand.
//   KNOWN-DORMANT  managed ids that are ALSO in the B37 planned-content
//                  inventory (WORKFLOW §10) — individually never wired, so
//                  they are annotated "wire or delete" inside MANAGED.
//   NEW-ORPHAN     zero references, no construction, NOT in the allowlist —
//                  genuinely new dead markup since the last audit. Investigate
//                  before deleting; this sweep still deletes nothing.
//
// Read-only. Run: node tools/dom_sweep.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'public', 'game2.html');

// B37 inventory (2026-09-30 hand audit) — ids with no reference and no
// construction path, mapped to planned content. Remove an entry here only
// when the owner wires it up or the markup is deliberately deleted.
const KNOWN_DORMANT = new Set([
  'town-header',
  'town-location-icon',
  'town-wood',
  'town-stone',
  'panel-camp-upgrade-section',
  'panel-camp-upgrade',
  'panel-companion-status',
  'panel-events-section',
  'panel-events',
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const html = fs.readFileSync(HTML, 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);

// NOTE: game2.html (the target) is EXCLUDED from the reference corpus —
// otherwise every id matches its own markup and everything reads ALIVE.
// .html is dropped entirely: a second shell referencing an id is not a
// runtime consumer. styles.css is read separately for ANNOTATION only
// (see above — styling is not ownership).
const refFiles = walk(path.join(ROOT, 'public')).filter((f) => /\.(js|json)$/.test(f));
const testsDir = path.join(ROOT, 'tests');
const testFiles = fs.existsSync(testsDir) ? walk(testsDir).filter((f) => /\.(cjs|js)$/.test(f) && !f.includes('artifacts')) : [];
const refs = refFiles.concat(testFiles).map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));
const cssPath = path.join(ROOT, 'public', 'styles.css');
const cssText = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const cssStyled = (id) => cssText.includes(id);

const alive = [], managed = [], constructed = [], dormant = [], orphans = [];
const KNOWN_DORMANT_LABEL = 'B37: planned content — wire or delete (owner call)';

// Ancestor map: crude tag-stack parse of game2.html (well-formed shell).
// For every id-bearing element, record the ids of its ancestor elements.
const ancestorsOf = new Map();
{
  const stack = [];
  const tagRe = /<\/?([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source']);
  let tm;
  while ((tm = tagRe.exec(html)) !== null) {
    const [full, tag, selfClose] = tm;
    if (full.startsWith('</')) { for (let s = stack.length - 1; s >= 0; s--) if (stack[s].tag === tag) { stack.splice(s, 1); break; } continue; }
    const idm = full.match(/id="([^"]+)"/);
    if (idm) ancestorsOf.set(idm[1], stack.map((s) => s.id).filter(Boolean));
    if (!selfClose && !VOID.has(tag)) stack.push({ tag, id: idm ? idm[1] : null });
  }
}
const refIds = new Set();
for (const { t } of refs) for (const id of ids) if (!refIds.has(id) && t.includes(id)) refIds.add(id);

for (const id of ids) {
  if (refIds.has(id)) { alive.push(id); continue; }

  // Construction check, two shapes:
  //   prefix-concat   'dock-' + config.id        → find "<prefix>' +"
  //   template hole   `dock-${config.id}`        → find "<prefix>${"
  let hit = null;
  for (let k = id.length - 1; k >= 3 && !hit; k--) {
    const prefix = id.slice(0, k);
    for (const { f, t } of refs.filter((r) => /\.js$/.test(r.f))) {
      const i = t.indexOf("'" + prefix + "'");
      if (i !== -1 && /^\s*\+\s*[\w$]/.test(t.slice(i + prefix.length + 2))) {
        hit = `${path.relative(ROOT, f)}: '${prefix}' + …`; break;
      }
      const j = t.indexOf('`' + prefix + '${');
      if (j !== -1) { hit = `${path.relative(ROOT, f)}: \`${prefix}\${…}`; break; }
    }
  }
  if (hit) { constructed.push({ id, hit }); continue; }

  // MANAGED-by-ancestor: an ancestor id is a live consumer.
  const anc = ancestorsOf.get(id) || [];
  const manager = anc.find((a) => refIds.has(a));
  if (manager) {
    const isPlanned = KNOWN_DORMANT.has(id);
    managed.push({ id, manager, planned: isPlanned });
    if (isPlanned) dormant.push(id);
    continue;
  }

  orphans.push(id);
}

console.log(`game2.html ids: ${ids.length}`);
console.log(`ALIVE (referenced by code/content/tests): ${alive.length}`);
console.log(`\n=== MANAGED by an alive ancestor container (static text/styling hooks) — ${managed.length} ===`);
for (const { id, manager, planned } of managed) {
  console.log(`  #${id}   inside #${manager}${planned ? `   [${KNOWN_DORMANT_LABEL}]` : ''}`);
}
console.log(`\n=== CONSTRUCTED at runtime (static markup is a fossil; ids recreated live) — ${constructed.length} ===`);
for (const { id, hit } of constructed) console.log(`  #${id}   via ${hit}`);
console.log(`\n=== of those, B37 planned-content (individually unwired; owner decides) — ${dormant.length} ===`);
console.log(`\n=== NEW-ORPHAN (unreferenced, unconstructed, NOT in the B37 allowlist — investigate) — ${orphans.length} ===`);
for (const id of orphans) console.log(`  #${id}${cssStyled(id) ? '   (styled in styles.css — renders, no JS owner)' : ''}`);
if (orphans.length > 0) process.exitCode = 1;
