#!/usr/bin/env node
// POT-006 Option A: build-time generation of public/data/embeddedData.js
//
// public/data/embeddedData.js is the offline/file:// fallback mirror that
// DataManager.loadAll() (public/engine/core.js) uses when a content fetch
// fails. It used to be hand-maintained, which drifted 4 times (stale mirrors
// needed 3 manual syncs; quests.json was never mirrored at all; 3 loaded
// files had no fallback key).
//
// This generator makes that failure class structurally impossible:
//   - Every file in public/content/*.json MUST be registered below (orphan
//     files are a hard error) — new content can never silently lack a
//     fallback.
//   - Every registered file MUST exist on disk and pass shape validation.
//   - Output is byte-deterministic (no timestamps), so `--check` can gate
//     edits: `bun run content:check` fails if the mirror is out of sync.
//
// Usage:
//   node tools/generateEmbeddedData.mjs          # regenerate (content:sync)
//   node tools/generateEmbeddedData.mjs --check  # verify only (content:check)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'public', 'content');
const OUT_FILE = path.join(ROOT, 'public', 'data', 'embeddedData.js');

// The registry mirrors DataManager.loadAll()'s fetch list 1:1 (same keys,
// same order). required/minKeys/minLen validate the top-level shape so a
// truncated or mis-edited JSON file fails here, not silently in the game.
const REGISTRY = [
  { key: 'locations', file: 'locations.json', type: 'object', required: ['regions'] },
  { key: 'npcs', file: 'npcs.json', type: 'object', minKeys: 1 },
  { key: 'characters', file: 'characters.json', type: 'object', required: ['stats', 'startingWeapon'] },
  { key: 'weapons', file: 'weapons.json', type: 'array', minLen: 1 },
  { key: 'enemies', file: 'enemies.json', type: 'array', minLen: 1 },
  { key: 'stages', file: 'stages.json', type: 'array', minLen: 1 },
  { key: 'pickups', file: 'pickups.json', type: 'array', minLen: 1 },
  { key: 'leveling', file: 'leveling.json', type: 'object', required: ['xpCurve'] },
  { key: 'attackAreas', file: 'attackAreas.json', type: 'object', minKeys: 1 },
  { key: 'visuals', file: 'visuals.json', type: 'object', required: ['projectiles'] },
  { key: 'elements', file: 'elements.json', type: 'object', minKeys: 1 },
  { key: 'companions', file: 'companions.json', type: 'object', minKeys: 1 },
  { key: 'quests', file: 'quests.json', type: 'object', required: ['main_quests'] },
  { key: 'contentGates', file: 'content_gates.json', type: 'object' },
];

const errors = [];
const loaded = [];

for (const entry of REGISTRY) {
  const filePath = path.join(CONTENT_DIR, entry.file);
  if (!existsSync(filePath)) {
    errors.push(`MISSING: ${entry.file} is registered but does not exist in public/content/`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    errors.push(`INVALID JSON: ${entry.file} — ${e.message}`);
    continue;
  }
  const isObj = entry.type === 'object';
  if (isObj !== (typeof data === 'object' && data !== null && !Array.isArray(data))) {
    errors.push(`SHAPE: ${entry.file} must be a top-level ${entry.type}`);
    continue;
  }
  if (entry.type === 'array' && Array.isArray(data)) {
    if (data.length < (entry.minLen ?? 0)) {
      errors.push(`SHAPE: ${entry.file} must have at least ${entry.minLen} entries (got ${data.length})`);
      continue;
    }
  }
  if (isObj) {
    const keys = Object.keys(data);
    if (keys.length < (entry.minKeys ?? 0)) {
      errors.push(`SHAPE: ${entry.file} must have at least ${entry.minKeys} top-level keys (got ${keys.length})`);
      continue;
    }
    const missing = (entry.required ?? []).filter(k => !(k in data));
    if (missing.length) {
      errors.push(`SHAPE: ${entry.file} is missing required key(s): ${missing.join(', ')}`);
      continue;
    }
  }
  loaded.push({ ...entry, data });
}

// Orphan guard: every content file must be registered, so no future
// content/*.json can ship without a fallback mirror (the quests.json
// failure class). Files starting with '_' or '.md' are documentation.
const registeredFiles = new Set(REGISTRY.map(r => r.file));
const orphans = readdirSync(CONTENT_DIR).filter(
  f => f.endsWith('.json') && !f.startsWith('_') && !registeredFiles.has(f)
);
for (const orphan of orphans) {
  errors.push(
    `ORPHAN: content/${orphan} is not in the registry — DataManager.loadAll() would have ` +
    `no fallback for it. Add a { key, file, type, ... } entry to tools/generateEmbeddedData.mjs ` +
    `(and a matching fetch entry in public/engine/core.js).`
  );
}

if (errors.length) {
  console.error(`generateEmbeddedData: ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const header = `// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Generated by tools/generateEmbeddedData.mjs from public/content/*.json
// (POT-006 Option A). Output is deterministic; edits here WILL be lost.
//   Regenerate after any content edit:  bun run content:sync
//   Verify mirror is in sync (CI-safe): bun run content:check
// Registry guard: every public/content/*.json must be registered in the
// generator, so a content file without a fallback mirror cannot exist.
// This fallback exists so DataManager.loadAll() (public/engine/core.js)
// still boots under file:// or any fetch failure, with zero silent gaps.`;

const body = loaded
  .map(({ key, file, data }) => {
    const json = JSON.stringify(data, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : '  ' + line))
      .join('\n');
    return `  // ${key} — from content/${file}\n  ${key}: ${json},`;
  })
  .join('\n\n');

const output = `${header}\n\nconst EMBEDDED_DATA = {\n${body}\n};\n`;

if (process.argv.includes('--check')) {
  const existing = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : null;
  if (existing === output) {
    console.log(`content:check OK — embeddedData.js is in sync with ${loaded.length} content files.`);
    process.exit(0);
  }
  let detail = '';
  if (existing) {
    const oldKeys = new Set([...existing.matchAll(/^  ([A-Za-z_]+): /gm)].map(m => m[1]));
    const newKeys = new Set(loaded.map(l => l.key));
    const added = [...newKeys].filter(k => !oldKeys.has(k) || !existing.includes(`  ${k}: `));
    const removed = [...oldKeys].filter(k => !newKeys.has(k));
    if (added.length) detail += ` missing/unregenerated keys: ${added.join(', ')}`;
    if (removed.length) detail += `${detail ? ';' : ''} stale keys: ${removed.join(', ')}`;
  }
  console.error(
    `content:check FAILED — public/data/embeddedData.js is out of sync with public/content/.` +
    `${detail}\nRun: bun run content:sync`
  );
  process.exit(1);
}

writeFileSync(OUT_FILE, output);
console.log(
  `generateEmbeddedData: wrote ${path.relative(ROOT, OUT_FILE)} ` +
  `(${output.split('\n').length} lines, ${loaded.length} content files mirrored).`
);
