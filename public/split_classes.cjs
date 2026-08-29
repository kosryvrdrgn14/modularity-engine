// split_classes.cjs — Extracts all classes from game2.html into separate JS files
// and CSS into styles.css. Non-destructive: creates game_split_v2.html

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INPUT = 'game2.html';
const OUTPUT = 'game_split_v2.html';

if (!fs.existsSync(INPUT)) {
  console.error(`ERROR: "${INPUT}" not found`);
  process.exit(1);
}

const full = fs.readFileSync(INPUT, 'utf8');

// ── Step 1: Extract CSS ──
console.log('=== Step 1: Extract CSS ===');
const styleMatch = full.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) { console.error('No <style> block found'); process.exit(1); }
const cssContent = styleMatch[1].trim();
fs.writeFileSync('styles.css', cssContent);
console.log(`  Extracted ${cssContent.split('\n').length} lines to styles.css`);

// ── Step 2: Locate inline script ──
const scriptOpenMatch = /<script(?![^>]*\bsrc=)[^>]*>/i.exec(full);
const scriptContentStart = scriptOpenMatch.index + scriptOpenMatch[0].length;
const scriptCloseIdx = full.indexOf('</script>', scriptContentStart);
const before = full.slice(0, scriptOpenMatch.index);
const scriptBody = full.slice(scriptContentStart, scriptCloseIdx);
const after = full.slice(scriptCloseIdx);

// ── Step 3: Find all class boundaries ──
console.log('\n=== Step 3: Find class boundaries ===');
const classRegex = /\n(class\s+(\w+)\s*({|extends\s+\w+\s*{))/g;
const classes = [];
let match;
while ((match = classRegex.exec(scriptBody)) !== null) {
  classes.push({
    name: match[2],
    start: match.index + 1, // +1 for the leading \n
    decl: match[1],
  });
}

// Calculate end positions
for (let i = 0; i < classes.length; i++) {
  classes[i].end = i + 1 < classes.length ? classes[i + 1].start : scriptBody.length;
  classes[i].body = scriptBody.slice(classes[i].start, classes[i].end).trimEnd();
  classes[i].size = classes[i].body.split('\n').length;
}

console.log(`  Found ${classes.length} classes:`);
classes.forEach(c => console.log(`    ${c.name}: ${c.size} lines`));

// ── Step 4: Define file groups (load order matters) ──
console.log('\n=== Step 4: Define file groups ===');
const fileGroups = [
  { file: 'engine/eventBus.js', classes: ['EventBus'] },
  { file: 'engine/dataManager.js', classes: ['DataManager'] },
  { file: 'engine/gameState.js', classes: ['GameState'] },
  { file: 'engine/gameLoop.js', classes: ['GameLoop'] },
  { file: 'engine/camera.js', classes: ['Camera'] },
  { file: 'engine/inputManager.js', classes: ['InputManager'] },
  { file: 'engine/entityManager.js', classes: ['EntityManager'] },
  { file: 'engine/spawnSystem.js', classes: ['SpawnSystem'] },
  { file: 'engine/movementSystem.js', classes: ['MovementSystem'] },
  { file: 'engine/collisionSystem.js', classes: ['CollisionSystem'] },
  { file: 'engine/weaponSystem.js', classes: ['WeaponSystem'] },
  { file: 'engine/damageSystem.js', classes: ['DamageSystem'] },
  { file: 'engine/telegraphSystem.js', classes: ['TelegraphSystem'] },
  { file: 'engine/renderer.js', classes: ['Renderer'] },
  { file: 'engine/floatingTextSystem.js', classes: ['FloatingTextSystem'] },
  { file: 'engine/companionSystem.js', classes: ['CompanionSystem'] },
  { file: 'engine/levelingSystem.js', classes: ['LevelingSystem'] },
  { file: 'engine/pickupSystem.js', classes: ['PickupSystem'] },
  { file: 'engine/starSystem.js', classes: ['StarSystem'] },
  { file: 'engine/frenzySystem.js', classes: ['FrenzySystem'] },
  { file: 'engine/gachaProtection.js', classes: ['GachaProtection'] },
  { file: 'engine/storageBackend.js', classes: ['StorageBackend', 'LocalStorageBackend'] },
  { file: 'engine/gameManager.js', classes: ['GameManager'] },
  { file: 'engine/locationManager.js', classes: ['LocationManager'] },
  { file: 'engine/shopSystem.js', classes: ['ShopSystem'] },
  { file: 'engine/disasterSystem.js', classes: ['DisasterSystem'] },
  { file: 'engine/farmingSystem.js', classes: ['FarmingSystem'] },
  { file: 'engine/affectionSystem.js', classes: ['AffectionSystem'] },
  { file: 'engine/estateSystem.js', classes: ['EstateSystem'] },
  { file: 'engine/childrenSystem.js', classes: ['ChildrenSystem'] },
  { file: 'engine/sandboxSystem.js', classes: ['SandboxSystem'] },
  { file: 'engine/audioManager.js', classes: ['AudioManager'] },
  { file: 'engine/titleBGM.js', classes: ['TitleBGM'] },
  { file: 'engine/titleMenu.js', classes: ['TitleMenu'] },
  { file: 'engine/townScreen.js', classes: ['TownScreen'] },
  { file: 'engine/uiManager.js', classes: ['UIManager'] },
];

// Verify all classes are accounted for
const allClassNames = classes.map(c => c.name);
const groupedNames = fileGroups.flatMap(g => g.classes);
const missing = allClassNames.filter(n => !groupedNames.includes(n));
if (missing.length > 0) {
  console.error(`  WARNING: Unhandled classes: ${missing.join(', ')}`);
}
const extra = groupedNames.filter(n => !allClassNames.includes(n));
if (extra.length > 0) {
  console.error(`  WARNING: Non-existent classes: ${extra.join(', ')}`);
}

// ── Step 5: Write class files ──
console.log('\n=== Step 5: Write class files ===');
const classMap = {};
classes.forEach(c => { classMap[c.name] = c; });

for (const group of fileGroups) {
  const filePath = path.join('engine', group.file);
  const parts = group.classes.map(name => {
    const cls = classMap[name];
    if (!cls) return `// WARNING: class ${name} not found`;
    return cls.body;
  });
  const content = parts.join('\n\n');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content + '\n');
  console.log(`  ${filePath}: ${content.split('\n').length} lines`);
}

// ── Step 6: Extract non-class code (bootstrap, debug, etc.) ──
console.log('\n=== Step 6: Extract bootstrap code ===');
// Find code that's NOT a class definition
let bootstrapStart = 0;
const bootstrapParts = [];
const firstClassStart = classes.length > 0 ? classes[0].start : scriptBody.length;

// Everything before first class
const preamble = scriptBody.slice(0, firstClassStart).trim();
if (preamble) {
  bootstrapParts.push(preamble);
}

// Everything after last class (Game bootstrap, debug commands, etc.)
const lastClassEnd = classes.length > 0 ? classes[classes.length - 1].end : 0;
const postamble = scriptBody.slice(lastClassEnd).trim();
if (postamble) {
  bootstrapParts.push(postamble);
}

const bootstrap = bootstrapParts.join('\n\n');
fs.writeFileSync('engine/bootstrap.js', bootstrap + '\n');
console.log(`  engine/bootstrap.js: ${bootstrap.split('\n').length} lines`);

// ── Step 7: Generate script tags ──
console.log('\n=== Step 7: Generate script tags ===');

// First: existing data file tags
const existingDataTags = [];
const dataTagRegex = /<script src="data\/([^"]+)"><\/script>/g;
let dtMatch;
while ((dtMatch = dataTagRegex.exec(before + after)) !== null) {
  existingDataTags.push(`<script src="data/${dtMatch[1]}"></script>`);
}

