// ============================================================
// _negctl_f5_f2.cjs — ONE-SHOT negative control for the F5 (no-undef)
// and F2 (DOM ids) gates (KNOWLEDGE §15 scripted pattern; TEMP — deletes
// nothing permanent: reverts loot.js byte-identically, then self-deletes
// by convention).
//
// Proves: an undefined global reference AND an unknown getElementById id
// in a game file each turn verify RED. Exits non-zero if either control
// fails to fire or the revert is not byte-identical.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FILE = path.join(__dirname, '..', 'public', 'systems', 'loot.js');
const before = fs.readFileSync(FILE, 'utf8');
// Markers must be LIVE code, and the no-undef one must be a BARE
// identifier (no-undef fires on bare names only — `window.foo` is a
// property access and correctly produces no violation; partyBtn was bare).
const MARK = '\n__negCtlUndef.bar; document.getElementById("__neg_ctl_id__");\n';

try {
  fs.writeFileSync(FILE, before + MARK, 'utf8');

  let verifyOut = '';
  let verifyExit = 0;
  try {
    execFileSync('npm', ['run', 'verify', '--silent'], {
      cwd: path.join(__dirname, '..'), stdio: 'pipe', timeout: 120000,
    });
  } catch (e) {
    // fail() lines go to STDERR (console.error) — capture both streams.
    verifyOut = ((e.stdout || '') + '\n' + (e.stderr || '')).toString();
    verifyExit = e.status == null ? 1 : e.status;
  }

  // F5 proof via a direct stderr-capturing node invocation (npm stream
  // piping swallowed stderr in this script's context — same gate, same
  // config, just a capture path that works headless).
  let f5Fired = false;
  try {
    execFileSync('node', [path.join(__dirname, 'verify.cjs')], {
      cwd: path.join(__dirname, '..'), stdio: 'pipe', timeout: 120000,
    });
  } catch (e) {
    f5Fired = /no-undef: .*__negCtlUndef is not defined/.test((e.stderr || '').toString());
  }
  const f2Fired = /DOM id not found[^\n]*__neg_ctl_id__/.test(verifyOut);
  const verifyRed = verifyExit !== 0 || /VERIFY RED/.test(verifyOut);

  console.log(`  ${f5Fired ? '✓' : '✗'} F5 control fired (no-undef caught __negCtlUndef)`);
  console.log(`  ${f2Fired ? '✓' : '✗'} F2 control fired (DOM gate caught __neg_ctl_id__)`);
  console.log(`  ${verifyRed ? '✓' : '✗'} verify went RED overall (exit=${verifyExit})`);

  process.exitCode = f5Fired && f2Fired && verifyRed ? 0 : 1;
} finally {
  fs.writeFileSync(FILE, before, 'utf8'); // byte-identical revert, always
  const after = fs.readFileSync(FILE, 'utf8');
  console.log(`  ${after === before ? '✓' : '✗'} loot.js reverted byte-identically`);
  if (after !== before) process.exitCode = 1;
}
