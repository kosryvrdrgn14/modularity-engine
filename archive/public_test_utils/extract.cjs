// extract.js — pulls the 13 known pure-data blocks out of the single-file game
// into their own files, and writes a new split game_split.html that loads them
// via plain <script> tags. Non-destructive: does not touch the original file.
//
// Usage:  node extract.js [inputFile] [outputFile]
// Defaults: inputFile = 'game2.html', outputFile = 'game_split.html'

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputFile = process.argv[2] || 'game2.html';
const outputFile = process.argv[3] || 'game_split.html';

const names = [
  "EMBEDDED_DATA", "NPC_DATA", "LOCATION_TREE", "COMPANION_DATA", "SHOP_DATA",
  "ASSET_MAP", "FARMING_CONFIG", "SVG_PORTRAITS", "SANDBOX_DEFAULTS",
  "DISASTER_EVENTS", "AFFECTION_TIERS", "ESTATE_TIERS", "CHILD_GROWTH_STAGES",
];

const fileNames = {
  EMBEDDED_DATA: 'embeddedData.js', NPC_DATA: 'npcData.js', LOCATION_TREE: 'locationTree.js',
  COMPANION_DATA: 'companionData.js', SHOP_DATA: 'shopData.js', ASSET_MAP: 'assetMap.js',
  FARMING_CONFIG: 'farmingConfig.js', SVG_PORTRAITS: 'svgPortraits.js',
  SANDBOX_DEFAULTS: 'sandboxDefaults.js', DISASTER_EVENTS: 'disasterEvents.js',
  AFFECTION_TIERS: 'affectionTiers.js', ESTATE_TIERS: 'estateTiers.js',
  CHILD_GROWTH_STAGES: 'childGrowthStages.js',
};

if (!fs.existsSync(inputFile)) {
  console.error(`ERROR: "${inputFile}" not found in current directory. Pass the correct filename as the first argument.`);
  process.exit(1);
}

const full = fs.readFileSync(inputFile, 'utf8');

// Locate the single inline <script> block (no src attribute)
const scriptOpenMatch = /<script(?![^>]*\bsrc=)[^>]*>/i.exec(full);
if (!scriptOpenMatch) {
  console.error('ERROR: could not find an inline <script> tag (without a src attribute) in the file.');
  process.exit(1);
}
const scriptContentStart = scriptOpenMatch.index + scriptOpenMatch[0].length;
const scriptCloseIdx = full.indexOf('</script>', scriptContentStart);
if (scriptCloseIdx === -1) {
  console.error('ERROR: found <script> but no matching </script>.');
  process.exit(1);
}

const before = full.slice(0, scriptOpenMatch.index);
const scriptBody = full.slice(scriptContentStart, scriptCloseIdx);
const after = full.slice(scriptCloseIdx); // includes </script> onward

function findBlock(name, text) {
  const re = new RegExp('\\n(const\\s+' + name + '\\s*=\\s*)');
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + 1;
  const eqIdx = text.indexOf('=', start);
  let j = eqIdx + 1;
  while (/[ \t\r\n]/.test(text[j])) j++;
  const openCh = text[j];
  if (openCh !== '{' && openCh !== '[') return null; // not an object/array literal, skip
  const closeCh = openCh === '{' ? '}' : ']';
  let depth = 0, k = j, inStr = false, strCh = '';
  while (k < text.length) {
    const c = text[k];
    if (inStr) {
      if (c === '\\') { k += 2; continue; }
      if (c === strCh) inStr = false;
    } else {
      if (c === "'" || c === '"' || c === '`') { inStr = true; strCh = c; }
      else if (c === openCh) depth++;
      else if (c === closeCh) { depth--; if (depth === 0) { k++; break; } }
    }
    k++;
  }
  let end = k;
  if (text[end] === ';') end++;
  return { start, end, text: text.slice(start, end) };
}

fs.mkdirSync('data', { recursive: true });

let patchedScript = scriptBody;
const blocks = [];
for (const name of names) {
  const b = findBlock(name, patchedScript);
  if (!b) { console.log(`  SKIP (not found): ${name}`); continue; }
  blocks.push({ name, ...b });
}
blocks.sort((a, b) => b.start - a.start); // splice from the end backward so offsets stay valid

for (const b of blocks) {
  const fname = fileNames[b.name];
  const header = `// Extracted from ${inputFile} — pure data, no logic.\n\n`;
  fs.writeFileSync(path.join('data', fname), header + b.text.trimEnd() + '\n');
  patchedScript = patchedScript.slice(0, b.start)
    + `// ${b.name} moved to data/${fname} (loaded via <script> tag before this one)\n`
    + patchedScript.slice(b.end);
  console.log(`  extracted: ${b.name} -> data/${fname} (${b.text.length} chars)`);
}

const scriptTags = blocks
  .slice().reverse()
  .map(b => `<script src="data/${fileNames[b.name]}"></script>`)
  .join('\n');

const newFull = before + scriptTags + '\n' + scriptOpenMatch[0] + patchedScript + after;
fs.writeFileSync(outputFile, newFull);

console.log(`\nWrote ${outputFile} and ${blocks.length} files under data/`);
console.log(`Original script section: ${scriptBody.length} chars -> patched: ${patchedScript.length} chars (${(100*(scriptBody.length-patchedScript.length)/scriptBody.length).toFixed(1)}% smaller)`);

// --- Verification: node --check every output file ---
console.log('\nVerifying...');
let allOk = true;
for (const b of blocks) {
  const f = path.join('data', fileNames[b.name]);
  try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); console.log(`  OK  ${f}`); }
  catch (e) { allOk = false; console.log(`  FAIL ${f}\n${e.stderr}`); }
}
// Reassemble data files + patched script and check as one unit
const reassembled = blocks.slice().reverse().map(b => fs.readFileSync(path.join('data', fileNames[b.name]), 'utf8')).join('\n') + patchedScript;
fs.writeFileSync('_reassembled_check.js', reassembled);
try { execSync('node --check _reassembled_check.js', { stdio: 'pipe' }); console.log('  OK  full reassembly (data + patched script together)'); }
catch (e) { allOk = false; console.log(`  FAIL full reassembly\n${e.stderr}`); }
fs.unlinkSync('_reassembled_check.js');

console.log(allOk ? '\nAll checks passed.' : '\nSOME CHECKS FAILED — review before using the split output.');