// New class file tags
const classTags = fileGroups.map(g => `<script src="${g.file}"></script>`);

// Bootstrap tag (last, after all classes)
const bootstrapTag = `<script src="engine/bootstrap.js"></script>`;

const allScriptTags = [
  ...existingDataTags,
  ...classTags,
  bootstrapTag,
].join('\n');

// ── Step 8: Build new HTML ──
console.log('\n=== Step 8: Build game_split_v2.html ===');

// Remove <style> block from before, replace with <link>
const htmlWithoutStyle = before.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="styles.css">');

// Remove all class definitions and bootstrap from inline script
// Keep only the parts that reference globals (event handlers, etc.)
// Actually, we'll put the inline script tag back with minimal content
const inlineScript = `\n<script>\n${bootstrap}\n</script>`;

const newHtml = htmlWithoutStyle +
  '\n' + allScriptTags + '\n' +
  after.replace(/<script>[\s\S]*?<\/script>/, inlineScript);

fs.writeFileSync(OUTPUT, newHtml);
console.log(`  Wrote ${OUTPUT}: ${newHtml.split('\n').length} lines`);

// ── Step 9: Verify syntax ──
console.log('\n=== Step 9: Verify syntax ===');
let allOk = true;
const allFiles = fileGroups.map(g => path.join('engine', g.file)).concat(['engine/bootstrap.js', 'styles.css']);

for (const f of allFiles) {
  if (!f.endsWith('.css')) {
    try {
      execSync(`node --check "${f}"`, { stdio: 'pipe' });
      console.log(`  OK  ${f}`);
    } catch (e) {
      allOk = false;
      console.log(`  FAIL ${f}: ${e.stderr.toString().split('\n')[0]}`);
    }
  } else {
    console.log(`  OK  ${f} (CSS, skipped syntax check)`);
  }
}

// ── Step 10: Reassemble check ──
console.log('\n=== Step 10: Reassemble check ===');
let reassembled = '';
for (const f of fileGroups.map(g => path.join('engine', g.file))) {
  if (fs.existsSync(f)) reassembled += fs.readFileSync(f, 'utf8') + '\n';
}
// Add data files
const dataDir = 'data';
if (fs.existsSync(dataDir)) {
  for (const f of fs.readdirSync(dataDir).filter(x => x.endsWith('.js'))) {
    reassembled += fs.readFileSync(path.join(dataDir, f), 'utf8') + '\n';
  }
}
reassembled += bootstrap;

fs.writeFileSync('_reassembled_check.js', reassembled);
try {
  execSync('node --check _reassembled_check.js', { stdio: 'pipe' });
  console.log('  OK  Full reassembly passes');
} catch (e) {
  allOk = false;
  console.log(`  FAIL Reassembly: ${e.stderr.toString().split('\n')[0]}`);
}
fs.unlinkSync('_reassembled_check.js');

console.log('\n' + (allOk ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'));
